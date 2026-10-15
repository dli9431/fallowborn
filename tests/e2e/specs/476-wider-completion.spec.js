'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startRegion,startBaseline476,saveBudget} = require('../support/game/476-wider');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
dependsOnRuntime(__filename,[
  'index.html','data/bookmark_476_wider.js','data/bookmark_476_wider_identities.js',
  'data/geography_expansion.js','data/geographies.js','data/bookmark_476.js',
  'data/bookmark_476_outer.js','data/aristocratic_courts.js','data/mobile_confederations.js',
  'data/assembly_polities.js','data/starts.js','data/cultures.js','js/portrait.js',
  'js/world.js','js/model.js','js/save.js','js/save_v4.js','js/main.js','js/mods.js',
  'js/bookmark_setup.js','js/government_aristocracy.js','js/government_support.js',
  'js/government_collective.js','js/institutions.js','js/population.js','js/stories.js','js/religion.js',
  'js/starts.js','js/government_selection.js','js/government_lineage.js','js/government_assembly.js',
  'js/mobile_confederations.js','js/authority.js','js/government_levy.js','js/wars.js','js/events.js',
  'js/title_ids.js','js/technology.js','js/story_agreements.js',
  'js/travel.js','js/armies.js','js/tournaments.js','js/ui_panels.js','js/ui_tournaments.js','js/ui_modals.js'
]);

for (const flag of [false,true]) test('all wider 476 districts have accountable inhabitants, flag ' + flag,
  async function ({page},testInfo) {
    await startRegion(page,testInfo,'alexandria',flag);
    const result = await page.evaluate(function () {
      const b = FB.bookmark('476'), old = FB.bookmark('476','baseline'), s = FB.state;
      const region = FBDATA.bookmarkRegions476.wider;
      const disabled = old.provinces.filter(function (p) { return p.wasteland && !/^w_/.test(p.id); });
      const declared = {};
      b.provinces.forEach(function (p) { declared[p.id] = p; });
      const faults = FB.validateBookmark(FBDATA.bookmarks['476']);
      const before = JSON.stringify([s.population,s.localInstitutions,s.owner,s.holder,s.bookmarkSetup]);
      const rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {faults:faults,stamp:s.start.revision,geography:s.start.geography,
        disabled:disabled.length,added:region.provinces.length,
        complete:disabled.every(function (p) { return !declared[p.id].wasteland &&
          s.realms[s.owner[p.id]] && s.realms[s.holder[p.id]]; }),
        communities:region.provinces.every(function (p) {
          return p.communities.reduce(function (n,c) { return n + c.populationShare0; },0) === 10000;
        }),
        sites:region.provinces.every(function (p) {
          const list = FB.world.sitesByProv[p.id].list.filter(function (site) { return site.authored; });
          return list.length === 1 && list[0].site === p.id + '_wider_476';
        }),
        scenery:Object.keys(region.scenery).length,
        old:[old.geography,old.openingRevision,old.provinces.length],
        newCount:b.provinces.length,
        kept:before === JSON.stringify([FB.state.population,FB.state.localInstitutions,FB.state.owner,FB.state.holder,FB.state.bookmarkSetup]),
        deterministic:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),
        alexandria:FB.localInstitutionDefinitions(FB.state).alexandria_see.provinceId,
        armenian:FBDATA.aristocraticProfiles.sasanian_wider_476.interests.filter(function (i) {
          return i.provinceId === 'van' || i.provinceId === 'dvin';
        }).length};
    });
    expect(result).toEqual({faults:[],stamp:'wider_v2',geography:'europe_regional_2',disabled:152,
      added:177,complete:true,communities:true,sites:true,scenery:21,
      old:['europe_regional','wider_v1',498],newCount:527,kept:true,deterministic:true,
      alexandria:'alexandria',armenian:2});
    await saveBudget(page,testInfo,'fresh-expanded',4 * 1024 * 1024);
  });

for (const county of ['alexandria','dvin','tara','turku','erfurt','kiev','atil','balkh','sanaa','axum','garama']) {
  test('one season of household life at ' + county,async function ({page},testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served','Bounded regional daily journeys run once.');
    await startRegion(page,testInfo,county);
    await injectBrowserHarness(page);
    await advanceBookmark(page,45);
    const source = await saveBudget(page,testInfo,county + '-midpoint',6 * 1024 * 1024);
    const before = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
    await advanceBookmark(page,45);
    const finish = await facts(page);
    await restoreBookmark(page,source);
    await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(finish);
  });
}

