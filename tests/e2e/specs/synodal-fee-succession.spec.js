'use strict';

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { useReviewStartRules } = require('../support/game/released-starts');
const { openGame, openTitle, prepareGameContent } = require('../support/game/navigation');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { startPreparedParityGame } = require('../support/game/parity');
const { waitForUiRefresh } = require('../support/game/ui');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

test.describe.configure({ mode:'parallel' });

dependsOnRuntime(__filename,[
  'data/actions.js','data/events_paths.js','data/religious_cases.js','data/bookmark_1204.js','data/technology.js',
  'js/actions.js','js/events.js','js/schema.js','js/religious_cases.js','js/episcopal_claims.js',
  'js/government_ecclesiastical.js','js/papacy.js','js/justice.js','js/treasury.js','js/authority.js',
  'js/ui_panels.js','js/ui_modals.js','js/ui_religious_institutions.js','js/mods.js','js/save.js','js/save_v4.js'
]);

const roman = { id:'roman_clerical_violence',county:'roma',custom:2,ceiling:1,compensation:15 };
const spoleto = { id:'spoleto_synodal_discipline',county:'spoleto',custom:4,ceiling:0,compensation:25 };

async function start(page,info,profile,options) {
  const journey = { bookmark:'1204',code:'SYNOD-1204-baron-roma-m-Court' };
  if (profile === roman) {
    await startHistoricalGame(page,info,journey);
  } else {
    await useReviewStartRules(page);
    const fixture = path.resolve(__dirname,'../fixtures/authoring/synodal-fee-spoleto.json');
    if (options && options.storedMod) {
      // Store the same JSON text before the first boot, so a journey that
      // reloads again prepares only the modded catalogue.
      await page.addInitScript(function (text) {
        localStorage.setItem('fb_mods',JSON.stringify([text]));
      },fs.readFileSync(fixture,'utf8'));
      await openGame(page,info);
    } else {
      await openGame(page,info);
      await page.evaluate(function () { FB.ui.showMods(); });
      await page.locator('#modfile').setInputFiles(fixture);
      await Promise.all([page.waitForNavigation({ waitUntil:'domcontentloaded' }),page.locator('#mod-apply').click()]);
    }
    await prepareGameContent(page);
    await startPreparedParityGame(page,Object.assign({unhide:true},journey));
  }
  await page.evaluate(function (county) {
    FB.state.player.provinceId = county;
    FB.state.player.gold = 100;
    FB.game.setPaused(true);
    FB.game.uiPrefs.groupDeedsByActionType = false;
    Object.assign(FB.game.auto,{ all:false,major:false,minor:false,war:false });
    // Create only the recorded evidence needed by each isolated court journey.
    window.synodMatter = function (profileId,playerDefendant,offer) {
      const s = FB.state, R = FB.religiousCases, p = FBDATA.religiousCases[profileId];
      const court = FB.episcopalClaims.courtContext(s,p);
      function person(name) {
        const c = FB.makeCharacter(s,{ name,sex:'m',culture:'italian',religion:'catholic',born:s.date.year - 30,station:0,traitsN:0 });
        c.homeProvinceId = p.provinceId;
        const locals = s.provChars[p.provinceId] || (s.provChars[p.provinceId] = []);
        locals.push(c.id);
        return c;
      }
      s.provChars = s.provChars || {};
      const defendant = playerDefendant ? s.chars[s.player.charId] : person('Named defendant');
      const victim = person('Recorded cleric');
      if (!playerDefendant) defendant.wealth = 100;
      victim.role = 'priest';
      victim.career = { profession:'priest' };
      victim.wealth = 17;
      const source = FB.justiceRecordOffense(s,court.courtId,defendant.id,'abduction','material',true,victim.id,'succession:' + victim.id);
      if (!source || !R.apply(s,R.quote(s,profileId,source.id,court.bishopId,'charge'))) throw new Error('Could not file the recorded case');
      const offeror = playerDefendant ? court.bishopId : defendant.id;
      if (offer && !R.apply(s,R.quote(s,profileId,source.id,offeror,'settlement'))) throw new Error('Could not stage the other party’s offer');
      return { oid:source.id,defendant:defendant.id,victim:victim.id,see:court.realmId };
    };
    FB.ui.refresh();
  },profile.county);
  await waitForUiRefresh(page);
}

