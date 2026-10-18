'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={shore:require('../fixtures/authoring/boathouse-work-shore.json'),river:require('../fixtures/authoring/boathouse-work-river.json')};
dependsOnRuntime(__filename,[
  'index.html','data/buildings_boathouses.js','data/production.js','data/maritime_work.js',
  'data/economy.js','data/economy_maritime.js','data/technology.js','data/site_resources.js',
  'data/building_profiles.js','data/building_seasons.js','data/production_economy.js',
  'js/production.js','js/maritime_work.js','js/site_resources.js','js/production_economy.js',
  'js/building_profiles.js','js/building_seasons.js','js/building_operations.js',
  'js/world.js','js/actions.js','js/economy.js','js/technology.js','js/lordships.js',
  'js/settlement.js','js/treasury.js','js/mods.js','js/main.js','js/starts.js',
  'js/model.js','js/messages.js','js/save.js','js/save_v4.js'
]);

async function boot(page,info,kind) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/boathouse-work-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('BOATHOUSE-boathouse_'+kind+'-boathouse_'+kind+'_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';
    FB.game.uiPrefs.hideTips=true;FB.game.uiPrefs.hideBeginnerHints=true;
    const s=FB.state;s.player.gold=2000;
    const record=FB.realmTechRecord(s,FB.techRealmId(s));
    for(const id of ['coastal_piloting','harbor_works','naval_levies','knarrs','sternpost_rudder'])
      if(record.completed.indexOf(id)<0)record.completed.push(id);
    FB.invalidateTechBonuses();
  });
}

async function work(page) {
  await page.evaluate(function(){
    const s=FB.state,P=FB.production,recipe=FBDATA.productionRecipes.prepare_boathouse_work;
    const batch=P.commit(s,P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boathouse_work',disposition:'store'}));
    if(!batch)throw new Error('Expected actual owned inputs and a paid processing reservation.');
    for(let n=0;n<recipe.workDays;n++)
      if(!P.perform(s,P.aiQuote(s,'boat_plant','work',{batchId:batch})))throw new Error('Expected an actual local paid action day.');
    if(!P.commit(s,P.aiQuote(s,'boat_plant','finish',{batchId:batch})))throw new Error('Expected the real finite work output.');
    P.validate(s);
  });
}

test('the bundled boathouse composes exact approved values and leaves ordinary enterprise stages intact',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){
    const d=FBDATA.buildings.boathouse,p=FBDATA.maritimeWorkProfiles.boathouse_work,e=FBDATA.enterprises.fishing_boat_business;
    const scripts=Array.from(document.scripts).map(function(x){return x.getAttribute('src');});
    const fields=['tax','dev','pop','research','piety','prestige','levy','retinue','archers','defense','siege','populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction'];
    return {values:[d.cost,d.upkeep,d.devMin,d.maxCounty,d.coastal,d.role,d.aiBuildOrder],scope:d.applicability,
      requirement:d.requiresTech || null,passive:fields.map(function(k){return d[k] || 0;}),review:FBDATA.techImpactReviews.features.building_boathouse.mode,
      profile:[p.enterpriseType,p.recipeId,p.goodId,p.quantity,p.unitValue,p.invoiceShare,p.termDays],
      enterprise:[e.cost,e.requiresTech,e.upgrades.map(function(u){return [u.cost,u.staff,u.requiresTech,u.dev || 0,u.fx];})],
      errors:FB.validateTechnologyData(true).concat(FB.validateBuildingData(FBDATA.buildings,true)),
      once:scripts.filter(function(x){return x==='data/buildings_boathouses.js';}).length,
      ordered:scripts.indexOf('data/buildings_boathouses.js')>scripts.indexOf('data/maritime_work.js') && scripts.indexOf('data/buildings_boathouses.js')<scripts.indexOf('js/main.js')};
  });
  expect(r).toEqual({values:[25,1,0,1,true,'shipyard',32],scope:{yearMin:650,yearMax:1300,traditions:['nordic']},
    requirement:null,passive:Array(15).fill(0),review:'none',
    profile:['fishing_boat_business','prepare_boathouse_work','boathouse_work',1,6,0.1,7],
    enterprise:[40,'coastal_piloting',[[140,2,'harbor_works',0,{populationCapacity:0.02,levy:15}],[420,3,'naval_levies',1,{populationCapacity:0.04,levy:25}]]],
    errors:[],once:1,ordered:true});
});

