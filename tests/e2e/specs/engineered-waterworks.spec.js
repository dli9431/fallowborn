'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples={supplied:require('../fixtures/authoring/engineered-waterworks-supplied.json'),
  rain:require('../fixtures/authoring/engineered-waterworks-rain.json')};
const ids=['aqueduct_maintenance','qanat_construction','cistern_engineering'];
const traditions=['default','latin','byzantine','islamic','persianate','slavic','nordic','steppe','baltic_finnic','caucasian','northeast_african'];
dependsOnRuntime(__filename,['index.html','data/map_data.js','data/technology.js','data/technology_waterworks.js',
  'data/buildings_waterworks.js','data/technology_early_refinements.js','data/technology_foundations.js',
  'data/technology_learning.js','data/technology_civic_military.js','data/technology_maritime.js','data/technology_wind.js','data/technology_transmission.js',
  'data/building_operations.js','data/site_resources.js','data/bookmarks.js','data/cultures.js','data/eras.js',
  'js/technology.js','js/building_operations.js','js/site_resources.js','js/building_profiles.js','js/building_institutions.js',
  'js/world.js','js/actions.js','js/population.js','js/settlement.js','js/lordships.js','js/treasury.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js']);

async function start(page,info,name,custom){
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(custom?{name:'waterworks.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))}:
    path.resolve(__dirname,'../fixtures/authoring/engineered-waterworks-'+name+'.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  const key=name==='supplied'?'river':'upland';
  await page.waitForFunction(function(key){return window.FB&&FB.game&&FB.game.bootReady&&FBDATA.bookmarks['resource_'+key];},key);
  await beginBookmark(page,info,'resource_'+key,'resource_'+key+'_household');
}
async function build(page){
  return page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,plan=O.compile(FB.campaignBookmark(s));
    const a=plan.assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    const people=JSON.stringify(s.population),dev=JSON.stringify(s.dev);
    return {errors:plan.errors,built:plan.assignments.map(function(a){return FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId);}),
      people:people===JSON.stringify(s.population),dev:dev===JSON.stringify(s.dev),
      remote:s.player.provinceId!==a.countyId,resources:s.siteResources===undefined,operations:s.buildingOperations===undefined};
  });
}

test('water catalogue owns exact graph, schedules, prices, construction scopes and no passive national effects',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(){
    return {tech:FBDATA.tech_waterworks,buildings:FBDATA.buildings_waterworks,
      reviews:['engineered_aqueduct','engineered_qanat','engineered_cistern'].map(function(id){return FBDATA.techImpactReviews.features[id];}),
      errors:FB.validateTechnologyData(true).concat(FB.validateBuildingData(FBDATA.buildings,true),FB.buildingOperations.catalogFaults(FBDATA)),
      counts:[Object.keys(FBDATA.tech).length,Object.keys(FBDATA.buildings).length],
      sources:Array.from(document.scripts).map(function(e){return e.getAttribute('src');}).filter(Boolean)};
  });
  expect(r.errors).toEqual([]);expect(r.counts).toEqual([192,23]);
  const windows=[[[400,1000],[1,400],[1,350],[200,800],[200,600],[700,1050],[800,1150],[700,1200],[900,1250],[200,700],[100,700]],
    [[600,1100],[500,1000],[200,850],[200,800],[-200,400],[850,1200],[900,1250],[500,1000],[950,1300],[300,850],[200,850]],
    [[400,850],[1,400],[1,350],[200,700],[200,700],[600,1000],[750,1100],[600,1050],[800,1200],[200,800],[1,500]]];
  ids.forEach(function(id,i){
    expect(traditions.map(function(t){return r.tech[id].history.adoption[t];})).toEqual(windows[i]);
    expect(r.tech[id]).toMatchObject({cost:i===2?20:50,fx:{},capabilities:[]});
    expect(r.reviews[i]).toMatchObject({mode:'hard',tech:[id]});expect(r.reviews[i].fallback.length).toBeGreaterThan(10);
  });
  expect(r.tech.aqueduct_maintenance.req).toEqual(['lime_mortar','geometry']);
  expect(r.tech.qanat_construction.req).toEqual(['irrigation_channels','geometry']);
  expect(r.tech.cistern_engineering.req).toEqual(['lime_mortar']);
  expect(r.buildings.aqueduct).toMatchObject({cost:90,upkeep:2,devMin:4,maxCounty:1,aiBuildOrder:23,populationCapacity:0.03,
    applicability:{yearMin:476,yearMax:649,eras:['late_antique'],traditions:['latin','byzantine']}});
  expect(r.buildings.qanat_waterworks).toMatchObject({cost:65,upkeep:1,devMin:2,aiBuildOrder:24,populationCapacity:0.03,
    applicability:{yearMin:476,yearMax:1300,traditions:['persianate','islamic']}});
  expect(r.buildings.urban_cisterns).toMatchObject({cost:65,upkeep:1,devMin:4,aiBuildOrder:25,populationFamineProtection:0.05,
    applicability:{yearMin:476,yearMax:1300}});
  for(const source of ['data/technology_waterworks.js','data/buildings_waterworks.js']){
    expect(r.sources.filter(function(s){return s===source;})).toHaveLength(1);
    expect(r.sources.indexOf(source)).toBeGreaterThan(r.sources.indexOf('data/building_operations.js'));
    expect(r.sources.indexOf(source)).toBeLessThan(r.sources.indexOf('data/bookmarks.js'));
  }
});

