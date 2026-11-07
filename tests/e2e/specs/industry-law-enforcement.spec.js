'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const imported = require('../fixtures/authoring/industry-law-enforcement.json');

dependsOnRuntime(__filename, ['data/industry_laws.js','data/technology.js','data/events_intrigue.js','data/intrigue.js',
  'js/industry_laws.js','js/justice.js','js/events.js','js/intrigue.js','js/economy.js','js/market.js',
  'js/treasury.js','js/actions.js','js/authority.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js']);

async function start(page, info, mod) {
  if (mod) {
    await openGame(page, info); await prepareGameContent(page);
    expect(await page.evaluate(function (data) { return FB.mods.validate(data); }, imported)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/industry-law-enforcement.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await prepareGameContent(page); await beginBookmarkFromTitle(page, '1204');
  } else await beginBookmark(page, info, '1204');
  await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    p.tier = 1; p.profession = 'merchant'; p.provinceId = 'london'; p.homeSettlement = 0; p.gold = 2000;
    FB.setCareer(s, me, 'merchant', 'journeyman'); me.skills.dip = 12; me.skills.ste = 12;
    const tech = FB.realmTechRecord(s, FB.techRealmId(s));
    ['urban_markets','annual_fairs'].forEach(function (id) { if (tech.completed.indexOf(id) < 0) tech.completed.push(id); });
    FB.fns.local_council_elected(s); FB.enterpriseList(s); FB.enterpriseLaborRecords(s);
    const rid = s.holder.london || s.owner.london;
    const judge = FB.materializeRealmRuler(s, rid); judge.traits = [];
    s.eventQueue = [];
    window.remedyCourt = {rid:rid, actorId:judge.id};
    window.remedySnapshot = function () {
      return JSON.stringify({state:FB.state, rng:FB.getRngState(), uid:FB.getUidCounter(), storage:Object.assign({}, localStorage)});
    };
    window.remedySeed = function (chance, success) {
      for (let i = 0; i < 256; i++) {
        const seed = FB.getRngState(), roll = FB.rng();
        if ((roll < chance) === success) { FB.setRngState(seed); return; }
      }
      throw new Error('No bounded ordinary seed for requested outcome');
    };
    window.remedyBusiness = function () {
      const s = FB.state, e = FB.buyEnterprise(s, 'market_stall_business', 0);
      if (!e) throw new Error('Stall purchase unavailable: ' + JSON.stringify(FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', 0)));
      while (FB.enterpriseStaffAssigned(s,e) < FB.enterpriseStaffRequired(e)) {
        if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('Local stall labor unavailable');
      }
      return e;
    };
    window.remedyEnact = function (id) {
      const s = FB.state, L = FB.industryLaws, d = FBDATA.industryLaws[id];
      s.player.localCouncil.nextMotionTurn = s.turn;
      if (d.voting) {
        let q = L.quoteAssembly(s,id,'town','begin');
        const v = FB.proposeLocalCouncilMotion(s,d.motionId,q);
        if (!v) throw new Error('Native hearing unavailable: ' + JSON.stringify(q));
        const m = L.quoteAssembly(s,id,'town','resolve',v.id).members.filter(function (r) { return r.actorId === s.player.charId; })[0];
        if (m) L.commitAssembly(s,L.quoteAssembly(s,id,'town','ballot',v.id,m.id,'support'));
        q = L.quoteAssembly(s,id,'town','resolve',v.id);
        if (!L.commitAssembly(s,q) || v.status !== 'passed') throw new Error('Native hearing did not enact: ' + JSON.stringify(q));
      } else {
        remedySeed(FB.localCouncilMotionChance(s),true);
        const q = L.quoteMotion(s,id), r = FB.proposeLocalCouncilMotion(s,d.motionId,q);
        if (!r || !r.passed) throw new Error('Seeded council did not enact');
      }
      return s.industryLaws.laws[s.industryLaws.laws.length - 1];
    };
    window.remedyViolate = function (id) {
      const s = FB.state, L = FB.industryLaws, e = remedyBusiness(), law = remedyEnact(id || 'london_market_restriction');
      s.turn = Math.max(90,law.transitionEndTurn);
      const q = L.quoteOperation(s,e,'violate',0);
      if (!L.commitOperation(s,q)) throw new Error('Unauthorized operation unavailable: ' + JSON.stringify(q));
      FB.marketSeason(s);
      const v = s.industryLaws.violations && s.industryLaws.violations[0];
      if (!v || !v.caseId) throw new Error('Actual output did not file a complaint: ' + JSON.stringify({v:v,status:L.operation(s,e),yield:FB.enterpriseYield(s,e)}));
      return {e:e,law:law,v:v};
    };
    window.remedyRespond = function (action) {
      const s = FB.state, p = s.justice.pending;
      if (!p) throw new Error('No public response queued');
      const ev = FB.eventById(p.kind === 'arrest' ? 'justice_arrest' : 'justice_hearing');
      const option = ev.options.filter(function (o) { return o.effects.custom === action; })[0];
      return FB.resolveEventOption(s, ev, option, {justiceId:p.id,studentId:p.actorId});
    };
    window.remedyArrest = function (v) {
      const s = FB.state, q = FB.industryLaws.quoteComplaint(s,v.id);
      if (!FB.industryLaws.answerComplaint(s,q) || !remedyRespond('justice_submit')) throw new Error('Canonical arrest submission failed');
      if (!FB.justiceCustodyOf(s,s.player.charId) || !s.justice.pending) throw new Error('Custody did not produce a hearing');
    };
  });
}

test('native council vote, actual trading, hearing, fine, closure and affected-owner repeal form one loop', async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = remedyBusiness(), law = remedyEnact('london_market_restriction');
    const grace = L.operation(s,e).covered;
    s.turn = 90;
    const before = remedySnapshot(), q = L.quoteOperation(s,e,'violate',0);
    const pure = before === remedySnapshot(), noOffense = !s.industryLaws.violations && FB.enterpriseYield(s,e) === 0;
    L.commitOperation(s,q);
    const choiceOnly = !s.industryLaws.violations;
    FB.marketSeason(s);
    const v = s.industryLaws.violations[0], o = s.justice.offenses.filter(function (r) { return r.id === v.caseId; })[0];
    const evidence = v.actorId === s.player.charId && v.lawId === law.id && v.provinceId === 'london' && v.output > 0 && o.evidence === 'material';
    const noConviction = !o.closed && v.judgment === null && !FB.justiceCustodyOf(s,s.player.charId);
    const absent = FB.justiceApplyPunishment(s,remedyCourt.actorId,s.player.charId,'fine',o.id).blocker === 'custody';
    const count = s.justice.offenses.length, uid = FB.getUidCounter();
    FB.marketSeason(s); L.recordSeason(s);
    const once = s.industryLaws.violations.length === 1 && s.justice.offenses.length === count && FB.getUidCounter() === uid;
    remedyArrest(v);
    const options = FB.justiceSentenceOptions(s,remedyCourt.actorId,s.player.charId).map(function (p) { return FBDATA.justiceSentences[p.sentence].kind; });
    const bounded = options.every(function (k) { return k === 'pardon' || k === 'fine'; });
    const gold = s.player.gold, publicGold = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const imposed = !!remedyRespond('justice_submit');
    const paid = s.player.gold === gold - 16 && FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === publicGold + 16;
    const closed = v.judgment.closure && v.judgment.paid === 16 && FB.enterpriseYield(s,e) === 0 && s.player.enterprises.indexOf(e) >= 0;
    const noRepeat = !L.payDebt(s,L.quoteDebt(s,v.id)) && !L.fileComplaint(s,v.id);
    delete s.player.localCouncil; delete s.player.flags.councilman;
    const pq = L.quotePetition(s,e.uid,law.id,'repeal'), vote = L.commitPetition(s,pq);
    const petition = !!vote && vote.petitionEnterpriseUid === e.uid && !L.commitPetition(s,pq);
    const settled = vote && L.commitAssembly(s,L.quoteAssembly(s,law.definitionId,'town','resolve',vote.id));
    const repeal = !!settled && vote.status === 'passed' && L.lifecycle(s,law) === 'repealed';
    const resumed = L.commitOperation(s,L.quoteOperation(s,e,'resume',0)) && FB.enterpriseYield(s,e) > 0;
    const reviews = FBDATA.techImpactReviews.features;
    const reliefAndClosure = reviews.industry_law_relief.mode === 'none' && reviews.industry_law_closure.mode === 'none';
    L.validate(s);
    return {grace,pure,noOffense,choiceOnly,evidence,noConviction,absent,once,bounded,imposed,paid,closed,noRepeat,petition,repeal,resumed,
      original:s.justice.offenses[0].closed && v.actorId === s.player.charId,reliefAndClosure,technology:reviews.industry_law_enforcement.mode};
  });
  expect(r).toEqual({grace:true,pure:true,noOffense:true,choiceOnly:true,evidence:true,noConviction:true,absent:true,once:true,bounded:true,
    imposed:true,paid:true,closed:true,noRepeat:true,petition:true,repeal:true,resumed:true,original:true,reliefAndClosure:true,technology:'none'});
});

