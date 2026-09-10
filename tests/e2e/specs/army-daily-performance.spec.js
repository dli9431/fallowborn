'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js', 'js/wars.js', 'js/fortifications.js', 'js/world.js',
  'js/technology.js', 'data/map_data.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('recruitment capacity reuses a supplied projection and fresh calls see blockades', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, territory = FB.recruitmentTerritory, blocked = FB.recruitmentCountyBlocked;
    const projection = territory(s, ids.enemy);
    let calls = 0;
    FB.recruitmentTerritory = function () { calls++; return territory.apply(this, arguments); };
    try {
      const expected = FB.aiBaseHost(s, ids.enemy);
      calls = 0;
      const actual = FB.aiBaseHost(s, ids.enemy, projection), reusedCalls = calls;
      FB.recruitmentCountyBlocked = function () { return true; };
      const blockaded = FB.aiBaseHost(s, ids.enemy);
      return { expected:expected, actual:actual, reusedCalls:reusedCalls, blockaded:blockaded, freshCalls:calls };
    } finally { FB.recruitmentTerritory = territory; FB.recruitmentCountyBlocked = blocked; }
  }, ids);
  expect(result.actual).toBe(result.expected);
  expect(result.reusedCalls).toBe(0);
  expect(result.blockaded).toBe(0);
  expect(result.freshCalls).toBe(1);
});

test('supply relationship batches preserve county and campaign control with fewer hostility queries', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, hostile = FB.armiesHostile;
    const host = { realm:'player', warId:s.player.war.id };
    const counties = Object.keys(FB.world.adj), war = s.player.war;
    let calls = 0;
    FB.armiesHostile = function () { calls++; return hostile.apply(this, arguments); };
    try {
      const expected = counties.map(function (pid) { return FB.armyFriendlyProvince(s, host, pid); });
      const originalCalls = calls; calls = 0;
      const relations = { friendly:Object.create(null), hostile:Object.create(null) };
      const actual = counties.map(function (pid) { return FB.armyFriendlyProvince(s, host, pid, relations); });
      const batchCalls = calls;
      // An occupation always takes priority over a cached holder relationship.
      war.occupations[ids.second] = { occupied:false };
      const before = FB.armyFriendlyProvince(s, host, ids.second, relations);
      war.occupations[ids.second].occupied = true;
      const after = FB.armyFriendlyProvince(s, host, ids.second, relations);
      return { expected:expected, actual:actual, originalCalls:originalCalls,
        batchCalls:batchCalls, before:before, after:after };
    } finally { FB.armiesHostile = hostile; }
  }, ids);
  expect(result.actual).toEqual(result.expected);
  expect(result.batchCalls).toBeLessThan(result.originalCalls);
  expect(result.before).toBe(false);
  expect(result.after).toBe(true);
});

test('daily pursuit agrees with live battle strength and expires before subsequent queries', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pursue = FB.armyCanPursue, base = FB.aiBaseHost;
    const player = FB.playerHost(s), war = s.player.war;
    player.at = ids.home; player.path = []; player.moveLeft = 0;
    player.men = player.size = 200; player.units = { levy:200 }; player.supply = 100;
    const enemy = { id:99101, realm:ids.enemy, warId:war.id, at:ids.second,
      men:100, size:100, units:{ levy:100 }, supply:100, path:[], moveLeft:0 };
    const second = Object.assign({}, enemy, { id:99102, men:80, size:80, units:{ levy:80 } });
    s.armies = [player, enemy, second];
    for (const rid in s.realms) s.armyDown[rid] = s.turn;
    FB.aiBaseHost = function () { return 0; };
    const results = [];
    function reference(state, host, pid) {
      let defense = 0;
      for (const other of state.armies) {
        if (other.at === pid && other.men > 0 && FB.armiesHostile(state, host, other)) {
          defense += FB.armyBattlePower(state, other, pid, 'defense');
        }
      }
      return !defense || FB.armyBattlePower(state, host, pid, 'attack') >= defense * 1.1;
    }
    FB.armyCanPursue = function (state, host, pid) {
      const expected = reference(state, host, pid), actual = pursue(state, host, pid);
      results.push(actual === expected); return actual;
    };
    try {
      FB.armyTick(s);
      const during = results.length;
      // External calls must not retain the orders phase's strength or positions.
      s.armies = [player, enemy]; enemy.at = ids.second;
      enemy.men = 100000; enemy.units = { levy:100000 };
      const strong = FB.armyCanPursue(s, player, ids.second);
      enemy.men = 1; enemy.units = { levy:1 };
      const weak = FB.armyCanPursue(s, player, ids.second);
      return { during:during, matches:results.every(Boolean), strong:strong, weak:weak };
    } finally { FB.armyCanPursue = pursue; FB.aiBaseHost = base; }
  }, ids);
  expect(result.during).toBeGreaterThan(0);
  expect(result.matches).toBe(true);
  expect(result.strong).toBe(false);
  expect(result.weak).toBe(true);
});

