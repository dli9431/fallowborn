'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/model.js',
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

test('keeps the household overview and standard choice compact',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const record = FB.realmTechRecord(s, FB.techRealmId(s));
      for (const id in FBDATA.tech) {
        if (record.completed.indexOf(id) < 0) record.completed.push(id);
      }
      s.player.tier = 0;
      s.player.gold = 250;
      s.player.householdStandards = { board:1 };
      s.player.holdings = ['hearth_garden'];
      FB.ui.refresh();
      FB.ui.showHousehold();
      return {
        generalStandards:FB.householdStandardIds().filter(function (id) {
          return FBDATA.householdStandards[id].kind !== 'work';
        }).length,
        availableHoldings:FB.holdingAvailable(s).length,
        nextBoardCost:FB.money(FBDATA.householdStandards.board.levels[1].cost)
      };
    });

    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    const living = page.locator(
      '#household-living [data-household-standard]');
    await expect(living).toHaveCount(setup.generalStandards);
    await expect(living.locator('.household-entry-layout'))
      .toHaveCount(setup.generalStandards);
    await expect(page.locator(
      '#household-property [data-holding]'))
      .toHaveCount(setup.availableHoldings);
    await expect(page.locator(
      '#household-property .household-entry-owned')).toHaveCount(1);
    await expect(page.locator('#gm-body .asset-effect-summary')).toHaveCount(0);
    await expect(page.locator('#gm-body > .gm-footer > #gm-cancel'))
      .toHaveText('Close');

    const board = page.locator('[data-household-standard="board"]');
    await expect(board).toContainText('Level 1: Full Larder');
    await expect(board).toContainText(
      'Reduces yearly household mortality by 0.1 percentage points.');
    await expect(board.locator('.household-entry-cost'))
      .toContainText(setup.nextBoardCost);
    await expect(living.last()).toBeInViewport();

    const rowHeights = await living.evaluateAll(function (rows) {
      return rows.map(function (row) { return row.getBoundingClientRect().height; });
    });
    expect(Math.max.apply(Math, rowHeights)).toBeLessThan(90);

    const wares = page.locator('[data-household-standard="wares"]');
    await wares.click();
    await expect(page.locator('#genmodal'))
      .toHaveClass(/household-standard-modal/);
    await expect(page.locator('#gm-body .asset-effect-summary')).toHaveCount(0);

    const current = page.locator('.household-standard-current');
    await expect(current).toContainText('Baseline');
    await expect(current).toContainText('No maintained improvement');

    const rules = page.locator('.household-standard-rules');
    await expect(rules).toContainText('Commoner household');
    await expect(rules).toContainText(
      'Passes to the next household head; cannot be sold or pledged.');
    await expect(rules).toContainText(
      'It may lapse when upkeep cannot be paid.');

    const choice = page.locator('#household-standard-upgrade');
    await expect(choice).toContainText(
      'Improve to level 1: Good Bedding and Vessels');
    await expect(choice.locator('.household-standard-choice-effect')).toContainText(
      'Adds 1 percentage point to yearly education chances.');
    await expect(choice.locator('.household-standard-choice-terms'))
      .toContainText('Setup cost');
    await expect(choice.locator('.household-standard-choice-terms'))
      .toContainText('Recurring cost');

    const detailHeight = await page.locator('.household-standard-detail')
      .evaluate(function (node) { return node.getBoundingClientRect().height; });
    const choiceHeight = await choice
      .evaluate(function (node) { return node.getBoundingClientRect().height; });
    expect(detailHeight).toBeLessThan(190);
    expect(choiceHeight).toBeLessThan(130);
  });
