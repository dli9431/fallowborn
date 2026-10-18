'use strict';

const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_scaffold_d.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_a.js','data/starts.js',
  'data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_476_wider.js',
  'data/bookmark_476_wider_identities.js','data/bookmarks.js','data/counties.js',
  'data/bookmark_476_italy.js','data/bookmark_476_gaul_iberia.js',
  'data/bookmark_476_dalmatia_east.js','data/bookmark_476_africa.js','data/bookmark_476_outer.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/cultures.js','data/traits.js','data/eras.js','data/climate.js',
  'data/political_institutions.js','data/assembly_polities.js','js/model.js','js/world.js',
  'js/population.js','js/main.js','js/starts.js','js/systems.js','js/ui_modals.js'
]);

const packets = {
  anatolia:'nicaea dorylaion ancyra amorion smyrna sardis ephesos attaleia ikonion caesarea sebasteia trebizond sinope tarsos adana nicosia'.split(' '),
  levant_egypt:'damascus homs aleppo hama manbij antioch jerusalem acre amman mosul amida edessa harran raqqa alexandria rosetta fustat fayyum asyut luxor aswan siwa_oasis palmyra_district w_syrian'.split(' '),
  iberia_south_east:'sevilla cordoba ecija niebla granada malaga almeria guadix badajoz merida evora lisboa santarem coimbra silves beja valencia murcia denia albacete tortosa tarragona lerida zaragoza huesca tudela mallorca barcelona girona urgell'.split(' '),
  steppe_rivers:'novgorod ladoga pskov rostov suzdal beloozero smolensk kiev pereyaslavl chernigov kursk polotsk vitebsk turov minsk volodymyr lutsk etelkoz atil sarkel tmutarakan cherson bolghar bilyar upper_kama vychegda_district onega_district sarysu_corridor w_steppe_e w_ural w_taiga w_north'.split(' '),
  maghreb:'tunis kairouan tripoli sirte barqa fes tangier tlemcen tahert algiers constantine oran aghmat sale sijilmasa draa_oases garama ghadames_oasis awjila_oasis w_sahara_w w_sahara_c w_sahara_e'.split(' '),
  horn_sahel:'dongola soba axum lalibela zeila jenne_district gao_district chad_lakeshore qasr_ibrim kumbi_district timbuktu_district w_sahel w_nubia'.split(' ')
};
const keys = Object.keys(packets);

test('568 quadrant d loads from index with exact disjoint coverage in the selectable bookmark', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (expected) {
    var seen = {}, duplicates = [], actual = {}, scenery = [], inhabited = 0;
    Object.keys(expected).forEach(function (key) {
      var block = FBDATA.bookmarkRegions568[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) scenery.push(p.id); else inhabited++;
        return p.id;
      });
    });
    return {actual:actual,duplicates:duplicates,count:Object.keys(seen).length,
      inhabited:inhabited,scenery:scenery.sort(),selectable:FB.bookmarkAvailable('568'),
      publishedLayout:!!FBDATA.settlementLayouts['568']};
  },packets);
  expect(result.actual).toEqual(packets);
  expect(result.duplicates).toEqual([]);
  expect(result.count).toBe(137);
  expect(result.inhabited).toBe(127);
  expect(result.scenery).toEqual(['w_syrian','w_steppe_e','w_ural','w_taiga','w_north',
    'w_sahara_w','w_sahara_c','w_sahara_e','w_sahel','w_nubia'].sort());
  expect(result.selectable).toBe(true);
  expect(result.publishedLayout).toBe(true);
});

test('568 quadrant d reload changes no released definition, effective catalogue or seeded state', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const snapshot = function () {
    return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
      sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
      duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,empires:FBDATA.empires,
      rng:FB.getRngState(),uid:FB.getUidCounter()});
  };
  const before = await page.evaluate(snapshot);
  const blocksBefore = await page.evaluate(function (list) {
    return list.map(function (key) { return JSON.stringify(FBDATA.bookmarkRegions568[key]); });
  },keys);
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568_scaffold_d.js')});
  expect(await page.evaluate(snapshot)).toBe(before);
  expect(await page.evaluate(function (list) {
    return list.map(function (key) { return JSON.stringify(FBDATA.bookmarkRegions568[key]); });
  },keys)).toEqual(blocksBefore);
});

