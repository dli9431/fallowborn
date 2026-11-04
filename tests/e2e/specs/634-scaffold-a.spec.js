'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_scaffold_a.js','data/bookmark_634_identities.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','js/save.js','js/save_v4.js',
  'js/bookmark_sources.js',
  'data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/cultures.js','data/bookmark_476_wider_identities.js','data/traits.js',
  'data/settlements.js','data/settlements_real.js','data/climate.js','data/eras.js',
  'data/bookmark_476_gaul_iberia.js','data/bookmark_476_outer.js','data/bookmark_476_wider.js',
  'data/political_institutions.js',
  'js/model.js','js/world.js','js/governments.js','js/main.js','js/crazygames.js'
]);

const packets = {
  b01:'coruna santiago ourense lugo oviedo leon astorga zamora burgos santander alava salamanca avila caceres pamplona logrono aragon sevilla'.split(' '),
  b02:'cordoba ecija niebla granada malaga almeria guadix toledo cuenca guadalajara badajoz merida evora lisboa santarem coimbra silves beja'.split(' '),
  b03:'valencia murcia denia albacete tortosa tarragona lerida zaragoza huesca tudela mallorca barcelona girona urgell paris chartres sens orleans'.split(' '),
  b04:'rouen caen evreux bayeux angers tours le_mans blois bourges reims troyes chalons amiens st_quentin laon bruges ghent boulogne'.split(' '),
  b05:'arras rennes nantes vannes quimper st_brieuc bordeaux agen perigueux poitiers angouleme limoges toulouse albi cahors rodez clermont le_puy'.split(' '),
  b06:'bayonne auch narbonne beziers carcassonne dijon besancon auxerre lyon macon vienne arles marseille avignon nice geneva chambery grenoble'.split(' '),
  b07:'metz verdun nancy strasbourg basel aachen trier luxembourg liege cologne utrecht amsterdam groningen bremen wurzburg nurnberg bamberg frankfurt'.split(' '),
  scenery_a:'w_sahara_w w_sahara_c w_sahara_e w_sahel w_nubia w_arabia'.split(' ')
};
const shard = path.resolve(__dirname,'../../../data/bookmark_634_scaffold_a.js');

test('634 western blocks cover their exact disjoint physical allocation',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:shard});
  const result = await page.evaluate(function (expected) {
    const actual = {}, seen = {}, duplicates = [], faults = [], scenery = [];
    const seeds = {};
    FBDATA.geographies.europe_regional.provinces.concat(FBDATA.geographies.europe_regional_2.provinceAdditions)
      .forEach(function (p) { seeds[p.id] = p; });
    Object.keys(expected).forEach(function (key) {
      const block = FBDATA.bookmarkRegions634[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        const seed = seeds[p.id];
        if (!seed || p.x !== seed.x || p.y !== seed.y || p.terrain !== seed.terrain)
          faults.push(p.id + ': changed physical anchor');
        if (!FBDATA.climateZones[block.climate[p.id]]) faults.push(p.id + ': missing climate');
        if (p.wasteland) {
          scenery.push(p.id);
          if (p.realm || p.culture || p.religion || p.communities || p.duchy || block.layouts[p.id])
            faults.push(p.id + ': inhabited scenery');
        } else if (!block.layouts[p.id] || !block.layouts[p.id].length) faults.push(p.id + ': missing layout');
        return p.id;
      });
      ['layouts','climate'].forEach(function (field) {
        Object.keys(block[field]).forEach(function (id) {
          if (expected[key].indexOf(id) < 0) faults.push(key + ': foreign ' + field + ' ' + id);
        });
      });
    });
    return {actual:actual,duplicates:duplicates,faults:faults,count:Object.keys(seen).length,scenery:scenery};
  },packets);
  expect(result.actual).toEqual(packets);
  expect(result.duplicates).toEqual([]);
  expect(result.faults).toEqual([]);
  expect(result.count).toBe(132);
  expect(result.scenery).toEqual(packets.scenery_a);
});

test('634 western references resolve locally with only the declared eastern imperial dependency',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:shard});
  const result = await page.evaluate(function (keys) {
    const faults = [], external = {}, provinces = {}, realms = {}, owners = {};
    const titles = {duchies:{},kingdoms:{},empires:{}};
    const candidate = {id:'634',era:'late_antique',date:{year:634,season:2,day:1}};
    function identity(culture,faith,consumer,id) {
      if (!FB.cultureExists(culture,null)) faults.push(id + ': unknown culture ' + culture);
      if (!FB.faithHistoricalAvailable(faith,candidate,consumer)) faults.push(id + ': unavailable faith ' + faith);
    }
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions634[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        if (realms[r.id]) faults.push(r.id + ': duplicate court');
        realms[r.id] = r; owners[r.id] = key;
      });
      Object.keys(titles).forEach(function (field) {
        Object.keys(block[field]).forEach(function (id) {
          if (titles[field][id] || id.indexOf('_634_' + key + '_') < 0) faults.push(id + ': duplicate or foreign title');
          titles[field][id] = block[field][id];
        });
      });
    });
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions634[key];
      block.provinces.forEach(function (p) {
        if (p.wasteland) return;
        if (!realms[p.realm]) external[p.realm] = true;
        if (!block.duchies[p.duchy]) faults.push(p.id + ': missing local district');
        identity(p.culture,p.religion,'community',p.id);
        let total = 0;
        const pairs = {};
        p.communities.forEach(function (c) {
          identity(c.culture,c.religion,'community',p.id);
          const pair = c.culture + '/' + c.religion;
          if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0)
            faults.push(p.id + ': invalid community');
          pairs[pair] = true; total += c.populationShare0;
        });
        if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion)
          faults.push(p.id + ': invalid resident weights');
        block.layouts[p.id].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site] && !block.settlementSites[slot.site])
            faults.push(p.id + ': unknown physical site ' + slot.site);
        });
        p.customaryRights.forEach(function (right) {
          if (right.basis !== 'possession' || right.basisRef) faults.push(p.id + ': inherited appointment');
        });
      });
    });
    Object.keys(realms).forEach(function (id) {
      const r = realms[id], capital = provinces[r.capital];
      if (!/_634$/.test(id) || !capital || capital.wasteland || capital.realm !== id ||
          !FBDATA.bookmarkRegions634[owners[id]].provinces.some(function (p) { return p.id === r.capital; }))
        faults.push(id + ': invalid court identity or capital owner');
      if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
      identity(r.ruler.culture,r.religion,'ruler',id);
      if (r.ruler.trait && !FBDATA.traits[r.ruler.trait]) faults.push(id + ': unknown trait');
      if (r.liege && !realms[r.liege]) faults.push(id + ': unresolved liege');
      let current = r, chain = {};
      while (current) {
        if (chain[current.id]) { faults.push(id + ': cyclic liege chain'); break; }
        chain[current.id] = true; current = realms[current.liege];
      }
    });
    Object.keys(titles.duchies).forEach(function (id) {
      const parent = titles.duchies[id].kingdom;
      if (parent && !titles.kingdoms[parent]) faults.push(id + ': unresolved kingdom');
    });
    Object.keys(titles.kingdoms).forEach(function (id) {
      const parent = titles.kingdoms[id].empire;
      if (parent && !titles.empires[parent]) faults.push(id + ': unresolved empire');
    });
    return {faults:faults,external:Object.keys(external),courts:Object.keys(realms).sort()};
  },Object.keys(packets));
  expect(result).toEqual({faults:[],external:['byzantium_634'],courts:[
    'aquitaine_duchy_634','armorica_634','austrasia_634','basque_634','cantabrian_634','francia_634','frisian_coast_634','visigoths_634'
  ]});
});

test('634 western courts use dated incumbents, explicit identity holds and empty opening ledgers',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:shard});
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, faults = [], named = [], generated = [];
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      b.provinces.forEach(function (p) { provinces[p.id] = p; });
      b.realms.forEach(function (r) {
        realms[r.id] = r;
        if (r.ruler.generated) {
          generated.push(r.id);
          if (r.ruler.name || r.ruler.born !== 599 || r.royalCourt) faults.push(r.id + ': fabricated historical identity');
        } else {
          named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion]);
          if (!r.royalCourt || r.royalCourt.spouseId !== null || r.royalCourt.members.length)
            faults.push(r.id + ': invented historical relatives');
        }
        if (r.mobile || r.administrationProfileId || r.aristocraticProfileId || r.government !== 'regnum')
          faults.push(r.id + ': unintended government or opening program');
      });
      if (Object.keys(b.institutions).length || Object.keys(b.localInstitutions).length || b.storyIds.length ||
          JSON.stringify(b.opening) !== JSON.stringify({actors:{},appointments:{},estates:[],claims:[],migrations:[]}))
        faults.push(key + ': inherited institution, actor or story');
    });
    return {faults:faults,named:named.sort(),generated:generated.sort(),
      courtSeats:[realms.visigoths_634.capital,realms.francia_634.capital,realms.austrasia_634.capital],
      hierarchy:[realms.francia_634.rank,realms.austrasia_634.rank,realms.austrasia_634.liege],
      iberianOwners:['lugo','cordoba','malaga','tarragona','toledo','narbonne'].map(function (id) { return provinces[id].realm; }),
      localOwners:['santander','pamplona','rennes','utrecht'].map(function (id) { return provinces[id].realm; }),
      balearic:provinces.mallorca.realm,
      crownFaith:realms.visigoths_634.religion,
      retainedMinority:provinces.toledo.communities.some(function (c) { return c.culture === 'gothic' && c.religion === 'homoian'; }),
      noOldCourtIds:!/_568(?:["'])/.test(JSON.stringify(keys.map(function (key) {
        const b = FBDATA.bookmarkRegions634[key];
        return [b.realms,b.provinces.map(function (p) { return [p.realm,p.duchy]; }),b.duchies,b.kingdoms,b.empires];
      })))};
  },Object.keys(packets));
  expect(result).toEqual({faults:[],named:[
    ['austrasia_634','Sigebert III',631,'frankish','nicene'],
    ['francia_634','Dagobert I',604,'frankish','nicene']
  ],generated:['aquitaine_duchy_634','armorica_634','basque_634','cantabrian_634','frisian_coast_634','visigoths_634'],
  courtSeats:['toledo','paris','metz'],hierarchy:[3,3,'francia_634'],
  iberianOwners:Array(6).fill('visigoths_634'),
  localOwners:['cantabrian_634','basque_634','armorica_634','frisian_coast_634'],
  balearic:'byzantium_634',crownFaith:'nicene',retainedMinority:true,noOldCourtIds:true});
});

