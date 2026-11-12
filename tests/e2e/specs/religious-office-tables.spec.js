'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { beginBookmark } = require('../support/game/bookmark-acceptance');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { startHistoricalGame } = require('../support/game/historical-start');

dependsOnRuntime(__filename, ['js/model.js', 'js/institutions.js', 'js/politics.js',
  'js/religious_institutions.js', 'js/systems.js', 'js/government_ecclesiastical.js',
  'js/government_selection.js', 'js/papacy.js', 'js/authority.js', 'js/ecclesiastical_strategies.js',
  'js/governments.js', 'js/government_support.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/religion.js', 'data/cultures.js', 'data/systems.js',
  'data/ecclesiastical_profiles.js', 'data/religious_institutions.js', 'data/distribution_crazygames.js']);
const baseline = fs.readFileSync(path.resolve(__dirname, '../fixtures/religious-office-tables/uncached-table.txt'), 'utf8');
const current = fs.readFileSync(path.resolve(__dirname, '../../../js/model.js'), 'utf8');
const listOracle = require('../fixtures/religious-office-tables/legitimacy-list-reference.json');
const listAuthority = fs.readFileSync(path.resolve(__dirname, '../../../js/authority.js'), 'utf8');
const original = current.slice(0, current.indexOf('  let officeGraph =')) + baseline +
  current.slice(current.indexOf('  /* Local sees'));

async function snapshot(page) {
  return page.evaluate(async function () {
    async function digest(value) {
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
      return Array.from(new Uint8Array(hash)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    const s = FB.state, offices = FB.religiousOffices(s), holders = {};
    Object.keys(offices).forEach(function (id) {
      const holder = FB.religiousOfficeSnapshot(s, id);
      holders[id] = holder && holder.id || null;
    });
    return { offices:offices, holders:holders, save:FB.save.serialize(), data:await digest(FBDATA),
      revisions:await digest(FB.bookmarkRevisions(s.start.id)), signature:FB.mods.sig(),
      fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s)), rng:FB.getRngState(), uid:FB.getUidCounter() };
  });
}

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

// Exact reader bodies from the public parent; the earlier table oracle above
// remains independent and unchanged. Only the selected readers are substituted.
const readerOracle = require('../fixtures/religious-office-tables/prior-readers.json');
const readerSources = readerOracle.sections.map(function (section) {
  return fs.readFileSync(path.resolve(__dirname, '../../..', section.path), 'utf8');
});
const priorRecognition = readerOracle.sections[2].source
  .replace(/\bvalidIssuer\b/g,'priorValidIssuer').replace(/\bgeneration\b/g,'priorGeneration')
  .replace(/\bactiveRecognition\b/g,'priorActiveRecognition');

async function routeReaders(page, reference) {
  for (let i = 0; i < readerOracle.sections.length; i++) {
    const section = readerOracle.sections[i], url = '**/' + section.path;
    await page.unroute(url);
    let source = readerSources[i];
    if (reference) source = source.slice(0, source.indexOf(section.start)) + section.source +
      source.slice(source.indexOf(section.end));
    if (section.path === 'js/authority.js') source = source.replace('  function recognition(s, id)',
      priorRecognition + '\n  FB.officeReadTest = { active:activeRecognition, valid:validIssuer, generation:generation, priorActive:priorActiveRecognition, priorValid:priorValidIssuer, priorGeneration:priorGeneration };\n  function recognition(s, id)');
    await page.route(url, function (route) { return route.fulfill({contentType:'application/javascript',body:source}); });
  }
  await page.unroute('**/js/model.js');
  const counted = current.replace('  function localOfficeInputs(state, graph) {',
    '  function localOfficeInputs(state, graph) {\n    if (window.officeValidationProbe) window.officeValidationProbe(state);');
  await page.route('**/js/model.js', function (route) {
    return route.fulfill({contentType:'application/javascript',body:counted});
  });
}

function installReadProbe() {
  window.measureOfficeRead = function (run, incumbentEntry) {
    const E = FB.ecclesiasticalGovernment, prior = E.incumbent, snapshot = FB.religiousOfficeSnapshot;
    const counts = { direct:0, independent:0, snapshots:0, nestedEntries:0 };
    let depth = 0, value = null, error = null;
    E.incumbent = function () {
      depth++;
      if (depth > (incumbentEntry ? 1 : 0)) counts.nestedEntries++;
      try { return prior.apply(this, arguments); } finally { depth--; }
    };
    FB.religiousOfficeSnapshot = function () {
      counts.snapshots++;
      return snapshot.apply(this, arguments);
    };
    window.officeValidationProbe = function () {
      counts[depth > (incumbentEntry ? 1 : 0) ? 'independent' : 'direct']++;
    };
    try { value = run(); } catch (e) { error = e.message; }
    finally {
      E.incumbent = prior; FB.religiousOfficeSnapshot = snapshot;
      delete window.officeValidationProbe;
    }
    return { value:value,error:error,counts:counts };
  };
}

async function routeListReader(page, reference) {
  await routeReaders(page, false);
  await page.unroute('**/js/authority.js');
  let source = listAuthority;
  if (reference) source = source.slice(0, source.indexOf('  function activeRecognition(')) +
    listOracle.source + source.slice(source.indexOf(listOracle.end));
  const prior = listOracle.source.replace(/\bactiveRecognition\b/g, 'listPriorActiveRecognition')
    .replace('  function recognition(s, id)', '  function listPriorRecognition(s, id)')
    .replace('  Q.legitimacy = function', '  FB.listPriorLegitimacy = function');
  source = source.replace(listOracle.end, prior +
    '\n  FB.listReadActive = activeRecognition;\n' + listOracle.end);
  await page.route('**/js/authority.js', function (route) {
    return route.fulfill({contentType:'application/javascript', body:source});
  });
}

async function listStateSnapshot(page) {
  return page.evaluate(async function () {
    async function digest(text) {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(bytes)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
    }
    return {state:await digest(JSON.stringify(FB.state)), save:await digest(FB.save.serialize()),
      data:await digest(JSON.stringify(FBDATA)), rng:FB.getRngState(), uid:FB.getUidCounter(),
      signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FB.campaignBookmark(FB.state))};
  });
}

