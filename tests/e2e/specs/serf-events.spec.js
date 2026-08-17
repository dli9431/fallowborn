'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/events.js',
  'data/events_peasant.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function startGame(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
}

test('the serf burden pool contains ten ordinary and two extraordinary stories',
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
          id:id,
          count:matches.length,
          tierMax:event && event.trigger && event.trigger.tierMax,
          random:!!(event && event.trigger && !event.trigger.never),
          choices:event && event.options ? event.options.length : 0,
          complete:!!(event && event.title && event.text &&
            event.options.every(function (option) {
              return !!(option.label && option.desc &&
                (option.effects || option.chance));
            }))
        };
      }
      return {
        ordinary:ordinaryIds.map(inspect),
        extraordinary:extraordinaryIds.map(inspect).map(function (entry, index) {
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
        count:1,
        tierMax:0,
        random:true,
        complete:true
      });
      expect(event.choices).toBeGreaterThanOrEqual(3);
    });
    expect(result.extraordinary).toHaveLength(2);
    result.extraordinary.forEach(function (event) {
      expect(event).toMatchObject({
        count:1,
        tierMax:0,
        random:true,
        choices:3,
        complete:true,
        once:true,
        weight:2,
        unconditional:true
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
            gold:player.gold,
            prestige:player.prestige,
            piety:player.piety,
            health:character.health
          };
          FB.resolveEventOption(state, event, option, {}, { automated:false });
          var after = {
            gold:player.gold,
            prestige:player.prestige,
            piety:player.piety,
            health:character.health
          };
          var loss = 0;
          var gain = 0;
          Object.keys(before).forEach(function (key) {
            var change = after[key] - before[key];
            if (change < 0) loss += -change;
            if (change > 0) gain += change;
          });
          results.push({
            id:id,
            option:optionIndex,
            loss:loss,
            gain:gain,
            leanWinter:!!player.flags.lean_winter
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
