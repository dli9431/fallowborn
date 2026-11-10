'use strict';
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const inland=require('../fixtures/authoring/production-suppliers-inland.json');
dependsOnRuntime(__filename,['index.html','data/map_data.js','data/production.js','data/production_economy.js','data/technology.js','data/economy.js',
  'js/ledger_retention.js','js/production.js','js/production_economy.js','js/building_seasons.js','js/building_operations.js','js/maritime_work.js',
  'js/relay_services.js','js/siege_support.js','js/site_resources.js','js/balance.js','js/market.js','js/treasury.js','js/lordships.js',
  'js/world.js','js/mods.js','js/main.js','js/starts.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js','js/model.js',
  'data/maritime_work.js','js/technology.js','js/economy.js']);

/* Two ordinary JSON imports of the inland supplier world: one keeps the default
   window, the other declares a shorter balance window. Both give the iron plant
   explicit large opening stock so long settled histories can be staged directly. */
function variant(days) {
  const mod=JSON.parse(JSON.stringify(inland));
  mod.name=days ? 'Inland production with a short retention window' : 'Inland production with retained history';
  const bm=mod.bookmarks.production_suppliers_inland,site=bm.productionSites.find(function(a){return a.id==='iron_plant';});
  // The current ruler-profile contract requires each authored ruler's sex.
  bm.realms.forEach(function(r){r.ruler.sex='m';});
  site.openingLots=[{goodId:'iron_ore_lot',quantity:3000},{goodId:'charcoal_lot',quantity:2000}];
  if(days)mod.balance={ledgerRetentionDays:days};
  return mod;
}
async function boot(page,info,days) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'ledger-retention.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(variant(days)),'utf8')});
  const faults=await page.evaluate(function(text){return FB.mods.validate(JSON.parse(text));},JSON.stringify(variant(days)));
  if(faults.length)throw new Error('Mod faults: '+faults.join(' | '));
  const errors=[];
  page.on('pageerror',function(error){errors.push(error.message);});
  const navigation=page.waitForNavigation({waitUntil:'domcontentloaded'}).then(function(){return null;},function(){return 'no reload; page errors: '+errors.join(' | ');});
  await page.locator('#mod-apply').click();
  // A rejected import explains itself through its toast instead of a navigation timeout.
  const rejected=page.locator('#toasts .toast').first().waitFor({state:'attached'}).then(function(){return page.locator('#toasts').textContent();},function(){return new Promise(function(){});});
  const outcome=await Promise.race([navigation,rejected]);
  if(outcome)throw new Error('Mod import rejected: '+outcome);
  await prepareGameContent(page);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('EXCHANGE-production_suppliers_inland-production_suppliers_inland_ruler-resource_hill-m-Arno_Stone-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);
    // Leaf staging helpers: exact records that the strict production validator accepts.
    window.retentionStage={
      plant:function(t){return t.production.assets.find(function(a){return a.siteId==='iron_plant';});},
      opening:function(t,goodId){const a=this.plant(t);
        return t.production.lots.find(function(l){return l.assetId===a.id && l.goodId===goodId && l.origin.kind==='opening';});},
      // Stage a long campaign directly: whole years, ending on the first day of a season.
      age:function(t,years){t.turn+=years*360;t.date.year+=years;t.date.day=1;},
      batch:function(t,turn,disposition,status,inputs){
        const r=t.production,a=this.plant(t),actor=JSON.parse(JSON.stringify(a.owner)),person=FB.political.actor(FB.state,actor);
        inputs=inputs || [{lotId:this.opening(t,'iron_ore_lot').id,quantity:2},{lotId:this.opening(t,'charcoal_lot').id,quantity:1}];
        const b={id:r.nextId++,siteId:'iron_plant',assetId:a.id,recipeId:'smelt_ore',actor:actor,workerId:person.characterId,
          generation:actor.kind==='realm'?person.rulerGeneration:null,inputs:JSON.parse(JSON.stringify(inputs)),outputs:[],disposition:disposition,paid:2,
          payer:JSON.parse(JSON.stringify(actor)),waterClaimId:null,waterPeriod:null,status:status,openedTurn:turn,
          closedTurn:status==='reserved'?null:turn,workTurns:status==='committed'?[turn]:[]};
        r.batches.push(b);r.revision+=status==='committed'?3:status==='cancelled'?2:1;
        if(status==='committed'){
          inputs.forEach(function(x){r.lots.find(function(l){return l.id===x.lotId;}).remaining-=x.quantity;});
          const id=r.nextId++;b.outputs.push(id);
          r.lots.push({id:id,assetId:a.id,owner:JSON.parse(JSON.stringify(actor)),goodId:'iron_bloom_lot',unit:FBDATA.productionGoods.iron_bloom_lot.unit,
            quantity:1,remaining:disposition==='store'?1:0,origin:{kind:'batch',batchId:b.id}});
        }
        return b;
      }
    };
  });
}

