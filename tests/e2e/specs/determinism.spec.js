'use strict';

const { test, expect, attachPageDiagnostic, installPageGuards } =
  require('../support/fixture');
const {
  injectBrowserHarness,
  openGame,
  startDeterministicGame
} = require('../support/game');

async function runScript(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await injectBrowserHarness(page);
  return page.evaluate(function () {
    const result = FBTEST.advanceDays({
      days: 30,
      maxDays: 30,
      maxEvents: 20,
      maxInterruptions: 0,
      checkEvery: 10,
      style: 'first'
    });
    return JSON.parse(result.serialized);
  });
}

test('the same start and scripted decisions serialize identically in two contexts',
  async function ({ browser, page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The determinism canary runs against the primary file target.');

    const first = await runScript(page, testInfo);
    const secondContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      timezoneId: 'UTC'
    });
    let secondPage;

    try {
      secondPage = await secondContext.newPage();
      const guard = installPageGuards(secondPage);
      const second = await runScript(secondPage, testInfo);
      expect(guard.faults, 'second browser context faults').toEqual([]);
      expect(second).toEqual(first);
    } catch (error) {
      if (secondPage) {
        await attachPageDiagnostic(secondPage, testInfo, 'second-context-game-state');
        if (!secondPage.isClosed()) {
          const screenshotPath = testInfo.outputPath('second-context-failure.png');
          await secondPage.screenshot({ path: screenshotPath, fullPage: true });
          await testInfo.attach('second-context-failure', {
            path: screenshotPath,
            contentType: 'image/png'
          });
        }
      }
      throw error;
    } finally {
      await secondContext.close();
    }
  });
