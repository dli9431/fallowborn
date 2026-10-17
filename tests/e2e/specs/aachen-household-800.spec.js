'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/story_households_800.js','data/story_instances.js',
  'data/starts.js','data/bookmark_800.js','data/bookmark_800_history.js','data/government_rollout.js',
  'data/islamic_rollout.js','data/technology.js','js/story_household.js','js/stories.js','js/starts.js',
  'js/bookmark_setup.js','js/story_settlements.js','js/royal_settlements.js','js/story_campaign.js',
  'js/actions.js','js/treasury.js','js/main.js','js/world.js','js/model.js','js/economy.js',
  'js/save.js','js/save_v4.js','js/i18n.js','js/ui_misc.js','js/ui_panels.js']);
const ID = 'aachen_household_track_800';

async function year(page, value) {
  await page.evaluate(function (year) {
    const s = FB.state;
    s.date = { year:year, season:0, day:30 };
    s.turn = (year - 800) * 360;
    FB.stories.get('aachen_household_track_800').year(s, s.stories.aachen_household_track_800);
  }, value);
}

async function choose(page, choice) {
  return page.evaluate(function (choice) {
    const s = FB.state, id = 'aachen_household_track_800';
    return FB.stories.apply(s, id, choice, FB.stories.quote(s, id, choice));
  }, choice);
}

async function offer(page, info) {
  await beginBookmark(page, info, '800', 'aachen_household_800');
  expect(await choose(page, 'hear_report')).toBe(true);
  await year(page, 801);
}

test('Aachen attaches locally on every retained revision and preserves ordinary household choices', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const sc = FBDATA.startScenarios.find(function (r) { return r.id === 'aachen_household_800'; });
    const revisions = ['baseline'].concat(Object.keys(FBDATA.bookmarks['800'].revisions || {}));
    return { tracks:FB.startTracks(sc, 'aachen'), away:FB.startTracks(sc, 'paris'),
      errors:revisions.map(function (revision) { return FB.validateBookmark(FB.bookmark('800', revision)); }).filter(function (e) { return e.length; }),
      noPresetOverride:!sc.familyPresets, stock:[sc.tier,sc.profession,sc.gold,sc.prestige,sc.piety,sc.startEffects.landPlots],
      held:!!FBDATA.storyInstances.aachen_displaced_neighbors_804 };
  })).toEqual({ tracks:[ID], away:[], errors:[], noPresetOverride:true, stock:[1,'farmer',20,5,0,1], held:false });
  await beginBookmark(page, info, '800', 'aachen_household_800');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.aachen_household_track_800;
    return { phase:t.phase, home:s.player.provinceId, binding:!!t.jobPatrons.palace_delivery,
      jobs:Object.keys(t.jobs).length, relativeCount:FB.householdMembers(s).length > 1 };
  })).toEqual({ phase:'news', home:'aachen', binding:true, jobs:0, relativeCount:true });
});

test('the initial report and farm choice preserve the job window without changing the royal stories', async function ({ page }, info) {
  await beginBookmark(page, info, '800', 'aachen_household_800');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'aachen_household_track_800', before = [s.turn,s.player.gold,s.player.piety,s.player.prestige];
    const sources = Object.keys(s.stories).filter(function (key) { return key !== id; });
    const facts = JSON.stringify(sources.map(function (key) { return s.stories[key]; }));
    const farm = FB.stories.apply(s, id, 'farm_first', FB.stories.quote(s, id, 'farm_first'));
    return { farm, phase:s.stories[id].phase,
      same:JSON.stringify(before) === JSON.stringify([s.turn,s.player.gold,s.player.piety,s.player.prestige]),
      world:JSON.stringify(sources.map(function (key) { return s.stories[key]; })) === facts };
  })).toEqual({ farm:true, phase:'await_work', same:true, world:true });
  await year(page, 801);
  expect(await page.evaluate(function () { return FB.state.stories.aachen_household_track_800.phase; })).toBe('offer');
});

for (const family of ['standard','elder']) {
  test('the Aachen track attaches to the ordinary ' + family + ' family', async function ({ page }, info) {
    await openGame(page, info);
    await page.evaluate(function () { FBDATA.bookmarks['800'].hidden = false; FB.startProgression.noteTier(3); });
    const start = page.locator('#btn-choose-beginning');
    if (await start.isVisible()) await start.click();
    else await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('AACHENFAMILY-800-aachen_household_800-aachen-m-Review-' + family);
    await page.locator('#ng-seed').press('Enter');
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    expect(await page.evaluate(function () {
      const s = FB.state, t = s.stories.aachen_household_track_800;
      return { phase:t.phase, home:s.player.provinceId, age:FB.ageOf(s.chars[s.player.charId], s.date.year),
        personal:t.actorId === s.player.charId, jobs:Object.keys(t.jobs).length };
    })).toEqual({ phase:'news', home:'aachen', age:family === 'elder' ? 48 : 16, personal:true, jobs:0 });
  });
}

