'use strict';
const { test, expect } = require('../support/fixture');
const { openTitle } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

test.describe.configure({ mode:'parallel' });
dependsOnRuntime(__filename, ['index.html','data/bookmark_manifest.js','data/starts_courts_800.js',
  'data/story_households_baghdad_800.js','data/story_baghdad_commissions_800.js','js/story_household.js',
  'js/stories.js','js/day_phases.js','js/treasury.js','js/save.js','js/save_v4.js','js/ui_panels.js','js/ui_misc.js']);

const TRACK = 'baghdad_copyist_track_800';

async function startAtOffer(page, info) {
  await openTitle(page, info);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="800"]').click();
  await expect(page.locator('[data-scenario="baghdad_copyist_800"]')).toBeVisible();
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COPYIST-800-baghdad_copyist_800-baghdad-f-Review');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  expect(await page.evaluate(function (id) {
    const s = FB.state;
    FB.game.setPaused(true); FB.game.auto.all = false; FB.game.uiPrefs.hideTips = true;
    delete s.player.flags.tutorial;
    FB.pickDailyEvents = function () { return []; };
    return FB.stories.apply(s, id, 'keep_copying', FB.stories.quote(s, id, 'keep_copying'));
  }, TRACK)).toBe(true);
}

test('Deeds reviews both offers, restores focus and settles one longer commission', async function ({ page }, info) {
  await startAtOffer(page, info);
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + TRACK + '"]');
  await card.click();
  const short = page.locator('[data-story-choice="accept_order"]');
  const long = page.locator('[data-story-choice="accept_extended_copy"]');
  await expect(page.locator('[data-story-choice="decline_order"]')).toBeVisible();
  await short.click();
  await expect(page.getByText('Paid on completion: 6 gold. Disputed balance: 0 gold.', { exact:true })).toBeVisible();
  await expect(page.getByText('First working day: Winter 800, day 25. Last day to act: Winter 800, day 34.', { exact:true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(short).toBeFocused();
  await long.click();
  await expect(page.getByText('Paid on completion: 8 gold. Disputed balance: 4 gold.', { exact:true })).toBeVisible();
  await expect(page.getByText('First working day: Winter 800, day 25. Last day to act: Winter 800, day 38.', { exact:true })).toBeVisible();
  const terms = await page.evaluate(function () { return [FB.money(2),FB.money(4)]; });
  await expect(page.getByText('A settlement pays ' + terms[0] + ' and returns ' + terms[0] +
    '. A hearing takes one action day and pays ' + terms[1] + '. Waiving returns the whole disputed balance.', { exact:true })).toBeVisible();
  await page.locator('#gm-story-confirm').click();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(function (id) {
    const s = FB.state, t = s.stories[id], applied = [];
    for (const choice of ['finish_extended_copy','compare_extended_copy','deliver_extended_copy']) {
      applied.push(FB.stories.apply(s,id,choice,FB.stories.quote(s,id,choice)));
    }
    return { applied, phase:t.phase, jobs:Object.keys(t.jobs), turn:s.turn, gold:s.player.gold,
      row:[t.jobs.extended_copy.daysWorked,t.jobs.extended_copy.paid,t.jobs.extended_copy.escrow] };
  }, TRACK)).toEqual({ applied:[true,true,true], phase:'extended_account', jobs:['extended_copy'], turn:4, gold:20, row:[4,8,4] });
  await page.evaluate(function () { FB.ui.refresh(); });
  await card.click();
  await page.locator('[data-story-choice="settle_extended_copy"]').click();
  await page.locator('#gm-story-confirm').click();
  expect(await page.evaluate(function (id) {
    const s = FB.state, t = s.stories[id], row = t.jobs.extended_copy;
    return { phase:t.phase, turn:s.turn, gold:s.player.gold, ledger:[row.paid,row.refunded,row.escrow,row.resolution] };
  }, TRACK)).toEqual({ phase:'patronage', turn:4, gold:22, ledger:[10,2,0,'settlement'] });
});

test('a partly funded court can still offer the shorter job and a stale larger review spends nothing', async function ({ page }, info) {
  await startAtOffer(page, info);
  expect(await page.evaluate(function (id) {
    const s = FB.state, t = s.stories[id], account = s.realms.abbasid.treasury;
    const long = FB.stories.quote(s,id,'accept_extended_copy');
    account.gold = account.militaryAccrued + 6;
    const before = JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const stale = FB.stories.apply(s,id,'accept_extended_copy',long);
    const short = FB.stories.quote(s,id,'accept_order').allowed;
    const unfunded = FB.stories.quote(s,id,'accept_extended_copy');
    const pure = before === JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    FB.stories.get(id).day(s,t);
    const offer = t.phase;
    const declined = FB.stories.apply(s,id,'decline_order',FB.stories.quote(s,id,'decline_order'));
    return { reviewed:long.allowed, stale, short, blocked:!unfunded.allowed, reserveReason:unfunded.reason.includes(FB.money(12)),
      pure, offer, declined, turn:s.turn, gold:s.player.gold, jobs:Object.keys(t.jobs) };
  }, TRACK)).toEqual({ reviewed:true, stale:false, short:true, blocked:true, reserveReason:true,
    pure:true, offer:'offer', declined:true, turn:0, gold:12, jobs:[] });
});

test('matching restore resumes partial work and the account can only pay one resolution', async function ({ page }, info) {
  await startAtOffer(page, info);
  expect(await page.evaluate(function (id) {
    function choose(choice) {
      return FB.stories.apply(FB.state,id,choice,FB.stories.quote(FB.state,id,choice));
    }
    function save() { return JSON.parse(FB.save.serialize()); }
    function ledger() {
      const s = FB.state, row = s.stories[id].jobs.extended_copy;
      return [s.turn,s.player.gold,row.daysWorked,row.paid,row.refunded,row.escrow,row.status,row.resolution];
    }
    const accepted = choose('accept_extended_copy'), pending = save(), before = ledger();
    FB.save.restore(pending);
    const restored = ledger();
    // A living payer with no available cash still has a fully funded escrow.
    FB.state.realms.abbasid.treasury.gold = 0;
    const shifts = ['finish_extended_copy','compare_extended_copy','deliver_extended_copy'].map(choose);
    const disputed = save(), completed = ledger();
    const resolutions = ['hear_extended_copy','waive_extended_copy'].map(function (choice) {
      FB.save.restore(disputed);
      const ok = choose(choice), end = ledger(), closed = save();
      FB.save.restore(closed);
      return { ok, end, restored:ledger(), repeat:choose(choice), other:choose('settle_extended_copy') };
    });
    const later = ['seek_another','accept_later'].map(choose);
    return { accepted, before, restored, shifts, completed, resolutions, later, jobs:Object.keys(FB.state.stories[id].jobs) };
  }, TRACK)).toEqual({ accepted:true, before:[1,12,1,0,0,12,'working',null], restored:[1,12,1,0,0,12,'working',null],
    shifts:[true,true,true], completed:[4,20,4,8,0,4,'disputed',null], resolutions:[
      { ok:true, end:[5,24,4,12,0,0,'settled','hearing'], restored:[5,24,4,12,0,0,'settled','hearing'], repeat:false, other:false },
      { ok:true, end:[4,20,4,8,4,0,'settled','waive'], restored:[4,20,4,8,4,0,'settled','waive'], repeat:false, other:false }
    ], later:[true,true], jobs:['extended_copy','later_copy'] });
});

for (const completed of [false,true]) {
  test('expiry conserves the longer fee after ' + (completed ? 'delivery' : 'two shifts'), async function ({ page }, info) {
    await startAtOffer(page, info);
    expect(await page.evaluate(function (input) {
      const s = FB.state, t = s.stories[input.id], story = FB.stories.get(input.id);
      function choose(choice) { return FB.stories.apply(s,input.id,choice,FB.stories.quote(s,input.id,choice)); }
      const choices = ['accept_extended_copy','finish_extended_copy'];
      if (input.completed) choices.push('compare_extended_copy','deliver_extended_copy');
      const applied = choices.map(choose), row = t.jobs.extended_copy;
      s.date = FB.dateAtTurn(s,row.expiresTurn); s.turn = row.expiresTurn;
      const gold = s.player.gold, publicGold = s.realms.abbasid.treasury.gold;
      story.day(s,t);
      const once = JSON.stringify([s.player.gold,s.realms.abbasid.treasury.gold,t]);
      story.day(s,t);
      return { applied, phase:t.phase, paid:row.paid, escrow:row.escrow, refund:row.refunded, status:row.status,
        gold:s.player.gold-gold, publicGold:s.realms.abbasid.treasury.gold-publicGold,
        stable:once === JSON.stringify([s.player.gold,s.realms.abbasid.treasury.gold,t]), later:choose('hear_extended_copy') };
    }, { id:TRACK, completed })).toEqual(completed ? {
      applied:[true,true,true,true], phase:'extended_closed', paid:12, escrow:0, refund:0, status:'expired', gold:4, publicGold:0, stable:true, later:false
    } : {
      applied:[true,true], phase:'closed_order', paid:4, escrow:0, refund:8, status:'expired', gold:4, publicGold:8, stable:true, later:false
    });
  });
}