test('568 quadrant d retains physical and resident source inputs outside the declared corrections', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (list) {
    var primary = {}, alternate = {}, seeds = {}, faults = [], counts = {primary:0,alternate:0,newDistrict:0};
    FB.bookmark('493','world_v2').provinces.forEach(function (p) { primary[p.id] = p; });
    FB.bookmark('476','wider_v2').provinces.forEach(function (p) { alternate[p.id] = p; });
    FBDATA.geographies.europe_regional.provinces.concat(
      FBDATA.geographies.europe_regional_2.provinceAdditions).forEach(function (p) { seeds[p.id] = p; });
    var corridors = ['siwa_oasis','sarysu_corridor','vychegda_district','draa_oases',
      'ghadames_oasis','awjila_oasis','gao_district','chad_lakeshore'];
    var correctedFields = {mosul:['culture','religion','communities'],
      qasr_ibrim:['communities'],ghadames_oasis:['communities'],awjila_oasis:['communities']};
    list.forEach(function (key) {
      var block = FBDATA.bookmarkRegions568[key];
      block.provinces.forEach(function (p) {
        var seed = seeds[p.id];
        if (!seed) { faults.push(p.id + ': missing physical seed'); return; }
        ['x','y','terrain'].forEach(function (f) {
          if (p[f] !== seed[f]) faults.push(p.id + ': moved physical seed ' + f);
        });
        if (p.wasteland) {
          if (p.realm || p.culture || p.religion || p.dev || block.layouts[p.id]) faults.push(p.id + ': populated scenery');
          return;
        }
        var newDistrict = p.id === 'kumbi_district' || p.id === 'timbuktu_district';
        if (newDistrict) {
          counts.newDistrict++;
          if (p.dev !== 1 || p.culture !== 'sahelian_476' || p.religion !== 'sahel_traditional_476' ||
              block.layouts[p.id].length !== 1 || block.layouts[p.id][0].site !== p.id + '_site' ||
              block.layouts[p.id][0].kind !== 'village') faults.push(p.id + ': invalid bounded district');
          return;
        }
        var useAlternate = corridors.indexOf(p.id) >= 0;
        var source = (useAlternate ? alternate : primary)[p.id];
        counts[useAlternate ? 'alternate' : 'primary']++;
        if (!source || source.wasteland) { faults.push(p.id + ': missing inhabited source'); return; }
        ['culture','religion','dev','communities'].forEach(function (f) {
          if ((correctedFields[p.id] || []).indexOf(f) >= 0) return;
          if (JSON.stringify(p[f]) !== JSON.stringify(source[f])) faults.push(p.id + ': changed resident input ' + f);
        });
        if (p === source || p.communities === source.communities) faults.push(p.id + ': shared source identity');
        var sourceLayout = FBDATA.settlementLayouts[useAlternate ? '476_wider_v2' : '493_world_v2'][p.id];
        var expectedLayout = JSON.parse(JSON.stringify(sourceLayout));
        if (p.id === 'ikonion') expectedLayout.forEach(function (row) {
          if (row.site === 'isauria_476') row.name = 'Isaurian highlands';
        });
        if (JSON.stringify(block.layouts[p.id]) !== JSON.stringify(expectedLayout)) faults.push(p.id + ': changed ordered layout');
        if (block.layouts[p.id] === sourceLayout) faults.push(p.id + ': shared source layout');
      });
    });
    return {faults:faults,counts:counts};
  },keys);
  expect(result).toEqual({faults:[],counts:{primary:117,alternate:8,newDistrict:2}});
});

