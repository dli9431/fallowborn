'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/technology.js',
  'js/main.js',
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

test('phone modal disclosure controls match their neighboring action family',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:740 });
    var sizes = await page.evaluate(function () {
      FB.ui.openModal('Disclosure sizing audit',
        '<div class="settcard declarative-choice-card">' +
          '<button id="audit-action" class="actionbtn">Choose</button>' +
          '<span class="settcard-actions declarative-choice-actions">' +
            '<button id="audit-action-info" class="btn small settcard-info">?</button>' +
          '</span></div>' +
        '<div class="conversion-card settcard"><div class="settcard-head">' +
          '<b>Conversion</b><span class="settcard-actions">' +
            '<button id="audit-small-info" class="btn small settcard-info">?</button>' +
            '<button id="audit-small-action" class="btn small convcard-select">Select</button>' +
          '</span></div></div>' +
        '<div class="event-choice has-details">' +
          '<button id="audit-event" class="evopt">Answer</button>' +
          '<button id="audit-event-info" class="btn small event-details-button">?</button>' +
        '</div>' +
        '<div class="event-participant-card settcard">' +
          '<div class="event-participant-strip settcard-head">' +
            '<button id="audit-participant" class="event-participant-main">Person</button>' +
            '<span class="settcard-actions"><button id="audit-participant-info" ' +
              'class="btn small settcard-info">?</button></span>' +
          '</div></div>' +
        '<div class="event-duty-help settcard"><div class="settcard-head">' +
          '<button id="audit-duty" class="event-duty-help-anchor">Duty</button>' +
          '<span class="settcard-actions"><button id="audit-duty-info" ' +
            'class="btn small settcard-info">?</button></span>' +
          '</div></div>' +
        '<div class="large-list-section-heading">' +
          '<button id="audit-section" class="large-list-section-toggle">Section</button>' +
          '<span class="settcard-actions large-list-section-actions">' +
            '<button id="audit-section-info" class="btn small settcard-info">?</button>' +
          '</span></div>' +
        '<div class="governance-county-protections">' +
          '<button id="audit-governance" class="btn">Protect</button>' +
          '<span class="settcard-actions"><button id="audit-governance-info" ' +
            'class="btn small settcard-info">?</button></span></div>' +
        '<div class="equip-slot-face">' +
          '<button id="audit-equipment" class="equip-slot">Slot</button>' +
          '<span class="settcard-actions equip-slot-actions">' +
            '<button id="audit-equipment-info" class="btn small settcard-info equip-slot-info">?</button>' +
          '</span></div>', { modalClass:'equipment-modal' });
      function height(id) {
        return Math.round(document.getElementById(id).getBoundingClientRect().height);
      }
      return {
        action:[height('audit-action'), height('audit-action-info')],
        small:[height('audit-small-action'), height('audit-small-info')],
        event:[height('audit-event'), height('audit-event-info')],
        participant:[height('audit-participant'), height('audit-participant-info')],
        duty:[height('audit-duty'), height('audit-duty-info')],
        section:[height('audit-section'), height('audit-section-info')],
        governance:[height('audit-governance'), height('audit-governance-info')],
        equipment:[height('audit-equipment'), height('audit-equipment-info')]
      };
    });

    expect(sizes).toEqual({
      action:[48, 48],
      small:[48, 48],
      event:[52, 52],
      participant:[50, 50],
      duty:[48, 48],
      section:[48, 48],
      governance:[48, 48],
      equipment:[58, 58]
    });
  });

test('technology details keep a concise research summary in responsive help',
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
      await expect(tooltip).not.toContainText(label);
    }
    await expect(tooltip.locator('.asset-effect-stakes')).toHaveCount(1);
    await expect(tooltip.locator('.asset-effect-context')).toHaveCount(1);
    await expect(tooltip.locator('.asset-effect-costs')).toHaveCount(1);
    await expect(tooltip.locator('.asset-effect-terms')).toHaveCount(1);
    await expect(tooltip).toContainText('Cost');
    await expect(tooltip).toContainText('Ongoing');
    await expect(tooltip).toContainText(
      'Occupies one national research slot while active');
    await expect(tooltip).toHaveAttribute('role', 'tooltip');
    const tooltipType = await tooltip.evaluate(function (node) {
      const root = getComputedStyle(node);
      const content = node.querySelector('.tooltip-content');
      const stakes = node.querySelector('.asset-effect-stakes');
      const context = node.querySelector('.asset-effect-context');
      const costs = node.querySelector('.asset-effect-costs');
      const terms = node.querySelector('.asset-effect-terms');
      return {
        rootSize:root.fontSize,
        primarySize:getComputedStyle(stakes).fontSize,
        contextSize:getComputedStyle(context).fontSize,
        costsSize:getComputedStyle(costs).fontSize,
        termsSize:getComputedStyle(terms).fontSize,
        contentPadding:getComputedStyle(content).padding,
        oneFont:[content, stakes, context, costs, terms].every(function (part) {
          return getComputedStyle(part).fontFamily === root.fontFamily;
        })
      };
    });
    expect(tooltipType).toEqual({
      rootSize:'14px',
      primarySize:'14px',
      contextSize:'13px',
      costsSize:'13px',
      termsSize:'13px',
      contentPadding:'0px',
      oneFont:true
    });

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

