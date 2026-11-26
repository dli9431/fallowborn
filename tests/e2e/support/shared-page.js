'use strict';

/* One booted page shared by the cases of a describe scope.

   describeSharedPage(title, {boot}, body) declares a describe group whose cases
   receive one page booted once per scope, in the shape of the existing
   test.beforeAll files: one browser context created in beforeAll with its own
   page guards, run in order on one worker (mode default), closed in afterAll.
   The group's page fixture is that shared page, so case bodies keep their
   ({ page }) signature and spec beforeEach hooks receive the same page.

   boot(page, testInfo) runs on the blank page of a new context. It may add init
   scripts or routes, store mods before the first boot, open the title, prepare
   content and activate a bookmark (activateBookmark below). The booted page,
   after its focus and pointer are settled, is the baseline. Cases that begin a
   campaign need a boot that activates that campaign's bookmark, because the
   reset can return to an active bookmark but not to none. An optional context
   object is passed to browser.newContext; an optional reset(page, testInfo)
   first undoes scenario-local edits the steps below do not know.

   Before every case, including the first, the page is reset to that baseline:
   1. Open dialogs are closed through the game's own modal stack, and phone
      back-navigation layers are popped through history to depth 0.
   2. Save slots that appeared are deleted through FB.save.deleteSaves.
   3. A live or observed campaign is discarded and the game returns to its title
      (FB.state is cleared first, so no autosave or chronicle is written).
   4. Review flags the start helpers set on the catalogue (bookmark hidden and
      revision, start scenario hidden) return to their booted values.
   5. The booted bookmark is activated again through FB.activateBookmark, which
      reinstalls its world fields, events, caches and cached world, and every
      top-level FBDATA.balance value returns to its booted value.
   6. The in-memory interface and automation preferences, localStorage and
      sessionStorage return to their booted contents; changed keys are announced
      with storage events, so storage-backed memory such as start progression
      follows.
   7. Focus, document scroll, the viewport, the pointer position, the RNG and the
      identity counter return to their booted values.
   The reset is then checked: pageFacts must equal the baseline. The facts are
   the URL, viewport, visible screens and dialogs, focus, scroll, body and root
   classes, root style, back-navigation depth, document language, campaign, content and pause flags, the mod
   signature, the catalogue object and a digest of every FBDATA key, the active
   bookmark and world, save slots, chronicle, start progression, preferences,
   both storage areas, the RNG and the identity counter.

   A reset that cannot reach the baseline (for example an event dialog the game
   only closes through its choices), a case that navigated, reloaded,
   opened another page, added a route or exposed a binding, a failed case and a
   closed page all replace the context with a newly booted one, and that page
   must then match the baseline too. The replacement is recorded as a
   "shared page" annotation on the case it preceded. A case therefore always
   begins on the booted baseline, whatever ran before it, and passes alone or in
   any order. Browser contract faults are checked per case. State outside these
   facts (closures, timers, module caches) is not compared, so only cases that
   pass alone on a fresh page and use the game's ordinary player paths belong in
   a shared scope; docs/TESTS.md lists when a spec must keep fresh pages. */

const { test, expect } = require('./fixture');
const { installPageGuards } = require('./page-contract');
const { attachPageDiagnostic } = require('./game-diagnostic');

const sharedPages = new WeakSet();

function isSharedPage(page) {
  return sharedPages.has(page);
}

// Activates a prepared bookmark through the game's one world switcher.
async function activateBookmark(page, id, revision) {
  await page.evaluate(function (input) {
    return new Promise(function (resolve, reject) {
      FB.activateBookmark(input.id, null, function (error) {
        if (error) reject(error); else resolve();
      }, input.revision ? { revision:input.revision } : undefined);
    });
  }, { id:id, revision:revision || null });
}

