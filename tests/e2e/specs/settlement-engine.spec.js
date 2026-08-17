'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/settlement.js',
  'data/settlements.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-file',
    'The generic settlement contract runs once against the primary file target.');
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('weights, ties, land limits, and multi-asset progression are deterministic',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var weightCase = FB.settlement.create({
        assets:[{ id:'weights', kind:'office', land:false }],
        claims:[
          { claimant:'contribution', asset:'weights', basis:{ contribution:1 } },
          { claimant:'vow', asset:'weights', basis:{ vow:1 } },
          { claimant:'occupation', asset:'weights', basis:{ occupation:1 } },
          { claimant:'right', asset:'weights', basis:{ right:1 } },
          { claimant:'support', asset:'weights', basis:{ support:1 } },
          { claimant:'office', asset:'weights', basis:{ office:1 } },
          {
            claimant:'all',
            asset:'weights',
            basis:{
              contribution:1, vow:1, occupation:1,
              right:1, support:1, office:1
            }
          }
        ]
      });
      var weights = {};
      for (var weightIndex = 0;
           weightIndex < weightCase.claims.length; weightIndex++) {
        weights[weightCase.claims[weightIndex].claimant] =
          weightCase.claims[weightIndex].weight;
      }

      var assets = [
        { id:'crown', kind:'crown', land:true },
        { id:'sacred', kind:'sacred', land:false },
        { id:'duchy', kind:'duchy', land:true },
        { id:'county', kind:'county', land:true },
        { id:'office', kind:'office', land:false }
      ];
      var claims = [];
      for (var assetIndex = 0; assetIndex < assets.length; assetIndex++) {
        claims.push({
          claimant:'beta',
          asset:assets[assetIndex].id,
          basis:{ contribution:1 }
        });
        claims.push({
          claimant:'alpha',
          asset:assets[assetIndex].id,
          basis:{ contribution:1 }
        });
      }
      var settlementCase = FB.settlement.create({
        seats:['alpha'],
        assets:assets,
        claims:claims
      });
      var views = [], results = [];
      while (settlementCase.status === 'open') {
        var view = FB.settlement.current(settlementCase);
        views.push({
          asset:view.asset.id,
          claimants:view.claims.map(function (claim) {
            return claim.claimant;
          }),
          leader:view.leader && view.leader.claimant
        });
        results.push(FB.settlement.act(
          FB.state, settlementCase, { kind:'acquiesce' }));
      }
      return {
        weights:weights,
        views:views,
        results:results,
        awards:settlementCase.awards,
        status:settlementCase.status,
        step:settlementCase.step
      };
    });

    expect(result.weights).toEqual({
      contribution:0.25,
      vow:0.20,
      occupation:0.20,
      right:0.15,
      support:0.10,
      office:0.10,
      all:1
    });
    expect(result.views).toEqual([
      { asset:'crown', claimants:['alpha', 'beta'], leader:'alpha' },
      { asset:'sacred', claimants:['alpha', 'beta'], leader:'alpha' },
      { asset:'duchy', claimants:['beta'], leader:'beta' },
      { asset:'county', claimants:[], leader:null },
      { asset:'office', claimants:['alpha', 'beta'], leader:'alpha' }
    ]);
    expect(result.awards.map(function (award) {
      return [award.asset, award.claimant];
    })).toEqual([
      ['crown', 'alpha'],
      ['sacred', 'alpha'],
      ['duchy', 'beta'],
      ['office', 'alpha']
    ]);
    expect(result.status).toBe('resolved');
    expect(result.step).toBe(5);
  });

