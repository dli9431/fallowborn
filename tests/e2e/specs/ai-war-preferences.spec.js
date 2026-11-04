'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/traits.js','data/ambitions.js','data/modifiers.js','data/map_data.js',
  'data/political_institutions.js','js/ai_decisions.js','js/agency.js','js/model.js','js/world.js',
  'js/government_ai.js','js/governments.js','js/authority.js','js/wars.js','js/balance.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/util.js',
  'js/modifiers.js','js/rebellions.js','js/armies.js','js/treasury.js','js/logistics.js','js/market.js',
  'tests/e2e/fixtures/authoring/ai-war-cautious.json','tests/e2e/fixtures/authoring/ai-war-bold.json'
]);

// Stage two existing neighboring county rulers; preserve the real map and gates.
async function stageFrontier(page,testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  return page.evaluate(function () {
    const s = FB.state;
    FB.ordinaryWars(s).forEach(function (w) { FB.settleOrdinaryWar(s,w.id,'invalid'); });
    s.truces = {}; s.alliances = []; s.greatHolyWar = null;
    s.rebellions = {groups:{},warnings:{},cooldowns:{}};
    s.historicalAmbitions = {};
    s.player.tier = 4; s.player.provs = [s.player.provinceId]; s.player.liege = null;
    FB.foundPlayerRealm(s);
    s.owner[s.player.provinceId] = 'player'; s.holder[s.player.provinceId] = 'player';
    FB.invalidateRealmCache();
    const ids = Object.keys(s.realms).sort().filter(function (id) {
      const r = s.realms[id];
      return id !== 'player' && r.alive && FB.realmRulerCharacterSnapshot(s,id) &&
        FB.realmRank.isCounty(r,s) && FB.realmTerritory(s,id).length === 1 && FB.dejureOf(r.capital).duchy;
    });
    let pair;
    ids.some(function (rid) {
      const home = s.realms[rid].capital;
      return Object.keys(FB.world.adj[home] || {}).sort().some(function (target) {
        const enemy = s.holder[target];
        if (ids.indexOf(enemy) < 0 || enemy === rid || s.realms[enemy].capital !== target ||
            !FB.dejureOf(target).duchy || FB.sameFaithHeadWarPolicy(s,FB.realmReligionId(s,rid),enemy,target)) return false;
        pair = {rid:rid,enemy:enemy,home:home,target:target}; return true;
      });
    });
    if (!pair) throw new Error('No neighboring county rulers for war preference fixture');
    [pair.rid,pair.enemy].forEach(function (id) {
      const r = s.realms[id]; r.liege = null; r.favor = 0;
      s.owner[r.capital] = id; s.holder[r.capital] = id;
      delete r.ruler.personality;
      if (FB.governments.forRealm(s,id).id !== 'territorial' && !FB.authoritySetGovernment(s,id,'territorial'))
        throw new Error('Cannot stage territorial government');
    });
    Object.keys(s.realms).forEach(function (id) {
      if (id !== pair.rid && id !== pair.enemy) s.truces[JSON.stringify([id,pair.rid].sort())] = s.turn+720;
    });
    s.dev[pair.home] = 20; s.dev[pair.target] = 10;
    [pair.home,pair.target].forEach(function (pid) {
      s.modifiers.county[pid] = [];
      if (s.population.counties[pid]) delete s.population.counties[pid].settlementCommunityProjects;
      FB.setCountySupport(s,pid,100);
    });
    FB.invalidateRealmCache(); FB.invalidateFortIndex();
    FB.realmRulerCharacterSnapshot(s,pair.rid).traits = [];
    FB.ensureAgency(s);
    s.agency.rulerAims[pair.rid] = {id:'strengthen_crown',generation:FB.realmRulerGeneration(s,pair.rid),sinceYear:s.date.year};
    FB.treasuryInitialize(s);
    s.realms[pair.rid].treasury.gold = 100000;
    s.realms[pair.rid].treasury.recoverUntil = 0;
    s.armies = []; s.armyDown = {}; s.armyDetachmentDown = {};
    const cause = {type:'aggression',target:pair.target,enemy:pair.enemy};
    if (FB.territorialWarRights(s,pair.rid,pair.target).length || !FB.warDeclarationPreview(s,pair.rid,[cause]).valid)
      throw new Error('Fixture must expose one ordinary aggression opportunity');
    window.warPreferenceIds = pair;
    return pair;
  });
}

