'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/starts_mainz_1096.js','data/story_households_rhineland_1096.js',
  'data/bookmark_1096.js','data/bookmark_1096_scaffold_b.js','data/institutions_1096.js','data/identities_1096.js',
  'data/story_instances.js','data/actions.js','data/starts.js','data/bookmark_1096_mainz.js','data/communal_revisions.js',
  'data/government_rollout.js','js/starts.js','js/story_household.js','js/story_household_party.js',
  'js/story_household_refuge.js','js/story_opening_goals.js','js/story_household_observer.js','js/stories.js',
  'js/home_authority.js','js/institutions.js','js/model.js','js/settlement.js','js/world.js','js/treasury.js',
  'js/actions.js','js/save.js','js/save_v4.js','js/mods.js','js/main.js']);

async function start(page,info) {
  await beginBookmark(page,info,'1096','mainz_jewish_household_1096');
  await page.evaluate(function() {
    window.mainzAct=function(action,actor,terms) {
      const s=FB.state,R=FB.householdRefuges;
      return R.commit(s,R.review(s,'mainz_refuge_1096',action,actor,terms));
    };
    window.mainzAt=function(turn) { const s=FB.state;s.turn=turn;s.date=FB.dateAtTurn(s,turn); };
    window.mainzRecord=function() { return FB.state.stories.mainz_refuge_1096; };
    window.mainzPeople=function(child) {
      const s=FB.state,P=FB.householdParties,id='mainz_party_1096',actor=s.player.charId;
      const spouse=FB.spousesOf(s,s.chars[actor])[0];
      function act(op,person,care) { if (!P.commit(s,P.review(s,id,op,actor,person,care))) throw new Error('Party '+op); }
      act('invite',actor);act('accept',actor);act('invite',spouse.id);
      FB.stories.get(id).day(s,s.stories[id]);
      const ids=[actor,spouse.id];
      if (child) {
        const c=FB.householdMembers(s).find(function(c) { return FB.ageOf(c,s.date.year)<16 &&
          (c.motherId===actor || c.fatherId===actor); });
        if (!c) throw new Error('Established household needs an existing child');
        act('invite',c.id,actor);act('accept',c.id,actor);ids.push(c.id);
      }
      return ids;
    };
    window.mainzRequest=function(ids) {
      const s=FB.state;
      if (!mainzAct('request',s.player.charId,{partyId:'mainz_party_1096',personIds:ids})) throw new Error('Request refused');
      const r=mainzRecord().requests.slice(-1)[0];
      r.members.forEach(function(m) {
        if (!mainzAct('consent',m.caregiverId || m.personId,{requestId:r.id,personId:m.personId})) throw new Error('Shelter consent refused');
      });return r.id;
    };
    window.mainzOffer=function(id) {
      const r=mainzRecord().requests.find(function(r) { return r.id===id; });
      if (!mainzAct('authorize',r.provider.rulerId,{requestId:id}) ||
          !mainzAct('offer',r.provider.incumbentId,{requestId:id})) throw new Error('Provider refused');
    };
    window.mainzAssets=function() {
      const s=FB.state;return JSON.stringify([s.chars,s.owner,s.holder,s.population,s.armies,s.player.gold,s.holdings,s.buildings]);
    };
    window.mainzChoose=function(choice) {
      const s=FB.state,id='mainz_household_track_1096';return FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice));
    };
  });
}

