'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/traits.js','data/map_data.js','data/units.js','data/ambitions.js',
  'js/ai_decisions.js','js/armies.js','js/agency.js','js/world.js','js/model.js','js/wars.js',
  'js/balance.js','js/governments.js','js/authority.js','js/fortifications.js','js/technology.js',
  'js/treasury.js','js/logistics.js','js/market.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/expedition_programs.js','tests/e2e/fixtures/authoring/ai-tactics-bold.json',
  'tests/e2e/fixtures/authoring/ai-tactics-guarded.json'
]);

async function begin(page,info,config,graph) {
  await openGame(page,info);
  if (config) {
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/ai-tactics-'+config+'.json'));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await startDeterministicGame(page);
  return page.evaluate(function (graph) {
    const s = FB.state;
    FB.ordinaryWars(s).forEach(function (w) { FB.settleOrdinaryWar(s,w.id,'invalid'); });
    s.greatHolyWar = null;
    const ids = Object.keys(s.realms).sort().filter(function (id) {
      const r = s.realms[id];
      return id !== 'player' && r.alive && !r.liege && FB.realmRulerCharacterSnapshot(s,id) &&
        Object.keys(r.succession.members).length > 2 && FB.governments.forRealm(s,id).id === 'territorial';
    });
    const rid = ids[0],enemy = ids[1],home = s.realms[rid].capital;
    const target = Object.keys(FB.world.adj[home]).sort().find(function (pid) {
      return !FB.world.byId[pid].wasteland && !FB.waterCrossing(home,pid);
    });
    if (!target) throw new Error('Tactical fixture needs a land neighbor');
    const extra = FB.world.provs.filter(function (p) { return !p.wasteland && p.id !== home && p.id !== target; })
      .slice(0,3).map(function (p) { return p.id; });
    const rally = extra[0],beyond = extra[1],isolated = extra[2];
    [home,target,rally,beyond,isolated].forEach(function (pid,i) {
      s.owner[pid] = s.holder[pid] = i === 0 || i === 2 ? rid : enemy;
      s.buildings[pid] = []; FB.invalidateBuildingIndex(s,pid);
    });
    s.realms[enemy].capital = target;
    FB.invalidateRealmCache(); FB.invalidateFortIndex();
    FB.treasuryInitialize(s);
    [rid,enemy].forEach(function (id) {
      s.realms[id].treasury.gold = 1000000; s.realms[id].treasury.recoverUntil = 0;
      s.realms[id].ruler.mar = 5; delete s.realms[id].ruler.personality;
      FB.realmRulerCharacterSnapshot(s,id).traits = [];
    });
    const war = FB.registerOrdinaryWar(s,rid,{enemy:enemy,target:target,legacy:false,casus:{type:'aggression'}});
    if (graph) {
      const adj = {},byId = Object.assign({},FB.world.byId);
      [home,target,rally,beyond,isolated].forEach(function (pid,i) {
        adj[pid] = {};
        byId[pid] = Object.assign({},byId[pid],{terrain:'plains',cx:i,cy:0});
      });
      [[home,target],[home,rally],[target,beyond]].forEach(function (edge) {
        adj[edge[0]][edge[1]] = 1; adj[edge[1]][edge[0]] = 1;
      });
      FB.world = Object.assign({},FB.world,{adj:adj,waterAdj:{},byId:byId});
    }
    function host(id,realm,at,men) {
      return {id:id,realm:realm,at:at,from:at,warId:war.id,men:men,size:men,
        units:{levy:men,arch:0,cav:0,ret:0,mercs:0},path:[],moveLeft:0,goal:null,supply:100};
    }
    const a = host('risk_main',rid,home,10000),b = host('risk_enemy',enemy,target,10000);
    s.armies = [a,b]; s.armyDown = {}; s.armyDetachmentDown = {};
    FB.ensureAgency(s);
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
    window.tacticalFixture = {rid:rid,enemy:enemy,home:home,target:target,rally:rally,beyond:beyond,isolated:isolated,
      war:war,host:host,trait:function (id) { FB.realmRulerCharacterSnapshot(FB.state,rid).traits = id ? [id] : []; },
      ratio:function (ratio,group,pid) {
        const attack = (group || [a]).reduce(function (n,h) { return n+FB.armyBattlePower(s,h,pid || b.at,'attack'); },0);
        const defense = FB.armyBattlePower(s,b,pid || b.at,'defense');
        b.men = b.size = b.units.levy = Math.max(1,Math.round(b.men*attack/defense/ratio));
      }};
    return {rid:rid,enemy:enemy,home:home,target:target,rally:rally,beyond:beyond,isolated:isolated};
  },!!graph);
}

test('declared dispositions use canonical identity, one bounded pure projection and neutral ordering',async function ({page},info) {
  await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,P = FB.aiDecisions,policy = P.resolve(s,f.rid,'tactics');
    const c = FB.realmRulerCharacterSnapshot(s,f.rid),results = {};
    [null,'brave','craven','wrathful','patient','ambitious'].forEach(function (trait) {
      f.trait(trait);
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      const r = P.report(policy,[{id:'second',eligible:true,facts:{}},{id:'first',eligible:true,facts:{}}],P.inputs(s,f.rid));
      results[trait || 'neutral'] = {margin:r.parameters.engagementMargin,reason:r.tactics.reason,
        order:r.ranking.map(function (row) { return row.id; }),
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    c.traits = ['brave','brave']; s.realms[f.rid].ruler.trait = 'craven';
    const duplicate = P.parameters(s,f.rid,'tactics').engagementMargin;
    const other = JSON.parse(JSON.stringify(s)); FB.realmRulerCharacterSnapshot(other,f.rid).traits = ['craven'];
    const isolated = P.parameters(other,f.rid,'tactics').engagementMargin === 1.32 && P.parameters(s,f.rid,'tactics').engagementMargin === duplicate;
    c.traits = []; const empty = P.parameters(s,f.rid,'tactics').engagementMargin;
    const bounds = [0,4].map(function (multiplier) {
      const d = JSON.parse(JSON.stringify(policy.definition));
      d.adjustments = [{kind:'trait',id:'brave',multiply:{engagementMargin:multiplier}}];
      const data = Object.assign({},FBDATA,{aiDecisionPolicies:{bounded_risk:d}});
      return P.report(P.compile('bounded_risk',data),[],{traits:['brave']}).parameters.engagementMargin;
    });
    return {results:results,duplicate:duplicate,isolated:isolated,empty:empty,bounds:bounds,
      pool:FBDATA.rulerTraits.indexOf('brave') < 0 && FBDATA.rulerTraits.indexOf('craven') < 0};
  });
  for (const [trait,margin,reason] of [['neutral',1.1,'risk_neutral'],['brave',0.99,'risk_accepting'],['craven',1.32,'risk_guarded'],
    ['wrathful',1.1,'risk_neutral'],['patient',1.1,'risk_neutral'],['ambitious',1.1,'risk_neutral']]) {
    expect(out.results[trait].margin).toBeCloseTo(margin);
    expect(out.results[trait]).toMatchObject({reason:reason,order:['second','first'],pure:true});
  }
  expect(out.duplicate).toBeCloseTo(0.99);
  expect(out).toMatchObject({isolated:true,empty:1.1,bounds:[0.5,4],pool:true});
});

test('matched primary hosts choose different voluntary pursuit and campaign advances without power or resource changes',async function ({page},info) {
  const ids = await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,a = s.armies[0]; f.ratio(1.02);
    const cases = {};
    [null,'brave','craven'].forEach(function (trait) {
      f.trait(trait);
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      cases[trait || 'neutral'] = {pursuit:FB.armyPursuitGoal(s,a),advance:FB.armyCampaignAdvanceGoal(s,a),
        power:FB.armyBattlePower(s,a,f.target,'attack'),
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    return cases;
  });
  expect(out.brave).toMatchObject({pursuit:ids.target,advance:ids.target,pure:true});
  expect(out.neutral).toMatchObject({pursuit:null,advance:null,pure:true});
  expect(out.craven).toMatchObject({pursuit:null,advance:null,pure:true});
  expect(out.brave.power).toBe(out.neutral.power); expect(out.craven.power).toBe(out.neutral.power);
});

test('risk cannot open disconnected objectives, pass hostile forts or supply siege feasibility',async function ({page},info) {
  const ids = await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,a = s.armies[0],b = s.armies[1]; f.trait('brave');
    b.at = f.isolated; f.war.objectives = [{target:f.isolated,type:'county'}]; f.ratio(10);
    const disconnected = [FB.armyPursuitGoal(s,a),FB.armyCampaignAdvanceGoal(s,a)];
    b.at = f.beyond; f.war.objectives = [{target:f.beyond,type:'county'}];
    s.buildings[f.target] = [{id:'walls',s:0,level:3}]; FB.invalidateFortIndex();
    const route = FB.findArmyPath(s,a,f.beyond),blockedPursuit = FB.armyPursuitGoal(s,a);
    const fortAdvance = FB.armyCampaignAdvanceGoal(s,a);
    a.men = a.size = a.units.levy = 1;
    const infeasible = FB.armyCampaignAdvanceGoal(s,a);
    a.men = a.size = a.units.levy = 10000; b.at = f.target; f.ratio(0.7);
    const overwhelming = FB.armyPursuitGoal(s,a);
    return {disconnected:disconnected,blockedBy:route.blockedByFort,blockedPursuit:blockedPursuit,
      fortAdvance:fortAdvance,infeasible:infeasible,overwhelming:overwhelming};
  });
  expect(out).toEqual({disconnected:[null,null],blockedBy:ids.target,blockedPursuit:null,
    fortAdvance:ids.target,infeasible:null,overwhelming:null});
});

test('coordinated hosts share risk only after gathering and preserve recovery and command exclusions',async function ({page},info) {
  const ids = await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,a = s.armies[0],b = s.armies[1],d = f.host('risk_detachment',f.rid,f.home,9000);
    s.armies.push(d); f.ratio(1.15,[a,d]);
    function goals() { return FB.armyOffensiveCoordination(s,'off').goals; }
    f.trait('brave'); const brave = goals();
    f.trait(null); const neutral = goals();
    f.trait('craven'); const cautious = goals();
    f.trait('brave'); d.at = f.rally; const gather = goals();
    d.at = f.beyond; const hostileGather = goals(); d.at = f.home;
    const excluded = ['manual','holdManual','autoResupply','supplyRetreat','broken','supply'].map(function (key) {
      const old = d[key]; d[key] = key === 'broken' ? s.turn : key === 'supply' ? 0 : 1;
      const result = goals(); if (old === undefined) delete d[key]; else d[key] = old;
      return result;
    });
    s.realms[f.rid].treasury.recoverUntil = s.turn+10; const fiscal = goals();
    s.realms[f.rid].treasury.recoverUntil = 0;
    const programs = FB.expeditionPrograms.ownsOrders,controls = FB.playerControlsHost;
    let program,commanded;
    try {
      FB.expeditionPrograms.ownsOrders = function (state,host) { return host === d || programs.apply(this,arguments); };
      program = goals(); FB.expeditionPrograms.ownsOrders = programs;
      FB.playerControlsHost = function (state,host) { return host === d || controls.apply(FB,arguments); };
      commanded = goals();
    } finally { FB.expeditionPrograms.ownsOrders = programs; FB.playerControlsHost = controls; }
    return {brave:brave,neutral:neutral,cautious:cautious,gather:gather,hostileGather:hostileGather,
      excluded:excluded,fiscal:fiscal,program:program,commanded:commanded,
      separate:s.armies.length === 3 && a.men === 10000 && d.men === 9000};
  });
  expect(out.brave).toEqual({risk_main:ids.target,risk_detachment:ids.target});
  expect(out.neutral).toEqual(out.brave);
  expect(out.cautious).toEqual({risk_main:ids.home,risk_detachment:ids.home});
  expect(out.gather).toEqual({risk_main:ids.home,risk_detachment:ids.home});
  expect(out.hostileGather).toEqual({});
  out.excluded.forEach(function (goals) { expect(goals).toEqual({}); });
  expect(out).toMatchObject({fiscal:{},program:{},commanded:{},separate:true});
});

