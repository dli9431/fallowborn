'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/keys.js',
  'js/mapview.js',
  'js/world.js',
  'data/counties.js',
  'data/map_data.js',
  'js/ui_misc.js',
  'js/ui_modals.js',
  'js/ui_panels.js',
  'js/ui_topbar.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    var p = FB.state.player;
    p.panelIntrosSeen = p.panelIntrosSeen || {};
    p.panelIntrosSeen.prov = 1;
  });
});

test('map find location button exists below market lens and opens autocomplete overlay',
  async function ({ page }) {
    const findBtn = page.locator('#btn-find');
    await expect(findBtn).toBeVisible();
    await expect(findBtn).toHaveText('?');
    await expect(findBtn).toHaveAttribute('title', 'Find location (?)');
    await expect(findBtn).toHaveAttribute('aria-label', 'Find location (?)');

    const hudButtons = await page.locator('#maphud .hudbtn').evaluateAll(function (buttons) {
      return buttons.map(function (b) { return b.id; });
    });
    expect(hudButtons).toEqual([
      'btn-music',
      'btn-zoomin',
      'btn-zoomout',
      'btn-home',
      'btn-mapmode',
      'btn-marketlens',
      'btn-find'
    ]);

    const overlay = page.locator('#map-finder');
    await expect(overlay).toBeHidden();

    await findBtn.click();
    await expect(overlay).toBeVisible();
    await expect(findBtn).toHaveClass(/on/);
    await expect(findBtn).toHaveAttribute('aria-pressed', 'true');

    const input = page.locator('#map-finder-input');
    await expect(input).toBeFocused();
  });

test('find overlay searches settlements, counties, duchies, and kingdoms',
  async function ({ page }) {
    await page.locator('#btn-find').click();
    const input = page.locator('#map-finder-input');
    const results = page.locator('#map-finder-results');

    // 1. Search for a kingdom (e.g. England)
    await input.fill('England');
    await expect(results.locator('.map-finder-item')).not.toHaveCount(0);
    const kingdomItem = results.locator('.map-finder-item').first();
    await expect(kingdomItem.locator('.map-finder-name')).toContainText('England');
    await expect(kingdomItem.locator('.map-finder-type')).toHaveText('Kingdom');

    // 2. Search for a duchy (e.g. Wessex)
    await input.fill('Wessex');
    await expect(results.locator('.map-finder-item')).not.toHaveCount(0);
    const duchyItem = results.locator('.map-finder-item').first();
    await expect(duchyItem.locator('.map-finder-name')).toContainText('Wessex');
    await expect(duchyItem.locator('.map-finder-type')).toHaveText('Duchy');

    // 3. Search for a county (e.g. Winchester)
    await input.fill('Winchester');
    await expect(results.locator('.map-finder-item')).not.toHaveCount(0);
    const countyItem = results.locator('.map-finder-item').first();
    await expect(countyItem.locator('.map-finder-name')).toContainText('Winchester');
    await expect(countyItem.locator('.map-finder-type')).toHaveText('County');

    // 4. Search for a settlement (e.g. London)
    await input.fill('London');
    await expect(results.locator('.map-finder-item')).not.toHaveCount(0);
    const settlementItem = results.locator('.map-finder-item', { hasText: 'Settlement' }).first();
    await expect(settlementItem.locator('.map-finder-name')).toContainText('London');
    await expect(settlementItem.locator('.map-finder-type')).toHaveText('Settlement');
  });

test('selecting a search result centers the camera and updates province selection',
  async function ({ page }) {
    await page.locator('#btn-find').click();
    const input = page.locator('#map-finder-input');

    // Search and select London
    await input.fill('London');
    const londonOption = page.locator('.map-finder-item', { hasText: 'Settlement' }).first();
    await londonOption.click();

    // Verify overlay closed and camera moved
    await expect(page.locator('#map-finder')).toBeHidden();
    const mapState = await page.evaluate(function () {
      return {
        selected: FB.map.selected,
        zoom: FB.map.zoom,
        viewX: FB.map.viewX,
        viewY: FB.map.viewY
      };
    });

    expect(mapState.selected).toBe('london');
    expect(mapState.zoom).toBeGreaterThanOrEqual(12.0);

    const visibleSites = await page.evaluate(function () {
      return FB.map.visibleSites.map(function (s) {
        return { pid: s.pid, index: s.index };
      });
    });
    expect(visibleSites.some(function (s) { return s.pid === 'london'; })).toBe(true);
  });

