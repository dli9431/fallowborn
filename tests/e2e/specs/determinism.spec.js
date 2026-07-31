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

test('a fixed seed pins the courts as well as the protagonist',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-file',
      'The court seed canary runs against the primary file target.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    /* Court generation runs on a stream scoped to the world seed and the
       realm, so re-seeding the shared world stream to anything at all must
       leave an already-materialized court exactly where it was, and a court
       materialized afterwards must match the one materialized before. */
    expect(await page.evaluate(function () {
      const s = FB.state;
      function fingerprint(rid) {
        const c = FB.realmRulerCharacterSnapshot(s, rid);
        return c ? c.id + '|' + c.name + '|' + JSON.stringify(c.skills) +
          '|' + c.traits.join(',') : null;
      }
      const ids = [];
      for (const rid in s.realms) {
        const r = s.realms[rid];
        if (r && r.alive && rid !== 'player') ids.push(rid);
      }
      ids.sort();
      const target = ids[0];
      const first = fingerprint(target);

      /* Drop the record and rebuild it from a deliberately different point in
         the shared stream. A scoped court reproduces; an unscoped one does not. */
      const succession = s.realms[target].succession;
      const member = succession.members[succession.rulerMemberId];
      const charId = member.charId;
      delete s.chars[charId];
      member.charId = null;
      FB.seedRng(FB.hashSeed('a completely different stream position'));
      FB.materializeRealmRuler(s, target);
      return { first:first, second:fingerprint(target) };
    }).then(function (result) {
      return result.first !== null && result.first === result.second;
    })).toBe(true);
  });
