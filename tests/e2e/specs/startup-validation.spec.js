'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const harbor = require('../fixtures/authoring/existing-person-harbor.json');

dependsOnRuntime(__filename,['index.html','js/main.js','js/world.js','js/mods.js',
  'js/stories.js','js/bookmark_composition.js','js/bookmark_sources.js','js/title_ids.js','js/systems.js',
  'js/starts.js','js/story_opening_goals.js','js/bookmark_setup.js','js/government_aristocracy.js','js/crazygames.js','js/technology.js','data/technology.js','data/bookmark_sources.js',
  'data/bookmarks.js','data/starts.js','data/bookmark_867_expansion.js','data/bookmark_867_north_atlantic.js']);

for (const crazy of [false,true]) {
  test('deferred content validation shares final start preparation on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Boot counters require source interception.');
    await page.route('**/js/main.js',async function (route) {
      const response = await route.fetch();
      function installCounters() {
        const counts = window.__startupChecks = {mandatory:0,complete:[],worlds:0,sources:[]};
        const prepare = FB.mods.prepareComposition, world = FB.validateBookmarkWorld;
        const single = FB.startRequirementReport, batch = FB.startRequirementReports;
        const compile = FB.stories.compile;
        let source = null;
        ['prepareSource','reviewSource'].forEach(function (method) {
          const original = FB.bookmarkCompositions[method];
          FB.bookmarkCompositions[method] = function (input) {
            const prior = source;
            source = {id:input.id,starts:(input.starts || []).length,compiles:0};
            counts.sources.push(source);
            try { return original.apply(this,arguments); } finally { source = prior; }
          };
        });
        FB.stories.compile = function () {
          if (source) source.compiles++;
          return compile.apply(this,arguments);
        };
        let current = null;
        FB.mods.prepareComposition = function (mod,id,base,complete) {
          const prior = current;
          current = complete ? {single:0,batches:0,worlds:0,expected:mod.startScenarios && mod.startScenarios.length
            ? FB.bookmarkRevisions(id,mod.bookmarks[id]).length : 0} : null;
          if (current) counts.complete.push(current); else counts.mandatory++;
          try { return prepare.apply(this,arguments); } finally { current = prior; }
        };
        FB.validateBookmarkWorld = function () {
          counts.worlds++; if (current) current.worlds++;
          return world.apply(this,arguments);
        };
        FB.startRequirementReport = function () {
          if (current) current.single++;
          return single.apply(this,arguments);
        };
        FB.startRequirementReports = function () {
          if (current) current.batches++;
          return batch.apply(this,arguments);
        };
      }
      await route.fulfill({response:response,body:'(' + installCounters.toString() + ')();\n' + await response.text()});
    });
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    const result = await page.evaluate(function () {
      return {ready:FB.game.bootReady,state:FB.state,counts:window.__startupChecks,
        healthy:FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; })
          .every(function (row) { return row.published && row.starts.every(function (start) { return start.ready; }); })};
    });
    expect(result).toMatchObject({ready:true,state:null,healthy:true});
    expect(result.counts.mandatory).toBeGreaterThan(0);
    expect(result.counts.worlds).toBeGreaterThan(0);
    expect(result.counts.complete.length).toBeGreaterThan(0);
    result.counts.complete.forEach(function (row) {
      expect(row).toMatchObject({single:0,worlds:0,batches:row.expected});
    });
    expect(result.counts.sources.some(function (row) { return row.starts > 10; })).toBe(true);
    result.counts.sources.forEach(function (row) {
      // Mandatory world, batched starts and final proof. Growing the start
      // catalogue must not recompile its whole graph once per start.
      expect(row.compiles,row.id).toBeLessThanOrEqual(3);
    });
  });
}

