'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/regional-milling-river.json'),
  catchment:require('../fixtures/authoring/regional-milling-catchment.json')};
dependsOnRuntime(__filename,['index.html','data/buildings_milling_variants.js','data/building_profiles.js',
  'data/site_resources.js','data/building_operations.js','data/map_data.js','data/technology.js',
  'js/building_profiles.js','js/building_operations.js','js/site_resources.js','js/building_seasons.js',
  'js/building_institutions.js','js/world.js','js/actions.js','js/fortifications.js','js/lordships.js',
  'js/population.js','js/technology.js','js/treasury.js','js/authority.js','js/home_authority.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

async function start(page,info,label,revision) {
  await openGame(page,info);
  await page.evaluate(function(){FB.ui.showMods();});
  const source=JSON.parse(JSON.stringify(examples[label]));
  const world=label==='river'?'resource_river':'resource_upland';
  source.bookmarks[world].revision=revision||'empty';
  await page.locator('#modfile').setInputFiles({name:'regional-milling-'+label+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB&&FB.game&&FB.game.bootReady;});
  await beginBookmark(page,info,world,world+'_household');
  await page.evaluate(function(label){
    const s=FB.state;
    window.millCase={pid:label==='river'?'resource_quay':'resource_hill',slot:label==='river'?0:1,
      profileId:label==='river'?'horizontal_mill':'catchment_mill',
      rid:label==='river'?'resource_river_court':'resource_hill_court'};
    window.millKnowledge=function(actor,known){
      const realm=actor.kind==='realm'?actor.id:FB.settlementCountyHolder(s,millCase.pid),r=FB.realmTechRecord(s,realm);
      r.completed=r.completed.filter(function(id){return id!=='water_power'&&id!=='undershot_watermill';});
      (known||[]).forEach(function(id){r.completed.push(id);});
      FB.invalidateBuildingIndex(s,millCase.pid);
    };
    window.millRequest=function(actor){return {countyId:millCase.pid,settlement:millCase.slot,buildingId:'mill',profileId:millCase.profileId,actor:actor};};
    window.millService=function(actor){const q=millRequest(actor);delete q.profileId;return q;};
    window.millEffects=function(){return [FB.buildingBonusAt(s,millCase.pid,millCase.slot,'tax'),FB.buildingBonusAt(s,millCase.pid,millCase.slot,'populationCapacity')];};
    window.millPublic=function(){const a={kind:'realm',id:millCase.rid};s.realms[a.id].treasury.gold=10000;return a;};
    window.millPermission=function(actor){return FB.authorityAppoint(s,{officeId:'resource_keeper',institutionId:millCase.rid,
      appointer:{kind:'realm',id:millCase.rid},holder:actor,scope:{kind:'county',id:millCase.pid},endTurn:s.turn+30});};
  },label);
}
async function hold(page) {
  await page.evaluate(function(){
    const s=FB.state,pid=millCase.pid;
    FB.setPlayerTier(s,4,{stationFarewell:false});s.player.provs=[pid];s.owner[pid]=s.holder[pid]='player';s.player.gold=10000;
    FB.foundPlayerRealm(s);FB.rememberSettlementSites(s,pid);
    for(let i=1;i<FB.settlementVisibleCount(s,pid);i++)FB.assignSettlementLordship(s,pid,i,s.player.charId);
    FB.invalidateSettlementLordships(s);FB.invalidateBuildingIndex(s,pid);
    window.millActor={kind:'character',id:s.player.charId};
    millKnowledge(millActor,['water_power']);
  });
}

for(const label of ['river','catchment']) {
  test(label+' real ordinary import validates without creating stock, effects or a machine',async function({page},info){
    await start(page,info,label);
    const r=await page.evaluate(function(){
      const s=FB.state;
      const faults=FB.buildingProfiles.catalogFaults(FBDATA),ops=FB.compileBuildingOperations(FB.campaignBookmark(s));
      const a=millPublic();
      const staged=JSON.stringify([FBDATA,s]),r0=FB.getRngState(),u0=FB.getUidCounter();
      FB.buildingProfiles.quote(s,millRequest(a));FB.siteResources.snapshot(s);
      return {faults:faults,operations:ops.errors,pure:staged===JSON.stringify([FBDATA,s])&&r0===FB.getRngState()&&u0===FB.getUidCounter(),
        noSource:!s.siteResources,noReceipt:!s.buildingOperations,noAsset:!Object.values(s.buildings).some(function(rows){return rows.some(function(b){return b.id==='mill';});}),
        effects:millEffects(),sameDefault:FB.buildingProfiles.definition('mill')===FBDATA.buildings.mill};
    });
    expect(r).toEqual({faults:[],operations:[],pure:true,noSource:true,noReceipt:true,noAsset:true,effects:[0,0],sameDefault:true});
  });
  test(label+' inherited inventory is dormant, carries strict identity and grants zero development',async function({page},info){
    await start(page,info,label,'inherited');
    const r=await page.evaluate(function(){
      const s=FB.state,b=s.buildings[millCase.pid].find(function(b){return b.id==='mill';});
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return {valid:FB.buildingProfiles.validate(s),again:FB.initializeOpeningInfrastructure(s),dev:b.devGranted,
        id:b.id,profile:b.buildingProfile.id,inherited:b.buildingProfile.inherited.siteId===FB.settlementsOf(s,millCase.pid)[millCase.slot].site,
        effects:millEffects(),noReceipt:!s.buildingOperations,noStock:!s.siteResources,
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    });
    expect(r).toEqual({valid:true,again:false,dev:0,id:'mill',profile:label==='river'?'horizontal_mill':'catchment_mill',inherited:true,effects:[0,0],noReceipt:true,noStock:true,pure:true});
  });
}

test('bundled horizontal profile has exact weaker replacements, one existing gate and no added technology',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const d=FB.buildingProfiles.definition('mill','horizontal_mill'),p=FBDATA.buildingProfiles.horizontal_mill;
    return {values:[d.cost,d.upkeep,d.devMin,d.tax,d.populationCapacity,d.dev,d.pop,d.prestige,d.aiBuildOrder],
      tech:d.requiresTech,window:p.applicability,review:FBDATA.techImpactReviews.features.horizontal_milling,
      base:[FBDATA.buildings.mill.cost,FBDATA.buildings.mill.tax,FBDATA.buildings.mill.dev,FBDATA.buildings.mill.populationCapacity,FBDATA.buildings.mill.requiresTech],
      absent:!FBDATA.tech.horizontal_watermill&&!FBDATA.buildings.horizontal_mill};
  });
  expect(r.values).toEqual([30,0,1,1,0.03,0,0,0,18]);expect(r.tech).toEqual(['water_power']);
  expect(r.window).toEqual({yearMin:476,yearMax:1300});expect(r.base).toEqual([40,2,1,0.05,'undershot_watermill']);
  expect(r.review).toMatchObject({mode:'hard',tech:['water_power']});expect(r.review.fallback).toContain('hand');expect(r.absent).toBe(true);
});

