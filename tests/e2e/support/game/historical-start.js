'use strict';

const { expect } = require('../fixture');
const { startParityGame } = require('./parity');
const { openCrazyGame } = require('./crazygames-title');

// Historical review journeys choose their title contract explicitly. Keep the
// standard parity helper and the universal navigation fixture unchanged.
async function startHistoricalGame(page, testInfo, journey, crazygames) {
  if (!crazygames) return startParityGame(page, testInfo, journey);
  await openCrazyGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  await page.locator('#btn-choose-beginning').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(journey.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true })).toBeVisible();
  await expect(page.getByRole('button', { name:'Begin', exact:true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () {
    return { bookmark:FB.state.start.id, seed:FB.state.seed };
  })).toEqual({ bookmark:journey.bookmark, seed:journey.code });
  await page.evaluate(function () {
    FB.game.setPaused(true);
    Object.assign(FB.game.auto, {
      minor:false, major:false, war:false, all:true, style:'first',
      hosts:'manual', hostResupply:true, buySupplies:true, forceSupplies:false,
      supplyTarget:75, build:false, research:false, researchMode:'cheapest'
    });
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
  });
}

module.exports = { startHistoricalGame };
