'use strict';

const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

test('CI summary cells retain literal pipes, backslashes and HTML without adding rows',
  function (t) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-summary-'));
    t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
    const file = path.join(directory, 'results.json');
    fs.writeFileSync(file, JSON.stringify({
      stats:{ unexpected:1 },
      suites:[{ specs:[{
        file:'folder\\|<spec>.js', line:1, title:'A\nB|C',
        tests:[{
          projectName:'browser\\|name\nnext', status:'unexpected',
          results:[{ status:'failed', duration:1000, error:{ message:'bad\\|&<tag>' } }]
        }]
      }] }]
    }));
    const summary = execFileSync(process.execPath,
      [path.join(__dirname, 'ci-summary.js'), file], { encoding:'utf8' });
    // Failed cases are grouped by cause: cause, cases, specs and the first case's project and test.
    const row = summary.split('\n').find(function (line) {
      return line.indexOf('| bad') === 0;
    });
    assert.equal(row,
      '| bad&#92;&#124;&amp;&lt;tag&gt; | 1 | 1 |' +
      ' [browser&#92;&#124;name next] folder&#92;&#124;&lt;spec&gt;.js:1 A B&#124;C |');
    assert.equal((row.match(/\|/g) || []).length, 5);
    assert.ok(summary.includes('| folder&#92;&#124;&lt;spec&gt;.js | 0.0 |'));
  });

test('CI coverage rejects a duplicate project case or a listed case with no result', function (t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-coverage-'));
  t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
  const selection = path.join(directory, 'selection.json'), report = path.join(directory, 'results.json');
  fs.writeFileSync(selection, JSON.stringify(['chromium-A','firefox-A']));
  for (const second of [{id:'chromium-A', results:[{status:'passed'}]}, {id:'firefox-A', results:[]}]) {
    const tests = [{id:'chromium-A', results:[{status:'passed'}]}, second];
    fs.writeFileSync(report, JSON.stringify({coverage:{complete:true}, suites:[{specs:[{tests:tests}], suites:[]}]}));
    assert.throws(function () {
      execFileSync(process.execPath, [path.join(__dirname,'ci-discovery.js'), 'verify', selection, report],
        {stdio:'pipe'});
    }, /Merged test\/project identities differ/);
    assert.equal(JSON.parse(fs.readFileSync(report,'utf8')).coverage.complete, false);
  }
});

function summarize(t, report) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-summary-'));
  t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
  const file = path.join(directory, 'results.json');
  fs.writeFileSync(file, JSON.stringify(report));
  return execFileSync(process.execPath, [path.join(__dirname, 'ci-summary.js'), file], { encoding:'utf8' });
}

function specFile(file, specs) {
  return { title:file, file:file, specs:specs.map(function (spec) {
    return { title:spec[1], file:file, line:spec[0], tests:[spec[2]] };
  }), suites:[] };
}

function diff(key, indent) {
  return 'Error: \u001b[2mexpect(\u001b[22m\u001b[31mreceived\u001b[39m\u001b[2m).toEqual(\u001b[22mexpected\u001b[2m)' +
    ' // deep equality\u001b[22m\n\n- Expected  -  1\n+ Received  +  1\n\n  Object {\n-' + indent + '"' + key +
    '": "a",\n+' + indent + '"' + key + '": "b",\n  }';
}

