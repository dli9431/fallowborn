'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {installRestoreFacts}=require('../support/game/restore-facts');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={glassroad:require('../fixtures/authoring/mobile-seasonal-round-glassroad.json'),
  reedbank:require('../fixtures/authoring/mobile-seasonal-round-reedbank.json')};

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['data/mobile_confederations.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/mobile_camps.js','js/mobile_columns.js','js/expedition_programs.js','js/governments.js','js/government_selection.js',
  'js/starts.js','js/main.js','js/bookmark_setup.js','js/federates.js','js/mods.js','js/schema.js','js/save.js','js/save_v4.js',
  'js/treasury.js','js/population.js','js/market.js','js/armies.js','js/world.js','js/stories.js',
  'js/ui_mobile.js','js/government_civic.js','js/government_support.js','js/authority.js','js/model.js']);

async function start(page,info,kind,member) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (input) {return FB.mods.validate(input);},examples[kind])).toEqual([]);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-seasonal-round-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await prepareOpeningTitle(page);
  await beginExactCode(page,openingCode(kind,member));
  await installRestoreFacts(page);
}

async function prepareOpeningTitle(page) {
  await page.evaluate(function () {
    FB.game.uiPrefs.onboardingStarted=true;FB.game.saveUiPrefs();FB.ui.closeModal();FB.ui.showScreen('title');
  });
}

function openingCode(kind,member) {
  const prefix=kind==='glassroad' ? 'dune' : 'reed',name=kind==='glassroad' ? member ? 'Nari_Ash' : 'Sela_Vey' : member ? 'Mira_Fen' : 'Iri_Vale';
  return 'ROUND-'+prefix+'_world-'+prefix+'_'+(member ? 'member' : 'leader')+'_start-'+prefix+'_well-f-'+name+'-standard';
}

async function beginExactCode(page,code) {
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();await page.locator('#ng-seed').fill(code);await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
}

for (const kind of Object.keys(examples)) for (const member of [false,true]) {
  test(kind+' fresh '+(member ? 'member' : 'leader')+' keeps exact people, finite public stocks and matching spent saves',async function ({page},info) {
    await start(page,info,kind,member);
    const result=await page.evaluate(function (member) {
      const s=FB.state,M=FB.mobile,rid=s.start.mobilePrincipal.realmId,r=M.row(s,rid),m=M.migration(s,rid),host=M.host(s,rid);
      const d=FB.campaignBookmark(s).realms.find(function (d) {return d.id===rid;}),p=M.profile(s,rid),binding=r.openingBindings.find(function (b) {return b.memberId===s.start.mobilePrincipal.memberId;});
      const floors=FBDATA.balance.aiTreasuryOpeningFloor || [0,10,20,30,40],units={};
      d.mobile.opening.muster.forEach(function (row) {units[row.unitId]=(units[row.unitId] || 0)+row.count;});
      const original=JSON.stringify([s.chars,s.authority,s.armies,s.player.gold,FB.getRngState(),FB.getUidCounter()]);
      M.initialize(s,[d]);
      const initial={selected:binding.characterId===s.player.charId,leader:(r.leaderId===s.player.charId)===!member,
        original:s.start.mobilePrincipal.charId===binding.characterId,noLand:FB.realmTerritory(s,rid).length===0,
        independent:m.patronRealmId===null && m.sponsorship.kind==='independent',elected:!r.command && !d.mobile.command,
        total:M.total(s,rid),declared:p.members.reduce(function (n,m) {return n+m.population;},0),men:host.men,
        food:r.food+host.mobileFood===d.mobile.food,
        cashValue:FB.treasuryAvailable(s,rid),expectedCash:d.mobile.treasury+(floors[Math.min(4,s.realms[rid].rank)] || 0),
        units:Object.keys(units).every(function (id) {return host.units[id]===units[id];}),oneHost:s.armies.filter(function (a) {return a.realm===rid && a.mobileFollowing;}).length===1,
        personalAuthority:M.review(s,{realmId:rid,action:'round',terms:{groundId:p.seasonalRound.grounds[0].id},actor:{kind:'character',id:s.player.charId}}).review.allowed===!member,
        separate:s.player.liege===rid && !s.realms.player && s.player.gold===FBDATA.startScenarios.find(function (row) {return row.id===s.start.scenarioId;}).gold,
        hosted:r.agreements.length===1 && !!M.accessAt(s,rid,m.at) && r.openingAccess.authority.length>=1,
        noMigrationPatron:FB.federateRequest(s,m.id,'land')===false,
        once:original===JSON.stringify([s.chars,s.authority,s.armies,s.player.gold,FB.getRngState(),FB.getUidCounter()]),valid:M.validate(s)};
      s.player.gold-=2;FB.treasurySpend(s,rid,5);r.food-=9;
      // Settle existing lazy ledgers before an exact complete-state checkpoint.
      FB.ensureCountySupport(s);FB.ensureGreatHolyWar(s);FB.ensureRebellions(s);FB.ensureAgency(s);
      const facts=function () {return restoreFacts(FB.state,function (v) {return v;},{technologySets:true});};
      const before=facts();FB.save.restore(JSON.parse(FB.save.serialize()));const same=assertRestoreFacts(facts(),before),once=facts();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {initial:initial,same:same,twice:assertRestoreFacts(facts(),once),valid:M.validate(FB.state)};
    },member);
    expect(result.initial).toMatchObject({selected:true,leader:true,original:true,noLand:true,independent:true,elected:true,
      men:160,food:true,units:true,oneHost:true,personalAuthority:true,separate:true,hosted:true,noMigrationPatron:true,once:true,valid:true});
    expect(result.initial.cashValue).toBe(result.initial.expectedCash);
    expect(result.initial.total).toBe(result.initial.declared);
    expect(result).toMatchObject({same:true,twice:true,valid:true});
  });
}

