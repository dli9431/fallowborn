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
  const addedPath = path.join(repository, 'added.txt');
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
  fs.writeFileSync(addedPath, 'staged addition\n', 'utf8');
  testRunState.git(['add', 'added.txt'], repository);
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
  assert.equal(
    testRunState.git(['show', snapshot.commit + ':added.txt'], repository),
    'staged addition');
  assert.throws(function () {
    testRunState.git(['show', snapshot.commit + ':untracked.txt'], repository);
  });
  assert.equal(testRunState.validateBaseline(repository, snapshot.commit), true);

  testRunState.recordBaseline(markerPath, snapshot.commit);
  assert.equal(fs.readFileSync(markerPath, 'utf8'), snapshot.commit + '\n');
});

test('clean snapshots reuse HEAD despite cached-clean CRLF working files', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-clean-eol-repository-');
  const trackedPath = path.join(repository, 'tracked.js');

  testRunState.git(['init', '--quiet'], repository);
  testRunState.git(['config', 'core.autocrlf', 'true'], repository);
  fs.writeFileSync(trackedPath, 'first\r\nsecond\r\n', 'utf8');
  testRunState.git(['add', 'tracked.js'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  // The add cached the CRLF worktree as clean while storing LF in the commit.
  // Switching normalization off does not invalidate that stat cache, while a
  // fresh index would rehash the CRLF bytes as a false whole-file change.
  assert.equal(testRunState.git(['status', '--short'], repository), '');
  testRunState.git(['config', 'core.autocrlf', 'false'], repository);
  assert.equal(testRunState.git(['status', '--short'], repository), '');

  const snapshot = testRunState.createWorkingTreeSnapshot(repository);
  assert.equal(snapshot.head, head);
  assert.equal(snapshot.commit, head);
});

test('line-ending-only tracked edits reuse HEAD', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-eol-only-repository-');
  const trackedPath = path.join(repository, 'tracked.js');

  testRunState.git(['init', '--quiet'], repository);
  testRunState.git(['config', 'core.autocrlf', 'false'], repository);
  fs.writeFileSync(trackedPath, 'first\nsecond\n', 'utf8');
  testRunState.git(['add', 'tracked.js'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  fs.writeFileSync(trackedPath, 'first\r\nsecond\r\n', 'utf8');
  assert.match(testRunState.git(['status', '--short'], repository), /tracked\.js/);

  const snapshot = testRunState.createWorkingTreeSnapshot(repository);
  assert.equal(snapshot.commit, head);
});

test('line-ending-only paths are excluded beside real edits', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-mixed-eol-repository-');
  const changedPath = path.join(repository, 'changed.js');
  const eolOnlyPath = path.join(repository, 'eol-only.spec.js');

  testRunState.git(['init', '--quiet'], repository);
  testRunState.git(['config', 'core.autocrlf', 'false'], repository);
  fs.writeFileSync(changedPath, 'before\n', 'utf8');
  fs.writeFileSync(eolOnlyPath, 'unchanged\n', 'utf8');
  testRunState.git(['add', 'changed.js', 'eol-only.spec.js'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  fs.writeFileSync(changedPath, 'after\n', 'utf8');
  fs.writeFileSync(eolOnlyPath, 'unchanged\r\n', 'utf8');
  const snapshot = testRunState.createWorkingTreeSnapshot(repository);

  assert.notEqual(snapshot.commit, head);
  assert.equal(
    testRunState.git(['diff', '--name-only', head, snapshot.commit], repository),
    'changed.js');
});

test('snapshot text is canonical across Windows and Unix Git settings', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-canonical-eol-repository-');
  const attributesPath = path.join(repository, '.gitattributes');
  const trackedPath = path.join(repository, 'tracked.js');

  testRunState.git(['init', '--quiet'], repository);
  testRunState.git(['config', 'core.autocrlf', 'false'], repository);
  fs.writeFileSync(attributesPath, '* text=auto eol=lf\n', 'utf8');
  fs.writeFileSync(trackedPath, 'before\n', 'utf8');
  testRunState.git(['add', '.gitattributes', 'tracked.js'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);

  fs.writeFileSync(trackedPath, 'after\r\n', 'utf8');
  testRunState.git(['config', 'core.autocrlf', 'true'], repository);
  const windowsSnapshot = testRunState.createWorkingTreeSnapshot(repository);
  testRunState.git(['config', 'core.autocrlf', 'false'], repository);
  const unixSnapshot = testRunState.createWorkingTreeSnapshot(repository);

  assert.equal(windowsSnapshot.commit, unixSnapshot.commit);
  assert.equal(
    testRunState.gitRaw(['show', windowsSnapshot.commit + ':tracked.js'], repository),
    'after\n');
});

test('clean snapshot invariant rejects a mismatched tree', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-snapshot-invariant-');
  const trackedPath = path.join(repository, 'tracked.txt');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'before\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const original = testRunState.git(['rev-parse', 'HEAD'], repository);

  fs.writeFileSync(trackedPath, 'after\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Different fixture'
  ], repository);
  const different = testRunState.git(['rev-parse', 'HEAD'], repository);

  assert.throws(function () {
    testRunState.assertCleanSnapshotMatchesHead(repository, original, different);
  }, /clean tracked working tree produced a snapshot different from HEAD/i);
});

test('fallbackBaseline returns HEAD in a git repository', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-fallback-baseline-');
  const trackedPath = path.join(repository, 'tracked.txt');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'content\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  assert.equal(testRunState.fallbackBaseline(repository), head);
});

