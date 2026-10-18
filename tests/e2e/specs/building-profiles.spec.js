'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/building-profiles-river.json'),
  hill:require('../fixtures/authoring/building-profiles-hill.json')};
dependsOnRuntime(__filename,['index.html','data/building_profiles.js','data/building_institutions.js',
  'data/building_operations.js','data/site_resources.js','data/technology.js','data/map_data.js',
  'js/building_profiles.js','js/building_institutions.js','js/building_operations.js','js/site_resources.js',
  'js/fortifications.js','js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/technology.js','js/population.js','js/lordships.js','js/treasury.js','js/politics.js',
  'js/home_authority.js','js/ui_misc.js','js/ui_modals.js','js/main.js']);

async function start(page,info,label,npc) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/building-profiles-' + label + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FBDATA.buildingProfiles && FBDATA.buildingProfiles[Object.keys(FBDATA.buildingProfiles)[0]]; });
  const world = label === 'river' ? 'inventory_estuary' : 'resource_upland';
  await beginBookmark(page,info,world,world + '_household');
  await page.evaluate(function (npc) {
    const s = FB.state, pid = s.player.provinceId;
    window.profileCounty = pid;
    s.player.gold = 10000; s.player.travel = null;
    if (!npc) {
      FB.setPlayerTier(s,4,{stationFarewell:false});
      s.player.provs = [pid]; s.owner[pid] = s.holder[pid] = 'player';
      FB.foundPlayerRealm(s); FB.rememberSettlementSites(s,pid);
      for (let slot=1; slot<FB.settlementVisibleCount(s,pid); slot++) FB.assignSettlementLordship(s,pid,slot,s.player.charId);
      FB.invalidateSettlementLordships(s);
    }
    s.buildings[pid] = [];
    FB.invalidateBuildingIndex(s,pid); FB.invalidateFortIndex();
    window.profileRequest = function (id,slot,actor,buildingId) {
      return {countyId:pid,settlement:slot || 0,buildingId:buildingId || 'profile_work',profileId:id,
        actor:actor || {kind:'character',id:s.player.charId}};
    };
    window.profileKnowledge = function (ids,realm) {
      const record = FB.realmTechRecord(s,realm);
      ids.forEach(function (id) { if (record.completed.indexOf(id) < 0) record.completed.push(id); });
      FB.invalidateBuildingIndex(s,pid);
    };
  },!!npc);
}

for (const label of ['river','hill']) test(label + ' ordinary import resolves all references and pure queries retain defaults',async function ({page},info) {
  await start(page,info,label);
  const r = await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,base=FBDATA.buildings.profile_work,before=JSON.stringify([s,FBDATA]);
    const rng=FB.getRngState(),uid=FB.getUidCounter(),faults=P.catalogFaults(FBDATA);
    P.ids('profile_work').forEach(function(id){ P.quote(s,profileRequest(id)); });
    return {faults:faults,pure:before===JSON.stringify([s,FBDATA])&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
      sameDefault:P.definition('profile_work')===base,review:FBDATA.techImpactReviews.features.building_profile_selection.mode};
  });
  expect(r).toEqual({faults:[],pure:true,sameDefault:true,review:'none'});
});

test('selected river construction pays once, keeps one base asset and awards only replacement values',async function ({page},info) {
  await start(page,info,'river');
  const r = await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;
    profileKnowledge(['water_power']);
    const gold=s.player.gold,dev=s.dev[pid],people=Object.keys(s.chars).length;
    const q=P.quote(s,profileRequest('river_serviced')),built=P.commit(s,q),repeat=P.commit(s,q);
    const record=s.buildings[pid][0],effects=P.assetDefinition(record);
    const baseAttempt=FB.build(s,pid,0,'profile_work'),alternative=P.commit(s,P.quote(s,profileRequest('river_modest')));
    return {allowed:q.allowed,built:built,repeat:repeat,paid:gold-s.player.gold,cost:q.cost,one:s.buildings[pid].length===1,
      baseId:record.id,profile:record.buildingProfile.id,dev:s.dev[pid]-dev,granted:record.devGranted,values:[effects.cost,effects.piety,effects.dev],
      idle:FB.buildingBonusAt(s,pid,0,'piety'),water:record.waterOperation.revision,institution:record.institutionBinding.institutionId,
      people:people===Object.keys(s.chars).length,baseAttempt:baseAttempt,alternative:alternative};
  });
  expect(r).toMatchObject({allowed:true,built:true,repeat:false,one:true,baseId:'profile_work',profile:'river_serviced',
    dev:0,granted:0,values:[30,2,0],idle:0,water:0,institution:'binding_institution',people:true,baseAttempt:false,alternative:false});
  expect(r.paid).toBe(r.cost);
});

