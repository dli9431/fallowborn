'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/economy.js', 'js/politics.js', 'js/institutions.js', 'js/events.js',
  'js/travel.js', 'js/market.js', 'js/ui_modals.js', 'js/wars.js',
  'js/modifiers.js', 'js/model.js', 'js/armies.js', 'js/world.js',
  'data/economy.js', 'data/markets.js', 'data/political_institutions.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.game.setPaused(true); });
});

test('quiet finance and politics days skip settled history and retain exact venture deadlines', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, e = FB.ensureEconomy(s);
    e.investments = [];
    for (let i = 0; i < 300; i++) e.investments.push({ id:i + 1, status:'resolved', kind:'trade_venture' });
    const venture = { id:301, status:'active', kind:'trade_venture', dueTurn:s.turn + 100 };
    e.investments.push(venture);
    FB.politicsDay(s);
    FB.financeDay(s);
    let reads = 0;
    e.investments.slice(0, 300).forEach(function (inv) {
      Object.defineProperty(inv, 'status', { configurable:true, enumerable:true,
        get:function () { reads++; return 'resolved'; } });
    });
    for (let i = 0; i < 90; i++) { s.turn++; FB.politicsDay(s); FB.financeDay(s); }
    const quietReads = reads, calls = [], resolve = FB.resolveTradeVenture;
    FB.resolveTradeVenture = function (state, inv) { calls.push(inv.id); inv.status = 'resolved'; };
    try {
      venture.dueTurn = s.turn;
      FB.financeDay(s);
      FB.financeDay(s);
      e.investments.push({ id:302, status:'active', kind:'trade_venture', dueTurn:s.turn });
      FB.financeDay(s);
      e.investments = [{ id:303, status:'active', kind:'trade_venture', dueTurn:s.turn }];
      FB.financeDay(s);
      e.investments[0].status = 'active';
      FB.ensureEconomy(s); // explicit repair after directly reactivating history
      FB.financeDay(s);
    } finally { FB.resolveTradeVenture = resolve; }
    return { quietReads:quietReads, calls:calls, active:FB.financeInvestmentSchedule(s).activeTrade };
  });
  expect(result).toEqual({ quietReads:0, calls:[301, 302, 303, 303], active:0 });
});

test('institution history is not serialized daily and repairs honor mutations and expiry', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    FB.ensureInstitutions(s);
    s.elections.cooldowns.performance = s.turn + 100;
    FB.ensureInstitutions(s);
    FB.institutionsDay(s);
    const stringify = JSON.stringify, repair = FB.ensureInstitutions;
    let serializations = 0, repairs = 0;
    JSON.stringify = function (value) {
      if ([s.elections, s.privileges, s.realmPolicies, s.collectiveDemands].indexOf(value) >= 0) serializations++;
      return stringify.apply(this, arguments);
    };
    FB.ensureInstitutions = function () { repairs++; return repair.apply(this, arguments); };
    let quietRepairs, expired, mutationRepaired, replacementRepaired;
    try {
      for (let i = 0; i < 90; i++) { s.turn++; FB.institutionsDay(s); }
      quietRepairs = repairs;
      s.turn += 10;
      FB.institutionsDay(s);
      expired = !Object.prototype.hasOwnProperty.call(s.elections.cooldowns, 'performance');
      const prior = repairs;
      FB.notePoliticalMistreatment(s, 'religious_persecution', {});
      FB.institutionsDay(s);
      mutationRepaired = repairs > prior;
      const afterMutation = repairs;
      s.elections = JSON.parse(stringify(s.elections));
      FB.institutionsDay(s);
      replacementRepaired = repairs > afterMutation;
    } finally { JSON.stringify = stringify; FB.ensureInstitutions = repair; }
    return { quietRepairs:quietRepairs, serializations:serializations,
      expired:expired, mutationRepaired:mutationRepaired, replacementRepaired:replacementRepaired };
  });
  expect(result).toEqual({ quietRepairs:0, serializations:0, expired:true,
    mutationRepaired:true, replacementRepaired:true });
});

test('simple event receipts match full snapshots without enumerating world characters', async function ({ page }) {
  const result = await page.evaluate(function () {
    const saved = JSON.stringify(FB.state), rng = FB.getRngState();
    const effects = [{ gold:7, prestige:3, piety:2 }, { health:-3 },
      { skills:{ dip:2 }, popularOpinion:4 }];
    let equivalent = true, scans = 0;
    effects.forEach(function (fx) {
      const local = JSON.parse(saved), broad = JSON.parse(saved);
      local.player.travel = null; broad.player.travel = null;
      local.chars = new Proxy(local.chars, { ownKeys:function (target) {
        scans++; return Reflect.ownKeys(target);
      } });
      FB.setRngState(rng);
      const receipt = FB.applyEffects(local, fx), afterRng = FB.getRngState();
      // An unknown key deliberately takes the conservative fallback, with no effect.
      FB.setRngState(rng);
      const full = FB.applyEffects(broad, Object.assign({ performanceFullSnapshot:true }, fx));
      const effectScans = scans;
      equivalent = equivalent && JSON.stringify(receipt) === JSON.stringify(full) &&
        afterRng === FB.getRngState() && JSON.stringify(local) === JSON.stringify(broad);
      scans = effectScans; // serialization of the assertion itself is not engine work
    });
    FB.setRngState(rng);
    return { equivalent:equivalent, scans:scans };
  });
  expect(result).toEqual({ equivalent:true, scans:0 });
});

