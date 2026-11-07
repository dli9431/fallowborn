'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const imported = require('../fixtures/authoring/industry-law-assemblies.json');

dependsOnRuntime(__filename, ['data/actions.js','data/economy.js','data/industry_laws.js','data/technology.js',
  'js/actions.js','js/industry_laws.js','js/government_continuity.js','js/governments.js','js/parliament.js',
  'js/politics.js','js/institutions.js','js/authority.js','js/economy.js','js/treasury.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/ui_misc.js','js/ui_modals.js']);

async function start(page, info, mod) {
  if (mod) {
    await openGame(page, info);
    await prepareGameContent(page);
    expect(await page.evaluate(function (data) { return FB.mods.validate(data); }, imported)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname, '../fixtures/authoring/industry-law-assemblies.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await beginBookmarkFromTitle(page, '1204');
  } else await beginBookmark(page, info, '1204');
  await page.evaluate(function () {
    const s = FB.state, p = s.player, c = s.chars[p.charId];
    p.tier = 1; p.profession = 'merchant'; p.provinceId = 'london'; p.homeSettlement = 0; p.gold = 2000;
    FB.setCareer(s,c,'merchant','journeyman');
    FB.fns.local_council_elected(s);
    window.assemblySnapshot = function () {
      return JSON.stringify({s:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter(),storage:Object.assign({},localStorage)});
    };
    window.hearing = function (id, consumer, repealId) {
      const q = FB.industryLaws.quoteAssembly(FB.state,id,consumer || 'town','begin',null,null,null,repealId);
      if (!q || !q.ready) throw new Error('Hearing unavailable: ' + JSON.stringify(q));
      return FB.industryLaws.commitAssembly(FB.state,q);
    };
    window.settleHearing = function (v) {
      return FB.industryLaws.commitAssembly(FB.state,FB.industryLaws.quoteAssembly(FB.state,v.definitionId,v.consumer,'resolve',v.id));
    };
    window.newSession = function () { FB.state.player.localCouncil.nextMotionTurn = FB.state.turn; };
    window.estatesHousehold = function () {
      const s = FB.state, p = s.player;
      p.tier = 3; p.liege = s.holder.london || s.owner.london;
      delete p.localCouncil; delete p.flags.councilman;
      const home = FB.world.provs.filter(function (x) { return !x.wasteland && x.id !== 'london' && s.owner[x.id] === p.liege; })[0];
      if (!home) throw new Error('No county for an ordinary sworn household');
      p.provinceId = home.id;
      FB.invalidateRealmCache();
    };
  });
}

test('town interests respond to access and fees; abstention, withdrawal, rejection and enactment are distinct', async function ({page}, info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, before = assemblySnapshot();
    const levy = L.quoteAssembly(s,'london_market_levy','town','begin');
    const restriction = L.quoteAssembly(s,'london_market_restriction','town','begin');
    const boundedApi = L.quoteAssembly(s,'london_market_levy','constructor','begin') === null &&
      L.assemblyMembers(s,'london_market_levy','constructor').length === 0 && L.assemblyList(s,'constructor').length === 0;
    const legacyReview = L.quoteMotion(s,'london_market_levy');
    const noLegacyBypass = !legacyReview.ready && !FB.proposeLocalCouncilMotion(s,'london_market_levy',legacyReview);
    const pure = before === assemblySnapshot();
    const interests = levy.members.map(function (m) { return m.posture; }).join(',') === 'support,support' &&
      restriction.members.map(function (m) { return m.posture; }).join(',') === 'oppose,oppose';
    const identities = levy.members.map(function (m) { return m.principal; }).join(',') === restriction.members.map(function (m) { return m.principal; }).join(',');
    const gold = s.player.gold, rng = FB.getRngState();
    let v = hearing('london_market_levy');
    const noEarlyLaw = !s.industryLaws.laws.length;
    const forbidden = L.quoteAssembly(s,v.definitionId,'town','ballot',v.id,'notables','support');
    const unauthorized = !forbidden.ready && !L.commitAssembly(s,forbidden);
    L.commitAssembly(s,L.quoteAssembly(s,v.definitionId,'town','ballot',v.id,'traders','abstain'));
    settleHearing(v);
    const quorumRejected = v.status === 'rejected' && v.result.tally.castWeight === 1;
    newSession(); v = hearing('london_market_restriction'); settleHearing(v);
    const opposed = v.status === 'rejected';
    newSession(); v = hearing('london_market_levy');
    L.commitAssembly(s,L.quoteAssembly(s,v.definitionId,'town','withdraw',v.id));
    const withdrawn = v.status === 'withdrawn' && !s.industryLaws.laws.length && s.player.localCouncil.nextMotionTurn > s.turn;
    newSession(); v = hearing('london_market_levy');
    const reviewed = L.quoteAssembly(s,v.definitionId,'town','resolve',v.id);
    const wrongMotion = !FB.proposeLocalCouncilMotion(s,'london_market_restriction',reviewed);
    settleHearing(v);
    const law = s.industryLaws.laws[0], after = assemblySnapshot();
    const once = v.status === 'passed' && law.id === v.lawId && !L.commitAssembly(s,reviewed) && after === assemblySnapshot();
    newSession();
    const repeal = hearing('london_market_levy','town',law.id);
    const reversed = L.quoteAssembly(s,repeal.definitionId,'town','resolve',repeal.id).members[0].posture === 'oppose';
    L.commitAssembly(s,L.quoteAssembly(s,repeal.definitionId,'town','ballot',repeal.id,'traders','support'));
    settleHearing(repeal);
    const repealed = repeal.status === 'passed' && law.repealedTurn === s.turn && s.industryLaws.laws.length === 1;
    L.validate(s);
    return {pure,boundedApi,noLegacyBypass,interests,identities,noEarlyLaw,unauthorized,quorumRejected,opposed,withdrawn,wrongMotion,once,reversed,repealed,
      noCharge:s.player.gold === gold && FB.getRngState() === rng,issuer:law.issuer.kind,
      legacy:!!L.quoteMotion(s,'london_stall_license'),technology:FBDATA.techImpactReviews.features.affected_industry_law_consent.mode};
  });
  expect(result).toEqual({pure:true,boundedApi:true,noLegacyBypass:true,interests:true,identities:true,noEarlyLaw:true,unauthorized:true,quorumRejected:true,
    opposed:true,withdrawn:true,wrongMotion:true,once:true,reversed:true,repealed:true,noCharge:true,issuer:'local_council',legacy:true,technology:'none'});
});

