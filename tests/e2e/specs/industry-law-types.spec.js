'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {scanSource} = require('../support/source-literals');
const {quotedCounts} = require('../support/content-id-reviews');
const imported = require('../fixtures/authoring/industry-law-press.json');

dependsOnRuntime(__filename, ['data/industry_laws.js','data/economy.js','data/technology.js','data/events_intrigue.js',
  'js/industry_laws.js','js/economy.js','js/justice.js','js/actions.js','js/market.js','js/treasury.js',
  'js/institutions.js','js/politics.js','js/parliament.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js']);

async function start(page, info, bookmark, province, mod) {
  if (mod) {
    await openGame(page, info); await prepareGameContent(page);
    expect(await page.evaluate(function (data) { return FB.mods.validate(data); }, imported)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/industry-law-press.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await prepareGameContent(page); await beginBookmarkFromTitle(page, bookmark);
  } else await beginBookmark(page, info, bookmark);
  await page.evaluate(function (province) {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    FB.game.setPaused(true); FB.game.uiPrefs.hideTips = true;
    p.tier = 1; p.profession = 'merchant'; p.provinceId = province; p.homeSettlement = 0; p.gold = 2000;
    FB.setCareer(s, me, 'merchant', 'journeyman'); me.skills.dip = 12; me.skills.ste = 12;
    const tech = FB.realmTechRecord(s, FB.techRealmId(s));
    ['urban_markets','annual_fairs','horizontal_loom','olive_press','scratch_plough','knarrs','trade_houses'].forEach(function (id) {
      if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
    });
    FB.fns.local_council_elected(s); FB.enterpriseList(s); FB.enterpriseLaborRecords(s);
    const rid = s.holder[province] || s.owner[province], judge = FB.materializeRealmRuler(s, rid);
    judge.traits = []; s.eventQueue = [];
    window.lawCourt = {rid:rid, actorId:judge.id};
    window.lawSnapshot = function () {
      return JSON.stringify({state:FB.state, rng:FB.getRngState(), uid:FB.getUidCounter(), storage:Object.assign({}, localStorage)});
    };
    window.lawSeed = function (chance) {
      for (let i = 0; i < 256; i++) {
        const seed = FB.getRngState();
        if (FB.rng() < chance) { FB.setRngState(seed); return; }
      }
      throw new Error('No bounded council seed');
    };
    window.lawEnact = function (id) {
      const s = FB.state, q = FB.industryLaws.quoteMotion(s,id);
      lawSeed(FB.localCouncilMotionChance(s));
      const result = FB.proposeLocalCouncilMotion(s,q.terms.motionId,q);
      if (!result || !result.passed) throw new Error('Council did not enact ' + JSON.stringify(q));
      return s.industryLaws.laws[s.industryLaws.laws.length - 1];
    };
    window.lawBusiness = function (type) {
      const s = FB.state, gold = s.player.gold, e = FB.buyEnterprise(s,type,0);
      if (!e) throw new Error('Purchase unavailable: ' + JSON.stringify(FB.enterprisePurchaseStatus(s,type,s.player.provinceId,0)));
      window.lawPurchaseCost = gold - s.player.gold;
      // Keep this business staffed by local paid labor when the household moves.
      (e.workerIds || (e.workerId ? [e.workerId] : [])).slice().forEach(function (id) { FB.unassignEnterpriseWorker(s,id); });
      while (FB.enterpriseStaffAssigned(s,e) < FB.enterpriseStaffRequired(e)) {
        if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('No local labor: ' + type);
      }
      return e;
    };
    window.lawRespond = function (action) {
      const s = FB.state, pending = s.justice.pending;
      if (!pending) throw new Error('No canonical court response');
      const ev = FB.eventById(pending.kind === 'arrest' ? 'justice_arrest' : 'justice_hearing');
      return FB.resolveEventOption(s,ev,ev.options.filter(function (o) { return o.effects.custom === action; })[0],
        {justiceId:pending.id,studentId:pending.actorId});
    };
    window.lawArrest = function (v) {
      const s = FB.state, q = FB.industryLaws.quoteComplaint(s,v.id);
      if (!FB.industryLaws.answerComplaint(s,q) || !lawRespond('justice_submit') || !FB.justiceCustodyOf(s,s.player.charId))
        throw new Error('Canonical custody unavailable: ' + JSON.stringify(q));
    };
    window.lawViolate = function (e) {
      const s = FB.state, L = FB.industryLaws, q = L.quoteOperation(s,e,'violate',0);
      if (!L.commitOperation(s,q)) throw new Error('Violation unavailable: ' + JSON.stringify(q));
      if (s.industryLaws.violations) throw new Error('Choice created evidence before output');
      FB.marketSeason(s);
      const v = s.industryLaws.violations && s.industryLaws.violations[0];
      if (!v || !v.caseId) throw new Error('No actual output complaint: ' + JSON.stringify({yield:FB.enterprisePhysicalYield(s,e),status:L.operation(s,e)}));
      return v;
    };
    window.lawFacts = function () {
      const s = FB.state;
      return {ledger:JSON.stringify(s.industryLaws),gold:s.player.gold,property:JSON.stringify(s.player.enterprises),
        publicGold:FB.treasuryPublicAccountSnapshot(s,lawCourt.rid).gold,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
    };
  }, province);
}

async function roundTrip(page) {
  const before = await page.evaluate(function () { return {text:FB.save.serialize(),facts:lawFacts()}; });
  await restoreBookmark(page,before.text);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return lawFacts(); })).toEqual(before.facts);
}

