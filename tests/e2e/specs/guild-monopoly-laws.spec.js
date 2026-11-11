'use strict';
const path = require('path');
const fs = require('fs');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmark, beginBookmarkFromTitle, restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {scanSource} = require('../support/source-literals');
const {quotedCounts} = require('../support/content-id-reviews');
const imported = require('../fixtures/authoring/guild-monopoly-river.json');

dependsOnRuntime(__filename, ['data/industry_laws.js','data/economy.js','data/technology.js','data/actions.js','data/events_intrigue.js',
  'js/industry_laws.js','js/schema.js','js/economy.js','js/actions.js','js/justice.js','js/treasury.js',
  'js/government_continuity.js','js/institutions.js','js/market.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_panels.js']);

test('changed law, account and presentation owners retain exact reviewed content spellings', function () {
  const root = path.resolve(__dirname,'../../..');
  const files = ['js/actions.js','js/economy.js','js/industry_laws.js','js/institutions.js','js/treasury.js','js/ui_modals.js','js/ui_panels.js','js/world.js'];
  const hooks = require('../fixtures/engine-ids/content-id-allowlist.json').hooks;
  const counts = quotedCounts(files.map(function (file) { return {file:file,scan:scanSource(fs.readFileSync(path.join(root,file),'utf8'))}; }));
  const differences = [];
  hooks.forEach(function (entry) { files.forEach(function (file) {
    const actual = counts.get(file + '\n' + entry.id) || 0, expected = entry.uses[file] || 0;
    if (actual !== expected) differences.push({file:file,id:entry.id,actual:actual,expected:expected});
  }); });
  expect(differences).toEqual([]);
  const metric = require('../fixtures/engine-ids/content-id-metric.json');
  const categories = {};
  hooks.forEach(function (entry) {
    categories[entry.category] = (categories[entry.category] || 0) + Object.values(entry.uses).reduce(function (n,x) { return n + x; },0);
  });
  expect(metric.categories).toEqual(categories);
  expect(metric.total).toBe(Object.values(categories).reduce(function (n,x) { return n + x; },0));
});

