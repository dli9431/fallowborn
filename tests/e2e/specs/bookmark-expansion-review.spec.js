'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');

dependsOnRuntime(__filename,[
  'index.html','data/bookmarks.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/bookmark_711.js','data/bookmark_711_terrain.js','data/bookmark_800.js','data/bookmark_800_expansion.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js','data/bookmark_1204.js','data/bookmark_1204_terrain.js',
  'data/government_rollout.js','data/geography_expansion.js','data/cultures.js','data/political_institutions.js',
  'data/bookmark_476_wider_identities.js','data/starts.js','data/eras.js','data/systems.js',
  'js/world.js','js/main.js','js/starts.js','js/mods.js','js/title_ids.js','js/governments.js',
  'js/systems.js','js/save.js','js/save_v4.js','js/crazygames.js','data/distribution_crazygames.js'
]);

for (const id of ['867','1066']) for (const flag of [false,true]) {
  test(id + ' ordinary new games keep the retained opening, distribution ' + flag,async function ({page},info) {
    await startHistoricalGame(page,info,{bookmark:id,
      code:'DEFAULTREVIEW-' + id + '-farmer-london-m-Review-established'},flag);
    expect(await page.evaluate(function (id) {
      const b = FB.bookmark(id), s = FB.state;
      return {defaultBookmark:FBDATA.defaultBookmark,revision:b.revision,geography:b.geography,
        counties:b.provinces.length,start:[s.start.id,s.start.revision,s.start.geography],
        preview:FB.bookmark(id,'inhabited_v2_governments_v2').provinces.length,
        absent:!FB.world.byId.kath_district};
    },id)).toEqual({defaultBookmark:'867',revision:'governments_v2',geography:'europe_regional',
      counties:498,start:[id,'governments_v2','europe_regional'],preview:527,absent:true});
  });
}

test('expanded 1066 preserves the existing Seljuk and Makurian governments',async function ({page},info) {
  await page.addInitScript(function () {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks['1066'].revision = 'inhabited_v2_governments_v2';
    },{once:true});
  });
  await startHistoricalGame(page,info,{bookmark:'1066',code:'COURTREVIEW-1066-farmer-qasr_ibrim-m-Review-established'});
  expect(await page.evaluate(function () {
    const s = FB.state, old = FB.bookmark('1066','governments_v2'), b = FB.campaignBookmark(s);
    return {courts:['seljuk_1066','makuria_1066'].map(function (rid) {
      const original = old.realms.find(function (r) { return r.id === rid; });
      const current = b.realms.find(function (r) { return r.id === rid; });
      return {same:JSON.stringify(current) === JSON.stringify(original),
        form:FB.governments.forRealm(s,rid).id,
        systems:['feudal_service','estates','manorial_tenure'].map(function (key) {
          return FB.systemEnabled(s,key,{realm:rid});
        })};
    }),form:!!FBDATA.governmentForms.district_court_1066,
      office:!!FBDATA.authorityOffices.district_delegate_1066,
      appointments:s.authority.appointments.some(function (a) { return a.officeId === 'district_delegate_1066'; })};
  })).toEqual({courts:[{same:true,form:'territorial',systems:[true,true,true]},
    {same:true,form:'territorial',systems:[true,true,true]}],form:false,office:false,appointments:false});
});

test('all new 493 and 867 counties resolve complete date-owned title hierarchies',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    return [['493','world_v2',FBDATA.bookmarkExpansion493.provinces],
      ['867','inhabited_v2_governments_v2',FBDATA.bookmarkDistricts867]].map(function (row) {
      const b = FB.bookmark(row[0],row[1]);
      return {id:row[0],count:row[2].length,faults:FB.validateBookmark(FBDATA.bookmarks[row[0]]),
        complete:row[2].every(function (p) {
          const county = b.provinces.find(function (c) { return c.id === p.id; });
          const d = b.duchies[county.duchy], k = d && b.kingdoms[d.kingdom];
          return !!county.duchy && !!d && !!d.name && !!k && !!k.name &&
            !!b.empires[k.empire] && !!b.empires[k.empire].name;
        })};
    });
  })).toEqual([{id:'493',count:272,faults:[],complete:true},{id:'867',count:8,faults:[],complete:true}]);
});

test('dated Khwarazm identity and provisional Niger authority remain consistent',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const rows = [['711','terrain_v2_governments_v2','middle_niger_711'],
      ['800','inhabited_v2_governments_v2','jenne_800'],
      ['867','inhabited_v2_governments_v2','jenne_867'],
      ['1066','inhabited_v2_governments_v2','jenne_1066'],
      ['1204','inhabited_v2','jenne_households_1204']];
    const worlds = rows.map(function (row) { return FB.bookmark(row[0],row[1]); });
    const oasis = worlds[0].provinces.find(function (p) { return p.id === 'ghadames_oasis'; });
    return {cultures:worlds.map(function (b) {
      return b.provinces.find(function (p) { return p.id === 'kath_district'; }).culture;
    }),local:worlds.map(function (b,i) {
      const r = b.realms.find(function (r) { return r.id === rows[i][2]; });
      return [r.government,!!r.constituency,!!r.representative];
    }),oasis:oasis.communities.map(function (c) { return [c.religion,c.populationShare0]; }),
      shared:FBDATA.cultures.middle_niger_1066.parent,
      labels:worlds.slice(2).map(function (b,i) {
        return b.realms.find(function (r) { return r.id === rows[i + 2][2]; }).name;
      }),unused:['chorasmian_867','khwarazmian_1066'].map(function (id) {
        return !!FBDATA.cultures[id];
      })};
  })).toEqual({cultures:Array(5).fill('chorasmian'),local:Array(5).fill(['territorial',false,false]),
    oasis:[['umayyad_sunni_711',5000],['catholic',5000]],shared:'sahelian_476',
    labels:Array(3).fill('Jenne-jeno'),unused:[false,false]});
});

for (const revision of ['baseline','inhabited_v2']) {
  test('1204 ' + revision + ' offers an eligible start imported after date loading',async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (revision) {
      FBDATA.bookmarks['1204'].revision = revision;
      const scenario = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; })));
      Object.assign(scenario,{id:'late_mod_farmer',name:'Late mod farmer',bookmarkIds:['1204'],
        fixedProvinceId:'london',startCulture:'english',startReligion:'catholic',alwaysUnlocked:true});
      const mod = {name:'Late start review',startScenarios:[scenario]}, faults = FB.mods.validate(mod);
      if (!faults.length) FB.mods.apply(mod);
      return faults;
    },revision)).toEqual([]);
    const choose = page.locator('#btn-choose-beginning');
    if (await choose.isVisible()) await choose.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#bookmarklist button').filter({hasText:'The Fall of Constantinople'}).click();
    const card = page.locator('#scenariolist button').filter({has:page.getByRole('heading',{name:'Late mod farmer',exact:true})});
    await expect(card).toBeEnabled();
    if (revision === 'baseline') await expect(page.getByRole('heading',{name:'Siwa delegate',exact:true})).toHaveCount(0);
    await card.click();
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function () {
      return [FB.state.start.id,FB.state.start.revision,FB.state.player.provinceId];
    })).toEqual(['1204',revision,'london']);
  });
}
