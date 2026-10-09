'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_711.js', 'data/political_institutions.js', 'data/technology.js',
  'data/actions.js', 'data/lexicons.js', 'data/story_instances.js', 'js/government_selection.js',
  'js/government_elective.js', 'js/government_lineage.js', 'js/governments.js',
  'js/government_continuity.js', 'js/government_levy.js', 'js/government_revenue.js',
  'js/government_ai.js', 'js/government_administration.js', 'js/world.js', 'js/main.js',
  'js/starts.js', 'js/treasury.js', 'js/authority.js', 'js/institutions.js', 'js/systems.js',
  'js/station.js', 'js/progression.js', 'js/justice.js', 'js/wars.js', 'js/save.js', 'js/save_v4.js',
  'js/actions.js', 'js/lordships.js', 'js/ui_modals.js', 'js/stories.js', 'js/story_government_selection.js'
]);

async function start(page, testInfo, fictional) {
  await openGame(page, testInfo);
  if (fictional) await page.addScriptTag({ path:path.resolve(__dirname, '../fixtures/elective-monarchy.js') });
  const error = await page.evaluate(function (fictional) {
    return new Promise(function (resolve) {
      FB.activateBookmark('711', null, function (error) {
        if (error) { resolve(error.message); return; }
        if (fictional) {
          const f = FB_ELECTIVE_FIXTURE;
          FBDATA.governmentForms[f.formId] = Object.assign({}, FBDATA.governmentForms.elective_monarchy, { selectionProfile:f.profile });
          FBDATA.bookmarks['711'].realms.find(function (r) { return r.id === f.realmId; }).government = f.formId;
          FB.governments.invalidate();
        }
        FB.game.pending = { seed:'ELECTIVE-CROWN-REVIEW' };
        FB.game.startObserve(); FB.game.setPaused(true); resolve(null);
      });
    });
  }, fictional);
  expect(error).toBe(null);
}

test('the protagonist receives private estate income while the public account settles its own costs', async function ({page},testInfo) {
  await start(page,testInfo);
  const candidate = await prepare(page);
  const result = await page.evaluate(function (candidate) {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', c = s.chars[candidate.cid];
    s.player.charId = c.id; s.player.provinceId = 'toledo'; FB.setPlayerTier(s,3,{attachLiege:false}); s.player.gold = 37;
    FB.assignSettlementLordship(s,'toledo',0,c.id);
    S.apply(s,S.quote(s,rid,{action:'negotiate',actor:{kind:'realm',id:rid},candidateId:candidate.id,terms:S.profile(s,rid).terms}));
    const resolved = S.apply(s,S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}));
    const fiscal = FB.settlementActorFiscal(s,{kind:'character',id:c.id});
    const net = fiscal.tax + fiscal.tolls + fiscal.national - fiscal.upkeep - fiscal.duesOut;
    const householdBudget = FB.playerCivilianBudget(s,null,true,{excludeFocus:true}).surplus;
    const forecast = FB.incomeBreakdown(s).gold;
    const publicAccount = s.realms.player.treasury, opening = publicAccount.gold;
    publicAccount.gold += 1000;
    const insulated = householdBudget === FB.playerCivilianBudget(s,null,true,{excludeFocus:true}).surplus &&
      forecast.total === FB.incomeBreakdown(s).gold.total;
    publicAccount.gold -= 1000; publicAccount.militaryAccrued = 5; FB.electivePublicSeason(s,13);
    return {resolved:resolved,privateGain:s.player.gold - 37,net:net,publicGain:publicAccount.gold - opening,
      insulated:insulated,publicLines:forecast.lines.some(function (line) { return line.label === FB.T('Rents from your lands') || line.label === FB.T('Government administration'); }),
      separate:!FB.directSettlements(s).some(function (site) { return site.provinceId === 'toledo' && site.settlement === 0; }),
      owned:FB.settlementHolder(s,'toledo',0).id === c.id};
  },candidate);
  expect(result.resolved).toBe(true); expect(result.separate).toBe(true); expect(result.owned).toBe(true);
  expect(result.insulated).toBe(true); expect(result.publicLines).toBe(false);
  expect(result.net).toBeGreaterThan(0); expect(result.privateGain).toBeCloseTo(result.net,8); expect(result.publicGain).toBe(8);
});

