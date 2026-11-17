'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {expectModAdmission} = require('../support/game/mod-admission');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const fictional = require('../fixtures/authoring/office-mandates-lantern.json');
dependsOnRuntime(__filename,[
  'index.html','data/office_mandates.js','data/starts_imperial_officer.js','data/story_imperial_service.js',
  'data/bookmark_manifest.js','data/story_instances.js','data/political_institutions.js','data/technology.js',
  'js/office_mandates.js','js/authority.js','js/government_recognition.js','js/government_administration.js',
  'js/government_selection.js','js/government_aristocracy.js','js/home_authority.js','js/progression.js','js/mobile_confederations.js',
  'js/treasury.js','js/world.js','js/armies.js','js/wars.js','js/starts.js','js/politics.js','js/schema.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/actions.js','js/model.js','js/ui_modals.js','js/ui_misc.js'
]);
test.describe.configure({mode:'parallel'});

async function imported(page,info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await expectModAdmission(page,fictional);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/office-mandates-lantern.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'mandate_coast','mandate_household');
}

async function native(page,info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    return {available:!!FB.bookmark('476'),sources:FB.bookmarkSources.reports().filter(function (r) { return r.bookmarkId === '476'; }),
      authority:FB.validateAuthorityData(),federate:FB.validateFederateData(),mandate:FBDATA.authorityOffices.court_service_command,
      template:FBDATA.federateContractTerms.court_paid_service};
  });
  expect(result.available,JSON.stringify(result)).toBe(true);
  await beginBookmarkFromTitle(page,'476','court_service_household_476');
}

async function stage(page,native) {
  return page.evaluate(function (native) {
    const s = FB.state, rid = native ? 'croatia' : 'lantern_court', pid = s.realms[rid].capital,
      officeId = native ? 'court_service_command' : 'lantern_marshal', me = {kind:'character',id:s.player.charId};
    s.player.provinceId = pid; s.player.travel = null; s.player.gold = 1000; s.player.prestige = 1000;
    FB.SKILLS.forEach(function (skill) { s.chars[me.id].skills[skill] = 20; });
    FB.setRealmRulerStanding(s,rid,25);
    const army = {id:'mandate-host',realm:rid,at:pid,from:pid,men:80,size:80,units:{levy:72,ret:8},
      supply:100,moveLeft:0,path:[],goal:null,warId:null};
    s.armies.push(army); FB.hostSupply(army);
    const q = FB.officeAppointmentQuote(s,me,{institutionId:rid,officeId:officeId,holder:me,scope:{kind:'host',id:army.id}});
    if (!q.allowed) throw new Error(q.reason);
    const appointment = FB.officeSeekAppointment(s,q);
    if (!appointment) throw new Error('Reviewed commission failed');
    window.MANDATE = {id:appointment.id,rid:rid,pid:pid,me:me,hostId:army.id};
    return appointment.id;
  },!!native);
}

test('native court household, typed mandate and ordinary petition retain exact force and property boundaries',async function ({page},info) {
  await native(page,info);
  const id = await stage(page,true);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid});
    const wrong = M.review(s,a.me,a.id,'command',{hostId:'host_476_italy',destination:a.pid});
    const civil = FB.political.power(s,a.me,'peace',{provinceId:a.pid}).allowed;
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return {pure:pure,command:q.allowed,wrong:wrong.allowed,civil:civil,control:FB.playerControlsHost(s,s.armies.find(function (h) { return h.id === a.hostId; })),
      term:s.authority.appointments.find(function (r) { return r.id === a.id; }).endTurn-s.turn,
      technology:FBDATA.techImpactReviews.features.court_office_mandates.mode,
      errors:FB.validateAuthorityData(),slot:!!FBDATA.householdTracks_imperial_service &&
        typeof FBDATA.householdTracks_imperial_service === 'object' && !Array.isArray(FBDATA.householdTracks_imperial_service),
      station:FB.station.isLanded(s.player,s),privateGold:s.player.gold};
  });
  expect(result).toEqual({pure:true,command:true,wrong:false,civil:false,control:true,term:720,technology:'none',errors:[],slot:true,station:false,privateGold:985});
  await page.evaluate(function () { FB.ui.showOffices(); });
  await page.locator('[data-court-mandate="' + id + '"]').click();
  await expect(page.getByText('Court mandate',{exact:true})).toBeVisible();
  await expect(page.locator('#gm-body')).toContainText('Public account');
  await expect(page.locator('#gm-body')).toContainText('Private household');
  const command = page.locator('[data-mandate-review="command"]');
  await command.focus();
  await command.click();
  await expect(page.locator('#mandate-confirm')).toBeVisible();
  await expect(page.locator('#gm-body')).toContainText('Destination');
  await page.keyboard.press('Escape');
  await expect(command).toBeFocused();
  await command.click();
  await page.evaluate(function () { FB.setRealmRulerStanding(FB.state,MANDATE.rid,-80); });
  await page.locator('#mandate-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  await page.locator('#mandate-continue').click();
  await expect(command).toBeDisabled();
  await expect(page.locator('#gm-body')).toContainText('suspended');
});

