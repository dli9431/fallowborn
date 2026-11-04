'use strict';
const {prepareGameContent} = require('../support/game/navigation');

const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_scaffold_d.js','data/bookmark_634_identities.js','data/bookmark_634.js',
  'js/bookmark_composition.js','js/main.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmark_568_identities.js','data/bookmark_476_wider_identities.js',
  'data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/counties.js','data/climate.js','data/cultures.js','data/traits.js',
  'data/political_institutions.js','data/assembly_polities.js','data/eras.js',
  'js/model.js','js/world.js','js/governments.js','js/government_selection.js',
  'js/mods.js','js/crazygames.js','js/main.js','js/ui_misc.js','js/ui_modals.js'
]);

const packets = {
  "b22": [
    "ani",
    "kars",
    "dvin",
    "tbilisi",
    "kutaisi",
    "sukhumi",
    "magas",
    "tunis",
    "kairouan",
    "tripoli",
    "sirte",
    "barqa",
    "fes",
    "tangier",
    "tlemcen",
    "tahert",
    "algiers",
    "constantine"
  ],
  "b23": [
    "oran",
    "aghmat",
    "sale",
    "sijilmasa",
    "alexandria",
    "rosetta",
    "fustat",
    "fayyum",
    "asyut",
    "luxor",
    "aswan",
    "damascus",
    "homs",
    "aleppo",
    "hama",
    "manbij",
    "antioch",
    "jerusalem"
  ],
  "b24": [
    "acre",
    "amman",
    "mosul",
    "amida",
    "edessa",
    "harran",
    "raqqa",
    "baghdad",
    "samarra",
    "kufa",
    "basra",
    "wasit",
    "mecca",
    "medina",
    "yamama",
    "qatif",
    "sanaa",
    "aden"
  ],
  "b25": [
    "shibam",
    "zeila",
    "muscat",
    "nizwa",
    "sohar",
    "rayy",
    "qazvin",
    "hamadan",
    "isfahan",
    "qom",
    "tabriz",
    "ardabil",
    "shiraz",
    "istakhr",
    "kerman",
    "bam",
    "hormuz",
    "merv"
  ],
  "b26": [
    "nishapur",
    "herat",
    "ghor",
    "balkh",
    "termez",
    "zaranj",
    "bust",
    "kandahar",
    "ghazni",
    "kabul",
    "bamiyan",
    "bukhara",
    "samarkand",
    "usrushana",
    "chach",
    "amol",
    "gorgan",
    "rasht"
  ],
  "b27": [
    "tiz",
    "panjgur",
    "qusdar",
    "mansura",
    "debal",
    "dongola",
    "soba",
    "axum",
    "lalibela"
  ],
  "b28": [
    "draa_oases",
    "garama",
    "ghadames_oasis",
    "awjila_oasis",
    "siwa_oasis",
    "jenne_district",
    "gao_district",
    "chad_lakeshore",
    "qasr_ibrim",
    "najran_oasis",
    "tayma_oasis",
    "palmyra_district",
    "central_iran_oases",
    "eastern_iran_oases",
    "shebar_valley",
    "gomal_valley",
    "thar_margin",
    "sarakhs_oasis"
  ],
  "b29": [
    "nurata_foothills",
    "lower_syr_darya",
    "sarysu_corridor",
    "upper_kama",
    "vychegda_district",
    "onega_district",
    "torne_district",
    "kath_district",
    "gurganj_district",
    "kumbi_district",
    "timbuktu_district"
  ],
  "scenery_d": [
    "w_ural",
    "w_taiga",
    "w_north",
    "w_lapland"
  ]
};
const keys = Object.keys(packets);
const sourcePath = path.resolve(__dirname,'../../../data/bookmark_634_scaffold_d.js');

