'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { spawnSync } = require('node:child_process');

const targetMs = 375000;
const coldMs = 45000;
// Last attempt start inside the 120 minute rolling job, leaving room for one capped
// attempt, setup and artifact upload.
const jobDeadlineMs = 95 * 60000;
// A finished result is passed, failed or timedOut. Interrupted or missing results are
// unfinished; a skipped result is settled and never rerun.
const finishedStatuses = new Set(['passed', 'failed', 'timedOut']);
const settled = r => r.status !== undefined && r.status !== 'interrupted';
const unexpected = r => settled(r) && r.status !== 'skipped' && r.status !== r.expected;
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));
const historyFile = () => path.join(process.env.RUNNER_TEMP, 'case-timings.json');

// Browser workers per batch. Only a rolling-all run that asks for two sets
// FB_ROLLING_WORKERS, for both its plan and its batch jobs; every other run uses one.
function rollingWorkers() {
  const value = process.env.FB_ROLLING_WORKERS || '1';
  assert(value === '1' || value === '2', 'Rolling batches run 1 or 2 browser workers, not ' + value);
  return Number(value);
}

// The worker count of this batch job, which must be the count its plan was made for.
function planWorkers(plan) {
  const workers = rollingWorkers();
  assert.equal(plan.workers || 1, workers,
    'The rolling plan was made with workers=' + (plan.workers || 1) + ', but this batch job has workers=' + workers);
  return workers;
}

/* With two workers, pair the one-worker shares into batches of up to twice the planning
   budget, one share per worker. fullyParallel is false, so a file stays on one worker: two
   shares of the same file never pair. Shares planned from cold estimates and a lone scope
   group over the budget keep a batch of their own. Groups list the first share first. */
function pairShares(shares, owners, cold) {
  const batches = [];
  const open = [];
  for (const share of shares) {
    if (cold.has(share) || share.ms > targetMs) batches.push({ms:share.ms, shares:[share.ms], groups:share.groups});
    else open.push(share);
  }
  open.sort((a,b) => b.ms - a.ms);
  while (open.length) {
    const first = open.shift();
    const files = new Set(owners.get(first));
    const index = open.findIndex(share => !owners.get(share).some(key => files.has(key)));
    if (index < 0) {
      batches.push({ms:first.ms, shares:[first.ms], groups:first.groups});
      continue;
    }
    const [second] = open.splice(index, 1);
    batches.push({ms:first.ms + second.ms, shares:[first.ms, second.ms], groups:[...first.groups, ...second.groups]});
  }
  return batches;
}

function makePlan(cases, timings, workers = rollingWorkers()) {
  assert(workers === 1 || workers === 2, 'Rolling batches run 1 or 2 browser workers, not ' + workers);
  const files = new Map();
  for (const test of cases) {
    const key = JSON.stringify([test.project, test.file]);
    if (!files.has(key)) files.set(key, []);
    files.get(key).push(test);
  }
  let batches = [];
  const measured = [];
  // The [project, file] keys of each share, and the shares planned from cold estimates.
  const owners = new Map();
  const cold = new Set();
  for (const [key, tests] of files) {
    // Keep explicitly serial or shared lifecycle scopes together. Ordinary independent
    // cases (including parameterized tests on the same line) can be selected by ID.
    const groups = new Map();
    for (const test of tests) {
      const key = test.scope || test.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(test);
    }
    const sparse = tests.filter(t => timings[t.id] > 0).length < tests.length * 0.8;
    const buckets = [];
    for (const group of groups.values()) {
      const ms = group.reduce((sum, t) => sum + (timings[t.id] || coldMs), 0);
      let bucket = buckets.at(-1);
      if (!bucket || bucket.ms + ms > targetMs) {
        bucket = {ms:0, groups:[]};
        buckets.push(bucket);
        owners.set(bucket, [key]);
      }
      bucket.groups.push(group.map(t => t.id));
      bucket.ms += ms;
    }
    if (sparse) buckets.forEach(bucket => cold.add(bucket));
    if (sparse || buckets.length > 1) batches.push(...buckets);
    else measured.push(...buckets);
  }
  const packed = [];
  for (const file of measured.sort((a,b) => b.ms - a.ms)) {
    const batch = packed.find(b => b.ms + file.ms <= targetMs);
    if (batch) { batch.ms += file.ms; batch.groups.push(...file.groups); owners.get(batch).push(...owners.get(file)); }
    else packed.push(file);
  }
  batches.push(...packed);
  if (workers === 2) batches = pairShares(batches, owners, cold);
  // A batch's expected wall time: its work on one worker, or its larger share on two.
  const load = batch => batch.shares ? Math.max(...batch.shares) : batch.ms;
  batches.sort((a,b) => load(b) - load(a));
  const count = Math.min(batches.length, 256, Math.max(16, Math.ceil(batches.length / 3)));
  const jobs = Array.from({length:count}, () => ({ms:0, batches:[]}));
  for (const [index, batch] of batches.entries()) {
    const job = jobs.reduce((a,b) => a.ms <= b.ms ? a : b);
    job.batches.push(index);
    job.ms += load(batch);
  }
  const ids = batches.flatMap(b => b.groups.flat()).sort();
  assert.deepEqual(ids, cases.map(c => c.id).sort());
  assert.equal(new Set(ids).size, ids.length);
  const plan = {batches, jobs:jobs.map(j => j.batches), ids};
  if (workers > 1) plan.workers = workers;
  return plan;
}

