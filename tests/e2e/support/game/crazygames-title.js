'use strict';

const { expect } = require('../fixture');
const { targetUrl } = require('./navigation');

// The caller supplies the distribution flag and SDK double before navigation.
async function openCrazyGame(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FB && FB.platform.isCrazyGames && FB.game &&
        FB.game.bootReady && FB.ui && FB.save);
    });
  }, { timeout:30 * 1000 }).toBe(true);
  await expect(page.locator('#title:not(.hidden)')).toBeVisible();
  const silent = page.locator('#music-choice-silent');
  if (await silent.isVisible()) await silent.click();
  await expect(page.locator('#music-choice')).toBeHidden();
  const play = page.getByRole('button', { name:'Play as Osric', exact:true });
  await expect(play).toBeVisible();
  await expect(play).toBeEnabled();
  await expect(page.locator('#btn-choose-beginning')).toBeVisible();
  await expect(page.locator('#btn-choose-beginning')).toBeEnabled();
}

module.exports = { openCrazyGame };
