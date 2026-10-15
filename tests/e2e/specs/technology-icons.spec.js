'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'data/technology.js', 'js/technology.js', 'js/ui_misc.js', 'js/ui_modals.js'
]);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('reported technology icons use older symbols consistently across catalogue and details',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    const ids = [
      'standardized_coinage', 'stone_sawing', 'wheeled_carts', 'mint_assay',
      'anatomy_texts', 'tax_assessment', 'scutage', 'siege_engineering',
      'counterweight_trebuchet', 'tanning', 'legume_rotation'
    ];
    const entries = await page.evaluate(function (technologyIds) {
      FB.ui.showTech();
      return technologyIds.map(function (id) {
        return { id:id, icon:FBDATA.tech[id].icon, name:FBDATA.tech[id].name };
      });
    }, ids);
    for (const entry of entries) {
      // Restrict these replacements to long-established glyphs, avoiding the
      // newer coin, saw, wheel, anatomical heart, rock, bison and beans fonts.
      expect(['💰', '⚒', '⚙', '📖', '🎯', '🐂', '🌿']).toContain(entry.icon);
      const row = page.locator('.tech-entry[data-tech-open="' + entry.id + '"]');
      await expect(row.locator('.tech-entry-icon')).toHaveText(entry.icon);
      await expect(row).toContainText(entry.name);
      await row.click();
      await expect(page.locator('#gm-title')).toContainText(entry.icon + ' ' + entry.name);
      await page.locator('#tech-back').click();
      await expect(row.locator('.tech-entry-icon')).toHaveText(entry.icon);
    }
  });