test('568 quadrant d resolves its local schema and only the four shared external courts', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (list) {
    var provinces = {}, realms = {}, groups = {duchies:{},kingdoms:{},empires:{}}, faults = [], external = {};
    var foreign = {east_568:true,sasanian_568:true,visigoths_568:true,suebi_568:true};
    list.forEach(function (key) {
      var block = FBDATA.bookmarkRegions568[key];
      if (block !== FBDATA['bookmarkRevisionContent_568_' + key] || block.bookmarkId !== '568' ||
          block.revision !== 'migration_v1') faults.push(key + ': missing dated literal owner');
      if (Object.keys(block.institutions).length || Object.keys(block.opening).length) faults.push(key + ': inherited opening/institution');
      block.provinces.forEach(function (p) { provinces[p.id] = p; });
      block.realms.forEach(function (r) {
        if (realms[r.id] || foreign[r.id]) faults.push(r.id + ': duplicate shared court');
        realms[r.id] = r;
      });
      Object.keys(groups).forEach(function (kind) {
        Object.keys(block[kind]).forEach(function (id) {
          if (groups[kind][id]) faults.push(id + ': duplicate title group');
          groups[kind][id] = block[kind][id];
        });
      });
    });
    function realmRef(id) {
      if (!realms[id] && !foreign[id]) faults.push(id + ': unknown court');
      if (foreign[id]) external[id] = true;
    }
    function identity(row,id) {
      if (!FB.cultureExists(row.culture,null)) faults.push(id + ': unknown culture');
      if (!FBDATA.religions[row.religion]) faults.push(id + ': unknown faith');
    }
    Object.keys(provinces).forEach(function (id) {
      var p = provinces[id];
      if (p.wasteland) return;
      realmRef(p.realm);
      if (!groups.duchies[p.duchy]) faults.push(id + ': unknown dated duchy');
      var pairs = {}, total = 0;
      p.communities.forEach(function (c) {
        identity(c,id);
        var pair = c.culture + '/' + c.religion;
        if (pairs[pair]) faults.push(id + ': duplicate community');
        pairs[pair] = true; total += c.populationShare0;
        if (c.populationShare0 > p.communities[0].populationShare0) faults.push(id + ': nonprincipal majority');
      });
      if (total !== 10000 || p.communities[0].culture !== p.culture ||
          p.communities[0].religion !== p.religion) faults.push(id + ': invalid resident shares');
      if (JSON.stringify(p.customaryRights) !== JSON.stringify([
        {power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}])) faults.push(id + ': inherited tenure receipt');
    });
    Object.keys(realms).forEach(function (id) {
      var r = realms[id], capital = provinces[r.capital];
      if (!capital || capital.wasteland || capital.realm !== id && !r.nonTerritorial) faults.push(id + ': invalid capital');
      if (!FBDATA.governmentForms[r.government]) faults.push(id + ': unknown government');
      if (r.liege) realmRef(r.liege);
      if (r.royalCourt || r.governingIdentity || r.aristocraticProfileId || r.ruler && r.ruler.name) faults.push(id + ': inherited court identity');
      if (r.government === 'assembly_polity') {
        if (r.constituency !== 'settlement_federation' || r.representative.born !== 533 ||
            r.ruler) faults.push(id + ': fabricated assembly principal');
        identity(capital,id);
      } else {
        identity({culture:r.ruler.culture,religion:r.religion},id);
        if (r.ruler.generated !== true || r.ruler.born !== 533 ||
            !FBDATA.traits[r.ruler.trait]) faults.push(id + ': invalid generated adult');
      }
      if (/_493|_476/.test(JSON.stringify(r))) {
        // Existing culture and faith profile ids intentionally retain their suffixes.
        var stripped = JSON.parse(JSON.stringify(r));
        delete stripped.religion;
        if (stripped.ruler) delete stripped.ruler.culture;
        if (/_493|_476/.test(JSON.stringify(stripped))) faults.push(id + ': stale dated political reference');
      }
    });
    Object.keys(groups.duchies).forEach(function (id) {
      if (!groups.kingdoms[groups.duchies[id].kingdom]) faults.push(id + ': unknown kingdom');
    });
    Object.keys(groups.kingdoms).forEach(function (id) {
      if (!groups.empires[groups.kingdoms[id].empire]) faults.push(id + ': unknown empire');
    });
    list.forEach(function (key) {
      var block = FBDATA.bookmarkRegions568[key];
      Object.keys(block.layouts).forEach(function (id) {
        if (!provinces[id] || provinces[id].wasteland || !block.layouts[id].length) faults.push(id + ': invalid layout owner');
        block.layouts[id].forEach(function (slot) {
          if (!FBDATA.settlementSites[slot.site]) faults.push(id + ': unknown physical site ' + slot.site);
        });
        if (!FBDATA.climateZones[block.climates[id]]) faults.push(id + ': unknown climate zone');
      });
    });
    return {faults:faults,courts:Object.keys(realms).length,external:Object.keys(external).sort()};
  },keys);
  expect(result).toEqual({faults:[],courts:36,external:['east_568','sasanian_568','suebi_568','visigoths_568']});
});

