'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/identities_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/bookmarks.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'data/map_data.js','data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/cultures.js','data/eras.js','data/starts.js','data/settlements.js',
  'data/settlements_real.js','data/government_rollout.js','data/ecclesiastical_profiles.js',
  'data/climate.js','js/world.js','js/model.js','js/starts.js','js/main.js','js/util.js',
  'js/bookmark_setup.js','js/ecclesiastical_strategies.js','js/ecclesiastical_validation.js',
  'js/save.js','js/save_v4.js'
]);

const regionOrder = [
  'hungary_cumans','rus_north','rus_south','western_command_steppe',
  'britain_south','britain_north_ireland','france_north_low_countries','france_south_alps',
  'iberia_north_interior','iberia_south_east','empire_rhine_alps','bohemia_poland',
  'empire_north','italy_north','italy_south_papacy','scandinavia','baltic_finnic',
  'balkans_croatia','greek_latin_courts','anatolia_black_sea','caucasus_caspian',
  'levant_jazira','egypt','arabia','maghreb','africa_horn_sahel',
  'iraq_iran_west','iran_south_khorasan','transoxiana_khwarazm','afghan_indus'
];

test('1241 composes all physical counties in ledger order with unique courts and valid references',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (order) {
    const b = FB.bookmark('1241'), ids = [], counties = {}, courts = {}, faults = [];
    const layout = FBDATA.settlementLayouts[b.settlementLayout];
    b.provinces.forEach(function (p) { counties[p.id] = p; });
    b.realms.forEach(function (r) { courts[r.id] = r; });
    order.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1241[key];
      block.provinces.forEach(function (p) {
        ids.push(p.id);
        if (counties[p.id] === p || p.communities && counties[p.id].communities === p.communities)
          faults.push('shared county '+p.id);
      });
      block.realms.forEach(function (r) {
        if (courts[r.id] === r || courts[r.id].ruler === r.ruler) faults.push('shared court '+r.id);
      });
      const staged = block.settlementLayouts || block.layouts;
      Object.keys(staged).forEach(function (id) {
        if (staged[id] === layout[id] || JSON.stringify(staged[id]) !== JSON.stringify(layout[id]))
          faults.push('layout '+id);
      });
    });
    b.provinces.forEach(function (p) {
      if (p.wasteland) {
        if (p.realm || p.communities || layout[p.id]) faults.push('inhabited scenery '+p.id);
        return;
      }
      if (!courts[p.realm] || !layout[p.id] || !layout[p.id].length) faults.push('unresolved county '+p.id);
      (layout[p.id] || []).forEach(function (slot) {
        if (!FBDATA.settlementSites[slot.site]) faults.push('unresolved site '+slot.site);
      });
    });
    const inhabited = b.provinces.filter(function (p) { return !p.wasteland; }).map(function (p) { return p.id; });
    return {faults:faults,validation:FB.validateBookmark(b),religions:FB.validateReligionData(null),
      ids:b.provinces.map(function (p) { return p.id; }),expected:ids,
      physical:FB.geography(b.geography).provinces.map(function (p) { return p.id; }),
      counts:[b.provinces.length,Object.keys(counties).length,b.realms.length,Object.keys(courts).length,inhabited.length],
      metadata:[b.name,b.date,b.era,b.geography,b.revision,b.openingRevision],
      starts:Object.keys(b.startLocations).every(function (id) {
        return JSON.stringify(b.startLocations[id]) === JSON.stringify(inhabited);
      }),
      headBindings:b.religiousHeads,climates:['torne_district','palmyra_district','siwa_oasis'].map(function (id) {
        return b.climate.provinces[id];
      }),
      owners:['rouen','krakow','palermo','nicaea','sirte','van','zeila'].map(function (id) { return counties[id].realm; }),
      absent:['koten_following_1241','mongol_western_command_1241','sicily_1241','qara_khitai_1204']
        .every(function (id) { return !courts[id]; }),
      identities:FBDATA.religions.sahel_local_practice_1241 !== FBDATA.bookmarkReligions1241.sahel_local_practice_1241 &&
        FB.faithHistoricalAvailable('sahel_local_practice_1241',b,'community') &&
        !FB.faithHistoricalAvailable('sahel_local_practice_1241',FB.bookmark('1204'),'community'),
      stories:b.stories,scripted:b.scripted,opening:b.opening,institutions:b.localInstitutions};
  },regionOrder);
  expect(result.faults).toEqual([]);
  expect(result.validation).toEqual([]);
  expect(result.religions).toEqual([]);
  expect(result.ids).toEqual(result.expected);
  expect(result.ids.slice().sort()).toEqual(result.physical.sort());
  expect(result.counts).toEqual([527,527,103,103,491]);
  expect(result.metadata).toEqual(['The Mongol Invasion',{year:1241,season:0,day:1},
    'high_medieval','europe_regional_2','baseline','baseline']);
  expect(result.starts).toBe(true);
  expect(result.headBindings).toEqual({catholic:'papacy_1241',sunni:'abbasid_1241'});
  expect(result.climates).toEqual(['continental','arid','arid']);
  expect(result.owners).toEqual(['france_1241','silesia_1241','hre_1241','nicaea_1241',
    'egypt_1241','rum_1241','rasulid_yemen_1241']);
  expect(result.absent).toBe(true);
  expect(result.identities).toBe(true);
  expect(result.stories).toEqual([]);
  expect(result.scripted).toEqual([]);
  expect(result.opening).toEqual({actors:{},appointments:{},estates:[],claims:[],migrations:[]});
  expect(result.institutions).toEqual({});
});

