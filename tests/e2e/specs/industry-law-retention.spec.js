'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const imported = require('../fixtures/authoring/industry-law-retention.json');

dependsOnRuntime(__filename, ['data/industry_laws.js','data/map_data.js','data/intrigue.js','data/economy.js',
  'js/industry_laws.js','js/ledger_retention.js','js/justice.js','js/economy.js','js/market.js','js/treasury.js',
  'js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js']);

/* The bundled 1204 London laws use the default retention window; the ordinary
   JSON import declares a fictional closure-bearing due and a 720-day window.
   Long campaigns are staged directly: whole years, then one season boundary. */
async function start(page, info, mod) {
  if (mod) {
    await openGame(page, info); await prepareGameContent(page);
    const review = await page.evaluate(function (data) {
      const before = JSON.stringify({data:FBDATA, rng:FB.getRngState(), uid:FB.getUidCounter()});
      const faults = FB.mods.validate(data);
      const broken = JSON.parse(JSON.stringify(data));
      broken.industryLaws.wharf_stall_due.retention = 720;
      const rejected = FB.mods.validate(broken).length > 0;
      return {faults:faults, rejected:rejected, pure:before === JSON.stringify({data:FBDATA, rng:FB.getRngState(), uid:FB.getUidCounter()})};
    }, imported);
    expect(review).toEqual({faults:[], rejected:true, pure:true});
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/industry-law-retention.json'));
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
    // Leaf staging helpers: exact records the strict industry-law validator accepts.
    window.retention = {
      rid:rid, next:0,
      snapshot:function () {
        return JSON.stringify({state:FB.state, rng:FB.getRngState(), uid:FB.getUidCounter(), storage:Object.assign({}, localStorage)});
      },
      seed:function (chance, success) {
        for (let i = 0; i < 256; i++) {
          const seed = FB.getRngState(), roll = FB.rng();
          if ((roll < chance) === success) { FB.setRngState(seed); return; }
        }
        throw new Error('No bounded ordinary seed for requested outcome');
      },
      // One stall stands per settlement, so a second business uses the next open London settlement.
      business:function () {
        const s = FB.state, sites = FB.settlementsOf(s, 'london');
        let site = 0;
        while (site < sites.length && !FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', site).ready) site++;
        const e = site < sites.length && FB.buyEnterprise(s, 'market_stall_business', site);
        if (!e) throw new Error('Stall purchase unavailable: ' + JSON.stringify(sites.map(function (x, i) {
          return FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', i).primary;
        })));
        while (FB.enterpriseStaffAssigned(s, e) < FB.enterpriseStaffRequired(e)) {
          if (!FB.hireEnterpriseWorker(s, e.uid)) throw new Error('Local stall labor unavailable');
        }
        return e;
      },
      // Whole years, ending on the first day of a season.
      age:function (years) { const s = FB.state; s.turn += years * 360; s.date.year += years; s.date.day = 1; },
      // The ordinary council or hearing enactment at the current staged turn.
      enact:function (id) {
        const s = FB.state, L = FB.industryLaws, d = FBDATA.industryLaws[id];
        s.player.localCouncil.nextMotionTurn = s.turn;
        if (d.voting) {
          let q = L.quoteAssembly(s, id, 'town', 'begin');
          const v = FB.proposeLocalCouncilMotion(s, d.motionId, q);
          if (!v) throw new Error('Native hearing unavailable: ' + JSON.stringify(q));
          const m = L.quoteAssembly(s, id, 'town', 'resolve', v.id).members.filter(function (r) { return r.actorId === s.player.charId; })[0];
          if (m) L.commitAssembly(s, L.quoteAssembly(s, id, 'town', 'ballot', v.id, m.id, 'support'));
          q = L.quoteAssembly(s, id, 'town', 'resolve', v.id);
          if (!L.commitAssembly(s, q) || v.status !== 'passed') throw new Error('Native hearing did not enact: ' + JSON.stringify(q));
        } else {
          this.seed(FB.localCouncilMotionChance(s), true);
          const q = L.quoteMotion(s, id), r = FB.proposeLocalCouncilMotion(s, d.motionId, q);
          if (!r || !r.passed) throw new Error('Seeded council did not enact: ' + JSON.stringify(q));
        }
        return s.industryLaws.laws[s.industryLaws.laws.length - 1];
      },
      id:function (kind) { return 'industry_' + kind + '_stage_' + (++this.next); },
      rows:function () {
        const s = FB.state;
        if (!s.industryLaws) s.industryLaws = {schema:1, laws:[], permits:[], choices:[]};
        return s.industryLaws;
      },
      law:function (id, startTurn, repealedTurn) {
        const s = FB.state, d = FBDATA.industryLaws[id];
        const issuer = {kind:'local_council', provinceId:d.provinceId, realmId:this.rid, holderCharId:s.player.charId};
        const r = {id:this.id('law'), definitionId:id, terms:JSON.parse(JSON.stringify(d)), issuer:issuer, payeeRealmId:this.rid,
          startTurn:startTurn, endTurn:startTurn + d.durationDays, transitionEndTurn:startTurn + d.transitionDays,
          repealedTurn:repealedTurn === undefined ? null : repealedTurn, existingEnterpriseUids:[]};
        if (r.repealedTurn !== null) r.repealer = JSON.parse(JSON.stringify(issuer));
        this.rows().laws.push(r); return r;
      },
      permit:function (law, uid, paidTurn) {
        const r = {id:this.id('permit'), lawId:law.id, enterpriseUid:uid, payer:'player', payeeRealmId:law.payeeRealmId,
          amount:law.terms.fee, paidTurn:paidTurn, endTurn:Math.min(law.endTurn, paidTurn + law.terms.permitDays)};
        this.rows().permits.push(r); return r;
      },
      petition:function (law, uid, turn, granted, kind) {
        const rows = this.rows();
        if (!rows.petitions) rows.petitions = [];
        const r = {id:this.id('petition'), kind:kind || 'exemption', lawId:law.id, enterpriseUid:uid, actorId:FB.state.player.charId,
          turn:turn, granted:!!granted, endTurn:Math.min(law.endTurn, turn + law.terms.relief.days)};
        rows.petitions.push(r); return r;
      },
      hearing:function (id, startedTurn, status) {
        const s = FB.state, rows = this.rows(), d = FBDATA.industryLaws[id];
        if (!rows.votes) rows.votes = [];
        const r = {id:this.id('vote'), definitionId:id, consumer:'town', proposerId:s.player.charId,
          issuer:{kind:'local_council', provinceId:d.provinceId, realmId:this.rid, holderCharId:s.player.charId}, repealId:null,
          startedTurn:startedTurn, endTurn:startedTurn + d.voting.town.days, ballots:[], status:status, endedTurn:startedTurn + 5,
          lawId:null, result:null};
        rows.votes.push(r); return r;
      },
      // Actual output by a York household; a judgment closes the case with the frozen fine.
      violation:function (law, uid, turn, judgment) {
        const rows = this.rows();
        if (!rows.violations) rows.violations = [];
        const r = {id:this.id('violation'), lawId:law.id, enterpriseUid:uid, actorId:FB.state.player.charId, provinceId:law.terms.provinceId,
          homeProvinceId:'york', turn:turn, output:3, fee:law.terms.fee, evidence:'material', caseId:null, resolved:null, judgment:null};
        if (judgment) {
          r.caseId = 'justice-' + (90000 + this.next); r.resolved = 'fine';
          r.judgment = {turn:judgment.turn, fine:law.terms.offense.amount, paid:judgment.paid, closure:!!law.terms.offense.closure};
        }
        rows.violations.push(r); return r;
      },
      // Current retained record by id; a fold adopts a detached copy, so earlier references are stale.
      find:function (key, id) {
        return JSON.stringify((FB.state.industryLaws[key] || []).filter(function (x) { return x.id === id; })[0] || null);
      },
      counts:function () {
        const rows = FB.state.industryLaws;
        return {laws:rows.laws.length, permits:rows.permits.length, petitions:(rows.petitions || []).length,
          votes:(rows.votes || []).length, violations:(rows.violations || []).length, choices:rows.choices.length};
      }
    };
  });
}

