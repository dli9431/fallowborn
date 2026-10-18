'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {river:require('../fixtures/authoring/water-operations-river.json'),
  catchment:require('../fixtures/authoring/water-operations-catchment.json')};
dependsOnRuntime(__filename,[
  'data/building_profiles.js','js/building_profiles.js','index.html','data/building_operations.js','data/site_resources.js','data/technology.js',
  'js/building_operations.js','js/site_resources.js','js/world.js','js/actions.js','js/fortifications.js',
  'js/population.js','js/technology.js','js/lordships.js','js/treasury.js','js/home_authority.js',
  'js/building_institutions.js','js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

async function importExample(page,info,name,custom,ruler) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(custom ? {name:'water-example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))} :
    path.resolve(__dirname,'../fixtures/authoring/water-operations-' + name + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const origin = name === 'river' ? 'river' : 'upland';
  await page.waitForFunction(function (id) { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[id]; },'resource_' + origin);
  if (!ruler) return beginBookmark(page,info,'resource_' + origin,'resource_' + origin + '_household');
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('WATERSERVICE-resource_river-resource_river_ruler-resource_quay-m-Ivo_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

// Setup purchases through the same realm transaction used by the annual AI.
async function prepare(page,fill) {
  return page.evaluate(function (fill) {
    const s=FB.state,O=FB.buildingOperations,plan=O.compile(FB.campaignBookmark(s)),a=plan.assignments[0];
    const holder=FB.settlementHolder(s,a.countyId,a.slot),realm=s.realms[holder.id];
    realm.treasury.gold=10000;
    const built=FB.buildRealm(s,holder.id,a.countyId,a.slot,'water_fill_plant');
    function request(id) { return {countyId:a.countyId,settlement:a.slot,buildingId:id,actor:holder}; }
    const filled=fill ? O.commit(s,O.quote(s,request('water_fill_plant'))) : null;
    const service=FB.buildRealm(s,holder.id,a.countyId,a.slot,'water_service_plant');
    const rival=FB.buildRealm(s,holder.id,a.countyId,a.slot,'water_rival_plant');
    return {built:built,filled:filled,service:service,rival:rival,errors:plan.errors};
  },fill);
}

for (const name of ['river','catchment']) {
  test(name + ' imports an independent complete world without water, service or property initialization',async function ({page},info) {
    await importExample(page,info,name);
    const facts=await page.evaluate(function () {
      const s=FB.state,O=FB.buildingOperations,before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const p=O.compile(FB.campaignBookmark(s));O.validate(s);
      return {errors:p.errors,count:p.assignments.length,absent:s.buildingOperations===undefined&&s.siteResources===undefined,
        stock:FB.siteResources.snapshot(s)[1].stock,capacity:FB.siteResources.snapshot(s)[0].capacity,
        pure:before===JSON.stringify([s,FBDATA])&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        review:FBDATA.techImpactReviews.features.water_operational_service.mode};
    });
    expect(facts).toEqual({errors:[],count:3,absent:true,stock:0,capacity:name==='river'?12:3,pure:true,review:'none'});
  });

  test(name + ' funds actual water once, excludes shared demand, preserves other claims and restores without replay',async function ({page},info) {
    await importExample(page,info,name);
    expect(await prepare(page,true)).toEqual({built:true,filled:true,service:true,rival:true,errors:[]});
    const result=await page.evaluate(function () {
      const s=FB.state,O=FB.buildingOperations,R=FB.siteResources,a=O.compile(FB.campaignBookmark(s)).assignments[1];
      const who=FB.settlementHolder(s,a.countyId,a.slot),req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
      const asset=s.buildings[a.countyId].find(function(r){return r.id===a.buildingId;});
      const source=a.sourceId,claim=R.commit(s,R.quote(s,{operation:'reserve',sourceId:source,actor:who,amount:1}));
      // Release it only in the dry configuration, whose two stored units are the entire service input.
      if (!a.stores.length) R.commit(s,R.quote(s,{operation:'release',sourceId:source,actor:who,reservationId:claim}));
      const idle=FB.buildingBonusIn(s,a.countyId,'populationCapacity'),q=O.quote(s,req),competing=O.quote(s,Object.assign({},req,{buildingId:'water_rival_plant'}));
      const before=s.realms[who.id].treasury.gold,worked=O.commit(s,q),paid=before-s.realms[who.id].treasury.gold;
      const capacity=FB.buildingBonusIn(s,a.countyId,'populationCapacity'),repeat=O.commit(s,q),rival=O.commit(s,competing);
      const freshRival=O.quote(s,Object.assign({},req,{buildingId:'water_rival_plant'}));
      const stillReserved=R.snapshot(s).some(function(row){return row.reservations.some(function(c){return c.id===claim;});});
      O.validate(s);
      const saved=JSON.stringify([s.buildingOperations,s.siteResources,s.buildings,s.realms[who.id].treasury,s.population]),rng=FB.getRngState(),uid=FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const t=FB.state,matching=saved===JSON.stringify([t.buildingOperations,t.siteResources,t.buildings,t.realms[who.id].treasury,t.population]);
      const receipt=t.buildingOperations.receipts[asset.waterOperation.id];
      const afterRestore=FB.buildingBonusIn(t,a.countyId,'populationCapacity');
      t.turn=receipt.untilTurn;
      const ended=FB.buildingBonusIn(t,a.countyId,'populationCapacity');
      return {idle:idle,worked:worked,paid:paid,cost:q.cost,capacity:capacity,repeat:repeat,rival:rival,freshRival:freshRival.allowed,
        reserved:stillReserved,matching:matching,identity:rng===FB.getRngState()&&uid===FB.getUidCounter(),afterRestore:afterRestore,ended:ended,
        property:t.buildings[a.countyId].length,upkeep:FB.buildingBonusIn(t,a.countyId,'upkeep')};
    });
    expect(result).toMatchObject({idle:0,worked:true,capacity:0.03,repeat:false,rival:false,freshRival:false,
      reserved:name==='river',matching:true,identity:true,afterRestore:0.03,ended:0,property:3,upkeep:0});
    expect(result.paid).toBeCloseTo(result.cost,8);
  });
}

test('dry storage cannot construct or operate a usable service, while paid filling grants no static effect',async function ({page},info) {
  await importExample(page,info,'catchment');
  expect(await prepare(page,false)).toEqual({built:true,filled:null,service:false,rival:false,errors:[]});
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    const request={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
    const before=JSON.stringify(s),q=O.quote(s,request),pure=before===JSON.stringify(s);
    const fill=O.commit(s,q),rows=FB.siteResources.snapshot(s),effect=FB.buildingBonusIn(s,a.countyId,'populationCapacity');
    return {pure:pure,fill:fill,used:rows[0].consumed,stock:rows[1].stock,effect:effect,again:O.commit(s,q)};
  });
  expect(result).toEqual({pure:true,fill:true,used:2,stock:2,effect:0,again:false});
});

test('stale source, cash, custody, ruin, authority and period reviews are atomic and leave RNG and UID unchanged',async function ({page},info) {
  await importExample(page,info,'river');await prepare(page,false);
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,R=FB.siteResources,a=O.compile(FB.campaignBookmark(s)).assignments[1],actor=FB.settlementHolder(s,a.countyId,a.slot);
    const req={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:actor};
    const changes=[function(t){t.turn++;},function(t){t.realms[actor.id].treasury.gold--;},
      function(t){t.chars[FB.political.actor(t,actor).characterId].captive=true;},
      function(t){t.buildings[a.countyId].find(function(r){return r.id===a.buildingId;}).ruined=true;},
      function(t){delete t.owner[a.countyId];delete t.holder[a.countyId];},
      function(t){R.commit(t,R.quote(t,{operation:'reserve',sourceId:a.sourceId,actor:actor,amount:1}));}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s)),q=O.quote(t,req);change(t);
      const before=JSON.stringify(t),rng=FB.getRngState(),uid=FB.getUidCounter();
      return q.allowed&&!O.commit(t,q)&&before===JSON.stringify(t)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  });
  expect(result).toEqual(Array(6).fill(true));
});

test('operating sources and asset authority remain live without removing property or refunding work',async function ({page},info) {
  await importExample(page,info,'river');await prepare(page,false);
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],actor=FB.settlementHolder(s,a.countyId,a.slot);
    O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:actor}));
    const changes=[function(t){t.chars[FB.political.actor(t,actor).characterId].dead=true;},
      function(t){t.realms[actor.id].ruler.generation=FB.realmRulerGeneration(t,actor.id)+1;},
      function(t){delete t.owner.resource_quay;delete t.holder.resource_quay;},
      function(t){delete t.owner[a.countyId];delete t.holder[a.countyId];},
      function(t){t.buildings[a.countyId].find(function(r){return r.id===a.buildingId;}).ruined=true;}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));
      const before=FB.buildingBonusIn(t,a.countyId,'populationCapacity');change(t);
      const saved=JSON.stringify(t),value=FB.buildingBonusIn(t,a.countyId,'populationCapacity');
      return before===0.03&&value===0&&t.buildings[a.countyId].length===3&&saved===JSON.stringify(t);});
  });
  expect(result).toEqual(Array(5).fill(true));
});

