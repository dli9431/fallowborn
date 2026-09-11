'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/treasury.js', 'js/armies.js', 'js/actions.js', 'js/economy.js',
  'js/main.js', 'js/save.js', 'js/model.js', 'js/world.js', 'js/rebellions.js',
  'js/modifiers.js', 'js/fortifications.js', 'js/technology.js', 'js/logistics.js', 'js/market.js',
  'data/map_data.js', 'data/technology.js', 'data/units.js', 'data/markets.js', 'data/economy.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    window.fiscalIds = ids;
    const s = FB.state;
    // The shared journey may add realms after boot; initialize them explicitly.
    FB.treasuryInitialize(s);
    s.treasuryAccounting.lastMilitaryTurn = s.turn - 1;
  }, ids);
}

test('optional spending protects reserves while food may use them', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = fiscalIds.enemy, a = s.realms[rid].treasury;
    a.gold = 100; a.militaryAccrued = 10;
    const refused = FB.treasurySpendOptional(s, rid, 51, 40);
    const unchanged = a.gold;
    const paid = FB.treasurySpendOptional(s, rid, 50, 40);
    const food = FB.treasurySpend(s, rid, 30);
    return { refused:refused, unchanged:unchanged, paid:paid, food:food, gold:a.gold, accrued:a.militaryAccrued };
  });
  expect(r).toEqual({ refused:false, unchanged:100, paid:true, food:true, gold:20, accrued:10 });
});

test('construction reserve projection preserves balances and counts fiscal inputs once', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = fiscalIds.enemy, saved = FB.treasurySnapshot;
    const before = JSON.stringify(s.realms[rid].treasury);
    let calls = 0;
    s.armies = [];
    try {
      FB.treasurySnapshot = function () {
        calls++; const rows = {}; rows[rid] = { upkeep:12, duesOut:8, income:999 };
        return { rows:rows };
      };
      const reserves = FB.treasuryConstructionReserves(s);
      return { reserve:reserves[rid], calls:calls, unchanged:JSON.stringify(s.realms[rid].treasury) === before };
    } finally { FB.treasurySnapshot = saved; }
  });
  expect(r).toEqual({ reserve:20, calls:1, unchanged:true });
});

test('AI building quotes exclude household discounts and use realm technology', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = fiscalIds.enemy, pid = s.realms[rid].capital;
    const original = FB.techCostFactor, council = FB.councilBonus;
    const market = FB.marketCostQuote, modifier = FB.modBonus, copies = FB.buildingCountIn;
    try {
      FB.techCostFactor = function (state, kind, realm) { return realm === rid ? 0.8 : 1; };
      FB.councilBonus = function () { return 0.2; };
      FB.modBonus = function () { return 0; };
      FB.buildingCountIn = function () { return 1; };
      FB.marketCostQuote = function (state, cost) { return cost; };
      s.player.flags.mason_visit = true;
      const base = FBDATA.buildings.mill.cost * (FBDATA.balance.buildingRepeatCostGrowth || 1.5);
      return { ai:FB.buildCost(s, pid, 'mill', rid) / base, player:FB.buildCost(s, pid, 'mill') / base };
    } finally {
      FB.techCostFactor = original; FB.councilBonus = council; FB.marketCostQuote = market;
      FB.modBonus = modifier; FB.buildingCountIn = copies;
    }
  });
  expect(r.ai).toBeCloseTo(0.8, 10); expect(r.player).toBeCloseTo(0.6, 10);
});

test('annual builder charges an affordable candidate once and skips an exhausted treasury', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = fiscalIds.enemy, pid = s.realms[rid].capital;
    const names = ['treasuryConstructionReserves', 'realmHeldCounties', 'settlementsOf', 'builtIn',
      'techRequirementMet', 'buildCost', 'playerDirectlyHoldsCounty'];
    const saved = {}; names.forEach(function (name) { saved[name] = FB[name]; });
    const gold = 100, a = s.realms[rid].treasury;
    try {
      a.gold = gold; a.militaryAccrued = 0;
      s.armies = []; s.greatHolyWar = null; s.dev[pid] = 3; s.buildings[pid] = [];
      FB.treasuryConstructionReserves = function () { const out = {}; out[rid] = 20; return out; };
      FB.realmHeldCounties = function (state, realm) { return realm === rid ? [pid] : []; };
      FB.settlementsOf = function () { return [{}]; };
      FB.builtIn = function () { return []; };
      FB.techRequirementMet = function () { return true; };
      FB.buildCost = function () { return 80; };
      FB.playerDirectlyHoldsCounty = function () { return false; };
      FB.aiBuildingsYear(s);
      const first = s.buildings[pid].length;
      FB.aiBuildingsYear(s);
      return { first:first, final:s.buildings[pid].length, gold:a.gold };
    } finally { names.forEach(function (name) { FB[name] = saved[name]; }); }
  });
  expect(r).toEqual({ first:1, final:1, gold:20 });
});

