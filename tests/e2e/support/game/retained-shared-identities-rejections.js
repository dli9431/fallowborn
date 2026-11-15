'use strict';
const {test,expect} = require('../fixture');
const {openGame} = require('./navigation');
const {fixtures,installSource,seedConfiguration,currentPage,load,
  prepareConfiguration,preparedJourney} = require('./retained-shared-identities-world');

function registerRejectionCases(fixture) {
  test.describe(fixture.bookmark.id,function () {
    const prepared=prepareConfiguration(fixture,{validation:true});
    const getOld=prepared.old,getValidation=prepared.validation;
    let old,validationPage;
    test.beforeAll(async function () {old=getOld();validationPage=getValidation();});
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
    registerContractCases(fixture,getOld,getValidation);
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

module.exports = {registerRejectionCases};
