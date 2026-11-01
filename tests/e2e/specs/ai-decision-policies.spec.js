'use strict';
const fs = require('fs');
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/ai_decisions.js','data/ambitions.js','data/traits.js','data/eras.js',
  'data/political_institutions.js','js/ai_decisions.js','js/balance.js',
  'js/governments.js','js/government_ai.js','js/authority.js','js/mods.js',
  'js/world.js','js/save.js','js/save_v4.js','js/main.js',
  'docs/examples/ai-decisions-conservative.json','docs/examples/ai-decisions-expansion.json'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

for (const distribution of ['standard','crazygames']) {
  test(distribution + ' neutral policies report without changing data, state, RNG or identities', async function ({ page }, testInfo) {
    if (distribution === 'crazygames') await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await openGame(page,testInfo);
    const result = await page.evaluate(function () {
      const P = FB.aiDecisions, before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
      const rng = FB.getRngState(), uid = FB.getUidCounter(), ids = [];
      Object.keys(P.protocol()).forEach(function (family) {
        const policy = P.resolve(null,null,family);
        const facts = {};
        P.protocol()[family].metrics.forEach(function (metric) { facts[metric] = 1; });
        const report = P.report(policy,[{id:'available',eligible:true,facts:facts},{id:'blocked',eligible:false,facts:{}}]);
        ids.push(P.pick(report,0.5));
      });
      const report = P.report(P.resolve(null,null,'war'),[]);
      return { faults:P.catalogFaults(FBDATA), ids:ids, empty:P.pick(report),
        parameters:report.parameters, frozen:Object.isFrozen(P.resolve(null,null,'war').definition.parameters),
        dataUnchanged:before === JSON.stringify(FBDATA), stateUnchanged:state === JSON.stringify(FB.state),
        rngUnchanged:rng === FB.getRngState(), uidUnchanged:uid === FB.getUidCounter() };
    });
    expect(result).toMatchObject({faults:[],empty:null,frozen:true,dataUnchanged:true,stateUnchanged:true,rngUnchanged:true,uidUnchanged:true,
      parameters:{chance:0.025,bellicoseChance:0.08,minimumStrengthRatio:1.2,maximumCommitments:2}});
    expect(result.ids).toEqual(Array(9).fill('available'));
  });
}

for (const example of [
  {file:'ai-decisions-conservative.json',chosen:'weak_border',chance:0.005,inputs:{traits:['content','content']}},
  {file:'ai-decisions-expansion.json',chosen:'compact_border',chance:0.075,inputs:{traits:['ambitious'],aim:'expand_realm'}}
]) {
  test(example.file + ' imports through the ordinary Mods file picker and changes projections', async function ({ page }, testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../../../docs/examples',example.file));
    await Promise.all([page.waitForEvent('load'),page.locator('#mod-apply').click()]);
    await expect.poll(function () { return page.evaluate(function () { return !!(FB.game.bootReady && FB.mods.count() === 1); }); }).toBe(true);
    const result = await page.evaluate(function (inputs) {
      const P = FB.aiDecisions;
      const candidates = [
        {id:'weak_border',eligible:true,facts:{aggression:0,defensiveStrength:5,contacts:1,development:2}},
        {id:'compact_border',eligible:true,facts:{aggression:0,defensiveStrength:20,contacts:3,development:5}},
        {id:'forbidden_border',eligible:false,facts:{aggression:0,defensiveStrength:0,contacts:100,development:100}}
      ];
      const before = JSON.stringify(FB.state), rng = FB.getRngState();
      const choice = P.pick(P.report(P.resolve(null,null,'expansion'),candidates));
      const war = P.report(P.resolve(null,null,'war'),[],inputs);
      return { choice:choice,chance:war.parameters.chance,applied:war.adjustments,
        signature:FB.mods.sig(),pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() };
    },example.inputs);
    expect(result.choice).toBe(example.chosen);
    expect(result.chance).toBeCloseTo(example.chance);
    expect(result.applied.length).toBe(example.file.includes('conservative') ? 1 : 2);
    expect(result.signature).toMatch(/^effective-1-[a-f0-9]{64}$/);
    expect(result.pure).toBe(true);
  });
}

