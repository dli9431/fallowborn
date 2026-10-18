'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {bootInputs,prepareInputs}=require('../support/game/water-operation-inputs');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={river:require('../fixtures/authoring/baths-headworks-river.json'),upland:require('../fixtures/authoring/baths-headworks-upland.json')};
const ids=['hypocaust_heating','diversion_dams'];
const traditions=['default','latin','byzantine','islamic','persianate','slavic','nordic','steppe','baltic_finnic','caucasian','northeast_african'];
dependsOnRuntime(__filename,['index.html','data/technology.js','data/technology_baths_headworks.js','data/buildings_baths_headworks.js',
  'data/production.js','data/building_operations.js','data/building_profiles.js','data/buildings_waterworks.js','data/technology_waterworks.js',
  'data/bookmarks.js','data/cultures.js','data/eras.js','js/building_operations.js','js/building_profiles.js','js/production.js',
  'js/production_economy.js','js/building_seasons.js','js/site_resources.js','js/actions.js','js/world.js','js/lordships.js',
  'js/treasury.js','js/population.js','js/mods.js','js/technology.js','js/save.js','js/save_v4.js','js/ui_modals.js']);
async function start(page,info,kind,revision){
  let custom;
  if(revision){custom=JSON.parse(JSON.stringify(examples[kind]));Object.values(custom.bookmarks)[0].revision=revision;}
  return bootInputs(page,info,kind,'baths-headworks',custom);
}
async function buildBath(page,heated){
  return page.evaluate(function(heated){
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[heated?1:0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    const profile=heated?'hypocaust_bath':null,cost=FB.buildCost(s,a.countyId,'public_bath',who.id,profile),gold=s.realms[who.id].treasury.gold;
    const before=JSON.stringify([s.population,s.dev]),built=FB.buildRealm(s,who.id,a.countyId,a.slot,'public_bath',0,profile);
    return {built:built,cost:cost,paid:gold-s.realms[who.id].treasury.gold,people:before===JSON.stringify([s.population,s.dev]),
      idle:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),remote:s.player.provinceId!==a.countyId};
  },heated);
}
test('catalogue adds exactly two optional discoveries and facilities while preserving every existing definition',async function({page},info){
  await page.addInitScript(function(){
    window.FBDATA=window.FBDATA||{};
    ['tech_baths_headworks','buildings_baths_headworks'].forEach(function(key){
      Object.defineProperty(FBDATA,key,{configurable:true,set:function(value){
        window[key+'_before']=JSON.parse(JSON.stringify(key==='tech_baths_headworks'?FBDATA.tech:FBDATA.buildings));
        Object.defineProperty(this,key,{configurable:true,enumerable:true,writable:true,value:value});
      }});
    });
  });
  await openGame(page,info);
  const r=await page.evaluate(function(){
    const tech=JSON.parse(JSON.stringify(FBDATA.tech)),buildings=JSON.parse(JSON.stringify(FBDATA.buildings));
    Object.keys(FBDATA.tech_baths_headworks).forEach(function(k){delete tech[k];});
    Object.keys(FBDATA.buildings_baths_headworks).forEach(function(k){delete buildings[k];});
    return {tech:tech,beforeTech:window.tech_baths_headworks_before,buildings:buildings,beforeBuildings:window.buildings_baths_headworks_before,
      defs:FBDATA.tech_baths_headworks,works:FBDATA.buildings_baths_headworks,profile:FBDATA.buildingProfiles.hypocaust_bath,
      reviews:['public_bathing_facility','heated_bathing','engineered_headworks'].map(function(k){return FBDATA.techImpactReviews.features[k];}),
      errors:FB.validateTechnologyData(true).concat(FB.validateBuildingData(FBDATA.buildings,true),FB.buildingProfiles.catalogFaults(FBDATA),FB.buildingOperations.catalogFaults(FBDATA)),
      sources:Array.from(document.scripts).map(function(s){return s.getAttribute('src');}).filter(Boolean)};
  });
  expect(r.errors).toEqual([]);expect(r.tech).toEqual(r.beforeTech);expect(r.buildings).toEqual(r.beforeBuildings);
  const pairs=[[[600,1100],[1,400],[1,500],[500,850],[300,850],[800,1150],[850,1200],[850,1250],[950,1300],[300,900],[100,700]],
    [[400,1050],[1,650],[1,600],[-500,400],[200,450],[700,1100],[850,1200],[800,1150],[900,1250],[200,800],[1,600]]];
  ids.forEach(function(id,i){expect(traditions.map(function(t){return r.defs[id].history.adoption[t];})).toEqual(pairs[i]);expect(r.defs[id]).toMatchObject({cost:i?50:20,fx:{},capabilities:[]});});
  expect(r.defs.hypocaust_heating).toMatchObject({req:['lime_mortar'],unlocks:[],history:{attested:[-100,600]}});
  expect(r.defs.diversion_dams).toMatchObject({req:['irrigation_channels','lime_mortar'],unlocks:['building:diversion_headworks'],history:{attested:[-500,600]}});
  expect(r.works.public_bath).toMatchObject({cost:65,upkeep:2,devMin:4,maxCounty:1,settlementDraw:false,dev:0,pop:0,prestige:0,migrationAttraction:0.5,aiBuildOrder:26,requiresTech:'lime_mortar'});
  expect(r.works.diversion_headworks).toMatchObject({cost:75,upkeep:2,devMin:2,maxCounty:1,populationCapacity:0.02,aiBuildOrder:29});
  expect(r.profile).toMatchObject({buildingId:'public_bath',replace:{cost:80,upkeep:2,devMin:4,migrationAttraction:1},requiresTech:['hypocaust_heating'],inheritance:'retain'});
  r.reviews.forEach(function(v){expect(v.mode).toBe('hard');expect(v.fallback.length).toBeGreaterThan(12);});
  expect(r.sources.indexOf('data/technology_baths_headworks.js')).toBeGreaterThan(r.sources.indexOf('data/technology_waterworks.js'));
  expect(r.sources.indexOf('data/buildings_baths_headworks.js')).toBeGreaterThan(r.sources.indexOf('data/building_profiles.js'));
});
for(const kind of ['river','upland'])for(const heated of [false,true]){
  test(kind+' '+(heated?'heated':'unheated')+' bath pays for one asset and one finite replacement benefit',async function({page},info){
    await start(page,info,kind);if(heated)await prepareInputs(page,1);
    const built=await buildBath(page,heated);expect(built).toMatchObject({built:true,people:true,idle:0});expect(built.paid).toBeCloseTo(built.cost,8);
    const r=await page.evaluate(function(heated){
      const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[heated?1:0],who=FB.settlementHolder(s,a.countyId,a.slot);
      const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who},q=O.quote(s,req),gold=s.realms[who.id].treasury.gold,privateGold=s.player.gold;
      const population=JSON.stringify(s.population),worked=O.commit(s,q),again=O.commit(s,q),record=s.buildings[a.countyId].find(function(b){return b.id==='public_bath';});
      const before=JSON.stringify([s.production,s.buildingOperations,s.siteResources,s.buildings]),active=FB.buildingBonusIn(s,a.countyId,'migrationAttraction');
      const noOther=['health','populationCapacity','populationFamineProtection','populationCrisisProtection','research','tax'].every(function(k){return !(O.effects(s,a.countyId,record)[k]);});
      const review=O.reason(q),valid=FB.production.validate(s)&&O.validate(s);FB.save.restore(JSON.parse(FB.save.serialize()));const t=FB.state;
      const matching=before===JSON.stringify([t.production,t.buildingOperations,t.siteResources,t.buildings]);
      t.turn=q.untilTurn;FB.invalidateBuildingIndex(t,a.countyId);
      return {worked:worked,again:again,active:active,paid:gold-s.realms[who.id].treasury.gold,cost:q.cost,noOther:noOther,valid:valid,matching:matching,
        private:privateGold===s.player.gold,population:population===JSON.stringify(t.population),records:s.buildings[a.countyId].filter(function(b){return b.id==='public_bath';}).length,
        ended:FB.buildingBonusIn(t,a.countyId,'migrationAttraction'),upkeep:FB.buildingBonusAt(t,a.countyId,a.slot,'upkeep'),
        stock:s.production.lots.filter(function(l){return l.goodId==='heating_fuel';}).reduce(function(n,l){return n+l.remaining;},0),
        materialReview:!heated||review.indexOf('Prepared heating fuel')>=0};
    },heated);
    expect(r).toMatchObject({worked:true,again:false,active:heated?1:0.5,noOther:true,valid:true,matching:true,private:true,population:true,records:1,ended:0,stock:0,materialReview:true});
    expect(r.paid).toBeCloseTo(r.cost,8);
  });
}
for(const kind of ['river','upland']){
  test(kind+' actual downstream use consumes its own water and cannot stack the conveyance demand',async function({page},info){
    await start(page,info,kind);
    const r=await page.evaluate(function(kind){
      const s=FB.state,O=FB.buildingOperations,rows=O.compile(FB.campaignBookmark(s)).assignments,a=rows[2],who=FB.settlementHolder(s,a.countyId,a.slot);
      s.realms[who.id].treasury.gold=10000;
      const built=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId),bath=FB.buildRealm(s,who.id,a.countyId,a.slot,'public_bath');
      const aqueduct=kind==='river'?FB.buildRealm(s,who.id,a.countyId,a.slot,'aqueduct'):false;
      function req(a){return {countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};}
      const q=O.quote(s,req(a)),paid=O.commit(s,q),second=kind==='river'?O.quote(s,req(rows[3])).allowed:false;
      const waterBefore=FB.siteResources.snapshot(s).find(function(v){return v.id===a.sourceId;}).consumed;
      const bathed=O.commit(s,O.quote(s,req(rows[0]))),waterAfter=FB.siteResources.snapshot(s).find(function(v){return v.id===a.sourceId;}).consumed;
      const source=FB.siteResources.compile(FB.campaignBookmark(s)).sources.find(function(v){return v.id===a.sourceId;});
      return {built:built,bath:bath,aqueduct:aqueduct,paid:paid,second:second,bathed:bathed,waterBefore:waterBefore,waterAfter:waterAfter,
        downstream:source.siteId!==a.siteId&&a.stores.length>0,capacity:FB.countyBuildingCapacityBonus(s,a.countyId),attraction:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),valid:O.validate(s)};
    },kind);
    expect(r).toMatchObject({built:true,bath:true,aqueduct:kind==='river',paid:true,second:false,bathed:true,waterBefore:2,waterAfter:4,downstream:true,capacity:0.02,attraction:0.5,valid:true});
  });
}
test('missing heating knowledge or fuel leaves unheated investment available and paid reserved fuel cannot be reused',async function({page},info){
  await start(page,info,'river');await prepareInputs(page,1);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,P=FB.production,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    const stored=s.realmTech[FB.techRealmId(s,who.id)].completed.slice();s.realmTech[FB.techRealmId(s,who.id)].completed=stored.filter(function(k){return k!=='hypocaust_heating';});FB.invalidateTechBonuses();
    const missing=!FB.buildRealm(s,who.id,a.countyId,a.slot,'public_bath',0,'hypocaust_bath');
    const plain=FB.buildingProfiles.aiChoices(s,who,a.countyId,a.slot,'public_bath').some(function(v){return !v.profileId;});
    s.realmTech[FB.techRealmId(s,who.id)].completed=stored;FB.invalidateTechBonuses();
    const built=FB.buildRealm(s,who.id,a.countyId,a.slot,'public_bath',0,'hypocaust_bath'),row=P.snapshot(s)[0];
    const reserved=P.commit(s,P.aiQuote(s,row.site.id,'reserve',{recipeId:'use_service_fuel',disposition:'store'}));
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who},before=JSON.stringify(s),q=O.quote(s,req);
    const pure=!q.allowed&&!O.commit(s,q)&&before===JSON.stringify(s);
    const released=P.commit(s,P.aiQuote(s,row.site.id,'cancel',{batchId:reserved})),worked=O.commit(s,O.quote(s,req));
    const until=s.buildingOperations.receipts[s.buildings[a.countyId].find(function(b){return b.id==='public_bath';}).waterOperation.id].untilTurn;
    s.turn=until;FB.invalidateBuildingIndex(s,a.countyId);
    return {missing:missing,plain:plain,built:built,reserved:!!reserved,pure:pure,released:released,worked:worked,renewal:O.quote(s,req).allowed,ended:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),valid:P.validate(s)};
  });
  expect(r).toEqual({missing:true,plain:true,built:true,reserved:true,pure:true,released:true,worked:true,renewal:false,ended:0,valid:true});
});
test('AI chooses one useful bath alternative, preserves public reserves and debits no household money',async function({page},info){
  await start(page,info,'upland');await prepareInputs(page,1);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot),privateGold=s.player.gold;
    const choices=FB.buildingProfiles.aiChoices(s,who,a.countyId,a.slot,'public_bath');
    const built=FB.buildRealm(s,who.id,a.countyId,a.slot,'public_bath',0,choices[0].profileId),rich=s.realms[who.id].treasury.gold;
    s.realms[who.id].treasury.gold=0;const noFunds=O.runAI(s);s.realms[who.id].treasury.gold=rich;
    const count=O.runAI(s),repeat=O.runAI(s);
    return {choice:choices[0].profileId,built:built,noFunds:noFunds,count:count,repeat:repeat,private:privateGold===s.player.gold,amount:FB.buildingBonusIn(s,a.countyId,'migrationAttraction')};
  });
  expect(r).toEqual({choice:'hypocaust_bath',built:true,noFunds:0,count:1,repeat:0,private:true,amount:1});
});
test('construction scope is inclusive through 649/650 and 1300/1301 without granting a local source',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const dates=[475,476,649,650,867,1066,1300,1301].map(function(year){const t=JSON.parse(JSON.stringify(s));t.date.year=year;
      return ['public_bath','diversion_headworks'].map(function(id){return FB.buildingApplicabilityStatus(t,a.countyId,id,who).ready;});});
    const wrong=JSON.parse(JSON.stringify(s));wrong.realms[FB.techRealmId(wrong,who.id)].techTraditions=['nordic'];
    return {dates:dates,tradition:FB.buildingApplicabilityStatus(wrong,a.countyId,'diversion_headworks',who).ready,ordinary:FB.buildingApplicabilityStatus(wrong,a.countyId,'public_bath',who).ready,
      noWater:s.siteResources===undefined,noBath:!s.buildings[a.countyId].some(function(b){return b.id==='public_bath';})};
  });
  expect(r).toEqual({dates:[[false,false],[true,true],[true,true],[true,true],[true,true],[true,true],[true,true],[false,false]],tradition:false,ordinary:true,noWater:true,noBath:true});
});
for(const year of [867,1066]){
  test(year+' fresh completions and omissions use the effective graph without changing retained ids',async function({page},info){
    await openGame(page,info);
    const r=await page.evaluate(function(input){
      const table=FBDATA.tech;
      return input.traditions.map(function(tradition){
        function seed(remove,omit){const s={start:{era:'early_medieval'},date:{year:input.year,season:0,day:1},realms:{review:{alive:true,techTraditions:[tradition==='default'?'latin':tradition],techSeed:{omit:omit||[]}}},realmTech:{}};
          try{FBDATA.tech=JSON.parse(JSON.stringify(table));input.ids.forEach(function(id){if(remove)delete FBDATA.tech[id];else if(tradition==='default')FBDATA.tech[id].history.adoption={default:table[id].history.adoption.default};});FB.seedRealmTechnologies(s,true);return s.realmTech.review;}
          finally{FBDATA.tech=table;FB.invalidateTechBonuses();}}
        const current=seed(false),old=seed(true),omit=seed(false,['lime_mortar']);
        return {tradition:tradition,done:current.completed.filter(function(id){return input.ids.includes(id);}).sort(),exposed:current.exposed.filter(function(id){return input.ids.includes(id);}).sort(),retained:current.completed.filter(function(id){return !input.ids.includes(id);}).sort(),old:old.completed.sort(),omit:omit.completed};
      });
    },{year:year,traditions:traditions,ids:ids});
    for(const row of r){let done=[];
      if(['latin','byzantine','islamic','persianate','northeast_african'].includes(row.tradition))done=ids;
      else if(row.tradition==='caucasian')done=year===867?['diversion_dams']:ids;
      else if(row.tradition==='default'&&year===1066)done=['diversion_dams'];
      expect(row.done).toEqual(done.slice().sort());expect(row.retained).toEqual(row.old);
      expect(row.exposed).toEqual(year===867&&row.tradition==='baltic_finnic'?[]:ids.slice().sort());
      ids.forEach(function(id){expect(row.omit).not.toContain(id);});
    }
  });
}
test('ordinary imports reject malformed inputs, wrong river routes, duplicated demand and scenery before publication',async function({page},info){
  await openGame(page,info);
  const r=await page.evaluate(function(example){
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),uid=FB.getUidCounter(),rng=FB.getRngState();
    const valid=FB.mods.validate(example),invalid=[function(m,b){b.siteResourceAssignments[0].suitability.river=false;},
      function(m,b){b.buildingOperationAssignments[2].stores=[];},function(m,b){b.buildingOperationAssignments[3].demandId='duplicate_demand';},
      function(m,b){b.buildingOperationAssignments[2].countyId='resource_rocks';},
      function(m){m.buildingOperationProfiles={bad_inputs:{mode:'use',amount:1,periodDays:7,workCost:1,effect:'migrationAttraction',inputs:[{goodId:'missing_fuel',quantity:-1}]}};}
    ].map(function(change){const m=JSON.parse(JSON.stringify(example));change(m,m.bookmarks.resource_river.revisions.supplied);return FB.mods.validate(m).length>0;});
    return {valid:valid,invalid:invalid,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&uid===FB.getUidCounter()&&rng===FB.getRngState()};
  },examples.river);
  expect(r).toEqual({valid:[],invalid:[true,true,true,true,true],pure:true});
});

