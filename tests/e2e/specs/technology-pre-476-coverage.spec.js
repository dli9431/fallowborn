'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { beginBookmarkFromTitle, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { installRestoreFacts } = require('../support/game/restore-facts');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'data/technology.js', 'data/technology_foundations.js',
  'data/technology_learning.js', 'data/technology_civic_military.js',
  'data/technology_maritime.js', 'data/technology_wind.js', 'data/technology_transmission.js',
  'data/technology_early_refinements.js', 'data/technology_waterworks.js',
  'data/technology_masonry_circuits.js', 'data/technology_baths_headworks.js',
  'data/eras.js', 'data/cultures.js', 'data/bookmarks.js', 'data/bookmark_manifest.js',
  'js/technology.js', 'js/world.js', 'js/bookmark_composition.js', 'js/bookmark_sources.js',
  'js/main.js', 'js/mods.js', 'js/save.js', 'js/save_v4.js'
]);

// Literal predecessor pairs, independent of the new authored emergence table.
const PRIOR = {
  quern_stones:{latin:[430,570],byzantine:[410,550],islamic:[410,550],persianate:[420,560],
    slavic:[445,585],nordic:[450,590],steppe:[440,580],baltic_finnic:[465,605],
    caucasian:[435,575],northeast_african:[445,585]},
  surgical_instruments:{latin:[470,690],byzantine:[450,670],islamic:[450,670],
    persianate:[460,680],caucasian:[475,695]},
  census_records:{latin:[450,650],byzantine:[430,630],islamic:[430,630],persianate:[440,640],
    slavic:[465,665],nordic:[470,670],steppe:[460,660],caucasian:[455,655],northeast_african:[465,665]},
  land_registers:{latin:[450,650],byzantine:[430,630],islamic:[430,630],persianate:[440,640],
    slavic:[465,665],nordic:[470,670],steppe:[460,660],caucasian:[455,655],northeast_african:[465,665]},
  tax_assessment:{latin:[470,690],byzantine:[450,670],islamic:[450,670],persianate:[460,680],caucasian:[475,695]},
  bureaucratic_offices:{latin:[450,670],byzantine:[430,650],islamic:[430,650],persianate:[440,660],
    slavic:[465,685],nordic:[470,690],steppe:[460,680],caucasian:[455,675],northeast_african:[465,685]},
  torsion_artillery:{latin:[470,710],byzantine:[450,690],islamic:[450,690]}
};
const DATES = ['476','493','568','634','711','800','867','1066','1096','1204','1241'];

async function installSeedingReview(page) {
  await page.evaluate(function (prior) {
    function copy(value) { return JSON.parse(JSON.stringify(value)); }
    window.preCoverageCatalogue = copy(FBDATA.tech);
    Object.keys(prior).forEach(function (id) {
      Object.keys(prior[id]).forEach(function (tradition) {
        window.preCoverageCatalogue[id].history.adoption[tradition] = prior[id][tradition];
      });
    });
    window.reviewSeed = function (year, traditions, exceptions, old) {
      const current = FBDATA.tech;
      const state = {start:{era:year < 650 ? 'late_antique' : year < 1000 ? 'early_medieval' : 'high_medieval'},
        date:{year:year,season:0,day:1}, realmTech:{}, realmTechMigration:2,
        realms:{review:{alive:true,liege:null,techTraditions:traditions,techSeed:exceptions || {}}}};
      try {
        if (old) FBDATA.tech = window.preCoverageCatalogue;
        FB.seedRealmTechnologies(state,true);
        const record = state.realmTech.review;
        record.completed.sort(); record.exposed.sort();
        return record;
      } finally { FBDATA.tech = current; }
    };
    window.closedKnowledge = function (record) {
      return record.completed.filter(function (id) {
        const def = FBDATA.tech[id];
        return def.req.some(function (req) { return record.completed.indexOf(req) < 0; }) ||
          (def.reqAny && def.reqAny.length && !def.reqAny.some(function (req) {
            return record.completed.indexOf(req) >= 0;
          }));
      });
    };
  }, PRIOR);
}

