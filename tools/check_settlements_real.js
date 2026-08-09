/* Dev-time data check for data/settlements_real.js (not part of the game or
   the Playwright harness): loads the real data files with a window shim and
   re-runs the same structural checks bookmark validation applies, so a broken
   generation is caught before the owner boots the game.
   Usage: node tools/check_settlements_real.js */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.dirname(__dirname);
const sandbox = { console };
sandbox.window = sandbox;  // window.X = ... creates the global, as in a browser
vm.createContext(sandbox);

for (const file of ['data/counties.js', 'data/map_data.js', 'data/cultures.js',
    'data/technology.js', 'data/bookmarks.js', 'data/settlements.js',
    'data/settlements_real.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), sandbox,
    { filename: file });
}

const FBDATA = sandbox.window.FBDATA;
const faults = [];
const slugRe = /^[a-z0-9]+(_[a-z0-9]+)*$/;

if (!FBDATA || !FBDATA.bookmarks || !FBDATA.settlementSites) {
  console.error('FAIL: data files did not populate FBDATA');
  process.exit(1);
}

let fillSites = 0, fillEntries = 0;
for (const bm of ['867', '1066']) {
  const siteCounty = {};
  for (const pr of FBDATA.bookmarks[bm].provinces) {
    if (!pr.settlements) continue;
    const list = pr.settlements;
    if (list.length > 8) faults.push(bm + ' ' + pr.id + ': over 8 records');
    const names = {}, sites = {};
    let curatedDone = false;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!slugRe.test(e.site)) faults.push(bm + ' ' + pr.id + ': bad slug ' + e.site);
      if (!FBDATA.settlementSites[e.site]) {
        faults.push(bm + ' ' + pr.id + ': missing site ' + e.site);
      }
      if (sites[e.site]) faults.push(bm + ' ' + pr.id + ': repeats site ' + e.site);
      sites[e.site] = 1;
      if (names[e.name]) faults.push(bm + ' ' + pr.id + ': repeats name ' + e.name);
      names[e.name] = 1;
      if (siteCounty[e.site] && siteCounty[e.site] !== pr.id) {
        faults.push(bm + ': site ' + e.site + ' in both ' + siteCounty[e.site] +
          ' and ' + pr.id);
      }
      siteCounty[e.site] = pr.id;
      if (!e.fill && curatedDone) {
        faults.push(bm + ' ' + pr.id + ': curated entry after fill at ' + i);
      }
      if (e.fill) {
        curatedDone = true;
        fillEntries++;
        if (e.kind !== 'village') {
          faults.push(bm + ' ' + pr.id + ': fill kind ' + e.kind + ' at ' + e.site);
        }
      }
      if (i === 0 && e.fill && e.name !== pr.name) {
        faults.push(bm + ' ' + pr.id + ': fill head named ' + e.name);
      }
    }
  }
}

for (const site in FBDATA.settlementSites) {
  if (/^(geo|osm)_/.test(site)) fillSites++;
}

console.log('fill sites: %d, fill entries per bookmark: %d',
  fillSites, Math.round(fillEntries / 2));
if (faults.length) {
  console.error('FAULTS: ' + faults.length);
  for (const f of faults.slice(0, 40)) console.error('  ' + f);
  process.exit(1);
}
console.log('OK: settlements_real data passes structural validation');
