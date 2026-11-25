'use strict';

/* Compact JSON reporter for CI report merges. The built-in JSON reporter
   embeds every attachment and all output, which overflows a Node string for
   the full merged suite. This writes the same shape (stats, file suites with
   nested describe suites, specs, per-project tests and results) that
   support/ci-summary.js and the task runner read, without output or
   attachments, and with error messages truncated. The file goes to
   FB_CI_REPORT_FILE (default ci-report.json).

   Fields added for complete coverage leave every existing field and count
   unchanged. A case whose results are all interrupted, or which has none, is
   still counted and reported as skipped, and also carries unfinished:true;
   stats.unfinished counts those cases. A declared skip carries skipReason.
   With shard coverage metadata, coverage also lists the unfinished case ids
   and the over budget scope groups that support/ci-rolling.js recorded in
   rolling-job-<job>.json files in the merged blob folder. */

const fs = require('fs');
const path = require('path');

const MESSAGE_LIMIT = 4000;
const REASON_LIMIT = 240;
// A finished result is passed, failed or timedOut and a skipped result is settled.
const SETTLED = new Set(['passed', 'failed', 'timedOut', 'skipped']);

function trimMessage(error) {
  if (!error) return undefined;
  const message = String(error.message || error.value || '');
  return { message:message.length > MESSAGE_LIMIT ? message.slice(0, MESSAGE_LIMIT) + '\n[truncated]' : message };
}

// The description of a declared skip or fixme, or its type when it gives none.
function skipReason(test) {
  if (test.expectedStatus !== 'skipped') return undefined;
  let notes = test.annotations || [];
  test.results.forEach(function (r) { notes = notes.concat(r.annotations || []); });
  const note = notes.find(function (a) { return a && (a.type === 'skip' || a.type === 'fixme'); });
  const reason = String(note ? note.description || note.type : 'skip');
  return reason.length > REASON_LIMIT ? reason.slice(0, REASON_LIMIT) : reason;
}

// The blob folder merge-reports was given: its first positional argument, else the working directory.
function mergeFolder(argv) {
  const at = argv.indexOf('merge-reports');
  if (at < 0) return null;
  for (let i = at + 1; i < argv.length; i++) {
    if (argv[i] === '-c' || argv[i] === '--config' || argv[i] === '--reporter') i++;
    else if (argv[i].charAt(0) !== '-') return path.resolve(argv[i]);
  }
  return path.resolve('');
}

// Over budget scope groups from each rolling job summary, in job order.
function overBudget(folder) {
  const groups = [];
  if (!folder || !fs.existsSync(folder)) return groups;
  const files = fs.readdirSync(folder).map(function (name) { return /^rolling-job-(\d+)\.json$/.exec(name); })
    .filter(Boolean).sort(function (a, b) { return Number(a[1]) - Number(b[1]); });
  for (const match of files) {
    let summary;
    try {
      summary = JSON.parse(fs.readFileSync(path.join(folder, match[0]), 'utf8'));
    } catch (error) {
      console.log('::warning::Unreadable rolling job summary ' + match[0] + ': ' + error.message);
      continue;
    }
    for (const entry of summary.overBudget || []) {
      groups.push({ job:summary.job, batch:entry.batch, name:entry.name, ids:entry.ids || [],
        unfinished:entry.unfinished || [] });
    }
  }
  return groups;
}

class CompactJsonReporter {
  onBegin(config, suite) {
    this.config = config;
    this.root = suite;
    this.errors = [];
  }

  onError(error) {
    if (this.errors.length < 50) this.errors.push(trimMessage(error));
  }

  onEnd(result) {
    const files = new Map();
    const stats = { expected:0, unexpected:0, flaky:0, skipped:0, duration:result.duration || 0,
      startTime:result.startTime ? new Date(result.startTime).toISOString() : undefined };
    const unfinished = [];
    for (const test of this.root.allTests()) {
      const project = test.parent.project();
      const testDir = project && project.testDir ? project.testDir : this.config.rootDir;
      const file = path.relative(testDir, test.location.file).split(path.sep).join('/');
      // titlePath: root, project, file, ...describes, title.
      const describes = test.titlePath().slice(3, -1).filter(Boolean);
      let suite = files.get(file);
      if (!suite) {
        suite = { title:file, file:file, specs:[], suites:[] };
        files.set(file, suite);
      }
      for (const title of describes) {
        let child = suite.suites.find(function (s) { return s.title === title; });
        if (!child) {
          child = { title:title, file:file, specs:[], suites:[] };
          suite.suites.push(child);
        }
        suite = child;
      }
      let spec = suite.specs.find(function (s) { return s.title === test.title && s.line === test.location.line; });
      if (!spec) {
        spec = { title:test.title, file:file, line:test.location.line, column:test.location.column, tests:[] };
        suite.specs.push(spec);
      }
      const outcome = test.outcome();
      stats[outcome] = (stats[outcome] || 0) + 1;
      const row = {
        id:test.id,
        projectName:project ? project.name : '',
        status:outcome,
        results:test.results.map(function (r) {
          return { status:r.status, duration:r.duration, retry:r.retry, error:trimMessage(r.error) };
        })
      };
      if (!test.results.some(function (r) { return SETTLED.has(r.status); })) {
        row.unfinished = true;
        unfinished.push(test.id);
      } else if (outcome === 'skipped') {
        const reason = skipReason(test);
        if (reason !== undefined) row.skipReason = reason;
      }
      spec.tests.push(row);
    }
    stats.unfinished = unfinished.length;
    const report = { stats:stats, errors:this.errors, suites:Array.from(files.values()) };
    if (process.env.FB_CI_REPORT_EXPECTED_SHARDS !== undefined) {
      const expected = Number(process.env.FB_CI_REPORT_EXPECTED_SHARDS);
      const received = Number(process.env.FB_CI_REPORT_RECEIVED_SHARDS);
      const source = process.env.FB_CI_REPORT_SOURCE_RUN || '';
      if (!Number.isSafeInteger(expected) || expected < 1 || !Number.isSafeInteger(received) || received < 1 || !/^\d+$/.test(source))
        throw new Error('Invalid CI shard coverage metadata.');
      report.coverage = { expectedShards:expected, receivedShards:received,
        complete:expected === received, sourceRun:source, unfinished:unfinished.sort(),
        overBudget:overBudget(mergeFolder(process.argv)) };
    }
    const target = path.resolve(process.env.FB_CI_REPORT_FILE || 'ci-report.json');
    fs.mkdirSync(path.dirname(target), { recursive:true });
    fs.writeFileSync(target, JSON.stringify(report) + '\n');
  }

  printsToStdio() {
    return false;
  }
}

module.exports = CompactJsonReporter;
