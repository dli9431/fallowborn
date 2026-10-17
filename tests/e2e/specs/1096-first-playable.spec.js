'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/identities_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/bookmarks.js','data/bookmark_1066_inhabited.js','data/map_data.js',
  'data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/cultures.js','data/eras.js','data/starts.js','data/settlements.js',
  'data/settlements_real.js','data/government_rollout.js','data/ecclesiastical_profiles.js',
  'js/world.js','js/model.js','js/starts.js','js/main.js','js/save.js','js/save_v4.js'
]);

const regionOrder = [
  'west_north','west_south','iberia_north','iberia_south',
  'empire_rhine','empire_alps','italy_north','italy_south',
  'britain_south','britain_north_ireland','nordic_baltic',
  'central_danube','rus_steppe','balkans','anatolia_caucasus',
  'syria_palestine','jazira','egypt','arabia','iran_iraq',
  'eastern_edge','maghreb','horn_sahel'
];

test('1096 composes every physical county and court once with valid detached references',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (order) {
    const b = FB.bookmark('1096'), geography = FB.geography(b.geography);
    const ids = b.provinces.map(function (p) { return p.id; });
    const realmIds = b.realms.map(function (r) { return r.id; });
    const expected = [], faults = [], counties = {}, realms = {};
    const layout = FBDATA.settlementLayouts[b.settlementLayout];
    b.provinces.forEach(function (p) { counties[p.id] = p; });
    b.realms.forEach(function (r) { realms[r.id] = r; });
    order.forEach(function (key) {
      const block = FBDATA.bookmarkRegions1096[key];
      block.provinces.forEach(function (p) {
        expected.push(p.id);
        if (counties[p.id] === p || p.communities && counties[p.id].communities === p.communities)
          faults.push('shared county '+p.id);
      });
      block.realms.forEach(function (r) {
        if (realms[r.id] === r || realms[r.id].ruler === r.ruler) faults.push('shared court '+r.id);
      });
      const staged = block.layouts || block.settlementLayouts;
      Object.keys(staged).forEach(function (id) {
        if (JSON.stringify(staged[id]) !== JSON.stringify(layout[id]) || staged[id] === layout[id])
          faults.push('layout '+id);
      });
    });
    return {faults:faults,validation:FB.validateBookmark(b),religions:FB.validateReligionData(null),
      ids:ids,expected:expected,physical:geography.provinces.map(function (p) { return p.id; }),
      count:ids.length,uniqueCount:new Set(ids).size,courts:realmIds.length,uniqueCourts:new Set(realmIds).size,
      inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
      date:b.date,era:b.era,geography:b.geography,revision:b.revision,
      identities:Object.keys(FBDATA.bookmarkReligions1096).every(function (id) {
        return FBDATA.religions[id] !== FBDATA.bookmarkReligions1096[id] &&
          FB.faithHistoricalAvailable(id,b,'community') && !FB.faithHistoricalAvailable(id,FB.bookmark('1066'),'community');
      }),
      owners:['verdun','liege','toulouse','constantinople','nicaea','jerusalem','mainz'].map(function (id) {
        return [id,counties[id].realm];
      }),
      starts:b.startLocations,stories:b.stories,opening:b.opening};
  },regionOrder);
  expect(result.faults).toEqual([]);
  expect(result.validation).toEqual([]);
  expect(result.religions).toEqual([]);
  expect(result.ids).toEqual(result.expected);
  expect(result.ids.slice().sort()).toEqual(result.physical.sort());
  expect([result.count,result.uniqueCount,result.courts,result.uniqueCourts,result.inhabited]).toEqual([527,527,110,110,488]);
  expect([result.date,result.era,result.geography,result.revision,result.identities]).toEqual([
    {year:1096,season:0,day:1},'high_medieval','europe_regional_2','baseline',true
  ]);
  expect(result.owners).toEqual([
    ['verdun','lower_lotharingia_1096'],['liege','hre_1096'],['toulouse','toulouse_1096'],
    ['constantinople','byzantium_1096'],['nicaea','rum_1096'],['jerusalem','jerusalem_1096'],['mainz','hre_1096']
  ]);
  expect(result.starts).toEqual({});
  expect(result.stories).toEqual([]);
  expect(result.opening).toEqual({actors:{},appointments:{},estates:[],claims:[],migrations:[]});
});

test('1096 preserves released definitions and rejects malformed worlds without mutation',async function ({page},info) {
  await openGame(page,info);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
  expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['county','court','capital','faith'].map(function (kind) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('1096')));
      if (kind === 'county') b.provinces.push(JSON.parse(JSON.stringify(b.provinces[0])));
      if (kind === 'court') b.realms.push(JSON.parse(JSON.stringify(b.realms[0])));
      if (kind === 'capital') b.realms[0].capital = 'absent_county_1096';
      if (kind === 'faith') b.provinces[0].religion = 'ghana_local_practice_1066';
      return FB.validateBookmark(b).length > 0;
    });
    return {rejected:rejected,pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:[true,true,true,true],pure:true});
});

test('1096 stays hidden through picker, start code, direct creation and observation',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1096').hidden,offered:FB.bookmarks().some(function (b) { return b.id === '1096'; }),
      inspectable:FB.bookmarks(true).some(function (b) { return b.id === '1096'; })};
  })).toEqual({hidden:true,offered:false,inspectable:true});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist')).not.toContainText('The First Crusade');
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW1096-1096-farmer-cologne-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await page.locator('#ng-cancel').click();
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1096',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'1096',seed:'REVIEW1096',provinceId:'cologne',
      scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; })};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return {start:FB.game.start(),observe:FB.game.startObserve(),
      unchanged:state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({start:false,observe:false,unchanged:true});
});

test('a seeded 1096 household replays and restores its hidden world across bookmark activation',async function ({page},info) {
  await beginBookmark(page,info,'1096','farmer');
  const checkpoint = await page.evaluate(function () { return FB.save.serialize(); });
  const original = await facts(page);
  expect(original.campaign.start.id).toBe('1096');
  expect(original.campaign.date).toEqual({year:1096,season:0,day:1});
  await beginBookmark(page,info,'1096','farmer');
  await page.evaluate(function () { FB.save.serialize(); });
  expect(await facts(page)).toEqual(original);
  await page.evaluate(function () {
    FBDATA.bookmarks['1096'].hidden = true;
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1066',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await restoreBookmark(page,checkpoint);
  expect(await facts(page)).toEqual(original);
  expect(await page.evaluate(function () {
    return {active:FB.activeBookmarkId,hidden:FB.bookmark('1096').hidden,offered:FB.bookmarkAvailable('1096')};
  })).toEqual({active:'1096',hidden:true,offered:false});
});
