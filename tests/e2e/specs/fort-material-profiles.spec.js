'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {timber:require('../fixtures/authoring/fort-profiles-timber.json'),
  masonry:require('../fixtures/authoring/fort-profiles-masonry.json')};
dependsOnRuntime(__filename,['index.html','data/map_data.js','data/technology.js','data/building_profiles.js',
  'data/fort_profiles.js','data/buildings_circuit_profiles.js','js/fort_profiles.js','js/building_profiles.js','js/fortifications.js',
  'js/actions.js','js/world.js','js/technology.js','js/mods.js','js/home_authority.js',
  'js/lordships.js','js/settlement.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

async function start(page,info,kind) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/fort-profiles-' + kind + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  const world = kind === 'timber' ? 'inventory_estuary' : 'inventory_uplands';
  await beginBookmark(page,info,world,world + '_household');
}
async function hold(page,kind,county) {
  await page.evaluate(function (a) {
    const s=FB.state,p=s.player,pid=a.county || (a.kind==='timber'?'inventory_quay':'inventory_vale');
    FB.setPlayerTier(s,4,{stationFarewell:false});p.provs=[pid];p.provinceId=pid;p.gold=10000;
    s.owner[pid]=s.holder[pid]='player';s.buildings[pid]=s.buildings[pid]||[];s.wars={};s.armies=[];s.date.year=a.kind==='timber'?900:1050;
    FB.foundPlayerRealm(s);FB.invalidateSettlementLordships(s);FB.invalidateFortIndex();
    const record=FB.realmTechRecord(s);record.completed=record.completed.filter(function(id){
      return ['ringworks','castle_towers','lime_mortar','stone_castles'].indexOf(id)<0;
    });
    FB.invalidateTechBonuses();
  },{kind,county});
}

for (const kind of ['timber','masonry']) {
  test(kind + ' real Mods import retains inherited identity without a project, payment or reseeding',async function({page},info){
    await start(page,info,kind);
    const r=await page.evaluate(function(){
      const s=FB.state,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const valid=FB.fortProfiles.validate(s),plan=FB.compileOpeningInfrastructure(FB.campaignBookmark(s));
      const rows=Object.values(s.buildings).flat().filter(function(b){return !!b.buildingProfile;});
      return {valid,errors:plan.errors,rows:rows.length,again:FB.initializeOpeningInfrastructure(s),
        identity:rows.every(function(b){return b.buildingProfile.v===1&&b.buildingProfile.inherited&&b.devGranted===0&&!b.targetLevel&&!b.fortProfileProject;}),
        pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        material:FBDATA.fortProfiles[rows[0].buildingProfile.id].material,review:FBDATA.techImpactReviews.features.fort_material_identity.mode};
    });
    expect(r).toEqual({valid:true,errors:[],rows:kind==='timber'?1:2,again:false,identity:true,pure:true,material:kind,review:'none'});
    const saved=await page.evaluate(function(){const s=FB.state;return {text:FB.save.serialize(),buildings:JSON.parse(JSON.stringify(s.buildings)),gold:s.player.gold,prestige:s.player.prestige};});
    await restoreBookmark(page,saved.text);
    expect(await page.evaluate(function(){const s=FB.state;return {valid:FB.fortProfiles.validate(s),buildings:s.buildings,gold:s.player.gold,prestige:s.player.prestige};}))
      .toEqual({valid:true,buildings:saved.buildings,gold:saved.gold,prestige:saved.prestige});
  });
  test(kind + ' detached invalid imports reject unsupported stats, levels, roles and requirements without publication',async function({page},info){
    await start(page,info,kind);
    const r=await page.evaluate(function(example){
      const before=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
      const profile=Object.keys(example.fortProfiles)[0],bad=[];
      [function(p){p.defense=1;},function(p){p.levels={'5':[]};},function(p){p.levels={'1':['absent_knowledge']};},
        function(p){p.material='';},function(p){p.techImpactReview='absent_review';}].forEach(function(change){
        const mod=JSON.parse(JSON.stringify(example));change(mod.fortProfiles[profile]);
        bad.push(FB.mods.validate(mod).length>0);
      });
      const wrong=JSON.parse(JSON.stringify(example));wrong.buildingProfiles[profile].buildingId='keep';
      bad.push(FB.mods.validate(wrong).length>0);
      return {bad,pure:before===JSON.stringify(FBDATA)&&state===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig()};
    },examples[kind]);
    expect(r).toEqual({bad:[true,true,true,true,true,true],pure:true});
  });
}

test('timber alternative funds canonical level one without ringworks and completes once at the dated boundary',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,p=s.player,def=FB.fortLevelDef(1),gold=p.gold,prestige=p.prestige,dev=s.dev[pid];
    const request={countyId:pid,settlement:0,profileId:'sample_timber_fort',targetLevel:1,realmId:'player',repair:false};
    const old=FB.fortProjectStatus(s,pid,0,1),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=FB.fortProfiles.quote(s,request),pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const paid=!!FB.fortProfiles.commit(s,q),repeat=!!FB.fortProfiles.commit(s,q),fort=FB.fortAt(s,pid),pending=FB.fortProfiles.validate(s);
    const project=JSON.parse(JSON.stringify(fort.fortProfileProject));
    s.turn=fort.completeTurn;s.date.year=1200;
    const first=FB.fortificationDay(s),second=FB.fortificationDay(s);
    return {old:old.ok,missing:old.missingTech,allowed:q.allowed,pure,paid,repeat,pending,project,first,second,
      spent:gold-p.gold,cost:q.cost,reward:p.prestige-prestige,expected:def.prestige,dev:s.dev[pid]-dev,
      level:fort.level,noProject:!fort.fortProfileProject,count:s.buildings[pid].filter(function(b){return b.id==='walls';}).length,
      defense:FB.fortLevelDef(fort.level).defense,canonical:def.defense,upkeep:FB.fortUpkeep(s),expectedUpkeep:def.upkeep};
  });
  expect(r).toMatchObject({old:false,missing:['ringworks'],allowed:true,pure:true,paid:true,repeat:false,pending:true,
    first:1,second:0,dev:0,level:1,noProject:true,count:1});
  expect(r.spent).toBe(r.cost);expect(r.reward).toBe(r.expected);expect(r.defense).toBe(r.canonical);expect(r.upkeep).toBe(r.expectedUpkeep);
  expect(r.project).toMatchObject({v:1,profileId:'sample_timber_fort',fromLevel:0,targetLevel:1,repair:false,work:0});
});

