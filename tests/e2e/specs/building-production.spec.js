'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={fiber:require('../fixtures/authoring/production-fiber.json'),iron:require('../fixtures/authoring/production-iron.json')};
dependsOnRuntime(__filename,['data/production_early_industry.js','data/production_fish_drying.js','data/buildings_seasonal_pasture.js','data/production_seasonal_pasture.js','data/relay_services.js','js/relay_services.js',
  'data/building_profiles.js','js/building_profiles.js','data/production_economy.js','js/production_economy.js','index.html','data/production.js','data/technology.js','js/production.js','js/site_resources.js',
  'js/world.js','js/title_ids.js','js/mods.js','js/main.js','js/save.js','js/save_v4.js','js/lordships.js','js/treasury.js',
  'js/politics.js','js/economy.js','js/model.js','js/technology.js','js/ui_modals.js','js/ui_misc.js','js/starts.js']);
async function boot(page,info,kind,ruler) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/production-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(kind){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['production_'+kind];},kind);
  if (!ruler) return beginBookmark(page,info,'production_'+kind,'production_'+kind+'_household');
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(kind==='fiber'?'BATCHACCOUNTS-production_fiber-production_fiber_ruler-resource_quay-m-Ivo_Reed-standard':
    'BATCHACCOUNTS-production_iron-production_iron_ruler-resource_hill-m-Arno_Stone-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);});
}
for(const kind of ['fiber','iron']) {
  test(kind+' ordinary import initializes only its explicit finite lots and pure projections',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,P=FB.production,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const plan=FB.compileProduction(FB.campaignBookmark(s)),row=P.snapshot(s)[0],q=P.aiQuote(s,row.site.id,'reserve',{recipeId:row.site.recipeIds[0],disposition:'store'});
      P.validate(s);
      return {errors:plan.errors,allowed:q.allowed,lots:row.lots.map(function(x){return [x.goodId,x.quantity,x.available];}),revision:s.production.revision,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),review:FBDATA.techImpactReviews.features.conserved_production_batches.mode};
    });
    expect(r).toMatchObject({errors:[],allowed:true,revision:0,pure:true,review:'none'});
    expect(r.lots).toEqual(kind==='fiber'?[['rag_fiber',6,6]]:[['iron_ore_lot',4,4],['charcoal_lot',4,4]]);
  });
  test(kind+' batches reserve real stock, pay once and conserve finite input/output mass',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site,recipe=FBDATA.productionRecipes[site.recipeIds[0]];
      const req={recipeId:site.recipeIds[0],disposition:'store'},q=P.aiQuote(s,site.id,'reserve',req),gold=FB.treasuryAvailable(s,q.request.actor.id);
      const id=P.commit(s,q),repeat=P.commit(s,q),after=FB.treasuryAvailable(s,q.request.actor.id),row=P.snapshot(s)[0];
      const outputsBefore=s.production.lots.filter(function(x){return x.origin.kind==='batch';}).length;
      const early=P.commit(s,P.aiQuote(s,site.id,'finish',{batchId:id}));
      const shifts=[];
      for(let day=0;day<recipe.workDays;day++) {
        const shift=P.aiQuote(s,site.id,'work',{batchId:id});shifts.push(P.commit(s,shift));shifts.push(!P.commit(s,shift));
        s.turn++;s.date.day++;
      }
      const finish=P.aiQuote(s,site.id,'finish',{batchId:id}),done=P.commit(s,finish),duplicate=P.commit(s,finish);P.validate(s);
      const lot=s.production.lots.find(function(x){return x.origin.kind==='batch';});
      const mass=function(rows){return rows.reduce(function(n,x){return n+x.quantity*FBDATA.productionGoods[x.goodId].mass;},0);};
      return {id:typeof id==='number',repeat:repeat,cost:gold-after,price:recipe.workPrice,early:early,outputsBefore:outputsBefore,
        inputReserved:row.lots.reduce(function(n,x){return n+x.remaining-x.available;},0),shifts:shifts,done:done,duplicate:duplicate,
        lot:lot,mass:mass(recipe.outputs)<=mass(recipe.inputs),water:s.siteResources && s.siteResources.sources[site.sourceId].consumed};
    });
    expect(r).toMatchObject({id:true,repeat:false,early:false,outputsBefore:0,done:true,duplicate:false,mass:true});
    expect(r.cost).toBe(r.price);expect(r.shifts.every(Boolean)).toBe(true);
    expect(r.inputReserved).toBe(kind==='fiber'?2:3);expect(r.lot.remaining).toBe(1);
    if(kind==='fiber')expect(r.water).toBe(1);
  });
  test(kind+' matching restore preserves pending work and output without reseeding or replay',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site;
      const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:site.recipeIds[0],disposition:'store'}));
      const before=JSON.stringify(s.production),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
      const pending=before===JSON.stringify(FB.state.production),t=FB.state;
      P.initialize(t);const init=before===JSON.stringify(t.production);
      const recipe=FBDATA.productionRecipes[site.recipeIds[0]];
      for(let i=0;i<recipe.workDays;i++){P.commit(t,P.aiQuote(t,site.id,'work',{batchId:id}));t.turn++;t.date.day++;}
      const q=P.aiQuote(t,site.id,'finish',{batchId:id});P.commit(t,q);
      const final=JSON.stringify(t.production);FB.save.restore(JSON.parse(FB.save.serialize()));
      return {pending:pending,init:init,finished:final===JSON.stringify(FB.state.production),repeat:P.commit(FB.state,q),outputs:FB.state.production.lots.filter(function(x){return x.origin.kind==='batch';}).length};
    });
    expect(r).toEqual({pending:true,init:true,finished:true,repeat:false,outputs:1});
  });
}

