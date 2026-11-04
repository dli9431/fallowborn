'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const fs = require('fs');
const path = require('path');
const { test,expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { openCrazyGame } = require('../support/game/crazygames-title');
const { mockCrazyGames } = require('../support/crazygames');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/map_data.js','data/ambitions.js','data/traits.js','data/political_institutions.js','data/technology.js',
  'js/ai_decisions.js','js/agency.js','js/balance.js','js/governments.js','js/government_ai.js',
  'js/government_selection.js','js/government_aristocracy.js','js/authority.js','js/model.js','js/world.js',
  'js/building_profiles.js','js/fortifications.js','js/lordships.js','js/technology.js','js/armies.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/util.js','js/intrigue.js','data/intrigue.js','js/crazygames.js','data/distribution_crazygames.js',
  'js/holywar.js','js/religion.js','js/papacy.js','js/systems.js','data/systems.js','data/eras.js',
  'js/messages.js',
  'docs/examples/ai-decisions-conservative.json','docs/examples/ai-decisions-expansion.json'
]);

async function importExample(page,file) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../../../docs/examples',file));
  await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await expect.poll(function () { return page.evaluate(function () { return FB.game.bootReady && FB.mods.count() === 1; }); }).toBe(true);
}

const examples = [
  {file:'ai-decisions-conservative.json',form:'cautious_court',margin:1.6,role:'worship',chance:0.01,investment:'careful_investment',research:'stewardship_research'},
  {file:'ai-decisions-expansion.json',form:'expansive_court',margin:0.9,role:'scholarship',chance:0.04,investment:'learning_investment',research:'innovating_research'}
];

