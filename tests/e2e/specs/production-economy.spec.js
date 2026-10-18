'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/production-suppliers-harbor.json'),inland:require('../fixtures/authoring/production-suppliers-inland.json')};
dependsOnRuntime(__filename,['data/building_profiles.js','js/building_profiles.js','index.html','data/production.js','data/production_economy.js','data/technology.js','data/economy.js',
  'js/production.js','js/production_economy.js','js/market.js','js/logistics.js','js/economy.js','js/lordships.js','js/treasury.js',
  'js/world.js','js/mods.js','js/main.js','js/starts.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js','js/model.js']);
async function boot(page,info,kind) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/production-suppliers-'+kind+'.json'));
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
for(const kind of ['harbor','inland']) {
  test(kind+' ordinary import exposes finite exact stock, independent demand and pure current quotes',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(kind){
      const s=FB.state,E=FB.productionEconomy,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=E.aiQuote(s,kind==='harbor'?'fish_market':'ore_market',1,'buy');FB.production.validate(s);
      return {allowed:q.allowed,cost:q.cost,demand:q.remainingDemand,pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        receipts:s.production.economy.receipts.length,review:FBDATA.techImpactReviews.features.finite_production_exchange.mode};
    },kind);
    expect(r).toMatchObject({allowed:true,pure:true,receipts:0,review:'none'});
    expect(r.cost).toBeGreaterThan(0);expect(r.demand).toBe(kind==='harbor'?4:2);
  });
  test(kind+' exchange conserves stock and actual two-account cash, and rejects repeat confirmation',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(kind){
      const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,kind==='harbor'?'fish_market':'ore_market',1,'buy');
      function funds(who){return FB.production.account(s,who).funds.available;}
      const a=funds(q.seller),b=funds(q.buyer),total=s.production.lots.reduce(function(n,l){return n+l.remaining;},0);
      const id=E.commit(s,q),repeat=E.commit(s,q);FB.production.validate(s);
      const receipt=s.production.economy.receipts[0],l=s.production.lots.find(function(l){return l.id===receipt.lotId;});
      return {id:typeof id==='number',repeat:repeat,buyer:b-funds(q.buyer),seller:funds(q.seller)-a,cost:q.cost,
        total:total===s.production.lots.reduce(function(n,l){return n+l.remaining;},0),origin:l.origin,remaining:l.remaining};
    },kind);
    expect(r).toMatchObject({id:true,repeat:false,total:true,remaining:1});
    expect(r.buyer).toBe(r.cost);expect(r.seller).toBe(r.cost);expect(r.origin.kind).toBe('exchange');
  });
  test(kind+' matching restore retains stock, receipts and cash without repeating a trade',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(kind){
      const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,kind==='harbor'?'fish_market':'ore_market',1,'buy');E.commit(s,q);
      const before=JSON.stringify([s.production,s.player.gold,s.realms]),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
      E.initialize(FB.state);FB.production.initialize(FB.state);
      return {same:before===JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.realms]),repeat:E.commit(FB.state,q)};
    },kind);
    expect(r).toEqual({same:true,repeat:false});
  });
}
test('owner-provided materials move once without payment or a new source allocation',async function({page},info){
  await boot(page,info,'harbor');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,'owned_delivery',2,'transfer'),gold=s.player.gold;
    const id=E.commit(s,q);FB.production.validate(s);
    return {ok:typeof id==='number',paid:q.cost,cash:s.player.gold===gold,source:FB.production.snapshot(s)[0].lots[0].remaining,
      target:FB.production.snapshot(s).find(function(r){return r.site.id==='fish_plant';}).lots[0].remaining};});
  expect(r).toEqual({ok:true,paid:0,cash:true,source:4,target:2});
});
test('bought ore and fuel feed the canonical paid batch and its output can sell only once',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy,P=FB.production;
    const ore=E.commit(s,E.aiQuote(s,'ore_market',2,'buy')),fuel=E.commit(s,E.aiQuote(s,'fuel_market',1,'buy'));
    const reserve=P.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}),batch=P.commit(s,reserve);
    const work=P.perform(s,P.aiQuote(s,'iron_plant','work',{batchId:batch})),finish=P.commit(s,P.aiQuote(s,'iron_plant','finish',{batchId:batch}));
    const sale=E.aiQuote(s,'bloom_market',1,'sell'),sold=E.commit(s,sale),again=E.aiQuote(s,'bloom_market',1,'sell');P.validate(s);
    return {ore:!!ore,fuel:!!fuel,batch:!!batch,work:!!work,finish:finish,sold:!!sold,again:again.allowed,
      used:s.production.lots.filter(function(l){return l.origin.kind==='exchange' && l.assetId===s.production.assets[0].id;}).map(function(l){return l.remaining;})};});
  expect(r).toMatchObject({ore:true,fuel:true,batch:true,work:true,finish:true,sold:true,again:false});expect(r.used.every(function(n){return n===0;})).toBe(true);
});
test('unfunded, contested, ruined, over-demand, changed-price and reserved-stock trades fail atomically',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,'ore_market',1,'buy'),base=JSON.parse(JSON.stringify(s));
    const changes=[function(t){t.player.gold=0;},function(t){t.realms.resource_fold_court.alive=false;},
      function(t){t.buildings.resource_fold[0].ruined=true;},function(t){t.holder.resource_fold='missing';},
      function(t){t.market.counties.resource_fold[1][t.market.goods.indexOf('materials')]*=1.2;}];
    const blocked=changes.map(function(change){const t=JSON.parse(JSON.stringify(base));change(t);const before=JSON.stringify(t);return !E.commit(t,q)&&before===JSON.stringify(t);});
    const over=E.aiQuote(s,'ore_market',3,'buy').allowed;
    E.commit(s,E.aiQuote(s,'ore_market',2,'buy'));E.commit(s,E.aiQuote(s,'fuel_market',1,'buy'));
    const batch=FB.production.commit(s,FB.production.aiQuote(s,'iron_plant','reserve',{recipeId:'smelt_ore',disposition:'store'}));
    return {blocked:blocked,over:over,batch:!!batch,remainingDemand:E.aiQuote(s,'ore_market',1,'buy').allowed};});
  expect(r).toEqual({blocked:Array(5).fill(true),over:false,batch:true,remainingDemand:false});
});
test('generic provisions never satisfy a typed fish request and empty suppliers do not renew',async function({page},info){
  await boot(page,info,'harbor');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy;
    E.commit(s,E.aiQuote(s,'owned_delivery',6,'transfer'));s.turn=90;s.date.season=1;
    const q=E.aiQuote(s,'fish_market',1,'sell'),before=JSON.stringify(s.production);E.harvest(s);
    return {allowed:q.allowed,generic:FB.production.snapshot(s)[0].lots.find(function(l){return l.goodId==='generic_food';}).remaining,
      same:before===JSON.stringify(s.production)};});
  expect(r).toEqual({allowed:false,generic:10,same:true});
});
test('a pending supplier batch and spent buyer budget remain independent of available cash and renewed demand',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy,P=FB.production;
    const batch=P.commit(s,P.aiQuote(s,'iron_supplier','reserve',{recipeId:'smelt_ore',disposition:'store'}));
    const ore=E.commit(s,E.aiQuote(s,'ore_market',2,'buy')),fuel=E.commit(s,E.aiQuote(s,'fuel_market',1,'buy'));
    const budget=E.aiQuote(s,'fuel_market',2,'buy');s.turn=90;s.date.season=1;
    const reserved=E.aiQuote(s,'ore_market',1,'buy');P.validate(s);
    return {batch:!!batch,ore:!!ore,fuel:!!fuel,budget:budget.allowed,remaining:budget.remainingBudget,reserved:reserved.allowed,
      reason:reserved.reason,source:P.snapshot(s).find(function(row){return row.site.id==='iron_supplier';}).lots[0].remaining};});
  expect(r).toMatchObject({batch:true,ore:true,fuel:true,budget:false,reserved:false,reason:'stock',source:2});
  expect(r.remaining).toBeLessThan(4);
});
test('counterparty history retains its actual person while changed authority blocks a stale sale',async function({page},info){
  await boot(page,info,'harbor');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy,q=E.aiQuote(s,'fish_market',1,'sell');E.commit(s,q);
    const receipt=s.production.economy.receipts[0],cid=receipt.buyerIdentity.characterId,next=E.aiQuote(s,'fish_market',1,'sell');
    const retained=E.referencesCharacter(s,cid)&&FB.courtRecordRetained(s,s.chars[cid]);
    s.realms.supplier_bank_court.ruler.generation=FB.realmRulerGeneration(s,'supplier_bank_court')+1;
    const before=JSON.stringify(s),stale=E.commit(s,next);FB.production.validate(s);
    return {retained:retained,stale:stale,pure:before===JSON.stringify(s)};});
  expect(r).toEqual({retained:true,stale:false,pure:true});
});
test('the same exact finite exchange produces identical receipts, stock and cash without RNG or new global ids',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const E=FB.productionEconomy,base=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const a=JSON.parse(base),b=JSON.parse(base),one=E.commit(a,E.aiQuote(a,'ore_market',1,'buy')),two=E.commit(b,E.aiQuote(b,'ore_market',1,'buy'));
    return {one:!!one,two:!!two,same:JSON.stringify(a)===JSON.stringify(b),rng:rng===FB.getRngState(),ids:uid===FB.getUidCounter()};});
  expect(r).toEqual({one:true,two:true,same:true,rng:true,ids:true});
});
for(const kind of ['harbor','inland'])test(kind+' actual staffed seasonal output diverts once from both market output and ordinary proceeds',async function({page},info){
  await boot(page,info,kind);
  const r=await page.evaluate(function(kind){const s=FB.state,E=FB.productionEconomy;
    s.player.gold=10000;s.player.enterpriseMigration=1;s.player.enterprises=[];s.player.enterpriseLabor=[];
    const type=kind==='harbor'?'harbor_fishery':'inland_mine',e={uid:'actual_producer',type:type,provinceId:s.player.provinceId,settlement:0,workerId:null};s.player.enterprises.push(e);
    const hired=FB.hireEnterpriseWorker(s,e.uid);if(!hired)throw new Error('Fixture hire failed');
    s.turn=90;s.date.season=1;
    const output=FB.marketEnterpriseOutput(s,e),income=FB.enterprisePhysicalYield(s,e),first=FB.marketSeason(s),again=FB.marketSeason(s);
    const receipt=s.production.economy.receipts.find(function(x){return x.kind==='producer';}),after=FB.marketEnterpriseOutput(s,e);
    FB.production.validate(s);
    const before=JSON.stringify(s.production),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {first:first,again:again,quantity:receipt.quantity,market:output[receipt.marketGoodId]-after[receipt.marketGoodId],
      expected:receipt.marketQuantity,income:E.incomeDiverted(FB.state,e),expectedIncome:receipt.income,raw:income,
      same:before===JSON.stringify(FB.state.production),againRestore:E.harvest(FB.state),staff:FB.enterpriseWorkerIds(e).length};
  },kind);
  expect(r).toMatchObject({first:true,again:false,same:true,againRestore:false,staff:1});
  expect(r.market).toBeCloseTo(r.expected,8);expect(r.income).toBeCloseTo(r.expectedIncome,8);expect(r.income).toBeLessThanOrEqual(r.raw);
});
test('declarations resolve same-import references and reject unsupported paths, untyped producers and scenery without side effects',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.productionExchangeProfiles.owned_fish.statePath='player.gold';},
      function(m){m.productionExchangeProfiles.owned_fish.goodId='unknown';},
      function(m){delete m.enterpriseMechanics.harbor_fishery.typedProduction;},
      function(m){m.productionProducerProfiles.local_output.enterpriseType='field_strip';},
      function(m){m.bookmarks.production_suppliers_harbor.revisions.supplied.productionExchangeAssignments[0].toSiteId='unknown';},
      function(m){m.productionExchangeProfiles.sell_fish.quantityLimit=-1;},
      function(m){delete m.bookmarks.production_suppliers_harbor.revisions.supplied.productionSites;}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.harbor);
  expect(r).toEqual({valid:[],rejected:Array(7).fill(true),pure:true});
});
test('strict receipt provenance rejects forged goods, cash, source references, duplicate ids and missing links before adoption',async function({page},info){
  await boot(page,info,'inland');
  const r=await page.evaluate(function(){const s=FB.state,E=FB.productionEconomy;E.commit(s,E.aiQuote(s,'ore_market',1,'buy'));
    const changes=[function(t){t.production.economy.receipts[0].paid++;},function(t){t.production.economy.receipts[0].inputs[0].quantity++;},
      function(t){t.production.economy.receipts.push(JSON.parse(JSON.stringify(t.production.economy.receipts[0])));},
      function(t){t.production.lots[t.production.lots.length-1].remaining++;},function(t){delete t.production.economy;},
      function(t){t.production.economy.receipts[0].payer={kind:'realm',id:'resource_fold_court'};}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let rejected=false;
      try{FB.save.v4.validatePlatform(t);}catch(error){rejected=/production/.test(error.message);}return rejected&&before===JSON.stringify(t);});});
  expect(r).toEqual(Array(6).fill(true));
});
for(const width of [390,1280])test(width+'px exchange confirmation retains scroll, focus and output choice',async function({page},info){
  await page.setViewportSize({width:width,height:844});await boot(page,info,'harbor');
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);});
  await page.locator('#settlement-production').click();await page.locator('#production-disposition-dry_fish').selectOption('use');
  const action=page.getByRole('button',{name:'Sell one unit',exact:true});await action.click();
  await expect(page.locator('#gm-body')).toContainText('Current price');await page.keyboard.press('Escape');
  await expect(page.locator('#production-disposition-dry_fish')).toHaveValue('use');await expect(action).toBeFocused();
  await action.click();await page.locator('#production-confirm').click();
  expect(await page.evaluate(function(){return FB.state.production.economy.receipts.length;})).toBe(1);
  await expect(action).toBeFocused();expect(await page.locator('#gm-body').evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
});
