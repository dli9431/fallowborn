'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const learned = require('../fixtures/authoring/ai-investment-learned.json');

dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/traits.js','data/ambitions.js','data/map_data.js',
  'js/ai_decisions.js','js/fortifications.js','js/fort_profiles.js','js/building_profiles.js',
  'js/world.js','js/actions.js','js/agency.js','js/model.js','js/treasury.js','js/technology.js',
  'js/home_authority.js','js/lordships.js','js/settlement.js','js/mods.js','js/save.js','js/save_v4.js',
  'tests/e2e/fixtures/authoring/ai-investment-learned.json',
  'tests/e2e/fixtures/authoring/ai-investment-guarded.json'
]);

async function begin(page,info,kind) {
  await openGame(page,info);
  if (kind) {
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/ai-investment-'+kind+'.json'));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await startDeterministicGame(page);
}

async function stage(page) {
  return page.evaluate(function () {
    const s = FB.state;
    const rid = Object.keys(s.realms).sort().find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        FB.world.byId[s.realms[id].capital].terrain !== 'desert' &&
        FB.realmRulerCharacterSnapshot(s,id) && FB.realmHeldCounties(s,id).length >= 3 &&
        Object.keys(s.realms[id].succession.members).length > 2 && FB.governments.forRealm(s,id).id === 'territorial';
    });
    if (!rid) throw new Error('Investment fixture needs an ordinary landed ruler');
    const r = s.realms[rid],pid = r.capital;
    const other = FB.realmHeldCounties(s,rid).filter(function (id) { return id !== pid; }).sort()[0];
    s.armies = []; s.greatHolyWar = null;
    Object.keys(s.realms).forEach(function (id) {
      const realm = s.realms[id]; realm.fortProjectYear = s.date.year;
      if (realm.treasury) { realm.treasury.gold = 0; realm.treasury.militaryAccrued = 0; }
    });
    r.treasury.gold = 100000; r.fortWorks = 400; r.fortWorksYear = s.date.year; delete r.fortProjectYear;
    [pid,other].forEach(function (id) { s.buildings[id] = []; s.dev[id] = 10; FB.invalidateBuildingIndex(s,id); });
    FB.realmRulerCharacterSnapshot(s,rid).traits = [];
    FB.ensureAgency(s); s.agency.rulerAims[rid] = {id:'secure_dynasty',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
    return {rid:rid,pid:pid,other:other};
  });
}

test('built-in traits and current aims rank the same affordable role candidates without mutation or RNG',async function ({page},info) {
  await begin(page,info);
  const ids = await stage(page);
  const out = await page.evaluate(function (args) {
    const s = FB.state,P = FB.aiDecisions,rid = args.ids.rid,pid = args.ids.pid;
    FB.mods.apply({buildings:args.buildings});
    const entries = Object.keys(args.buildings).filter(function (id) { return id !== 'investment_work'; })
      .sort().map(function (id) { return {id:id,order:10,profileId:null}; });
    const eligible = entries.every(function (e) { return FB.aiCanBuildAt(s,rid,pid,0,e.id) &&
      FB.buildCost(s,pid,e.id,rid) < FB.treasuryAvailable(s,rid); });
    const c = FB.realmRulerCharacterSnapshot(s,rid),choices = {},pure = [];
    ['greedy','literate','zealous','craven','brave'].forEach(function (trait) {
      c.traits = [trait,trait];
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      choices[trait] = P.buildingPriorities(s,rid,pid,entries)[0].id;
      pure.push(before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter());
    });
    c.traits = [];
    const aims = {};
    ['amass_wealth','defend_faith','expand_realm','keep_peace'].forEach(function (aim) {
      s.agency.rulerAims[rid].id = aim; aims[aim] = P.buildingPriorities(s,rid,pid,entries)[0].id;
    });
    FB.mods.apply({balance:{aiInvestmentPolicy:'ordinary_investment'}});
    return {eligible:eligible,choices:choices,aims:aims,pure:pure.every(Boolean),
      neutral:P.buildingPriorities(s,rid,pid,entries)[0].id,baseline:entries[0].id};
  },{ids:ids,buildings:learned.buildings});
  expect(out).toMatchObject({eligible:true,pure:true,choices:{greedy:'investment_coin',literate:'investment_study',
    zealous:'investment_worship',craven:'investment_shelter',brave:'investment_drill'},
    aims:{amass_wealth:'investment_coin',defend_faith:'investment_worship',expand_realm:'investment_drill',keep_peace:'investment_shelter'}});
  expect(out.neutral).toBe(out.baseline);
});

