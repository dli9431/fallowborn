'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const testRunState = require('./test-run-state');

const testRoot = path.resolve(__dirname, '..');
const mode = process.argv[2];
let stateScope = 'matrix';
let boundedRuntimeDependencies = false;
const recordedStateScopes = [];
const extraArgs = process.argv.slice(3).filter(function (argument) {
  if (argument === '--bounded-runtime-dependencies') {
    boundedRuntimeDependencies = true;
    return false;
  }
  if (argument.indexOf('--state-scope=') === 0) {
    stateScope = argument.slice('--state-scope='.length);
    return false;
  }
  if (argument.indexOf('--record-state-scope=') === 0) {
    recordedStateScopes.push(argument.slice('--record-state-scope='.length));
    return false;
  }
  return true;
});

if ((mode !== 'all' && mode !== 'changed') ||
    !/^[a-z0-9][a-z0-9-]*$/.test(stateScope) ||
    recordedStateScopes.some(function (scope) {
      return !/^[a-z0-9][a-z0-9-]*$/.test(scope);
    })) {
  console.error(
    'Usage: node support/run-selected-tests.js <all|changed> ' +
    '[--bounded-runtime-dependencies] ' +
    '[--state-scope=<scope>] [--record-state-scope=<scope>] ' +
    '[Playwright arguments]');
  process.exit(2);
}

const markerPath = path.join(testRoot, '.last-tested-commit.' + stateScope);
const lastRunPath = path.join(testRoot, '.last-test-run.' + stateScope + '.json');

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
    let baseline = null;
    if (fs.existsSync(markerPath)) {
      const recorded = fs.readFileSync(markerPath, 'utf8').trim();
      if (/^[0-9a-f]{40}$/i.test(recorded) && testRunState.validateBaseline(testRoot, recorded)) {
        baseline = recorded;
      }
    }
    if (!baseline) {
      try {
        baseline = testRunState.fallbackBaseline(testRoot);
      } catch (error) {
        console.error('Cannot determine a safe changed-test fallback baseline: ' + error.message);
        process.exit(2);
      }
      console.log('No valid test baseline recorded; falling back to ' + baseline + '.');
    }
    try {
      const comparisonBaseline = testRunState.overlayBaselinePaths(
        testRoot, baseline, snapshot.commit,
        [
          path.join(testRoot, 'playwright.config.js'),
          path.join(testRoot, 'support', 'runtime-dependencies.js')
        ]);
      if (comparisonBaseline !== baseline) {
        console.log(
          'Using the current changed-test selection rules and project scopes.');
      }
      baseline = comparisonBaseline;
    } catch (error) {
      console.error('Cannot prepare the changed-test comparison baseline: ' + error.message);
      process.exit(2);
    }
    playwrightArgs.push('--only-changed=' + baseline);
  }
}

playwrightArgs.push('--last-failed-file=' + lastRunPath);
playwrightArgs.push.apply(playwrightArgs, extraArgs);

const childEnv = Object.assign({}, process.env, {
  FB_BOUNDED_CHANGED_RUNTIME_DEPENDENCIES:
    boundedRuntimeDependencies ? '1' : '0'
});
const result = childProcess.spawnSync(process.execPath, playwrightArgs, {
  cwd:testRoot,
  env:childEnv,
  stdio:'inherit'
});

if (result.error) {
  console.error('Unable to start Playwright: ' + result.error.message);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status === null ? 1 : result.status);

let baselines;
try {
  baselines = testRunState.recordSuccessfulScopes(
    testRoot, snapshot.commit, [stateScope].concat(recordedStateScopes));
} catch (error) {
  console.error('Tests passed, but the successful baseline could not be recorded: ' + error.message);
  process.exit(2);
}
baselines.forEach(function (baseline) {
  console.log(
    'Recorded successful tracked-worktree test baseline: ' + snapshot.commit +
    ' (HEAD ' + snapshot.head + ', scope ' + baseline.scope +
    ', ref ' + baseline.ref + ')');
});