test('independent iron chain consumes its actual bloom and fuel and can consume rather than store output',async function({page},info){
  await boot(page,info,'iron');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site;
    FB.realmTechRecord(s,'resource_hill_court').completed.push('bloomery_iron');
    function run(recipeId,disposition){const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:recipeId,disposition:disposition}));
      for(let i=0;i<FBDATA.productionRecipes[recipeId].workDays;i++){if(!P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id})))return false;s.turn++;s.date.day++;}
      return P.commit(s,P.aiQuote(s,site.id,'finish',{batchId:id}));}
    const before=JSON.stringify([s.population,s.buildings,s.chars]),first=run('smelt_ore','store'),second=run('forge_tools','use');P.validate(s);
    return {first:first,second:second,unchanged:before===JSON.stringify([s.population,s.buildings,s.chars]),lots:s.production.lots.map(function(x){return [x.goodId,x.remaining];})};
  });
  expect(r).toEqual({first:true,second:true,unchanged:true,lots:[['iron_ore_lot',2],['charcoal_lot',2],['iron_bloom_lot',0],['hand_tool_lot',0]]});
});

test('interruption and cancellation preserve property and paid work without refund or free output',async function({page},info){
  await boot(page,info,'fiber');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site,id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:'rag_paper',disposition:'store'}));
    P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id}));s.turn++;s.date.day++;
    const original=JSON.parse(JSON.stringify(s));
    const changes=[function(t){t.holder.resource_quay='missing';},function(t){t.buildings.resource_quay[0].ruined=true;},
      function(t){t.chars[t.production.batches[0].workerId].imprisoned=true;},function(t){t.chars[t.production.batches[0].workerId].dead=true;},
      function(t){t.realms.production_fiber_court.ruler.generation=FB.realmRulerGeneration(t,'production_fiber_court')+1;}];
    const blocked=changes.map(function(change){const t=JSON.parse(JSON.stringify(original)),q=P.aiQuote(t,site.id,'work',{batchId:id});change(t);const before=JSON.stringify(t);return !P.commit(t,q)&&before===JSON.stringify(t);});
    const cost=FB.treasuryAvailable(s,'production_fiber_court'),cancel=P.commit(s,P.aiQuote(s,site.id,'cancel',{batchId:id}));P.validate(s);
    return {blocked:blocked,cancel:cancel,noRefund:cost===FB.treasuryAvailable(s,'production_fiber_court'),available:P.snapshot(s)[0].lots[0].available,
      outputs:s.production.lots.filter(function(x){return x.origin.kind==='batch';}).length,water:FB.siteResources.snapshot(s)[0].reserved};
  });
  expect(r).toEqual({blocked:Array(5).fill(true),cancel:true,noRefund:true,available:6,outputs:0,water:0});
});

