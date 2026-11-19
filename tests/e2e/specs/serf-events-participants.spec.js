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

test('exact participant binding is deterministic, bounded, persistent, and never recasts an existing slot',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      function local(name) {
        return FB.makeCharacter(s, {
          name:name, sex:'m', born:s.date.year - 30,
          culture:s.chars[p.charId].culture,
          religion:s.chars[p.charId].religion,
          station:0, traitsN:0
        });
      }
      const friend = local('Friend Candidate');
      const rival = local('Rival Candidate');
      const attention = local('Attention Candidate');
      const early = local('Early Contact');
      const later = local('Later Contact');
      const notable = FB.getRole(s, 'notable', true);
      s.roles.friend = friend.id;
      s.roles.rival = rival.id;
      p.socialAttention = {};
      p.socialAttention[attention.id] = { startedTurn:10, lastTurn:10 };
      p.friendContacts = {};
      p.friendContacts[later.id] = { startedTurn:30, lastTurn:30 };
      p.friendContacts[early.id] = { startedTurn:20, lastTurn:20 };
      const spec = {
        slot:'neighbor', source:'local_neighbor', required:true,
        createFallback:true, sameHome:true
      };
      const rngBefore = FB.getRngState();
      const candidateStateBefore = JSON.stringify({
        roles:s.roles,
        socialAttention:p.socialAttention,
        friendContacts:p.friendContacts,
        characterIds:Object.keys(s.chars)
      });
      const candidates = FB.eventParticipantCandidates(s, spec, {});
      const candidateStateAfter = JSON.stringify({
        roles:s.roles,
        socialAttention:p.socialAttention,
        friendContacts:p.friendContacts,
        characterIds:Object.keys(s.chars)
      });
      const rngAfterCandidates = FB.getRngState();
      const event = {
        id:'participant_contract_test', title:'A word with {neighbor}',
        text:'{neighbor} waits.', participants:[spec],
        options:[{ label:'Listen.', effects:{} }]
      };
      const ctx = FB.eventContextFor(s, event, {});
      const rngAfterBinding = FB.getRngState();
      const boundId = ctx.participants.neighbor;
      const directLegacyCtx = {};
      const directLegacy = FB.ensureEventParticipants(s, event, directLegacyCtx);
      const directLegacyRepaired = directLegacy === directLegacyCtx &&
        directLegacy.protagonistId === p.charId &&
        directLegacy.locationId === p.provinceId &&
        directLegacy.participants.neighbor === boundId;
      s.roles.friend = early.id;
      const repaired = FB.ensureEventParticipants(s, event, ctx);
      const retainedAfterPriorityChange = repaired.participants.neighbor;
      const retainedStillValid = FB.eventParticipantsStillValid(s, event, ctx);
      const roleEvent = {
        id:'participant_role_kind_test', title:'A word with {lord}',
        text:'{lord} waits.', participants:[{
          slot:'lord', source:'role', role:'lord', required:true, create:true
        }], options:[{ label:'Listen.', effects:{} }]
      };
      const roleCtx = FB.eventContextFor(s, roleEvent, {});
      const falseKindCtx = JSON.parse(JSON.stringify(roleCtx));
      falseKindCtx.participantKinds.lord = 'rival';
      const falseKindInvalid = FB.eventParticipantsStillValid(
        s, roleEvent, falseKindCtx);
      friend.dead = true;
      const deadInvalid = FB.eventParticipantsStillValid(s, event, ctx);
      friend.dead = false;

      const flight = {
        id:'optional_flight_contact_test', title:'The road', text:'Go alone.',
        participants:[{
          slot:'confidant', source:'flight_contact', kindParam:'confidantKind'
        }], options:[{ label:'Wait.', effects:{} }]
      };
      let camelKindParamValid = true;
      try { FB.validateEventParticipants(flight); }
      catch (error) { camelKindParamValid = false; }
      const camelSlots = {
        id:'camel_participant_slots_test', participants:[
          { slot:'formerOfficer', source:'context', allowDead:true },
          {
            slot:'newOfficer', source:'story', storyId:'old_custom',
            storySlot:'newOfficer'
          }
        ]
      };
      let camelSlotsValid = true;
      try { FB.validateEventParticipants(camelSlots); }
      catch (error) { camelSlotsValid = false; }
      delete s.roles.friend;
      delete s.roles.rival;
      const optional = FB.eventContextFor(s, flight, {});

      const invalidSchemas = [];
      const definitions = [
        { id:'too_many', participants:[spec, spec, spec, spec, spec] },
        { id:'duplicate', participants:[spec, spec] },
        { id:'unknown', participants:[{ slot:'x', source:'village_roster' }] },
        { id:'bad_create', participants:[{
          slot:'x', source:'role', role:'rival', create:true
        }] },
        { id:'bad_kind_param', participants:[{
          slot:'x', source:'flight_contact', kindParam:'Confidant Kind'
        }] },
        { id:'bad_slot', participants:[{
          slot:'FormerOfficer', source:'context'
        }] },
        { id:'bad_story_slot', participants:[{
          slot:'officer', source:'story', storyId:'old_custom',
          storySlot:'New Officer'
        }] }
      ];
      definitions.forEach(function (definition) {
        try { FB.validateEventParticipants(definition); }
        catch (error) { invalidSchemas.push(definition.id); }
      });

      s.eventQueue = [];
      const corvee = FB.queueEvent(s, 'corvee', {});
      const queuedParticipants = Object.assign({}, corvee.ctx.participants);
      const wrapper = JSON.parse(FB.save.serialize());
      FB.save.restore(wrapper);
      const restoredParticipants = Object.assign({},
        FB.state.eventQueue[0].ctx.participants);
      return {
        order:candidates.map(function (c) { return c.id; }),
        expected:[friend.id, rival.id, attention.id, early.id, later.id].concat(
          FB.localFolkAt(s, p.provinceId).filter(function (c) {
            return FB.ageOf(c, s.date.year) >= 16 &&
              [friend.id, rival.id, attention.id, early.id, later.id].indexOf(c.id) < 0;
          }).map(function (c) { return c.id; }).sort(), [notable.id]),
        rngStable:rngBefore === rngAfterCandidates &&
          rngBefore === rngAfterBinding,
        candidatePure:candidateStateBefore === candidateStateAfter,
        boundId:boundId,
        directLegacyRepaired:directLegacyRepaired,
        retainedAfterPriorityChange:retainedAfterPriorityChange,
        retainedStillValid:retainedStillValid,
        falseKindInvalid:falseKindInvalid,
        deadInvalid:deadInvalid,
        camelKindParamValid:camelKindParamValid,
        camelSlotsValid:camelSlotsValid,
        optionalHasConfidant:Object.prototype.hasOwnProperty.call(
          optional.participants, 'confidant'),
        invalidSchemas:invalidSchemas,
        queuedParticipants:queuedParticipants,
        restoredParticipants:restoredParticipants
      };
    });

    expect(result.order).toEqual(result.expected);
    expect(result.rngStable).toBe(true);
    expect(result.candidatePure).toBe(true);
    expect(result.boundId).toBe(result.expected[0]);
    expect(result.directLegacyRepaired).toBe(true);
    expect(result.retainedAfterPriorityChange).toBe(result.boundId);
    expect(result.retainedStillValid).toBe(true);
    expect(result.falseKindInvalid).toBe(false);
    expect(result.deadInvalid).toBe(false);
    expect(result.camelKindParamValid).toBe(true);
    expect(result.camelSlotsValid).toBe(true);
    expect(result.optionalHasConfidant).toBe(false);
    expect(result.invalidSchemas).toEqual([
      'too_many','duplicate','unknown','bad_create','bad_kind_param',
      'bad_slot','bad_story_slot'
    ]);
    expect(result.restoredParticipants).toEqual(result.queuedParticipants);
  });

