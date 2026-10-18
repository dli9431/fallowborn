'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/household-party-harbor.json'),upland:require('../fixtures/authoring/household-party-upland.json')};
const journeys={harbor:require('../fixtures/authoring/household-journey-harbor.json'),upland:require('../fixtures/authoring/household-journey-upland.json')};
const camps={harbor:require('../fixtures/authoring/household-camp-harbor.json'),upland:require('../fixtures/authoring/household-camp-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/starts.js','data/mobile_confederations.js','data/travel.js','js/story_household_party.js','js/stories.js',
  'js/story_household.js','js/household_party_travel.js','js/household_party_camp.js','js/story_expedition_participation.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js','js/economy.js','js/model.js','js/items.js',
  'js/agency.js','js/justice.js','js/intrigue.js','js/travel.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

async function start(page,info,label,modified) {
  const prefix=label==='upland'?'dune':'harbor';
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(modified ? {name:'household-party-'+label+'.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/household-party-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world']; },prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

async function prepareJourney(page,info,label) {
  await start(page,info,label,journeys[label]);
  return page.evaluate(function(label) {
    const s=FB.state,P=FB.householdParties,id=label+'_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    function act(action,who,person,care){return P.commit(s,P.review(s,id,action,who,person,care));}
    if(!act('invite',actor,actor)||!act('accept',actor,actor)||!act('invite',actor,spouse.id))throw new Error('Association setup failed');
    FB.stories.get(id).day(s,s.stories[id]);
    if(label==='upland') {
      const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
      if(!child || !act('invite',actor,child.id,actor)||!act('accept',actor,child.id,actor))throw new Error('Care consent setup failed');
    }
    return {actor:actor,spouse:spouse.id};
  },label);
}

// Tick only actual ordinary route legs; no simulated years or invented arrival.
async function arriveJourney(page) {
  await page.evaluate(function() {
    const s=FB.state;
    for(let i=0;i<16 && s.player.travel && s.player.travel.phase!=='arrived';i++) {
      s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
    }
    if(!s.player.travel || s.player.travel.phase!=='arrived')throw new Error('Bounded journey did not arrive');
    FB.travelCapstoneDone(s);
    FB.stories.get(s.player.travel.householdPartyId).day(s,s.stories[s.player.travel.householdPartyId]);
  });
}

for(const label of ['harbor','upland']) {
  test(label+' imports an optional journey and carries only separately consenting named people on the real road',async function({page},info) {
    await prepareJourney(page,info,label);
    const result=await page.evaluate(function(label) {
      const s=FB.state,P=FB.householdParties,id=label+'_party',t=s.stories[id],actor=s.player.charId;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=P.review(s,id,'depart_journey',actor);
      const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),gold=s.player.gold;
      const people=JSON.stringify([s.population,s.armies,s.owner,s.holder,Object.keys(s.chars)]);
      const first=P.commit(s,q),again=!P.commit(s,q),paid=gold-s.player.gold===q.cost;
      const exact=t.version===2&&t.journey.members.length===2&&t.journey.members.every(function(m){return q.people.includes(m.personId);});
      const absent=FB.householdMembers(s).filter(function(c){return !q.people.includes(c.id);}).every(function(c){
        return !P.journeys.location(s,c.id)&&FB.characterResidence(s,c)===s.player.provinceId;
      });
      const canonical=t.journey.members.every(function(m){return FB.characterLocation(s,s.chars[m.personId])===s.player.travel.currentId;});
      return {pure:pure,allowed:q.allowed,first:first,again:again,paid:paid,exact:exact,absent:absent,canonical:canonical,
        noHomeLabor:q.people.every(function(id){return !FB.householdWorkers(s).some(function(c){return c.id===id;});}),
        conserved:people===JSON.stringify([s.population,s.armies,s.owner,s.holder,Object.keys(s.chars)]),
        none:FBDATA.techImpactReviews.features.household_party_journeys.mode};
    },label);
    expect(result).toEqual({pure:true,allowed:true,first:true,again:true,paid:true,exact:true,absent:true,canonical:true,noHomeLabor:true,conserved:true,none:'none'});
    await arriveJourney(page);
    expect(await page.evaluate(function(){const s=FB.state,t=s.stories[s.player.travel.householdPartyId];return t.journey.members.every(function(m){
      return FB.characterLocation(s,s.chars[m.personId])===s.player.travel.destinationId && FB.characterResidence(s,s.chars[m.personId])===t.journey.homeId;
    });})).toBe(true);
  });
}

test('journey candidates reject bad kinds, unknown references and extra fields without publication',async function({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function(source) {
    return [function(d){d.kind='camp';},function(d){d.travelSiteId='missing';},function(d){d.extra=true;},
      function(d,input){input.travelSites[0].provinceId='missing';},function(d,input){input.travelPurposes.harbor_family_visit.mode='capitals';},
      function(d,input){input.travelRules.harbor_family_visit.kind='service';}].map(function(change){
      const input=JSON.parse(JSON.stringify(source));change(input.storyInstances.harbor_party.journey,input);
      const before=JSON.stringify([FB.state,FBDATA,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0&&before===JSON.stringify([FB.state,FBDATA,input])&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  },journeys.harbor);
  expect(result).toEqual(Array(6).fill(true));
});

test('stale funds, custody, remote residence and independent commitments prevent atomic group departure',async function({page},info) {
  await prepareJourney(page,info,'harbor');
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='harbor_party',actor=base.player.charId,spouse=FB.spousesOf(base,base.chars[actor])[0].id;
    return [function(s){s.player.gold=0;},function(s){s.chars[spouse].captive=true;},
      function(s){s.chars[spouse].homeProvinceId='harbor_gardens';},function(s){s.chars[spouse].travel={currentId:'harbor_gardens'};}].map(function(change){
      const s=JSON.parse(JSON.stringify(base)),q=P.review(s,id,'depart_journey',actor);change(s);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !P.commit(s,q)&&!P.review(s,id,'depart_journey',actor).allowed&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(4).fill(true));
});

test('cancellation retains the reached county and recovery pays once for actual survivors',async function({page},info) {
  await prepareJourney(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party',actor=s.player.charId;
    P.commit(s,P.review(s,id,'depart_journey',actor));s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
    const reached=s.player.travel.currentId,home=s.player.provinceId,people=JSON.stringify([s.population,s.armies,s.owner,s.holder]);
    FB.travelCancel(s,null,true);
    const truthful=reached!==home&&FB.travelLocation(s).id===reached&&s.stories[id].journey.members.every(function(m){return P.journeys.location(s,m.personId)===reached;});
    const noSettlement=FB.travelSettlementEligible(s)!==true;
    const q=P.review(s,id,'party_return',actor),gold=s.player.gold,first=P.commit(s,q),paid=gold-s.player.gold===q.cost&&q.cost>0,again=!P.commit(s,q);
    for(let i=0;i<16 && s.player.travel;i++){s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);}
    return {truthful:truthful,noSettlement:noSettlement,first:first,paid:paid,again:again,home:!s.player.travel&&s.stories[id].journey.members.every(function(m){return m.status==='returned'&&FB.characterLocation(s,s.chars[m.personId])===home;}),
      conserved:people===JSON.stringify([s.population,s.armies,s.owner,s.holder])};
  });
  expect(result).toEqual({truthful:true,noSettlement:true,first:true,paid:true,again:true,home:true,conserved:true});
});

test('ordinary funded return retains its stay gate and original travel speed without paying a second fare',async function({page},info) {
  await prepareJourney(page,info,'harbor');
  await page.evaluate(function(){const s=FB.state,P=FB.householdParties;P.commit(s,P.review(s,'harbor_party','depart_journey',s.player.charId));});
  await arriveJourney(page);
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,actor=s.player.charId;
    const early=!P.review(s,'harbor_party','party_return',actor).allowed,days=s.player.travel.legDays;
    s.turn+=FBDATA.balance.travelMinStayDays;s.player.householdStandards={};
    const q=P.review(s,'harbor_party','party_return',actor),gold=s.player.gold;
    return {early:early,prepaid:q.road.prepaid,cost:q.cost,speed:q.road.legDays===days,applied:P.commit(s,q),unpaid:s.player.gold===gold};
  });
  expect(result).toEqual({early:true,prepaid:true,cost:0,speed:true,applied:true,unpaid:true});
});

test('an interrupted checkpoint restores without arrival, payment or relocation and requires its exact carrier',async function({page},info) {
  await prepareJourney(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party';P.commit(s,P.review(s,id,'depart_journey',s.player.charId));
    s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);FB.travelCancel(s,null,true);
    const source=JSON.parse(FB.save.serialize()),facts=JSON.stringify([s.stories[id],s.player.travel,s.player.provinceId,s.player.gold]);
    FB.save.restore(source);
    const restored=facts===JSON.stringify([FB.state.stories[id],FB.state.player.travel,FB.state.player.provinceId,FB.state.player.gold]);
    const invalid=JSON.parse(JSON.stringify(source));delete invalid.state.player.travel.householdPartyId;
    const before=JSON.stringify(FB.state);let failed=false;try{FB.save.restore(invalid);}catch(error){failed=true;}
    return {restored:restored,blocked:failed&&before===JSON.stringify(FB.state),
      noWork:FB.state.player.travel.partyInterrupted===true&&FB.travelSettlementEligible(FB.state)!==true};
  });
  expect(result).toEqual({restored:true,blocked:true,noWork:true});
});

test('adult withdrawal preserves location and cannot be overridden by a household return decision',async function({page},info) {
  await prepareJourney(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='harbor_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0].id;
    P.commit(s,P.review(s,id,'depart_journey',actor));s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
    const reached=s.player.travel.currentId,split=P.commit(s,P.review(s,id,'separate_person',spouse,spouse));
    FB.travelCancel(s,null,true);
    const q=P.review(s,id,'party_return',actor),excluded=!q.people.includes(spouse)&&q.excluded.includes(spouse);
    const noImpersonation=!P.commit(s,P.review(s,id,'rejoin_person',actor,spouse));
    const returned=P.commit(s,q);
    for(let i=0;i<16&&s.player.travel;i++){s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);}
    return {split:split,excluded:excluded,noImpersonation:noImpersonation,returned:returned,remains:P.journeys.location(s,spouse)===reached,
      home:FB.travelLocation(s).id===s.player.provinceId};
  });
  expect(result).toEqual({split:true,excluded:true,noImpersonation:true,returned:true,remains:true,home:true});
});

