'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/mapview.js',
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

test('map HUD buttons and find overlay fit within mapwrap on tablet and shallow viewports',
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
      expect(fitsMap.buttonColumns).toBe(
        vp.height <= 480 && vp.width > vp.height ? 2 : 1);

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
    }
  });
