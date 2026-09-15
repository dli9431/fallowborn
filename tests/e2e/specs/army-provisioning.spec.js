'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/logistics.js', 'js/treasury.js', 'js/economy.js', 'js/market.js', 'js/armies.js', 'js/wars.js', 'js/actions.js',
  'js/world.js', 'js/population.js', 'js/rebellions.js', 'js/fortifications.js', 'js/holywar.js', 'js/modifiers.js',
  'js/main.js', 'js/ui_misc.js', 'js/ui_modals.js', 'js/ui_panels.js', 'css/style.css',
  'data/map_data.js', 'data/markets.js', 'data/technology.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

test('resupply cooldown never resumes a stale combat destination and completion clears its stop', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], original = FB.armyProvisionQuote;
    try {
      host.supply = 5; host.autoResupply = 1;
      host.supplyStop = window.provisionIds.home;
      host.supplySearchTurn = s.turn;
      host.goal = window.provisionIds.target;
      FB.armyProvisionQuote = function () { return { mode:'purchase', net:-1 }; };
      const goal = FB.armySupplyGoal(s, host);
      const stopRemoved = host.supplyStop === undefined;
      host.supply = FB.armyProvisionTarget(host);
      host.supplyStop = window.provisionIds.home;
      const finished = FB.armySupplyGoal(s, host);
      return { held:goal === host.at, stopRemoved:stopRemoved, finished:finished,
        cleaned:host.supplyStop === undefined && host.supplySearchTurn === undefined && host.autoResupply === undefined };
    } finally { FB.armyProvisionQuote = original; }
  });
  expect(r).toEqual({ held:true, stopRemoved:true, finished:null, cleaned:true });
});

test('resupply retains a valid destination after an interrupted route and honors manual control', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], originalQuote = FB.armyProvisionQuote;
    const originalPath = FB.findArmyPath, originalPursue = FB.armyCanPursue;
    try {
      const stop = window.provisionIds.home;
      host.supply = 5; host.autoResupply = 1; host.supplyStop = stop;
      host.supplySearchTurn = s.turn; host.path = []; host.goal = null;
      FB.armyProvisionQuote = function (state, army, pid) {
        return { mode:'purchase', net:pid === stop ? 2 : -1 };
      };
      FB.findArmyPath = function () { return { path:[stop] }; };
      FB.armyCanPursue = function () { return true; };
      const goal = FB.armySupplyGoal(s, host);
      host.path = [stop]; host.goal = stop; host.moveLeft = 3; host.manual = 1;
      FB.game.auto.hosts = 'manual';
      FB.enforceManualHostControl(s);
      return { goal:goal, stop:stop, path:host.path, moveLeft:host.moveLeft,
        cleaned:host.supplyStop === undefined && host.autoResupply === undefined };
    } finally {
      FB.armyProvisionQuote = originalQuote; FB.findArmyPath = originalPath;
      FB.armyCanPursue = originalPursue;
    }
  });
  expect(r.goal).toBe(r.stop);
  expect(r.path).toEqual([r.stop]);
  expect(r.moveLeft).toBe(3);
  expect(r.cleaned).toBe(true);
});

test('wealth does not conceal stock and daily loading limits in provision quotes', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], original = FB.marketProvisionSource;
    try {
      host.supply = 0; s.player.gold = 5000;
      const market = { stock:0, reserve:0, demand:900, price:1 };
      FB.marketProvisionSource = function () { return market; };
      const stock = FB.armyProvisionQuote(s, host);
      const stockText = FB.armyProvisionText(s, host);
      market.stock = 1000;
      s.armyLogistics = { counties:{} };
      s.armyLogistics.counties[host.at] = { day:s.turn,
        used:market.demand / 90 * (FBDATA.balance.armyProvisionMarketDays || 2) };
      const loading = FB.armyProvisionQuote(s, host);
      const loadingText = FB.armyProvisionText(s, host);
      s.turn++;
      const tomorrow = FB.armyProvisionQuote(s, host);
      s.player.gold = 0;
      const coin = FB.armyProvisionQuote(s, host);
      return { stock:stock.reason, stockText:stockText, loading:loading.reason,
        loadingText:loadingText, tomorrow:tomorrow.units, coin:coin.reason };
    } finally { FB.marketProvisionSource = original; }
  });
  expect(r.stock).toBe('stock');
  expect(r.stockText).toContain('food stocks');
  expect(r.loading).toBe('loading');
  expect(r.loadingText).toContain('daily food-loading limit');
  expect(r.tomorrow).toBeGreaterThan(0);
  expect(r.coin).toBe('coin');
});

