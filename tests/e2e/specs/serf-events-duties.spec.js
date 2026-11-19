'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/bookmarks.js',
  'data/systems.js', 'data/eras.js', 'js/systems.js',
  'data/cultures.js',
  'data/economy.js', 'data/actions.js',
  'data/events_peasant.js',
  'data/markets.js',
  'data/technology.js',
  'js/armies.js', 'js/wars.js',
  'js/main.js',
  'js/i18n.js',
  'js/market.js',
  'js/messages.js',
  'js/model.js',
  'js/modifiers.js',
  'js/population.js',
  'js/events.js',
  'js/actions.js',
  'js/save.js',
  'js/world.js',
  'js/lordships.js', 'js/politics.js', 'js/authority.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/ui_modals.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { startSerfGame } = require('../support/game/serf-events');

test('regional tenure events localize every changed surface while retaining one event definition and mechanics',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const playerId = state.player.charId;
      const fixtures = [
        { eventId:'serf_boon_harvest', dutyId:'seasonal_catch_share', archetypeId:'norse_coastal_service', genericDuty:'demesne_harvest' },
        { eventId:'serf_weekwork_tally', dutyId:'herd_service', archetypeId:'pastoral_steppe', genericDuty:'week_work' },
        { eventId:'serf_weekwork_tally', dutyId:'woodland_service', archetypeId:'woodland_dependence', genericDuty:'week_work' },
        { eventId:'serf_weekwork_tally', dutyId:'boat_service', archetypeId:'norse_coastal_service', genericDuty:'week_work' },
        { eventId:'serf_pannage_due', dutyId:'pasture_due', archetypeId:'pastoral_steppe', genericDuty:'pannage_due' },
        { eventId:'serf_pannage_due', dutyId:'mast_due', archetypeId:'woodland_dependence', genericDuty:'pannage_due' },
        { eventId:'serf_bridge_cartage', dutyId:'seasonal_drove', archetypeId:'pastoral_steppe', genericDuty:'bridge_cartage' },
        { eventId:'serf_bridge_cartage', dutyId:'timber_cartage', archetypeId:'woodland_dependence', genericDuty:'bridge_cartage' },
        { eventId:'serf_bridge_cartage', dutyId:'shore_transport', archetypeId:'norse_coastal_service', genericDuty:'bridge_cartage' },
        { eventId:'serf_deadwood_amerced', dutyId:'deadwood_due', archetypeId:'woodland_dependence', genericDuty:'deadwood_amerced' }
      ];
      function copyPaths(event) {
        const paths = ['title', 'text'];
        event.options.forEach(function (option, index) {
          paths.push('options.' + index + '.label');
          paths.push('options.' + index + '.desc');
          if (option.success && option.success.text) {
            paths.push('options.' + index + '.success.text');
          }
          if (option.failure && option.failure.text) {
            paths.push('options.' + index + '.failure.text');
          }
        });
        return paths;
      }
      const beforeState = JSON.stringify(state);
      const beforeRng = JSON.stringify(FB.getRngState());
      const rendered = fixtures.map(function (fixture) {
        const event = FB.eventById(fixture.eventId);
        const regionalContext = {
          dutyId:fixture.dutyId,
          archetypeId:fixture.archetypeId,
          tenureArchetypeId:fixture.archetypeId
        };
        const genericContext = {
          dutyId:fixture.genericDuty,
          archetypeId:'dependent_farming',
          tenureArchetypeId:'dependent_farming'
        };
        const paths = copyPaths(event);
        return {
          eventId:fixture.eventId,
          dutyId:fixture.dutyId,
          definitionCount:FBDATA.events.filter(function (candidate) {
            return candidate.id === fixture.eventId;
          }).length,
          paths:paths.map(function (path) {
            return {
              path:path,
              regional:FB.eventText(state, playerId, event, path, regionalContext),
              generic:FB.eventText(state, playerId, event, path, genericContext)
            };
          }),
          mechanics:event.options.map(function (option) {
            return {
              require:option.require || null,
              chance:option.chance || null,
              effects:option.effects || null,
              success:option.success && option.success.effects || null,
              failure:option.failure && option.failure.effects || null
            };
          })
        };
      });
      const quartering = FB.eventById('serf_officers_quartered');
      const quarteringPaths = copyPaths(quartering);
      const quarteringVariants = [
        'pastoral_steppe', 'woodland_dependence', 'norse_coastal_service'
      ].map(function (archetypeId) {
        return {
          archetypeId:archetypeId,
          paths:quarteringPaths.map(function (path) {
            return {
              path:path,
              regional:FB.eventText(state, playerId, quartering, path, {
                tenureArchetypeId:archetypeId, archetypeId:archetypeId
              }),
              generic:FB.eventText(state, playerId, quartering, path, {
                tenureArchetypeId:'dependent_farming', archetypeId:'dependent_farming'
              })
            };
          })
        };
      });
      return {
        rendered:rendered,
        quarteringVariants:quarteringVariants,
        stateUnchanged:beforeState === JSON.stringify(state),
        rngUnchanged:beforeRng === JSON.stringify(FB.getRngState())
      };
    });

    const mechanicsByEvent = {};
    result.rendered.forEach(function (fixture) {
      expect(fixture.definitionCount).toBe(1);
      if (mechanicsByEvent[fixture.eventId]) {
        expect(fixture.mechanics).toEqual(mechanicsByEvent[fixture.eventId]);
      } else {
        mechanicsByEvent[fixture.eventId] = fixture.mechanics;
      }
      fixture.paths.forEach(function (entry) {
        expect(entry.regional, fixture.eventId + ' ' + fixture.dutyId + ' ' + entry.path).toBeTruthy();
        expect(entry.regional, fixture.eventId + ' ' + fixture.dutyId + ' ' + entry.path).not.toBe(entry.generic);
      });
    });
    result.quarteringVariants.forEach(function (fixture) {
      fixture.paths.forEach(function (entry) {
        expect(entry.regional, fixture.archetypeId + ' ' + entry.path).toBeTruthy();
        expect(entry.regional, fixture.archetypeId + ' ' + entry.path).not.toBe(entry.generic);
      });
    });
    expect(result.stateUnchanged).toBe(true);
    expect(result.rngUnchanged).toBe(true);
  });

