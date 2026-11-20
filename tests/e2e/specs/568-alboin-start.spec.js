'use strict';
const {test,expect} = require('../support/fixture');
const {openGame,openTitle} = require('../support/game/navigation');
const {useReleasedStartRules,useReviewStartRules} = require('../support/game/released-starts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_manifest.js','data/bookmark_568.js','data/starts_568.js',
  'data/bookmark_568_composition.js','data/bookmark_568_identities.js',
  'data/bookmark_568_scaffold_a.js','data/bookmark_568_scaffold_b.js',
  'data/bookmark_568_scaffold_c.js','data/bookmark_568_scaffold_d.js',
  'data/bookmarks.js','data/cultures.js','data/eras.js','data/starts.js',
  'data/starts_568_ravenna.js','data/starts_rulers_568.js','data/starts_rulers_568_east.js',
  'data/story_instances.js','data/story_ruler_agendas.js',
  'data/story_ruler_agendas_568.js','data/story_ruler_agendas_568_east.js',
  'js/main.js','js/starts.js','js/stories.js','js/story_ruler_agenda.js',
  'js/bookmark_sources.js','js/bookmark_composition.js',
  'js/bookmark_setup.js','js/world.js','js/model.js','js/systems.js','js/ui_misc.js'
]);

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
      return {
        fresh:b.revision,
        courts:FB.bookmarkRevisions('568').map(function (revision) {
          return {
            revision:revision.revision,
            principals:revision.realms.filter(function (r) { return r.id === 'lombards_568'; })
              .map(function (court) {
                return {generated:court.ruler.generated,named:!!court.ruler.name,
                  authoredHousehold:!!court.royalCourt,kind:court.government,capital:court.capital,
                  culture:court.ruler.culture,faith:court.religion};
              }),
            alboinOffered:revision.starts.includes('alboin_568')
          };
        }),
        starts:FBDATA.startScenarios.filter(function (s) {
          return s.id === 'alboin_568' || s.rulerRealmId === 'lombards_568';
        }).map(function (s) { return s.id; }),
        agenda:!!FB.stories.get('alboin_agenda_568')
      };
    })).toEqual({fresh:'eastern_courts_v3',
      courts:['baseline','migration_v1','frankish_courts_v2','eastern_courts_v3'].map(function (revision) {
        return {revision:revision,principals:[{generated:true,named:false,authoredHousehold:false,
          kind:'regnum',capital:'moson',culture:'langobard_568',faith:'germanic_pagan'}],alboinOffered:false};
      }),starts:[],agenda:false});
  });

test('Alboin stays absent from the released 568 picker and start codes',
  async function ({page},testInfo) {
    await useReleasedStartRules(page);
    await openTitle(page,testInfo);
    await chooseBeginning(page);
    await expect(page.locator('#bookmarklist [data-bookmark="568"]')).toBeVisible();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('ALBOINREVIEW-568-alboin_568-moson-m-Alboin-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#ng-seed-err')).toContainText('parse',{timeout:30 * 1000});
    expect(await page.evaluate(function () { return FB.bookmarkAvailable('568'); })).toBe(true);
    await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
    await page.locator('#ng-cancel').click();
    await page.locator('#bookmarklist [data-bookmark="568"]').click();
    const farmer = page.locator('#scenariolist [data-scenario="farmer_568"]');
    await expect(farmer).toBeVisible({timeout:30 * 1000});
    await expect(farmer).not.toHaveAttribute('aria-disabled','true');
    await expect(page.locator('#scenariolist [data-scenario="alboin_568"]')).toHaveCount(0);
    await expect(page.locator('#scenariolist')).not.toContainText('Alboin');
  });

test('direct creation cannot adopt the anonymous Lombard principal as Alboin',
  async function ({page},testInfo) {
    // Use a campaign-ready catalogue so the constructor reaches scenario validation.
    await useReviewStartRules(page);
    await openGame(page,testInfo);
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('568',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    expect(await page.evaluate(function () {
      return {active:FB.activeBookmarkId,ready:FB.game.campaignReady('568'),review:FBDATA.reviewOpenStarts};
    })).toEqual({active:'568',ready:true,review:true});
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
    await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  });