for(const kind of ['shore','river']) {
  test(kind+' ordinary import uses the actual boathouse with no free material work or enterprise',async function({page},info){
    await boot(page,info,kind);
    expect(await page.evaluate(function(){return FB.maritimeWork.aiQuote(FB.state,'licensed_work','prepare',{enterpriseUid:null}).allowed;})).toBe(false);
    const before=await page.evaluate(function(){return {turn:FB.state.turn,wood:FB.state.production.lots.find(function(x){return x.goodId==='boathouse_timber';}).remaining,
      cord:FB.state.production.lots.find(function(x){return x.goodId==='boathouse_cordage';}).remaining};});
    await work(page);
    const r=await page.evaluate(function(){
      const s=FB.state,q=FB.maritimeWork.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null});
      const b=s.production.batches[0],recipe=FBDATA.productionRecipes.prepare_boathouse_work;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const again=FB.maritimeWork.quote(s,q.request);
      return {allowed:q.allowed,credit:q.credit,base:q.baseCost,due:q.due,pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        same:again.signature===q.signature,turn:s.turn,paid:b.paid,days:b.workTurns.length,
        wood:s.production.lots.find(function(x){return x.goodId==='boathouse_timber';}).remaining,
        cord:s.production.lots.find(function(x){return x.goodId==='boathouse_cordage';}).remaining,
        quantities:recipe.inputs.map(function(x){return x.quantity;}),enterprises:s.player.enterprises.length,
        building:s.buildings.resource_quay.find(function(x){return x.id==='boathouse';}).devGranted};
    });
    expect(r).toMatchObject({allowed:true,pure:true,same:true,enterprises:0,building:0});
    expect(r.credit).toBeGreaterThan(0);expect(r.credit).toBeLessThanOrEqual(Math.floor(r.base*(kind==='shore'?0.1:0.05)));
    expect(r.credit).toBeLessThanOrEqual(r.paid);expect(r.credit+r.due).toBe(r.base);
    expect(r.days).toBe(kind==='shore'?1:2);expect(r.turn-before.turn).toBe(r.days);
    expect(before.wood-r.wood).toBe(r.quantities[0]);expect(before.cord-r.cord).toBe(r.quantities[1]);
  });

  test(kind+' exact paid invoice spends real work once and leaves staffing with the enterprise owner',async function({page},info){
    await boot(page,info,kind);await work(page);
    const r=await page.evaluate(function(){
      const s=FB.state,M=FB.maritimeWork,q=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}),gold=s.player.gold;
      const military=JSON.stringify([s.armies,s.wars,s.player.retinue,s.player.levy]);
      const id=M.commit(s,q),noCharge=s.player.gold===gold&&s.player.enterprises.length===0;
      const pending=FB.production.snapshot(s)[0].lots.find(function(l){return l.goodId==='boathouse_work';});
      const next=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),ok=M.commit(s,next),repeat=M.commit(s,next);
      const e=s.player.enterprises[0],paid=gold-s.player.gold;
      FB.assignEnterprise(s,e.uid,null);
      const idle=FB.enterpriseYield(s,e),required=FB.enterpriseStaffRequired(e),hired=!!FB.hireEnterpriseWorker(s,e.uid),working=FB.enterpriseYield(s,e);
      FB.production.validate(s);
      return {ok:ok,repeat:repeat,noCharge:noCharge,available:pending.available,paid:paid,due:next.due,credit:next.credit,
        status:s.production.maritime.invoices[0].status,remaining:s.production.lots.find(function(x){return x.goodId==='boathouse_work';}).remaining,
        launch:s.siteResources.sources.work_slip.consumed,count:s.player.enterprises.length,level:FB.enterpriseUpgradeLevel(e),
        required:required,idle:idle,hired:hired,working:working,noFleet:military===JSON.stringify([s.armies,s.wars,s.player.retinue,s.player.levy])};
    });
    expect(r).toMatchObject({ok:true,repeat:false,noCharge:true,available:0,status:'committed',remaining:0,launch:1,count:1,level:0,required:1,idle:0,hired:true,noFleet:true});
    expect(r.paid).toBe(r.due);expect(r.credit).toBeGreaterThan(0);expect(r.working).toBeGreaterThan(0);
  });

  test(kind+' cancelled and stale reviews preserve the spent work and require fresh consent',async function({page},info){
    await boot(page,info,kind);await work(page);
    const r=await page.evaluate(function(){
      const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
      const stale=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),cash=s.player.gold;
      const cancel=M.aiQuote(s,'licensed_work','cancel',{invoiceId:id}),cancelled=M.commit(s,cancel),before=JSON.stringify(s);
      const refused=M.commit(s,stale)===false&&before===JSON.stringify(s);
      const fresh=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}),next=M.commit(s,fresh);
      return {cancelled:cancelled,refused:refused,cash:s.player.gold===cash,stock:s.production.lots.find(function(l){return l.goodId==='boathouse_work';}).remaining,
        retry:!!next,old:s.production.maritime.invoices[0].status,enterprises:s.player.enterprises.length};
    });
    expect(r).toEqual({cancelled:true,refused:true,cash:true,stock:1,retry:true,old:'cancelled',enterprises:0});
  });

  test(kind+' pending and completed receipts survive matching restore without work, spending or restocking',async function({page},info){
    await boot(page,info,kind);await work(page);
    const r=await page.evaluate(function(){
      const M=FB.maritimeWork,id=M.commit(FB.state,M.aiQuote(FB.state,'licensed_work','prepare',{enterpriseUid:null}));
      function facts(){const s=FB.state;return JSON.stringify([s.production,s.siteResources,s.buildings,s.player.gold,s.player.enterprises]);}
      const pending=facts();FB.save.restore(JSON.parse(FB.save.serialize()));
      const pendingSame=pending===facts(),review=M.aiQuote(FB.state,'licensed_work','complete',{invoiceId:id}),paid=M.commit(FB.state,review);
      const complete=facts();FB.save.restore(JSON.parse(FB.save.serialize()));FB.production.initialize(FB.state);
      return {pendingSame:pendingSame,paid:paid,completeSame:complete===facts(),repeat:M.commit(FB.state,review)};
    });
    expect(r).toEqual({pendingSame:true,paid:true,completeSame:true,repeat:false});
  });
}

