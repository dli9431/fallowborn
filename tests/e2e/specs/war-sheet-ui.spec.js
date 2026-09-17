"use strict";
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_wars.js', 'js/ui_misc.js', 'js/wars.js', 'js/world.js', 'js/armies.js', 'data/policies.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('campaign facts stay visible and supporting details disclose on mobile', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.ui.showCampaign(FB.realmWars(FB.state, 'player')[0].id); });
  const sheet = page.locator('[data-campaign-detail]');
  await expect(sheet.locator('.kv').filter({ hasText:'Opponent' })).toBeVisible();
  await expect(sheet.locator('.kv').filter({ hasText:'Total upkeep' })).toContainText('per season');
  await expect(sheet.locator('.kv').filter({ hasText:'Cost' })).toContainText('8 prestige');
  await expect(page.locator('#campaign-host-details')).toBeHidden();
  const help = page.locator('[aria-controls="campaign-host-details"]');
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#campaign-host-details')).toBeVisible();
  await expect(page.locator('#campaign-peace')).toContainText('Withdraw');
});

test('read-only laws show only current rules without redundant help and survive Back', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarLaws(); });
  await expect(page.locator('.war-sheet > .warnote')).toHaveCount(0);
  await expect(page.locator('.war-laws-sheet .settcard-info')).toHaveCount(0);
  await expect(page.locator('.war-laws-sheet')).not.toContainText('Permission required');
  await expect(page.locator('.war-laws-sheet')).not.toContainText('Prohibited');
  await expect(page.locator('[data-proclaim-war-law]')).toHaveCount(0);
  await expect(page.locator('.war-law-option')).toHaveCount(2);
  const rows = await page.locator('.war-sheet .kv').evaluateAll(function (rows) {
    return rows.every(function (row) { return !!row.querySelector('b').textContent.trim(); });
  });
  expect(rows).toBe(true);
  await expect(page.locator('.war-sheet-section').last()).toHaveCSS('border-bottom-width', '0px');

  await expect(page.locator('.war-law-current .kv').filter({ hasText:'Current law' })).toHaveCount(2);
  await expect(page.locator('.war-law-description')).toHaveCount(2);
  await expect(page.locator('.war-law-description').first()).toHaveCSS('font-weight', '400');
  await page.evaluate(function () { FB.ui.showCampaign(FB.realmWars(FB.state, 'player')[0].id); });
  await page.locator('#campaign-back').click();
  await expect(page.locator('.war-law-current')).toHaveCount(2);
  await expect(page.locator('.war-laws-sheet .settcard-info')).toHaveCount(0);
});


test('proclaiming a law retains its disclosure and focuses the updated section', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.state.player.tier = 5; FB.ui.showWarLaws(); });
  const help = page.locator('[aria-controls="war-law-action-internal_peace-prohibited"]');
  await help.click();
  const proclaim = page.locator('[data-proclaim-war-law="internal_peace:permission"]');
  await expect(proclaim).toHaveText('Proclaim Permission required');
  await expect(proclaim).toHaveClass(/actionbtn/);
  await expect(page.locator('#war-law-action-internal_peace-permission')).toContainText('Cost');
  await expect(page.locator('#war-law-action-internal_peace-permission')).toContainText('-10');
  await proclaim.click();
  await expect(page.locator('#war-law-details-internal_peace-section')).toBeFocused();
  await expect(page.locator('#war-law-action-internal_peace-prohibited')).toBeVisible();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  const current = page.locator('#war-law-details-internal_peace-section .war-law-option').filter({ hasText:'Permission required' });
  await expect(current).toContainText('Current');
});

for (const width of [390, 1280]) {
  test('law facts stay together with compact section spacing at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:800 });
    await startWarSafety(page, testInfo);
    await page.evaluate(function () { FB.ui.showWarLaws(); });
    const facts = page.locator('.war-laws-sheet > .kv, .war-law-current .kv');
    const gaps = await facts.evaluateAll(function (rows) {
      return rows.map(function (row) {
        const label = row.firstElementChild.getBoundingClientRect();
        const value = row.lastElementChild.getBoundingClientRect();
        return { gap:Math.round(value.left - label.right), fits:value.right <= row.getBoundingClientRect().right + 1 };
      });
    });
    gaps.forEach(function (result) { expect(result.gap).toBe(12); expect(result.fits).toBe(true); });
    await expect(page.locator('.war-laws-sheet .war-sheet-heading').first()).toHaveCSS('margin-bottom', '6px');
    await expect(page.locator('.war-laws-sheet .war-law-description').first()).toHaveCSS('margin-top', '6px');
  });
}