test('settled history beyond the old 512 cap leaves production open and folds exactly at the season boundary',async function({page},info){
  await boot(page,info,null);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,H=window.retentionStage;
    H.age(s,12);
    for(let n=1;n<=600;n++)H.batch(s,n,'use','committed');
    for(let n=601;n<=640;n++)H.batch(s,n,'store','cancelled');
    P.validate(s);
    const plant=H.plant(s),ore=H.opening(s,'iron_ore_lot'),fuel=H.opening(s,'charcoal_lot'),r=s.production;
    const before={lots:r.lots.length,batches:r.batches.length,live:P.liveCounts(s),nextId:r.nextId,revision:r.revision};
    const early=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'});
    const cutoff=s.turn-FB.ledgerRetention.days(),old=r.batches.filter(function(b){return b.closedTurn<=cutoff;});
    const expected={lots:old.filter(function(b){return b.outputs.length;}).length,quantity:old.reduce(function(n,b){return n+b.outputs.length;},0),
      batches:old.length,cancelled:old.filter(function(b){return !b.outputs.length;}).length,
      workDays:old.reduce(function(n,b){return n+b.workTurns.length;},0),paid:old.reduce(function(n,b){return n+b.paid;},0),openings:[]};
    const used={ore:old.filter(function(b){return b.outputs.length;}).length*2,fuel:old.filter(function(b){return b.outputs.length;}).length};
    const copy=JSON.parse(JSON.stringify(s)),rng=FB.getRngState(),uid=FB.getUidCounter(),gold=s.player.gold;
    const changed=FB.buildingSeasons.boundary(s);
    const twin=FB.buildingSeasons.boundary(copy),afterOnce=JSON.stringify(s.production),again=FB.buildingSeasons.boundary(s);
    const afterTwice=JSON.stringify(s.production),pure=rng===FB.getRngState() && uid===FB.getUidCounter() && gold===s.player.gold;
    const counters=[s.production.nextId===before.nextId,s.production.revision===before.revision];
    const left={lots:s.production.lots.length,batches:s.production.batches.length};
    P.validate(s);
    const folded=s.production.retired;
    const q=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}),next=s.production.nextId,id=P.commit(s,q);P.validate(s);
    const row=P.snapshot(s).find(function(x){return x.site.id==='iron_plant';});
    FB.ui.showProduction(row.site.countyId,row.site.slot,function(){});
    const sheet=document.getElementById('gm-body').textContent;
    return {failure:FB.ledgerRetention.lastFailure,before:before,early:early.allowed,days:FB.ledgerRetention.days(),changed:changed>0,twin:twin>0,
      deterministic:JSON.stringify(copy.production)===afterOnce,again:again,idempotent:afterOnce===afterTwice,
      expected:expected,assets:folded.assets[String(plant.id)],used:{ore:folded.used[String(ore.id)],fuel:folded.used[String(fuel.id)]},expectedUse:used,
      ledgers:folded.ledgers.trades,lots:left.lots,batchesLeft:left.batches,
      sameCounters:counters,pure:pure,
      reserved:typeof id==='number' && id===next && q.allowed,history:row.history,sheet:/Earlier records/.test(sheet) && /600 spent lots/.test(sheet)};
  });
  expect(r.failure).toBe(null);
  // Before: arrays far above the old lifetime caps, but only four live lots and no live batch.
  expect(r.before.lots).toBe(604);expect(r.before.batches).toBe(640);
  expect(r.before.live).toMatchObject({lots:4,batches:0,trades:0});
  expect(r.early).toBe(true);expect(r.days).toBe(3600);
  expect(r).toMatchObject({changed:true,twin:true,deterministic:true,again:0,idempotent:true,ledgers:0,lots:4,batchesLeft:0,reserved:true,pure:true,sheet:true});
  expect(r.sameCounters).toEqual([true,true]);
  expect(r.assets).toEqual(r.expected);expect(r.history).toEqual(r.expected);
  expect(r.expected).toEqual({lots:600,quantity:600,batches:640,cancelled:40,workDays:600,paid:1280,openings:[]});
  expect(r.used).toEqual(r.expectedUse);
});

