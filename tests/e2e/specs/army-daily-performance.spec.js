'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/logistics.js', 'js/market.js', 'js/main.js', 'js/armies.js', 'js/wars.js', 'js/fortifications.js', 'js/world.js',
  'js/technology.js', 'js/rebellions.js', 'js/modifiers.js', 'js/population.js', 'js/ambitions.js',
  'data/map_data.js', 'data/units.js', 'data/modifiers.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('route pruning preserves equal-cost ties and reads fort changes on the next search', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const original = { world:FB.world, fort:FB.fortBlocksArmy, water:FB.waterCrossing,
      timing:FB.game._fastForwardTiming };
    const counts = {}, labels = {}, stack = [];
    FB.world = { adj:{ a:{ c:1,b:1 }, b:{ a:1,c:1,d:1 }, c:{ a:1,b:1,d:1 }, d:{ b:1,c:1 } }, byId:{} };
    ['a','b','c','d'].forEach(function (id) { FB.world.byId[id] = { id:id, terrain:'plains' }; });
    FB.waterCrossing = function () { return null; };
    let blocked = null;
    FB.fortBlocksArmy = function (state, pid) { return pid === blocked || (blocked === 'both' && (pid === 'b' || pid === 'c')); };
    FB.game._fastForwardTiming = { enter:function (label) { labels[label] = true; stack.push(label); return label; },
      leave:function (label) { if (stack.pop() !== label) throw new Error('Unbalanced path timer'); },
      count:function (key, n) { counts[key] = (counts[key] || 0) + (n === undefined ? 1 : n); } };
    try {
      const host = { realm:'player', at:'a', men:100, units:{ levy:100 } };
      const first = FB.findArmyPath(FB.state, host, 'd');
      blocked = 'b';
      const second = FB.findArmyPath(FB.state, host, 'd');
      blocked = 'both';
      const fallback = FB.findArmyPath(FB.state, host, 'd');
      return { first:first.path, second:second.path, fallback:fallback.path, fort:fallback.blockedByFort,
        balanced:stack.length === 0, labels:Object.keys(labels),
        fallbackPops:counts['Paths: fallback frontier pops'] || 0,
        fallbackEdges:counts['Paths: fallback neighbor edges'] || 0,
        fallbackSkipped:counts['Paths: fallback settled edges skipped'] || 0,
        ties:counts['Paths: tie comparisons'] || 0,
        materialized:counts['Paths: path arrays materialized'] || 0,
        skipped:counts['Paths: settled edges skipped'] || 0 };
    } finally {
      FB.world = original.world; FB.fortBlocksArmy = original.fort;
      FB.waterCrossing = original.water; FB.game._fastForwardTiming = original.timing;
    }
  });
  expect(result.first).toEqual(['b','d']); expect(result.second).toEqual(['c','d']);
  expect(result.skipped).toBeGreaterThan(0);
  expect(result.fallback).toEqual(['b']); expect(result.fort).toBe('b');
  expect(result.materialized).toBeGreaterThan(0);
  expect(result.balanced).toBe(true);
  expect(result.fallbackPops).toBeGreaterThan(0); expect(result.fallbackEdges).toBeGreaterThan(0);
  expect(result.fallbackSkipped).toBeGreaterThan(0);
  expect(result.ties).toBeGreaterThan(0);
  expect(result.labels).toEqual(expect.arrayContaining(['Army operation: path search', 'Paths: fort fallback']));
  ['Paths: heap push', 'Paths: heap pop', 'Paths: leg quotes', 'Paths: tie comparison'].forEach(function (label) {
    expect(result.labels).not.toContain(label);
  });
});