for (const kind of Object.keys(examples)) test(kind+' replays an exact opening code on a cold page',async function ({page},info) {
  // Both roles exercise file import above. Seed the persisted mod once so both
  // replay boots use normal stored-mod admission in this case's fresh context.
  await page.addInitScript(function (mod) {
    if (!sessionStorage.getItem('coalitionReplaySeeded')) {
      localStorage.setItem('fb_mods',JSON.stringify([mod]));
      sessionStorage.setItem('coalitionReplaySeeded','1');
    }
  },JSON.stringify(examples[kind]));
  await openGame(page,info);
  await prepareOpeningTitle(page);
  await beginExactCode(page,openingCode(kind,true));
  const before=await page.evaluate(function () {
    return {seed:FB.state.seed,facts:FB.contentValues.canonical([FB.save.expandedSnapshot(FB.state),FB.getRngState(),FB.getUidCounter()])};
  });
  await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  await beginExactCode(page,before.seed);
  expect(await page.evaluate(function () {return FB.contentValues.canonical([FB.save.expandedSnapshot(FB.state),FB.getRngState(),FB.getUidCounter()]);})).toBe(before.facts);
});

for (const kind of Object.keys(examples)) test(kind+' observer uses the same elected NPC opening without a sponsor or land',async function ({page},info) {
  await start(page,info,kind,true);
  const result=await page.evaluate(function () {
    FB.game.pending={seed:'SEASONALOBSERVER'};FB.game.startObserve();FB.game.setPaused(true);
    const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;}),r=M.row(s,d.id);
    return {observe:FB.game.observe,valid:M.validate(s),land:FB.realmTerritory(s,d.id).length,
      patron:M.migration(s,d.id).patronRealmId,command:r.command===undefined,men:M.host(s,d.id).men,
      exact:r.openingBindings.every(function (b) {return FB.bookmarkActor(s,b.person.actorId).id===b.characterId;}),
      food:r.food+M.host(s,d.id).mobileFood===d.mobile.food};
  });
  expect(result).toEqual({observe:true,valid:true,land:0,patron:null,command:true,men:160,exact:true,food:true});
});

