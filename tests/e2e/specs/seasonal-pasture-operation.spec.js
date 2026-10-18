'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={faroes:require('../fixtures/authoring/seasonal-pasture-faroes.json'),upland:require('../fixtures/authoring/seasonal-pasture-upland.json')};
dependsOnRuntime(__filename,['index.html','data/buildings_seasonal_pasture.js','data/production_seasonal_pasture.js',
  'data/production.js','data/production_economy.js','data/building_seasons.js','data/economy.js','data/technology.js','data/climate.js',
  'js/production.js','js/production_economy.js','js/building_seasons.js','js/site_resources.js','js/building_operations.js','js/building_profiles.js',
  'js/economy.js','js/market.js','js/logistics.js','js/lordships.js','js/treasury.js','js/climate.js','js/mods.js','js/world.js','js/main.js',
  'js/actions.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

async function boot(page,info,kind,custom) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(custom ? {name:'pasture-ai.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))} :
    path.resolve(__dirname,'../fixtures/authoring/seasonal-pasture-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const id='pasture_'+kind;
  const birthplace=custom ? 'pasture_buyer-m-Odo_Vale' : kind==='faroes'?'faroes-m-Arno_Stone':'pasture_hill-m-Ivo_Reed';
  await page.locator('#ng-seed').fill('PASTURE-'+id+'-'+id+'_ruler-'+birthplace+'-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);});
}

async function allocateFarm(page,kind) {
  return page.evaluate(function(kind){
    const s=FB.state,E=FB.productionEconomy;
    s.player.gold=10000;s.player.enterpriseMigration=1;s.player.enterprises=[];s.player.enterpriseLabor=[];
    // This is already-owned parent property, with actual ordinary staffing before the boundary.
    const e={uid:'existing_parent_farm',type:kind==='faroes'?'field_strip':'upland_parent_farm',provinceId:s.player.provinceId,settlement:0,workerId:null};
    s.player.enterprises.push(e);
    if(!FB.hireEnterpriseWorker(s,e.uid))throw new Error('Parent farm staffing failed');
    s.turn=90;s.date.season=kind==='faroes'?1:3;s.date.day=1;
    const output=FB.marketEnterpriseOutput(s,e),raw=FB.enterprisePhysicalYield(s,e),before=JSON.stringify(e);
    const first=E.harvest(s),again=E.harvest(s),receipt=s.production.economy.receipts.find(function(r){return r.kind==='producer';});
    const after=FB.marketEnterpriseOutput(s,e);
    if(!receipt)throw new Error('No actual allocated farm output');
    FB.production.validate(s);
    return {first:first,again:again,quantity:receipt.quantity,output:output.provisions-after.provisions,
      expected:receipt.marketQuantity,income:E.incomeDiverted(s,e),expectedIncome:receipt.income,raw:raw,
      unchanged:before===JSON.stringify(e),staff:FB.enterpriseWorkerIds(e).length,stock:s.production.lots[0].remaining};
  },kind);
}

async function prepare(page) {
  return page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0];
    const who=FB.settlementHolder(s,a.countyId,a.slot),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null});
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const opened=S.commit(s,q),repeat=S.commit(s,q);
    const reserve=P.aiQuote(s,'farm_outpost','reserve',{recipeId:'prepare_pasture_allocation',disposition:'store'});
    const batch=P.commit(s,reserve),paid=s.production.batches.find(function(b){return b.id===batch;}).paid;
    const shifts=[];
    for(let n=0;n<FBDATA.productionRecipes.prepare_pasture_allocation.workDays;n++)
      shifts.push(P.perform(s,P.aiQuote(s,'farm_outpost','work',{batchId:batch})));
    const finish=P.aiQuote(s,'farm_outpost','finish',{batchId:batch}),finished=P.commit(s,finish),twice=P.commit(s,finish);
    P.validate(s);S.validate(s);
    const lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
    return {pure:pure,opened:opened,repeat:repeat,batch:!!batch,paid:paid,shifts:shifts,finished:finished,twice:twice,
      input:s.production.lots.find(function(l){return l.goodId==='parent_farm_allocation';}).remaining,
      quantity:lot.quantity,expiry:S.lotExpiry(s,lot)-s.turn,kind:FB.localSeason(s,a.countyId),
      grazing:s.siteResources.sources.farm_grazing.consumed,until:q.untilTurn,
      capacity:FB.buildingOperations.effects(s,a.countyId,s.buildings[a.countyId][0]).populationCapacity || 0};
  });
}