test('route ties prefer the earliest differing county over the final predecessor', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const original = { world:FB.world, fort:FB.fortBlocksArmy, water:FB.waterCrossing };
    // The preferred route has the larger last predecessor: b,z beats c,e.
    FB.world = { adj:{ a:{ b:1,c:1 }, b:{ a:1,z:1 }, c:{ a:1,e:1 },
      z:{ b:1,d:1 }, e:{ c:1,d:1 }, d:{ z:1,e:1 } }, byId:{} };
    Object.keys(FB.world.adj).forEach(function (id) {
      FB.world.byId[id] = { id:id, terrain:'plains' };
    });
    FB.waterCrossing = function () { return null; };
    let forts = false;
    FB.fortBlocksArmy = function (state, pid) { return forts && (pid === 'b' || pid === 'c'); };
    try {
      const host = { realm:'player', at:'a', men:100, units:{ levy:100 } };
      const open = FB.findArmyPath(FB.state, host, 'd');
      forts = true;
      const blocked = FB.findArmyPath(FB.state, host, 'd');
      return { open:open.path, blocked:blocked.path, fort:blocked.blockedByFort };
    } finally {
      FB.world = original.world; FB.fortBlocksArmy = original.fort; FB.waterCrossing = original.water;
    }
  });
  expect(result).toEqual({ open:['b','z','d'], blocked:['b'], fort:'b' });
});

test('fort routing shares controller relations and retains occupation and hook changes', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, original = { fort:FB.fortAt, hostile:FB.armiesHostile, camp:FB.greatHolyWarCamp };
    const canonicalSafe = FB.armiesHostile.militaryCacheSafe === true;
    const host = { realm:ids.enemy }, relations = { friendly:Object.create(null), hostile:Object.create(null) };
    let reads = 0, opposed = true;
    try {
      s.holder.probeA = s.holder.probeB = ids.other;
      s.owner.probeA = s.owner.probeB = ids.other;
      s.greatHolyWar = { phase:'active', occupations:{} };
      FB.fortAt = function () { return { level:1 }; };
      FB.greatHolyWarCamp = function (state, rid) { return rid === ids.enemy ? 'attackers' : 'defenders'; };
      FB.armiesHostile = function () { reads++; return opposed; };
      FB.armiesHostile.militaryCacheSafe = true;
      const first = FB.fortBlocksArmy(s, 'probeA', host, relations);
      const before = reads;
      const second = FB.fortBlocksArmy(s, 'probeB', host, relations);
      const reused = reads === before;
      s.greatHolyWar.occupations.probeB = { occupied:true };
      const occupied = FB.fortBlocksArmy(s, 'probeB', host, relations);
      delete FB.armiesHostile.militaryCacheSafe; opposed = false;
      const changed = FB.fortBlocksArmy(s, 'probeA', host, relations);
      return { canonicalSafe:canonicalSafe, first:first, second:second, reused:reused, occupied:occupied, changed:changed };
    } finally { FB.fortAt = original.fort; FB.armiesHostile = original.hostile; FB.greatHolyWarCamp = original.camp; }
  }, ids);
  expect(result).toEqual({ canonicalSafe:true, first:true, second:true, reused:true, occupied:false, changed:false });
});

test('provision quotes read supply technology once and observe later changes', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, host = FB.playerHost(s), original = FB.techBonus;
    host.at = ids.home; host.supply = 50;
    let reads = 0, bonus = 0.1;
    FB.techBonus = function (state, key, rid) {
      if (key === 'supply') { reads++; return bonus; }
      return original(state, key, rid);
    };
    try {
      const first = FB.armyProvisionQuote(s, host), firstReads = reads;
      bonus = 0.3;
      const second = FB.armyProvisionQuote(s, host);
      return { firstReads:firstReads, reads:reads, first:first.use, second:second.use,
        expected:FB.armyProvisionUse(s, host) };
    } finally { FB.techBonus = original; }
  }, ids);
  expect(result.firstReads).toBe(1); expect(result.reads).toBe(2);
  expect(result.second).toBe(result.expected); expect(result.second).toBeLessThan(result.first);
});

