'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/identities_1241.js','data/bookmark_476_wider_identities.js',
  'data/cultures.js','data/bookmarks.js','data/eras.js','data/geographies.js',
  'js/model.js','js/mods.js','js/world.js','js/ui_misc.js','js/ui_modals.js'
]);

test('staged local practice leaves effective faiths and existing worlds unchanged',async function ({page},info) {
  await openGame(page,info);
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
  expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
  const before = await page.evaluate(function () {
    return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
      rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/identities_1241.js')});
  const result = await page.evaluate(function (before) {
    const staged = FBDATA.bookmarkReligions1241, source = FBDATA.bookmarkReligions476Wider.sahel_traditional_476;
    const expected = JSON.parse(JSON.stringify(source));
    expected.availability = {bookmarkIds:['1241']};
    expected.properties.religiousPaths = null;
    return {ids:Object.keys(staged),definition:staged.sahel_local_practice_1241,expected:expected,
      independent:staged.sahel_local_practice_1241 !== source &&
        staged.sahel_local_practice_1241.properties !== source.properties,
      dormant:!FBDATA.bookmarks['1241'] && !FBDATA.religions.sahel_local_practice_1241 &&
        !FB.faithExists('sahel_local_practice_1241',null),
      pure:before.data === JSON.stringify(FBDATA) && before.state === JSON.stringify(FB.state) &&
        before.rng === FB.getRngState() && before.uid === FB.getUidCounter(),
      faults:FB.validateReligionData(null)};
  },before);
  expect(result.definition).toEqual(result.expected);
  expect({ids:result.ids,independent:result.independent,dormant:result.dormant,pure:result.pure,faults:result.faults})
    .toEqual({ids:['sahel_local_practice_1241'],independent:true,dormant:true,pure:true,faults:[]});
});

test('ordinary JSON import publishes the local profile only for its dated assignments',async function ({page},info) {
  await openGame(page,info);
  const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/1241-identity-world.json'),'utf8'));
  const original = await page.evaluate(function () { return JSON.stringify(FBDATA.religions.sahel_traditional_476); });
  mod.religions = await page.evaluate(function () { return FBDATA.bookmarkReligions1241; });
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const rejected = ['unknown_bookmark','duplicate_selector','old_province','old_community','old_ruler'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(mod));
      if (kind === 'unknown_bookmark') bad.religions.sahel_local_practice_1241.availability.bookmarkIds = ['e2e_absent'];
      else if (kind === 'duplicate_selector') bad.religions.sahel_local_practice_1241.availability.bookmarkIds = ['1241','1241'];
      else if (kind === 'old_province') bad.bookmarks['1241'].provinces[0].religion = 'sahel_traditional_476';
      else if (kind === 'old_community') bad.bookmarks['1241'].provinces[0].communities[0].religion = 'sahel_traditional_476';
      else bad.bookmarks['1241'].realms[0].religion = 'sahel_traditional_476';
      return FB.mods.validate(bad).length > 0;
    });
    return {errors:errors,rejected:rejected,pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({errors:[],rejected:[true,true,true,true,true],pure:true});

  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'1241-local-practice.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await page.locator('#mod-apply').click();
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['1241'];
  });
  const result = await page.evaluate(function (original) {
    const date = FB.bookmark('1241'), id = 'sahel_local_practice_1241';
    const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faith = FB.religionOf(id,null);
    const expected = JSON.parse(JSON.stringify(FB.religionOf('sahel_traditional_476',null).properties));
    expected.religiousPaths = null;
    return {valid:FB.validateBookmark(date),religions:FB.validateReligionData(null),
      current:consumers.every(function (consumer) { return FB.faithHistoricalAvailable(id,date,consumer); }),
      restricted:Object.keys(FBDATA.bookmarks).filter(function (key) { return key !== '1241'; }).every(function (key) {
        return consumers.every(function (consumer) { return !FB.faithHistoricalAvailable(id,FB.bookmark(key),consumer); });
      }),
      originalUnchanged:original === JSON.stringify(FBDATA.religions.sahel_traditional_476),
      originalIneligible:!FB.faithHistoricalAvailable('sahel_traditional_476',date,'community'),
      properties:faith.properties,expected:expected,
      doctrine:[faith.head,faith.holyWarTradition,faith.religiousPaths,faith.marriage.spouseLimit,FB.faithLineage(id,null)],
      distinctCourts:date.realms.map(function (realm) { return realm.religion; }),
      emptyInstitutions:Object.keys(date.religiousHeads).length === 0 && Object.keys(date.localInstitutions).length === 0,
      pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  },original);
  expect(result.properties).toEqual(result.expected);
  delete result.properties; delete result.expected;
  expect(result).toEqual({valid:[],religions:[],current:true,restricted:true,originalUnchanged:true,originalIneligible:true,
    doctrine:[null,null,null,{m:1,f:1},['sahel_local_practice_1241']],
    distinctCourts:['sahel_local_practice_1241','sunni'],emptyInstitutions:true,pure:true});
});
