'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={road:require('../fixtures/authoring/relay-services-road.json'),coast:require('../fixtures/authoring/relay-services-coast.json')};
dependsOnRuntime(__filename,['index.html','data/relay_services.js','data/production.js','data/production_economy.js','data/technology.js',
  'js/relay_services.js','js/production.js','js/production_economy.js','js/building_seasons.js','js/armies.js','js/logistics.js',
  'js/mobile_confederations.js','js/mobile_columns.js','js/mobile_command.js','js/treasury.js','js/world.js','js/mods.js',
  'js/ui_modals.js','js/ui_misc.js','js/main.js','js/save.js','js/save_v4.js','js/model.js']);
async function boot(page,info,kind) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/relay-services-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const bm='relay_services_'+kind;
  await page.locator('#ng-seed').fill(kind==='mobile'?'RELAY-harbor_world-harbor_household-harbor_quay-m-Tarin_Reed-standard':
    'RELAY-'+bm+'-'+bm+'_ruler-'+(kind==='road'?'resource_quay-m-Ivo_Reed':'resource_hill-m-Arno_Stone')+'-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){FB.game.setPaused(true);});
  if(kind!=='mobile')await stage(page,kind);
}
async function stage(page,kind) {
  return page.evaluate(function(kind){
    const s=FB.state,from=kind==='road'?'resource_bank':'resource_hill',to=kind==='road'?'resource_quay':'resource_fold';
    const units={};units[FB.unitRoleClass('levy_infantry')]=40;
    s.player.gold=1000;
    s.armies=[{id:'relay_test_host',realm:'player',at:from,from:from,men:40,size:40,units:units,supply:10,
      moveLeft:0,path:[],goal:null,manual:1,scenarioStanding:true,scenarioEndTurn:90}];
    FB.game.auto.hosts='manual';FB.game.auto.buySupplies=false;FB.game.auto.hostResupply=false;
    return {from:from,to:to};
  },kind);
}
async function consent(page) {
  return page.evaluate(function(){const s=FB.state,R=FB.relayServices,q=R.aiQuote(s,'arrival_provisions','relay_test_host','consent');
    const id=R.commit(s,q);if(!id)throw new Error('Expected current supplier consent: '+R.reason(q));return id;});
}
async function arrive(page,kind) {
  // Stage the final day of the actual canonical route; run one ordinary army boundary.
  return page.evaluate(function(kind){const s=FB.state,h=s.armies.find(function(a){return a.id==='relay_test_host';});
    const to=kind==='road'?'resource_quay':'resource_fold';
    if(!FB.orderArmy(s,h,to))throw new Error('Expected ordinary route');
    h.moveLeft=1;FB.armyTick(s);
    const actual=s.armies.find(function(a){return a.id==='relay_test_host';});
    return {at:actual && actual.at,arrivals:s.production.relay.arrivals.length,water:!!FB.waterCrossing(actual.from,actual.at)};
  },kind);
}
for(const kind of ['road','coast']) {
  test(kind+' normal Mods import, pure current consent and exact real arrival',async function({page},info){
    await boot(page,info,kind);
    const before=await page.evaluate(function(){const s=FB.state,R=FB.relayServices,base=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=R.aiQuote(s,'arrival_provisions','relay_test_host','consent'),collect=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1);
      return {consent:q.allowed,collect:collect.allowed,pure:base===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        review:FBDATA.techImpactReviews.features.finite_relay_provisions.mode};});
    expect(before).toEqual({consent:true,collect:false,pure:true,review:'none'});
    await consent(page);expect(await arrive(page,kind)).toEqual({at:kind==='road'?'resource_quay':'resource_fold',arrivals:1,water:kind==='coast'});
  });
  test(kind+' one pickup conserves material and the actual two accounts without replacing hosts or people',async function({page},info){
    await boot(page,info,kind);await consent(page);await arrive(page,kind);
    const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices,q=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1);
      const h=s.armies.find(function(a){return a.id==='relay_test_host';}),people=JSON.stringify(s.chars),count=s.armies.length;
      const before=s.production.lots.reduce(function(n,l){return n+l.remaining;},0),buyer=FB.production.account(s,q.beneficiary).funds.available,
        seller=FB.production.account(s,q.provider).funds.available,food=h.supply;
      const key=R.commit(s,q),again=R.commit(s,q),fresh=R.aiQuote(s,'arrival_provisions',h.id,'collect',1);FB.production.validate(s);
      return {key:!!key,again:again,fresh:fresh.allowed,used:before-s.production.lots.reduce(function(n,l){return n+l.remaining;},0),
        buyer:buyer-FB.production.account(s,q.beneficiary).funds.available,seller:FB.production.account(s,q.provider).funds.available-seller,cost:q.cost,price:q.unitPrice,
        supply:h.supply-food,expected:q.load.units/q.load.perPoint,host:h===s.armies[0],people:people===JSON.stringify(s.chars),count:count===s.armies.length};});
    expect(r).toMatchObject({key:true,again:false,fresh:false,used:1,host:true,people:true,count:true});
    expect(r.buyer).toBe(r.cost);expect(r.seller).toBe(r.cost);expect(r.supply).toBeCloseTo(r.expected,8);
    expect(r.cost).toBe(kind==='road'?0:Math.ceil(3*r.price));
  });
  test(kind+' matching pending and completed saves preserve consent, arrival and spent stock without renewal',async function({page},info){
    await boot(page,info,kind);await consent(page);await arrive(page,kind);
    const r=await page.evaluate(function(){const R=FB.relayServices;
      const pending=JSON.stringify(FB.state.production),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
      const samePending=pending===JSON.stringify(FB.state.production),q=R.aiQuote(FB.state,'arrival_provisions','relay_test_host','collect',1);
      const key=R.commit(FB.state,q),completed=JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.realms,FB.state.armies]);
      FB.save.restore(JSON.parse(FB.save.serialize()));R.initialize(FB.state);FB.production.initialize(FB.state);
      return {samePending:samePending,key:!!key,same:completed===JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.realms,FB.state.armies]),again:R.commit(FB.state,q)};});
    expect(r).toEqual({samePending:true,key:true,same:true,again:false});
  });
}
test('presence alone, wrong approach, moving hosts and remote checkpoints cannot collect',async function({page},info){
  await boot(page,info,'road');await consent(page);
  const r=await page.evaluate(function(){const base=JSON.stringify(FB.state),R=FB.relayServices;
    const merelyPresent=JSON.parse(base);merelyPresent.armies[0].at='resource_quay';merelyPresent.armies[0].from='resource_bank';
    return {merelyPresent:R.aiQuote(merelyPresent,'arrival_provisions','relay_test_host','collect',1).allowed};});
  expect(r.merelyPresent).toBe(false);await arrive(page,'road');
  const blocks=await page.evaluate(function(){const R=FB.relayServices,base=JSON.stringify(FB.state);
    return [function(s){s.armies[0].at='resource_bank';},function(s){s.armies[0].from='resource_quay';},
      function(s){s.armies[0].moveLeft=1;},function(s){s.armies[0].path=['resource_bank'];}].map(function(change){const s=JSON.parse(base);change(s);return !R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1).allowed;});});
  expect(blocks).toEqual(Array(4).fill(true));
});
test('expired or revoked permission never renews or removes already collected supply',async function({page},info){
  await boot(page,info,'road');const id=await consent(page);await arrive(page,'road');
  const r=await page.evaluate(function(id){const R=FB.relayServices,s=FB.state,expired=JSON.parse(JSON.stringify(s));
    expired.turn=12;const late=R.aiQuote(expired,'arrival_provisions','relay_test_host','collect',1).allowed;
    const q=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1);R.commit(s,q);const food=s.armies[0].supply;
    const revoke=R.quote(s,{operation:'revoke',serviceId:'arrival_provisions',consentId:id,actor:{kind:'realm',id:'player'}});
    const done=R.commit(s,revoke);FB.production.validate(s);
    return {late:late,done:!!done,food:food===s.armies[0].supply,renew:R.aiQuote(s,'arrival_provisions','relay_test_host','consent').allowed};},id);
  expect(r).toEqual({late:false,done:true,food:true,renew:false});
});
test('new provider or recipient generation, insufficient cash, no carrying room and stale price fail atomically',async function({page},info){
  await boot(page,info,'coast');await consent(page);await arrive(page,'coast');
  const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices,q=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1),base=JSON.stringify(s);
    const changes=[function(t){t.player.gold=0;},function(t){t.armies[0].supply=100;},
      function(t){t.realms.resource_fold_court.ruler.generation=FB.realmRulerGeneration(t,'resource_fold_court')+1;},
      function(t){t.realms.player.ruler.generation=FB.realmRulerGeneration(t,'player')+1;},
      function(t){t.holder.resource_fold='player';},function(t){t.buildings.resource_fold[0].ruined=true;},
      function(t){t.market.counties.resource_fold[1][t.market.goods.indexOf('provisions')]*=1.2;}];
    return changes.map(function(change){const t=JSON.parse(base);change(t);const before=JSON.stringify(t);return !R.commit(t,q)&&before===JSON.stringify(t);});});
  expect(r).toEqual(Array(7).fill(true));
});
test('actual repeat arrival can collect only the remaining finite agreement and stock',async function({page},info){
  await boot(page,info,'coast');await consent(page);await arrive(page,'coast');
  const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices;
    const first=R.commit(s,R.aiQuote(s,'arrival_provisions','relay_test_host','collect',2));
    const h=s.armies[0];h.at='resource_hill';h.from='resource_hill';s.turn=1;
    FB.orderArmy(s,h,'resource_fold');h.moveLeft=1;h.manual=1;FB.armyTick(s);
    const next=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1);FB.production.validate(s);
    return {first:!!first,arrivals:s.production.relay.arrivals.length,next:next.allowed,reason:next.reason,
      remaining:s.production.lots.find(function(l){return l.goodId==='relay_rations';}).remaining};});
  expect(r).toEqual({first:true,arrivals:2,next:false,reason:'stock',remaining:1});
});
test('reserved materials cannot be collected, and an empty supplier never refills on a new day',async function({page},info){
  await boot(page,info,'road');await consent(page);await arrive(page,'road');
    const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices,P=FB.production,h=s.armies[0];s.armies=[];
    const batch=P.commit(s,P.aiQuote(s,'fish_source','reserve',{recipeId:'ration_meal',disposition:'store'}));s.armies=[h];
    const blocked=R.aiQuote(s,'arrival_provisions',h.id,'collect',4).allowed;
    const cancelled=P.commit(s,P.aiQuote(s,'fish_source','cancel',{batchId:batch}));
    const q=R.aiQuote(s,'arrival_provisions',h.id,'collect',4),base=JSON.parse(JSON.stringify(s));
    const commit=R.commit(s,q);s.turn=1;
    const before=JSON.stringify(s.production);R.initialize(s);FB.production.initialize(s);
    const empty=R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1).allowed;
    // The canonical manufacturing owner remains the reservation authority; no direct stock edit is a valid replacement.
    const lot=base.production.lots.find(function(l){return l.goodId==='relay_rations';});lot.remaining--;
    let forged=false;try{FB.production.validate(base);}catch(error){forged=true;}
    return {batch:!!batch,blocked:blocked,cancelled:!!cancelled,commit:!!commit,empty:empty,same:before===JSON.stringify(s.production),forged:forged};});
  expect(r).toEqual({batch:true,blocked:false,cancelled:true,commit:true,empty:false,same:true,forged:true});
});
test('detached ordinary imports reject untyped food, wrong crossings, missing or aliased stops without mutation',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.relayServiceProfiles.local_provisions.statePath='player.gold';},
      function(m){delete m.productionGoods.relay_rations.provisionUnits;},function(m){m.relayServiceProfiles.local_provisions.marketUnits=9;},
      function(m){m.relayServiceProfiles.local_provisions.duration=91;},
      function(m){m.bookmarks.relay_services_coast.relayServiceAssignments[0].sourceSiteId='missing';},
      function(m){m.bookmarks.relay_services_coast.relayServiceAssignments[0].routeMode='land';},
      function(m){const a=JSON.parse(JSON.stringify(m.bookmarks.relay_services_coast.relayServiceAssignments[0]));a.id='alias';m.bookmarks.relay_services_coast.relayServiceAssignments.push(a);},
      function(m){delete m.bookmarks.relay_services_coast.productionSites;}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.coast);
  expect(r).toEqual({valid:[],rejected:Array(8).fill(true),pure:true});
});
test('strict saved receipts reject forged prices, input quantities, delivery, identities, duplicates and erased owners',async function({page},info){
  await boot(page,info,'coast');await consent(page);await arrive(page,'coast');
  const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices;R.commit(s,R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1));
    const changes=[function(t){t.production.relay.receipts[0].paid++;},function(t){t.production.relay.receipts[0].inputs[0].quantity++;},
      function(t){t.production.relay.receipts[0].units++;},function(t){t.production.relay.receipts[0].load.after++;},
      function(t){t.production.relay.consents[0].providerPerson.characterId='missing';},function(t){t.production.relay.receipts.push(t.production.relay.receipts[0]);},
      function(t){delete t.production.relay;},function(t){delete t.production;},function(t){t.production.relay.arrivals[0].serviceId='missing';}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let failed=false;
      try{FB.save.v4.validatePlatform(t);}catch(error){failed=true;}return failed&&before===JSON.stringify(t);});});
  expect(r).toEqual(Array(9).fill(true));
});
test('lost host, demolition and a dead supplier retain valid history but cannot collect again',async function({page},info){
  await boot(page,info,'coast');await consent(page);await arrive(page,'coast');
  const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices;R.commit(s,R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1));
    const c=s.production.relay.consents[0],cid=c.providerPerson.characterId,retained=FB.courtRecordRetained(s,s.chars[cid]);
    s.armies=[];s.buildings.resource_fold=[];s.chars[cid].dead=true;FB.production.validate(s);
    const before=JSON.stringify(s.production);R.initialize(s);
    return {retained:retained,collect:R.aiQuote(s,'arrival_provisions','relay_test_host','collect',1).allowed,same:before===JSON.stringify(s.production)};});
  expect(r).toEqual({retained:true,collect:false,same:true});
});
test('player and AI callers commit identical deterministic transactions without RNG or global identity allocation',async function({page},info){
  await boot(page,info,'road');await consent(page);await arrive(page,'road');
  const r=await page.evaluate(function(){const R=FB.relayServices,base=JSON.stringify(FB.state),a=JSON.parse(base),b=JSON.parse(base),rng=FB.getRngState(),uid=FB.getUidCounter();
    const direct=R.quote(a,{operation:'collect',serviceId:'arrival_provisions',hostId:'relay_test_host',actor:{kind:'realm',id:'player'},quantity:1});
    const ai=R.aiQuote(b,'arrival_provisions','relay_test_host','collect',1);
    return {sameQuote:JSON.stringify(direct)===JSON.stringify(ai),one:!!R.commit(a,direct),two:!!R.commit(b,ai),same:JSON.stringify(a)===JSON.stringify(b),rng:rng===FB.getRngState(),ids:uid===FB.getUidCounter()};});
  expect(r).toEqual({sameQuote:true,one:true,two:true,same:true,rng:true,ids:true});
});
for(const width of [390,1280])test('relay review retains list, scroll and focus at width '+width,async function({page},info){
  await page.setViewportSize({width:width,height:820});await boot(page,info,'road');await consent(page);await arrive(page,'road');
  await page.evaluate(function(){FB.ui.showProduction('resource_quay',0,function(){FB.ui.showSettlement('resource_quay',0);});});
  const collect=page.getByRole('button',{name:'Collect one provision unit',exact:true});
  await expect(collect).toBeEnabled();await collect.click();
  await expect(page.getByText('Review relay provisions',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(collect).toBeFocused();
  await collect.click();await page.locator('#production-confirm').click();
  await expect(page.getByText('Production batches',{exact:true})).toBeVisible();
  const r=await page.evaluate(function(){return {receipts:FB.state.production.relay.receipts.length,overflow:document.documentElement.scrollWidth>window.innerWidth};});
  expect(r).toEqual({receipts:1,overflow:false});
});
test('a real independent mobile command receives actual food within its ordinary capacity and restores it once',async function({page},info){
  await boot(page,info,'mobile');
  const r=await page.evaluate(function(){const s=FB.state,R=FB.relayServices,M=FB.mobile,rid='harbor_following',h=M.host(s,rid);
    h.at='harbor_gardens';h.from=h.at;h.mobileFood=0;h.supply=0;
    s.realms[rid].treasury.gold=1000;
    const granted=R.commit(s,R.aiQuote(s,'mobile_arrival',h.id,'consent'));
    if(!FB.orderArmy(s,h,'harbor_quay'))throw new Error('Expected independently consented passage');
    h.moveLeft=1;FB.armyTick(s);
    const camp=M.row(s,rid).food,host=M.host(s,rid);host.mobileFood=0;host.supply=0;
    const before=host.mobileFood;
    const q=R.aiQuote(s,'mobile_arrival',host.id,'collect',1),key=R.commit(s,q);FB.production.validate(s);M.validate(s);
    const food=host.mobileFood,full=JSON.parse(JSON.stringify(s)),fullHost=M.host(full,rid);
    fullHost.mobileFood=M.hostSupplySnapshot(full,fullHost).capacity;fullHost.supply=100;
    const blocked=FB.armyProvisionLoadQuote(full,fullHost.id,1).allowed;
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {granted:!!granted,key:!!key,kind:q.load && q.load.kind,loaded:food-before,camp:camp===M.row(FB.state,rid).food,
      restored:M.host(FB.state,rid).mobileFood===food,blocked:blocked,repeat:R.commit(FB.state,q)};});
  expect(r).toEqual({granted:true,key:true,kind:'mobile',loaded:1,camp:true,restored:true,blocked:false,repeat:false});
});