for (const fictional of [false,true]) {
  test('vacancy defense follows the profile and an actual defensive war, policy ' + fictional, async function ({page},testInfo) {
    await start(page,testInfo,fictional);
    await prepare(page,fictional);
    const result = await page.evaluate(function () {
      const s = FB.state, rid = 'visigoths_711';
      const before = FB.governments.call(s,rid,'levy','mayCall',{});
      FB.registerOrdinaryWar(s,'achila_711',{enemy:rid,target:'toledo',legacy:false});
      return {before:before,defense:FB.governments.call(s,rid,'levy','mayCall',{}),
        ban:FB.political.power(s,{kind:'realm',id:rid},'ban',{provinceId:'toledo'}).allowed,
        offense:FB.political.consent(s,{kind:'realm',id:rid},'war',{}).allowed};
    });
    expect(result).toEqual({before:false,defense:!fictional,ban:!fictional,offense:false});
  });
}

async function prepare(page, fictional, second) {
  return page.evaluate(function (args) {
    const s = FB.state, rid = 'visigoths_711', S = FB.governmentSelection, p = S.profile(s, rid);
    FB.realmHeldCounties(s, rid).forEach(function (pid) { FB.setCountySupport(s, pid, 40); });
    FB.treasuryCredit(s, rid, 100);
    if (!S.state(s, rid).vacancy) S.apply(s, S.quote(s, rid, { action:'open', actor:{ kind:'realm', id:rid }, cause:'abdication' }));
    const c = FB.makeCharacter(s, { name:args.second ? 'Second candidate' : 'Independent candidate',
      dyn:args.second ? 'Other House' : 'Independent House', sex:args.fictional ? 'f' : 'm',
      culture:args.fictional ? 'hispano_roman' : 'gothic', religion:'catholic', born:670,
      station:3, role:args.fictional ? 'priest' : 'notable', quality:2, traitsN:0 });
    c.homeProvinceId = 'toledo'; c.gold = 31; c.skills.mar = 12;
    const m = S.constituency(s, rid)[0];
    const review = S.quote(s, rid, { action:'nominate', memberId:m.id, characterId:c.id,
      actor:{ kind:'constituency', realmId:rid, id:m.id } });
    const nominated = S.apply(s, review);
    const id = Object.keys(s.realms[rid].succession.members).find(function (id) { return s.realms[rid].succession.members[id].charId === c.id; });
    return { cid:c.id, id:id, nominated:nominated, profile:p };
  }, { fictional:!!fictional, second:!!second });
}

