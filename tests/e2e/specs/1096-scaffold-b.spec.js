'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096_scaffold_b.js','data/bookmarks.js',
  'data/bookmark_1066_inhabited.js','data/government_rollout.js',
  'data/counties.js','data/cultures.js','data/eras.js','data/geographies.js',
  'data/geography_expansion.js','data/settlements.js','data/settlements_real.js',
  'data/political_institutions.js','data/ecclesiastical_profiles.js',
  'js/model.js','js/world.js'
]);

const sourcePath = path.resolve(__dirname,'../../..','data/bookmark_1096_scaffold_b.js');
const coverage = {
  empire_rhine:'aachen cologne mainz worms trier metz strasbourg basel luxembourg nancy utrecht amsterdam groningen bremen wurzburg nurnberg bamberg frankfurt koblenz augsburg',
  empire_alps:'ulm konstanz zurich freiburg munich regensburg passau salzburg wien linz klagenfurt graz hamburg hannover braunschweig magdeburg erfurt leipzig meissen',
  italy_north:'torino aosta genoa milano pavia brescia verona trento padova venezia aquileia friuli parma modena bologna ravenna firenze pisa siena lucca',
  italy_south:'spoleto perugia ancona roma viterbo benevento capua salerno bari taranto foggia brindisi reggio cosenza palermo messina siracusa cagliari sassari ajaccio',
  britain_north_ireland:'york scarborough bamburgh durham carlisle lancaster scone dundee aberdeen elgin inverness edinburgh stirling glasgow dumbarton whithorn iona man lewis ulaid tir_eoghain tara dublin kilkenny wexford galway tuam roscommon cashel cork limerick',
  balkans:'constantinople adrianople thessaloniki serres larissa athens thebes korinth sparta ioannina dyrrachion candia serdica philippopolis skopje ohrid ras kotor bosna knin split zadar'
};

test('quadrant b accounts for each county once and resolves its declarations',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:sourcePath});
  const result = await page.evaluate(function (coverage) {
    const packets = Object.keys(coverage).map(function (key) { return FBDATA.bookmarkRegions1096[key]; });
    const realms = {}, provinces = {}, faults = [];
    packets.forEach(function (block) {
      block.realms.forEach(function (r) {
        if (realms[r.id]) faults.push('duplicate realm '+r.id);
        realms[r.id] = r;
      });
      block.provinces.forEach(function (p) {
        if (provinces[p.id]) faults.push('duplicate county '+p.id);
        provinces[p.id] = p;
      });
    });
    const opening = {id:'1096',era:'high_medieval',date:{year:1096,season:0,day:1}};
    const titles = FB.bookmark('1066','baseline').duchies;
    const physical = {};
    FB.bookmark('1066','inhabited_v2_governments_v2').provinces.forEach(function (p) { physical[p.id] = p; });
    Object.keys(coverage).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1096[key];
      if (block !== FBDATA['bookmarkRevisionContent_1096_'+key] || block.bookmarkId !== '1096' ||
          block.revision !== 'baseline') faults.push('display owner '+key);
      const actual = block.provinces.map(function (p) { return p.id; }).sort();
      if (JSON.stringify(actual) !== JSON.stringify(coverage[key].split(' ').sort())) faults.push('coverage '+key);
      if (JSON.stringify(Object.keys(block.layouts).sort()) !== JSON.stringify(actual)) faults.push('layouts '+key);
      block.provinces.forEach(function (p) {
        // England has a single owner in the separately composed southern packet.
        if (!realms[p.realm] && p.realm !== 'england_1096') faults.push('realm '+p.id);
        if (!physical[p.id] || !titles[p.duchy]) faults.push('physical/title '+p.id);
        if (p.wasteland || !Number.isInteger(p.dev) || p.dev < 1 || p.dev > 10) faults.push('habitation '+p.id);
        const communities = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
        if (communities[0].culture !== p.culture || communities[0].religion !== p.religion) faults.push('principal '+p.id);
        if (communities.reduce(function (n,c) { return n+c.populationShare0; },0) !== 10000) faults.push('shares '+p.id);
        communities.forEach(function (c) {
          if (!FBDATA.cultures[c.culture] || !FB.faithHistoricalAvailable(c.religion,opening,'community')) faults.push('identity '+p.id);
        });
        const sites = {};
        block.layouts[p.id].forEach(function (s) {
          if (!FBDATA.settlementSites[s.site] || sites[s.site]) faults.push('site '+p.id+':'+s.site);
          if (['village','town','city'].indexOf(s.kind)<0) faults.push('kind '+p.id);
          sites[s.site] = true;
        });
      });
      block.realms.forEach(function (r) {
        if (!provinces[r.capital] || provinces[r.capital].realm !== r.id) faults.push('capital '+r.id);
        if (r.liege && !realms[r.liege]) faults.push('liege '+r.id);
        if (!FBDATA.governmentForms[r.government] || !FBDATA.cultures[r.ruler.culture] ||
            !FB.faithHistoricalAvailable(r.religion,opening,'ruler')) faults.push('court '+r.id);
        if (r.administrationProfileId && !FBDATA.administrationProfiles[r.administrationProfileId]) faults.push('administration '+r.id);
        if (r.ecclesiastical && !FBDATA.ecclesiasticalProfiles[r.ecclesiastical.profileId]) faults.push('ecclesiastical '+r.id);
      });
    });
    return {faults:faults,count:Object.keys(provinces).length,realms:Object.keys(realms).length};
  },coverage);
  expect(result).toEqual({faults:[],count:132,realms:22});
});

