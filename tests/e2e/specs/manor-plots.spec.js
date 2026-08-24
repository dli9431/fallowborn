'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'js/actions.js',
  'js/economy.js',
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

async function openLandMarket(page, plotCount, gold) {
  return page.evaluate(function (setup) {
    const s = FB.state;
    const p = s.player;
    p.tier = 1;
    p.gold = setup.gold;
    p.landPlots = [];
    p.landPlotMigration = 1;
    for (let i = 0; i < setup.plotCount; i++) {
      p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
    }
    const settlement = FB.settlementsOf(s, p.provinceId)[0].name;
    const requirement = FBDATA.balance.manorPlotRequirement;
    const remaining = requirement - setup.plotCount;
    const totalCost = FB.landPlotCost(s, remaining);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    FB.ui.showLandMarket();
    return {
      settlement:settlement,
      requirement:requirement,
      remaining:remaining,
      totalCost:totalCost,
      totalPrice:FB.money(totalCost),
      onePlotPrice:FB.money(FB.landPlotCost(s)),
      currentYield:FB.money(FB.landGroupYield(setup.plotCount)),
      nextYield:FB.money(FB.landGroupYield(setup.plotCount + 1)),
      resultingYield:FB.money(FB.landGroupYield(requirement)),
      province:FB.world.byId[p.provinceId].name,
      moneyAfter:FB.money(setup.gold - totalCost),
      logLength:s.log.length
    };
  }, { plotCount:plotCount, gold:gold });
}

test('previews and atomically buys every remaining manor plot in one settlement',
  async function ({ page }) {
    const setup = await openLandMarket(page, 1, 1000);
    const batch = page.locator('[data-land-batch="0"]');
    await expect(batch).toContainText('Buy remaining plots here');
    await expect(batch).toContainText('Cost');
    await expect(batch).toContainText(setup.totalPrice);
    await expect(batch).toContainText('Effect');
    await expect(batch).toContainText(
      setup.currentYield + ' → ' + setup.resultingYield + '/season');

    await batch.hover();
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Household dynasty');
    await expect(tooltip).toContainText(setup.settlement + ', ' + setup.province);
    await expect(tooltip).toContainText('Passes to heirs as family land');

    await batch.click();
    await expect(page.locator('#gm-title')).toContainText(
      'Complete the holding at ' + setup.settlement);
    await expect(page.locator('.kv').filter({
      hasText:'Plots in this purchase'
    })).toContainText(setup.remaining + ' plots');
    await expect(page.locator('.kv').filter({
      hasText:'Total price'
    })).toContainText(setup.totalPrice);
    await expect(page.locator('.kv').filter({
      hasText:'Resulting seasonal yield'
    })).toContainText(setup.resultingYield + ' each season');
    await expect(page.locator('.kv').filter({
      hasText:'Resulting cluster and manor progress'
    })).toContainText(setup.requirement + '/' + setup.requirement +
      ' plots — ready to declare a manor');
    await expect(page.locator('.kv').filter({
      hasText:'Money remaining after purchase'
    })).toContainText(setup.moneyAfter);

    const confirm = page.locator('#manor-plot-batch-confirm');
    await expect(confirm).toBeEnabled();
    await confirm.click();

    const result = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold,
        yield:FB.landGroupYield(
          FB.landCountAt(s, s.player.provinceId, 0)),
        manorReady:!!FB.manorSite(s),
        logLength:s.log.length,
        lastMessageKey:s.log.length && s.log[s.log.length - 1].msg
          ? s.log[s.log.length - 1].msg.key : null
      };
    });
    expect(result.count).toBe(setup.requirement);
    expect(result.gold).toBe(1000 - setup.totalCost);
    expect(result.yield).toBeCloseTo(
      await page.evaluate(function (count) {
        return FB.landGroupYield(count);
      }, setup.requirement));
    expect(result.manorReady).toBe(true);
    expect(result.logLength).toBe(setup.logLength + 1);
    expect(result.lastMessageKey).toBe('news.action.land_batch_bought');
    await expect(page.locator('[data-land-batch="0"]')).toHaveCount(0);
    await expect(page.locator('[data-land-settlement="0"]'))
      .toHaveAttribute('aria-disabled', 'true');
  });

