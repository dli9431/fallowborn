'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/world.js',
  'data/map_data.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

/* The shore rule: nearest-seed assignment on the single Afro-Eurasian land
   polygon used to let a county win land across a carved sea wherever the far
   shore had no closer seed (Tangier held the Gibraltar shore, Mecca the
   Nubian coast, Norrland the Finnish coast). No 867 county spanned such
   waters, so js/world.js hands every same-landmass fragment disconnected
   from its seed to the neighboring county it actually borders. Fragments on
   another authored land polygon (island gains through the unseeded-polygon
   fallback, e.g. Venice's lagoon) must stay. */
test('counties do not span carved seas; cross-polygon island gains stay',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      return new Promise(function (resolve, reject) {
        FB.activateBookmark('867', function () {}, function (error) {
          if (error) { reject(error); return; }
          resolve();
        });
      });
    });

    const report = await page.evaluate(function () {
      const world = FB.world;
      const W = world.W, H = world.H, grid = world.grid, landmass = world.landmass;
      const seen = new Uint8Array(W * H);
      const offenders = [];
      for (let i = 0; i < W * H; i++) {
        const v = grid[i];
        if (!v || seen[i]) continue;
        const pr = world.provs[v - 1];
        const stack = [i];
        seen[i] = 1;
        let hasSeed = false, sameLandmass = false, bordersOther = false;
        while (stack.length) {
          const c = stack.pop();
          if (c === pr.sy * W + pr.sx) hasSeed = true;
          if (landmass[c] === pr.landmass) sameLandmass = true;
          const cx = c % W, cy = (c / W) | 0;
          const nb = [];
          if (cx > 0) nb.push(c - 1);
          if (cx < W - 1) nb.push(c + 1);
          if (cy > 0) nb.push(c - W);
          if (cy < H - 1) nb.push(c + W);
          for (const q of nb) {
            if (grid[q] && grid[q] !== v) bordersOther = true;
            if (grid[q] === v && !seen[q]) { seen[q] = 1; stack.push(q); }
          }
        }
        /* a non-seed component on the seed's own landmass that borders
           another county is the pre-fix cross-sea exclave shape */
        if (!hasSeed && sameLandmass && bordersOther) offenders.push(pr.id);
      }

      function ownerAt(lon, lat) {
        const x = Math.round(FB.lonToX(lon)), y = Math.round(FB.latToY(lat));
        const c = grid[y * W + x];
        return c ? world.provs[c - 1].id : null;
      }

      /* Venice's lagoon barrier islands are a separate authored land polygon
         whose pixels the unseeded-polygon fallback gives to Venezia; the
         shore rule must not take them back. */
      const venezia = world.byId.venezia;
      let veneziaComponents = 0;
      for (let i = 0; i < W * H; i++) seen[i] = 0;
      for (let i = 0; i < W * H; i++) {
        if (grid[i] !== venezia.idx + 1 || seen[i]) continue;
        veneziaComponents++;
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const c = stack.pop();
          const cx = c % W, cy = (c / W) | 0;
          const nb = [];
          if (cx > 0) nb.push(c - 1);
          if (cx < W - 1) nb.push(c + 1);
          if (cy > 0) nb.push(c - W);
          if (cy < H - 1) nb.push(c + W);
          for (const q of nb) {
            if (grid[q] === venezia.idx + 1 && !seen[q]) { seen[q] = 1; stack.push(q); }
          }
        }
      }

      return {
        offenders: offenders,
        gibraltarShore: ownerAt(-5.6, 36.3),    // Spanish side of the strait
        alHoceimaShore: ownerAt(-3.88, 35.41),  // Moroccan coast near Ceuta
        arabianGulfCoast: ownerAt(54.26, 25.72), // UAE coast across from Hormuz
        nubianCoast: ownerAt(37.2, 19.62),      // Red Sea coast at Port Sudan
        finnishCoast: ownerAt(21.62, 63.1),     // Vaasa across the Bothnian Gulf
        donetsBasin: ownerAt(37.8, 48.0),       // across the Sea of Azov
        veneziaComponents: veneziaComponents
      };
    });

    expect(report.offenders).toEqual([]);
    expect(report.gibraltarShore).not.toBe('tangier');
    expect(report.alHoceimaShore).not.toBe('malaga');
    expect(report.arabianGulfCoast).not.toBe('hormuz');
    expect(report.nubianCoast).not.toBe('mecca');
    expect(report.finnishCoast).not.toBe('norrland');
    expect(report.donetsBasin).not.toBe('tmutarakan');
    /* mainland strip plus the lagoon island: the island must survive */
    expect(report.veneziaComponents).toBeGreaterThan(1);
  });
