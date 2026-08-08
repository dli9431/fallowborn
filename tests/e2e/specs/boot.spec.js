'use strict';

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game');

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
      intro:null,
      tracks:[],
      banks:[]
    }));
    expect(contract.musicChoiceHidden).toBe(true);
    expect(contract.manifests).toBe(0);
    expect(contract.themeColors).toBe(0);
    expect(contract.offlineStatusHidden).toBe(true);
    expect([null, -1, 0]).toContain(contract.registrations);
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
    for (const item of expected) {
      const button = page.locator('#' + item[0]);
      await expect(button.locator('.title-menu-icon')).toHaveAttribute('aria-hidden', 'true');
      await expect(button).toHaveAccessibleName(item[1]);
    }
  });
