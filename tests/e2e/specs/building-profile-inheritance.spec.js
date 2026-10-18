'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/building-profile-inheritance-river.json'),
  hill:require('../fixtures/authoring/building-profile-inheritance-hill.json')};
const seasonalExample = require('../fixtures/authoring/building-seasons-dry.json');
dependsOnRuntime(__filename,['index.html','data/building_profiles.js','data/building_operations.js',
  'data/building_institutions.js','data/building_seasons.js','data/site_resources.js','data/technology.js',
  'js/building_profiles.js','js/building_operations.js','js/building_institutions.js','js/building_seasons.js',
  'js/site_resources.js','js/production.js','js/production_economy.js','js/actions.js','js/world.js',
  'js/population.js','js/treasury.js','js/lordships.js','js/fortifications.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/ui_panels.js','js/ui_modals.js','js/ui_misc.js','js/main.js']);

async function start(page,info,label,empty) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  const file = 'building-profile-inheritance-' + label + '.json';
  if (empty) {
    const source = JSON.parse(JSON.stringify(examples[label]));
    Object.values(source.bookmarks)[0].revision = 'empty';
    await page.locator('#modfile').setInputFiles({name:file,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  } else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',file));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  const world = label === 'river' ? 'inventory_estuary' : 'resource_upland';
  await beginBookmark(page,info,world,world + '_household');
}
async function hold(page) {
  await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId;
    FB.setPlayerTier(s,4,{stationFarewell:false});
    s.player.provs=[pid];s.owner[pid]=s.holder[pid]='player';s.player.gold=10000;
    FB.foundPlayerRealm(s);FB.rememberSettlementSites(s,pid);
    for(let slot=1;slot<FB.settlementVisibleCount(s,pid);slot++) FB.assignSettlementLordship(s,pid,slot,s.player.charId);
    FB.invalidateSettlementLordships(s);FB.invalidateBuildingIndex(s,pid);
  });
}

for(const label of ['river','hill']) {
  test(label + ' real import installs exact inherited identity with zero construction awards',async function({page},info){
    await start(page,info,label);
    const r=await page.evaluate(function(){
      const s=FB.state,bm=FB.campaignBookmark(s),before=JSON.stringify(s),uid=FB.getUidCounter(),rng=FB.getRngState();
      const plan=FB.compileOpeningInfrastructure(bm),valid=FB.buildingProfiles.validate(s),again=FB.initializeOpeningInfrastructure(s);
      const rows=Object.values(s.buildings).reduce(function(a,b){return a.concat(b);},[]);
      return {errors:plan.errors,count:rows.length,ids:rows.every(function(b){return b.buildingProfile.inherited.bookmarkId===s.start.id&&b.devGranted===0;}),
        valid:valid,again:again,pure:before===JSON.stringify(s)&&uid===FB.getUidCounter()&&rng===FB.getRngState(),
        noService:!s.buildingOperations||!Object.keys(s.buildingOperations.receipts).length,
        noPermission:rows.every(function(b){return !b.institutionBinding;}),review:FBDATA.techImpactReviews.features.building_profile_inheritance.mode};
    });
    expect(r).toEqual({errors:[],count:label==='river'?1:2,ids:true,valid:true,again:false,pure:true,noService:true,noPermission:true,review:'none'});
  });
  test(label + ' explicit empty revision stays empty across restore',async function({page},info){
    await start(page,info,label,true);
    const before=await page.evaluate(function(){return FB.save.serialize();});
    await restoreBookmark(page,before);
    expect(await page.evaluate(function(){return {revision:FB.state.start.revision,marker:FB.state.openingInfrastructureState.explicit,
      rows:Object.values(FB.state.buildings).reduce(function(n,r){return n+r.length;},0)};})).toEqual({revision:'empty',marker:true,rows:0});
  });
}

