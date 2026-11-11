'use strict';

/* Compact JSON reporter for CI report merges. The built-in JSON reporter
   embeds every attachment and all output, which overflows a Node string for
   the full merged suite. This writes the same shape (stats, file suites with
   nested describe suites, specs, per-project tests and results) that
   support/ci-summary.js and the task runner read, without output or
   attachments, and with error messages truncated. The file goes to
   FB_CI_REPORT_FILE (default ci-report.json). */

const fs = require('fs');
const path = require('path');

const MESSAGE_LIMIT = 4000;

function trimMessage(error) {
  if (!error) return undefined;
  const message = String(error.message || error.value || '');
  return { message:message.length > MESSAGE_LIMIT ? message.slice(0, MESSAGE_LIMIT) + '\n[truncated]' : message };
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
      spec.tests.push({
        projectName:project ? project.name : '',
        status:outcome,
        results:test.results.map(function (r) {
          return { status:r.status, duration:r.duration, retry:r.retry, error:trimMessage(r.error) };
        })
      });
    }
    const report = { stats:stats, errors:this.errors, suites:Array.from(files.values()) };
    const target = path.resolve(process.env.FB_CI_REPORT_FILE || 'ci-report.json');
    fs.mkdirSync(path.dirname(target), { recursive:true });
    fs.writeFileSync(target, JSON.stringify(report) + '\n');
  }

  printsToStdio() {
    return false;
  }
}

module.exports = CompactJsonReporter;