test('retained inherited heated ruins repair beyond the construction window without knowledge, water or free fuel',async function({page},info){
  await start(page,info,'river','ruined');
  const r=await page.evaluate(function(){
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[1],pid=a.countyId;
    FB.setPlayerTier(s,4,{stationFarewell:false});s.player.provs=[pid];s.owner[pid]=s.holder[pid]='player';s.player.gold=10000;
    FB.foundPlayerRealm(s);FB.rememberSettlementSites(s,pid);
    for(let slot=1;slot<FB.settlementVisibleCount(s,pid);slot++)FB.assignSettlementLordship(s,pid,slot,s.player.charId);
    FB.invalidateSettlementLordships(s);FB.invalidateBuildingIndex(s,pid);s.date.year=1301;
    s.realmTech.player={completed:[],exposed:[],active:[],progress:{},reserve:0,priorities:{},historicalSeeded:1};FB.invalidateTechBonuses();
    const b=s.buildings[pid].find(function(b){return b.id==='public_bath';}),stamp=JSON.stringify(b.buildingProfile),dev=s.dev[pid],gold=s.player.gold;
    const q=FB.repairBuildingStatus(s,pid,b.s,b.id),repaired=FB.repairBuilding(s,pid,b.s,b.id,q.cost),again=FB.repairBuilding(s,pid,b.s,b.id,q.cost);
    return {ready:q.ready,repaired:repaired,again:again,cost:q.cost,paid:gold-s.player.gold,dev:s.dev[pid]-dev,granted:b.devGranted,
      identity:stamp===JSON.stringify(b.buildingProfile),idle:FB.buildingBonusIn(s,pid,'migrationAttraction'),noWater:s.siteResources===undefined,
      noFuel:s.production.lots.every(function(l){return l.goodId!=='heating_fuel';}),construction:FB.buildingApplicabilityStatus(s,pid,'public_bath').ready};
  });
  expect(r).toMatchObject({ready:true,repaired:true,again:false,dev:0,granted:0,identity:true,idle:0,noWater:true,noFuel:true,construction:false});expect(r.paid).toBeCloseTo(r.cost,8);expect(r.cost).toBeGreaterThan(32.5);
});
test('private construction and unheated service debit the household rather than a foreign public treasury',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(){
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[0],pid=a.countyId;
    const old=FB.settlementHolder(s,pid,a.slot),treasury=s.realms[old.id].treasury.gold;
    FB.setPlayerTier(s,4,{stationFarewell:false});s.player.provs=[pid];s.owner[pid]=s.holder[pid]='player';s.player.gold=10000;
    FB.foundPlayerRealm(s);FB.rememberSettlementSites(s,pid);FB.invalidateSettlementLordships(s);FB.invalidateBuildingIndex(s,pid);
    s.realmTech.player={completed:['lime_mortar'],exposed:['lime_mortar'],active:[],progress:{},reserve:0,priorities:{},historicalSeeded:1};FB.invalidateTechBonuses();
    const gold=s.player.gold,cost=FB.buildCost(s,pid,'public_bath'),built=FB.build(s,pid,a.slot,'public_bath');
    const q=FB.buildingOperations.quote(s,{countyId:pid,settlement:a.slot,buildingId:'public_bath',actor:FB.settlementActor(s)}),worked=FB.buildingOperations.commit(s,q);
    return {built:built,worked:worked,paid:gold-s.player.gold,cost:cost+q.cost,public:s.realms[old.id].treasury.gold===treasury,amount:FB.buildingBonusIn(s,pid,'migrationAttraction')};
  });
  expect(r).toMatchObject({built:true,worked:true,public:true,amount:0.5});expect(r.paid).toBeCloseTo(r.cost,8);
});
test('paid heat suspends on live authority or water loss while preserving property and exact spent materials',async function({page},info){
  await start(page,info,'river');await prepareInputs(page,1);await buildBath(page,true);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};if(!O.commit(s,O.quote(s,req)))throw new Error('Paid heat required');
    const source=FB.siteResources.compile(FB.campaignBookmark(s)).sources.find(function(v){return v.id===a.sourceId;});
    const stopped=[function(t){t.occupier[a.countyId]='other';},function(t){t.holder[source.countyId]='other';},
      function(t){t.chars[FB.political.actor(t,who).characterId].captive=true;},
      function(t){t.buildings[a.countyId].find(function(b){return b.id==='public_bath';}).ruined=true;}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);return FB.buildingBonusIn(t,a.countyId,'migrationAttraction')===0&&before===JSON.stringify(t)&&t.production.waterInputs.records.length===1&&t.buildings[a.countyId].some(function(b){return b.id==='public_bath';});});
    return {stopped:stopped,active:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),fuel:s.production.lots.filter(function(l){return l.goodId==='heating_fuel';}).reduce(function(n,l){return n+l.remaining;},0)};
  });
  expect(r).toEqual({stopped:[true,true,true,true],active:1,fuel:0});
});
test('renewed heat preserves both historical debits and strict saved provenance rejects reused fuel or missing owners',async function({page},info){
  await start(page,info,'river');await prepareInputs(page,2);await buildBath(page,true);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
    const first=O.commit(s,O.quote(s,req));s.turn=30;FB.invalidateBuildingIndex(s,a.countyId);const second=O.commit(s,O.quote(s,req)),valid=FB.production.validate(s)&&O.validate(s);
    const changes=[function(t){delete t.production.waterInputs;},function(t){t.production.waterInputs.records[0].inputs[0].quantity++;},
      function(t){const x=t.production.waterInputs.records[0].inputs[0];t.production.lots.find(function(l){return l.id===x.lotId;}).remaining++;},
      function(t){t.production.waterInputs.records[0].turn=0;},function(t){t.production.waterInputs.records[1].operationRevision=t.production.waterInputs.records[0].operationRevision;},
      function(t){delete t.buildingOperations;},function(t){t.production.revision++;}
    ].map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);let rejected=false;try{FB.production.validate(t);O.validate(t);}catch(e){rejected=true;}return rejected&&before===JSON.stringify(t);});
    const before=JSON.stringify([s.production,s.buildingOperations,s.siteResources,s.buildings]);FB.save.restore(JSON.parse(FB.save.serialize()));const t=FB.state;
    return {first:first,second:second,valid:valid,count:t.production.waterInputs.records.length,changes:changes,matching:before===JSON.stringify([t.production,t.buildingOperations,t.siteResources,t.buildings])};
  });
  expect(r).toEqual({first:true,second:true,valid:true,count:2,changes:[true,true,true,true,true,true,true],matching:true});
});
test('matching retained knowledge preserves an existing partial project and new research pays its exact cost',async function({page},info){
  await start(page,info,'river');
  const r=await page.evaluate(function(ids){
    const s=FB.state,pid=s.player.provinceId;s.player.tier=4;s.player.provs=[pid];s.player.gold=10000;s.owner[pid]=s.holder[pid]='player';FB.foundPlayerRealm(s);s.realms.player.liege=null;
    s.realmTech.player={completed:['lime_mortar','irrigation_channels'],exposed:[],active:['scriptoria'],progress:{scriptoria:7},reserve:3,priorities:{},historicalSeeded:1};
    s.date.year=1300;FB.invalidateTechBonuses();const record=JSON.stringify(s.realmTech.player);FB.save.restore(JSON.parse(FB.save.serialize()));const t=FB.state;
    const retained=record===JSON.stringify(t.realmTech.player),before=JSON.stringify([t.population,t.buildings,t.production,t.player.gold]);
    t.realmTech.player.active=[];t.realmTech.player.reserve=0;
    const rows=ids.map(function(id){const started=FB.selectTechProject(t,id),cost=FB.techCost(t,id);FB.addResearch(t,cost-1);const pending=!FB.hasTech(t,id);FB.addResearch(t,1);return {started:started,pending:pending,done:FB.hasTech(t,id)};});
    return {retained:retained,rows:rows,partial:t.realmTech.player.progress.scriptoria,unchanged:before===JSON.stringify([t.population,t.buildings,t.production,t.player.gold])};
  },ids);
  expect(r).toEqual({retained:true,rows:[{started:true,pending:true,done:true},{started:true,pending:true,done:true}],partial:7,unchanged:true});
});
test('heating technology discovers its real profile and water review names exact fuel without inventing an unlock',async function({page},info){
  await start(page,info,'river');await prepareInputs(page,1);await buildBath(page,true);
  await page.evaluate(function(){FB.ui.showTechDetail('hypocaust_heating');});
  await expect(page.locator('#gm-body')).toContainText('Heated Public Bath');
  expect(await page.evaluate(function(){const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1];return O.reason(O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:FB.settlementHolder(s,a.countyId,a.slot)}));})).toContain('1 Prepared heating fuel');
});

test('standing inherited heat operates after construction scope ends without reseeding or a new research gate',async function({page},info){
  await start(page,info,'river','standing');await prepareInputs(page,1);
  const r=await page.evaluate(function(){
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot),b=s.buildings[a.countyId].find(function(b){return b.id==='public_bath';});
    s.date.year=1301;s.realmTech[FB.techRealmId(s,who.id)].completed=[];FB.invalidateTechBonuses();
    const before=JSON.stringify([s.population,s.dev,b.buildingProfile]),worked=O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}));
    return {worked:worked,amount:FB.buildingBonusIn(s,a.countyId,'migrationAttraction'),preserved:before===JSON.stringify([s.population,s.dev,b.buildingProfile]),
      blocked:!FB.buildingApplicabilityStatus(s,a.countyId,'public_bath',who).ready,valid:FB.production.validate(s)&&O.validate(s)};
  });
  expect(r).toEqual({worked:true,amount:1,preserved:true,blocked:true,valid:true});
});
