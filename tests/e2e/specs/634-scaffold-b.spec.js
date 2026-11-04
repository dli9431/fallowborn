'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_scaffold_b.js','data/bookmark_634_identities.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','js/bookmark_composition.js',
  'js/bookmark_setup.js','js/save.js','js/save_v4.js',
  'data/bookmark_568_identities.js','data/bookmark_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmark_476_wider_identities.js','data/bookmark_476_wider.js',
  'data/bookmark_493_world.js','data/counties.js','data/map_data.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/cultures.js','data/climate.js','data/political_institutions.js',
  'js/model.js','js/world.js','js/governments.js','js/main.js','js/crazygames.js'
]);

const packets = {
  b08:'mainz worms koblenz augsburg ulm konstanz zurich freiburg munich regensburg passau salzburg wien linz klagenfurt graz hamburg hannover'.split(' '),
  b09:'braunschweig magdeburg erfurt leipzig meissen torino aosta genoa milano pavia brescia verona trento padova venezia aquileia friuli parma'.split(' '),
  b10:'modena bologna ravenna firenze pisa siena lucca spoleto perugia ancona roma viterbo benevento capua salerno bari taranto foggia'.split(' '),
  b11:'brindisi reggio cosenza palermo messina siracusa cagliari sassari ajaccio winchester salisbury dorset bath exeter cornwall canterbury rochester chichester'.split(' '),
  b12:'lewes london colchester tamworth derby nottingham leicester gloucester worcester warwick chester shrewsbury northampton bedford norwich ipswich cambridge lincoln'.split(' '),
  b13:'stamford york scarborough bamburgh durham carlisle lancaster gwynedd powys cardigan carmarthen cardiff scone dundee aberdeen elgin inverness edinburgh'.split(' '),
  b14:'stirling glasgow dumbarton whithorn iona man lewis ulaid tir_eoghain tara dublin kilkenny wexford galway tuam roscommon cashel cork'.split(' '),
  scenery_b:'w_nefud w_syrian w_kavir w_lut w_registan w_hindukush'.split(' ')
};

async function loadQuadrant(page) {
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_634_scaffold_b.js')});
}

function activeSnapshot() {
  return JSON.stringify({bookmarks:FBDATA.bookmarks,candidates:FBDATA.bookmarkCandidates,
    sites:FBDATA.settlementSites,layouts:FBDATA.settlementLayouts,
    cultures:FBDATA.cultures,religions:FBDATA.religions,forms:FBDATA.governmentForms,
    duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,empires:FBDATA.empires,
    institutions:FBDATA.localInstitutions,stories:FBDATA.storyInstances,
    geography:FBDATA.geographies,state:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter()});
}

