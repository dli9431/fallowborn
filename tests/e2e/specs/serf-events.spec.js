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

test('desperate measures offers four serf-only crimes and commits only a chosen act',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const contract = await page.evaluate(function () {
      const state = FB.state;
      const event = FB.eventById('serf_desperate_measures');
      const tier0 = FB.instantStatus(state, 'poach');
      const oldTier = state.player.tier;
      state.player.tier = 1;
      const tier1Shown = FB.instantStatus(state, 'poach').shown;
      state.player.tier = 2;
      const tier2Shown = FB.instantStatus(state, 'poach').shown;
      state.player.tier = oldTier;
      return {
        label:tier0.action.label,
        flow:tier0.action.flow,
        tier0Shown:tier0.shown,
        tier1Shown:tier1Shown,
        tier2Shown:tier2Shown,
        never:event.trigger.never,
        labels:event.options.map(function (option) { return option.label; }),
        chances:event.options.map(function (option) { return option.chance; }),
        rewards:event.options.map(function (option) {
          return option.success.effects.gold;
        }),
        poachFailure:event.options[1].failure.effects.queue,
        severeFailure:event.options[3].failure.effects,
        technologyImpact:FBDATA.techImpactReviews.features
          .serf_desperate_measures.mode,
        validation:FB.validateActionData()
      };
    });

    expect(contract).toEqual(expect.objectContaining({
      label:'🗡 Desperate measures…',
      flow:'choices',
      tier0Shown:true,
      tier1Shown:false,
      tier2Shown:false,
      never:true,
      chances:[0.8, 0.65, 0.5, 0.3],
      rewards:[2, 5, 10, 30],
      poachFailure:'caught_poaching',
      technologyImpact:'none',
      validation:[]
    }));
    expect(contract.labels).toEqual([
      'Cut and sell forbidden wood.',
      'Poach protected game.',
      'Break into the lord’s grain store.',
      'Waylay a dues cart.'
    ]);
    expect(contract.severeFailure).toEqual(expect.objectContaining({
      gold:-6,
      health:-5,
      prestige:-8
    }));

    const before = await page.evaluate(function () {
      const state = FB.state;
      state.slotDays = [];
      state.eventQueue = [];
      state.player.cooldowns = state.player.cooldowns || {};
      delete state.player.cooldowns.poach;
      FB.ui.refresh();
      return {
        turn:state.turn,
        rng:FB.getRngState(),
        log:state.log.length
      };
    });
    await page.evaluate(function () {
      FB.ui.revealDeedAction('poach');
    });
    await page.locator('[data-action-id="poach"]').click();
    await expect(page.locator('[data-serf-hostile-deed]')).toHaveCount(4);
    expect(await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        rng:FB.getRngState(),
        log:FB.state.log.length,
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach')
      };
    })).toEqual({
      turn:before.turn,
      rng:before.rng,
      log:before.log,
      cooldown:false
    });
    await page.getByRole('button', { name:'Close', exact:true }).click();
    expect(await page.evaluate(function () {
      return {
        turn:FB.state.turn,
        rng:FB.getRngState(),
        log:FB.state.log.length,
        cooldown:Object.prototype.hasOwnProperty.call(
          FB.state.player.cooldowns || {}, 'poach')
      };
    })).toEqual({
      turn:before.turn,
      rng:before.rng,
      log:before.log,
      cooldown:false
    });

    await page.locator('[data-action-id="poach"]').click();
    await page.locator('[data-serf-hostile-deed]').first().click();
    const after = await page.evaluate(function () {
      const state = FB.state;
      const receipt = state.log.filter(function (entry) {
        return entry.receipt &&
          entry.receipt.eventId === 'serf_desperate_measures';
      }).pop();
      return {
        turn:state.turn,
        cooldown:state.player.cooldowns.poach,
        receipt:receipt && receipt.receipt,
        pickerOpen:!document.getElementById('genmodal').classList.contains('hidden')
      };
    });
    expect(after.turn).toBe(before.turn + 1);
    expect(after.cooldown).toBe(before.turn);
    expect(after.receipt).toEqual(expect.objectContaining({
      eventId:'serf_desperate_measures',
      optionIndex:0
    }));
    expect(after.pickerOpen).toBe(false);
  });

