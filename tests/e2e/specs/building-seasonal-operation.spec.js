'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={dry:require('../fixtures/authoring/building-seasons-dry.json'),pasture:require('../fixtures/authoring/building-seasons-pasture.json')};
dependsOnRuntime(__filename,['index.html','data/building_seasons.js','data/production.js','data/production_economy.js','data/building_operations.js','data/building_profiles.js','data/climate.js','data/technology.js',
  'js/building_seasons.js','js/production.js','js/production_economy.js','js/building_operations.js','js/building_profiles.js','js/site_resources.js','js/climate.js','js/world.js','js/mods.js',
  'js/main.js','js/save.js','js/save_v4.js','js/actions.js','js/population.js','js/settlement.js','js/lordships.js','js/treasury.js','js/home_authority.js','js/ui_modals.js','js/ui_misc.js']);
async function boot(page,info,kind,ruler,custom) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(custom ? {name:'season-example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))} :
    path.resolve(__dirname,'../fixtures/authoring/building-seasons-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(id){return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[id];},'season_'+kind);
  if (!ruler) return beginBookmark(page,info,'season_'+kind,'season_'+kind+'_household');
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('SEASONREVIEW-season_dry-season_dry_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);});
}
for (const kind of ['dry','pasture']) {
  test(kind+' ordinary import uses its local kind, finite resource policy and pure reviews',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,S=FB.buildingSeasons,plan=S.compile(FB.campaignBookmark(s)),a=plan.assignments[0];
      const before=JSON.stringify([FBDATA,s]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const who=FB.settlementHolder(s,a.countyId,a.slot),q=S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null});
      const blocked=FB.production.aiQuote(s,a.productionSiteId,'reserve',{recipeId:FB.production.snapshot(s)[0].site.recipeIds[0],disposition:'store'});
      return {errors:plan.errors,allowed:q.allowed,blocked:blocked.allowed,season:FB.localSeason(s,a.countyId),calendar:s.date.season,
        pure:before===JSON.stringify([FBDATA,s])&&rng===FB.getRngState()&&uid===FB.getUidCounter(),none:FBDATA.techImpactReviews.features.seasonal_building_commitments.mode};
    });
    expect(r).toEqual({errors:[],allowed:true,blocked:false,season:kind==='dry'?'dry_summer':'summer',calendar:kind==='dry'?1:3,pure:true,none:'none'});
  });
  test(kind+' actual paid output is allocated once and expires without changing property or population',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
      const before=JSON.stringify([s.population,s.buildings,s.chars]),q=S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null});
      const opened=S.commit(s,q),repeat=S.commit(s,q),site=P.snapshot(s)[0].site;
      const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:site.recipeIds[0],disposition:'store'}));
      const shift=P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id}));s.turn++;s.date.day++;
      const finished=P.commit(s,P.aiQuote(s,site.id,'finish',{batchId:id})),lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
      const b=s.buildings[a.countyId].find(function(b){return b.id===a.buildingId;}),initial=FB.buildingOperations.effects(s,a.countyId,b).populationFamineProtection || 0;
      const allocation=S.quote(s,{operation:'allocate',assignmentId:a.id,actor:who,lotId:lot.id}),allocated=S.commit(s,allocation),twice=S.commit(s,allocation);
      const effect=FB.buildingOperations.effects(s,a.countyId,b).populationFamineProtection,available=P.snapshot(s)[0].lots.find(function(l){return l.id===lot.id;}).available;
      P.validate(s);S.validate(s);
      const saved=JSON.stringify([s.production,s.buildingSeasons,s.siteResources]);FB.save.restore(JSON.parse(FB.save.serialize()));
      const t=FB.state,restore=saved===JSON.stringify([t.production,t.buildingSeasons,t.siteResources]);
      t.turn=allocation.untilTurn;t.date.day=t.turn+1;S.boundary(t);S.boundary(t);P.validate(t);S.validate(t);
      return {opened:opened,repeat:repeat,shift:shift,finished:finished,initial:initial,allocated:allocated,twice:twice,effect:effect,available:available,restore:restore,
        expired:FB.buildingOperations.effects(t,a.countyId,t.buildings[a.countyId][0]).populationFamineProtection || 0,
        retained:before===JSON.stringify([t.population,t.buildings,t.chars]),stock:t.production.lots.find(function(l){return l.id===lot.id;}).remaining};
    });
    expect(r).toEqual({opened:true,repeat:false,shift:true,finished:true,initial:0,allocated:true,twice:false,effect:kind==='dry'?0.03:0.02,available:0,restore:true,expired:0,retained:true,stock:0});
  });
  test(kind+' input lifetime closes reserved work once, retains paid work and cannot restart expired stock',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot),site=P.snapshot(s)[0].site;
      S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
      const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:site.recipeIds[0],disposition:'store'}));
      const work=P.commit(s,P.aiQuote(s,site.id,'work',{batchId:id})),assets=JSON.stringify([s.buildings,s.population]),cash=FB.treasuryAvailable(s,who.id);
      s.turn=4;s.date.day=5;
      const unavailable=P.snapshot(s)[0].lots[0].available,finish=P.aiQuote(s,site.id,'finish',{batchId:id}).allowed;
      const count=S.boundary(s),again=S.boundary(s),batch=s.production.batches[0];P.validate(s);S.validate(s);
      const saved=JSON.stringify([s.buildingSeasons,s.production]);FB.save.restore(JSON.parse(FB.save.serialize()));
      return {work:work,unavailable:unavailable,finish:finish,count:count,again:again,status:batch.status,workDays:batch.workTurns.length,
        lost:s.production.lots[0].remaining,paid:cash===FB.treasuryAvailable(s,who.id),retained:assets===JSON.stringify([s.buildings,s.population]),
        restore:saved===JSON.stringify([FB.state.buildingSeasons,FB.state.production]),output:s.production.lots.filter(function(l){return l.origin.kind==='batch';}).length};
    });
    expect(r).toMatchObject({work:true,unavailable:0,finish:false,again:0,status:'cancelled',workDays:1,lost:0,paid:true,retained:true,restore:true,output:0});
    expect(r.count).toBeGreaterThan(0);
  });
  test(kind+' stale terms and lost current authority fail without consuming resources or property',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,S=FB.buildingSeasons,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
      const original=JSON.parse(JSON.stringify(s)),request={operation:'open',assignmentId:a.id,actor:who,lotId:null};
      const changes=[function(t){t.turn++;t.date.day++;},function(t){t.date.season=0;},function(t){t.buildings[a.countyId][0].ruined=true;},
        function(t){t.chars[FB.political.actor(t,who).characterId].imprisoned=true;}];
      return changes.map(function(change){const t=JSON.parse(JSON.stringify(original)),q=S.quote(t,request);change(t);const before=JSON.stringify(t);return !S.commit(t,q)&&before===JSON.stringify(t);});
    });
    expect(r).toEqual([true,true,true,true]);
  });
}

