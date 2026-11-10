'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {scanSource} = require('../support/source-literals');
const imported = require('../fixtures/authoring/community-retention.json');

dependsOnRuntime(__filename, ['js/ledger_retention.js','js/religious_institutions.js','js/institutions.js',
  'js/world.js','js/model.js','js/authority.js','js/treasury.js','js/save.js','js/save_v4.js','js/mods.js',
  'data/religious_institutions.js','data/bookmark_493_world.js','data/map_data.js']);

async function start(page, info, mod) {
  if (mod) {
    await openGame(page, info); await prepareGameContent(page);
    const review = await page.evaluate(function (data) {
      const before = JSON.stringify([FBDATA, FB.getRngState(), FB.getUidCounter()]);
      const faults = FB.mods.validate(data), broken = JSON.parse(JSON.stringify(data));
      broken.religiousInstitutionProfiles.history_readers.retentionDays = 1;
      const rejected = FB.mods.validate(broken).length > 0;
      return {faults:faults, rejected:rejected, pure:before === JSON.stringify([FBDATA, FB.getRngState(), FB.getUidCounter()])};
    }, imported);
    expect(review).toEqual({faults:[], rejected:true, pure:true});
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/community-retention.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await beginBookmarkFromTitle(page, 'community_history');
  } else await beginBookmark(page, info, '493');
  await page.evaluate(function (mod) {
    FB.game.setPaused(true);
    const s = FB.state, iid = mod ? 'history_community' : 'ctesiphon_church_service_493';
    const def = FB.localInstitutionDefinitions(s)[iid];
    if (!def || !s.localInstitutions[iid]) throw new Error('Missing community: ' + iid);
    window.community = {
      id:iid, role:mod ? 'reader' : 'household',
      age:function () { const s = FB.state; s.turn += 12 * 360; s.date.year += 12; s.date.day = 1; },
      person:function (name) {
        const s = FB.state;
        const c = FB.makeCharacter(s, {name:name, religion:def.religion, culture:def.culture, sex:'m',
          born:s.date.year - 30, role:'notable', station:2});
        c.homeProvinceId = def.provinceId || def.jurisdictionIds[0]; return c;
      },
      member:function (c, status, changed) {
        FB.state.localInstitutions[iid].members[c.id] = {roleId:this.role, status:status, joinedTurn:0, changedTurn:changed};
      },
      act:function (c, action, terms) {
        const q = FB.religiousInstitutionQuote(FB.state, iid, {kind:'character',id:c.id}, action, terms || {});
        if (!q || !q.allowed || !FB.religiousInstitutionApply(FB.state,q)) throw new Error(action + ': ' + (q && q.reason));
        return q;
      },
      facts:function () {
        const t = FB.state;
        const people = {}, accounts = {};
        Object.keys(t.chars).sort().forEach(function (id) {
          const c = t.chars[id];
          people[id] = [c.id,c.name,c.sex,c.born,c.dead,c.died,c.culture,c.religion,c.homeProvinceId,
            c.religiousAffiliations,c.religiousActivity,c.religiousActivityHistory];
        });
        Object.keys(t.realms).sort().forEach(function (id) { accounts[id] = t.realms[id].treasury; });
        return JSON.parse(JSON.stringify({row:t.localInstitutions[iid], people:people, heads:t.religiousHeads, vacancies:t.religiousHeadVacancies,
          recognitions:t.authority && t.authority.recognitions, abbeys:t.abbeys, gold:t.player.gold, accounts:accounts,
          rng:FB.getRngState() >>> 0, uid:FB.getUidCounter()}));
      }
    };
  }, !!mod);
}

