'use strict';
const { test, expect } = require('../support/fixture');
test.describe.configure({mode:'parallel'});
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { installPageGuards } = require('../support/page-contract');
const { snapshot, routeReaders, installReadProbe, politicalOfficeMod, importOfficeMod } =
  require('../support/game/religious-office-tables');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/model.js', 'js/institutions.js', 'js/politics.js',
  'js/religious_institutions.js', 'js/systems.js', 'js/government_ecclesiastical.js',
  'js/government_selection.js', 'js/papacy.js', 'js/authority.js', 'js/ecclesiastical_strategies.js',
  'js/governments.js', 'js/government_support.js', 'js/world.js', 'js/mods.js', 'js/save.js',
  'js/save_v4.js', 'js/religion.js', 'data/cultures.js', 'data/systems.js',
  'data/ecclesiastical_profiles.js', 'data/religious_institutions.js', 'data/distribution_crazygames.js']);

/* Stores the office JSON exactly as the Mods screen stores it, before the first
   boot, so these cases prepare only the modded catalogue. The prepared office
   cases below keep the admission check and the file picker import. */
async function storeOfficeModBeforeBoot(page) {
  await page.addInitScript(function (text) {
    if (sessionStorage.getItem('officeModStored')) return;
    sessionStorage.setItem('officeModStored','1');
    localStorage.setItem('fb_mods',JSON.stringify([text]));
  },JSON.stringify(politicalOfficeMod));
}

for (const boundary of [false,true]) {
  test('political recognition shares one validation through ' + (boundary ? 'vacancy, accession and restore' : 'live consent and qualification'), async function ({ page }, info) {
    await routeReaders(page,false);
    await storeOfficeModBeforeBoot(page);
    await openGame(page,info);
    expect(await page.evaluate(function () { return FB.mods.count(); })).toBe(1);
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
      // No assertion reads a catalogue copy, so the whole catalogue never travels to Node.
      return {checks:checks,scans:scans,save:FB.save.serialize(),
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

// Each ordinary import owns its context; cold catalogue preparation has its
// own bounded hook before the replacement/removal and reader assertions.
function preparedOfficeCase(title,body) {
  test.describe(title,function () {
    let context,page,guard,baseline;
    test.beforeAll(async function ({browser},info) {
      context=await browser.newContext();page=await context.newPage();guard=installPageGuards(page);
      await routeReaders(page,false);await openGame(page,info);
      baseline=await page.evaluate(function () {
        return {offices:FB.religiousOffices(null),data:FB.mods.fingerprint(JSON.stringify(FBDATA)),signature:FB.mods.sig()};
      });
    });
    test.beforeAll(async function () {await importOfficeMod(page,politicalOfficeMod);});
    test.afterAll(async function () {
      if(context)try {expect(guard.faults).toEqual([]);}finally {await context.close();}
    });
    test('preserves complete reader outputs',async function () {await body(page,baseline);});
  });
}

for (const replaceOffice of [true,false]) {
  preparedOfficeCase('JSON office ' + (replaceOffice ? 'replacement and rejected rollback' : 'removal') + ' preserves unchanged-reader outputs', async function (page,baseline) {
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
