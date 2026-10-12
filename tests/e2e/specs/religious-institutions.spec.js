'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/religious_institutions.js', 'data/political_institutions.js',
  'data/cultures.js', 'data/technology.js', 'js/religious_institutions.js',
  'js/model.js', 'js/world.js', 'js/authority.js', 'js/institutions.js',
  'js/local_office_appointments.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/treasury.js', 'js/abbeys.js', 'js/justice.js', 'js/intrigue.js', 'js/systems.js'
]);

/* Fictional houses exercise contracts; they make no historical placement claim. */
function installInstitutions() {
  var s = FB.state, pid = s.player.provinceId, site = FB.world.sitesByProv[pid].list[0].site;
  var patron = FB.settlementCountyHolder(s, pid);
  function role(name, restricted) {
    return { name:name, minAge:restricted ? 20 : 18, sexes:restricted ? ['f'] : [],
      unmarried:!!restricted, professions:[], skills:{ int:3 }, affiliationId:null };
  }
  function profile(name, faith, policy, restricted) {
    return { name:name, faithIds:[faith], period:{ yearMin:1, yearMax:null }, system:null,
      roles:{ specialist:role('Specialist', restricted), learner:role('Learner', false) },
      selection:policy ? { strategy:'appointment', policy:policy, roleId:'specialist',
        consentRoles:['specialist','learner'], quorum:policy === 'members' ? 2 : 0 } : null,
      recognition:{ sources:['institution_support'], roles:['specialist'], quorum:1,
        requiresLeader:policy === 'patron', protectedWorship:true },
      actions:policy ? ['admit','affiliate','appoint','recognize','dispute','withdraw','mediate','vacate','assent'] :
        ['admit','affiliate','recognize','dispute','withdraw','mediate','assent'],
      fees:{}, affiliationIds:['test_learning','test_other_learning'] };
  }
  FBDATA.religions.test_lantern = { name:'Fictional Lantern Tradition', parent:'jewish',
    availability:{}, properties:{ head:null } };
  FB.invalidateReligionData();
  ['test_learning','test_other_learning'].forEach(function (aid, i) {
    FBDATA.religiousAffiliations[aid] = { name:i ? 'Other fictional teaching' : 'Fictional teaching',
      faithIds:['catholic','jewish','test_lantern'], period:{ yearMin:1, yearMax:null },
      exclusiveWith:[i ? 'test_learning' : 'test_other_learning'] };
  });
  FBDATA.religiousInstitutionProfiles.test_house = profile('Fictional religious house', 'catholic', 'patron', true);
  FBDATA.religiousInstitutionProfiles.test_school = profile('Fictional communal school', 'jewish', 'members', false);
  FBDATA.religiousInstitutionProfiles.test_lantern = profile('Fictional ritual community', 'test_lantern', null, false);
  var defs = Object.assign({}, FB.localInstitutionDefinitions(s));
  defs.test_house = { city:'Fictional riverside house', kind:'monastery', provinceId:pid, site:site,
    religion:'catholic', culture:'frankish', profileId:'test_house', officeId:'test_house_office',
    vacant:true, jurisdictionIds:[pid] };
  defs.test_school = { city:'Fictional communal school', kind:'school', provinceId:null, site:null,
    offMap:true, religion:'jewish', culture:'frankish', profileId:'test_school',
    officeId:'test_school_office', vacant:true, jurisdictionIds:[pid] };
  defs.test_lantern = { city:'Fictional lantern community', kind:'ritual_community', provinceId:pid, site:site,
    religion:'test_lantern', culture:'frankish', profileId:'test_lantern', vacant:true, jurisdictionIds:[pid] };
  var raw = FBDATA.bookmarks[s.start.id];
  if (raw.revisions) raw.revisions[s.start.revision || 'baseline'].localInstitutions = defs;
  else raw.localInstitutions = defs;
  s.localInstitutions = s.localInstitutions || {};
  s.religiousHeads = s.religiousHeads || {};
  s.religiousHeadVacancies = s.religiousHeadVacancies || {};
  ['test_house','test_school','test_lantern'].forEach(function (iid) {
    s.localInstitutions[iid] = FB.religiousInstitutionOpeningRow(iid, defs[iid]);
    if (defs[iid].officeId) {
      s.religiousHeads[defs[iid].officeId] = null;
      s.religiousHeadVacancies[defs[iid].officeId] = { turn:s.turn, formerHolder:null };
    }
  });
  function person(name, faith, sex) {
    var c = FB.makeCharacter(s, { name:name, religion:faith, culture:'frankish', sex:sex,
      born:s.date.year - 30, role:'notable', station:2 });
    c.skills.int = 8; c.homeProvinceId = pid; c.spouseId = null;
    return c.id;
  }
  window.institutionFixture = { pid:pid, patron:patron, house:person('Fictional Resident', 'catholic', 'f'),
    teacher:person('Fictional Teacher', 'jewish', 'm'), pupil:person('Fictional Pupil', 'jewish', 'f'),
    lantern:person('Fictional Ritualist', 'test_lantern', 'f') };
  window.institutionAct = function (iid, actor, action, terms) {
    var q = FB.religiousInstitutionQuote(FB.state, iid, actor, action, terms || {});
    if (!q || !q.allowed) throw new Error(action + ': ' + (q && q.reason));
    if (!FB.religiousInstitutionApply(FB.state, q)) throw new Error('Apply rejected ' + action);
    return q;
  };
}
test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(installInstitutions);
});

