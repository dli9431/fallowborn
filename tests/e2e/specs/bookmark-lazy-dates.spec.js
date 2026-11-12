'use strict';
const fs = require('fs');
const path = require('path');
const {pathToFileURL} = require('url');
const {test,expect} = require('../support/fixture');
const {openTitle,targetUrl,prepareGameContent} = require('../support/game/navigation');
const {installPageGuards} = require('../support/page-contract');
const {restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {scanSource} = require('../support/source-literals');
const {gameRoot,manifestRuns,manifestFiles,routeEagerDocument} = require('../fixtures/bookmark-manifest/eager-document');

const indexText = fs.readFileSync(path.join(gameRoot,'index.html'),'utf8');
const manifestText = fs.readFileSync(path.join(gameRoot,'data/bookmark_manifest.js'),'utf8');
const runs = manifestRuns(manifestText);
const lazyFiles = manifestFiles(runs);
const lazyDates = ['476','493','568','634','711','800','1096','1204','1241'];
// The manifest's date requirements, repeated here as the reviewed contract.
const requires = {'493':['476'],'568':['476','493'],'634':['568'],'711':['476'],'800':['476'],'1204':['476'],'1241':['1204']};
const catalogRoots = ['geographies','cultures','cultureDoctrineDefaults','religions','governmentForms','legalTraditions',
  'settlementSites','settlementLayouts','administrationProfiles','aristocraticProfiles','civicProfiles','constituencyProfiles',
  'ecclesiasticalProfiles','mobileProfiles','religiousInstitutionProfiles','religiousActivities','religiousPatronage'];
dependsOnRuntime(__filename,['index.html','Dockerfile','sw.js','data/bookmark_manifest.js','data/bookmark_sources.js',
  'data/bookmarks.js','data/starts.js','js/bookmark_sources.js','js/bookmark_composition.js','js/main.js','js/mods.js',
  'data/bookmark_711_identities.js','js/episcopal_claims.js','js/industry_laws.js',
  'js/stories.js','js/world.js','js/starts.js','js/save.js','js/save_v4.js','js/ui_modals.js'].concat(lazyFiles));

function eagerScripts() {
  return Array.from(indexText.matchAll(/<script src="([^"?#]+)" defer><\/script>/g),function (match) { return match[1]; });
}
function bytes(files) { return files.reduce(function (sum,file) { return sum + fs.statSync(path.join(gameRoot,file)).size; },0); }
function closure(id) {
  const result = [];
  (function visit(date) {
    if (result.indexOf(date) >= 0) return;
    result.push(date); (requires[date] || []).forEach(visit);
  })(id);
  return result;
}
function closureFiles(id) {
  const dates = closure(id);
  return lazyFiles.filter(function (file) {
    return runs.some(function (run) {
      return run.files.some(function (row) { return row.path === file && row.dates.some(function (date) { return dates.indexOf(date) >= 0; }); });
    });
  });
}
// A separate eager reference page: every manifest script in its original
// document position, exactly the former boot.
async function withEager(browser,info,fn) {
  const context = await browser.newContext(), page = await context.newPage(), guard = installPageGuards(page);
  try {
    await routeEagerDocument(page);
    await openTitle(page,info);
    expect(await page.evaluate(function () {
      return FB.bookmarkSources.manifestReport().dates.every(function (row) { return row.loaded; });
    })).toBe(true);
    return await fn(page);
  } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
}
async function loadDates(page,ids) {
  return page.evaluate(function (ids) {
    return new Promise(function (resolve,reject) {
      FB.bookmarkSources.loadDates(ids,function (error) { if (error) reject(error); else resolve(); });
    });
  },ids);
}
async function loadState(page) {
  return page.evaluate(function () {
    const report = FB.bookmarkSources.manifestReport();
    return {loaded:report.dates.filter(function (row) { return row.loaded; }).map(function (row) { return row.id; }),
      injected:Array.prototype.map.call(document.querySelectorAll('script[data-bookmark-source]'),function (script) {
        return script.getAttribute('data-bookmark-source');
      }),faults:report.faults,publicFaults:report.publicFaults};
  });
}
// Selected-date setup, projected for comparison. Faith availability names
// only loaded dates; ids of dates absent from the lazy session are removed.
async function setupProjection(page,id,absent) {
  return page.evaluate(function (input) {
    const report = FB.game.contentReady ? FB.bookmarkCompositions.sourceReports().find(function (r) { return r.bookmarkId === input.id; }) :
      FB.bookmarkSources.prepareSetup(input.id), data = FBDATA, world = data.bookmarks[input.id];
    // Faith availability and activity openings are cross-date selector
    // lists; entries naming a date absent from the lazy session are removed.
    function normalize(root,value) {
      if (!value || typeof value !== 'object') return value;
      const copy = JSON.parse(JSON.stringify(value));
      if (root === 'religions' && copy.availability && Array.isArray(copy.availability.bookmarkIds))
        copy.availability.bookmarkIds = copy.availability.bookmarkIds.filter(function (ref) { return input.absent.indexOf(ref) < 0; });
      if ((root === 'religiousActivities' || root === 'religiousPatronage') && Array.isArray(copy.openings))
        copy.openings = copy.openings.filter(function (row) { return !row || input.absent.indexOf(row.id) < 0; });
      return copy;
    }
    const offered = data.startScenarios.filter(function (row) {
      return FB.bookmarkSources.matches(row,input.id,world.era) || JSON.stringify(world).indexOf('"' + row.id + '"') >= 0;
    });
    const text = JSON.stringify([world,offered,data.storyInstances]);
    const catalogs = {}, referenced = {};
    input.roots.forEach(function (root) {
      catalogs[root] = {}; referenced[root] = [];
      Object.keys(data[root] || {}).forEach(function (key) {
        catalogs[root][key] = FB.mods.fingerprint(normalize(root,data[root][key]) || null);
        if (text.indexOf('"' + key + '"') >= 0) referenced[root].push(key);
      });
    });
    return {published:report.published,worldFaults:report.worldFaults,
      rejected:report.starts.filter(function (row) { return !row.ready; }).map(function (row) { return row.id; }),
      world:FB.mods.fingerprint(world),revisions:FB.bookmarkRevisions(input.id).map(function (row) { return row.revision; }),
      revisionFaults:FB.bookmarkRevisions(input.id).map(function (row) { return FB.validateBookmark(row); }),
      dateStarts:FB.mods.fingerprint(offered),
      dateStories:FB.mods.fingerprint(Object.keys(data.storyInstances).filter(function (key) { return /634$/.test(key); }).map(function (key) { return [key,data.storyInstances[key]]; })),
      starts:data.startScenarios.map(function (row) { return row.id; }),startRows:FB.mods.fingerprint(data.startScenarios),
      stories:Object.keys(data.storyInstances),storyRows:FB.mods.fingerprint(data.storyInstances),
      registry:FB.stories.list().map(function (row) { return row.id; }),
      events:(data.events || []).map(function (row) { return row.id; }),catalogs:catalogs,referenced:referenced};
  },{id:id,absent:absent,roots:catalogRoots});
}
function compareSetups(lazy,eager) {
  ['published','worldFaults','rejected','world','revisions','revisionFaults','starts','startRows','stories','storyRows','registry','events']
    .forEach(function (key) { expect(lazy[key],key).toEqual(eager[key]); });
  catalogRoots.forEach(function (root) {
    // Every record both sessions publish is the same declaration.
    Object.keys(lazy.catalogs[root]).filter(function (key) { return Object.prototype.hasOwnProperty.call(eager.catalogs[root],key); })
      .forEach(function (key) { expect(lazy.catalogs[root][key],root + '.' + key).toBe(eager.catalogs[root][key]); });
    // Records only another loaded date contributes are never this date's dependency.
    Object.keys(eager.catalogs[root]).filter(function (key) { return !Object.prototype.hasOwnProperty.call(lazy.catalogs[root],key); })
      .forEach(function (key) { expect(eager.referenced[root],root + ' reference ' + key).not.toContain(key); });
    // A shared record an unloaded date would own stays in the public table
    // of this session; it is likewise never this date's dependency.
    Object.keys(lazy.catalogs[root]).filter(function (key) { return !Object.prototype.hasOwnProperty.call(eager.catalogs[root],key); })
      .forEach(function (key) { expect(lazy.referenced[root],root + ' reference ' + key).not.toContain(key); });
  });
  expect(lazy.published).toBe(true);
  expect(lazy.worldFaults).toEqual([]);
}

test('index.html loads only the eager shell while the manifest owns every per-date source',async function ({},info) {
  const eager = eagerScripts();
  // Measured from the document and file sizes before per-date loading.
  const figures = {before:{scripts:410,bytes:15170402},after:{scripts:eager.length,bytes:bytes(eager)},
    lazy:{scripts:lazyFiles.length,bytes:bytes(lazyFiles)}};
  info.annotations.push({type:'eager-script-bytes',description:JSON.stringify(figures)});
  console.log('Eager scripts before/after and lazy manifest: ' + JSON.stringify(figures));
  expect(new Set(lazyFiles).size).toBe(lazyFiles.length);
  lazyFiles.forEach(function (file) {
    expect(eager,file).not.toContain(file);
    expect(fs.existsSync(path.join(gameRoot,file)),file).toBe(true);
  });
  expect(eager.indexOf('data/bookmark_manifest.js')).toBe(eager.indexOf('js/bookmark_sources.js') + 1);
  runs.forEach(function (run) { expect(eager,run.after).toContain(run.after); });
  // Every dated world, scaffold, story and effects file outside the released
  // and shared set is lazy; the released 867/1066 contributors stay eager.
  // The 476 regional catalogues supply global legal traditions and events,
  // and the 476/711 identity declarations satisfy the globally validated
  // religious institution profiles, so those shared declarations stay eager.
  const sharedDeclarations = ['data/bookmark_476_italy.js','data/bookmark_476_dalmatia_east.js','data/bookmark_476_gaul_iberia.js',
    'data/bookmark_476_africa.js','data/bookmark_476_outer.js','data/bookmark_476_wider_identities.js','data/bookmark_711_identities.js'];
  sharedDeclarations.forEach(function (file) { expect(eager).toContain(file); });
  fs.readdirSync(path.join(gameRoot,'data')).filter(function (name) {
    return /(?:^|_)(476|493|568|634|711|800|1096|1204|1241)(?:_|\.js$)/.test(name) &&
      sharedDeclarations.indexOf('data/' + name) < 0 && !/^(lang_|music_)/.test(name);
  }).forEach(function (name) { expect(lazyFiles,'data/' + name).toContain('data/' + name); });
  ['data/story_household_effects_476_493.js','data/story_household_effects_711_800_1204.js','data/story_instances.js',
    'data/story_ruler_agendas.js'].forEach(function (file) { expect(lazyFiles).toContain(file); });
  ['data/bookmarks.js','data/bookmark_867_expansion.js','data/bookmark_1066_inhabited.js','data/bookmark_867_north_atlantic.js',
    'data/bookmark_1066_north_atlantic.js','data/starts_york_wessex_867.js','data/story_households_867.js',
    'data/starts_claimants_1066.js','data/story_households_1066.js','data/bookmark_sources.js']
    .forEach(function (file) { expect(eager).toContain(file); });
  expect(figures.after.scripts).toBeLessThan(figures.before.scripts);
  expect(figures.after.bytes).toBeLessThan(figures.before.bytes);
  // The deployment image precaches and stamps the manifest's sources.
  const docker = fs.readFileSync(path.join(gameRoot,'Dockerfile'),'utf8');
  expect(docker).toContain('manifest="$root/data/bookmark_manifest.js"');
  expect(docker).toContain('grep -o -E "\'data/[^\'?#]+\\.js\'" "$manifest" | tr -d "\'"; \\');
  expect(docker).toContain('sed -i -r "s@\'(data/[^\'?#]+\\.js)\'@\'\\1?v=$V\'@g" "$manifest"');
  const precached = new Set(Array.from(manifestText.matchAll(/'(data\/[^'?#]+\.js)'/g),function (match) { return match[1]; })
    .concat(Array.from(indexText.matchAll(/(?:src|href)="((?:css|js|data|mods)\/[^"?#]+)"/g),function (match) { return match[1]; })));
  lazyFiles.forEach(function (file) { expect(precached.has(file),file).toBe(true); });
  const stamped = manifestText.replace(/'(data\/[^'?#]+\.js)'/g,"'$1?v=test-build'");
  expect(manifestRuns(stamped).map(function (run) { return run.files.map(function (row) { return row.path; }); }))
    .toEqual(runs.map(function (run) { return run.files.map(function (row) { return row.path + '?v=test-build'; }); }));
  expect(fs.readFileSync(path.join(gameRoot,'sw.js'),'utf8')).toContain("'__FB_ASSET_LIST__'");
});

test('the loader and boot sources keep exact reviewed content-id counts',function () {
  const hooks = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/engine-ids/content-id-allowlist.json'),'utf8')).hooks;
  // The supporting jurisdiction adapters introduce no quoted literals.
  ['js/bookmark_sources.js','js/bookmark_composition.js','js/main.js'].forEach(function (file) {
    const literals = scanSource(fs.readFileSync(path.join(gameRoot,file),'utf8')).literals;
    hooks.forEach(function (hook) {
      const count = literals.filter(function (row) { return row.value === hook.id; }).length;
      expect(count,file + ': ' + hook.id).toBe(hook.uses[file] || 0);
    });
  });
});

test('the title boots without dated sources and lists every date from its canonical summary',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'The eager reference document requires a served origin.');
  await openTitle(page,info);
  const state = await loadState(page);
  expect(state).toMatchObject({loaded:[],injected:[],faults:[],publicFaults:[]});
  const lazy = await page.evaluate(function (files) {
    return {scripts:Array.prototype.map.call(document.scripts,function (row) { return (row.getAttribute('src') || '').split('?')[0]; })
      .filter(function (src) { return files.indexOf(src) >= 0; }),
      menu:FB.bookmarkSources.menuData([]).bookmarks,unavailable:FB.bookmark('1241'),reason:(function () {
        try { FB.bookmarkSources.prepareSetup('1241'); return null; } catch (error) { return error.message; }
      })()};
  },lazyFiles);
  expect(lazy.scripts).toEqual([]);
  expect(lazy.unavailable).toBeNull();
  expect(lazy.reason).toBe('Bookmark 1241 has not finished loading.');
  const eager = await withEager(browser,info,function (eagerPage) {
    return eagerPage.evaluate(function () { return FB.bookmarkSources.menuData([]).bookmarks; });
  });
  expect(lazy.menu).toEqual(eager);
  expect(lazy.menu.map(function (row) { return row.id; })).not.toContain('493');
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  for (const id of ['476','568','634','711','800','867','1066','1096','1204','1241'])
    await expect(page.locator('#bookmarklist [data-bookmark="' + id + '"]')).toBeVisible();
  await expect(page.locator('#bookmarklist [data-bookmark="493"]')).toHaveCount(0);
});

test('released 867 and 1066 compose at boot exactly as the eager catalogue',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'The eager reference document requires a served origin.');
  await openTitle(page,info);
  const lazy = {}, eager = {};
  for (const id of ['867','1066']) lazy[id] = await setupProjection(page,id,lazyDates);
  await withEager(browser,info,async function (eagerPage) {
    for (const id of ['867','1066']) eager[id] = await setupProjection(eagerPage,id,lazyDates);
  });
  ['867','1066'].forEach(function (id) { compareSetups(lazy[id],eager[id]); });
  expect((await loadState(page)).loaded).toEqual([]);
});

for (const id of lazyDates) {
  test(id + ' loads its own sources and composes exactly as the eager catalogue',async function ({page,browser},info) {
    test.skip(!info.project.name.endsWith('-served'),'The eager reference document requires a served origin.');
    await openTitle(page,info);
    await loadDates(page,[id]);
    const state = await loadState(page), expected = closureFiles(id);
    expect(state.loaded.slice().sort()).toEqual(closure(id).slice().sort());
    // Injected scripts keep the manifest's document order.
    expect(state.injected).toEqual(expected);
    expect(state.faults).toEqual([]);
    expect(state.publicFaults).toEqual([]);
    const absent = lazyDates.filter(function (date) { return state.loaded.indexOf(date) < 0; });
    const lazy = await setupProjection(page,id,absent);
    const eager = await withEager(browser,info,function (eagerPage) { return setupProjection(eagerPage,id,absent); });
    compareSetups(lazy,eager);
    if (id === '634') {
      expect(await page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll('script[data-bookmark-source]'),function (script) {
          return [script.getAttribute('data-bookmark-source'),script.async===false,script.type!=='module'];
        });
      })).toEqual(expected.map(function (file) { return [file,true,true]; }));
      await prepareGameContent(page);
      const complete = await setupProjection(page,id,absent);
      ['published','worldFaults','world','revisions','revisionFaults','dateStarts','dateStories'].forEach(function (key) {
        expect(complete[key],key).toEqual(lazy[key]);
      });
      expect(await page.evaluate(function () {
        return {fresh:FB.bookmark('634').revision,hidden:FB.bookmark('634','core_courts_v4').hidden,
          faults:FB.validateBookmark(FB.bookmark('634','core_courts_v4'))};
      })).toEqual({fresh:'core_identities_v3',hidden:true,faults:[]});
    }
  });
}

test('complete content loads every date and matches the eager catalogue and source order',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'The eager reference document requires a served origin.');
  async function catalogue(target) {
    await prepareGameContent(target);
    return target.evaluate(function () {
      function hash(textValue) {
        let value = 2166136261;
        for (let i = 0; i < textValue.length; i++) value = Math.imul(value ^ textValue.charCodeAt(i),16777619);
        return (value >>> 0).toString(16);
      }
      const roots = {}, ordered = {};
      Object.keys(FBDATA).sort().forEach(function (key) {
        try { roots[key] = FB.mods.fingerprint(FBDATA[key] === undefined ? null : FBDATA[key]); ordered[key] = hash(JSON.stringify(FBDATA[key]) || ''); }
        catch (error) { roots[key] = 'unserializable'; ordered[key] = 'unserializable'; }
      });
      return {roots:roots,ordered:ordered,starts:FBDATA.startScenarios.map(function (row) { return row.id; }),
        declarations:Object.keys(FBDATA.storyInstances),registry:FB.stories.list().map(function (row) { return row.id; }),
        events:FBDATA.events.map(function (row) { return row.id; }),bookmarks:Object.keys(FBDATA.bookmarks),
        reports:FB.bookmarkCompositions.sourceReports().filter(function (row) { return row.bookmarkId; })
          .map(function (row) { return [row.bookmarkId,row.published,row.worldFaults]; }).sort(),
        sig:FB.mods.sig(),ready:FB.game.contentReady};
    });
  }
  await openTitle(page,info);
  const lazy = await catalogue(page), state = await loadState(page);
  expect(state.loaded.slice().sort()).toEqual(lazyDates.slice().sort());
  expect(state.publicFaults).toEqual([]);
  const eager = await withEager(browser,info,catalogue);
  const differing = Object.keys(eager.roots).filter(function (key) { return lazy.roots[key] !== eager.roots[key]; });
  expect(differing).toEqual([]);
  const reordered = Object.keys(eager.ordered).filter(function (key) { return lazy.ordered[key] !== eager.ordered[key]; });
  expect(reordered).toEqual([]);
  expect(lazy).toEqual(eager);
  expect(lazy.reports.every(function (row) { return row[1] === true; })).toBe(true);
});

test('selecting a date in the picker loads only that date and its requirements',async function ({page},info) {
  await openTitle(page,info);
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="711"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
  const state = await loadState(page);
  expect(state.loaded.slice().sort()).toEqual(['476','711']);
  expect(state.injected).toEqual(closureFiles('711'));
  expect(await page.evaluate(function () {
    return {setup:FB.bookmarkSources.setupId(),active:FB.activeBookmarkId,complete:FB.game.contentReady,
      other:FB.bookmarkSources.dateLoaded('1241')};
  })).toEqual({setup:'711',active:'711',complete:false,other:false});
});

test('a file document loads a selected date without queries or network APIs',async function ({page}) {
  await page.goto(pathToFileURL(path.join(gameRoot,'index.html')).href,{waitUntil:'domcontentloaded'});
  await expect.poll(function () { return page.evaluate(function () { return !!(window.FB && FB.game && FB.game.bootReady); }); }).toBe(true);
  if (await page.locator('#music-choice:not(.hidden)').isVisible())
    await page.getByRole('button',{name:'Continue silently',exact:true}).click();
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="711"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
  expect((await loadState(page)).injected).toEqual(closureFiles('711'));
  expect(await page.evaluate(function () {
    return {setup:FB.bookmarkSources.setupId(),faults:FB.validateBookmark(FB.bookmark('711')),
      local:Array.prototype.every.call(document.querySelectorAll('script[data-bookmark-source]'),function (script) {
        return script.src.indexOf('file:') === 0 && script.src.indexOf('?') < 0;
      })};
  })).toEqual({setup:'711',faults:[],local:true});
});

test('lazy sources inherit a stamped manifest URL in an iframe',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'The staged document requires response interception.');
  const version = 'lazy-build-review';
  await page.route(function (url) { return url.pathname === '/index.html'; },function (route) {
    return route.fulfill({contentType:'text/html',body:indexText.replace('src="data/bookmark_manifest.js"',
      'src="data/bookmark_manifest.js?v=' + version + '"')});
  });
  await page.route(function (url) { return url.pathname === '/'; },function (route) {
    return route.fulfill({contentType:'text/html',body:'<iframe src="/index.html" title="Game"></iframe>'});
  });
  await page.goto(targetUrl(info),{waitUntil:'domcontentloaded'});
  const frame = page.frameLocator('iframe');
  await expect(frame.locator('#title:not(.hidden)')).toBeVisible();
  if (await frame.locator('#music-choice:not(.hidden)').isVisible())
    await frame.getByRole('button',{name:'Continue silently',exact:true}).click();
  await expect.poll(function () {
    return page.frames()[1].evaluate(function () { return !!(window.FB && FB.game && FB.game.bootReady); });
  }).toBe(true);
  await frame.getByRole('button',{name:'New Game',exact:true}).click();
  await frame.locator('#bookmarklist [data-bookmark="1096"]').click();
  await expect(frame.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
  expect(await page.frames()[1].evaluate(function (version) {
    return {setup:FB.bookmarkSources.setupId(),faults:FB.validateBookmark(FB.bookmark('1096')),
      versioned:FB.bookmarkSources.manifestReport().files.every(function (file) { return file.url === file.path + '?v=' + version; }),
      injected:Array.prototype.map.call(document.querySelectorAll('script[data-bookmark-source]'),function (script) {
        return script.getAttribute('src');
      })};
  },version)).toEqual({setup:'1096',faults:[],versioned:true,injected:closureFiles('1096').map(function (file) { return file + '?v=' + version; })});
});