test('unstamped schema 1 campaigns retain the merged baseline and reject mixed worlds before adoption',
  async function ({page},testInfo) {
    await startBaseline476(page,testInfo);
    const source = await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize());
      data.platformSchema = 1; delete data.state.start.revision;
      return JSON.stringify(data);
    });
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('476',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,source);
    expect(await page.evaluate(function () {
      return [FB.state.start.revision,FB.activeGeographyId,FB.world.byId.nicosia.wasteland,
        !!FB.world.byId.garama,FB.state.bookmarkSetup.revision];
    })).toEqual(['baseline','europe_regional',true,false,'wider_v1']);
    expect(await page.evaluate(function () {
      const data = JSON.parse(FB.save.serialize()), live = FB.state, world = FB.world;
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      return [function (d) { d.state.start.revision = 'missing_revision'; },
        function (d) { d.state.start.geography = 'europe_regional_2'; },
        function (d) { d.state.bookmarkSetup.revision = 'wider_v2'; },
        function (d) { d.state.owner.garama = 'byzantium'; },
        function (d) { d.platformSchema = 1; }].map(function (mutate) {
          const candidate = JSON.parse(JSON.stringify(data)); mutate(candidate);
          const text = JSON.stringify(candidate);
          return FB.game.loadData(candidate) === false && live === FB.state && world === FB.world &&
            rng === FB.getRngState() && uid === FB.getUidCounter() && text === JSON.stringify(candidate);
        });
    })).toEqual([true,true,true,true,true]);
  });

test('bounded oases keep scenery, dry routes and the original geography',async function ({page},testInfo) {
  await startRegion(page,testInfo,'garama');
  expect(await page.evaluate(function () {
    const g = FB.geography('europe_regional_2'), w = FB.world;
    let bounded = true;
    for (let i = 0; i < w.grid.length; i++) {
      if (!w.grid[i]) continue;
      const p = w.provs[w.grid[i] - 1], dx = i % w.W - p.sx, dy = Math.floor(i / w.W) - p.sy;
      if (dx * dx + dy * dy > p.radiusSq) bounded = false;
    }
    return {bounded:bounded,retained:w.byId.w_sahara_c.wasteland,
      original:FB.geography('europe_regional').provinces.length,
      routes:g.landRoutes.every(function (pair) { return !!w.adj[pair[0]][pair[1]] &&
        !!w.adj[pair[1]][pair[0]] && !w.waterAdj[pair[0]][pair[1]]; })};
  })).toEqual({bounded:true,retained:true,original:498,routes:true});
});

test('an imported fictional geography can expand without replacing its baseline',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const base = JSON.parse(JSON.stringify(FB.bookmark('867','baseline')));
    base.id = 'e2e_revision'; base.hidden = false; base.name = 'Fictional river survey';
    // This fictional campaign does not inherit bookmark-scoped historical faiths.
    base.realms.forEach(function (r) {
      if (r.religion === 'zaydi') r.religion = 'shia';
      if (r.religion === 'ibadi') r.religion = 'sunni';
    });
    base.revision = 'survey';
    base.starts = [];
    base.revisions = {baseline:{},survey:{geography:'e2e_survey',starts:['e2e_survey_household'],
      startLocations:{e2e_survey_household:['e2e_oasis']}}};
    const county = Object.assign({},base.provinces.find(function (p) { return p.id === 'tripoli'; }),
      {id:'e2e_oasis',name:'Small basin'});
    // The new county generates its own sites instead of copying Tripoli's ids.
    delete county.settlements;
    const start = {id:'e2e_survey_household',name:'Basin household',desc:'A local beginning.',
      bookmarkIds:['e2e_revision'],fixedProvinceId:'e2e_oasis',startCulture:county.culture,
      startReligion:county.religion,tier:0,profession:'farmer',gold:5,prestige:0,piety:0,
      intro:'You are {name} of {province}.'};
    const mod = {name:'Revision survey fixture',geographies:{e2e_survey:{extends:'europe_regional',
      provinceAdditions:[{id:'e2e_oasis',name:'Small basin',x:9,y:28,terrain:'desert',maxRadiusKm:35}],
      landRoutes:[['tripoli','e2e_oasis',4]]}},bookmarks:{e2e_revision:base},startScenarios:[start]};
    base.revisions.survey.provinces = base.provinces.concat([county]);
    const faults = FB.mods.validate(mod);
    if (faults.length) throw new Error(faults.join('\n'));
    return FB.mods.store(JSON.stringify(mod));
  })).not.toBe(false);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady &&
    !!FBDATA.bookmarks.e2e_revision; });
  expect(await page.evaluate(function () {
    return [FB.bookmark('e2e_revision').geography,FB.bookmark('e2e_revision','baseline').geography,
      FB.geography('e2e_survey').provinces.length,FB.validateBookmark(FBDATA.bookmarks.e2e_revision)];
  })).toEqual(['e2e_survey','europe_regional',499,[]]);
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('e2e_revision',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = {seed:'FICTIONALSURVEY',bookmarkId:'e2e_revision',name:'Review',sex:'m',
          scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'e2e_survey_household'; })};
        FB.game.pickMode = true;
        if (!FB.game.pickProvince(FB.world.byId.e2e_oasis) || !FB.game.pickSettlement({pid:'e2e_oasis',index:0})) {
          reject(new Error('Imported household birthplace was rejected')); return;
        }
        resolve();
      });
    });
  });
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const created = await page.evaluate(function () {
    const source = FB.save.serialize(), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    FB.save.restore(JSON.parse(source));
    return {revision:FB.state.start.revision,geography:FB.activeGeographyId,
      route:FB.landRouteUnits('tripoli','e2e_oasis'),dry:!FB.waterCrossing('tripoli','e2e_oasis'),
      baseline:FB.bookmark('e2e_revision','baseline').provinces.length,
      deterministic:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),save:source};
  });
  expect(created).toMatchObject({revision:'survey',geography:'e2e_survey',route:4,dry:true,baseline:498,deterministic:true});
  await restoreBookmark(page,created.save);
  expect(await page.evaluate(function () { return FB.state.start.revision; })).toBe('survey');
});

