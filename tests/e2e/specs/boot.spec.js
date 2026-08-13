'use strict';

const { test, expect } = require('../support/fixture');
const { openGame, startDeterministicGame } = require('../support/game');

test('boots the real game without browser, asset, or network errors',
  async function ({ page }, testInfo) {
    await openGame(page, testInfo);

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
        bookmark: FB.activeBookmark && FB.activeBookmark.id,
        state: FB.state,
        scripts: scripts.length,
        stylesheets: document.styleSheets.length,
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
    expect(contract.bookmark).toBe('867');
    expect(contract.state).toBeNull();
    expect(contract.scripts).toBeGreaterThan(40);
    expect(contract.stylesheets).toBe(1);
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