// Save compaction restores set membership and omitted defaults, not object key
// insertion order or the order of the completed/exposed technology sets.
async function researchBoundary(page, rid) {
  return page.evaluate(function (rid) {
    FB.techSeason(FB.state,false);
    const record = JSON.parse(JSON.stringify(FB.realmTechRecord(FB.state,rid)));
    record.completed.sort(); record.exposed.sort();
    return {record:record,rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  },rid);
}
for (const example of examples) {
  test(example.file+' composes several live families and a scoped government through Mods',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await importExample(page,example.file);
    await startDeterministicGame(page);
    const out = await page.evaluate(function (form) {
      const s = FB.state,P = FB.aiDecisions;
      const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        FB.realmRulerCharacterSnapshot(s,id) && FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial'; });
      const c = FB.realmRulerCharacterSnapshot(s,rid); c.traits = ['honest']; delete s.realms[rid].ruler.personality;
      FB.ensureAgency(s);
      s.agency.rulerAims[rid] = {id:'amass_wealth',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
      const unscoped = P.parameters(s,rid,'tactics').engagementMargin;
      const changed = FB.authoritySetGovernment(s,rid,form);
      const entries = ['scholarship','worship'].map(function (role) {
        const id = Object.keys(FBDATA.buildings).find(function (id) { return FBDATA.buildings[id].role === role && typeof FBDATA.buildings[id].aiBuildOrder === 'number'; });
        return {id:id,order:FBDATA.buildings[id].aiBuildOrder,profileId:null};
      });
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      const investment = P.buildingPriorities(s,rid,s.realms[rid].capital,entries);
      return {changed:changed,unscoped:unscoped,margin:P.parameters(s,rid,'tactics').engagementMargin,
        chance:FB.governments.call(s,rid,'ai','goals',{}).warChance,role:FB.buildingRole(investment[0].id),
        investment:P.resolve(s,rid,'investment').id,research:P.resolve(s,rid,'research').id,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },example.form);
    expect(out).toEqual({changed:true,unscoped:1.1,margin:example.margin,chance:example.chance,role:example.role,
      investment:example.investment,research:example.research,pure:true});
  });

  test(example.file+' restores spent resources and replays one research boundary exactly',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await importExample(page,example.file);
    await startDeterministicGame(page);
    const checkpoint = await page.evaluate(function (form) {
      let s = FB.state;
      const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        s.realms[id].treasury && FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial'; });
      if (!FB.authoritySetGovernment(s,rid,form)) throw new Error('Government assignment failed');
      s.player.gold = 1; s.realms[rid].treasury.gold = 7;
      FB.realmTechRecord(s,rid).active = [];
      const saved = JSON.parse(FB.save.serialize()),signature = FB.mods.sig();
      const rng = FB.getRngState(),uid = FB.getUidCounter();
      return {rid:rid,saved:saved,signature:signature,rng:rng >>> 0,uid:uid};
    },example.form);
    const first = await researchBoundary(page,checkpoint.rid);
    const retained = await page.evaluate(function (checkpoint) {
      const saved = checkpoint.saved,rid = checkpoint.rid;
      FB.save.restore(saved); const s = FB.state;
      const retained = {gold:s.player.gold,treasury:s.realms[rid].treasury.gold,rng:checkpoint.rng === (FB.getRngState() >>> 0),
        uid:checkpoint.uid === FB.getUidCounter(),signature:checkpoint.signature === FB.mods.sig(),otherWorld:FB.save.otherWorld(saved),
        margin:FB.aiDecisions.parameters(s,rid,'tactics').engagementMargin,
        noPolicyRecord:!JSON.stringify(saved.state).includes('aiDecisionPolicies')};
      return retained;
    },checkpoint);
    expect(retained).toEqual({gold:1,treasury:7,rng:true,uid:true,signature:true,otherWorld:false,
      margin:example.margin,noPolicyRecord:true});
    expect(await researchBoundary(page,checkpoint.rid)).toEqual(first);
  });
}

test('current traits and aims follow real ruler succession without cached preferences crossing states',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await importExample(page,'ai-decisions-expansion.json');
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
      FB.realmRulerCharacterSnapshot(s,id) && Object.keys(s.realms[id].succession.members).length > 2 &&
      FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial'; });
    const old = FB.realmRulerCharacterSnapshot(s,rid),generation = FB.realmRulerGeneration(s,rid);
    old.traits = ['ambitious']; delete s.realms[rid].ruler.personality;
    FB.ensureAgency(s);
    s.agency.rulerAims[rid] = {id:'expand_realm',generation:generation,sinceYear:s.date.year};
    const ambitious = P.parameters(s,rid,'war').chance;
    old.traits = ['honest'];
    const changedTrait = P.parameters(s,rid,'war').chance;
    s.agency.rulerAims[rid].id = 'amass_wealth';
    const changedAim = P.parameters(s,rid,'war').chance;
    const other = JSON.parse(JSON.stringify(s));
    FB.realmRulerCharacterSnapshot(other,rid).traits = ['ambitious'];
    const isolated = P.parameters(other,rid,'war').chance === 0.06 && P.parameters(s,rid,'war').chance === 0.04;
    FB.killChar(s,old);
    const current = FB.realmRulerCharacterSnapshot(s,rid);
    if (!current || current.id === old.id) throw new Error('No royal successor was installed');
    current.traits = []; delete s.realms[rid].ruler.personality;
    s.agency.rulerAims[rid] = {id:'expand_realm',generation:generation,sinceYear:s.date.year};
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const inputs = P.inputs(s,rid),chance = P.parameters(s,rid,'war').chance;
    return {ambitious:ambitious,changedTrait:changedTrait,changedAim:changedAim,isolated:isolated,
      successor:FB.realmRulerGeneration(s,rid) > generation,staleAimIgnored:inputs.aim !== 'expand_realm',chance:chance,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toMatchObject({changedTrait:0.05,changedAim:0.04,isolated:true,successor:true,staleAimIgnored:true,chance:0.04,pure:true});
  expect(out.ambitious).toBeCloseTo(0.075);
});

test('weighted retry adapters exclude zero-weight fallbacks and draw only for selectable choices',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions,rid = s.owner[s.player.provinceId],policies = {},balance = {};
    ['investment','government','tactics'].forEach(function (family) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies['ordinary_'+family]));
      d.mode = 'weighted'; d.weights = family === 'tactics' ? {objective:1} : {score:1};
      policies['zero_'+family] = d; balance[P.protocol()[family].key] = 'zero_'+family;
    });
    FB.mods.apply({aiDecisionPolicies:policies,balance:balance});
    const bid = Object.keys(FBDATA.buildings).find(function (id) { return typeof FBDATA.buildings[id].aiBuildOrder === 'number'; });
    const entries = [{id:bid,order:0,profileId:null}];
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const empty = P.orderCandidates(s,rid,'tactics',[{id:'empty',eligible:true,facts:{objective:0}}]);
    const buildings = P.buildingPriorities(s,rid,s.player.provinceId,entries);
    const governments = P.governmentCandidates(s,rid,['empty'],function () { return {score:0}; });
    const noDraw = rng === FB.getRngState();
    const rows = [{id:'zero',eligible:true,facts:{objective:0}},{id:'positive',eligible:true,facts:{objective:1}},
      {id:'blocked',eligible:false,facts:{objective:100}}];
    const order = P.orderCandidates(s,rid,'tactics',rows),after = FB.getRngState();
    FB.setRngState(rng); FB.rng(); const oneDraw = after === FB.getRngState();
    return {empty:empty,buildings:buildings,governments:governments,noDraw:noDraw,order:order,oneDraw:oneDraw,
      pure:before === JSON.stringify(s) && uid === FB.getUidCounter()};
  });
  expect(out).toEqual({empty:[],buildings:[],governments:[],noDraw:true,order:['positive'],oneDraw:true,pure:true});
});

test('a private baron skips a zero-total investment choice without spending or drawing',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions,pid = s.player.provinceId,me = s.chars[s.player.charId];
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_investment));
    d.mode = 'weighted'; d.weights = {cost:0}; d.parameters.baronPreference = 1;
    FB.mods.apply({aiDecisionPolicies:{baron_zero:d},balance:{aiInvestmentPolicy:'baron_zero'},
      buildings:{policy_baron_work:{name:'Local work',role:'industry',cost:5,tax:2,upkeep:0,aiBuildOrder:0}}});
    s.dev[pid] = 8; FB.rememberSettlementSites(s,pid);
    const baron = FB.makeCharacter(s,{name:'Local Patron',station:3,born:s.date.year-30,
      culture:me.culture,religion:me.religion,traits:[]});
    baron.homeProvinceId = pid;
    if (!FB.assignSettlementLordship(s,pid,1,baron.id)) throw new Error('Baron grant failed');
    s.buildings[pid] = []; FB.invalidateBuildingIndex(s,pid);
    const period = Math.floor(s.turn/90)+1;
    FB.settleBaronyAccounts(s,period);
    const root = s.settlementLordships,account = root.accounts[baron.id];
    account.gold = 10000; root.accounts = {}; root.accounts[baron.id] = account;
    root.developmentCursor = 0; delete root.lastDevelopmentSeason;
    const capacity = FB.settlementCapacityProjection,rank = P.buildingPriorities;
    let candidates = 0,empty = false;
    // Keep unrelated automatic grants out of this construction boundary.
    FB.settlementCapacityProjection = function () { return Object.assign({},capacity.apply(FB,arguments),{over:0}); };
    P.buildingPriorities = function (state,rid,county,entries) {
      const result = rank.apply(P,arguments);
      candidates += entries.length; empty = result.length === 0; return result;
    };
    const buildings = JSON.stringify(s.buildings),rng = FB.getRngState(),uid = FB.getUidCounter();
    try {
      const result = FB.settlementLordshipSeason(s,period);
      return {result:result,candidates:candidates > 0,empty:empty,gold:account.gold,
        buildings:buildings === JSON.stringify(s.buildings),rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
    } finally { FB.settlementCapacityProjection = capacity; P.buildingPriorities = rank; }
  });
  expect(out).toEqual({result:true,candidates:true,empty:true,gold:10000,buildings:true,rng:true,uid:true});
});

