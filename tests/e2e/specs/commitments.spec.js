'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/model.js',
  'js/world.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('ongoing commitments adapt by layout and route to existing controls',
  async function ({ page }) {
    await page.evaluate(function () {
      const seen = FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      seen.network = 1;
    });
    const summary = page.locator('#ongoing-commitments');
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('heading', {
      name:'Ongoing commitments',
      exact:true
    })).toBeVisible();
    const focusCommitment = summary.locator('[data-commitment="focus"]');
    await expect(focusCommitment).toBeHidden();
    await expect(summary.locator(
      '[data-commitment="personal-attention"]')).toContainText(
      'Personal attention');
    // a commoner has no say over national research, so the row stays out
    await expect(summary.locator('[data-commitment="research"]')).toHaveCount(0);

    await page.setViewportSize({ width:360, height:740 });
    await expect(focusCommitment).toBeVisible();
    await focusCommitment.click();
    const focusList = page.locator('#daily-focus-list');
    await expect(focusList).toBeFocused();
    const focusAlignment = await focusList.evaluate(function (heading) {
      return Math.abs(heading.getBoundingClientRect().top -
        document.getElementById('sidebody').getBoundingClientRect().top);
    });
    expect(focusAlignment).toBeLessThanOrEqual(12);

    await page.setViewportSize({ width:1280, height:720 });
    await expect(focusCommitment).toBeHidden();

    await summary.locator('[data-commitment="personal-attention"]').click();
    await expect(page.locator('#sidetabs [data-tab="network"]')).toHaveClass(
      /active/);
    await expect(page.locator('#network-connections')).toBeFocused();

    // landed ranks get the research row and its route to the Technology sheet
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId];
      FB.foundPlayerRealm(s);
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-' + s.player.tier] = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await page.locator('#sidetabs [data-tab="actions"]').click();
    await expect(summary.locator('[data-commitment="research"]')).toContainText(
      'National research');
    await summary.locator('[data-commitment="research"]').click();
    await expect(page.getByRole('heading', {
      name:'Technology',
      exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();
  });

test('common households do not see ruler-only technology or automation controls',
  async function ({ page }) {
    const access = await page.evaluate(function () {
      FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      FB.state.player.panelIntrosSeen.prov = 1;
      FB.game.auto.hosts = 'off';
      FB.game.auto.build = true;
      FB.game.auto.research = true;
      FB.ui.refresh();
      return FB.techUiRelevant(FB.state);
    });
    expect(access).toBe(false);
    await waitForUiRefresh(page);
    await expect(page.locator('#btn-auto')).not.toContainText('✓');

    await page.locator('#sidetabs [data-tab="prov"]').click();
    await expect(page.locator('#tab-prov')).not.toContainText(
      'Technological development');

    await page.locator('#btn-auto').click();
    await expect(page.locator('input[name="ar-hosts"]')).toHaveCount(0);
    await expect(page.locator('#ar-build')).toHaveCount(0);
    await expect(page.locator('#ar-research')).toHaveCount(0);
    await expect(page.locator('#ar-research-mode')).toHaveCount(0);
    await expect(page.locator('#gm-body')).not.toContainText(
      'Only a sovereign player chooses national technology');
    await page.locator('#ar-done').click();

    await page.evaluate(function () {
      FB.ui.showGuide({ closeToGame:true });
    });
    await expect(page.locator('#guide-category option[value="technology"]'))
      .toHaveCount(0);
    await expect(page.locator('[data-guide-entry="technology"]')).toHaveCount(0);
    await expect(page.locator('[data-guide-entry^="tech-"]')).toHaveCount(0);
    await page.locator('#guide-close').click();

    const opened = await page.evaluate(function () {
      return {
        catalogue:FB.ui.showTech(),
        detail:FB.ui.showTechDetail('horizontal_loom')
      };
    });
    expect(opened).toEqual({ catalogue:false, detail:false });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function () {
      FB.state.player.tier = 3;
      FB.ui.showAutoResolve();
    });
    await expect(page.locator('input[name="ar-hosts"]')).toHaveCount(3);
    await expect(page.locator('#ar-build')).toBeVisible();
    await expect(page.locator('#ar-research')).toHaveCount(0);
    await expect(page.locator('#gm-body')).toContainText(
      'Only a sovereign player chooses national technology');
  });