test('the serf burden pool contains ten scheduled and two extraordinary stories',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
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
          continuity:!!(event && event.options && event.options.some(
            function (option) {
              return !option.manualOnly && !option.require;
            })),
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
        complete: true,
        continuity:true
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
    await startSerfGame(page, testInfo);
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
          var context = FB.eventContextFor(state, event, {});
          FB.resolveEventOption(state, event, option, context,
            { automated: false });
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
    await startSerfGame(page, testInfo);
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
    await startSerfGame(page, testInfo);
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

test('Phase 4 tenure catalogue ships seven complete definitions and validates every expanded selector field',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      function validationError(mutate) {
        const copy = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
        mutate(copy.pastoral_steppe, copy);
        try {
          FB.validateTenureData(copy);
          return '';
        } catch (error) {
          return String(error && error.message || error);
        }
      }
      const definitions = Object.keys(FBDATA.tenureArchetypes).filter(function (id) {
        return FBDATA.tenureArchetypes[id].systems.indexOf('manorial_tenure') >= 0;
      }).map(function (id) {
        const definition = FBDATA.tenureArchetypes[id];
        return {
          id:id,
          declaredId:definition.id,
          priority:definition.priority,
          duties:definition.duties.map(function (duty) { return duty.id; }),
          events:definition.duties.map(function (duty) {
            return duty.eventId || null;
          }),
          rights:(definition.rights || []).map(function (right) {
            return typeof right === 'string' ? right : right.rightId;
          }),
          workLabelKey:definition.workLabelKey,
          workDescriptionKey:definition.workDescriptionKey,
          hasMechanicalOverride:['wage', 'risk', 'gain', 'career'].some(function (field) {
            return Object.prototype.hasOwnProperty.call(definition, field);
          }),
          unconditional:Object.keys(definition.selector || {}).length === 0
        };
      });
      return {
        definitions:definitions,
        validation:!!FB.validateTenureData(),
        technologyImpact:FBDATA.techImpactReviews.features.regional_serf_tenure,
        errors:{
          bookmark:validationError(function (arch) {
            arch.selector.bookmarksAny = ['unknown_bookmark'];
          }),
          culture:validationError(function (arch) {
            arch.selector.culturesAny = ['unknown_culture'];
          }),
          province:validationError(function (arch) {
            arch.selector.provinceIdsAny = ['unknown_province'];
          }),
          provinceNeedsBookmark:validationError(function (arch) {
            arch.selector.provinceIdsAny = [FBDATA.bookmarks['867'].provinces[0].id];
            delete arch.selector.bookmarksAny;
          }),
          coastal:validationError(function (arch) {
            arch.selector.coastal = 'yes';
          }),
          emptyAny:validationError(function (arch) {
            arch.selector.terrainAny = [];
          }),
          duplicateAny:validationError(function (arch) {
            arch.selector.bookmarksAny = ['867', '867'];
          }),
          nonIntegerDev:validationError(function (arch) {
            arch.selector.dev0Max = 3.5;
          }),
          outOfRangeDev:validationError(function (arch) {
            arch.selector.dev0Max = 11;
          }),
          invertedDev:validationError(function (arch) {
            arch.selector.dev0Min = 4;
            arch.selector.dev0Max = 3;
          }),
          unknownWorkKey:validationError(function (arch) {
            arch.workLabelKey = 'tenure_work_unknown_label';
          }),
          tooFewDuties:validationError(function (arch) {
            arch.duties = arch.duties.slice(0, 1);
          })
        }
      };
    });

    expect(result.validation).toBe(true);
    expect(result.technologyImpact.mode).toBe('none');
    expect(result.definitions).toHaveLength(7);
    expect(result.definitions.map(function (definition) { return definition.id; })).toEqual([
      'latin_manorial', 'irrigated_fellah', 'norse_coastal_service',
      'pastoral_steppe', 'woodland_dependence',
      'pagan_household_service', 'dependent_farming'
    ]);
    expect(result.definitions.filter(function (definition) {
      return definition.unconditional;
    }).map(function (definition) { return definition.id; })).toEqual(['dependent_farming']);
    result.definitions.forEach(function (definition) {
      expect(definition.declaredId).toBe(definition.id);
      expect(definition.workLabelKey).toBe('tenure_work_' + definition.id + '_label');
      expect(definition.workDescriptionKey).toBe('tenure_work_' + definition.id + '_desc');
      expect(definition.duties.length).toBeGreaterThanOrEqual(2);
      expect(definition.duties.length).toBeLessThanOrEqual(4);
      expect(new Set(definition.duties).size).toBe(definition.duties.length);
      expect(definition.rights.length).toBeLessThanOrEqual(2);
      expect(definition.hasMechanicalOverride).toBe(false);
    });
    Object.keys(result.errors).forEach(function (field) {
      expect(result.errors[field], field).toContain('Archetype pastoral_steppe');
    });
    expect(result.errors.bookmark).toContain('bookmarksAny');
    expect(result.errors.culture).toContain('culturesAny');
    expect(result.errors.province).toContain('provinceIdsAny');
    expect(result.errors.provinceNeedsBookmark).toContain('requires bookmarksAny');
    expect(result.errors.coastal).toContain('coastal');
    expect(result.errors.emptyAny).toContain('terrainAny');
    expect(result.errors.duplicateAny).toContain('duplicate value');
    expect(result.errors.nonIntegerDev).toContain('dev0Max');
    expect(result.errors.outOfRangeDev).toContain('dev0Max');
    expect(result.errors.invertedDev).toContain('may not exceed');
    expect(result.errors.unknownWorkKey).toContain('workLabelKey');
    expect(result.errors.tooFewDuties).toContain('2 to 4');
  });

