'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('return cargo eligibility, goods listing, and price preview calculate correctly',
  async function ({ page }) {
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
        outboundRoute: ['london', 'kent', 'bruges'],
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
  async function ({ page }) {
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
        outboundRoute: ['london', 'kent', 'bruges'],
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

      const destCountyBefore = FB.marketCounty(s, 'bruges');
      const destStockBefore = destCountyBefore.goods.wares.stock;
      const homeCountyBefore = FB.marketCounty(s, 'london');
      const homeStockBefore = homeCountyBefore.goods.wares.stock;
      const goldBefore = s.player.gold;

      const loaded = FB.loadTradeVentureReturn(s, 20, 'wares', 'cautious');
      const goldAfterLoad = s.player.gold;
      const destStockAfterLoad = destCountyBefore.goods.wares.stock;

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
      const homeStockAfterArrival = homeCountyBefore.goods.wares.stock;
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
  async function ({ page }) {
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
        outboundRoute: ['london', 'kent', 'bruges'],
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
  async function ({ page }) {
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
