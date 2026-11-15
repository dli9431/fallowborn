'use strict';
const {test,expect} = require('../support/fixture');
const {openTitle} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {fixtures,predecessorSave,installSource,load,retention} = require('../support/game/retained-shared-identities-world');

dependsOnRuntime(__filename,['index.html','js/mods.js','js/save.js','js/save_v4.js','js/main.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/title_ids.js',
  'js/stories.js','js/starts.js','js/balance.js','js/settlement.js','js/population.js',
  'js/ui_modals.js','js/model.js','js/justice.js','js/story_household.js','js/crazygames.js','data/bookmark_sources.js','data/bookmarks.js',
  'data/geographies.js','data/starts.js','data/eras.js','data/cultures.js','data/map_data.js','data/distribution_crazygames.js']);

test('unchanged modded controls and empty standard signatures need no transition, and failed selected-source switches roll back',async function ({page},info) {
  const fixture = fixtures[0], old = await predecessorSave(page,info,fixture,false);
  expect(old.save.mods).toBe('');
  await installSource(page,fixture,{phase:'current',roots:old.roots});
  await openTitle(page,info);
  // Start an unrelated selected-source session without full publication.
  await startDeterministicGame(page);
  await page.evaluate(function (save) {
    FB.game.setPaused(true); FB.ui.closeModal(); FB.save.serialize();
    window.__priorLife = FB.state; window.__priorData = FBDATA; window.__priorWorld = FB.world;
    window.__before = JSON.stringify([FBDATA,FB.state,FB.englishMessages(),FB.stories.list(),FB.getRngState(),FB.getUidCounter()]);
    window.__stored = JSON.stringify(localStorage);
    FB.game.loadData(Object.assign({},save,{mods:'wrong-content-signature'}));
  },old.save);
  await expect(page.locator('#genmodal:not(.hidden)')).toContainText('modded world');
  expect(await page.evaluate(function () {
    return {same:FB.state === window.__priorLife && FBDATA === window.__priorData && FB.world === window.__priorWorld,
      pure:window.__before === JSON.stringify([FBDATA,FB.state,FB.englishMessages(),FB.stories.list(),FB.getRngState(),FB.getUidCounter()]),
      storage:window.__stored === JSON.stringify(localStorage),setup:FB.bookmarkSources.setupId(),ready:FB.game.campaignReady('867'),declarations:FB.bookmarkSources.retainedCatalogueTransitions().filter(function (row) { return row.bookmarkId === 'estuary_world'; }).length};
  })).toEqual({same:true,pure:true,storage:true,setup:'867',ready:true,declarations:1});
  await page.evaluate(function () { FB.ui.closeModal(); });
  await load(page,old.save);
  expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,retained:'baseline',mods:''});
  expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:true,path:null,transition:null});
});
