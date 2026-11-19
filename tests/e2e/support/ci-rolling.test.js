'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const {makePlan, learn} = require('./ci-rolling');

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