test('new construction respects inclusive Nordic scope, coastal siting, price and county occupancy',async function({page},info){
  await boot(page,info,'shore');
  const r=await page.evaluate(function(){
    const s=FB.state,pid='resource_quay',id='boathouse';
    s.buildings[pid]=[];FB.invalidateBuildingIndex(s,pid);
    const rows=[649,650,1300,1301].map(function(y){s.date.year=y;return FB.buildingApplicabilityStatus(s,pid,id).ready;});
    s.date.year=900;s.realms.player.techTraditions=['latin'];const wrong=FB.canBuildAt(s,pid,0,id);
    s.realms.player.techTraditions=['nordic'];const pr=FB.world.byId[pid],coastal=pr.coastal;
    pr.coastal=false;const inland=FB.canBuildAt(s,pid,0,id);pr.coastal=coastal;
    const cash=s.player.gold,dev=s.dev[pid],price=FB.buildCost(s,pid,id),ok=FB.build(s,pid,0,id),again=FB.build(s,pid,1,id);
    return {rows:rows,wrong:wrong,inland:inland,coastal:coastal,ok:ok,again:again,paid:cash-s.player.gold,price:price,
      dev:s.dev[pid]-dev,count:s.buildings[pid].length};
  });
  expect(r).toMatchObject({rows:[false,true,true,false],wrong:false,inland:false,coastal:true,ok:true,again:false,dev:0,count:1});
  expect(r.paid).toBe(r.price);
});

test('lawful launching, living ownership, real materials and remaining private cash all remain binding',async function({page},info){
  await boot(page,info,'shore');await work(page);
  const r=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    const q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    const changes=[function(t){t.player.gold=0;},function(t){t.buildings.resource_quay[0].ruined=true;},
      function(t){t.holder.resource_quay='missing';},function(t){t.chars[t.player.charId].dead=true;},
      function(t){t.turn+=7;t.date.day+=7;},function(t){FB.siteResources.commit(t,q.launch);},
      function(t){FB.realmTechRecord(t,FB.techRealmId(t)).completed=[];}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !M.aiQuote(t,'licensed_work','complete',{invoiceId:id}).allowed&&!M.commit(t,q)&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  });
  expect(r).toEqual(Array(7).fill(true));
});