test('Old Custom keeps one cast, bridges an officer change explicitly, and clears on witness loss',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const opener = FB.eventById('old_custom_stakes');
      const ending = FB.eventById('old_custom_end');
      const openerCtx = FB.eventContextFor(s, opener, {});
      p.flags.old_custom_1 = 1;
      FB.syncSerfStoryAfterEvent(s, opener, openerCtx);
      const original = JSON.parse(JSON.stringify(p.serfStory));
      const tenureCast = FB.tenureView(s).oldCustom;

      delete p.flags.old_custom_1;
      p.flags.old_custom_2 = 1;
      const memory = FB.eventById('old_custom_memory');
      const memoryCtx = FB.eventContextFor(s, memory, {});
      FB.syncSerfStoryAfterEvent(s, memory, memoryCtx);
      const stageAfterMemory = p.serfStory.stage;
      const sameCast = p.serfStory.participants.lord === original.participants.lord &&
        p.serfStory.participants.officer === original.participants.officer &&
        p.serfStory.participants.witness === original.participants.witness;

      const former = s.chars[original.participants.officer];
      former.dead = true;
      delete s.roles.steward;
      FB.reconcileSerfStory(s);
      const bridge = s.eventQueue[0];
      const pending = JSON.parse(JSON.stringify(p.serfStory.pendingReplacement));
      const bridgeEvent = FB.eventById('old_custom_officer_changed');
      const formerName = FB.textParams(s, p.charId,
        bridgeEvent.text, bridge.ctx).formerOfficer;
      const bridgeValid = FB.eventContextStillValid(s, bridgeEvent, bridge.ctx);
      const bridgeReceipt = FB.resolveEventOption(s, bridgeEvent,
        bridgeEvent.options[0], bridge.ctx, { automated:true });
      const replaced = p.serfStory.participants.officer;
      const replacementCleared = p.serfStory.pendingReplacement === null;

      const witness = s.chars[p.serfStory.participants.witness];
      witness.dead = true;
      FB.reconcileSerfStory(s);
      const lastNews = s.log[s.log.length - 1];
      p.flags.old_custom_1 = 1;
      p.flags.old_custom_2 = 1;
      FB.reconcileSerfStory(s);
      const malformedCleared = !p.flags.old_custom_1 &&
        !p.flags.old_custom_2 && !p.serfStory;
      return {
        openerChance:opener.trigger.chance,
        openerWeight:opener.weight,
        openerOnce:opener.once,
        endingChance:ending.trigger.chance,
        endingWeight:ending.weight,
        sameCast:sameCast,
        tenureCast:tenureCast,
        originalOfficerId:original.participants.officer,
        originalWitnessId:original.participants.witness,
        stageBeforeBridge:original.stage,
        stageAfterMemory:stageAfterMemory,
        liveStage:p.serfStory && p.serfStory.stage,
        bridgeFirst:bridge && bridge.id,
        pending:pending,
        formerId:former.id,
        formerName:formerName,
        expectedFormerName:FB.fullName(former),
        bridgeValid:bridgeValid,
        bridgeReceipt:!!bridgeReceipt,
        replaced:replaced,
        replacementCleared:replacementCleared,
        storyCleared:!p.serfStory,
        flagsCleared:!p.flags.old_custom_1 && !p.flags.old_custom_2 &&
          !p.flags.old_custom_3 && !p.flags.old_custom_resolve,
        malformedCleared:malformedCleared,
        reason:lastNews && lastNews.msg && lastNews.msg.params &&
          lastNews.msg.params.reason
      };
    });

    expect(result.openerChance).toBe(0.001);
    expect(result.openerWeight).toBe(15);
    expect(result.openerOnce).toBe(true);
    expect(result.endingChance).toBeUndefined();
    expect(result.endingWeight).toBe(80);
    expect(result.sameCast).toBe(true);
    expect(result.tenureCast).toMatchObject({
      witnessId:result.originalWitnessId,
      officerId:result.originalOfficerId
    });
    expect(result.stageBeforeBridge).toBe('memory');
    expect(result.stageAfterMemory).toBe('officer');
    expect(result.liveStage).toBeUndefined();
    expect(result.bridgeFirst).toBe('old_custom_officer_changed');
    expect(result.pending.oldOfficerId).toBe(result.formerId);
    expect(result.formerName).toBe(result.expectedFormerName);
    expect(result.bridgeValid).toBe(true);
    expect(result.bridgeReceipt).toBe(true);
    expect(result.replaced).toBe(result.pending.newOfficerId);
    expect(result.replacementCleared).toBe(true);
    expect(result.storyCleared).toBe(true);
    expect(result.flagsCleared).toBe(true);
    expect(result.malformedCleared).toBe(true);
    expect(result.reason).toBe('witness');
  });

