'use strict';

const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function gitResult(args, cwd, env) {
  return childProcess.spawnSync('git', args, {
    cwd:cwd,
    env:env || process.env,
    encoding:'utf8',
    stdio:['ignore', 'pipe', 'pipe']
  });
}

function gitError(result, args) {
  const detail = (result.stderr || result.stdout || '').trim();
  return new Error(detail || 'Git command failed: git ' + args.join(' '));
}

function gitRaw(args, cwd, env) {
  const result = gitResult(args, cwd, env);
  if (result.status !== 0) {
    throw gitError(result, args);
  }
  return result.stdout;
}

function git(args, cwd, env) {
  return gitRaw(args, cwd, env).trim();
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

function trackedWorkingTreePaths(gitRoot, head) {
  const output = gitRaw([
    'diff', '--name-only', '--no-renames', '-z', head, '--'
  ], gitRoot);
  if (!output) return [];
  return output.split('\0').filter(function (file) { return !!file; });
}

function hasMeaningfulWorkingTreeChange(gitRoot, head, file) {
  const args = [
    'diff', '--quiet', '--ignore-cr-at-eol', head, '--', file
  ];
  const result = gitResult(args, gitRoot);
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw gitError(result, args);
}

function assertCleanSnapshotMatchesHead(gitRoot, head, snapshotCommit) {
  const headTree = git(['rev-parse', head + '^{tree}'], gitRoot);
  const snapshotTree = git(['rev-parse', snapshotCommit + '^{tree}'], gitRoot);
  if (snapshotTree !== headTree) {
    throw new Error(
      'A clean tracked working tree produced a snapshot different from HEAD. ' +
      'Check repository line-ending attributes and Git clean filters.');
  }
}

function createWorkingTreeSnapshot(startDir) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], startDir);
  const head = git(['rev-parse', 'HEAD'], gitRoot);
  const changedPaths = trackedWorkingTreePaths(gitRoot, head).filter(function (file) {
    return hasMeaningfulWorkingTreeChange(gitRoot, head, file);
  });

  if (!changedPaths.length) {
    // Reuse the real commit for a clean or EOL-only tree. Besides avoiding
    // unnecessary objects, this preserves the real index's cached-clean EOL
    // semantics and keeps line-ending noise out of Playwright's raw Git diff.
    assertCleanSnapshotMatchesHead(gitRoot, head, head);
    return { commit:head, head:head };
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-test-index-'));
  const indexPath = path.join(tempDir, 'index');
  const indexEnv = Object.assign({}, process.env, { GIT_INDEX_FILE:indexPath });

  try {
    git(['read-tree', head], gitRoot, indexEnv);
    // Capture only paths the real index considers changed. Blanket-staging into
    // a fresh index would rehash cached-clean CRLF files on Windows. -A also
    // handles staged additions and deletions; truly untracked files stay out.
    changedPaths.forEach(function (file) {
      git(['add', '-A', '--', file], gitRoot, indexEnv);
    });
    const tree = git(['write-tree'], gitRoot, indexEnv);
    const headTree = git(['rev-parse', head + '^{tree}'], gitRoot);

    // Repository clean filters can reduce an apparent EOL-only edit back to
    // the HEAD tree. Treat that as clean rather than recording a new baseline.
    if (tree === headTree) {
      assertCleanSnapshotMatchesHead(gitRoot, head, head);
      return { commit:head, head:head };
    }

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

function fallbackBaseline(startDir) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], startDir);
  let upstream;
  try {
    upstream = git([
      'rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'
    ], gitRoot);
  } catch (_error) {
    return git(['rev-parse', 'HEAD'], gitRoot);
  }
  return git(['merge-base', 'HEAD', upstream], gitRoot);
}