test('player construction charges once and one paid allocation supplies both replacement benefits',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=millCase.pid,P=FB.buildingProfiles,O=FB.buildingOperations,dev=s.dev[pid],gold=s.player.gold;
    const q=P.quote(s,millRequest(millActor)),built=P.commit(s,q),again=P.commit(s,q),idle=millEffects();
    const b=s.buildings[pid][0],service=O.quote(s,millService(millActor)),before=s.player.gold;
    const paid=O.commit(s,service),repeat=O.commit(s,service),effects=millEffects();
    millKnowledge(millActor,[]);const grandfathered=millEffects();millKnowledge(millActor,['water_power','undershot_watermill']);
    const rows=P.effectRows(s,'tax').filter(function(r){return r.profileId==='horizontal_mill';});
    return {allowed:q.allowed,built:built,again:again,constructionPaid:gold-before,invoice:q.cost,idle:idle,paid:paid,repeat:repeat,
      servicePaid:before-s.player.gold,work:service.cost,effects:effects,grandfathered:grandfathered,one:s.buildings[pid].filter(function(r){return r.id==='mill'&&r.s===0;}).length,
      consumed:FB.siteResources.snapshot(s,pid)[0].consumed,dev:s.dev[pid]-dev,granted:b.devGranted,rows:rows,
      defaultRefused:FB.build(s,pid,0,'mill'),profile:b.buildingProfile.id};
  });
  expect(r).toMatchObject({allowed:true,built:true,again:false,idle:[0,0],paid:true,repeat:false,effects:[1,0.03],grandfathered:[1,0.03],one:1,consumed:1,dev:0,granted:0,defaultRefused:false,profile:'horizontal_mill'});
  expect(r.constructionPaid).toBe(r.invoice);expect(r.servicePaid).toBe(r.work);
  expect(r.rows).toEqual([{buildingId:'mill',profileId:'horizontal_mill',count:1,amount:1}]);
});