test('activation rebases diagnostic coin once and reserves accrued bills from food spending', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = fiscalIds.enemy;
    s.treasuryAccounting.mode = 'accounting'; s.treasuryAccounting.pendingPlayer = 999;
    s.realms[rid].treasury.gold = 999999; s.realms[rid].treasury.militaryAccrued = 500;
    s.armyLogistics.purses = {}; s.armyLogistics.purses[rid] = { gold:200000 };
    const player = s.player.gold;
    FB.treasuryInitialize(s);
    const opening = s.realms[rid].treasury.gold;
    s.realms[rid].treasury.militaryAccrued = 10;
    const refused = FB.treasurySpend(s, rid, opening);
    const paid = FB.treasurySpend(s, rid, 5);
    FB.treasuryInitialize(s);
    return { opening:opening, gold:s.realms[rid].treasury.gold, refused:refused, paid:paid,
      accrued:s.realms[rid].treasury.militaryAccrued, pending:s.treasuryAccounting.pendingPlayer,
      player:s.player.gold === player, purses:!!s.armyLogistics.purses, mode:s.treasuryAccounting.mode };
  });
  expect(r.opening).toBe(200000); expect(r.gold).toBe(199995);
  expect(r.refused).toBe(false); expect(r.paid).toBe(true); expect(r.accrued).toBe(10);
  expect(r.pending).toBe(0); expect(r.player).toBe(true); expect(r.purses).toBe(false); expect(r.mode).toBe('active');
});

test('producer allocation caps shared output and settles gains and seizure losses once', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, data = s.armyLogistics;
    data.producers = { period:1, rows:[{ uid:'producer', pid:'test', income:10, output:100, countyOutput:200,
      start:{ bought:0, taken:0, receipts:0 } }] };
    data.counties = { test:{ bought:200, taken:200, paid:200, dues:20 } };
    const gold = s.player.gold;
    FB.armyProvisionSeason(s); FB.armyProvisionSeason(s);
    const summary = data.producerLast;
    FB.armyProducerSettle(s); FB.armyProducerSettle(s);
    return { gain:summary.gain, loss:summary.loss, change:s.player.gold - gold, pending:data.producerPending };
  });
  expect(r.gain).toBe(2.5); expect(r.loss).toBe(5); expect(r.change).toBe(-2.5); expect(r.pending).toBe(0);
});

test('closed producer claims settle once and cannot earn from later withdrawals', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, data = s.armyLogistics;
    data.producers = { period:1, rows:[{ uid:'closed', pid:'test', income:10, output:100, countyOutput:100,
      start:{ bought:0, taken:0, receipts:0 } }] };
    data.counties = { test:{ bought:50, taken:0, paid:20, dues:2 } };
    const gold = s.player.gold;
    FB.armyProducerCloseMissing(s, {}); FB.armyProducerCloseMissing(s, {});
    const closed = s.player.gold - gold;
    data.counties.test.paid = 200;
    FB.armyProvisionSeason(s); FB.armyProducerSettle(s);
    return { closed:closed, final:s.player.gold - gold };
  });
  expect(r.closed).toBe(2.5); expect(r.final).toBe(2.5);
});