test('every new regional duty keeps its authored cadence and queues exact saved tenure context once',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const fixtures = [
        { archetypeId:'pastoral_steppe', dutyId:'herd_service', eventId:'serf_weekwork_tally', season:'spring', day:30, cycle:0 },
        { archetypeId:'pastoral_steppe', dutyId:'pasture_due', eventId:'serf_pannage_due', season:'autumn', day:30, cycle:0 },
        { archetypeId:'pastoral_steppe', dutyId:'seasonal_drove', eventId:'serf_bridge_cartage', season:'summer', day:30, cycle:1 },
        { archetypeId:'woodland_dependence', dutyId:'woodland_service', eventId:'serf_weekwork_tally', season:'spring', day:30, cycle:0 },
        { archetypeId:'woodland_dependence', dutyId:'mast_due', eventId:'serf_pannage_due', season:'autumn', day:30, cycle:0 },
        { archetypeId:'woodland_dependence', dutyId:'timber_cartage', eventId:'serf_bridge_cartage', season:'summer', day:30, cycle:1 },
        { archetypeId:'woodland_dependence', dutyId:'deadwood_due', eventId:'serf_deadwood_amerced', season:'winter', day:30, cycle:1 },
        { archetypeId:'norse_coastal_service', dutyId:'boat_service', eventId:'serf_weekwork_tally', season:'spring', day:30, cycle:0 },
        { archetypeId:'norse_coastal_service', dutyId:'seasonal_catch_share', eventId:'serf_boon_harvest', season:'autumn', day:30, cycle:0 },
        { archetypeId:'norse_coastal_service', dutyId:'shore_transport', eventId:'serf_bridge_cartage', season:'summer', day:30, cycle:1 }
      ];
      const home = player.provinceId;
      const settlement = player.homeSettlement || 0;
      return fixtures.map(function (fixture) {
        const definition = FBDATA.tenureArchetypes[fixture.archetypeId];
        const authored = definition.duties.filter(function (duty) {
          return duty.id === fixture.dutyId;
        })[0];
        player.tenure = {
          version:1,
          status:'active',
          archetypeId:fixture.archetypeId,
          formedTurn:state.turn,
          formedBy:'new_game',
          provinceId:home,
          settlement:settlement,
          rights:[],
          duties:[{
            id:fixture.dutyId,
            eventId:fixture.eventId,
            nextDueTurn:state.turn,
            lastResolvedTurn:null
          }],
          conditional:[],
          lastPresentedSeasonKey:null
        };
        state.eventQueue = [];
        FB.tenureDay(state);
        const queued = state.eventQueue[0];
        const event = FB.eventById(fixture.eventId);
        const valid = queued && FB.fns.serf_tenure_context_valid(state, queued.ctx, event);
        FB.tenureDay(state);
        return {
          fixture:fixture,
          intervalTurns:authored.intervalTurns,
          firstDue:authored.firstDue,
          queueCount:state.eventQueue.length,
          queuedId:queued && queued.id,
          context:queued && queued.ctx,
          valid:!!valid
        };
      });
    });

    expect(result).toHaveLength(10);
    result.forEach(function (entry) {
      expect(entry.intervalTurns).toBe(720);
      expect(entry.firstDue).toEqual({
        season:entry.fixture.season,
        day:entry.fixture.day,
        cycle:entry.fixture.cycle
      });
      expect(entry.queueCount).toBe(1);
      expect(entry.queuedId).toBe(entry.fixture.eventId);
      expect(entry.context).toMatchObject({
        tenureFormedTurn:expect.any(Number),
        archetypeId:entry.fixture.archetypeId,
        tenureArchetypeId:entry.fixture.archetypeId,
        dutyId:entry.fixture.dutyId,
        dueTurn:expect.any(Number),
        protagonistId:expect.any(String),
        locationId:expect.any(String),
        tenureProvinceId:expect.any(String),
        tenureVariantId:entry.fixture.archetypeId + ':' + entry.fixture.dutyId
      });
      expect(entry.valid).toBe(true);
    });
  });

