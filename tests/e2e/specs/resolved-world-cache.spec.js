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
  'js/model.js', 'js/authority.js', 'js/politics.js', 'data/systems.js',
  'data/eras.js', 'data/political_institutions.js',
  'js/main.js', 'js/save.js', 'js/save_v4.js', 'data/bookmarks.js']);
const oracle = path.resolve(__dirname, '../fixtures/resolved-world-cache/uncached-bookmark.js');
const proofMod = fs.readFileSync(path.resolve(__dirname, '../fixtures/authoring/revision-ruler-government-estuary.json'), 'utf8');

test('availability revalidates same-turn world mutations and exact revision failures against the uncached resolver',
  async function ({ page }, info) {
    await openGame(page, info);
    await page.addScriptTag({path:oracle});
    const cases = await page.evaluate(function () {
      const live = FBDATA, lookup = FB.bookmark, active = FB.activeBookmark;
      const installedData = JSON.stringify(live);
      let base = {id:'e2e_availability_cache', name:'Availability', era:'early_medieval',
        revision:'current', systems:{}, opening:'first', openingRevisions:{first:{actors:[]}},
        revisions:{baseline:{localInstitutions:{}}, current:{hidden:false}}};
      let s = {start:{id:base.id, revision:'current'}, realms:{}, faiths:{}};
      window.FBDATA = Object.assign({}, live, {bookmarks:Object.assign({}, live.bookmarks, {[base.id]:base})});
      FB.activeBookmark = FB.bookmark('476');
      const cases = [];
      function check(label, error, system) {
        // Check the edited declaration per read and the entire installed data
        // before/after the sequence, without encoding unrelated worlds per edit.
        const catalogue = FBDATA, table = catalogue.bookmarks;
        const fields = Object.keys(catalogue), values = fields.map(function (key) { return catalogue[key]; });
        const ids = Object.keys(table), definitions = ids.map(function (key) { return table[key]; });
        const before = JSON.stringify([table[base.id], s]), rng = FB.getRngState(), uid = FB.getUidCounter();
        function outcome(resolver) {
          let calls = 0;
          FB.bookmark = function (id, revision) {
            calls++;
            const world = resolver(id, revision);
            return world ? Object.freeze(world) : world;
          };
          try {
            const available = FB.systemAvailable(s, system || 'royal_council');
            return {value:JSON.stringify({available:available, world:FB.campaignBookmark(s),
              institutions:FB.localInstitutionDefinitions(s)})};
          } catch (fault) { return {error:fault.name + ': ' + fault.message, calls:calls}; }
          finally { FB.bookmark = lookup; }
        }
        const actual = outcome(lookup), expected = outcome(uncachedBookmark);
        if (JSON.stringify(actual) !== JSON.stringify(expected))
          throw new Error(label + ': resolver parity ' + JSON.stringify([actual, expected]));
        if (error && actual.error !== error) throw new Error(label + ': wrong error ' + actual.error);
        if (!error && actual.error) throw new Error(label + ': ' + actual.error);
        if (system === 'e2e_missing_system' && actual.calls !== 0)
          throw new Error(label + ': resolved before checking system id');
        const afterFields = Object.keys(FBDATA), afterIds = Object.keys(FBDATA.bookmarks);
        if (FBDATA !== catalogue || fields.length !== afterFields.length || ids.length !== afterIds.length ||
            fields.some(function (key, i) { return key !== afterFields[i] || FBDATA[key] !== values[i]; }) ||
            ids.some(function (key, i) { return key !== afterIds[i] || FBDATA.bookmarks[key] !== definitions[i]; }) ||
            before !== JSON.stringify([table[base.id], s]) || rng !== FB.getRngState() || uid !== FB.getUidCounter())
          throw new Error(label + ': mutated inputs');
        cases.push(label);
        return actual;
      }
      function edit(label, change, error) { change(); return check(label, error); }
      try {
        check('opening'); check('same-turn repeated query');
        edit('root field changed', function () { base.name = 'Changed'; });
        edit('root field added', function () { base.extra = 1; });
        edit('root field removed', function () { delete base.extra; });
        edit('root order changed', function () { const value = base.name; delete base.name; base.name = value; });
        edit('baseline value changed', function () { base.revisions.baseline.hidden = true; });
        edit('baseline field removed', function () { delete base.revisions.baseline.hidden; });
        edit('selected field added', function () { base.revisions.current.localInstitutions = {}; });
        edit('selected order changed', function () {
          const value = base.revisions.current.hidden; delete base.revisions.current.hidden; base.revisions.current.hidden = value;
        });
        edit('selected layer replaced', function () { base.revisions.current = {localInstitutions:{}, hidden:true}; });
        edit('baseline layer replaced', function () { base.revisions.baseline = {opening:'first'}; });
        edit('revision table replaced', function () { base.revisions = {baseline:{}, current:{hidden:false}}; });
        edit('missing local institutions inherit', function () { delete base.localInstitutions; });
        edit('empty local institutions replace fallback', function () { base.localInstitutions = {}; });
        edit('nested definitions changed', function () {
          base.localInstitutions.e2e_office = {freshOnly:true};
          base.realms = [{id:'e2e_realm', religion:'catholic'}];
        });
        edit('nested definition membership changed', function () { base.localInstitutions.e2e_office.freshOnly = false; });
        edit('nested realm religion changed', function () { base.realms[0].religion = 'sunni'; });
        edit('opening alias replaced', function () { base.openingRevisions.first = {actors:[], version:2}; });
        edit('nested opening actor changed', function () { base.openingRevisions.first.actors.push({id:'e2e_actor'}); });
        edit('opening alias removed', function () { delete base.openingRevisions.first; }, 'Error: Unknown opening revision: first');
        edit('opening alias restored', function () { base.openingRevisions.first = {actors:[]}; });
        edit('bookmark disables system', function () { base.systems.royal_council = false; });
        edit('nested system override changed', function () { base.systems.royal_council = true; });
        edit('system override removed', function () { delete base.systems.royal_council; });
        edit('system layer replaced', function () { base.systems = {disable:['royal_council']}; });
        edit('nested system list changed', function () { base.systems.disable.pop(); });
        base.greatHolyWars = false; check('legacy false', undefined, 'great_holy_wars');
        base.greatHolyWars = true; check('legacy true', undefined, 'great_holy_wars');
        edit('new fresh revision', function () { base.revisions.next = {hidden:true}; base.revision = 'next'; });
        edit('campaign selects retained revision', function () { s.start.revision = 'baseline'; });
        edit('campaign selects new revision', function () { s.start.revision = 'next'; });
        edit('missing saved stamp selects baseline', function () { delete s.start.revision; });
        edit('saved stamp changed back', function () { s.start.revision = 'current'; });
        edit('unselected malformed revision stays unvisited', function () { base.revisions.next.badField = true; });
        edit('selected illegal field', function () { base.revisions.current.badField = true; }, 'Error: Invalid world revision field: badField');
        edit('selected illegal field repaired', function () { delete base.revisions.current.badField; });
        [null, 1, {}, '', 'INVALID', 'absent'].forEach(function (revision) {
          s.start.revision = revision;
          check('malformed selector ' + JSON.stringify(revision), revision === 'absent'
            ? 'Error: Unknown world revision: absent' : 'Error: Invalid world revision.');
        });
        s.start.revision = 'current';
        [null, [], 1].forEach(function (layer) {
          base.revisions.current = layer;
          check('malformed selected layer ' + JSON.stringify(layer), 'Error: Unknown world revision: current');
        });
        delete base.revisions.current; check('missing selected layer', 'Error: Unknown world revision: current');
        Object.setPrototypeOf(base.revisions, {current:{}});
        check('inherited selected layer', 'Error: Unknown world revision: current');
        Object.setPrototypeOf(base.revisions, Object.prototype);
        base.revisions.current = {};
        [null, [], 1].forEach(function (layer) {
          base.revisions.baseline = layer;
          check('malformed baseline layer ' + JSON.stringify(layer), 'Error: Unknown world revision: current');
        });
        delete base.revisions.baseline; check('missing baseline layer', 'Error: Unknown world revision: current');
        Object.setPrototypeOf(base.revisions, {baseline:{}});
        check('inherited baseline layer', 'Error: Unknown world revision: current');
        Object.setPrototypeOf(base.revisions, Object.prototype); base.revisions.baseline = {};
        base.revisions = []; check('malformed revision catalogue', 'Error: Unknown world revision: current');
        base.revisions = {baseline:{}, current:{}};
        edit('bookmark definition replaced', function () {
          base = Object.assign({}, base, {name:'Replacement'}); FBDATA.bookmarks[base.id] = base;
        });
        edit('bookmark table replaced', function () { FBDATA.bookmarks = Object.assign({}, FBDATA.bookmarks); });
        edit('catalogue root replaced', function () { window.FBDATA = Object.assign({}, FBDATA); });
        const installed = FBDATA;
        edit('temporary catalogue scope', function () {
          const staged = Object.assign({}, base, {systems:{royal_council:false}});
          window.FBDATA = Object.assign({}, FBDATA, {bookmarks:{[base.id]:staged}});
        });
        edit('installed catalogue restored', function () { window.FBDATA = installed; });
        edit('state replaced', function () { s = JSON.parse(JSON.stringify(s)); });
        edit('saved bookmark changed', function () { s.start = {id:'476'}; });
        edit('saved bookmark changed back', function () { s.start = {id:base.id, revision:'current'}; });
        edit('campaign world removed', function () { delete FBDATA.bookmarks[base.id]; });
        s.start.revision = 'INVALID'; check('missing world ignores bad revision');
        FBDATA.bookmarks[base.id] = base;
        check('unknown id precedes malformed revision', 'Error: Unknown system e2e_missing_system.', 'e2e_missing_system');
        if (installedData !== JSON.stringify(live)) throw new Error('Availability changed the installed catalogue');
        return cases;
      } finally { window.FBDATA = live; FB.bookmark = lookup; FB.activeBookmark = active; }
    });
    expect(cases.length).toBeGreaterThan(60);
  });