test('Phase 4 selection uses formation facts, explains rejections, preserves declaration ties, and consumes no RNG',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      function choose(input) {
        const before = JSON.stringify(FB.getRngState());
        const definition = FB.serfTenureSelection(state, input);
        const reason = FB.serfTenureSelectionReason(state, input);
        const after = JSON.stringify(FB.getRngState());
        return {
          selected:definition.id,
          reason:reason,
          rngUnchanged:before === after
        };
      }
      const fixtures = {
        latin:{ bookmarkId:'867', provinceId:'barcelona', culture:'iberian', faith:'catholic', terrain:'farmland', coastal:true, dev0:5, settlementKind:'village' },
        fellah:{ bookmarkId:'1066', provinceId:'fustat', culture:'arabic', faith:'sunni', terrain:'farmland', coastal:false, dev0:6, settlementKind:'village' },
        pastoral:{ bookmarkId:'867', provinceId:'etelkoz', culture:'magyar', faith:'tengri', terrain:'steppe', coastal:false, dev0:3, settlementKind:'village' },
        woodland:{ bookmarkId:'1066', provinceId:'novgorod', culture:'slavic', faith:'slavic_pagan', terrain:'forest', coastal:false, dev0:3, settlementKind:'village' },
        coastal:{ bookmarkId:'867', provinceId:'sjaelland', culture:'norse', faith:'norse_pagan', terrain:'farmland', coastal:true, dev0:4, settlementKind:'town' },
        inlandNorse:{ bookmarkId:'867', provinceId:'unknown_fixture', culture:'norse', faith:'norse_pagan', terrain:'forest', coastal:false, dev0:2, settlementKind:'village' },
        fallback:{ bookmarkId:'867', provinceId:'unknown_fixture', culture:'khazar', faith:'jewish', terrain:'steppe', coastal:false, dev0:2, settlementKind:'town' }
      };
      const selected = {};
      Object.keys(fixtures).forEach(function (key) {
        selected[key] = choose(fixtures[key]);
      });

      const boundaryFailures = {};
      function changed(base, field, value) {
        const input = Object.assign({}, base);
        input[field] = value;
        return choose(input);
      }
      boundaryFailures.pastoralBookmark = changed(fixtures.pastoral, 'bookmarkId', 'unsupported');
      boundaryFailures.pastoralFaith = changed(fixtures.pastoral, 'faith', 'catholic');
      boundaryFailures.pastoralTerrain = changed(fixtures.pastoral, 'terrain', 'plains');
      boundaryFailures.pastoralDev = changed(fixtures.pastoral, 'dev0', 4);
      boundaryFailures.pastoralSettlement = changed(fixtures.pastoral, 'settlementKind', 'town');
      boundaryFailures.woodlandTradition = changed(fixtures.woodland, 'culture', 'norse');
      boundaryFailures.woodlandTerrain = changed(fixtures.woodland, 'terrain', 'hills');
      boundaryFailures.coastalCulture = changed(fixtures.coastal, 'culture', 'slavic');
      boundaryFailures.coastalFaith = changed(fixtures.coastal, 'faith', 'catholic');
      boundaryFailures.coastalStatus = changed(fixtures.coastal, 'coastal', false);
      boundaryFailures.coastalTerrain = changed(fixtures.coastal, 'terrain', 'steppe');
      boundaryFailures.coastalSettlement = changed(fixtures.coastal, 'settlementKind', 'city');

      const tieCatalogue = JSON.parse(JSON.stringify(FBDATA.tenureArchetypes));
      tieCatalogue.latin_manorial.priority = 900;
      tieCatalogue.irrigated_fellah.priority = 900;
      tieCatalogue.latin_manorial.selector = {};
      tieCatalogue.irrigated_fellah.selector = {};
      const tie = FB.selectSerfTenureArchetype({ state:state }, tieCatalogue);
      return { selected:selected, boundaryFailures:boundaryFailures, tie:tie.archetype.id };
    });

    expect(result.selected.latin.selected).toBe('latin_manorial');
    expect(result.selected.fellah.selected).toBe('irrigated_fellah');
    expect(result.selected.pastoral.selected).toBe('pastoral_steppe');
    expect(result.selected.woodland.selected).toBe('woodland_dependence');
    expect(result.selected.coastal.selected).toBe('norse_coastal_service');
    expect(result.selected.inlandNorse.selected).toBe('pagan_household_service');
    expect(result.selected.fallback.selected).toBe('dependent_farming');
    Object.keys(result.selected).forEach(function (key) {
      const entry = result.selected[key];
      expect(entry.reason.archetypeId).toBe(entry.selected);
      expect(entry.reason.matched).toContain(entry.selected);
      expect(entry.rngUnchanged).toBe(true);
    });
    expect(result.boundaryFailures.pastoralBookmark.reason.rejected.filter(function (entry) {
      return entry.archetypeId === 'pastoral_steppe';
    })[0].fields).toContain('bookmarksAny');
    expect(result.boundaryFailures.pastoralDev.reason.rejected.filter(function (entry) {
      return entry.archetypeId === 'pastoral_steppe';
    })[0].fields).toContain('dev0Max');
    expect(result.boundaryFailures.coastalStatus.reason.rejected.filter(function (entry) {
      return entry.archetypeId === 'norse_coastal_service';
    })[0].fields).toContain('coastal');
    Object.keys(result.boundaryFailures).forEach(function (key) {
      expect(result.boundaryFailures[key].rngUnchanged).toBe(true);
    });
    expect(result.tie).toBe('latin_manorial');
  });