test('current principals, lost authority, government consent and hearing expiry invalidate stale reviews atomically', async function ({page}, info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, p = s.player, me = s.chars[p.charId];
    FB.setCareer(s,me,'administration','journeyman'); p.profession = 'administration';
    const trader = FB.makeCharacter(s,{name:'Local Trader',sex:'m',born:s.date.year - 30,culture:me.culture,religion:me.religion,station:1,traitsN:0});
    trader.homeProvinceId = 'london'; FB.setCareer(s,trader,'merchant','journeyman'); trader.career.guildRank = 'member';
    const replacement = FB.makeCharacter(s,{name:'Other Trader',sex:'f',born:s.date.year - 25,culture:me.culture,religion:me.religion,station:1,traitsN:0});
    replacement.homeProvinceId = 'london'; FB.setCareer(s,replacement,'merchant','journeyman'); replacement.career.guildRank = 'member';
    let v = hearing('london_market_levy'), q = L.quoteAssembly(s,v.definitionId,'town','resolve',v.id);
    const former = q.members.filter(function (m) { return m.kind === 'guild'; })[0].actorId;
    s.chars[former].dead = true;
    let before = assemblySnapshot();
    const deadStale = !L.commitAssembly(s,q) && before === assemblySnapshot();
    const fresh = L.quoteAssembly(s,v.definitionId,'town','resolve',v.id);
    const replaced = fresh.members.filter(function (m) { return m.kind === 'guild'; })[0].actorId !== former;
    const holder = s.holder.london;
    s.holder.london = 'player'; before = assemblySnapshot();
    const scopeStale = !L.commitAssembly(s,fresh) && before === assemblySnapshot();
    settleHearing(v); const lost = v.status === 'invalidated' && !s.industryLaws.laws.length;
    s.holder.london = holder; newSession(); v = hearing('london_market_levy');
    p.localCouncil.holderCharId = replacement.id;
    settleHearing(v); const seatLost = v.status === 'invalidated';
    FB.fns.local_council_elected(s); v = hearing('london_market_levy');
    s.turn = v.endTurn; settleHearing(v); const expired = v.status === 'invalidated';
    const rid = s.holder.london || s.owner.london;
    const unsupported = !FB.governments.strategy('consent','delegated').decision(s,rid,
      {actor:{kind:'realm',id:rid},operation:'industry_law',scope:{provinceId:'london'}}).allowed;
    const foreignScope = !FB.political.consent(s,{kind:'realm',id:rid},'industry_law',{provinceId:'missing'}).allowed;
    return {deadStale,replaced,scopeStale,lost,seatLost,expired,unsupported,foreignScope};
  });
  expect(result).toEqual({deadStale:true,replaced:true,scopeStale:true,lost:true,seatLost:true,expired:true,unsupported:true,foreignScope:true});
});

