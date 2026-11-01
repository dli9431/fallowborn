'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/existing-person-harbor.json'),
  dune:require('../fixtures/authoring/existing-person-dune.json')};

dependsOnRuntime(__filename,['index.html','js/bookmark_composition.js','js/mods.js','js/world.js',
  'js/starts.js','js/stories.js','js/story_household.js','js/story_ruler_agenda.js','js/main.js',
  'js/model.js','js/governments.js','js/title_ids.js','js/crazygames.js','js/ui_misc.js','js/ui_modals.js',
  'data/bookmarks.js','data/cultures.js','data/geographies.js','data/starts.js','data/eras.js',
  'data/bookmark_568.js','data/starts_rulers_568.js','data/story_ruler_agendas_568.js',
  'data/story_ruler_agendas_568_east.js','data/starts_rulers_568_east.js']);

function inputFor(prefix) {
  const source = JSON.parse(JSON.stringify(examples[prefix])), bookmark = source.bookmarks[prefix + '_world'];
  const catalogs = {};
  Object.keys(source).forEach(function (key) {
    if (['name','bookmarks','startScenarios'].indexOf(key) < 0) catalogs[key] = source[key];
  });
  const earlier = JSON.parse(JSON.stringify(bookmark.realms));
  earlier[0].royalCourt.members.find(function (member) { return member.id === 'chosen'; }).name = 'Earlier household record';
  bookmark.starts = []; bookmark.startLocations = {}; bookmark.revision = 'fresh';
  bookmark.revisions = {baseline:{starts:[],startLocations:{},realms:earlier},
    fresh:{starts:[],startLocations:{},realms:JSON.parse(JSON.stringify(bookmark.realms))}};
  const baseTrack = prefix + '_existing_track', freshTrack = prefix + '_fresh_track';
  const declaration = JSON.parse(JSON.stringify(catalogs.storyInstances[baseTrack]));
  declaration.id = freshTrack; declaration.title = 'A later household review';
  const units = source.startScenarios.map(function (definition,index) {
    const id = definition.id, home = definition.fixedProvinceId;
    const unit = {definition:definition,source:prefix + ':' + id,bindings:{root:{offered:false},revisions:{
      baseline:index === 1 ? {offered:true,after:[],locations:[home],trackOverride:{tracks:[baseTrack]}} :
        index === 0 ? {offered:false,locations:[home]} : {offered:false},
      fresh:{offered:true,after:source.startScenarios.slice(0,index).map(function (start) { return start.id; }),locations:[home]}
    }}};
    if (index === 1) {
      unit.storyInstances = {}; unit.storyInstances[freshTrack] = declaration;
      unit.bindings.revisions.fresh.trackOverride = {tracks:[freshTrack],trackLocations:{}};
    }
    return unit;
  });
  return {id:prefix + '_revision_bindings',source:'fixtures/authoring/existing-person-' + prefix + '.json',
    bookmark:bookmark,catalogs:catalogs,starts:units};
}

