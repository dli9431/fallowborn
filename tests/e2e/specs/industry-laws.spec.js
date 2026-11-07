'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/industry-laws-river.json');
dependsOnRuntime(__filename, ['index.html','data/industry_laws.js','data/economy.js','data/technology.js',
  'js/industry_laws.js','js/economy.js','js/actions.js','js/treasury.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/ui_modals.js']);

async function start(page, info, imported) {
  if (imported) {
    await openGame(page, info);
    await prepareGameContent(page);
    expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, river)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/industry-laws-river.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await beginBookmarkFromTitle(page, '1204');
  } else await beginBookmark(page, info, '1204');
  await page.evaluate(function () {
    const s = FB.state, p = s.player, me = s.chars[p.charId];
    p.tier = 1; p.profession = 'merchant'; p.provinceId = 'london';
    p.gold = 2000; p.homeSettlement = 0;
    FB.setCareer(s, me, 'merchant', 'journeyman');
    me.skills.dip = 12; me.skills.ste = 12;
    const tech = FB.realmTechRecord(s, FB.techRealmId(s));
    ['urban_markets','annual_fairs'].forEach(function (id) {
      if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
    });
    FB.fns.local_council_elected(s);
    FB.enterpriseList(s); FB.enterpriseLaborRecords(s);
    window.lawSnapshot = function () {
      return JSON.stringify({state:FB.state, rng:FB.getRngState(), uid:FB.getUidCounter(), storage:Object.assign({}, localStorage)});
    };
    // Select a saved RNG state with the requested ordinary seeded vote result.
    window.lawVote = function (id, repealId, passed) {
      const s = FB.state;
      s.player.provinceId = 'london'; s.player.profession = 'merchant';
      FB.fns.local_council_elected(s);
      const chance = FB.localCouncilMotionChance(s);
      let selected = false;
      for (let i = 0; i < 128; i++) {
        const seed = FB.getRngState(), roll = FB.rng();
        if ((roll < chance) === passed) { FB.setRngState(seed); selected = true; break; }
      }
      if (!selected) throw new Error('Could not stage a bounded seeded vote');
      const q = FB.industryLaws.quoteMotion(s, id, repealId);
      const result = FB.proposeLocalCouncilMotion(s, q.terms.motionId, q);
      if (!result || result.passed !== passed) throw new Error('Council did not use the ordinary seeded approval');
      return result;
    };
    window.lawBusiness = function (upgraded) {
      const s = FB.state;
      const e = FB.buyEnterprise(s, 'market_stall_business', 0);
      if (!e) throw new Error('Ordinary stall purchase failed: ' + JSON.stringify(FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', 0)));
      if (upgraded && !FB.upgradeEnterprise(s, e.uid)) throw new Error('Ordinary stall upgrade failed');
      FB.setEnterpriseWorker(s, e.uid, s.player.charId, false);
      while (FB.enterpriseStaffAssigned(s, e) < FB.enterpriseStaffRequired(e)) {
        if (!FB.hireEnterpriseWorker(s, e.uid)) throw new Error('Ordinary local worker hire failed');
      }
      return e;
    };
  });
}

test('optional council laws use pure reviews, reject changed authority and preserve ordinary ordinances', async function ({page}, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws;
    const absent = s.industryLaws === undefined;
    const bounded = !L.relevant(s, {type:'market_stall_business',provinceId:'york'}) &&
      !L.relevant(s, {type:'brew_house',provinceId:'london'}) &&
      !L.quoteOperation(s, {type:'market_stall_business',provinceId:'york',settlement:0}, 'pause', 0).ready;
    const before = lawSnapshot(), q = L.quoteMotion(s, 'london_stall_license');
    FB.ui.showLocalCouncilMotion(); FB.ui.showIndustryLawMotion('london_stall_license');
    const pure = before === lawSnapshot();
    const actor = s.player.localCouncil.holderCharId;
    s.player.localCouncil.holderCharId = 'missing';
    const wrongBefore = lawSnapshot();
    const wrong = FB.proposeLocalCouncilMotion(s, 'london_stall_license', q) === false && wrongBefore === lawSnapshot();
    s.player.localCouncil.holderCharId = actor;
    const changed = JSON.parse(JSON.stringify(q)); changed.terms.fee++;
    const staleBefore = lawSnapshot();
    const stale = FB.proposeLocalCouncilMotion(s, 'london_stall_license', changed) === false && staleBefore === lawSnapshot();
    const refused = lawVote('london_stall_license', null, false);
    const noLawOnRefusal = s.industryLaws === undefined && s.player.localCouncil.nextMotionTurn > s.turn;
    const gold = s.player.gold, property = JSON.stringify(s.player.enterprises);
    const carried = lawVote('london_stall_license', null, true);
    const row = s.industryLaws.laws[0];
    const noConfiscation = gold === s.player.gold && property === JSON.stringify(s.player.enterprises);
    const repeatBefore = lawSnapshot();
    const repeat = FB.proposeLocalCouncilMotion(s, 'london_stall_license', q) === false && repeatBefore === lawSnapshot();
    s.player.localCouncil.nextMotionTurn = s.turn;
    const ordinary = FB.proposeLocalCouncilMotion(s, 'fair_measures');
    return {absent, bounded, pure, wrong, stale, refused:!refused.passed, noLawOnRefusal, carried:carried.passed,
      issuer:row.issuer.kind, noConfiscation, repeat, ordinary:!!ordinary,
      faults:L.definitionFaults(FBDATA.industryLaws), tech:FBDATA.techImpactReviews.features.targeted_industry_laws.mode};
  });
  expect(result).toEqual({absent:true,bounded:true,pure:true,wrong:true,stale:true,refused:true,noLawOnRefusal:true,
    carried:true,issuer:'local_council',noConfiscation:true,repeat:true,ordinary:true,faults:[],tech:'none'});
});

