'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','js/world.js','js/starts.js','js/mods.js','js/main.js',
  'js/model.js','js/stories.js','js/save.js','js/save_v4.js','js/crazygames.js',
  'js/ui_misc.js','js/ui_modals.js','js/bookmark_setup.js','js/government_aristocracy.js','js/story_household.js',
  'data/starts.js','data/bookmarks.js','data/eras.js','data/government_rollout.js',
  'data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js']);

async function dates(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}
async function codeFor(page, scenarioId) {
  return page.evaluate(function (scenarioId) {
    FB.startProgression.noteTier(3);
    const bookmark = FB.bookmark('867'), scenario = FBDATA.startScenarios.find(function (row) { return row && row.id === scenarioId; });
    const home = bookmark.provinces.find(function (p) { return FB.startProvinceAllowed(scenario,bookmark,p.id); });
    const family = scenario.familyPresets ? Object.keys(scenario.familyPresets)[0] : 'established';
    return 'ISOLATION-867-' + scenarioId + '-' + home.id + '-m-Review-' + family;
  },scenarioId);
}
async function enterCode(page, code) {
  await dates(page);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
}
async function finishStart(page) {
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

test('resolved fresh and retained worlds preserve world-only validation through every wrapper',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const raw = FBDATA.bookmarks['867'], farmer = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    const bad = Object.assign({},farmer,{id:'runtime_scope_missing_track',bookmarkIds:['867'],tracks:['runtime_unregistered_track']});
    FBDATA.startScenarios.push(bad);
    [raw].concat(Object.values(raw.revisions || {})).forEach(function (layer) {
      if (Array.isArray(layer.starts)) layer.starts.push(bad.id);
    });
    const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const worlds = [FB.bookmark('867','baseline'),FB.bookmark('867')];
    const reports = worlds.map(function (world) {
      return {revision:world.revision,world:FB.validateBookmarkWorld(world),
        healthy:FB.startRequirementReport(farmer,world).valid,
        bad:FB.startRuntimeReport(bad,world).available,
        strict:FB.validateBookmark(world).join(' ').indexOf('runtime_unregistered_track') >= 0};
    });
    const broken = Object.assign({},worlds[1],{realms:worlds[1].realms.map(function (row,index) {
      return index === 0 ? Object.assign({},row,{capital:'runtime_scope_unknown_capital'}) : row;
    })});
    let unknown = '';
    try { FB.bookmark('867','runtime_unknown_revision'); } catch (error) { unknown = error.message; }
    return {reports:reports,unknown:unknown,worldStillStrict:FB.validateBookmarkWorld(broken).length > 0,
      pure:before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.reports[0].revision).toBe('baseline');
  expect(result.reports[1].revision).not.toBe('baseline');
  result.reports.forEach(function (row) { expect(row).toMatchObject({world:[],healthy:true,bad:false,strict:true}); });
  expect(result).toMatchObject({worldStillStrict:true,pure:true});
  expect(result.unknown).toContain('runtime_unknown_revision');
});

for (const crazy of [false,true]) {
  test('dangling starts do not block healthy campaigns on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      expect(await page.evaluate(function () {
        const farmer = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
        const orphan = Object.assign({},farmer,{id:'isolation_orphan',bookmarkIds:['isolation_missing_world']});
        FBDATA.startScenarios.push(orphan);
        const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
        const strict = FB.validateBookmark(FB.bookmark('867'));
        const worlds = ['476','867','1066'].map(function (id) { return FB.validateBookmarkWorld(FB.bookmark(id)); });
        FB.startRuntimeReport(orphan,FB.bookmark('867'));
        FB.startRuntimeReport(orphan,FB.bookmark('1066'));
        const diagnostics = FB.bookmarkRuntimeDiagnostics().filter(function (row) { return row.startId === orphan.id; });
        return {strict:strict.some(function (s) { return s.indexOf('unknown bookmark isolation_missing_world') >= 0; }),
          importRejected:FB.mods.validate({startScenarios:[]}).length > 0,
          worlds:worlds,diagnostics:diagnostics.map(function (row) { return [row.kind,row.bookmarkId,row.startId]; }),
          pure:before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
      })).toEqual({strict:true,importRejected:true,worlds:[[],[],[]],diagnostics:[['start_selectors',null,'isolation_orphan']],pure:true});
      const code = await codeFor(page,'farmer');
      await enterCode(page,code);
      await finishStart(page);
      expect(await page.evaluate(function () { return [FB.state.start.id,FB.state.start.scenarioId]; })).toEqual(['867','farmer']);
    });
}