test('shifted quartering returns to the exact neighbor after 90 days and promotion reuses that local person',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const tenure = FB.activeSerfTenure(s);
      const duty = tenure.conditional.filter(function (record) {
        return record.id === 'officers_quartered';
      })[0];
      duty.pendingTurn = s.turn;
      const quartering = FB.eventById('serf_officers_quartered');
      const ctx = FB.eventContextFor(s, quartering, {
        tenureFormedTurn:tenure.formedTurn,
        archetypeId:tenure.archetypeId,
        dutyId:duty.id,
        dueTurn:duty.pendingTurn,
        protagonistId:p.charId,
        locationId:p.provinceId
      });
      const neighborId = ctx.participants.neighbor;
      const neighbor = s.chars[neighborId];
      const beforeStanding = FB.standingOf(s, {
        kind:'character', id:neighborId
      });
      const shifted = FB.resolveEventOption(s, quartering,
        quartering.options[quartering.options.length - 1], ctx,
        { automated:false });
      const record = JSON.parse(JSON.stringify(p.serfNeighborConsequence));
      const afterStanding = FB.standingOf(s, {
        kind:'character', id:neighborId
      });
      const snapshot = JSON.parse(FB.save.serialize());

      s.turn = record.dueTurn - 1;
      FB.reconcileSerfNeighborConsequence(s);
      const beforeDue = s.eventQueue.filter(function (item) {
        return item.id === 'serf_neighbor_reckoning';
      }).length;
      s.turn = record.dueTurn;
      FB.reconcileSerfNeighborConsequence(s);
      const reckoning = s.eventQueue.filter(function (item) {
        return item.id === 'serf_neighbor_reckoning';
      })[0];
      const exactDueNeighbor = reckoning && reckoning.ctx.participants.neighbor;
      p.gold = 20;
      const reckoningEvent = FB.eventById('serf_neighbor_reckoning');
      const reckoningReceipt = FB.resolveEventOption(s, reckoningEvent,
        reckoningEvent.options[0], reckoning.ctx, { automated:true });
      const clearedAfterOutcome = !p.serfNeighborConsequence;

      FB.save.restore(snapshot);
      const restored = FB.state;
      FB.setPlayerTier(restored, 1, { tenureEndReason:'promotion_test' });
      const clearedOnPromotion = !restored.player.serfNeighborConsequence;
      const boundary = FB.eventById('boundary_dispute');
      const boundaryCtx = FB.eventContextFor(restored, boundary, {});
      const recurringId = boundaryCtx.participants.neighbor;
      const recurringName = FB.textParams(restored, restored.player.charId,
        boundary.text, boundaryCtx).neighbor;
      return {
        shifted:!!shifted,
        standingChange:afterStanding - beforeStanding,
        dueDelay:record.dueTurn - record.createdTurn,
        beforeDue:beforeDue,
        exactDueNeighbor:exactDueNeighbor,
        neighborId:neighborId,
        reckoningReceipt:!!reckoningReceipt,
        clearedAfterOutcome:clearedAfterOutcome,
        clearedOnPromotion:clearedOnPromotion,
        recurringId:recurringId,
        recurringName:recurringName,
        expectedName:FB.fullName(restored.chars[neighborId])
      };
    });

    expect(result.shifted).toBe(true);
    expect(result.standingChange).toBe(-15);
    expect(result.dueDelay).toBe(90);
    expect(result.beforeDue).toBe(0);
    expect(result.exactDueNeighbor).toBe(result.neighborId);
    expect(result.reckoningReceipt).toBe(true);
    expect(result.clearedAfterOutcome).toBe(true);
    expect(result.clearedOnPromotion).toBe(true);
    expect(result.recurringId).toBe(result.neighborId);
    expect(result.recurringName).toBe(result.expectedName);
  });

