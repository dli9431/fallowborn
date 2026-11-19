'use strict';

const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

class DiscoveryReporter {
  onBegin(config, suite) {
    const tests = suite.allTests();
    if (process.env.CI_DISCOVERY_INVENTORY) {
      const cases = tests.map(test => {
        let owner = test.parent;
        while (owner && owner.type !== 'file') owner = owner.parent;
        assert(owner && owner.location, 'Could not resolve spec for ' + test.id);
        let scope;
        if (process.env.CI_ROLLING) {
          // The pinned runner retains hook ownership on the discovered suite tree,
          // including hooks registered by imported helpers. Keep the outermost
          // shared lifecycle or serial suite intact inside one worker.
          for (let parent = test.parent; parent && parent.type !== 'project'; parent = parent.parent) {
            assert(Array.isArray(parent._hooks), 'Missing suite lifecycle metadata');
            if (parent._parallelMode === 'serial' || parent._hooks.some(h => h.type === 'beforeAll' || h.type === 'afterAll'))
              scope = JSON.stringify(parent.titlePath());
          }
        }
        return { id:test.id, project:test.parent.project().name, scope,
          file:path.relative(process.cwd(), owner.location.file).split(path.sep).join('/'),
          line:test.location.file === owner.location.file ? test.location.line : null,
          title:test.titlePath().slice(3).join(' > ') };
      });
      fs.writeFileSync(process.env.CI_DISCOVERY_INVENTORY, JSON.stringify(cases));
    } else {
      fs.writeFileSync(process.env.CI_DISCOVERY_IDS, JSON.stringify(tests.map(test => test.id)));
    }
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
  const groups = process.env.SHARD_GROUPS ? JSON.parse(process.env.SHARD_GROUPS) : null;
  if (groups) {
    assert.equal(groups.length, total, 'Supply one file list per requested shard');
    const files = groups.flat();
    assert.equal(new Set(files).size, files.length, 'A file appears in multiple shard groups');
  }
  const execute = promisify(execFile);

  if (process.env.CI_ROLLING) {
    const rolling = require('./ci-rolling');
    const inventory = path.join(temp, 'inventory.json');
    const emptyBlob = path.join(temp, 'empty.zip');
    await execute(process.execPath, [cli, 'test', ...selection, '--list', '--workers=1',
      '--reporter=blob,' + __filename], {env:{...process.env, CI_DISCOVERY_INVENTORY:inventory,
      PLAYWRIGHT_BLOB_OUTPUT_FILE:emptyBlob}, maxBuffer:16 * 1024 * 1024});
    const timings = fs.existsSync(rolling.historyFile()) ? JSON.parse(fs.readFileSync(rolling.historyFile())) : {};
    const cases = JSON.parse(fs.readFileSync(inventory));
    const plan = rolling.makePlan(cases, timings);
    if (!cases.length) fs.copyFileSync(emptyBlob, path.join(out, 'empty.zip'));
    fs.writeFileSync(path.join(out, 'rolling.json'), JSON.stringify(plan));
    fs.writeFileSync(path.join(out, 'selection.json'), JSON.stringify(plan.ids));
    const partitions = plan.batches.map(b => b.groups.flat());
    fs.writeFileSync(path.join(out, 'partitions.json'), JSON.stringify(partitions.length ? partitions : [[]]));
    const jobs = plan.jobs.map((_, i) => i + 1);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, 'shards=' + JSON.stringify(jobs) + '\n');
    const message = cases.length + ' cases, ' + cases.filter(c => timings[c.id]).length + ' measured, ' +
      partitions.length + ' bounded shards in ' + jobs.length + ' jobs (maximum 16 concurrent).';
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, message + '\n');
    console.log(message);
    return;
  }

  async function list(shard) {
    const idsFile = path.join(temp, shard + '.json');
    const blobFile = path.join(temp, String(shard), 'empty-' + shard + '.zip');
    const filters = shard && groups ? groups[shard - 1].concat(selection.filter(arg => arg.startsWith('--project='))) : selection;
    const args = [cli, 'test', ...filters, '--list', '--workers=' + process.env.WORKERS];
    if (shard && !groups) args.push('--shard=' + shard + '/' + total);
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
  fs.writeFileSync(path.join(out, 'partitions.json'), JSON.stringify(partitions));
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
      for (const test of spec.tests) {
        if (test.results.length) actual.push(test.id);
      }
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
