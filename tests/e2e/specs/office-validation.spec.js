'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const source = fs.readFileSync(path.resolve(__dirname, '../../../js/model.js'), 'utf8');
const reference = fs.readFileSync(path.resolve(__dirname, '../fixtures/religious-office-tables/validation-reference.txt'), 'utf8');
const prior = source.slice(0, source.indexOf('  let officeGraph =')) + reference + source.slice(source.indexOf('  /* Local sees'));

dependsOnRuntime(__filename, ['js/model.js', 'js/world.js', 'js/systems.js', 'js/religious_institutions.js',
  'js/authority.js', 'js/government_ecclesiastical.js', 'js/papacy.js', 'js/religion.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js']);

async function route(page, old, both) {
  await page.unroute('**/js/model.js');
  let text = old ? prior : source;
  if (both) {
    const oracle = reference.replace(/\bofficeGraph\b/g, 'priorOfficeGraph')
      .replace(/\bofficeDefinitions\b/g, 'priorOfficeDefinitions').replace(/\blocalOfficeCache\b/g, 'priorOfficeCache')
      .replace(/\blocalOfficeInputs\b/g, 'priorOfficeInputs').replace(/\blocalOfficeTable\b/g, 'priorOfficeTable')
      .replace(/\breligiousOfficeDefinitions\b/g, 'priorOffices').replace(/\bwithLocalReligiousOffices\b/g, 'priorLocalOffices');
    text = text.replace('  /* Local sees', oracle + '\n  FB.officeValidationReference = priorOffices;\n  /* Local sees');
  }
  await page.route('**/js/model.js', function (request) { return request.fulfill({contentType:'application/javascript', body:text}); });
}

function installCounts() {
  window.measureOfficeKeys = function (fn) {
    const stringify = JSON.stringify, counts = {builds:0, chars:0};
    JSON.stringify = function (value) {
      const result = stringify.apply(this, arguments);
      if (Array.isArray(value) && value.length === 11 && value[3] === FBDATA.systems && Array.isArray(value[10])) {
        counts.builds++; counts.chars += result.length;
      }
      return result;
    };
    let error = null;
    try { fn(); } catch (e) { error = e.message; }
    finally { JSON.stringify = stringify; }
    return {counts:counts, error:error};
  };
}

async function snapshot(page) {
  return page.evaluate(async function () {
    async function hash(text) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    const s = FB.state, offices = FB.religiousOffices(s), holders = {};
    Object.keys(offices).forEach(function (id) { const holder = FB.religiousOfficeSnapshot(s, id, offices); holders[id] = holder && holder.id || null; });
    return {state:await hash(JSON.stringify(s)), save:await hash(FB.save.serialize()), data:await hash(JSON.stringify(FBDATA)),
      offices:offices, holders:holders, rng:FB.getRngState(), uid:FB.getUidCounter(), signature:FB.mods.sig(),
      fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))};
  });
}

for (const bookmark of ['476', '1096', '1204']) {
  test('office validation preserves parent state and removes repeated key serialization in ' + bookmark, async function ({page}, info) {
    const outputs = [], evidence = [];
    for (const old of [true, false]) {
      await route(page, old, false);
      await beginBookmark(page, info, bookmark);
      await page.evaluate(installCounts);
      const states = [], counts = [];
      for (const phase of ['ordinary', 'season', 'year']) {
        const result = await page.evaluate(function (phase) {
          const s = FB.state;
          if (phase !== 'ordinary') {
            const season = phase === 'year' ? 3 : s.date.season;
            s.turn += (season - s.date.season) * 90 + 90 - s.date.day;
            s.date.season = season; s.date.day = 90;
          }
          const turn = s.turn;
          const result = measureOfficeKeys(function () { FB.game.passDay({deferUi:true}); });
          result.days = s.turn - turn;
          return result;
        }, phase);
        expect(result.error, phase).toBe(null);
        expect(result.days, phase).toBe(1);
        counts.push(result.counts); states.push(await snapshot(page));
      }
      outputs.push(states); evidence.push(counts);
    }
    expect(outputs[1]).toEqual(outputs[0]);
    for (let i = 0; i < 3; i++) {
      expect(evidence[1][i].builds).toBeLessThan(evidence[0][i].builds);
      expect(evidence[1][i].chars).toBeLessThan(evidence[0][i].chars);
    }
    console.log('OFFICE_VALIDATION_KEYS ' + JSON.stringify({bookmark:bookmark, reference:evidence[0], candidate:evidence[1]}));
    await info.attach('office-key-counts', {body:JSON.stringify({bookmark:bookmark, reference:evidence[0], candidate:evidence[1]}), contentType:'application/json'});
  });
}

