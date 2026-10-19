'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/guarded-following-harbor.json'),
  dune:require('../fixtures/authoring/guarded-following-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js',
  'js/mobile_guard.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/expedition_programs.js','js/bookmark_setup.js','js/federates.js','js/model.js','js/world.js',
  'js/starts.js','js/main.js','js/mods.js','js/governments.js','js/government_selection.js',
  'js/government_civic.js','js/government_support.js','js/authority.js','js/justice.js',
  'js/population.js','js/market.js','js/armies.js','js/treasury.js','js/technology.js',
  'js/travel.js','js/story_household_party.js','js/household_party_travel.js','js/household_party_camp.js',
  'js/story_household.js','js/stories.js','js/ui_mobile.js','js/ui_misc.js','js/save.js','js/save_v4.js']);

async function imported(page,info,prefix,ordinary) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+
    (ordinary?'mobile-hosted-':'guarded-following-')+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (p) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[p+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports the original guarded party separately and initializes resources once',async function ({page},info) {
    await imported(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (v) {return v.mobile;});
      const r=M.row(s,d.id),g=r.guardedParty,ids=g.declaration.actorIds.map(function (id) {return FB.bookmarkActor(s,id).id;});
      const total=M.total(s,d.id),army=M.host(s,d.id),cash=FB.treasuryAvailable(s,d.id),before=JSON.stringify(s);
      const rng=FB.getRngState(),uid=FB.getUidCounter();M.initialize(s,FB.campaignBookmark(s).realms);M.guardSnapshot(s,d.id);
      return {exact:JSON.stringify(ids)===JSON.stringify(g.characterIds),original:r.leaderId===ids[0],
        separate:g.characterIds.every(function (id) {return M.migration(s,d.id).courtIds.indexOf(id)<0 &&
          FB.characterLocation(s,s.chars[id])===g.declaration.location.countyId;}),
        unique:g.characterIds.every(function (id) {return Object.keys(s.chars).filter(function (other) {
          return s.chars[other].name===s.chars[id].name;
        }).length===1;}),
        remote:g.declaration.location.countyId!==M.migration(s,d.id).at,party:ids.length,
        suspended:!M.commandValid(s,d.id) && M.leader(s,d.id)===null,
        access:!!M.householdSnapshot(s,d.id).access,food:r.food+army.mobileFood,total:total,
        initial:r.accounting.initial,cash:cash,law:!s.justice || !(s.justice.custody || []).length,
        pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(s)};
    });
    expect(result).toMatchObject({exact:true,original:true,separate:true,unique:true,remote:true,suspended:true,access:true,
      food:3200,pure:true,valid:true,party:prefix==='harbor'?2:1});
    expect(result.total).toBe(result.initial);
    expect(result.cash).toBeGreaterThanOrEqual(70);
  });
}

test('guard declarations reject malformed references, parties, sites and policies without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (g) {g.schema=2;},function (g) {g.extra=true;},function (g) {g.kind='conviction';},
      function (g) {g.release='automatic';},function (g) {g.duration=0;},function (g) {g.duration=1441;},
      function (g) {g.actorIds=[];},function (g) {g.actorIds.push(g.actorIds[0]);},
      function (g) {g.actorIds[0]='missing';},function (g) {g.actorIds.push('harbor_companion');},
      function (g) {g.actorIds.push('harbor_guard_ruler');},function (g) {g.actorIds.reverse();},
      function (g) {g.hostRealmId='missing';},function (g) {g.hostActorId='harbor_leader';},
      function (g) {g.location.countyId='harbor_gardens';},function (g) {g.location.siteId='missing';},
      function (g) {g.location.extra=true;},function (g,d) {delete d.mobile.command;},
      function (g,d) {d.mobile.preparationId='unformed';},function (g,d,b) {b.opening.actors.harbor_leader.home='harbor_quay';}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),b=input.bookmarks.harbor_world,d=b.realms.find(function (v) {return v.mobile;});
      change(d.mobile.guardedParty,d,b);
      const bytes=JSON.stringify(input),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      const rejected=FB.mods.validate(input).length>0;
      return rejected && bytes===JSON.stringify(input) && data===JSON.stringify(FBDATA) && state===JSON.stringify(FB.state) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(20).fill(true));
});

