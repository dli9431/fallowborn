'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_panels.js', 'js/armies.js', 'js/logistics.js',
  'js/market.js', 'data/units.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('county totals include every host and the picker changes individual inspection', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () {
    const s = FB.state, original = FB.playerHost(s);
    s.realms.player.name = 'Alpha';
    s.realms[s.player.war.enemy].name = 'Zulu';
    s.armies = [Object.assign({}, original, { id:'first-summary-host', men:2000,
      units:{ levy:2000 }, supply:80 }), Object.assign({}, original, {
      id:'second-summary-host', realm:s.player.war.enemy, men:3000, units:{ levy:3000 }, supply:40 })];
    FB.selectArmy(null);
    FB.ui.selectProvince(original.at);
  });
  await expect(page.locator('#county-host-summary')).toContainText('2 hosts');
  await expect(page.locator('#county-host-summary')).toContainText('5000');
  await expect(page.locator('#county-host-picker option')).toHaveCount(3);
  await expect(page.locator('#county-host-picker')).toHaveValue('');
  await expect(page.locator('#county-host-picker option:checked')).toHaveText('Inspect individual host');
  await expect(page.locator('label[for="county-host-picker"]')).toHaveCount(0);
  const sort = page.locator('#county-host-sort');
  await expect(sort).toHaveAttribute('data-sort', 'name');
  await expect(sort).toHaveText('A↓');
  await expect(page.locator('#county-host-picker option').nth(1)).toHaveValue('first-summary-host');
  await sort.click();
  await expect(sort).toHaveText('9↓');
  await expect(sort).toBeFocused();
  await expect(page.locator('#county-host-picker option').nth(1)).toHaveValue('second-summary-host');
  await page.locator('#county-host-picker').selectOption('second-summary-host');
  await expect(page.locator('#county-host-picker')).toHaveValue('second-summary-host');
  await expect(page.locator('#county-host-picker')).toBeFocused();
  expect(await page.evaluate(function () { return FB.selectedArmy(FB.state); })).toBeNull();
  const text = await page.locator('#war-card-details').textContent();
  expect(text).toContain('3000');
  expect(text).not.toMatch(/\d\.\d{8}/);
  expect(text).toContain('40%');
  await sort.press('Enter');
  await expect(sort).toHaveAttribute('data-sort', 'name');
  await expect(sort).toBeFocused();
  await expect(page.locator('#county-host-picker')).toHaveValue('second-summary-host');
  await expect(page.locator('#war-card-details')).toContainText('3000');
  await page.locator('#county-host-picker').selectOption('first-summary-host');
  await expect(page.locator('#war-card-details')).toContainText('2000');
  await expect(page.locator('#war-card-details')).toContainText('80%');
});
