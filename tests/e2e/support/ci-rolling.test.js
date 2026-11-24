'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {Readable} = require('node:stream');
const {spawnSync} = require('node:child_process');
const {makePlan, learn, runJob, readBlob, readZip, writeZip, zipEntry} = require('./ci-rolling');

function cases(n) {
  return Array.from({length:n}, (_,i) => ({id:'case-' + i, file:'specs/sample.spec.js', project:'chromium-served'}));
}

test('large cold selections fit Actions matrices and keep each independent shard under budget', () => {
  const rows = cases(5848);
  const plan = makePlan(rows, {});
  assert.ok(plan.jobs.length <= 256 && plan.batches.length > 256);
  assert.ok(plan.batches.every(b => b.ms <= 375000));
  assert.deepEqual(plan.jobs.flat().sort((a,b) => a-b), plan.batches.map((_,i) => i));
  const expected = rows.map(t => t.id).sort();
  assert.deepEqual(plan.jobs.flatMap(j => j.flatMap(i => plan.batches[i].groups.flat())).sort(),expected);
});

test('shared scopes stay together and sparse files have separate shards', () => {
  const rows = cases(20);
  rows.slice(0,10).forEach(t => {t.scope = 'shared setup';});
  rows[19].file = 'specs/other.spec.js';
  const plan = makePlan(rows, {});
  assert.ok(plan.batches.some(b => b.groups.some(g => g.length === 10)));
  assert.ok(plan.batches.some(b => b.groups.flat().join() === 'case-19'));
  assert.deepEqual(makePlan([],{}).jobs, []);
  assert.throws(() => makePlan([...rows,rows[0]],{}));
});

test('only passing measurements update the next plan', () => {
  const rows = cases(20);
  const report = {suites:[{specs:[{tests:rows.map(t => ({id:t.id, results:[{status:'passed', duration:4000}]}))}],
    suites:[{specs:[{tests:[{id:'old',results:[{status:'interrupted',duration:5}]}]}],suites:[]}]}]};
  const timings = learn(report, {old:45000});
  assert.equal(timings.old,45000);
  assert.equal(makePlan(rows,timings).batches.length,1);
});

/* Attempt simulator. Each attempt runs its cases in order on one worker. A case that would
   pass the 600 second cap is interrupted and the rest never start, as with the timeout
   interrupt. Each finished run takes the next listed outcome (default passed). Every result
   that is not passed writes an error context into the attempt's test-results folder and
   attaches the same bytes to its blob, like Playwright. Blobs follow the 1.61 event shapes. */
