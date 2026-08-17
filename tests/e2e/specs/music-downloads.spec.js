'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/music.js',
  'js/ui_modals.js',
  'data/music_catalog.js'
]);

/* Music offline downloads: progress shows inside the downloads dialog while
   it is open and on a floating chip when it is not; a finished download
   refreshes an open dialog in place but never pops the dialog over the game —
   the player gets a toast instead. Stubs FB.music's network-moving methods, so
   no bytes travel. NOT run by the authoring agent (owner runs the harness). */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

async function stubDownloads(page) {
  await page.evaluate(function () {
    FB.platform.isPlay = true; // offline downloads are a play-site feature
    FB.music.requestPersistentStorage = function () {};
    FB.music.downloadAll = function (progress, done) {
      window.__dlProgress = progress;
      window.__dlDone = done;
    };
    window.__dlProgress = null;
    window.__dlDone = null;
    window.confirm = function () { return true; };
  });
}

test('download progress follows visibility and finishing never pops the dialog',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });
    await stubDownloads(page);

    await page.evaluate(function () { FB.ui.showMusicDownloads(); });
    await expect(page.locator('#music-download-all')).toBeVisible();
    await page.locator('#music-download-all').click();

    /* in-dialog progress while the dialog is open; the chip stays hidden */
    await page.evaluate(function () { window.__dlProgress(1, 3, 1000, 3000); });
    await expect(page.locator('#music-download-progress')).toContainText('1/3');
    await expect(page.locator('#music-cancel-download')).toBeVisible();
    await expect(page.locator('#music-dl-chip')).toHaveClass(/hidden/);

    /* with the dialog closed the floating chip carries the same progress */
    await page.evaluate(function () { FB.ui.closeModal(); });
    await waitForUiRefresh(page);
    await page.evaluate(function () { window.__dlProgress(2, 3, 2000, 3000); });
    const chip = page.locator('#music-dl-chip');
    await expect(chip).not.toHaveClass(/hidden/);
    await expect(chip).toContainText('2/3');

    /* finishing toasts and leaves the game untouched — no dialog pops up */
    await page.evaluate(function () { window.__dlDone(null); });
    await expect(page.locator('#toasts')).toContainText('Music is ready for offline play.');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(chip).toHaveClass(/hidden/);
  });

test('finishing with the dialog open refreshes it in place',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    await page.evaluate(function () { FB.game.setPaused(true); });
    await stubDownloads(page);

    await page.evaluate(function () { FB.ui.showMusicDownloads(); });
    await page.locator('#music-download-all').click();
    await page.evaluate(function () { window.__dlProgress(2, 2, 3000, 3000); });
    await page.evaluate(function () { window.__dlDone(null); });

    await expect(page.locator('#toasts')).toContainText('Music is ready for offline play.');
    await expect(page.locator('#genmodal')).not.toHaveClass(/hidden/);
    await expect(page.locator('#music-download-progress')).toHaveCount(1);
    await expect(page.locator('#music-dl-chip')).toHaveClass(/hidden/);
    await expect(page.locator('#gm-title')).toContainText('Music for offline play');
  });
