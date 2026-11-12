'use strict';

/* Season timing measurement. Not a regression specification.

   Serves a game checkout, starts every start the catalogue offers (or a
   filtered subset), enables the built-in fast-forward profiler and skips
   season by season with automation resolving events. It records wall and
   simulation time, the slowest profiler rows and counters, and workload
   (player settlements, held counties, armies, characters) for each season.

   Modes:
     node measure/season-timing.js measure --game <dir> --out <file>
       [--seasons 4] [--shard 1/8] [--only <id,id>] [--port 4180]
     node measure/season-timing.js report --in <dir-or-file> --out <file>
       [--summary <file.md>] [--baseline <file>]

   The game runs only in the browser; nothing imports game scripts into Node.
   The served origin is 127.0.0.1, where the profiler is permitted. */

const fs = require('fs');
const http = require('http');
const path = require('path');

const TYPES = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.opus':'audio/ogg', '.ogg':'audio/ogg', '.woff2':'font/woff2',
  '.txt':'text/plain; charset=utf-8', '.md':'text/plain; charset=utf-8'
};
const SEASON_MS_LIMIT = 10 * 60 * 1000;
const FLAG_FLOOR_MS = 2000;

function parseArgs(argv) {
  const out = { _:[] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.indexOf('--') === 0) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.indexOf('--') === 0) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(arg);
  }
  return out;
}

function serve(root, port) {
  const base = path.resolve(root);
  const server = http.createServer(function (request, response) {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname); }
    catch (error) { response.writeHead(400); response.end(); return; }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(base, '.' + pathname);
    const relative = path.relative(base, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) ||
        relative.split(path.sep).some(function (part) { return part.charAt(0) === '.'; })) {
      response.writeHead(404); response.end(); return;
    }
    fs.readFile(file, function (error, body) {
      if (error) { response.writeHead(404); response.end(); return; }
      response.writeHead(200, {
        'Content-Type':TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control':'no-store'
      });
      response.end(body);
    });
  });
  return new Promise(function (resolve, reject) {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', function () { resolve(server); });
  });
}

/* In-page: every scenario on every bookmark it may start in, with the start
   code the ordinary seed input accepts. Mirrors the parity journey's code. */
function enumerateInPage() {
  if (!FB.startProvinceAllowed || !FB.bookmarkRevisions || !FB.provinceCommunities) {
    return { unsupported:true, starts:[] };
  }
  const out = [], bookmarkIds = Object.keys(FBDATA.bookmarks || {}).sort();
  (FBDATA.startScenarios || []).forEach(function (scenario) {
    if (!scenario || !scenario.id) return;
    const ids = scenario.bookmarkIds && scenario.bookmarkIds.length ? scenario.bookmarkIds : bookmarkIds;
    ids.forEach(function (bid) {
      if (!FBDATA.bookmarks[bid]) return;
      let candidates;
      try { candidates = [FB.bookmark(bid)].concat(FB.bookmarkRevisions(bid) || []); }
      catch (error) { return; }
      const bookmark = candidates.find(function (b) {
        return b && (!b.starts || b.starts.indexOf(scenario.id) >= 0) &&
          (b.provinces || []).some(function (p) { return FB.startProvinceAllowed(scenario, b, p.id); });
      });
      if (!bookmark) return;
      // The seed input accepts only starts the date actually offers (main.js scenarioOffered).
      const identity = FB.startIdentity ? FB.startIdentity(scenario, bookmark) : scenario;
      if (FB.startRuntimeReport && !FB.startRuntimeReport(identity, bookmark).available) return;
      const county = bookmark.provinces.find(function (p) {
        return FB.startProvinceAllowed(scenario, bookmark, p.id);
      });
      const declared = FB.provinceCommunities(county).find(function (c) {
        return c.culture === scenario.startCulture && c.religion === scenario.startReligion;
      });
      // The standard preset is always offered; a scenario's own presets name their first.
      const family = scenario.familyPresets ? Object.keys(scenario.familyPresets)[0] : 'standard';
      // The game's startCodeName: hyphens dropped, whitespace to underscores, letters kept.
      const name = (scenario.characterName || 'Measure').replace(/-/g, '').replace(/\s+/g, '_');
      let code = 'MEASURE-' + bid + '-' + scenario.id + '-' + county.id + '-' +
        (scenario.sex === 'f' ? 'f' : 'm') + '-' + name;
      if (declared && (declared.culture !== county.culture || declared.religion !== county.religion)) {
        code += '-' + family + '-0-' + declared.culture + '.' + declared.religion;
      } else if (family !== 'standard') {
        code += '-' + family;
      }
      out.push({ id:bid + ':' + scenario.id, bookmark:bid, scenario:scenario.id,
        revision:bookmark.revision, county:county.id, code:code,
        tier:Number(scenario.tier) || 1, ruler:!!scenario.rulerRealmId, hidden:!!scenario.hidden });
    });
  });
  out.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  return { unsupported:false, starts:out };
}

