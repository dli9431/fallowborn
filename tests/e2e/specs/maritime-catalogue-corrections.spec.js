'use strict';
const fs = require('fs');
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startParityGame } = require('../support/game/parity');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'data/technology_masonry_circuits.js', 'data/technology_waterworks.js', 'data/buildings_waterworks.js',
  'data/technology.js', 'data/technology_early_refinements.js', 'data/technology_maritime.js', 'data/map_data.js',
  'data/buildings_maritime.js', 'data/economy.js', 'data/economy_maritime.js',
  'data/markets.js', 'data/bookmarks.js', 'data/eras.js', 'data/geographies.js',
  'js/technology.js', 'js/economy.js', 'js/market.js', 'js/actions.js',
  'js/fortifications.js', 'js/world.js', 'js/treasury.js', 'js/lordships.js',
  'js/settlement.js', 'js/population.js', 'js/mods.js', 'js/save.js',
  'js/main.js', 'js/i18n.js', 'js/ui_modals.js'
]);

test.beforeEach(async function ({ page }) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(window.FBDATA,'techCorrections_maritime',{
      configurable:true,
      set:function (value) {
        window.__maritimeBase = JSON.parse(JSON.stringify(this.tech));
        Object.defineProperty(this,'techCorrections_maritime',{
          configurable:true,enumerable:true,writable:true,value:value
        });
      }
    });
  });
});

async function prepareCoast(page, info, lord) {
  await startParityGame(page, info, {
    code:'MARITIME-867-farmer-barcelona-m-Review', bookmark:'867'
  });
  await page.evaluate(function (landed) {
    const s = FB.state, p = s.player, pid = p.provinceId, me = s.chars[p.charId];
    if (!FB.world.byId[pid].coastal) throw new Error('Expected an actual coastal county');
    p.gold = 10000; p.enterpriseMigration = 1; p.enterprises = []; p.enterpriseLabor = [];
    p.profession = 'farmer';
    me.career = {profession:'farmer',rank:'journeyman',experience:5,
      startedYear:s.date.year-5,guildRank:'none',guildStanding:0,chosen:true};
    s.dev[pid] = 8; FB.rememberSettlementSites(s,pid);
    if (landed) {
      p.tier = 4; p.provs = [pid]; p.liege = null; s.owner[pid] = s.holder[pid] = 'player';
      FB.foundPlayerRealm(s); s.realms.player.liege = null;
      FB.invalidateSettlementLordships(s,pid);
    }
    s.buildings[pid] = [];
    FB.invalidateBuildingIndex(s,pid); FB.invalidateFortIndex();
    const rec = FB.realmTechRecord(s,FB.techRealmId(s));
    rec.completed = []; rec.exposed = []; rec.active = []; rec.progress = {};
    FB.invalidateTechBonuses();
  }, !!lord);
}