test('settled hearings, petitions and permits beyond the old caps leave new commitments open and fold at the season boundary', async function ({page}, info) {
  await start(page, info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, H = window.retention;
    const e1 = H.business(), e2 = H.business();
    H.age(11);
    const T = s.turn, F = T + 90, C = F - FB.ledgerRetention.days();
    // A real deliberative restriction and its passed hearing, both settled before the window.
    s.turn = C - 300; const restriction = H.enact('london_market_restriction');
    s.turn = T;
    // Two ended simple laws: A settles before the window, B inside it.
    const A = H.law('london_stall_license', C - 360), B = H.law('london_stall_license', C + 10);
    for (let i = 0; i < 2100; i++) { H.permit(A, 'stage_a_' + i, C - 350); H.permit(B, 'stage_b_' + i, C + 20); }
    [0, 90, 180].forEach(function (n) { H.permit(A, e1.uid, A.startTurn + n); });
    for (let i = 0; i < 300; i++) H.petition(A, 'stage_a_' + i, C - 340, i % 3 === 0);
    for (let i = 0; i < 260; i++) H.petition(B, 'stage_b_' + i, C + 30, i % 2 === 0);
    H.petition(A, e1.uid, A.startTurn + 10, false);
    H.violation(A, e1.uid, A.startTurn + 310, {turn:A.startTurn + 330, paid:8});
    for (let i = 0; i < 70; i++) H.hearing('london_market_levy', 10 + i * 50, i % 2 ? 'invalidated' : 'withdrawn');
    L.validate(s);
    const before = {arrays:H.counts(), live:L.liveCounts(s), bytes:JSON.stringify(s.industryLaws).length};

    // New commitments: a simple law, an exemption petition, a hearing and a paid permit.
    const license = H.enact('london_stall_license');
    H.seed(license.terms.relief.chance, false);
    const pq = L.quotePetition(s, e1.uid, license.id, 'exemption'), petition = pq.ready && L.commitPetition(s, pq);
    s.player.localCouncil.nextMotionTurn = s.turn;
    const hq = L.quoteAssembly(s, 'london_market_levy', 'town', 'begin'), vote = hq.ready && L.commitAssembly(s, hq);
    s.player.provinceId = 'york';
    s.turn = license.transitionEndTurn; s.date.day += license.terms.transitionDays;
    const payq = L.quoteOperation(s, e1, 'pay', 0), paid = payq.ready && L.commitOperation(s, payq);
    const permit = s.industryLaws.permits[s.industryLaws.permits.length - 1];
    // A live unauthorized operation under the current law files its ordinary complaint.
    const vq = L.quoteOperation(s, e2, 'violate', 0), violating = vq.ready && L.commitOperation(s, vq);
    FB.marketSeason(s);
    const open = (s.industryLaws.violations || []).filter(function (v) { return v.enterpriseUid === e2.uid; })[0];
    const commitments = {petition:!!petition && petition.id, hearing:!!vote && vote.status, paid:!!paid && permit.enterpriseUid === e1.uid,
      violating:!!violating, filed:!!open && !!open.caseId};

    // The next season boundary.
    s.turn = F; s.date.day = 1; s.date.season = (s.date.season + 1) % 4; if (!s.date.season) s.date.year++;
    const offense = s.justice.offenses.filter(function (o) { return o.id === open.caseId; })[0];
    function view() {
      const complaint = L.quoteComplaint(s, open.id);
      return JSON.stringify({e1:L.operation(s, e1), e2:L.operation(s, e2), relevant:L.relevant(s, e1),
        complaint:!!complaint && complaint.ready, available:L.caseAvailable(s, offense, offense.actorId), terms:L.sentenceTerms(s, offense),
        relief:L.quotePetition(s, e2.uid, license.id, 'exemption').ready, repeal:L.quotePetition(s, e2.uid, license.id, 'repeal').ready,
        retained:[H.find('laws', license.id), H.find('petitions', petition.id), H.find('votes', vote.id), H.find('permits', permit.id), H.find('violations', open.id)]});
    }
    const ids = {laws:[B.id, license.id], petition:petition.id, vote:vote.id, permit:permit.id, violation:open.id};
    const folded = s.industryLaws.votes.filter(function (v) { return v.status !== 'pending' && v.endedTurn <= C; });
    const town = {passed:0, rejected:0, withdrawn:0, invalidated:0};
    folded.forEach(function (v) { town[v.status]++; });
    const expected = {
      license:{laws:1, repealed:0, permits:2103, paid:4206, petitions:301, granted:100, violations:1, fines:8, finesPaid:8, closures:0},
      restriction:{laws:1, repealed:0, permits:0, paid:0, petitions:0, granted:0, violations:0, fines:0, finesPaid:0, closures:0},
      e1:{permits:3, paid:6, petitions:1, granted:0, violations:1, fines:8, finesPaid:8, closures:0}, town:town,
      arrays:{laws:2, permits:2101, petitions:261, votes:before.arrays.votes + 1 - folded.length, violations:1, choices:1}};
    const twin = JSON.parse(JSON.stringify(s)), prior = view(), rng = FB.getRngState(), uid = FB.getUidCounter(), gold = s.player.gold;
    const preBytes = JSON.stringify(s.industryLaws).length;
    const preLive = L.liveCounts(s);
    // The real seasonal settlement folds; the twin uses the direct boundary owner.
    L.recordSeason(s);
    const twinChanged = L.compact(twin), again = L.compact(s);
    const pure = rng === FB.getRngState() && uid === FB.getUidCounter() && gold === s.player.gold;
    L.validate(s);
    const rows = s.industryLaws, kept = {laws:rows.laws.map(function (x) { return x.id; }), petition:rows.petitions.some(function (x) { return x.id === ids.petition; }),
      vote:rows.votes.filter(function (x) { return x.id === ids.vote; })[0].status, permit:rows.permits.some(function (x) { return x.id === ids.permit; }),
      violation:rows.violations.map(function (x) { return x.id; })};
    return {failure:FB.ledgerRetention.lastFailure, days:FB.ledgerRetention.days(), before:before, commitments:commitments,
      restrictionFolded:!rows.laws.some(function (x) { return x.id === restriction.id; }),
      unchanged:prior === view(), preLive:preLive, after:{arrays:H.counts(), live:L.liveCounts(s)}, expected:expected,
      bytes:{staged:before.bytes, boundary:preBytes, folded:JSON.stringify(rows).length},
      retired:{license:rows.retired.laws.london_stall_license, restriction:rows.retired.laws.london_market_restriction,
        e1:rows.retired.enterprises[e1.uid], e2:rows.retired.enterprises[e2.uid] || null, town:rows.retired.hearings.town},
      enterprises:Object.keys(rows.retired.enterprises), ids:ids, kept:kept, twinChanged:twinChanged, again:again, pure:pure,
      deterministic:JSON.stringify(twin.industryLaws) === JSON.stringify(rows), e1:e1.uid,
      text:FB.save.serialize(), ledger:JSON.stringify(rows), gold:s.player.gold, rng:FB.getRngState(), uidCounter:FB.getUidCounter()};
  });
  expect(r.failure).toBe(null);
  expect(r.days).toBe(3600);
  // Before: every array exceeds its old lifetime cap, but nothing in it is live.
  expect(r.before.arrays).toEqual({laws:3, permits:4203, petitions:561, votes:71, violations:1, choices:0});
  expect(r.before.live).toEqual({laws:0, votes:0, permits:0, petitions:0, violations:0, choices:0});
  expect(r.commitments).toEqual({petition:expect.stringMatching(/^industry_petition_/), hearing:'pending', paid:true, violating:true, filed:true});
  expect(r.preLive).toEqual({laws:1, votes:1, permits:1, petitions:1, violations:1, choices:1});
  expect(r.restrictionFolded).toBe(true);
  expect(r.retired.license).toEqual(r.expected.license);
  expect(r.retired.restriction).toEqual(r.expected.restriction);
  expect(r.retired.e1).toEqual(r.expected.e1);
  expect(r.retired.e2).toBe(null);
  expect(r.enterprises).toEqual([r.e1]);
  expect(r.retired.town).toEqual(r.expected.town);
  expect(r.expected.town.passed).toBe(1);
  expect(r.after.arrays).toEqual(r.expected.arrays);
  // Pending hearings, live permits, live-law petitions and open violations never fold.
  expect(r.after.live).toEqual(r.preLive);
  expect(r.kept).toEqual({laws:r.ids.laws, petition:true, vote:'pending', permit:true, violation:[r.ids.violation]});
  expect(r).toMatchObject({unchanged:true, twinChanged:true, again:false, pure:true, deterministic:true});
  info.annotations.push({type:'industry-law ledger bytes', description:JSON.stringify(r.bytes)});
  expect(r.bytes.folded).toBeLessThan(r.bytes.boundary * 0.75);

  // Compacted current-content save, load and re-save round-trip without replay.
  await restoreBookmark(page, r.text);
  await restoreBookmark(page, await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function (expected) {
    const s = FB.state;
    return JSON.stringify(s.industryLaws) === expected.ledger && s.player.gold === expected.gold &&
      FB.getRngState() === expected.rng && FB.getUidCounter() === expected.uidCounter;
  }, r)).toBe(true);

  // Folded history stays readable in the business, hearing and Deeds review sheets.
  const sheets = await page.evaluate(function (uid) {
    const s = FB.state, deed = FB.deeds.action('review_industry_hearings');
    FB.ui.showIndustryOperation(uid);
    const business = document.getElementById('gm-body').textContent;
    FB.ui.showIndustryAssemblyList('town');
    const hearings = document.getElementById('gm-body').textContent;
    FB.ui.showIndustryHearings();
    const records = document.getElementById('gm-body').textContent;
    FB.ui.closeModal();
    return {business:/Earlier operating-law records/.test(business) && /3 paid permissions totalling/.test(business) &&
      /1 petitions, 0 granted/.test(business), hearings:/Earlier hearings/.test(hearings) && /1 passed/.test(hearings),
      records:/1 ended laws, 0 of them repealed; 2103 paid permissions/.test(records), deed:!!deed && deed.show(s), history:FB.industryLaws.hasHistory(s)};
  }, r.e1);
  expect(sheets).toEqual({business:true, hearings:true, records:true, deed:true, history:true});
});

