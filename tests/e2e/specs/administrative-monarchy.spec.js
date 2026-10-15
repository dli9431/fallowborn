'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame, advanceTo } = require('../support/game/parity');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_800.js', 'data/bookmark_800_history.js',
  'data/aristocratic_courts.js', 'js/government_aristocracy.js',
  'data/political_institutions.js', 'data/eras.js', 'data/systems.js',
  'data/actions.js', 'data/lexicons.js', 'data/technology.js', 'data/cultures.js',
  'js/governments.js', 'js/government_recognition.js', 'js/government_administration.js',
  'js/government_selection.js', 'js/government_lineage.js',
  'js/government_continuity.js', 'js/government_levy.js', 'js/government_revenue.js',
  'js/government_council.js', 'js/government_ai.js', 'js/government_diplomacy.js',
  'js/world.js', 'js/authority.js', 'js/treasury.js', 'js/lordships.js', 'js/fiscal.js',
  'js/actions.js', 'js/armies.js', 'js/wars.js', 'js/justice.js', 'js/model.js', 'js/station.js',
  'js/progression.js', 'js/religion.js', 'js/papacy.js', 'js/systems.js', 'js/lexicon.js',
  'js/mods.js', 'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/messages.js', 'js/i18n.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'css/style.css', 'js/crazygames.js',
  'data/distribution_crazygames.js'
]);

