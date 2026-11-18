'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle} = require('../support/game/navigation');
const {beginBookmark,advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {installPageGuards} = require('../support/page-contract');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const gameRoot = path.resolve(__dirname,'../../..');
const fixtureDirectory = path.resolve(__dirname,'../fixtures/authoring');
// Append registrations. Regional corrections, declarations, starts and stories
// share the canonical checks and literal value assertions below.
const fixtureFiles = [
  'world-451-corrections-c.json',
  'bookmark-451-scaffold.json'
];
const slots = ['bookmark_451','bookmark_451_composition','bookmark_451_scaffold_a','bookmark_451_scaffold_b',
  'bookmark_451_scaffold_c','bookmark_451_scaffold_d','bookmark_451_identities','bookmark_451_governments',
  'bookmark_451_presentation','starts_451','story_451','campaigns_451','events_451'];
const checkRoots = ['bookmark','cultures','religions','governmentForms','authorityOffices','mobileProfiles',
  'administrationProfiles','aristocraticProfiles','lexicons','wardrobes','historicalAmbitions','startScenarios','storyInstances'];
dependsOnRuntime(__filename,['index.html','data/bookmark_manifest.js','data/bookmark_sources.js',
  'data/bookmark_476.js','data/bookmark_476_wider.js','data/geographies.js','data/eras.js','data/technology.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/mods.js','js/main.js',
  'js/starts.js','js/stories.js','js/bookmark_setup.js','js/save.js','js/save_v4.js']
  .concat(slots.map(function (name) { return 'data/' + name + '.js'; })));

test('all regional fixtures and dated source slots are registered exactly once',async function ({page},info) {
  expect(fixtureFiles.slice().sort()).toEqual(fs.readdirSync(fixtureDirectory).filter(function (file) {
    if (file === 'world-451-corrections-c.json') return true;
    return /^bookmark-451.*\.json$/.test(file);
  }).sort());
  expect(new Set(fixtureFiles).size).toBe(fixtureFiles.length);
  await openTitle(page,info);
  const cold = await page.evaluate(function () {
    return {offered:FB.bookmarkSources.menuData().bookmarks.map(function (row) { return row.id; }),
      loaded:FB.bookmarkSources.dateLoaded('451')};
  });
  expect(cold.loaded).toBe(false);
  expect(cold.offered).not.toContain('451');
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.bookmarkSources.loadDates(['451'],function (error) { if (error) reject(error); else resolve(); });
    });
  });
  const selected = await page.evaluate(function () {
    const report = FB.bookmarkSources.prepareSetup('451'), bm = FB.bookmark('451');
    return {report:report,exists:!!bm,faults:bm && FB.validateBookmark(bm),available:FB.bookmarkAvailable('451'),
      hidden:bm && bm.hidden,coverage:FBDATA.techCoverage,technology:FBDATA.eras.late_antique.technology,
      technologyFaults:bm && FB.bookmarkTechnologyFaults(bm,'late_antique'),
      paths:Array.prototype.map.call(document.querySelectorAll('script[data-bookmark-source]'),
        function (script) { return script.getAttribute('data-bookmark-source'); }),manifest:FB.bookmarkSources.manifestReport()};
  });
  expect(selected.exists,JSON.stringify(selected.report)).toBe(true);
  expect(selected.faults).toEqual([]);
  expect(selected.available).toBe(false);
  expect(selected.hidden).toBe(true);
  expect(selected.coverage).toEqual({from:375,to:1300});
  expect(selected.technology).toEqual({from:375,to:649,startingKnowledge:'historical'});
  expect(selected.technologyFaults).toEqual([]);
  expect(selected.manifest.faults).toEqual([]);
  slots.forEach(function (name) { expect(selected.paths.filter(function (p) { return p === 'data/' + name + '.js'; })).toHaveLength(1); });
});