test('the retained schema 1 reader rejects new world revisions',async function ({page},testInfo) {
  await startRegion(page,testInfo,'alexandria');
  await page.addScriptTag({path:require('path').join(__dirname,'../support/fixtures/platform-schema-1-reader.js')});
  expect(await page.evaluate(function () {
    const data = JSON.parse(FB.save.serialize());
    return [FB.save.isSupported(data),window.legacyPlatformReader.envelopeIssue(data)];
  })).toEqual([true,'platformSchema']);
});

test('dry corridors charge matching household and host time without water capacity',async function ({page},testInfo) {
  await startRegion(page,testInfo,'garama');
  expect(await page.evaluate(function () {
    const s = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const units = FB.landRouteUnits('garama','tripoli');
    const route = FB.travelRoute('garama','tripoli');
    const base = FB.travelCostSnapshot('service',1,s);
    const long = FB.travelCostSnapshot('service',['tripoli'],s);
    const t = {currentId:'garama',remainingRoute:['tripoli'],legDays:3};
    const army = {realm:'garama_local_476',men:100};
    const host = FB.armyLegQuote(s,army,'garama','tripoli');
    const ordinary = FB.armyLegQuote(s,army,'sirte','tripoli');
    const weighted = FB.travelRouteUnits('garama',route);
    // Least-time routing may choose a cheaper chain of ordinary neighbors.
    // The explicitly reviewed corridor still costs its full seven units.
    return {units:units,next:FB.travelNextLegDays(t),
      weighted:!!route && route[route.length - 1] === 'tripoli' && weighted > 0 && weighted <= units,
      direct:FB.travelRouteUnits('garama',['tripoli']),
      supplies:long > base,dry:!FB.waterCrossing('garama','tripoli'),
      host:!host.water && host.totalDays > ordinary.totalDays,
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({units:7,next:21,weighted:true,direct:7,supplies:true,dry:true,host:true,pure:true});
});

test('invalid geography extensions fail without mutating registries or random state',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA.geographies), rng = FB.getRngState(), uid = FB.getUidCounter();
    const candidates = [
      {extends:'e2e_invalid'},
      {extends:'missing_base'},
      {extends:'europe_regional',provinceAdditions:[{id:'london',x:0,y:51}]},
      {extends:'europe_regional',provinceOverrides:{london:{x:0}}},
      {extends:'europe_regional',provinceAdditions:[{id:'bad_radius',x:0,y:51,maxRadiusKm:-1}]},
      {extends:'europe_regional',landRoutes:[['london','tripoli',0]]},
      {extends:'europe_regional',landRoutes:[['london','tripoli',2],['tripoli','london',3]]}
    ];
    return candidates.map(function (g) {
      const errors = FB.mods.validate({name:'Rejected geography',geographies:{e2e_invalid:g}});
      return errors.length > 0 && before === JSON.stringify(FBDATA.geographies) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual([true,true,true,true,true,true,true]);
});

test('regional starts, border seams, client holders and mobile coalitions share the authored opening',async function ({page},testInfo) {
  await startRegion(page,testInfo,'alexandria');
  const result = await page.evaluate(function () {
    const s = FB.state, b = FB.bookmark('476'), rows = FBDATA.startScenarios;
    const colonus = rows.find(function (r) { return r.id === 'colonus_476'; });
    const farmer = rows.find(function (r) { return r.id === 'farmer_476'; });
    const M = FB.mobile;
    return {
      blocked:['lewis','turku','sarysu_corridor'].every(function (id) { return !FB.startProvinceAllowed(colonus,b,id); }),
      estates:['ravenna','rosetta','fayyum'].every(function (id) { return FB.startProvinceAllowed(colonus,b,id); }),
      free:FBDATA.bookmarkRegions476.wider.provinces.every(function (p) { return FB.startProvinceAllowed(farmer,b,p.id); }),
      ras:[s.owner.ras,s.holder.ras,FB.world.byId.ras.religion,!!FB.world.adj.ras.skopje],
      rosetta:!!s.bookmarkSetup.actors.rosetta_civil_delegate,
      gulf:['qatif','sohar','muscat'].every(function (id) {
        return s.owner[id] === 'sasanian_476' && s.holder[id] !== s.owner[id] &&
          s.realms[s.holder[id]].liege === 'sasanian_476';
      }),
      taman:[s.holder.tmutarakan,FB.world.byId.tmutarakan.culture],
      inland:['vilnius','hame','savo'].every(function (id) {
        return FB.governments.support.profile(s,s.holder[id]).members.every(function (m) { return m.id !== 'shore'; });
      }),
      mobile:['oghur_following_476','saragur_following_476'].every(function (id) {
        return M.row(s,id) && M.total(s,id) > 0 && M.host(s,id).men > 0 &&
          FB.realmHeldCounties(s,id).length === 0 && !s.realms[id].succession;
      })
    };
  });
  expect(result).toEqual({blocked:true,estates:true,free:true,
    ras:['byzantium','byzantium','chalcedonian',true],rosetta:true,gulf:true,
    taman:['taman_coast_476','greek'],inland:true,mobile:true});
});

test('colonus codes, map picks and direct creation reject counties without estate tenure',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  for (const id of ['lewis','turku','sarysu_corridor']) {
    await page.locator('#ng-seed').fill('COLONUS-476-colonus_476-' + id + '-m-Review-established');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    expect(await page.evaluate(function () { return !!FB.state; })).toBe(false);
  }
  await page.locator('#ng-seed').fill('COLONUS-476-colonus_476-fayyum-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    const pick = FB.pick, b = FB.activeBookmark, scenario = FB.game.pending.scenario;
    let candidates = [];
    FB.pick = function (rows) { candidates = rows.map(function (p) { return p.id; }); return rows[0]; };
    try {
      FB.game.pickMode = true; FB.game.pickStage = 'province';
      document.getElementById('btn-pick-random').click();
    } finally { FB.pick = pick; }
    return candidates.length > 0 && candidates.every(function (id) { return FB.startProvinceAllowed(scenario,b,id); }) &&
      ['lewis','turku','sarysu_corridor'].every(function (id) { return candidates.indexOf(id) < 0; });
  })).toBe(true);
  expect(await page.evaluate(function () {
    const rng = FB.getRngState(), uid = FB.getUidCounter(), pending = JSON.stringify(FB.game.pending);
    const rejected = !FB.game.pickProvince(FB.world.byId.lewis);
    const unchanged = pending === JSON.stringify(FB.game.pending);
    FB.game.pending.provinceId = 'turku';
    const denied = FB.game.start() === false;
    return rejected && unchanged && denied && !FB.state && rng === FB.getRngState() && uid === FB.getUidCounter();
  })).toBe(true);
});

test('wider lineage death and negotiated succession survive a checkpoint without replay',async function ({page},testInfo) {
  await startRegion(page,testInfo,'tara');
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'tara_local_476';
    const ruler = FB.materializeRealmRuler(s,rid), tree = s.realms[rid].succession;
    const generation = tree.rulerGeneration, property = JSON.stringify([s.owner,s.holder,s.player.holdings]);
    FB.treasuryCredit(s,rid,100); FB.setCountySupport(s,'tara',-100);
    FB.killChar(s,ruler);
    const vacancy = S.state(s,rid).vacancy;
    const unresolved = vacancy.cause === 'death' && vacancy.status === 'contested';
    const source = FB.save.serialize(); FB.save.restore(JSON.parse(source));
    const restored = FB.state;
    FB.setCountySupport(restored,'tara',40);
    const candidate = S.candidates(restored,rid)[0], actor = {kind:'realm',id:rid};
    const paid = S.apply(restored,S.quote(restored,rid,{action:'negotiate',actor:actor,
      candidateId:candidate,terms:S.profile(restored,rid).terms}));
    const q = S.quote(restored,rid,{action:'resolve',actor:actor});
    const accepted = S.apply(restored,q), after = JSON.stringify(restored), rng = FB.getRngState(), uid = FB.getUidCounter();
    const repeat = S.apply(restored,q);
    return {unresolved:unresolved,paid:paid,accepted:accepted,repeat:repeat,
      once:restored.realms[rid].succession.rulerGeneration === generation + 1,
      pure:after === JSON.stringify(restored) && rng === FB.getRngState() && uid === FB.getUidCounter(),
      property:property === JSON.stringify([restored.owner,restored.holder,restored.player.holdings]),
      recognized:!!S.recognized(restored,rid)};
  });
  expect(result).toEqual({unresolved:true,paid:true,accepted:true,repeat:false,once:true,pure:true,property:true,recognized:true});
});