test('masonry knowledge, inclusive years and county scope remain visible with the same canonical price',async function({page},info){
  await start(page,info,'masonry');await hold(page,'masonry');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,request={countyId:pid,settlement:0,profileId:'sample_masonry_fort',targetLevel:1,realmId:'player',repair:false};
    const missing=FB.fortProfiles.quote(s,request);FB.realmTechRecord(s).completed.push('lime_mortar');FB.invalidateTechBonuses();
    const values=[999,1000,1100,1101].map(function(year){s.date.year=year;return FB.fortProfiles.quote(s,request).allowed;});
    s.date.year=1050;
    const wrong=FB.fortProfiles.status(s,'inventory_quay',0,request.profileId,1,'player',false);
    return {missing:missing.allowed,reason:missing.reason,requirements:missing.requirements,cost:missing.cost,values,wrong:wrong.ready};
  });
  expect(r.missing).toBe(false);expect(r.reason).toContain('Lime Mortar');expect(r.requirements).toEqual(['lime_mortar']);expect(r.cost).toBeGreaterThan(0);
  expect(r.values).toEqual([false,true,true,false]);expect(r.wrong).toBe(false);
});

test('era restrictions and inherited level mappings fail closed without changing property or catalogues',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(example){
    const s=FB.state,era=s.start.era,property=JSON.stringify(s.buildings),data=JSON.stringify(FBDATA);
    s.start.era='late_antique';
    const wrong=FB.fortProfiles.quote(s,{countyId:s.player.provinceId,settlement:0,profileId:'sample_timber_fort',targetLevel:1,realmId:'player',repair:false});
    s.start.era=era;
    const invalid=JSON.parse(JSON.stringify(example));
    invalid.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[0].level=4;
    return {wrong:wrong.allowed,reason:wrong.reason,rejected:FB.mods.validate(invalid).length>0,
      pure:property===JSON.stringify(s.buildings)&&data===JSON.stringify(FBDATA)};
  },examples.timber);
  expect(r).toMatchObject({wrong:false,rejected:true,pure:true});expect(r.reason).toContain('era');
});

