'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/eras.js','js/station.js','js/starts.js',
  'js/governments.js','js/mods.js','js/world.js','js/bookmark_setup.js','js/main.js']);

const fixtures=[
  {file:'adopted-public-treasury-dune.json',mod:require('../fixtures/authoring/adopted-public-treasury-dune.json')},
  {file:'adopted-public-treasury-harbor.json',mod:require('../fixtures/authoring/adopted-public-treasury-harbor.json')},
  {file:'dated-home-authority-dune.json',mod:require('../fixtures/authoring/dated-home-authority-dune.json')},
  {file:'dated-home-authority-harbor.json',mod:require('../fixtures/authoring/dated-home-authority-harbor.json')},
  {file:'expedition-authority-dune.json',mod:require('../fixtures/authoring/expedition-authority-dune.json')},
  {file:'expedition-authority-harbor.json',mod:require('../fixtures/authoring/expedition-authority-harbor.json')},
  {file:'expedition-objective-harbor.json',mod:require('../fixtures/authoring/expedition-objective-harbor.json')},
  {file:'sovereign-preparation-dune.json',mod:require('../fixtures/authoring/sovereign-preparation-dune.json')},
  {file:'sovereign-preparation-harbor.json',mod:require('../fixtures/authoring/sovereign-preparation-harbor.json')},
  {file:'subordinate-formation-dune.json',mod:require('../fixtures/authoring/subordinate-formation-dune.json')}
];
for(const fixture of fixtures){
  test(fixture.file+' admits its authored ruler and rejects a mismatched station',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const faults=FB.mods.validate(mod),bad=JSON.parse(JSON.stringify(mod));
      const start=bad.startScenarios.find(function(s){return !!s.rulerRealmId;});
      start.tier=start.tier===5?4:5;
      return {faults:faults,rejected:FB.mods.validate(bad).some(function(e){return e.indexOf('rulerRealmId')>=0;}),
        pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);expect(result.rejected).toBe(true);expect(result.pure).toBe(true);
  });
}
