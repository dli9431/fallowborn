'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const examples = {harbor:require('../fixtures/authoring/revision-start-tracks-harbor.json'),
  dune:require('../fixtures/authoring/revision-start-tracks-dune.json')};
const household = require('../fixtures/authoring/existing-person-harbor.json').storyInstances.harbor_existing_track;

dependsOnRuntime(__filename,['index.html','js/world.js','js/starts.js','js/stories.js','js/mods.js',
  'js/model.js','js/main.js','js/religion.js','js/systems.js','js/title_ids.js','js/climate.js',
  'js/governments.js','js/bookmark_setup.js','js/crazygames.js','js/authority.js','js/treasury.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js','js/story_household.js',
  'js/story_government_selection.js','js/story_opening_goals.js','js/story_expedition_preparation.js',
  'js/story_expedition_participation.js','js/story_household_party.js','js/household_party_camp.js',
  'js/mobile_confederations.js','js/mobile_command.js','data/mobile_confederations.js',
  'data/starts.js','data/bookmarks.js','data/bookmark_493.js','data/bookmark_493_world.js',
  'data/starts_rulers_711.js','data/starts_1241.js','data/bookmark_711.js',
  'data/bookmark_1241.js','data/bookmark_1241_operations.js','data/bookmark_1241_core_starts.js',
  'data/cultures.js','data/eras.js','data/geographies.js','data/settlements.js','data/settlements_real.js']);

for (const crazy of [false,true]) {
  test('individual start requirements isolate sibling faults on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const result = await page.evaluate(function () {
        const bookmark = FB.bookmark('493'), base = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_493'; });
        const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world, active = FB.activeBookmark;
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        const good = Object.assign({},base,{id:'requirement_good'});
        const changes = [
          {startCulture:'requirement_missing_culture'},
          {startReligion:'requirement_missing_faith'},
          {fixedProvinceId:'requirement_missing_home'},
          {profession:'requirement_missing_career'},
          {governmentForm:'requirement_missing_form'},
          {tracks:['requirement_missing_track']},
          {requirements:{provinces:['requirement_missing_county']}}
        ];
        const reports = changes.map(function (fields) {
          const bad = Object.assign({},base,{id:'requirement_bad'},fields);
          return FB.startRequirementReport(bad,bookmark);
        });
        const malformedWorld = Object.assign({},bookmark,{provinces:bookmark.provinces.map(function (row,i) {
          return i ? row : Object.assign({},row,{culture:'requirement_world_only'});
        })});
        return {good:FB.startRequirementReport(good,bookmark),
          faults:reports.map(function (report) { return report.faults.join(' '); }),
          invalid:reports.every(function (report) { return report.matches && report.applicable && !report.valid; }),
          worldIndependent:FB.startRequirementReport(good,malformedWorld).faults,
          unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
            active === FB.activeBookmark && rng === FB.getRngState() && uid === FB.getUidCounter()};
      });
      expect(result.good).toMatchObject({bookmarkId:'493',startId:'requirement_good',matches:true,applicable:true,
        valid:true,selectorFaults:[],policyFaults:[],faults:[]});
      expect(result.faults[0]).toContain('unknown culture requirement_missing_culture');
      expect(result.faults[1]).toContain('unknown or unassignable faith requirement_missing_faith');
      expect(result.faults[2]).toContain('unknown inhabited province requirement_missing_home');
      expect(result.faults[3]).toContain('unknown career requirement_missing_career');
      expect(result.faults[4]).toContain('government form requirement_missing_form is absent');
      expect(result.faults[5]).toContain('unregistered track story requirement_missing_track');
      expect(result.faults[6]).toContain('unknown provinces requirement requirement_missing_county');
      expect(result).toMatchObject({invalid:true,worldIndependent:[],unchanged:true});
    });
}

test('existing ruler and guarded-principal reports retain their canonical identity checks',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    const reports = ['roderic_711','koten_1241'].map(function (id) {
      const scenario = FBDATA.startScenarios.find(function (row) { return row.id === id; });
      const bookmark = FB.bookmark(scenario.bookmarkIds[0]);
      return {good:FB.startRequirementReport(scenario,bookmark),
        bad:FB.startRequirementReport(Object.assign({},scenario,{characterName:'Requirement mismatch'}),bookmark)};
    });
    return {reports:reports,unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  result.reports.forEach(function (row) {
    expect(row.good).toMatchObject({valid:true,applicable:true,faults:[]});
    expect(row.bad).toMatchObject({valid:false,applicable:true});
  });
  expect(result.reports[0].bad.faults.join(' ')).toContain('existing ruler identity, government and rank must match realm');
  expect(result.reports[1].bad.faults.join(' ')).toContain('original guarded principal, home, identity and storyline must match this revision');
  expect(result.unchanged).toBe(true);
});

