'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/holywar.js',
  'js/world.js',
  'data/events_world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectHolyWarHarness } = require('../support/game/holywar-harness');

test.beforeEach(async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-file',
    'The holy-war adapter matrix runs once against the primary file target.');
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await injectHolyWarHarness(page);
});

test('only an attacker victory opens a council and asset discovery follows de jure rules',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function assets(captured) {
        reset();
        var resolved = FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerContribution:10,
          capturedCounties:captured
        });
        return resolved.campaign.settlement.case.assets.map(function (asset) {
          return {
            id:asset.id,
            kind:asset.kind,
            rank:asset.rank,
            seat:asset.seat || null,
            awardIds:asset.awardIds
          };
        });
      }

      reset();
      var ownerBefore = FB.state.owner.jerusalem;
      var defenderCampaign = FBTEST.makeGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem']
      });
      var defenderResult = FB.resolveGreatHolyWar(
        FB.state, 'defenders', 'test');
      var defenderHistory = FB.state.greatHolyWarHistory.campaigns.slice(-1)[0];

      return {
        defender:{
          result:defenderResult,
          settlement:defenderCampaign.settlement,
          active:FB.state.greatHolyWar,
          history:defenderHistory.outcome,
          ownershipUnchanged:FB.state.owner.jerusalem === ownerBefore
        },
        county:assets(['acre']),
        duchy:assets(['damascus', 'homs']),
        partition:assets(['jerusalem', 'acre', 'damascus', 'homs']),
        kingdom:assets([
          'jerusalem', 'acre', 'damascus', 'homs', 'aleppo'
        ])
      };
    });

    expect(result.defender).toEqual({
      result:true,
      settlement:null,
      active:null,
      history:'defenders',
      ownershipUnchanged:true
    });
    expect(result.county).toEqual([
      {
        id:'crown', kind:'crown', rank:1,
        seat:'acre', awardIds:['acre']
      }
    ]);
    expect(result.duchy[0]).toMatchObject({
      id:'crown', kind:'crown', rank:2,
      seat:'damascus', awardIds:['damascus']
    });
    expect(result.partition).toEqual([
      {
        id:'crown', kind:'crown', rank:2,
        seat:'jerusalem', awardIds:['jerusalem']
      },
      {
        id:'sacred', kind:'sacred', rank:0,
        seat:null, awardIds:[]
      },
      {
        id:'duchy:d_damascus', kind:'duchy', rank:2,
        seat:null, awardIds:['damascus', 'homs']
      },
      {
        id:'county:acre', kind:'county', rank:1,
        seat:null, awardIds:['acre']
      }
    ]);
    expect(result.kingdom[0]).toMatchObject({
      id:'crown',
      kind:'crown',
      rank:3,
      seat:'jerusalem',
      awardIds:['jerusalem']
    });
    expect(result.kingdom.some(function (asset) {
      return asset.id === 'sacred';
    })).toBe(true);
  });

test('local intact rulers are confirmed and split holdings produce boundary cadets',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function localClaim(extraCounties) {
        reset();
        FBTEST.setLocalHolder('c_acre', ['acre'], extraCounties);
        var resolved = FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerContribution:5,
          capturedCounties:['jerusalem', 'acre']
        });
        var settlementCase = resolved.campaign.settlement.case;
        var claim = settlementCase.claims.filter(function (candidate) {
          return candidate.asset === 'county:acre' &&
            (candidate.claimant === 'c_acre' ||
              candidate.claimant.indexOf('local:c_acre:') === 0);
        })[0];
        return {
          claimant:claim.claimant,
          confirmation:claim.confirmation,
          localCadet:claim.localCadet,
          sourceRealm:claim.sourceRealm,
          right:claim.basis.right
        };
      }
      return {
        intact:localClaim([]),
        split:localClaim(['homs'])
      };
    });

    expect(result.intact).toEqual({
      claimant:'c_acre',
      confirmation:true,
      localCadet:false,
      sourceRealm:null,
      right:1
    });
    expect(result.split).toEqual({
      claimant:'local:c_acre:county:acre',
      confirmation:false,
      localCadet:true,
      sourceRealm:'c_acre',
      right:0.5
    });
  });

