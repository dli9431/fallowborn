'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('hostile targets stay in scope and method previews use the named math',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      me.traits = [];
      me.skills.int = 10;
      me.skills.mar = 6;
      const home = FB.world.byId[s.player.provinceId];
      const target = FB.makeCharacter(s, {
        name:'Exact Target', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 30,
        station:3, traitsN:0
      });
      target.traits = [];
      target.skills.int = 4;
      target.opinion = 0;
      const outsidePid = Object.keys(s.owner).filter(function (pid) {
        return FB.topRealm(s, s.owner[pid]) !== FB.playerRealmId(s);
      })[0];
      const outside = FB.makeCharacter(s, {
        name:'Foreign Target', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 30,
        station:2, traitsN:0, homeProvinceId:outsidePid
      });
      outside.homeProvinceId = outsidePid;
      const targets = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination);
      const exact = targets.filter(function (option) {
        return option.characterId === target.id;
      })[0];
      const careful = FB.intriguePreview(s, 'assassination', exact.context,
        'careful');
      const bought = FB.intriguePreview(s, 'assassination', exact.context,
        'bought');
      const forceful = FB.intriguePreview(s, 'assassination', exact.context,
        'forceful');
      const sabotage = FB.intrigueTargetOptions(s, FBDATA.plots.sabotage);
      return {
        hostileIds:[
          'assassination', 'abduction', 'blackmail',
          'fabricated_charge', 'sabotage'
        ].filter(function (id) { return !!FBDATA.plots[id].hostile; }),
        needs:[
          FBDATA.plots.assassination.need,
          FBDATA.plots.abduction.need,
          FBDATA.plots.blackmail.need,
          FBDATA.plots.fabricated_charge.need,
          FBDATA.plots.sabotage.need
        ],
        includesExact:!!exact,
        includesForeign:targets.some(function (option) {
          return option.characterId === outside.id;
        }),
        carefulSuccess:careful.success,
        expectedCareful:FB.clamp(0.20 + me.skills.int * 0.035 -
          target.skills.int * 0.02 + FB.standingOf(s, {
            kind:'character', id:target.id
          }) / 500 + 0.10, 0.05, 0.90),
        carefulExposure:careful.exposure,
        boughtCost:bought.cost,
        forcefulFaster:forceful.days < careful.days,
        ownSabotage:sabotage.some(function (option) {
          return option.group === 'realm';
        }),
        borderSabotage:sabotage.some(function (option) {
          return option.group === 'foreign';
        }),
        widowHidden:FBDATA.plots.widow_veil.hidden,
        plotSlots:Object.keys(s.player).filter(function (key) {
          return key === 'plot' || key === 'plots';
        })
      };
    });

    expect(result.hostileIds).toEqual([
      'assassination', 'abduction', 'blackmail',
      'fabricated_charge', 'sabotage'
    ]);
    expect(result.needs).toEqual([16, 14, 12, 14, 10]);
    expect(result.includesExact).toBe(true);
    expect(result.includesForeign).toBe(false);
    expect(result.carefulSuccess).toBeCloseTo(result.expectedCareful, 8);
    expect(result.carefulExposure).toBe(8);
    expect(result.boughtCost).toBe(20);
    expect(result.forcefulFaster).toBe(true);
    expect(result.ownSabotage).toBe(true);
    expect(result.borderSabotage).toBe(true);
    expect(result.widowHidden).toBe(true);
    expect(result.plotSlots).toEqual(['plot']);
  });