test('changed control, treasury, time or a new fort invalidates a reviewed project without payment',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,request={countyId:pid,settlement:0,profileId:'sample_timber_fort',targetLevel:1,realmId:'player',repair:false};
    const results=[];
    const q=FB.fortProfiles.quote(s,request);s.player.gold--;
    results.push(!FB.fortProfiles.commit(s,q));s.player.gold++;
    const timed=FB.fortProfiles.quote(s,request);s.turn++;
    results.push(!FB.fortProfiles.commit(s,timed));s.turn--;
    const controlled=FB.fortProfiles.quote(s,request);s.holder[pid]='inventory_ridge_court';
    results.push(!FB.fortProfiles.commit(s,controlled));s.holder[pid]='player';
    const duplicate=FB.fortProfiles.quote(s,request);s.buildings[pid].push({id:'walls',s:1,level:1});FB.invalidateFortIndex();
    results.push(!FB.fortProfiles.commit(s,duplicate));
    return {results,gold:s.player.gold,projects:s.buildings[pid].filter(function(b){return b.targetLevel;}).length};
  });
  expect(r).toEqual({results:[true,true,true,true],gold:10000,projects:0});
});

test('material ruins block a second fort across the county while a keep supplies no strategic identity',async function({page},info){
  await start(page,info,'masonry');await hold(page,'masonry','inventory_well');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,gold=s.player.gold,before=JSON.stringify(s);
    const q=FB.fortProjectStatus(s,pid,1,1),paid=FB.startFortProject(s,pid,1,1);
    const wrong=Object.assign({},FBDATA,{fortProfiles:{bad:{material:'masonry',levels:{'1':[]}}},
      buildingProfiles:{bad:{buildingId:'keep',replace:{},requiresTech:[]}}});
    return {allowed:q.ok,paid:!!paid,pure:before===JSON.stringify(s)&&gold===s.player.gold,role:FB.fortProfiles.catalogFaults(wrong).length>0};
  });
  expect(r).toEqual({allowed:false,paid:false,pure:true,role:true});
});

test('inherited ruined masonry repairs outside era and knowledge, retains identity and grants no prestige',async function({page},info){
  await start(page,info,'masonry');await hold(page,'masonry','inventory_well');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,b=FB.fortAt(s,pid,true),identity=JSON.stringify(b.buildingProfile),gold=s.player.gold,prestige=s.player.prestige;
    s.date.year=1301;
    const q=FB.repairBuildingStatus(s,pid,b.s,b.id),paid=FB.repairBuilding(s,pid,b.s,b.id,q.cost),again=FB.repairBuilding(s,pid,b.s,b.id,q.cost);
    const valid=FB.fortProfiles.validate(s);s.turn=b.completeTurn;
    const completed=FB.fortificationDay(s),repeat=FB.fortificationDay(s);
    return {ready:q.ready,paid,again,valid,completed,repeat,cost:q.cost,spent:gold-s.player.gold,
      prestige:s.player.prestige-prestige,level:b.level,identity:identity===JSON.stringify(b.buildingProfile),noProject:!b.fortProfileProject};
  });
  expect(r).toMatchObject({ready:true,paid:true,again:false,valid:true,completed:1,repeat:0,prestige:0,level:2,identity:true,noProject:true});
  expect(r.spent).toBe(r.cost);
});