test('grace, resident exemption, payment and paused or unstaffed businesses create no accusation', async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = remedyBusiness(), law = remedyEnact('london_stall_license');
    const exempt = L.operation(s,e).covered && L.operation(s,e).laws[0].exempt;
    s.player.provinceId = 'york';
    const grace = L.operation(s,e).covered;
    s.turn = 90;
    const q = L.quoteOperation(s,e,'pay',0), gold = s.player.gold;
    s.player.gold = 0;
    const before = remedySnapshot(), poor = !L.commitOperation(s,q) && before === remedySnapshot();
    s.player.gold = gold;
    const paid = L.commitOperation(s,L.quoteOperation(s,e,'pay',0));
    FB.marketSeason(s); FB.livelihoodSeason(s);
    const lawful = !s.industryLaws.violations && L.operation(s,e).covered;
    s.turn = 180;
    L.commitOperation(s,L.quoteOperation(s,e,'violate',0));
    L.commitOperation(s,L.quoteOperation(s,e,'pause',0));
    FB.marketSeason(s);
    const paused = !s.industryLaws.violations && FB.enterprisePhysicalYield(s,e) === 0;
    L.commitOperation(s,L.quoteOperation(s,e,'violate',0));
    (e.workerIds || [e.workerId]).slice().forEach(function (id) { FB.unassignEnterpriseWorker(s,id); });
    L.recordSeason(s);
    const unstaffed = !s.industryLaws.violations;
    return {exempt,grace,poor,paid,lawful,paused,unstaffed,originalPayee:law.payeeRealmId === remedyCourt.rid};
  });
  expect(r).toEqual({exempt:true,grace:true,poor:true,paid:true,lawful:true,paused:true,unstaffed:true,originalPayee:true});
});

