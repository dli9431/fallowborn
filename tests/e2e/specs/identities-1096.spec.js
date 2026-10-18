'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {releasedCatalogue} = require('../support/released-catalogue');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const released = require('../fixtures/released-catalogue.json');

dependsOnRuntime(__filename,[
  'index.html','data/identities_1096.js','data/bookmark_1096.js',
  'data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js',
  'data/cultures.js','data/bookmarks.js','data/eras.js','data/starts.js',
  'data/religious_institutions.js','data/islamic_profiles.js',
  'data/government_rollout.js','data/communal_revisions.js',
  'js/model.js','js/world.js','js/starts.js','js/mods.js','js/main.js',
  'js/save.js','js/save_v4.js','js/ui_modals.js','js/crazygames.js'
]);

test.beforeEach(async function ({page}) {
  // Observe the real pre-publication definition through the shipped loader.
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {};
    Object.defineProperty(FBDATA,'bookmarkFaithAvailability1096',{
      configurable:true,
      set:function (value) {
        window.__before1096InstitutionScope = JSON.parse(JSON.stringify(this.religions.rabbanite));
        Object.defineProperty(this,'bookmarkFaithAvailability1096',{
          configurable:true,enumerable:true,writable:true,value:value
        });
      }
    });
  });
});

for (const crazygames of [false,true]) {
  test('1096 institution eligibility preserves household identity on ' + (crazygames ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      if (crazygames) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
          window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      expect(await page.evaluate(function () {
        const b = FB.bookmark('1096');
        const before = window.__before1096InstitutionScope;
        const current = JSON.parse(JSON.stringify(FBDATA.religions.rabbanite));
        const dates = current.availability.bookmarkIds;
        const permissions = dates.filter(function (id) { return id !== '1096'; });
        current.availability.bookmarkIds = permissions;
        const consumers = ['community','character','ruler','institution','start','story','conversion','project'];
        const expired = ['ismaili_fatimid','ismaili_nizari_1204','ismaili_tayyibi_1204',
          'ibadi','zaydi','imami_pre_occultation','imami_twelver','karaite','samaritan'];
        const egypt = b.realms.find(function (r) { return r.id === 'fatimid_1096'; });
        const residents = ['alexandria','rosetta','fustat','fayyum','asyut','luxor','aswan'];
        return {distribution:FB.platform.isCrazyGames,
          selectors:FBDATA.bookmarkFaithAvailability1096,
          addedOnce:dates.filter(function (id) { return id === '1096'; }).length === 1,
          unchanged:JSON.stringify(current) === JSON.stringify(before),
          institutionOnly:consumers.map(function (consumer) {
            return FB.faithHistoricalAvailable('rabbanite',b,consumer);
          }),
          prior:before.availability.bookmarkIds.every(function (id) {
            return FB.faithHistoricalAvailable('rabbanite',FB.bookmark(id),'institution') &&
              !FB.faithHistoricalAvailable('rabbanite',FB.bookmark(id),'start');
          }),
          jewish:consumers.every(function (consumer) {
            return FB.faithHistoricalAvailable('jewish',b,consumer);
          }),
          community:['mainz','cologne','worms'].every(function (id) {
            return FB.provinceCommunities(b.provinces.find(function (p) { return p.id === id; }))
              .some(function (c) { return c.culture === 'ashkenazi' && c.religion === 'jewish'; });
          }),
          culture:FB.cultureExists('ashkenazi',null),
          narrowHeld:expired.every(function (id) {
            return consumers.every(function (consumer) { return !FB.faithHistoricalAvailable(id,b,consumer); });
          }),
          fatimid:egypt.religion,
          egypt:residents.every(function (id) {
            const p = b.provinces.find(function (p) { return p.id === id; });
            return p.religion === 'sunni' && p.communities.some(function (c) {
              return c.culture === 'arabic' && c.religion === 'sunni';
            });
          }),
          noInstitution:Object.keys(b.localInstitutions).length === 0,
          faults:FB.validateReligionData(null),world:FB.validateBookmark(b)};
      })).toEqual({distribution:crazygames,selectors:{rabbanite:{bookmarkIds:['1096']}},
        addedOnce:true,unchanged:true,institutionOnly:[false,false,false,true,false,false,false,false],
        prior:true,jewish:true,community:true,culture:true,narrowHeld:true,
        fatimid:'shia',egypt:true,noInstitution:true,faults:[],world:[]});
      expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
    });
}

