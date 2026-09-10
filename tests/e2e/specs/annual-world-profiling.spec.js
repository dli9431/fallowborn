'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/main.js', 'js/world.js', 'js/model.js', 'js/population.js',
  'js/economy.js', 'data/economy.js', 'js/fortifications.js', 'js/papacy.js', 'js/holywar.js', 'js/agency.js']);
const { test, expect } = require('../support/fixture');
const { startWarSafety } = require('../support/game/war-safety');

for (const fail of [false, true]) {
  test('annual diagnostics ' + (fail ? 'close phases and restore hooks on error' : 'report nested world operations'), async function ({ page }, testInfo) {
    await startWarSafety(page, testInfo);
    const result = await page.evaluate(function (fail) {
      const g = FB.game, day = g.passDay, frame = window.requestAnimationFrame;
      const finish = FB.ui.fastForwardFinished, coach = FB.ui.coachmarkOpen;
      const population = FB.populationYear, capacity = FB.countyPopulationCapacity, world = FB.worldTick;
      FB.state.date.year++;
      const callbacks = [];
      window.requestAnimationFrame = function (fn) { callbacks.push(fn); return callbacks.length; };
      FB.ui.fastForwardFinished = function () {};
      FB.ui.coachmarkOpen = function () { return false; };
      const injected = function () { throw new Error('annual profiling probe'); };
      if (fail) FB.countyPopulationCapacity = injected;
      g.passDay = function () { FB.worldTick(FB.state); return 'season'; };
      let error = null;
      try {
        g.fastForwardTiming.enable(true);
        try {
          g.skipAhead();
          while (callbacks.length && g.fastForwarding) callbacks.shift()();
        } catch (err) { error = err.message; }
        return { report:g.fastForwardTiming.last, error:error, clean:!g._fastForwardTiming,
          restored:FB.worldTick === world && FB.populationYear === population &&
            FB.countyPopulationCapacity === (fail ? injected : capacity) };
      } finally {
        g.fastForwarding = false; g.paused = true; g.fastForwardTiming.enable(false);
        g.passDay = day; window.requestAnimationFrame = frame;
        FB.ui.fastForwardFinished = finish; FB.ui.coachmarkOpen = coach;
        FB.populationYear = population; FB.countyPopulationCapacity = capacity;
      }
    }, fail);
    expect(result.clean).toBe(true);
    expect(result.restored).toBe(true);
    expect(result.error).toBe(fail ? 'annual profiling probe' : null);
    const rows = result.report.rows;
    expect(rows.worldTick.calls).toBe(1);
    expect(rows['World annual operation: ensureDynasticState'].calls).toBeGreaterThanOrEqual(1);
    expect(rows['World annual operation: populationYear'].calls).toBe(1);
    expect(rows['World annual phase: preparation'].calls).toBe(1);
    expect(rows['World annual phase: fortifications and population'].calls).toBe(1);
    expect(rows['Population annual phase: normalization'].calls).toBe(1);
    expect(rows['Population annual phase: growth capacity and attraction'].calls).toBe(1);
    expect(rows['Population annual operation: countyPopulationCapacity'].calls).toBeGreaterThan(0);
    if (!fail) {
      expect(rows['World annual phase: realm families and rulers'].calls).toBe(1);
      expect(rows['Population annual phase: migration edge proposals'].calls).toBe(1);
      expect(rows['Population annual operation: enterpriseUpgradeEffectsByCounty'].calls).toBe(1);
      expect(rows['Population annual phase: enterprise upgrade snapshot'].calls).toBe(1);
      expect(rows['Population annual phase: apply population and settlement changes'].calls).toBe(1);
      expect(rows['Population annual phase: faith and culture projects'].calls).toBe(1);
      expect(rows['Population annual phase: final invariants'].calls).toBe(1);
      expect(result.report.counters['Population annual: counties']).toBeGreaterThan(0);
      expect(rows['World annual phase: vassal breakaways'].calls).toBe(1);
      expect(rows['World annual phase: alliances'].calls).toBe(1);
      expect(rows['World annual phase: AI buildings'].calls).toBe(1);
      expect(rows['World annual operation: royal family'].calls).toBeGreaterThan(0);
      expect(result.report.counters['World annual: realms processed']).toBeGreaterThan(0);
    }
    for (const row of Object.values(rows)) {
      expect(row.selfMs).toBeGreaterThanOrEqual(-0.001);
      expect(row.selfMs).toBeLessThanOrEqual(row.totalMs + 0.001);
    }
  });
}
