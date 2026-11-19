'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/economy.js',
  'js/keys.js',
  'js/main.js',
  'js/market.js',
  'js/mods.js',
  'js/save.js',
  'js/travel.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'css/style.css',
  'data/actions.js',
  'data/economy.js',
  'data/markets.js',
  'data/technology.js',
  'data/travel.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');

test.describe.configure({ mode:'parallel' });

async function beginCoreGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('return cargo offers ten percent of current gold and scales quantity and fees', async function ({ page }, info) {
  await beginCoreGame(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 10000;
    s.player.travel = { purpose:'trade', phase:'arrived', homeId:'london',
      destinationId:'bruges', currentId:'bruges', outboundRoute:FB.travelRoute('london', 'bruges') };
    const small = FB.tradeVentureReturnPreview(s, 10, 'wares');
    const large = FB.tradeVentureReturnPreview(s, 1000, 'wares');
    s.player.gold = 9000;
    return { ratio:large.quantity / small.quantity, total:large.totalCost,
      stale:FB.tradeVentureReturnPreview(s, 1000, 'wares'),
      next:FB.tradeVentureStakes(s) };
  });
  expect(result.ratio).toBeCloseTo(100, 6);
  expect(result.total).toBe(1100);
  expect(result.stale).toBeNull();
  expect(result.next).toEqual([10, 20, 50, 900]);
});

test('return cargo eligibility, goods listing, and price preview calculate correctly',
  async function ({ page }, info) {
    await beginCoreGame(page, info);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 1;
      s.player.provinceId = 'london';
      s.player.gold = 100;
      FB.ensureMarket(s);

      // Setup an arrived trade journey in bruges
      s.player.travel = {
        purpose: 'trade',
        homeId: 'london',
        destinationId: 'bruges',
        currentId: 'bruges',
        phase: 'arrived',
        remainingRoute: [],
        outboundRoute: FB.travelRoute('london', 'bruges'),
        visited: ['london', 'kent', 'bruges'],
        legDaysLeft: 0,
        legDays: 3,
        startTurn: s.turn,
        cost: 15,
        overhead: 5,
        encounters: { culture: 0, road: 0 },
        seenCultures: {},
        seenEvents: {},
        completed: true,
        venture: {
          kind: 'trade_venture',
          goodId: 'provisions',
          stake: 20,
          status: 'resolved',
          payout: 28
        }
      };

      const eligible = FB.tradeVentureReturnEligible(s);
      const goods = FB.tradeVentureReturnGoods(s, 20);
      const preview = FB.tradeVentureReturnPreview(s, 20, 'wares');

      // Test validation when already loaded
      s.player.travel.returnVenture = { status: 'active' };
      const alreadyLoaded = FB.tradeVentureReturnEligible(s);
      s.player.travel.returnVenture = null;

      // Test validation when not arrived
      s.player.travel.phase = 'return';
      const notArrived = FB.tradeVentureReturnEligible(s);
      s.player.travel.phase = 'arrived';

      return {
        eligible: eligible,
        goodsCount: goods.length,
        goodsHavePrices: goods.every(function (g) {
          return g.destPrice > 0 && g.homePrice > 0 && g.quantity > 0;
        }),
        previewStake: preview.stake,
        previewLadingFee: preview.ladingFee,
        previewTotalCost: preview.totalCost,
        previewQuantity: preview.quantity,
        alreadyLoaded: alreadyLoaded,
        notArrived: notArrived
      };
    });

    expect(result.eligible).toBe(true);
    expect(result.goodsCount).toBe(5);
    expect(result.goodsHavePrices).toBe(true);
    expect(result.previewStake).toBe(20);
    expect(result.previewLadingFee).toBe(2); // 10% of 20g
    expect(result.previewTotalCost).toBe(22);
    expect(result.previewQuantity).toBeGreaterThan(0);
    expect(typeof result.alreadyLoaded).toBe('string');
    expect(typeof result.notArrived).toBe('string');
  });