test('accomplice consent, secret refusal, and leaks are seeded and exact',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      me.traits = [];
      me.skills.int = 8;
      s.player.gold = 100;
      const target = FB.makeCharacter(s, {
        name:'Marked Person', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 30,
        station:2, traitsN:0
      });
      target.traits = [];
      const accomplice = FB.makeCharacter(s, {
        name:'Possible Accomplice', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 28,
        station:1, traitsN:0
      });
      accomplice.traits = ['deceitful'];
      accomplice.skills.int = 7;
      accomplice.opinion = 20;
      const context = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination).filter(function (option) {
          return option.characterId === target.id;
        })[0].context;
      const unpaid = FB.intrigueAccompliceOptions(s, 'assassination',
        context, false).filter(function (option) {
          return option.characterId === accomplice.id;
        })[0];
      const paid = FB.intrigueAccompliceOptions(s, 'assassination',
        context, true).filter(function (option) {
          return option.characterId === accomplice.id;
        })[0];
      const originalChance = FB.chance;
      let rolls = [true];
      FB.chance = function () { return rolls.shift(); };
      const accepted = FB.beginIntriguePlot(s, 'assassination', context,
        'careful', accomplice.id, true);
      const acceptedId = s.player.plot &&
        s.player.plot.accomplice.characterId;
      FB.abandonIntriguePlot(s);

      rolls = [false, false];
      const silent = FB.beginIntriguePlot(s, 'assassination', context,
        'careful', accomplice.id, false);
      const proceedsAlone = !!s.player.plot && !s.player.plot.accomplice;
      FB.abandonIntriguePlot(s);

      rolls = [false, true, false];
      const leaked = FB.beginIntriguePlot(s, 'assassination', context,
        'careful', accomplice.id, false);
      FB.chance = originalChance;
      return {
        acceptance:unpaid.acceptance,
        paidAcceptance:paid.acceptance,
        leak:unpaid.leak,
        accepted:accepted,
        acceptedId:acceptedId,
        silent:silent,
        proceedsAlone:proceedsAlone,
        leaked:leaked,
        plotAfterLeak:s.player.plot,
        hearingEvidence:s.intrigue.hearing && s.intrigue.hearing.evidence
      };
    });

    expect(result.paidAcceptance - result.acceptance).toBeCloseTo(0.20, 8);
    expect(result.leak).toBeGreaterThanOrEqual(0.05);
    expect(result.accepted).toBe(true);
    expect(result.acceptedId).toBeTruthy();
    expect(result.silent).toBe(true);
    expect(result.proceedsAlone).toBe(true);
    expect(result.leaked).toBe(false);
    expect(result.plotAfterLeak).toBeNull();
    expect(['testimony', 'material']).toContain(result.hearingEvidence);
  });

test('hostile plots survive save restore and never retarget after invalidation',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      let s = FB.state;
      const home = FB.world.byId[s.player.provinceId];
      const first = FB.makeCharacter(s, {
        name:'First Exact Target', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 34,
        station:2, traitsN:0
      });
      const second = FB.makeCharacter(s, {
        name:'Second Possible Target', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 30,
        station:2, traitsN:0
      });
      const playerSovereign = FB.playerRealmId(s);
      const secondHome = Object.keys(s.owner).filter(function (pid) {
        return pid !== s.player.provinceId &&
          FB.topRealm(s, s.owner[pid]) === playerSovereign;
      })[0] || s.player.provinceId;
      second.homeProvinceId = secondHome;
      const context = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination).filter(function (option) {
          return option.characterId === first.id;
        })[0].context;
      FB.beginIntriguePlot(s, 'assassination', context, 'careful');
      s.player.plot.power = 7.5;
      const before = JSON.parse(JSON.stringify(s.player.plot));
      const payload = JSON.parse(FB.save.serialize());
      FB.save.restore(payload);
      s = FB.state;
      const restored = JSON.parse(JSON.stringify(s.player.plot));
      FB.killChar(s, s.chars[first.id]);
      const afterDeath = s.player.plot;
      const secondContext = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination).filter(function (option) {
          return option.characterId === second.id;
        })[0].context;
      FB.beginIntriguePlot(s, 'assassination', secondContext, 'careful');
      const foreignRealm = Object.keys(s.realms).filter(function (id) {
        return s.realms[id] && s.realms[id].alive && !s.realms[id].liege &&
          id !== playerSovereign;
      })[0];
      s.owner[secondHome] = foreignRealm;
      FB.intrigueTickPlayerPlot(s);
      return {
        before:before,
        restored:restored,
        afterDeath:afterDeath,
        afterConquest:s.player.plot,
        secondAlive:!s.chars[second.id].dead,
        saveVersion:payload.v,
        intrigueArrays:[
          Array.isArray(s.intrigue.aiSchemes),
          Array.isArray(s.intrigue.captives),
          Array.isArray(s.intrigue.leverage)
        ]
      };
    });

    expect(result.restored).toEqual(result.before);
    expect(result.afterDeath).toBeNull();
    expect(result.afterConquest).toBeNull();
    expect(result.secondAlive).toBe(true);
    expect(result.saveVersion).toBe(3);
    expect(result.intrigueArrays).toEqual([true, true, true]);
  });