for(const name of ['supplied','rain']){
  test(name+' real Mods import constructs paid property without stock, population or free operating effects',async function({page},info){
    await start(page,info,name);
    expect(await build(page)).toEqual({errors:[],built:name==='supplied'?[true,true,true]:[true],people:true,dev:true,remote:true,resources:true,operations:true});
    const r=await page.evaluate(function(){
      const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
      const q=O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}),gold=s.realms[who.id].treasury.gold;
      const privateGold=s.player.gold,idle=[FB.buildingBonusIn(s,a.countyId,'populationCapacity'),FB.buildingBonusIn(s,a.countyId,'populationFamineProtection')];
      const people=JSON.stringify(s.population),worked=O.commit(s,q),paid=gold-s.realms[who.id].treasury.gold;
      const active=[FB.buildingBonusIn(s,a.countyId,'populationCapacity'),FB.buildingBonusIn(s,a.countyId,'populationFamineProtection')];
      const before=JSON.stringify([s.buildings,s.buildingOperations,s.siteResources,s.population,s.realms]),saved=FB.save.serialize();
      FB.save.restore(JSON.parse(saved));const t=FB.state;
      const matching=before===JSON.stringify([t.buildings,t.buildingOperations,t.siteResources,t.population,t.realms]);
      const valid=O.validate(t),rows=FB.siteResources.snapshot(t),again=O.commit(t,q);
      t.turn=q.untilTurn;FB.invalidateBuildingIndex(t,a.countyId);
      return {idle:idle,worked:worked,paid:paid,cost:q.cost,work:q.workCost,active:active,again:again,matching:matching,valid:valid,
        consumed:rows[0].consumed,stock:rows[1].stock,private:s.player.gold===privateGold,people:people===JSON.stringify(t.population),
        upkeep:FB.buildingBonusIn(t,a.countyId,'upkeep'),ended:[FB.buildingBonusIn(t,a.countyId,'populationCapacity'),FB.buildingBonusIn(t,a.countyId,'populationFamineProtection')]};
    });
    expect(r).toMatchObject({idle:[0,0],worked:true,again:false,matching:true,valid:true,consumed:2,stock:0,private:true,people:true,upkeep:0,ended:[0,0]});
    expect(r.active).toEqual(name==='supplied'?[0.03,0]:[0,0.05]);expect(r.paid).toBeCloseTo(r.cost,8);expect(r.paid).toBeGreaterThan(r.work);
  });
}

