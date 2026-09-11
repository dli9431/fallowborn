'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/treasury.js', 'js/armies.js', 'js/actions.js', 'js/main.js', 'js/world.js',
  'js/save.js', 'js/modifiers.js', 'js/logistics.js', 'js/market.js', 'js/economy.js',
  'js/technology.js', 'js/fortifications.js', 'data/economy.js', 'data/markets.js', 'data/map_data.js', 'data/modifiers.js', 'data/technology.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    window.budgetIds = ids;
    FB.treasuryInitialize(FB.state);
    FB.state.treasuryAccounting.lastMilitaryTurn = FB.state.turn - 1;
  }, ids);
}

test('government costs scale by receipts and direct obligations, excluding commoner income and savings', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state;
    const small = FB.governmentCostParts(100, 2, 0, 4);
    const imperial = FB.governmentCostParts(1000, 4, 2, 7);
    const zero = FB.governmentCostParts(0, 100, 20, 7);
    const commoner = FB.governmentCostParts(10000, 2, 0, 2);
    const before = FB.playerGovernmentCosts(s);
    s.player.gold += 1000000;
    const after = FB.playerGovernmentCosts(s);
    s.player.tier = 2;
    return { small:small, imperial:imperial, zero:zero.total, commoner:commoner.total,
      before:before, after:after, untitled:FB.playerGovernmentCosts(s).total };
  });
  expect(r.small).toEqual({ revenue:100, administration:51, court:12, total:63 });
  expect(r.imperial).toEqual({ revenue:1000, administration:503, court:116, total:619 });
  expect(r.zero).toBe(0); expect(r.commoner).toBe(0); expect(r.untitled).toBe(0);
  expect(r.after).toEqual(r.before);
});

test('AI and player quotes share equivalent receipts, rank and immediate obligations', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = budgetIds.enemy;
    const row = FB.treasurySnapshot(s).rows[rid];
    const tax = FB.playerTax, vassals = FB.playerVassals;
    try {
      s.player.tier = s.realms[rid].rank + 3;
      s.player.provs = row.countyIds.slice();
      FB.playerTax = function () { return row.income + row.duesIn - row.duesOut; };
      FB.playerVassals = function () { return new Array(row.vassals); };
      const quote = FB.playerGovernmentCosts(s);
      return { player:quote.total, ai:row.government, administration:quote.administration,
        aiAdministration:row.administration, court:quote.court, aiCourt:row.court };
    } finally { FB.playerTax = tax; FB.playerVassals = vassals; }
  });
  expect(r.player).toBe(r.ai); expect(r.administration).toBe(r.aiAdministration); expect(r.court).toBe(r.aiCourt);
});

test('government expenses flow into reliable income and its displayed ledger', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, original = FB.playerGovernmentCosts;
    const costs = original(s);
    const charged = FB.reliableGoldIncome(s);
    const lines = FB.incomeBreakdown(s).gold.lines;
    try {
      FB.playerGovernmentCosts = function () { return { total:0, administration:0, court:0 }; };
      return { difference:FB.reliableGoldIncome(s) - charged, expected:costs.total,
        labels:lines.map(function (line) { return line.label; }) };
    } finally { FB.playerGovernmentCosts = original; }
  });
  expect(r.difference).toBeCloseTo(r.expected, 8);
  expect(r.labels).toContain('Government administration');
  expect(r.labels).toContain('Official court expenses');
});

test('field costs follow days and each detachment market, survive disbanding and never replay on load', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, price = FB.marketPrice;
    const base = FB.playerHost(s);
    base.at = budgetIds.home; base.units = { levy:1000 }; base.men = base.size = 1000;
    const other = Object.assign({}, base, { id:'budget-detachment', at:budgetIds.second });
    s.armies = [base, other];
    const gold = s.player.gold;
    FB.marketPrice = function (state, pid) { return pid === budgetIds.second ? 2 : 1; };
    try {
      const forecast = FB.playerHostUpkeepParts(s).total;
      for (let day = 0; day < 30; day++) {
        s.turn++;
        const batch = FB.treasuryMilitaryBatch(s);
        for (const host of s.armies) FB.treasuryAccrueHost(s, host, batch);
        FB.treasuryCommitMilitary(s, batch);
        FB.treasuryCommitMilitary(s, batch);
      }
      const paid = gold - s.player.gold;
      const accrued = s.treasuryAccounting.playerMilitary;
      s.armies = [];
      const none = FB.playerHostUpkeepParts(s).total;
      const clone = JSON.parse(JSON.stringify(s));
      FB.treasuryInitialize(clone);
      return { forecast:forecast, paid:paid, accrued:accrued, none:none,
        balance:clone.player.gold, expectedBalance:s.player.gold,
        replay:FB.treasuryMilitaryBatch(clone), carried:clone.treasuryAccounting.playerMilitary };
    } finally { FB.marketPrice = price; }
  });
  expect(r.forecast).toBeCloseTo(19.35, 8);
  expect(r.paid).toBeCloseTo(r.forecast / 3, 8);
  expect(r.accrued).toBeCloseTo(r.paid, 8); expect(r.carried).toBe(r.accrued);
  expect(r.none).toBe(0); expect(r.balance).toBe(r.expectedBalance); expect(r.replay).toBeNull();
});