test('live reservations, stored output and trade provenance survive compaction and round-trip through saves',async function({page},info){
  await boot(page,info,null);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,E=FB.productionEconomy,H=window.retentionStage;
    const trade=E.commit(s,E.aiQuote(s,'ore_market',2,'buy'));
    const receipt=s.production.economy.receipts.find(function(x){return x.id===trade;}),bought=s.production.lots.find(function(l){return l.id===receipt.lotId;});
    const supplier=receipt.inputs[0].lotId;
    H.age(s,12);
    const spent=H.batch(s,10,'use','committed',[{lotId:bought.id,quantity:2},{lotId:H.opening(s,'charcoal_lot').id,quantity:1}]);
    const stored=H.batch(s,20,'store','committed'),pending=H.batch(s,30,'store','reserved');
    P.validate(s);
    const held=P.snapshot(s).find(function(x){return x.site.id==='iron_plant';}).lots.find(function(l){return l.id===H.opening(s,'iron_ore_lot').id;});
    FB.buildingSeasons.boundary(s);P.validate(s);
    const r=s.production,ids=function(list){return list.map(function(x){return x.id;});};
    const after=P.snapshot(s).find(function(x){return x.site.id==='iron_plant';});
    const afterHeld=after.lots.find(function(l){return l.id===held.id;});
    const output=r.lots.find(function(l){return l.id===stored.outputs[0];});
    const result={
      folded:{trade:!r.economy.receipts.some(function(x){return x.id===trade;}),bought:!r.lots.some(function(l){return l.id===bought.id;}),
        spent:!r.batches.some(function(b){return b.id===spent.id;}),spentOutput:!r.lots.some(function(l){return l.id===spent.outputs[0];})},
      kept:{stored:ids(r.batches).indexOf(stored.id)>=0,output:!!output && output.origin.batchId===stored.id && output.remaining===1,
        pending:r.batches.some(function(b){return b.id===pending.id && b.status==='reserved';}),supplier:r.lots.some(function(l){return l.id===supplier;})},
      reservation:{before:held.remaining-held.available,after:afterHeld.remaining-afterHeld.available},
      ledgers:r.retired.ledgers,tradePaid:receipt.paid,
      used:{supplier:r.retired.used[String(supplier)],fuel:r.retired.used[String(H.opening(s,'charcoal_lot').id)]},
      asset:r.retired.assets[String(H.plant(s).id)]
    };
    const saved=JSON.parse(FB.save.serialize()),text=JSON.stringify(s.production);
    FB.save.restore(saved);
    result.roundTrip=text===JSON.stringify(FB.state.production);
    const resaved=JSON.parse(FB.save.serialize());
    result.resaved=JSON.stringify(resaved.state.production)===JSON.stringify(saved.state.production);
    FB.save.restore(resaved);
    const t=FB.state,cancel=P.commit(t,P.aiQuote(t,'iron_plant','cancel',{batchId:pending.id}));P.validate(t);
    result.cancelled=cancel===true && t.production.batches.find(function(b){return b.id===pending.id;}).status==='cancelled';
    function rejects(change){
      const copy=JSON.parse(JSON.stringify(resaved)),state=JSON.stringify(FB.state);change(copy.state.production);
      try{FB.save.restore(copy);return false;}catch(error){return /Invalid saved production/.test(error.message) && state===JSON.stringify(FB.state);}
    }
    const plantKey=String(H.plant(t).id);
    result.rejects={
      use:rejects(function(p){p.retired.used[String(supplier)]+=1;}),
      batches:rejects(function(p){p.retired.assets[plantKey].batches+=1;}),
      unknownAsset:rejects(function(p){p.retired.assets['999']=p.retired.assets[plantKey];}),
      trades:rejects(function(p){p.retired.ledgers.trades+=1;}),
      field:rejects(function(p){p.retired.extra=0;})
    };
    return result;
  });
  expect(r.folded).toEqual({trade:true,bought:true,spent:true,spentOutput:true});
  expect(r.kept).toEqual({stored:true,output:true,pending:true,supplier:true});
  expect(r.reservation).toEqual({before:2,after:2});
  expect(r.ledgers).toMatchObject({trades:1,traded:2,tradePaid:r.tradePaid,invoices:0,deliveries:0});
  expect(r.used).toEqual({supplier:2,fuel:1});
  expect(r.asset).toEqual({lots:2,quantity:3,batches:1,cancelled:0,workDays:1,paid:2,openings:[]});
  expect(r).toMatchObject({roundTrip:true,resaved:true,cancelled:true});
  expect(r.rejects).toEqual({use:true,batches:true,unknownAsset:true,trades:true,field:true});
});