async function openReady(page, url) {
  await page.goto(url, { waitUntil:'domcontentloaded' });
  await page.locator('#title:not(.hidden)').waitFor({ timeout:90 * 1000 });
  const silent = page.getByRole('button', { name:'Continue silently', exact:true });
  if (await silent.isVisible()) await silent.click();
  await page.waitForFunction(function () {
    return !!(window.FB && FB.game && FB.game.bootReady && FB.ui && FB.save);
  }, null, { timeout:90 * 1000 });
  await page.evaluate(function () {
    return new Promise(function (resolve, reject) {
      if (!FB.game.prepareContent) { resolve(); return; }
      FB.game.prepareContent(function (error) { if (error) reject(error); else resolve(); });
    });
  });
}

async function newContext(browser) {
  return browser.newContext({ viewport:{ width:1280, height:800 }, locale:'en-US', timezoneId:'UTC' });
}

async function enumerate(browser, url) {
  const context = await newContext(browser);
  try {
    const page = await context.newPage();
    await openReady(page, url);
    return Object.assign(await page.evaluate(enumerateInPage), {
      version:await page.evaluate(function () { return FB.VERSION; })
    });
  } finally { await context.close(); }
}

async function beginStart(page, start) {
  await page.evaluate(function (start) {
    const scenario = FBDATA.startScenarios.find(function (s) { return s.id === start.scenario; });
    if (scenario) scenario.hidden = false;
    FBDATA.bookmarks[start.bookmark].hidden = false;
    if (start.revision !== undefined) FBDATA.bookmarks[start.bookmark].revision = start.revision;
    if (FB.startProgression && FB.startProgression.noteTier) {
      FB.startProgression.noteTier(Math.max(3, start.tier || 1));
    }
  }, start);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const seed = page.locator('#ng-seed');
  await seed.fill(start.code);
  await seed.press('Enter');
  const chargen = page.locator('#chargen:not(.hidden)');
  const rejection = page.locator('#ng-seed-err');
  await Promise.race([
    chargen.waitFor({ timeout:90 * 1000 }),
    rejection.filter({ hasText:/\S/ }).waitFor({ timeout:90 * 1000 })
  ]);
  if (!(await chargen.isVisible())) {
    throw new Error('Start code rejected: ' + (await rejection.innerText()).trim());
  }
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click({ timeout:90 * 1000 });
  const begin = page.getByRole('button', { name:'Begin', exact:true });
  await begin.waitFor({ timeout:90 * 1000 });
  await begin.click();
  await page.waitForFunction(function () {
    const modal = document.getElementById('genmodal');
    return !!(FB.state && FB.state.player && modal && modal.classList.contains('hidden'));
  }, null, { timeout:90 * 1000 });
  return page.evaluate(function () {
    FB.game.setPaused(true);
    Object.assign(FB.game.auto, {
      minor:false, major:false, war:false, all:true, style:'first',
      hosts:'manual', hostResupply:true, buySupplies:true, forceSupplies:false,
      supplyTarget:75, build:false, research:false, researchMode:'cheapest'
    });
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    if (FB.state.player.flags) delete FB.state.player.flags.tutorial;
    return FB.game.fastForwardTiming.enable(true);
  });
}