test('staging preserves the source populations, layout order and registered worlds',async function ({page},info) {
  await openGame(page,info);
  const before = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,cultures:FBDATA.cultures,religions:FBDATA.religions,
      layouts:FBDATA.settlementLayouts,active:FB.activeBookmarkId});
  });
  await page.addScriptTag({path:sourcePath});
  const result = await page.evaluate(function (keys) {
    const source = FB.bookmark('1066','inhabited_v2_governments_v2'), byId = {}, faults = [];
    const layouts = FBDATA.settlementLayouts[source.settlementLayout];
    source.provinces.forEach(function (p) { byId[p.id] = p; });
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1096[key];
      block.provinces.forEach(function (p) {
        const old = byId[p.id];
        ['x','y','terrain','duchy','culture','religion','dev','communities'].forEach(function (field) {
          if (JSON.stringify(p[field]) !== JSON.stringify(old[field])) faults.push(p.id+':'+field);
        });
        if (JSON.stringify(block.layouts[p.id]) !== JSON.stringify(layouts[p.id] || [])) faults.push(p.id+':layout');
        if (p === old || p.communities && p.communities === old.communities ||
            block.layouts[p.id] === layouts[p.id]) faults.push(p.id+':shared object');
      });
    });
    return {faults:faults,after:JSON.stringify({bookmarks:FBDATA.bookmarks,cultures:FBDATA.cultures,
      religions:FBDATA.religions,layouts:FBDATA.settlementLayouts,active:FB.activeBookmarkId})};
  },Object.keys(coverage));
  expect(result.faults).toEqual([]);
  expect(result.after).toBe(before);
});

test('court redating retains local residents and leaves unresolved incumbents generated',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:sourcePath});
  const result = await page.evaluate(function (keys) {
    const realms = {}, provinces = {};
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1096[key];
      block.realms.forEach(function (r) { realms[r.id] = r; });
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
    });
    return {realms:realms,provinces:provinces};
  },Object.keys(coverage));
  const r = result.realms, p = result.provinces;
  const named = {
    hre_1096:['Henry IV',1050],canossa_1096:['Matilda of Canossa',1046],
    papacy_1096:['Urban II',1040],bohemond_lordships_1096:['Bohemond',1054],
    sicily_1096:['Roger I',1030],byzantium_1096:['Alexios I Komnenos',1057]
  };
  Object.keys(r).forEach(function (id) {
    if (named[id]) {
      expect([r[id].ruler.name,r[id].ruler.born]).toEqual(named[id]);
      expect(r[id].ruler.generated).toBeUndefined();
    } else {
      expect(r[id].ruler.generated).toBe(true);
      expect(r[id].ruler.name).toBeUndefined();
      expect(r[id].ruler.born).toBeGreaterThanOrEqual(1041);
      expect(r[id].ruler.born).toBeLessThanOrEqual(1076);
    }
    expect(r[id].royalCourt).toBeUndefined();
  });
  expect(r.canossa_1096.ruler.sex).toBe('f');
  expect(r.canossa_1096.liege).toBeUndefined();
  expect(r.byzantium_1096.government).toBe('administrative_monarchy');
  expect(r.byzantium_1096.administrationProfileId).toBe('byzantine_1066');
  expect(r.papacy_1096.ecclesiastical).toEqual({profileId:'papal_temporal_1066',officeId:'catholic',institutionId:null});
  ['taranto','bari','brindisi'].forEach(function (id) { expect(p[id].realm).toBe('bohemond_lordships_1096'); });
  ['palermo','messina','siracusa'].forEach(function (id) { expect(p[id].realm).toBe('sicily_1096'); });
  expect(p.palermo.religion).toBe('sunni');
  expect(r.sicily_1096.religion).toBe('catholic');
  expect(p.bari.communities.map(function (c) { return c.religion; })).toEqual(['catholic','orthodox']);
  expect(p.mainz.communities.some(function (c) { return c.culture === 'ashkenazi' && c.religion === 'jewish'; })).toBe(true);
  expect(p.modena.realm).toBe('canossa_1096');
  expect(p.milano.realm).toBe('hre_1096');
  expect(p.knin.realm).toBe('croatia_1096');
  expect(p.york.realm).toBe('england_1096');
});
