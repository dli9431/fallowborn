'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241_scaffold_b.js','data/bookmark_1204.js',
  'data/bookmark_1204_terrain.js','data/bookmarks.js','data/counties.js',
  'data/map_data.js','data/cultures.js','data/eras.js','data/geographies.js',
  'data/geography_expansion.js','data/settlements.js','data/settlements_real.js',
  'data/political_institutions.js','data/civic_profiles.js','data/ecclesiastical_profiles.js',
  'js/model.js'
]);

const coverage = {
  rus_south:'kiev pereyaslavl chernigov kursk turov volodymyr lutsk',
  britain_north_ireland:'scone dundee aberdeen elgin inverness edinburgh stirling glasgow dumbarton whithorn iona man lewis ulaid tir_eoghain tara dublin kilkenny wexford galway tuam roscommon cashel cork limerick',
  iberia_north_interior:'coruna santiago ourense lugo oviedo leon astorga zamora burgos santander alava salamanca avila caceres pamplona logrono aragon toledo cuenca guadalajara',
  iberia_south_east:'sevilla cordoba ecija niebla granada malaga almeria guadix badajoz merida evora lisboa santarem coimbra silves beja valencia murcia denia albacete tortosa tarragona lerida zaragoza huesca tudela mallorca barcelona girona urgell',
  empire_north:'hamburg hannover braunschweig magdeburg erfurt leipzig meissen bremen mecklenburg lubeck',
  italy_north:'torino aosta genoa milano pavia brescia verona trento padova venezia aquileia friuli parma modena bologna ravenna firenze pisa siena lucca',
  italy_south_papacy:'spoleto perugia ancona roma viterbo benevento capua salerno bari taranto foggia brindisi reggio cosenza palermo messina siracusa cagliari sassari ajaccio'
};

test('1241 quadrant b has complete disjoint county blocks and valid references',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (coverage) {
    const faults = [], provinces = {}, realms = {};
    const outside = ['england_1241','hre_1241'];
    const opening = {id:'1241',era:'high_medieval',date:{year:1241,season:0,day:1}};
    Object.keys(coverage).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      if (!block) { faults.push('missing block '+key); return; }
      block.provinces.forEach(function (p) {
        if (provinces[p.id]) faults.push('duplicate county '+p.id);
        provinces[p.id] = p;
      });
      block.realms.forEach(function (r) {
        if (realms[r.id]) faults.push('duplicate court '+r.id);
        realms[r.id] = r;
      });
    });
    Object.keys(coverage).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      if (!block) return;
      const actual = block.provinces.map(function (p) { return p.id; }).sort();
      if (JSON.stringify(actual) !== JSON.stringify(coverage[key].split(' ').sort())) faults.push('partition '+key);
      if (JSON.stringify(Object.keys(block.layouts).sort()) !== JSON.stringify(actual)) faults.push('layouts '+key);
      block.provinces.forEach(function (p) {
        if (!realms[p.realm] && outside.indexOf(p.realm)<0) faults.push('owner '+p.id);
        if (p.wasteland || !Number.isInteger(p.dev) || p.dev<1 || p.dev>10) faults.push('habitation '+p.id);
        const duchy = block.duchies[p.duchy];
        const kingdom = duchy && block.kingdoms[duchy.kingdom];
        if (!kingdom || !block.empires[kingdom.empire]) faults.push('title chain '+p.id);
        if (!p.communities.length || p.communities[0].culture !== p.culture ||
            p.communities[0].religion !== p.religion) faults.push('principal community '+p.id);
        if (p.communities.reduce(function (sum,c) { return sum+c.populationShare0; },0) !== 10000) faults.push('shares '+p.id);
        p.communities.forEach(function (c) {
          if (!FBDATA.cultures[c.culture] || !FB.faithHistoricalAvailable(c.religion,opening,'community')) faults.push('community '+p.id);
        });
        const seen = {};
        block.layouts[p.id].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site] || seen[slot.site]) faults.push('site '+p.id+':'+slot.site);
          if (['village','town','city'].indexOf(slot.kind)<0) faults.push('kind '+p.id);
          seen[slot.site] = true;
        });
      });
      block.realms.forEach(function (r) {
        if (!/_1241$/.test(r.id)) faults.push('court date '+r.id);
        if (!provinces[r.capital] || provinces[r.capital].realm !== r.id) faults.push('capital '+r.id);
        if (r.liege && !realms[r.liege] && outside.indexOf(r.liege)<0) faults.push('liege '+r.id);
        if (!FBDATA.governmentForms[r.government] || !FBDATA.cultures[r.ruler.culture] ||
            !FB.faithHistoricalAvailable(r.religion,opening,'ruler')) faults.push('court identity '+r.id);
        if (r.ecclesiastical && !FBDATA.ecclesiasticalProfiles[r.ecclesiastical.profileId]) faults.push('office '+r.id);
      });
    });
    return {faults:faults,count:Object.keys(provinces).length,courts:Object.keys(realms).length};
  },coverage);
  expect(result).toEqual({faults:[],count:132,courts:23});
});

