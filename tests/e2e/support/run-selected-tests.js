'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const testRunState = require('./test-run-state');

const testRoot = path.resolve(__dirname, '..');
const markerPath = path.join(testRoot, '.last-tested-commit');
const lastRunPath = path.join(testRoot, '.last-test-run.json');
const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (mode !== 'all' && mode !== 'changed') {
  console.error('Usage: node support/run-selected-tests.js <all|changed>');
  process.exit(2);
}

let snapshot;
try {
  snapshot = testRunState.createWorkingTreeSnapshot(testRoot);
} catch (error) {
  console.error('Cannot snapshot the current Git working tree: ' + error.message);
  process.exit(2);
}

const playwrightPackage = require.resolve('playwright/package.json');
const playwrightCli = path.join(path.dirname(playwrightPackage), 'cli.js');
const playwrightArgs = [playwrightCli, 'test'];

if (mode === 'changed') {
  const selection = testRunState.changedSelection(testRunState.readLastRun(lastRunPath));
  if (selection === 'failed') {
    console.log('Previous Playwright run failed; rerunning its failed tests.');
    playwrightArgs.push('--last-failed');
  } else {
    if (!fs.existsSync(markerPath)) {
      console.error(
        'No successful test baseline exists. Run "npm run test:all" once first.');
      process.exit(2);
    }
    const baseline = fs.readFileSync(markerPath, 'utf8').trim();
    if (!/^[0-9a-f]{40}$/i.test(baseline)) {
      console.error(
        'The test baseline is invalid. Delete .last-tested-commit and run ' +
        '"npm run test:all" again.');
      process.exit(2);
    }
    if (!testRunState.validateBaseline(testRoot, baseline)) {
      console.error(
        'The recorded test baseline is unavailable in this clone. Run ' +
        '"npm run test:all" to establish a new baseline.');
      process.exit(2);
    }
    playwrightArgs.push('--only-changed=' + baseline);
  }
}

playwrightArgs.push('--last-failed-file=' + lastRunPath);
playwrightArgs.push.apply(playwrightArgs, extraArgs);

const result = childProcess.spawnSync(process.execPath, playwrightArgs, {
  cwd:testRoot,
  stdio:'inherit'
});

if (result.error) {
  console.error('Unable to start Playwright: ' + result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status === null ? 1 : result.status);

testRunState.recordBaseline(markerPath, snapshot.commit);
console.log(
  'Recorded successful tracked-worktree test baseline: ' + snapshot.commit +
  ' (HEAD ' + snapshot.head + ')');
