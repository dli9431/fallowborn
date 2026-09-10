'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/events.js', 'js/ui_misc.js', 'js/ui_panels.js',
  'js/ui_modals.js', 'js/messages.js', 'data/modifiers.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('county modifier receipts use short chips and retain exact effects', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const parts = await page.evaluate(function () {
    FB.game.setPaused(true);
    const s = FB.state, record = { type:'modifier', id:'levy_exemption', pid:'rouen', action:'add' };
    const parts = FB.eventImpactChipTexts(s, record, 'resolved');
    FB.news(s, FB.msg('news.test.chips', 'A concession is confirmed.', {}), {
      toast:false, kind:'choice', receipt:{ schema:1,
        title:FB.msg('news.test.chips.title', 'Concession', {}),
        option:FB.msg('news.test.chips.option', 'Confirm', {}), impacts:[record] }
    });
    FB.ui.showTab('log'); FB.ui.refresh();
    return parts;
  });
  expect(parts).toEqual(['Levy Exemption', 'Rouen', '1080 days', 'Stays with county',
    '-12% county levy', '+6 Popular support']);
  const chips = page.locator('.choice-entry .event-impact-chips.chronicle').first();
  await expect(chips).toBeVisible();
  await expect(chips.locator('.event-impact-chip')).toHaveCount(6);
  // Match the narrow Chronicle card in the reported screenshot.
  await chips.evaluate(function (el) { el.style.width = '270px'; });
  const singleLine = await chips.locator('.event-impact-chip').evaluateAll(function (nodes) {
    return nodes.every(function (node) {
      const range = document.createRange(); range.selectNodeContents(node);
      return range.getClientRects().length === 1;
    });
  });
  expect(singleLine).toBe(true);
});
