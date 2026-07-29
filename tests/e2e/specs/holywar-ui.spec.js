'use strict';

const { test, expect } = require('../support/fixture');
const {
  injectHolyWarHarness,
  openGame,
  startDeterministicGame
} = require('../support/game');

async function restoreBaseline(page, baseline) {
  await page.evaluate(function (serialized) {
    FB.save.restore(JSON.parse(serialized));
    FB.game.observe = false;
    FB.game.setPaused(true);
    document.getElementById('genmodal').classList.add('hidden');
  }, baseline);
}

async function showScenario(page, baseline, mode, seed) {
  await restoreBaseline(page, baseline);
  await page.evaluate(function (setup) {
    var options = {
      includePlayer:true,
      playerContribution:10,
      attackers:[
        {
          realm:'west_francia',
          contribution:60,
          desire:{ kind:'crown', id:null }
        },
        {
          realm:'italy',
          contribution:30,
          desire:{ kind:'honor', id:null }
        }
      ],
      capturedCounties:['acre'],
      defaultOccupiedBy:'west_francia'
    };
    if (setup.mode === 'endorse') {
      options.capturedCounties = ['jerusalem', 'acre'];
    }
    if (setup.mode === 'bless') options.playerHead = true;
    var campaign = FBTEST.resolveGreatHolyWar(options).campaign;
    window.__FBTEST_CAMPAIGN = campaign;
    var settlementCase = campaign.settlement.case;
    var view = FB.settlement.current(settlementCase);
    function setClaim(claimant, weight, rank) {
      for (var i = 0; i < settlementCase.claims.length; i++) {
        var claim = settlementCase.claims[i];
        if (claim.asset !== view.asset.id || claim.claimant !== claimant) continue;
        claim.weight = weight;
        if (rank !== undefined) claim.realmRank = rank;
      }
    }
    if (setup.mode === 'press') {
      setClaim('west_francia', 0.30);
      setClaim('player', 0.20);
      setClaim('italy', 0.10);
      settlementCase.playerDiplomacy = 0;
    } else if (setup.mode === 'object') {
      setClaim('west_francia', 0.30);
      setClaim('italy', 0.20);
      setClaim('player', 0.10);
      settlementCase.playerDiplomacy = 0;
    } else if (setup.mode === 'terms') {
      setClaim('west_francia', 0.20, 1);
      setClaim('player', 0.10, 0);
      setClaim('italy', 0.05, 1);
      settlementCase.assets[0].rank = 1;
      FB.state.player.gold = 50;
    }
    if (setup.mode !== 'bless') {
      for (var claimIndex = 0;
           claimIndex < settlementCase.claims.length; claimIndex++) {
        settlementCase.claims[claimIndex].blessing = 0;
      }
    }
    if (setup.seed !== null) FB.setRngState(setup.seed);
    FB.ui.showGreatHolyWarSettlement();
  }, { mode:mode, seed:seed === undefined ? null : seed });
  await expect(page.locator('#genmodal:not(.hidden)')).toBeVisible();
}

test.beforeEach(async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-file',
    'The full council UI journey matrix runs once against Chromium file mode.');
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await injectHolyWarHarness(page);
});

test('the council explains claims, previews moves, and records prior awards',
  async function ({ page }) {
    await page.evaluate(function () {
      FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:10,
        capturedCounties:['jerusalem', 'acre']
      });
      FB.ui.showGreatHolyWarSettlement();
    });

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByRole('heading', {
      name:/Settlement council/
    })).toBeVisible();
    await expect(dialog.getByText('Current asset', { exact:true })).toBeVisible();
    await expect(dialog.getByText('Council standing', { exact:true })).toBeVisible();
    await expect(dialog.getByText('Ordered claims', { exact:true })).toBeVisible();
    await expect(dialog.getByText(/Contribution .* vow .* occupation/).first())
      .toBeVisible();
    await expect(dialog.getByRole('button', { name:/Acquiesce/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name:/Press your claim/ }))
      .toBeVisible();
    await expect(dialog.getByRole('button', { name:/Endorse/ }).first())
      .toBeVisible();
    await expect(dialog.getByRole('button', { name:/Object/ })).toBeVisible();
    await expect(dialog.getByText('No awards have yet been settled.'))
      .toBeVisible();

    await dialog.getByRole('button', { name:/Acquiesce/ }).click();
    await expect(dialog.getByText('Prior awards', { exact:true })).toBeVisible();
    await expect(dialog.getByText('Sovereign duchy', { exact:true }))
      .toBeVisible();
    expect(await page.evaluate(function () {
      var settlementCase = FB.state.greatHolyWar.settlement.case;
      return {
        step:settlementCase.step,
        awards:settlementCase.awards.length,
        move:settlementCase.awards[0].move
      };
    })).toEqual({ step:1, awards:1, move:'acquiesce' });
  });

