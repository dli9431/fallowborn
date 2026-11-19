'use strict';

const path = require('path');
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { useReviewStartRules } = require('../support/game/released-starts');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const spoleto = require('../fixtures/authoring/synodal-fee-spoleto.json');

test.describe.configure({ mode:'parallel' });

dependsOnRuntime(__filename, [
  'index.html','data/religious_cases.js','data/bookmark_1204.js','data/technology.js',
  'js/religious_cases.js','js/episcopal_claims.js','js/government_ecclesiastical.js',
  'js/justice.js','js/authority.js','js/treasury.js','js/mods.js','js/save.js','js/save_v4.js'
]);

async function bindCourt(page) {
  await page.evaluate(function () {
    window.feeMatter = function (profileId) {
      const s = FB.state, R = FB.religiousCases, p = FBDATA.religiousCases[profileId];
      const court = FB.episcopalClaims.courtContext(s,p);
      s.provChars = s.provChars || {};
      function localPerson(name) {
        const person = FB.makeCharacter(s,{name:name,sex:'m',culture:'italian',religion:'catholic',
          born:s.date.year-30,station:0,traitsN:0});
        person.homeProvinceId = p.provinceId;
        (s.provChars[p.provinceId] || (s.provChars[p.provinceId] = [])).push(person.id);
        return person;
      }
      const accused = localPerson('Local defendant'), victim = localPerson('Local priest');
      accused.wealth = 100;
      victim.role = 'priest';
      victim.career = {profession:'priest'};
      victim.wealth = 17;
      const source = FB.justiceRecordOffense(s,court.courtId,accused.id,'abduction','material',true,victim.id,
        'fee-proof:' + accused.id);
      if (!source) throw new Error('Expected recorded violence against a cleric');
      const bishop = court.bishopId;
      function quote(action,actor) { return R.quote(s,profileId,source.id,actor || bishop,action); }
      function apply(action,actor) {
        const q = quote(action,actor);
        if (!R.apply(s,q)) throw new Error(action + ' rejected: ' + JSON.stringify(q));
        return q;
      }
      apply('charge');
      return {oid:source.id,accused:accused.id,victim:victim.id,bishop:bishop,quote:quote,apply:apply,
        record:function () { return R.recordForOffense(s,source.id); },
        balances:function () { return [accused.wealth,s.realms[court.realmId].treasury.gold,victim.wealth,
          FB.episcopalClaims.privateAccount(s,bishop).gold]; }};
    };
    window.feeState = function () {
      const s = FB.state;
      return {rules:s.authority.synodalFees,cases:s.authority.religiousCases,receipts:s.authority.receipts,
        gold:s.realms.papacy_1204.treasury.gold,rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
    };
  });
}

async function startRome(page,info) {
  await startHistoricalGame(page,info,{bookmark:'1204',code:'SYNOD-1204-baron-roma-m-Court'});
  await bindCourt(page);
}

test('Rome applies the ceiling to new offers and conserves customary, pending and reduced payments',async function ({page},info) {
  await startRome(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases, id = 'roman_clerical_violence';
    const early = feeMatter(id), pending = feeMatter(id), fresh = feeMatter(id);
    early.apply('settlement');
    early.apply('accept',early.accused);
    // Exact predecessor case shape: customary payment with no offer timestamp
    // or fee rule and the original Roman definition fingerprint.
    delete early.record().paid.offerTurn;
    early.record().definitionFingerprint = '36bd30dba65ea73580e96dd3aca510d8ad9ce7a1ccff561b8c349ccf0ad025b2';
    const legacy = FB.save.serialize();
    const alreadyPaid = JSON.stringify([early.record(),s.authority.receipts]);
    const oldOffer = pending.apply('settlement');
    const reviewedAcceptance = pending.quote('accept',pending.accused);
    const reviewedNew = fresh.quote('settlement');
    const enactment = R.synodalFeeReview(s,id,fresh.bishop);
    const enacted = R.enactSynodalFee(s,enactment);
    const frozen = alreadyPaid === JSON.stringify([early.record(),s.authority.receipts]) &&
      JSON.stringify(pending.record().offer) === JSON.stringify(oldOffer.terms);
    const stale = !R.apply(s,reviewedNew);
    const pendingBefore = pending.balances();
    const oldAccepted = R.apply(s,reviewedAcceptance);
    const pendingAfter = pending.balances();
    const before = fresh.balances();
    const lowered = fresh.apply('settlement',fresh.accused);
    const npcAccept = R.respond(s,id,fresh.oid);
    const after = fresh.balances(), row = fresh.record();
    const receipts = s.authority.receipts.filter(function (r) { return r.id.indexOf(row.id + ':') === 0; });
    return {legacy:legacy,save:FB.save.serialize(),state:feeState(),enacted:enacted,frozen:frozen,stale:stale,
      oldAccepted:oldAccepted,npcAccept:npcAccept,fees:[oldOffer.terms.fee,lowered.terms.fee,row.paid.fee],
      pending:pendingAfter.map(function (v,i) { return v-pendingBefore[i]; }),
      deltas:after.map(function (v,i) { return v-before[i]; }),
      receipts:receipts.map(function (r) { return [r.amount,r.beneficiaryRealmId || r.beneficiaryCharacterId]; }),
      victim:fresh.victim,linked:row.paid.feeRuleId === enactment.rule.id,
      technology:FBDATA.techImpactReviews.features.synodal_settlement_fee.mode};
  });
  expect(result).toMatchObject({enacted:true,frozen:true,stale:true,oldAccepted:true,npcAccept:true,
    fees:[2,1,1],pending:[-17,2,15,0],deltas:[-16,1,15,0],linked:true,technology:'none'});
  expect(result.receipts).toEqual([[1,'papacy_1204'],[15,result.victim]]);
  await restoreBookmark(page,result.legacy);
  expect(await page.evaluate(function () { return [feeState().rules || null,feeState().cases[0].paid.fee]; })).toEqual([null,2]);
  await restoreBookmark(page,result.save);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return feeState(); })).toEqual(result.state);
});