test('existing property transitions, pauses and pays its original treasury exactly once', async function ({page}, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness(true);
    lawVote('london_stall_license', null, true);
    const law = s.industryLaws.laws[0], uid = e.uid;
    const exempt = L.operation(s, e).amount === 0 && FB.enterpriseYield(s, e) > 0;
    s.player.provinceId = 'york';
    const grace = L.operation(s, e).laws[0].grace && FB.enterpriseYield(s, e) > 0;
    s.turn = law.transitionEndTurn;
    const pausedOutput = FB.enterpriseYield(s, e) === 0 && FB.enterprisePhysicalYield(s, e) === 0 &&
      FB.enterpriseUpgradeEffects(s, 'london').migrationAttraction === 0;
    const blockedRow = FB.enterpriseStaffingPlan(s).rows.filter(function (r) { return r.uid === uid; })[0];
    const blockedProjection = blockedRow.currentYield === 0 && FB.enterpriseLocalStaffYieldEstimate(s, e) === 0;
    const gold = s.player.gold, publicGold = s.realms[law.payeeRealmId].treasury.gold;
    const q = L.quoteOperation(s, e, 'pay', 0), before = lawSnapshot();
    const pure = before === lawSnapshot();
    s.player.gold = 1;
    const poorBefore = lawSnapshot(), poorQuote = L.quoteOperation(s, e, 'pay', 0);
    const poor = !L.commitOperation(s, poorQuote) && poorBefore === lawSnapshot();
    s.player.gold = gold;
    const paid = L.commitOperation(s, q);
    const receipt = s.industryLaws.permits[0];
    const conserved = s.player.gold === gold - 2 && s.realms[law.payeeRealmId].treasury.gold === publicGold + 2;
    const replayBefore = lawSnapshot(), replay = !L.commitOperation(s, q) && replayBefore === lawSnapshot();
    const restored = FB.enterpriseYield(s, e) > 0 && FB.enterpriseUpgradeEffects(s, 'london').migrationAttraction > 0;
    const paidRow = FB.enterpriseStaffingPlan(s).rows.filter(function (r) { return r.uid === uid; })[0];
    const paidProjection = Math.abs(paidRow.currentYield - FB.enterpriseYield(s, e)) <= 0.001 &&
      paidRow.proposedYield > 0 && FB.enterpriseLocalStaffYieldEstimate(s, e) > 0;
    const pause = L.commitOperation(s, L.quoteOperation(s, e, 'pause', 0)) && FB.enterpriseYield(s, e) === 0;
    const resume = L.commitOperation(s, L.quoteOperation(s, e, 'resume', 0)) && FB.enterpriseYield(s, e) > 0;
    const close = L.commitOperation(s, L.quoteOperation(s, e, 'close', 0)) && FB.enterpriseYield(s, e) === 0 &&
      s.player.enterprises.some(function (r) { return r.uid === uid; });
    L.commitOperation(s, L.quoteOperation(s, e, 'resume', 0));
    s.turn = receipt.endTurn;
    const renewal = FB.enterpriseYield(s, e) === 0 && L.operation(s, e).amount === 2;
    s.turn = law.endTurn;
    const expiry = L.lifecycle(s, law) === 'expired' && FB.enterpriseYield(s, e) > 0 && s.industryLaws.permits.length === 1;
    return {exempt,grace,pausedOutput,blockedProjection,pure,poor,paid,conserved,replay,restored,paidProjection,pause,resume,close,renewal,expiry};
  });
  for (const key of Object.keys(result)) expect(result[key], key).toBe(true);
});

