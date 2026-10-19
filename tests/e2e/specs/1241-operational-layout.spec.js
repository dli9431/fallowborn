'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','data/bookmark_1241_operations.js','data/bookmark_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/bookmark_1241_frederick.js','data/bookmark_1241_alexander.js','data/story_ruler_agendas_1241.js',
  'data/starts_1241.js','data/starts_alexander_1241.js','data/settlements_real.js',
  'js/world.js','js/stories.js','js/mobile_confederations.js','js/mobile_guard.js','js/mobile_camps.js']);

test('the operational county keeps both original camps within eight settlement slots',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const old=FB.bookmark('1241','alexander_v2'),b=FB.bookmark('1241','operations_v2');
    const original=FBDATA.settlementLayouts[old.settlementLayout].szekesfehervar;
    const actual=FBDATA.settlementLayouts[b.settlementLayout].szekesfehervar;
    return {valid:FB.validateBookmark(b),length:actual.length,
      court:actual[0].site,camps:actual.slice(-2).map(function (s) {return s.site;}),
      retained:original.length===7 && original[6].site==='geo_erd_3053281',
      prefix:JSON.stringify(actual.slice(0,-2))===JSON.stringify(original.slice(0,-1)),
      party:b.realms.find(function (r) {return r.id==='koten_following_1241';}).mobile.guardedParty.location.siteId};
  })).toEqual({valid:[],length:8,court:'geo_obuda_3054643',camps:['cuman_west_camp_1241','cuman_east_camp_1241'],
    retained:true,prefix:true,party:'geo_obuda_3054643'});
});