function reportTests(report) {
  const tests = [];
  function visit(s) {
    for (const spec of s.specs) tests.push(...spec.tests);
    s.suites.forEach(visit);
  }
  report.suites.forEach(visit);
  return tests;
}

function learn(report, previous) {
  for (const test of reportTests(report)) {
    const result = test.results.find(r => r.status === 'passed');
    if (result && Number.isFinite(result.duration)) previous[test.id] = Math.max(1000, result.duration);
  }
  return previous;
}

/* Playwright blob reports are ZIP files holding report.jsonl and attachment resources.
   A rolling batch can need results from several attempts, and merge-reports gives a test
   that appears in two blobs a separate salted ID, so the runner writes one blob per batch
   from the events it keeps. This small codec copies compressed resources unchanged. */
function readZip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  assert(end >= 0, 'Missing ZIP directory');
  const count = buffer.readUInt16LE(end + 10);
  let at = buffer.readUInt32LE(end + 16);
  assert(count !== 0xffff && at !== 0xffffffff, 'ZIP64 blob reports are not supported');
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(buffer.readUInt32LE(at), 0x02014b50, 'Corrupt ZIP directory');
    const nameLength = buffer.readUInt16LE(at + 28);
    const compressed = buffer.readUInt32LE(at + 20);
    const local = buffer.readUInt32LE(at + 42);
    const entry = {name:buffer.toString('utf8', at + 46, at + 46 + nameLength), method:buffer.readUInt16LE(at + 10),
      crc:buffer.readUInt32LE(at + 16), size:buffer.readUInt32LE(at + 24)};
    assert(compressed !== 0xffffffff && entry.size !== 0xffffffff && local !== 0xffffffff,
      'ZIP64 blob reports are not supported');
    assert.equal(buffer.readUInt32LE(local), 0x04034b50, 'Corrupt ZIP entry ' + entry.name);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    entry.data = buffer.subarray(start, start + compressed);
    entries.set(entry.name, entry);
    at += 46 + nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
  }
  return entries;
}

function unzip(entry) {
  if (entry.method === 0) return entry.data;
  assert.equal(entry.method, 8, 'Unsupported ZIP compression in ' + entry.name);
  return zlib.inflateRawSync(entry.data);
}

function zipEntry(name, content) {
  return {name, method:8, crc:zlib.crc32(content), size:content.length, data:zlib.deflateRawSync(content)};
}

function writeZip(file, entries) {
  const chunks = [];
  const directory = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x800, 8);
    header.writeUInt16LE(entry.method, 10);
    header.writeUInt16LE(0x21, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.data.length, 20);
    header.writeUInt32LE(entry.size, 24);
    header.writeUInt16LE(name.length, 28);
    header.writeUInt32LE(offset, 42);
    // The local header repeats the central fields from version needed to extra length.
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    header.copy(local, 4, 6, 32);
    chunks.push(local, name, entry.data);
    directory.push(header, name);
    offset += local.length + name.length + entry.data.length;
  }
  const size = directory.reduce((sum, part) => sum + part.length, 0);
  assert(entries.length < 0xffff && offset + size < 0xffffffff, 'Blob report exceeds ZIP limits');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(size, 12);
  end.writeUInt32LE(offset, 16);
  fs.mkdirSync(path.dirname(file), {recursive:true});
  fs.writeFileSync(file, Buffer.concat([...chunks, ...directory, end]));
}

