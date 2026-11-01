'use strict';
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/traits.js','data/map_data.js','js/ai_decisions.js',
  'js/government_ai.js','js/governments.js','js/authority.js','data/political_institutions.js','js/wars.js','js/world.js','js/mods.js','js/balance.js','js/armies.js',
  'js/fortifications.js','js/building_profiles.js','js/lordships.js','js/treasury.js','js/building_seasons.js','js/building_operations.js',
  'js/technology.js','data/technology.js',
  'js/agency.js','js/intrigue.js','js/politics.js','data/intrigue.js','data/ambitions.js',
  'js/holywar.js','js/papacy.js','js/religion.js','js/mobile_confederations.js','js/federates.js',
  'js/government_selection.js','js/government_administration.js','js/government_aristocracy.js',
  'js/government_civic.js','js/government_ecclesiastical.js',
  'docs/examples/ai-decisions-conservative.json','docs/examples/ai-decisions-expansion.json'
]);
const { test,expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function importPolicy(page,source) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(typeof source === 'string' ?
    path.resolve(__dirname,'../../../docs/examples',source) :
    {name:'ai-live.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
  await expect.poll(function () { return page.evaluate(function () { return FB.game.bootReady; }); }).toBe(true);
}

for (const config of [{file:'ai-decisions-conservative.json',chance:0.01},{file:'ai-decisions-expansion.json',chance:0.04}]) {
  test(config.file + ' reaches actual realm goals and preserves declaration gates',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await importPolicy(page,config.file);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
      const person = FB.realmRulerCharacter(s,rid); person.traits = ['honest']; s.realms[rid].ruler.trait = 'honest';
      delete s.realms[rid].ruler.personality;
      const goals = FB.governments.call(s,rid,'ai','goals',{});
      const policy = JSON.parse(JSON.stringify(FB.aiDecisions.resolve(s,rid,'war').definition));
      policy.parameters.maximumCommitments = 0;
      FB.mods.apply({aiDecisionPolicies:{disabled_offense:policy},balance:{aiWarPolicy:'disabled_offense'}});
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.realmCampaignAI(s,rid);
      return {chance:goals.warChance,noDeclaration:before === JSON.stringify(s),rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
    });
    expect(out).toEqual({chance:config.chance,noDeclaration:true,rng:true,uid:true});
  });
}

test('ordinary raid zero and malformed tuning retain paid and eligibility owners',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state, rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
    const errors = FB.mods.validate({balance:{aiRaidTargetDevelopmentWeight:-1}});
    FB.mods.apply({balance:{aiRaidChance:0}});
    const before = JSON.stringify(s), calls = [], chance = FB.chance;
    FB.chance = function (value) { calls.push(value); return false; };
    try { FB.aiRaidTick(s,rid,s.realms[rid],FBDATA.balance,true); } finally { FB.chance = chance; }
    return {bad:errors.length > 0,unchanged:before === JSON.stringify(s),zero:calls.every(function (value) { return value === 0; })};
  });
  expect(out).toEqual({bad:true,unchanged:true,zero:true});
});

for (const margin of [0.5,4]) {
  test('imported tactical margin ' + margin + ' controls voluntary AI pursuit only',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (margin) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_tactics));
      d.parameters.engagementMargin = margin;
      return {name:'Tactical margin '+margin,aiDecisionPolicies:{tactical_review:d},balance:{aiTacticsPolicy:'tactical_review'}};
    },margin);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, ids = Object.keys(s.realms).filter(function (id) { return id !== 'player' && s.realms[id].alive && s.realms[id].ruler; });
      s.realms[ids[0]].ruler.mar = 5; s.realms[ids[1]].ruler.mar = 5;
      const pid = s.player.provinceId, a = {id:'policy_a',realm:ids[0],at:pid,men:2000,units:{levy:2000},supply:100};
      const b = {id:'policy_b',realm:ids[1],at:pid,men:1000,units:{levy:1000},supply:100};
      const prior = s.armies, hostile = FB.armiesHostile;
      s.armies = [a,b];
      FB.armiesHostile = function (state,x,y) { return x.realm !== y.realm; };
      try {
        const before = JSON.stringify(s), rng = FB.getRngState();
        return {pursue:FB.armyCanPursue(s,a,pid),pure:before === JSON.stringify(s) && rng === FB.getRngState()};
      } finally { s.armies = prior; FB.armiesHostile = hostile; }
    });
    expect(out).toEqual({pursue:margin === 0.5,pure:true});
  });
}

