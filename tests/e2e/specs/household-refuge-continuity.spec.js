'use strict';
const {test,expect}=require('../support/fixture');
const {start,arrive,examples}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const {openGame}=require('../support/game/navigation');
const {beginBookmarkFromTitle}=require('../support/game/bookmark-acceptance');
dependsOnRuntime(__filename,['index.html','data/technology.js','data/travel.js','data/starts.js','js/story_household_refuge.js',
  'js/story_household_party.js','js/household_party_travel.js','js/household_party_camp.js','js/story_local_threat.js','js/story_household.js',
  'js/story_household_observer.js','js/story_expedition_participation.js','js/stories.js','js/home_authority.js','js/treasury.js',
  'js/institutions.js','js/model.js','js/travel.js','js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js',
  'js/settlement.js','js/lordships.js','js/governments.js','js/rebellions.js','js/authority.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

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
  await openGame(page,info);await beginBookmarkFromTitle(page,'867','farmer');
  expect(await page.evaluate(function() {
    const s=FB.state,before=JSON.stringify(s.stories || null),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {unchanged:before===JSON.stringify(FB.state.stories || null),absent:Object.keys(FB.state.stories || {}).every(function(id) {
      const d=FB.stories.get(id).declaration;return !d || d.type!=='household_refuge';
    })};
  })).toEqual({unchanged:true,absent:true});
});
