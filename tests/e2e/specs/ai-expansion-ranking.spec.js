'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/ambitions.js','data/traits.js','data/political_institutions.js','data/eras.js',
  'data/counties.js','data/map_data.js','js/station.js','js/politics.js','js/papacy.js',
  'js/ai_decisions.js','js/wars.js','js/world.js','js/agency.js','js/model.js','js/authority.js',
  'js/government_ai.js','js/governments.js','js/balance.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/main.js','js/util.js',
  'tests/e2e/fixtures/authoring/ai-expansion-consolidation.json',
  'tests/e2e/fixtures/authoring/ai-expansion-wealth.json'
]);

async function begin(page,testInfo,file) {
  await openGame(page,testInfo);
  if (file) {
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',file));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await startDeterministicGame(page);
}

// Use actual county topology and canonical rights, previews and declarations.
// The compact target sorts after the outward target by id and has two contacts.
async function stageFrontier(page,mode) {
  return page.evaluate(function (mode) {
    const s = FB.state;
    FB.ordinaryWars(s).forEach(function (w) { FB.settleOrdinaryWar(s,w.id,'invalid'); });
    s.truces = {}; s.alliances = []; s.greatHolyWar = null;
    s.rebellions = {groups:{},warnings:{},cooldowns:{}};
    s.player.tier = 7; s.player.liege = null; s.player.provs = [s.player.provinceId];
    FB.foundPlayerRealm(s);
    const actors = Object.keys(s.realms).sort().filter(function (id) {
      return id !== 'player' && s.realms[id].alive && FB.realmRulerCharacterSnapshot(s,id) &&
        FB.governments.forRealm(s,id).id === 'territorial';
    }).slice(0,3);
    if (actors.length !== 3) throw new Error('Three territorial rulers required');
    let ids;
    Object.keys(FB.world.byId).sort().some(function (home) {
      const dj = FB.dejureOf(home),adj = FB.world.adj[home] || {};
      if (!dj.duchy || !dj.kingdom) return false;
      return Object.keys(adj).sort().some(function (compact) {
        if (FB.dejureOf(compact).duchy !== dj.duchy) return false;
        return Object.keys(adj).sort().some(function (outward) {
          const other = FB.dejureOf(outward);
          if (compact <= outward || other.kingdom !== dj.kingdom || other.duchy === dj.duchy) return false;
          const extra = Object.keys(FB.world.adj[compact] || {}).sort().find(function (pid) {
            return pid !== home && pid !== outward && FB.dejureOf(pid).duchy === dj.duchy &&
              !(FB.world.adj[outward] || {})[pid];
          });
          if (!extra) return false;
          ids = {rid:actors[0],enemy:actors[1],other:actors[2],home:home,extra:extra,
            compact:compact,outward:outward,kingdom:dj.kingdom};
          return true;
        });
      });
    });
    if (!ids) throw new Error('No two-contact consolidation frontier in the real map');
    Object.keys(s.owner).forEach(function (pid) { s.owner[pid] = 'player'; s.holder[pid] = 'player'; });
    actors.forEach(function (id) {
      const r = s.realms[id]; r.liege = mode === 'vassal' ? 'player' : null; r.favor = 0;
      r.rank = id === ids.rid ? 3 : 1;
      delete r.ruler.personality;
    });
    s.realms[ids.rid].capital = ids.home;
    s.realms[ids.enemy].capital = ids.compact;
    s.realms[ids.other].capital = ids.outward;
    [ids.home,ids.extra,ids.compact,ids.outward].forEach(function (pid) {
      const holder = pid === ids.compact ? ids.enemy : pid === ids.outward ? ids.other : ids.rid;
      s.holder[pid] = holder; s.owner[pid] = mode === 'vassal' ? 'player' : holder;
      s.dev[pid] = pid === ids.outward ? 30 : pid === ids.compact ? 3 : 40;
      FB.setCountySupport(s,pid,100);
    });
    s.warLaws = {};
    Object.keys(s.realms).forEach(function (id) {
      if (id !== ids.enemy && id !== ids.other && id !== ids.rid)
        s.truces[JSON.stringify([id,ids.rid].sort())] = s.turn+720;
    });
    FB.invalidateRealmCache();
    FB.realmRulerCharacterSnapshot(s,ids.rid).traits = [];
    FB.ensureAgency(s);
    s.agency.rulerAims[ids.rid] = {id:'secure_dynasty',generation:FB.realmRulerGeneration(s,ids.rid),sinceYear:s.date.year};
    const eager = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    eager.parameters.chance = 1; eager.parameters.minimumStrengthRatio = 0; eager.parameters.aggressionAppetite = 10;
    eager.adjustments = [];
    FB.mods.apply({aiDecisionPolicies:{frontier_willingness:eager},balance:{aiWarPolicy:'frontier_willingness'}});
    const facts = FB.aiExpansionFacts(s,ids.rid,[ids.compact,ids.outward],FB.realmTerritory(s,ids.rid));
    if (facts[ids.compact].contacts !== 2 || facts[ids.outward].contacts !== 1 ||
        facts[ids.compact].consolidationBand !== 0 || facts[ids.outward].consolidationBand !== 1)
      throw new Error('Frontier did not stage distinct consolidation and compactness facts');
    [ids.compact,ids.outward].forEach(function (pid) {
      const cause = Object.assign({enemy:pid === ids.compact ? ids.enemy : ids.other},FB.territorialWarRights(s,ids.rid,pid)[0]);
      if (!cause.type || !FB.warDeclarationPreview(s,ids.rid,[cause]).valid) throw new Error('Both frontier claims must be legal');
    });
    window.expansionIds = ids;
    return ids;
  },mode);
}

test('pure strategic order accounts for every geographic fact, defender strength, aims and stable ties',async function ({page},testInfo) {
  await begin(page,testInfo);
  const out = await page.evaluate(function () {
    const P = FB.aiDecisions,policy = P.compile('strategic_expansion');
    const base = {aggression:0,consolidationBand:1,core:1,remaining:5,contacts:1,development:4,defensiveStrength:20};
    const snapshot = JSON.stringify(FB.state),data = JSON.stringify(FBDATA),rng = FB.getRngState(),uid = FB.getUidCounter();
    function pick(a,b,aim) {
      return P.pick(P.report(policy,[{id:'b',eligible:true,facts:a},{id:'a',eligible:true,facts:b}],{traits:[],aim:aim || null}));
    }
    const rows = [['consolidationBand',0],['core',0],['remaining',1],['contacts',2],['defensiveStrength',10],['development',8]];
    const wins = rows.map(function (row) { const facts = Object.assign({},base); facts[row[0]] = row[1]; return pick(facts,base); });
    const compact = Object.assign({},base,{consolidationBand:0,core:1,contacts:2,defensiveStrength:30});
    const wealthy = Object.assign({},base,{core:0,development:30,defensiveStrength:10});
    const aims = [null,'expand_realm','amass_wealth','keep_peace','strengthen_crown'].map(function (aim) { return pick(compact,wealthy,aim); });
    return {wins:wins,aims:aims,tie:pick(base,base),neutral:P.compile('ordinary_expansion').definition.order,
      pure:snapshot === JSON.stringify(FB.state) && data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toEqual({wins:['b','b','b','b','b','b'],aims:['b','b','a','a','a'],tie:'a',
    neutral:[{metric:'aggression',direction:'asc'}],pure:true});
});

for (const mode of ['sovereign','vassal']) {
  test(mode+' live frontier consolidates before county id and changes objective with the current aim',async function ({page},testInfo) {
    await begin(page,testInfo);
    const ids = await stageFrontier(page,mode);
    const out = await page.evaluate(function () {
      const original = FB.state,ids = expansionIds;
      function run(aim) {
        const s = JSON.parse(JSON.stringify(original)); s.agency.rulerAims[ids.rid].id = aim;
        FB.invalidateRealmCache(); FB.setRngState(73);
        const facts = FB.aiExpansionFacts, strength = FB.realmStrength, territory = FB.realmTerritory;
        let projections = 0; const calls = {},scans = {};
        FB.aiExpansionFacts = function () { projections++; return facts.apply(FB,arguments); };
        FB.realmStrength = function (state,rid) { calls[rid] = (calls[rid] || 0)+1; return strength(state,rid); };
        FB.realmTerritory = function (state,rid) { scans[rid] = (scans[rid] || 0)+1; return territory(state,rid); };
        try { FB.realmCampaignAI(s,ids.rid); } finally { FB.aiExpansionFacts = facts; FB.realmStrength = strength; FB.realmTerritory = territory; }
        return {wars:FB.realmWars(s,ids.rid).map(function (w) { return {target:w.target,defender:w.defender,type:w.casus.type}; }),
          projections:projections,calls:calls,scans:scans,rng:FB.getRngState()};
      }
      return {compact:run('secure_dynasty'),wealth:run('amass_wealth'),replay:run('secure_dynasty')};
    });
    expect(out.compact.wars).toEqual([{target:ids.compact,defender:ids.enemy,type:'dejure'}]);
    expect(out.wealth.wars).toEqual([{target:ids.outward,defender:ids.other,type:'dejure'}]);
    expect(out.compact.projections).toBe(1);
    expect(out.compact.calls[ids.other]).toBe(1);
    expect(out.compact.calls[ids.enemy]).toBe(2);
    expect(out.compact.scans[ids.rid]).toBeLessThanOrEqual(mode === 'vassal' ? 8 : 5);
    expect(out.replay).toEqual(out.compact);
  });
}

for (const config of [{file:'ai-expansion-consolidation.json',target:'compact'},{file:'ai-expansion-wealth.json',target:'outward'}]) {
  test(config.file+' varies live objectives through the ordinary JSON file importer',async function ({page},testInfo) {
    await begin(page,testInfo,config.file);
    const ids = await stageFrontier(page,'sovereign');
    const out = await page.evaluate(function () {
      const s = FB.state,ids = expansionIds,P = FB.aiDecisions;
      const policy = P.resolve(s,ids.rid,'expansion');
      const facts = FB.aiExpansionFacts(s,ids.rid,[ids.compact,ids.outward],FB.realmTerritory(s,ids.rid));
      const report = P.report(policy,[ids.compact,ids.outward].map(function (pid) {
        return {id:pid,eligible:true,facts:Object.assign(facts[pid],{aggression:0,defensiveStrength:pid === ids.compact ? 3 : 30})};
      }),P.inputs(s,ids.rid));
      FB.setRngState(73); FB.realmCampaignAI(s,ids.rid);
      return {target:FB.realmWars(s,ids.rid)[0].target,policy:policy.id,weights:report.ranking.map(function (r) { return r.weight; }),signature:FB.mods.sig()};
    });
    expect(out.target).toBe(ids[config.target]);
    expect(out.signature).toBeTruthy();
    expect(out.policy).toBe(config.target === 'compact' ? 'compact_frontier' : 'developed_frontier');
    if (config.target === 'outward') expect(out.weights).toEqual([0,20]);
  });
}

test('lawful claims stay ahead of custom aggression weights and zero lawful weight declines',async function ({page},testInfo) {
  await begin(page,testInfo);
  const ids = await stageFrontier(page,'sovereign');
  const out = await page.evaluate(function () {
    const s = FB.state,ids = expansionIds;
    s.realms[ids.rid].rank = 2;
    const d = {family:'expansion',mode:'weighted',parameters:{},order:[],weights:{aggression:100},bias:1,tieBreak:'input',adjustments:[]};
    FB.mods.apply({aiDecisionPolicies:{aggressive_preference:d},balance:{aiExpansionPolicy:'aggressive_preference'}});
    function run() {
      const other = JSON.parse(JSON.stringify(s)); FB.invalidateRealmCache(); FB.setRngState(73);
      FB.realmCampaignAI(other,ids.rid);
      return {targets:FB.realmWars(other,ids.rid).map(function (w) { return w.target; }),rng:FB.getRngState()};
    }
    const lawful = FB.territorialWarRights(s,ids.rid,ids.compact).length > 0;
    const aggression = FB.territorialWarRights(s,ids.rid,ids.outward).length === 0;
    const first = run(); d.bias = 0;
    FB.mods.apply({aiDecisionPolicies:{aggressive_preference:d}});
    FB.setRngState(73); FB.chance(1); const afterConsideration = FB.getRngState();
    const empty = run();
    return {first:first,empty:empty,lawful:lawful,aggression:aggression,noChoiceDraw:empty.rng === afterConsideration};
  });
  expect(out.first.targets).toEqual([ids.compact]);
  expect(out.empty.targets).toEqual([]);
  expect(out).toMatchObject({lawful:true,aggression:true,noChoiceDraw:true});
});

test('selection-time changes to rights, defender, frontier, truce or authority fail before declaration',async function ({page},testInfo) {
  await begin(page,testInfo);
  const ids = await stageFrontier(page,'vassal');
  const out = await page.evaluate(function () {
    const original = FB.state,ids = expansionIds,choose = FB.aiDecisions.choose;
    const results = {};
    ['rights','defender','frontier','truce','authority','permission','authority_aggression','permission_aggression'].forEach(function (kind) {
      const s = JSON.parse(JSON.stringify(original)); FB.invalidateRealmCache(); FB.setRngState(73);
      if (kind === 'authority_aggression' || kind === 'permission_aggression') s.realms[ids.rid].rank = 1;
      let selected = null;
      FB.aiDecisions.choose = function (state,rid,family,rows) {
        const id = choose(state,rid,family,rows); selected = id;
        if (kind === 'rights') state.realms[rid].rank = 1;
        if (kind === 'defender') state.holder[id] = ids.other;
        if (kind === 'frontier') [ids.home,ids.extra].forEach(function (pid) { state.holder[pid] = 'player'; });
        if (kind === 'truce') state.truces[JSON.stringify([rid,ids.enemy].sort())] = state.turn+720;
        if (kind.indexOf('authority') === 0 || kind.indexOf('permission') === 0)
          state.warLaws = {player:{internal_peace:{level:kind.indexOf('authority') === 0 ? 'prohibited' : 'permission'}}};
        FB.invalidateRealmCache(); return id;
      };
      const uid = FB.getUidCounter();
      try { FB.realmCampaignAI(s,ids.rid); } finally { FB.aiDecisions.choose = choose; }
      results[kind] = {selected:selected,wars:FB.realmWars(s,ids.rid).length,uid:uid === FB.getUidCounter(),
        permission:!!(s.warPermissionRequests && Object.keys(s.warPermissionRequests).length)};
    });
    return results;
  });
  for (const kind of Object.keys(out)) expect(out[kind],kind).toMatchObject({selected:ids.compact,wars:0,uid:true});
  expect(out.permission.permission).toBe(true);
  expect(out.permission_aggression.permission).toBe(true);
});

test('fresh connected claim packages exclude detached rights and reject ownership changes before commit',async function ({page},testInfo) {
  await begin(page,testInfo);
  const ids = await stageFrontier(page,'sovereign');
  const out = await page.evaluate(function () {
    const s = FB.state,ids = expansionIds;
    const frontier = FB.realmTerritory(s,ids.rid);
    const extension = Object.keys(FB.world.adj[ids.compact] || {}).sort().find(function (pid) {
      return pid !== ids.outward && pid !== ids.home && pid !== ids.extra && FB.dejureOf(pid).kingdom === ids.kingdom &&
        !frontier.some(function (home) { return !!(FB.world.adj[home] || {})[pid]; });
    });
    if (!extension) throw new Error('Connected claim extension beyond the staged frontier required');
    const detached = Object.keys(s.owner).sort().find(function (pid) {
      return FB.dejureOf(pid).kingdom === ids.kingdom && pid !== extension && pid !== ids.compact &&
        pid !== ids.home && pid !== ids.extra && pid !== ids.outward &&
        !(FB.world.adj[ids.compact] || {})[pid] && !(FB.world.adj[extension] || {})[pid];
    });
    if (!detached) throw new Error('A detached lawful county is required');
    [extension,detached].forEach(function (pid) { s.owner[pid] = ids.enemy; s.holder[pid] = ids.enemy; s.dev[pid] = 1; });
    function run(stale) {
      const other = JSON.parse(JSON.stringify(s)),original = FB.claimPackageCandidates;
      FB.invalidateRealmCache(); FB.setRngState(73);
      FB.claimPackageCandidates = function (state,rid,enemy,inspection) {
        const rows = original(state,rid,enemy,inspection);
        if (stale) { state.owner[extension] = ids.other; state.holder[extension] = ids.other; FB.invalidateRealmCache(); }
        return rows;
      };
      const uid = FB.getUidCounter();
      try { FB.realmCampaignAI(other,ids.rid); } finally { FB.claimPackageCandidates = original; }
      return {wars:FB.realmWars(other,ids.rid).map(function (w) { return {type:w.casus.type,targets:w.objectives.map(function (o) { return o.target; }).sort()}; }),
        uid:uid === FB.getUidCounter()};
    }
    return {extension:extension,detached:detached,valid:run(false),stale:run(true)};
  });
  expect(out.valid.wars).toEqual([{type:'claims',targets:[ids.compact,out.extension].sort()}]);
  expect(out.valid.wars[0].targets).not.toContain(out.detached);
  expect(out.stale).toEqual({wars:[],uid:true});
});

test('border inspection caps unique sorted candidates before legal projections',async function ({page},testInfo) {
  await begin(page,testInfo);
  await stageFrontier(page,'sovereign');
  const out = await page.evaluate(function () {
    const s = FB.state,ids = expansionIds,oldAdj = FB.world.adj[ids.home],oldExtra = FB.world.adj[ids.extra];
    const defender = FB.warTargetDefender,seen = [];
    const border = {};
    for (let i=0;i<2100;i++) border['000_budget_'+('0000'+i).slice(-4)] = 1;
    FB.world.adj[ids.home] = border; FB.world.adj[ids.extra] = border;
    FB.warTargetDefender = function (state,rid,pid) { seen.push(pid); return defender(state,rid,pid); };
    try { FB.setRngState(73); FB.realmCampaignAI(s,ids.rid); }
    finally { FB.warTargetDefender = defender; FB.world.adj[ids.home] = oldAdj; FB.world.adj[ids.extra] = oldExtra; }
    return {count:seen.length,unique:new Set(seen).size,first:seen[0],last:seen[seen.length-1],
      sorted:JSON.stringify(seen) === JSON.stringify(seen.slice().sort()),wars:FB.realmWars(s,ids.rid).length};
  });
  expect(out).toEqual({count:2048,unique:2048,first:'000_budget_0000',last:'000_budget_2047',sorted:true,wars:0});
});

test('detached expansion weights and aim orders validate without publishing malformed imports',async function ({page},testInfo) {
  await begin(page,testInfo,'ai-expansion-wealth.json');
  const out = await page.evaluate(function () {
    const P = FB.aiDecisions,s = FB.state;
    const data = JSON.stringify(FBDATA),state = JSON.stringify(s),signature = FB.mods.sig(),rng = FB.getRngState(),uid = FB.getUidCounter();
    const weighted = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.developed_frontier));
    weighted.weights = {development:-1,contacts:10};
    const candidate = {aiDecisionPolicies:{independent_frontier:weighted}};
    const valid = FB.mods.validate(candidate);
    const detached = Object.assign({},FBDATA,{aiDecisionPolicies:Object.assign({},FBDATA.aiDecisionPolicies,candidate.aiDecisionPolicies)});
    const report = P.report(P.compile('independent_frontier',detached),[
      {id:'compact',eligible:true,facts:{development:3,contacts:2}},
      {id:'wealth',eligible:true,facts:{development:30,contacts:1}}
    ]);
    const malformed = [];
    function reject(d) {
      const mod = {aiDecisionPolicies:{invalid_frontier:d}},faults = FB.mods.validate(mod);
      let refused = false; try { FB.mods.apply(mod); } catch (error) { refused = true; }
      malformed.push(faults.length > 0 && refused);
    }
    const ordered = FBDATA.aiDecisionPolicies.strategic_expansion;
    let bad = JSON.parse(JSON.stringify(ordered)); bad.aimOrders.unknown_aim = bad.order; reject(bad);
    bad = JSON.parse(JSON.stringify(ordered)); bad.aimOrders.keep_peace = [{metric:'gold',direction:'desc'}]; reject(bad);
    bad = JSON.parse(JSON.stringify(ordered)); bad.aimOrders.keep_peace = [bad.order[0],bad.order[0]]; reject(bad);
    bad = JSON.parse(JSON.stringify(ordered)); bad.aimOrders.keep_peace = []; reject(bad);
    bad = JSON.parse(JSON.stringify(weighted)); bad.aimOrders = ordered.aimOrders; reject(bad);
    bad = JSON.parse(JSON.stringify(weighted)); bad.weights.development = 101; reject(bad);
    const foreign = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_tactics)); foreign.mode = 'ordered';
    foreign.order = [{metric:'distance',direction:'asc'}]; foreign.aimOrders = {keep_peace:foreign.order}; reject(foreign);
    let missing = false;
    try { P.report(P.compile('strategic_expansion'),[{id:'missing',eligible:true,facts:{development:1}}],{aim:'amass_wealth'}); }
    catch (error) { missing = true; }
    return {valid:valid,weights:report.ranking.map(function (r) { return r.weight; }),choice:P.pick(report,0.5),malformed:malformed,missing:missing,
      pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(s) && signature === FB.mods.sig() && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toEqual({valid:[],weights:[17,0],choice:'compact',malformed:[true,true,true,true,true,true,true],missing:true,pure:true});
});

test('matching imported save restores ranking and real succession discards the predecessor aim',async function ({page},testInfo) {
  await begin(page,testInfo,'ai-expansion-consolidation.json');
  const out = await page.evaluate(function () {
    let s = FB.state; const P = FB.aiDecisions;
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmRulerCharacterSnapshot(s,id) &&
        Object.keys(s.realms[id].succession.members).length > 2 && FB.governments.forRealm(s,id).id === 'territorial';
    });
    const generation = FB.realmRulerGeneration(s,rid),old = FB.realmRulerCharacterSnapshot(s,rid);
    FB.ensureAgency(s); s.agency.rulerAims[rid] = {id:'amass_wealth',generation:generation,sinceYear:s.date.year};
    const rows = [{id:'compact',eligible:true,facts:{aggression:0,consolidationBand:0,core:0,remaining:1,contacts:2,development:3,defensiveStrength:3}},
      {id:'wealth',eligible:true,facts:{aggression:0,consolidationBand:1,core:0,remaining:8,contacts:1,development:30,defensiveStrength:30}}];
    function facts() { return {inputs:P.inputs(FB.state,rid),choice:P.choose(FB.state,rid,'expansion',rows),signature:FB.mods.sig()}; }
    const before = facts(),saved = JSON.parse(FB.save.serialize()),rng = FB.getRngState(),uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const matching = JSON.stringify(facts()) === JSON.stringify(before) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.killChar(s,FB.realmRulerCharacterSnapshot(s,rid));
    const current = FB.realmRulerCharacterSnapshot(s,rid); current.traits = [];
    s.agency.rulerAims[rid] = {id:'amass_wealth',generation:generation,sinceYear:s.date.year};
    const snapshot = JSON.stringify(s),stale = facts();
    return {before:before.choice,matching:matching,changed:current.id !== old.id && FB.realmRulerGeneration(s,rid) > generation,
      staleAimIgnored:stale.inputs.aim !== 'amass_wealth',choice:stale.choice,pure:snapshot === JSON.stringify(s),
      neutralOrder:P.pick(P.report(P.compile('ordinary_expansion'),[{id:'z',eligible:true,facts:{aggression:1}},
        {id:'b',eligible:true,facts:{aggression:0}},{id:'a',eligible:true,facts:{aggression:0}}]))};
  });
  expect(out).toEqual({before:'wealth',matching:true,changed:true,staleAimIgnored:true,choice:'compact',pure:true,neutralOrder:'a'});
});