test('military snapshots preserve exact quotes and refresh prices and rates next pass', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy;
    const standing = FB.hostStandingUpkeepParts, market = FB.marketPrice;
    const host = { realm:rid, at:s.realms[rid].capital, men:1000, units:{} };
    FB.unitClassIds().forEach(function (id, i) { host.units[id] = 137 + i * 19; });
    let reads = 0, rateReads = 0, price = 1.17;
    FB.marketPrice = function (state, pid, good) {
      reads++;
      return price + ['materials', 'transport', 'wares', 'luxuries'].indexOf(good) * 0.13;
    };
    FB.hostStandingUpkeepParts = function () { rateReads++; return standing.apply(this, arguments); };
    function reference() {
      const parts = standing(FB.hostUnits(host), 0);
      function quote(value, basket) {
        let total = 0, weight = 0;
        for (const good in basket) {
          if (good === 'provisions') continue;
          const share = Math.max(0, Number(basket[good]) || 0);
          const known = ['materials', 'transport', 'wares', 'luxuries'].indexOf(good);
          total += share * (known < 0 ? 1 : price + known * 0.13); weight += share;
        }
        return weight ? value * total / weight : value;
      }
      let cost = quote(parts.base, { materials:0.25, transport:0.2 });
      for (const id of Object.keys(parts.byClass)) cost += quote(parts.byClass[id], FBDATA.unitClasses[id].basket || {});
      cost += host.units.mercs / (FBDATA.balance.mercCompanySize || 150) *
        (FBDATA.balance.hostLogisticsMercenaryCompany === undefined ? 4 : FBDATA.balance.hostLogisticsMercenaryCompany);
      return cost / 90;
    }
    const oldRate = FBDATA.unitClasses.levy.upkeepPer100;
    try {
      let batch = FB.treasuryMilitaryBatch(s), expected = reference();
      FB.treasuryAccrueHost(s, host, batch);
      host.units.levy = 53;
      expected += reference();
      FB.treasuryAccrueHost(s, host, batch);
      const first = { actual:batch.costs[rid], expected:expected, reads:reads, rates:rateReads };
      price = 2.31; FBDATA.unitClasses.levy.upkeepPer100 = oldRate + 0.37;
      batch = FB.treasuryMilitaryBatch(s);
      expected = reference(); FB.treasuryAccrueHost(s, host, batch);
      return { first:first, actual:batch.costs[rid], expected:expected, reads:reads, rates:rateReads };
    } finally {
      FB.hostStandingUpkeepParts = standing; FB.marketPrice = market;
      FBDATA.unitClasses.levy.upkeepPer100 = oldRate;
    }
  });
  expect(r.first.actual).toBe(r.first.expected);
  expect(r.first.reads).toBe(4); expect(r.first.rates).toBe(1);
  expect(r.actual).toBe(r.expected);
  expect(r.reads).toBe(8); expect(r.rates).toBe(2);
});

test('legacy initialization grants once; pure queries preserve saves and RNG', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy;
    delete s.treasuryAccounting;
    for (const id in s.realms) delete s.realms[id].treasury;
    FB.treasuryInitialize(s);
    const opening = s.realms[rid].treasury.gold;
    s.realms[rid].treasury.gold = -7;
    s.realms[rid].treasury.militaryAccrued = 3;
    const clone = JSON.parse(JSON.stringify(s));
    FB.treasuryInitialize(clone);
    const before = JSON.stringify(clone);
    const view = FB.treasurySummary(clone, rid);
    if (view.last) view.last.closing = 999;
    for (let i = 0; i < 10; i++) FB.treasuryAvailable(clone, rid);
    return { opening:opening, balance:clone.realms[rid].treasury.gold,
      accrued:clone.realms[rid].treasury.militaryAccrued,
      available:view.available, unchanged:before === JSON.stringify(clone),
      player:FB.treasurySummary(clone, 'player'), review:FBDATA.techImpactReviews.features.ai_realm_treasury.mode };
  });
  expect(r.opening).toBeGreaterThan(0);
  expect(r.balance).toBe(-7); expect(r.accrued).toBe(3); expect(r.available).toBe(0);
  expect(r.unchanged).toBe(true); expect(r.player).toBeNull(); expect(r.review).toBe('none');
});

