'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={river:require('../fixtures/authoring/household-refuge-river.json'),hill:require('../fixtures/authoring/household-refuge-hill.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/travel.js','data/starts.js','js/story_household_refuge.js',
  'js/story_household_party.js','js/household_party_travel.js','js/household_party_camp.js','js/story_local_threat.js','js/story_household.js',
  'js/story_household_observer.js','js/story_expedition_participation.js','js/stories.js','js/home_authority.js','js/treasury.js',
  'js/institutions.js','js/model.js','js/travel.js','js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js',
  'js/settlement.js','js/lordships.js','js/governments.js','js/rebellions.js','js/authority.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

async function start(page,info,label,input) {
  await openGame(page,info);
  await page.evaluate(function() { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(input ? {name:'refuge.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))} :
    path.resolve(__dirname,'../fixtures/authoring/household-refuge-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function() { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmark(page,info,label==='river'?'inventory_estuary':'shelter_hill_estuary',
    label==='river'?'inventory_estuary_household':'shelter_hill_estuary_household');
  await page.evaluate(function(label) {
    window.refugeLabel=label;
    window.refugeAt=function(turn) { const s=FB.state;s.date=FB.dateAtTurn(s,turn);s.turn=turn; };
    window.refugeRecord=function() { return FB.state.stories[refugeLabel+'_refuge']; };
    window.refugeAct=function(action,actor,terms) { const s=FB.state,R=FB.householdRefuges;
      return R.commit(s,R.review(s,refugeLabel+'_refuge',action,actor,terms)); };
    window.refugeAssets=function() { const s=FB.state;return JSON.stringify([s.chars,s.population,s.armies,s.owner,s.holder,s.player.gold,s.buildings,s.holdings]); };
    window.refugeParty=function(child) {
      const s=FB.state,P=FB.householdParties,id=refugeLabel+'_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
      function act(op,who,person,care) { if (!P.commit(s,P.review(s,id,op,who,person,care))) throw new Error('Party setup: '+op); }
      act('invite',actor,actor);act('accept',actor,actor);act('invite',actor,spouse.id);
      FB.stories.get(id).day(s,s.stories[id]);
      const ids=[actor,spouse.id];
      if (child) {
        const c=FB.householdMembers(s).filter(function(c) { return FB.ageOf(c,s.date.year)<16; })[0];
        if (!c) throw new Error('Expected existing child');
        act('invite',actor,c.id,actor);act('accept',actor,c.id,actor);ids.push(c.id);
      }
      return ids;
    };
    window.refugeRequest=function(ids) {
      const s=FB.state;
      if (!refugeAct('request',s.player.charId,{partyId:refugeLabel+'_party',personIds:ids})) throw new Error('Request refused');
      const r=refugeRecord().requests.slice(-1)[0];
      r.members.forEach(function(m) { if (!refugeAct('consent',m.caregiverId || m.personId,{requestId:r.id,personId:m.personId})) throw new Error('Consent refused'); });
      return r.id;
    };
    window.refugeOffer=function(id) {
      const r=refugeRecord().requests.filter(function(r) { return r.id===id; })[0];
      if (!refugeAct('authorize',r.provider.rulerId,{requestId:id}) || !refugeAct('offer',r.provider.incumbentId,{requestId:id})) throw new Error('Offer refused');
    };
    window.refugeEnter=function(id,ids) { return refugeAct('enter',FB.state.player.charId,{requestId:id,personIds:ids}); };
  },label);
}

async function arrive(page) {
  await page.evaluate(function() {
    const s=FB.state,P=FB.householdParties,id='hill_party';
    if (!P.commit(s,P.review(s,id,'depart_journey',s.player.charId))) throw new Error('Departure refused');
    for (let n=0;n<16 && s.player.travel.phase!=='arrived';n++) { refugeAt(s.turn+1);s.player.travel.legDaysLeft=1;FB.travelTick(s); }
    if (s.player.travel.phase!=='arrived') throw new Error('Bounded arrival failed');
    FB.travelCapstoneDone(s);FB.stories.get(id).day(s,s.stories[id]);
  });
}

test('a free offer reserves exact consenting people before an explicit local entry',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false);s.player.homeSettlement=1;
    const before=refugeAssets(),id=refugeRequest(ids);
    const r=refugeRecord().requests[0],rid=r.provider.realmId,gold=FB.treasuryAvailable(s,rid);
    const notEntered=FB.householdRefuges.presence(s,ids[0])===null;
    refugeOffer(id);const offered=r.status,receipt=JSON.stringify(r.payment),entered=refugeEnter(id,ids);
    const location=FB.householdRefuges.presence(s,ids[0]);
    return {notEntered,offered,entered,capacity:FB.stories.status(s,'river_refuge').lines[0],
      noPayment:gold===FB.treasuryAvailable(s,rid),receiptStable:receipt===JSON.stringify(r.payment),
      site:location.siteId,local:FB.householdStories.atLocality(s,{provinceId:'inventory_quay',siteId:'inventory_quay_hall'}),
      oldHome:FB.householdStories.atLocality(s,{provinceId:'inventory_quay',siteId:'inventory_quay_store'}),
      conserved:before===refugeAssets(),none:FBDATA.techImpactReviews.features.household_temporary_refuge.mode};
  })).toMatchObject({notEntered:true,offered:'offered',entered:true,noPayment:true,receiptStable:true,
    site:'inventory_quay_hall',local:true,oldHome:false,conserved:true,none:'none'});
});