for (const effect of ['tax','piety','research','populationCapacity','populationFamineProtection','populationCrisisProtection','migrationAttraction']) {
  test(effect + ' readers use the same paid receipt and legacy unbound records retain their defaults',async function ({page},info) {
    const m=JSON.parse(JSON.stringify(examples.river)),d=m.buildings.water_service_plant;
    delete d.populationCapacity;d[effect]=effect==='tax'||effect==='piety'||effect==='research'?1:0.03;
    m.buildingOperationProfiles.water_service.effect=effect;
    delete m.buildings.water_rival_plant.populationCapacity;
    m.buildings.water_rival_plant[effect]=d[effect];m.buildingOperationProfiles.water_rival.effect=effect;
    await importExample(page,info,'river',m);await prepare(page,false);
    const result=await page.evaluate(function (effect) {
      const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
      const value=FBDATA.buildings[a.buildingId][effect],r=s.buildings[a.countyId].find(function(r){return r.id===a.buildingId;});
      const idle=FB.buildingBonusAt(s,a.countyId,a.slot,effect),rate=FB.techResearchRate(s,who.id);
      const worked=O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}));
      const active=FB.buildingBonusAt(s,a.countyId,a.slot,effect),researchDelta=FB.techResearchRate(s,who.id)-rate;
      const projection=FB.settlementFiscalProjection(s,a.countyId,a.slot);
      const saved=JSON.parse(JSON.stringify(s));delete saved.buildings[a.countyId].find(function(r){return r.id===a.buildingId;}).waterOperation;
      delete saved.buildingOperations;delete saved.siteResources;
      O.validate(saved);
      return {idle:idle,worked:worked,active:active,value:value,researchDelta:researchDelta,
        fiscal:projection.amounts.upkeep,legacy:FB.buildingBonusAt(saved,a.countyId,a.slot,effect),
        legacyUpkeep:FB.buildingBonusAt(saved,a.countyId,a.slot,'upkeep'),
        capacity:FB.countyBuildingCapacityBonus(s,a.countyId),attraction:FB.countyBuildingAttraction(s,a.countyId),
        famine:FB.countyBuildingFamineProtection(s,a.countyId),crisis:FB.countyBuildingCrisisProtection(s,a.countyId)};
    },effect);
    expect(result).toMatchObject({idle:0,worked:true,active:d[effect],value:d[effect],legacy:d[effect],legacyUpkeep:2,fiscal:0});
    if (effect==='research') expect(result.researchDelta).toBeCloseTo(1,8);
    if (effect==='populationCapacity') expect(result.capacity).toBe(0.03);
    if (effect==='migrationAttraction') expect(result.attraction).toBe(0.03);
    if (effect==='populationFamineProtection') expect(result.famine).toBe(0.03);
    if (effect==='populationCrisisProtection') expect(result.crisis).toBe(0.03);
  });
}

