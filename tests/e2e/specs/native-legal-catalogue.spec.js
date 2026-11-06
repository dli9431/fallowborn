'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openTitle,openGame,prepareGameContent} = require('../support/game/navigation');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {mockCrazyGames} = require('../support/crazygames');
const {openCrazyTitle} = require('../support/game/crazygames-title');
const {installPageGuards} = require('../support/page-contract');
const fixtures = ['harbor','dune'].map(function (name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/native-legal-catalogue',name + '.json'),'utf8'));
});
dependsOnRuntime(__filename,['js/bookmark_composition.js','js/bookmark_sources.js','js/mods.js',
  'js/world.js','js/justice.js','js/authority.js','js/politics.js','js/religion.js','js/governments.js',
  'js/main.js','js/model.js','js/station.js','js/messages.js','js/starts.js','js/story_household.js','js/save.js','js/save_v4.js','data/intrigue.js','data/political_institutions.js',
  'data/bookmark_sources.js','data/bookmarks.js','data/eras.js','js/stories.js','js/crazygames.js']);
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function envelope(mod) {
  const world = Object.values(mod.bookmarks)[0], catalogs = {};
  Object.keys(mod).forEach(function (key) {
    if (['name','bookmarks','startScenarios'].indexOf(key) < 0) catalogs[key] = mod[key];
  });
  world.starts = [];
  return {id:world.id + '_legal',bookmark:world,catalogs:catalogs,
    starts:mod.startScenarios.map(function (definition) { return {definition:definition}; })};
}
async function nativeSources(page, mods, collision) {
  await page.route('**/data/bookmark_sources.js',async function (route) {
    const response = await route.fetch();
    function stage(mods, collision) {
      window.__legalEarly = typeof FB.validateLegalTraditions === 'undefined';
      mods.forEach(function (mod) {
        var id = Object.keys(mod.bookmarks)[0];
        var roots = Object.keys(mod).filter(function (key) { return ['name','bookmarks','startScenarios','storyInstances'].indexOf(key) < 0; });
        FB.bookmarkSources.stage({source:'synthetic-' + id,bookmarks:[id],catalogs:roots},function (data) {
          roots.forEach(function (root) { Object.assign(data[root],mod[root]); });
          Object.assign(data.bookmarks,mod.bookmarks);
          Object.assign(data.storyInstances,mod.storyInstances || {});
          data.startScenarios = data.startScenarios.concat(mod.startScenarios);
        });
      });
      if (collision) FB.bookmarkSources.stage({source:'conflicting-law',bookmarks:['dune_world'],catalogs:['legalTraditions']},function (data) {
        data.legalTraditions.harbor_law.name = 'Conflicting legal declaration';
      });
      window.__legalUnpublished = !FBDATA.legalTraditions.harbor_law && !FBDATA.legalTraditions.dune_law;
    }
    const body = '(' + stage.toString() + ')(' + JSON.stringify(mods) + ',' + !!collision + ');\n' +
      (await response.text()).replace("'1241'","'1241','harbor_world','dune_world'");
    await route.fulfill({response:response,body:body});
  });
}
async function observe(page,id,revision) {
  expect(await page.evaluate(function (input) {
    return new Promise(function (resolve) {
      FB.activateBookmark(input.id,null,function (error) {
        if (error) { resolve(error.message); return; }
        FB.game.pending = {seed:'NATIVE-LEGAL-CATALOGUE'};
        FB.game.startObserve(); FB.game.setPaused(true); resolve(null);
      },input.revision ? {revision:input.revision} : undefined);
    });
  },{id:id,revision:revision})).toBe(null);
}
async function consumer(page,prefix) {
  return page.evaluate(function (p) {
    const s = FB.state, actor = FB.materializeRealmRuler(s,p + '_house').id;
    const law = FB.justiceTradition(s,actor,'secular',{accusedId:actor});
    return {law:law.id,source:law.source,evidence:law.definition.justification.evidence,
      religious:FB.justiceTradition(s,actor,'religious').id,
      revision:s.start.revision,valid:FB.save.v4.validatePlatform(s)};
  },prefix);
}

