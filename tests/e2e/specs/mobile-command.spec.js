'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-command-harbor.json'),
  dune:require('../fixtures/authoring/mobile-command-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/eras.js',
  'data/technology.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/ui_mobile.js',
  'js/governments.js','js/government_selection.js','js/government_support.js','js/government_continuity.js',
  'js/bookmark_setup.js','js/world.js','js/starts.js','js/station.js','js/mods.js','js/model.js',
  'js/treasury.js','js/population.js','js/armies.js','js/federates.js','js/home_authority.js', 'js/authority.js','js/wars.js',
  'js/technology.js','js/main.js','js/save.js','js/save_v4.js','js/ui_misc.js']);

async function start(page,info,prefix,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {
    name:'mobile-command-'+prefix+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(modified))
  } : path.resolve(__dirname,'../fixtures/authoring/mobile-command-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports a distinct command policy without coalition elections or private promotion',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;});
      const rid=d.id,r=M.row(s,rid),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const actor={kind:'character',id:r.leaderId};
      const facts={schema:r.schema,effective:M.commandSnapshot(s,rid).effective,mobile:M.active(s,rid),
        succession:FB.governments.forRealm(s,rid).strategies.succession,noElection:r.selection===null,
        noCounties:FB.realmTerritory(s,rid).length===0,total:M.total(s,rid),initial:r.accounting.initial,
        publicGold:FB.treasuryAvailable(s,rid),privateGold:s.player.gold,privateTier:s.player.tier,
        recruit:M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:actor}).review.allowed,
        work:M.review(s,{realmId:rid,action:'work',terms:{},actor:{kind:'character',id:s.player.charId}}).review.allowed,
        noMajority:!M.review(s,{realmId:rid,action:'propose',terms:{operation:'war',proposal:{}},actor:actor}).review.allowed,
        noCountyTax:FB.governments.call(s,rid,'revenue','countyBase',{provinceId:d.mobile.origin,rate:1})===0,
        noLocalConsent:FB.governments.call(s,rid,'consent','local',{})===false,valid:M.validate(s)};
      M.commandSnapshot(s,rid);M.leader(s,rid);FB.station.subject(s.chars[r.leaderId],s);
      facts.pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      return facts;
    });
    expect(result).toMatchObject({schema:3,effective:true,mobile:true,noElection:true,noCounties:true,
      recruit:true,noMajority:true,noCountyTax:true,noLocalConsent:true,valid:true,pure:true,privateTier:1});
    expect(result.total).toBe(result.initial);
    expect(result.succession).toBe(prefix==='harbor' ? 'retained_principal' : 'superior_commission');
    expect(result.work).toBe(prefix==='harbor');
    expect(result.publicGold).toBeGreaterThan(0);
  });
}

test('detached command imports reject malformed scope, superior and composition atomically',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[
      function (d,c) {delete d.mobile.command;},function (d,c) {c.operations.push('conquer_all');},
      function (d,c) {c.operations.push(c.operations[0]);},function (d,c) {c.operations=[];},
      function (d,c) {c.superior.actorId='missing';},function (d,c) {c.superior.actorId='dune_incumbent';},
      function (d,c) {c.superior={kind:'realm_ruler',realmId:d.id};},function (d,c) {c.superior=null;},
      function (d,c) {c.id='';},function (d,c) {c.extra=true;},
      function (d,c) {d.government='mobile_confederation';},function (d,c) {delete d.mobile.opening;},
      function (d,c) {c.superior.actorId='constructor';},function (d,c) {c.superior={kind:'realm_ruler',realmId:'constructor'};}
    ];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),d=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;});
      change(d,d.mobile.command);
      const bytes=JSON.stringify(input),state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && state===JSON.stringify(FB.state) &&
        data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toEqual(Array(14).fill(true));
});

