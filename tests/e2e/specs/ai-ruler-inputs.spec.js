'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/ai_decisions.js','js/model.js','js/agency.js','js/world.js','js/government_ai.js',
  'js/governments.js','js/authority.js','js/wars.js','js/balance.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/main.js','js/util.js','js/intrigue.js',
  'data/ai_decisions.js','data/traits.js','data/ambitions.js','data/political_institutions.js','data/intrigue.js',
  'docs/examples/ai-decisions-conservative.json','docs/examples/ai-decisions-expansion.json'
]);

test('generated and historical rulers use their current characters while neutral policies retain every baseline', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const neutral = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    neutral.adjustments = [];
    FB.mods.apply({aiDecisionPolicies:{neutral_inputs:neutral},balance:{aiWarPolicy:'neutral_inputs'}});
    const s = FB.state, P = FB.aiDecisions;
    const historical = FBDATA.realms.find(function (r) {
      return r.ruler && r.ruler.generated !== true && FB.realmRulerCharacterSnapshot(s,r.id);
    }).id;
    const generated = Object.keys(s.realms).find(function (id) {
      return s.realms[id].generated && FB.realmRulerCharacterSnapshot(s,id);
    });
    const origins = [historical,generated].map(function (rid) {
      const c = FB.realmRulerCharacterSnapshot(s,rid), r = s.realms[rid];
      const original = P.inputs(s,rid).traits;
      delete r.ruler.personality;
      const ordinary = FBDATA.rulerTraits.every(function (trait) {
        c.traits = [trait];
        return FB.governments.strategy('ai','realm_decisions').goals(s,rid).warChance === 0.025;
      });
      r.ruler.trait = 'ambitious';
      c.traits = ['honest','content','honest'];
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const input = P.inputs(s,rid), stable = Object.keys(P.protocol()).every(function (family) {
        return JSON.stringify(P.parameters(s,rid,family)) === JSON.stringify(P.resolve(s,rid,family).definition.parameters);
      });
      const current = input.traits.slice();
      input.traits.push('greedy');
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      c.traits = [];
      const empty = P.inputs(s,rid).traits;
      return {initial:original.length > 0,current:current,empty:empty,stable:stable,ordinary:ordinary,pure:pure,
        detached:input.traits.length === 3 && c.traits.length === 0};
    });
    const me = s.chars[s.player.charId];
    const landless = P.inputs(s,'player');
    me.traits = ['patient','honest'];
    s.realms.player = {id:'player',alive:true,ruler:{trait:'ambitious'}};
    const player = P.inputs(s,'player');
    const successor = Object.keys(s.chars).find(function (id) { return id !== me.id && !s.chars[id].dead; });
    s.chars[successor].traits = ['content']; s.player.charId = successor;
    const changedPlayer = P.inputs(s,'player');
    s.chars[successor].dead = true;
    const deadPlayer = P.inputs(s,'player');
    const r = s.realms[generated]; r.alive = false;
    return {origins:origins,landless:landless,player:player,changedPlayer:changedPlayer,deadPlayer:deadPlayer,
      deadRealm:P.inputs(s,generated),global:P.inputs(s,null),missing:P.inputs(s,'missing_realm')};
  });
  expect(out.origins).toEqual(Array(2).fill({initial:true,current:['honest','content'],empty:[],stable:true,ordinary:true,pure:true,detached:true}));
  expect(out).toMatchObject({landless:{traits:[],aim:null},player:{traits:['patient','honest'],aim:null},changedPlayer:{traits:['content'],aim:null},
    deadPlayer:{traits:[],aim:null},deadRealm:{traits:[],aim:null},global:{traits:[],aim:null},missing:{traits:[],aim:null}});
});

test('compact ruler aims agree with materialization and keep structural priorities and valid saved aims', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state, P = FB.aiDecisions;
    const rid = Object.keys(s.realms).find(function (id) {
      const c = FB.realmRulerCharacterSnapshot(s,id);
      return c && s.realms[id].generated && c.spouseId;
    });
    const r = s.realms[rid], c = FB.realmRulerCharacterSnapshot(s,rid);
    c.traits = ['ambitious']; FB.realmRulerCharacter(s,rid);
    FB.mods.apply({agencyRules:{secureFamilySize:0,marriageAimAge:16}});
    FB.ensureAgency(s); delete s.agency.rulerAims[rid];
    const live = P.inputs(s,rid);
    delete s.chars[c.id]; r.succession.members[r.succession.rulerMemberId].charId = null;
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const compact = P.inputs(s,rid);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const made = FB.materializeRealmRuler(s,rid), materialized = P.inputs(s,rid);
    const generation = FB.realmRulerGeneration(s,rid);
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:generation,sinceYear:s.date.year,lastApproachYear:s.date.year};
    const retained = FB.rulerAimSnapshot(s,rid); retained.id = 'expand_realm';
    const savedAim = P.inputs(s,rid).aim;
    s.agency.rulerAims[rid].id = 'missing_aim';
    const invalidBefore = JSON.stringify(s), invalid = P.inputs(s,rid).aim;
    const invalidPure = invalidBefore === JSON.stringify(s);
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:generation-1,sinceYear:s.date.year};
    const stale = P.inputs(s,rid).aim;
    r.liege = 'player'; r.favor = -100;
    const independence = P.inputs(s,rid).aim;
    r.liege = null;
    FB.mods.apply({agencyRules:{secureFamilySize:12}});
    const security = P.inputs(s,rid).aim;
    return {live:live,compact:compact,materialized:materialized,samePerson:made.id === c.id,pure:pure,
      savedAim:savedAim,invalid:invalid,invalidPure:invalidPure,stale:stale,independence:independence,security:security};
  });
  expect(out).toEqual({live:{traits:['ambitious'],aim:'expand_realm'},compact:{traits:['ambitious'],aim:'expand_realm'},
    materialized:{traits:['ambitious'],aim:'expand_realm'},samePerson:true,pure:true,savedAim:'keep_peace',
    invalid:'expand_realm',invalidPure:true,stale:'expand_realm',independence:'win_independence',security:'secure_dynasty'});
});

