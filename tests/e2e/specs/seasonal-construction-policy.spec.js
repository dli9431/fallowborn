'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const pasture=require('../fixtures/authoring/building-seasons-pasture.json');
const coast=require('../fixtures/authoring/building-seasons-dry.json');
dependsOnRuntime(__filename,['index.html','data/building_seasons.js','data/production.js','data/production_economy.js',
  'js/building_seasons.js','js/building_operations.js','js/production.js','js/production_economy.js','js/mods.js']);

test('ordinary seasonal candidates retain legacy policy and accept optional real-input construction without publication',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const results=[undefined,false,true,'future'].map(function(value){const m=JSON.parse(JSON.stringify(example));
      if(value!==undefined)m.buildingSeasonProfiles.farm_window.constructionInputs=value;
      return FB.mods.validate(m).length===0;});
    return {results:results,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },pasture);
  expect(r).toEqual({results:[true,true,true,false],pure:true});
});

test('a water service cannot claim the material-input construction consumer',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),m=JSON.parse(JSON.stringify(example));
    const legacy=FB.mods.validate(m);m.buildingSeasonProfiles.dry_water_window.constructionInputs=true;
    const errors=FB.mods.validate(m);
    return {legacy:legacy,bad:errors.length>0,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])};
  },coast);
  expect(r).toEqual({legacy:[],bad:true,pure:true});
});
