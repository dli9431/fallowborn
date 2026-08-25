'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/cultures.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/technology.js',
  'js/main.js',
  'js/i18n.js',
  'js/events.js',
  'js/actions.js',
  'js/world.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.setPlayerTier(FB.state, 0, { tenureFormationReason:'rank_change' });
    FB.state.eventQueue = [];
  });
}

test('the serf burden pool contains ten scheduled and two extraordinary stories',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var result = await page.evaluate(function () {
      var ordinaryIds = [
        'serf_boon_harvest',
        'serf_weekwork_tally',
        'serf_mill_multure',
        'serf_pannage_due',
        'serf_marriage_leave',
        'serf_tithe_sheaf',
        'serf_bridge_cartage',
        'serf_common_oven',
        'serf_deadwood_amerced',
        'serf_officers_quartered'
      ];
      var extraordinaryIds = [
        'serf_extraordinary_tallage',
        'serf_seed_grain_requisition'
      ];
      function inspect(id) {
        var matches = FBDATA.events.filter(function (event) {
          return event.id === id;
        });
        var event = matches[0];
        return {
          id: id,
          count: matches.length,
          never: !!(event && event.trigger && event.trigger.never),
          contextValidator: event && event.contextValidator,
          choices: event && event.options ? event.options.length : 0,
          complete: !!(event && event.title && event.text &&
            event.options.every(function (option) {
              return !!(option.label && option.desc &&
                (option.effects || option.chance));
            }))
        };
      }
      return {
        ordinary: ordinaryIds.map(inspect),
        extraordinary: extraordinaryIds.map(inspect).map(function (entry, index) {
          var event = FB.eventById(extraordinaryIds[index]);
          entry.once = event.once;
          entry.weight = event.weight;
          entry.chance = event.trigger.chance;
          entry.unconditional = event.options.every(function (option) {
            return !option.require && !option.chance &&
              !option.success && !option.failure;
          });
          return entry;
        })
      };
    });

    expect(result.ordinary).toHaveLength(10);
    result.ordinary.forEach(function (event) {
      expect(event).toMatchObject({
        count: 1,
        never: true,
        contextValidator: 'serf_tenure_context_valid',
        complete: true
      });
      expect(event.choices).toBeGreaterThanOrEqual(3);
    });
    expect(result.extraordinary).toHaveLength(2);
    result.extraordinary.forEach(function (event) {
      expect(event).toMatchObject({
        count: 1,
        never: false,
        choices: 3,
        complete: true,
        once: true,
        weight: 2,
        unconditional: true
      });
      expect(event.chance).toBeLessThanOrEqual(0.05);
    });
  });

test('every extraordinary serf choice inflicts an unavoidable resource loss',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    var outcomes = await page.evaluate(function () {
      var ids = [
        'serf_extraordinary_tallage',
        'serf_seed_grain_requisition'
      ];
      var baseline = FB.save.serialize();
      var results = [];
      ids.forEach(function (id) {
        var event = FB.eventById(id);
        event.options.forEach(function (option, optionIndex) {
          FB.save.restore(JSON.parse(baseline));
          var state = FB.state;
          var player = state.player;
          var character = state.chars[player.charId];
          player.gold = 100;
          player.prestige = 100;
          player.piety = 100;
          character.health = 10;
          var before = {
            gold: player.gold,
            prestige: player.prestige,
            piety: player.piety,
            health: character.health
          };
          FB.resolveEventOption(state, event, option, {}, { automated: false });
          var after = {
            gold: player.gold,
            prestige: player.prestige,
            piety: player.piety,
            health: character.health
          };
          var loss = 0;
          var gain = 0;
          Object.keys(before).forEach(function (key) {
            var change = after[key] - before[key];
            if (change < 0) loss += -change;
            if (change > 0) gain += change;
          });
          results.push({
            id: id,
            option: optionIndex,
            loss: loss,
            gain: gain,
            leanWinter: !!player.flags.lean_winter
          });
        });
      });
      return results;
    });

    expect(outcomes).toHaveLength(6);
    outcomes.forEach(function (outcome) {
      expect(outcome.loss).toBeGreaterThan(0);
      expect(outcome.gain).toBe(0);
    });
    expect(outcomes.filter(function (outcome) {
      return outcome.id === 'serf_seed_grain_requisition' &&
        outcome.option === 0;
    })[0].leanWinter).toBe(true);
  });