test('remote acquisition includes fees and atomically rejects stale reviews and unavailable payees', async function ({page}, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws;
    lawVote('london_stall_license', null, true);
    s.player.provinceId = 'york';
    const status = FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', 0);
    const original = s.player.gold, payee = status.industryQuote.status.charges[0].payeeRealmId;
    s.player.gold = status.cost - 0.25;
    const before = lawSnapshot();
    const poor = !FB.acquireEnterprise(s, 'market_stall_business', 'london', 0) && before === lawSnapshot();
    s.player.gold = original;
    const q = FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', 0).industryQuote;
    s.turn++;
    const staleBefore = lawSnapshot();
    const stale = !FB.acquireEnterprise(s, 'market_stall_business', 'london', 0, {industryQuote:q}) && staleBefore === lawSnapshot();
    const retired = s.realms[payee].treasury.retired;
    s.realms[payee].treasury.retired = true;
    const unavailableBefore = lawSnapshot();
    const unavailable = !FB.acquireEnterprise(s, 'market_stall_business', 'london', 0) && unavailableBefore === lawSnapshot();
    s.realms[payee].treasury.retired = retired;
    const gold = s.player.gold, publicGold = s.realms[payee].treasury.gold;
    const live = FB.enterprisePurchaseStatus(s, 'market_stall_business', 'london', 0);
    const e = FB.acquireEnterprise(s, 'market_stall_business', 'london', 0, {industryQuote:live.industryQuote});
    return {poor,stale,unavailable,bought:!!e, fee:live.cost - live.baseCost,
      paid:s.player.gold === gold - live.cost, credited:s.realms[payee].treasury.gold === publicGold + 2,
      permit:L.operation(s, e).covered, receipts:s.industryLaws.permits.length};
  });
  expect(result).toEqual({poor:true,stale:true,unavailable:true,bought:true,fee:2,paid:true,credited:true,permit:true,receipts:1});
});

