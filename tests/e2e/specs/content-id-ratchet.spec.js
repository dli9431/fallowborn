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
const { engineSources, scanSource } = require('../support/source-literals');
const { quotedCounts, reviewProblems, contentIdMetric, metricProblems } = require('../support/content-id-reviews');

const fixtureDirectory = path.resolve(__dirname, '..', 'fixtures', 'engine-ids');
const allowlistPath = path.join(fixtureDirectory, 'content-id-allowlist.json');
const countsPath = path.join(fixtureDirectory, 'content-id-counts.json');
const metricPath = path.join(fixtureDirectory, 'content-id-metric.json');
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
    expect(await page.evaluate(function () { return Object.prototype.hasOwnProperty.call(FB.stories, 'tokens'); }),
      'Protocol words must remain directly reviewable in their owning files.').toBe(false);
    const sources = engineSources();
    problems.push.apply(problems, reviewProblems(sources, reusableFiles, owners, allowlist.hooks));
    const metric = contentIdMetric(sources, owners, allowlist.hooks);
    testInfo.annotations.push({ type:'total quoted content-id uses', description:String(metric.total) });
    await testInfo.attach('quoted-content-id-metric', {
      body:JSON.stringify(metric, null, 2), contentType:'application/json'
    });
    expect(fs.existsSync(metricPath), 'The quoted content-id metric is missing').toBe(true);
    problems.push.apply(problems, metricProblems(metric, JSON.parse(fs.readFileSync(metricPath, 'utf8'))));

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

    const counts = quotedCounts(sources);
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

    // There is no update escape hatch. Adding or removing a reference requires
    // reviewing its exact per-file count, including structural collisions.

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

function audited(text, hook) {
  const file = 'js/story_example.js';
  return reviewProblems([{ file:file, scan:scanSource(text) }], new Set([file]),
    new Map([['host',['example']]]), hook ? [hook] : []);
}

test('structural spellings need explicit per-file reviews with exact counts', function () {
  const hook = { id:'host', category:'protocol_enum', reason:'Authority actor kind protocol.', uses:{ 'js/story_example.js':1 } };
  expect(audited("var kind = 'host';", hook)).not.toEqual([]);
  hook.protocolFiles = ['js/story_example.js'];
  expect(audited("var kind = 'host';", hook)).toEqual([]);
  expect(audited("var kind = 'host', extra = 'host';", hook)).not.toEqual([]);
  expect(audited('var kind = null;', hook)).not.toEqual([]);
});

test('moving a spelling behind the old token table cannot bypass the type audit', function () {
  expect(audited('var vocabulary = FB.stories.tokens;')).not.toEqual([]);
  expect(audited('var vocabulary = FB.\n stories.\n tokens;')).not.toEqual([]);
  expect(audited('var V = FB.stories.tokens; var kind = V.host;')).not.toEqual([]);
  expect(audited('var kind = V.arbitrary_content_id;')).not.toEqual([]);
});

test('token audit ignores spelling examples in comments and strings', function () {
  expect(audited('// FB.stories.tokens; V.host;\n' +
    '/* FB.\n stories.tokens; V.host; */\n' +
    "var example = 'FB.stories.tokens; V.host;';")).toEqual([]);
});

test('zero-use ceilings and authored-module reasons are rejected', function () {
  const sources = [{ file:'js/events.js', scan:scanSource('var tenure = null;') }];
  const hook = { id:'manorial_tenure', category:'protocol_enum', reason:'Tenure behavior protocol.', uses:{ 'js/events.js':3 } };
  const owners = new Map([['manorial_tenure',['tenures']]]);
  expect(reviewProblems(sources, new Set(), owners, [hook])).not.toEqual([]);
  expect(reviewProblems(sources, new Set(), owners, [hook]))
    .toContain('Reviewed count differs for manorial_tenure in js/events.js: 0 (reviewed 3)');
  hook.reason = 'Authored story-module reference.';
  hook.uses = {};
  expect(reviewProblems(sources, new Set(), owners, [hook])).not.toEqual([]);
  expect(reviewProblems(sources, new Set(), owners, [hook]))
    .toContain('Stale authored story reason: manorial_tenure');
});

test('hook reviews reject stale identities, empty files, boilerplate and unknown categories', function () {
  const sources = [{ file:'js/events.js', scan:scanSource("var state = 'host';") }];
  const owners = new Map([['host',['example']]]);
  const hook = { id:'host', category:'protocol_enum', reason:'Authority actor kind protocol.', uses:{ 'js/events.js':1 } };
  expect(reviewProblems(sources, new Set(), owners, [hook])).toEqual([]);
  expect(reviewProblems(sources, new Set(), new Map(), [hook])).toContain('Stale hook has no content declaration: host');
  expect(reviewProblems(sources, new Set(), owners, [Object.assign({}, hook, { uses:{} })]))
    .toContain('Hook needs nonzero file reviews: host');
  expect(reviewProblems(sources, new Set(), owners, [Object.assign({}, hook, { uses:{ 'js/events.js':0 } })]))
    .toContain('Invalid reviewed count for host in js/events.js');
  for (const reason of ['', 'Registered schema/strategy/role token host; static data shares this spelling.',
    'Existing hosts interpreter, saved enum or schema-token collision for host; references are limited.']) {
    expect(reviewProblems(sources, new Set(), owners, [Object.assign({}, hook, { reason:reason })]))
      .toContain('Hook needs a specific reason: host');
  }
  expect(reviewProblems(sources, new Set(), owners, [Object.assign({}, hook, { category:'other' })]))
    .toContain('Hook needs a recognized category: host');
});

