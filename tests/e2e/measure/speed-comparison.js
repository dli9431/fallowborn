'use strict';

// Paired measurements, not a wall-clock regression gate. Run only in CI.
const fs = require('fs');
const path = require('path');
const os = require('os');
const {execFileSync} = require('child_process');

function stats(values) {
  if (!values.length || values.some(function (n) { return !Number.isFinite(n); })) {
    throw new Error('Missing or non-finite samples');
  }
  const sorted = values.slice().sort(function (a,b) { return a-b; });
  const middle = Math.floor(sorted.length / 2);
  return {samples:values, median:sorted.length % 2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2,
    min:sorted[0], max:sorted[sorted.length-1]};
}

function comparePairs(pairs) {
  if (pairs.length < 3) throw new Error('At least three complete pairs are required');
  const rows = new Map(), rejected = [];
  const keys = new Set();
  pairs.forEach(function (pair) {
    Object.keys(pair.baseline || {}).concat(Object.keys(pair.candidate || {})).forEach(function (key) { keys.add(key); });
  });
  pairs.forEach(function (pair, index) {
    const left = pair.baseline || {}, right = pair.candidate || {};
    keys.forEach(function (key) {
      const a = left[key], b = right[key];
      if (!a || !b || !a.browser || !b.browser || !a.workload || !b.workload || a.workload !== b.workload || a.browser !== b.browser ||
          !(a.value > 0) || !(b.value > 0) || !Number.isFinite(a.value) || !Number.isFinite(b.value)) {
        rejected.push({pair:index+1, metric:key, reason:'Missing, invalid or mismatched workload/browser'});
        return;
      }
      if (!rows.has(key)) rows.set(key, {baseline:[], candidate:[], gains:[]});
      const row = rows.get(key);
      if (row.browser && (row.browser !== a.browser || row.workload !== a.workload)) {
        rejected.push({pair:index+1, metric:key, reason:'Workload/browser changed between repetitions'});
        return;
      }
      row.browser = a.browser; row.workload = a.workload;
      row.baseline.push(a.value); row.candidate.push(b.value);
      row.gains.push(100 * (1 - b.value / a.value));
    });
  });
  const metrics = [];
  rows.forEach(function (row, key) {
    if (row.gains.length !== pairs.length) return; // Never silently drop failed samples.
    metrics.push({metric:key, browser:row.browser, workload:row.workload, baseline:stats(row.baseline), candidate:stats(row.candidate),
      improvementPercent:stats(row.gains), fasterPairs:row.gains.filter(function (n) { return n > 0; }).length,
      pairs:pairs.length});
  });
  return {valid:rejected.length === 0 && metrics.length > 0, metrics:metrics, rejected:rejected};
}

function extract(data, subject, seasons) {
  const out = {};
  if (subject === 'content') {
    if (!Array.isArray(data) || data.length !== 2) throw new Error('Missing content workloads');
    data.forEach(function (row) {
      if (row.cpuProfile !== false || !row.browser || !['unmodded','household-overlay'].includes(row.mode) || out[row.mode]) {
        throw new Error('Invalid or profiled content sample');
      }
      if (row.modCount !== (row.mode === 'unmodded' ? 0 : 1) ||
          (row.mode === 'unmodded' ? row.signature !== '' : !/^effective-1-[a-f0-9]{64}$/.test(row.signature))) {
        throw new Error('Invalid content mod workload');
      }
      out[row.mode] = {value:row.elapsedMs, browser:row.browser,
        workload:JSON.stringify([row.mode, row.modCount, row.signature])};
    });
  } else {
    if (data.cpuProfile !== false || data.readAudit || !data.browser || data.unsupported || (data.notOffered || []).length || !Array.isArray(data.starts) || data.starts.length !== 1) {
      throw new Error('Missing or profiled season workload');
    }
    const start = data.starts[0];
    if (start.id !== subject || !start.code || start.status !== 'ok' || !Array.isArray(start.pageErrors) || start.pageErrors.length ||
        !Array.isArray(start.seasons) || start.seasons.length !== seasons) {
      throw new Error('Incomplete or failed season workload');
    }
    start.seasons.forEach(function (row, index) {
      if (row.readAudit || row.index !== index+1 || !Number.isInteger(row.days) || row.days <= 0 || row.days > 90 || !row.from || !row.to ||
          row.to.dead !== false || !row.to.date || !Number.isInteger(row.to.rng) || !Number.isInteger(row.to.uid) ||
          ['turn','characters','realms','armies','activeWars','heldCounties','directSettlements','settlementLimit'].some(function (key) {
            return !Number.isFinite(row.to[key]) || row.to[key] < 0;
          })) {
        throw new Error('Invalid season progress');
      }
      const workload = JSON.stringify([start.code, row.index, row.from, row.to.date, row.days,
        row.to.turn, row.to.rng, row.to.uid, row.to.characters, row.to.realms,
        row.to.armies, row.to.activeWars, row.to.heldCounties, row.to.directSettlements, row.to.settlementLimit]);
      ['simulationMs','elapsedMs'].forEach(function (field) {
        out['season-' + row.index + '/' + field] = {value:row[field], browser:data.browser, workload:workload};
      });
    });
  }
  return out;
}