for (const ending of ['take_settlement','seek_hearing','abandon_balance']) {
  test('completed palace work resolves ' + ending + ' from the one reserved fee', async function ({ page }, info) {
    await offer(page, info);
    expect(await choose(page, 'accept_delivery')).toBe(true);
    expect(await choose(page, 'work_shift')).toBe(true);
    expect(await choose(page, 'work_shift')).toBe(true);
    const before = await page.evaluate(function () { return { turn:FB.state.turn, phase:FB.state.stories.aachen_household_track_800.phase }; });
    expect(before.phase).toBe('account');
    expect(await choose(page, ending)).toBe(true);
    const expectedPaid = ending === 'take_settlement' ? 3 : ending === 'seek_hearing' ? 4 : 2;
    expect(await page.evaluate(function () {
      const s = FB.state, id = 'aachen_household_track_800', t = s.stories[id], r = t.jobs.palace_delivery;
      const saved = JSON.parse(FB.save.serialize()), snapshot = JSON.stringify(t); FB.save.restore(saved);
      return { phase:FB.state.stories[id].phase, turn:s.turn, paid:r.paid, refunded:r.refunded, escrow:r.escrow,
        repeated:FB.stories.apply(FB.state, id, 'seek_hearing', FB.stories.quote(FB.state, id, 'seek_hearing')),
        restored:snapshot === JSON.stringify(FB.state.stories[id]) };
    })).toEqual({ phase:'await_instructions', turn:before.turn + (ending === 'seek_hearing' ? 1 : 0),
      paid:expectedPaid, refunded:4 - expectedPaid, escrow:0, repeated:false, restored:true });
  });
}

test('declining work reaches the 802 explanation without an invented summons or charge', async function ({ page }, info) {
  await offer(page, info);
  const before = await page.evaluate(function () { return JSON.stringify([FB.state.player.gold,FB.state.player.flags,FB.state.player.war]); });
  expect(await choose(page, 'decline_delivery')).toBe(true);
  expect(await page.evaluate(function () { return JSON.stringify([FB.state.player.gold,FB.state.player.flags,FB.state.player.war]); })).toBe(before);
  await year(page, 802);
  expect(await page.evaluate(function () { return FB.state.stories.aachen_household_track_800.phase; })).toBe('instructions');
  const turn = await page.evaluate(function () { return FB.state.turn; });
  expect(await choose(page, 'hear_instructions')).toBe(true);
  expect(await page.evaluate(function () { return FB.state.turn; })).toBe(turn + 1);
  expect(await choose(page, 'keep_farming')).toBe(true);
  expect(await choose(page, 'return_to_farm')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { phase:s.stories.aachen_household_track_800.phase, war:!!s.player.war,
      contracts:Object.keys(s.stories.aachen_household_track_800.jobs).length, profession:s.player.profession };
  })).toEqual({ phase:'farm_intention', war:false, contracts:0, profession:'farmer' });
});

test('a real funded 802 offer pays once and an unfunded buyer closes quietly', async function ({ page }, info) {
  await offer(page, info);
  await choose(page, 'decline_delivery'); await year(page, 802);
  await choose(page, 'keep_working');
  expect(await choose(page, 'supply_work')).toBe(true);
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.aachen_household_track_800;
    const checkpoint = JSON.parse(FB.save.serialize()), row = t.jobs.supply_delivery;
    FB.save.restore(checkpoint);
    return { paid:row.paid, escrow:row.escrow, days:row.daysWorked, phase:FB.state.stories.aachen_household_track_800.phase };
  })).toEqual({ paid:2, escrow:0, days:1, phase:'conclusion' });
  expect(await choose(page, 'seek_work_again')).toBe(true);
  expect(await choose(page, 'supply_work')).toBe(false);
  await offer(page, info);
  await choose(page, 'decline_delivery'); await year(page, 802);
  await page.evaluate(function () { FB.state.realms.carolingian_800.treasury.gold = 0; });
  await choose(page, 'keep_working');
  expect(await page.evaluate(function () {
    const s = FB.state, t = s.stories.aachen_household_track_800, gold = s.player.gold;
    const unavailable = FB.stories.quote(s, 'aachen_household_track_800', 'supply_work').allowed;
    FB.stories.get('aachen_household_track_800').day(s, t);
    return { unavailable, phase:t.phase, unchanged:gold === s.player.gold, jobs:Object.keys(t.jobs).length };
  })).toEqual({ unavailable:false, phase:'conclusion', unchanged:true, jobs:0 });
});

