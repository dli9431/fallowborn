'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/eras.js','data/economy.js','data/starts.js',
  'js/mods.js','js/world.js','js/starts.js','js/stories.js','js/bookmark_setup.js',
  'js/governments.js','js/government_selection.js','js/mobile_confederations.js','js/main.js']);

const fixtures=[
  {file:'harbor-contracts.json',mod:require('../fixtures/authoring/harbor-contracts.json')},
  {file:'dune-contracts.json',mod:require('../fixtures/authoring/dune-contracts.json')},
  {file:'regional-milling-river.json',mod:require('../fixtures/authoring/regional-milling-river.json')},
  {file:'regional-milling-catchment.json',mod:require('../fixtures/authoring/regional-milling-catchment.json')},
  {file:'local-following-reviews-harbor.json',mod:require('../fixtures/authoring/local-following-reviews-harbor.json')},
  {file:'local-following-reviews-dune.json',mod:require('../fixtures/authoring/local-following-reviews-dune.json')},
  {file:'mobile-vow-harbor.json',mod:require('../fixtures/authoring/mobile-vow-harbor.json')},
  {file:'mobile-vow-upland.json',mod:require('../fixtures/authoring/mobile-vow-upland.json')},
  {file:'calendar-households.json',mod:require('../fixtures/authoring/calendar-households.json')},
  {file:'local-formation-harbor.json',mod:require('../fixtures/authoring/local-formation-harbor.json')},
  {file:'local-formation-upland.json',mod:require('../fixtures/authoring/local-formation-upland.json')},
  {file:'mobile-preparation-harbor.json',mod:require('../fixtures/authoring/mobile-preparation-harbor.json')},
  {file:'mobile-preparation-upland.json',mod:require('../fixtures/authoring/mobile-preparation-upland.json')},
  {file:'local-threat-river.json',mod:require('../fixtures/authoring/local-threat-river.json')},
  {file:'local-threat-hill.json',mod:require('../fixtures/authoring/local-threat-hill.json')},
  {file:'masonry-circuit-river.json',mod:require('../fixtures/authoring/masonry-circuit-river.json')},
  {file:'masonry-circuit-upland.json',mod:require('../fixtures/authoring/masonry-circuit-upland.json')},
  {file:'mobile-column-supply-harbor.json',mod:require('../fixtures/authoring/mobile-column-supply-harbor.json')},
  {file:'mobile-column-supply-dune.json',mod:require('../fixtures/authoring/mobile-column-supply-dune.json')},
  {file:'mobile-opening-campaigns-harbor.json',mod:require('../fixtures/authoring/mobile-opening-campaigns-harbor.json')},
  {file:'mobile-opening-campaigns-dune.json',mod:require('../fixtures/authoring/mobile-opening-campaigns-dune.json')},
  {file:'mobile-opening-reserves-harbor.json',mod:require('../fixtures/authoring/mobile-opening-reserves-harbor.json')},
  {file:'mobile-opening-reserves-dune.json',mod:require('../fixtures/authoring/mobile-opening-reserves-dune.json')},
  {file:'expedition-terms-harbor.json',mod:require('../fixtures/authoring/expedition-terms-harbor.json')},
  {file:'expedition-terms-upland.json',mod:require('../fixtures/authoring/expedition-terms-upland.json')},
  {file:'mobile-expedition-harbor.json',mod:require('../fixtures/authoring/mobile-expedition-harbor.json')},
  {file:'mobile-expedition-dune.json',mod:require('../fixtures/authoring/mobile-expedition-dune.json')}
];

for(const fixture of fixtures){
  test(fixture.file+' admits its declared starts without changing the catalogue or input',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),input=JSON.stringify(mod),
        rng=FB.getRngState(),uid=FB.getUidCounter(),faults=FB.mods.validate(mod);
      return {faults:faults,inputPure:input===JSON.stringify(mod),
        livePure:before===JSON.stringify([FBDATA,FB.state]),
        rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);
    expect(result).toMatchObject({inputPure:true,livePure:true,rng:true,uid:true});
  });
}
