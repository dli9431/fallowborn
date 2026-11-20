'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openTitle } = require('../support/game/navigation');
const { startPreparedParityGame } = require('../support/game/parity');
const { useReleasedStartRules } = require('../support/game/released-starts');

dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_manifest.js', 'data/bookmark_sources.js', 'data/bookmarks.js',
  'data/bookmark_476.js', 'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js', 'data/bookmark_476_outer.js',
  'data/bookmark_476_wider_identities.js', 'data/bookmark_493.js', 'data/bookmark_493_world.js',
  'data/bookmark_493_history.js', 'data/african_religious_rollout.js', 'data/geographies.js',
  'data/geography_expansion.js', 'data/starts.js', 'data/cultures.js', 'data/story_instances.js',
  'data/story_courts_476.js', 'data/story_household_effects_476_493.js',
  'js/main.js', 'js/starts.js', 'js/world.js', 'js/model.js', 'js/bookmark_setup.js',
  'js/bookmark_sources.js', 'js/bookmark_composition.js',
  'js/religion.js', 'js/institutions.js', 'js/stories.js', 'js/story_campaign.js',
  'js/save.js', 'js/save_v4.js'
]);

test.describe.configure({ mode:'parallel' });

const DATES = [
  { bookmark:'476', code:'DATES-476-curialis_476-ravenna-m-Marcus', rome:'Simplicius', east:'Acacius' },
  { bookmark:'493', code:'RAVENNA493-493-curialis_493-ravenna-m-Marcus', rome:'Gelasius I', east:'Euphemius' }
];

async function serveVisible493(page) {
  const declarations = [
    ['data/bookmark_manifest.js', /('493':\{[^}]+\},era:'late_antique',hidden:)true/],
    ['data/bookmark_493.js', /(FBDATA\.bookmarkCandidates\['493'\] = \{[\s\S]*?\bhidden:)true/]
  ];
  for (const [file, hidden] of declarations) {
    const source = fs.readFileSync(path.resolve(__dirname, '../../..', file), 'utf8');
    expect(source, file).toMatch(hidden);
    await page.route('**/' + file, function (route) {
      return route.fulfill({ contentType:'application/javascript', body:source.replace(hidden, '$1false') });
    });
  }
  return async function () {
    for (const [file] of declarations) await page.unroute('**/' + file);
  };
}

async function startCurialis(page, entry) {
  if (entry.bookmark === '493') {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await expect(page.locator('#bookmarklist [data-bookmark="493"]')).toBeVisible();
    await page.locator('#btn-bm-back').click();
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
    const manifest493 = FB.bookmarkSources.manifestReport().dates.find(function (date) { return date.id === '493'; });
    return { date:s.start.id, active:FB.activeBookmarkId, hidden:manifest493.summary.hidden,
      rome:FB.religiousOfficeSnapshot(s, 'rome_bishop').name,
      east:FB.religiousOfficeSnapshot(s, 'constantinople_patriarch').name,
      actors:JSON.stringify(s.bookmarkSetup) === JSON.stringify(saved.bookmarkSetup),
      ledger:JSON.stringify(s.localInstitutions) === JSON.stringify(saved.localInstitutions),
      stories:JSON.stringify(s.stories) === JSON.stringify(saved.stories),
      count:Object.keys(s.chars).length === Object.keys(saved.chars).length };
  }, json)).toEqual({ date:entry.bookmark, active:entry.bookmark, hidden:true,
    rome:entry.rome, east:entry.east, actors:true, ledger:true, stories:true, count:true });
  if (entry.bookmark === '493') {
    expect(await page.evaluate(function () {
      const bookmark = FB.bookmark('493');
      return { hidden:bookmark.hidden, available:FB.bookmarkAvailable('493'), faults:FB.validateBookmark(bookmark) };
    })).toEqual({ hidden:true, available:false, faults:[] });
  }
}

for (const [first, second] of [DATES, DATES.slice().reverse()]) {
  test.describe(first.bookmark + ' then ' + second.bookmark, function () {
    test('keeps date-specific incumbents and ledgers when switching saves in both directions',
      async function ({ page }, testInfo) {
        await useReleasedStartRules(page);
        const stopServingVisible493 = await serveVisible493(page);
        await openTitle(page, testInfo);
        const firstSave = await startCurialis(page, first);
        await page.evaluate(function () { FB.game.toTitle(); });
        const secondSave = await startCurialis(page, second);

        // Reboot with the shipped catalogue before loading either save.
        await stopServingVisible493();
        await openTitle(page, testInfo);
        await page.getByRole('button', { name:'New Game', exact:true }).click();
        await expect(page.locator('#bookmarklist [data-bookmark="476"]')).toBeVisible();
        await expect(page.locator('#bookmarklist [data-bookmark="493"]')).toHaveCount(0);
        await page.locator('#btn-bm-back').click();
        await expectMatchingLoad(page, first, firstSave);
        await expectMatchingLoad(page, second, secondSave);
      });
  });
}
