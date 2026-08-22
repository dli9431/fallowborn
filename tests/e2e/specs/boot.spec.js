'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'index.html',
  'css',
  'js',
  'data'
]);

const { test, expect } = require('../support/fixture');
const { openGame, targetUrl } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

test('boots the real game without browser, asset, or network errors',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await page.evaluate(function () {
      /* The title no longer creates a world. Resizing it must remain safe. */
      window.dispatchEvent(new Event('resize'));
    });

    const contract = await page.evaluate(async function () {
      let registrations = null;
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        try {
          registrations = (await navigator.serviceWorker.getRegistrations()).length;
        } catch (error) {
          registrations = -1;
        }
      }
      const scripts = Array.from(document.scripts).map(function (script) {
        return script.getAttribute('src') || '';
      });
      return {
        protocol: location.protocol,
        version: FB.VERSION,
        bookmark: FB.activeBookmark ? FB.activeBookmark.id : null,
        state: FB.state,
        scripts: scripts.length,
        stylesheets: document.styleSheets.length,
        fullStylesReady: document.getElementById('full-stylesheet')
          .getAttribute('data-ready') === 'true',
        bootReady: FB.game.bootReady,
        englishCatalogLoaded: !!(FBDATA.lang && FBDATA.lang.en),
        deferredModals: !!document.querySelector('script[data-deferred-ui="modals"]'),
        modalUiReady: typeof FB.ui.showMenu === 'function',
        platform: FB.platform,
        platformOrder: scripts.indexOf('js/util.js') < scripts.indexOf('js/main.js'),
        musicOrder: scripts.indexOf('data/music_catalog.js') < scripts.indexOf('js/music.js') &&
          scripts.indexOf('js/model.js') < scripts.indexOf('js/music.js') &&
          scripts.indexOf('js/music.js') < scripts.indexOf('js/portrait.js'),
        musicCatalog: FB.music && FB.music.catalog(),
        musicChoiceHidden: document.getElementById('music-choice')
          .classList.contains('hidden'),
        manifests: document.querySelectorAll('link[rel="manifest"]').length,
        themeColors: document.querySelectorAll('meta[name="theme-color"]').length,
        offlineStatusHidden: document.getElementById('offline-status')
          .classList.contains('hidden'),
        updateBannerHidden: document.getElementById('update-banner')
          .classList.contains('hidden'),
        registrations: registrations
      };
    });

    expect(contract.protocol).toBe(
      testInfo.project.name === 'chromium-file' ? 'file:' : 'http:');
    expect(contract.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(contract.bookmark).toBeNull();
    expect(contract.state).toBeNull();
    expect(contract.scripts).toBeGreaterThan(40);
    expect(contract.stylesheets).toBeGreaterThanOrEqual(2);
    expect(contract.fullStylesReady).toBe(true);
    expect(contract.bootReady).toBe(true);
    expect(contract.englishCatalogLoaded).toBe(false);
    expect(contract.deferredModals).toBe(true);
    expect(contract.modalUiReady).toBe(true);
    expect(contract.platform.name).toBe('local');
    expect(contract.platform.isPlay).toBe(false);
    expect(contract.platform.isItch).toBe(false);
    expect(contract.platform.isLocal).toBe(true);
    expect(contract.platform.isFile).toBe(
      testInfo.project.name === 'chromium-file');
    expect(contract.platformOrder).toBe(true);
    expect(contract.musicOrder).toBe(true);
    expect(contract.musicCatalog).toEqual(expect.objectContaining({
      schema:1,
      intro:expect.objectContaining({
        id:'intro-fallowborn-christian',
        kind:'intro'
      }),
      intros:expect.arrayContaining([
        expect.objectContaining({ id:'intro-fallowborn-christian', faith:'christian' }),
        expect.objectContaining({ id:'intro-fallowborn-muslim', faith:'muslim' }),
        expect.objectContaining({ id:'intro-fallowborn-pagan', faith:'pagan' })
      ]),
      tracks:expect.any(Array),
      banks:expect.any(Array)
    }));
    expect(contract.musicCatalog.tracks.length).toBeGreaterThan(0);
    expect(contract.musicCatalog.banks.length).toBeGreaterThan(0);
    expect(contract.musicChoiceHidden).toBe(true);
    expect(contract.manifests).toBe(0);
    expect(contract.themeColors).toBe(0);
    expect(contract.offlineStatusHidden).toBe(true);
    expect(contract.updateBannerHidden).toBe(true);
    expect([null, -1, 0]).toContain(contract.registrations);
  });