test('independent patron, headless school and fictional leaderless profiles validate through mods', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, bookmark = FB.campaignBookmark(s);
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var mod = { religiousAffiliations:FBDATA.religiousAffiliations,
      religiousInstitutionProfiles:FBDATA.religiousInstitutionProfiles };
    return { catalog:FB.religiousInstitutionCatalogFaults(FBDATA),
      seats:FB.localInstitutionDefinitionFaults(bookmark), mod:FB.mods.validate(mod),
      headless:FB.religionOf('jewish', s).head === null, office:FB.religiousOffices(s).test_school_office.head.succession,
      leaderless:!FB.religiousInstitutionSnapshot(s, 'test_lantern').definition.officeId,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ catalog:[], seats:[], mod:[], headless:true, office:'appointment', leaderless:true, pure:true });
});

test('repeated reviews leave state, RNG, ids, money and canonical support unchanged', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.house };
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter(), first;
    for (var i = 0; i < 10; i++) {
      var q = FB.religiousInstitutionQuote(s, 'test_house', actor, 'admit', { roleId:'specialist' });
      if (!first) first = JSON.stringify(q);
      if (first !== JSON.stringify(q)) return false;
      FB.religiousInstitutionSnapshot(s, 'test_house'); FB.religiousOfficeSnapshot(s, 'test_house_office');
    }
    return before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
  });
  expect(result).toBe(true);
});

test('membership and scoped incompatible affiliations never convert people or communities', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.teacher };
    var faiths = JSON.stringify({ faiths:s.faiths, communities:s.communities, player:s.player.religion });
    institutionAct('test_school', actor, 'admit', { roleId:'specialist' });
    institutionAct('test_school', actor, 'affiliate', { affiliationId:'test_learning' });
    var blocked = FB.religiousInstitutionQuote(s, 'test_school', actor, 'affiliate', { affiliationId:'test_other_learning' });
    var rejected = !FB.religiousInstitutionApply(s, blocked);
    institutionAct('test_school', actor, 'withdraw', { affiliationId:'test_learning' });
    return { faith:s.chars[f.teacher].religion, blocked:blocked.reason, rejected:rejected,
      member:s.localInstitutions.test_school.members[f.teacher].status,
      affiliations:s.chars[f.teacher].religiousAffiliations,
      unchanged:faiths === JSON.stringify({ faiths:s.faiths, communities:s.communities, player:s.player.religion }) };
  });
  expect(result).toEqual({ faith:'jewish', blocked:'affiliation', rejected:true, member:'active', affiliations:[], unchanged:true });
});