async function start(page, testInfo, distribution) {
  if (distribution === 'crazygames') {
    await mockCrazyGames(page);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openCrazyGame(page,testInfo);
  } else await openGame(page,testInfo);
  await page.evaluate(function () { FB.startProgression.noteTier(3); });
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('ADMIN-800-farmer-london-m-Edwin');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

// Scenario-local fixture: use real populated sources and the real quote/apply APIs.
async function prepare(page, rid) {
  await page.evaluate(function (rid) {
    const s = FB.state, c = s.chars[s.player.charId];
    // Exclude rounding residue from a fully allocated source.
    const pid = FB.realmHeldCounties(s,rid).find(function (pid) { return FB.publicCountyIncome(s,rid,pid) > 0.000001; });
    if (!pid) throw new Error('No productive fixture source');
    s.player.provinceId = pid; s.player.liege = rid; s.player.travel = null;
    s.player.prestige = 1000; s.player.gold = 1000;
    c.unfree = false; c.born = s.date.year - 24;
    FB.SKILLS.forEach(function (skill) { c.skills[skill] = 20; });
    s.realms[rid].treasury.gold = 1000;
    window.ADMIN = {
      rid:rid, pid:pid, me:{kind:'character',id:c.id}, patron:{kind:'realm',id:rid},
      input:function (office) { return {institutionId:rid,officeId:office || FB.administrationProfile(s,rid).governor,
        holderId:c.id,provinceId:pid,scope:{kind:'county',id:pid}}; },
      appoint:function (office) {
        const q = FB.publicAppointmentQuote(s,this.patron,this.input(office));
        if (!q.allowed) throw new Error(q.reason);
        const row = FB.publicAppoint(s,q);
        if (!row) throw new Error('Appointment rejected');
        return s.authority.appointments.find(function (record) { return record.id === row.id; });
      }
    };
  },rid || 'abbasid');
}

test('800 historical profiles choose public holders, independent catalogs and scoped systems', async function ({page},testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state;
    const profiles = ['abbasid','byzantium'].map(function (rid) {
      const p = FB.administrationProfile(s,rid);
      return {form:FB.governments.forRealm(s,rid).id,profile:s.authority.governments[rid].administrationProfileId,
        offices:p.offices,public:FB.systemEnabled(s,'public_offices',{realm:rid}),
        feudal:FB.systemEnabled(s,'feudal_service',{realm:rid}),
        direct:FB.realmHeldCounties(s,rid).every(function (pid) { return s.holder[pid] === rid; }),
        generated:Object.keys(s.realms).filter(function (id) { return s.realms[id].liege === rid && /^vassal_/.test(id); }).length};
    });
    const original = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    ['abbasid','byzantium'].forEach(function (rid) {
      FB.publicOfficeRows(s,rid); FB.publicOfficeBudget(s,rid);
      FB.governmentRecognition.members(s,rid); FB.governmentRecognition.candidates(s,rid);
      FB.governmentRecognition.accessionQuote(s,rid,'death');
    });
    return {profiles:profiles,errors:FB.governments.validate().concat(FB.validateAuthorityData()),
      preserved:FB.systemEnabled(s,'feudal_service',{realm:'carolingian_800'}),
      pure:original === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toMatchObject({errors:[],preserved:true,pure:true,profiles:[
    {form:'administrative_monarchy',profile:'abbasid_800',public:true,feudal:false,direct:true,generated:0},
    {form:'administrative_monarchy',profile:'byzantine_800',public:true,feudal:false,direct:true,generated:0}
  ]});
  expect(result.profiles[0].offices.some(function (id) { return result.profiles[1].offices.includes(id); })).toBe(false);
});

test('appointments are pure reviews, reject changed budgets and scopes, and grant only public jurisdiction', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN;
    const land = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings,s.player.enterprises]);
    let before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.publicAppointmentQuote(s,a.patron,a.input());
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.realms[a.rid].treasury.gold--;
    before = JSON.stringify(s);
    const stale = FB.publicAppoint(s,q) === false && before === JSON.stringify(s);
    const changed = FB.publicAppointmentQuote(s,a.patron,a.input());
    const oldHolder = s.holder[a.pid]; s.holder[a.pid] = 'player';
    before = JSON.stringify(s);
    const lostScope = FB.publicAppoint(s,changed) === false && before === JSON.stringify(s);
    s.holder[a.pid] = oldHolder;
    const gold = s.realms[a.rid].treasury.gold, playerGold = s.player.gold;
    const row = a.appoint();
    const duplicate = !FB.publicAppointmentQuote(s,a.patron,a.input()).allowed;
    const powers = FB.political.permission(s,a.me,'collect_render',{provinceId:a.pid}).allowed;
    const elsewhere = FB.realmHeldCounties(s,a.rid).find(function (pid) { return pid !== a.pid; });
    const bounded = !FB.political.permission(s,a.me,'collect_render',{provinceId:elsewhere}).allowed;
    const dismiss = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.patron,row.id,'remove'));
    const revoked = !FB.political.permission(s,a.me,'collect_render',{provinceId:a.pid}).allowed;
    return {pure:pure,stale:stale,lostScope:lostScope,duplicate:duplicate,powers:powers,bounded:bounded,
      fee:gold-s.realms[a.rid].treasury.gold,playerCash:playerGold === s.player.gold,dismiss:dismiss,revoked:revoked,
      property:land === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings,s.player.enterprises])};
  });
  expect(result).toEqual({pure:true,stale:true,lostScope:true,duplicate:true,powers:true,bounded:true,
    fee:5,playerCash:true,dismiss:true,revoked:true,property:true});
});

