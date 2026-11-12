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
  pairs.forEach(function (pair, index) {
    const left = pair.baseline, right = pair.candidate;
    const keys = new Set(Object.keys(left).concat(Object.keys(right)));
    keys.forEach(function (key) {
      const a = left[key], b = right[key];
      if (!a || !b || !a.browser || !b.browser || a.workload !== b.workload || a.browser !== b.browser ||
          !(a.value > 0) || !(b.value > 0) || !Number.isFinite(a.value) || !Number.isFinite(b.value)) {
        rejected.push({pair:index+1, metric:key, reason:'Missing, invalid or mismatched workload/browser'});
        return;
      }
      if (!rows.has(key)) rows.set(key, {baseline:[], candidate:[], gains:[]});
      const row = rows.get(key);
      row.baseline.push(a.value); row.candidate.push(b.value);
      row.gains.push(100 * (1 - b.value / a.value));
    });
  });
  const metrics = [];
  rows.forEach(function (row, key) {
    if (row.gains.length !== pairs.length) return; // Never silently drop failed samples.
    metrics.push({metric:key, baseline:stats(row.baseline), candidate:stats(row.candidate),
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
      out[row.mode] = {value:row.elapsedMs, browser:row.browser,
        workload:JSON.stringify([row.mode, row.modCount, row.signature])};
    });
  } else {
    if (data.cpuProfile !== false || !data.browser || data.unsupported || (data.notOffered || []).length || data.starts.length !== 1) {
      throw new Error('Missing or profiled season workload');
    }
    const start = data.starts[0];
    if (start.id !== subject || start.status !== 'ok' || start.pageErrors.length || start.seasons.length !== seasons) {
      throw new Error('Incomplete or failed season workload');
    }
    start.seasons.forEach(function (row, index) {
      if (row.index !== index+1 || row.days <= 0 || row.to.dead || row.to.rng == null || row.to.uid == null) {
        throw new Error('Invalid season progress');
      }
      const workload = JSON.stringify([start.code, row.index, row.from, row.to.date, row.days,
        row.to.turn, row.to.rng, row.to.uid, row.to.characters, row.to.realms,
        row.to.armies, row.to.activeWars, row.to.heldCounties]);
      ['simulationMs','elapsedMs'].forEach(function (field) {
        out['season-' + row.index + '/' + field] = {value:row[field], browser:data.browser, workload:workload};
      });
    });
  }
  return out;
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

function run() {
  const subject = process.env.SUBJECT || 'content';
  const repeats = Number(process.env.REPEATS || 3), seasons = Number(process.env.SEASONS || 4);
  if (!Number.isInteger(repeats) || repeats < 3 || repeats > 9 ||
      !Number.isInteger(seasons) || seasons < 1 || seasons > 8) throw new Error('Invalid repeats or seasons');
  const output = path.resolve(process.env.COMPARISON_OUTPUT || 'speed-results');
  fs.mkdirSync(output, {recursive:true});
  const roots = {baseline:path.resolve(process.env.BASELINE_GAME), candidate:path.resolve(process.env.CANDIDATE_GAME)};
  const revision = function (root) { return execFileSync('git', ['-C',root,'rev-parse','HEAD'], {encoding:'utf8'}).trim(); };
  const report = {schema:1, subject:subject, baseline:revision(roots.baseline), candidate:revision(roots.candidate),
    driver:revision(path.resolve(__dirname, '../../..')), generated:new Date().toISOString(),
    repeats:repeats, seasons:seasons, valid:false, metrics:[], rejected:[], order:[],
    environment:{node:process.version, platform:process.platform, arch:process.arch, release:os.release(),
      cpu:os.cpus()[0].model, cpuCount:os.cpus().length, runnerImage:process.env.ImageVersion || null,
      run:process.env.GITHUB_RUN_ID || null, attempt:process.env.GITHUB_RUN_ATTEMPT || null}};
  const pairs = [];
  try {
    for (let index = 0; index < repeats; index++) {
      const pair = {}, order = index % 2 ? ['candidate','baseline'] : ['baseline','candidate'];
      report.order.push(order);
      for (const side of order) {
        const directory = path.join(output, 'pair-' + (index+1), side);
        fs.mkdirSync(directory, {recursive:true});
        const env = Object.assign({}, process.env, {GAME_COMMIT:report[side], GAME_REF:report[side]});
        let args, file;
        if (subject === 'content') {
          env.FB_CONTENT_GAME = roots[side]; env.FB_CONTENT_OUTPUT = directory; env.FB_CONTENT_PROFILE = 'false';
          args = [path.join(__dirname,'content.js')]; file = path.join(directory,'content-timing.json');
        } else {
          file = path.join(directory,'season.json');
          args = [path.join(__dirname,'season-timing.js'),'measure','--game',roots[side],
            '--only',subject,'--seasons',String(seasons),'--out',file];
        }
        execFileSync(process.execPath, args, {env:env, stdio:'inherit', timeout:60*60*1000});
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
    console.log(summary(report));
  }
  if (!report.valid) process.exitCode = 1;
}

module.exports = {stats:stats, comparePairs:comparePairs, extract:extract};
if (require.main === module) run();