test('one shared intake and demand cannot stack aqueduct and qanat capacity; separate use consumes separate water',async function({page},info){
  await start(page,info,'supplied');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,rows=O.compile(FB.campaignBookmark(s)).assignments,a=rows[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    function request(row){return {countyId:row.countyId,settlement:row.slot,buildingId:row.buildingId,actor:who};}
    const aqueduct=O.quote(s,request(rows[0])),qanat=O.quote(s,request(rows[1]));
    const first=O.commit(s,aqueduct),stale=O.commit(s,qanat),fresh=O.quote(s,request(rows[1]));
    const cistern=O.commit(s,O.quote(s,request(rows[2]))),sources=FB.siteResources.snapshot(s);
    return {first:first,stale:stale,fresh:fresh.allowed,cistern:cistern,capacity:FB.countyBuildingCapacityBonus(s,a.countyId),
      famine:FB.countyBuildingFamineProtection(s,a.countyId),consumed:sources[0].consumed,valid:O.validate(s)};
  });
  expect(r).toEqual({first:true,stale:false,fresh:false,cistern:true,capacity:0.03,famine:0.05,consumed:4,valid:true});
});

test('dry, inaccessible, contested, unstaffed and unfunded inputs fail atomically for the current payer',async function({page},info){
  await start(page,info,'supplied');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,R=FB.siteResources,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
    return [function(t){R.commit(t,R.quote(t,{operation:'reserve',sourceId:a.sourceId,actor:who,amount:12}));},
      function(t){t.chars[FB.political.actor(t,who).characterId].captive=true;},
      function(t){t.holder.resource_quay='blocked_holder';},function(t){t.occupier[a.countyId]='blocked_holder';},
      function(t){t.population.counties[a.countyId].count=0;},
      function(t){t.realms[who.id].treasury.gold=0;t.player.gold=100000;},
      function(t){t.realms[who.id].treasury.gold=(FB.treasuryConstructionReserves(t)||{})[who.id];}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),uid=FB.getUidCounter(),rng=FB.getRngState();
      const q=O.quote(t,req);return !q.allowed&&!O.commit(t,q)&&before===JSON.stringify(t)&&uid===FB.getUidCounter()&&rng===FB.getRngState();});
  });
  expect(r).toEqual(Array(7).fill(true));
});

test('AI respects useful assigned demand, vassal public reserves and separate private funds',async function({page},info){
  await start(page,info,'rain');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const rich=s.realms[who.id].treasury.gold,privateGold=s.player.gold,liege=s.realms[who.id].liege;
    s.realms[who.id].treasury.gold=0;const blocked=O.runAI(s);s.realms[who.id].treasury.gold=rich;
    const count=O.runAI(s),repeat=O.runAI(s);
    return {blocked:blocked,count:count,repeat:repeat,liege:!!liege,private:privateGold===s.player.gold,
      paid:rich-s.realms[who.id].treasury.gold,active:FB.countyBuildingFamineProtection(s,a.countyId)};
  });
  expect(r).toMatchObject({blocked:0,count:1,repeat:0,liege:true,private:true,active:0.05});expect(r.paid).toBeGreaterThan(1);
});

test('construction follows inclusive dates, stamped era and paying sovereign tradition rather than player residence',async function({page},info){
  await start(page,info,'supplied');
  const r=await page.evaluate(function(){
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const cases=[['aqueduct',475,false],['aqueduct',476,true],['aqueduct',649,true],['aqueduct',650,false],
      ['qanat_waterworks',476,true],['qanat_waterworks',1300,true],['qanat_waterworks',1301,false],
      ['urban_cisterns',476,true],['urban_cisterns',1300,true],['urban_cisterns',1301,false]];
    const dates=cases.map(function(row){const t=JSON.parse(JSON.stringify(s));t.date.year=row[1];return FB.buildingApplicabilityStatus(t,a.countyId,row[0],who).ready===row[2];});
    const other=JSON.parse(JSON.stringify(s));other.realms[who.id].techTraditions=['nordic'];
    const forbidden=['aqueduct','qanat_waterworks'].map(function(id){return !FB.buildingApplicabilityStatus(other,a.countyId,id,who).ready;});
    other.start.era='early_medieval';other.realms[who.id].techTraditions=['latin'];
    return {dates:dates,forbidden:forbidden,era:!FB.buildingApplicabilityStatus(other,a.countyId,'aqueduct',who).ready,remote:s.player.provinceId!==a.countyId};
  });
  expect(r).toEqual({dates:Array(10).fill(true),forbidden:[true,true],era:true,remote:true});
});

