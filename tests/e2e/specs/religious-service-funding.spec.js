'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startPreparedParityGame } = require('../support/game/parity');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/religious-service-funding-sardis.json');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename, [
  'index.html', 'data/actions.js', 'data/religious_activities.js', 'data/religious_institutions.js',
  'data/bookmark_493.js', 'data/bookmark_493_world.js', 'data/eras.js', 'js/actions.js', 'js/i18n.js',
  'js/religious_activities.js', 'js/religious_institutions.js', 'js/ui_religious_activities.js', 'js/ui_misc.js',
  'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/treasury.js', 'js/model.js', 'js/technology.js'
]);

const patronage = 'jewish_sardis_giving_493';
const funding = '#activity-review-fund-' + patronage + '-building_care';
const picker = '#activity-funding-target';

async function start(page, info, imported) {
  await openGame(page, info);
  if (imported) {
    const validated = await page.evaluate(function (candidate) {
      const before = JSON.stringify([FB.mods.sig(), FBDATA.religiousPatronage, FBDATA.religiousActivities]);
      const valid = FB.mods.validate(candidate);
      const bad = JSON.parse(JSON.stringify(candidate));
      bad.religiousPatronage.jewish_sardis_giving_493.funds.building_care.capacity = 1.5;
      const invalid = FB.mods.validate(bad);
      return { valid:valid, rejected:invalid.length > 0,
        pure:before === JSON.stringify([FB.mods.sig(), FBDATA.religiousPatronage, FBDATA.religiousActivities]) };
    }, example);
    expect(validated).toEqual({ valid:[], rejected:true, pure:true });
    const signature = await page.evaluate(function () { return FB.mods.sig(); });
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/religious-service-funding-sardis.json'));
    await Promise.all([page.waitForEvent('domcontentloaded'), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    expect(await page.evaluate(function () { return FB.mods.sig(); })).not.toBe(signature);
  }
  await startPreparedParityGame(page, { unhide:true, bookmark:'493', revision:'jewish_samaritan_v3',
    code:'REVIEW-493-farmer_493-sardis-m-Reader-established-0-greek.jewish' });
  await page.evaluate(function (imported) {
    const s = FB.state, c = s.chars[s.player.charId], iid = 'jewish_sardis_congregation_493';
    const profile = 'jewish_sardis_giving_493', fund = 'building_care';
    c.religion = 'jewish'; c.born = 460; s.player.provinceId = 'sardis'; s.player.gold = 100;
    FB.setPlayerTier(s, 1, { stationFarewell:false });
    s.player.manor = null; s.player.landPlotMigration = 1;
    s.player.landPlots = [{ provinceId:'sardis', settlement:0 }];
    const foundation = FB.religiousPatronageQuote(s, profile, c.id, 'foundation', {
      land:{ provinceId:'sardis', settlement:0, count:1 }
    });
    if (!FB.religiousPatronageApply(s, foundation)) throw new Error('Foundation refused: ' + foundation.reason);
    window.fundingTest = {
      iid:iid, profile:profile, fund:fund,
      activity:imported ? 'sardis_supplies_care_493' : 'jewish_sardis_congregation_493_care',
      house:function () { return FB.state.abbeys.houses.find(function (h) { return h.activityInstitutionId === iid; }); },
      quote:function (target) { return FB.religiousPatronageQuote(FB.state, profile, FB.state.player.charId,
        'donation', { fund:fund, targetUses:target }); },
      gift:function (amount) { return FB.religiousPatronageApply(FB.state, FB.religiousPatronageQuote(FB.state, profile,
        FB.state.player.charId, 'donation', { fund:fund, amount:amount })); },
      open:function () {
        const deed = FB.instants.find(function (row) { return row.id === 'religious_activities'; });
        if (!deed.show(FB.state)) throw new Error('Religious activities deed unavailable');
        deed.run(FB.state);
      },
      exact:function () { return JSON.stringify([FB.state, FB.getRngState(), FB.getUidCounter()]); },
      accounts:function () {
        const h = this.house(), p = FB.state.player;
        return { gold:p.gold, piety:p.piety, prestige:p.prestige, balance:h.restrictedFunds[fund], spent:h.activitySpent,
          plots:h.plots, capital:h.capital, treasury:h.treasury, rents:h.rents };
      },
      deliver:function () {
        const state = FB.state, cid = state.player.charId, actor = state.chars[cid];
        const before = this.accounts(), denied = FB.religiousActivityQuote(state, this.activity, cid).reason;
        const admit = FB.religiousInstitutionQuote(state, iid, { kind:'character', id:cid }, 'admit', { roleId:'worshipper' });
        if (!FB.religiousInstitutionApply(state, admit)) throw new Error('Admission refused: ' + admit.reason);
        const review = FB.religiousActivityQuote(state, this.activity, cid);
        if (!FB.religiousActivityApply(state, review)) throw new Error('Service refused: ' + review.reason);
        const due = actor.religiousActivity.dueTurn, duration = due - state.turn;
        state.turn = due - 1;
        FB.religiousActivityTick(state);
        const early = !!actor.religiousActivity && JSON.stringify(before) === JSON.stringify(this.accounts()) &&
          !actor.religiousActivityHistory;
        state.turn = due;
        FB.religiousActivityTick(state);
        const after = this.accounts();
        const replay = FB.religiousActivityQuote(state, this.activity, cid);
        const repeated = FB.religiousActivityApply(state, replay);
        FB.religiousActivityTick(state);
        return { before:before, after:after, denied:denied, duration:duration, early:early,
          receipt:actor.religiousActivityHistory.jewish_synagogue_care_done,
          active:!!actor.religiousActivity, replay:replay.reason, repeated:repeated,
          replayUnchanged:JSON.stringify(after) === JSON.stringify(this.accounts()) };
      }
    };
  }, imported);
}

function fact(page, name) {
  return page.locator('#activity-decision-terms .kv').filter({ has:page.getByText(name, { exact:true }) }).locator('b');
}

test('the ordinary mobile patronage review defers and requotes a partial-balance gift before delivering one service', async function ({ page }, info) {
  await page.setViewportSize({ width:390, height:844 });
  await start(page, info, false);
  const before = await page.evaluate(function () {
    if (!fundingTest.gift(0.5)) throw new Error('Partial gift was refused');
    const before = fundingTest.exact();
    fundingTest.open();
    return before === fundingTest.exact();
  });
  expect(before).toBe(true);
  await expect(page.locator('#activity-review-' + patronage + '-0')).toContainText('Gift');
  const card = page.locator(funding), details = card.locator('xpath=../..').getByRole('button', { name:'Details', exact:true });
  await details.click();
  await card.click();
  await expect(page.locator(picker)).toHaveValue('1');
  await page.locator(picker).selectOption('2');
  await expect(fact(page, 'Current fund balance')).toHaveText(/^0\.5 /);
  await expect(fact(page, 'Cost per use')).toHaveText(/^1 /);
  await expect(fact(page, 'Target prepaid uses')).toHaveText('2');
  await expect(fact(page, 'Remaining capacity')).toHaveText('8 of 8 uses');
  await expect(fact(page, 'Capacity after gift')).toHaveText('6 of 8 uses');
  await expect(fact(page, 'Exact gift')).toHaveText(/^1\.5 /);
  await expect(fact(page, 'Household money after gift')).toHaveText(/^98 /);
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await card.click();
  await expect(page.locator(picker)).toHaveValue('2');
  await page.locator('[data-modal-nav="back"]').click();
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return fundingTest.accounts().gold; })).toBe(99.5);
  await card.click();
  expect(await page.evaluate(function () {
    const given = fundingTest.gift(0.25);
    window.fundingAfterOtherGift = fundingTest.exact();
    return given;
  })).toBe(true);
  await page.locator('#activity-confirm').click();
  await expect(page.getByRole('heading', { name:'Terms changed', exact:true })).toBeVisible();
  expect(await page.evaluate(function () { return fundingTest.exact() === fundingAfterOtherGift; })).toBe(true);
  await page.locator('#activity-continue').click();
  await expect(card).toBeFocused();
  await card.click();
  await expect(page.locator(picker)).toHaveValue('2');
  await expect(fact(page, 'Exact gift')).toHaveText(/^1\.25 /);
  await page.locator('#activity-confirm').click();
  await expect(page.getByRole('heading', { name:'Decision recorded', exact:true })).toBeVisible();
  await page.locator('#activity-continue').click();
  const result = await page.evaluate(function () {
    const covered = fundingTest.quote(2), next = fundingTest.quote(3);
    return { covered:covered.reason, refused:!FB.religiousPatronageApply(FB.state, covered), next:next.cost,
      service:fundingTest.deliver() };
  });
  expect(result).toMatchObject({ covered:'funded', refused:true, next:1, service:{ denied:'eligibility', duration:2,
    early:true, before:{ gold:98, balance:2, spent:0 }, after:{ gold:98, balance:1, spent:1 },
    receipt:{ activityId:'jewish_sardis_congregation_493_care', rewarded:true, performed:true },
    active:false, replay:'commitment', repeated:false, replayUnchanged:true } });
  expect(result.service.after.piety - result.service.before.piety).toBe(1);
  expect(result.service.after.plots).toEqual(result.service.before.plots);
});