test('vassal expansion contacts count its territory and exclude sibling counties',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && s.realms[id].liege; });
    const top = FB.topRealm(s,rid);
    const target = Object.keys(FB.world.adj).find(function (pid) { return Object.keys(FB.world.adj[pid]).length >= 3; });
    const neighbors = Object.keys(FB.world.adj[target]),territory = neighbors.slice(0,2);
    neighbors.forEach(function (pid) { s.owner[pid] = top; s.holder[pid] = top; });
    territory.forEach(function (pid) { s.holder[pid] = rid; });
    FB.invalidateRealmCache();
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const first = FB.aiExpansionFacts(s,rid,[target],FB.realmTerritory(s,rid))[target].contacts;
    const sovereign = FB.aiExpansionFacts(s,top,[target],FB.realmTerritory(s,top))[target].contacts;
    const pure = before === JSON.stringify(s);
    s.holder[territory[1]] = top; FB.invalidateRealmCache();
    const next = FB.aiExpansionFacts(s,rid,[target],FB.realmTerritory(s,rid))[target].contacts;
    return {first:first,next:next,sovereign:sovereign,expectedSovereign:neighbors.length,pure:pure,
      rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
  });
  expect(out).toMatchObject({first:2,next:1,pure:true,rng:true,uid:true});
  expect(out.sovereign).toBe(out.expectedSovereign);
});

test('partial aim ordering preserves omitted preferences and resolves equal weights',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmRulerCharacterSnapshot(s,id); });
    const person = FB.realmRulerCharacterSnapshot(s,rid);
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_diplomacy));
    d.aimOrder = ['amass_wealth'];
    FB.mods.apply({aiDecisionPolicies:{partial_aims:d},balance:{aiDiplomacyPolicy:'partial_aims'},
      traitMechanics:{greedy:Object.assign({},FBDATA.traitMechanics.greedy,{rulerAims:{amass_wealth:20}})},
      agencyRules:Object.assign({},FBDATA.agencyRules,{secureFamilySize:0,marriageAimAge:16})});
    FB.ensureAgency(s); delete s.agency.rulerAims[rid];
    person.traits = ['ambitious'];
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const omitted = FB.rulerAimSnapshot(s,rid).id,pure = before === JSON.stringify(s);
    person.traits = ['ambitious','greedy'];
    const tie = FB.rulerAimSnapshot(s,rid).id;
    return {omitted:omitted,tie:tie,pure:pure,rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
  });
  expect(out).toEqual({omitted:'expand_realm',tie:'amass_wealth',pure:true,rng:true,uid:true});
});

test('a zero-weight government selection leaves the lawful vacancy and funds intact',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,S = FB.governmentSelection;
    const rid = Object.keys(s.realms).find(function (id) {
      const r = s.realms[id],t = r.succession;
      return id !== 'player' && r.alive && !r.liege && t &&
        FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial' &&
        Object.keys(t.members).some(function (key) { const m = t.members[key]; return key !== t.rulerMemberId && m.alive !== false && m.role !== 'consort' && s.date.year-m.born >= 16; });
    });
    FB.authoritySetGovernment(s,rid,'lineage_kingship'); S.initialize(s,rid);
    const actor = {kind:'realm',id:rid},opened = S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_government)); d.mode = 'weighted'; d.weights = {score:-1};
    FB.mods.apply({aiDecisionPolicies:{refusing_candidates:d},balance:{aiGovernmentPolicy:'refusing_candidates'}});
    const candidates = S.candidates(s,rid).length,before = JSON.stringify(s.realms[rid].treasury),rng = FB.getRngState();
    const result = S.ai(s,rid),row = S.state(s,rid);
    return {opened:opened,hasCandidates:candidates > 0,result:result,status:row.vacancy.status,
      noVotes:Object.keys(row.vacancy.support).length === 0,period:row.lastPeriod === Math.floor(s.turn/90),
      funds:before === JSON.stringify(s.realms[rid].treasury),rng:rng === FB.getRngState()};
  });
  expect(out).toEqual({opened:true,hasCandidates:true,result:false,status:'selecting',noVotes:true,period:true,funds:true,rng:true});
});

