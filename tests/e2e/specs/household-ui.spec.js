'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('keeps the household overview compact and the full ledger in details',
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

    await board.click();
    await expect(page.locator('#gm-body .asset-effect-summary').first())
      .toBeVisible();
    await expect(page.locator('.asset-effect-label').filter({ hasText:'Owner' }).first())
      .toBeVisible();
    await expect(page.locator('.asset-effect-label')
      .filter({ hasText:'Transfer rule' }).first()).toBeVisible();
  });