test('named event participants render once and their character sheet returns to the open event',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await startSerfGame(page, testInfo);
    const cast = await page.evaluate(function () {
      const s = FB.state;
      const queued = FB.queueEvent(s, 'corvee', {});
      s.eventQueue = [];
      FB.ui.runEvents([queued]);
      return {
        lord:queued.ctx.participants.lord,
        officer:queued.ctx.participants.officer,
        officerName:FB.fullName(s.chars[queued.ctx.participants.officer])
      };
    });

    await expect(page.locator('[data-event-participant]')).toHaveCount(2);
    await expect(page.locator(
      '[data-event-participant="lord"] [data-event-character="' +
        cast.lord + '"]')).toHaveCount(1);
    const officerButton = page.locator(
      '[data-event-participant="officer"] [data-event-character="' +
        cast.officer + '"]');
    await expect(officerButton).toHaveCount(1);
    await expect(officerButton).toContainText('Steward');
    await expect(officerButton).toContainText('Standing');
    const collapsedHeight = await page.locator(
      '[data-event-participant="officer"]').evaluate(function (node) {
      return node.getBoundingClientRect().height;
    });
    expect(collapsedHeight).toBeLessThanOrEqual(80);
    const participantDetails = page.locator(
      '[data-event-participant="officer"] .event-participant-details');
    await expect(participantDetails).toHaveClass(/hidden/);
    const participantInfo = page.locator(
      '[data-event-participant="officer"] .settcard-info');
    await expect(participantInfo).toBeVisible();
    expect(await page.locator(
      '[data-event-participant="officer"]').evaluate(function (card) {
      return [
        Math.round(card.querySelector('.event-participant-main')
          .getBoundingClientRect().height),
        Math.round(card.querySelector('.settcard-info')
          .getBoundingClientRect().height)
      ];
    })).toEqual([50, 50]);
    await participantInfo.click();
    await expect(participantDetails).not.toHaveClass(/hidden/);
    await participantInfo.click();
    await expect(page.locator('#ev-options .evopt').first()).toBeInViewport();
    await page.setViewportSize({ width:1280, height:800 });
    await expect(participantInfo).toBeHidden();
    await officerButton.hover();
    await expect(page.locator('#tooltip')).toBeVisible();
    await expect(page.locator('#tooltip')).toContainText(cast.officerName);
    await expect(page.locator('#tooltip')).toContainText('Learning');
    // Disclosures work during the opening guard. The sheet's button uses
    // the guarded event input path, so wait until it can receive a click.
    await page.waitForFunction(function () { return !FB.ui.eventInputGuarded(); });
    const eventModal = page.locator('#eventmodal');
    const eventTitle = eventModal.locator('#ev-title');
    const title = await eventTitle.textContent();
    const options = eventModal.locator('#ev-options .evopt');
    const choices = await options.allTextContents();
    const characterSheet = page.locator('#genmodal');
    const officerHeading = characterSheet.getByRole('heading', {
      name:cast.officerName, exact:true
    });

    await officerButton.click();
    await expect(officerHeading).toBeVisible();
    const back = characterSheet.getByRole('button', { name:'Back', exact:true })
      .and(characterSheet.locator('#cm-close'));
    await back.click();
    await expect(characterSheet).toHaveClass(/hidden/);
    await expect(eventModal).not.toHaveClass(/hidden/);
    await expect(eventTitle).toHaveText(title);
    await expect(options).toHaveText(choices);
    await expect(officerButton).toBeFocused();

    await officerButton.click();
    await expect(officerHeading).toBeVisible();
    await page.evaluate(function () { history.back(); });
    await expect(characterSheet).toHaveClass(/hidden/);
    await expect(eventModal).not.toHaveClass(/hidden/);
    await expect(eventTitle).toHaveText(title);
    await expect(options).toHaveText(choices);
    await expect(officerButton).toBeFocused();
  });