async function start(page, info, options) {
  options = options || {};
  if (options.mod) {
    await openGame(page,info); await prepareGameContent(page);
    expect(await page.evaluate(function (data) { return FB.mods.validate(data); },imported)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/guild-monopoly-river.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page); await beginBookmarkFromTitle(page,'1204');
  } else await beginBookmark(page,info,'1204');
  await page.evaluate(function (options) {
    const s = FB.state, p = s.player, c = s.chars[p.charId], pid = options.mod ? 'york' : 'london';
    FB.game.setPaused(true); p.tier = 1; p.provinceId = pid; p.homeSettlement = 0; p.profession = 'craftsman'; p.gold = 2000;
    FB.setCareer(s,c,'craftsman','master'); c.career.guildRank = 'guildmaster'; c.career.guildStanding = 80;
    FB.enterpriseList(s); FB.enterpriseLaborRecords(s); p.guildMonopolies = {incoming:null,outgoing:null};
    const rid = s.holder[pid] || s.owner[pid], judge = FB.materializeRealmRuler(s,rid);
    judge.traits = []; FB.adjustStanding(s,{kind:'realm',id:rid},100,'charter_review');
    if (options.ruler) {
      FB.setPlayerTier(s,4,{attachLiege:false}); p.liege = null; p.provs = [pid];
      FB.transferProvince(s,pid,'player'); FB.foundPlayerRealm(s); FB.treasuryInitialize(s);
    }
    const tech = FB.realmTechRecord(s,FB.techRealmId(s));
    ['guild_charters','horizontal_loom','olive_press','urban_markets'].forEach(function (id) {
      if (tech.completed.indexOf(id) < 0) tech.completed.push(id);
    });
    // An existing generated court person supplies the represented guild's
    // personal account; the gameplay adapter never creates this participant.
    const sponsor = Object.keys(s.chars).map(function (id) { return s.chars[id]; }).filter(function (other) {
      return other.id !== c.id && other.id !== judge.id && !other.dead && !other.captive && !other.exiled &&
        FB.ageOf(other,s.date.year) >= 16 && !FB.isReigningRealmRuler(s,other);
    })[0];
    if (!sponsor) throw new Error('No existing fixture representative');
    sponsor.householdResidenceId = pid; sponsor.homeProvinceId = pid; sponsor.wealth = 100;
    FB.setCareer(s,sponsor,'craftsman','master'); sponsor.career.guildRank = 'guildmaster';
    window.guildSponsor = sponsor.id; window.guildCourt = {rid:rid,id:judge.id};
    window.guildSnapshot = function () { return JSON.stringify({s:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter(),storage:Object.assign({},localStorage)}); };
    window.guildFacts = function () {
      const s = FB.state;
      return {laws:JSON.stringify(s.industryLaws),slots:JSON.stringify(s.player.guildMonopolies),gold:s.player.gold,
        sponsor:s.chars[guildSponsor].wealth,property:JSON.stringify(s.player.enterprises),
        payees:JSON.stringify((s.industryLaws && s.industryLaws.laws || []).map(function (law) { return FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId,true); })),
        rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
    };
    window.guildBusiness = function (type) {
      const s = FB.state, slot = (s.player.enterprises || []).filter(function (e) { return e.type === type && e.provinceId === s.player.provinceId; }).length;
      const e = FB.buyEnterprise(s,type,slot);
      if (!e) throw new Error('No fixture business: ' + JSON.stringify(FB.enterprisePurchaseStatus(s,type,s.player.provinceId,0)));
      (e.workerIds || (e.workerId ? [e.workerId] : [])).slice().forEach(function (id) { FB.unassignEnterpriseWorker(s,id); });
      while (FB.enterpriseStaffAssigned(s,e) < FB.enterpriseStaffRequired(e)) {
        if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('No fixture paid labor');
      }
      return e;
    };
    window.guildEnact = function (id,slot,exemptions) {
      const s = FB.state, q = FB.industryLaws.quoteGrant(s,id,slot,slot === 'incoming' ? s.player.charId : guildSponsor,exemptions || []);
      if (!q || !q.ready) throw new Error('No paid charter: ' + JSON.stringify(q));
      const law = slot === 'incoming' ? FB.receiveGuildMonopoly(s,q) : FB.issueGuildMonopoly(s,q.terms.grant.profession,q);
      if (!law) throw new Error('Charter commit rejected');
      return law;
    };
    s.eventQueue = []; FB.ui.closeModal();
  },options);
}

async function roundTrip(page) {
  const before = await page.evaluate(function () { return {text:FB.save.serialize(),facts:guildFacts()}; });
  await restoreBookmark(page,before.text);
  await restoreBookmark(page,await page.evaluate(function () { return FB.save.serialize(); }));
  expect(await page.evaluate(function () { return guildFacts(); })).toEqual(before.facts);
}

test('paid ruler grants conserve real funds and bind exclusive rights, member access and named property exemptions', async function ({page},info) {
  await start(page,info,{ruler:true});
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, a = guildBusiness('workshop_business'), b = guildBusiness('workshop_business');
    const publicBefore = FB.treasuryPublicAccountSnapshot(s,'player',true).gold, privateBefore = s.chars[guildSponsor].wealth;
    const before = guildSnapshot(), q = L.quoteGrant(s,'london_guild_exclusive','outgoing',guildSponsor,[a.uid]);
    const pure = before === guildSnapshot(), law = FB.issueGuildMonopoly(s,'craftsman',q), after = guildSnapshot();
    const once = !L.commitGrant(s,q) && after === guildSnapshot();
    const member = L.operation(s,b).operational;
    s.turn = law.transitionEndTurn; s.chars[s.player.charId].career.guildRank = 'none';
    const status = L.operation(s,b), named = L.operation(s,a);
    const buy = FB.enterprisePurchaseStatus(s,'workshop_business','london',2), blockedBefore = guildSnapshot();
    const noPurchase = buy.blockers.some(function (b) { return b.code === 'industry_law'; }) &&
      !FB.buyEnterprise(s,'workshop_business',2) && blockedBefore === guildSnapshot();
    const noCouncilBypass = !L.quoteMotion(s,law.definitionId).ready && !FB.proposeLocalCouncilMotion(s,law.terms.motionId,L.quoteMotion(s,law.definitionId));
    const linked = s.player.guildMonopolies.outgoing;
    FB.ensureInstitutions(s);
    const oneStore = !s.privileges.some(function (r) { return r.effectKind === 'guild_monopoly' && r.effectId === linked.contractId; });
    L.validate(s);
    return {pure,once,member,blocked:!status.operational && !status.permitted,named:named.operational && named.laws[0].exempt,
      noPurchase:noPurchase,noCouncilBypass,money:FB.treasuryPublicAccountSnapshot(s,'player',true).gold - publicBefore,
      paid:privateBefore - s.chars[guildSponsor].wealth,issuer:law.issuer.kind,
      identity:linked.lawId === law.id && linked.contractId === law.grant.contractId && law.grant.contractId === 'guild_monopoly:law:' + law.id,
      noBonus:linked.enterpriseBonus === 0 && linked.taxBonus === 0,oneStore:oneStore,owned:s.player.enterprises.length};
  });
  expect(r).toEqual({pure:true,once:true,member:true,blocked:true,named:true,noPurchase:true,noCouncilBypass:true,money:18,paid:18,
    issuer:'ruler_grant',identity:true,noBonus:true,oneStore:true,owned:2});
  await roundTrip(page);
});