test('zero-weight tactical counties never fall back to an otherwise pursuable enemy',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,ids = Object.keys(s.realms).filter(function (id) { return id !== 'player' && s.realms[id].alive; });
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_tactics)); d.mode = 'weighted'; d.weights = {objective:1};
    FB.mods.apply({aiDecisionPolicies:{no_pursuit:d},balance:{aiTacticsPolicy:'no_pursuit'}});
    const prior = s.armies,hostile = FB.armiesHostile,canPursue = FB.armyCanPursue;
    const a = {id:'policy_primary',realm:ids[0],at:s.player.provinceId,men:1000,units:{levy:1000},supply:100};
    s.armies = [a,{id:'policy_enemy',realm:ids[1],at:a.at,men:1,units:{levy:1},supply:100}];
    let engagements = 0;
    FB.armiesHostile = function (state,x,y) { return x.realm !== y.realm; };
    FB.armyCanPursue = function () { engagements++; return true; };
    const rng = FB.getRngState();
    try { return {goal:FB.armyPursuitGoal(s,a),engagements:engagements,rng:rng === FB.getRngState()}; }
    finally { s.armies = prior; FB.armiesHostile = hostile; FB.armyCanPursue = canPursue; }
  });
  expect(out).toEqual({goal:null,engagements:0,rng:true});
});

test('investment ordering reads real quotes and changing frontier ownership without grants',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions,pid = s.player.provinceId,rid = s.owner[pid];
    const other = Object.keys(FB.world.adj[pid])[0];
    const bid = Object.keys(FBDATA.buildings).find(function (id) { return typeof FBDATA.buildings[id].aiBuildOrder === 'number'; });
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_investment));
    d.mode = 'ordered'; d.order = [{metric:'cost',direction:'asc'}];
    FB.mods.apply({aiDecisionPolicies:{quoted_investment:d},balance:{aiInvestmentPolicy:'quoted_investment'}});
    const quote = FB.buildCost,report = P.report;
    let quotes = 0,frontier = null;
    FB.buildCost = function (state,county) { quotes++; return county === pid ? 50 : 5; };
    const entries = [{id:bid,order:1,pid:pid},{id:bid,order:1,pid:other}];
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    let first;
    try { first = P.buildingPriorities(s,rid,pid,entries)[0].pid; }
    finally { FB.buildCost = quote; }
    const quotedPure = before === JSON.stringify(s);
    d.order = [{metric:'frontier',direction:'desc'}];
    FB.mods.apply({aiDecisionPolicies:{quoted_investment:d}});
    const top = FB.topRealm(s,rid);
    Object.keys(FB.world.adj[pid]).forEach(function (id) { s.owner[id] = top; });
    P.report = function (policy,candidates) {
      // The parameter-only projection has no county facts to observe.
      if (!candidates.length) return report.apply(P,arguments);
      if (policy.definition.family === 'investment') frontier = candidates[0].facts.frontier;
      return report.apply(P,arguments);
    };
    let interior,edge,pure;
    try {
      P.buildingPriorities(s,rid,pid,[entries[0]]); interior = frontier;
      s.owner[other] = Object.keys(s.realms).find(function (id) { return id !== top && id !== 'player' && s.realms[id].alive; });
      const staged = JSON.stringify(s);
      P.buildingPriorities(s,rid,pid,[entries[0]]); edge = frontier; pure = staged === JSON.stringify(s);
    } finally { P.report = report; }
    return {cheap:first === other,quotes:quotes,quotedPure:quotedPure,interior:interior,edge:edge,pure:pure,
      rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
  });
  expect(out).toEqual({cheap:true,quotes:2,quotedPure:true,interior:0,edge:1,pure:true,rng:true,uid:true});
});

test('zero-weight intrigue actors do not enter target selection',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions;
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_intrigue));
    d.mode = 'weighted'; d.weights = {score:-1}; d.parameters.chanceRate = 1; d.parameters.maximumChance = 1;
    FB.mods.apply({aiDecisionPolicies:{no_schemers:d},balance:{aiIntriguePolicy:'no_schemers'}});
    Object.keys(s.realms).forEach(function (rid) { const c = FB.realmRulerCharacterSnapshot(s,rid); if (c) c.traits = ['ambitious']; });
    const intrigue = FB.ensureIntrigue(s),before = intrigue.aiSchemes.length;
    const rank = P.orderCandidates,targets = FB.intrigueTargetOptions,chance = FB.chance;
    let actors = 0,targetCalls = 0;
    P.orderCandidates = function (state,rid,family,candidates) { if (family === 'intrigue' && rid === null) actors += candidates.length; return rank.apply(P,arguments); };
    FB.intrigueTargetOptions = function () { targetCalls++; return targets.apply(FB,arguments); };
    FB.chance = function () { return true; };
    try { FB.intrigueAgencyYearly(s); return {actors:actors > 0,targetCalls:targetCalls,unchanged:before === intrigue.aiSchemes.length}; }
    finally { P.orderCandidates = rank; FB.intrigueTargetOptions = targets; FB.chance = chance; }
  });
  expect(out).toEqual({actors:true,targetCalls:0,unchanged:true});
});

test('unused war ranking and unsafe research adjustment subsets reject before publication',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const out = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA),state = JSON.stringify(FB.state),rng = FB.getRngState(),uid = FB.getUidCounter();
    const war = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war)); war.mode = 'weighted'; war.bias = 1;
    const research = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_research));
    research.parameters.horizonFloor = 1; research.parameters.horizonCap = 2;
    research.adjustments = [{kind:'trait',id:'content',multiply:{horizonFloor:4}},
      {kind:'trait',id:'ambitious',multiply:{horizonCap:4}}];
    const faults = [war,research].map(function (d) {
      try { FB.mods.apply({aiDecisionPolicies:{unsafe:d}}); return false; } catch (error) { return true; }
    });
    research.adjustments = [{kind:'aim',id:'expand_realm',multiply:{horizonFloor:2}},
      {kind:'aim',id:'amass_wealth',multiply:{horizonFloor:2}}];
    const exclusiveAimsAllowed = !FB.mods.validate({aiDecisionPolicies:{safe_research:research}}).length;
    return {faults:faults,exclusiveAimsAllowed:exclusiveAimsAllowed,pure:before === JSON.stringify(FBDATA) &&
      state === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toEqual({faults:[true,true],exclusiveAimsAllowed:true,pure:true});
});