test('salary, withheld receipts, audit and repayment conserve one real treasury source', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, row = a.appoint(), account = s.realms[a.rid].treasury;
    const remit = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.me,row.id,'remit',0.75));
    const total = s.player.gold + account.gold, gold = s.player.gold;
    s.turn += 90;
    FB.publicOfficeSettle(s,null,1,false);
    const first = JSON.stringify([s.player.gold,account.gold,row.publicTerms]);
    FB.publicOfficeSettle(s,null,1,false);
    const repeat = first === JSON.stringify([s.player.gold,account.gold,row.publicTerms]);
    const last = row.publicTerms.last, arrears = row.publicTerms.arrears;
    const conserved = Math.abs(total-s.player.gold-account.gold) < 0.000001;
    const salary = Math.abs(last.paid - Math.min(6,last.gross*0.15)) < 0.000001;
    const source = Math.abs(last.paid + last.withheld + last.remitted - last.gross) < 0.000001;
    const audit = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.patron,row.id,'audit'));
    const suspended = !FB.publicAppointmentEffective(s,row);
    const repayment = FB.publicOfficeQuote(s,a.me,row.id,'repay');
    const repaid = FB.publicOfficeApply(s,repayment), once = !FB.publicOfficeApply(s,repayment);
    const restored = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.patron,row.id,'confirm'));
    return {remit:remit,salary:salary,source:source,conserved:conserved,positive:arrears>0,
      credited:s.player.gold-gold,audit:audit,suspended:suspended,repaid:repaid,once:once,restored:restored,
      arrears:row.publicTerms.arrears,repeat:repeat};
  });
  expect(result).toMatchObject({remit:true,salary:true,source:true,conserved:true,positive:true,
    audit:true,suspended:true,repaid:true,once:true,restored:true,arrears:0,repeat:true});
  expect(result.credited).toBeGreaterThan(0);
});

test('Byzantine commissions require funded service and new sovereign confirmation; expiry preserves property', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'byzantium');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, G = FB.governments;
    const input = {provinceId:a.pid,share:1,population:1,modifier:1,buildings:0,support:1};
    const baseline = G.strategy('levy','feudal_levy').settlementBase(s,a.rid,input);
    const capacity = function () { return G.call(s,a.rid,'levy','settlementBase',input)/baseline; };
    const empty = capacity(), row = a.appoint();
    const property = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings]);
    s.turn += 90; FB.publicOfficeSettle(s,null,1,false);
    const funded = capacity(), hosts = JSON.stringify(s.armies);
    s.realms[a.rid].treasury.gold = 0;
    s.turn += 90; FB.publicOfficeSettle(s,null,2,false);
    const unpaid = row.publicTerms.unpaid > 0, reduced = capacity();
    s.realms[a.rid].ruler.generation++;
    const contested = !FB.publicAppointmentEffective(s,row);
    const confirmed = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,a.patron,row.id,'confirm'));
    s.turn = row.endTurn;
    const expired = !FB.publicAppointmentEffective(s,row);
    return {empty:empty,funded:funded,unpaid:unpaid,reduced:reduced,contested:contested,confirmed:confirmed,expired:expired,
      noTroops:hosts === JSON.stringify(s.armies),property:property === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings])};
  });
  expect(result).toEqual({empty:0.5,funded:1,unpaid:true,reduced:0.5,contested:true,confirmed:true,expired:true,noTroops:true,property:true});
});

test('generic fictional profiles reuse source assignments and reject unproductive and over-assigned sources', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN;
    FB.mods.apply({governmentForms:{fixture_public:Object.assign({},FBDATA.governmentForms.administrative_monarchy)},
      administrationProfiles:{fixture_public:Object.assign({},FBDATA.administrationProfiles.public_court,{name:'Fictional public court'})}});
    FB.authoritySetGovernment(s,a.rid,'fixture_public');
    s.authority.governments[a.rid].administrationProfileId = 'fixture_public';
    const row = a.appoint();
    const kind = row.publicTerms.kind;
    s.turn += 90; FB.publicOfficeSettle(s,null,1,false);
    const share = Math.abs(row.publicTerms.last.paid-row.publicTerms.last.gross*0.2)<0.000001;
    row.publicTerms.share = 0.9;
    const overloaded = !FB.publicAppointmentQuote(s,a.patron,a.input(FB.administrationProfile(s,a.rid).fiscal)).allowed;
    row.publicTerms.share = 0.2;
    const foreign = a.input(); foreign.provinceId = 'london'; foreign.scope.id = 'london';
    const noSource = !FB.publicAppointmentQuote(s,a.patron,foreign).allowed;
    const errors = FB.governments.validate();
    return {kind:kind,share:share,overloaded:overloaded,noSource:noSource,errors:errors};
  });
  expect(result).toEqual({kind:'revenue_service',share:true,overloaded:true,noSource:true,errors:[]});
});

