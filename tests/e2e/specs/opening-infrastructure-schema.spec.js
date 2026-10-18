'use strict';
const path = require('path');
const fs = require('fs');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'js/world.js', 'js/mods.js', 'js/title_ids.js', 'js/governments.js',
  'js/government_administration.js', 'js/government_aristocracy.js', 'js/government_assembly.js',
  'js/mobile_confederations.js', 'js/fortifications.js', 'js/bookmark_setup.js',
  'js/lordships.js', 'js/main.js', 'js/save.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

const fixtureDirectory = path.resolve(__dirname, '../fixtures/authoring');
const examples = {};
for (const name of ['estuary', 'uplands']) {
  examples[name] = JSON.parse(fs.readFileSync(path.join(fixtureDirectory,
    'opening-infrastructure-' + name + '.json'), 'utf8'));
}

async function importExample(page, info, name) {
  await openGame(page, info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(fixtureDirectory,
    'opening-infrastructure-' + name + '.json'));
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function (name) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['inventory_' + name];
  }, name);
  await beginBookmark(page, info, 'inventory_' + name, 'inventory_' + name + '_household');
}

// Each fault traverses both built-in validation and ordinary detached import.
// No game module is imported into Node and no executable strategy is registered.
async function checkFaults(page, example, changes) {
  const rows = await page.evaluate(function (input) {
    const bm = FBDATA.bookmarks.inventory_estuary;
    const before = { data:JSON.stringify(FBDATA), state:JSON.stringify(FB.state),
      world:FB.world, active:FB.activeBookmark, rng:FB.getRngState(), uid:FB.getUidCounter(),
      signature:FB.mods.sig(), storage:JSON.stringify(localStorage) };
    const rows = input.changes.map(function (change) {
      const mod = JSON.parse(JSON.stringify(input.example));
      const candidate = mod.bookmarks.inventory_estuary;
      const policy = candidate.revisions.inherited.openingInfrastructure;
      if (change.policy !== undefined) candidate.revisions.inherited.openingInfrastructure = change.policy;
      if (change.placement !== undefined) policy.placements = [change.placement];
      if (change.append) policy.placements.push(change.append);
      if (change.placements) policy.placements = change.placements;
      if (change.tooMany) policy.placements = Array(2049).fill(policy.placements[0]);
      const builtIn = FB.validateBookmark(candidate).join('; ');
      const imported = FB.mods.validate(mod).join('; ');
      const compiled = FB.compileOpeningInfrastructure(candidate);
      return { builtIn:builtIn, imported:imported, compiled:compiled };
    });
    return { rows:rows, pure:before.data === JSON.stringify(FBDATA) &&
      before.state === JSON.stringify(FB.state) && before.world === FB.world &&
      before.active === FB.activeBookmark && bm === FBDATA.bookmarks.inventory_estuary &&
      before.rng === FB.getRngState() && before.uid === FB.getUidCounter() &&
      before.signature === FB.mods.sig() && before.storage === JSON.stringify(localStorage) };
  }, { example:example, changes:changes });
  expect(rows.pure).toBe(true);
  for (const row of rows.rows) {
    expect(row.builtIn).toContain('openingInfrastructure');
    expect(row.imported).toContain('openingInfrastructure');
    expect(row.compiled.errors.length).toBeGreaterThan(0);
    expect(row.compiled.placements).toEqual([]);
  }
  return rows.rows;
}

for (const name of ['estuary', 'uplands']) {
  test(name + ' imports an independent world and resolves stable slots without changing campaign facts', async function ({ page }, info) {
    await importExample(page, info, name);
    const result = await page.evaluate(function (name) {
      const s = FB.state, bm = FB.campaignBookmark(s);
      const before = JSON.stringify(s), data = JSON.stringify(FBDATA);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const plan = FB.compileOpeningInfrastructure(bm);
      const repeated = FB.compileOpeningInfrastructure(bm);
      const actual = plan.placements.map(function (row) {
        return { siteId:FB.world.sitesByProv[row.countyId].list[row.s].site,
          holderId:s.holder[row.countyId] };
      });
      return { plan:plan, repeated:repeated, actual:actual,
        pure:before === JSON.stringify(s) && data === JSON.stringify(FBDATA) &&
          rng === FB.getRngState() && uid === FB.getUidCounter(),
        review:FBDATA.techImpactReviews.features.inherited_opening_infrastructure.mode };
    }, name);
    expect(result.pure).toBe(true);
    expect(result.review).toBe('none');
    expect(result.plan.explicit).toBe(true);
    expect(result.plan.errors).toEqual([]);
    expect(result.repeated).toEqual(result.plan);
    expect(result.plan.placements).toHaveLength(4);
    result.plan.placements.forEach(function (row, index) {
      expect(result.actual[index]).toEqual({ siteId:row.siteId, holderId:row.holderId });
    });
    if (name === 'estuary') {
      expect(result.plan.placements[0]).toMatchObject({ s:1, buildingId:'inventory_store', condition:'standing' });
      expect(result.plan.placements[3]).toMatchObject({ level:2, condition:'ruined', holderId:'inventory_ridge_court' });
    } else {
      expect(result.plan.placements.map(function (row) { return row.holderId; })).toEqual([
        'inventory_upland_court', 'd_inventory_marches', 'c_inventory_pass', 'c_inventory_plateau'
      ]);
      expect(result.plan.placements[3]).toMatchObject({ level:1, condition:'standing' });
    }
  });
}