// Runs in the page. Plain JSON facts that a reset must restore exactly.
function pageFacts() {
  function digest(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16) + ':' + text.length;
  }
  function serialized(value) {
    try {
      const text = JSON.stringify(value);
      return digest(text === undefined ? 'undefined' : text);
    } catch (error) {
      return 'unserializable';
    }
  }
  function area(storage) {
    const out = {};
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        out[key] = digest(String(storage.getItem(key)));
      }
    } catch (error) {
      return 'unavailable';
    }
    return out;
  }
  function shown(element) { return !element.classList.contains('hidden'); }
  const F = window.FB || null, G = F && F.game, booted = window.__fbSharedPage || {};
  const screens = {};
  Array.from(document.querySelectorAll('#app > .screen, #game, #genmodal, #eventmodal')).forEach(function (element) {
    screens[element.id] = shown(element);
  });
  const focus = document.activeElement && document.activeElement !== document.body
    ? document.activeElement.tagName + '#' + document.activeElement.id : 'body';
  const data = {};
  if (window.FBDATA) Object.keys(FBDATA).sort().forEach(function (key) { data[key] = serialized(FBDATA[key]); });
  const save = F && F.save;
  return {
    screens:screens,
    focus:focus,
    scroll:[window.scrollX, window.scrollY],
    bodyClass:document.body.className,
    root:[document.documentElement.className, document.documentElement.getAttribute('style')],
    navigation:window.history.state && window.history.state.fallowbornNav ? window.history.state.depth || 0 : 0,
    lang:document.documentElement.lang,
    game:G ? {
      state:F.state ? 'live' : null,
      bootReady:!!G.bootReady,
      contentReady:!!G.contentReady,
      paused:!!G.paused,
      observe:!!G.observe,
      pickMode:!!G.pickMode
    } : null,
    mods:F && F.mods && F.mods.sig ? { count:F.mods.count(), signature:F.mods.sig() } : null,
    catalogue:!window.FBDATA ? null : FBDATA === booted.catalogue ? 'booted' : 'replaced',
    data:data,
    active:F ? {
      id:F.activeBookmarkId || null,
      revision:F.activeBookmark && F.activeBookmark.revision !== undefined ? F.activeBookmark.revision : null,
      geography:F.activeGeographyId || null,
      era:F.activeEra || null,
      world:!F.world ? null : F.world === booted.world ? 'booted' : 'other'
    } : null,
    saves:save && save.hasSlot ? ['auto', 1, 2, 3].filter(function (slot) { return save.hasSlot(slot); }) : null,
    chronicle:save && save.recentChronicle ? !!save.recentChronicle() : null,
    progression:F && F.startProgression ? F.startProgression.snapshot() : null,
    uiPrefs:G ? serialized(G.uiPrefs) : null,
    automation:G ? serialized(G.auto) : null,
    localStorage:area(window.localStorage),
    sessionStorage:area(window.sessionStorage),
    rng:F && F.getRngState ? F.getRngState() >>> 0 : null,
    uid:F && F.getUidCounter ? F.getUidCounter() : null
  };
}

// Runs in the page. Marks the catalogue, world and balance table the boot produced.
function markBooted() {
  window.__fbSharedPage = { catalogue:window.FBDATA, world:window.FB && FB.world,
    balance:window.FBDATA && FBDATA.balance ? Object.assign({}, FBDATA.balance) : null };
}

// Runs in the page after boot. Records what the reset restores.
function captureBaseline() {
  const F = window.FB || null, G = F && F.game;
  function entries(storage) {
    const out = [];
    try {
      for (let i = 0; i < storage.length; i++) out.push([storage.key(i), storage.getItem(storage.key(i))]);
    } catch (error) { return null; }
    return out;
  }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  const bookmarks = {}, scenarios = [];
  if (window.FBDATA && FBDATA.bookmarks) Object.keys(FBDATA.bookmarks).forEach(function (id) {
    const row = FBDATA.bookmarks[id];
    if (!row || typeof row !== 'object') return;
    bookmarks[id] = {
      hidden:own(row, 'hidden') ? [row.hidden] : [],
      revision:own(row, 'revision') ? [row.revision] : []
    };
  });
  if (window.FBDATA && Array.isArray(FBDATA.startScenarios)) FBDATA.startScenarios.forEach(function (row) {
    scenarios.push(row && own(row, 'hidden') ? [row.hidden] : []);
  });
  return {
    local:entries(window.localStorage),
    session:entries(window.sessionStorage),
    uiPrefs:G && G.uiPrefs ? JSON.stringify(G.uiPrefs) : null,
    automation:G && G.auto ? JSON.stringify(G.auto) : null,
    bookmarks:bookmarks,
    scenarios:scenarios,
    active:F && F.activeBookmarkId ? {
      id:F.activeBookmarkId,
      revision:F.activeBookmark && F.activeBookmark.revision !== undefined ? F.activeBookmark.revision : null
    } : null,
    saves:F && F.save && F.save.hasSlot ? ['auto', 1, 2, 3].some(function (slot) { return F.save.hasSlot(slot); }) : false,
    scroll:[window.scrollX, window.scrollY],
    rng:F && F.getRngState ? F.getRngState() >>> 0 : null,
    uid:F && F.getUidCounter ? F.getUidCounter() : null
  };
}

