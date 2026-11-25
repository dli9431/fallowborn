'use strict';

/* Markdown summary of a merged Playwright JSON report for the GitHub Actions
   job summary: totals; separate failed, timed out, flaky, over budget and
   unfinished sections, with failed cases grouped by cause across spec files;
   skip counts by declared reason; and the slowest spec files.
   Usage: node support/ci-summary.js <results.json> [ref] [mode] */

const fs = require('fs');

const file = process.argv[2];
const ref = process.argv[3] || '';
const mode = process.argv[4] || '';
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
// A finished result is passed, failed or timedOut and a skipped result is settled.
const SETTLED = ['passed', 'failed', 'timedOut', 'skipped'];
const NO_REASON = '(no declared reason)';
const failures = [];
const timeouts = [];
const flaky = [];
const unfinished = [];
const skips = Object.create(null);
const fileTimes = Object.create(null);

function textLines(text) {
  return String(text || '').replace(/\u001b\[[0-9;]*m/g, '').split('\n')
    .map(function (line) { return line.trim(); })
    .filter(Boolean);
}

function firstLine(text) {
  return textLines(text)[0] || '';
}

function errorLine(result) {
  if (!result) return '';
  return result.error ? firstLine(result.error.message) : result.status === 'timedOut' ? 'Timed out' : result.status;
}

/* A failure's cause is its first error line. A bare expect matcher header such
   as expect(received).toEqual(expected) is shared by unrelated failures, so it
   also takes the first changed diff line or Expected line that follows, with
   its spacing collapsed so nesting depth does not split one cause. */
function cause(result) {
  const head = errorLine(result);
  if (!result || !result.error || !/^(Error: )?expect\(/.test(head)) return head;
  const detail = textLines(result.error.message).slice(1).find(function (line) {
    return /^Expected\b/.test(line) || (/^[-+]\s/.test(line) && !/^[-+] (Expected|Received)\s+[-+]\s*\d+$/.test(line));
  });
  return detail ? head + ' :: ' + detail.replace(/\s+/g, ' ') : head;
}

function cell(text) {
  return String(text).slice(0, 240).replace(/&/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\\/g, '&#92;').replace(/\|/g, '&#124;')
    .replace(/[\r\n]+/g, ' ');
}

function caseName(row) {
  return '[' + row.project + '] ' + row.file + ':' + row.line + ' ' + row.title;
}

function walk(suite, titles) {
  const path = suite.title ? titles.concat(suite.title) : titles;
  (suite.specs || []).forEach(function (spec) {
    (spec.tests || []).forEach(function (test) {
      const results = test.results || [];
      const duration = results.reduce(function (sum, r) { return sum + (r.duration || 0); }, 0);
      fileTimes[spec.file] = (fileTimes[spec.file] || 0) + duration;
      const row = { file:spec.file, line:spec.line, title:path.slice(1).concat(spec.title).join(' > '),
        project:test.projectName, duration:duration };
      const finished = results.filter(function (r) { return r.status === 'failed' || r.status === 'timedOut'; });
      if (test.unfinished || !results.some(function (r) { return SETTLED.indexOf(r.status) >= 0; })) {
        row.state = results.length ? 'interrupted after ' + Math.round(duration / 1000) + ' s' : 'did not start';
        unfinished.push(row);
      } else if (test.status === 'unexpected') {
        const failed = finished.length ? finished[finished.length - 1] :
          results.filter(function (r) { return r.status !== 'skipped'; }).pop();
        row.error = errorLine(failed);
        row.cause = cause(failed);
        (failed && failed.status === 'timedOut' ? timeouts : failures).push(row);
      } else if (test.status === 'flaky') {
        row.error = errorLine(finished[0]);
        flaky.push(row);
      } else if (test.status === 'skipped') {
        const reason = test.skipReason || NO_REASON;
        skips[reason] = (skips[reason] || 0) + 1;
      }
    });
  });
  (suite.suites || []).forEach(function (child) { walk(child, path); });
}

(report.suites || []).forEach(function (suite) { walk(suite, []); });

function caseTable(title, rows, heading, value) {
  if (!rows.length) return;
  lines.push('', '### ' + title + ' (' + rows.length + ')', '');
  lines.push('| project | test | ' + heading + ' |');
  lines.push('| --- | --- | --- |');
  rows.slice(0, 60).forEach(function (row) {
    lines.push('| ' + cell(row.project) + ' | ' + cell(row.file + ':' + row.line + ' ' + row.title) +
      ' | ' + cell(value(row)) + ' |');
  });
  if (rows.length > 60) lines.push('', (rows.length - 60) + ' more are in the compact JSON report artifact.');
}

const stats = report.stats || {};
const coverage = report.coverage || {};
const overBudget = coverage.overBudget || [];
const incomplete = coverage.complete === false;
const failed = failures.length || timeouts.length || stats.unexpected || (report.errors || []).length;
const open = unfinished.length || overBudget.length;
const lines = [];
lines.push('## Playwright: ' + (incomplete ? 'incomplete' : failed ? 'failed' : open ? 'unfinished' :
  flaky.length || stats.flaky ? 'flaky' : 'passed') + (ref ? ' (' + ref + (mode ? ', ' + mode : '') + ')' : ''));
lines.push('');
if (incomplete) lines.push('Incomplete coverage: received ' + coverage.receivedShards + ' of ' +
  coverage.expectedShards + ' shard reports. These totals describe available results only.', '');
lines.push('Passed ' + (stats.expected || 0) + ', failed ' + (stats.unexpected || 0) +
  ', flaky ' + (stats.flaky || 0) + ', skipped ' + (stats.skipped || 0) + ' in ' +
  Math.round((stats.duration || 0) / 60000) + ' min of wall time.');
if (unfinished.length) lines.push('', unfinished.length + ' of the skipped cases are unfinished: they have no passed, ' +
  'failed, timed out or skipped result.');

if (failures.length) {
  const groups = new Map();
  failures.forEach(function (row) {
    if (!groups.has(row.cause)) groups.set(row.cause, { cause:row.cause, rows:[], files:new Set() });
    groups.get(row.cause).rows.push(row);
    groups.get(row.cause).files.add(row.file);
  });
  const causes = Array.from(groups.values()).sort(function (a, b) {
    return b.rows.length - a.rows.length || b.files.size - a.files.size || (a.cause < b.cause ? -1 : a.cause > b.cause ? 1 : 0);
  });
  lines.push('', '### Failed (' + failures.length + ' cases from ' + causes.length + ' causes)', '');
  lines.push('| cause | cases | specs | first case |');
  lines.push('| --- | ---: | ---: | --- |');
  causes.slice(0, 40).forEach(function (group) {
    lines.push('| ' + cell(group.cause) + ' | ' + group.rows.length + ' | ' + group.files.size + ' | ' +
      cell(caseName(group.rows[0])) + ' |');
  });
  if (causes.length > 40) lines.push('', (causes.length - 40) + ' more causes are in the compact JSON report artifact.');
}
caseTable('Timed out', timeouts, 'error', function (row) { return row.error; });
caseTable('Flaky', flaky, 'first failure', function (row) { return row.error; });
if (overBudget.length) {
  lines.push('', '### Over budget (' + overBudget.length + ')', '');
  lines.push('| scope group | batch | cases | unfinished |');
  lines.push('| --- | --- | ---: | ---: |');
  overBudget.slice(0, 60).forEach(function (group) {
    lines.push('| ' + cell(group.name || '') + ' | ' + cell(group.batch || '') + ' | ' + (group.ids || []).length +
      ' | ' + (group.unfinished || []).length + ' |');
  });
  if (overBudget.length > 60) lines.push('', (overBudget.length - 60) + ' more are in the compact JSON report artifact.');
}
caseTable('Unfinished', unfinished, 'result', function (row) { return row.state; });
const reasons = Object.keys(skips).sort(function (a, b) {
  return (a === NO_REASON) - (b === NO_REASON) || skips[b] - skips[a] || (a < b ? -1 : a > b ? 1 : 0);
});
if (reasons.length) {
  lines.push('', '### Skipped by declared reason', '');
  lines.push('| reason | cases |');
  lines.push('| --- | ---: |');
  reasons.slice(0, 30).forEach(function (reason) { lines.push('| ' + cell(reason) + ' | ' + skips[reason] + ' |'); });
  if (reasons.length > 30) lines.push('', (reasons.length - 30) + ' more reasons are in the compact JSON report artifact.');
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