test('claim bases include service, vow, occupation, right, support, office, and traits',
  async function ({ page }) {
    const basis = await page.evaluate(function () {
      var character = FB.state.chars[FB.state.player.charId];
      FBDATA.traits.test_vow_claim = {
        name:'Test vow claim',
        vow:{ claim:0.25 }
      };
      character.traits = ['test_vow_claim'];
      character.culture = 'arabic';
      FB.state.player.piety = 500;
      FB.state.player.fabricatedClaim = 'acre';
      var resolved = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:50,
        playerDesire:{ kind:'duchy', id:'d_jerusalem' },
        attackers:[{
          realm:'west_francia',
          contribution:50,
          desire:{ kind:'crown', id:null }
        }],
        capturedCounties:['jerusalem', 'acre'],
        occupiedBy:{ jerusalem:'west_francia', acre:'player' }
      });
      var claim = resolved.campaign.settlement.case.claims.filter(
        function (candidate) {
          return candidate.asset === 'county:acre' &&
            candidate.claimant === 'player';
        })[0];
      delete FBDATA.traits.test_vow_claim;
      return claim.basis;
    });

    expect(basis).toEqual({
      contribution:0.5,
      vow:0.9375,
      occupation:1,
      right:1,
      support:0.5,
      office:1
    });
  });

test('AI heads pre-bless sacred claims while a player head chooses explicitly',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }

      reset();
      var automatic = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        capturedCounties:['jerusalem', 'acre']
      }).campaign.settlement.case;

      reset();
      var manualCampaign = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerHead:true,
        playerContribution:10,
        capturedCounties:['jerusalem', 'acre']
      }).campaign;
      var manualCase = manualCampaign.settlement.case;
      while (manualCase.status === 'open' &&
          FB.settlement.current(manualCase).asset.id !== 'sacred') {
        FB.greatHolyWarSettlementMove(
          FB.state, { kind:'acquiesce' });
      }
      var sacredView = FB.settlement.current(manualCase);
      var target = sacredView.claims.filter(function (claim) {
        return claim.claimant !== 'player';
      })[0].claimant;
      var blessed = FB.greatHolyWarSettlementMove(
        FB.state, { kind:'bless', claimant:target });
      return {
        automatic:{
          playerHead:automatic.playerHead,
          used:automatic.blessingUsed,
          asset:automatic.blessed.asset,
          automatic:automatic.blessed.automatic
        },
        manual:{
          playerHead:manualCase.playerHead,
          beforeUsed:false,
          result:blessed,
          used:manualCase.blessingUsed,
          claimant:manualCase.blessed.claimant,
          automatic:!!manualCase.blessed.automatic
        }
      };
    });

    expect(result.automatic).toEqual({
      playerHead:false,
      used:true,
      asset:'sacred',
      automatic:true
    });
    expect(result.manual).toEqual({
      playerHead:true,
      beforeUsed:false,
      result:{ resolved:false, blessed:true },
      used:true,
      claimant:result.manual.claimant,
      automatic:false
    });
    expect(result.manual.claimant).not.toBe('player');
  });

