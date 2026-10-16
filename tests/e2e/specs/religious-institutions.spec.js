'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { startHistoricalGame } = require('../support/game/historical-start');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/religious_institutions.js', 'data/political_institutions.js', 'data/ecclesiastical_profiles.js',
  'data/cultures.js', 'data/technology.js', 'js/religious_institutions.js',
  'js/model.js', 'js/world.js', 'js/authority.js', 'js/institutions.js',
  'js/local_office_appointments.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js',
  'js/treasury.js', 'js/abbeys.js', 'js/justice.js', 'js/intrigue.js', 'js/systems.js',
  'data/actions.js', 'data/economy.js', 'data/lexicons.js', 'data/systems.js',
  'data/distribution_crazygames.js', 'js/actions.js', 'js/economy.js', 'js/events.js',
  'js/governments.js', 'js/government_administration.js', 'js/government_ecclesiastical.js',
  'js/ecclesiastical_strategies.js', 'js/ecclesiastical_validation.js', 'js/government_selection.js',
  'js/government_recognition.js', 'js/papacy.js', 'js/lexicon.js',
  'js/ui_misc.js', 'js/ui_ecclesiastical.js', 'js/ui_religious_institutions.js',
  'js/main.js', 'js/i18n.js', 'js/crazygames.js', 'js/station.js', 'js/progression.js',
  'js/politics.js', 'js/religion.js', 'js/messages.js', 'css/style.css'
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
  /* Start from this world's own seats; the legacy global table belongs to 476. */
  var own = FB.campaignBookmark(s).localInstitutions;
  var defs = Object.assign({}, own !== undefined ? own : {});
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
  if (testInfo.title.includes('CrazyGames restore')) {
    await startHistoricalGame(page, testInfo, { bookmark:'867', code:'CADENCE-867-farmer-london-f-Ada' }, true);
  } else {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
  }
  await page.evaluate(function () { FB.game.setPaused(true); });
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
      headless:!FB.religionOf('jewish', s).head, office:FB.religiousOffices(s).test_school_office.head.succession,
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

test('detached temporal office validation uses the declared opening year', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, bookmark = FB.campaignBookmark(s), year = s.date.year;
    FBDATA.ecclesiasticalProfiles.test_profile_temporal = Object.assign({}, FBDATA.ecclesiasticalProfiles.sanctuary_temporal,
      { name:'Fictional temporal binding', source:'institution_profile', chapter:false,
        appointmentCost:0, layRecognition:false });
    FBDATA.religiousInstitutionProfiles.test_school.period = { yearMin:year, yearMax:year };
    var realm = { id:'test_temporal', ecclesiastical:{ profileId:'test_profile_temporal',
      officeId:'test_school_office', institutionId:'test_school' } };
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var valid = FB.ecclesiasticalGovernment.definitionFaults(realm, 'ecclesiastical_principality', bookmark);
    var expired = FB.ecclesiasticalGovernment.definitionFaults(realm, 'ecclesiastical_principality',
      Object.assign({}, bookmark, { date:Object.assign({}, bookmark.date, { year:year + 1 }) }));
    return { valid:valid, expired:expired,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ valid:[], expired:['invalid religious office reference'], pure:true });
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

function installHouseholdRoutes() {
  FBDATA.religiousPaths.test_household_lay = { kind:'lay', faiths:['jewish'], ranks:[
    { id:'participant', name:'Community Participant', pietyYield:0 },
    { id:'helper', name:'Community Helper', age:18, gold:2, pietyYield:0 }
  ] };
  FBDATA.religiousPaths.test_household_teacher = { kind:'vocation', faiths:['jewish'], professions:['priest'], ranks:[
    { id:'student', name:'Teaching Student', pietyYield:0 },
    { id:'teacher', name:'Community Teacher', age:18, gold:3, pietyYield:0 }
  ] };
  var p = FBDATA.religiousInstitutionProfiles.test_school;
  p.roles.learner.pathId = 'test_household_lay';
  p.roles.specialist.name = 'Community Teacher';
  p.roles.specialist.careerIds = ['priest'];
  p.roles.specialist.pathId = 'test_household_teacher';
  FBDATA.religions.jewish.properties = Object.assign({}, FBDATA.religions.jewish.properties,
    { religiousPaths:null, clergyMarriage:true });
  FB.invalidateReligionData();
  var s = FB.state, c = s.chars[s.player.charId];
  c.religion = s.player.religion = 'jewish'; c.skills.int = 8; c.born = s.date.year - 30;
  s.player.piety = 100; s.player.gold = 100;
}

