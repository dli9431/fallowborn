'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { releasedCatalogue } = require('../support/released-catalogue');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const released = require('../fixtures/released-catalogue.json');
const examples = {
  river:require('../fixtures/authoring/expanded-catalogue-river.json'),
  upland:require('../fixtures/authoring/expanded-catalogue-upland.json')
};

const dataInputs = [
  'technology','site_resources','building_operations','production','production_economy',
  'siege_support','maritime_work','relay_services','building_seasons','building_institutions',
  'building_profiles','fort_profiles','technology_early_refinements','technology_foundations',
  'technology_learning','buildings_learning_care','technology_civic_military','buildings_civic_military',
  'technology_maritime','buildings_maritime','buildings_boathouses','technology_wind','buildings_wind',
  'technology_transmission','technology_waterworks','technology_masonry_circuits','technology_baths_headworks',
  'buildings_waterworks','buildings_baths_headworks','buildings_early_worship','buildings_milling_variants',
  'buildings_circuit_profiles','buildings_early_industry','production_early_industry',
  'buildings_fish_drying','production_fish_drying','buildings_seasonal_pasture','production_seasonal_pasture',
  'map_data','bookmarks','bookmark_867_expansion','bookmark_1066_inhabited',
  'bookmark_476','bookmark_476_italy','bookmark_476_dalmatia_east','bookmark_476_gaul_iberia',
  'bookmark_476_africa','bookmark_476_outer','bookmark_476_wider_identities','bookmark_476_wider',
  'bookmark_493','bookmark_493_world','bookmark_568','bookmark_568_identities',
  'bookmark_568_scaffold_a','bookmark_568_scaffold_b','bookmark_568_scaffold_c','bookmark_568_scaffold_d',
  'bookmark_711','bookmark_711_terrain','bookmark_800','bookmark_800_expansion','starts_568','geographies',
  'geography_expansion','cultures','eras','climate','economy','economy_maritime','settlements',
  'settlements_real','starts','religious_institutions','religious_activities','political_institutions'
].map(function (name) { return 'data/' + name + '.js'; });
dependsOnRuntime(__filename, ['index.html'].concat(dataInputs, [
  'js/technology.js','js/site_resources.js','js/building_operations.js','js/production.js',
  'js/production_economy.js','js/building_seasons.js','js/building_institutions.js',
  'js/building_profiles.js','js/fort_profiles.js','js/siege_support.js','js/maritime_work.js',
  'js/relay_services.js','js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/main.js','js/starts.js','js/fortifications.js','js/lordships.js','js/settlement.js',
  'js/treasury.js','js/population.js','js/economy.js','js/market.js','js/armies.js',
  'js/wars.js','js/climate.js','js/institutions.js','js/religious_institutions.js',
  'js/religious_activities.js','js/abbeys.js','js/model.js','js/ui_modals.js'
]));

const traditions = ['default','latin','byzantine','islamic','persianate','slavic',
  'nordic','steppe','baltic_finnic','caucasian','northeast_african'];
const additions = {
  aqueduct_maintenance:{req:['lime_mortar','geometry'],cost:50,domain:'commerce',attested:[-100,600],
    pairs:[[400,1000],[1,400],[1,350],[200,800],[200,600],[700,1050],[800,1150],[700,1200],[900,1250],[200,700],[100,700]]},
  qanat_construction:{req:['irrigation_channels','geometry'],cost:50,domain:'agriculture',attested:[-300,650],
    pairs:[[600,1100],[500,1000],[200,850],[200,800],[-200,400],[850,1200],[900,1250],[500,1000],[950,1300],[300,850],[200,850]]},
  cistern_engineering:{req:['lime_mortar'],cost:20,domain:'commerce',attested:[-100,600],
    pairs:[[400,850],[1,400],[1,350],[200,700],[200,700],[600,1000],[750,1100],[600,1050],[800,1200],[200,800],[1,500]]},
  hypocaust_heating:{req:['lime_mortar'],cost:20,domain:'crafts',attested:[-100,600],
    pairs:[[600,1100],[1,400],[1,500],[500,850],[300,850],[800,1150],[850,1200],[850,1250],[950,1300],[300,900],[100,700]]},
  masonry_circuits:{req:['lime_mortar','fortified_camps'],cost:50,domain:'warfare',attested:[200,600],
    pairs:[[500,1050],[200,450],[200,400],[400,850],[200,600],[750,1100],[800,1150],[700,1100],[850,1250],[300,750],[200,800]]},
  feltmaking:{req:[],cost:20,domain:'crafts',attested:[-500,600],fx:{costs:{enterprise:-0.005}},
    pairs:[[-200,850],[-200,850],[-200,850],[-200,850],[-300,600],[-200,800],[-200,850],[-500,300],[-100,1000],[-300,700],[200,1000]]},
  diversion_dams:{req:['irrigation_channels','lime_mortar'],cost:50,domain:'agriculture',attested:[-500,600],
    pairs:[[400,1050],[1,650],[1,600],[-500,400],[200,450],[700,1100],[850,1200],[800,1150],[900,1250],[200,800],[1,600]]},
  bookhand_standardization:{req:['scriptoria','classical_grammar'],cost:50,domain:'learning',attested:[650,850],fx:{education:0.005},
    pairs:[[950,1200],[750,900],[800,950],[650,900],[700,950],[850,1100],[950,1150],[1000,1250],[1000,1250],[750,1000],[750,1050]]}
};
const newIds = Object.keys(additions).sort();
const profiles = ['congregational_mosque','episcopal_complex','horizontal_mill','hypocaust_bath','urban_circuit'];

test.beforeEach(async function ({ page }) {
  // Observe the shipped index, before the first addition. This is a retained
  // catalogue projection, never a Node execution of the game data sources.
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(FBDATA,'tech_early_refinements',{
      configurable:true,set:function (value) {
        window.__expandedBase = JSON.parse(JSON.stringify({tech:this.tech,buildings:this.buildings,
          caps:this.techCaps,grants:this.capabilities,forts:this.fortLevels}));
        Object.defineProperty(this,'tech_early_refinements',{
          configurable:true,enumerable:true,writable:true,value:value});
      }
    });
  });
});