for(const kind of ['faroes','upland']) {
  test(kind+' ordinary import diverts only actual staffed parent output once and processes a conserved paid share',async function({page},info){
    await boot(page,info,kind);
    expect(await page.evaluate(function(){return FB.state.production.lots.length;})).toBe(0);
    const farm=await allocateFarm(page,kind);
    expect(farm).toMatchObject({first:true,again:false,quantity:1,unchanged:true,staff:1,stock:1});
    expect(farm.output).toBe(farm.expected);expect(farm.income).toBe(farm.expectedIncome);expect(farm.income).toBeLessThanOrEqual(farm.raw);
    expect(await prepare(page)).toEqual({pure:true,opened:true,repeat:false,batch:true,paid:kind==='faroes'?2:3,
      shifts:kind==='faroes'?[true]:[true,true],finished:true,twice:false,input:0,quantity:1,expiry:kind==='faroes'?30:8,
      kind:kind==='faroes'?'summer':'cool_season',grazing:1,until:kind==='faroes'?180:102,capacity:0});
  });

  test(kind+' output sells once to real funded demand, with neither duplicate farm proceeds nor a population award',async function({page},info){
    await boot(page,info,kind);await allocateFarm(page,kind);await prepare(page);
    const r=await page.evaluate(function(){
      const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,'pasture_sale',1,'sell');
      const buyer=FB.production.account(s,q.buyer),seller=FB.production.account(s,q.seller),population=JSON.stringify(s.population);
      const id=E.commit(s,q),repeat=E.commit(s,q),next=E.aiQuote(s,'pasture_sale',1,'sell');
      FB.production.validate(s);FB.buildingSeasons.validate(s);
      return {id:!!id,repeat:repeat,again:next.allowed,cost:q.cost,
        buyer:buyer.funds.available-FB.production.account(s,q.buyer).funds.available,
        seller:FB.production.account(s,q.seller).funds.available-seller.funds.available,
        source:s.production.lots.find(function(l){return l.origin.kind==='batch';}).remaining,
        quantity:s.production.lots.filter(function(l){return l.goodId==='pasture_provisions';}).reduce(function(n,l){return n+l.remaining;},0),
        population:population===JSON.stringify(s.population),allocation:FB.productionEconomy.harvest(s)};
    });
    expect(r).toMatchObject({id:true,repeat:false,again:false,source:0,quantity:1,population:true,allocation:false});
    expect(r.buyer).toBe(r.cost);expect(r.seller).toBe(r.cost);expect(r.cost).toBeGreaterThan(0);
  });

  test(kind+' exact stock expiry is pure before its boundary and debits once without replacing farm, people or buildings',async function({page},info){
    await boot(page,info,kind);await allocateFarm(page,kind);await prepare(page);
    const r=await page.evaluate(function(){
      const s=FB.state,S=FB.buildingSeasons,lot=s.production.lots.find(function(l){return l.origin.kind==='batch';}),expiry=S.lotExpiry(s,lot);
      const retained=JSON.stringify([s.population,s.buildings,s.player.enterprises,Object.keys(s.chars)]);
      s.date.day+=expiry-s.turn-1;s.turn=expiry-1;const last=S.lotAvailable(s,lot);
      s.date.day++;s.turn++;const before=JSON.stringify(s),available=S.lotAvailable(s,lot),sale=FB.productionEconomy.aiQuote(s,'pasture_sale',1,'sell').allowed;
      const pure=before===JSON.stringify(s),first=S.boundary(s),again=S.boundary(s);FB.production.validate(s);S.validate(s);
      return {last:last,available:available,sale:sale,pure:pure,first:first,again:again,remaining:lot.remaining,
        losses:s.buildingSeasons.debits.filter(function(d){return d.lotId===lot.id;}).length,
        retained:retained===JSON.stringify([s.population,s.buildings,s.player.enterprises,Object.keys(s.chars)])};
    });
    expect(r).toMatchObject({last:1,available:0,sale:false,pure:true,again:0,remaining:0,losses:1,retained:true});
    expect(r.first).toBeGreaterThan(0);
  });

  test(kind+' matching restore retains original producer, work, consumed inputs and expiry without replay',async function({page},info){
    await boot(page,info,kind);await allocateFarm(page,kind);await prepare(page);
    const r=await page.evaluate(function(){
      const s=FB.state,before=JSON.stringify([s.production,s.buildingSeasons,s.siteResources,s.player.enterprises,s.population]);
      const rng=FB.getRngState(),uid=FB.getUidCounter();FB.save.restore(JSON.parse(FB.save.serialize()));
      FB.production.initialize(FB.state);FB.productionEconomy.initialize(FB.state);
      return {same:before===JSON.stringify([FB.state.production,FB.state.buildingSeasons,FB.state.siteResources,FB.state.player.enterprises,FB.state.population]),
        replay:FB.productionEconomy.harvest(FB.state),rng:(rng>>>0)===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter()};
    });
    expect(r).toEqual({same:true,replay:false,rng:true,uid:true});
  });
}