[false,true].forEach(function (ruler) {
  test('licensed acquisition quotes and settles the exact fee through ' + (ruler ? 'the unified ruler purse' : 'the original NPC treasury'), async function ({page},info) {
    await start(page,info,{ruler:ruler});
    const r = await page.evaluate(function (ruler) {
      const s = FB.state, law = guildEnact('london_guild_license',ruler ? 'outgoing' : 'incoming');
      s.chars[s.player.charId].career.guildRank = 'none';
      const q = FB.enterprisePurchaseStatus(s,'workshop_business','london',0), before = s.player.gold;
      const publicBefore = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId,true).gold;
      const e = FB.buyEnterprise(s,'workshop_business',0,q.industryQuote);
      if (!e) throw new Error('Licensed acquisition rejected: ' + JSON.stringify(q));
      const after = guildSnapshot(), duplicate = !FB.buyEnterprise(s,'workshop_business',0,q.industryQuote) && after === guildSnapshot();
      FB.industryLaws.validate(s);
      return {quoted:q.industryQuote.amount,paid:s.industryLaws.permits[0].amount,
        spent:before - s.player.gold,base:q.baseCost,
        received:FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId,true).gold - publicBefore,
        lawful:FB.industryLaws.operation(s,e).covered,duplicate:duplicate,receipts:s.industryLaws.permits.length};
    },ruler);
    expect(r).toEqual({quoted:3,paid:3,spent:r.base + (ruler ? 0 : 3),base:r.base,received:ruler ? -r.base : 3,
      lawful:true,duplicate:true,receipts:1});
    await roundTrip(page);
  });
});

test('living realm handover preserves the linked institution and paid receipts under its new realm key', async function ({page},info) {
  await start(page,info,{ruler:true});
  const r = await page.evaluate(function () {
    const s = FB.state, me = s.chars[s.player.charId], e = guildBusiness('workshop_business');
    const law = guildEnact('london_guild_license','outgoing'), receipt = JSON.stringify(law.grant), originalIssuer = law.issuer.holderCharId;
    s.turn = law.transitionEndTurn; me.career.guildRank = 'none';
    if (!FB.industryLaws.commitOperation(s,FB.industryLaws.quoteOperation(s,e,'pay',0))) throw new Error('No handover permit');
    const heir = FB.heirsOf(s)[0];
    if (!heir) throw new Error('No existing family heir for the handover');
    const money = s.player.gold, sponsorMoney = s.chars[guildSponsor].wealth, contractId = s.player.guildMonopolies.outgoing.contractId;
    const realm = FB.abdicatePlayerRealmToHeir(s,heir);
    if (!realm) throw new Error('Realm handover rejected');
    s.player.provs = []; FB.setPlayerTier(s,2,{attachLiege:false}); FB.changePlayerLiege(s,null,'handover_review');
    FB.guildMonopolyTick(s); FB.industryLaws.validate(s);
    return {rekey:law.issuer.realmId === realm.id && law.payeeRealmId === realm.id && s.industryLaws.permits[0].payeeRealmId === realm.id,
      original:law.issuer.holderCharId === originalIssuer,receipt:JSON.stringify(law.grant) === receipt,
      link:s.player.guildMonopolies.outgoing.lawId === law.id && s.player.guildMonopolies.outgoing.contractId === contractId,
      active:FB.industryLaws.lifecycle(s,law) === 'active',noRevocation:!FB.industryLaws.quoteRevokeGrant(s,law.id).ready,
      conserved:s.player.gold === money && s.chars[guildSponsor].wealth === sponsorMoney};
  });
  expect(r).toEqual({rekey:true,original:true,receipt:true,link:true,active:true,noRevocation:true,conserved:true});
  await roundTrip(page);
});