test('AI awards create a realm hierarchy, cover residual land, attach custody, and apply once',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var captured = [
        'jerusalem', 'acre', 'damascus', 'homs', 'aleppo'
      ];
      var beforeHistory = FB.state.greatHolyWarHistory &&
        Array.isArray(FB.state.greatHolyWarHistory.campaigns)
        ? FB.state.greatHolyWarHistory.campaigns.length : 0;
      var resolved = FBTEST.resolveGreatHolyWar({
        includePlayer:false,
        attackers:[{
          realm:'west_francia',
          contribution:70,
          desire:{ kind:'crown', id:null }
        }, {
          realm:'italy',
          contribution:30,
          desire:{ kind:'duchy', id:'d_damascus' }
        }],
        capturedCounties:captured
      });
      var campaign = resolved.campaign;
      var settlement = campaign.settlement;
      var history = FB.state.greatHolyWarHistory.campaigns.slice(-1)[0];
      var mainId = settlement.mainRealmId;
      var created = Object.keys(FB.state.realms).filter(function (rid) {
        return FB.state.realms[rid] &&
          (FB.state.realms[rid].sponsorRealm === 'west_francia' ||
            FB.state.realms[rid].sponsorRealm === 'italy');
      }).map(function (rid) {
        var realm = FB.state.realms[rid];
        return {
          id:rid,
          liege:realm.liege,
          rank:realm.rank,
          custody:realm.sacredCustody || null
        };
      });
      var ownership = captured.map(function (pid) {
        return {
          pid:pid,
          owner:FB.state.owner[pid],
          holder:FB.state.holder[pid]
        };
      });
      var secondResolve = FB.resolveGreatHolyWar(
        FB.state, 'attackers', 'again');
      return {
        active:FB.state.greatHolyWar,
        beforeHistory:beforeHistory,
        historyCount:FB.state.greatHolyWarHistory.campaigns.length,
        history:history,
        mainId:mainId,
        applied:settlement.applied,
        created:created,
        ownership:ownership,
        secondResolve:secondResolve
      };
    });

    expect(result.active).toBeNull();
    expect(result.historyCount).toBe(result.beforeHistory + 1);
    expect(result.history.outcome).toBe('attackers');
    expect(result.history.awards[0]).toMatchObject({
      asset:'crown',
      kind:'crown',
      claimant:'west_francia'
    });
    expect(result.applied).toBe(true);
    expect(result.created.length).toBeGreaterThanOrEqual(2);
    expect(result.created.some(function (realm) {
      return realm.id === result.mainId && realm.rank === 3;
    })).toBe(true);
    expect(result.created.some(function (realm) {
      return realm.custody &&
        realm.custody.siteIds.indexOf('jerusalem') >= 0;
    })).toBe(true);
    expect(result.created.some(function (realm) {
      return realm.liege === result.mainId && realm.rank === 2;
    })).toBe(true);
    for (const row of result.ownership) {
      expect(row.owner).toBe(result.mainId);
      expect(result.created.some(function (realm) {
        return realm.id === row.holder;
      })).toBe(true);
    }
    expect(result.ownership.filter(function (row) {
      return row.pid === 'acre' || row.pid === 'aleppo';
    }).every(function (row) {
      return row.holder === result.mainId;
    })).toBe(true);
    expect(result.secondResolve).toBe(false);
  });

test('local confirmation reparents the ruler and split holdings create a local cadet',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function finishLocal(extraCounties) {
        reset();
        FBTEST.setLocalHolder('c_acre', ['acre'], extraCounties);
        var campaign = FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerContribution:0,
          attackers:[{
            realm:'west_francia',
            contribution:100,
            desire:{ kind:'crown', id:null }
          }],
          capturedCounties:['jerusalem', 'acre']
        }).campaign;
        var settlementCase = campaign.settlement.case;
        var localClaimant = null;
        while (FB.state.greatHolyWar && settlementCase.status === 'open') {
          var view = FB.settlement.current(settlementCase);
          if (view.asset.id === 'county:acre') {
            for (var i = 0; i < view.claims.length; i++) {
              if (view.claims[i].claimant === 'c_acre' ||
                  view.claims[i].claimant.indexOf('local:c_acre:') === 0) {
                localClaimant = view.claims[i].claimant;
                break;
              }
            }
            FB.greatHolyWarSettlementMove(FB.state, {
              kind:'endorse',
              claimant:localClaimant
            });
          } else {
            FB.greatHolyWarSettlementMove(
              FB.state, { kind:'acquiesce' });
          }
        }
        var holder = FB.state.holder.acre;
        return {
          claimant:localClaimant,
          holder:holder,
          holderLiege:FB.state.realms[holder].liege,
          holderSponsor:FB.state.realms[holder].sponsorRealm || null,
          sourceAlive:FB.state.realms.c_acre.alive,
          sourceStillHoldsHoms:FB.state.holder.homs === 'c_acre',
          history:FB.state.greatHolyWarHistory.campaigns.slice(-1)[0]
        };
      }
      return {
        intact:finishLocal([]),
        split:finishLocal(['homs'])
      };
    });

    expect(result.intact.claimant).toBe('c_acre');
    expect(result.intact.holder).toBe('c_acre');
    expect(result.intact.holderLiege).toBeTruthy();
    expect(result.intact.holderSponsor).toBeNull();
    expect(result.intact.sourceAlive).toBe(true);

    expect(result.split.claimant).toBe('local:c_acre:county:acre');
    expect(result.split.holder).not.toBe('c_acre');
    expect(result.split.holderLiege).toBeTruthy();
    expect(result.split.holderSponsor).toBe('c_acre');
    expect(result.split.sourceAlive).toBe(true);
    expect(result.split.sourceStillHoldsHoms).toBe(true);
  });