test('the commitments title collapses and restores its ledger',
  async function ({ page }, testInfo) {
    const summary = page.locator('#ongoing-commitments');
    const toggle = summary.getByRole('button', {
      name:'Ongoing commitments',
      exact:true
    });
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(summary).toBeVisible();
    await expect(summary.locator('#ongoing-commitment-list')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.commitmentsCollapsed;
      });
    }).toBe(true);
    if (testInfo.project.name.endsWith('-served')) {
      await expect.poll(async function () {
        return page.evaluate(function () {
          const prefs = JSON.parse(localStorage.getItem('fb_ui') || '{}');
          return prefs.commitmentsCollapsed;
        });
      }).toBe(true);
    }

    await toggle.click();
    await expect(summary.locator('#ongoing-commitment-list')).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.commitmentsCollapsed;
      });
    }).toBe(false);
  });

test('daily focuses stay together and Settings can disable guide hints',
  async function ({ page }) {
    const structure = await page.locator('#tab-actions').evaluate(
      function (panel) {
        const children = Array.prototype.slice.call(panel.children);
        const focusIndexes = [];
        let firstGroup = -1;
        for (let i = 0; i < children.length; i++) {
          if (children[i].matches('[data-focus-id]')) focusIndexes.push(i);
          if (firstGroup < 0 &&
              children[i].matches('[data-action-group]')) firstGroup = i;
        }
        return {
          focusCount:focusIndexes.length,
          firstGroup:firstGroup,
          allBeforeGroups:focusIndexes.every(function (index) {
            return firstGroup < 0 || index < firstGroup;
          })
        };
      });
    expect(structure.focusCount).toBeGreaterThan(0);
    expect(structure.firstGroup).toBeGreaterThanOrEqual(0);
    expect(structure.allBeforeGroups).toBe(true);

    const pathHint = page.locator('#tab-actions .path-hint');
    await expect(pathHint).toBeVisible();
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();
    await expect(page.getByRole('checkbox', {
      name:/Keep daily focuses together/
    })).toHaveCount(0);
    await expect(page.getByRole('checkbox', {
      name:/Hide ongoing commitments/
    })).toHaveCount(0);

    const hideBeginnerHints = page.getByRole('checkbox', {
      name:/Disable guide hints/
    });
    await expect(hideBeginnerHints).not.toBeChecked();
    await expect(page.locator('label.autorow', { has:hideBeginnerHints }))
      .toContainText('role orientation popups');
    await hideBeginnerHints.check();
    await expect(pathHint).toHaveCount(0);
    await expect.poll(async function () {
      return page.evaluate(function () {
        return {
          preference:FB.game.uiPrefs.hideBeginnerHints,
          stored:JSON.parse(localStorage.getItem('fb_ui')).hideBeginnerHints
        };
      });
    }).toEqual({ preference:true, stored:true });
  });