test('declared household restrictions differ and specialist progression requires its actual affiliation', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture;
    s.chars[f.house].spouseId = f.teacher; s.chars[f.teacher].spouseId = f.house;
    var house = FB.religiousInstitutionRoleEligibility(s, 'test_house', f.house, 'specialist');
    var school = FB.religiousInstitutionRoleEligibility(s, 'test_school', f.teacher, 'specialist');
    FBDATA.religiousInstitutionProfiles.test_school.roles.specialist.affiliationId = 'test_learning';
    var actor = { kind:'character', id:f.teacher };
    var missing = FB.religiousInstitutionQuote(s, 'test_school', actor, 'admit', { roleId:'specialist' }).reason;
    institutionAct('test_school', actor, 'admit', { roleId:'learner' });
    institutionAct('test_school', actor, 'affiliate', { affiliationId:'test_learning' });
    institutionAct('test_school', actor, 'admit', { roleId:'specialist' });
    return { house:house, school:school, missing:missing, role:s.localInstitutions.test_school.members[f.teacher].roleId,
      profession:s.chars[f.teacher].role };
  });
  expect(result).toEqual({ house:false, school:true, missing:'qualification', role:'specialist', profession:'notable' });
});

for (const institution of ['test_house','test_school']) {
  test(institution + ' appointment, disputed recognition and vacancy change canonical consumers', async function ({ page }) {
    const result = await page.evaluate(function (iid) {
      var s = FB.state, f = institutionFixture, house = iid === 'test_house';
      var cid = house ? f.house : f.teacher, actor = { kind:'character', id:cid };
      var oid = house ? 'test_house_office' : 'test_school_office';
      var otherHeads = JSON.stringify(Object.keys(s.religiousHeads).filter(function (id) { return id !== oid; }).map(function (id) { return [id, s.religiousHeads[id]]; }));
      institutionAct(iid, actor, 'admit', { roleId:'specialist' });
      if (!house) {
        institutionAct(iid, { kind:'character', id:f.pupil }, 'admit', { roleId:'learner' });
        [cid, f.pupil].forEach(function (voter) {
          institutionAct(iid, { kind:'character', id:voter }, 'assent', { decision:'appoint', subject:{ kind:'character', id:cid } });
        });
      }
      var selector = house ? { kind:'realm', id:f.patron } : actor;
      institutionAct(iid, selector, 'appoint', { candidateId:cid });
      var appointed = FB.religiousOfficeSnapshot(s, oid).id;
      var terms = { subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' };
      institutionAct(iid, actor, 'recognize', terms);
      var recognized = FB.political.legitimacy(s, terms.subject, { kind:'county', id:f.pid }, terms.source)[0];
      var rights = s.authority.rights.length;
      institutionAct(iid, actor, 'dispute', Object.assign({}, terms, { recognitionId:recognized.id }));
      var disputed = FB.political.legitimacy(s, terms.subject, { kind:'county', id:f.pid }, terms.source).length;
      institutionAct(iid, actor, 'mediate', terms);
      institutionAct(iid, actor, 'vacate');
      return { appointed:appointed === cid, disputed:disputed,
        vacant:FB.religiousOfficeSnapshot(s, oid) === null && FB.religiousInstitutionSnapshot(s, iid).vacant,
        member:s.localInstitutions[iid].members[cid].status, rightsUnchanged:rights === s.authority.rights.length,
        legacy:otherHeads === JSON.stringify(Object.keys(s.religiousHeads).filter(function (id) { return id !== oid; }).map(function (id) { return [id, s.religiousHeads[id]]; })) };
    }, institution);
    expect(result).toEqual({ appointed:true, disputed:0, vacant:true, member:'active', rightsUnchanged:true, legacy:true });
  });
}

test('a school committee needs individual current assent and cannot appoint by claiming other votes', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.teacher };
    institutionAct('test_school', actor, 'admit', { roleId:'specialist' });
    var missing = FB.religiousInstitutionQuote(s, 'test_school', actor, 'appoint', { candidateId:f.teacher }).reason;
    var forged = FB.religiousInstitutionQuote(s, 'test_school', actor, 'appoint', { candidateId:f.teacher, consentIds:[f.teacher, f.pupil] });
    institutionAct('test_school', actor, 'assent', { decision:'appoint', subject:actor });
    var one = FB.religiousInstitutionQuote(s, 'test_school', actor, 'appoint', { candidateId:f.teacher });
    return { missing:missing, forged:forged.allowed, required:one.consent.required, voices:one.consent.characterIds.length, allowed:one.allowed };
  });
  expect(result).toEqual({ missing:'consent', forged:false, required:2, voices:1, allowed:false });
});