for (const fictional of [false, true]) {
  test((fictional ? 'independent river profile' : '711 Gothic crown') + ' elects another house once and preserves property, treasury and restore identity', async function ({ page }, testInfo) {
    await start(page, testInfo, fictional);
    const candidate = await prepare(page, fictional);
    expect(candidate.nominated).toBe(true);
    const result = await page.evaluate(function (candidate) {
      const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', t = s.realms[rid].succession;
      const actor = { kind:'realm', id:rid }, p = S.profile(s, rid), c = s.chars[candidate.cid];
      const old = s.chars[t.members[t.rulerMemberId].charId]; old.gold = 19;
      const owned = JSON.stringify([s.owner,s.holder,s.player.holdings,s.settlementLordships]);
      const purse = s.player.gold, treasury = s.realms[rid].treasury, initial = treasury.gold, generation = t.rulerGeneration;
      const q = S.quote(s, rid, { action:'negotiate', actor:actor, candidateId:candidate.id, terms:p.terms });
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      for (let i = 0; i < 6; i++) { S.nominees(s,rid); S.candidates(s,rid); S.constituency(s,rid); S.quote(s,rid,q.request); }
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const agreed = S.apply(s,q), review = S.quote(s,rid,{ action:'resolve', actor:actor });
      const heads = JSON.stringify(s.religiousHeads), coronations = JSON.stringify(s.authority.appointments);
      const elected = S.apply(s,review), settled = JSON.stringify(s), duplicate = S.apply(s,review);
      const exact = { rng:FB.getRngState(), uid:FB.getUidCounter(), selection:JSON.stringify(S.state(s,rid)), crown:JSON.stringify(s.realms[rid].treasury) };
      const source = JSON.parse(FB.save.serialize()); FB.save.restore(source);
      return { pure:pure, agreed:agreed, elected:elected, duplicate:duplicate, unchanged:settled === JSON.stringify(s),
        publicCost:initial - treasury.gold, cost:p.negotiationCost, sameAccount:s.realms[rid].treasury === treasury,
        private:c.gold === 31 && old.gold === 19 && s.player.gold === purse && c.dyn === 'Independent House',
        dynasty:s.realms[rid].dynasty, generation:t.rulerGeneration === generation + 1,
        property:owned === JSON.stringify([s.owner,s.holder,s.player.holdings,s.settlementLordships]),
        religion:heads === JSON.stringify(s.religiousHeads) && coronations === JSON.stringify(s.authority.appointments),
        restore:JSON.stringify(S.state(FB.state,rid)) === exact.selection && JSON.stringify(FB.state.realms[rid].treasury) === exact.crown &&
          FB.getRngState() === exact.rng && FB.getUidCounter() === exact.uid,
        winner:S.state(FB.state,rid).vacancy.accessionId === candidate.id,
        forms:FB.governments.validate(), bookmark:FB.validateBookmark(FB.bookmark('711')),
        technology:FB.validateTechnologyData(), reviews:['elective_crown_nomination','elective_crown_accession',
          'elective_crown_obligations','elective_crown_property'].map(function (id) { return FBDATA.techImpactReviews.features[id].mode; }) };
    }, candidate);
    expect(result).toMatchObject({ pure:true, agreed:true, elected:true, duplicate:false, unchanged:true,
      sameAccount:true, private:true, dynasty:'Independent House', generation:true, property:true, religion:true,
      restore:true, winner:true, forms:[], bookmark:[], technology:[], reviews:['none','none','none','none'] });
    expect(result.publicCost).toBe(result.cost);
  });
}

test('changed nomination qualifications, principals, support, obligations and dead candidates reject atomically', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const candidate = await prepare(page);
  const result = await page.evaluate(function (candidate) {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', actor = {kind:'realm',id:rid}, p = S.profile(s,rid);
    const outcomes = [];
    [function () { FB.treasurySpend(s,rid,1); }, function () { FB.setCountySupport(s,'toledo',39); },
      function () { S.state(s,rid).members[0].weight++; }, function () { s.chars[candidate.cid].religion = 'jewish'; },
      function () { s.chars[candidate.cid].dead = true; }
    ].forEach(function (change) {
      const q = S.quote(s,rid,{action:'negotiate',actor:actor,candidateId:candidate.id,terms:p.terms});
      change(); const before = JSON.stringify(s), uid = FB.getUidCounter(), rng = FB.getRngState();
      outcomes.push(!S.apply(s,q) && before === JSON.stringify(s) && uid === FB.getUidCounter() && rng === FB.getRngState());
    });
    return outcomes;
  },candidate);
  expect(result).toEqual([true,true,true,true,true]);
});

test('divided assent retains rival claims, local administration and separate territorial possession', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const first = await prepare(page), second = await prepare(page,false,true);
  const result = await page.evaluate(function (ids) {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', p = S.profile(s,rid);
    const before = JSON.stringify([s.owner,s.holder,s.settlementLordships]), t = s.realms[rid].succession, gen = t.rulerGeneration;
    S.constituency(s,rid).forEach(function (m,i) { S.apply(s,S.quote(s,rid,{action:'support',
      actor:{kind:'constituency',realmId:rid,id:m.id},memberId:m.id,candidateId:ids[i],terms:p.terms})); });
    const source = JSON.parse(FB.save.serialize()); FB.save.restore(source);
    return { contested:S.state(s,rid).vacancy.status, winner:S.winner(s,rid), generation:t.rulerGeneration === gen,
      kept:before === JSON.stringify([s.owner,s.holder,s.settlementLordships]),
      rivalTerritory:s.owner.narbonne === 'achila_711', publicReceipts:FB.countyTaxBase(s,'toledo',1) > 0,
      noWar:!FB.political.consent(s,{kind:'realm',id:rid},'war',{}).allowed,
      restored:JSON.stringify(S.state(FB.state,rid)) === JSON.stringify(S.state(s,rid)) };
  },[first.id,second.id]);
  expect(result).toEqual({contested:'contested',winner:null,generation:true,kept:true,rivalTerritory:true,publicReceipts:true,noWar:true,restored:true});
});