test('conditional commitments expose travel, finance, and political management',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      const economy = FB.ensureEconomy(s);
      economy.loans.push({
        id:economy.nextId++,
        kind:'household',
        face:5,
        denomination:'nominal',
        dueTurn:s.turn + 180,
        dueSeason:(s.date.season + 2) % 4,
        dueYear:s.date.year,
        status:'active',
        defaultKind:'revenue'
      });
      s.player.tier = 4;
      s.player.liege = null;
      s.player.provs = [s.player.provinceId];
      FB.foundPlayerRealm(s);
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-' + s.player.tier] = 1;

      let journey = null;
      for (const purposeId in FBDATA.travelPurposes) {
        if (!Object.prototype.hasOwnProperty.call(
            FBDATA.travelPurposes, purposeId) ||
            purposeId === 'trade' ||
            FB.travelEligible(s, purposeId) !== true) continue;
        const choices = FB.travelDestinations(s, purposeId);
        for (let i = 0; i < choices.length; i++) {
          if (choices[i].cost <= s.player.gold &&
              FB.travelStart(s, purposeId, choices[i].destinationId,
                choices[i].destinationRealm)) {
            journey = {
              purpose:purposeId,
              destination:choices[i].destinationId
            };
            break;
          }
        }
        if (journey) break;
      }
      FB.ui.refresh();
      return {
        journey:journey,
        capacity:FB.politicalAttentionCapacity(s)
      };
    });
    await waitForUiRefresh(page);
    expect(setup.journey).not.toBeNull();
    expect(setup.capacity).toBeGreaterThan(0);

    const summary = page.locator('#ongoing-commitments');
    await expect(summary.locator('[data-commitment="travel"]')).toBeVisible();
    await expect(summary.locator('[data-commitment="finance"]')).toContainText(
      'Loans: 1');
    await expect(summary.locator(
      '[data-commitment="political-attention"]')).toBeVisible();
    await expect(summary.locator('[data-commitment="focus"]')).toHaveClass(
      /disabled/);
    await expect(summary.locator('[data-commitment="focus"]')).toContainText(
      'paused while traveling');

    await summary.locator('[data-commitment="travel"]').click();
    await expect(page.locator(
      '[data-action-id="travel_turn_back"]')).toBeFocused();

    await summary.locator('[data-commitment="finance"]').click();
    await expect(page.getByRole('heading', {
      name:'💰 Coin & Credit',
      exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();

    await summary.locator('[data-commitment="political-attention"]').click();
    await expect(page.getByRole('heading', {
      name:'Foreign Policy',
      exact:true
    })).toBeVisible();
  });

test('ongoing commitments remain within a narrow mobile panel',
  async function ({ page }) {
    await page.setViewportSize({ width:360, height:740 });
    const geometry = await page.locator('#ongoing-commitments').evaluate(
      function (summary) {
        const box = summary.getBoundingClientRect();
        return {
          left:box.left,
          right:box.right,
          viewport:document.documentElement.clientWidth,
          documentWidth:document.documentElement.scrollWidth
        };
      });
    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport);
  });

test('serfs see neither the commitments ledger nor deeds they cannot use',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 0;
      s.player.roleOrientationsSeen = s.player.roleOrientationsSeen || {};
      s.player.roleOrientationsSeen['role-tier-0'] = 1;
      s.player.panelIntrosSeen = s.player.panelIntrosSeen || {};
      s.player.panelIntrosSeen.network = 1;
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);

    // the whole commitments ledger stays out of a serf's way
    await expect(page.locator('#ongoing-commitments')).toHaveCount(0);

    // unusable deeds are hidden, but work and training stays: serfs can
    // hold the farming career, apprentice children, and run field enterprises
    const deedIds = await page.evaluate(function () {
      return FB.listInstants(FB.state).map(function (item) { return item.a.id; });
    });
    expect(deedIds).toContain('livelihoods');
    expect(deedIds).toContain('buy_freedom');
    expect(deedIds).not.toContain('coin_credit');
    expect(deedIds).not.toContain('adopt_tech');
    await expect(page.locator('[data-action-id="coin_credit"]')).toHaveCount(0);
    await expect(page.locator('[data-action-id="livelihoods"]')).toBeVisible();
    await page.locator('[data-action-group="realm"]').click();
    await expect(page.locator('[data-action-id="buy_freedom"]')).toBeVisible();
    await expect(page.locator('[data-action-id="adopt_tech"]')).toHaveCount(0);

    // the Network tab drops the Finance shortcut on the same rule
    await page.locator('#sidetabs [data-tab="network"]').click();
    await expect(page.locator('#network-work')).toBeVisible();
    await expect(page.locator('#network-finance')).toHaveCount(0);

    // obligations on the book make Coin & Credit worth surfacing again
    await page.evaluate(function () {
      const s = FB.state;
      const economy = FB.ensureEconomy(s);
      economy.loans.push({
        id:economy.nextId++,
        kind:'household',
        face:5,
        denomination:'nominal',
        dueTurn:s.turn + 180,
        dueSeason:(s.date.season + 2) % 4,
        dueYear:s.date.year,
        status:'active',
        defaultKind:'revenue'
      });
      FB.ui.refresh();
    });
    await waitForUiRefresh(page);
    await expect(page.locator('#network-finance')).toBeVisible();
    await page.locator('#sidetabs [data-tab="actions"]').click();
    await expect(page.locator('[data-action-id="coin_credit"]')).toBeVisible();
  });
