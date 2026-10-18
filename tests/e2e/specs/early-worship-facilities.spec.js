'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/early-worship-river.json'),
  upland:require('../fixtures/authoring/early-worship-upland.json')};
dependsOnRuntime(__filename,['index.html','data/buildings_early_worship.js','data/building_profiles.js',
  'data/building_institutions.js','data/technology.js','data/map_data.js','data/buildings_learning_care.js',
  'data/religious_institutions.js','data/religious_activities.js','data/political_institutions.js',
  'js/building_profiles.js','js/building_institutions.js','js/building_operations.js','js/building_seasons.js',
  'js/fortifications.js','js/actions.js','js/world.js','js/technology.js','js/lordships.js','js/treasury.js',
  'js/institutions.js','js/religious_institutions.js','js/religious_activities.js','js/abbeys.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/model.js','js/population.js',
  'js/ui_modals.js','js/ui_misc.js','data/cultures.js','data/eras.js']);

async function start(page,info,label,npc) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/early-worship-' + label + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FBDATA.buildings.monastic_house; });
  const world = label === 'river' ? 'inventory_estuary' : 'inventory_uplands';
  await beginBookmark(page,info,world,world + '_household');
  await page.evaluate(function (input) {
    const s = FB.state;
    window.worship = input.label === 'river' ? {
      see:['inventory_quay',0,'binding_institution','binding_bishop'],
      congregation:['inventory_quay',1,'worship_congregation'],house:['inventory_marsh',0,'worship_monastery']
    } : {see:['inventory_pass',0,'worship_see','worship_bishop'],
      congregation:['inventory_well',0,'worship_congregation'],house:['inventory_vale',0,'binding_institution']};
    s.player.gold = 10000; s.player.travel = null; s.player.manor = null;
    const counties = Object.keys(s.holder).filter(function (pid) { return FB.world.byId[pid] && !FB.world.byId[pid].wasteland; });
    if (!input.npc) {
      FB.setPlayerTier(s,4,{stationFarewell:false}); s.player.provs = counties;
      counties.forEach(function (pid) { s.owner[pid] = s.holder[pid] = 'player'; });
      FB.foundPlayerRealm(s);
      counties.forEach(function (pid) {
        FB.rememberSettlementSites(s,pid);
        for (let slot=1;slot<FB.settlementVisibleCount(s,pid);slot++) FB.assignSettlementLordship(s,pid,slot,s.player.charId);
      });
      FB.invalidateSettlementLordships(s);
    }
    window.worshipKnowledge = function (enabled,realm) {
      const r = FB.realmTechRecord(s,realm);
      r.completed = r.completed.filter(function (id) { return id !== 'lime_mortar'; });
      if (enabled) r.completed.push('lime_mortar');
      counties.forEach(function (pid) { FB.invalidateBuildingIndex(s,pid); });
    };
    window.worshipRequest = function (kind,actor) {
      const site = worship[kind];
      return {countyId:site[0],settlement:site[1],buildingId:'temple',
        profileId:kind === 'see' ? 'episcopal_complex' : 'congregational_mosque',
        actor:actor || {kind:'character',id:s.player.charId}};
    };
    window.endowWorshipHouse = function () {
      const at = worship.house;
      s.player.landPlots = [{provinceId:at[0],settlement:at[1]},{provinceId:at[0],settlement:at[1]}];
      const q = FB.religiousPatronageQuote(s,'binding_foundation',s.player.charId,'foundation',
        {land:{provinceId:at[0],settlement:at[1],count:2}});
      if (!q || !q.allowed || !FB.religiousPatronageApply(s,q)) throw new Error('Real endowment rejected: ' + (q && q.reason));
    };
    worshipKnowledge(true);
    // Learning tradition deliberately differs from the Catholic payer's faith.
    s.realms[FB.techRealmId(s,FB.settlementCountyHolder(s,worship.congregation[0]))].techTraditions = ['islamic'];
  },{label:label,npc:!!npc});
}