test('inherited river permission and water payment are separate, finite and once only',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0],actor={kind:'character',id:s.player.charId};
    const req={countyId:pid,settlement:b.s,buildingId:b.id,actor:actor};
    const dormant=FB.buildingBonusAt(s,pid,b.s,'piety'),denied=FB.buildingOperations.quote(s,req);
    const funds=s.player.gold,q=FB.buildingInstitutionQuote(s,pid,b.s,b.id,actor,'reaffirm');
    const permission=FB.buildingInstitutionApply(s,q),free=funds===s.player.gold;
    const service=FB.buildingOperations.quote(s,req),paid=FB.buildingOperations.commit(s,service),again=FB.buildingOperations.commit(s,service);
    return {dormant:dormant,denied:denied.allowed,permission:permission,free:free,paid:paid,again:again,cost:funds-s.player.gold,quoted:service.cost,
      piety:FB.buildingBonusAt(s,pid,b.s,'piety'),construction:FB.buildingProfiles.status(s,pid,b.s,b.id,b.buildingProfile.id,actor).ready,
      actual:FB.siteResources.snapshot(s,pid,null,actor)[0].available};
  });
  expect(r).toMatchObject({dormant:0,denied:false,permission:true,free:true,paid:true,again:false,piety:2,construction:false,actual:5});
  expect(r.cost).toBe(r.quoted);
});

test('dry inherited river works manufacture neither service nor source capacity',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0],actor={kind:'character',id:s.player.charId};
    if(!FB.buildingInstitutionApply(s,FB.buildingInstitutionQuote(s,pid,b.s,b.id,actor,'reaffirm')))throw new Error('Permission setup failed');
    const claim=FB.siteResources.commit(s,FB.siteResources.quote(s,{operation:'reserve',sourceId:'profile_intake',actor:actor,amount:6}));
    if(!claim)throw new Error('Finite source setup failed');
    const before=JSON.stringify(s),uid=FB.getUidCounter(),rng=FB.getRngState();
    const q=FB.buildingOperations.quote(s,{countyId:pid,settlement:b.s,buildingId:b.id,actor:actor});
    return {allowed:q.allowed,paid:FB.buildingOperations.commit(s,q),piety:FB.buildingBonusAt(s,pid,b.s,'piety'),
      pure:before===JSON.stringify(s)&&uid===FB.getUidCounter()&&rng===FB.getRngState()};
  });
  expect(r).toEqual({allowed:false,paid:false,piety:0,pure:true});
});

test('ruined hill repair uses retained replacement cost outside construction gates and grants no development',async function({page},info){
  await start(page,info,'hill');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid].find(function(b){return b.ruined;}),gold=s.player.gold,dev=s.dev[pid];
    const q=FB.repairBuildingStatus(s,pid,b.s,b.id),blocked=FB.buildingProfiles.status(s,pid,b.s,b.id,b.buildingProfile.id).ready;
    const stamp=JSON.stringify(b.buildingProfile),repaired=FB.repairBuilding(s,pid,b.s,b.id,q.cost),repeat=FB.repairBuilding(s,pid,b.s,b.id,q.cost);
    return {ready:q.ready,cost:q.cost,repaired:repaired,repeat:repeat,paid:gold-s.player.gold,blocked:blocked,
      baseCost:FBDATA.buildings[b.id].cost,identity:stamp===JSON.stringify(b.buildingProfile),dev:s.dev[pid]-dev,granted:b.devGranted,
      research:FB.buildingBonusAt(s,pid,b.s,'research'),upkeep:FB.buildingBonusAt(s,pid,b.s,'upkeep')};
  });
  expect(r).toMatchObject({ready:true,repaired:true,repeat:false,blocked:false,baseCost:40,identity:true,dev:0,granted:0,research:0.25,upkeep:2});
  expect(r.cost).toBe(r.paid);expect(r.cost).toBeGreaterThan(20);
});

