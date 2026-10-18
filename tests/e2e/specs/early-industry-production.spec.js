'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={paper:require('../fixtures/authoring/early-industry-paper.json'),metal:require('../fixtures/authoring/early-industry-metal.json')};
dependsOnRuntime(__filename,['index.html','data/buildings_early_industry.js','data/production_early_industry.js',
  'data/production.js','data/production_economy.js','data/site_resources.js','data/technology.js','data/technology_transmission.js',
  'js/production.js','js/production_economy.js','js/site_resources.js','js/actions.js','js/world.js','js/fortifications.js',
  'js/building_profiles.js','js/building_seasons.js','js/market.js','js/economy.js','js/lordships.js','js/treasury.js',
  'js/technology.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js','js/main.js','js/model.js']);
async function boot(page,info,kind,options) {
  options=options || {};await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  if(options.revision){const m=JSON.parse(JSON.stringify(examples[kind]));m.bookmarks['early_industry_'+kind].revision=options.revision;
    await page.locator('#modfile').setInputFiles({name:'early-industry-'+kind+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(m))});
  }else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/early-industry-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  if(options.ruler===false){await beginBookmark(page,info,'early_industry_'+kind,'early_industry_'+kind+'_household');}
  else {
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    const bm='early_industry_'+kind,place=kind==='paper'?'baghdad-m-Ivo_Reed':'resource_hill-m-Arno_Stone';
    await page.locator('#ng-seed').fill('FINITEINDUSTRY-'+bm+'-'+bm+'_ruler-'+place+'-standard');
    await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function(){FB.game.setPaused(true);});
}
for(const kind of ['paper','metal']){
  test(kind+' real import retains exact catalogue costs and scope with no passive awards or invented stock',async function({page},info){
    await boot(page,info,kind);const r=await page.evaluate(function(kind){const s=FB.state,P=FB.production;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),rows=P.snapshot(s),plant=rows.find(function(r){return r.site.id===kind+'_plant';});
      const d=FBDATA.buildings[kind==='paper'?'paper_workshop':'bloomery_smithy'];
      const passive=['tax','research','levy','retinue','archers','dev','pop','prestige','piety','populationCapacity'].map(function(k){return d[k] || 0;});
      P.validate(s);return {cost:d.cost,upkeep:d.upkeep,dev:d.devMin,ai:d.aiBuildOrder,role:d.role,draw:d.settlementDraw,
        passive:passive,empty:plant.lots.length===0,pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        receipts:s.production.economy.receipts.length,errors:FB.compileProduction(FB.campaignBookmark(s)).errors};
    },kind);expect(r).toMatchObject({cost:kind==='paper'?65:35,upkeep:1,dev:kind==='paper'?4:1,ai:kind==='paper'?30:31,
      role:'industry',draw:false,passive:Array(10).fill(0),empty:true,pure:true,receipts:0,errors:[]});
  });
  test(kind+' supplied input and paid real work produce one funded sale with exact source and buyer depletion',async function({page},info){
    await boot(page,info,kind);const r=await page.evaluate(function(kind){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
      function move(route,quantity,operation){const q=E.aiQuote(s,route,quantity,operation);if(!q.allowed)throw new Error('Missing finite input '+route+': '+q.reason);return E.commit(s,q);}
      if(kind==='paper')move('fiber_delivery',2,'transfer');else {move('ore_purchase',2,'buy');move('fuel_purchase',1,'buy');}
      const recipeId=kind==='paper'?'workshop_papermaking':'bloomery_smelting',site=kind+'_plant',recipe=FBDATA.productionRecipes[recipeId];
      const q=P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}),payerBefore=P.account(s,q.request.actor).funds.available;
      const batch=P.commit(s,q),paid=payerBefore-P.account(s,q.request.actor).funds.available,again=P.commit(s,q);
      const noEarlyFinish=P.commit(s,P.aiQuote(s,site,'finish',{batchId:batch}));
      const shifts=[];for(let i=0;i<recipe.workDays;i++)shifts.push(P.perform(s,P.aiQuote(s,site,'work',{batchId:batch})));
      const finish=P.commit(s,P.aiQuote(s,site,'finish',{batchId:batch}));
      const sale=E.aiQuote(s,kind==='paper'?'paper_sale':'iron_sale',1,'sell'),buyerBefore=P.account(s,sale.buyer).funds.available;
      const sold=E.commit(s,sale),buyerPaid=buyerBefore-P.account(s,sale.buyer).funds.available,repeated=E.commit(s,sale);
      P.validate(s);const output=s.production.lots.find(function(l){return l.origin.kind==='batch';});
      return {batch:!!batch,paid:paid,price:recipe.workPrice,again:again,noEarlyFinish:noEarlyFinish,shifts:shifts,finish:finish,sold:!!sold,
        buyerPaid:buyerPaid,saleCost:sale.cost,repeated:repeated,outputRemaining:output.remaining,
        sourceRemaining:P.snapshot(s).find(function(r){return r.site.id===(kind==='paper'?'fiber_source':'metal_supplier');}).lots[0].remaining,
        water:kind==='paper'?FB.siteResources.snapshot(s)[0].consumed:0};
    },kind);expect(r).toMatchObject({batch:true,again:false,noEarlyFinish:false,finish:true,sold:true,repeated:false,outputRemaining:0,
      sourceRemaining:kind==='paper'?4:2,water:kind==='paper'?1:0});expect(r.paid).toBe(r.price);expect(r.buyerPaid).toBe(r.saleCost);
    expect(r.shifts).toEqual(Array(kind==='paper'?2:1).fill(true));
  });
  test(kind+' missing supply and absent buyer demand idle without charges or outputs',async function({page},info){
    await boot(page,info,kind);const r=await page.evaluate(function(kind){const s=FB.state,P=FB.production,E=FB.productionEconomy;
      const recipeId=kind==='paper'?'workshop_papermaking':'bloomery_smelting',site=kind+'_plant',before=JSON.stringify(s);
      const noSupply=P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}),pure=before===JSON.stringify(s);
      s.player.gold=10000;if(kind==='paper')E.commit(s,E.aiQuote(s,'fiber_delivery',2,'transfer'));
      else {E.commit(s,E.aiQuote(s,'ore_purchase',2,'buy'));E.commit(s,E.aiQuote(s,'fuel_purchase',1,'buy'));}
      const buyer=kind==='paper'?'supplier_bank_court':'resource_fold_court';s.realms[buyer].treasury.gold=0;
      const after=JSON.stringify(s),noDemand=P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}),commit=P.commit(s,noDemand);
      return {noSupply:noSupply.allowed,pure:pure,noDemand:noDemand.allowed,reason:noDemand.reason,commit:commit,unchanged:after===JSON.stringify(s)};
    },kind);expect(r).toEqual({noSupply:false,pure:true,noDemand:false,reason:'outlet',commit:false,unchanged:true});
  });
  test(kind+' construction uses empty declared sites and idles before charging without a viable supplier',async function({page},info){
    await boot(page,info,kind,{revision:'new_works'});const r=await page.evaluate(function(kind){const s=FB.state,P=FB.production;s.player.gold=10000;
      const county=kind==='paper'?'baghdad':'resource_hill',building=kind==='paper'?'paper_workshop':'bloomery_smithy';
      const base=JSON.parse(JSON.stringify(s)),source=kind==='paper'?'baghdad':'resource_fold',slot=kind==='paper'?1:0;
      base.buildings[source].find(function(b){return b.s===slot;}).ruined=true;
      const before=JSON.stringify(base),blocked=!FB.canBuildAt(base,county,0,building),pure=before===JSON.stringify(base);
      const cash=s.player.gold,cost=FB.buildCost(s,county,building),built=FB.build(s,county,0,building),repeat=FB.build(s,county,0,building);P.validate(s);
      return {blocked:blocked,pure:pure,built:built,repeat:repeat,paid:cash-s.player.gold,cost:cost,
        empty:P.snapshot(s).find(function(r){return r.site.id===kind+'_plant';}).lots.length===0};
    },kind);expect(r).toMatchObject({blocked:true,pure:true,built:true,repeat:false,empty:true});expect(r.paid).toBe(r.cost);
  });
  test(kind+' interruption retains paid inputs/work and matching restore never repeats receipts',async function({page},info){
    await boot(page,info,kind);const r=await page.evaluate(function(kind){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
      if(kind==='paper')E.commit(s,E.aiQuote(s,'fiber_delivery',2,'transfer'));else {E.commit(s,E.aiQuote(s,'iron_purchase',1,'buy'));E.commit(s,E.aiQuote(s,'fuel_purchase',1,'buy'));}
      const recipeId=kind==='paper'?'workshop_papermaking':'smithy_forging',site=kind+'_plant';
      const batch=P.commit(s,P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}));P.perform(s,P.aiQuote(s,site,'work',{batchId:batch}));
      const pending=JSON.stringify(s.production),save=JSON.parse(FB.save.serialize());FB.save.restore(save);P.initialize(FB.state);E.initialize(FB.state);
      const retained=pending===JSON.stringify(FB.state.production),t=FB.state,county=kind==='paper'?'baghdad':'resource_hill';
      t.buildings[county][0].ruined=true;const before=JSON.stringify(t),blocked=P.commit(t,P.aiQuote(t,site,'work',{batchId:batch}));
      const pure=before===JSON.stringify(t),funds=t.player.gold,cancel=P.commit(t,P.aiQuote(t,site,'cancel',{batchId:batch}));P.validate(t);
      return {retained:retained,blocked:blocked,pure:pure,cancel:cancel,noRefund:funds===t.player.gold,
        outputs:t.production.lots.filter(function(l){return l.origin.kind==='batch';}).length};
    },kind);expect(r).toEqual({retained:true,blocked:false,pure:true,cancel:true,noRefund:true,outputs:0});
  });
}
test('separate forging consumes imported iron and fuel without claiming local ore or minting units',async function({page},info){
  await boot(page,info,'metal');const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
    E.commit(s,E.aiQuote(s,'iron_purchase',1,'buy'));E.commit(s,E.aiQuote(s,'fuel_purchase',1,'buy'));
    const ore=P.snapshot(s).find(function(r){return r.site.id==='metal_supplier';}).lots[0].remaining;
    const stable=JSON.stringify([s.player.levy,s.player.retinue,s.player.archers,s.armies,s.realmTech,s.population]);
    const batch=P.commit(s,P.aiQuote(s,'metal_plant','reserve',{recipeId:'smithy_forging',disposition:'store'}));
    P.perform(s,P.aiQuote(s,'metal_plant','work',{batchId:batch}));P.perform(s,P.aiQuote(s,'metal_plant','work',{batchId:batch}));
    const finish=P.commit(s,P.aiQuote(s,'metal_plant','finish',{batchId:batch}));const sold=E.commit(s,E.aiQuote(s,'tool_sale',1,'sell'));P.validate(s);
    return {batch:!!batch,finish:finish,sold:!!sold,ore:ore,oreAfter:P.snapshot(s).find(function(r){return r.site.id==='metal_supplier';}).lots[0].remaining,
      unchanged:stable===JSON.stringify([s.player.levy,s.player.retinue,s.player.archers,s.armies,s.realmTech,s.population]),
      consumed:s.production.lots.filter(function(l){return l.origin.kind==='exchange'&&l.assetId===s.production.assets[0].id;}).map(function(l){return l.remaining;})};});
  expect(r).toMatchObject({batch:true,finish:true,sold:true,ore:4,oreAfter:4,unchanged:true});expect(r.consumed.every(function(n){return n===0;})).toBe(true);
});
test('actual staffed fiber diversion suppresses both ordinary proceeds and market quantity exactly once',async function({page},info){
  await boot(page,info,'paper');const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy;s.player.gold=10000;
    s.player.enterpriseMigration=1;s.player.enterprises=[];s.player.enterpriseLabor=[];
    const e={uid:'real_rag_workers',type:'rag_collection',provinceId:'baghdad',settlement:1,workerId:null};s.player.enterprises.push(e);
    const hired=FB.hireEnterpriseWorker(s,e.uid);if(!hired)throw new Error('No actual worker');s.turn=90;s.date.season=1;
    const output=FB.marketEnterpriseOutput(s,e),raw=FB.enterprisePhysicalYield(s,e),first=FB.marketSeason(s),again=FB.marketSeason(s);
    const receipt=s.production.economy.receipts.find(function(r){return r.kind==='producer';}),after=FB.marketEnterpriseOutput(s,e);FB.production.validate(s);
    return {first:first,again:again,quantity:receipt.quantity,market:output.materials-after.materials,expectedMarket:receipt.marketQuantity,
      income:E.incomeDiverted(s,e),expectedIncome:receipt.income,raw:raw,workers:receipt.workerIds.length};});
  expect(r).toMatchObject({first:true,again:false,workers:1});expect(r.quantity).toBeGreaterThan(0);expect(r.market).toBeCloseTo(r.expectedMarket,8);
  expect(r.income).toBeCloseTo(r.expectedIncome,8);expect(r.income).toBeLessThanOrEqual(r.raw);
});
for(const kind of ['paper','metal'])test(kind+' malformed ordinary JSON declarations fail without publishing or side effects',async function({page},info){
  await openGame(page,info);const r=await page.evaluate(function(example){const original=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const bad=[function(m){m.productionGoods={bad_units:{name:'Bad units',unit:'kilograms per season',mass:1}};},
      function(m){m.productionRecipes={bad_recipe:{name:'Impossible',inputs:[],outputs:[],workDays:0,workPrice:0,requiresTech:[],impactReviewId:'conserved_production_batches'}};},
      function(m){m.buildings.industry_depot.productionRecipeIds=['missing_recipe'];},
      function(m){const bm=m.bookmarks[Object.keys(m.bookmarks)[0]];bm.revisions.supplied.productionSites[0].openingLots=[{goodId:'workshop_paper',quantity:0}];},
      function(m){const bm=m.bookmarks[Object.keys(m.bookmarks)[0]];bm.revisions.supplied.productionExchangeAssignments[0].toSiteId='missing_plant';}];
    const rejected=bad.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),rejected:rejected,pure:original===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples[kind]);expect(r).toEqual({valid:[],rejected:Array(5).fill(true),pure:true});
});
test('inclusive construction boundaries leave inherited plants and research independent',async function({page},info){
  await boot(page,info,'paper');const r=await page.evaluate(function(){const s=FB.state,before=JSON.stringify(s);function scope(year,pid,id){const t=JSON.parse(before);t.date.year=year;return FB.buildingApplicabilityStatus(t,pid,id).ready;}
    const scopes=[scope(799,'baghdad','paper_workshop'),scope(800,'baghdad','paper_workshop'),scope(1066,'resource_bank','paper_workshop'),
      scope(649,'baghdad','bloomery_smithy'),scope(650,'baghdad','bloomery_smithy'),scope(1300,'baghdad','bloomery_smithy'),scope(1301,'baghdad','bloomery_smithy')];
    return {scopes:scopes,plant:FB.production.snapshot(s).find(function(r){return r.site.id==='paper_plant';}).asset!==null,unchanged:before===JSON.stringify(s)};});
  expect(r).toEqual({scopes:[false,true,false,false,true,true,false],plant:true,unchanged:true});
});
test('strict matching saves reject changed units, duplicated receipts and erased input provenance before adoption',async function({page},info){
  await boot(page,info,'metal');const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy;s.player.gold=10000;E.commit(s,E.aiQuote(s,'ore_purchase',2,'buy'));
    return [function(t){t.production.lots[0].unit='made_up_units';},function(t){t.production.economy.receipts[0].paid++;},
      function(t){t.production.economy.receipts.push(JSON.parse(JSON.stringify(t.production.economy.receipts[0])));},function(t){t.production.lots[0].remaining++;}].map(function(change){
      const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let bad=false;try{FB.save.v4.validatePlatform(t);}catch(e){bad=true;}return bad&&before===JSON.stringify(t);});});
  expect(r).toEqual([true,true,true,true]);
});
test('public batch quotes protect the real treasury and AI uses identical live reserves without private fallback',async function({page},info){
  await boot(page,info,'metal',{ruler:false});const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy,rid='resource_hill_court';
    s.realms[rid].treasury.gold=10000;s.player.gold=10000;
    E.commit(s,E.aiQuote(s,'ore_purchase',2,'buy'));E.commit(s,E.aiQuote(s,'fuel_purchase',1,'buy'));
    const q=P.aiQuote(s,'metal_plant','reserve',{recipeId:'bloomery_smelting',disposition:'store'}),gold=s.player.gold;
    s.realms[rid].treasury.gold=q.funds.reserve+q.cost-1;const before=JSON.stringify(s);
    const short=P.aiQuote(s,'metal_plant','reserve',{recipeId:'bloomery_smelting',disposition:'store'}),stale=P.commit(s,q);
    const pure=before===JSON.stringify(s);s.realms[rid].treasury.gold=10000;const actual=P.aiQuote(s,'metal_plant','reserve',{recipeId:'bloomery_smelting',disposition:'store'});
    const batch=P.commit(s,actual),publicBefore=s.realms[rid].treasury.gold,work=P.commit(s,P.aiQuote(s,'metal_plant','work',{batchId:batch}));P.validate(s);
    return {ready:q.allowed,public:q.funds.public,short:short.allowed,stale:stale,pure:pure,batch:!!batch,work:work,privateSame:gold===s.player.gold,
      noExtraWorkFee:publicBefore===s.realms[rid].treasury.gold};});
  expect(r).toEqual({ready:true,public:true,short:false,stale:false,pure:true,batch:true,work:true,privateSame:true,noExtraWorkFee:true});
});
for(const width of [390,1280])test(width+'px shared production and technology reviews discover the real plants and retain focus',async function({page},info){
  await page.setViewportSize({width:width,height:844});await boot(page,info,'paper');
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('baghdad',0);});await page.locator('#settlement-production').click();
  await expect(page.locator('#gm-body')).toContainText('Make a paper lot');
  const button=page.getByRole('button',{name:'Move one owned unit',exact:true});
  await button.click();await page.keyboard.press('Escape');await expect(button).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
  await page.evaluate(function(){FB.ui.showTech();});const row=page.locator('.tech-entry[data-tech-open="paper_making"]');await row.click();
  await expect(page.locator('#gm-body')).toContainText('Paper Workshop');await expect(page.locator('#gm-body')).toContainText('Make a paper lot');
});

