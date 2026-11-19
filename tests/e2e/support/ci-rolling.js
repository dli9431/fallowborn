'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const targetMs = 375000;
const coldMs = 45000;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
const historyFile = () => path.join(process.env.RUNNER_TEMP, 'case-timings.json');

function makePlan(cases, timings) {
  const files = new Map();
  for (const test of cases) {
    const key = JSON.stringify([test.project, test.file]);
    if (!files.has(key)) files.set(key, []);
    files.get(key).push(test);
  }
  const batches = [];
  const measured = [];
  for (const tests of files.values()) {
    // Keep explicitly serial or shared lifecycle scopes together. Ordinary independent
    // cases (including parameterized tests on the same line) can be selected by ID.
    const groups = new Map();
    for (const test of tests) {
      const key = test.scope || test.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(test);
    }
    const sparse = tests.filter(t => timings[t.id] > 0).length < tests.length * 0.8;
    const buckets = [];
    for (const group of groups.values()) {
      const ms = group.reduce((sum, t) => sum + (timings[t.id] || coldMs), 0);
      let bucket = buckets.at(-1);
      if (!bucket || bucket.ms + ms > targetMs) {
        bucket = {ms:0, groups:[]};
        buckets.push(bucket);
      }
      bucket.groups.push(group.map(t => t.id));
      bucket.ms += ms;
    }
    if (sparse || buckets.length > 1) batches.push(...buckets);
    else measured.push(...buckets);
  }
  const packed = [];
  for (const file of measured.sort((a,b) => b.ms - a.ms)) {
    const batch = packed.find(b => b.ms + file.ms <= targetMs);
    if (batch) { batch.ms += file.ms; batch.groups.push(...file.groups); }
    else packed.push(file);
  }
  batches.push(...packed);
  batches.sort((a,b) => b.ms - a.ms);
  const count = Math.min(batches.length, 256, Math.max(16, Math.ceil(batches.length / 3)));
  const jobs = Array.from({length:count}, () => ({ms:0, batches:[]}));
  for (const [index, batch] of batches.entries()) {
    const job = jobs.reduce((a,b) => a.ms <= b.ms ? a : b);
    job.batches.push(index);
    job.ms += batch.ms;
  }
  const ids = batches.flatMap(b => b.groups.flat()).sort();
  assert.deepEqual(ids, cases.map(c => c.id).sort());
  assert.equal(new Set(ids).size, ids.length);
  return {batches, jobs:jobs.map(j => j.batches), ids};
}

function reportTests(report) {
  const tests = [];
  function visit(s) {
    for (const spec of s.specs) tests.push(...spec.tests);
    s.suites.forEach(visit);
  }
  report.suites.forEach(visit);
  return tests;
}

function learn(report, previous) {
  for (const test of reportTests(report)) {
    const result = test.results.find(r => r.status === 'passed');
    if (result && Number.isFinite(result.duration)) previous[test.id] = Math.max(1000, result.duration);
  }
  return previous;
}

function execute(groups, name, destination, canSplit) {
  const dir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP, 'batch-'));
  const ids = groups.flat();
  const filter = path.join(dir, 'cases.json');
  write(filter, {status:'failed', failedTests:ids});
  const compact = path.join(dir, 'results.json');
  const cli = path.resolve('node_modules/@playwright/test/cli.js');
  const blob = path.join(dir, 'blob', 'report.zip');
  const result = spawnSync('timeout', ['--signal=INT', '--kill-after=30s', '600s',
    process.execPath, cli, 'test', '--last-failed', '--workers=1', '--output=test-results/' + name,
    '--reporter=blob,line,' + path.join(__dirname, 'ci-report.js')], {
    stdio:'inherit', env:{...process.env, PLAYWRIGHT_LAST_RUN_OUTPUT_FILE:filter,
      PLAYWRIGHT_BLOB_OUTPUT_FILE:blob, FB_CI_REPORT_FILE:compact}
  });
  if (result.error) throw result.error;
  const report = read(compact);
  const tests = reportTests(report);
  assert.deepEqual(tests.map(t => t.id).sort(), [...ids].sort(), 'Unexpected browser selection');
  if (canSplit && result.status === 124 && !report.errors.length && !report.stats.unexpected &&
      groups.length > 1 && !tests.some(t => t.results.some(r => ['failed','timedOut'].includes(r.status)))) {
    const parts = path.join(dir, 'parts');
    fs.mkdirSync(parts);
    const half = Math.ceil(groups.length / 2);
    const a = execute(groups.slice(0,half), name + '-a', path.join(parts,'a.zip'), false);
    const b = execute(groups.slice(half), name + '-b', path.join(parts,'b.zip'), false);
    const merge = spawnSync(process.execPath, [cli, 'merge-reports','--reporter=blob',parts], {
      stdio:'inherit', env:{...process.env,PLAYWRIGHT_BLOB_OUTPUT_FILE:path.join(dir,'merged','report.zip')}
    });
    assert.equal(merge.status, 0, 'Could not merge deadline replacements');
    fs.copyFileSync(path.join(dir,'merged','report.zip'), destination);
    return a && b;
  }
  fs.copyFileSync(blob, destination);
  return result.status === 0 && !report.errors.length && !report.stats.unexpected &&
    tests.every(t => t.results.length && !t.results.some(r => r.status === 'interrupted'));
}

function run(planFile, number) {
  const plan = read(planFile);
  fs.mkdirSync('blob-report', {recursive:true});
  let ok = true;
  for (const index of plan.jobs[number - 1]) {
    const name = 'batch-' + (index + 1);
    if (!execute(plan.batches[index].groups, name, path.resolve('blob-report', name + '.zip'), true)) ok = false;
  }
  if (!ok) process.exitCode = 1;
}

if (require.main === module) {
  if (process.argv[2] === 'learn') {
    const prior = fs.existsSync(historyFile()) ? read(historyFile()) : {};
    write(historyFile(), learn(read(process.argv[3]), prior));
  } else run(process.argv[2], Number(process.argv[3]));
}

module.exports = {makePlan, learn, historyFile};
