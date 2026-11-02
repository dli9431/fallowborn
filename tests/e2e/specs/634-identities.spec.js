'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','data/bookmark_634_identities.js','data/bookmark_634.js','data/starts_634_ordinary.js',
  'data/bookmark_568_identities.js','data/bookmark_476_wider_identities.js',
  'data/cultures.js','data/bookmarks.js','data/eras.js','js/model.js',
  'js/mods.js','js/world.js','js/bookmark_composition.js','js/main.js','js/ui_misc.js','js/ui_modals.js','js/crazygames.js']);

const FAITHS = ['early_islam_634','zoroastrian_sasanian_634','west_syriac_lay_634'];
const SOURCE_FAITHS = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
  'steppe_traditional_476','caucasian_traditional_476','nile_traditional_476','horn_traditional_476',
  'arabian_traditional_476','iranian_traditional_476','sogdian_traditional_476',
  'caucasian_christian_476','aksumite_christian_476','buddhist_476','brahmanical_476','sahel_traditional_476'];

for (const crazy of [false,true]) {
  test('634 identity source reload preserves composed catalogues on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      const before = await page.evaluate(function () {
        return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
          rng:FB.getRngState(),uid:FB.getUidCounter()};
      });
      await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_634_identities.js')});
      expect(await page.evaluate(function (before) {
        return {ids:Object.keys(FBDATA.bookmarkReligions634),
          sources:Object.keys(FBDATA.bookmarkFaithAvailability634),
          published:Object.keys(FBDATA.bookmarkReligions634).every(function (id) {
            return FB.faithExists(id,null);
          }),hidden:FBDATA.bookmarks['634'].hidden,
          unchanged:before.data === JSON.stringify(FBDATA) && before.state === JSON.stringify(FB.state) &&
            before.rng === FB.getRngState() && before.uid === FB.getUidCounter()};
      },before)).toEqual({ids:FAITHS,sources:SOURCE_FAITHS,published:true,hidden:true,unchanged:true});
    });
}

test('same-import date and faiths validate purely and publish through the ordinary file picker',async function ({page},info) {
  await openGame(page,info);
  const mod = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/634-identity-world.json'),'utf8'));
  mod.religions = await page.evaluate(function () { return FBDATA.bookmarkReligions634; });
  const prior = await page.evaluate(function () {
    return JSON.stringify({religions:FBDATA.religions,bookmarks:FBDATA.bookmarks});
  });
  expect(await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), state = JSON.stringify(FB.state);
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const errors = FB.mods.validate(mod);
    const rejected = ['unknown','duplicate','reversed','consumer','old_faith'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(mod));
      const a = bad.religions.early_islam_634.availability;
      if (kind === 'unknown') a.bookmarkIds = ['e2e_absent'];
      if (kind === 'duplicate') a.bookmarkIds = ['634','634'];
      if (kind === 'reversed') a.yearMax = 600;
      if (kind === 'consumer') a.consumers = ['ordination'];
      if (kind === 'old_faith') bad.bookmarks['634'].realms[0].religion = 'zoroastrian_sasanian_476';
      return FB.mods.validate(bad).length > 0;
    });
    return {errors:errors,rejected:rejected,pure:before === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  },mod)).toEqual({errors:[],rejected:[true,true,true,true,true],pure:true});
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'634-identity-world.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(mod),'utf8')});
  await page.locator('#mod-apply').click();
  await prepareGameContent(page);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && FB.mods.count() === 1 && FBDATA.bookmarks['634'];
  });
  expect(await page.evaluate(function (prior) {
    const ids = Object.keys(FBDATA.bookmarkReligions634), world = FB.bookmark('634');
    const earlier = JSON.parse(prior);
    const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    return {errors:FB.validateBookmark(world),faithErrors:FB.validateReligionData(null),
      earlierUnchanged:['religions','bookmarks'].every(function (key) {
        return Object.keys(earlier[key]).every(function (id) {
          if (key === 'bookmarks' && id === '634') return true;
          return JSON.stringify(earlier[key][id]) === JSON.stringify(FBDATA[key][id]);
        });
      }),
      scopes:ids.map(function (id) {
        const rel = FB.religionOf(id,null);
        return {parent:rel.parent,relation:rel.relationToParent,law:rel.legalTradition,
          head:rel.head,paths:rel.religiousPaths,war:rel.holyWarTradition,raid:rel.raidingTradition,
          spouses:rel.marriage.spouseLimit,rite:rel.marriage.kinship.siblingRite,
          current:consumers.every(function (consumer) { return FB.faithHistoricalAvailable(id,world,consumer); }),
          retained:consumers.every(function (consumer) {
            return FB.faithHistoricalAvailable(id,Object.assign({},world,{date:{year:700,season:0,day:1}}),consumer);
          }),otherDates:Object.keys(FBDATA.bookmarks).filter(function (date) { return date !== '634'; }).every(function (date) {
            return consumers.every(function (consumer) { return !FB.faithHistoricalAvailable(id,FB.bookmark(date),consumer); });
          })};
      }),earlyTournament:FB.religionOf('early_islam_634',null).tournamentTradition,
      withheldDivorce:['early_islam_634','west_syriac_lay_634'].every(function (id) {
        return FB.religionOf(id,null).marriage.divorce.enabled === false;
      }),noAbbasid:FB.faithLineage('early_islam_634',null).indexOf('sunni') < 0,
      oldWindow:FB.faithAvailability('zoroastrian_sasanian_476',null).yearMax,
      minimumYears:ids.every(function (id) {
        const year = FB.faithAvailability(id,null).yearMin;
        return !FB.faithHistoricalAvailable(id,Object.assign({},world,{date:{year:year-1,season:0,day:1}}),'community');
      })};
  },prior)).toEqual({errors:[],faithErrors:[],earlierUnchanged:true,scopes:[
    {parent:'muslim',relation:'in_fold',law:'muslim',spouses:{m:4,f:1}},
    {parent:'zoroastrian',relation:'in_fold',law:'sasanian_custom_476',spouses:{m:1,f:1}},
    {parent:'miaphysite',relation:'in_fold',law:'customary',spouses:{m:1,f:1}}
  ].map(function (row) { return Object.assign(row,{head:null,paths:null,war:null,raid:false,
    rite:null,current:true,retained:true,otherDates:true}); }),
    earlyTournament:null,withheldDivorce:true,noAbbasid:true,oldWindow:493,minimumYears:true});
});