test('parent withdrawal includes the dependent and dependent custody interrupts that care group once',async function({page},info) {
  await prepareJourney(page,info,'upland');
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='upland_party',actor=base.player.charId;
    P.commit(base,P.review(base,id,'depart_journey',actor));
    const child=base.stories[id].journey.members.filter(function(m){return m.caregiverId;})[0].personId;
    const split=JSON.parse(JSON.stringify(base)),q=P.review(split,id,'separate_person',actor,actor);
    const childReview=P.review(split,id,'separate_person',actor,child);
    const together=q.people.includes(child)&&childReview.people.includes(actor)&&P.commit(split,q)&&split.stories[id].journey.members.every(function(m){return m.status==='withdrawn';});
    const held=JSON.parse(JSON.stringify(base));held.chars[child].captive=true;
    FB.stories.get(id).day(held,held.stories[id]);const once=JSON.stringify(held.stories[id]);FB.stories.get(id).day(held,held.stories[id]);
    return {together:together,interrupted:held.stories[id].journey.status==='interrupted',separated:held.stories[id].journey.members.every(function(m){return m.status==='separated';}),
      once:once===JSON.stringify(held.stories[id]),noMove:held.player.travel.currentId===held.player.provinceId};
  });
  expect(result).toEqual({together:true,interrupted:true,separated:true,once:true,noMove:true});
});

test('eligible settlement moves the present parent and child and preserves excluded spouse residence and all property',async function({page},info) {
  await prepareJourney(page,info,'upland');
  await page.evaluate(function(){const s=FB.state,P=FB.householdParties;P.commit(s,P.review(s,'upland_party','depart_journey',s.player.charId));});
  await arriveJourney(page);
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0],home=s.player.provinceId;
    const dest=s.player.travel.destinationId,early=!P.review(s,id,'party_settle',actor).allowed;
    s.turn+=FBDATA.balance.travelSettleOfferDays;s.player.travel.workEvents=FBDATA.balance.travelSettleWorkEvents;
    const property=JSON.stringify([s.player.holdings||null,s.player.enterprises||null,s.population,s.owner,s.holder]);
    const q=P.review(s,id,'party_settle',actor),done=P.commit(s,q);
    const answer={early:early,done:done,home:s.player.provinceId===dest,noTravel:!s.player.travel,spouse:FB.characterResidence(s,spouse)===home,
      movers:s.stories[id].journey.members.every(function(m){return m.status==='settled'&&FB.characterResidence(s,s.chars[m.personId])===dest;}),
      property:property===JSON.stringify([s.player.holdings||null,s.player.enterprises||null,s.population,s.owner,s.holder]),again:!P.commit(s,q),
      excluded:q.excluded.includes(spouse.id)};
    const source=JSON.parse(FB.save.serialize());FB.save.restore(source);
    answer.restored=FB.state.player.provinceId===dest&&FB.characterResidence(FB.state,FB.state.chars[spouse.id])===home;
    return answer;
  });
  expect(result).toEqual({early:true,done:true,home:true,noTravel:true,spouse:true,movers:true,property:true,again:true,excluded:true,restored:true});
});