test('ordinary imported remedies vary exemption, refusal, repeal and fines with pure atomic validation', async function ({page}, info) {
  await start(page,info,true);
  const r = await page.evaluate(function (mod) {
    const s = FB.state, L = FB.industryLaws, e = remedyBusiness(), law = remedyEnact('estuary_stall_due');
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const bad = ['death','forfeiture','imprisonment'].every(function (penalty) {
      const c = JSON.parse(JSON.stringify(mod)); c.industryLaws.estuary_stall_due.offense.penalty = penalty;
      return FB.mods.validate(c).length > 0;
    });
    const malformed = JSON.parse(JSON.stringify(mod)); malformed.industryLaws.estuary_stall_due.relief.execute = 'confiscate';
    const pure = bad && FB.mods.validate(malformed).length > 0 && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const q = L.quotePetition(s,e.uid,law.id,'exemption'), granted = L.commitPetition(s,q);
    const relief = granted.granted && granted.endTurn === s.turn + 45 && L.operation(s,e).covered && !L.commitPetition(s,q);
    s.turn = 90;
    L.commitOperation(s,L.quoteOperation(s,e,'violate',0)); FB.marketSeason(s);
    const v = s.industryLaws.violations[0]; remedyArrest(v);
    const quote = FB.justicePunishmentProjection(s,remedyCourt.actorId,s.player.charId,'fine',v.caseId);
    const terms = quote.fine === 5 && quote.industry.closure;
    remedyRespond('justice_submit');
    const repeat = L.quotePetition(s,e.uid,law.id,'repeal'), repeal = L.commitPetition(s,repeat);
    const removed = repeal.granted && law.repealedTurn === s.turn && !L.commitPetition(s,repeat);
    L.commitOperation(s,L.quoteOperation(s,e,'resume',0));
    const reserve = remedyEnact('estuary_stall_reserve');
    const denied = L.commitPetition(s,L.quotePetition(s,e.uid,reserve.id,'exemption'));
    s.player.provinceId = 'york';
    const lawful = !denied.granted && L.operation(s,e).covered && L.operation(s,e).laws[0].exempt;
    L.validate(s);
    return {pure,relief,terms,removed,lawful,count:s.industryLaws.violations.length,text:FB.save.serialize()};
  }, imported);
  expect(r).toMatchObject({pure:true,relief:true,terms:true,removed:true,lawful:true,count:1});
  await restoreBookmark(page,r.text);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return FB.state.industryLaws.violations.length; })).toBe(1);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = remedySnapshot(); saved.mods += '-changed';
    try { FB.save.restore(saved); return false; } catch (error) { return before === remedySnapshot(); }
  })).toBe(true);
});

