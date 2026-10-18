'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={cool:require('../fixtures/authoring/fish-drying-cool.json'),wet:require('../fixtures/authoring/fish-drying-wet.json')};
dependsOnRuntime(__filename,['index.html','data/buildings_fish_drying.js','data/production_fish_drying.js','data/climate.js','data/technology.js',
  'data/production.js','data/production_economy.js','data/building_seasons.js','data/economy.js','data/economy_maritime.js',
  'js/production.js','js/production_economy.js','js/building_seasons.js','js/building_operations.js','js/building_profiles.js','js/site_resources.js',
  'js/climate.js','js/economy.js','js/market.js','js/logistics.js','js/treasury.js','js/actions.js','js/world.js','js/main.js','js/starts.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/population.js','js/lordships.js','js/settlement.js','js/model.js','js/ui_modals.js','js/ui_misc.js']);
async function boot(page,info,kind,options) {
  options=options || {};
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(options.custom ? {name:'fish-example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(options.custom))} :
    path.resolve(__dirname,'../fixtures/authoring/fish-drying-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  if (options.npc) await beginBookmark(page,info,'fish_'+kind,'fish_'+kind+'_household');
  else {
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    const suffix=kind==='cool'?'fjord_quay-m-Ivar_Holm':'rain_harbor-f-Edda_Rain';
    await page.locator('#ng-seed').fill('FISHREVIEW-fish_'+kind+'-fish_'+kind+'_ruler-'+suffix+'-standard');
    await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function(kind){
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';
    const P=FB.production,S=FB.buildingSeasons,E=FB.productionEconomy;
    window.FISH={
      site:function(){return P.snapshot(FB.state).find(function(r){return r.site.id==='drying_plant';});},
      actor:function(){const a=FISH.site().site;return FB.settlementHolder(FB.state,a.countyId,a.slot);},
      effect:function(){const s=FB.state,a=FISH.site().site,b=s.buildings[a.countyId].find(function(b){return b.id==='fish_drying_station';});return FB.buildingOperations.effects(s,a.countyId,b).populationFamineProtection || 0;},
      open:function(){return S.commit(FB.state,S.quote(FB.state,{operation:'open',assignmentId:'drying_window',actor:FISH.actor(),lotId:null}));},
      catch:function(){
        const s=FB.state,a=FISH.site().site;s.player.gold=10000;s.realms['fish_'+kind+'_buyer'].treasury.gold=10000;
        s.player.enterpriseMigration=1;s.player.enterprises=[];s.player.enterpriseLabor=[];
        const e={uid:'actual_fishery',type:kind==='cool'?'fishing_boat_business':'wet_fishery',provinceId:a.countyId,settlement:a.slot,workerId:null};
        s.player.enterprises.push(e);if(!FB.hireEnterpriseWorker(s,e.uid))throw new Error('Expected a real local paid worker');
        FB.enterpriseWorkerIds(e).forEach(function(id){s.chars[id].skills.ste=20;});
        // Stage one harvest boundary, without simulating a year or granting a material lot.
        s.turn=90;s.date={year:kind==='cool'?851:921,season:kind==='cool'?0:2,day:1};
        const raw=FB.enterprisePhysicalYield(s,e),output=FB.marketEnterpriseOutput(s,e),first=FB.marketSeason(s),again=FB.marketSeason(s);
        const receipt=s.production.economy.receipts.find(function(x){return x.kind==='producer';});
        if(!receipt)throw new Error('Actual producer output must be sufficient for its conservative mapping');
        return {raw:raw,output:output.provisions,after:FB.marketEnterpriseOutput(s,e).provisions,first:first,again:again,quantity:receipt.quantity,
          marketQuantity:receipt.marketQuantity,income:receipt.income,diverted:E.incomeDiverted(s,e),staff:FB.enterpriseWorkerIds(e).length};
      },
      prepare:function(){FISH.catch();const s=FB.state;s.turn=91;s.date.day=2;if(!FISH.open())throw new Error('Expected cool opening');
        const q=P.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'}),id=P.commit(s,q);if(!id)throw new Error('Expected real funded fish reservation');return {id:id,quote:q};},
      finish:function(){const s=FB.state,b=FISH.prepare(),q=P.aiQuote(s,'drying_plant','work',{batchId:b.id});
        const direct=P.commit(s,q),worked=P.perform(s,q),finished=P.commit(s,P.aiQuote(s,'drying_plant','finish',{batchId:b.id}));
        if(!worked || !finished)throw new Error('Expected a paid actual player workday and completion');
        return {direct:direct,worked:worked,finished:finished,lot:s.production.lots.find(function(l){return l.origin.kind==='batch';})};}
    };
  },kind);
}
for(const kind of ['cool','wet'])test(kind+' ordinary import uses local weather, exact declarations and pure reviews',async function({page},info){
  await boot(page,info,kind);
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,a=FISH.site().site,before=JSON.stringify([FBDATA,s]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=S.quote(s,{operation:'open',assignmentId:'drying_window',actor:FISH.actor(),lotId:null});
    return {errors:S.compile(FB.campaignBookmark(s)).errors,allowed:q.allowed,local:FB.localSeason(s,a.countyId),calendar:s.date.season,
      pure:before===JSON.stringify([FBDATA,s]) && rng===FB.getRngState() && uid===FB.getUidCounter(),effect:FISH.effect(),
      none:FBDATA.techImpactReviews.features.baseline_fish_drying.mode,technology:FBDATA.buildings.fish_drying_station.requiresTech || null,
      fish:s.production.lots.filter(function(l){return l.goodId==='fresh_fish';}).length};
  });
  expect(r).toEqual({errors:[],allowed:kind==='cool',local:kind==='cool'?'cool_season':'warm_wet',calendar:kind==='cool'?0:2,pure:true,effect:0,none:'none',technology:null,fish:0});
});
test('849/850 is an inclusive construction permission and no world receives an inferred plant',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=FISH.site().site.countyId,years=[800,849,850,1300,1301].map(function(year){
      const t=JSON.parse(JSON.stringify(s));t.date.year=year;return FB.buildingApplicabilityStatus(t,pid,'fish_drying_station',FISH.actor()).ready;
    });
    const originals=Object.keys(FBDATA.bookmarks).filter(function(k){return k!=='fish_cool';}).every(function(k){
      const bm=FB.bookmark(k);return !((bm.openingInfrastructure || {}).placements || []).some(function(p){return p.buildingId==='fish_drying_station';});
    });
    return {years:years,originals:originals};
  });
  expect(r).toEqual({years:[false,false,true,true,false],originals:true});
});
for(const kind of ['cool','wet'])test(kind+' staffed actual output diverts once from both ordinary income and market output',async function({page},info){
  await boot(page,info,kind);
  const r=await page.evaluate(function(){const r=FISH.catch();FB.production.validate(FB.state);return r;});
  expect(r).toMatchObject({first:true,again:false,quantity:kind==='cool'?2:1,staff:1});
  expect(r.output-r.after).toBeCloseTo(r.marketQuantity,8);expect(r.diverted).toBe(r.income);expect(r.income).toBeLessThanOrEqual(r.raw);
});
test('real player work produces one conserved lot and allocation grants 0.03 only once',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,made=FISH.finish(),before=FISH.effect();
    const q=S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id});
    const allocated=S.commit(s,q),again=S.commit(s,q),effect=FISH.effect(),sold=FB.productionEconomy.aiQuote(s,'provisions_sale',1,'sell').allowed;
    P.validate(s);S.validate(s);
    return {direct:made.direct,worked:made.worked,finished:made.finished,before:before,allocated:allocated,again:again,effect:effect,sold:sold,
      raw:s.production.lots.find(function(l){return l.origin.kind==='producer';}).remaining,output:made.lot.quantity,remaining:s.production.lots.find(function(l){return l.id===made.lot.id;}).remaining};
  });
  expect(r).toEqual({direct:false,worked:true,finished:true,before:0,allocated:true,again:false,effect:0.03,sold:false,raw:0,output:1,remaining:0});
});
test('local preserved-fish allocation remains useful when the declared buyer cannot pay',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,S=FB.buildingSeasons;
    FISH.catch();s.turn=91;s.date.day=2;FISH.open();s.realms.fish_cool_buyer.treasury.gold=0;
    const outlet=P.outletReady(s,'drying_plant',FBDATA.productionRecipes.dry_fish.outputs);
    const q=P.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'}),id=P.commit(s,q);
    const worked=P.perform(s,P.aiQuote(s,'drying_plant','work',{batchId:id})),finished=P.commit(s,P.aiQuote(s,'drying_plant','finish',{batchId:id}));
    const lot=s.production.lots.find(function(x){return x.origin.kind==='batch';});
    const allocated=S.commit(s,S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:lot.id}));
    P.validate(s);S.validate(s);
    return {outlet:outlet,reserved:!!id,worked:worked,finished:finished,allocated:allocated,effect:FISH.effect(),buyer:s.realms.fish_cool_buyer.treasury.gold};
  });
  expect(r).toEqual({outlet:false,reserved:true,worked:true,finished:true,allocated:true,effect:0.03,buyer:0});
});