test('fresh guard preflight rejects unavailable people and changed control before any initialization',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,d=FB.campaignBookmark(original).realms.find(function (v) {return v.mobile;});
    return ['custody','dead','wrong_home','companion_dead','holder','host_dead','travel','late'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,d.id),g=r.guardedParty;
      const leader=s.chars[g.characterIds[0]],companion=s.chars[g.characterIds[1]],host=s.chars[g.authority.characterId];
      delete s.authority.governments[d.id].mobile;
      s.armies=s.armies.filter(function (v) {return v.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (v) {return v.realmId!==d.id;});
      if(kind==='custody')leader.captive=true;
      if(kind==='dead')leader.dead=true;
      if(kind==='wrong_home')leader.homeProvinceId=d.mobile.origin;
      if(kind==='companion_dead')companion.dead=true;
      if(kind==='holder')s.holder[g.declaration.location.countyId]='harbor_commune';
      if(kind==='host_dead')host.dead=true;
      if(kind==='travel')leader.travel={currentId:d.mobile.origin};
      if(kind==='late')s.turn=1;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      const planned=M.openingPlan(s,d).allowed;
      try {M.initialize(s,[d]);}catch(error){rejected=true;}
      return !planned && rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(8).fill(true));
});

test('only the unchanged present host can release, and release supplies no remote command or movement',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),g=r.guardedParty;
    const host=s.chars[g.authority.characterId],leader=s.chars[g.characterIds[0]],companion=s.chars[g.characterIds[1]];
    const request={realmId:rid,action:'release',actor:{kind:'character',id:host.id}};
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=M.reviewGuard(s,request);
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const wrong=M.reviewGuard(s,{realmId:rid,action:'release',actor:{kind:'character',id:leader.id}}).review.allowed;
    host.captive=true;const stale=!M.commit(s,q);delete host.captive;
    const facts=JSON.stringify([M.total(s,rid),r.food,M.host(s,rid),M.migration(s,rid),s.player.gold,FB.treasuryAvailable(s,rid),
      leader.homeProvinceId,companion.homeProvinceId]);
    const released=M.commit(s,M.reviewGuard(s,request)),repeat=M.commit(s,M.reviewGuard(s,request));
    const noGrant=facts===JSON.stringify([M.total(s,rid),r.food,M.host(s,rid),M.migration(s,rid),s.player.gold,FB.treasuryAvailable(s,rid),
      leader.homeProvinceId,companion.homeProvinceId]);
    const remote=!M.commandValid(s,rid),notCarried=M.migration(s,rid).courtIds.indexOf(leader.id)<0;
    // Stage an independently completed ordinary relocation, rather than
    // advancing months of simulation just to reach this eligibility boundary.
    leader.homeProvinceId=M.migration(s,rid).at;
    const local=M.commandValid(s,rid);
    leader.travel={currentId:leader.homeProvinceId};const travelling=!M.commandValid(s,rid);delete leader.travel;
    return {pure:pure,allowed:q.review.allowed,wrong:wrong,stale:stale,released:released,repeat:repeat,
      noGrant:noGrant,remote:remote,local:local,travelling:travelling,notCarried:notCarried,
      companion:FB.characterLocation(s,companion)===g.declaration.location.countyId,valid:M.validate(s)};
  });
  expect(result).toEqual({pure:true,allowed:true,wrong:false,stale:true,released:true,repeat:false,noGrant:true,
    remote:true,local:true,travelling:true,notCarried:true,companion:true,valid:true});
});

test('term expiry keeps the party guarded and allows a fresh unchanged host review',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),g=r.guardedParty;
    const request={realmId:rid,action:'release',actor:{kind:'character',id:g.authority.characterId}};
    const stale=M.reviewGuard(s,request),ids=JSON.stringify(g.characterIds);
    s.turn=g.endTurn;s.date=FB.dateAtTurn(s,s.turn);r.lastAI=Math.floor(s.turn/90);M.day(s);
    const expired=g.status==='expired' && !M.commandValid(s,rid) && FB.characterGuarded(s,g.characterIds[0]);
    const rejected=!M.commit(s,stale),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const restored=FB.state,kept=M.row(restored,rid).guardedParty.status==='expired';
    const released=M.commit(restored,M.reviewGuard(restored,request));
    return {expired:expired,stale:rejected,kept:kept,released:released,
      same:JSON.stringify(M.row(restored,rid).guardedParty.characterIds)===ids,remote:!M.commandValid(restored,rid),valid:M.validate(restored)};
  });
  expect(result).toEqual({expired:true,stale:true,kept:true,released:true,same:true,remote:true,valid:true});
});