test('combined imported preference edits invalidate matching saves even under the same mod name',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await importExample(page,'ai-decisions-conservative.json');
  await startDeterministicGame(page);
  const mod = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/examples/ai-decisions-conservative.json'),'utf8'));
  const out = await page.evaluate(function (source) {
    const saved = JSON.parse(FB.save.serialize()),signature = FB.mods.sig();
    source.aiDecisionPolicies.careful_investment.buildingRoleWeights.worship = 99;
    FB.mods.apply(source);
    return {changed:signature !== FB.mods.sig(),refused:FB.save.otherWorld(saved)};
  },mod);
  expect(out).toEqual({changed:true,refused:true});
});

for (const distribution of ['standard','crazygames']) {
  test(distribution+' retains neutral live choices and seeded research replay',async function ({page},testInfo) {
    if (distribution === 'crazygames') {
      await mockCrazyGames(page);
      await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
      await openCrazyGame(page,testInfo);
    } else await openGame(page,testInfo);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state,P = FB.aiDecisions;
      const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmRulerCharacterSnapshot(s,id); });
      FB.realmRulerCharacterSnapshot(s,rid).traits = [];
      delete s.realms[rid].ruler.personality;
      const before = JSON.stringify(s),rng = FB.getRngState();
      const goals = FB.governments.strategy('ai','realm_decisions').goals(s,rid,{});
      // This case exercises the retained neutral baseline; strategic defaults have dedicated coverage.
      FBDATA.balance.aiExpansionPolicy = 'ordinary_expansion';
      const order = P.orderCandidates(s,rid,'expansion',[{id:'z',eligible:true,facts:{aggression:1}},
        {id:'b',eligible:true,facts:{aggression:0}},{id:'a',eligible:true,facts:{aggression:0}}]);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const saved = JSON.parse(FB.save.serialize());
      return {rid:rid,saved:saved,facts:{goals:goals,order:order,pure:pure,
        noMods:FB.mods.count() === 0,margin:P.parameters(FB.state,rid,'tactics').engagementMargin}};
    });
    expect(out.facts).toEqual({goals:{warChance:0.025,allianceChance:0.08},order:['a','b','z'],pure:true,noMods:true,margin:1.1});
    const first = await researchBoundary(page,out.rid);
    await page.evaluate(function (saved) { FB.save.restore(saved); },out.saved);
    expect(await researchBoundary(page,out.rid)).toEqual(first);
  });
}

// These are local staged boundaries over a real current ruler, not a second
// character/trait fixture shared with unrelated journeys.
async function stageRulerChannels(page) {
  return page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).sort().find(function (id) {
      const r = s.realms[id];
      return id !== 'player' && r.alive && !r.liege && FB.realmRulerCharacterSnapshot(s,id) &&
        Object.keys(r.succession.members).length > 2 && FB.governments.forRealm(s,id).id === 'territorial';
    });
    if (!rid) throw new Error('Channel acceptance needs a territorial ruler with a successor');
    FB.ensureAgency(s);
    FB.realmTechRecord(s,rid);
    const c = FB.realmRulerCharacterSnapshot(s,rid);
    c.traits.slice().forEach(function (id) { FB.removeTrait(c,id); });
    FB.realmRulerCharacter(s,rid);
    delete s.realms[rid].ruler.personality;
    const tech = Object.keys(FBDATA.tech).find(function (id) {
      return FBDATA.tech[id].domain === 'warfare' && FB.techAIScore(s,id,rid) > 0;
    });
    if (!tech) throw new Error('Channel acceptance needs a prerequisite-eligible warfare innovation');
    const target = FBDATA.rulerFaithTargets.find(function (id) { return id !== FB.realmReligionId(s,rid) && FB.faithAvailable(id,s,'ruler'); });
    if (!target) throw new Error('Channel acceptance needs a declared conversion target');
    FB.rulerFaithConversionEvaluation(s,rid,target);
    return {rid:rid,tech:tech,target:target,neutralResearch:FB.techAIScore(s,tech,rid)};
  });
}

async function setRulerChannels(page,ids,traits,aim) {
  await page.evaluate(function (args) {
    const s = FB.state,c = FB.realmRulerCharacterSnapshot(s,args.ids.rid);
    c.traits.slice().forEach(function (id) { FB.removeTrait(c,id); });
    args.traits.forEach(function (id) { if (!FB.addTrait(c,id,s)) throw new Error('Cannot add declared trait '+id); });
    // Synchronization is an existing explicit owner. Pure policy reads below
    // must neither synchronize a summary nor materialize another character.
    FB.realmRulerCharacter(s,args.ids.rid);
    s.agency.rulerAims[args.ids.rid] = {id:args.aim,generation:FB.realmRulerGeneration(s,args.ids.rid),sinceYear:s.date.year};
  },{ids:ids,traits:traits,aim:aim});
}

