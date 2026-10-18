'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={shore:require('../fixtures/authoring/maritime-work-shore.json'),river:require('../fixtures/authoring/maritime-work-river.json')};
dependsOnRuntime(__filename,['index.html','data/production.js','data/maritime_work.js','data/production_economy.js',
  'data/economy.js','data/economy_maritime.js','data/technology.js','data/site_resources.js','data/building_profiles.js','data/building_seasons.js',
  'js/production.js','js/maritime_work.js','js/production_economy.js','js/site_resources.js','js/actions.js','js/world.js',
  'js/building_operations.js','js/building_seasons.js','js/building_profiles.js','js/economy.js','js/technology.js',
  'js/lordships.js','js/settlement.js','js/treasury.js','js/mods.js','js/main.js','js/save.js','js/save_v4.js','js/ui_modals.js']);

async function boot(page,info,kind) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  const m=JSON.parse(JSON.stringify(examples[kind]));m.bookmarks['maritime_'+kind].revision='new_works';
  await page.locator('#modfile').setInputFiles({name:'maritime-construction-'+kind+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(m))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const bm='maritime_'+kind;
  await page.locator('#ng-seed').fill('MARITIMECONSTRUCTION-'+bm+'-'+bm+'_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function(){
    FB.game.setPaused(true);FB.game.auto.all=true;FB.game.auto.style='first';FB.game.uiPrefs.hideTips=true;
    const s=FB.state;s.player.gold=2000;const r=FB.realmTechRecord(s,FB.techRealmId(s));
    for(const id of ['coastal_piloting','harbor_works','knarrs','sternpost_rudder'])if(r.completed.indexOf(id)<0)r.completed.push(id);
    FB.invalidateTechBonuses();
  });
}