test('the original decked and flotilla stages retain technology, staffing and ordinary full-price fallback',async function({page},info){
  await boot(page,info,'shore');
  const r=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,record=FB.realmTechRecord(s,FB.techRealmId(s));
    record.completed=[];FB.invalidateTechBonuses();const purchase=FB.enterprisePurchaseStatus(s,'fishing_boat_business','resource_quay',0).missingTech;
    record.completed=['coastal_piloting'];FB.invalidateTechBonuses();
    const price=FB.enterpriseCost(s,'fishing_boat_business','resource_quay'),cash=s.player.gold,e=FB.buyEnterprise(s,'fishing_boat_business',0);
    if(!e)throw new Error('Expected ordinary paid purchase without the facility service.');
    const paid=cash-s.player.gold;FB.assignEnterprise(s,e.uid,null);
    return {purchase:purchase,paid:paid,price:price,decked:FB.enterpriseUpgradeStatus(s,e).missingTech,invoice:M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:e.uid}).allowed};
  });
  expect(r).toMatchObject({purchase:['coastal_piloting'],decked:['harbor_works'],invoice:false});expect(r.paid).toBe(r.price);
  await work(page);
  const after=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,e=s.player.enterprises[0],record=FB.realmTechRecord(s,FB.techRealmId(s));
    record.completed.push('harbor_works');FB.invalidateTechBonuses();
    const id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:e.uid})),q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),cash=s.player.gold;
    const ok=M.commit(s,q),updated=s.player.enterprises[0];FB.assignEnterprise(s,updated.uid,null);
    const locked=FB.enterpriseUpgradeStatus(s,updated).missingTech,level=FB.enterpriseUpgradeLevel(updated),staff=FB.enterpriseStaffRequired(updated),idle=FB.enterpriseYield(s,updated);
    FB.realmTechRecord(s,FB.techRealmId(s)).completed.push('naval_levies');FB.invalidateTechBonuses();
    const normal=FB.enterpriseUpgradeCost(s,updated),gold=s.player.gold,ordinary=FB.upgradeEnterprise(s,updated.uid);
    return {ok:ok,paid:cash-gold,due:q.due,locked:locked,level:level,staff:staff,idle:idle,ordinary:ordinary,normal:normal,normalPaid:gold-s.player.gold,
      finalLevel:FB.enterpriseUpgradeLevel(updated),finalStaff:FB.enterpriseStaffRequired(updated),invoices:s.production.maritime.invoices.length};
  });
  expect(after).toMatchObject({ok:true,locked:['naval_levies'],level:1,staff:2,idle:0,ordinary:true,finalLevel:2,finalStaff:3,invoices:1});
  expect(after.paid).toBe(after.due);expect(after.normalPaid).toBe(after.normal);
});

test('a separate public account cannot contribute private work and direct credit cannot bypass the receipt',async function({page},info){
  await boot(page,info,'shore');await work(page);
  const r=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    const before=JSON.stringify(s),bypass=FB.acquireEnterprise(s,'fishing_boat_business','resource_quay',0,{maritimeInvoiceId:id});
    const pure=before===JSON.stringify(s);
    const form=Object.keys(FBDATA.governmentForms).find(function(key){return FB.governments.resolve(key).use.succession.publicCrown;});
    s.authority.governments.player.formId=form;s.realms.player.treasury={version:1,gold:5000,militaryAccrued:0};s.treasuryAccounting.mode='active';
    const publicBefore=JSON.stringify(s),q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    return {bypass:bypass,pure:pure,public:q.allowed,reason:q.reason,publicPure:publicBefore===JSON.stringify(s)};
  });
  expect(r).toEqual({bypass:false,pure:true,public:false,reason:'account',publicPure:true});
});

test('a changed ordinary repeat-copy price needs cancellation and a newly reviewed invoice',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    const stale=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),type='river_fishing_business';
    const bought=FB.acquireEnterprise(s,type,'resource_bank',0);
    if(!bought)throw new Error('Expected an ordinary paid enterprise at the other physical settlement.');
    const before=JSON.stringify(s),fresh=M.aiQuote(s,'licensed_work','complete',{invoiceId:id});
    const rejected=!fresh.allowed&&fresh.reason==='terms'&&!M.commit(s,stale)&&before===JSON.stringify(s);
    const cancelled=M.commit(s,M.aiQuote(s,'licensed_work','cancel',{invoiceId:id}));
    const retry=M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}),next=M.commit(s,retry);
    const done=M.commit(s,M.aiQuote(s,'licensed_work','complete',{invoiceId:next}));
    FB.production.validate(s);
    return {rejected:rejected,cancelled:cancelled,retry:!!next,done:done,changed:retry.baseCost>stale.baseCost,
      count:s.player.enterprises.length,old:s.production.maritime.invoices[0].status,latest:s.production.maritime.invoices[1].status};
  });
  expect(r).toEqual({rejected:true,cancelled:true,retry:true,done:true,changed:true,count:2,old:'cancelled',latest:'committed'});
});