function readBlob(file) {
  const entries = readZip(fs.readFileSync(file));
  assert(entries.has('report.jsonl'), 'Missing blob events in ' + file);
  const content = unzip(entries.get('report.jsonl'));
  const events = [];
  for (let start = 0; start < content.length;) {
    let end = content.indexOf(10, start);
    if (end < 0) end = content.length;
    if (end > start) events.push(JSON.parse(content.toString('utf8', start, end)));
    start = end + 1;
  }
  return {file, entries, events};
}

function resultId(event) {
  const params = event.params || {};
  return params.result ? params.result.id : params.resultId;
}

function attachmentsOf(params) {
  return (params.attachments || []).concat(params.result && params.result.attachments || []);
}

function blobResults(blob) {
  const results = new Map();
  for (const {method, params} of blob.events) {
    if (method === 'onTestBegin') results.set(params.result.id, {id:params.result.id, testId:params.testId});
    else if (method === 'onTestEnd' && results.has(params.result.id))
      Object.assign(results.get(params.result.id), {status:params.result.status, expected:params.test.expectedStatus});
  }
  return [...results.values()];
}

function blobTitles(blob) {
  const titles = new Map();
  function visit(entries, prefix) {
    for (const entry of entries) {
      if ('testId' in entry) titles.set(entry.testId, [...prefix, entry.title]);
      else visit(entry.entries, [...prefix, entry.title]);
    }
  }
  for (const {method, params} of blob.events) {
    if (method === 'onProject') visit(params.project.suites, [params.project.name]);
  }
  return titles;
}

function label(ids, titles) {
  const paths = ids.map(id => titles.get(id)).filter(Boolean);
  let common = paths[0] || [];
  for (const title of paths) {
    let size = 0;
    while (size < common.length && common[size] === title[size]) size++;
    common = common.slice(0, size);
  }
  return common.length ? '[' + common[0] + '] > ' + common.slice(1).join(' > ') : ids.join(' ');
}

// Merge suite trees by title, keeping each wanted test once.
function mergeEntries(target, entries, wanted, seen) {
  for (const entry of entries) {
    if ('testId' in entry) {
      if (wanted.has(entry.testId) && !seen.has(entry.testId)) {
        seen.add(entry.testId);
        target.push(entry);
      }
      continue;
    }
    let suite = target.find(e => !('testId' in e) && e.title === entry.title);
    if (!suite) {
      suite = {...entry, entries:[]};
      target.push(suite);
    }
    mergeEntries(suite.entries, entry.entries, wanted, seen);
  }
}

function prune(entries) {
  return entries.flatMap(entry => {
    if ('testId' in entry) return [entry];
    const children = prune(entry.entries);
    return children.length ? [{...entry, entries:children}] : [];
  });
}

/* Write one batch blob from ordered parts {blob, keep:Set of result IDs, globals}. Each kept
   result keeps all of its events; later results of a test count as retries. Global errors
   and output come only from parts with globals. */
