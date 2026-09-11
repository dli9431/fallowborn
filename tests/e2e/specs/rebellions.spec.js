'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/rebellions.js', 'js/institutions.js',
  'js/armies.js', 'js/fortifications.js', 'js/modifiers.js', 'js/events.js',
  'js/world.js', 'js/wars.js', 'js/save.js', 'js/ui_modals.js', 'js/ui_panels.js',
  'data/events_politics.js', 'data/modifiers.js', 'data/map_data.js', 'data/technology.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state;
    FB.endPlayerWar(s, true);
    s.armies = []; s.modifiers = { county:{} }; s.countySupport = {};
    s.rebellions = { groups:{}, warnings:{}, cooldowns:{}, nextScan:s.turn + 10000 };
    s.player.gold = 10000; s.player.prestige = 1000; s.eventQueue = [];
    window.revoltWarning = function (pids, support) {
      const s = FB.state;
      pids.forEach(function (pid) { FB.setCountySupport(s, pid, support); });
      const row = { id:'uprising:test', stage:'petition', scopeId:pids[0], countyIds:pids,
        visitedCountyIds:pids.slice(), countyStates:{}, privilegeId:'tax_concession',
        protagonistId:s.player.charId, liegeId:s.player.liege || null, startedTurn:s.turn };
      pids.forEach(function (pid) { row.countyStates[pid] = { phase:'petition', joinedTurn:s.turn }; });
      s.collectiveDemands.uprising = row;
      FB.restoreCommonsUprising(s);
      return s.eventQueue.find(function (event) { return event.id === 'commons_uprising_warning'; }).ctx;
    };
  });
  return ids;
}

test('response costs scale by every county and include treasury and prestige percentages', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -60); FB.setCountySupport(s, ids.second, -100);
    const before = JSON.stringify(s), rng = FB.getRngState();
    const quote = FB.revoltResponseTerms(s, [ids.home, ids.second], 'player');
    return { quote:quote, pure:before === JSON.stringify(s) && rng === FB.getRngState(),
      technology:FBDATA.techImpactReviews.features.local_commons_uprisings.mode };
  }, ids);
  expect(result.quote).toMatchObject({ units:8, concede:3440, negotiate:2960, suppress:3200, prestige:100 });
  expect(result.quote.suppressionChance).toBeCloseTo(0.5);
  expect(result.pure).toBe(true);
  expect(result.technology).toBe('none');
});

test('muster scales from half to all of the same county potential', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = ids.home;
    FB.setCountySupport(s, pid, -50);
    const half = FB.rebelLevySize(s, pid);
    FB.setCountySupport(s, pid, -75);
    const threeQuarters = FB.rebelLevySize(s, pid);
    FB.setCountySupport(s, pid, -100);
    const full = FB.rebelLevySize(s, pid);
    FB.setCountySupport(s, pid, -1000);
    return { half:half, threeQuarters:threeQuarters, full:full, capped:FB.rebelLevySize(s, pid) };
  }, ids);
  expect(result.full).toBeGreaterThan(0);
  expect(Math.abs(result.half * 2 - result.full)).toBeLessThanOrEqual(1);
  expect(Math.abs(result.threeQuarters - result.full * 0.75)).toBeLessThan(1);
  expect(result.capped).toBe(result.full);
});

test('a mixed warning and armed settlement charges and relieves the entire roster', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    window.revoltWarning([ids.home, ids.second], -20);
    FB.setCountySupport(s, ids.home, -80);
    const group = FB.startOpenRevolt(s, ids.home);
    const row = s.collectiveDemands.uprising;
    const quote = FB.revoltResponseTerms(s, row.countyIds, 'player');
    const receipt = FB.concedeCommonsUprising(s, row.id);
    return { resolved:!!receipt, spent:10000 - s.player.gold, expected:quote.concede,
      dissolved:!FB.rebellionById(s, group.id),
      relieved:[ids.home, ids.second].every(function (pid) { return FB.hasModifier(s, 'uprising_settlement', pid); }) };
  }, ids);
  expect(result.resolved).toBe(true);
  expect(result.spent).toBe(result.expected);
  expect(result.dissolved).toBe(true);
  expect(result.relieved).toBe(true);
});