test('ordinary JSON validation rejects malformed powers and leaves candidate, catalogue, state and counters untouched',async function ({page},info) {
  await openGame(page,info); await prepareGameContent(page);
  const result = await page.evaluate(function (fixture) {
    const base = JSON.stringify([FB.state,FBDATA]), rng = FB.getRngState(), uid = FB.getUidCounter();
    const variants = [
      function (m) { m.powers.push('land'); }, function (m) { m.powers.push('command'); },
      function (m) { m.tenureDays = 0; }, function (m) { m.favor.source = 'player_prestige'; },
      function (m) { m.favor.minimum = 101; }, function (m) { m.dismissal = 'holder'; },
      function (m) { m.contractTemplates = ['paid_service']; }, function (m) { m.acclamation.sourceId = 'imperial_commission'; },
      function (m) { m.unknown = 1; }, function (m) { m.hostIds = ['x','x']; }
    ];
    const rejected = variants.map(function (change) {
      const d = JSON.parse(JSON.stringify(fixture)); change(d.authorityOffices.lantern_marshal.mandate);
      const before = JSON.stringify(d), faults = FB.mods.validate(d);
      return faults.length > 0 && before === JSON.stringify(d);
    });
    const undeclared = [
      function (d) { d.powers.push('peace'); },
      function (d) { d.homePowers = ['grant']; d.scopes.push('realm'); },
      function (d) { d.publicRole = 'governor'; }
    ].map(function (change) {
      const d = JSON.parse(JSON.stringify(fixture)); change(d.authorityOffices.lantern_marshal);
      const before = JSON.stringify(d);
      return FB.mods.validate(d).length > 0 && before === JSON.stringify(d);
    });
    return {valid:FB.mods.validate(fixture),rejected:rejected,undeclared:undeclared,pure:base === JSON.stringify([FB.state,FBDATA]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },fictional);
  expect(result).toEqual({valid:[],rejected:Array(10).fill(true),undeclared:[true,true,true],pure:true});
});

test('the native service warrant commands an actual contracted opening host without taking its people or land',async function ({page},info) {
  await native(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, M = FB.officeMandates, me = {kind:'character',id:s.player.charId},
      h = s.armies.find(function (h) { return h.id === 'host_476_amal'; }), rid = 'byzantium';
    if (!h) throw new Error('The native contracted host is missing');
    s.player.provinceId = h.at; s.player.travel = null; s.player.gold = 100; s.player.prestige = 100;
    s.chars[me.id].skills.mar = 20; FB.setRealmRulerStanding(s,rid,25);
    const before = JSON.stringify([s.owner,s.holder,h.realm,h.men,h.units]);
    const q = FB.officeAppointmentQuote(s,me,{institutionId:rid,officeId:'court_service_command',holder:me,scope:{kind:'host',id:h.id}});
    if (!q.allowed) throw new Error(q.reason);
    const r = FB.officeSeekAppointment(s,q), command = M.review(s,me,r.id,'command',{hostId:h.id,destination:h.at});
    return {appointment:!!r,command:command.allowed,committed:M.commit(s,command),control:FB.playerControlsHost(s,h),
      conserved:before === JSON.stringify([s.owner,s.holder,h.realm,h.men,h.units]),gold:s.player.gold,
      civil:FB.political.power(s,me,'peace',{provinceId:h.at}).allowed};
  });
  expect(result).toEqual({appointment:true,command:true,committed:true,control:true,conserved:true,gold:85,civil:false});
});

test('favor, custody, issuer death, dismissal and expiry reject stale decisions before any mutation',async function ({page},info) {
  await native(page,info); await stage(page,true);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, r = s.authority.appointments.find(function (p) { return p.id === a.id; });
    function quote() { return M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid}); }
    const failures = [];
    function stale(change,restore) {
      const q = quote(); change(); const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      failures.push(q.allowed && !M.commit(s,q) && before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter());
      restore();
    }
    stale(function () { FB.setRealmRulerStanding(s,a.rid,-80); },function () { FB.setRealmRulerStanding(s,a.rid,25); });
    stale(function () { s.chars[a.me.id].unfree = true; },function () { delete s.chars[a.me.id].unfree; });
    stale(function () { s.player.flags.in_prison = 1; },function () { delete s.player.flags.in_prison; });
    const prior = FB.realmRulerGeneration(s,a.rid);
    stale(function () { s.realms[a.rid].ruler.generation = prior + 1; },function () { s.realms[a.rid].ruler.generation = prior; });
    const reaffirm = M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid});
    const court = {kind:'realm',id:a.rid};
    const removed = M.commit(s,M.review(s,court,a.id,'dismiss'));
    const afterRemoval = JSON.stringify(s), revoked = !M.commit(s,reaffirm) && afterRemoval === JSON.stringify(s),
      accepted = M.commit(s,M.review(s,a.me,a.id,'accept_loss'));
    const rejectedReaffirmation = !M.review(s,a.me,a.id,'confirm').allowed;
    s.turn = r.endTurn;
    return {failures:failures,removed:removed,revoked:revoked,accepted:accepted,reaffirm:rejectedReaffirmation,
      expiredClaim:!M.review(s,a.me,a.id,'acclaim',{hostId:a.hostId}).allowed,privateGold:s.player.gold};
  });
  expect(result).toEqual({failures:Array(4).fill(true),removed:true,revoked:true,accepted:true,reaffirm:true,expiredClaim:true,privateGold:985});
});

