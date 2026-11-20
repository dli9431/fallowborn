'use strict';

const path = require('node:path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/actions.js', 'js/economy.js', 'js/market.js', 'js/mods.js', 'js/save.js',
  'js/technology.js', 'js/travel.js', 'js/ui_misc.js', 'js/ui_modals.js', 'css/style.css',
  'data/actions.js', 'data/economy.js', 'data/markets.js', 'data/technology.js', 'data/travel.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');

test.describe.configure({ mode:'parallel' });

async function arriveAtMarket(page, preset, funds, stock, stayComplete) {
  return page.evaluate(function ({preset, funds, stock, stayComplete}) {
    const s = FB.state, p = s.player;
    const before = FB.tradeInvestmentStakes(s);
    p.gold = 200;
    const market = FB.tradeVentureMarkets(s).find(function (market) {
      return FB.tradeVentureCanStart(s, 'accompany', preset, market.destinationId, 'wares') === true;
    });
    if (!market || !FB.travelStart(s, 'trade', market.destinationId, market.destinationRealm,
      {kind:'trade_venture', stake:preset, goodId:'wares'})) throw new Error('No ordinary trade departure');
    const t = p.travel;
    t.currentId = t.destinationId;
    t.visited = [t.homeId].concat(t.outboundRoute);
    t.remainingRoute = [];
    FB.travelTick(s);
    if (!FB.travelTradeSettle(s, 'cautious', 1.2)) throw new Error('Outbound trade did not settle');
    if (stayComplete) t.stayStartTurn = s.turn - FBDATA.balance.travelMinStayDays;
    p.gold = funds;
    const book = FB.ensureMarket(s), at = book.goods.indexOf('wares');
    const local = book.counties[t.destinationId], home = book.counties[t.homeId];
    local[0].fill(0);
    local[0][at] = stock;
    local[1][at] = 1.25;
    const luxuries = book.goods.indexOf('luxuries');
    local[0][luxuries] = 0.7;
    local[1][luxuries] = 1.25;
    home[0][at] = 40;
    home[1][at] = 1.5;
    return {home:t.homeId, route:FB.travelTradeReturnRoad(t).route, outbound:t.venture,
      presets:FB.tradeVentureStakes(s), passiveBefore:before, passiveAfter:FB.tradeInvestmentStakes(s)};
  }, {preset, funds, stock, stayComplete});
}

async function cargoState(page) {
  return page.evaluate(function () {
    const s = FB.state, p = s.player, t = p.travel;
    return {gold:p.gold, stock:FB.marketCounty(s, t.destinationId).goods.wares.stock,
      cargo:t.returnVenture || null, outbound:t.venture, phase:t.phase,
      turn:s.turn, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter()};
  });
}

async function openSmallerPicker(page, deed) {
  await page.evaluate(function (id) { FB.runInstant(FB.state, id); }, deed);
  await expect(page.getByRole('heading', {name:'Prepare for the road home'})).toBeVisible();
  await page.locator('#return-cargo-smaller').click();
  await expect(page.getByRole('heading', {name:'Choose a smaller return stake'})).toBeVisible();
}

async function expectFact(page, label, amount, exact) {
  const money = await page.evaluate(function ({amount, exact}) {
    return FB.money(amount, {exact:exact});
  }, {amount, exact});
  await expect(page.locator('[data-return-cargo-review] .kv').filter({
    has:page.getByText(label, {exact:true})
  }).locator('b')).toHaveText(money);
}

