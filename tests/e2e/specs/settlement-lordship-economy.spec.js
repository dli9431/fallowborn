'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/lordships.js', 'js/actions.js', 'js/world.js', 'js/treasury.js',
  'js/population.js', 'js/modifiers.js', 'js/fortifications.js', 'js/technology.js',
  'js/main.js', 'js/armies.js', 'js/ui_modals.js', 'js/ui_panels.js', 'data/map_data.js',
  'data/economy.js', 'data/technology.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.player.tier = 3;
    s.player.provs = [];
    s.player.gold = 10000;
    s.dev[pid] = 8;
    FB.rememberSettlementSites(s, pid);
    if (!FB.assignSettlementLordship(s, pid, 1, s.player.charId)) throw new Error('Fixture grant failed');
    FBDATA.buildings.lordship_test = { name:'Lordship test', icon:'X', cost:10,
      tax:5, upkeep:2, levy:20, populationCapacity:0.1, research:1, maxDemesne:1 };
    s.buildings[pid] = [{ s:0, id:'lordship_test' }];
    FB.invalidateBuildingIndex(s, pid);
  });
});

test('a landed baron can build only at their site and cannot take over the county fort', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    const cost = FB.buildCost(s, pid, 'lordship_test');
    const count = FB.settlementCountyHolder(s, pid);
    const context = FB.buildingContext(s, pid);
    const blocked = FB.build(s, pid, 0, 'lordship_test');
    const before = s.player.gold;
    const built = FB.build(s, pid, 1, 'lordship_test');
    const own = FB.buildingCount(s, 'lordship_test');
    const foreignDemolition = FB.demolishBuilding(s, pid, 0, 'lordship_test');
    s.buildings[pid].push({ s:1, id:'walls', level:1 });
    FB.invalidateBuildingIndex(s, pid);
    const fort = FB.demolishBuilding(s, pid, 1, 'walls');
    const ai = FB.aiCanBuildAt(s, count, pid, 1, 'mill');
    const demolished = FB.demolishBuilding(s, pid, 1, 'lordship_test');
    const repeatCost = FB.buildCost(s, pid, 'lordship_test');
    const rebuild = FB.canBuildAt(s, pid, 1, 'lordship_test');
    FB.revertSettlementLordship(s, pid, 1);
    const stale = FB.canBuildAt(s, pid, 1, 'mill', context);
    return { blocked:blocked, built:built, spent:before - s.player.gold, cost:cost,
      own:own, foreignDemolition:foreignDemolition, fort:fort, ai:ai,
      demolished:demolished, repeatCost:repeatCost, rebuild:rebuild, stale:stale };
  });
  expect(r.blocked).toBe(false); expect(r.built).toBe(true);
  expect(r.spent).toBe(r.cost); expect(r.own).toBe(1);
  expect(r.foreignDemolition).toBe(false); expect(r.fort).toBe(false);
  expect(r.ai).toBe(false); expect(r.demolished).toBe(true);
  expect(r.repeatCost).toBeGreaterThan(r.cost);
  expect(r.rebuild).toBe(false); expect(r.stale).toBe(false);
});

test('population shares conserve county tax and delegation pairs dues without duplicating upkeep or manpower', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    s.buildings[pid].push({ s:1, id:'lordship_test' });
    FB.invalidateBuildingIndex(s, pid);
    const count = FB.settlementCountyHolder(s, pid);
    const shares = FB.settlementPopulationShares(s, pid);
    let sum = 0;
    for (let i = 0; i < shares.length; i++) sum += FB.settlementTaxBase(s, pid, i);
    const local = FB.settlementFiscalProjection(s, pid, 1).amounts;
    const baron = FB.settlementActorFiscal(s, 'player');
    const before = FB.settlementActorFiscal(s, count);
    const snapshot = FB.treasurySnapshot(s).rows[count];
    const p = FB.playerTaxParts(s);
    const sources = FB.playerCompositionBreakdown(s).entries.filter(function (entry) {
      return entry.unit === 'levy' && ['county', 'building', 'popular_support',
        'domain_penalty', 'settlement_penalty', 'settlement_service'].indexOf(entry.kind) >= 0;
    });
    return { shares:shares.reduce(function (a, b) { return a + b; }, 0),
      sum:sum, county:FB.countyTaxBase(s, pid, FBDATA.balance.taxPerDev),
      duesOut:baron.duesOut, duesIn:before.duesIn, due:local.dues,
      upkeep:baron.upkeep, countUpkeep:before.upkeep,
      troops:local.availableLevy + local.levyDues, grossTroops:local.levy,
      musterSources:sources.reduce(function (sum, entry) { return sum + entry.amount; }, 0),
      retained:local.availableLevy, receivedTroops:before.levyIn, owedTroops:local.levyDues,
      credit:snapshot.duesIn, deduction:-p.liege, projected:local.net,
      shared:FB.buildingBonusIn(s, pid, 'populationCapacity'),
      personal:FB.buildingBonus(s, 'tax') };
  });
  expect(r.shares).toBeCloseTo(1, 12); expect(r.sum).toBeCloseTo(r.county, 8);
  expect(r.duesOut).toBeCloseTo(r.due, 8); expect(r.duesIn).toBeCloseTo(r.due, 8);
  expect(r.credit).toBeGreaterThanOrEqual(r.due); expect(r.deduction).toBeCloseTo(r.due, 8);
  expect(r.upkeep).toBe(2); expect(r.countUpkeep).toBeGreaterThanOrEqual(2);
  expect(r.troops).toBeCloseTo(r.grossTroops, 8);
  expect(r.musterSources).toBeCloseTo(r.retained, 8);
  expect(r.receivedTroops).toBeCloseTo(r.owedTroops, 8);
  expect(r.shared).toBeCloseTo(0.2, 8); expect(r.personal).toBe(5);
});

