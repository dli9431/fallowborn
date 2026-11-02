'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/existing-person-harbor.json'),
  dune:require('../fixtures/authoring/existing-person-dune.json')};
const source634 = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_634.js'),'utf8');

dependsOnRuntime(__filename,['index.html','js/bookmark_composition.js','js/bookmark_sources.js','data/bookmark_sources.js','js/main.js','js/mods.js',
  'js/stories.js','js/story_household.js','js/starts.js','js/world.js','js/model.js','js/messages.js',
  'js/governments.js','js/title_ids.js','js/crazygames.js','js/ui_misc.js','js/ui_modals.js',
  'data/starts.js','data/bookmarks.js','data/cultures.js','data/geographies.js','data/eras.js',
  'data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js']);

function inputFor(prefix) {
  const mod = JSON.parse(JSON.stringify(examples[prefix])), catalogs = {};
  Object.keys(mod).forEach(function (key) {
    if (['name','bookmarks','startScenarios'].indexOf(key) < 0) catalogs[key] = mod[key];
  });
  const bookmark = mod.bookmarks[prefix + '_world']; bookmark.starts = [];
  return {id:prefix + '_ordering',source:'fixtures/authoring/existing-person-' + prefix + '.json',
    bookmark:bookmark,catalogs:catalogs,starts:mod.startScenarios.map(function (definition) { return {definition:definition}; })};
}

for (const crazy of [false,true]) {
  test('634 captures source positions before validators load on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Data-position interception requires the served origin.');
    const before = `
      window.__orderingStage = {capture:typeof FB.bookmarkCompositions.captureStarts === 'function',
        mods:!!FB.mods,stories:!!FB.stories,world:!!FB.validateBookmark,rng:!!FB.getRngState};
      window.__orderingStage.early = FB.bookmarkCompositions.prepare({id:'ordering_early_probe',bookmark:{id:'ordering_future'}}).publish();
      window.__orderingPublicBefore = JSON.stringify({worlds:FBDATA.bookmarks,sites:FBDATA.settlementSites,
        layouts:FBDATA.settlementLayouts,faiths:FBDATA.religions,forms:FBDATA.governmentForms,starts:FBDATA.startScenarios});
      window.__orderingLiveStarts = FB.bookmarkSources.inspect().starts;
    `;
    const after = `
      window.__orderingStage.unchanged = window.__orderingPublicBefore === JSON.stringify({worlds:FBDATA.bookmarks,
        sites:FBDATA.settlementSites,layouts:FBDATA.settlementLayouts,faiths:FBDATA.religions,
        forms:FBDATA.governmentForms,starts:FBDATA.startScenarios});
      window.__orderingStage.placements = FBDATA.bookmarkCompositionSources.autumn_634.input.starts.map(function (unit) { return unit.after; });
      var earlier = ['farmer_568','craftsman_568','ravenna_household_568','sigebert_568','chilperic_568','guntram_568'];
      window.__orderingStage.expected = [window.__orderingLiveStarts.concat(earlier),window.__orderingLiveStarts.concat(earlier,['farmer_634'])];
    `;
    await page.route('**/data/bookmark_634.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:before + source634 + after});
    });
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    const result = await page.evaluate(function () {
      return {stage:window.__orderingStage,report:FB.bookmarkCompositions.sourceReports().find(function (row) { return row.id === 'autumn_634'; })};
    });
    expect(result.stage).toMatchObject({capture:true,mods:false,stories:false,world:false,rng:false,unchanged:true});
    expect(result.stage.early).toMatchObject({published:false,worldFaults:['Composition validation requires the complete engine.']});
    expect(result.stage.placements).toEqual(result.stage.expected);
    expect(result.report).toMatchObject({published:true});
  });
}