for (const kind of ['learned','guarded']) {
  test(kind+' JSON import selects and pays for one profile, retaining building and fort budgets on matching restore',async function ({page},info) {
    await begin(page,info,kind);
    const ids = await stage(page);
    const out = await page.evaluate(function (ids) {
      let s = FB.state; const rid = ids.rid,pid = ids.pid,r = s.realms[rid];
      const choices = FB.buildingProfiles.aiChoices(s,{kind:'realm',id:rid},pid,0,'investment_work');
      const q = choices[0],gold = FB.treasuryAvailable(s,rid),works = r.fortWorks;
      const reserve = FB.treasuryConstructionReserves(s)[rid];
      const original = FB.aiCanBuildAt;
      FB.aiCanBuildAt = function (state,realm,county,slot,id) {
        const actorId = typeof realm === 'string' ? realm : realm.kind === 'realm' && realm.id;
        return actorId === rid && county === pid && id === 'investment_work' && original.apply(FB,arguments);
      };
      try { FB.aiBuildingsYear(s); } finally { FB.aiCanBuildAt = original; }
      const purchased = s.buildings[pid].filter(function (b) { return b.id === 'investment_work'; });
      const afterBuildingGold = FB.treasuryAvailable(s,rid),separateWorks = r.fortWorks === works;
      const exact = afterBuildingGold === gold-q.cost;
      const tech = FB.realmTechRecord(s,rid);
      tech.completed = FB.fortLevelDef(1).requiresTech.slice(); FB.invalidateTechBonuses();
      // Other held counties are made ineligible through the ordinary active-project guard.
      FB.realmHeldCounties(s,rid).forEach(function (county) {
        if (county !== pid) { s.buildings[county] = [{id:'walls',s:0,level:4}]; FB.invalidateBuildingIndex(s,county); }
      });
      const beforeFortGold = FB.treasuryAvailable(s,rid);
      FB.fortAIYear(s);
      const fort = FB.fortAt(s,pid),afterWork = r.fortWorks;
      FB.fortAIYear(s);
      const once = afterWork === r.fortWorks;
      const before = {assets:JSON.parse(JSON.stringify(s.buildings[pid])),gold:FB.treasuryAvailable(s,rid),works:r.fortWorks,
        projectYear:r.fortProjectYear,inputs:FB.aiDecisions.inputs(s,rid),signature:FB.mods.sig()};
      const rng = FB.getRngState(),uid = FB.getUidCounter(),saved = JSON.parse(FB.save.serialize());
      FB.save.restore(saved); s = FB.state;
      const matching = before.gold === FB.treasuryAvailable(s,rid) &&
        before.works === s.realms[rid].fortWorks && before.projectYear === s.realms[rid].fortProjectYear &&
        JSON.stringify(before.inputs) === JSON.stringify(FB.aiDecisions.inputs(s,rid)) && before.signature === FB.mods.sig() &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
      FB.fortAIYear(s);
      return {profile:q.profileId,purchased:purchased.length,selected:purchased[0] && purchased[0].buildingProfile.id,
        exact:exact,reserved:afterBuildingGold >= reserve+q.def.upkeep*FBDATA.balance.realmReserveSeasons,
        separateWorks:separateWorks,fort:fort && fort.targetLevel,workSpent:works-afterWork,
        workCost:FB.fortLevelDef(1).work,noCash:beforeFortGold === before.gold,once:once,matching:matching,
        beforeAssets:before.assets,restoredAssets:s.buildings[pid],
        noReplay:before.works === s.realms[rid].fortWorks};
    },ids);
    expect(out).toMatchObject({profile:'investment_'+kind,purchased:1,selected:'investment_'+kind,exact:true,reserved:true,
      separateWorks:true,fort:1,noCash:true,once:true,matching:true,noReplay:true});
    expect(out.workSpent).toBe(out.workCost);
    expect(out.restoredAssets).toEqual(out.beforeAssets);
  });
}

