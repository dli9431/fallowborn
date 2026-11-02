'use strict';
const {test,expect} = require('../support/fixture');
const {openTitle} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {nativeSourceFiles} = require('../support/game/bookmark-sources-legacy');

dependsOnRuntime(__filename,['index.html','js/bookmark_sources.js','js/bookmark_composition.js',
  'data/bookmark_sources.js','data/bookmarks.js','data/starts.js','data/geographies.js',
  'data/geography_expansion.js','data/geography_north_atlantic.js','data/settlements.js',
  'data/settlements_real.js','data/religious_institutions.js','data/expeditions_1096.js'].concat(nativeSourceFiles));

async function observeSerialization(page,probe) {
  await page.route('**/js/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    function observe() {
      const stringify = JSON.stringify;
      window.__foundationReads = 0;
      window.__restoreFoundationObserver = function () { JSON.stringify = stringify; };
      JSON.stringify = function (value) {
        if (value === FBDATA.geographies) window.__foundationReads++;
        return stringify.apply(this,arguments);
      };
    }
    await route.fulfill({response:response,body:'(' + observe.toString() + ')();\n' + await response.text()});
  });
  await page.route('**/data/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    await route.fulfill({response:response,body:'(' + probe.toString() + ')();\n' + await response.text() +
      '\nwindow.__restoreFoundationObserver();'});
  });
}

test('unchanged native foundations avoid full JSON scans throughout title boot',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  await observeSerialization(page,function () { window.__nativeFoundationReads = window.__foundationReads; });
  await openTitle(page,info);
  const result = await page.evaluate(function () {
    return {scans:window.__foundationReads,beforeSeal:window.__nativeFoundationReads,
      ready:FB.bookmarkSources.ready(),published:FB.bookmarkSources.hasPublished(),
      dates:FB.bookmarkSources.menuData([]).bookmarks.map(function (row) { return row.id; })};
  });
  expect(result.scans).toBeGreaterThan(0);
  // The old implementation serialized these foundations for every one of
  // the 137 contributors. Genuine shared updates may still need a full scan.
  expect(result.scans).toBeLessThan(10);
  expect(result.scans).toBe(result.beforeSeal);
  expect(result.ready).toBe(true);
  expect(result.published).toBe(false);
  expect(result.dates).toEqual(['476','568','711','800','867','1066','1096','1204','1241']);
});

test('foundation reuse still observes nested public edits and preserves private contributions',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Source interception requires a served origin.');
  await observeSerialization(page,function () {
    const C = FB.bookmarkSources, publicData = FBDATA, publicGeographies = FBDATA.geographies;
    const shared = {value:1}, probe = {nested:shared,alias:shared,list:[1,2],remove:'old'};
    const results = window.__foundationProbe = [];
    let sequence = 0;
    function inspect(label,write) {
      const before = window.__foundationReads;
      C.stage({source:'foundation-probe-' + sequence++,bookmarks:[],catalogs:[]},function (data) {
        if (write) write(data);
        results.push({label:label,scans:window.__foundationReads - before,
          value:JSON.parse(JSON.stringify(data.geographies.__foundationProbe)),
          privateValue:data.geographies.__privateProbe && data.geographies.__privateProbe.value,
          metadata:data.foundationProbeMetadata});
      });
    }
    try {
      FBDATA.geographies.__foundationProbe = probe;
      inspect('initial',function (data) { data.geographies.__privateProbe = {value:'retained'}; });
      inspect('unchanged');
      // Mutate through a second alias, without replacing the root or row.
      probe.alias.value = 2;
      inspect('nested');
      probe.list.push(3);
      inspect('append');
      probe.list[0] = 4;
      inspect('array-edit');
      delete probe.remove; probe.added = 'new';
      inspect('same-key-count');
      FBDATA.foundationProbeMetadata = 'latest';
      inspect('metadata');
      FBDATA.geographies = Object.assign({},FBDATA.geographies);
      inspect('root-replaced');
      window.FBDATA = Object.assign({},FBDATA);
      inspect('data-replaced');
      Object.defineProperty(probe,'accessor',{enumerable:true,configurable:true,get:function () { return 'read'; }});
      inspect('accessor');
      inspect('accessor-unchanged');
      delete probe.accessor;
      inspect('plain-again');
      inspect('plain-unchanged');
    } finally {
      window.FBDATA = publicData; FBDATA.geographies = publicGeographies;
      delete publicGeographies.__foundationProbe; delete FBDATA.foundationProbeMetadata;
      C.stage({source:'foundation-probe-cleanup',bookmarks:[],catalogs:[]},function (data) {
        delete data.geographies.__foundationProbe; delete data.geographies.__privateProbe;
        delete data.foundationProbeMetadata;
      });
    }
  });
  await openTitle(page,info);
  const rows = await page.evaluate(function () { return window.__foundationProbe; });
  const byLabel = Object.fromEntries(rows.map(function (row) { return [row.label,row]; }));
  ['unchanged','metadata','plain-unchanged'].forEach(function (label) { expect(byLabel[label].scans).toBe(0); });
  ['initial','nested','append','array-edit','same-key-count','root-replaced','data-replaced',
    'accessor','accessor-unchanged','plain-again'].forEach(function (label) { expect(byLabel[label].scans).toBe(1); });
  expect(byLabel.nested.value.nested.value).toBe(2);
  expect(byLabel.nested.value.alias.value).toBe(2);
  expect(byLabel.append.value.list).toEqual([1,2,3]);
  expect(byLabel['array-edit'].value.list).toEqual([4,2,3]);
  expect(byLabel['same-key-count'].value.remove).toBeUndefined();
  expect(byLabel['same-key-count'].value.added).toBe('new');
  expect(byLabel.metadata.metadata).toBe('latest');
  expect(byLabel.accessor.value.accessor).toBe('read');
  expect(byLabel['plain-again'].value.accessor).toBeUndefined();
  rows.forEach(function (row) { expect(row.privateValue).toBe('retained'); });
});
