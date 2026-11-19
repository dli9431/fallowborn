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

test('quartering duty triggers at most once per eligible war, cancels on peace, and allows distinct subsequent wars',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'war_test');
      const qDuty = tenure.conditional.filter(function (c) { return c.id === 'officers_quartered'; })[0];

      // 1. Declare War 1 against Normandy
      state.realms.france = { id: 'france', alive: true, war: { enemy: 'normandy', years: 0 } };
      state.owner[tenure.provinceId] = 'france';

      FB.wakeSerfTenureWarCheck(state);
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
      const resolveCtx = FB.eventContextFor(state, ev, ctx);
      const war1Receipt = FB.resolveEventOption(state, ev, ev.options[0],
        resolveCtx, { automated: false });
      const clearedAfterResolve = qDuty.pendingTurn === null;
      const cooldownTurn = qDuty.nextEligibleTurn;

      // Further days in SAME War 1 do NOT trigger quartering again
      FB.tenureDay(state);
      const noRetriggerInSameWar = qDuty.pendingTurn === null;

      // 2. Peace occurs — resets war tracking
      state.realms.france.war = null;
      FB.wakeSerfTenureWarCheck(state);
      FB.tenureDay(state);
      const warEnded = qDuty.currentWarId === null;

      // 3. A distinct war during cooldown remains ineligible.
      state.realms.france.war = { enemy: 'england', years: 0 };
      FB.wakeSerfTenureWarCheck(state);
      FB.tenureDay(state);
      const warId2 = qDuty.currentWarId;
      const cooldownWarSkipped = warId2 !== warId1 && qDuty.pendingTurn === null;

      // End War 2, let the 12-season cooldown elapse, then start War 3.
      state.realms.france.war = null;
      FB.wakeSerfTenureWarCheck(state);
      FB.tenureDay(state);
      state.turn = cooldownTurn;
      state.realms.france.war = { enemy: 'normandy', years: 0 };
      FB.wakeSerfTenureWarCheck(state);
      FB.tenureDay(state);
      const warId3 = qDuty.currentWarId;
      const pendingTurnWar3 = qDuty.pendingTurn;
      const laterEligibleWarTriggered = warId3 !== warId2 && pendingTurnWar3 !== null;

      // 4. War 3 ends before resolution — pending obligation is canceled cleanly.
      state.realms.france.war = null;
      FB.wakeSerfTenureWarCheck(state);
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
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'season_limit_test');

      // Schedule two duties due today
      tenure.duties[0].nextDueTurn = state.turn;
      tenure.duties[1].nextDueTurn = state.turn;
      FB.refreshSerfTenureDueCache(state, tenure);
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
    await startSerfGame(page, testInfo);
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
    await startSerfGame(page, testInfo);
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

      const resolveCtx = FB.eventContextFor(state, ev, ctx);
      const firstReceipt = FB.resolveEventOption(state, ev, ev.options[0],
        resolveCtx, { automated: false });
      const goldAfterFirst = state.player.gold;

      const secondReceipt = FB.resolveEventOption(state, ev, ev.options[0],
        resolveCtx, { automated: false });
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
    await startSerfGame(page, testInfo);
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

