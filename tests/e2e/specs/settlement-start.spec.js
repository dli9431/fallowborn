'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/settlement.js',
  'data/bookmarks.js',
  'data/settlements.js'
]);

/* Birthplace settlement picking: the two-stage pick screen (county, then the
   settlement inside it), the chosen slot in new-game state, and the optional
   eighth start-code part. Authored per docs/designs/seeds.md; NOT run by the
   authoring agent (owner runs the harness). */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

/* Title → New Game → fresh seed → first bookmark → Free Farmer → pick screen */
async function reachPickScreen(page) {
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New Game', exact: true }))
    .toBeVisible();
  await page.locator('#ng-fresh').click();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
  await page.locator('#bookmarklist .scencard').first().click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name: /Free Farmer/ }).click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
}

/* Begin Your Story → intro modal → Begin (no orientation sheet anymore) */
async function beginAndDismiss(page) {
  await page.getByRole('button', { name: 'Begin Your Story', exact: true })
    .click({ timeout:30 * 1000 });
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Story Begins', exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

test('a tapped settlement becomes the birthplace and lands in state and the start code',
  async function ({ page }) {
    await reachPickScreen(page);

    // county stage → settlement stage
    await page.getByRole('button', { name: 'Random Province', exact: true }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.game.pickStage; });
    }).toBe('settlement');

    // the info bar lists exactly the settlements visible at the start
    const wanted = await page.evaluate(function () {
      return FB.settlementsOf(null, FB.game.pending.provinceId)
        .map(function (st) { return st.name; });
    });
    expect(wanted.length).toBeGreaterThan(1);
    const buttons = page.locator('#pickinfo .picksett');
    await expect(buttons).toHaveCount(wanted.length);
    await expect(buttons.first()).toContainText(wanted[0]);
    // the primary button offers the county seat by name
    await expect(page.locator('#btn-pick-random'))
      .toContainText('Begin in ' + wanted[0]);

    // pick the second settlement; chargen names it
    const pid = await page.evaluate(function () {
      return FB.game.pending.provinceId;
    });
    await buttons.nth(1).click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-summary')).toContainText(wanted[1]);

    await beginAndDismiss(page);
    const after = await page.evaluate(function () {
      return {
        provinceId: FB.state.player.provinceId,
        homeSettlement: FB.state.player.homeSettlement,
        plotSettlement: FB.state.player.landPlots[0].settlement,
        seedParts: FB.state.seed.split('-')
      };
    });
    expect(after.provinceId).toBe(pid);
    expect(after.homeSettlement).toBe(1);
    expect(after.plotSettlement).toBe(1);
    // the eighth start-code part spells the slot behind an explicit preset part
    expect(after.seedParts).toHaveLength(8);
    expect(after.seedParts[6]).toBe('standard');
    expect(after.seedParts[7]).toBe('1');
  });

test('Back walks the stages and the county seat remains the default start',
  async function ({ page }) {
    await reachPickScreen(page);
    await page.getByRole('button', { name: 'Random Province', exact: true }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.game.pickStage; });
    }).toBe('settlement');

    // Back from the settlement stage returns to the province stage
    await page.locator('#btn-pick-back').click();
    await expect(page.locator('#pickinfo'))
      .toContainText('No province chosen yet');
    await expect(page.locator('#btn-pick-random'))
      .toHaveText('Random Province');
    expect(await page.evaluate(function () {
      return FB.game.pickStage + '/' + String(FB.game.pending.provinceId);
    })).toBe('province/null');

    // picking again and taking the county seat keeps the long-standing default
    await page.getByRole('button', { name: 'Random Province', exact: true }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.game.pickStage; });
    }).toBe('settlement');
    await page.locator('#btn-pick-random').click(); // "Begin in {seat}"
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    const countyName = await page.evaluate(function () {
      return FB.L(FB.world.byId[FB.game.pending.provinceId].name);
    });
    await expect(page.locator('#cg-summary'))
      .toContainText('Free Farmer in ' + countyName);

    await beginAndDismiss(page);
    const after = await page.evaluate(function () {
      return {
        homeSettlement: FB.state.player.homeSettlement,
        plotSettlement: FB.state.player.landPlots[0].settlement,
        seedParts: FB.state.seed.split('-').length
      };
    });
    expect(after.homeSettlement).toBe(0);
    expect(after.plotSettlement).toBe(0);
    expect(after.seedParts).toBe(6); // old six-part spelling is unchanged
  });

test('a start code carries the birthplace settlement',
  async function ({ page }) {
    const code = 'CADENCE-867-farmer-london-f-Ada-standard-1';
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill(code);
    await seedInput.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-name')).toHaveValue('Ada');

    const settName = await page.evaluate(function () {
      return FB.settlementsOf(null, 'london')[1].name;
    });
    await expect(page.locator('#cg-summary')).toContainText(settName);
    expect(await page.evaluate(function () {
      return FB.game.pending.settlementIdx;
    })).toBe(1);

    await beginAndDismiss(page);
    // the stored code round-trips exactly what was pasted
    expect(await page.evaluate(function () { return FB.state.seed; })).toBe(code);
    expect(await page.evaluate(function () {
      return FB.state.player.homeSettlement;
    })).toBe(1);
  });

test('a start code with an oversized settlement slot clamps instead of failing',
  async function ({ page }) {
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill('CADENCE-867-farmer-london-f-Ada-standard-99');
    await seedInput.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    const wanted = await page.evaluate(function () {
      return FB.settlementVisibleCount(null, 'london') - 1;
    });
    expect(await page.evaluate(function () {
      return FB.game.pending.settlementIdx;
    })).toBe(wanted);
  });

test('a start code with a malformed settlement part is rejected',
  async function ({ page }) {
    await page.getByRole('button', { name: 'New Game', exact: true }).click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill('CADENCE-867-farmer-london-f-Ada-standard-x');
    await seedInput.press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  });