test('real siege pulses capture home before opening a neighboring negative county', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -100); FB.setCountySupport(s, ids.second, -10);
    const group = FB.startOpenRevolt(s, ids.home);
    s.armies = s.armies.filter(function (a) { return a.rebellionId; });
    const host = s.armies[0], record = group.counties[ids.home];
    // An unfortified county isolates occupation timing from garrison casualties.
    record.fortLevel = 0;
    const firstGoal = FB.rebelArmyGoal(s, host);
    const required = FB.fortSiegeStatus(s, ids.home, record, [host]).required;
    FB.rebellionsAfterArmies(s);
    s.turn += 29; FB.rebellionsAfterArmies(s);
    const early = record.progress;
    s.turn++; FB.rebellionsAfterArmies(s);
    for (let i = 1; i < required; i++) { s.turn += 30; FB.rebellionsAfterArmies(s); }
    return { firstGoal:firstGoal, early:early, occupied:record.occupied,
      nextCounty:!!group.counties[ids.second], nextGoal:FB.rebelArmyGoal(s, host),
      noPrematureHost:s.armies.filter(function (a) { return a.rebellionId; }).length === 1,
      tax:FB.modBonus(s, 'tax', ids.home), stillRebelling:!!FB.rebellionById(s, group.id) };
  }, ids);
  expect(result).toEqual({ firstGoal:ids.home, early:0, occupied:true,
    nextCounty:true, nextGoal:ids.second, noPrematureHost:true, tax:-1, stillRebelling:true });
});

test('concession charges once, preserves unjust-war debt, and grants five-year relief', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, ctx = window.revoltWarning([ids.home, ids.second], -20);
    FB.addModifier(s, 'aggressive_rule', ids.home, { supportDebt:40, silent:true });
    const debt = JSON.stringify(FB.countyModifierRecords(s, ids.home).find(function (r) { return r.id === 'aggressive_rule'; }));
    const quote = FB.revoltResponseTerms(s, [ids.home, ids.second], 'player');
    const ev = FB.eventById('commons_uprising_warning');
    const first = FB.resolveEventOption(s, ev, ev.options[0], ctx);
    const after = JSON.stringify(s), rng = FB.getRngState();
    const replay = FB.resolveEventOption(s, ev, ev.options[0], ctx);
    return { resolved:!!first, gold:s.player.gold, prestige:s.player.prestige, quote:quote,
      replay:replay, unchanged:after === JSON.stringify(s) && rng === FB.getRngState(),
      durations:[ids.home, ids.second].map(function (pid) {
        return FB.countyModifierRecords(s, pid).find(function (r) { return r.id === 'uprising_settlement'; }).endTurn - s.turn;
      }), debtKept:debt === JSON.stringify(FB.countyModifierRecords(s, ids.home).find(function (r) { return r.id === 'aggressive_rule'; })) };
  }, ids);
  expect(result.resolved).toBe(true);
  expect(result.gold).toBe(10000 - result.quote.concede);
  expect(result.prestige).toBe(900);
  expect(result.replay).toBe(false);
  expect(result.unchanged).toBe(true);
  expect(result.durations).toEqual([1800,1800]);
  expect(result.debtKept).toBe(true);
});

test('unaffordable revolt choices cannot roll or mutate state', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, ctx = window.revoltWarning([ids.home], -100);
    s.player.gold = 10;
    const ev = FB.eventById('commons_uprising_warning');
    const status = FB.eventOptionStatus(s, ev, ev.options[0], ctx);
    const before = JSON.stringify(s), rng = FB.getRngState();
    const receipt = FB.resolveEventOption(s, ev, ev.options[0], ctx);
    return { status:status, receipt:receipt, unchanged:before === JSON.stringify(s) && rng === FB.getRngState() };
  }, ids);
  expect(result.status).toMatchObject({ visible:true, ready:false });
  expect(result.receipt).toBe(false);
  expect(result.unchanged).toBe(true);
});

