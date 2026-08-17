'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/save.js',
  'js/actions.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('the first-time drip teaches in order and records each tip once',
  async function ({ page }, testInfo) {
    await startDeterministicGame(page);

    // one drip per natural day: the first call teaches the autosave
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'chronicle autosaves'
    })).toHaveCount(1);

    // the next natural day moves on to the menu
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'Save & Load'
    })).toHaveCount(1);

    // a later day teaches the next tip — never an already-seen one again
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'chronicle autosaves'
    })).toHaveCount(1);

    const seen = await page.evaluate(function () {
      return {
        seen: FB.game.uiPrefs.tipsSeen,
        stored: JSON.parse(localStorage.getItem('fb_ui') || '{}').tipsSeen
      };
    });
    expect(seen.seen['drip-autosave']).toBe(1);
    expect(seen.seen['drip-menu']).toBe(1);
    if (testInfo.project.name.endsWith('-served')) {
      expect(seen.stored['drip-autosave']).toBe(1);
      expect(seen.stored['drip-menu']).toBe(1);
    }
  });

test('fired tips stay fired across a reload and a continue',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage contract belongs to the served origin.');
    await startDeterministicGame(page);
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'chronicle autosaves'
    })).toHaveCount(1);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();

    // the autosave lesson survived the reload; the drip resumes with the menu
    expect(await page.evaluate(function () {
      return FB.game.uiPrefs.tipsSeen['drip-autosave'];
    })).toBe(1);
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'Save & Load'
    })).toHaveCount(1);
    await expect(page.locator('.toast', {
      hasText: 'chronicle autosaves'
    })).toHaveCount(0);
  });

test('Settings offers a first-time tips switch, and both switches silence tips',
  async function ({ page }) {
    await startDeterministicGame(page);
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();

    const hideTips = page.getByRole('checkbox', {
      name: /Disable first-time tips/
    });
    await expect(hideTips).not.toBeChecked();
    await expect(page.locator('label.autorow', { has: hideTips }))
      .toContainText('guide-hints switch above');
    const guideHints = page.getByRole('checkbox', {
      name: /Disable guide hints/
    });
    await expect(page.locator('label.autorow', { has: guideHints }))
      .toContainText('first-time tips');

    // the dedicated switch, through the real Settings modal
    await hideTips.check();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return {
          preference: FB.game.uiPrefs.hideTips,
          stored: JSON.parse(localStorage.getItem('fb_ui')).hideTips
        };
      });
    }).toEqual({ preference: true, stored: true });
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);

    // the wider guide-hints switch silences the tips as well
    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = false;
      FB.game.uiPrefs.hideBeginnerHints = true;
      FB.game.saveUiPrefs();
    });
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);
  });

test('an install with an existing save is grandfathered out of tips',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage contract belongs to the served origin.');
    await startDeterministicGame(page);
    await expect.poll(async function () {
      return page.evaluate(function () { return FB.save.hasAnySave(); });
    }).toBe(true);

    // an upgrade arrives with prefs that predate the tips layer
    await page.evaluate(function () { localStorage.removeItem('fb_ui'); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.tipsGrandfathered;
      });
    }).toBe(true);

    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () { return FB.ui.dailyTip(); }))
      .toBe(false);
    await expect(page.locator('.toast', {
      hasText: 'chronicle autosaves'
    })).toHaveCount(0);
  });

test('a contextual tip fires at its moment and never twice',
  async function ({ page }) {
    await startDeterministicGame(page);
    const bought = await page.evaluate(function () {
      FB.state.player.gold = 100000;
      const available = FB.landAvailable(FB.state);
      if (!available.length) return false;
      const settlement = available[0].settlement;
      return FB.buyLandPlot(FB.state, settlement) &&
        FB.buyLandPlot(FB.state, settlement);
    });
    expect(bought).toBe(true);
    await expect(page.locator('.toast', {
      hasText: 'first plot of land'
    })).toHaveCount(1);
    expect(await page.evaluate(function () {
      return FB.ui.tipDue('first-plot');
    })).toBe(false);
  });