test('direct and AI invoice callers consume the same paid work and launching claim deterministically',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){
    const M=FB.maritimeWork,a=JSON.parse(JSON.stringify(FB.state)),b=JSON.parse(JSON.stringify(FB.state));
    const qa=M.aiQuote(a,'licensed_work','prepare',{enterpriseUid:null}),qb=M.quote(b,qa.request);
    const ai=M.commit(a,qa),direct=M.commit(b,qb),pending=JSON.stringify(a)===JSON.stringify(b);
    const rng=FB.getRngState(),uid=FB.getUidCounter();
    const first=M.commit(a,M.aiQuote(a,'licensed_work','complete',{invoiceId:ai}));
    FB.setRngState(rng);FB.setUidCounter(uid);
    const second=M.commit(b,M.quote(b,{operation:'complete',assignmentId:'licensed_work',actor:qa.request.actor,invoiceId:direct}));
    return {sameQuote:qa.signature===qb.signature,pending:pending,first:first,second:second,same:JSON.stringify(a)===JSON.stringify(b)};
  });
  expect(r).toEqual({sameQuote:true,pending:true,first:true,second:true,same:true});
});

test('saved contribution validation refuses forged value, spent inputs, launching claims and erased provenance',async function({page},info){
  await boot(page,info,'river');await work(page);
  const r=await page.evaluate(function(){
    const s=FB.state,M=FB.maritimeWork,id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
    if(!M.commit(s,M.aiQuote(s,'licensed_work','complete',{invoiceId:id})))throw new Error('Expected a paid invoice.');
    const changes=[function(t){delete t.production.maritime;},function(t){t.production.maritime.invoices[0].credit++;},
      function(t){t.production.maritime.invoices[0].inputs[0].quantity++;},function(t){t.production.maritime.invoices.push(JSON.parse(JSON.stringify(t.production.maritime.invoices[0])));},
      function(t){t.siteResources.sources.work_slip.consumed=0;},function(t){t.production.lots.find(function(x){return x.goodId==='boathouse_work';}).remaining++;},
      function(t){t.production.maritime.invoices[0].payer={kind:'realm',id:'player'};}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let rejected=false;
      try{FB.save.v4.validatePlatform(t);}catch(error){rejected=/production|maritime/.test(error.message);}return rejected&&before===JSON.stringify(t);});
  });
  expect(r).toEqual(Array(7).fill(true));
});

test('ordinary imports fail purely on overlarge shares, wrong output and remote or missing launching sites',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.maritimeWorkProfiles.river_boathouse_work.invoiceShare=0.11;},
      function(m){m.maritimeWorkProfiles.river_boathouse_work.goodId='boathouse_timber';},
      function(m){m.bookmarks.boathouse_river.revisions.supplied.maritimeWorkAssignments[0].launchSourceId='missing';},
      function(m){m.bookmarks.boathouse_river.revisions.supplied.siteResourceAssignments[0].siteId='resource_slip';},
      function(m){m.bookmarks.boathouse_river.revisions.supplied.siteResourceAssignments[0].suitability.launching=false;},
      function(m){m.maritimeWorkProfiles.river_boathouse_work.fleet=1;}];
    const valid=FB.mods.validate(example),rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:valid,rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.river);
  expect(r).toEqual({valid:[],rejected:Array(6).fill(true),pure:true});
});

test('bundled catalogue declarations install no historical boathouse, site, stock or invoice',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){return Object.keys(FBDATA.bookmarks).every(function(id){return FB.bookmarkRevisions(id).every(function(bm){
    const plan=FB.compileProduction(bm);return !plan.errors.length&&!(bm.maritimeWorkAssignments || []).length&&
      !((bm.openingInfrastructure || {}).placements || []).some(function(x){return x.buildingId==='boathouse';})&&
      !(bm.productionSites || []).some(function(x){return x.buildingId==='boathouse';});});});});
  expect(r).toBe(true);
});
