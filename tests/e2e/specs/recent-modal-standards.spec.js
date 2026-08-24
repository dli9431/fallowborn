'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ui_misc.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('sibling confirmations keep choices in the body and exits in the footer',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      const cid = s.player.charId;
      const original = FB.siblingCourtshipStatus;
      FB.siblingCourtshipStatus = function () {
        return {
          ready:true,
          route:'illicit',
          traitScore:3,
          requiredTraitScore:2,
          playerModifiers:[],
          targetModifiers:[],
          acceptance:{ chance:0.5, standingBonus:0 }
        };
      };
      FB.ui.showSiblingCourtshipConfirm(cid);
      FB.siblingCourtshipStatus = original;
    });

    await expect(page.locator(
      '#gm-body > .gm-list > #sibling-approach-confirm')).toBeVisible();
    await expect(page.locator(
      '#gm-body > .gm-footer > #gm-cancel')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');

    await page.evaluate(function () {
      const s = FB.state;
      const cid = s.player.charId;
      const originalStatus = FB.siblingProposalStatus;
      const originalChance = FB.siblingProposalChance;
      FB.siblingProposalStatus = function () {
        return {
          ready:true,
          route:'illicit',
          piety:20,
          prestige:15,
          commonVoice:5,
          liegeStanding:4,
          gold:0
        };
      };
      FB.siblingProposalChance = function () { return 0.5; };
      FB.ui.showSiblingProposalConfirm(cid);
      FB.siblingProposalStatus = originalStatus;
      FB.siblingProposalChance = originalChance;
    });

    await expect(page.locator(
      '#gm-body > .gm-list > #sibling-proposal-confirm')).toBeVisible();
    await expect(page.locator(
      '#gm-body > .gm-footer > #gm-cancel')).toBeVisible();
    await expect.poll(async function () {
      return page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
    }).toBe('genmodal');
  });

test('modal footers keep Back before Close and remain the final body row',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.ui.openModal('Footer placement audit',
        '<div class="gm-footer"><button class="btn primary" ' +
        'id="placement-close">Close</button></div>' +
        '<p id="placement-tail">Last content row</p>' +
        '<button class="btn" id="placement-back">Back</button>' +
        '<div class="gm-footer"></div>');
    });

    const desktop = await page.evaluate(function () {
      const body = document.querySelector('#gm-body');
      const footer = body.querySelector(':scope > .gm-footer');
      const back = document.querySelector('#placement-back').getBoundingClientRect();
      const close = document.querySelector('#placement-close').getBoundingClientRect();
      return {
        footers:body.querySelectorAll(':scope > .gm-footer').length,
        footerLast:body.lastElementChild === footer,
        order:Array.prototype.map.call(footer.querySelectorAll(':scope > button'),
          function (button) { return button.id; }),
        sameRow:Math.abs(back.top - close.top) < 2,
        backLeft:back.left < close.left
      };
    });
    expect(desktop).toEqual({
      footers:1,
      footerLast:true,
      order:['placement-back', 'placement-close'],
      sameRow:true,
      backLeft:true
    });

    await page.setViewportSize({ width:390, height:740 });
    const mobile = await page.evaluate(function () {
      const footer = document.querySelector('#gm-body > .gm-footer');
      const back = document.querySelector('#placement-back').getBoundingClientRect();
      const close = document.querySelector('#placement-close').getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      return {
        backAbove:back.top < close.top,
        backCentered:Math.abs((back.left + back.width / 2) -
          (footerRect.left + footerRect.width / 2)) < 2,
        closeCentered:Math.abs((close.left + close.width / 2) -
          (footerRect.left + footerRect.width / 2)) < 2
      };
    });
    expect(mobile).toEqual({
      backAbove:true,
      backCentered:true,
      closeCentered:true
    });
  });