'use strict';
const { test, expect } = require('../support/fixture');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { baseline, current, original, snapshot } = require('../support/game/religious-office-tables');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/model.js', 'js/institutions.js', 'js/politics.js',
  'js/religious_institutions.js', 'js/systems.js', 'js/government_ecclesiastical.js',
  'js/government_selection.js', 'js/papacy.js', 'js/authority.js', 'js/ecclesiastical_strategies.js',
  'js/governments.js', 'js/government_support.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/religion.js', 'data/cultures.js', 'data/systems.js',
  'data/ecclesiastical_profiles.js', 'data/religious_institutions.js', 'data/distribution_crazygames.js']);

for (const bookmark of ['476', '1096', '1204']) {
  test('office tables preserve seeded snapshots and one daily pass in ' + bookmark, async function ({ page }, info) {
    const results = [];
    for (const uncached of [true, false]) {
      if (uncached) await page.route('**/js/model.js', function (route) { return route.fulfill({contentType:'application/javascript', body:original}); });
      else await page.unroute('**/js/model.js');
      await beginBookmark(page, info, bookmark);
      const before = await snapshot(page);
      await page.evaluate(function () {
        FB.game.passDay({deferUi:true});
      });
      results.push([before, await snapshot(page)]);
    }
    expect(results[1]).toEqual(results[0]);
  });
}