test('Phase 5 local authority succession keeps exact people, queues one review, and confirms without changing terms',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const oldLord = FB.getRole(state, 'lord', true);
      FB.ensureSerfTenure(state, 'legacy_repair');
      const checkpointLordId = tenure.authorityCheckpoint.localLordId;
      const dutiesBefore = JSON.stringify(tenure.duties);
      const rightsBefore = JSON.stringify(tenure.rights);
      const heirId = state.realms[tenure.authorityCheckpoint.holderRealmId].succession.heirId;
      const heir = state.realms[tenure.authorityCheckpoint.holderRealmId].succession.members[heirId];
      const existingHeirId = heir.charId;
      const rngBefore = JSON.stringify(FB.getRngState());
      FB.killChar(state, oldLord);
      const afterDeath = state.player.tenureTransition;
      const deathRevision = afterDeath && afterDeath.revision;
      const deathCauses = afterDeath && afterDeath.causes.slice();
      const exactFormer = FB.localLordAt(state, oldLord.id, true);
      state.roles.lord = oldLord.id;
      state.eventQueue = [];
      FB.tenureDay(state);
      const replacement = FB.getRole(state, 'lord', false);
      const record = state.player.tenureTransition;
      const rngAfterReplacement = JSON.stringify(FB.getRngState());
      const queued = state.eventQueue.filter(function (item) {
        return item.id === 'serf_tenure_review';
      });
      const event = FB.eventById('serf_tenure_review');
      const contextValid = queued.length === 1 &&
        FB.fns.serf_tenure_transition_valid(state, queued[0].ctx);
      const receipt = queued.length && FB.resolveEventOption(
        state, event, event.options[0], queued[0].ctx, { automated:false });
      return {
        checkpointLordId:checkpointLordId,
        oldLordId:oldLord.id,
        exactFormerDead:!!(exactFormer && exactFormer.dead),
        deathRevision:deathRevision,
        deathCauses:deathCauses,
        coalescedRevision:record && record.revision,
        oldAuthorityId:record && record.oldAuthority.localLordId,
        newAuthorityId:record && record.newAuthority.localLordId,
        replacementId:replacement.id,
        queueCount:queued.length,
        contextValid:contextValid,
        receipt:!!receipt,
        cleared:!state.player.tenureTransition,
        tenureRevision:tenure.revision,
        cooldown:tenure.transitionEligibleTurn - state.turn,
        dutiesUnchanged:JSON.stringify(tenure.duties) === dutiesBefore,
        rightsUnchanged:JSON.stringify(tenure.rights) === rightsBefore,
        historyOutcome:tenure.transitionHistory.length &&
          tenure.transitionHistory[tenure.transitionHistory.length - 1].outcome,
        existingHeir:existingHeirId === replacement.id,
        rngPreserved:rngBefore === rngAfterReplacement
      };
    });

    expect(result.checkpointLordId).toBe(result.oldLordId);
    expect(result.exactFormerDead).toBe(true);
    // The reigning county holder's death records both political succession
    // and the exact local person's replacement in the same review.
    expect(result.deathRevision).toBe(2);
    expect(result.deathCauses).toEqual(['local_lord_succession', 'holder_succession']);
    expect(result.coalescedRevision).toBe(result.deathRevision);
    expect(result.oldAuthorityId).toBe(result.oldLordId);
    expect(result.newAuthorityId).toBe(result.replacementId);
    expect(result.queueCount).toBe(1);
    expect(result.contextValid).toBe(true);
    expect(result.receipt).toBe(true);
    expect(result.cleared).toBe(true);
    expect(result.tenureRevision).toBe(0);
    expect(result.cooldown).toBe(360);
    expect(result.dutiesUnchanged).toBe(true);
    expect(result.rightsUnchanged).toBe(true);
    expect(result.historyOutcome).toBe('confirmed');
    expect(result.existingHeir).toBe(true);
    expect(result.rngPreserved).toBe(true);
  });

