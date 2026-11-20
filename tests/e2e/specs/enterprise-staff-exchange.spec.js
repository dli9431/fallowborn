'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/economy.js', 'data/technology.js', 'js/economy.js', 'js/model.js', 'js/travel.js',
  'js/agency.js', 'js/util.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/ui_modals.js', 'js/ui_misc.js', 'css/style.css'
]);

async function stageEnterprises(page, imported) {
  return page.evaluate(function (mod) {
    const s = FB.state, p = s.player, head = s.chars[p.charId];
    FB.game.setPaused(true);
    p.gold = 200;
    p.enterpriseMigration = 1;
    p.enterpriseLabor = [];
    head.traits = [];
    head.skills.ste = 14;
    const child = FB.makeCharacter(s, {
      name:'Second Worker', sex:'f', born:s.date.year - (mod ? 12 : 22),
      fatherId:head.sex === 'm' ? head.id : null, motherId:head.sex === 'f' ? head.id : null,
      culture:head.culture, religion:head.religion, traits:[], station:p.tier
    });
    head.childrenIds = head.childrenIds || [];
    if (head.childrenIds.indexOf(child.id) < 0) head.childrenIds.push(child.id);
    child.skills.ste = 3;
    FB.setCareer(s, child, 'farmer', mod ? 'apprentice' : 'journeyman');
    const configs = mod ? [
      ['exchange_reed_garden', 0], ['exchange_reed_press', 1], ['exchange_reed_baskets', 0]
    ] : [['orchard_business', 1], ['field_strip', 0], ['press_business', 0]];
    p.enterprises = configs.map(function (entry, i) {
      return { uid:'exchange_property_' + i, type:entry[0], level:entry[1],
        provinceId:p.provinceId, settlement:0, workerId:null };
    });
    const [a, b, c] = p.enterprises;
    if (!FB.setEnterpriseWorker(s, a.uid, head.id, true) || !FB.setEnterpriseWorker(s, b.uid, child.id, true)) {
      throw new Error('Could not stage the canonical family assignments');
    }
    const employee = FB.hireEnterpriseWorker(s, mod ? b.uid : a.uid);
    const thirdWorker = FB.hireEnterpriseWorker(s, c.uid);
    if (!employee || !thirdWorker || !FB.setEnterpriseWorkerLock(s, c.uid, true)) {
      throw new Error('Could not stage the canonical paid and locked assignments');
    }
    const first = { uid:a.uid, cid:head.id }, second = { uid:b.uid, cid:child.id };
    window.exchangePair = [first, second];
    window.exchangeFacts = function () {
      const live = FB.state, enterprises = FB.enterpriseList(live);
      return {
        property:enterprises.map(function (e) { return [e.uid, e.type, e.provinceId, e.settlement, e.level, !!e.workerLocked]; }),
        assigned:enterprises.map(FB.enterpriseWorkerIds),
        operating:enterprises.map(function (e) { return FB.enterpriseOperationalWorkerIds(live, e); }),
        yield:enterprises.map(function (e) { return FB.enterpriseYield(live, e); }),
        staff:enterprises.map(function (e) { return FB.enterpriseStaffAssigned(live, e); }),
        payroll:FB.enterpriseLaborRecords(live), gold:live.player.gold, turn:live.turn
      };
    };
    return { first:first, second:second, paid:employee.id, locked:thirdWorker.id,
      name:FB.fullName(head), partner:FB.fullName(child), facts:exchangeFacts() };
  }, !!imported);
}

async function selectPair(page, ctx) {
  await page.locator('#enterprise-exchange-pick-' + ctx.first.cid).click();
  await expect(page.locator('#gm-title')).toHaveText('Choose the second worker');
  await page.locator('#enterprise-exchange-pick-' + ctx.second.cid).click();
  await expect(page.locator('#gm-title')).toContainText('Review staffing exchange');
}

