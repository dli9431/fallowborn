'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const released = require('../fixtures/released-catalogue.json');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/identities_1096.js','data/institutions_1096.js',
  'data/bookmark_1096_campaigns.js','data/story_household_effects_1096.js','data/story_world_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/bookmarks.js','data/counties.js','data/map_data.js','data/geographies.js',
  'data/geography_expansion.js','data/settlements.js','data/settlements_real.js',
  'data/cultures.js','data/eras.js','data/technology.js','data/technology_foundations.js',
  'data/technology_learning.js','data/technology_civic_military.js',
  'data/technology_maritime.js','data/technology_wind.js','data/starts.js',
  'data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js','data/government_rollout.js',
  'data/religious_institutions.js','data/ecclesiastical_profiles.js',
  'js/world.js','js/starts.js','js/main.js','js/model.js','js/technology.js',
  'js/institutions.js','js/religious_institutions.js','js/population.js',
  'js/governments.js','js/government_administration.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_modals.js','js/crazygames.js'
]);

// Source text is executed only in the browser, after the real index has booted.
const composer = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_1096.js'),'utf8');
const regionOrder = [
  'west_north','west_south','iberia_north','iberia_south',
  'empire_rhine','empire_alps','italy_north','italy_south',
  'britain_south','britain_north_ireland','nordic_baltic',
  'central_danube','rus_steppe','balkans','anatolia_caucasus',
  'syria_palestine','jazira','egypt','arabia','iran_iraq',
  'eastern_edge','maghreb','horn_sahel'
];

test('the corrected world has complete date-owned hierarchy, layouts, identities and offices',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (order) {
    const b = FB.bookmark('1096'), layout = FBDATA.settlementLayouts['1096'];
    const expected = [], faults = [], titles = {duchies:{},kingdoms:{},empires:{}};
    order.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1096[key];
      block.provinces.forEach(function (p) { expected.push(p.id); });
      Object.keys(titles).forEach(function (field) {
        if (!block[field]) faults.push('missing regional titles '+key+' '+field);
        Object.keys(block[field] || {}).forEach(function (id) {
          const declaration = block[field][id];
          if (JSON.stringify(b[field][id]) !== JSON.stringify(declaration) || b[field][id] === declaration)
            faults.push('title '+field+' '+id);
          titles[field][id] = true;
        });
      });
    });
    b.provinces.forEach(function (p) {
      if (p.wasteland) return;
      if (!layout[p.id] || !layout[p.id].length) faults.push('layout '+p.id);
      const zone = b.climate.provinces[p.id] || b.climate.zone;
      if (!FBDATA.climateZones[zone]) faults.push('climate '+p.id);
      const communities = FB.provinceCommunities(p);
      communities.forEach(function (c) {
        if (!FB.cultureExists(c.culture,null) || !FB.faithHistoricalAvailable(c.religion,b,'community'))
          faults.push('identity '+p.id);
      });
    });
    const courts = {};
    b.realms.forEach(function (r) { courts[r.id] = r; });
    return {faults:faults,validation:FB.validateBookmark(b),
      actual:b.provinces.map(function (p) { return p.id; }),expected:expected,
      physical:FB.geography(b.geography).provinces.map(function (p) { return p.id; }),
      counts:[b.provinces.length,b.provinces.filter(function (p) { return !p.wasteland; }).length,
        b.realms.length,Object.keys(b.duchies).length,Object.keys(b.kingdoms).length,Object.keys(b.empires).length],
      exactTitles:Object.keys(titles).every(function (field) {
        return JSON.stringify(Object.keys(titles[field]).sort()) === JSON.stringify(Object.keys(b[field]).sort());
      }),
      heads:b.religiousHeads,officeIds:Object.keys(b.localInstitutions),
      vacant:Object.keys(b.localInstitutions).every(function (id) {
        const d = b.localInstitutions[id];
        return d.vacant === true && d.freshOnly === true && !d.representative && !d.historicalName;
      }),
      owners:['logrono','guadalajara','santarem','tunis','smolensk','minsk','bust','sarakhs_oasis'].map(function (id) {
        return b.provinces.filter(function (p) { return p.id === id; })[0].realm;
      }),
      anchors:[courts.zirid_1096.capital,courts.obotrite_1096.capital,courts.papacy_1096.ruler.born],
      opening:b.opening,stories:b.stories,scripted:b.scripted};
  },regionOrder);
  expect(result.faults).toEqual([]);
  expect(result.validation).toEqual([]);
  expect(result.actual).toEqual(result.expected);
  expect(result.actual.slice().sort()).toEqual(result.physical.sort());
  expect(result.counts).toEqual([527,488,112,224,51,11]);
  expect(result.exactTitles).toBe(true);
  expect(result.heads).toEqual({catholic:'papacy_1096',sunni:'abbasid_1096'});
  expect(result.officeIds).toEqual(['cologne_jewish_congregation_1096','mainz_jewish_congregation_1096',
    'worms_jewish_congregation_1096','speyer_jewish_congregation_1096','durham_see_1096']);
  expect(result.vacant).toBe(true);
  expect(result.owners).toEqual(['leon_castile_1096','leon_castile_1096','leon_castile_1096',
    'tunis_local_1096','smolensk_1096','polotsk_1096','ghaznavid_1096','khorasan_1096']);
  expect(result.anchors).toEqual(['kairouan','lubeck',1035]);
  expect(result.opening).toEqual({actors:{},appointments:{},estates:[],claims:[],migrations:[]});
  expect(result.stories).toEqual(['eastern_undertaking_1096','eastern_undertaking_households_1096']);
  expect(result.scripted).toEqual([]);
  expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
});