test('a recorded safe supply retreat continues during the search cooldown', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], stop = window.provisionIds.home;
    const names = ['armyProvisionQuote', 'armyRetreatGoal', 'armyFriendlyProvince', 'armyCanPursue', 'armyHasRouteTo'];
    const originals = {}; names.forEach(function (name) { originals[name] = FB[name]; });
    try {
      host.supply = 0; host.autoResupply = 1; delete host.supplySearchTurn;
      FB.armyProvisionQuote = function () { return { mode:'purchase', net:-1 }; };
      FB.armyRetreatGoal = function () { return stop; };
      FB.armyFriendlyProvince = function () { return true; };
      FB.armyCanPursue = function () { return true; };
      FB.armyHasRouteTo = function () { return true; };
      const first = FB.armySupplyGoal(s, host);
      host.goal = first; host.path = [first]; host.moveLeft = 3;
      const second = FB.armySupplyGoal(s, host);
      FB.armyCanPursue = function () { return false; };
      const unsafe = FB.armySupplyGoal(s, host);
      return { first:first === stop, second:second === stop, stayed:unsafe === host.at,
        cleared:host.supplyRetreat === undefined };
    } finally { names.forEach(function (name) { FB[name] = originals[name]; }); }
  });
  expect(r).toEqual({ first:true, second:true, stayed:true, cleared:true });
});

async function setup(page, testInfo) {
  const ids = await startWarSafety(page, testInfo);
  await page.evaluate(function (ids) {
    const s = FB.state, host = FB.playerHost(s);
    ids.neutral = s.realms[ids.other].capital;
    ids.target = s.realms[ids.enemy].capital;
    window.provisionIds = ids;
    s.date.season = 1;
    s.armies = [host];
    host.at = ids.neutral; host.from = host.at; host.path = [];
    host.goal = null; host.moveLeft = 0; host.holdManual = true;
    host.men = host.size = 1000; host.units = { levy:1000 }; host.supply = 50;
    s.player.gold = 100;
    s.armyLogistics = undefined;
    FB.game.auto.forceSupplies = false;
    FB.game.auto.buySupplies = true; FB.game.auto.supplyTarget = 75;
    FB.game.auto.hostResupply = true;
    FB.ensureMarket(s);
    for (const id in s.realms) s.armyDown[id] = s.turn;
    const g = s.market.goods.indexOf('provisions');
    for (const pid of [ids.home, ids.neutral, ids.target]) {
      const source = FB.marketProvisionSource(s, pid);
      s.market.counties[pid][0][g] = source.reserve;
      s.market.counties[pid][1][g] = 1;
    }
  }, ids);
}

test('supply searches reuse local quotes but read fresh inputs on the next call', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], original = FB.armyProvisionQuote;
    const retreat = FB.armyRetreatGoal, adj = FB.world.adj;
    let calls = 0;
    try {
      host.supply = 0; host.autoResupply = 1; host.supplyStop = host.at;
      delete host.supplySearchTurn;
      FB.world.adj = {}; FB.world.adj[host.at] = {};
      FB.armyRetreatGoal = function () { return null; };
      FB.armyProvisionQuote = function () { calls++; return { mode:'purchase', net:-1 }; };
      const first = FB.armySupplyGoal(s, host), firstCalls = calls;
      const second = FB.armySupplyGoal(s, host);
      return { first:first === host.at, second:second === host.at, firstCalls:firstCalls, calls:calls };
    } finally { FB.armyProvisionQuote = original; FB.armyRetreatGoal = retreat; FB.world.adj = adj; }
  });
  expect(result).toEqual({ first:true, second:true, firstCalls:1, calls:2 });
});

test('cashless searches retain free markets and skip paid candidate quotes', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], quoted = [];
    const old = { quote:FB.armyProvisionQuote, source:FB.marketProvisionSource,
      retreat:FB.armyRetreatGoal, adj:FB.world.adj };
    try {
      s.player.gold = 0; host.supply = 0; host.autoResupply = 1;
      delete host.supplyStop; delete host.supplySearchTurn;
      FB.world.adj = {}; FB.world.adj[host.at] = { paid:1, free:1 };
      FB.marketProvisionSource = function (state, pid) { return { price:pid === 'free' ? 0 : 1 }; };
      FB.armyProvisionQuote = function (state, army, pid) {
        quoted.push(pid); return { mode:'purchase', net:-1 };
      };
      FB.armyRetreatGoal = function () { return host.at; };
      const goal = FB.armySupplyGoal(s, host);
      return { paid:quoted.indexOf('paid') >= 0, free:quoted.indexOf('free') >= 0, home:goal === host.at };
    } finally {
      FB.armyProvisionQuote = old.quote; FB.marketProvisionSource = old.source;
      FB.armyRetreatGoal = old.retreat; FB.world.adj = old.adj;
    }
  });
  expect(result).toEqual({ paid:false, free:true, home:true });
});