test('Estates use actual court influence and public exposure, with separate crown assent and shared enactment', async function ({page}, info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws;
    const town = L.assemblyMembers(s,'london_market_levy','town');
    const commonerExcluded = !L.quoteAssembly(s,'london_market_levy','estates','begin').ready;
    estatesHousehold();
    const q = L.quoteAssembly(s,'london_market_levy','estates','begin'), court = FB.politicalCourt(s);
    const actualSeats = q.members.length > 1 && q.members.every(function (m) { return m.kind === 'noble' && court.houses.some(function (h) { return h.id === m.id; }); });
    const noSharedFranchise = !L.quoteAssembly(s,'london_market_levy','town','begin').ready && !q.members.some(function (m) { return m.kind === 'guild'; });
    const sovereign = q.members.filter(function (m) { return m.realmId === s.player.liege; })[0];
    const exposures = sovereign.posture === 'support' && q.members.some(function (m) { return m.posture === 'abstain'; }) &&
      L.quoteAssembly(s,'london_market_restriction','estates','begin').members.filter(function (m) { return m.realmId === s.player.liege; })[0].posture === 'oppose';
    let v = hearing('london_market_levy','estates');
    const policyBlocked = !FB.parliamentMotionStatus(s,'redress').ready;
    const forged = L.quoteAssembly(s,v.definitionId,'estates','ballot',v.id,sovereign.id,'support');
    const cannotBuyCrown = !forged.ready && !L.commitAssembly(s,forged);
    // Only existing actual household property supplies the household's exposure.
    const tech = FB.realmTechRecord(s,FB.techRealmId(s));
    ['urban_markets','annual_fairs'].forEach(function (id) { if (tech.completed.indexOf(id) < 0) tech.completed.push(id); });
    const business = FB.acquireEnterprise(s,'market_stall_business','london',0);
    if (!business) throw new Error('Could not buy actual household market property');
    const exposed = L.quoteAssembly(s,v.definitionId,'estates','resolve',v.id).members.filter(function (m) { return m.actorId === s.player.charId; })[0];
    const actualProperty = exposed.interest < 0;
    L.commitAssembly(s,L.quoteAssembly(s,v.definitionId,'estates','ballot',v.id,'player','support'));
    const pendingText = FB.save.serialize();
    const old = L.quoteAssembly(s,v.definitionId,'estates','resolve',v.id), rid = s.player.liege;
    s.realms[rid].ruler.generation++;
    const before = assemblySnapshot(), successionStale = !L.commitAssembly(s,old) && before === assemblySnapshot();
    s.realms[rid].ruler.generation--;
    // The native rule's electorate and quorum, rather than a global chance, decide.
    const current = L.quoteAssembly(s,v.definitionId,'estates','resolve',v.id), t = current.tally;
    const expected = t.castWeight >= t.totalWeight * t.quorum && t.supportWeight > t.castWeight * t.threshold && t.consent;
    settleHearing(v);
    const shared = (v.status === 'passed') === expected && (!expected || s.industryLaws.laws[0].issuer.kind === 'estates' && L.operation(s,business).laws.length === 1);
    let paid = false;
    if (expected) {
      s.turn = s.industryLaws.laws[0].transitionEndTurn;
      const gold = s.player.gold, publicGold = s.realms[rid].treasury.gold;
      paid = L.commitOperation(s,L.quoteOperation(s,business,'pay',0)) && s.player.gold === gold - 3 &&
        s.realms[rid].treasury.gold === publicGold + 3;
    }
    L.validate(s);
    return {checks:{commonerExcluded,actualSeats,noSharedFranchise,exposures,policyBlocked,cannotBuyCrown,actualProperty,successionStale,shared,
      townSeparate:town.every(function (m) { return m.kind !== 'noble'; }),count:expected ? s.industryLaws.laws.length : 0,paid:paid},
      pendingText:pendingText,text:FB.save.serialize(),ledger:JSON.stringify(s.industryLaws),tally:t,
      gold:s.player.gold,publicGold:s.realms[rid].treasury.gold,property:JSON.stringify(s.player.enterprises),
      rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  expect(result.checks,JSON.stringify(result.tally)).toEqual({commonerExcluded:true,actualSeats:true,noSharedFranchise:true,exposures:true,policyBlocked:true,
    cannotBuyCrown:true,actualProperty:true,successionStale:true,shared:true,townSeparate:true,count:1,paid:true});
  await restoreBookmark(page,result.pendingText);
  expect(await page.evaluate(function () {
    const rows = FB.state.industryLaws;
    return rows.votes[0].consumer === 'estates' && rows.votes[0].status === 'pending' && rows.votes[0].ballots[0].posture === 'support' && !rows.laws.length;
  })).toBe(true);
  await restoreBookmark(page,result.text);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function (expected) {
    const s = FB.state;
    return JSON.stringify(s.industryLaws) === expected.ledger && s.player.gold === expected.gold &&
      s.realms[s.player.liege].treasury.gold === expected.publicGold && JSON.stringify(s.player.enterprises) === expected.property &&
      FB.getRngState() === expected.rng && FB.getUidCounter() === expected.uid;
  },result)).toBe(true);
});

