'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/economy.js', 'js/politics.js', 'js/institutions.js', 'js/events.js',
  'js/travel.js', 'js/market.js', 'js/ui_modals.js', 'js/wars.js',
  'js/modifiers.js', 'js/model.js', 'js/armies.js', 'js/world.js', 'js/main.js',
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

test('seasonal AI reuses border projections and refreshes them for the next decision', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state;
    const realms = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege;
    }).sort();
    const attacker = realms[0], enemy = realms[1], quiet = realms[2];
    let targets;
    const home = Object.keys(FB.world.byId).sort().find(function (pid) {
      const duchy = FB.dejureOf(pid).duchy;
      if (!duchy || FB.world.byId[pid].wasteland) return false;
      const neighbors = Object.keys(FB.world.adj[pid] || {}).filter(function (nb) {
        return !FB.world.byId[nb].wasteland && FB.dejureOf(nb).duchy === duchy;
      }).sort();
      for (const first of neighbors) {
        const second = neighbors.find(function (nb) { return nb !== first && !!FB.world.adj[first][nb]; });
        if (second) { targets = [first, second].sort(); return true; }
      }
      return false;
    });
    if (!home) throw new Error('AI fixture needs two connected border counties in the same duchy.');
    Object.keys(s.realms).forEach(function (id) { s.realms[id].rank = 0; });
    Object.keys(s.owner).forEach(function (pid) { s.owner[pid] = quiet; s.holder[pid] = quiet; });
    s.owner[home] = attacker; s.holder[home] = attacker;
    targets.forEach(function (pid) { s.owner[pid] = enemy; s.holder[pid] = enemy; });
    s.realms[attacker].rank = 2; s.realms[attacker].capital = home;
    s.realms[enemy].capital = targets[0];
    s.wars = {}; s.truces = {}; s.warLaws = {}; s.warAISeason = -1;
    FB.invalidateRealmCache(); FB.repairWars(s);
    const names = ['realmStrength', 'territorialWarRights', 'chance', 'sameFaithHeadWarPolicy', 'areAlliedSnapshot'];
    const saved = {}, strengthReads = {}, rightsReads = {};
    names.forEach(function (name) { saved[name] = FB[name]; });
    let enemyStrength = 10, rolls = 0;
    FB.realmStrength = function (state, id) {
      strengthReads[id] = (strengthReads[id] || 0) + 1;
      return id === attacker ? 1000 : id === enemy ? enemyStrength : 100000;
    };
    FB.territorialWarRights = function (state, rid, pid) {
      rightsReads[pid] = (rightsReads[pid] || 0) + 1;
      return saved.territorialWarRights(state, rid, pid);
    };
    FB.chance = function (p) { rolls++; saved.chance(p); return true; };
    FB.sameFaithHeadWarPolicy = function () { return null; };
    FB.areAlliedSnapshot = function () { return false; };
    let objectives, firstStrengthReads, firstRightsReads, nextWars;
    try {
      FB.generateVassalCampaigns(s);
      const war = FB.realmWars(s, attacker)[0];
      objectives = war && war.objectives.map(function (o) { return o.target; }).sort();
      firstStrengthReads = Object.assign({}, strengthReads);
      firstRightsReads = Object.assign({}, rightsReads);
      FB.generateVassalCampaigns(s); // same-turn guard must not roll again
      if (war) FB.settleOrdinaryWar(s, war.id, 'invalid');
      enemyStrength = 100000;
      s.turn += 90;
      FB.generateVassalCampaigns(s);
      nextWars = FB.realmWars(s, attacker).length;
    } finally { names.forEach(function (name) { FB[name] = saved[name]; }); }
    return { objectives:objectives, expected:targets, strengths:Object.values(firstStrengthReads),
      rights:Object.values(firstRightsReads), attackerReads:strengthReads[attacker],
      enemyReads:strengthReads[enemy], rolls:rolls, nextWars:nextWars };
  });
  expect(result.objectives).toEqual(result.expected);
  expect(result.strengths.every(function (n) { return n === 1; })).toBe(true);
  expect(result.rights).toEqual([1, 1]);
  expect(result.attackerReads).toBe(2);
  expect(result.enemyReads).toBe(2);
  expect(result.rolls).toBe(2);
  expect(result.nextWars).toBe(0);
});

test('local autoresolve skips global reconciliation while custom effects and season boundaries retain it', async function ({ page }) {
  const result = await page.evaluate(function () {
    const s = FB.state, p = s.player;
    FB.game.auto.all = true; FB.game.auto.style = 'first';
    const local = { id:'perf_local_event', title:'Local work', text:'A quiet day.',
      options:[{ label:'Work', effects:{ gold:2 } }] };
    const custom = { id:'perf_custom_event', title:'Court business', text:'A distant ruler changes.',
      options:[{ label:'Continue', effects:{ custom:'perf_ruler_change' } }] };
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && !!FB.realmRulerCharacterSnapshot(s, id);
    });
    const ruler = FB.realmRulerCharacterSnapshot(s, rid);
    const names = ['eventById', 'syncMaterializedRealmRulers', 'checkTierPromotions'];
    const saved = {}; names.forEach(function (name) { saved[name] = FB[name]; });
    let syncs = 0, promotions = 0;
    FB.eventById = function (id) { return id === local.id ? local : id === custom.id ? custom : saved.eventById(id); };
    FB.syncMaterializedRealmRulers = function (state) { syncs++; return saved.syncMaterializedRealmRulers(state); };
    FB.checkTierPromotions = function (state) { promotions++; return saved.checkTierPromotions(state); };
    FB.fns.perf_ruler_change = function () { ruler.opinion = 17; };
    let quiet, changed, boundary, defaultCaller, gold;
    try {
      FB.game.afterEvents({ syncRulers:true }); // establish ordinary daily baseline
      syncs = 0; promotions = 0;
      gold = p.gold;
      FB.ui.runEvents([{ id:local.id, ctx:{} }, { id:local.id, ctx:{} }], { syncRulers:false });
      quiet = { syncs:syncs, promotions:promotions, gold:p.gold - gold,
        modal:!document.getElementById('eventmodal').classList.contains('hidden') };
      FB.ui.runEvents([{ id:local.id, ctx:{} }, { id:custom.id, ctx:{} }], { syncRulers:false });
      changed = { syncs:syncs, standing:s.realms[rid].favor };
      FB.ui.runEvents([{ id:local.id, ctx:{} }], { syncRulers:true });
      boundary = syncs;
      FB.ui.runEvents([{ id:local.id, ctx:{} }]);
      defaultCaller = syncs;
    } finally {
      names.forEach(function (name) { FB[name] = saved[name]; });
      delete FB.fns.perf_ruler_change;
    }
    return { quiet:quiet, changed:changed, boundary:boundary, defaultCaller:defaultCaller };
  });
  expect(result.quiet).toEqual({ syncs:0, promotions:0, gold:4, modal:false });
  expect(result.changed).toEqual({ syncs:1, standing:17 });
  expect(result.boundary).toBe(2);
  expect(result.defaultCaller).toBe(3);
});