test('the full catalogue has one source per correction and an unchanged retained graph outside the approved corrections', async function ({ page }, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const base = window.__expandedBase, counts = {}, owners = {}, stale = [], untouched = [];
    Object.keys(base.tech).forEach(function (id) { FB.normalizeTechDefinition(id,base.tech[id]); });
    Object.keys(FBDATA).filter(function (key) { return key.indexOf('techCorrections_') === 0; }).forEach(function (key) {
      counts[key] = Object.keys(FBDATA[key]).length;
      Object.keys(FBDATA[key]).forEach(function (id) {
        (owners[id] || (owners[id] = [])).push(key);
        const d = JSON.parse(JSON.stringify(FBDATA[key][id])); FB.normalizeTechDefinition(id,d);
        if (JSON.stringify(d) !== JSON.stringify(FBDATA.tech[id])) stale.push(id);
      });
    });
    Object.keys(base.tech).forEach(function (id) {
      if (!owners[id] && JSON.stringify(base.tech[id]) !== JSON.stringify(FBDATA.tech[id])) untouched.push(id);
    });
    const scalar = Object.keys(base.tech).filter(function (id) {
      return ['domain','cost','fx','capabilities'].some(function (key) {
        return JSON.stringify(base.tech[id][key]) !== JSON.stringify(FBDATA.tech[id][key]);
      });
    });
    const buildingOwners = {},buildingChanges = [];
    Object.keys(FBDATA).filter(function (key) { return key.indexOf('buildingCorrections_')===0; }).forEach(function (key) {
      Object.keys(FBDATA[key]).forEach(function (id) { (buildingOwners[id] || (buildingOwners[id]=[])).push(key); });
    });
    Object.keys(base.buildings).forEach(function (id) {
      if (Object.keys(base.buildings[id]).some(function (key) {
        return (typeof base.buildings[id][key]==='number' || typeof base.buildings[id][key]==='boolean' || key==='role') &&
          JSON.stringify(base.buildings[id][key])!==JSON.stringify(FBDATA.buildings[id][key]);
      })) buildingChanges.push(id);
    });
    const req = {}, reqAny = {};
    Object.keys(base.tech).forEach(function (id) {
      if (JSON.stringify(base.tech[id].req) !== JSON.stringify(FBDATA.tech[id].req)) req[id] = FBDATA.tech[id].req;
      if (JSON.stringify(base.tech[id].reqAny) !== JSON.stringify(FBDATA.tech[id].reqAny)) reqAny[id] = FBDATA.tech[id].reqAny;
    });
    return {base:base,tech:FBDATA.tech,buildings:FBDATA.buildings,profiles:FBDATA.buildingProfiles,
      counts:counts,owners:owners,buildingOwners:buildingOwners,buildingChanges:buildingChanges,
      stale:stale,untouched:untouched,scalar:scalar,req:req,reqAny:reqAny,
      caps:FBDATA.techCaps,grants:FBDATA.capabilities,forts:FBDATA.fortLevels,
      sources:Array.from(document.scripts).map(function (s) { return s.getAttribute('src'); }).filter(Boolean),
      faults:FB.validateTechnologyData(true).concat(FB.validateBuildingData(FBDATA.buildings,true),
        FB.buildingProfiles.catalogFaults(FBDATA),FB.buildingInstitutionCatalogFaults(FBDATA),
        FB.production.catalogFaults(FBDATA),FB.productionEconomy.catalogFaults(FBDATA),
        FB.siegeSupport.catalogFaults(FBDATA),FB.maritimeWork.catalogFaults(FBDATA),FB.relayServices.catalogFaults(FBDATA))};
  });
  expect(Object.keys(r.base.tech)).toHaveLength(187);
  expect(Object.keys(r.tech)).toHaveLength(195); expect(Object.keys(r.buildings)).toHaveLength(31);
  expect(Object.keys(r.buildingOwners)).toHaveLength(8);
  expect(Object.values(r.buildingOwners).every(function (rows) { return rows.length===1; })).toBe(true);
  expect(r.buildingChanges).toEqual([]);
  expect(Object.keys(r.buildings).filter(function (id) { return !r.base.buildings[id]; }).sort()).toEqual([
    'aqueduct','bloomery_smithy','boathouse','diversion_headworks','fish_drying_station','hospice',
    'monastic_house','paper_workshop','public_bath','qanat_waterworks','shieling','urban_cisterns']);
  expect(Object.keys(r.profiles).sort()).toEqual(profiles);
  expect(Object.keys(r.tech).filter(function (id) { return !r.base.tech[id]; }).sort()).toEqual(newIds);
  expect(r.counts).toEqual({techCorrections_foundations:9,techCorrections_learning:6,
    techCorrections_civic_military:12,techCorrections_maritime:8,techCorrections_wind:1,techCorrections_transmission:1});
  expect(Object.values(r.owners).every(function (rows) { return rows.length === 1; })).toBe(true);
  expect(r.stale).toEqual([]); expect(r.untouched).toEqual([]); expect(r.scalar).toEqual([]); expect(r.reqAny).toEqual({});
  expect(r.req).toEqual({universities:['scholarly_networks','scriptoria'],
    legal_studies:['scholarly_networks','written_law'],scholastic_method:['scholarly_networks','translation_schools'],
    annual_fairs:['urban_markets'],siege_engineering:['geometry']});
  expect(r.caps).toEqual(r.base.caps); expect(r.grants).toEqual(r.base.grants); expect(r.forts).toEqual(r.base.forts);
  expect(r.caps).toEqual({tax:0.35,levy:0.35,battle:0.15,devCap:4,health:0.03,research:5,domain:2,
    siege:0.35,movement:0.25,seaMovement:0.40,education:0.20,finance:0.30,trade:0.30,supply:0.25,
    populationCapacity:0.35,populationCrisisProtection:0.10,migrationAttraction:3,
    costFloor:{build:0.55,enterprise:0.55,training:0.65},units:{levy:250,arch:200,cav:160,ret:160},aiUnits:{arch:0.20,cav:0.20,ret:0.20}});
  let total = 0;
  for (const id of newIds) {
    const want = additions[id], d = r.tech[id]; total += d.cost;
    expect(d).toMatchObject({domain:want.domain,cost:want.cost,req:want.req,capabilities:[],history:{attested:want.attested}});
    expect(d.fx).toEqual(want.fx || {});
    expect(traditions.map(function (t) { return d.history.adoption[t]; })).toEqual(want.pairs);
  }
  expect(total).toBe(310); expect(r.faults).toEqual([]);
  for (const id of Object.keys(r.base.tech)) {
    expect(r.tech[id].req.every(function (key) { return !newIds.includes(key); }),id).toBe(true);
    const expected = JSON.parse(JSON.stringify(r.base.tech[id].history.adoption));
    if (id === 'paper_making') { expected.persianate = [650,800]; expected.islamic = [750,950]; }
    if (id === 'paper_scholarship') { expected.persianate = [800,1000]; expected.islamic = [800,1000]; }
    if (id === 'capitularies') expected.latin = [700,800];
    expect(r.tech[id].history.adoption,id).toEqual(expected);
  }
  for (const source of dataInputs) expect(r.sources.filter(function (s) { return s === source; }),source).toHaveLength(1);
  for (const pair of [['data/technology.js','data/technology_early_refinements.js'],
    ['data/technology_transmission.js','data/technology_waterworks.js'],
    ['data/building_profiles.js','data/buildings_milling_variants.js'],
    ['data/fort_profiles.js','data/buildings_circuit_profiles.js'],
    ['js/production.js','js/siege_support.js'],['js/production_economy.js','js/maritime_work.js'],
    ['js/building_profiles.js','js/fort_profiles.js'],['js/fort_profiles.js','js/building_seasons.js']]) {
    expect(r.sources.indexOf(pair[1]),pair.join(' before ')).toBeGreaterThan(r.sources.indexOf(pair[0]));
  }
  expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
});