test('office validation observes nested edits, JSON key ordering, identity switches and errors', async function ({page}, info) {
  await route(page, false, true);
  await beginBookmark(page, info, '476');
  await page.evaluate(installCounts);
  const result = await page.evaluate(function () {
    const s = FB.state, dataBefore = JSON.stringify(FBDATA), stateBefore = JSON.stringify(s);
    const rng = FB.getRngState(), uid = FB.getUidCounter(), checks = [];
    function read(fn) { let value = null, error = null; try { value = fn(s); } catch (e) { error = e.message; } return {value:value, error:error}; }
    function compare(name) {
      const current = read(FB.religiousOffices), prior = read(FB.officeValidationReference);
      if (current.error !== prior.error || JSON.stringify(current.value) !== JSON.stringify(prior.value)) throw new Error('Parity: ' + name);
      checks.push(name);
      return current.error;
    }
    function edit(name, object, key, value) {
      compare('before-' + name);
      const current = FB.religiousOffices(s), prior = FB.officeValidationReference(s);
      const present = Object.prototype.hasOwnProperty.call(object,key), saved = object[key];
      try {
        object[key] = value;
        const error = compare(name);
        if (!error && (current === FB.religiousOffices(s)) !== (prior === FB.officeValidationReference(s))) throw new Error('Cache identity: ' + name);
      } finally { if (present) object[key] = saved; else delete object[key]; }
      compare('restored-' + name);
    }
    compare('initial');
    const warm = measureOfficeKeys(function () { for (let i = 0; i < 20; i++) FB.religiousOffices(s); });
    const original = measureOfficeKeys(function () { for (let i = 0; i < 20; i++) FB.officeValidationReference(s); });
    const bm = FB.campaignBookmark(s), local = FB.localInstitutionDefinitions(s);
    const id = Object.keys(local).find(function (id) { return !!local[id].officeId; }), def = local[id];
    edit('office-id', def, 'officeId', def.officeId + '_other');
    edit('office-religion', def, 'religion', 'orthodox');
    edit('office-system', def, 'officeSystem', null);
    edit('nested-office-profile', def, 'officeProfile', {minAge:31, nested:{ordered:[1,null,{active:true}]}});
    const profile = def.officeProfile;
    def.officeProfile = {minAge:18, nested:{items:[1,2]}};
    try {
      compare('profile-base');
      edit('nested-array-value', def.officeProfile.nested.items, 1, 3);
      edit('nested-new-key', def.officeProfile.nested, 'added', {value:true});
      def.officeProfile.nested.order = {first:1, second:2};
      try { edit('object-key-order', def.officeProfile.nested, 'order', {second:2, first:1}); }
      finally { delete def.officeProfile.nested.order; }
      edit('undefined-array-value', def.officeProfile.nested.items, 1, undefined);
      edit('nonfinite-array-value', def.officeProfile.nested.items, 1, NaN);
      edit('undefined-object-value', def.officeProfile.nested, 'omitted', undefined);
      edit('json-conversion', def.officeProfile.nested, 'conversion', {toJSON:function () { return {value:2}; }});
      const cycle = {}; cycle.self = cycle;
      edit('cyclic-error', def.officeProfile.nested, 'cycle', cycle);
      compare('after-error');
    } finally { if (profile === undefined) delete def.officeProfile; else def.officeProfile = profile; }
    edit('fresh-only', def, 'freshOnly', true);
    const fresh = def.freshOnly, ledger = s.localInstitutions;
    def.freshOnly = true;
    try {
      s.localInstitutions = Object.assign({}, ledger);
      delete s.localInstitutions[id]; compare('fresh-absent');
      edit('fresh-presence', s.localInstitutions, id, ledger[id] || {});
    } finally { s.localInstitutions = ledger; if (fresh === undefined) delete def.freshOnly; else def.freshOnly = fresh; }
    const profiles = FBDATA.religiousInstitutionProfiles;
    profiles.validation_profile = {period:{yearMin:s.date.year,yearMax:null}, system:'episcopal_sees',
      selection:{roleId:'leader',strategy:'appointment'}, roles:{leader:{minAge:18}}};
    local.validation_row = {officeId:'validation_office', profileId:'validation_profile', religion:def.religion};
    try {
      compare('profile-row-added');
      edit('profile-period', profiles.validation_profile.period, 'yearMax', s.date.year - 1);
      edit('profile-system', profiles.validation_profile, 'system', null);
      edit('profile-min-age', profiles.validation_profile.roles.leader, 'minAge', 27);
      edit('profile-strategy', profiles.validation_profile.selection, 'strategy', 'election');
      edit('profile-id', local.validation_row, 'profileId', null);
    } finally { delete local.validation_row; delete profiles.validation_profile; }
    compare('profile-row-removed');
    edit('system-default', FBDATA.systems.episcopal_sees, 'defaultEnabled', !FBDATA.systems.episcopal_sees.defaultEnabled);
    const era = FBDATA.eras[FB.campaignEra(s)], formId = s.start.defaultGovernment || era.defaultGovernment;
    edit('era-systems', era, 'systems', {disable:['episcopal_sees']});
    edit('form-systems', FBDATA.governmentForms[formId], 'systems', {enable:['episcopal_sees']});
    edit('system-layer', bm, 'systems', {enable:['episcopal_sees']});
    const savedSystems = bm.systems;
    bm.systems = Object.assign({}, savedSystems, {enable:['episcopal_sees']});
    try {
      compare('enable-base');
      edit('nested-system-list', bm.systems.enable, 0, 'public_offices');
    } finally { if (savedSystems === undefined) delete bm.systems; else bm.systems = savedSystems; }
    edit('great-holy-wars', bm, 'greatHolyWars', !bm.greatHolyWars);
    edit('realm-faith', bm.realms[0], 'religion', 'orthodox');
    edit('province-faith', bm.provinces[0], 'religion', 'orthodox');
    edit('political-office-key', bm.religiousHeads, 'validation_demo_office', 'validation_demo_realm');
    edit('turn', s, 'turn', s.turn + 1);
    edit('date', s.date, 'day', s.date.day + 1);
    const installed = FBDATA;
    try { window.FBDATA = Object.assign({}, installed); compare('detached-catalogue'); }
    finally { window.FBDATA = installed; }
    compare('installed-again');
    const detached = JSON.parse(JSON.stringify(s));
    if (JSON.stringify(FB.religiousOffices(detached)) !== JSON.stringify(FB.officeValidationReference(detached))) throw new Error('Detached state');
    compare('state-again');
    const holderId = Object.keys(s.religiousHeads).find(function (id) { return !!s.religiousHeads[id]; });
    const table = FB.religiousOffices(s), holder = s.religiousHeads[holderId];
    try {
      s.religiousHeads[holderId] = null;
      if (table !== FB.religiousOffices(s) || FB.religiousOfficeSnapshot(s,holderId) !== null) throw new Error('Live holder');
    } finally { s.religiousHeads[holderId] = holder; }
    compare('final');
    return {checks:checks, warm:warm, reference:original, pure:dataBefore === JSON.stringify(FBDATA) && stateBefore === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.warm.error).toBe(null);
  expect(result.warm.counts.builds).toBe(0);
  expect(result.reference.counts.builds).toBe(20);
  expect(result.pure).toBe(true);
  await info.attach('office-validation-mutations', {body:JSON.stringify(result),contentType:'application/json'});
});

for (const config of ['estuary', 'southern']) {
  test('office validation preserves ordinary JSON import, rejection and restore for ' + config, async function ({page}, info) {
    const mod = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../fixtures/political-religious-head/' + config + '.json'), 'utf8'));
      await route(page, false, true);
      await openGame(page, info);
      expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
      await page.evaluate(function () { FB.ui.showMods(); });
      await page.locator('#modfile').setInputFiles({name:'office-validation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
      await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
      await prepareGameContent(page);
      await beginBookmarkFromTitle(page, Object.keys(mod.bookmarks)[0], mod.startScenarios[0].id);
      async function compareImported() {
        return page.evaluate(function () {
          const s = FB.state, before = JSON.stringify(s), data = JSON.stringify(FBDATA), save = FB.save.serialize();
          const rng = FB.getRngState(), uid = FB.getUidCounter();
          const current = FB.religiousOffices(s), prior = FB.officeValidationReference(s);
          if (JSON.stringify(current) !== JSON.stringify(prior)) throw new Error('Imported table parity');
          Object.keys(prior).forEach(function (id) {
            const a = FB.religiousOfficeSnapshot(s,id,current), b = FB.religiousOfficeSnapshot(s,id,prior);
            if ((a && a.id) !== (b && b.id)) throw new Error('Imported holder parity');
          });
          return {pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && save === FB.save.serialize() &&
            rng === FB.getRngState() && uid === FB.getUidCounter(), offices:current, rng:rng >>> 0, uid:uid,
            signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))};
        });
      }
      const initial = await compareImported();
      expect(initial.pure).toBe(true);
      const rejected = await page.evaluate(function (mod) {
        const before = JSON.stringify([FB.state,FBDATA,localStorage]), rng = FB.getRngState(), uid = FB.getUidCounter();
        mod.religions = {invalid:{head:{officeId:42}}};
        return FB.mods.store(JSON.stringify(mod)) === false && before === JSON.stringify([FB.state,FBDATA,localStorage]) && rng === FB.getRngState() && uid === FB.getUidCounter();
      }, mod);
      expect(rejected).toBe(true);
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      await restoreBookmark(page, saved);
      expect(await compareImported()).toEqual(initial);
  });
}