test('annual fort AI buys one material project from the existing work budget and shares the live quote',async function({page},info){
  await start(page,info,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,rid='inventory_estuary_court',pid='inventory_quay',realm=s.realms[rid];
    realm.fortWorks=400;realm.fortWorksYear=s.date.year;delete realm.fortProjectYear;
    const tech=FB.realmTechRecord(s,rid);tech.completed=[];FB.invalidateTechBonuses();
    s.armies=[];s.wars={};const before=realm.fortWorks,q=FB.fortProfiles.aiQuote(s,rid,pid);
    FB.fortAIYear(s);const after=realm.fortWorks;FB.fortAIYear(s);
    const b=FB.fortAt(s,pid);
    return {allowed:q.allowed,cost:q.work,spent:before-after,again:realm.fortWorks===after,
      selected:b.buildingProfile.id,project:b.fortProfileProject.work,valid:FB.fortProfiles.validate(s)};
  });
  expect(r).toMatchObject({allowed:true,again:true,selected:'sample_timber_fort',valid:true});expect(r.spent).toBe(r.cost);expect(r.project).toBe(r.cost);
});

test('matching pending restore and conquest retain paid work without replay or reconstruction',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const pending=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId;
    FB.startFortProject(s,pid,0,1,{profileId:'sample_timber_fort'});
    return {save:FB.save.serialize(),gold:s.player.gold,fort:JSON.parse(JSON.stringify(FB.fortAt(s,pid)))};
  });
  await restoreBookmark(page,pending.save);
  const r=await page.evaluate(function(expected){
    const s=FB.state,pid=s.player.provinceId,b=FB.fortAt(s,pid),same=JSON.stringify(b)===JSON.stringify(expected.fort),gold=s.player.gold;
    s.owner[pid]=s.holder[pid]='inventory_ridge_court';s.date.year=1200;
    const valid=FB.fortProfiles.validate(s);s.turn=b.completeTurn;
    const prestige=s.player.prestige,completed=FB.fortificationDay(s),again=FB.fortificationDay(s);
    return {same,gold,valid,completed,again,unchanged:gold===s.player.gold,prestige:s.player.prestige-prestige,level:b.level};
  },pending);
  expect(r).toEqual({same:true,gold:pending.gold,valid:true,completed:1,again:0,unchanged:true,prestige:0,level:1});
});

test('strict optional project saves reject forged fields, missing projects and duplicate forts without mutation',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId;FB.startFortProject(s,pid,0,1,{profileId:'sample_timber_fort'});
    const before=JSON.stringify(s),bad=[];
    [function(b){b.fortProfileProject.v=2;},function(b){b.fortProfileProject.completeTurn++;},function(b){delete b.fortProfileProject;},
      function(b){b.fortProfileProject.freeReward=1;},function(b){b.buildingProfile.definition='changed';},
      function(b){b.fortProfileProject.fromLevel=3;}].forEach(function(change){
      const detached=JSON.parse(before),b=detached.buildings[pid][0];change(b);
      try{FB.buildingProfiles.validate(detached);FB.fortProfiles.validate(detached);bad.push(false);}catch(e){bad.push(true);}
    });
    const duplicate=JSON.parse(before);duplicate.buildings[pid].push({id:'walls',s:1,level:1});
    try{FB.fortProfiles.validate(duplicate);bad.push(false);}catch(e){bad.push(true);}
    return {bad,pure:before===JSON.stringify(s)};
  });
  expect(r).toEqual({bad:[true,true,true,true,true,true,true],pure:true});
});