/* One fast-forward burst through the ordinary control. Resolves with the
   profiler report, or a reason when no burst started. */
function burstInPage(limitMs) {
  return new Promise(function (resolve) {
    const G = FB.game, before = G.fastForwardTiming.last, began = Date.now();
    const turn = FB.state.turn;
    let started = false;
    G.skipAhead();
    function poll() {
      if (G.fastForwarding) started = true;
      const last = G.fastForwardTiming.last;
      if (!G.fastForwarding && last && last !== before) {
        resolve({ report:last, turn:FB.state.turn, dead:!!FB.state.player.dead });
        return;
      }
      if (!started && Date.now() - began > 3000) {
        resolve({ report:null, turn:FB.state.turn, dead:!!FB.state.player.dead,
          note:'no burst started' + (FB.state.turn !== turn ? ' (day advanced)' : '') });
        return;
      }
      if (Date.now() - began > limitMs) {
        G.setPaused(true);
        resolve({ report:null, turn:FB.state.turn, dead:!!FB.state.player.dead, note:'timed out' });
        return;
      }
      setTimeout(poll, 25);
    }
    setTimeout(poll, 25);
  });
}

function workloadInPage() {
  const s = FB.state, out = { turn:s.turn };
  const date = s.date || {};
  out.date = (FB.seasonName ? FB.seasonName(date.season) : date.season) + ' ' + date.year;
  function attempt(fn) { try { return fn(); } catch (error) { return null; } }
  out.directSettlements = attempt(function () { return FB.directSettlements(s).length; });
  out.settlementLimit = attempt(function () { return FB.settlementCapacityProjection(s).limit; });
  out.heldCounties = attempt(function () { return FB.realmHeldCounties(s, 'player').length; });
  out.characters = Object.keys(s.chars || {}).length;
  out.realms = Object.keys(s.realms || {}).filter(function (id) { return s.realms[id] && s.realms[id].alive; }).length;
  out.armies = (s.armies || []).length;
  out.activeWars = Object.keys(s.wars || {}).filter(function (id) {
    return s.wars[id] && s.wars[id].status === 'active';
  }).length;
  out.dead = !!(s.player && s.player.dead);
  // Serialized size of each top-level state part, so growth names what grows.
  out.stateSizes = {};
  out.stateBytes = {};
  out.stateBytesUnit = 'UTF-8 bytes';
  out.stateSizesUnit = 'UTF-16 code units';
  out.rng = FB.getRngState();
  out.uid = FB.getUidCounter();
  Object.keys(s).forEach(function (key) {
    try {
      const text = JSON.stringify(s[key] === undefined ? null : s[key]);
      out.stateSizes[key] = text.length;
      out.stateBytes[key] = new TextEncoder().encode(text).length;
    }
    catch (error) { out.stateSizes[key] = -1; }
  });
  return out;
}

function addRows(target, rows) {
  Object.keys(rows || {}).forEach(function (label) {
    const row = rows[label], into = target[label] || (target[label] = { calls:0, totalMs:0, selfMs:0, maxMs:0 });
    into.calls += row.calls; into.totalMs += row.totalMs; into.selfMs += row.selfMs;
    into.maxMs = Math.max(into.maxMs, row.maxMs);
  });
}

function addCounters(target, counters) {
  Object.keys(counters || {}).forEach(function (label) {
    target[label] = (target[label] || 0) + counters[label];
  });
}

function round(value, digits) {
  const scale = Math.pow(10, digits === undefined ? 1 : digits);
  return Math.round(value * scale) / scale;
}

function topRows(rows, count) {
  return Object.keys(rows).map(function (label) {
    const row = rows[label];
    return { label:label, calls:row.calls, selfMs:round(row.selfMs), totalMs:round(row.totalMs),
      maxMs:round(row.maxMs) };
  }).filter(function (row) { return row.label !== 'Simulation (all days)'; })
    .sort(function (a, b) { return b.selfMs - a.selfMs; }).slice(0, count);
}

function topCounters(counters, count) {
  return Object.keys(counters).map(function (label) { return { label:label, count:counters[label] }; })
    .sort(function (a, b) { return b.count - a.count; }).slice(0, count);
}