for(const kind of ['shore','river']) {
  test(kind+' empty maritime construction uses one enrollment and real delivery before a paid invoice',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,P=FB.production,E=FB.productionEconomy,M=FB.maritimeWork,who=FB.settlementHolder(s,'resource_quay',0);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const ready=P.industrialConstructionReady(s,'resource_quay',0,'boat_workshop',who);
      const direct=FB.canBuildAt(s,'resource_quay',0,'boat_workshop'),ai=FB.aiCanBuildAt(s,who.id,'resource_quay',0,'boat_workshop');
      const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const revision=s.production.revision,next=s.production.nextId,cash=s.player.gold,cost=FB.buildCost(s,'resource_quay','boat_workshop');
      const built=FB.build(s,'resource_quay',0,'boat_workshop'),paid=cash-s.player.gold;
      const row=P.snapshot(s).find(function(x){return x.site.id==='boat_plant';});
      const once=s.production.revision===revision+1 && s.production.nextId===next+1;
      const empty=row.lots.length===0,record=s.buildings.resource_quay.find(function(x){return x.id==='boat_workshop';});
      const enrolled=JSON.stringify(s.production),rebind=P.bindConstruction(s,'resource_quay',record);
      const stable=rebind===false && enrolled===JSON.stringify(s.production);
      const noFree=P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boat_work',disposition:'store'}).allowed;
      const recipe=FBDATA.productionRecipes.prepare_boat_work;
      recipe.inputs.forEach(function(input){const route=input.goodId==='wood_lot'?'timber_delivery':'cordage_delivery';
        if(!E.commit(s,E.aiQuote(s,route,input.quantity,'transfer')))throw new Error('Expected finite owned delivery.');});
      const batch=P.commit(s,P.aiQuote(s,'boat_plant','reserve',{recipeId:'prepare_boat_work',disposition:'store'}));
      for(let n=0;n<recipe.workDays;n++)if(!P.perform(s,P.aiQuote(s,'boat_plant','work',{batchId:batch})))throw new Error('Expected paid action day.');
      const finished=P.commit(s,P.aiQuote(s,'boat_plant','finish',{batchId:batch}));
      const id=M.commit(s,M.aiQuote(s,'licensed_work','prepare',{enterpriseUid:null}));
      const q=M.aiQuote(s,'licensed_work','complete',{invoiceId:id}),cashBefore=s.player.gold,completed=M.commit(s,q);
      const remainingPaid=cashBefore-s.player.gold;P.validate(s);
      const facts=JSON.stringify([s.production,s.buildings,s.siteResources,s.player.gold,s.player.enterprises]);
      FB.save.restore(JSON.parse(FB.save.serialize()));P.initialize(FB.state);
      return {ready:ready,direct:direct,ai:ai,pure:pure,built:built,paid:paid,cost:cost,once:once,stable:stable,empty:empty,noFree:noFree,
        constructed:row.asset.constructed,finished:finished,completed:completed,due:q.due,remainingPaid:remainingPaid,credit:q.credit,base:q.baseCost,
        same:facts===JSON.stringify([FB.state.production,FB.state.buildings,FB.state.siteResources,FB.state.player.gold,FB.state.player.enterprises])};
    });
    expect(r).toMatchObject({ready:true,direct:true,ai:true,pure:true,built:true,once:true,stable:true,empty:true,noFree:false,constructed:true,finished:true,completed:true,same:true});
    expect(r.paid).toBe(r.cost);expect(r.remainingPaid).toBe(r.due);expect(r.credit).toBeGreaterThan(0);expect(r.credit).toBeLessThanOrEqual(Math.floor(r.base*0.1));
  });

  test(kind+' construction refuses missing license, worker, stock, technology and private invoice funds purely',async function({page},info){
    await boot(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,P=FB.production,actor=FB.settlementHolder(s,'resource_quay',0);
      const source=FB.siteResources.quote(s,{operation:'reserve',sourceId:'work_slip',actor:actor,amount:1});
      const changes=[function(t){t.player.gold=FB.buildCost(t,'resource_quay','boat_workshop')+10;},
        function(t){t.player.travel={};},function(t){t.buildings.resource_quay.find(function(b){return b.id==='boat_supply_store';}).ruined=true;},
        function(t){const claim=FB.siteResources.commit(t,source);if(!claim)throw new Error('Expected current launch claim.');
          const remaining=FB.siteResources.snapshot(t).find(function(x){return x.id==='work_slip';}).available;
          if(remaining)FB.siteResources.commit(t,FB.siteResources.quote(t,{operation:'reserve',sourceId:'work_slip',actor:actor,amount:remaining}));},
        function(t){FB.realmTechRecord(t,FB.techRealmId(t)).completed=[];},
        function(t){t.chars[t.player.charId].dead=true;}];
      const blocked=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
        return !P.industrialConstructionReady(t,'resource_quay',0,'boat_workshop',actor)&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
      const form=Object.keys(FBDATA.governmentForms).find(function(key){return FB.governments.resolve(key).use.succession.publicCrown;});
      const t=JSON.parse(JSON.stringify(s));t.authority.governments.player.formId=form;t.realms.player.treasury={version:1,gold:5000,militaryAccrued:0};t.treasuryAccounting.mode='active';
      const before=JSON.stringify(t),publicBlocked=!P.industrialConstructionReady(t,'resource_quay',0,'boat_workshop',actor);
      return {blocked:blocked,publicBlocked:publicBlocked,pure:before===JSON.stringify(t)};
    });
    expect(r).toEqual({blocked:Array(6).fill(true),publicBlocked:true,pure:true});
  });
}

test('ordinary maritime construction metadata rejects mismatched consumers without publishing',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(m){m.buildings.boat_workshop.maritimeWorkProfileId='absent';},
      function(m){delete m.buildings.boat_workshop.productionRecipeIds;},function(m){m.productionRecipes.prepare_boat_work.requiresSale=true;},
      function(m){m.maritimeWorkProfiles.maintained_river.quantity=2;},function(m){m.buildings.boat_workshop.maritimeWorkProfileId={};}];
    const valid=FB.mods.validate(example),bad=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {valid:valid,bad:bad,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.river);
  expect(r).toEqual({valid:[],bad:Array(5).fill(true),pure:true});
});