// Runs in the page before every case. Returns to the captured baseline.
async function resetToBaseline(saved) {
  const F = window.FB || null, G = F && F.game;
  function shown(id) {
    const element = document.getElementById(id);
    return !!element && !element.classList.contains('hidden');
  }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function settle() { return new Promise(function (resolve) { setTimeout(resolve, 0); }); }
  function navigationDepth() {
    const state = window.history.state;
    return state && state.fallowbornNav ? state.depth || 0 : 0;
  }
  // Bounded wait for a page condition, one animation frame at a time.
  function frames(ready, count) {
    return new Promise(function (resolve) {
      (function step() {
        if (ready() || count-- <= 0) resolve();
        else requestAnimationFrame(step);
      })();
    });
  }
  function atTop() { return navigationDepth() === 0; }
  function restoreField(row, key, value) {
    if (value.length) row[key] = value[0];
    else if (own(row, key)) delete row[key];
  }
  function replaceObject(target, json) {
    if (!target || json === null) return;
    Object.keys(target).forEach(function (key) { delete target[key]; });
    Object.assign(target, JSON.parse(json));
  }
  function restoreArea(storage, rows) {
    if (!rows) return [];
    const before = {}, after = {}, changed = [];
    for (let i = 0; i < storage.length; i++) before[storage.key(i)] = storage.getItem(storage.key(i));
    storage.clear();
    rows.forEach(function (row) { storage.setItem(row[0], row[1]); after[row[0]] = row[1]; });
    Object.keys(before).concat(Object.keys(after)).forEach(function (key) {
      const old = own(before, key) ? before[key] : null, value = own(after, key) ? after[key] : null;
      if (old !== value && changed.every(function (row) { return row.key !== key; }))
        changed.push({ key:key, oldValue:old, newValue:value, storageArea:storage });
    });
    return changed;
  }
  if (!F || !G) return;
  const booted = window.__fbSharedPage || {};
  // A dialog closes while its campaign still exists, then its deferred work runs.
  let closed = false;
  for (let i = 0; i < 6 && shown('genmodal') && F.ui; i++) {
    if (F.ui.closeModalStack) F.ui.closeModalStack(); else F.ui.closeModal();
    closed = true;
  }
  if (closed) await settle();
  /* Phone layouts keep back-navigation layers in history. Closing a dialog
     requests its Back; any layer still open is popped through history while
     its campaign exists, so the game's own handler closes it. */
  if (!atTop()) await frames(atTop, 30);
  if (!atTop()) {
    window.history.go(-navigationDepth());
    await frames(atTop, 60);
  }
  const live = !!F.state || !!G.observe || !shown('title');
  if (live) G.paused = true;
  // Saves go first, so the title the game redraws below offers no Continue.
  if (!saved.saves && F.save && F.save.hasSlot && F.save.deleteSaves &&
      ['auto', 1, 2, 3].some(function (slot) { return F.save.hasSlot(slot); })) {
    await new Promise(function (resolve) { F.save.deleteSaves('all', resolve); });
  }
  if (live && G.toTitle) {
    F.state = null;
    G.toTitle();
    await settle();
  }
  if (window.FBDATA === booted.catalogue && FBDATA.bookmarks) Object.keys(saved.bookmarks).forEach(function (id) {
    const row = FBDATA.bookmarks[id];
    if (!row || typeof row !== 'object') return;
    restoreField(row, 'hidden', saved.bookmarks[id].hidden);
    restoreField(row, 'revision', saved.bookmarks[id].revision);
  });
  if (window.FBDATA === booted.catalogue && Array.isArray(FBDATA.startScenarios) &&
      FBDATA.startScenarios.length === saved.scenarios.length) FBDATA.startScenarios.forEach(function (row, index) {
    if (row && typeof row === 'object') restoreField(row, 'hidden', saved.scenarios[index]);
  });
  if (saved.active && F.activateBookmark && window.FBDATA === booted.catalogue &&
      (live || F.activeBookmarkId !== saved.active.id || F.world !== booted.world)) {
    await new Promise(function (resolve, reject) {
      F.activateBookmark(saved.active.id, null, function (error) {
        if (error) reject(error); else resolve();
      }, saved.active.revision !== null ? { revision:saved.active.revision } : undefined);
    });
  }
  // Cases tune single balance values; the activation above recomposed its layers.
  if (booted.balance && window.FBDATA === booted.catalogue && FBDATA.balance) {
    Object.keys(FBDATA.balance).forEach(function (key) { if (!own(booted.balance, key)) delete FBDATA.balance[key]; });
    Object.keys(booted.balance).forEach(function (key) {
      if (FBDATA.balance[key] !== booted.balance[key]) FBDATA.balance[key] = booted.balance[key];
    });
  }
  replaceObject(G.uiPrefs, saved.uiPrefs);
  replaceObject(G.auto, saved.automation);
  const changed = restoreArea(window.localStorage, saved.local).concat(restoreArea(window.sessionStorage, saved.session));
  changed.forEach(function (row) {
    window.dispatchEvent(new StorageEvent('storage', { key:row.key, oldValue:row.oldValue, newValue:row.newValue,
      storageArea:row.storageArea, url:location.href }));
  });
  if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur)
    document.activeElement.blur();
  window.scrollTo(saved.scroll[0], saved.scroll[1]);
  if (saved.rng !== null && F.setRngState) F.setRngState(saved.rng);
  if (saved.uid !== null && F.setUidCounter) F.setUidCounter(saved.uid);
}

