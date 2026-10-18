'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_identities.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js','data/counties.js','data/map_data.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/cultures.js','data/political_institutions.js','data/assembly_polities.js',
  'data/climate.js','js/model.js','js/world.js','js/governments.js',
  'js/population.js','js/main.js','js/save.js','js/save_v4.js'
]);

const packets = {
  balkans:'constantinople adrianople thessaloniki serres larissa athens thebes korinth sparta ioannina dyrrachion candia serdica philippopolis skopje ohrid ras kotor bosna knin split zadar'.split(' '),
  frankish_northwest:'paris chartres sens orleans rouen caen evreux bayeux angers tours le_mans blois bourges reims troyes chalons amiens st_quentin laon bruges ghent boulogne arras rennes nantes vannes quimper st_brieuc'.split(' '),
  britain_north:'york scarborough bamburgh durham carlisle lancaster scone dundee aberdeen elgin inverness edinburgh stirling glasgow dumbarton whithorn iona man lewis'.split(' '),
  scandinavia_baltic:'agder stavanger bergen oslo tonsberg trondheim halogaland uppsala birka skara vaxjo kalmar visby norrland arhus viborg hedeby ribe roskilde lund sambia natangia samogitia vilnius riga jersika tallinn tartu turku hame savo kexholm torne_district w_lapland'.split(' '),
  central_asia_sindh:'ghor balkh termez zaranj bust kandahar ghazni kabul bamiyan bukhara samarkand usrushana chach tiz panjgur qusdar mansura debal shebar_valley gomal_valley thar_margin nurata_foothills lower_syr_darya kath_district gurganj_district w_registan w_hindukush w_sulaiman w_thar w_karakum w_kyzylkum'.split(' ')
};

test('568 quadrant c has exact disjoint coverage in the complete selectable world', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const coverage = await page.evaluate(function (expected) {
    const seen = {}, duplicates = [], actual = {}, scenery = [];
    Object.keys(expected).forEach(function (key) {
      const block = FBDATA.bookmarkRegions568[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) scenery.push(p.id);
        return p.id;
      });
    });
    const scripts = Array.prototype.map.call(document.scripts,function (script) { return script.getAttribute('src'); });
    return {actual:actual,duplicates:duplicates,count:Object.keys(seen).length,scenery:scenery.sort(),
      selectable:FB.bookmarkAvailable('568'),liveLayout:!!FBDATA.settlementLayouts['568'],
      afterSource:scripts.indexOf('data/bookmark_568_scaffold_c.js') > scripts.indexOf('data/bookmark_493_world.js')};
  },packets);
  expect(coverage.actual).toEqual(packets);
  expect(coverage.duplicates).toEqual([]);
  expect(coverage.count).toBe(134);
  expect(coverage.scenery).toEqual(['w_lapland','w_registan','w_hindukush','w_sulaiman','w_thar','w_karakum','w_kyzylkum'].sort());
  expect(coverage.selectable).toBe(true);
  expect(coverage.liveLayout).toBe(true);
  expect(coverage.afterSource).toBe(true);
});

test('568 quadrant c reload leaves active catalogues, retained worlds and random state unchanged', async function ({page},testInfo) {
  await openGame(page,testInfo);
  function snapshot() {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,sites:FBDATA.settlementSites,
      layouts:FBDATA.settlementLayouts,cultures:FBDATA.cultures,religions:FBDATA.religions,
      duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,empires:FBDATA.empires,
      institutions:FBDATA.localInstitutions,stories:FBDATA.storyInstances,
      geography:FBDATA.geographies,rng:FB.getRngState(),uid:FB.getUidCounter()});
  }
  const before = await page.evaluate(snapshot);
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568_scaffold_c.js')});
  expect(await page.evaluate(snapshot)).toBe(before);
});