test('shelter consent is separate from party consent and AI uses the same provider transactions',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),actor=s.player.charId;
    refugeAct('request',actor,{partyId:'river_party',personIds:ids});const r=refugeRecord().requests[0];
    const early=FB.householdRefuges.review(s,'river_refuge','authorize',r.provider.rulerId,{requestId:r.id}).allowed;
    FB.stories.get('river_refuge').day(s,refugeRecord());
    const waiting=r.status,spouse=r.members.filter(function(m) { return m.personId!==actor; })[0].consentBy;
    refugeAct('consent',actor,{requestId:r.id,personId:actor});
    const saved=JSON.parse(JSON.stringify(s));
    refugeOffer(r.id);const direct=JSON.stringify(r);
    FB.stories.get('river_refuge').day(saved,saved.stories.river_refuge);
    return {early,waiting,spouseConsent:spouse===ids[1],shared:direct===JSON.stringify(saved.stories.river_refuge.requests[0]),
      arrived:r.members.every(function(m) { return m.admittedTurn===null; })};
  })).toEqual({early:false,waiting:'requested',spouseConsent:true,shared:true,arrived:true});
});

test('quotes are pure and changed people, access, authority or funds invalidate confirmation atomically',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),id=refugeRequest(ids),r=refugeRecord().requests[0],R=FB.householdRefuges;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=R.review(s,'river_refuge','authorize',r.provider.rulerId,{requestId:id});
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const rejected=[function(t) { t.chars[ids[1]].captive=true; },function(t) { t.holder.inventory_quay='inventory_ridge_court'; },
      function(t) { t.religiousHeads.river_refuge_bishop=null; },function(t) { t.chars[r.provider.rulerId].dead=true; },
      function(t) { t.localInstitutions.river_refuge_seat.status='suspended'; }].map(function(change) {
      const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);
      return !R.commit(t,q)&&before===JSON.stringify(t);
    });
    const yes=R.commit(s,q),replay=!R.commit(s,q);
    return {pure,rejected,yes,replay};
  })).toEqual({pure:true,rejected:Array(5).fill(true),yes:true,replay:true});
});

