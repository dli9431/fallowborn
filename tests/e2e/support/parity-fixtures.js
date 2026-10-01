'use strict';

/* Node-side parity baselines: where fixtures live, how they are written so a
   diff stays readable, the Phase 0 save corpus, and the comparison. Game
   scripts are never loaded here; snapshots arrive from the browser page. */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { expect } = require('./fixture');

const SNAPSHOT_VERSION = 1;
const testRoot = path.resolve(__dirname, '..');
const gameRoot = path.resolve(testRoot, '..', '..');
const manifestPath = path.join(gameRoot, 'docs', 'plans', 'v2-476-phase-0',
  'save-manifest.json');
const MAX_REPORTED_DIFFERENCES = 60;

function parityMode() {
  const mode = process.env.FB_PARITY;
  return mode === 'capture' || mode === 'compare' ? mode : null;
}

function parityDirectory() {
  return process.env.FB_PARITY_DIR
    ? path.resolve(process.env.FB_PARITY_DIR)
    : path.join(testRoot, 'fixtures', 'parity');
}

function factsOnly() {
  return process.env.FB_PARITY_FACTS_ONLY === '1';
}

/* Short values stay on one line; larger ones open one entry per line, so a
   province or realm change is a one-line diff. */
function formatJson(value, indent) {
  indent = indent || '';
  const flat = JSON.stringify(value);
  if (value === null || typeof value !== 'object' || flat.length + indent.length <= 100) {
    return flat;
  }
  const inner = indent + '  ';
  if (Array.isArray(value)) {
    return '[\n' + value.map(function (item) {
      return inner + formatJson(item, inner);
    }).join(',\n') + '\n' + indent + ']';
  }
  return '{\n' + Object.keys(value).map(function (key) {
    return inner + JSON.stringify(key) + ': ' + formatJson(value[key], inner);
  }).join(',\n') + '\n' + indent + '}';
}

function differences(expected, actual, ignored) {
  const out = [];
  function walk(left, right, where) {
    if (out.length >= MAX_REPORTED_DIFFERENCES || ignored(where)) return;
    const objects = left && right && typeof left === 'object' && typeof right === 'object' &&
      Array.isArray(left) === Array.isArray(right);
    if (objects) {
      const keys = Object.keys(left).concat(Object.keys(right).filter(function (key) {
        return !Object.prototype.hasOwnProperty.call(left, key);
      }));
      keys.forEach(function (key) {
        walk(left[key], right[key], where ? where + '.' + key : key);
      });
      return;
    }
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      out.push(where + '\n    baseline: ' + JSON.stringify(left) +
        '\n    current:  ' + JSON.stringify(right));
    }
  }
  walk(expected, actual, '');
  return out;
}

function fixturePath(name) {
  return path.join(parityDirectory(), name + '.json');
}

/* Capture writes the baseline; compare reads it and reports every changed
   fact. The current snapshot is always attached for inspection. */
async function settleParityFixture(testInfo, name, journey, checkpoints) {
  const actual = { harness:SNAPSHOT_VERSION, journey:journey, checkpoints:checkpoints };
  const text = formatJson(actual) + '\n';
  await testInfo.attach(name + '.json', { body:text, contentType:'application/json' });
  const file = fixturePath(name);
  if (parityMode() === 'capture') {
    fs.mkdirSync(path.dirname(file), { recursive:true });
    fs.writeFileSync(file, text);
    testInfo.annotations.push({ type:'parity baseline written', description:file });
    return;
  }
  expect(fs.existsSync(file),
    'No parity baseline at ' + file + '. Capture one from the baseline tree first ' +
    '(docs/TESTS.md, Parity baselines).').toBe(true);
  const expected = JSON.parse(fs.readFileSync(file, 'utf8'));
  expect(expected.harness, 'Baseline was captured by another snapshot version; recapture it.')
    .toBe(SNAPSHOT_VERSION);
  expect(expected.journey, 'Baseline journey definition differs; recapture it.')
    .toEqual(journey);
  const skipRng = factsOnly();
  const found = differences(expected.checkpoints, checkpoints, function (where) {
    return skipRng && /^[^.]+\.(rng|uid)$/.test(where);
  });
  expect(found, found.length + (found.length >= MAX_REPORTED_DIFFERENCES ? '+' : '') +
    ' parity differences:\n  ' + found.join('\n  ')).toEqual([]);
}

function corpusRoot() {
  return process.env.FB_PARITY_CORPUS
    ? path.resolve(process.env.FB_PARITY_CORPUS)
    : gameRoot;
}

function corpusSlug(file) {
  return file.replace(/^saves\//, '').replace(/\.[^./]+$/, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* The Phase 0 corpus as recorded in the public manifest. The exports
   themselves stay in the ignored saves/ folder, never in the repository;
   manifest paths are relative to the game checkout, or to FB_PARITY_CORPUS
   when another checkout holds them. */
function corpusEntries() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.files.map(function (entry) {
    return {
      id:'corpus-' + corpusSlug(entry.path),
      path:entry.path,
      sha256:entry.sha256,
      bytes:entry.bytes,
      bookmark:entry.start && entry.start.id || null
    };
  });
}

function readCorpusExport(entry) {
  const absolute = path.join(corpusRoot(), entry.path);
  if (!fs.existsSync(absolute)) return { missing:absolute };
  const bytes = fs.readFileSync(absolute);
  return {
    absolute:absolute,
    sha256:crypto.createHash('sha256').update(bytes).digest('hex'),
    text:bytes.toString('utf8')
  };
}

module.exports = {
  corpusEntries:corpusEntries,
  corpusRoot:corpusRoot,
  differences:differences,
  formatJson:formatJson,
  parityDirectory:parityDirectory,
  parityMode:parityMode,
  readCorpusExport:readCorpusExport,
  settleParityFixture:settleParityFixture
};
