'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/treasury.js', 'js/armies.js', 'js/wars.js',
  'js/actions.js', 'js/world.js', 'js/logistics.js', 'js/market.js', 'js/technology.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'js/i18n.js', 'js/economy.js',
  'data/map_data.js', 'data/units.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    window.treasuryIds = ids;
    FB.treasuryInitialize(FB.state);
  }, ids);
}

test('military commitments share cash across hosts and never debit a projected levy', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy, a = s.realms[rid].treasury;
    a.gold = 100000; a.militaryAccrued = 0; a.necessary = 0; s.armies = [];
    const policy = FB.treasuryMilitaryPolicy(s);
    const host = { id:'first', realm:rid, at:s.realms[rid].capital, men:100, units:{ levy:100 }, supply:100 };
    const first = FB.treasuryApproveHost(s, host, policy, false, 'muster');
    const cost = policy.totals[rid];
    const unchanged = a.gold === 100000;
    a.gold = cost * 1.5;
    const refill = FB.treasuryApproveHost(s, Object.assign({}, host,
      { men:1000, units:{ levy:1000 } }), policy, false, 'reinforce');
    const second = FB.treasuryApproveHost(s, Object.assign({}, host, { id:'second' }), policy, false, 'muster');
    const skipped = !FB.treasuryRetryReady(s, rid, 'muster');
    a.gold = 100000;
    const fundsWake = FB.treasuryRetryReady(s, rid, 'muster');
    a.gold = 0;
    FB.invalidateRealmCache();
    const inputsWake = FB.treasuryRetryReady(s, rid, 'muster');
    FB.treasuryApproveHost(s, host, policy, false, 'muster');
    s.turn += FBDATA.balance.aiTreasuryRetryDays;
    return { first:first, cost:cost, unchanged:unchanged, refill:refill, second:second, skipped:skipped,
      fundsWake:fundsWake, inputsWake:inputsWake, dateWake:FB.treasuryRetryReady(s, rid, 'muster') };
  });
  expect(result.cost).toBeGreaterThan(0);
  expect(result).toMatchObject({ first:true, unchanged:true, refill:false, second:false, skipped:true,
    fundsWake:true, inputsWake:true, dateWake:true });
});

test('lazy military policies quote only the requested realm and preserve its full reserve', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy, other = treasuryIds.other;
    s.armies = [rid, other].map(function (id) {
      return { id:id, realm:id, at:s.realms[id].capital, men:100, units:{ levy:100 }, supply:100 };
    });
    s.realms[rid].treasury.gold = 100000;
    const eager = FB.treasuryMilitaryPolicy(s), lazy = FB.treasuryMilitaryPolicy(s, true);
    const cold = Object.keys(lazy.hosts).length;
    const approved = FB.treasuryApproveHost(s, s.armies[0], lazy, false, 'muster');
    const same = lazy.totals[rid] === eager.totals[rid];
    const untouched = lazy.hosts[other] === undefined;
    s.armies[0].men = 200; s.armies[0].units.levy = 200;
    const fresh = FB.treasuryMilitaryPolicy(s, true);
    FB.treasuryApproveHost(s, s.armies[0], fresh, false, 'reinforce');
    return { cold:cold, approved:approved, same:same, untouched:untouched,
      refreshed:fresh.totals[rid] > lazy.totals[rid] };
  });
  expect(result).toEqual({ cold:0, approved:true, same:true, untouched:true, refreshed:true });
});

test('a constrained defender fields an affordable levy and retains drilled professionals', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy;
    s.armies = []; s.armyDown = {}; s.armyCohorts = {};
    s.armyCohorts[rid] = { ret:{ ready:100, batches:[] } };
    s.realms[rid].treasury.gold = 30; s.realms[rid].treasury.necessary = 0;
    const base = FB.aiBaseHost, food = FB.armyProvisionCommitment, allies = FB.alliedReinforcement;
    try {
      FB.aiBaseHost = function () { return 1000; };
      FB.armyProvisionCommitment = function (state, host) { return host.men * 0.2; };
      FB.alliedReinforcement = function () { return { ally:null, men:0 }; };
      s.turn++;
      FB.armyTick(s);
      const host = s.armies.filter(function (a) { return a.realm === rid; })[0];
      return { men:host && host.men, professional:host && host.units.ret,
        ready:s.armyCohorts[rid].ret.ready, gold:s.realms[rid].treasury.gold };
    } finally { FB.aiBaseHost = base; FB.armyProvisionCommitment = food; FB.alliedReinforcement = allies; }
  });
  expect(result.men).toBeGreaterThanOrEqual(40); expect(result.men).toBeLessThan(1000);
  expect(result.professional).toBe(0); expect(result.ready).toBe(100); expect(result.gold).toBeGreaterThanOrEqual(0);
});