function pairOrder(index) {
  return index % 2 ? ['candidate','baseline'] : ['baseline','candidate'];
}

function summary(report) {
  const lines = ['Paired speed comparison: ' + report.subject,
    'Baseline: ' + report.baseline, 'Candidate: ' + report.candidate,
    'Valid matched comparison: ' + report.valid,
    'Positive gain means faster. Ranges describe observed samples, not confidence intervals.',
    'CPU profiling is disabled; season operation instrumentation remains enabled on both revisions.',
    'Correctness and save compatibility require their separate regression checks.', ''];
  report.metrics.forEach(function (row) {
    const gain = row.improvementPercent;
    lines.push(row.metric + ': baseline median ' + row.baseline.median.toFixed(2) + ' ms [' +
      row.baseline.min.toFixed(2) + ', ' + row.baseline.max.toFixed(2) + ']; candidate median ' +
      row.candidate.median.toFixed(2) + ' ms [' + row.candidate.min.toFixed(2) + ', ' +
      row.candidate.max.toFixed(2) + ']; paired gain median ' + gain.median.toFixed(2) +
      '% [' + gain.min.toFixed(2) + ', ' + gain.max.toFixed(2) + ']; faster in ' +
      row.fasterPairs + '/' + row.pairs + ' pairs.');
  });
  report.rejected.forEach(function (row) { lines.push('REJECTED: ' + JSON.stringify(row)); });
  if (report.error) lines.push('ERROR: ' + report.error);
  return lines.join('\n') + '\n';
}

function run(options) {
  options = options || {};
  const environment = options.env || process.env, execute = options.execute || execFileSync;
  const subject = environment.SUBJECT || 'content';
  const repeats = Number(environment.REPEATS || 3), seasons = Number(environment.SEASONS || 4);
  const output = path.resolve(environment.COMPARISON_OUTPUT || 'speed-results');
  fs.mkdirSync(output, {recursive:true});
  const revision = function (root) { return execute('git', ['-C',root,'rev-parse','HEAD'], {encoding:'utf8'}).trim(); };
  const report = {schema:1, subject:subject, baseline:null, candidate:null,
    driver:null, generated:new Date().toISOString(),
    repeats:repeats, seasons:seasons, valid:false, metrics:[], rejected:[], order:[],
    environment:{node:process.version, platform:process.platform, arch:process.arch, release:os.release(),
      cpu:os.cpus()[0].model, cpuCount:os.cpus().length, runnerImage:process.env.ImageVersion || null,
      run:process.env.GITHUB_RUN_ID || null, attempt:process.env.GITHUB_RUN_ATTEMPT || null}};
  const pairs = [];
  try {
    if (!Number.isInteger(repeats) || repeats < 3 || repeats > 9 ||
        !Number.isInteger(seasons) || seasons < 1 || seasons > 8) throw new Error('Invalid repeats or seasons');
    const roots = {baseline:path.resolve(environment.BASELINE_GAME), candidate:path.resolve(environment.CANDIDATE_GAME)};
    report.baseline = revision(roots.baseline); report.candidate = revision(roots.candidate);
    report.driver = revision(path.resolve(__dirname, '../../..'));
    if (![report.baseline,report.candidate,report.driver].every(function (sha) { return /^[a-f0-9]{40}$/.test(sha); })) {
      throw new Error('Expected exact game and tooling revisions');
    }
    for (let index = 0; index < repeats; index++) {
      const pair = {}, order = pairOrder(index);
      report.order.push(order);
      for (const side of order) {
        const directory = path.join(output, 'pair-' + (index+1), side);
        fs.mkdirSync(directory, {recursive:true});
        const env = Object.assign({}, environment, {GAME_COMMIT:report[side], GAME_REF:report[side]});
        let args, file;
        if (subject === 'content') {
          env.FB_CONTENT_GAME = roots[side]; env.FB_CONTENT_OUTPUT = directory; env.FB_CONTENT_PROFILE = 'false';
          args = [path.join(__dirname,'content.js')]; file = path.join(directory,'content-timing.json');
        } else {
          file = path.join(directory,'season.json');
          args = [path.join(__dirname,'season-timing.js'),'measure','--game',roots[side],
            '--only',subject,'--seasons',String(seasons),'--out',file];
        }
        execute(process.execPath, args, {env:env, stdio:'inherit', timeout:60*60*1000});
        const data = JSON.parse(fs.readFileSync(file,'utf8'));
        if (subject === 'content' ? data.some(function (row) { return row.gameCommit !== report[side]; }) :
            data.gameCommit !== report[side]) throw new Error('Measurement revision mismatch');
        pair[side] = extract(data, subject, seasons);
      }
      pairs.push(pair);
    }
    Object.assign(report, comparePairs(pairs));
  } catch (error) {
    report.error = String(error.stack || error);
  } finally {
    fs.writeFileSync(path.join(output,'comparison.json'), JSON.stringify(report,null,2) + '\n');
    fs.writeFileSync(path.join(output,'summary.txt'), summary(report));
    if (!options.quiet) console.log(summary(report));
  }
  return report;
}

module.exports = {stats:stats, comparePairs:comparePairs, extract:extract, pairOrder:pairOrder, run:run};
if (require.main === module && !run().valid) process.exitCode = 1;
