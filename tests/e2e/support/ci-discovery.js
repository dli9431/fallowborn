'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

class DiscoveryReporter {
  onBegin(config, suite) {
    fs.writeFileSync(process.env.CI_DISCOVERY_IDS, JSON.stringify(suite.allTests().map(test => test.id)));
  }

  onError(error) {
    console.error(error.message || error);
  }
}

module.exports = DiscoveryReporter;

async function plan() {
  const total = Number(process.env.SHARDS);
  assert(Number.isSafeInteger(total) && total >= 1 && total <= 256, 'Expected 1 to 256 shards');
  const out = path.join(process.env.RUNNER_TEMP, 'ci-selection');
  const temp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP, 'list-'));
  fs.mkdirSync(out, { recursive:true });
  const cli = path.resolve('node_modules/@playwright/test/cli.js');
  const selection = process.env.PLAYWRIGHT_ARGS.trim().split(/\s+/).filter(Boolean);
  const execute = promisify(execFile);

  async function list(shard) {
    const idsFile = path.join(temp, shard + '.json');
    const blobFile = path.join(temp, 'empty-' + shard + '.zip');
    const args = [cli, 'test', ...selection, '--list', '--workers=' + process.env.WORKERS];
    if (shard) args.push('--shard=' + shard + '/' + total);
    args.push('--reporter=' + (shard ? 'blob,' : '') + __filename);
    try {
      await execute(process.execPath, args, {env:{...process.env, CI_DISCOVERY_IDS:idsFile,
        PLAYWRIGHT_BLOB_OUTPUT_FILE:blobFile}, maxBuffer:16 * 1024 * 1024});
    } catch (error) {
      throw new Error(error.stderr || error.stdout || error.message);
    }
    const ids = JSON.parse(fs.readFileSync(idsFile, 'utf8'));
    if (shard && !ids.length) fs.renameSync(blobFile, path.join(out, path.basename(blobFile)));
    return ids;
  }

  const expected = total > 1 ? await list(0) : null;
  const partitions = new Array(total);
  let next = 0;
  async function discover() {
    while (next < total) {
      const i = next++;
      partitions[i] = await list(i + 1);
    }
  }
  await Promise.all(Array.from({length:Math.min(total, os.availableParallelism(), 4)}, discover));
  const ids = partitions.flat().sort();
  if (expected) assert.deepEqual(ids, expected.sort(), 'Sharded discovery differs from the full selection');
  assert.equal(new Set(ids).size, ids.length, 'Duplicate planned test ID');
  const shards = partitions.flatMap((tests, index) => tests.length ? [index + 1] : []);
  fs.writeFileSync(path.join(out, 'selection.json'), JSON.stringify(ids));
  fs.appendFileSync(process.env.GITHUB_OUTPUT, 'shards=' + JSON.stringify(shards) + '\n');
  const summary = ids.length + ' selected test/project cases in ' + shards.length + ' of ' + total + ' requested browser shards.';
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + '\n');
  console.log(summary);
}

function verify(selectionFile, reportFile) {
  const expected = JSON.parse(fs.readFileSync(selectionFile, 'utf8'));
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const actual = [];
  function visit(suite) {
    for (const spec of suite.specs) {
      for (const test of spec.tests) actual.push(test.id);
    }
    suite.suites.forEach(visit);
  }
  report.suites.forEach(visit);
  try {
    assert.deepEqual(actual.sort(), expected, 'Merged test/project identities differ from discovery');
  } catch (error) {
    report.coverage.complete = false;
    fs.writeFileSync(reportFile, JSON.stringify(report) + '\n');
    throw error;
  }
  console.log('Verified ' + actual.length + ' test/project identities against discovery.');
}

if (require.main === module) {
  if (process.argv[2] === 'verify') verify(process.argv[3], process.argv[4]);
  else plan().catch(error => { console.error(error); process.exitCode = 1; });
}
