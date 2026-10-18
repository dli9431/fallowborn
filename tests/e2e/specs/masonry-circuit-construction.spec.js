'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/masonry-circuit-river.json'),
  upland:require('../fixtures/authoring/masonry-circuit-upland.json')};
const config = {
  river:{world:'inventory_estuary',county:'inventory_quay',ruin:'inventory_ridge',profile:'urban_circuit',year:500},
  upland:{world:'inventory_uplands',county:'inventory_vale',ruin:'inventory_well',profile:'upland_timber_circuit',year:800}
};
dependsOnRuntime(__filename,['index.html','data/map_data.js','data/technology.js',
  'data/technology_masonry_circuits.js','data/buildings_circuit_profiles.js',
  'data/building_profiles.js','data/fort_profiles.js','data/eras.js','data/cultures.js',
  'js/technology.js','js/building_profiles.js','js/fort_profiles.js','js/fortifications.js',
  'js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/home_authority.js',
  'js/lordships.js','js/settlement.js','js/ui_modals.js','js/ui_misc.js']);

test.beforeEach(async function ({page}) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    function snapshot() {
      return JSON.parse(JSON.stringify({tech:FBDATA.tech,buildings:FBDATA.buildings,
        forts:FBDATA.forts,caps:FBDATA.techCaps,profiles:FBDATA.buildingProfiles,
        materials:FBDATA.fortProfiles}));
    }
    ['tech_masonry_circuits','buildingProfiles_circuit_profiles'].forEach(function (key) {
      Object.defineProperty(FBDATA,key,{configurable:true,set:function (value) {
        window['before_' + key] = snapshot();
        Object.defineProperty(this,key,{configurable:true,enumerable:true,writable:true,value:value});
      }});
    });
    document.addEventListener('load',function (event) {
      const src=event.target.getAttribute && event.target.getAttribute('src');
      if(src==='data/technology_masonry_circuits.js')window.after_masonry=snapshot();
      if(src==='data/buildings_circuit_profiles.js')window.after_circuit=snapshot();
    },true);
  });
});

async function start(page,info,kind) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/masonry-circuit-' + kind + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  await beginBookmark(page,info,config[kind].world,config[kind].world + '_household');
}
async function hold(page,kind,ruin) {
  await page.evaluate(function (a) {
    const s=FB.state,p=s.player,pid=a.ruin?a.c.ruin:a.c.county;
    FB.setPlayerTier(s,4,{stationFarewell:false});p.provs=[pid];p.provinceId=pid;p.gold=10000;
    s.chars[p.charId].born=a.c.year-50;
    s.owner[pid]=s.holder[pid]='player';s.buildings[pid]=s.buildings[pid]||[];
    s.wars={};s.armies=[];s.date.year=a.c.year;
    FB.foundPlayerRealm(s);s.realms.player.liege=null;
    FB.invalidateSettlementLordships(s);FB.invalidateFortIndex();
    const rec=FB.realmTechRecord(s);
    rec.completed=['lime_mortar','fortified_camps','spear_shield_drill','masonry_circuits'];
    rec.active=[];rec.progress={};rec.reserve=0;rec.historicalSeeded=1;
    FB.invalidateTechBonuses();
  },{c:config[kind],ruin:!!ruin});
}