test('declared negotiation pays once from the real court, survives dismissal and never borrows a rich household purse',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, patron = s.realms[a.rid].treasury, guest = s.realms.ridge_court.treasury;
    patron.gold = 40; guest.gold = 10;
    const h = {id:'guest-host',realm:'ridge_court',at:'harbor_ridge',men:60,size:60,units:{levy:60},supply:100,from:'harbor_ridge',moveLeft:0,path:[],goal:null,warId:null};
    s.armies.push(h); FB.hostSupply(h);
    const input = {templateId:'lantern_service',federateRealmId:'ridge_court',hostId:h.id};
    const quote = M.review(s,a.me,a.id,'offer',input), before = JSON.stringify(s),
      pure = equal(before,JSON.stringify(s));
    function equal(a,b) { return a === b; }
    patron.gold = 1;
    const poor = M.review(s,a.me,a.id,'offer',input), unchanged = JSON.stringify(s), denied = !M.commit(s,poor) && unchanged === JSON.stringify(s);
    patron.gold = 40;
    const offer = M.commit(s,M.review(s,a.me,a.id,'offer',input));
    const selfConsent = M.commit(s,M.review(s,a.me,a.id,'consent',{contractId:offer.id}));
    const beforeOther = [patron.gold,guest.gold,s.player.gold];
    const otherConsent = FB.authorityConsentContract(s,offer.id,'ridge_court');
    const repeated = FB.authorityConsentContract(s,offer.id,'ridge_court');
    const initial = [patron.gold,guest.gold,s.player.gold], privateGold = s.player.gold;
    M.commit(s,M.review(s,{kind:'realm',id:a.rid},a.id,'dismiss'));
    s.turn = 90; s.officeCourtPeriod = 1; FB.authoritySeason(s);
    const seasonal = [patron.gold,guest.gold,s.player.gold];
    FB.authoritySeason(s);
    return {pure:pure,poor:poor.allowed,denied:denied,offered:!!offer,selfConsent:selfConsent,otherConsent:otherConsent,repeated:repeated,
      beforeOther:beforeOther,initial:initial,seasonal:seasonal,once:seasonal[0] === patron.gold && seasonal[1] === guest.gold,
      privateSame:privateGold === s.player.gold,effective:FB.political.contract(s,offer.id).effective,
      removedPower:!M.review(s,a.me,a.id,'offer',input).allowed};
  });
  expect(result).toEqual({pure:true,poor:false,denied:true,offered:true,selfConsent:true,otherConsent:true,repeated:false,
    beforeOther:[40,10,996],initial:[35,15,996],seasonal:[32,18,996],once:true,privateSame:true,effective:true,removedPower:true});
});

test('appointment proposals require fresh qualified targets and lawful court acceptance; NPC favor belongs to the NPC',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, candidate = FB.bookmarkActor(s,'lantern_notable');
    const target = {officeId:'lantern_scribe',holderId:candidate.id,scope:{kind:'realm',id:a.rid}};
    const proposed = M.commit(s,M.review(s,a.me,a.id,'propose',{target:target}));
    const count = s.authority.appointments.length, actor = {kind:'realm',id:a.rid}, acceptance = M.review(s,actor,a.id,'accept_proposal');
    candidate.unfree = true; const before = JSON.stringify(s), stale = !M.commit(s,acceptance) && before === JSON.stringify(s);
    delete candidate.unfree;
    const wrong = M.review(s,a.me,a.id,'accept_proposal').allowed;
    const accepted = M.commit(s,M.review(s,actor,a.id,'accept_proposal'));
    FB.setRealmRulerStanding(s,a.rid,-90);
    const npcRow = s.authority.appointments.find(function (r) { return r.id === accepted.id; });
    const npcFavor = M.favor(s,npcRow), npcQuote = M.review(s,npcRow.holder,npcRow.id,'propose',{target:{officeId:'lantern_watch',holderId:a.me.id,scope:{kind:'host',id:a.hostId}}});
    s.armies.push({id:'fresh-proposal-host',realm:a.rid,at:a.pid,men:30,units:{levy:30},supply:100,path:[]});
    const fresh = M.review(s,npcRow.holder,npcRow.id,'propose',{target:{officeId:'lantern_watch',holderId:FB.bookmarkActor(s,'ridge_notable').id,scope:{kind:'host',id:'fresh-proposal-host'}}});
    return {proposed:proposed,unchangedBeforeAcceptance:count + 1 === s.authority.appointments.length,stale:stale,wrong:wrong,
      accepted:!!accepted,identity:accepted.holder.id === candidate.id,npcFavor:npcFavor,npcPower:npcQuote.allowed,freshPower:fresh.allowed,
      playerSuspended:!M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid}).allowed};
  });
  expect(result).toEqual({proposed:true,unchangedBeforeAcceptance:true,stale:true,wrong:false,accepted:true,identity:true,npcFavor:0,npcPower:false,freshPower:true,playerSuspended:true});
});