test('guarded people cannot use ordinary personal travel and the suspended host stops before movement',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=JSON.parse(JSON.stringify(FB.state)),M=FB.mobile,rid='harbor_following',r=M.row(s,rid),g=r.guardedParty;
    s.player.charId=g.characterIds[0];s.player.provinceId=g.declaration.location.countyId;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const blocked=FB.travelEligible(s,undefined,{readOnly:true})!==true;
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const army=M.host(s,rid),at=army.at;army.path=['harbor_gardens'];army.goal='harbor_gardens';army.moveLeft=4;
    s.turn=1;s.date=FB.dateAtTurn(s,1);r.lastAI=0;M.day(s);
    return {blocked:blocked,pure:pure,stopped:!army.path.length && army.goal===null && army.moveLeft===0,
      stayed:army.at===at && FB.characterLocation(s,s.chars[g.characterIds[0]])===g.declaration.location.countyId};
  });
  expect(result).toEqual({blocked:true,pure:true,stopped:true,stayed:true});
});

test('death, changed authority or possession interrupt release without choosing a successor',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='harbor_following';
    return ['leader_dead','host_dead','generation','holder','host_away'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,rid),g=r.guardedParty,leader=r.leaderId;
      const req={realmId:rid,action:'release',actor:{kind:'character',id:g.authority.characterId}};
      const reviewed=M.reviewGuard(s,req),hostRealm=FB.startRealmId(s,g.declaration.hostRealmId);
      if(kind==='leader_dead')s.chars[leader].dead=true;
      if(kind==='host_dead')s.chars[g.authority.characterId].dead=true;
      if(kind==='generation')s.realms[hostRealm].ruler.generation++;
      if(kind==='holder')s.holder[g.declaration.location.countyId]='harbor_commune';
      if(kind==='host_away')s.realms[hostRealm].capital='harbor_gardens';
      const stopped=!M.commit(s,reviewed) && !M.reviewGuard(s,req).review.allowed;
      s.turn=1;s.date=FB.dateAtTurn(s,1);r.lastAI=0;M.day(s);
      return stopped && (kind==='host_away' || g.status==='interrupted') && r.leaderId===leader &&
        !M.commandValid(s,rid) && !r.selection && g.characterIds.every(function (id) {return M.migration(s,rid).courtIds.indexOf(id)<0;});
    });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('matching guarded and released restores preserve exact people and reject forged provenance',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='harbor_following';
    const changes=[function (r) {delete r.guardedParty;},function (r) {r.guardedParty.schema=2;},
      function (r) {r.guardedParty.extra=true;},function (r) {r.guardedParty.declaration.duration++;},
      function (r) {r.guardedParty.characterIds.reverse();},function (r) {r.guardedParty.authority.generation=999;},
      function (r) {r.guardedParty.endTurn++;},function (r) {r.guardedParty.changedTurn=1;},
      function (r) {r.guardedParty.status='released';},function (r) {r.guardedParty.revision=3;},
      function (r,s) {M.migration(s,rid).courtIds.push(r.guardedParty.characterIds[0]);}];
    const rejected=changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(FB.state));change(M.row(s,rid),s);let rejected=false;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      try {M.validate(s);}catch(error){rejected=true;}
      return rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    M.row(FB.state,rid).food-=9;
    function facts(s) {return JSON.stringify([M.row(s,rid),M.host(s,rid),M.migration(s,rid),s.player.gold,s.bookmarkSetup]);}
    const original=facts(FB.state),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const guarded=original===facts(FB.state),g=M.row(FB.state,rid).guardedParty;
    M.commit(FB.state,M.reviewGuard(FB.state,{realmId:rid,action:'release',actor:{kind:'character',id:g.authority.characterId}}));
    const releasedFacts=facts(FB.state),releasedSave=JSON.parse(FB.save.serialize());FB.save.restore(releasedSave);
    const released=releasedFacts===facts(FB.state),before=JSON.stringify(FB.state);
    M.initialize(FB.state,FB.campaignBookmark(FB.state).realms);
    return {rejected:rejected,guarded:guarded,released:released,once:before===JSON.stringify(FB.state)};
  });
  expect(result).toEqual({rejected:Array(11).fill(true),guarded:true,released:true,once:true});
});