test('matching saves preserve journey facts and forged or erased carriers fail before state adoption',async function({page},info) {
  await prepareJourney(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='harbor_party';P.commit(s,P.review(s,id,'depart_journey',s.player.charId));
    function facts(s){return JSON.stringify([s.stories[id],s.player.travel,s.player.gold,s.stories[id].journey.members.map(function(m){
      const c=s.chars[m.personId];return [c.id,c.homeProvinceId||null,c.householdResidenceId||null,P.journeys.location(s,c.id)];
    })]);}
    const source=JSON.parse(FB.save.serialize()),beforeRestore=facts(s);
    FB.save.restore(source);
    const restored=beforeRestore===facts(FB.state);
    const changes=[function(d){d.state.stories[id].journey.schema=2;},function(d){d.state.stories[id].journey.extra=true;},
      function(d){d.state.stories[id].journey.members[0].lastPlace='missing';},function(d){d.state.stories[id].journey.members[0].lastTurn=999999;},
      function(d){d.state.stories[id].journey.members.push(d.state.stories[id].journey.members[0]);},
      function(d){d.state.stories[id].journey.carrier.startTurn++;},function(d){delete d.state.player.travel;},
      function(d){delete d.state.player.travel.householdPartyId;},function(d){d.state.player.travel.currentId='missing';},
      function(d){d.state.player.travel.extra=true;},function(d){d.state.player.travel.partyInterrupted=false;},
      function(d){d.state.stories[id].journey.members[1].caregiverId=d.state.player.charId;},
      function(d){d.state.chars[d.state.player.charId].householdResidenceId='missing';}];
    const rejected=changes.map(function(change){const d=JSON.parse(JSON.stringify(source));change(d);
      const before=JSON.stringify(FB.state),candidate=JSON.stringify(d),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
      try{FB.save.restore(d);}catch(error){failed=true;}
      return failed&&before===JSON.stringify(FB.state)&&candidate===JSON.stringify(d)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
    return {restored:restored,rejected:rejected};
  });
  expect(result).toEqual({restored:true,rejected:Array(13).fill(true)});
});

test('death, custody, adulthood and succession preserve the actual surviving subset without adopting an heir carrier',async function({page},info) {
  await prepareJourney(page,info,'upland');
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='upland_party',actor=base.player.charId;
    P.commit(base,P.review(base,id,'depart_journey',actor));
    const child=base.stories[id].journey.members.filter(function(m){return m.caregiverId;})[0].personId;
    return ['death','custody','adulthood','succession'].map(function(kind){
      const s=JSON.parse(JSON.stringify(base)),home=s.player.provinceId,assets=JSON.stringify([s.population,s.armies,s.owner,s.holder]);
      if(kind==='death'){s.chars[actor].dead=true;s.player.dead=true;}
      if(kind==='custody')s.chars[actor].captive=true;
      if(kind==='adulthood')s.chars[child].born=s.date.year-16;
      if(kind==='succession'){s.player.charId=child;s.player.travel=null;}
      FB.stories.get(id).day(s,s.stories[id]);
      const subset=kind==='adulthood' ? s.stories[id].journey.members.filter(function(m){return m.personId===child;})[0].status==='separated' :
        s.stories[id].journey.members.every(function(m){return m.status!=='following';});
      return {subset:subset,home:s.stories[id].journey.members.every(function(m){return m.lastPlace===home;}),
        conserved:assets===JSON.stringify([s.population,s.armies,s.owner,s.holder]),original:s.stories[id].actorId===actor};
    });
  });
  expect(result).toEqual(Array(4).fill({subset:true,home:true,conserved:true,original:true}));
});

test('journey departure reviews show names and price and Escape restores the same uncommitted choice',async function({page},info) {
  await prepareJourney(page,info,'harbor');
  await page.evaluate(function(){FB.ui.showStorySheet('harbor_party');});
  const depart=page.locator('[data-story-choice]').filter({hasText:'Travel with consenting relatives'});
  const key=await depart.getAttribute('data-story-choice');
  const gold=await page.evaluate(function(){return FB.state.player.gold;});
  await depart.click();
  await expect(page.locator('#gm-body')).toContainText('Private cost:');
  await expect(page.locator('#gm-body')).toContainText('Excluded from this decision:');
  await page.keyboard.press('Escape');
  await expect(depart).toBeVisible();
  expect(await page.evaluate(function(){return {gold:FB.state.player.gold,travel:FB.state.player.travel,focus:document.activeElement.getAttribute('data-story-choice')};}))
    .toEqual({gold:gold,travel:null,focus:key});
});

test('the same ordinary imported journey seed preserves consent, fare, carrier identity and RNG',async function({page},info) {
  await start(page,info,'harbor',journeys.harbor);
  async function depart(){return page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='harbor_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0].id;
    P.commit(s,P.review(s,id,'invite',actor,actor));P.commit(s,P.review(s,id,'accept',actor,actor));
    P.commit(s,P.review(s,id,'invite',actor,spouse));FB.stories.get(id).day(s,s.stories[id]);
    P.commit(s,P.review(s,id,'depart_journey',actor));
    return JSON.stringify([s.stories[id],s.player.travel,s.player.gold,FB.getRngState(),FB.getUidCounter()]);
  });}
  const first=await depart();await beginBookmark(page,info,'harbor_world','harbor_household');
  expect(await depart()).toBe(first);
});

for (const label of ['harbor','upland']) {
  test(label+' imports a distinct named association with separate consent and no movement or resources',async function ({page},info) {
    await start(page,info,label);
    const result=await page.evaluate(function (label) {
      const s=FB.state,P=FB.householdParties,id=label+'_party',t=s.stories[id],module=FB.stories.get(id),actor=s.player.charId;
      const household=FB.householdMembers(s),spouse=FB.spousesOf(s,s.chars[actor])[0],child=household.filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
      function act(action,who,person,care) { return P.commit(s,P.review(s,id,action,who,person,care)); }
      function assets() { return JSON.stringify([s.population,s.chars,s.player.gold,s.player.provinceId,s.player.travel,s.owner,s.holder,
        s.authority,s.armies,s.greatHolyWar||null,s.holdings||null]); }
      const initial=assets(),empty=t.members.length===0,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const quote=P.review(s,id,'invite',actor,actor),pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const invited=P.commit(s,quote),needsConsent=t.members[0].status==='invited';
      const self=act('accept',actor,actor),asked=act('invite',actor,spouse.id),separate=t.members[1].status==='invited';
      const impersonation=!act('accept',actor,spouse.id);module.day(s,t);
      let dependent=false;
      if(label==='upland') dependent=act('invite',actor,child.id,actor)&&act('accept',actor,child.id,actor);
      const statuses=t.members.map(function(m){return m.status;}),saved=JSON.stringify(t),snapshot=P.snapshot(s,id),unmoved=initial===assets();
      const source=JSON.parse(FB.save.serialize());FB.save.restore(source);
      const restored=JSON.stringify(FB.state.stories[id])===saved;
      return {empty:empty,pure:pure,invited:invited,needsConsent:needsConsent,self:self,asked:asked,separate:separate,impersonation:impersonation,
        dependent:dependent,statuses:statuses,accepted:snapshot.accepted.length,unmoved:unmoved,restored:restored,
        none:FBDATA.techImpactReviews.features.household_party_consent.mode};
    },label);
    expect(result).toEqual({empty:true,pure:true,invited:true,needsConsent:true,self:true,asked:true,separate:true,impersonation:true,
      dependent:label==='upland',statuses:label==='harbor'?['accepted','accepted']:['accepted','refused','accepted'],
      accepted:2,unmoved:true,restored:true,none:'none'});
  });
}

test('malformed detached declarations reject without publishing state, data, identities or randomness',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function(d){d.maxMembers=0;},function(d){d.maxMembers=17;},function(d){d.maxMembers=1.5;},
      function(d){d.allowDependents='yes';},function(d){d.invitationDays=0;},function(d){d.invitationDays=91;},
      function(d){d.adultPolicy='forced';},function(d){d.carrier={kind:'camp'};},function(d){delete d.title;},function(d){d.relocate=true;}];
    return changes.map(function(change) {
      const input=JSON.parse(JSON.stringify(source));change(input.storyInstances.upland_party);
      const before=JSON.stringify([FB.state,FBDATA,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && before===JSON.stringify([FB.state,FBDATA,input]) &&
        rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  },examples.upland);
  expect(result).toEqual(Array(10).fill(true));
});