test('overlapping requests serialize and preserve source fingerprints, RNG and UID',async function ({page,browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'The eager reference document requires a served origin.');
  await openTitle(page,info);
  expect(await page.evaluate(function () {
    const rng = FB.getRngState(), uid = FB.getUidCounter(), completed = [];
    function load(ids,label) {
      return new Promise(function (resolve,reject) {
        FB.bookmarkSources.loadDates(ids,function (error) { if (error) reject(error); else { completed.push(label); resolve(); } });
      });
    }
    return Promise.all([load(['1096'],'first'),load(['711'],'second'),load(['1096'],'repeat')]).then(function () {
      return {completed:completed,pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
  })).toEqual({completed:['first','second','repeat'],pure:true});
  const state = await loadState(page);
  expect(state.injected).toEqual(closureFiles('1096').concat(closureFiles('711')));
  expect(new Set(state.injected).size).toBe(state.injected.length);
  const absent = lazyDates.filter(function (id) { return state.loaded.indexOf(id) < 0; });
  const lazy = await setupProjection(page,'1096',absent);
  compareSetups(lazy,await withEager(browser,info,function (eagerPage) { return setupProjection(eagerPage,'1096',absent); }));
});

test('unloaded jurisdictions defer world references while complete mod candidates keep strict atomic validation',async function ({page},info) {
  await openTitle(page,info);
  expect(await page.evaluate(function () {
    const candidate = Object.assign({},FBDATA,{bookmarks:Object.assign({},FBDATA.bookmarks,{'1204':{id:'1204'}})});
    const claims = JSON.parse(JSON.stringify(FBDATA.episcopalClaims));
    claims.roman_temporal_rent.compensation = -1;
    return {unloaded:!FB.bookmarkSources.dateLoaded('1204'),
      claims:FB.episcopalClaims.catalogFaults(candidate),
      laws:FB.industryLaws.definitionFaults(candidate.industryLaws,candidate),
      malformed:FB.episcopalClaims.catalogFaults(Object.assign({},candidate,{episcopalClaims:claims})).length > 0};
  })).toEqual({unloaded:true,claims:[],laws:[],malformed:true});
  await prepareGameContent(page);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const claims = JSON.parse(JSON.stringify(FBDATA.episcopalClaims));
    claims.roman_temporal_rent.realmId = 'missing_temporal_see';
    const laws = JSON.parse(JSON.stringify(FBDATA.industryLaws));
    laws.london_stall_license.provinceId = 'missing_law_county';
    laws.london_market_levy.exemptions[0].id = 'missing_exempt_county';
    const mod = {name:'Invalid dated jurisdictions',episcopalClaims:claims,industryLaws:laws};
    const wire = JSON.stringify(mod), stored = localStorage.getItem('fb_mods');
    const invalidClaims = FB.episcopalClaims.catalogFaults(Object.assign({},FBDATA,{episcopalClaims:claims}));
    const invalidLaws = FB.industryLaws.definitionFaults(laws,FBDATA);
    const rejected = FB.mods.validate(mod);
    const forgedPlaceholder = FB.episcopalClaims.catalogFaults(Object.assign({},FBDATA,{bookmarks:{'1204':{id:'1204'}}}));
    return {claims:invalidClaims.length > 0,laws:invalidLaws.some(function (error) { return error.indexOf('jurisdiction') >= 0; }),
      exemption:invalidLaws.some(function (error) { return error.indexOf('exemption') >= 0; }),rejected:rejected.length > 0,
      forged:forgedPlaceholder.length > 0,pure:before === JSON.stringify(FBDATA) && wire === JSON.stringify(mod) &&
        rng === FB.getRngState() && uid === FB.getUidCounter() && stored === localStorage.getItem('fb_mods')};
  })).toEqual({claims:true,laws:true,exemption:true,rejected:true,forged:true,pure:true});
});