test('an inland delegate dies while local rights and a new mandate remain distinct',async function ({page},testInfo) {
  await startRegion(page,testInfo,'hame');
  expect(await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support, rid = s.holder.hame;
    const row = C.row(s,rid), old = C.delegate(s,rid), generation = row.mandate.generation;
    const land = JSON.stringify([s.owner,s.holder,s.player.holdings]);
    FB.killChar(s,old);
    const next = C.delegate(s,rid), id = next && next.id, mandate = row.mandate.id;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    C.tick(FB.state,rid);
    return !!next && id !== old.id && C.delegate(FB.state,rid).id === id &&
      C.row(FB.state,rid).mandate.generation === generation + 1 && C.row(FB.state,rid).mandate.id === mandate &&
      !FB.state.realms[rid].succession && land === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.player.holdings]);
  })).toBe(true);
});

test('Saragur defeat conserves surviving households and permits paid recovery',async function ({page},testInfo) {
  await startRegion(page,testInfo,'sarkel');
  const result = await page.evaluate(function () {
    const s = FB.state, M = FB.mobile, rid = 'saragur_following_476', row = M.row(s,rid);
    const before = M.total(s,rid), owners = JSON.stringify(s.owner), army = M.host(s,rid), loss = army.men;
    FB.applyHostLosses(army,loss,s); FB.disbandArmy(s,army);
    const survivors = M.total(s,rid), dead = row.accounting.dead;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const next = FB.state;
    FB.federatePrepareDay(next); FB.federateDay(next); FB.federatePrepareDay(next);
    const unchanged = survivors === M.total(next,rid) && dead === M.row(next,rid).accounting.dead;
    const q = M.review(next,{realmId:rid,action:'recruit',terms:{count:20,unitId:FB.unitRoleClass('levy_infantry')},actor:{kind:'realm',id:rid}});
    const gold = FB.treasuryAvailable(next,rid), recovered = M.commit(next,q);
    return {loss:loss,dead:dead,conserved:before === survivors + dead,unchanged:unchanged,recovered:recovered,
      cost:gold - FB.treasuryAvailable(next,rid),quote:q.review.cost,host:M.host(next,rid).men,
      people:M.total(next,rid) === survivors,land:owners === JSON.stringify(next.owner),alive:next.realms[rid].alive};
  });
  expect(result).toMatchObject({conserved:true,unchanged:true,recovered:true,host:20,people:true,land:true,alive:true});
  expect(result.dead).toBeGreaterThanOrEqual(result.loss);
  expect(result.cost).toBeCloseTo(result.quote,8);
});