test('literal supplements add exactly one knowledge node and one profile, retaining all default values',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function () {
    const before=window.before_tech_masonry_circuits,after=window.after_masonry;
    const retained=Object.assign({},after.tech);delete retained.masonry_circuits;
    const oldProfiles=window.before_buildingProfiles_circuit_profiles,next=window.after_circuit;
    const profiles=Object.assign({},next.profiles),materials=Object.assign({},next.materials);
    delete profiles.urban_circuit;delete materials.urban_circuit;
    return {retained,before:before.tech,tech:after.tech.masonry_circuits,
      defaults:JSON.stringify([before.buildings,before.forts,before.caps])===JSON.stringify([after.buildings,after.forts,after.caps]),
      unchanged:JSON.stringify([oldProfiles.buildings,oldProfiles.forts])===JSON.stringify([next.buildings,next.forts]),
      profiles,oldProfiles:oldProfiles.profiles,materials,oldMaterials:oldProfiles.materials,
      circuit:next.profiles.urban_circuit,material:next.materials.urban_circuit,
      review:FBDATA.techImpactReviews.features.masonry_circuit_construction};
  });
  expect(r.retained).toEqual(r.before);expect(r.defaults).toBe(true);expect(r.unchanged).toBe(true);
  expect(r.profiles).toEqual(r.oldProfiles);expect(r.materials).toEqual(r.oldMaterials);
  expect(r.tech).toMatchObject({domain:'warfare',cost:50,req:['lime_mortar','fortified_camps'],
    history:{attested:[200,600],adoption:{default:[500,1050],latin:[200,450],byzantine:[200,400],
      islamic:[400,850],persianate:[200,600],slavic:[750,1100],nordic:[800,1150],
      steppe:[700,1100],baltic_finnic:[850,1250],caucasian:[300,750],northeast_african:[200,800]}},
    fx:{},unlocks:[],capabilities:[]});
  expect(r.circuit).toMatchObject({buildingId:'walls',replace:{},requiresTech:['masonry_circuits'],
    applicability:{yearMin:476,yearMax:649,eras:['late_antique']},inheritance:'retain'});
  expect(r.material).toEqual({material:'masonry',levels:{'1':[],'2':[]},techImpactReview:'masonry_circuit_construction'});
  expect(r.review).toMatchObject({mode:'hard',tech:['masonry_circuits']});expect(r.review.fallback).toContain('inherited repairs');
});

