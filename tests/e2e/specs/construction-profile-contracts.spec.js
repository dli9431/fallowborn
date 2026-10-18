'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','js/building_operations.js','js/building_profiles.js',
  'js/world.js','js/site_resources.js','js/fortifications.js','data/map_data.js','data/technology.js',
  'data/building_profiles.js','data/building_operations.js']);

test('water bundles reject duplicate, unsupported, missing and undeclared effects',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){
    const c={buildingOperationProfiles:{service:{mode:'use',amount:1,periodDays:7,workCost:1,effect:['tax','populationCapacity']}},
      buildings:{works:{tax:1,populationCapacity:0.03,dev:0,settlementDraw:true,operationProfile:'service'}}};
    const before=JSON.stringify(c),valid=FB.buildingOperations.catalogFaults(c);
    const pure=before===JSON.stringify(c),bad=[];
    [[],['tax','tax'],['tax','dev'],['tax'],['tax',{}]].forEach(function(e){
      const v=JSON.parse(before);v.buildingOperationProfiles.service.effect=e;
      bad.push(FB.buildingOperations.catalogFaults(v).length>0);
    });
    const store=JSON.parse(before);store.buildingOperationProfiles.service.mode='store';
    return {valid:valid,pure:pure,bad:bad,store:FB.buildingOperations.catalogFaults(store).length>0};
  });
  expect(r).toEqual({valid:[],pure:true,bad:[true,true,true,true,true],store:true});
});

test('alternative machinery replaces only reviewed gates and validates its physical flag contract',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){
    const c=JSON.parse(JSON.stringify(FBDATA));
    c.siteResourceProfiles.contract_flow={name:'Local head',kind:'flow',unit:'water',capacity:4,periodDays:7};
    c.techImpactReviews.features.contract_machine={mode:'hard',tech:['water_power'],fallback:'Ordinary grinding',rationale:'Optional machine'};
    c.buildingProfiles.contract_machine={buildingId:'mill',name:'Simple wheel',desc:'A distinct reviewed machine.',
      requiresTech:['water_power'],requiresTechMode:'replace',techImpactReview:'contract_machine',
      siteResourceProfile:'contract_flow',siteResourceSuitability:['source','gradient'],replace:{cost:30,aiBuildOrder:18}};
    const before=JSON.stringify(c),valid=FB.buildingProfiles.catalogFaults(c),d=FB.buildingProfiles.definition('mill','contract_machine',c);
    const pure=before===JSON.stringify(c),base=FB.buildingProfiles.definition('mill',null,c).requiresTech;
    const bad=[];
    [[],['gradient','gradient'],['invented']].forEach(function(flags){
      const v=JSON.parse(before);v.buildingProfiles.contract_machine.siteResourceSuitability=flags;
      bad.push(FB.buildingProfiles.catalogFaults(v).length>0);
    });
    const v=JSON.parse(before);delete v.buildingProfiles.contract_machine.requiresTechMode;
    const additive=FB.buildingProfiles.definition('mill','contract_machine',v).requiresTech;
    v.buildingProfiles.contract_machine.requiresTechMode='replace';v.buildingProfiles.contract_machine.requiresTech=[];
    return {valid:valid,pure:pure,tech:d.requiresTech,base:base,bad:bad,additive:additive,
      empty:FB.buildingProfiles.catalogFaults(v).length>0,priority:d.aiBuildOrder};
  });
  expect(r).toEqual({valid:[],pure:true,tech:['water_power'],base:'undershot_watermill',bad:[true,true,true],
    additive:['undershot_watermill','water_power'],empty:true,priority:18});
});