function simulate(root, spec) {
  const calls = [];
  const runs = new Map();
  const lines = new Map();
  const scopes = spec.scopes || {};
  const sim = {calls, elapsed:0, root};
  sim.exec = (ids, name) => {
    calls.push({name, ids:[...ids]});
    const output = path.join(root, 'test-results', name);
    const results = [];
    let clock = 0;
    for (const id of ids) {
      const ms = spec.ms && spec.ms[id] || 1000;
      if (clock + ms > 600000) {
        results.push({id, status:'interrupted', duration:600000 - clock});
        clock = 600000;
        break;
      }
      clock += ms;
      const count = runs.get(id) || 0;
      runs.set(id, count + 1);
      const outcomes = spec.outcomes && spec.outcomes[id] || ['passed'];
      results.push({id, status:outcomes[Math.min(count, outcomes.length - 1)], duration:ms});
    }
    sim.elapsed += clock;
    const tree = [];
    for (const id of ids) {
      if (!lines.has(id)) lines.set(id, lines.size + 1);
      const entry = {testId:id, title:id, location:{file:'specs/sample.spec.js', line:lines.get(id), column:3},
        retries:0, tags:[], repeatEachIndex:0, annotations:[]};
      if (!scopes[id]) {
        tree.push(entry);
        continue;
      }
      let suite = tree.find(e => e.title === scopes[id] && !('testId' in e));
      if (!suite) {
        suite = {title:scopes[id], location:{file:'specs/sample.spec.js', line:1, column:1}, entries:[]};
        tree.push(suite);
      }
      suite.entries.push(entry);
    }
    const events = [
      {method:'onBlobReportMetadata', params:{version:2, userAgent:'unit', pathSeparator:path.sep}},
      {method:'onConfigure', params:{config:{globalTimeout:0, maxFailures:0, metadata:{}, rootDir:path.join(root, 'game'),
        version:'1.61.1', workers:1, globalSetup:null, globalTeardown:null, tags:[]}}},
      {method:'onProject', params:{project:{metadata:{}, name:'chromium-served', outputDir:'test-results', repeatEach:1,
        retries:0, testDir:'specs', testIgnore:[], testMatch:[{s:'**/*.spec.js'}], timeout:60000,
        suites:[{title:'sample.spec.js', location:{file:'specs/sample.spec.js', line:0, column:0}, entries:tree}],
        grep:[{r:{source:'.*', flags:''}}], grepInvert:[], dependencies:[], snapshotDir:'specs', use:{}}}},
      {method:'onBegin'}
    ];
    const resources = [];
    let time = 1000;
    for (const result of results) {
      const id = name + ':' + result.id;
      events.push({method:'onTestBegin', params:{testId:result.id,
        result:{id, retry:0, workerIndex:0, parallelIndex:0, startTime:time}}});
      events.push({method:'onStepBegin', params:{testId:result.id, resultId:id,
        step:{id:id + ':step', title:'open game', category:'test.step', startTime:time}}});
      events.push({method:'onStepEnd', params:{testId:result.id, resultId:id, step:{id:id + ':step', duration:1}}});
      if (result.status !== 'passed') {
        const content = Buffer.from('error context ' + id);
        const resource = 'resources/' + name + '-' + result.id + '.md';
        fs.mkdirSync(path.join(output, result.id), {recursive:true});
        fs.writeFileSync(path.join(output, result.id, 'error-context.md'), content);
        resources.push(zipEntry(resource, content));
        events.push({method:'onAttach', params:{testId:result.id, resultId:id,
          attachments:[{name:'error-context', contentType:'text/markdown', path:resource}]}});
      }
      events.push({method:'onTestEnd', params:{test:{testId:result.id, expectedStatus:'passed', timeout:60000, annotations:[]},
        result:{id, duration:result.duration, status:result.status,
          errors:result.status === 'passed' ? [] : [{message:result.status + ' in ' + name}]}}});
      time += result.duration;
    }
    const capped = results.some(r => r.status === 'interrupted');
    const failed = results.some(r => r.status !== 'passed');
    // A listed attempt also reports an error outside any test, as a worker teardown would.
    if ((spec.errors || []).includes(name))
      events.push({method:'onError', params:{error:{message:'worker teardown failed in ' + name}}});
    events.push({method:'onEnd', params:{result:{status:capped ? 'interrupted' : failed ? 'failed' : 'passed',
      startTime:1000, duration:time - 1000}}});
    const blob = path.join(root, 'attempts', name + '.zip');
    const jsonl = Buffer.from(events.map(event => JSON.stringify(event) + '\n').join(''));
    writeZip(blob, [zipEntry('report.jsonl', jsonl), ...resources]);
    const exit = spec.exits && spec.exits[name];
    return {status:exit !== undefined ? exit : capped ? 124 : failed ? 1 : 0, capped, blob, output};
  };
  return sim;
}

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-rolling-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  return root;
}

function job(sim, batches, options = {}) {
  const logs = [];
  const summary = runJob(batches, sim.exec, {out:path.join(sim.root, 'blob-report'), job:1,
    log:line => logs.push(line), ...options});
  return {summary, logs};
}

// Results kept in a batch blob, in order, as status lists and retry numbers per case.
function kept(sim, batch) {
  const blob = readBlob(path.join(sim.root, 'blob-report', batch + '.zip'));
  const statuses = {};
  const retries = {};
  for (const {method, params} of blob.events) {
    if (method === 'onTestBegin') (retries[params.testId] = retries[params.testId] || []).push(params.result.retry);
    if (method === 'onTestEnd') (statuses[params.test.testId] = statuses[params.test.testId] || []).push(params.result.status);
  }
  const steps = blob.events.filter(e => e.method === 'onStepBegin').map(e => e.params.resultId);
  const begun = blob.events.filter(e => e.method === 'onTestBegin').map(e => e.params.result.id);
  assert.deepEqual(steps, begun, 'Every kept result keeps its own steps and no dropped step remains');
  return {statuses, retries, blob};
}

const context = (sim, attempt, id) => fs.existsSync(path.join(sim.root, 'test-results', attempt, id, 'error-context.md'));