test('annual construction preserves insolvency, reserves, technology, physical site, contest and player exclusions',async function ({page},info) {
  await begin(page,info,'learned');
  const ids = await stage(page);
  const out = await page.evaluate(function (ids) {
    const initial = JSON.stringify(FB.state),rid = ids.rid,pid = ids.pid;
    const original = FB.aiCanBuildAt,rows = {},base = Object.assign({},FBDATA.buildings.investment_work);
    FB.aiCanBuildAt = function (state,realm,county,slot,id) {
      const actorId = typeof realm === 'string' ? realm : realm.kind === 'realm' && realm.id;
      return actorId === rid && county === pid && id === 'investment_work' && original.apply(FB,arguments);
    };
    try {
      ['insolvent','reserve','technology','physical','contested','player','limit'].forEach(function (mode) {
        const s = JSON.parse(initial),r = s.realms[rid];
        // Clone the original world state for each independent boundary.
        FB.invalidateBuildingIndex(s,pid);
        const building = Object.assign({},base);
        const balance = {aiMaxBuildingsPerYear:mode === 'limit' ? 0 : 1};
        if (mode === 'technology') building.requiresTech = 'paper_scholarship';
        if (mode === 'physical') building.terrains = ['desert'];
        FB.mods.apply({buildings:{investment_work:building},balance:balance});
        if (mode === 'technology') { FB.realmTechRecord(s,rid).completed = []; FB.invalidateTechBonuses(); }
        if (mode === 'insolvent') r.treasury.gold = 0;
        if (mode === 'reserve') r.treasury.gold = FB.treasuryConstructionReserves(s)[rid]+1;
        if (mode === 'contested') s.greatHolyWar = {occupations:{}};
        if (mode === 'contested') s.greatHolyWar.occupations[pid] = {progress:1};
        if (mode === 'player') {
          s.player.tier = 7; s.player.provs = [pid]; s.player.provinceId = pid;
          FB.foundPlayerRealm(s);
        }
        const gold = FB.treasuryAvailable(s,rid),assets = JSON.stringify(s.buildings[pid]);
        FB.aiBuildingsYear(s);
        rows[mode] = gold === FB.treasuryAvailable(s,rid) && assets === JSON.stringify(s.buildings[pid]);
      });
    } finally { FB.aiCanBuildAt = original; }
    return rows;
  },ids);
  expect(out).toEqual({insolvent:true,reserve:true,technology:true,physical:true,contested:true,player:true,limit:true});
});

