'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js', 'js/fortifications.js', 'js/wars.js', 'js/world.js',
  'js/technology.js', 'data/map_data.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('regrouping preserves home priority, weighted distance, ties, forts and live control', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, originalWorld = FB.world;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive; });
    const capital = s.realms[rid].capital, terrain = FBDATA.balance.terrainMarchMult;
    const names = ['armyFriendlyProvince', 'armyCanPursue', 'fortBlocksArmy', 'armyMarchDays', 'waterCrossing'];
    const originals = {}; names.forEach(function (name) { originals[name] = FB[name]; });
    let friendly = { z_near:true, a_far:true, home:true }, unsafe = {}, forts = {}, quotes = 0;
    FB.armyFriendlyProvince = function (state, host, pid) { return !!friendly[pid]; };
    FB.armyCanPursue = function (state, host, pid) { return !unsafe[pid]; };
    FB.fortBlocksArmy = function (state, pid) { return !!forts[pid]; };
    FB.armyMarchDays = function () { quotes++; return 4; };
    FB.waterCrossing = function () { return null; };
    FBDATA.balance.terrainMarchMult = { plains:1, mountain:3 };
    FB.world = {
      adj:{ start:{ z_near:1, bridge:1 }, z_near:{ start:1 }, bridge:{ start:1, a_far:1 },
        a_far:{ bridge:1, home:1 }, home:{ a_far:1 }, isolated:{} },
      byId:{ start:{ terrain:'plains' }, bridge:{ terrain:'plains' }, z_near:{ terrain:'plains' },
        a_far:{ terrain:'plains' }, home:{ terrain:'plains' }, isolated:{ terrain:'plains' } }
    };
    s.realms[rid].capital = 'home';
    const host = { realm:rid, at:'start', from:'bridge', men:100, units:{ levy:100 } };
    const rng = FB.getRngState(), results = {};
    function reference() {
      const candidates = ['home'].concat(Object.keys(FB.world.byId).sort());
      let best = null, days = Infinity;
      for (const pid of candidates) {
        if (!FB.armyFriendlyProvince(s, host, pid) || !FB.armyCanPursue(s, host, pid)) continue;
        const route = FB.findArmyPath(s, host, pid);
        if (!route || route.blockedByFort) continue;
        if (pid === 'home') return pid;
        if (route.totalDays < days) { best = pid; days = route.totalDays; }
      }
      return best;
    }
    function record(name) { results[name] = { actual:FB.armyRegroupGoal(s, host), reference:reference() }; }
    try {
      record('home');
      unsafe.home = true; record('nearest');
      FB.world.byId.z_near.terrain = 'mountain'; record('weighted');
      FBDATA.balance.terrainMarchMult.mountain = 2; record('tie');
      forts.bridge = true; record('fort');
      forts = {}; friendly.a_far = false; record('control');
      friendly = { isolated:true }; record('unreachable');
      friendly = { a_far:true }; forts = { start:true }; record('arrivalExit');
      host.from = 'elsewhere'; record('pinned');
      forts = {}; friendly = {}; unsafe = {};
      // A broad safe frontier must not invoke one route search per destination.
      const adj = { start:{ hub:1 }, hub:{ start:1 } }, byId = { start:{}, hub:{} };
      for (let i = 0; i < 100; i++) {
        const pid = 'safe_' + String(i).padStart(3, '0');
        adj.hub[pid] = 1; adj[pid] = { hub:1 }; byId[pid] = {}; friendly[pid] = true;
      }
      FB.world = { adj:adj, byId:byId };
      quotes = 0;
      results.broad = FB.armyRegroupGoal(s, host);
      results.quotes = quotes;
      results.rngStable = rng === FB.getRngState();
    } finally {
      FB.world = originalWorld; s.realms[rid].capital = capital;
      FBDATA.balance.terrainMarchMult = terrain;
      names.forEach(function (name) { FB[name] = originals[name]; });
    }
    return results;
  });
  const expected = { home:'home', nearest:'z_near', weighted:'a_far', tie:'a_far',
    fort:'z_near', control:'z_near', unreachable:null, arrivalExit:'a_far', pinned:null };
  for (const name of Object.keys(expected)) {
    expect(result[name]).toEqual({ actual:expected[name], reference:expected[name] });
  }
  expect(result.broad).toBe('safe_000');
  expect(result.quotes).toBe(1);
  expect(result.rngStable).toBe(true);
});

test('retreat fallback keeps breadth-first priority while searching legal reachability once', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state, world = FB.world;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive; });
    const capital = s.realms[rid].capital;
    const friendly = FB.armyFriendlyProvince, fort = FB.fortBlocksArmy, march = FB.armyMarchDays;
    let friends = { near:true, far:true }, forts = {}, quotes = 0;
    FB.armyFriendlyProvince = function (state, host, pid) { return !!friends[pid]; };
    FB.fortBlocksArmy = function (state, pid) { return !!forts[pid]; };
    FB.armyMarchDays = function () { quotes++; return 4; };
    FB.world = { adj:{ start:{ gate:1, near:1 }, near:{ start:1 },
      gate:{ start:1, far:1 }, far:{ gate:1 }, island:{} },
      byId:{ start:{}, near:{}, gate:{}, far:{}, island:{} } };
    s.realms[rid].capital = null;
    const host = { realm:rid, at:'start', from:'gate', men:100, units:{ levy:100 } };
    function reference() {
      const visited = { start:true };
      let frontier = Object.keys(FB.world.adj.start).sort();
      while (frontier.length) {
        for (const pid of frontier) {
          if (visited[pid]) continue;
          visited[pid] = true;
          if (!friends[pid] || forts[pid]) continue;
          const path = FB.findArmyPath(s, host, pid);
          if (path && !path.blockedByFort) return pid;
        }
        const next = [];
        for (const pid of frontier) {
          for (const nb of Object.keys(FB.world.adj[pid]).sort()) if (!visited[nb]) next.push(nb);
        }
        frontier = next;
      }
      return null;
    }
    const cases = [], rng = FB.getRngState();
    function record() { cases.push([FB.armyRetreatGoal(s, host), reference()]); }
    try {
      record();
      friends.near = false; record();
      forts.gate = true; record();
      forts = { start:true }; record();
      host.from = 'elsewhere'; record();
      forts = {}; friends = { island:true }; record();
      friends = { near:true }; FB.world.byId.near.wasteland = true; record();
      FB.world.byId.near.wasteland = false;
      quotes = 0; FB.armyRetreatGoal(s, host);
      return { cases:cases, quotes:quotes, rngStable:rng === FB.getRngState() };
    } finally {
      FB.world = world; s.realms[rid].capital = capital;
      FB.armyFriendlyProvince = friendly; FB.fortBlocksArmy = fort; FB.armyMarchDays = march;
    }
  });
  expect(result.cases).toEqual([['near','near'], ['far','far'], [null,null],
    ['far','far'], [null,null], [null,null], [null,null]]);
  expect(result.quotes).toBe(0);
  expect(result.rngStable).toBe(true);
});