test('fallbackBaseline uses the upstream merge base when local commits are ahead', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-upstream-baseline-');
  const trackedPath = path.join(repository, 'tracked.txt');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'base\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Base fixture'
  ], repository);
  const base = testRunState.git(['rev-parse', 'HEAD'], repository);
  const branch = testRunState.git(['branch', '--show-current'], repository);
  testRunState.git(['update-ref', 'refs/heads/upstream-base', base], repository);
  testRunState.git(['config', 'branch.' + branch + '.remote', '.'], repository);
  testRunState.git([
    'config', 'branch.' + branch + '.merge', 'refs/heads/upstream-base'
  ], repository);

  fs.writeFileSync(trackedPath, 'ahead\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Ahead fixture'
  ], repository);

  assert.equal(testRunState.fallbackBaseline(repository), base);
});

test('recordBaseline updates a scoped persistent ref', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-record-ref-');
  const markerPath = path.join(repository, '.last-tested-commit.matrix');
  const trackedPath = path.join(repository, 'tracked.txt');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'content\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  const ref = testRunState.recordBaseline(markerPath, head, 'matrix');
  assert.equal(fs.readFileSync(markerPath, 'utf8'), head + '\n');
  assert.match(ref, /^refs\/fallowborn\/test-baselines\/[0-9a-f]{12}\/matrix$/);
  assert.equal(
    testRunState.git(['rev-parse', ref], repository),
    head);
});

test('fast and matrix baselines use independent markers and refs', function (t) {
  const repository = temporaryDirectory(t, 'fallowborn-scoped-baseline-');
  const trackedPath = path.join(repository, 'tracked.txt');
  const matrixMarker = path.join(repository, '.last-tested-commit.matrix');
  const fastMarker = path.join(repository, '.last-tested-commit.fast-chromium-served');

  testRunState.git(['init', '--quiet'], repository);
  fs.writeFileSync(trackedPath, 'content\n', 'utf8');
  testRunState.git(['add', 'tracked.txt'], repository);
  testRunState.git([
    '-c', 'user.name=Fallowborn Tests',
    '-c', 'user.email=tests@fallowborn.invalid',
    'commit', '--quiet', '-m', 'Initial fixture'
  ], repository);
  const head = testRunState.git(['rev-parse', 'HEAD'], repository);

  const matrixRef = testRunState.recordBaseline(matrixMarker, head, 'matrix');
  const fastRef = testRunState.recordBaseline(
    fastMarker, head, 'fast-chromium-served');

  assert.notEqual(matrixRef, fastRef);
  assert.equal(fs.readFileSync(matrixMarker, 'utf8'), head + '\n');
  assert.equal(fs.readFileSync(fastMarker, 'utf8'), head + '\n');
});