test('reloading the staged identity source does not publish or initialize anything',async function ({page},info) {
  await openGame(page,info);
  const before = await page.evaluate(function () {
    const faith = JSON.parse(JSON.stringify(FBDATA.religions.rabbanite));
    faith.availability.bookmarkIds = faith.availability.bookmarkIds.filter(function (id) { return id !== '1096'; });
    FBDATA.religions.rabbanite = faith;
    FB.invalidateReligionData();
    return {data:JSON.stringify(FBDATA),state:JSON.stringify(FB.state),
      rng:FB.getRngState(),uid:FB.getUidCounter()};
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/identities_1096.js')});
  expect(await page.evaluate(function (before) {
    return {unpublished:!FB.faithHistoricalAvailable('rabbanite',FB.bookmark('1096'),'institution'),
      unchanged:before.data === JSON.stringify(FBDATA) && before.state === JSON.stringify(FB.state) &&
        before.rng === FB.getRngState() && before.uid === FB.getUidCounter()};
  },before)).toEqual({unpublished:true,unchanged:true});
});

test('publication retains narrower years, eras and consumers and adds no duplicate selector',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {
    const faith = JSON.parse(JSON.stringify(FBDATA.religions.rabbanite));
    faith.availability = {yearMin:1066,yearMax:1095,eras:['high_medieval'],
      bookmarkIds:['1066'],consumers:['institution']};
    FBDATA.religions.rabbanite = faith;
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1096.js')});
  await page.addScriptTag({path:path.resolve(__dirname,'../../../data/bookmark_1096.js')});
  expect(await page.evaluate(function () {
    FB.invalidateReligionData();
    const b = FB.bookmark('1096');
    const availability = FB.faithAvailability('rabbanite',null);
    const yearBlocked = !FB.faithHistoricalAvailable('rabbanite',b,'institution');
    const prior = FB.faithHistoricalAvailable('rabbanite',FB.bookmark('1066'),'institution');
    FBDATA.religions.rabbanite.availability.yearMax = 1096;
    FB.invalidateReligionData();
    return {availability:availability,yearBlocked:yearBlocked,prior:prior,
      institution:FB.faithHistoricalAvailable('rabbanite',b,'institution'),
      household:FB.faithHistoricalAvailable('rabbanite',b,'start'),
      wrongEra:FB.faithHistoricalAvailable('rabbanite',
        {id:'1096',era:'late_antique',date:b.date},'institution')};
  })).toEqual({availability:{yearMin:1066,yearMax:1095,eras:['high_medieval'],
    bookmarkIds:['1066','1096'],consumers:['institution']},yearBlocked:true,prior:true,
    institution:true,household:false,wrongEra:false});
});

test('detached imports reject malformed scope and forbidden historical assignments without mutation',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify([FBDATA,FB.state]), rng = FB.getRngState(), uid = FB.getUidCounter();
    const badScopes = [
      {bookmarkIds:['1096','1096'],consumers:['institution']},
      {bookmarkIds:['absent_date'],consumers:['institution']},
      {bookmarkIds:'1096',consumers:['institution']},
      {bookmarkIds:['1096'],consumers:['household']},
      {bookmarkIds:['1096'],yearMin:1097,yearMax:1096},
      {bookmarkIds:['1096'],yearMin:1096.5},
      {bookmarkIds:['1096'],eras:['absent_era']},
      {bookmarkIds:['1096'],consumers:['institution','institution']},
      {bookmarkIds:['1096'],unknown:true}
    ];
    const rejected = badScopes.map(function (scope) {
      const faith = JSON.parse(JSON.stringify(FBDATA.religions.rabbanite));
      faith.availability = scope;
      return FB.mods.validate({name:'Rejected institution scope',religions:{rabbanite:faith}}).length > 0;
    });
    function rejects(change) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('1096')));
      change(b);
      return FB.validateBookmark(b).some(function (fault) {
        return fault.indexOf('unavailable for this dated consumer') >= 0;
      });
    }
    const assignments = [
      rejects(function (b) { b.provinces.find(function (p) { return p.id === 'mainz'; })
        .communities[1].religion = 'rabbanite'; }),
      rejects(function (b) { b.realms.find(function (r) { return r.id === 'fatimid_1096'; })
        .religion = 'ismaili_fatimid'; }),
      rejects(function (b) { b.realms.find(function (r) { return r.id === 'fatimid_1096'; })
        .religion = 'ismaili_tayyibi_1204'; })
    ];
    return {rejected:rejected,assignments:assignments,
      pure:before === JSON.stringify([FBDATA,FB.state]) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(9).fill(true),assignments:[true,true,true],pure:true});
});