test('recognition belongs to living interests, admits officers without invented ancestry and blocks divided accession', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'byzantium');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, R = FB.governmentRecognition, row = a.appoint();
    const tree = s.realms[a.rid].succession, rivalMember = tree.members[tree.order[0]];
    rivalMember.born = s.date.year-24;
    if (rivalMember.charId) s.chars[rivalMember.charId].born = rivalMember.born;
    const person = s.chars[a.me.id], family = JSON.stringify([person.fatherId,person.motherId,person.childrenIds]);
    const q = R.nominationQuote(s,a.patron,a.rid,a.me.id), nomination = R.nominate(s,q);
    const member = s.realms[a.rid].succession.members[q.memberId];
    const noAncestry = !member.fatherId && !member.motherId && family === JSON.stringify([person.fatherId,person.motherId,person.childrenIds]);
    const seat = R.members(s,a.rid).find(function (seat) { return seat.principal.id === a.me.id; });
    const denied = !R.supportQuote(s,a.patron,a.rid,seat.id,q.memberId).allowed;
    const rival = R.candidates(s,a.rid).find(function (c) { return c.id !== q.memberId; });
    if (!rival) throw new Error('No rival recognition candidate');
    R.applySupport(s,R.supportQuote(s,a.patron,a.rid,'court',rival.id));
    let before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const support = R.supportQuote(s,a.me,a.rid,seat.id,q.memberId);
    const pure = support.allowed && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    R.applySupport(s,support);
    const divided = !R.accessionQuote(s,a.rid,'abdication').allowed;
    const reviewed = R.supportQuote(s,a.me,a.rid,seat.id,q.memberId);
    row.status = 'removed'; before = JSON.stringify(s);
    const stale = !R.applySupport(s,reviewed) && before === JSON.stringify(s);
    FB.refreshRealmSuccession(s,a.rid);
    return {nomination:nomination,noAncestry:noAncestry,denied:denied,pure:pure,divided:divided,stale:stale,
      departed:!R.candidates(s,a.rid).some(function (c) { return c.id === q.memberId; }),slate:s.realms[a.rid].succession.publicCandidateIds.length};
  });
  expect(result).toEqual({nomination:true,noAncestry:true,denied:true,pure:true,divided:true,stale:true,departed:true,slate:1});
});

test('designation permits a minor, commits one canonical political and religious transition, and rejects stale replay', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, R = FB.governmentRecognition, row = a.appoint();
    const tree = s.realms[a.rid].succession, candidate = tree.order[0], m = tree.members[candidate];
    m.born = s.date.year-10;
    m.sex = 'm';
    if (m.charId) { s.chars[m.charId].born = m.born; s.chars[m.charId].sex = 'm'; }
    R.applySupport(s,R.supportQuote(s,a.patron,a.rid,'court',candidate));
    const generation = FB.realmRulerGeneration(s,a.rid), q = FB.publicAccessionQuote(s,a.patron,a.rid,'abdication');
    const property = JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings]);
    const original = FB.ensureReligiousHeads; let calls = 0;
    FB.ensureReligiousHeads = function () { calls++; return original.apply(this,arguments); };
    let result;
    try { result = FB.publicAccede(s,q); } finally { FB.ensureReligiousHeads = original; }
    const after = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const replay = !FB.publicAccede(s,q) && after === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const head = FB.religiousHeadSnapshot(s,'sunni');
    return {minor:q.minor,applied:!!result,once:FB.realmRulerGeneration(s,a.rid) === generation+1,calls:calls,replay:replay,
      bound:!!head && head.id === a.rid,
      continued:FB.publicAppointmentEffective(s,row),property:property === JSON.stringify([s.owner,s.holder,s.player.provs,s.player.holdings])};
  });
  expect(result).toEqual({minor:true,applied:true,once:true,calls:1,replay:true,bound:true,continued:true,property:true});
});

