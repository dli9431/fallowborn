'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/actions.js', 'data/economy.js', 'js/actions.js', 'js/economy.js',
  'js/events.js', 'js/main.js', 'js/model.js', 'js/keys.js', 'js/ui_misc.js',
  'js/ui_panels.js', 'js/ui_topbar.js', 'css/style.css', 'static/sprites/daily-focus.png'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.ui.showTab('actions');
    FB.setFocus(FB.state, 'work_land');
  });
  await waitForUiRefresh(page);
});

// Geometry of the Play button, its label, and the scene in CSS pixels.
function measureTimeBar(page) {
  return page.evaluate(function () {
    const btn = document.getElementById('btn-endturn');
    const label = btn.querySelector('.endturn-label');
    const art = document.getElementById('focus-art');
    const b = btn.getBoundingClientRect(), l = label.getBoundingClientRect();
    const a = art.getBoundingClientRect();
    const shown = getComputedStyle(art).display !== 'none';
    const hit = shown
      ? document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2) : null;
    return {
      shown:shown,
      labelFits:label.scrollWidth <= label.clientWidth + 1,
      buttonHeight:Math.round(b.height),
      skipHeight:Math.round(document.getElementById('btn-skip').getBoundingClientRect().height),
      artInside:!shown || (a.left >= b.left - 0.5 && a.right <= b.right + 0.5 &&
        a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5),
      clearOfLabel:!shown || a.left >= l.right - 1,
      artWidth:a.width, artHeight:a.height,
      hitsButton:!shown || hit === btn
    };
  });
}

