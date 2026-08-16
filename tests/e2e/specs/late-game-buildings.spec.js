'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
} = require('../support/game');

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
    expect(result.techCount).toBe(186);

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
      const pid = s.player.provs[0];
      s.player.tier = 5; // King/Duke level tier for deeds
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
      const pid = s.player.provs[0];
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

      // Crisis protection from cathedral (15%) + hospital (10%)
      const crisisProt = FB.countyCrisisProtection ? FB.countyCrisisProtection(s, pid) : 0;
      // Famine protection from hospital (5%)
      const famineProt = FB.countyFamineProtection ? FB.countyFamineProtection(s, pid) : 0;

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
    expect(result.crisisProt).toBe(25);
    expect(result.famineProt).toBe(5);
  }
);