test('phone and tablet Self education flows return directly to the drawer',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.chars[s.player.charId].born = s.date.year - 12;
      FB.ui.refresh();
    });
    for (const viewport of [
      { width:390, height:844 },
      { width:820, height:1180 }
    ]) {
      await page.setViewportSize(viewport);
      await page.locator('#tb-portrait').click();
      await expect(page.locator('body')).toHaveClass(/showself/);

      await page.locator('#self-edufocus').click();
      await expect(page.getByRole('heading', {
        name:'Your education', exact:false
      })).toBeVisible();
      await page.locator('#edu-back').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('body')).toHaveClass(/showself/);
      await expect(page.locator('#self-edufocus')).toBeVisible();
      await expect(page.locator('#cm-close')).toHaveCount(0);

      await page.locator('#self-tutor').click();
      await expect(page.getByRole('heading', {
        name:'Your schooling', exact:false
      })).toBeVisible();
      await page.locator('#tut-back').click();
      await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
      await expect(page.locator('body')).toHaveClass(/showself/);
      await expect(page.locator('#self-tutor')).toBeVisible();
      await expect(page.locator('#cm-close')).toHaveCount(0);
      await page.locator('#btn-closeself').click();
    }
  });

test('phone and tablet Self drawers pause running time and restore it on close',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () {
      const toast = document.createElement('div');
      toast.id = 'drawer-toast-fixture';
      toast.className = 'toast';
      toast.textContent = 'Existing notice';
      document.getElementById('toasts').appendChild(toast);
      FB.game.setPaused(false);
      document.getElementById('tb-portrait').click();
    });
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
    await expect(page.locator('#drawer-toast-fixture')).toBeHidden();
    await page.locator('#lefttabs .tab[data-tab="family"]').click();
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
    await page.locator('#btn-closeself').click();
    await expect(page.locator('body')).not.toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);
    await expect(page.locator('#drawer-toast-fixture')).toBeVisible();

    await page.evaluate(function () { FB.game.setPaused(true); });
    await page.setViewportSize({ width:820, height:1180 });
    await page.evaluate(function () {
      FB.game.setPaused(false);
      document.getElementById('tb-portrait').click();
    });
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
    await page.locator('#btn-closeself').click();
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);

    await page.evaluate(function () {
      FB.game.setPaused(true);
      document.getElementById('tb-portrait').click();
    });
    await page.locator('#btn-closeself').click();
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
  });

test('mobile Play and fast-forward close the Self drawer before controlling time',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () {
      FB.game.setPaused(false);
      document.getElementById('tb-portrait').click();
    });
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);

    await page.locator('#btn-endturn').click();
    await expect(page.locator('body')).not.toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);

    await page.evaluate(function () {
      FB.game.setPaused(true);
      document.getElementById('tb-portrait').click();
    });
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);
    await page.locator('#btn-endturn').click();
    await expect(page.locator('body')).not.toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(false);

    await page.evaluate(function () {
      window.__drawerFastForward = { calls:0, pausedAtCall:null };
      FB.game.skipAhead = function () {
        window.__drawerFastForward.calls++;
        window.__drawerFastForward.pausedAtCall = FB.game.paused;
      };
      document.getElementById('tb-portrait').click();
    });
    await expect(page.locator('body')).toHaveClass(/showself/);
    expect(await page.evaluate(function () { return FB.game.paused; })).toBe(true);

    await page.locator('#btn-skip').click();
    await expect(page.locator('body')).not.toHaveClass(/showself/);
    expect(await page.evaluate(function () {
      return {
        paused:FB.game.paused,
        calls:window.__drawerFastForward.calls,
        pausedAtCall:window.__drawerFastForward.pausedAtCall
      };
    })).toEqual({ paused:true, calls:1, pausedAtCall:true });
  });