test('fort preferences compare incremental real defenses, preserve work and technology gates, and ignore player counties',async function ({page},info) {
  await begin(page,info);
  const ids = await stage(page);
  const out = await page.evaluate(function (ids) {
    const initial = JSON.stringify(FB.state),rid = ids.rid,results = {};
    ['amass_wealth','strengthen_crown','craven','no_work','no_tech','contested','player'].forEach(function (mode) {
      const s = JSON.parse(initial),r = s.realms[rid];
      FB.realmHeldCounties(s,rid).forEach(function (pid) {
        s.buildings[pid] = [{id:'walls',s:0,level:pid === ids.pid ? 1 : pid === ids.other ? 2 : 4}];
        FB.invalidateBuildingIndex(s,pid);
      });
      const tech = FB.realmTechRecord(s,rid);
      tech.completed = mode === 'no_tech' ? [] : [].concat(FB.fortLevelDef(1).requiresTech,
        FB.fortLevelDef(2).requiresTech,FB.fortLevelDef(3).requiresTech);
      FB.invalidateTechBonuses();
      s.agency.rulerAims[rid].id = mode === 'strengthen_crown' ? mode : 'amass_wealth';
      if (mode === 'craven') FB.realmRulerCharacterSnapshot(s,rid).traits = ['craven'];
      if (mode === 'no_work') r.fortWorks = 0;
      if (mode === 'contested') {
        s.greatHolyWar = {occupations:{}};
        [ids.pid,ids.other].forEach(function (pid) { s.greatHolyWar.occupations[pid] = {occupied:true}; });
      }
      if (mode === 'player') {
        s.player.tier = 7; s.player.provs = [ids.pid,ids.other]; s.player.provinceId = ids.pid;
        FB.foundPlayerRealm(s);
      }
      const before = r.fortWorks,gold = FB.treasuryAvailable(s,rid);
      FB.fortAIYear(s);
      const projects = [ids.pid,ids.other].filter(function (pid) { return !!FB.fortAt(s,pid).targetLevel; });
      results[mode] = {pid:projects[0] || null,count:projects.length,spent:before-r.fortWorks,
        cash:gold === FB.treasuryAvailable(s,rid)};
    });
    return results;
  },ids);
  expect(out.amass_wealth).toEqual({pid:ids.pid,count:1,spent:120,cash:true});
  expect(out.strengthen_crown).toEqual({pid:ids.other,count:1,spent:220,cash:true});
  expect(out.craven).toEqual({pid:ids.other,count:1,spent:220,cash:true});
  for (const mode of ['no_work','no_tech','contested','player']) expect(out[mode]).toEqual({pid:null,count:0,spent:0,cash:true});
});