test('daily paid provisioning preserves manual orders and conserves goods and payment', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = host.at;
    const before = FB.marketProvisionSource(s, pid).stock, gold = s.player.gold;
    const q = FB.armyProvisionQuote(s, host);
    s.treasuryAccounting.lastMilitaryTurn = s.turn - 1;
    const field = FB.hostFieldUpkeepParts(s, host).total / 90;
    FB.armyTick(s);
    const row = FB.armyProvisionCounty(s, pid).current;
    return { used:before - FB.marketProvisionSource(s, pid).stock, bought:row.bought,
      paid:gold - s.player.gold, quote:q.cost, field:field, dues:row.dues,
      supply:host.supply, held:host.holdManual, path:host.path, at:host.at, pid:pid,
      shock:s.market.shocks.some(function (x) { return x.provinceId === pid; }) };
  });
  expect(r.used).toBeCloseTo(r.bought, 8);
  expect(r.paid).toBeCloseTo(r.quote + r.field, 8);
  expect(r.dues).toBeCloseTo(r.quote * 0.1, 8);
  expect(r.used).toBeGreaterThan(0);
  expect(r.supply).toBeGreaterThan(50);
  expect(r.held).toBe(true); expect(r.path).toEqual([]); expect(r.at).toBe(r.pid);
  expect(r.shock).toBe(false);
});

test('purchases obey coin, stocks and the toggle; enemy requisition remains automatic', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = host.at;
    const before = FB.marketProvisionSource(s, pid).stock;
    FB.game.auto.buySupplies = false;
    const off = FB.provisionArmy(s, host);
    const untouched = FB.marketProvisionSource(s, pid).stock === before;
    FB.game.auto.buySupplies = true; s.player.gold = 0.00001;
    const poor = FB.provisionArmy(s, host), gold = s.player.gold;
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[pid][0][g] = 0; s.player.gold = 100;
    const empty = FB.provisionArmy(s, host);
    host.at = window.provisionIds.target; s.buildings[host.at] = [];
    FB.invalidateFortIndex(); FB.game.auto.buySupplies = false;
    const support = FB.countySupportBase(s, host.at);
    const taken = FB.provisionArmy(s, host);
    return { off:off.units, untouched:untouched, poor:poor.cost, gold:gold,
      empty:empty.units, taken:taken.units, mode:taken.mode,
      support:FB.countySupportBase(s, host.at) - support,
      paid:s.player.gold, shock:s.market.shocks.some(function (x) { return x.source === 'army_requisition'; }) };
  });
  expect(r.off).toBe(0); expect(r.untouched).toBe(true);
  expect(r.poor).toBeLessThanOrEqual(0.00001); expect(r.gold).toBeGreaterThanOrEqual(0);
  expect(r.empty).toBe(0); expect(r.taken).toBeGreaterThan(0);
  expect(r.mode).toBe('requisition'); expect(r.support).toBeLessThan(0);
  expect(r.paid).toBe(100); expect(r.shock).toBe(true);
});

test('enemy forts protect stores and reduce extraction until occupied or ruined', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = window.provisionIds.target;
    host.at = pid; host.men = host.size = 1000000; host.units = { levy:1000000 };
    s.buildings[pid] = []; FB.invalidateFortIndex();
    const open = FB.armyProvisionQuote(s, host);
    s.buildings[pid] = [{ s:0, id:'walls', level:3 }]; FB.invalidateFortIndex();
    const fortified = FB.armyProvisionQuote(s, host);
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[pid][0][g] = FB.marketProvisionSource(s, pid).reserve * 0.5;
    const protectedStock = FB.armyProvisionQuote(s, host).units;
    s.player.war.occupations[pid] = { occupied:true };
    const occupied = FB.armyProvisionQuote(s, host);
    s.player.war.occupations[pid].occupied = false;
    s.buildings[pid][0].ruined = true; FB.invalidateFortIndex();
    const ruined = FB.armyProvisionQuote(s, host);
    return { open:open.units, fortified:fortified.units, protection:fortified.protection,
      protectedStock:protectedStock, occupied:occupied.units, ruined:ruined.units };
  });
  expect(r.fortified).toBeCloseTo(r.open * 0.4, 8);
  expect(r.protection).toBeCloseTo(0.6, 8);
  expect(r.protectedStock).toBe(0);
  expect(r.occupied).toBeGreaterThan(0); expect(r.ruined).toBeGreaterThan(0);
});

