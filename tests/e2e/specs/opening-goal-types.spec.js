'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const proof = require('../fixtures/authoring/opening-goals.json');
dependsOnRuntime(__filename, ['index.html','js/story_opening_goals.js','js/stories.js','js/story_household.js','js/main.js',
  'js/government_collective.js','js/government_support.js','js/government_recognition.js','js/government_aristocracy.js',
  'js/treasury.js','js/events.js','js/starts.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js',
  'data/starts.js','data/bookmark_711.js','data/bookmark_1204_terrain.js','data/actions.js','data/technology.js']);

async function importedStart(page, info, publicProfile) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/opening-goals.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.stories.get('proof_private_goals'); });
  await startParityGame(page, info, { bookmark:publicProfile ? '1204' : '711',
    scenario:publicProfile ? 'siwa_delegate_1204' : 'toledo_household_711', declaredOpening:true });
}

test('JSON private goals distinguish earned work from savings and survive restore without replay', async function ({ page }, info) {
  await importedStart(page, info, false);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'proof_private_goals', t = s.stories[id], story = FB.stories.get(id);
    const initial = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.status(s, id); story.people(s, t); FB.stories.quote(s, id, 'dismiss_proof_reserve');
    const pure = initial === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.player.gold += 2000; story.day(s, t);
    const giftNotWork = t.goals.proof_earn.status === 'pending' && t.goals.proof_reserve.status === 'completed';
    FB.householdStories.focusPaid(s, 'craft_work', 2);
    FB.householdStories.focusPaid(s, 'craft_work', 2);
    const once = t.earnings.craft_work === 2;
    s.turn++; FB.householdStories.focusPaid(s, 'craft_work', 1);
    const cash = s.player.gold, record = JSON.stringify(t), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const retained = record === JSON.stringify(FB.state.stories[id]) && cash === FB.state.player.gold;
    const before = JSON.stringify(FB.state); FB.openingGoals.start(FB.state);
    const noIntroduction = before === JSON.stringify(FB.state);
    delete saved.state.stories[id]; FB.save.restore(saved);
    return { pure:pure, giftNotWork:giftNotWork, once:once, completed:t.goals.proof_earn.status, retained:retained,
      noIntroduction:noIntroduction, absent:!FB.state.stories[id] };
  });
  expect(result).toEqual({ pure:true, giftNotWork:true, once:true, completed:'completed', retained:true, noIntroduction:true, absent:true });
});

for (const refusal of [false, true]) {
  test('JSON public goals observe an actual constituent decision with refusal ' + refusal, async function ({ page }, info) {
    await importedStart(page, info, true);
    const result = await page.evaluate(function (refusal) {
      const s = FB.state, id = 'proof_public_goals', t = s.stories[id], C = FB.governments.support, rid = 'siwa_households_1204';
      if (refusal) C.profile(s, rid).members.forEach(function (m) { m.support = 0; });
      const cash = s.player.gold, treasury = FB.treasuryAvailable(s, rid);
      const q = C.assentQuote(s, rid, 'extraordinary_tax', { amount:1, duration:45 });
      const pendingBeforeCommit = t.goals.proof_consent.status === 'pending';
      C.assent(s, q);
      const completed = t.goals.proof_consent.status;
      FB.treasurySeason(s); // Opening-period initialization cannot be a receipt.
      const receiptPending = t.goals.proof_receipt.status === 'pending';
      C.row(s, rid).mandate.status = 'ended'; FB.stories.get(id).day(s, t);
      const archived = t.goals.proof_receipt.status;
      return { pendingBeforeCommit:pendingBeforeCommit, completed:completed, receiptPending:receiptPending, archived:archived,
        privateSame:cash === s.player.gold, publicSame:treasury === FB.treasuryAvailable(s, rid),
        decision:C.row(s,rid).decisions.slice(-1)[0].status };
    }, refusal);
    expect(result).toEqual({ pendingBeforeCommit:true, completed:'completed', receiptPending:true, archived:'archived',
      privateSame:true, publicSame:true, decision:refusal ? 'refused' : 'approved' });
  });
}

test('dismissal rechecks the current actor, death archives remaining goals, and named people never retarget', async function ({ page }, info) {
  await importedStart(page, info, false);
  const result = await page.evaluate(function () {
    const s = FB.state, id = 'proof_private_goals', t = s.stories[id], story = FB.stories.get(id);
    const person = t.contacts.proof_target, q = FB.stories.quote(s, id, 'dismiss_proof_earn');
    s.turn++;
    const stale = FB.stories.apply(s, id, 'dismiss_proof_earn', q);
    const dismissed = FB.stories.apply(s, id, 'dismiss_proof_earn', FB.stories.quote(s, id, 'dismiss_proof_earn'));
    const twice = FB.stories.apply(s, id, 'dismiss_proof_earn', FB.stories.quote(s, id, 'dismiss_proof_earn'));
    s.chars[person].dead = true; s.realms.visigoths_711.ruler.generation++;
    s.chars[t.actorId].dead = true; story.day(s, t); const record = JSON.stringify(t); story.day(s, t);
    return { stale:stale, dismissed:dismissed, twice:twice, unchangedPerson:t.contacts.proof_target === person,
      unavailable:story.people(s,t)[0].reason, archived:t.goals.proof_reserve.status, once:record === JSON.stringify(t),
      noFriend:!s.player.friendContacts || !s.player.friendContacts[person] };
  });
  expect(result).toMatchObject({ stale:false, dismissed:true, twice:false, unchangedPerson:true, archived:'archived', once:true, noFriend:true });
  expect(result.unavailable).toContain('died');
});

for (const fault of ['criterion','amount','selector','source_choice','unknown_field','future_receipt','earnings_cap']) {
  test('opening profile rejects ' + fault + ' without mutating registry or campaign', async function ({ page }, info) {
    await importedStart(page, info, false);
    const result = await page.evaluate(function (fault) {
      const s = FB.state, id = 'proof_private_goals', before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const table = JSON.parse(JSON.stringify(FBDATA.storyInstances)), d = table[id]; let rejected = false;
      try {
        if (fault === 'future_receipt' || fault === 'earnings_cap') {
          const t = JSON.parse(JSON.stringify(s.stories[id]));
          if (fault === 'future_receipt') t.goals.proof_earn = { status:'completed', turn:s.turn + 1 };
          else t.earnings.craft_work = 4;
          FB.stories.get(id).validate(t, s);
        } else {
          if (fault === 'criterion') d.goals[0].criterion.kind = 'arbitrary_state_path';
          if (fault === 'amount') d.goals[0].criterion.amount = -1;
          if (fault === 'selector') d.contacts[0].person.source = 'generated_name';
          if (fault === 'source_choice') d.goals[0].criterion = { kind:'story_choice', storyId:'missing_source', choiceIds:['fake_choice'] };
          if (fault === 'unknown_field') d.goals[0].criterion.statePath = 'player.gold';
          FB.stories.compile(table);
        }
      } catch (e) { rejected = true; }
      return { rejected:rejected, pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, fault);
    expect(result).toEqual({ rejected:true, pure:true });
  });
}

test('named-person character navigation returns to the opening goal sheet', async function ({ page }, info) {
  await importedStart(page, info, false);
  await page.evaluate(function () { FB.ui.showStorySheet('proof_private_goals'); });
  await page.locator('[data-story-person]').click();
  await expect(page.locator('#cm-close')).toHaveText('Back');
  await page.locator('#cm-close').click();
  await expect(page.locator('[data-story-person]')).toHaveCount(1);
  await expect(page.locator('[data-story-choice="dismiss_proof_earn"]')).toBeVisible();
});