test('tenure catalogue validation accepts valid data and rejects malformed records',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const validationResults = await page.evaluate(function () {
      const results = {};
      results.baselineValid = !!FB.validateTenureData();

      function throwsError(fn) {
        try { fn(); return false; }
        catch (e) { return true; }
      }

      results.rejectsUnknownEvent = throwsError(function () {
        const copy = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
        copy.latin_manorial.duties[0].eventId = 'unknown_event_nonexistent';
        FB.validateTenureData(copy);
      });

      results.rejectsDuplicateDuty = throwsError(function () {
        const copy = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
        copy.latin_manorial.duties.push({
          id: copy.latin_manorial.duties[0].id,
          eventId: 'serf_boon_harvest',
          intervalTurns: 720
        });
        FB.validateTenureData(copy);
      });

      results.rejectsNonPositiveInterval = throwsError(function () {
        const copy = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
        copy.latin_manorial.duties[0].intervalTurns = 0;
        FB.validateTenureData(copy);
      });

      results.rejectsMissingFallback = throwsError(function () {
        const copy = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
        delete copy.dependent_farming;
        FB.validateTenureData(copy);
      });

      return results;
    });

    expect(validationResults.baselineValid).toBe(true);
    expect(validationResults.rejectsUnknownEvent).toBe(true);
    expect(validationResults.rejectsDuplicateDuty).toBe(true);
    expect(validationResults.rejectsNonPositiveInterval).toBe(true);
    expect(validationResults.rejectsMissingFallback).toBe(true);
  });

test('deterministic archetype selection matches culture, faith, and terrain without RNG',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const selection = await page.evaluate(function () {
      const s = FB.state;
      const latinFarmland = FB.selectSerfTenureArchetype({
        provinceId: 'london', settlementIndex: 0, culture: 'english',
        faith: 'catholic', terrain: 'farmland', dev0: 5, settlementKind: 'village', state: s
      });
      const latinForest = FB.selectSerfTenureArchetype({
        provinceId: 'london', settlementIndex: 0, culture: 'english',
        faith: 'catholic', terrain: 'forest', dev0: 5, settlementKind: 'village', state: s
      });
      const fellah = FB.selectSerfTenureArchetype({
        provinceId: 'fustat', settlementIndex: 0, culture: 'arabic',
        faith: 'sunni', terrain: 'farmland', dev0: 6, settlementKind: 'village', state: s
      });
      const pagan = FB.selectSerfTenureArchetype({
        provinceId: 'novgorod', settlementIndex: 0, culture: 'slavic',
        faith: 'slavic_pagan', terrain: 'forest', dev0: 2, settlementKind: 'village', state: s
      });
      const fallback = FB.selectSerfTenureArchetype({
        provinceId: 'unknown', settlementIndex: 0, culture: 'unknown_culture',
        faith: 'unknown_faith', terrain: 'steppe', dev0: 0, settlementKind: 'camp', state: s
      });
      return {
        latinArch: latinFarmland.archetype.id,
        latinFarmlandRights: latinFarmland.resolvedRights,
        latinFarmlandFacilityDuty: latinFarmland.resolvedDuties.filter(function (d) { return d.id === 'local_facility_due'; })[0],
        latinForestRights: latinForest.resolvedRights,
        latinForestFacilityDuty: latinForest.resolvedDuties.filter(function (d) { return d.id === 'local_facility_due'; })[0],
        fellahArch: fellah.archetype.id,
        fellahRights: fellah.resolvedRights,
        fellahDutiesValid: fellah.resolvedDuties.every(function (d) { return !!d.eventId; }),
        paganArch: pagan.archetype.id,
        paganRights: pagan.resolvedRights,
        paganHeavyServiceDuty: pagan.resolvedDuties.filter(function (d) { return d.id === 'local_heavy_service'; })[0],
        fallbackArch: fallback.archetype.id,
        fallbackRights: fallback.resolvedRights
      };
    });

    expect(selection.latinArch).toBe('latin_manorial');
    expect(selection.latinFarmlandRights).toContain('gleaning_after_harvest');
    expect(selection.latinFarmlandFacilityDuty.eventId).toBe('serf_common_oven');
    expect(selection.latinForestRights).toContain('deadwood_after_frost');
    expect(selection.latinForestFacilityDuty.eventId).toBe('serf_pannage_due');
    expect(selection.fellahArch).toBe('irrigated_fellah');
    expect(selection.fellahRights).toContain('irrigation_turn');
    expect(selection.fellahDutiesValid).toBe(true);
    expect(selection.paganArch).toBe('pagan_household_service');
    expect(selection.paganRights).toEqual([]);
    expect(selection.paganHeavyServiceDuty.eventId).toBe('serf_deadwood_amerced');
    expect(selection.fallbackArch).toBe('dependent_farming');
    expect(selection.fallbackRights).toEqual([]);
  });