test('source selector union preserves doctrine, all earlier dates and narrower restrictions',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const copy = function (value) { return JSON.parse(JSON.stringify(value)); };
    const original = FBDATA.religions, bookmarks = FBDATA.bookmarks;
    const ids = Object.keys(FBDATA.bookmarkFaithAvailability634);
    const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
    const dates = Object.keys(bookmarks);
    function permissions() {
      return ids.map(function (id) { return dates.map(function (date) {
        return consumers.map(function (consumer) { return FB.faithHistoricalAvailable(id,FB.bookmark(date),consumer); });
      }); });
    }
    const prior = JSON.stringify(permissions());
    const doctrine = ids.map(function (id) { return JSON.stringify(FB.religionOf(id,null)); });
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    try {
      FBDATA.bookmarks = Object.assign({},bookmarks,{'634':{id:'634',era:'late_antique',date:{year:634,season:2,day:1}}});
      FBDATA.religions = copy(original);
      function publish() {
        ids.forEach(function (id) {
          const a = FBDATA.religions[id].availability;
          FBDATA.bookmarkFaithAvailability634[id].bookmarkIds.forEach(function (date) {
            if (a.bookmarkIds.indexOf(date) < 0) a.bookmarkIds.push(date);
          });
        });
        FB.invalidateReligionData();
      }
      publish(); publish();
      const parity = prior === JSON.stringify(permissions());
      const unchanged = ids.every(function (id,i) { return doctrine[i] === JSON.stringify(FB.religionOf(id,null)); });
      const eligible = ids.every(function (id) { return consumers.every(function (consumer) {
        return FB.faithHistoricalAvailable(id,FB.bookmark('634'),consumer);
      }); });
      const exact = ids.every(function (id) {
        return JSON.stringify(FBDATA.religions[id].availability.bookmarkIds) ===
          JSON.stringify(original[id].availability.bookmarkIds);
      });
      const id = ids[0];
      FBDATA.religions[id].availability = {bookmarkIds:['476','493'],yearMin:476,yearMax:600,
        eras:['late_antique'],consumers:['community']};
      publish();
      const yearBlocked = !FB.faithHistoricalAvailable(id,FB.bookmark('634'),'community');
      FBDATA.religions[id].availability.yearMax = 634;
      FB.invalidateReligionData();
      const restricted = FB.faithHistoricalAvailable(id,FB.bookmark('634'),'community') &&
        !FB.faithHistoricalAvailable(id,FB.bookmark('634'),'start') &&
        !FB.faithHistoricalAvailable(id,Object.assign({},FB.bookmark('634'),{era:'high_medieval'}),'community');
      return {parity:parity,doctrine:unchanged,eligible:eligible,exact:exact,yearBlocked:yearBlocked,
        restricted:restricted,valid:FB.validateReligionData(null),pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    } finally {
      FBDATA.religions = original; FBDATA.bookmarks = bookmarks; FB.invalidateReligionData();
    }
  })).toEqual({parity:true,doctrine:true,eligible:true,exact:true,yearBlocked:true,restricted:true,valid:[],pure:true});
});
