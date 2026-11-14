'use strict';

/* Markdown summary of a merged Playwright JSON report for the GitHub Actions
   job summary: totals, failures with their first error line, and the slowest
   spec files. Usage: node support/ci-summary.js <results.json> [ref] [mode] */

const fs = require('fs');

const file = process.argv[2];
const ref = process.argv[3] || '';
const mode = process.argv[4] || '';
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const failures = [];
const flaky = [];
const fileTimes = Object.create(null);

function firstLine(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean)[0] || '';
}

function cell(text) {
  return String(text).slice(0, 240).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\/g, '&#92;').replace(/\|/g, '&#124;')
    .replace(/[\r\n]+/g, ' ');
}

function walk(suite, titles) {
  const path = suite.title ? titles.concat(suite.title) : titles;
  (suite.specs || []).forEach(function (spec) {
    (spec.tests || []).forEach(function (test) {
      const results = test.results || [];
      const duration = results.reduce(function (sum, r) { return sum + (r.duration || 0); }, 0);
      fileTimes[spec.file] = (fileTimes[spec.file] || 0) + duration;
      const row = { file:spec.file, line:spec.line, title:path.slice(1).concat(spec.title).join(' > '),
        project:test.projectName };
      if (test.status === 'unexpected') {
        const failed = results.filter(function (r) { return r.status !== 'passed' && r.status !== 'skipped'; }).pop();
        row.error = failed && (failed.error ? firstLine(failed.error.message) :
          failed.status === 'timedOut' ? 'Timed out' : failed.status);
        failures.push(row);
      } else if (test.status === 'flaky') {
        flaky.push(row);
      }
    });
  });
  (suite.suites || []).forEach(function (child) { walk(child, path); });
}

(report.suites || []).forEach(function (suite) { walk(suite, []); });

const stats = report.stats || {};
const incomplete = report.coverage && report.coverage.complete === false;
const failed = failures.length || stats.unexpected || (report.errors || []).length;
const lines = [];
lines.push('## Playwright: ' + (incomplete ? 'incomplete' : failed ? 'failed' : 'passed') +
  (ref ? ' (' + ref + (mode ? ', ' + mode : '') + ')' : ''));
lines.push('');
if (incomplete) lines.push('Incomplete coverage: received ' + report.coverage.receivedShards + ' of ' +
  report.coverage.expectedShards + ' shard reports. These totals describe available results only.', '');
lines.push('Passed ' + (stats.expected || 0) + ', failed ' + (stats.unexpected || 0) +
  ', flaky ' + (stats.flaky || 0) + ', skipped ' + (stats.skipped || 0) + ' in ' +
  Math.round((stats.duration || 0) / 60000) + ' min of wall time.');
if (failures.length) {
  lines.push('');
  lines.push('### Failures');
  lines.push('');
  lines.push('| project | test | error |');
  lines.push('| --- | --- | --- |');
  failures.slice(0, 60).forEach(function (row) {
    lines.push('| ' + cell(row.project) + ' | ' + cell(row.file + ':' + row.line + ' ' + row.title) +
      ' | ' + cell(row.error || '') + ' |');
  });
  if (failures.length > 60) lines.push('', (failures.length - 60) + ' more failures are in the compact JSON report artifact.');
}
if (flaky.length) {
  lines.push('');
  lines.push('Flaky: ' + flaky.slice(0, 20).map(function (row) {
    return row.file + ':' + row.line;
  }).join(', ') + '.');
}
const slow = Object.keys(fileTimes).map(function (name) { return { file:name, ms:fileTimes[name] }; })
  .sort(function (a, b) { return b.ms - a.ms; }).slice(0, 15);
if (slow.length) {
  lines.push('');
  lines.push('### Slowest spec files');
  lines.push('');
  lines.push('| spec | minutes |');
  lines.push('| --- | ---: |');
  slow.forEach(function (row) { lines.push('| ' + cell(row.file) + ' | ' + (row.ms / 60000).toFixed(1) + ' |'); });
}
process.stdout.write(lines.join('\n') + '\n');
