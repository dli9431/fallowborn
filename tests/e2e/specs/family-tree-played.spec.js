'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_panels.js', 'js/ui_misc.js', 'js/model.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

for (const kind of ['descendant', 'collateral', 'adopted']) {
  test('played succession highlights actual lives through ' + kind + ' inheritance', async function ({ page }, testInfo) {
    await openGame(page, testInfo); await startDeterministicGame(page);
    const ids = await page.evaluate(function (kind) {
      const s = FB.state, me = s.chars[s.player.charId];
      s.chars = {}; s.chars[me.id] = me;
      me.fatherId = null; me.motherId = null; me.spouseId = null; me.childrenIds = [];
      function person(name, age) {
        return FB.makeCharacter(s, { name:name, sex:'m', born:s.date.year - age,
          culture:me.culture, religion:me.religion, dyn:me.dyn, traitsN:0 });
      }
      const founder = person('Founder probe',90), prior = person('Prior probe',60), heir = person('Future probe',5);
      founder.dead = true; prior.dead = true;
      founder.childrenIds = [prior.id]; prior.fatherId = founder.id;
      if (kind === 'descendant') { prior.childrenIds = [me.id]; me.fatherId = prior.id; }
      if (kind === 'collateral') { founder.childrenIds.push(me.id); me.fatherId = founder.id; }
      heir.fatherId = me.id; me.childrenIds = [heir.id];
      s.player.houseFounderId = founder.id;
      s.legends = [{ id:founder.id }, { id:prior.id }];
      FB.touchFamily();
      const before = JSON.stringify(s), rng = FB.getRngState();
      FB.ui.showFamilyTree();
      return { founder:founder.id, prior:prior.id, current:me.id, heir:heir.id,
        unchanged:before === JSON.stringify(s) && rng === FB.getRngState() };
    }, kind);
    const tree = page.locator('.family-tree-primary');
    await expect(tree.locator('.ftplayed:not(.dup)')).toHaveCount(3);
    await expect(tree.locator('.ftplayed-path')).toHaveCount(0);
    await expect(page.locator('.ftplayed-legend')).toHaveCount(0);
    const priorNode = tree.locator('.ftnode').filter({ has:page.locator(':scope > .ftcouple > [data-cid="' + ids.prior + '"]:not(.dup)') });
    await expect(priorNode).toHaveClass(/ftplayed-drop/);
    await expect(tree.locator('[data-cid="' + ids.heir + '"]').first()).not.toHaveClass(/ftplayed/);
    await expect(tree.locator('[data-cid="' + ids.current + '"] .ftplayed-label').first()).toHaveText('Playing');
    expect(ids.unchanged).toBe(true);
    await page.setViewportSize({ width:390, height:844 });
    await expect(priorNode).toHaveClass(/ftplayed-drop/);
    const colors = await tree.evaluate(function (node) {
      return { border:getComputedStyle(node.querySelector('.ftplayed')).borderTopColor,
        line:getComputedStyle(node.querySelector('.ftplayed-drop'), '::before').borderLeftColor };
    });
    expect(colors.border).toBe(colors.line);
    const connectors = await tree.evaluate(function (node, heirId) {
      const heir = node.querySelector('[data-cid="' + heirId + '"]').closest('.ftnode');
      const rails = Array.from(node.querySelectorAll('.ftplayed-rail'));
      return { heirHighlighted:heir.classList.contains('ftplayed-drop'),
        rails:rails.map(function (rail) { return getComputedStyle(rail, '::after').backgroundImage; }) };
    }, ids.heir);
    expect(connectors.heirHighlighted).toBe(false);
    if (kind === 'collateral') {
      expect(connectors.rails.length).toBeGreaterThan(0);
      expect(connectors.rails.every(function (background) { return background.indexOf('linear-gradient') >= 0; })).toBe(true);
    }
    if (kind === 'descendant') {
      const toggle = tree.locator('[data-ft-toggle="' + ids.prior + '"]');
      await toggle.click();
      await expect(tree.locator('.ftplayed-drop')).toHaveCount(1);
      await toggle.click();
      await expect(tree.locator('.ftplayed-drop')).toHaveCount(2);
    }
  });
}