test('flight freezes the canonical local confidant, discloses the named chance, and expires on a role change',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const p = s.player;
      const me = s.chars[p.charId];
      const friend = FB.makeCharacter(s, {
        name:'Road Friend', sex:'m', born:s.date.year - 30,
        culture:me.culture, religion:me.religion, station:0, traitsN:0
      });
      s.roles.friend = friend.id;
      const flee = FB.eventById('flee_serfdom');
      const friendCtx = FB.eventContextFor(s, flee, {});
      const friendChance = FB.namedChance(s, 'serf_flight', friendCtx);
      const preview = FB.previewEventOption(s, flee, flee.options[0], friendCtx);
      delete s.roles.friend;
      const staleFriend = FB.eventContextStillValid(s, flee, friendCtx);

      const rival = FB.makeCharacter(s, {
        name:'Road Rival', sex:'f', born:s.date.year - 28,
        culture:me.culture, religion:me.religion, station:0, traitsN:0
      });
      s.roles.rival = rival.id;
      p.rivalry = { heat:20, startedTurn:s.turn, lastMoveTurn:s.turn,
        initiator:'npc', cause:'test' };
      const rivalCtx = FB.eventContextFor(s, flee, {});
      const rivalChance = FB.namedChance(s, 'serf_flight', rivalCtx);
      FB.fns.serf_flight_failure(s, rivalCtx);
      const rivalHeat = FB.rivalHeat(s);

      delete s.roles.rival;
      p.rivalry = null;
      const aloneCtx = FB.eventContextFor(s, flee, {});
      const aloneChance = FB.namedChance(s, 'serf_flight', aloneCtx);
      s.roles.friend = friend.id;
      FB.setRngState(0);
      const friendReceipt = FB.resolveEventOption(s, flee, flee.options[0],
        friendCtx, { automated:false });
      const friendOutcome = FB.renderMessage(friendReceipt.outcome, {
        state:s, viewer:p.charId
      });
      return {
        friendId:friendCtx.participants.confidant,
        friendKind:friendCtx.participantKinds.confidant,
        friendChance:friendChance,
        previewBand:preview.chance.band,
        staleFriend:staleFriend,
        rivalId:rivalCtx.participants.confidant,
        rivalKind:rivalCtx.participantKinds.confidant,
        rivalChance:rivalChance,
        rivalHeat:rivalHeat,
        aloneHasConfidant:Object.prototype.hasOwnProperty.call(
          aloneCtx.participants, 'confidant'),
        aloneChance:aloneChance,
        friendReceiptName:friendReceipt.outcome.params.confidant,
        friendOutcome:friendOutcome,
        expectedFriendName:FB.fullName(friend)
      };
    });

    expect(result.friendId).toBeDefined();
    expect(result.friendKind).toBe('friend');
    expect(result.friendChance).toBe(0.65);
    expect(result.previewBand).toBe('likely');
    expect(result.staleFriend).toBe(false);
    expect(result.rivalId).toBeDefined();
    expect(result.rivalKind).toBe('rival');
    expect(result.rivalChance).toBe(0.35);
    expect(result.rivalHeat).toBe(25);
    expect(result.aloneHasConfidant).toBe(false);
    expect(result.aloneChance).toBe(0.5);
    expect(result.friendReceiptName).toBe(result.expectedFriendName);
    expect(result.friendOutcome).toContain(result.expectedFriendName);
  });

