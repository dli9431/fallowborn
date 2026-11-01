'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {installPageGuards} = require('../support/page-contract');
const {installLegacy568,legacy568Files} = require('../support/game/bookmark-composition-legacy');
const {beginBookmarkFromTitle,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const finalizer = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_568_composition.js'),'utf8');

dependsOnRuntime(__filename,['index.html','js/bookmark_composition.js','js/main.js','js/mods.js','js/stories.js',
  'js/starts.js','js/world.js','js/model.js','js/title_ids.js','js/messages.js','js/bookmark_setup.js',
  'js/story_ruler_agenda.js','js/story_household.js','js/story_opening_goals.js',
  'js/save.js','js/save_v4.js','js/crazygames.js','js/ui_misc.js','js/ui_modals.js',
  'data/bookmarks.js','data/starts.js','data/bookmark_568_identities.js','data/bookmark_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js','data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/starts_568.js','data/starts_568_ravenna.js','data/starts_rulers_568.js','data/starts_rulers_568_east.js',
  'data/story_ruler_agendas_568.js','data/story_ruler_agendas_568_east.js','data/story_households_568_ravenna.js',
  'data/bookmark_568_composition.js','data/bookmark_634.js','data/starts_634_ordinary.js',
  'data/bookmark_634_identities.js','data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/cultures.js','data/geographies.js','data/geography_expansion.js','data/settlements.js',
  'data/political_institutions.js','data/aristocratic_courts.js','data/eras.js']);

async function openDistribution(page,info,crazy) {
  if (!crazy) return openGame(page,info);
  await mockCrazyGames(page);
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openCrazyGame(page,info);
}
async function catalogue(page) {
  return page.evaluate(function () {
    FB.mods.apply({name:'568 composition compatibility'});
    return {signature:FB.mods.sig(),world:FB.mods.fingerprint(FBDATA.bookmarks['568']),
      starts:FBDATA.startScenarios.map(function (row) { return row.id; }),
      declarations:Object.keys(FBDATA.storyInstances),registry:FB.stories.list().map(function (story) { return story.id; }),
      stories:FB.mods.fingerprint(FBDATA.storyInstances)};
  });
}

for (const retained of [false,true]) {
  test('568 keeps the former fingerprint, story order and ' + (retained ? 'retained migration' : 'fresh household') + ' spent-resource save',async function ({page,browser},info) {
    test.skip(!info.project.name.endsWith('-served'),'Legacy source interception requires a served origin.');
    const oldContext = await browser.newContext(), oldPage = await oldContext.newPage(), guard = installPageGuards(oldPage);
    try {
      await installLegacy568(oldPage);
      await openGame(oldPage,info); await openGame(page,info);
      expect(await catalogue(page)).toEqual(await catalogue(oldPage));
      if (retained) await oldPage.evaluate(function () { FBDATA.bookmarks['568'].revision = 'migration_v1'; });
      await beginBookmarkFromTitle(oldPage,'568',retained ? 'farmer_568' : 'ravenna_household_568');
      await oldPage.evaluate(function () { FB.state.player.gold -= 3; });
      const expected = await facts(oldPage), save = await oldPage.evaluate(function () { return FB.save.serialize(); });
      await page.evaluate(function () {
        FBDATA.bookmarks['568'].hidden = true;
        return new Promise(function (resolve) { FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); }); });
      });
      await restoreBookmark(page,save);
      expect(await facts(page)).toEqual(expected);
      expect(await page.evaluate(function () {
        return {revision:FB.state.start.revision,hidden:FBDATA.bookmarks['568'].hidden,
          errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
      })).toEqual({revision:retained ? 'migration_v1' : 'eastern_courts_v3',hidden:true,errors:[],valid:true});
    } finally {
      try { expect(guard.faults).toEqual([]); } finally { await oldContext.close(); }
    }
  });
}