test('catalogue adds one building and two replacement profiles without changing old worship definitions',async function ({page},info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const P = FB.buildingProfiles, keys = ['tax','dev','pop','prestige','research','levy','retinue','archers',
      'defense','siege','populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction','communityFaithPressure'];
    return {house:FBDATA.buildings.monastic_house, profiles:P.ids('temple'),
      values:['episcopal_complex','congregational_mosque'].map(function (id) {
        const d = P.definition('temple',id);
        return {cost:d.cost,upkeep:d.upkeep,devMin:d.devMin,piety:d.piety,ai:d.aiBuildOrder,zero:keys.every(function(k){return d[k]===0;})};
      }),base:[FBDATA.buildings.temple.cost,FBDATA.buildings.temple.piety,FBDATA.buildings.temple.pop,
        FBDATA.buildings.cathedral.cost,FBDATA.buildings.cathedral.piety],
      noExtraIds:!FBDATA.buildings.episcopal_complex&&!FBDATA.buildings.congregational_mosque,
      reviews:['building_monastic_house','building_episcopal_complex','building_congregational_mosque'].map(function(id){return FBDATA.techImpactReviews.features[id].mode;}),
      faults:P.catalogFaults(FBDATA).concat(FB.buildingInstitutionCatalogFaults(FBDATA),FB.validateTechnologyData(true))};
  });
  expect(r.house).toMatchObject({role:'worship',cost:60,upkeep:1,devMin:2,piety:1,maxCounty:1,
    aiBuildOrder:28,settlementDraw:false,applicability:{yearMin:476,yearMax:1300}});
  expect(r.house.requiresTech).toBeUndefined();
  expect(r.profiles).toEqual(['congregational_mosque','episcopal_complex']);
  expect(r.values).toEqual([{cost:100,upkeep:2,devMin:4,piety:1,ai:27,zero:true},{cost:90,upkeep:2,devMin:4,piety:2,ai:27,zero:true}]);
  expect(r.base).toEqual([70,2,5,240,4]); expect(r.noExtraIds).toBe(true);
  expect(r.reviews).toEqual(['none','hard','hard']); expect(r.faults).toEqual([]);
});

for (const label of ['river','upland']) test(label + ' imported foundations pay once and grant only their replacement piety',async function ({page},info) {
  await start(page,info,label);
  const r = await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles, before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=P.quote(s,worshipRequest('see')),pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const gold=s.player.gold,dev=JSON.stringify(s.dev),pop=JSON.stringify(s.population),people=JSON.stringify(s.chars),
      institutions=JSON.stringify(s.localInstitutions),heads=JSON.stringify(s.religiousHeads),knowledge=JSON.stringify(s.realmTech);
    const built=P.commit(s,q),repeat=P.commit(s,q),b=s.buildings[worship.see[0]].find(function(b){return b.s===worship.see[1]&&b.id==='temple';});
    return {pure:pure,built:built,repeat:repeat,paid:gold-s.player.gold,quote:q.cost,
      profile:b.buildingProfile.id,base:b.id,payer:b.institutionBinding.payer,
      correctPayer:b.institutionBinding.payer.id===s.player.charId,
      piety:FB.buildingBonusAt(s,worship.see[0],worship.see[1],'piety'),upkeep:FB.buildingBonusAt(s,worship.see[0],worship.see[1],'upkeep'),
      noAwards:dev===JSON.stringify(s.dev)&&pop===JSON.stringify(s.population),
      noInstitutionOrPeople:institutions===JSON.stringify(s.localInstitutions)&&heads===JSON.stringify(s.religiousHeads)&&people===JSON.stringify(s.chars),
      noResearch:knowledge===JSON.stringify(s.realmTech)};
  });
  expect(r).toMatchObject({pure:true,built:true,repeat:false,profile:'episcopal_complex',base:'temple',
    correctPayer:true,piety:1,upkeep:2,noAwards:true,noInstitutionOrPeople:true,noResearch:true});
  expect(r.paid).toBe(r.quote); expect(r.payer.kind).toBe('character');
});