test('maritime replacements preserve numeric contracts and move only their actual discovery consumers', async function ({ page }, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const ids = ['clinker_shipbuilding','knarrs','longships','coastal_piloting',
      'celestial_navigation','naval_logbooks','harbor_works','dry_docks'];
    const original = {}, effective = {};
    ids.forEach(function (id) {
      original[id] = JSON.parse(JSON.stringify(window.__maritimeBase[id]));
      effective[id] = JSON.parse(JSON.stringify(FBDATA.tech[id]));
      delete original[id].desc; delete effective[id].desc;
      delete original[id].unlocks; delete effective[id].unlocks;
    });
    return {
      original:original,effective:effective,
      errors:FB.validateTechnologyData(), buildings:FB.validateBuildingData(FBDATA.buildings,true),
      count:Object.keys(FBDATA.tech).length,
      rows:ids.map(function (id) {
        const d = FBDATA.tech[id];
        return [id,d.cost,d.req,d.history.attested,d.history.adoption.default,d.fx,d.capabilities,d.sources];
      }),
      unlocks:ids.map(function (id) { return FBDATA.tech[id].unlocks; }),
      yard:FBDATA.buildings.arsenal, boat:FBDATA.enterprises.fishing_boat_business,
      reviews:['building_arsenal','commercial_fishing','decked_fishing_capacity','fishing_flotilla_organization']
        .map(function (id) { const d = FBDATA.techImpactReviews.features[id]; return [id,d.mode,d.tech]; }),
      order:Array.from(document.scripts).map(function (s) { return s.getAttribute('src'); }).filter(Boolean)
    };
  });
  expect(r.effective).toEqual(r.original);
  expect(r.errors).toEqual([]); expect(r.buildings).toEqual([]); expect(r.count).toBe(193);
  const sources = ['UNGER','PRYOR'];
  expect(r.rows).toEqual([
    ['clinker_shipbuilding',20,['mortise_tenon_shipbuilding'],[300,850],[500,850],{trade:0.005,seaTransport:1000},[],sources],
    ['knarrs',50,['clinker_shipbuilding','square_sail'],[750,1050],[830,1040],{trade:0.015,seaTransport:1500},[],sources],
    ['longships',50,['clinker_shipbuilding','square_sail'],[650,1000],[730,990],{seaMovement:0.02,seaTransport:1500},['seafaring_raids'],sources],
    ['coastal_piloting',20,[],[-1000,700],[480,650],{seaMovement:0.005,seaTransport:500},[],sources],
    ['celestial_navigation',50,['astronomical_observation','coastal_piloting'],[700,1100],[850,1120],{seaMovement:0.015},['oceanic_navigation'],sources],
    ['naval_logbooks',100,['scriptoria','coastal_piloting'],[850,1200],[1000,1230],{seaMovement:0.01},['oceanic_navigation'],sources],
    ['harbor_works',20,['lime_mortar'],[-500,700],[500,720],{seaTransport:750},[],sources],
    ['dry_docks',100,['harbor_works','stone_bridgebuilding'],[900,1250],[1070,1280],{seaMovement:0.01},[],sources]
  ]);
  expect(r.unlocks).toEqual([
    ['rule:clinker_hulls'],['rule:knarr_trade'],['rule:longships'],
    ['practice:coastal_piloting','enterprise:fishing_boat_business'],
    ['rule:celestial_navigation'],['rule:sailing_directions'],
    ['building:harbor','building:arsenal'],['rule:dry_docks']
  ]);
  expect(r.yard).toEqual({role:'shipyard',aiBuildOrder:4,name:'Naval Outfitting Yard',icon:'⚓',
    cost:140,upkeep:3,coastal:true,devMin:5,maxCounty:1,tax:5,dev:1,retinue:20,requiresTech:'harbor_works',
    desc:'Maintained slips, stores, and workshops support paid naval outfitting. No drainable basin or fleet is created. (+20 men-at-arms)'});
  expect(r.boat).toMatchObject({name:'Fishing Boat',cost:40,profession:'farmer',yield:2.5,laborPay:1.25,
    coastal:true,requiresTech:'coastal_piloting',upgrades:[
      {name:'Decked Fishing Boat',cost:140,staff:2,requiresTech:'harbor_works',fx:{populationCapacity:0.02,levy:15}},
      {name:'Fishing Flotilla',cost:420,staff:3,requiresTech:'naval_levies',dev:1,fx:{populationCapacity:0.04,levy:25}}
    ]});
  expect(r.reviews).toEqual([
    ['building_arsenal','hard',['harbor_works']],['commercial_fishing','soft',['coastal_piloting']],
    ['decked_fishing_capacity','hard',['harbor_works']],['fishing_flotilla_organization','hard',['naval_levies']]
  ]);
  for (const file of ['data/technology_maritime.js','data/buildings_maritime.js']) {
    expect(r.order.indexOf(file)).toBeGreaterThan(r.order.indexOf('data/technology.js'));
    expect(r.order.indexOf(file)).toBeLessThan(r.order.indexOf('data/bookmarks.js'));
  }
  expect(r.order.indexOf('data/economy_maritime.js')).toBeGreaterThan(r.order.indexOf('data/economy.js'));
  expect(r.order.indexOf('data/economy_maritime.js')).toBeLessThan(r.order.indexOf('js/economy.js'));
});