test('personal crown grants support accept and refusal with completed history',
  async function ({ page }) {
    const rows = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function run(accept) {
        reset();
        var piety = FB.state.player.piety;
        var prestige = FB.state.player.prestige;
        var campaign = FBTEST.resolveGreatHolyWar({
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
        }).campaign;
        FB.greatHolyWarSettlementMove(
          FB.state, { kind:'acquiesce' });
        var pending = JSON.parse(JSON.stringify(
          campaign.settlement.pendingPlayer));
        var choice = FB.greatHolyWarSettlementChoice(FB.state, accept);
        var history = FB.state.greatHolyWarHistory.campaigns.slice(-1)[0];
        return {
          accept:accept,
          pending:pending,
          choice:choice,
          owner:FB.state.owner.acre,
          holder:FB.state.holder.acre,
          playerTier:FB.state.player.tier,
          pietyGain:FB.state.player.piety - piety,
          prestigeGain:FB.state.player.prestige - prestige,
          history:history,
          active:FB.state.greatHolyWar
        };
      }
      return [run(true), run(false)];
    });

    expect(rows[0].pending).toMatchObject({
      sovereign:true,
      kind:'county',
      counties:['acre']
    });
    expect(rows[0].choice).toBe(true);
    expect(rows[0].owner).toBe('player');
    expect(rows[0].holder).toBe('player');
    expect(rows[0].playerTier).toBeGreaterThanOrEqual(4);
    expect(rows[0].active).toBeNull();
    expect(rows[0].history.awards[0].claimant).toBe('player');

    expect(rows[1].choice).toBe(true);
    expect(rows[1].owner).not.toBe('player');
    expect(rows[1].holder).not.toBe('player');
    expect(rows[1].pietyGain).toBeGreaterThan(0);
    expect(rows[1].prestigeGain).toBeGreaterThan(0);
    expect(rows[1].active).toBeNull();
  });