test('serf flight chance falls for every living family member who escapes',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      const flee = FB.eventById('flee_serfdom');
      const ctx = { participants:{}, participantKinds:{} };
      const loneChance = FB.namedChance(s, 'serf_flight', ctx);

      const spouse = FB.makeCharacter(s, {
        name:'Flight Spouse', sex:me.sex === 'm' ? 'f' : 'm',
        culture:me.culture, religion:me.religion,
        born:s.date.year - 27, station:0, traitsN:0, dyn:me.dyn
      });
      me.spouseId = spouse.id;
      spouse.spouseId = me.id;
      const spouseChance = FB.namedChance(s, 'serf_flight', ctx);
      function addChild(name, age) {
        const child = FB.makeCharacter(s, {
          name:name, sex:'f', culture:me.culture, religion:me.religion,
          born:s.date.year - age, station:0, traitsN:0, dyn:me.dyn,
          fatherId:me.sex === 'm' ? me.id : spouse.id,
          motherId:me.sex === 'f' ? me.id : spouse.id
        });
        me.childrenIds.push(child.id);
        spouse.childrenIds.push(child.id);
        return child;
      }
      addChild('Older Flight Child', 9);
      const younger = addChild('Younger Flight Child', 4);
      if (FB.touchFamily) FB.touchFamily();
      const covered = FB.freedomCoveredCharacterIds(s, []);
      const familyChance = FB.namedChance(s, 'serf_flight', ctx);
      const preview = FB.previewEventOption(s, flee, flee.options[0], ctx);
      younger.dead = true;
      const afterDeathChance = FB.namedChance(s, 'serf_flight', ctx);
      return {
        loneChance:loneChance,
        spouseChance:spouseChance,
        coveredCount:covered.length,
        familyChance:familyChance,
        previewBand:preview.chance.band,
        afterDeathChance:afterDeathChance,
        penalty:FBDATA.balance.serfFlightFamilyMemberPenalty,
        minimum:FBDATA.balance.serfFlightMinimumChance
      };
    });

    expect(result.loneChance).toBeCloseTo(0.5);
    expect(result.spouseChance).toBeCloseTo(0.45);
    expect(result.coveredCount).toBe(4);
    expect(result.familyChance).toBeCloseTo(0.35);
    expect(result.previewBand).toBe('risky');
    expect(result.afterDeathChance).toBeCloseTo(0.4);
    expect(result.penalty).toBe(0.05);
    expect(result.minimum).toBe(0.1);
  });