test('fishing purchase and both upgrades require their exact knowledge, funds and qualified staff', async function ({ page }, info) {
  await prepareCoast(page,info,false);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, rec = FB.realmTechRecord(s);
    const army = JSON.stringify(s.armies), owner = JSON.stringify(s.owner), pop = JSON.stringify(s.population);
    const gold = s.player.gold, rng = FB.getRngState(), uid = FB.getUidCounter();
    const locked = [[],['knarrs'],['sternpost_rudder','dry_docks']].map(function (known) {
      rec.completed = known; FB.invalidateTechBonuses();
      const status = FB.enterprisePurchaseStatus(s,'fishing_boat_business',pid,0);
      return {missing:status.missingTech,failed:FB.buyEnterprise(s,'fishing_boat_business',0)===false};
    });
    const pure = gold===s.player.gold && rng===FB.getRngState() && uid===FB.getUidCounter();
    rec.completed = ['coastal_piloting']; FB.invalidateTechBonuses();
    s.player.gold = 0;
    const poor = FB.buyEnterprise(s,'fishing_boat_business',0)===false && s.player.enterprises.length===0;
    s.player.gold = gold;
    const price = FB.enterpriseCost(s,'fishing_boat_business',pid), before = s.player.gold;
    const boat = FB.buyEnterprise(s,'fishing_boat_business',0), paid = before-s.player.gold;
    if (!boat) throw new Error('Expected a paid working fishing boat');
    if (!FB.assignEnterprise(s,boat.uid,s.player.charId)) throw new Error('Expected qualified protagonist staffing');
    const base = FB.enterpriseYield(s,boat), firstLocked = FB.enterpriseUpgradeStatus(s,boat).missingTech;
    rec.completed.push('sternpost_rudder','dry_docks'); FB.invalidateTechBonuses();
    const wrongFirst = FB.upgradeEnterprise(s,boat.uid)===false;
    rec.completed.push('harbor_works'); FB.invalidateTechBonuses();
    const firstPrice = FB.enterpriseUpgradeCost(s,boat), firstGold = s.player.gold;
    const first = FB.upgradeEnterprise(s,boat.uid), firstPaid = firstGold-s.player.gold;
    const idle = FB.enterpriseYield(s,boat), idleFx = FB.enterpriseUpgradeEffects(s,pid);
    const hireOne = !!FB.hireEnterpriseWorker(s,boat.uid), firstFx = FB.enterpriseUpgradeEffects(s,pid);
    const nextLocked = FB.enterpriseUpgradeStatus(s,boat).missingTech;
    const wrongSecond = FB.upgradeEnterprise(s,boat.uid)===false;
    rec.completed.push('naval_levies'); FB.invalidateTechBonuses();
    s.player.gold = 0;
    const unfunded = FB.upgradeEnterprise(s,boat.uid)===false && boat.level===1;
    s.player.gold = 10000;
    const secondPrice = FB.enterpriseUpgradeCost(s,boat), secondGold = s.player.gold;
    const second = FB.upgradeEnterprise(s,boat.uid), secondPaid = secondGold-s.player.gold;
    const secondIdle = FB.enterpriseYield(s,boat), hireTwo = !!FB.hireEnterpriseWorker(s,boat.uid);
    const full = FB.enterpriseYield(s,boat), fullFx = FB.enterpriseUpgradeEffects(s,pid);
    const dev = s.dev[pid]; FB.enterpriseUpgradeSeason(s); const once = s.dev[pid]-dev;
    FB.enterpriseUpgradeSeason(s); const repeated = s.dev[pid]-dev-once;
    const wages = FB.enterpriseLaborSeasonCost(s), wageGold = s.player.gold;
    FB.enterpriseLaborSeason(s);
    return {locked:locked,pure:pure,poor:poor,price:price,paid:paid,base:base,
      firstLocked:firstLocked,wrongFirst:wrongFirst,first:first,firstPrice:firstPrice,firstPaid:firstPaid,
      idle:idle,idleFx:idleFx,hireOne:hireOne,firstFx:firstFx,nextLocked:nextLocked,wrongSecond:wrongSecond,
      unfunded:unfunded,second:second,secondPrice:secondPrice,secondPaid:secondPaid,
      secondIdle:secondIdle,hireTwo:hireTwo,full:full,fullFx:fullFx,once:once,repeated:repeated,
      wages:wages,wagePaid:wageGold-s.player.gold,
      unchanged:army===JSON.stringify(s.armies) && owner===JSON.stringify(s.owner),
      population:JSON.parse(pop).counties[pid].count===s.population.counties[pid].count};
  });
  expect(r.locked).toEqual(Array(3).fill({missing:['coastal_piloting'],failed:true}));
  expect(r).toMatchObject({pure:true,poor:true,firstLocked:['harbor_works'],wrongFirst:true,first:true,
    idle:0,hireOne:true,nextLocked:['naval_levies'],wrongSecond:true,unfunded:true,second:true,
    secondIdle:0,hireTwo:true,once:1,repeated:0,unchanged:true,population:true});
  expect(r.paid).toBe(r.price); expect(r.price).toBeGreaterThan(0);
  expect(r.firstPaid).toBe(r.firstPrice); expect(r.secondPaid).toBe(r.secondPrice);
  expect(r.idleFx.levy).toBe(0); expect(r.firstFx.levy).toBe(15); expect(r.fullFx.levy).toBe(40);
  expect(r.fullFx.populationCapacity).toBeCloseTo(0.06,10);
  expect(r.base).toBeGreaterThan(0); expect(r.full).toBeGreaterThan(0);
  expect(r.wages).toBe(2.5); expect(r.wagePaid).toBe(r.wages);
});

