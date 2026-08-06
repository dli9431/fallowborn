'use strict';

const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const testRunState = require('./test-run-state');

function temporaryDirectory(t, prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(function () {
    fs.rmSync(directory, { recursive:true, force:true });
  });
  return directory;
}

test('changed selection retries recorded failures without requiring a baseline', function (t) {
  const directory = temporaryDirectory(t, 'fallowborn-last-run-');
  const statePath = path.join(directory, 'last-run.json');

  fs.writeFileSync(statePath, JSON.stringify({
    status:'failed',
    failedTests:['first', 'second']
  }), 'utf8');

  const state = testRunState.readLastRun(statePath);
  assert.deepEqual(state, {
    status:'failed',
    failedTests:['first', 'second']
  });
  assert.equal(testRunState.changedSelection(state), 'failed');
});

test('changed selection uses the tracked baseline when no retryable failure exists', function (t) {
  const directory = temporaryDirectory(t, 'fallowborn-last-run-');
  const statePath = path.join(directory, 'last-run.json');

  assert.equal(testRunState.readLastRun(statePath), null);
  assert.equal(testRunState.changedSelection(null), 'changed');

  fs.writeFileSync(statePath, JSON.stringify({
    status:'passed',
    failedTests:[]
  }), 'utf8');
  assert.equal(
    testRunState.changedSelection(testRunState.readLastRun(statePath)),
    'changed');

  fs.writeFileSync(statePath, '{invalid', 'utf8');
  assert.equal(testRunState.readLastRun(statePath), null);
});

test('working-tree snapshots include tracked edits without touching the real index', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-test-repository-');
  const markerPath = path.join(repository, '.last-tested-commit');
  const trackedPath = path.join(repository, 'tracked.txt');
  const stagedPath = path.join(repository, 'staged.txt');
  const untrackedPath = path.join(repository, 'untracked.txt');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'before\n', 'utf8');
  fs.writeFileSync(stagedPath, 'before\n', 'utf8');
  testRunState.git(['add', 'tracked.txt', 'staged.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);

  fs.writeFileSync(trackedPath, 'after\n', 'utf8');
  fs.writeFileSync(stagedPath, 'staged edit\n', 'utf8');
  testRunState.git(['add', 'staged.txt'], repository);
  fs.writeFileSync(stagedPath, 'working-tree edit\n', 'utf8');
  fs.writeFileSync(untrackedPath, 'new\n', 'utf8');
  const statusBefore = testRunState.git(['status', '--short'], repository);
  const snapshot = testRunState.createWorkingTreeSnapshot(repository);

  assert.equal(testRunState.git(['status', '--short'], repository), statusBefore);
  assert.equal(
    testRunState.git(['show', snapshot.commit + ':tracked.txt'], repository),
    'after');
  assert.equal(
    testRunState.git(['show', snapshot.commit + ':staged.txt'], repository),
    'working-tree edit');
  assert.throws(function () {
    testRunState.git(['show', snapshot.commit + ':untracked.txt'], repository);
  });
  assert.equal(testRunState.validateBaseline(repository, snapshot.commit), true);

  testRunState.recordBaseline(markerPath, snapshot.commit);
  assert.equal(fs.readFileSync(markerPath, 'utf8'), snapshot.commit + '\n');
});
