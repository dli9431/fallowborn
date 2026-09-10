'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/messages.js', 'js/save.js', 'js/ui_modals.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('retention removes only old routine world notices independently of visibility', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.chronicle = { v:1, partial:false, strings:['news.modifier.county_expired',
      'news.rebellion.warning', 'news.rebellion.ai_settlement', 'news.rebellion.ended'], entries:[], heads:[] };
    function row(year, key, audience, choice) {
      return [year, 0, 1, [key, { province:'Foreign probe' }], choice ? 1 : 0, null, '', '', 0, 1, audience];
    }
    s.chronicle.entries = [row(867,0,4), row(867,1,4), row(867,2,4), row(867,3,4),
      row(867,0,1), row(867,0,2), row(867,0,4,true), row(876,0,4), row(867,0,null)];
    s.date.year = 880;
    FB.game.uiPrefs.newsAll = true;
    const rng = FB.getRngState();
    const saved = JSON.parse(FB.save.serialize());
    const first = saved.state.chronicle;
    FB.game.uiPrefs.newsAll = false; FB.game.uiPrefs.newsFamily = false; FB.game.uiPrefs.newsRealm = false;
    const again = JSON.parse(FB.save.serialize()).state.chronicle;
    s.date.year = 882;
    const later = JSON.parse(FB.save.serialize()).state.chronicle;
    const exported = FB.save.chronicleData(s);
    FB.ui.showChronicleViewer(exported);
    return { count:first.entries.length, removed:first.retention.removed,
      stable:JSON.stringify(first) === JSON.stringify(again), later:later.entries.length,
      totalRemoved:later.retention.removed, major:later.entries.some(function (row) { return row[3][0] === 3; }),
      complete:exported.complete, exportRemoved:exported.retention.removed, rngStable:rng === FB.getRngState() };
  });
  expect(result).toEqual({ count:5, removed:4, stable:true, later:4, totalRemoved:5,
    major:true, complete:false, exportRemoved:5, rngStable:true });
  await expect(page.locator('.chronicle-archive-warning')).toContainText('5 older notices have been removed');
});