test('ordinary enterprise declarations and strict exemption/penalty references validate without mutation', async function ({page}, info) {
  await start(page,info,'1204','york');
  const r = await page.evaluate(function (mod) {
    const before = lawSnapshot(), data = JSON.stringify(FBDATA), L = FB.industryLaws;
    const types = Object.keys(FBDATA.enterprises).filter(function (type) {
      const c = JSON.parse(JSON.stringify(mod)); c.industryLaws.estuary_press_permission.enterpriseType = type;
      return FB.mods.validate(c).length === 0;
    });
    function rejected(edit, reason) {
      const c = JSON.parse(JSON.stringify(mod)); edit(c.industryLaws.estuary_press_permission);
      return FB.mods.validate(c).some(function (e) { return e.indexOf(reason) >= 0; });
    }
    const bad = [
      rejected(function (d) { d.enterpriseType = 'uncheckable_business'; },'Unsupported industry-law enterprise type'),
      rejected(function (d) { d.exemptions[0].kind = 'dynasty'; },'exemption kind/reference'),
      rejected(function (d) { d.exemptions[0].id = 'farmer'; },'exemption kind/reference'),
      rejected(function (d) { d.exemptions[1].id = 'tutor'; },'exemption kind/reference'),
      rejected(function (d) { d.offense.penalty = 'death'; },'offense'),
      rejected(function (d) { d.offense.amount = 1; },'offense'),
      rejected(function (d) { d.offense = {id:'bad',penalty:'suspension',amount:0,days:361}; },'offense'),
      rejected(function (d) { d.offense = {id:'bad',penalty:'suspension',amount:0,days:0}; },'offense'),
      rejected(function (d) { d.offense = {id:'bad',penalty:'fine',amount:2,days:1}; },'offense')
    ];
    const candidate = JSON.parse(JSON.stringify(FBDATA));
    candidate.localCouncilMotions.estuary_press_permission = mod.localCouncilMotions.estuary_press_permission;
    candidate.enterprises.uncheckable_business = {name:'Unsupported',cost:5};
    const def = JSON.parse(JSON.stringify(mod.industryLaws)); def.estuary_press_permission.enterpriseType = 'uncheckable_business';
    const unsupportedShape = L.definitionFaults(def,candidate).some(function (e) { return e.indexOf('Unsupported industry-law enterprise type') >= 0; });
    return {types:types.sort(),bad:bad,unsupportedShape:unsupportedShape,pure:before === lawSnapshot() && data === JSON.stringify(FBDATA),
      reviews:FBDATA.techImpactReviews.features.industry_law_suspension.mode};
  }, imported);
  expect(r).toEqual({types:['field_strip','fishing_boat_business','market_stall_business','orchard_business','press_business','trade_house_business','workshop_business'],
    bad:Array(9).fill(true),unsupportedShape:true,pure:true,reviews:'none'});
});

