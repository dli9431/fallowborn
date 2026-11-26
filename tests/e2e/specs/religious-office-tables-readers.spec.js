'use strict';
const { test, expect } = require('../support/fixture');
test.describe.configure({mode:'parallel'});
const { openTitle } = require('../support/game/navigation');
const { injectBrowserHarness } = require('../support/game/browser-harness');
const { startPreparedParityGame } = require('../support/game/parity');
const { useReviewStartRules } = require('../support/game/released-starts');
const { routeReaders, installReadProbe } = require('../support/game/religious-office-tables');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/model.js', 'js/institutions.js', 'js/politics.js',
  'js/religious_institutions.js', 'js/systems.js', 'js/government_ecclesiastical.js',
  'js/government_selection.js', 'js/papacy.js', 'js/authority.js', 'js/ecclesiastical_strategies.js',
  'js/governments.js', 'js/government_support.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/religion.js', 'data/cultures.js', 'data/systems.js',
  'data/ecclesiastical_profiles.js', 'data/religious_institutions.js', 'data/distribution_crazygames.js']);

/* Both builds of a case begin the shared bookmark start's farmer code through
   the ordinary unmodded setup of its date (choosing the date on the title,
   then entering the code), instead of preparing every date's catalogue first.
   The code is chosen exactly as the shared bookmark start chooses it. */
async function beginSetupDate(page, info, id) {
  await openTitle(page, info);
  const fullStart = page.locator('#btn-choose-beginning');
  if (await fullStart.isVisible()) await fullStart.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#bookmarklist [data-bookmark="' + id + '"]').click();
  await expect(page.locator('#scenariolist .scencard').first()).toBeVisible();
  const code = await page.evaluate(function (id) {
    if (FB.bookmarkSources.setupId() !== id || FB.game.contentReady || FB.mods.count()) throw new Error('Expected the unmodded ' + id + ' setup');
    const bm = FB.bookmark(id);
    if (!bm) throw new Error('Bookmark ' + id + ' was not set up.');
    const errors = FB.validateBookmark(bm);
    if (errors.length) throw new Error(errors.join('\n'));
    FB.startProgression.noteTier(3);
    const offered = FBDATA.startScenarios.filter(function (s) {
      return !s.hidden && !s.rulerRealmId &&
        (!s.bookmarkIds || s.bookmarkIds.indexOf(id) >= 0) &&
        (!s.eras || s.eras.indexOf(bm.era) >= 0) && (!bm.starts || bm.starts.indexOf(s.id) >= 0);
    });
    const scenario = offered.filter(function (s) { return s.profession === 'farmer'; })[0] || offered[0];
    if (!scenario) throw new Error('No ordinary start for bookmark ' + id);
    const allowed = bm.provinces.filter(function (p) { return FB.startProvinceAllowed(scenario, bm, p.id); });
    const storyPlaces = Object.keys(scenario.trackLocations || {}).reduce(function (ids, track) {
      return ids.concat(scenario.trackLocations[track]);
    }, []);
    const county = allowed.filter(function (p) { return storyPlaces.indexOf(p.id) >= 0; })[0] || allowed[0];
    if (!county) throw new Error('No available birthplace for ' + scenario.id + ' in bookmark ' + id);
    const declared = FB.provinceCommunities(county).filter(function (c) {
      return c.culture === scenario.startCulture && c.religion === scenario.startReligion;
    })[0];
    const culture = declared ? declared.culture : county.culture, faith = declared ? declared.religion : county.religion;
    const family = scenario.familyPresets ? Object.keys(scenario.familyPresets)[0] : 'established';
    const code = 'BOOKMARKSMOKE-' + id + '-' + scenario.id + '-' + county.id + '-m-Review-' + family;
    const nonPrincipal = culture !== county.culture || faith !== county.religion;
    return code + (nonPrincipal ? '-0-' + culture + '.' + faith : '');
  }, id);
  await page.locator('#btn-ng-back').click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await injectBrowserHarness(page);
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    delete FB.state.player.flags.tutorial;
  });
  expect(await page.evaluate(function () { return [FB.state.start.id, FB.state.seed]; })).toEqual([id, code]);
}

// The reference and candidate outputs are compared by SHA-256 digests made in
// the page. Returning the serialized state, catalogue and save to Node for
// each run costs more than the comparison itself.
function installOutputDigests() {
  window.outputDigests = function (texts) {
    return Promise.all(texts.map(function (text) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (hash) {
        return Array.from(new Uint8Array(hash)).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
      });
    }));
  };
}

// The shared office snapshot with the saved game reduced to its digest, in
// the same order; the reference and candidate saves are compared by digest.
async function outputSnapshot(page) {
  await page.evaluate(installOutputDigests);
  return page.evaluate(function () {
    const s = FB.state, offices = FB.religiousOffices(s), holders = {};
    Object.keys(offices).forEach(function (id) {
      const holder = FB.religiousOfficeSnapshot(s, id);
      holders[id] = holder && holder.id || null;
    });
    return outputDigests([FB.save.serialize(),JSON.stringify(FBDATA),JSON.stringify(FB.bookmarkRevisions(s.start.id))])
      .then(function (digests) {
        return { offices:offices, holders:holders, save:digests[0], data:digests[1], revisions:digests[2],
          signature:FB.mods.sig(), fingerprint:FB.mods.fingerprint(FB.campaignBookmark(s)), rng:FB.getRngState(), uid:FB.getUidCounter() };
      });
  });
}

for (const bookmark of ['476', '1096', '1204']) {
  test('unchanged incumbent and recognition readers preserve complete daily outputs in ' + bookmark, async function ({ page }, info) {
    const results = [];
    for (const reference of [true, false]) {
      await routeReaders(page, reference);
      await beginSetupDate(page, info, bookmark);
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
      const before = await outputSnapshot(page);
      await page.evaluate(function () { FB.game.passDay({deferUi:true}); });
      results.push({ reads:reads,before:before,after:await outputSnapshot(page) });
    }
    expect(results[1]).toEqual(results[0]);
  });
}

for (const crazygames of [false]) {
  test('papal reads validate once with live canonical claimants and guard cleanup in ' + (crazygames ? 'CrazyGames' : 'standard'), async function ({ page }, info) {
    const results = [];
    for (const reference of [true, false]) {
      await routeReaders(page,reference);
      // Both builds enter the same start code on the title, which prepares
      // only the public 1204 date as an ordinary unmodded start does.
      await useReviewStartRules(page);
      await openTitle(page,info);
      await startPreparedParityGame(page,{bookmark:'1204',code:'OFFICEREAD-1204-farmer-roma-m-Leo'});
      await page.evaluate(function () { delete FB.state.player.flags.tutorial; });
      await page.evaluate(installReadProbe);
      await page.evaluate(installOutputDigests);
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
        const identity = rng === FB.getRngState() && uid === FB.getUidCounter();
        return outputDigests([JSON.stringify(s),JSON.stringify(FBDATA),FB.save.serialize()]).then(function (digests) {
          return { checks:checks,scans:scans,identity:identity,state:digests[0],data:digests[1],save:digests[2] };
        });
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
    await beginSetupDate(page,info,'1204');
    await page.evaluate(installReadProbe);
    await page.evaluate(installOutputDigests);
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
      const texts = [FB.save.serialize(),JSON.stringify(FBDATA)], rng = FB.getRngState(), uid = FB.getUidCounter();
      return outputDigests(texts).then(function (digests) {
        return {checks:checks,scans:scans,save:digests[0],data:digests[1],rng:rng,uid:uid};
      });
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
