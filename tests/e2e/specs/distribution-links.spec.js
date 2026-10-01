'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/crazygames.js', 'index.html', 'js/util.js', 'js/ui_modals.js', 'js/ui_misc.js',
  'js/main.js', 'js/save.js', 'js/model.js', 'js/i18n.js',
  'js/ui_panels.js', 'js/messages.js',
  'js/technology.js', 'data/technology.js'
]);
const { test, expect } = require('../support/fixture');
const { mockCrazyGames } = require('../support/crazygames');
test.beforeEach(async function ({ page }) { await mockCrazyGames(page); });
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

for (const distribution of ['standard', 'crazygames']) {
  test(distribution + ' renders distribution-appropriate menu, report and saga links',
    async function ({ page }, testInfo) {
      const restricted = distribution === 'crazygames';
      if (restricted) {
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames';
        });
      }
      await openGame(page, testInfo);
      expect(await page.evaluate(function () {
        return FB.platform.isCrazyGames;
      })).toBe(restricted);
      await startDeterministicGame(page);
      await page.evaluate(function () { FB.ui.showMenu(); });
      await expect(page.locator('#m-community'))
        .toHaveAttribute('href', 'https://discord.gg/G8E67hY2pj');
      await expect(page.locator('#m-rate')).toHaveCount(restricted ? 0 : 1);
      if (!restricted) {
        await expect(page.locator('#m-rate'))
          .toHaveAttribute('href', 'https://dli9431.itch.io/fallowborn/rate');
      }
      await expect(page.locator('#m-support-email')).toHaveCount(restricted ? 1 : 0);
      await expect(page.locator('#m-support-issues')).toHaveCount(restricted ? 1 : 0);
      if (restricted) {
        await expect(page.locator('#m-support-email')).toHaveAttribute('href', 'mailto:hello@fallowborn.com');
        await expect(page.locator('#m-support-issues'))
          .toHaveAttribute('href', 'https://github.com/dli9431/fallowborn/issues');
      }
      await page.locator('#m-report').click();
      await expect(page.locator('#rp-copy')).toBeVisible();
      await expect(page.locator('#rp-community')).toHaveCount(restricted ? 0 : 1);
      await expect(page.locator('#gm-body a[href^="mailto:"]')).toHaveCount(restricted ? 0 : 1);
      await expect(page.locator('#gm-body a[href*="github.com"]')).toHaveCount(restricted ? 0 : 1);
      if (restricted) {
        await expect(page.locator('#gm-body')).toContainText('support link in the game menu');
      }
      await page.locator('#rp-text').fill('Distribution report probe');
      await page.evaluate(function () {
        window.__distributionReport = '';
        Object.defineProperty(navigator, 'clipboard', {
          configurable:true,
          value:{ writeText:function (text) {
            window.__distributionReport = text;
            return Promise.resolve();
          } }
        });
      });
      await page.locator('#rp-copy').click();
      await expect.poll(function () {
        return page.evaluate(function () { return window.__distributionReport; });
      }).toContain('Distribution report probe');
      if (restricted) {
        await expect(page.locator('#gm-body a[href*="discord.gg"]')).toHaveCount(0);
      }
      await page.evaluate(function () {
        FB.ui.closeModal();
        // Technology Guide entries require Baron rank, independent of distribution.
        FB.state.player.tier = 3;
        FB.ui.showGuide();
      });
      if (restricted) {
        await expect(page.locator('[data-guide-more-info]')).toHaveCount(0);
        await expect(page.locator('#gm-body a[href]')).toHaveCount(0);
      } else {
        await expect(page.locator('[data-guide-more-info]').first()).toBeAttached();
      }
      await expect(page.locator('[data-guide-tech="horizontal_loom"]')).toHaveCount(1);
      await page.locator('#guide-search').fill('day');
      await page.locator('[data-guide-entry="day-to-day"]').click();
      await expect(page.locator('#guide-entry-detail-day-to-day')).toBeVisible();
      await page.evaluate(function () {
        FB.ui.closeModal();
        const me = FB.state.chars[FB.state.player.charId];
        const heirs = FB.heirsOf(FB.state);
        for (let i = 0; i < heirs.length; i++) heirs[i].dead = true;
        me.dead = true;
        FB.state.player.dead = true;
        FB.ui.gameOver();
      });
      await page.getByRole('button', { name:'Share your saga', exact:true }).click();
      await expect(page.locator('#saga-community')).toHaveCount(restricted ? 0 : 1);
      await expect(page.locator('#saga-rate')).toHaveCount(restricted ? 0 : 1);
      const summary = await page.locator('#saga-share-text').inputValue();
      expect(summary).toContain('House ');
      expect(summary).toContain('Start seed: ');
      if (restricted) {
        expect(summary).not.toContain('itch.io');
        expect(summary).not.toContain('Play Fallowborn:');
        await expect(page.locator('#saga-copy')).not.toContainText('play link');
        await expect(page.locator('#gm-body a[href*="itch.io"]')).toHaveCount(0);
      } else {
        expect(summary).toContain('Play Fallowborn: https://dli9431.itch.io/fallowborn');
        await expect(page.locator('#saga-copy')).toContainText('play link');
      }
      await page.evaluate(function () {
        window.__distributionCopied = '';
        Object.defineProperty(navigator, 'clipboard', {
          configurable:true,
          value:{ writeText:function (text) {
            window.__distributionCopied = text;
            return Promise.resolve();
          } }
        });
      });
      await page.locator('#saga-copy').click();
      await expect.poll(function () {
        return page.evaluate(function () { return window.__distributionCopied; });
      }).toBe(summary);
      await page.locator('#saga-back').click();
      await expect(page.getByRole('heading', { name:'The Chronicle Closes', exact:true }))
        .toBeVisible();
    });
}