test('a translated boot loads English first and keeps incomplete Preview coverage active',
  async function ({ page }, testInfo) {
    await page.addInitScript(function () {
      localStorage.setItem('fb_lang', 'fr');
      localStorage.setItem('fb_ui', JSON.stringify({ musicChoice:'off' }));
    });
    /* This scenario intentionally boots in French. Keep its locale-specific
       readiness contract here instead of widening the universal English
       journey helper and selecting every specification that imports it. */
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible({
      timeout:30 * 1000
    });
    await expect.poll(function () {
      return page.evaluate(function () {
        return !!(window.FB && FB.game && FB.game.bootReady && FB.ui && FB.save);
      });
    }).toBe(true);
    await expect(page.locator('#btn-newgame')).toBeVisible();
    await expect(page.locator('#btn-newgame')).toBeEnabled();

    const localeBoot = await page.evaluate(function () {
      const scripts = Array.from(document.scripts).map(function (script) {
        return script.src || '';
      });
      const englishAt = scripts.findIndex(function (src) {
        return /\/data\/lang_en\.js(?:\?|$)/.test(src);
      });
      const frenchAt = scripts.findIndex(function (src) {
        return /\/data\/lang_fr\.js(?:\?|$)/.test(src);
      });
      const sourceEntries = FBDATA.lang.en.entries;
      const frenchEntries = FBDATA.lang.fr.entries;
      const missingKey = Object.keys(sourceEntries).find(function (key) {
        return key.indexOf('ui:') === 0 && typeof sourceEntries[key].text === 'string' &&
          !!frenchEntries[key];
      });
      const source = sourceEntries[missingKey];
      const aliasKey = FB.i18nSourceKey(source.text);
      const removed = {};
      [missingKey, aliasKey].forEach(function (key) {
        if (frenchEntries[key]) {
          removed[key] = frenchEntries[key];
          delete frenchEntries[key];
        }
      });
      const incompleteLocale = FB.finalizeLocale(true);
      const englishFallback = FB.renderKey(missingKey, source) === source.text;
      Object.keys(removed).forEach(function (key) {
        frenchEntries[key] = removed[key];
      });
      return {
        locale:FB.locale,
        english:!!FBDATA.lang.en,
        french:!!FBDATA.lang.fr,
        sourceBeforeLocale:englishAt >= 0 && frenchAt > englishAt,
        bookmark:FB.activeBookmark ? FB.activeBookmark.id : null,
        incompleteLocale:incompleteLocale,
        missingReported:FB.i18nReport.missing.indexOf(missingKey) >= 0,
        englishFallback:englishFallback
      };
    });

    expect(localeBoot).toEqual({
      locale:'fr', english:true, french:true,
      sourceBeforeLocale:true, bookmark:null,
      incompleteLocale:'fr', missingReported:true, englishFallback:true
    });
  });

test('world construction yields across expensive raster phases',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    const progressCounts = await page.evaluate(function () {
      return new Promise(function (resolve, reject) {
        const counts = {};
        FB.activateBookmark('867', function (fraction, message) {
          counts[message] = (counts[message] || 0) + 1;
        }, function (error) {
          if (error) { reject(error); return; }
          resolve(counts);
        });
      });
    });

    expect(progressCounts['Raising the continents…']).toBeGreaterThan(1);
    expect(progressCounts['Filling the seas…']).toBeGreaterThan(1);
    expect(progressCounts['Carving provinces…']).toBeGreaterThan(10);
    expect(progressCounts['Drawing borders…']).toBeGreaterThan(5);
    expect(progressCounts['Surveying settlements…']).toBeGreaterThan(1);
  });

test('the hosted update banner is play-only and saves a live campaign before reload',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);
    await startDeterministicGame(page);

    const detection = await page.evaluate(function () {
      const offPlay = FB.game.noteHostedBuild('future-hosted-build');
      const hiddenOffPlay = document.getElementById('update-banner')
        .classList.contains('hidden');
      FB.platform.isPlay = true;
      const currentBuild = FB.game.noteHostedBuild(FB.VERSION);
      const futureBuild = FB.game.noteHostedBuild('future-hosted-build');
      FB.game.paused = true;
      FB.state.player.gold = 4321;
      return {
        offPlay:offPlay,
        hiddenOffPlay:hiddenOffPlay,
        currentBuild:currentBuild,
        futureBuild:futureBuild
      };
    });

    expect(detection).toEqual({
      offPlay:false,
      hiddenOffPlay:true,
      currentBuild:false,
      futureBuild:true
    });
    const banner = page.locator('#update-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('New version available');
    const reload = page.getByRole('button', { name:'Save and reload', exact:true });
    await expect(reload).toBeVisible();

    await Promise.all([
      page.waitForNavigation({ waitUntil:'domcontentloaded' }),
      reload.click()
    ]);
    await page.waitForFunction(function () {
      return !!(window.FB && FB.save && FB.save.read('auto'));
    });
    expect(await page.evaluate(function () {
      return FB.save.read('auto').state.player.gold;
    })).toBe(4321);
  });

test('title menu gives every action a decorative icon and a clean accessible name',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

    const expected = [
      ['btn-continue', 'Continue'],
      ['btn-newgame', 'New Game'],
      ['btn-load', 'Load Game'],
      ['btn-mods', 'Mods'],
      ['btn-settings', 'Settings'],
      ['btn-help', 'How to Play'],
      ['btn-changelog', 'Changelog']
    ];
    const icons = page.locator('#title .menubtns .title-menu-icon');
    await expect(icons).toHaveCount(expected.length);
    const iconLabels = (await icons.allTextContents()).map(function (icon) {
      return icon.trim();
    });
    expect(iconLabels.every(function (icon) { return icon.length > 0; })).toBe(true);
    expect(new Set(iconLabels).size).toBe(expected.length);
    // A display:none control is correctly absent from the accessibility tree.
    // Expose Continue so its eventual player-facing name can be inspected too.
    await page.locator('#btn-continue').evaluate(function (button) {
      button.classList.remove('hidden');
    });
    for (const item of expected) {
      const button = page.locator('#' + item[0]);
      await expect(button.locator('.title-menu-icon')).toHaveAttribute('aria-hidden', 'true');
      await expect(button).toHaveAccessibleName(item[1]);
    }
  });