test('loading return cargo takes destination stock, deducts gold, and resolves on arrival at home',
  async function ({ page }, info) {
    await beginCoreGame(page, info);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 1;
      s.player.provinceId = 'london';
      s.player.gold = 100;
      FB.ensureMarket(s);

      s.player.travel = {
        purpose: 'trade',
        homeId: 'london',
        destinationId: 'bruges',
        currentId: 'bruges',
        phase: 'arrived',
        remainingRoute: [],
        outboundRoute: FB.travelRoute('london', 'bruges'),
        visited: ['london', 'kent', 'bruges'],
        legDaysLeft: 0,
        legDays: 3,
        startTurn: s.turn,
        stayStartTurn: s.turn - 100,
        cost: 15,
        overhead: 5,
        encounters: { culture: 0, road: 0 },
        seenCultures: {},
        seenEvents: {},
        completed: true,
        venture: {
          kind: 'trade_venture',
          goodId: 'provisions',
          stake: 20,
          status: 'resolved',
          payout: 28
        }
      };

      const destCountyBefore = FB.marketCounty(s, 'bruges');
      const destStockBefore = destCountyBefore.goods.wares.stock;
      const homeCountyBefore = FB.marketCounty(s, 'london');
      const homeStockBefore = homeCountyBefore.goods.wares.stock;
      const goldBefore = s.player.gold;

      const loaded = FB.loadTradeVentureReturn(s, 20, 'wares', 'cautious');
      const goldAfterLoad = s.player.gold;
      const destStockAfterLoad = FB.marketCounty(s, 'bruges').goods.wares.stock;

      // Start return journey
      FB.travelReturn(s);
      const phaseOnReturn = s.player.travel ? s.player.travel.phase : null;

      // Advance daily travel until home
      let turns = 0;
      while (s.player.travel && turns < 50) {
        FB.travelTick(s);
        turns++;
      }

      const goldAfterArrival = s.player.gold;
      const homeStockAfterArrival = FB.marketCounty(s, 'london').goods.wares.stock;
      const travelEnded = s.player.travel === null;

      return {
        loaded: !!loaded,
        goldDeducted: goldBefore - goldAfterLoad,
        destStockDecreased: destStockBefore > destStockAfterLoad,
        phaseOnReturn: phaseOnReturn,
        travelEnded: travelEnded,
        goldAfterArrival: goldAfterArrival,
        homeStockIncreased: homeStockAfterArrival > homeStockBefore,
        profitMade: goldAfterArrival > goldAfterLoad
      };
    });

    expect(result.loaded).toBe(true);
    expect(result.goldDeducted).toBe(22); // 20g stake + 2g fee
    expect(result.destStockDecreased).toBe(true);
    expect(result.phaseOnReturn).toBe('return');
    expect(result.travelEnded).toBe(true);
    expect(result.homeStockIncreased).toBe(true);
    expect(result.profitMade).toBe(true);
  });

test('bold return cargo tests stewardship and resolves appropriately',
  async function ({ page }, info) {
    await beginCoreGame(page, info);
    const result = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 1;
      s.player.provinceId = 'london';
      s.player.gold = 200;
      FB.ensureMarket(s);

      s.player.travel = {
        purpose: 'trade',
        homeId: 'london',
        destinationId: 'bruges',
        currentId: 'bruges',
        phase: 'arrived',
        remainingRoute: [],
        outboundRoute: FB.travelRoute('london', 'bruges'),
        visited: ['london', 'kent', 'bruges'],
        legDaysLeft: 0,
        legDays: 3,
        startTurn: s.turn,
        cost: 15,
        overhead: 5,
        encounters: { culture: 0, road: 0 },
        seenCultures: {},
        seenEvents: {},
        completed: true
      };

      const loaded = FB.loadTradeVentureReturn(s, 50, 'wares', 'bold');
      const payout = FB.resolveReturnTradeVenture(s, s.player.travel);

      return {
        loadedKind: loaded ? loaded.kind : null,
        loadedStrategy: loaded ? loaded.strategy : null,
        payout: payout,
        outcome: s.player.travel.returnVenture.outcome,
        status: s.player.travel.returnVenture.status
      };
    });

    expect(result.loadedKind).toBe('trade_venture_return');
    expect(result.loadedStrategy).toBe('bold');
    expect(result.payout).toBeGreaterThan(0);
    expect(['bold_success', 'bold_failure']).toContain(result.outcome);
    expect(result.status).toBe('resolved');
  });

