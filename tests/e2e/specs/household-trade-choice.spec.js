'use strict';
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename, [
  'js/ui_modals.js', 'js/ui_misc.js', 'js/market.js', 'js/economy.js',
  'js/travel.js', 'js/station.js', 'js/mods.js', 'js/save.js',
  'data/economy.js', 'data/markets.js', 'data/travel.js', 'data/starts.js',
  'data/bookmarks.js', 'data/geographies.js', 'css/style.css'
]);

// Every case owns a fresh page and campaign; no daily simulation is needed.
test.describe.configure({mode:'parallel'});

async function begin(page, info, date, scenario) {
  await openGame(page, info);
  await beginBookmarkFromTitle(page, date || '867', scenario || 'farmer');
}

async function stageQuote(page, options) {
  return page.evaluate(function (input) {
    const s = FB.state;
    s.player.gold = input.gold || 80;
    FB.ensureMarket(s); FB.ensureEconomy(s); FB.travelEnsure(s);
    const stake = input.stake || 10, goodId = input.goodId || 'provisions';
    const markets = FB.tradeVentureMarkets(s);
    const market = markets.filter(function (m) {
      return FB.tradeVentureCanStart(s, 'dispatch', stake, m.destinationId, goodId) === true;
    })[0];
    if (!market) throw new Error('No fundable canonical venture');
    const q = FB.tradeVenturePreview(s, stake, market.destinationId, goodId);
    FB.tradeVentureCanStart(s, 'accompany', stake, q.destinationId, goodId);
    FB.namedChance(s, 'travel_trade');
    window.tradeChoiceBefore = {state:JSON.stringify(s), rng:FB.getRngState(), uid:FB.getUidCounter()};
    return {
      preview:q, gold:s.player.gold, charId:s.player.charId,
      capital:FB.money(s.player.gold), cost:FB.money(q.totalCost),
      overhead:FB.money(q.overhead), left:FB.money(s.player.gold - q.totalCost),
      purchase:FB.T('{quantity} units at {price}×', {
        quantity:Math.round(q.quantity * 10) / 10, price:q.originPrice
      }),
      destinationPrice:FB.T('{price}×', {price:q.destinationPrice}),
      minimumStay:FBDATA.balance.travelMinStayDays,
      partnerStakes:FB.tradeInvestmentStakes(s)
    };
  }, options || {});
}

async function openReview(page, quote, source) {
  await page.evaluate(function (from) { FB.ui.showTradeVentureSetup(from); }, source || 'finance');
  await page.locator('[data-venture-stake="' + quote.preview.stake + '"]').click();
  await page.locator('[data-venture-good="' + quote.preview.goodId + '"]').click();
  await page.locator('[data-travel-destination="' + quote.preview.destinationId + '"]').click();
  await page.locator('#travel-picker-continue').click();
  await expect(page.getByRole('heading', {name:'Review your venture', exact:true})).toBeVisible();
}

async function expectUnspent(page) {
  expect(await page.evaluate(function () {
    const before = window.tradeChoiceBefore;
    return {state:JSON.stringify(FB.state) === before.state,
      rng:FB.getRngState() === before.rng, uid:FB.getUidCounter() === before.uid};
  })).toEqual({state:true, rng:true, uid:true});
}

async function expectQuote(page, q) {
  const facts = page.locator('[data-venture-review]');
  for (const pair of [['Available capital', q.capital], ['Total paid now', q.cost],
    ['Route overhead', q.overhead], ['Capital left after departure', q.left],
    ['Origin purchase', q.purchase], ['Current destination price', q.destinationPrice]]) {
    await expect(facts.locator('.kv').filter({has:page.getByText(pair[0], {exact:true})}).locator('b'))
      .toHaveText(pair[1]);
  }
  await expect(facts).toContainText(q.preview.oneWayDays + ' days each way');
  await expect(facts).toContainText(q.preview.durationDays + ' days');
  for (const strategy of ['cautious', 'bold']) {
    const action = page.locator('#venture-dispatch-' + strategy);
    await expect(action).toBeEnabled();
    await expect(action).toContainText(q.cost);
    await expect(action).toContainText(q.preview.durationDays + ' days committed');
    await expect(action).toContainText(Math.round(q.preview.strategies[strategy].lossChance * 100) + '% risk');
    await expect(action).toContainText('stay home and continue normal work');
  }
  await expect(page.locator('#venture-accompany')).toContainText(q.cost);
  await expect(page.locator('#venture-accompany')).toContainText(
    (q.preview.roundTripDays + q.minimumStay) + ' days away');
  await expect(page.locator('#venture-accompany')).toContainText('personal work pauses');
  await expect(page.locator('#venture-keep-home')).toContainText(q.capital);
}