test('a recognized player sovereign retains the public form and commissions through absorption', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'byzantium');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, R = FB.governmentRecognition, row = a.appoint();
    const nomination = R.nominationQuote(s,a.patron,a.rid,a.me.id);
    if (!R.nominate(s,nomination)) throw new Error('Nomination rejected');
    R.members(s,a.rid).forEach(function (seat) {
      R.applySupport(s,R.supportQuote(s,seat.principal,a.rid,seat.id,nomination.memberId));
    });
    const q = FB.publicAccessionQuote(s,a.patron,a.rid,'abdication');
    const generation = q.rulerGeneration;
    const applied = !!FB.publicAccede(s,q);
    const effectiveBefore = FB.publicAppointmentEffective(s,row);
    const confirm = FB.publicOfficeQuote(s,{kind:'realm',id:'player'},row.id,'confirm');
    FB.publicOfficeApply(s,confirm);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    R.candidates(s,'player'); R.accessionQuote(s,'player','abdication');
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const candidateShape = s.realms.player.succession.playerDynasty && !s.realms.player.succession.members;
    const valid = FB.validatePublicAdministrationState(s);
    const retained = FB.publicAdministrationReferencesCharacter(s,a.me.id);
    return {applied:applied,form:FB.governments.forRealm(s,'player').id,
      once:FB.realmRulerGeneration(s,'player') === generation+1,
      moved:row.institutionId === 'player' && row.appointer.id === 'player',
      confirmation:!effectiveBefore && FB.publicAppointmentEffective(s,row),pure:pure,
      candidateShape:!!candidateShape,valid:valid,retained:retained};
  });
  expect(result).toEqual({applied:true,form:'administrative_monarchy',once:true,moved:true,
    confirmation:true,pure:true,candidateShape:true,valid:null,retained:true});
});

test('household succession keeps a recognized public crown without copying a second royal tree', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, old = s.chars[a.me.id], R = FB.governmentRecognition;
    FB.absorbRealm(s,a.rid,old);
    const heir = FB.makeCharacter(s,{id:'admin_household_heir',name:'Household heir',sex:'m',
      culture:old.culture,religion:old.religion,born:s.date.year-18,station:1});
    heir.dyn = old.dyn; heir.fatherId = old.id; s.chars[heir.id] = heir;
    old.childrenIds = (old.childrenIds || []).concat([heir.id]);
    s.player.namedHeirId = heir.id;
    const support = R.supportQuote(s,{kind:'realm',id:'player'},'player','court',heir.id);
    if (!R.applySupport(s,support)) throw new Error('Household recognition rejected');
    const generation = FB.realmRulerGeneration(s,'player'), holdings = JSON.stringify(FB.holdingList(s));
    const applied = FB.game.succeedTo(heir.id,{livingAbdication:true});
    return {applied:applied,heir:s.player.charId === heir.id,
      form:FB.governments.forRealm(s,'player').id,once:FB.realmRulerGeneration(s,'player') === generation+1,
      property:holdings === JSON.stringify(FB.holdingList(s)),
      canonical:!s.realms.player.succession.members,valid:FB.validatePublicAdministrationState(s)};
  });
  expect(result).toEqual({applied:true,heir:true,form:'administrative_monarchy',once:true,property:true,canonical:true,valid:null});
});

test('a genuinely empty public succession remains vacant without generating a collateral or feudal holder', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'byzantium');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, tree = s.realms[a.rid].succession;
    Object.keys(tree.members).forEach(function (id) {
      if (id === tree.rulerMemberId) return;
      tree.members[id].alive = false;
      if (tree.members[id].charId) s.chars[tree.members[id].charId].dead = true;
    });
    tree.order = []; tree.dynasticOrder = [];
    const members = Object.keys(tree.members).length, uid = FB.getUidCounter(), land = JSON.stringify([s.owner,s.holder]);
    const result = FB.advanceRealmSuccession(s,a.rid,{cause:'death'});
    const vacancy = s.authority.governments[a.rid].publicVacancy;
    const first = JSON.stringify(vacancy); FB.advanceRealmSuccession(s,a.rid,{cause:'death'});
    return {vacant:result === null,recorded:vacancy.cause === 'death',bounded:first === JSON.stringify(vacancy),
      noPeople:members === Object.keys(tree.members).length && uid === FB.getUidCounter(),land:land === JSON.stringify([s.owner,s.holder])};
  });
  expect(result).toEqual({vacant:true,recorded:true,bounded:true,noPeople:true,land:true});
});