test('Enterprise Plan reviews or leaves both crews, then exchanges and restores both workers', async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  await page.setViewportSize({ width:390, height:650 });
  const ctx = await stageEnterprises(page);
  await page.evaluate(function () { FB.ui.showLivelihoods(); });
  await page.locator('#enterprise-staffing-preview').click();
  const entry = page.locator('#enterprise-exchange-open');
  await page.locator('#gm-body').evaluate(function (body) { body.scrollTop = 100; });
  await entry.scrollIntoViewIfNeeded();
  const planScroll = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
  expect(planScroll).toBeGreaterThan(0);
  await entry.click();
  await selectPair(page, ctx);
  const review = page.locator('#gm-body');
  await expect(review.locator('.review-person')).toHaveCount(2);
  await expect(review.locator('.review-person').nth(0)).toContainText(ctx.name);
  await expect(review.locator('.review-person').nth(0)).toContainText(/Current: Grafted Orchard.*Proposed: Leased Field/);
  await expect(review.locator('.review-person').nth(1)).toContainText(ctx.partner);
  await expect(review.locator('.review-person').nth(1)).toContainText(/Current: Leased Field.*Proposed: Grafted Orchard/);
  await expect(review).toContainText('2 of 2 positions filled');
  await expect(review).toContainText('Existing wages per season');
  await expect(review).toContainText('Seasonal yield');
  await review.getByRole('button', { name:'Leave assignments in place' }).click();
  const second = page.locator('#enterprise-exchange-pick-' + ctx.second.cid);
  await expect(second).toBeFocused();
  expect(await page.evaluate(function () { return exchangeFacts(); })).toEqual(ctx.facts);
  await second.press('Enter');
  await page.locator('#enterprise-exchange-apply').click();
  await expect(page.locator('#enterprise-exchange-status')).toHaveText('Both assignments were exchanged.');
  const after = await page.evaluate(function () { return exchangeFacts(); });
  expect(after).toMatchObject({
    property:ctx.facts.property, payroll:ctx.facts.payroll, gold:ctx.facts.gold, turn:ctx.facts.turn,
    assigned:[[ctx.second.cid, ctx.paid], [ctx.first.cid], [ctx.locked]],
    operating:[[ctx.second.cid, ctx.paid], [ctx.first.cid], [ctx.locked]], staff:[2, 1, 1]
  });
  expect(after.yield[0]).toBeLessThan(ctx.facts.yield[0]);
  expect(after.yield[1]).toBeGreaterThan(ctx.facts.yield[1]);
  expect(after.yield[2]).toBe(ctx.facts.yield[2]);
  await review.getByRole('button', { name:'Back', exact:true }).click();
  await review.getByRole('button', { name:'Back', exact:true }).click();
  await expect(entry).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(planScroll);
  const restored = await page.evaluate(function () {
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const facts = exchangeFacts();
    const lines = FB.livelihoodBreakdown(FB.state);
    return { facts:facts, orchard:lines.find(function (x) { return x.label.indexOf('Orchard') >= 0; }).amount,
      field:lines.find(function (x) { return x.label.indexOf('Leased Field') >= 0; }).amount };
  });
  expect(restored.facts).toEqual(after);
  expect(restored.orchard).toBe(after.yield[0]);
  expect(restored.field).toBe(after.yield[1]);
});

test('changed terms refuse the entire review, including unavailable, reserved and bound workers', async function ({ page }, info) {
  await openGame(page, info);
  await startDeterministicGame(page);
  const ctx = await stageEnterprises(page);
  await page.evaluate(function () { FB.ui.showLivelihoods(); });
  await page.locator('#enterprise-staffing-preview').click();
  await page.locator('#enterprise-exchange-open').click();
  await selectPair(page, ctx);
  await page.evaluate(function () {
    FB.setProtected(FB.state, 'staffingWorker', exchangePair[1].cid, true);
  });
  await page.locator('#enterprise-exchange-apply').click();
  await expect(page.locator('#enterprise-exchange-status')).toHaveText('Staffing changed. Neither assignment was exchanged.');
  expect(await page.evaluate(function () { return exchangeFacts(); })).toEqual(ctx.facts);
  const proof = await page.evaluate(function (paid) {
    const s = FB.state, p = s.player, child = s.chars[exchangePair[1].cid];
    const [first, second] = exchangePair;
    FB.setProtected(s, 'staffingWorker', second.cid, false);
    const quote = FB.enterpriseExchangeQuote(s, first, second);
    const snapshot = function () { return JSON.stringify([s, FB.getRngState(), FB.getUidCounter()]); };
    function rejectsStale() {
      const before = snapshot();
      return !FB.applyEnterpriseExchange(s, quote) && snapshot() === before;
    }
    const started = snapshot();
    const choices = FB.enterpriseExchangeChoices(s);
    const pure = snapshot() === started;
    FB.setEnterpriseWorkerLock(s, second.uid, true);
    const locked = rejectsStale();
    FB.setEnterpriseWorkerLock(s, second.uid, false);
    const station = child.station;
    child.station = 0;
    child.unfree = true;
    const bound = FB.isUnfreeCharacter(s, child) && rejectsStale();
    delete child.unfree;
    child.station = station;
    const destination = Object.keys(FB.world.byId).find(function (id) { return id !== p.provinceId; });
    FB.travelAttachTemporaryCarrier(s, 'test_staffing_journey', destination);
    const away = FB.characterResidence(s, s.chars[first.cid]) === p.provinceId &&
      FB.characterLocation(s, s.chars[first.cid]) === destination && rejectsStale();
    p.travel = null;
    child.householdResidenceId = destination;
    const remote = rejectsStale();
    delete child.householdResidenceId;
    child.career.profession = 'craftsman';
    const qualification = rejectsStale();
    child.career.profession = 'farmer';
    child.born = s.date.year - 12;
    const overCapacity = rejectsStale();
    child.born = s.date.year - 22;
    child.skills.ste += 2;
    const changedYield = rejectsStale();
    const contract = !FB.enterpriseExchangeQuote(s, { uid:first.uid, cid:paid }, second);
    return { quote:!!quote, choiceCount:choices.length, pure:pure, locked:locked, bound:bound,
      away:away, remote:remote, qualification:qualification, overCapacity:overCapacity,
      changedYield:changedYield, contract:contract };
  }, ctx.paid);
  expect(proof).toEqual({ quote:true, choiceCount:2, pure:true, locked:true, bound:true,
    away:true, remote:true, qualification:true, overCapacity:true, changedYield:true, contract:true });
});