test('delegation keeps county physical limits and existing technology gates', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId;
    FBDATA.buildings.lordship_test.maxCounty = 1;
    const physical = FB.canBuildAt(s, pid, 1, 'lordship_test');
    delete FBDATA.buildings.lordship_test.maxCounty;
    const open = FB.canBuildAt(s, pid, 1, 'lordship_test');
    FBDATA.buildings.lordship_test.requiresTech = 'professional_bailiffs';
    const tech = FB.realmTechRecord(s);
    tech.completed = tech.completed.filter(function (id) { return id !== 'professional_bailiffs'; });
    const locked = FB.canBuildAt(s, pid, 1, 'lordship_test');
    tech.completed.push('professional_bailiffs');
    const unlocked = FB.canBuildAt(s, pid, 1, 'lordship_test');
    return { physical:physical, open:open, locked:locked, unlocked:unlocked };
  });
  expect(r).toEqual({ physical:false, open:true, locked:false, unlocked:true });
});

test('capacity applies softly, technology expands it, and delegation does not duplicate national research', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    me.skills.ste = 0; me.traits = [];
    for (let i = 2; i < FB.settlementVisibleCount(s, pid); i++) FB.assignSettlementLordship(s, pid, i, me.id);
    const originalBonus = FB.techBonus;
    FB.techBonus = function (state, key, rid) { return key === 'domain' ? 0 : originalBonus(state, key, rid); };
    const before = FB.settlementCapacityProjection(s);
    const fiscal = FB.settlementActorFiscal(s);
    FB.techBonus = function (state, key, rid) { return key === 'domain' ? 2 : originalBonus(state, key, rid); };
    const after = FB.settlementCapacityProjection(s);
    const improved = FB.settlementActorFiscal(s);
    FB.techBonus = originalBonus;
    const sovereign = FB.techRealmId(s);
    const researchBefore = FB.techResearchRate(s, sovereign);
    FB.revertSettlementLordship(s, pid, 1);
    const researchAfter = FB.techResearchRate(s, sovereign);
    return { before:before, after:after, income:fiscal.tax, improved:improved.tax,
      researchBefore:researchBefore, researchAfter:researchAfter,
      review:FBDATA.techImpactReviews.features.settlement_administration };
  });
  expect(r.before.limit).toBe(2); expect(r.after.limit).toBe(4);
  expect(r.after.directCount).toBe(r.before.directCount);
  expect(r.before.multiplier).toBeCloseTo(Math.pow(0.85, r.before.over), 10);
  expect(r.improved).toBeGreaterThanOrEqual(r.income);
  expect(r.researchAfter).toBe(r.researchBefore);
  expect(r.review.mode).toBe('soft');
  expect(r.review.tech).toEqual(['professional_bailiffs', 'royal_chancery']);
});

test('baron purses settle once, reserve obligations, and pay actual construction costs', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Fiscal Baron', born:s.date.year - 30,
      station:3, culture:me.culture, religion:me.religion, traits:[] });
    FB.assignSettlementLordship(s, pid, 1, baron.id);
    const p = FB.settlementFiscalProjection(s, pid, 1).amounts;
    const period = Math.floor(s.turn / 90) + 1;
    FB.settleBaronyAccounts(s, period);
    const first = FB.baronyAccount(s, baron.id).gold;
    FB.settleBaronyAccounts(s, period);
    const second = FB.baronyAccount(s, baron.id).gold;
    const refused = FB.buildBarony(s, baron.id, pid, 1, 'lordship_test');
    s.settlementLordships.accounts[baron.id].gold = 1000;
    const cost = FB.buildCost(s, pid, 'lordship_test', FB.settlementCountyHolder(s, pid));
    const built = FB.buildBarony(s, baron.id, pid, 1, 'lordship_test');
    return { first:first, second:second, expected:p.net, refused:refused, built:built,
      spent:1000 - FB.baronyAccount(s, baron.id).gold, cost:cost,
      unauthorized:FB.buildBarony(s, baron.id, pid, 0, 'mill') };
  });
  expect(r.first).toBeCloseTo(r.expected, 8); expect(r.second).toBe(r.first);
  expect(r.refused).toBe(false); expect(r.built).toBe(true);
  expect(r.spent).toBe(r.cost); expect(r.unauthorized).toBe(false);
});