test('keeps one-plot rows compact and exposes full terms when unaffordable',
  async function ({ page }) {
    const setup = await openLandMarket(page, 1, 0);
    const choice = page.locator('[data-land-settlement="0"]');

    await expect(choice).toHaveAttribute('aria-disabled', 'true');
    await expect(choice).toContainText('Cost');
    await expect(choice).toContainText(setup.onePlotPrice + ' · not affordable');
    await expect(choice).toContainText('Effect');
    await expect(choice).toContainText(
      setup.currentYield + ' → ' + setup.nextYield + '/season');
    await expect(choice.locator('.asset-effect-summary')).toHaveCount(0);
    const height = await choice.evaluate(function (node) {
      return node.getBoundingClientRect().height;
    });
    expect(height).toBeLessThan(100);

    await choice.focus();
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Owner');
    await expect(tooltip).toContainText('Household dynasty');
    await expect(tooltip).toContainText('Setup cost');
    await expect(tooltip).toContainText('not affordable');
    await expect(tooltip).toContainText(
      'Passes to heirs as family land in this settlement');
    await expect(tooltip).toContainText('No fixed end');

    await choice.click();
    const unchanged = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold
      };
    });
    expect(unchanged).toEqual({ count:1, gold:0 });
  });

test('shows an unaffordable batch without making a partial purchase',
  async function ({ page }) {
    const cost = await page.evaluate(function () {
      return FB.landPlotCost();
    });
    const startingGold = cost * 2;
    const setup = await openLandMarket(page, 1, startingGold);

    await page.locator('[data-land-batch="0"]').click();
    await expect(page.locator('#manor-plot-batch-confirm')).toBeDisabled();
    await expect(page.getByText(
      'The household cannot afford the complete batch. No plots will be purchased ' +
      'unless the full price is available.',
      { exact:true }
    )).toBeVisible();
    await expect(page.locator('.kv').filter({
      hasText:'Money remaining after purchase'
    })).toContainText(setup.moneyAfter);

    const unchanged = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold
      };
    });
    expect(unchanged).toEqual({ count:1, gold:startingGold });
  });

test('keeps the manual one-plot purchase when only one manor plot remains',
  async function ({ page }) {
    const cost = await page.evaluate(function () {
      return FB.landPlotCost();
    });
    const setup = await openLandMarket(page, 4, cost);
    await expect(page.locator('[data-land-batch="0"]')).toHaveCount(0);

    await page.locator('[data-land-settlement="0"]').click();
    const result = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold
      };
    });
    expect(result).toEqual({ count:setup.requirement, gold:0 });
  });

test('gentry can continue buying available freehold plots after declaring a manor',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const provinceId = Object.keys(FB.world.byId).filter(function (pid) {
        const province = FB.world.byId[pid];
        return province && !province.wasteland &&
          FB.settlementsOf(s, pid).length > 1;
      })[0];
      const settlements = FB.settlementsOf(s, provinceId);
      const requirement = FBDATA.balance.manorPlotRequirement;
      p.tier = 2;
      p.provinceId = provinceId;
      p.gold = FB.landPlotCost(s);
      p.landPlots = [];
      p.landPlotMigration = 1;
      for (let i = 0; i < requirement; i++) {
        p.landPlots.push({ provinceId:provinceId, settlement:0 });
      }
      p.manor = { provinceId:provinceId, settlement:0 };
      const character = s.chars[p.charId];
      if (character) character.born = s.date.year - 30;
      p.roleOrientationsSeen = p.roleOrientationsSeen || {};
      p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
      const action = FB.instants.filter(function (item) {
        return item.id === 'buy_land';
      })[0];
      const available = FB.landAvailable(s);
      FB.ui.refresh();
      FB.ui.showLandMarket();
      return {
        visible:action.show(s),
        ready:action.can(s) === true,
        available:available.some(function (site) {
          return site.settlement === 1;
        }),
        target:1,
        targetName:settlements[1].name
      };
    });

    expect(setup.visible).toBe(true);
    expect(setup.ready).toBe(true);
    expect(setup.available).toBe(true);
    await expect(page.getByText(
      /each settlement can hold up to .* family plots/)).toBeVisible();
    const batch = page.locator('[data-land-batch="' + setup.target + '"]');
    await expect(batch).toBeVisible();
    await batch.focus();
    await expect(page.locator('#tooltip')).toContainText('Resulting holding');
    await expect(page.locator('#tooltip')).toContainText('holding complete');
    const choice = page.locator(
      '[data-land-settlement="' + setup.target + '"]');
    await expect(choice).not.toHaveAttribute('aria-disabled', 'true');
    await expect(choice).toContainText(setup.targetName);
    await choice.click();

    const result = await page.evaluate(function (target) {
      const s = FB.state;
      return {
        tier:s.player.tier,
        count:FB.landCountAt(s, s.player.provinceId, target),
        gold:s.player.gold,
        manor:s.player.manor
      };
    }, setup.target);
    expect(result.tier).toBe(2);
    expect(result.count).toBe(1);
    expect(result.gold).toBe(0);
    expect(result.manor.settlement).toBe(0);
  });
