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

test('law sheet explains the ruler restriction once and preserves details through Back', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.ui.showWarLaws(); });
  await expect(page.locator('.war-sheet > .warnote')).toHaveCount(1);
  await expect(page.locator('[data-proclaim-war-law]')).toHaveCount(0);
  await expect(page.locator('.war-law-option')).toHaveCount(2);
  const rows = await page.locator('.war-sheet .kv').evaluateAll(function (rows) {
    return rows.every(function (row) { return !!row.querySelector('b').textContent.trim(); });
  });
  expect(rows).toBe(true);
  await expect(page.locator('.war-sheet-section').last()).toHaveCSS('border-bottom-width', '0px');

  await expect(page.locator('.war-law-option b').filter({ hasText:'Current' })).toHaveCount(2);
  const help = page.locator('[aria-controls="war-law-details-internal_peace"]');
  await help.click();
  await expect(page.locator('#war-law-details-internal_peace')).toBeVisible();
  await page.evaluate(function () { FB.ui.showCampaign(FB.realmWars(FB.state, 'player')[0].id); });
  await page.locator('#campaign-back').click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#war-law-details-internal_peace')).toBeVisible();
});


test('proclaiming a law retains its disclosure and focuses the updated section', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:390, height:740 });
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.state.player.tier = 5; FB.ui.showWarLaws(); });
  const help = page.locator('[aria-controls="war-law-details-internal_peace"]');
  await help.click();
  const proclaim = page.locator('[data-proclaim-war-law="internal_peace:permission"]');
  await expect(proclaim).toContainText('Proclaim:');
  await proclaim.click();
  await expect(page.locator('#war-law-details-internal_peace-section')).toBeFocused();
  await expect(page.locator('#war-law-details-internal_peace')).toBeVisible();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  const current = page.locator('#war-law-details-internal_peace-section .war-law-option').filter({ hasText:'Permission required' });
  await expect(current).toContainText('Current');
});
