'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/market.js', 'js/logistics.js', 'js/armies.js',
  'js/population.js', 'data/markets.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('concentrations scale across land, aggregate split hosts, and stop at wasteland', async function ({ page }) {
  const r = await page.evaluate(function () {
    const world = FB.world, s = { armies:[] };
    const byId = {}, adj = {};
    for (const id of ['a','b','c','d','e','f','waste','beyond','island']) {
      byId[id] = { id:id, wasteland:id === 'waste' }; adj[id] = {};
    }
    function edge(a, b) { adj[a][b] = 1; adj[b][a] = 1; }
    edge('a','b'); edge('b','c'); edge('c','d'); edge('d','e'); edge('e','f');
    edge('a','waste'); edge('waste','beyond');
    FB.world = { byId:byId, adj:adj, waterAdj:{ a:{ island:1 } } };
    try {
      const rng = FB.getRngState();
      s.armies = [{ at:'a', men:2499 }];
      const small = FB.marketArmyPressure(s);
      s.armies = [{ at:'a', men:2500 }];
      const neighbor = FB.marketArmyPressure(s);
      s.armies = [{ at:'a', men:10000 }];
      const large = FB.marketArmyPressure(s);
      s.armies = [{ at:'a', men:5000 }, { at:'a', men:5000 }];
      const split = FB.marketArmyPressure(s);
      s.armies = [{ at:'a', men:0, size:10000 }];
      const dead = FB.marketArmyPressure(s);
      s.armies = [{ at:'f', men:2500 }];
      const moved = FB.marketArmyPressure(s);
      return { small:small, neighbor:neighbor, large:large, split:split, dead:dead,
        moved:moved, deterministic:rng === FB.getRngState() };
    } finally { FB.world = world; }
  });
  expect(r.small).toEqual({});
  expect(Object.keys(r.neighbor).sort()).toEqual(['a','b']);
  expect(r.neighbor.b).toBeLessThan(r.neighbor.a);
  expect(Object.keys(r.large).sort()).toEqual(['a','b','c','d','e']);
  expect(r.large.b).toBeGreaterThan(r.neighbor.b);
  expect(r.large.e).toBeGreaterThan(0);
  expect(r.large.e).toBeLessThan(r.large.d);
  expect(r.split).toEqual(r.large);
  expect(r.dead).toEqual({});
  expect(Object.keys(r.moved).sort()).toEqual(['e','f']);
  expect(r.deterministic).toBe(true);
});

test('sixty thousand troops sustain regional pressure beyond the former ceiling', async function ({ page }) {
  const r = await page.evaluate(function () {
    const original = FB.world, byId = {}, adj = {};
    for (let i = 0; i <= 16; i++) {
      byId['p' + i] = { id:'p' + i };
      adj['p' + i] = {};
      if (i) { adj['p' + i]['p' + (i - 1)] = 1; adj['p' + (i - 1)]['p' + i] = 1; }
    }
    FB.world = { byId:byId, adj:adj };
    try {
      const s = { armies:[{ at:'p0', men:10000 }] };
      const small = FB.marketArmyPressure(s);
      s.armies[0].men = 60000;
      const regional = FB.marketArmyPressure(s);
      s.armies = [{ at:'p0', men:30000 }, { at:'p0', men:30000 }];
      const split = FB.marketArmyPressure(s);
      s.armies = [{ at:'p0', men:120000 }];
      const greater = FB.marketArmyPressure(s);
      return { small:small, regional:regional, split:split, greater:greater };
    } finally { FB.world = original; }
  });
  expect(r.small.p5).toBeUndefined();
  expect(r.regional.p9).toBeGreaterThan(r.regional.p0 * 0.4);
  expect(r.regional.p10).toBeUndefined();
  expect(r.regional.p4).toBeGreaterThan(r.small.p4 * 6);
  expect(r.split).toEqual(r.regional);
  expect(r.greater.p13).toBeGreaterThan(0);
  expect(r.greater.p14).toBeUndefined();
});

test('regional pressure raises neighboring provisions prices without phantom withdrawals', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state;
    FB.game.setPaused(true);
    s.armies = [];
    FB.ensureMarket(s);
    const origin = 'antioch';
    if (!FB.world.byId[origin]) throw new Error('Missing test county');
    const baseline = JSON.parse(JSON.stringify(s));
    s.armies = [{ id:'market-pressure-host', realm:'player', at:origin, men:10000,
      size:10000, supply:100, units:{ levy:10000 }, path:[] }];
    const pressure = FB.marketArmyPressure(s);
    const targets = Object.keys(pressure).filter(function (pid) { return pid !== origin; });
    const beforeLedger = JSON.stringify(s.armyLogistics && s.armyLogistics.counties || {});
    s.turn += 90; baseline.turn = s.turn;
    FB.marketSeason(s);
    const costs = {};
    for (const pid of targets) costs[pid] = FB.marketCounty(s, pid).goods.provisions.price;
    FB.marketSeason(baseline);
    const increased = targets.filter(function (pid) {
      return costs[pid] > FB.marketCounty(baseline, pid).goods.provisions.price;
    });
    return { neighbors:Object.keys(FB.world.adj[origin]).filter(function (pid) {
        return !FB.world.byId[pid].wasteland;
      }).every(function (pid) { return pressure[pid] > 0; }),
      increased:increased.length, regional:targets.length,
      beforeLedger:beforeLedger,
      afterLedger:JSON.stringify(s.armyLogistics && s.armyLogistics.counties || {}),
      supply:s.armies[0].supply };
  });
  expect(r.neighbors).toBe(true);
  expect(r.regional).toBeGreaterThan(4);
  expect(r.increased).toBeGreaterThan(4);
  expect(r.afterLedger).toBe(r.beforeLedger);
  expect(r.supply).toBe(100);
});

test('neighboring food quotes react immediately and agree across market consumers', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state;
    s.armies = [];
    const market = FB.ensureMarket(s), at = market.goods.indexOf('provisions');
    const origin = 'antioch';
    const pid = Object.keys(FB.world.adj[origin]).filter(function (id) { return !FB.world.byId[id].wasteland; })[0];
    market.counties[pid][1][at] = 0.9;
    market.counties[pid][0][at] = FB.marketProvisionSource(s, pid).reserve;
    const stock = market.counties[pid][0][at], turn = s.turn;
    s.armies = [{ at:origin, men:60000 }];
    const quote = FB.marketPrice(s, pid, 'provisions');
    const source = FB.marketProvisionSource(s, pid).price;
    const sheet = FB.marketCounty(s, pid).goods.provisions.price;
    s.armies[0].men = 0;
    const cleared = FB.marketPrice(s, pid, 'provisions');
    return { quote:quote, source:source, sheet:sheet, cleared:cleared,
      unchanged:stock === market.counties[pid][0][at] && turn === s.turn };
  });
  expect(r.quote).toBeGreaterThanOrEqual(1.08);
  expect(r.source).toBe(r.quote);
  expect(r.sheet).toBe(r.quote);
  expect(r.cleared).toBe(0.9);
  expect(r.unchanged).toBe(true);
});