test('CrazyGames uses English without catalog requests or a language picker', async function ({ page }, testInfo) {
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    localStorage.setItem('fb_lang', 'fr');
  });
  await openGame(page, testInfo);
  const boot = await page.evaluate(function () {
    return { locale:FB.locale, stored:localStorage.getItem('fb_lang'),
      choices:FB.availableLocales().map(function (item) { return item.code; }),
      scripts:Array.from(document.scripts).filter(function (script) {
        return /\/data\/lang_[^/]+\.js(?:\?|$)/.test(script.src || '');
      }).length };
  });
  expect(boot).toEqual({ locale:'en', stored:'en', choices:['en'], scripts:0 });
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.ui.showSettings(); });
  await expect(page.locator('#set-lang')).toHaveCount(0);
  const blocked = await page.evaluate(function () {
    return { french:FB.setLocale('fr'), english:FB.setLocale('en'),
      stored:localStorage.getItem('fb_lang'), active:FB.locale };
  });
  expect(blocked).toEqual({ french:false, english:false, stored:'en', active:'en' });
  const fallback = await page.evaluate(function () {
    return new Promise(function (resolve) {
      const immediate = FB.ensureEnglishCatalog(function (loaded) {
        resolve({ immediate:immediate, loaded:loaded,
          scripts:Array.from(document.scripts).filter(function (script) {
            return /\/data\/lang_[^/]+\.js(?:\?|$)/.test(script.src || '');
          }).length });
      });
    });
  });
  expect(fallback).toEqual({ immediate:false, loaded:false, scripts:0 });
});
test('unknown distribution flags preserve standard links', async function ({ page }, testInfo) {
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'unknown'; });
  await openGame(page, testInfo);
  await page.evaluate(function () { FB.ui.showMenu(); });
  expect(await page.evaluate(function () { return FB.platform.isCrazyGames; })).toBe(false);
  await expect(page.locator('#m-rate'))
    .toHaveAttribute('href', 'https://dli9431.itch.io/fallowborn/rate');
});
