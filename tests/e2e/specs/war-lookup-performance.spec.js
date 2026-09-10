'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/wars.js', 'js/armies.js', 'js/world.js', 'js/save.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('daily army and hostility queries reuse the campaign registry with retained history', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    for (let i = 0; i < 64; i++) s.wars['history_' + i] = {
      id:'history_' + i, status:'ended', startedTurn:-100, endedTurn:0,
      attacker:ids.liege, defender:ids.other
    };
    FB.repairWars(s);
    const expected = s.player.war.id;
    // Prevent new musters so this measures daily discovery, not army creation.
    for (const rid in s.realms) s.armyDown[rid] = s.turn;
    const originalKeys = Object.keys, originalLists = FB.realmWars;
    let scans = 0, lists = 0, correct = true;
    Object.keys = function (value) {
      if (value === s.wars) scans++;
      return originalKeys(value);
    };
    FB.realmWars = function () { lists++; return originalLists.apply(this, arguments); };
    const before = JSON.stringify(s), rng = FB.getRngState();
    let pure, hostilityReads = 0;
    try {
      for (let i = 0; i < 100; i++) {
        correct = correct && s.player.war.id === expected &&
          FB.ordinaryWarBetween(s, ids.enemy, 'player').id === expected &&
          FB.battleOrdinaryWar(s, { realm:'player' }, { realm:ids.enemy }).id === expected &&
          !FB.armiesHostile(s, { realm:ids.liege }, { realm:ids.other });
      }
      pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const war = s.wars[expected], attacker = Object.getOwnPropertyDescriptor(war, 'attacker');
      Object.defineProperty(war, 'attacker', { configurable:true, enumerable:true,
        get:function () { hostilityReads++; return attacker.value; } });
      try {
        for (let i = 0; i < 100; i++) {
          correct = correct && FB.armiesHostile(s, { realm:'player' }, { realm:ids.enemy });
        }
      } finally { Object.defineProperty(war, 'attacker', attacker); }
      lists = 0;
      for (let i = 0; i < 3; i++) { s.turn++; FB.armyTick(s); }
    } finally { Object.keys = originalKeys; FB.realmWars = originalLists; }
    return { scans:scans, lists:lists, hostilityReads:hostilityReads,
      correct:correct, pure:pure, armies:s.armies.length };
  }, ids);
  expect(result.correct).toBe(true);
  expect(result.pure).toBe(true);
  expect(result.scans).toBeLessThanOrEqual(1);
  expect(result.lists).toBeLessThan(20);
  expect(result.hostilityReads).toBeLessThan(4);
  expect(result.armies).toBe(0);
});

test('same-day registration, legacy replacement, peace and remapping refresh war queries', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, turn = s.turn;
    function hostile(a, b) { return FB.armiesHostile(s, { realm:a }, { realm:b }); }
    const before = hostile(ids.liege, ids.other);
    s.realms[ids.liege].war = { enemy:ids.other, target:s.realms[ids.other].capital };
    const first = FB.ordinaryWarBetween(s, ids.liege, ids.other);
    const started = hostile(ids.liege, ids.other);
    s.realms[ids.liege].war = { enemy:ids.other, target:s.realms[ids.other].capital };
    const replacement = FB.ordinaryWarBetween(s, ids.liege, ids.other);
    const replaced = first.status === 'ended' && replacement.id !== first.id &&
      s.realms[ids.liege].war === replacement && hostile(ids.liege, ids.other);
    FB.settleOrdinaryWar(s, replacement.id, 'white_peace');
    const ended = !hostile(ids.liege, ids.other) && !s.realms[ids.liege].war;
    const w = FB.registerOrdinaryWar(s, ids.liege,
      { enemy:ids.other, target:s.realms[ids.other].capital });
    hostile(ids.liege, ids.other);
    FB.remapWarRealm(s, ids.liege, ids.enemy);
    const remapped = !hostile(ids.liege, ids.other) && hostile(ids.enemy, ids.other) &&
      FB.ordinaryWarBetween(s, ids.enemy, ids.other) === w;
    FB.withOrdinaryWar(s, w.id, function () { s.realms[ids.enemy].war = null; });
    const legacyEnded = !hostile(ids.enemy, ids.other);
    hostile('player', ids.enemy);
    FB.endPlayerWar(s, true);
    const playerPeace = !s.player.war && !hostile('player', ids.enemy);
    return { before:before, started:started, replaced:replaced, ended:ended,
      remapped:remapped, legacyEnded:legacyEnded, playerPeace:playerPeace, sameDay:turn === s.turn };
  }, ids);
  expect(result).toEqual({ before:false, started:true, replaced:true, ended:true,
    remapped:true, legacyEnded:true, playerPeace:true, sameDay:true });
});