test('Phase 5 authority snapshots remain pure and unresolved historical rulers fall back to their realm',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const localLord = FB.getRole(state, 'lord', true);
      FB.ensureSerfTenure(state, 'legacy_repair');
      const authority = FB.serfHomeAuthority(state);
      const realm = state.realms[authority.holderRealmId];
      const generation = authority.holderGeneration;
      const current = FB.realmRulerAtGeneration(state,
        authority.holderRealmId, generation);
      const currentName = current && (current.id && state.chars[current.id]
        ? FB.fullName(state.chars[current.id])
        : current.charId && state.chars[current.charId]
          ? FB.fullName(state.chars[current.charId]) : current.name);
      const rngBefore = JSON.stringify(FB.getRngState());
      const again = FB.serfHomeAuthority(state);
      const missing = FB.realmRulerAtGeneration(state,
        authority.holderRealmId, generation + 999);
      const params = FB.textParams(state, state.player.charId,
        '{authorityChange}', {
          transitionCauses:['holder_succession'],
          oldLocalLordId:localLord.id,
          newLocalLordId:localLord.id,
          oldHolderRealmId:authority.holderRealmId,
          oldHolderGeneration:generation + 999,
          newHolderRealmId:authority.holderRealmId,
          newHolderGeneration:generation,
          oldSovereignRealmId:authority.sovereignRealmId,
          oldSovereignGeneration:authority.sovereignGeneration,
          newSovereignRealmId:authority.sovereignRealmId,
          newSovereignGeneration:authority.sovereignGeneration,
          oldRulerCultureTraditionId:authority.rulerCultureTraditionId,
          newRulerCultureTraditionId:authority.rulerCultureTraditionId,
          oldHouseholdFaithRelation:authority.householdFaithRelation,
          newHouseholdFaithRelation:authority.householdFaithRelation
        }, false);
      return {
        localLordId:authority.localLordId,
        holderRealmId:authority.holderRealmId,
        sovereignRealmId:authority.sovereignRealmId,
        stable:JSON.stringify(authority) === JSON.stringify(again),
        missing:missing,
        fallbackText:params.authorityChange,
        realmName:realm.name,
        currentName:currentName,
        rngStable:rngBefore === JSON.stringify(FB.getRngState()),
        tenureUnchanged:tenure.revision === 0
      };
    });

    expect(result.localLordId).toBeTruthy();
    expect(result.holderRealmId).toBeTruthy();
    expect(result.localLordId).not.toBe(result.holderRealmId);
    expect(result.sovereignRealmId).toBeTruthy();
    expect(result.stable).toBe(true);
    expect(result.missing).toBeNull();
    expect(result.fallbackText).toContain(result.realmName);
    expect(result.fallbackText).toContain(result.currentName);
    expect(result.rngStable).toBe(true);
    expect(result.tenureUnchanged).toBe(true);
  });

