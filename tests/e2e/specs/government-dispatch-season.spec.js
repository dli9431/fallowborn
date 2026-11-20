'use strict';

const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { test, expect } = require('../support/fixture');
const { startParityGame, FRESH_JOURNEYS } = require('../support/game/parity');

dependsOnRuntime(__filename, [
  'index.html', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_sources.js',
  'data/government_rollout.js', 'js/bookmark_setup.js', 'js/governments.js',
  'js/authority.js', 'js/mods.js', 'js/main.js', 'js/day_phases.js', 'js/save.js', 'js/save_v4.js'
]);

// Each date boots its own campaign and mod in a fresh page.
test.describe.configure({ mode:'parallel' });

async function advanceHalfSeason(page) {
  return page.evaluate(function () {
    const { turn, date:{ year, season, day } } = FB.state;
    for (let i = 0; i < 45; i++) {
      if (FB.state.player.dead) throw new Error('Player died at turn ' + FB.state.turn);
      // Use the same day runner and presentation options as fast-forward.
      const result = FB.game.passDay({ liveTick:true, deferUi:true });
      if (FB.state.turn !== turn + i + 1 || (result !== 'day' && result !== 'season')) {
        throw new Error('Day did not complete at turn ' + FB.state.turn + ' (' + result + ')');
      }
    }
    const next = FB.state.date;
    return { days:FB.state.turn - turn, year:next.year - year,
      season:next.season - season, day:next.day, fromDay:day };
  });
}

function campaignIdentity(text) {
  const { state, rng, uid, mods } = JSON.parse(text);
  // Ticks can expose a signed value, while save restore adopts the same 32 bits unsigned.
  return { state, rng:rng >>> 0, uid, mods };
}

async function restoreMidpoint(page, midpoint, rid) {
  const restored = await page.evaluate(function ({ midpoint, rid }) {
    const saved = JSON.parse(midpoint);
    FB.save.restore(saved);
    return {
      expected: { rng:saved.rng >>> 0, uid:saved.uid, mods:saved.mods, start:saved.state.start, date:saved.state.date,
        turn:saved.state.turn, government:saved.state.authority.governments[rid] },
      actual: { rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(), mods:FB.mods.sig(), start:FB.state.start, date:FB.state.date,
        turn:FB.state.turn, government:FB.state.authority.governments[rid] },
      form:FB.governments.forRealm(FB.state, rid).id,
      save:FB.save.serialize()
    };
  }, { midpoint, rid });
  expect(restored.actual, 'Saved midpoint identity').toEqual(restored.expected);
  expect(restored.form).toBe('fixture_composed');
  return campaignIdentity(restored.save);
}

for (const bookmark of ['867','1066','476']) {
  test(bookmark + ' data-only composed form plays a full season and replays from its midpoint', async function ({ page }, testInfo) {
    const rid = await test.step('Start the dated campaign and assign the composed government', async function () {
      const scenario = bookmark === '476' ? 'federate_476' : 'serf';
      const journey = FRESH_JOURNEYS.find(row => row.bookmark === bookmark && row.scenario === scenario);
      await startParityGame(page, testInfo, journey);
      return page.evaluate(function () {
        const s = FB.state;
        FB.mods.apply({ governmentForms:{ fixture_composed:Object.assign({}, FBDATA.governmentForms.territorial, {
          holders:'direct', strategyParameters:{ council:{ seats:[] }, ai:{ warChance:0 } }
        }) } });
        const rid = Object.keys(s.realms).find(function (id) {
          const r = s.realms[id];
          return id !== 'player' && r.alive && r.succession && !r.succession.papalElective && !r.nonTerritorial;
        });
        if (!FB.authoritySetGovernment(s, rid, 'fixture_composed')) throw new Error('Fixture form was not installed');
        return rid;
      });
    });

    const midpoint = await test.step('Play the first 45 days and save the midpoint', async function () {
      expect(await advanceHalfSeason(page)).toEqual({ days:45, year:0, season:0, day:46, fromDay:1 });
      return page.evaluateHandle(function () { return FB.save.serialize(); });
    });

    const first = await test.step('Restore the midpoint and complete the season', async function () {
      // Restore runs repair hooks for biographies and succession. Both continuations
      // start from the same saved input and must have identical repaired state.
      const restored = await restoreMidpoint(page, midpoint, rid);
      const advance = await advanceHalfSeason(page);
      expect(advance).toEqual({ days:45, year:0, season:1, day:1, fromDay:46 });
      return { restored, advance, save:campaignIdentity(await page.evaluate(function () { return FB.save.serialize(); })) };
    });

    await test.step('Restore the exact midpoint and replay the second half', async function () {
      expect(await restoreMidpoint(page, midpoint, rid), 'Full restored midpoint identity').toEqual(first.restored);
      expect(await advanceHalfSeason(page)).toEqual(first.advance);
      expect(campaignIdentity(await page.evaluate(function () { return FB.save.serialize(); })),
        'Full campaign identity after replay').toEqual(first.save);
    });
  });
}
