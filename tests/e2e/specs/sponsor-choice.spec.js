'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startPreparedParityGame } = require('../support/game/parity');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/sponsor-choice-sardis.json');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename, [
  'data/actions.js', 'data/religious_activities.js', 'data/religious_institutions.js',
  'data/bookmark_493.js', 'data/bookmark_493_world.js', 'js/religious_activities.js',
  'js/ui_religious_activities.js', 'js/ui_misc.js', 'js/religious_institutions.js', 'js/model.js',
  'js/items.js', 'js/i18n.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js', 'js/technology.js'
]);

const nativeActivity = 'jewish_sardis_congregation_493_care';
const importedActivity = 'sardis_provisions_service_493';
const patronage = 'jewish_sardis_giving_493';
const participant = '#activity-person';
const confirm = '#activity-confirm';
const decline = '#activity-leave-funding';
const next = '#activity-continue';

async function start(page, info, imported) {
  await openGame(page, info);
  if (imported) {
    const validation = await page.evaluate(function (candidate) {
      const original = JSON.stringify([FB.mods.sig(), FBDATA.religiousActivities, FBDATA.religiousPatronage]);
      const valid = FB.mods.validate(candidate);
      const invalid = JSON.parse(JSON.stringify(candidate));
      invalid.religiousActivities.sardis_provisions_service_493.service.cost = '2.5';
      return { valid:valid, rejected:FB.mods.validate(invalid).length > 0,
        pure:original === JSON.stringify([FB.mods.sig(), FBDATA.religiousActivities, FBDATA.religiousPatronage]) };
    }, example);
    expect(validation).toEqual({ valid:[], rejected:true, pure:true });
    const signature = await page.evaluate(function () { return FB.mods.sig(); });
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/sponsor-choice-sardis.json'));
    await Promise.all([page.waitForEvent('domcontentloaded'), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    expect(await page.evaluate(function () { return FB.mods.sig(); })).not.toBe(signature);
  }
  await startPreparedParityGame(page, { unhide:true, bookmark:'493', revision:'jewish_samaritan_v3',
    code:'REVIEW-493-farmer_493-sardis-m-Reader-established-0-greek.jewish' });
  return page.evaluate(function (input) {
    const s = FB.state, player = s.chars[s.player.charId], spouse = s.chars[player.spouseId];
    const iid = 'jewish_sardis_congregation_493', fund = 'building_care';
    if (!spouse || !FB.religiousActivityManaged(s, spouse.id)) throw new Error('No managed adult spouse');
    [player, spouse].forEach(function (actor) { actor.religion = 'jewish'; actor.born = 460; });
    s.player.provinceId = 'sardis'; s.player.gold = 100;
    FB.setPlayerTier(s, 1, { stationFarewell:false });
    s.player.manor = null; s.player.landPlotMigration = 1;
    s.player.landPlots = [{ provinceId:'sardis', settlement:0 }];
    const foundation = FB.religiousPatronageQuote(s, input.profile, player.id, 'foundation', {
      land:{ provinceId:'sardis', settlement:0, count:1 }
    });
    if (!FB.religiousPatronageApply(s, foundation)) throw new Error('Foundation refused: ' + foundation.reason);
    window.sponsorTest = {
      iid:iid, fund:fund, cid:spouse.id, activity:input.activity,
      house:function () {
        return FB.state.abbeys.houses.find(function (h) { return h.activityInstitutionId === iid; });
      },
      admit:function (cid) {
        const q = FB.religiousInstitutionQuote(FB.state, iid, { kind:'character', id:cid || this.cid }, 'admit',
          { roleId:'worshipper' });
        if (!FB.religiousInstitutionApply(FB.state, q)) throw new Error('Admission refused: ' + q.reason);
      },
      review:function (cid) { return FB.religiousActivityQuote(FB.state, this.activity, cid || this.cid); },
      quote:function () { return FB.religiousActivitySponsorshipQuote(FB.state, this.activity, this.cid); },
      gift:function (amount) {
        return FB.religiousPatronageApply(FB.state, FB.religiousPatronageQuote(FB.state, input.profile, player.id,
          'donation', { fund:fund, amount:amount }));
      },
      open:function () {
        const deed = FB.instants.find(function (row) { return row.id === 'religious_activities'; });
        if (!deed.show(FB.state)) throw new Error('Religious activities deed unavailable');
        deed.run(FB.state);
      },
      exact:function () { return JSON.stringify([FB.state, FB.getRngState(), FB.getUidCounter()]); },
      facts:function () {
        const h = this.house(), p = FB.state.player, c = FB.state.chars[this.cid];
        return { gold:p.gold, piety:p.piety, prestige:p.prestige, balance:h.restrictedFunds[fund],
          spent:h.activitySpent, capital:h.capital, treasury:h.treasury, rents:h.rents, plots:h.plots,
          commitment:c.religiousActivity || null, history:c.religiousActivityHistory || null };
      }
    };
    return { cid:spouse.id, name:FB.fullName(spouse) };
  }, { profile:patronage, activity:imported ? importedActivity : nativeActivity });
}

function fact(page, label) {
  return page.locator('#activity-decision-terms .kv')
    .filter({ has:page.getByText(label, { exact:true }) }).locator('b');
}

test('a named participant reviews, declines, and confirms the exact shortfall from the ordinary mobile service', async function ({ page }, info) {
  await page.setViewportSize({ width:390, height:844 });
  const person = await start(page, info, false);
  const initial = await page.evaluate(function () {
    const t = sponsorTest;
    if (!t.gift(0.25)) throw new Error('Partial gift refused');
    const unadmitted = t.review().reason;
    const noOffer = t.quote() === null;
    t.admit();
    window.beforeSponsor = t.exact();
    const ordinary = t.review(), offer = t.quote(), rejected = !FB.religiousActivityApply(FB.state, ordinary);
    t.open();
    return { unadmitted:unadmitted, noOffer:noOffer, ordinary:ordinary.reason, rejected:rejected,
      pure:t.exact() === beforeSponsor, gift:offer.donation.cost, total:offer.total,
      donor:offer.donation.cid, fee:offer.activity.cost };
  });
  expect(initial).toEqual({ unadmitted:'eligibility', noOffer:true, ordinary:'service', rejected:true,
    pure:true, gift:0.75, total:0.75, donor:person.cid, fee:0 });
  await page.locator(participant).selectOption(person.cid);
  const card = page.locator('#activity-review-' + nativeActivity);
  const details = page.locator('[aria-controls="activity-review-' + nativeActivity + '-details"]');
  await expect(page.locator('#activity-review-fund-' + patronage + '-building_care')).toBeEnabled();
  await details.click();
  await card.click();
  await expect(page.locator('#activity-decision-terms .review-person')).toContainText(person.name);
  await expect(fact(page, 'Current fund balance')).toHaveText(/^0\.25 /);
  await expect(fact(page, 'Restricted donation')).toHaveText(/^0\.75 /);
  await expect(fact(page, 'Attendance fee')).toHaveText(/^0 /);
  await expect(fact(page, 'Total payment')).toHaveText(/^0\.75 /);
  await page.locator(decline).click();
  await expect(card).toBeFocused();
  await expect(page.locator(participant)).toHaveValue(person.cid);
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await card.click();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await card.click();
  await page.locator('[data-modal-nav="back"]').click();
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () { return sponsorTest.exact() === beforeSponsor; })).toBe(true);

  await card.click();
  expect(await page.evaluate(function () {
    const t = sponsorTest, given = t.gift(0.25);
    window.afterOtherGift = t.exact();
    return given;
  })).toBe(true);
  await page.locator(confirm).click();
  await expect(page.getByRole('heading', { name:'Terms changed', exact:true })).toBeVisible();
  expect(await page.evaluate(function () { return sponsorTest.exact() === afterOtherGift; })).toBe(true);
  await page.locator(next).click();
  await expect(card).toBeFocused();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await card.click();
  await expect(fact(page, 'Restricted donation')).toHaveText(/^0\.5 /);
  await expect(page.locator(confirm)).toContainText('Donate and enroll');
  const before = await page.evaluate(function () {
    window.sponsoredReview = sponsorTest.quote();
    return sponsorTest.facts();
  });
  await page.locator(confirm).click();
  await expect(page.getByRole('heading', { name:'Decision recorded', exact:true })).toBeVisible();
  await page.locator(next).click();
  await expect(card).toBeDisabled();
  await expect(card.locator('xpath=../..')).toBeFocused();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  const result = await page.evaluate(function () {
    const t = sponsorTest, s = FB.state, actor = s.chars[t.cid], enrolled = t.facts(), settled = t.exact();
    const replay = FB.religiousActivitySponsorshipApply(s, sponsoredReview);
    const replayUnchanged = settled === t.exact();
    actor.captive = true;
    FB.religiousActivityTick(s);
    return { enrolled:enrolled, replay:replay, replayUnchanged:replayUnchanged, interrupted:t.facts() };
  });
  expect(result.enrolled).toEqual({ ...before, gold:99, balance:1,
    commitment:expect.objectContaining({ activityId:nativeActivity, institutionId:'jewish_sardis_congregation_493', paid:0 }) });
  expect(result).toMatchObject({ replay:false, replayUnchanged:true,
    interrupted:{ ...result.enrolled, commitment:null, history:null } });
});