for (const change of ['faith','death','occupation','holder','office','profile','funds','household','captivity']) {
  test('stale ' + change + ' rejects before charging or writing membership', async function ({ page }) {
    const result = await page.evaluate(function (change) {
      var s = FB.state, f = institutionFixture, c = s.chars[s.player.charId];
      c.religion = 'catholic'; c.sex = 'f'; c.born = s.date.year - 30; c.spouseId = null; c.skills.int = 8;
      s.player.gold = 20; FBDATA.religiousInstitutionProfiles.test_house.fees.admit = 3;
      var q = FB.religiousInstitutionQuote(s, 'test_house', { kind:'character', id:c.id }, 'admit', { roleId:'specialist' });
      if (!q.allowed) throw new Error(q.reason);
      if (change === 'faith') c.religion = 'jewish';
      if (change === 'death') c.dead = true;
      if (change === 'occupation') s.owner[f.pid] = Object.keys(s.realms).filter(function (rid) { return s.realms[rid].alive && rid !== FB.topRealm(s, f.patron); })[0];
      if (change === 'holder') s.holder[f.pid] = Object.keys(s.realms).filter(function (rid) { return s.realms[rid].alive && rid !== f.patron; })[0];
      if (change === 'office') s.religiousHeads.test_house_office = f.house;
      if (change === 'profile') FBDATA.religiousInstitutionProfiles.test_house.roles.specialist.minAge = 40;
      if (change === 'funds') s.player.gold = 0;
      if (change === 'household') c.spouseId = f.teacher;
      if (change === 'captivity') s.player.flags.in_prison = true;
      var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      return { rejected:!FB.religiousInstitutionApply(s, q), unchanged:before === JSON.stringify(s),
        pure:rng === FB.getRngState() && uid === FB.getUidCounter() };
    }, change);
    expect(result).toEqual({ rejected:true, unchanged:true, pure:true });
  });
}

test('death suspends spiritual eligibility and support before explicit vacancy administration', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.house };
    institutionAct('test_house', actor, 'admit', { roleId:'specialist' });
    institutionAct('test_house', { kind:'realm', id:f.patron }, 'appoint', { candidateId:f.house });
    var terms = { subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' };
    institutionAct('test_house', actor, 'recognize', terms);
    s.chars[f.house].dead = true;
    var suspended = FB.political.legitimacy(s, terms.subject, { kind:'county', id:f.pid }, terms.source).length === 0;
    var empty = FB.religiousOfficeSnapshot(s, 'test_house_office') === null;
    institutionAct('test_house', { kind:'realm', id:f.patron }, 'vacate');
    return { suspended:suspended, empty:empty, former:s.religiousHeadVacancies.test_house_office.formerHolder === f.house };
  });
  expect(result).toEqual({ suspended:true, empty:true, former:true });
});

