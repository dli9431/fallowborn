'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/personal-expedition-harbor.json'),
  upland:require('../fixtures/authoring/personal-expedition-upland.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/travel.js','data/technology.js',
  'js/story_expedition_participation.js','js/stories.js','js/story_household.js','js/story_household_observer.js',
  'js/travel.js','js/mobile_confederations.js','js/mobile_command.js','js/federates.js','js/armies.js',
  'js/mods.js','js/world.js','js/starts.js','js/bookmark_setup.js','js/station.js','js/governments.js',
  'js/treasury.js','js/model.js','js/authority.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/main.js']);

async function start(page,info,label,modified) {
  const prefix=label==='upland'?'dune':'harbor';
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'personal-expedition-'+label+'.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(modified))} :
    path.resolve(__dirname,'../fixtures/authoring/personal-expedition-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const label of ['harbor','upland']) {
  test(label+' imports individual terms and delegates host acceptance without demographic or religious effects',async function ({page},info) {
    await start(page,info,label);
    const result=await page.evaluate(function (label) {
      const s=FB.state,P=FB.expeditionParticipants,id=label+'_participation',t=s.stories[id],module=FB.stories.get(id);
      const d=module.declaration,rid=d.host.realmId,r=FB.mobile.row(s,rid),h=FB.mobile.host(s,rid);
      function inventory() {return JSON.stringify([r.members,r.accounting,h.men,h.units,h.mobileRoster,r.food,
        FB.treasuryAvailable(s,rid),s.player.gold,s.player.provinceId,s.owner,s.holder,s.greatHolyWar||null]);}
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),old=inventory();
      const q=P.review(s,id,'request',s.player.charId,d.roles[0].id);
      const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const requested=P.commit(s,q),pending=t.status==='pending'&&t.acceptedTurn===null;
      const self=P.commit(s,P.review(s,id,'accept',s.player.charId));
      module.day(s,t);
      const active=t.status==='active',slot=t.slot,accepted=t.acceptedTurn===s.turn;
      const noControl=!FB.playerControlsHost(s,h),noSettlement=FB.travelSettlementEligible(s)!==true,
        noOtherTravel=FB.travelEligible(s)!==true,noReturn=FB.travelReturnEligible(s)!==true;
      const save=FB.save.serialize();FB.save.restore(JSON.parse(save));
      return {pure: pure,requested:requested,pending:pending,self:self,active:active,accepted:accepted,
        unchanged:old===inventory(),noControl:noControl,noSettlement:noSettlement,noOtherTravel:noOtherTravel,noReturn:noReturn,
        role:t.roleId,slot:slot,term:t.endTurn-t.requestedTurn,
        restored:JSON.stringify(t)===JSON.stringify(FB.state.stories[id]),
        carrier:FB.state.player.travel.participationId===id,none:FBDATA.techImpactReviews.features.personal_expedition_admission.mode};
    },label);
    expect(result).toMatchObject({pure:true,requested:true,pending:true,self:false,active:true,accepted:true,unchanged:true,
      noControl:true,noSettlement:true,noOtherTravel:true,noReturn:true,restored:true,carrier:true,none:'none'});
    expect(result.term).toBe(label==='harbor'?30:12);
    expect(result.slot).toBe(label==='harbor'?null:1);
  });
}

test('detached malformed imports reject without publishing data, state, identities or randomness',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function(d){d.capacity=33;},function(d){d.termDays=0;},function(d){d.termDays=1441;},
      function(d){d.extra=true;},function(d){d.acceptance='everyone';},function(d){d.host.realmId='dune_oasis';},
      function(d){d.host.kind='character';},function(d){d.roles[0].memberId='absent';},
      function(d){d.roles[0].kind='commander';},function(d){d.roles.push(d.roles[0]);},
      function(d){d.roles[0].id='leave';},function(d){d.roles[0].wages=5;}];
    return changes.map(function(change) {
      const input=JSON.parse(JSON.stringify(source));change(input.storyInstances.upland_participation);
      const before=JSON.stringify([FB.state,FBDATA,input]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && before===JSON.stringify([FB.state,FBDATA,input]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.upland);
  expect(result).toEqual(Array(12).fill(true));
});

test('requests require actual stationary camp presence, freedom and a compatible counted combat position',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const base=FB.state,id='upland_participation',d=FB.stories.get(id).declaration;
    const changes=[function(s){s.player.provinceId='dune_pass';},function(s){s.player.flags.in_prison=true;},
      function(s){s.chars[s.player.charId].captive=true;},function(s){s.chars[s.player.charId].born=s.date.year-10;},
      function(s){s.player.travel={currentId:'dune_well'};},function(s){FB.mobile.host(s,d.host.realmId).mobileRoster=[];},
      function(s){FB.mobile.host(s,d.host.realmId).moveLeft=3;},
      function(s){s.chars[s.player.charId].religion='catholic';}];
    return changes.map(function(change) {
      const s=JSON.parse(JSON.stringify(base));change(s);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=FB.expeditionParticipants.review(s,id,'request',s.player.charId,d.roles[0].id);
      return !q.allowed && !FB.expeditionParticipants.commit(s,q) && before===JSON.stringify(s) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(8).fill(true));
});

test('a closed host policy refuses the same reviewed request without payment or carriage',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));input.storyInstances.harbor_participation.acceptance='closed';
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const s=FB.state,id='harbor_participation',P=FB.expeditionParticipants,t=s.stories[id],gold=s.player.gold;
    const requested=P.commit(s,P.review(s,id,'request',s.player.charId,'guest'));
    FB.stories.get(id).day(s,t);
    return {requested:requested,status:t.status,accepted:t.acceptedTurn,travel:s.player.travel,gold:s.player.gold===gold};
  });
  expect(result).toEqual({requested:true,status:'declined',accepted:null,travel:null,gold:true});
});

