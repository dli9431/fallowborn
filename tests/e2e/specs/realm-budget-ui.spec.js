'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_modals.js', 'js/ui_misc.js', 'js/keys.js', 'js/i18n.js', 'js/treasury.js',
  'js/armies.js', 'js/actions.js', 'js/logistics.js', 'js/modifiers.js',
  'data/map_data.js', 'data/modifiers.js', 'css/style.css'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const width of [390, 1280]) {
  test('distribution preview preserves Finance scroll and disclosure on Back, Escape, browser Back and payment at ' + width,
    async function ({ page }, testInfo) {
      await page.setViewportSize({ width:width, height:844 });
      await startWarSafety(page, testInfo);
      await page.evaluate(function () {
        FB.state.player.gold = 10000;
        FB.ui.showFinance();
      });
      await page.locator('[aria-controls="finance-government-details"]').click();
      const trigger = page.locator('#finance-distribution');
      await trigger.scrollIntoViewIfNeeded();
      const original = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
      const gold = await page.evaluate(function () { return FB.state.player.gold; });
      for (const way of ['button', 'escape', 'history']) {
        await trigger.click();
        await expect(page.locator('[data-public-distribution]')).toHaveCount(3);
        await expect(page.locator('#gm-body')).toContainText('Larger gifts provide the same benefit');
        if (way === 'button') await page.locator('#distribution-back').click();
        else if (way === 'escape') await page.keyboard.press('Escape');
        else await page.evaluate(function () { history.back(); });
        await expect(trigger).toBeVisible();
        await expect(page.locator('#finance-government-details')).toBeVisible();
        await expect.poll(function () {
          return page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
        }).toBeCloseTo(original, 0);
        await expect(trigger).toBeFocused();
      }
      expect(await page.evaluate(function () { return FB.state.player.gold; })).toBe(gold);
      await trigger.click();
      const amount = Number(await page.locator('[data-public-distribution]').first().getAttribute('data-public-distribution'));
      await page.locator('[data-public-distribution]').first().click();
      await expect(trigger).toBeDisabled();
      await expect(trigger).toContainText('Available again in 360 days');
      await expect(page.locator('#finance-government-details')).toBeVisible();
      expect(await page.evaluate(function () { return FB.state.player.gold; })).toBeCloseTo(gold - amount, 8);
      await expect(page.locator('#finance-government')).toBeFocused();
    });
}

test('distribution payment revalidates a stale preview', async function ({ page }, testInfo) {
  await startWarSafety(page, testInfo);
  await page.evaluate(function () { FB.state.player.gold = 10000; FB.ui.showFinance(); });
  await page.locator('#finance-distribution').click();
  await page.evaluate(function () { FB.state.player.gold = 0; });
  await page.locator('[data-public-distribution]').first().click();
  await expect(page.locator('#finance-distribution')).toBeDisabled();
  expect(await page.evaluate(function () {
    return { gold:FB.state.player.gold, cooldown:FB.state.player.distributionNextTurn || 0 };
  })).toEqual({ gold:0, cooldown:0 });
});

test('ruler treasury disclosure uses locale routing and leaves balances unchanged', async function ({ page }, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, row = s.realms[ids.enemy].treasury;
    s.turn += 90; FB.treasurySeason(s);
    const before = row.gold, translate = FB.T, seen = [];
    // Exercise the new labels through the real localization boundary without changing catalogs.
    FB.T = function (text, params) { seen.push(text); return translate(text, params); };
    try {
      FB.ui.showLiegeModal(ids.enemy);
      return { unchanged:row.gold === before, seen:seen };
    } finally { FB.T = translate; }
  }, ids);
  expect(result.unchanged).toBe(true);
  expect(result.seen).toContain('Available treasury');
  expect(result.seen).toContain('Government administration');
  await page.locator('[aria-controls="ruler-treasury-details"]').click();
  await expect(page.locator('#ruler-treasury-details')).toContainText('Reserve target');
  await expect(page.locator('#ruler-treasury-details')).toContainText('Official court expenses');
});