test('detached malformed preference imports do not publish or mutate data, state, RNG or ids',async function ({page},info) {
  await begin(page,info);
  const out = await page.evaluate(function () {
    const P = FB.aiDecisions,before = JSON.stringify(FBDATA),state = JSON.stringify(FB.state),rng = FB.getRngState(),uid = FB.getUidCounter();
    const failures = [];
    [function (d) { d.benefitWeights = {invented_output:1}; },
      function (d) { d.adjustments[0].buildingRoleWeights = {invented_role:1}; },
      function (d) { d.adjustments[0].id = 'missing_trait'; },
      function (d) { d.adjustments[0].benefitWeights = {tax:101}; },
      function (d) { d.family = 'war'; }].forEach(function (change) {
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ruler_investment)); change(d);
      try { FB.mods.apply({aiDecisionPolicies:{broken_investment:d}}); failures.push(false); } catch (e) { failures.push(true); }
    });
    const policy = P.compile('ruler_investment'),a = P.report(policy,[],{traits:['greedy','greedy'],aim:'amass_wealth'});
    const b = P.report(policy,[],{traits:['greedy'],aim:'amass_wealth'});
    return {failures:failures,once:JSON.stringify(a.investment) === JSON.stringify(b.investment),
      pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toEqual({failures:[true,true,true,true,true],once:true,pure:true});
});

test('fort ordered and weighted policies preserve canonical work and exact choice draws',async function ({page},info) {
  await begin(page,info);
  const ids = await stage(page);
  const out = await page.evaluate(function (ids) {
    const initial = JSON.stringify(FB.state),rid = ids.rid,rows = {};
    ['ordered','zero','weighted'].forEach(function (mode) {
      const s = JSON.parse(initial),r = s.realms[rid];
      FB.realmHeldCounties(s,rid).forEach(function (pid) {
        s.buildings[pid] = [{id:'walls',s:0,level:pid === ids.pid ? 1 : pid === ids.other ? 2 : 4}];
        FB.invalidateBuildingIndex(s,pid);
      });
      FB.realmTechRecord(s,rid).completed = [].concat(FB.fortLevelDef(1).requiresTech,
        FB.fortLevelDef(2).requiresTech,FB.fortLevelDef(3).requiresTech);
      FB.invalidateTechBonuses();
      const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_investment));
      d.benefitWeights = {garrison:1}; d.mode = mode === 'ordered' ? 'ordered' : 'weighted';
      d.order = mode === 'ordered' ? [{metric:'cost',direction:'desc'}] : [];
      d.weights = mode === 'ordered' ? {} : {score:mode === 'zero' ? 0 : 1};
      FB.mods.apply({aiDecisionPolicies:{mode_investment:d},balance:{aiInvestmentPolicy:'mode_investment'}});
      const original = FB.rng,rng = FB.getRngState(); let draws = 0;
      FB.rng = function () { draws++; return original(); };
      try { FB.fortAIYear(s); } finally { FB.rng = original; }
      const projects = [ids.pid,ids.other].filter(function (pid) { return FB.fortAt(s,pid).targetLevel; });
      rows[mode] = {count:projects.length,pid:projects[0] || null,draws:draws,
        unchanged:FB.getRngState() === rng,
        exact:400-r.fortWorks === (projects.length ? FB.fortLevelDef(FB.fortAt(s,projects[0]).targetLevel).work : 0)};
    });
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_investment));
    d.benefitWeights = {tax:95}; d.adjustments = [
      {kind:'trait',id:'greedy',multiply:{},benefitWeights:{tax:20}},
      {kind:'aim',id:'amass_wealth',multiply:{},benefitWeights:{tax:-10}}];
    FB.mods.apply({aiDecisionPolicies:{bounded_investment:d}});
    const projection = FB.aiDecisions.report(FB.aiDecisions.compile('bounded_investment'),[],
      {traits:['greedy','greedy'],aim:'amass_wealth'});
    return {rows:rows,bounded:projection.investment.benefitWeights.tax};
  },ids);
  expect(out.rows.ordered).toEqual({count:1,pid:ids.other,draws:0,unchanged:true,exact:true});
  expect(out.rows.zero).toEqual({count:0,pid:null,draws:0,unchanged:true,exact:true});
  expect(out.rows.weighted).toMatchObject({count:1,draws:1,unchanged:false,exact:true});
  expect(out.bounded).toBe(100);
});

test('investment inputs discard a predecessor trait and aim after real succession',async function ({page},info) {
  await begin(page,info,'learned');
  const ids = await stage(page);
  const out = await page.evaluate(function (ids) {
    const s = FB.state,P = FB.aiDecisions,rid = ids.rid;
    const old = FB.realmRulerCharacterSnapshot(s,rid),generation = FB.realmRulerGeneration(s,rid);
    old.traits = ['greedy']; s.agency.rulerAims[rid].id = 'amass_wealth';
    const before = P.report(P.resolve(s,rid,'investment'),[],P.inputs(s,rid));
    FB.killChar(s,old);
    const current = FB.realmRulerCharacterSnapshot(s,rid); current.traits = [];
    s.agency.rulerAims[rid] = {id:'amass_wealth',generation:generation,sinceYear:s.date.year};
    const state = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    const inputs = P.inputs(s,rid),after = P.report(P.resolve(s,rid,'investment'),[],inputs);
    return {changed:current.id !== old.id && FB.realmRulerGeneration(s,rid) > generation,
      original:before.adjustments,stale:inputs.aim !== 'amass_wealth',trait:after.adjustments.indexOf('trait:greedy') < 0,
      pure:state === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },ids);
  expect(out).toEqual({changed:true,original:['trait:greedy','aim:amass_wealth'],stale:true,trait:true,pure:true});
});