for (const bookmark of ['476', '1096', '1204']) {
  test('unchanged incumbent and recognition readers preserve complete daily outputs in ' + bookmark, async function ({ page }, info) {
    const results = [];
    for (const reference of [true, false]) {
      await routeReaders(page, reference);
      await beginBookmark(page, info, bookmark);
      const reads = await page.evaluate(function () {
        const s = FB.state, before = JSON.stringify(s), out = [];
        Object.keys(s.authority.governments).forEach(function (rid) {
          const c = FB.ecclesiasticalGovernment.incumbent(s,rid);
          out.push([rid,c && c.id || null]);
        });
        s.authority.recognitions.forEach(function (row) {
          out.push([row.id,FB.political.legitimacy(s,row.subject,row.scope)]);
        });
        return { values:out,pure:before === JSON.stringify(s) };
      });
      expect(reads.pure).toBe(true);
      const before = await snapshot(page);
      await page.evaluate(function () { FB.game.passDay({deferUi:true}); });
      results.push({ reads:reads,before:before,after:await snapshot(page) });
    }
    expect(results[1]).toEqual(results[0]);
  });
}

for (const crazygames of [false, true]) {
  test('papal reads validate once with live canonical claimants and guard cleanup in ' + (crazygames ? 'CrazyGames' : 'standard'), async function ({ page }, info) {
    const results = [];
    for (const reference of [true, false]) {
      await routeReaders(page,reference);
      await startHistoricalGame(page,info,{bookmark:'1204',code:'OFFICEREAD-1204-farmer-roma-m-Leo'},crazygames);
      await page.evaluate(function () { delete FB.state.player.flags.tutorial; });
      await page.evaluate(installReadProbe);
      const result = await page.evaluate(function () {
        const s = FB.state, E = FB.ecclesiasticalGovernment, rid = 'papacy_1204', row = E.row(s,rid);
        const officeId = row.officeId, pope = E.incumbent(s,rid), checks = [], scans = {};
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        function check(name, expected, standalone) {
          const before = JSON.stringify(s);
          const read = measureOfficeRead(function () {
            const c = standalone ? FB.papalOfficeIncumbentSnapshot(s,officeId) : E.incumbent(s,rid);
            return c && c.id || null;
          },!standalone);
          if (read.error || read.value !== expected || before !== JSON.stringify(s))
            throw new Error(name + ': ' + JSON.stringify(read));
          checks.push([name,read.value]); scans[name] = read.counts;
        }
        check('canonical',pope.id); check('standalone',pope.id,true);
        const saved = s.authority.governments[rid];
        delete s.authority.governments[rid]; check('missing-binding',null); s.authority.governments[rid] = saved;
        const form = saved.formId;
        saved.formId = 'territorial'; check('inactive',null); saved.formId = form;
        row.officeId = 'missing_office'; check('missing-office',null); row.officeId = officeId;
        const profile = row.profileId;
        row.profileId = 'missing_profile'; check('missing-profile',null); row.profileId = profile;
        const holder = s.religiousHeads[officeId];
        s.religiousHeads[officeId] = 'missing_realm'; check('binding-mismatch',null); s.religiousHeads[officeId] = holder;
        const obedience = s.papacy.obediences[s.papacy.romanObedience];
        pope.dead = true; check('dead-claimant',null); delete pope.dead;
        ['vacant','collapsed'].forEach(function (status) {
          const old = obedience.status; obedience.status = status; check(status,null); obedience.status = old;
        });
        const claimant = obedience.claimantId;
        obedience.claimantId = 'missing_claimant'; check('missing-claimant',null); obedience.claimantId = claimant;
        const roman = s.papacy.romanObedience;
        s.papacy.obediences.read_rival = { status:'active',claimantId:s.player.charId };
        s.papacy.romanObedience = 'read_rival'; check('canonical-switch',s.player.charId);
        s.papacy.romanObedience = 'missing_obedience'; check('missing-obedience',null);
        s.papacy.romanObedience = roman; delete s.papacy.obediences.read_rival;
        const sex = s.realms[rid].ruler.sex;
        s.realms[rid].ruler.sex = 'f'; check('unqualified-realm',null); s.realms[rid].ruler.sex = sex;
        const snapshot = FB.religiousOfficeSnapshot;
        FB.religiousOfficeSnapshot = function () { throw new Error('office-read-sentinel'); };
        const failed = measureOfficeRead(function () { E.incumbent(s,rid); },true);
        FB.religiousOfficeSnapshot = snapshot;
        if (failed.error !== 'office-read-sentinel') throw new Error('Missing exception');
        scans.exception = failed.counts; check('after-exception',pope.id);
        // Alternate offices retain their own store, and default mapping is live.
        const faith = FB.createFaith(s,{id:'read_conclave',name:'Read Conclave',group:'catholic',properties:{head:{
          officeId:'read_papal_office',realm:rid,seat:{site:'roma'},title:'Pastor',succession:'papal_election',greatHolyWar:null}}});
        if (!faith) throw new Error('Alternate office rejected');
        s.religiousOfficeStates = s.religiousOfficeStates || {};
        s.religiousOfficeStates.read_papal_office = {papacy:JSON.parse(JSON.stringify(s.papacy))};
        s.religiousOfficeStates.read_papal_office.papacy.obediences[roman].claimantId = s.player.charId;
        const alt = FB.papalOfficeIncumbentSnapshot(s,'read_papal_office');
        const defaultId = FBDATA.faithDefaults.offices.papal_election;
        FBDATA.faithDefaults.offices.papal_election = 'read_papal_office';
        const remapped = FB.papalOfficeIncumbentSnapshot(s,'read_papal_office');
        FBDATA.faithDefaults.offices.papal_election = defaultId;
        checks.push(['alternate',alt && alt.id],['remapped',remapped && remapped.id]);
        if (!alt || alt.id !== s.player.charId || !remapped || remapped.id !== pope.id) throw new Error('Wrong papal store');
        // Restore the directly staged additions before comparing full outputs.
        delete s.faiths.read_conclave; FB.invalidateFaithState(s);
        delete s.religiousOfficeStates.read_papal_office;
        if (!Object.keys(s.religiousOfficeStates).length) delete s.religiousOfficeStates;
        return { checks:checks,scans:scans,identity:rng === FB.getRngState() && uid === FB.getUidCounter(),
          state:JSON.stringify(s),data:JSON.stringify(FBDATA),save:FB.save.serialize() };
      });
      expect(result.identity).toBe(true);
      for (const name of ['canonical','dead-claimant','vacant','collapsed','missing-claimant','canonical-switch','missing-obedience','after-exception'])
        expect(result.scans[name].direct,name).toBe(reference ? 2 : 1);
      for (const name of ['standalone','missing-office','missing-profile','binding-mismatch','unqualified-realm','exception'])
        expect(result.scans[name].direct,name).toBe(1);
      for (const name of ['missing-binding','inactive']) expect(result.scans[name].direct,name).toBe(0);
      await info.attach((reference ? 'reference' : 'candidate') + '-papal-counts',{
        body:JSON.stringify(result.scans),contentType:'application/json'});
      const { scans, ...parity } = result;
      results.push(parity);
    }
    expect(results[1]).toEqual(results[0]);
  });
}

