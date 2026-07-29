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

test('ongoing commitments route to their existing controls',
  async function ({ page }) {
    const summary = page.locator('#ongoing-commitments');
    await expect(summary).toBeVisible();
    await expect(summary.getByRole('heading', {
      name:'Ongoing commitments',
      exact:true
    })).toBeVisible();
    await expect(summary.locator('[data-commitment="focus"]')).toContainText(
      'Daily focus');
    await expect(summary.locator(
      '[data-commitment="personal-attention"]')).toContainText(
      'Personal attention');
    await expect(summary.locator('[data-commitment="research"]')).toContainText(
      'National research');

    const focusId = await page.evaluate(function () {
      return FB.state.player.focus;
    });
    await page.setViewportSize({ width:1280, height:480 });
    await summary.locator('[data-commitment="focus"]').click();
    const focusControl = page.locator('[data-focus-id="' + focusId + '"]');
    await expect(focusControl).toBeFocused();
    const focusAlignment = await focusControl.evaluate(function (control) {
      return Math.abs(control.getBoundingClientRect().top -
        document.getElementById('sidebody').getBoundingClientRect().top);
    });
    expect(focusAlignment).toBeLessThanOrEqual(12);

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

test('settings can hide and restore the ongoing commitments ledger',
  async function ({ page }, testInfo) {
    await page.locator('#btn-menu').click();
    await page.locator('#m-settings').click();

    const hideCommitments = page.getByRole('checkbox', {
      name:/Hide ongoing commitments/
    });
    await expect(hideCommitments).not.toBeChecked();
    await hideCommitments.check();
    await expect(page.locator('#ongoing-commitments')).toHaveCount(0);
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.hideOngoingCommitments;
      });
    }).toBe(true);
    if (testInfo.project.name.endsWith('-served')) {
      await expect.poll(async function () {
        return page.evaluate(function () {
          const prefs = JSON.parse(localStorage.getItem('fb_ui') || '{}');
          return prefs.hideOngoingCommitments;
        });
      }).toBe(true);
    }

    await hideCommitments.uncheck();
    await expect(page.locator('#ongoing-commitments')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return FB.game.uiPrefs.hideOngoingCommitments;
      });
    }).toBe(false);
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