test('a retained member can change its own pledge while public command is suspended',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),leader=M.leader(s,rid);
    const member=r.members.find(function (m) {return m.principal.id===leader.id;}),generation=FB.realmRulerGeneration(s,rid);
    function pledge(allegiance) {return M.commit(s,M.review(s,{realmId:rid,action:'pledge',actor:member.principal,
      terms:{memberId:member.id,pledge:member.pledge,allegiance:allegiance}}));}
    const withheld=pledge(false),suspended=!M.leader(s,rid),renewed=pledge(true);
    return {withheld:withheld,suspended:suspended,renewed:renewed,sameLeader:M.leader(s,rid).id===leader.id,
      sameGeneration:generation===FB.realmRulerGeneration(s,rid),noElection:r.selection===null,valid:M.validate(s)};
  });
  expect(result).toEqual({withheld:true,suspended:true,renewed:true,sameLeader:true,sameGeneration:true,noElection:true,valid:true});
});

test('superior replacement and recall conserve the one host and purse and invalidate stale reviews',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid);
    const superior=FB.bookmarkActor(s,'dune_authorizer'),deputy=FB.bookmarkActor(s,'dune_deputy');
    const actor={kind:'character',id:superior.id};
    function transition(action,cid) {
      const request={realmId:rid,commandId:r.command.id,action:action,actor:actor};
      if(cid) request.candidateId=cid;
      return M.reviewCommand(s,request);
    }
    const inventory=JSON.stringify([host.id,host.men,host.units,host.mobileRoster,host.mobileFood,r.food,r.members,r.accounting,
      FB.treasuryAvailable(s,rid),s.player.gold,s.player.tier,s.owner,s.holder]);
    const old=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}});
    const review=transition('appoint',deputy.id),appointed=M.commit(s,review),duplicate=M.commit(s,review);
    const stale=M.commit(s,old),newLeader=M.leader(s,rid).id;
    const sameInventory=inventory===JSON.stringify([host.id,host.men,host.units,host.mobileRoster,host.mobileFood,r.food,r.members,r.accounting,
      FB.treasuryAvailable(s,rid),s.player.gold,s.player.tier,s.owner,s.holder]);
    host.path=['dune_flats'];host.goal='dune_flats';host.moveLeft=4;
    const recall=transition('recall'),recalled=M.commit(s,recall);
    const stopped=host.path.length===0 && host.moveLeft===0 && !M.leader(s,rid);
    const noOrder=FB.orderArmy(s,host,'dune_flats')===false;
    const inactive=M.review(s,{realmId:rid,action:'recruit',terms:{count:10,unitId:'arch'},actor:{kind:'realm',id:rid}}).review.allowed;
    const reappointed=M.commit(s,transition('appoint',deputy.id));
    return {appointed:appointed,duplicate:duplicate,stale:stale,newLeader:newLeader===deputy.id,sameInventory:sameInventory,
      recalled:recalled,stopped:stopped,noOrder:noOrder,inactive:inactive,reappointed:reappointed,
      noElection:r.selection===null,valid:M.validate(s)};
  });
  expect(result).toEqual({appointed:true,duplicate:false,stale:false,newLeader:true,sameInventory:true,
    recalled:true,stopped:true,noOrder:true,inactive:false,reappointed:true,noElection:true,valid:true});
});

test('fresh command preflight rejects an unavailable superior before any opening mutation',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,d=FB.campaignBookmark(original).realms.find(function (d) {return d.mobile;});
    function fresh() {
      const s=JSON.parse(JSON.stringify(original));
      delete s.authority.governments[d.id].mobile;
      s.armies=s.armies.filter(function (a) {return a.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==d.id;});
      return s;
    }
    const ready=fresh(),before=JSON.stringify(ready),rng=FB.getRngState(),uid=FB.getUidCounter();
    const allowed=M.openingPlan(ready,d).allowed;
    const pure=before===JSON.stringify(ready) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const rejected=['dead','captive','exiled'].map(function (field) {
      const s=fresh();FB.bookmarkActor(s,'dune_authorizer')[field]=true;
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let refused=false;
      try {M.initialize(s,[d]);} catch(error) {refused=true;}
      return refused && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    return {allowed:allowed,pure:pure,rejected:rejected};
  });
  expect(result).toEqual({allowed:true,pure:true,rejected:[true,true,true]});
});