test('a partially funded water term prorates upkeep and ends once at the actual local season boundary',async function({page},info){
  await boot(page,info,'dry');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,O=FB.buildingOperations,a=S.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.date.day=89;
    const q=S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}),opened=S.commit(s,q);
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who},service=O.quote(s,req),funded=O.commit(s,service),b=s.buildings[a.countyId][0];
    const active=O.effects(s,a.countyId,b).populationCapacity;
    s.turn=2;s.date.day=1;s.date.season=2;const first=S.boundary(s),saved=JSON.stringify([s.buildingSeasons,s.siteResources,s.buildingOperations]),repeat=S.boundary(s);
    O.validate(s);S.validate(s);
    return {opened:opened,until:q.untilTurn,serviceUntil:service.untilTurn,cost:service.cost,funded:funded,active:active,expired:O.effects(s,a.countyId,b).populationCapacity,
      first:first,repeat:repeat,pure:saved===JSON.stringify([s.buildingSeasons,s.siteResources,s.buildingOperations]),again:O.commit(s,O.quote(s,req))};
  });
  expect(r).toMatchObject({opened:true,until:2,serviceUntil:2,funded:true,active:0.03,expired:0,first:1,repeat:0,pure:true,again:false});
  expect(r.cost).toBeCloseTo(2+2*2/90,12);
});