async function electSuccessor(page,profile) {
  const offices = await page.evaluate(function ({id,county}) {
    const s = FB.state, R = FB.religiousCases, p = s.papacy, c = s.chars[s.player.charId];
    const predecessor = FB.ecclesiasticalGovernment.incumbent(s,'papacy_1204');
    // Stage the earlier enactment using the original rule shape without a gathering date.
    if (!R.enactSynodalFee(s,R.synodalFeeReview(s,id,predecessor.id))) throw new Error('Could not establish the predecessor rule');
    const rule = R.synodalFeeRule(s,id);
    FB.appointCardinal(s,c,p.romanObedience,predecessor.id);
    if (!FB.startPapalElection(s,p.romanObedience,'death')) throw new Error('Could not open the Roman vacancy');
    const vacant = { fee:R.effectiveSettlementFee(s,id),rule:R.synodalFeeRule(s,id),
      denied:!R.synodalFeeReview(s,id,predecessor.id,'repeal').allowed && !R.synodalFeeReview(s,id,c.id,'repeal').allowed };
    const election = p.elections[p.romanObedience];
    election.phase = 'name';
    election.winnerId = c.id;
    if (!FB.choosePapalName(s,p.romanObedience,FB.papalRegnalChoices(s,c.id)[0].name)) throw new Error('Could not install the successor');
    s.player.provinceId = county;
    const successor = R.synodalFeeReview(s,id,c.id,'repeal');
    const former = R.synodalFeeReview(s,id,predecessor.id,'repeal');
    FB.ui.refresh();
    return { rule,vacant,successor:successor.repeal.issuer,allowed:successor.allowed,former:former.allowed,
      personalCooldown:s.player.cooldowns.convene_synod === undefined };
  },profile);
  expect(offices.vacant).toEqual({ fee:profile.ceiling,rule:offices.rule,denied:true });
  expect(offices).toMatchObject({ allowed:true,former:false,personalCooldown:true });
  expect(offices.successor.characterId).not.toBe(offices.rule.issuer.characterId);
  expect(offices.successor.generation).toBeGreaterThan(offices.rule.issuer.generation);
  await waitForUiRefresh(page);
  return offices;
}

async function reachCooldown(page,daysBefore) {
  const result = await page.evaluate(function (daysBefore) {
    const s = FB.state, ready = FB.instantStatusReadyTurn(s,'convene_synod');
    if (ready === null) throw new Error('Missing institutional synod cooldown');
    const turn = ready - daysBefore;
    s.date = FB.dateAtTurn(s,turn);
    s.turn = turn;
    const status = FB.instantStatus(s,'convene_synod');
    FB.ui.refresh();
    return { turn,ready,can:status.can,gold:s.player.gold };
  },daysBefore);
  await waitForUiRefresh(page);
  return result;
}

async function ready(page) {
  await expect.poll(function () { return page.evaluate(function () { return !FB.ui.eventInputGuarded(); }); }).toBe(true);
}

async function convene(page) {
  if (!await page.locator('#tab-actions').isVisible()) await page.locator('[data-tab="actions"]').click();
  const group = page.locator('#tab-actions [data-action-group="faith"]');
  if (await group.getAttribute('aria-expanded') === 'false') await group.click();
  await page.locator('#tab-actions [data-action-id="convene_synod"]').click();
  await expect(page.locator('#ev-title')).toHaveText('The Diocesan Synod');
  await ready(page);
}

function repealOption(page) {
  return page.locator('#ev-options').getByRole('button',{ name:/Repeal the settlement fee ceiling/ });
}

async function repeal(page,profile) {
  await convene(page);
  const amounts = await page.evaluate(function (p) {
    return [FB.money(p.ceiling,FB.state),FB.money(p.custom,FB.state),FB.money(10,FB.state)];
  },profile);
  const facts = page.locator('#ev-text');
  await expect(facts).toContainText(amounts[0] + ' now, ' + amounts[1] + ' after repeal');
  await expect(facts).toContainText('Gathering cost already paid: ' + amounts[2]);
  await expect(facts).toContainText('Existing offers and payments keep their original terms');
  await expect(page.locator('#ev-options').getByRole('button',{ name:/Enact the lower settlement fee/ })).toHaveCount(0);
  await repealOption(page).click();
  await expect(page.locator('#event-review-confirm')).toBeEnabled();
  await ready(page);
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#ev-text')).toContainText('The synod restored the customary institutional fee');
  await ready(page);
  await page.locator('#outcome-continue').click();
  await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
}

