'use strict';

const { expect } = require('../fixture');
const { mockCrazyGames } = require('../crazygames');
const { startParityGame, startPreparedParityGame, prepareJourneyBookmark } = require('./parity');
const { openCrazyGame } = require('./crazygames-title');
const { useReviewStartRules } = require('./released-starts');

// Historical review journeys choose their title contract explicitly. Keep the
// standard parity helper and the universal navigation fixture unchanged.
async function startHistoricalGame(page, testInfo, journey, crazygames) {
  // These historical review journeys may use a candidate start on a public date.
  await useReviewStartRules(page);
  // Historical reviews expose hidden dates by default; callers can retain the
  // ordinary visibility gate explicitly. Parity journeys keep their defaults.
  journey = Object.assign({ unhide:true }, journey);
  // A caller that already booted and prepared its own title (for example after an
  // ordinary Mods reload) sets prepared to reuse it instead of booting again.
  if (!crazygames) return journey.prepared ? startPreparedParityGame(page, journey)
    : startParityGame(page, testInfo, journey);
  await mockCrazyGames(page);
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openCrazyGame(page, testInfo);
  await prepareJourneyBookmark(page, journey);
  expect(await page.evaluate(function () {
    return { distribution:FB.platform.isCrazyGames, storage:FB.save.storageBackend(),
      available:FB.crazySave.available(), initialized:window.__cgTest.calls.includes('init') };
  })).toEqual({ distribution:true, storage:'localstorage', available:true, initialized:true });
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
  if (journey.revision) expect(await page.evaluate(function () {
    return FB.state.start.revision;
  })).toBe(journey.revision);
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