test('too many live records are still refused at write and rejected on load',async function({page},info){
  await boot(page,info,null);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,E=FB.productionEconomy,H=window.retentionStage;
    H.age(s,12);
    for(let n=1;n<=508;n++)H.batch(s,n,'store','committed');
    P.validate(s);
    const live=P.liveCounts(s),reserve=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'});
    const buy=E.aiQuote(s,'ore_market',1,'buy'),folded=FB.buildingSeasons.boundary(s);
    const saved=JSON.parse(FB.save.serialize()),state=JSON.stringify(FB.state);
    H.batch(saved.state,509,'store','committed');
    let message='';
    try{FB.save.restore(saved);}catch(error){message=error.message;}
    return {live:live,reserve:reserve.allowed,buy:buy.allowed,folded:folded,batches:s.production.batches.length,
      message:message,unchanged:state===JSON.stringify(FB.state)};
  });
  expect(r.live).toMatchObject({lots:512,batches:508});
  expect(r).toMatchObject({reserve:false,buy:false,folded:0,batches:508,unchanged:true});
  expect(r.message).toMatch(/Invalid saved production/);
});

test('an imported shorter retention window folds only history settled before its own cutoff',async function({page},info){
  await boot(page,info,720);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,H=window.retentionStage;
    H.age(s,4);
    for(let n=401;n<=1000;n++)H.batch(s,n,'use','committed');
    P.validate(s);
    const cutoff=s.turn-FB.ledgerRetention.days(),old=s.production.batches.filter(function(b){return b.closedTurn<=cutoff;}).length;
    FB.buildingSeasons.boundary(s);P.validate(s);
    const totals=s.production.retired.assets[String(H.plant(s).id)];
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {days:FB.ledgerRetention.days(),old:old,kept:s.production.batches.length,earliest:s.production.batches[0].closedTurn,cutoff:cutoff,
      batches:totals.batches,lots:totals.lots,paid:totals.paid,restored:JSON.stringify(FB.state.production)===JSON.stringify(s.production)};
  });
  expect(r.days).toBe(720);
  expect(r.old).toBeGreaterThan(0);expect(r.old).toBeLessThan(600);
  expect(r).toMatchObject({kept:600-r.old,batches:r.old,lots:r.old,paid:2*r.old,restored:true});
  expect(r.earliest).toBeGreaterThan(r.cutoff);
});

/* Maintained boat work: a real paid batch and one real cancelled invoice, then
   more settled invoices than the old lifetime cap of 512, staged directly. */
async function bootRiver(page,info) {
  const mod=JSON.parse(JSON.stringify(require('../fixtures/authoring/maritime-work-river.json')));
  mod.name='Maritime river work with retained history';
  Object.keys(mod.bookmarks).forEach(function(key){(mod.bookmarks[key].realms || []).forEach(function(r){if(r.ruler)r.ruler.sex='m';});});
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  const faults=await page.evaluate(function(text){return FB.mods.validate(JSON.parse(text));},JSON.stringify(mod));
  if(faults.length)throw new Error('Mod faults: '+faults.join(' | '));
  await page.locator('#modfile').setInputFiles({name:'ledger-retention-river.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('BOATWORK-maritime_river-maritime_river_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';FB.game.uiPrefs.hideTips=true;FB.game.uiPrefs.hideBeginnerHints=true;
    const s=FB.state;s.player.gold=2000;
    const record=FB.realmTechRecord(s,FB.techRealmId(s));
    for(const key of ['knarrs','sternpost_rudder','dry_docks'])if(record.completed.indexOf(key)<0)record.completed.push(key);
  });
}

