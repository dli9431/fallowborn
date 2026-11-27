'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/events_tutorial.js',
  'js/main.js',
  'js/wars.js',
  'js/ui_wars.js',
  'data/actions.js',
  'js/actions.js',
  'js/armies.js',
  'js/economy.js',
  'js/world.js',
  'js/papacy.js',
  'js/holywar.js',
  'js/modifiers.js',
  'js/politics.js',
  'js/institutions.js',
  'js/market.js',
  'js/treasury.js',
  'js/logistics.js',
  'js/events.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/portrait.js',
  'js/keys.js',
  'js/ui_topbar.js',
  'js/ui_modals.js',
  'js/mapview.js',
  'js/save.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openTitle } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test.beforeEach(async function ({ page }, testInfo) {
  await openTitle(page, testInfo);
});

test('fast-forward uses eight-millisecond slices and stops immediately at a boundary', async function ({ page }) {
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const game = FB.game, originalDay = game.passDay, originalFrame = window.requestAnimationFrame;
    const originalFinished = FB.ui.fastForwardFinished, originalCoachmark = FB.ui.coachmarkOpen;
    const originalNow = Object.getOwnPropertyDescriptor(performance, 'now');
    const callbacks = [], slices = [], options = [];
    let clock = 0, days = 0, finished = 0;
    Object.defineProperty(performance, 'now', { configurable:true, value:function () { return clock; } });
    window.requestAnimationFrame = function (callback) { callbacks.push(callback); return callbacks.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    FB.ui.fastForwardFinished = function () { finished++; };
    game.passDay = function (opts) { options.push(opts); clock += 5; days++; return days === 5 ? 'season' : 'day'; };
    try {
      game.skipAhead();
      while (callbacks.length && slices.length < 10) {
        const before = days; callbacks.shift()(); slices.push(days - before);
      }
      return { slices:slices, finished:finished, paused:game.paused,
        running:game.fastForwarding, options:options };
    } finally {
      game.passDay = originalDay; window.requestAnimationFrame = originalFrame;
      FB.ui.fastForwardFinished = originalFinished; FB.ui.coachmarkOpen = originalCoachmark;
      if (originalNow) Object.defineProperty(performance, 'now', originalNow); else delete performance.now;
      game.fastForwarding = false; game.paused = true;
    }
  });
  expect(result.slices).toEqual([2, 2, 1]);
  expect(result.finished).toBe(1);
  expect(result.paused).toBe(true);
  expect(result.running).toBe(false);
  expect(result.options).toEqual(Array.from({ length:5 }, function () { return { liveTick:true, deferUi:true }; }));
});


test('regular days and fast-forward never activate the profiler by default', async function ({ page }) {
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const g = FB.game, timing = g.fastForwardTiming;
    const original = { army:FB.armyTick, day:g.passDay, world:FB.worldTick,
      population:FB.populationYear, save:FB.save.serialize,
      finish:FB.ui.fastForwardFinished, frame:window.requestAnimationFrame,
      coach:FB.ui.coachmarkOpen, log:console.log, auto:g.auto.all };
    const callbacks = [];
    let normalCalls = 0, burstCalls = 0, activeRecorder = false, wrapped = false, reports = 0;
    function armyProbe() {
      if (g.fastForwarding) burstCalls++; else normalCalls++;
      activeRecorder = activeRecorder || Object.prototype.hasOwnProperty.call(g, '_fastForwardTiming');
      wrapped = wrapped || g.passDay !== original.day || FB.armyTick !== armyProbe ||
        FB.worldTick !== original.world || FB.populationYear !== original.population ||
        FB.save.serialize !== original.save || FB.ui.fastForwardFinished !== original.finish;
      return original.army.apply(this, arguments);
    }
    const defaults = !timing.isEnabled() && timing.last === null;
    FB.armyTick = armyProbe;
    window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    console.log = function () {
      if (arguments[0] === 'Fast-forward timing') reports++;
      return original.log.apply(console, arguments);
    };
    g.auto.all = true;
    FB.state.player.flags.tut_unpause = 1;
    try {
      // Run the real simulation, not a replacement passDay, without ever enabling timing.
      g.passDay({ liveTick:true });
      g.skipAhead();
      let frames = 0;
      while (callbacks.length && g.fastForwarding && frames++ < 200) callbacks.shift()();
      return { defaults:defaults, normalCalls:normalCalls, burstCalls:burstCalls,
        completed:!g.fastForwarding, activeRecorder:activeRecorder, wrapped:wrapped,
        enabled:timing.isEnabled(), report:timing.last, reports:reports,
        recorderPresent:Object.prototype.hasOwnProperty.call(g, '_fastForwardTiming') };
    } finally {
      g.fastForwarding = false; g.paused = true; g.auto.all = original.auto;
      FB.armyTick = original.army; window.requestAnimationFrame = original.frame;
      FB.ui.coachmarkOpen = original.coach; console.log = original.log;
    }
  });
  expect(result.normalCalls).toBeGreaterThan(0);
  expect(result.burstCalls).toBeGreaterThan(0);
  expect(result).toMatchObject({ defaults:true, completed:true, activeRecorder:false,
    wrapped:false, enabled:false, report:null, reports:0, recorderPresent:false });
});