test('policy compilation rejects malformed declarations and imports without partial publication', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const stored = localStorage.getItem(FB.storageKey('fb_mods'));
    function clone(row) { return JSON.parse(JSON.stringify(row)); }
    const bad = [];
    function policy(change) {
      const d = clone(FBDATA.aiDecisionPolicies.ordinary_war); change(d);
      return {aiDecisionPolicies:{broken:d}};
    }
    bad.push(policy(function (d) { d.parameters.chance = 2; }));
    bad.push(policy(function (d) { d.parameters.minimumStrengthRatio = NaN; }));
    bad.push(policy(function (d) { d.parameters.maximumCommitments = Infinity; }));
    bad.push(policy(function (d) { d.parameters.chance = -1; }));
    bad.push(policy(function (d) { d.parameters.maximumCommitments = 1.5; }));
    bad.push(policy(function (d) { d.mode = 'execute'; }));
    bad.push(policy(function (d) { d.parameters.expression = 'state.player.gold'; }));
    bad.push(policy(function (d) { d.adjustments = [{kind:'trait',id:'missing_trait',multiply:{chance:2}}]; }));
    bad.push(policy(function (d) { d.adjustments = [{kind:'aim',id:'missing_aim',multiply:{chance:2}}]; }));
    bad.push({aiDecisionPolicies:[]},{aiDecisionPolicies:{ordinary_war:null}},
      {balance:{aiWarPolicy:'ordinary_research'}},{balance:{aiWarPolicy:'missing_policy'}});
    const ordered = clone(FBDATA.aiDecisionPolicies.ordinary_expansion);
    ordered.order = [{metric:'arbitrary_state_path',direction:'asc'}];
    bad.push({aiDecisionPolicies:{broken:ordered}});
    const definitions = FBDATA.aiDecisionPolicies;
    const failures = bad.map(function (mod) {
      const data = Object.assign({},FBDATA);
      if (Object.prototype.hasOwnProperty.call(mod,'aiDecisionPolicies')) {
        data.aiDecisionPolicies = Array.isArray(mod.aiDecisionPolicies) ? mod.aiDecisionPolicies :
          Object.assign({},FBDATA.aiDecisionPolicies,mod.aiDecisionPolicies);
      }
      return FB.aiDecisions.catalogFaults(data,mod.balance).length > 0;
    });
    const importFaults = FB.mods.validate({aiDecisionPolicies:{broken:ordered}});
    let rejected = false;
    try { FB.mods.apply({aiDecisionPolicies:{broken:ordered},balance:{startAge:99}}); } catch (error) { rejected = true; }
    const invalidStored = FB.mods.store(JSON.stringify({aiDecisionPolicies:{broken:ordered}}));
    const partial = FB.mods.validate({aiDecisionPolicies:{ordinary_war:{family:'war'}}});
    return {failures:failures,importRejected:importFaults.length > 0 && rejected && definitions === FBDATA.aiDecisionPolicies,
      partialRejected:partial.length > 0,invalidStored:invalidStored,
      storageUnchanged:stored === localStorage.getItem(FB.storageKey('fb_mods')),
      unchanged:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.failures.every(Boolean)).toBe(true);
  expect(result).toMatchObject({importRejected:true,partialRejected:true,invalidStored:false,storageUnchanged:true,unchanged:true});
});

