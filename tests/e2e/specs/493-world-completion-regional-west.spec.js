'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {startParityGame} = require('../support/game/parity');
const {saveBudget} = require('../support/game/476-wider');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_493_history.js',
  'data/geography_expansion.js','data/starts.js','data/story_instances.js',
  'js/bookmark_setup.js','js/main.js','js/world.js','js/model.js','js/population.js','js/save.js','js/save_v4.js'
]);

// Each county starts and restores its own campaign using the default deadline.
test.describe.configure({mode:'parallel'});

for (const county of ['alexandria','erfurt','tara','turku','kiev','jenne_district']) {
  test('493 regional household completes a season at ' + county,async function ({page},testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served','Regional natural-day coverage is bounded to one project.');
    await test.step('Start the expanded household',async function () {
      await startParityGame(page,testInfo,{bookmark:'493',revision:'world_v2',unhide:true,
        code:'WORLD493-493-farmer_493-' + county + '-m-Review-established'});
      await page.evaluate(function () { FBDATA.bookmarks['493'].hidden = true; });
      await injectBrowserHarness(page);
    });
    const midpoint = await test.step('Play 45 days and save the midpoint',async function () {
      await advanceBookmark(page,45);
      const source = await saveBudget(page,testInfo,county+'-midpoint',6*1024*1024);
      return {source:source,before:await facts(page)};
    });
    const after = await test.step('Restore the midpoint and finish the season',async function () {
      await restoreBookmark(page,midpoint.source);
      expect(await facts(page)).toEqual(midpoint.before);
      await advanceBookmark(page,45);
      return facts(page);
    });
    await test.step('Restore the midpoint again and reproduce the continuation',async function () {
      await restoreBookmark(page,midpoint.source);
      await advanceBookmark(page,45);
      expect(await facts(page)).toEqual(after);
    });
  });
}
