'use strict';
const path = require('path');
const fs = require('fs');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { openGame, openTitle, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { injectBrowserHarness } = require('../support/game/browser-harness');

dependsOnRuntime(__filename, ['js/world.js', 'js/systems.js', 'js/mods.js',
  'js/bookmark_composition.js', 'js/bookmark_sources.js', 'js/title_ids.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'data/bookmarks.js']);
const oracle = path.resolve(__dirname, '../fixtures/resolved-world-cache/uncached-bookmark.js');
const proofMod = fs.readFileSync(path.resolve(__dirname, '../fixtures/authoring/revision-ruler-government-estuary.json'), 'utf8');

test('resolved worlds reuse exact inputs and preserve revision errors and detached scopes', async function ({ page }, info) {
  await openGame(page, info);
  await page.addScriptTag({ path:oracle });
  const result = await page.evaluate(function () {
    const live = FBDATA, checks = [];
    const base = { id:'cache_probe', revision:'current', name:'Probe', opening:'first',
      openingRevisions:{first:{actors:[]}}, revisions:{baseline:{}, current:{hidden:false}} };
    FBDATA.bookmarks.cache_probe = base;
    function compare(revision) {
      function outcome(fn) {
        try { return JSON.stringify(fn('cache_probe', revision)); }
        catch (error) { return 'error:' + error.message; }
      }
      checks.push(outcome(FB.bookmark) === outcome(uncachedBookmark));
    }
    function changed(edit) {
      const before = FB.bookmark(base.id);
      edit(); compare(); checks.push(FB.bookmark(base.id) !== before);
    }
    compare();
    const first = FB.bookmark(base.id);
    checks.push(first === FB.bookmark(base.id));
    checks.push(FB.campaignBookmark({start:{id:base.id,revision:'current'}}) ===
      FB.bookmark(base.id,'current'));
    checks.push(FB.campaignBookmark({start:{id:base.id}}) === FB.bookmark(base.id,'baseline'));
    changed(function () { base.name = 'Changed'; });
    changed(function () { const name = base.name; delete base.name; base.name = name; });
    changed(function () { base.revisions.current.hidden = true; });
    changed(function () { delete base.revisions.current.hidden; });
    changed(function () { base.revisions.baseline.hidden = false; });
    changed(function () { base.openingRevisions.first = {actors:[], version:2}; });
    changed(function () { base.revisions.current = {hidden:true}; });
    changed(function () { base.revisions = {baseline:{}, current:{hidden:false}}; });
    changed(function () { base.revisions.next = {hidden:true}; base.revision = 'next'; });
    changed(function () { base.revision = 'current'; });
    [null, 1, {}, '', 'INVALID', 'missing', 'baseline', 'current'].forEach(compare);
    base.revisions.current.badField = true; compare(); delete base.revisions.current.badField;
    delete base.openingRevisions.first; compare(); base.openingRevisions.first = {actors:[]};
    base.opening = ''; base.openingRevisions[''] = {actors:[]}; compare();
    delete base.openingRevisions['']; compare(); base.opening = 'first';
    compare();
    const baseline = base.revisions.baseline;
    Object.setPrototypeOf(base.revisions, {baseline:baseline});
    delete base.revisions.baseline; compare();
    Object.setPrototypeOf(base.revisions, Object.prototype); base.revisions.baseline = baseline;
    const installed = FB.bookmark(base.id);
    window.FBDATA = Object.assign({}, live, {bookmarks:Object.assign({}, live.bookmarks)});
    const staged = FB.bookmark(base.id);
    checks.push(staged !== installed && staged === FB.bookmark(base.id));
    window.FBDATA = live;
    checks.push(FB.bookmark(base.id) !== staged);
    changed(function () { FBDATA.bookmarks = Object.assign({}, FBDATA.bookmarks); });
    changed(function () { FBDATA.bookmarks[base.id] = Object.assign({}, base, {name:'Replacement'}); });
    checks.push(FB.bookmark('missing_cache_probe', 'INVALID') === null);
    delete FBDATA.bookmarks.cache_probe;
    return checks;
  });
  expect(result.every(Boolean), JSON.stringify(result)).toBe(true);
});

test('JSON mod application, detached validation, and removal resolve the installed catalogue', async function ({ page }, info) {
  await openGame(page, info);
  const before = await page.evaluate(function (text) {
    const candidate = JSON.parse(text), id = Object.keys(candidate.bookmarks)[0];
    const replacement = candidate.bookmarks[id], world = FB.bookmark(id);
    replacement.name = 'Cache import';
    const mod = JSON.stringify(candidate);
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.mods.validate(JSON.parse(mod));
    const pure = data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.mods.apply(JSON.parse(mod));
    const installed = FB.bookmark(id);
    replacement.name = 'Cache replacement';
    const updatedMod = JSON.stringify(candidate);
    FB.mods.apply(JSON.parse(updatedMod));
    const updated = FB.bookmark(id);
    localStorage.setItem(FB.storageKey('fb_mods'), JSON.stringify([updatedMod]));
    return {id:id, original:world, faults:faults, pure:pure,
      replaced:installed !== world, installed:installed.name,
      reused:updated === FB.bookmark(id), updated:updated.name, replacedAgain:updated !== installed};
  }, proofMod);
  expect(before.original).toBe(null);
  expect(before.faults).toEqual([]);
  expect(before.pure).toBe(true);
  expect(before.replaced).toBe(true);
  expect(before.reused).toBe(true);
  expect(before.installed).toBe('Cache import');
  expect(before.updated).toBe('Cache replacement');
  expect(before.replacedAgain).toBe(true);
  await page.reload();
  await prepareGameContent(page);
  expect(await page.evaluate(id => FB.bookmark(id).name, before.id)).toBe('Cache replacement');
  await Promise.all([page.waitForEvent('load'), page.evaluate(function () { FB.mods.removeAt(0); })]);
  await prepareGameContent(page);
  expect(await page.evaluate(id => FB.bookmark(id), before.id)).toBe(null);
});

async function campaign(page, info, cached) {
  await openTitle(page, info);
  await page.addScriptTag({ path:oracle });
  await page.evaluate(function (cached) {
    const lookup = cached ? FB.bookmark : uncachedBookmark;
    // Fail immediately if any consumer writes a formerly disposable wrapper.
    FB.bookmark = function (id, revision) {
      const world = lookup(id, revision);
      return world ? Object.freeze(world) : world;
    };
  }, cached);
  await startDeterministicGame(page);
  await injectBrowserHarness(page);
  return page.evaluate(async function () {
    FB.game.setPaused(true);
    function freeze(value, seen) {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value); Object.keys(value).forEach(key => freeze(value[key], seen)); Object.freeze(value);
    }
    freeze(FB.campaignBookmark(FB.state), new Set());
    freeze(FB.activeBookmark, new Set());
    async function digest(value) {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      const hash = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(hash)).map(n => n.toString(16).padStart(2,'0')).join('');
    }
    async function snapshot() {
      return {save:FB.save.serialize(), data:await digest(FBDATA),
        revisions:await digest(FB.bookmarkRevisions(FB.state.start.id)),
        signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FB.campaignBookmark(FB.state)),
        rng:FB.getRngState(), uid:FB.getUidCounter()};
    }
    const worlds = JSON.stringify([FB.campaignBookmark(FB.state), FB.activeBookmark]);
    const snapshots = [await snapshot()];
    const passDay = FB.game.passDay;
    FB.game.passDay = function () { return passDay.call(FB.game, {deferUi:true}); };
    try {
      for (const days of [30, 60]) {
        FBTEST.advanceDays({days:days,maxDays:days,maxEvents:100,maxInterruptions:0,checkEvery:15,style:'first'});
        snapshots.push(await snapshot());
      }
    } finally { FB.game.passDay = passDay; }
    return {snapshots:snapshots, unchanged:worlds === JSON.stringify([FB.campaignBookmark(FB.state), FB.activeBookmark])};
  });
}

test('the determinism canary and 90 daily decisions match the uncached resolver with read-only worlds', async function ({ page }, info) {
  const cached = await campaign(page, info, true);
  const uncached = await campaign(page, info, false);
  expect(cached.unchanged).toBe(true);
  expect(uncached.unchanged).toBe(true);
  expect(cached.snapshots).toEqual(uncached.snapshots);
});