test('coverage and staged earlier era validation retain named rejection and pure catalogue review', async function ({page}, info) {
  await openGame(page,info);
  const r = await page.evaluate(function () {
    const original = FBDATA.eras.late_antique.technology;
    const before = JSON.stringify(FBDATA.tech), rng = FB.getRngState(), uid = FB.getUidCounter();
    const definition = {id:'early_review',date:{year:451,season:0,day:1},realms:[]};
    let years, era, retainedEra;
    try {
      FBDATA.eras.late_antique.technology = {from:476,to:649,startingKnowledge:'historical'};
      retainedEra = FB.bookmarkTechnologyFaults(definition,'late_antique');
      FBDATA.eras.late_antique.technology = {from:375,to:649,startingKnowledge:'historical'};
      era = FB.validateEraTechnology('late_antique',FBDATA.eras.late_antique);
      years = [374,375,451,475,1301].map(function (year) {
        return FB.bookmarkTechnologyFaults(Object.assign({},definition,{date:{year:year}}),null);
      });
    } finally { FBDATA.eras.late_antique.technology = original; }
    return {coverage:FBDATA.techCoverage,retainedEra:retainedEra,years:years,era:era,
      errors:FB.validateTechnologyData(true),count:Object.keys(FBDATA.tech).length,
      pure:before === JSON.stringify(FBDATA.tech) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(r.coverage).toEqual({from:375,to:1300});
  expect(r.count).toBe(195); expect(r.errors).toEqual([]); expect(r.pure).toBe(true);
  expect(r.era).toEqual([]);
  expect(r.retainedEra).toEqual(['Bookmark early_review: start year 451 is outside era late_antique technology window (476–649).']);
  expect(r.years).toEqual([
    ['Bookmark early_review: start year 374 is outside the technology catalogue coverage (375–1300).'],
    [],[],[],['Bookmark early_review: start year 1301 is outside the technology catalogue coverage (375–1300).']
  ]);
});

test('fifty emergence pairs preserve all widespread dates, pair ordering, costs, caps and prerequisites', async function ({page}, info) {
  await openGame(page,info);
  const r = await page.evaluate(function (prior) {
    const faults = [], windows = [];
    Object.keys(prior).forEach(function (id) {
      const def = FBDATA.tech[id];
      Object.keys(prior[id]).forEach(function (tradition) {
        const old = prior[id][tradition], current = def.history.adoption[tradition];
        if (current[0] !== old[0]-200 || current[1] !== old[1]) faults.push(id+'.'+tradition);
        windows.push({id:id,tradition:tradition,from:current[0],to:current[1]});
      });
    });
    return {faults:faults,windows:windows,caps:FBDATA.techCaps,
      contracts:Object.keys(prior).map(function (id) {
        const d = FBDATA.tech[id];
        return {id:id,cost:d.cost,req:d.req,capabilities:d.capabilities,fx:d.fx};
      })};
  }, PRIOR);
  expect(r.faults).toEqual([]); expect(r.windows).toHaveLength(50);
  expect(r.contracts).toEqual([
    {id:'quern_stones',cost:20,req:[],capabilities:[],fx:{tax:0.005}},
    {id:'surgical_instruments',cost:20,req:['bloomery_iron'],capabilities:[],fx:{}},
    {id:'census_records',cost:20,req:['written_law'],capabilities:[],fx:{tax:0.005}},
    {id:'land_registers',cost:20,req:['written_law'],capabilities:[],fx:{tax:0.005}},
    {id:'tax_assessment',cost:20,req:['census_records'],capabilities:[],fx:{tax:0.01}},
    {id:'bureaucratic_offices',cost:20,req:['written_law'],capabilities:[],fx:{tax:0.005}},
    {id:'torsion_artillery',cost:20,req:['geometry'],capabilities:[],fx:{siege:0.01}}
  ]);
  expect(r.caps).toEqual({tax:0.35,levy:0.35,battle:0.15,devCap:4,health:0.03,research:5,
    domain:2,siege:0.35,movement:0.25,seaMovement:0.40,education:0.20,finance:0.30,trade:0.30,
    supply:0.25,populationCapacity:0.35,populationCrisisProtection:0.10,migrationAttraction:3,
    costFloor:{build:0.55,enterprise:0.55,training:0.65},units:{levy:250,arch:200,cav:160,ret:160},
    aiUnits:{arch:0.20,cav:0.20,ret:0.20}});
});

test('every earlier year closes the graph; 451 has only the retained regional differences from 476', async function ({page}, info) {
  await openGame(page,info); await installSeedingReview(page);
  const r = await page.evaluate(function () {
    const faults = [], deltas = {};
    Object.keys(FBDATA.techTraditions).forEach(function (tradition) {
      for (let year = 375; year <= 475; year++) {
        const record = reviewSeed(year,[tradition]);
        const invalid = closedKnowledge(record);
        if (invalid.length) faults.push({year:year,tradition:tradition,ids:invalid});
        if (record.completed.length < 10) faults.push({year:year,tradition:tradition,empty:true});
      }
      const early = reviewSeed(451,[tradition]), later = reviewSeed(476,[tradition]);
      deltas[tradition] = {completed:later.completed.filter(function (id) { return early.completed.indexOf(id)<0; }),
        exposed:later.exposed.filter(function (id) { return early.exposed.indexOf(id)<0; })};
      // Earlier emergence exposes the foundations without granting them for free.
      const ancient = reviewSeed(375,[tradition]);
      ['census_records','land_registers','bureaucratic_offices','tax_assessment','surgical_instruments','torsion_artillery']
        .forEach(function (id) {
          if (ancient.completed.indexOf(id)>=0) faults.push({tradition:tradition,free:id});
        });
    });
    return {faults:faults,deltas:deltas,latin:reviewSeed(375,['latin'])};
  });
  expect(r.faults).toEqual([]);
  expect(r.latin.exposed).toEqual(expect.arrayContaining(Object.keys(PRIOR)));
  expect(r.deltas).toEqual({
    latin:{completed:[],exposed:['mounted_archery','sounding_lead','stone_bridgebuilding']},
    byzantine:{completed:[],exposed:[]}, islamic:{completed:[],exposed:[]},
    persianate:{completed:[],exposed:['pattern_welding','sounding_lead','stirrups','stone_bridgebuilding','undershot_watermill','water_lifting_devices']},
    slavic:{completed:[],exposed:['ard_plough','astronomical_observation','clinker_shipbuilding','fortified_camps','geometry','harbor_works','lost_wax_casting','manuring','market_tolls','road_surveys','warehouses','warp_weighted_loom','wheeled_carts']},
    nordic:{completed:[],exposed:['ard_plough','astronomical_observation','clinker_shipbuilding','fortified_camps','geometry','harbor_works','lost_wax_casting','manuring','market_tolls','road_surveys','warehouses','warp_weighted_loom','wheeled_carts']},
    steppe:{completed:[],exposed:['ard_plough','astronomical_observation','fortified_camps','geometry','harbor_works','lost_wax_casting','manuring','market_tolls','road_surveys','scale_lamellar','warehouses','warp_weighted_loom','wheeled_carts']},
    baltic_finnic:{completed:['composite_bow'],exposed:['coastal_piloting','mortise_tenon_shipbuilding','parchment_making','steering_oars','water_power']},
    caucasian:{completed:[],exposed:['ard_plough','astronomical_observation','fortified_camps','geometry','harbor_works','lost_wax_casting','manuring','market_tolls','mounted_archery','pattern_welding','road_surveys','sounding_lead','stone_bridgebuilding','terrace_farming','undershot_watermill','warehouses','warp_weighted_loom','wheeled_carts','wine_press']},
    northeast_african:{completed:[],exposed:['ard_plough','astronomical_observation','fortified_camps','geometry','glassblowing','harbor_works','lateen_sail','lost_wax_casting','manuring','market_tolls','olive_press','road_surveys','warehouses','warp_weighted_loom','wheeled_carts']}
  });
});

for (const date of DATES) test(date+' keeps exact seeded records for every revision and mixed transmission route', async function ({page}, info) {
  await openGame(page,info); await installSeedingReview(page);
  const r = await page.evaluate(function (date) {
    const faults = [], traditions = Object.keys(FBDATA.techTraditions), combinations = traditions.map(function (t) { return [t]; });
    traditions.forEach(function (a, i) { traditions.slice(i+1).forEach(function (b) { combinations.push([a,b],[b,a]); }); });
    combinations.push(traditions,traditions.slice().reverse());
    combinations.forEach(function (route) {
      const old = reviewSeed(Number(date),route,{},true), current = reviewSeed(Number(date),route);
      if (JSON.stringify(old)!==JSON.stringify(current)) faults.push({date:date,route:route,old:old,current:current});
    });
    let realms = 0;
    FB.bookmarkRevisions(date).forEach(function (bm) {
      function seed(old) {
        const current = FBDATA.tech, world = FB.world;
        const s = {start:{id:bm.id,revision:bm.revision,era:bm.era},date:bm.date,realmTech:{},realmTechMigration:2,
          realms:{},provinces:{},chars:{}};
        bm.realms.forEach(function (realm) { s.realms[realm.id] = Object.assign({alive:true},realm); });
        bm.provinces.forEach(function (p) { s.provinces[p.id] = p; });
        try {
          // Match the selected world's capital identity for realms without an
          // explicit route; the title's active world can be a different date.
          FB.world = Object.assign({},world || {},{byId:s.provinces});
          if (old) FBDATA.tech = preCoverageCatalogue;
          FB.seedRealmTechnologies(s,true);
          return s.realmTech;
        } finally { FBDATA.tech = current; FB.world = world; }
      }
      const old = seed(true), current = seed(false);
      realms += Object.keys(current).length;
      Object.keys(current).forEach(function (rid) {
        ['completed','exposed'].forEach(function (key) { old[rid][key].sort(); current[rid][key].sort(); });
        if (JSON.stringify(old[rid])!==JSON.stringify(current[rid])) faults.push({revision:bm.revision,rid:rid});
      });
    });
    return {faults:faults,realms:realms,configurations:combinations.length};
  },date);
  expect(r.faults).toEqual([]); expect(r.realms).toBeGreaterThan(10); expect(r.configurations).toBe(102);
});

test('early exceptions close prerequisites and authoritative omissions block descendants without touching live state', async function ({page}, info) {
  await openGame(page,info); await startDeterministicGame(page); await installSeedingReview(page);
  const r = await page.evaluate(function () {
    const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const complete = reviewSeed(451,['latin','byzantine'],{complete:['tax_assessment','torsion_artillery'],expose:['stirrups']});
    const omitted = reviewSeed(451,['latin','byzantine'],{complete:['tax_assessment','torsion_artillery'],omit:['written_law','arithmetic']});
    return {complete:complete,omitted:omitted,closed:closedKnowledge(complete).concat(closedKnowledge(omitted)),
      pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(r.complete.completed).toEqual(expect.arrayContaining(['written_law','census_records','tax_assessment','arithmetic','geometry','torsion_artillery']));
  expect(r.complete.exposed).toContain('stirrups'); expect(r.closed).toEqual([]); expect(r.pure).toBe(true);
  for (const id of ['written_law','census_records','tax_assessment','arithmetic','geometry','torsion_artillery']) expect(r.omitted.completed).not.toContain(id);
});

for (const date of ['476','867']) test(date+' matching current-content saves retain incomplete foundations through two loads', async function ({page}, info) {
  await openGame(page,info); await beginBookmarkFromTitle(page,date); await installRestoreFacts(page);
  const saved = await page.evaluate(function () {
    const s = FB.state, rec = FB.realmTechRecord(s);
    rec.completed = ['written_law']; rec.exposed = ['written_law','census_records','quern_stones'];
    rec.active = ['census_records']; rec.progress = {census_records:7.5,quern_stones:3};
    rec.reserve = 2; rec.priorities = {census_records:2}; rec.historicalSeeded = 1;
    return {facts:restoreFacts(s,function (v) { return {records:v.realmTech,buildings:v.buildings,player:v.player}; },{technologySets:true}),save:FB.save.serialize()};
  });
  for (let load = 0, text = saved.save; load < 2; load++) {
    await restoreBookmark(page,text);
    const actual = await page.evaluate(function () {
      return {facts:restoreFacts(FB.state,function (v) { return {records:v.realmTech,buildings:v.buildings,player:v.player}; },{technologySets:true}),save:FB.save.serialize()};
    });
    expect(actual.facts).toEqual(saved.facts); text = actual.save;
  }
});

for (const sample of [
  {file:'technology-pre-476-civic.json',id:'tax_assessment',complete:false,window:{emergence:200,widespread:475,tradition:'byzantine'}},
  {file:'technology-pre-476-workshop.json',id:'quern_stones',complete:true,window:{emergence:200,widespread:450,tradition:'latin'}}
]) test(sample.file+' uses ordinary JSON import, whole pairs and atomic malformed-window rejection', async function ({page}, info) {
  await openGame(page,info); await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+sample.file));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page); await installSeedingReview(page);
  const r = await page.evaluate(function (sample) {
    const state = {realms:{review:{alive:true,techTraditions:['latin','byzantine']}},date:{year:451}};
    const record = reviewSeed(451,['latin','byzantine']);
    const mod = {tech:{}}, current = FBDATA.tech[sample.id];
    mod.tech[sample.id] = JSON.parse(JSON.stringify(current));
    mod.tech[sample.id].history.adoption.default = [500,300];
    const before = JSON.stringify([FBDATA.tech,FB.state]), input = JSON.stringify(mod), storage = localStorage.getItem(FB.storageKey('fb_mods'));
    const rng = FB.getRngState(), uid = FB.getUidCounter(), errors = FB.mods.validate(mod);
    return {complete:record.completed.indexOf(sample.id)>=0,closed:closedKnowledge(record),errors:errors,
      window:FB.techHistoricalWindow(state,sample.id,'review'),
      pure:before===JSON.stringify([FBDATA.tech,FB.state]) && input===JSON.stringify(mod) && storage===localStorage.getItem(FB.storageKey('fb_mods')) &&
        rng===FB.getRngState() && uid===FB.getUidCounter()};
  },sample);
  expect(r.complete).toBe(sample.complete); expect(r.window).toMatchObject(sample.window);
  expect(r.closed).toEqual([]); expect(r.errors.length).toBeGreaterThan(0); expect(r.pure).toBe(true);
});