test('native smaller stakes are bounded by stock and preserve the picker and empty return', async function ({page}, info) {
  await page.setViewportSize({width:960, height:365});
  await openGame(page, info);
  await startDeterministicGame(page);
  const journey = await arriveAtMarket(page, 10, 6.5, 2.4, true);
  expect(journey.presets).toEqual([10, 20, 50]);
  expect(journey.passiveAfter).toEqual(journey.passiveBefore);
  const before = await cargoState(page);
  const guards = await page.evaluate(function () {
    const s = FB.state, p = s.player, t = p.travel;
    const quote = FB.tradeVentureReturnPreview(s, 3, 'wares', true);
    const invalid = [0, -1, 2.5, '2', 10].map(function (stake) {
      return FB.tradeVentureReturnPreview(s, stake, 'wares', true);
    });
    const overStock = FB.tradeVentureCanLoadReturn(s, 4, 'wares', true);
    const unreviewed = FB.loadTradeVentureReturn(s, 3, 'wares', 'cautious');
    const outbound = FB.tradeVenturePreview(s, 3, t.destinationId, 'wares');
    const id = p.charId;
    const actor = s.chars[id];
    const dead = actor.dead;
    actor.dead = true;
    const unavailableActor = FB.loadTradeVentureReturn(s, 3, 'wares', 'cautious', quote);
    actor.dead = dead;
    const other = Object.keys(s.chars).find(function (key) { return key !== id && !s.chars[key].dead; });
    p.charId = other;
    const differentActor = FB.loadTradeVentureReturn(s, 3, 'wares', 'cautious', quote);
    p.charId = id;
    t.startTurn++;
    const differentJourney = FB.loadTradeVentureReturn(s, 3, 'wares', 'cautious', quote);
    t.startTurn--;
    return {invalid, overStock, unreviewed, outbound, unavailableActor, differentActor, differentJourney,
      cap:quote.smallerStakeLimit, technology:FBDATA.techImpactReviews.features.trade_venture_return_cargo.mode};
  });
  expect(guards).toEqual({invalid:[null, null, null, null, null], overStock:expect.stringContaining('cannot supply'),
    unreviewed:null, outbound:null, unavailableActor:null, differentActor:null, differentJourney:null,
    cap:9, technology:'none'});
  expect(await cargoState(page)).toEqual(before);

  await openSmallerPicker(page, 'travel_turn_back');
  const good = page.getByLabel('Commodity', {exact:true}), stake = page.getByLabel('Return stake', {exact:true});
  const review = page.locator('#return-small-review');
  await expect(good).toHaveValue('wares');
  await expect(good.locator('option[value="luxuries"]')).toBeDisabled();
  await expect(stake).toHaveAttribute('max', '3');
  await expect(stake).toHaveValue('3');
  await stake.fill('4');
  await expect(review).toBeDisabled();
  await stake.fill('2.5');
  await expect(stake).toHaveAttribute('aria-invalid', 'true');
  await expect(review).toBeDisabled();
  await stake.fill('2');
  const scroll = await review.evaluate(function (button) {
    const body = document.getElementById('gm-body');
    button.focus({preventScroll:true});
    body.scrollTop = 120;
    const top = body.scrollTop;
    button.click();
    return top;
  });
  expect(scroll).toBeGreaterThan(0);
  await expectFact(page, 'Return stake', 2, true);
  await expectFact(page, 'Lading fee', 0.2, true);
  await expectFact(page, 'Total paid now', 2.2, true);
  await expectFact(page, 'Cash left after purchase', 4.3, true);
  await expect(page.locator('[data-return-cargo-review]')).toContainText('1.6 units');
  await page.getByRole('button', {name:'Back', exact:true}).click();
  await expect(review).toBeFocused();
  await expect(stake).toHaveValue('2');
  await expect(good).toHaveValue('wares');
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(scroll);
  await page.keyboard.press('Escape');
  await expect(page.locator('#return-cargo-smaller')).toBeFocused();
  await expect(page.locator('[data-return-stake="10"]')).toBeDisabled();
  await page.locator('#return-cargo-unladen').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await cargoState(page)).toEqual({...before, phase:'return'});
  expect(await page.evaluate(function () { return FB.state.player.travel.remainingRoute; })).toEqual(journey.route);
});