async function openCourt(page) {
  await page.evaluate(function () { FB.runInstant(FB.state,'ecclesiastical_court'); });
  await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');
}

function docket(page,m) { return page.locator('[id="religious-' + m.oid + '"]'); }

async function decideCase(page,m,action) {
  await docket(page,m).getByRole('button',{ name:action }).click();
  await page.locator('#religious-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Court decision recorded');
  await page.locator('#religious-continue').click();
  await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');
}

async function readCase(page,profile,m) {
  return page.evaluate(function ({id,m}) {
    const s = FB.state, snap = FB.religiousCases.snapshot(s,id,m.oid);
    return { record:snap.record,fee:snap.settlementFee,stale:snap.stale,gold:s.player.gold,
      balances:[snap.account.gold,s.realms[m.see].treasury.gold,s.chars[m.victim].wealth],
      receipts:s.authority.receipts.filter(function (r) { return r.obligationId.indexOf(snap.record.id + ':') === 0; }) };
  },{id:profile.id,m});
}

function receiptAmounts(result) {
  return result.receipts.map(function (r) { return [r.amount,r.beneficiaryRealmId || r.beneficiaryCharacterId,r.payerCharacterId]; });
}

test('the default court collects a customary offer and records refusal without another payment',async function ({page},info) {
  await start(page,info,roman);
  const cases = await page.evaluate(function (id) {
    return { pay:synodMatter(id,true,true),refuse:synodMatter(id,true,false) };
  },roman.id);
  const before = await readCase(page,roman,cases.pay);
  await openCourt(page);
  await expect(docket(page,cases.pay)).toContainText('The customary rate in effect when offered');
  await decideCase(page,cases.pay,/^Accept the settlement/);
  const paid = await readCase(page,roman,cases.pay);
  expect(paid.record.paid).toMatchObject({ fee:2,amount:15,basis:100 });
  expect(paid.record.paid).not.toHaveProperty('feeRuleId');
  expect(paid.balances).toEqual([83,before.balances[1] + 2,32]);
  expect(receiptAmounts(paid)).toEqual([[2,cases.pay.see,cases.pay.defendant],[15,cases.pay.victim,cases.pay.defendant]]);
  const refusalBefore = await readCase(page,roman,cases.refuse);
  await decideCase(page,cases.refuse,/^Refuse lawful process/);
  const refused = await readCase(page,roman,cases.refuse);
  expect(refused).toMatchObject({ record:{ status:'charged',refused:true,paid:null },balances:refusalBefore.balances,receipts:[] });
  expect(await page.evaluate(function () { return FB.state.authority.synodalFees || []; })).toEqual([]);
  const legacy = await page.evaluate(function (oid) {
    const record = FB.religiousCases.recordForOffense(FB.state,oid);
    delete record.paid.offerTurn;
    record.definitionFingerprint = '36bd30dba65ea73580e96dd3aca510d8ad9ce7a1ccff561b8c349ccf0ad025b2';
    return FB.save.serialize();
  },cases.pay.oid);
  await restoreBookmark(page,legacy);
  const restored = await readCase(page,roman,cases.pay);
  expect(restored.record.paid).not.toHaveProperty('offerTurn');
  expect(restored.balances).toEqual(paid.balances);
  expect(restored.receipts).toEqual(paid.receipts);
});

