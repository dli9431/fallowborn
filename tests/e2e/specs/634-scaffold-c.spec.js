'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_scaffold_c.js','data/bookmark_634_identities.js',
  'data/bookmark_634.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_568.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmark_493_world.js','data/bookmark_476_wider_identities.js',
  'data/counties.js','data/map_data.js','data/cultures.js','data/eras.js',
  'data/geographies.js','data/geography_expansion.js','data/climate.js',
  'data/settlements.js','data/political_institutions.js','data/assembly_polities.js',
  'js/model.js','js/world.js','js/climate.js','js/governments.js','js/main.js',
  'js/crazygames.js'
]);

const packets = {
  b15:'limerick agder stavanger bergen oslo tonsberg trondheim halogaland uppsala birka skara vaxjo kalmar visby norrland arhus viborg hedeby'.split(' '),
  b16:'ribe roskilde lund veligrad olomouc brno nitra bratislava praha plzen budejovice poznan gniezno plock krakow wroclaw gdansk szczecin'.split(' '),
  b17:'mecklenburg lubeck szekesfehervar moson sirmium osijek gyula cluj novgorod ladoga pskov rostov suzdal beloozero smolensk kiev pereyaslavl chernigov'.split(' '),
  b18:'kursk polotsk vitebsk turov minsk volodymyr lutsk etelkoz sambia natangia samogitia vilnius riga jersika tallinn tartu turku hame'.split(' '),
  b19:'savo kexholm atil sarkel tmutarakan samandar derbent cherson bolghar bilyar constantinople adrianople thessaloniki serres larissa athens thebes korinth'.split(' '),
  b20:'sparta ioannina dyrrachion candia nicaea dorylaion ancyra amorion smyrna sardis ephesos attaleia ikonion caesarea sebasteia trebizond sinope tarsos'.split(' '),
  b21:'adana nicosia pliska silistra vidin serdica philippopolis skopje ohrid ras kotor bosna knin split zadar zagreb sisak van'.split(' '),
  scenery_c:'w_sulaiman w_thar w_karakum w_kyzylkum w_steppe_e'.split(' ')
};
const sourcePath = path.resolve(__dirname,'../../../data/bookmark_634_scaffold_c.js');

function snapshot() {
  const data = {};
  Object.keys(FBDATA).forEach(function (key) {
    if (key !== 'bookmarkRegions634') data[key] = FBDATA[key];
  });
  return JSON.stringify({data:data,state:FB.state,active:FB.activeBookmark,
    rng:FB.getRngState(),uid:FB.getUidCounter()});
}

for (const crazy of [false,true]) {
  test('634 quadrant c loading is inert in ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      // Other quadrants and a future complete composition must also survive reload.
      const others = await page.evaluate(function (keys) {
        const saved = {};
        Object.keys(FBDATA.bookmarkRegions634 || {}).forEach(function (key) {
          if (keys.indexOf(key) < 0) saved[key] = FBDATA.bookmarkRegions634[key];
        });
        return JSON.stringify(saved);
      },Object.keys(packets));
      const before = await page.evaluate(snapshot);
      await page.addScriptTag({path:sourcePath});
      expect(await page.evaluate(snapshot)).toBe(before);
      const first = await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarkRegions634); });
      await page.addScriptTag({path:sourcePath});
      expect(await page.evaluate(snapshot)).toBe(before);
      expect(await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarkRegions634); })).toBe(first);
      expect(await page.evaluate(function (keys) {
        const saved = {};
        Object.keys(FBDATA.bookmarkRegions634).forEach(function (key) {
          if (keys.indexOf(key) < 0) saved[key] = FBDATA.bookmarkRegions634[key];
        });
        return JSON.stringify(saved);
      },Object.keys(packets))).toBe(others);
    });
}

test('634 quadrant c covers seven complete disjoint batches and its five scenery cells',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:sourcePath});
  const coverage = await page.evaluate(function (keys) {
    const actual = {}, seen = {}, duplicates = [], scenery = [], faults = [];
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      actual[key] = b.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) scenery.push(p.id);
        return p.id;
      });
      if (b.bookmarkId !== '634' || b.revision !== 'baseline') faults.push(key + ': wrong date');
      if (JSON.stringify(b.opening) !== JSON.stringify({actors:{},appointments:{},estates:[],claims:[],migrations:[]}))
        faults.push(key + ': inherited opening');
      ['institutions','settlementSites','storyIds'].forEach(function (field) {
        if (Object.keys(b[field]).length) faults.push(key + ': inherited ' + field);
      });
      ['storyCampaigns','storyInstances','administrationProfiles','aristocraticProfiles'].forEach(function (field) {
        if (b[field]) faults.push(key + ': source program/profile');
      });
    });
    return {actual:actual,count:Object.keys(seen).length,duplicates:duplicates,scenery:scenery,faults:faults};
  },Object.keys(packets));
  expect(coverage).toEqual({actual:packets,count:131,duplicates:[],scenery:packets.scenery_c,faults:[]});
});

test('634 quadrant c resolves local references and declares its exact external court seams',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:sourcePath});
  const before = await page.evaluate(snapshot);
  const result = await page.evaluate(function (keys) {
    const ps = {}, rs = {}, ds = {}, ks = {}, es = {}, seeds = {}, external = {}, faults = [];
    FB.geography('europe_regional_2').provinces.forEach(function (p) { seeds[p.id] = p; });
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      b.provinces.forEach(function (p) { ps[p.id] = p; });
      b.realms.forEach(function (r) {
        if (rs[r.id]) faults.push(r.id + ': duplicate court');
        rs[r.id] = r;
        if (b.provinces.every(function (p) { return p.id !== r.capital; })) faults.push(r.id + ': foreign capital block');
      });
      [['duchies',ds],['kingdoms',ks],['empires',es]].forEach(function (entry) {
        Object.keys(b[entry[0]]).forEach(function (id) {
          if (entry[1][id]) faults.push(id + ': duplicate title');
          if (id.indexOf('_634_' + key + '_') < 0) faults.push(id + ': missing batch scope');
          entry[1][id] = b[entry[0]][id];
        });
      });
    });
    const priorFaiths = FBDATA.religions, priorWorld = FBDATA.bookmarks['634'];
    const world = {id:'634',era:'late_antique',geography:'europe_regional_2',date:{year:634,season:2,day:1}};
    try {
      // Disposable consumer check. Production publication belongs to the complete composer.
      FBDATA.religions = Object.assign({},priorFaiths,FBDATA.bookmarkReligions634);
      FBDATA.bookmarks['634'] = world;
      Object.keys(FBDATA.bookmarkFaithAvailability634).forEach(function (id) {
        const old = priorFaiths[id], availability = JSON.parse(JSON.stringify(old.availability));
        FBDATA.bookmarkFaithAvailability634[id].bookmarkIds.forEach(function (date) {
          if (availability.bookmarkIds.indexOf(date) < 0) availability.bookmarkIds.push(date);
        });
        FBDATA.religions[id] = Object.assign({},old,{availability:availability});
      });
      FB.invalidateReligionData();
      function identity(culture,faith,consumer,id) {
        if (!FB.cultureExists(culture,null)) faults.push(id + ': unknown culture ' + culture);
        if (!FB.faithHistoricalAvailable(faith,world,consumer)) faults.push(id + ': unavailable faith ' + faith);
      }
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions634[key];
        b.provinces.forEach(function (p) {
          const seed = seeds[p.id];
          if (!seed) faults.push(p.id + ': missing physical seed');
          else ['x','y','terrain'].forEach(function (field) {
            // Omitted fields inherit the geography; authored overrides must agree.
            if (p[field] !== undefined && p[field] !== seed[field]) faults.push(p.id + ': changed physical seed');
          });
          if (p.wasteland) {
            if (p.realm || p.culture || p.religion || p.communities || p.duchy || b.layouts[p.id]) faults.push(p.id + ': inhabited scenery');
            return;
          }
          if (!rs[p.realm]) external[p.realm] = true;
          if (!ds[p.duchy]) faults.push(p.id + ': unresolved district');
          if (!FBDATA.climateZones[b.climate[p.id]]) faults.push(p.id + ': unresolved climate');
          const pairs = {};
          let total = 0;
          p.communities.forEach(function (c) {
            identity(c.culture,c.religion,'community',p.id);
            const pair = c.culture + '/' + c.religion;
            if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0) faults.push(p.id + ': invalid community');
            pairs[pair] = true; total += c.populationShare0;
          });
          if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion)
            faults.push(p.id + ': invalid principal/share total');
          const layout = b.layouts[p.id];
          if (!layout || !layout.length) faults.push(p.id + ': missing settlement');
          (layout || []).forEach(function (slot) {
            if (!FBDATA.settlementSites[slot.site]) faults.push(p.id + ': unknown site ' + slot.site);
          });
          p.customaryRights.forEach(function (right) {
            if (right.basis !== 'possession' || right.basisRef) faults.push(p.id + ': inherited appointment');
          });
        });
        ['layouts','climate'].forEach(function (field) {
          Object.keys(b[field]).forEach(function (pid) {
            if (!b.provinces.some(function (p) { return p.id === pid && !p.wasteland; })) faults.push(pid + ': foreign ' + field);
          });
        });
      });
      Object.keys(rs).forEach(function (id) {
        const r = rs[id], capital = ps[r.capital];
        if (!/_634$/.test(id) || !capital || capital.wasteland || capital.realm !== id) faults.push(id + ': invalid capital/identity');
        if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
        if (r.liege && !rs[r.liege]) external[r.liege] = true;
        identity(r.ruler ? r.ruler.culture : capital.culture,r.religion,'ruler',id);
        if (r.mobile || r.succession || r.administrationProfileId || r.aristocraticProfileId) faults.push(id + ': source authority');
        if (r.ruler && r.ruler.generated && (r.ruler.name || r.ruler.born !== 599 || r.royalCourt)) faults.push(id + ': source principal/family');
        if (!r.ruler && (r.government !== 'assembly_polity' || r.constituency !== 'settlement_federation' || r.representative.born !== 599))
          faults.push(id + ': invalid representative');
      });
      Object.keys(ds).forEach(function (id) { if (ds[id].kingdom && !ks[ds[id].kingdom]) faults.push(id + ': unknown kingdom'); });
      Object.keys(ks).forEach(function (id) { if (ks[id].empire && !es[ks[id].empire]) faults.push(id + ': unknown empire'); });
      return {faults:faults,courts:Object.keys(rs).length,external:Object.keys(external).sort()};
    } finally {
      FBDATA.religions = priorFaiths;
      if (priorWorld) FBDATA.bookmarks['634'] = priorWorld; else delete FBDATA.bookmarks['634'];
      FB.invalidateReligionData();
    }
  },Object.keys(packets));
  expect(result).toEqual({faults:[],courts:36,external:['munster_634','sasanian_634']});
  expect(await page.evaluate(snapshot)).toBe(before);
});

test('634 quadrant c has independent physical snapshots and explicit redated court limits',async function ({page},info) {
  await openGame(page,info);
  await page.addScriptTag({path:sourcePath});
  const result = await page.evaluate(function (keys) {
    const ps = {}, rs = {}, layouts = {}, source = {}, sourceLayouts = {}, faults = [], named = [], assemblies = [];
    Object.keys(FBDATA.bookmarkRegions568).forEach(function (key) {
      const b = FBDATA.bookmarkRegions568[key];
      b.provinces.forEach(function (p) { source[p.id] = p; });
      Object.assign(sourceLayouts,b.layouts || b.settlementLayouts);
    });
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      b.provinces.forEach(function (p) { ps[p.id] = p; });
      b.realms.forEach(function (r) {
        rs[r.id] = r;
        if (r.ruler && !r.ruler.generated) named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion]);
        if (r.representative) assemblies.push(r.id);
      });
      Object.assign(layouts,b.layouts);
    });
    Object.keys(ps).forEach(function (id) {
      const p = ps[id], old = source[id];
      const expected = JSON.parse(JSON.stringify(old));
      if (['veligrad','olomouc','brno','praha','plzen','budejovice'].indexOf(id) >= 0) {
        expected.culture = 'slavic';
        expected.religion = 'slavic_pagan';
        expected.communities = [{culture:'slavic',religion:'slavic_pagan',populationShare0:10000}];
      }
      ['name','names','communities','culture','religion','dev','x','y','terrain','wasteland','customaryRights'].forEach(function (field) {
        if (JSON.stringify(p[field]) !== JSON.stringify(expected[field])) faults.push(id + ': unexpected physical or resident ' + field);
      });
      if (!p.wasteland && JSON.stringify(layouts[id]) !== JSON.stringify(sourceLayouts[id])) faults.push(id + ': changed physical layout');
      if (p === old || p.communities && p.communities === old.communities || layouts[id] && layouts[id] === sourceLayouts[id])
        faults.push(id + ': shared source object');
    });
    return {faults:faults,named:named,assemblies:assemblies.sort(),heraclius:rs.byzantium_634,
      pannonian:['szekesfehervar','moson','zagreb','sisak','sirmium'].map(function (id) { return ps[id].realm; }),
      avar:[rs.avars_634.capital,rs.avars_634.ruler.culture,rs.avars_634.religion],
      external:[ps.limerick.realm,ps.derbent.realm,ps.van.realm],
      imperial:['tmutarakan','cherson','constantinople','athens','nicaea','nicosia','pliska','serdica','split']
        .every(function (id) { return ps[id].realm === 'byzantium_634'; }),
      noLombards:!rs.lombards_634 && !Object.keys(ps).some(function (id) { return ps[id].realm === 'lombards_634'; })};
  },Object.keys(packets));
  expect(result.faults).toEqual([]);
  expect(result.named).toEqual([['byzantium_634','Heraclius',575,'greek','chalcedonian']]);
  expect(result.heraclius).toMatchObject({capital:'constantinople',government:'roman_civic',rank:4,
    royalCourt:{members:[],spouseId:null}});
  expect(result.assemblies).toEqual(['estonian_634','finnish_634','ilmen_634','northern_gulf_634','saimaa_634','upper_volga_634']);
  expect(result.pannonian).toEqual(['avars_634','avars_634','avars_634','avars_634','avars_634']);
  expect(result.avar).toEqual(['gyula','avar_568','steppe_traditional_476']);
  expect(result.external).toEqual(['munster_634','sasanian_634','sasanian_634']);
  expect(result.imperial).toBe(true);
  expect(result.noLombards).toBe(true);
});