test('local fast-forward timing is opt-in, separates nested work and restores functions', async function ({ page }) {
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const g = FB.game, profiler = g.fastForwardTiming;
    const defaults = !profiler.isEnabled() && profiler.last === null;
    const original = { day:g.passDay, army:FB.armyTick, finish:FB.ui.fastForwardFinished,
      frame:window.requestAnimationFrame, coach:FB.ui.coachmarkOpen };
    const descriptor = Object.getOwnPropertyDescriptor(performance, 'now');
    let clock = 0;
    const queue = [];
    Object.defineProperty(performance, 'now', { configurable:true, value:function () { return clock; } });
    window.requestAnimationFrame = function (fn) { queue.push(fn); return queue.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    FB.armyTick = function () { clock += 3; };
    const army = FB.armyTick;
    g.passDay = function () {
      if (g._fastForwardTiming) {
        g._fastForwardTiming.count('counter probe');
        g._fastForwardTiming.count('counter probe', 2);
      }
      FB.armyTick(); clock += 2; return 'season';
    };
    const day = g.passDay;
    FB.ui.fastForwardFinished = function () { clock += 4; };
    FB.state.player.flags.tut_unpause = 1;
    const state = JSON.stringify(FB.state), rng = FB.getRngState();
    try {
      g.skipAhead(); queue.shift()();
      const silent = profiler.last === null && g.passDay === day;
      const enabled = profiler.enable(true);
      g.skipAhead(); clock += 10; queue.shift()();
      const report = profiler.last;
      const restored = g.passDay === day && FB.armyTick === army;
      g.passDay = function () { throw new Error('timing failure probe'); };
      const failing = g.passDay;
      g.skipAhead();
      try { queue.shift()(); } catch (e) {}
      return { defaults:defaults, silent:silent, enabled:enabled, restored:restored,
        counter:report.counters['counter probe'], elapsed:report.elapsedMs, wait:report.betweenBatchesMs, simulation:report.simulationMs,
        self:report.rows['Simulation (all days)'].selfMs, army:report.rows.Armies.totalMs,
        ui:report.rows['Final UI refresh'].totalMs,
        errorRestored:g.passDay === failing && FB.armyTick === army && profiler.last.reason === 'error' && !g._fastForwardTiming,
        unchanged:JSON.stringify(FB.state) === state && FB.getRngState() === rng };
    } finally {
      g.fastForwarding = false; g.paused = true; profiler.enable(false);
      g.passDay = original.day; FB.armyTick = original.army; FB.ui.fastForwardFinished = original.finish;
      window.requestAnimationFrame = original.frame; FB.ui.coachmarkOpen = original.coach;
      if (descriptor) Object.defineProperty(performance, 'now', descriptor); else delete performance.now;
    }
  });
  expect(result).toEqual({ defaults:true, silent:true, enabled:true, restored:true,
    counter:3, elapsed:19, wait:10, simulation:5, self:2, army:3, ui:4, errorRestored:true, unchanged:true });
});