test('ordinary recognition keeps life-only validity while local incumbent qualification and recursion stay live', async function ({ page }, info) {
  const results = [];
  for (const reference of [true, false]) {
    await routeReaders(page,reference);
    await beginBookmark(page,info,'1204');
    await page.evaluate(installReadProbe);
    const result = await page.evaluate(function () {
      const s = FB.state, E = FB.ecclesiasticalGovernment, rid = 'papacy_1204', checks = [], scans = {};
      const pid = s.realms[rid].capital, site = FB.world.sitesByProv[pid].list[0].site;
      const defs = FB.localInstitutionDefinitions(s), iid = 'read_house', oid = 'read_house_office';
      const profile = { name:'Read house',faithIds:['catholic'],period:{yearMin:1,yearMax:null},system:null,
        roles:{leader:{name:'Leader',minAge:18,sexes:[],unmarried:false,professions:[],skills:{},affiliationId:null}},
        selection:{strategy:'appointment',policy:'patron',roleId:'leader',consentRoles:[],quorum:0},
        recognition:{sources:['institution_support'],roles:['leader'],quorum:1,requiresLeader:true,protectedWorship:false},
        actions:['admit','appoint','withdraw','vacate'],fees:{},affiliationIds:[] };
      FBDATA.religiousInstitutionProfiles.read_house = profile;
      const def = defs[iid] = {city:'Read house',kind:'monastery',provinceId:pid,site:site,culture:'italian',
        religion:'catholic',profileId:'read_house',officeId:oid,jurisdictionIds:[pid],freshOnly:true};
      const c = FB.makeCharacter(s,{name:'Reader',sex:'m',religion:'catholic',culture:'italian',born:s.date.year - 40,
        role:'priest',station:2,quality:1,traitsN:0});
      c.homeProvinceId = pid;
      const local = s.localInstitutions[iid] = FB.religiousInstitutionOpeningRow(iid,def);
      local.members[c.id] = {roleId:'leader',status:'active',joinedTurn:s.turn,changedTurn:s.turn};
      local.representativeId = c.id; s.religiousHeads[oid] = c.id;
      const originalBinding = JSON.parse(JSON.stringify(E.row(s,rid)));
      FBDATA.ecclesiasticalProfiles.read_house = Object.assign({},E.profile(s,rid),{source:'institution_profile'});
      Object.assign(E.row(s,rid),{officeId:oid,institutionId:iid,profileId:'read_house'});
      FB.governments.invalidate();
      const proof = FB.authorityRecognize(s,{source:'church_support',issuer:{kind:'religious-office',id:oid},
        subject:{kind:'character',id:s.player.charId}});
      if (!proof) throw new Error('Ordinary recognition setup failed');
      const row = s.authority.recognitions.find(function (r) { return r.id === proof.id; });
      function read(name, incumbent, active) {
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const recognition = measureOfficeRead(function () { return FB.officeReadTest.active(s,row); });
        const holder = measureOfficeRead(function () { const h = E.incumbent(s,rid); return h && h.id || null; },true);
        if (recognition.error || holder.error || recognition.value !== active || holder.value !== (incumbent ? c.id : null))
          throw new Error(name + ': ' + JSON.stringify([recognition,holder]));
        if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure ' + name);
        checks.push([name,recognition.value,holder.value]); scans[name] = {recognition:recognition.counts,holder:holder.counts};
      }
      read('qualified',true,true);
      const copies = FB.political.legitimacy(s,row.subject), returned = copies.find(function (r) { return r.id === row.id; });
      returned.issuer.id = 'poison'; returned.subject.id = 'poison'; returned.status = 'revoked';
      if (!FB.officeReadTest.active(s,row) || row.issuer.id !== oid) throw new Error('Recognition alias');
      const definition = JSON.parse(JSON.stringify(FB.religiousOffices(s)[oid]));
      definition.head.minAge = 1000;
      if (FB.religiousOffices(s)[oid].head.minAge !== 18) throw new Error('Definition alias');
      c.captive = true; read('captive',false,true); delete c.captive;
      c.exiled = true; read('exiled',false,true); delete c.exiled;
      const born = c.born; c.born = s.date.year - 17; read('age',false,true); c.born = born;
      c.religion = 'sunni'; read('faith',false,true); c.religion = 'catholic';
      profile.roles.leader.sexes = ['f']; read('sex',false,true); profile.roles.leader.sexes = [];
      profile.roles.leader.professions = ['scholar']; read('profession',false,true); profile.roles.leader.professions = [];
      profile.roles.leader.skills = {int:1000}; read('skill',false,true); profile.roles.leader.skills = {};
      profile.roles.leader.affiliationId = 'missing_affiliation'; read('affiliation',false,true); profile.roles.leader.affiliationId = null;
      local.members[c.id].status = 'withdrawn'; read('withdrawn',false,true); local.members[c.id].status = 'active';
      local.status = 'suspended'; read('suspended',false,true); local.status = 'active';
      delete s.localInstitutions[iid]; read('fresh-absent',false,false); s.localInstitutions[iid] = local;
      read('fresh-present',true,true);
      profile.period.yearMax = s.date.year - 1; read('inactive-profile',false,false); profile.period.yearMax = null;
      profile.roles.leader.minAge = 1000; read('profile-edit',false,true); profile.roles.leader.minAge = 18;
      def.officeId = 'changed_office'; read('local-edit',false,false); def.officeId = oid;
      profile.system = 'episcopal_sees';
      const enabled = FB.systemEnabled;
      FB.systemEnabled = function (state, system) { return system === 'episcopal_sees' ? false : enabled.apply(this,arguments); };
      read('system-edit',false,false); FB.systemEnabled = enabled; profile.system = null;
      const heads = s.religiousHeads;
      heads[oid] = null; read('vacancy',false,false); delete heads[oid]; read('missing-holder',false,false); heads[oid] = c.id;
      c.dead = true; read('death',false,false); delete c.dead;
      read('recovered',true,true);
      const reader = FB.religiousInstitutionOfficeEligible;
      FB.religiousInstitutionOfficeEligible = function () { throw new Error('residence-sentinel'); };
      const failed = measureOfficeRead(function () { return E.incumbent(s,rid); },true);
      FB.religiousInstitutionOfficeEligible = reader;
      if (failed.error !== 'residence-sentinel') throw new Error('Missing eligibility exception');
      read('after-error',true,true);
      // A rejected row never eagerly reaches office definitions.
      const guards = [null,Object.assign({},row,{status:'revoked'}),Object.assign({},row,{endTurn:s.turn}),
        Object.assign({},row,{source:'missing_source'}),Object.assign({},row,{issuer:null}),
        Object.assign({},row,{issuer:{kind:'religious-office',id:4}})];
      guards.forEach(function (candidate, i) {
        const r = measureOfficeRead(function () { return FB.officeReadTest.active(s,candidate); });
        if (r.error || r.value || r.counts.direct || r.counts.independent) throw new Error('Guard ' + i + ': ' + JSON.stringify(r));
      });
      // Subject and generation rejection occur after the first validation.
      [Object.assign({},row,{subject:{kind:'character',id:'missing_subject'}}),
        Object.assign({},row,{issuerGeneration:'stale'})].forEach(function (candidate, i) {
        const r = measureOfficeRead(function () { return FB.officeReadTest.active(s,candidate); });
        if (r.error || r.value) throw new Error('Late guard ' + i);
        scans['late-' + i] = {recognition:r.counts};
      });
      const thrown = FB.religiousOffices;
      FB.religiousOffices = function () { throw new Error('definition-sentinel'); };
      const error = measureOfficeRead(function () { return FB.officeReadTest.active(s,row); });
      FB.religiousOffices = thrown;
      if (error.error !== 'definition-sentinel') throw new Error('Missing definition exception');
      read('after-definition-error',true,true);
      const installed = FBDATA;
      window.FBDATA = Object.assign({},installed); read('catalogue-replaced',true,true);
      window.FBDATA = installed; read('catalogue-restored',true,true);
      const detached = JSON.parse(JSON.stringify(s));
      if (!FB.officeReadTest.active(detached,row) || !FB.officeReadTest.active(s,row)) throw new Error('Foreign state reuse');
      s.authority.governments[rid].ecclesiastical = originalBinding;
      FB.governments.invalidate();
      return {checks:checks,scans:scans,save:FB.save.serialize(),data:JSON.stringify(FBDATA),
        rng:FB.getRngState(),uid:FB.getUidCounter()};
    });
    for (const name of ['qualified','captive','exiled','age','faith','sex','profession','skill','affiliation','withdrawn',
      'suspended','fresh-present','profile-edit','recovered','after-error','after-definition-error','catalogue-replaced','catalogue-restored','late-1'])
      expect(result.scans[name].recognition.direct,name).toBe(reference ? 2 : 1);
    expect(result.scans['late-0'].recognition.direct).toBe(1);
    for (const name of ['fresh-absent','inactive-profile','local-edit','system-edit','vacancy','missing-holder','death'])
      expect(result.scans[name].recognition.direct,name).toBe(1);
    expect(result.scans.qualified.holder.nestedEntries).toBeGreaterThan(0);
    await info.attach((reference ? 'reference' : 'candidate') + '-ordinary-counts',{
      body:JSON.stringify(result.scans),contentType:'application/json'});
    const { scans, ...parity } = result;
    results.push(parity);
  }
  expect(results[1]).toEqual(results[0]);
});

