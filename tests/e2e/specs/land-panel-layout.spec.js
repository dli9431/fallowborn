'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/economy.js',
  'js/population.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'js/world.js',
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
    FB.state.player.panelIntrosSeen = FB.state.player.panelIntrosSeen || {};
    FB.state.player.panelIntrosSeen.prov = 1;
    FB.ui.selectProvince(FB.state.player.provinceId);
  });
  await waitForUiRefresh(page);
});

test('Land facts use readable desktop columns and stack on compact layouts',
  async function ({ page }) {
    const panel = page.locator('#tab-prov');
    await expect(panel.locator('.land-section')).toHaveCount(4);
    await expect(panel.getByRole('heading', { name:'Realm', exact:true }))
      .toBeVisible();
    await expect(panel.getByRole('heading', { name:'County', exact:true }))
      .toBeVisible();
    await expect(panel.getByRole('heading', { name:'Population', exact:true }))
      .toBeVisible();
    await expect(panel.getByRole('heading', { name:'Development', exact:true }))
      .toBeVisible();

    const shortFact = panel.locator('.land-kv').filter({
      has:page.locator('span', { hasText:'Realm size' })
    });
    const detailFact = panel.locator('.land-kv-detail').filter({
      has:page.locator('span', { hasText:'Settlement growth' })
    });
    await expect(shortFact).toBeVisible();
    await expect(detailFact).toBeVisible();

    const desktop = await panel.evaluate(function (root) {
      const shortRow = Array.prototype.find.call(
        root.querySelectorAll('.land-kv'), function (row) {
          return row.querySelector('span').textContent.trim() === 'Realm size';
        });
      const detailRow = Array.prototype.find.call(
        root.querySelectorAll('.land-kv-detail'), function (row) {
          return row.querySelector('span').textContent.trim() ===
            'Settlement growth';
        });
      return {
        shortColumns:getComputedStyle(shortRow).gridTemplateColumns,
        shortAlignment:getComputedStyle(shortRow.querySelector('b')).textAlign,
        detailColumns:getComputedStyle(detailRow).gridTemplateColumns,
        detailAlignment:getComputedStyle(detailRow.querySelector('b')).textAlign,
        overflow:root.scrollWidth - root.clientWidth
      };
    });
    expect(desktop.shortColumns.trim().split(/\s+/)).toHaveLength(2);
    expect(desktop.shortAlignment).toBe('right');
    expect(desktop.detailColumns.trim().split(/\s+/)).toHaveLength(1);
    expect(desktop.detailAlignment).toBe('left');
    expect(desktop.overflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width:390, height:740 });
    await waitForUiRefresh(page);
    const compact = await panel.evaluate(function (root) {
      const row = Array.prototype.find.call(
        root.querySelectorAll('.land-kv'), function (candidate) {
          return candidate.querySelector('span').textContent.trim() ===
            'Realm size';
        });
      return {
        columns:getComputedStyle(row).gridTemplateColumns,
        alignment:getComputedStyle(row.querySelector('b')).textAlign,
        overflow:root.scrollWidth - root.clientWidth
      };
    });
    expect(compact.columns.trim().split(/\s+/)).toHaveLength(1);
    expect(compact.alignment).toBe('left');
    expect(compact.overflow).toBeLessThanOrEqual(1);
  });

test('portrait phones give the panel a balanced majority of usable height',
  async function ({ page }) {
    const viewports = [
      { width:390, height:844 },
      { width:375, height:667 }
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await waitForUiRefresh(page);
      const layout = await page.locator('#main').evaluate(function (main) {
        const mainRect = main.getBoundingClientRect();
        const mapRect = document.getElementById('mapwrap').getBoundingClientRect();
        const panelsRect = document.getElementById('panels').getBoundingClientRect();
        const sideBodyRect = document.getElementById('sidebody').getBoundingClientRect();
        const timeRect = document.getElementById('timebtns').getBoundingClientRect();
        return {
          mapHeight:mapRect.height,
          mapShare:mapRect.height / mainRect.height,
          panelShare:panelsRect.height / mainRect.height,
          visiblePanelBody:timeRect.top - sideBodyRect.top,
          fillsMain:Math.abs(mapRect.height + panelsRect.height - mainRect.height) <= 1
        };
      });
      expect(layout.mapHeight).toBeGreaterThanOrEqual(189);
      expect(layout.mapHeight).toBeLessThanOrEqual(261);
      expect(layout.mapShare).toBeLessThanOrEqual(0.38);
      expect(layout.panelShare).toBeGreaterThanOrEqual(0.62);
      expect(layout.visiblePanelBody).toBeGreaterThanOrEqual(190);
      expect(layout.fillsMain).toBe(true);
    }
  });