for (const label of ['river','upland']) test(label + ' monastic premises require an actual endowed property and leave its account and members intact',async function ({page},info) {
  await start(page,info,label);
  const r = await page.evaluate(function () {
    const s=FB.state,at=worship.house;
    worshipKnowledge(false);
    const missing=FB.buildingInstitutionQuote(s,at[0],at[1],'monastic_house');
    const snapshot=JSON.stringify(s),refused=!FB.buildingInstitutionApply(s,missing)&&snapshot===JSON.stringify(s);
    const gold=s.player.gold;endowWorshipHouse();const endowment=gold-s.player.gold;
    const property=JSON.stringify(s.abbeys),members=JSON.stringify(s.localInstitutions),people=JSON.stringify(s.chars),price=s.player.gold;
    const q=FB.buildingInstitutionQuote(s,at[0],at[1],'monastic_house'),built=FB.buildingInstitutionApply(s,q);
    const b=s.buildings[at[0]].find(function(b){return b.id==='monastic_house';});
    return {refused:refused,reason:missing.reason,endowment:endowment,built:built,paid:price-s.player.gold,quote:q.cost,
      propertyUnchanged:property===JSON.stringify(s.abbeys),membershipUnchanged:members===JSON.stringify(s.localInstitutions)&&people===JSON.stringify(s.chars),
      propertyId:b.institutionBinding.propertyId,piety:FB.buildingBonusAt(s,at[0],at[1],'piety'),
      upkeep:FB.buildingBonusAt(s,at[0],at[1],'upkeep'),research:FB.buildingBonusAt(s,at[0],at[1],'research'),
      noTech:!FB.techRequirementMet(s,'lime_mortar')};
  });
  expect(r).toMatchObject({refused:true,endowment:20,built:true,propertyUnchanged:true,membershipUnchanged:true,
    propertyId:'binding_property',piety:1,upkeep:1,research:0,noTech:true});
  expect(r.reason).toContain('endowed'); expect(r.paid).toBe(r.quote);
});

test('a congregation is required independently of payer faith and national learning tradition',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.congregation;
    const wrong=Object.assign(worshipRequest('congregation'),{settlement:0}),missing=P.quote(s,wrong);
    const rulerFaith=s.chars[s.player.charId].religion,q=P.quote(s,worshipRequest('congregation'));
    const institutions=JSON.stringify(s.localInstitutions),built=P.commit(s,q);
    return {wrongSite:!missing.allowed,built:built,faith:rulerFaith,unchangedFaith:s.chars[s.player.charId].religion===rulerFaith,
      noConversion:institutions===JSON.stringify(s.localInstitutions),piety:FB.buildingBonusAt(s,at[0],at[1],'piety')};
  });
  expect(r).toEqual({wrongSite:true,built:true,faith:'catholic',unchangedFaith:true,noConversion:true,piety:2});
});

test('construction chronology, development, exact mortar and national tradition gates remain distinct',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.see;
    const years=[475,476,1300,1301].map(function(y){s.date.year=y;return FB.buildingApplicabilityStatus(s,at[0],'temple',undefined,
      Object.assign({},P.definition('temple','episcopal_complex'),{applicability:FBDATA.buildingProfiles.episcopal_complex.applicability})).ready;});
    const house=[475,476,1300,1301].map(function(y){s.date.year=y;return FB.buildingApplicabilityStatus(s,worship.house[0],'monastic_house').ready;});
    const mosque=[649,650,1300,1301].map(function(y){s.date.year=y;return FB.buildingApplicabilityStatus(s,at[0],'temple',undefined,
      Object.assign({},P.definition('temple','congregational_mosque'),{applicability:FBDATA.buildingProfiles.congregational_mosque.applicability})).ready;});
    s.date.year=900;worshipKnowledge(false);const q=P.quote(s,worshipRequest('see')),snapshot=JSON.stringify(s);
    const blocked=!P.commit(s,q)&&snapshot===JSON.stringify(s);worshipKnowledge(true);
    s.dev[at[0]]=3;FB.invalidateBuildingIndex(s,at[0]);const low=!P.quote(s,worshipRequest('see')).allowed;
    s.dev[at[0]]=4;FB.invalidateBuildingIndex(s,at[0]);const enough=P.quote(s,worshipRequest('see')).allowed;
    s.realms.player.techTraditions=['latin'];const tradition=!P.quote(s,worshipRequest('congregation')).allowed;
    return {years:years,house:house,mosque:mosque,blocked:blocked,reason:q.reason,low:low,enough:enough,tradition:tradition};
  });
  expect(r).toMatchObject({years:[false,true,true,false],house:[false,true,true,false],mosque:[false,true,true,false],blocked:true,low:true,enough:true,tradition:true});
  expect(r.reason).toContain('Lime Mortar');
});