const politicalOfficeMod = require('../fixtures/political-religious-head/estuary.json');
async function importOfficeMod(page, mod) {
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'office-reads.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}

for (const boundary of [false,true]) {
  test('political recognition shares one validation through ' + (boundary ? 'vacancy, accession and restore' : 'live consent and qualification'), async function ({ page }, info) {
    await routeReaders(page,false);
    await openGame(page,info);
    await importOfficeMod(page,politicalOfficeMod);
    await beginBookmarkFromTitle(page,'paired_office_world','estuary_household_demo');
    await page.evaluate(installReadProbe);
    const result = await page.evaluate(function (boundary) {
      const s = FB.state, S = FB.governmentSelection, Q = FB.political, checks = [], scans = {};
      const rid = 'southern_court_demo', oid = 'southern_office_demo', tree = s.realms[rid].succession;
      const c = s.chars[tree.members[tree.rulerMemberId].charId];
      const subject = {kind:'character',id:s.player.charId}, issuer = {kind:'religious-office',id:oid};
      const proof = FB.authorityRecognize(s,{source:'church_support',issuer:issuer,subject:subject});
      if (!proof) throw new Error('Political recognition failed');
      const row = s.authority.recognitions.find(function (r) { return r.id === proof.id; });
      function check(name, expected, tested) {
        const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
        const read = measureOfficeRead(function () { return FB.officeReadTest.active(s,tested || row); });
        const prior = measureOfficeRead(function () { return FB.officeReadTest.priorActive(s,tested || row); });
        const publicRows = Q.legitimacy(s,subject);
        if (read.error || prior.error || read.value !== expected || prior.value !== read.value ||
            !tested && publicRows.some(function (r) { return r.id === row.id; }) !== expected)
          throw new Error(name + ': ' + JSON.stringify([prior,read]));
        if (before !== JSON.stringify(s) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure ' + name);
        checks.push([name,read.value]); scans[name] = {candidate:read.counts,reference:prior.counts};
      }
      check('qualified',true);
      if (!boundary) {
        scans.standaloneValid = {candidate:measureOfficeRead(function () { return FB.officeReadTest.valid(s,issuer,'church_support'); }).counts,
          reference:measureOfficeRead(function () { return FB.officeReadTest.priorValid(s,issuer,'church_support'); }).counts};
        scans.standaloneGeneration = {candidate:measureOfficeRead(function () { return FB.officeReadTest.generation(s,issuer); }).counts,
          reference:measureOfficeRead(function () { return FB.officeReadTest.priorGeneration(s,issuer); }).counts};
        const originalRecognition = S.state(s,rid).recognition;
        S.state(s,rid).recognition = null; check('consent-lost',false); S.state(s,rid).recognition = originalRecognition;
        check('consent-recovered',true);
        const born = c.born; c.born = s.date.year - 17; check('underage',false); c.born = born;
        c.sex = 'f'; check('sex',false); c.sex = 'm';
        const faith = c.religion; c.religion = 'catholic'; check('faith',false); c.religion = faith;
        const realmFaith = s.realms[rid].religion;
        s.realms[rid].religion = 'catholic'; check('realm-faith',false); s.realms[rid].religion = realmFaith;
        const form = s.authority.governments[rid].formId;
        s.authority.governments[rid].formId = 'territorial'; FB.governments.invalidate(); check('form',false);
        s.authority.governments[rid].formId = form; FB.governments.invalidate();
        const profile = S.profile(s,rid), excluded = profile.candidatePool.excludedRoles;
        profile.candidatePool.excludedRoles = [c.role]; check('candidate-qualification',false); profile.candidatePool.excludedRoles = excluded;
        const generation = s.realms[rid].ruler.generation;
        s.realms[rid].ruler.generation = generation + 1; check('realm-generation',false); s.realms[rid].ruler.generation = generation;
        const otherId = s.religiousHeads.estuary_office_demo;
        s.religiousHeads[oid] = otherId; check('wrong-holder',false);
        s.religiousHeads[oid] = null; check('null-holder',false); delete s.religiousHeads[oid]; check('missing-holder',false);
        s.religiousHeads[oid] = c.id; check('recovered',true);
        const escaped = Q.legitimacy(s,subject)[0]; escaped.issuer.id = 'poison'; escaped.subject.id = 'poison';
        check('detached-row',true);
        const missing = Object.assign({},row,{issuer:{kind:'religious-office',id:'missing_office'}});
        check('missing-office',false,missing);
        check('stale-generation',false,Object.assign({},row,{issuerGeneration:'stale'}));
        const source = FBDATA.legitimacySources[row.source], succession = source.succession;
        source.succession = 'retain'; check('no-reaffirm',true); source.succession = succession;
        const snapshot = FB.religiousOfficeSnapshot;
        FB.religiousOfficeSnapshot = function () { throw new Error('political-sentinel'); };
        const failed = measureOfficeRead(function () { return FB.officeReadTest.active(s,row); });
        const priorFailed = measureOfficeRead(function () { return FB.officeReadTest.priorActive(s,row); });
        FB.religiousOfficeSnapshot = snapshot;
        if (failed.error !== 'political-sentinel' || priorFailed.error !== failed.error) throw new Error('Political exception missing');
        scans.exception = {candidate:failed.counts,reference:priorFailed.counts}; check('after-error',true);
        let snapshotCalls = 0;
        FB.religiousOfficeSnapshot = function () {
          if (++snapshotCalls === 2) throw new Error('generation-sentinel');
          return snapshot.apply(this,arguments);
        };
        const generationError = measureOfficeRead(function () { return FB.officeReadTest.active(s,row); });
        snapshotCalls = 0;
        const priorGenerationError = measureOfficeRead(function () { return FB.officeReadTest.priorActive(s,row); });
        FB.religiousOfficeSnapshot = snapshot;
        if (generationError.error !== 'generation-sentinel' || priorGenerationError.error !== generationError.error) throw new Error('Generation exception missing');
        scans.generationException = {candidate:generationError.counts,reference:priorGenerationError.counts}; check('after-generation-error',true);
        const installed = FBDATA;
        window.FBDATA = Object.assign({},installed); check('catalogue-replaced',true);
        window.FBDATA = installed; check('catalogue-restored',true);
        const detached = JSON.parse(JSON.stringify(s));
        if (!FB.officeReadTest.active(detached,row)) throw new Error('Detached query failed');
        check('after-detached-state',true);
      }
      // Real death, vacancy and accession retain their own writers and live checks.
      if (boundary) {
        const oldMember = tree.members[tree.rulerMemberId];
        c.dead = true; c.died = s.date.year; oldMember.alive = false; oldMember.died = s.date.year;
        check('death',false); FB.religiousHeadCharacterDied(s,c.id); check('death-vacancy',false);
        const next = Object.values(tree.members).find(function (m) { return m.localId === 'relative'; });
        const actor = {kind:'realm',id:rid};
        function apply(request) {
          const q = S.quote(s,rid,request);
          if (!q.allowed || !S.apply(s,q)) throw new Error('Selection ' + request.action + ': ' + q.reasonId);
        }
        apply({action:'open',actor:actor,cause:'death'});
        S.constituency(s,rid).forEach(function (m) {
          apply({action:'support',actor:{kind:'constituency',realmId:rid,id:m.id},memberId:m.id,candidateId:next.id,terms:S.profile(s,rid).terms});
        });
        apply({action:'resolve',actor:actor});
        if (s.religiousHeads[oid] !== next.charId) throw new Error('Accession not bound');
        check('accession-stale',false);
        if (!FB.authorityRecognitionTransition(s,row.id,'reaffirm')) throw new Error('Reaffirm failed');
        check('accession-reaffirmed',true);
      }
      FB.treasuryInitialize(s);
      return {checks:checks,scans:scans,save:FB.save.serialize(),data:JSON.stringify(FBDATA),
        rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),signature:FB.mods.sig(),fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s))};
    },boundary);
    for (const reference of [true,false]) {
      const counts = reference ? 'reference' : 'candidate';
      for (const name of boundary ? ['qualified','accession-stale','accession-reaffirmed'] :
        ['qualified','consent-recovered','recovered','detached-row','stale-generation','after-error','after-generation-error',
          'catalogue-replaced','catalogue-restored','after-detached-state']) {
        expect(result.scans[name][counts].direct,name).toBe(reference ? 4 : 1);
        expect(result.scans[name][counts].snapshots,name).toBe(2);
      }
      for (const name of boundary ? ['death','death-vacancy'] :
        ['consent-lost','underage','sex','faith','realm-faith','form','candidate-qualification',
          'realm-generation','wrong-holder','null-holder','missing-holder','no-reaffirm'])
        expect(result.scans[name][counts].direct,name).toBe(reference ? 2 : 1);
      if (!boundary) {
        expect(result.scans['missing-office'][counts].direct).toBe(1);
        expect(result.scans.exception[counts].direct).toBe(1);
        expect(result.scans.generationException[counts].direct).toBe(reference ? 3 : 1);
        expect(result.scans.standaloneValid[counts].direct).toBe(2);
        expect(result.scans.standaloneGeneration[counts].direct).toBe(2);
      }
    }
    await info.attach('political-counts',{body:JSON.stringify(result.scans),contentType:'application/json'});
    for (let i = 0; boundary && i < 2; i++) {
      await restoreBookmark(page,result.save);
      const restored = await snapshot(page);
      const initial = JSON.parse(result.save), current = JSON.parse(restored.save);
      for (const key of ['religiousHeads','religiousHeadVacancies','authority','realms','start'])
        expect(current.state[key],key).toEqual(initial.state[key]);
      expect(current.rng >>> 0).toBe(initial.rng >>> 0);
      expect(current.uid).toBe(initial.uid);
      expect(current.mods).toBe(initial.mods);
      expect(await page.evaluate(function () {
        const s = FB.state, rows = s.authority.recognitions;
        const saved = FB.save.serialize();
        const equal = rows.every(function (row) {
          return FB.officeReadTest.active(s,row) && FB.officeReadTest.priorActive(s,row);
        });
        return equal && saved === FB.save.serialize();
      })).toBe(true);
    }
  });
}