test('Phase 5 authority proposals add and commute bounded duties while preserving schedules and stale identities',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const home = tenure.provinceId;
      const settlement = tenure.settlement;
      const site = FB.world.sitesByProv[home].list[settlement];
      const originalKind = site.kind;
      const realmIds = Object.keys(state.realms).filter(function (rid) {
        return rid !== 'player' && state.realms[rid] && state.realms[rid].alive;
      });
      const originalHolder = state.holder[home] || state.owner[home];
      const nextRealms = realmIds.filter(function (rid) {
        return rid !== originalHolder;
      });
      tenure.archetypeId = 'dependent_farming';
      tenure.duties = [
        { id:'customary_labor', eventId:'serf_weekwork_tally',
          nextDueTurn:state.turn + 300, lastResolvedTurn:null },
        { id:'seasonal_harvest', eventId:'serf_boon_harvest',
          nextDueTurn:state.turn + 600, lastResolvedTurn:null }
      ];
      tenure.rights = [];
      tenure.revision = 0;
      tenure.transitionHistory = [];
      FB.refreshSerfTenureDueCache(state, tenure);
      tenure.authorityCheckpoint = FB.serfHomeAuthority(state);
      tenure.authorityCheckpoint.acknowledgedTurn = state.turn;
      site.kind = 'village';

      const beforeAdd = FB.serfHomeAuthority(state);
      state.holder[home] = nextRealms[0];
      state.owner[home] = nextRealms[0];
      const afterAdd = FB.serfHomeAuthority(state);
      const rngBeforeRouter = JSON.stringify(FB.getRngState());
      FB.noteSerfHomeTransition(state, 'county_transfer', beforeAdd, afterAdd);
      const rngAfterAddRouter = JSON.stringify(FB.getRngState());
      const addRecord = state.player.tenureTransition;
      const addProposal = addRecord.proposal;
      const pendingResolve = FB.resolveSerfTenureTransition(
        state, addRecord.revision, 'accept');
      state.eventQueue = [];
      FB.tenureDay(state);
      const addResolved = FB.resolveSerfTenureTransition(
        state, addRecord.revision, 'accept');
      const added = tenure.duties.filter(function (duty) {
        return duty.id === 'authority_cartage';
      })[0];
      const addDelay = added && added.nextDueTurn - state.turn;
      if (!added) throw new Error('The queued authority amendment must add its named duty.');
      added.nextDueTurn = state.turn + 700;

      site.kind = 'town';
      tenure.transitionEligibleTurn = state.turn;
      const labor = tenure.duties[0];
      const dueBeforeCommutation = labor.nextDueTurn;
      const beforeCommute = FB.serfHomeAuthority(state);
      state.holder[home] = nextRealms[1];
      state.owner[home] = nextRealms[1];
      const afterCommute = FB.serfHomeAuthority(state);
      const rngBeforeCommuteRouter = JSON.stringify(FB.getRngState());
      FB.noteSerfHomeTransition(state, 'county_transfer',
        beforeCommute, afterCommute);
      const rngAfterCommuteRouter = JSON.stringify(FB.getRngState());
      const commuteRecord = state.player.tenureTransition;
      const commuteProposal = commuteRecord.proposal;
      state.eventQueue = [];
      FB.tenureDay(state);
      const commuteItem = state.eventQueue.find(function (item) {
        return item.id === 'serf_tenure_review';
      });
      const reviewEvent = FB.eventById('serf_tenure_review');
      const remoteLordId = commuteRecord.newAuthority.localLordId;
      const remoteLordHome = FB.characterResidence(state, state.chars[remoteLordId]);
      const remoteReviewValid = !!commuteItem &&
        FB.eventContextStillValid(state, reviewEvent, commuteItem.ctx);
      const staleRevision = commuteRecord.revision;
      const commuteResolved = FB.resolveSerfTenureTransition(
        state, commuteRecord.revision, 'accept');
      const consumedReviewValid = !!commuteItem &&
        FB.eventContextStillValid(state, reviewEvent, commuteItem.ctx);
      const staleResolve = FB.resolveSerfTenureTransition(
        state, staleRevision, 'accept');

      state.eventQueue = [];
      tenure.lastPresentedSeasonKey = null;
      state.turn = labor.nextDueTurn;
      FB.tenureDay(state);
      const dueItem = state.eventQueue.filter(function (item) {
        return item.id === 'serf_commuted_due';
      })[0];
      const dueEvent = FB.eventById('serf_commuted_due');
      const nonGoldReady = !!(dueItem &&
        FB.eventOptionStatus(state, dueEvent, dueEvent.options[1],
          dueItem.ctx).ready);
      const healthBefore = state.chars[state.player.charId].health;
      const dueReceipt = dueItem && FB.resolveEventOption(state, dueEvent,
        dueEvent.options[1], dueItem.ctx, { automated:false });
      const commutedView = FB.tenureView(state).duties.filter(function (duty) {
        return duty.id === 'customary_labor';
      })[0];
      site.kind = originalKind;
      return {
        addKind:addProposal.kind,
        addId:addProposal.additionalDutyId,
        pendingResolve:pendingResolve,
        addResolved:addResolved,
        addDelay:addDelay,
        routerRngStable:rngBeforeRouter === rngAfterAddRouter &&
          rngBeforeCommuteRouter === rngAfterCommuteRouter,
        revisionAfterAdd:commuteRecord.tenureRevision,
        commuteKind:commuteProposal.kind,
        commuteDutyId:commuteProposal.dutyId,
        commuteGold:commuteProposal.commutationGold,
        commuteResolved:commuteResolved,
        remoteLordHome:remoteLordHome,
        tenureHome:home,
        remoteReviewValid:remoteReviewValid,
        consumedReviewValid:consumedReviewValid,
        staleResolve:staleResolve,
        laborEventId:labor.eventId,
        laborMode:labor.mode,
        duePreserved:dueBeforeCommutation === labor.lastResolvedTurn ||
          dueBeforeCommutation < labor.nextDueTurn,
        originalInterval:labor.originalIntervalTurns,
        dueContextRevision:dueItem && dueItem.ctx.tenureRevision,
        activeRevision:tenure.revision,
        nonGoldReady:nonGoldReady,
        dueReceipt:!!dueReceipt,
        healthCost:healthBefore - state.chars[state.player.charId].health,
        nextInterval:labor.nextDueTurn - dueBeforeCommutation,
        viewMode:commutedView.mode,
        viewGold:commutedView.commutationGold,
        historyLength:tenure.transitionHistory.length,
        historyOutcomes:tenure.transitionHistory.map(function (entry) {
          return entry.outcome;
        }),
        technologyImpact:FBDATA.techImpactReviews.features
          .serf_tenure_authority_review.mode
      };
    });

    expect(result.addKind).toBe('add_duty');
    expect(result.addId).toBe('authority_cartage');
    expect(result.pendingResolve).toBe(false);
    expect(result.addResolved).toBe(true);
    expect(result.addDelay).toBeGreaterThanOrEqual(180);
    expect(result.routerRngStable).toBe(true);
    expect(result.revisionAfterAdd).toBe(1);
    expect(result.commuteKind).toBe('commute_duty');
    expect(result.commuteDutyId).toBe('customary_labor');
    expect(result.commuteGold).toBe(3);
    expect(result.commuteResolved).toBe(true);
    expect(result.remoteLordHome).not.toBe(result.tenureHome);
    expect(result.remoteReviewValid).toBe(true);
    expect(result.consumedReviewValid).toBe(false);
    expect(result.staleResolve).toBe(false);
    expect(result.laborEventId).toBe('serf_commuted_due');
    expect(result.laborMode).toBe('coin');
    expect(result.duePreserved).toBe(true);
    expect(result.originalInterval).toBe(720);
    expect(result.dueContextRevision).toBe(result.activeRevision);
    expect(result.nonGoldReady).toBe(true);
    expect(result.dueReceipt).toBe(true);
    expect(result.healthCost).toBe(1);
    expect(result.nextInterval).toBe(720);
    expect(result.viewMode).toBe('coin');
    expect(result.viewGold).toBe(3);
    expect(result.historyLength).toBe(2);
    expect(result.historyOutcomes).toEqual(['added_duty','commuted_duty']);
    expect(result.technologyImpact).toBe('none');
  });

