'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js',
  'data'
]);
const { test } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { parityMode, settleParityFixture } = require('../support/parity-fixtures');

/* Owner-run raster parity: for each core bookmark, the compiled world's grid
   hash, province areas, centroids, seeds, coastal flags, adjacency, water
   crossings, names and settlement sites. It reads only APIs that predate
   geography bases, so the same file captures a baseline from an older tree
   (docs/TESTS.md, Raster parity). Runs only when FB_PARITY is capture or
   compare. */
test.describe.configure({ mode:'parallel' });

const RASTER_BOOKMARKS = ['867', '1066', '476'];

for (const bookmark of RASTER_BOOKMARKS) {
  test('raster parity ' + bookmark, async function ({ page }, testInfo) {
    test.skip(!parityMode(), 'Set FB_PARITY=capture or FB_PARITY=compare to run parity journeys.');
    test.skip(testInfo.project.name !== 'chromium-served',
      'Parity journeys use the served Chromium target.');
    test.setTimeout(5 * 60 * 1000);

    await openGame(page, testInfo);
    const snapshot = await page.evaluate(function (id) {
      const b = FBDATA.bookmarks[id];
      if (id !== '476' && b && b.revisions && b.revisions.baseline) b.revision = 'baseline';
      return new Promise(function (resolve, reject) {
        FB.activateBookmark(id, null, function (error) {
          if (error) { reject(error); return; }
          const w = FB.world;
          let hash = 2166136261;
          for (let i = 0; i < w.grid.length; i++) {
            hash = Math.imul(hash ^ w.grid[i], 16777619) >>> 0;
          }
          const provinces = {}, sites = {};
          w.provs.forEach(function (pr) {
            const water = w.waterAdj[pr.id] || {};
            provinces[pr.id] = [
              pr.name,
              'area ' + pr.area,
              'c ' + pr.cx + ',' + pr.cy,
              's ' + pr.sx + ',' + pr.sy,
              pr.coastal ? 'coastal' : 'inland',
              'lm ' + pr.landmass,
              'adj ' + Object.keys(w.adj[pr.id] || {}).sort().join(' '),
              'water ' + Object.keys(water).sort().map(function (to) {
                return to + ':' + water[to];
              }).join(' ')
            ].join(' | ');
            const list = w.sitesByProv && w.sitesByProv[pr.id]
              ? w.sitesByProv[pr.id].list : [];
            if (list.length) {
              sites[pr.id] = list.map(function (site) {
                return site.site + '@' + site.x + ',' + site.y + ' ' + site.name +
                  ' ' + site.kind + (site.authored ? ' authored' : '');
              }).join('; ');
            }
          });
          resolve({ W:w.W, H:w.H, gridHash:hash, provinces:provinces, sites:sites });
        });
      });
    }, bookmark);
    await settleParityFixture(testInfo, 'raster-' + bookmark, {
      id:'raster-' + bookmark,
      kind:'raster',
      bookmark:bookmark
    }, { raster:snapshot });
  });
}