test('CI summary separates failed, timed out, flaky, over budget and unfinished cases and counts declared skips',
  function (t) {
    const served = 'chromium-served';
    const summary = summarize(t, {
      stats:{ expected:1, unexpected:4, flaky:1, skipped:5, unfinished:2, duration:120000 },
      coverage:{ complete:true, unfinished:['cut', 'never'], overBudget:[{ job:2, batch:'batch-7',
        name:'[chromium-served] > d.spec.js > long world', ids:['x', 'y', 'z'], unfinished:['z'] }] },
      suites:[
        specFile('a.spec.js', [[3, 'released fixture', { projectName:served, status:'unexpected',
          results:[{ status:'failed', duration:1000, error:{ message:diff('bookmark/867', '   ') } }] }]]),
        specFile('b.spec.js', [
          [5, 'released fixture', { projectName:served, status:'unexpected',
            results:[{ status:'failed', duration:1000, error:{ message:diff('bookmark/867', '     ') } }] }],
          [9, 'other', { projectName:'chromium-file', status:'unexpected',
            results:[{ status:'failed', duration:1000, error:{ message:diff('faith/x', '   ') } }] }]]),
        specFile('c.spec.js', [
          [2, 'slow', { projectName:served, status:'unexpected', results:[{ status:'timedOut', duration:60000,
            error:{ message:'Test timeout of 60000ms exceeded.' } }] }],
          [7, 'flaky', { projectName:served, status:'flaky', results:[
            { status:'failed', duration:1000, error:{ message:'Error: first try\nat line 7' } },
            { status:'passed', duration:1000, retry:1 }] }],
          [8, 'passes', { projectName:served, status:'expected', results:[{ status:'passed', duration:1000 }] }]]),
        specFile('d.spec.js', [
          [1, 'cut off', { projectName:served, status:'skipped', unfinished:true,
            results:[{ status:'interrupted', duration:12400 }] }],
          // A report written before the unfinished marker is still read from its results.
          [4, 'never started', { projectName:served, status:'skipped', results:[] }]]),
        specFile('e.spec.js', [
          [1, 'declared', { projectName:served, status:'skipped', skipReason:'Chromium only',
            results:[{ status:'skipped', duration:0 }] }],
          [2, 'declared too', { projectName:served, status:'skipped', skipReason:'Chromium only',
            results:[{ status:'skipped', duration:0 }] }],
          [3, 'after a serial failure', { projectName:served, status:'skipped', results:[{ status:'skipped', duration:0 }] }]])
      ]
    });
    const lines = summary.split('\n');
    assert.equal(lines[0], '## Playwright: failed');
    assert.ok(summary.includes('Passed 1, failed 4, flaky 1, skipped 5 in 2 min of wall time.'));
    assert.ok(summary.includes('2 of the skipped cases are unfinished: they have no passed, failed, timed out or skipped result.'));
    const sections = ['### Failed (3 cases from 2 causes)', '### Timed out (1)', '### Flaky (1)', '### Over budget (1)',
      '### Unfinished (2)', '### Skipped by declared reason', '### Slowest spec files'];
    const at = sections.map(function (heading) { return lines.indexOf(heading); });
    assert.ok(at.every(function (index, i) { return index > (i ? at[i - 1] : 0); }), 'Sections appear once, in order: ' + at);
    // One cause across two spec files is one entry, even when its diff line is nested deeper.
    const matcher = 'Error: expect(received).toEqual(expected) // deep equality :: - ';
    assert.deepEqual(lines.slice(at[0] + 4, at[0] + 6), [
      '| ' + matcher + '"bookmark/867": "a", | 2 | 2 | [chromium-served] a.spec.js:3 released fixture |',
      '| ' + matcher + '"faith/x": "a", | 1 | 1 | [chromium-file] b.spec.js:9 other |']);
    assert.equal(lines[at[0] + 6], '');
    assert.equal(lines[at[1] + 4], '| chromium-served | c.spec.js:2 slow | Test timeout of 60000ms exceeded. |');
    assert.equal(lines[at[2] + 4], '| chromium-served | c.spec.js:7 flaky | Error: first try |');
    assert.equal(lines[at[3] + 4], '| [chromium-served] &gt; d.spec.js &gt; long world | batch-7 | 3 | 1 |');
    assert.deepEqual(lines.slice(at[4] + 4, at[4] + 6), [
      '| chromium-served | d.spec.js:1 cut off | interrupted after 12 s |',
      '| chromium-served | d.spec.js:4 never started | did not start |']);
    // Unfinished cases stay out of the declared skip counts.
    assert.deepEqual(lines.slice(at[5] + 4, at[5] + 7), ['| Chromium only | 2 |', '| (no declared reason) | 1 |', '']);
    assert.equal(summary.split('released fixture').length, 2, 'A grouped failure is not listed again per case');
  });