test('bound worship and ruins block ordinary temple, cathedral and monastic reuse in both directions',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.see;
    const built=P.commit(s,P.quote(s,worshipRequest('see'))),gold=s.player.gold;
    const occupied=['temple','cathedral','monastic_house'].map(function(id){return !FB.buildingInstitutionStatus(s,at[0],at[1],id).allowed;});
    s.buildings[at[0]][0].ruined=true;FB.invalidateBuildingIndex(s,at[0]);
    const ruin=!FB.build(s,at[0],at[1],'temple'),other=P.commit(s,P.quote(s,worshipRequest('congregation')));
    const removed=FB.demolishBuilding(s,at[0],at[1],'temple'),ordinary=FB.build(s,at[0],at[1],'temple');
    const reverse=!P.quote(s,worshipRequest('see')).allowed;
    return {built:built,occupied:occupied,ruin:ruin,other:other,removed:removed,ordinary:ordinary,reverse:reverse,
      noDouble:FB.buildingBonusAt(s,at[0],at[1],'piety')===2,spent:s.player.gold<gold};
  });
  expect(r).toEqual({built:true,occupied:[true,true,true],ruin:true,other:true,removed:true,ordinary:true,reverse:true,noDouble:true,spent:true});
});

test('death, recall and changed property patron suspend benefits without replacement or payment',async function ({page},info) {
  await start(page,info,'upland');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,see=worship.see,house=worship.house;
    const stale=P.quote(s,worshipRequest('see')),bishop=s.religiousHeads[see[3]];s.chars[bishop].dead=true;
    const deadRefused=!P.commit(s,stale);s.chars[bishop].dead=false;P.commit(s,P.quote(s,worshipRequest('see')));
    endowWorshipHouse();FB.build(s,house[0],house[1],'monastic_house');
    const rows=JSON.stringify(s.buildings),gold=s.player.gold,people=JSON.stringify(s.chars);
    s.religiousHeads[see[3]]=null;
    const recalled=FB.buildingBonusAt(s,see[0],see[1],'piety')===0&&FB.buildingBonusAt(s,see[0],see[1],'upkeep')===0;
    s.abbeys.houses.find(function(h){return h.id==='binding_property';}).patronDyn='foreign_patron';
    const transferred=FB.buildingBonusAt(s,house[0],house[1],'piety')===0&&FB.buildingBonusAt(s,house[0],house[1],'upkeep')===0;
    return {deadRefused:deadRefused,recalled:recalled,transferred:transferred,retained:rows===JSON.stringify(s.buildings),
      noPayment:gold===s.player.gold,noReplacement:s.religiousHeads[see[3]]===null&&people===JSON.stringify(s.chars)};
  });
  expect(r).toEqual({deadRefused:true,recalled:true,transferred:true,retained:true,noPayment:true,noReplacement:true});
});

test('a suspended congregation and changed holder stop operation without destroying the asset',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.congregation;
    P.commit(s,P.quote(s,worshipRequest('congregation')));const row=s.buildings[at[0]][0],copy=JSON.stringify(row);
    s.localInstitutions[at[2]].status='suspended';
    const suspended=FB.buildingBonusAt(s,at[0],at[1],'piety')===0;
    s.localInstitutions[at[2]].status='active';const returned=FB.buildingBonusAt(s,at[0],at[1],'piety')===2;
    s.holder[at[0]]='inventory_estuary_court';FB.invalidateSettlementLordships(s);
    return {suspended:suspended,returned:returned,captured:FB.buildingBonusAt(s,at[0],at[1],'piety')===0,retained:copy===JSON.stringify(row)};
  });
  expect(r).toEqual({suspended:true,returned:true,captured:true,retained:true});
});

