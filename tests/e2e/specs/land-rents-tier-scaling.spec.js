'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js', 'js/economy.js', 'js/population.js', 'js/settlement.js',
  'js/lordships.js', 'js/treasury.js', 'js/world.js', 'js/technology.js',
  'js/modifiers.js', 'data/map_data.js', 'data/technology.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test.describe('Dynamic Land Rents, Feudal Tier Progression & AI Building Construction', function () {
  test('a hereditary barony earns settlement rents while a Count holds the county directly', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = 'york';
      p.tier = 3;
      p.provs = [];
      p.provinceId = pid;
      p.liege = FB.settlementCountyHolder(s, pid);
      s.dev[pid] = 4;
      const granted = FB.assignSettlementLordship(s, pid, 1, p.charId);
      if (!granted) throw new Error('Fixture barony grant failed');
      const baron = FB.playerTaxParts(s);
      const baronSites = FB.directSettlements(s);
      const baronFiscal = FB.settlementFiscalProjection(s, pid, 1).amounts;

      FB.revertSettlementLordship(s, pid, 1);
      p.tier = 4;
      p.provs = [pid];
      p.liege = null;
      FB.foundPlayerRealm(s);
      const count = FB.playerTaxParts(s);
      return { baron:baron, count:count, baronSites:baronSites,
        baronFiscal:baronFiscal, countSites:FB.directSettlements(s).length };
    });

    expect(result.baronSites).toEqual([{ provinceId:'york', settlement:1 }]);
    expect(result.baron.rentBase).toBeGreaterThan(0);
    expect(result.baron.rentBase).toBeCloseTo(result.baronFiscal.tax, 8);
    expect(result.baron.settlementDues).toBeCloseTo(result.baronFiscal.dues, 8);
    expect(result.countSites).toBeGreaterThan(result.baronSites.length);
    expect(result.count.rentBase).toBeGreaterThan(result.baron.rentBase);
    expect(result.count.settlementDues).toBe(0);
  });

  test('settlement construction raises development, land rents, and local tolls', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player, pid = 'york';
      p.tier = 4;
      p.provinceId = pid;
      p.provs = [pid];
      p.liege = null;
      p.gold = 10000;
      s.dev[pid] = 4;
      s.buildings[pid] = [];
      FB.foundPlayerRealm(s);
      const tech = FB.realmTechRecord(s, 'player');
      if (tech.completed.indexOf('undershot_watermill') < 0) tech.completed.push('undershot_watermill');
      FB.invalidateBuildingIndex(s, pid);
      const before = FB.playerTaxParts(s);
      const sitesBefore = FB.settlementVisibleCount(s, pid);
      const cost = FB.buildCost(s, pid, 'mill');
      const gold = p.gold;
      const built = FB.build(s, pid, 0, 'mill');
      return { built:built, dev:s.dev[pid], before:before, after:FB.playerTaxParts(s),
        spent:gold - p.gold, cost:cost, sitesBefore:sitesBefore,
        sitesAfter:FB.settlementVisibleCount(s, pid) };
    });

    expect(result.built).toBe(true);
    expect(result.dev).toBe(5);
    expect(result.spent).toBeCloseTo(result.cost, 8);
    expect(result.after.rentBase).toBeGreaterThan(result.before.rentBase);
    expect(result.after.tolls).toBeGreaterThan(result.before.tolls);
    // Development unlocks capacity; establishing a new site requires a charter.
    expect(result.sitesAfter).toBe(result.sitesBefore);
  });

  test('Duke and King income combines direct rents with charter dues from vassals', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, p = s.player;
      p.tier = 5;
      p.provinceId = 'york';
      p.provs = ['york', 'durham', 'lancaster', 'chester'];
      p.liege = null;
      p.provs.forEach(function (pid) {
        s.dev[pid] = 4;
        s.buildings[pid] = [];
        FB.invalidateBuildingIndex(s, pid);
      });
      FB.foundPlayerRealm(s);
      if (!FB.grantCounty(s, 'lancaster') || !FB.grantCounty(s, 'chester')) {
        throw new Error('Fixture vassal grant failed');
      }
      return [5, 6].map(function (tier) {
        p.tier = tier;
        FB.foundPlayerRealm(s);
        const parts = FB.playerTaxParts(s);
        const fiscal = FB.settlementActorFiscal(s, 'player');
        const dues = FB.playerVassals(s).reduce(function (sum, rid) {
          return sum + FB.vassalTaxContribution(s, rid);
        }, fiscal.duesIn);
        return { parts:parts, directTax:fiscal.tax, dues:dues,
          vassals:FB.playerVassals(s).length };
      });
    });

    for (const row of result) {
      expect(row.vassals).toBeGreaterThanOrEqual(2);
      expect(row.parts.rents).toBeGreaterThan(0);
      expect(row.parts.rentBase).toBeCloseTo(row.directTax, 8);
      expect(row.parts.dues).toBeGreaterThan(0);
      expect(row.parts.dues).toBeCloseTo(row.dues, 8);
      expect(row.parts.taxable).toBeCloseTo(row.parts.rents + row.parts.tolls, 8);
    }
  });

  test('AI construction spends available treasury on tangible infrastructure during peace', async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state, rid = 'wessex', pid = 'winchester';
      s.turn = 360;
      s.date.year = 868;
      s.owner[pid] = rid;
      s.holder[pid] = rid;
      s.realms[rid].capital = pid;
      s.realms[rid].liege = null;
      s.realms[rid].war = null;
      s.dev[pid] = 3;
      s.buildings[pid] = [];
      s.armies = [];
      s.greatHolyWar = null;
      FB.invalidateBuildingIndex(s, pid);
      FB.invalidateRealmCache();
      const tech = FB.realmTechRecord(s, rid);
      if (tech.completed.indexOf('undershot_watermill') < 0) tech.completed.push('undershot_watermill');
      FB.treasuryInitialize(s);
      const treasury = s.realms[rid].treasury;
      treasury.gold = 100000;
      treasury.militaryAccrued = 0;
      const before = treasury.gold;
      const cost = FB.buildCost(s, pid, 'mill', rid);
      FB.aiBuildingsYear(s);
      return { buildings:s.buildings[pid], dev:s.dev[pid], cost:cost,
        spent:before - treasury.gold, mode:s.treasuryAccounting.mode };
    });

    expect(result.mode).toBe('active');
    expect(result.buildings).toHaveLength(1);
    expect(result.buildings[0].id).toBe('mill');
    expect(result.dev).toBe(4);
    expect(result.spent).toBeCloseTo(result.cost, 8);
  });
});