test('nomination does not admit an unfree person, a foreign ruler, clergy or a dead principal', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711';
    S.apply(s,S.quote(s,rid,{action:'open',actor:{kind:'realm',id:rid},cause:'abdication'}));
    const m = S.constituency(s,rid)[0], c = s.chars[m.currentPrincipal.id], actor = {kind:'character',id:c.id};
    const request = {action:'nominate',actor:actor,memberId:m.id,characterId:c.id}, q = S.quote(s,rid,request);
    c.unfree = true;
    const before = JSON.stringify(s), stale = !S.apply(s,q) && before === JSON.stringify(s);
    c.unfree = false; c.role = 'priest'; const clergy = !S.quote(s,rid,request).allowed;
    c.role = 'notable';
    const foreign = !S.quote(s,rid,Object.assign({},request,{characterId:FB.realmRulerCharacterSnapshot(s,'achila_711').id})).allowed;
    c.dead = true; const principal = !S.quote(s,rid,request).allowed;
    return {stale:stale,clergy:clergy,foreign:foreign,principal:principal};
  });
  expect(result).toEqual({stale:true,clergy:true,foreign:true,principal:true});
});

test('designation is profile-owned and does not bypass a vacancy or assent', async function ({ page }, testInfo) {
  await start(page,testInfo,true);
  const candidate = await prepare(page,true);
  const result = await page.evaluate(function (candidate) {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', actor = {kind:'realm',id:rid};
    const during = S.quote(s,rid,{action:'designate',actor:actor,candidateId:candidate.id});
    const data = S.state(s,rid); data.vacancy = null;
    const designated = S.apply(s,S.quote(s,rid,{action:'designate',actor:actor,candidateId:candidate.id}));
    S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
    const premature = S.quote(s,rid,{action:'resolve',actor:actor});
    const gothic = S.quote(s,'achila_711',{action:'designate',actor:{kind:'realm',id:'achila_711'},candidateId:S.candidates(s,'achila_711')[0]});
    return {during:during.allowed,designated:designated,preference:s.realms[rid].succession.designatedHeirId,
      premature:premature.allowed,gothic:gothic.allowed};
  },candidate);
  expect(result).toEqual({during:false,designated:true,preference:candidate.id,premature:false,gothic:false});
});

test('AI shares refusal and budget rules and does not repeat a seasonal round', async function ({ page }, testInfo) {
  await start(page,testInfo);
  await prepare(page);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711';
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,-100); });
    const treasury = s.realms[rid].treasury; treasury.gold = 0; treasury.militaryAccrued = 0;
    const generation = s.realms[rid].succession.rulerGeneration, playerGold = s.player.gold;
    const declined = !S.ai(s,rid), unchanged = JSON.stringify(s), repeated = !S.ai(s,rid) && unchanged === JSON.stringify(s);
    return {declined:declined,repeated:repeated,unpaid:treasury.gold === 0 && s.player.gold === playerGold,
      generation:s.realms[rid].succession.rulerGeneration === generation,
      bounded:S.state(s,rid).members.length <= 24 && S.state(s,rid).vacancy.candidates.length <= 64};
  });
  expect(result).toEqual({declined:true,repeated:true,unpaid:true,generation:true,bounded:true});
});