test('a paid admission commits once and an authority failure commits neither cost nor support', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, c = s.chars[s.player.charId], actor = { kind:'character', id:c.id };
    c.religion = 'test_lantern'; c.skills.int = 8; c.born = s.date.year - 30; s.player.gold = 20;
    FBDATA.religiousInstitutionProfiles.test_lantern.fees.admit = 3;
    FBDATA.religiousInstitutionProfiles.test_lantern.fees.recognize = 4;
    var q = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'admit', { roleId:'specialist' });
    var paid = FB.religiousInstitutionApply(s, q), twice = FB.religiousInstitutionApply(s, q), gold = s.player.gold;
    var support = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'recognize', {
      subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' });
    if (!support.allowed) throw new Error(support.reason);
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter(), original = FB.authorityRecognize, failed;
    try {
      FB.authorityRecognize = function () { return null; };
      failed = !FB.religiousInstitutionApply(s, support);
    } finally { FB.authorityRecognize = original; }
    return { paid:paid, twice:twice, gold:gold, failed:failed,
      atomic:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ paid:true, twice:false, gold:17, failed:true, atomic:true });
});

test('mixed-community protection and declared jurisdiction gate mediation without changing population', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.lantern };
    institutionAct('test_lantern', actor, 'admit', { roleId:'specialist' });
    var terms = { subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' };
    var reviewed = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'mediate', terms);
    if (!reviewed.allowed) throw new Error(reviewed.reason);
    var outsider = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'mediate', Object.assign({}, terms, { provinceId:'unknown_county' }));
    var population = JSON.stringify(s.communities);
    FB.authoritySetIdentity(s, f.patron, { eliteCultureId:'frankish', eliteFaithId:'catholic',
      legalIdentityId:'latin', tolerance:'persecution', taxation:'equal', justicePolicy:'personal' });
    var before = JSON.stringify(s), rejected = !FB.religiousInstitutionApply(s, reviewed);
    var blocked = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'mediate', terms);
    return { outside:outsider.reason, blocked:blocked.reason, rejected:rejected,
      atomic:before === JSON.stringify(s), population:population === JSON.stringify(s.communities) };
  });
  expect(result).toEqual({ outside:'scope', blocked:'protection', rejected:true, atomic:true, population:true });
});

test('a patron review cannot appoint a candidate who dies after consent', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture;
    institutionAct('test_house', { kind:'character', id:f.house }, 'admit', { roleId:'specialist' });
    var q = FB.religiousInstitutionQuote(s, 'test_house', { kind:'realm', id:f.patron }, 'appoint', { candidateId:f.house });
    if (!q.allowed) throw new Error(q.reason);
    s.chars[f.house].dead = true;
    var before = JSON.stringify(s);
    return !FB.religiousInstitutionApply(s, q) && before === JSON.stringify(s) && s.religiousHeads.test_house_office === null;
  });
  expect(result).toBe(true);
});

test('loss of worship protection suspends existing scoped support without revoking property or faith', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.lantern };
    institutionAct('test_lantern', actor, 'admit', { roleId:'specialist' });
    var terms = { subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' };
    institutionAct('test_lantern', actor, 'mediate', terms);
    var scope = { kind:'county', id:f.pid }, before = FB.political.legitimacy(s, terms.subject, scope, terms.source).length;
    var property = JSON.stringify(s.abbeys), faith = s.chars[f.lantern].religion;
    FB.authoritySetIdentity(s, f.patron, { eliteCultureId:'frankish', eliteFaithId:'catholic',
      legalIdentityId:'latin', tolerance:'persecution', taxation:'equal', justicePolicy:'personal' });
    return { before:before, after:FB.political.legitimacy(s, terms.subject, scope, terms.source).length,
      property:property === JSON.stringify(s.abbeys), faith:faith === s.chars[f.lantern].religion,
      retained:s.authority.recognitions.filter(function (r) { return r.issuer.kind === 'religious-institution'; })[0].status };
  });
  expect(result).toEqual({ before:1, after:0, property:true, faith:true, retained:'active' });
});