for (const crazy of [false,true]) {
  test('634 quadrant b loading is inert on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames';
        window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    const before = await page.evaluate(activeSnapshot);
    await loadQuadrant(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    const first = await page.evaluate(function (keys) {
      return JSON.stringify(keys.map(function (key) { return FBDATA.bookmarkRegions634[key]; }));
    },Object.keys(packets));
    await loadQuadrant(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    expect(await page.evaluate(function (keys) {
      return JSON.stringify(keys.map(function (key) { return FBDATA.bookmarkRegions634[key]; }));
    },Object.keys(packets))).toBe(first);
  });
}

test('634 quadrant b covers its exact physical allocation once with complete local references',async function ({page},info) {
  await openGame(page,info);
  await loadQuadrant(page);
  const result = await page.evaluate(function (expected) {
    const regions = FBDATA.bookmarkRegions634, seen = {}, realms = {}, duchies = {}, kingdoms = {}, empires = {};
    const actual = {}, faults = [], seeds = {}, sourceCounties = {}, sourceLayouts = {};
    const external = {austrasia_634:{block:'b07',capital:'metz'},byzantium_634:{block:'b19',capital:'constantinople'}};
    FB.geography('europe_regional_2').provinces.forEach(function (p) { seeds[p.id] = p; });
    Object.keys(FBDATA.bookmarkRegions568).forEach(function (key) {
      const b = FBDATA.bookmarkRegions568[key];
      b.provinces.forEach(function (p) { sourceCounties[p.id] = p; });
      Object.assign(sourceLayouts,b.layouts || b.settlementLayouts);
    });
    Object.keys(expected).forEach(function (key) {
      const block = regions[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) faults.push(p.id + ': duplicate county');
        seen[p.id] = true;
        return p.id;
      });
      block.realms.forEach(function (r) {
        if (realms[r.id]) faults.push(r.id + ': duplicate court');
        realms[r.id] = r;
        if (expected[key].indexOf(r.capital) < 0) faults.push(r.id + ': court outside owning block');
      });
      ['duchies','kingdoms','empires'].forEach(function (field) {
        const target = field === 'duchies' ? duchies : field === 'kingdoms' ? kingdoms : empires;
        Object.keys(block[field]).forEach(function (id) {
          if (target[id] || id.indexOf('_634_' + key + '_') < 0) faults.push(id + ': duplicate or unscoped title');
          target[id] = block[field][id];
        });
      });
      if (Object.keys(block.institutions).length || block.storyIds.length ||
          JSON.stringify(block.opening) !== JSON.stringify({actors:{},appointments:{},estates:[],claims:[],migrations:[]}))
        faults.push(key + ': inherited opening content');
    });
    const religions = FBDATA.religions, bookmarks = FBDATA.bookmarks;
    const candidate = {id:'634',era:'late_antique',date:{year:634,season:2,day:1}};
    try {
      // Eligibility projection only, in a disposable context. No partial world is created.
      FBDATA.bookmarks = Object.assign({},bookmarks,{'634':candidate});
      FBDATA.religions = JSON.parse(JSON.stringify(religions));
      Object.assign(FBDATA.religions,JSON.parse(JSON.stringify(FBDATA.bookmarkReligions634)));
      Object.keys(FBDATA.bookmarkFaithAvailability634).forEach(function (id) {
        const ids = FBDATA.religions[id].availability.bookmarkIds;
        if (ids.indexOf('634') < 0) ids.push('634');
      });
      FB.invalidateReligionData();
      function identity(culture,faith,consumer,label) {
        if (!FB.cultureExists(culture,null)) faults.push(label + ': unknown culture');
        if (!FB.faithHistoricalAvailable(faith,candidate,consumer)) faults.push(label + ': unavailable faith');
      }
      function courtReference(id,label) {
        if (realms[id]) return;
        const contract = external[id];
        if (!contract) { faults.push(label + ': unresolved court ' + id); return; }
        // Once a sibling is present, inspect its actual declaration as well.
        if (regions[contract.block]) {
          const found = regions[contract.block].realms.filter(function (r) { return r.id === id; });
          if (found.length !== 1 || found[0].capital !== contract.capital) faults.push(label + ': broken external court');
        }
      }
      Object.keys(expected).forEach(function (key) {
        const b = regions[key], ids = expected[key];
        b.provinces.forEach(function (p) {
          const seed = seeds[p.id], original = sourceCounties[p.id];
          if (!seed || !original) { faults.push(p.id + ': missing physical/source county'); return; }
          ['x','y','terrain'].forEach(function (field) {
            if (p[field] !== undefined && p[field] !== seed[field]) faults.push(p.id + ': changed physical seed');
          });
          if (p.wasteland) {
            if (p.realm || p.culture || p.religion || p.communities || p.duchy || b.layouts[p.id]) faults.push(p.id + ': inhabited scenery');
            return;
          }
          courtReference(p.realm,p.id);
          if (!duchies[p.duchy] || !FBDATA.climateZones[b.climate[p.id]]) faults.push(p.id + ': missing district/climate');
          let total = 0;
          const pairs = {};
          p.communities.forEach(function (c) {
            identity(c.culture,c.religion,'community',p.id);
            const pair = c.culture + '/' + c.religion;
            if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0) faults.push(p.id + ': invalid resident pair');
            pairs[pair] = true; total += c.populationShare0;
          });
          if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion)
            faults.push(p.id + ': invalid principal/share total');
          if (JSON.stringify(p.communities) !== JSON.stringify(original.communities)) faults.push(p.id + ': changed source residents');
          if (!b.layouts[p.id] || JSON.stringify(b.layouts[p.id]) !== JSON.stringify(sourceLayouts[p.id])) faults.push(p.id + ': changed or missing slots');
          (b.layouts[p.id] || []).forEach(function (slot) {
            const site = b.settlementSites[slot.site] || FBDATA.settlementSites[slot.site];
            if (!site) faults.push(p.id + ': unknown physical site ' + slot.site);
          });
          (p.customaryRights || []).forEach(function (right) {
            if (right.basis !== 'possession' || right.basisRef) faults.push(p.id + ': source office grant');
          });
        });
        ['layouts','climate'].forEach(function (field) {
          Object.keys(b[field]).forEach(function (id) { if (ids.indexOf(id) < 0) faults.push(id + ': foreign ' + field); });
        });
      });
      Object.keys(realms).forEach(function (id) {
        const r = realms[id], capital = Object.keys(expected).reduce(function (found,key) {
          return found || regions[key].provinces.filter(function (p) { return p.id === r.capital; })[0];
        },null);
        if (!/_634$/.test(id) || !capital || capital.realm !== id || capital.wasteland) faults.push(id + ': invalid capital/identity');
        if (!FBDATA.governmentForms[r.government] || r.mobile || r.administrationProfileId || r.aristocraticProfileId) faults.push(id + ': unsupported government');
        identity(r.ruler.culture,r.religion,'ruler',id);
        if (r.liege) {
          courtReference(r.liege,id);
          if (realms[r.liege] && realms[r.liege].rank <= r.rank) faults.push(id + ': invalid rank hierarchy');
        }
        if (r.ruler.generated && (r.ruler.born !== 599 || r.ruler.name || r.royalCourt)) faults.push(id + ': inherited named person/kin');
      });
      Object.keys(duchies).forEach(function (id) { if (duchies[id].kingdom && !kingdoms[duchies[id].kingdom]) faults.push(id + ': missing kingdom'); });
      Object.keys(kingdoms).forEach(function (id) { if (kingdoms[id].empire && !empires[kingdoms[id].empire]) faults.push(id + ': missing empire'); });
      return {actual:actual,count:Object.keys(seen).length,courts:Object.keys(realms).length,faults:faults};
    } finally {
      FBDATA.religions = religions; FBDATA.bookmarks = bookmarks; FB.invalidateReligionData();
    }
  },packets);
  expect(result.actual).toEqual(packets);
  expect(result.count).toBe(132);
  expect(result.courts).toBe(32);
  expect(result.faults).toEqual([]);
});

