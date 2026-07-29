'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

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
    const totalCost = remaining * FB.landPlotCost();
    FB.ui.refresh();
    FB.ui.showLandMarket();
    return {
      settlement:settlement,
      requirement:requirement,
      remaining:remaining,
      totalCost:totalCost,
      totalPrice:FB.money(totalCost),
      resultingYield:FB.money(FB.landGroupYield(requirement)),
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
    await expect(batch).toContainText(
      setup.remaining + ' plots for ' + setup.totalPrice);

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
    await expect(page.locator('[data-land-settlement="0"]')).toBeDisabled();
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
