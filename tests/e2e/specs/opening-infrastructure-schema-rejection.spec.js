'use strict';
const { test, expect } = require('../support/fixture');
const { examples, importExample, checkFaults } = require('../support/game/opening-infrastructure-schema');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'js/world.js', 'js/mods.js', 'js/title_ids.js', 'js/governments.js',
  'js/government_administration.js', 'js/government_aristocracy.js', 'js/government_assembly.js',
  'js/mobile_confederations.js', 'js/fortifications.js', 'js/bookmark_setup.js',
  'js/lordships.js', 'js/main.js', 'js/save.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

test('malformed policies and inventory bounds fail without publishing a valid prefix', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  await checkFaults(page, examples.estuary, [
    { policy:null }, { policy:[] }, { policy:{} }, { policy:{ version:2, placements:[] } },
    { policy:{ version:1, placements:{} } }, { policy:{ version:1, placements:[], progress:0.5 } },
    { tooMany:true }
  ]);
});

test('placement records reject unsupported conditions, unfinished work and numeric slot authoring', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const valid = examples.estuary.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[0];
  await checkFaults(page, examples.estuary, [
    { placement:null }, { placement:[] }, { placement:Object.assign({}, valid, { condition:'building' }) },
    { placement:Object.assign({}, valid, { progress:0.5 }) },
    { placement:Object.assign({}, valid, { s:1 }) },
    { placement:Object.assign({}, valid, { condition:null }) },
    { placement:Object.assign({}, valid, { buildingId:'unknown_inventory_building' }) },
    { placement:Object.assign({}, valid, { level:1 }) }
  ]);
});

test('fort records accept only supported canonical completed levels', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const fort = examples.estuary.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[3];
  const missing = Object.assign({}, fort); delete missing.level;
  await checkFaults(page, examples.estuary, [ { placement:missing } ].concat(
    [0, 5, 1.5, '2', null].map(function (level) { return { placement:Object.assign({}, fort, { level:level }) }; })
  ));
});

test('whole inventories enforce site, county, group and scoped holder limits including ruins', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const placements = examples.estuary.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements;
  const store = placements[0], workshop = placements[1];
  const rows = await checkFaults(page, examples.estuary, [
    { append:Object.assign({}, store, { condition:'ruined' }) },
    { append:Object.assign({}, store, { countyId:'inventory_marsh', siteId:'inventory_marsh_town', condition:'ruined' }) },
    { append:Object.assign({}, workshop, { siteId:'inventory_quay_store' }) },
    { placements:[0, 1, 2].map(function (n) { return Object.assign({}, workshop,
      { siteId:['inventory_quay_hall', 'inventory_quay_store', 'inventory_quay_hall'][n],
        buildingId:n === 2 ? 'inventory_yard' : 'inventory_workshop' }); }) }
  ]);
  expect(rows[0].imported).toContain('repeats a site/building pair');
  expect(rows[1].imported).toContain('maxDemesne');
  expect(rows[2].imported).toContain('constructionGroup');
  expect(rows[3].imported).toContain('constructionGroup');
  // Give one county two legal sites so a second fort tests the county rule,
  // rather than merely failing stable-site membership.
  const result = await page.evaluate(function () {
    const bm = JSON.parse(JSON.stringify(FB.bookmark('inventory_estuary')));
    bm.openingInfrastructure = { version:1, placements:[
      { countyId:'inventory_quay', siteId:'inventory_quay_hall', buildingId:'walls', condition:'standing', level:1 },
      { countyId:'inventory_quay', siteId:'inventory_quay_store', buildingId:'walls', condition:'ruined', level:2 }
    ] };
    return { builtIn:FB.validateBookmark(bm).join('; '),
      imported:FB.mods.validate({ bookmarks:{ inventory_estuary:bm } }).join('; ') };
  });
  expect(result.builtIn).toContain('single fortification');
  expect(result.imported).toContain('single fortification');
});

test('maxCounty and inherited group limits count every declared physical asset', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const result = await page.evaluate(function (mod) {
    const bm = mod.bookmarks.inventory_estuary;
    const store = bm.revisions.inherited.openingInfrastructure.placements[0];
    const list = mod.settlementLayouts.inventory_estuary_layout.inventory_quay;
    mod.geographies.inventory_estuary_land.sites.inventory_quay_annex = { x:1.6, y:2.2 };
    list.push({ site:'inventory_quay_annex', name:'Quay Annex', kind:'village' });
    mod.buildings.inventory_workshop.constructionGroup.maxCounty = 4;
    mod.buildings.inventory_yard.constructionGroup.maxCounty = 4;
    bm.revisions.inherited.openingInfrastructure.placements = list.map(function (site) {
      return Object.assign({}, store, { siteId:site.site, buildingId:'inventory_workshop', condition:'ruined' });
    });
    return FB.mods.validate(mod).join('; ');
  }, examples.estuary);
  expect(result).toContain('exceeds building maxCounty');
});