test('enactment requires current local authority and detached saves reject altered rules and fee receipts',async function ({page},info) {
  await startRome(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases, id = 'roman_clerical_violence';
    const x = FB.episcopalClaims.courtContext(s,FBDATA.religiousCases[id]);
    const baseline = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = R.synodalFeeReview(s,id,x.bishopId);
    const other = R.synodalFeeReview(s,id,s.player.charId);
    const pure = baseline === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const forged = JSON.parse(JSON.stringify(q));
    forged.rule.terms.ceiling = 0;
    const invalid = [other,forged].map(function (review) { return !R.enactSynodalFee(s,review); });
    const denied = [
      function (t) { t.chars[x.bishopId].dead = true; },
      function (t) { t.chars[x.bishopId].captive = true; },
      function (t) { t.holder.roma = 'france_1204'; },
      function (t) { t.date.year = 1217; },
      function (t) { t.start.id = '1066'; },
      function (t) { t.realms.papacy_1204.ruler.generation = x.bishopGeneration + 1; }
    ].map(function (mutate) {
      const t = JSON.parse(baseline);
      mutate(t);
      const before = JSON.stringify(t);
      return !R.enactSynodalFee(t,q) && before === JSON.stringify(t);
    });
    const unchanged = baseline === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const enacted = R.enactSynodalFee(s,q);
    const after = JSON.parse(JSON.stringify(s));
    delete after.authority.synodalFees;
    const free = baseline === JSON.stringify(after) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const repeated = !R.enactSynodalFee(s,q) && !R.synodalFeeReview(s,id,x.bishopId).allowed;
    const m = feeMatter(id);
    m.apply('settlement');
    m.apply('accept',m.accused);
    const save = FB.save.serialize();
    const malformed = [
      function (a) { delete a.synodalFees; },
      function (a) { a.synodalFees.push(a.synodalFees[0]); },
      function (a) { a.synodalFees[0].jurisdiction.provinceId = 'spoleto'; },
      function (a) { a.synodalFees[0].issuer.characterId = s.player.charId; },
      function (a) { a.synodalFees[0].issuer.generation += 1; },
      function (a) { a.synodalFees[0].enactedTurn = s.turn + 1; },
      function (a) { a.synodalFees[0].terms.ceiling = 2; },
      function (a) { a.synodalFees[0].definitionFingerprint = 'changed'; },
      function (a) { delete a.religiousCases[0].paid.feeRuleId; },
      function (a) { a.receipts.find(function (r) { return r.id === m.record().id + ':fee'; }).amount = 2; }
    ].map(function (mutate) {
      const data = JSON.parse(save);
      mutate(data.state.authority);
      const before = JSON.stringify([FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
      let rejected = false;
      try { FB.save.restore(data); } catch (error) { rejected = true; }
      return rejected && before === JSON.stringify([FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
    });
    return {pure:pure,unchanged:unchanged,enacted:enacted,free:free,repeated:repeated,
      invalid:invalid,denied:denied,malformed:malformed};
  });
  expect(result).toEqual({pure:true,unchanged:true,enacted:true,free:true,repeated:true,
    invalid:[true,true],denied:Array(6).fill(true),malformed:Array(10).fill(true)});
});

test('ordinary JSON imports a different ceiling and waives only the Spoleto institutional fee',async function ({page},info) {
  const fixturePath = path.resolve(__dirname,'../fixtures/authoring/synodal-fee-spoleto.json');
  await useReviewStartRules(page);
  await openGame(page,info);
  await prepareGameContent(page);
  const validation = await page.evaluate(function (mod) {
    const id = 'spoleto_synodal_discipline';
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const valid = FB.mods.validate(mod);
    const denied = [
      function (p) { p.synodalFee.kind = 'new_court'; },
      function (p) { p.synodalFee.ceiling = p.fee; },
      function (p) { p.synodalFee.ceiling = -1; },
      function (p) { p.provinceId = 'roma'; }
    ].map(function (mutate) {
      const candidate = JSON.parse(JSON.stringify(mod));
      mutate(candidate.religiousCases[id]);
      return FB.mods.validate(candidate).length > 0;
    });
    return {valid:valid,denied:denied,pure:before === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  },spoleto);
  expect(validation).toEqual({valid:[],denied:Array(4).fill(true),pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(fixturePath);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await beginBookmarkFromTitle(page,'1204','baron');
  await bindCourt(page);
  const result = await page.evaluate(function () {
    const s = FB.state, R = FB.religiousCases, id = 'spoleto_synodal_discipline';
    const m = feeMatter(id), roman = feeMatter('roman_clerical_violence');
    const customary = m.quote('settlement').terms.fee;
    const enacted = R.enactSynodalFee(s,R.synodalFeeReview(s,id,m.bishop));
    const before = m.balances(), terms = m.apply('settlement').terms;
    m.apply('accept',m.accused);
    const row = m.record(), rule = R.synodalFeeRule(s,id);
    const receipts = s.authority.receipts.filter(function (r) { return r.id.indexOf(row.id + ':') === 0; });
    return {customary:customary,enacted:enacted,fee:terms.fee,roman:roman.quote('settlement').terms.fee,
      deltas:m.balances().map(function (v,i) { return v-before[i]; }),
      receipts:receipts.map(function (r) { return [r.amount,r.beneficiaryCharacterId === m.victim]; }),
      scope:rule.jurisdiction,definition:rule.definitionFingerprint === FB.mods.fingerprint(FBDATA.religiousCases[id]),
      signature:FB.mods.sig(),save:FB.save.serialize()};
  });
  expect(result).toMatchObject({customary:4,enacted:true,fee:0,roman:2,deltas:[-25,0,25,0],
    receipts:[[25,true]],scope:{bookmarkId:'1204',provinceId:'spoleto',seeId:'papacy_1204'},definition:true});
  expect(result.signature).toMatch(/^effective-1-/);
  await restoreBookmark(page,result.save);
  expect(await page.evaluate(function () {
    return [FB.mods.sig(),FB.religiousCases.synodalFeeRule(FB.state,'spoleto_synodal_discipline').terms.ceiling];
  })).toEqual([result.signature,0]);
});