for (const prefix of ['harbor','dune']) for (const crazy of [false,true]) {
  test(prefix + ' explicit revision bindings preserve eligibility on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    const result = await page.evaluate(function (input) {
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state;
      const ticket = FB.bookmarkCompositions.prepare(input), detached = before === JSON.stringify(FBDATA), preview = ticket.preview();
      const report = ticket.publish(), published = FBDATA, repeated = FB.bookmarkCompositions.prepare(input).publish();
      const ordinary = input.starts[1].definition;
      return {report:report,detached:detached,repeated:repeated,unchanged:published === FBDATA,
        importFaults:FB.mods.validate(preview),raw:FBDATA.bookmarks[input.bookmark.id],
        revisions:FB.bookmarkRevisions(input.bookmark.id).map(function (world) {
          return {revision:world.revision,starts:world.starts,locations:world.startLocations,
            tracks:FB.startTrackSet(ordinary,world).tracks,
            faults:FB.validateBookmark(world),availability:input.starts.map(function (unit) {
              return FB.startRuntimeReport(unit.definition,world).available;
            })};
        }),pure:rng === FB.getRngState() && uid === FB.getUidCounter() && state === FB.state};
    },inputFor(prefix));
    expect(result).toMatchObject({report:{published:true},detached:true,repeated:{published:true,reused:true},
      unchanged:true,importFaults:[],pure:true});
    expect(result.report.starts.every(function (unit) { return unit.ready && !unit.faults.length; })).toBe(true);
    expect(result.raw.starts).toEqual([]);
    expect(result.raw.startLocations).toEqual({});
    expect(result.revisions[0]).toMatchObject({revision:'baseline',starts:[prefix + '_ordinary_household'],
      tracks:[prefix + '_existing_track'],faults:[],availability:[false,true,false]});
    expect(result.revisions[1]).toMatchObject({revision:'fresh',starts:examples[prefix].startScenarios.map(function (s) { return s.id; }),
      tracks:[prefix + '_fresh_track'],faults:[],availability:[true,true,true]});
  });
}

test('bad start bindings withhold only their own lists, locations and track policies',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (original) {
    function attempt(change) {
      const input = JSON.parse(JSON.stringify(original)); change(input.starts[0]);
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const ticket = FB.bookmarkCompositions.prepare(input), report = ticket.report(), preview = ticket.preview();
      return {report:report,preview:preview,validPreview:preview && FB.mods.validate(preview),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    }
    return [
      attempt(function (unit) { unit.bindings.revisions.fresh.locations = ['binding_unknown_home']; }),
      attempt(function (unit) { unit.bindings.revisions.fresh.trackOverride = {tracks:['binding_unknown_track']}; }),
      attempt(function (unit) { unit.bindings.revisions.fresh.offered = 'yes'; }),
      attempt(function (unit) { delete unit.bindings.revisions.baseline; }),
      attempt(function (unit) { unit.bindings.revisions.binding_unknown_revision = {offered:false}; }),
      attempt(function (unit) { unit.bindings.revisions.fresh.after = [unit.definition.id]; }),
      attempt(function (unit) { unit.locations = [unit.definition.fixedProvinceId]; }),
      attempt(function (unit) { unit.bindings.revisions.baseline.locations = ['binding_unknown_retained_home']; })
    ];
  },inputFor('harbor'));
  result.forEach(function (row) {
    expect(row).toMatchObject({report:{ready:true},validPreview:[],pure:true});
    expect(row.report.starts.map(function (unit) { return unit.ready; })).toEqual([false,true,true]);
    const world = row.preview.bookmarks.harbor_world;
    expect(world.revisions.fresh.starts).toEqual(['harbor_ordinary_household','harbor_existing_ruler']);
    expect(world.revisions.fresh.startLocations.harbor_existing_household).toBeUndefined();
    expect(world.revisions.fresh.startTrackOverrides.entries.harbor_existing_household).toBeUndefined();
  });
  expect(result[0].report.starts[0]).toMatchObject({revision:'fresh'});
  expect(result[0].report.starts[0].faults.join(' ')).toContain('binding_unknown_home');
  expect(result[1].report.starts[0].faults.join(' ')).toContain('binding_unknown_track');
  expect(result[7].report.starts[0]).toMatchObject({revision:'baseline'});
  expect(result[7].report.starts[0].faults.join(' ')).toContain('binding_unknown_retained_home');
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' revision binding preview imports as ordinary JSON',async function ({page},info) {
    await openGame(page,info);
    const candidate = await page.evaluate(function (input) {
      const ticket = FB.bookmarkCompositions.prepare(input);
      return {report:ticket.report(),preview:ticket.preview()};
    },inputFor(prefix));
    expect(candidate.report.ready).toBe(true);
    candidate.preview.name = prefix + ' explicit revision bindings';
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:prefix + '-bindings.json',mimeType:'application/json',
      buffer:Buffer.from(JSON.stringify(candidate.preview))});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (id) { return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[id]; },prefix + '_world');
    expect(await page.evaluate(function (prefix) {
      return FB.bookmarkRevisions(prefix + '_world').map(function (world) {
        return {starts:world.starts,faults:FB.validateBookmark(world)};
      });
    },prefix)).toEqual([{starts:[prefix + '_ordinary_household'],faults:[]},
      {starts:examples[prefix].startScenarios.map(function (s) { return s.id; }),faults:[]}]);
  });
}