function compose(parts, ids, file) {
  const wanted = new Set(ids);
  const projects = new Map();
  const seen = new Set();
  const resources = new Map();
  const retries = new Map();
  const body = [];
  const kept = [];
  const ends = [];
  let metadata;
  let configure;
  let errors = 0;
  for (const part of parts) {
    for (const event of part.blob.events) {
      const {method, params} = event;
      if (method === 'onBlobReportMetadata') metadata = metadata || event;
      else if (method === 'onConfigure') configure = configure || event;
      else if (method === 'onProject') {
        if (!projects.has(params.project.name)) projects.set(params.project.name, {...params.project, suites:[]});
        mergeEntries(projects.get(params.project.name).suites, params.project.suites, wanted, seen);
      } else if (method === 'onEnd') ends.push(params.result);
      else if (method !== 'onBegin' && method !== 'onExit') {
        const id = resultId(event);
        if (id === undefined ? !part.globals : !part.keep.has(id)) continue;
        if (method === 'onTestBegin') {
          const retry = retries.get(params.testId) || 0;
          retries.set(params.testId, retry + 1);
          body.push({method, params:{...params, result:{...params.result, retry}}});
        } else body.push(event);
        if (method === 'onTestEnd')
          kept.push({testId:params.test.testId, status:params.result.status, expected:params.test.expectedStatus});
        if (method === 'onError') errors++;
        for (const attachment of attachmentsOf(params)) {
          const entry = attachment.path && part.blob.entries.get(attachment.path);
          if (entry) resources.set(entry.name, entry);
        }
      }
    }
  }
  assert(metadata && configure, 'Missing blob report metadata for ' + file);
  const done = new Set(kept.filter(settled).map(r => r.testId));
  const start = ends.length ? Math.min(...ends.map(r => r.startTime)) : 0;
  const stop = ends.reduce((end, r) => Math.max(end, r.startTime + r.duration), start);
  const status = errors || kept.some(unexpected) ? 'failed' : ids.every(id => done.has(id)) ? 'passed' : 'interrupted';
  const trees = [...projects.values()].map(project => ({...project, suites:prune(project.suites)}))
    .filter(project => project.suites.length).map(project => ({method:'onProject', params:{project}}));
  const events = [metadata, configure, ...trees, {method:'onBegin'}, ...body,
    {method:'onEnd', params:{result:{status, startTime:start, duration:stop - start}}}];
  const jsonl = Buffer.concat(events.map(event => Buffer.from(JSON.stringify(event) + '\n')));
  writeZip(file, [zipEntry('report.jsonl', jsonl), ...resources.values()]);
  return {kept, errors};
}

function listFiles(dir, files = []) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) listFiles(file, files);
    else if (item.isFile()) files.push(file);
  }
  return files;
}

function pruneFolders(dir) {
  for (const item of fs.readdirSync(dir, {withFileTypes:true}))
    if (item.isDirectory()) pruneFolders(path.join(dir, item.name));
  if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
}

/* Remove the failure contexts (error context, screenshots, traces) of dropped results from
   an attempt's test-results folder. A result's attachments share its output folder, so the
   folder holding the most byte-identical copies of its blob resources is the one to clean. */
function removeContexts(blob, drop, output) {
  if (!drop.size || !output || !fs.existsSync(output)) return;
  const files = listFiles(output);
  const attachments = new Map();
  for (const event of blob.events) {
    const id = resultId(event);
    if (!drop.has(id)) continue;
    for (const attachment of attachmentsOf(event.params)) {
      const entry = attachment.path && blob.entries.get(attachment.path);
      if (entry) attachments.set(id, (attachments.get(id) || []).concat(entry));
    }
  }
  for (const entries of attachments.values()) {
    const folders = new Map();
    for (const entry of entries) {
      let content;
      for (const file of files) {
        const stat = fs.statSync(file, {throwIfNoEntry:false});
        if (!stat || stat.size !== entry.size) continue;
        content = content || unzip(entry);
        if (!fs.readFileSync(file).equals(content)) continue;
        const folder = path.dirname(file);
        folders.set(folder, (folders.get(folder) || []).concat(file));
      }
    }
    const matched = [...folders.values()].sort((a, b) => b.length - a.length)[0] || [];
    for (const file of matched) fs.rmSync(file, {force:true});
  }
  pruneFolders(output);
}

// The timeout and Playwright arguments of one attempt under the 600 second cap.
function attemptArgs(cli, name, workers) {
  return ['--signal=INT', '--kill-after=30s', '600s', process.execPath, cli, 'test', '--last-failed',
    '--workers=' + workers, '--output=test-results/' + name, '--reporter=blob,line'];
}

// One Playwright attempt on the plan's browser workers under the 600 second cap.
function attempt(ids, name, workers) {
  const dir = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP, 'batch-'));
  const filter = path.join(dir, 'cases.json');
  write(filter, {status:'failed', failedTests:ids});
  const cli = path.resolve('node_modules/@playwright/test/cli.js');
  const blob = path.join(dir, 'blob', 'report.zip');
  const result = spawnSync('timeout', attemptArgs(cli, name, workers), {
    stdio:'inherit', env:{...process.env, PLAYWRIGHT_LAST_RUN_OUTPUT_FILE:filter, PLAYWRIGHT_BLOB_OUTPUT_FILE:blob}
  });
  if (result.error) throw result.error;
  // timeout exits 124 after the deadline interrupt and 137 when the later kill was needed.
  return {status:result.status, capped:result.status === 124 || result.status === 137,
    blob:fs.existsSync(blob) ? blob : null, output:path.resolve('test-results', name)};
}

