'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'data/bookmarks.js','data/counties.js','data/map_data.js','data/cultures.js','data/traits.js',
  'data/eras.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/political_institutions.js',
  'js/model.js','js/util.js','js/world.js','js/population.js','js/main.js',
  'js/bookmark_setup.js','js/save.js','js/save_v4.js','data/government_rollout.js'
]);

const coverage = {
  empire_rhine_alps:'metz verdun nancy strasbourg basel aachen trier cologne wurzburg nurnberg bamberg frankfurt mainz worms koblenz augsburg ulm konstanz zurich freiburg munich regensburg passau salzburg wien linz klagenfurt graz',
  scandinavia:'agder stavanger bergen oslo tonsberg trondheim halogaland uppsala birka skara vaxjo kalmar visby norrland arhus viborg hedeby ribe roskilde lund torne_district w_lapland',
  baltic_finnic:'sambia natangia samogitia vilnius riga jersika tallinn tartu turku hame savo kexholm',
  balkans_croatia:'sirmium osijek pliska silistra vidin serdica philippopolis skopje ohrid ras kotor bosna knin split zadar zagreb sisak',
  greek_latin_courts:'constantinople adrianople thessaloniki serres larissa athens thebes korinth sparta ioannina dyrrachion candia',
  anatolia_black_sea:'nicaea dorylaion ancyra amorion smyrna sardis ephesos attaleia ikonion caesarea sebasteia trebizond sinope tarsos adana nicosia cherson',
  levant_jazira:'damascus homs aleppo hama manbij antioch jerusalem acre amman mosul amida edessa harran raqqa palmyra_district w_syrian',
  egypt:'alexandria rosetta fustat fayyum asyut luxor aswan siwa_oasis'
};

test('1241 quadrant c owns exactly its county partition and resolves its shared courts once',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (coverage) {
    const faults = [], provinces = {}, courts = {}, outside = {}, scenery = [];
    const opening = {id:'1241',era:'high_medieval',date:{year:1241,season:0,day:1}};
    Object.keys(coverage).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      if (!block) { faults.push('missing block '+key); return; }
      const ids = block.provinces.map(function (p) { return p.id; }).sort();
      if (JSON.stringify(ids) !== JSON.stringify(coverage[key].split(' ').sort())) faults.push('partition '+key);
      block.provinces.forEach(function (p) {
        if (provinces[p.id]) faults.push('duplicate county '+p.id);
        provinces[p.id] = p;
      });
      block.realms.forEach(function (r) {
        if (courts[r.id]) faults.push('duplicate court '+r.id);
        courts[r.id] = r;
      });
    });
    Object.keys(coverage).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      if (!block) return;
      const settled = block.provinces.filter(function (p) { return !p.wasteland; }).map(function (p) { return p.id; }).sort();
      if (JSON.stringify(Object.keys(block.layouts).sort()) !== JSON.stringify(settled)) faults.push('layout partition '+key);
      block.provinces.forEach(function (p) {
        if (p.wasteland) {
          scenery.push(p.id);
          if (p.realm || p.communities || p.settlements || block.layouts[p.id]) faults.push('scenery habitation '+p.id);
          return;
        }
        if (!courts[p.realm]) outside[p.realm] = true;
        if (!Number.isInteger(p.dev) || p.dev<1 || p.dev>10) faults.push('development '+p.id);
        if (p.duchy) {
          const duchy = block.duchies[p.duchy], kingdom = duchy && block.kingdoms[duchy.kingdom];
          if (!kingdom || !block.empires[kingdom.empire]) faults.push('title chain '+p.id);
        }
        if (!p.communities.length || p.communities[0].culture !== p.culture ||
            p.communities[0].religion !== p.religion) faults.push('principal community '+p.id);
        if (p.communities.reduce(function (sum,c) { return sum+c.populationShare0; },0) !== 10000) faults.push('shares '+p.id);
        const pairs = {}, sites = {};
        p.communities.forEach(function (c) {
          const pair = c.culture+':'+c.religion;
          if (pairs[pair] || !FBDATA.cultures[c.culture] ||
              !FB.faithHistoricalAvailable(c.religion,opening,'community')) faults.push('community '+p.id+':'+pair);
          pairs[pair] = true;
        });
        block.layouts[p.id].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site] || sites[slot.site] ||
              ['village','town','city'].indexOf(slot.kind)<0) faults.push('site '+p.id+':'+slot.site);
          sites[slot.site] = true;
        });
      });
      block.realms.forEach(function (r) {
        const capital = provinces[r.capital];
        if (!/_1241$/.test(r.id) || !capital || capital.wasteland || capital.realm !== r.id) faults.push('capital '+r.id);
        if (r.liege && !courts[r.liege]) faults.push('liege '+r.id);
        if (!FBDATA.governmentForms[r.government] || !FBDATA.cultures[r.ruler.culture] ||
            !FBDATA.traits[r.ruler.trait] || !FB.faithHistoricalAvailable(r.religion,opening,'ruler')) faults.push('court identity '+r.id);
      });
    });
    const all = {}, allCourts = {};
    Object.keys(FBDATA.bookmarkRegions1241).forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        if (all[p.id]) faults.push('overlapping sibling county '+p.id);
        all[p.id] = p;
      });
      block.realms.forEach(function (r) {
        if (allCourts[r.id]) faults.push('overlapping sibling court '+r.id);
        allCourts[r.id] = r;
      });
    });
    Object.keys(outside).forEach(function (id) {
      if (!allCourts[id] || !all[allCourts[id].capital] || all[allCourts[id].capital].realm !== id) faults.push('outside court '+id);
    });
    return {faults:faults,count:Object.keys(provinces).length,courts:Object.keys(courts).length,
      outside:Object.keys(outside).sort(),scenery:scenery.sort()};
  },coverage);
  expect(result).toEqual({faults:[],count:132,courts:38,outside:['hungary_1241','venice_1241'],
    scenery:['torne_district','w_lapland','w_syrian']});
});

