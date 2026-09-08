'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/ui_panels.js', 'css/style.css']);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('Self skill names fit on one line beside their bars and values', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width:width, height:800 });
    await page.evaluate(function () {
      FB.game.setPaused(true);
      FB.ui.showTab('char', { history:false });
      FB.ui.refresh();
    });
    const labels = page.locator('.self-overview-skills .skill-label');
    await expect(labels).toHaveCount(5);
    await expect(labels.first()).toBeVisible();
    const layout = await labels.evaluateAll(function (nodes) {
      return nodes.map(function (label) {
        const range = document.createRange();
        range.selectNodeContents(label);
        const text = range.getBoundingClientRect();
        const bounds = label.getBoundingClientRect();
        const row = label.parentElement.getBoundingClientRect();
        const bar = label.parentElement.querySelector('.bar').getBoundingClientRect();
        const number = label.parentElement.querySelector('.num').getBoundingClientRect();
        return {
          singleLine:range.getClientRects().length === 1,
          fullLabel:text.left >= bounds.left && text.right <= bounds.right + 1,
          barFits:bar.width > 0 && bar.left >= bounds.right,
          valueFits:number.left >= bar.right && number.right <= row.right + 1
        };
      });
    });
    for (const row of layout) {
      expect(row).toEqual({ singleLine:true, fullLabel:true, barFits:true, valueFits:true });
    }
  }
});
