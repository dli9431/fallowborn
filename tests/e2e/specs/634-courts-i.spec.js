'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634_courts_i.js','data/bookmark_634.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_634_identities.js','data/starts_634_ordinary.js',
  'data/political_institutions.js','data/bookmark_sources.js','data/assembly_polities.js',
  'js/government_support.js','js/government_assembly.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/bookmark_setup.js',
  'js/model.js','js/world.js','js/governments.js','js/mods.js','js/main.js',
  'js/save.js','js/save_v4.js','js/crazygames.js','data/distribution_crazygames.js'
]);

const ids = ["northern_gulf_634", "jylland_634", "danish_islands_634", "scania_634", "morava_634", "bohemian_634"];
const capitals = ['norrland','arhus','roskilde','lund','veligrad','praha'];

async function loadCourts(page) {
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_634_courts_i.js')});
}

function activeSnapshot() {
  const data = Object.assign({},FBDATA);
  delete data.bookmarkRevisionContent_634_courts_i;
  return JSON.stringify({data:data,state:FB.state,
    rng:FB.getRngState(),uid:FB.getUidCounter()});
}

for (const crazy of [false,true]) {
  test('court batch i is inert and preserves its exact generated allocation on ' +
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
      return Object.prototype.hasOwnProperty.call(FBDATA,'bookmarkRevisionContent_634_courts_i');
    })).toBe(false);
    const before = await page.evaluate(activeSnapshot);
    await loadCourts(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    const first = await page.evaluate(function () { return FBDATA.bookmarkRevisionContent_634_courts_i; });
    await loadCourts(page);
    expect(await page.evaluate(activeSnapshot)).toBe(before);
    expect(await page.evaluate(function () { return FBDATA.bookmarkRevisionContent_634_courts_i; })).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(['bookmarkId','realms','revision']);
    expect(first.bookmarkId).toBe('634');
    expect(first.revision).toBe('baseline');
    expect(first.realms.map(function (r) { return r.id; })).toEqual(ids);
    first.realms.forEach(function (r,i) {
      expect(r.capital).toBe(capitals[i]);
      expect(r.religion).toBe(i === 0 ? 'finnic_traditional_476' : 'germanic_pagan');
      expect(r.government).toBe(i === 0 ? 'assembly_polity' : 'regnum');
      expect(r.rank).toBe(1);
      expect(r.liege).toBe(undefined);
      expect(r.royalCourt).toBeUndefined();
      if (i === 0) {
        expect(r.ruler).toBeUndefined();
        expect(r.constituency).toBe('settlement_federation');
        expect(r.representative).toEqual({sex:'m',born:599,skills:{dip:5,ste:5,mar:4}});
      } else {
        expect(r.ruler).toEqual({generated:true,sex:'m',culture:i < 4 ? 'norse' : 'elbegermanic_476',
          born:599,mar:7,trait:'patient'});
        expect(r.constituency).toBeUndefined();
      }
    });
    const composition = await page.evaluate(function (ids) {
      const rows = FBDATA.bookmarkRevisionContent_634_courts_i.realms;
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
    expect(composition).toEqual({owners:[['b15'],['b15'],['b16'],['b16'],['b16'],['b16']],
      counts:[1,1,1,1,1,1],unchanged:true,errors:[],rejected:[true,true],pure:true});
  });
}

test('complete court batch i replacement imports and retains generated families on repeated restore',async function ({page},info) {
  await openGame(page,info);
  await prepareGameContent(page);
  await loadCourts(page);
  const payload = await page.evaluate(function () {
    const rows = FBDATA.bookmarkRevisionContent_634_courts_i.realms;
    const raw = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    const current = FB.bookmark('634');
    // A complete effective revision keeps the other courts and every county.
    raw.revisions[raw.revision].realms = current.realms.map(function (r) {
      return rows.find(function (row) { return row.id === r.id; }) || r;
    });
    return JSON.stringify({name:'634 court composition review',bookmarks:{'634':raw}});
  });
  await Promise.all([
    page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.evaluate(function (payload) {
      if (FB.mods.store(payload) === false) throw new Error('Complete court composition rejected');
      if (JSON.parse(localStorage.getItem('fb_mods') || '[]').indexOf(payload) < 0)
        throw new Error('Complete court composition was not stored');
    },payload)
  ]);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  function courtFacts(ids) {
    const s = FB.state, b = FB.campaignBookmark(s);
    return {errors:FB.validateBookmark(b),valid:FB.save.v4.validatePlatform(s),
      rows:ids.map(function (id) {
        const r = b.realms.find(function (r) { return r.id === id; });
        const ruler = r.constituency ? FB.governments.support.delegate(s,id) : FB.realmRulerCharacter(s,id);
        return {id:id,faith:s.realms[id].religion,rulerFaith:ruler.religion,
          culture:ruler.culture,capitalOwner:s.owner[r.capital],family:FB.realmFamilySnapshot(s,id),
          principalId:ruler.id,born:ruler.born,
          support:FB.governments.support.row(s,id),
          authored:FB.authoredRoyalMemberSnapshot(s,id,'ruler')};
      })};
  }
  const before = await page.evaluate(courtFacts,ids);
  expect(before.errors).toEqual([]);
  expect(before.valid).toBe(true);
  before.rows.forEach(function (r,i) {
    expect(r.faith).toBe(i === 0 ? 'finnic_traditional_476' : 'germanic_pagan');
    expect(r.rulerFaith).toBe(r.faith);
    expect(r.culture).toBe(i === 0 ? 'sami' : i < 4 ? 'norse' : 'elbegermanic_476');
    expect(r.born).toBe(599);
    if (i === 0) {
      expect(r.support.profileId).toBe('settlement_federation');
      expect(r.support.scopes).toEqual(['norrland']);
    } else expect(r.support).toBeNull();
    expect(r.capitalOwner).toBe(ids[i]);
    if (i > 0) expect(r.family).toBeTruthy();
    expect(r.authored).toBeNull();
  });
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  for (let attempt = 0; attempt < 2; attempt++) {
    await restoreBookmark(page,saved);
    expect(await page.evaluate(courtFacts,ids)).toEqual(before);
  }
});