test('all five outcomes use shared authoritative state and cleanup',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      function person(name, station) {
        const c = FB.makeCharacter(s, {
          name:name, sex:'m', culture:home.culture,
          religion:home.religion, born:s.date.year - 30,
          station:station, traitsN:0
        });
        c.traits = [];
        c.opinion = 0;
        return c;
      }
      function contextFor(id, c) {
        return FB.intrigueTargetOptions(s, FBDATA.plots[id]).filter(
          function (option) { return option.characterId === c.id; })[0].context;
      }
      function resolve(id, context) {
        return FB.resolveIntrigueScheme(s, {
          id:id, context:context, methodId:'careful',
          actorId:me.id, power:FBDATA.plots[id].need
        }, { success:true, exposed:false, playerActor:true });
      }
      const murder = person('Murder Victim', 2);
      murder.spouseId = me.id;
      me.spouseId = murder.id;
      const abducted = person('Abduction Victim', 2);
      const blackmailed = person('Blackmail Victim', 2);
      blackmailed.wealth = 10;
      const charged = person('Charge Victim', 3);
      charged.restorationRight = {
        realmId:Object.keys(s.realms)[0], createdTurn:s.turn
      };
      const murderResult = resolve('assassination',
        contextFor('assassination', murder));
      const abductionResult = resolve('abduction',
        contextFor('abduction', abducted));
      const blackmailResult = resolve('blackmail',
        contextFor('blackmail', blackmailed));
      const chargeResult = resolve('fabricated_charge',
        contextFor('fabricated_charge', charged));
      const sabotageContext = FB.intrigueTargetOptions(s,
        FBDATA.plots.sabotage)[0].context;
      const sabotageStart = s.turn;
      const sabotageResult = resolve('sabotage', sabotageContext);
      const captiveRecord = FB.intrigueCaptivityOf(s, abducted.id);
      const leverageRecord = FB.intrigueLeverageOf(s, me.id);
      const sabotageRecord = FB.countyModifierRecords(s,
        sabotageContext.pid).filter(function (record) {
          return record.id === 'covert_sabotage';
        })[0];
      const sabotageEnd = sabotageRecord && sabotageRecord.endTurn;
      s.turn = sabotageEnd;
      FB.modifierTick(s);
      return {
        results:[murderResult, abductionResult, blackmailResult,
          chargeResult, sabotageResult],
        murdered:murder.dead,
        spouseCleared:!me.spouseId,
        kinslayer:me.traits.indexOf('kinslayer') >= 0,
        captive:captiveRecord,
        leverage:leverageRecord,
        rightRemoved:!charged.restorationRight,
        sabotageEnd:sabotageEnd,
        sabotageExpired:!FB.hasModifier(s, 'covert_sabotage',
          sabotageContext.pid),
        sabotagePid:sabotageContext.pid,
        expectedEnd:sabotageStart + 720
      };
    });

    expect(result.results).toEqual([true, true, true, true, true]);
    expect(result.murdered).toBe(true);
    expect(result.spouseCleared).toBe(true);
    expect(result.kinslayer).toBe(true);
    expect(result.captive.captiveId).toBeTruthy();
    expect(result.leverage.targetId).toBeTruthy();
    expect(result.rightRemoved).toBe(true);
    expect(result.sabotagePid).toBeTruthy();
    expect(result.sabotageEnd).toBe(result.expectedEnd);
    expect(result.sabotageExpired).toBe(true);
  });

