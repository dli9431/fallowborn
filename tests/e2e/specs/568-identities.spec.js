'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['index.html','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js','data/bookmark_568_identities.js',
  'data/bookmark_476_wider_identities.js','data/cultures.js','data/bookmarks.js',
  'data/eras.js','js/model.js','js/world.js','js/starts.js','js/crazygames.js']);

const CULTURES = ['langobard_568','avar_568'];
const FAITHS = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
  'steppe_traditional_476','caucasian_traditional_476','nile_traditional_476',
  'horn_traditional_476','arabian_traditional_476','iranian_traditional_476',
  'sogdian_traditional_476','caucasian_christian_476','aksumite_christian_476',
  'buddhist_476','brahmanical_476','sahel_traditional_476'];

for (const crazygames of [false,true]) {
  test('568 identities serve the hidden world on ' + (crazygames ? 'CrazyGames' : 'standard') + ' boot',
    async function ({page},testInfo) {
      if (crazygames) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,testInfo);
      } else await openGame(page,testInfo);
      expect(await page.evaluate(function () {
        const additions = FBDATA.bookmarkFaithAvailability568;
        const faiths = Object.keys(additions);
        const baselineIds = ['476','493','711','800','867','1066','1204'];
        const cultures = Object.keys(FBDATA.bookmarkCultures568);
        const script = document.querySelector('script[src="data/bookmark_568_identities.js"]');
        const scripts = Array.prototype.map.call(document.scripts,function (node) {
          return node.getAttribute('src');
        });
        return {
          distribution:FB.platform.isCrazyGames,
          loaded:!!script && scripts.indexOf('data/bookmark_568_identities.js') >
            scripts.indexOf('data/bookmark_476_wider_identities.js'),
          cultures:cultures,
          published:cultures.every(function (id) { return FB.cultureExists(id,null); }),
          hiddenWorld:FBDATA.bookmarks['568'].hidden,
          faiths:faiths,
          additions:faiths.every(function (id) {
            return JSON.stringify(additions[id]) === '{"bookmarkIds":["568"]}';
          }),
          priorPermissions:faiths.every(function (id) {
            const ids = FB.faithAvailability(id,null).bookmarkIds;
            const expected = id === 'buddhist_476' ? ['476','493','1204'] :
              id === 'sahel_traditional_476' ? ['476','493','711','800','867','1204'] : ['476','493'];
            return JSON.stringify(ids) === JSON.stringify(expected.concat(['568']));
          }),
          culturesValid:FB.configureCultures(null),
          religionsValid:FB.validateReligionData(null),
          worldsValid:baselineIds.map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })
        };
      })).toEqual({distribution:crazygames,loaded:true,cultures:CULTURES,published:true,
        hiddenWorld:true,faiths:FAITHS,additions:true,priorPermissions:true,
        culturesValid:[],religionsValid:[],worldsValid:[[],[],[],[],[],[],[]]});
      const fixture = JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/released-catalogue.json'),'utf8'));
      expect((await page.evaluate(releasedCatalogue,fixture.selection)).hashes).toEqual(fixture.hashes);
    });
}

