'use strict';

const { test, expect } = require('../support/fixture');
const {
  injectBrowserHarness,
  openGame,
  startDeterministicGame
} = require('../support/game');

test('a bounded simulation preserves game-state invariants',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The initial invariant smoke test runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);
    const result = await page.evaluate(function () {
      return FBTEST.advanceDays({
        days: 120,
        maxDays: 120,
        maxEvents: 80,
        maxInterruptions: 0,
        checkEvery: 15,
        style: 'first'
      });
    });

    expect(result).toMatchObject({
      startTurn: 0,
      endTurn: 120,
      advanced: 120,
      interruptions: 0
    });
    expect(result.events).toBeLessThanOrEqual(80);
    expect(await page.evaluate(function () {
      return FBTEST.checkInvariants();
    })).toEqual([]);
  });

test('year-boundary work does not grow with the character record count',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The year-boundary cost check runs against the primary file target.');
    test.slow();

    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await injectBrowserHarness(page);

    /* The defect this guards against is O(records x realms): every record
       that is not a reigning ruler paying a full realm scan in the yearly
       mortality pass. Rather than time it, which is flaky in CI, assert the
       shape directly - a tenfold record count must not multiply the number of
       realm lookups the reigning-ruler question costs. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      function probe() {
        let realmReads = 0;
        const realms = s.realms;
        const proxy = new Proxy(realms, {
          get:function (target, key) {
            if (typeof key === 'string') realmReads++;
            return target[key];
          },
          ownKeys:function (target) { return Reflect.ownKeys(target); }
        });
        s.realms = proxy;
        try {
          for (const id in s.chars) {
            const c = s.chars[id];
            if (c.dead) continue;
            FB.isReigningRealmRuler(s, c);
          }
        } finally {
          s.realms = realms;
        }
        return realmReads;
      }

      const baselineRecords = Object.keys(s.chars).length;
      const baselineReads = probe();

      /* Add a thousand ordinary records - the shape a long campaign reaches. */
      const me = s.chars[s.player.charId];
      for (let i = 0; i < 1000; i++) {
        FB.makeCharacter(s, {
          culture:me.culture, religion:me.religion,
          born:s.date.year - 30, traitsN:0
        });
      }
      const grownReads = probe();
      return {
        baselineRecords:baselineRecords,
        grownRecords:Object.keys(s.chars).length,
        /* Each added record may cost a small constant number of realm reads,
           never one per realm. The realm count is in the hundreds, so a
           per-record scan would blow through this bound immediately. */
        perAddedRecord:(grownReads - baselineReads) / 1000,
        realms:Object.keys(s.realms).length
      };
    }).then(function (result) {
      return {
        grew:result.grownRecords > result.baselineRecords,
        boundedPerRecord:result.perAddedRecord < 8,
        manyRealms:result.realms > 100
      };
    })).toEqual({ grew:true, boundedPerRecord:true, manyRealms:true });
  });