test('exact participant effects and receipts match between manual and autoresolve and fail atomically when stale',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const s = FB.state;
      const neighbor = FB.getRole(s, 'notable', true);
      const event = {
        id:'participant_parity_test', title:'A quarrel with {neighbor}',
        text:'{neighbor} waits at the boundary.',
        participants:[{
          slot:'neighbor', source:'context', required:true, sameHome:true
        }],
        options:[{
          label:'Answer {neighbor}.', desc:'The quarrel deepens.',
          effects:{
            gold:-3,
            standingCharacter:{ participant:'neighbor', amt:-10 },
            rivalContact:{ participant:'neighbor', score:2, cause:'test_quarrel' }
          }
        }]
      };
      FB.validateEventParticipants(event);
      const ctx = FB.eventContextFor(s, event, {
        participants:{ neighbor:neighbor.id },
        participantKinds:{ neighbor:'notable' }
      });
      const standingBefore = FB.standingOf(s, {
        kind:'character', id:neighbor.id
      });
      s.player.gold = 20;
      const baseline = JSON.parse(FB.save.serialize());
      const manual = FB.resolveEventOption(s, event, event.options[0], ctx,
        { automated:false });
      const manualState = {
        gold:s.player.gold,
        standing:FB.standingOf(s, { kind:'character', id:neighbor.id }),
        contact:s.player.rivalContacts[neighbor.id],
        title:manual.title,
        option:manual.option,
        impacts:manual.impacts
      };

      FB.save.restore(baseline);
      const autoState = FB.state;
      const autoCtx = JSON.parse(JSON.stringify(ctx));
      const automatic = FB.resolveEventOption(autoState, event,
        event.options[0], autoCtx, { automated:true });
      const automatedState = {
        gold:autoState.player.gold,
        standing:FB.standingOf(autoState, {
          kind:'character', id:neighbor.id
        }),
        contact:autoState.player.rivalContacts[neighbor.id],
        title:automatic.title,
        option:automatic.option,
        impacts:automatic.impacts
      };

      FB.save.restore(baseline);
      const staleState = FB.state;
      const staleCtx = JSON.parse(JSON.stringify(ctx));
      delete staleState.chars[neighbor.id];
      const goldBefore = staleState.player.gold;
      const stale = FB.resolveEventOption(staleState, event,
        event.options[0], staleCtx, { automated:false });
      return {
        manual:manualState,
        automated:automatedState,
        stale:stale,
        staleGold:staleState.player.gold,
        staleGoldBefore:goldBefore,
        standingBefore:standingBefore,
        receiptName:manual.title.params.neighbor,
        expectedName:FB.fullName(neighbor)
      };
    });

    expect(result.manual).toEqual(result.automated);
    expect(result.manual.gold).toBe(17);
    expect(result.manual.standing - result.standingBefore).toBe(-10);
    expect(result.manual.contact.score).toBe(2);
    expect(result.receiptName).toBe(result.expectedName);
    expect(result.stale).toBe(false);
    expect(result.staleGold).toBe(result.staleGoldBefore);
  });


test('serf focus descriptions explain income, training and continuing duties', async function ({ page }, testInfo) {
  await startSerfGame(page, testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    const rows = {};
    ['toil', 'militia', 'keep_house'].forEach(function (id) {
      rows[id] = { label:FB.focusLabel(s, id), description:FB.focusDescription(s, id) };
    });
    return rows;
  });
  expect(result.militia.label).toContain('Practice with the levy');
  expect(result.militia.description).toContain('Martial');
  expect(result.militia.description).toContain('earns no focus income');
  expect(result.keep_house.label).toContain('Manage the household');
  expect(result.keep_house.description).toContain('Stewardship or Diplomacy');
  expect(result.keep_house.description).toContain('earn coin');
  expect(result.toil.description).toContain('does not train skills');
  for (const row of Object.values(result)) expect(row.description).toContain('does not cancel');
});