test('1241 preserves released worlds and rejects malformed detached definitions without mutation',async function ({page},info) {
  await openGame(page,info);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
  expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  const result = await page.evaluate(function () {
    const data = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['county','court','owner','capital','faith'].map(function (kind) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('1241')));
      if (kind === 'county') b.provinces.push(JSON.parse(JSON.stringify(b.provinces[0])));
      if (kind === 'court') b.realms.push(JSON.parse(JSON.stringify(b.realms[0])));
      if (kind === 'owner') b.provinces[0].realm = 'absent_court_1241';
      if (kind === 'capital') b.realms[0].capital = 'absent_county_1241';
      if (kind === 'faith') b.provinces[0].religion = 'sahel_traditional_476';
      return FB.validateBookmark(b).length > 0;
    });
    return {rejected:rejected,pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:[true,true,true,true,true],pure:true});
});

test('1241 stays hidden through picker, start code, direct creation and Observe',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1241').hidden,available:FB.bookmarkAvailable('1241'),
      listed:FB.bookmarks().some(function (b) { return b.id === '1241'; }),
      inspectable:FB.bookmarks(true).some(function (b) { return b.id === '1241'; })};
  })).toEqual({hidden:true,available:false,listed:false,inspectable:true});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist')).not.toContainText('The Mongol Invasion');
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW1241-1241-farmer-szekesfehervar-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await page.locator('#ng-cancel').click();
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1241',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'1241',seed:'REVIEW1241',provinceId:'szekesfehervar',
      scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; })};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return {start:FB.game.start(),observe:FB.game.startObserve(),
      unchanged:state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({start:false,observe:false,unchanged:true});
});

test('a seeded 1241 household replays and restores its hidden world after another date activates',async function ({page},info) {
  await beginBookmark(page,info,'1241','farmer');
  const checkpoint = await page.evaluate(function () { return FB.save.serialize(); });
  expect(JSON.parse(checkpoint).v).toBe(4);
  const original = await facts(page);
  expect(original.campaign.start.id).toBe('1241');
  expect(original.campaign.date).toEqual({year:1241,season:0,day:1});
  expect(await page.evaluate(function () {
    return {invariants:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state),
      counties:FB.world.provs.length,sourceCourt:!!FB.state.realms.hungary_1204,
      heads:FB.state.religiousHeads};
  })).toMatchObject({invariants:[],valid:true,counties:527,sourceCourt:false,
    heads:{catholic:'papacy_1241',sunni:'abbasid_1241'}});
  await beginBookmark(page,info,'1241','farmer');
  await page.evaluate(function () { FB.save.serialize(); });
  expect(await facts(page)).toEqual(original);
  await page.evaluate(function () {
    FBDATA.bookmarks['1241'].hidden = true;
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await restoreBookmark(page,checkpoint);
  expect(await facts(page)).toEqual(original);
  expect(await page.evaluate(function () {
    return {active:FB.activeBookmarkId,hidden:FB.bookmark('1241').hidden,offered:FB.bookmarkAvailable('1241'),
      invariants:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
  })).toEqual({active:'1241',hidden:true,offered:false,invariants:[],valid:true});
});
