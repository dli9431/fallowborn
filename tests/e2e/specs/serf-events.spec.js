'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/map_data.js',
  'data/bookmarks.js',
  'data/cultures.js',
  'data/economy.js',
  'data/events_peasant.js',
  'data/technology.js',
  'js/main.js',
  'js/i18n.js',
  'js/messages.js',
  'js/model.js',
  'js/modifiers.js',
  'js/events.js',
  'js/actions.js',
  'js/save.js',
  'js/world.js',
  'js/ui_misc.js',
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

test('Phase 4 tenure catalogue ships seven complete definitions and validates every expanded selector field',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
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
      const definitions = Object.keys(FBDATA.tenureArchetypes).map(function (id) {
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
        latin_manorial:['Tend strips and serve the demesne', 'Work the household strips and meet the labor owed on the lord’s demesne.'],
        irrigated_fellah:['Tend fields and waterworks', 'Work the household fields and maintain the shared water on which they depend.'],
        norse_coastal_service:['Work shore, boats, and transport', 'Labor for the household through boats, shore work, and local transport.'],
        pastoral_steppe:['Tend the household herds', 'Keep the herds, pasture, and seasonal service that sustain the household.'],
        woodland_dependence:['Work woodland and clearings', 'Tend the clearing and meet the woodland labor owed by the household.'],
        pagan_household_service:['Serve the master’s household', 'Labor within the master’s household and its dependent fields.'],
        dependent_farming:['Work the household holding', 'Work the customary holding and meet its seasonal service.']
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
      expect(entry.description).toBe(result.expected[archetypeId][1]);
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
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const baseline = FB.save.serialize();
      const archetypeIds = Object.keys(FBDATA.tenureArchetypes);
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

test('regional tenure events localize every changed surface while retaining one event definition and mechanics',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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

test('Phase 5 local authority succession keeps exact people, queues one review, and confirms without changing terms',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
    const result = await page.evaluate(function () {
      const state = FB.state;
      const tenure = FB.ensureSerfTenure(state, 'legacy_repair');
      const oldLord = FB.getRole(state, 'lord', true);
      FB.ensureSerfTenure(state, 'legacy_repair');
      const checkpointLordId = tenure.authorityCheckpoint.localLordId;
      const dutiesBefore = JSON.stringify(tenure.duties);
      const rightsBefore = JSON.stringify(tenure.rights);
      const rngBefore = JSON.stringify(FB.getRngState());
      FB.killChar(state, oldLord);
      const afterDeath = state.player.tenureTransition;
      const deathRevision = afterDeath && afterDeath.revision;
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
        rngChangedByReplacement:rngBefore !== rngAfterReplacement
      };
    });

    expect(result.checkpointLordId).toBe(result.oldLordId);
    expect(result.exactFormerDead).toBe(true);
    expect(result.deathRevision).toBe(1);
    expect(result.coalescedRevision).toBe(2);
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
    expect(result.rngChangedByReplacement).toBe(true);
  });

test('Phase 5 authority snapshots remain pure and unresolved historical rulers fall back to their realm',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
      const staleRevision = commuteRecord.revision;
      const commuteResolved = FB.resolveSerfTenureTransition(
        state, commuteRecord.revision, 'accept');
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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

test('serf tenure details render across archetypes in Station & home with stable data attributes and Escape dismissal',
  async function ({ page }, testInfo) {
    await page.setViewportSize({ width:390, height:844 });
    await startGame(page, testInfo);
    const steward = await page.evaluate(function () {
      const c = FB.getRole(FB.state, 'steward', true);
      FB.ui.refresh();
      FB.ui.showTab('char');
      return { id:c.id, name:FB.fullName(c) };
    });
    const rank = page.locator('#self-rank-details');
    await expect(rank).toBeVisible();
    await rank.click();

    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-duty]').first()).toBeVisible();
    await expect(page.locator('#gm-body [data-tenure-next-due]')).toBeVisible();
    const stewardLink = page.locator(
      '[data-tenure-character="' + steward.id + '"]').first();
    await expect(stewardLink).toBeVisible();
    await stewardLink.click();
    await expect(page.getByRole('heading', { name:steward.name })).toBeVisible();
    await expect(page.locator('#cm-close')).toContainText('Back');
    await page.locator('#cm-close').click();
    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(stewardLink).toBeFocused();
    await stewardLink.click();
    await page.evaluate(function () { history.back(); });
    await expect(page.locator('#gm-body [data-tenure-summary]')).toBeVisible();
    await expect(stewardLink).toBeFocused();

    // Verify keyboard dismissal with Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  });

test('exact participant binding is deterministic, bounded, persistent, and never recasts an existing slot',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
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
        expected:[friend.id, rival.id, attention.id, early.id, later.id, notable.id],
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
    await startGame(page, testInfo);
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

    expect(result.openerChance).toBe(0.04);
    expect(result.openerWeight).toBe(15);
    expect(result.openerOnce).toBe(true);
    expect(result.endingChance).toBe(0.2);
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
    await officerButton.click();
    await expect(page.getByRole('heading', { name:cast.officerName }))
      .toBeVisible();
    await page.locator('#cm-close').click();
    await expect(page.locator('#eventmodal')).not.toHaveClass(/hidden/);
    await expect(officerButton).toBeFocused();
    await officerButton.click();
    await expect(page.getByRole('heading', { name:cast.officerName }))
      .toBeVisible();
    await page.evaluate(function () { history.back(); });
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
    await expect(page.locator('#eventmodal')).not.toHaveClass(/hidden/);
    await expect(officerButton).toBeFocused();
  });

test('flight freezes the canonical local confidant, discloses the named chance, and expires on a role change',
  async function ({ page }, testInfo) {
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
    await startGame(page, testInfo);
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
