'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'js/main.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/ui_topbar.js', 'js/ui_modals.js', 'js/actions.js',
  'js/save.js', 'js/util.js', 'js/world.js', 'js/crazygames.js', 'data/starts.js',
  'data/actions.js', 'data/bookmarks.js', 'data/events_tutorial.js'
]);
const { test, expect } = require('../support/fixture');
const { mockCrazyGames } = require('../support/crazygames');
const { openGame, targetUrl } = require('../support/game/navigation');

async function openCrazyGame(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady;
  });
  await expect(page.locator('#btn-newgame')).toContainText('Play as Osric');
}

test.beforeEach(async function ({ page }) { await mockCrazyGames(page); });

for (const portal of [true, false]) {
  for (const preference of ['fresh', 'missing', true, false]) {
    test((portal ? 'CrazyGames' : 'standard') + ' event resume preference: ' + preference,
      async function ({ page }, testInfo) {
        await page.addInitScript(function (args) {
          if (args.portal) window.FB_DISTRIBUTION = 'crazygames';
          if (args.preference !== 'fresh') {
            const prefs = { speedIdx:2 };
            if (typeof args.preference === 'boolean') prefs.autoResumeAfterEvents = args.preference;
            localStorage.setItem('fb_ui', JSON.stringify(prefs));
          }
        }, { portal:portal, preference:preference });
        if (portal) await openCrazyGame(page, testInfo);
        else await openGame(page, testInfo);
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

test('CrazyGames starts Osric in one click and points to a first marriage prospect',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
    await expect(page.locator('#btn-newgame')).toContainText('Play as Osric');
    await expect(page.locator('#btn-choose-beginning')).toBeVisible();
    await page.locator('#btn-newgame').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.state && FB.state.telemetry && FB.state.telemetry.quickStart;
      });
    }).toBe('osric_867');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('.coachmark')).toContainText('Low health greatly increases');
    await page.locator('.coachmark').getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toContainText('use Seek a match');
    await expect(page.locator('#tab-actions [data-action-id="seek_match"]'))
      .toHaveClass(/coachmark-lit/);
    expect(await page.evaluate(function () {
      return FB.state.date.year === 867 &&
        FB.state.player.provinceId === 'barcelona' && FB.game.paused;
    })).toBe(true);
  });

test('CrazyGames still offers the full start selector', async function ({ page }, testInfo) {
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await openCrazyGame(page, testInfo);
  await page.locator('#btn-choose-beginning').click();
  await expect(page.getByRole('heading', { name:'Choose a Starting Date' }))
    .toBeVisible();
});

test('CrazyGames builds the Osric world behind the title and reuses it on Play',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page, testInfo);
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!FB.world && FB.activeBookmarkId === '867' && !FB.state;
      });
    }).toBe(true);
    await expect(page.locator('#title')).toBeVisible();
    await page.evaluate(function () { window.__prebuiltWorld = FB.world; });
    await page.locator('#btn-newgame').click();
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.state && FB.state.telemetry && FB.state.telemetry.quickStart;
      });
    }).toBe('osric_867');
    expect(await page.evaluate(function () {
      return FB.world === window.__prebuiltWorld;
    })).toBe(true);
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
        const order = [], joinedProgress = [];
        let firstWorld = null;
        FB.activateBookmark('867', null, function (error) {
          order.push('first:' + (error ? error.message : FB.activeBookmarkId));
          firstWorld = FB.world;
        });
        FB.activateBookmark('867', function (frac) { joinedProgress.push(frac); },
          function (error) {
            order.push('joined:' + (error ? error.message : FB.activeBookmarkId));
            window.__joinedSameWorld = FB.world === firstWorld;
          });
        FB.activateBookmark('1066', null, function (error) {
          order.push('other:' + (error ? error.message : FB.activeBookmarkId));
          resolve({
            order:order,
            joinedSameWorld:window.__joinedSameWorld,
            joinedFollowed:joinedProgress.some(function (f) { return f < 1; }),
            joinedFinished:joinedProgress[joinedProgress.length - 1] === 1,
            otherIsDifferent:FB.world !== firstWorld && FB.activeBookmarkId === '1066'
          });
        });
      });
    });
    expect(result.order).toEqual(['first:867', 'joined:867', 'other:1066']);
    expect(result.joinedSameWorld).toBe(true);
    expect(result.joinedFollowed).toBe(true);
    expect(result.joinedFinished).toBe(true);
    expect(result.otherIsDifferent).toBe(true);
  });