for (const role of ['scholarship','worship']) {
  test('imported investment role ' + role + ' changes the annual builder ranking without granting assets',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (role) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_investment));
      d.buildingRoleWeights = {}; d.buildingRoleWeights[role] = 100;
      return {name:'Investment '+role,aiDecisionPolicies:{investment_review:d},balance:{aiInvestmentPolicy:'investment_review'}};
    },role);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, pid = s.player.provinceId, rid = s.owner[pid];
      const entries = ['scholarship','worship'].map(function (role) {
        const id = Object.keys(FBDATA.buildings).find(function (id) { return FBDATA.buildings[id].role === role && typeof FBDATA.buildings[id].aiBuildOrder === 'number'; });
        return {id:id,order:FBDATA.buildings[id].aiBuildOrder,profileId:null};
      });
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ordered = FB.aiDecisions.buildingPriorities(s,rid,pid,entries);
      return {first:FB.buildingRole(ordered[0].id),pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(out).toEqual({first:role,pure:true});
  });
}

for (const weight of [0,2]) {
  test('imported research domain weight ' + weight + ' reaches the real score and seasonal slot selection',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (weight) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_research));
      d.domainWeights = {};
      Object.keys(FBDATA.techDomains).forEach(function (domain) { d.domainWeights[domain] = weight; });
      return {name:'Research '+weight,aiDecisionPolicies:{research_review:d},balance:{aiResearchPolicy:'research_review'}};
    },weight);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
      const candidate = FB.techCandidates(s,rid,true).find(function (row) { return row.available; });
      const record = FB.realmTechRecord(s,rid), knownBefore = JSON.stringify(record.completed);
      const score = FB.techAIScore(s,candidate.id,rid), scoreDidNotGrant = knownBefore === JSON.stringify(record.completed);
      record.active = [];
      const completed = JSON.stringify(record.completed);
      FB.techSeason(s,false);
      return {score:score,active:record.active.length,scoreDidNotGrant:scoreDidNotGrant,completed:completed === JSON.stringify(record.completed)};
    });
    expect(out.scoreDidNotGrant).toBe(true);
    if (!weight) expect(out).toMatchObject({score:0,active:0,completed:true});
    else { expect(out.score).toBeGreaterThan(0); expect(out.active).toBeGreaterThan(0); }
  });
}

for (const rate of [0,1]) {
  test('imported intrigue and diplomacy rates ' + rate + ' reach existing yearly/goals consumers',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (rate) {
      const intrigue = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_intrigue));
      const diplomacy = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_diplomacy));
      intrigue.parameters.chanceRate = rate; intrigue.parameters.maximumChance = 1;
      diplomacy.parameters.allianceChance = rate;
      return {name:'Political rate '+rate,aiDecisionPolicies:{intrigue_review:intrigue,diplomacy_review:diplomacy},
        balance:{aiIntriguePolicy:'intrigue_review',aiDiplomacyPolicy:'diplomacy_review'}};
    },rate);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, ids = Object.keys(s.realms).filter(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
      ids.forEach(function (id) { const c = FB.realmRulerCharacter(s,id); if (c) c.traits = ['ambitious']; s.realms[id].ruler.trait = 'ambitious'; });
      const calls = [], chance = FB.chance;
      FB.chance = function (p) { calls.push(p); return false; };
      try { FB.intrigueAgencyYearly(s); } finally { FB.chance = chance; }
      return {calls:calls,alliance:FB.governments.call(s,ids[0],'ai','goals',{}).allianceChance};
    });
    expect(out.alliance).toBe(rate);
    expect(out.calls.length).toBeGreaterThan(0);
    expect(out.calls.every(function (value) { return value === rate; })).toBe(true);
  });
}

for (const minimum of [0.5,10]) {
  test('imported religious target margin ' + minimum + ' controls the actual yearly caller',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (minimum) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_religion));
      d.parameters.minimumTargetRatio = minimum;
      return {name:'Religious target '+minimum,aiDecisionPolicies:{religious_review:d},balance:{aiReligionPolicy:'religious_review'}};
    },minimum);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const picked = await page.evaluate(function () {
      const s = FB.state, saved = {}, realms = s.realms;
      function stub(name,fn) { saved[name] = FB[name]; FB[name] = fn; }
      FB.ensureGreatHolyWar(s); s.greatHolyWar = null;
      s.date = {year:1200,season:0,day:1}; s.turn = 120000;
      s.greatHolyWarHistory.firstLaunched.catholic = true;
      s.greatHolyWarHistory.cooldownUntil = {};
      s.realms = {papacy:{alive:true},ally:{alive:true},enemy:{alive:true}};
      s.owner.policy_target = 'enemy';
      let picked = null;
      stub('ensureReligiousHeads',function () {});
      stub('religionIds',function () { return ['catholic']; });
      stub('religiousHeadOf',function () { return {id:'papacy'}; });
      stub('playerPope',function () { return false; });
      stub('realmReligionId',function (state,id) { return id === 'enemy' ? 'sunni' : 'catholic'; });
      stub('realmRulerCharacter',function () { return null; });
      stub('topRealm',function (state,id) { return id; });
      stub('aiBaseHost',function () { return 1000; });
      stub('rearmScale',function () { return 1; });
      stub('chance',function () { return true; });
      stub('greatHolyWarTargets',function () { return [{kingdomId:'policy_objective',holyPriority:1,
        objectiveDevelopment:10,totalDevelopment:10,objectiveCounties:['policy_target']}]; });
      stub('callGreatHolyWar',function (state,religion,target) { picked = target; });
      try { FB.greatHolyWarYearly(s); return picked; }
      finally { Object.keys(saved).forEach(function (name) { FB[name] = saved[name]; }); s.realms = realms; }
    });
    expect(picked).toBe(minimum === 0.5 ? 'policy_objective' : null);
  });
}