test('ordinary serf burden stories are never selected by the random event generator without matching tenure duties',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const ordinaryIds = [
        'serf_boon_harvest', 'serf_weekwork_tally', 'serf_mill_multure',
        'serf_pannage_due', 'serf_marriage_leave', 'serf_tithe_sheaf',
        'serf_bridge_cartage', 'serf_common_oven', 'serf_deadwood_amerced',
        'serf_officers_quartered'
      ];
      const tenure = FB.activeSerfTenure(state);
      tenure.duties = [];
      tenure.conditional = [];
      const allInvalidWithoutDuty = ordinaryIds.every(function (id) {
        const ev = FB.eventById(id);
        return !FB.eventContextStillValid(state, ev, {
          tenureFormedTurn:tenure.formedTurn,
          archetypeId:tenure.archetypeId,
          dutyId:'missing_' + id,
          dueTurn:state.turn,
          protagonistId:state.player.charId,
          locationId:state.player.provinceId
        });
      });
      const selectedIds = [];
      for (let i = 0; i < 50; i++) {
        const ev = FB.pickEvent ? FB.pickEvent(state) : null;
        if (ev && ordinaryIds.indexOf(ev.id) >= 0) {
          selectedIds.push(ev.id);
        }
      }
      return {
        ordinaryTriggerNever: ordinaryIds.every(function (id) {
          const ev = FB.eventById(id);
          return ev && ev.trigger && ev.trigger.never === true;
        }),
        allInvalidWithoutDuty:allInvalidWithoutDuty,
        randomSelectedCount: selectedIds.length
      };
    });

    expect(result.ordinaryTriggerNever).toBe(true);
    expect(result.allInvalidWithoutDuty).toBe(true);
    expect(result.randomSelectedCount).toBe(0);
  });

test('extraordinary exactions are randomly eligible and reachable when prerequisites are met',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      state.player.tier = 0;
      state.player.gold = 10;
      const char = state.chars[state.player.charId];
      char.born = state.date.year - 25;

      const tallage = FB.eventById('serf_extraordinary_tallage');
      const seedReq = FB.eventById('serf_seed_grain_requisition');

      return {
        tallageEligible: FB.eventEligible ? FB.eventEligible(state, tallage) : true,
        seedReqEligible: FB.eventEligible ? FB.eventEligible(state, seedReq) : true
      };
    });

    expect(result.tallageEligible).toBe(true);
    expect(result.seedReqEligible).toBe(true);
  });