test('the new start is local, has a complete story and preserves all retained worlds',async function({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function() {
    const b=FB.bookmark('1096'),old=FB.bookmark('1096','baseline');
    const sc=FBDATA.startScenarios.find(function(sc) { return sc.id==='mainz_jewish_household_1096'; });
    const source=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const errors=FB.validateBookmark(b),olderrors=FB.validateBookmark(old);
    return {errors,olderrors,revision:b.revision,local:FB.startProvinceAllowed(sc,b,'mainz'),
      remote:FB.startProvinceAllowed(sc,b,'worms'),retained:FB.startProvinceAllowed(sc,old,'mainz'),
      oldOffice:!!old.localInstitutions.mainz_see_1096,oldRefuge:old.stories.indexOf('mainz_refuge_1096')>=0,
      identity:[sc.startCulture,sc.startReligion,sc.tier,sc.profession],tracks:FB.startTracks(sc,'mainz'),
      pure:source===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  })).toEqual({errors:[],olderrors:[],revision:'mainz_household_v1',local:true,remote:false,retained:false,
    oldOffice:false,oldRefuge:false,identity:['ashkenazi','jewish',1,'craftsman'],
    tracks:['mainz_household_track_1096','mainz_party_1096','opening_mainz_1096'],pure:true});
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,office=FB.religiousOfficeSnapshot(s,'mainz_archbishop_1096');
    return {home:s.player.provinceId,phase:s.stories.mainz_household_track_1096.phase,
      family:FB.householdMembers(s).length>1,requests:mainzRecord().requests.length,
      office:[office.name,office.born,office.homeProvinceId],
      oneRuthard:Object.values(s.chars).filter(function(c) { return c.name==='Ruthard'; }).length,
      civil:FB.householdRefuges.review(s,'mainz_refuge_1096','request',s.player.charId,{partyId:'mainz_party_1096',personIds:[s.player.charId]}).facts.provider.allowed,
      errors:FBTEST.checkInvariants()};
  })).toEqual({home:'mainz',phase:'household',family:true,requests:0,office:['Ruthard',1050,'mainz'],oneRuthard:1,civil:true,errors:[]});
});

test('ordinary work and costless continuation grant no story money, protection or movement',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,before=mainzAssets();
    const decisions=[mainzChoose('plans'),mainzChoose('community'),mainzChoose('remain')];
    const same=before===mainzAssets(),phase=s.stories.mainz_household_track_1096.phase;
    FB.stories.get('opening_mainz_1096').day(s,s.stories.opening_mainz_1096);
    return {decisions,same,phase,requests:mainzRecord().requests.length,travel:s.player.travel || null,
      goal:s.stories.opening_mainz_1096.goals.continue.status};
  })).toEqual({decisions:[true,true,true],same:true,phase:'continuing',requests:0,travel:null,goal:'completed'});
});

test('the ordinary picker offers the Mainz story at its single declared birthplace',async function({page},info) {
  await openGame(page,info);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').press('Enter');
  const card=page.locator('#scenariolist [data-scenario="mainz_jewish_household_1096"]');
  await expect(card).toBeVisible();await expect(card).not.toHaveAttribute('aria-disabled','true');await card.press('Enter');
  expect(await page.evaluate(function() {
    const p=FB.game.pending,b=FB.activeBookmark;
    return {id:p.scenario.id,places:b.provinces.filter(function(c) { return FB.startProvinceAllowed(p.scenario,b,c.id); }).map(function(c) { return c.id; }),state:FB.state};
  })).toEqual({id:'mainz_jewish_household_1096',places:['mainz'],state:null});
});

test('current-war warnings use current facts and an untouched opening expires without an incident',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state;mainzChoose('plans');mainzChoose('community');
    const allowed=FB.stories.quote(s,'mainz_household_track_1096','present_war').allowed;
    const actual=FB.isRealmAtWar(s,FB.topRealm(s,s.owner.mainz)),before=mainzAssets();
    mainzAt(360);FB.stories.get('mainz_household_track_1096').day(s,s.stories.mainz_household_track_1096);
    return {matches:allowed===actual,phase:s.stories.mainz_household_track_1096.phase,
      unchanged:before===mainzAssets(),requests:mainzRecord().requests.length};
  })).toEqual({matches:true,phase:'deferred',unchanged:true,requests:0});
});

test('craft focus records actual earnings while leaving an unpaid continuation',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state;mainzChoose('plans');mainzChoose('work');
    const pending=s.stories.opening_mainz_1096.goals.craft_income.status,working=s.stories.mainz_household_track_1096.phase;
    const cash=s.player.gold;mainzAt(1);FB.tickFocus(s);
    return {pending,working,paid:s.player.gold>cash,phase:s.stories.mainz_household_track_1096.phase,
      noShelter:mainzRecord().requests.length===0};
  })).toEqual({pending:'pending',working:'working',paid:true,phase:'community',noShelter:true});
});