test('a newly paid station enrolls empty and can process an actual later catch without replaying opening stock',async function({page},info){
  const custom=JSON.parse(JSON.stringify(examples.cool)),bm=custom.bookmarks.fish_cool;
  bm.productionSites[0].openingLots=[];bm.openingInfrastructure.placements=bm.openingInfrastructure.placements.filter(function(p){return p.countyId!=='fjord_quay';});
  await boot(page,info,'cool',{custom:custom});
  const r=await page.evaluate(function(){
    const s=FB.state,a=FISH.site().site;s.player.gold=10000;s.turn=1;s.date.day++;
    const cost=FB.buildCost(s,a.countyId,'fish_drying_station'),before=s.player.gold,built=FB.build(s,a.countyId,a.slot,'fish_drying_station'),paid=before-s.player.gold;
    const empty=s.production.lots.length===0,asset=s.production.assets.find(function(x){return x.siteId==='drying_plant';}),made=FISH.finish();
    FB.production.validate(s);FB.buildingSeasons.validate(s);
    const saved=JSON.stringify(s.production);FB.save.restore(JSON.parse(FB.save.serialize()));FB.production.initialize(FB.state);
    return {built:built,cost:cost,paid:paid,empty:empty,constructed:asset.constructed,opened:asset.openedTurn,finished:made.finished,output:made.lot.quantity,
      restore:saved===JSON.stringify(FB.state.production),generic:FB.state.production.lots.filter(function(l){return l.goodId==='generic_food';}).length};
  });
  expect(r).toMatchObject({built:true,empty:true,constructed:true,opened:1,finished:true,output:1,restore:true,generic:0});expect(r.paid).toBe(r.cost);
});
test('a real sale consumes the same output, transfers actual cash and provides no simultaneous protection',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,E=FB.productionEconomy,P=FB.production,S=FB.buildingSeasons,made=FISH.finish(),q=E.aiQuote(s,'provisions_sale',1,'sell');
    const seller=P.account(s,q.seller).funds.available,buyer=P.account(s,q.buyer).funds.available,id=E.commit(s,q),again=E.commit(s,q);
    const allocate=S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id});P.validate(s);S.validate(s);
    const child=s.production.lots.find(function(l){return l.origin.kind==='exchange';});
    return {sold:!!id,again:again,allocate:allocate.allowed,effect:FISH.effect(),paid:buyer-P.account(s,q.buyer).funds.available,
      received:P.account(s,q.seller).funds.available-seller,cost:q.cost,expiry:S.lotExpiry(s,child),original:S.lotExpiry(s,made.lot)};
  });
  expect(r).toMatchObject({sold:true,again:false,allocate:false,effect:0});expect(r.paid).toBe(r.cost);expect(r.received).toBe(r.cost);expect(r.expiry).toBeLessThanOrEqual(r.original);
});
test('allocated protection ends at the earlier term boundary and never renews or creates a second loss',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,made=FISH.finish(),q=S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id});
    S.commit(s,q);const active=FISH.effect(),assets=JSON.stringify([s.buildings,s.population]);
    s.date.day+=q.untilTurn-s.turn;s.turn=q.untilTurn;
    const before=FISH.effect(),first=S.boundary(s),again=S.boundary(s);FB.production.validate(s);S.validate(s);
    return {active:active,before:before,first:first,again:again,effect:FISH.effect(),remaining:s.production.lots.find(function(l){return l.id===made.lot.id;}).remaining,
      losses:s.buildingSeasons.debits.filter(function(d){return d.lotId===made.lot.id && d.kind==='expired';}).length,retained:assets===JSON.stringify([s.buildings,s.population])};
  });
  expect(r).toMatchObject({active:0.03,before:0,again:0,effect:0,remaining:0,losses:0,retained:true});expect(r.first).toBeGreaterThan(0);
});
test('stale allocation and sale reviews cannot spend reserved provisions twice',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,E=FB.productionEconomy,made=FISH.finish(),sale=E.aiQuote(s,'provisions_sale',1,'sell');
    const q=S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id});s.turn++;s.date.day++;
    const before=JSON.stringify(s),stale=S.commit(s,q),pure=before===JSON.stringify(s),allocated=S.commit(s,S.quote(s,q.request)),snapshot=JSON.stringify(s),blocked=E.commit(s,sale);
    return {stale:stale,pure:pure,allocated:allocated,blocked:blocked,unchanged:snapshot===JSON.stringify(s),effect:FISH.effect()};
  });
  expect(r).toEqual({stale:false,pure:true,allocated:true,blocked:false,unchanged:true,effect:0.03});
});
test('raw fish expires from its actual diverted receipt and generic food never substitutes',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production;FISH.catch();s.turn=91;s.date.day=2;FISH.open();
    const fish=s.production.lots.find(function(l){return l.origin.kind==='producer';}),due=S.lotExpiry(s,fish);s.turn=due;s.date.day=due-89;
    const q=P.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'}),before=JSON.stringify(s),apply=P.commit(s,q),pure=before===JSON.stringify(s);
    const first=S.boundary(s),again=S.boundary(s);P.validate(s);S.validate(s);
    return {due:due,allowed:q.allowed,apply:apply,pure:pure,first:first,again:again,fish:fish.remaining,
      generic:s.production.lots.find(function(l){return l.goodId==='generic_food';}).remaining,effect:FISH.effect()};
  });
  expect(r).toMatchObject({due:94,allowed:false,apply:false,pure:true,again:0,fish:0,generic:10,effect:0});expect(r.first).toBeGreaterThan(0);
});
test('unallocated preserved stock is lost once at its bounded expiry and cannot be sold',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,made=FISH.finish(),due=S.lotExpiry(s,made.lot),assets=JSON.stringify([s.buildings,s.population]);
    const delta=due-s.turn;s.turn=due;s.date.day+=delta;
    const sell=FB.productionEconomy.aiQuote(s,'provisions_sale',1,'sell').allowed,available=S.lotAvailable(s,made.lot),first=S.boundary(s),again=S.boundary(s);
    P.validate(s);S.validate(s);
    return {due:due,born:s.production.batches[0].closedTurn,available:available,sell:sell,first:first,again:again,effect:FISH.effect(),
      remaining:s.production.lots.find(function(l){return l.id===made.lot.id;}).remaining,losses:s.buildingSeasons.debits.filter(function(d){return d.lotId===made.lot.id && d.kind==='expired';}).length,
      retained:assets===JSON.stringify([s.buildings,s.population])};
  });
  expect(r).toMatchObject({available:0,sell:false,again:0,effect:0,remaining:0,losses:1,retained:true});expect(r.due-r.born).toBe(30);expect(r.first).toBeGreaterThan(0);
});
test('warm local weather blocks opening and paid processing despite a real fish harvest',async function({page},info){
  await boot(page,info,'wet');
  const r=await page.evaluate(function(){
    const s=FB.state;FISH.catch();const before=JSON.stringify(s),open=FISH.open(),q=FB.production.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'});
    return {open:open,allowed:q.allowed,commit:FB.production.commit(s,q),pure:before===JSON.stringify(s),effect:FISH.effect(),local:FB.localSeason(s,FISH.site().site.countyId)};
  });
  expect(r).toEqual({open:false,allowed:false,commit:false,pure:true,effect:0,local:'warm_wet'});
});
test('player funding and interrupted assets reject fresh or stale paid work atomically',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production;FISH.catch();s.turn=91;s.date.day=2;FISH.open();const q=P.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'});
    const base=JSON.stringify(s),a=FISH.site().site;
    const changes=[function(t){t.player.gold=0;},function(t){t.buildings[a.countyId][0].ruined=true;},function(t){t.chars[t.player.charId].imprisoned=true;},function(t){t.date.season=1;}];
    return changes.map(function(change){const t=JSON.parse(base);change(t);const before=JSON.stringify(t);return !P.commit(t,q)&&before===JSON.stringify(t);});
  });
  expect(r).toEqual([true,true,true,true]);
});
test('NPC funding retains the real treasury reserve and dispatch supplies no automatic workday',async function({page},info){
  const custom=JSON.parse(JSON.stringify(examples.cool));custom.bookmarks.fish_cool.productionSites[0].openingLots.push({goodId:'fresh_fish',quantity:2});
  await boot(page,info,'cool',{npc:true,custom:custom});
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,S=FB.buildingSeasons,who=FISH.actor();s.realms[who.id].treasury.gold=0;
    const before=JSON.stringify(s),blocked=S.runAI(s),pure=before===JSON.stringify(s);s.realms[who.id].treasury.gold=10000;
    const opened=S.runAI(s),repeat=S.runAI(s),q=P.aiQuote(s,'drying_plant','reserve',{recipeId:'dry_fish',disposition:'store'}),id=P.commit(s,q);
    const worked=P.commit(s,P.aiQuote(s,'drying_plant','work',{batchId:id}));s.turn++;s.date.day++;
    const finished=P.commit(s,P.aiQuote(s,'drying_plant','finish',{batchId:id}));P.validate(s);S.validate(s);
    return {blocked:blocked,pure:pure,opened:opened,repeat:repeat,paid:s.production.batches[0].paid,payer:q.payer,who:who,worked:worked,finished:finished,effect:FISH.effect()};
  });
  expect(r).toMatchObject({blocked:0,pure:true,opened:1,repeat:0,paid:2,worked:true,finished:true,effect:0});expect(r.payer).toEqual(r.who);
});
test('matching spent-stock saves restore without reseeding, renewed terms or new knowledge',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,P=FB.production,made=FISH.finish();S.commit(s,S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id}));
    const before=JSON.stringify([s.production,s.buildingSeasons,s.realmTech,s.buildings]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));P.initialize(FB.state);FB.productionEconomy.initialize(FB.state);
    return {same:before===JSON.stringify([FB.state.production,FB.state.buildingSeasons,FB.state.realmTech,FB.state.buildings]),
      harvest:FB.productionEconomy.harvest(FB.state),rng:(rng>>>0)===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter()};
  });
  expect(r).toEqual({same:true,harvest:false,rng:true,uid:true});
});
test('strict saves reject invented stock, lost provenance and forged benefit without mutating the candidate',async function({page},info){
  await boot(page,info,'cool');
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,made=FISH.finish();S.commit(s,S.quote(s,{operation:'allocate',assignmentId:'drying_window',actor:FISH.actor(),lotId:made.lot.id}));
    const changes=[function(t){t.production.lots.find(function(l){return l.id===made.lot.id;}).remaining++;},function(t){t.buildingSeasons.debits[0].quantity++;},
      function(t){t.buildingSeasons.debits[0].untilTurn++;},function(t){t.production.economy.receipts=[];},function(t){delete t.buildingSeasons;},function(t){t.production.batches[0].paid++;}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);try{FB.save.v4.validatePlatform(t);return false;}catch(error){return before===JSON.stringify(t);}});
  });
  expect(r).toEqual(Array(6).fill(true));
});
test('detached imports reject untyped fish, an unknown policy and invalid stock lifetimes without publication',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){delete m.enterpriseMechanics.wet_fishery.typedProduction;},function(m){m.productionProducerProfiles.wet_fish_share.goodId='generic_food';},
      function(m){m.buildingSeasonProfiles.buyer_preserved.stockLives[0].days=0;},function(m){m.buildings.preserved_store.seasonProfile='unknown';},
      function(m){m.bookmarks.fish_wet.buildingSeasonAssignments[0].profileId='buyer_preserved';}];
    const bad=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),bad:bad,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.wet);
  expect(r).toEqual({valid:[],bad:Array(5).fill(true),pure:true});
});
