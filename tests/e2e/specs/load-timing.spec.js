'use strict';
const {test,expect} = require('../support/fixture');
const {openTitle,targetUrl} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {nativeSourceFiles} = require('../support/game/bookmark-sources-legacy');

dependsOnRuntime(__filename,['index.html','js/main.js','js/world.js','js/bookmark_sources.js',
  'js/bookmark_composition.js','js/mods.js','js/stories.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_modals.js','js/ui_topbar.js','js/ui_panels.js','js/actions.js','js/mapview.js'].concat(nativeSourceFiles));

async function timedTitle(page,info) {
  await page.addInitScript(function () { window.FB_LOAD_TIMING = true; });
  await openTitle(page,info);
  await page.waitForFunction(function () { return FB.game.loadTiming.reports().length === 1; });
}
async function reports(page,count) {
  await page.waitForFunction(function (count) { return FB.game.loadTiming.reports().length >= count; },count);
  return page.evaluate(function () { return FB.game.loadTiming.reports(); });
}
function validReport(report) {
  expect(report.status).toBe('ready');
  expect(report.elapsedMs).toBeGreaterThanOrEqual(report.readyMs);
  expect(report.readyMs).toBeGreaterThanOrEqual(report.measuredWorkMs);
  expect(report.paintWaitMs).toBeGreaterThanOrEqual(0);
  expect(report.unattributedMs).toBeGreaterThanOrEqual(0);
  expect(report.operations.length).toBeGreaterThan(0);
  let exclusive = 0;
  report.operations.forEach(function (row) {
    expect(row.calls).toBeGreaterThan(0);
    expect(row.totalMs).toBeGreaterThanOrEqual(row.selfMs);
    expect(row.totalMs).toBeGreaterThanOrEqual(row.maxMs);
    expect(row.selfMs).toBeGreaterThanOrEqual(0);
    exclusive += row.selfMs;
  });
  expect(Math.abs(exclusive - report.measuredWorkMs)).toBeLessThan(0.1);
  let painted = 0;
  report.paintOperations.forEach(function (row) {
    expect(row.calls).toBeGreaterThan(0);
    expect(row.totalMs).toBeGreaterThanOrEqual(row.selfMs);
    expect(row.totalMs).toBeGreaterThanOrEqual(row.maxMs);
    expect(row.selfMs).toBeGreaterThanOrEqual(0);
    painted += row.selfMs;
  });
  expect(Math.abs(painted - report.measuredPaintWorkMs)).toBeLessThan(0.1);
  expect(report.measuredPaintWorkMs).toBeLessThanOrEqual(report.paintWaitMs);
  expect(Math.abs(report.paintWaitMs - report.measuredPaintWorkMs - report.unattributedPaintMs)).toBeLessThan(0.1);
  expect(report.phases.every(function (row) { return !row.incomplete && row.elapsedMs >= 0; })).toBe(true);
}