test('a commander cannot self-appoint and unavailable issuers or candidates cannot use a review',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='dune_coalition';
    return ['self','scope','issuer_dead','issuer_captive','candidate_dead','candidate_captive','changed'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,rid),superior=FB.bookmarkActor(s,'dune_authorizer'),deputy=FB.bookmarkActor(s,'dune_deputy');
      const request={realmId:rid,commandId:r.command.id,action:'appoint',candidateId:deputy.id,actor:{kind:'character',id:superior.id}};
      const review=M.reviewCommand(s,request);
      if(kind==='self') request.actor.id=r.leaderId;
      if(kind==='scope') request.commandId='other_mandate';
      if(kind==='issuer_dead') superior.dead=true;
      if(kind==='issuer_captive') superior.captive=true;
      if(kind==='candidate_dead') deputy.dead=true;
      if(kind==='candidate_captive') deputy.captive=true;
      if(kind==='changed') r.command.revision++;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const attempted=kind==='self' || kind==='scope' ? M.reviewCommand(s,request) : review;
      return !M.commit(s,attempted) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(7).fill(true));
});

for (const prefix of ['harbor','dune']) {
  test(prefix+' death leaves the existing people and command vacant without election or regeneration',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;}),rid=d.id,r=M.row(s,rid);
      const leader=M.leader(s,rid),total=M.total(s,rid),identities=Object.keys(s.chars).length;
      leader.dead=true;FB.royalCharDied(s,leader,rid);
      M.ai(s,rid);FB.ensureRealmSuccession(s,rid);
      const record=JSON.stringify([r,M.host(s,rid)]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {vacant:r.command.status==='vacant',leader:M.leader(FB.state,rid),election:r.selection,
        total:M.total(FB.state,rid)===total,identities:Object.keys(FB.state.chars).length===identities,
        restored:record===JSON.stringify([M.row(FB.state,rid),M.host(FB.state,rid)]),valid:M.validate(FB.state)};
    });
    expect(result).toEqual({vacant:true,leader:null,election:null,total:true,identities:true,restored:true,valid:true});
  });
}

test('realm-issued commission suspends on ruler replacement until the current living issuer recommissions',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),bm=input.bookmarks.dune_world;
  bm.realms.find(function (r) {return r.mobile;}).mobile.command.superior={kind:'realm_ruler',realmId:'dune_gate'};
  bm.opening.actors.dune_issuer={ref:{kind:'realm_ruler',realmId:'dune_gate'}};
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),old=FB.realmRulerCharacterSnapshot(s,'dune_gate');
    const actor=FB.bookmarkActor(s,'dune_authorizer'),request={realmId:rid,commandId:r.command.id,action:'recall',actor:{kind:'character',id:old.id}};
    const stale=M.reviewCommand(s,request),total=M.total(s,rid),gold=FB.treasuryAvailable(s,rid);
    FB.assignRealmRulerCharacter(s,'dune_gate',actor.id,{replaceAuthored:true});
    const suspended=!M.leader(s,rid),staleRejected=!M.commit(s,stale);
    const review=M.reviewCommand(s,{realmId:rid,commandId:r.command.id,action:'appoint',candidateId:r.leaderId,actor:{kind:'character',id:actor.id}});
    const accepted=M.commit(s,review);
    return {suspended:suspended,staleRejected:staleRejected,accepted:accepted,effective:M.commandValid(s,rid),
      conserved:total===M.total(s,rid) && gold===FB.treasuryAvailable(s,rid),valid:M.validate(s)};
  });
  expect(result).toEqual({suspended:true,staleRejected:true,accepted:true,effective:true,conserved:true,valid:true});
});