test('marriage leave conditional duty tracks marriage proposal flow, pending turn, resolution, and cooldown',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const me = state.chars[state.player.charId];

      // A spouse who predates formation must not create a retroactive charge.
      delete state.player.tenure;
      const priorSpouse = FB.makeCharacter(state, {
        name:'Matilda', sex:me.sex === 'f' ? 'm' : 'f', born:state.date.year - 22,
        culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0
      });
      me.spouseId = priorSpouse.id;
      priorSpouse.spouseId = me.id;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const mDuty = tenure.conditional.filter(function (c) { return c.id === 'marriage_leave'; })[0];
      const noRetroactivePending = mDuty.pendingTurn === null;
      me.spouseId = null;
      priorSpouse.spouseId = null;

      // Create marriage partner and perform marriage
      const partner = FB.makeCharacter(state, {
        name:'Elspeth', sex:me.sex === 'f' ? 'm' : 'f', born:state.date.year - 20,
        culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0
      });
      state.player.courtingId = partner.id;
      FB.doMarry(state, { settleDowry: false });
      const pendingTurnAfterMarriage = mDuty.pendingTurn;

      const ev = FB.eventById('serf_marriage_leave');
      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: 'marriage_leave',
        dueTurn: pendingTurnAfterMarriage || state.turn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };

      state.turn = ctx.dueTurn;
      const validAtDue = FB.fns.serf_tenure_context_valid(state, ctx, ev);
      FB.resolveEventOption(state, ev, ev.options[0], ctx, { automated: false });

      return {
        noRetroactivePending:noRetroactivePending,
        hasPendingAfterMarriage: pendingTurnAfterMarriage !== null,
        validAtDue: validAtDue,
        pendingCleared: mDuty.pendingTurn === null,
        lastResolvedSet: mDuty.lastResolvedTurn === state.turn,
        cooldownSet: mDuty.nextEligibleTurn === state.turn + 1080
      };
    });

    expect(result.noRetroactivePending).toBe(true);
    expect(result.hasPendingAfterMarriage).toBe(true);
    expect(result.validAtDue).toBe(true);
    expect(result.pendingCleared).toBe(true);
    expect(result.lastResolvedSet).toBe(true);
    expect(result.cooldownSet).toBe(true);
  });

test('descent and ascent routes: freedom deed, flight event, debt bondage, commendation, and raid enslavement',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const results = {};

      // 1. Manumission / Freedom via buy_freedom action
      FB.ensureSerfTenure(state, 'new_game');
      state.player.gold = 50;
      var buyFreedom = FB.instants.filter(function (d) { return d.id === 'buy_freedom'; })[0];
      if (buyFreedom) buyFreedom.run(state);
      results.freedomTier = state.player.tier;
      results.freedomStatus = state.player.tenure.status;
      results.freedomReason = state.player.tenure.endReason;

      // 2. Debt bondage (freeholder -> serf) via bondage_submit
      state.player.loans = [{ id: 'loan_1', face: 20, status: 'default', season: 0, year: state.date.year }];
      state.player.flags.debt_distraint = 1;
      FB.fns.bondage_submit(state);
      results.bondageTier = state.player.tier;
      results.bondageStatus = state.player.tenure.status;
      results.bondageFormedBy = state.player.tenure.formedBy;
      results.bondagePriorClosure = state.player.tenure.priorClosure;

      // 3. Flight via flee_serfdom event
      const fleeEv = FB.eventById('flee_serfdom');
      // Mulberry32 seed zero's first draw is below 0.5, pinning the authored
      // success branch while still exercising the real chance/effect path.
      FB.setRngState(0);
      FB.resolveEventOption(state, fleeEv, fleeEv.options[0], {}, { automated: false });
      results.flightTier = state.player.tier;
      results.flightStatus = state.player.tenure.status;
      results.flightReason = state.player.tenure.endReason;

      // 4. Commendation (protection bargain) via devastation_commend
      FB.fns.devastation_commend(state);
      results.commendTier = state.player.tier;
      results.commendStatus = state.player.tenure.status;
      results.commendFormedBy = state.player.tenure.formedBy;

      // 5. Raid capture & forced settlement via raid_enslave
      const oldProv = state.player.provinceId || 'london';
      const raidDestination = oldProv === 'paris' ? 'london' : 'paris';
      const raidCtx = {
        protagonistId: state.player.charId,
        raidProfile: 'northmen',
        destinationId: raidDestination,
        originProvinceId: oldProv
      };
      FB.fns.raid_enslave(state, raidCtx);
      results.raidTier = state.player.tier;
      results.raidProvince = state.player.provinceId;
      results.raidStatus = state.player.tenure.status;
      results.raidFormedBy = state.player.tenure.formedBy;
      results.raidPriorReason = state.player.tenure.priorClosure && state.player.tenure.priorClosure.endReason;
      results.raidPriorProv = state.player.tenure.priorClosure && state.player.tenure.priorClosure.provinceId;
      results.raidDestination = raidDestination;
      results.raidExpectedPriorProv = oldProv;

      return results;
    });

    expect(result.freedomTier).toBe(1);
    expect(result.freedomStatus).toBe('closed');
    expect(result.freedomReason).toBe('purchase');

    expect(result.bondageTier).toBe(0);
    expect(result.bondageStatus).toBe('active');
    expect(result.bondageFormedBy).toBe('debt_bondage');
    expect(result.bondagePriorClosure).toBeUndefined();

    expect(result.flightTier).toBe(1);
    expect(result.flightStatus).toBe('closed');
    expect(result.flightReason).toBe('flight');

    expect(result.commendTier).toBe(0);
    expect(result.commendStatus).toBe('active');
    expect(result.commendFormedBy).toBe('commendation');

    expect(result.raidTier).toBe(0);
    expect(result.raidProvince).toBe(result.raidDestination);
    expect(result.raidStatus).toBe('active');
    expect(result.raidFormedBy).toBe('forced_settlement');
    expect(result.raidPriorReason).toBe('forced_relocation');
    expect(result.raidPriorProv).toBe(result.raidExpectedPriorProv);
  });

