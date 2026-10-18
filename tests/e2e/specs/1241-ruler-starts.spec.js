'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1241.js','data/identities_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js',
  'data/bookmark_1241_scaffold_c.js','data/bookmark_1241_scaffold_d.js',
  'data/bookmarks.js','data/cultures.js','data/eras.js','data/starts.js',
  'data/story_instances.js','data/story_ruler_agendas.js',
  'js/main.js','js/starts.js','js/stories.js','js/story_ruler_agenda.js',
  'js/bookmark_setup.js','js/world.js','js/model.js','js/systems.js','js/ui_misc.js'
]);

const openings = [
  {id:'bela_1241',name:'Bela',realm:'hungary_1241',county:'szekesfehervar',agenda:'bela_agenda_1241'},
  {id:'yaroslav_1241',name:'Yaroslav',realm:'vladimir_1241',county:'suzdal',agenda:'yaroslav_agenda_1241'}
];

// Expose only the date and ordinary role progression. The named starts must
// remain unavailable independently of the bookmark's visibility setting.
async function allowDateReview(page) {
  await page.evaluate(function () {
    FBDATA.bookmarks['1241'].hidden = false;
    FB.startProgression.noteTier(3);
  });
}

test('1241 background courts do not register Bela or Yaroslav openings or agendas',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    expect(await page.evaluate(function (rows) {
      const b = FB.bookmark('1241');
      return rows.map(function (row) {
        const courts = b.realms.filter(function (r) { return r.id === row.realm; });
        const court = courts[0];
        return {
          id:row.id,courts:courts.length,name:court.ruler.name || null,
          generated:!!court.ruler.generated,authoredHousehold:!!court.royalCourt,
          starts:FBDATA.startScenarios.filter(function (s) {
            return s.id === row.id || s.rulerRealmId === row.realm;
          }).map(function (s) { return s.id; }),
          agenda:!!FB.stories.get(row.agenda)
        };
      });
    },openings)).toEqual([
      {id:'bela_1241',courts:1,name:'Bela IV',generated:false,
        authoredHousehold:false,starts:[],agenda:false},
      {id:'yaroslav_1241',courts:1,name:'Yaroslav Vsevolodovich',generated:false,
        authoredHousehold:false,starts:[],agenda:false}
    ]);
  });

openings.forEach(function (opening) {
  test(opening.id+' stays absent from setup and start codes when 1241 is visible',
    async function ({page},testInfo) {
      await openGame(page,testInfo);
      await allowDateReview(page);
      expect(await page.evaluate(function () { return FB.bookmarkAvailable('1241'); })).toBe(true);
      const full = page.locator('#btn-choose-beginning');
      if (await full.isVisible()) await full.click();
      else await page.getByRole('button',{name:'New Game',exact:true}).click();
      await page.locator('#btn-bm-seed').click();
      await page.locator('#ng-seed').fill('RULERREVIEW-1241-'+opening.id+'-'+opening.county+'-m-'+opening.name+'-standard');
      await page.locator('#ng-seed').press('Enter');
      await expect(page.locator('#ng-seed-err')).toContainText('parse');
      await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
      await page.locator('#ng-cancel').click();
      await page.locator('#bookmarklist [data-bookmark="1241"]').click();
      await expect(page.locator('#scenariolist [data-scenario="farmer"]')).toBeVisible();
      await expect(page.locator('#scenariolist [data-scenario="'+opening.id+'"]')).toHaveCount(0);
      await expect(page.locator('#scenariolist')).not.toContainText(opening.name);
    });

  test(opening.id+' direct lookup cannot create a campaign from its background court',
    async function ({page},testInfo) {
      await openGame(page,testInfo);
      await allowDateReview(page);
      expect(await page.evaluate(function () {
        return new Promise(function (resolve) {
          FB.activateBookmark('1241',null,function (error) { resolve(error && error.message || null); });
        });
      })).toBeNull();
      expect(await page.evaluate(function (row) {
        const b = FB.bookmark('1241');
        const ordinary = FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; });
        const scenario = FBDATA.startScenarios.find(function (s) { return s.id === row.id; });
        FB.game.pending = {bookmarkId:'1241',seed:'RULERREVIEW',provinceId:row.county,scenario:scenario};
        const state = FB.state, bytes = JSON.stringify(state), data = JSON.stringify(FBDATA);
        const rng = FB.getRngState(), uid = FB.getUidCounter();
        const accepted = FB.game.start();
        return {
          available:FB.bookmarkAvailable('1241'),ordinaryPlace:FB.startProvinceAllowed(ordinary,b,row.county),
          found:!!scenario,accepted:accepted,
          sameState:state === FB.state && bytes === JSON.stringify(FB.state),
          sameRng:rng === FB.getRngState(),sameUid:uid === FB.getUidCounter(),
          sameData:data === JSON.stringify(FBDATA)
        };
      },opening)).toEqual({available:true,ordinaryPlace:true,found:false,accepted:false,
        sameState:true,sameRng:true,sameUid:true,sameData:true});
    });
});
