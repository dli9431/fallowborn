'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/armies.js', 'js/world.js', 'js/actions.js', 'js/fortifications.js',
  'data/map_data.js', 'data/technology.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('recruitment scans the army collection once and immediately sees moved hosts', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.armies = Array.from({ length:80 }, function (_, i) {
      return { id:'distant-' + i, realm:ids.enemy, at:s.player.war.target,
        men:10000, size:10000, moveLeft:0, path:[] };
    });
    const iterate = s.armies[Symbol.iterator];
    let scans = 0;
    s.armies[Symbol.iterator] = function () { scans++; return iterate.call(this); };
    const before = JSON.stringify(s), rng = FB.getRngState();
    let first;
    try { first = FB.recruitmentTerritory(s, 'player'); }
    finally { delete s.armies[Symbol.iterator]; }
    const pure = JSON.stringify(s) === before && rng === FB.getRngState();
    s.armies[0].at = ids.home;
    const moved = FB.recruitmentTerritory(s, 'player');
    s.armies[0].moveLeft = 1;
    const passing = FB.recruitmentTerritory(s, 'player');
    return { scans:scans, pure:pure, first:first, moved:moved, passing:passing };
  }, ids);
  expect(result.scans).toBeLessThanOrEqual(1);
  expect(result.pure).toBe(true);
  expect(result.first.blocked).toEqual([]);
  expect(result.first.rally).toBe(ids.home);
  expect(result.moved.blocked).toEqual([ids.home]);
  expect(result.moved.rally).toBe(ids.second);
  expect(result.passing.blocked).toEqual([]);
});

test('halted sufficient sieges block counties; passing, contested and relieved works do not',
  async function ({ page }, testInfo) {
    const scenario = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      const before = FB.playerLevy(s);
      const besieger = { id:'blockade', realm:ids.enemy, at:ids.home, men:100000,
        size:100000, supply:100, moveLeft:0, path:[] };
      s.armies = [besieger];
      const partial = FB.recruitmentTerritory(s, 'player');
      const reduced = FB.playerLevy(s);
      besieger.moveLeft = 1;
      const passing = FB.recruitmentTerritory(s, 'player');
      besieger.moveLeft = 0;
      s.armies.push({ id:'relief', realm:'player', at:ids.home, men:40, supply:100 });
      const contested = FB.recruitmentTerritory(s, 'player');
      s.armies = [];
      s.player.war.enemySiege = 2;
      const relieved = FB.recruitmentTerritory(s, 'player');
      return { before:before, reduced:reduced, partial:partial,
        passing:passing, contested:contested, relieved:relieved };
    }, scenario);
    expect(result.reduced).toBeLessThan(result.before);
    expect(result.partial.blocked).toEqual([scenario.home]);
    expect(result.partial.rally).toBe(scenario.second);
    expect(result.passing.blocked).toEqual([]);
    expect(result.contested.blocked).toEqual([]);
    expect(result.relieved.blocked).toEqual([]);
    expect(result.relieved.rally).toBe(scenario.home);
  });

test('full blockade cannot be bypassed by minimums, mercenaries or ready cohorts',
  async function ({ page }, testInfo) {
    const scenario = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.armies = [ids.home, ids.second].map(function (pid, i) {
        return { id:'blockade-' + i, realm:ids.enemy, at:pid, men:100000,
          size:100000, supply:100, moveLeft:0, path:[] };
      });
      s.player.war.mercCos = 4;
      s.armyCohorts.player = { ret:{ ready:300, batches:[] } };
      const before = JSON.stringify(s.armyCohorts);
      const preview = FB.playerMusterPreview(s);
      const raised = FB.raisePlayerHost(s);
      const unchanged = before === JSON.stringify(s.armyCohorts);
      s.armies.pop();
      const relievedPreview = FB.playerMusterPreview(s);
      const relieved = FB.raisePlayerHost(s);
      return { preview:preview, raised:raised, unchanged:unchanged,
        relievedPreview:relievedPreview, rally:relieved && relieved.at,
        men:relieved && relieved.men };
    }, scenario);
    expect(result.preview.canRaise).toBe(false);
    expect(result.preview.men).toBe(0);
    expect(result.raised).toBeNull();
    expect(result.unchanged).toBe(true);
    expect(result.relievedPreview.canRaise).toBe(true);
    expect(result.rally).toBe(scenario.second);
    expect(result.men).toBe(result.relievedPreview.men);
  });