for (const replaceOffice of [true,false]) {
  test('JSON office ' + (replaceOffice ? 'replacement and rejected rollback' : 'removal') + ' preserves unchanged-reader outputs', async function ({ page }, info) {
    await routeReaders(page,false);
    await openGame(page,info);
    const baseline = await page.evaluate(function () {
      return {offices:FB.religiousOffices(null),data:FB.mods.fingerprint(JSON.stringify(FBDATA)),signature:FB.mods.sig()};
    });
    async function compareReaders() {
      const result = await page.evaluate(function () {
        const s = FB.state, issuer = {kind:'religious-office',id:'estuary_office_demo'}, subject = {kind:'character',id:s.player.charId};
        const proof = FB.authorityRecognize(s,{source:'church_support',issuer:issuer,subject:subject});
        if (!proof) throw new Error('Imported recognition failed');
        const saved = FB.save.serialize(), data = JSON.stringify(FBDATA), rows = s.authority.recognitions;
        const reference = rows.map(function (row) { return FB.officeReadTest.priorActive(s,row); });
        const actual = rows.map(function (row) { return FB.officeReadTest.active(s,row); });
        return {reference:reference,actual:actual,pure:saved === FB.save.serialize() && data === JSON.stringify(FBDATA)};
      });
      expect(result.actual).toEqual(result.reference);
      expect(result.actual).toContain(true);
      expect(result.pure).toBe(true);
    }
    await importOfficeMod(page,politicalOfficeMod);
    await beginBookmarkFromTitle(page,'paired_office_world','estuary_household_demo');
    await compareReaders();
    const initial = await snapshot(page);
    const rejected = JSON.parse(JSON.stringify(politicalOfficeMod));
    rejected.religions.early_office_demo.properties.head.realm = 'missing_realm';
    expect(await page.evaluate(function (mod) {
      const before = JSON.stringify([FB.state,FBDATA,localStorage]), rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.mods.store(JSON.stringify(mod)) === false && before === JSON.stringify([FB.state,FBDATA,localStorage]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    },rejected)).toBe(true);
    if (replaceOffice) {
      const replacement = JSON.parse(JSON.stringify(politicalOfficeMod));
      replacement.religions.estuary_tradition_demo.properties.head.minAge = 22;
      await importOfficeMod(page,replacement);
      await beginBookmarkFromTitle(page,'paired_office_world','estuary_household_demo');
      expect(await page.evaluate(function () {
        const s = FB.state;
        return [FB.religiousOffices(s).estuary_office_demo.head.minAge,!!FB.religiousOfficeSnapshot(s,'estuary_office_demo')];
      })).toEqual([22,true]);
      await compareReaders();
      const replaced = await snapshot(page);
      expect(replaced.signature).not.toBe(initial.signature);
      expect(replaced.fingerprint).toBe(initial.fingerprint);
    } else {
      await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.evaluate(function () { FB.mods.removeAt(0); })]);
      await prepareGameContent(page);
      const removed = await page.evaluate(function () {
        if (FB.faithExists('early_office_demo',null) || FB.religiousOffices(null).southern_office_demo || FB.mods.count() !== 0)
          throw new Error('Removed office survived catalogue replacement');
        return {offices:FB.religiousOffices(null),data:FB.mods.fingerprint(JSON.stringify(FBDATA)),signature:FB.mods.sig()};
      });
      expect(removed).toEqual(baseline);
    }
  });
}