/* Self time per function from a V8 CPU profile, with each hot function's main callers. */
function profileHotSpots(profile, count) {
  const nodes = new Map(), parent = new Map(), self = new Map();
  (profile.nodes || []).forEach(function (node) {
    nodes.set(node.id, node);
    (node.children || []).forEach(function (child) { parent.set(child, node.id); });
  });
  const samples = profile.samples || [], deltas = profile.timeDeltas || [];
  for (let i = 0; i < samples.length; i++) {
    self.set(samples[i], (self.get(samples[i]) || 0) + (deltas[i] || 0) / 1000);
  }
  function key(frame) {
    const file = String(frame.url || '').replace(/^.*\/(js|data|mods)\//, '$1/').replace(/\?.*$/, '');
    return (frame.functionName || '(anonymous)') + ' ' + (file || '(native)') +
      (frame.url ? ':' + (frame.lineNumber + 1) : '');
  }
  const totals = new Map();
  self.forEach(function (ms, id) {
    const node = nodes.get(id);
    if (!node) return;
    const name = node.callFrame.functionName;
    if (name === '(idle)' || name === '(program)' || name === '(root)') return;
    const k = key(node.callFrame);
    const row = totals.get(k) || { fn:k, selfMs:0, callers:new Map() };
    row.selfMs += ms;
    const up = nodes.get(parent.get(id));
    if (up) {
      const caller = key(up.callFrame);
      row.callers.set(caller, (row.callers.get(caller) || 0) + ms);
    }
    totals.set(k, row);
  });
  return Array.from(totals.values()).sort(function (a, b) { return b.selfMs - a.selfMs; }).slice(0, count)
    .map(function (row) {
      return { fn:row.fn, selfMs:round(row.selfMs), callers:Array.from(row.callers.entries())
        .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3)
        .map(function (entry) { return { fn:entry[0], selfMs:round(entry[1]) }; }) };
    });
}

async function measureStart(browser, url, start, seasons, profileDir) {
  const context = await newContext(browser);
  const result = { id:start.id, bookmark:start.bookmark, scenario:start.scenario,
    ruler:start.ruler, code:start.code, status:'ok', seasons:[], pageErrors:[] };
  try {
    const page = await context.newPage();
    page.on('pageerror', function (error) {
      if (result.pageErrors.length < 5) result.pageErrors.push(String(error && error.message || error));
    });
    await openReady(page, url);
    if (!(await beginStart(page, start))) throw new Error('Profiler unavailable on this origin or build');
    result.start = await page.evaluate(workloadInPage);
    const cdp = profileDir ? await context.newCDPSession(page) : null;
    if (cdp) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval:500 });
    }
    for (let index = 1; index <= seasons; index++) {
      const from = await page.evaluate(workloadInPage);
      const season = { index:index, from:from.date, days:0, bursts:0, elapsedMs:0,
        simulationMs:0, reasons:[], rows:{}, counters:{} };
      if (cdp) await cdp.send('Profiler.start');
      let guard = 0, done = false;
      while (!done && guard++ < 16) {
        const burst = await page.evaluate(burstInPage, SEASON_MS_LIMIT);
        if (!burst.report) {
          season.reasons.push(burst.note);
          result.status = burst.dead ? 'dead' : 'stalled';
          done = true;
          break;
        }
        const report = burst.report;
        season.bursts++;
        season.days += report.days;
        season.elapsedMs += report.elapsedMs;
        season.simulationMs += report.simulationMs;
        season.reasons.push(report.reason);
        addRows(season.rows, report.rows);
        addCounters(season.counters, report.counters);
        if (report.reason === 'error') {
          result.status = 'failed';
          result.error = 'Simulation error during fast-forward' +
            (result.pageErrors.length ? ': ' + result.pageErrors[0] : '');
          done = true;
        } else if (burst.dead) { result.status = 'dead'; done = true; }
        else if (report.reason === 'season' || report.reason === 'stopped') done = true;
        else if (report.days === 0 && season.bursts > 3) { result.status = 'stalled'; done = true; }
      }
      if (cdp) {
        const profile = (await cdp.send('Profiler.stop')).profile;
        const file = start.id.replace(/[^A-Za-z0-9_-]+/g, '-') + '-season' + index + '.cpuprofile';
        fs.mkdirSync(profileDir, { recursive:true });
        fs.writeFileSync(path.join(profileDir, file), JSON.stringify(profile));
        season.cpuProfile = file;
        season.cpuTop = profileHotSpots(profile, 15);
      }
      season.to = (await page.evaluate(workloadInPage));
      season.msPerDay = season.days ? round(season.simulationMs / season.days, 2) : null;
      season.elapsedMs = round(season.elapsedMs);
      season.simulationMs = round(season.simulationMs);
      season.topRows = topRows(season.rows, 12);
      season.topCounters = topCounters(season.counters, 8);
      season.rowSelfMs = {};
      Object.keys(season.rows).forEach(function (label) {
        season.rowSelfMs[label] = round(season.rows[label].selfMs);
      });
      delete season.rows;
      delete season.counters;
      result.seasons.push(season);
      if (result.status !== 'ok') break;
    }
  } catch (error) {
    result.status = 'failed';
    result.error = String(error && error.message || error).split('\n')[0];
  } finally {
    await context.close();
  }
  return result;
}

