'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const testRoot = path.resolve(__dirname, '..');
const markerPath = path.join(testRoot, '.last-tested-commit');
const mode = process.argv[2];
const extraArgs = process.argv.slice(3);

if (mode !== 'all' && mode !== 'changed') {
  console.error('Usage: node support/run-selected-tests.js <all|changed>');
  process.exit(2);
}

function git(args) {
  const result = childProcess.spawnSync('git', args, {
    cwd:testRoot,
    encoding:'utf8',
    stdio:['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || 'Git command failed: git ' + args.join(' '));
  }
  return result.stdout.trim();
}

let currentCommit;
try {
  currentCommit = git(['rev-parse', 'HEAD']);
} catch (error) {
  console.error('Cannot identify the current Git commit: ' + error.message);
  process.exit(2);
}

const playwrightPackage = require.resolve('playwright/package.json');
const playwrightCli = path.join(path.dirname(playwrightPackage), 'cli.js');
const playwrightArgs = [playwrightCli, 'test'];

if (mode === 'changed') {
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
  try {
    git(['cat-file', '-e', baseline + '^{commit}']);
  } catch (_error) {
    console.error(
      'The recorded test baseline is unavailable in this clone. Run ' +
      '"npm run test:all" to establish a new baseline.');
    process.exit(2);
  }
  playwrightArgs.push('--only-changed=' + baseline);
}

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

fs.writeFileSync(markerPath, currentCommit + '\n', 'utf8');
console.log('Recorded successful test baseline: ' + currentCommit);