test('ordered, first and weighted selection preserve eligibility, explicit rolls and bounded adjustments', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const P = FB.aiDecisions, data = Object.assign({},FBDATA,{aiDecisionPolicies:{}});
    const d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    d.adjustments = [{kind:'trait',id:'content',multiply:{chance:4,maximumCommitments:0.75}},
      {kind:'trait',id:'ambitious',multiply:{chance:4,maximumCommitments:0.75}},
      {kind:'aim',id:'expand_realm',multiply:{chance:4}}];
    data.aiDecisionPolicies.adjusted = d;
    const params = P.report(P.compile('adjusted',data),[],{traits:['content','content','ambitious'],aim:'expand_realm'});
    const weighted = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_research));
    data.aiDecisionPolicies.weighted = weighted;
    const candidates = [{id:'zero',eligible:true,facts:{score:0}}, {id:'a',eligible:true,facts:{score:1}},
      {id:'blocked',eligible:false,facts:{score:100}}, {id:'b',eligible:true,facts:{score:3}}];
    const before = JSON.stringify(candidates), rng = FB.getRngState(), uid = FB.getUidCounter();
    const report = P.report(P.compile('weighted',data),candidates);
    const picks = [0,0.249,0.25,0.999].map(function (roll) { return P.pick(report,roll); });
    let invalidRoll = false, missing = false, duplicate = false, unknown = false, overflow = false;
    try { P.pick(report); } catch (e) { invalidRoll = true; }
    try { P.report(P.compile('weighted',data),[{id:'a',eligible:true,facts:{}}]); } catch (e) { missing = true; }
    try { P.report(P.compile('weighted',data),[candidates[1],candidates[1]]); } catch (e) { duplicate = true; }
    try { P.report(P.compile('weighted',data),[{id:'a',eligible:true,facts:{score:1,gold:100}}]); } catch (e) { unknown = true; }
    try { P.report(P.compile('weighted',data),[{id:'a',eligible:true,facts:{score:1e20}}]); } catch (e) { overflow = true; }
    const zero = P.report(P.compile('weighted',data),[{id:'zero',eligible:true,facts:{score:0}}]);
    const first = P.report(P.resolve(null,null,'war'),[{id:'z',eligible:true,facts:{}},{id:'a',eligible:true,facts:{}}]);
    const ordered = P.report(P.resolve(null,null,'expansion'),[{id:'z',eligible:true,facts:{aggression:0}},{id:'a',eligible:true,facts:{aggression:0}}]);
    report.parameters.baseScore = 0;
    return {picks:picks,zero:P.pick(zero),first:P.pick(first),ordered:P.pick(ordered),invalidRoll:invalidRoll,missing:missing,
      duplicate:duplicate,unknown:unknown,overflow:overflow,adjusted:params.parameters,applied:params.adjustments,
      isolated:P.resolve(null,null,'research').definition.parameters.baseScore === 10,
      pure:before === JSON.stringify(candidates) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toMatchObject({picks:['a','a','b','b'],zero:null,first:'z',ordered:'a',invalidRoll:true,missing:true,
    duplicate:true,unknown:true,overflow:true,adjusted:{chance:1,maximumCommitments:1},isolated:true,pure:true});
  expect(result.applied).toHaveLength(3);
});

