'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/bookmark_1241_scaffold_a.js','data/bookmark_1204.js',
  'data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/bookmark_1204_terrain.js','data/bookmarks.js','data/counties.js',
  'data/map_data.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js',
  'data/traits.js','data/eras.js','data/political_institutions.js','js/model.js','js/world.js',
  'data/starts_1241.js','data/story_households_1241.js','js/main.js','js/starts.js',
  'js/bookmark_setup.js','js/stories.js','js/save.js','js/save_v4.js'
]);

const packets = {
  hungary_cumans:'nitra bratislava szekesfehervar moson gyula cluj'.split(' '),
  rus_north:'novgorod ladoga pskov rostov suzdal beloozero smolensk polotsk vitebsk minsk onega_district vychegda_district w_north w_taiga'.split(' '),
  western_command_steppe:'etelkoz atil sarkel tmutarakan bolghar bilyar upper_kama sarysu_corridor w_steppe_e w_ural'.split(' '),
  britain_south:'winchester salisbury dorset bath exeter cornwall canterbury rochester chichester lewes london colchester tamworth derby nottingham leicester gloucester worcester warwick chester shrewsbury northampton bedford norwich ipswich cambridge lincoln stamford york scarborough bamburgh durham carlisle lancaster gwynedd powys cardigan carmarthen cardiff'.split(' '),
  france_north_low_countries:'paris chartres sens orleans rouen caen evreux bayeux angers tours le_mans blois bourges reims troyes chalons amiens st_quentin laon bruges ghent boulogne arras rennes nantes vannes quimper st_brieuc luxembourg liege utrecht amsterdam groningen'.split(' '),
  france_south_alps:'bordeaux agen perigueux poitiers angouleme limoges toulouse albi cahors rodez clermont le_puy bayonne auch narbonne beziers carcassonne dijon besancon auxerre lyon macon vienne arles marseille avignon nice geneva chambery grenoble'.split(' ')
};

test('1241 quadrant a reloads exact disjoint coverage without changing the composed world', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const before = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
      sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
      duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,empires:FBDATA.empires});
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1241_scaffold_a.js')});
  const after = await page.evaluate(function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
      sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
      duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,empires:FBDATA.empires});
  });
  expect(after).toBe(before);
  const coverage = await page.evaluate(function (expected) {
    var actual = {}, seen = {}, duplicates = [], scenery = [], inhabited = 0;
    Object.keys(expected).forEach(function (key) {
      actual[key] = FBDATA.bookmarkRegions1241[key].provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) scenery.push(p.id); else inhabited++;
        return p.id;
      });
    });
    return {actual:actual,duplicates:duplicates,physical:Object.keys(seen).length,
      inhabited:inhabited,scenery:scenery.sort(),published:!!FBDATA.bookmarks['1241']};
  },packets);
  expect(coverage.actual).toEqual(packets);
  expect(coverage.duplicates).toEqual([]);
  expect(coverage.physical).toBe(132);
  expect(coverage.inhabited).toBe(124);
  expect(coverage.scenery).toEqual(['onega_district','vychegda_district','upper_kama',
    'sarysu_corridor','w_north','w_taiga','w_steppe_e','w_ural'].sort());
  expect(coverage.published).toBe(true);
});

test('1241 quadrant a preserves retained source residents and ordered settlement slots independently', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const faults = await page.evaluate(function (keys) {
    var source = FB.bookmark('1204','inhabited_v2'), sourceById = {}, errors = [];
    source.provinces.forEach(function (p) { sourceById[p.id] = p; });
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        var old = sourceById[p.id];
        if (!old) { errors.push(p.id + ': missing retained source'); return; }
        ['name','x','y','terrain','duchy','dev','culture','religion','communities','wasteland','maxRadiusKm'].forEach(function (field) {
          if (JSON.stringify(p[field]) !== JSON.stringify(old[field])) errors.push(p.id + ': changed ' + field);
        });
        if (p === old || p.communities && p.communities === old.communities) errors.push(p.id + ': aliased county');
        var layout = block.settlementLayouts[p.id];
        if (p.wasteland) {
          if (layout || p.realm || p.culture || p.religion) errors.push(p.id + ': authority in scenery');
          return;
        }
        var oldLayout = FBDATA.settlementLayouts['1204_inhabited_v2'][p.id];
        if (!layout || JSON.stringify(layout) !== JSON.stringify(oldLayout)) errors.push(p.id + ': changed layout');
        if (layout === oldLayout) errors.push(p.id + ': aliased layout');
        (layout || []).forEach(function (slot,index) {
          if (slot === oldLayout[index]) errors.push(p.id + ': aliased slot');
        });
        (p.communities || []).forEach(function (community,index) {
          if (community === old.communities[index]) errors.push(p.id + ': aliased community');
        });
      });
    });
    return errors;
  },Object.keys(packets));
  expect(faults).toEqual([]);
});

test('1241 quadrant a resolves its courts, dated identities, title chains and physical sites', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    var provinces = {}, realms = {}, errors = [], outside = {};
    var foreign = {hre_1241:true,turov_1241:true};
    var definition = {id:'1241',era:'high_medieval',geography:'europe_regional_2',date:{year:1241,season:0,day:1}};
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        if (realms[r.id] || foreign[r.id]) errors.push(r.id + ': duplicate court');
        realms[r.id] = r;
      });
    });
    function realmRef(id) {
      if (!realms[id] && !foreign[id]) errors.push(id + ': unresolved court');
      if (foreign[id]) outside[id] = true;
      if (!/_1241$/.test(id)) errors.push(id + ': source court survived');
    }
    function identity(c,consumer,owner) {
      if (!FB.cultureExists(c.culture,null)) errors.push(owner + ': unknown culture');
      if (!FB.faithHistoricalAvailable(c.religion,definition,consumer)) errors.push(owner + ': unavailable faith');
    }
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        if (p.wasteland) return;
        realmRef(p.realm);
        var duchy = block.duchies[p.duchy], kingdom = duchy && block.kingdoms[duchy.kingdom];
        if (!kingdom || !block.empires[kingdom.empire]) errors.push(p.id + ': broken title chain');
        var total = 0, pairs = {};
        (p.communities || []).forEach(function (c) {
          identity(c,'community',p.id);
          var pair = c.culture + '/' + c.religion;
          if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0) errors.push(p.id + ': invalid community');
          pairs[pair] = true; total += c.populationShare0;
        });
        if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion) errors.push(p.id + ': invalid shares');
        if (!block.settlementLayouts[p.id] || !block.settlementLayouts[p.id].length) errors.push(p.id + ': missing layout');
      });
      Object.keys(block.settlementLayouts).forEach(function (pid) {
        if (!provinces[pid] || provinces[pid].wasteland) errors.push(pid + ': stray layout');
        block.settlementLayouts[pid].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site]) errors.push(pid + ': unknown site ' + slot.site);
        });
      });
    });
    Object.keys(realms).forEach(function (id) {
      var r = realms[id], capital = provinces[r.capital];
      if (!capital || capital.wasteland || capital.realm !== id) errors.push(id + ': invalid capital');
      if (!FBDATA.governmentForms[r.government]) errors.push(id + ': unknown government');
      if (r.liege) realmRef(r.liege);
      identity({culture:r.ruler.culture,religion:r.religion},'character',id);
      if (!FBDATA.traits[r.ruler.trait]) errors.push(id + ': unknown trait');
      if (r.ruler.generated && (r.ruler.name || r.royalCourt || r.ruler.born < 1186 || r.ruler.born > 1221)) errors.push(id + ': unsupported historical identity');
    });
    return {errors:errors,courts:Object.keys(realms).length,outside:Object.keys(outside).sort()};
  },Object.keys(packets));
  expect(result).toEqual({errors:[],courts:13,outside:['hre_1241','turov_1241']});
});

test('1241 quadrant a replaces obsolete incumbents and keeps campaign and household facts unasserted', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    var named = [], generated = [], provinces = {}, realms = {}, operations = [];
    keys.forEach(function (key) {
      var block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        realms[r.id] = r;
        if (r.ruler.generated) generated.push(r.id);
        else named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion]);
        if (r.mobile || r.nonTerritorial || r.royalCourt || r.civicRights || r.ecclesiastical) operations.push(r.id);
      });
      ['opening','stories','campaigns','scripted','starts','religiousHeads','localInstitutions'].forEach(function (field) {
        if (block[field] && Object.keys(block[field]).length) operations.push(key + ':' + field);
      });
    });
    return {named:named.sort(),generated:generated.sort(),operations:operations,
      normandy:['rouen','caen','evreux','bayeux'].map(function (id) { return provinces[id].realm; }),
      sourceNormandy:FB.bookmark('1204','inhabited_v2').provinces.filter(function (p) {
        return ['rouen','caen','evreux','bayeux'].indexOf(p.id) >= 0;
      }).map(function (p) { return p.realm; }),
      obsolete:['koten_following_1241','mongol_western_command_1241','cumans_1241','volga_bulgaria_1241']
        .filter(function (id) { return !!realms[id]; }),
      rusBirths:['vladimir_1241','novgorod_1241'].map(function (id) { return realms[id].ruler.born; }),
      sourceNames:FBDATA.bookmarkContent['1204'].realms.filter(function (r) {
        return ['hungary_1204','england_1204','france_1204'].indexOf(r.id) >= 0;
      }).map(function (r) { return r.ruler.name; }).sort()};
  },Object.keys(packets));
  expect(result.named).toEqual([
    ['brittany_1241','John I',1217,'brezhon','catholic'],
    ['england_1241','Henry III',1207,'norman','catholic'],
    ['france_1241','Louis IX',1214,'frankish','catholic'],
    ['hungary_1241','Bela IV',1206,'magyar','catholic'],
    ['toulouse_1241','Raymond VII',1197,'occitan','catholic'],
    ['vladimir_1241','Yaroslav Vsevolodovich',1191,'rus','orthodox']
  ]);
  expect(result.generated).toEqual(['deheubarth_1241','gwynedd_1241',
    'novgorod_1241','polotsk_1241','smolensk_1241','steppe_local_1241','volga_local_1241']);
  expect(result.operations).toEqual([]);
  expect(result.normandy).toEqual(Array(4).fill('france_1241'));
  expect(result.sourceNormandy).toEqual(Array(4).fill('england_1204'));
  expect(result.obsolete).toEqual([]);
  expect(result.rusBirths).toEqual([1191,1206]);
  expect(result.sourceNames).toEqual(['Emeric','John','Philip II Augustus']);
});