test('headless lay and specialist routes grant declared work and titles without inventing an office', async function ({ page }) {
  await page.evaluate(installHouseholdRoutes);
  const result = await page.evaluate(function () {
    var s = FB.state, c = s.chars[s.player.charId], actor = { kind:'character', id:c.id };
    var heads = JSON.stringify(s.religiousHeads), abbeys = JSON.stringify(s.abbeys);
    var denied = !FB.religiousCareerReview(s, c, 'priest').allowed;
    institutionAct('test_school', actor, 'admit', { roleId:'learner' });
    var lay = FB.religiousPathOf(s, c).id, originalWork = s.player.profession;
    var layAdvance = FB.takeReligiousStep(s, c);
    institutionAct('test_school', actor, 'admit', { roleId:'specialist' });
    var offered = FB.careerChoices(s, c).some(function (choice) { return choice.id === 'priest'; });
    var chosen = FB.setCareer(s, c, 'priest', 'journeyman'), title = FB.careerTitle(s, c);
    var vocation = FB.religiousPathOf(s, c).id, advanced = FB.takeReligiousStep(s, c);
    var snapshot = FB.titleSnapshot(s), rendered = FB.renderTitleSnapshot(snapshot);
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    for (var i = 0; i < 5; i++) {
      FB.religiousCareerReview(s, c, 'priest'); FB.religiousPathOf(s, c);
      FB.religiousCelibate(s, c); FB.careerTitle(s, c); FB.titleSnapshot(s);
    }
    return { denied:denied, lay:lay, layAdvance:layAdvance, originalWork:originalWork,
      offered:offered, chosen:chosen, title:title, vocation:vocation, advanced:advanced,
      ranks:c.religiousRanks, gold:s.player.gold, headless:!FB.religionOf(c.religion, s).head,
      noOffice:heads === JSON.stringify(s.religiousHeads) && abbeys === JSON.stringify(s.abbeys),
      snapshotRole:snapshot.institutionRoleId, rendered:rendered,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ denied:true, lay:'test_household_lay', layAdvance:true, originalWork:'farmer',
    offered:true, chosen:true, title:'Community Teacher', vocation:'test_household_teacher', advanced:true,
    ranks:{ test_household_lay:1, test_household_teacher:1 }, gold:95, headless:true, noOffice:true,
    snapshotRole:'specialist', rendered:'Community Teacher', pure:true });
});

test('declared household promises survive occupation and prevent a stale courtship from spending', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, c = s.chars[f.house], teacher = s.chars[f.teacher];
    institutionAct('test_house', { kind:'character', id:c.id }, 'admit', { roleId:'specialist' });
    FBDATA.religiousInstitutionProfiles.test_school.roles.specialist.careerIds = ['priest'];
    institutionAct('test_school', { kind:'character', id:teacher.id }, 'admit', { roleId:'specialist' });
    teacher.career = { profession:'priest' }; teacher.role = 'priest';
    var marriedWork = !FB.religiousCelibate(s, teacher), declaredVow = FB.religiousCelibate(s, c);
    s.owner[f.pid] = 'player';
    var occupiedVow = FB.religiousCelibate(s, c);
    s.player.courtingId = c.id;
    var before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    var rejected = FB.doMarry(s) === false;
    var atomic = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    institutionAct('test_house', { kind:'character', id:c.id }, 'withdraw', {});
    return { marriedWork:marriedWork, declaredVow:declaredVow, occupiedVow:occupiedVow,
      rejected:rejected, atomic:atomic, released:!FB.religiousCelibate(s, c) };
  });
  expect(result).toEqual({ marriedWork:true, declaredVow:true, occupiedVow:true, rejected:true, atomic:true, released:true });
});

