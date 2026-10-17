'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/identities_1096.js','data/bookmark_1096.js','data/bookmark_1066_inhabited.js','data/cultures.js',
  'data/bookmarks.js','data/eras.js','data/geographies.js','data/government_rollout.js',
  'js/model.js','js/mods.js','js/world.js'
]);

const ids = ['ghana_local_practice_1096','niger_traditional_1096'];

test('published local faiths are detached, dated and preserve released worlds',async function ({page},info) {
  await openGame(page,info);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
  expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  const before = await page.evaluate(function () {
    return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
      rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/identities_1096.js')});
  expect(await page.evaluate(function (input) {
    const staged = FBDATA.bookmarkReligions1096;
    return {ids:Object.keys(staged).sort(),
      independent:input.ids.every(function (id) {
        const source = FBDATA.bookmarkReligions1066Terrain[id.replace('_1096','_1066')];
        const expected = JSON.parse(JSON.stringify(source));
        expected.availability = {bookmarkIds:['1096']};
        return JSON.stringify(staged[id]) === JSON.stringify(expected) && staged[id] !== source &&
          staged[id].properties !== source.properties;
      }),
      published:input.ids.every(function (id) {
        return FB.faithExists(id,null) && FBDATA.religions[id] !== staged[id] &&
          FBDATA.religions[id].properties !== staged[id].properties &&
          JSON.stringify(FBDATA.religions[id]) === JSON.stringify(staged[id]) &&
          FB.faithHistoricalAvailable(id,FB.bookmark('1096'),'community') &&
          !FB.faithHistoricalAvailable(id,FB.bookmark('1066'),'community');
      }),
      pure:input.before.data === JSON.stringify(FBDATA) && input.before.state === JSON.stringify(FB.state) &&
        input.before.rng === FB.getRngState() && input.before.uid === FB.getUidCounter(),
      faults:FB.validateReligionData(null)};
  },{ids:ids,before:before})).toEqual({ids:ids.slice().sort(),independent:true,published:true,pure:true,faults:[]});
});

test('the staged profiles validate and import through ordinary JSON with bookmark-only eligibility',async function ({page},info) {
  await openGame(page,info);
  const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/1096-identity-world.json'),'utf8'));
  mod.religions = await page.evaluate(function () { return FBDATA.bookmarkReligions1096; });
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const rejected = ['unknown_bookmark','old_assignment'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(mod));
      if (kind === 'unknown_bookmark') bad.religions.ghana_local_practice_1096.availability.bookmarkIds = ['e2e_absent'];
      else bad.bookmarks['1096'].provinces[0].religion = 'ghana_local_practice_1066';
      return FB.mods.validate(bad).length > 0;
    });
    const pure = before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter();
    if (!errors.length) localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
    return {errors:errors,rejected:rejected,pure:pure};
  },mod)).toEqual({errors:[],rejected:[true,true],pure:true});
  await openGame(page,info);
  expect(await page.evaluate(function (ids) {
    const date = FB.bookmark('1096'), consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    return {valid:FB.validateBookmark(date),religions:FB.validateReligionData(null),
      current:ids.every(function (id) {
        return consumers.every(function (consumer) { return FB.faithHistoricalAvailable(id,date,consumer); });
      }),
      restricted:ids.every(function (id) {
        return ['476','493','711','800','867','1066','1204'].every(function (bookmark) {
          return consumers.every(function (consumer) {
            return !FB.faithHistoricalAvailable(id,FB.bookmark(bookmark),consumer);
          });
        });
      }),
      originals:ids.every(function (id) {
        const source = id.replace('_1096','_1066');
        return FB.faithHistoricalAvailable(source,FB.bookmark('1066'),'community') &&
          !FB.faithHistoricalAvailable(source,date,'community') &&
          JSON.stringify(FB.religionOf(id,null).properties) === JSON.stringify(FB.religionOf(source,null).properties);
      }),
      doctrine:[FB.religionOf(ids[0],null).head,FB.religionOf(ids[0],null).holyWarTradition,
        FB.religionOf(ids[0],null).religiousPaths,FB.religionOf(ids[0],null).marriage.spouseLimit,
        FB.faithLineage(ids[1],null)],
      emptyInstitutions:Object.keys(date.religiousHeads).length === 0 && Object.keys(date.localInstitutions).length === 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },ids)).toEqual({valid:[],religions:[],current:true,restricted:true,originals:true,
    doctrine:[null,null,null,{m:1,f:1},['niger_traditional_1096','pagan']],emptyInstitutions:true,pure:true});
});
