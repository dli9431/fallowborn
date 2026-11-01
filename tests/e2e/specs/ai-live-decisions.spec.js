'use strict';
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,[
  'data/ai_decisions.js','data/traits.js','data/map_data.js','js/ai_decisions.js',
  'js/government_ai.js','js/governments.js','js/wars.js','js/world.js','js/mods.js','js/balance.js',
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