test('1241 quadrant b retains the explicit 1204 inhabited source without shared objects',async function ({page},info) {
  await openGame(page,info);
  const faults = await page.evaluate(function (keys) {
    const source = FB.bookmark('1204','inhabited_v2'), old = {}, faults = [];
    const layouts = FBDATA.settlementLayouts[source.settlementLayout];
    source.provinces.forEach(function (p) { old[p.id] = p; });
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        const prior = old[p.id];
        ['name','x','y','terrain','duchy','culture','religion','dev','communities'].forEach(function (field) {
          if (JSON.stringify(p[field]) !== JSON.stringify(prior[field])) faults.push(p.id+':'+field);
        });
        if (JSON.stringify(block.layouts[p.id]) !== JSON.stringify(layouts[p.id])) faults.push(p.id+':ordered layout');
        if (p === prior || p.communities === prior.communities || block.layouts[p.id] === layouts[p.id] ||
            block.layouts[p.id][0] === layouts[p.id][0]) faults.push(p.id+':shared object');
      });
    });
    return faults;
  },Object.keys(coverage));
  expect(faults).toEqual([]);
});

test('1241 redating removes obsolete incumbents and separates conquest from residents',async function ({page},info) {
  await openGame(page,info);
  const data = await page.evaluate(function (keys) {
    const realms = {}, provinces = {};
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.realms.forEach(function (r) { realms[r.id] = r; });
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
    });
    return {realms:realms,provinces:provinces};
  },Object.keys(coverage));
  const r = data.realms, p = data.provinces;
  const named = {castile_leon_1241:['Ferdinand III',1201],aragon_1241:['James I',1208],papacy_1241:['Gregory IX',1170]};
  Object.keys(r).forEach(function (id) {
    if (named[id]) {
      expect([r[id].ruler.name,r[id].ruler.born]).toEqual(named[id]);
      expect(r[id].ruler.generated).toBeUndefined();
    } else {
      expect(r[id].ruler.generated).toBe(true);
      expect(r[id].ruler.name).toBeUndefined();
      expect(r[id].ruler.born).toBeGreaterThanOrEqual(1186);
      expect(r[id].ruler.born).toBeLessThanOrEqual(1221);
    }
    ['royalCourt','civicRights','mobile','recognition','institutions'].forEach(function (field) {
      expect(r[id][field]).toBeUndefined();
    });
  });
  expect(r.england_1241).toBeUndefined();
  expect(r.hre_1241).toBeUndefined();
  expect(r.sicily_1241).toBeUndefined();
  expect(r.venice_1241.government).toBe('territorial');
  expect(r.venice_1241.civicProfileId).toBeUndefined();
  expect(r.papacy_1241.ecclesiastical).toEqual({profileId:'papal_temporal_1204',officeId:'catholic',institutionId:null});
  ['leon','burgos','caceres','cordoba'].forEach(function (id) { expect(p[id].realm).toBe('castile_leon_1241'); });
  expect(p.valencia.realm).toBe('aragon_1241');
  expect(p.cordoba.religion).toBe('sunni');
  expect(p.valencia.religion).toBe('sunni');
  expect(r.castile_leon_1241.religion).toBe('catholic');
  expect(r.mallorca_local_1241.liege).toBe('aragon_1241');
  expect(p.mallorca.religion).toBe('sunni');
  ['spoleto','ancona','palermo','messina','siracusa','mecklenburg','lubeck'].forEach(function (id) {
    expect(p[id].realm).toBe('hre_1241');
  });
  expect(p.palermo.communities.some(function (c) { return c.religion === 'sunni'; })).toBe(true);
  ['kiev','pereyaslavl'].forEach(function (id) { expect(p[id].realm).toBe('kyiv_local_1241'); });
  expect(p.volodymyr.realm).toBe('volhynia_local_1241');
  expect(p.dublin.realm).toBe('england_1241');
  expect(p.braunschweig.realm).toBe('brunswick_1241');
});

test('loading the 1241 blocks preserves registered worlds, sibling blocks and campaign state',async function ({page},info) {
  await openGame(page,info);
  const snapshot = function (keys) {
    const siblings = {};
    Object.keys(FBDATA.bookmarkRegions1241 || {}).forEach(function (key) {
      if (keys.indexOf(key)<0) siblings[key] = FBDATA.bookmarkRegions1241[key];
    });
    return JSON.stringify({bookmarks:FBDATA.bookmarks,cultures:FBDATA.cultures,religions:FBDATA.religions,
      layouts:FBDATA.settlementLayouts,starts:FBDATA.startScenarios,stories:FBDATA.storyInstances,
      siblings:siblings,state:FB.state,active:FB.activeBookmarkId});
  };
  const before = await page.evaluate(snapshot,Object.keys(coverage));
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1241_scaffold_b.js')});
  expect(await page.evaluate(snapshot,Object.keys(coverage))).toBe(before);
});