test('ordinary funded enrollment can use the same unit before the sponsored participant completes', async function ({ page }, info) {
  await start(page, info, false);
  const result = await page.evaluate(function () {
    const s = FB.state, t = sponsorTest, player = s.player.charId;
    t.admit(); t.admit(player);
    const f = t.facts(), q = t.quote(), sponsored = FB.religiousActivitySponsorshipApply(s, q);
    const funded = t.review(player), onlyFee = funded.cost, allowed = funded.allowed;
    const noOffer = FB.religiousActivitySponsorshipQuote(s, t.activity, player) === null;
    const ordinary = FB.religiousActivityApply(s, funded);
    const enrolled = t.facts(), playerCommitment = s.chars[player].religiousActivity;
    s.turn = playerCommitment.dueTurn;
    const consumed = FB.religiousActivityFinish(s, player, false);
    const receipt = s.chars[player].religiousActivityHistory.jewish_synagogue_care_done;
    FB.religiousActivityTick(s);
    return { sponsored:sponsored, allowed:allowed, onlyFee:onlyFee, noOffer:noOffer, ordinary:ordinary, enrolled:enrolled,
      before:f, consumed:consumed, receipt:receipt, finished:t.facts() };
  });
  expect(result).toMatchObject({ sponsored:true, allowed:true, onlyFee:0, noOffer:true, ordinary:true, consumed:true,
    receipt:{ activityId:nativeActivity, performed:true, rewarded:true } });
  expect(result.enrolled).toEqual({ ...result.before, gold:99, balance:1,
    commitment:expect.objectContaining({ activityId:nativeActivity, paid:0 }) });
  expect(result.finished).toEqual({ ...result.enrolled, balance:0, spent:1, piety:result.enrolled.piety + 1,
    commitment:null, history:null });
});