test('multi-date and malformed selectors reject only their starts and effective track overrides remain scoped',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const bookmark = FB.bookmark('867'), base = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const multi = Object.assign({},base,{id:'isolation_multi',bookmarkIds:['867','isolation_missing_world']});
    const malformed = Object.assign({},base,{id:'isolation_malformed',bookmarkIds:'867'});
    const replacement = Object.assign({},base,{id:'isolation_replacement',bookmarkIds:['867'],tracks:['isolation_missing_track']});
    const candidate = Object.assign({},bookmark,{starts:[replacement.id],startTrackOverrides:{schema:1,entries:{
      isolation_replacement:{tracks:[]}}}});
    const scoped = FB.startRuntimeReport(replacement,candidate);
    const multiWorld = Object.assign({},bookmark,{starts:[multi.id]});
    return {blocked:[FB.startRuntimeReport(multi,multiWorld).available,FB.startRuntimeReport(malformed,bookmark).available],
      replacement:scoped.available,strictImportRejected:FB.mods.validate({startScenarios:[replacement]}).length > 0,
      healthy:FB.startRuntimeReport(base,bookmark).available,
      pure:before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({blocked:[false,false],replacement:true,strictImportRejected:true,healthy:true,pure:true});
});

test('a broken sibling disappears from the picker and its code while a healthy sibling remains',async function ({page},info) {
  await openGame(page,info);
  const code = await codeFor(page,'farmer');
  await page.evaluate(function () {
    const base = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    FBDATA.startScenarios.push(Object.assign({},base,{id:'isolation_bad',bookmarkIds:['867'],profession:'isolation_missing_career'}));
    const raw = FBDATA.bookmarks['867'];
    [raw].concat(Object.values(raw.revisions || {})).forEach(function (layer) {
      if (layer && Array.isArray(layer.starts)) layer.starts = layer.starts.concat('isolation_bad');
    });
  });
  await dates(page);
  await page.locator('[data-bookmark="867"]').click();
  await expect(page.locator('[data-scenario="farmer"]')).toBeVisible();
  await expect(page.locator('[data-scenario="isolation_bad"]')).toHaveCount(0);
  expect(await page.evaluate(function () {
    const start = FBDATA.startScenarios.find(function (row) { return row.id === 'isolation_bad'; });
    const bookmark = FB.bookmark('867');
    const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.game.pending = {bookmarkId:'867',scenario:start,provinceId:'london',seed:'ISOLATION'};
    const rejected = FB.game.start() === false;
    return rejected && before === JSON.stringify(FBDATA) && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() &&
      FB.validateBookmarkWorld(bookmark).length === 0;
  })).toBe(true);
  await page.evaluate(function () { FB.ui.showScreen('title'); });
  await enterCode(page,code.replace('-farmer-','-isolation_bad-'));
  await expect(page.locator('#ng-seed-err')).toContainText('doesn’t parse');
  expect(await page.evaluate(function () { return FB.state; })).toBeNull();
});