test('courier batches normalize once and restore each returned gift exactly once', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player, gold = p.gold;
    p.giftDeliveries = [null, { giftKind:'broken' }];
    for (let i = 0; i < 40; i++) p.giftDeliveries.push({
      id:'return_' + i, recipientKind:'character', recipientId:p.charId,
      giftKind:'cash', phase:i % 2 ? 'return' : 'outbound', amount:'2', effect:0,
      failedReason:'recipient', destinationId:p.provinceId,
      currentId:p.provinceId, returnHomeId:p.provinceId,
      remainingRoute:[], legDays:3, legDaysLeft:0
    });
    const ensure = FB.giftDeliveryEnsure;
    let normalizations = 0;
    FB.giftDeliveryEnsure = function () { normalizations++; return ensure.apply(this, arguments); };
    let firstPass;
    try {
      FB.giftDeliveryTick(s);
      firstPass = normalizations;
      FB.giftDeliveryTick(s);
    } finally { FB.giftDeliveryEnsure = ensure; }
    return { firstPass:firstPass, payout:p.gold - gold, remaining:p.giftDeliveries.length };
  });
  expect(result).toEqual({ firstPass:1, payout:80, remaining:0 });
});

test('global market shocks equal ordered county expansions without repeated shock scans', async function ({ page }) {
  const result = await page.evaluate(function () {
    const saved = JSON.stringify(FB.state), rng = FB.getRngState();
    const counties = Object.keys(FB.world.byId).filter(function (pid) {
      return !FB.world.byId[pid].wasteland;
    }).sort();
    const a = JSON.parse(saved), b = JSON.parse(saved);
    const goods = FB.ensureMarket(a).goods;
    FB.ensureMarket(b);
    const shocks = [
      { id:'global', production:-0.15, demand:0.12, flow:-0.2, severe:true, remaining:2 },
      { id:'county', provinceId:counties[0], production:0.1, remaining:2 },
      { id:'good', goodId:goods[0], demand:0.05, remaining:2 }
    ];
    a.market.shocks = shocks;
    b.market.shocks = [];
    shocks.forEach(function (shock) {
      (shock.provinceId ? [shock.provinceId] : counties).forEach(function (pid) {
        (shock.goodId ? [shock.goodId] : goods).forEach(function (goodId) {
          b.market.shocks.push(Object.assign({}, shock, { provinceId:pid, goodId:goodId }));
        });
      });
    });
    a.market.lastTurn = -1; b.market.lastTurn = -1;
    // Warm normalization before observing the numerical seasonal path.
    FB.ensureMarket(a);
    let reads = 0;
    a.market.shocks.forEach(function (shock) {
      const pid = shock.provinceId;
      Object.defineProperty(shock, 'provinceId', { configurable:true, enumerable:true,
        get:function () { reads++; return pid; } });
    });
    FB.setRngState(rng); FB.marketSeason(a);
    const aRng = FB.getRngState(), scanReads = reads;
    FB.setRngState(rng); FB.marketSeason(b);
    return { equal:JSON.stringify(a.market.counties) === JSON.stringify(b.market.counties),
      rngEqual:aRng === FB.getRngState(), reads:scanReads, counties:counties.length };
  });
  expect(result.equal).toBe(true);
  expect(result.rngEqual).toBe(true);
  expect(result.reads).toBeLessThan(result.counties);
});

test('conquest rows reuse force projections and rebuild them when reopened', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.tier = 4;
    const enemy = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmProvinces(s, id).length >= 3;
    });
    const causes = FB.realmProvinces(s, enemy).slice(0, 3).map(function (pid) {
      return { type:'aggression', enemy:enemy, target:pid };
    });
    const names = ['warCauses', 'warJustifications', 'playerLevy', 'realmDefensiveStrength',
      'warCausePreview', 'warCauseBlockedReason', 'warDeclarationPreview', 'playerMusterUpkeepParts'];
    const saved = {};
    names.forEach(function (name) { saved[name] = FB[name]; });
    let levyCalls = 0, defenseCalls = 0, men = 1000;
    FB.warCauses = function () { return causes; };
    FB.warJustifications = function (state, pid) { return causes.filter(function (cause) { return cause.target === pid; }); };
    FB.playerLevy = function () { levyCalls++; return men; };
    FB.realmDefensiveStrength = function () { defenseCalls++; return 500; };
    FB.warCausePreview = function () { return null; };
    FB.warCauseBlockedReason = function () { return ''; };
    FB.warDeclarationPreview = function () { return { ready:false, claims:[] }; };
    FB.playerMusterUpkeepParts = function () { return { total:0 }; };
    let rows, first, second;
    try {
      FB.ui.showWarTargets();
      rows = document.querySelectorAll('.war-target-row').length;
      first = document.getElementById('war-target-list').textContent;
      men = 2000;
      FB.ui.showWarTargets();
      second = document.getElementById('war-target-list').textContent;
    } finally { names.forEach(function (name) { FB[name] = saved[name]; }); }
    return { rows:rows, levyCalls:levyCalls, defenseCalls:defenseCalls, updated:first !== second };
  });
  expect(result).toEqual({ rows:3, levyCalls:2, defenseCalls:2, updated:true });
});
