'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/main.js',
  'js/model.js',
  'js/world.js',
  'js/ui_misc.js',
  'js/ui_panels.js',
  'css/style.css'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { waitForUiRefresh } = require('../support/game/ui');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
});

test('Self tab titles section renders high dignities and multi-county rosters without squishing',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      const me = s.chars[s.player.charId];
      s.player.tier = 7;
      s.player.realm = 'player';
      if (!s.realms.player) {
        s.realms.player = {
          id: 'player',
          name: 'Grand Empire',
          ruler: me.id,
          tier: 7,
          alive: true,
          vassals: []
        };
      }
      // Assign multiple counties (15 counties) to demesne
      const allPids = Object.keys(FB.world.byId);
      s.player.provs = allPids.slice(0, 15);
      for (const pid of s.player.provs) {
        s.owner[pid] = 'player';
        s.holder[pid] = 'player';
      }
      FB.ui.showTab('char');
    });
    await waitForUiRefresh(page);

    const toggle = page.locator('#tab-char [data-self-section="titles"]');
    await expect(toggle).toBeVisible();

    const titlesData = await page.evaluate(function () {
      const titles = FB.playerTitles(FB.state);
      return {
        highCount: titles.high.length,
        countyCount: titles.counties.length,
        total: titles.high.length + titles.counties.length
      };
    });
    expect(titlesData.total).toBeGreaterThan(15);
    await expect(toggle).toContainText(String(titlesData.total));

    // Expand the titles section
    await toggle.click();
    const sectionBody = page.locator('#self-section-titles');
    await expect(sectionBody).toBeVisible();
    await expect(sectionBody).not.toHaveClass(/hidden/);

    const layout = await page.evaluate(function () {
      const body = document.getElementById('self-section-titles');
      const dignityRows = body.querySelectorAll('.self-title-row');
      const countiesBlock = body.querySelector('.self-titles-counties');
      const countiesLabel = countiesBlock ? countiesBlock.querySelector('.self-titles-counties-label') : null;
      const countiesList = countiesBlock ? countiesBlock.querySelector('.self-titles-counties-list') : null;

      const firstDignitySpan = dignityRows.length ? dignityRows[0].querySelector('span') : null;
      const firstDignityB = dignityRows.length ? dignityRows[0].querySelector('b') : null;

      const panel = document.getElementById('tab-char');
      return {
        dignityRowCount: dignityRows.length,
        firstDignitySpanFlexShrink: firstDignitySpan ? getComputedStyle(firstDignitySpan).flexShrink : null,
        firstDignityBTextAlign: firstDignityB ? getComputedStyle(firstDignityB).textAlign : null,
        countiesBlockPresent: !!countiesBlock,
        countiesLabelText: countiesLabel ? countiesLabel.textContent.trim() : null,
        countiesLabelWidth: countiesLabel ? countiesLabel.getBoundingClientRect().width : 0,
        countiesLabelHeight: countiesLabel ? countiesLabel.getBoundingClientRect().height : 0,
        countiesListText: countiesList ? countiesList.textContent.trim() : null,
        panelOverflow: panel ? panel.scrollWidth - panel.clientWidth : 0
      };
    });

    expect(layout.dignityRowCount).toBe(titlesData.highCount);
    if (layout.dignityRowCount > 0) {
      expect(layout.firstDignitySpanFlexShrink).toBe('0');
      expect(layout.firstDignityBTextAlign).toBe('right');
    }
    expect(layout.countiesBlockPresent).toBe(true);
    expect(layout.countiesLabelText).toContain('Counties (15)');
    expect(layout.countiesLabelWidth).toBeGreaterThan(60);
    // Ensure the label is not squished into a tall vertical column
    expect(layout.countiesLabelHeight).toBeLessThan(30);
    expect(layout.countiesListText).toContain('·');
    expect(layout.panelOverflow).toBeLessThanOrEqual(1);
  });