test('hosted origins cannot enable fast-forward diagnostics', async function ({ page, browser }) {
  const local = new URL(page.url());
  test.skip(local.protocol === 'file:', 'Origin denial uses the served fixture.');
  // The universal page guard intentionally rejects remote origins. Keep this
  // simulated origin in its own context and allow only routed local game assets.
  const { runtimePathAllowed } = require('../support/page-contract');
  const context = await browser.newContext({ serviceWorkers:'block' });
  const faults = [];
  try {
    await context.route('**/*', async function (route) {
      const requested = new URL(route.request().url());
      if (requested.origin !== 'http://timing-denied.invalid' ||
          !runtimePathAllowed(requested.pathname)) {
        faults.push('Unexpected request: ' + requested.href);
        await route.abort();
        return;
      }
      const response = await route.fetch({ url:local.origin + requested.pathname + requested.search });
      await route.fulfill({ response:response });
    });
    const hosted = await context.newPage();
    hosted.on('pageerror', function (error) { faults.push(error.message); });
    hosted.on('console', function (message) {
      if (message.type() === 'error') faults.push(message.text());
    });
    hosted.on('response', function (response) {
      if (response.status() >= 400) faults.push('HTTP ' + response.status() + ': ' + response.url());
    });
    await hosted.goto('http://timing-denied.invalid' + local.pathname + local.search);
    await hosted.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
    expect(await hosted.evaluate(function () {
      const timing = FB.game.fastForwardTiming;
      return { enabled:timing.enable(true), active:timing.isEnabled(), last:timing.last,
        recorderPresent:Object.prototype.hasOwnProperty.call(FB.game, '_fastForwardTiming') };
    })).toEqual({ enabled:false, active:false, last:null, recorderPresent:false });
    expect(faults).toEqual([]);
  } finally {
    await context.close();
  }
});

