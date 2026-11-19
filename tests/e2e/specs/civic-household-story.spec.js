'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame } = require('../support/game/navigation');
const { beginBookmarkFromTitle } = require('../support/game/bookmark-acceptance');
const { expectModAdmission } = require('../support/game/mod-admission');
const { useReleasedStartRules } = require('../support/game/released-starts');
const { civicReview, civicRecordsImport } = require('../fixtures/authoring/stories-451-validation.json');

dependsOnRuntime(__filename, [
  'data/bookmark_451.js', 'data/bookmark_451_composition.js', 'data/starts_451.js',
  'data/story_451.js', 'data/campaigns_451.js', 'data/actions.js', 'data/economy.js',
  'data/technology.js', 'js/bookmark_sources.js', 'js/starts.js', 'js/story_household.js',
  'js/story_opening_goals.js', 'js/stories.js', 'js/story_agreements.js', 'js/actions.js',
  'js/wars.js', 'js/world.js', 'js/treasury.js', 'js/main.js', 'js/day_phases.js', 'js/save.js',
  'js/save_v4.js', 'js/mods.js', 'js/ui_misc.js', 'js/ui_panels.js'
]);

test.describe.configure({ mode:'parallel' });

async function startReview(page, info, checkHiddenDate) {
  await useReleasedStartRules(page);
  await openGame(page, info);
  expect(await page.evaluate(function (id) { return FB.bookmarkAvailable(id); },
    civicReview.bookmarkId)).toBe(false);

  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const seed = page.locator('#ng-seed');
  await seed.fill(civicReview.code);
  if (checkHiddenDate) {
    await seed.press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('This starting date is hidden for new campaigns.');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  }
  await page.evaluate(function (id) { FBDATA.bookmarks[id].hidden = false; }, civicReview.bookmarkId);
  await seed.press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.auto.all = true;
    FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
  });
}

async function deeds(page, id) {
  await page.locator('[data-tab="actions"]').click();
  return page.locator('[data-story-card="' + id + '"]');
}

async function review(page, card, choice) {
  await card.click();
  await page.locator('[data-story-choice="' + choice + '"]').click();
  await expect(page.locator('#gm-story-confirm')).toBeVisible();
}

async function confirm(page) {
  await page.locator('#gm-story-confirm').click();
  await page.locator('#gm-story-continue').click();
}

async function snapshot(page, restore) {
  return page.evaluate(function (input) {
    if (input.restore) FB.save.restore(JSON.parse(FB.save.serialize()));
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    const out = { turn:s.turn, actor:p.charId, culture:c.culture, faith:c.religion,
      gold:p.gold, focus:p.focus, tier:p.tier, profession:c.career.profession, rank:c.career.rank,
      scenario:s.start.scenarioId, home:p.provinceId, travel:p.travel || null,
      owner:s.owner.orleans, holder:s.holder.orleans, appointments:s.authority.appointments,
      judge:FB.political.permission(s, { kind:'character', id:p.charId }, 'judge',
        { provinceId:'orleans' }).allowed,
      track:s.stories[input.fixture.storyId], goal:s.stories[input.fixture.openingId].goals.earned,
      relocation:s.stories.gallic_relocation_451, populations:[s.population.orleans,s.population.paris] };
    return JSON.parse(JSON.stringify(out));
  }, { fixture:civicReview, restore:!!restore });
}

async function workDay(page) {
  return page.evaluate(function () {
    const s = FB.state, date = JSON.stringify(s.date), turn = s.turn, tick = FB.tickFocus;
    const pay = [];
    FB.tickFocus = function (state) {
      const gold = state.player.gold, focus = state.player.focus;
      const sovereign = FB.topRealm(state, state.owner[state.player.provinceId]);
      const treasury = FB.treasuryAvailable(state, sovereign);
      const status = FB.focusStatus(state, focus);
      const expected = (status.preview.seasonal || []).reduce(function (total, row) {
        return total + (row.type === 'gold' && row.reward ? row.amount / 90 : 0);
      }, 0);
      tick(state);
      pay.push({ focus:focus, gain:state.player.gold - gold, expected:expected,
        publicFundsUnchanged:FB.treasuryAvailable(state, sovereign) === treasury });
    };
    try { FB.game.passDay({ deferUi:true }); }
    finally { FB.tickFocus = tick; }
    return { days:s.turn - turn, dated:date !== JSON.stringify(s.date), pay:pay };
  });
}

function expectDailyRecords(result) {
  expect(result).toMatchObject({ days:1, dated:true,
    pay:[{ focus:'keep_records', publicFundsUnchanged:true }] });
  expect(result.pay[0].gain).toBeGreaterThan(0);
  expect(result.pay[0].gain).toBeCloseTo(result.pay[0].expected, 10);
}

