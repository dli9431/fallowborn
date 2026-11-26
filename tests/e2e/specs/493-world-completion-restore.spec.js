'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {restoreBookmark,facts,beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {startParityGame,startPreparedParityGame} = require('../support/game/parity');
const {saveBudget} = require('../support/game/476-wider');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_493_history.js',
  'data/bookmark_476.js','data/bookmarks.js','data/bookmark_867_expansion.js','data/starts.js','data/story_instances.js',
  'js/main.js','js/world.js','js/model.js','js/population.js','js/bookmark_setup.js','js/institutions.js',
  'js/stories.js','js/save.js','js/save_v4.js'
]);

test.describe.configure({mode:'parallel'});

// The second life of each case leaves the first through the ordinary return
// to the title. The complete catalogue is already prepared, so beginning
// another date there needs no reopened page and no second preparation.
async function returnToTitle(page) {
  await page.evaluate(function () { FB.game.toTitle(); });
  await page.locator('#title:not(.hidden)').waitFor();
}

async function start493(page,testInfo,county,revision,fromTitle) {
  const journey = {bookmark:'493',revision:revision,unhide:true,
    code:'WORLD493-493-farmer_493-' + county + '-m-Review-established'};
  if (fromTitle) await startPreparedParityGame(page,journey);
  else await startParityGame(page,testInfo,journey);
  await page.evaluate(function () {
    FBDATA.bookmarks['493'].revision = 'world_v2';
    FBDATA.bookmarks['493'].hidden = true;
  });
}

async function legacyFrontier(page,testInfo) {
  await start493(page,testInfo,'ravenna','baseline');
  return page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 5000; s.player.prestige = 500; FB.settleWaste(s,'w_karakum');
    if (FB.world.byId.w_karakum.wasteland) throw new Error('Frontier setup failed');
    const data = JSON.parse(FB.save.serialize()); data.platformSchema = 1; delete data.state.start.revision;
    return {text:JSON.stringify(data),facts:JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup,s.stories,s.localInstitutions,s.wastelandSettlements]),
      sites:JSON.stringify(FB.world.sitesByProv.w_karakum)};
  });
}

async function expectLegacyFrontier(page,prior) {
  expect(await page.evaluate(function () {
    const s = FB.state;
    return {revision:s.start.revision,geo:s.start.geography,added:!!FB.world.byId.kath_district,
      facts:JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup,s.stories,s.localInstitutions,s.wastelandSettlements]),
      sites:JSON.stringify(FB.world.sitesByProv.w_karakum),site:FB.campaignBookmark(s).localInstitutions.alexandria_see.site,
      valid:FB.save.v4.validatePlatform(s)};
  })).toEqual({revision:'baseline',geo:'europe_regional',added:false,facts:prior.facts,sites:prior.sites,site:null,valid:true});
}

for (const {date,start} of [{date:'476',start:'farmer_476'},{date:'867',start:'farmer'}]) {
  test('493 baseline frontier, institutions and story commitments restore after ' + date,async function ({page},testInfo) {
    const prior = await legacyFrontier(page,testInfo);
    await returnToTitle(page);
    await beginBookmarkFromTitle(page,date,start);
    const other = await page.evaluate(function () { return FB.save.serialize(); });
    await restoreBookmark(page,other);
    await restoreBookmark(page,prior.text);
    await expectLegacyFrontier(page,prior);
  });
}

test('493 baseline and expanded saves switch in both directions and reject mismatched revisions',async function ({page},testInfo) {
  const prior = await legacyFrontier(page,testInfo);
  await returnToTitle(page);
  await start493(page,testInfo,'baghdad','world_v2',true);
  const expanded = await saveBudget(page,testInfo,'expanded-switch',4*1024*1024), expandedFacts = await facts(page);
  await restoreBookmark(page,expanded);
  await restoreBookmark(page,prior.text);
  await expectLegacyFrontier(page,prior);
  await restoreBookmark(page,expanded);
  expect(await facts(page)).toEqual(expandedFacts);
  expect(await page.evaluate(function () {
    const data = JSON.parse(FB.save.serialize()), live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return [function (d) { d.state.start.revision = 'unknown'; },
      function (d) { d.state.start.geography = 'europe_regional'; }].map(function (mutate) {
        const bad = JSON.parse(JSON.stringify(data)); mutate(bad);
        return FB.game.loadData(bad) === false && live === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter();
      });
  })).toEqual([true,true]);
});