test('a capped batch with a failure keeps finished results and reruns only its unfinished cases', t => {
  const sim = simulate(workspace(t), {ms:{a:250000, b:250000, c:250000, d:250000}, outcomes:{b:['failed', 'passed']}});
  const {summary} = job(sim, [{name:'batch-1', groups:[['a'], ['b'], ['c'], ['d']]}]);
  // The old runner kept this capped report whole because it held a failure.
  assert.deepEqual(sim.calls.map(c => [c.name, c.ids]),
    [['batch-1', ['a', 'b', 'c', 'd']], ['batch-1-a', ['c']], ['batch-1-b', ['d']], ['rerun', ['b']]]);
  const {statuses, retries, blob} = kept(sim, 'batch-1');
  assert.deepEqual(statuses, {a:['passed'], b:['failed', 'passed'], c:['passed'], d:['passed']});
  assert.deepEqual(retries.b, [0, 1]);
  assert.ok(blob.entries.has('resources/batch-1-b.md'));
  assert.ok(!blob.entries.has('resources/batch-1-c.md'), 'The superseded interrupted attachment is dropped');
  assert.ok(context(sim, 'batch-1', 'b'), 'The kept failure keeps its context');
  assert.ok(!context(sim, 'batch-1', 'c'), 'The superseded interrupted context is removed');
  assert.equal(summary.passed, false, 'A failure that passes on rerun still fails the job');
  assert.deepEqual([summary.rerun, summary.rerunUnfinished, summary.unfinished, summary.overBudget], [['b'], [], [], []]);
});

test('a capped single scope group reruns alone without repeating finished groups', t => {
  const sim = simulate(workspace(t), {ms:{solo:500000, s1:150000, s2:150000}, scopes:{s1:'shared world', s2:'shared world'}});
  const {summary} = job(sim, [{name:'batch-1', groups:[['solo'], ['s1', 's2']]}]);
  assert.deepEqual(sim.calls.map(c => [c.name, c.ids]), [['batch-1', ['solo', 's1', 's2']], ['batch-1-a', ['s1', 's2']]]);
  const {statuses, blob} = kept(sim, 'batch-1');
  assert.deepEqual(statuses, {solo:['passed'], s1:['passed'], s2:['passed']});
  const project = blob.events.find(e => e.method === 'onProject').params.project;
  const scope = project.suites[0].entries.find(e => e.title === 'shared world');
  assert.deepEqual(scope.entries.map(e => e.testId), ['s1', 's2']);
  assert.equal(project.suites[0].entries.filter(e => e.testId === 'solo').length, 1);
  assert.ok(!context(sim, 'batch-1', 's1'));
  assert.equal(summary.passed, true);
  assert.deepEqual(summary.attempts.map(a => [a.name, a.capped, a.unfinished]), [['batch-1', true, 2], ['batch-1-a', false, 0]]);
});

test('capped parts split again until every case has a finished result', t => {
  const ids = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
  const sim = simulate(workspace(t), {ms:Object.fromEntries(ids.map(id => [id, 250000]))});
  const {summary} = job(sim, [{name:'batch-1', groups:ids.map(id => [id])}]);
  assert.deepEqual(sim.calls.map(c => [c.name, c.ids]), [['batch-1', ids], ['batch-1-a', ['c3', 'c4', 'c5']],
    ['batch-1-a-a', ['c5']], ['batch-1-b', ['c6', 'c7', 'c8']], ['batch-1-b-a', ['c8']]]);
  assert.deepEqual(kept(sim, 'batch-1').statuses, Object.fromEntries(ids.map(id => [id, ['passed']])));
  for (const [attempt, id] of [['batch-1', 'c3'], ['batch-1-a', 'c5'], ['batch-1-b', 'c8']])
    assert.ok(!context(sim, attempt, id), 'Superseded context ' + attempt + ' ' + id);
  assert.equal(summary.passed, true);
  assert.deepEqual(summary.unfinished, []);
});

test('a scope group that cannot finish alone is over budget by name and fails the job', t => {
  const group = ['y1', 'y2', 'y3', 'y4'];
  const sim = simulate(workspace(t), {ms:{z:100000, y1:290000, y2:290000, y3:290000, y4:290000},
    scopes:Object.fromEntries(group.map(id => [id, 'long world']))});
  const {summary, logs} = job(sim, [{name:'batch-1', groups:[['z'], group]}]);
  assert.deepEqual(sim.calls.map(c => [c.name, c.ids]), [['batch-1', ['z', ...group]], ['batch-1-a', ['y2', 'y3', 'y4']]]);
  assert.deepEqual(summary.overBudget, [{batch:'batch-1', name:'[chromium-served] > sample.spec.js > long world',
    ids:group, unfinished:['y4']}]);
  assert.deepEqual(summary.unfinished, ['y4']);
  assert.equal(summary.passed, false);
  assert.ok(logs.some(line => line.startsWith('::error::Over budget: [chromium-served] > sample.spec.js > long world')));
  // The superseded interrupted y2 is gone; y4's final interrupted attempt stays as the evidence.
  assert.deepEqual(kept(sim, 'batch-1').statuses, {z:['passed'], y1:['passed'], y2:['passed'], y3:['passed'], y4:['interrupted']});
  assert.ok(!context(sim, 'batch-1', 'y2'));
  assert.ok(context(sim, 'batch-1-a', 'y4'));
  assert.deepEqual(summary.rerun, []);
});