test('an imported existing household report checks its authored person independently of its ruler sibling',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/existing-person-harbor.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks.harbor_world;
  });
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    const bookmark = FB.bookmark('harbor_world'), scenario = FBDATA.startScenarios.find(function (row) {
      return row.id === 'harbor_existing_household';
    });
    const good = FB.startRequirementReport(scenario,bookmark);
    const bad = FB.startRequirementReport(Object.assign({},scenario,{characterName:'Requirement mismatch'}),bookmark);
    const ruler = FBDATA.startScenarios.find(function (row) { return row.id === 'harbor_existing_ruler'; });
    const sibling = FB.startRequirementReport(ruler,bookmark);
    return {good:good,bad:bad,sibling:sibling,unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
      world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.good).toMatchObject({valid:true,applicable:true,faults:[]});
  expect(result.bad).toMatchObject({valid:false,applicable:true});
  expect(result.bad.faults.join(' ')).toContain('existing household person, home, identity and storyline must match this revision');
  expect(result.sibling).toMatchObject({valid:true,applicable:true,faults:[]});
  expect(result.unchanged).toBe(true);
});

test('start reports scope location and override entries while strict validation remains exhaustive',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), original = FBDATA.startScenarios, state = FB.state, world = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter(), bookmark = FB.bookmark('493');
    const base = original.find(function (row) { return row.id === 'farmer_493'; });
    const good = Object.assign({},base,{id:'requirement_good'}), bad = Object.assign({},base,{id:'requirement_bad'});
    const home = bookmark.provinces.find(function (row) { return !row.wasteland; }).id;
    const candidate = Object.assign({},bookmark,{startLocations:{requirement_good:[home],
      requirement_bad:['requirement_missing_home']},startTrackOverrides:{schema:1,entries:{
      requirement_good:{tracks:[]},requirement_bad:{tracks:['requirement_missing_track']}}}});
    let goodReport, badReport, strict;
    try {
      FBDATA.startScenarios = original.concat([good,bad]);
      goodReport = FB.startRequirementReport(good,candidate);
      badReport = FB.startRequirementReport(bad,candidate);
      strict = FB.validateBookmark(candidate);
    } finally { FBDATA.startScenarios = original; }
    const malformed = Object.assign({},bookmark,{startTrackOverrides:{schema:1,entries:{}}});
    const brokenShape = [good,bad].map(function (start) { return FB.startRequirementReport(start,malformed); });
    return {good:goodReport,bad:badReport,strict:strict,
      brokenShape:brokenShape.map(function (report) { return {valid:report.valid,policyFaults:report.policyFaults}; }),
      unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.good).toMatchObject({startId:'requirement_good',valid:true,applicable:true,faults:[]});
  expect(result.bad).toMatchObject({startId:'requirement_bad',valid:false,policyFaults:[
    'startLocations.requirement_bad: unknown inhabited province requirement_missing_home.',
    'startTrackOverrides: requirement_bad has unknown player track requirement_missing_track.'
  ]});
  expect(result.strict.join(' ')).toContain('startLocations.requirement_bad: unknown inhabited province requirement_missing_home.');
  expect(result.strict.join(' ')).toContain('startTrackOverrides: requirement_bad has unknown player track requirement_missing_track.');
  expect(result.brokenShape).toEqual([0,1].map(function () {
    return {valid:false,policyFaults:['startTrackOverrides: needs schema 1 and 1-128 scenario entries.']};
  }));
  expect(result.unchanged).toBe(true);
});