test('grant reviews reject stale money, authority, generations, terms and exemptions before changing any fact', async function ({page},info) {
  await start(page,info,{ruler:true});
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, id = 'london_guild_license';
    const quote = function () { return L.quoteGrant(s,id,'outgoing',guildSponsor,[]); };
    const rejected = function (q) { const before = guildSnapshot(); return !L.commitGrant(s,q) && before === guildSnapshot(); };
    const noFallback = FB.treasuryPublicAccountSnapshot(s,'player') === null;
    const samePurse = !L.quoteGrant(s,id,'outgoing',s.player.charId,[]).ready;
    const accounting = s.treasuryAccounting, gold = s.player.gold;
    delete s.treasuryAccounting;
    const missingAccount = FB.treasuryPublicAccountSnapshot(s,'player',true) === null &&
      !FB.treasuryCredit(s,'player',1,true) && s.player.gold === gold;
    s.treasuryAccounting = accounting;
    let q = quote(); s.chars[guildSponsor].wealth = 11;
    const funds = rejected(q) && !quote().ready; s.chars[guildSponsor].wealth = 100;
    q = quote(); s.holder.london = guildCourt.rid;
    const authority = rejected(q) && !quote().ready; s.holder.london = 'player';
    q = quote(); s.realms.player.ruler.generation++; s.realms.player.succession.rulerGeneration++;
    const generation = rejected(q);
    q = quote(); q.terms.fee++;
    const changedTerms = rejected(q);
    const named = !L.quoteGrant(s,id,'outgoing',guildSponsor,['not_owned']).ready;
    q = quote(); s.chars[guildSponsor].career.guildRank = 'none';
    const member = rejected(q); s.chars[guildSponsor].career.guildRank = 'guildmaster';
    const tech = FB.realmTechRecord(s,FB.techRealmId(s)), i = tech.completed.indexOf('guild_charters');
    tech.completed.splice(i,1); const research = !quote().ready;
    tech.completed.push('guild_charters');
    return {funds,authority,generation,changedTerms,named,member,research,noFallback,samePurse,missingAccount,empty:!s.industryLaws};
  });
  expect(r).toEqual({funds:true,authority:true,generation:true,changedTerms:true,named:true,member:true,research:true,noFallback:true,samePurse:true,missingAccount:true,empty:true});
});