for (const reversed of [false,true]) for (const failure of ['none','world','start']) {
  test('interleaved source order survives ' + (reversed ? 'reversed' : 'forward') + ' publication and ' + failure + ' rejection',async function ({page},info) {
    await openGame(page,info);
    const result = await page.evaluate(function (inputs) {
      const a = inputs.a, b = inputs.b, baseline = FBDATA.startScenarios.map(function (row) { return row.id; });
      const rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state, world = FB.world;
      const snapshot = JSON.stringify(FBDATA), english = JSON.stringify(FB.englishMessages());
      const registered = Object.keys(FBDATA.bookmarks);
      const graphIds = ['ordering_harbor_track','ordering_live_graph_between','ordering_dune_track','ordering_live_graph_later'];
      function graphFor(input,id) {
        const graph = JSON.parse(JSON.stringify(Object.values(input.catalogs.storyInstances)[0])); graph.id = id;
        input.starts[0].storyInstances = {}; input.starts[0].storyInstances[id] = graph;
        input.starts[0].definition.tracks = [id]; delete input.starts[0].definition.trackLocations;
        input.starts[0].storyAfter = FB.bookmarkCompositions.captureStories(input.id,'personal',input.starts[0].storyInstances);
      }
      const faithId = Object.keys(FBDATA.religions).find(function (id) {
        const ids = FBDATA.religions[id].availability && FBDATA.religions[id].availability.bookmarkIds;
        return Array.isArray(ids) && ids.length && registered.some(function (bookmarkId) { return ids.indexOf(bookmarkId) < 0; });
      });
      const faithBefore = JSON.parse(JSON.stringify(FBDATA.religions[faithId]));
      const liveEdge = registered.find(function (id) { return faithBefore.availability.bookmarkIds.indexOf(id) < 0; });
      const patchA = {}; patchA[faithId] = {bookmarkIds:[a.bookmark.id]};
      a.availability = FB.bookmarkCompositions.captureAvailability(a.id,patchA);
      const early = FB.bookmarkCompositions.captureStarts(a.id,'earlier',a.starts.slice(0,2).map(function (unit) { return unit.definition; }));
      a.starts.slice(0,2).forEach(function (unit) { unit.after = early[unit.definition.id]; });
      graphFor(a,graphIds[0]);
      const capturePure = snapshot === JSON.stringify(FBDATA) && english === JSON.stringify(FB.englishMessages());
      function liveStart(id) {
        const row = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_634'; })));
        row.id = id; row.bookmarkIds = ['867']; FBDATA.startScenarios.push(row); return row;
      }
      const between = liveStart('ordering_live_between');
      const betweenGraph = JSON.parse(JSON.stringify(FBDATA.storyInstances.ravenna_household_track_568));
      betweenGraph.id = graphIds[1]; FBDATA.storyInstances[betweenGraph.id] = betweenGraph;
      FBDATA.religions[faithId].availability.bookmarkIds.push(liveEdge);
      const patchB = {}; patchB[faithId] = {bookmarkIds:[b.bookmark.id]};
      b.availability = FB.bookmarkCompositions.captureAvailability(b.id,patchB);
      const middle = FB.bookmarkCompositions.captureStarts(b.id,'middle',b.starts.map(function (unit) { return unit.definition; }));
      b.starts.forEach(function (unit) { unit.after = middle[unit.definition.id]; });
      graphFor(b,graphIds[2]);
      const later = liveStart('ordering_live_later');
      const laterGraph = JSON.parse(JSON.stringify(betweenGraph)); laterGraph.id = graphIds[3]; FBDATA.storyInstances[laterGraph.id] = laterGraph;
      const late = FB.bookmarkCompositions.captureStarts(a.id,'later',[a.starts[2].definition]);
      a.starts[2].after = late[a.starts[2].definition.id];
      if (inputs.failure === 'world') a.bookmark.realms[0].capital = 'ordering_missing_capital';
      if (inputs.failure === 'start') a.starts[0].definition.gold = -1;
      (inputs.reversed ? [b,a] : [a,b]).forEach(function (input) {
        FBDATA.bookmarkCompositionSources[input.id] = {source:input.source,bookmarkId:input.bookmark.id,input:input};
      });
      const reports = FB.bookmarkCompositions.publishPending();
      const installed = FBDATA, after = JSON.stringify(FBDATA);
      FB.bookmarkCompositions.publishPending();
      const keepA = inputs.failure !== 'world', keepFirst = inputs.failure === 'none';
      const expected = baseline.concat(keepFirst ? [a.starts[0].definition.id] : [],keepA ? [a.starts[1].definition.id] : [],
        [between.id],b.starts.map(function (unit) { return unit.definition.id; }),[later.id],keepA ? [a.starts[2].definition.id] : []);
      const expectedFaith = JSON.parse(JSON.stringify(faithBefore));
      expectedFaith.availability.bookmarkIds = faithBefore.availability.bookmarkIds.concat(keepA ? [a.bookmark.id] : [],[liveEdge,b.bookmark.id]);
      return {capturePure:capturePure,reports:reports.filter(function (row) { return row.id === a.id || row.id === b.id; }),
        actual:FBDATA.startScenarios.map(function (row) { return row.id; }),expected:expected,
        faith:FBDATA.religions[faithId],expectedFaith:expectedFaith,repeat:installed === FBDATA && after === JSON.stringify(FBDATA),
        graphOrder:Object.keys(FBDATA.storyInstances).filter(function (id) { return graphIds.indexOf(id) >= 0; }),
        registryOrder:FB.stories.list().map(function (story) { return story.id; }).filter(function (id) { return graphIds.indexOf(id) >= 0; }),
        expectedGraphs:(keepFirst ? [graphIds[0]] : []).concat(graphIds.slice(1)),
        liveGraphs:FBDATA.storyInstances[betweenGraph.id] === betweenGraph && FBDATA.storyInstances[laterGraph.id] === laterGraph,
        unowned:FBDATA.startScenarios.indexOf(between) >= 0 && FBDATA.startScenarios.indexOf(later) >= 0,
        faults:[b.bookmark.id].concat(keepA ? [a.bookmark.id] : []).map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
        worldAbsent:!FBDATA.bookmarks[a.bookmark.id],
        pure:rng === FB.getRngState() && uid === FB.getUidCounter() && state === FB.state && world === FB.world};
    },{a:inputFor('harbor'),b:inputFor('dune'),reversed:reversed,failure:failure});
    expect(result).toMatchObject({capturePure:true,repeat:true,unowned:true,liveGraphs:true,pure:true});
    expect(result.actual).toEqual(result.expected);
    expect(result.faith).toEqual(result.expectedFaith);
    expect(result.graphOrder).toEqual(result.expectedGraphs);
    expect(result.registryOrder).toEqual(result.expectedGraphs);
    expect(result.faults.every(function (faults) { return !faults.length; })).toBe(true);
    const a = result.reports.find(function (row) { return row.id === 'harbor_ordering'; });
    const b = result.reports.find(function (row) { return row.id === 'dune_ordering'; });
    expect(b).toMatchObject({published:true});
    expect(a.published).toBe(failure !== 'world');
    expect(result.worldAbsent).toBe(failure === 'world');
    if (failure === 'world') expect(a.worldFaults.join(' ')).toContain('ordering_missing_capital');
    if (failure === 'start') {
      expect(a.starts.map(function (unit) { return unit.ready; })).toEqual([false,true,true]);
      expect(a.starts[0].faults.join(' ')).toContain('gold');
    }
  });
}