test('supply, financial regrouping and compulsory retreat retain neutral safety and legal exits',async function ({page},info) {
  const ids = await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,a = s.armies[0],b = s.armies[1],cases = {};
    a.at = f.rally; a.from = f.home; b.at = f.home; f.ratio(1.15,null,f.home);
    ['brave','craven'].forEach(function (trait) {
      f.trait(trait);
      const voluntary = FB.armyCanPursue(s,a,f.home),regroup = FB.armyRegroupGoal(s,a);
      a.autoResupply = 1; const supply = FB.armyCanPursue(s,a,f.home); delete a.autoResupply;
      s.realms[f.rid].treasury.recoverUntil = s.turn+10;
      const fiscal = FB.armyCanPursue(s,a,f.home); s.realms[f.rid].treasury.recoverUntil = 0;
      a.broken = s.turn; const retreat = FB.armyRetreatGoal(s,a); delete a.broken;
      cases[trait] = {voluntary:voluntary,regroup:regroup,supply:supply,fiscal:fiscal,retreat:retreat};
    });
    s.buildings[f.home] = [{id:'walls',s:0,level:4}];
    s.owner[f.home] = s.holder[f.home] = f.enemy; FB.invalidateRealmCache(); FB.invalidateFortIndex();
    a.broken = s.turn; const trapped = FB.armyRetreatGoal(s,a);
    return {cases:cases,trapped:trapped};
  });
  expect(out.cases.brave).toEqual({voluntary:true,regroup:ids.home,supply:true,fiscal:true,retreat:ids.home});
  expect(out.cases.craven).toEqual({voluntary:false,regroup:ids.home,supply:true,fiscal:true,retreat:ids.home});
  expect(out.trapped).toBeNull();
});