test('reverse spouse links exclude unmarried membership without repairing either partner', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture;
    s.chars[f.teacher].spouseId = f.house; s.chars[f.house].spouseId = null;
    FB.touchFamily();
    var before = JSON.stringify(s);
    var q = FB.religiousInstitutionQuote(s, 'test_house', { kind:'character', id:f.house }, 'admit', { roleId:'specialist' });
    return { allowed:q.allowed, reason:q.reason, pure:before === JSON.stringify(s) };
  });
  expect(result).toEqual({ allowed:false, reason:'qualification', pure:true });
});

test('an unmarried membership closes marriage capacity and names the vow until withdrawal', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, me = s.chars[s.player.charId], actor = { kind:'character', id:me.id };
    FB.spousesSnapshot(s, me).forEach(function (c) { c.spouseId = null; c.spouseIds = []; });
    me.spouseId = null; me.spouseIds = []; me.betrothedId = null; s.player.courtingId = null;
    me.religion = 'jewish'; me.born = s.date.year - 30; me.skills.int = 8;
    FB.touchFamily();
    FBDATA.religiousInstitutionProfiles.test_school.roles.specialist.unmarried = true;
    var partner = FB.makeCharacter(s, { name:'Fictional Neighbour', religion:'jewish', culture:me.culture,
      sex:me.sex === 'm' ? 'f' : 'm', born:s.date.year - 25, traits:[], opinion:100 });
    partner.homeProvinceId = s.player.provinceId;
    var open = FB.canWedSnapshot(s);
    institutionAct('test_school', actor, 'admit', { roleId:'specialist' });
    var promised = { snapshot:FB.canWedSnapshot(s), live:FB.canWed(s), code:FB.courtshipStatus(s, partner, false).code };
    institutionAct('test_school', actor, 'withdraw', {});
    return { open:open, promised:promised, reopened:FB.canWedSnapshot(s) };
  });
  expect(result).toEqual({ open:true, promised:{ snapshot:false, live:false, code:'vocation_vow' }, reopened:true });
});

test('explicit no-vocation faiths block fresh generic roles while preserving existing saved work', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, c = s.chars[f.lantern];
    FBDATA.religions.test_lantern.properties.religiousPaths = null;
    FB.invalidateReligionData();
    var denied = !FB.religiousCareerReview(s, c, 'priest').allowed && !FB.religiousCareerReview(s, c, 'monk').allowed;
    var fresh = FB.makeCharacter(s, { name:'Fictional lay resident', religion:'test_lantern',
      culture:'frankish', sex:'m', born:s.date.year - 30, role:'priest' });
    c.role = 'priest';
    var existing = FB.religiousCareerReview(s, c, 'priest').allowed;
    c.role = 'notable';
    var blocked = FB.setCareer(s, c, 'priest') === false;
    FBDATA.religiousInstitutionProfiles.test_lantern.roles.specialist.careerIds = ['priest'];
    institutionAct('test_lantern', { kind:'character', id:c.id }, 'admit', { roleId:'specialist' });
    var granted = FB.setCareer(s, c, 'priest', 'journeyman');
    institutionAct('test_lantern', { kind:'character', id:c.id }, 'withdraw', {});
    return { denied:denied, fresh:fresh.role, existing:existing, blocked:blocked, granted:granted,
      retained:FB.religiousCareerReview(s, c, 'priest').allowed, noPath:FB.religiousPathOf(s, c) === null,
      noHead:!FB.religionOf(c.religion, s).head };
  });
  expect(result).toEqual({ denied:true, fresh:null, existing:true, blocked:true, granted:true, retained:true, noPath:true, noHead:true });
});

test('role routes and AI references validate every declared faith and budget bound', async function ({ page }) {
  await page.evaluate(installHouseholdRoutes);
  const result = await page.evaluate(function () {
    function faults(change) {
      var data = Object.assign({}, FBDATA, { religiousInstitutionProfiles:JSON.parse(JSON.stringify(FBDATA.religiousInstitutionProfiles)) });
      change(data.religiousInstitutionProfiles.test_school);
      return FB.religiousInstitutionCatalogFaults(data).length > 0;
    }
    return { valid:FB.religiousInstitutionCatalogFaults(FBDATA).length === 0,
      unknownCareer:faults(function (p) { p.roles.specialist.careerIds = ['unknown_career']; }),
      malformedRole:faults(function (p) { p.roles.specialist = null; }),
      wrongFaith:faults(function (p) { p.faithIds.push('catholic'); }),
      wrongProfession:faults(function (p) { p.roles.specialist.careerIds = ['farmer']; }),
      unknownPath:faults(function (p) { p.roles.learner.pathId = 'unknown_path'; }),
      badBudget:faults(function (p) { p.ai = { roles:['learner'], affiliations:[], reserve:-1, maxActions:9, recognize:true }; }),
      badRole:faults(function (p) { p.ai = { roles:['unknown_role'], affiliations:[], reserve:0, maxActions:1, recognize:false }; }) };
  });
  expect(result).toEqual({ valid:true, unknownCareer:true, malformedRole:true, wrongFaith:true, wrongProfession:true, unknownPath:true, badBudget:true, badRole:true });
});