test('unpublished household tracks share detached start, story and import requirement checks',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (template) {
    const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter(), registry = FB.stories.list(), messages = JSON.stringify(FB.englishMessages());
    const bookmark = FB.bookmark('493'), home = bookmark.provinces.find(function (row) { return !row.wasteland; });
    const track = Object.assign({},template,{id:'requirement_detached_track',homeProvinceId:home.id});
    const scenario = Object.assign({},FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_493'; }),
      {id:'requirement_detached_household',fixedProvinceId:home.id,startCulture:home.culture,startReligion:home.religion,
        startAge:24,tracks:[track.id]});
    const table = {}; table[track.id] = track;
    const candidate = FB.stories.compile(Object.assign({},FBDATA.storyInstances,table));
    const detached = FB.startRequirementReport(scenario,bookmark,null,candidate);
    const missing = FB.startRequirementReport(scenario,bookmark);
    const modFaults = FB.mods.validate({startScenarios:[scenario],storyInstances:table});
    return {detached:detached,missing:missing.faults,modFaults:modFaults,published:!!FB.stories.get(track.id),
      unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && messages === JSON.stringify(FB.englishMessages()) &&
        registry.every(function (row,i) { return FB.stories.list()[i] === row; })};
  },household);
  expect(result.detached).toMatchObject({valid:true,applicable:true,faults:[]});
  expect(result.missing.join(' ')).toContain('unregistered track story requirement_detached_track');
  expect(result).toMatchObject({modFaults:[],published:false,unchanged:true});
});

test('retained worlds exclude future-only homes unless an explicit start list requires them',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (template) {
    const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const bookmark = FB.bookmark('493'), capitals = bookmark.realms.map(function (row) { return row.capital; });
    const home = bookmark.provinces.find(function (row) { return !row.wasteland && capitals.indexOf(row.id) < 0; });
    const track = Object.assign({},template,{id:'requirement_revision_track',homeProvinceId:home.id});
    const table = {}; table[track.id] = track;
    const stories = FB.stories.compile(Object.assign({},FBDATA.storyInstances,table));
    const scenario = Object.assign({},FBDATA.startScenarios.find(function (row) { return row.id === 'farmer_493'; }),
      {id:'requirement_revision_household',fixedProvinceId:home.id,startCulture:home.culture,startReligion:home.religion,
        tracks:[track.id]});
    const raw = Object.assign({},bookmark,{revision:'later',startLocations:{},startTrackOverrides:undefined,
      revisions:{baseline:{provinces:bookmark.provinces.map(function (row) {
        return row.id === home.id ? {id:row.id,wasteland:true} : row;
      })},later:{provinces:bookmark.provinces}}});
    const baseline = FB.startRequirementReport(scenario,Object.assign({},raw,{revision:'baseline'}),null,stories);
    const later = FB.startRequirementReport(scenario,raw,null,stories);
    const forced = Object.assign({},raw,{revision:'baseline',revisions:Object.assign({},raw.revisions,
      {baseline:Object.assign({},raw.revisions.baseline,{starts:[scenario.id]})})});
    const explicit = FB.startRequirementReport(scenario,forced,null,stories);
    return {baseline:baseline,later:later,explicit:explicit,
      unchanged:before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },household);
  expect(result.baseline).toMatchObject({revision:'baseline',matches:true,applicable:false,valid:true,faults:[]});
  expect(result.later).toMatchObject({revision:'later',matches:true,applicable:true,valid:true,faults:[]});
  expect(result.explicit).toMatchObject({revision:'baseline',applicable:true,valid:false});
  expect(result.explicit.faults.join(' ')).toContain('unknown inhabited province');
  expect(result.unchanged).toBe(true);
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' imported start reports agree with strict retained and fresh requirement gates',async function ({page},info) {
    await openGame(page,info);
    expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },examples[prefix])).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
      '../fixtures/authoring/revision-start-tracks-' + prefix + '.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (prefix) {
      return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix + '_world'];
    },prefix);
    const result = await page.evaluate(function (prefix) {
      const before = JSON.stringify(FBDATA), state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
      const scenario = FBDATA.startScenarios.find(function (row) { return row.id === prefix + '_household'; });
      const reports = FB.bookmarkRevisions(prefix + '_world').map(function (bookmark) {
        return {revision:bookmark.revision,report:FB.startRequirementReport(scenario,bookmark),strict:FB.validateBookmark(bookmark)};
      });
      return {reports:reports,unchanged:before === JSON.stringify(FBDATA) && state === FB.state && world === FB.world &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
    },prefix);
    expect(result.reports.map(function (row) { return [row.revision,row.report.valid,row.report.applicable,row.report.faults,row.strict]; }))
      .toEqual([['baseline',true,true,[],[]],['expanded',true,true,[],[]]]);
    expect(result.unchanged).toBe(true);
  });
}
