'use strict';
const {test,expect} = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {stats,comparePairs,extract,pairOrder,run} = require('../measure/speed-comparison');
dependsOnRuntime(__filename,['tests/e2e/measure/speed-comparison.js','tests/e2e/measure/content.js',
  'tests/e2e/measure/season-timing.js','.github/workflows/nightly.yml','.github/workflows/speed-comparison.yml']);

function pairs() {
  return [50,60,40].map(function (value) {
    return {baseline:{load:{value:100,browser:'same',workload:'same'}},
      candidate:{load:{value:value,browser:'same',workload:'same'}}};
  });
}

test('paired improvements preserve every sample and report descriptive spread',function () {
  const result = comparePairs(pairs());
  expect(result.valid).toBe(true);
  expect(result.metrics[0].improvementPercent).toEqual({samples:[50,40,60],median:50,min:40,max:60});
  expect(result.metrics[0].fasterPairs).toBe(3);
  expect(stats([4,1,3,2]).median).toBe(2.5);
  expect(function () { comparePairs(pairs().slice(0,2)); }).toThrow();
});

test('missing samples, changed workloads and invalid timings cannot report a speed gain',function () {
  for (const change of [function (p) { delete p.candidate.load; },
    function (p) { p.candidate.load.workload = 'less work'; },
    function (p) { p.candidate.load.browser = 'different'; },
    function (p) { p.candidate.load.value = 0; },
    function (p) { p.candidate.load.value = NaN; }]) {
    const input = pairs(); change(input[1]);
    const result = comparePairs(input);
    expect(result.valid).toBe(false);
    expect(result.metrics).toEqual([]);
    expect(result.rejected).toHaveLength(1);
  }
});

test('regressions remain negative gains and mixed results remain visible',function () {
  const input = pairs(); input[0].candidate.load.value = 150;
  const row = comparePairs(input).metrics[0];
  expect(row.improvementPercent.min).toBe(-50);
  expect(row.fasterPairs).toBe(2);
});

test('profiled, failed and missing season workloads are rejected',function () {
  const data = {browser:'same',cpuProfile:false,starts:[{id:'476:start',code:'seed',status:'ok',pageErrors:[],
    seasons:[{index:1,days:90,from:'spring',to:{date:'summer',turn:90,rng:5,uid:2,dead:false,characters:10,realms:2,armies:1,activeWars:0,heldCounties:1,directSettlements:1,settlementLimit:3},simulationMs:100,elapsedMs:120}]}]};
  expect(Object.keys(extract(data,'476:start',1))).toHaveLength(2);
  expect(function () { extract(data,'476:start',2); }).toThrow();
  data.cpuProfile = true;
  expect(function () { extract(data,'476:start',1); }).toThrow();
  data.cpuProfile = false; data.starts[0].status = 'failed';
  expect(function () { extract(data,'476:start',1); }).toThrow();
});

test('content signatures participate in matching and profiled data is excluded',function () {
  const data = [{mode:'unmodded',elapsedMs:20,browser:'same',modCount:0,signature:'',cpuProfile:false},
    {mode:'household-overlay',elapsedMs:30,browser:'same',modCount:1,signature:'effective-1-' + 'a'.repeat(64),cpuProfile:false}];
  const original = extract(data,'content',0);
  data[1].signature = 'effective-1-' + 'b'.repeat(64);
  const changed = extract(data,'content',0);
  expect(comparePairs([1,2,3].map(function () { return {baseline:original,candidate:changed}; })).valid).toBe(false);
  data[0].cpuProfile = true;
  expect(function () { extract(data,'content',0); }).toThrow();
});

test('a metric missing on both sides of a pair cannot silently disappear',function () {
  const input = pairs();
  input.forEach(function (pair) {
    pair.baseline.other = {value:10,browser:'same',workload:'same'};
    pair.candidate.other = {value:5,browser:'same',workload:'same'};
  });
  delete input[1].baseline.load; delete input[1].candidate.load;
  const result = comparePairs(input);
  expect(result.valid).toBe(false);
  expect(result.rejected).toEqual([{pair:2,metric:'load',reason:'Missing, invalid or mismatched workload/browser'}]);
  expect(result.metrics.map(function (row) { return row.metric; })).toEqual(['other']);
  expect(comparePairs([{baseline:{},candidate:{}},{baseline:{},candidate:{}},{baseline:{},candidate:{}}]).valid).toBe(false);
});