test('hill variants differ in price, learning, site permission and technology while ordinary construction survives',async function ({page},info) {
  await start(page,info,'hill');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;
    const record=FB.realmTechRecord(s);record.completed=record.completed.filter(function(id){return id!=='scriptoria';});
    const missing=P.quote(s,profileRequest('hill_learned')),wrongSite=P.quote(s,profileRequest('hill_grazing',0));
    const grazing=P.quote(s,profileRequest('hill_grazing',1)),grazingBuilt=P.commit(s,grazing);
    profileKnowledge(['scriptoria']);
    const learned=P.quote(s,profileRequest('hill_learned')),built=P.commit(s,learned);
    const a=s.buildings[pid].find(function(r){return r.s===1;}),b=s.buildings[pid].find(function(r){return r.s===0;});
    return {missing:!missing.allowed&&missing.reason.indexOf('Scriptoria')>=0,wrongSite:!wrongSite.allowed,
      grazingBuilt:grazingBuilt,built:built,cheaper:grazing.cost<learned.cost,
      tax:P.assetDefinition(a).tax,learnedTax:P.assetDefinition(b).tax,research:P.assetDefinition(b).research,
      defaultTax:FBDATA.buildings.profile_work.tax,defaultDev:FBDATA.buildings.profile_work.dev};
  });
  expect(r).toEqual({missing:true,wrongSite:true,grazingBuilt:true,built:true,cheaper:true,tax:1,learnedTax:0,research:0.25,defaultTax:2,defaultDev:1});
});

test('one real water payment uses replacement benefits and retains profile price provenance after removal',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    let s=FB.state;
    const pid=profileCounty;profileKnowledge(['water_power']);
    if(!FB.build(s,pid,0,'profile_work','river_serviced'))throw new Error('Profile setup failed');
    const request={countyId:pid,settlement:0,buildingId:'profile_work',actor:{kind:'character',id:s.player.charId}};
    const q=FB.buildingOperations.quote(s,request),gold=s.player.gold;
    const paid=FB.buildingOperations.commit(s,q),repeat=FB.buildingOperations.commit(s,q);
    const record=s.buildings[pid][0],receipt=s.buildingOperations.receipts[record.waterOperation.id];
    const cost=gold-s.player.gold,benefit=FB.buildingBonusAt(s,pid,0,'piety'),before=JSON.stringify(s.buildingOperations);
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    const retained=before===JSON.stringify(s.buildingOperations),removed=FB.demolishBuilding(s,pid,0,'profile_work');
    const root=JSON.stringify(s.buildingOperations),funds=s.player.gold;
    FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {paid:paid,repeat:repeat,cost:cost,quote:q.cost,benefit:benefit,profile:receipt.buildingProfile.id,
      retained:retained,removed:removed,absent:s.buildings[pid].length===0,
      orphanRetained:root===JSON.stringify(s.buildingOperations)&&funds===s.player.gold};
  });
  expect(r).toMatchObject({paid:true,repeat:false,benefit:2,profile:'river_serviced',retained:true,removed:true,absent:true,orphanRetained:true});
  expect(r.cost).toBe(r.quote);
});

test('stale price, source, date, authority and incumbent confirmations fail atomically',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;profileKnowledge(['water_power']);
    const changes=[function(){s.player.gold--;},function(){s.date.year++;},function(){s.holder[pid]='missing';},
      function(){s.chars[s.religiousHeads.binding_bishop].dead=true;},
      function(){const q=FB.siteResources.quote(s,{operation:'reserve',sourceId:'profile_intake',actor:{kind:'character',id:s.player.charId},amount:1,reservationId:'profile_rival'}); if(!FB.siteResources.commit(s,q))throw new Error('Source setup failed');}];
    return changes.map(function(change){
      const state=JSON.stringify(s),q=P.quote(s,profileRequest('river_serviced'));change();
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const result=!P.commit(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      Object.keys(s).forEach(function(k){delete s[k];});Object.assign(s,JSON.parse(state));FB.invalidateBuildingIndex(s,pid);FB.invalidateFortIndex();
      return result;
    });
  });
  expect(r).toEqual(Array(5).fill(true));
});

