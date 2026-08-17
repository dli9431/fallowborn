'use strict';

const path = require('path');
const { expect } = require('../fixture');

const browserHarnessPath = path.join(__dirname, '..', 'browser-harness.js');

async function injectBrowserHarness(page) {
  await page.addScriptTag({ path:browserHarnessPath });
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FBTEST && FBTEST.checkInvariants && FBTEST.advanceDays);
    });
  }).toBe(true);
}

module.exports = {
  injectBrowserHarness:injectBrowserHarness
};