test('hosts share county loading capacity and AI treasury payments survive save round trips', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = window.provisionIds.home;
    host.realm = window.provisionIds.other; host.at = pid; host.warId = null;
    FB.treasuryInitialize(s);
    s.realms[host.realm].treasury.gold = 100000;
    host.men = host.size = 1000000; host.units = { levy:1000000 };
    const gold = s.player.gold;
    const first = FB.provisionArmy(s, host);
    const second = FB.provisionArmy(s, Object.assign({}, host, { id:'second', supply:0 }));
    const data = JSON.stringify(s.armyLogistics), copy = JSON.parse(JSON.stringify(s));
    const rng = FB.getRngState();
    const q = FB.armyProvisionQuote(copy, copy.armies[0]);
    return { first:first.units, second:second.units, income:s.player.gold - gold,
      dues:FB.armyProvisionCounty(s, pid).current.dues,
      purse:s.realms[host.realm].treasury.gold,
      stable:JSON.stringify(copy.armyLogistics) === data, rng:rng === FB.getRngState(), quote:q.cost };
  });
  expect(r.first).toBeGreaterThan(0); expect(r.second).toBe(0);
  expect(r.income).toBeCloseTo(r.dues, 8); expect(r.income).toBeGreaterThan(0);
  expect(r.purse).toBeGreaterThanOrEqual(0); expect(r.stable).toBe(true); expect(r.rng).toBe(true);
});

test('seasonal markets retain route withdrawals without charging the food twice', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], first = host.at;
    FB.provisionArmy(s, host);
    host.at = window.provisionIds.home; s.turn++;
    FB.provisionArmy(s, host);
    const demand = FB.armyMarketDemand(s);
    const clone = JSON.parse(JSON.stringify(s));
    clone.armyLogistics = undefined;
    // No trade edges: both settlements must change stocks identically,
    // although the version with withdrawals reports extra military demand.
    const originalWorld = FB.world;
    FB.world = Object.assign({}, originalWorld, { adj:{} });
    s.armies = []; clone.armies = [];
    try {
      s.turn += 90; clone.turn = s.turn;
      FB.marketSeason(s);
      const stock = FB.marketProvisionSource(s, first).stock;
      const reported = FB.marketCounty(s, first).goods.provisions.demand;
      FB.marketSeason(clone);
      return { difference:stock - FB.marketProvisionSource(clone, first).stock,
        demand:reported - FB.marketCounty(clone, first).goods.provisions.demand,
        expected:demand[first], counties:Object.keys(demand).length,
        last:FB.armyProvisionCounty(s, first).last.bought,
        cleared:FB.armyProvisionCounty(s, first).current.bought };
    } finally { FB.world = originalWorld; }
  });
  expect(r.difference).toBeCloseTo(0, 8);
  expect(r.demand).toBeCloseTo(r.expected, 8);
  expect(r.counties).toBe(2); expect(r.last).toBeGreaterThan(0); expect(r.cleared).toBe(0);
});

test('empty markets cause starvation and stocked neutral markets restore the reserve', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = host.at;
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[pid][0][g] = 0; host.supply = 0;
    FB.armyTick(s);
    const starved = host.men;
    s.market.counties[pid][0][g] = FB.marketProvisionSource(s, pid).reserve;
    s.turn++; FB.armyTick(s);
    return { starved:starved, supplied:host.supply, after:host.men };
  });
  expect(r.starved).toBeLessThan(1000); expect(r.supplied).toBeGreaterThan(0);
  expect(r.after).toBe(r.starved);
});

test('automatic player and AI hosts seek stocked neutral markets and finish refitting at their target', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, ids = window.provisionIds, host = s.armies[0];
    const world = FB.world, adj = {}, byId = {};
    for (const pid of [ids.home, ids.neutral, ids.target]) {
      adj[pid] = {}; byId[pid] = world.byId[pid]; s.buildings[pid] = [];
    }
    adj[ids.home][ids.neutral] = 1; adj[ids.neutral][ids.home] = 1;
    adj[ids.target][ids.neutral] = 1; adj[ids.neutral][ids.target] = 1;
    FB.world = { adj:adj, byId:byId, waterAdj:{} };
    FB.invalidateFortIndex();
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[ids.home][0][g] = 0;
    s.market.counties[ids.target][0][g] = 0;
    host.at = ids.target; host.supply = 1;
    try {
      const playerGoal = FB.armySupplyGoal(s, host);
      const ai = Object.assign({}, host, { realm:ids.enemy, at:ids.home, from:ids.home,
        autoResupply:undefined, supplyStop:undefined, supplySearchTurn:undefined });
      const aiGoal = FB.armySupplyGoal(s, ai);
      host.at = ids.neutral; host.supply = 20;
      const waiting = FB.armySupplyGoal(s, host);
      host.supply = 75;
      const finished = FB.armySupplyGoal(s, host);
      return { player:playerGoal, ai:aiGoal, waiting:waiting, neutral:ids.neutral,
        finished:finished, refitting:!!host.autoResupply };
    } finally { FB.world = world; FB.invalidateFortIndex(); }
  });
  expect(r.player).toBe(r.neutral); expect(r.ai).toBe(r.neutral);
  expect(r.waiting).toBe(r.neutral); expect(r.finished).toBeNull(); expect(r.refitting).toBe(false);
});