test('mixed governments keep consent and levy obligations separate through occupation',async function ({page},testInfo) {
  await startRegion(page,testInfo,'sarkel');
  const result = await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support, rid = 'lower_don_476', foreign = 'taman_coast_476';
    const actor = {kind:'realm',id:rid}, terms = {amount:2,duration:90};
    FB.treasuryCredit(s,rid,100); FB.setCountySupport(s,'sarkel',40);
    const blocked = !FB.political.consent(s,actor,'extraordinary_tax',terms).allowed;
    const approved = C.assent(s,C.assentQuote(s,rid,'extraordinary_tax',terms));
    const local = FB.political.consent(s,actor,'extraordinary_tax',terms).allowed;
    const foreignBlocked = !C.consent(s,rid,{kind:'realm',id:foreign},'extraordinary_tax',terms).allowed;
    const levies = ['lower_don_476','taman_coast_476','sasanian_476','saragur_following_476'].map(function (id) {
      return FB.aiBaseHost(s,id);
    });
    const property = JSON.stringify([s.player.holdings,s.communities,s.authority.rights]);
    const reviewed = C.assentQuote(s,rid,'extraordinary_tax',{amount:3,duration:90});
    FB.transferProvince(s,'sarkel',foreign);
    const occupied = s.owner.sarkel === foreign && s.holder.sarkel === rid && s.realms[rid].alive;
    const changed = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const stale = !C.assent(s,reviewed) && changed === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const denied = !FB.political.consent(s,actor,'extraordinary_tax',terms).allowed && FB.aiBaseHost(s,rid) === 0;
    const source = FB.save.serialize(); FB.save.restore(JSON.parse(source));
    return {blocked:blocked,approved:approved,local:local,foreignBlocked:foreignBlocked,levies:levies,
      cap:C.profile(s,rid).obligations.maxLevy,occupied:occupied,stale:stale,denied:denied,
      restore:FB.state.owner.sarkel === foreign && FB.state.holder.sarkel === rid && FB.aiBaseHost(FB.state,rid) === 0,
      property:property === JSON.stringify([FB.state.player.holdings,FB.state.communities,FB.state.authority.rights])};
  });
  expect(result).toMatchObject({blocked:true,approved:true,local:true,foreignBlocked:true,occupied:true,stale:true,denied:true,restore:true,property:true});
  expect(result.levies.every(function (n) { return Number.isFinite(n) && n >= 0; })).toBe(true);
  expect(result.levies[0]).toBeGreaterThan(0);
  expect(result.levies[0]).toBeLessThanOrEqual(result.cap);
  expect(result.levies[1]).toBeGreaterThan(0);
  expect(result.levies[2]).toBeGreaterThan(0);
  expect(result.levies[3]).toBe(0);
});

