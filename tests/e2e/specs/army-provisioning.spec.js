'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'js/logistics.js', 'js/market.js', 'js/armies.js', 'js/wars.js', 'js/actions.js',
  'js/rebellions.js', 'js/fortifications.js', 'js/holywar.js', 'js/modifiers.js',
  'js/main.js', 'js/ui_modals.js', 'js/ui_panels.js', 'css/style.css',
  'data/map_data.js', 'data/markets.js', 'data/technology.js', 'data/units.js'
]);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

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

test('daily paid provisioning preserves manual orders and conserves goods and payment', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = host.at;
    const before = FB.marketProvisionSource(s, pid).stock, gold = s.player.gold;
    const q = FB.armyProvisionQuote(s, host);
    FB.armyTick(s);
    const row = FB.armyProvisionCounty(s, pid).current;
    return { used:before - FB.marketProvisionSource(s, pid).stock, bought:row.bought,
      paid:gold - s.player.gold, quote:q.cost, dues:row.dues,
      supply:host.supply, held:host.holdManual, path:host.path, at:host.at, pid:pid,
      shock:s.market.shocks.some(function (x) { return x.provinceId === pid; }) };
  });
  expect(r.used).toBeCloseTo(r.bought, 8);
  expect(r.paid).toBeCloseTo(r.quote, 8);
  expect(r.dues).toBeCloseTo(r.paid * 0.1, 8);
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

test('hosts share county loading capacity and AI purses survive save round trips', async function ({ page }, testInfo) {
  await setup(page, testInfo);
  const r = await page.evaluate(function () {
    const s = FB.state, host = s.armies[0], pid = window.provisionIds.home;
    host.realm = window.provisionIds.other; host.at = pid; host.warId = null;
    host.men = host.size = 1000000; host.units = { levy:1000000 };
    const gold = s.player.gold;
    const first = FB.provisionArmy(s, host);
    const second = FB.provisionArmy(s, Object.assign({}, host, { id:'second', supply:0 }));
    const data = JSON.stringify(s.armyLogistics), copy = JSON.parse(JSON.stringify(s));
    const rng = FB.getRngState();
    const q = FB.armyProvisionQuote(copy, copy.armies[0]);
    return { first:first.units, second:second.units, income:s.player.gold - gold,
      dues:FB.armyProvisionCounty(s, pid).current.dues,
      purse:s.armyLogistics.purses[host.realm].gold,
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
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#ar-supply-target-details')).toBeVisible();
    await expect(page.locator('#ar-supply-target-details')).toContainText('Neutral land is never requisitioned');
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'false');
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
    await page.locator('#ar-close').click();
    await page.evaluate(function () { FB.ui.showAutoResolve(); });
    await expect(slider).toHaveValue('80'); await expect(toggle).not.toBeChecked();
  });
}