test('holy-war occupation opens protected stores without creating food', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = window.provisionIds.target;
    host.at = pid; host.warId = 'holy';
    const occupations = {}; occupations[pid] = { occupied:false, progress:0 };
    s.greatHolyWar = { id:'supply-crusade', phase:'active', occupations:occupations,
      participants:{ attackers:[{ realm:'player', sovereign:true }],
        defenders:[{ realm:window.provisionIds.enemy, sovereign:true }] } };
    s.buildings[pid] = [{ s:0, id:'walls', level:4 }]; FB.invalidateFortIndex();
    const g = s.market.goods.indexOf('provisions');
    s.market.counties[pid][0][g] = FB.marketProvisionSource(s, pid).reserve * 0.5;
    const blocked = FB.armyProvisionQuote(s, host);
    occupations[pid].occupied = true;
    const opened = FB.provisionArmy(s, host);
    const remaining = FB.marketProvisionSource(s, pid).stock;
    s.market.counties[pid][0][g] = 0;
    const empty = FB.armyProvisionQuote(s, host);
    return { blocked:blocked.units, taken:opened.units, remaining:remaining,
      empty:empty.units, protection:opened.protection };
  });
  expect(r.blocked).toBe(0); expect(r.taken).toBeGreaterThan(0);
  expect(r.remaining).toBeGreaterThan(0); expect(r.empty).toBe(0); expect(r.protection).toBe(0);
});

test('basic provisioning needs no technology and supply innovations improve endurance', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], rid = FB.techRealmId(s, 'player');
    s.realmTech[rid] = { completed:[], exposed:[], active:[], progress:{}, reserve:0, priorities:{} };
    const base = FB.armyProvisionQuote(s, host);
    s.realmTech[rid].completed.push('pack_saddles', 'wheeled_carts', 'logistics_magazines');
    const better = FB.armyProvisionQuote(s, host);
    return { base:base.units, use:base.use, better:better.use,
      review:FBDATA.techImpactReviews.features.army_requisition.mode,
      validation:FB.validateTechnologyData() };
  });
  expect(r.base).toBeGreaterThan(0); expect(r.better).toBeLessThan(r.use);
  expect(r.review).toBe('none'); expect(r.validation).toEqual([]);
});

test('food prices affect the provisions forecast without charging food in standing upkeep', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], gold = s.player.gold;
    const g = s.market.goods.indexOf('provisions');
    const before = FB.playerHostUpkeepParts(s).total;
    const food = FB.playerProvisionEstimate(s);
    s.market.counties[host.at][1][g] = 2;
    const after = FB.playerHostUpkeepParts(s).total;
    const expensive = FB.playerProvisionEstimate(s);
    FB.game.auto.buySupplies = false;
    return { before:before, after:after, food:food, expensive:expensive,
      off:FB.playerProvisionEstimate(s), gold:s.player.gold, original:gold };
  });
  expect(r.food).toBeGreaterThan(0);
  expect(r.expensive).toBeCloseTo(r.food * 2, 8);
  expect(r.after).toBeCloseTo(r.before, 8);
  expect(r.off).toBe(0); expect(r.gold).toBe(r.original);
});

for (const width of [390, 1280]) {
  test('provisioning controls preserve focus and expose consequences at ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({ width:width, height:844 });
    await setup(page, testInfo);
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    const toggle = page.locator('#ar-buy-supplies'), slider = page.locator('#ar-supply-target');
    await expect(toggle).toBeChecked(); await expect(slider).toHaveValue('75');
    await expect(page.locator('[data-provision-controls]')).toContainText('Enemy land: food is requisitioned automatically');
    const details = page.locator('[aria-controls="ar-supply-target-details"]');
    if (width >= 1000) {
      await slider.focus();
      await expect(page.locator('#tooltip')).toContainText('Friendly and neutral land can be requisitioned only');
    } else {
      await details.click();
      await expect(details).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator('#ar-supply-target-details')).toBeVisible();
      await expect(page.locator('#ar-supply-target-details')).toContainText('Friendly and neutral land can be requisitioned only');
      await details.click();
      await expect(details).toHaveAttribute('aria-expanded', 'false');
    }
    await slider.focus(); await page.keyboard.press('ArrowRight');
    await expect(slider).toBeFocused(); await expect(slider).toHaveValue('80');
    await expect(page.locator('#ar-supply-value')).toHaveText('80%');
    await toggle.uncheck();
    expect(await page.evaluate(function () {
      const stored = JSON.parse(localStorage.getItem('fb_automation'));
      return { buy:stored.buySupplies, target:stored.supplyTarget };
    })).toEqual({ buy:false, target:80 });
    const geometry = await slider.evaluate(function (el) {
      const rect = el.getBoundingClientRect();
      return { height:rect.height, right:rect.right, width:window.innerWidth };
    });
    expect(geometry.height).toBeGreaterThanOrEqual(44);
    expect(geometry.right).toBeLessThanOrEqual(geometry.width);
    await expect(page.locator('#gm-body > .gm-footer button')).toHaveText(['Back', 'Close']);
    await page.locator('#gm-body > .gm-footer [data-modal-nav="close"]').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    await expect(slider).toHaveValue('80'); await expect(toggle).not.toBeChecked();
  });
}