test('source expiry, competing use, exact funds and changed quotes fail atomically',async function({page},info){
  await boot(page,info,'fiber');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site,request={recipeId:'rag_paper',disposition:'store'};
    const original=JSON.parse(JSON.stringify(s));
    const changes=[function(t){t.turn++;},function(t){t.realms.production_fiber_court.treasury.gold=0;},
      function(t){P.commit(t,P.aiQuote(t,site.id,'reserve',request));},function(t){t.production.lots[0].remaining=1;}];
    const checks=changes.map(function(change){const t=JSON.parse(JSON.stringify(original)),q=P.aiQuote(t,site.id,'reserve',request);change(t);const before=JSON.stringify(t);
      try{return !P.commit(t,q)&&before===JSON.stringify(t);}catch(error){return before===JSON.stringify(t);}});
    const id=P.commit(s,P.aiQuote(s,site.id,'reserve',request));s.turn=7;s.date.day=8;
    const before=JSON.stringify(s),expired=!P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id}))&&before===JSON.stringify(s);
    const cancel=P.commit(s,P.aiQuote(s,site.id,'cancel',{batchId:id}));P.validate(s);
    return {checks:checks,expired:expired,cancel:cancel,remaining:s.production.lots[0].remaining};
  });
  expect(r).toEqual({checks:Array(4).fill(true),expired:true,cancel:true,remaining:6});
});

test('detached declarations reject impossible quantities, units, mass, references and water without publishing',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.productionGoods.rag_fiber.mass=0;},function(m){m.productionGoods.rag_fiber.unit='';},
      function(m){m.productionRecipes.rag_paper.inputs=[];},function(m){m.productionRecipes.rag_paper.inputs[0].quantity=0.5;},
      function(m){m.productionRecipes.rag_paper.outputs[0].quantity=3;},function(m){m.productionRecipes.rag_paper.inputs[0].goodId='missing';},
      function(m){m.productionRecipes.rag_paper.outputs[0].unit='wrong';},function(m){m.productionRecipes.rag_paper.workPrice=0;},
      function(m){m.productionRecipes.rag_paper.workDays=31;},function(m){m.productionRecipes.rag_paper.requiresTech=['missing'];},
      function(m){m.productionRecipes.rag_paper.impactReviewId='missing_review';},
      function(m){m.bookmarks.production_fiber.revisions.supplied.productionSites[0].sourceId='river_cistern';},
      function(m){m.bookmarks.production_fiber.revisions.supplied.productionSites[0].siteId='missing';},
      function(m){m.bookmarks.production_fiber.revisions.supplied.productionSites[0].openingLots[0].quantity=-1;},
      function(m){m.bookmarks.production_fiber.revisions.supplied.openingInfrastructure.placements=[];},
      function(m){m.bookmarks.production_fiber.revisions.supplied.productionSites[0].execute='arbitrary';},
      function(m){m.productionGoods=[];}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.fiber);
  expect(r).toEqual({valid:[],rejected:Array(17).fill(true),pure:true});
});