for (const file of fixtureFiles) {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDirectory,file),'utf8'));
  test(file + ': canonical world, declarations, starts and stories',async function ({page},info) {
    (fixture.checks || []).forEach(function (check) { expect(checkRoots).toContain(check.root || 'bookmark'); });
    await openGame(page,info);
    const result = await page.evaluate(function (fixture) {
      const bm = FB.bookmark(fixture.bookmarkId), faults = [];
      if (!bm) return {missing:FB.bookmarkSources.reports().filter(function (row) { return row.bookmarkId === '451'; })};
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      faults.push.apply(faults,FB.validateBookmark(bm));
      const regions = {};
      Object.keys(FBDATA.bookmarkRegions451).forEach(function (key) {
        const region = FBDATA.bookmarkRegions451[key];
        regions[key] = {counties:region.provinces.map(function (row) { return row.id; }),
          realms:region.realms.map(function (row) { return row.id; })};
      });
      const values = (fixture.checks || []).map(function (check) {
        let target = !check.root || check.root === 'bookmark' ? bm : FBDATA[check.root];
        check.path.forEach(function (key) {
          if (target === undefined || target === null) return;
          target = typeof key === 'string' && key.charAt(0) === '@'
            ? target.find(function (row) { return row.id === key.slice(1); }) : target[key];
        });
        return target;
      });
      const starts = (fixture.starts || []).map(function (id) {
        const definition = FBDATA.startScenarios.find(function (row) { return row.id === id; });
        return {id:id,offered:bm.starts.indexOf(id) >= 0,report:definition && FB.startRuntimeReport(definition,bm)};
      });
      const stories = (fixture.stories || []).map(function (id) {
        return {id:id,registered:!!FB.stories.get(id),attached:bm.stories.indexOf(id) >= 0 ||
          FBDATA.startScenarios.some(function (start) { return bm.starts.indexOf(start.id) >= 0 && start.tracks && start.tracks.indexOf(id) >= 0; })};
      });
      return {faults:faults,regions:regions,values:values,starts:starts,stories:stories,
        physical:FBDATA.geographies.europe_regional.provinces.concat(FBDATA.geographies.europe_regional_2.provinceAdditions)
          .map(function (row) { return row.id; }),world:bm.provinces.map(function (row) { return row.id; }),
        pack:FBDATA.eventPacks.dated_451,periodFault:FB.contentPeriodFault(FBDATA.eventPacks.dated_451),
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },fixture);
    expect(result.missing).toBeUndefined();
    expect(result.faults).toEqual([]);
    expect(result.pure).toBe(true);
    expect(result.world.slice().sort()).toEqual(result.physical.slice().sort());
    const counties = Object.keys(result.regions).reduce(function (all,key) { return all.concat(result.regions[key].counties); },[]);
    const realms = Object.keys(result.regions).reduce(function (all,key) { return all.concat(result.regions[key].realms); },[]);
    expect(new Set(counties).size).toBe(counties.length);
    expect(new Set(realms).size).toBe(realms.length);
    expect(counties.slice().sort()).toEqual(result.world.slice().sort());
    if (fixture.regions) {
      expect(Object.keys(result.regions).sort()).toEqual(Object.keys(fixture.regions).sort());
      Object.keys(fixture.regions).forEach(function (key) {
        expect(result.regions[key].counties.slice().sort()).toEqual(fixture.regions[key].counties.slice().sort());
      });
    }
    (fixture.checks || []).forEach(function (check,index) { expect(result.values[index],check.path.join('.')).toEqual(check.equals); });
    result.starts.forEach(function (row) { expect(row.offered,row.id).toBe(true);expect(row.report,row.id).toMatchObject({valid:true}); });
    result.stories.forEach(function (row) { expect(row,row.id).toMatchObject({registered:true,attached:true}); });
    expect(result.pack).toEqual({eras:['late_antique'],yearMin:451,yearMax:453});
    expect(result.periodFault).toBeFalsy();
  });
}

test('existing raw worlds and every retained revision keep their fingerprints',async function ({page,browser},info) {
  await openGame(page,info);
  async function signatures(target) {
    return target.evaluate(function () {
      return Object.keys(FBDATA.bookmarks).filter(function (id) { return id !== '451'; }).map(function (id) {
        return {id:id,raw:FB.mods.fingerprint(FBDATA.bookmarks[id]),revisions:FB.bookmarkRevisions(id).map(function (world) {
          return {id:world.revision || 'baseline',signature:FB.mods.fingerprint(world)};
        })};
      });
    });
  }
  const context = await browser.newContext(), control = await context.newPage(), guard = installPageGuards(control);
  try {
    await control.route('**/data/bookmark_manifest.js',function (route) {
      const source = fs.readFileSync(path.join(gameRoot,'data/bookmark_manifest.js'),'utf8')
        .replace(/    '451':\{[\s\S]*?requires:\['476'\]\},\r?\n/,'')
        .split('\n').filter(function (line) { return !/\['data\/[^']*451[^']*\.js',\['451'\]\]/.test(line); }).join('\n');
      return route.fulfill({status:200,contentType:'application/javascript',body:source});
    });
    await control.route('**/data/bookmark_sources.js',function (route) {
      const source = fs.readFileSync(path.join(gameRoot,'data/bookmark_sources.js'),'utf8').replace("finish(['451',","finish([");
      return route.fulfill({status:200,contentType:'application/javascript',body:source});
    });
    await openGame(control,info);
    expect(await control.evaluate(function () { return Object.keys(FBDATA.bookmarks).indexOf('451'); })).toBe(-1);
    expect(await signatures(page)).toEqual(await signatures(control));
    expect(guard.faults).toEqual([]);
  } finally { await context.close(); }
});

test('a malformed ordinary JSON bookmark replacement rejects without mutation',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const mod = {name:'Invalid regional owner',bookmarks:{'451':JSON.parse(JSON.stringify(FB.bookmark('451')))}};
    mod.bookmarks['451'].provinces[0].realm = 'missing_regional_owner';
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), state = FB.state;
    const faults = FB.mods.validate(JSON.parse(JSON.stringify(mod)));
    return {faults:faults,pure:before === JSON.stringify(FBDATA) && state === FB.state &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  });
  expect(result.faults.join('\n')).toContain('missing_regional_owner');
  expect(result.pure).toBe(true);
});

test('the generic hidden scaffold household completes a bounded journey and save replay',async function ({page},info) {
  await beginBookmark(page,info,'451','farmer_451');
  await advanceBookmark(page,10);
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  await advanceBookmark(page,8);
  const finish = await facts(page);
  await restoreBookmark(page,source);
  await advanceBookmark(page,8);
  expect(await facts(page)).toEqual(finish);
  const spent = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,spent);
  expect(await facts(page)).toEqual(finish);
});
