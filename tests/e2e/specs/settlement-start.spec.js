'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/main.js',
  'js/model.js',
  'js/portrait.js',
  'js/save.js',
  'js/settlement.js',
  'js/ui_panels.js',
  'css/style.css',
  'data/bookmarks.js',
  'data/cultures.js',
  'data/starts.js',
  'data/settlements.js'
]);

/* Quick Start plus birthplace settlement picking: the one-click curated lives,
   the two-stage custom picker (county, then settlement), and their ordinary
   start-code state. Authored per docs/designs/seeds.md; NOT run by the
   authoring agent (owner runs the harness). */

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { unlockStartTier } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await unlockStartTier(page, 1);
});

test('New Game offers six quick starts above the dated custom-start path',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
    await expect(page.getByRole('heading', {
      name:'Choose a Starting Date', exact:true
    })).toBeVisible();
    await expect(page.getByRole('heading', {
      name:'Quick Start', exact:true
    })).toBeVisible();
    await expect(page.locator('#quickstart-divider')).toHaveText('OR');
    const quickStarts = page.locator('#quickstartlist .quickstart-card');
    await expect(quickStarts).toHaveCount(6);
    await expect(quickStarts.nth(0)).toContainText('Aed');
    await expect(quickStarts.nth(0)).toContainText('Gaelic · Latin Christianity');
    await expect(quickStarts.nth(2)).toContainText('Berber · Islam (Sunni)');
    await expect(quickStarts.nth(4)).toContainText('Sámi · Norse Paganism');
    await expect(quickStarts.nth(5)).toContainText('Arab · Islam (Shia)');
    expect(await quickStarts.locator('.quickstart-title-location').allTextContents())
      .toEqual([
        'Serf | Galway', 'Serf | Uppsala', 'Serf | Tunis',
        'Serf | Ulaid', 'Serf | Norrland', 'Serf | Fustat'
      ]);
    for (let i = 0; i < 3; i++) {
      await expect(quickStarts.nth(i).locator('.quickstart-date')).toContainText('867');
      await expect(quickStarts.nth(i + 3).locator('.quickstart-date')).toContainText('1066');
    }
    expect(await quickStarts.locator('canvas').first().evaluate(function (canvas) {
      const pixels = canvas.getContext('2d').getImageData(
        0, 0, canvas.width, canvas.height).data;
      return Array.from(pixels).some(function (channel) { return channel !== 0; });
    })).toBe(true);
    const bookmarkTitle = page.locator('#bookmarklist .scencard h3').first();
    await expect(bookmarkTitle).toContainText(':');
    await expect(bookmarkTitle).not.toContainText('—');
    expect(await bookmarkTitle.evaluate(function (heading) {
      return getComputedStyle(heading).fontSize;
    })).toBe('19px');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    expect(await page.evaluate(function () {
      return FB.game.pending && FB.game.pending.seed;
    })).toMatch(/^[A-Z0-9]+$/);

    await page.getByRole('button', {
      name:'Use a Seed or Start Code', exact:true
    }).click();
    await expect(page.getByRole('heading', {
      name:'Use a Seed or Start Code', exact:true
    })).toBeVisible();
    await expect(page.locator('#ng-seed')).toBeVisible();
    await page.getByRole('button', { name:'Cancel', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
  });

test('a quick start creates its authored Serf life in one selection',
  async function ({ page }) {
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('[data-quick-start="aed_867"]').click();
    await expect(page.getByRole('heading', {
      name:'Your Story Begins', exact:true
    })).toBeVisible({ timeout:30 * 1000 });
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const family = FB.parentsOf(s, me).concat(FB.siblingsOf(s, me));
      return {
        bookmark:s.start.id,
        tier:s.player.tier,
        province:s.player.provinceId,
        homeSettlement:s.player.homeSettlement,
        name:me.name,
        culture:me.culture,
        religion:me.religion,
        seed:s.seed,
        familyIds:family.map(function (c) { return c.id; }),
        familyStatuses:family.map(function (c) {
          return FB.characterStationName(s, c);
        })
      };
    });
    expect(result).toMatchObject({
      bookmark:'867', tier:0, province:'galway', homeSettlement:0,
      name:'Aed', culture:'gaelic', religion:'catholic',
      seed:expect.stringMatching(
        /^[A-Z0-9]+-867-serf-galway-m-Aed-standard-0-gaelic\.catholic$/)
    });
    expect(result.familyIds.length).toBeGreaterThan(2);
    expect(result.familyStatuses.every(function (status) {
      return status === 'Serf';
    })).toBe(true);

    await page.evaluate(function () { FB.ui.showFamilyTree(); });
    await expect(page.getByRole('heading', { name:'The Family Tree' }))
      .toBeVisible();
    for (const id of result.familyIds) {
      await expect(page.locator('.family-tree-primary .ftchip[data-cid="' +
        id + '"]')).toHaveCount(1);
    }
  });