test('London retains residence privilege, fees, personal fine, expiry and repeal through the original owners', async function ({page}, info) {
  await start(page,info,'1204','london');
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness('market_stall_business'), law = lawEnact('london_stall_license');
    const exempt = L.operation(s,e).laws[0].exempt;
    s.player.provinceId = 'york';
    const grace = L.operation(s,e).covered;
    s.turn = 90;
    const gold = s.player.gold, pub = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const before = lawSnapshot(), q = L.quoteOperation(s,e,'pay',0);
    const pure = before === lawSnapshot() && q.amount === 2;
    const paid = L.commitOperation(s,q) && s.player.gold === gold - 2 &&
      FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === pub + 2 && !L.commitOperation(s,q);
    s.turn = 180;
    const v = lawViolate(e), offense = s.justice.offenses.filter(function (o) { return o.id === v.caseId; })[0];
    const noCustody = !FB.justiceApplyPunishment(s,lawCourt.actorId,s.player.charId,'fine',offense.id).ok;
    lawArrest(v); s.player.gold = 3;
    lawRespond('justice_submit');
    const fine = v.judgment.fine === 8 && v.judgment.paid === 3 && !v.judgment.closure && !('suspendedUntil' in v.judgment);
    s.player.gold = 20;
    const debt = L.quoteDebt(s,v.id), debtPaid = debt.amount === 5 && L.payDebt(s,debt) && !L.payDebt(s,debt);
    const petition = L.quotePetition(s,e.uid,law.id,'repeal'); lawSeed(petition.chance);
    const repeal = L.commitPetition(s,petition).granted && L.lifecycle(s,law) === 'repealed';
    const resumed = L.commitOperation(s,L.quoteOperation(s,e,'resume',0)) && FB.enterprisePhysicalYield(s,e) > 0;
    const alternate = JSON.parse(JSON.stringify(s));
    alternate.industryLaws.laws[0].repealedTurn = null; delete alternate.industryLaws.laws[0].repealer;
    alternate.turn = law.endTurn;
    const expiry = L.lifecycle(alternate,alternate.industryLaws.laws[0]) === 'expired' && L.operation(alternate,e).laws.length === 0;
    L.validate(s);
    return {exempt,grace,pure,paid,noCustody,fine,debtPaid,repeal,resumed,expiry};
  });
  expect(r).toEqual({exempt:true,grace:true,pure:true,paid:true,noCustody:true,fine:true,debtPaid:true,repeal:true,resumed:true,expiry:true});
  await roundTrip(page);
});

