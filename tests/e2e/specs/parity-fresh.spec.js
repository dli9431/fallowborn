'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css',
  'js',
  'data'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const {
  FRESH_JOURNEYS, captureJourney, expectedScenarioTable, startParityGame, startScenarioTable
} = require('../support/game/parity');
const { parityMode, settleParityFixture } = require('../support/parity-fixtures');

/* Owner-run parity journeys: a fresh world per bookmark and start scenario,
   snapshotted at day 0, the next season and the next year boundary. They run
   only when FB_PARITY is capture or compare (docs/TESTS.md). */
test.describe.configure({ mode:'parallel' });

test('the fresh parity journeys cover every authored start scenario',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'Parity journeys use the served Chromium target.');
    await openGame(page, testInfo);
    expect(await startScenarioTable(page),
      'A start scenario was added or retargeted; add its fresh parity journey.')
      .toEqual(expectedScenarioTable());
  });

for (const journey of FRESH_JOURNEYS) {
  test('parity journey ' + journey.id, async function ({ page }, testInfo) {
    test.skip(!parityMode(), 'Set FB_PARITY=capture or FB_PARITY=compare to run parity journeys.');
    test.skip(testInfo.project.name !== 'chromium-served',
      'Parity journeys use the served Chromium target.');
    test.setTimeout(10 * 60 * 1000);

    await startParityGame(page, testInfo, journey);
    const checkpoints = await captureJourney(page);
    await settleParityFixture(testInfo, journey.id, {
      id:journey.id,
      kind:'fresh',
      bookmark:journey.bookmark,
      scenario:journey.scenario,
      code:journey.code
    }, checkpoints);
  });
}
