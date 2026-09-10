'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/modifiers.js', 'js/actions.js', 'js/events.js',
  'js/institutions.js', 'js/world.js', 'js/wars.js', 'js/main.js', 'js/save.js',
  'js/ui_panels.js', 'data/modifiers.js', 'data/map_data.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('legacy support migrates once and stays with counties across transfers', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, home = s.player.provinceId, foreign = s.realms[ids.enemy].capital;
    s.countySupport = {};
    s.player.pop = 30; // An old save, deliberately retaining the obsolete field.
    FB.ensureModifiers(s);
    FB.ensureModifiers(s);
    const migrated = FB.countySupportBase(s, home);
    const foreignBefore = FB.countyPopularSupport(s, foreign);
    FB.transferProvince(s, home, ids.enemy);
    s.holder[home] = ids.enemy;
    s.player.provs = s.player.provs.filter(function (pid) { return pid !== home; });
    s.player.provinceId = foreign;
    FB.ensureCountySupport(s);
    return { migrated:migrated, retained:FB.countySupportBase(s, home),
      foreignUnchanged:foreignBefore === FB.countyPopularSupport(s, foreign),
      personal:Object.prototype.hasOwnProperty.call(s.player, 'pop'),
      saved:FB.save.parseExport(FB.save.serialize()).state.countySupport[home] };
  }, ids);
  expect(result).toEqual({ migrated:30, retained:30, foreignUnchanged:true, personal:false, saved:30 });
});

test('support changes only the selected county output and event target', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, home = s.player.provinceId, foreign = s.realms[ids.enemy].capital;
    s.modifiers = { county:{} }; s.countySupport = {};
    function output(pid) { return { tax:1 + FB.modBonus(s, 'tax', pid), levy:1 + FB.modBonus(s, 'levy', pid) }; }
    const neutral = output(home), other = output(foreign);
    FB.setCountySupport(s, home, -50);
    const low = output(home), unchanged = JSON.stringify(other) === JSON.stringify(output(foreign));
    FB.setCountySupport(s, home, 50);
    const high = output(home);
    FB.setCountySupport(s, home, -100);
    const none = output(home);
    s.chars[s.player.charId].traits = [];
    FB.applyEffects(s, { popularOpinion:10 }, { locationId:foreign });
    return { neutral:neutral, low:low, high:high, none:none, unchanged:unchanged,
      home:FB.countySupportBase(s, home), foreign:FB.countySupportBase(s, foreign) };
  }, ids);
  expect(result.low.tax).toBeCloseTo(result.neutral.tax * 0.5);
  expect(result.low.levy).toBeCloseTo(result.neutral.levy * 0.5);
  expect(result.high.tax).toBeCloseTo(result.neutral.tax * 1.5);
  expect(result.high.levy).toBeCloseTo(result.neutral.levy * 1.5);
  expect(result.none).toEqual({ tax:0, levy:0 });
  expect(result.unchanged).toBe(true);
  expect(result.home).toBe(-100);
  expect(result.foreign).toBe(10);
});

test('unjust war debt recovers annually and a new declaration restarts the remaining debt', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, home = s.player.provinceId;
    FB.endPlayerWar(s, true);
    s.modifiers = { county:{} }; s.countySupport = {};
    function declare(enemy) {
      const target = s.realms[enemy].capital;
      const war = FB.registerOrdinaryWar(s, 'player', { enemy:enemy, target:target,
        casus:{ type:'aggression' }, objectives:[{ target:target, type:'aggression' }], legacy:false });
      FB.recordWarDeclaration(s, war, { unlawful:false });
    }
    declare(ids.enemy);
    const first = FB.countyPopularSupport(s, home);
    s.turn += 359; FB.modifierTick(s);
    const beforeYear = FB.countyPopularSupport(s, home);
    s.turn++; FB.modifierTick(s);
    const year = FB.countyPopularSupport(s, home);
    s.turn += 5 * 360; FB.modifierTick(s);
    const half = FB.countyPopularSupport(s, home);
    declare(ids.other);
    const repeated = FB.countyPopularSupport(s, home);
    s.turn += 360; FB.modifierTick(s);
    const recovered = FB.countyPopularSupport(s, home);
    s.turn += 11 * 360; FB.modifierTick(s);
    return { first:first, beforeYear:beforeYear, year:year, half:half,
      repeated:repeated, recovered:recovered, end:FB.countyPopularSupport(s, home) };
  }, ids);
  expect(result.first).toBe(-20);
  expect(result.beforeYear).toBe(-20);
  expect(result.year).toBeCloseTo(-20 * 11 / 12);
  expect(result.half).toBe(-10);
  expect(result.repeated).toBe(-40);
  expect(result.recovered).toBeCloseTo(-40 * 11 / 12);
  expect(result.end).toBe(0);
});


test('county support changes real tax receipts and player and AI muster sources', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, home = s.player.provinceId;
    s.countySupport = {}; s.modifiers = { county:{} };
    s.player.provs = [home];
    FB.invalidateRealmCache();
    function levySource() {
      return FB.playerCompositionBreakdown(s).entries.filter(function (entry) {
        return entry.pid === home && entry.unit === 'levy';
      }).reduce(function (sum, entry) { return sum + entry.amount; }, 0);
    }
    const taxBuilding = Object.keys(FBDATA.buildings).find(function (id) { return FBDATA.buildings[id].tax > 0 && !FBDATA.buildings[id].fort; });
    s.buildings[home] = [{ id:taxBuilding, s:0 }];
    FB.invalidateBuildingIndex(s, home);
    const taxes = FB.playerTaxParts(s).rents, tolls = FB.playerTaxParts(s).tolls, levy = levySource();
    FB.setCountySupport(s, home, -50);
    const lowTaxes = FB.playerTaxParts(s).rents, lowTolls = FB.playerTaxParts(s).tolls, lowLevy = levySource();
    const eligible = FB.recruitmentTerritory(s, ids.enemy).eligible;
    eligible.forEach(function (pid) { FB.setCountySupport(s, pid, 0); });
    const aiBefore = FB.aiBaseHost(s, ids.enemy);
    eligible.forEach(function (pid) { FB.setCountySupport(s, pid, -100); });
    const aiAfter = FB.aiBaseHost(s, ids.enemy);
    FB.countySupportYear(s);
    return { taxes:taxes, tolls:tolls, lowTolls:lowTolls, levy:levy, lowTaxes:lowTaxes, lowLevy:lowLevy,
      aiBefore:aiBefore, aiAfter:aiAfter, recovered:FB.countySupportBase(s, home) };
  }, ids);
  expect(result.taxes).toBeGreaterThan(0);
  expect(result.levy).toBeGreaterThan(0);
  expect(result.lowTaxes).toBeCloseTo(result.taxes * 0.5);
  expect(result.tolls).toBeGreaterThan(0);
  expect(result.lowTolls).toBeCloseTo(result.tolls * 0.5);
  expect(result.lowLevy).toBeCloseTo(result.levy * 0.5);
  expect(result.aiBefore).toBeGreaterThan(0);
  expect(result.aiAfter).toBe(0);
  expect(result.recovered).toBe(-42);
});