test('lifecycle: legacy repair, due turn arrival, stale context matrix, closing effects, and closure',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const initialTenure = FB.activeSerfTenure(state);

      // Verify lazy repair
      delete state.player.tenure;
      const repaired = FB.ensureSerfTenure(state, 'legacy_repair');

      const firstDuty = repaired.duties[0];
      const validCtx = {
        tenureFormedTurn: repaired.formedTurn,
        archetypeId: repaired.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };
      const ev = FB.eventById(firstDuty.eventId);

      // 1. Future duty must not validate before due turn
      state.turn = firstDuty.nextDueTurn - 1;
      const invalidBeforeDue = FB.fns.serf_tenure_context_valid(state, validCtx, ev);

      // 2. Arrived duty validates at due turn
      state.turn = firstDuty.nextDueTurn;
      const validAtDue = FB.fns.serf_tenure_context_valid(state, validCtx, ev);

      // 3. Stale context matrix checks
      state.player.tier = 1;
      const invalidOnTier1 = FB.fns.serf_tenure_context_valid(state, validCtx, ev);
      state.player.tier = 0;

      const invalidOnDueTurnMutated = FB.fns.serf_tenure_context_valid(state, Object.assign({}, validCtx, { dueTurn: validCtx.dueTurn + 1 }), ev);
      const invalidOnProtagonistChanged = FB.fns.serf_tenure_context_valid(state, Object.assign({}, validCtx, { protagonistId: 'other_char' }), ev);
      const invalidOnLocationChanged = FB.fns.serf_tenure_context_valid(state, Object.assign({}, validCtx, { locationId: 'other_prov' }), ev);
      const invalidOnDutyRemoved = FB.fns.serf_tenure_context_valid(state, Object.assign({}, validCtx, { dutyId: 'nonexistent_duty' }), ev);

      // Mutate the authoritative state too: a queued context must fail closed
      // when its home, saved duty, or saved due turn changes underneath it.
      const originalProvinceId = state.player.provinceId;
      state.player.provinceId = 'paris';
      const invalidAfterHomeChange = FB.fns.serf_tenure_context_valid(state, validCtx, ev);
      state.player.provinceId = originalProvinceId;

      const dutyIndex = repaired.duties.indexOf(firstDuty);
      repaired.duties.splice(dutyIndex, 1);
      const invalidAfterActualDutyRemoval = FB.fns.serf_tenure_context_valid(state, validCtx, ev);
      repaired.duties.splice(dutyIndex, 0, firstDuty);

      firstDuty.nextDueTurn = validCtx.dueTurn + 1;
      const invalidAfterActualDueTurnChange = FB.fns.serf_tenure_context_valid(state, validCtx, ev);
      firstDuty.nextDueTurn = validCtx.dueTurn;

      // 4. Resolve event and verify duty advance
      const oldDueTurn = firstDuty.nextDueTurn;
      FB.resolveEventOption(state, ev, ev.options[0], validCtx, { automated: false });
      const newDueTurn = firstDuty.nextDueTurn;
      const replayAttemptValid = FB.fns.serf_tenure_context_valid(state, validCtx, ev);

      // 5. Test replacement tenure invalidates old formedTurn context
      const replaced = FB.replaceSerfTenure(state, 'test_relocation');
      const invalidAfterReplacement = FB.fns.serf_tenure_context_valid(state, validCtx, ev);

      // 6. Test tenure closure on rank promotion
      FB.setPlayerTier(state, 1, { tenureEndReason: 'manumission' });
      const closedTenure = state.player.tenure;

      return {
        initialActive: !!initialTenure,
        repairedActive: !!repaired && repaired.status === 'active',
        invalidBeforeDue: invalidBeforeDue,
        validAtDue: validAtDue,
        invalidOnTier1: invalidOnTier1,
        invalidOnDueTurnMutated: invalidOnDueTurnMutated,
        invalidOnProtagonistChanged: invalidOnProtagonistChanged,
        invalidOnLocationChanged: invalidOnLocationChanged,
        invalidOnDutyRemoved: invalidOnDutyRemoved,
        invalidAfterHomeChange: invalidAfterHomeChange,
        invalidAfterActualDutyRemoval: invalidAfterActualDutyRemoval,
        invalidAfterActualDueTurnChange: invalidAfterActualDueTurnChange,
        dutyAdvanced: newDueTurn > oldDueTurn,
        replayAttemptValid: replayAttemptValid,
        invalidAfterReplacement: invalidAfterReplacement,
        closedStatus: closedTenure && closedTenure.status,
        endReason: closedTenure && closedTenure.endReason
      };
    });

    expect(result.initialActive).toBe(true);
    expect(result.repairedActive).toBe(true);
    expect(result.invalidBeforeDue).toBe(false);
    expect(result.validAtDue).toBe(true);
    expect(result.invalidOnTier1).toBe(false);
    expect(result.invalidOnDueTurnMutated).toBe(false);
    expect(result.invalidOnProtagonistChanged).toBe(false);
    expect(result.invalidOnLocationChanged).toBe(false);
    expect(result.invalidOnDutyRemoved).toBe(false);
    expect(result.invalidAfterHomeChange).toBe(false);
    expect(result.invalidAfterActualDutyRemoval).toBe(false);
    expect(result.invalidAfterActualDueTurnChange).toBe(false);
    expect(result.dutyAdvanced).toBe(true);
    expect(result.replayAttemptValid).toBe(false);
    expect(result.invalidAfterReplacement).toBe(false);
    expect(result.closedStatus).toBe('closed');
    expect(result.endReason).toBe('manumission');
  });