for (const target of ['867','baseline']) test('expanded campaign restores while ' + target + ' geography is active',async function ({page},testInfo) {
  await startRegion(page,testInfo,'garama');
  expect(await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support, rid = 'jenne_district_local_476';
    FB.treasuryCredit(s,rid,100); FB.setCountySupport(s,'jenne_district',40);
    return C.assent(s,C.assentQuote(s,rid,'war',{causes:[{
      type:'aggression',enemy:'gao_district_local_476',target:'gao_district'}]}));
  })).toBe(true);
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  const before = await facts(page);
  await page.evaluate(function (target) {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark(target === 'baseline' ? '476' : target,null,function (error) {
        if (error) reject(error); else resolve();
      },target === 'baseline' ? {revision:'baseline'} : {});
    });
  },target);
  expect(await page.evaluate(function () { return !!FB.world.byId.garama; })).toBe(false);
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
  expect(await page.evaluate(function () { return [FB.activeGeographyId,FB.state.start.revision]; }))
    .toEqual(['europe_regional_2','wider_v2']);
});

test('revision-only counties, titles, starts and story parties participate in catalogue validation',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const raw = FBDATA.bookmarks['476'], wider = raw.revisions.wider_v2;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const before = JSON.stringify(FBDATA.bookmarks);
    const titles = ['476_egypt','476_crete','476_cyprus','476_pontus'].every(function (id) {
      return FB.titleIds.known('duchy',id);
    }) && FB.titleIds.known('kingdom','476_egypt');
    const tenure = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
    tenure.roman_estate.selector.provinceIdsAny = ['garama','sarysu_corridor'];
    let counties = true;
    try { FB.validateTenureData(tenure); } catch (error) { counties = false; }
    tenure.roman_estate.selector.provinceIdsAny = ['missing_district'];
    let badCounty = false;
    try { FB.validateTenureData(tenure); } catch (error) { badCounty = true; }
    const id = 'e2e_revision_agreement', savedStories = wider.stories, savedRealms = wider.realms;
    const def = {id:id,type:'tribute_cession',name:'District agreement',desc:'Two local courts agree.',
      firstYear:476,lastYear:490,actor:{realmId:'garama_local_476'},source:{realmId:'awjila_oasis_local_476'},
      countyIds:['garama'],retainedCountyIds:['awjila_oasis'],tribute:1,intervalDays:360};
    let agreement, badAgreement, technology;
    try {
      wider.stories = (wider.stories || raw.stories || []).concat([id]);
      agreement = FB.stories.definitionFaults(def).length === 0;
      def.countyIds = ['missing_district'];
      badAgreement = FB.stories.definitionFaults(def).length > 0;
      wider.realms = savedRealms.map(function (r) {
        return r.id === 'garama_local_476' ? Object.assign({},r,{techSeed:{complete:['e2e_missing_tech']}}) : r;
      });
      technology = FB.validateTechnologyData(true).some(function (error) {
        return error.indexOf('garama_local_476') >= 0 && error.indexOf('e2e_missing_tech') >= 0;
      });
    } finally {
      if (savedStories === undefined) delete wider.stories; else wider.stories = savedStories;
      wider.realms = savedRealms;
    }
    const invalidStarts = [{colonus_476:['missing_district']},{colonus_476:['w_sahara_c']},
      {missing_start:['fayyum']},{colonus_476:'fayyum'},{colonus_476:['fayyum','fayyum']}].map(function (policy) {
      const candidate = JSON.parse(JSON.stringify(raw));
      candidate.revisions.wider_v2.startLocations = policy;
      return FB.validateBookmark(candidate).some(function (error) { return error.indexOf('startLocations') >= 0; });
    });
    const disabled = JSON.parse(JSON.stringify(raw));
    disabled.revisions.wider_v2.startLocations.curialis_476 = [];
    const disabledBookmark = FB.bookmarkRevisions('476',disabled).find(function (b) { return b.revision === 'wider_v2'; });
    const curialis = FBDATA.startScenarios.find(function (s) { return s.id === 'curialis_476'; });
    const disabledStart = FB.validateBookmark(disabled).length === 0 &&
      !FB.startProvinceAllowed(curialis,disabledBookmark,'ravenna');
    const disabledImport = FB.mods.validate({bookmarks:{'476':disabled},startScenarios:[curialis]});
    const invalidTrack = JSON.parse(JSON.stringify(curialis));
    invalidTrack.trackLocations.curialis_track_476 = ['missing_district'];
    const invalidDisabledImport = FB.mods.validate({bookmarks:{'476':disabled},startScenarios:[invalidTrack]});
    const restricted = JSON.parse(JSON.stringify(disabled));
    restricted.revisions.wider_v2.startLocations.curialis_476 = ['paris'];
    const excludedTrack = FB.validateBookmark(restricted).some(function (error) {
      return error.indexOf('curialis_track_476') >= 0 && error.indexOf('ravenna') >= 0;
    });
    return {titles:titles,counties:counties,badCounty:badCounty,agreement:agreement,badAgreement:badAgreement,
      technology:technology,invalidStarts:invalidStarts,disabledStart:disabledStart,
      disabledImport:disabledImport,excludedTrack:excludedTrack,
      invalidDisabledImport:invalidDisabledImport.some(function (error) {
        return /missing_district/.test(error);
      }),
      pure:before === JSON.stringify(FBDATA.bookmarks) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({titles:true,counties:true,badCounty:true,agreement:true,badAgreement:true,
      technology:true,invalidStarts:[true,true,true,true,true],disabledStart:true,
      disabledImport:[],excludedTrack:true,invalidDisabledImport:true,pure:true});
});