test('completed paper sale and depleted sources restore exactly without cash or material replay',async function({page},info){
  await boot(page,info,'paper');const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
    E.commit(s,E.aiQuote(s,'fiber_delivery',2,'transfer'));const id=P.commit(s,P.aiQuote(s,'paper_plant','reserve',{recipeId:'workshop_papermaking',disposition:'store'}));
    P.perform(s,P.aiQuote(s,'paper_plant','work',{batchId:id}));P.perform(s,P.aiQuote(s,'paper_plant','work',{batchId:id}));
    P.commit(s,P.aiQuote(s,'paper_plant','finish',{batchId:id}));const q=E.aiQuote(s,'paper_sale',1,'sell');E.commit(s,q);
    const before=JSON.stringify([s.production,s.siteResources,s.player.gold,s.realms]),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    P.initialize(FB.state);E.initialize(FB.state);P.validate(FB.state);
    return {same:before===JSON.stringify([FB.state.production,FB.state.siteResources,FB.state.player.gold,FB.state.realms]),repeat:E.commit(FB.state,q)};});
  expect(r).toEqual({same:true,repeat:false});
});
test('funded metal work survives an expired construction window and a lost research gate',async function({page},info){
  await boot(page,info,'metal');const r=await page.evaluate(function(){const s=FB.state,P=FB.production,E=FB.productionEconomy;s.player.gold=10000;
    E.commit(s,E.aiQuote(s,'ore_purchase',2,'buy'));E.commit(s,E.aiQuote(s,'fuel_purchase',1,'buy'));
    const id=P.commit(s,P.aiQuote(s,'metal_plant','reserve',{recipeId:'bloomery_smelting',disposition:'store'}));
    const later=JSON.parse(JSON.stringify(s));later.date.year=1301;
    const laterWork=P.aiQuote(later,'metal_plant','work',{batchId:id}).allowed;
    const rt=FB.realmTechRecord(s);rt.completed=rt.completed.filter(function(k){return k!=='bloomery_iron';});
    const work=P.perform(s,P.aiQuote(s,'metal_plant','work',{batchId:id})),finish=P.commit(s,P.aiQuote(s,'metal_plant','finish',{batchId:id}));P.validate(s);
    const missing=P.aiQuote(s,'metal_plant','reserve',{recipeId:'smithy_forging',disposition:'store'});
    return {work:work,finish:finish,construction:FB.buildingApplicabilityStatus(later,'resource_hill','bloomery_smithy').ready,laterWork:laterWork,
      missing:missing.missingTech,review:FBDATA.techImpactReviews.features.bloomery_batch_smelting.mode};});
  expect(r).toEqual({work:true,finish:true,construction:false,laterWork:true,missing:['bloomery_iron'],review:'hard'});
});
test('AI public construction preserves private cash and current build and processing reserves',async function({page},info){
  await boot(page,info,'metal',{revision:'new_works',ruler:false});const r=await page.evaluate(function(){const s=FB.state,P=FB.production,rid='resource_hill_court';
    s.realms[rid].treasury.gold=10000;const privateBefore=s.player.gold,who={kind:'realm',id:rid};
    const high=P.industrialConstructionReady(s,'resource_hill',0,'bloomery_smithy',who);
    const low=JSON.parse(JSON.stringify(s));low.realms[rid].treasury.gold=1;const before=JSON.stringify(low);
    const blocked=FB.buildRealm(low,rid,'resource_hill',0,'bloomery_smithy'),pure=before===JSON.stringify(low);
    const built=FB.buildRealm(s,rid,'resource_hill',0,'bloomery_smithy');P.validate(s);
    return {high:high,blocked:blocked,pure:pure,built:built,privateSame:privateBefore===s.player.gold,
      empty:P.snapshot(s).find(function(r){return r.site.id==='metal_plant';}).lots.length===0};});
  expect(r).toEqual({high:true,blocked:false,pure:true,built:true,privateSame:true,empty:true});
});