test('634 Nubian court faiths compose without converting residents or merging courts',async function ({page},info) {
  await openGame(page,info);
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const bookmark = FB.bookmark('634');
    if (!bookmark) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    const staged = FBDATA.bookmarkRegions634.b27;
    const ids = ['makuria_634','alodia_634','nobadia_634'];
    function courts(rows) {
      return ids.map(function (id) {
        const r = rows.filter(function (row) { return row.id === id; })[0];
        return {id:r.id,capital:r.capital,religion:r.religion,ruler:r.ruler,
          available:FB.faithHistoricalAvailable(r.religion,bookmark,'ruler')};
      });
    }
    const stagedRows = staged.realms.concat(FBDATA.bookmarkRegions634.b28.realms);
    return {staged:courts(stagedRows),composed:courts(bookmark.realms),
      residents:['dongola','soba','qasr_ibrim'].map(function (id) {
        const p = bookmark.provinces.filter(function (row) { return row.id === id; })[0];
        return {id:p.id,realm:p.realm,religion:p.religion,communities:p.communities};
      })};
  })).toEqual((function () {
    const courts = [
      {id:'makuria_634',capital:'dongola',religion:'chalcedonian'},
      {id:'alodia_634',capital:'soba',religion:'miaphysite'},
      {id:'nobadia_634',capital:'qasr_ibrim',religion:'miaphysite'}
    ].map(function (r) {
      return Object.assign(r,{ruler:{generated:true,sex:'m',culture:'nubian',born:599,mar:5,trait:'patient'},available:true});
    });
    return {staged:courts,composed:courts,residents:['dongola','soba','qasr_ibrim'].map(function (id,i) {
      const communities = [{culture:'nubian',religion:'nile_traditional_476',populationShare0:i === 2 ? 7500 : 10000}];
      if (i === 2) communities.push({culture:'nubian',religion:'miaphysite',populationShare0:2500});
      return {id:id,realm:courts[i].id,religion:'nile_traditional_476',communities:communities};
    })};
  }()));
});

async function stage(page) {
  await page.addScriptTag({path:sourcePath});
}

for (const crazy of [false,true]) {
  test('634 quadrant d stages and reloads without publishing on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const snapshot = function () {
        return JSON.stringify({bookmarks:FBDATA.bookmarks,layouts:FBDATA.settlementLayouts,
          sites:FBDATA.settlementSites,cultures:FBDATA.cultures,religions:FBDATA.religions,
          forms:FBDATA.governmentForms,duchies:FBDATA.duchies,kingdoms:FBDATA.kingdoms,
          empires:FBDATA.empires,state:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter()});
      };
      const before = await page.evaluate(snapshot);
      await stage(page);
      const blocks = await page.evaluate(function (keys) {
        return keys.map(function (key) { return JSON.stringify(FBDATA.bookmarkRegions634[key]); });
      },keys);
      expect(await page.evaluate(snapshot)).toBe(before);
      await stage(page);
      expect(await page.evaluate(snapshot)).toBe(before);
      expect(await page.evaluate(function (keys) {
        return keys.map(function (key) { return JSON.stringify(FBDATA.bookmarkRegions634[key]); });
      },keys)).toEqual(blocks);
      expect(await page.evaluate(function () {
        return {hidden:FBDATA.bookmarks['634'].hidden,
          formPublished:!!FBDATA.governmentForms.medinan_selection_pf_634,
          faithPublished:FB.faithExists('early_islam_634',null)};
      })).toEqual({hidden:true,formPublished:true,faithPublished:true});
    });
}

test('634 quadrant d covers exactly eight complete batches and four scenery anchors',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  expect(await page.evaluate(function (expected) {
    const seen = {}, duplicates = [], actual = {}, scenic = [];
    Object.keys(expected).forEach(function (key) {
      const block = FBDATA.bookmarkRegions634[key];
      actual[key] = block.provinces.map(function (p) {
        if (seen[p.id]) duplicates.push(p.id);
        seen[p.id] = true;
        if (p.wasteland) scenic.push(p.id);
        return p.id;
      });
    });
    return {actual:actual,duplicates:duplicates,total:Object.keys(seen).length,scenic:scenic};
  },packets)).toEqual({actual:packets,duplicates:[],total:132,scenic:packets.scenery_d});
});