test('winter, lost grazing rights, exhausted capacity, absent care and current work funding reject without changing property',async function({page},info){
  await boot(page,info,'faroes');await allocateFarm(page,'faroes');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,who=FB.settlementHolder(s,'faroes',0),base=JSON.stringify(s);
    const variants=[function(t){t.date.season=3;},function(t){t.holder.faroes='buyer_court';},
      function(t){t.chars[t.player.charId].imprisoned=true;},function(t){
        const R=FB.siteResources,q=R.quote(t,{operation:'reserve',sourceId:'farm_grazing',actor:who,amount:2}),id=R.commit(t,q);
        R.commit(t,R.quote(t,{operation:'consume',sourceId:'farm_grazing',actor:who,reservationId:id}));}];
    const blocked=variants.map(function(change){const t=JSON.parse(base);change(t);const before=JSON.stringify(t);
      return !S.commit(t,S.quote(t,{operation:'open',assignmentId:'pasture_term',actor:who,lotId:null}))&&before===JSON.stringify(t);});
    S.commit(s,S.quote(s,{operation:'open',assignmentId:'pasture_term',actor:who,lotId:null}));
    s.player.gold=0;if(s.realms[who.id].treasury)s.realms[who.id].treasury.gold=0;
    const before=JSON.stringify(s),q=P.aiQuote(s,'farm_outpost','reserve',{recipeId:'prepare_pasture_allocation',disposition:'store'});
    return {blocked:blocked,funding:q.allowed,pure:before===JSON.stringify(s),charged:P.commit(s,q)};
  });
  expect(r).toEqual({blocked:[true,true,true,true],funding:false,pure:true,charged:false});
});

test('unworked, remote and foreign parent farms cannot create an allocation',async function({page},info){
  await boot(page,info,'faroes');
  const r=await page.evaluate(function(){
    const s=FB.state,E=FB.productionEconomy;s.player.enterpriseMigration=1;s.player.gold=10000;
    const e={uid:'existing_farm',type:'field_strip',provinceId:'faroes',settlement:0,workerId:null};s.player.enterprises=[e];
    s.turn=90;s.date.season=1;s.date.day=1;
    const unstaffed=E.harvest(s);if(!FB.hireEnterpriseWorker(s,e.uid))throw new Error('Staffing failed');
    e.provinceId='pasture_buyer';const remote=E.harvest(s);e.provinceId='faroes';s.holder.faroes='buyer_court';const foreign=E.harvest(s);
    return {unstaffed:unstaffed,remote:remote,foreign:foreign,lots:s.production.lots.length};
  });
  expect(r).toEqual({unstaffed:false,remote:false,foreign:false,lots:0});
});

test('AI opens no inputless or unfunded grazing window and rechecks current reserves before paid work',async function({page},info){
  const custom=JSON.parse(JSON.stringify(examples.faroes)),start=custom.startScenarios[0];
  start.rulerRealmId='buyer_court';start.fixedProvinceId='pasture_buyer';start.characterName='Odo Vale';
  custom.bookmarks.pasture_faroes.date.season=1;
  // An explicit fictional prior allocation tests NPC processing reserves; NPC farm harvest is not an adapter here.
  custom.bookmarks.pasture_faroes.productionSites[0].openingLots=[{goodId:'parent_farm_allocation',quantity:1}];
  await boot(page,info,'faroes',custom);
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,who=FB.settlementHolder(s,'faroes',0),base=JSON.stringify(s);
    s.realms[who.id].treasury.gold=0;
    const before=JSON.stringify(s),count=S.runAI(s),pure=before===JSON.stringify(s);
    const t=JSON.parse(base),funded=S.runAI(t),again=S.runAI(t);
    const empty=JSON.parse(base);empty.buildings.faroes[0].ruined=true;
    const unused=JSON.stringify(empty),unusable=S.runAI(empty);
    return {count:count,pure:pure,funded:funded,again:again,used:t.siteResources.sources.farm_grazing.consumed,
      unusable:unusable,untouched:unused===JSON.stringify(empty)};
  });
  expect(r).toEqual({count:0,pure:true,funded:1,again:0,used:1,unusable:0,untouched:true});
});

test('stale grazing and production reviews cannot consume capacity, charge again or duplicate output',async function({page},info){
  await boot(page,info,'faroes');await allocateFarm(page,'faroes');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,who=FB.settlementHolder(s,'faroes',0),request={operation:'open',assignmentId:'pasture_term',actor:who,lotId:null};
    const q=S.quote(s,request);s.turn++;s.date.day++;const before=JSON.stringify(s),stale=S.commit(s,q),pure=before===JSON.stringify(s);
    S.commit(s,S.quote(s,request));const reserve=P.aiQuote(s,'farm_outpost','reserve',{recipeId:'prepare_pasture_allocation',disposition:'store'});
    s.player.gold++;const changed=JSON.stringify(s),charge=P.commit(s,reserve);
    return {stale:stale,pure:pure,charge:charge,atomic:changed===JSON.stringify(s),batches:s.production.batches.length};
  });
  expect(r).toEqual({stale:false,pure:true,charge:false,atomic:true,batches:0});
});

