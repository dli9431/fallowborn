'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function git(args, cwd, env) {
  const result = childProcess.spawnSync('git', args, {
    cwd:cwd,
    env:env || process.env,
    encoding:'utf8',
    stdio:['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(detail || 'Git command failed: git ' + args.join(' '));
  }
  return result.stdout.trim();
}

function readLastRun(lastRunPath) {
  if (!fs.existsSync(lastRunPath)) return null;
  try {
    const value = JSON.parse(fs.readFileSync(lastRunPath, 'utf8'));
    if (!value || typeof value !== 'object') return null;
    if (typeof value.status !== 'string' || !Array.isArray(value.failedTests)) return null;
    return value;
  } catch (_error) {
    return null;
  }
}

function changedSelection(lastRun) {
  if (lastRun && lastRun.status === 'failed' && lastRun.failedTests.length) {
    return 'failed';
  }
  return 'changed';
}

function createWorkingTreeSnapshot(startDir) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], startDir);
  const head = git(['rev-parse', 'HEAD'], gitRoot);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-test-index-'));
  const indexPath = path.join(tempDir, 'index');
  const indexEnv = Object.assign({}, process.env, { GIT_INDEX_FILE:indexPath });

  try {
    git(['read-tree', head], gitRoot, indexEnv);
    // Capture the files that Git already tracks without touching the user's real
    // index. New untracked files remain changed until they are committed.
    git(['add', '-u', '--', '.'], gitRoot, indexEnv);
    const tree = git(['write-tree'], gitRoot, indexEnv);
    const commitEnv = Object.assign({}, indexEnv, {
      GIT_AUTHOR_NAME:'Fallowborn test runner',
      GIT_AUTHOR_EMAIL:'tests@fallowborn.invalid',
      GIT_AUTHOR_DATE:'946684800 +0000',
      GIT_COMMITTER_NAME:'Fallowborn test runner',
      GIT_COMMITTER_EMAIL:'tests@fallowborn.invalid',
      GIT_COMMITTER_DATE:'946684800 +0000'
    });
    const commit = git([
      'commit-tree', tree, '-p', head, '-m', 'Fallowborn local test snapshot'
    ], gitRoot, commitEnv);
    return { commit:commit, head:head };
  } finally {
    fs.rmSync(tempDir, { recursive:true, force:true });
  }
}

function validateBaseline(startDir, baseline) {
  if (!/^[0-9a-f]{40}$/i.test(baseline)) return false;
  try {
    git(['cat-file', '-e', baseline + '^{commit}'], startDir);
    return true;
  } catch (_error) {
    return false;
  }
}

function recordBaseline(markerPath, commit) {
  fs.writeFileSync(markerPath, commit + '\n', 'utf8');
}

module.exports = {
  changedSelection:changedSelection,
  createWorkingTreeSnapshot:createWorkingTreeSnapshot,
  git:git,
  readLastRun:readLastRun,
  recordBaseline:recordBaseline,
  validateBaseline:validateBaseline
};