test('press resolves low, ordinary, and capped odds from saved RNG state',
  async function ({ page }) {
    const rows = await page.evaluate(function () {
      var cases = [
        { name:'low', diplomacy:0, player:0, rival:1, chance:0.10 },
        { name:'ordinary', diplomacy:10, player:0.40, rival:0.50, chance:0.475 },
        { name:'capped', diplomacy:30, player:0.50, rival:0.51, chance:0.85 }
      ];
      var out = [];
      for (var i = 0; i < cases.length; i++) {
        for (var outcomeIndex = 0; outcomeIndex < 2; outcomeIndex++) {
          var row = cases[i];
          var settlementCase = FB.settlement.create({
            assets:[{ id:'land', kind:'county', land:true, rank:1 }],
            claims:[
              {
                claimant:'player',
                asset:'land',
                basis:{ contribution:row.player / 0.25 }
              },
              {
                claimant:'rival',
                asset:'land',
                basis:{ contribution:row.rival / 0.25 }
              }
            ],
            playerDiplomacy:row.diplomacy
          });
          FB.setRngState(outcomeIndex === 0 ? 7 : 4);
          var view = FB.settlement.current(settlementCase);
          var result = FB.settlement.act(
            FB.state, settlementCase, { kind:'press' });
          out.push({
            name:row.name,
            expected:outcomeIndex === 0 ? 'success' : 'failure',
            chance:Number(view.pressChance.toFixed(4)),
            success:result.success,
            winner:result.winner,
            contested:settlementCase.contested
          });
        }
      }
      return out;
    });

    expect(rows).toEqual([
      {
        name:'low', expected:'success', chance:0.10,
        success:true, winner:'player', contested:true
      },
      {
        name:'low', expected:'failure', chance:0.10,
        success:false, winner:'rival', contested:true
      },
      {
        name:'ordinary', expected:'success', chance:0.475,
        success:true, winner:'player', contested:true
      },
      {
        name:'ordinary', expected:'failure', chance:0.475,
        success:false, winner:'rival', contested:true
      },
      {
        name:'capped', expected:'success', chance:0.85,
        success:true, winner:'player', contested:true
      },
      {
        name:'capped', expected:'failure', chance:0.85,
        success:false, winner:'rival', contested:true
      }
    ]);
  });

test('endorsement changes opinion and its next-claim boost is consumed once',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var before = FB.realmOpinionOf(FB.state, 'west_francia');
      var settlementCase = FB.settlement.create({
        assets:[
          { id:'office', kind:'office', land:false },
          { id:'land', kind:'county', land:true }
        ],
        claims:[
          {
            claimant:'west_francia',
            asset:'office',
            basis:{ contribution:1 },
            realmId:'west_francia'
          },
          {
            claimant:'player',
            asset:'land',
            basis:{ contribution:0.50 }
          },
          {
            claimant:'italy',
            asset:'land',
            basis:{ contribution:0.80 },
            realmId:'italy'
          }
        ]
      });
      var first = FB.settlement.act(FB.state, settlementCase, {
        kind:'endorse', claimant:'west_francia'
      });
      var boosted = FB.settlement.current(settlementCase);
      var second = FB.settlement.act(
        FB.state, settlementCase, { kind:'acquiesce' });
      return {
        first:first,
        second:second,
        opinionChange:FB.realmOpinionOf(FB.state, 'west_francia') - before,
        boostOnClaim:boosted.playerClaim.nextClaimBoost,
        effectiveWeight:boosted.playerClaim.effectiveWeight,
        boostAfter:settlementCase.nextClaimBoost,
        awards:settlementCase.awards
      };
    });

    expect(result.opinionChange).toBe(15);
    expect(result.first.winner).toBe('west_francia');
    expect(result.boostOnClaim).toBe(0.10);
    expect(result.effectiveWeight).toBeCloseTo(0.225, 10);
    expect(result.second.winner).toBe('player');
    expect(result.boostAfter).toBe(0);
    expect(result.awards).toHaveLength(2);
  });