test('Quick Start refresh hides an invalid record without hiding other beginnings',async function ({page},info) {
  await openGame(page,info);
  const badId = await page.evaluate(function () {
    const quick = FBDATA.quickStarts.find(function (row) { return row.bookmarkId === '867'; });
    const row = FBDATA.startScenarios.find(function (s) { return s.id === quick.scenarioId; });
    row.gold = 'invalid purse';
    return quick.id;
  });
  await dates(page);
  await expect(page.locator('[data-quick-start="' + badId + '"]')).toHaveCount(0);
  await page.locator('[data-bookmark="867"]').click();
  const result = await page.evaluate(function () {
    const quick = FBDATA.quickStarts.find(function (row) { return row.bookmarkId === '867'; });
    const bad = FBDATA.startScenarios.find(function (row) { return row.id === quick.scenarioId; });
    const bookmark = FB.bookmark('867');
    const first = FB.startRuntimeReport(bad,bookmark), again = FB.startRuntimeReport(bad,bookmark);
    return {blocked:!first.available && !again.available,
      diagnostics:FB.bookmarkRuntimeDiagnostics().filter(function (row) {
        return row.kind === 'start_requirements' && row.startId === bad.id && row.bookmarkId === '867';
      }).length};
  });
  expect(result).toEqual({blocked:true,diagnostics:1});
  await expect(page.locator('#scenariolist [data-scenario]').first()).toBeVisible();
});

test('a stale selected start is rechecked before changing Observe, state, RNG or uid',async function ({page},info) {
  await openGame(page,info);
  await enterCode(page,await codeFor(page,'farmer'));
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    const scenario = FB.game.pending.scenario;
    FBDATA.startScenarios = FBDATA.startScenarios.map(function (row) {
      return row.id === scenario.id ? Object.assign({},row,{gold:-1}) : row;
    });
    FB.game.observe = true;
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = FB.game.start() === false;
    return rejected && state === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter() && FB.game.observe === true;
  })).toBe(true);
});

test('broken world revisions stay scoped and a matching save restores despite unrelated start errors',async function ({page},info) {
  await openGame(page,info);
  await enterCode(page,await codeFor(page,'farmer'));
  await finishStart(page);
  const saved = await page.evaluate(function () {
    FB.state.player.gold = Math.max(0,FB.state.player.gold - 3);
    const text = FB.save.serialize();
    FBDATA.bookmarks['1066'].revision = 'isolation_missing_revision';
    FBDATA.bookmarks['867'].revisions.isolation_invalid = null;
    const base = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    FBDATA.startScenarios.push(Object.assign({},base,{id:'isolation_orphan',bookmarkIds:['isolation_missing_world']}));
    return {text:text,gold:FB.state.player.gold,revision:FB.state.start.revision};
  });
  expect(await page.evaluate(function () {
    const ids = FB.bookmarks(false).map(function (row) { return row.id; });
    const farmer = FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; });
    return {healthy:ids.indexOf('867') >= 0,broken:ids.indexOf('1066') >= 0,
      retainedHealthy:FB.startRuntimeReport(farmer,FB.bookmark('867')).available,
      strictRejects:FB.validateBookmark(FBDATA.bookmarks['867']).length > 0};
  })).toEqual({healthy:true,broken:false,retainedHealthy:true,strictRejects:true});
  await restoreBookmark(page,saved.text);
  expect(await page.evaluate(function () { return {id:FB.state.start.id,gold:FB.state.player.gold,revision:FB.state.start.revision}; }))
    .toEqual({id:'867',gold:saved.gold,revision:saved.revision});
});

test('malformed start policy blocks starts while Observe remains available in a sound world',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['867'].startTrackOverrides = null; });
  await dates(page);
  await page.locator('[data-bookmark="867"]').click();
  await expect(page.locator('#scenariolist [data-scenario]')).toHaveCount(0);
  expect(await page.evaluate(function () {
    return FB.bookmarkRuntimeDiagnostics().filter(function (row) { return row.kind === 'start_policy' && row.bookmarkId === '867'; }).length;
  })).toBe(1);
  await page.getByRole('button',{name:/Observe/}).click();
  expect(await page.evaluate(function () { return !!FB.state && FB.game.observe; })).toBe(true);
});

test('world corruption after preview rejects direct play and Observe without campaign mutation',async function ({page},info) {
  await openGame(page,info);
  await enterCode(page,await codeFor(page,'farmer'));
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    FB.activeBookmark.realms[0].capital = 'isolation_missing_capital';
    FB.game.observe = true;
    const state = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    const play = FB.game.start(), observe = FB.game.startObserve();
    return play === false && observe === false && state === FB.state && world === FB.world &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && FB.game.observe === true;
  })).toBe(true);
});