test('native legal declarations stay private until selected-date review and survive switches and full preparation',async function ({page},info) {
  await nativeSources(page,fixtures); await openTitle(page,info);
  expect(await page.evaluate(function () { return [window.__legalEarly,window.__legalUnpublished]; })).toEqual([true,true]);
  const selected = await page.evaluate(function () {
    const rows = ['harbor_world','dune_world','867','harbor_world'].map(function (id) {
      const report = FB.bookmarkSources.prepareSetup(id);
      if (report.starts.some(function (unit) { return !unit.ready; })) throw new Error(JSON.stringify(report.starts));
      return {id:id,published:report.published,harbor:!!FBDATA.legalTraditions.harbor_law,dune:!!FBDATA.legalTraditions.dune_law,
        retained:!!FBDATA.legalTraditions.harbor_retained,problems:FB.bookmarkRevisions(id).map(function (w) { return FB.validateBookmark(w); })};
    });
    return rows;
  });
  expect(selected.map(function (row) { return [row.published,row.harbor,row.dune,row.retained]; }))
    .toEqual([[true,true,false,true],[true,false,true,false],[true,false,false,false],[true,true,false,true]]);
  selected.forEach(function (row) { row.problems.forEach(function (faults) { expect(faults).toEqual([]); }); });
  await prepareGameContent(page);
  expect(await page.evaluate(function () { return {ready:FB.game.contentReady,legal:FB.validateLegalTraditions(),
    all:!!FBDATA.legalTraditions.harbor_law && !!FBDATA.legalTraditions.dune_law}; })).toEqual({ready:true,legal:[],all:true});
  await observe(page,'harbor_world','retained');
  const before = await consumer(page,'harbor');
  expect(before).toMatchObject({law:'harbor_retained',religious:'harbor_faith_law',valid:true,revision:'retained'});
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved);
  expect(await consumer(page,'harbor')).toEqual(before);
});

for (const prefix of ['harbor','dune']) {
  test(prefix + ' native and ordinary JSON publication reach the canonical justice consumer',async function ({page,browser},info) {
    await nativeSources(page,fixtures); await openGame(page,info);
    expect(await page.evaluate(function (id) { return FB.bookmarkCompositions.sourceReports().filter(function (r) { return r.bookmarkId === id; }); },prefix + '_world')).toEqual(expect.arrayContaining([expect.objectContaining({published:true,worldFaults:[]})]));
    await observe(page,prefix + '_world');
    const native = await consumer(page,prefix);
    expect(native).toMatchObject({law:prefix === 'harbor' ? 'harbor_personal' : 'dune_law',
      religious:prefix + '_faith_law',source:prefix === 'harbor' ? 'personal' : 'government',valid:true});
    const context = await browser.newContext(), imported = await context.newPage(), guard = installPageGuards(imported);
    try {
      await openGame(imported,info);
      const text = fs.readFileSync(path.join(__dirname,'../fixtures/native-legal-catalogue',prefix + '.json'),'utf8');
      expect(await imported.evaluate(function (text) { return FB.mods.validate(JSON.parse(text)); },text)).toEqual([]);
      await Promise.all([imported.waitForNavigation({waitUntil:'domcontentloaded'}),
        imported.evaluate(function (text) { FB.mods.store(text); },text)]);
      await prepareGameContent(imported);
      expect(await imported.evaluate(function () { return FB.mods.sig(); })).toBeTruthy();
      await observe(imported,prefix + '_world');
      expect(await consumer(imported,prefix)).toEqual(native);
      const saved = await imported.evaluate(function () { return FB.save.serialize(); });
      await restoreBookmark(imported,saved);
      expect(await consumer(imported,prefix)).toEqual(native);
    expect(guard.faults).toEqual([]);
    } finally { await context.close(); }
  });
}

