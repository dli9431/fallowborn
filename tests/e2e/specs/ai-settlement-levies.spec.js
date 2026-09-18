'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/world.js', 'js/lordships.js', 'js/armies.js', 'js/fortifications.js',
  'js/population.js', 'js/modifiers.js', 'js/technology.js', 'js/main.js',
  'data/map_data.js', 'data/counties.js', 'data/bookmarks.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/economy.js',
  'data/technology.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

test('867 kingdoms and empires retain their pre-settlement campaign scale', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    return ['west_francia', 'abbasid', 'byzantium'].map(function (rid) {
      const territory = FB.recruitmentTerritory(s, rid);
      // Historical territorial formula, independent of personal fiscal outputs.
      const development = territory.eligible.reduce(function (sum, pid) {
        return sum + (s.dev[pid] || 1) * Math.max(0, 1 + FB.modBonus(s, 'levy', pid));
      }, 0);
      const base = Math.round(development * 90 * 0.3 *
        (1 + FB.techBonus(s, 'levy', rid)) * FB.papacyRealmStrengthMultiplier(s, rid));
      const captive = FB.intrigueRealmRulerCaptive(s, rid) ? 0.8 : 1;
      const expected = Math.max(0, Math.round(base * captive) -
        FB.fortGarrisonBurden(s, rid, rid, territory));
      return { rid:rid, year:s.date.year, expected:expected, men:FB.aiBaseHost(s, rid),
        available:FB.realmHostAvailability(s, rid),
        nested:FB.realmDirectVassals(s, rid).some(function (id) {
          return FB.realmDirectVassals(s, id).length > 0;
        }) };
    });
  });
  for (const realm of result) {
    expect(realm.year).toBe(867);
    expect(realm.nested).toBe(true);
    expect(realm.men, realm.rid).toBe(realm.expected);
    expect(realm.men, realm.rid).toBeGreaterThan(realm.rid === 'west_francia' ? 0 : 3000);
    expect(realm.available.current).toBe(realm.men);
    expect(realm.available.maximum).toBe(realm.men);
  }
});

test('intermediate dukes do not repeatedly discount the sovereign campaign force', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'abbasid';
    const before = FB.aiBaseHost(s, rid);
    let flattened = 0;
    Object.keys(s.realms).forEach(function (id) {
      if (id !== rid && s.realms[id].alive && s.realms[id].liege !== rid &&
          FB.topRealm(s, id) === rid) {
        s.realms[id].liege = rid;
        flattened++;
      }
    });
    FB.invalidateSettlementLordships(s);
    return { before:before, after:FB.aiBaseHost(s, rid), flattened:flattened };
  });
  expect(result.flattened).toBeGreaterThan(0);
  expect(result.after).toBe(result.before);
});

test('territorial campaign levies still respect recruitment, support, captivity and garrisons', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'byzantium';
    const ids = FB.realmTerritory(s, rid).slice(0, 3);
    ids.forEach(function (pid) { s.dev[pid] = 10; });
    const territory = { rally:ids[0], counties:ids, eligible:ids.slice(), blocked:[] };
    const originals = {};
    function stub(name, fn) { originals[name] = FB[name]; FB[name] = fn; }
    let voice = 0, captive = false, garrison = 100;
    stub('countyPopularSupport', function () { return voice; });
    stub('modBonus', function () { return voice / 100; });
    stub('techBonus', function () { return 0; });
    stub('papacyRealmStrengthMultiplier', function () { return 1; });
    stub('intrigueRealmRulerCaptive', function () { return captive; });
    stub('fortGarrisonBurden', function () { return garrison; });
    function muster() { return FB.aiBaseHost(s, rid, territory); }
    try {
      const full = muster();
      territory.eligible = ids.slice(0, 2); territory.blocked = [ids[2]];
      const occupied = muster();
      territory.eligible = ids.slice(); territory.blocked = [];
      captive = true;
      const prisoner = muster();
      captive = false; voice = -100;
      const unsupported = muster();
      voice = 0; garrison = 2000;
      const exhausted = muster();
      garrison = 0; territory.rally = null; territory.eligible = [];
      const noRally = muster();
      return { full:full, occupied:occupied, prisoner:prisoner,
        unsupported:unsupported, exhausted:exhausted, noRally:noRally };
    } finally {
      Object.keys(originals).forEach(function (name) { FB[name] = originals[name]; });
    }
  });
  // Thirty development supplies 810 campaign troops before the 100-man garrison.
  expect(result).toEqual({ full:710, occupied:440, prisoner:548,
    unsupported:0, exhausted:0, noRally:0 });
});
