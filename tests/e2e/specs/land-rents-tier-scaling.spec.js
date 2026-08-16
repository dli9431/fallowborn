const { test, expect } = require('@playwright/test');

test.describe('Dynamic Land Rents, Feudal Tier Progression & AI Building Construction', () => {
  test('Baron seat baseline vs Count starting county land rents progression', async ({ page }) => {
    await page.goto('index.html');
    await page.waitForFunction(() => window.FB && window.FB.playerTaxParts && window.FB.countySettlementTax);

    const rentComparison = await page.evaluate(() => {
      // 1. Baron (Tier 3) state with no held counties
      const stateBaron = {
        turn: 1,
        date: { year: 867 },
        player: {
          charId: 'p1',
          tier: 3,
          provinceId: 'york',
          provs: [],
          liege: 'northumbria'
        },
        chars: { p1: { id: 'p1', traits: [] } },
        dev: { york: 4 },
        realms: {
          northumbria: { id: 'northumbria', alive: true, rank: 2 },
          player: { id: 'player', alive: true, liege: 'northumbria' }
        },
        buildings: { york: [] }
      };

      const baronTax = FB.playerTaxParts(stateBaron);

      // 2. Count (Tier 4) state holding York directly
      const stateCount = {
        turn: 1,
        date: { year: 867 },
        player: {
          charId: 'p1',
          tier: 4,
          provinceId: 'york',
          provs: ['york'],
          liege: 'northumbria'
        },
        chars: { p1: { id: 'p1', traits: [] } },
        dev: { york: 4 },
        realms: {
          northumbria: { id: 'northumbria', alive: true, rank: 2 },
          player: { id: 'player', alive: true, liege: 'northumbria' }
        },
        buildings: { york: [] }
      };

      const countTax = FB.playerTaxParts(stateCount);
      const yorkSettlementTax = FB.countySettlementTax(stateCount, 'york');

      return {
        baronRentBase: baronTax.rentBase,
        countRentBase: countTax.rentBase,
        yorkSettlementTax,
        isCountHigher: countTax.rentBase > baronTax.rentBase
      };
    });

    expect(rentComparison.baronRentBase).toBe(6);
    expect(rentComparison.isCountHigher).toBe(true);
    expect(rentComparison.countRentBase).toBeGreaterThanOrEqual(9.0);
  });

  test('Settlement building construction unlocks development and raises land rents', async ({ page }) => {
    await page.goto('index.html');
    await page.waitForFunction(() => window.FB && window.FB.playerTaxParts);

    const progression = await page.evaluate(() => {
      const state = {
        turn: 1,
        date: { year: 867 },
        player: {
          charId: 'p1',
          tier: 4,
          provinceId: 'york',
          provs: ['york'],
          gold: 200,
          flags: {}
        },
        chars: { p1: { id: 'p1', traits: [] } },
        dev: { york: 4 },
        realms: {
          player: { id: 'player', alive: true, liege: null }
        },
        buildings: { york: [] },
        tech: { player: { undershot_watermill: 1 } }
      };

      const taxBefore = FB.playerTaxParts(state).rentBase;

      // Raise a Watermill in settlement 0 (+1 dev, +2 tax)
      const built = FB.build(state, 'york', 0, 'mill');
      const devAfter = state.dev.york;
      const taxAfter = FB.playerTaxParts(state).rentBase;

      return {
        built,
        devBefore: 4,
        devAfter,
        taxBefore,
        taxAfter
      };
    });

    expect(progression.built).toBe(true);
    expect(progression.devAfter).toBe(5);
    expect(progression.taxAfter).toBeGreaterThan(progression.taxBefore);
  });

  test('Duke and King demesne rents and vassal charter dues scale comfortably', async ({ page }) => {
    await page.goto('index.html');
    await page.waitForFunction(() => window.FB && window.FB.playerTaxParts && window.FB.vassalTaxContribution);

    const feudalData = await page.evaluate(() => {
      // Duke holding 2 counties and 2 vassal counts
      const stateDuke = {
        turn: 1,
        date: { year: 867 },
        player: {
          charId: 'p1',
          tier: 5,
          provinceId: 'york',
          provs: ['york', 'durham'],
          liege: null
        },
        chars: { p1: { id: 'p1', traits: [] } },
        dev: { york: 4, durham: 3, lancaster: 3, chester: 3 },
        holder: { york: 'player', durham: 'player', lancaster: 'vassal1', chester: 'vassal2' },
        owner: { york: 'player', durham: 'player', lancaster: 'player', chester: 'player' },
        realms: {
          player: { id: 'player', alive: true, rank: 2 },
          vassal1: { id: 'vassal1', alive: true, liege: 'player', rank: 1 },
          vassal2: { id: 'vassal2', alive: true, liege: 'player', rank: 1 }
        },
        buildings: { york: [], durham: [], lancaster: [], chester: [] }
      };

      const dukeParts = FB.playerTaxParts(stateDuke);

      return {
        dukeRents: dukeParts.rents,
        dukeVassalDues: dukeParts.dues,
        dukeTaxable: dukeParts.taxable
      };
    });

    expect(feudalData.dukeRents).toBeGreaterThanOrEqual(15.0);
    expect(feudalData.dukeVassalDues).toBeGreaterThan(0);
    expect(feudalData.dukeTaxable).toBeGreaterThanOrEqual(20.0);
  });

  test('AI Building Construction Planner places tangible infrastructure during peace', async ({ page }) => {
    await page.goto('index.html');
    await page.waitForFunction(() => window.FB && window.FB.aiBuildingsYear);

    const aiResults = await page.evaluate(() => {
      const state = {
        turn: 360,
        date: { year: 868 },
        dev: {
          wessex_seat: 3,
          mercia_seat: 3
        },
        owner: { wessex_seat: 'wessex', mercia_seat: 'mercia' },
        holder: { wessex_seat: 'wessex', mercia_seat: 'mercia' },
        realms: {
          wessex: { id: 'wessex', alive: true, capital: 'wessex_seat', rank: 3 },
          mercia: { id: 'mercia', alive: true, capital: 'mercia_seat', rank: 3 }
        },
        buildings: {
          wessex_seat: [],
          mercia_seat: []
        },
        armies: [],
        tech: {
          wessex: { undershot_watermill: 1 },
          mercia: { undershot_watermill: 1 }
        }
      };

      const devBeforeWessex = state.dev.wessex_seat;
      FB.aiBuildingsYear(state);
      const devAfterWessex = state.dev.wessex_seat;
      const bldgsWessex = state.buildings.wessex_seat;

      return {
        devBeforeWessex,
        devAfterWessex,
        bldgsCount: bldgsWessex.length,
        firstBuildingId: bldgsWessex[0] ? bldgsWessex[0].id : null
      };
    });

    expect(aiResults.bldgsCount).toBeGreaterThanOrEqual(1);
    expect(aiResults.firstBuildingId).toBe('mill');
    expect(aiResults.devAfterWessex).toBe(aiResults.devBeforeWessex + 1);
  });
});