test('Phase 5 authority review keeps former and current people navigable at a 390px viewport',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await startSerfGame(page, testInfo);
    const people = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const former = FB.getRole(state, 'lord', true);
      FB.ensureSerfTenure(state, 'legacy_repair');
      FB.killChar(state, former);
      const current = FB.getRole(state, 'lord', true);
      state.eventQueue = [];
      FB.tenureDay(state);
      const item = state.eventQueue.filter(function (queued) {
        return queued.id === 'serf_tenure_review';
      })[0];
      state.eventQueue = [];
      FB.ui.runEvents([item]);
      return {
        formerId:former.id, formerName:FB.fullName(former),
        currentId:current.id, currentName:FB.fullName(current)
      };
    });

    await expect(page.getByRole('heading', {
      name:'The Custom Under New Authority', exact:true
    })).toBeVisible();
    await expect(page.locator('#ev-text')).toContainText(
      'local-lord succession');
    await expect(page.locator('#ev-text')).toContainText(people.formerName);
    await expect(page.locator('#ev-text')).toContainText(people.currentName);
    const formerCard = page.locator(
      '[data-event-participant="formerLord"]');
    const currentCard = page.locator(
      '[data-event-participant="currentLord"]');
    await expect(formerCard).toHaveCount(1);
    await expect(currentCard).toHaveCount(1);
    await expect(formerCard).toContainText(people.formerName);
    await expect(currentCard).toContainText(people.currentName);
    await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
    await formerCard.locator(
      '[data-event-character="' + people.formerId + '"]').click();
    await expect(page.getByRole('heading', {
      name:people.formerName, exact:true
    })).toBeVisible();
    await expect(page.locator('#cm-close')).toContainText('Back');
    await page.locator('#cm-close').click();
    await expect(page.getByRole('heading', {
      name:'The Custom Under New Authority', exact:true
    })).toBeVisible();
    await expect(formerCard.locator(
      '[data-event-character="' + people.formerId + '"]')).toBeFocused();
  });

