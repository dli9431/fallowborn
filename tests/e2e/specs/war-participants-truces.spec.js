'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/wars.js', 'js/world.js', 'js/actions.js', 'js/armies.js', 'js/save.js', 'js/ui_misc.js',
  'js/ui_modals.js', 'js/events.js', 'data/technology.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('boolean war checks avoid opponent lists and reflect same-day peace', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state;
    s.player.liege = ids.liege;
    s.realms[ids.liege].war = { enemy:ids.other };
    const original = FB.warOpponents;
    let lists = 0;
    FB.warOpponents = function () { lists++; return original.apply(this, arguments); };
    const rng = FB.getRngState();
    let active, peaceful, personal;
    try {
      active = ['player', ids.enemy, ids.liege, ids.other].map(function (id) {
        return FB.isRealmAtWar(s, id);
      });
      s.realms[ids.liege].war = null;
      peaceful = [ids.liege, ids.other].map(function (id) { return FB.isRealmAtWar(s, id); });
      personal = FB.isRealmAtWar(s, 'player');
    } finally { FB.warOpponents = original; }
    return { active:active, peaceful:peaceful, personal:personal, lists:lists,
      rngSame:rng === FB.getRngState() };
  }, ids);
  expect(result).toEqual({ active:[true, true, true, true], peaceful:[false, false],
    personal:true, lists:0, rngSame:true });
});

for (const preferred of ['hre', null]) {
  test('personal and liege campaigns survive repair: ' + (preferred || 'another liege'),
    async function ({ page }, testInfo) {
      const ids = await startWarSafety(page, testInfo);
      const result = await page.evaluate(function (args) {
        const s = FB.state, ids = args.ids;
        if (args.preferred && !s.realms[args.preferred]) {
          s.realms[args.preferred] = Object.assign({}, s.realms[ids.liege], {
            id:args.preferred, name:'Holy Roman Empire', liege:null, war:null
          });
        }
        const liege = args.preferred && s.realms[args.preferred] &&
          args.preferred !== ids.enemy && args.preferred !== ids.other ? args.preferred : ids.liege;
        s.player.liege = liege; s.realms.player.liege = liege;
        for (const pid of s.player.provs) s.owner[pid] = liege;
        FB.invalidateRealmCache();
        s.realms[liege].war = { enemy:ids.other, years:0 };
        const before = FB.getRngState();
        FB.repairWars(s);
        const preserved = !!s.player.war && !!s.realms[liege].war;
        const opponents = FB.warOpponents(s, 'player');
        const liegeOpponents = FB.warOpponents(s, liege);
        const hostile = FB.armiesHostile(s, { realm:'player' }, { realm:ids.enemy });
        const neutral = FB.armiesHostile(s, { realm:liege }, { realm:ids.enemy });
        const notices = FB.warStatusText(s, liege);
        FB.endPlayerWar(s);
        return { preserved:preserved, opponents:opponents, liegeOpponents:liegeOpponents,
          hostile:hostile, neutral:neutral, notices:notices,
          rngStable:before === FB.getRngState(),
          canDeclare:FB.instantStatus(s, 'declare_war').can,
          householdAtWar:FB.playerRealmAtWar(s),
          liegeTruce:FB.truceExpiry(s, liege, ids.enemy) };
      }, { ids:ids, preferred:preferred });
      expect(result.preserved).toBe(true);
      expect(result.opponents).toEqual([ids.enemy]);
      expect(result.liegeOpponents).toEqual([ids.other]);
      expect(result.hostile).toBe(true);
      expect(result.neutral).toBe(false);
      expect(result.rngStable).toBe(true);
      expect(result.canDeclare).toBe(true);
      expect(result.householdAtWar).toBe(true);
      expect(result.liegeTruce).toBe(0);
    });
}