test('selection layers, same-import references and same-day government changes use the existing balance owner', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const P = FB.aiDecisions, s = FB.state, policies = {}, base = FBDATA.aiDecisionPolicies.ordinary_war;
    ['scope_era','scope_form','scope_bookmark','scope_mod'].forEach(function (id) { policies[id] = JSON.parse(JSON.stringify(base)); });
    const form = Object.assign({},FBDATA.governmentForms.regnum,{balance:{aiWarPolicy:'scope_form'}});
    const mod = {aiDecisionPolicies:policies,governmentForms:{policy_crown:form}};
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const detached = before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.mods.apply(mod);
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive && !s.realms[id].nonTerritorial; });
    const reads = [P.resolve(s,rid,'war').id];
    const era = FBDATA.eras[FB.campaignEra(s)], prior = era.balance;
    try {
      era.balance = Object.assign({},prior,{aiWarPolicy:'scope_era'});
      FB.balanceLayers.activate(FB.campaignEra(s),{id:s.start.id});
      reads.push(P.resolve(s,rid,'war').id);
      if (!FB.authoritySetGovernment(s,rid,'policy_crown')) throw new Error('Form assignment failed');
      reads.push(P.resolve(s,rid,'war').id);
      FB.balanceLayers.activate(FB.campaignEra(s),{id:s.start.id,balance:{aiWarPolicy:'scope_bookmark'}});
      reads.push(P.resolve(s,rid,'war').id);
      FB.mods.apply({balance:{aiWarPolicy:'scope_mod'}});
      reads.push(P.resolve(s,rid,'war').id);
      FB.balanceLayers.activate(FB.campaignEra(s),{id:s.start.id});
      reads.push(P.resolve(s,rid,'war').id);
    } finally { era.balance = prior; FB.balanceLayers.applyCampaign(s); }
    const data = Object.assign({},FBDATA,{bookmarks:{probe:{id:'probe',revisions:{baseline:{},retained:{balance:{aiWarPolicy:'ordinary_research'}}}}}});
    return {errors:errors,detached:detached,reads:reads,wrongRevisionRejected:P.catalogFaults(data).length > 0};
  });
  expect(result).toEqual({errors:[],detached:true,reads:['ordinary_war','scope_era','scope_form','scope_bookmark','scope_mod','scope_mod'],wrongRevisionRejected:true});
});

test('compilation replacement, restore replay and exact changed-content fingerprints retain campaign facts', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  await startDeterministicGame(page);
  const example = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/examples/ai-decisions-expansion.json'),'utf8'));
  const result = await page.evaluate(function (mod) {
    FB.mods.apply(mod);
    const P = FB.aiDecisions, s = FB.state;
    const rid = Object.keys(s.realms).find(function (id) { return id !== 'player' && s.realms[id].alive; });
    const policy = P.resolve(s,rid,'war'), signature = FB.mods.sig();
    const saved = JSON.parse(FB.save.serialize());
    const rng = FB.getRngState(), uid = FB.getUidCounter(), gold = s.player.gold;
    const candidates = [{id:'b',eligible:true,facts:{aggression:0,contacts:3,development:5}},
      {id:'a',eligible:true,facts:{aggression:0,contacts:1,development:2}}];
    const first = P.report(P.resolve(s,rid,'expansion'),candidates);
    FB.save.restore(saved);
    const second = P.report(P.resolve(FB.state,rid,'expansion'),candidates);
    const restored = {rng:rng === FB.getRngState(),uid:uid === FB.getUidCounter(),gold:gold === FB.state.player.gold,
      same:JSON.stringify(first) === JSON.stringify(second),noCache:!JSON.stringify(saved.state).includes('aiDecision')};
    const patch = JSON.parse(JSON.stringify(mod));
    patch.aiDecisionPolicies.expansive_war.parameters.chance = 0.09;
    FB.mods.apply(patch);
    const replaced = P.resolve(FB.state,rid,'war');
    return {restored:restored,changed:signature !== FB.mods.sig(),refused:FB.save.otherWorld(saved),
      sameId:policy.id === replaced.id,newValue:replaced.definition.parameters.chance,oldValue:policy.definition.parameters.chance};
  },example);
  expect(result).toEqual({restored:{rng:true,uid:true,gold:true,same:true,noCache:true},changed:true,refused:true,sameId:true,newValue:0.09,oldValue:0.04});
});