test('strict saves reject forged stock, receipts, units, identity, duplicate work and impossible outputs without adoption',async function({page},info){
  await boot(page,info,'iron');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site,id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:'smelt_ore',disposition:'store'}));
    P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id}));s.turn++;s.date.day++;
    P.commit(s,P.aiQuote(s,site.id,'finish',{batchId:id}));
    const changes=[function(r){r.version=2;},function(r){r.definition='other';},function(r){r.lots[0].remaining++;},
      function(r){r.lots[0].unit='fish';},function(r){r.lots[0].quantity++;},function(r){r.lots[0].owner.id='missing';},
      function(r){r.batches[0].workTurns=[];},function(r){r.batches[0].workTurns=[0,0];},function(r){r.batches[0].paid=0;},
      function(r){r.batches[0].outputs=[];},function(r){r.batches[0].inputs[0].quantity=1;},function(r){r.batches[0].workerId='missing';},
      function(r){r.lots[2].origin.batchId=99;},function(r){r.batches[0].closedTurn=999;},function(r){r.nextId++;},
      function(r){r.lots.push(JSON.parse(JSON.stringify(r.lots[0])));},function(r){r.batches[0].status='reserved';}];
    const rejected=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t.production);const before=JSON.stringify(t);
      try{FB.save.v4.validatePlatform(t);return false;}catch(error){return /production/.test(error.message)&&before===JSON.stringify(t);}});
    const legacy=JSON.parse(JSON.stringify(s));delete legacy.production;
    Object.keys(legacy.buildings).forEach(function(pid){legacy.buildings[pid].forEach(function(b){delete b.productionAsset;});});
    const before=JSON.stringify(legacy);P.validate(legacy);
    return {rejected:rejected,legacy:before===JSON.stringify(legacy)&&legacy.production===undefined};
  });
  expect(r).toEqual({rejected:Array(17).fill(true),legacy:true});
});

test('one protagonist workday replaces focus and cannot duplicate enterprise labor or direct API work',async function({page},info){
  await boot(page,info,'fiber',true);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site;
    const q=P.aiQuote(s,site.id,'reserve',{recipeId:'rag_paper',disposition:'store'}),id=P.commit(s,q);
    const shift=P.aiQuote(s,site.id,'work',{batchId:id}),direct=P.commit(s,shift),turn=s.turn;
    let focus=0;const original=FB.tickFocus;FB.tickFocus=function(){focus++;};
    let worked;try{worked=P.perform(s,shift);}finally{FB.tickFocus=original;}
    const t=JSON.parse(JSON.stringify(s));t.player.enterprises=[{uid:999,type:'workshop_business',workerId:t.player.charId,provinceId:'resource_quay'}];
    const assigned=P.aiQuote(t,site.id,'work',{batchId:id}).allowed;
    return {reserved:typeof id==='number',direct:direct,worked:worked,day:s.turn-turn,focus:focus,assigned:assigned,payer:s.production.batches[0].payer};
  });
  expect(r).toMatchObject({reserved:true,direct:false,worked:true,day:1,focus:0,assigned:false});
  expect(r.payer.kind).toBe('character');
});

test('same-seed replay retains exact production, accounts, source and RNG facts',async function({page},info){
  await boot(page,info,'iron');
  async function facts(){return page.evaluate(function(){
    const s=FB.state,P=FB.production;P.commit(s,P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}));
    return {state:JSON.stringify([s.production,s.siteResources,s.buildings,s.chars,s.owner,s.holder,s.realms]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
  });}
  const first=await facts();await beginBookmark(page,info,'production_iron','production_iron_household');expect(await facts()).toEqual(first);
});