test('licenses share permission payments and pause/resume; succession and guild loss retain the original paid term', async function ({page},info) {
  await start(page,info,{ruler:true});
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = guildBusiness('workshop_business'), law = guildEnact('london_guild_license','outgoing');
    s.turn = law.transitionEndTurn; s.chars[s.player.charId].career.guildRank = 'none';
    const initial = L.operation(s,e), q = L.quoteOperation(s,e,'pay',0), money = s.player.gold;
    const paid = !!L.commitOperation(s,q), recorded = s.industryLaws.permits.length === 1 && s.industryLaws.permits[0].amount === 3;
    const after = guildSnapshot(), once = !L.commitOperation(s,q) && after === guildSnapshot();
    const lawful = L.operation(s,e).operational;
    L.commitOperation(s,L.quoteOperation(s,e,'pause',0)); const paused = !L.operation(s,e).operational;
    L.commitOperation(s,L.quoteOperation(s,e,'resume',0)); const resumed = L.operation(s,e).operational;
    const revoke = L.quoteRevokeGrant(s,law.id), receipt = JSON.stringify(law.grant);
    s.realms.player.ruler.generation++; s.realms.player.succession.rulerGeneration++;
    const oldReview = !L.commitRevokeGrant(s,revoke), succession = L.lifecycle(s,law) === 'active';
    s.holder.london = guildCourt.rid; const conquest = L.lifecycle(s,law) === 'suspended';
    s.holder.london = 'player'; const recovered = L.lifecycle(s,law) === 'active';
    const ranks = L.guildRepresentatives(s,law.terms).map(function (id) { return [id,s.chars[id].career.guildRank]; });
    ranks.forEach(function (r) { s.chars[r[0]].career.guildRank = 'none'; });
    const dissolved = L.lifecycle(s,law) === 'suspended' && L.operation(s,e).operational;
    ranks.forEach(function (r) { s.chars[r[0]].career.guildRank = r[1]; });
    const reformed = L.lifecycle(s,law) === 'active';
    s.chars[guildSponsor].dead = true;
    s.chars[s.player.charId].career.guildRank = 'member';
    const sponsorDeath = L.lifecycle(s,law) === 'active';
    s.chars[guildSponsor].dead = false;
    const resources = {gold:s.player.gold,wealth:s.chars[guildSponsor].wealth};
    const fresh = L.quoteRevokeGrant(s,law.id), revoked = !!L.commitRevokeGrant(s,fresh), settled = guildSnapshot();
    const noRefund = resources.gold === s.player.gold && resources.wealth === s.chars[guildSponsor].wealth && receipt === JSON.stringify(law.grant);
    const noRepeat = !L.commitRevokeGrant(s,fresh) && settled === guildSnapshot();
    L.validate(s);
    return {fee:initial.amount,paid,recorded,once,lawful,paused,resumed,oldReview,succession,conquest,recovered,dissolved,reformed,sponsorDeath,
      revoked,noRefund,noRepeat,oneLaw:s.industryLaws.laws.length === 1,slot:s.player.guildMonopolies.outgoing,spent:money - s.player.gold};
  });
  expect(r).toEqual({fee:3,paid:true,recorded:true,once:true,lawful:true,paused:true,resumed:true,oldReview:true,succession:true,conquest:true,
    recovered:true,dissolved:true,reformed:true,sponsorDeath:true,revoked:true,noRefund:true,noRepeat:true,oneLaw:true,slot:null,spent:0});
  await roundTrip(page);
});

test('a guildmaster petitions the real ruler; current saves preserve exact linkage and reject corrupted receipts atomically', async function ({page},info) {
  await start(page,info);
  await page.evaluate(function () { guildBusiness('workshop_business'); guildEnact('london_guild_exclusive','incoming'); });
  await roundTrip(page);
  await page.evaluate(function () { FB.ui.showTab('network',{history:false}); });
  await expect(page.locator('#network-guild-law-review')).toBeVisible();
  await page.locator('#network-guild-law-review').click();
  await expect(page.locator('#gm-body')).toContainText('Guild payment received');
  await page.evaluate(function () { FB.ui.closeModal(); });
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, law = s.industryLaws.laws[0];
    const mutations = [function (c) { c.industryLaws.laws[0].grant.amount++; },
      function (c) { c.player.guildMonopolies.incoming.lawId = 'industry_law_missing'; },
      function (c) { delete c.player.guildMonopolies.incoming; },
      function (c) { c.industryLaws.laws[0].grant.exemptEnterpriseUids = ['unknown']; },
      function (c) { c.industryLaws.laws[0].issuer.kind = 'local_council'; }];
    const rejected = mutations.map(function (edit) {
      const before = guildSnapshot(), saved = JSON.parse(FB.save.serialize()); edit(saved.state);
      let failed = false; try { FB.save.restore(saved); } catch (e) { failed = /industry-law/.test(e.message); }
      return failed && before === guildSnapshot();
    });
    return {rejected,realm:law.issuer.realmId === guildCourt.rid,payer:law.grant.sponsorId === s.player.charId,
      request:s.player.cooldowns.petition_monopoly === law.startTurn,
      reviewOnly:!L.quoteMotion(s,law.definitionId).ready,paid:law.grant.amount,
      relocation:FB.capitalRelocationStatus(s,'york').incomingMonopoly === null};
  });
  expect(r).toEqual({rejected:[true,true,true,true,true],realm:true,payer:true,request:true,reviewOnly:true,paid:18,relocation:true});
});

