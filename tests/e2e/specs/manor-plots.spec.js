'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/events_noble.js',
  'data/map_data.js',
  'js/actions.js',
  'js/economy.js',
  'js/events.js',
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
    const requirement = FBDATA.balance.manorPlotRequirement;
    const onePlotCost = FB.landPlotCost(s);
    p.roleOrientationsSeen = p.roleOrientationsSeen || {};
    p.roleOrientationsSeen['role-tier-' + p.tier] = 1;
    FB.ui.refresh();
    FB.ui.showLandMarket();
    return {
      requirement:requirement,
      onePlotCost:onePlotCost,
      onePlotPrice:FB.money(onePlotCost),
      currentYield:FB.money(FB.landGroupYield(setup.plotCount)),
      nextYield:FB.money(FB.landGroupYield(setup.plotCount + 1)),
      logLength:s.log.length
    };
  }, { plotCount:plotCount, gold:gold });
}

test('offers only one-plot purchases without a batch purchase dialog',
  async function ({ page }) {
    const setup = await openLandMarket(page, 1, 1000);
    await expect(page.locator('[data-land-batch]')).toHaveCount(0);
    await expect(page.locator('[id^="manor-plot-batch"]')).toHaveCount(0);
    const removed = await page.evaluate(function () {
      return {
        plan:typeof FB.manorPlotPurchasePlan,
        purchase:typeof FB.buyRemainingManorPlots,
        preview:typeof FB.ui.showManorPlotBatchPreview
      };
    });
    expect(removed).toEqual({
      plan:'undefined', purchase:'undefined', preview:'undefined'
    });

    const choice = page.locator('[data-land-settlement="0"]');
    await expect(choice).toContainText(
      setup.currentYield + ' → ' + setup.nextYield + '/season');
    await choice.click();

    const result = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold,
        logLength:s.log.length,
        lastMessageKey:s.log.length && s.log[s.log.length - 1].msg
          ? s.log[s.log.length - 1].msg.key : null
      };
    });
    expect(result.count).toBe(2);
    expect(result.gold).toBe(1000 - setup.onePlotCost);
    expect(result.logLength).toBe(setup.logLength + 1);
    expect(result.lastMessageKey).toBe('news.action.land_bought');
    await expect(page.locator('#gm-title')).toContainText('Buy Freehold Land');
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
    await expect(tooltip).toContainText('Cost');
    await expect(tooltip).toContainText('not affordable');
    await expect(tooltip).toContainText(
      'Passes to heirs as family land in this settlement');
    await expect(tooltip).not.toContainText('Owner');
    await expect(tooltip).not.toContainText('No fixed end');

    await choice.dispatchEvent('click');
    const unchanged = await page.evaluate(function () {
      const s = FB.state;
      return {
        count:FB.landCountAt(s, s.player.provinceId, 0),
        gold:s.player.gold
      };
    });
    expect(unchanged).toEqual({ count:1, gold:0 });
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

test('manor recognition is a confirmed 200 gold and 100 prestige claim',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const requirement = FBDATA.balance.manorPlotRequirement;
      p.tier = 1;
      p.gold = 250;
      p.prestige = FBDATA.balance.manorPrestige;
      p.piety = 0;
      p.manor = null;
      p.landPlots = [];
      p.landPlotMigration = 1;
      for (let i = 0; i < requirement; i++) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
      }
      s.eventQueue = [];
      const status = FB.rankElevationStatus(s, null, { route:'manor' });
      const launcher = FB.instantStatus(s, 'declare_manor');
      const before = {
        tier:p.tier, gold:p.gold, prestige:p.prestige, manor:p.manor
      };
      const attempt = FB.attemptRankElevation(s, 'manor');
      return {
        launcherReady:launcher.shown && launcher.can,
        ready:status.ready,
        quote:{
          gold:status.cost.gold,
          prestige:status.cost.prestige,
          piety:status.cost.piety
        },
        before:before,
        attempted:attempt.attempted,
        claimed:attempt.claimed,
        after:{
          tier:p.tier,
          gold:p.gold,
          prestige:p.prestige,
          manor:p.manor,
          queue:(s.eventQueue || []).map(function (item) { return item.id; })
        }
      };
    });

    expect(result).toEqual({
      launcherReady:true,
      ready:true,
      quote:{ gold:200, prestige:100, piety:0 },
      before:{ tier:1, gold:250, prestige:150, manor:null },
      attempted:true,
      claimed:true,
      after:{
        tier:2,
        gold:50,
        prestige:50,
        manor:{ provinceId:expect.any(String), settlement:0 },
        queue:['rank_elevation_result']
      }
    });
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
    await expect(page.locator('[data-land-batch]')).toHaveCount(0);
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