test('Constantinople workshops use guild standing, actual output and a bounded canonical suspension', async function ({page}, info) {
  await start(page,info,'1066','constantinople');
  const initial = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness('workshop_business'), law = lawEnact('constantinople_workshop_permission');
    s.turn = 30;
    const due = !L.operation(s,e).covered && FB.enterprisePhysicalYield(s,e) === 0;
    const me = s.chars[s.player.charId]; FB.setCareer(s,me,'craftsman','journeyman'); me.career.guildRank = 'member';
    const guild = L.operation(s,e).laws[0].exempt && L.operation(s,e).covered;
    const quote = L.quoteOperation(s,e,'pause',0);
    me.career.guildRank = 'none'; s.player.profession = 'craftsman';
    const staleBefore = lawSnapshot(), stale = !L.commitOperation(s,quote) && staleBefore === lawSnapshot();
    const q = L.quoteOperation(s,e,'pay',0), gold = s.player.gold, pub = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const paid = q.amount === 3 && L.commitOperation(s,q) && s.player.gold === gold - 3 &&
      FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === pub + 3;
    s.turn = 90;
    const v = lawViolate(e);
    const once = s.industryLaws.violations.length; L.recordSeason(s);
    const unique = s.industryLaws.violations.length === once && !L.fileComplaint(s,v.id);
    lawArrest(v);
    const review = s.justice.pending.review;
    s.turn++; FB.justiceDay(s);
    const pendingStable = !!s.justice.pending && s.justice.pending.review === review;
    const params = FB.justiceHearingParams(s,{justiceId:s.justice.pending.id,studentId:lawCourt.actorId});
    L.validate(s);
    return {due,guild,stale,paid,unique,pendingStable,kind:params.sentenceKind,days:params.sentenceSuspensionDays};
  });
  expect(initial).toEqual({due:true,guild:true,stale:true,paid:true,unique:true,pendingStable:true,kind:'industry_suspension',days:30});
  await roundTrip(page);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, law = s.industryLaws.laws[0], e = s.player.enterprises[0], v = s.industryLaws.violations[0];
    const gold = s.player.gold, pub = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    lawRespond('justice_submit');
    const deadline = v.judgment.suspendedUntil;
    const suspended = deadline === s.turn + 30 && v.judgment.fine === 0 && v.judgment.closure &&
      s.player.gold === gold && FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === pub &&
      !FB.justiceCustodyOf(s,s.player.charId) && !L.quoteOperation(s,e,'resume',0).ready;
    // Later membership cannot erase the original evidence or bypass the judicial stop.
    s.chars[s.player.charId].career.guildRank = 'member';
    const membership = L.operation(s,e).covered && L.operation(s,e).courtClosed && v.exemptionMatches.length === 0;
    const pay = L.quoteOperation(s,e,'pay',0);
    const cannotBuyOut = !pay.ready && !L.quoteOperation(s,e,'violate',0).ready;
    s.turn = deadline - 1;
    const exclusive = !L.quoteOperation(s,e,'resume',0).ready;
    s.turn = deadline;
    const resume = L.commitOperation(s,L.quoteOperation(s,e,'resume',0)) && FB.enterprisePhysicalYield(s,e) > 0;
    L.validate(s);
    return {suspended,membership,cannotBuyOut,exclusive,resume};
  });
  expect(r).toEqual({suspended:true,membership:true,cannotBuyOut:true,exclusive:true,resume:true});
  await roundTrip(page);
  expect(await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, law = s.industryLaws.laws[0], e = s.player.enterprises[0];
    const q = L.quotePetition(s,e.uid,law.id,'repeal'); lawSeed(q.chance);
    const repealed = L.commitPetition(s,q).granted && L.lifecycle(s,law) === 'repealed';
    L.validate(s); return repealed && L.operation(s,e).laws.length === 0;
  })).toBe(true);
});