test('technology impact review includes trade_venture_return_cargo entry',
  async function ({ page }, info) {
    await beginCoreGame(page, info);
    const review = await page.evaluate(function () {
      const reviews = FBDATA.techImpactReviews;
      return {
        exists: !!(reviews && reviews.features && reviews.features.trade_venture_return_cargo),
        entry: reviews && reviews.features && reviews.features.trade_venture_return_cargo
      };
    });

    expect(review.exists).toBe(true);
    expect(review.entry.mode).toBe('none');
    expect(typeof review.entry.rationale).toBe('string');
  });

async function arriveAtTradeMarket(page, stake, stayComplete) {
  return page.evaluate(function (input) {
    const s = FB.state, good = 'wares';
    s.player.gold = 200;
    const market = FB.tradeVentureMarkets(s).find(function (item) {
      return FB.tradeVentureCanStart(s, 'accompany', input.stake, item.destinationId, good) === true;
    });
    if (!market || !FB.travelStart(s, 'trade', market.destinationId, market.destinationRealm,
      {kind:'trade_venture', stake:input.stake, goodId:good})) throw new Error('No accompanied trade departure');
    const t = s.player.travel;
    // Stage the arrival boundary to exercise the ordinary stay and outbound sale.
    t.currentId = t.destinationId;
    t.visited = [t.homeId].concat(t.outboundRoute);
    t.remainingRoute = [];
    FB.travelTick(s);
    if (!FB.travelTradeSettle(s, 'cautious', 1.2)) throw new Error('Outbound trade did not settle');
    if (input.stayComplete) t.stayStartTurn = s.turn - FBDATA.balance.travelMinStayDays;
    const book = FB.ensureMarket(s), at = book.goods.indexOf(good);
    book.counties[t.destinationId][0][at] = 75;
    book.counties[t.destinationId][1][at] = 1.25;
    book.counties[t.homeId][0][at] = 40;
    book.counties[t.homeId][1][at] = 1.5;
    return {home:t.homeId, outbound:t.venture, route:t.outboundRoute.slice(0, -1).reverse().concat(t.homeId)};
  }, {stake:stake, stayComplete:stayComplete});
}

async function openCargoReview(page, stake, deed) {
  await page.evaluate(function (id) { FB.runInstant(FB.state, id); }, deed);
  await page.locator('[data-return-stake="' + stake + '"]').click();
  await page.locator('[data-return-good="wares"]').click();
  await expect(page.getByRole('heading', {name:'Review return cargo'})).toBeVisible();
}

async function expectCargoFact(page, label, amount) {
  const text = await page.evaluate(function (amount) { return FB.money(amount); }, amount);
  await expect(page.locator('[data-return-cargo-review] .kv').filter({
    has:page.getByText(label, {exact:true})
  }).locator('b')).toHaveText(text);
}

async function cargoState(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player, t = p.travel;
    return {gold:p.gold, cargo:t.returnVenture || null, outbound:t.venture, phase:t.phase,
      stock:FB.marketCounty(s, t.destinationId).goods.wares.stock, home:p.provinceId,
      cooldown:p.cooldowns.take_road, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), turn:s.turn};
  });
}