test('JSON window keeps closure, debt and window records while folding settled laws exactly', async function ({page}, info) {
  await start(page, info, true);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, H = window.retention, id = 'wharf_stall_due';
    const e1 = H.business();
    H.age(4);
    const T = s.turn, C = T - FB.ledgerRetention.days();
    // A judged court closure stays with the business's closure choice.
    const x1 = H.law(id, C - 620), closed = H.violation(x1, e1.uid, x1.startTurn + 10, {turn:x1.startTurn + 40, paid:6});
    s.industryLaws.choices.push({enterpriseUid:e1.uid, status:'close', turn:x1.startTurn + 40, closedBy:closed.id});
    // An unpaid personal balance of the living original operator stays payable.
    const x2 = H.law(id, C - 480), debt = H.violation(x2, 'stage_debt', x2.startTurn + 10, {turn:x2.startTurn + 40, paid:2});
    // Fully settled records fold.
    const x3 = H.law(id, C - 320);
    for (let i = 0; i < 50; i++) H.permit(x3, 'stage_' + i, x3.startTurn + 5);
    H.permit(x3, e1.uid, x3.startTurn); H.permit(x3, e1.uid, x3.startTurn + 60);
    for (let i = 0; i < 20; i++) H.petition(x3, 'stage_' + i, x3.startTurn + 10, i < 5);
    H.violation(x3, 'stage_paid', x3.startTurn + 20, {turn:x3.startTurn + 50, paid:6});
    // A law repealed by a granted petition, also settled.
    const x4 = H.law(id, C - 160, C - 100);
    H.petition(x4, e1.uid, C - 100, true, 'repeal');
    // Ended inside the window: retained.
    const x5 = H.law(id, C + 40), late = H.permit(x5, e1.uid, x5.startTurn);
    L.validate(s);
    const before = H.counts();
    function view() {
      const d = L.quoteDebt(s, debt.id);
      return JSON.stringify({op:L.operation(s, e1), relevant:L.relevant(s, e1), resume:L.quoteOperation(s, e1, 'resume', 0).ready,
        debt:d && [d.amount, d.ready], records:[H.find('laws', x1.id), H.find('violations', closed.id), H.find('laws', x2.id),
          H.find('violations', debt.id), H.find('laws', x5.id), H.find('permits', late.id), JSON.stringify(s.industryLaws.choices)]});
    }
    const prior = view(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const changed = L.compact(s);
    L.validate(s);
    const rows = s.industryLaws;
    return {days:FB.ledgerRetention.days(), failure:FB.ledgerRetention.lastFailure, before:before, changed:changed,
      pure:rng === FB.getRngState() && uid === FB.getUidCounter(), unchanged:prior === view(), after:H.counts(),
      laws:rows.laws.map(function (x) { return x.id; }), expectedLaws:[x1.id, x2.id, x5.id],
      violations:rows.violations.map(function (x) { return x.id; }), expectedViolations:[closed.id, debt.id],
      retired:rows.retired, e1:e1.uid, text:FB.save.serialize(), ledger:JSON.stringify(rows),
      gold:s.player.gold, rng:FB.getRngState(), uidCounter:FB.getUidCounter()};
  });
  expect(r.days).toBe(720);
  expect(r.failure).toBe(null);
  expect(r.before).toEqual({laws:5, permits:53, petitions:21, votes:0, violations:3, choices:1});
  expect(r).toMatchObject({changed:true, pure:true, unchanged:true});
  expect(r.laws).toEqual(r.expectedLaws);
  expect(r.violations).toEqual(r.expectedViolations);
  expect(r.after).toEqual({laws:3, permits:1, petitions:0, votes:0, violations:2, choices:1});
  expect(r.retired).toEqual({
    laws:{wharf_stall_due:{laws:2, repealed:1, permits:52, paid:52, petitions:21, granted:6, violations:1, fines:6, finesPaid:6, closures:1}},
    hearings:{},
    enterprises:{[r.e1]:{permits:2, paid:2, petitions:1, granted:1, violations:0, fines:0, finesPaid:0, closures:0}}});
  await restoreBookmark(page, r.text);
  await restoreBookmark(page, await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function (expected) {
    const s = FB.state;
    return JSON.stringify(s.industryLaws) === expected.ledger && s.player.gold === expected.gold &&
      FB.getRngState() === expected.rng && FB.getUidCounter() === expected.uidCounter;
  }, r)).toBe(true);
});