test('ordinary JSON benches vary weights and exemptions without adding voters; pending and completed saves round-trip', async function ({page}, info) {
  await start(page,info,true);
  const staged = await page.evaluate(function (mod) {
    const s = FB.state, L = FB.industryLaws, before = assemblySnapshot(), dataBefore = JSON.stringify(FBDATA);
    const malformed = JSON.parse(JSON.stringify(mod)); malformed.industryLaws.river_market_hearing.voting.town.quorum = '1';
    const invalid = FB.mods.validate(malformed).length > 0 && before === assemblySnapshot() && dataBefore === JSON.stringify(FBDATA);
    let v = hearing('river_market_hearing');
    const q = L.quoteAssembly(s,v.definitionId,'town','resolve',v.id);
    const varied = q.members[0].posture === 'oppose' && q.members[1].weight === 3 && q.tally.quorum === 1;
    const fixtureChanged = JSON.parse(JSON.stringify(mod));
    fixtureChanged.industryLaws.river_market_reserve.exemptions[0].id = 'london';
    const validationPure = FB.mods.validate(fixtureChanged).length === 0;
    const pending = FB.save.serialize(); settleHearing(v);
    const passed = v.status === 'passed' && L.operation(s,{uid:'not_owned',type:'market_stall_business',provinceId:'london'}).amount === 4;
    newSession(); const other = hearing('river_market_reserve');
    const identityBefore = L.assemblyMembers(s,other.definitionId,'town').map(function (m) { return m.principal; });
    const review = L.quoteAssembly(s,other.definitionId,'town','resolve',other.id);
    const original = FBDATA.industryLaws.river_market_reserve;
    FBDATA.industryLaws.river_market_reserve = fixtureChanged.industryLaws.river_market_reserve;
    const changed = L.quoteAssembly(s,other.definitionId,'town','resolve',other.id);
    const exemptionNoVotes = changed.members[0].posture !== review.members[0].posture &&
      JSON.stringify(identityBefore) === JSON.stringify(changed.members.map(function (m) { return m.principal; }));
    FBDATA.industryLaws.river_market_reserve = original;
    L.commitAssembly(s,L.quoteAssembly(s,other.definitionId,'town','withdraw',other.id));
    L.validate(s);
    return {invalid,varied,validationPure,passed,exemptionNoVotes,pending,completed:FB.save.serialize(),ledger:JSON.stringify(s.industryLaws),
      rng:FB.getRngState(),uid:FB.getUidCounter(),gold:s.player.gold};
  },imported);
  for (const key of ['invalid','varied','validationPure','passed','exemptionNoVotes']) expect(staged[key],key).toBe(true);
  await restoreBookmark(page,staged.pending);
  expect(await page.evaluate(function () { return FB.state.industryLaws.votes[0].status === 'pending' && !FB.state.industryLaws.laws.length; })).toBe(true);
  await restoreBookmark(page,staged.completed);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function (expected) {
    return JSON.stringify(FB.state.industryLaws) === expected.ledger && FB.getRngState() === expected.rng &&
      FB.getUidCounter() === expected.uid && FB.state.player.gold === expected.gold;
  },staged)).toBe(true);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = assemblySnapshot();
    saved.state.industryLaws.votes[0].result.tally.supportWeight++;
    try { FB.save.restore(saved); return false; } catch (e) { return before === assemblySnapshot(); }
  })).toBe(true);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = assemblySnapshot();
    delete saved.state.industryLaws.votes;
    try { FB.save.restore(saved); return false; } catch (e) { return before === assemblySnapshot(); }
  })).toBe(true);
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize()), before = assemblySnapshot();
    saved.mods += '-changed';
    try { FB.save.restore(saved); return false; } catch (e) { return before === assemblySnapshot(); }
  })).toBe(true);
});

