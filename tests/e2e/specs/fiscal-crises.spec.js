'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/map_data.js', 'data/modifiers.js', 'data/technology.js',
  'js/fiscal.js', 'js/actions.js', 'js/economy.js', 'js/events.js', 'js/world.js',
  'js/modifiers.js', 'js/treasury.js', 'js/council.js', 'js/institutions.js',
  'js/lordships.js', 'js/armies.js', 'js/wars.js', 'js/holywar.js',
  'js/rebellions.js', 'js/main.js', 'js/save.js', 'js/ui_modals.js',
  'js/ui_panels.js', 'js/ui_topbar.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    const s = FB.state, p = s.player;
    p.tier = 4; p.liege = null; p.war = null;
    const ids = FB.world.provs.filter(function (pr) { return !pr.wasteland; }).slice(-4).map(function (pr) { return pr.id; });
    p.provs = ids.slice(0, 3); p.provinceId = ids[0]; p.gold = 100;
    FB.foundPlayerRealm(s);
    s.realms.player.capital = ids[0];
    for (const pid of p.provs) { s.holder[pid] = 'player'; s.owner[pid] = 'player'; }
    const me = s.chars[p.charId];
    s.realms.fiscal_buyer = { id:'fiscal_buyer', name:'Fiscal Buyer', alive:true,
      rank:1, liege:'player', capital:ids[3], religion:me.religion, color:'#806040',
      ruler:{ name:'Buyer', sex:'m', age:40, mar:5, culture:me.culture, trait:'content', generation:1 },
      war:null, op:0,
      treasury:{ version:1, gold:10000000, militaryAccrued:0, lastSettledSeason:0, retired:false } };
    s.holder[ids[3]] = 'fiscal_buyer'; s.owner[ids[3]] = 'player';
    s.treasuryAccounting = s.treasuryAccounting || {};
    s.treasuryAccounting.mode = 'active';
    s.fiscalCrisis = { basis:100, stage:0, since:null, lowSince:null, active:false,
      recovering:false, lastSeason:Math.floor(s.turn / 90), nextChange:null, settlement:null, nextSettlement:0 };
    FB.invalidateRealmCache();
  });
});

test('brief deficits are harmless; sustained pressure caps and recovers without permanent score loss', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.fiscalCrisis, start = s.turn;
    s.player.gold = -201;
    FB.fiscalDay(s);
    const warned = FB.fiscalCrisisQuote(s).warning;
    s.turn = start + 89; FB.fiscalDay(s);
    const grace = r.stage;
    s.turn = start + 90; FB.fiscalSeason(s);
    const first = r.stage;
    for (let n = 2; n <= 8; n++) { s.turn = start + n * 90; FB.fiscalSeason(s); }
    const cap = r.stage, pid = s.player.provs[0];
    const support = FB.fiscalSupport(s, pid);
    const base = FB.realmRulerStandingSnapshot(s, 'fiscal_buyer');
    const standing = FB.standingOf(s, { kind:'realm', id:'fiscal_buyer' });
    FB.adjustStanding(s, { kind:'realm', id:'fiscal_buyer' }, 5);
    const delta = FB.realmRulerStandingSnapshot(s, 'fiscal_buyer') - base;
    s.player.gold = 0; FB.fiscalDay(s);
    for (let n = 9; n <= 12; n++) { s.turn = start + n * 90; FB.fiscalSeason(s); }
    return { warned:warned, grace:grace, first:first, cap:cap, support:support,
      penalty:standing - base, delta:delta, recovered:r.stage, active:r.active,
      countyBase:FB.countySupportBase(s, pid) };
  });
  expect(result).toMatchObject({ warned:true, grace:0, first:1, cap:4,
    support:-40, penalty:-20, delta:5, recovered:0, active:false });
});