test('technology, empty reserves and wrong site reject without payment, identities or RNG changes',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.buildingProfiles,results=[];
    function denied(req){const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=P.quote(s,req);
      results.push(!q.allowed&&!P.commit(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter());}
    millKnowledge(millActor,[]);denied(millRequest(millActor));millKnowledge(millActor,['water_power']);
    denied(Object.assign(millRequest(millActor),{settlement:1}));
    s.player.gold=0;denied(millRequest(millActor));s.player.gold=10000;
    FB.siteResources.commit(s,FB.siteResources.quote(s,{operation:'reserve',sourceId:'mill_intake',actor:millActor,amount:4}));denied(millRequest(millActor));
    return results;
  });
  expect(r).toEqual([true,true,true,true]);
});

test('reviewed construction becomes stale after a purse or source reservation change',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.buildingProfiles,q=P.quote(s,millRequest(millActor));s.player.gold--;
    const before=JSON.stringify(s),first=q.allowed&&!P.commit(s,q)&&before===JSON.stringify(s);
    const fresh=P.quote(s,millRequest(millActor));
    FB.siteResources.commit(s,FB.siteResources.quote(s,{operation:'reserve',sourceId:'mill_intake',actor:millActor,amount:1}));
    const changed=JSON.stringify(s),second=fresh.allowed&&!P.commit(s,fresh)&&changed===JSON.stringify(s);
    return [first,second];
  });
  expect(r).toEqual([true,true]);
});

for(const year of [475,476,867,1066,1300,1301]) test('horizontal construction calendar boundary '+year,async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(year){const s=FB.state;s.date.year=year;
    const person=s.chars[s.player.charId];person.born=year-24;
    return FB.buildingProfiles.status(s,millCase.pid,0,'mill','horizontal_mill',millActor).ready;
  },year);
  expect(r).toBe(year>=476&&year<=1300);
});

test('unprofiled mills retain their old gate, permanent effects and development award',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=millCase.pid,missing=FB.canBuildAt(s,pid,1,'mill');millKnowledge(millActor,['undershot_watermill']);
    const dev=s.dev[pid],built=FB.build(s,pid,1,'mill'),b=s.buildings[pid].find(function(r){return r.s===1&&r.id==='mill';});
    return {missing:missing,built:built,profile:!!b.buildingProfile,water:!!b.waterOperation,
      effects:[FB.buildingBonusAt(s,pid,1,'tax'),FB.buildingBonusAt(s,pid,1,'populationCapacity')],dev:s.dev[pid]-dev};
  });
  expect(r).toEqual({missing:false,built:true,profile:false,water:false,effects:[2,0.05],dev:1});
});

test('ruin, expiry, custody and changed holder stop both current effects without refunds',async function({page},info){
  await start(page,info,'river');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=millCase.pid,O=FB.buildingOperations,P=FB.buildingProfiles;
    if(!P.commit(s,P.quote(s,millRequest(millActor)))||!O.commit(s,O.quote(s,millService(millActor))))throw new Error('Paid setup failed');
    const b=s.buildings[pid][0],v=s.buildingOperations.receipts[b.waterOperation.id],paid=JSON.stringify([s.player.gold,s.siteResources,s.buildingOperations]),out=[];
    b.ruined=true;FB.invalidateBuildingIndex(s,pid);out.push(millEffects());delete b.ruined;
    const turn=s.turn;s.turn=v.untilTurn;FB.invalidateBuildingIndex(s,pid);out.push(millEffects());s.turn=turn;
    s.chars[s.player.charId].captive=true;FB.invalidateBuildingIndex(s,pid);out.push(millEffects());delete s.chars[s.player.charId].captive;
    s.holder[pid]=millCase.rid;FB.invalidateBuildingIndex(s,pid);out.push(millEffects());
    return {effects:out,uncharged:paid===JSON.stringify([s.player.gold,s.siteResources,s.buildingOperations]),retained:b.buildingProfile.id};
  });
  expect(r).toEqual({effects:[[0,0],[0,0],[0,0],[0,0]],uncharged:true,retained:'horizontal_mill'});
});