test('current pending cases and partially paid judgments survive repeated saves and reject malformed evidence atomically', async function ({page}, info) {
  await start(page,info);
  const staged = await page.evaluate(function () {
    const f = remedyViolate(); remedyArrest(f.v);
    FB.state.player.gold = 3;
    return {text:FB.save.serialize(),ledger:JSON.stringify(FB.state.industryLaws),rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  await restoreBookmark(page,staged.text);
  expect(await page.evaluate(function () { return {ledger:JSON.stringify(FB.state.industryLaws),rng:FB.getRngState(),uid:FB.getUidCounter()}; }))
    .toEqual({ledger:staged.ledger,rng:staged.rng,uid:staged.uid});
  const judged = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, v = s.industryLaws.violations[0];
    const ctx = {justiceId:s.justice.pending.id,studentId:s.justice.pending.actorId};
    const params = FB.justiceHearingParams(s,ctx);
    const noFullPayment = !FB.fns.justice_can_pay(s,ctx);
    const applied = !!remedyRespond('justice_submit');
    const debt = L.quoteDebt(s,v.id), before = remedySnapshot();
    const poor = !debt.ready && !L.payDebt(s,debt) && before === remedySnapshot();
    const saved = JSON.parse(FB.save.serialize());
    const invalid = [function (x) { x.state.industryLaws.violations[0].actorId = remedyCourt.actorId; },
      function (x) { x.state.industryLaws.violations[0].output = 0; },
      function (x) { x.state.industryLaws.violations[0].judgment.paid = 17; },
      function (x) { x.state.industryLaws.violations[0].resolved = 'execution'; x.state.industryLaws.violations[0].judgment = null; },
      function (x) { delete x.state.industryLaws.violations; },
      function (x) { x.state.justice.offenses[0].authority = 'player'; }].every(function (mutate) {
      const x = JSON.parse(JSON.stringify(saved)); mutate(x); const before = remedySnapshot();
      try { FB.save.restore(x); return false; } catch (error) { return before === remedySnapshot(); }
    });
    L.validate(s);
    return {applied,noFullPayment,poor,invalid,paid:v.judgment.paid,remaining:debt.amount,balance:params.sentenceBalance,
      kind:params.sentenceKind,text:FB.save.serialize(),ledger:JSON.stringify(s.industryLaws),gold:s.player.gold};
  });
  expect(judged).toMatchObject({applied:true,noFullPayment:true,poor:true,invalid:true,paid:3,remaining:13,balance:13,kind:'industry_fine_closure',gold:0});
  await restoreBookmark(page,judged.text);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return JSON.stringify(FB.state.industryLaws); })).toBe(judged.ledger);
  const settled = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, v = s.industryLaws.violations[0], law = s.industryLaws.laws[0];
    s.player.gold = 20; const q = L.quoteDebt(s,v.id), publicGold = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const paid = L.payDebt(s,q), after = remedySnapshot();
    return paid && v.judgment.paid === 16 && s.player.gold === 7 && FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === publicGold + 13 &&
      !L.payDebt(s,q) && after === remedySnapshot() && !L.fileComplaint(s,v.id);
  });
  expect(settled).toBe(true);
});