test('ordinary openings keep legacy records and custody rejection with no guard marker',async function ({page},info) {
  await imported(page,info,'harbor',true);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid);
    const legacy=r.guardedParty===undefined && M.guardSnapshot(s,rid)===null && M.commandValid(s,rid);
    const forged=JSON.parse(JSON.stringify(s));M.row(forged,rid).guardedParty={schema:1};let rejected=false;
    try {M.validate(forged);}catch(error){rejected=true;}
    const restored=JSON.parse(FB.save.serialize());FB.save.restore(restored);
    const stage=JSON.parse(JSON.stringify(FB.state)),d=FB.campaignBookmark(stage).realms.find(function (v) {return v.id===rid;});
    const original=M.row(stage,rid).leaderId;delete stage.authority.governments[rid].mobile;
    stage.armies=stage.armies.filter(function (a) {return a.realm!==rid;});
    stage.authority.migrations=stage.authority.migrations.filter(function (a) {return a.realmId!==rid;});stage.chars[original].captive=true;
    return {legacy:legacy,forged:rejected,restored:M.row(FB.state,rid).guardedParty===undefined,custody:!M.openingPlan(stage,d).allowed};
  });
  expect(result).toEqual({legacy:true,forged:true,restored:true,custody:true});
});

test('interrupted guard records restore without renewing authority or selecting another person',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),g=r.guardedParty,original=r.leaderId;
    s.chars[g.authority.characterId].captive=true;
    s.turn=1;s.date=FB.dateAtTurn(s,1);r.lastAI=0;M.day(s);
    const facts=JSON.stringify([r,M.migration(s,rid),M.host(s,rid)]),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const restored=FB.state;
    return {same:facts===JSON.stringify([M.row(restored,rid),M.migration(restored,rid),M.host(restored,rid)]),
      interrupted:M.row(restored,rid).guardedParty.status==='interrupted',original:M.row(restored,rid).leaderId===original,
      suspended:!M.commandValid(restored,rid),valid:M.validate(restored)};
  });
  expect(result).toEqual({same:true,interrupted:true,original:true,suspended:true,valid:true});
});

test('the same ordinary seed replays the original guarded identity, camp and resource allocation',async function ({page},info) {
  await imported(page,info,'harbor');
  async function facts() {
    return page.evaluate(function () {
      const s=FB.state,M=FB.mobile,rid='harbor_following';
      return JSON.stringify([M.row(s,rid),M.migration(s,rid),M.host(s,rid),s.bookmarkSetup.actors,
        M.row(s,rid).guardedParty.characterIds.map(function (id) {return s.chars[id];})]);
    });
  }
  const first=await facts();
  await beginBookmark(page,info,'harbor_world','harbor_household');
  expect(await facts()).toBe(first);
});

test('protective release uses the shared zero-cost review and retains mobile sheet navigation',async function ({page},info) {
  await imported(page,info,'harbor');
  // Enter the provider through its ordinary authored ruler start, preserving
  // its actual person rather than replacing the player in a data callback.
  await openGame(page,info);
  const choose=page.locator('#btn-choose-beginning');
  if (await choose.isVisible()) await choose.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('GUARDREVIEW-harbor_world-harbor_guard_court-harbor_ridge-f-Orin_Vale-standard');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);FB.ui.showMobileConfederation('harbor_following');});
  await page.getByRole('button',{name:'Review protective release',exact:true}).click();
  await expect(page.locator('#gm-body')).toContainText('Nobody moves.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Review protective release',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Review protective release',exact:true}).click();
  await page.locator('#mobile-confirm').click();
  await page.locator('#mobile-continue').click();
  await expect(page.locator('#gm-body')).toContainText('Released');
  expect(await page.evaluate(function () {return FB.mobile.row(FB.state,'harbor_following').guardedParty.status;})).toBe('released');
});
