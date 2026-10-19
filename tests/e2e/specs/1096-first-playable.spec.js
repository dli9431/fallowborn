'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {beginBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/identities_1096.js','data/institutions_1096.js','js/bookmark_setup.js',
  'data/bookmark_1096_campaigns.js','data/story_household_effects_1096.js','data/story_world_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/bookmarks.js','data/bookmark_1066_inhabited.js','data/map_data.js',
  'data/counties.js','data/geographies.js','data/geography_expansion.js',
  'data/cultures.js','data/eras.js','data/starts.js','data/settlements.js',
  'data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js',
  'data/starts_antioch_1096.js','data/story_antioch_1096.js',
  'data/starts_western_rulers_1096.js','data/story_western_rulers_1096.js',
  'js/stories.js','js/story_household.js','js/story_opening_goals.js',
  'data/settlements_real.js','data/government_rollout.js','data/ecclesiastical_profiles.js',
  'js/world.js','js/model.js','js/starts.js','js/main.js','js/save.js','js/save_v4.js',
  'js/ui_misc.js','js/ui_modals.js'
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
      openingCatalogue:[Object.keys(b.openingRevisions||{}),JSON.stringify((b.openingRevisions||{})[b.openingRevision])===JSON.stringify(b.opening),b.openingLegacyRevision],
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
  expect(result.openingCatalogue).toEqual([['baseline'],true,'baseline']);
  expect(result.religions).toEqual([]);
  expect(result.ids).toEqual(result.expected);
  expect(result.ids.slice().sort()).toEqual(result.physical.sort());
  expect([result.count,result.uniqueCount,result.courts,result.uniqueCourts,result.inhabited]).toEqual([527,527,112,112,488]);
  expect([result.date,result.era,result.geography,result.revision,result.identities]).toEqual([
    {year:1096,season:0,day:1},'high_medieval','europe_regional_2','baseline',true
  ]);
  expect(result.owners).toEqual([
    ['verdun','lower_lotharingia_1096'],['liege','hre_1096'],['toulouse','toulouse_1096'],
    ['constantinople','byzantium_1096'],['nicaea','rum_1096'],['jerusalem','jerusalem_1096'],['mainz','hre_1096']
  ]);
  expect(result.starts.pilgrim_household_1096).toEqual(['cologne']);
  expect(result.stories).toEqual(['eastern_undertaking_1096','eastern_undertaking_households_1096']);
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

test('1096 offers its pilgrim household, authored ruler starts and ordinary roles',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return {hidden:FB.bookmark('1096').hidden === true,available:FB.bookmarkAvailable('1096'),
      offered:FB.bookmarks().some(function (b) { return b.id === '1096'; })};
  })).toEqual({hidden:false,available:true,offered:true});
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist [data-bookmark="1096"]')).toContainText('The First Crusade');
  await page.locator('#bookmarklist [data-bookmark="1096"]').press('Enter');
  await expect(page.locator('#ng-heading')).toHaveText('Choose Your Beginning in 1096 AD');
  expect(await page.evaluate(function () { return FB.activeBookmarkId; })).toBe('1096');
  for (const id of ['serf','farmer','apprentice','pilgrim_household_1096','godfrey_1096','raymond_1096'])
    await expect(page.locator('#scenariolist [data-scenario="' + id + '"]')).toBeVisible();
  const pilgrim = page.locator('#scenariolist [data-scenario="pilgrim_household_1096"]');
  await expect(pilgrim).not.toHaveAttribute('aria-disabled','true');
  await expect(page.locator('#scenariolist [data-scenario="yaghi_siyan_1096"]')).toBeVisible();
  expect(await page.evaluate(function () {
    return FBDATA.startScenarios.filter(function (sc) {
      return sc.bookmarkIds && sc.bookmarkIds.indexOf('1096') >= 0 && !sc.hidden;
    }).map(function (sc) { return sc.id; });
  })).toEqual(expect.arrayContaining(['pilgrim_household_1096','yaghi_siyan_1096','godfrey_1096','raymond_1096']));
  await pilgrim.press('Enter');
  await expect(page.locator('#pickprov:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    const pending = FB.game.pending;
    return {scenario:pending.scenario.id,allowed:FB.startProvinceAllowed(pending.scenario,FB.activeBookmark,'cologne'),
      elsewhere:FB.startProvinceAllowed(pending.scenario,FB.activeBookmark,'mainz'),state:FB.state};
  })).toEqual({scenario:'pilgrim_household_1096',allowed:true,elsewhere:false,state:null});
});

for (const scenario of ['serf','pilgrim_household_1096']) {
  test('1096 ' + scenario + ' starts from an ordinary code without changing visibility',async function ({page},info) {
    await openGame(page,info);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    const family = scenario === 'pilgrim_household_1096' ? 'established' : 'standard';
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('VISIBLE1096-1096-' + scenario + '-cologne-m-Review-' + family);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () { return FB.state; })).toBeNull();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      FB.game.setPaused(true);
      const s = FB.state, c = s.chars[s.player.charId];
      return {bookmark:s.start.id,hidden:FB.bookmark('1096').hidden === true,home:s.player.provinceId,
        identity:[c.culture,c.religion],pilgrim:!!s.stories.pilgrim_household_track_1096,
        goals:!!s.stories.opening_pilgrim_1096};
    })).toEqual({bookmark:'1096',hidden:false,home:'cologne',identity:['german','catholic'],
      pilgrim:scenario === 'pilgrim_household_1096',goals:scenario === 'pilgrim_household_1096'});
  });
}

test('a seeded 1096 household replays and restores after its world is hidden across bookmark activation',async function ({page},info) {
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