for (const outcome of ['lawful','victory','defeat','withdraw','renounce']) test('acclamation resolves ' + outcome + ' with real support, conserved hosts and separate public cash',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function (outcome) {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, h = s.armies.find(function (h) { return h.id === a.hostId; }),
      r = s.authority.appointments.find(function (r) { return r.id === a.id; }), troops = JSON.stringify([h.id,h.men,h.units,h.supply]),
      land = JSON.stringify([s.owner,s.holder]), privateGold = s.player.gold, publicGold = s.realms[a.rid].treasury.gold;
    const raised = M.commit(s,M.review(s,a.me,a.id,'acclaim',{hostId:a.hostId}));
    const blockedLiving = !M.review(s,a.me,a.id,'accede').allowed;
    let result, war;
    if (outcome === 'lawful') result = M.commit(s,M.review(s,{kind:'realm',id:a.rid},a.id,'accede'));
    else if (outcome === 'renounce') result = M.commit(s,M.review(s,a.me,a.id,'renounce'));
    else {
      const review = M.review(s,a.me,a.id,'dispute'); if (!review.allowed) throw new Error(review.reason);
      war = M.commit(s,review);
      if (outcome === 'withdraw') result = M.commit(s,M.review(s,a.me,a.id,'withdraw'));
      else if (outcome === 'victory') {
        // Stage the actual ordinary occupation boundary, not an officer winner.
        war.occupations[a.pid] = {occupied:true,progress:100};
        result = FB.advanceOrdinaryObjectives(s,war.id);
      } else { h.men = 0; h.units = {levy:0,ret:0}; result = FB.advanceOrdinaryObjectives(s,war.id); }
    }
    const won = outcome === 'lawful' || outcome === 'victory';
    const currentHost = s.armies.find(function (host) { return host.id === a.hostId; });
    const current = M.snapshot(s,r.id), envelope = JSON.parse(FB.save.serialize());
    FB.save.restore(envelope); const after = JSON.parse(FB.save.serialize());
    return {raised:raised,blockedLiving:blockedLiving,result:!!result,status:current.appointment.mandate.claim.status,
      noFreeTroops:outcome === 'defeat' ? currentHost.men === 0 : troops === JSON.stringify([currentHost.id,currentHost.men,currentHost.units,currentHost.supply]),
      land:won || land === JSON.stringify([s.owner,s.holder]),privateGold:privateGold === s.player.gold,
      publicGold:won ? FB.state.realms.player.treasury.gold === publicGold : s.realms[a.rid].treasury.gold === publicGold,
      accountSeparated:!won || FB.treasurySeparated(FB.state,'player'),
      stillHousehold:won ? FB.state.player.provs.length > 0 : !FB.station.isLanded(FB.state.player,FB.state),
      sameAppointment:JSON.stringify(envelope.state.authority.appointments) === JSON.stringify(after.state.authority.appointments),
      counters:(envelope.rng >>> 0) === (after.rng >>> 0) && envelope.uid === after.uid};
  },outcome);
  expect(result).toEqual({raised:true,blockedLiving:true,result:true,status:outcome === 'lawful' || outcome === 'victory' ? 'succeeded' : 'failed',
    noFreeTroops:true,land:true,privateGold:true,publicGold:true,accountSeparated:true,stillHousehold:true,sameAppointment:true,counters:true});
});

test('matching imported saves preserve the original commission twice; malformed provenance and changed mods reject atomically',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()), id = MANDATE.id, authority = JSON.stringify(source.state.authority), rounds = [];
    for (let i = 0; i < 2; i++) {
      FB.save.restore(i ? JSON.parse(FB.save.serialize()) : source);
      rounds.push(authority === JSON.stringify(FB.state.authority) && source.uid === FB.getUidCounter() && (source.rng >>> 0) === (FB.getRngState() >>> 0));
    }
    const rejected = [
      function (d,r) { delete r.mandate; }, function (d,r) { r.mandate.originalGeneration = -1; },
      function (d,r) { r.mandate.originalInstitutionId = 'ridge_court'; }, function (d,r) { r.mandate.definitionKey += 'changed'; },
      function (d,r) { r.mandate.response = {choice:'retain_powers',turn:0}; },
      function (d,r) { r.mandate.proposal = {target:{officeId:'lantern_scribe',holderId:'absent',scope:{kind:'realm',id:'lantern_court'}},generation:1,turn:0,status:'pending'}; },
      function (d) { d.mods += 'changed'; }
    ].map(function (change) {
      const d = JSON.parse(JSON.stringify(source)); change(d,d.state.authority.appointments.find(function (r) { return r.id === id; }));
      const live = FB.state, before = JSON.stringify(live), storage = JSON.stringify(localStorage), rng = FB.getRngState(), uid = FB.getUidCounter();
      let failed = false;
      try { if (d.mods !== source.mods) failed = FB.game.loadData(d) === false; else FB.save.restore(d); } catch (e) { failed = true; }
      return failed && live === FB.state && before === JSON.stringify(FB.state) && storage === JSON.stringify(localStorage) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    return {rounds:rounds,rejected:rejected};
  });
  expect(result).toEqual({rounds:[true,true],rejected:Array(7).fill(true)});
});

