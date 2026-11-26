'use strict';
const { test, expect } = require('../support/fixture');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { prepareGameContent } = require('../support/game/navigation');
const { importWorld, bootStoredWorld, startRuler, startHousehold } = require('../support/game/opening-infrastructure');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/relay_services.js','js/relay_services.js',
  'data/building_profiles.js','js/building_profiles.js',
  'index.html', 'js/world.js', 'js/main.js', 'js/starts.js', 'js/fortifications.js',
  'js/save.js', 'js/save_v4.js', 'js/actions.js', 'js/treasury.js', 'js/population.js',
  'js/market.js', 'js/lordships.js', 'js/governments.js', 'js/government_administration.js',
  'js/mods.js', 'js/model.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

test('late live-site and holder failures publish neither a valid prefix nor a marker', async function ({ page }, info) {
  await importWorld(page, info, 'estuary');
  await startHousehold(page, 'estuary');
  const results = await page.evaluate(function () {
    return ['site', 'holder', 'existing', 'economic'].map(function (kind) {
      const candidate = JSON.parse(JSON.stringify(FB.state));
      delete candidate.openingInfrastructureState;
      delete candidate.population; delete candidate.market; delete candidate.treasuryAccounting;
      candidate.buildings = {};
      const site = FB.world.sitesByProv.inventory_ridge.list[0];
      const originalSite = site.site;
      if (kind === 'site') site.site = 'wrong_inventory_site';
      if (kind === 'holder') candidate.holder.inventory_ridge = 'inventory_estuary_court';
      if (kind === 'existing') candidate.buildings.inventory_quay = [{ id:'inventory_yard', s:1 }];
      if (kind === 'economic') candidate.population = {};
      const before = JSON.stringify(candidate), live = JSON.stringify(FB.state);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      let rejected = false;
      try { FB.initializeOpeningInfrastructure(candidate); } catch (error) { rejected = /Opening infrastructure/.test(error.message); }
      finally { site.site = originalSite; }
      return { rejected:rejected, unchanged:before === JSON.stringify(candidate), live:live === JSON.stringify(FB.state),
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter() };
    });
  });
  expect(results).toEqual(Array(4).fill({ rejected:true, unchanged:true, live:true, rng:true, uid:true }));
});

test('strict optional marker rejects mismatched primitive schemas without changing accepted state', async function ({ page }, info) {
  await importWorld(page, info, 'estuary');
  await startHousehold(page, 'estuary');
  const result = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
    const marker = saved.state.openingInfrastructureState;
    const cases = [null, [], {}, Object.assign({}, marker, { version:'1' }),
      Object.assign({}, marker, { version:2 }), Object.assign({}, marker, { explicit:false }),
      Object.assign({}, marker, { bookmarkId:'1066' }), Object.assign({}, marker, { revision:'baseline' }),
      Object.assign({}, marker, { revision:0 }), Object.assign({}, marker, { applied:1 })];
    const faults = cases.map(function (bad) {
      const candidate = JSON.parse(JSON.stringify(saved));
      candidate.state.openingInfrastructureState = bad;
      const source = JSON.stringify(candidate);
      let rejected = false;
      try { FB.save.v4.migrate(candidate); } catch (error) { rejected = /openingInfrastructureState/.test(error.message); }
      return rejected && source === JSON.stringify(candidate);
    });
    return { faults:faults, pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() &&
      uid === FB.getUidCounter() && storage === JSON.stringify(localStorage) };
  });
  expect(result).toEqual({ faults:Array(10).fill(true), pure:true });
});

test('demolition, ordinary paid repair and county transfer survive restore without seed replay', async function ({ page }, info) {
  await importWorld(page, info, 'estuary');
  await startRuler(page);
  const before = await page.evaluate(function () {
    const s = FB.state, dev = s.dev.inventory_quay;
    const repair = FB.repairBuildingStatus(s, 'inventory_quay', 0, 'inventory_workshop');
    s.player.gold += repair.cost;
    const gold = s.player.gold;
    const repaired = FB.repairBuilding(s, 'inventory_quay', 0, 'inventory_workshop', repair.cost);
    const removed = FB.demolishBuilding(s, 'inventory_quay', 1, 'inventory_yard');
    FB.transferProvince(s, 'inventory_quay', 'inventory_ridge_court');
    FB.repairForts(s);
    return { ready:repair.ready, repaired:repaired, charged:gold - s.player.gold, cost:repair.cost,
      removed:removed, dev:dev, currentDev:s.dev.inventory_quay,
      owner:s.owner.inventory_quay, holder:s.holder.inventory_quay,
      buildings:JSON.parse(JSON.stringify(s.buildings)), marker:s.openingInfrastructureState,
      rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), save:FB.save.serialize() };
  });
  expect(before).toMatchObject({ ready:true, repaired:true, removed:true });
  expect(before.charged).toBeCloseTo(before.cost, 8);
  expect(before.currentDev).toBe(before.dev);
  expect(before.holder).toBe('inventory_ridge_court');
  await restoreBookmark(page, before.save);
  expect(await page.evaluate(function () {
    const s = FB.state;
    FB.repairForts(s); FB.initializeOpeningInfrastructure(s);
    return { buildings:s.buildings, marker:s.openingInfrastructureState,
      holder:s.holder.inventory_quay, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter() };
  })).toEqual({ buildings:before.buildings, marker:before.marker, holder:before.holder, rng:before.rng, uid:before.uid });
});

test('legacy explicit-world save without a marker keeps legacy fort repair and never acquires seed buildings', async function ({ page }, info) {
  await importWorld(page, info, 'estuary');
  await startHousehold(page, 'estuary');
  const source = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    delete saved.state.openingInfrastructureState; delete saved.state.fortMigration;
    saved.state.buildings = {};
    return JSON.stringify(saved);
  });
  await restoreBookmark(page, source);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { marker:s.openingInfrastructureState, migration:s.fortMigration,
      inferred:!!FB.fortAt(s, 'inventory_quay'),
      seeded:Object.values(s.buildings).some(function (rows) {
        return rows.some(function (r) { return r.id === 'inventory_store' || r.id === 'inventory_workshop'; });
      }) };
  })).toEqual({ marker:undefined, migration:1, inferred:true, seeded:false });
});

test('removing the ordinary imported world rejects its marked save without adopting or recreating assets', async function ({ page }, info) {
  // The other cases import through the Mods screen; this one tests only removal.
  await bootStoredWorld(page, info, 'estuary');
  await startHousehold(page, 'estuary');
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () { FB.mods.clear(); })]);
  await prepareGameContent(page);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && !FBDATA.bookmarks.inventory_estuary;
  });
  expect(await page.evaluate(function (text) {
    const source = JSON.parse(text), live = FB.state, before = JSON.stringify(live);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), storage = JSON.stringify(localStorage);
    let rejected = false;
    try { FB.save.restore(source); } catch (error) { rejected = /different mod|Missing bookmark/.test(error.message); }
    return { mismatch:FB.save.otherWorld(source), rejected:rejected,
      pure:FB.state === live && before === JSON.stringify(FB.state) && rng === FB.getRngState() &&
        uid === FB.getUidCounter() && storage === JSON.stringify(localStorage) };
  }, saved)).toEqual({ mismatch:true, rejected:true, pure:true });
});
