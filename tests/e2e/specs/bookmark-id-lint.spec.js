'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js',
  'data/bookmarks.js', 'data/bookmark_476.js',
  'data/bookmark_476_italy.js', 'data/bookmark_476_dalmatia_east.js',
  'data/bookmark_476_gaul_iberia.js', 'data/bookmark_476_africa.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { STRING_MARK, engineSources } = require('../support/source-literals');

const allowlistPath = path.resolve(__dirname, '..', 'fixtures', 'engine-ids',
  'bookmark-id-allowlist.json');
const kinds = ['legacy_default', 'legacy_contract', 'identity_key', 'pending'];
const target = '(?:\\bstart\\s*\\.\\s*id|\\bactiveBookmarkId)';
const literal = STRING_MARK;
const comparisons = [
  new RegExp(target + '\\s*\\)*\\s*[!=]==?\\s*' + literal),
  new RegExp(literal + '\\s*[!=]==?\\s*\\(*\\s*[\\w$.]*?' + target + '\\b')
];

/* Engine behavior should key on bookmark data, not on which bookmark is
   active. Every engine line that compares start.id or activeBookmarkId with
   a literal, or quotes a registered bookmark id, must be on the allowlist. */
function findings(bookmarkIds) {
  const out = new Map();
  for (const source of engineSources()) {
    const byLine = new Map();
    source.scan.literals.forEach(function (row) {
      if (!byLine.has(row.line)) byLine.set(row.line, []);
      byLine.get(row.line).push(row.value);
    });
    source.scan.maskedLines.forEach(function (masked, index) {
      const values = byLine.get(index + 1) || [];
      const compared = comparisons.some(function (pattern) { return pattern.test(masked); });
      const quoted = values.some(function (value) { return bookmarkIds.has(value); });
      if (!compared && !quoted) return;
      const text = source.lines[index].trim();
      const key = source.file + '\n' + text;
      const row = out.get(key) || { file:source.file, source:text, lines:[] };
      row.lines.push(index + 1);
      out.set(key, row);
    });
  }
  return out;
}

test('engine code names bookmark ids only on the reviewed allowlist',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The source lint reads files in Node and needs one browser target.');

    await openGame(page, testInfo);
    const registered = await page.evaluate(function () {
      return Object.keys(FBDATA.bookmarks || {}).sort();
    });
    expect(registered.length).toBeGreaterThan(0);

    const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const problems = [];
    const allowed = new Map();
    for (const entry of allowlist.entries) {
      const key = entry.file + '\n' + entry.source;
      if (kinds.indexOf(entry.kind) < 0 || !entry.reason) {
        problems.push('allowlist entry needs a known kind and a reason: ' +
          entry.file + ': ' + entry.source);
      }
      if (allowed.has(key)) problems.push('duplicate allowlist entry: ' + entry.file + ': ' + entry.source);
      allowed.set(key, entry);
    }

    const found = findings(new Set(registered));
    found.forEach(function (row, key) {
      const entry = allowed.get(key);
      const where = row.file + ':' + row.lines.join(',') + ': ' + row.source;
      if (!entry) {
        problems.push('not on the allowlist: ' + where);
      } else if (row.lines.length > (entry.count || 1)) {
        problems.push('more occurrences than allowed (' + (entry.count || 1) + '): ' + where);
      }
    });
    allowed.forEach(function (entry, key) {
      const row = found.get(key);
      const seen = row ? row.lines.length : 0;
      if (seen < (entry.count || 1)) {
        problems.push('stale allowlist entry, remove or lower it (' + seen + ' found): ' +
          entry.file + ': ' + entry.source);
      }
    });

    const pending = allowlist.entries.filter(function (entry) {
      return entry.kind === 'pending';
    }).length;
    testInfo.annotations.push({ type:'pending bookmark branches', description:String(pending) });
    expect(problems, problems.join('\n')).toEqual([]);
  });