test('capture is detached, repeatable and atomic when a source changes or has invalid ids',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    function rejects(fn) { try { fn(); return false; } catch (error) { return !!error.message; } }
    const invalid = rejects(function () { FB.bookmarkCompositions.captureStarts('ordering_invalid','first',[{id:'ordering_fresh'},{id:'invalid id'}]); });
    let reads = 0;
    const accessor = {}; Object.defineProperty(accessor,'id',{enumerable:true,get:function () { reads++; return 'ordering_accessor'; }});
    const accessors = rejects(function () { FB.bookmarkCompositions.captureStarts('ordering_accessors','first',[accessor]); });
    const records = [{id:'ordering_fresh'}], positions = FB.bookmarkCompositions.captureStarts('ordering_valid','first',records);
    const expected = FBDATA.startScenarios.map(function (row) { return row.id; });
    const exact = JSON.stringify(positions.ordering_fresh) === JSON.stringify(expected);
    positions.ordering_fresh.push('ordering_external_mutation');
    const repeated = FB.bookmarkCompositions.captureStarts('ordering_valid','first',records);
    const changed = rejects(function () { FB.bookmarkCompositions.captureStarts('ordering_valid','first',[{id:'ordering_changed'}]); });
    const duplicate = rejects(function () { FB.bookmarkCompositions.captureStarts('ordering_other','first',records); });
    const storyAccessors = rejects(function () { FB.bookmarkCompositions.captureStories('ordering_story_accessors','first',{ordering_accessor:accessor}); });
    const declarations = {ordering_metadata_story:{id:'ordering_metadata_story'}};
    const graphPositions = FB.bookmarkCompositions.captureStories('ordering_story_valid','first',declarations);
    const expectedStories = Object.keys(FBDATA.storyInstances);
    const exactStories = JSON.stringify(graphPositions.ordering_metadata_story) === JSON.stringify(expectedStories);
    graphPositions.ordering_metadata_story.push('ordering_external_mutation');
    const repeatedStories = FB.bookmarkCompositions.captureStories('ordering_story_valid','first',declarations);
    const changedStories = rejects(function () { FB.bookmarkCompositions.captureStories('ordering_story_valid','first',{ordering_changed_story:{id:'ordering_changed_story'}}); });
    const faithId = Object.keys(FBDATA.religions).find(function (id) {
      return Array.isArray(FBDATA.religions[id].availability && FBDATA.religions[id].availability.bookmarkIds);
    });
    const bad = {}; bad[faithId] = {bookmarkIds:['ordering_ghost_world']}; bad.ordering_missing_faith = {bookmarkIds:['ordering_other_world']};
    const badEdges = rejects(function () { FB.bookmarkCompositions.captureAvailability('ordering_bad_edges',bad); });
    const good = {}; good[faithId] = {bookmarkIds:['ordering_good_world']};
    const captured = FB.bookmarkCompositions.captureAvailability('ordering_good_edges',good);
    const edgePrefix = captured[faithId].afterBookmarkIds.slice(); captured[faithId].afterBookmarkIds.push('ordering_external_mutation');
    const repeatedEdges = FB.bookmarkCompositions.captureAvailability('ordering_good_edges',good);
    const different = {}; different[faithId] = {bookmarkIds:['ordering_changed_world']};
    const changedEdges = rejects(function () { FB.bookmarkCompositions.captureAvailability('ordering_good_edges',different); });
    return {invalid:invalid,accessors:accessors,reads:reads,changed:changed,duplicate:duplicate,badEdges:badEdges,changedEdges:changedEdges,exact:exact,
      storyAccessors:storyAccessors,exactStories:exactStories,repeatedStories:repeatedStories.ordering_metadata_story,expectedStories:expectedStories,changedStories:changedStories,
      repeated:repeated.ordering_fresh,expected:expected,edgePrefix:edgePrefix,expectedEdges:FBDATA.religions[faithId].availability.bookmarkIds,
      repeatedEdges:repeatedEdges[faithId].afterBookmarkIds,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toMatchObject({invalid:true,accessors:true,reads:0,changed:true,duplicate:true,badEdges:true,changedEdges:true,exact:true,pure:true,
    storyAccessors:true,exactStories:true,changedStories:true});
  expect(result.repeated).toEqual(result.expected);
  expect(result.edgePrefix).toEqual(result.expectedEdges);
  expect(result.repeatedEdges).toEqual(result.expectedEdges);
  expect(result.repeatedStories).toEqual(result.expectedStories);
});

