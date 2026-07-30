'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  waitForUiRefresh
} = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('ongoing commitments adapt by layout and route to existing controls',
  async function ({ page }) {
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
    await expect(summary.locator('[data-commitment="research"]')).toContainText(
      'National research');

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
    await summary.locator('[data-commitment="research"]').click();
    await expect(page.getByRole('heading', {
      name:'Technology',
      exact:true
    })).toBeVisible();
    await page.getByRole('button', { name:'Close', exact:true }).click();

    await summary.locator('[data-commitment="personal-attention"]').click();
    await expect(page.locator('#sidetabs [data-tab="network"]')).toHaveClass(
      /active/);
    await expect(page.locator('#network-connections')).toBeFocused();
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

test('daily focuses stay together and Settings can hide beginner hints',
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
      name:/Hide beginner hints/
    });
    await expect(hideBeginnerHints).not.toBeChecked();
    await hideBeginnerHints.check();
    await expect(pathHint).toHaveCount(0);
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.hideBeginnerHints;
      });
    }).toBe(true);
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