test('settlement is a once-only restructuring with cash-limited collection and continuing restrictions', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.fiscalCrisis;
    r.active = true; r.stage = 4; r.since = s.turn - 360; r.nextChange = s.turn + 90;
    s.player.gold = -10000;
    FB.ensureEconomy(s).loans.push({ id:9001, kind:'revenue', principal:50, face:80,
      status:'active', dueTurn:s.turn + 3600, arrears:0, defaultKind:'revenue' });
    const loans = JSON.stringify(FB.ensureEconomy(s).loans);
    const q = FB.fiscalSettlementQuote(s);
    const accepted = FB.acceptFiscalSettlement(s, q);
    const duplicate = FB.acceptFiscalSettlement(s, q);
    const zero = s.player.gold, original = r.settlement.remaining;
    const warBlocked = FB.startPlayerWar(s, { type:'aggression', target:s.player.provs[0], enemy:'fiscal_buyer' }, { confirmAggression:true });
    const taxBlocked = FB.demandTaxes(s);
    const budget = FB.playerCivilianBudget;
    try {
      FB.playerCivilianBudget = function () { return { receipts:100, surplus:80 }; };
      s.player.gold = 7; s.turn += 90;
      FB.fiscalSeason(s);
      const after = r.settlement.remaining, paid = r.settlement.lastPayment;
      FB.fiscalSeason(s);
      const sameSeason = r.settlement.remaining;
      s.turn = q.endTurn; FB.fiscalSeason(s);
      return { accepted:accepted, duplicate:duplicate, zero:zero, original:original,
        warBlocked:warBlocked, taxBlocked:taxBlocked, paid:paid, after:after,
        sameSeason:sameSeason, expired:!FB.fiscalSettlementActive(s), remaining:r.settlement.remaining,
        cooldown:r.nextSettlement > s.turn, loans:loans === JSON.stringify(FB.ensureEconomy(s).loans) };
    } finally { FB.playerCivilianBudget = budget; }
  });
  expect(result).toMatchObject({ accepted:true, duplicate:false, zero:0, original:10000,
    warBlocked:false, taxBlocked:false, paid:7, after:9993, sameSeason:9993,
    expired:true, remaining:0, cooldown:true, loans:true });
});

test('funded sales transfer money and land once, and refund protection survives reacquisition', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provs[1], rid = 'fiscal_buyer';
    const q = FB.fiscalLandSaleQuote(s, pid, rid);
    if (!q) return { quoted:false };
    const before = s.realms[rid].treasury.gold;
    const gold = s.player.gold;
    const accepted = FB.sellFiscalLand(s, q), repeated = FB.sellFiscalLand(s, q);
    const transfer = before - s.realms[rid].treasury.gold;
    const gain = s.player.gold - gold;
    const owner = s.owner[pid], holder = s.holder[pid];
    s.player.gold = 0;
    const blocked = !!FB.fiscalRevocationReason(s, rid);
    s.holder[pid] = 'player'; s.player.provs.push(pid); FB.invalidateRealmCache();
    return { quoted:true, accepted:accepted, repeated:repeated, transfer:transfer,
      gain:gain, price:q.price, owner:owner, holder:holder, blocked:blocked,
      resale:FB.fiscalLandSaleQuote(s, pid, rid),
      capital:FB.fiscalLandSaleQuote(s, s.realms.player.capital, rid) };
  });
  expect(result).toMatchObject({ quoted:true, accepted:true, repeated:false,
    owner:'player', holder:'fiscal_buyer', blocked:true, resale:null, capital:null });
  expect(result.transfer).toBe(result.price);
  expect(result.gain).toBeCloseTo(result.price, 8);
});

test('stale and unfunded sale reviews do not mutate land or money', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provs[1], rid = 'fiscal_buyer';
    const q = FB.fiscalLandSaleQuote(s, pid, rid);
    s.realms[rid].treasury.gold = 0;
    const before = JSON.stringify([s.player.provs, s.player.gold, s.holder[pid]]);
    const accepted = FB.sellFiscalLand(s, q);
    return { quoted:!!q, accepted:accepted,
      unchanged:before === JSON.stringify([s.player.provs, s.player.gold, s.holder[pid]]) };
  });
  expect(result).toEqual({ quoted:true, accepted:false, unchanged:true });
});