test('all seven serf tenures share Toil mechanics while contextual work presentation remains read-only',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const toil = FB.focuses.filter(function (focus) {
        return focus.id === 'toil';
      })[0];
      const rest = FB.focuses.filter(function (focus) {
        return focus.id === 'rest';
      })[0];
      const expected = {
        latin_manorial:['Work the fields', 'Farm your family’s plots and work the lord’s fields.'],
        irrigated_fellah:['Farm and maintain irrigation', 'Work the household fields and maintain the shared water on which they depend.'],
        norse_coastal_service:['Work boats and carry goods', 'Labor for the household through boats, shore work, and local transport.'],
        pastoral_steppe:['Tend the herds', 'Keep the herds, pasture, and seasonal service that sustain the household.'],
        woodland_dependence:['Work the woods and fields', 'Tend the clearing and meet the woodland labor owed by the household.'],
        pagan_household_service:['Work for your master', 'Labor within the master’s household and its dependent fields.'],
        dependent_farming:['Work the family farm', 'Work the customary holding and meet its seasonal service.']
      };
      const originalTenure = JSON.parse(JSON.stringify(player.tenure));
      const labels = {};
      Object.keys(expected).forEach(function (archetypeId) {
        player.tenure = JSON.parse(JSON.stringify(originalTenure));
        player.tenure.status = 'active';
        player.tenure.archetypeId = archetypeId;
        const beforeState = JSON.stringify(state);
        const beforeRng = JSON.stringify(FB.getRngState());
        const firstLabel = FB.focusLabel(state, toil);
        const secondLabel = FB.focusLabel(state, toil);
        const description = FB.focusDescription(state, toil);
        const view = FB.tenureView(state);
        const gain = toil.gain(state);
        labels[archetypeId] = {
          label:firstLabel,
          repeated:secondLabel,
          description:description,
          viewLabel:view.workLabel,
          viewDescription:view.workDescription,
          gain:gain,
          eligible:toil.show(state),
          stateUnchanged:beforeState === JSON.stringify(state),
          rngUnchanged:beforeRng === JSON.stringify(FB.getRngState())
        };
      });
      player.tenure = JSON.parse(JSON.stringify(originalTenure));
      player.tier = 1;
      const tierOne = {
        label:FB.focusLabel(state, toil),
        description:FB.focusDescription(state, toil)
      };
      player.tier = 0;
      player.tenure.status = 'closed';
      const closed = FB.focusLabel(state, toil);
      player.tenure.status = 'active';
      player.tenure.archetypeId = 'unknown_archetype';
      const unknown = FB.focusLabel(state, toil);
      const nonToil = FB.focusLabel(state, rest);
      return {
        labels:labels,
        expected:expected,
        identity:{
          id:toil.id,
          handler:toil.handler,
          shortcutFamily:toil.shortcutFamily,
          savedFocus:player.focus
        },
        tierOne:tierOne,
        closed:closed,
        unknown:unknown,
        nonToil:nonToil,
        genericToil:FBDATA.focuses.filter(function (focus) {
          return focus.id === 'toil';
        })[0].label,
        genericRest:FBDATA.focuses.filter(function (focus) {
          return focus.id === 'rest';
        })[0].label
      };
    });

    Object.keys(result.expected).forEach(function (archetypeId) {
      const entry = result.labels[archetypeId];
      expect(entry.label).toBe(result.expected[archetypeId][0]);
      expect(entry.repeated).toBe(entry.label);
      expect(entry.description).toContain(result.expected[archetypeId][1]);
      expect(entry.description).toContain('does not train skills');
      expect(entry.description).toContain('does not cancel');
      expect(entry.viewLabel).toBe(entry.label);
      expect(entry.viewDescription).toBe(entry.description);
      expect(entry.gain).toEqual(result.labels.dependent_farming.gain);
      expect(entry.eligible).toBe(result.labels.dependent_farming.eligible);
      expect(entry.stateUnchanged).toBe(true);
      expect(entry.rngUnchanged).toBe(true);
    });
    expect(result.identity).toMatchObject({
      id:'toil', handler:'toil', shortcutFamily:'farmer-work'
    });
    expect(result.tierOne.label).toBe(result.genericToil);
    expect(result.closed).toBe(result.genericToil);
    expect(result.unknown).toBe(result.genericToil);
    expect(result.nonToil).toBe(result.genericRest);
  });