test('unfunded cohorts wait, paid drilling starts once, and legacy batches remain grandfathered', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy;
    FB.endPlayerWar(s, true); s.armies = []; s.greatHolyWar = null;
    s.armyCohorts = {}; s.realms[rid].treasury.gold = 0; s.realms[rid].treasury.necessary = 0;
    FB.noteCohortLosses(s, rid, { ret:20 });
    FB.armyTick(s);
    const batch = s.armyCohorts[rid].ret.batches[0], waiting = batch.funded === false;
    s.realms[rid].treasury.gold = 1000;
    s.turn++; FB.armyTick(s);
    const paid = s.realms[rid].treasury.gold, due = batch.readyTurn;
    s.turn++; FB.armyTick(s);
    const once = paid === s.realms[rid].treasury.gold;
    s.armyCohorts[rid].ret.batches.push({ n:5, readyTurn:s.turn });
    FB.armyTick(s);
    return { waiting:waiting, funded:batch.funded, paid:paid, once:once,
      due:due > s.turn, legacy:s.armyCohorts[rid].ret.ready };
  });
  expect(result).toMatchObject({ waiting:true, funded:true, once:true, due:true, legacy:5 });
  expect(result.paid).toBeLessThan(1000);
});

test('two insolvent seasonal reviews trigger bounded recovery and preserve incurred bills', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy, a = s.realms[rid].treasury;
    a.gold = -100000;
    for (let i = 0; i < 2; i++) {
      s.turn += 90; a.militaryAccrued = 10; FB.treasurySeason(s);
    }
    const recovering = FB.treasuryRetrenching(s, rid), gold = a.gold;
    FB.treasurySeason(s);
    const once = a.gold === gold;
    s.turn += 90;
    return { recovering:recovering, once:once, negative:gold < 0, expired:!FB.treasuryRetrenching(s, rid) };
  });
  expect(result).toEqual({ recovering:true, once:true, negative:true, expired:true });
});

test('recovery disbands only a stationary host at safe home and keeps its unpaid bill', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = treasuryIds.enemy, pid = s.realms[rid].capital;
    s.holder[pid] = rid;
    s.realms[rid].treasury.recoverUntil = s.turn + 90;
    s.realms[rid].treasury.militaryAccrued = 10;
    const host = { id:'recover-test', realm:rid, at:pid, from:pid, men:100, size:100,
      units:{ levy:100 }, supply:100, path:[], goal:null, moveLeft:0 };
    s.armies = [host];
    const blocked = FB.recruitmentCountyBlocked;
    try {
      FB.recruitmentCountyBlocked = function () { return true; };
      FB.armyTick(s);
      const protectedHost = s.armies.indexOf(host) >= 0;
      host.at = pid; host.moveLeft = 0; host.path = [];
      FB.recruitmentCountyBlocked = function () { return false; };
      FB.armyTick(s);
      return { protectedHost:protectedHost, removed:s.armies.indexOf(host) < 0,
        bill:s.realms[rid].treasury.militaryAccrued, down:s.armyDown[rid] === s.turn };
    } finally { FB.recruitmentCountyBlocked = blocked; }
  });
  expect(result).toEqual({ protectedHost:true, removed:true, bill:10, down:true });
});

test('AI recovery uses seasonal peace while player campaigns remain under player control', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, ids = treasuryIds;
    const war = FB.registerOrdinaryWar(s, ids.liege, { enemy:ids.other, target:s.realms[ids.other].capital });
    s.realms[ids.liege].treasury.recoverUntil = s.turn + 90;
    s.realms[ids.enemy].treasury.recoverUntil = s.turn + 90;
    FB.playerWarTick(s);
    return { aiEnded:war.status !== 'active', playerActive:FB.realmWars(s, 'player').length > 0 };
  });
  expect(result).toEqual({ aiEnded:true, playerActive:true });
});

test('treasury and producer disclosures remain read-only on a narrow screen', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(function () {
    const s = FB.state;
    window.accountBefore = JSON.stringify(s.realms[treasuryIds.enemy].treasury);
    FB.ui.showLiegeModal(treasuryIds.enemy);
  });
  await expect(page.locator('#realm-treasury')).toContainText('Available cash');
  await page.locator('[aria-controls="realm-treasury-details"]').click();
  await expect(page.locator('#realm-treasury-details')).toBeVisible();
  expect(await page.evaluate(function () {
    return accountBefore === JSON.stringify(FB.state.realms[treasuryIds.enemy].treasury);
  })).toBe(true);
  await page.evaluate(function () {
    FB.ui.closeModal();
    FB.state.armyLogistics.producerLast = { gain:0.5, loss:0.2, period:1 };
    FB.ui.showFinance();
  });
  await expect(page.locator('#finance-producer')).toContainText('Net household adjustment');
  await page.locator('[aria-controls="finance-producer-details"]').click();
  await expect(page.locator('#finance-producer-details')).toBeVisible();
});
