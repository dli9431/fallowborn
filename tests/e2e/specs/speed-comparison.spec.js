'use strict';
const {test,expect} = require('@playwright/test');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {stats,comparePairs,extract} = require('../measure/speed-comparison');
dependsOnRuntime(__filename,['tests/e2e/measure/speed-comparison.js','tests/e2e/measure/content.js',
  'tests/e2e/measure/season-timing.js']);

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
    seasons:[{index:1,days:90,from:'spring',to:{date:'summer',turn:90,rng:5,uid:2},simulationMs:100,elapsedMs:120}]}]};
  expect(Object.keys(extract(data,'476:start',1))).toHaveLength(2);
  expect(function () { extract(data,'476:start',2); }).toThrow();
  data.cpuProfile = true;
  expect(function () { extract(data,'476:start',1); }).toThrow();
  data.cpuProfile = false; data.starts[0].status = 'failed';
  expect(function () { extract(data,'476:start',1); }).toThrow();
});

test('content signatures participate in matching and profiled data is excluded',function () {
  const data = [{mode:'unmodded',elapsedMs:20,browser:'same',modCount:0,signature:'',cpuProfile:false},
    {mode:'household-overlay',elapsedMs:30,browser:'same',modCount:1,signature:'sig',cpuProfile:false}];
  const original = extract(data,'content',0);
  data[1].signature = 'different';
  const changed = extract(data,'content',0);
  expect(comparePairs([1,2,3].map(function () { return {baseline:original,candidate:changed}; })).valid).toBe(false);
  data[0].cpuProfile = true;
  expect(function () { extract(data,'content',0); }).toThrow();
});
