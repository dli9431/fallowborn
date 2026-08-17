'use strict';

const { expect } = require('../fixture');

const START_CODE = 'CADENCE-867-farmer-london-f-Ada';

async function startDeterministicGame(page) {
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
  // The CADENCE seed starts the Free Farmer scenario, tier 1: a focused
  // Freeholder orientation sheet opens - never the whole Guide.
  await expect(page.getByRole('heading', { name:'Freeholder', exact:true }))
    .toBeVisible();
  await expect(page.locator('#gm-body')).toContainText('Good first actions');
  await expect(page.locator('#guide-controls')).toHaveCount(0);
  const orientationContinue = page.locator('#orientation-continue');
  await expect(orientationContinue).toBeFocused();
  // Setup only needs to dismiss the focused sheet. The dedicated onboarding
  // spec retains pointer coverage; Enter avoids a WebKit click-stability stall
  // during the first painted game frame while using the real button handler.
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect.poll(function () {
    return page.evaluate(function (startCode) {
      return !!(FB.state && FB.state.seed === startCode &&
        FB.state.player && FB.state.chars[FB.state.player.charId]);
    }, START_CODE);
  }).toBe(true);
}

module.exports = {
  START_CODE:START_CODE,
  startDeterministicGame:startDeterministicGame
};