for (const support of [-49, -50, -100]) {
  test('armed muster after the warning at support ' + support, async function ({ page }, testInfo) {
    const ids = await setup(page, testInfo);
    const result = await page.evaluate(function (args) {
      const s = FB.state, pid = args.ids.home;
      const ctx = window.revoltWarning([pid], args.support);
      const ev = FB.eventById('commons_uprising_warning');
      FB.resolveEventOption(s, ev, ev.options[1], ctx);
      s.turn += 89; FB.institutionsDay(s);
      const early = s.armies.filter(function (a) { return a.rebellionId; }).length;
      s.turn++; FB.institutionsDay(s);
      const hosts = s.armies.filter(function (a) { return a.rebellionId; });
      const expected = FB.rebelLevySize(s, pid);
      FB.institutionsDay(s);
      return { early:early, count:hosts.length, men:hosts[0] && hosts[0].men,
        expected:expected, repeated:s.armies.filter(function (a) { return a.rebellionId; }).length };
    }, { ids:ids, support:support });
    expect(result.early).toBe(0);
    expect(result.count).toBe(support <= -50 ? 1 : 0);
    expect(result.repeated).toBe(result.count);
    if (support <= -50) expect(result.men).toBe(result.expected);
  });
}

test('AI warnings escalate independently without spending player resources', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, pid = s.realms[ids.enemy].capital;
    FB.setCountySupport(s, pid, -80);
    s.rebellions.nextScan = s.turn;
    FB.rebellionsDay(s);
    const warning = s.rebellions.warnings[pid];
    const gold = s.player.gold, prestige = s.player.prestige;
    const chance = FB.chance;
    try {
      FB.chance = function () { return false; };
      s.turn += 30; FB.rebellionsDay(s);
      const spent = FB.hasModifier(s, 'uprising_response_cost', pid);
      s.turn = warning.startedTurn + 90; FB.rebellionsDay(s);
      return { spent:spent, group:!!FB.countyInOpenRevolt(s, pid),
        host:s.armies.some(function (a) { return a.rebellionId && a.homeCounty === pid; }),
        playerUntouched:s.player.gold === gold && s.player.prestige === prestige };
    } finally { FB.chance = chance; }
  }, ids);
  expect(result).toEqual({ spent:true, group:true, host:true, playerUntouched:true });
});

test('daily army processing neither starves nor replenishes rebel troops', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -80);
    const group = FB.startOpenRevolt(s, ids.home);
    const host = s.armies.find(function (a) { return a.rebellionId === group.id; });
    host.at = s.realms[ids.other].capital;
    host.from = host.at; host.path = []; host.moveLeft = 10;
    host.size = host.men + 1000; host.supply = 0;
    const men = host.men;
    s.turn++; FB.armyTick(s);
    return { men:host.men, before:men, supply:host.supply,
      retained:s.armies.indexOf(host) >= 0, noCampaign:!host.warId };
  }, ids);
  expect(result.retained).toBe(true);
  expect(result.men).toBe(result.before);
  expect(result.supply).toBe(100);
  expect(result.noCampaign).toBe(true);
});

test('local rebels are not cut off before occupation but remain encircleable away from their uprising', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -80);
    const group = FB.startOpenRevolt(s, ids.home);
    const host = s.armies.find(function (a) { return a.rebellionId === group.id; });
    const adjacent = FB.world.adj;
    const crossing = FB.waterCrossing;
    const outside = s.realms[ids.other].capital;
    // Isolate two land exits, both held by realms hostile to this uprising.
    FB.world.adj = {};
    FB.world.adj[ids.home] = {}; FB.world.adj[ids.home][outside] = 1;
    FB.world.adj[outside] = {}; FB.world.adj[outside][ids.home] = 1;
    FB.waterCrossing = function () { return false; };
    try {
      group.counties[ids.home].occupied = false;
      host.at = ids.home;
      const local = FB.hostCutOff(s, host);
      const ordinary = FB.hostCutOff(s, { realm:host.realm, at:ids.home, men:host.men });
      host.at = outside;
      const away = FB.hostCutOff(s, host);
      host.at = ids.home;
      delete s.rebellions.groups[group.id];
      return { local:local, ordinary:ordinary, away:away, expired:FB.hostCutOff(s, host) };
    } finally {
      FB.world.adj = adjacent;
      FB.waterCrossing = crossing;
    }
  }, ids);
  expect(result).toEqual({ local:false, ordinary:true, away:true, expired:true });
});

