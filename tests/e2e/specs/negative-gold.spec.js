'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css/style.css',
  'data/actions.js',
  'data/cultures.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/map_data.js',
  'data/technology.js',
  'js/actions.js',
  'js/economy.js',
  'js/events.js',
  'js/intrigue.js',
  'js/i18n.js',
  'js/main.js',
  'js/market.js',
  'js/model.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/ui_topbar.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('mandatory losses create a persistent shortfall that later income repays',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const out = {};

      p.gold = 2;
      FB.applyEffects(s, { gold:-5 }, {});
      out.eventLoss = p.gold;
      FB.applyEffects(s, { gold:1.5 }, {});
      out.eventRecovery = p.gold;

      p.gold = -4;
      FB.marketSettleHouseholdNecessities(s);
      out.necessitiesPreserve = p.gold;
      out.hardship = !!(p.marketHardship && p.marketHardship.active);

      p.householdStandards = { board:1 };
      FB.householdStandardsSeason(s);
      out.standardsPreserve = p.gold;

      const originalLivelihoodBreakdown = FB.livelihoodBreakdown;
      FB.livelihoodBreakdown = function () { return [{ amount:2 }]; };
      FB.livelihoodSeason(s);
      FB.livelihoodBreakdown = originalLivelihoodBreakdown;
      out.livelihoodRecovery = p.gold;

      p.tier = 3;
      p.focus = 'patronize';
      p.gold = 0.01;
      FB.tickFocus(s);
      out.patronageShortfall = p.gold;

      p.tier = 1;
      p.holdings = [];
      p.gold = 2;
      FB.fns.devastation_lose_holding(s);
      out.devastationShortfall = p.gold;

      const me = s.chars[p.charId];
      const home = FB.world.byId[p.provinceId];
      const victim = FB.makeCharacter(s, {
        name:'Fine Claimant', sex:me.sex === 'm' ? 'f' : 'm',
        culture:home.culture, religion:home.religion,
        born:s.date.year - 30, station:1, traitsN:0
      });
      const hearing = {
        id:'negative-gold-hearing', accusedId:me.id,
        accusedGeneration:s.generation, targetId:victim.id,
        plotId:'blackmail', context:{ characterId:victim.id },
        evidence:'testimony', severity:1, successful:true,
        authority:FB.playerRealmId(s)
      };
      FB.ensureIntrigue(s).hearing = hearing;
      const fine = FB.intrigueSentenceProjection(s, hearing).fine;
      p.gold = 1;
      FB.fns.intrigue_hearing_submit(s, { hearingId:hearing.id });
      out.imposedFine = fine;
      out.imposedFineBalance = p.gold;

      const economy = FB.ensureEconomy(s);
      economy.lastYear = s.date.year - 1;
      p.gold = -7;
      FB.financeYear(s, economy);
      out.yearlyShortfall = p.gold;
      out.yearlyAdjustment = economy.lastAdjustment;

      const destination = FB.world.provs.filter(function (province) {
        return !province.wasteland && province.id !== p.provinceId;
      })[0];
      p.tier = 1;
      p.gold = -9;
      FB.fns.raid_enslave(s, {
        protagonistId:p.charId, raidProfile:'northmen',
        destinationId:destination.id, originProvinceId:p.provinceId
      });
      out.raidShortfall = p.gold;

      return out;
    });

    expect(result.eventLoss).toBe(-3);
    expect(result.eventRecovery).toBe(-1.5);
    expect(result.necessitiesPreserve).toBe(-4);
    expect(result.hardship).toBe(true);
    expect(result.standardsPreserve).toBe(-4);
    expect(result.livelihoodRecovery).toBe(-2);
    expect(result.patronageShortfall).toBeLessThan(0);
    expect(result.devastationShortfall).toBe(-3);
    expect(result.imposedFineBalance).toBe(1 - result.imposedFine);
    expect(result.imposedFineBalance).toBeLessThan(0);
    expect(result.yearlyShortfall).toBe(-7);
    expect(result.yearlyAdjustment).toBe(0);
    expect(result.raidShortfall).toBe(-9);
  });

test('cash-gated choices stay blocked while zero-cost choices remain available',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      p.gold = -5;
      p.tier = 0;
      me.born = s.date.year - 30;
      FB.ensureSerfTenure(s, 'negative_gold_test');
      const lord = FB.getRole(s, 'lord', true);
      FB.adjustStanding(s, { kind:'character', id:lord.id },
        -FB.standingOf(s, { kind:'character', id:lord.id }),
        'test:negative_gold_freedom');
      const freedomLauncher = FB.instantStatus(s, 'buy_freedom');
      const freedom = FB.freedomPurchaseStatus(s);
      FB.ui.showFreedomPurchase();

      const economy = FB.ensureEconomy(s);
      const loan = {
        id:economy.nextId++, kind:'merchant', face:5,
        denomination:'real', dueTurn:s.turn,
        dueSeason:s.date.season, dueYear:s.date.year,
        status:'active', defaultKind:'revenue', arrears:0
      };
      economy.loans.push(loan);
      const loanPaid = FB.repayFinanceLoan(s, loan.id, false, economy);

      me.religion = 'norse_pagan';
      p.piety = 100;
      p.prestige = 100;
      const spouse = FB.makeCharacter(s, {
        name:'Runa', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 24, role:'spouse', station:0, traitsN:0
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      const ending = FB.marriageEndStatus(s, spouse);

      return {
        freedomLauncherAvailable:freedomLauncher.shown && freedomLauncher.can,
        freedomBlocked:!freedom.ready,
        loanPaid:loanPaid,
        gold:p.gold,
        zeroCostEnding:ending.cost === 0 && ending.ready,
        techReview:FBDATA.techImpactReviews.features.negative_household_gold.mode
      };
    });

    expect(result).toEqual({
      freedomLauncherAvailable:true,
      freedomBlocked:true,
      loanPaid:false,
      gold:-5,
      zeroCostEnding:true,
      techReview:'none'
    });
    await expect(page.locator('#freedom-purchase-confirm')).toBeDisabled();
    await expect(page.locator('[data-freedom-purchase-status]'))
      .toContainText(/requires/i);
  });

test('the topbar and Coin & Credit explain a negative balance',
  async function ({ page }) {
    const access = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 0;
      s.player.gold = -7.25;
      FB.ui.refresh();
      const finance = FB.instantStatus(s, 'coin_credit');
      return {
        relevant:FB.financeUiRelevant(s),
        shown:finance.shown,
        can:finance.can
      };
    });
    await waitForUiRefresh(page);

    expect(access).toEqual({ relevant:true, shown:true, can:true });
    await expect(page.locator('#tb-gold .mono')).toHaveClass(/op-bad/);
    const topbarBalance = await page.locator('#tb-gold .mono').textContent();
    expect(topbarBalance).toContain(String.fromCharCode(8722));

    await page.locator('#tb-gold').click();
    await expect(page.locator('#gm-body')).toContainText(
      'Cash shortfall: future gold first brings the purse back to zero.');
    await expect(page.locator('#gm-body')).toContainText(
      'This is not a signed loan');
    await page.getByRole('button', { name:'Close', exact:true }).click();

    await page.evaluate(function () { FB.ui.showFinance(); });
    await expect(page.getByRole('heading', {
      name:/Coin & Credit$/
    })).toBeVisible();
    await expect(page.locator('#gm-body')).toContainText('Cash shortfall');
    await expect(page.locator('#gm-body')).toContainText('7 gold below zero');
    await expect(page.locator('#gm-body')).toContainText(
      'It is not a signed loan, accrues no interest');
  });