async function beginSelectedDate(page,id) {
  await loadDates(page,[id]);
  const setup = await page.evaluate(function (id) {
    FB.bookmarkSources.prepareSetup(id);
    const bm = FB.bookmark(id);
    FB.startProgression.noteTier(3);
    const offered = FBDATA.startScenarios.filter(function (s) {
      return !s.hidden && !s.rulerRealmId && (!s.bookmarkIds || s.bookmarkIds.indexOf(id) >= 0) &&
        (!s.eras || s.eras.indexOf(bm.era) >= 0) && (!bm.starts || bm.starts.indexOf(s.id) >= 0);
    });
    const scenario = offered.filter(function (s) { return s.profession === 'farmer'; })[0] || offered[0];
    const county = bm.provinces.filter(function (p) { return FB.startProvinceAllowed(scenario,bm,p.id); })[0];
    const family = scenario.familyPresets ? Object.keys(scenario.familyPresets)[0] : 'established';
    return {code:'LAZYDATE-' + id + '-' + scenario.id + '-' + county.id + '-m-Review-' + family};
  },id);
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(setup.code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible({timeout:60 * 1000});
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await injectBrowserHarness(page);
  await page.evaluate(function () { FB.game.setPaused(true); delete FB.state.player.flags.tutorial; });
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe(id);
}

test('loading a save of another date loads that date before restoring it',async function ({page},info) {
  await openTitle(page,info);
  await beginSelectedDate(page,'476');
  expect((await loadState(page)).loaded).toEqual(['476']);
  await page.evaluate(function () { FB.state.player.gold = Math.max(0,FB.state.player.gold - 2); });
  const expected = await facts(page), saved = await page.evaluate(function () { return FB.save.serialize(); });
  await openTitle(page,info);
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#bookmarklist [data-bookmark="1096"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
  expect((await loadState(page)).loaded).toEqual(['1096']);
  await restoreBookmark(page,saved);
  expect(await facts(page)).toEqual(expected);
  const state = await loadState(page);
  expect(state.loaded.slice().sort()).toEqual(['1096','476']);
  expect(state.injected).toEqual(closureFiles('1096').concat(closureFiles('476')));
  expect(await page.evaluate(function () {
    return {date:FB.state.start.id,setup:FB.bookmarkSources.setupId(),complete:FB.game.contentReady,
      faults:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
  })).toEqual({date:'476',setup:'476',complete:false,faults:[],valid:true});
  const resaved = await page.evaluate(function () { return FB.save.serialize(); });
  await openTitle(page,info);
  await restoreBookmark(page,resaved);
  expect(await facts(page)).toEqual(expected);
  expect((await loadState(page)).loaded).toEqual(['476']);
});

test('an installed mod and the Mods screen each load every date before complete preparation',async function ({page},info) {
  await openTitle(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await expect.poll(function () { return page.evaluate(function () { return FB.game.contentReady; }); },{timeout:60 * 1000}).toBe(true);
  expect((await loadState(page)).loaded.slice().sort()).toEqual(lazyDates.slice().sort());
  try {
    await page.locator('#modfile').setInputFiles(path.join(__dirname,'../fixtures/bookmark-manifest/lazy-mod.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await expect.poll(function () { return page.evaluate(function () { return !!(window.FB && FB.game && FB.game.bootReady); }); }).toBe(true);
    expect(await page.evaluate(function () { return FB.mods.count(); })).toBe(1);
    expect((await loadState(page)).loaded).toEqual([]);
    await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#bookmarklist [data-bookmark="867"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
    expect(await page.evaluate(function () { return {complete:FB.game.contentReady,sig:/^effective-1-/.test(FB.mods.sig()),age:FBDATA.balance.startAge}; }))
      .toEqual({complete:true,sig:true,age:29});
    expect((await loadState(page)).loaded.slice().sort()).toEqual(lazyDates.slice().sort());
  } finally {
    await page.evaluate(function () { localStorage.removeItem('fb_mods'); });
  }
});

test('a missing date source fails with a clear message and can be retried',async function ({browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'Removing one source requires a served origin.');
  const missing = 'data/bookmark_1241_scaffold_b.js';
  const context = await browser.newContext(), page = await context.newPage(), guard = installPageGuards(page);
  try {
    await page.route('**/' + missing,function (route) { return route.fulfill({status:404,contentType:'text/plain',body:''}); });
    await openTitle(page,info);
    await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#bookmarklist [data-bookmark="1241"]').click();
    await expect(page.getByRole('heading',{name:'Bookmark unavailable',exact:true})).toBeVisible({timeout:30 * 1000});
    await expect(page.locator('#gm-body')).toContainText('Bookmark data could not be loaded: ' + missing + '.');
    expect(await loadState(page)).toMatchObject({loaded:[],injected:[]});
    expect(await page.evaluate(function () {
      return {setup:FB.bookmarkSources.setupId(),complete:FB.game.contentReady,world:FB.bookmark('1241')};
    })).toEqual({setup:null,complete:false,world:null});
    await page.unroute('**/' + missing);
    await page.evaluate(function () { FB.ui.closeModal(); });
    await page.locator('#bookmarklist [data-bookmark="1241"]').click();
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible({timeout:60 * 1000});
    const state = await loadState(page);
    expect(state.loaded.slice().sort()).toEqual(closure('1241').slice().sort());
    expect(state.injected).toEqual(closureFiles('1241'));
  } finally {
    try {
      expect(guard.faults.filter(function (fault) { return fault.indexOf(missing) < 0 && fault.indexOf('404') < 0; })).toEqual([]);
      expect(guard.faults.length).toBeGreaterThan(0);
    } finally { await context.close(); }
  }
});

test('complete preparation retries a missing source without caching partial content',async function ({browser},info) {
  test.skip(!info.project.name.endsWith('-served'),'Removing one source requires a served origin.');
  const missing = 'data/bookmark_1096_scaffold_a.js';
  const context = await browser.newContext(), page = await context.newPage(), guard = installPageGuards(page);
  try {
    await page.route('**/' + missing,function (route) { return route.fulfill({status:404,contentType:'text/plain',body:''}); });
    await openTitle(page,info);
    const error = await page.evaluate(function () {
      return new Promise(function (resolve) { FB.game.prepareContent(function (error) { resolve(error && error.message); }); });
    });
    expect(error).toContain('Bookmark data could not be loaded: ' + missing + '.');
    expect((await loadState(page)).loaded).toEqual([]);
    expect(await page.evaluate(function () { return FB.game.contentReady; })).toBe(false);
    await page.unroute('**/' + missing);
    await prepareGameContent(page);
    expect(await page.evaluate(function () { return FB.game.contentReady; })).toBe(true);
    expect((await loadState(page)).loaded.slice().sort()).toEqual(lazyDates.slice().sort());
  } finally {
    try {
      expect(guard.faults.filter(function (fault) { return fault.indexOf(missing) < 0 && fault.indexOf('404') < 0; })).toEqual([]);
      expect(guard.faults.length).toBeGreaterThan(0);
    } finally { await context.close(); }
  }
});