test('tenure-closing effects win over duty advancement during resolution',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'close_effect_test');
      const firstDuty = tenure.duties[0];
      state.turn = firstDuty.nextDueTurn;

      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };

      const closingOption = {
        label: 'Purchase lawful freedom.',
        effects: { tenureEnd: 'purchase', tierSet: 1 }
      };
      const ev = FB.eventById(firstDuty.eventId);

      const oldDueTurn = firstDuty.nextDueTurn;
      FB.resolveEventOption(state, ev, closingOption, ctx, { automated: false });

      return {
        tenureStatus: tenure.status,
        endReason: tenure.endReason,
        nextDueTurnUnchanged: firstDuty.nextDueTurn === oldDueTurn,
        playerTier: state.player.tier
      };
    });

    expect(result.tenureStatus).toBe('closed');
    expect(result.endReason).toBe('purchase');
    expect(result.nextDueTurnUnchanged).toBe(true);
    expect(result.playerTier).toBe(1);
  });

test('autoresolve resolves valid options, advances schedule, and emits structured news',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'autoresolve_test');
      const firstDuty = tenure.duties[0];
      state.turn = firstDuty.nextDueTurn;

      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };
      const ev = FB.eventById(firstDuty.eventId);

      const oldDueTurn = firstDuty.nextDueTurn;
      const receipt = FB.resolveEventOption(state, ev, ev.options[0], ctx, { automated: true });

      return {
        receiptAutomated: receipt && receipt.automated,
        dutyAdvanced: firstDuty.nextDueTurn > oldDueTurn,
        resolvedFlag: ctx._tenureResolved
      };
    });

    expect(result.receiptAutomated).toBe(true);
    expect(result.dutyAdvanced).toBe(true);
    expect(result.resolvedFlag).toBe(true);
  });