async function measure(args) {
  const { chromium } = require('@playwright/test');
  const game = path.resolve(args.game || path.join(__dirname, '..', '..', '..'));
  const port = Number(args.port) || 4180;
  const seasons = Math.max(1, Number(args.seasons) || 4);
  const url = 'http://127.0.0.1:' + port + '/';
  const server = await serve(game, port);
  const browser = await chromium.launch();
  const output = { mode:'measure', generated:new Date().toISOString(), seasons:seasons,
    gameCommit:process.env.GAME_COMMIT || null, gameRef:process.env.GAME_REF || null,
    browser:browser.version(), cpuProfile:!!args['cpu-profile'],
    starts:[] };
  try {
    const catalogue = await enumerate(browser, url);
    output.version = catalogue.version;
    output.unsupported = catalogue.unsupported;
    let starts = catalogue.starts;
    if (args.only) {
      const only = String(args.only).split(',').map(function (id) { return id.trim(); }).filter(Boolean);
      starts = starts.filter(function (s) { return only.indexOf(s.id) >= 0; });
      output.notOffered = only.filter(function (id) { return !starts.some(function (s) { return s.id === id; }); });
    }
    output.catalogueSize = starts.length;
    if (args.shard) {
      const parts = String(args.shard).split('/').map(Number);
      starts = starts.filter(function (s, i) { return i % parts[1] === parts[0] - 1; });
      output.shard = args.shard;
    }
    for (const start of starts) {
      const began = Date.now();
      // --cpu-profile records a V8 CPU profile per season; pair it with --only for a few starts.
      const profileDir = args['cpu-profile'] ? path.join(path.dirname(path.resolve(args.out)), 'cpuprofiles') : null;
      const result = await measureStart(browser, url, start, seasons, profileDir);
      result.wallSeconds = round((Date.now() - began) / 1000);
      output.starts.push(result);
      console.log(start.id + ': ' + result.status + ' ' + result.seasons.map(function (s) {
        return (s.simulationMs / 1000).toFixed(1) + 's';
      }).join(' ') + (result.error ? ' ' + result.error : ''));
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive:true });
  fs.writeFileSync(args.out, JSON.stringify(output, null, 1) + '\n');
  if (output.unsupported) console.log('This build has no start enumeration helpers; nothing measured.');
}

function readMeasurements(input) {
  const target = path.resolve(input);
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter(function (f) { return f.endsWith('.json'); }).map(function (f) { return path.join(target, f); })
    : [target];
  const merged = { starts:[], versions:{}, unsupported:false };
  files.forEach(function (file) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.mode !== 'measure') return;
    merged.seasons = data.seasons;
    merged.gameCommit = data.gameCommit;
    merged.gameRef = data.gameRef;
    merged.versions[data.version] = true;
    merged.unsupported = merged.unsupported || !!data.unsupported;
    merged.starts = merged.starts.concat(data.starts);
    if (data.notOffered) merged.notOffered = Array.from(new Set((merged.notOffered || []).concat(data.notOffered)));
  });
  merged.starts.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
  return merged;
}