test('stale hearings, custody loss and changed courts reject before effects; prior operations retain their applicable law', async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, f = remedyViolate(); remedyArrest(f.v);
    const pending = s.justice.pending, ctx = {justiceId:pending.id,studentId:pending.actorId};
    const ev = FB.eventById('justice_hearing'), option = ev.options.filter(function (o) { return o.effects.custom === 'justice_challenge'; })[0];
    function reject() { const before = remedySnapshot(); return FB.resolveEventOption(s,ev,option,ctx) === false && before === remedySnapshot(); }
    const rid = f.law.issuer.realmId, r = s.realms[rid];
    r.ruler.generation++; r.succession.rulerGeneration++;
    const generation = reject();
    r.ruler.generation--; r.succession.rulerGeneration--;
    const holder = s.holder.london; s.holder.london = 'player'; FB.invalidateRealmCache();
    const changedCourt = reject() && !FB.justiceOffenseFor(s,remedyCourt.actorId,s.player.charId,f.v.caseId);
    s.holder.london = holder; FB.invalidateRealmCache();
    const captives = s.intrigue.captives; s.intrigue.captives = []; delete s.player.flags.in_prison;
    const custody = reject(); s.intrigue.captives = captives; s.player.flags.in_prison = 1;
    const old = FB.justicePunishmentProjection(s,remedyCourt.actorId,s.player.charId,'fine',f.v.caseId);
    const review = FB.justiceSentenceReview(s,old);
    s.player.gold = 3;
    const before = remedySnapshot();
    const stale = !FB.justiceApplyPunishment(s,remedyCourt.actorId,s.player.charId,'fine',f.v.caseId,pending.id,'secular',review).ok && before === remedySnapshot();
    s.player.localCouncil.nextMotionTurn = s.turn;
    const petition = L.commitPetition(s,L.quotePetition(s,f.e.uid,f.law.id,'repeal'));
    L.commitAssembly(s,L.quoteAssembly(s,f.law.definitionId,'town','resolve',petition.id));
    const retained = f.law.repealedTurn === s.turn && !!FB.justiceOffenseFor(s,remedyCourt.actorId,s.player.charId,f.v.caseId);
    const applied = !!remedyRespond('justice_submit');
    return {generation,changedCourt,custody,stale,retained,applied};
  });
  expect(r).toEqual({generation:true,changedCourt:true,custody:true,stale:true,retained:true,applied:true});
});

test('issuer succession passes the case and custody to the current court without changing the original operator', async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, f = remedyViolate(); remedyArrest(f.v);
    const old = s.justice.pending, ctx = {justiceId:old.id,studentId:old.actorId};
    const operator = f.v.actorId, issuer = JSON.stringify(f.law.issuer), judge = s.chars[old.actorId];
    FB.advanceRealmSuccession(s,f.law.issuer.realmId);
    const next = FB.realmRulerCharacterSnapshot(s,f.law.issuer.realmId);
    FB.justiceDay(s);
    const retained = FB.courtRecordRetained(s,judge) && s.chars[judge.id] === judge;
    const custody = FB.justiceCustodyOf(s,s.player.charId);
    const before = remedySnapshot(), ev = FB.eventById('justice_hearing');
    const stale = !FB.resolveEventOption(s,ev,ev.options.filter(function (o) { return o.effects.custom === 'justice_submit'; })[0],ctx) && before === remedySnapshot();
    delete s.justice.lastSeason; FB.justiceSeason(s);
    const queued = s.justice.pending && s.justice.pending.actorId === next.id && s.justice.pending.offenseId === f.v.caseId;
    const applied = queued && !!remedyRespond('justice_submit');
    L.validate(s);
    return {changed:next.id !== old.actorId,retained,custody:custody && custody.captorId === next.id,stale,queued:!!queued,applied,
      original:f.v.actorId === operator && JSON.stringify(f.law.issuer) === issuer};
  });
  expect(r).toEqual({changed:true,retained:true,custody:true,stale:true,queued:true,applied:true,original:true});
});