test('ordinary JSON changes the exact target, reserve, service time and durable consumption', async function ({ page }, info) {
  await start(page, info, true);
  const initial = await page.evaluate(function () {
    const f = fundingTest, s = FB.state, before = f.accounts();
    if (!f.gift(1.25)) throw new Error('Imported partial gift was refused');
    const gold = s.player.gold;
    s.player.gold = 7.5;
    const insufficient = f.quote(2), unchanged = f.exact();
    const denied = !FB.religiousPatronageApply(s, insufficient) && unchanged === f.exact();
    s.player.gold = gold;
    const orphan = FB.religiousPatronageQuote(s, f.profile, s.player.charId, 'donation', { fund:'hospitality', targetUses:1 });
    const q = f.quote(2), options = FB.religiousServiceFundingOptions(s, f.profile, s.player.charId);
    f.open();
    return { initial:before, denied:denied, insufficient:insufficient.reason, orphan:orphan.reason,
      cost:q.cost, funding:q.funding, options:options,
      technology:FBDATA.techImpactReviews.features.religious_service_shortfall_funding.mode,
      techErrors:FB.validateTechnologyData(true) };
  });
  expect(initial).toMatchObject({ initial:{ gold:96, spent:1, capital:2, treasury:1 }, denied:true,
    insufficient:'funds', orphan:'serviceUnavailable', cost:3.75, funding:{ balance:1.25, unitCost:2.5,
      capacity:4, fundedUses:0, remainingUses:4, targetUses:2, targetBalance:5, householdLeft:91,
      services:[{ id:'sardis_supplies_care_493' }] }, options:[{ fund:'building_care', targetUses:1 }], technology:'none', techErrors:[] });
  await expect(page.locator('#activity-review-fund-' + patronage + '-hospitality')).toHaveCount(0);
  await page.locator(funding).click();
  await page.locator(picker).selectOption('2');
  await expect(fact(page, 'Local services')).toHaveText('Prepare supplies for synagogue care');
  await expect(fact(page, 'Cost per use')).toHaveText(/^2\.5 /);
  await expect(fact(page, 'Exact gift')).toHaveText(/^3\.75 /);
  await expect(fact(page, 'Household money after gift')).toHaveText(/^91 /);
  await page.locator('#activity-confirm').click();
  await expect(page.getByRole('heading', { name:'Decision recorded', exact:true })).toBeVisible();
  const completed = await page.evaluate(function () {
    return { service:fundingTest.deliver(), save:FB.save.serialize(), sig:FB.mods.sig() };
  });
  expect(completed.service).toMatchObject({ denied:'eligibility', duration:3, early:true,
    before:{ gold:91, balance:5, capital:2, treasury:1, spent:1 }, after:{ gold:91, balance:2.5, capital:2, treasury:1, spent:3.5 },
    receipt:{ activityId:'sardis_supplies_care_493', rewarded:true, performed:true }, replay:'commitment', repeated:false,
    replayUnchanged:true });
  expect(completed.service.after.piety - completed.service.before.piety).toBe(2);
  await restoreBookmark(page, completed.save);
  const restored = await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId];
    return { accounts:fundingTest.accounts(), receipt:c.religiousActivityHistory.jewish_synagogue_care_done,
      reason:FB.religiousActivityQuote(s, fundingTest.activity, c.id).reason, sig:FB.mods.sig() };
  });
  expect(restored).toEqual({ accounts:completed.service.after, receipt:completed.service.receipt,
    reason:'commitment', sig:completed.sig });
});

