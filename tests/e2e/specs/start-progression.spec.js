'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/events.js',
  'js/save.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'css/style.css',
  'data/cultures.js',
  'data/bookmarks.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/starts.js',
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
  await expect(page.locator('#bookmarks:not(.hidden)')).toBeVisible();
  await page.locator('#bookmarklist .scencard').first().click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
}

async function startSerfLife(page) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
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
    expect(await serf.locator('h3').evaluate(function (heading) {
      return getComputedStyle(heading).fontSize;
    })).toBe('19px');
    await expect(serf.locator('.diff')).toHaveCount(0);
    await expect(serf.locator('p'))
      .toHaveText('Bound to the land, with no property or freedom.');
    await expect(farmer).toHaveAttribute('aria-disabled', 'true');
    await expect(farmer).toHaveClass(/locked/);
    await expect(farmer.locator('.diff')).toHaveCount(0);
    await expect(farmer).toContainText('Free, with a small plot and modest savings.');
    await expect(farmer.locator('p')).toHaveCount(2);
    await expect(farmer).toContainText('Reach Freeholder');
    await expect(knight).toContainText('Reach Gentry');
    await expect(baron).toContainText('Reach Baron');
    await expect(page.getByRole('button', { name:/Observe/ }))
      .not.toHaveAttribute('aria-disabled');
    await expect(page.locator('#scenariolist')).not.toContainText('★');
    await expect(page.locator('#ng-heading'))
      .toHaveText('Choose Your Beginning in 867 AD');

    /* A locked card is deliberately aria-disabled. Invoke its DOM handler to
       prove the application also rejects a synthetic activation rather than
       asking Playwright to perform a pointer click it correctly blocks. */
    await farmer.evaluate(function (button) { button.click(); });
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
    await expect(page.locator('#pickprov')).toHaveClass(/hidden/);

    await page.locator('#btn-ng-back').click();
    await page.locator('#btn-bm-back').click();
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
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

test('starting a serf life forms persistent tenure with active duties and recognized rights',
  async function ({ page }) {
    await startSerfLife(page);
    const tenureData = await page.evaluate(function () {
      const state = FB.state;
      const tenure = state.player.tenure;
      return {
        hasTenure: !!tenure,
        status: tenure && tenure.status,
        archetypeId: tenure && tenure.archetypeId,
        hasDuties: tenure && tenure.duties && tenure.duties.length > 0,
        hasRights: tenure && tenure.rights && tenure.rights.length > 0,
        hasConditional: tenure && tenure.conditional && tenure.conditional.length > 0,
        matchesHome: tenure && tenure.provinceId === (state.player.provinceId || state.player.home),
        matchesSettlement: tenure && tenure.settlement === (state.player.homeSettlement || state.player.settlement || 0)
      };
    });
    expect(tenureData.hasTenure).toBe(true);
    expect(tenureData.status).toBe('active');
    expect(tenureData.archetypeId).toBe('latin_manorial');
    expect(tenureData.hasDuties).toBe(true);
    expect(tenureData.hasRights).toBe(true);
    expect(tenureData.hasConditional).toBe(true);
    expect(tenureData.matchesHome).toBe(true);
    expect(tenureData.matchesSettlement).toBe(true);
  });

async function startWithSerfCode(page, code) {
  await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await expect(page.getByRole('heading', {
    name:'Your Story Begins', exact:true
  })).toBeVisible();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
}

test('867 Barcelona Catholic standard starts with latin_manorial tenure and exact home capture',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREC-867-serf-barcelona-f-Ada');
    expect(await page.evaluate(function () {
      var p = FB.state.player;
      return {
        arch: p.tenure && p.tenure.archetypeId,
        prov: p.tenure && p.tenure.provinceId,
        sett: p.tenure && p.tenure.settlement,
        home: p.provinceId || p.home
      };
    })).toEqual({
      arch: 'latin_manorial',
      prov: 'barcelona',
      sett: 0,
      home: 'barcelona'
    });
  });

test('867 Fustat Sunni standard starts with irrigated_fellah tenure',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREM-867-serf-fustat-m-Hassan');
    expect(await page.evaluate(function () {
      var p = FB.state.player;
      return { arch: p.tenure && p.tenure.archetypeId, prov: p.tenure && p.tenure.provinceId,
        sett: p.tenure && p.tenure.settlement };
    })).toEqual({ arch: 'irrigated_fellah', prov: 'fustat', sett: 0 });
  });

test('867 Novgorod Slavic Pagan standard starts with pagan_household_service tenure',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREP-867-serf-novgorod-m-Igor');
    expect(await page.evaluate(function () {
      var p = FB.state.player;
      return { arch: p.tenure && p.tenure.archetypeId, prov: p.tenure && p.tenure.provinceId,
        sett: p.tenure && p.tenure.settlement };
    })).toEqual({ arch: 'pagan_household_service', prov: 'novgorod', sett: 0 });
  });

test('1066 Fustat Shia standard starts with irrigated_fellah tenure',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREM-1066-serf-fustat-m-Ali');
    expect(await page.evaluate(function () {
      var p = FB.state.player;
      return { arch: p.tenure && p.tenure.archetypeId, prov: p.tenure && p.tenure.provinceId,
        sett: p.tenure && p.tenure.settlement };
    })).toEqual({ arch: 'irrigated_fellah', prov: 'fustat', sett: 0 });
  });

