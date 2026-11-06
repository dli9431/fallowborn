'use strict';

const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_routes.js','data/bookmark_634.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/geographies.js','data/geography_expansion.js','data/climate.js',
  'js/bookmark_sources.js','js/world.js','js/climate.js','js/main.js',
  'js/save.js','js/save_v4.js'
]);

test('634 inert connections retain exact physical inputs and isolate all published dates',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const packet = FBDATA.bookmarkRoutes634;
    const before = JSON.stringify({worlds:FBDATA.bookmarks,geographies:FBDATA.geographies,
      regions:FBDATA.bookmarkRegions634});
    const counties = {};
    b.provinces.forEach(function (p) { counties[p.id] = p; });
    const faults = [];
    packet.inheritedLandRoutes.concat(packet.straits).forEach(function (pair) {
      pair.slice(0,2).forEach(function (id) {
        if (!counties[id] || counties[id].wasteland) faults.push(id);
      });
    });
    const facts = {
      keys:Object.keys(packet).sort(),geography:packet.geography,
      landCount:packet.inheritedLandRoutes.length,waterCount:packet.straits.length,
      landEqual:JSON.stringify(packet.inheritedLandRoutes) ===
        JSON.stringify(FBDATA.geographies.europe_regional_2.landRoutes),
      waterEqual:JSON.stringify(packet.straits) === JSON.stringify(b.straits),
      classesEqual:JSON.stringify(packet.crossingClasses) === JSON.stringify(b.crossingClasses),
      climateEqual:JSON.stringify(packet.climate) === JSON.stringify(b.climate),
      faults:faults,fallback:FB.climateZoneOf('w_taiga',b),sahel:FB.climateZoneOf('w_sahel',b)
    };
    // The staging table is detached even when an author edits nested inputs.
    packet.inheritedLandRoutes[0][2] = 60;
    packet.straits[0][0] = 'absent_county';
    packet.crossingClasses['messina|reggio'] = 'open';
    packet.climate.provinces.medina = 'continental';
    facts.isolated = before === JSON.stringify({worlds:FBDATA.bookmarks,
      geographies:FBDATA.geographies,regions:FBDATA.bookmarkRegions634});
    return facts;
  });
  expect(result).toEqual({
    keys:['climate','crossingClasses','geography','inheritedLandRoutes','straits'],
    geography:'europe_regional_2',landCount:33,waterCount:22,
    landEqual:true,waterEqual:true,classesEqual:true,climateEqual:true,
    faults:[],fallback:'northern_temperate',sahel:'steppe',isolated:true
  });
});

test('634 detached crossing and climate candidates reject bad references without mutation',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const packet = FBDATA.bookmarkRoutes634;
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const base = copy(b);
    ['geography','straits','crossingClasses','climate'].forEach(function (key) { base[key] = copy(packet[key]); });
    const valid = FB.validateBookmark(base);
    const cases = {};
    function reject(name,change) {
      const candidate = copy(base);
      change(candidate);
      const snapshot = JSON.stringify(candidate);
      cases[name] = {faults:FB.validateBookmark(candidate),pure:snapshot === JSON.stringify(candidate)};
    }
    reject('missing',function (c) { c.straits[0][0] = 'absent_county'; });
    reject('scenery',function (c) { c.straits[0][0] = 'w_sahara_w'; });
    reject('duplicate',function (c) { c.straits.push(c.straits[0].slice().reverse()); });
    reject('classEndpoint',function (c) { c.crossingClasses['absent_county|reggio'] = 'narrow'; });
    reject('climateEndpoint',function (c) { c.climate.provinces.absent_county = 'arid'; });
    reject('climateZone',function (c) { c.climate.provinces.medina = 'absent_zone'; });
    return {valid:valid,cases:cases,pure:before === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.valid).toEqual([]);
  expect(result.pure).toBe(true);
  const messages = {missing:'broken strait',scenery:'ends in wasteland',duplicate:'duplicate strait',
    classEndpoint:'missing province',climateEndpoint:'unknown county',climateZone:'unknown zone'};
  Object.keys(messages).forEach(function (id) {
    expect(result.cases[id].faults.join('\n')).toContain(messages[id]);
    expect(result.cases[id].pure).toBe(true);
  });
});

test('634 retained physical route costs and local climates survive matching restoration',async function ({page},info) {
  await beginBookmark(page,info,'634','farmer_634');
  async function facts() {
    return page.evaluate(function () {
      const packet = FBDATA.bookmarkRoutes634, b = FB.campaignBookmark(FB.state);
      return {
        start:FB.state.start,
        routes:packet.inheritedLandRoutes.map(function (pair) {
          return [pair[0],pair[1],FB.world.landRouteUnits[pair.slice(0,2).sort().join('|')],
            !!FB.world.adj[pair[0]][pair[1]],!!FB.world.adj[pair[1]][pair[0]]];
        }),
        crossings:packet.straits.map(function (pair) { return FB.world.waterAdj[pair[0]][pair[1]]; }),
        expectedCrossings:packet.straits.map(function (pair) { return packet.crossingClasses[pair.slice().sort().join('|')]; }),
        expectedCosts:packet.inheritedLandRoutes.map(function (pair) { return pair[2]; }),
        climate:b.provinces.map(function (p) { return [p.id,FB.climateZoneOf(p.id,b)]; })
      };
    });
  }
  const before = await facts();
  expect(before.routes.map(function (r) { return r[2]; })).toEqual(before.expectedCosts);
  expect(before.routes.every(function (r) { return r[3] && r[4]; })).toBe(true);
  expect(before.crossings).toEqual(before.expectedCrossings);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await facts()).toEqual(before);
});
