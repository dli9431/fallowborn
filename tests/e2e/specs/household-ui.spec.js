'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/economy.js',
  'data/map_data.js',
  'data/technology.js',
  'js/main.js',
  'js/actions.js',
  'js/economy.js',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
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
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      'Adds 2.5 percentage points to yearly education chances.');
    await expect(tooltip).toContainText('Requires Freeholder rank.');

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
    await outfitDecrease.press('Enter');
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

test('landed rulers retain Better the Household with title-scaled reduction floors',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.householdStandards = { board:3, outfit_farmer:3 };
      const floors = [2, 3, 4, 5, 7].map(function (tier) {
        s.player.tier = tier;
        return FB.householdStandardMinimumLevel(s, 'board');
      });

      s.player.tier = 4;
      s.player.householdStandards.board = 2;
      const countBlocked = FB.reduceHouseholdStandard(s, 'board');

      s.player.tier = 3;
      s.player.householdStandards.board = 3;
      const first = FB.reduceHouseholdStandard(s, 'board');
      const second = FB.reduceHouseholdStandard(s, 'board');
      const third = FB.reduceHouseholdStandard(s, 'board');
      const boardLevel = FB.householdStandardLevel(s, 'board');
      const workFloor = FB.householdStandardMinimumLevel(s, 'outfit_farmer');
      const workReductions = [
        FB.reduceHouseholdStandard(s, 'outfit_farmer'),
        FB.reduceHouseholdStandard(s, 'outfit_farmer'),
        FB.reduceHouseholdStandard(s, 'outfit_farmer')
      ];
      const workLevel = FB.householdStandardLevel(s, 'outfit_farmer');
      const deed = FB.instantStatus(s, 'better_household');
      FB.ui.showTab('actions', { history:false });
      return {
        floors:floors,
        countBlocked:countBlocked,
        reductions:[first, second, third],
        boardLevel:boardLevel,
        workFloor:workFloor,
        workReductions:workReductions,
        workLevel:workLevel,
        rank:FB.titleWordFor(s, s.player.tier),
        deed:{ shown:deed.shown, can:deed.can }
      };
    });

    expect(result.floors).toEqual([0, 1, 2, 3, 3]);
    expect(result.countBlocked).toBe(false);
    expect(result.reductions).toEqual([true, true, false]);
    expect(result.boardLevel).toBe(1);
    expect(result.workFloor).toBe(0);
    expect(result.workReductions).toEqual([true, true, true]);
    expect(result.workLevel).toBe(0);
    expect(result.deed).toEqual({ shown:true, can:true });

    const workGroup = page.locator('#tab-actions [data-action-group="work"]');
    if (await workGroup.getAttribute('aria-expanded') !== 'true') {
      await workGroup.click();
    }
    const household = page.locator('[data-action-id="better_household"]');
    await expect(household).toBeVisible();
    await expect(household).toBeEnabled();
    await household.click();
    const boardRow = page.locator('[data-household-standard-row="board"]');
    await expect(boardRow.locator('[data-household-standard-adjust="-1"]'))
      .toBeDisabled();
    await expect(boardRow.locator('.household-standard-adjustment-details'))
      .toContainText(result.rank +
        ' households may not reduce this standard below level 1');
  });

test('minor succession keeps adult deeds visible, limits focuses to Study and Play, and permits only inherited-standard reductions',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const former = s.chars[s.player.charId];
      s.player.tier = 1;
      s.player.gold = 250;
      s.player.householdStandards = { board:2 };
      s.player.holdings = [];
      const child = FB.makeCharacter(s, {
        name:'Alden', sex:'m', born:s.date.year - 10,
        fatherId:former.sex === 'm' ? former.id : null,
        motherId:former.sex === 'f' ? former.id : null,
        culture:former.culture, religion:former.religion,
        dyn:former.dyn, traitsN:0
      });
      former.childrenIds = former.childrenIds || [];
      former.childrenIds.push(child.id);
      FB.game.succeedTo(child.id, { livingAbdication:true });
      FB.ui.showTab('actions');
      const town = FB.instantStatus(s, 'go_to_town');
      const household = FB.instantStatus(s, 'better_household');
      return {
        age:FB.ageOf(child, s.date.year),
        focuses:FB.listFocusChoices(s).map(function (item) {
          return item.action.id;
        }),
        town:{ shown:town.shown, can:town.can, reason:town.reason },
        household:{ shown:household.shown, can:household.can,
          reason:household.reason },
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold
      };
    });

    expect(setup.age).toBe(10);
    expect(setup.level).toBe(2);
    expect(setup.focuses).toEqual(['study', 'play']);
    expect(setup.town).toMatchObject({ shown:true, can:false });
    expect(setup.town.reason).toBe('You can do this when you come of age at 16.');
    expect(setup.household).toMatchObject({ shown:true, can:true });
    await expect(page.locator('[data-focus-id]')).toHaveCount(2);
    await expect(page.locator('[data-focus-id="study"]')).toBeVisible();
    await expect(page.locator('[data-focus-id="play"]')).toBeVisible();

    const town = page.locator('[data-action-id="go_to_town"]');
    await expect(town).toBeVisible();
    await expect(town).toBeDisabled();
    await expect(page.locator('#deed-details-go_to_town')).toContainText(
      'You can do this when you come of age at 16.');

    const household = page.locator('[data-action-id="better_household"]');
    await expect(household).toBeEnabled();
    await household.click();
    await expect(page.locator('#genmodal')).toHaveClass(/household-modal/);
    await expect(page.locator('#gm-body')).toContainText(
      'During childhood you may reduce inherited standards');

    const boardRow = page.locator('[data-household-standard-row="board"]');
    const decrease = boardRow.locator('[data-household-standard-adjust="-1"]');
    const increase = boardRow.locator('[data-household-standard-adjust="1"]');
    await expect(decrease).toBeEnabled();
    await expect(increase).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#household-standard-upgrade-details-board')).toContainText(
      'new purchases unlock at age 16');
    await expect(page.locator('#household-property [data-holding]').first()).toBeDisabled();
    await expect(page.locator('#household-property')).toContainText('Available at age 16');

    await decrease.click();
    expect(await page.evaluate(function () {
      const s = FB.state;
      const beforeGold = s.player.gold;
      const beforeLevel = FB.householdStandardLevel(s, 'board');
      const upgrade = FB.buyHouseholdStandard(s, 'board');
      const holding = FB.buyHolding(s, 'hearth_garden');
      return {
        beforeLevel:beforeLevel,
        level:FB.householdStandardLevel(s, 'board'),
        gold:s.player.gold,
        beforeGold:beforeGold,
        upgrade:upgrade,
        holding:holding,
        ownsGarden:FB.holdingList(s).indexOf('hearth_garden') >= 0
      };
    })).toEqual({
      beforeLevel:1,
      level:1,
      gold:setup.gold,
      beforeGold:setup.gold,
      upgrade:false,
      holding:false,
      ownsGarden:false
    });
  });