test('missing old-save selection stays absent and malformed results fail on a detached copy', async function ({ page }, testInfo) {
  await start(page,testInfo);
  await prepare(page);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', source = JSON.parse(FB.save.serialize());
    const old = JSON.parse(JSON.stringify(source));
    old.state.authority.governments[rid].formId = 'territorial'; delete old.state.authority.governments[rid].selection;
    const rng = old.rng, uid = old.uid; FB.save.restore(old);
    const legacy = !S.state(FB.state,rid) && FB.governments.forRealm(FB.state,rid).id === 'territorial' && FB.getRngState() === rng && FB.getUidCounter() === uid;
    FB.save.restore(source); const active = FB.state, before = JSON.stringify(active);
    const failures = [];
    [function (d) { d.members[0].weight = 10; }, function (d) { d.vacancy.accessionId = 'invented'; },
      function (d) { d.vacancy.candidates.push('invented'); }, function (d) { d.members.push(d.members[0]); }
    ].forEach(function (damage) {
      const bad = JSON.parse(JSON.stringify(source)); damage(bad.state.authority.governments[rid].selection);
      try { FB.save.restore(bad); failures.push(false); } catch (error) { failures.push(FB.state === active && before === JSON.stringify(active)); }
    });
    const emptyAccount = JSON.parse(JSON.stringify(source)); delete emptyAccount.state.realms[rid].treasury;
    try { FB.save.restore(emptyAccount); failures.push(false); } catch (error) { failures.push(FB.state === active && before === JSON.stringify(active)); }
    return {legacy:legacy,failures:failures};
  });
  expect(result).toEqual({legacy:true,failures:[true,true,true,true,true]});
});

test('a genuinely older campaign gains no delegates or elective form on restoration', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize());
    ['visigoths_711','achila_711'].forEach(function (rid) {
      source.state.authority.governments[rid].formId = 'territorial';
      delete source.state.authority.governments[rid].selection;
    });
    delete source.state.localInstitutions;
    delete source.state.stories.toledo_crown_711;
    delete source.state.stories.northeastern_crown_711;
    const uid = source.uid, rng = source.rng;
    FB.save.restore(source);
    return { forms:['visigoths_711','achila_711'].map(function (rid) { return FB.governments.forRealm(FB.state,rid).id; }),
      noRoster:!FB.state.localInstitutions || Object.keys(FB.state.localInstitutions).length === 0,
      uid:FB.getUidCounter() === uid, rng:(FB.getRngState() >>> 0) === (rng >>> 0) };
  });
  expect(result).toEqual({forms:['territorial','territorial'],noRoster:true,uid:true,rng:true});
});

test('protagonist accession and household succession keep the public account and private purse separate', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', me = s.chars[s.player.charId];
    me.culture = 'gothic'; me.religion = 'catholic'; me.sex = 'm'; me.born = 670; me.unfree = false;
    me.homeProvinceId = 'toledo'; me.skills.mar = 12; s.player.provinceId = 'toledo';
    FB.setPlayerTier(s,2,{attachLiege:false}); s.player.gold = 37;
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    FB.treasuryCredit(s,rid,100);
    const treasury = s.realms[rid].treasury, before = treasury.gold, privateProperty = JSON.stringify(s.player.holdings);
    S.apply(s,S.quote(s,rid,{action:'open',actor:{kind:'realm',id:rid},cause:'abdication'}));
    const principal = S.constituency(s,rid)[0];
    const nominated = S.apply(s,S.quote(s,rid,{action:'nominate',actor:{kind:'constituency',realmId:rid,id:principal.id},
      memberId:principal.id,characterId:me.id}));
    const id = me.royalLine.memberId;
    S.apply(s,S.quote(s,rid,{action:'negotiate',actor:{kind:'realm',id:rid},candidateId:id,terms:S.profile(s,rid).terms}));
    const resolved = S.apply(s,S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}));
    const adopted = S.recognized(s,'player') && s.realms.player.treasury === treasury && s.player.gold === 37 && treasury.gold === before - 12;
    treasury.militaryAccrued = 5;
    FB.electivePublicSeason(s,13);
    s.treasuryAccounting.lastMilitaryTurn = -1;
    FB.treasuryCommitMilitary(s,{costs:{player:4},playerMercs:0});
    const routed = s.player.gold === 37 && treasury.gold === before - 12 + 13 - 4 - 5 && treasury.militaryAccrued === 0;
    const heir = FB.makeCharacter(s,{name:'Private heir',dyn:me.dyn,sex:'m',culture:'gothic',religion:'catholic',born:693,station:2,quality:1,traitsN:0});
    heir.fatherId = me.id; me.childrenIds.push(heir.id); heir.homeProvinceId = 'toledo';
    const household = FB.game.succeedTo(heir.id,{livingAbdication:true});
    FB.ui.closeModal(); FB.game.setPaused(true);
    const released = !s.realms.player && s.realms[rid].treasury === treasury && s.player.gold === 37 &&
      privateProperty === JSON.stringify(s.player.holdings);
    const cash = JSON.stringify(treasury), uid = FB.getUidCounter(), rng = FB.getRngState();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {nominated:nominated,resolved:resolved,adopted:adopted,routed:routed,household:household,released:released,
      restore:JSON.stringify(FB.state.realms[rid].treasury) === cash && FB.state.player.gold === 37 &&
        FB.getUidCounter() === uid && FB.getRngState() === rng};
  });
  expect(result).toEqual({nominated:true,resolved:true,adopted:true,routed:true,household:true,released:true,restore:true});
});