test('daily status and support reads do not project budgets, search buyers, mutate RNG, or grow saved history', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, r = s.fiscalCrisis;
    r.active = true; r.stage = 4; r.nextChange = s.turn + 90;
    s.player.gold = -1000;
    const budget = FB.playerCivilianBudget, buyers = FB.fiscalLandSaleCandidates;
    const rng = JSON.stringify(FB.getRngState()), saved = JSON.stringify(r);
    try {
      FB.playerCivilianBudget = function () { throw new Error('daily budget projection'); };
      FB.fiscalLandSaleCandidates = function () { throw new Error('daily buyer search'); };
      for (let n = 0; n < 360; n++) {
        FB.fiscalDay(s); FB.fiscalCrisisQuote(s);
        for (const pid of s.player.provs) FB.countyPopularSupport(s, pid);
        FB.fiscalStanding(s, 'fiscal_buyer'); FB.fiscalAuthority(s);
      }
      return { rng:JSON.stringify(FB.getRngState()) === rng, saved:JSON.stringify(r) === saved };
    } finally { FB.playerCivilianBudget = budget; FB.fiscalLandSaleCandidates = buyers; }
  });
  expect(result).toEqual({ rng:true, saved:true });
});

test('save serialization retains settlement; landless recovery preserves personal loans', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.fiscalCrisis.active = true; s.fiscalCrisis.stage = 3; s.player.gold = -500;
    FB.acceptFiscalSettlement(s, FB.fiscalSettlementQuote(s));
    FB.ensureEconomy(s).loans.push({ id:9002, kind:'revenue', principal:50, face:80,
      status:'active', dueTurn:s.turn + 3600, arrears:0, defaultKind:'revenue' });
    const loans = JSON.stringify(FB.ensureEconomy(s).loans);
    const saved = JSON.parse(FB.save.serialize()).state;
    const equal = JSON.stringify(saved.fiscalCrisis) === JSON.stringify(s.fiscalCrisis);
    const r = saved.fiscalCrisis;
    saved.player.gold = -20; saved.player.tier = 2;
    FB.fiscalDay(saved);
    return { equal:equal, next:r.nextSettlement, gold:saved.player.gold,
      remaining:r.settlement.remaining, active:r.active,
      personal:JSON.stringify(FB.ensureEconomy(saved).loans) === loans };
  });
  expect(result).toMatchObject({ equal:true, gold:0, remaining:0, active:false, personal:true });
  expect(result.next).toBeGreaterThan(0);
});

test('fiscal resentment reaches the existing warning and armed-revolt path; settlement does not erase rebels', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provs[0];
    s.armies = []; s.eventQueue = []; s.modifiers = { county:{} };
    s.rebellions = { groups:{}, warnings:{}, cooldowns:{}, nextScan:s.turn + 10000 };
    s.fiscalCrisis.active = true; s.fiscalCrisis.stage = 4;
    s.fiscalCrisis.nextChange = s.turn + 90; s.player.gold = -1000;
    FB.setCountySupport(s, pid, -10);
    const effective = FB.countyPopularSupport(s, pid);
    const row = { id:'uprising:fiscal', stage:'petition', scopeId:pid, countyIds:[pid],
      visitedCountyIds:[pid], countyStates:{}, privilegeId:'tax_concession',
      protagonistId:s.player.charId, liegeId:null, startedTurn:s.turn };
    row.countyStates[pid] = { phase:'petition', joinedTurn:s.turn };
    s.collectiveDemands = s.collectiveDemands || {};
    s.collectiveDemands.uprising = row;
    FB.restoreCommonsUprising(s);
    const queued = s.eventQueue.find(function (event) { return event.id === 'commons_uprising_warning'; });
    const ev = FB.eventById('commons_uprising_warning');
    FB.resolveEventOption(s, ev, ev.options[1], queued.ctx);
    s.turn += 89; FB.institutionsDay(s);
    const early = s.armies.filter(function (host) { return host.rebellionId; }).length;
    s.turn++; FB.institutionsDay(s);
    const rebels = s.armies.filter(function (host) { return host.rebellionId; }).map(function (host) { return host.id; });
    const accepted = FB.acceptFiscalSettlement(s, FB.fiscalSettlementQuote(s));
    return { effective:effective, early:early, rebels:rebels.length, accepted:accepted,
      retained:rebels.every(function (id) { return s.armies.some(function (host) { return host.id === id; }); }),
      base:FB.countySupportBase(s, pid) };
  });
  expect(result).toMatchObject({ effective:-50, early:0, accepted:true, retained:true, base:-10 });
  expect(result.rebels).toBeGreaterThan(0);
});