test('634 quadrant b distinguishes changed courts from borrowed residents and generated principals',async function ({page},info) {
  await openGame(page,info);
  await loadQuadrant(page);
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, named = [];
    keys.forEach(function (key) {
      FBDATA.bookmarkRegions634[key].provinces.forEach(function (p) { provinces[p.id] = p; });
      FBDATA.bookmarkRegions634[key].realms.forEach(function (r) {
        realms[r.id] = r;
        if (!r.ruler.generated) named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion,r.royalCourt]);
      });
    });
    function owners(ids) { return ids.split(' ').map(function (id) { return provinces[id].realm; }); }
    return {named:named,generated:Object.keys(realms).filter(function (id) { return realms[id].ruler.generated; }).length,
      north:owners('torino aosta milano pavia brescia verona trento friuli parma modena'),
      corrected:owners('aquileia padova'),
      imperial:owners('genoa venezia bologna ravenna firenze pisa siena lucca ancona roma viterbo bari taranto'),
      south:owners('spoleto perugia benevento capua salerno foggia'),
      northernBritain:owners('york scarborough bamburgh durham'),
      lombard:[realms.lombards_634.capital,realms.lombards_634.ruler.culture,realms.lombards_634.religion],
      southernCourts:[realms.spoleto_634.liege,realms.benevento_634.liege],
      frankish:[realms.bavaria_634.liege,realms.thuringian_634.liege],
      namedHold:!realms.lombards_634.ruler.name && !realms.trent_634.ruler.name,
      kent:[realms.kent_634.religion,provinces.canterbury.religion],
      clyde:realms.clyde_634.capital,irish:realms.midland_irish_634.capital,
      northumbrianResidents:provinces.bamburgh.communities};
  },Object.keys(packets));
  expect(result.named).toEqual([['northumbria_634','Oswald',604,'saxon_476','nicene',{members:[],spouseId:null}]]);
  expect(result.generated).toBe(31);
  expect(result.north).toEqual(Array(10).fill('lombards_634'));
  expect(result.corrected).toEqual(['lombards_634','lombards_634']);
  expect(result.imperial).toEqual(Array(13).fill('byzantium_634'));
  expect(result.south).toEqual(['spoleto_634','spoleto_634','benevento_634','benevento_634','benevento_634','benevento_634']);
  expect(result.northernBritain).toEqual(Array(4).fill('northumbria_634'));
  expect(result.lombard).toEqual(['pavia','langobard_568','homoian']);
  expect(result.southernCourts).toEqual(['lombards_634','lombards_634']);
  expect(result.frankish).toEqual(['austrasia_634','austrasia_634']);
  expect(result.namedHold).toBe(true);
  expect(result.kent).toEqual(['nicene','germanic_pagan']);
  expect(result.clyde).toBe('dumbarton');
  expect(result.irish).toBe('tara');
  expect(result.northumbrianResidents).toEqual([{culture:'brittonic',religion:'nicene',populationShare0:8000},
    {culture:'saxon_476',religion:'germanic_pagan',populationShare0:2000}]);
});