test('AI choices use the merged profile priorities and exact public purse with reserves',async function ({page},info) {
  await start(page,info,'river',true);
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.see,rid=FB.settlementCountyHolder(s,at[0]),actor={kind:'realm',id:rid};
    FB.treasuryCredit(s,rid,5000);worshipKnowledge(true,rid);
    const choices=P.aiChoices(s,actor,at[0],at[1],'temple'),selected=choices.find(function(q){return q.profileId==='episcopal_complex';});
    const q=P.quote(s,worshipRequest('see',actor)),gold=s.player.gold,before=FB.treasuryAvailable(s,rid);
    const built=P.commit(s,q),repeat=P.commit(s,q),paid=before-FB.treasuryAvailable(s,rid);
    const b=s.buildings[at[0]].find(function(b){return b.id==='temple';});
    return {selected:!!selected,priority:selected&&selected.def.aiBuildOrder,basePriority:FBDATA.buildings.temple.aiBuildOrder,
      built:built,repeat:repeat,paid:paid,cost:q.cost,household:gold===s.player.gold,payer:b.institutionBinding.payer,realm:rid,
      reserve:FB.treasuryAvailable(s,rid)>=q.reserve+2*(FBDATA.balance.realmReserveSeasons||2)};
  });
  expect(r).toMatchObject({selected:true,priority:27,basePriority:14,built:true,repeat:false,household:true,reserve:true});
  expect(r.paid).toBe(r.cost); expect(r.payer).toEqual({kind:'realm',id:r.realm});
});

test('the annual public builder commits a separately prioritized bound worship profile once',async function ({page},info) {
  await start(page,info,'river',true);
  const r=await page.evaluate(function () {
    const s=FB.state,at=worship.see,rid=FB.settlementCountyHolder(s,at[0]);
    FB.treasuryCredit(s,rid,5000);worshipKnowledge(true,rid);
    const original=FB.aiCanBuildAt,gold=s.player.gold;
    FB.aiCanBuildAt=function(s,actor,pid,slot,id,profileId){
      return pid===at[0]&&slot===at[1]&&profileId==='episcopal_complex'&&original(s,actor,pid,slot,id,profileId);
    };
    try { FB.aiBuildingsYear(s); FB.aiBuildingsYear(s); } finally { FB.aiCanBuildAt=original; }
    const assets=(s.buildings[at[0]]||[]).filter(function(b){return b.id==='temple';});
    return {count:assets.length,profile:assets[0]&&assets[0].buildingProfile.id,
      payer:assets[0]&&assets[0].institutionBinding.payer.id===rid,household:gold===s.player.gold};
  });
  expect(r).toEqual({count:1,profile:'episcopal_complex',payer:true,household:true});
});

test('insufficient public reserve and custody reject unchanged reviews without touching another account',async function ({page},info) {
  await start(page,info,'river',true);
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.see,rid=FB.settlementCountyHolder(s,at[0]),actor={kind:'realm',id:rid};
    s.realms[rid].treasury.gold=FB.buildCost(s,at[0],'temple',rid,'episcopal_complex');
    const q=P.quote(s,worshipRequest('see',actor)),before=JSON.stringify(s);
    const reserve=!P.commit(s,q)&&!FB.buildRealm(s,rid,at[0],at[1],'temple',0,'episcopal_complex')&&before===JSON.stringify(s);
    FB.treasuryCredit(s,rid,5000);const current=P.quote(s,worshipRequest('see',actor));
    FB.realmRulerCharacterSnapshot(s,rid).captive=true;const after=JSON.stringify(s);
    return {reserve:reserve,current:current.allowed,custody:!P.commit(s,current)&&after===JSON.stringify(s)};
  });
  expect(r).toEqual({reserve:true,current:true,custody:true});
});

