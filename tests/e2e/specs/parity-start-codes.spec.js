'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {startParityGame,FRESH_JOURNEYS}=require('../support/game/parity');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
test.describe.configure({mode:'parallel'});
const guards={harbor:require('../fixtures/authoring/guarded-principal-harbor.json'),
  dune:require('../fixtures/authoring/guarded-principal-dune.json')};

dependsOnRuntime(__filename,['index.html','data/starts.js','data/bookmark_476.js','data/bookmark_476_wider.js',
  'data/start_ambitions.js','js/main.js','js/starts.js','js/world.js','js/stories.js','js/story_opening_goals.js',
  'js/mods.js','js/bookmark_setup.js','js/mobile_guard.js','js/mobile_confederations.js','js/story_household.js']);

for(const example of [
  {scenario:'nepos_476',county:'split',code:'PARITY-476-nepos_476-split-m-Julius_Nepos',story:'opening_nepos_476'},
  {scenario:'peroz_sasanian_476',county:'baghdad',
    code:'PARITY-476-peroz_sasanian_476-baghdad-m-Peroz-standard-0-persian.zoroastrian_sasanian_476',story:'opening_peroz_476'},
  {scenario:'federate_476',county:'ravenna',code:'PARITY-476-federate_476-ravenna-m-Parity-standard-0-gothic.homoian',story:'opening_federate_476'},
  {scenario:'curialis_476',county:'ravenna',code:'PARITY-476-curialis_476-ravenna-m-Parity-established',story:'opening_curialis_476'}
]){
  test(example.scenario+' generates its exact canonical opening code at its actual story birthplace',async function({page},info){
    const code=await startParityGame(page,info,{bookmark:'476',scenario:example.scenario,declaredOpening:true});
    expect(code).toBe(example.code);
    expect(await page.evaluate(function(example){
      const s=FB.state;
      return {seed:s.seed,scenario:s.start.scenarioId,county:s.player.provinceId,attached:!!s.stories[example.story]};
    },example)).toEqual({seed:example.code,scenario:example.scenario,county:example.county,attached:true});
  });
}

test('an explicit nonprincipal parity code keeps its exact identity and spelling',async function({page},info){
  const journey=FRESH_JOURNEYS.find(function(j){return j.id==='fresh-476-federate_476';});
  expect(await startParityGame(page,info,journey)).toBe(journey.code);
  expect(await page.evaluate(function(){const s=FB.state,c=s.chars[s.player.charId];
    return {name:c.name,culture:c.culture,religion:c.religion,county:s.player.provinceId};
  })).toEqual({name:'Marcus',culture:'gothic',religion:'homoian',county:'ravenna'});
});

for(const example of [
  {prefix:'harbor',county:'harbor_ridge',name:'Lena Reed',slot:0,
    code:'PARITY-harbor_world-harbor_guarded_principal-harbor_ridge-f-Lena_Reed'},
  {prefix:'dune',county:'dune_well',name:'Sela Vey',slot:1,
    code:'PARITY-dune_world-dune_guarded_principal-dune_well-f-Sela_Vey-standard-1'}
]){
  test(example.prefix+' imported guarded opening preserves its female identity and exact home slot',async function({page},info){
    await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles({name:'guarded-principal-'+example.prefix+'.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(guards[example.prefix]))});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    expect(await startParityGame(page,info,{bookmark:example.prefix+'_world',
      scenario:example.prefix+'_guarded_principal',declaredOpening:true})).toBe(example.code);
    expect(await page.evaluate(function(){const s=FB.state,c=s.chars[s.player.charId];
      return {name:c.name,sex:c.sex,county:s.player.provinceId,slot:s.player.homeSettlement,original:c.id===s.start.originalPrincipal.charId};
    })).toEqual({name:example.name,sex:'f',county:example.county,slot:example.slot,original:true});
  });
}