test('568 quadrant d identities become dated-eligible through the staged faith additions', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (list) {
    var rawReligions = FBDATA.religions, rawBookmark = FBDATA.bookmarks['568'];
    var definition = {id:'568',era:'late_antique',date:{year:568,season:0,day:1}};
    var faults = [], rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      FBDATA.bookmarks['568'] = definition;
      FBDATA.religions = Object.assign({},rawReligions);
      Object.keys(FBDATA.bookmarkFaithAvailability568).forEach(function (id) {
        var old = rawReligions[id], availability = JSON.parse(JSON.stringify(old.availability));
        availability.bookmarkIds = availability.bookmarkIds.concat(
          FBDATA.bookmarkFaithAvailability568[id].bookmarkIds.filter(function (date) {
            return availability.bookmarkIds.indexOf(date) < 0;
          }));
        FBDATA.religions[id] = Object.assign({},old,{availability:availability});
      });
      FB.invalidateReligionData();
      list.forEach(function (key) {
        var block = FBDATA.bookmarkRegions568[key];
        block.provinces.forEach(function (p) {
          (p.communities || []).forEach(function (c) {
            if (!FB.faithHistoricalAvailable(c.religion,definition,'community')) faults.push(p.id + ': unavailable resident faith');
          });
        });
        block.realms.forEach(function (r) {
          if (!FB.faithHistoricalAvailable(r.religion,definition,'ruler')) faults.push(r.id + ': unavailable court faith');
        });
      });
      return {faults:faults,religionFaults:FB.validateReligionData(null),
        pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally {
      FBDATA.religions = rawReligions;
      if (rawBookmark) FBDATA.bookmarks['568'] = rawBookmark;
      else delete FBDATA.bookmarks['568'];
      FB.invalidateReligionData();
    }
  },keys);
  expect(result).toEqual({faults:[],religionFaults:[],pure:true});
});

test('568 quadrant d separates current courts, residents and held historical identities', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (list) {
    var provinces = {}, realms = {};
    list.forEach(function (key) {
      FBDATA.bookmarkRegions568[key].provinces.forEach(function (p) { provinces[p.id] = p; });
      FBDATA.bookmarkRegions568[key].realms.forEach(function (r) { realms[r.id] = r; });
    });
    var owners = {};
    ['nicaea','antioch','alexandria','mosul','siwa_oasis','malaga','murcia','mallorca','cordoba',
      'sevilla','tunis','tangier','algiers','constantine','tmutarakan','cherson','dongola','soba',
      'qasr_ibrim','axum'].forEach(function (id) { owners[id] = provinces[id].realm; });
    return {owners:owners,aures:realms.aures_568.nonTerritorial,
      auresCapital:realms.aures_568.capital,nobadianCourt:realms.nobadia_568.religion,
      nobadianResidents:provinces.qasr_ibrim.religion,
      makurianCourt:realms.makuria_568.religion,alodianCourt:realms.alodia_568.religion,
      imperialIberianResidents:provinces.malaga.culture,
      romanPersianWar:list.some(function (key) { return !!FBDATA.bookmarkRegions568[key].stories; }),
      claimedPeople:Object.keys(realms).filter(function (id) { return !!(realms[id].ruler && realms[id].ruler.name); })};
  },keys);
  expect(result).toEqual({owners:{nicaea:'east_568',antioch:'east_568',alexandria:'east_568',
    mosul:'sasanian_568',siwa_oasis:'siwa_oasis_local_568',malaga:'east_568',murcia:'east_568',
    mallorca:'east_568',cordoba:'cordoba_568',sevilla:'visigoths_568',tunis:'east_568',
    tangier:'east_568',algiers:'east_568',constantine:'east_568',tmutarakan:'east_568',
    cherson:'east_568',dongola:'makuria_568',soba:'alodia_568',qasr_ibrim:'nobadia_568',axum:'aksum_568'},
    aures:true,auresCapital:'constantine',nobadianCourt:'miaphysite',nobadianResidents:'nile_traditional_476',
    makurianCourt:'nile_traditional_476',alodianCourt:'nile_traditional_476',
    imperialIberianResidents:'hispano_roman',romanPersianWar:false,claimedPeople:[]});
});

