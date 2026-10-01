'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css',
  'js',
  'data'
]);
const { test, expect } = require('../support/fixture');
const { captureJourney, loadParitySave } = require('../support/game/parity');
const {
  corpusEntries, corpusRoot, parityMode, readCorpusExport, settleParityFixture
} = require('../support/parity-fixtures');

/* Owner-run parity journeys over the Phase 0 save corpus. The exports stay
   outside the repository; each is verified against its manifest hash before
   import, then snapshotted on load, at the next season and at the next year
   boundary. They run only when FB_PARITY is capture or compare. */
test.describe.configure({ mode:'parallel' });

for (const entry of corpusEntries()) {
  test('parity journey ' + entry.id, async function ({ page }, testInfo) {
    test.skip(!parityMode(), 'Set FB_PARITY=capture or FB_PARITY=compare to run parity journeys.');
    test.skip(testInfo.project.name !== 'chromium-served',
      'Parity journeys use the served Chromium target.');
    const source = readCorpusExport(entry);
    test.skip(!!source.missing, 'Corpus export not found at ' + source.missing +
      '. Set FB_PARITY_CORPUS to the directory the manifest paths are relative to (' +
      corpusRoot() + ').');
    expect(source.sha256, entry.path + ' no longer matches its manifest hash. ' +
      'Restore the original export or record a new corpus entry.').toBe(entry.sha256);
    test.setTimeout(15 * 60 * 1000);

    const loadWarnings = await loadParitySave(page, testInfo, source.text);
    const checkpoints = await captureJourney(page);
    checkpoints.loadWarnings = loadWarnings;
    await settleParityFixture(testInfo, entry.id, {
      id:entry.id,
      kind:'corpus',
      bookmark:entry.bookmark,
      source:entry.path,
      sha256:entry.sha256
    }, checkpoints);
  });
}