test('the civic household defers, resumes and saves ordinary records work through Deeds', async function ({ page }, info) {
  await startReview(page, info, true);
  let card = await deeds(page, civicReview.storyId);
  const opening = await snapshot(page);
  expect(opening).toMatchObject({ scenario:civicReview.scenarioId, home:civicReview.provinceId,
    culture:'gallo_roman', faith:'nicene', tier:2, profession:'curialis', rank:'journeyman', judge:false,
    track:{ phase:'livelihood', decisions:{}, householdReceipts:{} }, goal:{ status:'pending' },
    relocation:{ phase:'pending' } });
  expect(opening.track.actorId).toBe(opening.actor);
  await review(page, card, 'work');
  await expect(page.locator('#genmodal')).toContainText('Earnings go to the household after a worked day.');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="work"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await snapshot(page)).toEqual(opening);

  await review(page, card, 'work');
  await confirm(page);
  const pending = await snapshot(page);
  expect(pending.track).toMatchObject({ phase:'working', decisions:{ livelihood:{ choiceId:'work',
    actorId:opening.actor, turn:opening.turn } } });
  expect({ ...pending, track:opening.track, focus:opening.focus }).toEqual(opening);
  expect(pending.focus).toBe('keep_records');
  expect(await snapshot(page, true)).toEqual(pending);

  await page.evaluate(function () { FB.setFocus(FB.state, 'rest'); FB.ui.refresh(); });
  expect(await workDay(page)).toMatchObject({ days:1, dated:true, pay:[{ focus:'rest', gain:0 }] });
  expect(await snapshot(page)).toMatchObject({ track:{ phase:'working' }, goal:{ status:'pending' } });

  card = await deeds(page, civicReview.storyId);
  await review(page, card, 'continue_work');
  const beforeResume = await snapshot(page);
  await confirm(page);
  expect(await snapshot(page)).toMatchObject({ gold:beforeResume.gold, turn:beforeResume.turn,
    focus:'keep_records', goal:{ status:'pending' } });
  expectDailyRecords(await workDay(page));
  const paid = await snapshot(page);
  expect(paid).toMatchObject({ track:{ phase:'paid', householdReceipts:{} }, goal:{ status:'completed' },
    home:opening.home, travel:null, owner:opening.owner, holder:opening.holder, tier:2,
    judge:false, appointments:opening.appointments });
  expect(await snapshot(page, true)).toEqual(paid);
  expect(await page.evaluate(function (id) {
    const s = FB.state;
    const quote = FB.stories.quote(s,id,'continue_work');
    return quote.allowed || FB.stories.apply(s,id,'continue_work',quote);
  }, civicReview.storyId)).toBe(false);
  expect(await snapshot(page)).toEqual(paid);
});

test('war permits work to resume and closing a change-of-rule review records no event or move', async function ({ page }, info) {
  await startReview(page, info, false);
  expect(await page.evaluate(function (id) {
    const s = FB.state, old = FB.topRealm(s,s.owner.orleans);
    const enemy = 'burgundian_settlement_451';
    FB.registerOrdinaryWar(s,old,{ enemy:enemy, target:'geneva' });
    FB.stories.get(id).day(s,s.stories[id]);
    FB.ui.refresh();
    return { war:FB.isRealmAtWar(s,old), phase:s.stories[id].phase };
  }, civicReview.storyId)).toEqual({ war:true, phase:'upheaval' });
  const card = await deeds(page, civicReview.storyId);
  await review(page, card, 'retain_livelihood');
  await confirm(page);
  expect(await page.evaluate(function (id) {
    const s = FB.state, t = s.stories[id];
    FB.stories.get(id).day(s,t);
    const wartime = t.phase;
    const newOwner = 'burgundian_settlement_451';
    FB.transferProvince(s,'orleans',newOwner);
    FB.stories.get(id).day(s,t);
    FB.ui.refresh();
    return { wartime:wartime, phase:t.phase, owner:s.owner.orleans };
  }, civicReview.storyId)).toEqual({ wartime:'wartime_work', phase:'control', owner:'burgundian_settlement_451' });

  const changed = await snapshot(page);
  expect(changed.track.householdReceipts).toEqual({});
  await review(page, card, 'resume_work');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await snapshot(page)).toEqual(changed);

  await review(page, card, 'resume_work');
  await confirm(page);
  const resumed = await snapshot(page);
  expect(resumed.track).toMatchObject({ phase:'resettled_work',
    decisions:{ control:{ choiceId:'resume_work', actorId:changed.actor } } });
  expect(Object.values(resumed.track.householdReceipts)).toEqual([
    { owner:civicReview.storyId, status:'resolved', turn:changed.turn }
  ]);
  expect({ ...resumed, track:changed.track }).toEqual(changed);
  expectDailyRecords(await workDay(page));
  expect(await snapshot(page)).toMatchObject({ track:{ phase:'paid',
    householdReceipts:resumed.track.householdReceipts }, goal:{ status:'completed' }, home:'orleans' });
});

test('an independently authored Ravenna records decision works through ordinary JSON import', async function ({ page }, info) {
  await openGame(page, info);
  await expectModAdmission(page, civicRecordsImport);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({
    name:'ravenna-ledger-household.json', mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(civicRecordsImport))
  });
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page, '476', civicRecordsImport.startScenarios[0].id);
  const id = 'ravenna_ledger_work';
  const card = await deeds(page, id);
  await review(page, card, 'open_ledger');
  await confirm(page);
  expect(await page.evaluate(function (id) {
    const s = FB.state;
    return { phase:s.stories[id].phase, gold:s.player.gold, focus:s.player.focus, home:s.player.provinceId };
  }, id)).toEqual({ phase:'working', gold:31, focus:'keep_records', home:'ravenna' });
  expectDailyRecords(await workDay(page));
  expect(await page.evaluate(function (id) {
    const s = FB.state;
    return { phase:s.stories[id].phase, choice:s.stories[id].decisions.offer.choiceId };
  }, id)).toEqual({ phase:'entered', choice:'open_ledger' });
});
