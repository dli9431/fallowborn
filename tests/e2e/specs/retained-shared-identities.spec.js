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
const fixtures = [require('../fixtures/retained-shared-identities/estuary.json'),
  require('../fixtures/retained-shared-identities/upland.json')];
const fixtureRoot = path.resolve(__dirname,'../fixtures/retained-shared-identities');

dependsOnRuntime(__filename,['index.html','js/mods.js','js/save.js','js/save_v4.js','js/main.js',
  'js/bookmark_sources.js','js/bookmark_composition.js','js/world.js','js/title_ids.js',
  'js/stories.js','js/starts.js','js/balance.js','js/settlement.js','js/population.js',
  'js/ui_modals.js','js/model.js','js/justice.js','js/story_household.js','js/crazygames.js','data/bookmark_sources.js','data/bookmarks.js',
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
    retainedRevision:fixture.supportedRevisions.length === 1 ? fixture.supportedRevisions[0] : fixture.supportedRevisions,predecessor:predecessor,current:clone(current),
    predecessorRoots:options.roots || {},addedRevisions:[fixture.addedRevision],bundled:clone(fixture.bundled),
    sharedDefinitions:{religions:[],legalTraditions:[],startScenarios:[{id:fixture.start.id,predecessor:clone(fixture.start),current:clone(fixture.currentStart)}]}};
  ['religions','legalTraditions'].forEach(function (root) {
    Object.keys(fixture.currentCatalogs[root]).forEach(function (id) { declaration.sharedDefinitions[root].push({id:id,predecessor:null,current:clone(fixture.currentCatalogs[root][id])}); });
  });
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
  FB.bookmarkSources.stage({source:'retained ' + fixture.bookmark.id,bookmarks:[fixture.bookmark.id],catalogs:Object.keys(fixture.catalogs).concat(['legalTraditions'])},function (data) {
    Object.keys(fixture.catalogs).forEach(function (root) { Object.assign(data[root],clone(fixture.catalogs[root])); });
    data.bookmarks[fixture.bookmark.id] = clone(options.phase === 'current' ? current : predecessor);
    data.startScenarios.push(clone(options.phase === 'current' ? fixture.currentStart : fixture.start));
    data.storyInstances[fixture.story.id] = clone(fixture.story);
    if (options.phase === 'current') Object.keys(fixture.currentCatalogs).forEach(function (root) { Object.assign(data[root],clone(fixture.currentCatalogs[root])); });
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
    return {save:save,scenic:scenic,meaning:JSON.stringify([FB.religionOf(fixture.start.startReligion,s),FB.justiceTradition(s,s.player.charId,'religious').definition]),roots:FB.mods.retainedCatalogueRoots(),configuration:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
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
      meaning:JSON.stringify([FB.religionOf(input.fixture.start.startReligion,FB.state),FB.justiceTradition(FB.state,FB.state.player.charId,'religious').definition]) === input.old.meaning,
      identity:FB.campaignStart(FB.state).startReligion === input.fixture.start.startReligion && FB.state.chars[FB.state.player.charId].religion === input.fixture.start.startReligion,
      law:FB.faithValue(FB.state,input.fixture.start.startReligion,'legalTradition').value,
      rng:(actual.rng >>> 0) === (saved.rng >>> 0),uid:actual.uid === saved.uid,
      converted:!FB.world.byId[input.old.scenic].wasteland,
      current:FB.bookmark(input.fixture.bookmark.id).revision,
      retained:FB.activeBookmark.revision || 'baseline',freshPolicy:FB.bookmark(input.fixture.bookmark.id).provinces.filter(function (row) { return row.id === input.old.scenic; })[0].settlementPolicy,
      mods:actual.mods,stored:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
  },{old:old,fixture:fixture});
}

for (const fixture of fixtures) {
  test.describe(fixture.bookmark.id,function () {
  var old, variants = {}, resaved, sourceContext, sourcePage, sourceGuard, sourcePrepared = false;
  var validationContext,validationPage,validationGuard;
  test.beforeAll(async function ({browser},info) {
    sourceContext = await browser.newContext(); sourcePage = await sourceContext.newPage(); sourceGuard = installPageGuards(sourcePage);
    await preparePredecessor(sourcePage,info,fixture);
    sourcePrepared = true;
  });
  test.beforeAll(async function () {
    if (!sourcePrepared) throw new Error('The predecessor source was not prepared.');
    old = await finishPredecessor(sourcePage,fixture);
    variants[fixture.retainedRevision] = old.save;
  });
  for (const revision of fixture.supportedRevisions.filter(function (id) { return id !== fixture.retainedRevision; })) test.beforeAll(async function () {
    await sourcePage.evaluate(function () { FB.game.toTitle(); });
    await sourcePage.evaluate(function (input) { FBDATA.bookmarks[input.id].revision = input.revision; },{id:fixture.bookmark.id,revision:revision});
    await beginBookmarkFromTitle(sourcePage,fixture.bookmark.id,fixture.start.id);
    variants[revision] = await sourcePage.evaluate(function (fixture) {
      var raw = FBDATA.bookmarks[fixture.bookmark.id], s=FB.state;
      if (fixture.bookmark.revision === undefined) delete raw.revision; else raw.revision = fixture.bookmark.revision;
      s.player.gold -= 19;
      if (s.start.revision === 'ordinary_v2') {
        var scenic=fixture.bookmark.provinces.find(function (row) { return row.wasteland; }).id;
        if (!FB.materializeWasteland(s,scenic,{holderId:s.holder[s.player.provinceId],ownerId:s.owner[s.player.provinceId]})) throw new Error('Ordinary conversion must succeed');
      }
      return JSON.parse(FB.save.serialize());
    },fixture);
  });
  test.beforeAll(async function () {
    try {
      await sourcePage.evaluate(function () { FB.game.toTitle(); });
      await beginBookmarkFromTitle(sourcePage,'867','farmer');
      variants.unaffected = await sourcePage.evaluate(function () { FB.state.player.gold-=3;return JSON.parse(FB.save.serialize()); });
      expect(sourceGuard.faults).toEqual([]);
    } finally { const context=sourceContext;sourceContext=null;await context.close(); }
  });
  test.afterAll(async function () {
    if (sourceContext) { const context = sourceContext; sourceContext = null; await context.close(); }
    if(validationContext)try {expect(validationGuard.faults).toEqual([]);}finally {await validationContext.close();}
  });
  test.beforeAll(async function ({browser},info) {
    if (!old) throw new Error('The predecessor envelope was not prepared.');
    validationContext=await browser.newContext();validationPage=await validationContext.newPage();validationGuard=installPageGuards(validationPage);
    const source=validationPage;
      await currentPage(source,fixture,null,info,old);
      await load(source,old.save);
      expect(await retention(source,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true});
      resaved = await source.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(resaved.mods).not.toBe(old.save.mods);
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
    expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,current:fixture.addedRevision,
      retained:fixture.retainedRevision,freshPolicy:'protected',stored:old.configuration});
  });
  test('normally re-saves the retained life and loads it on a fresh page under the same configuration',async function ({page},info) {
    await currentPage(page,fixture,null,info,old);
    await load(page,resaved);
    expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },resaved)).toEqual({compatible:true,path:null,transition:null});
    expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
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
    expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
    await page.evaluate(function () { FB.ui.showSaveLoad(false); });
    await page.locator('#sl-import').click();
    const exportText = 'FBS1.' + Buffer.from(JSON.stringify(old.save),'utf8').toString('base64');
    await page.locator('#sl-ifile').setInputFiles({name:'retained-life.txt',mimeType:'text/plain',buffer:Buffer.from(exportText)});
    await page.locator('#sl-ifileload').click();
    await page.waitForFunction(function () { return window.__finishedLoads === 2; });
    expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,stored:old.configuration});
  });
  test('rejects a changed native default even when that root was omitted from the saved fingerprint',async function ({page},info) {
    await currentPage(page,fixture,{defaults:true},info,old);
    expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },old.save)).toEqual({compatible:false,path:'catalogue.predecessorRoots.authoringDefaults',transition:null});
    expect(await page.evaluate(function (data) { return FB.game.loadData(data); },old.save)).toBe(false);
  });

  preparedJourney('atomic rejection journey',fixture,function () {return old;},
  [['raw bytes','JSON order','same name'],['bundled payload','bundled callback','removed bundle'],['retained province','faith definition'],['unrelated public root','live balance']].map(function (selection) {
  return {title:'atomically rejects ' + selection.join(', '),run:async function (page) {
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
  }};
  }),null,function () {return validationPage;});
  registerContractCases(fixture,function () { return old; },function () {return validationPage;});
  registerSharedCases(fixture,function () { return old; },function () { return variants; },function () {return validationPage;});
  });
}