test('867 household compares the real quote and leaves through Back, Escape or staying home without spending', async function ({page}, info) {
  await page.setViewportSize({width:390, height:844});
  await begin(page, info);
  const quote = await stageQuote(page);
  expect(quote.partnerStakes).toEqual([]);
  await openReview(page, quote, 'travel');
  await expectQuote(page, quote);
  await expectUnspent(page);
  const buttons = await page.locator('.review-action-card .actionbtn').evaluateAll(function (nodes) {
    return nodes.map(function (node) { const r = node.getBoundingClientRect(); return {height:r.height, right:r.right}; });
  });
  expect(buttons.length).toBe(5);
  buttons.forEach(function (r) { expect(r.height).toBeGreaterThanOrEqual(44); expect(r.right).toBeLessThanOrEqual(390); });
  await page.locator('#venture-review-back').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(page.locator('[data-travel-destination="' + quote.preview.destinationId + '"]')).toBeFocused();
  await page.locator('#travel-picker-continue').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(page.locator('[data-travel-destination="' + quote.preview.destinationId + '"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-travel-destination="' + quote.preview.destinationId + '"]')).toBeFocused();
  await page.locator('#travel-picker-continue').click();
  await page.locator('#venture-keep-home').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(page.locator('#travel-picker')).toHaveClass(/hidden/);
  await expectUnspent(page);
});

for (const strategy of ['cautious', 'bold']) {
  test('867 ' + strategy + ' dispatch charges the canonical cargo once and survives save restoration', async function ({page}, info) {
    await begin(page, info);
    const quote = await stageQuote(page);
    await openReview(page, quote);
    await expectQuote(page, quote);
    const result = await page.evaluate(function (strategy) {
      const s = FB.state, button = document.getElementById('venture-dispatch-' + strategy);
      const rng = FB.getRngState();
      button.click();
      const after = JSON.stringify(s);
      button.click();
      const inv = FB.financeActiveTradeVentures(s)[0];
      const snapshot = JSON.stringify({player:s.player, economy:s.economy, market:s.market});
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {inv:inv, gold:s.player.gold,
        stock:FB.marketCounty(s, inv.originId).goods[inv.goodId].stock,
        once:after === JSON.stringify(s), rngUnchanged:rng === FB.getRngState(),
        restored:snapshot === JSON.stringify({player:FB.state.player, economy:FB.state.economy, market:FB.state.market}),
        travel:s.player.travel, roadCooldown:s.player.cooldowns.take_road,
        active:FB.financeActiveTradeVentures(s).length, partners:FB.financeActivePartnerships(s).length};
    }, strategy);
    expect(result.inv).toMatchObject({kind:'trade_venture', status:'active', strategy:strategy,
      stake:quote.preview.stake, overhead:quote.preview.overhead, quantity:quote.preview.quantity,
      goodId:quote.preview.goodId, originPrice:quote.preview.originPrice,
      originId:quote.preview.originId, destinationId:quote.preview.destinationId,
      route:quote.preview.route, dueTurn:quote.preview.dueTurn,
      durationDays:quote.preview.durationDays, bands:quote.preview.strategies[strategy].bands,
      modifiers:quote.preview.modifiers});
    expect(result.gold).toBeCloseTo(quote.gold - quote.preview.totalCost, 6);
    expect(result.stock).toBeCloseTo(quote.preview.originStock - quote.preview.quantity, 1);
    expect(result).toMatchObject({once:true, rngUnchanged:true, restored:true, travel:null, active:1, partners:0});
    expect(result.roadCooldown).toBeUndefined();
  });
}

