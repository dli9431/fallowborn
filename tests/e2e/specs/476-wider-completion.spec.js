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
  'data/assembly_polities.js','data/starts.js',
  'js/world.js','js/model.js','js/save.js','js/save_v4.js','js/main.js','js/mods.js',
  'js/bookmark_setup.js','js/government_aristocracy.js','js/government_support.js',
  'js/government_collective.js','js/institutions.js','js/population.js','js/stories.js','js/religion.js',
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
      old:['europe_regional','wider_v1',498],newCount:523,kept:true,deterministic:true,
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
    const base = JSON.parse(JSON.stringify(FB.bookmark('867')));
    base.id = 'e2e_revision'; base.hidden = true; base.name = 'Fictional river survey';
    base.revision = 'survey';
    base.revisions = {baseline:{},survey:{geography:'e2e_survey'}};
    const mod = {name:'Revision survey fixture',geographies:{e2e_survey:{extends:'europe_regional',
      provinceAdditions:[{id:'e2e_oasis',name:'Small basin',x:9,y:28,terrain:'desert',maxRadiusKm:35}],
      landRoutes:[['tripoli','e2e_oasis',4]]}},bookmarks:{e2e_revision:base}};
    base.revisions.survey.provinces = base.provinces.concat([{id:'e2e_oasis',name:'Small basin',wasteland:true}]);
    return FB.mods.store(JSON.stringify(mod));
  })).not.toBe(false);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady &&
    !!FBDATA.bookmarks.e2e_revision; });
  expect(await page.evaluate(function () {
    return [FB.bookmark('e2e_revision').geography,FB.bookmark('e2e_revision','baseline').geography,
      FB.geography('e2e_survey').provinces.length,FB.validateBookmark(FBDATA.bookmarks.e2e_revision)];
  })).toEqual(['e2e_survey','europe_regional',499,[]]);
  const created = await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('e2e_revision',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = {seed:'FICTIONAL-SURVEY'};
        FB.game.startObserve(); FB.game.setPaused(true);
        const source = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
        FB.save.restore(JSON.parse(source));
        resolve({revision:FB.state.start.revision,geography:FB.activeGeographyId,
          route:FB.landRouteUnits('tripoli','e2e_oasis'),
          dry:!FB.waterCrossing('tripoli','e2e_oasis'),
          deterministic:rng === FB.getRngState() && uid === FB.getUidCounter(),
          save:source});
      });
    });
  });
  expect(created).toMatchObject({revision:'survey',geography:'e2e_survey',route:4,dry:true,deterministic:true});
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
    return {units:units,next:FB.travelNextLegDays(t),weighted:FB.travelRouteUnits('garama',route) >= 7,
      supplies:long > base,dry:!FB.waterCrossing('garama','tripoli'),
      host:!host.water && host.totalDays > ordinary.totalDays,
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({units:7,next:21,weighted:true,supplies:true,dry:true,host:true,pure:true});
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