// Court faith is independent of resident faith, including after saved-world activation.
test('634 quadrant b corrected owners and Kent court survive campaign creation and restore',async function ({page},info) {
  await beginBookmark(page,info,'634','farmer_634');
  function correctedFacts() {
    const s = FB.state, b = FB.campaignBookmark(s);
    const kent = b.realms.filter(function (r) { return r.id === 'kent_634'; })[0];
    return {
      faults:FB.validateBookmark(b),
      owners:['aquileia','padova','venezia'].map(function (id) { return s.owner[id]; }),
      courtOwners:Object.keys(FBDATA.bookmarkRegions634).filter(function (key) {
        return FBDATA.bookmarkRegions634[key].realms.some(function (r) { return r.id === 'lombards_634'; });
      }),
      kent:[kent.capital,kent.ruler.generated,kent.ruler.culture,kent.ruler.born,kent.religion,
        s.realms.kent_634.religion,FB.realmRulerCharacter(s,'kent_634').religion],
      residents:b.provinces.filter(function (p) { return p.id === 'canterbury' || p.id === 'rochester'; })
        .map(function (p) { return [p.id,p.culture,p.religion,p.communities]; }),
      heldFaiths:['wessex_634','east_anglian_634'].map(function (id) { return s.realms[id].religion; }),
      valid:FB.save.v4.validatePlatform(s)
    };
  }
  const expected = {faults:[],owners:['lombards_634','lombards_634','byzantium_634'],courtOwners:['b09'],
    kent:['canterbury',true,'saxon_476',599,'nicene','nicene','nicene'],
    residents:['canterbury','rochester'].map(function (id) {
      return [id,'saxon_476','germanic_pagan',[
        {culture:'saxon_476',religion:'germanic_pagan',populationShare0:6500},
        {culture:'brittonic',religion:'nicene',populationShare0:3500,paired:true}]];
    }),heldFaiths:['germanic_pagan','germanic_pagan'],valid:true};
  expect(await page.evaluate(correctedFacts)).toEqual(expected);
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); });
    });
  })).toBeNull();
  await restoreBookmark(page,saved);
  expect(await page.evaluate(correctedFacts)).toEqual(expected);
});