test('already idle halt preserves host state and muster contexts expire explicitly', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, host = FB.playerHost(s), previous = FB.game._fastForwardTiming;
    const counts = {};
    FB.game._fastForwardTiming = { enter:function () {}, leave:function () {},
      count:function (key, n) { counts[key] = (counts[key] || 0) + (n === undefined ? 1 : n); } };
    try {
      host.path = []; host.goal = null; host.moveLeft = 0;
      const before = JSON.stringify(host);
      const ok = FB.orderArmy(s, host, host.at);
      const territory = FB.recruitmentTerritory(s, ids.enemy), context = {};
      const expected = FB.aiBaseHost(s, ids.enemy, territory);
      counts['Muster ambition scans'] = 0;
      const actual = FB.aiBaseHost(s, ids.enemy, territory, {}, context);
      FB.aiBaseHost(s, ids.enemy, territory, {}, context);
      const scans = counts['Muster ambition scans'];
      s.historicalAmbitions = { probe:{ established:false, endTurn:s.turn + 10 } };
      FB.aiBaseHost(s, ids.enemy, territory, {}, {});
      return { ok:ok, unchanged:before === JSON.stringify(host), skipped:counts['Orders: idle halt skipped'],
        expected:expected, actual:actual, scans:scans, fresh:counts['Muster cache bypass: active ambition'] || 0 };
    } finally { FB.game._fastForwardTiming = previous; }
  }, ids);
  expect(result.ok).toBe(true); expect(result.unchanged).toBe(true); expect(result.skipped).toBe(1);
  expect(result.actual).toBe(result.expected); expect(result.scans).toBe(1); expect(result.fresh).toBeGreaterThan(0);
});

test('daily provisioning skips the unused legacy drain calculation', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, previous = FB.game._fastForwardTiming;
    const rows = {};
    FB.game._fastForwardTiming = {
      enter:function (name) { rows[name] = (rows[name] || 0) + 1; return name; },
      leave:function () {}, count:function (name, amount) {
        rows[name] = (rows[name] || 0) + (amount === undefined ? 1 : amount);
      }
    };
    try { FB.armyTick(s); return rows; }
    finally { FB.game._fastForwardTiming = previous; }
  });
  expect(result['Army operation: local provisioning']).toBeGreaterThan(0);
  expect(result['Supply: drain calculation'] || 0).toBe(0);
  expect((result['Goals: unchanged'] || 0) + (result['Goals: changed'] || 0))
    .toBe(result['Army operation: AI goal selection'] || 0);
  expect((result['Paths: found'] || 0) + (result['Paths: failed'] || 0))
    .toBe(result['Army operation: path search'] || 0);
});

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

test('provisioning observes occupation changes without building homeland supply maps', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, host = FB.playerHost(s), pid = s.realms[ids.enemy].capital;
    host.at = pid; host.supply = 50;
    s.buildings[pid] = [{ s:0, id:'walls', level:3 }];
    FB.invalidateFortIndex();
    const before = FB.armyProvisionQuote(s, host);
    s.player.war.occupations[pid] = { occupied:true };
    const occupied = FB.armyProvisionQuote(s, host);
    s.player.war.occupations[pid].occupied = false;
    const restored = FB.armyProvisionQuote(s, host);
    return { before:before.protection, occupied:occupied.protection, restored:restored.protection };
  }, ids);
  expect(result.before).toBeCloseTo(0.6, 8);
  expect(result.occupied).toBe(0);
  expect(result.restored).toBeCloseTo(result.before, 8);
});

test('AI garrison costs reuse recruitment blocking without changing the result', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = s.realms[ids.enemy].capital;
    s.buildings[pid] = [{ id:'walls', s:0, level:1 }];
    FB.invalidateFortIndex();
    const territory = FB.recruitmentTerritory(s, ids.enemy);
    const expected = FB.fortGarrisonBurden(s, ids.enemy, ids.enemy);
    const blocked = FB.recruitmentCountyBlocked;
    let calls = 0;
    FB.recruitmentCountyBlocked = function () { calls++; return blocked.apply(this, arguments); };
    try {
      const actual = FB.fortGarrisonBurden(s, ids.enemy, ids.enemy, territory);
      const reused = calls;
      FB.fortGarrisonBurden(s, ids.enemy, ids.enemy);
      return { actual:actual, expected:expected, reused:reused, fresh:calls };
    } finally { FB.recruitmentCountyBlocked = blocked; }
  }, ids);
  expect(result.actual).toBe(result.expected);
  expect(result.reused).toBe(0); expect(result.fresh).toBeGreaterThan(0);
});