test('member, affiliation and outstanding-decision limits reject without partial writes', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, members = s.localInstitutions.test_school.members;
    for (var i = 0; i < 64; i++) {
      var cid = 'test_retained_' + i;
      s.chars[cid] = { id:cid, dead:true };
      members[cid] = { roleId:'learner', status:'withdrawn', joinedTurn:0, changedTurn:0 };
    }
    var full = FB.religiousInstitutionQuote(s, 'test_school', { kind:'character', id:f.teacher }, 'admit', { roleId:'specialist' });
    var actor = { kind:'character', id:f.lantern };
    institutionAct('test_lantern', actor, 'admit', { roleId:'specialist' });
    s.chars[f.lantern].religiousAffiliations = [];
    for (var n = 0; n < 8; n++) {
      var aid = 'test_external_' + n;
      FBDATA.religiousAffiliations[aid] = { name:'Fictional external teaching', faithIds:['test_lantern'],
        period:{ yearMin:1, yearMax:null }, exclusiveWith:[] };
      s.chars[f.lantern].religiousAffiliations.push({ id:aid, institutionId:null });
    }
    var aff = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'affiliate', { affiliationId:'test_learning' });
    var targets = Object.keys(s.realms).filter(function (rid) { return s.realms[rid].alive; });
    for (var v = 0; v < 16; v++) s.localInstitutions.test_lantern.assents['recognize:realm:' + targets[v]] = {};
    var assent = FB.religiousInstitutionQuote(s, 'test_lantern', actor, 'assent', { decision:'recognize', subject:{ kind:'realm', id:targets[16] } });
    var before = JSON.stringify(s);
    return { members:full.reason, affiliations:aff.reason, decisions:assent.reason,
      atomic:!FB.religiousInstitutionApply(s, full) && !FB.religiousInstitutionApply(s, aff) &&
        !FB.religiousInstitutionApply(s, assent) && before === JSON.stringify(s) };
  });
  expect(result).toEqual({ members:'membership', affiliations:'affiliation', decisions:'consent_bound', atomic:true });
});

test('withdrawal leaves the abbey ledger, household assets, followers and institution intact', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.house };
    s.abbeys = s.abbeys || { v:1, houses:[] };
    var h = { id:'test_endowment', provinceId:f.pid, capital:30, treasury:12, plots:[{ owner:f.house }], holderId:null };
    s.abbeys.houses.push(h); FB.localInstitutionDefinitions(s).test_house.abbeyId = h.id;
    institutionAct('test_house', actor, 'admit', { roleId:'specialist' });
    institutionAct('test_house', { kind:'realm', id:f.patron }, 'appoint', { candidateId:f.house });
    var assets = JSON.stringify({ abbeys:s.abbeys, player:s.player, faiths:s.faiths, communities:s.communities });
    var person = JSON.stringify(s.chars[f.house]);
    institutionAct('test_house', actor, 'withdraw');
    return { assets:assets === JSON.stringify({ abbeys:s.abbeys, player:s.player, faiths:s.faiths, communities:s.communities }),
      person:person === JSON.stringify(s.chars[f.house]), house:s.abbeys.houses.indexOf(h) >= 0,
      withdrawn:s.localInstitutions.test_house.members[f.house].status,
      vacant:FB.religiousOfficeSnapshot(s, 'test_house_office') === null };
  });
  expect(result).toEqual({ assets:true, person:true, house:true, withdrawn:'withdrawn', vacant:true });
});