test('Phase 5 effective custom confirmation restores and later challenges only the recorded right',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const home = tenure.provinceId;
      tenure.archetypeId = 'latin_manorial';
      tenure.rights = [];
      tenure.transitionHistory = [{
        id:'tt:test:1', turn:state.turn, causes:['county_transfer'],
        outcome:'challenged_right', dutyId:null,
        rightId:'gleaning_after_harvest',
        oldHolderRealmId:null, oldHolderGeneration:null,
        newHolderRealmId:null, newHolderGeneration:null,
        provenance:'authority_review', provenanceDetail:null
      }];
      if (FB.hasModifier(state, 'custom_confirmed', home)) {
        FB.removeModifier(state, 'custom_confirmed', home);
      }
      delete state.player.tenureTransition;
      tenure.authorityCheckpoint = FB.serfHomeAuthority(state);
      tenure.authorityCheckpoint.acknowledgedTurn = state.turn;

      const added = FB.addModifier(state, 'custom_confirmed', home,
        { silent:true });
      const restoreRecord = state.player.tenureTransition;
      const restoreRevision = restoreRecord.revision;
      const repeated = FB.addModifier(state, 'custom_confirmed', home,
        { silent:true });
      const revisionAfterRepeat = state.player.tenureTransition.revision;
      state.eventQueue = [];
      FB.tenureDay(state);
      const restored = FB.resolveSerfTenureTransition(state,
        restoreRecord.revision, 'restore');

      tenure.transitionEligibleTurn = state.turn;
      const removed = FB.removeModifier(state, 'custom_confirmed', home);
      const challengeRecord = state.player.tenureTransition;
      state.eventQueue = [];
      FB.tenureDay(state);
      const preserved = FB.resolveSerfTenureTransition(state,
        challengeRecord.revision, 'preserve');
      return {
        added:added, repeated:repeated,
        restoreKind:restoreRecord.proposal.kind,
        restoreRight:restoreRecord.proposal.rightId,
        restoreRevision:restoreRevision,
        revisionAfterRepeat:revisionAfterRepeat,
        restored:restored,
        rightPresent:tenure.rights.indexOf('gleaning_after_harvest') >= 0,
        removed:removed,
        challengeKind:challengeRecord.proposal.kind,
        challengeRight:challengeRecord.proposal.rightId,
        preserved:preserved,
        tenureRevision:tenure.revision,
        outcomes:tenure.transitionHistory.map(function (entry) {
          return entry.outcome;
        })
      };
    });

    expect(result.added).toBe(true);
    expect(result.repeated).toBe(true);
    expect(result.restoreKind).toBe('restore_right');
    expect(result.restoreRight).toBe('gleaning_after_harvest');
    expect(result.revisionAfterRepeat).toBe(result.restoreRevision);
    expect(result.restored).toBe(true);
    expect(result.rightPresent).toBe(true);
    expect(result.removed).toBe(true);
    expect(result.challengeKind).toBe('challenge_right');
    expect(result.challengeRight).toBe('gleaning_after_harvest');
    expect(result.preserved).toBe(true);
    expect(result.tenureRevision).toBe(1);
    expect(result.outcomes).toEqual([
      'challenged_right','restored_right','preserved_terms'
    ]);
  });

test('Station & home links the current lord without exposing tenure ledgers and supports Escape dismissal',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await startSerfGame(page, testInfo);
    const lord = await page.evaluate(function () {
      const c = FB.getRole(FB.state, 'lord', true);
      FB.ui.refresh();
      FB.ui.showTab('char');
      return { id:c.id, name:FB.fullName(c) };
    });
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await rank.click();

    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-duty]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-next-due]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-work]')).toHaveCount(0);
    await expect(page.locator('#gm-body [data-tenure-right]')).toHaveCount(0);
    const lordLink = page.locator(
      '[data-tenure-character="' + lord.id + '"]').first();
    await expect(lordLink).toBeVisible();
    await lordLink.click();
    await expect(page.getByRole('heading', { name:lord.name })).toBeVisible();
    await expect(page.locator('#cm-close')).toContainText('Back');
    await page.locator('#cm-close').click();
    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(lordLink).toBeFocused();
    await lordLink.click();
    await page.evaluate(function () { history.back(); });
    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(lordLink).toBeFocused();

    // Verify keyboard dismissal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });
