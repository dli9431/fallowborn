'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/i18n.js',
  'js/messages.js',
  'js/ui_panels.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('the chronicle grows by prepend and trims, identical to a full rebuild',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    await page.evaluate(function () {
      FB.ui.showTab('log');
      FB.ui.refresh();
    });

    const result = await page.evaluate(async function () {
      function twoFrames() {
        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            requestAnimationFrame(resolve);
          });
        });
      }
      const s = FB.state;
      const SH = FB.ui._shared;
      const box = document.getElementById('tab-log');
      await twoFrames();

      /* seed two probe entries first so the preserved-node check never
         depends on how much chronicle the start wrote */
      for (let i = 0; i < 2; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_seed_' + i,
          'E2E chronicle seed {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();
      const oldSecond = box.querySelectorAll('.logentry')[1];

      /* a burst of news in one JS turn: the coalesced refresh takes the
         incremental append path */
      for (let i = 0; i < 5; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_probe_' + i,
          'E2E chronicle probe {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();

      const appended = box.innerHTML;
      const entries = box.querySelectorAll('.logentry');
      const newestFirst =
        appended.indexOf('probe 4') >= 0 &&
        appended.indexOf('probe 4') < appended.indexOf('probe 3') &&
        appended.indexOf('probe 3') < appended.indexOf('probe 0');
      /* existing nodes are preserved by the prepend, not reparsed: the old
         second entry is the same node object, now five places lower */
      const preserved = !!oldSecond && box.contains(oldSecond) &&
        box.querySelectorAll('.logentry')[6] === oldSecond;
      const quietStable = entries.length;

      /* a quiet refresh leaves the DOM exactly as it was */
      FB.ui.refresh();
      await twoFrames();
      const quietUnchanged = box.innerHTML === appended &&
        box.querySelectorAll('.logentry').length === quietStable;

      /* forcing the guard's fallback must produce byte-identical markup */
      SH.logRenderedLen = -1;
      FB.ui.refresh();
      await twoFrames();
      const rebuildIdentical = box.innerHTML === appended;

      /* a flood appends and trims back to the 80-entry window */
      for (let i = 0; i < 200; i++) {
        FB.news(s, FB.msg('news.e2e.chronicle_flood_' + i,
          'E2E chronicle flood {n}', { n: i }));
      }
      FB.ui.refresh();
      await twoFrames();
      const flooded = box.querySelectorAll('.logentry');
      const floodFirst = flooded[0] && flooded[0].textContent;
      const floodLast = flooded[flooded.length - 1] &&
        flooded[flooded.length - 1].textContent;
      return {
        appended:true,
        newestFirst:newestFirst,
        preserved:preserved,
        quietUnchanged:quietUnchanged,
        rebuildIdentical:rebuildIdentical,
        floodCount:flooded.length,
        floodNewest:!!floodFirst && floodFirst.indexOf('flood 199') >= 0,
        floodOldest:!!floodLast && floodLast.indexOf('flood 120') >= 0
      };
    });

    expect(result).toEqual({
      appended:true,
      newestFirst:true,
      preserved:true,
      quietUnchanged:true,
      rebuildIdentical:true,
      floodCount:80,
      floodNewest:true,
      floodOldest:true
    });
  });