test('profile review Cancel and Escape retain the selected site and never fund work',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  await page.evaluate(function(){FB.ui.showBuildingProfiles(FB.state.player.provinceId,0,'walls');});
  await expect(page.locator('#gm-profile-choice')).toHaveValue('sample_timber_fort');
  await expect(page.locator('#gm-body')).toContainText('Canonical fort tier');
  await page.locator('#gm-profile-review').click();
  await page.locator('#gm-profile-cancel').click();
  await expect(page.locator('#gm-profile-choice')).toHaveValue('sample_timber_fort');
  await expect(page.locator('#gm-profile-site')).toHaveValue('0');
  await expect(page.locator('#gm-profile-review')).toBeFocused();
  await page.locator('#gm-profile-review').click();await page.keyboard.press('Escape');
  await expect(page.locator('#gm-profile-choice')).toHaveValue('sample_timber_fort');
  expect(await page.evaluate(function(){return {gold:FB.state.player.gold,fort:FB.fortAt(FB.state,FB.state.player.provinceId)};})).toEqual({gold:10000,fort:null});
});

test('masonry profile confirmation uses the shared selected quote and discloses its real technology consumer',async function({page},info){
  await start(page,info,'masonry');await hold(page,'masonry');
  await page.evaluate(function(){
    FB.realmTechRecord(FB.state).completed.push('lime_mortar');FB.invalidateTechBonuses();
    FB.ui.showBuildingProfiles(FB.state.player.provinceId,0,'walls');
  });
  await expect(page.locator('#gm-profile-choice')).toHaveValue('sample_masonry_fort');
  await expect(page.locator('#gm-body')).toContainText('Lime Mortar');
  const quote=await page.evaluate(function(){return FB.buildingProfiles.quote(FB.state,{countyId:FB.state.player.provinceId,
    settlement:0,buildingId:'walls',profileId:'sample_masonry_fort',actor:{kind:'character',id:FB.state.player.charId}});});
  expect(quote.allowed).toBe(true);
  await page.locator('#gm-profile-review').click();await page.locator('#gm-profile-confirm').click();
  await expect(page.locator('#gm-profile-confirm')).toBeDisabled();
  const r=await page.evaluate(function(){const s=FB.state,b=FB.fortAt(s,s.player.provinceId);
    return {gold:s.player.gold,profile:b.buildingProfile.id,target:b.targetLevel,valid:FB.fortProfiles.validate(s)};});
  expect(r).toEqual({gold:10000-quote.cost,profile:'sample_masonry_fort',target:1,valid:true});
  await page.evaluate(function(){FB.ui.showTechDetail('castle_towers');});
  await expect(page.locator('#gm-body')).toContainText('Masonry strongpoint');
});

test('full detached restore rejects altered material/project provenance before adopting any state',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId;FB.startFortProject(s,pid,0,1,{profileId:'sample_timber_fort'});
    const payload=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const failures=[function(b){delete b.fortProfileProject;},function(b){b.fortProfileProject.cost=-1;},
      function(b){b.fortProfileProject.work=60;},function(b){b.fortProfileProject.startedTurn=1;},
      function(b){b.buildingProfile.definition='different-material';}].map(function(change){
      const input=JSON.parse(JSON.stringify(payload));change(input.state.buildings[pid][0]);
      try{FB.save.restore(input);return false;}catch(e){return true;}
    });
    return {failures,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({failures:[true,true,true,true,true],pure:true});
});

test('ordinary unprofiled levels and old records keep their numeric definitions and gain no identity',async function({page},info){
  await start(page,info,'timber');await hold(page,'timber');
  const r=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId,old={id:'walls',s:0,level:1};s.buildings[pid]=[old];FB.invalidateFortIndex();
    const before=JSON.stringify(old),levels=JSON.stringify(FBDATA.forts.levels);FB.fortProfiles.validate(s);
    const status=FB.fortProjectStatus(s,pid,0,2),selected=FB.fortProjectStatus(s,pid,0,2,{profileId:'sample_timber_fort'});
    return {untouched:before===JSON.stringify(old),levels:levels===JSON.stringify(FBDATA.forts.levels),missing:status.missingTech,
      selected:selected.ok,identity:old.buildingProfile===undefined,keep:FB.isFortificationBuilding('keep')};
  });
  expect(r).toEqual({untouched:true,levels:true,missing:['castle_towers'],selected:false,identity:true,keep:false});
});