test('568 publishes the five corrected counties without changing neighboring held declarations', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function () {
    var b = FB.bookmark('568'), counties = {}, before = JSON.stringify(FBDATA);
    var rng = FB.getRngState(), uid = FB.getUidCounter();
    b.provinces.forEach(function (p) { counties[p.id] = p; });
    function residents(id) {
      var p = counties[id];
      return [p.realm,p.culture,p.religion,p.communities];
    }
    var faults = FB.validateBookmark(b);
    ['mosul','qasr_ibrim','ghadames_oasis','awjila_oasis'].forEach(function (id) {
      counties[id].communities.forEach(function (c) {
        if (!FB.faithHistoricalAvailable(c.religion,b,'community')) faults.push(id + ': unavailable faith');
      });
    });
    return {coimbra:residents('coimbra'),mosul:residents('mosul'),
      nobadia:residents('qasr_ibrim'),ghadames:residents('ghadames_oasis'),awjila:residents('awjila_oasis'),
      suevicCourts:b.realms.filter(function (r) { return r.id === 'suebi_568'; }).length,
      suevicCapital:b.realms.filter(function (r) { return r.id === 'suebi_568'; })[0].capital,
      held:{harran:residents('harran'),dongola:residents('dongola'),soba:residents('soba'),garama:residents('garama')},
      faults:faults,pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.coimbra).toEqual(['suebi_568','hispano_roman','nicene',[
    {culture:'hispano_roman',religion:'nicene',populationShare0:8000},
    {culture:'gothic',religion:'homoian',paired:true,populationShare0:2000}
  ]]);
  expect(result.mosul).toEqual(['sasanian_568','syriac','east_syriac',[
    {culture:'syriac',religion:'east_syriac',populationShare0:7500,paired:true},
    {culture:'persian',religion:'zoroastrian',populationShare0:2500}
  ]]);
  expect(result.nobadia).toEqual(['nobadia_568','nubian','nile_traditional_476',[
    {culture:'nubian',religion:'nile_traditional_476',populationShare0:7500},
    {culture:'nubian',religion:'miaphysite',populationShare0:2500}
  ]]);
  for (const name of ['ghadames','awjila']) {
    expect(result[name]).toEqual([name + '_oasis_local_568','berber','berber_traditional',[
      {culture:'berber',religion:'berber_traditional',populationShare0:7500},
      {culture:'berber',religion:'nicene',populationShare0:2500}
    ]]);
  }
  expect(result.suevicCourts).toBe(1);
  expect(result.suevicCapital).toBe('lugo');
  expect(result.held.harran).toEqual(['east_568','syriac','miaphysite',[
    {culture:'syriac',religion:'miaphysite',populationShare0:8000},
    {culture:'greek',religion:'chalcedonian',populationShare0:2000,paired:true}
  ]]);
  for (const name of ['dongola','soba']) {
    expect(result.held[name]).toEqual([name === 'dongola' ? 'makuria_568' : 'alodia_568',
      'nubian','nile_traditional_476',[{culture:'nubian',religion:'nile_traditional_476',populationShare0:10000}]]);
  }
  expect(result.held.garama).toEqual(['garama_local_568','berber','berber_traditional',[
    {culture:'berber',religion:'berber_traditional',populationShare0:10000}
  ]]);
  expect(result.faults).toEqual([]);
  expect(result.pure).toBe(true);
});

test('568 offers the Nobadian Christian beginning and seeds corrected populations with conserved totals', async function ({page},testInfo) {
  await openGame(page,testInfo);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('CORRECT568-568-farmer_568-qasr_ibrim-m-Review-established-0-nubian.miaphysite');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('input[name=cg-community]')).toHaveCount(2);
  await expect(page.locator('input[name=cg-community]').nth(1)).toBeChecked();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await page.evaluate(function () { FB.game.setPaused(true); });
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result = await page.evaluate(function () {
    var s = FB.state, me = s.chars[s.player.charId], populations = {}, faults = [];
    ['mosul','qasr_ibrim','ghadames_oasis','awjila_oasis'].forEach(function (id) {
      var p = FB.world.byId[id], communities = FB.countyCommunities(s,id);
      var total = FB.countyPopulation(s,id);
      if (communities.reduce(function (sum,c) { return sum + c.count; },0) !== total ||
          total !== FB.countyPopulationBaseline(s,id)) faults.push(id + ': changed population total');
      communities.forEach(function (c,index) {
        var authored = p.communities[index];
        if (!authored || c.culture !== authored.culture || c.religion !== authored.religion ||
            Math.abs(c.count - total * authored.populationShare0 / 10000) > 1) faults.push(id + ': wrong opening share');
      });
      if (communities.length !== 2) faults.push(id + ': missing community');
      populations[id] = communities.map(function (c) { return c.culture + '/' + c.religion; });
    });
    return {home:s.player.provinceId,identity:[me.culture,me.religion],turn:s.turn,
      owners:['coimbra','mosul','qasr_ibrim','ghadames_oasis','awjila_oasis'].map(function (id) { return s.owner[id]; }),
      populations:populations,faults:faults};
  });
  expect(result).toEqual({home:'qasr_ibrim',identity:['nubian','miaphysite'],turn:0,
    owners:['suebi_568','sasanian_568','nobadia_568','ghadames_oasis_local_568','awjila_oasis_local_568'],
    populations:{mosul:['syriac/east_syriac','persian/zoroastrian'],
      qasr_ibrim:['nubian/nile_traditional_476','nubian/miaphysite'],
      ghadames_oasis:['berber/berber_traditional','berber/nicene'],
      awjila_oasis:['berber/berber_traditional','berber/nicene']},faults:[]});
});