test('CI summary headings report unfinished and flaky runs that have no failure', function (t) {
  const served = 'chromium-served';
  const cut = summarize(t, { stats:{ expected:1, skipped:1, unfinished:1 }, coverage:{ complete:true, overBudget:[] },
    suites:[specFile('a.spec.js', [[1, 'cut off', { projectName:served, status:'skipped', unfinished:true,
      results:[{ status:'interrupted', duration:5000 }] }]])] });
  assert.equal(cut.split('\n')[0], '## Playwright: unfinished');
  const budget = summarize(t, { stats:{ expected:1 }, coverage:{ complete:true, overBudget:[{ batch:'batch-1',
    name:'group', ids:['a'], unfinished:[] }] }, suites:[] });
  assert.equal(budget.split('\n')[0], '## Playwright: unfinished');
  const flaky = summarize(t, { stats:{ flaky:1 }, suites:[specFile('a.spec.js', [[1, 'flaky', { projectName:served,
    status:'flaky', results:[{ status:'timedOut', duration:60000 }, { status:'passed', duration:1000, retry:1 }] }]])] });
  assert.equal(flaky.split('\n')[0], '## Playwright: flaky');
  assert.ok(flaky.includes('| chromium-served | a.spec.js:1 flaky | Timed out |'));
});

function verifyRun(t, selection, report) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fallowborn-coverage-'));
  t.after(function () { fs.rmSync(directory, { recursive:true, force:true }); });
  const selectionFile = path.join(directory, 'selection.json'), reportFile = path.join(directory, 'results.json');
  fs.writeFileSync(selectionFile, JSON.stringify(selection));
  fs.writeFileSync(reportFile, JSON.stringify(report));
  let failure = null, output;
  try {
    output = execFileSync(process.execPath, [path.join(__dirname, 'ci-discovery.js'), 'verify', selectionFile, reportFile],
      { stdio:'pipe', encoding:'utf8' });
  } catch (error) {
    failure = error;
    output = error.stdout;
  }
  return { failure:failure, output:output, report:JSON.parse(fs.readFileSync(reportFile, 'utf8')) };
}

test('CI coverage fails on an interrupted-only case and names at most fifty unfinished cases', function (t) {
  const served = 'chromium-served';
  // Before the unfinished check, a case with any result, even only interrupted, counted as covered.
  const cut = verifyRun(t, ['chromium-A', 'chromium-B'], { coverage:{ complete:true }, suites:[specFile('a.spec.js', [
    [2, 'passes', { id:'chromium-A', projectName:served, status:'expected', results:[{ status:'passed' }] }],
    [4, 'cut off', { id:'chromium-B', projectName:served, status:'skipped', unfinished:true,
      results:[{ status:'interrupted' }] }]])] });
  assert.ok(cut.failure && cut.failure.status === 1, 'An unfinished case fails verification');
  assert.deepEqual(cut.output.split('\n').slice(0, 2), [
    '::error::1 discovered case is unfinished: no passed, failed, timed out or skipped result.',
    '  [chromium-served] a.spec.js:4 cut off (chromium-B)']);
  assert.ok(!cut.output.includes('Verified'));
  assert.equal(cut.report.coverage.complete, true, 'Shard completeness keeps its meaning');

  const ids = [];
  const specs = [];
  for (let i = 0; i < 60; i++) {
    const id = 'case-' + String(i).padStart(2, '0');
    ids.push(id);
    specs.push([i + 1, 'cut ' + i, { id:id, projectName:served, status:'skipped', results:[{ status:'interrupted' }] }]);
  }
  const many = verifyRun(t, ids, { coverage:{ complete:true }, suites:[specFile('b.spec.js', specs)] });
  assert.ok(many.failure);
  const named = many.output.split('\n').filter(function (line) { return line.indexOf('  [chromium-served]') === 0; });
  assert.equal(named.length, 50);
  assert.equal(named[49], '  [chromium-served] b.spec.js:50 cut 49 (case-49)');
  assert.ok(many.output.includes('::error::60 discovered cases are unfinished'));
  assert.ok(many.output.includes('\n  and 10 more.\n'));

  // Passed, failed, timed out, flaky and skipped cases, declared or not, are all finished.
  const statuses = [['passed'], ['failed'], ['timedOut'], ['failed', 'passed'], ['skipped'], ['skipped'], ['interrupted', 'passed']];
  const done = verifyRun(t, statuses.map(function (_, i) { return 'done-' + i; }), { coverage:{ complete:true },
    suites:[specFile('c.spec.js', statuses.map(function (list, i) {
      return [i + 1, 'case ' + i, { id:'done-' + i, projectName:served, status:'expected',
        results:list.map(function (status) { return { status:status }; }) }];
    }))] });
  assert.equal(done.failure, null, done.output);
  assert.ok(done.output.includes('Verified 7 test/project identities against discovery.'));
});