test('issuer succession, jurisdiction loss, repeal and repeated saves preserve law and property identities', async function ({page}, info) {
  await start(page, info);
  const facts = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness(false);
    lawVote('london_stall_license', null, true);
    const law = s.industryLaws.laws[0], issuer = JSON.stringify(law.issuer), original = s.holder.london;
    const ruler = s.realms[law.issuer.realmId].ruler;
    const successionRow = s.realms[law.issuer.realmId].succession;
    const generation = successionRow.rulerGeneration;
    ruler.generation = generation + 1; successionRow.rulerGeneration = generation + 1;
    const succession = L.lifecycle(s, law) === 'active' && JSON.stringify(law.issuer) === issuer;
    ruler.generation = generation; successionRow.rulerGeneration = generation;
    const other = Object.keys(s.realms).filter(function (id) { return id !== original && s.realms[id].alive && FB.treasuryPublicAccountSnapshot(s, id); })[0];
    s.holder.london = other;
    const lost = L.lifecycle(s, law) === 'suspended' && s.player.enterprises[0].uid === e.uid;
    s.player.localCouncil.nextMotionTurn = s.turn;
    const noDuplicate = !L.quoteMotion(s, 'london_stall_license').ready && L.quoteMotion(s, 'london_stall_license', law.id).ready;
    s.holder.london = original;
    s.player.provinceId = 'york'; s.turn = law.transitionEndTurn;
    const q = L.quoteOperation(s, e, 'pay', 0);
    if (!L.commitOperation(s, q)) throw new Error('Payment failed');
    const gold = s.player.gold, receipt = JSON.stringify(s.industryLaws.permits);
    lawVote('london_stall_license', law.id, true);
    const repeal = L.lifecycle(s, law) === 'repealed' && gold === s.player.gold && receipt === JSON.stringify(s.industryLaws.permits);
    FB.industryLaws.validate(s);
    return {succession,lost,noDuplicate,repeal,uid:e.uid,law:JSON.stringify(s.industryLaws),gold:s.player.gold,
      publicGold:s.realms[law.payeeRealmId].treasury.gold, payee:law.payeeRealmId, text:FB.save.serialize()};
  });
  expect(facts.succession && facts.lost && facts.noDuplicate && facts.repeal).toBe(true);
  await restoreBookmark(page, facts.text);
  const second = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page, second);
  expect(await page.evaluate(function (f) {
    const s = FB.state;
    return JSON.stringify(s.industryLaws) === f.law && s.player.gold === f.gold &&
      s.realms[f.payee].treasury.gold === f.publicGold && s.player.enterprises.some(function (e) { return e.uid === f.uid; });
  }, facts)).toBe(true);
  const invalid = await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = lawSnapshot();
    saved.state.industryLaws.permits[0].payeeRealmId = 'missing';
    let rejected = false;
    try { FB.save.restore(saved); } catch (e) { rejected = true; }
    return rejected && before === lawSnapshot();
  });
  expect(invalid).toBe(true);
});