test('quartering duty triggers at most once per eligible war, cancels on peace, and allows distinct subsequent wars',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'war_test');
      const qDuty = tenure.conditional.filter(function (c) { return c.id === 'officers_quartered'; })[0];

      // 1. Declare War 1 against Normandy
      state.realms.france = { id: 'france', alive: true, war: { enemy: 'normandy', years: 0 } };
      state.owner[tenure.provinceId] = 'france';

      FB.tenureDay(state);
      const warId1 = qDuty.currentWarId;
      const pendingTurn1 = qDuty.pendingTurn;

      // Advance years in same war — war ID must remain stable
      state.realms.france.war.years = 3;
      FB.tenureDay(state);
      const warIdStable = qDuty.currentWarId === warId1;
      const pendingStable = qDuty.pendingTurn === pendingTurn1;

      // Resolve War 1 quartering event
      state.turn = pendingTurn1;
      const ev = FB.eventById('serf_officers_quartered');
      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: 'officers_quartered',
        dueTurn: pendingTurn1,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };
      const war1Receipt = FB.resolveEventOption(state, ev, ev.options[0], ctx, { automated: false });
      const clearedAfterResolve = qDuty.pendingTurn === null;
      const cooldownTurn = qDuty.nextEligibleTurn;

      // Further days in SAME War 1 do NOT trigger quartering again
      FB.tenureDay(state);
      const noRetriggerInSameWar = qDuty.pendingTurn === null;

      // 2. Peace occurs — resets war tracking
      state.realms.france.war = null;
      FB.tenureDay(state);
      const warEnded = qDuty.currentWarId === null;

      // 3. A distinct war during cooldown remains ineligible.
      state.realms.france.war = { enemy: 'england', years: 0 };
      FB.tenureDay(state);
      const warId2 = qDuty.currentWarId;
      const cooldownWarSkipped = warId2 !== warId1 && qDuty.pendingTurn === null;

      // End War 2, let the 12-season cooldown elapse, then start War 3.
      state.realms.france.war = null;
      FB.tenureDay(state);
      state.turn = cooldownTurn;
      state.realms.france.war = { enemy: 'normandy', years: 0 };
      FB.tenureDay(state);
      const warId3 = qDuty.currentWarId;
      const pendingTurnWar3 = qDuty.pendingTurn;
      const laterEligibleWarTriggered = warId3 !== warId2 && pendingTurnWar3 !== null;

      // 4. War 3 ends before resolution — pending obligation is canceled cleanly.
      state.realms.france.war = null;
      FB.tenureDay(state);
      const canceledOnPeace = qDuty.pendingTurn === null && qDuty.currentWarId === null;

      return {
        hasWarId: !!warId1,
        hasPending: pendingTurn1 !== null,
        warIdStable: warIdStable,
        pendingStable: pendingStable,
        war1Resolved: !!war1Receipt,
        clearedAfterResolve: clearedAfterResolve,
        noRetriggerInSameWar: noRetriggerInSameWar,
        warEnded: warEnded,
        cooldownWarSkipped: cooldownWarSkipped,
        laterEligibleWarTriggered: laterEligibleWarTriggered,
        canceledOnPeace: canceledOnPeace
      };
    });

    expect(result.hasWarId).toBe(true);
    expect(result.hasPending).toBe(true);
    expect(result.warIdStable).toBe(true);
    expect(result.pendingStable).toBe(true);
    expect(result.war1Resolved).toBe(true);
    expect(result.clearedAfterResolve).toBe(true);
    expect(result.noRetriggerInSameWar).toBe(true);
    expect(result.warEnded).toBe(true);
    expect(result.cooldownWarSkipped).toBe(true);
    expect(result.laterEligibleWarTriggered).toBe(true);
    expect(result.canceledOnPeace).toBe(true);
  });

test('one presentation per season limit restricts burden queuing to once per season',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'season_limit_test');

      // Schedule two duties due today
      tenure.duties[0].nextDueTurn = state.turn;
      tenure.duties[1].nextDueTurn = state.turn;
      state.eventQueue = [];

      FB.tenureDay(state);
      const queueCountAfterFirst = state.eventQueue.length;

      // Clear the queue item and run again in the same season
      state.eventQueue = [];
      FB.tenureDay(state);
      const queueCountAfterSecond = state.eventQueue.length;

      return {
        firstQueued: queueCountAfterFirst,
        secondQueued: queueCountAfterSecond
      };
    });

    expect(result.firstQueued).toBe(1);
    expect(result.secondQueued).toBe(0);
  });