test('independent declarations reject malformed policy, wrong authority and forged or duplicate bindings without publication',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  const result=await page.evaluate(function (input) {
    const before=FB.contentValues.canonical(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function (t,d,b) {delete t.opening;},function (t) {t.sponsorship.schema=2;},
      function (t) {t.sponsorship.kind='missing';},function (t) {t.sponsorship.extra=true;},
      function (t) {t.patronRealmId='dune_oasis';},function (t) {delete t.sponsorship;},
      function (t,d) {d.government='regnum';},function (t,d,b) {b.provinces[0].realm=d.id;},
      function (t,d) {d.liege='dune_oasis';},function (t) {t.opening.principals[1].person=t.opening.principals[0].person;},
      function (t) {t.opening.principals[1].person={kind:'realm_ruler',realmId:'dune_oasis',actorId:'dune_host',generation:1};},
      function (t) {t.hostedAccess.capacity=100;},function (t) {t.hostedAccess.partnerActorId='dune_deputy';},
      function (t) {t.hostedAccess.allowRecruit='yes';}];
    const bad=edits.map(function (edit) {const d=JSON.parse(JSON.stringify(input)),b=d.bookmarks.dune_world,
      r=b.realms.find(function (r) {return r.mobile;});edit(r.mobile,r,b);return FB.mods.validate(d).length>0;});
    return {valid:FB.mods.validate(input),bad:bad,pure:before===FB.contentValues.canonical(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.glassroad);
  expect(result).toEqual({valid:[],bad:Array(14).fill(true),pure:true});
});

test('fresh live preflight rejects custody, dead people, overbooked hosting and a failed batch before allocation',async function ({page},info) {
  await start(page,info,'glassroad',true);
  const result=await page.evaluate(function () {
    const M=FB.mobile,d=FB.campaignBookmark(FB.state).realms.find(function (d) {return d.mobile;});
    const fresh=function () {const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,d.id),m=M.migration(s,d.id);
      delete s.authority.governments[d.id].mobile;s.armies=s.armies.filter(function (a) {return a.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (a) {return a.id!==m.id;});return s;};
    const edits=[function (s) {FB.bookmarkActor(s,'dune_deputy').dead=true;},
      function (s) {FB.bookmarkActor(s,'dune_deputy').captive=true;},
      function (s) {FB.bookmarkActor(s,'dune_deputy').homeProvinceId='dune_pass';s.player.provinceId='dune_pass';},
      function (s) {s.population.counties.dune_well.count=100;},
      function (s) {s.holder.dune_well='dune_gate';},
      function (s) {s.realms.dune_oasis.alive=false;},function (s) {s.realms.dune_coalition.liege='dune_oasis';}];
    const rejected=edits.map(function (edit) {const s=fresh();edit(s);const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      let failed=false;try {M.initialize(s,[d]);} catch(e) {failed=true;}
      return failed && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();});
    const s=fresh(),bad=JSON.parse(JSON.stringify(d));bad.id='absent_following';delete bad.mobile.opening;delete bad.mobile.sponsorship;delete bad.mobile.hostedAccess;
    bad.mobile.patronRealmId='absent_patron';const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    let failed=false;try {M.initialize(s,[d,bad]);} catch(e) {failed=true;}
    return {rejected:rejected,batch:failed && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
      legacy:[null,'missing','dune_oasis'].map(function (patron) {
        const v=fresh();if (patron==='dune_oasis') v.realms[patron].alive=false;
        const spec={realmId:d.id,patronRealmId:patron,origin:d.mobile.origin,target:d.mobile.target,hostId:'following_'+d.id,
          settlementForm:'regnum',men:160,units:{arch:160},endTurn:90};
        const before=JSON.stringify(v),rng=FB.getRngState(),uid=FB.getUidCounter();
        return FB.federateBeginMigration(v,spec)===null && before===JSON.stringify(v) && rng===FB.getRngState() && uid===FB.getUidCounter();
      })};
  });
  expect(result).toEqual({rejected:Array(7).fill(true),batch:true,legacy:[true,true,true]});
});

test('opening access expires on original authority loss and never revives, while election retains personal provenance',async function ({page},info) {
  await start(page,info,'glassroad',true);
  const result=await page.evaluate(function () {
    const M=FB.mobile,s=FB.state,rid='dune_coalition',r=M.row(s,rid),m=M.migration(s,rid),a=r.agreements[0];
    const provenance=JSON.stringify(s.start.mobilePrincipal),stock=[r.food,M.host(s,rid).mobileFood,FB.treasuryAvailable(s,rid),s.player.gold];
    const holder=s.holder[m.at];s.holder[m.at]='dune_gate';const blocked=!M.accessAt(s,rid,m.at);
    M.endAccess(s,rid,a);s.holder[m.at]=holder;const noRevival=!M.accessAt(s,rid,m.at);
    FB.advanceRealmSuccession(s,rid,{cause:'vacancy'});
    r.members.forEach(function (member) {M.commit(s,M.review(s,{realmId:rid,action:'support',actor:member.principal,terms:{candidateId:s.player.charId}}));});
    const selected=M.commit(s,M.review(s,{realmId:rid,action:'select',actor:{kind:'character',id:s.player.charId},terms:{candidateId:s.player.charId}}));
    FB.save.restore(JSON.parse(FB.save.serialize()));const restored=FB.state;
    return {blocked:blocked,noRevival:noRevival,selected:selected,leader:M.leader(restored,rid).id===restored.player.charId,
      provenance:provenance===JSON.stringify(restored.start.mobilePrincipal),stocks:JSON.stringify(stock)===JSON.stringify([
        M.row(restored,rid).food,M.host(restored,rid).mobileFood,FB.treasuryAvailable(restored,rid),restored.player.gold]),valid:M.validate(restored)};
  });
  expect(result).toEqual({blocked:true,noRevival:true,selected:true,leader:true,provenance:true,stocks:true,valid:true});
});

test('an original superior generation binds elected hosting independently of the coalition leader',async function ({page},info) {
  await start(page,info,'reedbank',true);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='reed_coalition',r=M.row(s,rid),at=M.migration(s,rid).at;
    const before=M.accessAt(s,rid,at),q=M.review(s,{realmId:rid,action:'round',terms:{groundId:'well_ground'},actor:{kind:'realm',id:rid}});
    const oldGeneration=s.realms.reed_gate.ruler.generation;
    s.realms.reed_gate.ruler.generation=FB.realmRulerGeneration(s,'reed_gate')+1;
    const bytes=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),blocked=!M.accessAt(s,rid,at);
    const stale=!M.commit(s,q) && bytes===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    M.endAccess(s,rid,r.agreements[0]);
    if (oldGeneration===undefined) delete s.realms.reed_gate.ruler.generation;else s.realms.reed_gate.ruler.generation=oldGeneration;
    const ended=!M.accessAt(s,rid,at),marker=JSON.stringify(r.openingAccess);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {initial:!!before,chain:r.openingAccess.authority.length,allowed:q.review.allowed,blocked:blocked,stale:stale,
      ended:ended,same:marker===JSON.stringify(M.row(FB.state,rid).openingAccess),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({initial:true,chain:2,allowed:true,blocked:true,stale:true,ended:true,same:true,valid:true});
});

test('forged opening, sponsorship, access-chain and seasonal save facts reject before state, storage or counters change',async function ({page},info) {
  await start(page,info,'glassroad',false);
  const result=await page.evaluate(function (input) {
    const saved=JSON.parse(FB.save.serialize()),state=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter(),storage=JSON.stringify(localStorage);
    const edits=[function (s,r,m) {delete m.sponsorship;},function (s,r,m) {m.patronRealmId='dune_oasis';},
      function (s,r,m) {m.sponsorship.extra=true;},function (s,r) {delete r.openingBindings;},
      function (s,r) {r.openingBindings[0].characterId=r.openingBindings[1].characterId;},
      function (s,r) {delete r.openingAccess;},function (s,r) {delete r.openingAccess.authority;},
      function (s,r) {r.openingAccess.authority[0].characterId=r.leaderId;},
      function (s,r) {r.openingAccess.authority[0].generation++;},function (s,r) {delete r.round;},
      function (s,r) {r.round.lastChoice={groundId:'unknown',turn:0};},function (s,r) {r.round.reviewedSeason=99999;}];
    const bad=edits.map(function (edit) {const v=JSON.parse(JSON.stringify(saved)),r=v.state.authority.governments.dune_coalition.mobile,
      m=v.state.authority.migrations.find(function (m) {return m.id===r.migrationId;});edit(v.state,r,m);
      try {FB.save.restore(v);return false;} catch(e) {return true;}});
    input.mobileProfiles.dune_compact.seasonalRound.travelFoodRate+=0.1;FB.mods.apply(input);
    try {FB.save.restore(saved);bad.push(false);} catch(e) {bad.push(/different mod/.test(e.message));}
    return {bad:bad,pure:FB.state===state && rng===FB.getRngState() && uid===FB.getUidCounter() && storage===JSON.stringify(localStorage)};
  },JSON.parse(JSON.stringify(examples.glassroad)));
  expect(result).toEqual({bad:Array(13).fill(true),pure:true});
});

test('independent members can depart locally and partial or final owned settlement conserves the original accounts',async function ({page},info) {
  await start(page,info,'reedbank',true);
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid=FB.state.start.mobilePrincipal.realmId;
    function act(s,action,terms,actor) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}}));}
    const s=FB.state,r=M.row(s,rid),leader=r.leaderId,selection=JSON.stringify(s.start.mobilePrincipal),pid=M.migration(s,rid).at;
    const before=FB.save.serialize(),total=s.population.counties[pid].count+M.total(s,rid),
      food=FB.marketProvisionSnapshot(s,pid).stock+r.food+M.host(s,rid).mobileFood;
    const demustered=act(s,'demuster',{}),left=act(s,'leave',{memberId:'ridge_following',countyId:pid},{kind:'character',id:s.player.charId});
    const departure=demustered && left && s.population.counties[pid].count+M.total(s,rid)===total &&
      Math.abs(FB.marketProvisionSnapshot(s,pid).stock+r.food-food)<0.000001;
    FB.save.restore(JSON.parse(before));const v=FB.state,row=M.row(v,rid);
    FB.transferProvince(v,pid,rid);
    function settle(count,final) {
      const terms={countyId:pid,count:count,final:final};
      if (!act(v,'propose',{operation:'settle',proposal:terms})) return false;
      row.members.forEach(function (m) {act(v,'assent',{assent:true},m.principal);});
      const q=M.review(v,{realmId:rid,action:'settle',terms:terms,actor:{kind:'realm',id:rid}});
      if (!q.review.allowed) throw new Error('Settlement rejected: '+q.review.reason);
      return M.commit(v,q);
    }
    const partial=settle(100,false),final=settle(M.total(v,rid),true);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {departure:departure,partial:partial,final:final,status:M.row(FB.state,rid).status,
      total:FB.state.population.counties[pid].count+M.total(FB.state,rid)===total,
      food:Math.abs(FB.marketProvisionSnapshot(FB.state,pid).stock+M.row(FB.state,rid).food-food)<0.000001,
      leader:FB.realmRulerCharacterSnapshot(FB.state,rid).id===leader,original:selection===JSON.stringify(FB.state.start.mobilePrincipal),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({departure:true,partial:true,final:true,status:'settled',total:true,food:true,leader:true,original:true,valid:true});
});