test('portrait pane divider drags, snaps, cycles, and supports keyboard resizing',
  async function ({ page }) {
    await page.setViewportSize({ width:390, height:844 });
    await waitForUiRefresh(page);
    const divider = page.locator('#mobile-pane-resizer');
    const map = page.locator('#mapwrap');
    const hud = page.locator('#maphud');
    await expect(divider).toBeVisible();
    await expect(divider).toHaveAttribute('aria-valuetext', 'Balanced');
    const balancedHeight = await map.evaluate(function (node) {
      return node.getBoundingClientRect().height;
    });
    expect(await hud.locator('.hudbtn').evaluateAll(function (buttons) {
      return new Set(buttons.map(function (button) {
        return Math.round(button.getBoundingClientRect().left);
      })).size;
    })).toBe(2);

    await divider.focus();
    await page.keyboard.press('ArrowUp');
    await expect(divider).toHaveAttribute('aria-valuetext', 'Panel-first');
    await expect(hud).toBeHidden();
    const panelFirstHeight = await map.evaluate(function (node) {
      return node.getBoundingClientRect().height;
    });
    expect(panelFirstHeight).toBeLessThan(balancedHeight - 50);

    await page.keyboard.press('ArrowDown');
    await expect(divider).toHaveAttribute('aria-valuetext', 'Balanced');
    await expect(hud).toBeVisible();
    const box = await divider.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 180,
      { steps:5 });
    await page.mouse.up();
    await expect(divider).toHaveAttribute('aria-valuetext', 'Map-first');
    const mapFirstHeight = await map.evaluate(function (node) {
      return node.getBoundingClientRect().height;
    });
    expect(mapFirstHeight).toBeGreaterThan(balancedHeight + 100);
    expect(await hud.locator('.hudbtn').evaluateAll(function (buttons) {
      return new Set(buttons.map(function (button) {
        return Math.round(button.getBoundingClientRect().left);
      })).size;
    })).toBe(1);

    await divider.click();
    await expect(divider).toHaveAttribute('aria-valuetext', 'Panel-first');
    await expect(hud).toBeHidden();
  });

test('desktop sidebars scale evenly while preserving the center map',
  async function ({ page }) {
    async function measure(width) {
      await page.setViewportSize({ width:width, height:935 });
      await waitForUiRefresh(page);
      return page.locator('#main').evaluate(function (main) {
        const left = document.getElementById('left').getBoundingClientRect();
        const map = document.getElementById('mapwrap').getBoundingClientRect();
        const side = document.getElementById('side').getBoundingClientRect();
        const mainBox = main.getBoundingClientRect();
        const leftBody = document.getElementById('leftbody');
        const sideBody = document.getElementById('sidebody');
        return {
          left:left.width,
          map:map.width,
          side:side.width,
          fillsMain:Math.abs(left.width + map.width + side.width - mainBox.width) <= 1,
          leftOverflow:leftBody.scrollWidth - leftBody.clientWidth,
          sideOverflow:sideBody.scrollWidth - sideBody.clientWidth
        };
      });
    }

    const smallest = await measure(821);
    const laptop = await measure(1024);
    const full = await measure(1440);

    expect(smallest.left).toBeCloseTo(232, 0);
    expect(smallest.side).toBeCloseTo(272, 0);
    expect(full.left).toBeCloseTo(290, 0);
    expect(full.side).toBeCloseTo(340, 0);
    expect(smallest.left / full.left).toBeCloseTo(
      smallest.side / full.side, 2);
    expect(laptop.left / full.left).toBeCloseTo(
      laptop.side / full.side, 2);
    expect(smallest.map).toBeGreaterThan(smallest.side);
    expect(laptop.map).toBeGreaterThan(smallest.map);
    for (const layout of [smallest, laptop, full]) {
      expect(layout.fillsMain).toBe(true);
      expect(layout.leftOverflow).toBeLessThanOrEqual(1);
      expect(layout.sideOverflow).toBeLessThanOrEqual(1);
    }
  });

test('De jure title promotion progress notes only appear for titles where the player holds a stake',
  async function ({ page }) {
    const panel = page.locator('#tab-prov');
    // Grant player a county holding in London (Essex / England / Britannia)
    await page.evaluate(function () {
      FB.state.player.tier = 4;
      FB.state.player.provs = ['london'];
      FB.state.holder.london = 'player';
      FB.ui.selectProvince('london');
    });
    await waitForUiRefresh(page);
    await expect(panel).toContainText('De jure (rightful liege)');
    await expect(panel).toContainText('Essex');
    await expect(panel).toContainText('England');
    // Should show Essex and England progress since player holds London (have > 0)
    await expect(panel).toContainText('make the duke');
    await expect(panel).toContainText('make the king');

    // Select a distant foreign county in France (Limoges in Poitou / Aquitaine / Francia)
    await page.evaluate(function () {
      FB.ui.selectProvince('limoges');
    });
    await waitForUiRefresh(page);
    await expect(panel).toContainText('De jure (rightful liege)');
    await expect(panel).toContainText('Poitou');
    await expect(panel).toContainText('Aquitaine');
    await expect(panel).toContainText('Francia');
    // Progress notes must NOT appear when player holds 0 counties in that title
    await expect(panel).not.toContainText('make the duke');
    await expect(panel).not.toContainText('make the king');
    await expect(panel).not.toContainText('make the emperor');
  });

test('Development card folds starting development into settlement growth and population card omits factor and percent',
  async function ({ page }) {
    const panel = page.locator('#tab-prov');
    await page.evaluate(function () {
      FB.ui.selectProvince('dorset');
    });
    await waitForUiRefresh(page);

    // Development section
    await expect(panel).not.toContainText('Chronicle growth');
    const settGrowth = panel.locator('.land-kv-detail').filter({
      has:page.locator('span', { hasText:'Settlement growth' })
    });
    await expect(settGrowth).toBeVisible();
    await expect(settGrowth.locator('b')).toContainText('Started at development');

    // Population section
    const popRow = panel.locator('.land-kv').filter({
      has:page.locator('span', { hasText:'County population' })
    });
    const capRow = panel.locator('.land-kv').filter({
      has:page.locator('span', { hasText:'Carrying capacity' })
    });
    await expect(popRow).toBeVisible();
    await expect(capRow).toBeVisible();

    const popText = await popRow.locator('b').textContent();
    const capText = await capRow.locator('b').textContent();

    expect(popText).not.toContain('Factor');
    expect(popText).not.toContain('%');
    expect(capText).not.toContain('%');
  });
