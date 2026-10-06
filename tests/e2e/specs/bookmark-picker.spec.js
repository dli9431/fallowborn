'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_711.js', 'data/story_campaigns_711.js',
  'data/bookmark_800.js', 'data/bookmark_800_history.js',
  'data/bookmark_1204.js', 'data/bookmark_1204_campaigns.js',
  'data/starts.js', 'data/cultures.js', 'data/geographies.js', 'data/settlements.js',
  'data/distribution_crazygames.js', 'js/crazygames.js', 'js/world.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/stories.js',
  'js/ui_misc.js', 'js/ui_modals.js'
]);

const STARTS = [
  { id:'711', name:'Across the Strait', county:'toledo', identity:'hispano_roman.catholic' },
  { id:'800', name:'The Imperial Coronation', county:'london', identity:'english.catholic' },
  { id:'1204', name:'The Fall of Constantinople', county:'constantinople', identity:'greek.orthodox' }
];

test.beforeEach(async function ({}, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-served' &&
    testInfo.project.name !== 'chromium-file',
    'Exercise ordinary bookmark registration on both Chromium origins.');
});

async function openTitle(page, testInfo, crazygames) {
  if (crazygames) await openCrazyGame(page, testInfo);
  else await openGame(page, testInfo);
}

async function chooseStartingDate(page) {
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
}

for (const crazygames of [false, true]) {
  test.describe('ordinary starting dates, CrazyGames flag ' + crazygames, function () {
    test.beforeEach(async function ({ page }) {
      if (crazygames) await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames';
        window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
    });

    for (const width of [1280, 390]) {
      test('the picker offers merged dates and activates their scenarios at width ' + width,
        async function ({ page }, testInfo) {
          test.setTimeout(120 * 1000);
          await page.setViewportSize({ width:width, height:800 });
          await openTitle(page, testInfo, crazygames);
          await chooseStartingDate(page);
          const cards = page.locator('#bookmarklist button');
          await expect(cards.locator('h3')).toHaveText([
            /Spring 476:/, /Spring 711:/, /Winter 800:/,
            /Spring 867:/, /Spring 1066:/, /Spring 1204:/
          ]);
          for (const start of STARTS) {
            const card = cards.filter({ hasText:start.name });
            await expect(card).toBeEnabled();
            await card.press('Enter');
            await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
            await expect(page.locator('#ng-heading'))
              .toHaveText('Choose Your Beginning in ' + start.id + ' AD');
            expect(await page.evaluate(function () { return FB.activeBookmarkId; }))
              .toBe(start.id);
            await expect(page.locator('#scenariolist button').filter({
              has:page.getByRole('heading', { name:'Serf', exact:true })
            })).toBeEnabled();
            await page.locator('#btn-ng-back').click();
            await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
          }
        });
    }

    for (const start of STARTS) {
      test(start.id + ' ordinary start code and save remain usable after a fresh boot',
        async function ({ page }, testInfo) {
          test.setTimeout(120 * 1000);
          await openTitle(page, testInfo, crazygames);
          await chooseStartingDate(page);
          const canonicalCode = 'BOOKMARKLOAD-' + start.id + '-serf-' + start.county + '-m-Leo';
          const code = canonicalCode + '-standard-0-' + start.identity;
          await page.locator('#btn-bm-seed').click();
          await page.locator('#ng-seed').fill(code);
          await page.locator('#ng-seed').press('Enter');
          await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
          await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
          await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true }))
            .toBeVisible();
          await page.getByRole('button', { name:'Begin', exact:true }).press('Enter');
          await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
          const saved = await page.evaluate(function () {
            FB.game.setPaused(true);
            FB.game.uiPrefs.hideTips = true;
            FB.game.uiPrefs.hideBeginnerHints = true;
            delete FB.state.player.flags.tutorial;
            return FB.save.serialize();
          });
          await openTitle(page, testInfo, crazygames);
          expect(await page.evaluate(function (json) {
            return FB.game.loadData(JSON.parse(json));
          }, saved)).toBe(true);
          await expect(page.locator('#game:not(.hidden)')).toBeVisible();
          const restored = await page.evaluate(function () {
            const s = FB.state, me = s.chars[s.player.charId];
            return { bookmark:s.start.id, seed:s.seed, county:s.player.provinceId,
              culture:me.culture, religion:me.religion,
              stories:Object.keys(s.stories).sort(), error:FB.game.lastLoadError,
              faults:FB.validateBookmark(FB.bookmark(s.start.id)) };
          });
          expect(restored).toEqual({ bookmark:start.id, seed:canonicalCode, county:start.county,
            culture:start.identity.split('.')[0], religion:start.identity.split('.')[1],
            stories:Object.keys(JSON.parse(saved).state.stories).sort(), error:null, faults:[] });
        });
    }
  });
}