test('the published definitions compile with exact 568 faith additions and retained-date parity',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const dates = ['476','493','711','800','867','1066','1204'];
      const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
      const faiths = Object.keys(FBDATA.bookmarkFaithAvailability568);
      const rawCultures = FBDATA.cultures, rawReligions = FBDATA.religions;
      const originalBookmark = FBDATA.bookmarks['568'];
      const before = JSON.stringify([rawCultures,rawReligions,FBDATA.bookmarks]);
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const prior = faiths.map(function (faith) {
        return dates.map(function (date) {
          return consumers.map(function (consumer) {
            return FB.faithHistoricalAvailable(faith,FB.bookmark(date),consumer);
          });
        });
      });
      const doctrine = faiths.map(function (id) { return JSON.stringify(FB.religionOf(id,null)); });
      const candidate = {id:'568',era:'late_antique',date:{year:568,season:0,day:1}};
      try {
        // Repeat the additive publication in an isolated catalogue to verify idempotence.
        FBDATA.bookmarks['568'] = candidate;
        FBDATA.cultures = Object.assign({},rawCultures,
          JSON.parse(JSON.stringify(FBDATA.bookmarkCultures568)));
        FBDATA.religions = Object.assign({},rawReligions);
        faiths.forEach(function (id) {
          const old = rawReligions[id];
          const availability = JSON.parse(JSON.stringify(old.availability));
          const added = FBDATA.bookmarkFaithAvailability568[id].bookmarkIds;
          availability.bookmarkIds = availability.bookmarkIds.concat(added.filter(function (date) {
            return availability.bookmarkIds.indexOf(date) < 0;
          }));
          FBDATA.religions[id] = Object.assign({},old,{availability:availability});
        });
        FB.invalidateCultureData(); FB.invalidateReligionData();
        const compiled = Object.keys(FBDATA.bookmarkCultures568).map(function (id) {
          const culture = FB.cultureOf(id,null);
          const names = ['m','f'].map(function (sex) { return FB.cultureNamePool(id,sex,null); });
          const banned = ['alboin','rosamund','rosemund','albsuinda','bayan'];
          return {id:id,parent:culture.parent,tradition:culture.tradition,dyn:culture.dyn,
            nonempty:names.every(function (pool) { return pool.length > 0; }),
            generated:names.every(function (pool) {
              return pool.every(function (name) { return banned.indexOf(name.toLowerCase()) < 0; });
            }),
            eraPools:['male','female'].every(function (key) {
              return JSON.stringify(culture[key]) === JSON.stringify(culture.nameEras.late_antique[key]);
            }),
            portrait:typeof culture.appearance.tone === 'number',
            noRaid:culture.doctrines.raiding === false};
        });
        const after = faiths.map(function (faith) {
          return dates.map(function (date) {
            return consumers.map(function (consumer) {
              return FB.faithHistoricalAvailable(faith,FB.bookmark(date),consumer);
            });
          });
        });
        return {compiled:compiled,culturesValid:FB.configureCultures(null),
          religionsValid:FB.validateReligionData(null),
          dated:faiths.every(function (faith) {
            return consumers.every(function (consumer) {
              return FB.faithHistoricalAvailable(faith,candidate,consumer);
            });
          }),
          exact:faiths.every(function (id) {
            return JSON.stringify(FB.faithAvailability(id,null).bookmarkIds) ===
              JSON.stringify(rawReligions[id].availability.bookmarkIds);
          }),
          previous:JSON.stringify(prior) === JSON.stringify(after),
          doctrine:faiths.every(function (id,i) { return doctrine[i] === JSON.stringify(FB.religionOf(id,null)); }),
          originals:before === JSON.stringify([rawCultures,rawReligions,
            Object.assign({},FBDATA.bookmarks,{'568':originalBookmark})]),
          noNewFaith:Object.keys(FBDATA.religions).length === Object.keys(rawReligions).length,
          sasanianHeld:!FB.faithHistoricalAvailable('zoroastrian_sasanian_476',candidate,'ruler'),
          broad:['nicene','chalcedonian','miaphysite','homoian','jewish','east_syriac',
            'zoroastrian','germanic_pagan','baltic_pagan','berber_traditional'].every(function (id) {
            return consumers.every(function (consumer) {
              return FB.faithHistoricalAvailable(id,candidate,consumer);
            });
          }),
          pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
      } finally {
        FBDATA.cultures = rawCultures; FBDATA.religions = rawReligions;
        FBDATA.bookmarks['568'] = originalBookmark;
        FB.invalidateCultureData(); FB.invalidateReligionData();
      }
    })).toEqual({compiled:[
      {id:'langobard_568',parent:null,tradition:'west_european',dyn:'of_place',
        nonempty:true,generated:true,eraPools:true,portrait:true,noRaid:true},
      {id:'avar_568',parent:null,tradition:'other',dyn:'of_place',
        nonempty:true,generated:true,eraPools:true,portrait:true,noRaid:true}
    ],culturesValid:[],religionsValid:[],dated:true,exact:true,previous:true,
    doctrine:true,originals:true,noNewFaith:true,sasanianHeld:true,broad:true,pure:true});
  });

test('the composer preserves a narrower faith window and consumer restriction on repeated publication',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function () {
      const id = 'insular_traditional_476';
      FBDATA.religions[id] = Object.assign({},FBDATA.religions[id],{
        availability:{yearMin:476,yearMax:550,eras:['late_antique'],
          bookmarkIds:['476','493'],consumers:['community']}});
    });
    await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568.js')});
    await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_568.js')});
    expect(await page.evaluate(function () {
        const id = 'insular_traditional_476', candidate = FB.bookmark('568');
        const availability = FBDATA.religions[id].availability;
        FB.invalidateCultureData(); FB.invalidateReligionData();
        const preserved = JSON.stringify(availability) === JSON.stringify({
          yearMin:476,yearMax:550,eras:['late_antique'],bookmarkIds:['476','493','568'],consumers:['community']});
        const yearBlocked = !FB.faithHistoricalAvailable(id,candidate,'community');
        const earlier = FB.faithHistoricalAvailable(id,FB.bookmark('493'),'community');
        availability.yearMax = 568;
        FB.invalidateReligionData();
        const allowed = FB.faithHistoricalAvailable(id,candidate,'community');
        const consumerBlocked = !FB.faithHistoricalAvailable(id,candidate,'start');
        const eraBlocked = !FB.faithHistoricalAvailable(id,
          {id:'568',era:'high_medieval',date:candidate.date},'community');
        return {preserved:preserved,yearBlocked:yearBlocked,earlier:earlier,allowed:allowed,
          consumerBlocked:consumerBlocked,eraBlocked:eraBlocked,
          valid:FB.validateReligionData(null)};
    })).toEqual({preserved:true,yearBlocked:true,earlier:true,allowed:true,consumerBlocked:true,eraBlocked:true,valid:[]});
  });