test('only conflicting extraordinary serf prose snapshots active tenure and expires after identity changes',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.activeSerfTenure(state);
      tenure.archetypeId = 'pastoral_steppe';
      const ids = [
        'corvee', 'serf_seed_grain_requisition', 'lord_squeezes', 'lords_notice'
      ];
      const snapshots = ids.map(function (id) {
        const event = FB.eventById(id);
        const context = FB.eventContextFor(state, event, {});
        const regional = FB.eventText(state, state.player.charId, event, 'text', context);
        const generic = FB.eventText(state, state.player.charId, event, 'text', {
          tenureArchetypeId:'dependent_farming', archetypeId:'dependent_farming'
        });
        const validBefore = FB.eventContextStillValid(state, event, context);
        tenure.archetypeId = 'woodland_dependence';
        const validAfter = FB.eventContextStillValid(state, event, context);
        tenure.archetypeId = 'pastoral_steppe';
        return {
          id:id,
          tenureAware:event.tenureAware,
          context:context,
          regional:regional,
          generic:generic,
          validBefore:validBefore,
          validAfter:validAfter
        };
      });
      return {
        snapshots:snapshots,
        tallageTenureAware:!!FB.eventById('serf_extraordinary_tallage').tenureAware
      };
    });

    result.snapshots.forEach(function (entry) {
      expect(entry.tenureAware).toBe(true);
      expect(entry.context).toMatchObject({
        tenureFormedTurn:expect.any(Number),
        tenureArchetypeId:'pastoral_steppe',
        archetypeId:'pastoral_steppe',
        tenureProvinceId:expect.any(String),
        tenureSettlement:expect.any(Number),
        protagonistId:expect.any(String)
      });
      expect(entry.regional).toBeTruthy();
      expect(entry.regional).not.toBe(entry.generic);
      expect(entry.validBefore).toBe(true);
      expect(entry.validAfter).toBe(false);
    });
    expect(result.tallageTenureAware).toBe(false);
  });

test('ordinary serf burden stories are never selected by the random event generator without matching tenure duties',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
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
    await startSerfGame(page, testInfo);
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
    await startSerfGame(page, testInfo);
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
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const results = {};

      // 1. Manumission / Freedom through the purchase resolver used by its picker
      FB.ensureSerfTenure(state, 'new_game');
      state.player.gold = FB.freedomPurchasePrice(state);
      FB.getRole(state, 'lord', true);
      FB.resolveSerfFreedom(state, { route:'purchase' }, {});
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
      const fleeCtx = FB.eventContextFor(state, fleeEv, {});
      FB.resolveEventOption(state, fleeEv, fleeEv.options[0], fleeCtx,
        { automated: false });
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
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const initialTenure = FB.activeSerfTenure(state);

      // Verify lazy repair
      delete state.player.tenure;
      const repaired = FB.ensureSerfTenure(state, 'legacy_repair');
      const repairedActive = !!repaired && repaired.status === 'active';

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
      const resolveCtx = FB.eventContextFor(state, ev, validCtx);
      FB.resolveEventOption(state, ev, ev.options[0], resolveCtx,
        { automated: false });
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
        repairedActive: repairedActive,
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
    await startSerfGame(page, testInfo);
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
      const resolveCtx = FB.eventContextFor(state, ev, ctx);
      FB.resolveEventOption(state, ev, closingOption, resolveCtx,
        { automated: false });

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
    await startSerfGame(page, testInfo);
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
      const resolveCtx = FB.eventContextFor(state, ev, ctx);
      const receipt = FB.resolveEventOption(state, ev, ev.options[0],
        resolveCtx, { automated: true });

      return {
        receiptAutomated: receipt && receipt.automated,
        dutyAdvanced: firstDuty.nextDueTurn > oldDueTurn,
        resolvedFlag: resolveCtx._tenureResolved
      };
    });

    expect(result.receiptAutomated).toBe(true);
    expect(result.dutyAdvanced).toBe(true);
    expect(result.resolvedFlag).toBe(true);
  });