test('captivity, ransom, escape, leverage, and conduct remain bounded',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      const captive = FB.makeCharacter(s, {
        name:'Held Noble', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 32,
        station:3, traitsN:0
      });
      const first = FB.captureIntrigue(s, me.id, captive.id, 'abduction');
      const secondTarget = FB.makeCharacter(s, {
        name:'Second Prisoner', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 28,
        station:1, traitsN:0
      });
      const second = FB.captureIntrigue(s, me.id, secondTarget.id,
        'abduction');
      const ransom = first.demand.amount;
      const goldBefore = s.player.gold;
      const released = FB.intrigueRansomCaptive(s, me.id);

      const leverageTarget = FB.makeCharacter(s, {
        name:'Leveraged Officer', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 35,
        station:2, traitsN:0
      });
      const capturedAgain = FB.captureIntrigue(s, me.id,
        leverageTarget.id, 'abduction');
      const leverageRelease = FB.intrigueReleaseForLeverage(s, me.id);
      const leverage = FB.intrigueLeverageOf(s, me.id);
      const paymentOnce = FB.useIntrigueLeverage(s, me.id, 'payment');
      const paymentTwice = FB.useIntrigueLeverage(s, me.id, 'payment');

      const expiring = FB.makeCharacter(s, {
        name:'Expiring Obligation', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 26,
        station:2, traitsN:0
      });
      FB.captureIntrigue(s, me.id, expiring.id, 'abduction');
      FB.intrigueReleaseForLeverage(s, me.id);
      const expiringRecord = FB.intrigueLeverageOf(s, me.id);
      s.turn = expiringRecord.endTurn;
      const expired = !FB.intrigueLeverageOf(s, me.id);

      const aiRealm = Object.keys(s.realms).filter(function (id) {
        return id !== 'player' && s.realms[id] && s.realms[id].alive &&
          !s.realms[id].liege;
      })[0];
      const aiRuler = FB.materializeRealmRuler(s, aiRealm);
      const hostBefore = FB.aiBaseHost(s, aiRealm);
      const rulerCaptured = FB.captureIntrigue(s, me.id, aiRuler.id,
        'abduction', 'player');
      const hostWhileCaptive = FB.aiBaseHost(s, aiRealm);
      const rulerMarkedCaptive = FB.intrigueRealmRulerCaptive(s, aiRealm);
      FB.intrigueReleaseMercifully(s, me.id);

      me.conduct = { schemes:0, deceit:0, cruelty:0 };
      me.traits = ['honest', 'kind'];
      FB.noteConduct(s, me.id, { schemes:3, deceit:3, cruelty:3 });
      const publicBefore = me.traits.indexOf('murderer') >= 0;
      FB.noteConduct(s, me.id, { public:true, murderer:true,
        abductor:true, traitor:true });

      const captor = FB.makeCharacter(s, {
        name:'Player Captor', sex:'m', culture:home.culture,
        religion:home.religion, born:s.date.year - 40,
        station:3, traitsN:0
      });
      FB.captureIntrigue(s, captor.id, me.id, 'abduction');
      const travelBlocked = FB.travelEligible(s, 'relationship');
      const proposedSpouse = FB.makeCharacter(s, {
        name:'Unavailable Match', sex:me.sex === 'm' ? 'f' : 'm',
        culture:home.culture, religion:home.religion,
        born:s.date.year - 25, station:1, traitsN:0
      });
      s.player.courtingId = proposedSpouse.id;
      const married = FB.doMarry(s, { settleDowry:false });
      const originalChance = FB.chance;
      FB.chance = function () { return true; };
      FB.intrigueSeason(s);
      FB.chance = originalChance;
      return {
        first:!!first,
        second:second,
        ransom:ransom,
        ransomGold:s.player.gold >= goldBefore + ransom,
        released:released,
        capturedAgain:!!capturedAgain,
        leverageRelease:leverageRelease,
        leverageDays:leverage.endTurn - leverage.createdTurn,
        paymentOnce:paymentOnce,
        paymentTwice:paymentTwice,
        expired:expired,
        rulerCaptured:!!rulerCaptured,
        rulerMarkedCaptive:rulerMarkedCaptive,
        hostBefore:hostBefore,
        hostWhileCaptive:hostWhileCaptive,
        publicBefore:publicBefore,
        oppositesRemoved:me.traits.indexOf('honest') < 0 &&
          me.traits.indexOf('kind') < 0,
        traits:me.traits,
        conduct:me.conduct,
        travelBlocked:travelBlocked,
        married:married,
        escaped:!FB.intrigueCaptivityOf(s, me.id),
        prisonCleared:!s.player.flags.in_prison
      };
    });

    expect(result.first).toBe(true);
    expect(result.second).toBeNull();
    expect(result.released).toBe(true);
    expect(result.ransomGold).toBe(true);
    expect(result.capturedAgain).toBe(true);
    expect(result.leverageRelease).toBe(true);
    expect(result.leverageDays).toBe(720);
    expect(result.paymentOnce).toBe(true);
    expect(result.paymentTwice).toBe(false);
    expect(result.expired).toBe(true);
    expect(result.rulerCaptured).toBe(true);
    expect(result.rulerMarkedCaptive).toBe(true);
    expect(result.hostWhileCaptive).toBe(Math.round(result.hostBefore * 0.8));
    expect(result.publicBefore).toBe(false);
    expect(result.oppositesRemoved).toBe(true);
    expect(result.traits).toEqual(expect.arrayContaining([
      'schemer', 'deceitful', 'cruel', 'murderer', 'abductor', 'traitor'
    ]));
    expect(result.conduct).toEqual({ schemes:3, deceit:3, cruelty:3 });
    expect(result.travelBlocked).toContain('prisoner');
    expect(result.married).toBe(false);
    expect(result.escaped).toBe(true);
    expect(result.prisonCleared).toBe(true);
  });

