'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { beginBookmark, beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename, ['index.html','data/story_households_800.js','data/technology.js',
  'js/story_household.js','js/stories.js','js/day_phases.js','js/treasury.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_panels.js']);

const AACHEN = { story:'aachen_household_track_800', job:'palace_delivery', payer:'carolingian_800' };
const QUAY = { story:'quay_inventory_work', job:'inventory', payer:'west_francia' };
const resignId = job => 'resign_job:' + job.job;
const choiceButton = (page, choice) => page.locator('[data-story-choice="' + choice + '"]');

async function choose(page, job, choice) {
  return page.evaluate(function ({ story, choice }) {
    const s = FB.state;
    return FB.stories.apply(s, story, choice, FB.stories.quote(s, story, choice));
  }, { story:job.story, choice });
}

async function ledger(page, job) {
  return page.evaluate(function ({ story, job, payer }) {
    const s = FB.state, t = s.stories[story], row = t.jobs[job];
    return { turn:s.turn, gold:s.player.gold, treasury:s.realms[payer].treasury.gold, phase:t.phase,
      row:[row.daysWorked,row.paid,row.refunded,row.escrow,row.status,row.resolution] };
  }, job);
}

async function deed(page, job) {
  await page.locator('[data-tab="actions"]').click();
  const card = page.locator('[data-story-card="' + job.story + '"]');
  await card.click();
  return card;
}

async function aachenJob(page, info) {
  await beginBookmark(page, info, '800', 'aachen_household_800');
  expect(await choose(page, AACHEN, 'hear_report')).toBe(true);
  await page.evaluate(function (id) {
    const s = FB.state;
    s.date = { year:801, season:0, day:30 }; s.turn = 360;
    FB.stories.get(id).year(s, s.stories[id]);
  }, AACHEN.story);
  expect(await choose(page, AACHEN, 'accept_delivery')).toBe(true);
}

async function quayJob(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/account-choice-quay.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page, '867', 'quay_inventory_start');
  await page.evaluate(function () { FB.state.date.day = 30; });
  expect(await choose(page, QUAY, 'accept')).toBe(true);
}

async function expectResignationTerms(page, worked, payment, refund) {
  const amount = await page.evaluate(function ({ payment, refund }) {
    return { payment:FB.money(payment), refund:FB.money(refund) };
  }, { payment, refund });
  const body = page.locator('#gm-body');
  const facts = body.locator('.review-fact-card .kv');
  await expect(facts.filter({ hasText:'Work credited' }).locator('b')).toHaveText(worked + ' of 3 action days');
  await expect(facts.filter({ hasText:'Paid to your household now' }).locator('b')).toHaveText(amount.payment);
  await expect(facts.filter({ hasText:'Refund to the original payer' }).locator('b')).toHaveText(amount.refund);
  await expect(body.getByText('Completed shifts cannot be recovered.', { exact:true })).toBeVisible();
  await expect(body.getByText('No additional action day', { exact:true })).toBeVisible();
  const payer = body.locator('.review-person').filter({ hasText:'Original payer' });
  await expect(payer).toBeVisible();
  await expect(payer.locator('canvas')).toHaveCount(1);
}

test('the native Aachen worker can review, keep working, then resign from Deeds', async function ({ page }, info) {
  await aachenJob(page, info);
  const before = await ledger(page, AACHEN);
  expect(before.row).toEqual([1,0,0,4,'working',null]);
  const card = await deed(page, AACHEN);
  const resign = choiceButton(page, resignId(AACHEN));
  await resign.click();
  await expectResignationTerms(page, 1, 0, 4);
  await page.locator('[data-modal-nav="back"]').click();
  await expect(resign).toBeFocused();
  expect(await ledger(page, AACHEN)).toEqual(before);

  await choiceButton(page, 'work_shift').click();
  await page.locator('#gm-story-confirm').click();
  await page.locator('#gm-story-continue').click();
  await expect(card).toBeFocused();
  const partial = await ledger(page, AACHEN);
  expect(partial.turn).toBe(before.turn + 1);
  await card.click();
  await resign.click();
  await expectResignationTerms(page, 2, 1, 3);
  await page.locator('#gm-story-confirm').click();
  expect(await ledger(page, AACHEN)).toEqual({ turn:partial.turn, gold:partial.gold + 1,
    treasury:partial.treasury + 3, phase:'await_instructions', row:[2,1,3,0,'cancelled','interrupted'] });
  await page.locator('#gm-story-continue').click();
  await expect(card).toBeFocused();
  await card.click();
  await expect(resign).toHaveCount(0);
  await expect(choiceButton(page, 'work_shift')).toHaveCount(0);
});