test('634 quadrant d resolves local courts, titles, residents, sites and the imperial external reference',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  expect(await page.evaluate(function (keys) {
    const provinces = {}, realms = {}, titles = {duchies:{},kingdoms:{},empires:{}};
    const faults = [], external = {};
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      if (b !== FBDATA['bookmarkRevisionContent_634_' + key] || b.bookmarkId !== '634' ||
          b.revision !== 'baseline') faults.push(key + ': invalid literal owner');
      if (Object.keys(b.institutions).length || Object.keys(b.opening).length ||
          b.storyIds || b.stories || b.administrationProfiles || b.aristocraticProfiles)
        faults.push(key + ': inherited institutions or opening');
      b.provinces.forEach(function (p) { provinces[p.id] = p; });
      b.realms.forEach(function (r) {
        if (realms[r.id] || r.id === 'byzantium_634') faults.push(r.id + ': duplicate court');
        realms[r.id] = r;
      });
      Object.keys(titles).forEach(function (kind) {
        Object.keys(b[kind]).forEach(function (id) {
          if (titles[kind][id] || id.indexOf('_634_' + key + '_') < 0) faults.push(id + ': invalid title owner');
          titles[kind][id] = b[kind][id];
        });
      });
    });
    function realmRef(id) {
      if (id === 'byzantium_634') external[id] = true;
      else if (!realms[id]) faults.push(id + ': missing court');
    }
    function identity(row,id) {
      if (!FB.cultureExists(row.culture,null)) faults.push(id + ': unknown culture');
      if (!FBDATA.religions[row.religion] && !FBDATA.bookmarkReligions634[row.religion])
        faults.push(id + ': unknown faith');
    }
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      const sites = Object.assign({},FBDATA.settlementSites,b.settlementSites);
      b.provinces.forEach(function (p) {
        if (p.wasteland) {
          if (p.realm || p.culture || p.religion || p.communities || b.layouts[p.id])
            faults.push(p.id + ': inhabited scenery');
          return;
        }
        realmRef(p.realm);identity(p,p.id);
        if (!b.duchies[p.duchy] || p.dev < 1 || p.dev > 10) faults.push(p.id + ': invalid county');
        const pairs = {};let total = 0;
        p.communities.forEach(function (c) {
          identity(c,p.id);const pair = c.culture + '/' + c.religion;
          if (pairs[pair] || c.populationShare0 <= 0 || c.populationShare0 > p.communities[0].populationShare0)
            faults.push(p.id + ': invalid community');
          pairs[pair] = true;total += c.populationShare0;
        });
        if (total !== 10000 || p.communities[0].culture !== p.culture || p.communities[0].religion !== p.religion)
          faults.push(p.id + ': invalid resident total');
        if (!b.layouts[p.id] || !FBDATA.climateZones[b.climates[p.id]]) faults.push(p.id + ': missing layout or climate');
        (b.layouts[p.id] || []).forEach(function (slot) {
          if (!sites[slot.site]) faults.push(p.id + ': unknown physical site');
        });
      });
    });
    Object.keys(realms).forEach(function (id) {
      const r = realms[id], capital = provinces[r.capital];
      if (!capital || capital.wasteland || capital.realm !== id && !r.nonTerritorial) faults.push(id + ': invalid capital');
      if (r.liege) realmRef(r.liege);
      if (!FBDATA.governmentForms[r.government] && !FBDATA.bookmarkRegions634.b24.governmentForms[r.government])
        faults.push(id + ': unknown government');
      if (r.administrationProfileId || r.aristocraticProfileId || r.governingIdentity) faults.push(id + ': inherited profile');
      if (r.representative) {
        if (r.representative.born !== 599 || r.ruler) faults.push(id + ': invalid representative');
      } else {
        identity({culture:r.ruler.culture,religion:r.religion},id);
        if (r.ruler.name) {
          if (['rashidun_634','sasanian_634'].indexOf(id) < 0 || !r.royalCourt ||
              r.royalCourt.members.length || r.royalCourt.spouseId !== null) faults.push(id + ': invented historical family');
        } else if (r.ruler.generated !== true || r.ruler.born !== 599) faults.push(id + ': invalid generated adult');
      }
    });
    Object.keys(titles.duchies).forEach(function (id) {
      if (!titles.kingdoms[titles.duchies[id].kingdom]) faults.push(id + ': unknown kingdom');
    });
    Object.keys(titles.kingdoms).forEach(function (id) {
      if (!titles.empires[titles.kingdoms[id].empire]) faults.push(id + ': unknown empire');
    });
    return {faults:faults,courts:Object.keys(realms).length,external:Object.keys(external)};
  },keys)).toEqual({faults:[],courts:46,external:['byzantium_634']});
});