for (const realm of ['player', 'regional_ai']) {
  test('regional provisions conserve stock, prices and shared loading for ' + realm, async function ({ page }, testInfo) {
    await setup(page, testInfo);
    const r = await page.evaluate(function (realm) {
      const s = FB.state, host = s.armies[0];
      const saved = { adj:FB.world.adj, byId:FB.world.byId, water:FB.world.waterAdj,
        source:FB.marketProvisionSource, withdraw:FB.marketWithdrawProvisions,
        hostile:FB.armiesHostile, tech:FB.techBonus, available:FB.treasuryAvailable,
        spend:FB.treasurySpend, credit:FB.treasuryCredit };
      try {
        s.realms.regional_ai = { alive:true };
        s.realms.player = { alive:true };
        s.realms.regional_seller = { alive:true, liege:realm };
        s.realms.regional_foreign = { alive:true };
        s.holder = { a:realm, b:'regional_seller', c:'regional_seller', d:realm };
        s.owner = { a:realm, b:realm, c:realm, d:realm };
        s.occupations = {}; s.wars = {}; s.greatHolyWar = null; s.player.war = null;
        FB.world.byId = { a:{}, b:{}, c:{}, d:{} };
        FB.world.adj = { a:{b:1}, b:{a:1,c:1}, c:{b:1,d:1}, d:{c:1} };
        FB.world.waterAdj = {};
        FB.armiesHostile = function (state, army, other) { return other.realm === 'enemy'; };
        FB.techBonus = function () { return 0; };
        let funds = 100, spent = 0;
        FB.treasuryAvailable = function () { return funds; };
        FB.treasurySpend = function (state, id, amount) { funds -= amount; spent += amount; };
        FB.treasuryCredit = function () {};
        s.treasuryAccounting = { mode:'active' };
        host.realm = realm; host.at = 'a'; host.path = []; host.moveLeft = 0;
        host.men = 3240; host.units = { levy:3240 }; host.supply = 10;
        const markets = { a:{stock:0.2,demand:45,price:1,reserve:0},
          b:{stock:50,demand:45,price:2,reserve:0},
          c:{stock:50,demand:450,price:3,reserve:0},
          d:{stock:50,demand:450,price:1,reserve:0} };
        FB.marketProvisionSource = function (state, pid) { return markets[pid] || null; };
        FB.marketWithdrawProvisions = function (state, pid, amount) {
          if (markets[pid].stock < amount) return false;
          markets[pid].stock -= amount; return true;
        };
        const before = JSON.stringify([markets, s.armyLogistics, s.player.gold]);
        const q = FB.armyProvisionQuote(s, host);
        const pure = before === JSON.stringify([markets, s.armyLogistics, s.player.gold]);
        const text = FB.armyProvisionText(s, host);
        const price = FBDATA.balance.armyProvisionPrice;
        const expectedCost = q.sources.reduce(function (sum, row) { return sum + row.units * markets[row.pid].price * price; }, 0);
        const applied = FB.provisionArmy(s, host);
        const next = FB.armyProvisionQuote(s, host);
        const ledger = s.armyLogistics.counties;
        const sourceTotals = Object.keys(ledger).reduce(function (sum, pid) { return sum + ledger[pid].bought; }, 0);
        const payment = realm === 'player' ? 100 - s.player.gold + ledger.a.dues + ledger.b.dues * 0.2 + ledger.c.dues * 0.2 : spent;
        return { pure:pure, order:q.sources.map(function (row) { return row.pid; }),
          local:q.sources[0].units, nearby:q.sources[1].units, cost:q.cost, expectedCost:expectedCost,
          payment:payment, sourceTotals:sourceTotals, units:applied.units,
          untouched:markets.d.stock, nextUsesB:next.sources.some(function (row) { return row.pid === 'b'; }),
          net:q.net, refill:FBDATA.balance.supplyRecoverRate, supply:host.supply,
          regionalText:text.indexOf('nearby markets') >= 0 };
      } finally {
        FB.world.adj = saved.adj; FB.world.byId = saved.byId; FB.world.waterAdj = saved.water;
        FB.marketProvisionSource = saved.source; FB.marketWithdrawProvisions = saved.withdraw;
        FB.armiesHostile = saved.hostile; FB.techBonus = saved.tech;
        FB.treasuryAvailable = saved.available; FB.treasurySpend = saved.spend; FB.treasuryCredit = saved.credit;
      }
    }, realm);
    expect(r.pure).toBe(true);
    expect(r.order).toEqual(['a', 'b', 'c']);
    expect(r.local).toBeCloseTo(0.2);
    expect(r.nearby).toBeCloseTo(1);
    expect(r.cost).toBeCloseTo(r.expectedCost);
    expect(r.payment).toBeCloseTo(r.cost);
    expect(r.sourceTotals).toBeCloseTo(r.units);
    expect(r.untouched).toBe(50);
    expect(r.nextUsesB).toBe(false);
    expect(r.net).toBeCloseTo(r.refill);
    expect(r.supply).toBeCloseTo(10 + r.refill);
    expect(r.regionalText).toBe(true);
  });
}