test('1241 quadrant c preserves the retained inhabited source and independent ordered layouts',async function ({page},info) {
  await openGame(page,info);
  const faults = await page.evaluate(function (keys) {
    const source = FB.bookmark('1204','inhabited_v2'), old = {}, faults = [];
    const layouts = FBDATA.settlementLayouts[source.settlementLayout];
    source.provinces.forEach(function (p) { old[p.id] = p; });
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        const prior = old[p.id];
        ['name','x','y','terrain','duchy','culture','religion','dev','communities','wasteland','maxRadiusKm','names'].forEach(function (field) {
          // Turku's independently reviewed Christian presence is the only
          // resident correction; every other retained source field agrees.
          if (p.id === 'turku' && field === 'communities') {
            if (JSON.stringify(p[field]) !== JSON.stringify([
              {culture:'finnic',religion:'baltic_pagan',populationShare0:8500},
              {culture:'finnic',religion:'catholic',populationShare0:1500}
            ])) faults.push(p.id+':'+field);
          } else if (JSON.stringify(p[field]) !== JSON.stringify(prior[field])) faults.push(p.id+':'+field);
        });
        if (p === prior || (p.communities && (p.communities === prior.communities || p.communities[0] === prior.communities[0]))) faults.push(p.id+':shared county');
        if (p.wasteland) return;
        if (JSON.stringify(block.layouts[p.id]) !== JSON.stringify(layouts[p.id])) faults.push(p.id+':ordered layout');
        if (block.layouts[p.id] === layouts[p.id] || block.layouts[p.id][0] === layouts[p.id][0]) faults.push(p.id+':shared layout');
        if (p.customaryRights || p.institutions) faults.push(p.id+':copied legal declaration');
      });
    });
    return faults;
  },Object.keys(coverage));
  expect(faults).toEqual([]);
});

