'use strict';
const {test,expect} = require('../fixture');
const {prepareGameContent} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const {installPageGuards} = require('../page-contract');
const {preparePredecessor,finishPredecessor,load,retention,preparedJourney} = require('./retained-shared-identities-world');

function registerGovernmentCases(base) {
  const fixture = JSON.parse(JSON.stringify(base));
  const name = base.bookmark.id === 'estuary_world' ? 'estuary' : 'upland';
  const governmentMod = require('../../fixtures/retained-shared-identities/' + name + '-governments.json');
  Object.assign(fixture.currentCatalogs,governmentMod);
  fixture.fresh.hidden = true;
  test.describe(name + ' retained government catalogues and revision visibility',function () {
    let old,sourceContext,sourcePage,sourceGuard;
    test.beforeAll(async function ({browser},info) {
      sourceContext=await browser.newContext();sourcePage=await sourceContext.newPage();sourceGuard=installPageGuards(sourcePage);
      await preparePredecessor(sourcePage,info,fixture);
    });
    test.beforeAll(async function () {
      old=await finishPredecessor(sourcePage,fixture);
      try {expect(sourceGuard.faults).toEqual([]);} finally {await sourceContext.close();sourceContext=null;}
    });
    test.afterAll(async function () {if(sourceContext)await sourceContext.close();});

    preparedJourney('preserves a genuine life while its new revision is hidden',fixture,function () {return old;},[
      {title:'proves all three added catalogues and preserves visible retained worlds',run:async function (page) {
        expect(await page.evaluate(function (input) {
          var before=JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
          var current=FB.bookmark(input.fixture.bookmark.id), retained=FB.bookmark(input.fixture.bookmark.id,input.fixture.retainedRevision);
          var proof=FB.mods.saveCompatibility(input.save), menu=FB.bookmarkSources.menuData();
          return {proof:proof.compatible,hidden:current.hidden,retained:retained.hidden,
            available:FB.bookmarkAvailable(current.id),listed:menu.bookmarks.some(function (row) {return row.id===current.id;}),
            roots:Object.keys(input.mod).map(function (root) {
              return Object.keys(input.mod[root]).every(function (id) {return JSON.stringify(FBDATA[root][id])===JSON.stringify(input.mod[root][id]);});
            }),pure:before===JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()])};
        },{fixture:fixture,mod:governmentMod,save:old.save})).toEqual({proof:true,hidden:true,retained:false,available:false,listed:false,roots:[true,true,true],pure:true});
        await load(page,old.save);
        expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,rng:true,uid:true,converted:true});
        await load(page,old.save);
        expect(await retention(page,old,fixture)).toMatchObject({same:true,rng:true,uid:true});
      }},
      {title:'keeps repeated ordinary re-saves loadable after a cold reload',run:async function (page) {
        const saved=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
        await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);await load(page,saved);
        expect(await retention(page,old,fixture)).toMatchObject({same:true,meaning:true,identity:true,rng:true,uid:true,converted:true});
      }}
    ].concat(['governmentForms','administrationProfiles','aristocraticProfiles'].map(function (root) {
      return {title:'rejects missing, replacement, forged and stale '+root+' evidence purely',run:async function (page) {
        const result=await page.evaluate(function (input) {
          var get=FB.bookmarkSources.retainedCatalogueTransitions, clone=function (value) {return JSON.parse(JSON.stringify(value));};
          var valid=get().filter(function (row) {return row.bookmarkId===input.id;});
          var checks=[],root=input.root;
          ['missing','replacement','current','live'].forEach(function (kind) {
            var rows=clone(valid), record=rows[0].sharedDefinitions[root][0], live=FBDATA[root][record.id];
            if(kind==='missing')delete rows[0].sharedDefinitions[root];
            if(kind==='replacement')record.predecessor=clone(record.current);
            if(kind==='current')record.current.fixtureMutation=true;
            if(kind==='live')live.fixtureMutation=true;
            FB.bookmarkSources.retainedCatalogueTransitions=function () {return rows;};
            var before=JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()]);
            try {checks.push({root:root,kind:kind,rejected:!FB.mods.saveCompatibility(input.save).compatible,
              pure:before===JSON.stringify([FBDATA,FB.state,localStorage,FB.getRngState(),FB.getUidCounter()])});}
            finally {delete live.fixtureMutation;FB.bookmarkSources.retainedCatalogueTransitions=get;}
          });
          return {checks:checks,valid:FB.mods.saveCompatibility(input.save).compatible};
        },{id:fixture.bookmark.id,save:old.save,root:root});
        expect(result.valid).toBe(true);
        for(const check of result.checks)expect(check,check.root+' '+check.kind).toMatchObject({rejected:true,pure:true});
      }};
    })),async function (page) {await load(page,old.save);});

    test.describe('ordinary JSON government catalogues and revision visibility',function () {
      let context,page,guard;
      test.beforeAll(async function ({browser},info) {
        context=await browser.newContext();page=await context.newPage();guard=installPageGuards(page);
        await preparePredecessor(page,info,base);
      });
      test.afterAll(async function () {
        if(context)try {expect(guard.faults).toEqual([]);}finally {await context.close();}
      });
      test('imports government catalogues and typed revision visibility through ordinary JSON',async function () {
        const mod=JSON.parse(JSON.stringify(fixture.currentCatalogs)), world=JSON.parse(JSON.stringify(base.bookmark));
        mod.name=name+' government and visibility composition';mod.startScenarios=[fixture.currentStart];mod.bookmarks={};
        world.revisions=world.revisions || {baseline:{}};
        world.revisions[base.addedRevision]=JSON.parse(JSON.stringify(fixture.fresh));
        world.revision=base.retainedRevision;mod.bookmarks[base.bookmark.id]=world;
        expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},mod)).toEqual([]);
        await page.evaluate(function () {FB.ui.showMods();});
        await page.locator('#modfile').setInputFiles({name:name+'-government-visibility.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
        await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
        await prepareGameContent(page);
        expect(await page.evaluate(function (mod) {
          return Object.keys(mod).map(function (root) {return Object.keys(mod[root]).every(function (id) {
            return JSON.stringify(FBDATA[root][id])===JSON.stringify(mod[root][id]);
          });});
        },governmentMod)).toEqual([true,true,true]);
        expect(await page.evaluate(function (fixture) {
          return {visible:FB.bookmarkAvailable(fixture.bookmark.id),
            retained:FB.bookmark(fixture.bookmark.id,fixture.retainedRevision).hidden,
            hidden:FB.bookmark(fixture.bookmark.id,fixture.addedRevision).hidden,
            invalid:[null,0,'true'].map(function (value) {
              var b=JSON.parse(JSON.stringify(FBDATA.bookmarks[fixture.bookmark.id]));
              b.revisions[fixture.addedRevision].hidden=value;
              return FB.validateBookmark(b).length>0;
            })};
        },fixture)).toEqual({visible:true,retained:false,hidden:true,invalid:[true,true,true]});
        await beginBookmarkFromTitle(page,base.bookmark.id,base.start.id);
        expect(await page.evaluate(function () {
          var saved=JSON.parse(FB.save.serialize()), chars=JSON.stringify(saved.state.chars);
          FB.save.restore(saved);FB.save.restore(JSON.parse(JSON.stringify(saved)));
          return {chars:JSON.stringify(JSON.parse(FB.save.serialize()).state.chars)===chars,
            rng:(FB.getRngState()>>>0)===(saved.rng>>>0),uid:FB.getUidCounter()===saved.uid};
        })).toEqual({chars:true,rng:true,uid:true});
      });
    });
  });
}

module.exports = {registerGovernmentCases};