test('regional resupply respects movement, safe routes, funds and purchasing preferences', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0];
    s.realms.player = { alive:true }; s.holder = { a:'player', b:'player', c:'player' };
    s.owner = Object.assign({}, s.holder); s.occupations = {}; s.wars = {};
    s.greatHolyWar = null; s.player.war = null;
    FB.world.byId = { a:{}, b:{}, c:{} };
    FB.world.adj = { a:{b:1}, b:{a:1,c:1}, c:{b:1} }; FB.world.waterAdj = {};
    FB.armiesHostile = function (state, army, other) { return other.realm === 'enemy'; };
    FB.marketProvisionSource = function (state, pid) { return { stock:pid === 'c' ? 100 : 0, demand:900, price:1, reserve:0 }; };
    host.at = 'a'; host.path = []; host.moveLeft = 0; host.supply = 1;
    function units() { return FB.armyProvisionQuote(s, host).units; }
    const available = units();
    host.path = ['b']; const moving = units();
    const arrival = FB.armyProvisionQuote(s, host, 'a', undefined, true).units;
    host.path = []; host.moveLeft = 1; const marching = units(); host.moveLeft = 0;
    FB.world.waterAdj = { a:{b:{}} }; const water = units(); FB.world.waterAdj = {};
    s.occupations.b = { occupied:true }; const occupied = units(); s.occupations = {};
    s.wars.test = { fortSieges:{ b:{} } }; const siege = units(); s.wars = {};
    s.wars.test = { status:'active', occupations:{ b:{ occupied:true } } };
    const warOccupation = units(); s.wars = {};
    s.holder.b = 'foreign'; const foreign = units(); s.holder.b = 'player';
    s.armies.push({ at:'b', realm:'enemy', men:10 }); const enemy = units(); s.armies.pop();
    s.player.gold = 0; const broke = units(); s.player.gold = 0.01;
    const budget = FB.armyProvisionQuote(s, host); s.player.gold = 100;
    FB.game.auto.buySupplies = false; const disabled = units(); FB.game.auto.buySupplies = true;
    host.supply = FB.armyProvisionTarget(host);
    const target = FB.armyProvisionQuote(s, host);
    return { available:available, arrival:arrival, blocked:[moving,marching,water,occupied,siege,warOccupation,foreign,enemy,broke,disabled],
      cost:budget.cost, limited:budget.units < available, targetNet:target.net };
  });
  expect(r.available).toBeGreaterThan(0);
  expect(r.arrival).toBeCloseTo(r.available);
  expect(r.blocked).toEqual([0,0,0,0,0,0,0,0,0,0]);
  expect(r.cost).toBeCloseTo(0.01);
  expect(r.limited).toBe(true);
  expect(r.targetNet).toBeCloseTo(0);
});