test('AI uses the same receipt, demand budget and existing public reserves without private purse funding',async function ({page},info) {
  await importExample(page,info,'river');await prepare(page,false);
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    const privateGold=s.player.gold,before=s.realms[who.id].treasury.gold,count=O.runAI(s),repeat=O.runAI(s);
    return {count:count,repeat:repeat,paid:before-s.realms[who.id].treasury.gold,private:s.player.gold===privateGold,
      active:FB.buildingBonusIn(s,a.countyId,'populationCapacity'),valid:O.validate(s)};
  });
  expect(result).toMatchObject({count:2,repeat:0,private:true,active:0.03,valid:true});expect(result.paid).toBeGreaterThan(3);
});

test('public reserves, work funding and competing source draw fail without partial deliveries or a private bailout',async function ({page},info) {
  await importExample(page,info,'river');await prepare(page,false);
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,R=FB.siteResources,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    const request={countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
    const changes=[function(t){t.realms[who.id].treasury.gold=0;t.player.gold=100000;},
      function(t){t.realms[who.id].treasury.gold=(FB.treasuryConstructionReserves(t)||{})[who.id];},
      function(t){R.commit(t,R.quote(t,{operation:'reserve',sourceId:a.sourceId,actor:who,amount:12}));}];
    return changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);
      const q=O.quote(t,request),committed=O.commit(t,q);
      return !q.allowed&&!committed&&before===JSON.stringify(t)&&FB.buildingBonusIn(t,a.countyId,'populationCapacity')===0;});
  });
  expect(result).toEqual(Array(3).fill(true));
});

test('same-seed fresh campaigns reproduce exact paid receipts, resource balances, people and identities',async function ({page},info) {
  await importExample(page,info,'river');
  async function facts() {
    await prepare(page,true);
    return page.evaluate(function () {
      const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
      const q=O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who});
      if (!O.commit(s,q)) throw new Error('Expected funded deterministic use.');
      return {facts:JSON.stringify([s.buildingOperations,s.siteResources,s.population,s.buildings,s.chars,s.realms,s.owner,s.holder]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
    });
  }
  const first=await facts();
  await beginBookmark(page,info,'resource_river','resource_river_household');
  expect(await facts()).toEqual(first);
});

