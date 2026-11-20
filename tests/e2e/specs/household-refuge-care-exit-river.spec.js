'use strict';
const {test,expect}=require('../support/fixture');
const {start}=require('../support/game/household-refuge');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['js/story_household_refuge.js','js/story_household_party.js','js/story_local_threat.js',
  'js/story_household.js','js/stories.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js']);

test('a committed attempt invalidates release until the challenge is recorded and the last group closes normally',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,[actor,other]=refugeParty(false),id=refugeRequest([actor,other]);
    const R=FB.householdRefuges,refuge='river_refuge',game=FB.stories.get(refuge),terms={requestId:id};
    const r=refugeRecord().requests[0],choice='release_group/'+id;
    function quote() { return R.review(s,refuge,'release_group',actor,terms); }
    function incident(choice) { return FB.stories.apply(s,'river_attempt',choice,FB.stories.quote(s,'river_attempt',choice)); }
    s.player.homeSettlement=1;
    const offered=(refugeOffer(id),quote().allowed);
    const entered=refugeEnter(id,[actor,other]);
    const warned=incident('warn');
    game.day(s,refugeRecord());
    refugeAt(1);
    const before=quote(),pressed=incident('press'),snapshot=JSON.stringify(s);
    const interrupted=quote().reason==='release_attempt' && !R.commit(s,before) && snapshot===JSON.stringify(s);
    game.day(s,refugeRecord());
    const challenge=JSON.stringify(r.incident);
    const q=FB.stories.quote(s,refuge,choice);
    const first=FB.stories.apply(s,refuge,choice,q);
    const challenged=r.status==='challenged' && challenge===JSON.stringify(r.incident) &&
      r.incident.source==='river_attempt' && r.incident.turn===1 && r.incident.serial===2;
    const capacity=FB.stories.status(s,refuge).lines[0];
    const noReplay=!FB.stories.apply(s,refuge,choice,q) && !quote().allowed;
    const halfway=FB.stories.choices(s,refuge).some(function(v) { return v.id==='leave/'+id; });
    const final=refugeAct('release_group',other,terms);
    const physical=FB.householdStories.atLocality(s,{provinceId:'inventory_quay',siteId:'inventory_quay_hall'}) &&
      !FB.householdStories.atLocality(s,{provinceId:'inventory_quay',siteId:'inventory_quay_store'}) &&
      R.presence(s,other).siteId==='inventory_quay_hall' && r.members.every(function(m) { return m.leftTurn===null; });
    return {offered,entered,warned,pressed,confirmedBeforeAttempt:before.allowed,interrupted,first,challenged,capacity,noReplay,halfway,final,
      closure:[r.status,r.reason,r.closedTurn],released:r.members.map(function(m) { return m.releasedTurn; }),physical,
      incidentRetained:challenge===JSON.stringify(r.incident),paid:r.payment.amount,available:FB.stories.status(s,refuge).lines[0]};
  })).toEqual({offered:false,entered:true,warned:true,pressed:true,confirmedBeforeAttempt:true,interrupted:true,first:true,
    challenged:true,capacity:'Reserved protective places: 1 of 2.',noReplay:true,halfway:true,final:true,
    closure:['ended','leave',1],released:[1,1],physical:true,incidentRetained:true,paid:0,available:'Reserved protective places: 0 of 2.'});
});

test('a newly consented same-site admission reuses the freed place while the other adult keeps the original term',async function({page},info) {
  await start(page,info,'river');
  expect(await page.evaluate(function() {
    const s=FB.state,[actor,other]=refugeParty(false),id=refugeRequest([actor,other]);
    refugeOffer(id);refugeEnter(id,[actor,other]);
    const R=FB.householdRefuges,refuge='river_refuge',r=refugeRecord().requests[0];
    const otherMember=r.members.find(function(m) { return m.personId===other; });
    const actorMember=r.members.find(function(m) { return m.personId===actor; });
    const otherBefore=JSON.stringify(otherMember),before=JSON.stringify([r.provider,r.endTurn,r.payment]);
    const released=refugeAct('release_group',actor,{requestId:id});
    const atShelter=R.presence(s,actor).siteId==='inventory_quay_hall';
    refugeAt(1);
    const next=refugeRequest([actor]);refugeOffer(next);
    const offerCapacity=FB.stories.status(s,refuge).lines[0],offeredStillPresent=actorMember.leftTurn===null;
    const entered=refugeEnter(next,[actor]);
    const firstWitness=actorMember.leftTurn,firstRelease=actorMember.releasedTurn;
    const sameTerm=before===JSON.stringify([r.provider,r.endTurn,r.payment]) && otherBefore===JSON.stringify(otherMember);
    const beforeSave=JSON.stringify(refugeRecord());
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=beforeSave===JSON.stringify(refugeRecord()) && [actor,other].every(function(p) {
      return R.presence(FB.state,p).siteId==='inventory_quay_hall';
    });
    const wholeClose=refugeAct('leave',other,{requestId:id});
    return {released,atShelter,offerCapacity,offeredStillPresent,entered,firstWitness,firstRelease,sameTerm,restored,wholeClose,
      status:refugeRecord().requests.map(function(row) { return row.status; }),used:FB.stories.status(FB.state,refuge).lines[0]};
  })).toEqual({released:true,atShelter:true,offerCapacity:'Reserved protective places: 2 of 2.',offeredStillPresent:true,entered:true,
    firstWitness:1,firstRelease:0,sameTerm:true,restored:true,wholeClose:true,status:['ended','active'],used:'Reserved protective places: 1 of 2.'});
});