test.describe('desktop time bar', function () {
  test.use({ viewport:{ width:1920, height:1080 } });

  test('the Play button loads the local atlas and focus changes swap its scene',
    async function ({ page }) {
      const work = page.locator('[data-focus-id="work_land"]');
      const btn = page.locator('#btn-endturn');
      const art = page.locator('#btn-endturn #focus-art');
      await expect(work).toHaveClass(/focused/);
      await expect(page.locator('#mapwrap .focus-art')).toHaveCount(0);
      await expect(page.locator('#tab-actions .focus-art')).toHaveCount(0);
      await expect(btn).toHaveClass(/has-focus-art/);
      await expect(art).toBeVisible();
      await expect(art).toHaveAttribute('data-focus-art', 'fieldwork');
      await expect(art).toHaveAttribute('aria-hidden', 'true');
      await expect(art).toHaveCSS('pointer-events', 'none');
      await expect(btn.locator('.pp')).toHaveText(/▶ Play|❚❚ Pause/);
      const image = await art.evaluate(function (node) {
        const url = getComputedStyle(node).backgroundImage;
        const match = url.match(/^url\(["']?(.*?)["']?\)$/);
        if (!match) return { local:false };
        const source = new URL(match[1], document.baseURI);
        const local = source.pathname.endsWith('/static/sprites/daily-focus.png') &&
          source.protocol === location.protocol && source.host === location.host;
        return new Promise(function (resolve) {
          const bitmap = new Image();
          bitmap.onload = function () {
            resolve({ local:local, width:bitmap.naturalWidth, height:bitmap.naturalHeight });
          };
          bitmap.onerror = function () { resolve({ local:local, failed:true }); };
          bitmap.src = source.href;
        });
      });
      expect(image).toEqual({ local:true, width:768, height:1920 });
      const withArt = await measureTimeBar(page);
      expect(withArt).toMatchObject({
        shown:true, labelFits:true, artInside:true, clearOfLabel:true, hitsButton:true
      });
      expect(withArt.artWidth).toBeCloseTo(82, 1);
      expect(withArt.artHeight).toBeCloseTo(46, 1);

      const before = await page.evaluate(function () {
        return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
      });
      await page.locator('[data-focus-id="rest"]').press('Enter');
      await waitForUiRefresh(page);
      await expect(art).toBeVisible();
      await expect(art).toHaveAttribute('data-focus-art', 'rest');
      const resting = await measureTimeBar(page);
      // The absolutely placed scene never changes the time bar's height.
      expect(resting.buttonHeight).toBe(withArt.buttonHeight);
      await page.locator('[data-focus-id="pray"]').press('Enter');
      await waitForUiRefresh(page);
      await expect(art).toHaveAttribute('data-focus-art', 'prayer');
      await expect(art).toBeVisible();
      expect(await page.evaluate(function () {
        return { turn:FB.state.turn, gold:FB.state.player.gold, rng:FB.getRngState() };
      })).toEqual(before);
    });

  test('pause, label changes and reduced motion control one retained scene',
    async function ({ page }) {
      await page.locator('[data-focus-id="rest"]').press('Enter');
      await waitForUiRefresh(page);
      const art = page.locator('#focus-art');
      await expect(art).toHaveAttribute('data-focus-art', 'rest');
      await page.emulateMedia({ reducedMotion:'no-preference' });
      await expect(art).toHaveCSS('animation-play-state', 'paused');
      await art.evaluate(function (node) { node._focusArtRetainedProbe = true; });
      // Keep the native ticker, but prevent a simulated day during this visual journey.
      await page.evaluate(function () {
        FB.game.SPEEDS[FB.game.speedIdx] = 60000;
        FB.game.setSpeed(0);
        FB.game.setPaused(false);
      });
      await waitForUiRefresh(page);
      await expect(page.locator('#btn-endturn .pp')).toHaveText('❚❚ Pause');
      await expect(art).toHaveCSS('animation-play-state', 'running');
      await page.evaluate(function () { FB.ui.refresh({ liveTick:true }); });
      await waitForUiRefresh(page);
      expect(await art.evaluate(function (node) { return node._focusArtRetainedProbe; })).toBe(true);
      await page.locator('#daily-focus-list').click();
      await expect(art).toHaveCSS('animation-play-state', 'running');
      await page.evaluate(function () { FB.ui.showTab('log'); });
      await expect(art).toHaveCSS('animation-play-state', 'running');
      await page.emulateMedia({ reducedMotion:'reduce' });
      await expect(art).toHaveCSS('animation-name', 'none');
      await expect(art).toHaveCSS('background-position-x', '-7px');
      await page.emulateMedia({ reducedMotion:'no-preference' });
      await page.evaluate(function () { FB.game.setPaused(true); });
      await waitForUiRefresh(page);
      await expect(page.locator('#btn-endturn .pp')).toHaveText('▶ Play');
      await expect(art).toHaveCSS('animation-play-state', 'paused');
      expect(await art.evaluate(function (node) { return node._focusArtRetainedProbe; })).toBe(true);
    });

  test('childhood, professions, noble duties and clerical offices select their activity scenes',
    async function ({ page }) {
      // Only stage character circumstances. Selection still uses the real focus
      // eligibility engine, and the scene must update on the next UI refresh.
      const cases = [
        { focus:'study', scene:'studying', age:10 },
        { focus:'play', scene:'play', age:10 },
        { focus:'market', scene:'market' },
        { focus:'keep_house', scene:'household', sex:'f' },
        { focus:'craft_work', scene:'crafting', profession:'craftsman' },
        { focus:'trade_run', scene:'caravan', profession:'merchant' },
        { focus:'keep_records', scene:'writing', profession:'administration' },
        { focus:'practice_physic', scene:'physic', profession:'physician' },
        { focus:'scholarly_work', scene:'studying', profession:'scholar' },
        { focus:'militia', scene:'training' },
        { focus:'drill', scene:'training', profession:'soldier' },
        { focus:'stand_guard', scene:'guard', profession:'soldier' },
        { focus:'copy_books', scene:'writing', profession:'monk' },
        { focus:'serve_church', scene:'faithful', profession:'priest' },
        { focus:'manage_manor', scene:'manor', tier:2 },
        { focus:'serve_lord', scene:'hall', tier:2 },
        { focus:'courtly_graces', scene:'court', tier:2, sex:'f' },
        { focus:'train_arms', scene:'training', tier:2 },
        { focus:'shepherd_diocese', scene:'diocese', bishop:true },
        { focus:'administer_temporalities', scene:'temporalities', bishop:true },
        { focus:'govern', scene:'govern', tier:3 },
        { focus:'patronize', scene:'patronage', tier:3 }
      ];
      await page.evaluate(function () { FB.ui.showTab('log'); });
      for (const entry of cases) {
        const chosen = await page.evaluate(function (config) {
          const s = FB.state, p = s.player, c = s.chars[p.charId];
          p.tier = config.tier || 1;
          p.profession = config.profession || 'farmer';
          c.born = s.date.year - (config.age || 25);
          c.sex = config.sex || 'm';
          c.career = { profession:p.profession, rank:'master', chosen:true,
            experience:12, startedYear:s.date.year - 12, guildRank:'none', guildStanding:0 };
          c.religion = 'catholic';
          delete c.bishopric;
          delete p.flags.bishop;
          if (config.bishop) {
            c.bishopric = { seeProvinceId:p.provinceId, appointedTurn:s.turn,
              previousTier:1, appointerKind:'legacy', appointerId:null,
              investiturePolicy:'canonical' };
          }
          FB.setFocus(s, config.focus);
          return { eligible:FB.focusStatus(s, config.focus).can, focus:p.focus };
        }, entry);
        expect(chosen, entry.focus).toEqual({ eligible:true, focus:entry.focus });
        await waitForUiRefresh(page);
        await expect(page.locator('#btn-endturn #focus-art')).toHaveAttribute('data-focus-art', entry.scene);
        await expect(page.locator('#focus-art')).toBeVisible();
      }
    });

  test('regional serf work and every household appointment get contextual scenes',
    async function ({ page }) {
      await page.evaluate(function () {
        const s = FB.state;
        FB.setPlayerTier(s, 0, {tenureFormationReason:'rank_change'});
        s.chars[s.player.charId].born = s.date.year - 25;
        FB.ui.showTab('log');
      });
      const tenures = {
        latin_manorial:'fieldwork', irrigated_fellah:'irrigation',
        norse_coastal_service:'boats', pastoral_steppe:'herding',
        woodland_dependence:'woodland', pagan_household_service:'service',
        dependent_farming:'fieldwork'
      };
      expect(await page.evaluate(function () { return Object.keys(FBDATA.tenureArchetypes).sort(); }))
        .toEqual(Object.keys(tenures).sort());
      for (const id of Object.keys(tenures)) {
        await page.evaluate(function (archetype) {
          FB.state.player.tenure.archetypeId = archetype;
          FB.setFocus(FB.state, 'toil');
        }, id);
        await waitForUiRefresh(page);
        await expect(page.locator('#focus-art')).toHaveAttribute('data-focus-art', tenures[id]);
        await expect(page.locator('#focus-art')).toBeVisible();
      }
      expect(await page.evaluate(function () {
        const s = FB.state, status = FB.householdServiceStatus(s, 'helper');
        FB.adjustStanding(s, {kind:'character', id:status.patron.id}, 100, 'fixture');
        return FB.acceptHouseholdService(s, 'helper', {
          charId:s.player.charId, employerId:status.patron.id, serial:0
        });
      })).toBe(true);
      const roles = {
        helper:'service', storekeeper:'household', reeve:'manor', steward:'manor',
        tally:'writing', clerk:'writing', tutor:'tutoring', carrier:'carrying',
        buyer:'market', factor:'caravan', watch:'guard', guard:'guard',
        sergeant:'training', captain:'training'
      };
      expect(await page.evaluate(function () { return Object.keys(FBDATA.householdServiceRoles).sort(); }))
        .toEqual(Object.keys(roles).sort());
      for (const id of Object.keys(roles)) {
        await page.evaluate(function (role) {
          // Reuse a valid employer/residence record to stage each appointment.
          FB.state.player.householdService.roleId = role;
          FB.setFocus(FB.state, 'toil');
        }, id);
        await waitForUiRefresh(page);
        await expect(page.locator('#focus-art')).toHaveAttribute('data-focus-art', roles[id]);
        await expect(page.locator('#focus-art')).toBeVisible();
      }
      // A suspended appointment must not display working guards.
      await page.evaluate(function () {
        FB.state.player.flags.in_prison = true;
        FB.ui.refresh();
      });
      await waitForUiRefresh(page);
      await expect(page.locator('#focus-art')).toBeHidden();
      // The same retained node returns with rest once normal life resumes.
      await page.evaluate(function () {
        delete FB.state.player.flags.in_prison;
        FB.setFocus(FB.state, 'rest');
      });
      await waitForUiRefresh(page);
      await expect(page.locator('#focus-art')).toHaveAttribute('data-focus-art', 'rest');
      await expect(page.locator('#focus-art')).toBeVisible();
    });
});

test('narrow desktop and phone widths never truncate the Play label for the scene',
  async function ({ page }) {
    const sizes = [
      { width:821, height:800 }, { width:1100, height:800 }, { width:1920, height:1080 },
      { width:320, height:640 }, { width:360, height:740 }, { width:844, height:390 }
    ];
    // Keep the native ticker, but prevent a simulated day while Pause shows.
    await page.evaluate(function () {
      FB.game.SPEEDS[FB.game.speedIdx] = 60000;
      FB.game.setSpeed(0);
    });
    for (const size of sizes) {
      await page.setViewportSize(size);
      for (const paused of [true, false]) {
        await page.evaluate(function (p) { FB.game.setPaused(p); }, paused);
        await waitForUiRefresh(page);
        const bar = await measureTimeBar(page);
        const label = JSON.stringify(size) + (paused ? ' paused' : ' playing');
        expect(bar.labelFits, label).toBe(true);
        expect(bar.artInside, label).toBe(true);
        expect(bar.clearOfLabel, label).toBe(true);
        expect(bar.hitsButton, label).toBe(true);
      }
    }
  });

test.describe('high density mobile time bar', function () {
  test.use({ viewport:{ width:390, height:844 }, deviceScaleFactor:2, hasTouch:true });

  test('the fixed bar shows the scene inside Play without growing or blocking it',
    async function ({ page }) {
      const art = page.locator('#timebtns #focus-art');
      await expect(art).toBeVisible();
      await expect(page.locator('#mapwrap .focus-art')).toHaveCount(0);
      const bar = await measureTimeBar(page);
      expect(bar).toMatchObject({
        shown:true, labelFits:true, artInside:true, clearOfLabel:true, hitsButton:true
      });
      expect(bar.buttonHeight).toBe(bar.skipHeight);
      await page.evaluate(function () {
        FB.game.SPEEDS[FB.game.speedIdx] = 60000;
        FB.game.setSpeed(0);
      });
      await page.locator('#btn-endturn').click();
      await waitForUiRefresh(page);
      expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);
      await page.evaluate(function () { FB.game.setPaused(true); });
      const work = page.locator('[data-focus-id="work_land"]');
      const details = work.locator('..').getByRole('button', { name:'Details', exact:true });
      await details.click();
      await expect(page.locator('#focus-details-work_land')).toBeVisible();
      await expect(page.locator('#tab-actions .focus-art')).toHaveCount(0);
    });
});