function registerContractCases(fixture,getOld,getValidation) {
if (fixture === fixtures[0]) test('native transition declarations fail closed for missing, ambiguous, foreign, invalid and unbounded proofs',async function () {
  const page=getValidation();
  const old = getOld();
  // Exercise descriptor validation independently from the sealed source seam.
  // The ordinary JSON path cannot replace this native accessor.
  const results = await page.evaluate(function (data) {
    var original = FB.bookmarkSources.retainedCatalogueTransitions, valid = original().find(function (row) { return row.bookmarkId === data.state.start.id; }), rows, called = false;
    var firstRevision = Array.isArray(valid.retainedRevision) ? valid.retainedRevision[0] : valid.retainedRevision;
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
      if (kind === 'retained list duplicate') rows[0].retainedRevision = [firstRevision,firstRevision];
      if (kind === 'retained list foreign') rows[0].retainedRevision = [firstRevision,'missing_revision'];
      if (kind === 'retained list malformed') rows[0].retainedRevision = [firstRevision,{}];
      if (kind === 'retained list limit') rows[0].retainedRevision = [firstRevision].concat(Array.from({length:32},function (_,i) { return 'other_' + i; }));
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
test('rejects foreign save ' + selection.join(', '),async function () {
  const page=getValidation();
  const old = getOld();
  const results = await page.evaluate(function (input) {
    var save = input.save, cases = input.selection;
    return cases.map(function (kind) {
      var data = JSON.parse(JSON.stringify(save)), removed;
      if (kind === 'signature') data.mods = 'effective-1-' + Array(65).join('0');
      if (kind === 'edition') data.mods = 'crazygames-content-1';
      if (kind === 'bookmark') data.state.start.id = '867';
      if (kind === 'revision') data.state.start.revision = 'unknown_revision';
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
test('ordinary JSON rejects every compatibility forgery without publication',async function () {
  const page=getValidation();
  const old = getOld();
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
  expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true,retained:'baseline',mods:''});
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

// Each multi-load journey owns a fresh context. Prepare the native catalogue
// separately so its cold publication does not consume the restore/reload
// assertion budget; neither stage raises the default timeout.
function preparedJourney(title,fixture,getOld,body,prepare,getValidation) {
  test.describe(title,function () {
    let context,page,guard;
    test.beforeAll(async function ({browser},info) {
      if(getValidation){page=getValidation();return;}
      context=await browser.newContext();page=await context.newPage();guard=installPageGuards(page);
      await currentPage(page,fixture,null,info,getOld());
    });
    if(prepare)test.beforeAll(async function () {await prepare(page);});
    test.afterAll(async function () {
      if(context)try {expect(guard.faults).toEqual([]);}finally {await context.close();}
    });
    const phases=Array.isArray(body)?body:[{title:'preserves identity through the complete journey',run:body}];
    for(const phase of phases)test(phase.title,async function () {await phase.run(page);});
  });
}

function registerSharedCases(fixture,getOld,getVariants,getValidation) {
  for (const revision of fixture.supportedRevisions) preparedJourney('retains exact ' + revision + ' identity across fresh revision switches',fixture,getOld,async function (page) {
    const old = getOld(), envelope = getVariants()[revision];
    await load(page,envelope);
    const inspect = async function () {
      return page.evaluate(function (input) {
        var actual = JSON.parse(FB.save.serialize()), expected = input.save;
        return {same:['start','player','chars','population','stories','bookmarkSetup','owner','holder','wastelandSettlements','authority'].every(function (key) {
          return JSON.stringify(actual.state[key]) === JSON.stringify(expected.state[key]);
        }),rng:(actual.rng >>> 0) === (expected.rng >>> 0),uid:actual.uid === expected.uid,
          faith:FB.campaignStart(FB.state).startReligion,law:FB.faithValue(FB.state,FB.state.chars[FB.state.player.charId].religion,'legalTradition').value};
      },{save:envelope});
    };
    expect(await inspect()).toEqual({same:true,rng:true,uid:true,faith:fixture.start.startReligion,law:'customary'});
    await load(page,envelope);
    expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
    await page.evaluate(function () { FB.game.toTitle(); });
    await beginBookmarkFromTitle(page,fixture.bookmark.id,fixture.start.id);
    expect(await page.evaluate(function () {
      var s=FB.state,c=s.chars[s.player.charId];
      return {revision:s.start.revision,faith:c.religion,projected:FB.campaignStart(s).startReligion,law:FB.faithValue(s,c.religion,'legalTradition').value};
    })).toEqual({revision:fixture.addedRevision,faith:fixture.currentStart.startReligion,projected:fixture.currentStart.startReligion,
      law:Object.keys(fixture.currentCatalogs.legalTraditions)[0]});
    await load(page,envelope);
    expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
    const resaved=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
    expect(resaved.mods).not.toBe(envelope.mods);
    await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,resaved);
    expect(await inspect()).toMatchObject({same:true,rng:true,uid:true});
  });

  test('checks shared evidence and invalidates warmed proofs without accepting ambiguity',async function () {
    const old=getOld(),page=getValidation();
    const result=await page.evaluate(function (input) {
      var get=FB.bookmarkSources.retainedCatalogueTransitions, normalize=FB.titleIds.normalizeMod;
      var valid=get().filter(function (row) { return row.bookmarkId === input.fixture.bookmark.id; }), replays=0;
      valid[0].id += '_cache';
      FB.bookmarkSources.retainedCatalogueTransitions=function () { return valid; };
      FB.titleIds.normalizeMod=function () { replays++; return normalize.apply(this,arguments); };
      var first=FB.mods.saveCompatibility(input.save),cold=replays;replays=0;
      var warm=FB.mods.saveCompatibility(input.save),warmReplays=replays;
      FB.titleIds.normalizeMod=normalize;
      FB.bookmarkSources.retainedCatalogueTransitions=get;
      var cases=['old faith','current faith','current law','old start','current start','missing faith','foreign root','foreign start','duplicate id','count','depth','payload','duplicate proof','stale live'];
      var checks=cases.map(function (kind) {
        var rows=JSON.parse(JSON.stringify(valid)), d=rows[0].sharedDefinitions, faith=FBDATA.religions[input.fixture.start.startReligion], name=faith.name;
        if(kind==='old faith')d.religions[0].predecessor={name:'invented'};
        if(kind==='current faith')d.religions[0].current.name='altered';
        if(kind==='current law')d.legalTraditions[0].current.procedures.compensationMaxSeverity=3;
        if(kind==='old start')d.startScenarios[0].predecessor.gold++;
        if(kind==='current start')d.startScenarios[0].current.revisionIdentities[input.fixture.bookmark.id].baseline.startReligion=input.fixture.currentStart.startReligion;
        if(kind==='missing faith')d.religions=[];
        if(kind==='foreign root')d.traits=[];
        if(kind==='foreign start')d.startScenarios[0].current.bookmarkIds=['867'];
        if(kind==='duplicate id')d.religions.push(d.religions[0]);
        if(kind==='count')d.religions=Array(33).fill(d.religions[0]);
        if(kind==='depth'){var deep={};d.religions[0].current.extra=deep;for(var level=0;level<70;level++){deep.next={};deep=deep.next;}}
        if(kind==='payload')d.religions[0].current.extra='x'.repeat(4194305);
        if(kind==='duplicate proof')rows.push(rows[0]);
        if(kind==='stale live')faith.name='edited live definition';
        FB.bookmarkSources.retainedCatalogueTransitions=function () { return rows; };
        var before=JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
        try { var decision=FB.mods.saveCompatibility(input.save);
          return {kind:kind,rejected:!decision.compatible,pure:before===JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()])};
        } finally { faith.name=name; FB.bookmarkSources.retainedCatalogueTransitions=get; }
      });
      return {first:first.compatible,warm:warm.compatible,cold:cold,warmReplays:warmReplays,checks:checks};
    },{save:old.save,fixture:fixture});
    expect(result).toMatchObject({first:true,warm:true,warmReplays:0});
    expect(result.cold).toBeGreaterThan(0);
    expect(result.cold).toBeLessThanOrEqual(4*(fixture.bundled.length+2));
    for(const row of result.checks)expect(row,row.kind).toMatchObject({rejected:true,pure:true});
  });

  test('rejects malformed ordinary JSON projections purely',async function () {
    const page=getValidation();
    const rejected=await page.evaluate(function (fixture) {
      var cases=['foreign bookmark','foreign revision','unknown faith','extra field','empty','limit','not fixed','withheld malformed','compatibility','bookmark compatibility'];
      return cases.map(function (kind) {
        var start=JSON.parse(JSON.stringify(fixture.currentStart)), rows=start.revisionIdentities[fixture.bookmark.id], mod={startScenarios:[start]};
        if(kind==='foreign bookmark')start.revisionIdentities.other=rows;
        if(kind==='foreign revision')rows.unknown={startReligion:fixture.start.startReligion};
        if(kind==='unknown faith')rows.baseline.startReligion='absent_faith';
        if(kind==='extra field')rows.baseline.gold=1000;
        if(kind==='empty')start.revisionIdentities={};
        if(kind==='limit')for(var i=0;i<33;i++)rows['revision_'+i]={startReligion:fixture.start.startReligion};
        if(kind==='not fixed')delete start.fixedProvinceId;
        if(kind==='withheld malformed'){start.id='withheld_start';start.startCulture='absent_culture';}
        if(kind==='bookmark compatibility'){mod.bookmarks={};mod.bookmarks[fixture.bookmark.id]=Object.assign({},FBDATA.bookmarks[fixture.bookmark.id],{sharedDefinitions:{}});}
        if(kind==='compatibility')mod.sharedDefinitions={religions:[],legalTraditions:[],startScenarios:[]};
        var before=JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
        return {kind:kind,rejected:FB.mods.validate(mod).length>0,pure:before===JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()])};
      });
    },fixture);
    for(const row of rejected)expect(row,row.kind).toMatchObject({rejected:true,pure:true});
  });

  preparedJourney('imports revision identities as ordinary JSON with current signatures',fixture,getOld,async function (page) {
    const old=getOld();
    expect(await page.evaluate(function (save) {return FB.mods.saveCompatibility(save).compatible;},old.save)).toBe(false);
    await beginBookmarkFromTitle(page,fixture.bookmark.id,fixture.start.id);
    const fresh=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
    expect(fresh.state.chars[fresh.state.player.charId].religion).toBe(fixture.currentStart.startReligion);
    await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,fresh);
    expect(await page.evaluate(function () {return FB.campaignStart(FB.state).startReligion;})).toBe(fixture.currentStart.startReligion);
  },async function (page) {
    await importOverlay(page,fixture===fixtures[0]?'estuary-projection.json':'upland-projection.json');
  });

  preparedJourney('preserves an unrelated-date modded predecessor through re-save and reload',fixture,getOld,async function (page) {
    const old=getOld(),save=getVariants().unaffected;
    await load(page,save);
    const next=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
    for(const field of ['start','chars','player','population','stories','authority'])expect(next.state[field]).toEqual(save.state[field]);
    expect(next.rng>>>0).toBe(save.rng>>>0);expect(next.uid).toBe(save.uid);expect(next.mods).not.toBe(save.mods);
    await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,next);
    expect(await page.evaluate(function () {return FB.state.start.id;})).toBe('867');
  });

  if(fixture===fixtures[0])test('restores an unstamped baseline without adopting the fresh faith',async function ({page},info) {
    const old=getOld(),legacy=JSON.parse(JSON.stringify(old.save));delete legacy.state.start.revision;
    await currentPage(page,fixture,null,info,old);
    expect(await page.evaluate(function (save) { return FB.save.isSupported(save); },legacy)).toBe(false);
    legacy.platformSchema=1;
    await load(page,legacy);
    expect(await page.evaluate(function (save) {
      var actual=JSON.parse(FB.save.serialize());
      return {revision:actual.state.start.revision,identity:FB.campaignStart(FB.state).startReligion,
        people:JSON.stringify(actual.state.chars)===JSON.stringify(save.state.chars),population:JSON.stringify(actual.state.population)===JSON.stringify(save.state.population),
        rng:(actual.rng>>>0)===(save.rng>>>0),uid:actual.uid===save.uid};
    },old.save)).toEqual({revision:'baseline',identity:fixture.start.startReligion,people:true,population:true,rng:true,uid:true});
  });
}