test('queuing and rendering a due tenure event applies no cost before a choice is accepted',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'new_game');
      const duty = tenure.duties[0];
      const protagonist = state.chars[state.player.charId];
      state.turn = duty.nextDueTurn;
      state.eventQueue = [];

      const before = {
        gold:state.player.gold,
        prestige:state.player.prestige,
        piety:state.player.piety,
        health:protagonist.health,
        nextDueTurn:duty.nextDueTurn,
        lastResolvedTurn:duty.lastResolvedTurn
      };

      FB.tenureDay(state);
      const due = FB.pickDailyEvents(state);
      FB.ui.runEvents(due);

      return {
        queuedAndRendered:due.length === 1 &&
          !document.getElementById('eventmodal').classList.contains('hidden'),
        resourcesUnchanged:state.player.gold === before.gold &&
          state.player.prestige === before.prestige &&
          state.player.piety === before.piety &&
          protagonist.health === before.health,
        scheduleUnchanged:duty.nextDueTurn === before.nextDueTurn &&
          duty.lastResolvedTurn === before.lastResolvedTurn
      };
    });

    expect(result).toEqual({
      queuedAndRendered:true,
      resourcesUnchanged:true,
      scheduleUnchanged:true
    });
  });

test('replay protection prevents double-charging effects on replayed event options',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'test');
      const firstDuty = tenure.duties[0];
      const ev = FB.eventById(firstDuty.eventId);
      state.turn = firstDuty.nextDueTurn;

      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };

      state.player.gold = 50;

      const firstReceipt = FB.resolveEventOption(state, ev, ev.options[0], ctx, { automated: false });
      const goldAfterFirst = state.player.gold;

      const secondReceipt = FB.resolveEventOption(state, ev, ev.options[0], ctx, { automated: false });
      const goldAfterSecond = state.player.gold;

      return {
        firstResolved: !!firstReceipt,
        secondResolved: secondReceipt,
        goldAfterFirst: goldAfterFirst,
        goldAfterSecond: goldAfterSecond
      };
    });

    expect(result.firstResolved).toBe(true);
    expect(result.secondResolved).toBe(false);
    expect(result.goldAfterSecond).toBe(result.goldAfterFirst);
  });

test('travel invalidates tenure context and halts daily scheduler while away',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'test');
      const firstDuty = tenure.duties[0];
      const ev = FB.eventById(firstDuty.eventId);
      state.turn = firstDuty.nextDueTurn;

      const ctx = {
        tenureFormedTurn: tenure.formedTurn,
        archetypeId: tenure.archetypeId,
        dutyId: firstDuty.id,
        dueTurn: firstDuty.nextDueTurn,
        protagonistId: state.player.charId,
        locationId: state.player.provinceId
      };

      const validAtHome = FB.fns.serf_tenure_context_valid(state, ctx, ev);

      // Start traveling
      state.player.travel = {
        phase: 'outbound',
        currentId: 'paris',
        destinationId: 'rome'
      };

      const validWhileTraveling = FB.fns.serf_tenure_context_valid(state, ctx, ev);

      FB.tenureDay(state);
      const queueLengthWhileTraveling = (state.eventQueue || []).length;

      // Return home
      delete state.player.travel;
      FB.tenureDay(state);
      const queueLengthAtHome = (state.eventQueue || []).length;

      return {
        validAtHome: validAtHome,
        validWhileTraveling: validWhileTraveling,
        queueLengthWhileTraveling: queueLengthWhileTraveling,
        queueLengthAtHome: queueLengthAtHome
      };
    });

    expect(result.validAtHome).toBe(true);
    expect(result.validWhileTraveling).toBe(false);
    expect(result.queueLengthWhileTraveling).toBe(0);
    expect(result.queueLengthAtHome).toBeGreaterThanOrEqual(1);
  });

test('serf tenure details render across archetypes in Station & home with stable data attributes and Escape dismissal',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await rank.click();

    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-duty]').first()).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-next-due]')).toBeVisible();

    // Verify keyboard dismissal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });
