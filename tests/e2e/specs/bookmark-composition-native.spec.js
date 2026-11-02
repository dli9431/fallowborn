'use strict';
const {test,expect} = require('../support/fixture');
const {openGame,targetUrl,prepareGameContent} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {installPageGuards} = require('../support/page-contract');
const {installNativeLegacy,nativeSourceFiles} = require('../support/game/bookmark-sources-legacy');
const {beginBookmarkFromTitle,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const remaining = ['476','493','711','800','867','1066','1096','1204','1241'];
const allWorlds = ['476','493','568','634','711','800','867','1066','1096','1204','1241'];
const examples = [require('../fixtures/authoring/existing-person-harbor.json'),require('../fixtures/authoring/existing-person-dune.json')];
dependsOnRuntime(__filename,['index.html','js/bookmark_sources.js','js/bookmark_composition.js','js/mods.js',
  'js/main.js','js/world.js','js/starts.js','js/stories.js','js/model.js','js/bookmark_setup.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js','js/crazygames.js',
  'js/justice.js','js/federates.js','js/religious_institutions.js','js/story_household_refuge.js','js/story_household_party.js','js/ai_decisions.js','js/government_aristocracy.js',
  'data/bookmark_sources.js','data/bookmarks.js','data/starts.js','data/geographies.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/eras.js','data/religious_institutions.js','data/ai_decisions.js'].concat(nativeSourceFiles));

async function catalogue(page) {
  return page.evaluate(function (ids) {
    FB.mods.apply({name:'Native source compatibility'});
    return {signature:FB.mods.sig(),starts:FBDATA.startScenarios.map(function (row) { return row.id; }),
      declarations:Object.keys(FBDATA.storyInstances),registry:FB.stories.list().map(function (row) { return row.id; }),
      worlds:ids.map(function (id) { return {id:id,raw:FB.mods.fingerprint(FBDATA.bookmarks[id]),
        revisions:FB.bookmarkRevisions(id).map(function (world) { return world.revision; }),
        faults:FB.bookmarkRevisions(id).map(function (world) { return FB.validateBookmark(world); })}; })};
  },allWorlds);
}
async function withLegacy(browser,fn) {
  const context = await browser.newContext(), page = await context.newPage(), guard = installPageGuards(page);
  try { await installNativeLegacy(page); return await fn(page); }
  finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
}

async function watchPublicationReuse(page) {
  await page.route('**/js/main.js',async function (route) {
    const response = await route.fetch();
    function watch() {
      const calls = window.__nativePublicationCalls = [];
      ['reviewSource','prepareSource'].forEach(function (method) {
        const original = FB.bookmarkCompositions[method];
        FB.bookmarkCompositions[method] = function (input) {
          const ticket = original.apply(this,arguments), publish = ticket.publish;
          const row = {id:input.id,method:method,published:false};
          calls.push(row);
          ticket.publish = function () {
            const result = publish.apply(this,arguments);
            row.published = result.published;
            return result;
          };
          return ticket;
        };
      });
    }
    await route.fulfill({response:response,body:'(' + watch.toString() + ')();\n' + await response.text()});
  });
}

test('all native owners and retained revisions validate on served and file origins without replaying initialization',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const root = FBDATA, before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), registry = FB.stories.list();
    const reports = FB.bookmarkCompositions.publishPending();
    return {worlds:Object.keys(FBDATA.bookmarks),published:input.ids.every(function (id) {
      return reports.some(function (row) { return row.bookmarkId === id && row.published; });
    }),faults:input.ids.map(function (id) { return FB.bookmarkRevisions(id).map(function (world) { return FB.validateBookmark(world); }); }),
      imports:input.examples.map(function (example) { return FB.mods.validate(example); }),
      sharedFaults:FB.religiousInstitutionCatalogFaults(FBDATA).concat(FB.validateLegalTraditions()),
      refugeParty:!!FB.stories.get('mainz_party_1096') && !!FB.stories.get('mainz_refuge_1096'),
      unchanged:root === FBDATA && before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() && registry.every(function (row,i) { return FB.stories.list()[i] === row; })};
  },{ids:allWorlds,examples:examples});
  expect(result).toMatchObject({worlds:allWorlds,published:true,imports:[[],[]],sharedFaults:[],refugeParty:true,unchanged:true});
  result.faults.forEach(function (revisions) { revisions.forEach(function (faults) { expect(faults).toEqual([]); }); });
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist [data-bookmark="867"]')).toBeVisible();
  await expect(page.locator('#bookmarklist [data-bookmark="1066"]')).toBeVisible();
});

test('every native world, retained revision, start and story keeps its former complete fingerprint and order',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'Pinned source interception requires a served origin.');
  await withLegacy(browser,async function (oldPage) {
    await Promise.all([openGame(page,info),openGame(oldPage,info)]);
    const actual = await catalogue(page), former = await catalogue(oldPage);
    expect(actual).toEqual(former);
    actual.worlds.forEach(function (world) { expect(world.faults.every(function (faults) { return !faults.length; })).toBe(true); });
    expect(await page.evaluate(function () {
      return FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; }).every(function (row) { return row.published; });
    })).toBe(true);
  });
});

for (const id of remaining) for (const retained of [false,true]) {
  test(id + ' restores a former ' + (retained ? 'baseline' : 'fresh') + ' campaign with spent resources',async function ({page,browser},info) {
    test.skip(!info.project.name.endsWith('-served'),'Pinned source interception requires a served origin.');
    await withLegacy(browser,async function (oldPage) {
      await Promise.all([openGame(page,info),openGame(oldPage,info)]);
      expect((await catalogue(page)).signature).toBe((await catalogue(oldPage)).signature);
      if (retained) await oldPage.evaluate(function (id) {
        if (FBDATA.bookmarks[id].revisions && FBDATA.bookmarks[id].revisions.baseline) FBDATA.bookmarks[id].revision = 'baseline';
      },id);
      await beginBookmarkFromTitle(oldPage,id);
      await oldPage.evaluate(function () { FB.state.player.gold = Math.max(0,FB.state.player.gold - 3); });
      const expected = await facts(oldPage), saved = await oldPage.evaluate(function () { return FB.save.serialize(); });
      await page.evaluate(function (id) { FBDATA.bookmarks[id].hidden = true; },id);
      await restoreBookmark(page,saved);
      expect(await facts(page)).toEqual(expected);
      expect(await page.evaluate(function () { return {faults:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)}; })).toEqual({faults:[],valid:true});
    });
  });
}

for (const id of remaining) {
  test('a rejected ' + id + ' world leaves the other date owners and an ordinary campaign available',async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Source fault injection requires a served origin.');
    await page.route('**/data/bookmark_sources.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:
        'FB.bookmarkSources.stage({source:"native-world-fault",bookmarks:[' + JSON.stringify(id) + '],catalogs:[]},function(FBDATA){var b=FBDATA.bookmarks[' + JSON.stringify(id) + '];[b].concat(Object.values(b.revisions||{})).forEach(function(layer){(layer.realms||[]).filter(function(r){return !r.nonTerritorial;}).slice(0,1).forEach(function(r){r.capital="native_unknown_county";});});});\nFB.bookmarkSources.finish(' + JSON.stringify(allWorlds) + ');'});
    });
    await openGame(page,info);
    const results = await page.evaluate(function (id) {
      return {absent:!FBDATA.bookmarks[id],reports:FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; })
        .map(function (row) { return {id:row.bookmarkId,published:row.published,faults:row.worldFaults}; })};
    },id);
    expect(results.absent).toBe(true);
    expect(results.reports.find(function (row) { return row.id === id; }).faults.join(' ')).toContain('native_unknown_county');
    expect(results.reports.filter(function (row) { return row.id !== id; }).every(function (row) { return row.published; })).toBe(true);
    await beginBookmarkFromTitle(page,id === '867' ? '1066' : '867');
  });
}

for (const id of remaining) {
  test('a malformed ' + id + ' start is withheld while its world and healthy siblings remain usable',async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Source fault injection requires a served origin.');
    await watchPublicationReuse(page);
    await page.route('**/data/bookmark_sources.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:
        'FB.bookmarkSources.stage({source:"native-start-fault",bookmarks:[' + JSON.stringify(id) + '],catalogs:[]},function(FBDATA){var b=FBDATA.bookmarks[' + JSON.stringify(id) + '];var row=FBDATA.startScenarios.find(function(s){return FB.bookmarkSources.matches(s,b.id,b.era)&&!s.hidden&&!s.rulerRealmId&&(s.profession==="farmer"||s.profession==="craftsman");});window.__nativeRejected=row.id;row.gold=-1;});\nFB.bookmarkSources.finish(' + JSON.stringify(allWorlds) + ');'});
    });
    await openGame(page,info);
    const result = await page.evaluate(function (id) {
      const name = window.__nativeRejected, report = FB.bookmarkCompositions.sourceReports().find(function (row) { return row.bookmarkId === id; });
      return {report:report,calls:window.__nativePublicationCalls,absent:!FBDATA.startScenarios.some(function (row) { return row.id === name; }),
        rejected:report.starts.find(function (unit) { return unit.id === name; }),faults:FB.validateBookmark(FB.bookmark(id))};
    },id);
    expect(result).toMatchObject({report:{published:true},absent:true,faults:[],rejected:{ready:false}});
    expect(result.rejected.faults.join(' ')).toContain('gold');
    const worlds = result.calls.filter(function (row) { return row.id !== 'native_unattached_declarations'; });
    expect(worlds.filter(function (row) { return row.method === 'reviewSource'; })).toHaveLength(allWorlds.length);
    expect(worlds.some(function (row) { return row.method === 'reviewSource' && row.published; })).toBe(true);
    expect(worlds.filter(function (row) { return row.method === 'prepareSource'; }).length).toBeLessThan(allWorlds.length);
    await beginBookmarkFromTitle(page,id);
  });
}

for (const crazy of [false,true]) {
  test('an empty published story catalogue preserves failed-source diagnostics and completes title boot on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Publication fault injection requires a served origin.');
    await page.route('**/js/main.js',async function (route) {
      const response = await route.fetch();
      const prefix = 'window.__nativeEmptyStories=!FBDATA.storyInstances;FB.bookmarkCompositions.reviewSource=function(input){return {report:function(){return {id:input.id,source:input.source,bookmarkId:input.bookmark.id,ready:false,worldFaults:["Native publication rejection probe"],starts:[]};}};};\n';
      await route.fulfill({response:response,body:prefix + await response.text()});
    });
    if (crazy) {
      await mockCrazyGames(page); await page.addInitScript(function () { window.FB_DISTRIBUTION='crazygames';window.FB_CRAZYGAMES_STORAGE='localstorage'; });
    }
    await page.goto(targetUrl(info),{waitUntil:'domcontentloaded'});
    await expect.poll(function () { return page.evaluate(function () { return !!(window.FB && FB.game && FB.game.bootReady); }); },{timeout:30000}).toBe(true);
    await prepareGameContent(page);
    const result = await page.evaluate(function () {
      return {absentBeforePublication:window.__nativeEmptyStories,ready:FB.game.bootReady,
        worlds:Object.keys(FBDATA.bookmarks),declarations:Object.keys(FBDATA.storyInstances),
        reports:FB.bookmarkCompositions.sourceReports().map(function (row) {
          return {id:row.bookmarkId,published:row.published,faults:row.worldFaults};
        })};
    });
    expect(result).toMatchObject({absentBeforePublication:true,ready:true,worlds:[],declarations:[]});
    expect(result.reports.map(function (row) { return row.id; }).sort()).toEqual(allWorlds.slice().sort());
    result.reports.forEach(function (row) { expect(row).toMatchObject({published:false,faults:['Native publication rejection probe']}); });
  });

  test('the full source barrier stays detached and all healthy dates publish on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Source barrier interception requires a served origin.');
    await page.route('**/data/bookmark_sources.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:
        'window.__nativeBarrier={worlds:Object.keys(FBDATA.bookmarks),stories:Object.keys(FBDATA.storyInstances||{}),engine:!!FB.mods};FB.bookmarkSources.finish(' + JSON.stringify(allWorlds) + ');'});
    });
    if (crazy) {
      await mockCrazyGames(page); await page.addInitScript(function () { window.FB_DISTRIBUTION='crazygames';window.FB_CRAZYGAMES_STORAGE='localstorage'; });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    expect(await page.evaluate(function (ids) {
      const before = JSON.stringify(FBDATA), root = FBDATA, rng = FB.getRngState(), uid = FB.getUidCounter();
      const registry = FB.stories.list(), reports = FB.bookmarkCompositions.publishPending();
      return {barrier:window.__nativeBarrier,worlds:Object.keys(FBDATA.bookmarks),
        published:ids.every(function (id) { return reports.some(function (row) { return row.bookmarkId === id && row.published; }); }),
        reused:root===FBDATA&&before===JSON.stringify(FBDATA)&&registry.every(function (row,i) { return FB.stories.list()[i]===row; }),
        pure:rng===FB.getRngState()&&uid===FB.getUidCounter(),faults:ids.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })};
    },allWorlds)).toEqual({barrier:{worlds:['867','1066'],stories:[],engine:false},worlds:allWorlds,published:true,reused:true,pure:true,faults:allWorlds.map(function () { return []; })});
  });
}