test('ordinary JSON import supplies prohibition, reduced liabilities and pure malformed rejection', async function ({page}, info) {
  await start(page, info, true);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness(false);
    const data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const badCases = [null, [], 'license', {bad:{schema:1,execute:'seize'}}].map(function (value) {
      return {name:'Bad market terms',industryLaws:value};
    });
    ['fee','provinceId','enterpriseType','exemptions'].forEach(function (field) {
      const d = JSON.parse(JSON.stringify(FBDATA.industryLaws.river_stall_permission));
      d[field] = field === 'fee' ? -1 : field === 'exemptions' ? [{kind:'trait',id:'greedy',fee:0,permission:true}] : 'missing';
      badCases.push({name:'Bad market reference',industryLaws:{river_stall_permission:d}});
    });
    const rejected = badCases.every(function (bad) { return FB.mods.validate(bad).length > 0; }) && JSON.stringify(FBDATA) === data &&
      FB.getRngState() === rng && FB.getUidCounter() === uid;
    lawVote('river_stall_permission', null, true);
    s.player.provinceId = 'york';
    const gold = s.player.gold, payee = s.industryLaws.laws[0].payeeRealmId, publicGold = s.realms[payee].treasury.gold;
    const q = L.quoteOperation(s, e, 'pay', 0);
    const reduced = q.amount === 0.5 && L.commitOperation(s, q) && s.player.gold === gold - 0.5 &&
      s.realms[payee].treasury.gold === publicGold + 0.5;
    lawVote('river_stall_reserve', null, true);
    const law = s.industryLaws.laws[1];
    const grace = L.operation(s, e).operational;
    s.turn = law.transitionEndTurn;
    const before = lawSnapshot(), payment = L.quoteOperation(s, e, 'pay', 0);
    const prohibited = !L.operation(s, e).permitted && FB.enterpriseYield(s, e) === 0 &&
      !L.commitOperation(s, payment) && before === lawSnapshot();
    const purchaseBefore = lawSnapshot();
    const noAcquisition = !FB.acquireEnterprise(s, 'market_stall_business', 'london', 1) && purchaseBefore === lawSnapshot();
    s.player.provinceId = 'york';
    const exemption = L.operation(s, e).permitted && FB.enterpriseYield(s, e) > 0;
    const closed = L.commitOperation(s, L.quoteOperation(s, e, 'close', 0)) && s.player.enterprises.some(function (r) { return r.uid === e.uid; });
    return {rejected,reduced,grace,prohibited,noAcquisition,exemption,closed,sig:FB.mods.sig(),text:FB.save.serialize()};
  });
  for (const key of ['rejected','reduced','grace','prohibited','noAcquisition','exemption','closed']) expect(result[key], key).toBe(true);
  await restoreBookmark(page, result.text);
  await restoreBookmark(page, await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function (sig) { return FB.mods.sig() === sig && FB.state.industryLaws.permits[0].amount === 0.5; }, result.sig)).toBe(true);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = lawSnapshot();
    saved.mods += '-changed';
    try { FB.save.restore(saved); return false; } catch (e) { return before === lawSnapshot(); }
  })).toBe(true);
});

test('auction bids disclose and reserve permission fees before advancing the bidding record', async function ({page}, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state;
    lawVote('london_stall_license', null, true);
    s.player.provinceId = 'york';
    s.player.auction = {schema:1,status:'open',startedTurn:s.turn,
      venue:{provinceId:'london',settlement:0},
      lot:{kind:'enterprise',type:'market_stall_business',provinceId:'london',settlement:0,value:60},
      openingBid:40,bidIncrement:10,rivalMaximum:40,currentBid:40,bidCount:0};
    FB.auctionOf(s);
    s.player.gold = 50;
    const option = FB.auctionBidOptions(s)[0], before = lawSnapshot();
    const poor = option.total === 52 && option.operatingFee === 2 && !option.affordable &&
      !FB.placeAuctionBid(s, 1, option.industryQuote) && before === lawSnapshot();
    s.player.gold = 2000;
    const reviewed = FB.auctionBidOptions(s)[0];
    s.turn++;
    const staleBefore = lawSnapshot();
    const stale = !FB.placeAuctionBid(s, 1, reviewed.industryQuote) && staleBefore === lawSnapshot();
    const live = FB.auctionBidOptions(s)[0], payee = s.industryLaws.laws[0].payeeRealmId;
    const gold = s.player.gold, publicGold = s.realms[payee].treasury.gold;
    const won = FB.placeAuctionBid(s, 1, live.industryQuote);
    return {poor,stale,won:won.status === 'won',paid:s.player.gold === gold - live.total,
      credited:s.realms[payee].treasury.gold === publicGold + 2,
      receipt:s.industryLaws.permits.length === 1 && s.industryLaws.permits[0].enterpriseUid === won.awarded.uid};
  });
  expect(result).toEqual({poor:true,stale:true,won:true,paid:true,credited:true,receipt:true});
});

