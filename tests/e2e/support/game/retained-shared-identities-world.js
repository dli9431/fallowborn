'use strict';
const path = require('path');
const fs = require('fs');
const {test,expect} = require('../fixture');
const {openGame,prepareGameContent} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const {installPageGuards} = require('../page-contract');
const fixtures = [require('../../fixtures/retained-shared-identities/estuary.json'),
  require('../../fixtures/retained-shared-identities/upland.json')];
const fixtureRoot = path.resolve(__dirname,'../../fixtures/retained-shared-identities');

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
  Object.keys(fixture.currentCatalogs).forEach(function (root) {
    if (!declaration.sharedDefinitions[root]) declaration.sharedDefinitions[root] = [];
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
  var catalogs = Object.keys(fixture.catalogs);
  Object.keys(fixture.currentCatalogs).forEach(function (root) { if (catalogs.indexOf(root) < 0) catalogs.push(root); });
  var shared = Object.keys(fixture.currentCatalogs).filter(function (root) {
    return ['governmentForms','administrationProfiles','aristocraticProfiles'].indexOf(root) >= 0;
  });
  FB.bookmarkSources.stage({source:'retained ' + fixture.bookmark.id,bookmarks:[fixture.bookmark.id],catalogs:catalogs,shared:shared},function (data) {
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

// Preparation belongs only to the importing configuration and proof family.
function prepareConfiguration(fixture,options) {
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
  for (const revision of (options.revisions ? fixture.supportedRevisions : []).filter(function (id) { return id !== fixture.retainedRevision; })) test.beforeAll(async function () {
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
      if (options.unaffected) {
        await sourcePage.evaluate(function () { FB.game.toTitle(); });
        await beginBookmarkFromTitle(sourcePage,'867','farmer');
        variants.unaffected = await sourcePage.evaluate(function () { FB.state.player.gold-=3;return JSON.parse(FB.save.serialize()); });
      }
      expect(sourceGuard.faults).toEqual([]);
    } finally { const context=sourceContext;sourceContext=null;await context.close(); }
  });
  test.afterAll(async function () {
    if (sourceContext) { const context = sourceContext; sourceContext = null; await context.close(); }
    if(validationContext)try {expect(validationGuard.faults).toEqual([]);}finally {await validationContext.close();}
  });
  if (options.validation) test.beforeAll(async function ({browser},info) {
    if (!old) throw new Error('The predecessor envelope was not prepared.');
    validationContext=await browser.newContext();validationPage=await validationContext.newPage();validationGuard=installPageGuards(validationPage);
    const source=validationPage;
      await currentPage(source,fixture,null,info,old);
      await load(source,old.save);
      expect(await retention(source,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,law:'customary',rng:true,uid:true,converted:true});
      resaved = await source.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(resaved.mods).not.toBe(old.save.mods);
  });
  return {old:function () {return old;},variants:function () {return variants;},
    resaved:function () {return resaved;},validation:function () {return validationPage;}};
}

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

module.exports = {fixtures,installSource,importOverlay,seedConfiguration,preparePredecessor,finishPredecessor,
  predecessorSave,currentPage,load,retention,prepareConfiguration,preparedJourney};