function median(values) {
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/* Rows whose self time per day grew most between two seasons. */
function rowGrowth(earlier, later, count) {
  const out = [];
  Object.keys(later.rowSelfMs || {}).forEach(function (label) {
    const before = (earlier.rowSelfMs || {})[label] || 0;
    const after = later.rowSelfMs[label];
    const perDayBefore = earlier.days ? before / earlier.days : 0;
    const perDayAfter = later.days ? after / later.days : 0;
    out.push({ label:label, beforeMsPerDay:round(perDayBefore, 2), afterMsPerDay:round(perDayAfter, 2),
      deltaMsPerDay:round(perDayAfter - perDayBefore, 2) });
  });
  return out.sort(function (a, b) { return b.deltaMsPerDay - a.deltaMsPerDay; }).slice(0, count);
}

/* State parts whose serialized size grew most between two workload snapshots. */
function stateGrowth(earlier, later, count) {
  const before = (earlier && earlier.stateSizes) || {}, after = (later && later.stateSizes) || {};
  return Object.keys(after).map(function (key) {
    return { key:key, beforeKb:round((before[key] || 0) / 1024), afterKb:round(after[key] / 1024),
      deltaKb:round((after[key] - (before[key] || 0)) / 1024) };
  }).filter(function (row) { return row.deltaKb > 0; })
    .sort(function (a, b) { return b.deltaKb - a.deltaKb; }).slice(0, count);
}

function analyze(merged, baseline) {
  const flags = [];
  const base = {};
  (baseline ? baseline.starts : []).forEach(function (start) { base[start.id] = start; });
  merged.starts.forEach(function (start) {
    if (start.status === 'failed') {
      flags.push({ start:start.id, kind:'failed', text:start.error || 'failed' });
      return;
    }
    if (start.status === 'stalled') flags.push({ start:start.id, kind:'stalled', text:'fast-forward stalled' });
    const seasons = start.seasons;
    if (start.status === 'dead') {
      const last = seasons[seasons.length - 1];
      flags.push({ start:start.id, kind:'dead', text:'the player died in season ' + (last ? last.index + ' (' + last.from + ')' : '1') +
        ' with automation choosing the first option' });
    }
    const typical = median(seasons.map(function (s) { return s.simulationMs; }));
    seasons.forEach(function (season, i) {
      // Cost per simulated day that keeps rising means growing state or repeated work, not a seasonal pass.
      if (i > 0 && season.msPerDay > 100 && seasons[0].msPerDay && season.msPerDay > 2 * seasons[0].msPerDay) {
        flags.push({ start:start.id, kind:'growth', season:season.index,
          text:'season ' + season.index + ' (' + season.from + ') cost ' + season.msPerDay + ' ms per day against ' +
            seasons[0].msPerDay + ' in season 1',
          growth:rowGrowth(seasons[0], season, 5), state:stateGrowth(start.start, season.to, 5),
          cpu:(season.cpuTop || []).slice(0, 5) });
      }
      if (season.simulationMs > FLAG_FLOOR_MS && typical && season.simulationMs > 2.5 * typical) {
        flags.push({ start:start.id, kind:'spike', season:season.index,
          text:'season ' + season.index + ' (' + season.from + ') took ' + round(season.simulationMs / 1000) +
            's against a typical ' + round(typical / 1000) + 's',
          growth:rowGrowth(seasons[0], season, 5), state:stateGrowth(start.start, season.to, 5),
          cpu:(season.cpuTop || []).slice(0, 5) });
      }
      const yearBefore = seasons[i - 4];
      if (yearBefore && season.simulationMs > FLAG_FLOOR_MS &&
          season.simulationMs > 1.5 * yearBefore.simulationMs) {
        flags.push({ start:start.id, kind:'year-over-year', season:season.index,
          text:'season ' + season.index + ' (' + season.from + ') took ' + round(season.simulationMs / 1000) +
            's against ' + round(yearBefore.simulationMs / 1000) + 's a year earlier',
          growth:rowGrowth(yearBefore, season, 5) });
      }
      const previous = base[start.id] && base[start.id].seasons && base[start.id].seasons[i];
      if (previous && season.simulationMs > FLAG_FLOOR_MS &&
          season.simulationMs > 1.5 * previous.simulationMs) {
        flags.push({ start:start.id, kind:'regression', season:season.index,
          text:'season ' + season.index + ' took ' + round(season.simulationMs / 1000) +
            's against ' + round(previous.simulationMs / 1000) + 's in the baseline run',
          growth:rowGrowth(previous, season, 5) });
      }
    });
  });
  const ranked = merged.starts.filter(function (s) { return s.seasons && s.seasons.length; }).map(function (start) {
    const days = start.seasons.reduce(function (n, s) { return n + s.days; }, 0);
    const ms = start.seasons.reduce(function (n, s) { return n + s.simulationMs; }, 0);
    const last = start.seasons[start.seasons.length - 1];
    return { id:start.id, status:start.status, msPerDay:days ? round(ms / days, 2) : null,
      seasonSeconds:start.seasons.map(function (s) { return round(s.simulationMs / 1000); }),
      directSettlements:last.to && last.to.directSettlements, settlementLimit:last.to && last.to.settlementLimit,
      heldCounties:last.to && last.to.heldCounties, armies:last.to && last.to.armies,
      characters:last.to && last.to.characters };
  }).sort(function (a, b) { return (b.msPerDay || 0) - (a.msPerDay || 0); });
  return { flags:flags, ranked:ranked };
}

function markdown(merged, analysis) {
  const lines = [];
  const statuses = {};
  merged.starts.forEach(function (s) { statuses[s.status] = (statuses[s.status] || 0) + 1; });
  lines.push('## Season timing');
  lines.push('');
  lines.push('Ref ' + (merged.gameRef || '?') + ' at ' + String(merged.gameCommit || '?').slice(0, 8) +
    ', FB.VERSION ' + Object.keys(merged.versions).join(', ') + ', ' + merged.seasons + ' seasons per start. ' +
    'Starts: ' + Object.keys(statuses).map(function (k) { return statuses[k] + ' ' + k; }).join(', ') + '.');
  if (merged.unsupported) lines.push('', 'This build lacks the start enumeration helpers; nothing was measured.');
  if (merged.notOffered && merged.notOffered.length) {
    lines.push('', 'Requested but not offered by this build: ' + merged.notOffered.join(', ') + '.');
  }
  lines.push('');
  lines.push('### Flags');
  lines.push('');
  if (!analysis.flags.length) lines.push('None.');
  analysis.flags.forEach(function (flag) {
    lines.push('- **' + flag.start + '** ' + flag.kind + ': ' + flag.text);
    (flag.growth || []).slice(0, 3).forEach(function (row) {
      lines.push('  - ' + row.label + ': ' + row.beforeMsPerDay + ' to ' + row.afterMsPerDay + ' ms/day');
    });
    if (flag.state && flag.state.length) {
      lines.push('  - state grew: ' + flag.state.map(function (row) {
        return row.key + ' ' + row.beforeKb + ' to ' + row.afterKb + ' KB';
      }).join(', '));
    }
    (flag.cpu || []).slice(0, 3).forEach(function (row) {
      lines.push('  - CPU ' + row.fn + ': ' + row.selfMs + ' ms self' + (row.callers.length ? ', from ' +
        row.callers.map(function (c) { return c.fn + ' (' + c.selfMs + ')'; }).join(', ') : ''));
    });
  });
  lines.push('');
  lines.push('### Slowest starts');
  lines.push('');
  lines.push('| start | ms/day | seasons (s) | direct/limit | counties | armies | chars |');
  lines.push('| --- | ---: | --- | ---: | ---: | ---: | ---: |');
  analysis.ranked.slice(0, 25).forEach(function (row) {
    lines.push('| ' + row.id + ' | ' + row.msPerDay + ' | ' + row.seasonSeconds.join(' / ') + ' | ' +
      (row.directSettlements === null || row.directSettlements === undefined ? '-' :
        row.directSettlements + '/' + row.settlementLimit) + ' | ' +
      (row.heldCounties === null || row.heldCounties === undefined ? '-' : row.heldCounties) + ' | ' +
      row.armies + ' | ' + row.characters + ' |');
  });
  const slowest = analysis.ranked[0] && merged.starts.find(function (s) { return s.id === analysis.ranked[0].id; });
  if (slowest) {
    const season = slowest.seasons.reduce(function (a, b) { return b.simulationMs > a.simulationMs ? b : a; });
    lines.push('');
    lines.push('### Slowest season: ' + slowest.id + ' season ' + season.index + ' (' + season.from + ')');
    lines.push('');
    lines.push('| row | calls | self ms | total ms |');
    lines.push('| --- | ---: | ---: | ---: |');
    season.topRows.forEach(function (row) {
      lines.push('| ' + row.label + ' | ' + row.calls + ' | ' + row.selfMs + ' | ' + row.totalMs + ' |');
    });
    if (season.topCounters.length) {
      lines.push('');
      lines.push('Counters: ' + season.topCounters.map(function (c) { return c.label + ' ' + c.count; }).join(', ') + '.');
    }
    const grew = stateGrowth(slowest.start, season.to, 8);
    if (grew.length) {
      lines.push('');
      lines.push('State growth since the start: ' + grew.map(function (row) {
        return row.key + ' ' + row.beforeKb + ' to ' + row.afterKb + ' KB';
      }).join(', ') + '.');
    }
  }
  const profiled = merged.starts.filter(function (s) { return (s.seasons || []).some(function (x) { return x.cpuTop; }); });
  profiled.forEach(function (start) {
    const season = start.seasons.filter(function (s) { return s.cpuTop; })
      .reduce(function (a, b) { return b.simulationMs > a.simulationMs ? b : a; });
    lines.push('');
    lines.push('### CPU profile: ' + start.id + ' season ' + season.index + ' (' + season.from + ', ' +
      round(season.simulationMs / 1000) + 's, file ' + season.cpuProfile + ')');
    lines.push('');
    lines.push('| function | self ms | main callers |');
    lines.push('| --- | ---: | --- |');
    season.cpuTop.forEach(function (row) {
      lines.push('| ' + row.fn + ' | ' + row.selfMs + ' | ' +
        row.callers.map(function (c) { return c.fn + ' (' + c.selfMs + ')'; }).join('; ') + ' |');
    });
  });
  return lines.join('\n') + '\n';
}

function report(args) {
  const merged = readMeasurements(args.in);
  const baseline = args.baseline && fs.existsSync(args.baseline) ? readMeasurements(args.baseline) : null;
  const analysis = analyze(merged, baseline);
  const output = Object.assign({ mode:'report' }, merged, { flags:analysis.flags, ranked:analysis.ranked });
  delete output.versions;
  output.versions = Object.keys(merged.versions);
  fs.writeFileSync(args.out, JSON.stringify(output, null, 1) + '\n');
  if (args.summary) fs.writeFileSync(args.summary, markdown(merged, analysis));
  analysis.flags.forEach(function (flag) {
    console.log('::warning title=Season timing ' + flag.kind + '::' + flag.start + ': ' + flag.text);
  });
  const failed = merged.starts.filter(function (s) { return s.status === 'failed'; }).length;
  if (merged.starts.length && failed === merged.starts.length) process.exitCode = 1;
}

module.exports = {serve:serve};

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const mode = args._[0];
  if (mode === 'measure') {
    if (!args.out) { console.error('measure needs --out'); process.exit(2); }
    measure(args).catch(function (error) { console.error(error); process.exit(1); });
  } else if (mode === 'report') {
    if (!args.in || !args.out) { console.error('report needs --in and --out'); process.exit(2); }
    report(args);
  } else {
    console.error('Usage: season-timing.js measure|report ...');
    process.exit(2);
  }
}