test('availability follows staged JSON validation, installed replacement and ordinary mod removal',
  async function ({ page }, info) {
    await openGame(page, info);
    await page.addScriptTag({path:oracle});
    const result = await page.evaluate(function (text) {
      const mod = JSON.parse(text), id = Object.keys(mod.bookmarks)[0], lookup = FB.bookmark;
      const state = {start:{id:id, revision:'constitution'}, realms:{}, faiths:{}};
      const answers = [];
      function compare(label) {
        const value = FB.systemAvailable(state, 'royal_council');
        FB.bookmark = uncachedBookmark;
        let expected;
        try { expected = FB.systemAvailable(state, 'royal_council'); }
        finally { FB.bookmark = lookup; }
        if (value !== expected) throw new Error(label + ': availability differs');
        answers.push(value);
      }
      compare('before import');
      const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const faults = FB.mods.validate(JSON.parse(text));
      compare('after detached validation');
      const invalid = JSON.parse(text);
      invalid.bookmarks[id].revisions.constitution.badField = true;
      const rejected = FB.mods.validate(invalid);
      compare('after rejected validation');
      const pure = data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
      mod.bookmarks[id].systems = {royal_council:false};
      FB.mods.apply(JSON.parse(JSON.stringify(mod))); compare('installed disable');
      mod.bookmarks[id].systems.royal_council = true;
      FB.mods.apply(JSON.parse(JSON.stringify(mod))); compare('installed replacement');
      localStorage.setItem(FB.storageKey('fb_mods'), JSON.stringify([JSON.stringify(mod)]));
      return {id:id, answers:answers, faults:faults, rejected:rejected, pure:pure};
    }, proofMod);
    expect(result.faults).toEqual([]);
    expect(result.rejected.length).toBeGreaterThan(0);
    expect(result.pure).toBe(true);
    expect(result.answers.slice(0, 3)).toEqual([result.answers[0], result.answers[0], result.answers[0]]);
    expect(result.answers.slice(3)).toEqual([false, true]);
    await page.reload();
    await prepareGameContent(page);
    expect(await page.evaluate(id => FB.systemAvailable({start:{id:id, revision:'constitution'}}, 'royal_council'), result.id)).toBe(true);
    await Promise.all([page.waitForEvent('load'), page.evaluate(function () { FB.mods.removeAt(0); })]);
    await prepareGameContent(page);
    expect(await page.evaluate(id => FB.bookmark(id), result.id)).toBeNull();
    await page.addScriptTag({path:oracle});
    expect(await page.evaluate(function (id) {
      const state = {start:{id:id, revision:'constitution'}}, lookup = FB.bookmark;
      const value = FB.systemAvailable(state, 'royal_council');
      FB.bookmark = uncachedBookmark;
      try { return value === FB.systemAvailable(state, 'royal_council'); }
      finally { FB.bookmark = lookup; }
    }, result.id)).toBe(true);
  });

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
