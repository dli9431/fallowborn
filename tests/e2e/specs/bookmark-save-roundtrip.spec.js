'use strict';
const {test,expect}=require('../support/fixture');
const {openTitle}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {nativeSourceFiles}=require('../support/game/bookmark-sources-legacy');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','js/main.js','js/save.js','js/save_v4.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/bookmark_setup.js','js/starts.js',
  'js/world.js','js/model.js','js/stories.js','js/mods.js','js/authority.js','js/governments.js',
  'js/mobile_guard.js','js/mobile_command.js','js/mobile_confederations.js','js/mobile_columns.js',
  'js/mobile_camps.js','js/story_expedition_preparation.js','js/ui_modals.js','js/ui_misc.js',
  'data/bookmarks.js','data/starts.js','data/bookmark_sources.js'].concat(nativeSourceFiles));

// Hidden authoring dates use the existing acceptance helper only for creation.
// Reload still enters through the ordinary cold title and saved-date gate.
for (const id of ['476','493','568','634','711','800','867','1066','1096','1204','1241']) {
  test(id+' compact autosave resumes its original world from the cold title',async function ({page},info) {
    await beginBookmark(page,info,id);
    const before=await page.evaluate(function () {
      FB.game.setPaused(true);FB.ui.closeModal();
      return new Promise(function (resolve,reject) {
        FB.save.toSlot('auto',function (ok) {
          if (!ok) {reject(new Error('Save failed'));return;}
          const s=FB.state;
          resolve({facts:JSON.stringify([s.start,s.player.charId,s.bookmarkSetup,s.authority.governments,
            s.authority.migrations,s.armies]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter()});
        });
      });
    });
    await openTitle(page,info);
    expect(await page.evaluate(function () {return FB.game.contentReady;})).toBe(false);
    await page.locator('#btn-continue').click();
    await expect(page.locator('#game:not(.hidden)')).toBeVisible({timeout:30000});
    const after=await page.evaluate(function () {
      FB.game.setPaused(true);
      const s=FB.state;
      return {facts:JSON.stringify([s.start,s.player.charId,s.bookmarkSetup,s.authority.governments,
        s.authority.migrations,s.armies]),rng:FB.getRngState()>>>0,uid:FB.getUidCounter(),
        ready:FB.game.campaignReady(s.start.id),allDates:FB.game.contentReady,
        setup:FB.bookmarkSources.setupId(),valid:FB.save.v4.validatePlatform(s)};
    });
    expect(after).toEqual(Object.assign({},before,{ready:true,allDates:false,setup:id,valid:true}));
  });
}