test('matched pairs must also retain the same workload and browser across repetitions',function () {
  for (const key of ['workload','browser']) {
    const input = pairs();
    input[1].baseline.load[key] = input[1].candidate.load[key] = 'changed together';
    const result = comparePairs(input);
    expect(result.valid).toBe(false);
    expect(result.metrics).toEqual([]);
    expect(result.rejected).toHaveLength(1);
  }
});

function contentSample(commit) {
  return [{mode:'unmodded',elapsedMs:20,browser:'same',modCount:0,signature:'',cpuProfile:false,gameCommit:commit},
    {mode:'household-overlay',elapsedMs:30,browser:'same',modCount:1,
      signature:'effective-1-' + 'a'.repeat(64),cpuProfile:false,gameCommit:commit}];
}

test('both distinct content modes and their declared mod workloads are mandatory',function () {
  for (const change of [function (data) { data.pop(); },
    function (data) { data[1].mode = 'unmodded'; },
    function (data) { data[0].modCount = 1; },
    function (data) { data[0].signature = 'unexpected'; },
    function (data) { data[1].signature = ''; },
    function (data) { delete data[1].modCount; }]) {
    const data = contentSample('revision'); change(data);
    expect(function () { extract(data,'content',0); }).toThrow();
  }
});

function seasonSample(subject) {
  return {browser:'same',cpuProfile:false,starts:[{id:subject,code:'MEASURE-seed',status:'ok',pageErrors:[],
    seasons:[{index:1,days:45,from:'spring 476',simulationMs:100,elapsedMs:120,
      to:{date:'summer 476',turn:45,rng:5,uid:2,dead:false,characters:10,realms:2,armies:1,
        activeWars:0,heldCounties:1,directSettlements:1,settlementLimit:3}}]}]};
}

test('season guards reject incomplete progress and match every deterministic workload field',function () {
  const subject = '1096:bohemond_1096';
  for (const change of [function (data) { data.starts = []; },
    function (data) { data.notOffered = [subject]; },
    function (data) { data.starts[0].pageErrors.push('error'); },
    function (data) { data.starts[0].status = 'dead'; },
    function (data) { data.starts[0].seasons[0].days = 0; },
    function (data) { data.starts[0].seasons[0].days = 91; },
    function (data) { data.starts[0].seasons[0].to.dead = true; },
    function (data) { delete data.starts[0].seasons[0].to.rng; },
    function (data) { data.starts[0].seasons[0].to.heldCounties = null; }]) {
    const data = seasonSample(subject); change(data);
    expect(function () { extract(data,subject,1); }).toThrow();
  }
  const original = extract(seasonSample(subject),subject,1);
  for (const key of ['date','turn','rng','uid','characters','realms','armies','activeWars','heldCounties','directSettlements','settlementLimit']) {
    const data = seasonSample(subject), to = data.starts[0].seasons[0].to;
    to[key] = key === 'date' ? 'autumn 476' : to[key] + 1;
    const changed = extract(data,subject,1);
    expect(comparePairs([1,2,3].map(function () { return {baseline:original,candidate:changed}; })).valid).toBe(false);
  }
  for (const change of [function (data) { data.starts[0].code = 'different seed'; },
    function (data) { data.starts[0].seasons[0].days++; },
    function (data) { data.starts[0].seasons[0].from = 'winter 476'; }]) {
    const data = seasonSample(subject); change(data);
    const changed = extract(data,subject,1);
    expect(comparePairs([1,2,3].map(function () { return {baseline:original,candidate:changed}; })).valid).toBe(false);
  }
});

// Only synthetic child-process responses: these tests never launch measurement drivers.
function syntheticRun(testInfo, failure) {
  const baseline = 'a'.repeat(40), candidate = 'b'.repeat(40), driver = 'c'.repeat(40), calls = [];
  const output = testInfo.outputPath('comparison-' + (failure || 'success'));
  const report = run({quiet:true,env:{SUBJECT:'content',REPEATS:'3',SEASONS:'4',
    BASELINE_GAME:path.join(output,'baseline-game'), CANDIDATE_GAME:path.join(output,'candidate-game'),COMPARISON_OUTPUT:output},
  execute:function (command, args, options) {
    if (command === 'git') return args[1].endsWith('baseline-game') ? baseline : args[1].endsWith('candidate-game') ? candidate : driver;
    calls.push(options.env.GAME_COMMIT);
    if (failure === 'child' && calls.length === 3) throw new Error('Synthetic child failed');
    const data = contentSample(failure === 'revision' ? driver : options.env.GAME_COMMIT);
    if (failure === 'missing-mode') data.pop();
    fs.writeFileSync(path.join(options.env.FB_CONTENT_OUTPUT,'content-timing.json'),JSON.stringify(data));
    expect(options.env.FB_CONTENT_PROFILE).toBe('false');
    expect(options.env.FB_CONTENT_GAME).toBe(options.env.GAME_COMMIT === baseline ? path.join(output,'baseline-game') : path.join(output,'candidate-game'));
  }});
  return {report:report,calls:calls,output:output,baseline:baseline,candidate:candidate,driver:driver};
}

