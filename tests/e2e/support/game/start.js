'use strict';

const { expect } = require('../fixture');

const START_CODE = 'CADENCE-867-farmer-london-f-Ada';

async function unlockStartTier(page, tier) {
  await page.evaluate(function (wantedTier) {
    FB.startProgression.noteTier(wantedTier);
  }, tier);
}

async function startDeterministicGame(page, options) {
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
  /* Shared gameplay journeys are neither first-time-tip nor tutorial tests.
     Retire the queued profile tour and opt this synthetic save out of the
     tutorial, without changing the browser's guide-hints preference. This
     keeps scripted tutorial chapters and tutorial-only simulation help from
     perturbing unrelated journeys while Settings still exposes its default.
     Focused specs can preserve either layer explicitly. */
  const keepFirstTimeTips = !!(options && options.keepFirstTimeTips);
  const keepTutorial = keepFirstTimeTips || !!(options && options.keepTutorial);
  if (!keepFirstTimeTips) {
    await page.evaluate(function () {
      FB.game.uiPrefs.hideTips = true;
      if (FB.ui && FB.ui.coachmarkReset) FB.ui.coachmarkReset();
      if (FB.game.saveUiPrefs) FB.game.saveUiPrefs();
    });
    await expect(page.locator('.coachmark')).toHaveCount(0);
  }
  if (!keepTutorial) {
    await page.evaluate(function () {
      if (FB.state && FB.state.player && FB.state.player.flags) {
        delete FB.state.player.flags.tutorial;
      }
      if (FB.ui && FB.ui.refresh) FB.ui.refresh();
    });
    await expect(page.locator('.tutorial-card')).toHaveCount(0);
  }
}

module.exports = {
  START_CODE:START_CODE,
  unlockStartTier:unlockStartTier,
  startDeterministicGame:startDeterministicGame
};