test('an imported job can resign after restore or keep its completed hearing and settlement rights', async function ({ page }, info) {
  await quayJob(page, info);
  const id = resignId(QUAY);
  const before = await ledger(page, QUAY);
  const pending = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  await page.evaluate(function (save) { FB.save.restore(save); }, pending);
  expect(await ledger(page, QUAY)).toEqual(before);
  const card = await deed(page, QUAY), resign = choiceButton(page, id);
  await resign.click();
  await expectResignationTerms(page, 1, 3, 14);
  await page.keyboard.press('Escape');
  await expect(resign).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await ledger(page, QUAY)).toEqual(before);

  expect(await page.evaluate(function ({ story, job, payer, id }) {
    const quote = () => FB.stories.quote(FB.state, story, id);
    const apply = (choice, review) => FB.stories.apply(FB.state, story, choice, review || FB.stories.quote(FB.state, story, choice));
    const row = () => FB.state.stories[story].jobs[job];
    const save = () => JSON.parse(FB.save.serialize());
    const ledger = () => [FB.state.turn,FB.state.player.gold,FB.state.realms[payer].treasury.gold,
      row().daysWorked,row().paid,row().refunded,row().escrow,row().status];
    const pending = save(), start = ledger(), reviewed = quote();
    const shifts = [apply('shift'),apply('shift')], disputed = save(), completed = ledger();
    const afterCompletion = { replay:apply(id, reviewed), shown:FB.stories.choices(FB.state, story).some(c => c.id === id) };
    const settlement = apply('settlement'), settled = ledger(), secondSettlement = apply('hearing');
    FB.save.restore(disputed);
    const hearing = apply('hearing'), heard = ledger(), secondHearing = apply('settlement');
    FB.save.restore(pending);
    const exitQuote = quote(), resigned = apply(id, exitQuote), exited = ledger();
    const closed = save(); FB.save.restore(closed);
    const repeated = apply(id, exitQuote);
    FB.stories.get(story).day(FB.state, FB.state.stories[story]);
    const retained = ledger();
    delete pending.state.stories[story].jobs;
    delete pending.state.stories[story].jobPatrons;
    FB.save.restore(pending);
    const legacy = !FB.state.stories[story].jobs && !quote().allowed;
    return { shifts, afterCompletion, completed:completed.slice(3),
      settlement, settled:[settled[0]-completed[0], ...settled.slice(4)], secondSettlement,
      hearing, heard:[heard[0]-completed[0], ...heard.slice(4)], secondHearing,
      resigned, exited:[exited[0]-start[0],exited[1]-start[1],exited[2]-start[2], ...exited.slice(3)],
      repeated, retained:JSON.stringify(retained) === JSON.stringify(exited), legacy };
  }, { ...QUAY, id })).toEqual({ shifts:[true,true], afterCompletion:{ replay:false, shown:false }, completed:[3,11,0,6,'disputed'],
    settlement:true, settled:[0,13,4,0,'settled'], secondSettlement:false,
    hearing:true, heard:[1,17,0,0,'settled'], secondHearing:false,
    resigned:true, exited:[0,3,14,1,3,14,0,'cancelled'], repeated:false, retained:true, legacy:true });
});

test('native resignation rejects stale day, contract, payer and worker facts without moving escrow', async function ({ page }, info) {
  await aachenJob(page, info);
  expect(await page.evaluate(function ({ story, job, payer, id }) {
    const s = FB.state, track = s.stories[story], row = track.jobs[job], realm = s.realms[payer];
    const view = () => JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const initial = view(), review = FB.stories.quote(s, story, id);
    FB.stories.choices(s, story); FB.stories.cards(s);
    const pure = view() === initial;
    const attempts = [];
    function stale(object, key, changed) {
      const old = object[key]; object[key] = changed;
      const staged = view();
      attempts.push([FB.stories.apply(s, story, id, review), view() === staged]);
      object[key] = old;
    }
    stale(s, 'turn', s.turn + 1);
    stale(s.date, 'day', s.date.day + 1);
    stale(row, 'openedTurn', row.openedTurn - 1);
    stale(row, 'daysWorked', 2);
    stale(row, 'payerId', 'player');
    stale(row, 'workerId', track.jobPatrons[job]);
    stale(s.player, 'charId', track.jobPatrons[job]);
    stale(s.chars[track.jobPatrons[job]], 'dead', true);
    stale(realm.treasury, 'retired', true);
    return { offered:review.allowed, pure, attempts, restored:view() === initial };
  }, { ...AACHEN, id:resignId(AACHEN) })).toEqual({ offered:true, pure:true,
    attempts:Array.from({ length:9 }, () => [false,true]), restored:true });
});