test('the job reruns each failure once and the merged report shows failed then passed', t => {
  const sim = simulate(workspace(t), {outcomes:{p:['failed', 'passed'], q:['timedOut']}});
  const {summary} = job(sim, [{name:'batch-1', groups:[['p'], ['r']]}, {name:'batch-2', groups:[['q']]}]);
  assert.deepEqual(sim.calls.map(c => [c.name, c.ids]), [['batch-1', ['p', 'r']], ['batch-2', ['q']], ['rerun', ['p', 'q']]]);
  const first = kept(sim, 'batch-1');
  const second = kept(sim, 'batch-2');
  assert.deepEqual([first.statuses, first.retries.p], [{p:['failed', 'passed'], r:['passed']}, [0, 1]]);
  assert.deepEqual([second.statuses, second.retries.q], [{q:['timedOut', 'timedOut']}, [0, 1]]);
  assert.ok(context(sim, 'batch-1', 'p') && context(sim, 'rerun', 'q'));
  assert.equal(summary.passed, false);
  assert.deepEqual([summary.rerun, summary.rerunUnfinished, summary.unfinished], [['p', 'q'], [], []]);
  const out = path.join(sim.root, 'blob-report');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, 'rolling-job-1.json'), 'utf8')), summary);

  // The pinned merge gives a test that appears in two blobs a second salted ID, so the
  // rerun results must arrive inside the batch blob. Merge as the report job does.
  const e2e = path.join(__dirname, '..');
  const results = path.join(sim.root, 'merged', 'results.json');
  const env = {...process.env, FB_CI_REPORT_FILE:results};
  delete env.FB_CI_REPORT_EXPECTED_SHARDS;
  const merge = spawnSync(process.execPath, [path.join(e2e, 'node_modules', '@playwright', 'test', 'cli.js'),
    'merge-reports', '--reporter=' + path.join(__dirname, 'ci-report.js'), out], {cwd:e2e, env, encoding:'utf8'});
  assert.equal(merge.status, 0, merge.stderr || merge.stdout);
  const report = JSON.parse(fs.readFileSync(results, 'utf8'));
  const tests = {};
  (function visit(suites) {
    for (const suite of suites) {
      for (const spec of suite.specs) for (const row of spec.tests) tests[row.id] = [row.status, row.results.map(r => r.status)];
      visit(suite.suites);
    }
  })(report.suites);
  assert.deepEqual(tests, {p:['flaky', ['failed', 'passed']], q:['unexpected', ['timedOut', 'timedOut']], r:['expected', ['passed']]});
  assert.deepEqual([report.stats.expected, report.stats.unexpected, report.stats.flaky], [1, 1, 1]);
});

test('an interrupted failure rerun is dropped and its case keeps the first failure', t => {
  const sim = simulate(workspace(t), {outcomes:{f1:['failed'], f2:['failed']}});
  const first = sim.exec;
  // The rerun reaches the cap inside f2.
  const rerun = simulate(sim.root, {ms:{f2:700000}, outcomes:{f1:['failed']}}).exec;
  sim.exec = (ids, name) => name === 'rerun' ? rerun(ids, name) : first(ids, name);
  const {summary} = job(sim, [{name:'batch-1', groups:[['f1'], ['f2']]}]);
  assert.deepEqual(sim.calls.map(c => c.name), ['batch-1']);
  assert.deepEqual(kept(sim, 'batch-1').statuses, {f1:['failed', 'failed'], f2:['failed']});
  assert.ok(!context(sim, 'rerun', 'f2'), 'The interrupted rerun context is removed');
  assert.deepEqual([summary.rerun, summary.rerunUnfinished, summary.unfinished], [['f1', 'f2'], ['f2'], []]);
  assert.equal(summary.passed, false);
});

