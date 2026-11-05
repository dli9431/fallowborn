'use strict';
const path = require('path');
const fs = require('fs');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {startDeterministicGame} = require('../support/game/start');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {installPageGuards} = require('../support/page-contract');
const fixtures = [require('../fixtures/retained-catalogue-compatibility/estuary.json'),
  require('../fixtures/retained-catalogue-compatibility/upland.json')];
const fixtureRoot = path.resolve(__dirname,'../fixtures/retained-catalogue-compatibility');

dependsOnRuntime(__filename,['index.html','js/mods.js','js/save.js','js/save_v4.js','js/main.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/title_ids.js',
  'js/stories.js','js/starts.js','js/balance.js','js/settlement.js','js/population.js',
  'js/ui_modals.js','js/crazygames.js','data/bookmark_sources.js','data/bookmarks.js',
  'data/geographies.js','data/starts.js','data/eras.js','data/cultures.js','data/map_data.js','data/distribution_crazygames.js']);

// Install an authored native source before the real manifest seals. This is
// test-only source interception, never executable metadata in ordinary JSON.
function nativeSource(input) {
  var fixture = input.fixture, options = input.options, clone = function (row) { return JSON.parse(JSON.stringify(row)); };
  var predecessor = clone(fixture.bookmark), current = clone(predecessor);
  current.revisions = current.revisions || {baseline:{}};
  current.revisions[fixture.addedRevision] = clone(fixture.fresh);
  current.revision = fixture.addedRevision;
  var declaration = {schema:1,id:fixture.bookmark.id + '_transition',bookmarkId:fixture.bookmark.id,
    retainedRevision:fixture.retainedRevision,predecessor:predecessor,current:clone(current),
    predecessorRoots:options.roots || {},addedRevisions:[fixture.addedRevision],bundled:clone(fixture.bundled)};
  if (options.phase === 'current' && options.declaration !== 'missing') {
    FB.bookmarkSources.retainCatalogueTransition(declaration);
    window.__declarationCopy = FB.bookmarkSources.retainedCatalogueTransitions().find(function (row) { return row.id === fixture.bookmark.id + '_transition'; });
    declaration.predecessor.id = 'caller_mutation';
    var called = false, invalid = Object.assign({},declaration,{callback:function () { called = true; }}), rejections = 0;
    try { FB.bookmarkSources.retainCatalogueTransition(invalid); } catch (error) { rejections++; }
    invalid = Object.assign({},declaration);
    Object.defineProperty(invalid,'callback',{enumerable:true,get:function () { called = true; return 'forged'; }});
    try { FB.bookmarkSources.retainCatalogueTransition(invalid); } catch (error) { rejections++; }
    window.__nativeGuards = {rejections:rejections,called:called};
  }
  FB.bookmarkSources.stage({source:'retained ' + fixture.bookmark.id,bookmarks:[fixture.bookmark.id],catalogs:Object.keys(fixture.catalogs)},function (data) {
    Object.keys(fixture.catalogs).forEach(function (root) { Object.assign(data[root],clone(fixture.catalogs[root])); });
    data.bookmarks[fixture.bookmark.id] = clone(options.phase === 'current' ? current : predecessor);
    data.startScenarios.push(clone(fixture.start));
    if (options.defaults) {
      data.authoringDefaults = clone(data.authoringDefaults);
      data.authoringDefaults.learning = 'byzantine';
    }
  });
  window.FBMODS = fixture.bundled.map(function (bundle) { return {id:bundle.id,name:bundle.id,data:clone(bundle.data)}; });
  if (options.bundle === 'payload') window.FBMODS[0].data.balance.startAge = 45;
  if (options.bundle === 'cosmetic') window.FBMODS[0].data.name = 'Changed inert payload';
  if (options.bundle === 'order') window.FBMODS.reverse();
}