test('only household authority can cover a live matching service and public gifts keep their own payer', async function ({ page }, info) {
  await start(page, info, false);
  const result = await page.evaluate(function () {
    const f = fundingTest, s = FB.state, h = f.house(), cid = s.player.charId;
    const original = f.quote(2), pub = 'jewish_sardis_public_giving_493';
    const untouched = f.exact();
    const rejected = [0, 1.5, 9, '2', null].map(function (target) {
      const q = f.quote(target);
      return q.reason === 'fund' && !FB.religiousPatronageApply(s, q);
    });
    const mixed = FB.religiousPatronageQuote(s, f.profile, cid, 'donation', { fund:f.fund, amount:1, targetUses:2 });
    const invalid = mixed.reason === 'terms' && !FB.religiousPatronageApply(s, mixed) && f.exact() === untouched;
    const service = FBDATA.religiousActivities[f.activity];
    const duration = service.duration;
    service.duration++;
    const revised = !FB.religiousPatronageApply(s, original) && f.exact() === untouched;
    service.duration = duration;
    const period = service.period;
    service.period = { yearMin:494, yearMax:494 };
    const outOfDate = f.quote(2).reason;
    service.period = period;
    service.provinceIds = ['roma'];
    const outOfScope = f.quote(2).reason;
    delete service.provinceIds;
    h.activityServices[f.fund].capacity--;
    const mismatch = f.quote(2).reason;
    h.activityServices[f.fund].capacity++;
    const institution = s.localInstitutions[f.iid], status = institution.status;
    institution.status = 'closed';
    const closed = f.quote(2).reason, staleClosed = !FB.religiousPatronageApply(s, original);
    institution.status = status;
    FB.treasuryInitialize(s);
    s.treasuryAccounting.mode = 'active';
    const rid = Object.keys(s.realms).sort().find(function (id) {
      if (id === 'player') return false;
      const ruler = FB.realmRulerCharacterSnapshot(s, id);
      return ruler && FB.treasuryCharacterRealm(s, ruler.id) === id;
    });
    if (!rid) throw new Error('No public patron was available');
    s.realms[rid].capital = 'sardis';
    const ruler = FB.realmRulerCharacterSnapshot(s, rid);
    ruler.religion = 'jewish'; ruler.health = 8; ruler.born = 460;
    s.realms[rid].treasury.gold = 100;
    s.realms[rid].treasury.militaryAccrued = 0;
    const publicBefore = FB.treasuryAvailable(s, rid), householdBefore = s.player.gold;
    const terms = { fund:f.fund, targetUses:2 };
    const unauthorized = FB.religiousPatronageQuote(s, f.profile, ruler.id, 'donation', terms);
    const publicShortfall = FB.religiousPatronageQuote(s, pub, ruler.id, 'donation', terms);
    const refusePayers = !FB.religiousPatronageApply(s, unauthorized) && !FB.religiousPatronageApply(s, publicShortfall) &&
      publicBefore === FB.treasuryAvailable(s, rid) && householdBefore === s.player.gold;
    const ordinary = FB.religiousPatronageQuote(s, pub, ruler.id, 'donation', { fund:f.fund, amount:1 });
    const publicGift = FB.religiousPatronageApply(s, ordinary);
    const full = f.quote(8), filled = FB.religiousPatronageApply(s, full);
    const covered = f.quote(8);
    const authority = { rejected:rejected, invalid:invalid, revised:revised, outOfDate:outOfDate, outOfScope:outOfScope,
      mismatch:mismatch, closed:closed, staleClosed:staleClosed, unauthorized:unauthorized.reason, publicShortfall:publicShortfall.reason,
      publicPayer:publicShortfall.payer && publicShortfall.payer.id === rid, refusePayers:refusePayers, publicGift:publicGift,
      publicSpent:publicBefore - FB.treasuryAvailable(s, rid), filled:filled, householdSpent:householdBefore - s.player.gold,
      balance:h.restrictedFunds[f.fund], full:covered.funding.remainingUses, covered:covered.reason,
      repeated:FB.religiousPatronageApply(s, full) || FB.religiousPatronageApply(s, covered) };
    // A valid fractional unit can round just below a whole-use boundary after subtraction.
    const unit = 0.3;
    FBDATA.religiousPatronage[f.profile].funds[f.fund].unitCost = unit;
    service.service.cost = unit;
    h.activityServices[f.fund].unitCost = unit;
    h.restrictedFunds[f.fund] = 0;
    const prepaid = FB.religiousPatronageApply(s, f.quote(3));
    const delivered = f.deliver();
    const remaining = f.quote(2);
    return { authority:authority, fractional:{ prepaid:prepaid, consumed:delivered.after.spent,
      balance:delivered.after.balance, funded:remaining.funding.fundedUses, covered:remaining.reason } };
  });
  expect(result.authority).toEqual({ rejected:[true,true,true,true,true], invalid:true, revised:true,
    outOfDate:'serviceUnavailable', outOfScope:'serviceUnavailable', mismatch:'serviceUnavailable', closed:'eligibility', staleClosed:true,
    unauthorized:'payer', publicShortfall:'payer', publicPayer:true, refusePayers:true, publicGift:true, publicSpent:1,
    filled:true, householdSpent:7, balance:8, full:0, covered:'funded', repeated:false });
  expect(result.fractional).toEqual({ prepaid:true, consumed:0.3, balance:0.6, funded:2, covered:'funded' });
});
