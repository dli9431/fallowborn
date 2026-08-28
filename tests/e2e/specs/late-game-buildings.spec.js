'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js',
  'js/market.js',
  'js/population.js',
  'js/settlement.js',
  'js/technology.js',
  'js/world.js',
  'data/map_data.js',
  'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('late game buildings and technologies validate cleanly and expose expected rules',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const validationErrors = FB.validateTechnologyData();

      const expectedBuildings = [
        'university', 'cathedral', 'guildhall', 'arsenal',
        'foundry', 'windmill', 'hospital', 'exchange'
      ];
      const buildingChecks = {};
      expectedBuildings.forEach(function (id) {
        const b = FBDATA.buildings[id];
        buildingChecks[id] = {
          exists: !!b,
          cost: b && b.cost,
          upkeep: b && b.upkeep,
          devMin: b && b.devMin,
          maxCounty: b && b.maxCounty,
          requiresTech: b && b.requiresTech,
          coastal: b && !!b.coastal
        };
      });

      const expectedTechs = [
        'ribbed_vaulting', 'spinning_wheel', 'deep_shaft_mining',
        'marine_insurance', 'plate_armor', 'gunpowder_artillery'
      ];
      const techChecks = {};
      expectedTechs.forEach(function (id) {
        const t = FBDATA.tech[id];
        techChecks[id] = {
          exists: !!t,
          domain: t && t.domain,
          sourcesCount: t && (t.sources || []).length,
          unlocks: t && t.unlocks
        };
      });

      return {
        validationErrors: validationErrors,
        buildingChecks: buildingChecks,
        techChecks: techChecks,
        techCount: Object.keys(FBDATA.tech).length
      };
    });

    expect(result.validationErrors).toEqual([]);
    expect(result.techCount).toBe(187);

    expect(result.buildingChecks.university.devMin).toBe(7);
    expect(result.buildingChecks.university.requiresTech).toBe('universities');
    expect(result.buildingChecks.cathedral.devMin).toBe(7);
    expect(result.buildingChecks.cathedral.requiresTech).toBe('ribbed_vaulting');
    expect(result.buildingChecks.arsenal.coastal).toBe(true);
    expect(result.buildingChecks.arsenal.requiresTech).toBe('dry_docks');
    expect(result.buildingChecks.foundry.devMin).toBe(6);
    expect(result.buildingChecks.foundry.requiresTech).toBe('blast_furnace');
    expect(result.buildingChecks.exchange.devMin).toBe(6);
    expect(result.buildingChecks.exchange.requiresTech).toBe('bills_of_exchange');

    expect(result.techChecks.ribbed_vaulting.domain).toBe('crafts');
    expect(result.techChecks.ribbed_vaulting.sourcesCount).toBeGreaterThanOrEqual(2);
    expect(result.techChecks.plate_armor.domain).toBe('warfare');
    expect(result.techChecks.plate_armor.sourcesCount).toBeGreaterThanOrEqual(2);
    expect(result.techChecks.gunpowder_artillery.domain).toBe('warfare');
    expect(result.techChecks.marine_insurance.domain).toBe('commerce');
  }
);

