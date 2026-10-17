'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_568.js','data/starts_568.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmarks.js','data/cultures.js','data/eras.js','data/starts.js',
  'data/story_instances.js','data/story_ruler_agendas.js',
  'js/main.js','js/starts.js','js/stories.js','js/story_ruler_agenda.js',
  'js/bookmark_setup.js','js/world.js','js/model.js','js/systems.js','js/ui_misc.js'
]);

// The named opening has no accepted personal faith or complete royal roster.
// Keep this distinct from the hidden bookmark's independent visibility gate.
async function allowDateReview(page) {
  await page.evaluate(function () {
    FBDATA.bookmarks['568'].hidden = false;
    FB.startProgression.noteTier(3);
  });
}

async function chooseBeginning(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}

test('568 retains an anonymous Lombard court without an Alboin start or agenda',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function () {
      const b = FB.bookmark('568');
      const courts = b.realms.filter(function (r) { return r.id === 'lombards_568'; });
      const court = courts[0];
      return {
        courts:courts.length,generated:court.ruler.generated,
        named:!!court.ruler.name,authoredHousehold:!!court.royalCourt,
        kind:court.government,capital:court.capital,
        starts:FBDATA.startScenarios.filter(function (s) {
          return s.id === 'alboin_568' || s.rulerRealmId === 'lombards_568';
        }).map(function (s) { return s.id; }),
        agenda:!!FB.stories.get('alboin_agenda_568')
      };
    })).toEqual({courts:1,generated:true,named:false,authoredHousehold:false,
      kind:'regnum',capital:'moson',starts:[],agenda:false});
  });

test('Alboin stays absent from setup and start codes when 568 is locally visible',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await allowDateReview(page);
    expect(await page.evaluate(function () { return FB.bookmarkAvailable('568'); })).toBe(true);
    await chooseBeginning(page);
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('ALBOINREVIEW-568-alboin_568-moson-m-Alboin-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('parse');
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    await page.locator('#ng-cancel').click();
    await page.locator('#bookmarklist [data-bookmark="568"]').click();
    await expect(page.locator('#scenariolist [data-scenario="farmer_568"]')).toBeVisible();
    await expect(page.locator('#scenariolist [data-scenario="alboin_568"]')).toHaveCount(0);
    await expect(page.locator('#scenariolist')).not.toContainText('Alboin');
  });

test('direct creation cannot adopt the anonymous Lombard principal as Alboin',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await allowDateReview(page);
    expect(await page.evaluate(function () {
      return new Promise(function (resolve) {
        FB.activateBookmark('568',null,function (error) { resolve(error && error.message || null); });
      });
    })).toBeNull();
    expect(await page.evaluate(function () {
      const b = FB.bookmark('568');
      const court = b.realms.find(function (r) { return r.id === 'lombards_568'; });
      const ordinary = FBDATA.startScenarios.find(function (s) { return s.id === 'farmer_568'; });
      // Simulate stale or fabricated direct-entry metadata. No scenario is
      // registered and no historical religion or household is fabricated.
      const candidate = Object.assign({},ordinary,{
        id:'alboin_568',characterName:'Alboin',rulerRealmId:'lombards_568',
        fixedProvinceId:'moson',governmentForm:court.government,sex:'m',
        startCulture:court.ruler.culture,startReligion:court.religion
      });
      FB.game.pending = {bookmarkId:'568',seed:'ALBOINREVIEW',provinceId:'moson',
        culture:candidate.startCulture,religion:candidate.startReligion,scenario:candidate};
      const state = FB.state, bytes = JSON.stringify(state);
      const rng = FB.getRngState(), uid = FB.getUidCounter(), data = JSON.stringify(FBDATA);
      const accepted = FB.game.start();
      return {available:FB.bookmarkAvailable('568'),
        ordinaryPlace:FB.startProvinceAllowed(ordinary,b,'moson'),accepted:accepted,
        sameState:state === FB.state && bytes === JSON.stringify(FB.state),
        sameRng:rng === FB.getRngState(),sameUid:uid === FB.getUidCounter(),
        sameData:data === JSON.stringify(FBDATA)};
    })).toEqual({available:true,ordinaryPlace:true,accepted:false,
      sameState:true,sameRng:true,sameUid:true,sameData:true});
  });