for(const kind of ['river','upland']) {
  test(kind+' ordinary import funds sequential canonical work once without a second fort or bonus',async function ({page},info) {
    await start(page,info,kind);await hold(page,kind);
    const r=await page.evaluate(function (c) {
      const s=FB.state,pid=s.player.provinceId,p=s.player,def=FB.fortLevelDef(2),gold=p.gold,prestige=p.prestige,dev=s.dev[pid];
      const req={countyId:pid,settlement:0,profileId:c.profile,targetLevel:1,realmId:'player',repair:false};
      const wrong=FB.fortProfiles.quote(s,Object.assign({},req,{targetLevel:2}));
      const prior=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q1=FB.fortProfiles.quote(s,req);
      const pure=prior===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const first=!!FB.fortProfiles.commit(s,q1),repeat=!!FB.fortProfiles.commit(s,q1),b=FB.fortAt(s,pid);
      s.turn=b.completeTurn;const completed1=FB.fortificationDay(s);
      const q2=FB.fortProfiles.quote(s,Object.assign({},req,{targetLevel:2}));
      const canonical=FB.fortProjectStatus(s,pid,0,2,{profileId:c.profile});
      const second=!!FB.fortProfiles.commit(s,q2),project=JSON.parse(JSON.stringify(b.fortProfileProject));
      const duration=b.completeTurn-s.turn;s.turn=b.completeTurn;
      const completed2=FB.fortificationDay(s),again=FB.fortificationDay(s);
      return {wrong:wrong.allowed,pure,first,repeat,second,completed1,completed2,again,
        spent:gold-p.gold,expected:q1.cost+q2.cost,level:b.level,project,duration,expectedDuration:def.seasons*90,
        reward:p.prestige-prestige,expectedReward:FB.fortLevelDef(1).prestige+def.prestige,
        work:q2.work,expectedWork:def.work,canonicalCost:canonical.cost,secondCost:q2.cost,
        dev:s.dev[pid]-dev,count:s.buildings[pid].filter(function(x){return x.id==='walls';}).length,
        upkeep:FB.fortUpkeep(s),expectedUpkeep:def.upkeep,defense:FB.fortBattleBonus(s,pid),
        max:FB.fortProfiles.quote(s,Object.assign({},req,{targetLevel:3})).allowed,
        valid:FB.fortProfiles.validate(s),profile:b.buildingProfile.id,noProject:!b.fortProfileProject};
    },config[kind]);
    expect(r).toMatchObject({wrong:false,pure:true,first:true,repeat:false,second:true,
      completed1:1,completed2:1,again:0,level:2,dev:0,count:1,max:false,valid:true,
      profile:config[kind].profile,noProject:true,defense:0.10});
    expect(r.spent).toBe(r.expected);expect(r.reward).toBe(r.expectedReward);expect(r.work).toBe(r.expectedWork);
    expect(r.secondCost).toBe(r.canonicalCost);expect(r.duration).toBe(r.expectedDuration);
    expect(r.upkeep).toBe(r.expectedUpkeep);
    expect(r.project).toMatchObject({v:1,profileId:config[kind].profile,fromLevel:1,targetLevel:2,repair:false,work:0});
  });

  test(kind+' inherited ruined circuit repairs after knowledge and construction expiry without awards',async function ({page},info) {
    await start(page,info,kind);await hold(page,kind,true);
    const r=await page.evaluate(function () {
      const s=FB.state,pid=s.player.provinceId,b=FB.fortAt(s,pid,true),stamp=JSON.stringify(b.buildingProfile),gold=s.player.gold,prestige=s.player.prestige;
      s.date.year=1301;FB.realmTechRecord(s).completed=[];FB.invalidateTechBonuses();
      const q=FB.repairBuildingStatus(s,pid,b.s,b.id),paid=FB.repairBuilding(s,pid,b.s,b.id,q.cost);
      const repeat=FB.repairBuilding(s,pid,b.s,b.id,q.cost),valid=FB.fortProfiles.validate(s);
      const project=JSON.parse(JSON.stringify(b.fortProfileProject));s.turn=b.completeTurn;
      const completed=FB.fortificationDay(s),again=FB.fortificationDay(s);
      return {ready:q.ready,paid,repeat,valid,completed,again,spent:gold-s.player.gold,cost:q.cost,
        canonical:FB.marketCostQuote(s,FB.fortLevelDef(2).cost*0.5,{materials:0.80,transport:0.15,wares:0.05},pid,'up'),
        same:stamp===JSON.stringify(b.buildingProfile),level:b.level,prestige:s.player.prestige-prestige,project,
        knowledge:FB.realmTechRecord(s).completed.slice()};
    });
    expect(r).toMatchObject({ready:true,paid:true,repeat:false,valid:true,completed:1,again:0,same:true,level:2,prestige:0,knowledge:[]});
    expect(r.spent).toBe(r.cost);expect(r.cost).toBe(r.canonical);expect(r.project).toMatchObject({repair:true,targetLevel:2});
  });

  test(kind+' matching pending and demolished restores never replace assets or replay paid work',async function ({page},info) {
    await start(page,info,kind);await hold(page,kind);
    const pending=await page.evaluate(function (c) {
      const s=FB.state,pid=s.player.provinceId;
      if(!FB.startFortProject(s,pid,0,1,{profileId:c.profile}))throw new Error('Funded circuit required');
      const rec=FB.realmTechRecord(s);rec.active=['scriptoria'];rec.progress={scriptoria:7};rec.reserve=3;
      return {text:FB.save.serialize(),buildings:JSON.parse(JSON.stringify(s.buildings)),gold:s.player.gold,tech:JSON.stringify(rec)};
    },config[kind]);
    await restoreBookmark(page,pending.text);
    expect(await page.evaluate(function () {
      return {buildings:FB.state.buildings,gold:FB.state.player.gold,tech:JSON.stringify(FB.realmTechRecord(FB.state))};
    })).toEqual({buildings:pending.buildings,gold:pending.gold,tech:pending.tech});
    const removed=await page.evaluate(function () {
      const s=FB.state,pid=s.player.provinceId,b=FB.fortAt(s,pid);
      s.date.year=1301;FB.realmTechRecord(s).completed=[];FB.invalidateTechBonuses();
      s.turn=b.completeTurn;FB.fortificationDay(s);
      if(FB.fortificationDay(s)!==0)throw new Error('Completion must be once only');
      if(!FB.demolishFort(s,pid,0))throw new Error('Demolition required');
      return {text:FB.save.serialize(),buildings:JSON.parse(JSON.stringify(s.buildings)),gold:s.player.gold,prestige:s.player.prestige};
    });
    await restoreBookmark(page,removed.text);
    expect(await page.evaluate(function () {
      const s=FB.state;FB.repairForts(s);
      return {buildings:s.buildings,gold:s.player.gold,prestige:s.player.prestige,fort:FB.fortAt(s,s.player.provinceId)};
    })).toEqual({buildings:removed.buildings,gold:removed.gold,prestige:removed.prestige,fort:null});
  });
}