for(const label of ['river','catchment']) test(label+' inherited ruin repair retains identity outside construction dates and knowledge',async function({page},info){
  await start(page,info,label,'ruined');await hold(page);
  const r=await page.evaluate(function(){
    const s=FB.state,pid=millCase.pid,b=s.buildings[pid].find(function(r){return r.id==='mill';}),stamp=JSON.stringify(b.buildingProfile),dev=s.dev[pid];
    millKnowledge(millActor,[]);s.date.year=1400;
    const q=FB.repairBuildingStatus(s,pid,b.s,b.id),gold=s.player.gold,
      built=FB.repairBuilding(s,pid,b.s,b.id,q.cost),again=FB.repairBuilding(s,pid,b.s,b.id,q.cost);
    return {ready:q.ready,repaired:built,again:again,paid:gold-s.player.gold,price:q.cost,
      identity:stamp===JSON.stringify(b.buildingProfile),dev:s.dev[pid]-dev,granted:b.devGranted,effects:millEffects(),
      noService:!s.buildingOperations,noWater:!s.siteResources,construction:FB.buildingProfiles.status(s,pid,b.s,b.id,millCase.profileId,millActor).ready};
  });
  expect(r).toMatchObject({ready:true,repaired:true,again:false,identity:true,dev:0,granted:0,effects:[0,0],noService:true,noWater:true,construction:false});
  expect(r.paid).toBe(r.price);expect(r.price).toBeGreaterThan(0);
});

test('public AI construction and service use the same technology, reserves and receipt',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,a=millPublic(),P=FB.buildingProfiles,O=FB.buildingOperations;millKnowledge(a,['water_power']);
    const options=P.aiChoices(s,a,millCase.pid,0,'mill'),choice=options.find(function(v){return v.profileId==='horizontal_mill';});
    const q=P.quote(s,millRequest(a)),privateGold=s.player.gold,gold=s.realms[a.id].treasury.gold;
    s.realms[a.id].treasury.gold=q.cost;const lowBefore=JSON.stringify(s),poor=P.quote(s,millRequest(a));
    const protectedFunds=!poor.allowed&&!P.commit(s,poor)&&lowBefore===JSON.stringify(s);s.realms[a.id].treasury.gold=gold;
    const built=P.commit(s,q),paid=O.runAI(s),again=O.runAI(s);
    return {choice:!!choice,priority:choice&&choice.def.aiBuildOrder,protectedFunds:protectedFunds,allowed:q.allowed,built:built,paid:paid,again:again,
      effects:millEffects(),privateUnchanged:privateGold===s.player.gold,expense:gold-s.realms[a.id].treasury.gold,invoice:q.cost+1};
  });
  expect(r).toMatchObject({choice:true,priority:18,protectedFunds:true,allowed:true,built:true,paid:1,again:0,effects:[1,0.03],privateUnchanged:true});expect(r.expense).toBe(r.invoice);
});

test('annual public builder considers separately prioritized profiles at their own order',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,a=millPublic();millKnowledge(a,['water_power']);
    // Keep the real annual planner and transactions, isolate candidate priority from unrelated affordable buildings.
    const original=FB.aiCanBuildAt,seen=[];
    FB.aiCanBuildAt=function(s,actor,pid,slot,id,profileId){
      seen.push([id,profileId||null]);return id==='mill'&&profileId==='horizontal_mill'&&original(s,actor,pid,slot,id,profileId);
    };
    try{FB.aiBuildingsYear(s);}finally{FB.aiCanBuildAt=original;}
    const asset=(s.buildings[millCase.pid]||[]).find(function(b){return b.id==='mill';});
    return {profile:asset&&asset.buildingProfile.id,seen:seen.some(function(v){return v[1]==='horizontal_mill';}),
      noService:!s.buildingOperations,effects:millEffects()};
  });
  expect(r).toEqual({profile:'horizontal_mill',seen:true,noService:true,effects:[0,0]});
});