test('hearings project regional forms and severe punishment waits for choice',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      const target = FB.makeCharacter(s, {
        name:'Sacred Victim', sex:'m', culture:'greek',
        religion:home.religion, born:s.date.year - 40,
        station:4, traitsN:0, role:'priest'
      });
      function projection(formReligion, culture) {
        const authority = Object.keys(s.realms).filter(function (id) {
          return s.realms[id] && s.realms[id].alive && !s.realms[id].liege;
        })[0];
        s.realms[authority].religion = formReligion;
        target.culture = culture;
        return FB.intrigueSentenceProjection(s, {
          targetId:target.id, authority:authority,
          evidence:'redhanded', severity:4, successful:true,
          plotId:'assassination'
        });
      }
      const latin = projection('catholic', 'frankish');
      const byzantine = projection('orthodox', 'greek');
      const muslim = projection('sunni', 'arab');
      const customary = projection('norse_pagan', 'norse');

      const intrigue = FB.ensureIntrigue(s);
      const accomplice = FB.makeCharacter(s, {
        name:'Named Accomplice', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 30,
        station:2, traitsN:0
      });
      intrigue.hearing = {
        id:'test-hearing', accusedId:me.id,
        accusedGeneration:s.generation, targetId:target.id,
        accompliceId:accomplice.id,
        plotId:'abduction', context:{characterId:target.id},
        evidence:'testimony', severity:2, successful:true,
        authority:FB.playerRealmId(s)
      };
      const ctx = { hearingId:'test-hearing', studentId:target.id };
      s.player.gold = 500;
      const canPay = FB.fns.intrigue_hearing_can_pay(s, ctx);
      const paid = FB.fns.intrigue_hearing_pay(s, ctx);
      return {
        forms:[latin.form, byzantine.form, muslim.form, customary.form],
        outcomes:[latin.outcome, byzantine.outcome,
          muslim.outcome, customary.outcome],
        sacred:latin.sacred,
        aliveBeforeChoice:!me.dead,
        canPay:canPay,
        paid:paid,
        hearingCleared:!s.intrigue.hearing,
        culpable:[me.traits.indexOf('abductor') >= 0,
          accomplice.traits.indexOf('abductor') >= 0]
      };
    });

    expect(result.forms).toEqual([
      'latin', 'byzantine', 'muslim', 'customary'
    ]);
    expect(result.outcomes).toEqual([
      'execution', 'blinding_deposition', 'qisas', 'execution'
    ]);
    expect(result.sacred).toBe(true);
    expect(result.aliveBeforeChoice).toBe(true);
    expect(result.canPay).toBe(true);
    expect(result.paid).toBe(true);
    expect(result.hearingCleared).toBe(true);
    expect(result.culpable).toEqual([true, true]);
  });