test('the daily order phase preserves manual, delegated and expedition routes while routing broken hosts home',async function ({page},info) {
  const ids = await begin(page,info,null,true);
  const out = await page.evaluate(function () {
    const s = FB.state,f = tacticalFixture,a = s.armies[0],b = s.armies[1]; f.trait('brave');
    s.player.tier = 4; s.player.liege = null; s.player.provs = [s.player.provinceId];
    FB.foundPlayerRealm(s);
    const program = f.host('risk_program',f.rid,f.rally,2000),routed = f.host('risk_routed',f.rid,f.rally,1000);
    const manual = f.host('risk_manual','player',f.home,1000);
    [a,manual].forEach(function (h) { h.path = [f.rally]; h.goal = f.rally; h.moveLeft = 20; h.manual = 1; });
    program.path = [f.home]; program.goal = f.home; program.moveLeft = 20;
    routed.broken = s.turn; b.broken = s.turn;
    manual.scenarioStanding = true; manual.scenarioEndTurn = s.turn+10;
    s.armies.push(program,routed,manual);
    Object.keys(s.realms).forEach(function (rid) { s.armyDown[rid] = s.turn; });
    FB.game.auto.hosts = 'off';
    const programs = FB.expeditionPrograms.ownsOrders,controls = FB.playerControlsHost;
    try {
      // Isolate the order-owner boundary; the canonical grant/program lifecycles
      // have their own focused specifications.
      FB.expeditionPrograms.ownsOrders = function (state,h) { return h.id === program.id || programs.apply(this,arguments); };
      FB.playerControlsHost = function (state,h) { return h.id === a.id || controls.apply(FB,arguments); };
      FB.armyTick(s);
    } finally { FB.expeditionPrograms.ownsOrders = programs; FB.playerControlsHost = controls; }
    function route(id) {
      const h = s.armies.find(function (host) { return host.id === id; });
      return {goal:h.goal,path:h.path,at:h.at,manual:h.manual || 0};
    }
    return {delegated:route(a.id),program:route(program.id),manual:route(manual.id),routed:route(routed.id)};
  });
  expect(out.delegated).toEqual({goal:ids.rally,path:[ids.rally],at:ids.home,manual:1});
  expect(out.manual).toEqual(out.delegated);
  expect(out.program).toEqual({goal:ids.home,path:[ids.home],at:ids.rally,manual:0});
  expect(out.routed.goal).toBe(ids.home);
});