test('rebel hosts cooperate, are universally hostile otherwise, and survive save restoration', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -50); FB.setCountySupport(s, ids.second, -100);
    const group = FB.startOpenRevolt(s, ids.home);
    FB.startOpenRevolt(s, ids.second);
    const hosts = s.armies.filter(function (a) { return a.rebellionId; });
    const hostile = FB.armiesHostile(s, hosts[0], { realm:ids.other });
    const friendly = !FB.armiesHostile(s, hosts[0], hosts[1]);
    const total = hosts[0].men + hosts[1].men;
    hosts[1].at = ids.home; hosts[1].path = []; hosts[1].moveLeft = 0;
    hosts[0].supply = 0;
    FB.rebellionsAfterArmies(s);
    const merged = s.armies.find(function (a) { return a.rebellionId; });
    const raw = JSON.parse(FB.save.serialize());
    FB.save.restore(raw);
    const restored = FB.state.armies.filter(function (a) { return a.rebellionId === group.id; });
    const before = JSON.stringify(FB.state.rebellions), rng = FB.getRngState();
    FB.ensureRebellions(FB.state);
    return { hostile:hostile, friendly:friendly, total:total, merged:merged.men,
      supply:FB.hostSupply(merged), count:restored.length, restoredMen:restored[0].men,
      pure:before === JSON.stringify(FB.state.rebellions) && rng === FB.getRngState() };
  }, ids);
  expect(result.hostile).toBe(true); expect(result.friendly).toBe(true);
  expect(result.merged).toBe(result.total); expect(result.supply).toBe(100);
  expect(result.count).toBe(1); expect(result.restoredMen).toBe(result.total);
  expect(result.pure).toBe(true);
});

test('defeating the last host clears occupation without changing support', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -80);
    const group = FB.startOpenRevolt(s, ids.home);
    group.counties[ids.home].occupied = true;
    const blocked = FB.recruitmentCountyBlocked(s, 'player', ids.home);
    const tax = FB.modBonus(s, 'tax', ids.home);
    const support = FB.countyPopularSupport(s, ids.home);
    s.armies.filter(function (a) { return a.rebellionId; }).forEach(function (a) { FB.disbandArmy(s, a); });
    FB.rebellionsAfterArmies(s);
    return { blocked:blocked, tax:tax, group:FB.rebellionById(s, group.id),
      supportUnchanged:FB.countyPopularSupport(s, ids.home) === support,
      cooldown:s.rebellions.cooldowns[ids.home] - s.turn,
      restart:FB.startOpenRevolt(s, ids.home) };
  }, ids);
  expect(result).toEqual({ blocked:true, tax:-1, group:null, supportUnchanged:true, cooldown:720, restart:null });
});

test('connected occupied counties win one independent duchy with a new ruler', async function ({ page }, testInfo) {
  const ids = await setup(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    FB.setCountySupport(s, ids.home, -60); FB.setCountySupport(s, ids.second, -60);
    const group = FB.startOpenRevolt(s, ids.home); FB.startOpenRevolt(s, ids.second);
    group.counties[ids.home].occupied = true; group.counties[ids.second].occupied = true;
    const generation = s.generation;
    FB.rebellionsAfterArmies(s);
    const rid = s.owner[ids.home], realm = s.realms[rid];
    return { sameRealm:rid === s.owner[ids.second], independent:realm.liege === null,
      rank:realm.rank, newRealm:rid !== 'player', ruler:!!(realm.ruler && realm.ruler.name),
      noHosts:!s.armies.some(function (a) { return a.rebellionId === group.id; }),
      retainedLife:s.generation === generation };
  }, ids);
  expect(result).toEqual({ sameRealm:true, independent:true, rank:2, newRealm:true, ruler:true, noHosts:true, retainedLife:true });
});
