'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {startHistoricalGame} = require('../support/game/historical-start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const consumers = require('../fixtures/government-rollout.json');

dependsOnRuntime(__filename,[
  'data/bookmark_1204_terrain.js',
  'index.html','data/government_rollout.js','data/bookmarks.js','data/bookmark_493.js',
  'data/bookmark_493_world.js','data/bookmark_711.js','data/bookmark_711_terrain.js',
  'data/geography_expansion.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_800.js','data/bookmark_800_history.js','data/bookmark_800_expansion.js','data/bookmark_1204.js',
  'data/bookmark_867_expansion.js',
  'data/bookmark_476.js','data/bookmark_476_outer.js','data/bookmark_476_wider.js',
  'data/bookmark_1066_inhabited.js',
  'data/political_institutions.js','data/aristocratic_courts.js','data/assembly_polities.js',
  'data/mobile_confederations.js','data/civic_profiles.js','data/ecclesiastical_profiles.js',
  'data/papacy.js','data/eras.js','data/systems.js','data/starts.js','data/lexicons.js',
  'js/world.js','js/main.js','js/day_phases.js','js/save.js','js/save_v4.js','js/mods.js','js/bookmark_setup.js',
  'js/governments.js','js/government_selection.js','js/government_recognition.js',
  'js/government_administration.js','js/government_ecclesiastical.js','js/ecclesiastical_validation.js',
  'js/ecclesiastical_strategies.js','js/government_support.js','js/government_lineage.js',
  'js/government_assembly.js','js/government_aristocracy.js','js/mobile_confederations.js',
  'js/government_elective.js','js/government_civic.js','js/civic_validation.js',
  'js/authority.js','js/model.js','js/station.js','js/progression.js','js/systems.js',
  'js/religion.js','js/papacy.js','js/institutions.js','js/treasury.js','js/lordships.js',
  'js/government_levy.js','js/government_revenue.js','js/government_continuity.js',
  'js/crazygames.js','data/distribution_crazygames.js'
]);

async function startSeason(page,info,row) {
  const code = 'GOVROLLOUT-' + row.bookmark + '-' + row.scenario +
    '-' + row.province + '-m-Review-established';
  await startHistoricalGame(page,info,{bookmark:row.bookmark,revision:row.revision,code:code});
  await injectBrowserHarness(page);
  const opening = await page.evaluate(function () {
    return {date:FB.state.date,turn:FB.state.turn};
  });
  expect(opening.turn).toBe(0);
  return opening.date;
}

function dateAtTurn(opening,turn) {
  const day = opening.day - 1 + turn;
  const season = opening.season + Math.floor(day / 90);
  return {year:opening.year + Math.floor(season / 4),season:season % 4,day:day % 90 + 1};
}

async function stageTurn(page,opening,turn) {
  await page.evaluate(function (checkpoint) {
    FB.state.date = checkpoint.date;
    FB.state.turn = checkpoint.turn;
  },{date:dateAtTurn(opening,turn),turn:turn});
}

async function saveAndRestore(page) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  expect(Buffer.byteLength(source,'utf8')).toBeLessThanOrEqual(6 * 1024 * 1024);
  const before = await facts(page);
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
  return source;
}

// Each proof opens its own dated campaign. Stage the elapsed clock and let
// the normal day dispatcher run the sampled days and seasonal transactions.
test.describe('dated government seasonal persistence',function () {
  test.describe.configure({mode:'parallel'});

  for (const row of consumers) {
    test(row.bookmark + ' restores the exact elapsed-day 45 checkpoint',async function ({page},info) {
      test.skip(info.project.name !== 'chromium-served','One bounded midpoint proof per date.');
      const opening = await startSeason(page,info,row);
      await stageTurn(page,opening,44);
      await advanceBookmark(page,1);
      expect(await page.evaluate(function () { return FB.state.date; })).toEqual(dateAtTurn(opening,45));
      await saveAndRestore(page);
    });

    test(row.bookmark + ' replays its original season boundary exactly',async function ({page},info) {
      test.skip(info.project.name !== 'chromium-served','One bounded seasonal replay per date.');
      const opening = await startSeason(page,info,row);
      // The first boundary falls on turn 15 for the late 1204 opening and
      // crosses the year in 800. Preserve both the calendar and elapsed turn.
      const boundary = 91 - opening.day;
      await stageTurn(page,opening,boundary - 2);
      const source = await saveAndRestore(page);
      await advanceBookmark(page,2);
      const finish = await facts(page);
      expect(finish.campaign.date).toEqual(dateAtTurn(opening,boundary));
      expect(finish.campaign.turn).toBe(boundary);
      await restoreBookmark(page,source);
      await advanceBookmark(page,2);
      expect(await facts(page)).toEqual(finish);
      expect(await page.evaluate(function (row) {
        return row.changed.filter(function (c) { return c.mode; }).every(function (c) {
          const periods = {};
          return FB.publicOfficeRows(FB.state,c.realm).every(function (appointment) {
            const period = Math.floor(appointment.startTurn / 90);
            periods[period] = (periods[period] || 0) + 1;
            return periods[period] <= 1;
          });
        });
      },row)).toBe(true);
    });
  }
});