for (const fictional of [false,true]) {
  test('private settlement receipts remain personal through election, interim policy ' + fictional, async function ({page},testInfo) {
    await start(page,testInfo,fictional);
    const candidate = await prepare(page,fictional);
    const result = await page.evaluate(function (candidate) {
      const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', c = s.chars[candidate.cid];
      FB.assignSettlementLordship(s,'toledo',0,c.id);
      const holder = JSON.stringify(FB.settlementHolder(s,'toledo',0));
      const privateBefore = FB.settlementActorFiscal(s,{kind:'character',id:c.id}).tax;
      const publicBefore = FB.settlementActorFiscal(s,{kind:'realm',id:rid}).tax;
      const buildingsDuring = FB.governments.call(s,rid,'revenue','buildingIncome',{
        provinceId:'toledo',settlement:1,holder:{kind:'realm',id:rid},amount:10});
      S.apply(s,S.quote(s,rid,{action:'negotiate',actor:{kind:'realm',id:rid},candidateId:candidate.id,terms:S.profile(s,rid).terms}));
      const accession = S.apply(s,S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}));
      const privateAfter = FB.settlementActorFiscal(s,{kind:'character',id:c.id});
      const publicSites = FB.directSettlements(s,{kind:'realm',id:rid});
      const projection = FB.settlementFiscalProjection(s,'toledo',0);
      const privateAccount = FB.baronyAccount(s,c.id).gold;
      s.turn += 90; FB.settleBaronyAccounts(s,Math.floor(s.turn/90));
      return {accession:accession,privateBefore:privateBefore,privateAfter:privateAfter.tax,publicBefore:publicBefore,
        retained:holder === JSON.stringify(FB.settlementHolder(s,'toledo',0)),
        excluded:!publicSites.some(function (site) { return site.provinceId === 'toledo' && site.settlement === 0; }),
        paid:FB.baronyAccount(s,c.id).gold - privateAccount,net:projection.amounts.net,buildingsDuring:buildingsDuring};
    },candidate);
    expect(result.accession).toBe(true); expect(result.retained).toBe(true); expect(result.excluded).toBe(true);
    expect(result.privateBefore).toBeGreaterThan(0); expect(result.privateAfter).toBeCloseTo(result.privateBefore,8);
    expect(result.publicBefore).toBeGreaterThanOrEqual(0); expect(result.paid).toBeCloseTo(result.net,8);
    expect(result.buildingsDuring).toBe(fictional ? 0 : 7);
  });
}

