'use strict';
const path = require('path');
const examples = require('../fixtures/authoring/camp-work-example.json');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/mobile_confederations.js','data/technology.js',
  'data/bookmark_476_wider.js','data/travel.js','data/starts.js','js/story_household.js','js/stories.js',
  'js/mobile_confederations.js','js/government_selection.js','js/governments.js','js/federates.js',
  'js/travel.js','js/market.js','js/treasury.js','js/population.js','js/model.js','js/world.js',
  'js/mods.js','js/starts.js','js/main.js','js/save.js','js/save_v4.js','js/ui_misc.js']);

async function importedStart(page, info) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/camp-work-example.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && !!FB.stories.get('short_camp_service_example'); });
  await beginBookmark(page, info, '476', 'short_camp_service_start');
}

test('an ordinary JSON import pays canonical camp work once and restores without replay', async function ({ page }, info) {
  await importedStart(page, info);
  const result = await page.evaluate(function () {
    let s = FB.state; const id = 'short_camp_service_example', rid = 'pontic_following_476';
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const gold = s.player.gold, funds = FB.treasuryAvailable(s, rid), food = FB.mobile.row(s, rid).food;
    const q = FB.stories.quote(s, id, 'work');
    FB.stories.cards(s); FB.stories.choices(s, id);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const paid = FB.stories.apply(s, id, 'work', q), repeated = FB.stories.apply(s, id, 'work', q);
    const deltas = [s.player.gold - gold,funds - FB.treasuryAvailable(s, rid),food - FB.mobile.row(s, rid).food];
    const sameDay = FB.mobile.review(s, { realmId:rid, action:'work', actor:{ kind:'character', id:s.player.charId }, terms:{} }).review.allowed;
    const record = JSON.stringify(s.stories[id]), money = s.player.gold;
    const saved = JSON.parse(FB.save.serialize()); FB.save.restore(saved); s = FB.state;
    return { pure:pure, paid:paid, repeated:repeated, sameDay:sameDay, deltas:deltas,
      phase:s.stories[id].phase, retained:record === JSON.stringify(s.stories[id]), noReplay:money === s.player.gold };
  });
  expect(result).toMatchObject({ pure:true, paid:true, repeated:false, sameDay:false, phase:'paid', retained:true, noReplay:true });
  expect(result.deltas[0]).toBeCloseTo(0.2); expect(result.deltas[1]).toBeCloseTo(0.2); expect(result.deltas[2]).toBe(1);
});

test('a changed stock or actual location invalidates work without charging', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'short_camp_service_example', rid = 'pontic_following_476', row = FB.mobile.row(s, rid);
    const q = FB.stories.quote(s, id, 'work'), gold = s.player.gold;
    row.food--;
    const stale = FB.stories.apply(s, id, 'work', q), unchanged = s.player.gold === gold;
    const current = FB.stories.quote(s, id, 'work');
    // Only the location owner is needed to test canonical presence, without ticking a journey.
    s.player.travel = { currentId:'tomis' };
    const away = FB.stories.quote(s, id, 'work').allowed;
    const staleLocation = FB.stories.apply(s, id, 'work', current);
    FB.mobile.migration(s, rid).at = 'tomis';
    const there = FB.stories.quote(s, id, 'work').allowed;
    s.player.travel = null;
    return { stale:stale, unchanged:unchanged, away:away, staleLocation:staleLocation, there:there,
      noRemote:!FB.stories.quote(s, id, 'work').allowed, phase:s.stories[id].phase };
  })).toEqual({ stale:false, unchanged:true, away:false, staleLocation:false, there:true, noRemote:true, phase:'offer' });
});

test('the independently configured twelve-day boundary closes without pay or RNG', async function ({ page }, info) {
  await importedStart(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'short_camp_service_example', t = s.stories[id], module = FB.stories.get(id);
    const money = s.player.gold, rng = FB.getRngState();
    s.turn = t.stageTurn + 12;
    const expiredQuote = FB.stories.quote(s, id, 'work').allowed;
    module.day(s, t); const record = JSON.stringify(t); module.season(s, t);
    return { expiredQuote:expiredQuote, phase:t.phase, money:money === s.player.gold,
      rng:rng === FB.getRngState(), once:record === JSON.stringify(t) };
  })).toEqual({ expiredQuote:false, phase:'closed', money:true, rng:true, once:true });
});

for (const fault of ['leader_operation','extra_work_terms','bad_purpose','unbounded_wait','unknown_mobile_condition','mixed_mobile_fields']) {
  test('malformed mobile graph ' + fault + ' rejects detached', async function ({ page }, info) {
    await openGame(page, info);
    const result = await page.evaluate(function (input) {
      const m = input.mod, d = m.storyInstances.short_camp_service_example, op = d.stages.offer.choices[0].operation;
      if (input.fault === 'leader_operation') op.kind = 'mobile_settle';
      if (input.fault === 'extra_work_terms') op.amount = 500;
      if (input.fault === 'bad_purpose') d.stages.offer.choices[0].operation = { kind:'travel_mobile', realmId:'pontic_following_476', purposeId:'pilgrimage' };
      if (input.fault === 'unbounded_wait') d.stages.offer.transitions[0].when.minDays = 1441;
      const p = d.stages.offer.transitions[1].when.not;
      if (input.fault === 'unknown_mobile_condition') p.condition = 'field_host_conquest';
      if (input.fault === 'mixed_mobile_fields') p.provinceId = 'cherson';
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), saved = localStorage.getItem('fb_mods');
      const errors = FB.mods.validate(m);
      return { errors:errors.length, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() &&
        uid === FB.getUidCounter() && saved === localStorage.getItem('fb_mods') };
    }, { mod:examples, fault:fault });
    expect(result.errors).toBeGreaterThan(0); expect(result.pure).toBe(true);
  });
}