test('1241 southern French corrections reach the composed world without extending nearby claims', async function ({page}, testInfo) {
  await openGame(page,testInfo);
  const owners = {
    poitiers:'france_1241',angouleme:'france_1241',limoges:'france_1241',perigueux:'france_1241',
    agen:'toulouse_1241',carcassonne:'france_1241',beziers:'france_1241',macon:'france_1241',besancon:'hre_1241',
    bordeaux:'england_1241',bayonne:'england_1241',auch:'england_1241',
    albi:'toulouse_1241',narbonne:'toulouse_1241',clermont:'toulouse_1241',le_puy:'toulouse_1241',
    cahors:'toulouse_1241',rodez:'toulouse_1241',vienne:'hre_1241',arles:'hre_1241',chambery:'hre_1241'
  };
  expect(await page.evaluate(function (expected) {
    const b = FB.bookmark('1241'), block = FBDATA.bookmarkRegions1241.france_south_alps;
    const source = FB.bookmark('1204','inhabited_v2'), data = JSON.stringify(FBDATA);
    const state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = [];
    Object.keys(expected).forEach(function (id) {
      const staged = block.provinces.find(function (p) { return p.id === id; });
      const live = b.provinces.find(function (p) { return p.id === id; });
      const old = source.provinces.find(function (p) { return p.id === id; });
      if (staged.realm !== expected[id] || live.realm !== expected[id]) faults.push(id+': owner');
      if (live === staged || live.communities === staged.communities) faults.push(id+': shared object');
      if (JSON.stringify(live.communities) !== JSON.stringify(old.communities) ||
          live.culture !== old.culture || live.religion !== old.religion || live.dev !== old.dev)
        faults.push(id+': changed residents or development');
    });
    const bad = JSON.parse(JSON.stringify(b));
    bad.provinces.find(function (p) { return p.id === 'besancon'; }).realm = 'missing_court';
    const valid = FB.validateBookmark(b), rejected = FB.validateBookmark(bad).length > 0;
    return {faults:faults,valid:valid,rejected:rejected,
      pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
  },owners)).toEqual({faults:[],valid:[],rejected:true,pure:true});
});

test('1241 corrected background rulers and county affiliations initialize once and survive matching restore', async function ({page}, testInfo) {
  await beginBookmark(page,testInfo,'1241','hungarian_village_household_1241');
  const result = await page.evaluate(function () {
    const ids = ['brittany_1241','toulouse_1241','vladimir_1241'];
    function facts() {
      const s = FB.state;
      return {
        rulers:ids.map(function (id) {
          const r = s.realms[id];
          return [id,r.ruler.name,r.ruler.born,FB.realmRulerGeneration(s,id)];
        }),
        owners:['poitiers','angouleme','limoges','perigueux','agen','carcassonne','beziers','macon','besancon']
          .map(function (id) { return [id,s.provinces[id].realm,s.provinces[id].holder]; }),
        courts:ids.map(function (id) {
          return {ruler:FB.realmRulerCharacterSnapshot(s,id),succession:s.realms[id].succession};
        }),
        personIds:Object.keys(s.chars).sort(),stories:s.stories,setup:s.bookmarkSetup,
        rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()
      };
    }
    const before = JSON.parse(JSON.stringify(facts())), saved = JSON.parse(FB.save.serialize());
    const expectedOwners = ['france_1241','france_1241','france_1241','france_1241','toulouse_1241',
      'france_1241','france_1241','france_1241','hre_1241'];
    const initialOwners = before.owners.every(function (row,index) { return row[1] === expectedOwners[index]; });
    const initialRulers = before.rulers.map(function (row) { return row.slice(0,3); });
    FB.save.restore(saved);
    const after = JSON.parse(JSON.stringify(facts()));
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {initialRulers:initialRulers,initialOwners:initialOwners,before:before,after:after,repeated:facts(),
      noNamedStart:!FBDATA.startScenarios.some(function (row) {
        return ids.indexOf(row.rulerRealmId) >= 0;
      })};
  });
  expect(result.initialRulers).toEqual([['brittany_1241','John I',1217],['toulouse_1241','Raymond VII',1197],
    ['vladimir_1241','Yaroslav Vsevolodovich',1191]]);
  expect(result.initialOwners).toBe(true);
  expect(result.before.courts.every(function (court) { return !!court.ruler; })).toBe(true);
  expect(result.after).toEqual(result.before);
  expect(result.repeated).toEqual(result.before);
  expect(result.noNamedStart).toBe(true);
});