for (const label of ['river','upland']) test(label + ' matching restore retains exact assets, partial research, property and permission',async function ({page},info) {
  await start(page,info,label);
  const before=await page.evaluate(function () {
    const s=FB.state;endowWorshipHouse();FB.build(s,worship.house[0],worship.house[1],'monastic_house');
    FB.buildingProfiles.commit(s,FB.buildingProfiles.quote(s,worshipRequest('see')));
    const record=FB.realmTechRecord(s);record.completed=record.completed.filter(function(id){return id!=='universities';});
    record.active=['universities'];record.progress.universities=1;
    window.worshipSavedFacts=function(){const v=FB.state;return JSON.stringify([v.buildings,v.abbeys,v.localInstitutions,v.religiousHeads,v.realmTech,v.player.gold,v.dev]);};
    return {save:FB.save.serialize(),facts:worshipSavedFacts()};
  });
  await restoreBookmark(page,before.save);
  expect(await page.evaluate(function(){return worshipSavedFacts();})).toBe(before.facts);
});

test('old unbound temple and cathedral assets survive catalogue adoption without rebinding or loss of effects',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    let s=FB.state;const at=worship.see;
    s.buildings[at[0]]=[{s:0,id:'temple'},{s:1,id:'cathedral',ruined:true}];FB.invalidateBuildingIndex(s,at[0]);
    const before=JSON.stringify(s.buildings),gold=s.player.gold;
    s.date.year=1400;worshipKnowledge(false);FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
    return {exact:before===JSON.stringify(s.buildings),gold:gold===s.player.gold,piety:FB.buildingBonusAt(s,at[0],0,'piety'),
      noBinding:s.buildings[at[0]].every(function(b){return !b.institutionBinding&&!b.buildingProfile;})};
  });
  expect(r).toEqual({exact:true,gold:true,piety:2,noBinding:true});
});

test('retained profiled ruins repair at their selected invoice outside construction dates and knowledge',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.buildingProfiles,at=worship.see;
    P.commit(s,P.quote(s,worshipRequest('see')));
    const asset=s.buildings[at[0]].find(function(b){return b.id==='temple';}),identity=JSON.stringify(asset);
    asset.ruined=true;FB.invalidateBuildingIndex(s,at[0]);s.date.year=1400;worshipKnowledge(false);
    const q=FB.repairBuildingStatus(s,at[0],at[1],'temple'),gold=s.player.gold,dev=JSON.stringify(s.dev);
    const repaired=FB.repairBuilding(s,at[0],at[1],'temple',q.cost),again=FB.repairBuilding(s,at[0],at[1],'temple',q.cost);
    return {ready:q.ready,repaired:repaired,again:again,paid:gold-s.player.gold,cost:q.cost,
      exact:identity===JSON.stringify(asset),dev:dev===JSON.stringify(s.dev),piety:FB.buildingBonusAt(s,at[0],at[1],'piety'),
      noConstruction:!P.quote(s,worshipRequest('congregation')).allowed,noTech:!FB.techRequirementMet(s,'lime_mortar')};
  });
  expect(r).toMatchObject({ready:true,repaired:true,again:false,exact:true,dev:true,piety:1,noConstruction:true,noTech:true});
  expect(r.paid).toBe(r.cost);expect(r.cost).toBeGreaterThan(0);
});

test('a vassal settlement builder pays its private account while the remote sovereign keeps its purse',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,at=worship.congregation,P=FB.buildingProfiles;
    const baron=FB.makeCharacter(s,{name:'Quay patron',station:3,born:s.date.year-30,culture:'frankish',religion:'catholic',traits:[]});
    if (!FB.assignSettlementLordship(s,at[0],at[1],baron.id)) throw new Error('Grant failed');
    FB.settleBaronyAccounts(s,Math.floor(s.turn/90)+1);s.settlementLordships.accounts[baron.id].gold=1000;
    s.player.provinceId=worship.house[0];s.player.settlement=0;
    const a={kind:'character',id:baron.id},q=P.quote(s,worshipRequest('congregation',a)),gold=s.player.gold;
    const built=P.commit(s,q),asset=s.buildings[at[0]].find(function(b){return b.id==='temple';});
    return {built:built,paid:1000-FB.baronyAccount(s,baron.id).gold,cost:q.cost,household:gold===s.player.gold,
      payer:asset.institutionBinding.payer.id===baron.id,remote:s.player.provinceId!==at[0],
      piety:FB.buildingBonusAt(s,at[0],at[1],'piety'),publicRejected:!P.quote(s,worshipRequest('congregation',{kind:'realm',id:'player'})).allowed};
  });
  expect(r).toMatchObject({built:true,household:true,payer:true,remote:true,piety:2,publicRejected:true});expect(r.paid).toBe(r.cost);
});

