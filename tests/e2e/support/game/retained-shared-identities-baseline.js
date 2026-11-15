'use strict';
const {test,expect} = require('../fixture');
const {prepareGameContent} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const {fixtures,importOverlay,currentPage,load,retention,
  prepareConfiguration,preparedJourney} = require('./retained-shared-identities-world');

function registerBaselineCases(fixture) {
  test.describe(fixture.bookmark.id,function () {
    const prepared=prepareConfiguration(fixture,{unaffected:true,validation:true});
    const getOld=prepared.old,getVariants=prepared.variants;
    let old,resaved;
    test.beforeAll(async function () {old=getOld();resaved=prepared.resaved();});
    test('proves the actual predecessor signature and retains spent resources through Continue',async function ({page},info) {
      expect(old.save.mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
      await currentPage(page,fixture,null,info,old);
      expect(await page.evaluate(function () { return window.__nativeGuards; })).toEqual({rejections:2,called:false});
      const proof = await page.evaluate(function (data) {
        var text = JSON.stringify(data), root = FBDATA, state = FB.state, world = FB.world, registry = FB.stories.list(),
          before = JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()]);
        var result = FB.mods.saveCompatibility(data), migrated = FB.save.v4.migrate(data);
        return {result:result,other:FB.save.otherWorld(data),different:data.mods !== FB.mods.sig(),
          envelope:JSON.stringify(data) === text && migrated.mods === data.mods,
          pure:root === FBDATA && state === FB.state && world === FB.world && registry.every(function (row,i) { return row === FB.stories.list()[i]; }) &&
            before === JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()])};
      },old.save);
      expect(proof).toEqual({result:{compatible:true,path:null,transition:fixture.bookmark.id + '_transition'},other:false,different:true,envelope:true,pure:true});
      await page.locator('#btn-continue').click();
      await page.waitForFunction(function (id) { return FB.state && FB.state.start.id === id; },fixture.bookmark.id);
      expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,current:fixture.addedRevision,
        retained:fixture.retainedRevision,freshPolicy:'protected',stored:old.configuration});
    });
    test('normally re-saves the retained life and loads it on a fresh page under the same configuration',async function ({page},info) {
      await currentPage(page,fixture,null,info,old);
      await load(page,resaved);
      expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },resaved)).toEqual({compatible:true,path:null,transition:null});
      expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
    });
    test('slot selection and file import finish the retained load without altering its original envelope',async function ({page},info) {
      await currentPage(page,fixture,null,info,old);
      await page.evaluate(function () {
        var original = FB.game.loadData;
        window.__finishedLoads = 0;
        FB.game.loadData = function (data,after,rollback) {
          return original(data,function () { window.__finishedLoads++; if (after) after(); },rollback);
        };
      });
      await page.evaluate(function () { FB.ui.showSaveLoad(false); });
      await page.locator('[data-slot="1"]').click();
      await page.waitForFunction(function () { return window.__finishedLoads === 1; });
      expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
      await page.evaluate(function () { FB.ui.showSaveLoad(false); });
      await page.locator('#sl-import').click();
      const exportText = 'FBS1.' + Buffer.from(JSON.stringify(old.save),'utf8').toString('base64');
      await page.locator('#sl-ifile').setInputFiles({name:'retained-life.txt',mimeType:'text/plain',buffer:Buffer.from(exportText)});
      await page.locator('#sl-ifileload').click();
      await page.waitForFunction(function () { return window.__finishedLoads === 2; });
      expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
    });
    preparedJourney('imports revision identities as ordinary JSON with current signatures',fixture,getOld,async function (page) {
      const old=getOld();
      expect(await page.evaluate(function (save) {return FB.mods.saveCompatibility(save).compatible;},old.save)).toBe(false);
      await beginBookmarkFromTitle(page,fixture.bookmark.id,fixture.start.id);
      const fresh=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
      expect(fresh.state.chars[fresh.state.player.charId].religion).toBe(fixture.currentStart.startReligion);
      await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,fresh);
      expect(await page.evaluate(function () {return FB.campaignStart(FB.state).startReligion;})).toBe(fixture.currentStart.startReligion);
    },async function (page) {
      await importOverlay(page,fixture===fixtures[0]?'estuary-projection.json':'upland-projection.json');
    });

    preparedJourney('preserves an unrelated-date modded predecessor through re-save and reload',fixture,getOld,async function (page) {
      const old=getOld(),save=getVariants().unaffected;
      await load(page,save);
      const next=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
      for(const field of ['start','chars','player','population','stories','authority'])expect(next.state[field]).toEqual(save.state[field]);
      expect(next.rng>>>0).toBe(save.rng>>>0);expect(next.uid).toBe(save.uid);expect(next.mods).not.toBe(save.mods);
      await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,next);
      expect(await page.evaluate(function () {return FB.state.start.id;})).toBe('867');
    });

    if(fixture===fixtures[0])test('restores an unstamped baseline without adopting the fresh faith',async function ({page},info) {
      const old=getOld(),legacy=JSON.parse(JSON.stringify(old.save));delete legacy.state.start.revision;
      await currentPage(page,fixture,null,info,old);
      expect(await page.evaluate(function (save) { return FB.save.isSupported(save); },legacy)).toBe(false);
      legacy.platformSchema=1;
      await load(page,legacy);
      expect(await page.evaluate(function (save) {
        var actual=JSON.parse(FB.save.serialize());
        return {revision:actual.state.start.revision,identity:FB.campaignStart(FB.state).startReligion,
          people:JSON.stringify(actual.state.chars)===JSON.stringify(save.state.chars),population:JSON.stringify(actual.state.population)===JSON.stringify(save.state.population),
          rng:(actual.rng>>>0)===(save.rng>>>0),uid:actual.uid===save.uid};
      },old.save)).toEqual({revision:'baseline',identity:fixture.start.startReligion,people:true,population:true,rng:true,uid:true});
    });
  });
}

module.exports = {registerBaselineCases};