for (const crazy of [false,true]) {
  test('568 contributors remain detached until bootstrap on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Source boundary interception requires a served origin.');
    await page.route('**/data/bookmark_568_composition.js',function (route) {
      const before = "window.__568Before = JSON.stringify({bookmarks:FBDATA.bookmarks,starts:FBDATA.startScenarios,stories:FBDATA.storyInstances,cultures:FBDATA.cultures,layouts:FBDATA.settlementLayouts,sites:FBDATA.settlementSites,faiths:FBDATA.religions,administration:FBDATA.administrationProfiles,aristocracy:FBDATA.aristocraticProfiles});\n";
      const after = "window.__568Stage = {absent:!FBDATA.bookmarks['568'] && !FBDATA.settlementLayouts['568'] && !FBDATA.cultures.langobard_568 && !FBDATA.storyInstances.sigebert_agenda_568 && !FBDATA.startScenarios.some(function(s){return s.bookmarkIds && s.bookmarkIds.indexOf('568')>=0;}),unchanged:window.__568Before === JSON.stringify({bookmarks:FBDATA.bookmarks,starts:FBDATA.startScenarios,stories:FBDATA.storyInstances,cultures:FBDATA.cultures,layouts:FBDATA.settlementLayouts,sites:FBDATA.settlementSites,faiths:FBDATA.religions,administration:FBDATA.administrationProfiles,aristocracy:FBDATA.aristocraticProfiles}),engine:!!FB.mods,units:FBDATA.bookmarkCompositionSources.spring_568.input.starts.length};\n";
      return route.fulfill({contentType:'application/javascript',body:before + finalizer + after});
    });
    await openDistribution(page,info,crazy);
    expect(await page.evaluate(function () {
      const reports = FB.bookmarkCompositions.sourceReports();
      return {stage:window.__568Stage,published:reports.filter(function (row) { return row.id === 'spring_568' || row.id === 'autumn_634'; })
        .every(function (row) { return row.published && row.starts.every(function (unit) { return unit.ready; }); }),
        faults:FB.bookmarkRevisions('568').map(function (world) { return FB.validateBookmark(world); })};
    })).toEqual({stage:{absent:true,unchanged:true,engine:false,units:8},published:true,faults:[[],[],[],[]]});
  });

  for (const bad of ['sigebert','ravenna']) {
    test('568 isolates a bad ' + bad + ' unit and its complete graph on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
      test.skip(!info.project.name.endsWith('-served'),'Fault injection requires a served origin.');
      const mutation = bad === 'sigebert'
        ? "FBDATA.bookmarkCompositionDrafts.spring_568.starts.find(function(unit){return unit.definition.id==='sigebert_568';}).definition.gold=-1;\n"
        : "FBDATA.bookmarkCompositionDrafts.spring_568.starts.find(function(unit){return unit.definition.id==='ravenna_household_568';}).storyInstances.ravenna_household_track_568.type='composition_missing_type';\n";
      await page.route('**/data/bookmark_568_composition.js',function (route) {
        return route.fulfill({contentType:'application/javascript',body:mutation + finalizer});
      });
      await openDistribution(page,info,crazy);
      const result = await page.evaluate(function (bad) {
        const rejected = bad === 'sigebert' ? 'sigebert_568' : 'ravenna_household_568';
        const graph = bad === 'sigebert' ? ['sigebert_agenda_568'] : ['ravenna_household_track_568','opening_ravenna_568'];
        const report = FB.bookmarkCompositions.sourceReports().find(function (row) { return row.id === 'spring_568'; });
        return {report:report,accepted:report.starts.filter(function (unit) { return unit.ready; }).length,
          absent:!FBDATA.startScenarios.some(function (row) { return row.id === rejected; }) &&
            graph.every(function (id) { return !FBDATA.storyInstances[id] && !FB.stories.get(id); }) &&
            [FBDATA.bookmarks['568']].concat(Object.values(FBDATA.bookmarks['568'].revisions)).every(function (layer) {
              return (!layer.starts || layer.starts.indexOf(rejected) < 0) && (!layer.startLocations || !layer.startLocations[rejected]);
            }),
          faults:['568','634','476','867','1066'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
          rejected:report.starts.find(function (unit) { return unit.id === rejected; })};
      },bad);
      expect(result).toMatchObject({report:{published:true},accepted:7,absent:true,faults:[[],[],[],[],[]],rejected:{ready:false}});
      expect(result.rejected.faults.join(' ')).toContain(bad === 'sigebert' ? 'gold' : 'unknown story type');
      await beginBookmarkFromTitle(page,'568','craftsman_568');
      expect(await page.evaluate(function () { return FB.state.start.scenarioId; })).toBe('craftsman_568');
    });
  }
}