test('the metric counts source uses by category and rejects growth even with updated file reviews', function () {
  const owners = new Map([['host',['actors']], ['age',['fields']], ['unreviewed',['records']]]);
  const hooks = [
    { id:'host', category:'protocol_enum', reason:'Authority actor kind protocol.', uses:{ 'js/events.js':1 } },
    { id:'age', category:'schema_token_collision', reason:'Character age field in eligibility validation.', uses:{ 'js/events.js':1 } }
  ];
  function metric(text, entries) {
    return contentIdMetric([{ file:'js/events.js', scan:scanSource(text) }], owners, entries || hooks);
  }
  const before = metric("var actor = 'host', field = 'age', unrelated = 'not_content'; // 'host'\n/* 'age' */");
  expect(before.total).toBe(2);
  expect(before.categories.protocol_enum).toBe(1);
  expect(before.categories.schema_token_collision).toBe(1);
  expect(metricProblems(before, before)).toEqual([]);
  const extra = [{ file:'js/events.js', scan:scanSource("var a = 'host', b = 'age', extra = 'host';") }];
  const updatedHooks = hooks.map(function (hook) {
    return hook.id === 'host' ? Object.assign({}, hook, { uses:{ 'js/events.js':2 } }) : hook;
  });
  expect(reviewProblems(extra, new Set(), owners, updatedHooks)).toEqual([]);
  expect(metricProblems(contentIdMetric(extra, owners, updatedHooks), before))
    .toContain('Quoted content-id total rose: 2 -> 3');
  const decreased = metric("var actor = 'host';");
  expect(metricProblems(decreased, before)).toContain('Quoted content-id total decreased; lower the tracked metric: 2 -> 1');
  expect(metricProblems(decreased, decreased)).toEqual([]);
  const decreasedHooks = hooks.filter(function (hook) { return hook.id === 'host'; });
  const decreasedSources = [{ file:'js/events.js', scan:scanSource("var actor = 'host';") }];
  expect(reviewProblems(decreasedSources, new Set(), owners, decreasedHooks)).toEqual([]);
  expect(metricProblems(contentIdMetric(decreasedSources, owners, decreasedHooks), decreased)).toEqual([]);
  expect(metric("var actor = 'host', extra = 'unreviewed';").total).toBe(2);
  expect(metric("var actor = 'host';", [])).toEqual(Object.assign({}, decreased, {
    categories:Object.assign({}, decreased.categories, { protocol_enum:0 })
  }));
});

test('the metric detects category shifts, missing categories and inconsistent totals', function () {
  const sources = [{ file:'js/events.js', scan:scanSource("var actor = 'host';") }];
  const owners = new Map([['host',['actors']]]);
  const before = contentIdMetric(sources, owners, [{ id:'host', category:'protocol_enum' }]);
  const shifted = contentIdMetric(sources, owners, [{ id:'host', category:'saved_identity' }]);
  expect(metricProblems(shifted, before)).toContain('Quoted content-id category saved_identity: 0 -> 1');
  expect(metricProblems(before, { total:1, categories:{} })).not.toEqual([]);
  expect(metricProblems(before, Object.assign({}, before, { total:2 })))
    .toContain('Metric categories must sum to the recorded total');
});

test('an added quoted content id in a real engine source fails the file review and total metric', function () {
  const allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  const recorded = JSON.parse(fs.readFileSync(metricPath, 'utf8'));
  const sources = engineSources();
  const owners = new Map(allowlist.hooks.map(function (hook) { return [hook.id, ['reviewed']]; }));
  expect(metricProblems(contentIdMetric(sources, owners, allowlist.hooks), recorded)).toEqual([]);
  const hook = allowlist.hooks.find(function (entry) { return entry.id === 'abandon_claim'; });
  const source = sources.find(function (entry) { return entry.file === 'js/actions.js'; });
  const fileHook = Object.assign({}, hook, { uses:{ 'js/actions.js':hook.uses['js/actions.js'] } });
  expect(reviewProblems([source], new Set(), owners, [fileHook])).toEqual([]);
  const injected = Object.assign({}, source, { scan:scanSource(source.text + "\nvar addedContentId = 'abandon_claim';\n") });
  expect(reviewProblems([injected], new Set(), owners, [fileHook]))
    .toContain('Reviewed count differs for abandon_claim in js/actions.js: 2 (reviewed 1)');
  const changed = sources.map(function (entry) { return entry === source ? injected : entry; });
  expect(metricProblems(contentIdMetric(changed, owners, allowlist.hooks), recorded))
    .toContain('Quoted content-id total rose: ' + recorded.total + ' -> ' + (recorded.total + 1));
});