test('ordinary JSON import varies trade, qualified households, license, relief and suspension without executable registration', async function ({page},info) {
  await start(page,info,{mod:true});
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = guildBusiness('press_business'), law = guildEnact('river_press_charter','incoming');
    s.turn = law.transitionEndTurn; s.chars[s.player.charId].career.guildRank = 'none';
    const license = L.operation(s,e), q = L.quoteOperation(s,e,'pay',0), funds = s.player.gold;
    const payeeBefore = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    const paid = !!L.commitOperation(s,q), transfer = funds - s.player.gold === 2 && FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold - payeeBefore === 2;
    s.player.provinceId = 'london'; const household = L.operation(s,e).laws[0].exempt;
    s.player.provinceId = 'york'; s.turn = s.industryLaws.permits[0].endTurn;
    const relief = L.quotePetition(s,e.uid,law.id,'exemption'), granted = L.commitPetition(s,relief);
    const exempt = granted.granted && L.operation(s,e).operational;
    const repeal = L.quotePetition(s,e.uid,law.id,'repeal'), result = L.commitPetition(s,repeal);
    L.validate(s);
    return {license:license.amount,paid,transfer,household,exempt,repealed:result.granted && law.repealedTurn === s.turn,
      issuer:law.repealer.kind,term:law.endTurn - law.startTurn,suspension:law.terms.offense.days,slot:s.player.guildMonopolies.incoming};
  });
  expect(r).toEqual({license:2,paid:true,transfer:true,household:true,exempt:true,repealed:true,issuer:'ruler_grant',term:180,suspension:15,slot:null});
  await roundTrip(page);
  const changed = await page.evaluate(function () {
    const before = guildSnapshot(), saved = JSON.parse(FB.save.serialize());
    saved.mods += '-changed'; let rejected = false;
    try { FB.save.restore(saved); } catch (e) { rejected = true; }
    return rejected && before === guildSnapshot();
  });
  expect(changed).toBe(true);
});

test('actual grantor death and succession retain the institution; relocation and expiry never repeat consideration', async function ({page},info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = guildBusiness('workshop_business'), law = guildEnact('london_guild_license','incoming');
    const oldIssuer = JSON.stringify(law.issuer), receipt = JSON.stringify(law.grant), gold = s.player.gold;
    const reviewed = L.quotePetition(s,e.uid,law.id,'exemption');
    const old = s.chars[guildCourt.id]; old.dead = true;
    if (!FB.advanceRealmSuccession(s,guildCourt.rid,{cause:'death'})) throw new Error('No ordinary grantor successor');
    const successor = FB.realmRulerCharacterSnapshot(s,guildCourt.rid), before = guildSnapshot();
    const stale = !L.commitPetition(s,reviewed) && before === guildSnapshot();
    FB.guildMonopolyTick(s);
    const continued = successor.id !== old.id && L.lifecycle(s,law) === 'active' &&
      JSON.stringify(law.issuer) === oldIssuer && JSON.stringify(law.grant) === receipt;
    s.player.provinceId = 'york'; FB.guildMonopolyTick(s);
    const relocation = !!FB.guildMonopolyActive(s,'incoming');
    s.turn = law.endTurn; FB.guildMonopolyTick(s);
    const expired = L.lifecycle(s,law) === 'expired' && s.player.guildMonopolies.incoming === null && L.operation(s,e).operational;
    L.validate(s);
    return {stale,continued,relocation,expired,noPayment:s.player.gold === gold,oneLaw:s.industryLaws.laws.length === 1};
  });
  expect(r).toEqual({stale:true,continued:true,relocation:true,expired:true,noPayment:true,oneLaw:true});
  await roundTrip(page);
});