test('hearing choices cover challenge, penance, custody, flight, resistance, deposition, and execution',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      const target = FB.makeCharacter(s, {
        name:'Lawful Accuser', sex:'m', culture:'frankish',
        religion:'catholic', born:s.date.year - 42,
        station:3, traitsN:0
      });
      const authority = Object.keys(s.realms).filter(function (id) {
        const realm = s.realms[id];
        return id !== 'player' && realm && realm.alive && !realm.liege;
      })[0];
      s.realms[authority].religion = 'catholic';
      function hearing(id, plotId, evidence, severity, successful) {
        const record = {
          id:id, accusedId:me.id, accusedGeneration:s.generation,
          targetId:target.id, plotId:plotId,
          context:{ characterId:target.id, targetSovereign:authority },
          evidence:evidence, severity:severity, successful:successful,
          authority:authority
        };
        FB.ensureIntrigue(s).hearing = record;
        return { hearingId:id, studentId:target.id };
      }
      const bands = [
        FB.intrigueOffenseSeverity(s, 'blackmail',
          { characterId:target.id }, false),
        FB.intrigueOffenseSeverity(s, 'abduction',
          { characterId:target.id }, false),
        FB.intrigueOffenseSeverity(s, 'assassination',
          { characterId:target.id }, false),
        FB.intrigueOffenseSeverity(s, 'assassination',
          { characterId:target.id }, true)
      ];

      const originalChance = FB.chance;
      FB.chance = function () { return true; };
      const challenge = FB.fns.intrigue_hearing_challenge(s,
        hearing('challenge', 'blackmail', 'testimony', 1, false));
      FB.chance = originalChance;
      const challengeCleared = !s.intrigue.hearing;

      target.role = 'priest';
      s.player.piety = 100;
      const penanceCtx = hearing('penance', 'abduction', 'material', 2,
        true);
      const canPenance = FB.fns.intrigue_hearing_can_penance(s,
        penanceCtx);
      const pietyBefore = s.player.piety;
      const penance = FB.fns.intrigue_hearing_penance(s, penanceCtx);
      const penanceCost = pietyBefore - s.player.piety;

      target.role = null;
      const prison = FB.fns.intrigue_hearing_submit(s,
        hearing('prison', 'abduction', 'material', 2, true));
      const inLegalCustody = !!(s.intrigue.legalCustody &&
        s.player.flags.in_prison);
      s.intrigue.legalCustody = null;
      delete s.player.flags.in_prison;

      let landLosses = 0, resistanceCalls = 0, deathCalls = 0;
      const originalLoseAllLand = FB.loseAllLand;
      const originalResist = FB.fns.attainder_resist;
      const originalDie = FB.game.die;
      FB.loseAllLand = function () { landLosses++; };
      FB.fns.attainder_resist = function () { resistanceCalls++; };
      FB.game.die = function () { deathCalls++; };

      const fled = FB.fns.intrigue_hearing_flee(s,
        hearing('flight', 'fabricated_charge', 'redhanded', 3, false));
      const formerTier = s.player.tier;
      const formerLiege = s.player.liege;
      const formerWar = s.player.war;
      s.player.tier = 3;
      s.player.liege = authority;
      s.player.war = null;
      const resistCtx = hearing('resist', 'fabricated_charge',
        'redhanded', 3, false);
      const canResist = FB.fns.intrigue_hearing_can_resist(s, resistCtx);
      const resisted = FB.fns.intrigue_hearing_resist(s, resistCtx);

      target.culture = 'greek';
      s.realms[authority].religion = 'orthodox';
      const deposed = FB.fns.intrigue_hearing_submit(s,
        hearing('byzantine', 'assassination', 'redhanded', 4, true));
      const maimed = me.traits.indexOf('one_eyed') >= 0 &&
        me.traits.indexOf('maimed') >= 0;

      target.culture = 'frankish';
      s.realms[authority].religion = 'catholic';
      const executed = FB.fns.intrigue_hearing_submit(s,
        hearing('latin', 'assassination', 'redhanded', 4, true));

      FB.loseAllLand = originalLoseAllLand;
      FB.fns.attainder_resist = originalResist;
      FB.game.die = originalDie;
      s.player.tier = formerTier;
      s.player.liege = formerLiege;
      s.player.war = formerWar;
      return {
        bands:bands,
        challenge:challenge, challengeCleared:challengeCleared,
        canPenance:canPenance, penance:penance,
        penanceCost:penanceCost,
        prison:prison, inLegalCustody:inLegalCustody,
        fled:fled, canResist:canResist, resisted:resisted,
        deposed:deposed, maimed:maimed, executed:executed,
        landLosses:landLosses, resistanceCalls:resistanceCalls,
        deathCalls:deathCalls, hearingCleared:!s.intrigue.hearing
      };
    });

    expect(result.bands).toEqual([1, 2, 3, 4]);
    expect(result.challenge).toBe(true);
    expect(result.challengeCleared).toBe(true);
    expect(result.canPenance).toBe(true);
    expect(result.penance).toBe(true);
    expect(result.penanceCost).toBeGreaterThanOrEqual(20);
    expect(result.prison).toBe(true);
    expect(result.inLegalCustody).toBe(true);
    expect(result.fled).toBe(true);
    expect(result.canResist).toBe(true);
    expect(result.resisted).toBe(true);
    expect(result.deposed).toBe(true);
    expect(result.maimed).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.landLosses).toBe(2);
    expect(result.resistanceCalls).toBe(1);
    expect(result.deathCalls).toBe(1);
    expect(result.hearingCleared).toBe(true);
  });