test('1241 courts replace obsolete rulers while preserving the distinction between courts and residents',async function ({page},info) {
  await openGame(page,info);
  const data = await page.evaluate(function (keys) {
    const realms = {}, provinces = {}, operations = [];
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.realms.forEach(function (r) { realms[r.id] = r; });
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      ['opening','stories','campaigns','scripted','starts','religiousHeads','localInstitutions'].forEach(function (field) {
        if (block[field] && Object.keys(block[field]).length) operations.push(key+':'+field);
      });
    });
    return {realms:realms,provinces:provinces,operations:operations};
  },Object.keys(coverage));
  const r = data.realms, p = data.provinces;
  const named = {hre_1241:['Frederick II',1194],norway_1241:['Hakon IV Hakonsson',1204],
    latin_1241:['Baldwin II',1217],nicaea_1241:['John III Vatatzes',1193],
    bavaria_1241:['Otto II',1206],austria_styria_1241:['Frederick II of Austria',1210],
    carinthia_1241:['Bernhard of Sponheim',1179],sweden_1241:['Erik Eriksson',1216],
    denmark_1241:['Valdemar II',1170],bulgaria_1241:['Ivan Asen II',1190],
    rum_1241:['Kaykhusraw II',1221],cyprus_1241:['Henry I of Lusignan',1217],
    karak_1241:['al-Nasir Dawud',1206]};
  expect(Object.keys(r).filter(function (id) { return r[id].ruler.name; }).sort()).toEqual(Object.keys(named).sort());
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
    expect(r[id].government).toBe('territorial');
    ['royalCourt','civicRights','civicProfileId','constituency','mobile','nonTerritorial','ecclesiastical','recognition','institutions'].forEach(function (field) {
      expect(r[id][field]).toBeUndefined();
    });
  });
  expect(Object.keys(r).filter(function (id) { return r[id].ruler.name === 'Frederick II'; })).toEqual(['hre_1241']);
  expect(r.sicily_1241).toBeUndefined();
  expect(r.hungary_1241).toBeUndefined();
  expect(r.venice_1241).toBeUndefined();
  expect(r.nicaea_1241.capital).toBe('nicaea');
  expect(p.nicaea.realm).toBe('nicaea_1241');
  expect(r.bavaria_1241.liege).toBe('hre_1241');
  ['knin','split','zagreb','sisak'].forEach(function (id) { expect(p[id].realm).toBe('hungary_1241'); });
  ['zadar','candia'].forEach(function (id) { expect(p[id].realm).toBe('venice_1241'); });
  ['athens','thebes'].forEach(function (id) { expect(p[id].realm).toBe('athens_1241'); });
  ['korinth','sparta'].forEach(function (id) { expect(p[id].realm).toBe('morea_1241'); });
  expect(r.athens_1241.religion).toBe('catholic');
  expect(p.athens.religion).toBe('orthodox');
  expect(r.riga_1241.religion).toBe('catholic');
  expect(p.riga.religion).toBe('baltic_pagan');
  ['sinope','attaleia','amida'].forEach(function (id) { expect(p[id].realm).toBe('rum_1241'); });
  ['damascus','jerusalem'].forEach(function (id) { expect(p[id].realm).toBe('damascus_1241'); });
  ['edessa','harran','raqqa','palmyra_district'].forEach(function (id) { expect(p[id].realm).toBe('jazira_local_1241'); });
  expect(p.acre.realm).toBe('acre_court_1241');
  expect(p.fustat.realm).toBe('egypt_1241');
  expect(p.fustat.communities.some(function (c) { return c.culture === 'coptic' && c.religion === 'eastern'; })).toBe(true);
  expect(r.siwa_households_1241.ruler.culture).toBe('berber');
  expect(data.operations).toEqual([]);
});

