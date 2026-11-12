'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['data/bookmark_manifest.js','data/bookmark_634_courts_e.js','data/bookmark_634.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_634_identities.js','data/starts_634_ordinary.js',
  'js/bookmark_composition.js','js/bookmark_sources.js','js/bookmark_setup.js',
  'js/model.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js']);

const sourcePath = path.resolve(__dirname,'../../../data/bookmark_634_courts_e.js');
const ids = ['western_britons_634','powys_634','south_wales_634','northumbria_634',
  'northern_britons_634','pictish_east_634'];
// Read a JSON literal as text, never import or evaluate a game script in Node.
const source = fs.readFileSync(sourcePath,'utf8');
const declaration = JSON.parse(source.slice(source.indexOf(' = ') + 3).trim().replace(/;$/, ''));

function active() {
  const data = Object.assign({},FBDATA);
  delete data.bookmarkRevisionContent_634_courts_e;
  return JSON.stringify({data:data,state:FB.state,rng:FB.getRngState(),uid:FB.getUidCounter()});
}

test('six literal court replacements load inertly and preserve every accepted scaffold field',async function ({page},info) {
  expect(declaration.bookmarkId).toBe('634');
  expect(declaration.revision).toBe('core_identities_v3');
  expect(declaration.realms.map(function (r) { return r.id; })).toEqual(ids);
  expect(fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8')).not.toContain('bookmark_634_courts_e.js');
  await openGame(page,info);
  const before = await page.evaluate(active);
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.addScriptTag({path:sourcePath});
    expect(await page.evaluate(active)).toBe(before);
    expect(await page.evaluate(function () { return FBDATA.bookmarkRevisionContent_634_courts_e; })).toEqual(declaration);
  }
  const rows = await page.evaluate(function (ids) {
    return FB.bookmark('634').realms.filter(function (r) { return ids.indexOf(r.id) >= 0; });
  },ids);
  expect(rows).toEqual(declaration.realms);
  expect(rows.filter(function (r) { return r.ruler.generated; }).length).toBe(5);
  expect(rows[3].ruler).toEqual({sex:'m',name:'Oswald',culture:'saxon_476',born:604,mar:7,trait:'patient'});
  expect(rows[3].royalCourt).toEqual({members:[],spouseId:null});
});

test('complete court replacement composes through JSON import and restores without reseeding',async function ({page},info) {
  await openGame(page,info);
  const freshRealms = await page.evaluate(function () { return FB.bookmark('634').realms; });
  const mod = await page.evaluate(function (declaration) {
    const world = JSON.parse(JSON.stringify(FB.bookmark('634',declaration.revision)));
    const original = JSON.stringify(world.realms.filter(function (row) {
      return !declaration.realms.some(function (r) { return r.id === row.id; });
    }));
    const counts = {};
    declaration.realms.forEach(function (row) { counts[row.id] = 0; });
    world.realms = world.realms.map(function (row) {
      const replacement = declaration.realms.filter(function (r) { return r.id === row.id; })[0];
      if (!replacement) return row;
      counts[row.id]++;
      return replacement;
    });
    if (Object.keys(counts).some(function (id) { return counts[id] !== 1; })) throw new Error('Court ownership must be unique');
    if (JSON.stringify(world.realms.filter(function (row) { return counts[row.id] === undefined; })) !== original)
      throw new Error('Unreviewed court change');
    const complete = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    complete.revisions[declaration.revision].realms = world.realms;
    return {name:'Court replacement review',bookmarks:{'634':complete}};
  },declaration);
  const before = await page.evaluate(active);
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
  expect(await page.evaluate(active)).toBe(before);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'court-replacements.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function () { return FB.mods.count(); })).toBe(1);
  expect(await page.evaluate(function (revision) { return FB.bookmark('634',revision).realms; },declaration.revision))
    .toEqual(mod.bookmarks['634'].revisions[declaration.revision].realms);
  expect(await page.evaluate(function () { return FB.bookmark('634').realms; })).toEqual(freshRealms);
  await page.evaluate(function (revision) { FBDATA.bookmarks['634'].revision = revision; },declaration.revision);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  const facts = await page.evaluate(function (ids) {
    return ids.map(function (id) { return FB.state.realms[id]; });
  },ids);
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function (ids) {
    return ids.map(function (id) { return FB.state.realms[id]; });
  },ids)).toEqual(facts);
});