test('568 quadrant c resolves physical, political, identity and title references before composition', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, duchies = {}, kingdoms = {}, empires = {}, faults = [];
    const rawReligions = FBDATA.religions, previousBookmark = FBDATA.bookmarks['568'];
    const candidate = {id:'568',era:'late_antique',date:{year:568,season:0,day:1}};
    const seeds = {};
    FBDATA.geographies.europe_regional.provinces.concat(FBDATA.geographies.europe_regional_2.provinceAdditions)
      .forEach(function (p) { seeds[p.id] = p; });
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions568[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        if (realms[r.id]) faults.push(r.id + ': duplicated court');
        realms[r.id] = r;
      });
      Object.assign(duchies,block.duchies); Object.assign(kingdoms,block.kingdoms); Object.assign(empires,block.empires);
    });
    try {
      // Stage the already-declared faith selectors in this disposable context only.
      FBDATA.bookmarks['568'] = candidate;
      FBDATA.religions = Object.assign({},rawReligions);
      Object.keys(FBDATA.bookmarkFaithAvailability568).forEach(function (id) {
        const old = rawReligions[id], availability = JSON.parse(JSON.stringify(old.availability));
        FBDATA.bookmarkFaithAvailability568[id].bookmarkIds.forEach(function (date) {
          if (availability.bookmarkIds.indexOf(date) < 0) availability.bookmarkIds.push(date);
        });
        FBDATA.religions[id] = Object.assign({},old,{availability:availability});
      });
      FB.invalidateReligionData();
      function identity(culture,faith,consumer,owner) {
        if (!FB.cultureExists(culture,null)) faults.push(owner + ': unknown culture ' + culture);
        if (!FB.faithHistoricalAvailable(faith,candidate,consumer)) faults.push(owner + ': unavailable faith ' + faith);
      }
      keys.forEach(function (key) {
        const block = FBDATA.bookmarkRegions568[key];
        block.provinces.forEach(function (p) {
          const seed = seeds[p.id];
          if (!seed || p.x !== seed.x || p.y !== seed.y) faults.push(p.id + ': changed physical seed');
          if (p.wasteland) {
            if (p.realm || p.culture || p.religion || p.communities || block.layouts[p.id]) faults.push(p.id + ': inhabited scenery');
            return;
          }
          if (!realms[p.realm]) faults.push(p.id + ': unresolved owner');
          if (!duchies[p.duchy]) faults.push(p.id + ': unresolved district');
          if (!FBDATA.climateZones[block.climate[p.id]]) faults.push(p.id + ': unknown climate');
          let total = 0;
          const pairs = {};
          p.communities.forEach(function (c) {
            identity(c.culture,c.religion,'community',p.id);
            const pair = c.culture + '/' + c.religion;
            if (pairs[pair] || !Number.isInteger(c.populationShare0) || c.populationShare0 <= 0) faults.push(p.id + ': invalid community');
            pairs[pair] = true; total += c.populationShare0;
          });
          if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion) faults.push(p.id + ': invalid primary/share total');
          const layout = block.layouts[p.id];
          if (!layout || !layout.length) faults.push(p.id + ': missing settlement');
          (layout || []).forEach(function (slot) {
            if (!FBDATA.settlementSites[slot.site]) faults.push(p.id + ': unknown site ' + slot.site);
          });
          p.customaryRights.forEach(function (right) {
            if (right.basis !== 'possession' || right.basisRef) faults.push(p.id + ': inherited source appointment');
          });
        });
        Object.keys(block.layouts).forEach(function (pid) {
          if (packetsLocal(key).indexOf(pid) < 0) faults.push(pid + ': foreign layout');
        });
        function packetsLocal(name) { return FBDATA.bookmarkRegions568[name].provinces.map(function (p) { return p.id; }); }
      });
      Object.keys(realms).forEach(function (id) {
        const r = realms[id], capital = provinces[r.capital];
        if (!/_568$/.test(id) || r.mobile) faults.push(id + ': inherited identity or mobile state');
        const superior = id === 'bukhara_568' || id === 'samarkand_568' ? 'western_turks_568' : null;
        if ((r.liege || null) !== superior) faults.push(id + ': wrong superior');
        if (superior && (!realms[superior] || realms[superior].rank <= r.rank || realms[superior].liege))
          faults.push(id + ': invalid superior hierarchy');
        if (id === 'austrasia_568') {
          if (r.capital !== 'metz') faults.push(id + ': wrong external capital');
        } else if (!capital || capital.wasteland || capital.realm !== id) faults.push(id + ': invalid capital');
        if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
        if (r.ruler) identity(r.ruler.culture,r.religion,'ruler',id);
        else {
          identity(capital.culture,r.religion,'ruler',id);
          if (r.government !== 'assembly_polity' || r.constituency !== 'settlement_federation' || r.representative.born !== 533) faults.push(id + ': invalid generated representative');
        }
        if (r.ruler && r.ruler.generated && (r.ruler.name || r.ruler.born !== 533 || r.royalCourt)) faults.push(id + ': fabricated identity or source genealogy');
        if (r.ruler && !r.ruler.generated && (!r.royalCourt || r.royalCourt.spouseId !== null || r.royalCourt.members.length)) faults.push(id + ': unsourced historical family');
      });
      Object.keys(duchies).forEach(function (id) { if (!kingdoms[duchies[id].kingdom]) faults.push(id + ': unresolved kingdom'); });
      Object.keys(kingdoms).forEach(function (id) { if (!empires[kingdoms[id].empire]) faults.push(id + ': unresolved empire'); });
      return {faults:faults,courts:Object.keys(realms).length,
        generated:Object.keys(realms).filter(function (id) { return !realms[id].ruler || realms[id].ruler.generated; }).length};
    } finally {
      FBDATA.religions = rawReligions;
      if (previousBookmark) FBDATA.bookmarks['568'] = previousBookmark; else delete FBDATA.bookmarks['568'];
      FB.invalidateReligionData();
    }
  },Object.keys(packets));
  expect(result).toEqual({faults:[],courts:47,generated:43});
});

