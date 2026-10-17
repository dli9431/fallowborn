'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/starts.js','data/starts_568.js','data/bookmark_568.js',
  'data/bookmark_568_identities.js','data/bookmark_568_scaffold_a.js',
  'data/bookmark_568_scaffold_b.js','data/bookmark_568_scaffold_c.js',
  'data/bookmark_568_scaffold_d.js','js/main.js','js/starts.js','js/world.js',
  'js/stories.js','js/ui_misc.js','js/ui_modals.js'
]);

const START = 'lombard_migrant_household_568';
const CODE = 'MIGRANT568-568-' + START + '-moson-m-Review-established';

for (const review of [false,true]) {
  test('the held 568 migrant household rejects picker, codes and creation with review ' + review,
    async function ({page},testInfo) {
      await openGame(page,testInfo);
      expect(await page.evaluate(function (input) {
        // Open only the date in this isolated context, so a hidden bookmark
        // cannot mask an accidentally published household.
        FBDATA.bookmarks['568'].hidden = false;
        FBDATA.reviewOpenStarts = input.review;
        FB.startProgression.noteTier(3);
        const b = FB.bookmark('568');
        return {available:FB.bookmarkAvailable('568'),
          declared:FBDATA.startScenarios.some(function (sc) { return sc.id === input.id; }),
          locations:Object.prototype.hasOwnProperty.call(b.startLocations,input.id)};
      },{review:review,id:START})).toEqual({available:true,declared:false,locations:false});

      const full = page.locator('#btn-choose-beginning');
      if (await full.isVisible()) await full.click();
      else await page.getByRole('button',{name:'New Game',exact:true}).click();
      await page.locator('#bookmarklist [data-bookmark="568"]').click();
      await expect(page.locator('#scenariolist [data-scenario="farmer_568"]')).toBeVisible();
      await expect(page.locator('#scenariolist [data-scenario="' + START + '"]')).toHaveCount(0);

      await page.locator('#btn-ng-back').click();
      await page.locator('#btn-bm-seed').click();
      await page.locator('#ng-seed').fill(CODE);
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#ng-seed-err')).not.toBeEmpty();
      await expect(page.locator('#ng-seed-err')).not.toContainText('hidden for new campaigns');
      await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
      await page.locator('#ng-cancel').click();

      expect(await page.evaluate(function (id) {
        FB.game.pending = {bookmarkId:'568',seed:'MIGRANT568',provinceId:'moson',
          scenario:FBDATA.startScenarios.find(function (sc) { return sc.id === id; })};
        const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
        return {active:FB.activeBookmark.id,started:FB.game.start(),
          unchanged:FB.state === state && FB.getRngState() === rng && FB.getUidCounter() === uid};
      },START)).toEqual({active:'568',started:false,unchanged:true});
    });
}