test('saved profile and foundation forgeries reject before state, RNG or identity adoption',async function ({page},info) {
  await start(page,info,'river');
  const r=await page.evaluate(function () {
    const s=FB.state,at=worship.see;FB.buildingProfiles.commit(s,FB.buildingProfiles.quote(s,worshipRequest('see')));
    const snapshot=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),save=JSON.parse(FB.save.serialize());
    const changes=[function(b){b.buildingProfile.id='congregational_mosque';},
      function(b){b.buildingProfile.definition='forged';},function(b){delete b.institutionBinding;},
      function(b){b.institutionBinding.profileId='congregational_foundation';},
      function(b){b.institutionBinding.payer.id='unknown_person';},function(b){b.institutionBinding.boundTurn=-1;}];
    const refused=changes.map(function(change){const data=JSON.parse(JSON.stringify(save));
      change(data.state.buildings[at[0]].find(function(b){return b.id==='temple';}));
      try { FB.save.restore(data);return false; } catch(e) { return true; }
    });
    return {refused:refused,pure:s===FB.state&&snapshot===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  });
  expect(r).toEqual({refused:Array(6).fill(true),pure:true});
});

test('ordinary mod removal refuses the imported save without installing a replacement foundation',async function ({page},info) {
  await start(page,info,'upland');
  const save=await page.evaluate(function () {
    FB.buildingProfiles.commit(FB.state,FB.buildingProfiles.quote(FB.state,worshipRequest('see')));
    return FB.save.serialize();
  });
  await page.evaluate(function(){FB.ui.showMods();});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('[data-unmod="0"]').click()]);
  await page.waitForFunction(function(){return window.FB&&FB.game&&FB.game.bootReady;});
  const r=await page.evaluate(function(save){
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const loaded=FB.game.loadData(JSON.parse(save));
    return {loaded:loaded,pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
      absent:!FBDATA.bookmarks.inventory_uplands,house:!!FBDATA.buildings.monastic_house};
  },save);
  expect(r).toEqual({loaded:false,pure:true,absent:true,house:true});
});

test('changed ordinary foundation terms cannot reuse the original imported save fingerprint',async function ({page},info) {
  await start(page,info,'river');
  const before=await page.evaluate(function(){return {save:FB.save.serialize(),signature:FB.mods.sig()};});
  const changed=JSON.parse(JSON.stringify(examples.river));
  changed.bookmarks.inventory_estuary.localInstitutions.binding_institution.historicalName='Revised keeper';
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'changed-worship.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(changed))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB&&FB.game&&FB.game.bootReady;});
  expect(await page.evaluate(function(before){
    return FB.mods.sig()!==before.signature&&!FB.game.loadData(JSON.parse(before.save));
  },before)).toBe(true);
});

test('detached ordinary imports reject mismatched foundations and invalid priority without publication',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function (source) {
    const mutations=[function(d){d.bookmarks.inventory_estuary.buildingInstitutionAssignments[0].institutionId='worship_congregation';},
      function(d){d.bookmarks.inventory_estuary.localInstitutions.worship_monastery.abbeyId=null;},
      function(d){d.bookmarks.inventory_estuary.localInstitutions.binding_institution.officeId=null;},
      function(d){d.buildingProfiles={episcopal_complex:JSON.parse(JSON.stringify(FBDATA.buildingProfiles.episcopal_complex))};d.buildingProfiles.episcopal_complex.replace.aiBuildOrder='27';},
      function(d){d.bookmarks.inventory_estuary.buildingInstitutionAssignments.push(d.bookmarks.inventory_estuary.buildingInstitutionAssignments[0]);}];
    return mutations.map(function(change){const d=JSON.parse(JSON.stringify(source));change(d);
      const before=JSON.stringify([FBDATA,FB.state,d]),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
      return FB.mods.validate(d).length>0&&before===JSON.stringify([FBDATA,FB.state,d])&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig();});
  },examples.river);
  expect(r).toEqual(Array(5).fill(true));
});