test('a successor can keep the ceiling after the inherited cooldown and cannot reuse an absent bishop’s review',async function ({page},info) {
  await start(page,info,roman);
  const offices = await electSuccessor(page,roman);
  const early = await reachCooldown(page,1);
  expect(early).toMatchObject({ ready:offices.rule.enactedTurn + 360,can:false,gold:100 });
  expect(await page.evaluate(function () {
    const s = FB.state;
    FB.runInstant(s,'convene_synod');
    return { gold:s.player.gold,stamp:s.player.cooldowns.convene_synod || null };
  })).toEqual({gold:100,stamp:null});
  const gathering = await reachCooldown(page,0);
  expect(gathering.can).toBe(true);
  await page.evaluate(function () {
    const queue = FB.queueEvent;
    FB.queueEvent = function (s,id) {
      const item = queue.apply(this,arguments);
      if (id === 'bishop_synod') { window.synodContext = item.ctx; FB.queueEvent = queue; }
      return item;
    };
  });
  await convene(page);
  const blocked = await page.evaluate(function (id) {
    const s = FB.state, ctx = window.synodContext, ev = FB.eventById('bishop_synod');
    const option = ev.options.find(function (o) { return o.review && o.review.args.operation === 'repeal'; });
    const reviewed = FB.eventReviews.quote(s,option,ctx), originalCounty = s.player.provinceId;
    if (!reviewed || !reviewed.quote.allowed) throw new Error('The paid synod did not yield a repeal review');
    const automated = FB.resolveEventOption(s,ev,option,ctx,{ automated:true,reviewed });
    const unreviewed = FB.resolveEventOption(s,ev,option,ctx,{});
    s.player.provinceId = 'spoleto';
    const absent = FB.resolveEventOption(s,ev,option,ctx,{ reviewed });
    const fee = FB.religiousCases.effectiveSettlementFee(s,id);
    s.player.provinceId = originalCounty;
    return { automated,unreviewed,absent,fee };
  },roman.id);
  expect(blocked).toEqual({ automated:false,unreviewed:false,absent:false,fee:1 });
  await repealOption(page).click();
  await ready(page);
  await page.locator('#event-review-cancel').click();
  await expect(repealOption(page)).toBeFocused();
  await ready(page);
  await page.locator('#ev-options').getByRole('button',{ name:/Keep current terms/ }).click();
  await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function (id) {
    const s = FB.state, R = FB.religiousCases;
    return { gold:s.player.gold,stamp:s.player.cooldowns.convene_synod,rule:R.synodalFeeRule(s,id),
      fee:R.effectiveSettlementFee(s,id),ready:FB.instantStatus(s,'convene_synod').can };
  },roman.id)).toEqual({ gold:90,stamp:gathering.turn,fee:1,ready:false,
    rule:Object.assign({},offices.rule,{lastGatheringTurn:gathering.turn}) });
});