test('household succession retains closure and original personal debt without authorizing or charging the heir', async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, f = remedyViolate(); remedyArrest(f.v);
    s.player.gold = 2; remedyRespond('justice_submit');
    const former = s.chars[s.player.charId], heir = FB.makeCharacter(s,{name:'Trading Heir',sex:'m',born:s.date.year - 20,
      culture:former.culture,religion:former.religion,dyn:former.dyn,station:1,traitsN:0,
      fatherId:former.sex === 'm' ? former.id : null,motherId:former.sex === 'f' ? former.id : null,homeProvinceId:'london'});
    former.childrenIds = former.childrenIds || []; former.childrenIds.push(heir.id);
    former.dead = true; former.died = s.date.year; s.player.dead = true;
    s.legends.push({id:former.id,name:former.name,born:former.born,died:former.died});
    const facts = JSON.stringify(s.industryLaws), treasury = FB.treasuryPublicAccountSnapshot(s,f.law.payeeRealmId).gold;
    FB.game.succeedTo(heir.id); FB.ui.closeModal();
    const debt = L.quoteDebt(s,f.v.id), before = remedySnapshot();
    const uncharged = !debt.ready && !L.payDebt(s,debt) && before === remedySnapshot();
    L.recordSeason(s); L.validate(s);
    return {heir:s.player.charId === heir.id,original:f.v.actorId === former.id,uncharged,
      retained:JSON.stringify(s.industryLaws) === facts,closed:!L.operation(s,f.e).operational,
      publicUnchanged:treasury === FB.treasuryPublicAccountSnapshot(s,f.law.payeeRealmId).gold,text:FB.save.serialize()};
  });
  expect(r).toMatchObject({heir:true,original:true,uncharged:true,retained:true,closed:true,publicUnchanged:true});
  await restoreBookmark(page,r.text);
});

for (const restricted of [false,true]) test('canonical successful challenge and sentence limits under restricted=' + restricted, async function ({page}, info) {
  await start(page,info);
  const r = await page.evaluate(function (restricted) {
    const s = FB.state, L = FB.industryLaws, f = remedyViolate();
    const old = FB.platform.isCrazyGames; FB.platform.isCrazyGames = restricted;
    const originalPardon = FBDATA.justiceSentences.pardon;
    if (!restricted) FBDATA.justiceSentences.pardon = Object.assign({},originalPardon,{closesCase:false});
    try {
      remedyArrest(f.v);
      const forbidden = ['imprisonment','forfeiture','execution','exile','penance'].every(function (id) {
        const p = FB.justicePunishmentProjection(s,remedyCourt.actorId,s.player.charId,id,f.v.caseId);
        return !p.ready;
      });
      const originalFine = FBDATA.justiceSentences.fine, variant = Object.assign({},originalFine,{closesCase:false});
      const supportedOrdinaryDefinition = FB.mods.validate({name:'Open ordinary fine',justiceSentences:{fine:variant}}).length === 0;
      FBDATA.justiceSentences.fine = variant;
      const before = remedySnapshot();
      const noRepeatSentence = supportedOrdinaryDefinition && !FB.justicePunishmentProjection(s,remedyCourt.actorId,s.player.charId,'fine',f.v.caseId).ready &&
        !FB.justiceApplyPunishment(s,remedyCourt.actorId,s.player.charId,'fine',f.v.caseId).ok && before === remedySnapshot();
      FBDATA.justiceSentences.fine = originalFine;
      const chance = FB.clamp(0.45 + FB.skillOf(s.chars[s.player.charId],'int') * 0.025 - 2 * 0.15,0.05,0.80);
      remedySeed(chance,true);
      const gold = s.player.gold, publicGold = FB.treasuryPublicAccountSnapshot(s,f.law.payeeRealmId).gold;
      const challenged = !!remedyRespond('justice_challenge');
      const released = !FB.justiceCustodyOf(s,s.player.charId) && !s.chars[s.player.charId].dead;
      const acquitted = f.v.resolved === 'pardon' && f.v.judgment === null && s.justice.last.sentence === 'pardon';
      const preserved = s.player.gold === gold && FB.treasuryPublicAccountSnapshot(s,f.law.payeeRealmId).gold === publicGold && s.player.enterprises.indexOf(f.e) >= 0;
      const count = s.justice.offenses.length; L.recordSeason(s);
      L.validate(s);
      return {forbidden,noRepeatSentence,challenged,released,acquitted,preserved,once:count === s.justice.offenses.length};
    } finally { FB.platform.isCrazyGames = old; FBDATA.justiceSentences.pardon = originalPardon; }
  }, restricted);
  expect(r).toEqual({forbidden:true,noRepeatSentence:true,challenged:true,released:true,acquitted:true,preserved:true,once:true});
});