test('independent paid refuge uses real party arrival and debits the authorized public payer once',async function({page},info) {
  await start(page,info,'hill');
  await page.evaluate(function() { refugeParty(true); });
  await arrive(page);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=s.stories.hill_party.members.map(function(m) { return m.personId; });
    const id=refugeRequest(ids),r=refugeRecord().requests[0],rid=r.provider.realmId,before=refugeAssets(),gold=FB.treasuryAvailable(s,rid);
    const countyOnly=FB.householdRefuges.presence(s,ids[0])===null;
    refugeAct('authorize',r.provider.rulerId,{requestId:id});
    const R=FB.householdRefuges,q=R.review(s,'hill_refuge','offer',r.provider.incumbentId,{requestId:id});
    const first=R.commit(s,q),again=R.commit(s,q),paid=gold-FB.treasuryAvailable(s,rid);
    const entered=refugeEnter(id,[ids[0],ids[2]]);
    return {countyOnly,first,again,paid,expected:q.cost,entered,count:r.members.filter(function(m) { return m.admittedTurn!==null; }).length,
      child:!!FB.householdRefuges.presence(s,ids[2]),excluded:FB.householdRefuges.presence(s,ids[1])===null,
      actual:FB.characterLocation(s,s.chars[ids[2]]),conserved:before===refugeAssets()};
  })).toMatchObject({countyOnly:true,first:true,again:false,paid:4.5,expected:4.5,entered:true,count:2,child:true,excluded:true,
    actual:'shelter_hill_marsh',conserved:true});
});

test('insufficient public funds cannot use household gold or create an offer',async function({page},info) {
  await start(page,info,'hill');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(true),id=refugeRequest(ids),r=refugeRecord().requests[0];
    refugeAct('authorize',r.provider.rulerId,{requestId:id});
    const q=FB.householdRefuges.review(s,'hill_refuge','offer',r.provider.incumbentId,{requestId:id});
    FB.treasurySpend(s,r.provider.realmId,FB.treasuryAvailable(s,r.provider.realmId));
    const before=JSON.stringify(s),stale=FB.householdRefuges.commit(s,q),fresh=FB.householdRefuges.review(s,'hill_refuge','offer',r.provider.incumbentId,{requestId:id});
    return {ready:q.allowed,stale,fresh:fresh.allowed,unchanged:before===JSON.stringify(s),privateGold:s.player.gold,status:r.status};
  })).toMatchObject({ready:true,stale:false,fresh:false,unchanged:true,privateGold:200,status:'requested'});
});

test('a child cannot enter without the exact consenting parent and remote relatives are excluded',async function({page},info) {
  await start(page,info,'hill');
  await page.evaluate(function() { refugeParty(true); });await arrive(page);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=s.stories.hill_party.members.map(function(m) { return m.personId; }),id=refugeRequest(ids);
    refugeOffer(id);
    const alone=refugeEnter(id,[ids[2]]);
    s.stories.hill_party.journey.members.filter(function(m) { return m.personId===ids[1]; })[0].lastPlace='shelter_hill_quay';
    s.stories.hill_party.journey.members.filter(function(m) { return m.personId===ids[1]; })[0].status='separated';
    const remote=refugeEnter(id,ids),subset=refugeEnter(id,[ids[0],ids[2]]);
    return {alone,remote,subset,spouseAt:FB.characterLocation(s,s.chars[ids[1]]),childAt:FB.householdRefuges.presence(s,ids[2]).siteId};
  })).toEqual({alone:false,remote:false,subset:true,spouseAt:'shelter_hill_quay',childAt:'shelter_hill_marsh_town'});
});

test('late county arrival cannot revive an expired offer or invent exact site presence',async function({page},info) {
  await start(page,info,'hill');
  await page.evaluate(function() { const ids=refugeParty(true);refugeOffer(refugeRequest(ids)); });
  await arrive(page);
  expect(await page.evaluate(function() {
    const s=FB.state,r=refugeRecord().requests[0],ids=r.members.map(function(m) { return m.personId; });
    refugeAt(Math.max(s.turn,r.replyTurn));FB.stories.get('hill_refuge').day(s,refugeRecord());
    return {status:r.status,enter:refugeEnter(r.id,ids),actual:FB.characterLocation(s,s.chars[ids[0]]),
      site:FB.householdRefuges.presence(s,ids[0]),paid:r.payment.amount};
  })).toEqual({status:'expired',enter:false,actual:'shelter_hill_marsh',site:null,paid:4.5});
});