async function installSource(page,fixture,options) {
  await page.unroute('**/data/bookmark_sources.js');
  await page.route('**/data/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    const source = (await response.text()).replace("'1241']","'1241','" + fixture.bookmark.id + "']");
    await route.fulfill({response:response,body:'(' + nativeSource.toString() + ')(' + JSON.stringify({fixture:fixture,options:options}) + ');\n' + source});
  });
}
async function importOverlay(page,name) {
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },JSON.parse(fs.readFileSync(path.join(fixtureRoot,name),'utf8')))).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(fixtureRoot,name));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function seedConfiguration(page,configuration,save) {
  await page.addInitScript(function (input) {
    if (sessionStorage.getItem('retained-fixture-seeded')) return;
    if (input.configuration[0] !== null) localStorage.setItem('fb_mods',input.configuration[0]);
    if (input.configuration[1] !== null) localStorage.setItem('fb_mods_bundled',input.configuration[1]);
    if (input.save) {
      localStorage.setItem('fb_auto',JSON.stringify(input.save));
      localStorage.setItem('fb_slot1',JSON.stringify(input.save));
    }
    sessionStorage.setItem('retained-fixture-seeded','1');
  },{configuration:configuration,save:save});
}
async function preparePredecessor(page,info,fixture,modded) {
  await installSource(page,fixture,{phase:'old'});
  if (modded !== false) await seedConfiguration(page,[JSON.stringify([fs.readFileSync(path.join(fixtureRoot,'second-overlay.json'),'utf8')]),
    JSON.stringify(fixture.bundled.map(function (row) { return row.id; }))]);
  await openGame(page,info);
}
async function finishPredecessor(page,fixture,modded) {
  if (modded !== false) {
    // One real file import per independent configuration. The initial stack
    // supplies the bundled overlays and a second raw string for order checks.
    await importOverlay(page,'household-overlay.json');
  }
  await beginBookmarkFromTitle(page,fixture.bookmark.id,fixture.start.id);
  return page.evaluate(function (fixture) {
    var s = FB.state, scenic = fixture.bookmark.provinces.filter(function (row) { return row.wasteland; })[0].id;
    s.player.gold -= 37; s.player.prestige -= 5;
    if (!FB.materializeWasteland(s,scenic,{holderId:s.holder[s.player.provinceId],ownerId:s.owner[s.player.provinceId]}))
      throw new Error('The retained ordinary region must convert');
    var save = JSON.parse(FB.save.serialize());
    if (!save.state.wastelandSettlements[scenic]) throw new Error('Missing saved conversion');
    window.__oldEnvelope = save;
    return {save:save,scenic:scenic,roots:FB.mods.retainedCatalogueRoots(),configuration:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
  },fixture);
}
async function predecessorSave(page,info,fixture,modded) {
  await preparePredecessor(page,info,fixture,modded);
  return finishPredecessor(page,fixture,modded);
}
async function currentPage(page,fixture,options,info,old) {
  if (old) await seedConfiguration(page,old.configuration,old.save);
  var roots = old ? old.roots : await page.evaluate(function () { return FB.mods.retainedCatalogueRoots(); });
  await installSource(page,fixture,Object.assign({phase:'current',roots:roots},options));
  if (info) await openGame(page,info);
  else { await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page); }
}
async function load(page,save) {
  await page.evaluate(function (data) {
    window.__retainedLoaded = false;
    if (FB.game.loadData(data,function () { FB.game.setPaused(true); window.__retainedLoaded = true; }) === false)
      throw FB.game.lastLoadError;
  },save);
  await page.waitForFunction(function () { return window.__retainedLoaded; });
}
async function retention(page,old,fixture) {
  return page.evaluate(function (input) {
    var actual = JSON.parse(FB.save.serialize()), saved = input.old.save;
    var fields = ['start','owner','holder','wastelandSettlements','population','buildings','stories','bookmarkSetup','chars','player','authority','localInstitutions'];
    return {same:fields.every(function (key) { return JSON.stringify(actual.state[key]) === JSON.stringify(saved.state[key]); }),
      rng:(actual.rng >>> 0) === (saved.rng >>> 0),uid:actual.uid === saved.uid,
      converted:!FB.world.byId[input.old.scenic].wasteland,
      current:FB.bookmark(input.fixture.bookmark.id).revision,
      retained:FB.activeBookmark.revision || 'baseline',freshPolicy:FB.bookmark(input.fixture.bookmark.id).provinces.filter(function (row) { return row.id === input.old.scenic; })[0].settlementPolicy,
      mods:actual.mods,stored:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
  },{old:old,fixture:fixture});
}

for (const fixture of fixtures) {
  test.describe(fixture.bookmark.id,function () {
  var old, resaved, sourceContext, sourcePage, sourceGuard, sourcePrepared = false;
  test.beforeAll(async function ({browser},info) {
    sourceContext = await browser.newContext(); sourcePage = await sourceContext.newPage(); sourceGuard = installPageGuards(sourcePage);
    await preparePredecessor(sourcePage,info,fixture);
    sourcePrepared = true;
  });
  test.beforeAll(async function () {
    if (!sourcePrepared) throw new Error('The predecessor source was not prepared.');
    try { old = await finishPredecessor(sourcePage,fixture); }
    finally {
      try { expect(sourceGuard.faults).toEqual([]); }
      finally { const context = sourceContext; sourceContext = null; await context.close(); }
    }
  });
  test.afterAll(async function () {
    if (sourceContext) { const context = sourceContext; sourceContext = null; await context.close(); }
  });
  test.beforeAll(async function ({browser},info) {
    if (!old) throw new Error('The predecessor envelope was not prepared.');
    const context = await browser.newContext(), source = await context.newPage(), guard = installPageGuards(source);
    try {
      await currentPage(source,fixture,null,info,old);
      await load(source,old.save);
      expect(await retention(source,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true});
      resaved = await source.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(resaved.mods).not.toBe(old.save.mods);
    } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
  });
  test('proves the actual predecessor signature and retains spent resources through Continue',async function ({page},info) {
    expect(old.save.mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
    await currentPage(page,fixture,null,info,old);
    expect(await page.evaluate(function () { return window.__nativeGuards; })).toEqual({rejections:2,called:false});
    const proof = await page.evaluate(function (data) {
      var text = JSON.stringify(data), root = FBDATA, state = FB.state, world = FB.world, registry = FB.stories.list(),
        before = JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()]);
      var result = FB.mods.saveCompatibility(data), migrated = FB.save.v4.migrate(data);
      return {result:result,other:FB.save.otherWorld(data),different:data.mods !== FB.mods.sig(),
        envelope:JSON.stringify(data) === text && migrated.mods === data.mods,
        pure:root === FBDATA && state === FB.state && world === FB.world && registry.every(function (row,i) { return row === FB.stories.list()[i]; }) &&
          before === JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter(),FB.englishMessages()])};
    },old.save);
    expect(proof).toEqual({result:{compatible:true,path:null,transition:fixture.bookmark.id + '_transition'},other:false,different:true,envelope:true,pure:true});
    await page.locator('#btn-continue').click();
    await page.waitForFunction(function (id) { return FB.state && FB.state.start.id === id; },fixture.bookmark.id);
    expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true,current:fixture.addedRevision,
      retained:fixture.retainedRevision,freshPolicy:'protected',stored:old.configuration});
  });
  test('normally re-saves the retained life and loads it on a fresh page under the same configuration',async function ({page},info) {
    await currentPage(page,fixture,null,info,old);
    await load(page,resaved);
    expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },resaved)).toEqual({compatible:true,path:null,transition:null});
    expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true,stored:old.configuration});
  });
  test('slot selection and file import finish the retained load without altering its original envelope',async function ({page},info) {
    await currentPage(page,fixture,null,info,old);
    await page.evaluate(function () {
      var original = FB.game.loadData;
      window.__finishedLoads = 0;
      FB.game.loadData = function (data,after,rollback) {
        return original(data,function () { window.__finishedLoads++; if (after) after(); },rollback);
      };
    });
    await page.evaluate(function () { FB.ui.showSaveLoad(false); });
    await page.locator('[data-slot="1"]').click();
    await page.waitForFunction(function () { return window.__finishedLoads === 1; });
    expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true,stored:old.configuration});
    await page.evaluate(function () { FB.ui.showSaveLoad(false); });
    await page.locator('#sl-import').click();
    const exportText = 'FBS1.' + Buffer.from(JSON.stringify(old.save),'utf8').toString('base64');
    await page.locator('#sl-ifile').setInputFiles({name:'retained-life.txt',mimeType:'text/plain',buffer:Buffer.from(exportText)});
    await page.locator('#sl-ifileload').click();
    await page.waitForFunction(function () { return window.__finishedLoads === 2; });
    expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true,stored:old.configuration});
  });
  test('rejects a changed native default even when that root was omitted from the saved fingerprint',async function ({page},info) {
    await currentPage(page,fixture,{defaults:true},info,old);
    expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:false,path:'catalogue.predecessorRoots.authoringDefaults',transition:null});
    expect(await page.evaluate(function (data) { return FB.game.loadData(data); },old.save)).toBe(false);
  });

  for (const selection of [['raw bytes','JSON order','same name'],['bundled payload','bundled callback','removed bundle'],['retained province','faith definition'],['unrelated public root','live balance']]) {
  test('atomically rejects ' + selection.join(', '),async function ({page},info) {
    await currentPage(page,fixture,null,info,old);
    await load(page,old.save);
    const results = await page.evaluate(function (input) {
      var data = input.data, called = false;
      function snapshot() {
        return {root:FBDATA,state:FB.state,world:FB.world,active:FB.activeBookmark,registry:FB.stories.list(),
          text:JSON.stringify([FBDATA,FB.state,FB.world.provs,FB.world.sites,FB.englishMessages(),localStorage,FB.getRngState(),FB.getUidCounter(),FB.mods.sig()])};
      }
      var cases = [
        {id:'raw bytes',change:function () { var all = JSON.parse(localStorage.fb_mods); all[0] += ' '; localStorage.fb_mods = JSON.stringify(all); }},
        {id:'JSON order',change:function () { localStorage.fb_mods = JSON.stringify(JSON.parse(localStorage.fb_mods).reverse()); }},
        {id:'same name',change:function () { var all = JSON.parse(localStorage.fb_mods), mod = JSON.parse(all[0]); mod.balance.levyPerDev++; all[0] = JSON.stringify(mod); localStorage.fb_mods = JSON.stringify(all); }},
        {id:'bundled payload',change:function () { FBMODS[0].data.balance.startAge = 44; }},
        {id:'bundled callback',change:function () { FBMODS[0].data.callback = function () { called = true; }; }},
        {id:'removed bundle',change:function () { localStorage.fb_mods_bundled = '[]'; }},
        {id:'retained province',change:function () { FBDATA.bookmarks[data.state.start.id].provinces[0].dev++; }},
        {id:'faith definition',change:function () { FBDATA.religions[FB.state.chars[FB.state.player.charId].religion].properties.head = {}; }},
        {id:'unrelated public root',change:function () { FBDATA.traits.brave.name += ' changed'; }},
        {id:'live balance',change:function () { FBDATA.balance.taxPerDev += 0.1; }}
      ];
      return cases.filter(function (row) { return input.selection.indexOf(row.id) >= 0; }).map(function (row) {
        var storage = JSON.stringify(localStorage), bundles = JSON.parse(JSON.stringify(FBMODS)),
          province = FBDATA.bookmarks[data.state.start.id].provinces[0], dev = province.dev,
          faith = FBDATA.religions[FB.state.chars[FB.state.player.charId].religion], head = faith.properties.head, brave = FBDATA.traits.brave.name, tax = FBDATA.balance.taxPerDev;
        row.change();
        var before = snapshot(), envelope = JSON.stringify(data), decision = FB.mods.saveCompatibility(data), rejected = false;
        try { FB.save.v4.migrate(data); } catch (error) { rejected = true; }
        var loaded = FB.game.loadData(data), after = snapshot();
        var pure = !called && before.root === after.root && before.state === after.state && before.world === after.world && before.active === after.active && before.text === after.text &&
          before.registry.every(function (value,i) { return value === after.registry[i]; }) && envelope === JSON.stringify(data);
        localStorage.clear(); Object.keys(JSON.parse(storage)).forEach(function (key) { localStorage.setItem(key,JSON.parse(storage)[key]); });
        window.FBMODS = bundles; province.dev = dev; faith.properties.head = head; FBDATA.traits.brave.name = brave; FBDATA.balance.taxPerDev = tax;
        return {id:row.id,decision:decision.compatible,path:decision.path,rejected:rejected,loaded:loaded,pure:pure};
      });
    },{data:old.save,selection:selection});
    for (const result of results) expect(result,result.id).toMatchObject({decision:false,path:expect.any(String),rejected:true,loaded:false,pure:true});
    expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data).compatible; },old.save)).toBe(true);
  });
  }
  registerContractCases(fixture,function () { return old; });
  });
}