for (const profile of [roman,spoleto]) {
  const restoration = profile === roman ? ' across cold restore' : '';
  test('the ' + profile.county + ' successor repeals prospectively and can pay frozen offers' + restoration,async function ({page},info) {
    await start(page,info,profile);
    const original = await page.evaluate(function (id) { return synodMatter(id,false,true); },profile.id);
    const originalOffer = await readCase(page,profile,original);
    const offices = await electSuccessor(page,profile);
    expect(await readCase(page,profile,original)).toMatchObject({ stale:true,record:originalOffer.record });
    const gathering = await reachCooldown(page,0);
    expect(gathering.can).toBe(true);
    const cases = await page.evaluate(function (id) {
      return { closed:synodMatter(id,false,true),pending:synodMatter(id,false,true),fresh:synodMatter(id,false,false) };
    },profile.id);

    await openCourt(page);
    const closedBefore = await readCase(page,profile,cases.closed);
    await decideCase(page,cases.closed,/^Accept the settlement/);
    const closed = await readCase(page,profile,cases.closed);
    expect(closed.record.paid).toMatchObject({ fee:profile.ceiling,amount:profile.compensation,feeRuleId:offices.rule.id });
    expect(closed.balances).toEqual([100 - profile.ceiling - profile.compensation,closedBefore.balances[1] + profile.ceiling,17 + profile.compensation]);
    const oldReceipts = [[profile.compensation,cases.closed.victim,cases.closed.defendant]];
    if (profile.ceiling) oldReceipts.unshift([profile.ceiling,cases.closed.see,cases.closed.defendant]);
    expect(receiptAmounts(closed)).toEqual(oldReceipts);
    const pending = await readCase(page,profile,cases.pending);
    expect(pending.record.offer).toMatchObject({ fee:profile.ceiling,amount:profile.compensation,feeRuleId:offices.rule.id });
    await page.evaluate(function () { FB.ui.closeModal(); });

    await repeal(page,profile);
    const settledAfter = await readCase(page,profile,cases.closed);
    const pendingAfter = await readCase(page,profile,cases.pending);
    expect(settledAfter).toEqual(Object.assign({},closed,{fee:profile.custom,gold:gathering.gold - 10}));
    expect(pendingAfter).toEqual(Object.assign({},pending,{fee:profile.custom,gold:gathering.gold - 10}));
    const capture = await page.evaluate(function (id) {
      const s = FB.state, R = FB.religiousCases;
      return { saved:FB.save.serialize(),rule:R.synodalFeeRule(s,id),stamp:s.player.cooldowns.convene_synod,
        ready:FB.instantStatus(s,'convene_synod').can,romanFee:R.effectiveSettlementFee(s,'roman_clerical_violence') };
    },profile.id);
    expect(capture).toMatchObject({ stamp:gathering.turn,ready:false,romanFee:2,
      rule:Object.assign({},offices.rule,{ lastGatheringTurn:gathering.turn,repeal:{issuer:offices.successor} }) });
    expect(capture.rule.repeal.turn).toBeGreaterThanOrEqual(gathering.turn);

    if (profile === roman) {
      await openTitle(page,info);
      expect(await page.evaluate(function () { return FB.world === null; })).toBe(true);
      await restoreBookmark(page,capture.saved);
      expect(await page.evaluate(function (id) {
        return FB.religiousCases.synodalFeeRule(FB.state,id);
      },profile.id)).toEqual(capture.rule);
      expect(await readCase(page,profile,cases.closed)).toEqual(settledAfter);
      expect(await readCase(page,profile,cases.pending)).toEqual(pendingAfter);
    }
    expect(await readCase(page,profile,original)).toMatchObject({ stale:true,record:originalOffer.record,receipts:[] });
    await openCourt(page);
    const row = docket(page,cases.pending);
    const money = await page.evaluate(function (p) { return [FB.money(p.custom,FB.state),FB.money(p.ceiling,FB.state)]; },profile);
    await expect(row.locator('.kv').filter({ hasText:'Court fee for new offers' })).toContainText(money[0]);
    await expect(row.locator('.kv').filter({ hasText:'Court fee in the pending offer' })).toContainText(money[1]);
    await expect(row).toContainText('The ceiling in effect when offered');
    await decideCase(page,cases.pending,/^Accept the settlement/);
    const paid = await readCase(page,profile,cases.pending);
    expect(paid.record.paid).toMatchObject({ fee:profile.ceiling,amount:profile.compensation,feeRuleId:offices.rule.id });
    expect(paid.balances).toEqual([100 - profile.ceiling - profile.compensation,pendingAfter.balances[1] + profile.ceiling,17 + profile.compensation]);
    const fees = [[profile.compensation,cases.pending.victim,cases.pending.defendant]];
    if (profile.ceiling) fees.unshift([profile.ceiling,cases.pending.see,cases.pending.defendant]);
    expect(receiptAmounts(paid)).toEqual(fees);
    const freshBefore = await readCase(page,profile,cases.fresh);
    await decideCase(page,cases.fresh,/^Offer a financial settlement/);
    const fresh = await readCase(page,profile,cases.fresh);
    expect(fresh.record.paid).toMatchObject({ fee:profile.custom,amount:profile.compensation });
    expect(fresh.record.paid).not.toHaveProperty('feeRuleId');
    expect(fresh.balances).toEqual([100 - profile.custom - profile.compensation,freshBefore.balances[1] + profile.custom,17 + profile.compensation]);
    expect(receiptAmounts(fresh)).toEqual([[profile.custom,cases.fresh.see,cases.fresh.defendant],[profile.compensation,cases.fresh.victim,cases.fresh.defendant]]);
    expect(fresh.gold).toBe(gathering.gold - 10);
    expect((await readCase(page,profile,cases.closed)).receipts).toEqual(closed.receipts);
    if (profile === roman) {
      const rejected = await page.evaluate(function ({earlierIssuer,paidId}) {
        const saved = FB.save.serialize();
        const changes = [
          function (a,r) { delete r.repeal; },
          function (a,r) { r.repeal.issuer.characterId = earlierIssuer; },
          function (a,r) { r.repeal.turn = r.lastGatheringTurn - 1; },
          function (a) { a.religiousCases.find(function (r) { return r.id === paidId; }).paid.feeRuleId = 'unrelated'; },
          function (a) { a.receipts.find(function (r) { return r.id === paidId + ':fee'; }).amount += 1; }
        ];
        function facts() { return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]); }
        const before = facts();
        return changes.map(function (mutate) {
          const data = JSON.parse(saved), authority = data.state.authority;
          mutate(authority,authority.synodalFees[0]);
          try { FB.save.restore(data); } catch (error) { return facts() === before; }
          return false;
        });
      },{earlierIssuer:offices.rule.issuer.characterId,paidId:paid.record.id});
      expect(rejected).toEqual(Array(5).fill(true));
    }
  });
}

