'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/water-operations-river.json');
dependsOnRuntime(__filename,['index.html','data/site_resources.js','data/building_operations.js',
  'js/site_resources.js','js/building_operations.js','js/building_profiles.js','js/mods.js','js/world.js']);

test('physical water requirements validate detached real routes without publishing or allocating',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(input){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    function example(change){
      const m=JSON.parse(JSON.stringify(input));
      m.buildingOperationProfiles.water_service.sourceRequirements={originKind:'flow',originSuitability:['source','gradient'],minStores:1};
      if(change) change(m,m.bookmarks.resource_river.revisions.supplied);
      return FB.mods.validate(m);
    }
    const valid=example(),groundwater=example(function(m,b){
      m.buildingOperationProfiles.water_service.sourceRequirements.originSuitability.push('groundwater');
      b.siteResourceAssignments[0].suitability.groundwater=true;
    });
    const invalid=[function(m,b){b.siteResourceAssignments[0].suitability.gradient=false;},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.minStores=2;},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.originKind='storage';},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.originSuitability.push('groundwater');},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.originSuitability=['source','source'];},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.extra=true;},
      function(m){m.buildingOperationProfiles.water_service.sourceRequirements.minStores=-1;},
      function(m){delete m.buildingOperationProfiles.water_service.sourceRequirements.minStores;},
      function(m,b){b.siteResourceAssignments[1].suitability.groundwater=true;},
      function(m,b){b.siteResourceAssignments[2].suitability.groundwater=true;}
    ].map(function(change){return example(change).length>0;});
    return {valid:valid,groundwater:groundwater,invalid:invalid,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },river);
  expect(r).toEqual({valid:[],groundwater:[],invalid:Array(10).fill(true),pure:true});
});