test('same-import trait references and retained revision selection validate against detached effective data', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const P = FB.aiDecisions, d = JSON.parse(JSON.stringify(FBDATA.aiDecisionPolicies.ordinary_war));
    d.adjustments = [{kind:'trait',id:'measured_disposition',multiply:{chance:0}}];
    const mod = {traits:{measured_disposition:JSON.parse(JSON.stringify(FBDATA.traits.content))},aiDecisionPolicies:{measured_war:d}};
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.mods.validate(mod);
    const pure = before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    FB.mods.apply(mod);
    const zero = P.report(P.compile('measured_war'),[],{traits:['measured_disposition']}).parameters.chance;
    const raw = {id:'probe',balance:{aiWarPolicy:'measured_war'},revisions:{baseline:{},fresh:{balance:{aiWarPolicy:'ordinary_war'}},cleared:{balance:{}}}};
    const worlds = FB.bookmarkRevisions('probe',raw), out = [];
    worlds.forEach(function (world) {
      FB.balanceLayers.activate(null,world);
      out.push([world.revision,P.resolve(null,null,'war').id]);
    });
    const retained = FB.bookmarkRevisions('probe',raw).find(function (world) { return world.revision === 'baseline'; });
    FB.balanceLayers.activate(null,retained);
    out.push(['restored_baseline',P.resolve(null,null,'war').id]);
    return {faults:faults,pure:pure,zero:zero,out:out};
  });
  expect(result).toEqual({faults:[],pure:true,zero:0,out:[['baseline','measured_war'],['fresh','ordinary_war'],['cleared','ordinary_war'],['restored_baseline','measured_war']]});
});

test('ordinary stored replacement and removal discard policies from the removed mod', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  const source = JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../../docs/examples/ai-decisions-expansion.json'),'utf8'));
  async function store(mod) {
    await Promise.all([page.waitForEvent('load'),page.evaluate(function (data) { FB.mods.store(JSON.stringify(data)); },mod)]);
    await expect.poll(function () { return page.evaluate(function () { return FB.game.bootReady; }); }).toBe(true);
  }
  await store(source);
  const first = await page.evaluate(function () { return FB.mods.sig(); });
  source.aiDecisionPolicies.replacement_war = source.aiDecisionPolicies.expansive_war;
  delete source.aiDecisionPolicies.expansive_war;
  source.balance.aiWarPolicy = 'replacement_war';
  await store(source);
  expect(await page.evaluate(function (signature) {
    return {count:FB.mods.count(),selected:FB.aiDecisions.resolve(null,null,'war').id,
      removed:!Object.prototype.hasOwnProperty.call(FBDATA.aiDecisionPolicies,'expansive_war'),changed:signature !== FB.mods.sig()};
  },first)).toEqual({count:1,selected:'replacement_war',removed:true,changed:true});
  await Promise.all([page.waitForEvent('load'),page.evaluate(function () { FB.mods.removeAt(0); })]);
  await expect.poll(function () { return page.evaluate(function () { return FB.game.bootReady; }); }).toBe(true);
  expect(await page.evaluate(function () {
    return {count:FB.mods.count(),selected:FB.aiDecisions.resolve(null,null,'war').id,
      removed:!Object.prototype.hasOwnProperty.call(FBDATA.aiDecisionPolicies,'replacement_war'),signature:FB.mods.sig()};
  })).toEqual({count:0,selected:'ordinary_war',removed:true,signature:''});
});

test('unused world policy faults remain exhaustive for imports and scoped for runtime boot', async function ({ page }, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const P = FB.aiDecisions;
    const data = Object.assign({},FBDATA,{bookmarks:Object.assign({},FBDATA.bookmarks,{
      broken_world:{id:'broken_world',balance:{aiWarPolicy:'ordinary_research'},revisions:{malformed:{unknownField:true}}}
    })});
    const before = JSON.stringify(data), rng = FB.getRngState(), uid = FB.getUidCounter();
    const strict = P.catalogFaults(data), shared = P.catalogFaults(data,null,{worlds:false});
    const selected = P.selectionFaults(data.bookmarks.broken_world.balance,data);
    return {strict:strict.some(function (fault) { return fault.includes('broken_world'); }),shared:shared,selected:selected,
      healthy:P.selectionFaults(FB.bookmark('867').balance,data),
      pure:before === JSON.stringify(data) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({strict:true,shared:[],selected:['aiWarPolicy'],healthy:[],pure:true});
});
