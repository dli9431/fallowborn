'use strict';
const {test,expect}=require('../support/fixture');
const {start,arrive,examples}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/technology.js','data/travel.js','data/starts.js','js/story_household_refuge.js',
  'js/story_household_party.js','js/household_party_travel.js','js/household_party_camp.js','js/story_local_threat.js','js/story_household.js',
  'js/story_household_observer.js','js/story_expedition_participation.js','js/stories.js','js/home_authority.js','js/treasury.js',
  'js/institutions.js','js/model.js','js/travel.js','js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js',
  'js/settlement.js','js/lordships.js','js/governments.js','js/rebellions.js','js/authority.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

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