test('retained, fresh and explicit-empty revisions retain distinct policies and inherit whole fields', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const result = await page.evaluate(function () {
    const plans = ['baseline', 'inherited', 'empty'].map(function (revision) {
      return FB.compileOpeningInfrastructure(FB.bookmark('inventory_estuary', revision));
    });
    const inherited = JSON.parse(JSON.stringify(FBDATA.bookmarks.inventory_estuary));
    inherited.openingInfrastructure = { version:1, placements:[] };
    delete inherited.revisions.inherited.openingInfrastructure;
    const inheritedEmpty = FB.compileOpeningInfrastructure(inherited);
    const unknown = JSON.parse(JSON.stringify(inherited));
    unknown.revisions.inherited.unsupportedInfrastructure = {};
    const retained = JSON.parse(JSON.stringify(inherited));
    retained.revisions.retained_bad = { openingInfrastructure:{ version:2, placements:[] } };
    return { plans:plans, inheritedEmpty:inheritedEmpty,
      unknown:FB.mods.validate({ bookmarks:{ inventory_estuary:unknown } }).join('; '),
      retained:FB.mods.validate({ bookmarks:{ inventory_estuary:retained } }).join('; '),
      defaults:['867', '1066'].map(function (id) { return FB.compileOpeningInfrastructure(FB.bookmark(id)); }) };
  });
  expect(result.plans[0]).toEqual({ explicit:false, placements:[], errors:[] });
  expect(result.plans[1].placements).toHaveLength(4);
  expect(result.plans[2]).toEqual({ explicit:true, placements:[], errors:[] });
  expect(result.inheritedEmpty).toEqual(result.plans[2]);
  expect(result.unknown).toContain('Invalid world revision field');
  expect(result.retained).toContain('openingInfrastructure');
  expect(result.defaults).toEqual([result.plans[0], result.plans[0]]);
});

test('inherited declarations bypass construction knowledge, development and date requirements', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const result = await page.evaluate(function () {
    const bm = FB.bookmark('inventory_estuary'), data = JSON.stringify(bm);
    const plan = FB.compileOpeningInfrastructure(bm), def = FBDATA.buildings.inventory_store;
    return { errors:FB.validateBookmark(bm), compiled:plan.errors, unchanged:data === JSON.stringify(bm),
      year:bm.date.year, minimumYear:def.applicability.yearMin, minimumDev:def.devMin,
      localDev:bm.provinces[0].dev, knowledge:def.requiresTech };
  });
  expect(result).toEqual({ errors:[], compiled:[], unchanged:true, year:900,
    minimumYear:4000, minimumDev:9, localDev:3, knowledge:'universities' });
});

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
      if (kind === 'scenery') bm.provinces[0].wasteland = true;
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

test('site order belongs to the effective revision and matching restores keep the same compiled plan', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const before = await page.evaluate(function () {
    const bm = FB.campaignBookmark(FB.state);
    const original = FB.compileOpeningInfrastructure(bm);
    const changed = JSON.parse(JSON.stringify(bm));
    changed.provinces[0].settlements = FBDATA.settlementLayouts.inventory_estuary_layout.inventory_quay.slice().reverse();
    const reordered = FB.compileOpeningInfrastructure(changed);
    return { original:original, reordered:reordered, save:FB.save.serialize() };
  });
  expect(before.original.placements[0].s).toBe(1);
  expect(before.reordered.placements[0].s).toBe(0);
  expect(before.reordered.errors).toEqual([]);
  await restoreBookmark(page, before.save);
  expect(await page.evaluate(function () {
    return FB.compileOpeningInfrastructure(FB.campaignBookmark(FB.state));
  })).toEqual(before.original);
});

test('changed nested inventory content is part of the exact mod fingerprint and cannot restore an old save', async function ({ page }, info) {
  await importExample(page, info, 'estuary');
  const result = await page.evaluate(function (source) {
    const saved = JSON.parse(FB.save.serialize());
    const matching = !FB.save.otherWorld(saved), signature = FB.mods.sig();
    const changed = JSON.parse(JSON.stringify(source));
    changed.bookmarks.inventory_estuary.revisions.inherited.openingInfrastructure.placements[3].level = 3;
    FB.mods.apply(changed);
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    let rejected = false;
    try { FB.save.restore(saved); } catch (error) { rejected = /different mod/.test(error.message); }
    return { matching:matching, changed:signature !== FB.mods.sig(), mismatch:FB.save.otherWorld(saved),
      rejected:rejected, pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter() };
  }, examples.estuary);
  expect(result).toEqual({ matching:true, changed:true, mismatch:true, rejected:true, pure:true });
});
