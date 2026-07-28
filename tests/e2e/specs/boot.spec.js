'use strict';

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game');

test('boots the real game without browser, asset, or network errors',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const contract = await page.evaluate(function () {
      return {
        protocol: location.protocol,
        version: FB.VERSION,
        bookmark: FB.activeBookmark && FB.activeBookmark.id,
        state: FB.state,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length
      };
    });

    expect(contract.protocol).toBe(
      testInfo.project.name === 'chromium-file' ? 'file:' : 'http:');
    expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.bookmark).toBe('867');
    expect(contract.state).toBeNull();
    expect(contract.scripts).toBeGreaterThan(40);
    expect(contract.stylesheets).toBe(1);
  });