test('normal settlements protect both directions for exactly 720 days across serialization and ruler changes',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, start = s.turn;
      const cause = { type:'fabricated', enemy:ids.enemy, target:s.player.war.target };
      FB.fns.war_accept_tribute(s);
      const expiry = FB.truceExpiry(s, 'player', ids.enemy);
      const reverse = FB.truceExpiry(s, ids.enemy, 'player');
      const declaration = FB.startPlayerWar(s, cause);
      const text = FB.truceText(s, 'player', ids.enemy);
      const date = FB.dateAtTurn(s, expiry);
      const expectedText = 'Truce until ' + FB.seasonName(date.season) + ' ' + date.day + ', ' + date.year + '.';
      s.realms[ids.enemy].generation = (s.realms[ids.enemy].generation || 0) + 1;
      const restored = JSON.parse(JSON.stringify(s));
      FB.repairWars(restored);
      const afterLoad = FB.truceExpiry(restored, 'player', ids.enemy);
      restored.turn = start + 719;
      const beforeExpiry = FB.truceExpiry(restored, 'player', ids.enemy);
      restored.turn++;
      const atExpiry = FB.truceExpiry(restored, ids.enemy, 'player');
      FB.concludeOrdinaryWar(s, ids.liege, { enemy:ids.other });
      const ai = FB.truceExpiry(s, ids.other, ids.liege);
      const invalid = { enemy:ids.other };
      FB.concludeOrdinaryWar(s, ids.enemy, invalid, true);
      return { start:start, expiry:expiry, reverse:reverse, declaration:declaration,
        text:text, expectedText:expectedText, afterLoad:afterLoad, beforeExpiry:beforeExpiry, atExpiry:atExpiry,
        ai:ai, invalid:FB.truceExpiry(s, ids.enemy, ids.other) };
    }, ids);
    expect(result.expiry).toBe(result.start + 720);
    expect(result.reverse).toBe(result.expiry);
    expect(result.declaration).toBe(false);
    expect(result.text).toBe(result.expectedText);
    expect(result.text).not.toMatch(/\bturn\b/i);
    expect(result.afterLoad).toBe(result.expiry);
    expect(result.beforeExpiry).toBe(result.expiry);
    expect(result.atExpiry).toBe(0);
    expect(result.ai).toBe(result.expiry);
    expect(result.invalid).toBe(0);
  });

test('save restore preserves active concurrent wars and the canonical truce ledger',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.player.liege = ids.liege; s.realms.player.liege = ids.liege;
      for (const pid of s.player.provs) s.owner[pid] = ids.liege;
      s.realms[ids.liege].war = { enemy:ids.other, years:0 };
      FB.invalidateRealmCache();
      FB.concludeOrdinaryWar(s, ids.enemy, { enemy:ids.other });
      const expiry = FB.truceExpiry(s, ids.enemy, ids.other);
      const data = JSON.parse(FB.save.serialize());
      const restored = FB.save.restore(data);
      return { version:data.v, personal:restored.player.war.enemy,
        liege:restored.realms[ids.liege].war.enemy,
        expiry:expiry, restoredExpiry:FB.truceExpiry(restored, ids.other, ids.enemy) };
    }, ids);
    expect(result.version).toBe(3);
    expect(result.personal).toBe(ids.enemy);
    expect(result.liege).toBe(ids.other);
    expect(result.restoredExpiry).toBe(result.expiry);
  });

test('AI offensive selection excludes a protected opponent in either direction',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      s.owner[ids.home] = ids.liege; s.holder[ids.home] = ids.liege;
      s.owner[ids.second] = ids.other; s.holder[ids.second] = ids.other;
      FB.invalidateRealmCache();
      const before = FB.aiExpansionTarget(s, ids.liege, [ids.other]);
      FB.concludeOrdinaryWar(s, ids.liege, { enemy:ids.other });
      return { before:!!before,
        forward:FB.aiExpansionTarget(s, ids.liege, [ids.other]),
        reverse:FB.aiExpansionTarget(s, ids.other, [ids.liege]) };
    }, ids);
    expect(result.before).toBe(true);
    expect(result.forward).toBeNull();
    expect(result.reverse).toBeNull();
  });

test('voluntary independence respects the truce with the actual liege',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state;
      FB.endPlayerWar(s);
      s.player.liege = ids.enemy; s.realms.player.liege = ids.enemy;
      const before = FB.getRngState();
      const result = FB.doIndependence(s);
      return { result:result, liege:s.player.liege, war:s.player.war,
        rngStable:FB.getRngState() === before };
    }, ids);
    expect(result).toEqual({ result:false, liege:ids.enemy, war:null, rngStable:true });
  });

test('seasonal AI peace records a truce through the normal conclusion boundary',
  async function ({ page }, testInfo) {
    const ids = await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (ids) {
      const s = FB.state, chance = FB.chance;
      s.realms[ids.liege].war = { enemy:ids.other, target:s.realms[ids.other].capital, seasons:32, captures:0 };
      // Suppress incidental mortality and new declarations around the deterministic deadline.
      FB.chance = function () { return false; };
      FB.playerWarTick(s);
      FB.chance = chance;
      return { war:s.realms[ids.liege].war,
        expiry:FB.truceExpiry(s, ids.liege, ids.other), turn:s.turn };
    }, ids);
    expect(result.war).toBeNull();
    expect(result.expiry).toBe(result.turn + 720);
  });