test('field quotation excludes food and preserves contracts while campaign modifiers apply to participating hosts', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, price = FB.marketPrice, campaign = FB.campaignHostModBonus;
    const host = FB.playerHost(s);
    host.units = { levy:1000, mercs:150 }; host.men = host.size = 1150;
    host.warId = 'holy';
    FB.marketPrice = function (state, pid, good) { return good === 'provisions' ? 500 : 1; };
    FB.campaignHostModBonus = function () { return -0.2; };
    try {
      const holy = FB.hostFieldUpkeepParts(s, host);
      const ordinary = FB.hostFieldUpkeepParts(s, Object.assign({}, host, { warId:'ordinary' }));
      const ai = FB.hostFieldUpkeepParts(s, Object.assign({}, host, { realm:budgetIds.enemy }));
      return { holy:holy.total, ordinary:ordinary.total, ai:ai.total, contract:holy.mercenaries };
    } finally { FB.marketPrice = price; FB.campaignHostModBonus = campaign; }
  });
  expect(r.contract).toBe(4); expect(r.ordinary).toBeCloseTo(10.45, 8);
  expect(r.holy).toBeCloseTo(6.45 * 0.8 + 4, 8); expect(r.ai).toBe(r.ordinary);
});

test('distributions recheck cash and counties, grant one temporary benefit, and retain cooldown through save repair', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state;
    const q = FB.publicDistributionQuote(s, 'player');
    const support = FB.countyPopularSupport(s, budgetIds.home);
    s.player.gold = q.minimum - 1;
    const refused = FB.publicDistribution(s, 'player', q.minimum);
    s.player.gold = 10000;
    const gold = s.player.gold;
    const paid = FB.publicDistribution(s, 'player', q.minimum);
    const repeat = FB.publicDistribution(s, 'player', q.minimum * 4);
    const boosted = FB.countyPopularSupport(s, budgetIds.home) - support;
    const clone = JSON.parse(JSON.stringify(s));
    FB.treasuryInitialize(clone);
    const cooldown = FB.publicDistributionQuote(clone, 'player').nextTurn;
    const before = clone.player.gold;
    const replay = FB.publicDistribution(clone, 'player', q.minimum);
    s.turn += 360;
    FB.modifierTick(s);
    return { refused:refused, paid:paid, repeat:repeat, boosted:boosted,
      spent:gold - s.player.gold, expected:q.minimum, cooldown:cooldown,
      next:s.player.distributionNextTurn, replay:replay, retained:clone.player.gold === before,
      expired:!FB.hasModifier(s, 'public_distribution', budgetIds.home),
      review:FBDATA.techImpactReviews.features.public_distributions.mode,
      validation:FB.validateTechnologyData() };
  });
  expect(r.refused).toBe(false); expect(r.paid).toBe(true); expect(r.repeat).toBe(false);
  expect(r.boosted).toBe(5); expect(r.spent).toBeCloseTo(r.expected, 8);
  expect(r.cooldown).toBe(r.next); expect(r.replay).toBe(false); expect(r.retained).toBe(true);
  expect(r.expired).toBe(true); expect(r.review).toBe('none'); expect(r.validation).toEqual([]);
});

test('AI spends only excess reserves and leaves player savings voluntary', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = budgetIds.enemy, row = s.realms[rid].treasury;
    s.armies = [];
    row.gold = 1000000; row.militaryAccrued = 0; delete row.recoverUntil;
    const reserve = FB.treasuryConstructionReserves(s)[rid];
    const player = s.player.gold = 1000000;
    FB.treasurySurplusYear(s);
    const first = row.gold;
    FB.treasurySurplusYear(s);
    const repeated = row.gold;
    s.turn += 360; row.gold = reserve; row.distributionNextTurn = 0;
    FB.treasurySurplusYear(s);
    const protectedGold = row.gold;
    row.gold = 1000000; row.recoverUntil = s.turn + 90;
    FB.treasurySurplusYear(s);
    return { first:first, expected:1000000 - (1000000 - reserve) * 0.1,
      repeated:repeated, protectedGold:protectedGold, reserve:reserve, recovery:row.gold,
      playerUnchanged:s.player.gold === player };
  });
  expect(r.first).toBeCloseTo(r.expected, 8); expect(r.repeated).toBe(r.first);
  expect(r.protectedGold).toBe(r.reserve); expect(r.recovery).toBe(1000000); expect(r.playerUnchanged).toBe(true);
});