test('1066 JSON terms accompany real cargo despite full partnership slots and retain the private home', async function ({page}, info) {
  await openGame(page, info);
  const mod = {name:'Household cargo terms', balance:{travelMinStayDays:24, travelLegDays:5},
    travelPurposes:{trade:{name:'Trade Venture', desc:'Travel with a household venture.',
      cost:75, stake:10, mode:'developed', minDev:4}},
    finance:{tradeVenture:{stakes:[12,36], treasuryStakeShare:0.25, activeLimit:1,
      minDevelopment:4, timing:{minimumDays:120, preparationDays:45},
      outcomes:{cautious:[{below:0.35, outcome:'loss', multiplier:0}, {outcome:'profit', multiplier:1.4}],
        bold:[{below:0.5, outcome:'loss', multiplier:0}, {outcome:'profit', multiplier:2.2}]}}}};
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'household-cargo.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod), 'utf8')});
  await Promise.all([page.waitForEvent('load'), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page, '1066', 'apprentice');
  expect(await page.evaluate(function () {
    const s = FB.state, technology = FB.realmTechRecord(s);
    if (technology.completed.indexOf('sea_loans') < 0) technology.completed.push('sea_loans');
    s.player.gold = 400;
    const partners = [];
    for (let i = 0; i < FBDATA.balance.financeMaxInvestments; i++) {
      partners.push(!!FB.startTradeInvestment(s, 20, 'finance'));
    }
    return {partners:partners, more:FB.canStartTradeInvestment(s, 20), sig:FB.mods.sig()};
  })).toEqual({partners:[true,true,true], more:false, sig:expect.stringMatching(/^effective-1-[a-f0-9]{64}$/)});
  const quote = await stageQuote(page, {gold:340, stake:12, goodId:'wares'});
  expect(quote.minimumStay).toBe(24);
  expect(quote.preview.durationDays).toBe(Math.max(120, 45 + quote.preview.roundTripDays));
  expect(quote.preview.strategies.bold.bands[1].multiplier).toBe(2.2);
  const lowCapitalQuote = await stageQuote(page, {gold:quote.preview.totalCost + 1, stake:12, goodId:'wares'});
  await openReview(page, lowCapitalQuote);
  await expect(page.locator('#venture-dispatch-cautious')).toBeEnabled();
  await expect(page.locator('#venture-accompany')).toBeDisabled();
  await expect(page.locator('#venture-accompany')).toContainText('Personal departure requires');
  await expect(page.locator('#venture-accompany')).toContainText(lowCapitalQuote.cost);
  await page.locator('#venture-keep-home').click();
  await expectUnspent(page);
  await stageQuote(page, {gold:quote.gold, stake:12, goodId:'wares'});
  await openReview(page, quote);
  await expectQuote(page, quote);
  await expect(page.locator('#venture-accompany')).toBeEnabled();
  const result = await page.evaluate(function () {
    const s = FB.state, button = document.getElementById('venture-accompany');
    const partners = JSON.stringify(FB.financeActivePartnerships(s));
    button.click(); const after = JSON.stringify(s); button.click();
    const t = s.player.travel;
    const snapshot = JSON.stringify({player:s.player, economy:s.economy, market:s.market});
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {travel:t, gold:s.player.gold, home:s.player.provinceId, charId:s.player.charId,
      stock:FB.marketCounty(s, t.venture.originId).goods[t.venture.goodId].stock,
      once:after === JSON.stringify(s),
      partnersUnchanged:partners === JSON.stringify(FB.financeActivePartnerships(s)),
      restored:snapshot === JSON.stringify({player:FB.state.player, economy:FB.state.economy, market:FB.state.market}),
      cooldown:s.player.cooldowns.take_road, turn:s.turn, dispatched:FB.financeActiveTradeVentures(s).length};
  });
  expect(result.travel).toMatchObject({purpose:'trade', phase:'outbound',
    homeId:quote.preview.originId, destinationId:quote.preview.destinationId,
    remainingRoute:quote.preview.route, legDays:quote.preview.legDays, cost:quote.preview.totalCost,
    venture:{kind:'trade_venture', status:'active', goodId:'wares', stake:12,
      quantity:quote.preview.quantity, originPrice:quote.preview.originPrice, overhead:quote.preview.overhead}});
  expect(result.gold).toBeCloseTo(quote.gold - quote.preview.totalCost, 6);
  expect(result.stock).toBeCloseTo(quote.preview.originStock - quote.preview.quantity, 1);
  expect(result).toMatchObject({home:quote.preview.originId, charId:quote.charId,
    once:true, partnersUnchanged:true, restored:true, dispatched:0});
  expect(result.cooldown).toBe(result.turn);
});

test('personal cooldown and completed markets disable accompaniment while dispatch remains available', async function ({page}, info) {
  await begin(page, info);
  let quote = await stageQuote(page);
  await page.evaluate(function () { FB.state.player.cooldowns.take_road = FB.state.turn; });
  quote = await stageQuote(page);
  await openReview(page, quote);
  await expect(page.locator('#venture-accompany')).toBeDisabled();
  await expect(page.locator('#venture-accompany')).toContainText('Ready in 360 days');
  await expect(page.locator('#venture-dispatch-cautious')).toBeEnabled();
  await expect(page.locator('#venture-dispatch-bold')).toBeEnabled();
  await page.locator('#venture-keep-home').click();
  await expectUnspent(page);
  await page.evaluate(function (destination) {
    const s = FB.state; delete s.player.cooldowns.take_road;
    s.player.travelHistory.push({purpose:'trade', destinationId:destination, turn:s.turn});
  }, quote.preview.destinationId);
  quote = await stageQuote(page);
  await openReview(page, quote);
  await expect(page.locator('#venture-accompany')).toBeDisabled();
  await expect(page.locator('#venture-accompany')).toContainText('already completed a trade journey');
  await expect(page.locator('#venture-dispatch-bold')).toBeEnabled();
  await page.locator('#venture-keep-home').click();
  await expectUnspent(page);
});

test('changed price, available capital, stock or station requires a fresh unspent decision', async function ({page}, info) {
  await begin(page, info);
  const quote = await stageQuote(page);
  await openReview(page, quote);
  for (const change of ['price', 'capital', 'stock', 'station']) {
    if (change !== 'price') {
      await page.evaluate(function () {
        const s = FB.state; s.player.gold = 80; s.player.tier = 1;
        FB.marketDeliverStock(s, s.player.provinceId, 'provisions', 100);
      });
      await page.locator('#venture-review-back').click();
      await page.locator('#travel-picker-continue').click();
    }
    await page.evaluate(function (change) {
      const s = FB.state, picker = FB.ui._shared.travelPicker;
      const market = s.market.counties[s.player.provinceId];
      if (change === 'price') market[1][s.market.goods.indexOf(picker.goodId)] = 1.5;
      if (change === 'capital') s.player.gold = FB.tradeVenturePreview(s,
        picker.stake, picker.selected.destinationId, picker.goodId).totalCost - 1;
      if (change === 'stock') market[0][s.market.goods.indexOf(picker.goodId)] = 0;
      if (change === 'station') s.player.tier = 0;
      window.oldVentureButton = document.getElementById('venture-dispatch-cautious');
      window.tradeChoiceBefore = {state:JSON.stringify(s), rng:FB.getRngState(), uid:FB.getUidCounter()};
    }, change);
    await page.locator('#venture-dispatch-cautious').click();
    await expect(page.locator('#gm-body [role="status"]')).toHaveText('The venture terms changed. Review the current quote before deciding.');
    await expectUnspent(page);
    if (change === 'price') {
      await expect(page.locator('[data-venture-review]')).toContainText('at 1.5×');
      await page.evaluate(function () { window.oldVentureButton.click(); });
      await expectUnspent(page);
    }
    if (change !== 'price') {
      await expect(page.locator('#venture-dispatch-cautious')).toBeDisabled();
      await expect(page.locator('#venture-dispatch-bold')).toBeDisabled();
      await expect(page.locator('#venture-accompany')).toBeDisabled();
      await expect(page.locator('#venture-dispatch-cautious')).toContainText(
        change === 'stock' ? 'cannot supply' : change === 'capital' ? 'route overhead cost' : 'Only freeholders and gentry');
      if (change === 'capital') await expect(page.locator('[data-venture-review]')).toContainText('Shortfall');
    }
  }
  await page.locator('#venture-keep-home').click();
  await expectUnspent(page);
});

test('an unavailable scaled stake can be left without spending', async function ({page}, info) {
  await begin(page, info);
  const quote = await stageQuote(page, {gold:1000, stake:100});
  await openReview(page, quote);
  await page.evaluate(function () {
    const s = FB.state; s.player.gold = 900;
    window.tradeChoiceBefore = {state:JSON.stringify(s), rng:FB.getRngState(), uid:FB.getUidCounter()};
  });
  await page.locator('#venture-dispatch-bold').click();
  await expect(page.locator('#gm-body')).toContainText('That stake or market is not available.');
  await expect(page.locator('#venture-dispatch-bold')).toHaveCount(0);
  await expectUnspent(page);
  await page.locator('#venture-keep-home').click();
  await expect(page.locator('#travel-picker')).toHaveClass(/hidden/);
  await expectUnspent(page);
});

test('market inspection returns the retained quote, disclosure, focus and scroll after changing baskets', async function ({page}, info) {
  await page.setViewportSize({width:390, height:844});
  await begin(page, info);
  const quote = await stageQuote(page);
  await openReview(page, quote);
  await page.locator('[aria-controls="venture-accompany-details"]').click();
  for (const back of ['button', 'escape']) {
    const scroll = await page.evaluate(function () {
      document.getElementById('venture-market-details').focus();
      return document.getElementById('gm-body').scrollTop;
    });
    await page.locator('#venture-market-details').click();
    await expect(page.locator('#market-sheet-good')).toBeVisible();
    await page.locator('#market-sheet-good').click();
    await page.locator('.market-sheet-option[data-good="wares"]').click();
    if (back === 'button') await page.locator('#gm-cancel').click();
    else await page.keyboard.press('Escape');
    await expect(page.locator('[data-venture-review]')).toBeVisible();
    await expect(page.locator('#venture-accompany-details')).toBeVisible();
    await expect(page.locator('[aria-controls="venture-accompany-details"]')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#venture-market-details')).toBeFocused();
    expect(await page.locator('#gm-body').evaluate(function (node) { return node.scrollTop; })).toBe(scroll);
    await expectUnspent(page);
  }
  await page.locator('#venture-keep-home').click();
  await expectUnspent(page);
});