test('find overlay supports keyboard navigation and Escape to close',
  async function ({ page }) {
    await page.locator('#btn-find').click();
    const input = page.locator('#map-finder-input');

    await input.fill('Paris');
    await page.keyboard.press('ArrowDown');

    const selectedItem = page.locator('.map-finder-item.selected');
    await expect(selectedItem).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(page.locator('#map-finder')).toBeHidden();

    const selectedProv = await page.evaluate(function () {
      return FB.map.selected;
    });
    expect(selectedProv).toBe('paris');

    // Test shortcut ? to toggle overlay
    await page.keyboard.press('Shift+/');
    await expect(page.locator('#map-finder')).toBeVisible();

    // Escape closes overlay
    await page.keyboard.press('Escape');
    await expect(page.locator('#map-finder')).toBeHidden();
  });

test('clear button and close button dismiss and clear search',
  async function ({ page }) {
    await page.locator('#btn-find').click();
    const input = page.locator('#map-finder-input');
    const clearBtn = page.locator('#map-finder-clear');
    const closeBtn = page.locator('#map-finder-close');

    await expect(clearBtn).toBeHidden();
    await input.fill('Rome');
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await expect(input).toHaveValue('');
    await expect(clearBtn).toBeHidden();

    await closeBtn.click();
    await expect(page.locator('#map-finder')).toBeHidden();
  });

test('all right-hand HUD buttons stay in a single column without wrapping',
  async function ({ page }) {
    const layout = await page.locator('#maphud').evaluate(function (hud) {
      const buttons = Array.from(hud.querySelectorAll('.hudbtn'));
      return {
        direction: getComputedStyle(hud).flexDirection,
        buttonCount: buttons.length,
        isSingleColumn: buttons.every(function (button, index) {
          if (!index) return true;
          const prev = buttons[index - 1].getBoundingClientRect();
          const curr = button.getBoundingClientRect();
          return prev.bottom <= curr.top + 1 && Math.abs(prev.left - curr.left) < 2;
        })
      };
    });

    expect(layout.direction).toBe('column');
    expect(layout.buttonCount).toBe(7);
    expect(layout.isSingleColumn).toBe(true);
  });