test('live caps still refuse writes and reject over-cap or malformed ledgers before adoption', async function ({page}, info) {
  await start(page, info, true);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, H = window.retention, id = 'wharf_stall_due';
    const e1 = H.business();
    H.age(4);
    const T = s.turn, C = T - FB.ledgerRetention.days();
    const old = H.law(id, C - 300);
    H.permit(old, e1.uid, old.startTurn); H.petition(old, e1.uid, old.startTurn + 5, false);
    const folded = L.compact(s);
    // A live law with 4095 then 4096 live permits.
    const y = H.law(id, T - 10);
    for (let i = 0; i < 4095; i++) H.permit(y, 'stage_' + i, T - 5);
    const open = L.quoteOperation(s, e1, 'pay', 0).ready;
    H.permit(y, 'stage_4095', T - 5);
    const full = L.quoteOperation(s, e1, 'pay', 0);
    L.validate(s);
    function rejects(change, turn, dead) {
      const t = Object.assign({}, s, {industryLaws:JSON.parse(JSON.stringify(s.industryLaws)), turn:turn || s.turn});
      // A detached view in which the original operator has died.
      if (dead) { t.chars = Object.assign({}, s.chars); t.chars[s.player.charId] = Object.assign({}, s.chars[s.player.charId], {dead:true}); }
      change(t.industryLaws, t);
      try { L.validate(t); return false; } catch (e) { return true; }
    }
    function petitions(n) {
      return function (rows) {
        rows.petitions = [];
        for (let i = 0; i < n; i++) rows.petitions.push({id:'industry_petition_cap_' + i, kind:'exemption', lawId:y.id, enterpriseUid:'cap_' + i,
          actorId:s.player.charId, turn:T - 5, granted:false, endTurn:Math.min(y.endTurn, T - 5 + y.terms.relief.days)});
      };
    }
    function violations(n) {
      return function (rows) {
        rows.violations = [];
        for (let i = 0; i < n; i++) rows.violations.push({id:'industry_violation_cap_' + i, lawId:y.id, enterpriseUid:'cap_' + i,
          actorId:s.player.charId, provinceId:'london', homeProvinceId:'york', turn:T - 5, output:3, fee:1, evidence:'material',
          caseId:null, resolved:null, judgment:null});
      };
    }
    // Ended laws kept by unresolved violations remain in the live closure.
    function kept(n) {
      return function (rows) {
        rows.laws = []; rows.permits = []; rows.petitions = []; rows.violations = []; rows.choices = []; delete rows.retired;
        for (let i = 0; i < n; i++) {
          const law = Object.assign(JSON.parse(JSON.stringify(y)), {id:'industry_law_cap_' + i, startTurn:i * 130,
            endTurn:i * 130 + y.terms.durationDays, transitionEndTurn:i * 130});
          rows.laws.push(law);
          rows.violations.push({id:'industry_violation_kept_' + i, lawId:law.id, enterpriseUid:'cap_' + i, actorId:s.player.charId,
            provinceId:'london', homeProvinceId:'york', turn:law.startTurn + 1, output:3, fee:1, evidence:'material',
            caseId:null, resolved:null, judgment:null});
        }
      };
    }
    const caps = {
      permits4097:rejects(function (rows) { rows.permits.push(Object.assign({}, rows.permits[0], {id:'industry_permit_extra', enterpriseUid:'stage_extra'})); }),
      petitions512:!rejects(petitions(512)), petitions513:rejects(petitions(513)),
      violations512:!rejects(violations(512)), violations513:rejects(violations(513)),
      laws256:!rejects(kept(256), 256 * 130 + 200), laws257:rejects(kept(257), 257 * 130 + 200),
      // A dead operator's unheard complaint no longer keeps its ended law live.
      deadOperator:!rejects(kept(257), 257 * 130 + 200, true)
    };
    return {folded:folded, open:open, full:full.ready, reason:full.reason, caps:caps, retired:!!s.industryLaws.retired, live:L.liveCounts(s)};
  });
  expect(r).toMatchObject({folded:true, open:true, full:false, retired:true});
  expect(r.reason).toMatch(/record limit/);
  expect(r.live.permits).toBe(4096);
  expect(r.caps).toEqual({permits4097:true, petitions512:true, petitions513:true, violations512:true, violations513:true, laws256:true, laws257:true,
    deadOperator:true});

  // Tampered folded summaries and over-cap live ledgers reject before the campaign changes.
  const rejected = await page.evaluate(function () {
    const uid = FB.state.player.enterprises[0].uid;
    const changes = {
      negative:function (rows) { rows.retired.laws.wharf_stall_due.permits = -1; },
      unknownLaw:function (rows) { rows.retired.laws.unknown_due = JSON.parse(JSON.stringify(rows.retired.laws.wharf_stall_due)); },
      extraField:function (rows) { rows.retired.laws.wharf_stall_due.extra = 1; },
      grantedAbovePetitions:function (rows) { rows.retired.enterprises[uid].granted = 5; },
      enterpriseAboveLaw:function (rows) { rows.retired.enterprises[uid].permits = 9; rows.retired.enterprises[uid].paid = 9; },
      unknownBody:function (rows) { rows.retired.hearings.guildhall = {passed:1, rejected:0, withdrawn:0, invalidated:0}; },
      notObject:function (rows) { rows.retired = []; },
      overCap:function (rows) { rows.permits.push(Object.assign({}, rows.permits[rows.permits.length - 1], {id:'industry_permit_extra', enterpriseUid:'stage_extra'})); }
    };
    const out = {};
    Object.keys(changes).forEach(function (key) {
      const saved = JSON.parse(FB.save.serialize()), before = window.retention.snapshot();
      changes[key](saved.state.industryLaws);
      try { FB.save.restore(saved); out[key] = false; } catch (e) { out[key] = before === window.retention.snapshot(); }
    });
    return out;
  });
  expect(rejected).toEqual({negative:true, unknownLaw:true, extraField:true, grantedAbovePetitions:true, enterpriseAboveLaw:true,
    unknownBody:true, notObject:true, overCap:true});
});