async function rulerChannelSnapshot(page,ids) {
  return page.evaluate(function (ids) {
    const s = FB.state,P = FB.aiDecisions,rid = ids.rid;
    const before = JSON.stringify(s),data = JSON.stringify(FBDATA),rng = FB.getRngState(),uid = FB.getUidCounter();
    const inputs = P.inputs(s,rid),reports = {};
    Object.keys(P.protocol()).forEach(function (family) { reports[family] = P.report(P.resolve(s,rid,family),[],inputs); });
    const religion = FB.rulerFaithConversionEvaluation(s,rid,ids.target);
    const c = FB.realmRulerCharacterSnapshot(s,rid);
    return {inputs:inputs,war:FB.governments.call(s,rid,'ai','goals',{}).warChance,
      strength:reports.war.parameters.minimumStrengthRatio,tactics:reports.tactics.parameters.engagementMargin,
      investment:reports.investment.investment,investmentAdjustments:reports.investment.adjustments,
      research:FB.techAIScore(s,ids.tech,rid),religionScore:religion.score,conversionAllowed:religion.allowed,
      participation:FB.traitMechanic(s.realms[rid].ruler,'holyWarParticipation'),
      intrigue:reports.intrigue.parameters,schemes:reports.intrigue.definition.schemeOrder || FB.traitSchemeOrder(c),
      holyWeight:reports.religion.parameters.targetHolyWeight,
      policies:Object.keys(reports).map(function (family) { return reports[family].policyId; }),
      pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },ids);
}

test('contrasting built-in rulers retain connected research, intrigue, faith and family aims',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const ids = await stageRulerChannels(page);
  await setRulerChannels(page,ids,['ambitious','brave'],'expand_realm');
  const bold = await rulerChannelSnapshot(page,ids);
  await setRulerChannels(page,ids,['zealous','patient','craven'],'defend_faith');
  const guarded = await rulerChannelSnapshot(page,ids);
  expect(bold).toMatchObject({inputs:{traits:['ambitious','brave'],aim:'expand_realm'},participation:0,pure:true,
    investment:{buildingRoleWeights:{garrison:24,training:24},benefitWeights:{levy:16,retinue:16}}});
  expect(bold.war).toBeCloseTo(0.0375);
  expect(bold.tactics).toBeCloseTo(0.99);
  expect(bold.strength).toBeCloseTo(1.08);
  expect(bold.research/ids.neutralResearch).toBeCloseTo(1.4);
  expect(guarded).toMatchObject({inputs:{traits:['zealous','patient','craven'],aim:'defend_faith'},participation:200,pure:true,
    investment:{buildingRoleWeights:{worship:24,stronghold:24,fortification:24},benefitWeights:{piety:16,communityFaithPressure:8,garrison:0.5}}});
  expect(guarded.war).toBeCloseTo(0.01875);
  expect(guarded.tactics).toBeCloseTo(1.32);
  expect(guarded.research).toBeCloseTo(ids.neutralResearch);
  expect(guarded.religionScore).toBe(bold.religionScore-20);

  const intrigue = await page.evaluate(function (ids) {
    const base = JSON.parse(JSON.stringify(FB.state));
    // Select a refusing seed, preserving the real chance algorithm and its
    // draw. Cooldowns isolate one ruler without changing candidate rules.
    let seed = null,afterDraw = null;
    for (let i=1;i<=128 && seed === null;i++) {
      FB.setRngState(i);
      if (FB.rng() > 0.95) { seed = i; afterDraw = FB.getRngState(); }
    }
    if (seed === null) throw new Error('No bounded refusing seed');
    function run(traits,aim) {
      const s = JSON.parse(JSON.stringify(base)),record = FB.ensureIntrigue(s);
      record.aiSchemes = []; record.startsThisYear = 0; record.startYear = s.date.year;
      Object.keys(s.realms).forEach(function (rid) {
        const c = FB.realmRulerCharacterSnapshot(s,rid);
        if (c) record.cooldowns[c.id] = s.date.year+1;
      });
      const c = FB.realmRulerCharacterSnapshot(s,ids.rid);
      c.traits = traits; delete record.cooldowns[c.id];
      s.agency.rulerAims[ids.rid].id = aim;
      FB.setRngState(seed); FB.intrigueAgencyYearly(s);
      return {rng:FB.getRngState(),schemes:record.aiSchemes.length};
    }
    return {bold:run(['ambitious','brave'],'expand_realm'),guarded:run(['zealous','patient','craven'],'defend_faith'),seed:seed,afterDraw:afterDraw};
  },ids);
  expect(intrigue.bold).toEqual({rng:intrigue.afterDraw,schemes:0});
  expect(intrigue.guarded).toEqual({rng:intrigue.seed,schemes:0});
});