test('AI recruitment filters territory without changing realm development strength',
  async function ({ page }, testInfo) {
    const scenario = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, pid = s.realms[ids.enemy].capital;
      const strength = FB.realmStrength(s, ids.enemy);
      const before = FB.aiBaseHost(s, ids.enemy);
      s.armies = [{ id:'siege', realm:'player', at:pid, men:100000,
        size:100000, supply:100, path:[], moveLeft:0 }];
      const after = FB.aiBaseHost(s, ids.enemy);
      return { strength:strength, afterStrength:FB.realmStrength(s, ids.enemy),
        before:before, after:after, territory:FB.recruitmentTerritory(s, ids.enemy) };
    }, scenario);
    expect(result.afterStrength).toBe(result.strength);
    expect(result.after).toBeLessThan(result.before);
    expect(result.territory.blocked).toHaveLength(1);
  });

test('same-realm hosts share replacement capacity and keep excess cohorts ready',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      // Isolate replacement allocation from daily strategic orders.
      const levy = FB.playerComposition, orders = FB.orderArmy;
      FB.playerComposition = function () { return { levy:1000 }; };
      FB.orderArmy = function () { return false; };
      s.armies = [0, 1].map(function (i) {
        return { id:'replacement-' + i, realm:'player', at:ids.home,
          men:490, size:1000, units:{ levy:490 }, supply:100, path:[], moveLeft:0 };
      });
      s.armyCohorts.player = { ret:{ ready:200, batches:[] } };
      s.armyDown[ids.enemy] = s.turn;
      FB.armyTick(s);
      const result = { total:s.armies.filter(function (a) { return a.realm === 'player'; })
        .reduce(function (n, a) { return n + a.men; }, 0),
        ready:s.armyCohorts.player.ret.ready };
      FB.playerComposition = levy; FB.orderArmy = orders;
      return result;
    }, ids);
    expect(result.total).toBe(1000);
    expect(result.ready).toBe(180);
  });

test('primary and detachment rearm retain their separate 60 and 25 day deadlines',
  async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.armyDown.player = s.turn;
      s.armyDetachmentDown.player = s.turn;
      const start = [FB.musterDelay(s, 'player'), FB.musterDelay(s, 'player', true)];
      s.turn += 25;
      const middle = [FB.musterDelay(s, 'player'), FB.musterDelay(s, 'player', true)];
      s.turn += 35;
      return { start:start, middle:middle, end:FB.musterDelay(s, 'player') };
    });
    expect(result).toEqual({ start:[60, 25], middle:[35, 0], end:0 });
  });

test('insufficient besiegers cannot block a fortified county',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.buildings[ids.home] = [{ id:'walls', s:0, level:1 }];
      FB.invalidateFortIndex();
      const minimum = FB.fortSiegeStatus(s, ids.home, {}, []).minimum;
      const enemy = { id:'shortage', realm:ids.enemy, at:ids.home,
        men:minimum - 1, moveLeft:0, path:[] };
      s.armies = [enemy];
      const short = FB.recruitmentCountyBlocked(s, 'player', ids.home);
      enemy.men++;
      return { minimum:minimum, short:short,
        sufficient:FB.recruitmentCountyBlocked(s, 'player', ids.home) };
    }, ids);
    expect(result.minimum).toBeGreaterThan(0);
    expect(result.short).toBe(false);
    expect(result.sufficient).toBe(true);
  });

test('an entirely besieged AI realm cannot remuster or spend its drilled reserves',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.armies = FB.realmTerritory(s, ids.enemy).map(function (pid, i) {
        return { id:'all-blocked-' + i, realm:'player', at:pid, men:100000,
          size:100000, supply:100, units:{ levy:100000 }, path:[], moveLeft:0, holdManual:1 };
      });
      s.armyCohorts[ids.enemy] = { ret:{ ready:500, batches:[] } };
      const base = FB.aiBaseHost(s, ids.enemy);
      FB.armyTick(s);
      return { base:base, hosts:s.armies.filter(function (a) { return a.realm === ids.enemy; }).length,
        ready:s.armyCohorts[ids.enemy].ret.ready };
    }, ids);
    expect(result).toEqual({ base:0, hosts:0, ready:500 });
  });

test('completed hostile occupation blocks recruitment without a besieger; unfinished works do not',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, camp = FB.greatHolyWarCamp;
      s.armies = [];
      s.greatHolyWar = { phase:'active', occupations:{} };
      s.greatHolyWar.occupations[ids.home] = { occupied:true, progress:3 };
      FB.greatHolyWarCamp = function () { return 'defenders'; };
      const occupied = FB.recruitmentCountyBlocked(s, 'player', ids.home);
      s.greatHolyWar.occupations[ids.home].occupied = false;
      const unfinished = FB.recruitmentCountyBlocked(s, 'player', ids.home);
      FB.greatHolyWarCamp = camp;
      s.greatHolyWar = null;
      return { occupied:occupied, unfinished:unfinished };
    }, ids);
    expect(result).toEqual({ occupied:true, unfinished:false });
  });