function registerContractCases(fixture,getOld) {
if (fixture === fixtures[0]) test('native transition declarations fail closed for missing, ambiguous, foreign, invalid and unbounded proofs',async function ({page},info) {
  const old = getOld();
  await currentPage(page,fixture,null,info,old);
  // Exercise descriptor validation independently from the sealed source seam.
  // The ordinary JSON path cannot replace this native accessor.
  const results = await page.evaluate(function (data) {
    var original = FB.bookmarkSources.retainedCatalogueTransitions, valid = original().find(function (row) { return row.bookmarkId === data.state.start.id; }), rows, called = false;
    var cases = ['missing','ambiguous','unknown','predecessor','retained','unlisted','default','callback','limits','foreign','root missing','root forged',
      'retained list duplicate','retained list foreign','retained list malformed','retained list limit'];
    return cases.map(function (kind) {
      rows = [JSON.parse(JSON.stringify(valid))];
      if (kind === 'missing') rows = [];
      if (kind === 'ambiguous') rows.push(rows[0]);
      if (kind === 'unknown') rows[0].allowSignatures = [data.mods];
      if (kind === 'predecessor') rows[0].predecessor.realms[0].rank = 1;
      if (kind === 'retained') rows[0].current.revisions.baseline = {balance:{levyPerDev:12}};
      if (kind === 'unlisted') rows[0].addedRevisions = ['unknown'];
      if (kind === 'default') rows[0].current.revision = 'baseline';
      if (kind === 'callback') rows[0].callback = function () { called = true; throw new Error('Never call'); };
      if (kind === 'limits') rows[0].addedRevisions = ['a','b','c','d','e','f','g','h','i'];
      if (kind === 'foreign') rows[0].bookmarkId = 'foreign';
      if (kind === 'root missing') delete rows[0].predecessorRoots.authoringDefaults;
      if (kind === 'root forged') rows[0].predecessorRoots.authoringDefaults = Array(65).join('0');
      if (kind === 'retained list duplicate') rows[0].retainedRevision = [valid.retainedRevision,valid.retainedRevision];
      if (kind === 'retained list foreign') rows[0].retainedRevision = [valid.retainedRevision,'missing_revision'];
      if (kind === 'retained list malformed') rows[0].retainedRevision = [valid.retainedRevision,{}];
      if (kind === 'retained list limit') rows[0].retainedRevision = [valid.retainedRevision].concat(Array.from({length:32},function (_,i) { return 'other_' + i; }));
      FB.bookmarkSources.retainedCatalogueTransitions = function () { return rows; };
      var before = JSON.stringify([FBDATA,localStorage,FB.getRngState(),FB.getUidCounter(),FB.stories.list()]), result;
      try { result = FB.mods.saveCompatibility(data); }
      finally { FB.bookmarkSources.retainedCatalogueTransitions = original; }
      return {kind:kind,compatible:result.compatible,path:result.path,pure:!called && before === JSON.stringify([FBDATA,localStorage,FB.getRngState(),FB.getUidCounter(),FB.stories.list()])};
    });
  },old.save);
  for (const result of results) expect(result,result.kind).toMatchObject({compatible:false,path:expect.any(String),pure:true});
});

if (fixture === fixtures[1]) {
for (const selection of [['signature','edition','bookmark'],['revision','empty revision','geography','missing retained layer']]) {
test('rejects foreign save ' + selection.join(', '),async function ({page},info) {
  const old = getOld();
  await currentPage(page,fixture,null,info,old);
  const results = await page.evaluate(function (input) {
    var save = input.save, cases = input.selection;
    return cases.map(function (kind) {
      var data = JSON.parse(JSON.stringify(save)), removed;
      if (kind === 'signature') data.mods = 'effective-1-' + Array(65).join('0');
      if (kind === 'edition') data.mods = 'crazygames-content-1';
      if (kind === 'bookmark') data.state.start.id = '867';
      if (kind === 'revision') data.state.start.revision = 'baseline';
      if (kind === 'empty revision') data.state.start.revision = '';
      if (kind === 'geography') data.state.start.geography = 'europe_regional';
      if (kind === 'missing retained layer') { removed = FBDATA.bookmarks[data.state.start.id].revisions.charters_v1; delete FBDATA.bookmarks[data.state.start.id].revisions.charters_v1; }
      var before = JSON.stringify([data,FBDATA,FB.state,FB.world,localStorage,FB.getRngState(),FB.getUidCounter()]), rejected = false;
      try { FB.save.v4.migrate(data); } catch (error) { rejected = true; }
      var result = {kind:kind,rejected:rejected,loaded:FB.game.loadData(data),pure:before === JSON.stringify([data,FBDATA,FB.state,FB.world,localStorage,FB.getRngState(),FB.getUidCounter()])};
      if (removed) FBDATA.bookmarks[data.state.start.id].revisions.charters_v1 = removed;
      return result;
    });
  },{save:old.save,selection:selection});
  for (const result of results) expect(result,result.kind).toMatchObject({rejected:true,loaded:false,pure:true});
});
}
test('ordinary JSON rejects every compatibility forgery without publication',async function ({page},info) {
  const old = getOld();
  await currentPage(page,fixture,null,info,old);
  for (const index of [0,1,2,3]) await test.step('forgery ' + (index + 1),async function () {
    const forged = await page.evaluate(function (index) {
      var before = JSON.stringify([FBDATA,localStorage,FB.getRngState(),FB.getUidCounter()]);
      var attempts = [
        {retainedCatalogueTransitions:FB.bookmarkSources.retainedCatalogueTransitions()},
        {allowedSignatures:['forged']}, {saveCompatibility:{compatible:true}},
        {bookmarks:{upland_world:Object.assign({},FBDATA.bookmarks.upland_world,{retainedCatalogueTransitions:[]})}}
      ];
      var mod = attempts[index];
      return {rejected:FB.mods.validate(mod).length > 0 && FB.mods.store(JSON.stringify(mod)) === false,
        pure:before === JSON.stringify([FBDATA,localStorage,FB.getRngState(),FB.getUidCounter()])};
    },index);
    expect(forged).toEqual({rejected:true,pure:true});
  });
});
}

if (fixture === fixtures[0]) for (const bundle of ['payload','cosmetic','order']) test('changed bundled ' + bundle + ' cannot borrow a predecessor proof',async function ({page},info) {
  const old = getOld();
  await currentPage(page,fixture,{bundle:bundle},info,old);
  expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:false,path:'bundled.payloadsAndOrder',transition:null});
  expect(await page.evaluate(function (data) { return FB.game.loadData(data); },old.save)).toBe(false);
});
test('an unchanged modded catalogue loads without declarations and an additive catalogue without a declaration still rejects',async function ({page},info) {
  const old = getOld();
  await seedConfiguration(page,old.configuration,old.save);
  await installSource(page,fixture,{phase:'old'});
  await openGame(page,info);
  expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:true,path:null,transition:null});
  await load(page,old.save);
  await currentPage(page,fixture,{declaration:'missing'});
  expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:false,path:expect.any(String),transition:null});
  expect(await page.evaluate(function (data) { return FB.game.loadData(data); },old.save)).toBe(false);
});
}