test('settlement blocks paid event options before fees and preserves ordinary levy capacity', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.fiscalCrisis.active = true; s.player.gold = -500;
    FB.acceptFiscalSettlement(s, FB.fiscalSettlementQuote(s));
    s.player.gold = 100;
    const option = { label:'Hire', effects:{ gold:-20, custom:'war_mercs' } };
    const ev = { id:'fiscal_test_mercs', options:[option] };
    const before = JSON.stringify(s), rng = FB.getRngState();
    const status = FB.eventOptionStatus(s, ev, option, {});
    const receipt = FB.resolveEventOption(s, ev, option, {}, { automated:true });
    const untouched = before === JSON.stringify(s) && rng === FB.getRngState();
    const limits = s.fiscalCrisis.settlement.paidLimits;
    const units = FB.fiscalLimitComposition(s, { levy:10000, ret:(limits.ret || 0) + 100, cav:(limits.cav || 0) + 100 });
    return { blocked:status.fiscalLocked, receipt:receipt, untouched:untouched,
      levy:units.levy, ret:units.ret, retLimit:limits.ret || 0, cav:units.cav, cavLimit:limits.cav || 0 };
  });
  expect(result).toMatchObject({ blocked:true, receipt:false, untouched:true, levy:10000 });
  expect(result.ret).toBe(result.retLimit);
  expect(result.cav).toBe(result.cavLimit);
});

test('quiet seasons calculate one budget and never search for buyers', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, budget = FB.playerCivilianBudget, buyers = FB.fiscalLandSaleCandidates;
    let calls = 0;
    try {
      FB.playerCivilianBudget = function () { calls++; return { receipts:100, surplus:30 }; };
      FB.fiscalLandSaleCandidates = function () { throw new Error('seasonal buyer search'); };
      for (let n = 0; n < 4; n++) { s.turn += 90; FB.fiscalSeason(s); FB.fiscalSeason(s); }
      return calls;
    } finally { FB.playerCivilianBudget = budget; FB.fiscalLandSaleCandidates = buyers; }
  });
  expect(result).toBe(4);
});

for (const width of [390, 1280]) {
  test('settlement review and Back retain Finance view at width ' + width, async function ({ page }) {
    await page.setViewportSize({ width:width, height:800 });
    await page.evaluate(function () {
      const s = FB.state;
      s.fiscalCrisis.active = true; s.fiscalCrisis.stage = 3; s.player.gold = -500;
      FB.ui.showFinance();
    });
    await page.locator('#finance-fiscal-settlement').click();
    await expect(page.locator('#gm-body')).toContainText('25%');
    await expect(page.locator('#fiscal-settle-confirm')).toBeEnabled();
    await page.locator('#fiscal-back').click();
    await expect(page.locator('#finance-fiscal-settlement')).toBeFocused();
    await page.locator('#finance-fiscal-settlement').click();
    await page.locator('#fiscal-settle-confirm').click();
    await expect(page.locator('[data-fiscal-status]')).toContainText('Restructured obligations');
    await expect(page.locator('#finance-fiscal-settlement')).toHaveCount(0);
  });
}
