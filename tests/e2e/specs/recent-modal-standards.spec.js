'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

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