test('fiscal, population and military projections use replacement amounts on the one physical asset',async function({page},info){
  await start(page,info,'hill');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid].find(function(b){return !b.ruined;});
    const effect=FB.buildingOperations.effects(s,pid,b),rows=FB.buildingProfiles.effectRows(s,'levy','player');
    const fiscal=FB.settlementFiscalProjection(s,pid,b.s,{capacities:{}}),parts=FB.playerCompositionBreakdown(s);
    return {tax:FB.buildingBonusAt(s,pid,b.s,'tax'),upkeep:FB.buildingBonusAt(s,pid,b.s,'upkeep'),levy:effect.levy,
      rows:rows.filter(function(x){return x.buildingId===b.id;}),tolls:fiscal.amounts.tolls,
      military:JSON.stringify(parts).indexOf('hill_grazing')>=0,count:FB.buildingCountIn(s,pid,b.id,true),
      people:FB.buildingBonusIn(s,pid,'populationCapacity')};
  });
  expect(r).toMatchObject({tax:1,upkeep:0,levy:0.5,count:2,people:0,military:true});
  expect(r.rows).toEqual([{buildingId:'profile_work',profileId:'hill_grazing',count:1,amount:0.5}]);
  expect(r.tolls).toBeGreaterThan(0);
});

test('profile and inherited provenance corruption reject before state adoption',async function({page},info){
  await start(page,info,'hill');
  const r=await page.evaluate(function(){
    const input=JSON.parse(FB.save.serialize()),pid=FB.state.player.provinceId;
    const mutations=[function(b){b.buildingProfile.v=2;},function(b){b.buildingProfile.extra=1;},function(b){b.buildingProfile.definition='wrong';},
      function(b){b.buildingProfile.id='missing';},function(b){b.buildingProfile.inherited=null;},function(b){b.buildingProfile.inherited.extra=true;},
      function(b){b.buildingProfile.inherited.siteId='missing';},function(b){b.buildingProfile.inherited.revision='empty';},function(b){b.s=7;}];
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=mutations.map(function(change){const bad=JSON.parse(JSON.stringify(input));change(bad.state.buildings[pid][0]);try{FB.save.restore(bad);return false;}catch(e){return true;}});
    return {rejected:rejected,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({rejected:Array(9).fill(true),pure:true});
});

test('ordinary detached imports reject wrong profile base, policy, source, occupancy and extra fields atomically',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(source){
    const mutations=[function(d,p){p.profileId='missing';},function(d,p){p.profileId='river_enclosure';},
      function(d){delete d.buildingProfiles.river_serviced.inheritance;},function(d){d.buildingProfiles.river_serviced.inheritance='grant';},
      function(d){d.buildingProfiles.river_serviced.siteResourceProfile='missing';},
      function(d,p){d.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements.push(Object.assign({},p,{profileId:'river_modest'}));},
      function(d,p){p.reward=1;},function(d){d.bookmarks.inventory_estuary.buildingOperationAssignments=[];},
      function(d){d.bookmarks.inventory_estuary.buildingInstitutionAssignments=[];}];
    const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=mutations.map(function(change){const d=JSON.parse(JSON.stringify(source)),p=d.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[0];
      change(d,p);return FB.mods.validate(d).length>0;});
    return {rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.river);
  expect(r).toEqual({rejected:Array(9).fill(true),pure:true});
});

test('matching restore retains exact paid service and removed inventory without reinitialization',async function({page},info){
  await start(page,info,'river');await hold(page);
  const first=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0],actor={kind:'character',id:s.player.charId};
    if(!FB.buildingInstitutionApply(s,FB.buildingInstitutionQuote(s,pid,b.s,b.id,actor,'reaffirm')))throw new Error('Permission setup failed');
    if(!FB.buildingOperations.commit(s,FB.buildingOperations.quote(s,{countyId:pid,settlement:b.s,buildingId:b.id,actor:actor})))throw new Error('Service setup failed');
    return {save:FB.save.serialize(),facts:JSON.stringify([s.buildings,s.buildingOperations,s.siteResources,s.player.gold])};
  });
  await restoreBookmark(page,first.save);
  expect(await page.evaluate(function(){const s=FB.state;return JSON.stringify([s.buildings,s.buildingOperations,s.siteResources,s.player.gold]);})).toBe(first.facts);
  const removed=await page.evaluate(function(){const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0];
    if(!FB.demolishBuilding(s,pid,b.s,b.id))throw new Error('Demolition failed');return FB.save.serialize();});
  await restoreBookmark(page,removed);
  expect(await page.evaluate(function(){const s=FB.state;return {empty:s.buildings[s.player.provinceId].length===0,again:FB.initializeOpeningInfrastructure(s),
    receipts:Object.keys(s.buildingOperations.receipts).length};})).toEqual({empty:true,again:false,receipts:1});
});