test('revision reviews share catalogue checks without retaining results between candidates or errors',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const source = FBDATA.bookmarks['867'], worlds = FB.bookmarkRevisions('867');
    const original = FB.validateTechnologyData, root = FBDATA, before = JSON.stringify(root);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    let calls = 0;
    FB.validateTechnologyData = function () { calls++; return original.apply(this,arguments); };
    try {
      const individual = worlds.map(function (world) { return FB.validateBookmarkWorld(world); });
      const individualCalls = calls;
      calls = 0;
      const batch = FB.validateBookmarkWorlds(worlds), batchCalls = calls;
      calls = 0;
      const complete = FB.validateBookmark(source), completeCalls = calls;
      const key = Object.keys(FBDATA.techDomains)[0], name = FBDATA.techDomains[key].name;
      FBDATA.techDomains[key].name = '';
      const invalidIndividual = worlds.map(function (world) { return FB.validateBookmarkWorld(world); });
      calls = 0;
      const invalidBatch = FB.validateBookmarkWorlds(worlds), invalidCalls = calls;
      FBDATA.techDomains[key].name = name;
      const repaired = FB.validateBookmarkWorlds(worlds);
      FB.validateTechnologyData = function () { throw new Error('Revision catalogue exception'); };
      let thrown = '';
      try { FB.validateBookmarkWorlds(worlds); } catch (error) { thrown = error.message; }
      FB.validateTechnologyData = original;
      const recovered = FB.validateBookmarkWorlds(worlds);
      window.FBDATA = Object.assign({},root,{techDomains:JSON.parse(JSON.stringify(root.techDomains))});
      FBDATA.techDomains[key].name = '';
      const otherCandidate = FB.validateBookmarkWorlds(worlds);
      window.FBDATA = root;
      return {individual:individual,batch:batch,individualCalls:individualCalls,batchCalls:batchCalls,
        complete:complete,completeCalls:completeCalls,invalidIndividual:invalidIndividual,invalidBatch:invalidBatch,
        invalidCalls:invalidCalls,repaired:repaired,recovered:recovered,thrown:thrown,otherCandidate:otherCandidate,
        unchanged:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { FB.validateTechnologyData = original; window.FBDATA = root; }
  });
  expect(result.individualCalls).toBeGreaterThan(1);
  expect(result).toMatchObject({batchCalls:1,completeCalls:1,invalidCalls:1,complete:[],unchanged:true});
  expect(result.batch).toEqual(result.individual);
  expect(result.invalidBatch).toEqual(result.invalidIndividual);
  expect(result.invalidBatch.every(function (faults) { return faults.some(function (fault) { return fault.indexOf('Technology domain') >= 0; }); })).toBe(true);
  expect(result.otherCandidate).toEqual(result.invalidBatch);
  expect(result.repaired).toEqual(result.individual);
  expect(result.recovered).toEqual(result.individual);
  expect(result.thrown).toBe('Revision catalogue exception');
});

test('batched start reports preserve individual faults and discard their shared world after each call',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const original = FB.titleIds.normalizeBookmark, rng = FB.getRngState(), uid = FB.getUidCounter();
    let calls = 0;
    FB.titleIds.normalizeBookmark = function () { calls++; return original.apply(this,arguments); };
    try {
      const source = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
      const worlds = [FB.bookmark('867','baseline'),FB.bookmark('867')];
      return worlds.map(function (world) {
        const starts = [source,Object.assign({},source,{fixedProvinceId:'startup_missing_county'}),
          Object.assign({},source,{requirements:{provinces:['startup_missing_county']}}),
          Object.assign({},source,{tracks:['startup_missing_story']})];
        const before = JSON.stringify([world,starts]);
        calls = 0;
        const individual = starts.map(function (start) { return FB.startRequirementReport(start,world); });
        const individualCalls = calls;
        calls = 0;
        const together = FB.startRequirementReports(starts,world), batchCalls = calls;
        // An in-place change between batches must not reuse the old projection.
        const changed = JSON.parse(JSON.stringify(world));
        FB.startRequirementReports([source],changed);
        changed.startLocations = Object.assign({},changed.startLocations);
        changed.startLocations[source.id] = ['startup_missing_county'];
        const fresh = FB.startRequirementReports([source],changed)[0];
        return {individual:individual,together:together,individualCalls:individualCalls,batchCalls:batchCalls,
          fresh:fresh,changedSingle:FB.startRequirementReport(source,changed),
          unchanged:before === JSON.stringify([world,starts]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      });
    } finally { FB.titleIds.normalizeBookmark = original; }
  });
  result.forEach(function (row) {
    expect(row.together).toEqual(row.individual);
    expect(row.individualCalls - row.batchCalls).toBeGreaterThanOrEqual(3);
    expect(row.fresh).toEqual(row.changedSingle);
    expect(row.fresh.faults.join(' ')).toContain('startup_missing_county');
    expect(row.unchanged).toBe(true);
  });
});