test('an ordinary JSON import varies both costs and reserves and restores the exact paid commitment and consumption', async function ({ page }, info) {
  const person = await start(page, info, true);
  const checks = await page.evaluate(function () {
    const s = FB.state, t = sponsorTest, actor = s.chars[t.cid];
    t.admit();
    if (!t.gift(1.25)) throw new Error('Imported partial gift refused');
    s.player.gold = 9.75;
    const activity = t.review();
    const donation = FB.religiousPatronageQuote(s, t.house().activityProfileId, t.cid, 'donation', { fund:t.fund, targetUses:1 });
    const independent = [activity.reason, donation.allowed, t.quote() === null];
    s.player.gold = 10;
    const q = t.quote();
    function stale(change, undo) {
      change();
      const after = t.exact();
      const denied = t.quote() === null && !FB.religiousActivitySponsorshipApply(s, q) && after === t.exact();
      undo();
      return denied;
    }
    const role = actor.role, capacity = t.house().activityServices[t.fund].capacity;
    const independentKin = stale(function () { actor.role = 'lord'; }, function () { actor.role = role; });
    const wrongCapacity = stale(function () { t.house().activityServices[t.fund].capacity--; },
      function () { t.house().activityServices[t.fund].capacity = capacity; });
    t.open();
    return { independent:independent, independentKin:independentKin, wrongCapacity:wrongCapacity,
      gift:q.donation.cost, fee:q.activity.cost, total:q.total, left:q.householdLeft, reserve:q.reserve,
      mode:FBDATA.techImpactReviews.features.religious_service_sponsored_enrollment.mode,
      techErrors:FB.validateTechnologyData(true), before:t.facts() };
  });
  expect(checks).toMatchObject({ independent:['service', true, true], independentKin:true, wrongCapacity:true,
    gift:1.25, fee:2.75, total:4, left:6, reserve:6, mode:'none', techErrors:[],
    before:{ gold:10, balance:1.25, capital:2, treasury:1, spent:1, commitment:null, history:null } });
  await page.locator(participant).selectOption(person.cid);
  await page.locator('#activity-review-' + importedActivity).click();
  await expect(fact(page, 'Current fund balance')).toHaveText(/^1\.25 /);
  await expect(fact(page, 'Restricted donation')).toHaveText(/^1\.25 /);
  await expect(fact(page, 'Attendance fee')).toHaveText(/^2\.75 /);
  await expect(fact(page, 'Total payment')).toHaveText(/^4 /);
  await page.locator(confirm).click();
  await expect(page.getByRole('heading', { name:'Decision recorded', exact:true })).toBeVisible();
  const enrolled = await page.evaluate(function () {
    return { facts:sponsorTest.facts(), payload:FB.save.serialize(), signature:FB.mods.sig() };
  });
  expect(enrolled.facts).toEqual({ ...checks.before, gold:6, balance:2.5,
    commitment:expect.objectContaining({ activityId:importedActivity, paid:2.75, location:'sardis' }) });
  expect(enrolled.facts.commitment.dueTurn - enrolled.facts.commitment.startTurn).toBe(3);
  await restoreBookmark(page, enrolled.payload);
  const delivered = await page.evaluate(function () {
    const t = sponsorTest, s = FB.state, restored = t.facts();
    s.turn = restored.commitment.dueTurn - 1;
    FB.religiousActivityTick(s);
    const early = t.facts();
    s.turn++;
    FB.religiousActivityTick(s);
    FB.religiousActivityTick(s);
    return { restored:restored, early:early, complete:t.facts(), payload:FB.save.serialize(), signature:FB.mods.sig() };
  });
  expect(delivered.restored).toEqual(enrolled.facts);
  expect(delivered.early).toEqual(enrolled.facts);
  expect(delivered.signature).toBe(enrolled.signature);
  expect(delivered.complete).toEqual({ ...enrolled.facts, balance:0, spent:3.5, piety:enrolled.facts.piety + 2, commitment:null,
    history:{ sardis_provisions_service_done:expect.objectContaining({ activityId:importedActivity, performed:true, rewarded:true }) } });
  await restoreBookmark(page, delivered.payload);
  expect(await page.evaluate(function () {
    return { facts:sponsorTest.facts(), signature:FB.mods.sig(), replay:sponsorTest.review().reason, offer:sponsorTest.quote() };
  })).toEqual({ facts:delivered.complete, signature:enrolled.signature, replay:'commitment', offer:null });
});
