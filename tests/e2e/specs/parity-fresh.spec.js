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
  FRESH_JOURNEYS, captureWorldSnapshot, expectedScenarioTable, startParityGame, startScenarioTable
} = require('../support/game/parity');
const { parityMode, settleParityFixture } = require('../support/parity-fixtures');

/* Owner-run parity journeys: a fresh world per bookmark and start scenario,
   snapshotted at creation and after immediate save restore. They run
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

    if (journey.bookmark === '867' || journey.bookmark === '1066') {
      // Existing medieval fixtures describe the retained world. Expanded
      // district checkpoints have their own names in the date specification.
      await page.addInitScript(function (id) {
        window.addEventListener('DOMContentLoaded',function () {
          const b = window.FBDATA && FBDATA.bookmarks[id];
          if (b && b.revisions && b.revisions.baseline) b.revision = 'baseline';
        });
      },journey.bookmark);
    }
    const code = await startParityGame(page, testInfo, journey);
    const checkpoints = {start:await captureWorldSnapshot(page,null)};
    await page.evaluate(function () {FB.save.restore(JSON.parse(FB.save.serialize()));});
    checkpoints.restored = await captureWorldSnapshot(page,null);
    const id = journey.id + '-opening-restore';
    await settleParityFixture(testInfo, id, {
      id:id,
      kind:'fresh',
      bookmark:journey.bookmark,
      scenario:journey.scenario,
      code:code
    }, checkpoints);
  });
}
