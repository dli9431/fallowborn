'use strict';

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openTitle, openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { scanSource } = require('../support/source-literals');

dependsOnRuntime(__filename, [
  'index.html', 'js/main.js', 'js/day_phases.js', 'js/systems.js', 'js/util.js',
  'js/events.js', 'js/intrigue.js', 'js/world.js', 'js/fiscal.js', 'js/save.js', 'js/save_v4.js'
]);
const root = path.resolve(__dirname, '../../..');

test('registered phase order, cadence and mode match the documented list',
  async function ({ page }, testInfo) {
    await openTitle(page, testInfo);
    const doc = fs.readFileSync(path.join(root, 'docs/designs/time.md'), 'utf8');
    const rows = Array.from(doc.matchAll(/^\| (\d+) \| `([^`]+)` \| `(daily|seasonBoundary|newYear)` \| `(play|observe|both)` \|$/gm))
      .map(function (m) { return { order:Number(m[1]), id:m[2], cadence:m[3], mode:m[4] }; });
    expect(rows.length).toBe(126);
    expect(await page.evaluate(function () {
      return FB.dayPhases.list().map(function (p) {
        if (!(p.condition === null || typeof p.condition === 'function') || typeof p.run !== 'function') {
          throw new Error('Missing phase condition or implementation: ' + p.id);
        }
        return { order:p.order, id:p.id, cadence:p.cadence, mode:p.mode };
      });
    })).toEqual(rows);
  });

test('registration is ordered, detached and pure; cadence, mode, conditions and stop control dispatch',
  async function ({ page }, testInfo) {
    await openTitle(page, testInfo);
    expect(await page.evaluate(function () {
      const D = FB.dayPhases, before = JSON.stringify(FBDATA);
      const state = FB.state, observing = FB.game.observe, rng = FB.getRngState(), uid = FB.getUidCounter();
      const original = D.list(), firstId = original[0].id;
      original[0].id = 'changed'; original[0].order = -100;
      const detached = D.list()[0].id === firstId && D.list()[0].order === 10;
      let trace = [];
      function phase(id, order, cadence, mode, condition, run) {
        return { id:id, order:order, cadence:cadence, mode:mode, condition:condition,
          run:run || function () { trace.push(id); } };
      }
      const declaration = phase('test.daily', 1, 'daily', 'both', null);
      D.register(phase('test.year', 4, 'newYear', 'both', null));
      D.register(declaration);
      declaration.order = -1; declaration.run = function () { throw new Error('Aliased declaration.'); };
      D.register(phase('test.season', 3, 'seasonBoundary', 'both', null));
      D.register(phase('test.play', 2, 'daily', 'play', null));
      D.register(phase('test.observe', 2.1, 'daily', 'observe', null));
      D.register(phase('test.unavailable', 2.2, 'daily', 'both', function () { return false; }));
      D.register(phase('test.stop', 9, 'daily', 'both', null, function (s, p, c) { c.stop(undefined); }));
      D.register(phase('test.unreachable', 9.5, 'daily', 'both', null));
      const count = D.list().length;
      let rejected = 0;
      [
        phase('test.daily', 5, 'daily', 'both', null),
        phase('test.duplicateOrder', 1, 'daily', 'both', null),
        phase('test.badCadence', 5, 'weekly', 'both', null),
        phase('test.badMode', 5, 'daily', 'unknown', null),
        phase('test.badCondition', 5, 'daily', 'both', true),
        Object.assign(phase('test.badRun', 5, 'daily', 'both', null), { run:null }),
        phase('test.badOrder', Infinity, 'daily', 'both', null)
      ].forEach(function (p) { try { D.register(p); } catch (error) { rejected++; } });
      const pure = FB.state === state && JSON.stringify(FBDATA) === before &&
        FB.getRngState() === rng && FB.getUidCounter() === uid;
      // Boundary setup is test-local and runs before all production phases.
      D.register(phase('test.boundaries', 0, 'daily', 'both', null, function (s, p, c) {
        c.seasonBoundary = s.testSeason; c.newYear = s.testYear;
      }));
      const runs = [];
      [false, true].forEach(function (observe) {
        FB.game.observe = observe;
        [
          { testSeason:false, testYear:false },
          { testSeason:true, testYear:false },
          { testSeason:true, testYear:true }
        ].forEach(function (boundary) {
          FB.state = Object.assign({ player:{} }, boundary);
          trace = [];
          const result = D.run();
          runs.push({ trace:trace, blocked:result === undefined });
        });
      });
      FB.state = state;
      FB.game.observe = observing;
      return { detached:detached, rejected:rejected, atomic:D.list().length === count + 1,
        pure:pure, runs:runs };
    })).toEqual({
      detached:true, rejected:7, atomic:true, pure:true,
      runs:[
        { trace:['test.daily', 'test.play'], blocked:true },
        { trace:['test.daily', 'test.play', 'test.season'], blocked:true },
        { trace:['test.daily', 'test.play', 'test.season', 'test.year'], blocked:true },
        { trace:['test.daily', 'test.observe'], blocked:true },
        { trace:['test.daily', 'test.observe', 'test.season'], blocked:true },
        { trace:['test.daily', 'test.observe', 'test.season', 'test.year'], blocked:true }
      ]
    });
  });

test('preflight blockers stop before focus, date, RNG, UID or campaign mutation',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const G = FB.game, s = FB.state, cases = [];
      G.setPaused(true); FB.ui.closeModal();
      function blocked(name, setup, opts) {
        const undo = [];
        function patch(object, key, value) {
          const original = object[key];
          undo.push(function () { object[key] = original; }); object[key] = value;
        }
        setup(patch);
        const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
        try {
          const result = G.passDay(opts);
          cases.push({ name:name, blocked:result === undefined, unchanged:JSON.stringify(FB.state) === before,
            rng:FB.getRngState() === rng, uid:FB.getUidCounter() === uid });
        } finally { undo.reverse().forEach(function (restore) { restore(); }); }
      }
      function noPublicDecisions(patch) {
        patch(FB, 'papacyPendingDecision', function () { return null; });
        patch(FB, 'greatHolyWarSettlementNeedsPlayer', function () { return false; });
      }
      blocked('no state', function (patch) { patch(FB, 'state', null); });
      blocked('dead player', function (patch) { patch(s.player, 'dead', true); });
      blocked('events busy', function (patch) { patch(FB.ui, 'eventsBusy', function () { return true; }); });
      blocked('travel picker', function (patch) { patch(FB.ui, 'travelPickerOpen', function () { return true; }); });
      let papalShown = 0, holyShown = 0, pauses = 0, commits = 0;
      blocked('papal decision', function (patch) {
        patch(FB, 'systemAvailable', function () { return true; });
        patch(FB, 'papacyPendingDecision', function () { return { id:'pending' }; });
        patch(G, 'setPaused', function (value) { if (value) pauses++; });
        patch(FB.ui, 'showPapacy', function () { papalShown++; });
      });
      blocked('holy war settlement', function (patch) {
        noPublicDecisions(patch);
        patch(FB, 'greatHolyWarSettlementNeedsPlayer', function () { return true; });
        patch(G, 'setPaused', function (value) { if (value) pauses++; });
        patch(FB.ui, 'showGreatHolyWarSettlement', function () { holyShown++; });
      });
      blocked('rejected production', function (patch) {
        noPublicDecisions(patch);
        patch(FB.production, 'commitDay', function () { commits++; return false; });
      }, { skipFocus:true, productionAction:{} });
      blocked('conflicting actions', function (patch) {
        noPublicDecisions(patch);
        patch(FB.production, 'commitDay', function () { commits++; return true; });
      }, { skipFocus:true, productionAction:{}, householdAction:{} });
      blocked('rejected household', function (patch) {
        noPublicDecisions(patch);
        patch(FB.householdStories, 'commitDay', function () { commits++; return false; });
      }, { skipFocus:true, householdAction:{} });
      blocked('observer action', function (patch) {
        noPublicDecisions(patch); patch(G, 'observe', true);
        patch(FB.production, 'commitDay', function () { commits++; return true; });
      }, { skipFocus:true, productionAction:{} });
      return { cases:cases, papalShown:papalShown, holyShown:holyShown, pauses:pauses, commits:commits };
    })).toEqual({
      cases:['no state', 'dead player', 'events busy', 'travel picker', 'papal decision',
        'holy war settlement', 'rejected production', 'conflicting actions', 'rejected household', 'observer action']
        .map(function (name) { return { name:name, blocked:true, unchanged:true, rng:true, uid:true }; }),
      papalShown:1, holyShown:1, pauses:2, commits:2
    });
  });

['intrigue', 'yearly life'].forEach(function (cause) {
  test(cause + ' death stops all remaining phases at its existing boundary',
    async function ({ page }, testInfo) {
      await openGame(page, testInfo);
      await startDeterministicGame(page);
      const result = await page.evaluate(function (cause) {
        const G = FB.game, s = FB.state, calls = [];
        G.setPaused(true); G.auto.all = true; FB.ui.closeModal();
        s.turn = cause === 'intrigue' ? 89 : 359;
        s.date = { year:867, season:cause === 'intrigue' ? 0 : 3, day:90 };
        if (cause === 'yearly life') s.chars[s.player.charId].born = 760; // guaranteed ordinary age mortality
        const undo = [];
        function observe(object, key, label) {
          const original = object[key];
          object[key] = function () { calls.push(label); return original.apply(this, arguments); };
          undo.push(function () { object[key] = original; });
        }
        observe(FB, 'marketSeason', 'market');
        observe(FB, 'fiscalDay', 'fiscalDay');
        observe(FB, 'armyTick', 'armies');
        observe(FB, 'pickDailyEvents', 'events');
        const autosave = FB.save.autosave;
        FB.save.autosave = function () { calls.push(s.player.dead ? 'dead save' : 'living save'); return autosave.apply(this, arguments); };
        const intrigue = FB.intrigueSeason;
        if (cause === 'intrigue') FB.intrigueSeason = function () { s.player.dead = true; calls.push('intrigue death'); };
        try { return { result:G.passDay(), dead:s.player.dead, turn:s.turn, calls:calls }; }
        finally {
          FB.intrigueSeason = intrigue; FB.save.autosave = autosave;
          undo.reverse().forEach(function (restore) { restore(); });
        }
      }, cause);
      // fiscalSeason settles fiscalDay internally before the living autosave.
      // A later top-level fiscalDay, army or event call would add another entry.
      expect(result).toEqual({ result:'dead', dead:true, turn:cause === 'intrigue' ? 90 : 360,
        calls:cause === 'intrigue' ? ['intrigue death'] : ['market', 'fiscalDay', 'living save'] });
    });
});

test('manual deeds, recurring deeds and travel keep the existing focus branches',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const G = FB.game, s = FB.state, calls = [];
      G.setPaused(true); FB.ui.closeModal();
      const tick = FB.tickFocus, validate = FB.validateFocus, completed = FB.noteDeedCompleted;
      const recurring = FB.autoRecurringDeed;
      const travel = s.player.travel, auto = G.auto;
      FB.tickFocus = function () { calls.push('tick'); };
      FB.validateFocus = function () { calls.push('validate'); };
      FB.noteDeedCompleted = function () { calls.push('completed'); };
      FB.autoRecurringDeed = function () { calls.push('recurring'); return true; };
      // Stop immediately after focus, before social work or calendar advancement.
      FB.dayPhases.register({ id:'test.afterFocus', order:125, cadence:'daily', mode:'both',
        condition:null, run:function (s, p, c) { c.stop('probe'); } });
      try {
        G.auto = null;
        G.passDay();
        G.passDay({ skipFocus:true });
        G.auto = { recurringDeeds:{} };
        G.passDay();
        G.auto = null; s.player.travel = {};
        G.passDay();
        return calls;
      } finally {
        FB.tickFocus = tick; FB.validateFocus = validate; FB.noteDeedCompleted = completed;
        FB.autoRecurringDeed = recurring; s.player.travel = travel; G.auto = auto;
      }
    })).toEqual(['tick', 'completed', 'validate', 'recurring', 'validate']);
  });

test('refresh options and visible, autoresolved and empty event batches keep one completion path',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const G = FB.game, results = [], calls = [];
      G.setPaused(true); FB.ui.closeModal();
      const pick = FB.pickDailyEvents, run = FB.ui.runEvents, after = G.afterEvents, refresh = FB.ui.refresh;
      const observing = G.observe;
      let events = [{}], visible = true;
      FB.pickDailyEvents = function () { calls.push('pick'); return events; };
      FB.ui.runEvents = function (batch, opts) { calls.push('events:' + opts.syncRulers); return visible; };
      G.afterEvents = function (opts) { calls.push('after:' + opts.syncRulers + ':' + opts.liveTick + ':' + opts.deferUi); };
      FB.ui.refresh = function (opts) { calls.push(opts && opts.liveTick ? 'refresh:live' : 'refresh:ordinary'); };
      function pass(opts) {
        calls.length = 0;
        results.push({ result:G.passDay(opts), calls:calls.slice() });
      }
      try {
        pass({ liveTick:true });
        visible = false;
        pass();
        events = [];
        pass({ liveTick:true, deferUi:true });
        G.observe = true;
        pass({ liveTick:true });
        pass({ deferUi:true });
        return results;
      } finally {
        FB.pickDailyEvents = pick; FB.ui.runEvents = run; G.afterEvents = after; FB.ui.refresh = refresh;
        G.observe = observing;
      }
    })).toEqual([
      { result:'event', calls:['pick', 'refresh:live', 'events:false'] },
      { result:'day', calls:['pick', 'refresh:ordinary', 'events:false'] },
      { result:'day', calls:['pick', 'after:false:true:true'] },
      { result:'day', calls:['refresh:live'] },
      { result:'day', calls:[] }
    ]);
  });

test('scheduler extraction preserves exact reviewed quoted-id counts in both engine files', function () {
  const entries = JSON.parse(fs.readFileSync(path.join(root,
    'tests/e2e/fixtures/engine-ids/content-id-allowlist.json'), 'utf8')).hooks;
  ['js/main.js', 'js/day_phases.js'].forEach(function (file) {
    const counts = new Map();
    scanSource(fs.readFileSync(path.join(root, file), 'utf8')).literals.forEach(function (row) {
      counts.set(row.value, (counts.get(row.value) || 0) + 1);
    });
    entries.forEach(function (entry) {
      expect(counts.get(entry.id) || 0, file + ': ' + entry.id).toBe((entry.uses || {})[file] || 0);
    });
  });
});