test('composition rejects incomplete or conflicting parts before changing any publication',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (source) {
    const run = new Function('window','FBDATA',source);
    const original = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const cases = [
      ['region',function (d) { delete d.bookmarkRegions1096.jazira; }],
      ['county count',function (d) { d.bookmarkRegions1096.west_north.provinces.pop(); }],
      ['county identity',function (d) { d.bookmarkRegions1096.west_north.provinces[0].id = 'absent_county'; }],
      ['duplicate county',function (d) {
        d.bookmarkRegions1096.west_north.provinces.push(d.bookmarkRegions1096.west_north.provinces[0]);
      }],
      ['duplicate court',function (d) {
        d.bookmarkRegions1096.west_north.realms.push(d.bookmarkRegions1096.west_north.realms[0]);
      }],
      ['shared title',function (d) { d.bookmarkRegions1096.west_south.empires.francia.name = 'Conflicting parent'; }],
      ['missing title',function (d) {
        Object.keys(d.bookmarkRegions1096).forEach(function (key) {
          delete d.bookmarkRegions1096[key].duchies.rhineland;
        });
      }],
      ['missing layout',function (d) { delete d.bookmarkRegions1096.empire_rhine.layouts.mainz; }],
      ['missing owner',function (d) { d.bookmarkRegions1096.west_north.provinces[0].realm = 'absent_court'; }],
      ['missing liege',function (d) { d.bookmarkRegions1096.west_north.realms[0].liege = 'absent_court'; }],
      ['missing capital',function (d) { d.bookmarkRegions1096.west_north.realms[0].capital = 'absent_county'; }],
      ['institution source',function (d) { delete d.bookmarkInstitutions1096; }],
      ['duplicate institution',function (d) {
        d.bookmarkRegions1096.empire_rhine.localInstitutions = {durham_see_1096:d.bookmarkInstitutions1096.durham_see_1096};
      }],
      ['physical site',function (d) { d.bookmarkRegions1096.west_north.settlementSites.paris = {x:0,y:0}; }],
      ['availability source',function (d) { delete d.religions.rabbanite.availability; }]
    ];
    const outcomes = cases.map(function (entry) {
      const detached = JSON.parse(original);
      entry[1](detached);
      const before = JSON.stringify(detached), published = detached.bookmarks['1096'];
      let rejected = false;
      try { run({FBDATA:detached},detached); } catch (error) { rejected = true; }
      return {name:entry[0],rejected:rejected,pure:JSON.stringify(detached) === before &&
        published === detached.bookmarks['1096']};
    });
    return {outcomes:outcomes,untouched:original === JSON.stringify(FBDATA) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  },composer);
  for (const outcome of result.outcomes) expect(outcome,outcome.name).toMatchObject({rejected:true,pure:true});
  expect(result.untouched).toBe(true);
});