test('steady annual AI surplus converges while player savings have no cap', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = budgetIds.enemy, row = s.realms[rid].treasury;
    const snapshot = FB.treasurySnapshot, modifiers = FB.addModifier;
    s.armies = []; row.gold = 1000000; row.militaryAccrued = 0; delete row.recoverUntil;
    const fiscal = { income:1000, duesIn:0, duesOut:0, upkeep:50, counties:1, vassals:0,
      government:650, countyIds:[s.realms[rid].capital] };
    const rows = {}; rows[rid] = fiscal;
    FB.treasurySnapshot = function () { return { rows:rows }; };
    // Hold county output constant: this test isolates the reserve policy, not demographic growth.
    FB.addModifier = function () {};
    try {
      for (let year = 0; year < 100; year++) {
        s.turn += 360;
        row.gold += 1200;
        s.player.gold += 1200;
        FB.treasurySurplusYear(s);
      }
      return { ai:row.gold, target:7000 + 10800, player:s.player.gold };
    } finally { FB.treasurySnapshot = snapshot; FB.addModifier = modifiers; }
  });
  expect(Math.abs(r.ai - r.target)).toBeLessThan(30);
  expect(r.player).toBeGreaterThan(120000);
});

test('seasonal player settlement charges government once and does not charge disbanded field hosts again', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state;
    s.player.war = null; s.armies = []; s.eventQueue = []; s.slotDays = [];
    s.player.gold = 10000; s.player.focus = null;
    s.turn = 179; s.date.day = 90; s.date.season = 1;
    FB.game.auto.build = false;
    FB.treasuryInitialize(s);
    const saved = JSON.parse(FB.save.serialize());
    const government = FB.playerGovernmentCosts, picker = FB.pickDailyEvents;
    FB.pickDailyEvents = function () { return []; };
    function settle(cost) {
      FB.playerGovernmentCosts = government;
      FB.save.restore(JSON.parse(JSON.stringify(saved)));
      FB.playerGovernmentCosts = function () { return { administration:cost, court:0, total:cost }; };
      const outcome = FB.game.passDay({ deferUi:true });
      return { outcome:outcome, gold:FB.state.player.gold, turn:FB.state.turn };
    }
    try {
      const free = settle(0), charged = settle(37);
      return { free:free, charged:charged, difference:free.gold - charged.gold };
    } finally { FB.playerGovernmentCosts = government; FB.pickDailyEvents = picker; }
  });
  expect(r.free.outcome).toBe('season'); expect(r.charged.outcome).toBe('season');
  expect(r.free.turn).toBe(180); expect(r.charged.turn).toBe(180);
  expect(r.difference).toBeCloseTo(37, 8);
});

test('public distributions revalidate territorial loss and keep the minimum spend bounded', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 100000;
    const q = FB.publicDistributionQuote(s, 'player');
    s.player.provs = [];
    const paid = FB.publicDistribution(s, 'player', q.minimum);
    return { paid:paid, gold:s.player.gold, eligible:FB.publicDistributionQuote(s, 'player').eligible,
      invalid:FB.publicDistribution(s, 'missing-realm', 100) };
  });
  expect(r).toEqual({ paid:false, gold:100000, eligible:false, invalid:false });
});

test('legacy migration starts player daily billing now without rebasing AI wealth or accrued debt', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, row = s.realms[budgetIds.enemy].treasury;
    row.gold = 1000000; row.militaryAccrued = 19;
    delete s.treasuryAccounting.playerFieldVersion;
    delete s.treasuryAccounting.playerMilitary;
    delete s.treasuryAccounting.playerMilitaryLast;
    s.treasuryAccounting.lastMilitaryTurn = s.turn - 10;
    FB.treasuryInitialize(s);
    const first = JSON.stringify(s.treasuryAccounting);
    FB.treasuryInitialize(s);
    return { gold:row.gold, accrued:row.militaryAccrued, current:s.treasuryAccounting.playerMilitary,
      last:s.treasuryAccounting.playerMilitaryLast, version:s.treasuryAccounting.playerFieldVersion,
      stamp:s.treasuryAccounting.lastMilitaryTurn, turn:s.turn,
      stable:first === JSON.stringify(s.treasuryAccounting) };
  });
  expect(r.gold).toBe(1000000); expect(r.accrued).toBe(19);
  expect(r.current).toBe(0); expect(r.last).toBe(0); expect(r.version).toBe(1);
  expect(r.stamp).toBe(r.turn); expect(r.stable).toBe(true);
});