test('568 quadrant c redates imperial and Frankish courts and retains regional limits', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, layouts = {}, named = [];
    keys.forEach(function (key) {
      const block = FBDATA.bookmarkRegions568[key];
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        realms[r.id] = r;
        if (r.ruler && !r.ruler.generated) named.push([r.id,r.ruler.name,r.ruler.born,r.ruler.culture,r.religion]);
      });
      Object.assign(layouts,block.layouts);
    });
    return {named:named.sort(),imperial:packetsBalkans().every(function (p) { return p.realm === 'east_568'; }),
      clyde:realms.clyde_568.capital,clydeSite:layouts.dumbarton[0].name,
      bernicia:[realms.bernicia_568.capital,realms.bernicia_568.ruler.culture,realms.bernicia_568.religion],
      berniciaResidents:provinces.bamburgh.communities,
      turks:[realms.western_turks_568.capital,realms.western_turks_568.ruler.generated,realms.western_turks_568.ruler.culture],
      chachResidents:provinces.chach.culture,bactria:provinces.balkh.realm,
      retired:!realms.hephthalite_568 && !realms.chach_568 && !realms.franks_568,
      district:[provinces.gurganj_district.dev,layouts.gurganj_district[0].kind,layouts.gurganj_district[0].site],
      corridors:['gomal_valley','thar_margin','lower_syr_darya'].every(function (id) { return !provinces[id].wasteland && !!provinces[id].realm; })};
    function packetsBalkans() { return FBDATA.bookmarkRegions568.balkans.provinces; }
  },Object.keys(packets));
  expect(result.named).toEqual([
    ['austrasia_568','Sigebert I',535,'frankish','nicene'],
    ['burgundy_568','Guntram',532,'frankish','nicene'],
    ['east_568','Justin II',515,'greek','chalcedonian'],
    ['neustria_568','Chilperic I',539,'frankish','nicene']
  ]);
  expect(result.imperial).toBe(true);
  expect(result.clyde).toBe('dumbarton');
  expect(result.clydeSite).toBe('Alt Clut');
  expect(result.bernicia).toEqual(['bamburgh','saxon_476','germanic_pagan']);
  expect(result.berniciaResidents).toEqual([{culture:'brittonic',religion:'nicene',populationShare0:8000},
    {culture:'saxon_476',religion:'germanic_pagan',populationShare0:2000}]);
  expect(result.turks).toEqual(['chach',true,'central_steppe_476']);
  expect(result.chachResidents).toBe('sogdian_476');
  expect(result.bactria).toBe('bactria_568');
  expect(result.retired).toBe(true);
  expect(result.district).toEqual([1,'village','gurganj_district_site']);
  expect(result.corridors).toBe(true);
});

