'use strict';
const { test, expect } = require('../support/fixture');
const { restoreBookmark } = require('../support/game/bookmark-acceptance');
const { examples, importExample } = require('../support/game/opening-infrastructure-schema');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'js/world.js', 'js/mods.js', 'js/title_ids.js', 'js/governments.js',
  'js/government_administration.js', 'js/government_aristocracy.js', 'js/government_assembly.js',
  'js/mobile_confederations.js', 'js/fortifications.js', 'js/bookmark_setup.js',
  'js/lordships.js', 'js/main.js', 'js/save.js', 'data/map_data.js', 'data/technology.js',
  'data/eras.js', 'data/political_institutions.js'
]);

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