test('East Syriac filters retain their existing late antique paths and released ladders retain their ids', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, c = s.chars[s.player.charId], paths = [];
    c.sex = 'm';
    ['farmer','monk','priest'].forEach(function (profession) {
      c.religion = s.player.religion = 'east_syriac'; s.player.profession = profession;
      c.career = { profession:profession, chosen:true, rank:'journeyman', experience:0 };
      paths.push(FB.religiousPathOf(s, c).id);
    });
    c.religion = s.player.religion = 'catholic';
    var catholic = FB.religiousPathOf(s, c).id;
    c.religion = s.player.religion = 'sunni';
    var muslim = FB.religiousPathOf(s, c).id;
    return { paths:paths, catholic:catholic, muslim:muslim, noMembership:!s.localInstitutions.test_school.members[c.id] };
  });
  expect(result).toEqual({ paths:['late_antique_lay','late_antique_monastic','late_antique_clerical'],
    catholic:'catholic_clerical', muslim:'muslim_mosque', noMembership:true });
});

test('AI pays the actual patron, observes reserves and never spends household funds', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, p = FBDATA.religiousInstitutionProfiles.test_house;
    p.ai = { roles:['specialist'], affiliations:[], reserve:8, maxActions:8, recognize:false };
    p.roles.specialist.skills.int = 99; s.chars[f.house].skills.int = 99;
    p.fees.appoint = 3;
    institutionAct('test_house', { kind:'character', id:f.house }, 'admit', { roleId:'specialist' });
    FB.treasuryInitialize(s); s.treasuryAccounting.mode = 'active'; s.realms[f.patron].treasury.gold = 10;
    var mixed = FB.convertCountyCommunity(s, f.pid, { kind:'faith', target:'test_lantern', amount:100 });
    if (!mixed || mixed.count !== 100 || FB.countyCommunities(s, f.pid).length < 2) throw new Error('Expected mixed communities');
    var gold = s.player.gold, property = JSON.stringify([s.abbeys, s.player.holdings, s.population, s.owner, s.holder]);
    var manual = FB.religiousInstitutionQuote(s, 'test_house', { kind:'realm', id:f.patron }, 'appoint', { candidateId:f.house });
    s.turn = 90;
    var reserved = FB.religiousInstitutionAI(s), stayedVacant = s.religiousHeads.test_house_office === null;
    var retainedFunds = s.realms[f.patron].treasury.gold;
    p.ai.reserve = 7; s.turn = 180;
    var selected = FB.religiousInstitutionAI(s), repeat = FB.religiousInstitutionAI(s);
    return { manual:manual.allowed, reserved:reserved, stayedVacant:stayedVacant, retainedFunds:retainedFunds,
      selected:selected, repeat:repeat, incumbent:s.religiousHeads.test_house_office === f.house,
      funds:s.realms[f.patron].treasury.gold, household:gold === s.player.gold,
      property:property === JSON.stringify([s.abbeys, s.player.holdings, s.population, s.owner, s.holder]),
      cadence:s.localInstitutions.test_house.aiPeriod };
  });
  expect(result).toEqual({ manual:true, reserved:0, stayedVacant:true, retainedFunds:10,
    selected:1, repeat:0, incumbent:true, funds:7, household:true, property:true, cadence:2 });
});