test('the paid yard retains coastal, development, county and manpower accounting gates', async function ({ page }, info) {
  await prepareCoast(page,info,true);
  const r = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, rec = FB.realmTechRecord(s);
    const army = JSON.stringify(s.armies), population = FB.countyPopulation(s,pid);
    const blocked = FB.canBuildAt(s,pid,0,'arsenal');
    rec.completed = ['harbor_works']; FB.invalidateTechBonuses();
    s.dev[pid] = 4; const lowDev = FB.canBuildAt(s,pid,0,'arsenal'); s.dev[pid] = 8;
    s.player.gold = 0; const poor = FB.build(s,pid,0,'arsenal'); s.player.gold = 10000;
    const price = FB.buildCost(s,pid,'arsenal'), gold = s.player.gold;
    const ai = FB.aiCanBuildAt(s,'player',pid,0,'arsenal'), built = FB.build(s,pid,0,'arsenal');
    const repeated = FB.build(s,pid,0,'arsenal');
    rec.completed = []; FB.invalidateTechBonuses();
    return {blocked:blocked,lowDev:lowDev,poor:poor,ai:ai,built:built,repeated:repeated,
      price:price,paid:gold-s.player.gold,retinue:FB.buildingBonusIn(s,pid,'retinue'),
      upkeep:FB.buildingBonusIn(s,pid,'upkeep'),tax:FB.buildingBonusIn(s,pid,'tax'),
      unchanged:army===JSON.stringify(s.armies) && population===FB.countyPopulation(s,pid)};
  });
  expect(r).toMatchObject({blocked:false,lowDev:false,poor:false,ai:true,built:true,repeated:false,
    retinue:20,upkeep:3,tax:5,unchanged:true});
  expect(r.paid).toBe(r.price); expect(r.price).toBeGreaterThan(0);
});

test('annual AI uses its public reserve and actual yard cost without a free fleet or recruitment', async function ({ page }, info) {
  await prepareCoast(page,info,false);
  const r = await page.evaluate(function () {
    const s = FB.state;
    Object.keys(FBDATA.buildings).forEach(function (id) { if (id!=='arsenal') delete FBDATA.buildings[id].aiBuildOrder; });
    const rid = Object.keys(s.realms).find(function (id) {
      return s.realms[id].alive && !s.realms[id].liege && FB.realmHeldCounties(s,id).some(function (pid) {
        return FB.world.byId[pid].coastal;
      });
    });
    const counties = FB.realmHeldCounties(s,rid), pid = counties.find(function (id) { return FB.world.byId[id].coastal; });
    counties.forEach(function (id) {
      s.dev[id] = 8; s.buildings[id] = id===pid ? [] : [{s:0,id:'arsenal',ruined:true}];
      FB.invalidateBuildingIndex(s,id);
    });
    const known = FB.realmTechRecord(s,rid); known.completed = ['harbor_works']; FB.invalidateTechBonuses();
    s.armies = []; s.greatHolyWar = null; FB.treasuryInitialize(s);
    Object.keys(s.realms).forEach(function (id) {
      const account = s.realms[id].treasury;
      if (account) { account.gold = 0; account.militaryAccrued = 0; }
    });
    const account = s.realms[rid].treasury;
    const force = JSON.stringify(s.armies), population = FB.countyPopulation(s,pid), privateGold = s.player.gold;
    FB.aiBuildingsYear(s); const poor = s.buildings[pid].length===0;
    account.gold = 100000; account.militaryAccrued = 37;
    const cost = FB.buildCost(s,pid,'arsenal',rid), gold = account.gold;
    const upkeep = FB.treasurySnapshot(s).rows[rid].upkeep;
    FB.aiBuildingsYear(s);
    return {poor:poor,built:s.buildings[pid].some(function (b) { return b.id==='arsenal'; }),
      cost:cost,spent:gold-account.gold,upkeep:FB.treasurySnapshot(s).rows[rid].upkeep-upkeep,
      accrued:account.militaryAccrued,privateGold:s.player.gold===privateGold,
      force:force===JSON.stringify(s.armies) && population===FB.countyPopulation(s,pid)};
  });
  expect(r).toMatchObject({poor:true,built:true,upkeep:3,accrued:37,privateGold:true,force:true});
  expect(r.spent).toBe(r.cost); expect(r.cost).toBeGreaterThan(0);
});