test('1241 corrected local courts preserve imperial scope, residents and unresolved authorities',async function ({page},info) {
  await openGame(page,info);
  const data = await page.evaluate(function (keys) {
    const realms = {}, provinces = {};
    keys.forEach(function (key) {
      FBDATA.bookmarkRegions1241[key].realms.forEach(function (r) { realms[r.id] = r; });
      FBDATA.bookmarkRegions1241[key].provinces.forEach(function (p) { provinces[p.id] = p; });
    });
    return {realms:realms,provinces:provinces,validation:FB.validateBookmark(FB.bookmark('1241'))};
  },Object.keys(coverage));
  const r = data.realms, p = data.provinces;
  ['wien','linz','graz'].forEach(function (id) { expect(p[id].realm).toBe('austria_styria_1241'); });
  expect(p.klagenfurt.realm).toBe('carinthia_1241');
  ['austria_styria_1241','carinthia_1241'].forEach(function (id) {
    expect(r[id]).toMatchObject({rank:2,religion:'catholic',liege:'hre_1241'});
  });
  expect(r.austria_styria_1241.capital).toBe('wien');
  expect(r.carinthia_1241.capital).toBe('klagenfurt');
  expect(p.tallinn.realm).toBe('denmark_1241');
  expect(p.tartu.realm).toBe('tartu_1241');
  expect(r.tartu_1241).toMatchObject({capital:'tartu',rank:1,religion:'catholic',techTraditions:['latin'],
    ruler:{culture:'german',generated:true,born:1206}});
  ['tallinn','tartu'].forEach(function (id) {
    expect(p[id].communities).toEqual([{culture:'finnic',religion:'baltic_pagan',populationShare0:10000}]);
  });
  expect(p.turku.realm).toBe('finland_local_1241');
  ['adrianople','serres'].forEach(function (id) {
    expect(p[id]).toMatchObject({realm:'bulgaria_1241',culture:'greek',religion:'orthodox'});
  });
  expect(r.cilicia_1241.capital).toBe('adana');
  expect(r.cilicia_1241.ruler.generated).toBe(true);
  ['homs','hama','amman'].forEach(function (id,index) {
    const court = ['homs_1241','hama_1241','karak_1241'][index];
    expect(p[id].realm).toBe(court);
    expect(r[court]).toMatchObject({capital:id,rank:2,religion:'sunni',ruler:{culture:'arabic'}});
    expect(r[court].liege).toBeUndefined();
  });
  expect(r.homs_1241.ruler.generated).toBe(true);
  expect(r.hama_1241.ruler.generated).toBe(true);
  ['homs','amman'].forEach(function (id) { expect(p[id].religion).toBe('shia'); });
  expect(p.jersika.realm).toBe('livonian_local_1241');
  expect(r.bulgaria_1241.capital).toBe('pliska');
  expect(p.larissa.realm).toBe('thessalonica_1241');
  ['bosnia_1241','serbia_1241','trebizond_1241','egypt_1241','acre_court_1241'].forEach(function (id) {
    expect(r[id].ruler.generated).toBe(true);
  });
  expect(data.validation).toEqual([]);
});

test('1241 corrected holders, named people and Turku communities survive creation and restore',async function ({page},info) {
  await beginBookmark(page,info,'1241','farmer');
  function snapshot() {
    const s = FB.state, ids = ['austria_styria_1241','carinthia_1241','tartu_1241','homs_1241','hama_1241','karak_1241'];
    const communities = FB.countyCommunities(s,'turku');
    return {
      owners:['wien','linz','graz','klagenfurt','tallinn','tartu','adrianople','serres','homs','hama','amman']
        .map(function (id) { return [id,s.holder[id],s.owner[id]]; }),
      courts:ids.map(function (id) {
        const r = s.realms[id], person = FB.realmRulerCharacterSnapshot(s,id);
        return [id,r.capital,r.religion,person && person.id];
      }),
      names:['bavaria_1241','austria_styria_1241','carinthia_1241','sweden_1241','denmark_1241',
        'bulgaria_1241','rum_1241','cyprus_1241','karak_1241'].map(function (id) { return [id,s.realms[id].ruler.name]; }),
      pairs:communities.map(function (c) { return [c.culture,c.religion]; }),
      partitioned:communities.reduce(function (sum,c) { return sum+c.count; },0) === FB.countyPopulation(s,'turku'),
      catholicShare:FB.countyReligionShare(s,'turku','catholic'),
      errors:FBTEST.checkInvariants(),saveValid:FB.save.v4.validatePlatform(s)
    };
  }
  const before = await page.evaluate(snapshot);
  expect(before.owners).toEqual([
    ['wien','austria_styria_1241','hre_1241'],['linz','austria_styria_1241','hre_1241'],
    ['graz','austria_styria_1241','hre_1241'],['klagenfurt','carinthia_1241','hre_1241'],
    ['tallinn','denmark_1241','denmark_1241'],['tartu','tartu_1241','tartu_1241'],
    ['adrianople','bulgaria_1241','bulgaria_1241'],['serres','bulgaria_1241','bulgaria_1241'],
    ['homs','homs_1241','homs_1241'],['hama','hama_1241','hama_1241'],['amman','karak_1241','karak_1241']
  ]);
  expect(before.courts.map(function (row) { return row.slice(0,3); })).toEqual([
    ['austria_styria_1241','wien','catholic'],['carinthia_1241','klagenfurt','catholic'],
    ['tartu_1241','tartu','catholic'],['homs_1241','homs','sunni'],['hama_1241','hama','sunni'],
    ['karak_1241','amman','sunni']
  ]);
  expect(before.courts.every(function (row) { return typeof row[3] === 'string' && !!row[3]; })).toBe(true);
  expect(new Set(before.courts.map(function (row) { return row[3]; })).size).toBe(6);
  expect(before.names.map(function (row) { return row[1]; })).toEqual(['Otto II','Frederick II of Austria',
    'Bernhard of Sponheim','Erik Eriksson','Valdemar II','Ivan Asen II','Kaykhusraw II','Henry I of Lusignan','al-Nasir Dawud']);
  expect(before.pairs).toEqual([['finnic','baltic_pagan'],['finnic','catholic']]);
  expect(before.partitioned).toBe(true);
  expect(before.catholicShare).toBeCloseTo(0.15,3);
  expect(before.errors).toEqual([]);
  expect(before.saveValid).toBe(true);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(snapshot)).toEqual(before);
});