test('default buildings and ruins occupy the same profile and construction-group capacity',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;
    const first=FB.build(s,pid,0,'profile_work');s.buildings[pid][0].ruined=true;FB.invalidateBuildingIndex(s,pid);
    const before=JSON.stringify(s),blocked=!P.commit(s,P.quote(s,profileRequest('river_modest'))),pure=before===JSON.stringify(s);
    const second=P.commit(s,P.quote(s,profileRequest('river_modest',1)));
    const group=FB.buildingConstructionGroupStatus(s,pid,'profile_work');
    return {first:first,blocked:blocked,pure:pure,second:second,count:group.count,remaining:group.remaining,
      cost:FB.buildCost(s,pid,'profile_work',undefined,'river_modest')>FBDATA.buildingProfiles.river_modest.replace.cost};
  });
  expect(r).toEqual({first:true,blocked:true,pure:true,second:true,count:2,remaining:0,cost:true});
});

test('realm selected construction protects ordinary treasury reserves and leaves the household purse alone',async function ({page},info) {
  await start(page,info,'hill',true);
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty,rid=FB.settlementCountyHolder(s,pid),actor={kind:'realm',id:rid};
    profileKnowledge(['scriptoria'],rid);s.realms[rid].treasury.gold=10000;
    const q=P.quote(s,profileRequest('hill_learned',0,actor)),cash=s.realms[rid].treasury.gold,privateCash=s.player.gold;
    const built=P.commit(s,q),paid=cash-s.realms[rid].treasury.gold;
    s.buildings[pid]=[];FB.invalidateBuildingIndex(s,pid);s.realms[rid].treasury.gold=q.cost+1;
    const before=JSON.stringify(s),blocked=!FB.buildRealm(s,rid,pid,0,'profile_work',0,'hill_learned');
    return {built:built,paid:paid,cost:q.cost,privateSame:privateCash===s.player.gold,blocked:blocked,pure:before===JSON.stringify(s)};
  });
  expect(r).toMatchObject({built:true,privateSame:true,blocked:true,pure:true});expect(r.paid).toBe(r.cost);
});

test('private barons fund a selected profile from their real account',async function ({page},info) {
  await start(page,info,'hill');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;
    const baron=FB.makeCharacter(s,{name:'Hill patron',station:3,born:s.date.year-30,culture:'frankish',religion:'catholic',traits:[]});
    if(!FB.assignSettlementLordship(s,pid,1,baron.id))throw new Error('Grant failed');
    FB.settleBaronyAccounts(s,Math.floor(s.turn/90)+1);s.settlementLordships.accounts[baron.id].gold=1000;
    const gold=s.player.gold,q=P.quote(s,profileRequest('hill_grazing',1,{kind:'character',id:baron.id})),built=P.commit(s,q);
    return {built:built,cost:q.cost,paid:1000-FB.baronyAccount(s,baron.id).gold,privateSame:gold===s.player.gold,
      selected:s.buildings[pid][0].buildingProfile.id};
  });
  expect(r).toMatchObject({built:true,privateSame:true,selected:'hill_grazing'});expect(r.paid).toBe(r.cost);
});

test('a funded profiled fort finishes after its construction window without changing canonical tier values',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,pid=profileCounty;
    profileKnowledge(FB.fortLevelDef(1).requiresTech);
    const q=P.quote(s,profileRequest('river_enclosure',0,null,FB.fortificationBuildingId()));
    const built=P.commit(s,q),fort=FB.fortAt(s,pid),stamp=JSON.stringify(fort.buildingProfile);
    s.date.year=901;s.turn=fort.completeTurn;FB.fortificationDay(s);
    const retained=FB.fortAt(s,pid),before=JSON.stringify(s);
    return {built:built,level:retained.level,same:JSON.stringify(retained.buildingProfile)===stamp,
      cost:q.cost,canonical:FB.marketCostQuote(s,FB.fortLevelDef(1).cost,{materials:0.80,transport:0.15,wares:0.05},pid,'up'),
      blocked:!P.commit(s,P.quote(s,profileRequest('river_enclosure',0,null,FB.fortificationBuildingId()))),
      pure:before===JSON.stringify(s)};
  });
  expect(r).toMatchObject({built:true,level:1,same:true,blocked:true,pure:true});expect(r.cost).toBe(r.canonical);
});

for (const label of ['river','hill']) test(label + ' matching restore retains selected and default records without replay',async function ({page},info) {
  await start(page,info,label);
  const before=await page.evaluate(function(label){
    const s=FB.state,pid=profileCounty;profileKnowledge(['water_power','scriptoria']);
    const id=label==='river'?'river_serviced':'hill_learned';
    if(!FB.buildingProfiles.commit(s,FB.buildingProfiles.quote(s,profileRequest(id))))throw new Error('Profile setup failed');
    if(!FB.build(s,pid,1,'profile_work'))throw new Error('Default setup failed');
    return {save:FB.save.serialize(),buildings:JSON.stringify(s.buildings),gold:s.player.gold,dev:s.dev[pid],water:JSON.stringify(s.siteResources||null)};
  },label);
  await restoreBookmark(page,before.save);
  const after=await page.evaluate(function(){const s=FB.state;return {buildings:JSON.stringify(s.buildings),gold:s.player.gold,dev:s.dev[profileCounty],water:JSON.stringify(s.siteResources||null)};});
  delete before.save;expect(after).toEqual(before);
});

