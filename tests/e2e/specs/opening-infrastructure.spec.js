'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/relay_services.js','js/relay_services.js',
  'data/building_profiles.js','js/building_profiles.js',
  'index.html', 'js/world.js', 'js/main.js', 'js/starts.js', 'js/fortifications.js',
  'js/save.js', 'js/save_v4.js', 'js/actions.js', 'js/treasury.js', 'js/population.js',
  'js/market.js', 'js/lordships.js', 'js/governments.js', 'js/government_administration.js',
  'js/mods.js', 'js/model.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

const fixtureDirectory = path.resolve(__dirname, '../fixtures/authoring');

async function importWorld(page, info, name, revision) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(fixtureDirectory,
    'opening-infrastructure-' + name + '.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function (name) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['inventory_' + name];
  }, name);
  await page.evaluate(function (input) {
    if (input.revision) FBDATA.bookmarks['inventory_' + input.name].revision = input.revision;
    window.__inventoryBoot = { applies:[], projections:[] };
    const initialize = FB.initializeOpeningInfrastructure;
    FB.initializeOpeningInfrastructure = function (s) {
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const result = initialize(s);
      const after = JSON.parse(JSON.stringify(s));
      delete after.openingInfrastructureState;
      after.buildings = JSON.parse(before).buildings;
      window.__inventoryBoot.applies.push({ applied:result,
        onlyLedger:JSON.stringify(after) === before,
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
        adopted:!!s.realms.player, owner:s.holder.inventory_quay,
        records:Object.values(s.buildings).reduce(function (n, rows) { return n + rows.length; }, 0) });
      return result;
    };
    ['ensurePopulationState', 'ensureMarket', 'treasuryInitialize'].forEach(function (key) {
      const original = FB[key];
      FB[key] = function (s, options) {
        if (!window.__inventoryBoot.projections.some(function (row) { return row.key === key; })) {
          window.__inventoryBoot.projections.push({ key:key, marker:!!s.openingInfrastructureState,
            records:Object.values(s.buildings).reduce(function (n, rows) { return n + rows.length; }, 0) });
        }
        return original(s, options);
      };
    });
  }, { name:name, revision:revision });
}

