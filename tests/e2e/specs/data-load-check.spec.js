'use strict';
const path = require('path');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'js/data_check.js',
  'js/world.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');

const checkScript = path.resolve(__dirname, '..', '..', '..', 'js', 'data_check.js');
const TABLES = {
  'data/map_data.js':'land', 'data/counties.js':'provinces',
  'data/cultures.js':'cultures', 'data/technology.js':'tech',
  'data/actions.js':'focuses', 'data/units.js':'unitClasses',
  'data/bookmarks.js':'bookmarks', 'data/starts.js':'startScenarios',
  'data/traits.js':'traits', 'data/economy.js':'abbeys',
  'data/markets.js':'marketGoods', 'data/modifiers.js':'modifiers',
  'data/intrigue.js':'intrigue', 'data/travel.js':'travelSites',
  'data/policies.js':'policies'
};

async function runCheck(page, omitted) {
  await page.goto('about:blank');
  await page.evaluate(function (input) {
    window.FBDATA = {};
    Object.keys(input.tables).forEach(function (file) {
      if (file !== input.omitted) window.FBDATA[input.tables[file]] = {};
    });
  }, { tables:TABLES, omitted:omitted || null });
  await page.addScriptTag({ path:checkScript });
  return page.evaluate(function () {
    const banner = document.getElementById('fb-data-fault');
    return {
      faults:window.FB_DATA_FAULTS,
      banner:banner ? banner.textContent : null
    };
  });
}

test('a complete data set raises no fault and shows no notice', async function ({ page }) {
  const result = await runCheck(page, null);
  expect(result.faults).toEqual([]);
  expect(result.banner).toBeNull();
});

test('a data file that never ran is named in a visible notice', async function ({ page }) {
  const result = await runCheck(page, 'data/units.js');
  expect(result.faults).toEqual(['data/units.js']);
  expect(result.banner).toContain('data/units.js');
  expect(result.banner).toContain('Reload');
  await expect(page.locator('#fb-data-fault')).toBeVisible();
});

test('the shipped data files satisfy the check on a normal boot',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const state = await page.evaluate(function () {
      return {
        faults:window.FB_DATA_FAULTS,
        banner:!!document.getElementById('fb-data-fault'),
        ordered:Array.from(document.scripts).map(function (script) {
          return script.getAttribute('src') || '';
        })
      };
    });
    expect(state.faults).toEqual([]);
    expect(state.banner).toBe(false);
    const scripts = state.ordered;
    expect(scripts.indexOf('js/data_check.js')).toBeGreaterThan(
      scripts.indexOf('data/events_tutorial.js'));
    expect(scripts.indexOf('js/data_check.js')).toBeLessThan(scripts.indexOf('js/util.js'));
  });