for (const example of [
  {file:'ai-decisions-conservative.json',trait:'content',chance:0.005,base:0.01,aim:'amass_wealth'},
  {file:'ai-decisions-expansion.json',trait:'ambitious',chance:0.075,base:0.05,aim:'expand_realm'}
]) {
  test(example.file+' uses current multi-trait inputs through the ordinary JSON importer', async function ({page}, testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../../../docs/examples',example.file));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await startDeterministicGame(page);
    const out = await page.evaluate(function (input) {
      const s = FB.state, P = FB.aiDecisions;
      const rid = Object.keys(s.realms).find(function (id) { return FB.realmRulerCharacterSnapshot(s,id); });
      const c = FB.realmRulerCharacterSnapshot(s,rid), r = s.realms[rid];
      c.traits = ['honest',input.trait,input.trait]; r.ruler.trait = 'greedy';
      FB.ensureAgency(s);
      s.agency.rulerAims[rid] = {id:input.aim,generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const report = P.report(P.resolve(s,rid,'war'),[],P.inputs(s,rid));
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      c.traits = ['honest'];
      const removed = P.parameters(s,rid,'war').chance;
      FB.addTrait(c,input.trait,s);
      const added = P.parameters(s,rid,'war').chance;
      FB.removeTrait(c,input.trait);
      const removedAgain = P.parameters(s,rid,'war').chance;
      return {chance:report.parameters.chance,applied:report.adjustments,removed:removed,added:added,removedAgain:removedAgain,pure:pure};
    },example);
    expect(out.chance).toBeCloseTo(example.chance);
    expect(out.added).toBeCloseTo(example.chance);
    expect(out.removed).toBeCloseTo(example.base);
    expect(out.removedAgain).toBeCloseTo(example.base);
    expect(out.applied).toEqual(example.trait === 'content' ? ['trait:content'] : ['trait:ambitious','aim:expand_realm']);
    expect(out.pure).toBe(true);
  });
}

test('trait readers share unique inputs and policy multipliers clamp and round only after combination', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    const s = FB.state, P = FB.aiDecisions;
    const rid = Object.keys(s.realms).find(function (id) { return FB.realmRulerCharacterSnapshot(s,id); });
    const c = FB.realmRulerCharacterSnapshot(s,rid);
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    const form = Object.assign({},FBDATA.governmentForms.territorial,{strategyParameters:{ai:{warChance:0}}});
    const schemes = Object.keys(FBDATA.plots).filter(function (id) { return FBDATA.plots[id].hostile; }).slice(0,2);
    d.adjustments = [{kind:'trait',id:'ambitious',multiply:{chance:4,maximumCommitments:0.75,aggressionAppetite:4}},
      {kind:'trait',id:'content',multiply:{chance:0.5,maximumCommitments:0.75,aggressionAppetite:4}},
      {kind:'aim',id:'amass_wealth',multiply:{chance:0,aggressionAppetite:0.5}}];
    FB.mods.apply({aiDecisionPolicies:{combined_inputs:d},balance:{aiWarPolicy:'combined_inputs'},governmentForms:{quiet_inputs:form},
      traitMechanics:{ambitious:{courtLoyalty:7,rulerAims:{expand_realm:20},schemeOrder:{priority:2,ids:[schemes[0]]}},
        content:{courtLoyalty:3,rulerAims:{amass_wealth:30},schemeOrder:{priority:2,ids:[schemes[1]]}}}});
    if (!FB.authoritySetGovernment(s,rid,'quiet_inputs')) throw new Error('Government assignment failed');
    s.realms[rid].ruler.personality = 'bellicose';
    c.traits = ['content','ambitious','content']; FB.ensureAgency(s);
    s.agency.rulerAims[rid] = {id:'amass_wealth',generation:FB.realmRulerGeneration(s,rid),sinceYear:s.date.year};
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    const report = P.report(P.resolve(s,rid,'war'),[],P.inputs(s,rid));
    return {parameters:report.parameters,applied:report.adjustments,sum:FB.traitMechanic(c,'courtLoyalty',true),
      max:FB.traitMechanic(c,'courtLoyalty'),aim:FB.traitAimWeight(c,'amass_wealth'),
      schemeTie:FB.traitSchemeOrder(c)[0] === schemes[1],
      governmentChance:FB.governments.call(s,rid,'ai','goals',{}).warChance,
      compact:FB.traitIds({trait:'content'}),empty:FB.traitIds({traits:[],trait:'ambitious'}),
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(out).toMatchObject({parameters:{chance:0,maximumCommitments:1,aggressionAppetite:8},applied:['trait:ambitious','trait:content','aim:amass_wealth'],
    sum:10,max:7,aim:30,schemeTie:true,governmentChance:0,compact:['content'],empty:[],pure:true});
});

test('legacy personality survives retained saves and expires on succession without becoming a trait', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  await page.evaluate(function () { FBDATA.bookmarks['867'].revision = 'baseline'; });
  await startDeterministicGame(page);
  const out = await page.evaluate(function () {
    let s = FB.state;
    const P = FB.aiDecisions;
    const rid = Object.keys(s.realms).find(function (id) {
      return id !== 'player' && s.realms[id].alive && !s.realms[id].liege &&
        FB.realmRulerCharacterSnapshot(s,id) && Object.keys(s.realms[id].succession.members).length > 2 &&
        FB.political.government(s,{kind:'realm',id:id}).formId === 'territorial';
    });
    const c = FB.realmRulerCharacterSnapshot(s,rid), generation = FB.realmRulerGeneration(s,rid);
    c.traits = ['ambitious','honest']; s.realms[rid].ruler.personality = 'bellicose';
    FB.ensureAgency(s);
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:generation,sinceYear:s.date.year};
    function facts() {
      return {inputs:P.inputs(FB.state,rid),chance:FB.governments.call(FB.state,rid,'ai','goals',{}).warChance,
        generation:FB.realmRulerGeneration(FB.state,rid),person:FB.realmRulerCharacterSnapshot(FB.state,rid).id};
    }
    const expected = facts(), saved = JSON.parse(FB.save.serialize()), rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.save.restore(saved); s = FB.state;
    const matching = JSON.stringify(facts()) === JSON.stringify(expected);
    const clocks = rng === FB.getRngState() && uid === FB.getUidCounter();
    const legacy = JSON.parse(JSON.stringify(saved));
    legacy.v = 3; delete legacy.titleIds; delete legacy.authoritySchema; delete legacy.platformSchema;
    delete legacy.state.start.revision;
    if (legacy.state.authority) delete legacy.state.authority.schema;
    delete legacy.state.agency;
    FB.save.restore(legacy); s = FB.state;
    const oldSave = facts();
    const repairedRng = FB.getRngState(), repairedUid = FB.getUidCounter();
    FB.save.restore(legacy);
    const repeat = JSON.stringify(facts()) === JSON.stringify(oldSave) && repairedRng === FB.getRngState() && repairedUid === FB.getUidCounter();
    s = FB.state;
    s.agency.rulerAims[rid] = {id:'keep_peace',generation:generation,sinceYear:s.date.year};
    FB.killChar(s,FB.realmRulerCharacterSnapshot(s,rid));
    FB.realmRulerCharacterSnapshot(s,rid).traits = [];
    const successor = facts();
    return {matching:matching,clocks:clocks,legacyTraits:oldSave.inputs.traits,legacyChance:oldSave.chance,repeat:repeat,
      successor:successor.person !== c.id && successor.generation > generation,
      staleAimIgnored:successor.inputs.aim !== 'keep_peace',successorChance:successor.chance,
      noPersonality:!Object.prototype.hasOwnProperty.call(s.realms[rid].ruler,'personality')};
  });
  expect(out).toEqual({matching:true,clocks:true,legacyTraits:['ambitious','honest'],legacyChance:0.08,repeat:true,
    successor:true,staleAimIgnored:true,successorChance:0.025,noPersonality:true});
});