test('direct-holder income and immediate-liege dues settle once without touching player cash', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, child = window.fiscalIds.enemy, parent = window.fiscalIds.other;
    s.realms[child].liege = parent;
    s.realms[parent].liege = null;
    FB.invalidateRealmCache();
    const snapshot = FB.treasurySnapshot(s), a = snapshot.rows[child];
    let expected = 0;
    for (const pid in s.owner) if ((s.holder[pid] || s.owner[pid]) === child) {
      expected += FB.countyTaxBase(s, pid, FBDATA.balance.taxPerDev);
    }
    const charter = FB.feudalCharterDef(FB.feudalContractOf(s, child).charterId);
    const balance = s.realms[child].treasury.gold, playerGold = s.player.gold;
    s.realms[child].treasury.militaryAccrued = 12;
    s.turn += 90;
    const first = FB.treasurySeason(s);
    const settled = s.realms[child].treasury.gold;
    const second = FB.treasurySeason(s);
    return { tax:a.tax, expected:expected, dues:a.duesOut, expectedDues:expected * charter.taxShare,
      change:settled - balance, expectedChange:a.income + a.duesIn - a.duesOut - a.upkeep - 12,
      first:first, second:second, unchanged:settled === s.realms[child].treasury.gold,
      playerUnchanged:s.player.gold === playerGold, accrued:s.realms[child].treasury.militaryAccrued };
  });
  expect(r.tax).toBeCloseTo(r.expected, 8); expect(r.dues).toBeCloseTo(r.expectedDues, 8);
  expect(r.change).toBeCloseTo(r.expectedChange, 8); expect(r.first).toBe(true);
  expect(r.second).toBe(false); expect(r.unchanged).toBe(true);
  expect(r.playerUnchanged).toBe(true); expect(r.accrued).toBe(0);
});

test('multiple hosts accrue once, exclude rebels and player hosts, and retain bills after disband', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy;
    const host = { id:'fiscal-a', realm:rid, at:s.realms[rid].capital,
      men:1000, units:{ levy:1000 }, size:1000 };
    s.realms[rid].treasury.militaryAccrued = 0;
    const first = FB.treasuryMilitaryBatch(s);
    FB.treasuryAccrueHost(s, host, first);
    const single = first.costs[rid];
    FB.treasuryAccrueHost(s, Object.assign({}, host, { id:'fiscal-b' }), first);
    FB.treasuryAccrueHost(s, Object.assign({}, host, { rebellionId:'test' }), first);
    FB.treasuryAccrueHost(s, Object.assign({}, host, { realm:'player' }), first);
    FB.treasuryCommitMilitary(s, first);
    FB.treasuryCommitMilitary(s, first);
    const total = s.realms[rid].treasury.militaryAccrued;
    s.armies = [];
    const clone = JSON.parse(JSON.stringify(s));
    FB.treasuryInitialize(clone);
    return { single:single, total:total, retained:clone.realms[rid].treasury.militaryAccrued,
      next:FB.treasuryMilitaryBatch(clone) };
  });
  expect(r.single).toBeGreaterThan(0); expect(r.total).toBeCloseTo(r.single * 2, 10);
  expect(r.retained).toBe(r.total); expect(r.next).toBeNull();
});

test('non-food accrual ignores provisions prices and revalues only positive coin once', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy, other = window.fiscalIds.other;
    const host = { realm:rid, at:s.realms[rid].capital, men:1000, units:{ levy:1000 } };
    let batch = FB.treasuryMilitaryBatch(s);
    FB.treasuryAccrueHost(s, host, batch);
    const before = batch.costs[rid];
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[host.at][1][g] = 2.5;
    batch = FB.treasuryMilitaryBatch(s);
    FB.treasuryAccrueHost(s, host, batch);
    s.realms[rid].treasury.gold = 100;
    s.realms[rid].treasury.militaryAccrued = 4;
    s.realms[other].treasury.gold = -10;
    s.date.year++;
    FB.treasuryRevalue(s, 0.8); FB.treasuryRevalue(s, 0.8);
    return { before:before, after:batch.costs[rid], gold:s.realms[rid].treasury.gold,
      debt:s.realms[other].treasury.gold, accrued:s.realms[rid].treasury.militaryAccrued };
  });
  expect(r.after).toBe(r.before); expect(r.gold).toBe(80);
  expect(r.debt).toBe(-10); expect(r.accrued).toBe(4);
});

