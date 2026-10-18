'use strict';
const {test,expect}=require('../support/fixture');
const {bootInputs,prepareInputs}=require('../support/game/water-operation-inputs');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/building_operations.js','data/production.js','data/building_profiles.js',
  'js/building_operations.js','js/production.js','js/production_economy.js','js/building_profiles.js','js/site_resources.js',
  'js/building_seasons.js','js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/treasury.js','js/lordships.js','js/ui_modals.js']);
for(const kind of ['river','upland']){
  test(kind+' paid production supplies one conserved material-and-water service and matching restore',async function({page},info){
    await bootInputs(page,info,kind,'water-operation-inputs');await prepareInputs(page,kind==='river'?1:2);
    const r=await page.evaluate(function(){
      const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
      const gold=s.realms[who.id].treasury.gold,people=JSON.stringify(s.population),dev=JSON.stringify(s.dev);
      const built=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId,0,'input_variant');
      const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
      const q=O.quote(s,req),before=s.realms[who.id].treasury.gold,worked=O.commit(s,q),again=O.commit(s,q);
      const amount=FB.buildingBonusIn(s,a.countyId,'migrationAttraction');
      const paid=before-s.realms[who.id].treasury.gold,remaining=s.production.lots.filter(function(l){return l.goodId===a.profile.inputs[0].goodId;}).reduce(function(n,l){return n+l.remaining;},0);
      const snapshot=JSON.stringify([s.production,s.buildingOperations,s.siteResources,s.buildings]);
      FB.save.restore(JSON.parse(FB.save.serialize()));const t=FB.state;
      const matching=snapshot===JSON.stringify([t.production,t.buildingOperations,t.siteResources,t.buildings]);
      const valid=FB.production.validate(t)&&O.validate(t),bad=JSON.parse(JSON.stringify(t));delete bad.production.waterInputs;
      let rejects=false;try{FB.production.validate(bad);}catch(e){rejects=true;}
      t.turn=q.untilTurn;FB.invalidateBuildingIndex(t,a.countyId);
      return {built:built,worked:worked,again:again,amount:amount,paid:paid,cost:q.cost,remaining:remaining,matching:matching,valid:valid,rejects:rejects,
        people:people===JSON.stringify(t.population),dev:dev===JSON.stringify(t.dev),spent:gold>s.realms[who.id].treasury.gold,
        ended:FB.buildingBonusIn(t,a.countyId,'migrationAttraction'),records:t.production.waterInputs.records.length};
    });
    expect(r).toMatchObject({built:true,worked:true,again:false,amount:1,remaining:0,matching:true,valid:true,rejects:true,people:true,dev:true,spent:true,ended:0,records:1});
    expect(r.paid).toBeCloseTo(r.cost,8);
  });
}
test('unheated service remains available without material stock and never consumes feedstock as fuel',async function({page},info){
  await bootInputs(page,info,'river','water-operation-inputs');
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    const heated=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId,0,'input_variant'),before=JSON.stringify(s.production);
    const plain=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId),q=O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who});
    return {heated:heated,plain:plain,worked:O.commit(s,q),amount:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),stock:before===JSON.stringify(s.production)};
  });
  expect(r).toEqual({heated:false,plain:true,worked:true,amount:0.5,stock:true});
});
test('dry routes, missing fuel, authority and treasury failures preserve every owner and stale quotes cannot consume',async function({page},info){
  await bootInputs(page,info,'river','water-operation-inputs');await prepareInputs(page,1);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId,0,'input_variant');
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who},q=O.quote(s,req);
    const failed=[function(t){t.realms[who.id].treasury.gold=0;},function(t){t.chars[FB.political.actor(t,who).characterId].captive=true;},
      function(t){const rows=FB.siteResources.snapshot(t);const row=rows.find(function(v){return v.id===a.sourceId;});FB.siteResources.commit(t,FB.siteResources.quote(t,{operation:'reserve',sourceId:row.id,actor:who,amount:row.available}));}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);return !O.quote(t,req).allowed&&!O.commit(t,q)&&before===JSON.stringify(t);});
    const row=FB.production.snapshot(s)[0],pending=FB.production.commit(s,FB.production.aiQuote(s,row.site.id,'reserve',{recipeId:row.site.recipeIds[0],disposition:'store'}));
    const before=JSON.stringify(s),stale=O.commit(s,q);
    return {failed:failed,stale:stale,pure:before===JSON.stringify(s),pending:!!pending};
  });
  expect(r).toEqual({failed:[true,true,true],stale:false,pure:true,pending:true});
});

test('declared river-origin service rejects catchment substitution and malformed river resources purely',async function({page},info){
  const example=JSON.parse(JSON.stringify(require('../fixtures/authoring/water-operation-inputs-river.json')));
  await bootInputs(page,info,'river','water-operation-inputs');
  const r=await page.evaluate(function(example){
    const b=example.bookmarks.resource_river.revisions.supplied;
    example.buildingOperationProfiles.fueled_service.sourceRequirements={originKind:'flow',originSuitability:['source','river','gradient'],minStores:1};
    b.siteResourceAssignments[0].suitability.river=true;
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),uid=FB.getUidCounter(),rng=FB.getRngState();
    const accepted=FB.mods.validate(example);
    const rejected=[function(m){m.bookmarks.resource_river.revisions.supplied.siteResourceAssignments[0].suitability.river=false;},
      function(m){m.bookmarks.resource_river.revisions.supplied.siteResourceAssignments[1].suitability.river=true;},
      function(m){m.buildingOperationProfiles.fueled_service.sourceRequirements.originSuitability=['river','river'];}
    ].map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {accepted:accepted,rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&uid===FB.getUidCounter()&&rng===FB.getRngState()};
  },example);
  expect(r).toEqual({accepted:[],rejected:[true,true,true],pure:true});
});