function openBlob(run, name, ids, log) {
  let blob = null;
  if (run.blob) {
    try {
      blob = readBlob(run.blob);
    } catch (error) {
      if (!run.capped) throw error;
      log('::warning::Unreadable blob report from capped attempt ' + name + ': ' + error.message);
    }
  }
  if (blob) assert.deepEqual([...blobTitles(blob).keys()].sort(), [...ids].sort(), 'Unexpected browser selection');
  return blob;
}

/* Run one planned batch. After a capped attempt the finished results stay and only the
   unfinished cases run again, split in halves by fixture scope group until each case
   finishes. A lone group that is still capped is over budget. */
function finish(batch, exec, job, out) {
  const owner = new Map();
  batch.groups.forEach((group, index) => group.forEach(id => owner.set(id, index)));
  const ids = batch.groups.flat();
  const parts = [];
  const titles = new Map();
  function step(groups, name) {
    const requested = groups.flat();
    if (job.expired()) {
      job.attempts.push({name, cases:requested.length, skipped:true});
      return;
    }
    const result = exec(requested, name);
    const blob = openBlob(result, name, requested, job.log);
    const results = blob ? blobResults(blob) : [];
    const done = new Set(results.filter(settled).map(r => r.testId));
    const open = groups.map(group => group.filter(id => !done.has(id))).filter(group => group.length);
    const split = result.capped && open.length > 0 && groups.length > 1;
    job.attempts.push({name, cases:requested.length, status:result.status, capped:result.capped,
      unfinished:open.flat().length});
    if (!result.capped && (result.status !== 0 || !blob)) job.failed = true;
    if (!blob && !result.capped) job.log('::error::Attempt ' + name + ' wrote no blob report.');
    if (blob && result.capped && !open.length)
      job.log('::warning::Attempt ' + name + ' reached the 600 second cap after all of its cases settled.');
    if (blob) {
      blobTitles(blob).forEach((title, id) => titles.set(id, title));
      parts.push({blob, results, requested:new Set(requested), output:result.output, globals:true});
    }
    if (result.capped && open.length && !split) {
      const group = batch.groups[owner.get(open[0][0])];
      job.overBudget.push({batch:batch.name, name:label(group, titles), ids:group, unfinished:open[0]});
    }
    if (!split) return;
    if (open.length === 1) return step(open, name + '-a');
    const half = Math.ceil(open.length / 2);
    step(open.slice(0, half), name + '-a');
    step(open.slice(half), name + '-b');
  }
  step(batch.groups, batch.name);
  // An interrupted result is superseded once a later attempt with a report ran its case.
  const later = new Set();
  for (const part of [...parts].reverse()) {
    const drop = new Set(part.results.filter(r => !settled(r) && later.has(r.testId)).map(r => r.id));
    part.keep = new Set(part.results.filter(r => !drop.has(r.id)).map(r => r.id));
    part.drop = drop.size;
    removeContexts(part.blob, drop, part.output);
    part.requested.forEach(id => later.add(id));
  }
  const file = path.join(out, batch.name + '.zip');
  const summary = {name:batch.name, ids, file, kept:[], errors:0};
  if (parts.length === 1 && !parts[0].drop) {
    fs.copyFileSync(parts[0].blob.file, file);
    summary.kept = blobResults(parts[0].blob);
    summary.errors = parts[0].blob.events.filter(event => event.method === 'onError').length;
  } else if (parts.length) Object.assign(summary, compose(parts, ids, file));
  return summary;
}

