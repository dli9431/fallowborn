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
