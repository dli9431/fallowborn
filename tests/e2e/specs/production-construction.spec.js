'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/technology.js','data/production.js','data/production_economy.js','js/production.js','js/production_economy.js','js/building_operations.js','js/building_seasons.js','js/building_profiles.js','js/actions.js','js/world.js','js/lordships.js','js/treasury.js','js/mods.js','js/save_v4.js','js/ui_modals.js']);
async function boot(page,info,kind) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/production-construction.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const bm='production_suppliers_'+kind;
  await page.locator('#ng-seed').fill('EXCHANGE-'+bm+'-'+bm+'_ruler-'+(kind==='harbor'?'resource_quay-m-Ivo_Reed':'resource_hill-m-Arno_Stone')+'-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);});
}

test('finite construction review is pure and enrolls one paid empty asset without stock',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,P=FB.production;s.player.gold=10000;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const ready=P.industrialConstructionReady(s,'resource_hill',0,'iron_works',{kind:'realm',id:'player'});
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const cash=s.player.gold,cost=FB.buildCost(s,'resource_hill','iron_works'),lots=JSON.stringify(s.production.lots);
    const revision=s.production.revision,nextId=s.production.nextId;
    const built=FB.build(s,'resource_hill',0,'iron_works'),again=FB.build(s,'resource_hill',0,'iron_works');
    const record=s.buildings.resource_hill.find(function(b){return b.id==='iron_works';}),bound=JSON.stringify(s.production);
    const repeated=P.bindConstruction(s,'resource_hill',record);FB.buildingOperations.bind(s,'resource_hill',record);
    const once=repeated===false && bound===JSON.stringify(s.production) && s.production.revision===revision+1 && s.production.nextId===nextId+1;
    P.validate(s);
    const saved=JSON.parse(FB.save.serialize()),inventory=JSON.stringify(s.production);FB.save.restore(saved);
    return {ready:ready,pure:pure,built:built,again:again,once:once,paid:cash-s.player.gold,cost:cost,
      empty:lots===JSON.stringify(s.production.lots),constructed:s.production.assets.filter(function(a){return a.constructed;}).length,
      restore:inventory===JSON.stringify(FB.state.production)};});
  expect(r).toMatchObject({ready:true,pure:true,built:true,again:false,once:true,empty:true,constructed:1,restore:true});expect(r.paid).toBe(r.cost);
});
test('missing supplier, unavailable worker, buyer cash and acquisition reserves block before charging',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state;s.player.gold=10000;const base=JSON.stringify(s);
    return [function(t){t.buildings.resource_fold[0].ruined=true;},
      function(t){t.player.travel={};},function(t){t.realms.resource_fold_court.alive=false;},function(t){t.player.gold=1;}].map(function(change){
      const t=JSON.parse(base);change(t);const before=JSON.stringify(t);
      return !FB.production.industrialConstructionReady(t,'resource_hill',0,'iron_works',{kind:'realm',id:'player'})&&before===JSON.stringify(t);
    });});
  expect(r).toEqual([true,true,true,true]);
});
test('constructed inventory rejects false markers, future enrollment and replayed opening goods',async function({page},info){
  await boot(page,info,'inland');const r=await page.evaluate(function(){const s=FB.state;s.player.gold=10000;FB.build(s,'resource_hill',0,'iron_works');
    return [function(t,a){a.constructed=false;},function(t,a){a.openedTurn=t.turn+1;},function(t,a){delete a.constructed;}].map(function(change){
      const t=JSON.parse(JSON.stringify(s)),a=t.production.assets.find(function(a){return a.constructed;});change(t,a);let bad=false;
      try{FB.production.validate(t);}catch(e){bad=true;}return bad;});});expect(r).toEqual([true,true,true]);
});

test('sale-bound recipes idle when the real buyer cannot fund output and reject immediate use',async function({page},info){
  await boot(page,info,'inland');const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
    FB.build(s,'resource_hill',0,'iron_works');
    E.commit(s,E.aiQuote(s,'ore_market',2,'buy'));E.commit(s,E.aiQuote(s,'fuel_market',1,'buy'));
    const valid=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}).allowed;
    const use=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'use'}).allowed;
    s.realms.resource_fold_court.treasury.gold=0;const before=JSON.stringify(s);
    const q=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'});
    return {valid:valid,use:use,idle:!q.allowed,reason:q.reason,pure:before===JSON.stringify(s)};});
  expect(r).toEqual({valid:true,use:false,idle:true,reason:'outlet',pure:true});
});

test('industrial removal retains material lineage and refuses another lifetime enrollment',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
    const built=FB.build(s,'resource_hill',0,'iron_works'),b=s.buildings.resource_hill.find(function(x){return x.id==='iron_works';});
    const received=E.commit(s,E.aiQuote(s,'ore_market',2,'buy')),before=JSON.stringify(s.production);
    s.buildings.resource_hill=s.buildings.resource_hill.filter(function(x){return x!==b;});FB.invalidateBuildingIndex(s,'resource_hill');
    const cash=s.player.gold,again=FB.build(s,'resource_hill',0,'iron_works');P.validate(s);
    const save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    return {built:built,received:!!received,again:again,unchanged:before===JSON.stringify(FB.state.production),paidAgain:s.player.gold!==cash};
  });
  expect(r).toEqual({built:true,received:true,again:false,unchanged:true,paidAgain:false});
});