test('an actual appointer death requires reaffirmation of the same original mandate without another fee or term',async function ({page},info) {
  await native(page,info); await stage(page,true);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, r = s.authority.appointments.find(function (r) { return r.id === a.id; }),
      original = JSON.stringify([r.id,r.holder,r.startTurn,r.endTurn,r.mandate.originalGeneration]), gold = s.player.gold,
      q = M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid}), old = FB.realmRulerCharacterSnapshot(s,a.rid);
    FB.killChar(s,old);
    const suspended = !M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid}).allowed,
      before = JSON.stringify(s), stale = !M.commit(s,q) && before === JSON.stringify(s),
      confirm = M.review(s,a.me,a.id,'confirm');
    const confirmed = M.commit(s,confirm);
    return {suspended:suspended,stale:stale,confirmed:confirmed,reason:confirm.reason,
      sameOriginal:original === JSON.stringify([r.id,r.holder,r.startTurn,r.endTurn,r.mandate.originalGeneration]),
      noFee:gold === s.player.gold,command:M.review(s,a.me,a.id,'command',{hostId:a.hostId,destination:a.pid}).allowed};
  });
  expect(result).toEqual({suspended:true,stale:true,confirmed:true,reason:null,sameOriginal:true,noFee:true,command:true});
});

test('dismissed native commanders need independent recognition and cannot forge another court’s assent',async function ({page},info) {
  await native(page,info); await stage(page,true);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates;
    const dismissed = M.commit(s,M.review(s,{kind:'realm',id:a.rid},a.id,'dismiss'));
    const raised = M.commit(s,M.review(s,a.me,a.id,'acclaim',{hostId:a.hostId}));
    const alone = !M.review(s,a.me,a.id,'dispute').allowed;
    const claim = FB.officeClaimants(s).find(function (c) { return c.holder.id === a.me.id && c.institutionId === a.rid; });
    const other = {kind:'realm',id:'byzantium'}, mandate = FB.officeRecognitionMandates(s,other).find(function (m) { return m.issuer.kind === 'realm'; });
    const forged = FB.officeClaimQuote(s,a.me,claim,mandate,'recognize').allowed;
    const recognition = FB.officeClaimQuote(s,other,claim,mandate,'recognize');
    const recognized = FB.officeDeclareClaim(s,recognition), supported = M.review(s,a.me,a.id,'dispute');
    const proof = FB.political.legitimacy(s,a.me,{kind:'realm',id:a.rid}).find(function (p) { return p.issuer.kind === 'realm'; });
    FB.authorityRecognitionTransition(s,proof.id,'revoke');
    const before = JSON.stringify(s), stale = !M.commit(s,supported) && before === JSON.stringify(s);
    return {dismissed:dismissed,raised:raised,alone:alone,forged:forged,recognized:recognized,supported:supported.allowed,stale:stale,
      revokedPay:!M.review(s,a.me,a.id,'offer',{templateId:'court_paid_service',federateRealmId:'pannonia',hostId:'host_476_amal'}).allowed};
  });
  expect(result).toEqual({dismissed:true,raised:true,alone:true,forged:false,recognized:true,supported:true,stale:true,revokedPay:true});
});