for (const example of examples) {
  test(example.file+' composes all nine families with current traits and durable aims',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await importExample(page,example.file);
    await startDeterministicGame(page);
    const ids = await stageRulerChannels(page),calm = example.file.includes('conservative');
    await setRulerChannels(page,ids,['zealous','patient','craven'],'defend_faith');
    await page.evaluate(function (args) {
      if (!FB.authoritySetGovernment(FB.state,args.rid,args.form)) throw new Error('Cannot select imported court');
    },{rid:ids.rid,form:example.form});
    const current = await rulerChannelSnapshot(page,ids);
    expect(new Set(current.policies).size).toBe(9);
    expect(current.policies).toContain(calm ? 'restrained_intrigue' : 'opportunistic_intrigue');
    expect(current.policies).toContain(calm ? 'observant_religion' : 'dynastic_religion');
    expect(current.policies).toContain(calm ? 'conciliatory_diplomacy' : 'assertive_diplomacy');
    expect(current.schemes).toEqual(calm ? ['blackmail','sabotage'] : ['sabotage','blackmail']);
    expect(current.intrigue.chanceRate).toBe(calm ? 0.1 : 0.4);
    expect(current.holyWeight).toBe(calm ? 3 : 1.5);
    expect(current.tactics).toBeCloseTo(example.margin*1.2);
    expect(current.research).toBeCloseTo(ids.neutralResearch);
    expect(current.investment.benefitWeights).toMatchObject(calm ? {piety:16,communityFaithPressure:8} : {});
    expect(current.investment.buildingRoleWeights[example.role]).toBe(calm ? 100 : 76);
    expect(current.pure).toBe(true);
    const changed = await page.evaluate(function (rid) {
      const s = FB.state,c = FB.realmRulerCharacterSnapshot(s,rid);
      s.realms[rid].ruler.personality = 'bellicose';
      const legacy = FB.governments.call(s,rid,'ai','goals',{}).warChance;
      delete s.realms[rid].ruler.personality;
      FB.removeTrait(c,'zealous'); FB.addTrait(c,'literate',s);
      FB.realmRulerCharacter(s,rid);
      // Trait changes retain this generation's deliberately saved aim.
      return {legacy:legacy,aim:FB.rulerAimSnapshot(s,rid).id};
    },ids.rid);
    expect(changed).toEqual({legacy:calm ? 0.025 : 0.08,aim:'defend_faith'});
    const next = await rulerChannelSnapshot(page,ids);
    expect(next.religionScore).toBe(current.religionScore+20);
    expect(next.investmentAdjustments).toContain(calm ? 'aim:defend_faith' : 'trait:literate');
    expect(next.investment.buildingRoleWeights[example.role]).toBe(calm ? 76 : 100);
    expect(next.pure).toBe(true);
    const frontier = await page.evaluate(function (args) {
      const s = FB.state,P = FB.aiDecisions,record = s.agency.rulerAims[args.rid],previous = record.id;
      const candidates = [{id:'weak',eligible:true,facts:{aggression:0,defensiveStrength:10,contacts:1,development:10}},
        {id:'compact',eligible:true,facts:{aggression:0,defensiveStrength:20,contacts:3,development:5}},
        {id:'blocked',eligible:false,facts:{aggression:0,defensiveStrength:0,contacts:100,development:100}}];
      const rng = FB.getRngState(),uid = FB.getUidCounter(),base = P.orderCandidates(s,args.rid,'expansion',candidates);
      record.id = args.calm ? 'keep_peace' : 'amass_wealth';
      const before = JSON.stringify(s),aim = P.orderCandidates(s,args.rid,'expansion',candidates);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      record.id = previous;
      return {base:base,aim:aim,pure:pure};
    },{rid:ids.rid,calm:calm});
    expect(frontier).toEqual({base:calm ? ['weak','compact'] : ['compact','weak'],
      aim:calm ? ['compact','weak'] : ['weak','compact'],pure:true});
  });
}

test('retained ruler channels restore without replay and real succession drops the predecessor preferences',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const ids = await stageRulerChannels(page);
  await setRulerChannels(page,ids,['ambitious','brave'],'expand_realm');
  const expected = await rulerChannelSnapshot(page,ids);
  const checkpoint = await page.evaluate(function () {
    return {save:JSON.parse(FB.save.serialize()),rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
  });
  const restored = await page.evaluate(function (checkpoint) {
    FB.save.restore(checkpoint.save);
    return {rng:(FB.getRngState() >>> 0) === checkpoint.rng,uid:FB.getUidCounter() === checkpoint.uid,
      revision:FB.state.start.revision === checkpoint.save.state.start.revision,
      matching:!FB.save.otherWorld(checkpoint.save),noCache:!JSON.stringify(checkpoint.save.state).includes('aiDecisionPolicies')};
  },checkpoint);
  expect(restored).toEqual({rng:true,uid:true,revision:true,matching:true,noCache:true});
  expect(await rulerChannelSnapshot(page,ids)).toEqual(expected);
  const succession = await page.evaluate(function (rid) {
    const s = FB.state,old = FB.realmRulerCharacterSnapshot(s,rid),generation = FB.realmRulerGeneration(s,rid);
    s.realms[rid].ruler.personality = 'bellicose';
    FB.killChar(s,old);
    const current = FB.realmRulerCharacterSnapshot(s,rid);
    if (!current || current.id === old.id) throw new Error('No actual successor');
    current.traits.slice().forEach(function (id) { FB.removeTrait(current,id); });
    FB.realmRulerCharacter(s,rid);
    s.agency.rulerAims[rid] = {id:'expand_realm',generation:generation,sinceYear:s.date.year};
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const aim = FB.rulerAimSnapshot(s,rid);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.ensureAgency(s);
    return {generation:FB.realmRulerGeneration(s,rid) > generation,aim:aim.id,stored:FB.rulerAimSnapshot(s,rid).id,
      noPersonality:!Object.prototype.hasOwnProperty.call(s.realms[rid].ruler,'personality'),pure:pure};
  },ids.rid);
  expect(succession).toMatchObject({generation:true,noPersonality:true,pure:true});
  expect(succession.aim).not.toBe('expand_realm');
  expect(succession.stored).toBe(succession.aim);
  const next = await rulerChannelSnapshot(page,ids);
  expect(next).toMatchObject({inputs:{traits:[]},war:0.025,tactics:1.1,participation:0,pure:true});
  expect(next.research).toBeCloseTo(ids.neutralResearch);
  expect(next.investmentAdjustments).not.toContain('trait:brave');
  expect(next.investmentAdjustments).not.toContain('aim:expand_realm');
});