test('retained boats, staffing, upgrade receipts and ruined yards survive matching restore without research replay', async function ({ page }, info) {
  await prepareCoast(page,info,false);
  const before = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, rec = FB.realmTechRecord(s);
    rec.completed = ['coastal_piloting','harbor_works','naval_levies']; FB.invalidateTechBonuses();
    const boat = FB.buyEnterprise(s,'fishing_boat_business',0);
    if (!boat || !FB.assignEnterprise(s,boat.uid,s.player.charId) ||
        !FB.upgradeEnterprise(s,boat.uid) || !FB.hireEnterpriseWorker(s,boat.uid) ||
        !FB.upgradeEnterprise(s,boat.uid) || !FB.hireEnterpriseWorker(s,boat.uid)) throw new Error('Retained boat setup failed');
    FB.enterpriseUpgradeSeason(s);
    s.buildings[pid] = [{s:0,id:'arsenal',ruined:true}]; FB.invalidateBuildingIndex(s,pid);
    rec.completed = ['knarrs','sternpost_rudder','dry_docks']; FB.invalidateTechBonuses();
    const working = FB.enterpriseYield(s,boat), effects = FB.enterpriseUpgradeEffects(s,pid);
    return {working:working,effects:effects,enterprise:JSON.stringify(s.player.enterprises),
      buildings:JSON.stringify(s.buildings[pid]),knowledge:JSON.stringify(rec),dev:s.dev[pid],save:FB.save.serialize()};
  });
  await restoreBookmark(page,before.save);
  const after = await page.evaluate(function () {
    const s = FB.state, pid = s.player.provinceId, boat = FB.enterpriseList(s)[0], dev = s.dev[pid];
    const result = {enterprise:JSON.stringify(s.player.enterprises),buildings:JSON.stringify(s.buildings[pid]),
      knowledge:JSON.stringify(FB.realmTechRecord(s)),working:FB.enterpriseYield(s,boat),
      effects:FB.enterpriseUpgradeEffects(s,pid),dev:dev};
    FB.enterpriseUpgradeSeason(s); result.repeatedDev = s.dev[pid]-dev;
    return result;
  });
  expect(before.working).toBeGreaterThan(0);
  expect(after).toEqual({enterprise:before.enterprise,buildings:before.buildings,knowledge:before.knowledge,
    working:before.working,effects:before.effects,dev:before.dev,repeatedDev:0});
});