test('mobile construction exposes only the granted site and preserves settlement return', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () { FB.ui.showSettlement(FB.state.player.provinceId, 1); });
  await expect(page.locator('.settlement-context')).toContainText('held by you');
  await expect(page.locator('#gm-raise')).toBeVisible();
  await page.locator('#gm-raise').click();
  await expect(page.locator('#gm-title')).toContainText('Raise a Building');
  await page.getByRole('button', { name:'Back', exact:true }).click();
  await expect(page.locator('#gm-raise')).toBeVisible();
  await page.evaluate(function () { FB.ui.showSettlement(FB.state.player.provinceId, 0); });
  await expect(page.locator('.settlement-context')).not.toContainText('held by you');
  await expect(page.locator('#gm-raise')).toHaveCount(0);
});

test('a count retains the strategic fort on a delegated settlement', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Fort Baron', station:3,
      born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
    s.player.tier = 4; s.player.provs = [pid];
    s.owner[pid] = 'player'; s.holder[pid] = 'player';
    FB.foundPlayerRealm(s);
    FB.assignSettlementLordship(s, pid, 1, baron.id);
    s.buildings[pid] = [{ s:1, id:'walls', level:1 }, { s:1, id:'lordship_test' }];
    FB.invalidateBuildingIndex(s, pid); FB.invalidateFortIndex();
    const fortCount = FB.hasBuilding(s, 'walls');
    const upkeep = FB.fortUpkeep(s);
    const ordinary = FB.demolishBuilding(s, pid, 1, 'lordship_test');
    const strategic = FB.demolishBuilding(s, pid, 1, 'walls');
    return { fortCount:fortCount, upkeep:upkeep, ordinary:ordinary, strategic:strategic,
      holder:FB.settlementHolder(s, pid, 1).id, expected:baron.id };
  });
  expect(r.fortCount).toBe(true); expect(r.upkeep).toBeGreaterThan(0);
  expect(r.ordinary).toBe(false); expect(r.strategic).toBe(true);
  expect(r.holder).toBe(r.expected);
});

test('seasonal treasury settlement credits barons and counts once', async function ({ page }) {
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Season Baron', station:3,
      born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
    FB.assignSettlementLordship(s, pid, 1, baron.id);
    const count = FB.settlementCountyHolder(s, pid);
    const fiscal = FB.treasurySnapshot(s).rows[count];
    const expected = FB.settlementFiscalProjection(s, pid, 1).amounts.net;
    const gold = s.realms[count].treasury.gold;
    s.realms[count].treasury.militaryAccrued = 0;
    s.turn += 90;
    FB.treasurySeason(s);
    const first = FB.baronyAccount(s, baron.id).gold;
    const countGold = s.realms[count].treasury.gold;
    FB.treasurySeason(s);
    return { first:first, expected:expected, second:FB.baronyAccount(s, baron.id).gold,
      countChange:countGold - gold,
      expectedCount:fiscal.income + fiscal.duesIn - fiscal.duesOut - fiscal.upkeep - fiscal.government,
      countStable:countGold === s.realms[count].treasury.gold };
  });
  expect(r.first).toBeCloseTo(r.expected, 8); expect(r.second).toBe(r.first);
  expect(r.countChange).toBeCloseTo(r.expectedCount, 8); expect(r.countStable).toBe(true);
});


test('county and baron accounting share one quote without changing income', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, me = s.chars[s.player.charId];
    const baron = FB.makeCharacter(s, { name:'Shared Quote Baron', station:3,
      born:s.date.year - 30, culture:me.culture, religion:me.religion, traits:[] });
    FB.assignSettlementLordship(s, pid, 1, baron.id);
    const expected = FB.settlementActorFiscal(s, { kind:'character', id:baron.id });
    const original = FB.settlementFiscalProjection;
    let quotes = 0;
    FB.settlementFiscalProjection = function (state, county, slot, context) {
      if (county === pid && slot === 1) quotes++;
      return original.apply(FB, arguments);
    };
    const context = {}, period = 100000;
    try {
      FB.treasurySnapshot(s, context);
      FB.settleBaronyAccounts(s, period, context);
      const gold = FB.baronyAccount(s, baron.id).gold;
      FB.settleBaronyAccounts(s, period, context);
      return { quotes:quotes, gold:gold, stable:FB.baronyAccount(s, baron.id).gold === gold,
        expected:expected.tax + expected.tolls + expected.national - expected.upkeep - expected.duesOut };
    } finally { FB.settlementFiscalProjection = original; }
  });
  expect(result.quotes).toBe(1);
  expect(result.gold).toBeCloseTo(result.expected, 8);
  expect(result.stable).toBe(true);
});