test('profiling captures workload changes and scoped fiscal inputs without retaining wrappers', async function ({ page }) {
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const g = FB.game, s = FB.state, callbacks = [];
    const original = { day:g.passDay, finish:FB.ui.fastForwardFinished,
      frame:window.requestAnimationFrame, coach:FB.ui.coachmarkOpen,
      quote:FB.armyProvisionQuote, tax:FB.countyTaxBase, support:FB.countyPopularSupport };
    const rid = Object.keys(s.realms).filter(function (id) {
      return id !== 'player' && s.realms[id].alive && s.realms[id].rank >= 1;
    }).sort()[0];
    const host = { realm:rid, warId:'holy', at:s.realms[rid].capital,
      men:1000, units:{ levy:1000 }, supply:50, path:[s.realms[rid].capital], moveLeft:1 };
    s.armies = [host];
    FB.treasurySnapshot(s);
    FB.armyProvisionQuote(s, host);
    // Starting a burst records the same activation as pressing Play.
    g.setPaused(false); g.setPaused(true);
    const snapshot = JSON.stringify(s), rng = FB.getRngState();
    const modifier = FB.modBonus;
    let cacheContracts = false;
    window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    FB.ui.fastForwardFinished = function () {};
    g.passDay = function () {
      cacheContracts = FB.countyPopularSupport !== original.support && FB.modBonus !== modifier &&
        FB.countyPopularSupport.militaryCacheSafe === true && FB.modBonus.militaryCacheSafe === true;
      FB.treasurySnapshot(s);
      FB.armyProvisionQuote(s, host);
      FB.armyProvisionQuote(s, host);
      g._fastForwardTiming.repeat('Probe', 'same', s.turn);
      g._fastForwardTiming.repeat('Probe', 'same', s.turn + 1);
      host.path = []; host.moveLeft = 0; host.supply = 0; host.men = 900;
      return 'season';
    };
    try {
      g.fastForwardTiming.enable(true);
      g.skipAhead();
      while (callbacks.length && g.fastForwarding) callbacks.shift()();
      const report = g.fastForwardTiming.last;
      const changed = JSON.parse(snapshot);
      changed.armies[0] = Object.assign({}, changed.armies[0], {
        path:[], moveLeft:0, supply:0, men:900
      });
      return { workload:report.workload, rows:report.rows, counters:report.counters, cacheContracts:cacheContracts,
        restored:FB.armyProvisionQuote === original.quote && FB.countyTaxBase === original.tax &&
          FB.countyPopularSupport === original.support && FB.modBonus === modifier && !g._fastForwardTiming,
        rngSame:FB.getRngState() === rng,
        stateSame:JSON.stringify(s) === JSON.stringify(changed) };
    } finally {
      g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
      g.passDay = original.day; FB.ui.fastForwardFinished = original.finish;
      window.requestAnimationFrame = original.frame; FB.ui.coachmarkOpen = original.coach;
    }
  });
  expect(result.workload.start.holyWarArmies).toBe(1);
  expect(result.workload.start.marchingArmies).toBe(1);
  expect(result.workload.end.marchingArmies).toBe(0);
  expect(result.workload.end.starvingArmies).toBe(1);
  expect(result.workload.end.soldiers).toBe(900);
  expect(result.workload.start.soldiers).toBe(1000);
  expect(result.rows['Treasury input: countyModifierSnapshot'].calls).toBeGreaterThan(0);
  expect(result.rows['Logistics operation: armyProvisionQuote'].calls).toBe(2);
  expect(result.rows['Provisioning input: armyProvisionUse'].calls).toBe(2);
  expect(result.counters['Provision quotes: host and county distinct same day']).toBe(1);
  expect(result.counters['Provision quotes: host and county repeated same day']).toBe(1);
  expect(result.counters['Probe distinct same day']).toBe(2);
  expect(result.counters['Probe repeated same day'] || 0).toBe(0);
  expect(result.restored).toBe(true); expect(result.rngSame).toBe(true);
  expect(result.stateSame).toBe(true);
  expect(result.cacheContracts).toBe(true);
});


test('fast-forward diagnostics expose nested army phases and remove their recorder', async function ({ page }) {
  await startDeterministicGame(page);
  const report = await page.evaluate(function () {
    const g = FB.game, originalDay = g.passDay, originalFinish = FB.ui.fastForwardFinished;
    const originalFrame = window.requestAnimationFrame, originalCoach = FB.ui.coachmarkOpen;
    const callbacks = [];
    window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
    FB.ui.coachmarkOpen = function () { return false; };
    FB.ui.fastForwardFinished = function () {};
    g.passDay = function () { FB.armyTick(FB.state); return 'season'; };
    try {
      g.fastForwardTiming.enable(true);
      g.skipAhead();
      while (callbacks.length && g.fastForwarding) callbacks.shift()();
      return { rows:g.fastForwardTiming.last.rows, clean:!g._fastForwardTiming };
    } finally {
      g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
      g.passDay = originalDay; FB.ui.fastForwardFinished = originalFinish;
      window.requestAnimationFrame = originalFrame; FB.ui.coachmarkOpen = originalCoach;
    }
  });
  expect(report.clean).toBe(true);
  expect(report.rows['Army phase: campaign setup'].calls).toBe(1);
  expect(report.rows['Army phase: muster and disband'].calls).toBe(1);
  expect(report.rows['Army operation: cohort replacements'].calls).toBe(1);
  const phaseTime = Object.keys(report.rows).filter(function (key) {
    return key.indexOf('Army phase: ') === 0;
  }).reduce(function (sum, key) { return sum + report.rows[key].totalMs; }, 0);
  expect(phaseTime).toBeLessThanOrEqual(report.rows.Armies.totalMs + 0.01);
  Object.keys(report.rows).forEach(function (key) {
    expect(report.rows[key].selfMs).toBeGreaterThanOrEqual(-0.01);
  });
});
