'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'js/main.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/ui_topbar.js', 'js/ui_modals.js', 'js/actions.js',
  'js/save.js', 'js/util.js', 'js/world.js', 'js/crazygames.js', 'data/starts.js',
  'data/actions.js', 'data/bookmarks.js', 'data/events_tutorial.js', 'js/title_ids.js',
  'js/music.js', 'data/music_catalog.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

for (const portal of [false]) {
  for (const preference of ['fresh', 'missing', true, false]) {
    test((portal ? 'CrazyGames' : 'standard') + ' event resume preference: ' + preference,
      async function ({ page }, testInfo) {
        await page.addInitScript(function (args) {
          if (args.preference !== 'fresh') {
            const prefs = { speedIdx:2 };
            if (typeof args.preference === 'boolean') prefs.autoResumeAfterEvents = args.preference;
            localStorage.setItem('fb_ui', JSON.stringify(prefs));
          }
        }, { portal:portal, preference:preference });
        await openGame(page, testInfo);
        const expected = typeof preference === 'boolean' ? preference : portal;
        expect(await page.evaluate(function () {
          return FB.game.uiPrefs.autoResumeAfterEvents;
        })).toBe(expected);
        await page.evaluate(function () { FB.ui.showSettings(); });
        await expect(page.locator('#set-auto-resume-events')).toBeChecked({ checked:expected });
      });
  }
}

test('standard title retains the existing new-game route', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await expect(page.locator('#btn-newgame')).toContainText('New Game');
  await expect(page.locator('#btn-choose-beginning')).toBeHidden();
  await page.locator('#btn-newgame').click();
  await expect(page.getByRole('heading', { name:'Choose a Starting Date' }))
    .toBeVisible();
});

test('standard title does not build a world before a start is chosen',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        requestAnimationFrame(function () {
          setTimeout(function () {
            setTimeout(function () { resolve(FB.world === null); }, 50);
          }, 0);
        });
      });
    })).toBe(true);
  });

test('a second activation joins the running build and a different bookmark waits',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const result = await page.evaluate(function () {
      return new Promise(function (resolve) {
        const order = [], joinedProgress = [], canonicalTitles = [];
        // Legacy aliases must normalize for both the active build and queued builds.
        ['867', '1066'].forEach(function (id) {
          const book = FBDATA.bookmarks[id];
          book.duchies.d_essex = book.duchies.essex;
          delete book.duchies.essex;
          book.provinces.forEach(function (province) {
            if (province.duchy === 'essex') province.duchy = 'd_essex';
          });
        });
        function recordTitles(definition) {
          canonicalTitles.push(!!definition && !!definition.duchies.essex &&
            !definition.duchies.d_essex && !!FBDATA.duchies.essex &&
            !FBDATA.duchies.d_essex && definition.provinces.some(function (province) {
              return province.duchy === 'essex';
            }) && !definition.provinces.some(function (province) {
              return province.duchy === 'd_essex';
            }));
        }
        let firstWorld = null;
        FB.activateBookmark('867', null, function (error, definition) {
          recordTitles(definition);
          order.push('first:' + (error ? error.message : FB.activeBookmarkId));
          firstWorld = FB.world;
        });
        FB.activateBookmark('867', function (frac) { joinedProgress.push(frac); },
          function (error, definition) {
            recordTitles(definition);
            order.push('joined:' + (error ? error.message : FB.activeBookmarkId));
            window.__joinedSameWorld = FB.world === firstWorld;
          });
        FB.activateBookmark('1066', null, function (error, definition) {
          recordTitles(definition);
          order.push('other:' + (error ? error.message : FB.activeBookmarkId));
          resolve({
            order:order, canonicalTitles:canonicalTitles,
            joinedSameWorld:window.__joinedSameWorld,
            joinedFollowed:joinedProgress.some(function (f) { return f < 1; }),
            joinedFinished:joinedProgress[joinedProgress.length - 1] === 1,
            otherIsDifferent:FB.world !== firstWorld && FB.activeBookmarkId === '1066'
          });
        });
      });
    });
    expect(result.order).toEqual(['first:867', 'joined:867', 'other:1066']);
    expect(result.canonicalTitles).toEqual([true, true, true]);
    expect(result.joinedSameWorld).toBe(true);
    expect(result.joinedFollowed).toBe(true);
    expect(result.joinedFinished).toBe(true);
    expect(result.otherIsDifferent).toBe(true);
  });
