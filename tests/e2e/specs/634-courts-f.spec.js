'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_courts_f.js','data/bookmark_634.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_634_identities.js','data/starts_634_ordinary.js',
  'data/political_institutions.js','data/bookmark_sources.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/bookmark_setup.js',
  'js/model.js','js/world.js','js/governments.js','js/mods.js','js/main.js',
  'js/save.js','js/save_v4.js','js/crazygames.js','data/distribution_crazygames.js'
]);

const ids = ['pictish_north_634','ulster_634','midland_irish_634','southeast_irish_634',
  'west_irish_634','munster_634'];
const capitals = ['elgin','ulaid','tara','kilkenny','galway','cashel'];
const faiths = ['insular_traditional_476','nicene','nicene','nicene','nicene','nicene'];
const cultures = ['pictish_476','gaelic','gaelic','gaelic','gaelic','gaelic'];

async function loadCourts(page) {
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_634_courts_f.js')});
}

function activeSnapshot() {
  return JSON.stringify({bookmarks:FBDATA.bookmarks,regions:FBDATA.bookmarkRegions634,
    forms:FBDATA.governmentForms,institutions:FBDATA.localInstitutions,
    starts:FBDATA.startScenarios,stories:FBDATA.storyInstances,state:FB.state,
    rng:FB.getRngState(),uid:FB.getUidCounter()});
}

