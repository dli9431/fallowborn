'use strict';

const { test: base, expect } = require('@playwright/test');
const { installPageGuards } = require('./page-contract');

const test = base.extend({
  page: async function ({ page }, use, testInfo) {
    const guard = installPageGuards(page);
    await use(page);
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed || guard.faults.length) {
      const { attachPageDiagnostic } = require('./game-diagnostic');
      await attachPageDiagnostic(page, testInfo, 'game-state');
    }
    expect(guard.faults, 'browser contract faults').toEqual([]);
  }
});

module.exports = {
  test,
  expect
};