test('advanced recipe technology gates new commitments but preserves funded work and exact mod saves',async function({page},info){
  await boot(page,info,'iron');
  const r=await page.evaluate(function(example){
    const s=FB.state,P=FB.production,id=P.commit(s,P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}));
    P.commit(s,P.aiQuote(s,'iron_plant','work',{batchId:id}));s.turn++;s.date.day++;
    P.commit(s,P.aiQuote(s,'iron_plant','finish',{batchId:id}));
    const tech=FB.realmTechRecord(s,'resource_hill_court');tech.completed=tech.completed.filter(function(x){return x!=='bloomery_iron';});
    const missing=P.aiQuote(s,'iron_plant','reserve',{recipeId:'forge_tools',disposition:'store'});
    tech.completed.push('bloomery_iron');const held=P.commit(s,P.aiQuote(s,'iron_plant','reserve',{recipeId:'forge_tools',disposition:'store'}));
    tech.completed=tech.completed.filter(function(x){return x!=='bloomery_iron';});
    const work=P.aiQuote(s,'iron_plant','work',{batchId:held}).allowed;
    const saved=JSON.parse(FB.save.serialize()),sig=FB.mods.sig(),changed=JSON.parse(JSON.stringify(example));changed.productionRecipes.smelt_ore.workPrice++;
    FB.mods.apply(changed);const before=JSON.stringify(FB.state);let rejected=false;
    try{FB.save.restore(saved);}catch(error){rejected=/different mod/.test(error.message);}
    return {missing:missing.allowed,ids:missing.missingTech,work:work,sig:FB.mods.sig()!==sig,rejected:rejected,pure:before===JSON.stringify(FB.state)};
  },examples.iron);
  expect(r).toEqual({missing:false,ids:['bloomery_iron'],work:true,sig:true,rejected:true,pure:true});
});

for(const width of [390,1280])test(width+'px reviews retain disposition, scroll and focus through Escape and Back',async function({page},info){
  await page.setViewportSize({width:width,height:844});await boot(page,info,'fiber',true);
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);});
  await page.locator('#settlement-production').click();
  await page.locator('#production-disposition-rag_paper').selectOption('use');
  await page.locator('[data-production-review="0"]').click();
  await expect(page.locator('#gm-title')).toContainText('Review production batch');
  expect(await page.evaluate(function(){return FB.state.production.batches.length;})).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#production-disposition-rag_paper')).toHaveValue('use');
  await expect(page.locator('[data-production-review="0"]')).toBeFocused();
  await page.locator('[data-production-review="0"]').click();await page.locator('#production-confirm').click();
  expect(await page.evaluate(function(){return FB.state.production.batches[0].disposition;})).toBe('use');
  await page.locator('#gm-cancel').click();await expect(page.locator('#settlement-production')).toBeFocused();
  const overflow=await page.locator('#gm-body').evaluate(function(el){return el.scrollWidth>el.clientWidth+1;});expect(overflow).toBe(false);
});


test('a mismatched live water claim cannot substitute for the reserved recipe input',async function({page},info){
  await boot(page,info,'fiber');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,id=P.commit(s,P.aiQuote(s,'fiber_plant','reserve',{recipeId:'rag_paper',disposition:'store'}));
    const t=JSON.parse(JSON.stringify(s));t.siteResources.sources.river_intake.reservations[0].amount=2;
    const before=JSON.stringify(t);let rejected=false;
    try{FB.save.v4.validatePlatform(t);}catch(error){rejected=/production/.test(error.message);}
    const orphan=JSON.parse(JSON.stringify(s));delete orphan.production;let orphanRejected=false;
    try{FB.save.v4.validatePlatform(orphan);}catch(error){orphanRejected=/production/.test(error.message);}
    return {reserved:typeof id==='number',rejected:rejected,pure:before===JSON.stringify(t),orphan:orphanRejected};
  });
  expect(r).toEqual({reserved:true,rejected:true,pure:true,orphan:true});
});

test('bundled released worlds have no production assignment or inferred material inventory',async function({page},info){
  await openGame(page,info);
  expect(await page.evaluate(function(){return {goods:Object.keys(FBDATA.productionGoods).sort(),recipes:Object.keys(FBDATA.productionRecipes).sort(),
    plans:['867','1066'].map(function(id){return FB.compileProduction(FB.bookmark(id));})};})).toEqual({goods:['heating_fuel','workshop_fiber','bloomery_ore','workshop_fuel','bloomery_iron_lot','workshop_paper','smithy_tools','fresh_fish','dried_provisions','parent_farm_allocation','pasture_provisions','boathouse_timber','boathouse_cordage','boathouse_work'].sort(),recipes:['workshop_papermaking','bloomery_smelting','smithy_forging','dry_fish','prepare_pasture_allocation','prepare_boathouse_work'].sort(),plans:[{sites:[],errors:[]},{sites:[],errors:[]}]});
});