test('the dated parts recompose without an earlier bookmark and preserve their detached inputs',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (source) {
    const detached = JSON.parse(JSON.stringify(FBDATA)), original = detached.bookmarks['1096'];
    const before = JSON.stringify(detached.bookmarkRegions1096);
    delete detached.bookmarks['1066'];
    delete detached.bookmarks['867'];
    new Function('window','FBDATA',source)({FBDATA:detached},detached);
    const b = detached.bookmarks['1096'];
    const fields = ['provinces','realms','duchies','kingdoms','empires','opening','localInstitutions',
      'climate','religiousHeads','date','era','geography','revision','openingRevision','openingLegacyRevision'];
    return {equal:fields.every(function (field) { return JSON.stringify(original[field]) === JSON.stringify(b[field]); }),
      unchanged:before === JSON.stringify(detached.bookmarkRegions1096),
      detached:b !== original && b.localInstitutions !== detached.bookmarkInstitutions1096 &&
        b.duchies.ile !== detached.bookmarkRegions1096.west_north.duchies.ile,
      heads:b.religiousHeads,visible:b.hidden !== true};
  },composer)).toEqual({equal:true,unchanged:true,detached:true,
    heads:{catholic:'papacy_1096',sunni:'abbasid_1096'},visible:true});
});

async function begin(page,info,county,identity,crazygames) {
  await startHistoricalGame(page,info,{bookmark:'1096',
    code:'ASSEMBLY-1096-farmer-'+county+'-f-Leah-established-0-'+identity},!!crazygames);
}

test('activation rejects bad references before replacing a live corrected campaign or cached world',async function ({page},info) {
  await begin(page,info,'mainz','ashkenazi.jewish');
  const result = await page.evaluate(async function () {
    const original = FBDATA.bookmarks['1096'], state = FB.state, world = FB.world, active = FB.activeBookmark;
    const rng = FB.getRngState(), uid = FB.getUidCounter(), saved = JSON.stringify(state);
    const changes = [
      function (b) { b.realms[0].liege = b.realms[0].id; },
      function (b) { b.provinces[0].religion = 'absent_faith'; },
      function (b) { b.localInstitutions.durham_see_1096.site = 'absent_site'; },
      function (b) { b.realms[0].techSeed = {complete:['absent_technology']}; },
      function (b) { b.religiousHeads.catholic = 'absent_court'; },
      function (b) { b.climate.provinces.mainz = 'absent_climate'; }
    ];
    const results = [];
    try {
      for (const change of changes) {
        const candidate = JSON.parse(JSON.stringify(original)); change(candidate);
        FBDATA.bookmarks['1096'] = candidate;
        const data = JSON.stringify(FBDATA);
        const error = await new Promise(function (resolve) {
          FB.activateBookmark('1096',null,function (error) { resolve(error && error.message || ''); });
        });
        results.push(!!error && state === FB.state && world === FB.world && active === FB.activeBookmark &&
          FB.activeBookmarkId === '1096' && rng === FB.getRngState() && uid === FB.getUidCounter() &&
          saved === JSON.stringify(FB.state) && data === JSON.stringify(FBDATA));
      }
    } finally { FBDATA.bookmarks['1096'] = original; }
    return results;
  });
  expect(result).toEqual(Array(6).fill(true));
});

test('hiding the corrected definition blocks every new entry while keeping it inspectable',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['1096'].hidden = true; });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist [data-bookmark="1096"]')).toHaveCount(0);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('HIDDEN-1096-farmer-mainz-f-Leah-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await page.locator('#ng-cancel').click();
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1096',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  expect(await page.evaluate(function () {
    const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.game.pending = {bookmarkId:'1096',seed:'HIDDEN',provinceId:'mainz',
      scenario:FBDATA.startScenarios.filter(function (s) { return s.id === 'farmer'; })[0]};
    return {start:FB.game.start(),observe:FB.game.startObserve(),available:FB.bookmarkAvailable('1096'),
      listed:FB.bookmarks().some(function (b) { return b.id === '1096'; }),
      inspected:FB.bookmarks(true).some(function (b) { return b.id === '1096'; }),
      pure:state === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({start:false,observe:false,available:false,listed:false,inspected:true,pure:true});
});