test('construction gates enforce devMin, requiresTech, and coastal requirements',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId || 'london';
      s.player.tier = 5; // King/Duke level tier for deeds
      s.player.provs = [pid];
      s.buildings = s.buildings || {};
      s.buildings[pid] = [];

      const techRec = FB.realmTechRecord(s);
      techRec.completed = ['lime_mortar', 'water_power'];

      // At dev 3, cathedral requires devMin 7 and tech 'ribbed_vaulting'
      s.dev[pid] = 3;
      const canBuildCathedralLowDevNoTech = FB.canBuildAt(s, pid, 0, 'cathedral');

      // Grant tech, still low dev
      techRec.completed.push('geometry', 'ribbed_vaulting');
      const canBuildCathedralLowDevWithTech = FB.canBuildAt(s, pid, 0, 'cathedral');

      // Boost dev to 7
      s.dev[pid] = 7;
      const canBuildCathedralHighDevWithTech = FB.canBuildAt(s, pid, 0, 'cathedral');

      // Build one cathedral
      s.buildings[pid].push({ s: 0, id: 'cathedral' });
      // Cathedral maxCounty is 1, so second slot should be blocked
      const canBuildSecondCathedral = FB.canBuildAt(s, pid, 1, 'cathedral');

      // Test coastal requirement on arsenal
      const prov = FB.world.byId[pid];
      const origCoastal = prov.coastal;
      prov.coastal = false;
      techRec.completed.push('harbor_works', 'stone_bridgebuilding', 'dry_docks');
      const canBuildArsenalInland = FB.canBuildAt(s, pid, 1, 'arsenal');

      prov.coastal = true;
      const canBuildArsenalCoastal = FB.canBuildAt(s, pid, 1, 'arsenal');
      prov.coastal = origCoastal;

      return {
        canBuildCathedralLowDevNoTech: canBuildCathedralLowDevNoTech,
        canBuildCathedralLowDevWithTech: canBuildCathedralLowDevWithTech,
        canBuildCathedralHighDevWithTech: canBuildCathedralHighDevWithTech,
        canBuildSecondCathedral: canBuildSecondCathedral,
        canBuildArsenalInland: canBuildArsenalInland,
        canBuildArsenalCoastal: canBuildArsenalCoastal
      };
    });

    expect(result.canBuildCathedralLowDevNoTech).toBe(false);
    expect(result.canBuildCathedralLowDevWithTech).toBe(false);
    expect(result.canBuildCathedralHighDevWithTech).toBe(true);
    expect(result.canBuildSecondCathedral).toBe(false);
    expect(result.canBuildArsenalInland).toBe(false);
    expect(result.canBuildArsenalCoastal).toBe(true);
  }
);

test('demographic and research bonuses from late-game buildings apply correctly',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const pid = s.player.provinceId || 'london';
      s.player.tier = 5;
      s.player.provs = [pid];
      s.buildings = s.buildings || {};
      s.buildings[pid] = [
        { s: 0, id: 'cathedral' },
        { s: 1, id: 'university' },
        { s: 2, id: 'hospital' },
        { s: 3, id: 'foundry' },
        { s: 4, id: 'windmill' }
      ];

      const bonusResearch = FB.buildingBonus(s, 'research');
      const bonusPiety = FB.buildingBonus(s, 'piety');
      const bonusRetinue = FB.buildingBonus(s, 'retinue');
      const bonusTax = FB.buildingBonus(s, 'tax');

      // Crisis protection from cathedral (15%) + hospital (10%), capped at 20% by countyBuildingCrisisProtection
      const crisisProt = FB.countyBuildingCrisisProtection ? FB.countyBuildingCrisisProtection(s, pid) : (FB.countyCrisisProtection ? FB.countyCrisisProtection(s, pid) : 0);
      // Famine protection from hospital (5%)
      const famineProt = FB.countyBuildingFamineProtection ? FB.countyBuildingFamineProtection(s, pid) : (FB.countyFamineProtection ? FB.countyFamineProtection(s, pid) : 0);

      return {
        bonusResearch: bonusResearch,
        bonusPiety: bonusPiety,
        bonusRetinue: bonusRetinue,
        bonusTax: bonusTax,
        crisisProt: Math.round(crisisProt * 100),
        famineProt: Math.round(famineProt * 100)
      };
    });

    // cathedral (+4 piety), university (+2 research), hospital (+1 piety), foundry (+30 ret, +3 tax), windmill (+2 tax)
    expect(result.bonusResearch).toBe(2);
    expect(result.bonusPiety).toBe(5);
    expect(result.bonusRetinue).toBe(30);
    expect(result.bonusTax).toBe(5);
    expect(result.crisisProt).toBe(20);
    expect(result.famineProt).toBe(5);
  }
);