test('malformed trait, aim and policy definitions reject the entire import without publication', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const out = await page.evaluate(function () {
    const data = JSON.stringify(FBDATA), state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const signature = FB.mods.sig(), stored = localStorage.getItem(FB.storageKey('fb_mods'));
    const war = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    war.adjustments = [{kind:'trait',id:'missing_trait',multiply:{chance:2}}];
    const bad = [{traitMechanics:{ambitious:{rulerAims:{expand_realm:101}}}},
      {traitMechanics:{ambitious:{warChance:0.2}}},
      {agencyRules:{aims:Object.assign({},FBDATA.agencyRules.aims,{keep_peace:{cultivation:99}})}},
      {aiDecisionPolicies:{invalid_inputs:war}}];
    const rejected = bad.map(function (mod) {
      mod.balance = {startAge:99};
      const faults = FB.mods.validate(mod);
      let threw = false;
      try { FB.mods.apply(mod); } catch (error) { threw = true; }
      return faults.length > 0 && threw && FB.mods.store(JSON.stringify(mod)) === false;
    });
    return {rejected:rejected,unchanged:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && signature === FB.mods.sig() &&
      stored === localStorage.getItem(FB.storageKey('fb_mods'))};
  });
  expect(out).toEqual({rejected:[true,true,true,true],unchanged:true});
});