test('member-selected AI obeys its quorum and free decisions remain headless at faith level', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, p = FBDATA.religiousInstitutionProfiles.test_school;
    p.ai = { roles:['specialist'], affiliations:[], reserve:0, maxActions:8, recognize:false };
    p.roles.specialist.skills.int = 99;
    s.chars[f.teacher].skills.int = s.chars[f.pupil].skills.int = 99;
    var gold = s.player.gold, rng = FB.getRngState(), uid = FB.getUidCounter();
    s.turn = 90;
    var count = FB.religiousInstitutionAI(s), leader = FB.religiousOfficeSnapshot(s, 'test_school_office');
    return { count:count, leader:!!leader && [f.teacher,f.pupil].indexOf(leader.id) >= 0,
      members:Object.keys(s.localInstitutions.test_school.members).length,
      repeat:FB.religiousInstitutionAI(s), headless:!FB.religionOf('jewish', s).head,
      ownFunds:gold === s.player.gold, counters:rng === FB.getRngState() && uid === FB.getUidCounter() };
  });
  expect(result).toEqual({ count:5, leader:true, members:2, repeat:0, headless:true, ownFunds:true, counters:true });
});

test('ecclesiastical binding reads one canonical profile incumbent and its explicit temporal scope', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, E = FB.ecclesiasticalGovernment, rid = 'test_temporal';
    FBDATA.ecclesiasticalProfiles.test_profile_temporal = Object.assign({}, FBDATA.ecclesiasticalProfiles.sanctuary_temporal,
      { name:'Fictional temporal binding', source:'institution_profile', chapter:false, appointmentCost:0 });
    var binding = { profileId:'test_profile_temporal', officeId:'test_house_office', institutionId:'test_house' };
    var valid = E.bindingFaults(binding, FB.localInstitutionDefinitions(s), FB.religiousOffices(s)).length === 0;
    s.realms[rid] = { id:rid, alive:true, capital:f.pid, rank:1, religion:'catholic', culture:'frankish',
      liege:null, government:'ecclesiastical_principality', ruler:{ generation:1, name:'Vacant' } };
    s.authority.governments[rid] = { formId:'ecclesiastical_principality', ecclesiastical:Object.assign({}, binding,
      { schema:1, scope:[f.pid], originFormId:'territorial', temporalRecognitionId:null }) };
    s.holder[f.pid] = s.owner[f.pid] = rid; FB.governments.invalidate();
    var people = Object.keys(s.chars).length, property = JSON.stringify([s.abbeys, s.player.holdings]);
    institutionAct('test_house', { kind:'character', id:f.house }, 'admit', { roleId:'specialist' });
    var membershipOnly = E.incumbent(s, rid) === null;
    institutionAct('test_house', { kind:'realm', id:rid }, 'appoint', { candidateId:f.house });
    E.sync(s, rid);
    var canonical = E.incumbent(s, rid).id === f.house && s.realms[rid].ruler.officeHolderId === f.house;
    var revenue = E.decision(s, rid, 'revenue', { provinceId:f.pid }).allowed;
    var other = Object.keys(FB.world.byId).filter(function (id) { return id !== f.pid; })[0];
    var bounded = !E.decision(s, rid, 'grant', { provinceId:other }).allowed;
    var outsider = E.review(s, rid, 'resign', {});
    var before = JSON.stringify(s), rejected = !E.apply(s, outsider) && before === JSON.stringify(s);
    institutionAct('test_house', { kind:'character', id:f.house }, 'vacate', {});
    E.sync(s, rid);
    var profile = FBDATA.religiousInstitutionProfiles.test_house;
    profile.selection.policy = 'members'; profile.selection.quorum = 1;
    profile.fees.appoint = 3;
    s.player.charId = f.house; s.player.religion = 'catholic'; s.player.gold = 100;
    institutionAct('test_house', { kind:'character', id:f.house }, 'assent', {
      decision:'appoint', subject:{ kind:'character', id:f.house } });
    var selection = E.review(s, rid, 'appoint', { candidateId:f.house });
    var applied = E.apply(s, selection), paidOnce = s.player.gold === 97;
    var sameOffice = E.incumbent(s, rid).id === f.house && s.religiousHeads.test_house_office === f.house;
    profile.fees.vacate = 2;
    var resignation = E.review(s, rid, 'resign', {});
    var resignationCost = resignation.cost, resigned = E.apply(s, resignation);
    var finalFunds = s.player.gold;
    s.owner[f.pid] = f.patron;
    return { valid:valid, profile:E.profileFaults().length === 0, membershipOnly:membershipOnly, canonical:canonical,
      revenue:revenue, bounded:bounded, outsider:!outsider.allowed, rejected:rejected,
      applied:applied, paidOnce:paidOnce, sameOffice:sameOffice,
      resignationCost:resignationCost, resigned:resigned, finalFunds:finalFunds,
      occupied:!E.decision(s, rid, 'revenue', { provinceId:f.pid }).allowed,
      retained:property === JSON.stringify([s.abbeys, s.player.holdings]) && people === Object.keys(s.chars).length };
  });
  expect(result).toEqual({ valid:true, profile:true, membershipOnly:true, canonical:true, revenue:true,
    bounded:true, outsider:true, rejected:true, applied:true, paidOnce:true, sameOffice:true,
    resignationCost:2, resigned:true, finalFunds:95, occupied:true, retained:true });
});

