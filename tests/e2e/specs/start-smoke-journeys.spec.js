'use strict';
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { beginBookmark, advanceBookmark, restoreBookmark, facts } = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename, [
  'index.html', 'data/starts.js', 'data/bookmarks.js', 'data/bookmark_476.js', 'data/bookmark_476_wider.js',
  'data/bookmark_711.js', 'data/bookmark_711_terrain.js', 'data/bookmark_800.js',
  'data/bookmark_800_expansion.js', 'data/bookmark_1204.js', 'data/bookmark_1204_terrain.js',
  'data/communal_revisions.js', 'js/starts.js', 'js/main.js', 'js/save.js', 'js/save_v4.js', 'js/world.js'
]);

/* Release gate (wave 19): every offered start that no other journey begins
   completes a short smoke journey. Each starts through the shared start-code
   path, crosses a bounded natural span with invariants checked, and replays
   identically from a mid-journey save. Fixed-place households must begin in
   their declared county and community. */
const JOURNEYS = [
  { bookmark:'476', scenario:'craftsman_476' },
  { bookmark:'476', scenario:'cleric_476' },
  { bookmark:'711', scenario:'toledo_household_711', county:'toledo', culture:'hispano_roman', religion:'catholic' },
  { bookmark:'800', scenario:'aachen_household_800', county:'aachen', culture:'frankish', religion:'catholic' },
  { bookmark:'1204', scenario:'constantinople_household_1204', county:'constantinople', culture:'greek', religion:'orthodox' }
];

for (const journey of JOURNEYS) {
  test(journey.bookmark + ' ' + journey.scenario + ' completes its smoke journey and replays from a save',
    async function ({ page }, testInfo) {
      await beginBookmark(page, testInfo, journey.bookmark, journey.scenario);
      const opening = await page.evaluate(function () {
        const s = FB.state, me = s.chars[s.player.charId];
        return { scenario:s.start.scenario || null, county:s.player.provinceId,
          culture:me.culture, religion:me.religion, alive:!me.dead };
      });
      expect(opening.alive).toBe(true);
      if (journey.county) {
        expect(opening).toMatchObject({ county:journey.county, culture:journey.culture, religion:journey.religion });
      }
      await advanceBookmark(page, 10);
      const source = await page.evaluate(function () { return FB.save.serialize(); });
      await advanceBookmark(page, 8);
      const finish = await facts(page);
      await restoreBookmark(page, source);
      await advanceBookmark(page, 8);
      expect(await facts(page)).toEqual(finish);
    });
}