test('867 reviews an actual load, retains the cargo list and can refuse the purchase', async function ({page}, info) {
  await page.setViewportSize({width:1100, height:500});
  await beginCoreGame(page, info);
  const journey = await arriveAtTradeMarket(page, 10, true);
  const before = await cargoState(page);
  await openCargoReview(page, 10, 'travel_turn_back');
  await expectCargoFact(page, 'Household cash now', before.gold);
  await expectCargoFact(page, 'Lading fee', 1);
  await expectCargoFact(page, 'Total paid now', 11);
  await expectCargoFact(page, 'Cash left after purchase', before.gold - 11);
  await expect(page.locator('[data-return-cargo-review]')).toContainText('8 units');
  await expect(page.locator('#return-cargo-unladen')).toContainText(
    await page.evaluate(function () { return FB.money(FB.state.player.gold); }));

  await page.keyboard.press('Escape');
  const good = page.locator('[data-return-good="wares"]');
  await expect(good).toBeFocused();
  const details = page.locator('button[aria-controls="return-good-details-wares"]');
  await details.click();
  const scroll = await good.evaluate(function (button) {
    const body = document.getElementById('gm-body');
    button.focus({preventScroll:true});
    body.scrollTop = 120;
    const top = body.scrollTop;
    button.click();
    return top;
  });
  expect(scroll).toBeGreaterThan(0);
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await expect(good).toBeFocused();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(scroll);
  await good.click();

  const blocked = await page.evaluate(function () {
    const s = FB.state, t = s.player.travel;
    const from = t.destinationId, to = FB.travelTradeReturnRoad(t).route[0];
    window.returnEdge = [from, to, FB.world.adj[from][to]];
    delete FB.world.adj[from][to];
    return {left:FB.travelReturn(s), bought:FB.loadTradeVentureReturn(s, 10, 'wares', 'cautious')};
  });
  expect(blocked).toEqual({left:false, bought:null});
  await page.locator('#return-load-cautious').click();
  await expect(page.getByRole('status').filter({hasText:'The return terms changed'})).toBeVisible();
  await expect(page.locator('#return-cargo-unladen')).toBeDisabled();
  await expect(page.locator('#return-load-cautious')).toBeDisabled();
  expect(await cargoState(page)).toEqual(before);
  await page.evaluate(function () {
    const edge = window.returnEdge;
    FB.world.adj[edge[0]][edge[1]] = edge[2];
  });
  await page.keyboard.press('Escape');
  await good.click();
  await page.locator('#return-cargo-unladen').evaluate(function (button) { button.click(); button.click(); });
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await cargoState(page)).toEqual({...before, phase:'return'});
  expect(await page.evaluate(function () { return FB.state.player.travel.remainingRoute; })).toEqual(journey.route);
});