test('an unrecognized player death separates the vacant public court from the household and restore does not crown anyone', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'byzantium');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN, old = s.chars[a.me.id];
    FB.absorbRealm(s,a.rid,old);
    const heir = FB.makeCharacter(s,{id:'admin_uncrowned_heir',name:'Uncrowned heir',sex:'m',
      culture:old.culture,religion:old.religion,born:s.date.year-18,station:1});
    heir.dyn = old.dyn; heir.fatherId = old.id; s.chars[heir.id] = heir;
    old.childrenIds = (old.childrenIds || []).concat([heir.id]);
    s.player.namedHeirId = heir.id;
    const property = JSON.stringify(FB.holdingList(s)), generation = FB.realmRulerGeneration(s,'player');
    old.dead = true;
    const applied = FB.game.succeedTo(heir.id);
    const rid = Object.keys(s.realms).find(function (id) {
      return s.realms[id].alive && s.authority.governments[id] && s.authority.governments[id].publicVacancy;
    });
    if (!rid) throw new Error('Public vacancy missing');
    const before = JSON.stringify(s.authority.governments[rid]), envelope = JSON.parse(FB.save.serialize());
    FB.save.restore(envelope);
    return {applied:applied,household:FB.state.player.charId === heir.id,
      property:property === JSON.stringify(FB.holdingList(FB.state)),
      noCrown:!FB.state.realms.player || !FB.state.realms.player.alive,
      vacancy:before === JSON.stringify(FB.state.authority.governments[rid]),
      generation:FB.realmRulerGeneration(FB.state,rid) === generation,
      valid:FB.validatePublicAdministrationState(FB.state)};
  });
  expect(result).toEqual({applied:true,household:true,property:true,noCrown:true,vacancy:true,generation:true,valid:null});
});

test('AI uses its own purse, one commission per season and canonical authority only', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, a = ADMIN;
    const c = FB.makeCharacter(s,{id:'admin_ai_applicant',name:'Local clerk',sex:'m',culture:'arabic',religion:'sunni',born:s.date.year-24,station:1});
    c.homeProvinceId = a.pid; s.chars[c.id] = c;
    FB.SKILLS.forEach(function (skill) { c.skills[skill]=20; });
    const gold = s.realms[a.rid].treasury.gold, playerGold = s.player.gold, land = JSON.stringify([s.owner,s.holder]);
    FB.publicAdministrationAI(s,a.rid); FB.publicAdministrationAI(s,a.rid);
    const offices = FB.publicOfficeRows(s,a.rid);
    return {offices:offices.length,payer:gold-s.realms[a.rid].treasury.gold,player:playerGold === s.player.gold,
      source:offices.every(function (row) { return row.institutionId === a.rid && row.holder.id !== a.me.id; }),
      land:land === JSON.stringify([s.owner,s.holder])};
  });
  expect(result).toEqual({offices:1,payer:5,player:true,source:true,land:true});
});