test('identical seeded Toil ticks produce identical economy, health, skill, and RNG results for every archetype',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const baseline = FB.save.serialize();
      const archetypeIds = Object.keys(FBDATA.tenureArchetypes).filter(function (id) {
        return FBDATA.tenureArchetypes[id].systems.indexOf('manorial_tenure') >= 0;
      });
      return archetypeIds.map(function (archetypeId) {
        FB.save.restore(JSON.parse(baseline));
        const state = FB.state;
        const player = state.player;
        player.tier = 0;
        player.focus = 'toil';
        player.tenure.status = 'active';
        player.tenure.archetypeId = archetypeId;
        const character = state.chars[player.charId];
        const toil = FB.focuses.filter(function (focus) {
          return focus.id === 'toil';
        })[0];
        FB.setRngState(246813579);
        const before = {
          gold:player.gold,
          prestige:player.prestige,
          piety:player.piety,
          health:character.health,
          skills:JSON.parse(JSON.stringify(character.skills || {}))
        };
        toil.tick(state);
        return {
          archetypeId:archetypeId,
          before:before,
          after:{
            gold:player.gold,
            prestige:player.prestige,
            piety:player.piety,
            health:character.health,
            skills:JSON.parse(JSON.stringify(character.skills || {}))
          },
          rng:FB.getRngState()
        };
      });
    });

    expect(result).toHaveLength(7);
    result.forEach(function (entry) {
      expect(entry.before).toEqual(result[0].before);
      expect(entry.after).toEqual(result[0].after);
      expect(entry.rng).toEqual(result[0].rng);
    });
  });