test('634 quadrant c publishes corrected residents and Sirmium while retaining held courts and seams',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const world = FB.bookmark('634');
    if (!world) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const ps = {}, rs = {};
    world.provinces.forEach(function (p) { ps[p.id] = p; });
    world.realms.forEach(function (r) { rs[r.id] = r; });
    return {
      slavic:['veligrad','olomouc','brno','praha','plzen','budejovice'].map(function (id) {
        const p = ps[id];
        return [id,p.realm,p.culture,p.religion,p.communities];
      }),
      avar:['sirmium','zagreb','sisak','szekesfehervar','moson'].map(function (id) {
        const p = ps[id];
        return [id,p.realm,p.culture,p.religion];
      }),
      heldMorava:['nitra','bratislava'].map(function (id) {
        const p = ps[id];
        return [p.realm,p.culture,p.religion];
      }),
      localCourts:['morava_634','bohemian_634'].map(function (id) {
        const r = rs[id];
        return [r.capital,r.ruler.generated,r.ruler.culture,r.religion];
      }),
      heldOwners:['ohrid','ras','bosna','tmutarakan','cherson','derbent','van'].map(function (id) { return ps[id].realm; }),
      munsterFaith:rs[ps.limerick.realm].religion
    };
  });
  expect(result.slavic).toEqual(['veligrad','olomouc','brno','praha','plzen','budejovice'].map(function (id,index) {
    return [id,index < 3 ? 'morava_634' : 'bohemian_634','slavic','slavic_pagan',
      [{culture:'slavic',religion:'slavic_pagan',populationShare0:10000}]];
  }));
  expect(result.avar).toEqual(['sirmium','zagreb','sisak','szekesfehervar','moson'].map(function (id) {
    return [id,'avars_634','roman','nicene'];
  }));
  expect(result.heldMorava).toEqual([
    ['morava_634','elbegermanic_476','germanic_pagan'],['morava_634','elbegermanic_476','germanic_pagan']
  ]);
  expect(result.localCourts).toEqual([
    ['veligrad',true,'elbegermanic_476','germanic_pagan'],['praha',true,'elbegermanic_476','germanic_pagan']
  ]);
  expect(result.heldOwners).toEqual(['byzantium_634','byzantium_634','byzantium_634',
    'byzantium_634','byzantium_634','sasanian_634','sasanian_634']);
  expect(result.munsterFaith).toBe('nicene');
});