test('no attempt starts after the job deadline and its cases stay unfinished', t => {
  const ids = ['d1', 'd2', 'd3', 'd4'];
  const sim = simulate(workspace(t), {ms:Object.fromEntries(ids.map(id => [id, 250000]))});
  const {summary, logs} = job(sim, [{name:'batch-1', groups:ids.map(id => [id])}, {name:'batch-2', groups:[['late']]}],
    {now:() => sim.elapsed, deadline:600000});
  assert.deepEqual(sim.calls.map(c => c.name), ['batch-1']);
  assert.deepEqual(summary.attempts.filter(a => a.skipped).map(a => a.name), ['batch-1-a', 'batch-1-b', 'batch-2']);
  assert.deepEqual(summary.unfinished, ['d3', 'd4', 'late']);
  assert.equal(summary.passed, false);
  assert.equal(logs.filter(line => line.includes('deadline')).length, 1);
  assert.ok(!fs.existsSync(path.join(sim.root, 'blob-report', 'batch-2.zip')));
  // Nothing ran d3 again, so its interrupted attempt is not superseded and stays.
  assert.deepEqual(kept(sim, 'batch-1').statuses, {d1:['passed'], d2:['passed'], d3:['interrupted']});
  assert.ok(context(sim, 'batch-1', 'd3'));
});

test('global errors, failing exits and missing reports still fail a job whose cases passed', t => {
  // An error outside any test in a capped attempt survives the split and the written blob.
  const errors = simulate(workspace(t), {ms:{g1:250000, g2:250000, g3:250000}, errors:['batch-1']});
  const first = job(errors, [{name:'batch-1', groups:[['g1'], ['g2'], ['g3']]}]).summary;
  assert.deepEqual(errors.calls.map(c => c.name), ['batch-1', 'batch-1-a']);
  const written = kept(errors, 'batch-1');
  assert.deepEqual(written.statuses, {g1:['passed'], g2:['passed'], g3:['passed']});
  assert.equal(written.blob.events.filter(e => e.method === 'onError').length, 1);
  assert.deepEqual([first.passed, first.unfinished], [false, []]);
  // An uncapped attempt with a non-zero exit and only passing results.
  const exit = simulate(workspace(t), {exits:{'batch-1':1}});
  assert.equal(job(exit, [{name:'batch-1', groups:[['h1']]}]).summary.passed, false);
  // An uncapped attempt that wrote no blob report leaves its cases unfinished.
  const missing = simulate(workspace(t), {});
  const run = missing.exec;
  missing.exec = (ids, name) => ({...run(ids, name), blob:null});
  const {summary, logs} = job(missing, [{name:'batch-1', groups:[['m1']]}]);
  assert.deepEqual([summary.passed, summary.unfinished], [false, ['m1']]);
  assert.ok(logs.includes('::error::Attempt batch-1 wrote no blob report.'));
  assert.ok(!fs.existsSync(path.join(missing.root, 'blob-report', 'batch-1.zip')));
});

test('an attempt whose report lists other cases than requested stops the job', t => {
  const sim = simulate(workspace(t), {});
  const run = sim.exec;
  sim.exec = (ids, name) => run([...ids, 'stray'], name);
  assert.throws(() => job(sim, [{name:'batch-1', groups:[['a']]}]), /Unexpected browser selection/);
});

test('blob archives from the zip writer Playwright uses read back, and written ones round trip', async t => {
  const root = workspace(t);
  const {yazl} = require(path.join(__dirname, '..', 'node_modules', 'playwright-core', 'lib', 'utilsBundle.js'));
  const zip = new yazl.ZipFile();
  zip.addBuffer(Buffer.from('stored bytes'), 'resources/stored.txt', {compress:false});
  zip.addReadStream(Readable.from(['{"method":"onBegin"}\n', '{"method":"onEnd","params":{"result":{}}}\n']), 'report.jsonl');
  zip.end();
  const chunks = [];
  for await (const chunk of zip.outputStream) chunks.push(chunk);
  const file = path.join(root, 'yazl.zip');
  fs.writeFileSync(file, Buffer.concat(chunks));
  const blob = readBlob(file);
  assert.deepEqual(blob.events.map(e => e.method), ['onBegin', 'onEnd']);
  assert.equal(blob.entries.get('resources/stored.txt').data.toString(), 'stored bytes');
  const copy = path.join(root, 'copy.zip');
  writeZip(copy, [...blob.entries.values()]);
  const entries = readZip(fs.readFileSync(copy));
  assert.deepEqual([...entries.keys()].sort(), ['report.jsonl', 'resources/stored.txt']);
  assert.deepEqual(readBlob(copy).events, blob.events);
});