test('dead, captive, remote, independently travelling and camp-bound relatives cannot be invited',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const base=FB.state,id='harbor_party',spouse=FB.spousesOf(base,base.chars[base.player.charId])[0].id;
    const changes=[function(s){s.chars[spouse].dead=true;},function(s){s.chars[spouse].captive=true;},
      function(s){s.chars[spouse].homeProvinceId='harbor_gardens';},function(s){s.chars[spouse].travel={currentId:'harbor_gardens'};},
      function(s){s.chars[spouse].prisonerOf='harbor_commune';},function(s){s.player.travel={currentId:'harbor_gardens'};},
      function(s){s.player.flags.in_prison=true;},function(s){s.chars[spouse].health=0;},
      function(s){const rid=Object.keys(s.realms).filter(function(rid){return !!FB.mobile.row(s,rid);})[0];
        FB.mobile.row(s,rid).members[0].principal.id=spouse;}];
    return changes.map(function(change) {
      const s=JSON.parse(JSON.stringify(base));change(s);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=FB.householdParties.review(s,id,'invite',s.player.charId,spouse);
      return !q.allowed&&!FB.householdParties.commit(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(9).fill(true));
});

test('dependent consent requires the actual accepted parent and removal explicitly releases dependent reservations',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.householdParties,id='upland_party',actor=s.player.charId,t=s.stories[id];
    const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0],spouse=FB.spousesOf(s,s.chars[actor])[0];
    function act(action,who,person,care){return P.commit(s,P.review(s,id,action,who,person,care));}
    const absentParent=!P.review(s,id,'invite',actor,child.id,actor).allowed;
    act('invite',actor,actor);act('accept',actor,actor);
    const invited=act('invite',actor,child.id,actor),wrongParent=!act('accept',spouse.id,child.id,spouse.id);
    const accepted=act('accept',actor,child.id,actor),q=P.review(s,id,'withdraw',actor,actor),names=q.affected.slice();
    const released=P.commit(s,q)&&P.reservedBy(s,child.id)===null&&P.reservedBy(s,actor)===null;
    const statuses=t.members.map(function(m){return m.status;}),unchanged=s.player.travel===null&&FB.characterResidence(s,child)===s.player.provinceId;
    return {absentParent:absentParent,invited:invited,wrongParent:wrongParent,accepted:accepted,explicit:names.length===2&&names.indexOf(child.id)>=0,
      released:released,statuses:statuses,unchanged:unchanged};
  });
  expect(result).toEqual({absentParent:true,invited:true,wrongParent:true,accepted:true,explicit:true,released:true,
    statuses:['withdrawn','withdrawn'],unchanged:true});
});

test('reservations are disjoint and bounded, while adult withdrawal releases a place without reopening its invitation',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  input.storyInstances.second_party=Object.assign({},input.storyInstances.harbor_party,{id:'second_party'});
  input.startScenarios[0].tracks.push('second_party');input.startScenarios[0].trackLocations.second_party=['harbor_quay'];
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.householdParties,actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    function act(id,action,who,person){return P.commit(s,P.review(s,id,action,who,person));}
    const first=act('harbor_party','invite',actor,spouse.id),blocked=!act('second_party','invite',actor,spouse.id);
    FB.stories.get('harbor_party').day(s,s.stories.harbor_party);
    const ownWithdrawal=act('harbor_party','withdraw',spouse.id,spouse.id),released=act('second_party','invite',actor,spouse.id);
    const noReinvite=!act('harbor_party','invite',actor,spouse.id),self=act('harbor_party','invite',actor,actor);
    const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
    const noImplicitChild=!P.review(s,'harbor_party','invite',actor,child.id,actor).allowed;
    const finished=act('harbor_party','finish',actor),closed=!act('harbor_party','accept',actor,actor);
    return {first:first,blocked:blocked,ownWithdrawal:ownWithdrawal,released:released,noReinvite:noReinvite,self:self,noImplicitChild:noImplicitChild,finished:finished,closed:closed};
  });
  expect(result).toEqual({first:true,blocked:true,ownWithdrawal:true,released:true,noReinvite:true,self:true,noImplicitChild:true,finished:true,closed:true});
});

test('capacity limits the whole lifetime roster and forged cross-party reservations fail the save boundary',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));input.storyInstances.harbor_party.maxMembers=1;
  input.storyInstances.second_party=Object.assign({},input.storyInstances.harbor_party,{id:'second_party'});
  input.startScenarios[0].tracks.push('second_party');input.startScenarios[0].trackLocations.second_party=['harbor_quay'];
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.householdParties,actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    function act(id,action,person){return P.commit(s,P.review(s,id,action,actor,person));}
    const first=act('harbor_party','invite',actor),full=!act('harbor_party','invite',spouse.id);
    const other=act('second_party','invite',spouse.id),source=JSON.parse(FB.save.serialize());
    source.state.stories.second_party.members=JSON.parse(JSON.stringify(source.state.stories.harbor_party.members));
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try{FB.save.restore(source);}catch(error){rejected=true;}
    const pure=rejected&&before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const removed=act('harbor_party','withdraw',actor),stillFull=!act('harbor_party','invite',spouse.id);
    return {first:first,full:full,other:other,pure:pure,removed:removed,stillFull:stillFull};
  });
  expect(result).toEqual({first:true,full:true,other:true,pure:true,removed:true,stillFull:true});
});

test('expired invitations, lost caregivers, adulthood and succession reconcile once without moving anyone',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const base=FB.state,P=FB.householdParties,id='upland_party',actor=base.player.charId,module=FB.stories.get(id);
    const child=FB.householdMembers(base).filter(function(c){return FB.ageOf(c,base.date.year)<16;})[0];
    function act(action,person,care){return P.commit(base,P.review(base,id,action,actor,person,care));}
    act('invite',actor);act('accept',actor);act('invite',child.id,actor);
    return ['expiry','parent_death','child_adult','succession','custody'].map(function(kind) {
      const s=JSON.parse(JSON.stringify(base)),t=s.stories[id];
      if(kind==='expiry')s.turn=t.members[1].endTurn;
      if(kind==='parent_death')s.chars[actor].dead=true;
      if(kind==='child_adult')s.chars[child.id].born=s.date.year-16;
      if(kind==='succession')s.player.charId=child.id;
      if(kind==='custody')s.chars[child.id].captive=true;
      const old=JSON.stringify([s.chars,s.population,s.owner,s.holder,s.player.provinceId,s.player.travel]);
      module.day(s,t);const once=JSON.stringify(t);module.day(s,t);
      return {status:t.status,member:t.members[1].status,once:once===JSON.stringify(t),unmoved:old===JSON.stringify([s.chars,s.population,s.owner,s.holder,s.player.provinceId,s.player.travel])};
    });
  });
  expect(result).toEqual([{status:'forming',member:'expired',once:true,unmoved:true},
    {status:'closed',member:'invited',once:true,unmoved:true},{status:'forming',member:'withdrawn',once:true,unmoved:true},
    {status:'closed',member:'invited',once:true,unmoved:true},{status:'forming',member:'withdrawn',once:true,unmoved:true}]);
});

test('stale and repeated confirmations cannot grant consent and restore does not dispatch pending AI',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.householdParties,id='harbor_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    const q=P.review(s,id,'invite',actor,spouse.id),first=P.commit(s,q),again=!P.commit(s,q);
    const consent=P.review(s,id,'accept',spouse.id,spouse.id);s.chars[spouse.id].captive=true;
    const before=JSON.stringify(s),stale=!P.commit(s,consent)&&before===JSON.stringify(s);s.chars[spouse.id].captive=false;
    const pending=JSON.stringify(s.stories[id]),source=JSON.parse(FB.save.serialize());FB.save.restore(source);
    const noAI=JSON.stringify(FB.state.stories[id])===pending&&FB.state.stories[id].members[0].status==='invited';
    FB.stories.get(id).day(FB.state,FB.state.stories[id]);
    const accepted=FB.state.stories[id].members[0].status==='accepted';
    return {first:first,again:again,stale:stale,noAI:noAI,accepted:accepted};
  });
  expect(result).toEqual({first:true,again:true,stale:true,noAI:true,accepted:true});
});