for (const failure of ['assembly','canonical']) {
  test('failed 568 ' + failure + ' withholds its world while 634 owns its shared dependencies',async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Fault injection requires a served origin.');
    if (failure === 'assembly') {
      const source = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_568.js'),'utf8');
      await page.route('**/data/bookmark_568.js',function (route) {
        return route.fulfill({contentType:'application/javascript',body:'FBDATA.bookmarkRegions568.italy.provinces.push(FBDATA.bookmarkRegions568.italy.provinces[0]);\n' + source});
      });
    } else await page.route('**/data/bookmark_568_composition.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:"FBDATA.bookmarkCompositionDrafts.spring_568.bookmark.realms[0].capital='composition_missing_capital';\n" + finalizer});
    });
    await openGame(page,info);
    const result = await page.evaluate(function () {
      const report = FB.bookmarkCompositions.sourceReports().find(function (row) { return row.id === 'spring_568'; });
      return {report:report,absent:!FBDATA.bookmarks['568'] && !FBDATA.settlementLayouts['568'] &&
        !FBDATA.storyInstances.sigebert_agenda_568 && !FBDATA.storyInstances.ravenna_household_track_568 &&
        !FBDATA.startScenarios.some(function (row) { return row.bookmarkIds && row.bookmarkIds.indexOf('568') >= 0; }),
        edges:Object.keys(FBDATA.bookmarkFaithAvailability568).every(function (id) { return FBDATA.religions[id].availability.bookmarkIds.indexOf('568') < 0; }),
        independent:FB.bookmarkCompositions.sourceReports().find(function (row) { return row.id === 'autumn_634'; }).published,
        faults:['634','476','867','1066'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })};
    });
    expect(result).toMatchObject({report:{published:false},absent:true,edges:true,independent:true,faults:[[],[],[],[]]});
    expect(result.report.worldFaults.join(' ')).toContain(failure === 'assembly' ? 'Duplicate 568 provinces:' : 'composition_missing_capital');
    await beginBookmarkFromTitle(page,'634','farmer_634');
  });
}

test('a Ravenna graph assembly error retains its source message and leaves healthy starts available',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Fault injection requires a served origin.');
  const source = fs.readFileSync(path.resolve(__dirname,'../../../data/story_households_568_ravenna.js'),'utf8');
  const injected = source.replace('(function () {','delete FBDATA.householdTracks_568_ravenna.ravenna_household_track_568.stages.supplies;\n(function () {');
  await page.route('**/data/story_households_568_ravenna.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:injected});
  });
  await openGame(page,info);
  const report = await page.evaluate(function () {
    return FB.bookmarkCompositions.sourceReports().find(function (row) { return row.id === 'spring_568'; });
  });
  expect(report.published).toBe(true);
  const rejected = report.starts.find(function (unit) { return unit.id === 'ravenna_household_568'; });
  expect(rejected.ready).toBe(false);
  expect(rejected.faults.join(' ')).toContain('data/story_households_568_ravenna.js:');
  expect(rejected.faults.join(' ')).toContain('transitions');
  expect(report.starts.filter(function (unit) { return unit.ready; })).toHaveLength(7);
  await beginBookmarkFromTitle(page,'568','farmer_568');
});

test('568 complete source re-evaluation is idempotent and staged records do not alias published records',async function ({page},info) {
  await openGame(page,info);
  const before = await page.evaluate(function () { return JSON.stringify(FBDATA); });
  for (const file of legacy568Files.concat(['bookmark_568_composition.js']))
    await page.addScriptTag({path:path.resolve(__dirname,'../../../data',file)});
  expect(await page.evaluate(function (before) {
    const root = FBDATA, rng = FB.getRngState(), uid = FB.getUidCounter(), registry = FB.stories.list();
    const reports = FB.bookmarkCompositions.publishPending();
    const repeated = before === JSON.stringify(FBDATA) && root === FBDATA && registry.every(function (story,i) { return FB.stories.list()[i] === story; });
    const draft = FBDATA.bookmarkCompositionDrafts.spring_568, world = JSON.stringify(FBDATA.bookmarks['568']), graph = JSON.stringify(FBDATA.storyInstances.sigebert_agenda_568);
    draft.bookmark.realms[0].capital = 'unpublished_change';
    draft.starts.find(function (unit) { return unit.definition.id === 'sigebert_568'; }).storyInstances.sigebert_agenda_568.title = 'Unpublished title';
    return {published:reports.every(function (row) { return row.published; }),repeated:repeated,
      detached:world === JSON.stringify(FBDATA.bookmarks['568']) && graph === JSON.stringify(FBDATA.storyInstances.sigebert_agenda_568),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  },before)).toEqual({published:true,repeated:true,detached:true,pure:true});
});