for (const config of [{id:'bold',margin:0.88,pursue:true},{id:'guarded',margin:1.33,pursue:false}]) {
  test(config.id+' ordinary JSON import changes real voluntary choices and rejects malformed publication',async function ({page},info) {
    const ids = await begin(page,info,config.id,true);
    const out = await page.evaluate(function () {
      const s = FB.state,f = tacticalFixture,P = FB.aiDecisions; f.trait('brave'); f.ratio(1.1);
      const report = P.report(P.resolve(s,f.rid,'tactics'),[],P.inputs(s,f.rid));
      const choice = FB.armyPursuitGoal(s,s.armies[0]);
      const data = JSON.stringify(FBDATA),state = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter(),sig = FB.mods.sig();
      const bad = [function (d) { d.adjustments[0].multiply.engagementMargin = 5; },
        function (d) { d.parameters.engagementMargin = 0.49; },
        function (d) { d.adjustments[0].id = 'unknown_disposition'; },
        function (d) { d.adjustments.push(d.adjustments[0]); },
        function (d) { d.parameters.battlePower = 2; }].map(function (mutate) {
        const d = JSON.parse(JSON.stringify(report.definition)); mutate(d);
        const mod = {aiDecisionPolicies:{invalid_risk:d},balance:{aiTacticsPolicy:'invalid_risk'}};
        const errors = FB.mods.validate(mod); let refused = false;
        try { FB.mods.apply(mod); } catch (error) { refused = true; }
        return errors.length > 0 && refused;
      });
      return {margin:report.parameters.engagementMargin,choice:choice,bad:bad,
        pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() && sig === FB.mods.sig(),
        generated:FBDATA.rulerTraits.every(function (id) { return id === 'brave' || id === 'craven'; }) &&
          Object.keys(s.realms).some(function (id) { return s.realms[id].ruler && ['brave','craven'].indexOf(s.realms[id].ruler.trait) >= 0; })};
    });
    expect(out.margin).toBeCloseTo(config.margin);
    expect(out.choice).toBe(config.pursue ? ids.target : null);
    expect(out.bad).toEqual([true,true,true,true,true]); expect(out.pure).toBe(true);
    expect(out.generated).toBe(config.id === 'bold');
  });
}