test('one protagonist cannot reserve two separate admission declarations',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  input.storyInstances.second_participation=Object.assign({},input.storyInstances.harbor_participation,{id:'second_participation'});
  input.startScenarios[0].tracks.push('second_participation');
  input.startScenarios[0].trackLocations.second_participation=['harbor_quay'];
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.expeditionParticipants,actor=s.player.charId;
    const first=P.commit(s,P.review(s,'harbor_participation','request',actor,'guest'));
    const second=P.review(s,'second_participation','request',actor,'guest'),before=JSON.stringify(s);
    const refused=!second.allowed&&!P.commit(s,second)&&before===JSON.stringify(s);
    const cancelled=P.commit(s,P.review(s,'harbor_participation','leave',actor));
    const released=P.commit(s,P.review(s,'second_participation','request',actor,'guest'));
    return {first:first,refused:refused,cancelled:cancelled,released:released};
  });
  expect(result).toEqual({first:true,refused:true,cancelled:true,released:true});
});

test('camp and field locations remain distinct and field defeat preserves civilian admission',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,id='harbor_participation',P=FB.expeditionParticipants,t=s.stories[id],module=FB.stories.get(id),rid=module.declaration.host.realmId;
    P.commit(s,P.review(s,id,'request',s.player.charId,'guest'));module.day(s,t);
    const m=FB.mobile.migration(s,rid),h=FB.mobile.host(s,rid),home=s.player.provinceId;
    h.at='harbor_ridge';h.mobileCourt=false;
    const separate=FB.travelLocation(s).id===m.at;
    s.armies=s.armies.filter(function(a){return a.id!==h.id;});module.day(s,t);
    const survived=t.status==='active';
    // Stage a committed camp checkpoint; no path simulation or battle is claimed.
    m.at='harbor_gardens';module.day(s,t);
    const reached=FB.travelLocation(s).id,privateHome=s.player.provinceId===home;
    P.commit(s,P.review(s,id,'leave',s.player.charId));
    return {separate:separate,survived:survived,reached:reached,privateHome:privateHome,status:t.status,
      leftAt:FB.travelLocation(s).id,stillAway:!!s.player.travel};
  });
  expect(result).toEqual({separate:true,survived:true,reached:'harbor_gardens',privateHome:true,status:'left',leftAt:'harbor_gardens',stillAway:true});
});

test('commander replacement invalidates a review and suspends admission until both parties confirm',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.expeditionParticipants,id='upland_participation',t=s.stories[id],module=FB.stories.get(id),rid=module.declaration.host.realmId;
    P.commit(s,P.review(s,id,'request',s.player.charId,'guard'));module.day(s,t);
    const deadline=t.endTurn,old=P.review(s,id,'leave',s.player.charId),issuer=FB.bookmarkActor(s,'dune_authorizer'),deputy=FB.bookmarkActor(s,'dune_deputy');
    const changed=FB.mobile.commit(s,FB.mobile.reviewCommand(s,{realmId:rid,commandId:FB.mobile.row(s,rid).command.id,
      action:'appoint',candidateId:deputy.id,actor:{kind:'character',id:issuer.id}}));
    const stale=!P.commit(s,old);module.day(s,t);const suspended=t.status==='suspended';
    const confirmed=P.commit(s,P.review(s,id,'confirm',s.player.charId));module.day(s,t);
    return {changed:changed,stale:stale,suspended:suspended,confirmed:confirmed,active:t.status==='active',
      originalDeadline:t.endTurn===deadline,leader:t.leaderId===deputy.id};
  });
  expect(result).toEqual({changed:true,stale:true,suspended:true,confirmed:true,active:true,originalDeadline:true,leader:true});
});