test('army diagnostics distinguish muster requests and local provisioning', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const result = await page.evaluate(function () {
    const g = FB.game, originalDay = g.passDay, originalFrame = window.requestAnimationFrame;
    const originalFinish = FB.ui.fastForwardFinished, originalCoach = FB.ui.coachmarkOpen;
    const callbacks = [];
    window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    FB.ui.fastForwardFinished = function () {};
    g.passDay = function () { FB.armyTick(FB.state); FB.armyTick(FB.state); return 'season'; };
    try {
      g.fastForwardTiming.enable(true); g.skipAhead();
      while (callbacks.length && g.fastForwarding) callbacks.shift()();
      return { report:g.fastForwardTiming.last, clean:!g._fastForwardTiming };
    } finally {
      g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
      g.passDay = originalDay; window.requestAnimationFrame = originalFrame;
      FB.ui.fastForwardFinished = originalFinish; FB.ui.coachmarkOpen = originalCoach;
    }
  });
  expect(result.clean).toBe(true);
  const rows = result.report.rows, counts = result.report.counters;
  expect(rows['Muster: new-host checks'].calls).toBe(2);
  expect(rows['Muster: detachment checks'].calls).toBe(2);
  expect(rows['Muster: peace/disband checks'].calls).toBe(2);
  expect(rows['Army operation: local provisioning'].calls).toBeGreaterThan(0);
  expect(counts['Provisioning hosts']).toBeGreaterThan(0);
  expect(rows['Supply build: distance propagation']).toBeUndefined();
});


test('muster county reads are shared within a phase and support is fresh next phase', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, support = FB.countyPopularSupport;
    const territory = FB.recruitmentTerritory(s, ids.enemy);
    let calls = 0, voice = 0;
    FB.countyPopularSupport = function () { calls++; return voice; };
    try {
      const inputs = Object.create(null);
      const first = FB.aiBaseHost(s, ids.enemy, territory, inputs);
      const firstCalls = calls;
      const repeated = FB.aiBaseHost(s, ids.enemy, territory, inputs);
      const repeatedCalls = calls;
      voice = -100;
      const next = FB.aiBaseHost(s, ids.enemy, territory, Object.create(null));
      const reference = FB.aiBaseHost(s, ids.enemy, territory);
      return { first:first, repeated:repeated, firstCalls:firstCalls,
        repeatedCalls:repeatedCalls, next:next, reference:reference, calls:calls };
    } finally { FB.countyPopularSupport = support; }
  }, ids);
  expect(result.firstCalls).toBeGreaterThan(0);
  expect(result.repeatedCalls).toBe(result.firstCalls);
  expect(result.repeated).toBe(result.first);
  expect(result.next).toBe(result.reference);
  expect(result.calls).toBeGreaterThan(result.repeatedCalls);
  expect(result.next).toBeLessThan(result.first);
});

test('shared recruitment host indexes agree with fresh projections after hosts arrive', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, index = Object.create(null);
    for (const host of s.armies) (index[host.at] || (index[host.at] = [])).push(host);
    const before = FB.recruitmentTerritory(s, ids.enemy, index);
    const reference = FB.recruitmentTerritory(s, ids.enemy);
    const host = { id:'blockade-index-probe', realm:'player', at:s.realms[ids.enemy].capital,
      men:100000, size:100000, units:{ levy:100000 }, path:[], moveLeft:0 };
    s.armies.push(host); (index[host.at] || (index[host.at] = [])).push(host);
    return { before:before, reference:reference,
      after:FB.recruitmentTerritory(s, ids.enemy, index), fresh:FB.recruitmentTerritory(s, ids.enemy) };
  }, ids);
  expect(result.before).toEqual(result.reference);
  expect(result.after).toEqual(result.fresh);
});


