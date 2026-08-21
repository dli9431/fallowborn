'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/holywar.js',
  'js/keys.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');
const { injectHolyWarHarness } = require('../support/game/holywar-harness');

test('the council is keyboard-operable at desktop and mobile widths',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'The cross-browser council contract uses the served origin.');
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectHolyWarHarness(page);
    await page.evaluate(function () {
      var seen = FB.state.player.panelIntrosSeen =
        FB.state.player.panelIntrosSeen || {};
      seen.family = 1;
      seen.prov = 1;
      seen.network = 1;
    });
    const baseline = await page.evaluate(function () {
      return FB.save.serialize();
    });
    await page.evaluate(function () {
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem', 'acre']
      });
      FB.ui.showGreatHolyWarSettlement();
    });

    const dialog = page.getByRole('dialog');
    const heading = page.getByRole('heading', { name:/Settlement council/ });
    await expect(dialog).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'gm-title');

    const desktop = await page.evaluate(function () {
      var modal = document.getElementById('genmodal');
      var buttons = Array.prototype.slice.call(
        modal.querySelectorAll('[data-ghw-council-move]'));
      var rect = modal.querySelector('.modalcard').getBoundingClientRect();
      return {
        width:window.innerWidth,
        cardWidth:rect.width,
        names:buttons.map(function (button) {
          return button.textContent.trim();
        }),
        tabIndexes:buttons.map(function (button) {
          return button.tabIndex;
        }),
        tags:buttons.map(function (button) {
          return button.tagName;
        })
      };
    });
    expect(desktop.width).toBe(1280);
    expect(desktop.names.length).toBeGreaterThanOrEqual(3);
    expect(desktop.tabIndexes.every(function (value) {
      return value === 0;
    })).toBe(true);
    expect(desktop.tags.every(function (tag) {
      return tag === 'BUTTON';
    })).toBe(true);

    const modalControls = dialog.locator(
      'button:not([disabled]), a[href], input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"])'
    );
    const firstMove = dialog.locator('[data-ghw-council-move]').first();
    await expect(dialog).toBeFocused();
    const firstControl = modalControls.first();
    const lastControl = modalControls.last();
    await page.keyboard.press('Tab');
    await expect(firstControl).toBeFocused();
    await lastControl.focus();
    await page.keyboard.press('Tab');
    await expect(firstControl).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(lastControl).toBeFocused();

    await firstMove.focus();
    await page.keyboard.press('Enter');
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.state.greatHolyWar.settlement.case.step;
      });
    }).toBe(1);
    await page.keyboard.press('Digit1');
    await expect.poll(function () {
      return page.evaluate(function () {
        return FB.state.greatHolyWar.settlement.case.step > 1;
      });
    }).toBe(true);

    await page.evaluate(function (serialized) {
      FB.save.restore(JSON.parse(serialized));
      document.getElementById('genmodal').classList.add('hidden');
      FBTEST.makeGreatHolyWar({
        phase:'preparation',
        includePlayer:false,
        capturedCounties:[]
      });
      FB.ui.showTab('actions');
      FB.ui.refresh();
    }, baseline);
    await waitForUiRefresh(page);
    await page.locator('[data-action-group="war"]').click();
    const statusAction = page.locator(
      '[data-action-id="great_holy_war_status"]');
    await expect(statusAction).toBeVisible();
    await statusAction.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(statusAction).toBeFocused();

    const navigation = [
      ['b', '#tab-actions'],
      ['t', '#tab-char'],
      ['g', '#tab-family'],
      ['y', '#tab-prov'],
      ['n', '#tab-network'],
      ['u', '#tab-log']
    ];
    for (const row of navigation) {
      await page.keyboard.press(row[0]);
      await expect(page.locator(row[1])).toHaveClass(/active/);
    }

    await page.evaluate(function (serialized) {
      FB.save.restore(JSON.parse(serialized));
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem', 'acre']
      });
      FB.ui.showGreatHolyWarSettlement();
    }, baseline);
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();

    await page.setViewportSize({ width:390, height:844 });
    await expect(dialog).toBeVisible();
    const mobile = await page.evaluate(function () {
      var modal = document.getElementById('genmodal');
      var card = modal.querySelector('.modalcard');
      var body = document.getElementById('gm-body');
      var buttons = Array.prototype.slice.call(
        body.querySelectorAll('[data-ghw-council-move]'));
      var cardRect = card.getBoundingClientRect();
      return {
        fullsheet:modal.classList.contains('fullsheet-modal'),
        viewportWidth:window.innerWidth,
        cardLeft:cardRect.left,
        cardRight:cardRect.right,
        bodyOverflow:getComputedStyle(body).overflowY,
        minButtonHeight:Math.min.apply(null, buttons.map(function (button) {
          return button.getBoundingClientRect().height;
        })),
        documentOverflow:document.documentElement.scrollWidth > window.innerWidth
      };
    });
    expect(mobile.fullsheet).toBe(true);
    expect(mobile.cardLeft).toBe(0);
    expect(mobile.cardRight).toBe(mobile.viewportWidth);
    expect(mobile.bodyOverflow).toBe('auto');
    expect(mobile.minButtonHeight).toBeGreaterThanOrEqual(48);
    expect(mobile.documentOverflow).toBe(false);
  });