test('new realms transfer uncommitted funds and absorption retires liabilities once', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy;
    const from = s.realms[rid].treasury;
    from.gold = 100; from.militaryAccrued = 20;
    s.realms.fiscal_child = { id:'fiscal_child', alive:true, rank:1 };
    FB.treasuryCreateRealm(s, 'fiscal_child', rid, 0.25);
    FB.treasuryCreateRealm(s, 'fiscal_child', rid, 0.25);
    const child = s.realms.fiscal_child.treasury, allocated = child.gold;
    child.militaryAccrued = 5;
    FB.treasuryRetireRealm(s, 'fiscal_child', rid);
    FB.treasuryRetireRealm(s, 'fiscal_child', rid);
    const gold = s.player.gold;
    FB.treasuryRetireRealm(s, rid, 'player');
    const pending = s.player.gold - gold;
    FB.treasuryRetireRealm(s, rid, 'player');
    return { allocated:allocated, pending:pending, duplicate:s.player.gold - gold,
      playerUnchanged:s.player.gold === gold + 75, retired:from.retired, balance:from.gold, accrued:from.militaryAccrued };
  });
  expect(r.allocated).toBe(20); expect(r.pending).toBe(75); expect(r.duplicate).toBe(75);
  expect(r.playerUnchanged).toBe(true); expect(r.retired).toBe(true);
  expect(r.balance).toBe(0); expect(r.accrued).toBe(0);
});

test('snapshot work visits counties once, tolerates liege cycles, and quiet accrual reads no realms', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, a = window.fiscalIds.enemy, b = window.fiscalIds.other;
    s.realms[a].liege = b; s.realms[b].liege = a;
    const counters = {}, rows = [], stack = [];
    const original = FB.game._fastForwardTiming;
    FB.game._fastForwardTiming = {
      enter:function (label) { rows.push(label); stack.push(label); return label; },
      leave:function (label) { if (stack.pop() !== label) throw new Error('Unbalanced timer'); },
      count:function (key, value) { counters[key] = (counters[key] || 0) + (value === undefined ? 1 : value); }
    };
    try {
      const snapshot = FB.treasurySnapshot(s);
      const counties = counters['Treasury county reads'];
      const reads = counters['Treasury realm reads'];
      const batch = FB.treasuryMilitaryBatch(s);
      FB.treasuryCommitMilitary(s, batch);
      return { counties:counties, expected:Object.keys(s.owner).length,
        reads:reads, after:counters['Treasury realm reads'], stack:stack.length,
        finite:isFinite(snapshot.rows[a].income + snapshot.rows[b].duesIn),
        hasSnapshot:rows.indexOf('Treasury: fiscal snapshot') >= 0 };
    } finally { FB.game._fastForwardTiming = original; }
  });
  expect(r.counties).toBe(r.expected); expect(r.after).toBe(r.reads);
  expect(r.stack).toBe(0); expect(r.finite).toBe(true); expect(r.hasSnapshot).toBe(true);
});

for (const observing of [false, true]) {
  test('daily loop settles treasury accounts at the seasonal boundary, observing=' + observing, async function ({ page }, testInfo) {
    await setup(page, testInfo);
    const r = await page.evaluate(function (observing) {
      const s = FB.state, rid = window.fiscalIds.other;
      FB.game.observe = observing;
      s.date.day = 89;
      s.turn = Math.ceil((s.turn + 1) / 90) * 90 - 2;
      const row = s.realms[rid].treasury;
      row.lastSettledSeason = Math.floor(s.turn / 90);
      s.treasuryAccounting.lastSettledSeason = row.lastSettledSeason;
      row.lastSummary = null;
      FB.game.passDay({ deferUi:true });
      const daily = row.lastSummary;
      FB.game.passDay({ deferUi:true });
      return { daily:daily, summary:row.lastSummary,
        period:Math.floor(s.turn / 90), observing:FB.game.observe,
        provisioningUnchanged:!!FB.armyProvisionQuote && s.treasuryAccounting.mode === 'accounting' };
    }, observing);
    expect(r.daily).toBeNull(); expect(r.summary.period).toBe(r.period);
    expect(r.observing).toBe(observing); expect(r.provisioningUnchanged).toBe(true);
  });
}

test('actual army supply pass records AI expenses once without spending treasury coin', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.enemy;
    const row = s.realms[rid].treasury;
    row.gold = 123; row.militaryAccrued = 0;
    s.armies.push({ id:'fiscal-live', realm:rid, at:s.realms[rid].capital,
      from:s.realms[rid].capital, men:1000, size:1000, units:{ levy:1000 },
      supply:100, goal:null, path:[], moveLeft:0 });
    FB.armyTick(s);
    const first = row.militaryAccrued;
    FB.armyTick(s);
    return { first:first, second:row.militaryAccrued, gold:row.gold,
      stamp:s.treasuryAccounting.lastMilitaryTurn, turn:s.turn };
  });
  expect(r.first).toBeGreaterThan(0); expect(r.second).toBe(r.first);
  expect(r.gold).toBe(123); expect(r.stamp).toBe(r.turn);
});

