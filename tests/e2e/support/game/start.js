'use strict';

const { expect } = require('../fixture');

const START_CODE = 'CADENCE-867-farmer-london-f-Ada';

async function unlockStartTier(page, tier) {
  await page.evaluate(function (wantedTier) {
    FB.startProgression.noteTier(wantedTier);
  }, tier);
}

async function startDeterministicGame(page) {
  /* CADENCE intentionally remains the long-standing Free Farmer fixture.
     New-player locking has its own focused coverage; established journeys
     explicitly grant the fixture's earned station before using its code. */
  await unlockStartTier(page, 1);
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await expect(page.getByRole('heading', { name:'New Game', exact:true })).toBeVisible();
  const seedInput = page.locator('#ng-seed');
  await seedInput.fill(START_CODE);
  if (await seedInput.inputValue() !== START_CODE) {
    await seedInput.fill(START_CODE);
  }
  await expect(seedInput).toHaveValue(START_CODE);
  // The input's Enter handler is the same player path as the button. It also
  // avoids WebKit occasionally waiting forever for the modal button to become
  // geometrically stable while the title screen finishes its first paint.
  await seedInput.press('Enter');

  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect(page.locator('#cg-name')).toHaveValue('Ada');
  await page.getByRole('button', { name:'Begin Your Story', exact:true })
    .click({ timeout:30 * 1000 });

  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await expect(page.getByRole('heading', { name:'Your Story Begins', exact:true }))
    .toBeVisible();
  const storyBegin = page.getByRole('button', { name:'Begin', exact:true });
  await expect(storyBegin).toBeFocused();
  // The modal already owns keyboard focus. Enter exercises the real button
  // handler without asking WebKit to establish pointer stability during the
  // first painted game frame.
  await page.keyboard.press('Enter');
  // Begin goes straight into the game now — the orientation sheet is gone;
  // the coachmark hints carry that teaching.
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect.poll(function () {
    return page.evaluate(function (startCode) {
      return !!(FB.state && FB.state.seed === startCode &&
        FB.state.player && FB.state.chars[FB.state.player.charId]);
    }, START_CODE);
  }).toBe(true);
  // A fresh life teaches the map as a coachmark once the intro sheets close;
  // dismiss it so every spec starts from a clean table. A spec that pre-seeds
  // the guide-hints switch off never gets one.
  const mapCoach = page.locator('.coachmark', { hasText:'Drag to pan' });
  const lessonUp = await mapCoach.waitFor({ state:'visible', timeout:800 })
    .then(function () { return true; }, function () { return false; });
  if (lessonUp) {
    await page.getByRole('button', { name:'Got it', exact:true }).click();
    await expect(page.locator('.coachmark')).toHaveCount(0);
  }
}

module.exports = {
  START_CODE:START_CODE,
  unlockStartTier:unlockStartTier,
  startDeterministicGame:startDeterministicGame
};