test('save records round trip without payment, malformed terms fail before adoption, and old 800 forms stay stored', async function ({page},testInfo) {
  await start(page,testInfo); await prepare(page,'abbasid');
  const result = await page.evaluate(function () {
    const s = FB.state, row = ADMIN.appoint();
    s.turn += 90; FB.publicOfficeSettle(s,null,1,false);
    const envelope = JSON.parse(FB.save.serialize());
    const record = JSON.stringify(envelope.state.authority), gold = s.player.gold;
    FB.save.restore(envelope);
    const restored = record === JSON.stringify(FB.state.authority) && gold === FB.state.player.gold &&
      (envelope.rng >>> 0) === (FB.getRngState() >>> 0) && envelope.uid === FB.getUidCounter();
    const adopted = FB.state, bad = JSON.parse(JSON.stringify(envelope));
    bad.state.authority.appointments.find(function (r) { return r.id === row.id; }).publicTerms.share = 1.1;
    let error = '';
    try { FB.save.restore(bad); } catch (fault) { error = fault.message; }
    const rejected = !!error && FB.state === adopted;
    const old = JSON.parse(JSON.stringify(envelope));
    old.state.authority.appointments = old.state.authority.appointments.filter(function (r) { return !r.publicTerms; });
    ['abbasid','byzantium'].forEach(function (rid) { old.state.authority.governments[rid] = {formId:'territorial',sinceTurn:0}; });
    FB.save.restore(old);
    return {restored:restored,rejected:rejected,old:['abbasid','byzantium'].every(function (rid) {
      return FB.governments.forRealm(FB.state,rid).id === 'territorial' && !FB.administrationProfile(FB.state,rid);
    }),version:envelope.v};
  });
  expect(result).toEqual({restored:true,rejected:true,old:true,version:4});
});

test('the real seasonal journey replays deterministically and bounds commission/support growth', async function ({page},testInfo) {
  await startParityGame(page,testInfo,{bookmark:'800',scenario:'farmer',code:'ADMIN-800-farmer-london-m-Edwin'});
  await page.evaluate(function () { FB.state.date.day = 89; FB.state.turn = 64; });
  const opening = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const firstAdvance = await advanceTo(page,'season',2);
  expect(firstAdvance).toEqual({days:2,stop:null});
  const first = await page.evaluate(function () { const data=JSON.parse(FB.save.serialize()); return {state:data.state,rng:data.rng,uid:data.uid}; });
  await page.evaluate(function (data) { FB.save.restore(data); },opening);
  expect(await advanceTo(page,'season',2)).toEqual(firstAdvance);
  const second = await page.evaluate(function () {
    const data=JSON.parse(FB.save.serialize());
    return {state:data.state,rng:data.rng,uid:data.uid};
  });
  expect(firstAdvance.stop).toBeNull();
  expect(second).toEqual(first);
  const rows = first.state.authority.appointments.filter(function (r) { return r.publicTerms; });
  expect(rows.length).toBeLessThanOrEqual(2);
});

for (const distribution of ['standard','crazygames']) {
  test(distribution + ' mobile public review retains selections, disclosure and keyboard return without spending', async function ({page},testInfo) {
    await page.setViewportSize({width:390,height:844});
    await start(page,testInfo,distribution); await prepare(page,'abbasid');
    await page.evaluate(function () { FB.ui.showAdministration({court:ADMIN.rid,province:ADMIN.pid}); });
    const review = page.locator('[data-public-review="appoint"]');
    await expect(review).toBeEnabled();
    const disclosure = page.locator('[aria-controls="public-details-appoint"]');
    await disclosure.click();
    const original = await page.evaluate(function () { return {state:JSON.stringify(FB.state),rng:FB.getRngState(),uid:FB.getUidCounter(),
      province:document.getElementById('public-province').value,office:document.getElementById('public-office').value}; });
    await review.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('#gm-title')).toContainText('Review public decision');
    await page.keyboard.press('Escape');
    await expect(page.locator('#public-province')).toHaveValue(original.province);
    await expect(page.locator('#public-office')).toHaveValue(original.office);
    await expect(page.locator('[aria-controls="public-details-appoint"]')).toHaveAttribute('aria-expanded','true');
    await expect(page.locator('[data-public-review="appoint"]')).toBeFocused();
    const unchanged = await page.evaluate(function (original) {
      return original.state === JSON.stringify(FB.state) && original.rng === FB.getRngState() && original.uid === FB.getUidCounter();
    },original);
    expect(unchanged).toBe(true);
  });
}
