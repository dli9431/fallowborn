'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/economy.js',
  'js/actions.js',
  'js/economy.js',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('adjusts living standards and work outfits inline with tooltip terms',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 0;
      s.player.gold = 250;
      s.player.householdStandards = { board:1, outfit_farmer:1 };
      s.player.holdings = ['hearth_garden'];
      FB.ui.refresh();
      FB.ui.showHousehold();
      return {
        generalStandards:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind !== 'work';
        }).length,
        visibleOutfits:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind === 'work' &&
            (FB.householdStandardLevel(s, id) ||
              FB.householdStandardWorkerEligible(s, id));
        }).length,
        availableHoldings:FB.holdingAvailable(s).length,
        nextBoardCost:FB.money(FB.householdStandardUpgradeCost(s, 'board')),
        waresCost:FB.householdStandardUpgradeCost(s, 'wares'),
        gold:s.player.gold
      };
    });

    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    const livingRows = page.locator('#household-living .household-standard-stepper');
    const living = page.locator('#household-living [data-household-standard]');
    await expect(livingRows).toHaveCount(setup.generalStandards);
    await expect(living).toHaveCount(setup.generalStandards);
    await expect(livingRows.locator('[data-household-standard-adjust]'))
      .toHaveCount(setup.generalStandards * 2);
    await expect(page.locator('#household-outfits .household-standard-stepper'))
      .toHaveCount(setup.visibleOutfits);
    await expect(page.locator(
      '#household-property [data-holding]'))
      .toHaveCount(setup.availableHoldings);
    await expect(page.locator(
      '#household-property .household-entry-owned')).toHaveCount(1);
    await expect(page.locator('#gm-body > .gm-footer > #gm-cancel'))
      .toHaveText('Close');

    const board = page.locator('[data-household-standard="board"]');
    await expect(board).toContainText('Level 1: Full Larder');
    await expect(board).toContainText(
      'Reduces yearly household mortality by 0.1 percentage points.');
    await expect(board.locator('.household-entry-cost'))
      .toContainText(setup.nextBoardCost);
    await expect(livingRows.last()).toBeInViewport();

    const rowHeights = await livingRows.evaluateAll(function (rows) {
      return rows.map(function (row) { return row.getBoundingClientRect().height; });
    });
    expect(Math.max.apply(Math, rowHeights)).toBeLessThan(90);

    const wares = page.locator('[data-household-standard="wares"]');
    const waresDecrease = page.locator(
      '[data-household-standard-id="wares"][data-household-standard-adjust="-1"]');
    const waresIncrease = page.locator(
      '[data-household-standard-id="wares"][data-household-standard-adjust="1"]');
    expect(await wares.evaluate(function (node) { return node.tagName; })).toBe('DIV');
    await expect(wares).toContainText('Baseline');
    await expect(waresDecrease).toBeDisabled();
    await expect(waresIncrease).toHaveAttribute('aria-label',
      'Increase Household wares to level 1: Good Bedding and Vessels');

    await waresIncrease.hover();
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Owner');
    await expect(tooltip).toContainText('Household dynasty');
    await expect(tooltip).toContainText(
      'Adds 1 percentage point to yearly education chances.');
    await expect(tooltip).toContainText('Setup cost');
    await expect(tooltip).toContainText('Recurring cost');
    await expect(tooltip).toContainText('Projected seasonal net');
    await expect(tooltip).toContainText('Projected purse after next season');
    await expect(tooltip).toContainText(
      'Passes to the next household head; cannot be sold or pledged');

    await waresIncrease.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('#gm-title')).toContainText(
      'Household standards & property');
    await expect(page.locator('[data-household-standard="wares"]'))
      .toContainText('Level 1: Good Bedding and Vessels');
    await expect(page.locator('.household-standard-modal')).toHaveCount(0);
    await expect(page.locator(
      '#household-standard-confirm, #household-standard-reduce-confirm'))
      .toHaveCount(0);
    await expect(tooltip).toBeHidden();

    const purchased = await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'wares'),
        gold:FB.state.player.gold
      };
    });
    expect(purchased.level).toBe(1);
    expect(purchased.gold).toBe(setup.gold - setup.waresCost);

    await waresDecrease.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      'Its setup cost is not refunded, and restoring it later requires paying that full cost again.');
    await expect(tooltip).toContainText('New level');
    await expect(tooltip).toContainText('Baseline');
    await expect(tooltip).toContainText('Projected seasonal net');

    await waresDecrease.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('[data-household-standard="wares"]'))
      .toContainText('Baseline');
    const reduced = await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'wares'),
        gold:FB.state.player.gold
      };
    });
    expect(reduced.level).toBe(0);
    expect(reduced.gold).toBe(purchased.gold);

    const outfitDecrease = page.locator(
      '[data-household-standard-id="outfit_farmer"]' +
      '[data-household-standard-adjust="-1"]');
    await expect(outfitDecrease).toBeEnabled();
    await outfitDecrease.click();
    expect(await page.evaluate(function () {
      return FB.householdStandardLevel(FB.state, 'outfit_farmer');
    })).toBe(0);
  });

test('uses the shared question-mark disclosure for household adjustments on compact layouts',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:740 });
    const before = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 0;
      s.player.gold = 250;
      s.player.householdStandards = { board:1 };
      FB.ui.refresh();
      FB.ui.showHousehold();
      return {
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold
      };
    });

    const row = page.locator('[data-household-standard-row="board"]');
    const info = row.locator('.household-standard-info-actions .settcard-info');
    const details = row.locator('.household-standard-adjustment-details');
    const increase = row.locator('[data-household-standard-adjust="1"]');

    await expect(info).toBeVisible();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();

    await increase.hover();
    await expect(page.locator('#tooltip')).toBeHidden();

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'true');
    await expect(details).toBeVisible();
    await expect(details).toContainText('Decrease one level');
    await expect(details).toContainText('Increase one level');
    await expect(details).toContainText(
      'Its setup cost is not refunded, and restoring it later requires paying that full cost again.');
    await expect(details).toContainText('Projected seasonal net');
    await expect(details).toContainText('Projected purse after next season');

    expect(await page.evaluate(function () {
      return {
        level:FB.householdStandardLevel(FB.state, 'board'),
        gold:FB.state.player.gold
      };
    })).toEqual(before);

    await info.click();
    await expect(info).toHaveAttribute('aria-expanded', 'false');
    await expect(details).toBeHidden();
  });
