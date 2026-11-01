'use strict';
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
  'js/building_profiles.js','js/fortifications.js','js/technology.js','js/armies.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/util.js','js/intrigue.js','data/intrigue.js','js/crazygames.js','data/distribution_crazygames.js',
  'docs/examples/ai-decisions-conservative.json','docs/examples/ai-decisions-expansion.json'
]);

async function importExample(page,file) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../../../docs/examples',file));
  await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
  await expect.poll(function () { return page.evaluate(function () { return FB.game.bootReady && FB.mods.count() === 1; }); }).toBe(true);
}

const examples = [
  {file:'ai-decisions-conservative.json',form:'cautious_court',margin:1.6,role:'worship',chance:0.01,investment:'careful_investment',research:'stewardship_research'},
  {file:'ai-decisions-expansion.json',form:'expansive_court',margin:0.9,role:'scholarship',chance:0.04,investment:'learning_investment',research:'innovating_research'}
];
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
    const out = await page.evaluate(function (form) {
      let s = FB.state;
      const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        s.realms[id].treasury && FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial'; });
      if (!FB.authoritySetGovernment(s,rid,form)) throw new Error('Government assignment failed');
      s.player.gold = 1; s.realms[rid].treasury.gold = 7;
      FB.realmTechRecord(s,rid).active = [];
      const saved = JSON.parse(FB.save.serialize()),signature = FB.mods.sig();
      const rng = FB.getRngState(),uid = FB.getUidCounter();
      function boundary() {
        FB.techSeason(FB.state,false);
        return {record:JSON.stringify(FB.realmTechRecord(FB.state,rid)),rng:FB.getRngState(),uid:FB.getUidCounter()};
      }
      const first = boundary();
      FB.save.restore(saved); s = FB.state;
      const retained = {gold:s.player.gold,treasury:s.realms[rid].treasury.gold,rng:rng === FB.getRngState(),
        uid:uid === FB.getUidCounter(),signature:signature === FB.mods.sig(),otherWorld:FB.save.otherWorld(saved),
        margin:FB.aiDecisions.parameters(s,rid,'tactics').engagementMargin,
        noPolicyRecord:!JSON.stringify(saved.state).includes('aiDecisionPolicies')};
      const second = boundary();
      return {retained:retained,replay:JSON.stringify(first) === JSON.stringify(second)};
    },example.form);
    expect(out).toEqual({retained:{gold:1,treasury:7,rng:true,uid:true,signature:true,otherWorld:false,
      margin:example.margin,noPolicyRecord:true},replay:true});
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
      delete s.realms[rid].ruler.personality;
      const before = JSON.stringify(s),rng = FB.getRngState();
      const goals = FB.governments.strategy('ai','realm_decisions').goals(s,rid,{});
      const order = P.orderCandidates(s,rid,'expansion',[{id:'z',eligible:true,facts:{aggression:1}},
        {id:'b',eligible:true,facts:{aggression:0}},{id:'a',eligible:true,facts:{aggression:0}}]);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState();
      const saved = JSON.parse(FB.save.serialize());
      function boundary() { FB.techSeason(FB.state,false); return {record:JSON.stringify(FB.realmTechRecord(FB.state,rid)),rng:FB.getRngState()}; }
      const first = boundary(); FB.save.restore(saved); const second = boundary();
      return {goals:goals,order:order,pure:pure,replay:JSON.stringify(first) === JSON.stringify(second),
        noMods:FB.mods.count() === 0,margin:P.parameters(FB.state,rid,'tactics').engagementMargin};
    });
    expect(out).toEqual({goals:{warChance:0.025,allianceChance:0.08},order:['a','b','z'],pure:true,replay:true,noMods:true,margin:1.1});
  });
}