for (const sample of [
  {file:'maritime-mediterranean.json',business:'review_coastal_fishery',yard:'review_coastal_slips',
    purchase:'coastal_piloting',upgrade:'harbor_works',yardTech:'harbor_works',staff:2,levy:6,retinue:8},
  {file:'maritime-nordic.json',business:'review_northern_boats',yard:'review_clinker_sheds',
    purchase:'steering_oars',upgrade:'knarrs',yardTech:'clinker_shipbuilding',staff:3,levy:9,retinue:5}
]) {
  test(sample.file + ' imports an independently configured paid and staffed coastal economy', async function ({ page }, info) {
    const importPath = path.resolve(__dirname,'../fixtures/authoring/'+sample.file);
    await openGame(page,info); await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(importPath);
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (input) { return FB.game.bootReady && !!FBDATA.enterprises[input.business]; },sample);
    await prepareCoast(page,info,true);
    const before = await page.evaluate(function (input) {
      const s = FB.state, pid = s.player.provinceId, rec = FB.realmTechRecord(s);
      const state = JSON.stringify(s), data = JSON.stringify(FBDATA.enterprises), sig = FB.mods.sig();
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const bad = {enterprises:{}}; bad.enterprises[input.business] = JSON.parse(JSON.stringify(FBDATA.enterprises[input.business]));
      bad.enterprises[input.business].upgrades[0].requiresTech = 'unknown_maritime_practice';
      const errors = FB.mods.validate(bad);
      const pure = state===JSON.stringify(s) && data===JSON.stringify(FBDATA.enterprises) && sig===FB.mods.sig() && rng===FB.getRngState() && uid===FB.getUidCounter();
      const locked = FB.enterprisePurchaseStatus(s,input.business,pid,0).missingTech;
      rec.completed = [input.purchase]; FB.invalidateTechBonuses();
      const cost = FB.enterpriseCost(s,input.business,pid), gold = s.player.gold;
      const boat = FB.buyEnterprise(s,input.business,0), paid = gold-s.player.gold;
      if (!boat) throw new Error('Imported boat purchase failed');
      FB.assignEnterprise(s,boat.uid,null);
      const hired = !!FB.hireEnterpriseWorker(s,boat.uid), base = FB.enterpriseYield(s,boat);
      const upgradeLocked = FB.enterpriseUpgradeStatus(s,boat).missingTech;
      rec.completed.push(input.upgrade); FB.invalidateTechBonuses();
      const upCost = FB.enterpriseUpgradeCost(s,boat), upGold = s.player.gold;
      const upgraded = FB.upgradeEnterprise(s,boat.uid), upPaid = upGold-s.player.gold;
      const idle = FB.enterpriseYield(s,boat);
      for (let i=1; i<input.staff; i++) if (!FB.hireEnterpriseWorker(s,boat.uid)) throw new Error('Imported staffing failed');
      rec.completed.push(input.yardTech); FB.invalidateTechBonuses();
      const buildCost = FB.buildCost(s,pid,input.yard), buildGold = s.player.gold;
      const built = FB.build(s,pid,0,input.yard), buildPaid = buildGold-s.player.gold;
      const effects = FB.enterpriseUpgradeEffects(s,pid), staff = FB.enterpriseStaffRequired(boat);
      return {errors:errors,pure:pure,locked:locked,cost:cost,paid:paid,hired:hired,base:base,
        upgradeLocked:upgradeLocked,upCost:upCost,upPaid:upPaid,upgraded:upgraded,idle:idle,
        built:built,buildCost:buildCost,buildPaid:buildPaid,levy:effects.levy,staff:staff,
        full:FB.enterpriseYield(s,boat),retinue:FB.buildingBonusIn(s,pid,'retinue'),
        records:JSON.stringify([s.player.enterprises,s.player.enterpriseLabor,s.buildings[pid]]),save:FB.save.serialize()};
    },sample);
    expect(before.errors.join('\n')).toContain('unknown_maritime_practice'); expect(before.pure).toBe(true);
    expect(before).toMatchObject({locked:[sample.purchase],hired:true,upgradeLocked:[sample.upgrade],
      upgraded:true,idle:0,built:true,levy:sample.levy,staff:sample.staff,retinue:sample.retinue});
    expect(before.paid).toBe(before.cost); expect(before.upPaid).toBe(before.upCost);
    expect(before.buildPaid).toBe(before.buildCost); expect(before.base).toBeGreaterThan(0); expect(before.full).toBeGreaterThan(0);
    await restoreBookmark(page,before.save);
    expect(await page.evaluate(function () {
      const s = FB.state; return JSON.stringify([s.player.enterprises,s.player.enterpriseLabor,s.buildings[s.player.provinceId]]);
    })).toBe(before.records);
    const changed = JSON.parse(fs.readFileSync(importPath,'utf8'));
    changed.enterprises[sample.business].upgrades[0].cost++;
    await page.evaluate(function (mod) { localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)])); },changed);
    await openGame(page,info);
    expect(await page.evaluate(function (text) {
      const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(JSON.parse(text))===false && state===FB.state && world===FB.world &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    },before.save)).toBe(true);
  });
}

for (const id of ['867','1066']) {
  test(id + ' retains original maritime starting knowledge without re-recording expected completions', async function ({ page }, info) {
    await beginBookmark(page,info,id,'farmer');
    const r = await page.evaluate(function () {
      const ids = Object.keys(FBDATA.techCorrections_maritime);
      function snapshot() {
        const s = JSON.parse(JSON.stringify(FB.state)); s.realmTech = {};
        FB.seedRealmTechnologies(s,true);
        return Object.keys(s.realmTech).sort().map(function (rid) {
          return [rid,s.realmTech[rid].completed.slice().sort(),s.realmTech[rid].exposed.slice().sort()];
        });
      }
      const corrected = snapshot(), current = {};
      let original;
      try {
        ids.forEach(function (id) { current[id] = FBDATA.tech[id]; FBDATA.tech[id] = window.__maritimeBase[id]; });
        original = snapshot();
      } finally {
        ids.forEach(function (id) { FBDATA.tech[id] = current[id]; });
      }
      return {corrected:corrected,original:original};
    });
    expect(r.corrected.length).toBeGreaterThan(10); expect(r.corrected).toEqual(r.original);
  });
}