function differences(actual, expected, prefix, out) {
  out = out || [];
  if (JSON.stringify(actual) === JSON.stringify(expected)) return out;
  const plain = function (value) { return value && typeof value === 'object' && !Array.isArray(value); };
  if (!plain(actual) || !plain(expected) || prefix.split('.').length > 2) {
    out.push(prefix || 'page');
    return out;
  }
  Object.keys(Object.assign({}, expected, actual)).forEach(function (key) {
    differences(actual[key], expected[key], prefix ? prefix + '.' + key : key, out);
  });
  return out;
}

class SharedPage {
  constructor(options) {
    if (!options || typeof options.boot !== 'function') throw new Error('describeSharedPage needs a boot function');
    if (options.reset !== undefined && typeof options.reset !== 'function') throw new Error('describeSharedPage reset must be a function');
    this.options = options;
    this.context = null;
    this.page = null;
    this.guard = null;
    this.checked = 0;
    this.dirty = null;
    this.saved = null;
    this.baseline = null;
  }

  async open(browser, testInfo) {
    const context = await browser.newContext(this.options.context || {});
    const page = await context.newPage();
    const scope = this;
    let ready = false;
    this.context = context;
    this.page = page;
    this.guard = installPageGuards(page);
    this.checked = 0;
    this.dirty = null;
    // A replaced page's late events never mark its successor.
    function mark(reason) { if (ready && scope.page === page && !scope.dirty) scope.dirty = reason; }
    page.on('domcontentloaded', function () { mark('a case loaded a document'); });
    page.on('close', function () { mark('the page closed'); });
    page.on('crash', function () { mark('the page crashed'); });
    context.on('page', function () { mark('a case opened another page'); });
    [[page, 'page'], [context, 'context']].forEach(function (pair) {
      ['route', 'routeFromHAR', 'exposeFunction', 'exposeBinding'].forEach(function (name) {
        const original = pair[0][name];
        if (typeof original !== 'function') return;
        pair[0][name] = function () {
          mark('a case called ' + pair[1] + '.' + name);
          return original.apply(pair[0], arguments);
        };
      });
    });
    await this.options.boot(page, testInfo);
    await this.settle();
    ready = true;
    sharedPages.add(page);
  }

