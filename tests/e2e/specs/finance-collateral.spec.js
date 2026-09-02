'use strict';

const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/economy.js',
  'data/map_data.js',
  'data/technology.js',
  'js/actions.js',
  'js/economy.js',
  'js/events.js',
  'js/items.js',
  'js/messages.js',
  'js/settlement.js',
  'js/technology.js',
  'js/ui_misc.js',
  'js/ui_modals.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('family land supports a substantial pledge and is forfeited on default',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const economy = FB.ensureEconomy(s);
      const originalTechRequirementMet = FB.techRequirementMet;
      FB.game.setPaused(true);
      p.tier = 2;
      p.gold = 0;
      p.prestige = 0;
      p.holdings = ['hearth_garden'];
      p.landPlotMigration = 1;
      p.landPlots = [];
      for (let i = 0; i < 5; i++) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
      }
      p.manor = { provinceId:p.provinceId, settlement:0 };
      economy.price = 1;
      economy.loans = [];
      economy.defaults = 0;
      delete economy.creditBanUntil;
      FB.techRequirementMet = function (state, id) {
        if (id === 'standardized_coinage') return true;
        return originalTechRequirementMet(state, id);
      };

      const collateral = FB.financeCollateral(s);
      const landAsset = collateral.filter(function (asset) {
        return asset.collateral.kind === 'land';
      })[0];
      const holdingAsset = collateral.filter(function (asset) {
        return asset.collateral.kind === 'holding' &&
          asset.collateral.id === 'hearth_garden';
      })[0];
      const offer = FB.financeLoanOffers(s).filter(function (item) {
        return item.kind === 'pledge' && item.collateral &&
          item.collateral.kind === 'land';
      })[0];
      const preview = FB.financeLoanPreview(s, offer);
      const loan = FB.takeFinanceLoan(s, 'pledge', offer.collateral);
      const landOfferedAgain = FB.financeLoanOffers(s).some(function (item) {
        return item.collateral && item.collateral.kind === 'land';
      });
      p.gold = 0;
      s.turn = loan.dueTurn;
      FB.financeSeason(s);
      const afterFirstMiss = {
        status:loan.status,
        plots:FB.landPlots(s).length,
        manor:!!p.manor,
        tier:p.tier
      };
      p.gold = 0;
      s.turn = loan.dueTurn;
      FB.financeSeason(s);
      FB.techRequirementMet = originalTechRequirementMet;

      return {
        landValue:landAsset && landAsset.value,
        landCount:landAsset && landAsset.collateral.count,
        durableHoldingOffered:!!holdingAsset,
        principal:offer && offer.principal,
        due:preview && preview.dueNow,
        landOfferedAgain:landOfferedAgain,
        afterFirstMiss:afterFirstMiss,
        finalStatus:loan.status,
        plots:FB.landPlots(s).length,
        manor:!!p.manor,
        tier:p.tier,
        defaults:economy.defaults,
        techReview:FBDATA.techImpactReviews.features.expanded_pledged_collateral.mode,
        techErrors:FB.validateTechnologyData()
      };
    });

    expect(result.landValue).toBe(600);
    expect(result.landCount).toBe(5);
    expect(result.durableHoldingOffered).toBe(true);
    expect(result.principal).toBeGreaterThan(40);
    expect(result.principal).toBeLessThanOrEqual(400);
    expect(result.due).toBeGreaterThan(result.principal);
    expect(result.landOfferedAgain).toBe(false);
    expect(result.afterFirstMiss).toEqual({
      status:'arrears', plots:5, manor:true, tier:2
    });
    expect(result.finalStatus).toBe('defaulted');
    expect(result.plots).toBe(0);
    expect(result.manor).toBe(false);
    expect(result.tier).toBe(1);
    expect(result.defaults).toBe(1);
    expect(result.techReview).toBe('none');
    expect(result.techErrors).toEqual([]);
  });

test('Coin and Credit explains and names land and household collateral',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const originalTechRequirementMet = FB.techRequirementMet;
      FB.game.setPaused(true);
      p.tier = 2;
      p.gold = 0;
      p.holdings = ['hearth_garden'];
      p.landPlotMigration = 1;
      p.landPlots = [];
      for (let i = 0; i < 5; i++) {
        p.landPlots.push({ provinceId:p.provinceId, settlement:0 });
      }
      p.manor = { provinceId:p.provinceId, settlement:0 };
      FB.techRequirementMet = function (state, id) {
        if (id === 'standardized_coinage') return true;
        return originalTechRequirementMet(state, id);
      };
      FB.ui.showFinance();
      FB.techRequirementMet = originalTechRequirementMet;
    });

    await expect(page.locator('#gm-body')).toContainText(
      'complete group of family land plots');
    await expect(page.locator('#gm-body')).toContainText(
      'Maintained household standards are expenses and cannot be pledged');

    await page.evaluate(function () {
      window.__financeOriginalTechRequirementMet = FB.techRequirementMet;
      FB.techRequirementMet = function (state, id) {
        if (id === 'standardized_coinage') return true;
        return window.__financeOriginalTechRequirementMet(state, id);
      };
      FB.ui.showFinanceBorrow();
    });

    await expect(page.locator('#gm-body')).toContainText('5 land plots at');
    await expect(page.locator('#gm-body')).toContainText('Hearth Garden');
    const landOffer = page.locator('[data-finance-offer]').filter({
      hasText:'5 land plots at'
    });
    await expect(landOffer).toHaveCount(1);
    await landOffer.click();
    await expect(page.locator('#gm-body')).toContainText(
      'the manor and gentry station may also be lost');
    await page.evaluate(function () {
      FB.techRequirementMet = window.__financeOriginalTechRequirementMet;
      delete window.__financeOriginalTechRequirementMet;
    });
  });