function overlayBaselinePaths(startDir, baseline, sourceCommit, filePaths) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], startDir);
  const normalizedPaths = [];
  const seen = Object.create(null);
  filePaths.forEach(function (filePath) {
    const absolute = path.isAbsolute(filePath)
      ? path.resolve(filePath)
      : path.resolve(gitRoot, filePath);
    const relative = path.relative(gitRoot, absolute);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Baseline overlay path must stay inside the repository: ' + filePath);
    }
    const normalized = relative.split(path.sep).join('/');
    if (seen[normalized]) return;
    seen[normalized] = true;
    normalizedPaths.push(normalized);
  });
  if (!normalizedPaths.length) return baseline;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-test-overlay-'));
  const indexPath = path.join(tempDir, 'index');
  const indexEnv = Object.assign({}, process.env, { GIT_INDEX_FILE:indexPath });

  try {
    git(['read-tree', baseline], gitRoot, indexEnv);
    git(['reset', '-q', sourceCommit, '--'].concat(normalizedPaths), gitRoot, indexEnv);
    const tree = git(['write-tree'], gitRoot, indexEnv);
    const baselineTree = git(['rev-parse', baseline + '^{tree}'], gitRoot);
    if (tree === baselineTree) return baseline;

    const commitEnv = Object.assign({}, indexEnv, {
      GIT_AUTHOR_NAME:'Fallowborn test runner',
      GIT_AUTHOR_EMAIL:'tests@fallowborn.invalid',
      GIT_AUTHOR_DATE:'946684800 +0000',
      GIT_COMMITTER_NAME:'Fallowborn test runner',
      GIT_COMMITTER_EMAIL:'tests@fallowborn.invalid',
      GIT_COMMITTER_DATE:'946684800 +0000'
    });
    return git([
      'commit-tree', tree, '-p', baseline,
      '-m', 'Fallowborn changed-test comparison baseline'
    ], gitRoot, commitEnv);
  } finally {
    fs.rmSync(tempDir, { recursive:true, force:true });
  }
}

function baselineRef(startDir, scope) {
  const normalizedScope = String(scope || 'matrix');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalizedScope)) {
    throw new Error('Invalid test baseline scope: ' + normalizedScope);
  }
  const gitRoot = git(['rev-parse', '--show-toplevel'], startDir);
  const rawGitDir = git(['rev-parse', '--git-dir'], gitRoot);
  const gitDir = path.resolve(gitRoot, rawGitDir);
  const worktreeId = crypto.createHash('sha1').update(gitDir).digest('hex').slice(0, 12);
  return 'refs/fallowborn/test-baselines/' + worktreeId + '/' + normalizedScope;
}

function recordBaseline(markerPath, commit, scope) {
  const gitRoot = git(['rev-parse', '--show-toplevel'], path.dirname(markerPath));
  const ref = baselineRef(gitRoot, scope);
  git(['update-ref', ref, commit], gitRoot);
  fs.writeFileSync(markerPath, commit + '\n', 'utf8');
  return ref;
}

function recordSuccessfulScopes(testRoot, commit, scopes) {
  const recorded = [];
  const seen = Object.create(null);
  scopes.forEach(function (scope) {
    if (seen[scope]) return;
    seen[scope] = true;
    const markerPath = path.join(testRoot, '.last-tested-commit.' + scope);
    recorded.push({
      scope:scope,
      ref:recordBaseline(markerPath, commit, scope)
    });
  });
  recorded.forEach(function (entry) {
    const lastRunPath = path.join(
      testRoot, '.last-test-run.' + entry.scope + '.json');
    fs.writeFileSync(lastRunPath, JSON.stringify({
      status:'passed',
      failedTests:[]
    }, null, 2) + '\n', 'utf8');
  });
  return recorded;
}

module.exports = {
  assertCleanSnapshotMatchesHead:assertCleanSnapshotMatchesHead,
  baselineRef:baselineRef,
  changedSelection:changedSelection,
  createWorkingTreeSnapshot:createWorkingTreeSnapshot,
  fallbackBaseline:fallbackBaseline,
  git:git,
  gitRaw:gitRaw,
  hasMeaningfulWorkingTreeChange:hasMeaningfulWorkingTreeChange,
  overlayBaselinePaths:overlayBaselinePaths,
  readLastRun:readLastRun,
  recordBaseline:recordBaseline,
  recordSuccessfulScopes:recordSuccessfulScopes,
  trackedWorkingTreePaths:trackedWorkingTreePaths,
  validateBaseline:validateBaseline
};
