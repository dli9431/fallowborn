'use strict';

const { test, expect } = require('../support/fixture');
const {
  injectHolyWarHarness,
  openGame,
  startDeterministicGame
} = require('../support/game');

test('the council is keyboard-operable at desktop and mobile widths',
  async function ({ page }, testInfo) {
    test.skip(!testInfo.project.name.endsWith('-served'),
      'The cross-browser council contract uses the served origin.');
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectHolyWarHarness(page);
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

    const firstMove = dialog.locator('[data-ghw-council-move]').first();
    await firstMove.focus();
    await expect(firstMove).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(function () {
      return FB.state.greatHolyWar.settlement.case.step;
    })).toBe(1);

    await page.setViewportSize({ width:390, height:844 });
    await page.evaluate(function () {
      FB.ui.showGreatHolyWarSettlement();
    });
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