test('strict records reject forged consent, unknown fields, missing attachments and future chronology without adoption',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.householdParties,id='upland_party',actor=s.player.charId;
    const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
    function act(action,person,care){return P.commit(s,P.review(s,id,action,actor,person,care));}
    act('invite',actor);act('accept',actor);act('invite',child.id,actor);act('accept',child.id,actor);
    const source=JSON.parse(FB.save.serialize());
    const changes=[function(t){t.version=2;},function(t){t.extra=true;},function(t){t.partyId='absent';},
      function(t){t.members.push(t.members[0]);},function(t){t.members[1].consentActorId=child.id;},
      function(t){t.members[1].caregiverId=child.id;},function(t){t.members[1].endTurn++;},
      function(t){t.members[0].decidedTurn=999999;},function(t){t.members[1].kind='adult';},
      function(t){t.members[0].status='withdrawn';},function(t){t.members[0].carrier='camp';},
      function(t,data){delete data.state.stories[id];},function(t,data){delete data.state.stories;},
      function(t){t.status='closed';t.closeReason='finished';t.closedTurn=-1;},
      function(t){t.actorId=child.id;t.householdId=child.id;},function(t){t.members[1].personId='__proto__';}];
    return changes.map(function(change) {
      const saved=JSON.parse(JSON.stringify(source));change(saved.state.stories[id],saved);
      const before=JSON.stringify(FB.state),detached=JSON.stringify(saved),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try{FB.save.restore(saved);}catch(error){rejected=true;}
      return rejected&&before===JSON.stringify(FB.state)&&detached===JSON.stringify(saved)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(16).fill(true));
});

test('a changed same-name imported policy invalidates its saved definition fingerprint',async function ({page},info) {
  await start(page,info,'harbor');
  const source=await page.evaluate(function(){return JSON.parse(FB.save.serialize());});
  const changed=JSON.parse(JSON.stringify(examples.harbor));changed.storyInstances.harbor_party.invitationDays++;
  await start(page,info,'harbor',changed);
  const result=await page.evaluate(function (saved) {
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try{FB.save.restore(saved);}catch(error){rejected=true;}
    return rejected&&before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
  },source);
  expect(result).toBe(true);
});

test('the same imported world and start seed produce the same named invitations and consent',async function ({page},info) {
  await start(page,info,'harbor');
  async function decide() {
    return page.evaluate(function(){
      const s=FB.state,P=FB.householdParties,id='harbor_party',actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
      P.commit(s,P.review(s,id,'invite',actor,actor));P.commit(s,P.review(s,id,'accept',actor,actor));
      P.commit(s,P.review(s,id,'invite',actor,spouse.id));FB.stories.get(id).day(s,s.stories[id]);
      return JSON.stringify([s.stories[id],FB.getRngState(),FB.getUidCounter()]);
    });
  }
  const first=await decide();
  await beginBookmark(page,info,'harbor_world','harbor_household');
  expect(await decide()).toBe(first);
});

test('named consent reviews use the shared sheet and Escape leaves the invitation uncommitted',async function ({page},info) {
  await start(page,info,'harbor');
  await page.evaluate(function(){FB.ui.showStorySheet('harbor_party');});
  const invite=page.locator('[data-story-choice]').filter({hasText:'Invite'}).first();
  const key=await invite.getAttribute('data-story-choice');
  await invite.click();
  await expect(page.locator('#gm-body')).toContainText('grants no travel or admission');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice]').filter({hasText:'Invite'}).first()).toBeVisible();
  expect(await page.evaluate(function(){return FB.state.stories.harbor_party.members.length;})).toBe(0);
  expect(await page.evaluate(function(){return document.activeElement.getAttribute('data-story-choice');})).toBe(key);
});


async function prepareCamp(page,info,label,modified,admit) {
  await start(page,info,label,modified || camps[label]);
  return page.evaluate(function(input) {
    const s=FB.state,P=FB.householdParties,E=FB.expeditionParticipants,id=input.label+'_party',pid=input.label+'_participation';
    const actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0];
    function decide(action,who,person,care){if(!P.commit(s,P.review(s,id,action,who,person,care)))throw new Error('Named consent failed: '+action);}
    decide('invite',actor,actor);decide('accept',actor,actor);decide('invite',actor,spouse.id);
    FB.stories.get(id).day(s,s.stories[id]);
    if(input.label==='upland'){
      const child=FB.householdMembers(s).filter(function(c){return FB.ageOf(c,s.date.year)<16;})[0];
      decide('invite',actor,child.id,actor);decide('accept',actor,child.id,actor);
    }
    if(!E.commit(s,E.review(s,pid,'request',actor,'guest')))throw new Error('Personal request failed');
    FB.stories.get(pid).day(s,s.stories[pid]);
    if(s.stories[pid].status!=='active')throw new Error('Personal admission failed');
    if(input.admit){decide('request_camp',actor);FB.stories.get(id).day(s,s.stories[id]);}
    return {actor:actor,spouse:spouse.id};
  },{label:label,admit:admit!==false});
}

for(const label of ['harbor','upland']) {
  test(label+' imports real civilian camp places separate from personal admission and family consent',async function({page},info) {
    await prepareCamp(page,info,label,null,false);
    const result=await page.evaluate(function(label) {
      const s=FB.state,P=FB.householdParties,id=label+'_party',actor=s.player.charId,t=s.stories[id];
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=P.review(s,id,'request_camp',actor),pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const conserved=JSON.stringify([s.population,s.armies,s.owner,s.holder,Object.keys(s.chars),s.player.gold]);
      const requested=P.commit(s,q),pending=t.journey.status==='requested'&&t.journey.carrier.acceptedTurn===null;
      const impersonation=!P.commit(s,P.review(s,id,'accept_camp',actor));
      const saved=JSON.parse(FB.save.serialize()),pendingFacts=JSON.stringify(t);
      FB.save.restore(saved);
      const noRestoreConsent=pendingFacts===JSON.stringify(FB.state.stories[id]);
      const state=FB.state,record=state.stories[id],module=FB.stories.get(id),old=JSON.stringify([state.population,state.armies,state.owner,state.holder,Object.keys(state.chars),state.player.gold]);
      module.day(state,record);
      return {pure:pure,requested:requested,pending:pending,impersonation:impersonation,noRestoreConsent:noRestoreConsent,
        active:record.journey.status==='active',version:record.version,exact:record.journey.members.length===2,
        conserved:conserved===old&&old===JSON.stringify([state.population,state.armies,state.owner,state.holder,Object.keys(state.chars),state.player.gold]),
        location:record.journey.members.every(function(m){return FB.characterLocation(state,state.chars[m.personId])===state.player.provinceId;}),
        noHomeLabor:record.journey.members.every(function(m){return !FB.householdWorkers(state).some(function(c){return c.id===m.personId;});}),
        bounded:record.journey.carrier.endTurn<=state.stories[label+'_participation'].endTurn,
        noSettle:FB.travelSettlementEligible(state)!==true,none:FBDATA.techImpactReviews.features.household_party_camp_carriage.mode};
    },label);
    expect(result).toEqual({pure:true,requested:true,pending:true,impersonation:true,noRestoreConsent:true,active:true,version:3,exact:true,
      conserved:true,location:true,noHomeLabor:true,bounded:true,noSettle:true,none:'none'});
  });
}