test('1241 bounded districts retain source sites, climate and the northern habitation hold',async function ({page},info) {
  await openGame(page,info);
  const data = await page.evaluate(function () {
    const c = FBDATA.bookmarkRegions1241;
    return {palmyra:c.levant_jazira.provinces.filter(function (p) { return p.id === 'palmyra_district'; })[0],
      palmyraLayout:c.levant_jazira.layouts.palmyra_district,levantClimate:c.levant_jazira.climates,
      siwa:c.egypt.provinces.filter(function (p) { return p.id === 'siwa_oasis'; })[0],
      siwaLayout:c.egypt.layouts.siwa_oasis,egyptClimate:c.egypt.climates,
      torne:c.scandinavia.provinces.filter(function (p) { return p.id === 'torne_district'; })[0],
      northClimate:c.scandinavia.climates};
  });
  expect(data.palmyra).toMatchObject({name:'Tadmur',dev:2,maxRadiusKm:65,names:[]});
  expect(data.palmyraLayout).toEqual([{site:'palmyra_district_inhabited_1204',name:'Tadmur',kind:'town'}]);
  expect(data.levantClimate).toEqual({palmyra_district:'arid'});
  expect(data.siwa).toMatchObject({name:'Siwa',dev:1,maxRadiusKm:65,names:[]});
  expect(data.siwaLayout).toEqual([{site:'siwa_oasis_inhabited_1204',name:'Shali',kind:'village'}]);
  expect(data.egyptClimate).toEqual({siwa_oasis:'arid'});
  expect(data.torne.wasteland).toBe(true);
  expect(data.torne.realm).toBeUndefined();
  expect(data.northClimate).toEqual({torne_district:'continental'});
});

test('reloading quadrant c changes no registered world, sibling, campaign or RNG state',async function ({page},info) {
  await openGame(page,info);
  const snapshot = function (keys) {
    const siblings = {};
    Object.keys(FBDATA.bookmarkRegions1241 || {}).forEach(function (key) {
      if (keys.indexOf(key)<0) siblings[key] = FBDATA.bookmarkRegions1241[key];
    });
    return JSON.stringify({bookmarks:FBDATA.bookmarks,candidates:FBDATA.bookmarkCandidates,
      cultures:FBDATA.cultures,religions:FBDATA.religions,sites:FBDATA.settlementSites,
      layouts:FBDATA.settlementLayouts,starts:FBDATA.startScenarios,stories:FBDATA.storyInstances,
      constituencies:FBDATA.constituencyProfiles,siblings:siblings,state:FB.state,
      active:FB.activeBookmarkId,rng:FB.getRngState()});
  };
  const before = await page.evaluate(snapshot,Object.keys(coverage));
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1241_scaffold_c.js')});
  expect(await page.evaluate(snapshot,Object.keys(coverage))).toBe(before);
});
