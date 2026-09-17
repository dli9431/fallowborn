'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/main.js', 'js/lordships.js', 'js/world.js',
  'js/population.js', 'js/modifiers.js', 'js/technology.js', 'js/armies.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const fail of [false, true]) {
  test('settlement profiling ' + (fail ? 'restores readers after an exception' : 'reports scans without changing projections'), async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (fail) {
      const g = FB.game, s = FB.state, pid = s.player.provinceId;
      FB.rememberSettlementSites(s, pid);
      const day = g.passDay, frame = window.requestAnimationFrame;
      const finish = FB.ui.fastForwardFinished, coach = FB.ui.coachmarkOpen;
      const direct = FB.directSettlements, fiscal = FB.settlementFiscalProjection;
      const shares = FB.settlementPopulationShares;
      const before = JSON.stringify(FB.settlementFiscalProjection(s, pid, 0));
      s.player.flags.tut_unpause = 1;
      const saved = JSON.stringify(s), rng = FB.getRngState();
      const callbacks = [];
      window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
      FB.ui.fastForwardFinished = function () {};
      FB.ui.coachmarkOpen = function () { return false; };
      const injected = function () { throw new Error('settlement profiling probe'); };
      if (fail) FB.settlementPopulationShares = injected;
      let projection = null, error = null;
      g.passDay = function () {
        const context = {};
        projection = JSON.stringify(FB.settlementFiscalProjection(s, pid, 0, context));
        FB.settlementFiscalProjection(s, pid, 0, context);
        return 'season';
      };
      try {
        g.fastForwardTiming.enable(true);
        try {
          g.skipAhead();
          while (callbacks.length && g.fastForwarding) callbacks.shift()();
        } catch (err) { error = err.message; }
        return { report:g.fastForwardTiming.last, error:error,
          clean:!g._fastForwardTiming,
          restored:FB.directSettlements === direct && FB.settlementFiscalProjection === fiscal &&
            FB.settlementPopulationShares === (fail ? injected : shares),
          sameProjection:projection === before,
          sameState:JSON.stringify(s) === saved, sameRng:FB.getRngState() === rng };
      } finally {
        g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
        g.passDay = day; window.requestAnimationFrame = frame;
        FB.ui.fastForwardFinished = finish; FB.ui.coachmarkOpen = coach;
        FB.settlementPopulationShares = shares;
      }
    }, fail);
    expect(result.clean).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.error).toBe(fail ? 'settlement profiling probe' : null);
    expect(result.sameState).toBe(true);
    expect(result.sameRng).toBe(true);
    expect(result.report.workload.start.settlements.established).toBeGreaterThan(0);
    expect(result.report.rows['Settlement operation: settlementFiscalProjection'].calls).toBe(fail ? 1 : 2);
    expect(result.report.counters['Settlement: direct holding sites scanned']).toBeGreaterThan(0);
    if (!fail) {
      expect(result.sameProjection).toBe(true);
      expect(result.report.counters['Settlement: fiscal capacity cache hits']).toBe(1);
      expect(result.report.counters['Settlement: fiscal population cache hits']).toBe(1);
    }
    for (const row of Object.values(result.report.rows)) {
      expect(row.selfMs).toBeGreaterThanOrEqual(-0.001);
      expect(row.selfMs).toBeLessThanOrEqual(row.totalMs + 0.001);
    }
  });
}