test('camp declarations reject unsupported roles, references, capacities, terms and policies without publishing',async function({page},info) {
  await openGame(page,info);
  const results=await page.evaluate(function(source) {
    const changes=[function(d){d.capacity=0;},function(d){d.capacity=33;},function(d){d.termDays=0;},function(d){d.termDays=1441;},
      function(d){d.acceptance='automatic';},function(d){d.extra=true;},function(d){d.participationId='missing';},
      function(d,input){input.storyInstances.harbor_participation.roles=[{id:'guard',kind:'combatant',memberId:'quay_people'}];}];
    return changes.map(function(change){const input=JSON.parse(JSON.stringify(source));change(input.storyInstances.harbor_party.journey,input);
      const before=JSON.stringify([FB.state,FBDATA,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0&&before===JSON.stringify([FB.state,FBDATA,input])&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  },camps.harbor);
  expect(results).toEqual(Array(8).fill(true));
});

test('closed family acceptance refuses a requested roster without revoking family consent or creating carriage',async function({page},info) {
  const input=JSON.parse(JSON.stringify(camps.harbor));input.storyInstances.harbor_party.journey.acceptance='closed';
  await prepareCamp(page,info,'harbor',input,false);
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,t=s.stories.harbor_party,actor=s.player.charId;
    const requested=P.commit(s,P.review(s,'harbor_party','request_camp',actor));
    const before=JSON.stringify([s.population,s.armies,s.owner,s.holder,s.player.gold]);
    FB.stories.get('harbor_party').day(s,t);
    const ended=JSON.stringify(t);FB.stories.get('harbor_party').day(s,t);
    return {requested:requested,refused:t.journey.status==='interrupted'&&t.journey.carrier.acceptedTurn===null,
      consent:t.members.every(function(m){return m.status==='accepted';}),once:ended===JSON.stringify(t),
      unchanged:before===JSON.stringify([s.population,s.armies,s.owner,s.holder,s.player.gold]),
      personalPreserved:!!s.player.travel&&s.stories.harbor_participation.status==='active'&&t.journey.members.some(function(m){return m.personId===actor&&m.status==='released';})};
  });
  expect(result).toEqual({requested:true,refused:true,consent:true,once:true,unchanged:true,personalPreserved:true});
});

test('camp and field checkpoints stay separate; field destruction does not erase living companions or the camp',async function({page},info) {
  await prepareCamp(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,t=s.stories.harbor_party,b=t.journey.carrier,m=FB.mobile.migration(s,b.realmId),h=FB.mobile.host(s,b.realmId);
    h.at='harbor_ridge';h.mobileCourt=false;
    const separate=t.journey.members.every(function(v){return P.journeys.location(s,v.personId)===m.at;});
    s.armies=s.armies.filter(function(a){return a.id!==h.id;});
    // Stage only a committed canonical migration checkpoint, independently of the destroyed field host.
    m.at='harbor_gardens';FB.stories.get('harbor_party').day(s,t);
    return {separate:separate,active:t.journey.status==='active',reached:t.journey.members.every(function(v){return v.lastPlace===m.at&&FB.characterLocation(s,s.chars[v.personId])===m.at;}),
      home:t.journey.members.every(function(v){return FB.characterResidence(s,s.chars[v.personId])==='harbor_quay';}),
      privateHome:s.player.provinceId==='harbor_quay'};
  });
  expect(result).toEqual({separate:true,active:true,reached:true,home:true,privateHome:true});
});

test('stale host acceptance, custody, remote relatives and another carrier reject without spending or moving',async function({page},info) {
  await prepareCamp(page,info,'harbor',null,false);
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='harbor_party',actor=base.player.charId,spouse=FB.spousesOf(base,base.chars[actor])[0].id;
    const requestFailures=[function(s){s.chars[spouse].captive=true;},function(s){s.chars[spouse].householdResidenceId='harbor_ridge';},
      function(s){s.chars[spouse].travel={currentId:'harbor_quay'};},function(s){s.stories.harbor_participation.status='suspended';}].map(function(change){
      const s=JSON.parse(JSON.stringify(base)),old=P.review(s,id,'request_camp',actor);change(s);const before=JSON.stringify(s);
      return !P.commit(s,old)&&!P.review(s,id,'request_camp',actor).allowed&&before===JSON.stringify(s);});
    P.commit(base,P.review(base,id,'request_camp',actor));
    const b=base.stories[id].journey.carrier,q=P.review(base,id,'accept_camp',b.leaderId);
    base.chars[spouse].captive=true;const before=JSON.stringify(base);
    return requestFailures.concat(!P.commit(base,q)&&!P.review(base,id,'accept_camp',b.leaderId).allowed&&before===JSON.stringify(base));
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('companion capacity is counted across requested bindings and released when that request closes',async function({page},info) {
  const input=JSON.parse(JSON.stringify(camps.harbor));input.storyInstances.harbor_party.journey.capacity=1;
  const extra=JSON.parse(JSON.stringify(input.storyInstances.harbor_party));extra.id='second_party';
  input.storyInstances.second_party=extra;input.startScenarios[0].tracks.push('second_party');
  input.startScenarios[0].trackLocations.second_party=['harbor_quay'];
  await prepareCamp(page,info,'harbor',input,false);
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,actor=s.player.charId;
    const first=P.commit(s,P.review(s,'harbor_party','request_camp',actor));
    const b=s.stories.harbor_party.journey.carrier;
    const bad=JSON.parse(FB.save.serialize());
    // A forged second saved binding may not reserve the same named people or spend extra places.
    bad.state.stories.second_party=JSON.parse(JSON.stringify(bad.state.stories.harbor_party));
    bad.state.stories.second_party.partyId='second_party';
    const before=JSON.stringify(s);let rejected=false;try{FB.save.restore(bad);}catch(error){rejected=true;}
    const atomic=rejected&&before===JSON.stringify(s),closed=P.commit(s,P.review(s,'harbor_party','decline_camp',b.leaderId));
    return {first:first,rejected:atomic,closed:closed,
      released:s.stories.harbor_party.journey.status==='interrupted'};
  });
  expect(result).toEqual({first:true,rejected:true,closed:true,released:true});
});

test('changed command generation, expiry, missing migration and death interrupt once at the real checkpoint',async function({page},info) {
  await prepareCamp(page,info,'upland');
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='upland_party',b=base.stories[id].journey.carrier;
    FB.mobile.migration(base,b.realmId).at='dune_pass';FB.stories.get(id).day(base,base.stories[id]);
    return ['command','expiry','migration','death','custody'].map(function(kind){
      const s=JSON.parse(JSON.stringify(base)),t=s.stories[id],binding=JSON.stringify(t.journey.carrier);
      if(kind==='command'){
        const issuer=FB.bookmarkActor(s,'dune_authorizer'),deputy=FB.bookmarkActor(s,'dune_deputy');
        if(!FB.mobile.commit(s,FB.mobile.reviewCommand(s,{realmId:b.realmId,commandId:FB.mobile.row(s,b.realmId).command.id,
          action:'appoint',candidateId:deputy.id,actor:{kind:'character',id:issuer.id}})))throw new Error('Command replacement failed');
      }
      if(kind==='expiry')s.turn=t.journey.carrier.endTurn;
      if(kind==='migration')s.authority.migrations=s.authority.migrations.filter(function(m){return m.id!==b.migrationId;});
      if(kind==='death')s.chars[t.actorId].dead=true;
      if(kind==='custody')s.chars[t.actorId].captive=true;
      FB.stories.get(id).day(s,t);const once=JSON.stringify(t);FB.stories.get(id).day(s,t);
      return {interrupted:t.journey.status==='interrupted',once:once===JSON.stringify(t),binding:binding===JSON.stringify(t.journey.carrier),
        checkpoint:t.journey.members.every(function(m){return m.lastPlace==='dune_pass'&&m.status!=='following';}),
        noRelocation:s.player.provinceId==='dune_well'};
    });
  });
  expect(result).toEqual(Array(5).fill({interrupted:true,once:true,binding:true,checkpoint:true,noRelocation:true}));
});