for (const bookmark of ['476', '1096', '1204']) {
  test('legitimacy lists preserve complete ordinary and boundary outputs in ' + bookmark, async function ({page}, info) {
    const outputs = [], evidence = [];
    for (const reference of [true, false]) {
      await routeListReader(page, reference);
      await beginBookmark(page, info, bookmark);
      await page.evaluate(installReadProbe);
      const phases = [], scans = [];
      for (const phase of ['ordinary', 'season', 'year']) {
        const measured = await page.evaluate(function (phase) {
          const s = FB.state;
          if (phase !== 'ordinary') {
            const season = phase === 'year' ? 3 : s.date.season;
            s.turn += (season - s.date.season) * 90 + 90 - s.date.day;
            s.date.season = season; s.date.day = 90;
          }
          const turn = s.turn;
          const result = measureOfficeRead(function () { FB.game.passDay({deferUi:true}); });
          return {phase:phase, counts:result.counts, error:result.error, days:s.turn - turn};
        }, phase);
        expect(measured.error).toBe(null);
        expect(measured.days).toBe(1);
        scans.push(measured);
        phases.push(await listStateSnapshot(page));
      }
      outputs.push(phases); evidence.push(scans);
      await info.attach((reference ? 'reference' : 'candidate') + '-list-boundary-counts', {
        body:JSON.stringify({bookmark:bookmark, phases:scans}), contentType:'application/json'});
    }
    expect(outputs[1]).toEqual(outputs[0]);
    for (let i = 0; i < evidence[0].length; i++) {
      expect(evidence[1][i].counts.direct).toBeLessThanOrEqual(evidence[0][i].counts.direct);
      expect(evidence[1][i].counts.independent).toBe(evidence[0][i].counts.independent);
    }
    if (bookmark === '476') {
      expect(evidence[1][1].counts.direct).toBeLessThan(evidence[0][1].counts.direct);
      expect(evidence[1][2].counts.direct).toBeLessThan(evidence[0][2].counts.direct);
    }
    console.log('LEGITIMACY_LIST_BOUNDARIES ' + JSON.stringify({bookmark:bookmark, reference:evidence[0], candidate:evidence[1]}));
  });
}