test('inclusive date and campaign era gates, exact missing knowledge and imported level requirements remain visible',async function ({page},info) {
  await start(page,info,'river');await hold(page,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId,req={countyId:pid,settlement:0,profileId:'urban_circuit',targetLevel:1,realmId:'player',repair:false};
    const rec=FB.realmTechRecord(s);rec.completed=[];FB.invalidateTechBonuses();
    const missing=FB.fortProfiles.quote(s,req);rec.completed=['masonry_circuits'];FB.invalidateTechBonuses();
    const years=[475,476,649,650].map(function (year) {s.date.year=year;return FB.fortProfiles.quote(s,req).allowed;});
    s.date.year=500;s.start.era='early_medieval';const era=FB.fortProfiles.quote(s,req);
    return {missing:missing.allowed,reason:missing.reason,requirements:missing.requirements,years,era:era.allowed};
  });
  expect(r).toMatchObject({missing:false,requirements:['masonry_circuits'],years:[false,true,true,false],era:false});
  expect(r.reason).toContain('Masonry Circuit Defenses');
  await page.evaluate(function () {FB.ui.showTechDetail('masonry_circuits');});
  await expect(page.locator('#gm-body')).toContainText('Masonry Circuit');
});

test('imported timber levels use different requirements and scope without hardcoded material behavior',async function ({page},info) {
  await start(page,info,'upland');await hold(page,'upland');
  const r=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId,rec=FB.realmTechRecord(s);
    rec.completed=['fortified_camps'];FB.invalidateTechBonuses();
    const req={countyId:pid,settlement:0,profileId:'upland_timber_circuit',targetLevel:1,realmId:'player',repair:false};
    const q=FB.fortProfiles.quote(s,req);FB.fortProfiles.commit(s,q);const b=FB.fortAt(s,pid);s.turn=b.completeTurn;FB.fortificationDay(s);
    const missing=FB.fortProfiles.quote(s,Object.assign({},req,{targetLevel:2}));
    const dates=[749,750,850,851].map(function (year) {s.date.year=year;return FB.fortProfiles.status(s,pid,0,req.profileId,1,'player',false).ready;});
    s.date.year=800;
    return {first:q.allowed,missing:missing.allowed,reason:missing.reason,requirements:missing.requirements,dates,
      wrongCounty:FB.fortProfiles.status(s,'inventory_pass',0,req.profileId,1,'player',false).ready,
      material:FB.fortProfiles.get(req.profileId).material};
  });
  expect(r).toMatchObject({first:true,missing:false,requirements:['fortified_camps','lime_mortar'],
    dates:[false,true,true,false],wrongCounty:false,material:'timber'});expect(r.reason).toContain('Lime Mortar');
});

test('wrong site, authority, competing ruins, insufficient funds and stale terms never pay or create another fort',async function ({page},info) {
  await start(page,info,'river');await hold(page,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId,req={countyId:pid,settlement:0,profileId:'urban_circuit',targetLevel:1,realmId:'player',repair:false};
    const q=FB.fortProfiles.quote(s,req),checks=[];
    function fails(request) {
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const quote=FB.fortProfiles.quote(s,request),paid=FB.fortProfiles.commit(s,quote);
      return !quote.allowed&&!paid&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    }
    checks.push(fails(Object.assign({},req,{settlement:7})));
    s.holder[pid]='inventory_ridge_court';FB.invalidateSettlementLordships(s);checks.push(fails(req));
    s.holder[pid]='player';FB.invalidateSettlementLordships(s);
    s.player.gold=0;checks.push(fails(req));s.player.gold=10000;
    s.buildings[pid].push({id:'walls',s:1,level:0,ruined:true,ruinedLevel:1});FB.invalidateFortIndex();checks.push(fails(req));
    s.buildings[pid]=[];FB.invalidateFortIndex();
    s.turn++;const before=JSON.stringify(s);checks.push(!FB.fortProfiles.commit(s,q)&&before===JSON.stringify(s));
    return {checks,gold:s.player.gold,buildings:s.buildings[pid]};
  });
  expect(r).toEqual({checks:[true,true,true,true,true],gold:10000,buildings:[]});
});