for (const willingness of [0,1]) {
  test('imported government agreement willingness ' + willingness + ' retains the canonical consent writer',async function ({page},testInfo) {
    await openGame(page,testInfo);
    const mod = await page.evaluate(function (value) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_government));
      d.parameters.agreementWillingness = value;
      return {name:'Government agreements '+value,aiDecisionPolicies:{government_review:d},balance:{aiGovernmentPolicy:'government_review'}};
    },willingness);
    await importPolicy(page,mod);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state, rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && id !== FB.playerRealmId(s) && s.realms[id].alive && !s.realms[id].liege; });
      const writer = FB.authorityConsentContract, before = JSON.stringify(s), rng = FB.getRngState();
      let calls = 0;
      FB.authorityConsentContract = function () { calls++; return writer.apply(FB,arguments); };
      let result;
      try { result = FB.governments.strategy('ai','federate_contracts').consentContract(s,rid,
        {contract:{id:'missing_policy_contract',patronRealmId:rid,payPerSeason:0,initialPay:0}}); }
      finally { FB.authorityConsentContract = writer; }
      const invalid = {calls:calls,refused:!result,pure:before === JSON.stringify(s)};
      const ids = Object.keys(s.realms).filter(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].liege; });
      const patron = ids[0], federate = ids[1], at = s.realms[patron].capital;
      s.treasuryAccounting = {mode:'active'};
      [patron,federate].forEach(function (id) { s.realms[id].treasury = {version:1,gold:100,militaryAccrued:0,retired:false}; });
      s.armies.push({id:'policy_service',realm:federate,at:at,men:80,units:{levy:80},supply:100,path:[]});
      const offered = FB.authorityOfferContractTemplate(s,'paid_service',
        {patronRealmId:patron,federateRealmId:federate,hostId:'policy_service'});
      const strategy = FB.governments.strategy('ai','federate_contracts');
      [patron,federate].forEach(function (id) { strategy.consentContract(s,id,{contract:offered}); });
      const row = FB.political.contract(s,offered.id);
      return {invalid:invalid,status:row.status,approvals:Object.keys(row.approvals).length,rng:rng === FB.getRngState(),
        noEarlyPayment:s.realms[patron].treasury.gold === 100 && s.realms[federate].treasury.gold === 100,
        civic:FB.governments.strategy('ai','civic_decisions').goals(s,rid,{})};
    });
    expect(out).toEqual({invalid:{calls:willingness,refused:true,pure:true},status:willingness ? 'active' : 'offered',
      approvals:willingness*2,rng:true,noEarlyPayment:true,civic:{warChance:0,allianceChance:0}});
  });
}

test('live family extensions reject malformed imports atomically',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const out = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const cases = [
      ['investment',function (d) { d.buildingRoleWeights = {missing_role:1}; }],
      ['research',function (d) { d.domainWeights = {missing_domain:1}; }],
      ['research',function (d) { d.domainWeights = {}; d.domainWeights[Object.keys(FBDATA.techDomains)[0]] = 5; }],
      ['intrigue',function (d) { d.schemeOrder = ['missing_scheme']; }],
      ['diplomacy',function (d) { d.aimOrder = ['missing_aim']; }],
      ['religion',function (d) { d.parameters.electionPietyDivisor = 0; }],
      ['government',function (d) { d.parameters.agreementWillingness = -1; }],
      ['government',function (d) { d.parameters.mobileTradeCount = 1.5; }]
    ];
    const rejected = cases.map(function (entry) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies['ordinary_'+entry[0]])); entry[1](d);
      try { FB.mods.apply({aiDecisionPolicies:{invalid_live_policy:d}}); return false; }
      catch (error) { return true; }
    });
    return {rejected:rejected,data:before === JSON.stringify(FBDATA),state:state === JSON.stringify(FB.state),
      rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
  });
  expect(out).toEqual({rejected:Array(8).fill(true),data:true,state:true,rng:true,uid:true});
});