test('legitimacy lists preserve mixed filters, ordinary holder rules and independent reads', async function ({page}, info) {
  await routeListReader(page, false);
  await beginBookmark(page, info, '476');
  await page.evaluate(installReadProbe);
  const result = await page.evaluate(function () {
    const s = FB.state, Q = FB.political, subject = {kind:'character', id:s.player.charId};
    const offices = FB.religiousOffices(s), scans = [], values = [];
    let proof;
    for (const oid of Object.keys(offices)) {
      if (offices[oid].head.succession === 'political_incumbent') continue;
      proof = FB.authorityRecognize(s, {source:'church_support', issuer:{kind:'religious-office', id:oid}, subject:subject});
      if (proof) break;
    }
    if (!proof) throw new Error('No ordinary office recognition');
    const original = s.authority.recognitions, copy = function (value) { return JSON.parse(JSON.stringify(value)); };
    const priest = Object.keys(s.chars).find(function (id) { return !s.chars[id].dead && ['priest','monk'].indexOf(s.chars[id].role) >= 0; });
    if (!priest) throw new Error('No ordinary priest');
    const pid = s.player.provinceId, other = FB.campaignBookmark(s).provinces.find(function (row) { return row.id !== pid; }).id;
    function row(id, patch) { return Object.assign(copy(proof), {id:id}, patch || {}); }
    const rows = [row('list_a'), row('list_priest', {issuer:{kind:'character', id:priest}, issuerGeneration:priest}),
      row('list_b', {scope:{kind:'county', id:pid}}), row('list_c', {scope:{kind:'county', id:other}}),
      row('list_expired', {endTurn:s.turn}), row('list_revoked', {status:'revoked'}),
      row('list_unknown', {source:'missing_source'}), row('list_foreign', {subject:{kind:'character', id:'missing_subject'}})];
    function check(name, who, at, source) {
      const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, who || subject, at, source); });
      const current = measureOfficeRead(function () { return Q.legitimacy(s, who || subject, at, source); });
      if (prior.error !== current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('List parity ' + name);
      if (before !== JSON.stringify(s) || data !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure list ' + name);
      scans.push({name:name, reference:prior.counts, candidate:current.counts});
      values.push([name, current.value && current.value.map(function (r) { return r.id; }), current.error]);
      return current;
    }
    s.authority.recognitions = rows;
    try {
      check('mixed'); check('scope', null, {kind:'county', id:pid}); check('filtered-source', null, null, 'missing_source');
      const escaped = Q.legitimacy(s, subject)[0]; escaped.issuer.id = 'poison'; escaped.subject.id = 'poison';
      check('returned-copy');
      check('invalid-subject', {kind:'character', id:'missing_subject'});
      check('invalid-scope', null, {kind:'county', id:'missing_county'});
      s.authority.recognitions = []; check('empty');
      s.authority.recognitions = [rows[1]]; check('non-office');
      s.authority.recognitions = rows;
      const holderId = s.religiousHeads[proof.issuer.id], holder = s.chars[holderId] || s.realms[holderId];
      const dead = holder.dead, alive = holder.alive, captive = holder.captive;
      holder.captive = true; check('ordinary-captive');
      if (captive === undefined) delete holder.captive; else holder.captive = captive;
      if (s.chars[holderId]) holder.dead = true; else holder.alive = false;
      check('holder-dead');
      if (dead === undefined) delete holder.dead; else holder.dead = dead;
      if (alive === undefined) delete holder.alive; else holder.alive = alive;
      s.religiousHeads[proof.issuer.id] = null; check('holder-vacant');
      s.religiousHeads[proof.issuer.id] = holderId; check('holder-restored');
      const installed = FBDATA;
      try { window.FBDATA = Object.assign({}, installed); check('catalogue-replaced'); }
      finally { window.FBDATA = installed; }
      check('catalogue-restored');
      const detached = copy(s);
      const prior = FB.listPriorLegitimacy(detached, subject), current = Q.legitimacy(detached, subject);
      if (JSON.stringify(prior) !== JSON.stringify(current)) throw new Error('Detached state parity');
      check('after-detached');
      const getter = FB.religiousOffices;
      FB.religiousOffices = function () { throw new Error('list-definition-sentinel'); };
      try { check('definition-error'); }
      finally { FB.religiousOffices = getter; }
      check('after-error');
      const standalone = measureOfficeRead(function () { return FB.listReadActive(s, rows[0]); });
      if (standalone.error || standalone.counts.direct !== 1) throw new Error('Standalone row lifetime changed');
    } finally { s.authority.recognitions = original; }
    return {scans:scans, values:values};
  });
  for (const name of ['mixed','scope','filtered-source','returned-copy','ordinary-captive','holder-dead',
    'holder-vacant','holder-restored','catalogue-replaced','catalogue-restored','after-detached','after-error']) {
    const row = result.scans.find(function (r) { return r.name === name; });
    expect(row.reference.direct, name).toBe(3);
    expect(row.candidate.direct, name).toBe(1);
  }
  for (const name of ['invalid-subject','invalid-scope','empty','non-office']) {
    expect(result.scans.find(function (r) { return r.name === name; }).candidate.direct, name).toBe(0);
  }
  expect(result.values.find(function (r) { return r[0] === 'mixed'; })[1]).toEqual(['list_a','list_priest','list_b','list_c']);
  expect(result.values.find(function (r) { return r[0] === 'scope'; })[1]).toEqual(['list_a','list_priest','list_b']);
  expect(result.values.find(function (r) { return r[0] === 'filtered-source'; })[1]).toEqual([]);
  expect(result.values.find(function (r) { return r[0] === 'definition-error'; })[2]).toBe('list-definition-sentinel');
  await info.attach('ordinary-list-validation-counts', {body:JSON.stringify(result), contentType:'application/json'});
});