test('serf Toil and Harvest follow provisions prices and lose yield to local warfare',
  async function ({ page }, testInfo) {
    await startSerfGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const player = state.player;
      const pid = player.provinceId;
      const market = FB.ensureMarket(state);
      const provisions = market.goods.indexOf('provisions');
      const toil = FB.focuses.filter(function (focus) {
        return focus.id === 'toil';
      })[0];
      const originalWage = FBDATA.balance.serfWage.slice();
      state.occupations = {};
      state.wars = {};
      state.greatHolyWar = null;
      player.war = null;
      state.realms.harvest_defenders = { id:'harvest_defenders', alive:true, capital:pid };
      state.realms.harvest_raiders = { id:'harvest_raiders', alive:true, capital:pid };
      FB.registerOrdinaryWar(state, 'harvest_raiders', {
        enemy:'harvest_defenders', target:pid
      });
      state.owner[pid] = 'harvest_defenders';

      function setPrice(price) {
        market.counties[pid][1][provisions] = price;
      }
      function quote(price, armies, siege) {
        setPrice(price);
        state.armies = armies;
        state.occupations = {};
        if (siege) state.occupations[pid] = { progress:0.5, occupied:false };
        return FB.serfHarvestQuote(state, 2);
      }
      function host(id, realm) {
        return { id:id, realm:realm, at:pid, men:120 };
      }

      const defender = host('harvest_defender_host', 'harvest_defenders');
      const raider = host('harvest_raider_host', 'harvest_raiders');
      const steady = quote(1, [], false);
      const cheap = quote(0.5, [], false);
      const dear = quote(2, [], false);
      const army = quote(1, [defender], false);
      const hostile = quote(1, [raider], false);
      const battle = quote(1, [defender, raider], false);
      const siege = quote(1, [], true);

      player.gold = 0;
      setPrice(1);
      state.armies = [];
      state.occupations = {};
      FB.setRngState(97531);
      FB.applyEffects(state, { gold:'harvest_good', clearHarvestFlags:true }, {});
      const steadyEventGold = player.gold;
      player.gold = 0;
      setPrice(2);
      state.armies = [defender, raider];
      FB.setRngState(97531);
      FB.applyEffects(state, { gold:'harvest_good', clearHarvestFlags:true }, {});
      const battleEventGold = player.gold;
      player.gold = 0;
      setPrice(2);
      state.armies = [];
      state.occupations[pid] = { progress:0.5, occupied:false };
      FB.applyEffects(state, { gold:1, clearHarvestFlags:true }, {});
      const siegeThinEventGold = player.gold;

      setPrice(2);
      state.armies = [defender, raider];
      state.occupations = {};
      const gainSeasonalGold = toil.gain(state).gold;
      FBDATA.balance.serfWage = [2, 2];
      const beforeGold = player.gold;
      const expectedTick = FB.serfHarvestQuote(state, 2).gold;
      toil.tick(state);
      const tickSeasonalGold = (player.gold - beforeGold) * 90;
      FBDATA.balance.serfWage = originalWage;

      return {
        steady:steady,
        cheap:cheap,
        dear:dear,
        army:army,
        hostile:hostile,
        battle:battle,
        siege:siege,
        steadyEventGold:steadyEventGold,
        battleEventGold:battleEventGold,
        siegeThinEventGold:siegeThinEventGold,
        gainSeasonalGold:gainSeasonalGold,
        expectedTick:expectedTick,
        tickSeasonalGold:tickSeasonalGold
      };
    });

    expect(result.steady).toMatchObject({
      provisionsPrice:1, marketFactor:1, conflict:'peace', conflictFactor:1
    });
    expect(result.steady.gold).toBeCloseTo(2, 8);
    expect(result.cheap.marketFactor).toBeCloseTo(0.625, 8);
    expect(result.cheap.gold).toBeCloseTo(1.25, 8);
    expect(result.dear.marketFactor).toBeCloseTo(1.75, 8);
    expect(result.dear.gold).toBeCloseTo(3.5, 8);
    expect(result.army).toMatchObject({ conflict:'army', conflictFactor:0.9 });
    expect(result.army.gold).toBeCloseTo(1.8, 8);
    expect(result.hostile).toMatchObject({ conflict:'hostile', conflictFactor:0.65 });
    expect(result.hostile.gold).toBeCloseTo(1.3, 8);
    expect(result.battle).toMatchObject({ conflict:'battle', conflictFactor:0.5 });
    expect(result.battle.gold).toBeCloseTo(1, 8);
    expect(result.siege).toMatchObject({ conflict:'siege', conflictFactor:0.4 });
    expect(result.siege.gold).toBeCloseTo(0.8, 8);
    expect(result.battleEventGold).toBeCloseTo(result.steadyEventGold * 0.875, 8);
    expect(result.siegeThinEventGold).toBeCloseTo(0.7, 8);
    expect(result.gainSeasonalGold).toBeCloseTo(result.expectedTick, 8);
    expect(result.tickSeasonalGold).toBeCloseTo(result.expectedTick, 8);
  });