for (const crazy of [false,true]) {
  test('court batch f is inert and preserves its exact household allocation on ' +
    (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames';
        window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    await prepareGameContent(page);
    expect(await page.evaluate(function () {
      return Object.prototype.hasOwnProperty.call(FBDATA,'bookmarkRevisionContent_634_courts_f');
    })).toBe(false);
    const before = await page.evaluate(activeSnapshot);
    await loadCourts(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    const first = await page.evaluate(function () { return FBDATA.bookmarkRevisionContent_634_courts_f; });
    await loadCourts(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    expect(await page.evaluate(function () { return FBDATA.bookmarkRevisionContent_634_courts_f; })).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(['bookmarkId','realms','revision']);
    expect(first.bookmarkId).toBe('634');
    expect(first.revision).toBe('baseline');
    expect(first.realms.map(function (r) { return r.id; })).toEqual(ids);
    first.realms.forEach(function (r,i) {
      expect(r.capital).toBe(capitals[i]);
      expect(r.religion).toBe(faiths[i]);
      expect(r.government).toBe('regnum');
      expect(r.rank).toBe(1);
      expect(r.liege).toBeUndefined();
      expect(r.royalCourt).toBeUndefined();
      expect(r.ruler).toEqual({generated:true,sex:'m',culture:cultures[i],born:599,mar:i === 0 ? 7 : 6,trait:'patient'});
    });
    const composition = await page.evaluate(function (ids) {
      const rows = FBDATA.bookmarkRevisionContent_634_courts_f.realms;
      const world = JSON.parse(JSON.stringify(FB.bookmark('634')));
      const original = JSON.parse(JSON.stringify(world));
      const owners = ids.map(function (id) {
        return Object.keys(FBDATA.bookmarkRegions634).filter(function (key) {
          return FBDATA.bookmarkRegions634[key].realms.some(function (r) { return r.id === id; });
        });
      });
      const counts = ids.map(function (id) { return world.realms.filter(function (r) { return r.id === id; }).length; });
      world.realms = world.realms.map(function (r) { return rows.find(function (row) { return row.id === r.id; }) || r; });
      const before = activeSnapshotLocal();
      const errors = FB.validateBookmark(world);
      const duplicate = JSON.parse(JSON.stringify(world));
      duplicate.realms.push(rows[0]);
      const invalid = JSON.parse(JSON.stringify(world));
      invalid.realms.find(function (r) { return r.id === ids[0]; }).capital = 'missing_court_capital';
      const rejected = [FB.validateBookmark(duplicate).length > 0,FB.validateBookmark(invalid).length > 0];
      function activeSnapshotLocal() {
        return JSON.stringify({data:FBDATA.bookmarks,state:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter()});
      }
      return {owners:owners,counts:counts,unchanged:JSON.stringify(world) === JSON.stringify(original),
        errors:errors,rejected:rejected,pure:before === activeSnapshotLocal()};
    },ids);
    expect(composition).toEqual({owners:[['b13'],['b14'],['b14'],['b14'],['b14'],['b14']],
      counts:[1,1,1,1,1,1],unchanged:true,errors:[],rejected:[true,true],pure:true});
  });
}

test('complete court batch f replacement imports and retains household identities and boundaries on repeated restore',async function ({page},info) {
  await openGame(page,info);
  await prepareGameContent(page);
  await loadCourts(page);
  const payload = await page.evaluate(function () {
    const rows = FBDATA.bookmarkRevisionContent_634_courts_f.realms;
    const raw = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    const current = FB.bookmark('634');
    // A complete effective revision keeps the other courts and every county.
    raw.revisions[raw.revision].realms = current.realms.map(function (r) {
      return rows.find(function (row) { return row.id === r.id; }) || r;
    });
    return JSON.stringify({name:'634 court composition review',bookmarks:{'634':raw}});
  });
  expect(await page.evaluate(function (payload) { return FB.mods.validate(JSON.parse(payload)); },payload)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'northern-and-irish-courts.json',mimeType:'application/json',
    buffer:Buffer.from(payload,'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function () { return FB.mods.count(); })).toBe(1);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  function courtFacts(ids) {
    const s = FB.state, b = FB.campaignBookmark(s);
    return {errors:FB.validateBookmark(b),valid:FB.save.v4.validatePlatform(s),
      rng:FB.getRngState() >>> 0,uid:FB.getUidCounter(),
      counties:b.provinces.filter(function (p) { return ids.indexOf(p.realm) >= 0; })
        .map(function (p) { return [p.id,p.realm,s.holder[p.id],s.owner[p.id],p.religion,p.communities]; }),
      rows:ids.map(function (id) {
        const r = b.realms.find(function (r) { return r.id === id; });
        const ruler = FB.realmRulerCharacter(s,id);
        return {id:id,faith:s.realms[id].religion,rulerFaith:ruler.religion,
          culture:ruler.culture,capitalOwner:s.owner[r.capital],capitalHolder:s.holder[r.capital],family:FB.realmFamilySnapshot(s,id)};
      })};
  }
  const before = await page.evaluate(courtFacts,ids);
  expect(before.errors).toEqual([]);
  expect(before.valid).toBe(true);
  before.rows.forEach(function (r,i) {
    expect(r.faith).toBe(faiths[i]);
    expect(r.rulerFaith).toBe(faiths[i]);
    expect(r.culture).toBe(cultures[i]);
    expect(r.capitalOwner).toBe(ids[i]);
    expect(r.capitalHolder).toBe(ids[i]);
    expect(r.family).toBeTruthy();
  });
  expect(before.counties.map(function (p) { return p[0]; }).sort()).toEqual([
    'cashel','cork','dublin','elgin','galway','inverness','kilkenny','limerick',
    'roscommon','tara','tir_eoghain','tuam','ulaid','wexford'
  ]);
  before.counties.forEach(function (p) {
    expect(p[2]).toBe(p[1]);
    expect(p[3]).toBe(p[1]);
    expect(p[4]).toBe('insular_traditional_476');
    expect(p[5]).toEqual(p[1] === ids[0]
      ? [{culture:'pictish_476',religion:'insular_traditional_476',populationShare0:10000}]
      : [{culture:'gaelic',religion:'insular_traditional_476',populationShare0:7500},
        {culture:'gaelic',religion:'nicene',populationShare0:2500,paired:true}]);
  });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await restoreBookmark(page,saved);
    expect(await page.evaluate(courtFacts,ids)).toEqual(before);
  }
});