test('overlapping provider declarations share capacity and reject duplicate person claims',async function({page},info) {
  const input=JSON.parse(JSON.stringify(examples.hill));
  input.storyInstances.hill_refuge.capacity=2;
  input.storyInstances.hill_other=Object.assign({},input.storyInstances.hill_refuge,{id:'hill_other'});
  input.bookmarks.shelter_hill_estuary.stories.push('hill_other');
  await start(page,info,'hill',input);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(true),id=refugeRequest([ids[0],ids[2]]);refugeOffer(id);
    const R=FB.householdRefuges,duplicate=R.review(s,'hill_other','request',s.player.charId,{partyId:'hill_party',personIds:[ids[0]]}).allowed;
    const request=R.commit(s,R.review(s,'hill_other','request',s.player.charId,{partyId:'hill_party',personIds:[ids[1]]}));
    const r=s.stories.hill_other.requests[0];R.commit(s,R.review(s,'hill_other','consent',ids[1],{requestId:r.id,personId:ids[1]}));
    R.commit(s,R.review(s,'hill_other','authorize',r.provider.rulerId,{requestId:r.id}));
    const full=R.commit(s,R.review(s,'hill_other','offer',r.provider.incumbentId,{requestId:r.id}));
    refugeAct('decline',s.player.charId,{requestId:id});
    const offered=R.commit(s,R.review(s,'hill_other','offer',r.provider.incumbentId,{requestId:r.id}));
    return {duplicate,request,full,offered,used:FB.stories.status(s,'hill_other').lines[0]};
  })).toMatchObject({duplicate:false,request:true,full:false,offered:true,used:'Reserved protective places: 1 of 2.'});
});

test('provider death, recall, displacement and custody interrupt without relocating occupants',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),id=refugeRequest(ids);refugeOffer(id);refugeEnter(id,ids);
    return [function(t) { t.chars[t.stories.river_refuge.requests[0].provider.incumbentId].dead=true; },
      function(t) { t.religiousHeads.river_refuge_bishop=null; },function(t) { t.holder.inventory_quay='inventory_ridge_court'; },
      function(t) { t.chars[t.stories.river_refuge.requests[0].provider.rulerId].captive=true; }].map(function(change) {
      const t=JSON.parse(JSON.stringify(s));change(t);
      function assets(t) { return JSON.stringify([t.chars,t.population,t.armies,t.owner,t.holder,t.player.gold,t.buildings]); }
      const before=assets(t);
      const game=FB.stories.get('river_refuge');game.day(t,t.stories.river_refuge);const once=JSON.stringify(t.stories.river_refuge);game.day(t,t.stories.river_refuge);
      return {status:t.stories.river_refuge.requests[0].status,site:FB.householdRefuges.presence(t,ids[0]).siteId,
        stable:once===JSON.stringify(t.stories.river_refuge),unchanged:before===assets(t)};
    });
  })).toEqual(Array(4).fill({status:'interrupted',site:'inventory_quay_hall',stable:true,unchanged:true}));
});

test('only a committed relevant attempt challenges active protection and blocks further admission',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),id=refugeRequest([ids[0]]);refugeOffer(id);refugeEnter(id,[ids[0]]);
    const second=refugeRequest([ids[1]]);refugeOffer(second);const before=refugeAssets();
    FB.stories.apply(s,'river_attempt','warn',FB.stories.quote(s,'river_attempt','warn'));
    FB.stories.get('river_refuge').day(s,refugeRecord());const warning=refugeRecord().requests[0].status;
    refugeAt(1);FB.stories.apply(s,'river_attempt','press',FB.stories.quote(s,'river_attempt','press'));
    const blocked=refugeEnter(second,[ids[1]]);FB.stories.get('river_refuge').day(s,refugeRecord());
    return {warning,blocked,statuses:refugeRecord().requests.map(function(r) { return r.status; }),
      incident:refugeRecord().requests[0].incident,site:FB.householdRefuges.presence(s,ids[0]).siteId,conserved:before===refugeAssets()};
  })).toEqual({warning:'active',blocked:false,statuses:['challenged','interrupted'],incident:{source:'river_attempt',turn:1,serial:2},
    site:'inventory_quay_hall',conserved:true});
});