test('annual AI spends the same finite work budget and retains one selected strategic fort',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,rid='inventory_estuary_court',pid='inventory_quay',realm=s.realms[rid];
    realm.fortWorks=400;realm.fortWorksYear=s.date.year;delete realm.fortProjectYear;
    FB.realmTechRecord(s,rid).completed=['masonry_circuits'];FB.invalidateTechBonuses();s.wars={};s.armies=[];
    const before=realm.fortWorks,q=FB.fortProfiles.aiQuote(s,rid,pid);
    FB.fortAIYear(s);const after=realm.fortWorks;FB.fortAIYear(s);const b=FB.fortAt(s,pid);
    return {allowed:q.allowed,spent:before-after,expected:FB.fortLevelDef(1).work,repeat:realm.fortWorks===after,
      profile:b.buildingProfile.id,level:b.targetLevel,work:b.fortProfileProject.work,valid:FB.fortProfiles.validate(s)};
  });
  expect(r).toMatchObject({allowed:true,repeat:true,profile:'urban_circuit',level:1,valid:true});
  expect(r.spent).toBe(r.expected);expect(r.work).toBe(r.expected);
});

test('pure ordinary validation rejects noncanonical levels, effects, duplicate forts and unknown requirements',async function ({page},info) {
  await start(page,info,'upland');
  const r=await page.evaluate(function (example) {
    const state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const bad=[function (m) {m.fortProfiles.upland_timber_circuit.levels={'5':[]};},
      function (m) {m.fortProfiles.upland_timber_circuit.defense=1;},
      function (m) {m.buildingProfiles.upland_timber_circuit.replace={cost:1};},
      function (m) {m.fortProfiles.upland_timber_circuit.levels['2']=['missing_knowledge'];},
      function (m) {m.bookmarks.inventory_uplands.openingInfrastructure.placements.push({countyId:'inventory_well',siteId:'inventory_well_house',buildingId:'walls',condition:'standing',level:1});},
      function (m) {m.bookmarks.inventory_uplands.openingInfrastructure.placements[0].level=3;}
    ].map(function (change) {const m=JSON.parse(JSON.stringify(example));change(m);return FB.mods.validate(m).length>0;});
    return {bad,pure:state===JSON.stringify(FB.state)&&data===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig()};
  },examples.upland);
  expect(r).toEqual({bad:Array(6).fill(true),pure:true});
});