test('care-preserving partial separation leaves excluded relatives at the camp checkpoint and return pays once',async function({page},info) {
  await prepareCamp(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party',t=s.stories[id],actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0].id;
    const b=t.journey.carrier;FB.mobile.migration(s,b.realmId).at='dune_pass';FB.stories.get(id).day(s,t);
    const q=P.review(s,id,'separate_person',actor,actor),care=q.people.length===2,split=P.commit(s,q);
    const checkpoint=t.journey.members.every(function(m){return m.status==='withdrawn'&&m.lastPlace==='dune_pass';});
    const original=JSON.stringify(t.journey.carrier),gold=s.player.gold;
    const road=P.review(s,id,'camp_return',actor),back=P.commit(s,road),paid=gold-s.player.gold===road.cost&&road.cost>0,again=!P.commit(s,road);
    const save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    const state=FB.state;for(let i=0;i<16&&state.player.travel;i++){state.turn++;state.player.travel.legDaysLeft=1;FB.travelTick(state);}
    return {care:care,split:split,checkpoint:checkpoint,back:back,paid:paid,again:again,excluded:road.excluded.includes(spouse),
      binding:original===JSON.stringify(state.stories[id].journey.carrier),
      returned:state.stories[id].journey.members.every(function(m){return m.status==='returned';}),
      home:!state.player.travel&&state.player.provinceId==='dune_well'&&FB.characterResidence(state,state.chars[spouse])==='dune_well'};
  });
  expect(result).toEqual({care:true,split:true,checkpoint:true,back:true,paid:true,again:true,excluded:true,binding:true,returned:true,home:true});
});

for(const source of ['camp','ordinary']) {
  test(source+' succession requires a new explicit road for an already present named survivor and never enrolls an absent heir',async function({page},info) {
    if(source==='camp')await prepareCamp(page,info,'harbor');
    else {await prepareJourney(page,info,'harbor');await page.evaluate(function(){const s=FB.state,P=FB.householdParties;P.commit(s,P.review(s,'harbor_party','depart_journey',s.player.charId));s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);});}
    const result=await page.evaluate(function(source){
      const s=FB.state,P=FB.householdParties,id='harbor_party',t=s.stories[id],founder=s.player.charId,spouse=FB.spousesOf(s,s.chars[founder])[0].id;
      if(source==='camp'){FB.mobile.migration(s,t.journey.carrier.realmId).at='harbor_gardens';FB.stories.get(id).day(s,t);}
      const original=JSON.stringify(t.journey.carrier),at=P.journeys.location(s,spouse),population=JSON.stringify(s.population);
      s.chars[founder].dead=true;FB.stories.get(id).day(s,t);
      // Stage the succession boundary without adopting a new carrier or moving any named person.
      s.player.charId=spouse;s.player.dead=false;s.player.travel=null;
      if(source==='camp'){const ep=s.stories.harbor_participation;ep.status='interrupted';ep.reason='person';ep.endedTurn=s.turn;ep.locationHeld=false;}
      FB.stories.get(id).day(s,t);
      const noAuto=!s.player.travel&&P.journeys.location(s,spouse)===at;
      const before=JSON.stringify(s),q=P.review(s,id,'survivor_return',spouse),pure=before===JSON.stringify(s),gold=s.player.gold;
      const bad=JSON.parse(JSON.stringify(s)),child=FB.householdMembers(bad).filter(function(c){return c.id!==spouse&&c.id!==founder;})[0];
      let absent=true;if(child){bad.player.charId=child.id;absent=!P.review(bad,id,'survivor_return',child.id).allowed;}
      const applied=P.commit(s,q),once=!P.commit(s,q),paid=gold-s.player.gold===q.cost&&q.cost>0;
      const notEnrolled=t.journey.members.length===2&&t.journey.recovery.people.length===1&&t.journey.recovery.people[0]===spouse;
      const save=JSON.parse(FB.save.serialize()),record=JSON.stringify(t);FB.save.restore(save);
      const restored=record===JSON.stringify(FB.state.stories[id]);
      for(let i=0;i<16&&FB.state.player.travel;i++){FB.state.turn++;FB.state.player.travel.legDaysLeft=1;FB.travelTick(FB.state);}
      return {noAuto:noAuto,pure:pure,absent:absent,applied:applied,once:once,paid:paid,notEnrolled:notEnrolled,restored:restored,
        binding:original===JSON.stringify(FB.state.stories[id].journey.carrier),
        returned:!FB.state.player.travel&&P.journeys.location(FB.state,spouse)===null,population:population===JSON.stringify(FB.state.population),
        none:FBDATA.techImpactReviews.features.household_party_survivor_recovery.mode};
    },source);
    expect(result).toEqual({noAuto:true,pure:true,absent:true,applied:true,once:true,paid:true,notEnrolled:true,restored:true,binding:true,returned:true,population:true,none:'none'});
  });
}

test('strict camp saves reject missing records, forged identities, terms, parents, generations and carriers before adoption',async function({page},info) {
  await prepareCamp(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,id='upland_party',source=JSON.parse(FB.save.serialize()),record=JSON.stringify(s.stories[id]);
    FB.save.restore(source);const matching=record===JSON.stringify(FB.state.stories[id]);
    const changes=[function(j){j.schema=1;},function(j){j.extra=true;},function(j){j.carrier.migrationId='absent';},
      function(j){j.carrier.leaderId='absent';},function(j){j.carrier.generation=999999;},function(j){j.carrier.participationId='absent';},
      function(j){j.carrier.acceptedTurn=null;},function(j){j.carrier.endTurn=999999;},function(j){j.members.push(j.members[0]);},
      function(j){j.members[1].caregiverId=j.members[1].personId;},function(j){j.members[1].lastPlace='missing';},
      function(j,d){delete d.state.player.travel;},function(j,d){delete d.state.stories[id];},
      function(j,d){delete d.state.stories.upland_participation;},function(j){j.recovery={actorId:'absent'};}];
    return {matching:matching,rejected:changes.map(function(change){const data=JSON.parse(JSON.stringify(source));change(data.state.stories[id].journey,data);
      const before=JSON.stringify(FB.state),detached=JSON.stringify(data),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
      try{FB.save.restore(data);}catch(error){failed=true;}
      return failed&&before===JSON.stringify(FB.state)&&detached===JSON.stringify(data)&&rng===FB.getRngState()&&uid===FB.getUidCounter();})};
  });
  expect(result).toEqual({matching:true,rejected:Array(15).fill(true)});
});

test('camp recovery cancellation preserves real partial arrival and rechecks funds and custody before a new road',async function({page},info) {
  await prepareCamp(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='harbor_party',t=s.stories[id],actor=s.player.charId;
    FB.mobile.migration(s,t.journey.carrier.realmId).at='harbor_ridge';FB.stories.get(id).day(s,t);
    FB.expeditionParticipants.commit(s,FB.expeditionParticipants.review(s,'harbor_participation','leave',actor));FB.stories.get(id).day(s,t);
    const first=P.commit(s,P.review(s,id,'camp_return',actor));s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
    const at=s.player.travel.currentId;FB.travelCancel(s,null,true);
    const partial=at==='harbor_gardens'&&t.journey.members.every(function(m){return m.status==='separated'&&m.lastPlace===at;});
    const old=P.review(s,id,'camp_return',actor);s.player.gold=0;const poor=!P.commit(s,old)&&!P.review(s,id,'camp_return',actor).allowed;
    s.player.gold=100;s.chars[actor].captive=true;const custody=!P.review(s,id,'camp_return',actor).allowed;s.chars[actor].captive=false;
    const again=P.commit(s,P.review(s,id,'camp_return',actor));
    const source=JSON.parse(FB.save.serialize());source.state.stories[id].journey.recovery.actorId='missing';
    const before=JSON.stringify(s);let rejected=false;try{FB.save.restore(source);}catch(error){rejected=true;}
    return {first:first,partial:partial,poor:poor,custody:custody,again:again,rejected:rejected&&before===JSON.stringify(s),
      noSettle:FB.travelSettlementEligible(s)!==true};
  });
  expect(result).toEqual({first:true,partial:true,poor:true,custody:true,again:true,rejected:true,noSettle:true});
});