test('matching saves replay tactical choices and real succession replaces predecessor preferences',async function ({page},info) {
  const ids = await begin(page,info,'bold',false);
  const out = await page.evaluate(function (ids) {
    let s = FB.state; const f = tacticalFixture,P = FB.aiDecisions;
    f.trait('brave');
    // Keep the compact martial projection consistent with the real people,
    // as ordinary restoration synchronizes those existing summaries.
    [ids.rid,ids.enemy].forEach(function (rid) { FB.realmRulerCharacter(s,rid); });
    s.armies.forEach(function (h) { FB.hostUnits(h); });
    f.ratio(1.02);
    const generation = FB.realmRulerGeneration(s,ids.rid),old = FB.realmRulerCharacterSnapshot(s,ids.rid).id;
    function facts() {
      const state = FB.state,a = state.armies.find(function (h) { return h.id === 'risk_main'; });
      return {inputs:P.inputs(state,ids.rid),parameters:P.parameters(state,ids.rid,'tactics'),
        pursuit:FB.armyPursuitGoal(state,a),advance:FB.armyCampaignAdvanceGoal(state,a),
        hosts:JSON.parse(JSON.stringify(state.armies)),gold:FB.treasuryAvailable(state,ids.rid),sig:FB.mods.sig()};
    }
    const expected = facts(),saved = JSON.parse(FB.save.serialize()),rng = FB.getRngState(),uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const restored = facts(),clocks = {rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter()};
    s.armies.push(f.host('risk_saved_detachment',ids.rid,ids.home,9000));
    s.armies.forEach(function (h) { FB.hostUnits(h); });
    function formation() {
      const plan = FB.armyOffensiveCoordination(FB.state,'off');
      return {goals:plan.goals,marches:plan.marches.map(function (group) {
        return group.map(function (h) { return h.id; });
      }),hosts:JSON.parse(JSON.stringify(FB.state.armies))};
    }
    const formations = [false,true].map(function (separated) {
      const detachment = s.armies.find(function (h) { return h.id === 'risk_saved_detachment'; });
      const enemy = s.armies.find(function (h) { return h.id === 'risk_enemy'; });
      detachment.at = separated ? ids.target : ids.home;
      enemy.at = separated ? ids.beyond : ids.target;
      const before = formation(),r = FB.getRngState(),u = FB.getUidCounter(),save = JSON.parse(FB.save.serialize());
      FB.save.restore(save); s = FB.state;
      return {goals:before.goals,matching:JSON.stringify(before) === JSON.stringify(formation()),
        clocks:r === FB.getRngState() && u === FB.getUidCounter()};
    });
    const a = s.armies.find(function (h) { return h.id === 'risk_main'; });
    FB.orderArmy(s,a,ids.target); a.manual = 1;
    const ordered = JSON.stringify(a),orderedSave = JSON.parse(FB.save.serialize());
    FB.save.restore(orderedSave); s = FB.state;
    const routeRetained = ordered === JSON.stringify(s.armies.find(function (h) { return h.id === 'risk_main'; }));
    FB.killChar(s,FB.realmRulerCharacterSnapshot(s,ids.rid));
    const current = FB.realmRulerCharacterSnapshot(s,ids.rid); current.traits = ['craven'];
    s.agency.rulerAims[ids.rid] = {id:'expand_realm',generation:generation,sinceYear:s.date.year};
    const before = JSON.stringify(s),report = P.report(P.resolve(s,ids.rid,'tactics'),[],P.inputs(s,ids.rid));
    const successor = {margin:report.parameters.engagementMargin,adjustments:report.adjustments,
      changed:current.id !== old && FB.realmRulerGeneration(s,ids.rid) > generation,
      staleAim:P.inputs(s,ids.rid).aim !== 'expand_realm',pure:before === JSON.stringify(s)};
    const successorFacts = facts(),successorSave = JSON.parse(FB.save.serialize());
    FB.save.restore(successorSave);
    return {expected:expected,restored:restored,clocks:clocks,formations:formations,routeRetained:routeRetained,successor:successor,
      successorMatching:JSON.stringify(facts()) === JSON.stringify(successorFacts)};
  },ids);
  expect(out.expected).toMatchObject({pursuit:ids.target,advance:ids.target});
  expect(out.restored).toEqual(out.expected);
  expect(out.formations).toEqual([
    {goals:{risk_main:ids.target,risk_saved_detachment:ids.target},matching:true,clocks:true},
    {goals:{risk_main:ids.home,risk_saved_detachment:ids.home},matching:true,clocks:true}
  ]);
  expect(out).toMatchObject({clocks:{rng:true,uid:true},routeRetained:true,successorMatching:true,
    successor:{changed:true,staleAim:true,pure:true,adjustments:['trait:craven']}});
  expect(out.successor.margin).toBeCloseTo(1.21);
});