test('association and shelter consents stay separate before a free, explicit local entry',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(false),before=mainzAssets();
    mainzAct('request',s.player.charId,{partyId:'mainz_party_1096',personIds:ids});
    const r=mainzRecord().requests[0],R=FB.householdRefuges;
    const early=R.review(s,'mainz_refuge_1096','authorize',r.provider.rulerId,{requestId:r.id}).allowed;
    r.members.forEach(function(m) { mainzAct('consent',m.personId,{requestId:r.id,personId:m.personId}); });
    mainzOffer(r.id);const offered=r.status,noArrival=ids.every(function(id) { return R.presence(s,id)===null; });
    const enter=mainzAct('enter',s.player.charId,{requestId:r.id,personIds:ids});
    return {early,offered,noArrival,enter,status:r.status,term:r.endTurn-s.turn,cost:r.payment.amount,
      local:R.presence(s,ids[0]),same:before===mainzAssets(),replay:mainzAct('enter',s.player.charId,{requestId:r.id,personIds:ids})};
  })).toEqual({early:false,offered:'offered',noArrival:true,enter:true,status:'active',term:30,cost:0,
    local:{provinceId:'mainz',siteId:'mainz_refuge_1096'},same:true,replay:false});
});

test('stale permission, a remote protector and the wrong locality cannot admit people',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(false),id=mainzRequest(ids),r=mainzRecord().requests[0],R=FB.householdRefuges;
    const q=R.review(s,'mainz_refuge_1096','authorize',r.provider.rulerId,{requestId:id});
    const copy=JSON.parse(JSON.stringify(s));copy.holder.mainz='hre_1096';const snapshot=JSON.stringify(copy);
    const stale=!R.commit(copy,q)&&snapshot===JSON.stringify(copy);
    const remote=JSON.parse(JSON.stringify(s));remote.chars[r.provider.incumbentId].homeProvinceId='worms';
    return {stale,remote:R.review(remote,'mainz_refuge_1096','authorize',r.provider.rulerId,{requestId:id}).allowed,
      wrongWorms:FB.householdStories.atLocality(s,{provinceId:'worms',siteId:'worms_head'}),
      wrongSpeyer:FB.householdStories.atLocality(s,{provinceId:'worms',siteId:'geo_speyer_2830582'}),
      unentered:R.presence(s,ids[0])===null};
  })).toEqual({stale:true,remote:false,wrongWorms:false,wrongSpeyer:false,unentered:true});
});

test('partial family availability retains the actual caregiver and excluded relative',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(true);s.chars[ids[1]].captive=true;
    const R=FB.householdRefuges;
    const all=R.review(s,'mainz_refuge_1096','request',s.player.charId,{partyId:'mainz_party_1096',personIds:ids}).allowed;
    const childAlone=R.review(s,'mainz_refuge_1096','request',s.player.charId,{partyId:'mainz_party_1096',personIds:[ids[2]]}).allowed;
    const selected=[ids[0],ids[2]],id=mainzRequest(selected);mainzOffer(id);
    const entered=mainzAct('enter',s.player.charId,{requestId:id,personIds:selected});
    return {all,childAlone,entered,people:mainzRecord().requests[0].members.length,
      child:R.presence(s,ids[2]).siteId,spouse:R.presence(s,ids[1]),spouseHome:FB.characterResidence(s,s.chars[ids[1]])};
  })).toEqual({all:false,childAlone:false,entered:true,people:2,child:'mainz_refuge_1096',spouse:null,spouseHome:'mainz'});
});