test('unknown legal references, malformed policy and foreign jurisdiction cannot partially publish',async function ({page},info) {
  await openGame(page,info);
  const results = await page.evaluate(function (input) {
    function copy(o) { return JSON.parse(JSON.stringify(o)); }
    const mutations = [
      function (x) { x.catalogs.religions.harbor_belief.properties.legalTradition = 'unknown_law'; },
      function (x) { x.bookmark.realms[0].governingIdentity.legalIdentityId = 'unknown_law'; },
      function (x) { x.bookmark.revisions.retained.realms[0].governingIdentity.legalIdentityId = 'foreign_law'; },
      function (x) { x.catalogs.legalTraditions.harbor_law.jurisdiction.mixed = 'unknown_law'; },
      function (x) { x.catalogs.legalTraditions.harbor_law.jurisdiction.assessor = 'unknown_law'; },
      function (x) { x.catalogs.legalTraditions.harbor_law.jurisdiction.cultures.harbor_folk = 'unknown_law'; },
      function (x) { x.catalogs.legalTraditions.harbor_law.jurisdiction.cultures.foreign_culture = 'harbor_personal'; },
      function (x) { x.catalogs.legalTraditions.harbor_law.procedures.hearing = 'yes'; },
      function (x) { delete x.catalogs.legalTraditions.harbor_personal; }
    ];
    const root = FBDATA, before = JSON.stringify(FBDATA), english = JSON.stringify(FB.englishMessages());
    const registry = FB.stories.list(), rng = FB.getRngState(), uid = FB.getUidCounter();
    return mutations.map(function (mutate) {
      const x = copy(input); mutate(x);
      const mod = Object.assign({},x.catalogs,{bookmarks:{},startScenarios:x.starts.map(function (unit) { return unit.definition; })});
      mod.bookmarks[x.bookmark.id] = x.bookmark;
      const importFaults = FB.mods.validate(mod);
      const ticket = FB.bookmarkCompositions.prepare(x), result = ticket.publish();
      return {ready:result.ready,published:result.published,preview:ticket.preview(),faults:result.worldFaults,importFaults:importFaults,
        pure:root === FBDATA && before === JSON.stringify(FBDATA) && english === JSON.stringify(FB.englishMessages()) &&
          registry.every(function (row,i) { return row === FB.stories.list()[i]; }) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
  },envelope(clone(fixtures[0])));
  results.forEach(function (row) { expect(row).toMatchObject({ready:false,published:false,preview:null,pure:true}); expect(row.faults.length).toBeGreaterThan(0); expect(row.importFaults.length).toBeGreaterThan(0); });
});

test('legal collisions, repeated declarations and publication exceptions retain atomic ownership',async function ({page},info) {
  await openGame(page,info);
  const input = envelope(clone(fixtures[0]));
  const result = await page.evaluate(function (input) {
    const root = FBDATA, before = JSON.stringify(root), ticket = FB.bookmarkCompositions.prepare(input);
    const original = FB.stories.publish, registry = FB.stories.list(), english = JSON.stringify(FB.englishMessages());
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    FB.stories.publish = function () { throw new Error('Synthetic publication failure'); };
    let failed;
    try { failed = ticket.publish(); } finally { FB.stories.publish = original; }
    const pure = root === FBDATA && before === JSON.stringify(FBDATA) && english === JSON.stringify(FB.englishMessages()) &&
      registry.every(function (row,i) { return row === FB.stories.list()[i]; }) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const published = FB.bookmarkCompositions.prepare(input).publish();
    const repeated = FB.bookmarkCompositions.prepare(input).publish();
    const same = JSON.stringify(FBDATA);
    const collision = JSON.parse(JSON.stringify(input)); collision.id = 'other_legal_owner';
    collision.catalogs.legalTraditions.harbor_law.name = 'Conflicting law';
    const rejected = FB.bookmarkCompositions.prepare(collision).publish();
    return {failed:failed,pure:pure,published:published,repeated:repeated,rejected:rejected,unchanged:same === JSON.stringify(FBDATA)};
  },input);
  expect(result.published.worldFaults).toEqual([]);
  expect(result).toMatchObject({failed:{published:false},pure:true,published:{published:true},repeated:{published:true,reused:true},rejected:{published:false},unchanged:true});
});

for (const failure of ['missing','collision']) {
  test('native ' + failure + ' dependency rejects its owner without leaking legal records',async function ({page},info) {
    const mods = clone(fixtures);
    if (failure === 'missing') delete mods[1].legalTraditions.dune_law;
    await nativeSources(page,mods,failure === 'collision'); await openTitle(page,info);
    const failed = await page.evaluate(function () {
      const root = FBDATA, before = JSON.stringify(root), rng = FB.getRngState(), uid = FB.getUidCounter();
      let message;
      try { FB.bookmarkSources.prepareSetup('dune_world'); } catch (error) { message = error.message; }
      return {message:message,pure:root === FBDATA && before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
    expect(failed.message).toBeTruthy(); expect(failed.pure).toBe(true);
    await prepareGameContent(page);
    expect(await page.evaluate(function () { return {dune:!!FBDATA.bookmarks.dune_world,harbor:!!FBDATA.bookmarks.harbor_world,
      leaked:!!FBDATA.legalTraditions.dune_faith_law,original:FBDATA.legalTraditions.harbor_law.name}; }))
      .toEqual({dune:false,harbor:true,leaked:false,original:'Harbor law'});
  });
}

test('government law strings and every supported selector reject unknown dependencies',async function ({page},info) {
  await openGame(page,info);
  const rows = await page.evaluate(function (input) {
    const declarations = ['unknown_law',{default:'unknown_law'},
      {default:'faith',cultures:{dune_folk:'unknown_law'}},
      {default:'faith',realms:{dune_house:'unknown_law'}}];
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    return declarations.map(function (declaration) {
      const x = JSON.parse(JSON.stringify(input)); x.catalogs.governmentForms.dune_court.legalTradition = declaration;
      const ticket = FB.bookmarkCompositions.prepare(x), result = ticket.publish();
      return {ready:result.ready,published:result.published,faults:result.worldFaults,
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    });
  },envelope(clone(fixtures[1])));
  rows.forEach(function (row) { expect(row).toMatchObject({ready:false,published:false,pure:true}); expect(row.faults.join(' ')).toContain('government.dune_court'); });
});


test('explicit CrazyGames keeps selected legal publication and its distribution signature',async function ({page},info) {
  await mockCrazyGames(page);
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage'; });
  await nativeSources(page,fixtures); await openCrazyTitle(page,info);
  const result = await page.evaluate(function () {
    const before = FB.mods.sig();
    const report = FB.bookmarkSources.prepareSetup('dune_world');
    return {published:report.published,before:before,after:FB.mods.sig(),
      dune:!!FBDATA.legalTraditions.dune_law,harbor:!!FBDATA.legalTraditions.harbor_law,
      faults:FB.validateLegalTraditions()};
  });
  expect(result).toMatchObject({published:true,dune:true,harbor:false,faults:[]});
  expect(result.after).toBe(result.before);
  expect(result.after).toBeTruthy();
});