test('map HUD buttons and map overlays fit balanced portrait and shallow viewports',
  async function ({ page }) {
    const viewports = [
      { name: 'tablet-portrait', width: 768, height: 1024 },
      { name: 'tablet-portrait-short', width: 768, height: 720 },
      { name: 'tablet-landscape', width: 1024, height: 768 },
      { name: 'phone-portrait-narrow', width: 320, height: 829 },
      { name: 'phone-portrait-small', width: 360, height: 740 },
      { name: 'phone-portrait-short', width: 375, height: 667 },
      { name: 'phone-landscape', width: 844, height: 390 },
      { name: 'shallow-landscape', width: 740, height: 340 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await waitForUiRefresh(page);

      const fitsMap = await page.evaluate(function () {
        const wrap = document.getElementById('mapwrap');
        const hud = document.getElementById('maphud');
        const wrapRect = wrap.getBoundingClientRect();
        const hudRect = hud.getBoundingClientRect();
        const buttons = Array.from(hud.querySelectorAll('.hudbtn'));
        const buttonRects = buttons.map(function (button) {
          return button.getBoundingClientRect();
        });
        const allButtonsInside = buttons.every(function (b) {
          const r = b.getBoundingClientRect();
          return r.top >= wrapRect.top - 1 &&
                 r.bottom <= wrapRect.bottom + 1 &&
                 r.left >= wrapRect.left - 1 &&
                 r.right <= wrapRect.right + 1;
        });

        return {
          hudInside: hudRect.top >= wrapRect.top - 1 && hudRect.bottom <= wrapRect.bottom + 1,
          allButtonsInside: allButtonsInside,
          buttonCount: buttons.length,
          buttonColumns:new Set(buttonRects.map(function (rect) {
            return Math.round(rect.left);
          })).size,
          minimumButtonHeight:Math.min.apply(null, buttonRects.map(function (rect) {
            return rect.height;
          })),
          minimumButtonWidth:Math.min.apply(null, buttonRects.map(function (rect) {
            return rect.width;
          }))
        };
      });

      expect(fitsMap.buttonCount).toBe(7);
      expect(fitsMap.hudInside).toBe(true);
      expect(fitsMap.allButtonsInside).toBe(true);
      if (vp.width <= 820 || vp.height <= 520) {
        expect(fitsMap.minimumButtonHeight).toBeGreaterThanOrEqual(44);
        expect(fitsMap.minimumButtonWidth).toBeGreaterThanOrEqual(44);
      }
      const portraitColumns = vp.width <= 820 && vp.height > vp.width;
      const shallowLandscapeColumns = vp.height <= 480 && vp.width > vp.height;
      expect(fitsMap.buttonColumns).toBe(
        portraitColumns || shallowLandscapeColumns ? 2 : 1);

      // Open finder overlay and check it stays within mapwrap
      await page.locator('#btn-find').click();
      const finderFits = await page.evaluate(function () {
        const wrap = document.getElementById('mapwrap');
        const finder = document.getElementById('map-finder');
        const wrapRect = wrap.getBoundingClientRect();
        const finderRect = finder.getBoundingClientRect();
        return finderRect.top >= wrapRect.top - 1 &&
               finderRect.bottom <= wrapRect.bottom + 1 &&
               finderRect.left >= wrapRect.left - 1 &&
               finderRect.right <= wrapRect.right + 1;
      });
      expect(finderFits).toBe(true);

      // Close finder overlay
      await page.locator('#map-finder-close').click();

      // Open map filters and check the chooser stays within mapwrap
      await page.locator('#btn-mapmode').click();
      const filtersFit = await page.evaluate(function () {
        const wrap = document.getElementById('mapwrap');
        const filters = document.getElementById('map-filter-controls');
        const wrapRect = wrap.getBoundingClientRect();
        const filtersRect = filters.getBoundingClientRect();
        const targets = Array.from(filters.querySelectorAll('button'));
        const targetRects = targets.map(function (target) {
          return target.getBoundingClientRect();
        });
        return {
          inside:filtersRect.top >= wrapRect.top - 1 &&
            filtersRect.bottom <= wrapRect.bottom + 1 &&
            filtersRect.left >= wrapRect.left - 1 &&
            filtersRect.right <= wrapRect.right + 1,
          minimumTargetHeight:Math.min.apply(null, targetRects.map(function (rect) {
            return rect.height;
          })),
          minimumTargetWidth:Math.min.apply(null, targetRects.map(function (rect) {
            return rect.width;
          }))
        };
      });
      expect(filtersFit.inside).toBe(true);
      if (vp.width <= 820 || vp.height <= 520) {
        expect(filtersFit.minimumTargetHeight).toBeGreaterThanOrEqual(44);
        expect(filtersFit.minimumTargetWidth).toBeGreaterThanOrEqual(44);
      }
      await page.locator('#map-filter-close').click();
    }
  });

test('Map filter button opens a direct chooser with unavailable modes visible',
  async function ({ page }) {
    const mapmodeBtn = page.locator('#btn-mapmode');
    const overlay = page.locator('#map-filter-controls');
    await expect(mapmodeBtn).toBeVisible();
    await expect(mapmodeBtn).toHaveAttribute('title', 'Map filters: Realm (R)');
    await expect(mapmodeBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(overlay).toBeHidden();

    await mapmodeBtn.click();
    await expect(overlay).toBeVisible();
    await expect(mapmodeBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(overlay.locator('[data-map-mode]')).toHaveCount(6);
    await expect(overlay.locator('[data-map-mode="market"]')).toHaveCount(0);
    await expect(overlay.locator('[data-map-mode="realm"]')).toHaveAttribute('aria-pressed', 'true');

    const hasLiege = await page.evaluate(function () {
      return !!(FB.state && FB.state.player && FB.state.player.liege);
    });
    if (hasLiege) {
      await expect(overlay.locator('[data-map-mode="liege"]')).toBeEnabled();
      await expect(overlay.locator('[data-map-mode="liege"] [data-map-filter-status]'))
        .toHaveText('Liege’s realm');
    } else {
      await expect(overlay.locator('[data-map-mode="liege"]')).toBeDisabled();
      await expect(overlay.locator('[data-map-mode="liege"] [data-map-filter-status]'))
        .toHaveText('No liege');
    }
    await expect(overlay.locator('[data-map-mode="war"]')).toBeDisabled();
    await expect(overlay.locator('[data-map-mode="war"] [data-map-filter-status]'))
      .toHaveText('At peace');

    await overlay.locator('[data-map-mode="mine"]').click();
    await expect(overlay).toBeVisible();
    await expect(mapmodeBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(mapmodeBtn).toHaveAttribute('title', 'Map filters: Mine (R)');
    await expect(mapmodeBtn).toHaveClass(/on/);

    await expect(overlay).toBeVisible();
    await expect(overlay.locator('[data-map-mode="mine"]')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
    await expect(mapmodeBtn).toBeFocused();

    await page.keyboard.press('r');
    await page.locator('#btn-find').click();
    await expect(overlay).toBeHidden();
    await expect(page.locator('#map-finder')).toBeVisible();
    await page.locator('#map-finder-close').click();

    const directChoices = hasLiege ? [
      { mode:'liege', title:'Map filters: Liege (R)' },
      { mode:'duchy', title:'Map filters: De jure duchies (R)' },
      { mode:'kingdom', title:'Map filters: De jure kingdoms (R)' }
    ] : [
      { mode:'duchy', title:'Map filters: De jure duchies (R)' },
      { mode:'kingdom', title:'Map filters: De jure kingdoms (R)' }
    ];
    for (const choice of directChoices) {
      await mapmodeBtn.click();
      await overlay.locator('[data-map-mode="' + choice.mode + '"]').click();
      await expect(overlay).toBeVisible();
      await expect(mapmodeBtn).toHaveAttribute('title', choice.title);
      await page.keyboard.press('Escape');
    }

    await page.evaluate(function () {
      FB.state.player.war = {
        enemy: 'croatia',
        wins: 0,
        losses: 0,
        strength: 1.0,
        started: FB.state.turn
      };
    });

    await page.keyboard.press('r');
    await expect(overlay.locator('[data-map-mode="war"]')).toBeEnabled();
    await expect(overlay.locator('[data-map-mode="war"] [data-map-filter-status]'))
      .toHaveText('Active war');
    await page.keyboard.press('End');
    await expect(overlay.locator('[data-map-mode="war"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(overlay).toBeVisible();
    await expect(mapmodeBtn).toHaveAttribute('title', 'Map filters: War (R)');

    const warHighlight = await page.evaluate(function () {
      return {
        highlightColor: FB.map.highlightColor,
        focusColor: FB.map.focusColor(),
        focusGroupActive: FB.map.focusGroupActive
      };
    });
    expect(warHighlight.highlightColor).toBe('#c8352b');
    expect(warHighlight.focusColor).toBe('#c8352b');
    expect(warHighlight.focusGroupActive).toBe(true);

    await overlay.locator('[data-map-mode="realm"]').click();
    await expect(mapmodeBtn).toHaveAttribute('title', 'Map filters: Realm (R)');
    await page.keyboard.press('Escape');
    await expect(mapmodeBtn).not.toHaveClass(/on/);
  });

test('map panning keeps the filter chooser open and its close controls usable',
  async function ({ page }) {
    await page.evaluate(function () {
      FB.map.zoom = 4;
      FB.map.viewX = FB.world.W / 2;
      FB.map.viewY = FB.world.H / 2;
      FB.map.request();
    });
    await page.locator('#btn-mapmode').click();
    const overlay = page.locator('#map-filter-controls');
    const before = await page.evaluate(function () {
      return { x:FB.map.viewX, y:FB.map.viewY };
    });
    const box = await page.locator('#map').boundingBox();
    const x = box.x + box.width * 0.7;
    const y = box.y + box.height * 0.85;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await expect(overlay).toBeVisible();
    await page.mouse.move(x - 60, y - 30, { steps:6 });
    await page.mouse.up();
    await expect(overlay).toBeVisible();
    await expect(page.locator('#btn-mapmode')).toHaveAttribute('aria-expanded', 'true');
    const after = await page.evaluate(function () {
      return { x:FB.map.viewX, y:FB.map.viewY };
    });
    expect(after).not.toEqual(before);
    await overlay.locator('[data-map-mode="mine"]').click();
    await expect(overlay).toBeVisible();
    await page.locator('#map-filter-close').click();
    await expect(overlay).toBeHidden();
    await page.locator('#btn-mapmode').click();
    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

test('de jure filters draw all title borders and reuse geometry across selections',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var map = FB.map;
      var results = [];
      ['duchy', 'kingdom'].forEach(function (mode) {
        FB.ui.setMapMode(mode);
        var cached = map.dejureBorderCache[mode];
        var expected = FB.world.provs.filter(function (pr) {
          return !pr.wasteland && (mode === 'duchy'
            ? pr.duchy : FB.dejureOf(pr.id).kingdom);
        });
        var allMatch = expected.every(function (pr) {
          return cached.keys[pr.idx + 1] === (mode === 'duchy'
            ? pr.duchy : FB.dejureOf(pr.id).kingdom);
        });
        var probe = document.createElement('canvas').getContext('2d');
        probe.lineWidth = 0.1;
        var boundary = null, internal = null, w = FB.world;
        for (var y = 1; y < w.H && (!boundary || !internal); y++) {
          for (var x = 1; x < w.W && (!boundary || !internal); x++) {
            var a = w.grid[(y - 1) * w.W + x - 1];
            var b = w.grid[(y - 1) * w.W + x];
            if (!a || !b || a === b) continue;
            var ka = cached.keys[a], kb = cached.keys[b];
            if (!ka || !kb) continue;
            if (ka !== kb && !boundary) {
              boundary = { x:x, y:y };
            } else if (ka === kb && !internal &&
                cached.keys[w.grid[y * w.W + x - 1]] === ka &&
                cached.keys[w.grid[y * w.W + x]] === ka) {
              internal = { x:x, y:y };
            }
          }
        }
        function hits(sample) {
          if (!sample) throw new Error('Expected title boundary samples');
          map.zoom = 10;
          map.viewX = sample.x - 5;
          map.viewY = sample.y - 5;
          map.render();
          var path = cached.tiles[Math.floor(sample.x / 64) + ':' + Math.floor(sample.y / 64)];
          return probe.isPointInStroke(path, sample.x, sample.y - 0.5);
        }
        var boundaryHit = hits(boundary), internalOmitted = !hits(internal);
        var strokes = [], originalStroke = cached.ctx.stroke;
        cached.ctx.stroke = function (path) {
          strokes.push(this.strokeStyle);
          return originalStroke.apply(this, arguments);
        };
        try {
          map.render();
          map.selectProvince(expected[expected.length - 1].id);
          map.setDejureBorders(mode);
          map.render();
        } finally { cached.ctx.stroke = originalStroke; }
        results.push({ allMatch:allMatch, count:expected.length,
          reused:map.dejureBorderCache[mode] === cached, strokes:strokes,
          boundaryHit:boundaryHit, internalOmitted:internalOmitted });
      });
      FB.ui.setMapMode('realm');
      var cleared = map.dejureBorderMode === null;
      FB.ui.setMapMode('duchy');
      FB.ui.setMarketLens(true);
      var marketCleared = map.dejureBorderMode === null;
      map.useWorld();
      return { modes:results, cleared:cleared,
        marketCleared:marketCleared,
        worldCleared:Object.keys(map.dejureBorderCache).length === 0 };
    });
    for (const mode of result.modes) {
      expect(mode.count).toBeGreaterThan(100);
      expect(mode.allMatch).toBe(true);
      expect(mode.reused).toBe(true);
      expect(mode.boundaryHit).toBe(true);
      expect(mode.internalOmitted).toBe(true);
      expect(mode.strokes).toHaveLength(0);
    }
    expect(result.cleared).toBe(true);
    expect(result.marketCleared).toBe(true);
    expect(result.worldCleared).toBe(true);
  });

test('de jure filters replace county labels with title names until close zoom',
  async function ({ page }) {
    const results = await page.evaluate(function () {
      var map = FB.map, out = [];
      // Isolate the county/title switch from settlement-label collision rules.
      var sites = FB.world.sitesRender;
      FB.world.sitesRender = [];
      map.canvas.width = 640;
      map.canvas.height = 480;
      ['duchy', 'kingdom'].forEach(function (mode) {
        map.setDejureBorders(mode);
        var cache = map.dejureBorderCache[mode];
        var group = cache.labels[0];
        var pr = FB.world.provs.filter(function (candidate) {
          return candidate.cx === group.cx && candidate.cy === group.cy;
        })[0];
        var table = mode === 'duchy' ? FBDATA.duchies : FBDATA.kingdoms;
        var drawn = [], original = map.ctx.fillText;
        map.ctx.fillText = function (text) {
          drawn.push(text);
          return original.apply(this, arguments);
        };
        try {
          map.zoom = 1;
          map.viewX = group.cx - 320;
          map.viewY = group.cy - 240;
          map.render();
          var wide = cache.labelLayout;
          var titleDrawn = drawn.indexOf(FB.L(table[group.id].name)) >= 0;
          map.render();
          var reused = cache.labelLayout === wide;
          drawn = [];
          map.zoom = 80;
          map.viewX = pr.cx - 320 / map.zoom;
          map.viewY = pr.cy - 240 / map.zoom;
          map.render();
          var closeCounties = cache.labelLayout.counties;
          var countyDrawn = drawn.indexOf(FB.L(pr.name)) >= 0;
          map.setDejureBorders(null);
          map.zoom = 4;
          map.viewX = pr.cx - 320 / map.zoom;
          map.viewY = pr.cy - 240 / map.zoom;
          drawn = [];
          map.render();
          out.push({ wideCounties:wide.counties, titleDrawn:titleDrawn,
            reused:reused, closeCounties:closeCounties, countyDrawn:countyDrawn,
            ordinaryCounty:drawn.indexOf(FB.L(pr.name)) >= 0 });
        } finally { map.ctx.fillText = original; }
      });
      FB.world.sitesRender = sites;
      return out;
    });
    for (const result of results) {
      expect(result.wideCounties).toBe(false);
      expect(result.titleDrawn).toBe(true);
      expect(result.reused).toBe(true);
      expect(result.closeCounties).toBe(true);
      expect(result.countyDrawn).toBe(true);
      expect(result.ordinaryCounty).toBe(true);
    }
  });

test('de jure border work is limited to visible tiles and stationary frames reuse pixels',
  async function ({ page }) {
    const result = await page.evaluate(function () {
      var map = FB.map, results = [];
      map.canvas.width = 320;
      map.canvas.height = 240;
      map.zoom = 80;
      ['duchy', 'kingdom'].forEach(function (mode) {
        map.setDejureBorders(mode);
        var cache = map.dejureBorderCache[mode];
        var before = Object.keys(cache.tiles).length;
        var original = cache.ctx.stroke, strokes = 0;
        cache.ctx.stroke = function () {
          strokes++;
          return original.apply(this, arguments);
        };
        try {
          map.viewX = 128;
          map.viewY = 128;
          map.render();
          var initialStrokes = strokes;
          var initialTiles = Object.keys(cache.tiles).length;
          var tileIds = Object.keys(cache.tiles);
          var paths = tileIds.map(function (id) { return cache.tiles[id]; });
          map.render();
          map.render();
          var stationaryStrokes = strokes;
          map.viewX = FB.world.W - 128;
          map.viewY = FB.world.H - 128;
          map.render();
          var panStrokes = strokes - stationaryStrokes;
          var afterPan = Object.keys(cache.tiles).length;
          var reused = tileIds.every(function (id, i) { return cache.tiles[id] === paths[i]; });
          map.zoom = 40;
          map.render();
          var zoomRepainted = strokes > stationaryStrokes + panStrokes;
          var afterZoom = strokes;
          map.canvas.width++;
          map.render();
          var resized = strokes > afterZoom && cache.canvas.width === map.canvas.width;
          var afterResize = strokes;
          map.dpr *= 2;
          map.render();
          var dprRepainted = strokes > afterResize;
          map.dpr /= 2;
          map.zoom = 80;
          results.push({ before:before, initialTiles:initialTiles,
            initialStrokes:initialStrokes, stationaryStrokes:stationaryStrokes,
            panStrokes:panStrokes, afterPan:afterPan, reused:reused,
            zoomRepainted:zoomRepainted, resized:resized, dprRepainted:dprRepainted });
        } finally { cache.ctx.stroke = original; }
      });
      return results;
    });
    for (const mode of result) {
      expect(mode.before).toBe(0);
      expect(mode.initialTiles).toBeGreaterThan(0);
      expect(mode.initialTiles).toBeLessThanOrEqual(4);
      expect(mode.initialStrokes).toBeLessThanOrEqual(8);
      expect(mode.stationaryStrokes).toBe(mode.initialStrokes);
      expect(mode.panStrokes).toBeGreaterThan(0);
      expect(mode.panStrokes).toBeLessThanOrEqual(8);
      expect(mode.afterPan).toBeLessThanOrEqual(8);
      expect(mode.reused).toBe(true);
      expect(mode.zoomRepainted).toBe(true);
      expect(mode.resized).toBe(true);
      expect(mode.dprRepainted).toBe(true);
    }
  });