test('missed offers and expired protection close quietly and never invent a return',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(false),first=mainzRequest([ids[0]]);mainzOffer(first);
    const before=mainzAssets();mainzAt(15);FB.stories.get('mainz_refuge_1096').day(s,mainzRecord());
    const expired=mainzRecord().requests[0].status,late=mainzAct('enter',s.player.charId,{requestId:first,personIds:[ids[0]]});
    const second=mainzRequest(ids);mainzOffer(second);mainzAct('enter',s.player.charId,{requestId:second,personIds:ids});
    mainzAt(45);FB.stories.get('mainz_refuge_1096').day(s,mainzRecord());
    const status=mainzRecord().requests[1].status,site=FB.householdRefuges.presence(s,ids[0]);
    const once=JSON.stringify(mainzRecord());FB.stories.get('mainz_refuge_1096').day(s,mainzRecord());
    return {expired,late,status,site,unchanged:before===mainzAssets(),once:once===JSON.stringify(mainzRecord())};
  })).toEqual({expired:'expired',late:false,status:'expired',site:{provinceId:'mainz',siteId:'mainz_refuge_1096'},unchanged:true,once:true});
});

test('loss of the original provider interrupts protection without harming or relocating occupants',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(false),id=mainzRequest(ids);mainzOffer(id);
    mainzAct('enter',s.player.charId,{requestId:id,personIds:ids});
    const before=mainzAssets();s.religiousHeads.mainz_archbishop_1096=null;
    FB.stories.get('mainz_refuge_1096').day(s,mainzRecord());
    return {status:mainzRecord().requests[0].status,reason:mainzRecord().requests[0].reason,
      present:FB.householdRefuges.presence(s,ids[0]).siteId,unchanged:before===mainzAssets()};
  })).toEqual({status:'interrupted',reason:'provider',present:'mainz_refuge_1096',unchanged:true});
});

test('historical May context, repeat reviews and opening expiry cause no live incident',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,before=mainzAssets();
    const decisions=['plans','community','review_context','protection','review_actual','reconsider','decline_plans'].map(mainzChoose);
    [60,89,360].forEach(function(turn) { mainzAt(turn);FB.stories.get('mainz_refuge_1096').day(s,mainzRecord());
      FB.stories.get('mainz_household_track_1096').day(s,s.stories.mainz_household_track_1096); });
    const t=s.stories.mainz_household_track_1096;
    return {decisions,phase:t.phase,requests:mainzRecord().requests.length,
      noThreat:!FB.campaignBookmark(s).stories.some(function(id) { return FB.stories.get(id).declaration.type==='local_threat'; }),
      receipts:Object.keys(t.householdReceipts).length,unchanged:before===mainzAssets()};
  })).toEqual({decisions:Array(7).fill(true),phase:'continuing',requests:0,noThreat:true,receipts:0,unchanged:true});
});

test('matching active saves preserve exact people, consents, term and funds without replay',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(true),id=mainzRequest(ids);mainzOffer(id);
    mainzAct('enter',s.player.charId,{requestId:id,personIds:ids});
    const saved=JSON.parse(FB.save.serialize()),prior=saved.state,rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(saved);const after=JSON.parse(FB.save.serialize()).state;
    return {stories:JSON.stringify(prior.stories)===JSON.stringify(after.stories),
      chars:JSON.stringify(prior.chars)===JSON.stringify(after.chars),
      funds:JSON.stringify(prior.treasuryAccounting)===JSON.stringify(after.treasuryAccounting),
      rng:(rng>>>0)===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter()};
  })).toEqual({stories:true,chars:true,funds:true,rng:true,uid:true});
});

test('erased required records and forged provider or consent provenance reject purely',async function({page},info) {
  await start(page,info);
  expect(await page.evaluate(function() {
    const s=FB.state,ids=mainzPeople(false),id=mainzRequest(ids);mainzOffer(id);
    mainzAct('enter',s.player.charId,{requestId:id,personIds:ids});
    return [function(t) { delete t.stories.mainz_refuge_1096; },function(t) { delete t.stories.mainz_party_1096; },
      function(t) { t.stories.mainz_refuge_1096.requests[0].members[0].consentBy=null; },
      function(t) { t.stories.mainz_refuge_1096.requests[0].provider.officeId='missing_office'; },
      function(t) { t.stories.mainz_refuge_1096.requests[0].payment.amount=5; }].map(function(change) {
      const t=JSON.parse(JSON.stringify(s));change(t);const prior=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try { FB.save.v4.validatePlatform(t); } catch(e) { rejected=true; }
      return rejected&&prior===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  })).toEqual(Array(5).fill(true));
});
