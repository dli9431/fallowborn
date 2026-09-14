'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/actions.js', 'js/model.js', 'js/world.js',
  'js/modifiers.js', 'js/ui_panels.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'data/actions.js', 'data/map_data.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('Governance shows each county support factor and retains keyboard disclosures on mobile', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:844 });
  const ids = await startWarSafety(page, testInfo);
  const r = await page.evaluate(function (ids) {
    const s = FB.state;
    s.modifiers = { county:{} }; s.countySupport = {};
    FB.setCountySupport(s, ids.home, 100);
    FB.setCountySupport(s, ids.second, -50);
    FB.ui.showGovernance('domain');
    return { first:Math.round(FB.countySupportFactor(s, ids.home) * 100),
      second:Math.round(FB.countySupportFactor(s, ids.second) * 100) };
  }, ids);
  const home = page.locator('[data-governance-support="' + ids.home + '"]');
  const second = page.locator('[data-governance-support="' + ids.second + '"]');
  await expect(home).toContainText(r.first + '%');
  await expect(second).toContainText(r.second + '%');
  const card = home.locator('..');
  const details = card.locator('.settcard-info');
  await details.focus();
  await details.press('Enter');
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(card.locator('.governance-county-details')).toContainText('Other modifiers and rebellion');
});

test('a two-rank claim displays both recognition prices without spending on review', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    const kid = Object.keys(FBDATA.kingdoms).find(function (id) { return FB.kingdomCounties(id).length >= 3; });
    const counties = FB.kingdomCounties(kid);
    p.tier = 4; p.liege = null; p.provinceId = counties[0]; p.provs = counties.slice();
    p.gold = 10000; p.prestige = 5000; p.piety = 2000;
    counties.forEach(function (pid) { s.owner[pid] = s.holder[pid] = 'player'; });
    FB.invalidateRealmCache();
    const rows = FB.rankElevationBreakdown(s, 4, 6);
    const before = [p.gold, p.prestige, p.piety, s.turn];
    FB.ui.showRankElevation('higher');
    return { rows:rows, before:before, after:[p.gold, p.prestige, p.piety, s.turn] };
  });
  expect(r.rows.map(function (row) { return row.cost; })).toEqual([
    { gold:1500, prestige:600, piety:0 }, { gold:3000, prestige:1000, piety:300 }
  ]);
  expect(r.after).toEqual(r.before);
  const breakdown = page.locator('[data-rank-elevation-breakdown]');
  await expect(breakdown).toBeVisible();
  for (const row of r.rows) await expect(breakdown).toContainText(row.name);
});

test('court cultivation explains fixed rewards and names its Standing recipient', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const r = await page.evaluate(function (ids) {
    const s = FB.state, me = s.chars[s.player.charId];
    me.sex = 'f'; s.player.tier = 4; s.player.liege = ids.liege;
    const f = FB.focuses.find(function (focus) { return focus.id === 'courtly_graces'; });
    me.skills.dip = 10;
    const low = FB.focusDescription(s, f), lowGain = f.gain(s);
    me.skills.dip = 50;
    const high = FB.focusDescription(s, f), highGain = f.gain(s);
    return { low:low, high:high, lowGain:lowGain, highGain:highGain, recipient:s.realms[ids.liege].name };
  }, ids);
  expect(r.low).toBe(r.high);
  expect(r.high).toContain(r.recipient);
  expect(r.high).toContain('+2 prestige');
  expect(r.high).toContain('+4 Standing');
  expect(r.high).toContain('chance to train Diplomacy');
  expect(r.lowGain).toEqual({ prestige:2 });
  expect(r.highGain).toEqual({ prestige:2 });
});