test('public mandates retain productive-source gates and use each actual recognition principal',async function ({page},info) {
  await imported(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, M = FB.officeMandates, R = FB.governmentRecognition, rid = 'ridge_court', pid = 'harbor_ridge',
      me = {kind:'character',id:s.player.charId}, patron = {kind:'realm',id:rid};
    s.player.provinceId = pid; s.player.gold = 1000; s.player.prestige = 1000;
    FB.SKILLS.forEach(function (skill) { s.chars[me.id].skills[skill] = 20; });
    FB.setRealmRulerStanding(s,rid,25); s.realms[rid].treasury.gold = 100;
    const site = FB.settlementGrantSites(s,pid,rid)[0], holder = FB.bookmarkActor(s,'ridge_notable');
    if (!site || !FB.assignSettlementLordship(s,pid,site.settlement,holder.id)) throw new Error('Missing actual public source');
    const host = {id:'public-mandate-host',realm:rid,at:pid,from:pid,men:80,size:80,units:{levy:80},supply:100,moveLeft:0,path:[],goal:null,warId:null};
    s.armies.push(host); FB.hostSupply(host);
    const input = {institutionId:rid,officeId:'lantern_marshal',holderId:me.id,provinceId:pid,scope:{kind:'host',id:host.id}},
      q = FB.publicAppointmentQuote(s,me,input);
    if (!q.allowed) throw new Error(q.reason);
    const appointment = FB.publicAppoint(s,q), r = s.authority.appointments.find(function (r) { return r.id === appointment.id; }),
      ordinary = FB.officeAppointmentQuote(s,me,{institutionId:rid,officeId:'lantern_marshal',holder:me,scope:input.scope});
    const proposalHost = {id:'public-proposal-host',realm:rid,at:pid,from:pid,men:20,size:20,units:{levy:20},supply:100,path:[]};
    s.armies.push(proposalHost); FB.hostSupply(proposalHost); holder.skills.mar = 20;
    const proposal = M.review(s,me,r.id,'propose',{target:{officeId:'lantern_marshal',holderId:holder.id,
      scope:{kind:'host',id:proposalHost.id},sourceProvinceId:pid}});
    if (!proposal.allowed) throw new Error(proposal.reason);
    M.commit(s,proposal);
    const refusal = M.review(s,patron,r.id,'reject_proposal'), balances = [s.realms[rid].treasury.gold,s.player.gold],
      refused = M.commit(s,refusal), freeRefusal = refused && proposal.cost > 0 && refusal.cost === 0 &&
        r.mandate.proposal.status === 'rejected' && balances[0] === s.realms[rid].treasury.gold && balances[1] === s.player.gold;
    s.armies.push({id:'lantern_auxiliary',realm:'lantern_court',at:'harbor_quay',men:40,size:40,units:{levy:40},supply:100,path:[]});
    const service = FB.authorityOfferContractTemplate(s,'lantern_service',{patronRealmId:rid,federateRealmId:'lantern_court',hostId:'lantern_auxiliary'});
    FB.authorityConsentContract(s,service.id,rid); FB.authorityConsentContract(s,service.id,'lantern_court');
    const publicForeignDenied = !M.review(s,me,r.id,'command',{hostId:'lantern_auxiliary',destination:pid}).allowed;
    const stale = M.review(s,me,r.id,'command',{hostId:host.id,destination:pid}), oldHolder = s.holder[pid];
    s.holder[pid] = 'lantern_court'; const before = JSON.stringify(s), sourceRejected = !M.commit(s,stale) && before === JSON.stringify(s); s.holder[pid] = oldHolder;
    const acclaimed = M.commit(s,M.review(s,me,r.id,'acclaim',{hostId:host.id}));
    const candidate = R.candidates(s,rid).find(function (c) { return c.charId === me.id; }), seat = R.members(s,rid).find(function (m) { return m.principal.id === me.id; });
    const forged = R.supportQuote(s,patron,rid,seat.id,candidate.id).allowed;
    const vote = R.applySupport(s,R.supportQuote(s,me,rid,seat.id,candidate.id));
    const accession = M.review(s,patron,r.id,'accede'), publicGold = s.realms[rid].treasury.gold, privateGold = s.player.gold;
    const acceded = M.commit(s,accession), saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const restored = FB.state.authority.appointments.find(function (p) { return p.id === r.id; });
    return {profile:!!r.publicTerms,freeRefusal:freeRefusal,sourceRejected:sourceRejected,legacyDenied:!ordinary.allowed,publicForeignDenied:publicForeignDenied,acclaimed:acclaimed,forged:forged,vote:vote,
      accession:accession.allowed,acceded:!!acceded,privateGold:FB.state.player.gold === privateGold,
      publicGold:FB.state.realms.player.treasury.gold === publicGold,original:restored.mandate.originalInstitutionId === rid,
      sameHolder:restored.holder.id === me.id,sameId:restored.id === appointment.id};
  });
  expect(result).toEqual({profile:true,freeRefusal:true,sourceRejected:true,legacyDenied:true,publicForeignDenied:true,acclaimed:true,forged:false,vote:true,accession:true,acceded:true,
    privateGold:true,publicGold:true,original:true,sameHolder:true,sameId:true});
});

test('AI officers and courts use the same bounded reviews, and a command-only mandate grants no civil or payment authority',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, npc = FB.bookmarkActor(s,'lantern_notable'), patron = {kind:'realm',id:a.rid};
    const h = {id:'watch-host',realm:a.rid,at:a.pid,from:a.pid,men:40,size:40,units:{levy:40},supply:100,moveLeft:0,path:[],goal:null,warId:null};
    s.armies.push(h); FB.hostSupply(h);
    const q = FB.officeAppointmentQuote(s,patron,{institutionId:a.rid,officeId:'lantern_watch',holder:{kind:'character',id:npc.id},scope:{kind:'host',id:h.id}});
    const r = FB.officeSeekAppointment(s,q), person = {kind:'character',id:npc.id};
    const command = M.review(s,person,r.id,'command',{hostId:h.id,destination:a.pid}),
      denied = ['propose','offer'].map(function (op) {
        return !M.review(s,person,r.id,op,op === 'propose' ? {target:{officeId:'lantern_scribe',holderId:a.me.id,scope:{kind:'realm',id:a.rid}}} :
          {templateId:'lantern_service',federateRealmId:'ridge_court',hostId:'absent'}).allowed;
      });
    const target = {officeId:'lantern_scribe',holderId:npc.id,scope:{kind:'realm',id:a.rid}};
    const proposed = M.commit(s,M.review(s,a.me,a.id,'propose',{target:target}));
    M.ai(s,a.rid);
    const accepted = s.authority.appointments.find(function (p) { return p.id === a.id; }).mandate.proposal.status === 'accepted';
    return {command:command.allowed,committed:M.commit(s,command),denied:denied,proposed:proposed,accepted:accepted,
      landless:!FB.station.isLanded(s.player,s),favor:M.favor(s,s.authority.appointments.find(function (p) { return p.id === r.id; }))};
  });
  expect(result).toEqual({command:true,committed:true,denied:[true,true],proposed:true,accepted:true,landless:true,favor:0});
});