test('camp review Escape retains focus and leaves named request uncommitted',async function({page},info) {
  await prepareCamp(page,info,'harbor',null,false);
  await page.evaluate(function(){FB.ui.showStorySheet('harbor_party');});
  const button=page.locator('[data-story-choice]').filter({hasText:'Request named family places at camp'});
  const key=await button.getAttribute('data-story-choice');await button.click();
  await expect(page.locator('#gm-body')).toContainText('Companion places');
  await expect(page.locator('#gm-body')).toContainText('separate personal admission');
  await page.keyboard.press('Escape');await expect(button).toBeVisible();
  expect(await page.evaluate(function(){return {version:FB.state.stories.harbor_party.version,key:document.activeElement.getAttribute('data-story-choice')};})).toEqual({version:1,key:key});
});


test('a changed current commander invalidates a pending family acceptance without renewing original terms',async function({page},info) {
  await prepareCamp(page,info,'upland',null,false);
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party',actor=s.player.charId;
    P.commit(s,P.review(s,id,'request_camp',actor));const t=s.stories[id],b=t.journey.carrier,old=JSON.stringify(b);
    const quote=P.review(s,id,'accept_camp',b.leaderId),issuer=FB.bookmarkActor(s,'dune_authorizer'),deputy=FB.bookmarkActor(s,'dune_deputy');
    const changed=FB.mobile.commit(s,FB.mobile.reviewCommand(s,{realmId:b.realmId,commandId:FB.mobile.row(s,b.realmId).command.id,
      action:'appoint',candidateId:deputy.id,actor:{kind:'character',id:issuer.id}}));
    const before=JSON.stringify(s),stale=!P.commit(s,quote)&&before===JSON.stringify(s);
    FB.stories.get(id).day(s,t);
    return {changed:changed,stale:stale,interrupted:t.journey.status==='interrupted',noAcceptance:b.acceptedTurn===null,
      original:old===JSON.stringify(b),noNewCommander:!P.review(s,id,'accept_camp',deputy.id).allowed};
  });
  expect(result).toEqual({changed:true,stale:true,interrupted:true,noAcceptance:true,original:true,noNewCommander:true});
});

test('an adult can withdraw and personally rejoin; another person cannot renew that consent or retrieve a remote relative',async function({page},info) {
  await prepareCamp(page,info,'harbor');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='harbor_party',t=s.stories[id],actor=s.player.charId,spouse=FB.spousesOf(s,s.chars[actor])[0].id;
    const split=P.commit(s,P.review(s,id,'separate_person',spouse,spouse));
    const impersonation=!P.review(s,id,'rejoin_person',actor,spouse).allowed;
    const rejoined=P.commit(s,P.review(s,id,'rejoin_person',spouse,spouse));
    P.commit(s,P.review(s,id,'separate_person',spouse,spouse));
    FB.mobile.migration(s,t.journey.carrier.realmId).at='harbor_gardens';FB.stories.get(id).day(s,t);
    const remote=!P.review(s,id,'rejoin_person',spouse,spouse).allowed&&P.journeys.location(s,spouse)==='harbor_quay';
    FB.expeditionParticipants.commit(s,FB.expeditionParticipants.review(s,'harbor_participation','leave',actor));FB.stories.get(id).day(s,t);
    const road=P.review(s,id,'camp_return',actor);
    return {split:split,impersonation:impersonation,rejoined:rejoined,remote:remote,
      excluded:!road.people.includes(spouse)&&road.excluded.includes(spouse),actual:P.journeys.location(s,actor)==='harbor_gardens'};
  });
  expect(result).toEqual({split:true,impersonation:true,rejoined:true,remote:true,excluded:true,actual:true});
});

test('separating a dependent reviews the whole actual caregiver group and custody prevents their carriage',async function({page},info) {
  await prepareCamp(page,info,'upland');
  const result=await page.evaluate(function(){
    const base=FB.state,P=FB.householdParties,id='upland_party',actor=base.player.charId,child=base.stories[id].journey.members.filter(function(m){return m.caregiverId;})[0].personId;
    const q=P.review(base,id,'separate_person',actor,child),care=q.people.includes(actor)&&q.people.includes(child);
    const s=JSON.parse(JSON.stringify(base));s.chars[child].captive=true;
    const before=s.stories[id].journey.members.map(function(m){return m.lastPlace;});
    FB.mobile.migration(s,s.stories[id].journey.carrier.realmId).at='dune_pass';
    FB.stories.get(id).day(s,s.stories[id]);
    return {care:care,interrupted:s.stories[id].journey.status==='interrupted',
      noInventedMotion:s.stories[id].journey.members.every(function(m,i){return m.lastPlace===before[i]&&m.status!=='following';}),
      noPaidRoad:!P.review(s,id,'camp_return',actor).allowed};
  });
  expect(result).toEqual({care:true,interrupted:true,noInventedMotion:true,noPaidRoad:true});
});

test('changed same-name family terms reject old saves and a matching start seed replays exact requests',async function({page},info) {
  await prepareCamp(page,info,'harbor');
  const source=await page.evaluate(function(){return JSON.parse(FB.save.serialize());});
  const changed=JSON.parse(JSON.stringify(camps.harbor));changed.storyInstances.harbor_party.journey.termDays--;
  await prepareCamp(page,info,'harbor',changed);
  expect(await page.evaluate(function(saved){const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
    try{FB.save.restore(saved);}catch(error){failed=true;}
    return failed&&before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();},source)).toBe(true);
  const first=await page.evaluate(function(){return JSON.stringify([FB.state.stories.harbor_party,FB.state.player.travel,FB.getRngState(),FB.getUidCounter()]);});
  await prepareCamp(page,info,'harbor',changed);
  expect(await page.evaluate(function(){return JSON.stringify([FB.state.stories.harbor_party,FB.state.player.travel,FB.getRngState(),FB.getUidCounter()]);})).toBe(first);
});


test('a formerly dependent survivor must reach adulthood and explicitly consent to a new personal road',async function({page},info) {
  await prepareJourney(page,info,'upland');
  const result=await page.evaluate(function(){
    const s=FB.state,P=FB.householdParties,id='upland_party',founder=s.player.charId;
    P.commit(s,P.review(s,id,'depart_journey',founder));s.turn++;s.player.travel.legDaysLeft=1;FB.travelTick(s);
    const t=s.stories[id],child=t.journey.members.filter(function(m){return m.caregiverId;})[0].personId;
    const at=P.journeys.location(s,child),original=JSON.stringify(t.journey.carrier);
    s.chars[founder].dead=true;FB.stories.get(id).day(s,t);s.player.charId=child;s.player.dead=false;s.player.travel=null;
    FB.stories.get(id).day(s,t);
    const underage=!P.review(s,id,'survivor_return',child).allowed;
    const years=s.chars[child].born+16-s.date.year;s.date.year+=years;s.turn+=years*360;
    const before=JSON.stringify(s),q=P.review(s,id,'survivor_return',child),pure=before===JSON.stringify(s);
    const done=P.commit(s,q),explicit=q.people.length===1&&q.people[0]===child;
    const saved=JSON.parse(FB.save.serialize()),record=JSON.stringify(t);FB.save.restore(saved);
    return {underage:underage,pure:pure,done:done,explicit:explicit,restored:record===JSON.stringify(FB.state.stories[id]),
      original:original===JSON.stringify(FB.state.stories[id].journey.carrier),actual:FB.characterLocation(FB.state,FB.state.chars[child])===at};
  });
  expect(result).toEqual({underage:true,pure:true,done:true,explicit:true,restored:true,original:true,actual:true});
});