test('634 quadrant d preserves source physical inputs and all undeclared resident and layout fields',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  expect(await page.evaluate(function (keys) {
    const source = {}, faults = [];
    Object.keys(FBDATA.bookmarkRegions568).forEach(function (key) {
      const b = FBDATA.bookmarkRegions568[key];
      b.provinces.forEach(function (p) { source[p.id] = {row:p,block:b}; });
    });
    keys.forEach(function (key) {
      const b = FBDATA.bookmarkRegions634[key];
      b.provinces.forEach(function (p) {
        const s = source[p.id], old = s.row, oldb = s.block;
        ['x','y','terrain','dev','customaryRights'].forEach(function (field) {
          if (JSON.stringify(p[field]) !== JSON.stringify(old[field])) faults.push(p.id + ': changed ' + field);
        });
        if (['damascus','medina'].indexOf(p.id) < 0) {
          ['culture','religion','communities'].forEach(function (field) {
            if (JSON.stringify(p[field]) !== JSON.stringify(old[field])) faults.push(p.id + ': changed residents ' + field);
          });
        }
        const layout = (oldb.layouts || oldb.settlementLayouts || {})[p.id];
        const expected = layout && JSON.parse(JSON.stringify(layout));
        if (p.id === 'medina') expected.forEach(function (slot) { slot.name = 'Medina'; });
        if (JSON.stringify(b.layouts[p.id]) !== JSON.stringify(expected)) faults.push(p.id + ': changed layout');
        if (b.climates[p.id] !== (oldb.climates || oldb.climate || {})[p.id]) faults.push(p.id + ': changed climate');
        if (p === old || p.communities && p.communities === old.communities ||
            expected && b.layouts[p.id] === layout) faults.push(p.id + ': shared source object');
      });
    });
    return faults;
  },keys)).toEqual([]);
});

test('634 quadrant d keeps the three household communities and the reduced courts distinct',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  const result = await page.evaluate(function (keys) {
    const p = {}, r = {};
    keys.forEach(function (key) {
      FBDATA.bookmarkRegions634[key].provinces.forEach(function (row) { p[row.id] = row; });
      FBDATA.bookmarkRegions634[key].realms.forEach(function (row) { r[row.id] = row; });
    });
    function pair(id,culture,religion) {
      return p[id].communities.some(function (c) {
        return c.culture === culture && c.religion === religion && c.populationShare0 > 0;
      });
    }
    return {households:[pair('damascus','syriac','chalcedonian'),pair('damascus','arabic','west_syriac_lay_634'),
      pair('medina','arabic','early_islam_634'),pair('baghdad','syriac','east_syriac')],
      rulers:[r.rashidun_634.ruler.name,r.rashidun_634.ruler.born,r.sasanian_634.ruler.name,r.sasanian_634.ruler.born],
      sasanianForm:r.sasanian_634.government,altava:r.altava_634.name,
      arabia:['mecca','medina','yamama','qatif','sanaa','aden','muscat','nizwa','sohar','najran_oasis','tayma_oasis'].map(function (id) { return p[id].realm; }),
      roman:['damascus','alexandria','mosul','palmyra_district'].map(function (id) { return p[id].realm; }),
      iraq:['baghdad','kufa','basra','wasit','samarra'].map(function (id) { return p[id].realm; }),
      horn:p.zeila.realm,ctesiphonSite:FBDATA.bookmarkRegions634.b24.layouts.baghdad[0].site,
      heldStarts:FBDATA.startScenarios.filter(function (s) { return s.id === 'yazdegerd_634'; }).length};
  },keys);
  expect(result).toEqual({households:[true,true,true,true],rulers:['Umar',582,'Yazdegerd III',624],
    sasanianForm:'regnum',altava:'Altava district communities',arabia:Array(11).fill('rashidun_634'),
    roman:Array(4).fill('byzantium_634'),iraq:Array(5).fill('sasanian_634'),horn:'horn_coast_634',
    ctesiphonSite:'baghdad_outer_476',heldStarts:0});
});