test('strict pending restore rejects changed profile, level or project provenance before adoption',async function ({page},info) {
  await start(page,info,'river');await hold(page,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId;FB.startFortProject(s,pid,0,1,{profileId:'urban_circuit'});
    const payload=JSON.parse(FB.save.serialize()),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=[function (b) {delete b.fortProfileProject;},function (b) {b.buildingProfile.definition='changed';},
      function (b) {b.fortProfileProject.targetLevel=3;},function (b) {b.fortProfileProject.material='timber';},
      function (b) {b.fortProfileProject.cost=-1;},function (b) {b.fortProfileProject.completeTurn++;}
    ].map(function (change) {
      const input=JSON.parse(JSON.stringify(payload));change(input.state.buildings[pid][0]);
      try{FB.save.restore(input);return false;}catch(e){return true;}
    });
    return {rejected,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({rejected:Array(6).fill(true),pure:true});
});

test('removed inherited inventory stays removed on matching restore and repeated initialization',async function ({page},info) {
  await start(page,info,'river');
  const saved=await page.evaluate(function () {
    const s=FB.state;
    // A campaign ledger after physical removal, rather than a new opening.
    s.buildings.inventory_ridge=[];FB.invalidateFortIndex();
    return {text:FB.save.serialize(),buildings:JSON.parse(JSON.stringify(s.buildings)),gold:s.player.gold,prestige:s.player.prestige};
  });
  await restoreBookmark(page,saved.text);
  expect(await page.evaluate(function () {
    const s=FB.state,again=FB.initializeOpeningInfrastructure(s);FB.repairForts(s);
    return {again,buildings:s.buildings,gold:s.player.gold,prestige:s.player.prestige};
  })).toEqual({again:false,buildings:saved.buildings,gold:saved.gold,prestige:saved.prestige});
});

test('fresh windows close early camp knowledge and its existing movement effect, with omissions and mixed traditions',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function () {
    const table=FBDATA.tech;
    function seed(year,traditions,remove,omit) {
      const s={start:{era:year<650?'late_antique':'early_medieval'},date:{year,season:0,day:1},
        realms:{review:{alive:true,techTraditions:traditions,techSeed:{omit:omit||[]}}},realmTech:{}};
      try {
        if(remove){FBDATA.tech=Object.assign({},table);delete FBDATA.tech.masonry_circuits;}
        FB.seedRealmTechnologies(s,true);
        return {done:s.realmTech.review.completed.slice().sort(),exposed:s.realmTech.review.exposed.slice().sort(),movement:FB.techBonus(s,'movement','review')};
      }finally{FBDATA.tech=table;FB.invalidateTechBonuses();}
    }
    const early=seed(476,['latin'],false),prior=seed(476,['latin'],true);
    const rows=[476,493,568,711,800,867,1066].map(function (year) {
      const current=seed(year,['latin'],false),old=seed(year,['latin'],true);
      return {year,extra:current.done.filter(function (id) {return old.done.indexOf(id)<0;}),
        lost:old.done.filter(function (id) {return current.done.indexOf(id)<0;})};
    });
    const traditions=['latin','byzantine','islamic','persianate','slavic','nordic','steppe','baltic_finnic','caucasian','northeast_african'];
    const released=[867,1066].map(function (year) {
      return traditions.map(function (tradition) {
        const current=seed(year,[tradition],false),old=seed(year,[tradition],true);
        return {tradition,done:current.done.indexOf('masonry_circuits')>=0,exposed:current.exposed.indexOf('masonry_circuits')>=0,
          retained:current.done.filter(function (id) {return id!=='masonry_circuits';}).join('|')===old.done.join('|')};
      });
    });
    const mixed={start:{era:'late_antique'},date:{year:476},realms:{review:{alive:true,techTraditions:['latin','byzantine']}}};
    return {rows,released,delta:early.movement-prior.movement,camp:FBDATA.tech.fortified_camps.fx.movement,
      omitted:seed(476,['latin'],false,['fortified_camps']).done,pair:FB.techHistoricalWindow(mixed,'masonry_circuits','review')};
  });
  expect(r.rows).toEqual([476,493,568,711,800,867,1066].map(function (year) {
    return {year,extra:year<650?['fortified_camps','masonry_circuits']:['masonry_circuits'],lost:[]};
  }));
  expect(r.delta).toBeCloseTo(0.005,8);expect(r.camp).toBe(0.005);
  expect(r.omitted).not.toContain('masonry_circuits');expect(r.omitted).not.toContain('fortified_camps');
  expect(r.pair).toMatchObject({emergence:200,widespread:400});
  for(const rows of r.released)for(const row of rows) {
    expect(row.retained).toBe(true);expect(row.exposed).toBe(true);
    expect(row.done).toBe(['latin','byzantine','islamic','persianate','caucasian','northeast_african'].includes(row.tradition));
  }
});

test('retained partial research pays the ordinary project price without retroactive prerequisites or physical rewards',async function ({page},info) {
  await start(page,info,'river');await hold(page,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,rec=FB.realmTechRecord(s);
    rec.completed=['lime_mortar','fortified_camps'];rec.exposed=['masonry_circuits'];rec.active=[];
    rec.progress={scriptoria:7};rec.reserve=0;FB.invalidateTechBonuses();
    const property=JSON.stringify([s.buildings,s.player.gold,s.player.prestige,s.dev]);
    const started=FB.selectTechProject(s,'masonry_circuits'),price=FB.techCost(s,'masonry_circuits');
    FB.addResearch(s,price-1);const pending=!FB.hasTech(s,'masonry_circuits');FB.addResearch(s,1);
    return {started,pending,done:FB.hasTech(s,'masonry_circuits'),partial:rec.progress.scriptoria,
      noAward:property===JSON.stringify([s.buildings,s.player.gold,s.player.prestige,s.dev]),
      noPrerequisite:rec.completed.indexOf('spear_shield_drill')<0};
  });
  expect(r).toEqual({started:true,pending:true,done:true,partial:7,noAward:true,noPrerequisite:true});
});
