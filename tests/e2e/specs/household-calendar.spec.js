'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const examples = require('../fixtures/authoring/calendar-households.json');
dependsOnRuntime(__filename, ['index.html', 'data/bookmarks.js', 'data/technology.js',
  'js/story_household.js', 'js/stories.js', 'js/mods.js', 'js/world.js', 'js/starts.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js']);

async function imported(page, info, scenario) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/calendar-households.json'));
  await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }), page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmark(page, info, '867', scenario);
}

test('JSON calendar choices include both boundaries, expire after them and survive restore without replay', async function ({ page }, info) {
  await imported(page, info, 'calendar_choice_start');
  expect(await page.evaluate(function () {
    let s = FB.state;
    const id = 'calendar_choice_example';
    function allowed(season, day) { s.date.season = season; s.date.day = day; return FB.stories.quote(s, id, 'decide').allowed; }
    const bounds = [allowed(1,90), allowed(2,1), allowed(2,8), allowed(2,9)];
    s.date.day = 8;
    const q = FB.stories.quote(s, id, 'decide'), before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.quote(s, id, 'decide');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.date.day = 9;
    const stale = FB.stories.apply(s, id, 'decide', q);
    FB.stories.get(id).day(s, s.stories[id]);
    const closed = JSON.stringify(s.stories[id]), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved); s = FB.state;
    return { bounds, pure, stale, phase:s.stories[id].phase, retained:closed === JSON.stringify(s.stories[id]),
      replay:FB.stories.apply(s, id, 'decide', FB.stories.quote(s, id, 'decide')) };
  })).toEqual({ bounds:[false,true,true,false], pure:true, stale:false, phase:'expired', retained:true, replay:false });
});

test('an independently configured deadline uses the actual date rather than stage elapsed time', async function ({ page }, info) {
  await imported(page, info, 'calendar_expiry_start');
  expect(await page.evaluate(function () {
    const s = FB.state, id = 'calendar_expiry_example', t = s.stories[id];
    s.date.season = 2; s.date.day = 90;
    FB.stories.get(id).day(s,t); const before = t.phase;
    s.date.season = 3; s.date.day = 1;
    FB.stories.get(id).day(s,t);
    return [before,t.phase];
  })).toEqual(['waiting','done']);
});

test('malformed, reversed and unknown calendar terms reject without publishing or consuming identity', async function ({ page }, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (examples) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const failures = [[867,4,1],[867,2,0],[867,2,91],[867,2,1,0],['867',2,1],[10001,0,1]].map(function (first) {
      const mod = JSON.parse(JSON.stringify(examples));
      mod.storyInstances.calendar_choice_example.stages.waiting.choices[0].when.firstDay = first;
      return FB.mods.validate(mod).length > 0;
    });
    const reversed = JSON.parse(JSON.stringify(examples));
    reversed.storyInstances.calendar_choice_example.stages.waiting.choices[0].when.firstDay = [868,0,1];
    failures.push(FB.mods.validate(reversed).length > 0);
    const extra = JSON.parse(JSON.stringify(examples));
    extra.storyInstances.calendar_choice_example.stages.waiting.choices[0].when.result = 'battle_won';
    failures.push(FB.mods.validate(extra).length > 0);
    return { failures, pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples)).toEqual({ failures:Array(8).fill(true), pure:true });
});