test('unauthorized output uses the original court, custody and closure without taking the workshop', async function ({page},info) {
  await start(page,info);
  const r = await page.evaluate(function () {
    const s = FB.state, L = FB.industryLaws, e = guildBusiness('workshop_business'), law = guildEnact('london_guild_exclusive','incoming');
    s.turn = law.transitionEndTurn; s.chars[s.player.charId].career.guildRank = 'none';
    const property = JSON.stringify(s.player.enterprises), choice = L.quoteOperation(s,e,'violate',0);
    if (!L.commitOperation(s,choice)) throw new Error('No deliberate-operation choice: ' + JSON.stringify(choice));
    const noEarlyOffense = !s.industryLaws.violations;
    FB.marketSeason(s);
    const v = s.industryLaws.violations && s.industryLaws.violations[0];
    if (!v || !v.caseId) throw new Error('No actual-output complaint');
    const o = s.justice.offenses.filter(function (o) { return o.id === v.caseId; })[0];
    const noCustody = !FB.justicePunishmentProjection(s,guildCourt.id,s.player.charId,'fine',v.caseId).ready;
    function respond(custom) {
      const pending = s.justice.pending, ev = FB.eventById(pending.kind === 'arrest' ? 'justice_arrest' : 'justice_hearing');
      return FB.resolveEventOption(s,ev,ev.options.filter(function (option) { return option.effects.custom === custom; })[0],
        {justiceId:pending.id,studentId:pending.actorId});
    }
    const complaint = L.quoteComplaint(s,v.id);
    if (!L.answerComplaint(s,complaint) || !respond('justice_submit')) throw new Error('No ordinary custody');
    const gold = s.player.gold, publicBefore = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold;
    if (!respond('justice_pay')) throw new Error('No ordinary financial judgment');
    const money = gold - s.player.gold, publicPaid = FB.treasuryPublicAccountSnapshot(s,law.payeeRealmId).gold - publicBefore;
    const cases = s.justice.offenses.length; L.recordOperation(s,e,1); L.fileComplaint(s,v.id);
    const once = cases === s.justice.offenses.length && gold - s.player.gold === money;
    const closed = !L.operation(s,e).operational && !L.quoteOperation(s,e,'resume',0).ready;
    L.validate(s);
    return {noEarlyOffense,noCustody,material:v.evidence === 'material' && v.output > 0,source:o.sourceId === 'industry:' + v.id,
      money,publicPaid,once,closed,ownership:property === JSON.stringify(s.player.enterprises),judgment:v.judgment.closure};
  });
  expect(r).toEqual({noEarlyOffense:true,noCustody:true,material:true,source:true,money:8,publicPaid:8,once:true,closed:true,ownership:true,judgment:true});
  await roundTrip(page);
});

test('definition candidates are typed and pure; legacy financial grants gain no law or new restrictions', async function ({page},info) {
  await start(page,info);
  const r = await page.evaluate(function (mod) {
    const s = FB.state, before = guildSnapshot(), data = JSON.stringify(FBDATA);
    const edits = [function (d) { d.grant.payment = 0; }, function (d) { d.grant.payment = 10001; },
      function (d) { d.grant.profession = 'farmer'; }, function (d) { d.grant.extra = true; },
      function (d) { d.exemptions = []; }, function (d) { delete d.offense; },
      function (d) { d.voting = {}; }, function (d) { d.grant.profession = 'unknown'; },
      function (d) { d.exemptions = [null]; }, function (d) { d.fee = 0; },
      function (d) { d.grant.profession = ['craftsman']; }];
    const bad = edits.map(function (edit) { const c = JSON.parse(JSON.stringify(mod)); edit(c.industryLaws.river_press_charter); return FB.mods.validate(c).length > 0; });
    const pure = before === guildSnapshot() && data === JSON.stringify(FBDATA);
    const legacy = FB.guildMonopolyPetitionContext(s,{mode:'craft',goodId:'wares',originId:'london'});
    if (!legacy || !FB.receiveGuildMonopoly(s,legacy)) throw new Error('Legacy petition unavailable');
    const charter = FB.guildMonopolyActive(s,'incoming'), terms = JSON.stringify(charter);
    const e = guildBusiness('workshop_business'), lawful = FB.industryLaws.operation(s,e).operational;
    FB.ensureInstitutions(s);
    const legacyPrivilege = s.privileges.some(function (r) { return r.effectKind === 'guild_monopoly' && r.effectId === charter.contractId; });
    return {bad,pure,noLedger:!s.industryLaws,noLink:!Object.prototype.hasOwnProperty.call(charter,'lawId'),lawful,
      legacy:JSON.stringify(FB.guildMonopolyActive(s,'incoming')) === terms,review:FBDATA.techImpactReviews.features.enforceable_guild_grants.mode,
      relocation:!!FB.capitalRelocationStatus(s,'york').incomingMonopoly,legacyPrivilege:legacyPrivilege};
  },imported);
  expect(r).toEqual({bad:Array(11).fill(true),pure:true,noLedger:true,noLink:true,lawful:true,legacy:true,review:'hard',relocation:true,legacyPrivilege:true});
  await roundTrip(page);
});