test('compact business review offers cancellation, disclosed remedies and retained modal return', async function ({page}, info) {
  await start(page,info);
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function () {
    const e = remedyBusiness(); remedyEnact('london_market_restriction'); FB.state.turn = 90;
    window.businessUid = e.uid; FB.ui.showEnterpriseManage(e.uid);
  });
  await page.getByRole('button',{name:'Review operating laws, payments and closure',exact:true}).click();
  await expect(page.locator('#gm-body')).toContainText('Imprisonment, forfeiture and execution are unavailable');
  await page.locator('#industry-operation-violate').click();
  await expect(page.locator('#industry-violation-confirm')).toBeVisible();
  const before = await page.evaluate(function () { return remedySnapshot(); });
  await page.locator('#industry-violation-cancel').click();
  expect(await page.evaluate(function () { return remedySnapshot(); })).toBe(before);
  await expect(page.locator('#industry-operation-violate')).toBeFocused();
  await page.locator('#industry-operation-violate').click();
  await page.locator('#industry-violation-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Lawful business operation');
  await expect(page.locator('#gm-body')).toContainText('Deliberate unauthorized operation');
  expect(await page.evaluate(function () { return !FB.state.industryLaws.violations; })).toBe(true);
  const petition = page.locator('button[id^="industry-petition-repeal-"]');
  await petition.click();
  await expect(page.locator('#industry-hearing-resolve')).toBeVisible();
  await page.locator('#industry-hearing-back').click();
  await expect(petition).toBeDisabled();
  await expect(page.locator('.review-action-card').filter({has:petition})).toBeFocused();
  await page.locator('#industry-operation-back').click();
  await expect(page.getByRole('button',{name:'Review operating laws, payments and closure',exact:true})).toBeFocused();
});

test('integrated town and Estates sheets retain their distinct ordinary ballots', async function ({page}, info) {
  await start(page,info);
  await page.evaluate(function () { FB.ui.showLocalCouncilMotion(); });
  await page.locator('#industry-town-hearings').click();
  await page.locator('[data-industry-hearing="london_market_levy"]').first().click();
  await page.locator('#industry-hearing-begin').click();
  await page.locator('#industry-ballot-traders-support').click();
  await page.locator('#industry-hearing-resolve').click();
  await expect(page.locator('#gm-body')).toContainText('Passed and enacted');
  await page.evaluate(function () {
    FB.ui.closeModal();
    const s = FB.state, p = s.player, rid = remedyCourt.rid;
    p.tier = 3; p.liege = rid; delete p.localCouncil; delete p.flags.councilman;
    const home = FB.world.provs.filter(function (x) { return !x.wasteland && x.id !== 'london' && s.owner[x.id] === rid; })[0];
    if (!home) throw new Error('No existing county for a sworn household');
    p.provinceId = home.id; FB.invalidateRealmCache(); FB.ui.showParliament();
  });
  await page.locator('#industry-estates-hearings').click();
  await page.locator('[data-industry-hearing="london_market_restriction"]').first().click();
  await expect(page.locator('#gm-body')).toContainText('The controlling court must support');
  await page.locator('#industry-hearing-begin').click();
  await page.locator('#industry-hearing-resolve').click();
  await expect(page.locator('#gm-body')).toContainText('Rejected');
  expect(await page.evaluate(function () { FB.industryLaws.validate(FB.state); return FB.state.industryLaws.laws.length; })).toBe(1);
});

