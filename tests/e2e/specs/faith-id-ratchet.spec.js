'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { engineSources } = require('../support/source-literals');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js', 'data/cultures.js']);

test('faith id literals are limited to documented compatibility and historical selectors', async function ({ page }, testInfo) {
  test.skip(testInfo.project.name !== 'chromium-served', 'One text-only scan covers all engine scripts.');
  await openGame(page, testInfo);
  const ids = new Set(await page.evaluate(function () { return Object.keys(FBDATA.religions); }));
  const allowlist = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'fixtures',
    'engine-ids', 'faith-id-allowlist.json'), 'utf8'));
  const expected = {}, actual = {};
  for (const row of allowlist.entries) {
    expect(row.reason).toBeTruthy();
    expect(ids.has(row.id), 'Stale faith allowlist id: ' + row.id).toBe(true);
    const key = row.file + ':' + row.id;
    expect(expected[key], 'Duplicate allowance: ' + key).toBeUndefined();
    expected[key] = row.count;
  }
  for (const source of engineSources()) {
    for (const literal of source.scan.literals) {
      if (!ids.has(literal.value)) continue;
      const key = source.file + ':' + literal.value;
      actual[key] = (actual[key] || 0) + 1;
    }
  }
  expect(actual).toEqual(expected);
});