test('profile service expiry and changed authority suppress effects without another charge or refund',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0],actor={kind:'character',id:s.player.charId};
    if(!FB.buildingInstitutionApply(s,FB.buildingInstitutionQuote(s,pid,b.s,b.id,actor,'reaffirm')))throw new Error('Permission setup failed');
    if(!FB.buildingOperations.commit(s,FB.buildingOperations.quote(s,{countyId:pid,settlement:b.s,buildingId:b.id,actor:actor})))throw new Error('Service setup failed');
    const paid=JSON.stringify([s.siteResources,s.buildingOperations,s.player.gold]),turn=s.turn;
    const receipt=s.buildingOperations.receipts[b.waterOperation.id],holder=s.holder[pid];
    s.holder[pid]='inventory_ridge_court';FB.invalidateBuildingIndex(s,pid);
    const changed=FB.buildingBonusAt(s,pid,b.s,'piety');
    s.holder[pid]=holder;s.turn=receipt.untilTurn;FB.invalidateBuildingIndex(s,pid);
    const expired=FB.buildingBonusAt(s,pid,b.s,'piety'),uncharged=paid===JSON.stringify([s.siteResources,s.buildingOperations,s.player.gold]);
    s.turn=turn;FB.invalidateBuildingIndex(s,pid);
    return {changed:changed,expired:expired,uncharged:uncharged,retained:!!b.buildingProfile&&!b.ruined};
  });
  expect(r).toEqual({changed:0,expired:0,uncharged:true,retained:true});
});

test('matching seeded checkpoint replays the same canonical permission and service transactions',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const original=FB.save.serialize();
    function run(){
      const s=FB.state,pid=s.player.provinceId,b=s.buildings[pid][0],actor={kind:'character',id:s.player.charId};
      if(!FB.buildingInstitutionApply(s,FB.buildingInstitutionQuote(s,pid,b.s,b.id,actor,'reaffirm')))throw new Error('Permission setup failed');
      if(!FB.buildingOperations.commit(s,FB.buildingOperations.quote(s,{countyId:pid,settlement:b.s,buildingId:b.id,actor:actor})))throw new Error('Service setup failed');
      return JSON.stringify([s.buildings,s.siteResources,s.buildingOperations,s.player.gold,FB.getRngState()>>>0,FB.getUidCounter()]);
    }
    FB.save.restore(JSON.parse(original));const first=run();
    FB.save.restore(JSON.parse(original));const second=run();
    return first===second;
  });
  expect(r).toBe(true);
});

test('explicit inherited development is never reconstructed from a default building reward',async function({page},info){
  await start(page,info,'hill');await hold(page);
  expect(await page.evaluate(function(){const s=FB.state,before=JSON.stringify([s.dev,s.buildings]);
    delete s.player.developmentBaselineMigration;
    return !FB.migratePlayerDevelopment(s)&&before===JSON.stringify([s.dev,s.buildings]);})).toBe(true);
});