test('forced provisions in debt take real local food and punish the direct ruler relationship', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = host.at;
    const sovereign = s.owner[pid], holder = window.provisionIds.enemy;
    s.holder[pid] = holder;
    const hostile = FB.armiesHostile;
    FB.armiesHostile = function () { return false; };
    try {
      s.player.gold = -6000; FB.game.auto.buySupplies = false;
      const target = { kind:'realm', id:holder };
      FB.adjustStanding(s, target, 40 - FB.standingOf(s, target));
      const support = FB.countySupportBase(s, pid);
      const stock = FB.marketProvisionSource(s, pid).stock;
      const disabled = FB.armyProvisionQuote(s, host);
      FB.game.auto.forceSupplies = true;
      const preview = FB.armyProvisionQuote(s, host);
      const pure = FB.standingOf(s, target) === 40 && FB.countySupportBase(s, pid) === support;
      const first = FB.provisionArmy(s, host);
      const firstStanding = FB.standingOf(s, target);
      s.turn++;
      FB.provisionArmy(s, host);
      const secondStanding = FB.standingOf(s, target);
      const row = s.armyLogistics.counties[pid];
      const supportAfter = FB.countySupportBase(s, pid);
      const remaining = FB.marketProvisionSource(s, pid).stock;
      const g = s.market.goods.indexOf('provisions'); s.market.counties[pid][0][g] = 0;
      s.turn++; FB.provisionArmy(s, host);
      const emptyHarmless = FB.standingOf(s, target) === secondStanding && FB.countySupportBase(s, pid) === supportAfter;
      return { disabled:disabled.reason, pure:pure, forced:preview.forced, mode:first.mode,
        sources:preview.sources.map(function (source) { return source.pid; }), pid:pid,
        firstStanding:firstStanding, secondStanding:secondStanding, supportLoss:supportAfter < support,
        gold:s.player.gold, taken:row.taken, withdrawn:stock - remaining, paid:row.paid,
        emptyHarmless:emptyHarmless, directDiffers:holder !== sovereign };
    } finally { FB.armiesHostile = hostile; }
  });
  expect(r.disabled).toBe('disabled'); expect(r.pure).toBe(true);
  expect(r.forced).toBe(true); expect(r.mode).toBe('requisition');
  expect(r.sources).toEqual([r.pid]); expect(r.directDiffers).toBe(true);
  expect(r.firstStanding).toBeLessThanOrEqual(-25);
  expect(r.secondStanding).toBeLessThan(r.firstStanding);
  expect(r.supportLoss).toBe(true); expect(r.gold).toBe(-6000);
  expect(r.taken).toBeCloseTo(r.withdrawn); expect(r.paid).toBe(0);
  expect(r.emptyHarmless).toBe(true);
});

test('forced provision setting is explicit, defaults off and persists when selected', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  await page.evaluate(function () { FB.ui.showAutoResolve(); });
  const toggle = page.locator('#ar-force-supplies');
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  expect(await page.evaluate(function () {
    return FB.game.auto.forceSupplies && JSON.parse(localStorage.getItem('fb_automation')).forceSupplies;
  })).toBe(true);
  await toggle.uncheck();
  expect(await page.evaluate(function () { return FB.game.auto.forceSupplies; })).toBe(false);
});


test('offensive supply retreat chooses nearby realm land instead of the capital', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0];
    const names = ['armyProvisionQuote', 'armyFriendlyProvince', 'fortBlocksArmy',
      'countyOccupiedOrBesieged', 'armiesHostile'];
    const originals = {};
    names.forEach(function (name) { originals[name] = FB[name]; });
    try {
      const start = host.at;
      const nearby = Object.keys(FB.world.adj[start]).sort().filter(function (pid) {
        return !FB.world.byId[pid].wasteland;
      });
      if (!nearby.length) throw new Error('Fixture needs neighboring land');
      const capital = Object.keys(FB.world.byId).filter(function (pid) {
        return pid !== start && nearby.indexOf(pid) < 0 && !FB.world.byId[pid].wasteland;
      })[0];
      s.player.provinceId = capital;
      if (s.realms.player) s.realms.player.capital = capital;
      s.player.gold = 1000;
      Object.keys(FB.world.byId).forEach(function (pid) {
        s.owner[pid] = 'player'; s.holder[pid] = 'player';
      });
      FB.armyFriendlyProvince = function (state, army, pid) { return pid !== start; };
      FB.fortBlocksArmy = function () { return false; };
      FB.countyOccupiedOrBesieged = function () { return false; };
      FB.armiesHostile = function () { return false; };
      FB.armyProvisionQuote = function () { return { mode:'purchase', net:-1 }; };
      FB.game.auto.hosts = 'off';
      host.supply = 0; host.autoResupply = 1;
      delete host.supplyStop; delete host.supplyRetreat; delete host.supplySearchTurn;
      const goal = FB.armySupplyGoal(s, host);
      const retained = FB.armySupplyGoal(s, host);
      // An unsafe nearest county must not remain a supply destination.
      FB.countyOccupiedOrBesieged = function (state, pid) { return pid === goal; };
      delete host.supplySearchTurn;
      const replacement = FB.armySupplyGoal(s, host);
      host.supply = FB.armyProvisionTarget(host);
      const complete = FB.armySupplyGoal(s, host);
      return { goal:goal, expected:nearby[0], capital:capital, retained:retained,
        replacement:replacement, complete:complete, cleaned:host.supplyRetreat === undefined };
    } finally {
      names.forEach(function (name) { FB[name] = originals[name]; });
    }
  });
  expect(result.goal).toBe(result.expected);
  expect(result.goal).not.toBe(result.capital);
  expect(result.retained).toBe(result.goal);
  expect(result.replacement).not.toBe(result.goal);
  expect(result.complete).toBeNull();
  expect(result.cleaned).toBe(true);
});