test('administrative commissions and judicial mandates preserve spiritual membership, work and faith', async function ({ page }) {
  const result = await page.evaluate(function () {
    var s = FB.state, f = institutionFixture, c = s.chars[f.teacher], rid = 'abbasid';
    var p = FB.administrationProfile(s, rid);
    var pid = FB.realmHeldCounties(s, rid).filter(function (id) { return FB.publicCountyIncome(s, rid, id) > 0; })[0];
    if (!p || !pid) throw new Error('Expected the existing administrative court and productive source');
    institutionAct('test_school', { kind:'character', id:c.id }, 'admit', { roleId:'specialist' });
    c.unfree = false; c.homeProvinceId = pid; c.skills.ste = c.skills.lea = c.skills.dip = 20;
    FB.treasuryInitialize(s); s.realms[rid].treasury.gold = 1000;
    var spiritual = JSON.stringify([c.religion, c.role, c.career, c.religiousAffiliations, s.localInstitutions,
      s.religiousHeads, s.religiousHeadVacancies]), property = JSON.stringify([s.abbeys, s.player.holdings]);
    var q = FB.publicAppointmentQuote(s, { kind:'realm', id:rid }, { institutionId:rid, officeId:p.governor,
      holderId:c.id, provinceId:pid, scope:{ kind:'county', id:pid } });
    var appointed = FB.publicAppoint(s, q);
    var judicial = FB.authorityAppoint(s, { officeId:'judicial_vicar', institutionId:rid,
      appointer:{ kind:'realm', id:rid }, holder:{ kind:'character', id:c.id }, scope:{ kind:'county', id:pid } });
    return { allowed:q.allowed, appointed:!!appointed, judicial:!!judicial,
      spiritual:spiritual === JSON.stringify([c.religion, c.role, c.career, c.religiousAffiliations, s.localInstitutions,
        s.religiousHeads, s.religiousHeadVacancies]), property:property === JSON.stringify([s.abbeys, s.player.holdings]),
      publicOnly:!!appointed && !!appointed.publicTerms && FB.publicAppointmentEffective(s, appointed),
      noHead:!FB.religionOf(c.religion, s).head };
  });
  expect(result).toEqual({ allowed:true, appointed:true, judicial:true, spiritual:true, property:true, publicOnly:true, noHead:true });
});

test('household review restores details and keyboard focus, rejects changed terms and fits a narrow screen', async function ({ page }) {
  await page.setViewportSize({ width:390, height:844 });
  await page.evaluate(installHouseholdRoutes);
  await page.evaluate(function () {
    window.institutionBeforeReview = { state:JSON.stringify(FB.state), rng:FB.getRngState(), uid:FB.getUidCounter() };
    FB.ui.showReligiousInstitutions();
  });
  const review = page.getByRole('button', { name:/^Review Learner/ }).first();
  const card = review.locator('xpath=../..');
  await card.getByRole('button', { name:'Details', exact:true }).click();
  await expect(card).toContainText('Minimum age 18; current age 30.');
  await review.click();
  await expect(page.getByRole('heading', { name:'Review Learner', exact:true })).toBeVisible();
  expect(await page.evaluate(function () {
    return institutionBeforeReview.state === JSON.stringify(FB.state) && institutionBeforeReview.rng === FB.getRngState() &&
      institutionBeforeReview.uid === FB.getUidCounter();
  })).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name:'Religious communities', exact:true })).toBeVisible();
  await expect(review).toBeFocused();
  await expect(card.getByRole('button', { name:'Details', exact:true })).toHaveAttribute('aria-expanded', 'true');
  await review.click();
  await page.evaluate(function () {
    FB.state.chars[FB.state.player.charId].skills.int = 0;
    window.institutionStaleState = JSON.stringify(FB.state);
  });
  await page.getByRole('button', { name:/^Confirm decision/ }).click();
  await expect(page.getByRole('heading', { name:'Terms changed', exact:true })).toBeVisible();
  expect(await page.evaluate(function () { return institutionStaleState === JSON.stringify(FB.state); })).toBe(true);
  await page.getByRole('button', { name:'Continue', exact:true }).click();
  await expect(page.getByRole('heading', { name:'Religious communities', exact:true })).toBeVisible();
  expect(await page.evaluate(function () {
    var box = document.getElementById('gm-body');
    return box.scrollWidth <= box.clientWidth + 1;
  })).toBe(true);
});