test('1066 Novgorod Finnic Baltic Pagan standard starts with pagan_household_service tenure',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREP-1066-serf-novgorod-m-Tapio-standard-0-finnic.baltic_pagan');
    expect(await page.evaluate(function () {
      var p = FB.state.player;
      return { arch: p.tenure && p.tenure.archetypeId, prov: p.tenure && p.tenure.provinceId,
        sett: p.tenure && p.tenure.settlement };
    })).toEqual({ arch: 'pagan_household_service', prov: 'novgorod', sett: 0 });
  });

[
  { label:'867 Barcelona Catholic', code:'TENUREC-867-serf-barcelona-f-Ada-established',
    arch:'latin_manorial', prov:'barcelona', duties:['week_work', 'demesne_harvest', 'tithe_sheaf', 'local_facility_due'] },
  { label:'867 Fustat Sunni', code:'TENUREM-867-serf-fustat-m-Hassan-established',
    arch:'irrigated_fellah', prov:'fustat', duties:['irrigation_labor', 'crop_share', 'waterworks_cartage', 'mill_share'] },
  { label:'867 Novgorod Slavic Pagan', code:'TENUREP-867-serf-novgorod-m-Igor-established',
    arch:'pagan_household_service', prov:'novgorod', duties:['household_service', 'masters_harvest', 'local_heavy_service'] },
  { label:'1066 Fustat Shia', code:'TENUREM-1066-serf-fustat-m-Ali-established',
    arch:'irrigated_fellah', prov:'fustat', duties:['irrigation_labor', 'crop_share', 'waterworks_cartage', 'mill_share'] },
  { label:'1066 Novgorod Finnic Baltic Pagan', code:'TENUREP-1066-serf-novgorod-m-Tapio-established-0-finnic.baltic_pagan',
    arch:'pagan_household_service', prov:'novgorod', duties:['household_service', 'masters_harvest', 'local_heavy_service'] }
].forEach(function (fixture) {
  test(fixture.label + ' established start preserves regional tenure selection',
    async function ({ page }) {
      await startWithSerfCode(page, fixture.code);
      expect(await page.evaluate(function () {
        var p = FB.state.player;
        return {
          arch:p.tenure && p.tenure.archetypeId,
          prov:p.tenure && p.tenure.provinceId,
          sett:p.tenure && p.tenure.settlement,
          duties:p.tenure && p.tenure.duties.map(function (d) { return d.id; })
        };
      })).toEqual({ arch:fixture.arch, prov:fixture.prov, sett:0, duties:fixture.duties });
    });
});

test('active customary tenure is initialized immediately on start before the first tier 0 autosave',
  async function ({ page }) {
    await startWithSerfCode(page, 'TENUREC-867-serf-barcelona-f-Ada');
    const timing = await page.evaluate(function () {
      const state = FB.state;
      const tenureBeforeAutosave = state.player.tenure;
      const statusBefore = tenureBeforeAutosave && tenureBeforeAutosave.status;

      // Trigger autosave
      FB.save.autosave();
      FB.save.flushPending();
      const autoSave = FB.save.read('auto');
      const autoTenure = autoSave && autoSave.state && autoSave.state.player && autoSave.state.player.tenure;

      return {
        activeBeforeAutosave: statusBefore === 'active',
        presentInAutosave: autoTenure && autoTenure.status === 'active',
        sameArchetype: autoTenure && autoTenure.archetypeId === tenureBeforeAutosave.archetypeId
      };
    });

    expect(timing.activeBeforeAutosave).toBe(true);
    expect(timing.presentInAutosave).toBe(true);
    expect(timing.sameArchetype).toBe(true);
  });

test('a fresh serf life can fast-forward before Play is used',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.game.uiPrefs.tipsGrandfathered = true;
      FB.game.uiPrefs.onboardingStarted = true;
      FB.game.uiPrefs.hideTips = true;
      FB.game.saveUiPrefs();
    });
    await startWithSerfCode(page, 'TENUREC-867-serf-barcelona-f-Ada');
    const before = await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        paused:FB.game.paused,
        timeStarted:!!FB.state.player.flags.tut_unpause
      };
    });

    await page.locator('#btn-skip').click();
    await expect.poll(function () {
      return page.evaluate(function () { return !FB.game.fastForwarding; });
    }).toBe(true);

    const after = await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        paused:FB.game.paused,
        timeStarted:!!FB.state.player.flags.tut_unpause,
        tenureStatus:FB.state.player.tenure && FB.state.player.tenure.status
      };
    });
    expect(before).toEqual({ turn:0, paused:true, timeStarted:false });
    expect(after.turn).toBeGreaterThan(before.turn);
    expect(after.paused).toBe(true);
    expect(after.timeStarted).toBe(true);
    expect(after.tenureStatus).toBe('active');
  });

test('tier 1 or higher starts do not form serf tenure placeholder records',
  async function ({ page }) {
    await page.evaluate(function () { FB.startProgression.noteTier(1); });
    await page.getByRole('button', { name:'New Game', exact:true }).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('CADENCE-867-farmer-london-f-Ada');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
    await page.getByRole('button', { name:'Begin', exact:true }).click();

    const result = await page.evaluate(function () {
      return {
        tier: FB.state.player.tier,
        tenure: FB.state.player.tenure || null
      };
    });
    expect(result.tier).toBe(1);
    expect(result.tenure).toBeNull();
  });