test('parentless wider cultures satisfy the 476 appearance requirements',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const ids = ['vistula_476','dnieper_476','oghuric_476','horn_coastal_476',
      'indus_476','sahelian_476','central_steppe_476'];
    const faults = FB.validateBookmark(FBDATA.bookmarks['476']);
    return {faults:faults,profiles:ids.map(function (id) {
      const resolved = FB.cultureValue(null,id,'appearance'), look = resolved.value;
      return {id:id,source:resolved.sourceId,independent:!FBDATA.cultures[id].parent,
        complete:!!look && ['tone','fair','red'].every(function (key) {
          return typeof look[key] === 'number' && isFinite(look[key]) &&
            look[key] >= 0 && look[key] <= (key === 'tone' ? 4 : 1);
        })};
    })};
  });
  expect(result.faults).toEqual([]);
  expect(result.profiles).toHaveLength(7);
  for (const profile of result.profiles) {
    expect(profile,profile.id).toEqual({id:profile.id,source:profile.id,independent:true,complete:true});
  }
});

test('generated wider identities exclude named historical incumbents and unrelated culture parents',async function ({page},testInfo) {
  await startRegion(page,testInfo,'alexandria');
  expect(await page.evaluate(function () {
    const banned = ['Felethus','Giso','Gibuld','Sharhabil','Mundhir','Aswad','Khingila','Mihira',
      'Aspar','Ardabur','Goar','Sangiban','Ezana','Ousanas','Aphilas','Wulfila','Vishnu','Samir','Adal'];
    const pools = Object.keys(FBDATA.bookmarkCultures476Wider).every(function (id) {
      return ['m','f'].every(function (sex) {
        const names = FB.cultureNamePool(id,sex,FB.state);
        return names.length > 0 && names.every(function (name) { return banned.indexOf(name) < 0; });
      });
    });
    return pools && ['vistula_476','indus_476','horn_coastal_476'].every(function (id) {
      return !FBDATA.bookmarkCultures476Wider[id].parent;
    });
  })).toBe(true);
});