test('supply batches reuse validated alliances without changing friendly counties', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, repair = FB.repairAlliances;
    const pair = ['player', ids.other].sort();
    s.alliances = [{ a:pair[0], b:pair[1],
      aGen:FB.realmRulerGeneration(s, pair[0]), bGen:FB.realmRulerGeneration(s, pair[1]) }];
    FB.repairAlliances(s);
    const allies = Object.create(null);
    for (const alliance of s.alliances) { allies[alliance.a] = alliance.b; allies[alliance.b] = alliance.a; }
    const host = { realm:'player', warId:s.player.war.id }, counties = Object.keys(FB.world.adj);
    let repairs = 0;
    FB.repairAlliances = function () { repairs++; return repair.apply(this, arguments); };
    try {
      const expected = counties.map(function (pid) { return FB.armyFriendlyProvince(s, host, pid); });
      const baseline = repairs; repairs = 0;
      const relations = { friendly:Object.create(null), hostile:Object.create(null), allies:allies };
      const actual = counties.map(function (pid) { return FB.armyFriendlyProvince(s, host, pid, relations); });
      return { expected:expected, actual:actual, baseline:baseline, repairs:repairs };
    } finally { FB.repairAlliances = repair; }
  }, ids);
  expect(result.actual).toEqual(result.expected);
  expect(result.baseline).toBeGreaterThan(0);
  expect(result.repairs).toBe(0);
});

test('allied refresh accepts shared capacity and still rejects a busy ally', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, busy = FB.isRealmAtWar;
    const pair = [ids.enemy, ids.other].sort();
    s.alliances = [{ a:pair[0], b:pair[1],
      aGen:FB.realmRulerGeneration(s, pair[0]), bGen:FB.realmRulerGeneration(s, pair[1]) }];
    FB.isRealmAtWar = function (state, rid) { return rid === ids.other ? false : busy(state, rid); };
    try {
      const expected = FB.alliedReinforcement(s, ids.enemy), reads = [];
      const actual = FB.alliedReinforcement(s, ids.enemy, function (rid) {
        reads.push(rid); return FB.aiBaseHost(s, rid);
      });
      const exhausted = FB.alliedReinforcement(s, ids.enemy, function () { return 0; });
      FB.isRealmAtWar = function (state, rid) { return rid === ids.other ? true : busy(state, rid); };
      const unavailable = FB.alliedReinforcement(s, ids.enemy, function () { throw new Error('Busy ally requested capacity'); });
      return { expected:expected, actual:actual, reads:reads, exhausted:exhausted, unavailable:unavailable };
    } finally { FB.isRealmAtWar = busy; }
  }, ids);
  expect(result.actual).toEqual(result.expected);
  expect(result.reads).toEqual([ids.enemy, ids.other]);
  expect(result.exhausted.men).toBe(0);
  expect(result.unavailable).toEqual({ ally:null, men:0 });
});

test('county support and levy share modifier records without retaining them across reads', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = ids.home, read = FB.countyModifierRecords;
    let calls = 0;
    FB.countyModifierRecords = function () { calls++; return read.apply(this, arguments); };
    try {
      const expectedSupport = FB.countyPopularSupport(s, pid);
      const expectedLevy = FB.modBonus(s, 'levy', pid, expectedSupport);
      calls = 0;
      const records = FB.countyModifierRecords(s, pid);
      const support = FB.countyPopularSupport(s, pid, records);
      const levy = FB.modBonus(s, 'levy', pid, support, records);
      const sharedCalls = calls;
      FB.setCountySupport(s, pid, -100);
      const next = FB.countyPopularSupport(s, pid);
      return { expectedSupport:expectedSupport, expectedLevy:expectedLevy,
        support:support, levy:levy, sharedCalls:sharedCalls, calls:calls, next:next };
    } finally { FB.countyModifierRecords = read; }
  }, ids);
  expect(result.support).toBe(result.expectedSupport);
  expect(result.levy).toBe(result.expectedLevy);
  expect(result.sharedCalls).toBe(1);
  expect(result.calls).toBeGreaterThan(1);
  expect(result.next).toBeLessThan(result.support);
});