test('a rejected revision-owned graph leaves no empty track-policy table behind',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    input.starts[1].storyInstances.harbor_fresh_track.type = 'binding_missing_type';
    const ticket = FB.bookmarkCompositions.prepare(input), preview = ticket.preview(), report = ticket.publish();
    return {report:report,preview:preview,importFaults:preview && FB.mods.validate(preview),
      absent:!FBDATA.storyInstances.harbor_fresh_track && !FB.stories.get('harbor_fresh_track'),
      faults:FB.bookmarkRevisions(input.bookmark.id).map(function (world) { return FB.validateBookmark(world); })};
  },inputFor('harbor'));
  expect(result).toMatchObject({report:{published:true},importFaults:[],absent:true,faults:[[],[]]});
  expect(result.report.starts.map(function (unit) { return unit.ready; })).toEqual([true,false,true]);
  expect(result.preview.bookmarks.harbor_world.revisions.baseline.starts).toEqual([]);
  expect(result.preview.bookmarks.harbor_world.revisions.fresh.starts).toEqual(['harbor_existing_household','harbor_existing_ruler']);
  expect(result.preview.bookmarks.harbor_world.revisions.baseline.startTrackOverrides).toBeUndefined();
  expect(result.preview.bookmarks.harbor_world.revisions.fresh.startTrackOverrides).toBeUndefined();
});

test('explicit bindings reproduce the current 568 retained and fresh ruler declaration exactly',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const live = FBDATA, before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const originalWorld = FBDATA.bookmarks['568'], world = JSON.parse(JSON.stringify(originalWorld));
    const definition = JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (row) { return row.id === 'sigebert_568'; })));
    function binding(layer) {
      const result = {};
      if (Array.isArray(layer.starts)) {
        const index = layer.starts.indexOf(definition.id); result.offered = index >= 0;
        if (index >= 0) result.after = layer.starts.slice(0,index);
        layer.starts = layer.starts.filter(function (id) { return id !== definition.id; });
      }
      if (layer.startLocations && Object.prototype.hasOwnProperty.call(layer.startLocations,definition.id)) {
        result.locations = layer.startLocations[definition.id]; delete layer.startLocations[definition.id];
      }
      return result;
    }
    const bindings = {root:binding(world),revisions:{}};
    Object.keys(world.revisions).forEach(function (revision) { bindings.revisions[revision] = binding(world.revisions[revision]); });
    const ticket = FB.bookmarkCompositions.prepare({id:'retained_ruler_binding_review',source:'data/story_ruler_agendas_568.js',
      bookmark:world,starts:[{definition:definition,bindings:bindings}]});
    const preview = ticket.preview(), report = ticket.publish();
    return {report:report,exact:preview && FB.mods.fingerprint(preview.bookmarks['568']) === FB.mods.fingerprint(originalWorld),
      preserved:FBDATA === live && FBDATA.bookmarks['568'] === originalWorld && before === JSON.stringify(FBDATA),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter(),
      offerings:FB.bookmarkRevisions('568').map(function (world) {
        return {revision:world.revision,offered:world.starts.indexOf(definition.id) >= 0};
      })};
  });
  expect(result).toMatchObject({report:{published:true,reused:true},exact:true,preserved:true,pure:true});
  expect(result.offerings).toEqual([{revision:'baseline',offered:false},{revision:'migration_v1',offered:false},
    {revision:'frankish_courts_v2',offered:true},{revision:'eastern_courts_v3',offered:true}]);
});
