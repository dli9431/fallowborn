'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/household-party-harbor.json'),upland:require('../fixtures/authoring/household-party-upland.json')};
dependsOnRuntime(__filename,['index.html','data/technology.js','data/starts.js','data/mobile_confederations.js','data/travel.js','js/story_household_party.js','js/stories.js',
  'js/story_household.js','js/story_expedition_participation.js','js/mobile_confederations.js','js/mobile_command.js',
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