for (const minAge of [18, 22]) {
  test('JSON political lists keep live row checks, nesting and restore at minimum age ' + minAge, async function ({page}, info) {
    await routeListReader(page, false);
    await openGame(page, info);
    const mod = JSON.parse(JSON.stringify(politicalOfficeMod));
    mod.religions.estuary_tradition_demo.properties.head.minAge = minAge;
    await importOfficeMod(page, mod);
    await beginBookmarkFromTitle(page, 'paired_office_world', 'estuary_household_demo');
    await page.evaluate(installReadProbe);
    const result = await page.evaluate(function () {
      const s = FB.state, Q = FB.political, S = FB.governmentSelection, scans = [];
      const subject = {kind:'character', id:s.player.charId}, oid = 'southern_office_demo', rid = 'southern_court_demo';
      const proof = FB.authorityRecognize(s, {source:'church_support', issuer:{kind:'religious-office', id:oid}, subject:subject});
      if (!proof) throw new Error('Political list setup failed');
      const original = s.authority.recognitions, row = original.find(function (r) { return r.id === proof.id; });
      const rows = [Object.assign({}, row, {id:'political_list_a'}), Object.assign({}, row, {id:'political_list_b'})];
      const t = s.realms[rid].succession, c = s.chars[t.members[t.rulerMemberId].charId];
      function check(name, reset) {
        const before = JSON.stringify(s), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        if (reset) reset();
        const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, subject); });
        if (reset) reset();
        const current = measureOfficeRead(function () { return Q.legitimacy(s, subject); });
        if (prior.error !== current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('Political list parity ' + name);
        if (before !== JSON.stringify(s) || data !== JSON.stringify(FBDATA) || rng !== FB.getRngState() || uid !== FB.getUidCounter()) throw new Error('Impure political list ' + name);
        scans.push({name:name, reference:prior.counts, candidate:current.counts,
          value:current.value && current.value.map(function (r) { return r.id; }), error:current.error});
      }
      s.authority.recognitions = rows;
      try {
        check('qualified');
        const born = c.born; c.born = s.date.year - 1; check('underage'); c.born = born;
        const consent = S.state(s, rid).recognition;
        S.state(s, rid).recognition = null; check('consent-lost'); S.state(s, rid).recognition = consent;
        s.religiousHeads[oid] = null; check('vacant'); s.religiousHeads[oid] = c.id;
        check('recovered');
        const reader = FB.religiousOfficeSnapshot;
        let calls = 0;
        FB.religiousOfficeSnapshot = function () { return ++calls === 3 ? null : reader.apply(this, arguments); };
        try { check('second-row-live', function () { calls = 0; }); }
        finally { FB.religiousOfficeSnapshot = reader; }
        let nested = false, nestedCalls = 0;
        FB.religiousOfficeSnapshot = function () {
          if (!nested) { nested = true; nestedCalls++; Q.legitimacy(s, subject); }
          return reader.apply(this, arguments);
        };
        try {
          const prior = measureOfficeRead(function () { return FB.listPriorLegitimacy(s, subject); });
          nested = false;
          const current = measureOfficeRead(function () { return Q.legitimacy(s, subject); });
          if (prior.error || current.error || JSON.stringify(prior.value) !== JSON.stringify(current.value)) throw new Error('Nested list parity');
          scans.push({name:'nested', reference:prior.counts, candidate:current.counts, nestedCalls:nestedCalls});
        } finally { FB.religiousOfficeSnapshot = reader; }
        FB.religiousOfficeSnapshot = function () { throw new Error('list-holder-sentinel'); };
        try { check('holder-error'); }
        finally { FB.religiousOfficeSnapshot = reader; }
        check('after-error');
      } finally { s.authority.recognitions = original; }
      return {scans:scans, save:FB.save.serialize(), subject:subject};
    });
    for (const row of result.scans) {
      if (row.name === 'nested') {
        expect(row.candidate.direct).toBe(2);
        expect(row.reference.direct).toBeGreaterThan(row.candidate.direct);
        expect(row.nestedCalls).toBe(2);
      } else {
        expect(row.candidate.direct, row.name).toBe(1);
        expect(row.candidate.snapshots, row.name).toBe(row.reference.snapshots);
      }
    }
    expect(result.scans.find(function (r) { return r.name === 'qualified'; }).value).toEqual(['political_list_a','political_list_b']);
    expect(result.scans.find(function (r) { return r.name === 'qualified'; }).candidate.snapshots).toBe(4);
    expect(result.scans.find(function (r) { return r.name === 'second-row-live'; }).value).toEqual(['political_list_a']);
    for (const name of ['underage','consent-lost','vacant']) expect(result.scans.find(function (r) { return r.name === name; }).value, name).toEqual([]);
    expect(result.scans.find(function (r) { return r.name === 'holder-error'; }).error).toBe('list-holder-sentinel');
    const beforeRestore = await listStateSnapshot(page);
    await restoreBookmark(page, result.save);
    expect(await page.evaluate(function (subject) {
      return FB.political.legitimacy(FB.state, subject);
    }, result.subject)).toEqual(await page.evaluate(function (subject) {
      return FB.listPriorLegitimacy(FB.state, subject);
    }, result.subject));
    const afterRestore = await listStateSnapshot(page);
    expect(afterRestore.data).toBe(beforeRestore.data);
    await info.attach('political-list-validation-counts', {body:JSON.stringify(result.scans), contentType:'application/json'});
  });
}