test('hostility retains campaign priority and refreshes after hierarchy changes and repair', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    // Two overlapping campaigns allow either banner to select its assigned war.
    s.realms.perf_left = { id:'perf_left', alive:true, liege:ids.liege, rank:1 };
    s.realms.perf_right = { id:'perf_right', alive:true, liege:ids.other, rank:1 };
    FB.invalidateRealmCache();
    const older = FB.registerOrdinaryWar(s, ids.liege, {
      id:'war_90009', enemy:ids.other, target:s.realms[ids.other].capital, startedTurn:s.turn
    });
    const newer = FB.registerOrdinaryWar(s, 'perf_left', {
      id:'war_90010', enemy:'perf_right', target:s.realms[ids.other].capital, startedTurn:s.turn
    });
    const a = { realm:'perf_left' }, b = { realm:'perf_right' };
    const fallback = FB.battleOrdinaryWar(s, a, b).id;
    a.warId = newer.id;
    const assigned = FB.battleOrdinaryWar(s, a, b).id;
    b.warId = older.id;
    const priority = FB.battleOrdinaryWar(s, a, b).id;
    // Returned lists are disposable, not mutable aliases of the cache.
    FB.realmWars(s, 'perf_left').length = 0;
    FB.ordinaryWars(s).length = 0;
    const isolated = FB.realmWars(s, 'perf_left').length === 1;
    FB.settleOrdinaryWar(s, newer.id, 'invalid');
    const afterPeace = FB.battleOrdinaryWar(s, a, b).id;
    s.realms.perf_left.liege = null;
    FB.invalidateRealmCache();
    const neutral = FB.battleOrdinaryWar(s, a, b) === null;
    s.realms.perf_left.liege = ids.liege;
    FB.invalidateRealmCache();
    const restoredHierarchy = FB.battleOrdinaryWar(s, a, b).id;
    s.wars = JSON.parse(JSON.stringify(s.wars));
    const replaced = FB.battleOrdinaryWar(s, a, b) === s.wars[older.id];
    s.wars[older.id].status = 'ended';
    FB.repairWars(s);
    const repaired = FB.battleOrdinaryWar(s, a, b) === null;
    const restored = JSON.parse(JSON.stringify(s));
    FB.repairWars(restored);
    const loaded = FB.realmWars(restored, 'player').map(function (w) { return w.id; });
    return { fallback:fallback, assigned:assigned, priority:priority, isolated:isolated,
      afterPeace:afterPeace, neutral:neutral, restoredHierarchy:restoredHierarchy,
      replaced:replaced, repaired:repaired, loaded:loaded,
      playerWars:FB.realmWars(s, 'player').map(function (w) { return w.id; }) };
  }, ids);
  expect(result.fallback).toBe('war_90009');
  expect(result.assigned).toBe('war_90010');
  expect(result.priority).toBe('war_90009');
  expect(result.isolated).toBe(true);
  expect(result.afterPeace).toBe('war_90009');
  expect(result.neutral).toBe(true);
  expect(result.restoredHierarchy).toBe('war_90009');
  expect(result.replaced).toBe(true);
  expect(result.repaired).toBe(true);
  expect(result.loaded).toEqual(result.playerWars);
});