/* Title → New Game (fresh seed) → first bookmark → Free Farmer → pick screen */
async function reachPickScreen(page) {
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('heading', {
    name: 'Choose a Starting Date', exact: true
  }))
    .toBeVisible();
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
  await page.locator('#bookmarklist .scencard').first().click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name: /Free Farmer/ }).click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  await expect(page.locator('#pickprov > .hint')).toHaveText(
    'Tap a province on the map. Your culture and faith follow your homeland.');
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

test('campaign start paints a locked character form before creating the life',
  async function ({ page }) {
    await reachPickScreen(page);
    await page.getByRole('button', { name:'Random Province', exact:true }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.game.pickStage; });
    }).toBe('settlement');
    await page.locator('#btn-pick-random').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();

    const immediate = await page.evaluate(function () {
      document.getElementById('btn-cg-start').click();
      const controls = Array.from(document.querySelectorAll(
        '#chargen button, #chargen input, #chargen select'));
      return {
        busy:document.getElementById('chargen').getAttribute('aria-busy'),
        pending:document.getElementById('chargen').classList.contains('start-pending'),
        controlsLocked:controls.every(function (control) { return control.disabled; }),
        state:FB.state
      };
    });
    expect(immediate).toEqual({
      busy:'true', pending:true, controlsLocked:true, state:null
    });

    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    await expect(page.locator('#chargen')).toHaveAttribute('aria-busy', 'false');
    await page.getByRole('button', { name:'Begin', exact:true }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('a selected settlement becomes the birthplace and lands in state and the start code',
  async function ({ page }) {
    await reachPickScreen(page);

    // county stage → settlement stage
    await page.getByRole('button', { name: 'Random Province', exact: true }).click();
    await expect.poll(function () {
      return page.evaluate(function () { return FB.game.pickStage; });
    }).toBe('settlement');

    // the compact select lists exactly the settlements visible at the start
    const wanted = await page.evaluate(function () {
      return FB.settlementsOf(null, FB.game.pending.provinceId)
        .map(function (st) { return st.name; });
    });
    expect(wanted.length).toBeGreaterThan(1);
    const select = page.locator('#pick-settlement');
    await expect(select.locator('option')).toHaveCount(wanted.length);
    await expect(select.locator('option').first()).toContainText(wanted[0]);
    await expect(select.locator('option').first()).toContainText('County seat');
    await expect(select).toHaveValue('0');
    await expect(page.locator('#pickinfo')).not.toContainText('Now tap');
    await expect(page.locator('#pickinfo')).not.toContainText('—');
    await expect(page.locator('#pickinfo .pick-location-title'))
      .toHaveCSS('font-size', '19px');
    await expect(page.locator('#btn-pick-random')).toHaveText('Continue');

    // select the second settlement, then commit it with Continue
    const pid = await page.evaluate(function () {
      return FB.game.pending.provinceId;
    });
    await select.selectOption('1');
    expect(await page.evaluate(function () {
      return FB.game.pending.settlementIdx;
    })).toBe(1);
    await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
    await page.locator('#btn-pick-random').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return FB.game.pending.settlementIdx;
    })).toBe(1);

    // Back to the same county preserves the explicit dropdown choice.
    await page.locator('#btn-cg-back').click();
    await expect(page.locator('#pick-settlement')).toHaveValue('1');
    await page.locator('#btn-pick-random').click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();

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
    await expect(page.locator('#pick-settlement')).toHaveValue('0');
    await page.locator('#btn-pick-random').click(); // Continue with county seat
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return FB.game.pending.settlementIdx;
    })).toBe(0);

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
    await page.locator('#btn-bm-seed').click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill(code);
    await seedInput.press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await expect(page.locator('#cg-name')).toHaveValue('Ada');

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
    await page.locator('#btn-bm-seed').click();
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
    await page.locator('#btn-bm-seed').click();
    const seedInput = page.locator('#ng-seed');
    await seedInput.fill('CADENCE-867-farmer-london-f-Ada-standard-x');
    await seedInput.press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  });
