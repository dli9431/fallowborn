'use strict';
const {test,expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1204.js','data/starts_laskaris_1204.js',
  'data/government_rollout.js','js/world.js','js/model.js','js/items.js',
  'js/starts.js','js/main.js','js/save.js','js/save_v4.js','js/household_party_travel.js'
]);

for (const remote of [false,true]) {
  test('adopted authored family retains '+(remote ? 'separate' : 'ordinary')+' residence',async function ({page},info) {
    await openGame(page,info);
    await page.evaluate(function (remote) {
      FBDATA.bookmarks['1204'].hidden = false;
      FBDATA.bookmarks['1204'].revision = 'baseline';
      FB.startProgression.noteTier(3);
      const realm = FBDATA.bookmarks['1204'].realms.find(function (r) { return r.id === 'nicaea_1204'; });
      // Fictional test family on the real creation path, not historical claims.
      realm.royalCourt = {spouseId:'consort',members:[
        {id:'consort',name:'Residence Consort',sex:'f',born:1178,culture:'greek',religion:'orthodox',spouseId:'ruler'},
        {id:'child',name:'Residence Child',sex:'m',born:1200,culture:'greek',religion:'orthodox',fatherId:'ruler',motherId:'consort'}
      ]};
      if (remote) realm.royalCourt.members.forEach(function (m) { m.homeProvinceId = 'adrianople'; });
    },remote);
    const full = page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RESIDENCE-1204-laskaris_1204-nicaea-m-Theodore_Laskaris-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const result = await page.evaluate(function () {
      FB.game.setPaused(true);
      function facts() {
        const s=FB.state, me=s.chars[s.player.charId], spouse=s.chars[me.spouseId], child=s.chars[me.childrenIds[0]];
        return {home:s.player.provinceId,married:spouse.spouseId===me.id,
          childParents:child.fatherId===me.id && child.motherId===spouse.id,
          residence:[FB.characterResidence(s,spouse),FB.characterResidence(s,child)],
          location:[FB.characterLocation(s,spouse),FB.characterLocation(s,child)],
          ids:[me.id,spouse.id,child.id],explicit:[spouse.householdResidenceId || null,child.householdResidenceId || null]};
      }
      const before=facts(), saved=JSON.parse(FB.save.serialize());
      FB.save.restore(saved);
      const restored=JSON.stringify(before)===JSON.stringify(facts());
      return {before:before,restored:restored,after:facts()};
    });
    const residence=remote ? 'adrianople' : 'nicaea';
    expect(result.before).toMatchObject({home:'nicaea',married:true,childParents:true,
      residence:[residence,residence],location:[residence,residence],
      explicit:remote ? ['adrianople','adrianople'] : [null,null]});
    expect(result.restored).toBe(true);
    expect(result.after.residence).toEqual([residence,residence]);
  });
}