test('ordinary JSON imports exchange half positions and change connected output and paid operations', async function ({ page }, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/enterprise-staff-exchange-reeds.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await startDeterministicGame(page);
  const ctx = await stageEnterprises(page, true);
  expect(ctx.facts.staff).toEqual([1, 1.5, 1]);
  const result = await page.evaluate(function () {
    const s = FB.state, [first, second] = exchangePair;
    const before = JSON.stringify(s);
    const quote = FB.enterpriseExchangeQuote(s, first, second);
    const pure = before === JSON.stringify(s);
    const applied = FB.applyEnterpriseExchange(s, quote);
    const replay = FB.applyEnterpriseExchange(s, quote);
    const after = exchangeFacts();
    const save = JSON.parse(FB.save.serialize()), signature = FB.mods.sig();
    FB.save.restore(save);
    const restored = exchangeFacts(), live = FB.state;
    const lines = FB.livelihoodBreakdown(live);
    const gold = live.player.gold;
    FB.livelihoodSeason(live);
    FB.enterpriseLaborSeason(live);
    return { pure:pure, quote:quote, applied:applied, replay:replay, after:after, restored:restored,
      garden:lines.some(function (x) { return x.label.indexOf('Reed Garden') >= 0; }),
      press:lines.find(function (x) { return x.label.indexOf('Reed Press') >= 0; }).amount,
      net:live.player.gold - gold, expectedNet:lines.reduce(function (n, x) { return n + x.amount; }, 0) - FB.enterpriseLaborSeasonCost(live),
      mods:save.mods, signature:signature,
      techMode:FBDATA.techImpactReviews.features.enterprise_staff_exchange.mode };
  });
  expect(result).toMatchObject({ pure:true, applied:true, replay:false, garden:false, techMode:'none' });
  expect(result.mods).toMatch(/^effective-1-/);
  expect(result.mods).toBe(result.signature);
  expect(result.restored).toEqual(result.after);
  expect(result.after).toMatchObject({
    property:ctx.facts.property, payroll:ctx.facts.payroll, turn:ctx.facts.turn, gold:ctx.facts.gold,
    assigned:[[ctx.second.cid], [ctx.first.cid, ctx.paid], [ctx.locked]], staff:[0.5, 2, 1]
  });
  expect(result.quote.rows.map(function (row) { return row.proposed.staff; })).toEqual(result.after.staff.slice(0, 2));
  expect(result.quote.rows.map(function (row) { return row.proposed.yield; })).toEqual(result.after.yield.slice(0, 2));
  expect(result.after.yield[0]).toBe(0);
  expect(result.press).toBeGreaterThan(0);
  expect(result.press).toBe(result.after.yield[1]);
  expect(result.quote.linked).toMatchObject([{ current:ctx.facts.yield[2], proposed:result.after.yield[2] }]);
  expect(result.after.yield[2]).toBeLessThan(ctx.facts.yield[2]);
  expect(result.net).toBeCloseTo(result.expectedNet, 8);
});