test('retained aqueduct repair outside dates and without knowledge preserves its binding and awards no development',async function({page},info){
  await start(page,info,'supplied');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    // Adopt only this already existing asset into ordinary direct player property.
    s.player.tier=4;s.player.provs=[a.countyId];s.player.gold=10000;s.owner[a.countyId]=s.holder[a.countyId]='player';
    FB.foundPlayerRealm(s);FB.invalidateSettlementLordships(s,a.countyId);
    const rec=FB.realmTechRecord(s,'player');rec.completed=[];rec.exposed=[];rec.active=[];rec.progress={};FB.invalidateTechBonuses();
    s.date.year=1066;const b=s.buildings[a.countyId].find(function(b){return b.id==='aqueduct';});b.ruined=true;
    FB.invalidateBuildingIndex(s,a.countyId);const stamp=JSON.stringify(b.waterOperation),dev=s.dev[a.countyId],gold=s.player.gold;
    const q=FB.repairBuildingStatus(s,a.countyId,a.slot,b.id),done=FB.repairBuilding(s,a.countyId,a.slot,b.id,q.cost);
    return {ready:q.ready,done:done,paid:gold-s.player.gold,cost:q.cost,dev:s.dev[a.countyId]===dev,
      binding:stamp===JSON.stringify(b.waterOperation),effect:FB.countyBuildingCapacityBonus(s,a.countyId),
      blocked:!FB.buildingApplicabilityStatus(s,a.countyId,b.id).ready,again:FB.repairBuilding(s,a.countyId,a.slot,b.id,q.cost)};
  });
  expect(r).toMatchObject({ready:true,done:true,dev:true,binding:true,effect:0,blocked:true,again:false});expect(r.paid).toBe(r.cost);expect(r.paid).toBeGreaterThan(0);
});

test('ordinary imports reject wrong physical sources, aliases and missing tech purely before publication',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),uid=FB.getUidCounter(),rng=FB.getRngState();
    const invalid=[function(m,b){b.siteResourceAssignments[0].suitability.groundwater=false;},
      function(m,b){b.siteResourceAssignments[0].suitability.gradient=false;},
      function(m,b){b.buildingOperationAssignments[0].stores=[];},
      function(m,b){b.buildingOperationAssignments[1].demandId='second_name_same_demand';},
      function(m,b){b.siteResourceAssignments[1].connectedSourceId='missing_source';},
      function(m,b){b.buildingOperationAssignments[0].countyId='resource_rocks';},
      function(m){m.buildings={aqueduct:JSON.parse(JSON.stringify(FBDATA.buildings.aqueduct))};m.buildings.aqueduct.requiresTech='missing_water_technology';}
    ].map(function(change){const m=JSON.parse(JSON.stringify(example));change(m,m.bookmarks.resource_river.revisions.supplied);return FB.mods.validate(m).length>0;});
    return {valid:FB.mods.validate(example),invalid:invalid,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&uid===FB.getUidCounter()&&rng===FB.getRngState()};
  },examples.supplied);
  expect(r).toEqual({valid:[],invalid:Array(7).fill(true),pure:true});
});

test('strict saved service rejects missing owners, changed provenance and modified policy without restore work',async function({page},info){
  await start(page,info,'rain');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    if(!O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who})))throw new Error('Paid service required');
    const b=s.buildings[a.countyId][0],key=b.waterOperation.id;
    const invalid=[function(t){delete t.buildingOperations;},function(t){delete t.siteResources;},
      function(t){t.buildingOperations.receipts[key].amount++;},function(t){t.buildingOperations.receipts[key].paid=0;},
      function(t){t.buildingOperations.definition='changed';},function(t){t.buildings[a.countyId][0].waterOperation.assignmentId='missing';}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let rejected=false;try{O.validate(t);}catch(e){rejected=true;}return rejected&&before===JSON.stringify(t);});
    const before=JSON.stringify(s);O.validate(s);return {invalid:invalid,pure:before===JSON.stringify(s)};
  });
  expect(r).toEqual({invalid:Array(6).fill(true),pure:true});
});