for (const household of [{county:'mainz',identity:'ashkenazi.jewish'},{county:'qom',identity:'persian.sunni'}]) {
  test('an ordinary '+household.county+' household keeps its resident identity and corrected public world',async function ({page},info) {
    await begin(page,info,household.county,household.identity);
    const result = await page.evaluate(function () {
      const s = FB.state, me = s.chars[s.player.charId], b = FB.campaignBookmark(s), faults = [];
      b.provinces.forEach(function (p) {
        if (p.wasteland) return;
        if (s.owner[p.id] !== FB.topRealm(s,p.realm) || !s.holder[p.id] || !s.realms[s.holder[p.id]] ||
            FB.topRealm(s,s.holder[p.id]) !== s.owner[p.id]) faults.push('possession '+p.id);
        if (FB.countyCommunities(s,p.id).reduce(function (n,c) { return n+c.count; },0) !== FB.countyPopulation(s,p.id))
          faults.push('population '+p.id);
      });
      const sovereigns = Object.keys(s.realms).filter(function (id) { return s.realms[id].alive && !s.realms[id].liege; });
      return {home:s.player.provinceId,identity:me.culture+'.'+me.religion,
        date:s.date,turn:s.turn,era:s.start.era,geography:s.start.geography,
        titleFaults:faults,technology:sovereigns.every(function (id) { return !!s.realmTech[id]; }),
        seeded:s.techSeeded,policy:FB.eraTechnology(s).startingKnowledge,
        heads:s.religiousHeads,durham:s.localInstitutions.durham_see_1096,
        worldStories:b.stories,expedition:!!s.stories.pilgrim_household_track_1096,
        validation:FB.save.v4.validatePlatform(s)};
    });
    expect(result.home).toBe(household.county);
    expect(result.identity).toBe(household.identity);
    expect(result.date).toEqual({year:1096,season:0,day:1});
    expect([result.turn,result.era,result.geography]).toEqual([0,'high_medieval','europe_regional_2']);
    expect(result.titleFaults).toEqual([]);
    expect(result.technology).toBe(true);
    expect(result.seeded).toBe(1);
    expect(result.policy).toBe('historical');
    expect(result.heads.catholic).toBe('papacy_1096');
    expect(result.heads.sunni).toBe('abbasid_1096');
    expect(result.heads.durham_bishop).toBeNull();
    expect(result.durham.representativeId).toBeNull();
    expect(result.worldStories).toEqual(['eastern_undertaking_1096','eastern_undertaking_households_1096']);
    expect(result.expedition).toBe(false);
    expect(result.validation).toEqual([]);
  });
}

for (const crazygames of [false,true]) {
  test('saved people, possessions and knowledge survive preview and hidden restore on '+(crazygames ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      await begin(page,info,'mainz','ashkenazi.jewish',crazygames);
      await page.evaluate(function () {
        // Current campaign facts must win over a later fresh-world template.
        const s = FB.state, rec = FB.realmTechRecord(s,'hre_1096');
        rec.completed = ['manuscript_codex']; rec.exposed = ['manuscript_codex','scriptoria'];
        FB.invalidateTechBonuses();
        s.chars[s.player.charId].name = 'Leah Saved';
      });
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      const before = await page.evaluate(function () {
        const s = FB.state;
        return JSON.parse(JSON.stringify([s.chars,s.owner,s.holder,s.realmTech,s.localInstitutions,s.religiousHeads,s.start,
          FB.getRngState() >>> 0,FB.getUidCounter()]));
      });
      await page.evaluate(function () {
        FBDATA.bookmarks['1096'].hidden = true;
        return new Promise(function (resolve,reject) {
          FB.activateBookmark('1066',null,function (error) { if (error) reject(error); else resolve(); });
        });
      });
      await restoreBookmark(page,saved);
      expect(await page.evaluate(function () {
        const s = FB.state;
        return JSON.parse(JSON.stringify([s.chars,s.owner,s.holder,s.realmTech,s.localInstitutions,s.religiousHeads,s.start,
          FB.getRngState() >>> 0,FB.getUidCounter()]));
      })).toEqual(before);
      expect(await page.evaluate(function () {
        return {active:FB.activeBookmarkId,available:FB.bookmarkAvailable('1096'),
          identity:FB.state.chars[FB.state.player.charId].name};
      })).toEqual({active:'1096',available:false,identity:'Leah Saved'});
      expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
    });
}
