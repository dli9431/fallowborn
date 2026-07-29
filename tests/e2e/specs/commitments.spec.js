'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame
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
    await summary.locator('[data-commitment="focus"]').click();
    await expect(page.locator('[data-focus-id="' + focusId + '"]')).toBeFocused();

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