test('catchment permission, paid filling and finite stored discharge are separate commitments',async function({page},info){
  await start(page,info,'catchment','inherited');
  const r=await page.evaluate(function(){
    const s=FB.state,a=millPublic(),O=FB.buildingOperations,pid=millCase.pid;
    const dry=O.quote(s,millService(a)),fill={countyId:pid,settlement:1,buildingId:'catchment_fill_works',actor:a};
    const denied=FB.buildRealm(s,a.id,pid,1,'catchment_fill_works'),permission=millPermission(a);
    const built=FB.buildRealm(s,a.id,pid,1,'catchment_fill_works'),filled=O.commit(s,O.quote(s,fill));
    const gold=s.realms[a.id].treasury.gold,q=O.quote(s,millService(a)),paid=O.commit(s,q),again=O.commit(s,q);
    const tank=FB.siteResources.snapshot(s,pid).find(function(v){return v.id==='upland_tank';});
    const active=millEffects(),snapshot=JSON.stringify([s.siteResources,s.buildingOperations,s.realms[a.id].treasury.gold]);
    FB.authorityAppointmentTransition(s,permission.id,'remove');FB.invalidateBuildingIndex(s,pid);
    return {dry:dry.allowed,denied:denied,permission:!!permission,built:built,filled:filled,paid:paid,again:again,
      work:gold-s.realms[a.id].treasury.gold,cost:q.cost,active:active,stock:tank.stock,stopped:millEffects(),
      noRefund:snapshot===JSON.stringify([s.siteResources,s.buildingOperations,s.realms[a.id].treasury.gold])};
  });
  expect(r).toMatchObject({dry:false,denied:false,permission:true,built:true,filled:true,paid:true,again:false,active:[0.8,0.02],stock:0,stopped:[0,0],noRefund:true});
  expect(r.work).toBe(r.cost);expect(r.cost).toBe(3);
});

test('detached imports reject wrong mechanism, duplicate occupancy, alias demands and malformed gates purely',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(source){
    const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const changes=[function(m,b){b.siteResourceAssignments[0].suitability.gradient=false;b.revision='inherited';},
      function(m,b){b.siteResourceAssignments[0].siteId='missing';},
      function(m,b){b.revision='inherited';b.revisions.inherited.openingInfrastructure.placements.push(JSON.parse(JSON.stringify(b.revisions.inherited.openingInfrastructure.placements[0])));},
      function(m,b){b.buildingOperationAssignments[0].stores=['missing'];},
      function(m,b){m.buildingOperationProfiles={bad:{mode:'use',amount:1,periodDays:7,workCost:1,effect:['tax','tax']}};},
      function(m,b){b.buildingOperationAssignments.push(Object.assign({},b.buildingOperationAssignments[0],{id:'alias_demand',demandId:'alias_grinding'}));}];
    const valid=FB.mods.validate(source),reject=changes.map(function(change){const m=JSON.parse(JSON.stringify(source));change(m,m.bookmarks.resource_river);return FB.mods.validate(m).length>0;});
    return {valid:valid,reject:reject,pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig()};
  },examples.river);
  expect(r).toEqual({valid:[],reject:Array(6).fill(true),pure:true});
});

