'use strict';

const { test, expect } = require('../support/fixture');
const {
  openGame,
  startDeterministicGame,
  waitForUiRefresh
} = require('../support/game');

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
    await expect(panel.locator('.land-section')).toHaveCount(3);
    await expect(panel.getByRole('heading', { name:'Realm', exact:true }))
      .toBeVisible();
    await expect(panel.getByRole('heading', { name:'County', exact:true }))
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

test('desktop sidebars scale evenly while preserving the center map',
  async function ({ page }) {
    async function measure(width) {
      await page.setViewportSize({ width:width, height:935 });
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
    // The player's starting demesne in London (Essex / England / Britannia)
    await page.evaluate(function () {
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