function retainedInstitutionFacts() {
  var s = FB.state, f = institutionFixture;
  return JSON.parse(JSON.stringify({ start:s.start, rng:FB.getRngState() >>> 0, uid:FB.getUidCounter(),
    institutions:s.localInstitutions, heads:s.religiousHeads, vacancies:s.religiousHeadVacancies,
    recognitions:s.authority.recognitions, abbeys:s.abbeys, papacy:s.papacy, bishoprics:s.bishoprics,
    property:[s.owner, s.holder, s.player.holdings, s.population], faiths:s.faiths, faithRelations:s.faithRelations,
    ancestry:FB.faithLineage('test_saved_descendant', s),
    people:[f.house,f.teacher,f.pupil,f.lantern].map(function (id) {
      var c = s.chars[id]; return [c.id,c.religion,c.role,c.career,c.religiousRanks,c.religiousAffiliations];
    }) }));
}

for (const distribution of ['standard','CrazyGames']) {
  test(distribution + ' restore after another bookmark retains exact institutions and replays withdrawal', async function ({ page }) {
    await page.evaluate(installHouseholdRoutes);
    const original = await page.evaluate(function () {
      var s = FB.state, f = institutionFixture;
      institutionAct('test_house', { kind:'character', id:f.house }, 'admit', { roleId:'specialist' });
      institutionAct('test_house', { kind:'realm', id:f.patron }, 'appoint', { candidateId:f.house });
      institutionAct('test_lantern', { kind:'character', id:f.lantern }, 'admit', { roleId:'specialist' });
      institutionAct('test_lantern', { kind:'character', id:f.lantern }, 'affiliate', { affiliationId:'test_learning' });
      institutionAct('test_lantern', { kind:'character', id:f.lantern }, 'recognize', {
        subject:{ kind:'realm', id:f.patron }, provinceId:f.pid, source:'institution_support' });
      institutionAct('test_school', { kind:'character', id:f.teacher }, 'admit', { roleId:'specialist' });
      s.chars[f.teacher].religiousRanks = { test_household_teacher:1 };
      s.turn = 90; s.localInstitutions.test_house.aiPeriod = 1;
      var generated = FB.createFaith(s, { id:'test_saved_descendant', name:'Fictional saved descendant', parent:'test_lantern',
        relationToParent:{ childView:'in_fold', parentView:'in_fold' }, properties:{ head:null } });
      if (!generated) throw new Error('Expected a saved generated descendant');
      s.localInstitutions.test_school.status = 'closed';
      s.localInstitutions.test_lantern.status = 'suspended';
      window.institutionSaved = FB.save.serialize();
      return institutionSaved;
    });
    const before = await page.evaluate(retainedInstitutionFacts);
    await page.evaluate(function () {
      institutionAct('test_house', { kind:'character', id:institutionFixture.house }, 'withdraw', {});
    });
    const after = await page.evaluate(retainedInstitutionFacts);
    await page.evaluate(function () {
      return new Promise(function (resolve, reject) {
        FB.activateBookmark('1204', null, function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page, original);
    expect(await page.evaluate(retainedInstitutionFacts)).toEqual(before);
    await page.evaluate(function () {
      institutionAct('test_house', { kind:'character', id:institutionFixture.house }, 'withdraw', {});
    });
    expect(await page.evaluate(retainedInstitutionFacts)).toEqual(after);
  });
}