for (const group of [
  {name:'intrigue, diplomacy and religion',indexes:[0,1,2]},
  {name:'investment, expansion and government',indexes:[3,4,5]}
]) {
  test(group.name+' changes participate in exact save fingerprints',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await importExample(page,'ai-decisions-conservative.json');
    await startDeterministicGame(page);
    const checkpoint = await page.evaluate(function () { return {saved:JSON.parse(FB.save.serialize()),signature:FB.mods.sig()}; });
    // Reapply at the ordinary complete-catalogue boundary. Activation changes
    // legacy world tables, which are not the mod installer's baseline.
    await page.reload({waitUntil:'domcontentloaded'});
    await prepareGameContent(page);
    const source = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/examples/ai-decisions-conservative.json'),'utf8'));
    const out = await page.evaluate(function (args) {
      const source = args.source,saved = args.checkpoint.saved,signature = args.checkpoint.signature;
      if (signature !== FB.mods.sig() || FB.save.otherWorld(saved)) throw new Error('Original import did not reload exactly');
      const changes = [function (m) { m.aiDecisionPolicies.restrained_intrigue.parameters.chanceRate = 0.11; },
        function (m) { m.aiDecisionPolicies.conciliatory_diplomacy.aimOrder.reverse(); },
        function (m) { m.aiDecisionPolicies.observant_religion.adjustments[0].multiply.targetHolyWeight = 1.4; },
        function (m) { m.aiDecisionPolicies.careful_investment.adjustments[1].benefitWeights.piety = 15; },
        function (m) { m.aiDecisionPolicies.cautious_frontier.aimOrders.keep_peace[1].direction = 'desc'; },
        function (m) { m.governmentForms.cautious_court.strategyParameters = {ai:{warChance:0}}; }];
      return args.indexes.map(function (index) {
        const change = changes[index];
        const m = JSON.parse(JSON.stringify(source)); change(m); FB.mods.apply(m);
        const mismatch = signature !== FB.mods.sig() && FB.save.otherWorld(saved);
        FB.mods.apply(source);
        return {mismatch:mismatch,exact:signature === FB.mods.sig() && !FB.save.otherWorld(saved)};
      });
    },{source:source,checkpoint:checkpoint,indexes:group.indexes});
    expect(out).toEqual(Array(3).fill({mismatch:true,exact:true}));
  });
}

test('combined malformed imports publish no preferences, messages, storage or identities',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const source = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/examples/ai-decisions-expansion.json'),'utf8'));
  const out = await page.evaluate(function (source) {
    const data = JSON.stringify(FBDATA),state = JSON.stringify(FB.state),signature = FB.mods.sig();
    const rng = FB.getRngState(),uid = FB.getUidCounter(),storage = localStorage.getItem(FB.storageKey('fb_mods'));
    const messages = JSON.stringify(FB.englishMessages());
    const changes = [function (m) { m.aiDecisionPolicies.opportunistic_intrigue.schemeOrder = ['missing_scheme']; },
      function (m) { m.aiDecisionPolicies.assertive_diplomacy.aimOrder = ['missing_aim']; },
      function (m) { m.aiDecisionPolicies.dynastic_religion.adjustments[0].id = 'missing_aim'; },
      function (m) { m.aiDecisionPolicies.learning_investment.adjustments[0].buildingRoleWeights = {missing_role:2}; },
      function (m) { m.aiDecisionPolicies.objective_tactics.adjustments[0].multiply.engagementMargin = 5; },
      function (m) { m.traitMechanics = {ambitious:{researchWeights:{warfare:5}}}; }];
    const rejected = changes.map(function (change) {
      const mod = JSON.parse(JSON.stringify(source)); change(mod);
      const faults = FB.mods.validate(mod); let threw = false;
      try { FB.mods.apply(mod); } catch (error) { threw = true; }
      return faults.length > 0 && threw && FB.mods.store(JSON.stringify(mod)) === false;
    });
    return {rejected:rejected,pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      signature === FB.mods.sig() && rng === FB.getRngState() && uid === FB.getUidCounter() &&
      storage === localStorage.getItem(FB.storageKey('fb_mods')) && messages === JSON.stringify(FB.englishMessages())};
  },source);
  expect(out).toEqual({rejected:Array(6).fill(true),pure:true});
});

test('imported faith preferences cannot activate disabled institutions or override an explicit peaceful court',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await importExample(page,'ai-decisions-expansion.json');
  await startDeterministicGame(page);
  const ids = await stageRulerChannels(page);
  await setRulerChannels(page,ids,['ambitious','brave','zealous'],'defend_faith');
  const out = await page.evaluate(function (ids) {
    const s = FB.state,rid = ids.rid;
    const quiet = JSON.parse(JSON.stringify(FBDATA.governmentForms.expansive_court));
    quiet.strategyParameters = {ai:{warChance:0}};
    FB.mods.apply({governmentForms:{peaceful_channel_court:quiet}});
    if (!FB.authoritySetGovernment(s,rid,'peaceful_channel_court')) throw new Error('Cannot select peaceful court');
    s.realms[rid].ruler.personality = 'bellicose';
    FBDATA.bookmarks[s.start.id].systems = {disable:['papacy','great_holy_wars','ruler_conversion','episcopal_sees']};
    const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const disabled = ['papacy','great_holy_wars','ruler_conversion'].every(function (id) { return !FB.systemAvailable(s,id); });
    FB.greatHolyWarYearly(s); FB.papacyYearly(s); FB.religionYear(s);
    return {disabled:disabled,chance:FB.governments.call(s,rid,'ai','goals',{}).warChance,
      faith:FB.aiDecisions.parameters(s,rid,'religion').targetHolyWeight,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },ids);
  expect(out).toEqual({disabled:true,chance:0,faith:1.5,pure:true});
});