test('payment and vassal terms enforce affordability and rank',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      function make(leaderRank, playerRank, assetRank) {
        return FB.settlement.create({
          assets:[{
            id:'land', kind:'county', land:true, rank:assetRank
          }],
          claims:[
            {
              claimant:'player',
              asset:'land',
              realmRank:playerRank,
              basis:{ contribution:0.50 }
            },
            {
              claimant:'west_francia',
              asset:'land',
              realmId:'west_francia',
              realmRank:leaderRank,
              basis:{ contribution:0.80 }
            }
          ]
        });
      }
      var oldGold = FB.state.player.gold;
      var payment = make(1, 1, 1);
      var paymentView = FB.settlement.current(payment);
      FB.state.player.gold = 49;
      var refused = FB.settlement.act(
        FB.state, payment, { kind:'terms' });
      var unchanged = JSON.parse(JSON.stringify(payment));
      FB.state.player.gold = 50;
      var accepted = FB.settlement.act(
        FB.state, payment, { kind:'terms' });
      var afterPayment = FB.state.player.gold;

      var vassal = make(3, 1, 1);
      var vassalView = FB.settlement.current(vassal);
      FB.state.player.gold = 0;
      var vassalAccepted = FB.settlement.act(
        FB.state, vassal, { kind:'terms' });
      FB.state.player.gold = oldGold;
      return {
        paymentTerms:paymentView.terms,
        refused:refused,
        unchanged:unchanged,
        accepted:accepted,
        afterPayment:afterPayment,
        vassalTerms:vassalView.terms,
        vassalAccepted:vassalAccepted
      };
    });

    expect(result.paymentTerms).toEqual({
      kind:'payment', gold:50, cost:50
    });
    expect(result.refused).toBe(false);
    expect(result.unchanged.step).toBe(0);
    expect(result.unchanged.awards).toEqual([]);
    expect(result.accepted.winner).toBe('player');
    expect(result.afterPayment).toBe(0);
    expect(result.vassalTerms).toEqual({
      kind:'vassal', liege:'west_francia', cost:0
    });
    expect(result.vassalAccepted.winner).toBe('player');
  });

test('objections spend standing, change opinion, and honor deterministic rolls',
  async function ({ page }) {
    const rows = await page.evaluate(function () {
      var out = [];
      for (var outcomeIndex = 0; outcomeIndex < 2; outcomeIndex++) {
        var settlementCase = FB.settlement.create({
          assets:[{ id:'office', kind:'office', land:false }],
          claims:[
            {
              claimant:'west_francia',
              asset:'office',
              realmId:'west_francia',
              basis:{ contribution:0.80 }
            },
            {
              claimant:'italy',
              asset:'office',
              realmId:'italy',
              basis:{ contribution:0.60 }
            }
          ],
          playerDiplomacy:10
        });
        var before = FB.realmOpinionOf(FB.state, 'west_francia');
        FB.setRngState(outcomeIndex === 0 ? 7 : 4);
        var chance = FB.settlement.current(settlementCase).objectChance;
        var result = FB.settlement.act(
          FB.state, settlementCase, { kind:'object' });
        out.push({
          chance:Number(chance.toFixed(4)),
          success:result.success,
          winner:result.winner,
          standing:settlementCase.standing,
          objections:settlementCase.objections,
          opinionChange:FB.realmOpinionOf(FB.state, 'west_francia') - before
        });
      }
      return out;
    });

    expect(rows).toEqual([
      {
        chance:0.4125,
        success:true,
        winner:'italy',
        standing:1,
        objections:1,
        opinionChange:-10
      },
      {
        chance:0.4125,
        success:false,
        winner:'west_francia',
        standing:1,
        objections:1,
        opinionChange:-10
      }
    ]);
  });

test('a blessing is eligible once and can change the award',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      function make(playerHead) {
        return FB.settlement.create({
          assets:[{ id:'sacred', kind:'sacred', land:false }],
          claims:[
            {
              claimant:'alpha',
              asset:'sacred',
              basis:{ contribution:0.80 }
            },
            {
              claimant:'beta',
              asset:'sacred',
              basis:{ contribution:0.52 }
            }
          ],
          playerHead:playerHead
        });
      }
      var noOffice = make(false);
      var invalidOffice = FB.settlement.act(
        FB.state, noOffice, { kind:'bless', claimant:'beta' });
      var settlementCase = make(true);
      var before = FB.settlement.current(settlementCase).leader.claimant;
      var invalidSelf = FB.settlement.act(
        FB.state, settlementCase, { kind:'bless', claimant:'player' });
      var blessed = FB.settlement.act(
        FB.state, settlementCase, { kind:'bless', claimant:'beta' });
      var after = FB.settlement.current(settlementCase).leader.claimant;
      var second = FB.settlement.act(
        FB.state, settlementCase, { kind:'bless', claimant:'alpha' });
      var award = FB.settlement.act(
        FB.state, settlementCase, { kind:'acquiesce' });
      return {
        invalidOffice:invalidOffice,
        invalidSelf:invalidSelf,
        blessed:blessed,
        second:second,
        before:before,
        after:after,
        blessing:settlementCase.blessed,
        award:award
      };
    });

    expect(result.invalidOffice).toBe(false);
    expect(result.invalidSelf).toBe(false);
    expect(result.blessed).toEqual({ resolved:false, blessed:true });
    expect(result.second).toBe(false);
    expect(result.before).toBe('alpha');
    expect(result.after).toBe('beta');
    expect(result.blessing).toEqual({
      asset:'sacred', claimant:'beta', amount:0.10
    });
    expect(result.award.winner).toBe('beta');
  });

