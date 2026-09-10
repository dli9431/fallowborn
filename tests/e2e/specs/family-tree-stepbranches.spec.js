'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_panels.js', 'js/ui_misc.js', 'js/ui_modals.js',
  'js/model.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

for (const scenario of [
  { name:'visible child without another recorded parent', visible:true, parent:false, ghost:false },
  { name:'visible child with an already connected parent', visible:true, parent:true, ghost:false },
  { name:'unseen child with a recorded parent', visible:false, parent:true, ghost:false },
  { name:'unseen child with missing parent records', visible:false, parent:false, ghost:true }
]) {
  test('stepfamily tree handles ' + scenario.name, async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const result = await page.evaluate(function (scenario) {
      const s = FB.state, me = s.chars[s.player.charId];
      // Isolate the navigator from the generated starting pedigree.
      s.chars = {}; s.chars[me.id] = me;
      me.fatherId = null; me.motherId = null; me.spouseId = null;
      me.childrenIds = []; me.stepParentIds = [];
      s.player.houseFounderId = me.id;
      s.player.familyParentMigration = 1;
      function make(name, sex, age) {
        return FB.makeCharacter(s, { name:name, sex:sex, born:s.date.year - age,
          culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0 });
      }
      const child = make('Leocadia', 'f', 10);
      child.fatherId = null; child.motherId = null; child.stepParentIds = [me.id];
      const parent = scenario.parent ? make('Recorded parent', 'm', 35) : null;
      if (parent) { child.fatherId = parent.id; parent.childrenIds = [child.id]; }
      if (scenario.visible) me.childrenIds.push(child.id);
      FB.touchFamily();
      const before = JSON.stringify(s), rng = FB.getRngState();
      FB.ui.showFamilyTree();
      return { child:child.id, parent:parent && parent.id,
        unchanged:before === JSON.stringify(s) && rng === FB.getRngState() };
    }, scenario);
    const canvas = page.locator('.family-tree-primary');
    await expect(canvas.locator('[data-cid="' + result.child + '"]')).toHaveCount(1);
    await expect(canvas.locator('.ftchip.dup')).toHaveCount(0);
    if (result.parent) await expect(canvas.locator('[data-cid="' + result.parent + '"]')).toHaveCount(1);
    if (scenario.ghost) await expect(canvas).toContainText('Earlier household');
    else await expect(canvas).not.toContainText('Earlier household');
    expect(result.unchanged).toBe(true);
  });
}