test('alternating pairs retain exact revisions, browser metadata and raw artifacts',function ({}, testInfo) {
  const result = syntheticRun(testInfo);
  expect(result.report.valid).toBe(true);
  expect(result.calls).toEqual([result.baseline,result.candidate,result.candidate,result.baseline,result.baseline,result.candidate]);
  expect(result.report.order).toEqual([pairOrder(0),pairOrder(1),pairOrder(2)]);
  expect(result.report.driver).toBe(result.driver);
  expect(result.report.metrics.every(function (metric) { return metric.browser === 'same'; })).toBe(true);
  expect(JSON.parse(fs.readFileSync(path.join(result.output,'comparison.json'),'utf8'))).toEqual(result.report);
  expect(fs.readFileSync(path.join(result.output,'summary.txt'),'utf8')).toContain('Valid matched comparison: true');
  expect(fs.existsSync(path.join(result.output,'pair-3','candidate','content-timing.json'))).toBe(true);
});

test('failed children, revision mismatches and incomplete modes retain failure reports',function ({}, testInfo) {
  for (const failure of ['child','revision','missing-mode']) {
    const result = syntheticRun(testInfo,failure);
    expect(result.report.valid).toBe(false);
    expect(result.report.error).toContain(failure === 'child' ? 'Synthetic child failed' : failure === 'revision' ? 'Measurement revision mismatch' : 'Missing content workloads');
    expect(result.report.metrics).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(result.output,'comparison.json'),'utf8')).valid).toBe(false);
    expect(fs.readFileSync(path.join(result.output,'summary.txt'),'utf8')).toContain('ERROR:');
    expect(fs.existsSync(path.join(result.output,'pair-1','baseline','content-timing.json'))).toBe(true);
  }
});

test('Nightly converts numeric call inputs, preserves ordinary jobs and offers all five starts',function () {
  const root = path.resolve(__dirname,'../../..');
  const nightly = fs.readFileSync(path.join(root,'.github/workflows/nightly.yml'),'utf8');
  const workflow = fs.readFileSync(path.join(root,'.github/workflows/speed-comparison.yml'),'utf8');
  expect(nightly.match(/^jobs:/gm)).toHaveLength(1);
  expect(nightly.match(/^  suite:/gm)).toHaveLength(1);
  expect(nightly).toContain('      suite:\n        description: Run the full Playwright suite');
  expect(nightly).toContain("repeats: ${{ fromJSON(format('{0}', inputs.comparison_repeats || 3)) }}");
  expect(nightly).toContain("seasons: ${{ fromJSON(format('{0}', inputs.seasons || 4)) }}");
  expect(nightly).toContain('subjects: ${{ inputs.comparison_subjects');
  expect(nightly).toContain("github.event_name == 'schedule' || inputs.suite");
  expect(nightly).toContain("github.event_name == 'schedule' || inputs.timing");
  expect(nightly).toContain('shard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]');
  expect(nightly).toContain('ref: e022f0b7dfb749df037df8f69f46ef3f549d0d94');
  expect(nightly).toContain('node tooling/tests/e2e/support/ci-summary.js');
  expect(nightly).toContain('npm run test:server');
  const subjects = ['content','476:mobile_household_476','476:peroz_sasanian_476','1096:yaghi_siyan_1096','1096:bohemond_1096','1204:muhammad_1204'];
  for (const source of [nightly,workflow]) expect(source).toContain(JSON.stringify(subjects));
  expect(workflow).toContain('specs/speed-comparison.spec.js --project=chromium-served');
  expect(workflow).toContain('if: always()');
  expect(workflow).toContain('name: speed-comparison-${{ strategy.job-index }}');
});