test('Self tab titles section renders clean counties list for a Count with no high dignities',
  async function ({ page }) {
    await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 4;
      s.player.provs = Object.keys(FB.world.byId).slice(0, 3);
      for (const pid of s.player.provs) {
        s.owner[pid] = 'player';
        s.holder[pid] = 'player';
      }
      FB.ui.showTab('char');
    });
    await waitForUiRefresh(page);

    const toggle = page.locator('#tab-char [data-self-section="titles"]');
    await expect(toggle).toBeVisible();
    await toggle.click();

    const sectionBody = page.locator('#self-section-titles');
    await expect(sectionBody).toBeVisible();

    const data = await page.evaluate(function () {
      const body = document.getElementById('self-section-titles');
      const dignities = body.querySelectorAll('.self-title-row');
      const countiesBlock = body.querySelector('.self-titles-counties');
      return {
        dignityCount: dignities.length,
        countiesBlockPresent: !!countiesBlock,
        label: countiesBlock ? countiesBlock.querySelector('.self-titles-counties-label').textContent.trim() : ''
      };
    });

    expect(data.dignityCount).toBe(0);
    expect(data.countiesBlockPresent).toBe(true);
    expect(data.label).toBe('Counties (3)');
  });

test('Self tab titles link directly to counties and duchy capital counties',
  async function ({ page }) {
    const setup = await page.evaluate(function () {
      const s = FB.state;
      s.player.tier = 5; // Duke
      s.player.realm = 'player';
      if (!s.realms.player) {
        s.realms.player = {
          id: 'player',
          name: 'Duchy of Franconia',
          ruler: s.player.charId,
          tier: 5,
          alive: true,
          vassals: []
        };
      }
      // Franconia duchy counties: frankfurt (capital), mainz, wurzburg...
      const dcs = FB.duchyCounties('d_franconia');
      s.player.provs = [dcs[0], dcs[1]];
      for (const pid of s.player.provs) {
        s.owner[pid] = 'player';
        s.holder[pid] = 'player';
      }
      FB.ui.showTab('char');
      return {
        duchyCapital: dcs[0],
        secondCounty: dcs[1]
      };
    });
    await waitForUiRefresh(page);

    const toggle = page.locator('#tab-char [data-self-section="titles"]');
    await expect(toggle).toBeVisible();
    await toggle.click();

    // High dignity link for Duchy
    const duchyLink = page.locator('#self-section-titles .self-title-row button[data-title-pid]');
    await expect(duchyLink).toBeVisible();
    const duchyTargetPid = await duchyLink.getAttribute('data-title-pid');
    expect(duchyTargetPid).toBe(setup.duchyCapital);

    // Clicking the duchy title link navigates to the duchy capital county
    await duchyLink.click();
    await waitForUiRefresh(page);

    const selectedAfterDuchy = await page.evaluate(function () {
      const pr = FB.world.byId[FB.map.selected];
      const centerX = FB.map.viewX + (FB.map.canvas ? FB.map.canvas.width / FB.map.zoom / 2 : 0);
      const centerY = FB.map.viewY + (FB.map.canvas ? FB.map.canvas.height / FB.map.zoom / 2 : 0);
      return {
        selected: FB.map ? FB.map.selected : null,
        distToCenter: pr ? Math.hypot(centerX - pr.cx, centerY - pr.cy) : 999
      };
    });
    expect(selectedAfterDuchy.selected).toBe(setup.duchyCapital);
    expect(selectedAfterDuchy.distToCenter).toBeLessThan(100);
    await expect(page.locator('#tab-prov')).toHaveClass(/active/);

    // Switch back to Self tab and test clicking a specific county link
    await page.evaluate(function () { FB.ui.showTab('char'); });
    await waitForUiRefresh(page);

    const secondCountyLink = page.locator(
      '#self-section-titles .self-titles-counties-list button[data-title-pid="' + setup.secondCounty + '"]');
    await expect(secondCountyLink).toBeVisible();
    await secondCountyLink.click();
    await waitForUiRefresh(page);

    const selectedAfterCounty = await page.evaluate(function () {
      const pr = FB.world.byId[FB.map.selected];
      const centerX = FB.map.viewX + (FB.map.canvas ? FB.map.canvas.width / FB.map.zoom / 2 : 0);
      const centerY = FB.map.viewY + (FB.map.canvas ? FB.map.canvas.height / FB.map.zoom / 2 : 0);
      return {
        selected: FB.map ? FB.map.selected : null,
        distToCenter: pr ? Math.hypot(centerX - pr.cx, centerY - pr.cy) : 999
      };
    });
    expect(selectedAfterCounty.selected).toBe(setup.secondCounty);
    expect(selectedAfterCounty.distToCenter).toBeLessThan(100);
    await expect(page.locator('#tab-prov')).toHaveClass(/active/);
  });