test('actual death opens one vacancy; empty and minor pools survive interrupted restoration', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, S = FB.governmentSelection, rid = 'visigoths_711', t = s.realms[rid].succession;
    FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,-100); });
    const gen = t.rulerGeneration;
    FB.killChar(s,FB.realmRulerCharacterSnapshot(s,rid));
    const death = S.state(s,rid).vacancy.cause;
    const candidates = S.candidates(s,rid);
    candidates.forEach(function (id) {
      t.members[id].born = s.date.year - 10;
      if (t.members[id].charId) s.chars[t.members[id].charId].born = t.members[id].born;
    });
    // No new local adult nomination may bypass this deliberately minor pool.
    S.nominees(s,rid).forEach(function (id) { s.chars[id].unfree = true; });
    s.turn += 90; S.ai(s,rid); const minority = S.state(s,rid).vacancy.status;
    Object.keys(t.members).forEach(function (id) {
      if (id === t.rulerMemberId) return;
      t.members[id].alive = false; if (t.members[id].charId) s.chars[t.members[id].charId].dead = true;
    });
    s.turn += 90; S.ai(s,rid); const empty = S.state(s,rid).vacancy.status;
    const count = Object.keys(t.members).length, uid = FB.getUidCounter(), rng = FB.getRngState();
    const record = JSON.stringify(S.state(s,rid));
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {death:death,minority:minority,empty:empty,generation:t.rulerGeneration === gen,
      bounded:Object.keys(FB.state.realms[rid].succession.members).length === count,
      restore:record === JSON.stringify(S.state(FB.state,rid)) && uid === FB.getUidCounter() && rng === FB.getRngState()};
  });
  expect(result).toEqual({death:'death',minority:'minority',empty:'vacant',generation:true,bounded:true,restore:true});
});

test('explicit conversion rechecks existing obligations and support without creating people or property', async function ({ page }, testInfo) {
  await start(page,testInfo);
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'visigoths_711', actor = {kind:'realm',id:rid};
    delete s.authority.governments[rid].selection; s.authority.governments[rid].formId = 'territorial';
    FB.governments.invalidate(); FB.realmHeldCounties(s,rid).forEach(function (pid) { FB.setCountySupport(s,pid,40); });
    const q = FB.electiveConversionQuote(s,actor,rid,'elective_monarchy');
    FB.adjustCountySupport(s,'toledo',-1);
    const changed = JSON.stringify(s), stale = !FB.electiveConvert(s,q) && changed === JSON.stringify(s);
    const before = JSON.stringify([s.owner,s.holder,s.player.gold,s.player.holdings,s.authority.rights,s.authority.contracts,s.settlementLordships]);
    const uid = FB.getUidCounter(), rng = FB.getRngState(), treasury = s.realms[rid].treasury;
    const review = FB.electiveConversionQuote(s,actor,rid,'elective_monarchy');
    const converted = FB.electiveConvert(s,review);
    return {stale:stale,converted:converted,recognized:FB.governmentSelection.recognized(s,rid),
      kept:before === JSON.stringify([s.owner,s.holder,s.player.gold,s.player.holdings,s.authority.rights,s.authority.contracts,s.settlementLordships]),
      pure:uid === FB.getUidCounter() && rng === FB.getRngState(),sameAccount:s.realms[rid].treasury === treasury};
  });
  expect(result).toEqual({stale:true,converted:true,recognized:true,kept:true,pure:true,sameAccount:true});
});

for (const width of [390,1280]) {
  test('electoral review preserves terms, details, scroll and focus at width ' + width, async function ({ page }, testInfo) {
    await page.setViewportSize({width:width,height:900});
    await start(page,testInfo);
    const candidate = await prepare(page);
    await page.evaluate(function (candidate) {
      const s = FB.state, m = FB.governmentSelection.constituency(s,'visigoths_711')[0];
      s.player.charId = m.currentPrincipal.id; s.player.provinceId = 'toledo';
      FB.ui.showLocalKingship({realmId:'visigoths_711',candidateId:candidate.id});
    },candidate);
    await expect(page.locator('#gm-body')).toContainText('Who can stand');
    const disclosure = page.locator('#lineage-action-negotiate summary');
    await disclosure.click();
    const button = page.locator('[data-lineage-review="negotiate"]');
    await button.scrollIntoViewIfNeeded(); await button.focus();
    const scroll = await page.locator('#gm-body').evaluate(function (el) { return el.scrollTop; });
    await button.click(); await page.keyboard.press('Escape');
    await expect(page.locator('#lineage-candidate')).toHaveValue(candidate.id);
    expect(await page.locator('#lineage-action-negotiate').evaluate(function (el) { return el.open; })).toBe(true);
    expect(await page.locator('#gm-body').evaluate(function (el) { return Math.abs(el.scrollTop); })).toBeGreaterThanOrEqual(scroll - 2);
    await expect(button).toBeFocused();
  });
}