test('retained supply maps distinguish concurrent campaigns and refresh after occupation changes', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, originalWorld = FB.world, war = s.player.war;
    const otherWar = FB.registerOrdinaryWar(s, 'player', {
      enemy:ids.other, target:s.realms[ids.other].capital, casus:{ type:'aggression' }
    });
    const field = s.realms[ids.enemy].capital;
    const adj = {}, byId = {};
    for (const pid of [ids.home, ids.second, field]) {
      adj[pid] = {}; byId[pid] = Object.assign({}, originalWorld.byId[pid], { terrain:'plains' });
      s.buildings[pid] = [];
    }
    adj[ids.home][ids.second] = 1; adj[ids.second][ids.home] = 1;
    adj[ids.second][field] = 1; adj[field][ids.second] = 1;
    FB.world = { adj:adj, byId:byId };
    s.player.provs = [ids.home];
    s.owner[ids.second] = s.holder[ids.second] = ids.enemy;
    s.owner[field] = s.holder[field] = ids.enemy;
    war.occupations[ids.second] = { occupied:true };
    FB.invalidateRealmCache(); FB.invalidateFortIndex();
    const first = { id:99201, realm:'player', warId:war.id, at:field,
      men:100, size:100, units:{ levy:100 }, supply:100, path:[], moveLeft:0 };
    const second = Object.assign({}, first, { id:99202, warId:otherWar.id, units:{ levy:100 } });
    s.armies = [first, second];
    for (const rid in s.realms) s.armyDown[rid] = s.turn;
    const results = [], tech = FB.techBonus, bal = FBDATA.balance;
    const originalBalance = { base:bal.supplyDrainBase, depth:bal.supplyDistanceDepth, terrain:bal.supplyDrainTerrain };
    bal.supplyDrainBase = 1; bal.supplyDistanceDepth = 1; bal.supplyDrainTerrain = { plains:1 };
    s.date.season = 0;
    FB.techBonus = function (state, key) { return key === 'supply' ? 0 : tech.apply(this, arguments); };
    function tick(expected) {
      const before = s.armies.map(function (host) { return host.supply; });
      FB.armyTick(s);
      results.push({ expected:expected, actual:[before[0] - first.supply, before[1] - second.supply] });
    }
    try {
      tick([2, 3]);
      war.occupations[ids.second].occupied = false; // no turn or realm revision change
      tick([3, 3]);
      return results;
    } finally {
      FB.world = originalWorld; FB.techBonus = tech;
      bal.supplyDrainBase = originalBalance.base; bal.supplyDistanceDepth = originalBalance.depth;
      bal.supplyDrainTerrain = originalBalance.terrain;
      FB.invalidateRealmCache(); FB.invalidateFortIndex();
    }
  }, ids);
  for (const row of result) {
    expect(row.actual[0]).toBeCloseTo(row.expected[0], 8);
    expect(row.actual[1]).toBeCloseTo(row.expected[1], 8);
  }
  expect(result[0].expected[0]).toBeLessThan(result[0].expected[1]);
  expect(result[1].expected[0]).toBe(result[1].expected[1]);
});