test('scoped limits distinguish subordinate courts and change with their holder strategies', async function ({ page }, info) {
  await importExample(page, info, 'uplands');
  const result = await page.evaluate(function (source) {
    const bm = JSON.parse(JSON.stringify(FBDATA.bookmarks.inventory_uplands));
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const distinct = FB.compileOpeningInfrastructure(bm);
    bm.realms[0].government = 'regnum';
    const direct = FB.compileOpeningInfrastructure(bm);
    const imported = FB.mods.validate({ bookmarks:{ inventory_uplands:bm } });
    // New unrelated care alternatives really have the one-place capacity.
    const mod = JSON.parse(JSON.stringify(source));
    mod.bookmarks.inventory_uplands.openingInfrastructure.placements.push({
      countyId:'inventory_vale', siteId:'inventory_vale_hall', buildingId:'inventory_guest_house', condition:'ruined'
    });
    return { distinct:distinct.errors, direct:direct, imported:imported.join('; '),
      care:FB.mods.validate(mod).join('; '), pure:before === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples.uplands);
  expect(result.pure).toBe(true);
  expect(result.distinct).toEqual([]);
  expect(result.direct.errors.join('; ')).toContain('maxDemesne');
  expect(result.direct.placements).toEqual([]);
  expect(result.imported).toContain('maxDemesne');
  expect(result.care).toContain('constructionGroup');
});

test('two courts under one sovereign have separate inherited demesne limits', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const result = await page.evaluate(function () {
    const bm = JSON.parse(JSON.stringify(FB.bookmark('inventory_estuary')));
    bm.openingInfrastructure.placements.push({ countyId:'inventory_ridge', siteId:'inventory_ridge_tower',
      buildingId:'inventory_store', condition:'ruined' });
    const plan = FB.compileOpeningInfrastructure(bm);
    return { plan:plan, errors:FB.mods.validate({ bookmarks:{ inventory_estuary:bm } }),
      sameSovereign:FB.state.owner.inventory_quay === FB.state.owner.inventory_ridge,
      stores:plan.placements.filter(function (row) { return row.buildingId === 'inventory_store'; })
        .map(function (row) { return row.holderId; }) };
  });
  expect(result.errors).toEqual([]);
  expect(result.plan.errors).toEqual([]);
  expect(result.sameSovereign).toBe(true);
  expect(result.stores).toEqual(['inventory_estuary_court', 'inventory_ridge_court']);
});

test('missing, mismatched, generated, moved and unestablished site identities fail closed', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const valid = examples.estuary.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[0];
  await checkFaults(page, examples.estuary, [
    { placement:Object.assign({}, valid, { countyId:'unknown_inventory_county' }) },
    { placement:Object.assign({}, valid, { countyId:'inventory_scenery' }) },
    { placement:Object.assign({}, valid, { countyId:'inventory_marsh' }) },
    { placement:Object.assign({}, valid, { siteId:'generated__inventory_quay__1' }) },
    { placement:Object.assign({}, valid, { siteId:'Quay Stores' }) }
  ]);
  const result = await page.evaluate(function (source) {
    function candidate(kind) {
      const mod = JSON.parse(JSON.stringify(source)), bm = mod.bookmarks.inventory_estuary;
      bm.revisions.inherited.openingInfrastructure.placements = [bm.revisions.inherited.openingInfrastructure.placements[0]];
      if (kind === 'moved') bm.provinces[0].x = 1.6;
      if (kind === 'scenery') {
        bm.provinces[0].wasteland = true;
        // Keep the independent ruler start on a settled seat; only the
        // inventory's original site is being made unavailable in this case.
        bm.realms[0].capital = 'inventory_marsh';
        mod.startScenarios.find(function (row) {return row.id === 'inventory_estuary_ruler';}).fixedProvinceId = 'inventory_marsh';
        const placements=bm.revisions.inherited.openingInfrastructure.placements;
        bm.revisions.inherited.openingInfrastructure.placements=[];
        const faults=FB.mods.validate(mod);
        if (faults.length) throw new Error('Scenery control: '+faults.join('; '));
        bm.revisions.inherited.openingInfrastructure.placements=placements;
      }
      if (kind === 'missing') delete mod.geographies.inventory_estuary_land.sites.inventory_quay_store;
      if (kind === 'duplicate') mod.settlementLayouts.inventory_estuary_layout.inventory_marsh.push(
        { site:'inventory_quay_store', name:'Wrong county store', kind:'village' });
      if (kind === 'unestablished') {
        const sites = mod.geographies.inventory_estuary_land.sites;
        const layout = mod.settlementLayouts.inventory_estuary_layout.inventory_quay;
        while (layout.length < 8) {
          const id = 'inventory_fill_' + layout.length;
          sites[id] = { x:1.5, y:2.1 };
          layout.push({ site:id, name:'Fill ' + layout.length, kind:'village', fill:true });
        }
        bm.revisions.inherited.openingInfrastructure.placements[0].siteId = 'inventory_fill_7';
      }
      return FB.mods.validate(mod).join('; ');
    }
    return ['moved', 'scenery', 'missing', 'duplicate', 'unestablished'].map(candidate);
  }, examples.estuary);
  result.forEach(function (error) { expect(error).toContain('openingInfrastructure'); });
});