test('a real JSON press law checks acquisition fees, office scope, guild interests and closure without a fine', async function ({page}, info) {
  await start(page,info,'1204','york',true);
  expect(await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, me = s.chars[s.player.charId];
    const seat = s.player.localCouncil;
    FB.setCareer(s,me,'craftsman','journeyman'); me.career.guildRank = 'member';
    const before = lawSnapshot();
    const guild = L.assemblyMembers(s,'estuary_workshop_hearing','town').filter(function (m) { return m.kind === 'guild'; })[0];
    const pure = before === lawSnapshot();
    me.career.guildRank = 'none';
    const office = L.assemblyMembers(s,'estuary_workshop_hearing','town').filter(function (m) { return m.kind === 'guild'; })[0];
    // The same real principal sees prospective privileges under both criteria.
    const parity = guild.actorId === me.id && office.actorId === me.id && guild.interest === 1 && office.interest === 1;
    s.player.localCouncil = seat; FB.setCareer(s,me,'merchant','journeyman');
    return pure && parity;
  })).toBe(true);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, law = lawEnact('estuary_press_permission');
    const draft = {type:'press_business',provinceId:'york',settlement:0};
    const office = L.operation(s,draft).covered && L.operation(s,draft).amount === 0;
    const free = FB.enterprisePurchaseStatus(s,'press_business','york',0).industryQuote;
    const seat = s.player.localCouncil;
    FB.endLocalCouncil(s,'review',true);
    const before = lawSnapshot(), stale = !FB.acquireEnterprise(s,'press_business','york',0,{industryQuote:free}) && before === lawSnapshot();
    const me = s.chars[s.player.charId]; me.career.guildRank = 'member';
    const priced = FB.enterprisePurchaseStatus(s,'press_business','york',0), gold = s.player.gold,
      pub = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const e = lawBusiness('press_business');
    const fee = priced.industryQuote.amount === 0.75 && s.industryLaws.permits[0].amount === 0.75 &&
      lawPurchaseCost === priced.cost && s.player.gold < gold - priced.cost &&
      FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold === pub + 0.75;
    // A pure law review does not restore a legacy office flag into a seat.
    s.player.flags.councilman = 1;
    const noFlagPrivilege = !s.player.localCouncil && L.operation(s,e).laws[0].fee === 0.75 && !s.player.localCouncil;
    delete s.player.flags.councilman;
    s.turn = 45;
    const v = lawViolate(e);
    const historical = JSON.stringify(v.exemptionMatches) === '[0]' && v.fee === 0.75;
    me.career.guildRank = 'none';
    s.player.localCouncil = seat; s.player.flags.councilman = 1;
    const stillHistorical = v.fee === 0.75 && L.operation(s,e).laws[0].fee === 0;
    lawArrest(v);
    const gold2 = s.player.gold, params = FB.justiceHearingParams(s,{justiceId:s.justice.pending.id,studentId:lawCourt.actorId});
    lawRespond('justice_submit');
    const closed = params.sentenceKind === 'industry_closure' && v.judgment.closure && v.judgment.fine === 0 &&
      s.player.gold === gold2 && !L.quoteOperation(s,e,'resume',0).ready && s.player.enterprises.indexOf(e) >= 0;
    L.validate(s);
    return {office,stale,fee,noFlagPrivilege,historical,stillHistorical,closed};
  });
  expect(r).toEqual({office:true,stale:true,fee:true,noFlagPrivilege:true,historical:true,stillHistorical:true,closed:true});
  await roundTrip(page);
  const released = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, law = s.industryLaws.laws[0], e = s.player.enterprises[0];
    const holder = s.holder.york; s.holder.york = 'player';
    const suspended = L.lifecycle(s,law) === 'suspended' && L.quoteOperation(s,e,'resume',0).ready;
    s.holder.york = holder;
    const recovered = !L.quoteOperation(s,e,'resume',0).ready;
    const q = L.quotePetition(s,e.uid,law.id,'repeal'), r = L.commitPetition(s,q);
    const repealed = r.granted && L.commitOperation(s,L.quoteOperation(s,e,'resume',0));
    L.validate(s); return {suspended,recovered,repealed};
  });
  expect(released).toEqual({suspended:true,recovered:true,repealed:true});
  await roundTrip(page);
});

