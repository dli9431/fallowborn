'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {installPageGuards} = require('../support/page-contract');
const {openGame} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
// Committed c251ccd2 source, kept immutable as the pre-conversion oracle.
// It executes only inside the owner's approved browser harness.
const legacy = fs.readFileSync(path.resolve(__dirname,'../fixtures/bookmark-composition/634-before-shared.js'),'utf8');

dependsOnRuntime(__filename,['index.html','data/bookmark_634.js','data/starts_634_ordinary.js',
  'data/bookmark_634_identities.js','data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js','data/starts.js',
  'data/bookmarks.js','data/geographies.js','data/geography_expansion.js','data/cultures.js',
  'data/political_institutions.js','js/bookmark_composition.js','js/main.js','js/mods.js',
  'js/stories.js','js/title_ids.js','js/world.js','js/starts.js','js/bookmark_setup.js',
  'js/model.js','js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js']);

async function catalogue(page) {
  return page.evaluate(function () {
    // The ordinary installer fingerprints every effective authorable root,
    // including ordered start arrays. A name-only mod changes no declaration.
    FB.mods.apply({name:'Composition compatibility'});
    return {signature:FB.mods.sig(),world:FB.mods.fingerprint(FBDATA.bookmarks['634']),
      starts:FBDATA.startScenarios.map(function (start) { return start.id; })};
  });
}

test('shared 634 boot preserves the former catalogue fingerprint and restores an older spent-resource save',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'The legacy source oracle needs served response interception.');
  const oldContext = await browser.newContext(), oldPage = await oldContext.newPage();
  const oldGuard = installPageGuards(oldPage);
  try {
    await oldPage.route('**/data/bookmark_634.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:legacy});
    });
    await openGame(oldPage,info);
    await openGame(page,info);
    expect(await catalogue(page)).toEqual(await catalogue(oldPage));
    await beginBookmarkFromTitle(oldPage,'634','farmer_634');
    await oldPage.evaluate(function () { FB.state.player.gold -= 3; });
    const expected = await facts(oldPage), saved = await oldPage.evaluate(function () { return FB.save.serialize(); });
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); });
      });
    })).toBeNull();
    await restoreBookmark(page,saved);
    expect(await facts(page)).toEqual(expected);
    expect(await page.evaluate(function () {
      return {hidden:FB.bookmark('634').hidden,errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
    })).toEqual({hidden:true,errors:[],valid:true});
  } finally {
    try { expect(oldGuard.faults).toEqual([]); }
    finally { await oldContext.close(); }
  }
});