for(const year of [867,1066]){
  test(year+' complete fresh knowledge deltas preserve every retained id, with no passive effects or property',async function({page},info){
    await openGame(page,info);
    const r=await page.evaluate(function(input){
      const table=FBDATA.tech,rows=[];
      input.traditions.forEach(function(tradition){
        function seed(remove){
          const s={start:{era:'early_medieval'},date:{year:input.year,season:0,day:1},realms:{review:{alive:true,techTraditions:[tradition==='default'?'latin':tradition]}},realmTech:{}};
          try{
            FBDATA.tech=JSON.parse(JSON.stringify(table));
            input.ids.forEach(function(id){if(remove)delete FBDATA.tech[id];else if(tradition==='default')FBDATA.tech[id].history.adoption={default:table[id].history.adoption.default};});
            FB.seedRealmTechnologies(s,true);return s.realmTech.review;
          }finally{FBDATA.tech=table;FB.invalidateTechBonuses();}
        }
        const current=seed(false),prior=seed(true);
        rows.push({tradition:tradition,newDone:current.completed.filter(function(id){return input.ids.indexOf(id)>=0;}).sort(),
          newExposed:current.exposed.filter(function(id){return input.ids.indexOf(id)>=0;}).sort(),
          prior:prior.completed.slice().sort(),retained:current.completed.filter(function(id){return input.ids.indexOf(id)<0;}).sort()});
      });return rows;
    },{ids:ids,traditions:traditions,year:year});
    const all=ids.slice().sort();
    for(const row of r){
      expect(row.retained).toEqual(row.prior);
      let done=[];
      if(['latin'].includes(row.tradition))done=year===867?['aqueduct_maintenance','cistern_engineering']:all;
      else if(['byzantine','islamic','persianate','caucasian','northeast_african'].includes(row.tradition))done=all;
      else if(row.tradition==='default')done=year===867?['cistern_engineering']:['aqueduct_maintenance','cistern_engineering'];
      else if(row.tradition==='slavic'&&year===1066)done=['aqueduct_maintenance','cistern_engineering'];
      else if(row.tradition==='steppe'&&year===1066)done=['cistern_engineering','qanat_construction'];
      expect(row.newDone).toEqual(done.slice().sort());
      const hidden=year===1066?[]:row.tradition==='baltic_finnic'?['aqueduct_maintenance','qanat_construction']:row.tradition==='nordic'?['qanat_construction']:[];
      expect(row.newExposed).toEqual(all.filter(function(id){return !hidden.includes(id);}));
    }
  });
}

test('early closure, omissions, mixed windows and paid research retain the actual inherited geometry effect',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(input){
    const table=FBDATA.tech;
    function seed(traditions,remove,omit){
      const s={start:{era:'late_antique'},date:{year:476,season:0,day:1},realms:{review:{alive:true,techTraditions:traditions,techSeed:{omit:omit||[]}}},realmTech:{}};
      try{if(remove){FBDATA.tech=Object.assign({},table);input.forEach(function(id){delete FBDATA.tech[id];});}FB.seedRealmTechnologies(s,true);return s.realmTech.review.completed.slice();}
      finally{FBDATA.tech=table;FB.invalidateTechBonuses();}
    }
    const current=seed(['latin'],false),prior=seed(['latin'],true),omit=seed(['latin'],false,['geometry']);
    const mixed={start:{era:'late_antique'},date:{year:600},realms:{review:{alive:true,techTraditions:['latin','persianate']}}};
    return {current:current,prior:prior,extra:current.filter(function(id){return prior.indexOf(id)<0;}).sort(),omit:omit,
      pair:FB.techHistoricalWindow(mixed,'qanat_construction','review'),research:FBDATA.tech.geometry.fx.research};
  },ids);
  expect(r.extra).toEqual(['aqueduct_maintenance','cistern_engineering','geometry']);expect(r.research).toBe(0.1);
  expect(r.omit).not.toContain('aqueduct_maintenance');expect(r.omit).toContain('cistern_engineering');
  expect(r.pair).toMatchObject({emergence:-200,widespread:400});
});

