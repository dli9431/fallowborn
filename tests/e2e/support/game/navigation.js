'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { expect } = require('../fixture');

const gameRoot = path.resolve(__dirname, '..', '..', '..', '..');
const indexPath = path.join(gameRoot, 'index.html');
const servedOrigin = 'http://127.0.0.1:4173';

function targetUrl(testInfo) {
  return testInfo.project.name.endsWith('-served')
    ? servedOrigin + '/'
    : pathToFileURL(indexPath).href;
}

async function openTitle(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
  const title = page.locator('#title:not(.hidden)');
  const musicChoice = page.locator('#music-choice:not(.hidden)');
  await expect(title).toBeVisible({ timeout:30 * 1000 });
  if (await musicChoice.isVisible()) {
    await page.getByRole('button', { name:'Continue silently', exact:true }).click();
  }
  await expect(title).toBeVisible({ timeout:30 * 1000 });
  await expect(page.getByRole('button', { name:'New Game', exact:true })).toBeVisible();
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FB && FB.game && FB.game.bootReady && FB.ui && FB.save);
    });
  }).toBe(true);
}

async function prepareGameContent(page) {
  await page.waitForFunction(function () { return !!(window.FB && FB.game && FB.game.bootReady); });
  await page.evaluate(function () {
    return new Promise(function (resolve, reject) {
      // Historical source-oracle pages predate the deferred content boundary.
      if (!FB.game.prepareContent) { resolve(); return; }
      FB.game.prepareContent(function (error) { if (error) reject(error); else resolve(); });
    });
  });
}

async function openGame(page, testInfo) {
  await openTitle(page, testInfo);
  await prepareGameContent(page);
}

module.exports = {
  openTitle:openTitle,
  openGame:openGame,
  prepareGameContent:prepareGameContent,
  targetUrl:targetUrl
};
