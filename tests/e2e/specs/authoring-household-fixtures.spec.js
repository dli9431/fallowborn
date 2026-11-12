'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/counties.js','data/bookmarks.js','data/starts.js',
  'js/mods.js','js/starts.js','js/stories.js','js/story_household.js','js/world.js','js/main.js']);

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
      const faults=FB.mods.validate(mod);
      return {faults:faults,pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);expect(result.pure).toBe(true);
  });
}