test('automatic alternatives retain base defaults, exact profile price, reserves and a pure stable order',async function({page},info){
  await start(page,info,'hill');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,rid=s.holder[pid]||s.owner[pid],actor={kind:'realm',id:rid};
    s.buildings[pid]=[];s.realms[rid].treasury.gold=10000;FB.invalidateBuildingIndex(s,pid);
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const first=FB.buildingProfiles.aiChoices(s,actor,pid,1,'profile_work'),second=FB.buildingProfiles.aiChoices(s,actor,pid,1,'profile_work');
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const q=first[0],gold=FB.treasuryAvailable(s,rid),done=q&&FB.buildRealm(s,rid,pid,1,q.id,undefined,q.profileId);
    return {pure:pure,stable:JSON.stringify(first)===JSON.stringify(second),selected:q&&q.profileId,done:done,
      paid:gold-FB.treasuryAvailable(s,rid),price:q&&q.cost,profile:s.buildings[pid][0]&&s.buildings[pid][0].buildingProfile.id,
      defaultTax:FBDATA.buildings.profile_work.tax};
  });
  expect(r).toMatchObject({pure:true,stable:true,selected:'hill_grazing',done:true,profile:'hill_grazing',defaultTax:2});
  expect(r.paid).toBe(r.price);
});

test('AI first permission and real service use canonical reviews without renewing a changed incumbent',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,rid=FB.settlementCountyHolder(s,pid),b=s.buildings[pid][0];
    s.realms[rid].treasury.gold=10000;
    const before=s.realms[rid].treasury.gold,initial=FB.buildingProfiles.reviewInheritedAI(s),free=before===s.realms[rid].treasury.gold;
    const repeated=FB.buildingProfiles.reviewInheritedAI(s),paid=FB.buildingOperations.runAI(s),again=FB.buildingOperations.runAI(s);
    const binding=JSON.stringify(b.institutionBinding),gold=s.realms[rid].treasury.gold;
    s.chars[b.institutionBinding.incumbentId].dead=true;FB.invalidateBuildingIndex(s,pid);
    const changed=FB.buildingProfiles.reviewInheritedAI(s);
    return {initial:initial,free:free,repeated:repeated,paid:paid,again:again,changed:changed,
      same:binding===JSON.stringify(b.institutionBinding)&&gold===s.realms[rid].treasury.gold,
      effect:FB.buildingBonusAt(s,pid,b.s,'piety')};
  });
  expect(r).toEqual({initial:1,free:true,repeated:0,paid:1,again:0,changed:0,same:true,effect:0});
});

test('profile seasonal validation accepts a weaker same-field variant and rejects a second effect channel',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(source){
    source.buildingProfiles={dry_variant:{buildingId:'fiber_works',name:'Modest drying works',desc:'A weaker same-field variant.',
      replace:{populationFamineProtection:0.02},requiresTech:[],inheritance:'retain'}};
    const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const valid=FB.mods.validate(source);
    source.buildingProfiles.dry_variant.replace.tax=1;
    const rejected=FB.mods.validate(source).length>0;
    return {valid:valid,rejected:rejected,pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },seasonalExample);
  expect(r).toEqual({valid:[],rejected:true,pure:true});
});

test('inherited permission review and selected profile use shared back navigation',async function({page},info){
  await page.setViewportSize({width:360,height:740});
  await start(page,info,'river');await hold(page);
  await page.evaluate(function(){FB.ui.showBuildings(FB.state.player.provinceId,0);});
  await expect(page.locator('#gm-body')).toContainText('No current institutional permission');
  const permission=page.locator('[data-institution-building="profile_work"]');
  await permission.focus();await permission.press('Enter');
  await expect(page.locator('#gm-binding-apply')).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(permission).toBeFocused();
  await page.locator('[data-profile-building="profile_work"]').click();
  await expect(page.locator('#gm-profile-choice')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-profile-building="profile_work"]')).toBeVisible();
});