test('detached validation rejects bad types, unsupported bonuses, routes, cycles and foreign demand without publication',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (example) {
    const before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const changes=[function(m){m.buildingOperationProfiles.water_service.amount=0;},function(m){m.buildingOperationProfiles.water_service.periodDays=91;},
      function(m){m.buildingOperationProfiles.water_service.workCost=-1;},function(m){m.buildingOperationProfiles.water_service.effect='levy';},
      function(m){m.buildings.water_service_plant.piety=1;},function(m){m.buildings.water_service_plant.dev=1;},
      function(m){m.buildings.water_service_plant.operationProfile='missing';},function(m,a){a[1].stores=['river_cistern','river_cistern'];},
      function(m,a){a[1].sourceId='missing';},function(m,a){a[1].siteId='resource_intake';},function(m,a){a.push(a[1]);},
      function(m,a){a[1].extra=true;},function(m,a){a[1].stores=['river_intake'];},function(m,a){a[1].sourceId='river_slip';},
      function(m,a){a[1].profileId='water_fill';},function(m){m.buildingOperationProfiles=[];}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(example));change(m,m.bookmarks.resource_river.revisions.supplied.buildingOperationAssignments);return FB.mods.validate(m).length>0;});
    return {rejected:rejected,valid:FB.mods.validate(example),pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig()};
  },examples.river);
  expect(result).toEqual({rejected:Array(16).fill(true),valid:[],pure:true});
});

test('strict optional saved receipts reject altered commitments and missing resource owners without replay or repair',async function ({page},info) {
  await importExample(page,info,'river');await prepare(page,false);
  const result=await page.evaluate(function () {
    const s=FB.state,O=FB.buildingOperations,a=O.compile(FB.campaignBookmark(s)).assignments[1],who=FB.settlementHolder(s,a.countyId,a.slot);
    O.commit(s,O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who}));
    const asset=s.buildings[a.countyId].find(function(r){return r.id===a.buildingId;}),key=asset.waterOperation.id;
    const changes=[function(t){delete t.buildingOperations;},function(t){delete t.siteResources;},
      function(t){t.buildingOperations.version=2;},function(t){t.buildingOperations.definition='changed';},
      function(t){t.buildingOperations.receipts[key].amount++;},function(t){t.buildingOperations.receipts[key].paid=0;},
      function(t){t.buildingOperations.receipts[key].untilTurn+=90;},function(t){t.buildingOperations.receipts[key].sources[0].id='missing';},
      function(t){t.buildingOperations.receipts[key].resourceRevision++;},function(t){t.buildingOperations.receipts[key].authority.characterId='missing';},
      function(t){t.buildingOperations.receipts[key].extra=true;},function(t){t.buildings[a.countyId].find(function(r){return r.id===a.buildingId;}).waterOperation.revision=0;},
      function(t){t.siteResources.sources.river_intake.consumed=0;}];
    const rejected=changes.map(function(change){const t=JSON.parse(JSON.stringify(s));change(t);const before=JSON.stringify(t);
      try { FB.save.v4.validatePlatform(t);return false; } catch(error) { return before===JSON.stringify(t); }});
    return {rejected:rejected,valid:O.validate(s)};
  });
  expect(result).toEqual({rejected:Array(13).fill(true),valid:true});
});

test('settlement review preserves focus and disclosures, rejects stale cash, and requires explicit payment',async function ({page},info) {
  await importExample(page,info,'river',null,true);
  await page.evaluate(function () {
    const s=FB.state,a=FB.buildingOperations.compile(FB.campaignBookmark(s)).assignments[1];
    s.player.gold=10000;
    if (!FB.build(s,a.countyId,a.slot,a.buildingId)) throw new Error('Expected canonical player construction.');
    FB.ui.showSettlement(a.countyId,a.slot);
  });
  await page.locator('#settlement-water').click();
  const before=await page.evaluate(function(){return FB.state.player.gold;});
  await page.locator('#water-action-0').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#water-action-0')).toBeFocused();
  expect(await page.evaluate(function(){return FB.state.player.gold;})).toBe(before);
  await page.locator('#water-action-0').click();
  await page.evaluate(function(){FB.state.player.gold--;});
  await page.locator('#water-confirm').click();
  expect(await page.evaluate(function(){return FB.state.buildingOperations===undefined;})).toBe(true);
  await page.locator('#water-action-0').click();await page.locator('#water-confirm').click();
  await expect(page.locator('#water-action-0')).toBeVisible();
  await page.locator('#gm-cancel').click();
  await expect(page.locator('#settlement-water')).toBeFocused();
  expect(await page.evaluate(function(){return FB.buildingBonusIn(FB.state,'resource_bank','populationCapacity');})).toBe(0.03);
});
