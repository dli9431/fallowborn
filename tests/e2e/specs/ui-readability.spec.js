'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/technology.js',
  'js/technology.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/ui_topbar.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

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
      'A plot uses your daily focus');
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

test('technology details move the national research audit into responsive help',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const home = p.provinceId;
      p.tier = 4;
      p.liege = null;
      p.provs = [home];
      s.owner[home] = 'player';
      s.holder[home] = 'player';
      FB.foundPlayerRealm(s);
      s.realms.player.alive = true;
      s.realms.player.rank = 1;
      s.realms.player.liege = null;
      s.realms.player.capital = home;
      s.realms.player.name = 'Test Sovereignty';
      FB.invalidateRealmCache();
      FB.ui.showTechDetail('ribbed_vaulting');
    });

    const facts = page.locator('.tech-detail-facts');
    const details = facts.locator('.settcard-details');
    await expect(facts).toBeVisible();
    await expect(facts).toContainText('Research details');
    await expect(details).toBeHidden();
    await expect(page.locator(
      '#gm-body > .gm-body-text > .asset-effect-summary')).toHaveCount(0);
    await facts.hover();
    const tooltip = page.locator('#tooltip');
    for (const label of [
      'Owner', 'Scope', 'Setup cost', 'Recurring cost', 'Effect',
      'Transfer rule', 'Expiry'
    ]) {
      await expect(tooltip).toContainText(label);
    }
    await expect(tooltip).toContainText('Test Sovereignty');
    await expect(tooltip).toContainText(
      'Occupies one national research slot while active');

    await page.setViewportSize({ width:900, height:720 });
    const disclosure = facts.locator('.settcard-info');
    await expect(disclosure).toBeVisible();
    await disclosure.click();
    await expect(details).toBeVisible();
    await expect(details).toContainText('Permanent national knowledge once completed');
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