test('load timing stays off by default and the URL flag includes initial navigation',async function ({page},info) {
  await openTitle(page,info);
  expect(await page.evaluate(function () {
    return {enabled:FB.game.loadTiming.isEnabled(),reports:FB.game.loadTiming.reports(),current:FB.game.loadTiming.current(),
      startup:FB.bookmarkSources.takeStartupTiming()};
  })).toEqual({enabled:false,reports:[],current:null,startup:null});
  await page.goto(targetUrl(info) + '?loadTiming=1',{waitUntil:'domcontentloaded'});
  const recorded = await reports(page,1);
  validReport(recorded[0]);
  expect(recorded[0].kind).toBe('main-menu');
  expect(recorded[0].phases.map(function (row) { return row.label; })).toEqual([
    'Navigation and initial scripts','Load selected locale','Load deferred interface script',
    'Wait for full stylesheet','Initialize save storage']);
  expect(recorded[0].operations.map(function (row) { return row.label; })).toContain('Synchronize shared source foundations');
  const foundationReads = recorded[0].operations.find(function (row) { return row.label === 'Read changed source foundations'; });
  const foundationSnapshots = recorded[0].operations.find(function (row) { return row.label === 'Snapshot shared source foundations'; });
  expect(foundationReads.calls).toBeGreaterThan(0);
  expect(foundationReads.calls).toBeLessThan(10);
  expect(foundationSnapshots.calls).toBe(foundationReads.calls);
  expect(recorded[0].operations.map(function (row) { return row.label; })).toContain('Seal native source declarations');
  expect(recorded[0].operations.some(function (row) { return row.label.indexOf('Author source data/') === 0; })).toBe(true);
  expect(recorded[0].initialScripts.scriptCount).toBeGreaterThan(0);
  expect(recorded[0].initialScripts.resourceCount).toBeLessThanOrEqual(recorded[0].initialScripts.scriptCount);
  if (info.project.name.endsWith('-served')) expect(recorded[0].initialScripts.resourceCount).toBeGreaterThan(0);
  recorded[0].initialScripts.slowestResources.forEach(function (row) {
    expect(row.path).toMatch(/^(data|js)\//);
    expect(row.durationMs).toBeGreaterThanOrEqual(0);
    expect(row.responseEndMs).toBeGreaterThanOrEqual(row.startMs);
  });
  expect(await page.evaluate(function () { return FB.bookmarkSources.takeStartupTiming(); })).toBe(null);
});

test('menu, bookmark and campaign have separate timings and restore their instrumented functions',async function ({page},info) {
  await timedTitle(page,info);
  await page.evaluate(function () {
    window.__loadFunctions = [FB.stories.compile,FB.validateBookmarkWorld,FB.initPolitics,FB.game.start];
    window.__beforeBookmark = [FB.getRngState(),FB.getUidCounter()];
  });
  await page.locator('#btn-newgame').click();
  await page.locator('[data-bookmark="867"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:30000});
  await reports(page,2);
  expect(await page.evaluate(function () {
    return {current:FB.game.loadTiming.current(),unchanged:JSON.stringify(window.__beforeBookmark) === JSON.stringify([FB.getRngState(),FB.getUidCounter()]),
      restored:window.__loadFunctions.every(function (fn,i) { return fn === [FB.stories.compile,FB.validateBookmarkWorld,FB.initPolitics,FB.game.start][i]; })};
  })).toEqual({current:null,unchanged:true,restored:true});
  await page.locator('[data-scenario="serf"]').click();
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.pickFoundLocation('london',0); });
  await page.locator('#btn-pick-random').click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.locator('#cg-name').fill('Nora');
  await page.locator('#btn-cg-start').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
  const recorded = await reports(page,3);
  expect(recorded.map(function (row) { return row.kind; })).toEqual(['main-menu','bookmark','game']);
  recorded.forEach(validReport);
  recorded.slice(1).forEach(function (report) {
    expect(report.initialScripts).toBeUndefined();
    expect(report.operations.some(function (row) { return row.label.indexOf('Author source ') === 0; })).toBe(false);
  });
  expect(recorded[1].details.bookmarkId).toBe('867');
  expect(recorded[1].operations.some(function (row) { return row.label === 'Compile story catalogue'; })).toBe(true);
  expect(recorded[1].operations.some(function (row) { return row.label === 'Map: Compile settlements'; })).toBe(true);
  expect(recorded[2].details.entry).toBe('new-campaign');
  expect(recorded[2].operations.some(function (row) { return row.label === 'Assemble source envelopes'; })).toBe(false);
  expect(recorded[2].phases.map(function (row) { return row.label; })).toContain('Prepare campaign content 867');
  expect(recorded[2].phases.some(function (row) { return row.label === 'Publish all source catalogues'; })).toBe(false);
  expect(recorded[2].operations.some(function (row) { return row.label === 'Create campaign'; })).toBe(true);
  expect(recorded[2].paintOperations.some(function (row) { return row.label === 'Render interface'; })).toBe(true);
  expect(recorded[2].paintOperations.some(function (row) { return row.label === 'Render map'; })).toBe(true);
  expect(recorded[2].paintOperations.some(function (row) { return row.label === 'Render panel: actions'; })).toBe(true);
  expect(recorded[2].paintOperations.some(function (row) { return row.label === 'List visible deeds'; })).toBe(true);
  expect(recorded[2].paintOperations.some(function (row) { return row.label.indexOf('Deed visibility: ') === 0; })).toBe(true);
  expect(await page.evaluate(function () {
    return {current:FB.game.loadTiming.current(),restored:window.__loadFunctions.every(function (fn,i) {
      return fn === [FB.stories.compile,FB.validateBookmarkWorld,FB.initPolitics,FB.game.start][i];
    })};
  })).toEqual({current:null,restored:true});
});

test('Quick Start and a saved game each finish one game-load report',async function ({page},info) {
  await timedTitle(page,info);
  await page.locator('#btn-newgame').click();
  await page.locator('[data-quick-start="osric_867"]').click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
  const quick = (await reports(page,2))[1];
  validReport(quick);
  expect(quick).toMatchObject({kind:'game',details:{entry:'quick-start',bookmarkId:'867'}});
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.ui.closeModal();
    return new Promise(function (resolve,reject) {
      FB.save.toSlot('auto',function (ok) { if (ok) resolve(); else reject(new Error('Save failed')); });
    });
  });
  await page.evaluate(function () { FB.game.loadSlot('auto'); });
  const saved = (await reports(page,3))[2];
  validReport(saved);
  expect(saved).toMatchObject({kind:'game',details:{entry:'saved-game'}});
  expect(saved.operations.some(function (row) { return row.label === 'Restore saved state'; })).toBe(true);
  expect(await page.evaluate(function () { return FB.game.loadTiming.current(); })).toBeNull();
});

test('a preparation exception records failure and restores wrappers without changing RNG or identities',async function ({page},info) {
  await timedTitle(page,info);
  await page.evaluate(function () {
    FB.bookmarkCompositions.prepareSource = function () { throw new Error('Load timing failure probe'); };
    window.__failedReview = FB.bookmarkCompositions.prepareSource;
    window.__failedCompile = FB.stories.compile;
    window.__failedState = [FB.getRngState(),FB.getUidCounter()];
  });
  await page.locator('#btn-newgame').click();
  await page.locator('[data-quick-start="osric_867"]').click();
  await expect(page.locator('#genmodal:not(.hidden)')).toContainText('Load timing failure probe');
  const failed = (await reports(page,2))[1];
  expect(failed).toMatchObject({kind:'game',status:'error',error:'Load timing failure probe'});
  expect(await page.evaluate(function () {
    return {current:FB.game.loadTiming.current(),state:FB.state,
      restored:FB.bookmarkCompositions.prepareSource === window.__failedReview && FB.stories.compile === window.__failedCompile,
      unchanged:JSON.stringify(window.__failedState) === JSON.stringify([FB.getRngState(),FB.getUidCounter()])};
  })).toEqual({current:null,state:null,restored:true,unchanged:true});
});
