'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/events.js',
  'js/save.js',
  'js/ui_modals.js',
  'css/style.css',
  'data/technology.js'
]);

/* Browser-profile starting progression: fresh locks, earned station-wide
   unlocks, shared-code enforcement, reset, and old-save recognition. The
   owner runs this specification through the approved Playwright harness. */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.startProgression.reset(); });
});

async function openScenarioPicker(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#ng-fresh').click();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
  await page.locator('#bookmarklist .scencard').first().click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
}

async function startSerfLife(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#ng-seed').fill('ASCENT-867-serf-london-f-Ada');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', {
    name:'Your Story Begins', exact:true
  })).toBeVisible();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

test('a fresh profile offers only Serf and refuses locked shared starts',
  async function ({ page }) {
    await openScenarioPicker(page);

    const serf = page.getByRole('button', { name:/Serf/ }).first();
    const farmer = page.getByRole('button', { name:/Free Farmer/ });
    const knight = page.getByRole('button', { name:/Hedge Knight/ });
    const baron = page.getByRole('button', { name:/Petty Baron/ });
    await expect(serf).not.toHaveAttribute('aria-disabled');
    await expect(farmer).toHaveAttribute('aria-disabled', 'true');
    await expect(farmer).toContainText('Reach Freeholder');
    await expect(knight).toContainText('Reach Gentry');
    await expect(baron).toContainText('Reach Baron');
    await expect(page.getByRole('button', { name:/Observe/ }))
      .not.toHaveAttribute('aria-disabled');

    /* A locked card is deliberately aria-disabled. Invoke its DOM handler to
       prove the application also rejects a synthetic activation rather than
       asking Playwright to perform a pointer click it correctly blocks. */
    await farmer.evaluate(function (button) { button.click(); });
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
    await expect(page.locator('#pickprov')).toHaveClass(/hidden/);

    await page.locator('#btn-ng-back').click();
    await page.locator('#btn-bm-back').click();
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#ng-seed').fill('CADENCE-867-farmer-london-f-Ada');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText(
      'Reach Freeholder in any life');
    await expect(page.locator('#chargen')).toHaveClass(/hidden/);
  });

test('earning Freeholder unlocks every tier-one beginning across reloads',
  async function ({ page }, testInfo) {
    await startSerfLife(page);
    const result = await page.evaluate(function () {
      const changed = FB.setPlayerTier(FB.state, 1);
      return {
        changed:changed,
        progression:FB.startProgression.snapshot()
      };
    });
    expect(result.changed).toBe(true);
    expect(result.progression).toMatchObject({
      highestAchievedTier:1,
      highestStartTier:1
    });
    await expect(page.locator('.toast', { hasText:'New beginnings unlocked' }))
      .toContainText('Freeholder');

    await openGame(page, testInfo);
    await openScenarioPicker(page);
    for (const name of [
      /Free Farmer/, /Craftsman/, /Novice of the Faith/, /Man-at-Arms/
    ]) {
      await expect(page.getByRole('button', { name:name }))
        .not.toHaveAttribute('aria-disabled');
    }
    await expect(page.getByRole('button', { name:/Hedge Knight/ }))
      .toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('button', { name:/Petty Baron/ }))
      .toHaveAttribute('aria-disabled', 'true');
  });

test('Settings resets unlocked beginnings to Serf-only',
  async function ({ page }) {
    await page.evaluate(function () { FB.startProgression.noteTier(3); });
    await page.getByRole('button', { name:'Settings', exact:true }).click();
    await expect(page.getByRole('heading', { name:'Settings', exact:true }))
      .toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Unlocked through Baron');
    await page.locator('#set-reset-starts').click();
    await expect(page.getByRole('heading', {
      name:'Reset unlocked beginnings', exact:true
    })).toBeVisible();
    await page.locator('#reset-starts-confirm').click();
    await expect(page.getByRole('heading', { name:'Settings', exact:true }))
      .toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Serf only');
    expect(await page.evaluate(function () {
      return FB.startProgression.snapshot();
    })).toMatchObject({ highestAchievedTier:0, highestStartTier:0 });
  });

test('restore credits only ranks earned above the original scenario',
  async function ({ page }) {
    await startSerfLife(page);
    const result = await page.evaluate(function () {
      const base = JSON.parse(FB.save.serialize());
      const earned = JSON.parse(JSON.stringify(base));
      earned.state.player.tier = 1;
      earned.state.peakTier = 1;
      FB.startProgression.reset();
      FB.save.restore(earned);
      const earnedTier = FB.startProgression.snapshot().highestAchievedTier;

      const selected = JSON.parse(JSON.stringify(base));
      selected.state.seed = 'CADENCE-867-farmer-london-f-Ada';
      selected.state.player.tier = 1;
      selected.state.peakTier = 1;
      FB.startProgression.reset();
      FB.save.restore(selected);
      return {
        earnedTier:earnedTier,
        selectedTier:FB.startProgression.snapshot().highestAchievedTier
      };
    });
    expect(result).toEqual({ earnedTier:1, selectedTier:0 });
  });