test('a claimant’s active dispute restores without duplicated forces or spending',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const a = MANDATE, M = FB.officeMandates, s = FB.state;
    M.commit(s,M.review(s,a.me,a.id,'acclaim',{hostId:a.hostId}));
    const war = M.commit(s,M.review(s,a.me,a.id,'dispute'));
    const saved = JSON.parse(FB.save.serialize()), before = JSON.stringify(saved.state.authority), men = s.armies.reduce(function (n,h) { return n+h.men; },0);
    FB.save.restore(saved);
    const again = JSON.parse(FB.save.serialize()); FB.save.restore(again);
    const rejected = [
      function (d,c) { c.factionId = 'ridge_court'; },
      function (d,c) { c.status = 'claimed'; },
      function (d,c) { d.state.wars[c.warId].casus.type = 'border'; },
      function (d,c) { d.state.wars[c.warId].defender = 'ridge_court'; }
    ].map(function (change) {
      const d = JSON.parse(JSON.stringify(again)), c = d.state.authority.appointments.find(function (r) { return r.id === a.id; }).mandate.claim;
      change(d,c);
      const live = FB.state, before = JSON.stringify(live), storage = JSON.stringify(localStorage), rng = FB.getRngState(), uid = FB.getUidCounter();
      let failed = false; try { FB.save.restore(d); } catch (e) { failed = true; }
      return failed && live === FB.state && before === JSON.stringify(FB.state) && storage === JSON.stringify(localStorage) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
    const current = FB.state, r = M.snapshot(current,a.id);
    return {same:before === JSON.stringify(current.authority),men:men === current.armies.reduce(function (n,h) { return n+h.men; },0),
      war:!!FB.ordinaryWarById(current,war.id),status:r.appointment.mandate.claim.status,
      control:FB.playerControlsHost(current,current.armies.find(function (h) { return h.id === a.hostId; })),
      pay:!M.review(current,a.me,a.id,'offer',{templateId:'lantern_service',federateRealmId:'ridge_court',hostId:a.hostId}).allowed,
      counters:saved.uid === FB.getUidCounter() && (saved.rng >>> 0) === (FB.getRngState() >>> 0),rejected:rejected};
  });
  expect(result).toEqual({same:true,men:true,war:true,status:'disputed',control:true,pay:true,counters:true,rejected:[true,true,true,true]});
});

test('NPC acclamation can displace a player court through the same ordinary war and ruler owners',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates;
    M.commit(s,M.review(s,a.me,a.id,'acclaim',{hostId:a.hostId}));
    const first = M.commit(s,M.review(s,{kind:'realm',id:a.rid},a.id,'accede'));
    if (!first) throw new Error('Initial lawful accession failed');
    const npc = FB.bookmarkActor(s,'lantern_notable'), actor = {kind:'character',id:npc.id}, pid = s.realms.player.capital,
      publicGold = s.realms.player.treasury.gold, privateGold = s.player.gold,
      h = {id:'npc-dispute-host',realm:'player',at:pid,from:pid,men:60,size:60,units:{levy:60},supply:100,moveLeft:0,path:[],goal:null,warId:null,
        scenarioStanding:true,scenarioEndTurn:s.turn+180};
    s.armies.push(h); FB.hostSupply(h);
    const office = FB.officeAppointmentQuote(s,{kind:'realm',id:'player'},{institutionId:'player',officeId:'lantern_marshal',holder:actor,scope:{kind:'host',id:h.id}});
    if (!office.allowed) throw new Error(office.reason);
    const appointment = FB.officeSeekAppointment(s,office);
    const acclaimed = M.commit(s,M.review(s,actor,appointment.id,'acclaim',{hostId:h.id}));
    // The real occupation boundary has no incumbent host in the captured seat.
    const elsewhere = s.player.provs.find(function (p) { return p !== pid; });
    s.armies.filter(function (a) { return a.realm === 'player' && a.id !== h.id; }).forEach(function (a) {
      a.at = elsewhere; a.from = elsewhere; a.path = []; a.goal = null; a.moveLeft = 0;
    });
    const review = M.review(s,actor,appointment.id,'dispute');
    if (!review.allowed) throw new Error(review.reason);
    const war = M.commit(s,review); war.occupations[pid] = {occupied:true,progress:100};
    const settled = FB.advanceOrdinaryObjectives(s,war.id), r = s.authority.appointments.find(function (r) { return r.id === appointment.id; }),
      rid = r.mandate.claim.currentCourtId, saved = JSON.parse(FB.save.serialize());
    FB.save.restore(saved);
    const ruler = FB.realmRulerCharacterSnapshot(FB.state,rid);
    if (!ruler) {
      const realm = FB.state.realms[rid], tree = realm && realm.succession;
      throw new Error(JSON.stringify({rid:rid,status:r.mandate.claim.status,realm:realm && {alive:realm.alive,id:realm.id,ruler:realm.ruler},
        tree:tree,npc:FB.state.chars[npc.id] && {id:npc.id,dead:FB.state.chars[npc.id].dead,royalLine:FB.state.chars[npc.id].royalLine},
        warnings:FB.save.lastRestoreWarnings.map(function (w) { return w.stage; })}));
    }
    return {acclaimed:acclaimed,settled:settled,status:r.mandate.claim.status,
      holder:ruler.id === npc.id,
      privateGold:FB.state.player.gold === privateGold,publicGold:FB.state.realms[rid].treasury.gold === publicGold,
      men:FB.state.armies.find(function (a) { return a.id === h.id; }).men,
      standing:FB.scenarioHostStanding(FB.state,FB.state.armies.find(function (a) { return a.id === h.id; })),
      original:FB.state.authority.appointments.find(function (p) { return p.id === appointment.id; }).mandate.originalInstitutionId,
      household:!FB.station.isLanded(FB.state.player,FB.state),same:JSON.stringify(saved.state.authority) === JSON.stringify(FB.state.authority)};
  });
  expect(result).toEqual({acclaimed:true,settled:true,status:'succeeded',holder:true,privateGold:true,publicGold:true,men:60,standing:true,original:'player',household:true,same:true});
});