test('household succession retains paid permission and the account adapter rejects an incomplete batch', async function ({page}, info) {
  await start(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = lawBusiness(false);
    lawVote('london_stall_license', null, true);
    const law = s.industryLaws.laws[0];
    s.player.provinceId = 'york'; s.turn = law.transitionEndTurn;
    if (!L.commitOperation(s, L.quoteOperation(s, e, 'pay', 0))) throw new Error('Payment failed');
    const former = s.chars[s.player.charId];
    const heir = FB.makeCharacter(s, {name:'Market Heir', sex:'m', born:s.date.year - 20,
      culture:former.culture, religion:former.religion, dyn:former.dyn, station:1, traitsN:0,
      fatherId:former.sex === 'm' ? former.id : null, motherId:former.sex === 'f' ? former.id : null,
      homeProvinceId:'york'});
    former.childrenIds = former.childrenIds || []; former.childrenIds.push(heir.id);
    const facts = JSON.stringify(s.industryLaws), payee = law.payeeRealmId;
    const treasury = s.realms[payee].treasury.gold;
    former.dead = true; former.died = s.date.year; s.player.dead = true;
    s.legends.push({id:former.id,name:former.name,born:former.born,died:former.died});
    FB.game.succeedTo(heir.id); FB.ui.closeModal();
    const inherited = s.player.charId === heir.id && s.player.enterprises.some(function (r) { return r.uid === e.uid; }) &&
      JSON.stringify(s.industryLaws) === facts && s.realms[payee].treasury.gold === treasury && L.operation(s, e).covered;
    const before = lawSnapshot();
    const atomic = !FB.treasuryHouseholdPurchase(s, [{realmId:payee,amount:0.125},{realmId:'missing',amount:0.375}],1) && before === lawSnapshot();
    const gold = s.player.gold;
    s.player.gold = 1.5;
    const publicGold = s.realms[payee].treasury.gold;
    const exact = FB.treasuryHouseholdPurchase(s, [{realmId:payee,amount:0.125},{realmId:payee,amount:0.375}],1) &&
      s.player.gold === 0 && s.realms[payee].treasury.gold === publicGold + 0.5;
    s.player.gold = gold;
    const owned = s.player.enterprises.filter(function (r) { return r.uid === e.uid; })[0];
    const q = L.quoteOperation(s, owned, 'pause', 0);
    s.player.dead = true;
    const deadBefore = lawSnapshot();
    const dead = !L.commitOperation(s, q) && deadBefore === lawSnapshot();
    s.player.dead = false;
    L.validate(s);
    return {inherited,atomic,exact,dead};
  });
  expect(result).toEqual({inherited:true,atomic:true,exact:true,dead:true});
});

test('public operating review cancels freely and retains management navigation on a phone', async function ({page}, info) {
  await page.setViewportSize({width:390,height:844});
  await start(page, info);
  const uid = await page.evaluate(function () {
    const e = lawBusiness(false); lawVote('london_stall_license', null, true);
    FB.state.player.provinceId = 'york';
    FB.state.turn = FB.state.industryLaws.laws[0].transitionEndTurn;
    FB.ui.showEnterpriseManage(e.uid);
    return e.uid;
  });
  const original = await page.evaluate(function () { return lawSnapshot(); });
  await page.locator('#enterprise-operating-law').click();
  await expect(page.locator('#gm-body')).toContainText('operating permission is due');
  await expect(page.locator('[data-industry-operation="pay"]')).toBeEnabled();
  await page.locator('#industry-operation-back').click();
  await expect(page.locator('#enterprise-operating-law')).toBeVisible();
  expect(await page.evaluate(function () { return lawSnapshot(); })).toBe(original);
  await page.locator('#enterprise-operating-law').click();
  await page.locator('[data-industry-operation="pay"]').click();
  await expect(page.locator('#gm-body')).toContainText('Operation is lawful');
  await page.locator('#industry-operation-back').click();
  await expect(page.locator('#enterprise-operating-law')).toBeVisible();
  expect(await page.evaluate(function (uid) { return FB.state.industryLaws.permits.length === 1 && FB.state.player.enterprises[0].uid === uid; }, uid)).toBe(true);
});
