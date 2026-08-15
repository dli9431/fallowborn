'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('phone UI keeps body, action, helper, and modal-help text readable',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });

    var sizes = await page.evaluate(function () {
      var action = document.querySelector('.actionbtn');
      var hint = document.querySelector('.hint');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'hint';
        hint.hidden = true;
        document.body.appendChild(hint);
      }
      return {
        body:parseFloat(getComputedStyle(document.body).fontSize),
        action:parseFloat(getComputedStyle(action).fontSize),
        hint:parseFloat(getComputedStyle(hint).fontSize)
      };
    });
    expect(sizes.body).toBeGreaterThanOrEqual(16);
    expect(sizes.action).toBeGreaterThanOrEqual(16);
    expect(sizes.hint).toBeGreaterThanOrEqual(14);

    await page.evaluate(function () { FB.ui.showPlots(); });
    var guideButton = page.locator('#plot-guide');
    await expect(guideButton).toBeVisible();
    await expect(guideButton).toHaveAttribute('aria-label', 'Guide: plots and intrigue');
    await expect(guideButton).toHaveCSS('width', '44px');

    await guideButton.click();
    await expect(page.getByRole('heading', { name:'Guide', exact:true })).toBeVisible();
    await expect(page.locator('[data-guide-entry="intrigue"]')).toHaveAttribute(
      'aria-expanded', 'true');
    await expect(page.locator('#guide-entry-detail-intrigue')).toContainText(
      'Plots take your focus');
  });

test('major information sheets expose contextual Guide routes', async function ({ page }) {
  await page.evaluate(function () { FB.ui.showFinance(); });
  await expect(page.locator('#finance-guide')).toBeVisible();
  await expect(page.locator('#finance-guide')).toHaveAttribute(
    'aria-label', 'Guide: resources and credit');

  await page.evaluate(function () { FB.ui.showHousehold(); });
  await expect(page.locator('#household-guide')).toBeVisible();
  await expect(page.locator('#household-guide')).toHaveAttribute(
    'aria-label', 'Guide: careers and household work');
});

test('Self skill Guide links close back to Self on desktop and phones',
  async function ({ page }) {
    var skill = page.locator('#tab-char [data-guide-skill="dip"]');
    await expect(skill).toBeVisible();
    await skill.click();
    await expect(page.locator('[data-guide-entry="skill-dip"]')).toHaveAttribute(
      'aria-expanded', 'true');
    await page.locator('#guide-close').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(skill).toBeVisible();

    await page.setViewportSize({ width:390, height:844 });
    await page.locator('#tb-portrait').click();
    await expect(page.locator('body')).toHaveClass(/showself/);
    skill = page.locator('#tab-char [data-guide-skill="dip"]');
    await expect(skill).toBeVisible();
    await skill.click();
    await expect(page.locator('[data-guide-entry="skill-dip"]')).toHaveAttribute(
      'aria-expanded', 'true');
    await page.locator('#guide-close').click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('body')).toHaveClass(/showself/);
    await expect(skill).toBeVisible();
  });