test('press and object buttons expose deterministic success and failure journeys',
  async function ({ page }) {
    const baseline = await page.evaluate(function () {
      return FB.save.serialize();
    });
    const cases = [
      {
        mode:'press', seed:7, button:/Press your claim/,
        winner:'player', success:true
      },
      {
        mode:'press', seed:4, button:/Press your claim/,
        winner:'west_francia', success:false
      },
      {
        mode:'object', seed:7, button:/Object/,
        winner:'italy', success:true
      },
      {
        mode:'object', seed:4, button:/Object/,
        winner:'west_francia', success:false
      }
    ];

    for (const row of cases) {
      await showScenario(page, baseline, row.mode, row.seed);
      await page.getByRole('dialog').getByRole(
        'button', { name:row.button }).click();
      const outcome = await page.evaluate(function () {
        var settlementCase = window.__FBTEST_CAMPAIGN.settlement.case;
        return {
          winner:settlementCase.awards[0].claimant,
          contested:settlementCase.contested,
          objections:settlementCase.objections
        };
      });
      expect(outcome.winner, row.mode + ' winner').toBe(row.winner);
      expect(outcome.contested).toBe(true);
      expect(outcome.objections).toBe(row.mode === 'object' ? 1 : 0);
    }
  });

test('endorsement, payment, and blessing controls apply their visible promises',
  async function ({ page }) {
    const baseline = await page.evaluate(function () {
      return FB.save.serialize();
    });

    await showScenario(page, baseline, 'endorse');
    const beforeOpinion = await page.evaluate(function () {
      return FB.realmOpinionOf(FB.state, 'west_francia');
    });
    await page.locator(
      '[data-ghw-council-move="endorse"][data-ghw-council-claimant="west_francia"]'
    ).click();
    await expect(page.getByRole('dialog').getByText(
      /\+0\.10 waiting for your next eligible claim/)).toBeVisible();
    const endorsed = await page.evaluate(function () {
      var settlementCase = window.__FBTEST_CAMPAIGN.settlement.case;
      return {
        opinion:FB.realmOpinionOf(FB.state, 'west_francia'),
        winner:settlementCase.awards[0].claimant
      };
    });
    expect(endorsed.opinion - beforeOpinion).toBe(15);
    expect(endorsed.winner).toBe('west_francia');

    await showScenario(page, baseline, 'terms');
    await expect(page.locator('[data-ghw-council-move="terms"]'))
      .toContainText('guarantee it for');
    await page.locator('[data-ghw-council-move="terms"]').click();
    const paid = await page.evaluate(function () {
      var settlementCase = window.__FBTEST_CAMPAIGN.settlement.case;
      return {
        gold:FB.state.player.gold,
        award:settlementCase.awards[0]
      };
    });
    expect(paid.gold).toBe(0);
    expect(paid.award).toMatchObject({
      claimant:'player',
      terms:{ kind:'payment', gold:50, cost:50 }
    });

    await showScenario(page, baseline, 'bless');
    const blessButton = page.locator('[data-ghw-council-move="bless"]').first();
    const blessedClaimant = await blessButton.getAttribute(
      'data-ghw-council-claimant');
    await expect(blessButton).toContainText('+0.10');
    await blessButton.click();
    expect(await page.evaluate(function () {
      var settlementCase = FB.state.greatHolyWar.settlement.case;
      return {
        step:settlementCase.step,
        used:settlementCase.blessingUsed,
        claimant:settlementCase.blessed.claimant
      };
    })).toEqual({
      step:0,
      used:true,
      claimant:blessedClaimant
    });
  });

test('personal award accept and refusal complete the Chronicle path',
  async function ({ page }) {
    const baseline = await page.evaluate(function () {
      return FB.save.serialize();
    });
    for (const accept of [true, false]) {
      await restoreBaseline(page, baseline);
      await page.evaluate(function () {
        FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerContribution:100,
          playerDesire:{ kind:'crown', id:null },
          attackers:[{
            realm:'west_francia',
            contribution:0,
            desire:{ kind:'honor', id:null }
          }],
          capturedCounties:['acre'],
          defaultOccupiedBy:'player'
        });
        FB.ui.showGreatHolyWarSettlement();
      });
      await page.getByRole('dialog').getByRole(
        'button', { name:/Acquiesce/ }).click();
      await expect(page.getByRole('heading', {
        name:/final settlement/
      })).toBeVisible();
      await expect(page.getByRole('dialog').getByText(
        /The council offers you/)).toBeVisible();
      const choice = accept
        ? page.getByRole('button', { name:/Accept the territorial grant/ })
        : page.getByRole('button', { name:/Decline for honor/ });
      await choice.click();
      await expect(page.getByRole('heading', {
        name:'The settlement concluded'
      })).toBeVisible();
      await expect(page.getByRole('dialog').getByText(
        /every award now takes effect/)).toBeVisible();
      await page.getByRole('button', { name:'Close', exact:true }).click();

      const outcome = await page.evaluate(function () {
        var history = FB.state.greatHolyWarHistory.campaigns.slice(-1)[0];
        return {
          active:FB.state.greatHolyWar,
          history:history,
          holder:FB.state.holder.acre,
          log:JSON.stringify(FB.state.log.slice(-3))
        };
      });
      expect(outcome.active).toBeNull();
      expect(outcome.history.outcome).toBe('attackers');
      expect(outcome.history.awards[0].claimant).toBe('player');
      expect(outcome.log).toContain('victory_partitioned');
      expect(outcome.holder === 'player').toBe(accept);
    }
  });