test('a dead superior suspends orders while the real following consumes supplies and remains restorable',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid);
    const total=M.total(s,rid),food=r.food,treasury=FB.treasuryAvailable(s,rid);
    FB.bookmarkActor(s,'dune_authorizer').dead=true;
    const immediate=!M.commandValid(s,rid) && !M.leader(s,rid);
    host.path=['dune_flats'];host.goal='dune_flats';host.moveLeft=4;
    s.turn++;s.date.day++;M.day(s);
    const stopped=host.path.length===0 && host.moveLeft===0,consumed=r.food<food;
    const record=JSON.stringify([r,host]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {immediate:immediate,stopped:stopped,consumed:consumed,total:M.total(FB.state,rid)===total,
      treasury:FB.treasuryAvailable(FB.state,rid)===treasury,election:M.row(FB.state,rid).selection,
      restored:record===JSON.stringify([M.row(FB.state,rid),M.host(FB.state,rid)]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({immediate:true,stopped:true,consumed:true,total:true,treasury:true,election:null,restored:true,valid:true});
});

test('public leader adoption keeps station, private purse and realm ownership separate',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),leader=M.leader(s,rid),treasury=FB.treasuryAvailable(s,rid);
    const rank=FB.station.subject(leader,s).tier;
    s.player.charId=leader.id;s.player.tier=1;
    const scenario={id:'command_adoption_review',rulerRealmId:rid,governmentForm:'expedition_command',tier:1,gold:7,onboarding:'ruler'};
    FBDATA.startScenarios.push(scenario);
    const adopted=FB.adoptStartingRealm(s,scenario,{deferSetup:true});
    const me={kind:'character',id:leader.id};
    return {adopted:adopted,privateTier:s.player.tier,privateGold:s.player.gold,publicGold:FB.treasuryAvailable(s,rid),treasury:treasury,
      publicRealm:!!s.realms[rid] && !s.realms.player,noLand:s.player.provs.length===0,privateRank:rank,
      noCountyConsent:!FB.political.consent(s,me,'extraordinary_tax',{provinceId:'dune_well'}).allowed,
      noPublicGrant:FB.startRealmId(s,rid)===rid};
  });
  expect(result).toMatchObject({adopted:true,privateTier:1,privateGold:7,publicRealm:true,noLand:true,noCountyConsent:true,noPublicGrant:true});
  expect(result.publicGold).toBe(result.treasury);
  expect(result.privateRank).toBeLessThan(3);
});

test('matching restore retains recall while malformed provenance and changed command policies reject',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (source) {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),issuer=FB.bookmarkActor(s,'dune_authorizer');
    M.commit(s,M.reviewCommand(s,{realmId:rid,commandId:r.command.id,action:'recall',actor:{kind:'character',id:issuer.id}}));
    const saved=FB.save.serialize(),record=JSON.stringify(r.command);
    FB.save.restore(JSON.parse(saved));
    const kept=record===JSON.stringify(M.row(FB.state,rid).command) && !M.leader(FB.state,rid);
    const malformed=[function (r) {delete r.command;},function (r) {r.command.id='forged';},
      function (r) {r.command.issuer.characterId=r.leaderId;},function (r) {r.command.leaderGeneration=9999;},
      function (r) {r.selection={votes:{}};},function (r) {r.schema=2;}].map(function (change) {
      const detached=JSON.parse(JSON.stringify(FB.state));change(M.row(detached,rid));
      const before=JSON.stringify(detached),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {M.validate(detached);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(detached) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    source.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.command.operations.pop();
    FB.mods.apply(source);
    const before=JSON.stringify(FB.state);let mismatch=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {mismatch=/different mod/.test(error.message);}
    return {kept:kept,malformed:malformed,mismatch:mismatch,pure:before===JSON.stringify(FB.state)};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({kept:true,malformed:Array(6).fill(true),mismatch:true,pure:true});
});

test('command sheet shows the real mandate and retains inputs through review Back',async function ({page},info) {
  await start(page,info,'dune');
  await page.evaluate(function () {
    const s=FB.state; s.player.charId=FB.bookmarkActor(s,'dune_authorizer').id;
    FB.ui.showMobileConfederation('dune_coalition');
  });
  await expect(page.locator('#gm-body')).toContainText('Public treasury');
  await expect(page.locator('#gm-body')).not.toContainText('living member weight');
  await expect(page.locator('button[data-mobile-review]').filter({hasText:'Support Sela Vey'})).toHaveCount(0);
  await page.locator('#mobile-count').fill('23');
  await page.locator('button[data-mobile-review]').filter({hasText:'Commission Ravi Sen'}).click();
  await expect(page.locator('#gm-body')).toContainText('Immediate cost');
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-count')).toHaveValue('23');
  await expect(page.locator('button[data-mobile-review]').filter({hasText:'Commission Ravi Sen'})).toBeFocused();
});
