'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js',
  'data'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { engineSources } = require('../support/source-literals');

const fixtureDirectory = path.resolve(__dirname, '..', 'fixtures', 'engine-ids');
const allowlistPath = path.join(fixtureDirectory, 'content-id-allowlist.json');
const countsPath = path.join(fixtureDirectory, 'content-id-counts.json');
const MIN_ID_LENGTH = 3;

/* Reads the ids of every FBDATA table in the running page. An array of
   records contributes each record's string id; an object whose values are
   all records contributes its keys. Other objects are namespaces searched
   two levels deep. Nothing is written. */
function collectDataIds() {
  function plain(value) {
    return !!value && Object.prototype.toString.call(value) === '[object Object]';
  }
  const out = {};
  function walk(name, value, depth) {
    if (Array.isArray(value)) {
      const ids = value.filter(function (row) {
        return plain(row) && typeof row.id === 'string';
      }).map(function (row) { return row.id; });
      if (ids.length) out[name] = ids;
      return;
    }
    if (!plain(value)) return;
    const keys = Object.keys(value);
    if (!keys.length) return;
    if (keys.every(function (key) { return plain(value[key]); })) {
      out[name] = keys;
      return;
    }
    if (depth >= 2) return;
    keys.forEach(function (key) { walk(name + '.' + key, value[key], depth + 1); });
  }
  const keys = Object.keys(FBDATA).sort();
  keys.forEach(function (key) { walk(key, FBDATA[key], 0); });
  return { keys:keys, tables:out };
}

function quotedCounts() {
  const counts = new Map();
  for (const source of engineSources()) {
    for (const row of source.scan.literals) {
      const key = source.file + '\n' + row.value;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

test('every content-id reference is on the reviewed, file-bounded allowlist',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The ratchet reads data ids from one browser target.');

    await openGame(page, testInfo);
    const data = await page.evaluate(collectDataIds);
    const tables = data.tables;
    const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
    const problems = [];
    const ignored = allowlist.ignoredTables.map(function (entry) {
      if (!entry.reason) problems.push('ignored table needs a reason: ' + entry.table);
      return entry.table;
    });
    function ignoredTable(name) {
      return ignored.some(function (table) {
        return name === table || name.indexOf(table + '.') === 0;
      });
    }
    ignored.forEach(function (table) {
      if (data.keys.indexOf(table.split('.')[0]) < 0) {
        problems.push('stale ignored table, remove it: ' + table);
      }
    });

    const owners = new Map();
    Object.keys(tables).sort().forEach(function (name) {
      if (ignoredTable(name)) return;
      tables[name].forEach(function (id) {
        if (typeof id !== 'string' || id.length < MIN_ID_LENGTH) return;
        if (!owners.has(id)) owners.set(id, []);
        if (owners.get(id).indexOf(name) < 0) owners.get(id).push(name);
      });
    });

    // Reviewed DOM and presentation tokens have no content declaration.
    // A future table using one of these spellings needs a fresh review.
    ['provision','option','gift','list'].forEach(function (id) {
      expect(owners.has(id), 'Reviewed UI token became a content id: ' + id).toBe(false);
    });

    const typeFiles = await page.evaluate(function () { return FB.stories.typeFiles(); });
    const reusableFiles = new Set(Object.values(typeFiles));
    for (const [type, file] of Object.entries(typeFiles)) {
      expect(file, 'A registered type must declare its source: ' + type).toMatch(/^js\/story_[^/]+\.js$/);
    }
    for (const source of engineSources()) {
      if (!reusableFiles.has(source.file)) continue;
      const literals = source.scan.literals.filter(function (row) { return owners.has(row.value); });
      expect(literals, source.file + ' quotes content ids: ' + literals.map(function (row) { return row.value; }).join(', ')).toEqual([]);
      expect(allowlist.hooks.filter(function (hook) { return hook.uses[source.file] !== undefined; }),
        'Reusable types may not have content-id allowlist entries: ' + source.file).toEqual([]);
    }

    const hooks = new Map();
    allowlist.hooks.forEach(function (entry) {
      if (typeof entry.id !== 'string' || !entry.id) problems.push('hook needs an id');
      if (!entry.reason) problems.push('hook needs a reason: ' + entry.id);
      if (hooks.has(entry.id)) problems.push('duplicate hook: ' + entry.id);
      if (!entry.uses || !Object.keys(entry.uses).length) problems.push('hook needs bounded files: ' + entry.id);
      Object.keys(entry.uses || {}).forEach(function (file) {
        if (!/^js\/[^/]+\.js$/.test(file) || !Number.isInteger(entry.uses[file]) || entry.uses[file] < 1)
          problems.push('invalid file ceiling for ' + entry.id + ': ' + file);
      });
      hooks.set(entry.id, entry);
    });

    const counts = quotedCounts();
    const totals = new Map();
    counts.forEach(function (count, key) {
      const id = key.split('\n')[1]; totals.set(id, (totals.get(id) || 0) + count);
    });
    const actual = {};
    let total = 0;
    owners.forEach(function (names, id) {
      const count = totals.get(id) || 0;
      if (!count || hooks.has(id)) return;
      actual[id] = { count:count, tables:names };
      total += count;
    });
    testInfo.annotations.push({ type:'quoted content ids', description:String(total) });

    // Closing the ratchet removes the update escape hatch. New deliberate
    // references require a reviewed reason and an explicit per-file ceiling.
    counts.forEach(function (count, key) {
      const [file, id] = key.split('\n');
      const entry = hooks.get(id);
      if (!entry) return;
      const maximum = entry.uses && entry.uses[file];
      if (!Number.isInteger(maximum) || maximum < count) problems.push('unreviewed use of ' + id + ' in ' + file + ': ' + count + ' (allowed ' + (maximum || 0) + ')');
    });

    expect(fs.existsSync(countsPath),
      'The closed, zero-residual baseline is missing: ' + path.relative(process.cwd(), countsPath))
      .toBe(true);
    const recorded = JSON.parse(fs.readFileSync(countsPath, 'utf8'));
    expect(recorded.total).toBe(0);
    expect(recorded.ids).toEqual({});
    const recordedIds = recorded.ids || {};
    const ids = new Set(Object.keys(actual).concat(Object.keys(recordedIds)));
    Array.from(ids).sort().forEach(function (id) {
      const now = actual[id] ? actual[id].count : 0;
      const before = recordedIds[id] ? recordedIds[id].count : 0;
      if (now > before) {
        problems.push('more quoted uses of ' + JSON.stringify(id) + ' (' +
          (actual[id].tables.join(', ')) + '): ' + before + ' -> ' + now);
      } else if (now < before) {
        problems.push('Unexpected residual baseline for ' + JSON.stringify(id) + ': ' + before + ' -> ' + now);
      }
    });
    expect(problems, problems.join('\n')).toEqual([]);
    expect(total).toBe(0);
  });
