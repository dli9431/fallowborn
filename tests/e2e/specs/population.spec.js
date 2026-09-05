'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/population.js',
  'js/world.js',
  'data/map_data.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test.describe('County Population & Lightweight Demographics Engine', function () {
  test('Deterministic opening baseline fallback and bookmark overrides', async function ({ page }) {
    const results = await page.evaluate(function () {
      const state = FB.state || {};
      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      const floor = FBDATA.balance.populationFloor || 1000;
      let allAboveFloor = true;
      let matchesMath = true;
      const sample = [];

      for (let i = 0; i < Math.min(10, provs.length); i++) {
        const pr = provs[i];
        const base = FB.countyPopulationBaseline(state, pr.id);
        if (base < floor) allAboveFloor = false;

        const dev0 = pr.dev0 || pr.dev || 1;
        const table = FBDATA.balance.populationByDevelopment;
        const terrainFactors = FBDATA.balance.populationTerrainFactors;
        const tf = terrainFactors[pr.terrain] !== undefined ? terrainFactors[pr.terrain] : 1.0;
        const expected = Math.max(floor, Math.round((table[dev0 - 1] * tf) / 100) * 100);
        if (base !== expected) matchesMath = false;

        sample.push({ pid: pr.id, dev0: dev0, terrain: pr.terrain, base: base, expected: expected });
      }

      return { allAboveFloor: allAboveFloor, matchesMath: matchesMath, sample: sample };
    });

    expect(results.allAboveFloor).toBe(true);
    expect(results.matchesMath).toBe(true);
  });

  test('Carrying capacity responds to buildings and technology with caps', async function ({ page }) {
    const capacityData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: { dorset: 'wessex' },
        buildings: { dorset: [] },
        dev: { dorset: 2 },
        realms: { wessex: { id: 'wessex', alive: true, culture: 'anglo_saxon', religion: 'catholic' } },
        realmTechMigration: 2,
        realmTech: { wessex: { completed: [], active: [], exposed: [], progress: {}, reserve: 0 } }
      };
      FB.ensurePopulationState(state);

      const cap0 = FB.countyPopulationCapacity(state, 'dorset');
      const basePop = FB.countyPopulationBaseline(state, 'dorset');

      // Add mill (+5%) and harbor (+3%)
      state.buildings.dorset = [
        { id: 'mill', s: 0, turns: 0 },
        { id: 'harbor', s: 0, turns: 0 }
      ];
      const capWithBldgs = FB.countyPopulationCapacity(state, 'dorset');

      return {
        basePop: basePop,
        cap0: cap0,
        capWithBldgs: capWithBldgs,
        expectedBldgMultiplier: 1 + 0.05 + 0.03
      };
    });

    expect(capacityData.cap0).toBeGreaterThanOrEqual(capacityData.basePop);
    expect(capacityData.capWithBldgs).toBe(Math.round(capacityData.cap0 * capacityData.expectedBldgMultiplier));
  });

  test('Natural growth exhibits logistic pressure and clamps', async function ({ page }) {
    const growthData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: {},
        dev: {},
        player: { charId: 'p1', provinceId: 'london', liege: null },
        realmTechMigration: 2,
        realmTech: {},
        population: {
          schema: 1,
          lastYear: 866,
          counties: {}
        }
      };

      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      const testPid = provs[0].id;
      const baseCap = FB.countyPopulationCapacity(state, testPid);

      // Sub-capacity state (P = 50% K)
      state.population.counties[testPid] = {
        count: Math.round(baseCap * 0.5),
        natural: 0,
        migration: 0,
        losses: 0
      };

      FB.populationYear(state);
      const subGrowth = state.population.counties[testPid].natural;

      // Over-capacity state (P = 150% K)
      state.date.year = 868;
      state.population.counties[testPid].count = Math.round(baseCap * 1.5);
      FB.populationYear(state);
      const overGrowth = state.population.counties[testPid].natural;

      return { subGrowth: subGrowth, overGrowth: overGrowth };
    });

    expect(growthData.subGrowth).toBeGreaterThan(0);
    expect(growthData.overGrowth).toBeLessThan(0);
  });

  test('Conserved land migration maintains zero world-sum delta and respects limits', async function ({ page }) {
    const migrationResult = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        owner: {},
        buildings: {},
        dev: {},
        player: { charId: 'p1', provinceId: 'london', liege: null },
        realmTechMigration: 2,
        realmTech: {},
        population: {
          schema: 1,
          lastYear: 866,
          counties: {}
        }
      };

      const provs = FB.world.provs.filter(function (p) { return !p.wasteland; });
      for (const pr of provs) {
        state.population.counties[pr.id] = {
          count: FB.countyPopulationBaseline(state, pr.id),
          natural: 0,
          migration: 0,
          losses: 0
        };
      }

      // Create an attraction disparity by giving one county buildings and low relative population
      const sourcePid = provs[0].id;
      const targetPid = Object.keys(FB.world.adj[sourcePid] || {})[0];
      if (targetPid) {
        state.buildings[targetPid] = [
          { id: 'market', s: 0, turns: 0 },
          { id: 'bridge', s: 0, turns: 0 }
        ];
      }

      FB.populationYear(state);

      let sumMigration = 0;
      let hasFlow = false;
      for (const pr of provs) {
        const mig = state.population.counties[pr.id].migration;
        sumMigration += mig;
        if (mig !== 0) hasFlow = true;
      }

      return { sumMigration: sumMigration, hasFlow: hasFlow };
    });

    expect(migrationResult.sumMigration).toBe(0);
    expect(migrationResult.hasFlow).toBe(true);
  });

  test('Annual migration calculates each county capacity once',
    async function ({ page }) {
      const result = await page.evaluate(function () {
        const state = FB.state;
        const originalCapacity = FB.countyPopulationCapacity;
        let capacityCalls = 0;
        FB.countyPopulationCapacity = function () {
          capacityCalls++;
          return originalCapacity.apply(this, arguments);
        };
        let inhabited = 0;
        for (let i = 0; i < FB.world.provs.length; i++) {
          if (FB.world.provs[i] && !FB.world.provs[i].wasteland) inhabited++;
        }
        state.population.lastYear = state.date.year - 1;
        try {
          FB.populationYear(state);
        } finally {
          FB.countyPopulationCapacity = originalCapacity;
        }
        return { capacityCalls:capacityCalls, inhabited:inhabited };
      });

      expect(result.capacityCalls).toBe(result.inhabited);
    });

  test('Population factor scales tax, levies, and market demand within 0.50 - 1.50 range', async function ({ page }) {
    const factorData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const pid = 'dorset';
      const basePop = FB.countyPopulationBaseline(state, pid);

      // At baseline
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const factorBase = FB.countyPopulationFactor(state, pid);

      // At 4x baseline -> sqrt(4) = 2.0 -> clamped to 1.50
      state.population.counties[pid].count = basePop * 4;
      const factorHigh = FB.countyPopulationFactor(state, pid);

      // At 0.25x baseline -> sqrt(0.25) = 0.50 -> clamped to 0.50
      state.population.counties[pid].count = Math.max(1000, Math.round(basePop * 0.25));
      const factorLow = FB.countyPopulationFactor(state, pid);

      return { factorBase: factorBase, factorHigh: factorHigh, factorLow: factorLow };
    });

    expect(factorData.factorBase).toBeCloseTo(1.0, 2);
    expect(factorData.factorHigh).toBe(1.50);
    expect(factorData.factorLow).toBe(0.50);
  });

  test('Fort tiers mitigate hostile siege capture losses', async function ({ page }) {
    const siegeData = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        buildings: {},
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const pid = 'dorset';
      const basePop = FB.countyPopulationBaseline(state, pid);

      // Fort tier 0 (no fort)
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const lossTier0 = FB.damageCountyPopulation(state, pid, 'capture');

      // Fort tier 4 (50% protection)
      state.buildings[pid] = [{ id: 'walls', s: 0, level: 4, ruined: false }];
      FB.rebuildFortIndex(state);
      state.population.counties[pid] = { count: basePop, natural: 0, migration: 0, losses: 0 };
      const lossTier4 = FB.damageCountyPopulation(state, pid, 'capture');

      return { lossTier0: lossTier0, lossTier4: lossTier4 };
    });

    expect(Math.abs(siegeData.lossTier4)).toBeLessThan(Math.abs(siegeData.lossTier0));
    expect(Math.abs(siegeData.lossTier4)).toBe(Math.round(Math.abs(siegeData.lossTier0) * 0.50));
  });

  test('Settlement population allocations sum exactly to county population', async function ({ page }) {
    const settlementResult = await page.evaluate(function () {
      const state = {
        turn: 1,
        date: { year: 867 },
        population: { schema: 1, lastYear: 867, counties: {} }
      };

      const provs = FB.world.provs.filter(function (p) {
        return !p.wasteland && FB.settlementsOf(state, p.id).length > 1;
      });
      let allSumExact = true;
      const samples = [];

      for (let i = 0; i < Math.min(10, provs.length); i++) {
        const pr = provs[i];
        const total = FB.countyPopulation(state, pr.id);
        const allocations = FB.settlementPopulations(state, pr.id);
        const sum = allocations.reduce(function (a, b) { return a + b; }, 0);
        if (sum !== total) allSumExact = false;
        samples.push({ pid: pr.id, total: total, allocations: allocations, sum: sum });
      }

      return { allSumExact: allSumExact, samples: samples };
    });

    expect(settlementResult.allSumExact).toBe(true);
  });

  test('Lazy save migration backfills population with dev scaling and building bonuses', async function ({ page }) {
    const migrationResult = await page.evaluate(function () {
      const oldState = {
        turn: 50,
        date: { year: 880 },
        dev: { dorset: 4 },
        buildings: { dorset: [{ id: 'mill', s: 0 }] },
        player: { charId: 'p1', provinceId: 'dorset', liege: null },
        realmTechMigration: 2,
        realmTech: {}
      };

      FB.ensurePopulationState(oldState);
      const dorsetRec = oldState.population && oldState.population.counties && oldState.population.counties.dorset;

      return {
        hasPopulation: !!oldState.population,
        schema: oldState.population ? oldState.population.schema : null,
        dorsetCount: dorsetRec ? dorsetRec.count : 0,
        baseline: FB.countyPopulationBaseline(oldState, 'dorset')
      };
    });

    expect(migrationResult.hasPopulation).toBe(true);
    expect(migrationResult.schema).toBe(1);
    expect(migrationResult.dorsetCount).toBeGreaterThan(migrationResult.baseline);
  });
});