test('summer care and grazing interruption suspend only the opted-in benefit',async function({page},info){
  await boot(page,info,'pasture');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    const id=P.commit(s,P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'transfer_farm',disposition:'store'}));
    P.commit(s,P.aiQuote(s,a.productionSiteId,'work',{batchId:id}));s.turn++;s.date.day++;
    P.commit(s,P.aiQuote(s,a.productionSiteId,'finish',{batchId:id}));const lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
    S.commit(s,S.quote(s,{operation:'allocate',assignmentId:a.id,actor:who,lotId:lot.id}));
    const b=s.buildings[a.countyId][0],before=JSON.stringify([s.buildings,s.population]),keeper=s.chars[s.buildingSeasons.terms[0].characterId];
    keeper.imprisoned=true;const suspended=FB.buildingOperations.effects(s,a.countyId,b).populationFamineProtection;
    const first=S.boundary(s),again=S.boundary(s);keeper.imprisoned=false;P.validate(s);S.validate(s);
    const personRetained=S.referencesCharacter(s,keeper.id)&&FB.courtRecordRetained(s,keeper);
    return {suspended:suspended,first:first,again:again,resume:FB.buildingOperations.effects(s,a.countyId,b).populationFamineProtection,
      retained:before===JSON.stringify([s.buildings,s.population]),personRetained:personRetained,grazing:s.siteResources.sources.farm_grazing.consumed,stock:lot.remaining};
  });
  expect(r).toEqual({suspended:0,first:1,again:0,resume:0,retained:true,personRetained:true,grazing:1,stock:0});
});

test('AI uses the same funded live gates and does not consume grazing for an unfunded plant',async function({page},info){
  await boot(page,info,'pasture');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,who=FB.settlementHolder(s,'resource_hill',0),gold=s.realms[who.id].treasury.gold;
    s.realms[who.id].treasury.gold=0;const before=JSON.stringify(s),blocked=S.runAI(s),pure=before===JSON.stringify(s);
    s.realms[who.id].treasury.gold=gold;const applied=S.runAI(s),again=S.runAI(s);S.validate(s);
    return {blocked:blocked,pure:pure,applied:applied,again:again,used:s.siteResources.sources.farm_grazing.consumed};
  });
  expect(r).toEqual({blocked:0,pure:true,applied:1,again:0,used:1});
});

test('unallocated output expires once from its actual batch date and a pending matching restore does no work',async function({page},info){
  await boot(page,info,'dry');
  const r=await page.evaluate(function(){
    let s=FB.state;const S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    const id=P.commit(s,P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'dry_fish',disposition:'store'}));
    const pending=JSON.stringify([s.production,s.buildingSeasons,s.siteResources]);FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const restored=pending===JSON.stringify([s.production,s.buildingSeasons,s.siteResources]);
    P.commit(s,P.aiQuote(s,a.productionSiteId,'work',{batchId:id}));s.turn++;s.date.day++;
    P.commit(s,P.aiQuote(s,a.productionSiteId,'finish',{batchId:id}));const lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
    const due=S.lotExpiry(s,lot),before=JSON.stringify([s.buildings,s.population]);s.turn=due;s.date.day=due+1;
    const unavailable=S.lotAvailable(s,lot),first=S.boundary(s),again=S.boundary(s);P.validate(s);S.validate(s);
    return {restored:restored,due:due,unavailable:unavailable,first:first,again:again,quantity:lot.remaining,
      receipts:s.buildingSeasons.debits.filter(function(d){return d.lotId===lot.id && d.kind==='expired';}).length,retained:before===JSON.stringify([s.buildings,s.population])};
  });
  expect(r).toMatchObject({restored:true,due:9,unavailable:0,again:0,quantity:0,receipts:1,retained:true});expect(r.first).toBeGreaterThan(0);
});

test('seasonal AI dispatch funds actual water service without manufacturing extra stock or repeating the period',async function({page},info){
  await boot(page,info,'dry');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,O=FB.buildingOperations,a=S.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    const first=S.dayAI(s),before=JSON.stringify([s.buildingSeasons,s.siteResources,s.buildingOperations,s.production,s.realms]),again=S.dayAI(s);
    O.validate(s);S.validate(s);
    return {first:first,again:again,pure:before===JSON.stringify([s.buildingSeasons,s.siteResources,s.buildingOperations,s.production,s.realms]),
      terms:s.buildingSeasons.terms.length,receipts:Object.keys(s.buildingOperations.receipts).length,
      active:O.effects(s,a.countyId,s.buildings[a.countyId][0]).populationCapacity,production:s.production.batches.length};
  });
  expect(r).toEqual({first:3,again:0,pure:true,terms:2,receipts:1,active:0.03,production:0});
});