test('more settled maritime invoices than the old cap leave preparation open and fold into exact totals',async function({page},info){
  await bootRiver(page,info);
  const r=await page.evaluate(function(){
    // Each phase is named so an unexpected rejection explains where it happened.
    let phase='setup';
    try{
    const s=FB.state,P=FB.production,M=FB.maritimeWork,recipe=FBDATA.productionRecipes.prepare_boat_work;
    const batch=P.commit(s,P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boat_work',disposition:'store'}));
    for(let n=0;n<recipe.workDays;n++)if(!P.perform(s,P.aiQuote(s,'boat_plant','work',{batchId:batch})))throw new Error('Expected a real paid action day.');
    if(!P.commit(s,P.aiQuote(s,'boat_plant','finish',{batchId:batch})))throw new Error('Expected the worked batch to finish.');
    const id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    // The current ordinary enterprise price can be fractional, which the invoice validator rejects; stage a whole price.
    const profile=FBDATA.maritimeWorkProfiles.maintained_river,staged=s.production.maritime.invoices.find(function(x){return x.id===id;});
    staged.baseCost=Math.floor(staged.baseCost);
    staged.credit=Math.floor(Math.min(staged.baseCost*profile.invoiceShare,profile.quantity*Math.min(profile.unitValue,recipe.workPrice/recipe.outputs[0].quantity)));
    if(!M.commit(s,M.aiQuote(s,'licensed_work','cancel',{invoiceId:id})))throw new Error('Expected the real invoice to cancel.');
    const real=s.production.maritime.invoices.find(function(x){return x.id===id;});
    for(let n=0;n<520;n++){const x=JSON.parse(JSON.stringify(real));x.id=s.production.nextId++;s.production.maritime.invoices.push(x);s.production.revision+=2;}
    phase='clones';P.validate(s);
    phase='before';const before={invoices:s.production.maritime.invoices.length,live:P.liveCounts(s).invoices,prepare:M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}).allowed};
    phase='boundary';s.turn+=12*360;s.date.year+=12;s.date.day=1;
    const nextId=s.production.nextId,changed=FB.buildingSeasons.boundary(s);P.validate(s);
    const after={invoices:s.production.maritime.invoices.length,folded:s.production.retired.ledgers.invoices,credit:s.production.retired.ledgers.credit,
      batchKept:s.production.batches.some(function(b){return b.id===batch;}),nextId:s.production.nextId===nextId};
    phase='save';const saved=JSON.parse(FB.save.serialize()),text=JSON.stringify(s.production);FB.save.restore(saved);
    const restored=text===JSON.stringify(FB.state.production);
    const t=FB.state;
    phase='fresh';const q=M.aiQuote(t,'licensed_work','prepare',{enterpriseUid:null});P.validate(t);
    return {failure:FB.ledgerRetention.lastFailure,before:before,changed:changed>0,after:after,expectedCredit:521*real.credit,
      restored:restored,fresh:q.allowed && t.production.nextId===nextId,
      roundTrip:(function(){const again=JSON.parse(FB.save.serialize());FB.save.restore(again);return JSON.stringify(FB.state.production)===JSON.stringify(t.production);})()};
    }catch(error){
      return {diag:true,phase:phase,message:error.message,failure:FB.ledgerRetention.lastFailure};
    }
  });
  expect(r.diag ? JSON.stringify(r) : null).toBe(null);
  expect(r.failure).toBe(null);
  expect(r.before).toEqual({invoices:521,live:0,prepare:true});
  expect(r.changed).toBe(true);
  expect(r.after).toMatchObject({invoices:0,folded:521,batchKept:true,nextId:true});
  expect(r.after.credit).toBe(r.expectedCredit);
  expect(r).toMatchObject({restored:true,fresh:true,roundTrip:true});
});
