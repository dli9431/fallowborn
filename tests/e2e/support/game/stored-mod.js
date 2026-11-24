'use strict';

const { expect } = require('../fixture');
const { prepareGameContent } = require('./navigation');

// Install an ordinary JSON mod the way the Mods screen persists it and reload
// into the modded catalogue. The screen itself waits for the complete catalogue
// to prepare before it opens, so a journey that asserts nothing about that
// screen can avoid preparing the unmodded catalogue that the reload discards.
// The stored text is exactly what the screen would store, and the reload applies
// it through the same stored-mod boot path. A rejected configuration fails here.
async function installStoredMod(page, text) {
  await page.evaluate(function (source) {
    localStorage.setItem(FB.storageKey('fb_mods'), JSON.stringify([source]));
  }, text);
  await page.reload({ waitUntil:'domcontentloaded' });
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    FB.mods.assertReady();
    return FB.mods.count();
  }), 'stored mod applied at boot').toBe(1);
}

module.exports = { installStoredMod };