test('schema errors and unknown affiliation, profile, role, office and jurisdiction references fail closed', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, failures = [];
    var profiles = JSON.parse(JSON.stringify(FBDATA.religiousInstitutionProfiles));
    profiles.test_school.selection.strategy = 'papal_election';
    failures.push(FB.mods.validate({ religiousInstitutionProfiles:profiles }).length > 0);
    profiles.test_school = JSON.parse(JSON.stringify(FBDATA.religiousInstitutionProfiles.test_school));
    profiles.test_school.roles.specialist.unmarried = 'yes';
    failures.push(FB.mods.validate({ religiousInstitutionProfiles:profiles }).length > 0);
    var definition = JSON.parse(JSON.stringify(FB.campaignBookmark(s)));
    definition.localInstitutions.test_school.officeId = definition.localInstitutions.test_house.officeId;
    failures.push(FB.localInstitutionDefinitionFaults(definition).length > 0);
    definition.localInstitutions.test_school.profileId = 'missing_profile';
    failures.push(FB.localInstitutionDefinitionFaults(definition).length > 0);
    [function (v) { v.chars[f.teacher].religiousAffiliations = [{ id:'missing_affiliation', institutionId:null }]; },
      function (v) { v.localInstitutions.test_school.members[f.teacher] = { roleId:'missing_role', status:'active', joinedTurn:0, changedTurn:0 }; },
      function (v) { v.localInstitutions.test_school.members = []; },
      function (v) { v.chars[f.teacher].religiousAffiliations = new Array(9).fill({ id:'test_learning', institutionId:'test_school' }); }
    ].forEach(function (corrupt) {
      var detached = JSON.parse(JSON.stringify(s)); corrupt(detached);
      try { FB.validateReligiousInstitutionState(detached); failures.push(false); } catch (e) { failures.push(true); }
    });
    return failures;
  });
  expect(result).toEqual([true,true,true,true,true,true,true,true]);
});

test('new opening records remain absent from a retained campaign and legacy action APIs cannot bypass profiles', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.house };
    var legacyQuote = FB.localOfficeQuote(s, 'test_house', 'appoint', { candidateId:f.house });
    var bargain = FB.localInstitutionQuote(s, 'test_house', { kind:'realm', id:f.patron }, 'petition', {});
    var mediation = FB.localInstitutionMediationQuote(s, 'test_house', { kind:'realm', id:f.patron }, f.pid);
    delete s.localInstitutions.test_house;
    var before = Object.keys(s.chars).length, rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.ensureLocalInstitutions(s);
    return { legacy:legacyQuote, bargain:bargain.allowed, mediation:mediation.allowed,
      absent:!s.localInstitutions.test_house, optional:s.chars[actor.id].religiousAffiliations === undefined,
      noPeople:before === Object.keys(s.chars).length && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ legacy:null, bargain:false, mediation:false, absent:true, optional:true, noPeople:true });
});

test('a new profile-only opening creates vacant institution records without people or affiliations', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, raw = FBDATA.bookmarks[s.start.id], definitions = FB.localInstitutionDefinitions(s), subset = {};
    ['test_house','test_school','test_lantern'].forEach(function (id) { subset[id] = definitions[id]; });
    if (raw.revisions) raw.revisions[s.start.revision || 'baseline'].localInstitutions = subset;
    else raw.localInstitutions = subset;
    var opening = JSON.parse(JSON.stringify(s)); delete opening.localInstitutions;
    var people = JSON.stringify(opening.chars), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.ensureLocalInstitutions(opening);
    return { count:Object.keys(opening.localInstitutions).length,
      vacant:opening.religiousHeads.test_house_office === null && opening.religiousHeads.test_school_office === null,
      empty:Object.keys(opening.localInstitutions.test_school.members).length === 0,
      noPeople:people === JSON.stringify(opening.chars) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ count:3, vacant:true, empty:true, noPeople:true });
});

test('optional memberships, affiliation and canonical recognition survive detached v4 validation', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, actor = { kind:'character', id:f.lantern };
    institutionAct('test_lantern', actor, 'admit', { roleId:'specialist' });
    institutionAct('test_lantern', actor, 'affiliate', { affiliationId:'test_learning' });
    institutionAct('test_lantern', actor, 'recognize', { subject:{ kind:'realm', id:f.patron },
      provinceId:f.pid, source:'institution_support' });
    var detached = JSON.parse(JSON.stringify(s));
    var before = JSON.stringify(detached), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.save.v4.validatePlatform(detached); FB.save.v4.validateAuthority(detached.authority, detached);
    return before === JSON.stringify(detached) && rng === FB.getRngState() && uid === FB.getUidCounter();
  });
  expect(result).toBe(true);
});