test('availability capture can reference a prior staged faith without publishing it',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (inputs) {
    const a = inputs.a, b = inputs.b;
    a.catalogs.religions.harbor_belief.availability = {bookmarkIds:[a.bookmark.id]};
    FBDATA.bookmarkCompositionSources[a.id] = {source:a.source,bookmarkId:a.bookmark.id,input:a};
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const patches = FB.bookmarkCompositions.captureAvailability(b.id,{harbor_belief:{bookmarkIds:[b.bookmark.id]}});
    const detached = before === JSON.stringify(FBDATA) && !FBDATA.religions.harbor_belief;
    b.availability = patches;
    FBDATA.bookmarkCompositionSources[b.id] = {source:b.source,bookmarkId:b.bookmark.id,input:b};
    const reports = FB.bookmarkCompositions.publishPending();
    return {detached:detached,patches:patches,reports:reports.filter(function (row) { return row.id === a.id || row.id === b.id; }),
      edges:FBDATA.religions.harbor_belief.availability.bookmarkIds,pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  },{a:inputFor('harbor'),b:inputFor('dune')});
  expect(result).toMatchObject({detached:true,patches:{harbor_belief:{afterBookmarkIds:['harbor_world']}},pure:true});
  expect(result.reports.every(function (row) { return row.published; })).toBe(true);
  expect(result.edges).toEqual(['harbor_world','dune_world']);
});