test('ordinary justice retains its existing stamped review shape and current pending restore', async function ({page}, info) {
  await start(page,info);
  const text = await page.evaluate(function () {
    const s = FB.state, actor = remedyCourt.actorId;
    const offense = FB.justiceRecordOffense(s,actor,s.player.charId,'sabotage','material',true,actor,'ordinary-proof');
    if (!FB.justiceAttemptArrest(s,actor,s.player.charId,offense.id).ok || !remedyRespond('justice_submit')) throw new Error('Ordinary court response unavailable');
    const review = JSON.parse(s.justice.pending.review);
    if (Object.prototype.hasOwnProperty.call(review,'industry')) throw new Error('Ordinary mechanical review shape changed');
    if (s.industryLaws !== undefined) throw new Error('Ordinary justice initialized an industry ledger');
    return FB.save.serialize();
  });
  await restoreBookmark(page,text);
  expect(await page.evaluate(function () {
    const s = FB.state, p = s.justice.pending;
    const ready = FB.justiceResponseReady(s,{justiceId:p.id,studentId:p.actorId},'justice_submit');
    const applied = remedyRespond('justice_submit');
    return ready && !!applied && s.justice.last.sentence === 'fine' && s.justice.offenses[0].closed && s.industryLaws === undefined;
  })).toBe(true);
});

test('saved accusations cannot be backdated into an earlier paid permission', async function ({page}, info) {
  await start(page,info,true);
  expect(await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = remedyBusiness(); remedyEnact('estuary_stall_due');
    s.turn = 10;
    if (!L.commitOperation(s,L.quoteOperation(s,e,'pay',0))) throw new Error('Permission payment unavailable');
    s.turn = 90;
    if (!L.commitOperation(s,L.quoteOperation(s,e,'violate',0))) throw new Error('Expired permission did not offer an explicit violation');
    FB.marketSeason(s); L.validate(s);
    const saved = JSON.parse(FB.save.serialize()), before = remedySnapshot();
    saved.state.industryLaws.violations[0].turn = 39;
    try { FB.save.restore(saved); return false; } catch (error) { return before === remedySnapshot(); }
  })).toBe(true);
});

test('repealing one of two judged laws cannot bypass the other active business closure', async function ({page}, info) {
  await start(page,info,true);
  expect(await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = remedyBusiness(), first = remedyEnact('london_market_restriction');
    const second = remedyEnact('estuary_stall_due');
    s.turn = 90;
    if (!L.commitOperation(s,L.quoteOperation(s,e,'violate',0))) throw new Error('Combined law violation unavailable');
    FB.marketSeason(s);
    const records = s.industryLaws.violations;
    if (records.length !== 2) throw new Error('Both actual applicable laws need their own evidence');
    records.forEach(function (v) { remedyArrest(v); if (!remedyRespond('justice_submit')) throw new Error('Combined judgment unavailable'); });
    const repealedSecond = L.commitPetition(s,L.quotePetition(s,e.uid,second.id,'repeal'));
    const stillClosed = repealedSecond.granted && !L.quoteOperation(s,e,'resume',0).ready && !L.operation(s,e).operational;
    const hearing = L.commitPetition(s,L.quotePetition(s,e.uid,first.id,'repeal'));
    L.commitAssembly(s,L.quoteAssembly(s,first.definitionId,'town','resolve',hearing.id));
    const reopened = L.commitOperation(s,L.quoteOperation(s,e,'resume',0)) && FB.enterpriseYield(s,e) > 0;
    L.validate(s);
    return stillClosed && reopened && records.every(function (v) { return v.judgment && v.judgment.paid === v.judgment.fine; });
  })).toBe(true);
});