test('built-in dispositions project distinct chances and risks without changing eligibility or RNG',async function ({page},testInfo) {
  await stageFrontier(page,testInfo);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions,ids = warPreferenceIds;
    const c = FB.realmRulerCharacterSnapshot(s,ids.rid),rows = {};
    const snapshot = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
    ['honest','ambitious','wrathful','content','kind','patient'].concat(FBDATA.rulerTraits).filter(function (id,i,all) {
      return all.indexOf(id) === i;
    }).forEach(function (trait) {
      c.traits = [trait];
      const before = JSON.stringify(s),report = P.report(P.resolve(s,ids.rid,'war'),[],P.inputs(s,ids.rid));
      const risk = FB.aiAggressionAssessment(s,ids.rid,ids.target,[ids.home]);
      rows[trait] = {chance:FB.governments.call(s,ids.rid,'ai','goals',{}).warChance,
        appetite:report.parameters.aggressionAppetite,margin:report.parameters.minimumStrengthRatio,
        risk:risk.chance,allowed:risk.allowed,pure:before === JSON.stringify(s)};
    });
    c.traits = ['ambitious','ambitious','kind'];
    const combined = P.parameters(s,ids.rid,'war');
    c.traits = [];
    const neutral = P.parameters(s,ids.rid,'war');
    c.traits = ['ambitious','wrathful']; s.realms[ids.rid].ruler.personality = 'bellicose';
    const legacy = {chance:FB.governments.call(s,ids.rid,'ai','goals',{}).warChance,
      risk:FB.aiAggressionAssessment(s,ids.rid,ids.target,[ids.home]).chance};
    c.traits = []; delete s.realms[ids.rid].ruler.personality;
    return {rows:rows,combined:combined,neutral:neutral,legacy:legacy,
      pure:snapshot === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  const expected = {honest:[0.025,1],ambitious:[0.0375,1.25],wrathful:[0.04375,1.4],
    content:[0.0125,0.6],kind:[0.0175,0.7],patient:[0.01875,0.8]};
  for (const trait of Object.keys(out.rows)) {
    const values = expected[trait] || [0.025,1];
    expect(out.rows[trait]).toMatchObject({appetite:values[1],margin:1.2,allowed:true,pure:true});
    expect(out.rows[trait].chance).toBeCloseTo(values[0]);
    expect(out.rows[trait].risk/out.rows.honest.risk).toBeCloseTo(values[1]);
  }
  expect(out.legacy.chance).toBe(0.08);
  expect(out.legacy.risk/out.rows.honest.risk).toBeCloseTo(1.5);
  expect(out.combined.chance).toBeCloseTo(0.02625);
  expect(out.combined.aggressionAppetite).toBeCloseTo(0.875);
  expect(out.neutral).toEqual({chance:0.025,bellicoseChance:0.08,minimumStrengthRatio:1.2,
    maximumCommitments:2,aggressionAppetite:1,bellicoseAppetite:1.5});
  expect(out.pure).toBe(true);
});

test('aims change only the strength margin and do not repeat trait motives',async function ({page},testInfo) {
  await stageFrontier(page,testInfo);
  const out = await page.evaluate(function () {
    const s = FB.state,P = FB.aiDecisions,ids = warPreferenceIds;
    FB.realmRulerCharacterSnapshot(s,ids.rid).traits = ['ambitious'];
    const rows = ['strengthen_crown','expand_realm','keep_peace','amass_wealth'].map(function (aim) {
      s.agency.rulerAims[ids.rid].id = aim;
      const before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      const report = P.report(P.resolve(s,ids.rid,'war'),[],P.inputs(s,ids.rid));
      return {chance:report.parameters.chance,appetite:report.parameters.aggressionAppetite,
        margin:report.parameters.minimumStrengthRatio,applied:report.adjustments,
        pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    return rows;
  });
  for (const [i,margin] of [1.2,1.08,1.5,1.32].entries()) {
    expect(out[i].chance).toBeCloseTo(0.0375);
    expect(out[i].appetite).toBe(1.25);
    expect(out[i].margin).toBeCloseTo(margin);
    expect(out[i].pure).toBe(true);
  }
  expect(out.map(function (r) { return r.applied; })).toEqual([
    ['trait:ambitious'],['trait:ambitious','aim:expand_realm'],
    ['trait:ambitious','aim:keep_peace'],['trait:ambitious','aim:amass_wealth']]);
});

test('seeded consideration differs from declaration and an aim margin filters actual candidates',async function ({page},testInfo) {
  const ids = await stageFrontier(page,testInfo);
  const out = await page.evaluate(function (ids) {
    const s = FB.state,P = FB.aiDecisions,c = FB.realmRulerCharacterSnapshot(s,ids.rid);
    c.traits = ['ambitious'];
    const high = FB.governments.call(s,ids.rid,'ai','goals',{}).warChance;
    const risk = FB.aiAggressionAssessment(s,ids.rid,ids.target,[ids.home]).chance;
    c.traits = ['content'];
    const low = FB.governments.call(s,ids.rid,'ai','goals',{}).warChance;
    let seed = null,rejectSeed = null;
    for (let i=1;i<=5000 && (seed === null || rejectSeed === null);i++) {
      FB.setRngState(i); const consideration = FB.rng(),aggression = FB.rng();
      if (consideration >= low && consideration < high && aggression < risk) seed = i;
      if (consideration < high && aggression >= risk) rejectSeed = i;
    }
    if (seed === null || rejectSeed === null) throw new Error('No bounded declaration seeds');
    function run(trait,aim,selectedSeed,development) {
      const other = JSON.parse(JSON.stringify(s));
      FB.realmRulerCharacterSnapshot(other,ids.rid).traits = [trait];
      other.agency.rulerAims[ids.rid].id = aim;
      if (development) other.dev[ids.home] = development;
      FB.invalidateRealmCache(); FB.setRngState(selectedSeed);
      FB.realmCampaignAI(other,ids.rid);
      return {wars:FB.realmWars(other,ids.rid).map(function (w) { return {attacker:w.attacker,defender:w.defender,
        target:w.target,type:w.casus.type}; }),rng:FB.getRngState(),
        gold:other.realms[ids.rid].treasury.gold,hosts:other.armies.length};
    }
    const ambitious = run('ambitious','strengthen_crown',seed);
    return {ambitious:ambitious,content:run('content','strengthen_crown',seed),
      replay:JSON.stringify(ambitious) === JSON.stringify(run('ambitious','strengthen_crown',seed)),
      riskRefusal:run('ambitious','strengthen_crown',rejectSeed),
      expand:run('ambitious','expand_realm',seed,12),peace:run('ambitious','keep_peace',seed,12)};
  },ids);
  const war = {attacker:ids.rid,defender:ids.enemy,target:ids.target,type:'aggression'};
  expect(out.ambitious.wars).toEqual([war]);
  expect(out.content.wars).toEqual([]);
  expect(out.riskRefusal.wars).toEqual([]);
  expect(out.expand.wars).toEqual([war]);
  expect(out.peace.wars).toEqual([]);
  expect(out.ambitious).toMatchObject({gold:100000,hosts:0});
  expect(out.replay).toBe(true);
});

test('maximum preferences retain truces, commitments, liege permission, support and revolt blockers',async function ({page},testInfo) {
  await stageFrontier(page,testInfo);
  const out = await page.evaluate(function () {
    const s = FB.state,ids = warPreferenceIds,d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    d.parameters.chance = 1; d.parameters.minimumStrengthRatio = 0; d.parameters.aggressionAppetite = 10;
    d.adjustments = [];
    const quiet = Object.assign({},FBDATA.governmentForms.territorial,{strategyParameters:{ai:{warChance:0}}});
    FB.mods.apply({aiDecisionPolicies:{eager_war:d},balance:{aiWarPolicy:'eager_war'},governmentForms:{quiet_war:quiet}});
    function run(kind) {
      const other = JSON.parse(JSON.stringify(s)),r = other.realms[ids.rid];
      FB.realmRulerCharacterSnapshot(other,ids.rid).traits = ['ambitious','wrathful'];
      if (kind === 'truce') other.truces[JSON.stringify([ids.rid,ids.enemy].sort())] = other.turn+720;
      if (kind === 'government' && !FB.authoritySetGovernment(other,ids.rid,'quiet_war')) throw new Error('Cannot stage peaceful form');
      if (kind === 'support') FB.setCountySupport(other,ids.home,-100);
      if (kind === 'targetSupport') FB.setCountySupport(other,ids.target,-100);
      if (kind === 'revolt') {
        const counties = {}; counties[ids.home] = {occupied:false};
        other.rebellions = {groups:{preference_revolt:{id:'preference_revolt',target:ids.rid,counties:counties}},warnings:{},cooldowns:{}};
      }
      if (kind === 'permission' || kind === 'prohibited') {
        r.liege = 'player'; other.owner[ids.home] = 'player'; r.favor = 0;
        other.warLaws = {player:{external_campaigns:{level:kind}}};
      }
      if (kind === 'commitments') {
        [ids.enemy,'player'].forEach(function (enemy) {
          FB.registerOrdinaryWar(other,ids.rid,{enemy:enemy,target:ids.target,casus:{type:'aggression',target:ids.target},legacy:false});
        });
      }
      FB.invalidateRealmCache(); FB.setRngState(73);
      const before = FB.realmWars(other,ids.rid).length,uid = FB.getUidCounter();
      FB.realmCampaignAI(other,ids.rid);
      return {added:FB.realmWars(other,ids.rid).length-before,uid:uid === FB.getUidCounter(),
        request:!!(other.warPermissionRequests && Object.keys(other.warPermissionRequests).length)};
    }
    const results = {};
    ['truce','government','support','targetSupport','revolt','permission','prohibited','commitments'].forEach(function (kind) { results[kind] = run(kind); });
    return results;
  });
  for (const kind of Object.keys(out)) expect(out[kind]).toMatchObject({added:0,uid:true});
  expect(out.permission.request).toBe(true);
});

test('high willingness cannot fund or muster an unsupported host',async function ({page},testInfo) {
  await stageFrontier(page,testInfo);
  const out = await page.evaluate(function () {
    const s = FB.state,ids = warPreferenceIds;
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    d.parameters.chance = 1; d.parameters.aggressionAppetite = 10; d.adjustments = [];
    FB.mods.apply({aiDecisionPolicies:{eager_war:d},balance:{aiWarPolicy:'eager_war'}});
    FB.realmRulerCharacterSnapshot(s,ids.rid).traits = ['ambitious','wrathful'];
    s.realms[ids.rid].treasury.gold = 0;
    FB.setRngState(73); FB.realmCampaignAI(s,ids.rid);
    const declared = FB.realmWars(s,ids.rid).length;
    const host = {id:'review',realm:ids.rid,at:ids.home,men:100,units:{levy:100},supply:100};
    const funded = FB.treasuryApproveHost(s,host,FB.treasuryMilitaryPolicy(s),false,'muster');
    FB.armyTick(s);
    const unfunded = {hosts:s.armies.filter(function (a) { return a.realm === ids.rid; }).length,gold:s.realms[ids.rid].treasury.gold};
    s.realms[ids.rid].treasury.gold = 100000;
    s.realms[ids.rid].treasury.recoverUntil = s.turn+90;
    FB.armyTick(s);
    const recovering = s.armies.filter(function (a) { return a.realm === ids.rid; }).length;
    s.realms[ids.rid].treasury.recoverUntil = 0;
    FB.invalidateRealmCache(); FB.armyTick(s);
    const fundedHosts = s.armies.filter(function (a) { return a.realm === ids.rid; }).length;
    return {declared:declared,funded:funded,unfunded:unfunded,recovering:recovering,fundedHosts:fundedHosts};
  });
  expect(out).toEqual({declared:1,funded:false,unfunded:{hosts:0,gold:0},recovering:0,fundedHosts:1});
});

for (const config of [{file:'ai-war-cautious.json',chance:0.012,appetite:0.77,margin:1.425},
  {file:'ai-war-bold.json',chance:0.0875,appetite:1.43,margin:0.88}]) {
  test(config.file+' replaces dispositions through ordinary JSON import and rejects malformed nonpublication',async function ({page},testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',config.file));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await startDeterministicGame(page);
    const out = await page.evaluate(function () {
      const s = FB.state,P = FB.aiDecisions;
      const rid = Object.keys(s.realms).find(function (id) { return FB.realmRulerCharacterSnapshot(s,id); });
      FB.realmRulerCharacterSnapshot(s,rid).traits = ['ambitious','ambitious'];
      FB.ensureAgency(s); s.agency.rulerAims[rid] = {id:'expand_realm',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
      const report = P.report(P.resolve(s,rid,'war'),[],P.inputs(s,rid));
      const before = JSON.stringify(FBDATA),state = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter(),signature = FB.mods.sig();
      const bad = JSON.parse(JSON.stringify(report.definition)); bad.adjustments[0].multiply.chance = 5;
      const faults = FB.mods.validate({aiDecisionPolicies:{malformed_war:bad}});
      let refused = false;
      try { FB.mods.apply({aiDecisionPolicies:{malformed_war:bad}}); } catch (error) { refused = true; }
      return {parameters:report.parameters,applied:report.adjustments,refused:refused,faults:faults.length > 0,
        pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter() && signature === FB.mods.sig()};
    });
    expect(out.parameters.chance).toBeCloseTo(config.chance);
    expect(out.parameters.aggressionAppetite).toBeCloseTo(config.appetite);
    expect(out.parameters.minimumStrengthRatio).toBeCloseTo(config.margin);
    expect(out).toMatchObject({applied:['trait:ambitious','aim:expand_realm'],refused:true,faults:true,pure:true});
  });
}

test('built-in war preferences restore exactly and succession discards predecessor aims and legacy personality',async function ({page},testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    let s = FB.state;
    const P = FB.aiDecisions,rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege && FB.realmRulerCharacterSnapshot(s,id) &&
        Object.keys(s.realms[id].succession.members).length > 2 && FB.governments.forRealm(s,id).id === 'territorial';
    });
    const old = FB.realmRulerCharacterSnapshot(s,rid),generation = FB.realmRulerGeneration(s,rid);
    old.traits = ['ambitious']; delete s.realms[rid].ruler.personality;
    FB.ensureAgency(s); s.agency.rulerAims[rid] = {id:'keep_peace',generation:generation,sinceYear:s.date.year};
    function facts() { return {inputs:P.inputs(FB.state,rid),parameters:P.parameters(FB.state,rid,'war'),
      chance:FB.governments.call(FB.state,rid,'ai','goals',{}).warChance}; }
    const expected = facts(),saved = JSON.parse(FB.save.serialize()),rng = FB.getRngState(),uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const matching = JSON.stringify(facts()) === JSON.stringify(expected) && rng === FB.getRngState() && uid === FB.getUidCounter();
    s.realms[rid].ruler.personality = 'bellicose';
    const legacy = facts(),legacySave = JSON.parse(FB.save.serialize());
    FB.save.restore(legacySave); s = FB.state;
    const legacyMatching = JSON.stringify(facts()) === JSON.stringify(legacy);
    FB.killChar(s,FB.realmRulerCharacterSnapshot(s,rid));
    const current = FB.realmRulerCharacterSnapshot(s,rid);
    current.traits = ['content'];
    s.agency.rulerAims[rid] = {id:'expand_realm',generation:generation,sinceYear:s.date.year};
    const before = JSON.stringify(s),stale = P.inputs(s,rid),stalePure = before === JSON.stringify(s);
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
    const successor = facts(),successorSave = JSON.parse(FB.save.serialize());
    FB.save.restore(successorSave);
    return {expected:expected,matching:matching,legacy:legacy,legacyMatching:legacyMatching,stale:stale,stalePure:stalePure,
      successor:successor,successorMatching:JSON.stringify(facts()) === JSON.stringify(successor),
      changed:current.id !== old.id && FB.realmRulerGeneration(FB.state,rid) > generation,
      noPersonality:!Object.prototype.hasOwnProperty.call(FB.state.realms[rid].ruler,'personality')};
  });
  expect(out.expected.chance).toBeCloseTo(0.0375);
  expect(out.expected.parameters.minimumStrengthRatio).toBe(1.5);
  expect(out.legacy.chance).toBe(0.08);
  expect(out.legacy.parameters.bellicoseAppetite).toBe(1.5);
  expect(out.stale.traits).toEqual(['content']);
  expect(out.stale.aim).not.toBe('expand_realm');
  expect(out.successor.chance).toBe(0.0125);
  expect(out.successor.parameters).toMatchObject({minimumStrengthRatio:1.5,aggressionAppetite:0.6});
  expect(out).toMatchObject({matching:true,legacyMatching:true,stalePure:true,successorMatching:true,changed:true,noPersonality:true});
});
