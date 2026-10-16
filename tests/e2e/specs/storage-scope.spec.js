'use strict';
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { dependsOnRuntime } = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, [
  'index.html', 'js/util.js', 'js/save.js', 'js/main.js', 'js/i18n.js', 'js/mods.js', 'js/ui_misc.js'
]);

/* Test builds share one origin under branch paths. A build-time scope keeps
   each build's browser storage apart; without it every key stays exactly as
   released, so existing play, itch and local saves are untouched. */

function scoped(page, scope, label) {
  return page.addInitScript(function (flags) {
    window.FB_STORAGE_SCOPE = flags.scope;
    window.FB_BUILD_LABEL = flags.label;
  }, { scope:scope, label:label });
}

function storageFacts(page) {
  return page.evaluate(function () {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    return { scope:FB.storageScope, keys:keys.sort(), slot:FB.save.hasSlot(1), any:FB.save.hasAnySave(),
      tier:FB.startProgression.snapshot().highestAchievedTier,
      title:document.getElementById('title-version').textContent };
  });
}

test('unscoped storage keeps every released key and database name', async function ({ page }, testInfo) {
  await openGame(page, testInfo);
  expect(await page.evaluate(function () {
    return { scope:FB.storageScope, label:FB.buildLabel,
      keys:['fb_slot1', 'fb_auto', 'fb_progression', 'fb_ui', 'fb_automation', 'fb_lang', 'fb_mods',
        'fb_mods_bundled', 'fallowborn-saves'].map(FB.storageKey),
      title:document.getElementById('title-version').textContent };
  })).toEqual({ scope:'', label:'',
    keys:['fb_slot1', 'fb_auto', 'fb_progression', 'fb_ui', 'fb_automation', 'fb_lang', 'fb_mods',
      'fb_mods_bundled', 'fallowborn-saves'],
    title:expect.stringMatching(/^v\d+\.\d+\.\d+$/) });
});

test('an invalid storage scope is ignored', async function ({ page }, testInfo) {
  await scoped(page, '../Other Branch', 'x');
  await openGame(page, testInfo);
  expect(await page.evaluate(function () {
    return [FB.storageScope, FB.storageKey('fb_ui')];
  })).toEqual(['', 'fb_ui']);
});

test('a scoped test build keeps saves, progression and settings apart from the root build',
  async function ({ page }, testInfo) {
    await scoped(page, 'e2e-branch', 'e2e-branch · 0000000');
    await openGame(page, testInfo);
    await startDeterministicGame(page);
    await page.evaluate(function () {
      return new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
    });
    const branch = await storageFacts(page);
    expect(branch).toMatchObject({ scope:'e2e-branch', slot:true, any:true });
    expect(branch.keys).toContain('fb_progression@e2e-branch');
    expect(branch.keys.filter(function (key) { return /^fb_/.test(key) && key.indexOf('@e2e-branch') < 0; }))
      .toEqual([]);

    // The root build on the same origin sees none of the branch's storage.
    const root = await page.context().newPage();
    await openGame(root, testInfo);
    const unscoped = await storageFacts(root);
    expect(unscoped).toMatchObject({ scope:'', slot:false, any:false });
    expect(unscoped.title).not.toContain('e2e-branch');
    await root.evaluate(function () { FB.startProgression.noteTier(3); });

    // And the root's writes never reach the branch.
    await openGame(page, testInfo);
    const again = await storageFacts(page);
    expect(again).toMatchObject({ scope:'e2e-branch', slot:true });
    expect(again.title).toContain('e2e-branch · 0000000');
    expect(again.keys).toContain('fb_progression');
    expect(await page.evaluate(function () {
      return JSON.parse(localStorage.getItem('fb_progression@e2e-branch')).highestAchievedTier;
    })).toBeLessThan(3);
    await root.close();
  });