test('leave preserves vows and the reached place; return requires funds and cancellation preserves a real checkpoint',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.expeditionParticipants,id='harbor_participation',t=s.stories[id],module=FB.stories.get(id);
    P.commit(s,P.review(s,id,'request',s.player.charId,'guest'));module.day(s,t);
    const m=FB.mobile.migration(s,module.declaration.host.realmId);m.at='harbor_gardens';module.day(s,t);
    const obligations=JSON.stringify([s.greatHolyWar||null,s.authority.contracts,s.player.provinceId]);
    const left=P.commit(s,P.review(s,id,'leave',s.player.charId)),preserved=obligations===JSON.stringify([s.greatHolyWar||null,s.authority.contracts,s.player.provinceId]);
    s.player.gold=0;const poor=P.review(s,id,'return_home',s.player.charId),denied=!poor.allowed&&!P.commit(s,poor);
    s.player.gold=100;const q=P.review(s,id,'return_home',s.player.charId),cost=q.road.cost,returned=P.commit(s,q),paid=s.player.gold===100-cost;
    const serial=FB.save.serialize();FB.save.restore(JSON.parse(serial));
    const restored=FB.state.player.travel.phase==='return'&&FB.travelLocation(FB.state).id==='harbor_gardens';
    FB.travelCancel(FB.state,null,true);
    const checkpoint=FB.travelLocation(FB.state).id==='harbor_gardens'&&FB.state.player.travel.phase==='arrived';
    const resumed=P.commit(FB.state,P.review(FB.state,id,'return_home',FB.state.player.charId));
    FB.state.player.travel.legDaysLeft=1;FB.state.turn++;FB.travelTick(FB.state);
    const arrived=!FB.state.player.travel&&!FB.state.stories[id].locationHeld&&FB.travelLocation(FB.state).id===FB.state.player.provinceId;
    return {left:left,preserved:preserved,denied:denied,returned:returned,paid:paid,positive:cost>0,restored:restored,checkpoint:checkpoint,resumed:resumed,arrived:arrived};
  });
  expect(result).toEqual({left:true,preserved:true,denied:true,returned:true,paid:true,positive:true,restored:true,checkpoint:true,resumed:true,arrived:true});
});

test('expiry, lost carrier and death archive once without transport, recruitment or reenrollment',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const base=FB.state,P=FB.expeditionParticipants,id='upland_participation',module=FB.stories.get(id);
    P.commit(base,P.review(base,id,'request',base.player.charId,'guard'));module.day(base,base.stories[id]);
    return ['expiry','carrier','death'].map(function(kind) {
      const s=JSON.parse(JSON.stringify(base)),t=s.stories[id];
      if(kind==='expiry')s.turn=t.endTurn;
      if(kind==='carrier')s.armies=s.armies.filter(function(a){return a.id!==t.hostId;});
      if(kind==='death')s.chars[t.actorId].dead=true;
      module.day(s,t);const ended=JSON.stringify(t);module.day(s,t);
      return {status:t.status,once:ended===JSON.stringify(t),home:s.player.provinceId===base.player.provinceId,
        reenroll:!P.review(s,id,'request',s.player.charId,'guard').allowed};
    });
  });
  expect(result).toEqual([{status:'expired',once:true,home:true,reenroll:true},
    {status:'interrupted',once:true,home:true,reenroll:true},{status:'interrupted',once:true,home:true,reenroll:true}]);
});

test('malformed optional records, carrier loss, missing attachment and future terms reject purely',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.expeditionParticipants,id='harbor_participation',module=FB.stories.get(id);
    P.commit(s,P.review(s,id,'request',s.player.charId,'guest'));module.day(s,s.stories[id]);
    const changes=[function(t){t.version=0;},function(t){t.extra=true;},function(t){delete t.version;},
      function(t){t.generation=999999;},function(t){t.migrationId='foreign';},function(t){t.actorId='absent';},
      function(t){t.slot=1;},function(t){t.endTurn+=1441;},function(t){t.acceptedTurn=999999;},
      function(t,s){s.player.travel=null;},function(t,s){delete s.stories[id];},
      function(t,s){s.player.travel.contract={realmId:'harbor_commune'};},function(t,s){s.player.travel.participationId='absent';}];
    return changes.map(function(change) {
      const detached=JSON.parse(JSON.stringify(s));change(detached.stories[id],detached);
      const before=JSON.stringify(detached),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {P.validateCarriers(detached);if(detached.stories[id])module.validate(detached.stories[id],detached);}catch(error){rejected=true;}
      return rejected&&before===JSON.stringify(detached)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(13).fill(true));
});

test('the shared story sheet discloses individual scope and preserves Back and Escape',async function ({page},info) {
  await start(page,info,'harbor');
  await page.evaluate(function(){FB.ui.showStorySheet('harbor_participation');});
  await page.locator('[data-story-choice="guest"]').click();
  await expect(page.locator('#gm-body')).toContainText('No wages or equipment');
  await expect(page.locator('#gm-body')).toContainText('30 days');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="guest"]')).toBeVisible();
  expect(await page.evaluate(function(){return FB.state.stories.harbor_participation.roleId;})).toBe(null);
});

test('the save envelope rejects a forged or erased carrier before adopting state and RNG',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,P=FB.expeditionParticipants,id='harbor_participation',module=FB.stories.get(id);
    P.commit(s,P.review(s,id,'request',s.player.charId,'guest'));module.day(s,s.stories[id]);
    const source=JSON.parse(FB.save.serialize());
    return [function(data){delete data.state.stories[id];},function(data){delete data.state.player.travel.participationId;},
      function(data){data.state.player.travel.participationId='absent';}].map(function(change) {
      const saved=JSON.parse(JSON.stringify(source));change(saved);
      const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try{FB.save.restore(saved);}catch(error){rejected=true;}
      return rejected&&before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual([true,true,true]);
});