test('term expiry releases capacity while people remain present and renewed consent can buy a fresh term',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),id=refugeRequest(ids);refugeOffer(id);refugeEnter(id,ids);
    refugeAt(5);FB.stories.get('river_refuge').day(s,refugeRecord());
    const ended=refugeRecord().requests[0].status,present=!!FB.householdRefuges.presence(s,ids[0]);
    const next=refugeRequest(ids);refugeOffer(next);const entered=refugeEnter(next,ids);
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {ended,present,entered,status:refugeRecord().requests[1].status,oldWitness:refugeRecord().requests[0].members[0].leftTurn,
      presentAfter:!!FB.householdRefuges.presence(FB.state,ids[0])};
  })).toEqual({ended:'expired',present:true,entered:true,status:'active',oldWitness:5,presentAfter:true});
});

test('ordinary named departure and return own the exit road after protection ends',async function({page},info) {
  await start(page,info,'hill');await page.evaluate(function() { refugeParty(true); });await arrive(page);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=s.stories.hill_party.members.map(function(m) { return m.personId; }),id=refugeRequest(ids);
    refugeOffer(id);refugeEnter(id,ids);
    const leave=refugeAct('leave',ids[1],{requestId:id}),stillPresent=!!FB.householdRefuges.presence(s,ids[0]);
    // The actual ordinary return owner supplies its own current minimum stay.
    refugeAt(s.player.travel.stayStartTurn+90);
    const P=FB.householdParties,q=P.review(s,'hill_party','party_return',s.player.charId),road=P.commit(s,q);
    FB.stories.get('hill_refuge').day(s,refugeRecord());
    return {leave,stillPresent,road,site:FB.householdRefuges.presence(s,ids[0]),status:refugeRecord().requests[0].status,
      realCarrier:s.player.travel.householdPartyId,exact:s.stories.hill_party.journey.members.length===ids.length};
  })).toEqual({leave:true,stillPresent:true,road:true,site:null,status:'ended',realCarrier:'hill_party',exact:true});
});

test('matching saves preserve paid offers and site witnesses without replaying entry or money',async function({page},info) {
  await start(page,info,'hill');await page.evaluate(function() { refugeParty(true); });await arrive(page);
  expect(await page.evaluate(function() {
    let s=FB.state;const ids=s.stories.hill_party.members.map(function(m) { return m.personId; }),id=refugeRequest(ids);refugeOffer(id);refugeEnter(id,ids);
    const saved=JSON.parse(FB.save.serialize()),prior=saved.state,rng=FB.getRngState(),uid=FB.getUidCounter();FB.save.restore(saved);s=FB.state;
    const after=JSON.parse(FB.save.serialize()).state;
    return {records:JSON.stringify(prior.stories)===JSON.stringify(after.stories),funds:JSON.stringify(prior.treasuryAccounting)===JSON.stringify(after.treasuryAccounting),
      travel:JSON.stringify(prior.player.travel)===JSON.stringify(after.player.travel),chars:JSON.stringify(prior.chars)===JSON.stringify(after.chars),rng:(rng>>>0)===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter()};
  })).toEqual({records:true,funds:true,travel:true,chars:true,rng:true,uid:true});
});

test('the same imported opening and reviewed decisions replay exact refuge and resource facts',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const saved=JSON.parse(FB.save.serialize());
    function run() { const ids=refugeParty(false),id=refugeRequest(ids);refugeOffer(id);refugeEnter(id,ids);
      const s=JSON.parse(FB.save.serialize()).state;
      return JSON.stringify([s.stories,s.treasuryAccounting,s.player.travel,s.chars,FB.getRngState()>>>0,FB.getUidCounter()]); }
    const first=run();FB.save.restore(saved);return first===run();
  })).toBe(true);
});