test('same-day office input changes invalidate definitions while holder reads stay live', async function ({ page }, info) {
  const oracle = baseline.replace(/officeGraph/g, 'referenceGraph').replace(/officeDefinitions/g, 'referenceDefinitions')
    .replace(/religiousOfficeDefinitions/g, 'referenceOffices').replace(/withLocalReligiousOffices/g, 'referenceLocal');
  await page.route('**/js/model.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:current.replace('  /* Local sees',
      oracle + '\n  FB.referenceReligiousOffices = referenceOffices;\n  /* Local sees')});
  });
  await beginBookmark(page, info, '476');
  const results = await page.evaluate(function () {
    const s = FB.state, checks = [];
    const initialData = JSON.stringify(FBDATA), save = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
    function compare() {
      const table = FB.religiousOffices(s), reference = FB.referenceReligiousOffices(s);
      checks.push(JSON.stringify(table) === JSON.stringify(reference));
      Object.keys(reference).forEach(function (id) {
        const a = FB.religiousOfficeSnapshot(s, id, table), b = FB.religiousOfficeSnapshot(s, id, reference);
        checks.push((a && a.id) === (b && b.id));
      });
    }
    compare();
    const first = FB.religiousOffices(s);
    checks.push(first === FB.religiousOffices(s));
    const systemEnabled = FB.systemEnabled, calls = {};
    FB.systemEnabled = function (state, system, context) {
      const key = JSON.stringify([system, context && context.faith]);
      calls[key] = (calls[key] || 0) + 1;
      return systemEnabled.apply(this, arguments);
    };
    const table = FB.religiousOffices(s);
    checks.push(Object.keys(calls).every(function (key) { return calls[key] === 1; }));
    Object.keys(table).forEach(function (id) { FB.religiousOfficeSnapshot(s, id, table); });
    // Count the build itself, independently of holder eligibility projections.
    Object.keys(calls).forEach(function (key) { delete calls[key]; });
    checks.push(table === FB.religiousOffices(s) && Object.keys(calls).length === 0);
    FB.systemEnabled = systemEnabled;
    const stable = FB.religiousOffices(s);
    const id = Object.keys(stable).find(function (id) { return !!FB.religiousOfficeSnapshot(s, id); });
    const holder = s.religiousHeads[id];
    s.religiousHeads[id] = null;
    checks.push(FB.religiousOffices(s) === stable && FB.religiousOfficeSnapshot(s, id) === null);
    s.religiousHeads[id] = holder;
    checks.push(!!FB.religiousOfficeSnapshot(s, id));
    s.turn++;
    checks.push(FB.religiousOffices(s) !== stable);
    s.turn--;
    const year = s.date.year, beforeDate = FB.religiousOffices(s);
    s.date.year++;
    checks.push(FB.religiousOffices(s) !== beforeDate);
    compare();
    s.date.year = year;
    const faithTable = FB.religiousOffices(s);
    FB.invalidateFaithState(s);
    checks.push(FB.religiousOffices(s) !== faithTable);
    const savedFaiths = s.faiths;
    s.faiths = Object.assign({}, savedFaiths, {office_table_faith:{name:'Office table faith',
      group:stable[id].religionId, properties:{head:null}}});
    FB.invalidateFaithState(s);
    checks.push(FB.faithExists('office_table_faith', s) && FB.faithOfficeId('office_table_faith', s) === null);
    compare();
    s.faiths = savedFaiths;
    FB.invalidateFaithState(s);
    const local = FB.localInstitutionDefinitions(s), localId = Object.keys(local).find(function (id) { return !!local[id].officeId; });
    const def = local[localId], oldFresh = def.freshOnly;
    def.freshOnly = true;
    const ledger = s.localInstitutions;
    s.localInstitutions = Object.assign({}, ledger);
    delete s.localInstitutions[localId];
    const absent = FB.religiousOffices(s);
    compare();
    s.localInstitutions = ledger;
    checks.push(FB.religiousOffices(s) !== absent);
    compare();
    if (oldFresh === undefined) delete def.freshOnly; else def.freshOnly = oldFresh;
    const system = FBDATA.systems.episcopal_sees, value = system.defaultEnabled;
    const beforeSystem = FB.religiousOffices(s);
    system.defaultEnabled = !value;
    checks.push(FB.religiousOffices(s) !== beforeSystem);
    compare();
    system.defaultEnabled = value;
    const profileId = 'office_table_profile';
    const profile = {period:{yearMin:s.date.year,yearMax:null}, system:'episcopal_sees',
      selection:{roleId:'leader',strategy:'appointment'}, roles:{leader:{minAge:18}}};
    FBDATA.religiousInstitutionProfiles[profileId] = profile;
    local.office_table_probe = {officeId:'office_table_probe', profileId:profileId, religion:def.religion};
    local.office_table_second = {officeId:'office_table_second', profileId:profileId, religion:def.religion};
    Object.keys(calls).forEach(function (key) { delete calls[key]; });
    FB.systemEnabled = function (state, system, context) {
      const key = JSON.stringify([system, context && context.faith]);
      calls[key] = (calls[key] || 0) + 1;
      return systemEnabled.apply(this, arguments);
    };
    const beforeProfile = FB.religiousOffices(s);
    checks.push(Object.keys(calls).every(function (key) { return calls[key] === 1; }));
    FB.systemEnabled = systemEnabled;
    compare();
    profile.period.yearMax = s.date.year - 1;
    checks.push(FB.religiousOffices(s) !== beforeProfile);
    compare();
    delete local.office_table_probe;
    delete local.office_table_second;
    delete FBDATA.religiousInstitutionProfiles[profileId];
    compare();
    const installed = FBDATA, installedTable = FB.religiousOffices(s);
    window.FBDATA = Object.assign({}, installed);
    checks.push(FB.religiousOffices(s) !== installedTable);
    window.FBDATA = installed;
    checks.push(FB.religiousOffices(s) !== installedTable);
    checks.push(initialData === JSON.stringify(FBDATA), save === FB.save.serialize(), rng === FB.getRngState(), uid === FB.getUidCounter());
    return checks;
  });
  expect(results.every(Boolean), JSON.stringify(results)).toBe(true);
});

test('opening-head key errors release incumbent guards before independent live reads', async function ({page}, info) {
  await beginBookmark(page, info, '1204');
  const result = await page.evaluate(function () {
    const s = FB.state, E = FB.ecclesiasticalGovernment, rid = 'papacy_1204';
    const bookmark = FB.campaignBookmark(s), descriptor = Object.getOwnPropertyDescriptor(bookmark, 'religiousHeads');
    const before = JSON.stringify(s), data = JSON.stringify(FBDATA), save = FB.save.serialize();
    const rng = FB.getRngState(), uid = FB.getUidCounter(), holder = E.incumbent(s, rid);
    if (!holder) throw new Error('Missing papal incumbent');
    let error = null, nested = 'unreached', reads = 0;
    try {
      Object.defineProperty(bookmark, 'religiousHeads', {enumerable:true, configurable:true, get:function () {
        nested = E.incumbent(s, rid);
        throw new Error('opening-head-sentinel');
      }});
      try { E.incumbent(s, rid); } catch (e) { error = e.message; }
    } finally { Object.defineProperty(bookmark, 'religiousHeads', descriptor); }
    const recovered = E.incumbent(s, rid);
    try {
      Object.defineProperty(bookmark, 'religiousHeads', {enumerable:true, configurable:true, get:function () {
        reads++; return descriptor.value;
      }});
      FB.religiousOffices(s);
      FB.religiousOffices(s);
    } finally { Object.defineProperty(bookmark, 'religiousHeads', descriptor); }
    const officeId = E.row(s, rid).officeId, canonical = s.religiousHeads[officeId];
    let absent;
    try { s.religiousHeads[officeId] = null; absent = E.incumbent(s, rid); }
    finally { s.religiousHeads[officeId] = canonical; }
    return {error:error, nested:nested, recovered:recovered && recovered.id, holder:holder.id, reads:reads,
      absent:absent, final:E.incumbent(s, rid).id,
      pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && save === FB.save.serialize() &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.error).toBe('opening-head-sentinel');
  expect(result.nested).toBe(null);
  expect(result.recovered).toBe(result.holder);
  expect(result.reads).toBe(2);
  expect(result.absent).toBe(null);
  expect(result.final).toBe(result.holder);
  expect(result.pure).toBe(true);
});