test('retained county muster inputs see recovery, expiry, development and support edits', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = s.realms[ids.enemy].capital, start = s.turn;
    s.historicalAmbitions = {};
    if (s.population && s.population.counties[pid]) delete s.population.counties[pid].settlementCommunityProjects;
    FBDATA.modifiers.performance_levy_probe = { scope:'county', fx:{ commonVoice:-40, levy:0.1 }, recoverSupport:true, days:720 };
    s.modifiers.county[pid] = [{ id:'performance_levy_probe', supportSince:start, endTurn:start + 720 }];
    const territory = { counties:[pid], eligible:[pid], blocked:[], development:s.dev[pid] || 1, rally:pid };
    const counts = {}, previousTiming = FB.game._fastForwardTiming;
    FB.game._fastForwardTiming = { enter:function () { return {}; }, leave:function () {},
      count:function (key, amount) { counts[key] = (counts[key] || 0) + (amount === undefined ? 1 : amount); } };
    const rows = [], support = FB.countyPopularSupport, safe = support.militaryCacheSafe;
    function compare() {
      territory.development = s.dev[pid] || 1;
      const actual = FB.aiBaseHost(s, ids.enemy, territory);
      support.militaryCacheSafe = false;
      let expected;
      try { expected = FB.aiBaseHost(s, ids.enemy, territory); }
      finally { support.militaryCacheSafe = safe; }
      FB.aiBaseHost(s, ids.enemy, territory); // warm the retained entry again
      rows.push({ actual:actual, expected:expected });
    }
    try {
      compare(); s.turn++; compare();
      s.turn = start + 360; compare();
      FB.setCountySupport(s, pid, -30); compare();
      s.dev[pid] = (s.dev[pid] || 1) + 10; compare();
      FBDATA.modifiers.performance_levy_probe.fx.levy = 0.5; compare();
      s.turn = start + 720; compare();
      s.rebellions = { groups:{}, warnings:{}, cooldowns:{} };
      const counties = {}; counties[pid] = { occupied:true };
      s.rebellions.groups.performance_probe = { id:'performance_probe', target:ids.enemy,
        faction:'performance_rebels', counties:counties };
      FB.invalidateRealmCache(); compare();
      counties[pid].occupied = false; compare();
      return { rows:rows, retained:counts['Muster county inputs retained'] || 0 };
    } finally {
      support.militaryCacheSafe = safe;
      if (previousTiming) FB.game._fastForwardTiming = previousTiming; else delete FB.game._fastForwardTiming;
      delete FBDATA.modifiers.performance_levy_probe;
    }
  }, ids);
  expect(result.retained).toBeGreaterThan(0);
  for (const row of result.rows) expect(row.actual).toBe(row.expected);
});

test('order battle power shares repeated reads and expires before external previews', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pursue = FB.armyCanPursue, quality = FB.compRoleQuality;
    const player = FB.playerHost(s);
    player.at = ids.home; player.path = []; player.moveLeft = 0;
    player.men = player.size = 200; player.units = { levy:200 }; player.supply = 100;
    const enemy = { id:'power-cache-probe', realm:ids.enemy, warId:s.player.war.id, at:ids.second,
      men:100, size:100, units:{ levy:100 }, supply:100, path:[], moveLeft:0 };
    s.armies = [player, enemy];
    for (const rid in s.realms) s.armyDown[rid] = s.turn;
    let reads = 0, probes = 0, repeated = 0;
    FB.compRoleQuality = function () { reads++; return quality.apply(this, arguments); };
    FB.armyCanPursue = function (state, host, pid) {
      const first = FB.armyBattlePower(state, host, pid, 'attack');
      const before = reads;
      const second = FB.armyBattlePower(state, host, pid, 'attack');
      if (first !== second) throw new Error('Repeated order power changed');
      repeated += reads - before; probes++;
      return pursue(state, host, pid);
    };
    try {
      FB.armyTick(s);
      const before = reads;
      FB.armyBattlePower(s, enemy, ids.second, 'defense');
      const firstReads = reads - before;
      enemy.men = 1; enemy.units = { levy:1 }; enemy.supply = 0;
      FB.armyBattlePower(s, enemy, ids.second, 'defense');
      return { probes:probes, repeated:repeated, firstReads:firstReads, secondReads:reads - before - firstReads };
    } finally { FB.armyCanPursue = pursue; FB.compRoleQuality = quality; }
  }, ids);
  expect(result.probes).toBeGreaterThan(0);
  expect(result.repeated).toBe(0);
  expect(result.firstReads).toBeGreaterThan(0);
  expect(result.secondReads).toBeGreaterThan(0);
});