for (const cause of ['departure','changed_control','payer_death']) {
  test('Aachen closes its local opportunity after ' + cause + ' and conserves an accepted fee', async function ({ page }, info) {
    await offer(page, info);
    await choose(page, 'accept_delivery');
    expect(await page.evaluate(function (cause) {
      const s = FB.state, id = 'aachen_household_track_800', t = s.stories[id];
      if (cause === 'departure') s.player.provinceId = 'paris';
      if (cause === 'changed_control') FB.transferProvince(s, 'aachen', 'byzantium');
      if (cause === 'payer_death') s.chars[t.jobPatrons.palace_delivery].dead = true;
      FB.stories.get(id).day(s, t);
      const r = t.jobs.palace_delivery;
      return { terminal:FBDATA.storyInstances[id].stages[t.phase].terminal,
        paid:r.paid, refunded:r.refunded, escrow:r.escrow,
        work:FB.stories.quote(s, id, 'work_shift').allowed };
    }, cause)).toEqual({ terminal:true, paid:0, refunded:4, escrow:0, work:false });
  });
}

test('calendar boundaries skip missed windows and close by 803 without a retrospective payout', async function ({ page }, info) {
  await beginBookmark(page, info, '800', 'aachen_household_800');
  await year(page, 802);
  expect(await page.evaluate(function () { return FB.state.stories.aachen_household_track_800.phase; })).toBe('instructions');
  await year(page, 803);
  expect(await page.evaluate(function () {
    const t = FB.state.stories.aachen_household_track_800;
    return { phase:t.phase, jobs:Object.keys(t.jobs).length };
  })).toEqual({ phase:'window_closed', jobs:0 });
});

test('pending and disputed checkpoints restore their exact work balance and missing tracks stay missing', async function ({ page }, info) {
  await offer(page, info);
  expect(await page.evaluate(function () {
    const id = 'aachen_household_track_800', offer = JSON.parse(FB.save.serialize());
    FB.save.restore(offer);
    function choose(c) { return FB.stories.apply(FB.state, id, c, FB.stories.quote(FB.state, id, c)); }
    choose('accept_delivery'); const pending = JSON.parse(FB.save.serialize());
    choose('work_shift'); choose('work_shift'); const disputed = JSON.parse(FB.save.serialize());
    const row = JSON.stringify(FB.state.stories[id]);
    FB.save.restore(disputed); const exact = row === JSON.stringify(FB.state.stories[id]);
    FB.save.restore(pending); const days = FB.state.stories[id].jobs.palace_delivery.daysWorked;
    FB.save.restore(offer); const empty = Object.keys(FB.state.stories[id].jobs).length;
    delete offer.state.stories[id]; FB.save.restore(offer);
    return { exact, days, empty, missing:!FB.state.stories[id] };
  })).toEqual({ exact:true, days:1, empty:0, missing:true });
});

test('the shared job review discloses costs, cancels freely and confirms one real working day', async function ({ page }, info) {
  await offer(page, info);
  await page.locator('[data-tab="actions"]').click();
  await page.evaluate(function () { FB.ui.refresh(); });
  const card = page.locator('[data-story-card="' + ID + '"]');
  const before = await page.evaluate(function () {
    return [FB.state.turn,FB.state.player.gold,FB.state.realms.carolingian_800.treasury.gold];
  });
  await card.click();
  await page.locator('[data-story-choice="accept_delivery"]').click();
  await expect(page.getByText(/Total reserved fee: 4 gold for 3 action days\./)).toBeVisible();
  await expect(page.getByText('Paid on completion: 2 gold. Disputed balance: 2 gold.', { exact:true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-story-choice="decline_delivery"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await page.evaluate(function () {
    return [FB.state.turn,FB.state.player.gold,FB.state.realms.carolingian_800.treasury.gold];
  })).toEqual(before);
  await card.click();
  await page.locator('[data-story-choice="accept_delivery"]').click();
  await page.locator('#gm-story-confirm').click();
  await expect(page.locator('#gm-story-continue')).toBeVisible();
  expect(await page.evaluate(function () {
    const s = FB.state, r = s.stories.aachen_household_track_800.jobs.palace_delivery;
    return { turn:s.turn, days:r.daysWorked, paid:r.paid, held:r.escrow };
  })).toEqual({ turn:before[0] + 1, days:1, paid:0, held:4 });
  await page.locator('#gm-story-continue').click();
  await expect(card).toBeFocused();
});