test('1066 imported return terms requote stale funds and stock, then charge and restore one cargo', async function ({page}, info) {
  await openGame(page, info);
  const mod = {name:'Return cargo terms', finance:{tradeVenture:{
    stakes:[16,32], treasuryStakeShare:0.20,
    returnCargo:{ladingFeeRate:0.25, cautiousMultiplier:1.5, boldSuccessMultiplier:3, boldFailureMultiplier:0.5}
  }}};
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'return-cargo.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod), 'utf8')});
  await Promise.all([page.waitForEvent('load'), page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page, '1066', 'apprentice');
  const journey = await arriveAtTradeMarket(page, 16, false);
  await page.evaluate(function () { FB.state.player.gold = 100; });
  await openCargoReview(page, 16, 'travel_return_cargo');
  await expect(page.locator('#return-cargo-unladen')).toBeDisabled();
  await expect(page.locator('#return-load-cautious')).toBeEnabled();
  await expectCargoFact(page, 'Lading fee', 4);
  await expectCargoFact(page, 'Total paid now', 20);
  await expectCargoFact(page, 'Cash left after purchase', 80);

  await page.evaluate(function () { FB.state.player.gold = 19; });
  const poor = await cargoState(page);
  await page.locator('#return-load-cautious').click();
  await expectCargoFact(page, 'Shortfall', 1);
  await expect(page.locator('#return-load-cautious')).toBeDisabled();
  expect(await cargoState(page)).toEqual(poor);

  await page.evaluate(function () { FB.state.player.gold = 100; });
  await page.keyboard.press('Escape');
  const good = page.locator('[data-return-good="wares"]');
  await good.click();
  await page.evaluate(function () {
    const s = FB.state, book = s.market;
    book.counties[s.player.travel.destinationId][0][book.goods.indexOf('wares')] = 0;
  });
  const empty = await cargoState(page);
  await page.locator('#return-load-bold').click();
  await expect(page.locator('#return-load-bold')).toBeDisabled();
  await expect(page.locator('#return-load-bold')).toContainText('The market cannot supply that quantity');
  expect(await cargoState(page)).toEqual(empty);

  await page.evaluate(function () {
    const s = FB.state, book = s.market;
    book.counties[s.player.travel.destinationId][0][book.goods.indexOf('wares')] = 75;
  });
  await page.keyboard.press('Escape');
  await good.click();
  await page.evaluate(function () {
    const s = FB.state, book = s.market;
    book.counties[s.player.travel.destinationId][1][book.goods.indexOf('wares')] = 2;
  });
  const funded = await cargoState(page);
  await page.locator('#return-load-cautious').click();
  await expect(page.locator('[data-return-cargo-review]')).toContainText('8 units');
  await expect(page.locator('#return-load-cautious')).toContainText(
    await page.evaluate(function () { return FB.money(18); }));
  expect(await cargoState(page)).toEqual(funded);
  await page.locator('#return-load-cautious').evaluate(function (button) { button.click(); button.click(); });
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  const paid = await cargoState(page);
  expect(paid.cargo).toMatchObject({stake:16, ladingFee:4, totalCost:20, quantity:8,
    destPrice:2, homePrice:1.5, goodId:'wares', destinationId:journey.home, strategy:'cautious', status:'active'});
  expect(paid).toEqual({...funded, gold:80, stock:67, cargo:paid.cargo});
  const save = await page.evaluate(function () {
    window.preRestoreTravel = FB.state.player.travel;
    return FB.save.serialize();
  });
  expect(JSON.parse(save).mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
  await restoreBookmark(page, save);
  expect(await cargoState(page)).toEqual(paid);
  const settled = await page.evaluate(function () {
    const s = FB.state, t = s.player.travel;
    const duplicatePurchase = FB.loadTradeVentureReturn(s, 16, 'wares', 'cautious');
    const detachedSettlement = FB.resolveReturnTradeVenture(s, window.preRestoreTravel);
    t.stayStartTurn = s.turn - FBDATA.balance.travelMinStayDays;
    FB.runInstant(s, 'travel_turn_back');
    const route = t.remainingRoute.slice(), at = s.market.goods.indexOf('wares');
    s.market.counties[t.homeId][1][at] = 2;
    // Cross the final return boundary against the actual home quote.
    t.currentId = route.length > 1 ? route[route.length - 2] : t.destinationId;
    t.remainingRoute = [t.homeId];
    t.legDaysLeft = 1;
    FB.travelTick(s);
    const duplicateSale = FB.resolveReturnTradeVenture(s, t);
    return {duplicatePurchase, detachedSettlement, duplicateSale, route, cargo:t.returnVenture,
      gold:s.player.gold, travel:s.player.travel, stock:FB.marketCounty(s, t.homeId).goods.wares.stock,
      outbound:t.venture};
  });
  expect(settled).toMatchObject({duplicatePurchase:null, detachedSettlement:false, duplicateSale:false,
    route:journey.route, cargo:{status:'resolved', payout:24, deliveredQuantity:8, arrivalPrice:2},
    gold:104, travel:null, stock:48, outbound:journey.outbound});
});