  // Focus and pointer start from fixed places, so hover and focus cannot carry over.
  async settle() {
    await this.page.mouse.move(0, 0);
    await this.page.evaluate(function () {
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur)
        document.activeElement.blur();
      return new Promise(function (resolve) {
        requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(resolve, 0); }); });
      });
    });
  }

  async facts() {
    return Object.assign({ url:this.page.url(), viewport:this.page.viewportSize() }, await this.page.evaluate(pageFacts));
  }

  async start(browser, testInfo) {
    await this.open(browser, testInfo);
    await this.page.evaluate(markBooted);
    this.saved = Object.assign(await this.page.evaluate(captureBaseline), { viewport:this.page.viewportSize() });
    this.baseline = await this.facts();
  }

  async replace(browser, testInfo, reason) {
    testInfo.annotations.push({ type:'shared page', description:'booted a new page: ' + reason });
    const old = this.context;
    this.context = null;
    if (old) await old.close().catch(function () {});
    await this.open(browser, testInfo);
    // The new boot's catalogue, world and balance are its booted ones; the rest is restored.
    await this.page.evaluate(markBooted);
    await this.page.evaluate(resetToBaseline, this.saved);
    if (this.saved.viewport) await this.page.setViewportSize(this.saved.viewport);
    await this.settle();
  }

  async reset(browser, testInfo) {
    let facts = null;
    if (!this.dirty && this.page && !this.page.isClosed()) {
      try {
        if (this.options.reset) await this.options.reset(this.page, testInfo);
        await this.page.evaluate(resetToBaseline, this.saved);
        const viewport = this.page.viewportSize();
        if (this.saved.viewport && JSON.stringify(viewport) !== JSON.stringify(this.saved.viewport))
          await this.page.setViewportSize(this.saved.viewport);
        await this.settle();
        facts = await this.facts();
        const changed = differences(facts, this.baseline, '');
        if (changed.length) this.dirty = 'the reset left ' + changed.join(', ');
      } catch (error) {
        this.dirty = 'the reset failed: ' + String(error && error.message || error).split('\n')[0];
      }
    }
    if (this.dirty || !this.page || this.page.isClosed()) {
      await this.replace(browser, testInfo, this.dirty || 'the page closed');
      facts = await this.facts();
    }
    this.checked = this.guard.faults.length;
    expect(facts, 'shared page reset to its booted baseline').toEqual(this.baseline);
  }

  async finish(testInfo) {
    const faults = this.guard.faults.slice(this.checked);
    this.checked = this.guard.faults.length;
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed) this.dirty = this.dirty || 'the previous case failed';
    if (failed || faults.length) await attachPageDiagnostic(this.page, testInfo, 'game-state');
    expect(faults, 'browser contract faults').toEqual([]);
  }

  async close() {
    const context = this.context;
    this.context = null;
    if (!context) return;
    try {
      expect(this.guard.faults.slice(this.checked), 'browser contract faults').toEqual([]);
    } finally {
      await context.close();
    }
  }
}

/* Declares a describe group that shares one booted page. body declares the
   cases; they use the ordinary page fixture, which is the shared page. */
function describeSharedPage(title, options, body) {
  test.describe(title, function () {
    test.describe.configure({ mode:'default' });
    const scope = new SharedPage(options);
    test.beforeAll(async function ({ browser }, testInfo) {
      await scope.start(browser, testInfo);
    });
    test.afterAll(async function () {
      await scope.close();
    });
    test.use({
      page:async function ({ browser }, use, testInfo) {
        await scope.reset(browser, testInfo);
        await use(scope.page);
        await scope.finish(testInfo);
      }
    });
    body();
  });
}

module.exports = {
  describeSharedPage:describeSharedPage,
  isSharedPage:isSharedPage,
  activateBookmark:activateBookmark
};