async function startRuler(page) {
  await page.evaluate(function () { FB.startProgression.noteTier(7); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('[data-bookmark="inventory_estuary"]').click();
  await page.locator('[data-scenario="inventory_estuary_ruler"]').click();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

// Keep this imported page alive so the boot observations precede the real start.
// The shared beginBookmark journey intentionally reloads the page.
async function startHousehold(page, name) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const home = name === 'estuary' ? 'inventory_quay' : 'inventory_vale';
  await page.locator('#ng-seed').fill('INVENTORY-inventory_' + name + '-inventory_' + name + '_household-' + home + '-m-Review-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

async function startObserver(page, name) {
  await page.evaluate(function (id) {
    return new Promise(function (resolve, reject) {
      FB.activateBookmark(id, null, function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = { seed:'INVENTORY-OBSERVER', bookmarkId:id };
        if (FB.game.startObserve() === false) { reject(new Error('Observer start rejected.')); return; }
        FB.game.setPaused(true); resolve();
      });
    });
  }, 'inventory_' + name);
}

for (const name of ['estuary', 'uplands']) {
  test(name + ' ordinary import installs inherited works before all fresh economic setup', async function ({ page }, info) {
    await importWorld(page, info, name);
    await startHousehold(page, name);
    const result = await page.evaluate(function () {
      const s = FB.state, plan = FB.compileOpeningInfrastructure(FB.campaignBookmark(s));
      const expected = {};
      plan.placements.forEach(function (p) {
        const row = { s:p.s, id:p.buildingId, devGranted:0 };
        if (p.condition === 'ruined') row.ruined = true;
        if (p.level !== undefined) row.level = p.level;
        (expected[p.countyId] || (expected[p.countyId] = [])).push(row);
      });
      const initial = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const repeated = FB.initializeOpeningInfrastructure(s);
      FB.repairForts(s); FB.repairForts(s);
      return { boot:window.__inventoryBoot, buildings:s.buildings, expected:expected,
        marker:s.openingInfrastructureState, repeated:repeated,
        unchanged:initial === JSON.stringify(s), rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
        migration:s.fortMigration, count:s.population.counties[Object.keys(expected)[0]].count,
        capacity:FB.countyBuildingCapacityBonus(s, Object.keys(expected)[0]),
        dev:s.dev[Object.keys(expected)[0]], review:FBDATA.techImpactReviews.features.inherited_opening_infrastructure.mode };
    });
    expect(result.buildings).toEqual(result.expected);
    expect(result.boot.applies[0]).toMatchObject({ applied:true, onlyLedger:true, rng:true, uid:true, records:4 });
    expect(result.boot.projections).toHaveLength(3);
    result.boot.projections.forEach(function (row) { expect(row).toMatchObject({ marker:true, records:4 }); });
    expect(result.marker).toEqual({ version:1, explicit:true, bookmarkId:'inventory_' + name,
      revision:name === 'estuary' ? 'inherited' : 'baseline' });
    expect(result).toMatchObject({ repeated:false, unchanged:true, rng:true, uid:true, review:'none' });
    expect(result.migration).toBeUndefined();
    if (name === 'estuary') { expect(result.capacity).toBe(0.2); expect(result.dev).toBe(3); }
    const saved = await page.evaluate(function () { return FB.save.serialize(); });
    await restoreBookmark(page, saved);
    expect(await page.evaluate(function () { return FB.state.buildings; })).toEqual(result.expected);
  });
}

test('observer boot uses the same complete ledger and matching restore does not replay it', async function ({ page }, info) {
  await importWorld(page, info, 'uplands');
  await startObserver(page, 'uplands');
  const before = await page.evaluate(function () {
    return { buildings:FB.state.buildings, marker:FB.state.openingInfrastructureState,
      population:FB.state.population, boot:window.__inventoryBoot, save:FB.save.serialize() };
  });
  expect(before.boot.applies[0]).toMatchObject({ onlyLedger:true, rng:true, uid:true, records:4 });
  before.boot.projections.forEach(function (row) { expect(row).toMatchObject({ marker:true, records:4 }); });
  await restoreBookmark(page, before.save);
  expect(await page.evaluate(function () {
    return { buildings:FB.state.buildings, marker:FB.state.openingInfrastructureState,
      population:FB.state.population, applies:window.__inventoryBoot.applies.length };
  })).toEqual({ buildings:before.buildings, marker:before.marker, population:before.population, applies:1 });
});

test('adopted ruler receives one ordinary inventory and reserves projected from its complete ledger', async function ({ page }, info) {
  await importWorld(page, info, 'estuary');
  await startRuler(page);
  const result = await page.evaluate(function () {
    const s = FB.state, boot = window.__inventoryBoot;
    const fiscal = FB.treasurySnapshot(s, { openingPlayer:true }).rows.player;
    const net = fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - Math.max(0, fiscal.government);
    const expectedGold = Math.max(FBDATA.balance.aiTreasuryOpeningFloor[s.realms.player.rank],
      Math.max(0, net) * FBDATA.balance.aiTreasuryOpeningSeasons);
    const gold = s.player.gold;
    FB.treasuryInitialize(s, { adoptedPlayer:true });
    return { boot:boot, oldRealm:!!s.realms.inventory_estuary_court,
      holder:s.holder.inventory_quay, gold:s.player.gold, expectedGold:expectedGold,
      repeatedGold:gold === s.player.gold,
      upkeep:fiscal.upkeep, playerTreasury:s.realms.player.treasury,
      dev:s.dev.inventory_quay, count:s.buildings.inventory_quay.length };
  });
  expect(result.boot.applies[0]).toMatchObject({ adopted:true, owner:'player', onlyLedger:true, rng:true, uid:true });
  expect(result).toMatchObject({ oldRealm:false, holder:'player', dev:3, count:3, repeatedGold:true });
  expect(result.gold).toBeCloseTo(result.expectedGold, 8);
  expect(result.upkeep).toBeGreaterThanOrEqual(2);
  expect(result.playerTreasury).toBeUndefined();
  // Stage the later declaration boundary directly. No daily simulation is needed.
  expect(await page.evaluate(function () {
    const s = FB.state;
    s.realms.inventory_ridge_court.liege = null;
    s.owner.inventory_marsh = 'inventory_ridge_court';
    s.holder.inventory_marsh = 'inventory_ridge_court';
    s.player.provs = s.player.provs.filter(function (id) { return id !== 'inventory_marsh'; });
    FB.invalidateRealmCache();
    const buildings = JSON.stringify(s.buildings);
    s.date = { year:901, season:0, day:1 }; s.turn = 360;
    FB.scriptedTick(s);
    const after = JSON.stringify(s);
    FB.scriptedTick(s);
    return { owner:s.owner.inventory_marsh, holder:s.holder.inventory_marsh,
      sameBuildings:buildings === JSON.stringify(s.buildings), repeated:after === JSON.stringify(s) };
  })).toEqual({ owner:'player', holder:'player', sameBuildings:true, repeated:true });
});

test('explicit empty policy suppresses all inferred forts while absent policy retains the legacy migration', async function ({ page }, info) {
  await importWorld(page, info, 'estuary', 'empty');
  await startObserver(page, 'estuary');
  expect(await page.evaluate(function () {
    FB.repairForts(FB.state); FB.repairForts(FB.state);
    return { buildings:FB.state.buildings, marker:FB.state.openingInfrastructureState, migration:FB.state.fortMigration };
  })).toEqual({ buildings:{}, marker:{ version:1, explicit:true, bookmarkId:'inventory_estuary', revision:'empty' }, migration:undefined });
  await page.evaluate(function () { FBDATA.bookmarks.inventory_estuary.revision = 'baseline'; });
  await startObserver(page, 'estuary');
  expect(await page.evaluate(function () {
    const s = FB.state, before = JSON.stringify(s.buildings);
    FB.repairForts(s); FB.repairForts(s);
    return { marker:s.openingInfrastructureState, migration:s.fortMigration,
      fort:!!FB.fortAt(s, 'inventory_quay'), repeated:before === JSON.stringify(s.buildings) };
  })).toEqual({ marker:undefined, migration:1, fort:true, repeated:true });
});

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
  await importWorld(page, info, 'estuary');
  await startHousehold(page, 'estuary');
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await page.evaluate(function () { FB.mods.clear(); });
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