// Rerun once, in one extra attempt, each case whose finished results all failed or timed out.
function rerunFailures(batches, exec, job) {
  if (job.expired()) {
    job.attempts.push({name:'rerun', cases:job.rerun.length, skipped:true});
    job.rerunUnfinished = [...job.rerun];
    return;
  }
  const result = exec(job.rerun, 'rerun');
  const blob = openBlob(result, 'rerun', job.rerun, job.log);
  const results = blob ? blobResults(blob) : [];
  const good = results.filter(settled);
  job.attempts.push({name:'rerun', cases:job.rerun.length, status:result.status, capped:result.capped,
    unfinished:job.rerun.length - good.length});
  if (!blob && !result.capped) {
    job.failed = true;
    job.log('::error::The failure rerun wrote no blob report.');
  }
  const finishedIds = new Set(good.map(r => r.testId));
  job.rerunUnfinished = job.rerun.filter(id => !finishedIds.has(id));
  if (!blob) return;
  removeContexts(blob, new Set(results.filter(r => !settled(r)).map(r => r.id)), result.output);
  let globals = true;
  for (const batch of batches) {
    const own = new Set(batch.ids);
    const keep = new Set(good.filter(r => own.has(r.testId)).map(r => r.id));
    if (!keep.size) continue;
    const current = readBlob(batch.file);
    Object.assign(batch, compose([{blob:current, keep:new Set(blobResults(current).map(r => r.id)), globals:true},
      {blob, keep, globals}], batch.ids, batch.file));
    globals = false;
  }
}

/* Run a job's batches, then its failure rerun, and write rolling-job-<job>.json beside the
   batch blobs for the report job. exec(ids, name) runs one attempt and returns
   {status, capped, blob, output}. No attempt starts after options.deadline, so a broken
   run leaves its remaining cases unfinished instead of losing the job to its timeout. */
function runJob(batches, exec, options) {
  const now = options.now || Date.now;
  const log = options.log || console.log;
  const deadline = options.deadline === undefined ? Infinity : options.deadline;
  let warned = false;
  const job = {attempts:[], overBudget:[], rerun:[], rerunUnfinished:[], unfinished:[], failed:false, log,
    expired() {
      if (now() < deadline) return false;
      if (!warned) log('::error::The rolling job deadline passed; remaining attempts did not start.');
      warned = true;
      return true;
    }};
  fs.mkdirSync(options.out, {recursive:true});
  const done = batches.map(batch => finish(batch, exec, job, options.out));
  for (const batch of done) {
    const results = new Map(batch.ids.map(id => [id, []]));
    for (const result of batch.kept) if (results.has(result.testId)) results.get(result.testId).push(result);
    for (const [id, list] of results) {
      const finished = list.filter(r => finishedStatuses.has(r.status));
      if (finished.length && finished.every(r => r.status !== 'passed' && r.status !== r.expected)) job.rerun.push(id);
    }
  }
  if (job.rerun.length) rerunFailures(done, exec, job);
  for (const batch of done) {
    const ok = new Set(batch.kept.filter(settled).map(r => r.testId));
    job.unfinished.push(...batch.ids.filter(id => !ok.has(id)));
  }
  for (const entry of job.overBudget)
    log('::error::Over budget: ' + entry.name + ' (' + entry.batch + ') cannot finish alone within 600 seconds.');
  const passed = !job.failed && !job.overBudget.length && !job.unfinished.length &&
    done.every(batch => !batch.errors && !batch.kept.some(unexpected));
  const summary = {job:options.job, batches:batches.map(b => b.name), passed, attempts:job.attempts,
    overBudget:job.overBudget, rerun:job.rerun, rerunUnfinished:job.rerunUnfinished, unfinished:job.unfinished};
  write(path.join(options.out, 'rolling-job-' + options.job + '.json'), summary);
  log('Rolling job ' + options.job + ': ' + batches.length + ' batches, ' + job.attempts.length + ' attempts, ' +
    job.rerun.length + ' failures rerun, ' + job.overBudget.length + ' over budget, ' + job.unfinished.length + ' unfinished.');
  return summary;
}

function run(planFile, number) {
  const plan = read(planFile);
  const workers = planWorkers(plan);
  const batches = plan.jobs[number - 1].map(index => ({name:'batch-' + (index + 1), groups:plan.batches[index].groups}));
  const options = {out:path.resolve('blob-report'), job:number, deadline:Date.now() + jobDeadlineMs};
  if (workers > 1) console.log('Rolling job ' + number + ' runs ' + workers + ' browser workers per attempt.');
  if (!runJob(batches, (ids, name) => attempt(ids, name, workers), options).passed) process.exitCode = 1;
}

if (require.main === module) {
  if (process.argv[2] === 'learn') {
    const prior = fs.existsSync(historyFile()) ? read(historyFile()) : {};
    write(historyFile(), learn(read(process.argv[3]), prior));
  } else run(process.argv[2], Number(process.argv[3]));
}

module.exports = {makePlan, learn, historyFile, runJob, readBlob, readZip, writeZip, zipEntry, attemptArgs, planWorkers};