test('native membership continues beyond 64 historical people, folds at the window and restores twice', async function ({page}, info) {
  await start(page, info, false);
  const staged = await page.evaluate(function () {
    const H = community, s = FB.state; H.age();
    for (let n = 0; n < 80; n++) {
      const c = H.person('Former participant ' + n);
      H.member(c, n < 60 ? 'withdrawn' : 'active', n);
      if (n >= 60) { c.dead = true; c.died = s.date.year - 11; }
    }
    const keeper = H.person('Current participant'), recent = H.person('Recent withdrawal'), edge = H.person('Window edge');
    const young = H.person('Recent death'), newcomer = H.person('New participant');
    H.member(keeper,'active',0); H.member(recent,'withdrawn',FB.ledgerRetention.cutoff(s) + 1);
    H.member(edge,'withdrawn',FB.ledgerRetention.cutoff(s)); H.member(young,'active',0);
    young.dead = true; young.died = s.date.year - 1;
    const before = JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const q = FB.religiousInstitutionQuote(s,H.id,{kind:'character',id:newcomer.id},'admit',{roleId:H.role});
    const pure = before === JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    const admitted = FB.religiousInstitutionApply(s,q);
    FB.validateReligiousInstitutionState(s);
    H.keeper = keeper.id; H.recent = recent.id; H.young = young.id;
    return {pure:pure, admitted:admitted, count:Object.keys(s.localInstitutions[H.id].members).length,
      live:FB.religiousInstitutionLiveCounts(s,H.id), days:FB.ledgerRetention.days(), bytes:JSON.stringify(s.localInstitutions[H.id]).length,
      text:FB.save.serialize(), facts:H.facts()};
  });
  expect(staged).toMatchObject({pure:true, admitted:true, count:85, live:{members:2,decisions:0}, days:3600});
  // Load before folding: validation must not impose the old lifetime limit or prune on load.
  await restoreBookmark(page, staged.text);
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(staged.facts);
  const folded = await page.evaluate(function () {
    const s = FB.state, H = community, outsider = H.person('Next participant');
    const stale = FB.religiousInstitutionQuote(s,H.id,{kind:'character',id:outsider.id},'admit',{roleId:H.role});
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const resources = JSON.stringify([s.player.gold,s.realms,s.authority,s.abbeys,s.religiousHeads,s.religiousHeadVacancies]);
    const twin = JSON.parse(JSON.stringify(s));
    const changed = FB.religiousInstitutionCompact(s), matched = FB.religiousInstitutionCompact(twin);
    const once = JSON.stringify(s.localInstitutions), again = FB.religiousInstitutionCompact(s);
    const row = s.localInstitutions[H.id];
    const preserved = !!row.members[H.keeper] && !!row.members[H.recent] && !!row.members[H.young];
    const counts = {before:85, after:Object.keys(row.members).length, retired:row.retired, bytes:JSON.stringify(row).length};
    const pure = rng === FB.getRngState() && uid === FB.getUidCounter() &&
      resources === JSON.stringify([s.player.gold,s.realms,s.authority,s.abbeys,s.religiousHeads,s.religiousHeadVacancies]);
    const rejected = !FB.religiousInstitutionApply(s,stale);
    H.act(outsider,'admit',{roleId:H.role});
    FB.validateReligiousInstitutionState(s);
    return {changed:changed, matched:matched, deterministic:JSON.stringify(twin.localInstitutions) === once,
      idempotent:!again && JSON.stringify(row) === JSON.stringify(twin.localInstitutions[H.id]),
      preserved:preserved, counts:counts, pure:pure, stale:rejected, failure:FB.ledgerRetention.lastFailure,
      text:FB.save.serialize(), facts:H.facts()};
  });
  expect(folded).toMatchObject({changed:true, matched:true, deterministic:true, idempotent:true, preserved:true, pure:true, stale:true, failure:null,
    counts:{before:85,after:4,retired:{members:81,withdrawn:61,assents:0,decisions:0}}});
  expect(folded.counts.bytes).toBeLessThan(staged.bytes);
  console.log('Native community retained row: ' + staged.count + ' -> ' + folded.counts.after + ' members; ' +
    staged.bytes + ' -> ' + folded.counts.bytes + ' UTF-16 code units before the next admission.');
  await restoreBookmark(page, folded.text);
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(folded.facts);
  await restoreBookmark(page, await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(folded.facts);
});

test('imported consent continues beyond 16 ended targets and retains pending voters through repeated saves', async function ({page}, info) {
  await start(page, info, true);
  const staged = await page.evaluate(function () {
    const H = community, s = FB.state; H.age();
    const keeper = H.person('Reader'), peer = H.person('Other reader'), target = H.person('Pending recipient');
    H.act(keeper,'admit',{roleId:H.role}); H.act(peer,'admit',{roleId:H.role});
    H.act(keeper,'assent',{decision:'recognize',subject:{kind:'character',id:target.id}});
    H.act(peer,'assent',{decision:'recognize',subject:{kind:'character',id:target.id}});
    let r = s.localInstitutions[H.id];
    const key = 'recognize:character:' + target.id, control = r.assents[key][keeper.id].control;
    for (let n = 0; n < 70; n++) {
      const c = H.person('Former voter ' + n); c.dead = true; c.died = s.date.year - 11;
      H.member(c,'active',0); r.assents[key][c.id] = {turn:1,control:control};
    }
    for (let n = 0; n < 20; n++) {
      const c = H.person('Past recipient ' + n); c.dead = true; c.died = s.date.year - 11;
      r.assents['recognize:character:' + c.id] = {}; r.assents['recognize:character:' + c.id][keeper.id] = {turn:1,control:control};
    }
    // Temporary ineligibility cannot retire a still-living participant's consent.
    peer.exiled = true;
    const next = H.person('New recipient');
    H.act(keeper,'assent',{decision:'recognize',subject:{kind:'character',id:next.id}});
    r = s.localInstitutions[H.id];
    H.keeper = keeper.id; H.peer = peer.id; H.target = target.id; H.next = next.id; H.key = key;
    FB.validateReligiousInstitutionState(s);
    return {members:Object.keys(r.members).length, decisions:Object.keys(r.assents).length,
      live:FB.religiousInstitutionLiveCounts(s,H.id), days:FB.ledgerRetention.days(), bytes:JSON.stringify(r).length,
      text:FB.save.serialize(), facts:H.facts()};
  });
  expect(staged).toMatchObject({members:72, decisions:22, live:{members:2,decisions:2}, days:720});
  await restoreBookmark(page, staged.text);
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(staged.facts);
  const folded = await page.evaluate(function () {
    const H = community, s = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const before = JSON.stringify([s.player.gold,s.realms,s.authority,s.abbeys,s.religiousHeads,s.religiousHeadVacancies]);
    const changed = FB.religiousInstitutionCompact(s), r = s.localInstitutions[H.id];
    const counts = {members:Object.keys(r.members).length, decisions:Object.keys(r.assents).length,
      votes:Object.keys(r.assents[H.key]).length, bytes:JSON.stringify(r).length};
    const pure = rng === FB.getRngState() && uid === FB.getUidCounter() && before ===
      JSON.stringify([s.player.gold,s.realms,s.authority,s.abbeys,s.religiousHeads,s.religiousHeadVacancies]);
    s.chars[H.peer].exiled = false;
    H.act(s.chars[H.keeper],'recognize',{subject:{kind:'character',id:H.target},provinceId:'resource_hill',source:'institution_support'});
    FB.validateReligiousInstitutionState(s);
    const recognized = s.authority.recognitions.filter(function (v) { return v.issuer.id === H.id && v.subject.id === H.target; }).length;
    return {changed:changed, pure:pure, counts:counts, retired:r.retired, recognized:recognized,
      text:FB.save.serialize(), facts:H.facts(), failure:FB.ledgerRetention.lastFailure};
  });
  expect(folded).toMatchObject({changed:true, pure:true, failure:null, recognized:1,
    counts:{members:2,decisions:2,votes:2}, retired:{members:70,withdrawn:0,assents:90,decisions:20}});
  expect(folded.counts.bytes).toBeLessThan(staged.bytes);
  console.log('Imported community retained row: ' + staged.members + ' -> ' + folded.counts.members + ' members, ' +
    staged.decisions + ' -> ' + folded.counts.decisions + ' decisions; ' + staged.bytes + ' -> ' + folded.counts.bytes + ' UTF-16 code units.');
  await restoreBookmark(page, folded.text);
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(folded.facts);
  await restoreBookmark(page, await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return community.facts(); })).toEqual(folded.facts);
});