for (const year of [476,493,568,711,800,867,1066]) {
  test(year + ' seeds the exact expanded sets for each tradition, including earlier prerequisite closure', async function ({ page }, info) {
    await openGame(page,info);
    const result = await page.evaluate(function (args) {
      return args.traditions.map(function (tradition) {
        const s = {start:{era:args.year < 650 ? 'late_antique' : 'early_medieval'},
          date:{year:args.year,season:0,day:1},realms:{sample:{alive:true,liege:null,techTraditions:[tradition]}},realmTech:{}};
        const table = FBDATA.tech;
        try {
          // Use a supported tradition with only default pairs to exercise the fallback.
          if (tradition === 'default') {
            s.realms.sample.techTraditions = ['latin']; FBDATA.tech = JSON.parse(JSON.stringify(table));
            Object.keys(FBDATA.tech).forEach(function (id) {
              FBDATA.tech[id].history.adoption = {default:table[id].history.adoption.default};
            });
          }
          FB.seedRealmTechnologies(s,true);
          const current = JSON.parse(JSON.stringify(s.realmTech.sample));
          FBDATA.tech = JSON.parse(JSON.stringify(FBDATA.tech));
          args.ids.forEach(function (id) { delete FBDATA.tech[id]; });
          FBDATA.tech.paper_making.history.adoption.persianate = [700,950];
          FBDATA.tech.paper_making.history.adoption.islamic = [690,940];
          FBDATA.tech.paper_scholarship.history.adoption.islamic = [760,1010];
          FBDATA.tech.paper_scholarship.history.adoption.persianate = [770,1020];
          FBDATA.tech.capitularies.history.adoption.latin = [710,870];
          // Restore the default-only projection after reverting literal pairs.
          if (tradition === 'default') Object.keys(FBDATA.tech).forEach(function (id) {
            FBDATA.tech[id].history.adoption = {default:FBDATA.tech[id].history.adoption.default};
          });
          s.realmTech = {}; FB.seedRealmTechnologies(s,true);
          const prior = s.realmTech.sample, complete = current.completed.filter(function (id) { return args.ids.indexOf(id) >= 0; }).sort();
          return {tradition:tradition,complete:complete,
            exposed:current.exposed.filter(function (id) { return args.ids.indexOf(id) >= 0; }).sort(),
            addedOld:current.completed.filter(function (id) { return args.ids.indexOf(id) < 0 && prior.completed.indexOf(id) < 0; }).sort(),
            removedOld:prior.completed.filter(function (id) { return current.completed.indexOf(id) < 0; }).sort()};
        } finally { FBDATA.tech = table; FB.invalidateTechBonuses(); }
      });
    },{year:year,traditions:traditions,ids:newIds});
    for (const row of result) {
      const n = traditions.indexOf(row.tradition);
      expect(row.complete,row.tradition).toEqual(newIds.filter(function (id) { return additions[id].pairs[n][1] <= year; }));
      expect(row.exposed,row.tradition).toEqual(newIds.filter(function (id) { return additions[id].pairs[n][0] <= year; }));
      if (year >= 867) {
        expect(row.addedOld,row.tradition).toEqual(year === 867 && row.tradition === 'latin' ? ['capitularies'] :
          year === 867 && row.tradition === 'persianate' ? ['paper_making'] : []);
        expect(row.removedOld,row.tradition).toEqual([]);
      } else {
        // Earlier works can close real geometry/fort prerequisites. Only these
        // existing dependencies and the accepted transmission changes may move.
        expect(row.addedOld.filter(function (id) {
          return !['arithmetic','geometry','spear_shield_drill','fortified_camps','paper_making','capitularies'].includes(id);
        }),row.tradition).toEqual([]);
        expect(row.removedOld.filter(function (id) { return !['paper_making','paper_scholarship'].includes(id); }),row.tradition).toEqual([]);
      }
    }
  });
}

for (const year of ['476','493','568','711','800','867','1066']) for (const revision of (['867','1066'].includes(year)?['baseline',null]:[null])) {
  test(year + ' ' + (revision || 'current') + ' accounts for real sovereign exceptions and retains dated research and ruined property', async function ({ page }, info) {
    await openGame(page,info);
    if (revision) await page.evaluate(function (id) { FBDATA.bookmarks[id].revision = 'baseline'; },year);
    await beginBookmark(page,info,year);
    const before = await page.evaluate(function (ids) {
      const s = FB.state, table = FBDATA.tech, copy = JSON.parse(JSON.stringify(s)); copy.realmTech = {};
      const declarations = JSON.stringify([FBDATA.bookmarks,FBDATA.geographies]);
      FB.seedRealmTechnologies(copy,true);
      const actual = Object.keys(copy.realmTech).map(function (rid) {
        const rec = copy.realmTech[rid], seed = copy.realms[rid].techSeed || {};
        return {id:rid,omitted:seed.omit || [],completed:rec.completed,exposed:rec.exposed,
          windows:ids.map(function (id) { return {id:id,window:FB.techHistoricalWindow(copy,id,rid)}; })};
      });
      // A saved campaign is allowed to retain older completed/prerequisite facts.
      const rec = FB.realmTechRecord(s); rec.completed = ['manuscript_codex'];
      rec.exposed = ['manuscript_codex','scriptoria']; rec.active = ['scriptoria'];
      rec.progress = {scriptoria:7}; rec.reserve = 3; rec.historicalSeeded = 1; s.techSeeded = 1;
      s.buildings[s.player.provinceId] = [{s:0,id:'library'},{s:0,id:'windmill',ruined:true}];
      FB.invalidateBuildingIndex(s,s.player.provinceId); FB.invalidateTechBonuses();
      actual.forEach(function (row) {
        const seed = copy.realms[row.id].techSeed || {},omit = seed.omit || [];
        function supported(id) { return omit.indexOf(id)<0 && table[id].req.every(supported); }
        row.expectedComplete = row.windows.filter(function (item) {
          return supported(item.id) && (item.window.widespread<=s.date.year || (seed.complete || []).indexOf(item.id)>=0);
        }).map(function (item) { return item.id; }).sort();
        row.actualComplete = row.completed.filter(function (id) { return ids.indexOf(id)>=0; }).sort();
      });
      return {actual:actual,unchanged:table === FBDATA.tech && declarations === JSON.stringify([FBDATA.bookmarks,FBDATA.geographies]),
        knowledge:JSON.parse(JSON.stringify(s.realmTech)),assets:JSON.parse(JSON.stringify(s.buildings)),save:FB.save.serialize()};
    },newIds);
    expect(before.unchanged).toBe(true); expect(before.actual.length).toBeGreaterThan(10);
    for (const realm of before.actual) {
      expect(realm.actualComplete,realm.id).toEqual(realm.expectedComplete);
      for (const item of realm.windows) {
        if (realm.omitted.includes(item.id)) {
          expect(realm.completed,realm.id).not.toContain(item.id); expect(realm.exposed,realm.id).not.toContain(item.id);
        } else if (item.window.emergence <= Number(year)) expect(realm.exposed,realm.id).toContain(item.id);
      }
    }
    await restoreBookmark(page,before.save);
    expect(await page.evaluate(function () { return {knowledge:FB.state.realmTech,assets:FB.state.buildings}; }))
      .toEqual({knowledge:before.knowledge,assets:before.assets});
  });
}