test('ordinary grant entry discloses payment and exemptions; cancel and modal returns retain nonzero list position', async function ({page},info) {
  await start(page,info,{ruler:true});
  await page.setViewportSize({width:390,height:500});
  await page.evaluate(function () { guildBusiness('workshop_business'); FB.ui.showGuildMonopolyGrant(); });
  await expect(page.locator('[data-guild-law="london_guild_exclusive"]')).toBeVisible();
  const position = await page.evaluate(function () { const body = document.getElementById('gm-body'); body.scrollTop = 40; return body.scrollTop; });
  expect(position).toBeGreaterThan(0);
  const before = await page.evaluate(function () { return guildSnapshot(); });
  await page.locator('[data-guild-law="london_guild_exclusive"]').click();
  await page.locator('[data-guild-sponsor]').filter({hasText:'Review this representative'}).first().click();
  await expect(page.locator('#gm-body')).toContainText('No tax or profit bonus');
  await expect(page.locator('#gm-body')).toContainText('18');
  await expect(page.locator('[data-guild-exemption]')).toHaveCount(1);
  expect(await page.locator('[data-guild-exemption]').evaluate(function (input) { return input.parentElement.getBoundingClientRect().height; })).toBeGreaterThanOrEqual(44);
  await page.locator('[data-guild-exemption]').check();
  await page.locator('#guild-law-back').click();
  await expect(page.locator('[data-guild-sponsor]').first()).toBeVisible();
  await page.locator('#guild-sponsor-back').click();
  await expect(page.locator('[data-guild-law="london_guild_exclusive"]')).toBeVisible();
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(position);
  expect(await page.evaluate(function () { return guildSnapshot(); })).toBe(before);
});

test('revocation confirmation returns to refreshed records without refund, stale controls or lost scroll', async function ({page},info) {
  await start(page,info,{ruler:true});
  await page.setViewportSize({width:390,height:500});
  const before = await page.evaluate(function () {
    guildEnact('london_guild_exclusive','outgoing'); FB.ui.showGuildMonopolyGrant();
    return {gold:FB.state.player.gold,wealth:FB.state.chars[guildSponsor].wealth,turn:FB.state.turn};
  });
  const button = page.locator('[data-guild-revoke]');
  await button.scrollIntoViewIfNeeded();
  const position = await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; });
  expect(position).toBeGreaterThan(0);
  await button.click();
  await page.locator('#guild-law-revoke-back').click();
  expect(await page.locator('#gm-body').evaluate(function (body) { return body.scrollTop; })).toBe(position);
  await button.click();
  await page.locator('#guild-law-revoke-confirm').click();
  await expect(page.locator('#gm-body')).toContainText('Revoked');
  await expect(page.locator('#guild-law-revoke-confirm')).toHaveCount(0);
  const after = await page.locator('#gm-body').evaluate(function (body) { return {scroll:body.scrollTop,max:body.scrollHeight - body.clientHeight}; });
  expect(after.scroll).toBe(Math.min(position,after.max));
  expect(await page.evaluate(function () {
    return {gold:FB.state.player.gold,wealth:FB.state.chars[guildSponsor].wealth,turn:FB.state.turn};
  })).toEqual(before);
});