test('invalid moves are exact no-ops and repair is compatible and idempotent',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var spec = {
        kind:'test',
        seats:['player'],
        assets:[{ id:'land', kind:'county', land:true }],
        claims:[
          {
            claimant:'player',
            asset:'land',
            basis:{ contribution:0.40 }
          },
          {
            claimant:'rival',
            asset:'land',
            basis:{ contribution:0.60 }
          }
        ],
        playerDiplomacy:5
      };
      var settlementCase = FB.settlement.create(spec);
      FB.setRngState(12345);
      var before = JSON.stringify(settlementCase);
      var rngBefore = FB.getRngState();
      var invalid = [
        FB.settlement.act(FB.state, settlementCase, { kind:'unknown' }),
        FB.settlement.act(FB.state, settlementCase, {
          kind:'endorse', claimant:'missing'
        }),
        FB.settlement.act(FB.state, settlementCase, {
          kind:'bless', claimant:'rival'
        })
      ];

      var partial = FB.settlement.create(spec);
      delete partial.standing;
      delete partial.nextClaimBoost;
      delete partial.playerDiplomacy;
      partial.claims[0].weight = NaN;
      var repairedPartial = FB.settlement.repair(partial, spec);
      var once = JSON.stringify(repairedPartial);
      var repairedTwice = FB.settlement.repair(repairedPartial, spec);

      var resolved = FB.settlement.create(spec);
      resolved.step = 99;
      resolved.status = 'open';
      FB.settlement.repair(resolved, spec);

      var malformed = FB.settlement.repair({
        schema:1,
        kind:'test',
        seats:[],
        assets:[{ id:'duplicate', kind:'county' },
          { id:'duplicate', kind:'county' }],
        claims:[],
        awards:[],
        step:0
      }, spec);
      var missing = FB.settlement.repair(null, spec);

      return {
        invalid:invalid,
        exactNoOp:JSON.stringify(settlementCase) === before,
        rngNoOp:FB.getRngState() === rngBefore,
        repairedDefaults:{
          standing:repairedPartial.standing,
          nextClaimBoost:repairedPartial.nextClaimBoost,
          diplomacy:repairedPartial.playerDiplomacy,
          weight:repairedPartial.claims[0].weight
        },
        sameObject:repairedTwice === repairedPartial,
        idempotent:JSON.stringify(repairedTwice) === once,
        resolved:{ step:resolved.step, status:resolved.status },
        malformedIsFresh:malformed.status === 'open' &&
          malformed.assets[0].id === 'land',
        missingIsFresh:missing.status === 'open' &&
          missing.assets[0].id === 'land'
      };
    });

    expect(result.invalid).toEqual([false, false, false]);
    expect(result.exactNoOp).toBe(true);
    expect(result.rngNoOp).toBe(true);
    expect(result.repairedDefaults).toEqual({
      standing:2,
      nextClaimBoost:0,
      diplomacy:5,
      weight:0.10
    });
    expect(result.sameObject).toBe(true);
    expect(result.idempotent).toBe(true);
    expect(result.resolved).toEqual({ step:1, status:'resolved' });
    expect(result.malformedIsFresh).toBe(true);
    expect(result.missingIsFresh).toBe(true);
  });