test('mixed traditions select one pair, break an emergence tie by widespread, and authoritative omissions remove descendants', async function ({ page }, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    function sample(list,omit) {
      const s = {start:{era:'early_medieval'},date:{year:1066,season:0,day:1},
        realms:{sample:{alive:true,liege:null,techTraditions:list,techSeed:{complete:['aqueduct_maintenance'],omit:omit || []}}},realmTech:{}};
      FB.seedRealmTechnologies(s,true);
      return {windows:['aqueduct_maintenance','masonry_circuits','paper_scholarship'].map(function (id) {
        return FB.techHistoricalWindow(s,id,'sample');
      }),completed:s.realmTech.sample.completed.slice().sort(),exposed:s.realmTech.sample.exposed.slice().sort()};
    }
    return {first:sample(['latin','byzantine']),reverse:sample(['byzantine','latin']),omit:sample(['latin','byzantine'],['lime_mortar'])};
  });
  expect(r.first.completed).toEqual(r.reverse.completed); expect(r.first.exposed).toEqual(r.reverse.exposed);
  expect(r.first.windows[0]).toMatchObject({emergence:1,widespread:350,tradition:'byzantine'});
  expect(r.first.windows[1]).toMatchObject({emergence:200,widespread:400,tradition:'byzantine'});
  for (const id of ['lime_mortar','aqueduct_maintenance','cistern_engineering','hypocaust_heating','masonry_circuits','diversion_dams'])
    expect(r.omit.completed).not.toContain(id);
});

async function imported(page, info, kind, sector) {
  await openGame(page,info); await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expanded-catalogue-' + kind + '.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady; });
  const source = examples[kind], world = 'expanded_' + kind;
  const scenario = source.startScenarios.find(function (s) { return s.id.indexOf(kind+'_'+sector+'_') === 0 && !!s.rulerRealmId; });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click(); else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('EXPANDED-'+world+'-'+scenario.id+'-'+scenario.fixedProvinceId+'-'+(scenario.sex || 'm')+'-Review-standard');
  await page.locator('#ng-seed').press('Enter'); await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    FB.state.player.gold = 10000;
  });
}