for (const crazygames of [false,true]) {
  test('an ordinary Jewish household retains its people and identity through restore on ' +
    (crazygames ? 'CrazyGames' : 'standard'),async function ({page},info) {
      await startHistoricalGame(page,info,{bookmark:'1096',
        code:'IDENTITY-1096-farmer-mainz-m-Levi-established-0-ashkenazi.jewish'},crazygames);
      const saved = await page.evaluate(function () { return JSON.stringify(FB.game.exportData()); });
      const before = await page.evaluate(function () {
        const s = FB.state;
        return {start:s.start,people:Object.keys(s.chars).sort().map(function (id) {
          const c = s.chars[id];
          return [c.id,c.culture,c.religion,c.spouseId,c.childrenIds,c.religiousAffiliations || []];
        }),protagonist:{id:s.player.charId,culture:s.chars[s.player.charId].culture,
          religion:s.chars[s.player.charId].religion,home:s.chars[s.player.charId].homeProvinceId},
          funds:[s.player.gold,s.player.piety,s.player.prestige],
          institutions:s.localInstitutions,heads:s.religiousHeads,
          rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
      });
      expect(before.protagonist.culture).toBe('ashkenazi');
      expect(before.protagonist.religion).toBe('jewish');
      await restoreBookmark(page,saved);
      expect(await page.evaluate(function () {
        const s = FB.state;
        return {start:s.start,people:Object.keys(s.chars).sort().map(function (id) {
          const c = s.chars[id];
          return [c.id,c.culture,c.religion,c.spouseId,c.childrenIds,c.religiousAffiliations || []];
        }),protagonist:{id:s.player.charId,culture:s.chars[s.player.charId].culture,
          religion:s.chars[s.player.charId].religion,home:s.chars[s.player.charId].homeProvinceId},
          funds:[s.player.gold,s.player.piety,s.player.prestige],
          institutions:s.localInstitutions,heads:s.religiousHeads,
          rng:FB.getRngState() >>> 0,uid:FB.getUidCounter()};
      })).toEqual(before);
    });
}

test('an ordinary JSON import can narrow the institution window without changing household faith',async function ({page},info) {
  await openGame(page,info);
  const mod = await page.evaluate(function () {
    const faith = JSON.parse(JSON.stringify(FBDATA.religions.rabbanite));
    faith.availability = {yearMin:1096,yearMax:1096,eras:['high_medieval'],
      bookmarkIds:['1096'],consumers:['institution']};
    const mod = {name:'One-year institution authoring',religions:{rabbanite:faith}};
    const faults = FB.mods.validate(mod);
    if (faults.length) throw new Error(faults.join('\n'));
    return mod;
  });
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'institution-window.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () { return window.FB && FB.game && FB.game.bootReady && FB.mods.count() === 1; });
  expect(await page.evaluate(function () {
    const date = FB.bookmark('1096');
    return {scope:FB.faithAvailability('rabbanite',null),
      institution:FB.faithHistoricalAvailable('rabbanite',date,'institution'),
      earlier:FB.faithHistoricalAvailable('rabbanite',FB.bookmark('1066'),'institution'),
      nextYear:FB.faithHistoricalAvailable('rabbanite',Object.assign({},date,{date:{year:1097,season:0,day:1}}),'institution'),
      household:FB.faithHistoricalAvailable('rabbanite',date,'start'),
      jewish:FB.faithHistoricalAvailable('jewish',date,'start'),
      faults:FB.validateBookmark(date)};
  })).toEqual({scope:mod.religions.rabbanite.availability,institution:true,
    earlier:false,nextYear:false,household:false,jewish:true,faults:[]});
  await startHistoricalGame(page,info,{bookmark:'1096',
    code:'IMPORTIDENTITY-1096-farmer-mainz-f-Leah-established-0-ashkenazi.jewish'},false);
  const saved = await page.evaluate(function () { return JSON.stringify(FB.game.exportData()); });
  await restoreBookmark(page,saved);
  expect(await page.evaluate(function () {
    return FB.state.chars[FB.state.player.charId].religion;
  })).toBe('jewish');
  // A changed eligibility window under the same mod name is a different world.
  mod.religions.rabbanite.availability.yearMax = 1097;
  await page.evaluate(function (mod) {
    localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
  },mod);
  await openGame(page,info);
  expect(await page.evaluate(function (text) {
    const source = JSON.parse(text), original = JSON.stringify(source);
    const live = FB.state, world = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    return FB.game.loadData(source) === false && original === JSON.stringify(source) &&
      live === FB.state && world === FB.world && rng === FB.getRngState() && uid === FB.getUidCounter();
  },saved)).toBe(true);
});