test('the real player day boundary expires reserved inputs without a second workday or output',async function({page},info){
  await boot(page,info,'dry',true);
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));s.turn=3;s.date.day=4;
    const id=P.commit(s,P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'dry_fish',disposition:'store'})),revision=s.production.revision;
    FB.ui.closeModal();FB.game.passDay({skipFocus:true,deferUi:true});const b=s.production.batches.find(function(b){return b.id===id;});
    return {turn:s.turn,status:b.status,shifts:b.workTurns.length,revision:s.production.revision-revision,stock:s.production.lots[0].remaining,
      outputs:s.production.lots.filter(function(l){return l.origin.kind==='batch';}).length};
  });
  expect(r).toEqual({turn:4,status:'cancelled',shifts:0,revision:1,stock:0,outputs:0});
});

test('stale stock allocation spends owned provisions only once',async function({page},info){
  await boot(page,info,'dry');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    const id=P.commit(s,P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'dry_fish',disposition:'store'}));P.commit(s,P.aiQuote(s,a.productionSiteId,'work',{batchId:id}));
    s.turn++;s.date.day++;P.commit(s,P.aiQuote(s,a.productionSiteId,'finish',{batchId:id}));const lot=s.production.lots.find(function(l){return l.origin.kind==='batch';});
    const q=S.quote(s,{operation:'allocate',assignmentId:a.id,actor:who,lotId:lot.id});s.turn++;s.date.day++;
    const before=JSON.stringify(s),stale=S.commit(s,q),pure=before===JSON.stringify(s);
    const fresh=S.quote(s,q.request),applied=S.commit(s,fresh),repeat=S.commit(s,fresh);P.validate(s);S.validate(s);
    return {stale:stale,pure:pure,applied:applied,repeat:repeat,available:S.lotAvailable(s,lot),debit:S.debited(s,lot.id)};
  });
  expect(r).toEqual({stale:false,pure:true,applied:true,repeat:false,available:0,debit:1});
});

test('missing actual fuel never produces an opted-in drying benefit',async function({page},info){
  const custom=JSON.parse(JSON.stringify(examples.dry));
  custom.bookmarks.season_dry.revisions.supplied.productionSites[0].openingLots=custom.bookmarks.season_dry.revisions.supplied.productionSites[0].openingLots.filter(function(l){return l.goodId!=='dry_fuel';});
  await boot(page,info,'dry',false,custom);
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));const q=P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'dry_fish',disposition:'store'}),before=JSON.stringify(s);
    return {allowed:q.allowed,commit:P.commit(s,q),pure:before===JSON.stringify(s),effect:FB.buildingOperations.effects(s,a.countyId,s.buildings[a.countyId][0]).populationFamineProtection};
  });
  expect(r).toEqual({allowed:false,commit:false,pure:true,effect:0});
});

test('a seasonal window supplies no replacement for missing water and same-seed opening replays exactly',async function({page},info){
  await boot(page,info,'dry');
  async function facts(){return page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,R=FB.siteResources,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const claim=R.commit(s,R.quote(s,{operation:'reserve',sourceId:'river_intake',actor:who,amount:12}));
    R.commit(s,R.quote(s,{operation:'consume',sourceId:'river_intake',actor:who,reservationId:claim}));
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    const q=P.aiQuote(s,a.productionSiteId,'reserve',{recipeId:'dry_fish',disposition:'store'}),before=JSON.stringify(s);
    return {allowed:q.allowed,apply:P.commit(s,q),pure:before===JSON.stringify(s),state:JSON.stringify([s.production,s.buildingSeasons,s.siteResources]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
  });}
  const first=await facts();expect(first).toMatchObject({allowed:false,apply:false,pure:true});
  await beginBookmark(page,info,'season_dry','season_dry_household');expect(await facts()).toEqual(first);
});