test('live limits, conservative references and atomic malformed-save rejection remain enforced', async function ({page}, info) {
  await start(page, info, true);
  const result = await page.evaluate(function () {
    const H = community, s = FB.state; H.age();
    const keeper = H.person('Reader'), departed = H.person('Departed reader'), unknown = H.person('Undated death');
    H.member(keeper,'active',0); H.member(departed,'withdrawn',0); H.member(unknown,'active',0); unknown.dead = true;
    const retained = FB.religiousInstitutionReferencesCharacter(s,departed.id) && FB.courtRecordRetained(s,departed);
    const copy = JSON.parse(JSON.stringify(s)); copy.date.day = 2;
    const offBoundary = !FB.religiousInstitutionCompact(copy);
    const closed = JSON.parse(JSON.stringify(s)); closed.localInstitutions[H.id].status = 'closed';
    FB.religiousInstitutionCompact(closed);
    const noReopen = closed.localInstitutions[H.id].status === 'closed';
    FB.religiousInstitutionCompact(s);
    const after = !FB.religiousInstitutionReferencesCharacter(s,departed.id) &&
      FB.religiousInstitutionReferencesCharacter(s,unknown.id) && !!s.localInstitutions[H.id].members[unknown.id];
    const absent = JSON.parse(JSON.stringify(s)); delete absent.localInstitutions;
    const noInit = !FB.religiousInstitutionCompact(absent) && absent.localInstitutions === undefined;
    const atCapacity = JSON.parse(JSON.stringify(s)), r = atCapacity.localInstitutions[H.id];
    for (let n = 0; n < 63; n++) {
      const c = H.person('Current reader ' + n); atCapacity.chars[c.id] = JSON.parse(JSON.stringify(c));
      r.members[c.id] = {roleId:H.role,status:'active',joinedTurn:0,changedTurn:0};
    }
    const outsider = H.person('Extra reader'); atCapacity.chars[outsider.id] = JSON.parse(JSON.stringify(outsider));
    const capped = !FB.religiousInstitutionQuote(atCapacity,H.id,{kind:'character',id:outsider.id},'admit',{roleId:H.role}).allowed;
    r.members[outsider.id] = {roleId:H.role,status:'active',joinedTurn:0,changedTurn:0};
    let rejected = false; try { FB.validateReligiousInstitutionState(atCapacity); } catch (e) { rejected = true; }
    const decisionCap = JSON.parse(JSON.stringify(s)), row = decisionCap.localInstitutions[H.id];
    for (let n = 0; n < 16; n++) {
      const c = H.person('Live recipient ' + n); decisionCap.chars[c.id] = JSON.parse(JSON.stringify(c));
      row.assents['recognize:character:' + c.id] = {}; row.assents['recognize:character:' + c.id][keeper.id] = {turn:s.turn,control:'original control'};
    }
    const target = H.person('Extra recipient'); decisionCap.chars[target.id] = JSON.parse(JSON.stringify(target));
    const consentCap = !FB.religiousInstitutionQuote(decisionCap,H.id,{kind:'character',id:keeper.id},'assent',
      {decision:'recognize',subject:{kind:'character',id:target.id}}).allowed;
    row.assents['recognize:character:' + target.id] = {}; row.assents['recognize:character:' + target.id][keeper.id] = {turn:s.turn,control:'original control'};
    let consentRejected = false; try { FB.validateReligiousInstitutionState(decisionCap); } catch (e) { consentRejected = true; }
    const failures = [], saved = JSON.parse(FB.save.serialize());
    [function (r) { r.retired.members = -1; }, function (r) { r.retired.extra = 1; },
      function (r) { r.retired.withdrawn = r.retired.members + 1; },
      function (r) { r.retired.assents = Number.MAX_SAFE_INTEGER + 1; },
      function (r) { r.members[keeper.id].changedTurn = s.turn + 1; },
      function (r) { r.assents['recognize:character:missing_person'] = {}; }
    ].forEach(function (mutate) {
      const forged = JSON.parse(JSON.stringify(saved)); mutate(forged.state.localInstitutions[H.id]);
      const before = JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),Object.assign({},localStorage)]);
      try { FB.save.restore(forged); failures.push(false); } catch (e) {
        failures.push(before === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),Object.assign({},localStorage)]));
      }
    });
    // A failed detached fold must not publish even the rows that could be removed.
    const invalid = JSON.parse(JSON.stringify(s)); invalid.localInstitutions[H.id].retired.members = -1;
    invalid.localInstitutions[H.id].members[departed.id] = {roleId:H.role,status:'withdrawn',joinedTurn:0,changedTurn:0};
    const original = JSON.stringify(invalid); const refused = !FB.religiousInstitutionCompact(invalid) && original === JSON.stringify(invalid);
    return {retained:retained,offBoundary:offBoundary,noReopen:noReopen,after:after,noInit:noInit,capped:capped,rejected:rejected,
      consentCap:consentCap,consentRejected:consentRejected,failures:failures,refused:refused};
  });
  expect(result).toEqual({retained:true,offBoundary:true,noReopen:true,after:true,noInit:true,capped:true,rejected:true,
    consentCap:true,consentRejected:true,failures:[true,true,true,true,true,true],refused:true});
});

test('membership engine retains exact reviewed content-id counts', function () {
  const root = path.resolve(__dirname,'../../..');
  const allowlist = JSON.parse(fs.readFileSync(path.join(root,'tests/e2e/fixtures/engine-ids/content-id-allowlist.json'),'utf8'));
  const entries = allowlist.hooks;
  // The other changed engine files add no quoted ids. Audit the module whose
  // literal counts change, without taking ownership of unrelated source hooks.
  ['js/religious_institutions.js'].forEach(function (file) {
    const counts = new Map();
    scanSource(fs.readFileSync(path.join(root,file),'utf8')).literals.forEach(function (r) { counts.set(r.value,(counts.get(r.value) || 0) + 1); });
    entries.forEach(function (entry) { expect(counts.get(entry.id) || 0, file + ': ' + entry.id).toBe((entry.uses || {})[file] || 0); });
  });
});
