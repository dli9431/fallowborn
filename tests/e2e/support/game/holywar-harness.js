'use strict';

const path = require('path');
const { expect } = require('../fixture');

const holyWarHarnessPath = path.join(__dirname, '..', 'holywar-harness.js');

async function injectHolyWarHarness(page) {
  await page.addScriptTag({ path:holyWarHarnessPath });
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FBTEST && FBTEST.makeGreatHolyWar &&
        FBTEST.resolveGreatHolyWar);
    });
  }).toBe(true);
}

module.exports = {
  injectHolyWarHarness:injectHolyWarHarness
};