test('634 quadrant d faith availability is valid with the complete staged identity publication',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  expect(await page.evaluate(function (keys) {
    const original = FBDATA.religions, bookmark = FBDATA.bookmarks['634'];
    const definition = {id:'634',era:'late_antique',date:{year:634,season:2,day:1}};
    const faults = [], rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      FBDATA.bookmarks['634'] = definition;
      FBDATA.religions = Object.assign({},original,FBDATA.bookmarkReligions634);
      Object.keys(FBDATA.bookmarkFaithAvailability634).forEach(function (id) {
        const availability = JSON.parse(JSON.stringify(original[id].availability));
        availability.bookmarkIds = availability.bookmarkIds.concat(
          FBDATA.bookmarkFaithAvailability634[id].bookmarkIds.filter(function (date) {
            return availability.bookmarkIds.indexOf(date) < 0;
          }));
        FBDATA.religions[id] = Object.assign({},original[id],{availability:availability});
      });
      FB.invalidateReligionData();
      keys.forEach(function (key) {
        const b = FBDATA.bookmarkRegions634[key];
        b.provinces.forEach(function (p) {
          (p.communities || []).forEach(function (c) {
            if (!FB.faithHistoricalAvailable(c.religion,definition,'community')) faults.push(p.id + ': unavailable resident');
          });
        });
        b.realms.forEach(function (r) {
          if (!FB.faithHistoricalAvailable(r.religion,definition,'ruler')) faults.push(r.id + ': unavailable court');
        });
      });
      return {faults:faults,faithErrors:FB.validateReligionData(null),pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally {
      FBDATA.religions = original;
      if (bookmark) FBDATA.bookmarks['634'] = bookmark; else delete FBDATA.bookmarks['634'];
      FB.invalidateReligionData();
    }
  },keys)).toEqual({faults:[],faithErrors:[],pure:true});
});

test('the staged Medinan form composes with same-import faiths through ordinary JSON validation and publication',async function ({page},info) {
  await openGame(page,info);
  await stage(page);
  const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/634-identity-world.json'),'utf8'));
  Object.assign(mod,await page.evaluate(function () {
    return {religions:FBDATA.bookmarkReligions634,governmentForms:FBDATA.bookmarkRegions634.b24.governmentForms};
  }));
  mod.bookmarks['634'].realms[0].government = 'medinan_selection_pf_634';
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const other = JSON.parse(JSON.stringify(mod));
    const form = other.governmentForms.medinan_selection_pf_634;
    form.selectionProfile.eligibility.minAge = 25;
    form.selectionProfile.terms = {levy:0.4,revenue:0.5};
    const otherErrors = FB.mods.validate(other);
    const rejected = ['procedure','faith','strategy'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(mod)), f = bad.governmentForms.medinan_selection_pf_634;
      if (kind === 'procedure') f.selectionProfile.procedure.livingNominee = true;
      if (kind === 'faith') f.selectionProfile.candidatePool.religions = ['e2e_absent_faith'];
      if (kind === 'strategy') f.succession = 'e2e_absent_strategy';
      return FB.mods.validate(bad).length > 0;
    });
    return {errors:errors,otherErrors:otherErrors,rejected:rejected,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({errors:[],otherErrors:[],rejected:[true,true,true],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'634-selection-world.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await page.locator('#mod-apply').click();
  await prepareGameContent(page);
  await page.waitForFunction(function () { return FB.game.bootReady && FB.mods.count() === 1 && FBDATA.bookmarks['634']; });
  expect(await page.evaluate(function () {
    const form = FBDATA.governmentForms.medinan_selection_pf_634;
    return {faults:FB.governments.problems('medinan_selection_pf_634'),
      pool:form.selectionProfile.candidatePool,procedures:form.selectionProfile.procedure,
      offices:form.officeCatalogue,heads:FBDATA.bookmarkReligions634.early_islam_634.properties.head,
      inheritedProfiles:!!(form.administrationProfileId || form.aristocraticProfileId)};
  })).toEqual({faults:[],pool:{gentle:false,cultures:[],religions:['early_islam_634'],excludedRoles:[]},
    procedures:{designation:true,realmRecognition:true,interimRevenue:true,defensiveLevy:true},
    offices:[],heads:null,inheritedProfiles:false});
});
