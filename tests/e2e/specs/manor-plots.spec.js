'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/actions.js',
  'data/events_noble.js',
  'data/map_data.js',
  'data/technology.js',
  'js/actions.js',
  'js/economy.js',
  'js/events.js',
  'js/main.js', 'js/world.js',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/technology.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('every free rank can review plots while broke and buy with the ordinary terms',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      const action = FB.instants.find(function (item) { return item.id === 'buy_land'; });
      p.landPlotMigration = 1;
      const rows = [];
      const jurisdiction = JSON.stringify({provs:p.provs,owner:s.owner,holder:s.holder});
      for (let tier = 1; tier <= 7; tier++) {
        p.tier = tier; p.gold = 0; p.landPlots = [];
        const before = {rng:FB.getRngState(),turn:s.turn,gold:p.gold};
        const visible = action.show(s), ready = action.can(s);
        const shortage = FB.buyLandPlot(s, 0);
        const unchanged = p.gold === before.gold && s.turn === before.turn &&
          FB.getRngState() === before.rng && p.landPlots.length === 0;
        const cost = FB.landPlotCost(s);
        p.gold = cost;
        const bought = FB.buyLandPlot(s, 0);
        const paid = p.gold === 0 && FB.landCountAt(s, p.provinceId, 0) === 1;
        const max = FBDATA.balance.landPlotMaxSettlement || FBDATA.balance.manorPlotRequirement;
        p.landPlots = [];
        FB.settlementsOf(s, p.provinceId).forEach(function (site, index) {
          for (let i = 0; i < max; i++) p.landPlots.push({provinceId:p.provinceId,settlement:index});
        });
        p.gold = cost;
        const full = !FB.buyLandPlot(s, 0) && p.gold === cost && !FB.landAvailable(s).length;
        rows.push({tier:tier,visible:visible,ready:ready,shortage:shortage,unchanged:unchanged,
          bought:bought,paid:paid,full:full,fullReview:action.can(s),rankUnchanged:p.tier === tier});
      }
      p.tier = 0; p.landPlots = [];
      return {rows:rows,serfHidden:!action.show(s),serfBlocked:!FB.buyLandPlot(s, 0),
        jurisdictionUnchanged:jurisdiction === JSON.stringify({provs:p.provs,owner:s.owner,holder:s.holder}),
        technology:FBDATA.techImpactReviews.features.gentry_freehold_expansion.mode,
        validation:FB.validateTechnologyData()};
    });
    for (const row of result.rows) expect(row).toEqual({tier:row.tier,visible:true,ready:true,
      shortage:false,unchanged:true,bought:true,paid:true,full:true,fullReview:true,rankUnchanged:true});
    expect(result).toMatchObject({serfHidden:true,serfBlocked:true,jurisdictionUnchanged:true,
      technology:'none',validation:[]});
  });

for (const setup of [{tier:1,width:390},{tier:6,width:1360}]) {
  test('broke rank ' + setup.tier + ' opens the plot deed and keeps purchases blocked at width ' + setup.width,
    async function ({ page }) {
      await page.setViewportSize({width:setup.width,height:844});
      const before = await page.evaluate(function (tier) {
        const s = FB.state, p = s.player, c = s.chars[p.charId];
        FB.game.setPaused(true);
        s.eventQueue = []; s.slotDays = [];
        p.tier = tier; c.born = s.date.year - 30;
        p.gold = 0; p.landPlots = []; p.landPlotMigration = 1;
        p.flags.tutorial_done = 1; delete p.flags.tutorial;
        p.roleOrientationsSeen = p.roleOrientationsSeen || {};
        p.roleOrientationsSeen['role-tier-' + tier] = 1;
        FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
        FB.ui.showTab('actions', {history:false});
        FB.ui.revealDeedAction('buy_land');
        return {turn:s.turn,price:FB.money(FB.landPlotCost(s))};
      }, setup.tier);
      const deed = page.locator('#tab-actions [data-action-id="buy_land"]');
      await expect(deed).toBeEnabled();
      await deed.focus(); await page.keyboard.press('Enter');
      await expect(page.locator('#gm-title')).toContainText('Buy Freehold Land');
      const row = page.locator('[data-land-settlement="0"]');
      await expect(row).toHaveAttribute('aria-disabled', 'true');
      await expect(row).toContainText(before.price + ' · not affordable');
      await row.click();
      expect(await page.evaluate(function () {
        return {turn:FB.state.turn,gold:FB.state.player.gold,plots:FB.state.player.landPlots.length};
      })).toEqual({turn:before.turn,gold:0,plots:0});
      expect(await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollWidth > body.clientWidth + 1;
      })).toBe(false);
      await page.evaluate(function () {
        FB.state.player.gold = FB.landPlotCost(FB.state);
        FB.ui.showLandMarket(true);
      });
      await expect(row).not.toHaveAttribute('aria-disabled', 'true');
      await row.click();
      expect(await page.evaluate(function () {
        return {turn:FB.state.turn,gold:FB.state.player.gold,plots:FB.state.player.landPlots.length};
      })).toEqual({turn:before.turn,gold:0,plots:1});
      await page.locator('#gm-cancel').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(deed).toBeEnabled();
    });
}

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

['full', 'unaffordable'].forEach(function (ending) {
  test('land purchase preserves scroll and focus when the settlement becomes ' + ending,
    async function ({ page }) {
      await page.setViewportSize({ width:900, height:500 });
      await openLandMarket(page, 0, 1000);
      const setup = await page.evaluate(function (ending) {
        const s = FB.state, p = s.player;
        const provinces = FB.world.provs.filter(function (province) {
          return !province.wasteland;
        });
        provinces.sort(function (a, b) {
          return FB.settlementsOf(s, b.id).length - FB.settlementsOf(s, a.id).length;
        });
        p.provinceId = provinces[0].id;
        const target = FB.settlementsOf(s, p.provinceId).length - 1;
        const max = FBDATA.balance.landPlotMaxSettlement || FBDATA.balance.manorPlotRequirement;
        const count = ending === 'full' ? max - 1 : 0;
        p.landPlots = [];
        for (let i = 0; i < count; i++) {
          p.landPlots.push({ provinceId:p.provinceId, settlement:target });
        }
        const cost = FB.landPlotCost(s);
        p.gold = ending === 'unaffordable' ? cost : 1000;
        FB.ui.showLandMarket();
        return { target:target, count:count, gold:p.gold, cost:cost };
      }, ending);
      const row = page.locator('[data-land-settlement="' + setup.target + '"]');
      await row.scrollIntoViewIfNeeded();
      const scroll = await page.locator('#gm-body').evaluate(function (body) {
        return body.scrollTop;
      });
      expect(scroll).toBeGreaterThan(0);
      await row.click();
      await expect(page.locator('#gm-title')).toContainText('Buy Freehold Land');
      await expect(row).toHaveAttribute('aria-disabled', 'true');
      await expect(row).toBeFocused();
      await expect.poll(function () {
        return page.locator('#gm-body').evaluate(function (body, savedScroll) {
          return Math.abs(body.scrollTop - savedScroll);
        }, scroll);
      }).toBeLessThanOrEqual(5);
      const result = await page.evaluate(function (target) {
        return {
          count:FB.landCountAt(FB.state, FB.state.player.provinceId, target),
          gold:FB.state.player.gold
        };
      }, setup.target);
      expect(result).toEqual({ count:setup.count + 1, gold:setup.gold - setup.cost });
    });
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
      p.freeholderGeneration = 0; // This case exercises recognition costs after establishment.
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