function stockMarketExample() {
  const custom=JSON.parse(JSON.stringify(require('../fixtures/authoring/production-suppliers-harbor.json')).replace(/production_suppliers_harbor/g,'season_dry'));
  const bm=custom.bookmarks.season_dry;
  custom.buildings.fiber_works.populationFamineProtection=0.03;
  function policy(days){return {seasonKinds:['spring'],periodDays:7,maxDays:7,care:false,stockLives:[{goodId:'fresh_fish',days:days}],
    benefit:{goodId:'fresh_fish',quantity:4,effect:'populationFamineProtection',days:2}};}
  custom.buildingSeasonProfiles={fresh_source:policy(4),fresh_receiver:policy(8)};
  bm.revisions.supplied.buildingSeasonAssignments=[{id:'source_window',profileId:'fresh_source',operationId:null,productionSiteId:'fish_source',resources:[]},
    {id:'receiver_window',profileId:'fresh_receiver',operationId:null,productionSiteId:'fish_plant',resources:[]}];
  return custom;
}
test('real owned delivery and funded sale preserve the earliest declared stock expiry at an untagged buyer',async function({page},info){
  await boot(page,info,'dry',false,stockMarketExample());
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,E=FB.productionEconomy,P=FB.production;
    s.turn=1;s.date.day=2;
    const moved=E.commit(s,E.aiQuote(s,'owned_delivery',2,'transfer'));
    const child=s.production.lots.find(function(l){return l.origin.kind==='exchange';}),childDue=S.lotExpiry(s,child);
    const q=E.aiQuote(s,'fish_market',1,'sell'),buyer=P.account(s,q.buyer).funds.available,seller=P.account(s,q.seller).funds.available;
    const sold=E.commit(s,q),receipt=s.production.economy.receipts.find(function(x){return x.id===sold;}),bought=s.production.lots.find(function(l){return l.id===receipt.lotId;});
    const buyerPaid=buyer-P.account(s,q.buyer).funds.available,sellerPaid=P.account(s,q.seller).funds.available-seller;
    const boughtDue=S.lotExpiry(s,bought);s.turn=4;s.date.day=5;
    const unavailable=E.aiQuote(s,'fish_market',1,'sell').allowed,first=S.boundary(s),again=S.boundary(s);P.validate(s);S.validate(s);
    const saved=JSON.stringify([s.production,s.buildingSeasons]);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {moved:!!moved,sold:!!sold,childDue:childDue,boughtDue:boughtDue,paid:buyerPaid===q.cost&&sellerPaid===q.cost,unavailable:unavailable,again:again,
      child:child.remaining,bought:bought.remaining,first:first,restore:saved===JSON.stringify([FB.state.production,FB.state.buildingSeasons])};
  });
  expect(r).toMatchObject({moved:true,sold:true,childDue:4,boughtDue:4,paid:true,unavailable:false,again:0,child:0,bought:0,restore:true});expect(r.first).toBeGreaterThan(0);
});

test('allocated stock cannot enter the real sale path and a stale sale cannot reverse its commitment',async function({page},info){
  await boot(page,info,'dry',false,stockMarketExample());
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,E=FB.productionEconomy,P=FB.production,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const sale=E.aiQuote(s,'fish_market',4,'sell'),lot=P.snapshot(s)[0].lots[0];
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    const committed=S.commit(s,S.quote(s,{operation:'allocate',assignmentId:a.id,actor:who,lotId:lot.id})),before=JSON.stringify(s);
    const stale=E.commit(s,sale),pure=before===JSON.stringify(s),blocked=E.aiQuote(s,'fish_market',4,'sell').allowed;P.validate(s);S.validate(s);
    return {review:sale.allowed,committed:committed,stale:stale,pure:pure,blocked:blocked,remaining:s.production.lots.find(function(l){return l.id===lot.id;}).remaining};
  });
  expect(r).toEqual({review:true,committed:true,stale:false,pure:true,blocked:false,remaining:2});
});

