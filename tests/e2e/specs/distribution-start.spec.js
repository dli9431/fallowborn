'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'css/style.css', 'js/main.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/ui_topbar.js', 'js/ui_modals.js', 'js/actions.js',
  'js/save.js', 'js/util.js', 'js/crazygames.js', 'data/starts.js',
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