test('start batches reuse exact system scopes and forget disabled answers after an in-place edit',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const enabled = FB.systems.enabledForBookmark, systems = FBDATA.systems;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FBDATA.systems = Object.assign({},systems,{startup_probe:{id:'startup_probe',defaultEnabled:false}});
    const world = JSON.parse(JSON.stringify(FB.bookmark('867')));
    world.systems = Object.assign({},world.systems,{startup_probe:false});
    const farmer = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    const starts = Array.from({length:4},function () {
      return Object.assign({},farmer,{requirements:{systems:['startup_probe']}});
    });
    let scopes = {};
    FB.systems.enabledForBookmark = function (definition,id,faith,form) {
      if (id === 'startup_probe') {
        const key = JSON.stringify([faith || null,form || null]);
        scopes[key] = (scopes[key] || 0) + 1;
      }
      return enabled.apply(this,arguments);
    };
    try {
      const individual = starts.map(function (start) { return FB.startRequirementReport(start,world); });
      scopes = {};
      const before = JSON.stringify([world,starts]);
      const batch = FB.startRequirementReports(starts,world), counts = Object.values(scopes);
      const unchanged = before === JSON.stringify([world,starts]);
      world.systems.startup_probe = true;
      scopes = {};
      const changed = FB.startRequirementReports(starts,world), freshCalls = Object.keys(scopes).length;
      const fresh = starts.map(function (start) { return FB.startRequirementReport(start,world); });
      return {individual:individual,batch:batch,changed:changed,fresh:fresh,counts:counts,freshCalls:freshCalls,
        unchanged:unchanged && rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally { FBDATA.systems = systems; FB.systems.enabledForBookmark = enabled; }
  });
  expect(result.batch).toEqual(result.individual);
  expect(result.batch.every(function (row) { return row.faults.join(' ').includes('startup_probe'); })).toBe(true);
  expect(result.counts.length).toBeGreaterThan(0);
  expect(result.counts.every(function (count) { return count === 1; })).toBe(true);
  expect(result.changed).toEqual(result.fresh);
  expect(result.changed.every(function (row) { return !row.faults.join(' ').includes('startup_probe'); })).toBe(true);
  expect(result.freshCalls).toBeGreaterThan(0);
  expect(result.unchanged).toBe(true);
});

test('complete composition validation still rejects an invalid world without publishing its candidate',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (mod) {
    const live = FBDATA, before = JSON.stringify(FBDATA), registry = FB.stories.list();
    const valid = FB.mods.prepareComposition(mod,'harbor_world',live,true);
    const capital = mod.bookmarks.harbor_world.realms[0].capital;
    mod.bookmarks.harbor_world.realms[0].capital = 'startup_missing_capital';
    let fault = '';
    try { FB.mods.prepareComposition(mod,'harbor_world',live,true); }
    catch (error) { fault = error.message; }
    // Opening extensions must still inspect an older revision when the
    // selected world and the raw root are both healthy.
    const world = mod.bookmarks.harbor_world;
    world.realms[0].capital = capital;
    world.revision = 'current';
    world.revisions = {baseline:{provinces:JSON.parse(JSON.stringify(world.provinces))},current:{provinces:world.provinces}};
    world.revisions.baseline.provinces[0].settlements[0].communities = [];
    let retainedFault = '';
    try { FB.mods.prepareComposition(mod,'harbor_world',live,true); }
    catch (error) { retainedFault = error.message; }
    return {valid:!!valid.data.bookmarks.harbor_world,fault:fault,retainedFault:retainedFault,
      detached:live === FBDATA && before === JSON.stringify(FBDATA) && registry.every(function (row,i) { return FB.stories.list()[i] === row; })};
  },harbor);
  expect(result).toMatchObject({valid:true,detached:true});
  expect(result.fault).not.toBe('');
  expect(result.retainedFault).toContain('Invalid settlement community partition');
});

test('indexed story anchors preserve nested and dependency order and reject missing or cyclic anchors',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    function profile(id,extra) {
      return Object.assign({id:id,type:'opening_profile',title:'Startup order',intro:'Startup order',scenarioIds:['farmer'],
        goals:[{id:'reserve',name:'Reserve',text:'Keep a reserve.',criterion:{kind:'reserve',amount:1}}],contacts:[]},extra);
    }
    const table = {
      startup_later:profile('startup_later',{requires:['startup_anchor'],registrationAfter:'startup_anchor'}),
      startup_nested:profile('startup_nested',{registrationBefore:'startup_before'}),
      startup_before:profile('startup_before',{registrationBefore:'startup_anchor'}),
      startup_anchor:profile('startup_anchor'),
      startup_peer:profile('startup_peer',{registrationAfter:'startup_anchor'})
    };
    const before = JSON.stringify(table), registry = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
    const order = FB.stories.compile(table).list().map(function (row) { return row.id; });
    function fault(input) { try { FB.stories.compile(input); return ''; } catch (error) { return error.message; } }
    const missing = JSON.parse(before), cycle = JSON.parse(before);
    missing.startup_before.registrationBefore = 'startup_absent';
    cycle.startup_anchor.registrationBefore = 'startup_before';
    return {order:order,missing:fault(missing),cycle:fault(cycle),unchanged:before === JSON.stringify(table) &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && registry.every(function (row,i) { return FB.stories.list()[i] === row; })};
  });
  expect(result.order).toEqual(['startup_nested','startup_before','startup_anchor','startup_later','startup_peer']);
  expect(result.missing).toContain('unknown or cyclic registration anchor');
  expect(result.cycle).toMatch(/Cyclic|Unreachable/);
  expect(result.unchanged).toBe(true);
});
