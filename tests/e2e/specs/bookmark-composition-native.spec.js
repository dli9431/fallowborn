'use strict';
const fs = require('fs');
const path = require('path');
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
const mergedCorrections = require('../fixtures/634-scenery-revisions/merged-corrections.json');
// Read the fingerprint owner's explicit public-root list as text. All those
// definitions, including roots omitted from effective-1 until authored, remain
// in the retained projection; no game script executes in Node.
const modSource = fs.readFileSync(path.resolve(__dirname,'../../../js/mods.js'),'utf8');
const publicRoots = Array.from(modSource.match(/const PUBLIC_KEYS = \{([\s\S]*?)\n  \};/)[1]
  .matchAll(/(\w+):true/g),function (match) { return match[1]; }).concat(['faithDefaults','defaultGeography']);
dependsOnRuntime(__filename,['index.html','js/bookmark_sources.js','js/bookmark_composition.js','js/mods.js',
  'js/main.js','js/world.js','js/starts.js','js/stories.js','js/model.js','js/bookmark_setup.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_modals.js','js/crazygames.js','js/events.js',
  'js/justice.js','js/federates.js','js/religious_institutions.js','js/story_household_refuge.js','js/story_household_party.js','js/ai_decisions.js','js/government_aristocracy.js',
  'data/bookmark_sources.js','data/bookmarks.js','data/starts.js','data/geographies.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/eras.js','data/religious_institutions.js','data/ai_decisions.js'].concat(nativeSourceFiles));

async function catalogue(page) {
  return page.evaluate(function (input) {
    const projected = {};
    input.roots.forEach(function (key) { if (Object.prototype.hasOwnProperty.call(FBDATA,key)) projected[key] = FBDATA[key]; });
    projected.bookmarks = Object.assign({},FBDATA.bookmarks);
    const current = FBDATA.bookmarks['634'], retained = Object.assign({},current);
    const legacy = current.hidden === true;
    input.corrections.publicDefinitions.forEach(function (change) {
      const root = projected[change.root], group = root && root[change.group], expected = legacy ? change.before : change.after;
      if (!group || !group[change.id] || FB.mods.fingerprint(group[change.id]) !== FB.mods.fingerprint(expected)) {
        throw new Error('Unexpected pinned public correction: ' + change.root + '.' + change.id);
      }
      if (legacy) {
        projected[change.root] = Object.assign({},root);
        projected[change.root][change.group] = Object.assign({},group);
        projected[change.root][change.group][change.id] = change.after;
      }
    });
    ['provinces','realms'].forEach(function (key) {
      retained[key] = current[key].slice();
      input.corrections[key].forEach(function (change) {
        const index = retained[key].findIndex(function (row) { return row.id === change.id; });
        const row = retained[key][index], expected = legacy ? change.before : change.after;
        Object.keys(expected).forEach(function (field) {
          if (!row || FB.mods.fingerprint(row[field]) !== FB.mods.fingerprint(expected[field])) {
            throw new Error('Unexpected pinned 634 correction: ' + key + '.' + change.id + '.' + field);
          }
        });
        if (legacy) retained[key][index] = Object.assign({},row,change.after);
      });
    });
    input.corrections.addedRealms.forEach(function (change) {
      const index = retained.realms.findIndex(function (row) { return row.id === change.after; });
      const existing = retained.realms.find(function (row) { return row.id === change.definition.id; });
      if (index < 0 || (legacy ? !!existing : FB.mods.fingerprint(retained.realms[index + 1]) !== FB.mods.fingerprint(change.definition))) {
        throw new Error('Unexpected pinned 634 court addition: ' + change.definition.id);
      }
      if (legacy) retained.realms.splice(index + 1,0,change.definition);
    });
    if (current.revision === 'scenery_protected_v1') {
      // Only the explicitly authorized addition/default is projected away.
      retained.revision = 'baseline';
      retained.revisions = Object.assign({},current.revisions);
      delete retained.revisions.scenery_protected_v1;
    }
    // The date was deliberately made selectable after this frozen fixture.
    // The comparison below separately asserts each side's actual visibility.
    retained.hidden = true;
    projected.bookmarks['634'] = retained;
    return {signature:FB.mods.fingerprint(projected),starts:FBDATA.startScenarios.map(function (row) { return row.id; }),
      declarations:Object.keys(FBDATA.storyInstances),registry:FB.stories.list().map(function (row) { return row.id; }),
      worlds:input.ids.map(function (id) { return {id:id,raw:FB.mods.fingerprint(projected.bookmarks[id]),
        revisions:FB.bookmarkRevisions(id,projected.bookmarks[id]).map(function (world) { return world.revision; }),
        faults:FB.bookmarkRevisions(id,projected.bookmarks[id]).map(function (world) { return FB.validateBookmark(world); })}; })};
  },{ids:allWorlds,roots:publicRoots,corrections:mergedCorrections});
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

test('every retained native world, start and story keeps its former complete projection fingerprint and order',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'Pinned source interception requires a served origin.');
  await withLegacy(browser,async function (oldPage) {
    await Promise.all([openGame(page,info),openGame(oldPage,info)]);
    expect(await oldPage.evaluate(function () { return FBDATA.bookmarks['634'].hidden; })).toBe(true);
    expect(await page.evaluate(function () { return FBDATA.bookmarks['634'].hidden; })).toBeUndefined();
    const actual = await catalogue(page), former = await catalogue(oldPage);
    expect(actual).toEqual(former);
    expect(await page.evaluate(function () {
      const raw = FBDATA.bookmarks['634'], fresh = raw.revisions.scenery_protected_v1;
      return {current:raw.revision,revisions:Object.keys(raw.revisions),fields:Object.keys(fresh),
        rows:fresh.provinces.map(function (row,i) {
          return JSON.stringify(row) === JSON.stringify(raw.provinces[i].wasteland
            ? Object.assign({},raw.provinces[i],{settlementPolicy:'protected'}) : raw.provinces[i]);
        }),count:fresh.provinces.length,faults:FB.validateBookmark(FB.bookmark('634'))};
    })).toEqual({current:'scenery_protected_v1',revisions:['baseline','scenery_protected_v1'],fields:['provinces'],
      rows:Array(527).fill(true),count:527,faults:[]});
    actual.worlds.forEach(function (world) { expect(world.faults.every(function (faults) { return !faults.length; })).toBe(true); });
    expect(await page.evaluate(function () {
      return FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; }).every(function (row) { return row.published; });
    })).toBe(true);
  });
});

