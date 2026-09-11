'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/holywar.js', 'data/cultures.js', 'data/map_data.js',
  'js/model.js', 'js/world.js', 'js/armies.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('Catholic inaugural eligibility remains Syria until the first launch',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const targets = await page.evaluate(function () {
      const s = FB.state;
      FB.ensureGreatHolyWar(s);
      delete s.greatHolyWarHistory.firstLaunched.catholic;
      // Even a previous collapsed gathering must retain the historical target.
      s.greatHolyWarHistory.firstCall.catholic = true;
      s.owner.jerusalem = 'abbasid';
      const original = FB.realmReligionId;
      FB.realmReligionId = function (state, id) {
        return id === 'abbasid' ? 'sunni' : original(state, id);
      };
      try {
        return FB.greatHolyWarTargets(s, 'catholic').map(function (target) {
          return target.kingdomId;
        });
      } finally { FB.realmReligionId = original; }
    });
    expect(targets).toEqual(['k_syria']);
  });

test('later AI calls balance sacred importance, coalition strength and decaying failures',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function () {
      const s = FB.state, saved = {};
      function stub(name, fn) { saved[name] = FB[name]; FB[name] = fn; }
      FB.ensureGreatHolyWar(s);
      s.greatHolyWar = null;
      s.date = { year:1200, season:0, day:1 };
      s.turn = 120000;
      const history = s.greatHolyWarHistory;
      const originalRealms = s.realms;
      s.realms = { papacy:{ alive:true }, ally:{ alive:true },
        strong:{ alive:true }, weak:{ alive:true } };
      s.owner.test_syria = 'strong';
      s.owner.test_syria_second = 'strong';
      s.owner.test_other = 'weak';
      let powers = { ally:1000, strong:1000, weak:1000 };
      let calls = {}, picked = null, roll = true;
      const targets = [
        { kingdomId:'k_syria', holyPriority:1, objectiveDevelopment:10,
          totalDevelopment:10, objectiveCounties:['test_syria', 'test_syria_second'] },
        { kingdomId:'k_anatolia', holyPriority:0, objectiveDevelopment:10,
          totalDevelopment:10, objectiveCounties:['test_other'] }
      ];
      stub('ensureReligiousHeads', function () {});
      stub('religionIds', function () { return ['catholic']; });
      stub('religiousHeadOf', function () { return { id:'papacy' }; });
      stub('playerPope', function () { return false; });
      stub('realmReligionId', function (state, id) {
        return id === 'ally' || id === 'papacy' ? 'catholic' : 'sunni';
      });
      stub('realmRulerCharacter', function () { return null; });
      stub('topRealm', function (state, id) { return id; });
      stub('aiBaseHost', function (state, id) {
        calls[id] = (calls[id] || 0) + 1;
        return powers[id] === undefined ? 1 : powers[id];
      });
      stub('rearmScale', function () { return 1; });
      stub('chance', function () { return roll; });
      stub('greatHolyWarTargets', function () { return targets; });
      stub('callGreatHolyWar', function (state, religion, target) { picked = target; });
      function choose(records) {
        history.campaigns = records || [];
        history.cooldownUntil = {};
        calls = {}; picked = null;
        FB.greatHolyWarYearly(s);
        return { target:picked, calls:Object.assign({}, calls) };
      }
      function defeat(years, religion, outcome, reason) {
        return { target:'k_syria', religion:religion || 'catholic',
          outcome:outcome || 'defenders', reason:reason,
          turn:s.turn - years * 360 };
      }
      const rng = FB.getRngState();
      try {
        delete history.firstLaunched.catholic;
        powers.strong = 100000;
        const first = choose([defeat(1)]);
        history.firstLaunched.catholic = true;
        powers.strong = 3000;
        const feasible = choose();
        powers.strong = 1000;
        const sacred = choose();
        const recent = choose([defeat(19)]);
        const recovered = choose([defeat(81)]);
        const unrelated = choose([defeat(1, 'sunni')]);
        const victory = choose([defeat(1, 'catholic', 'attackers')]);
        const repeated = choose([defeat(19), defeat(40)]);
        const collapsed = choose([defeat(1, 'catholic', 'collapsed', 'strength'),
          defeat(10, 'catholic', 'collapsed', 'strength')]);
        const cancelled = choose([defeat(1, 'catholic', 'collapsed', 'cancelled')]);
        powers.ally = 0;
        const noMuster = choose();
        powers.ally = 1000;
        // Feasibility applies even if the sacred kingdom is the only eligible target.
        targets.pop(); powers.strong = 100000;
        const deferred = choose();
        roll = false;
        const noRoll = choose();
        roll = true; calls = {}; picked = null;
        history.cooldownUntil.catholic = s.turn + 360;
        FB.greatHolyWarYearly(s);
        const cooldown = { target:picked, calls:Object.assign({}, calls) };
        // Historical launches have already happened: ordinary days must never
        // inspect failure records or project strength, even after cooldown expires.
        history.cooldownUntil = {};
        history.unlockChecked.catholic = true;
        calls = {};
        // Normalization may inspect the array, but must not inspect its records.
        const records = [];
        Object.defineProperty(records, '0', { get:function () {
          throw new Error('Daily tick inspected a failure record');
        } });
        Object.defineProperty(history, 'campaigns', { configurable:true, value:records,
          writable:true });
        for (let day = 0; day < 90; day++) { s.turn++; FB.greatHolyWarTick(s); }
        return { first, feasible, sacred, recent, recovered, unrelated, victory,
          repeated, collapsed, cancelled, noMuster, deferred, noRoll, cooldown,
          dailyCalls:calls, rngStable:FB.getRngState() === rng };
      } finally {
        for (const name in saved) FB[name] = saved[name];
        s.realms = originalRealms;
        Object.defineProperty(history, 'campaigns', { configurable:true, value:[], writable:true });
      }
    });
    expect(result.first).toEqual({ target:'k_syria', calls:{} });
    expect(result.feasible.target).toBe('k_anatolia');
    for (const key of ['sacred', 'recovered', 'unrelated', 'victory', 'cancelled']) {
      expect(result[key].target).toBe('k_syria');
    }
    for (const key of ['recent', 'repeated', 'collapsed']) {
      expect(result[key].target).toBe('k_anatolia');
    }
    expect(result.sacred.calls).toEqual({ ally:1, strong:1, weak:1 });
    expect(result.deferred.target).toBeNull();
    expect(result.noMuster.target).toBeNull();
    expect(result.noRoll).toEqual({ target:null, calls:{} });
    expect(result.cooldown).toEqual({ target:null, calls:{} });
    expect(result.dailyCalls).toEqual({});
    expect(result.rngStable).toBe(true);
  });