test('unchanged modded controls and empty standard signatures need no transition, and failed selected-source switches roll back',async function ({page},info) {
  const fixture = fixtures[0], old = await predecessorSave(page,info,fixture,false);
  expect(old.save.mods).toBe('');
  await installSource(page,fixture,{phase:'current',roots:old.roots});
  await openTitle(page,info);
  // Start an unrelated selected-source session without full publication.
  await startDeterministicGame(page);
  await page.evaluate(function (save) {
    FB.game.setPaused(true); FB.ui.closeModal(); FB.save.serialize();
    window.__priorLife = FB.state; window.__priorData = FBDATA; window.__priorWorld = FB.world;
    window.__before = JSON.stringify([FBDATA,FB.state,FB.englishMessages(),FB.stories.list(),FB.getRngState(),FB.getUidCounter()]);
    window.__stored = JSON.stringify(localStorage);
    FB.game.loadData(Object.assign({},save,{mods:'wrong-content-signature'}));
  },old.save);
  await expect(page.locator('#genmodal:not(.hidden)')).toContainText('modded world');
  expect(await page.evaluate(function () {
    return {same:FB.state === window.__priorLife && FBDATA === window.__priorData && FB.world === window.__priorWorld,
      pure:window.__before === JSON.stringify([FBDATA,FB.state,FB.englishMessages(),FB.stories.list(),FB.getRngState(),FB.getUidCounter()]),
      storage:window.__stored === JSON.stringify(localStorage),setup:FB.bookmarkSources.setupId(),ready:FB.game.campaignReady('867'),declarations:FB.bookmarkSources.retainedCatalogueTransitions().filter(function (row) { return row.bookmarkId === 'estuary_world'; }).length};
  })).toEqual({same:true,pure:true,storage:true,setup:'867',ready:true,declarations:1});
  await page.evaluate(function () { FB.ui.closeModal(); });
  await load(page,old.save);
  expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true,converted:true,retained:'baseline',mods:''});
  expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:true,path:null,transition:null});
});

test('the CrazyGames edition retains its ordinary signature and cannot use standard catalogue transitions',async function ({page},info) {
  await mockCrazyGames(page);
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await openCrazyGame(page,info);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    var data = JSON.parse(FB.save.serialize()), before = JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
    var same = FB.mods.saveCompatibility(data), migrated = FB.save.v4.migrate(data), bad = Object.assign({},data,{mods:'effective-1-' + Array(65).join('0')}), rejected = false;
    try { FB.save.v4.migrate(bad); } catch (error) { rejected = /edition/.test(error.message); }
    return {signature:FB.mods.sig(),same:same,migrated:migrated.mods,foreign:FB.mods.saveCompatibility(bad),rejected:rejected,
      pure:before === JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()])};
  });
  expect(result).toEqual({signature:'crazygames-content-1',same:{compatible:true,path:null,transition:null},migrated:'crazygames-content-1',
    foreign:{compatible:false,path:'edition',transition:null},rejected:true,pure:true});
});