test('changing imported shelter terms rejects the original save fingerprint without effects',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const saved=JSON.parse(FB.save.serialize()),d=JSON.parse(JSON.stringify(FBDATA.storyInstances.river_refuge));
    d.termDays=6;FB.mods.apply({storyInstances:{river_refuge:d}});
    const before=JSON.stringify(FB.state),state=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter();
    let rejected=false;try { FB.save.restore(saved); } catch(e) { rejected=true; }
    return rejected&&state===FB.state&&before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
  })).toBe(true);
});

test('malformed optional saves reject erased records, consent, people, capacity and debit provenance',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,ids=refugeParty(false),id=refugeRequest(ids);refugeOffer(id);refugeEnter(id,ids);
    return [function(t) { delete t.stories.river_refuge; },function(t) { delete t.stories; },
      function(t) { t.stories.river_refuge.version=2; },function(t) { t.stories.river_refuge.requests[0].members[0].consentBy=null; },
      function(t) { t.stories.river_refuge.requests[0].members.push(t.stories.river_refuge.requests[0].members[0]); },
      function(t) { t.stories.river_refuge.requests[0].payment.amount=8; },function(t) { t.stories.river_refuge.requests[0].payment=null; },
      function(t) { t.stories.river_refuge.requests[0].authorization.actorId=t.player.charId; },
      function(t) { t.stories.river_refuge.requests[0].provider.generation=9999; },
      function(t) { t.stories.river_refuge.requests[0].members[0].admittedTurn=99; },
      function(t) { t.stories.river_refuge.requests[0].extra=true; }].map(function(change) {
      const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try { FB.save.v4.validatePlatform(t); } catch(e) { rejected=true; }
      return rejected&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  })).toEqual(Array(11).fill(true));
});

test('ordinary candidate validation rejects unresolved or unsafe declarations without publishing',async function({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function(source) {
    return [function(d) { d.capacity=0; },function(d) { d.capacity=17; },function(d) { d.termDays=0; },
      function(d) { d.acceptanceDays=91; },function(d) { d.provider.officeId='missing'; },function(d) { d.locality.siteId='missing'; },
      function(d) { d.provider.realmId='missing'; },function(d) { d.funding.privateFee=1; },function(d) { d.funding.perPersonDay=-1; },
      function(d) { d.partyIds=['missing']; },function(d) { d.threatIds=['river_party']; },function(d) { d.extra=true; },
      function(d,input) { input.bookmarks.inventory_estuary.localInstitutions.river_refuge_seat.abbeyId='private_foundation'; }].map(function(change) {
      const input=JSON.parse(JSON.stringify(source));change(input.storyInstances.river_refuge,input);
      const before=JSON.stringify([FBDATA,FB.state,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const errors=FB.mods.validate(input);
      return errors.length>0&&before===JSON.stringify([FBDATA,FB.state,input])&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  },examples.river)).toEqual(Array(13).fill(true));
});

test('the shared review names exact people and costs and Back retains the shelter sheet',async function({page},info) {
  await start(page,info,'river');
  await page.evaluate(function() { refugeParty(false);FB.ui.closeModal();FB.ui.showStorySheet('river_refuge'); });
  const choice=page.locator('[data-story-choice="request/river_party"]');
  await choice.focus();await choice.click();
  await expect(page.locator('#genmodal')).toContainText('Exact people:');
  await expect(page.locator('#genmodal')).toContainText('Public cost now:');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(choice).toBeFocused();
  await expect(page.locator('#genmodal')).toContainText('River temporary shelter');
});

test('unopted retained campaigns keep their absent shelter records',async function({page},info) {
  await openGame(page,info);await beginBookmark(page,info,'867','farmer');
  expect(await page.evaluate(function() {
    const s=FB.state,before=JSON.stringify(s.stories || null),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {unchanged:before===JSON.stringify(FB.state.stories || null),absent:Object.keys(FB.state.stories || {}).every(function(id) {
      const d=FB.stories.get(id).declaration;return !d || d.type!=='household_refuge';
    })};
  })).toEqual({unchanged:true,absent:true});
});