test('634 corrected Aquitanian court and retained western boundaries survive campaign restore',async function ({page},info) {
  await beginBookmark(page,info,'634','farmer_634');
  function snapshot() {
    const s = FB.state, b = FB.campaignBookmark(s), court = s.realms.aquitaine_duchy_634;
    const counties = ['agen','perigueux','toulouse','cahors'];
    const held = ['bordeaux','poitiers','limoges','bayonne','auch','albi','rodez'];
    return {
      counties:b.provinces.filter(function (p) { return p.realm === 'aquitaine_duchy_634'; }).map(function (p) { return p.id; }).sort(),
      holders:counties.map(function (id) { return s.holder[id]; }),
      held:held.map(function (id) { return b.provinces.filter(function (p) { return p.id === id; })[0].realm; }),
      court:[court.capital,court.rank,court.liege,court.ruler.culture,court.religion,court.ruler.born],
      generated:b.realms.filter(function (r) { return r.id === 'aquitaine_duchy_634'; }).map(function (r) {
        return [r.ruler.generated,!!r.ruler.name,!!r.royalCourt];
      }),
      sigebert:[s.realms.austrasia_634.capital,s.realms.austrasia_634.ruler.name,s.realms.austrasia_634.ruler.born],
      valid:FB.save.v4.validatePlatform(s)
    };
  }
  const before = await page.evaluate(snapshot);
  expect(before).toEqual({counties:['agen','cahors','perigueux','toulouse'],
    holders:Array(4).fill('aquitaine_duchy_634'),
    held:['francia_634','austrasia_634','francia_634','francia_634','austrasia_634','austrasia_634','austrasia_634'],
    court:['toulouse',2,'francia_634','frankish','nicene',599],generated:[[true,false,false]],
    sigebert:['metz','Sigebert III',631],valid:true});
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(snapshot)).toEqual(before);
});

for (const crazy of [false,true]) {
  test('634 western staging is independent and inert on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    await page.addScriptTag({path:shard});
    const first = await page.evaluate(function (keys) {
      return keys.map(function (key) { return FBDATA.bookmarkRegions634[key]; });
    },Object.keys(packets));
    // The sealed production adapter ignores unchanged reloads. Exercise the
    // literal callback separately to retain source-independence coverage.
    await page.evaluate(function () {
      window.__westernSourceStage = FB.bookmarkSources.stage;
      FB.bookmarkSources.stage = function (spec,author) {
        if (spec.source !== 'data/bookmark_634_scaffold_a.js') throw new Error('Unexpected source in isolated fixture');
        author(FBDATA);
      };
    });
    // Remove only source staging tables. Active retained worlds stay available for comparison.
    await page.evaluate(function (keys) {
      delete FBDATA.bookmarkRegions568;
      Object.keys(FBDATA).forEach(function (key) {
        if (key.indexOf('bookmarkRevisionContent_568_') === 0) delete FBDATA[key];
      });
      keys.forEach(function (key) { delete FBDATA.bookmarkRegions634[key]; });
      FBDATA.bookmarkRegions634.e2e_neighbor = {unchanged:true};
    },Object.keys(packets));
    function snapshot() {
      const data = {};
      Object.keys(FBDATA).forEach(function (key) { if (key !== 'bookmarkRegions634') data[key] = FBDATA[key]; });
      return JSON.stringify({data:data,state:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter()});
    }
    const before = await page.evaluate(snapshot);
    await page.addScriptTag({path:shard});
    expect(await page.evaluate(snapshot)).toBe(before);
    expect(await page.evaluate(function (keys) {
      return {blocks:keys.map(function (key) { return FBDATA.bookmarkRegions634[key]; }),
        neighbor:FBDATA.bookmarkRegions634.e2e_neighbor};
    },Object.keys(packets))).toEqual({blocks:first,neighbor:{unchanged:true}});
    await page.addScriptTag({path:shard});
    expect(await page.evaluate(snapshot)).toBe(before);
    await page.evaluate(function () {
      FB.bookmarkSources.stage = window.__westernSourceStage;
      delete window.__westernSourceStage;
    });
  });
}