test('568 corrected quadrant c reaches the composed world while disputed rows retain their scaffold values', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    const b = FB.bookmark('568'), provinces = {}, realms = {};
    b.provinces.forEach(function (p) { provinces[p.id] = p; });
    b.realms.forEach(function (r) { realms[r.id] = r; });
    const man = provinces.man;
    return {
      tours:[provinces.tours.realm,provinces.tours.culture,provinces.tours.religion,provinces.tours.dev],
      man:[man.realm,man.culture,man.religion,man.dev,man.communities],
      manCourt:[realms.man_local_568.capital,realms.man_local_568.religion],
      shareTotal:man.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0),
      eligible:man.communities.every(function (c) { return FB.faithHistoricalAvailable(c.religion,b,'community'); }),
      localHolders:['bukhara','samarkand','usrushana','nurata_foothills'].map(function (id) { return provinces[id].realm; }),
      hierarchy:['bukhara_568','samarkand_568','western_turks_568'].map(function (id) {
        const r = realms[id];
        return [r.id,r.capital,r.rank,r.liege || null,r.ruler.generated];
      }),
      turkicCourts:b.realms.filter(function (r) { return r.id === 'western_turks_568'; }).length,
      heldFrankish:['paris','chartres','troyes','rennes','nantes'].map(function (id) { return provinces[id].realm; }),
      armorica:realms.armorica_568.capital,guntram:realms.burgundy_568.ruler.born,
      heldNorthern:['scone','inverness','edinburgh','stirling'].map(function (id) {
        const p = provinces[id]; return [p.realm,p.religion];
      }),
      heldEastern:['bactria_568','sistan_568','arachosia_568','kabul_568','makran_568','indus_568',
        'lower_syr_darya_local_568','kath_district_local_568','gurganj_district_local_568']
        .every(function (id) { return !realms[id].liege; }),
      validated:FB.validateBookmark(b)
    };
  });
  expect(result).toEqual({
    tours:['austrasia_568','gallo_roman','nicene',4],
    man:['man_local_568','brittonic','insular_traditional_476',1,[
      {culture:'brittonic',religion:'insular_traditional_476',populationShare0:7500},
      {culture:'brittonic',religion:'nicene',populationShare0:2500}
    ]],
    manCourt:['man','insular_traditional_476'],shareTotal:10000,eligible:true,
    localHolders:['bukhara_568','samarkand_568','samarkand_568','samarkand_568'],
    hierarchy:[['bukhara_568','bukhara',1,'western_turks_568',true],
      ['samarkand_568','samarkand',1,'western_turks_568',true],
      ['western_turks_568','chach',2,null,true]],turkicCourts:1,
    heldFrankish:['neustria_568','neustria_568','austrasia_568','armorica_568','armorica_568'],
    armorica:'rennes',guntram:532,
    heldNorthern:[['pictish_east_568','insular_traditional_476'],['pictish_north_568','insular_traditional_476'],
      ['northern_britons_568','nicene'],['northern_britons_568','nicene']],
    heldEastern:true,validated:[]
  });
});

test('568 corrected sovereignty, local holders and mixed Man residents survive campaign creation and restore', async function ({page},testInfo) {
  await beginBookmark(page,testInfo,'568','farmer_568');
  function snapshot() {
    const s = FB.state, communities = FB.countyCommunities(s,'man');
    return {
      tours:[s.owner.tours,s.holder.tours],
      sogdiana:['bukhara','samarkand','usrushana','nurata_foothills'].map(function (id) {
        return [s.owner[id],s.holder[id],FB.topRealm(s,s.holder[id])];
      }),
      courts:['bukhara_568','samarkand_568','western_turks_568'].map(function (id) {
        const r = s.realms[id], ruler = FB.realmRulerCharacterSnapshot(s,id);
        return [r.id,r.capital,r.rank,r.liege,ruler && ruler.id];
      }),
      man:[s.owner.man,s.holder.man,s.realms.man_local_568.religion],
      communities:communities,
      partitioned:communities.reduce(function (sum,c) { return sum + c.count; },0) === FB.countyPopulation(s,'man'),
      christianShare:FB.countyReligionShare(s,'man','nicene'),
      errors:FBTEST.checkInvariants(),saveErrors:FB.save.v4.validatePlatform(s)
    };
  }
  const before = await page.evaluate(snapshot);
  expect(before.tours).toEqual(['austrasia_568','austrasia_568']);
  expect(before.sogdiana).toEqual([
    ['western_turks_568','bukhara_568','western_turks_568'],
    ['western_turks_568','samarkand_568','western_turks_568'],
    ['western_turks_568','samarkand_568','western_turks_568'],
    ['western_turks_568','samarkand_568','western_turks_568']
  ]);
  expect(before.courts.every(function (r) { return typeof r[4] === 'string' && !!r[4]; })).toBe(true);
  expect(new Set(before.courts.map(function (r) { return r[4]; })).size).toBe(3);
  expect(before.man).toEqual(['man_local_568','man_local_568','insular_traditional_476']);
  expect(before.communities.map(function (c) { return [c.culture,c.religion]; })).toEqual([
    ['brittonic','insular_traditional_476'],['brittonic','nicene']
  ]);
  expect(before.partitioned).toBe(true);
  expect(before.christianShare).toBeCloseTo(0.25,3);
  expect(before.errors).toEqual([]);
  expect(before.saveErrors).toEqual([]);
  const save = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,save);
  expect(await page.evaluate(snapshot)).toEqual(before);
});