test('ordinary town and Estates sheets expose retained ballot reviews on compact screens', async function ({page}, info) {
  await start(page,info);
  await page.setViewportSize({width:390,height:740});
  await page.evaluate(function () {
    for (let i = 0; i < 5; i++) {
      newSession(); const v = hearing('london_market_restriction');
      FB.industryLaws.commitAssembly(FB.state,FB.industryLaws.quoteAssembly(FB.state,v.definitionId,'town','withdraw',v.id));
    }
    newSession(); FB.ui.showLocalCouncilMotion();
  });
  await page.locator('#industry-town-hearings').click();
  const levy = page.locator('[data-industry-hearing="london_market_levy"]').first();
  await levy.focus();
  const scroll = await page.evaluate(function () { const body = document.getElementById('gm-body'); body.scrollTop = 55; return body.scrollTop; });
  await levy.click();
  await expect(page.locator('#gm-body')).toContainText('Bounded county representation');
  await page.keyboard.press('Escape');
  await expect(page.locator('#industry-hearings-back')).toBeVisible();
  expect(await page.evaluate(function () { return document.getElementById('gm-body').scrollTop; })).toBe(scroll);
  await levy.click();
  await page.locator('#industry-hearing-begin').click();
  await expect(page.locator('#industry-ballot-traders-support')).toBeVisible();
  await page.locator('#industry-ballot-traders-support').click();
  await page.locator('#industry-hearing-resolve').click();
  await expect(page.locator('#gm-body')).toContainText('Passed and enacted');
  await page.locator('#industry-hearing-back').click();
  await expect(page.locator('#gm-body')).toContainText('Passed and enacted');
  expect(await page.evaluate(function () { return FB.state.industryLaws.laws.length; })).toBe(1);
  expect(scroll).toBeGreaterThan(0);
  expect(await page.evaluate(function () { return document.getElementById('gm-body').scrollTop; })).toBe(scroll);
  await page.evaluate(function () { FB.ui.closeModal(); estatesHousehold(); FB.ui.showParliament(); });
  await page.locator('#industry-estates-hearings').click();
  await page.locator('[data-industry-hearing="london_market_restriction"]').first().click();
  await expect(page.locator('#gm-body')).toContainText('The controlling court must support');
  await page.locator('#industry-hearing-begin').click();
  await page.locator('#industry-hearing-resolve').click();
  await expect(page.locator('#gm-body')).toContainText('Rejected');
  expect(await page.evaluate(function () {
    const s = FB.state; s.player.liege = null;
    const deed = FB.deeds.action('review_industry_hearings');
    if (!deed || !deed.show(s)) return false;
    deed.run(s); return true;
  })).toBe(true);
  await page.locator('#industry-records-estates').click();
  await page.locator('[data-industry-vote]').first().click();
  await expect(page.locator('#gm-body')).toContainText('Rejected');
});