test('late-game building reads reuse county aggregates and refresh after mutations',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const home = s.player.provinceId;
      const other = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== home;
      })[0].id;
      let idReads = 0;

      function watched(settlement, id) {
        const record = { s:settlement };
        Object.defineProperty(record, 'id', {
          configurable:true,
          enumerable:true,
          get:function () { idReads++; return id; }
        });
        return record;
      }

      s.player.tier = 6;
      s.player.provs = [home, other];
      s.dev[home] = 10;
      s.dev[other] = 10;
      s.buildings = {};
      s.buildings[home] = [watched(0, 'mill'), watched(1, 'market')];
      s.buildings[other] = [watched(0, 'foundry'), watched(1, 'granary')];
      const technology = FB.realmTechRecord(s);
      for (const id in FBDATA.buildings) {
        const requirement = FBDATA.buildings[id].requiresTech;
        if (requirement && technology.completed.indexOf(requirement) < 0) {
          technology.completed.push(requirement);
        }
      }

      const initial = {
        tax:FB.buildingBonus(s, 'tax'),
        upkeep:FB.buildingBonus(s, 'upkeep'),
        taxBuildings:Object.keys(FB.buildingBonusCounts(s, 'tax')).length,
        foundries:FB.buildingBonusCounts(s, 'retinue').foundry || 0,
        capacity:FB.countyBuildingCapacityBonus(s, home),
        standing:FB.standingBuildingCountIn(s, other),
        settlementTax:FB.countySettlementTax(s, home)
      };
      const readsAfterWarm = idReads;

      FB.buildingBonus(s, 'tax');
      FB.buildingBonus(s, 'upkeep');
      FB.buildingBonusCounts(s, 'tax');
      FB.buildingBonusCounts(s, 'retinue');
      FB.countyBuildingCapacityBonus(s, home);
      FB.standingBuildingCountIn(s, other);
      const readsAfterRepeat = idReads;

      const originalMarketCostQuote = FB.marketCostQuote;
      let marketQuoteCalls = 0;
      let openCount = 0;
      try {
        FB.marketCostQuote = function () {
          marketQuoteCalls++;
          return originalMarketCostQuote.apply(this, arguments);
        };
        openCount = FB.buildingOpenCount(s, home);
      } finally {
        FB.marketCostQuote = originalMarketCostQuote;
      }

      /* A direct append is detected by length for old mods and compatibility
         callers even without an explicit invalidation. */
      s.buildings[other].push(watched(2, 'windmill'));
      const taxAfterAppend = FB.buildingBonus(s, 'tax');

      /* Gameplay mutations invalidate same-length record changes explicitly. */
      const demolished = FB.demolishBuilding(s, home, 0, 'mill');
      const afterDemolition = {
        tax:FB.buildingBonus(s, 'tax'),
        millsStanding:FB.buildingCountIn(s, home, 'mill', false),
        millsEver:FB.buildingCountIn(s, home, 'mill', true),
        capacity:FB.countyBuildingCapacityBonus(s, home)
      };

      const settlements = FB.settlementsOf(s, home);
      const B = FBDATA.balance;
      const projectedSettlementTax = settlements.reduce(function (sum, settlement) {
        if (settlement.kind === 'city') return sum + B.settlementCityTax;
        if (settlement.kind === 'town') return sum + B.settlementTownTax;
        return sum + B.settlementVillageTax;
      }, 0);

      return {
        initial:initial,
        readsAfterWarm:readsAfterWarm,
        readsAfterRepeat:readsAfterRepeat,
        marketQuoteCalls:marketQuoteCalls,
        openCount:openCount,
        taxAfterAppend:taxAfterAppend,
        demolished:demolished,
        afterDemolition:afterDemolition,
        projectedSettlementTax:projectedSettlementTax
      };
    });

    expect(result.initial).toMatchObject({
      tax:8,
      upkeep:3,
      taxBuildings:3,
      foundries:1,
      capacity:0.05,
      standing:2
    });
    expect(result.initial.settlementTax).toBe(result.projectedSettlementTax);
    expect(result.readsAfterWarm).toBe(4);
    expect(result.readsAfterRepeat).toBe(result.readsAfterWarm);
    expect(result.openCount).toBeGreaterThan(0);
    expect(result.marketQuoteCalls).toBe(0);
    expect(result.taxAfterAppend).toBe(10);
    expect(result.demolished).toBe(true);
    expect(result.afterDemolition).toEqual({
      tax:8,
      millsStanding:0,
      millsEver:1,
      capacity:0
    });
  }
);