test('realm death retires bills and fiscal profiling unwinds after a failed quote', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.other;
    const row = s.realms[rid].treasury;
    row.gold = -3; row.militaryAccrued = 7;
    FB.markRealmDead(s, rid);
    const oldTiming = FB.game._fastForwardTiming, oldTax = FB.countyTaxBase;
    const stack = [];
    FB.game._fastForwardTiming = {
      enter:function (label) { stack.push(label); return label; },
      leave:function (label) { if (stack.pop() !== label) throw new Error('Timer order'); },
      count:function () {}
    };
    FB.countyTaxBase = function () { throw new Error('Expected quote failure'); };
    let message = null;
    try { FB.treasurySnapshot(s); }
    catch (error) { message = error.message; }
    finally { FB.countyTaxBase = oldTax; FB.game._fastForwardTiming = oldTiming; }
    return { retired:row.retired, gold:row.retirement.gold, bills:row.retirement.accrued,
      message:message, stack:stack.length, available:FB.treasuryAvailable(s, rid) };
  });
  expect(r.retired).toBe(true); expect(r.gold).toBe(-3); expect(r.bills).toBe(7);
  expect(r.message).toBe('Expected quote failure'); expect(r.stack).toBe(0); expect(r.available).toBe(0);
});

test('territorial creation bills direct holders proportionally, never their sovereign twice', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, a = window.fiscalIds.enemy, b = window.fiscalIds.other;
    const capitals = [s.realms[a].capital, s.realms[b].capital];
    for (let i = 0; i < capitals.length; i++) {
      s.holder[capitals[i]] = i === 0 ? a : b;
      s.owner[capitals[i]] = a;
    }
    s.realms[a].treasury.gold = 100; s.realms[a].treasury.militaryAccrued = 20;
    s.realms[b].treasury.gold = 80; s.realms[b].treasury.militaryAccrued = 0;
    const held = { a:0, b:0 };
    for (const pid in s.owner) {
      const holder = s.holder[pid] || s.owner[pid];
      if (holder === a) held.a++;
      if (holder === b) held.b++;
    }
    s.realms.fiscal_partition = { id:'fiscal_partition', alive:true, rank:1 };
    FB.treasuryCreateFromCounties(s, 'fiscal_partition', capitals.concat(capitals));
    const gold = s.realms.fiscal_partition.treasury.gold;
    FB.treasuryCreateFromCounties(s, 'fiscal_partition', capitals);
    return { gold:gold, expected:80 / held.a + 80 / held.b,
      sum:s.realms[a].treasury.gold + s.realms[b].treasury.gold + s.realms.fiscal_partition.treasury.gold,
      duplicate:s.realms.fiscal_partition.treasury.gold };
  });
  expect(r.gold).toBeCloseTo(r.expected, 8); expect(r.sum).toBeCloseTo(180, 8);
  expect(r.duplicate).toBe(r.gold);
});

test('maintenance respects ruined buildings and unbuilt forts; player liege payments are mirrored', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, rid = window.fiscalIds.other, pid = s.realms[rid].capital;
    s.holder[pid] = rid;
    s.buildings[pid] = [{ id:'walls', s:0, level:0, targetLevel:1 },
      { id:'hospital', s:1, ruined:true }];
    FB.invalidateFortIndex();
    const before = FB.treasurySnapshot(s).rows[rid].upkeep;
    s.buildings[pid] = [{ id:'walls', s:0, level:2 }, { id:'hospital', s:1 }];
    FB.invalidateFortIndex();
    const after = FB.treasurySnapshot(s).rows[rid].upkeep;
    s.player.liege = rid;
    const snapshot = FB.treasurySnapshot(s), gold = s.player.gold;
    s.turn += 90;
    FB.treasurySeason(s, { liege:-11 });
    const summary = s.realms[rid].treasury.lastSummary;
    return { delta:after - before, expected:FB.fortLevelDef(2).upkeep + FBDATA.buildings.hospital.upkeep,
      dues:summary.duesIn, expectedDues:snapshot.rows[rid].duesIn + 11,
      playerUnchanged:gold === s.player.gold };
  });
  expect(r.delta).toBeCloseTo(r.expected, 8); expect(r.dues).toBeCloseTo(r.expectedDues, 8);
  expect(r.playerUnchanged).toBe(true);
});
