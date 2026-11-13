'use strict';
const {test,expect}=require('../support/fixture');
const path=require('path');
const {openGame}=require('../support/game/navigation');
const {beginBookmarkFromTitle}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/counties.js','data/bookmarks.js','data/starts.js',
  'js/mods.js','js/starts.js','js/stories.js','js/story_household.js','js/world.js','js/main.js','js/ui_misc.js','js/ui_modals.js']);

const fixtures=[
  {file:'baths-headworks-upland.json',mod:require('../fixtures/authoring/baths-headworks-upland.json')},
  {file:'engineered-waterworks-rain.json',mod:require('../fixtures/authoring/engineered-waterworks-rain.json')},
  {file:'expanded-catalogue-upland.json',mod:require('../fixtures/authoring/expanded-catalogue-upland.json')},
  {file:'household-graphs.json',mod:require('../fixtures/authoring/household-graphs.json')},
  {file:'household-jobs.json',mod:require('../fixtures/authoring/household-jobs.json')},
  {file:'household-refuge-hill.json',mod:require('../fixtures/authoring/household-refuge-hill.json')},
  {file:'household-refuge-river.json',mod:require('../fixtures/authoring/household-refuge-river.json')},
  {file:'household-work.json',mod:require('../fixtures/authoring/household-work.json')},
  {file:'water-operation-inputs-upland.json',mod:require('../fixtures/authoring/water-operation-inputs-upland.json')},
  {file:'holywar-opening-harbor.json',mod:require('../fixtures/authoring/holywar-opening-harbor.json')},
  {file:'holywar-opening-upland.json',mod:require('../fixtures/authoring/holywar-opening-upland.json')},
  {file:'opening-goals.json',mod:require('../fixtures/authoring/opening-goals.json')}
];
for(const fixture of fixtures){
  test(fixture.file+' admits its intended ordinary household',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const faults=FB.mods.validate(mod),bad=JSON.parse(JSON.stringify(mod));
      const start=bad.startScenarios.find(function(s){return !s.rulerRealmId;});
      if(start.fixedProvinceId)delete start.startCulture;
      else start.birthplaces.counties=[];
      return {faults:faults,rejected:FB.mods.validate(bad).length>0,
        pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);expect(result.rejected).toBe(true);expect(result.pure).toBe(true);
  });
}

for(const selection of [
  {file:'household-work.json',bookmark:'867',scenario:'bench_work_example_start',county:'paris'},
  {file:'baths-headworks-upland.json',bookmark:'resource_upland',scenario:'resource_upland_household',county:'resource_fold'}
]){
  test(selection.file+' imports a real household at its intended county',async function({page},info){
    await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+selection.file));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
    await beginBookmarkFromTitle(page,selection.bookmark,selection.scenario);
    expect(await page.evaluate(function(){return {scenario:FB.state.start.scenarioId,county:FB.state.player.provinceId};}))
      .toEqual({scenario:selection.scenario,county:selection.county});
  });
}