test('imported fractional lading requotes changed terms and a restored small load sells once', async function ({page}, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(__dirname, '../fixtures/authoring/passage-choice-fractional-lading.json'));
  await Promise.all([page.waitForEvent('load'), page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page, '1066', 'apprentice');
  const journey = await arriveAtMarket(page, 6, 5.53, 4, false);
  expect(journey.presets).toEqual([6, 16, 32]);
  const cashLimits = await page.evaluate(function () {
    const s = FB.state;
    const maximum = function () {
      return FB.tradeVentureSmallerReturnGoods(s).find(function (good) { return good.id === 'wares'; }).maxStake;
    };
    const exact = maximum();
    s.player.gold = 5.52;
    const short = maximum();
    s.player.gold = 1.10;
    const none = maximum();
    s.player.gold = 5.53;
    return {exact, short, none};
  });
  expect(cashLimits).toEqual({exact:5, short:4, none:0});
  await openSmallerPicker(page, 'travel_return_cargo');
  await expect(page.getByLabel('Return stake', {exact:true})).toHaveValue('5');
  await page.locator('#return-small-review').click();
  const confirm = page.locator('#return-load-cautious');
  const unladen = page.locator('#return-cargo-unladen');
  await expect(unladen).toBeDisabled();
  await expect(confirm).toBeEnabled();
  await expect(page.locator('#return-load-bold')).toBeEnabled();
  await expectFact(page, 'Lading fee', 0.53, true);
  await expectFact(page, 'Total paid now', 5.53, true);
  await expectFact(page, 'Cash left after purchase', 0, true);

  await page.evaluate(function () { FB.state.player.gold = 5.52; });
  const short = await cargoState(page);
  await confirm.click();
  await expect(confirm).toBeDisabled();
  await expectFact(page, 'Shortfall', 0.01, true);
  expect(await cargoState(page)).toEqual(short);

  await page.evaluate(function () { FB.state.player.gold = 5.53; });
  await page.keyboard.press('Escape');
  await page.locator('#return-small-review').click();
  await page.evaluate(function () {
    const s = FB.state, t = s.player.travel, at = s.market.goods.indexOf('wares');
    s.market.counties[t.destinationId][0][at] = 3.9;
  });
  const scarce = await cargoState(page);
  await confirm.click();
  await expect(confirm).toBeDisabled();
  await expect(confirm).toContainText('cannot supply');
  expect(await cargoState(page)).toEqual(scarce);

  await page.evaluate(function () {
    const s = FB.state, t = s.player.travel, at = s.market.goods.indexOf('wares');
    s.market.counties[t.destinationId][0][at] = 5;
  });
  await page.keyboard.press('Escape');
  await page.locator('#return-small-review').click();
  const roadRejection = await page.evaluate(function () {
    const s = FB.state, t = s.player.travel, next = FB.travelTradeReturnRoad(t).route[0];
    const edges = FB.world.adj[t.destinationId], saved = edges[next];
    const quote = FB.tradeVentureReturnPreview(s, 5, 'wares', true);
    delete edges[next];
    const result = FB.loadTradeVentureReturn(s, 5, 'wares', 'cautious', quote);
    edges[next] = saved;
    return result;
  });
  expect(roadRejection).toBeNull();
  await page.evaluate(function () {
    const s = FB.state, t = s.player.travel, at = s.market.goods.indexOf('wares');
    s.market.counties[t.destinationId][1][at] = 2;
    s.market.counties[t.homeId][1][at] = 1.75;
  });
  const repriced = await cargoState(page);
  await confirm.click();
  await expect(page.getByRole('status').filter({hasText:'The return terms changed'})).toBeVisible();
  await expect(page.locator('[data-return-cargo-review]')).toContainText('2.5 units');
  expect(await cargoState(page)).toEqual(repriced);
  await confirm.evaluate(function (button) { button.click(); button.click(); });
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  const paid = await cargoState(page);
  expect(paid.cargo).toMatchObject({stake:5, ladingFee:0.53, totalCost:5.53,
    quantity:2.5, destPrice:2, homePrice:1.75, destinationId:journey.home, strategy:'cautious', status:'active'});
  expect(paid).toEqual({...repriced, gold:0, stock:2.5, cargo:paid.cargo});
  const save = await page.evaluate(function () { return FB.save.serialize(); });
  expect(JSON.parse(save).mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
  await restoreBookmark(page, save);
  expect(await cargoState(page)).toEqual(paid);
  const settled = await page.evaluate(function () {
    const s = FB.state, t = s.player.travel, at = s.market.goods.indexOf('wares');
    const duplicate = FB.loadTradeVentureReturn(s, 5, 'wares', 'cautious',
      FB.tradeVentureReturnPreview(s, 5, 'wares', true));
    t.stayStartTurn = s.turn - FBDATA.balance.travelMinStayDays;
    FB.runInstant(s, 'travel_turn_back');
    const route = t.remainingRoute.slice();
    s.market.counties[t.homeId][1][at] = 2.4;
    t.currentId = route.length > 1 ? route[route.length - 2] : t.destinationId;
    t.remainingRoute = [t.homeId];
    t.legDaysLeft = 1;
    FB.travelTick(s);
    return {duplicate, secondSale:FB.resolveReturnTradeVenture(s, t), route, cargo:t.returnVenture,
      gold:s.player.gold, travel:s.player.travel, stock:FB.marketCounty(s, t.homeId).goods.wares.stock,
      outbound:t.venture};
  });
  expect(settled).toMatchObject({duplicate:null, secondSale:false, route:journey.route,
    cargo:{status:'resolved', payout:9, deliveredQuantity:2.5, arrivalPrice:2.4}, gold:9,
    travel:null, stock:42.5, outbound:journey.outbound});
});