test('guarded principal publication and detached birthplace checks use the candidate story registry',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const world = FB.bookmark('1241'), start = FBDATA.startScenarios.find(function (row) { return row.id === 'koten_1241'; });
    if (!start) return {published:false};
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), registry = FB.stories.list();
    const candidate = FB.stories.compile(FBDATA.storyInstances), without = Object.assign({},FBDATA.storyInstances);
    delete without.koten_safety_1241;
    const missing = FB.stories.compile(without), liveGet = FB.stories.get;
    let allowed, faults, report, unavailable;
    try {
      FB.stories.get = function () { return undefined; };
      allowed = FB.startProvinceAllowed(start,world,start.fixedProvinceId,candidate);
      faults = FB.mods.startDefinitionFaults(start,world,candidate);
      report = FB.startRequirementReport(start,world,null,candidate);
      unavailable = !FB.startProvinceAllowed(start,world,start.fixedProvinceId,missing);
    } finally { FB.stories.get = liveGet; }
    return {published:true,offered:world.starts.indexOf(start.id) >= 0,story:!!FB.stories.get('koten_safety_1241'),
      allowed:allowed,faults:faults,valid:report.valid,unavailable:unavailable,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter() &&
        registry.every(function (row,i) { return row === FB.stories.list()[i]; })};
  })).toEqual({published:true,offered:true,story:true,allowed:true,faults:[],valid:true,unavailable:true,pure:true});
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
    if (id === '476') {
      expect(await page.evaluate(function () {
        const live = FBDATA, before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        const valid = !!FB.validateTenureData();
        function rejected(fn) { try { fn(); return false; } catch (error) { return /unknown bookmark/.test(error.message); } }
        const explicit = rejected(function () { FB.validateTenureData(JSON.parse(JSON.stringify(live.tenureArchetypes))); });
        let detached;
        try {
          window.FBDATA = Object.assign({},live);
          detached = rejected(function () { FB.validateTenureData(); });
        } finally { window.FBDATA = live; }
        const unknown = JSON.parse(JSON.stringify(live.tenureArchetypes));
        unknown.roman_estate.selector.bookmarksAny = ['unknown_native_date'];
        return {valid:valid,explicit:explicit,detached:detached,unknown:rejected(function () { FB.validateTenureData(unknown); }),
          absent:!FBDATA.bookmarks['476'],pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      })).toEqual({valid:true,explicit:true,detached:true,unknown:true,absent:true,pure:true});
    }
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
