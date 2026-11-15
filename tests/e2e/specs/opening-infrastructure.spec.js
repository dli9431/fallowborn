'use strict';
const { test, expect } = require('../support/fixture');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { importWorld, startRuler, startHousehold, startObserver } = require('../support/game/opening-infrastructure');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['data/relay_services.js','js/relay_services.js',
  'data/building_profiles.js','js/building_profiles.js',
  'index.html', 'js/world.js', 'js/main.js', 'js/starts.js', 'js/fortifications.js',
  'js/save.js', 'js/save_v4.js', 'js/actions.js', 'js/treasury.js', 'js/population.js',
  'js/market.js', 'js/lordships.js', 'js/governments.js', 'js/government_administration.js',
  'js/mods.js', 'js/model.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

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