test('renewal, refusal, stale counterpart generations and home spending guards preserve bilateral transactions',async function ({page},info) {
  await imported(page,info); await stage(page);
  const result = await page.evaluate(function () {
    const s = FB.state, a = MANDATE, M = FB.officeMandates, patron = s.realms[a.rid].treasury, guest = s.realms.ridge_court.treasury;
    patron.gold = 100; guest.gold = 10;
    s.armies.push({id:'renewal-host',realm:'ridge_court',at:'harbor_ridge',men:50,size:50,units:{levy:50},supply:100,path:[],moveLeft:0,goal:null,warId:null});
    const input = {templateId:'lantern_service',federateRealmId:'ridge_court',hostId:'renewal-host'};
    const offered = M.commit(s,M.review(s,a.me,a.id,'offer',input)), consent = M.review(s,a.me,a.id,'consent',{contractId:offered.id}), gen = s.realms.ridge_court.ruler.generation;
    s.realms.ridge_court.ruler.generation++;
    const before = JSON.stringify(s), stale = !M.commit(s,consent) && before === JSON.stringify(s);
    s.realms.ridge_court.ruler.generation = gen;
    M.commit(s,M.review(s,a.me,a.id,'consent',{contractId:offered.id})); FB.authorityConsentContract(s,offered.id,'ridge_court');
    const money = [patron.gold,guest.gold];
    const renewed = M.commit(s,M.review(s,a.me,a.id,'renew',{contractId:offered.id,endTurn:360,payPerSeason:4}));
    const reconsent = M.commit(s,M.review(s,a.me,a.id,'consent',{contractId:offered.id}));
    FB.authorityConsentContract(s,offered.id,'ridge_court');
    const once = money[0] === patron.gold && money[1] === guest.gold;
    FB.authorityContractTransition(s,offered.id,'release',a.rid);
    const refusedOffer = M.commit(s,M.review(s,a.me,a.id,'offer',input));
    const refused = M.commit(s,M.review(s,a.me,a.id,'refuse',{contractId:refusedOffer.id}));
    const courtOffer = FB.authorityOfferContractTemplate(s,'lantern_service',{
      patronRealmId:a.rid,federateRealmId:'ridge_court',hostId:'renewal-host'});
    FB.authorityConsentContract(s,courtOffer.id,'ridge_court');
    const courtBalances = [patron.gold,guest.gold,s.player.gold],
      adopted = M.commit(s,M.review(s,a.me,a.id,'consent',{contractId:courtOffer.id})),
      adoptedContract = FB.political.contract(s,courtOffer.id),
      courtPayment = adopted && adoptedContract.publicPayer === true && adoptedContract.effective &&
        patron.gold === courtBalances[0]-5 && guest.gold === courtBalances[1]+5 && s.player.gold === courtBalances[2];
    FB.authorityContractTransition(s,courtOffer.id,'release',a.rid);
    const current = FB.campaignBookmark(s), old = current.homeAuthorityPolicies;
    // Test the existing dated-policy read without modifying any definition.
    const resolve = FB.homeAuthority.policy;
    FB.homeAuthority.policy = function (state,rid) { return rid === a.rid ? {schema:1,presence:'capital',delegation:false} : resolve(state,rid); };
    const guard = M.review(s,a.me,a.id,'offer',input), untouched = JSON.stringify(s), denied = !M.commit(s,guard) && untouched === JSON.stringify(s);
    FB.homeAuthority.policy = resolve;
    return {stale:stale,renewed:renewed,reconsent:reconsent,once:once,refused:refused,courtPayment:courtPayment,
      status:FB.political.contract(s,refusedOffer.id).status,guard:guard.allowed,denied:denied,privateGold:s.player.gold};
  });
  expect(result).toEqual({stale:true,renewed:true,reconsent:true,once:true,refused:true,courtPayment:true,status:'expired',guard:false,denied:true,privateGold:996});
});