test('leverage is single-use and accomplices leave without retargeting',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const home = FB.world.byId[s.player.provinceId];
      function person(name) {
        return FB.makeCharacter(s, {
          name:name, sex:'m', culture:home.culture,
          religion:home.religion, born:s.date.year - 30,
          station:2, traitsN:0
        });
      }
      const obligated = person('Compelled Helper');
      FB.captureIntrigue(s, me.id, obligated.id, 'abduction');
      FB.intrigueReleaseForLeverage(s, me.id);
      const exactTarget = person('Unchanged Target');
      const context = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination).filter(function (option) {
          return option.characterId === exactTarget.id;
        })[0].context;
      FB.beginIntriguePlot(s, 'assassination', context, 'careful');
      const ordinary = FB.intriguePreview(s, 'assassination', context,
        'careful');
      const compelled = FB.useIntrigueLeverage(s, me.id, 'accomplice');
      const compelledPreview = FB.intriguePreview(s, 'assassination',
        context, 'careful', obligated.id, false, {
          accepted:true, compelled:true
        });
      const usedAgain = FB.useIntrigueLeverage(s, me.id, 'payment');

      const foreignPid = Object.keys(s.owner).filter(function (pid) {
        return FB.topRealm(s, s.owner[pid]) !== FB.playerRealmId(s);
      })[0];
      obligated.homeProvinceId = foreignPid;
      const originalChance = FB.chance;
      FB.chance = function () { return false; };
      FB.intrigueTickPlayerPlot(s);
      FB.chance = originalChance;

      const captor = person('Doomed Captor');
      const captive = person('Freed on Death');
      FB.captureIntrigue(s, captor.id, captive.id, 'abduction');
      FB.killChar(s, captor);

      const livingCaptor = person('Surviving Captor');
      const dyingCaptive = person('Dying Captive');
      FB.captureIntrigue(s, livingCaptor.id, dyingCaptive.id, 'abduction');
      FB.killChar(s, dyingCaptive);

      const successionCaptive = person('Freed on Succession');
      FB.captureIntrigue(s, me.id, successionCaptive.id, 'abduction');
      FB.intriguePlayerSuccession(s, me.id, exactTarget.id);
      return {
        compelled:compelled,
        exposureDelta:compelledPreview.exposure - ordinary.exposure,
        usedAgain:usedAgain,
        leverageGone:!FB.intrigueLeverageOf(s, me.id),
        targetKept:s.player.plot &&
          s.player.plot.context.characterId === exactTarget.id,
        accompliceRemoved:s.player.plot && !s.player.plot.accomplice,
        freedOnDeath:!FB.intrigueCaptivityOf(s, captive.id),
        deadCaptiveRemoved:!FB.intrigueCaptivityOf(s, dyingCaptive.id),
        freedOnSuccession:!FB.intrigueCaptivityOf(s,
          successionCaptive.id)
      };
    });

    expect(result.compelled).toBe(true);
    expect(result.exposureDelta).toBe(10);
    expect(result.usedAgain).toBe(false);
    expect(result.leverageGone).toBe(true);
    expect(result.targetKept).toBe(true);
    expect(result.accompliceRemoved).toBe(true);
    expect(result.freedOnDeath).toBe(true);
    expect(result.deadCaptiveRemoved).toBe(true);
    expect(result.freedOnSuccession).toBe(true);
  });