test('winter interruption and input expiry retain funded work without free completion or a replacement farm',async function({page},info){
  await boot(page,info,'upland');await allocateFarm(page,'upland');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,who=FB.settlementHolder(s,'pasture_hill',0);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:'pasture_term',actor:who,lotId:null}));
    const id=P.commit(s,P.aiQuote(s,'farm_outpost','reserve',{recipeId:'prepare_pasture_allocation',disposition:'store'}));
    const work=P.perform(s,P.aiQuote(s,'farm_outpost','work',{batchId:id})),batch=s.production.batches.find(function(b){return b.id===id;});
    const t=JSON.parse(JSON.stringify(s));t.turn=180;t.date.year++;t.date.season=0;t.date.day=1;
    const winter=P.aiQuote(t,'farm_outpost','work',{batchId:id}).allowed;
    const retained=JSON.stringify([s.buildings,s.population,s.player.enterprises]),expiry=S.lotExpiry(s,s.production.lots[0]);
    s.date.day+=expiry-s.turn;s.turn=expiry;S.boundary(s);const again=S.boundary(s);P.validate(s);S.validate(s);
    return {work:work,winter:winter,status:batch.status,days:batch.workTurns.length,paid:batch.paid,again:again,
      output:s.production.lots.filter(function(l){return l.origin.kind==='batch';}).length,
      retained:retained===JSON.stringify([s.buildings,s.population,s.player.enterprises])};
  });
  expect(r).toEqual({work:true,winter:false,status:'cancelled',days:1,paid:3,again:0,output:0,retained:true});
});

test('malformed imports and scenery references reject detached; matching saves reject forged stock and missing provenance',async function({page},info){
  await openGame(page,info);
  const validation=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.bookmarks.pasture_faroes.productionSites[0].siteId='scenery';},
      function(m){m.bookmarks.pasture_faroes.siteResourceAssignments[0].suitability={launching:true};},
      function(m){m.enterpriseMechanics.field_strip.typedProduction.parent_farm_allocation.marketUnits=1;},
      function(m){m.bookmarks.pasture_faroes.productionProducerAssignments[0].siteId='missing';},
      function(m){m.bookmarks.pasture_faroes.buildingSeasonAssignments[0].resources[0].amount=3;}];
    return {valid:FB.mods.validate(example),bad:changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;}),
      pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.faroes);
  expect(validation).toEqual({valid:[],bad:[true,true,true,true,true],pure:true});
  await boot(page,info,'faroes');await allocateFarm(page,'faroes');await prepare(page);
  const bad=await page.evaluate(function(){
    const s=FB.state,changes=[function(t){t.production.lots[0].remaining++;},function(t){delete t.production.economy;},
      function(t){t.production.economy.receipts[0].enterpriseUid='';},function(t){delete t.buildingSeasons;},
      function(t){t.production.batches[0].paid++;},function(t){t.siteResources.sources.farm_grazing.consumed++;}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);
      try{FB.save.v4.validatePlatform(t);return false;}catch(error){return before===JSON.stringify(t);}});
  });
  expect(bad).toEqual([true,true,true,true,true,true]);
});

test('bundled catalogue adds one nontechnological outpost and no historical farm, hut, stock or capacity',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){
    const b=FBDATA.buildings.shieling;
    return {cost:b.cost,upkeep:b.upkeep,devMin:b.devMin,max:b.maxCounty,ai:b.aiBuildOrder,draw:b.settlementDraw,
      applicability:b.applicability,tech:b.requiresTech || null,capacity:b.populationCapacity || 0,
      mode:FBDATA.techImpactReviews.features.seasonal_parent_farm.mode,
      errors:FB.validateBuildingData(FBDATA.buildings,true).concat(FB.production.catalogFaults(FBDATA),FB.productionEconomy.catalogFaults(FBDATA),FB.buildingSeasons.catalogFaults(FBDATA)),
      installations:Object.keys(FBDATA.bookmarks).filter(function(id){return FB.bookmarkRevisions(id).some(function(bm){
        return (bm.productionSites || []).some(function(a){return a.buildingId==='shieling';}) ||
          (bm.openingInfrastructure && bm.openingInfrastructure.placements || []).some(function(a){return a.buildingId==='shieling';});
      });})};
  });
  expect(r).toEqual({cost:20,upkeep:1,devMin:0,max:1,ai:34,draw:false,applicability:{yearMin:850,yearMax:1300,countyIds:['faroes']},
    tech:null,capacity:0,mode:'none',errors:[],installations:[]});
});