for (const kind of ['river','upland']) {
  test(kind + ' real water service respects public reserves, shared demand, expiry and strict combined saves', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,O = FB.buildingOperations;
      const a = O.compile(FB.campaignBookmark(s)).assignments.find(function (a) { return a.id.indexOf(kind+'_water_')===0; });
      const who = FB.settlementHolder(s,a.countyId,a.slot),account = s.realms[who.id].treasury;
      const req = {countyId:a.countyId,settlement:a.slot,buildingId:a.buildingId,actor:who};
      account.gold = 0; const poorBefore = JSON.stringify(s),poor = O.quote(s,req);
      const protectedFunds = !poor.allowed && !O.commit(s,poor) && poorBefore===JSON.stringify(s);
      account.gold = 10000; const privateGold = s.player.gold,people = JSON.stringify(s.population);
      const field = kind==='river'?'populationCapacity':'populationFamineProtection';
      const idle = FB.buildingBonusAt(s,a.countyId,a.slot,field),q = O.quote(s,req),gold = account.gold;
      const done = O.commit(s,q),again = O.commit(s,q),active = FB.buildingBonusAt(s,a.countyId,a.slot,field);
      const competing = kind==='river' ? O.quote(s,Object.assign({},req,{buildingId:'qanat_waterworks'})).allowed : false;
      O.validate(s); FB.production.validate(s);
      const saved = JSON.parse(FB.save.serialize()),facts = JSON.stringify([s.siteResources,s.buildingOperations,s.production,s.buildings]);
      FB.save.restore(saved); const t = FB.state;
      const same = facts===JSON.stringify([t.siteResources,t.buildingOperations,t.production,t.buildings]);
      const corruptions = [function (v) { delete v.buildingOperations; },function (v) { delete v.siteResources; },
        function (v) { const key = Object.keys(v.buildingOperations.receipts)[0]; v.buildingOperations.receipts[key].amount++; },
        function (v) { v.production.lots[0].remaining = v.production.lots[0].quantity+1; },
        function (v) { v.production.assets.push(v.production.assets[0]); }];
      const rejected = corruptions.map(function (change) {
        const v = JSON.parse(JSON.stringify(t)); change(v); const before = JSON.stringify(v);
        try { FB.save.v4.validatePlatform(v); return false; } catch (e) { return before===JSON.stringify(v); }
      });
      t.turn = q.untilTurn; FB.invalidateBuildingIndex(t,a.countyId);
      return {protectedFunds:protectedFunds,idle:idle,done:done,again:again,active:active,competing:competing,
        paid:gold-account.gold,cost:q.cost,same:same,rejected:rejected,expired:FB.buildingBonusAt(t,a.countyId,a.slot,field),
        private:privateGold===t.player.gold,people:people===JSON.stringify(t.population),
        property:JSON.stringify(s.buildings)===JSON.stringify(t.buildings)};
    },kind);
    expect(r).toMatchObject({protectedFunds:true,idle:0,done:true,again:false,active:kind==='river'?0.03:0.05,
      competing:false,same:true,rejected:Array(5).fill(true),expired:0,private:true,people:true,property:true});
    expect(r.paid).toBeCloseTo(r.cost,8);
  });

  test(kind + ' the mill replacement supplies one physical tax/capacity effect and no base bonus', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,O = FB.buildingOperations,rows = O.compile(FB.campaignBookmark(s)).assignments;
      const a = rows.find(function (a) { return a.id.indexOf(kind+'_mill_')===0 && a.buildingId==='mill'; });
      const who = FB.settlementHolder(s,a.countyId,a.slot); s.realms[who.id].treasury.gold = 10000;
      if (kind==='upland') {
        const fill = rows.find(function (a) { return a.id.indexOf(kind+'_mill_')===0 && a.buildingId!=='mill'; });
        const permission = FB.authorityAppoint(s,{officeId:kind+'_mill_resource_keeper',institutionId:who.id,
          appointer:who,holder:who,scope:{kind:'county',id:a.countyId},endTurn:s.turn+30});
        if (!permission || !FB.buildRealm(s,who.id,fill.countyId,fill.slot,fill.buildingId))
          throw new Error('Expected explicitly authorized filling works');
        if (!O.commit(s,O.quote(s,{countyId:fill.countyId,settlement:fill.slot,buildingId:fill.buildingId,actor:who})))
          throw new Error('Expected real catchment filling');
      }
      function effects() { return [FB.buildingBonusAt(s,a.countyId,a.slot,'tax'),FB.buildingBonusAt(s,a.countyId,a.slot,'populationCapacity')]; }
      const idle = effects(),q = O.quote(s,{countyId:a.countyId,settlement:a.slot,buildingId:'mill',actor:who});
      const paid = O.commit(s,q),repeat = O.commit(s,q),active = effects();
      const asset = s.buildings[a.countyId].find(function (b) { return b.id==='mill'; });
      const other = FB.buildRealm(s,who.id,a.countyId,a.slot,'mill');
      asset.ruined = true; FB.invalidateBuildingIndex(s,a.countyId); const ruined = effects(); asset.ruined = false;
      O.validate(s);
      return {idle:idle,paid:paid,repeat:repeat,active:active,other:other,ruined:ruined,
        dev:asset.devGranted,count:s.buildings[a.countyId].filter(function (b) { return b.id==='mill'; }).length};
    },kind);
    expect(r).toEqual({idle:[0,0],paid:true,repeat:false,active:kind==='river'?[1,0.03]:[0.8,0.02],other:false,ruined:[0,0],dev:0,count:1});
  });

  test(kind + ' a real foundation funds one replacement worship asset without creating an institution or people', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,bm = FB.campaignBookmark(s),binding = bm.buildingInstitutionAssignments.find(function (a) { return a.profileId==='episcopal_foundation'; });
      const institution = bm.localInstitutions[binding.institutionId],pid = institution.provinceId;
      const slot = FB.settlementsOf(s,pid).findIndex(function (row) { return row.site===institution.site; });
      const actor = FB.settlementHolder(s,pid,slot); s.realms[actor.id].treasury.gold = 10000;
      const rec = FB.realmTechRecord(s,actor.id); if (rec.completed.indexOf('lime_mortar')<0) rec.completed.push('lime_mortar');
      FB.invalidateTechBonuses();
      const req = {countyId:pid,settlement:slot,buildingId:'temple',profileId:'episcopal_complex',actor:actor};
      const facts = JSON.stringify([s.chars,s.localInstitutions,s.religiousHeads,s.authority,s.population,s.realmTech]);
      const q = FB.buildingProfiles.quote(s,req),gold = s.realms[actor.id].treasury.gold;
      const built = FB.buildingProfiles.commit(s,q),again = FB.buildingProfiles.commit(s,q);
      const occupied = FB.buildingProfiles.quote(s,Object.assign({},req,{profileId:'congregational_mosque'})).allowed;
      return {built:built,again:again,occupied:occupied,paid:gold-s.realms[actor.id].treasury.gold,cost:q.cost,
        piety:FB.buildingBonusAt(s,pid,slot,'piety'),research:FB.buildingBonusAt(s,pid,slot,'research'),
        unchanged:facts===JSON.stringify([s.chars,s.localInstitutions,s.religiousHeads,s.authority,s.population,s.realmTech])};
    },kind);
    expect(r).toMatchObject({built:true,again:false,occupied:false,piety:1,research:0,unchanged:true}); expect(r.paid).toBe(r.cost);
  });

  test(kind + ' produced siege equipment remains finite through its actual campaign and fort consumer', async function ({ page }, info) {
    await imported(page,info,kind,'siege');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,P = FB.production,S = FB.siegeSupport,prefix = kind+'_siege_';
      const profileId = prefix+(kind==='river'?'light_equipment':'heavy_equipment'),profile = FBDATA.siegeSupportProfiles[profileId];
      const source = P.snapshot(s).find(function (r) { return r.site.id.indexOf(prefix)===0; }),site = source.site.id;
      const batch = P.commit(s,P.aiQuote(s,site,'reserve',{recipeId:profile.recipeId,disposition:'store'}));
      for (let i=0;i<FBDATA.productionRecipes[profile.recipeId].workDays;i++)
        if (!P.perform(s,P.aiQuote(s,site,'work',{batchId:batch}))) throw new Error('Expected paid equipment work');
      if (!P.commit(s,P.aiQuote(s,site,'finish',{batchId:batch}))) throw new Error('Expected actual equipment');
      const realm = source.asset.owner.id,target = Object.keys(s.owner).find(function (pid) {
        return s.owner[pid]!==realm && s.realms[s.owner[pid]] && s.realms[s.owner[pid]].alive;
      }),occupations = {}; occupations[target] = {progress:0,occupied:false};
      const war = FB.registerOrdinaryWar(s,realm,{enemy:s.owner[target],target:target,legacy:false,casus:{type:'border'},occupations:occupations});
      const host = {id:'composed_host',realm:realm,warId:war.id,at:source.site.countyId,from:null,men:1000,size:1000,
        units:{levy:1000,arch:0,cav:0,ret:0,mercs:0},supply:30,path:[],goal:null,moveLeft:0};
      s.armies = [host]; const rec = FB.realmTechRecord(s,realm);
      profile.requiresTech.forEach(function (id) { if (rec.completed.indexOf(id)<0) rec.completed.push(id); });
      const req = {profileId:profileId,siteId:site,hostId:host.id,warId:war.id,countyId:target};
      const q = S.quote(s,req),people = JSON.stringify(s.chars),gold = s.player.gold;
      const loaded = S.commit(s,q),again = S.commit(s,q),beforeArrival = war.occupations[target].progress;
      host.at = target; const record = war.occupations[target];
      FB.advanceFortSiegePulse(s,target,record,{hosts:[host],progressAmount:1}); const first = record.progress;
      FB.advanceFortSiegePulse(s,target,record,{hosts:[host],progressAmount:1});
      const uses = s.siegeSupport.records[0].uses.length; P.validate(s); S.validate(s);
      return {loaded:!!loaded,again:again,beforeArrival:beforeArrival,first:first,uses:uses,
        people:people===JSON.stringify(s.chars),noCharge:gold===s.player.gold,
        remaining:s.production.lots.find(function (l) { return l.id===q.inputs[0].lotId; }).remaining};
    },kind);
    expect(r).toEqual({loaded:true,again:false,beforeArrival:0,first:kind==='river'?1.25:1.75,uses:1,people:true,noCharge:true,remaining:0});
  });

  test(kind + ' relay service buys existing stock once after a real canonical arrival and preserves people and hosts', async function ({ page }, info) {
    await imported(page,info,kind,'relay');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,R = FB.relayServices,a = FB.campaignBookmark(s).relayServiceAssignments[0];
      const site = FB.compileProduction(FB.campaignBookmark(s)).sites.find(function (r) { return r.id===a.sourceSiteId; });
      const units = {}; units[FB.unitRoleClass('levy_infantry')] = 40;
      s.armies = [{id:'composed_relay_host',realm:'player',at:a.fromCountyId,from:a.fromCountyId,men:40,size:40,units:units,
        supply:10,moveLeft:0,path:[],goal:null,manual:1,scenarioStanding:true,scenarioEndTurn:90}];
      FB.game.auto.hosts = 'manual'; FB.game.auto.buySupplies = false; FB.game.auto.hostResupply = false;
      const id = R.commit(s,R.aiQuote(s,a.id,'composed_relay_host','consent'));
      const remote = R.aiQuote(s,a.id,'composed_relay_host','collect',1).allowed;
      if (!FB.orderArmy(s,s.armies[0],site.countyId)) throw new Error('Expected actual route');
      s.armies[0].moveLeft = 1; FB.armyTick(s);
      const host = s.armies.find(function (h) { return h.id==='composed_relay_host'; });
      const q = R.aiQuote(s,a.id,host.id,'collect',1),stock = s.production.lots.reduce(function (n,l) { return n+l.remaining; },0);
      const people = JSON.stringify(s.chars),supply = host.supply,buyer = FB.production.account(s,q.beneficiary).funds.available,
        seller = FB.production.account(s,q.provider).funds.available;
      const paid = R.commit(s,q),again = R.commit(s,q); FB.production.validate(s); R.validate(s);
      return {id:!!id,remote:remote,arrival:host.at===site.countyId,paid:!!paid,again:again,
        used:stock-s.production.lots.reduce(function (n,l) { return n+l.remaining; },0),
        buyer:buyer-FB.production.account(s,q.beneficiary).funds.available,seller:FB.production.account(s,q.provider).funds.available-seller,cost:q.cost,
        supply:host.supply-supply,expected:q.load.units/q.load.perPoint,people:people===JSON.stringify(s.chars),count:s.armies.length};
    },kind);
    expect(r).toMatchObject({id:true,remote:false,arrival:true,paid:true,again:false,used:1,people:true,count:1});
    expect(r.buyer).toBe(r.cost); expect(r.seller).toBe(r.cost); expect(r.supply).toBeCloseTo(r.expected,8);
  });

  test(kind + ' existing parent production and seasonal outpost work conserve one allocation and expire without new population', async function ({ page }, info) {
    await imported(page,info,kind,'pasture');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,E = FB.productionEconomy,P = FB.production,S = FB.buildingSeasons,prefix = kind+'_pasture_';
      s.player.enterpriseMigration = 1; s.player.enterprises = []; s.player.enterpriseLabor = [];
      const e = {uid:'composed_parent',type:prefix+(kind==='river'?'field_strip':'upland_parent_farm'),provinceId:s.player.provinceId,settlement:0,workerId:null};
      s.player.enterprises.push(e); if (!FB.hireEnterpriseWorker(s,e.uid)) throw new Error('Expected an existing staffed farm');
      s.turn = 90; s.date.season = kind==='river'?1:3; s.date.day = 1;
      const population = JSON.stringify(s.population),property = JSON.stringify(e),output = FB.marketEnterpriseOutput(s,e);
      const first = E.harvest(s),repeat = E.harvest(s),receipt = s.production.economy.receipts.find(function (r) { return r.kind==='producer'; });
      const after = FB.marketEnterpriseOutput(s,e),moved = E.commit(s,E.aiQuote(s,prefix+'parent_delivery',1,'transfer'));
      const a = S.compile(FB.campaignBookmark(s)).assignments.find(function (a) { return a.id===prefix+'pasture_term'; });
      const who = FB.settlementHolder(s,a.countyId,a.slot);
      const opened = S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
      const site = prefix+'farm_outpost';
      const recipeId = FB.compileProduction(FB.campaignBookmark(s)).sites.find(function (a) { return a.id===site; }).recipeIds[0];
      const batch = P.commit(s,P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}));
      for (let n=0;n<FBDATA.productionRecipes[recipeId].workDays;n++)
        if (!P.perform(s,P.aiQuote(s,site,'work',{batchId:batch}))) throw new Error('Expected funded outpost work');
      const done = P.commit(s,P.aiQuote(s,site,'finish',{batchId:batch})),lot = s.production.lots.find(function (l) { return l.origin.kind==='batch'; });
      const expires = S.lotExpiry(s,lot),remaining = lot.remaining;
      s.turn = expires; S.boundary(s); const expired = s.production.lots.find(function (l) { return l.id===lot.id; }).remaining;
      P.validate(s); S.validate(s);
      return {first:first,repeat:repeat,moved:!!moved,opened:opened,batch:!!batch,done:done,
        diversion:output.provisions-after.provisions,expected:receipt.marketQuantity,
        population:population===JSON.stringify(s.population),property:property===JSON.stringify(e),remaining:remaining,expired:expired};
    },kind);
    expect(r).toMatchObject({first:true,repeat:false,moved:true,opened:true,batch:true,done:true,population:true,property:true,remaining:1,expired:0});
    expect(r.diversion).toBeCloseTo(r.expected,8);
  });

  test(kind + ' typed fish output has one seasonal owner and cannot be sold after local allocation', async function ({ page }, info) {
    await imported(page,info,kind,'fish');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,P = FB.production,E = FB.productionEconomy,S = FB.buildingSeasons,prefix = kind+'_fish_';
      const bm = FB.campaignBookmark(s),assignment = bm.productionProducerAssignments.find(function (a) { return a.id.indexOf(prefix)===0; });
      const producer = FBDATA.productionProducerProfiles[assignment.profileId];
      const site = FB.compileProduction(bm).sites.find(function (a) { return a.id===prefix+'drying_plant'; });
      s.player.enterpriseMigration = 1; s.player.enterprises = []; s.player.enterpriseLabor = [];
      const enterprise = {uid:'composed_fishery',type:producer.enterpriseType,provinceId:site.countyId,settlement:site.slot,workerId:null};
      s.player.enterprises.push(enterprise); if (!FB.hireEnterpriseWorker(s,enterprise.uid)) throw new Error('Expected real fishery staffing');
      FB.enterpriseWorkerIds(enterprise).forEach(function (id) { s.chars[id].skills.ste=20; });
      s.turn = 90; s.date.season = kind==='river'?0:2; s.date.day = 1;
      const first = E.harvest(s),again = E.harvest(s),caught = s.production.lots.filter(function (l) { return l.goodId===producer.goodId; });
      s.turn++; s.date.day++;
      const who = FB.settlementHolder(s,site.countyId,site.slot),open = S.quote(s,{operation:'open',assignmentId:prefix+'drying_window',actor:who,lotId:null});
      const asset = s.buildings[site.countyId].find(function (b) { return b.id==='fish_drying_station'; });
      const idle = FB.buildingOperations.effects(s,site.countyId,asset).populationFamineProtection || 0;
      if (kind==='upland') {
        const before = JSON.stringify(s),denied = !S.commit(s,open);
        return {first:first,again:again,caught:caught.length>0,idle:idle,open:open.allowed,denied:denied,pure:before===JSON.stringify(s)};
      }
      const opened = S.commit(s,open),recipeId = site.recipeIds[0];
      const batch = P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:recipeId,disposition:'store'}));
      for (let n=0;n<FBDATA.productionRecipes[recipeId].workDays;n++)
        if (!P.perform(s,P.aiQuote(s,site.id,'work',{batchId:batch}))) throw new Error('Expected real fish preservation work');
      const done = P.commit(s,P.aiQuote(s,site.id,'finish',{batchId:batch})),lot = s.production.lots.find(function (l) { return l.origin.kind==='batch'; });
      const q = S.quote(s,{operation:'allocate',assignmentId:prefix+'drying_window',actor:who,lotId:lot.id});
      const allocated = S.commit(s,q),twice = S.commit(s,q),effect = FB.buildingOperations.effects(s,site.countyId,asset).populationFamineProtection;
      const sold = E.aiQuote(s,prefix+'provisions_sale',1,'sell').allowed; P.validate(s); S.validate(s);
      return {first:first,again:again,caught:caught.length>0,idle:idle,opened:opened,done:done,allocated:allocated,twice:twice,effect:effect,sold:sold,remaining:lot.remaining};
    },kind);
    expect(r).toEqual(kind==='river' ? {first:true,again:false,caught:true,idle:0,opened:true,done:true,allocated:true,twice:false,effect:0.03,sold:false,remaining:0}
      : {first:true,again:false,caught:true,idle:0,open:false,denied:true,pure:true});
  });

  test(kind + ' changed complete composition fingerprints reject matching-world saves before adoption', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function (source) {
      const saved = JSON.parse(FB.save.serialize()),sig = FB.mods.sig(),changed = JSON.parse(JSON.stringify(source));
      Object.values(changed.siteResourceProfiles)[0].capacity++;
      FB.mods.apply(changed); const before = JSON.stringify(FB.state),rng = FB.getRngState(),uid = FB.getUidCounter();
      let rejected = false; try { FB.save.restore(saved); } catch (e) { rejected = true; }
      return {changed:sig!==FB.mods.sig(),mismatch:FB.save.otherWorld(saved),rejected:rejected,
        pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
    },examples[kind]);
    expect(r).toEqual({changed:true,mismatch:true,rejected:true,pure:true});
  });

  test(kind + ' complete import compiles all twelve leaves in one world and restores their canonical optional owners', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function () {
      const s = FB.state,bm = FB.campaignBookmark(s),before = JSON.stringify(s),rng = FB.getRngState(),uid = FB.getUidCounter();
      const errors = FB.siteResources.compile(bm).errors.concat(FB.buildingOperations.compile(bm).errors,
        FB.compileProduction(bm).errors,FB.buildingSeasons.compile(bm).errors,FB.buildingInstitutionDefinitionFaults(bm,FBDATA));
      FB.production.validate(s); FB.buildingProfiles.validate(s); FB.validateBuildingInstitutionState(s);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      const facts = JSON.stringify([s.production,s.buildings,s.openingInfrastructureState,s.chars,s.authority,s.localInstitutions,s.realmTech]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const t = FB.state,second = FB.initializeOpeningInfrastructure(t);
      return {errors:errors,pure:pure,matching:facts === JSON.stringify([t.production,t.buildings,t.openingInfrastructureState,t.chars,t.authority,t.localInstitutions,t.realmTech]),
        second:second,resources:bm.siteResourceAssignments.length,operations:bm.buildingOperationAssignments.length,
        producers:bm.productionProducerAssignments.length,seasons:bm.buildingSeasonAssignments.length,
        institutions:bm.buildingInstitutionAssignments.length,maritime:bm.maritimeWorkAssignments.length,
        relay:bm.relayServiceAssignments.length,production:bm.productionSites.length,
        fort:Object.values(t.buildings).some(function (rows) { return rows.some(function (b) { return b.id === 'walls' && b.buildingProfile; }); })};
    });
    expect(r).toMatchObject({errors:[],pure:true,matching:true,second:false,maritime:1,relay:1,fort:true});
    for (const field of ['resources','operations','producers','seasons','institutions','production']) expect(r[field],field).toBeGreaterThan(0);
  });

  test(kind + ' composed finite suppliers, real paid labor and one sale preserve every unrelated owner', async function ({ page }, info) {
    await imported(page,info,kind,'industry');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,P = FB.production,E = FB.productionEconomy,prefix = kind+'_industry_';
      function move(id,quantity,operation) {
        const q = E.aiQuote(s,prefix+id,quantity,operation); if (!q.allowed) throw new Error(q.reason);
        const id0 = E.commit(s,q); if (!id0) throw new Error('Expected finite input'); return id0;
      }
      if (kind === 'river') move('fiber_delivery',2,'transfer');
      else { move('ore_purchase',2,'buy'); move('fuel_purchase',1,'buy'); }
      const plant = prefix+(kind === 'river'?'paper_plant':'metal_plant');
      const recipeId = kind === 'river'?'workshop_papermaking':'bloomery_smelting';
      const recipe = FBDATA.productionRecipes[recipeId];
      const unrelated = JSON.stringify([s.buildings,s.authority,s.localInstitutions,s.religiousHeads,s.population,s.realmTech]);
      const untouched = s.production.lots.filter(function (lot) {
        return s.production.assets.find(function (a) { return a.id === lot.assetId; }).siteId.indexOf(prefix) !== 0;
      }).map(function (lot) { return [lot.id,lot.remaining]; });
      const q = P.aiQuote(s,plant,'reserve',{recipeId:recipeId,disposition:'store'}),before = s.player.gold;
      const batch = P.commit(s,q),paid = before-s.player.gold,repeat = P.commit(s,q);
      const early = P.commit(s,P.aiQuote(s,plant,'finish',{batchId:batch}));
      const shifts = []; for (let n=0;n<recipe.workDays;n++) shifts.push(P.perform(s,P.aiQuote(s,plant,'work',{batchId:batch})));
      const done = P.commit(s,P.aiQuote(s,plant,'finish',{batchId:batch}));
      const sale = E.aiQuote(s,prefix+(kind==='river'?'paper_sale':'iron_sale'),1,'sell');
      const buyer = P.account(s,sale.buyer).funds.available, sold = E.commit(s,sale),again = E.commit(s,sale);
      P.validate(s);
      return {batch:!!batch,paid:paid,price:recipe.workPrice,repeat:repeat,early:early,shifts:shifts,done:done,sold:!!sold,again:again,
        buyerPaid:buyer-P.account(s,sale.buyer).funds.available,cost:sale.cost,
        unrelated:unrelated === JSON.stringify([s.buildings,s.authority,s.localInstitutions,s.religiousHeads,s.population,s.realmTech]),
        stock:untouched.every(function (row) { return s.production.lots.find(function (l) { return l.id===row[0]; }).remaining===row[1]; })};
    },kind);
    expect(r).toMatchObject({batch:true,repeat:false,early:false,done:true,sold:true,again:false,unrelated:true,stock:true});
    expect(r.paid).toBe(r.price); expect(r.buyerPaid).toBe(r.cost);
    expect(r.shifts).toEqual(Array(kind==='river'?2:1).fill(true));
  });

  test(kind + ' paid boathouse work composes with the ordinary invoice without a free enterprise or second material debit', async function ({ page }, info) {
    await imported(page,info,kind,'boat');
    const r = await page.evaluate(function (kind) {
      const s = FB.state,P = FB.production,M = FB.maritimeWork,prefix = kind+'_boat_';
      const rec = FB.realmTechRecord(s); ['coastal_piloting','harbor_works','naval_levies','knarrs','sternpost_rudder'].forEach(function (id) {
        if (rec.completed.indexOf(id)<0) rec.completed.push(id);
      }); FB.invalidateTechBonuses();
      const before = s.player.enterprises.length,site = prefix+'boat_plant';
      const assignment = FB.campaignBookmark(s).maritimeWorkAssignments[0],profile = FBDATA.maritimeWorkProfiles[assignment.profileId];
      const recipeId = profile.recipeId;
      const batch = P.commit(s,P.aiQuote(s,site,'reserve',{recipeId:recipeId,disposition:'store'}));
      for (let n=0;n<FBDATA.productionRecipes[recipeId].workDays;n++) {
        if (!P.perform(s,P.aiQuote(s,site,'work',{batchId:batch}))) throw new Error('Expected real boat work');
      }
      if (!P.commit(s,P.aiQuote(s,site,'finish',{batchId:batch}))) throw new Error('Expected worked materials');
      const q = M.aiQuote(s,prefix+'licensed_work','prepare',{enterpriseUid:null});
      const id = M.commit(s,q),reserved = s.player.enterprises.length;
      const done = M.aiQuote(s,prefix+'licensed_work','complete',{invoiceId:id}),gold = s.player.gold;
      const paid = M.commit(s,done),again = M.commit(s,done); P.validate(s);
      return {batch:!!batch,id:!!id,before:before,reserved:reserved,after:s.player.enterprises.length,paid:paid,again:again,
        spent:gold-s.player.gold,due:done.due,credit:q.credit,base:q.baseCost,
        remaining:s.production.lots.filter(function (l) { return l.goodId===profile.goodId && l.origin.kind==='batch'; }).reduce(function (v,l) { return v+l.remaining; },0)};
    },kind);
    expect(r).toMatchObject({batch:true,id:true,before:0,reserved:0,after:1,paid:true,again:false,remaining:0});
    expect(r.spent).toBe(r.due); expect(r.credit).toBeGreaterThan(0); expect(r.credit).toBeLessThanOrEqual(Math.floor(r.base*0.1));
  });

  test(kind + ' malformed combined declarations reject before publication or resource initialization', async function ({ page }, info) {
    await openGame(page,info);
    const r = await page.evaluate(function (source) {
      const original = JSON.stringify(source),before = JSON.stringify([FBDATA,FB.state]),world = FB.world,
        rng = FB.getRngState(),uid = FB.getUidCounter(),stored = JSON.stringify(localStorage);
      const valid = FB.mods.validate(source);
      const failures = ['cycle','stock','foundation','fort','profile','season','route'].map(function (kind) {
        const m = JSON.parse(original),bm = Object.values(m.bookmarks)[0];
        if (kind==='cycle') bm.siteResourceAssignments[0].connectedSourceId = bm.siteResourceAssignments[0].id;
        if (kind==='stock') bm.productionSites.find(function (p) { return p.openingLots.length; }).openingLots[0].quantity = -1;
        if (kind==='foundation') bm.buildingInstitutionAssignments[0].institutionId = 'absent_foundation';
        if (kind==='fort') bm.openingInfrastructure.placements.push(Object.assign({},bm.openingInfrastructure.placements.find(function (p) { return p.buildingId==='walls'; })));
        if (kind==='profile') bm.openingInfrastructure.placements.find(function (p) { return p.profileId; }).profileId = 'absent_profile';
        if (kind==='season') bm.buildingSeasonAssignments[0].productionSiteId = 'absent_plant';
        if (kind==='route') bm.relayServiceAssignments[0].sourceSiteId = 'absent_plant';
        return FB.mods.validate(m).length>0;
      });
      return {valid:valid,failures:failures,pure:original===JSON.stringify(source) && before===JSON.stringify([FBDATA,FB.state]) &&
        world===FB.world && rng===FB.getRngState() && uid===FB.getUidCounter() && stored===JSON.stringify(localStorage)};
    },examples[kind]);
    expect(r).toEqual({valid:[],failures:Array(7).fill(true),pure:true});
  });
}
