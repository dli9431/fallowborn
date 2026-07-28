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