test('detached seasonal imports reject unknown kinds, consumers, stock policies and aliased physical assets',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.buildingSeasonProfiles.farm_window.seasonKinds=['unknown'];},function(m){m.buildingSeasonProfiles.farm_window.periodDays=0;},
      function(m){m.buildingSeasonProfiles.farm_window.maxDays=91;},function(m){m.buildingSeasonProfiles.farm_window.stockLives[0].days=0;},
      function(m){m.buildingSeasonProfiles.farm_window.stockLives[0].goodId='missing';},function(m){m.buildingSeasonProfiles.farm_window.benefit.effect='people';},
      function(m){m.bookmarks.season_pasture.buildingSeasonAssignments[0].productionSiteId='missing';},
      function(m){m.bookmarks.season_pasture.buildingSeasonAssignments[0].resources[0].amount=99;},
      function(m){m.bookmarks.season_pasture.buildingSeasonAssignments[0].resources[0].sourceId='upland_fold';},
      function(m){const a=JSON.parse(JSON.stringify(m.bookmarks.season_pasture.buildingSeasonAssignments[0]));a.id='duplicate';m.bookmarks.season_pasture.buildingSeasonAssignments.push(a);},
      function(m){m.bookmarks.season_pasture.buildingSeasonAssignments[0].execute='untrusted';},function(m){m.buildingSeasonProfiles=[];}];
    const bad=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),bad:bad,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.pasture);
  expect(r).toEqual({valid:[],bad:Array(12).fill(true),pure:true});
});

test('strict saves reject forged terms and losses before adopting state; matching restore never reseeds stock',async function({page},info){
  await boot(page,info,'pasture');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));s.turn=4;s.date.day=5;S.boundary(s);
    const changes=[function(t){t.buildingSeasons.version=2;},function(t){t.buildingSeasons.definition='wrong';},function(t){t.buildingSeasons.terms[0].untilTurn=999;},
      function(t){t.buildingSeasons.terms[0].assetId=999;},function(t){t.buildingSeasons.terms.push(t.buildingSeasons.terms[0]);},
      function(t){t.buildingSeasons.debits[0].quantity++;},function(t){t.buildingSeasons.debits[0].turn++;},function(t){t.buildingSeasons.debits=[];},
      function(t){t.production.lots[0].remaining=4;},function(t){delete t.buildingSeasons;}];
    const bad=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);try{FB.save.v4.validatePlatform(t);return false;}catch(error){return before===JSON.stringify(t);}});
    const saved=JSON.stringify([s.production,s.buildingSeasons]),rng=FB.getRngState(),uid=FB.getUidCounter();FB.save.restore(JSON.parse(FB.save.serialize()));
    return {bad:bad,restore:saved===JSON.stringify([FB.state.production,FB.state.buildingSeasons]),identity:(rng>>>0)===(FB.getRngState()>>>0)&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({bad:Array(10).fill(true),restore:true,identity:true});
});

for(const width of [390,1280])test(width+'px seasonal reviews keep focus and Back state without committing on Escape',async function({page},info){
  await page.setViewportSize({width:width,height:844});await boot(page,info,'dry',true);
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);});
  await page.locator('#settlement-seasons').click();await page.locator('[data-season-review="0"]').click();
  await expect(page.locator('#gm-title')).toContainText('Review seasonal commitment');await page.keyboard.press('Escape');
  await expect(page.locator('[data-season-review="0"]')).toBeFocused();
  expect(await page.evaluate(function(){return FB.state.buildingSeasons;})).toBeUndefined();
  await page.locator('[data-season-review="0"]').click();await page.locator('#season-confirm').click();
  expect(await page.evaluate(function(){return FB.state.buildingSeasons.terms.length;})).toBe(1);
  await page.locator('#gm-cancel').click();await expect(page.locator('#settlement-seasons')).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
});

test('bundled worlds and legacy saves retain no inferred season owner',async function({page},info){
  await beginBookmark(page,info,'867');
  const r=await page.evaluate(function(){
    const s=FB.state,before=JSON.stringify(s);FB.buildingSeasons.validate(s);FB.buildingSeasons.boundary(s);
    return {table:Object.keys(FBDATA.buildingSeasonProfiles),plans:['867','1066'].map(function(id){return FB.buildingSeasons.compile(FB.bookmark(id));}),
      absent:s.buildingSeasons===undefined,pure:before===JSON.stringify(s)};
  });
  expect(r).toEqual({table:[],plans:[{assignments:[],errors:[]},{assignments:[],errors:[]}],absent:true,pure:true});
});