test('expanded observer checkpoints retain the existing budgets',async function ({page},testInfo) {
  test.skip(testInfo.project.name !== 'chromium-served','Owner-run observer measurement.');
  await startRegion(page,testInfo,'alexandria');
  await injectBrowserHarness(page);
  await page.evaluate(function () { FB.game.observe = true; });
  for (let slice = 0; slice < 2; slice++) {
    const began = Date.now();
    await advanceBookmark(page,45);
    const elapsed = Date.now() - began;
    await testInfo.attach('observer-' + slice + '-timing.json',{contentType:'application/json',
      body:Buffer.from(JSON.stringify({days:45,elapsedMs:elapsed,ceilingMs:30000}))});
    expect(elapsed).toBeLessThanOrEqual(30000);
    await saveBudget(page,testInfo,'observer-' + slice,8 * 1024 * 1024);
  }
});

test('open federate and curialis roles begin where their institutions live and attach the Ravenna story only there',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    const rules = await page.evaluate(function () {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const rows = FBDATA.startScenarios;
      const federate = rows.find(function (r) { return r.id === 'federate_476'; });
      const curialis = rows.find(function (r) { return r.id === 'curialis_476'; });
      function check(b) {
        const settled = {};
        b.provinces.forEach(function (p) { if (!p.wasteland) settled[p.id] = true; });
        const camps = b.realms.filter(function (r) { return r.government === 'federate_polity'; })
          .map(function (r) { return r.capital; }).concat(['ravenna']);
        const councils = Object.keys(b.localInstitutions || {}).map(function (id) { return b.localInstitutions[id]; })
          .filter(function (d) { return d.kind === 'council' && d.provinceId; }).map(function (d) { return d.provinceId; });
        const allowed = function (start) {
          return b.provinces.filter(function (p) { return FB.startProvinceAllowed(start,b,p.id); })
            .map(function (p) { return p.id; }).sort();
        };
        const unique = function (ids) {
          return ids.filter(function (id, i) { return settled[id] && ids.indexOf(id) === i; }).sort();
        };
        return {federate:JSON.stringify(allowed(federate)) === JSON.stringify(unique(camps)),
          curialis:JSON.stringify(allowed(curialis)) === JSON.stringify(unique(councils)),
          several:allowed(federate).length > 1 && allowed(curialis).length > 1,
          ravenna:FB.startProvinceAllowed(federate,b,'ravenna') && FB.startProvinceAllowed(curialis,b,'ravenna')};
      }
      const wider = FB.bookmark('476'), baseline = FB.bookmark('476','baseline');
      const away = wider.startLocations.federate_476.filter(function (id) { return id !== 'ravenna'; })[0];
      const civic = wider.startLocations.curialis_476.filter(function (id) { return id !== 'ravenna'; })[0];
      return {wider:check(wider),baseline:check(baseline),away:away,
        tracks:[FB.startTracks(federate,'ravenna'),FB.startTracks(federate,away),
          FB.startTracks(curialis,'ravenna'),FB.startTracks(curialis,civic)],
        unfixed:!federate.fixedProvinceId && !curialis.fixedProvinceId,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    const expected = {federate:true,curialis:true,several:true,ravenna:true};
    expect(rules).toMatchObject({wider:expected,baseline:expected,
      tracks:[['federate_track_476'],[],['curialis_track_476'],[]],unfixed:true,pure:true});
    await page.evaluate(function () { FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true; });
    await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#bookmarklist .scencard',{hasText:/\b476:/}).click();
    await expect(page.locator('#scenariolist .scen-group')).toHaveText(['Historical starts','Open starts']);
    await page.locator('#scenariolist .scencard',{hasText:'Federate Soldier'}).click();
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function (id) {
      return FB.game.pickProvince(FB.world.byId[id]) && FB.game.pickSettlement({pid:id,index:0});
    },rules.away)).toBe(true);
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.evaluate(function () { FB.game.setPaused(true); });
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function () {
      const s = FB.state;
      return {province:s.player.provinceId,scenario:s.telemetry.scenario,
        western:!!s.stories.western_court_476,track:!!s.stories.federate_track_476};
    })).toEqual({province:rules.away,scenario:'federate_476',western:true,track:false});
  });