test('AI-versus-AI assassination follows ruler succession',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      const s = FB.state;
      let actorRealm = null, targetRealm = null;
      for (const rid in s.realms) {
        const realm = s.realms[rid];
        if (!realm || !realm.alive || !realm.liege) continue;
        const sovereign = FB.topRealm(s, rid);
        if (sovereign !== 'player' && s.realms[sovereign] &&
            s.realms[sovereign].alive) {
          actorRealm = sovereign;
          targetRealm = rid;
          break;
        }
      }
      if (!actorRealm || !targetRealm) return { found:false };
      const actor = FB.materializeRealmRuler(s, actorRealm);
      const victim = FB.materializeRealmRuler(s, targetRealm);
      if (!actor || !victim) return { found:false };
      const beforeGeneration = FB.realmRulerGeneration(s, targetRealm);
      const option = FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination, actor.id, actorRealm).filter(
        function (candidate) {
          return candidate.characterId === victim.id;
        })[0];
      if (!option) return { found:false };
      const resolved = FB.resolveIntrigueScheme(s, {
        id:'assassination', actorId:actor.id,
        actorRealmId:actorRealm, context:option.context,
        methodId:'careful', power:FBDATA.plots.assassination.need
      }, { success:true, exposed:false, playerActor:false });
      const successor = FB.realmRulerCharacterSnapshot(s, targetRealm);
      const nextOption = successor && FB.intrigueTargetOptions(s,
        FBDATA.plots.assassination, actor.id, actorRealm).filter(
        function (candidate) {
          return candidate.characterId === successor.id;
        })[0];
      if (nextOption) {
        FB.ensureIntrigue(s).aiSchemes.push({
          recordId:'actor-succession', schemeId:'assassination',
          actorId:actor.id, actorRealmId:actorRealm,
          actorGeneration:FB.realmRulerGeneration(s, actorRealm),
          context:nextOption.context, methodId:'careful', power:1,
          startedTurn:s.turn, accomplice:null,
          playerFacing:false, warningStatus:null
        });
      }
      FB.advanceRealmSuccession(s, actorRealm);
      const actorSuccessor = FB.realmRulerCharacterSnapshot(s, actorRealm);
      return {
        found:!!(actorRealm && targetRealm && option),
        resolved:resolved,
        victimDead:victim.dead,
        beforeGeneration:beforeGeneration,
        afterGeneration:FB.realmRulerGeneration(s, targetRealm),
        successorId:successor && successor.id,
        victimId:victim.id,
        actorSchemePrepared:!!nextOption,
        actorSchemeEnded:!FB.ensureIntrigue(s).aiSchemes.some(
          function (scheme) { return scheme.actorId === actor.id; }),
        actorSuccessorId:actorSuccessor && actorSuccessor.id,
        actorId:actor.id
      };
    });

    expect(result.found).toBe(true);
    expect(result.resolved).toBe(true);
    expect(result.victimDead).toBe(true);
    expect(result.afterGeneration).toBeGreaterThan(result.beforeGeneration);
    expect(result.successorId).toBeTruthy();
    expect(result.successorId).not.toBe(result.victimId);
    expect(result.actorSchemePrepared).toBe(true);
    expect(result.actorSchemeEnded).toBe(true);
    expect(result.actorSuccessorId).toBeTruthy();
    expect(result.actorSuccessorId).not.toBe(result.actorId);
  });

test('target setup is searchable, keyboard reachable, and narrow-screen safe',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    const targetId = await page.evaluate(function () {
      const s = FB.state;
      const home = FB.world.byId[s.player.provinceId];
      const c = FB.makeCharacter(s, {
        name:'Needle Target', sex:'f', culture:home.culture,
        religion:home.religion, born:s.date.year - 25,
        station:2, traitsN:0
      });
      FB.ui.showIntrigueTargets('assassination');
      return c.id;
    });
    const search = page.locator('#intrigue-target-search');
    await expect(search).toBeVisible();
    await search.fill('Needle Target');
    await expect(page.locator('[data-intrigue-target-row]:not([hidden])'))
      .toHaveCount(1);
    await search.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-intrigue-target-row]:not([hidden]) button'))
      .toBeFocused();
    await expect(page.locator('#genmodal')).toHaveClass(/intrigue-modal/);
    await expect(page.locator('#genmodal .modalcard')).toBeInViewport();

    await page.evaluate(function (id) {
      FB.ui.showCharModal(id);
    }, targetId);
    await expect(page.getByRole('button', { name:/Plot against/ }))
      .toBeVisible();
  });