test('matching save retains paid depletion and profile; malformed identities reject before adoption',async function({page},info){
  await start(page,info,'river');await hold(page);
  const first=await page.evaluate(function(){
    const s=FB.state,P=FB.buildingProfiles,O=FB.buildingOperations;
    if(!P.commit(s,P.quote(s,millRequest(millActor)))||!O.commit(s,O.quote(s,millService(millActor))))throw new Error('Paid setup failed');
    return {save:FB.save.serialize(),facts:JSON.stringify([s.buildings,s.siteResources,s.buildingOperations,s.player.gold])};
  });
  await restoreBookmark(page,first.save);
  expect(await page.evaluate(function(){const s=FB.state;return JSON.stringify([s.buildings,s.siteResources,s.buildingOperations,s.player.gold]);})).toBe(first.facts);
  const r=await page.evaluate(function(){
    const input=JSON.parse(FB.save.serialize()),pid='resource_quay',before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(b){b.buildingProfile.v=2;},function(b){b.buildingProfile.id='missing';},function(b){b.buildingProfile.definition='wrong';},
      function(b){b.buildingProfile.extra=1;},function(b){delete b.waterOperation;},function(b){b.waterOperation.profileId='missing';}];
    const reject=changes.map(function(change){const bad=JSON.parse(JSON.stringify(input));change(bad.state.buildings[pid][0]);try{FB.save.restore(bad);return false;}catch(e){return true;}});
    return {reject:reject,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({reject:Array(6).fill(true),pure:true});
});

test('inherited matching save and deliberate demolition never reinstall a machine or service',async function({page},info){
  await start(page,info,'river','inherited');await hold(page);
  const first=await page.evaluate(function(){const s=FB.state;return {save:FB.save.serialize(),facts:JSON.stringify([s.buildings,s.dev,s.openingInfrastructureState])};});
  await restoreBookmark(page,first.save);
  expect(await page.evaluate(function(){const s=FB.state;return JSON.stringify([s.buildings,s.dev,s.openingInfrastructureState]);})).toBe(first.facts);
  const removed=await page.evaluate(function(){const s=FB.state;if(!FB.demolishBuilding(s,'resource_quay',0,'mill'))throw new Error('Demolition failed');return FB.save.serialize();});
  await restoreBookmark(page,removed);
  expect(await page.evaluate(function(){const s=FB.state;return {empty:!(s.buildings.resource_quay||[]).length,again:FB.initializeOpeningInfrastructure(s),noReceipt:!s.buildingOperations};})).toEqual({empty:true,again:false,noReceipt:true});
});


test('phone profile review keeps the exact missing gate and retained selection through Cancel',async function({page},info){
  await page.setViewportSize({width:360,height:740});await start(page,info,'river');await hold(page);
  await page.evaluate(function(){millKnowledge(millActor,[]);FB.ui.showBuildings(millCase.pid,0);});
  const entry=page.locator('[data-profile-building="mill"]');await entry.focus();await entry.press('Enter');
  await page.locator('#gm-profile-choice').selectOption('horizontal_mill');
  await expect(page.locator('#gm-profile-review')).toBeDisabled();
  const name=await page.evaluate(function(){return FBDATA.tech.water_power.name;});
  await expect(page.locator('#gm-body')).toContainText(name);
  await page.locator('#gm-profile-back').click();await expect(entry).toBeFocused();
  await page.evaluate(function(){millKnowledge(millActor,['water_power']);});
  await entry.click();await page.locator('#gm-profile-choice').selectOption('horizontal_mill');
  await page.locator('#gm-profile-review').click();await page.locator('#gm-profile-cancel').click();
  await expect(page.locator('#gm-profile-choice')).toHaveValue('horizontal_mill');
  await page.locator('#gm-profile-back').click();await expect(entry).toBeFocused();
  expect(await page.evaluate(function(){return !(FB.state.buildings[millCase.pid]||[]).length;})).toBe(true);
});

test('Water Power reverse discovery names the real mill profile and its base owner',async function({page},info){
  await start(page,info,'river');await page.evaluate(function(){FB.ui.showTechDetail('water_power');});
  await expect(page.locator('#gm-body')).toContainText('Horizontal Watermill');
  const base=await page.evaluate(function(){return FBDATA.buildings.mill.name;});
  await expect(page.locator('#gm-body')).toContainText(base);
});


test('inherited saved identity cannot be relabeled, moved or stripped of original placement provenance',async function({page},info){
  await start(page,info,'river','inherited');
  const r=await page.evaluate(function(){
    const input=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(b){b.buildingProfile.inherited.siteId='resource_slip';},
      function(b){b.buildingProfile.inherited.revision='empty';},function(b){b.buildingProfile.inherited.extra=true;},
      function(b){b.buildingProfile.inherited=null;}];
    const rejected=changes.map(function(change){const bad=JSON.parse(JSON.stringify(input));change(bad.state.buildings.resource_quay[0]);
      try{FB.save.restore(bad);return false;}catch(e){return true;}});
    return {rejected:rejected,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({rejected:Array(4).fill(true),pure:true});
});