test('retained partial research is never reseeded and each new project pays its actual price',async function({page},info){
  await start(page,info,'supplied');
  const saved=await page.evaluate(function(){
    const s=FB.state,pid=s.player.provinceId;s.player.tier=4;s.player.provs=[pid];s.player.gold=10000;
    s.owner[pid]=s.holder[pid]='player';FB.foundPlayerRealm(s);s.realms.player.liege=null;
    s.realmTech.player={completed:['lime_mortar','irrigation_channels','geometry','arithmetic'],exposed:[],active:['scriptoria'],progress:{scriptoria:7},reserve:3,priorities:{},historicalSeeded:1};
    s.date.year=1300;FB.invalidateTechBonuses();return {record:JSON.stringify(s.realmTech.player),save:FB.save.serialize()};
  });
  await restoreBookmark(page,saved.save);
  const r=await page.evaluate(function(input){
    const s=FB.state,rec=s.realmTech.player,retained=JSON.stringify(rec),before=JSON.stringify([s.buildings,s.population,s.player.gold]);
    rec.active=[];rec.reserve=0;
    const rows=input.map(function(id){const started=FB.selectTechProject(s,id),price=FB.techCost(s,id);FB.addResearch(s,price-1);
      const pending=!FB.hasTech(s,id);FB.addResearch(s,1);return {started:started,pending:pending,done:FB.hasTech(s,id)};});
    return {retained:retained,rows:rows,unchanged:before===JSON.stringify([s.buildings,s.population,s.player.gold]),partial:rec.progress.scriptoria};
  },ids);
  expect(r.retained).toBe(saved.record);expect(r.rows).toEqual(ids.map(function(){return {started:true,pending:true,done:true};}));
  expect(r.unchanged).toBe(true);expect(r.partial).toBe(7);
});


test('new construction protects knowledge, actual input and prospective paid service before any charge',async function({page},info){
  await start(page,info,'supplied');
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,R=FB.siteResources,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    return [function(t){t.realmTech[FB.techRealmId(t,who.id)].completed=[];FB.invalidateTechBonuses();},
      function(t){R.commit(t,R.quote(t,{operation:'reserve',sourceId:a.sourceId,actor:who,amount:12}));},
      function(t){t.date.year=650;},function(t){t.realms[who.id].treasury.gold=0;}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      const ready=FB.aiCanBuildAt(t,who.id,a.countyId,a.slot,a.buildingId),built=FB.buildRealm(t,who.id,a.countyId,a.slot,a.buildingId);
      return !ready&&!built&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  });
  expect(r).toEqual(Array(4).fill(true));
});


test('funded retained conveyance operates beyond its construction window and suspends on live loss without deleting property',async function({page},info){
  await start(page,info,'supplied');await build(page);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.date.year=1066;s.realmTech[FB.techRealmId(s,who.id)].completed=[];FB.invalidateTechBonuses();
    const q=O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}),worked=O.commit(s,q);
    const changes=[function(t){t.buildings[a.countyId].find(function(b){return b.id===a.buildingId;}).ruined=true;},
      function(t){t.occupier[a.countyId]='other';},function(t){t.holder.resource_quay='other';},
      function(t){t.chars[FB.political.actor(t,who).characterId].captive=true;},function(t){t.turn=q.untilTurn;}];
    const stopped=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);
      return FB.countyBuildingCapacityBonus(t,a.countyId)===0&&before===JSON.stringify(t)&&t.buildings[a.countyId].length===3;});
    return {worked:worked,active:FB.countyBuildingCapacityBonus(s,a.countyId),stopped:stopped,
      constructionBlocked:!FB.buildingApplicabilityStatus(s,a.countyId,a.buildingId,who).ready};
  });
  expect(r).toEqual({worked:true,active:0.03,stopped:Array(5).fill(true),constructionBlocked:true});
});