test('invalid start and graph placements withhold their owners and plural edge hints do not become selectors',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const faithId = Object.keys(FBDATA.religions).find(function (id) {
      return Array.isArray(FBDATA.religions[id].availability && FBDATA.religions[id].availability.bookmarkIds);
    });
    const edges = FBDATA.religions[faithId].availability.bookmarkIds.slice(), before = JSON.stringify(FBDATA);
    input.starts[0].after = [input.starts[0].definition.id];
    const graph = JSON.parse(JSON.stringify(input.catalogs.storyInstances.harbor_existing_track)); graph.id = 'ordering_invalid_story';
    input.starts[1].storyInstances = {ordering_invalid_story:graph}; input.starts[1].definition.tracks = [graph.id];
    delete input.starts[1].definition.trackLocations;
    input.starts[1].storyAfter = {ordering_invalid_story:[graph.id]};
    input.availability = {}; input.availability[faithId] = {bookmarkIds:[input.bookmark.id],afterBookmarkIds:['ordering_absent_predecessor']};
    const ticket = FB.bookmarkCompositions.prepare(input), preview = ticket.preview(), detached = before === JSON.stringify(FBDATA), report = ticket.publish();
    return {report:report,detached:detached,preview:preview,edges:FBDATA.religions[faithId].availability.bookmarkIds,
      expected:[input.bookmark.id].concat(edges),faults:FB.mods.validate(preview)};
  },inputFor('harbor'));
  expect(result).toMatchObject({report:{published:true},detached:true,faults:[]});
  expect(result.report.starts.map(function (unit) { return unit.ready; })).toEqual([false,false,true]);
  expect(result.report.starts[0].faults.join(' ')).toContain('predecessor');
  expect(result.report.starts[1].faults.join(' ')).toContain('predecessor');
  expect(result.preview.storyInstances.ordering_invalid_story).toBeUndefined();
  expect(result.edges).toEqual(result.expected);
  expect(result.preview.startScenarios.some(function (row) { return Object.prototype.hasOwnProperty.call(row,'after'); })).toBe(false);
});

test('a placed preview retains the ordinary JSON file import contract',async function ({page},info) {
  await openGame(page,info);
  const candidate = await page.evaluate(function (input) {
    const positions = FB.bookmarkCompositions.captureStarts(input.id,'all',input.starts.map(function (unit) { return unit.definition; }));
    input.starts.forEach(function (unit) { unit.after = positions[unit.definition.id]; });
    const graph = JSON.parse(JSON.stringify(input.catalogs.storyInstances.dune_existing_track)); graph.id = 'ordering_imported_track';
    input.starts[0].storyInstances = {ordering_imported_track:graph}; input.starts[0].definition.tracks = [graph.id];
    delete input.starts[0].definition.trackLocations;
    input.starts[0].storyAfter = FB.bookmarkCompositions.captureStories(input.id,'personal',input.starts[0].storyInstances);
    const ticket = FB.bookmarkCompositions.prepare(input);
    return {report:ticket.report(),preview:ticket.preview()};
  },inputFor('dune'));
  expect(candidate.report.ready).toBe(true);
  expect(candidate.preview.startScenarios.every(function (row) { return !Object.prototype.hasOwnProperty.call(row,'after') && !Object.prototype.hasOwnProperty.call(row,'storyAfter'); })).toBe(true);
  candidate.preview.name = 'Dune placed preview';
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'dune-placed-preview.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(candidate.preview))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks.dune_world; });
  expect(await page.evaluate(function () {
    return {faults:FB.validateBookmark(FB.bookmark('dune_world')),signature:FB.mods.sig(),
      starts:FBDATA.startScenarios.filter(function (row) { return row.bookmarkIds && row.bookmarkIds[0] === 'dune_world'; }).map(function (row) { return row.id; })};
  })).toMatchObject({faults:[],signature:expect.stringMatching(/^effective-1-/),starts:examples.dune.startScenarios.map(function (row) { return row.id; })});
});