test('cold restore keeps the imported Spoleto repeal, pending waiver and exact paid receipts',async function ({page},info) {
  await start(page,info,spoleto,{ storedMod:true });
  const original = await page.evaluate(function (id) { return synodMatter(id,false,true); },spoleto.id);
  const originalOffer = await readCase(page,spoleto,original);
  await electSuccessor(page,spoleto);
  await reachCooldown(page,0);
  const cases = await page.evaluate(function (id) {
    const s = FB.state, R = FB.religiousCases, closed = synodMatter(id,false,true), pending = synodMatter(id,false,true);
    if (!R.apply(s,R.quote(s,id,closed.oid,s.player.charId,'accept'))) throw new Error('Could not pay the waived settlement');
    return {closed,pending};
  },spoleto.id);
  await repeal(page,spoleto);
  const closed = await readCase(page,spoleto,cases.closed), pending = await readCase(page,spoleto,cases.pending);
  expect(receiptAmounts(closed)).toEqual([[25,cases.closed.victim,cases.closed.defendant]]);
  expect(pending.record.offer).toMatchObject({ fee:0,amount:25 });
  const before = await page.evaluate(function (id) {
    return { saved:FB.save.serialize(),rule:FB.religiousCases.synodalFeeRule(FB.state,id),mods:FB.mods.sig() };
  },spoleto.id);
  await openTitle(page,info);
  expect(await page.evaluate(function () { return FB.world === null; })).toBe(true);
  await restoreBookmark(page,before.saved);
  expect(await page.evaluate(function (id) {
    const s = FB.state, R = FB.religiousCases;
    return { rule:R.synodalFeeRule(s,id),mods:FB.mods.sig(),newFee:R.effectiveSettlementFee(s,id) };
  },spoleto.id)).toEqual({ rule:before.rule,mods:before.mods,newFee:4 });
  expect(await readCase(page,spoleto,cases.closed)).toEqual(closed);
  expect(await readCase(page,spoleto,cases.pending)).toEqual(pending);
  expect(await readCase(page,spoleto,original)).toMatchObject({ stale:true,record:originalOffer.record,receipts:[] });
  expect(await page.evaluate(function ({id,oid}) {
    const s = FB.state, R = FB.religiousCases;
    return R.apply(s,R.quote(s,id,oid,s.player.charId,'accept'));
  },{id:spoleto.id,oid:cases.pending.oid})).toBe(true);
  const paid = await readCase(page,spoleto,cases.pending);
  expect(paid.record.paid).toMatchObject({ fee:0,amount:25,feeRuleId:pending.record.offer.feeRuleId });
  expect(receiptAmounts(paid)).toEqual([[25,cases.pending.victim,cases.pending.defendant]]);
});

test('a save made before the fee option restores unchanged and only the original declaration matches its fingerprint',async function ({page},info) {
  await start(page,info,roman);
  const saved = await page.evaluate(function (id) {
    const predecessor = '36bd30dba65ea73580e96dd3aca510d8ad9ce7a1ccff561b8c349ccf0ad025b2';
    const s = FB.state, R = FB.religiousCases, matter = synodMatter(id,true,true);
    if (!R.apply(s,R.quote(s,id,matter.oid,s.player.charId,'accept'))) throw new Error('Could not settle the predecessor case');
    const record = R.recordForOffense(s,matter.oid);
    delete record.paid.offerTurn;
    record.definitionFingerprint = predecessor;
    return { text:FB.save.serialize(),cases:JSON.stringify(s.authority.religiousCases),
      receipts:JSON.stringify(s.authority.receipts),signature:FB.mods.sig(),predecessor:predecessor };
  },roman.id);
  await restoreBookmark(page,saved.text);
  expect(await page.evaluate(function () {
    const s = FB.state;
    return { cases:JSON.stringify(s.authority.religiousCases),receipts:JSON.stringify(s.authority.receipts),
      rules:s.authority.synodalFees || [],signature:FB.mods.sig() };
  })).toEqual({ cases:saved.cases,receipts:saved.receipts,rules:[],signature:saved.signature });
  expect(JSON.parse(saved.cases).map(function (r) { return r.definitionFingerprint; })).toEqual([saved.predecessor]);
  // The same saved fingerprint no longer matches once the rest of the
  // declaration differs from the original, even under the same profile id.
  expect(await page.evaluate(function (text) {
    FBDATA.religiousCases.roman_clerical_violence.settlementMax += 1;
    const live = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    return FB.game.loadData(JSON.parse(text)) === false && live === FB.state && world === FB.world &&
      rng === FB.getRngState() && uid === FB.getUidCounter();
  },saved.text)).toBe(true);
});
