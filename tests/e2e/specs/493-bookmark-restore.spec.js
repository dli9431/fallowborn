'use strict';

const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame } = require('../support/game/navigation');
const { startPreparedParityGame } = require('../support/game/parity');

dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_manifest.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/bookmark_476_outer.js',
  'data/bookmark_476_wider_identities.js', 'data/bookmark_493.js', 'data/bookmark_493_world.js',
  'data/bookmark_493_history.js', 'data/african_religious_rollout.js', 'data/geographies.js',
  'data/geography_expansion.js', 'data/starts.js', 'data/cultures.js', 'data/story_instances.js',
  'data/story_courts_476.js', 'data/story_household_effects_476_493.js',
  'js/main.js', 'js/starts.js', 'js/world.js', 'js/model.js', 'js/bookmark_setup.js',
  'js/religion.js', 'js/institutions.js', 'js/stories.js', 'js/story_campaign.js',
  'js/save.js', 'js/save_v4.js'
]);

test.describe.configure({ mode:'parallel' });

const DATES = [
  { bookmark:'476', code:'DATES-476-curialis_476-ravenna-m-Marcus', rome:'Simplicius', east:'Acacius' },
  { bookmark:'493', code:'RAVENNA493-493-curialis_493-ravenna-m-Marcus', rome:'Gelasius I', east:'Euphemius' }
];

async function startCurialis(page, entry) {
  if (entry.bookmark === '493') {
    expect(await page.evaluate(function () {
      FBDATA.bookmarks['493'].hidden = false;
      return FB.validateBookmark(FB.bookmark('493'));
    })).toEqual([]);
  }
  await startPreparedParityGame(page, entry);
  expect(await page.evaluate(function () {
    return { date:FB.state.start.id, rome:FB.religiousOfficeSnapshot(FB.state, 'rome_bishop').name,
      east:FB.religiousOfficeSnapshot(FB.state, 'constantinople_patriarch').name };
  })).toEqual({ date:entry.bookmark, rome:entry.rome, east:entry.east });
  return page.evaluate(function () { return FB.save.serialize(); });
}

async function expectMatchingLoad(page, entry, json) {
  const accepted = await page.evaluate(function (json) {
    return new Promise(function (resolve) {
      if (!FB.game.loadData(JSON.parse(json), function () { resolve(true); })) resolve(false);
    });
  }, json);
  expect(accepted).toBe(true);
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function (json) {
    const s = FB.state, saved = JSON.parse(json).state;
    return { date:s.start.id, active:FB.activeBookmarkId, hidden:FBDATA.bookmarks['493'].hidden,
      rome:FB.religiousOfficeSnapshot(s, 'rome_bishop').name,
      east:FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name,
      actors:JSON.stringify(s.bookmarkSetup) === JSON.stringify(saved.bookmarkSetup),
      ledger:JSON.stringify(s.localInstitutions) === JSON.stringify(saved.localInstitutions),
      stories:JSON.stringify(s.stories) === JSON.stringify(saved.stories),
      count:Object.keys(s.chars).length === Object.keys(saved.chars).length };
  }, json)).toEqual({ date:entry.bookmark, active:entry.bookmark, hidden:true,
    rome:entry.rome, east:entry.east, actors:true, ledger:true, stories:true, count:true });
}

for (const [first, second] of [DATES, DATES.slice().reverse()]) {
  test.describe(first.bookmark + ' then ' + second.bookmark, function () {
    let firstSave;
    test.beforeEach(async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      firstSave = await startCurialis(page, first);
      // Keep the prepared catalogue while returning through the normal title flow.
      await page.evaluate(function () { FB.game.toTitle(); });
    });

    test('keeps date-specific incumbents and ledgers when switching saves in both directions',
      async function ({ page }) {
        const secondSave = await startCurialis(page, second);
        await page.evaluate(function () { FBDATA.bookmarks['493'].hidden = true; });
        await expectMatchingLoad(page, first, firstSave);
        await expectMatchingLoad(page, second, secondSave);
      });
  });
}