test('malformed suspension facts and changed imports reject atomically, while expiry ends a stop', async function ({page}, info) {
  await start(page,info,'1066','constantinople');
  expect(await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness('workshop_business'), law = lawEnact('constantinople_workshop_permission');
    s.turn = law.endTurn - 5;
    const v = lawViolate(e); lawArrest(v); lawRespond('justice_submit');
    const bound = v.judgment.suspendedUntil === law.endTurn;
    const saved = JSON.parse(FB.save.serialize());
    const edits = [function (x) { x.state.industryLaws.violations[0].judgment.suspendedUntil++; },
      function (x) { delete x.state.industryLaws.violations[0].judgment.suspendedUntil; },
      function (x) { delete x.state.industryLaws.violations[0].exemptionMatches; },
      function (x) { x.state.industryLaws.violations[0].exemptionMatches = [99]; },
      function (x) { x.state.industryLaws.violations[0].exemptionMatches = [0,0]; },
      function (x) { x.state.industryLaws.violations[0].exemptionMatches = [0]; },
      function (x) { x.state.industryLaws.violations[0].judgment.paid = 1; }];
    const atomic = edits.every(function (edit) {
      const x = JSON.parse(JSON.stringify(saved)); edit(x); const before = lawSnapshot();
      try { FB.save.restore(x); return false; } catch (error) { return before === lawSnapshot(); }
    });
    s.turn = law.endTurn;
    const expired = L.lifecycle(s,law) === 'expired' && L.commitOperation(s,L.quoteOperation(s,e,'resume',0)) && FB.enterprisePhysicalYield(s,e) > 0;
    L.validate(s); return bound && atomic && expired;
  })).toBe(true);
  await roundTrip(page);
  await start(page,info,'1204','york',true);
  expect(await page.evaluate(function () {
    lawEnact('estuary_press_permission'); lawBusiness('press_business');
    const saved = JSON.parse(FB.save.serialize()); saved.mods += '-changed';
    const before = lawSnapshot();
    try { FB.save.restore(saved); return false; } catch (error) { return before === lawSnapshot(); }
  })).toBe(true);
});

test('compact reviews disclose guild and office terms, suspension deadlines and retain cancellation focus', async function ({page}, info) {
  await start(page,info,'1066','constantinople');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function () { FB.ui.showLocalCouncilMotion(); });
  await page.locator('[data-local-motion="constantinople_workshop_permission"]').click();
  await expect(page.locator('#gm-body')).toContainText('Members of the');
  await expect(page.locator('#gm-body')).toContainText('30 days');
  await page.locator('#industry-law-back').click();
  await page.evaluate(function () {
    const e = lawBusiness('workshop_business'); lawEnact('constantinople_workshop_permission');
    FB.state.turn = 90; FB.ui.showEnterpriseManage(e.uid);
  });
  await page.getByRole('button',{name:'Review operating laws, payments and closure',exact:true}).click();
  await expect(page.locator('#gm-body')).toContainText('No fine; ownership and worker contracts are retained');
  await page.locator('#industry-operation-violate').click();
  const before = await page.evaluate(function () { return lawSnapshot(); });
  await page.locator('#industry-violation-cancel').click();
  expect(await page.evaluate(function () { return lawSnapshot(); })).toBe(before);
  await expect(page.locator('#industry-operation-violate')).toBeFocused();
  await page.evaluate(function () {
    const s = FB.state, e = s.player.enterprises[0], v = lawViolate(e);
    lawArrest(v); lawRespond('justice_submit'); FB.ui.showIndustryOperation(e.uid);
  });
  await expect(page.locator('#gm-body')).toContainText('Suspension deadline');
  await expect(page.locator('#gm-body')).toContainText('30 days remaining');
  await expect(page.locator('#industry-operation-resume')).toBeDisabled();
});

test('changed engine files retain exact reviewed content spelling counts', function () {
  const root = path.resolve(__dirname,'../../..');
  const changed = ['js/industry_laws.js','js/justice.js','js/ui_modals.js'];
  const hooks = JSON.parse(fs.readFileSync(path.join(root,'tests/e2e/fixtures/engine-ids/content-id-allowlist.json'),'utf8')).hooks;
  const sources = changed.map(function (file) { return {file:file,scan:scanSource(fs.readFileSync(path.join(root,file),'utf8'))}; });
  const counts = quotedCounts(sources);
  hooks.forEach(function (entry) {
    changed.forEach(function (file) {
      if (entry.uses[file] || counts.has(file + '\n' + entry.id))
        expect(counts.get(file + '\n' + entry.id) || 0, entry.id + ' in ' + file).toBe(entry.uses[file] || 0);
    });
  });
});