test('secondary grants cover vassal and sovereign players plus beneficiary fallback',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var saved = JSON.parse(FB.save.serialize());
      function reset() {
        FB.save.restore(JSON.parse(JSON.stringify(saved)));
        FB.game.observe = false;
      }
      function secondary(sovereign) {
        reset();
        var oldProvince = FB.state.player.provinceId;
        FB.state.player.fabricatedClaim = 'acre';
        var campaign = FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerSovereign:sovereign,
          playerContribution:20,
          playerDesire:{ kind:'county', id:'acre' },
          attackers:[{
            realm:'west_francia',
            contribution:100,
            desire:{ kind:'crown', id:null }
          }],
          capturedCounties:['jerusalem', 'acre'],
          occupiedBy:{ jerusalem:'west_francia', acre:'player' }
        }).campaign;
        var settlementCase = campaign.settlement.case;
        while (settlementCase.status === 'open') {
          FB.greatHolyWarSettlementMove(
            FB.state, { kind:'acquiesce' });
        }
        var pending = JSON.parse(JSON.stringify(
          campaign.settlement.pendingPlayer));
        FB.greatHolyWarSettlementChoice(FB.state, true);
        return {
          sovereign:sovereign,
          pending:pending,
          owner:FB.state.owner.acre,
          holder:FB.state.holder.acre,
          liege:FB.state.player.liege,
          oldProvince:oldProvince,
          oldProvinceStillHeld:FB.state.player.provs.indexOf(oldProvince) >= 0
        };
      }

      reset();
      var invalidCampaign = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:20,
        playerDesire:{ kind:'county', id:'acre' },
        beneficiary:'missing-character',
        attackers:[{
          realm:'west_francia',
          contribution:100,
          desire:{ kind:'crown', id:null }
        }],
        capturedCounties:['jerusalem', 'acre'],
        occupiedBy:{ jerusalem:'west_francia', acre:'player' }
      }).campaign;
      var invalidClaim = invalidCampaign.settlement.case.claims.filter(
        function (claim) {
          return claim.asset === 'county:acre' &&
            claim.claimant === 'player';
        })[0];

      reset();
      var beneficiaryRows = FB.greatHolyWarVowBeneficiaries(FB.state);
      var beneficiary = beneficiaryRows.length
        ? beneficiaryRows[0].c.id : null;
      var valid = null;
      if (beneficiary) {
        FB.state.player.fabricatedClaim = 'acre';
        var validCampaign = FBTEST.resolveGreatHolyWar({
          includePlayer:true,
          playerContribution:20,
          playerDesire:{ kind:'county', id:'acre' },
          beneficiary:beneficiary,
          attackers:[{
            realm:'west_francia',
            contribution:100,
            desire:{ kind:'crown', id:null }
          }],
          capturedCounties:['jerusalem', 'acre'],
          occupiedBy:{ jerusalem:'west_francia', acre:'player' }
        }).campaign;
        var validCase = validCampaign.settlement.case;
        while (validCase.status === 'open') {
          FB.greatHolyWarSettlementMove(
            FB.state, { kind:'acquiesce' });
        }
        var history = FB.state.greatHolyWarHistory.campaigns.slice(-1)[0];
        valid = {
          beneficiary:beneficiary,
          pending:validCampaign.settlement.pendingPlayer,
          award:history.awards.filter(function (award) {
            return award.asset === 'county:acre';
          })[0],
          holder:FB.state.holder.acre,
          ruler:(FB.realmRulerCharacter(
            FB.state, FB.state.holder.acre) || {}).id || null
        };
      }
      return {
        vassal:secondary(false),
        sovereign:secondary(true),
        invalidBeneficiary:invalidClaim.beneficiary,
        valid:valid
      };
    });

    expect(result.vassal.pending).toMatchObject({
      sovereign:false,
      kind:'county',
      counties:['acre']
    });
    expect(result.vassal.holder).toBe('player');
    expect(result.vassal.owner).toBe(result.vassal.liege);
    expect(result.vassal.oldProvinceStillHeld).toBe(false);

    expect(result.sovereign.pending).toMatchObject({
      sovereign:false,
      kind:'county',
      counties:['acre']
    });
    expect(result.sovereign.holder).toBe('player');
    expect(result.sovereign.owner).toBe('player');
    expect(result.sovereign.oldProvinceStillHeld).toBe(true);

    expect(result.invalidBeneficiary).toBeNull();
    expect(result.valid).not.toBeNull();
    expect(result.valid.pending).toBeNull();
    expect(result.valid.award.beneficiary).toBe(result.valid.beneficiary);
    expect(result.valid.holder).not.toBe('player');
    expect(result.valid.ruler).toBe(result.valid.beneficiary);
  });

test('sacred custody under the player grants its seasonal effect',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var campaign = FBTEST.resolveGreatHolyWar({
        includePlayer:true,
        playerContribution:100,
        playerDesire:{ kind:'crown', id:null },
        attackers:[{
          realm:'west_francia',
          contribution:0,
          desire:{ kind:'honor', id:null }
        }],
        capturedCounties:['jerusalem', 'acre'],
        defaultOccupiedBy:'player'
      }).campaign;
      var settlementCase = campaign.settlement.case;
      while (settlementCase.status === 'open') {
        FB.greatHolyWarSettlementMove(
          FB.state, { kind:'acquiesce' });
      }
      FB.greatHolyWarSettlementChoice(FB.state, true);
      var before = FB.state.player.piety;
      var gain = FB.sacredCustodySeason(FB.state);
      return {
        gain:gain,
        pietyChange:FB.state.player.piety - before,
        custody:FB.state.realms.player.sacredCustody
      };
    });

    expect(result.gain).toBe(2);
    expect(result.pietyChange).toBe(2);
    expect(result.custody).toMatchObject({
      religion:'catholic',
      siteIds:['jerusalem'],
      campaignId:'ghw_test'
    });
  });
