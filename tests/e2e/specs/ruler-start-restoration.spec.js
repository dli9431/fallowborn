'use strict';
const {test, expect} = require('../support/fixture');
const {beginRuler1096} = require('../support/game/rulers-1096');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/starts.js','js/main.js','js/world.js','js/actions.js',
  'js/treasury.js','js/save.js','js/save_v4.js','js/government_lineage.js',
  'data/starts_western_rulers_1096.js','data/starts_eastern_rulers_1096.js',
  'data/bookmark_1096.js','data/bookmark_1096_mainz.js',
  'data/bookmark_1096_western_expeditions.js','data/bookmark_1096_pilgrim.js']);

for (const id of ['godfrey_1096','raymond_1096','bohemond_1096','kilij_arslan_1096']) {
  test(id + ' starts with canonical household and vassal records and restores exactly twice', async function ({page}, info) {
    await beginRuler1096(page, info, id);
    const source = await page.evaluate(function () {
      const s = FB.state, before = FB.save.serialize(), rng = FB.getRngState(), uid = FB.getUidCounter();
      if (!s.realms.player.succession || !s.realms.player.succession.playerDynasty)
        throw new Error('Adoption left household succession for restore');
      const vassals = FB.playerVassals(s).filter(function (rid) {
        return FB.systemEnabled(s, 'feudal_service', {realm:rid});
      });
      if (vassals.some(function (rid) { return !s.realms[rid].feudalContract; }))
        throw new Error('Fresh vassal contract missing');
      if (s.start.scenarioId === 'kilij_arslan_1096' &&
          ['c_ikonion','d_opsikion'].some(function (rid) {
            return vassals.indexOf(rid) < 0 || s.realms[rid].feudalContract.charterId !== 'customary_service';
          })) throw new Error('Nicaean vassal initialization changed');
      FB.ensureLocalGovernment(s, true);
      if (before !== FB.save.serialize() || rng !== FB.getRngState() || uid !== FB.getUidCounter())
        throw new Error('Fresh local-government setup was not idempotent');
      return before;
    });
    const before = JSON.parse(source);
    for (let round = 0; round < 2; round++) {
      await restoreBookmark(page, source);
      const after = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      for (const key of ['start','stories','chars','owner','holder','realms','player','armies','authority']) {
        expect(after.state[key], key).toEqual(before.state[key]);
      }
      expect(after.rng >>> 0).toBe(before.rng >>> 0);
      expect(after.uid).toBe(before.uid);
      expect(after.mods).toBe(before.mods);
    }
  });
}