test('profile save corruption and removal of required physical bindings reject before adoption',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=profileCounty;profileKnowledge(['water_power']);
    if(!FB.build(s,pid,0,'profile_work','river_serviced'))throw new Error('Profile setup failed');
    const changes=[function(r){r.buildingProfile.v=2;},function(r){r.buildingProfile.id='missing';},
      function(r){r.buildingProfile.id='river_modest';},function(r){r.buildingProfile.definition='wrong';},
      function(r){r.buildingProfile.extra=true;},function(r){delete r.buildingProfile.definition;},
      function(r){delete r.waterOperation;},function(r){delete r.institutionBinding;}];
    const payload=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    return {rejected:changes.map(function(change){const input=JSON.parse(JSON.stringify(payload));change(input.state.buildings[pid][0]);try{FB.save.restore(input);return false;}catch(e){return true;}}),
      pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({rejected:Array(8).fill(true),pure:true});
});

test('detached ordinary JSON rejects unsupported overrides and references without publication',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function(source){
    const changes=[function(d){d.buildingProfiles=[];},function(d){d.buildingProfiles.river_serviced.extra=true;},
      function(d){d.buildingProfiles.river_serviced.replace.role='industry';},function(d){d.buildingProfiles.river_serviced.replace.cost=-1;},
      function(d){d.buildingProfiles.river_serviced.buildingId='missing';},function(d){d.buildingProfiles.river_serviced.operationProfile='missing';},
      function(d){d.buildingProfiles.river_serviced.institutionProfile='missing';},function(d){d.buildingProfiles.river_serviced.siteResourceProfile='missing';},
      function(d){d.buildingProfiles.river_serviced.requiresTech=['missing'];},function(d){d.buildingProfiles.river_serviced.applicability={yearMin:1000,yearMax:900};},
      function(d){delete d.buildingProfiles.river_serviced.techImpactReview;},function(d){d.buildingProfiles.river_enclosure.replace={cost:1};}];
    return changes.map(function(change){const d=JSON.parse(JSON.stringify(source));change(d);
      const before=JSON.stringify([d,FBDATA,FB.state]),sig=FB.mods.sig(),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(d).length>0&&before===JSON.stringify([d,FBDATA,FB.state])&&sig===FB.mods.sig()&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  },examples.river);
  expect(r).toEqual(Array(12).fill(true));
});

test('profile selectors and confirmation retain source scroll, disclosures and focus through Back and Cancel',async function ({page},info) {
  await start(page,info,'river');
  await page.evaluate(function(){profileKnowledge(['water_power']);FB.ui.showBuildings(profileCounty,0);});
  const entry=page.locator('[data-profile-building="profile_work"]');
  const disclosure=page.locator('#gm-body .settcard-info').first();
  await disclosure.click();
  await entry.focus();
  const scroll=await page.evaluate(function(){const body=document.getElementById('gm-body');body.scrollTop=100;return body.scrollTop;});
  await entry.evaluate(function(button){button.click();});
  await page.locator('#gm-profile-choice').selectOption('river_serviced');
  await expect(page.locator('#gm-body')).toContainText('Water-serviced foundation');
  await page.locator('#gm-profile-review').click();
  await page.locator('#gm-profile-cancel').click();
  await expect(page.locator('#gm-profile-choice')).toHaveValue('river_serviced');
  await page.locator('#gm-profile-back').click();
  await expect(entry).toBeFocused();
  await expect(disclosure).toHaveAttribute('aria-expanded','true');
  expect(await page.locator('#gm-body').evaluate(function(body){return body.scrollTop;})).toBe(scroll);
  await entry.click();
  await page.locator('#gm-profile-choice').selectOption('river_serviced');
  await page.locator('#gm-profile-review').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gm-profile-choice')).toHaveValue('river_serviced');
  await page.keyboard.press('Escape');
  await expect(entry).toBeFocused();
  expect(await page.evaluate(function(){return FB.state.buildings[profileCounty].length;})).toBe(0);
});

test('technology reverse consumers disclose the real profile and its exact missing technology',async function ({page},info) {
  await start(page,info,'river');
  await page.evaluate(function(){FB.ui.showTechDetail('water_power');});
  await expect(page.locator('#gm-body')).toContainText('Water-serviced foundation');
  await expect(page.locator('#gm-body')).toContainText('Ordinary foundation works');
});
