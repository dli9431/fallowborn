'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={shore:require('../fixtures/authoring/maritime-work-shore.json'),river:require('../fixtures/authoring/maritime-work-river.json')};
dependsOnRuntime(__filename,['index.html','data/maritime_work.js','data/economy.js','data/production.js','data/production_economy.js','data/technology.js',
  'js/maritime_work.js','js/production.js','js/production_economy.js','js/site_resources.js','js/building_seasons.js','js/world.js','js/economy.js',
  'js/mods.js','js/main.js','js/starts.js','js/treasury.js','js/lordships.js','js/technology.js','js/messages.js','js/model.js',
  'js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);
async function boot(page,info,kind,custom) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(custom ? {name:'maritime-example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))} :
    path.resolve(__dirname,'../fixtures/authoring/maritime-work-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('BOATWORK-maritime_'+kind+'-maritime_'+kind+'_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';FB.game.uiPrefs.hideTips=true;FB.game.uiPrefs.hideBeginnerHints=true;
    const s=FB.state;s.player.gold=2000;
    const record=FB.realmTechRecord(s,FB.techRealmId(s));
    for(const key of ['knarrs','sternpost_rudder','dry_docks'])if(record.completed.indexOf(key)<0)record.completed.push(key);
  });
}
async function work(page) {
  return page.evaluate(function(){
    const s=FB.state,P=FB.production,recipe=FBDATA.productionRecipes.prepare_boat_work;
    const batch=P.commit(s,P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boat_work',disposition:'store'}));
    if(!batch)throw new Error('Expected the real paid batch to reserve.');
    for(let n=0;n<recipe.workDays;n++)if(!P.perform(s,P.aiQuote(s,'boat_plant','work',{batchId:batch})))throw new Error('Expected a real paid action day.');
    if(!P.commit(s,P.aiQuote(s,'boat_plant','finish',{batchId:batch})))throw new Error('Expected the worked material batch to finish.');
    P.validate(s);return batch;
  });
}
for(const kind of ['shore','river']) {
  test(kind+' real import requires actual paid work and exposes a pure bounded invoice',async function({page},info){
    await boot(page,info,kind);
    expect(await page.evaluate(function(){return FB.maritimeWork.aiQuote(FB.state,'licensed_work','prepare',{enterpriseUid:null}).allowed;})).toBe(false);
    await work(page);
    const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null});FB.production.validate(s);
      return {allowed:q.allowed,credit:q.credit,base:q.baseCost,due:q.due,pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        review:FBDATA.techImpactReviews.features.maintained_maritime_work.mode,enterprises:s.player.enterprises.length};});
    expect(r).toMatchObject({allowed:true,pure:true,review:'none',enterprises:0});
    expect(r.credit).toBeGreaterThan(0);expect(r.credit).toBeLessThanOrEqual(Math.floor(r.base*(kind==='shore'?0.1:0.05)));expect(r.due+r.credit).toBe(r.base);
  });
  test(kind+' reservation and canonical payment consume material once while keeping staffing ordinary',async function({page},info){
    await boot(page,info,kind);await work(page);
    const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,q=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}),gold=s.player.gold;
      const id=M.commit(s,q),reserved=FB.production.snapshot(s)[0].lots.find(function(l){return l.goodId==='boat_work_lot';});
      const atReserve=s.player.gold,early=s.player.enterprises.length,again=M.commit(s,q);
      const done=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),ok=M.commit(s,done),repeat=M.commit(s,done);FB.production.validate(s);
      const x=s.production.maritime.invoices[0],e=s.player.enterprises[0];
      return {id:!!id,again:again,early:early,noCharge:atReserve===gold,available:reserved.available,remaining:reserved.remaining,
        ok:ok,repeat:repeat,paid:gold-s.player.gold,due:done.due,status:x.status,level:FB.enterpriseUpgradeLevel(e),staff:FB.enterpriseStaffRequired(e),
        material:s.production.lots.find(function(l){return l.goodId==='boat_work_lot';}).remaining,launch:s.siteResources.sources.work_slip.consumed};});
    expect(r).toMatchObject({id:true,again:false,early:0,noCharge:true,available:0,remaining:1,ok:true,repeat:false,status:'committed',level:0,staff:1,material:0,launch:1});
    expect(r.paid).toBe(r.due);
  });
  test(kind+' restored pending invoice pays only its remainder and restore never creates more work',async function({page},info){
    await boot(page,info,kind);await work(page);
    const r=await page.evaluate(function(){const M=FB.maritimeWork,s=FB.state,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
      const saved=JSON.parse(FB.save.serialize()),before=JSON.stringify([s.production,s.player.gold,s.player.enterprises]);FB.save.restore(saved);
      const same=before===JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.player.enterprises]);
      const q=M.aiQuote(FB.state,'licensed_work','complete',{invoiceId:id}),done=M.commit(FB.state,q),after=FB.save.serialize();
      const state=JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.player.enterprises]);FB.save.restore(JSON.parse(after));FB.production.initialize(FB.state);
      return {same:same,done:done,retained:state===JSON.stringify([FB.state.production,FB.state.player.gold,FB.state.player.enterprises]),repeat:M.commit(FB.state,q)};});
    expect(r).toEqual({same:true,done:true,retained:true,repeat:false});
  });
}
test('the exact paid next upgrade retains technology, level, staffing and ordinary no-service choice',async function({page},info){
  await boot(page,info,'shore');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork;
    const e=FB.buyEnterprise(s,'fishing_boat_business',0);if(!e)throw new Error('Expected ordinary full-price enterprise.');
    const q=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:e.uid}),id=M.commit(s,q),gold=s.player.gold;
    const paid=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),ok=M.commit(s,paid);FB.production.validate(s);
    const updated=s.player.enterprises.find(function(x){return x.uid===e.uid;});
    return {allowed:q.allowed,ok:ok,cost:gold-s.player.gold,due:paid.due,level:FB.enterpriseUpgradeLevel(updated),staff:FB.enterpriseStaffRequired(updated),
      repeat:M.commit(s,paid),credit:q.credit,ordinary:q.baseCost};});
  expect(r).toMatchObject({allowed:true,ok:true,level:1,staff:2,repeat:false,credit:6});expect(r.cost).toBe(r.due);expect(r.credit).toBeLessThanOrEqual(r.ordinary*0.1);
});
test('cancel releases only reserved work and does not refund production or buy an enterprise',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,gold=s.player.gold,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    const q=M.aiQuote(s,'licensed_work','cancel',{invoiceId:id}),ok=M.commit(s,q);FB.production.validate(s);
    return {ok:ok,repeat:M.commit(s,q),cash:s.player.gold===gold,available:FB.production.snapshot(s)[0].lots.find(function(l){return l.goodId==='boat_work_lot';}).available,
      enterprises:s.player.enterprises.length,retry:M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}).allowed};});
  expect(r).toEqual({ok:true,repeat:false,cash:true,available:1,enterprises:0,retry:true});
});
test('expired or changed invoices, dead principals, blocked launches and lost facilities fail without side effects',async function({page},info){
  await boot(page,info,'shore');await work(page);
  const r=await page.evaluate(function(){const M=FB.maritimeWork,s=FB.state,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null})),q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    const changes=[function(t){t.player.gold=0;},function(t){t.buildings.resource_quay[0].ruined=true;},function(t){t.holder.resource_quay='missing';},
      function(t){t.chars[t.player.charId].dead=true;},function(t){t.turn+=7;t.date.day+=7;},
      function(t){const row=FB.realmTechRecord(t,FB.techRealmId(t));row.completed=row.completed.filter(function(x){return x!=='knarrs';});},
      function(t){FB.siteResources.commit(t,FB.siteResources.quote(t,{operation:'reserve',sourceId:'work_slip',actor:q.request.actor,amount:1}));}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      return M.commit(t,q)===false && before===JSON.stringify(t) && rng===FB.getRngState() && uid===FB.getUidCounter();});});
  expect(r).toEqual(Array(7).fill(true));
});
test('an ordinary purchase makes a pending construction invoice obsolete and a stale confirmation cannot upgrade it',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    const e=FB.buyEnterprise(s,'river_fishing_business',0),before=JSON.stringify(s),q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    return {bought:!!e,allowed:q.allowed,pure:before===JSON.stringify(s),count:s.player.enterprises.length};});
  expect(r).toEqual({bought:true,allowed:false,pure:true,count:1});
});
test('a new ordinary repeat-copy price requires fresh consent without consuming the reserved materials',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    s.player.enterprises.push({uid:'other_fishing_enterprise',type:'river_fishing_business',provinceId:'resource_bank',settlement:0,workerId:null});
    const before=JSON.stringify(s),q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    return {allowed:q.allowed,reason:q.reason,pure:before===JSON.stringify(s),remaining:s.production.lots.find(function(l){return l.goodId==='boat_work_lot';}).remaining};});
  expect(r).toEqual({allowed:false,reason:'terms',pure:true,remaining:1});
});
test('actual seasonal stock expiry closes a pending invoice before once-only material loss',async function({page},info){
  const example=JSON.parse(JSON.stringify(examples.river));
  example.buildingSeasonProfiles.work_term={seasonKinds:['spring','summer','autumn','winter'],periodDays:14,maxDays:14,care:false,
    stockLives:[{goodId:'boat_work_lot',days:3}],benefit:null};
  example.bookmarks.maritime_river.revisions.supplied.buildingSeasonAssignments=[{id:'work_season',profileId:'work_term',operationId:null,productionSiteId:'boat_plant',resources:[]}];
  await boot(page,info,'river',example);
  await page.evaluate(function(){const s=FB.state,q=FB.buildingSeasons.quote(s,{operation:'open',assignmentId:'work_season',actor:{kind:'realm',id:'player'},lotId:null});
    if(!FB.buildingSeasons.commit(s,q))throw new Error('Expected the real local operating term.');});
  await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    if(!id)throw new Error('Expected a pending material invoice.');
    const lot=s.production.lots.find(function(l){return l.goodId==='boat_work_lot';}),expiry=FB.buildingSeasons.lotExpiry(s,lot),property=JSON.stringify([s.buildings,s.population,s.player.gold]);
    s.turn=expiry;s.date.day=expiry+1;
    const first=FB.buildingSeasons.boundary(s),again=FB.buildingSeasons.boundary(s);FB.production.validate(s);FB.buildingSeasons.validate(s);
    return {first:first,again:again,status:s.production.maritime.invoices[0].status,remaining:lot.remaining,held:M.reservations(s)[lot.id] || 0,
      property:property===JSON.stringify([s.buildings,s.population,s.player.gold])};});
  expect(r).toEqual({first:1,again:0,status:'cancelled',remaining:0,held:0,property:true});
});
test('a separate public treasury cannot provide work for a private household invoice',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const s=FB.state;
    const form=Object.keys(FBDATA.governmentForms).find(function(key){const resolved=FB.governments.resolve(key);return resolved.use.succession.publicCrown;});
    s.authority.governments.player.formId=form;
    s.realms.player.treasury={version:1,gold:5000,militaryAccrued:0};
    s.treasuryAccounting.mode='active';
    const before=JSON.stringify(s),q=FB.maritimeWork.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null});
    return {allowed:q.allowed,reason:q.reason,pure:before===JSON.stringify(s)};});
  expect(r).toEqual({allowed:false,reason:'account',pure:true});
});
test('direct enterprise credit options cannot bypass the maritime transaction',async function({page},info){
  await boot(page,info,'shore');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null})),before=JSON.stringify(s);
    const ok=FB.acquireEnterprise(s,'fishing_boat_business','resource_quay',0,{maritimeInvoiceId:id});return {ok:ok,pure:before===JSON.stringify(s)};});
  expect(r).toEqual({ok:false,pure:true});
});
test('AI and direct reviews use the same exact pending terms and deterministic canonical payment',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const M=FB.maritimeWork,a=JSON.parse(JSON.stringify(FB.state)),b=JSON.parse(JSON.stringify(FB.state));
    const qa=M.aiQuote(a,'licensed_work','prepare',{enterpriseUid:null}),qb=M.quote(b,qa.request),rng=FB.getRngState(),uid=FB.getUidCounter();
    const one=M.commit(a,qa),two=M.commit(b,qb),pending=JSON.stringify(a)===JSON.stringify(b);
    const first=M.commit(a,M.aiQuote(a,'licensed_work','complete',{invoiceId:one}));FB.setUidCounter(uid);FB.setRngState(rng);
    const second=M.commit(b,M.quote(b,{operation:'complete',assignmentId:'licensed_work',actor:qa.request.actor,invoiceId:two}));
    return {sameQuote:qa.signature===qb.signature,pending:pending,first:first,second:second,same:JSON.stringify(a)===JSON.stringify(b)};});
  expect(r).toEqual({sameQuote:true,pending:true,first:true,second:true,same:true});
});
test('strict saved contributions reject missing provenance, forged value, units, duplicate rows and launch consumption',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));M.commit(s,M.aiQuote(s,'licensed_work','complete',{invoiceId:id}));
    const changes=[function(t){delete t.production.maritime;},function(t){t.production.maritime.invoices[0].credit++;},function(t){t.production.maritime.invoices[0].inputs[0].quantity++;},
      function(t){t.production.maritime.invoices.push(JSON.parse(JSON.stringify(t.production.maritime.invoices[0])));},function(t){t.siteResources.sources.work_slip.consumed=0;},
      function(t){t.production.maritime.invoices[0].payer={kind:'realm',id:'player'};},function(t){t.production.lots.find(function(l){return l.goodId==='boat_work_lot';}).unit='fish';}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let rejected=false;
      try{FB.save.v4.validatePlatform(t);}catch(error){rejected=/production|maritime/.test(error.message);}return rejected && before===JSON.stringify(t);});});
  expect(r).toEqual(Array(7).fill(true));
});
test('ordinary JSON validation rejects unsupported, unlicensed, overvalued and wrong-output configurations without publishing them',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.maritimeWorkProfiles.maintained_shore.invoiceShare=0.11;},function(m){m.maritimeWorkProfiles.maintained_shore.statePath='player.gold';},
      function(m){m.maritimeWorkProfiles.maintained_shore.goodId='wood_lot';},function(m){m.maritimeWorkProfiles.maintained_shore.enterpriseType='field_strip';},
      function(m){m.bookmarks.maritime_shore.revisions.supplied.maritimeWorkAssignments[0].launchSourceId='absent';},
      function(m){m.bookmarks.maritime_shore.revisions.supplied.maritimeWorkAssignments.push(JSON.parse(JSON.stringify(m.bookmarks.maritime_shore.revisions.supplied.maritimeWorkAssignments[0])));},
      function(m){m.maritimeWorkProfiles.maintained_shore.termDays=Infinity;}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.shore);
  expect(r).toEqual({valid:[],rejected:Array(7).fill(true),pure:true});
});
test('unopted released worlds retain absent invoice state and no supplied facility or material declarations',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){return {profiles:Object.keys(FBDATA.maritimeWorkProfiles),worlds:['867','1066'].map(function(id){
    const bm=FB.bookmark(id),p=FB.compileProduction(bm);return {assignments:bm.maritimeWorkAssignments || [],compiled:p.maritime || [],errors:p.errors};})};});
  expect(r).toEqual({profiles:[],worlds:[{assignments:[],compiled:[],errors:[]},{assignments:[],compiled:[],errors:[]}]});
});
for(const width of [390,1280])test(width+'px invoice review retains keyboard focus and settlement position through Back, Escape and confirmation',async function({page},info){
  await page.setViewportSize({width:width,height:844});await boot(page,info,'river');await work(page);
  await page.evaluate(function(){FB.ui.closeModal();FB.ui.showSettlement('resource_quay',0);});await page.locator('#settlement-maritime').click();
  const prepare=page.getByRole('button',{name:'Review construction contribution',exact:true});await prepare.click();
  await expect(page.locator('#gm-body')).toContainText('Remaining payment');await page.keyboard.press('Escape');await expect(prepare).toBeFocused();
  await prepare.click();await page.locator('#gm-cancel').click();await expect(prepare).toBeFocused();
  await prepare.click();await page.locator('#maritime-confirm').click();await expect(page.getByRole('button',{name:'Complete paid enterprise invoice',exact:true})).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function(el){return el.scrollWidth>el.clientWidth+1;})).toBe(false);
  await page.keyboard.press('Escape');await expect(page.locator('#settlement-maritime')).toBeFocused();
});
