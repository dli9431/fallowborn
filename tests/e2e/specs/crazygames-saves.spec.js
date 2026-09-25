'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html', 'js/crazygames.js', 'js/save.js', 'js/main.js',
  'js/ui_misc.js', 'js/ui_modals.js', 'js/util.js', 'js/mods.js']);
const { test, expect } = require('../support/fixture');
const { openGame, targetUrl } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');
const { mockCrazyGames } = require('../support/crazygames');
async function boot(page, testInfo, options) {
  await mockCrazyGames(page, options);
  await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
  await openGame(page, testInfo);
}
async function save(page) {
  return page.evaluate(function () {
    return new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
  });
}

test('CrazyGames saves a campaign and earned starts across reload without local slot writes', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.state.player.gold = 4321;
    FB.startProgression.noteTier(3);
    localStorage.setItem('fb_auto', 'unrelated local save');
  });
  expect(await save(page)).toBe(true);
  expect(await page.evaluate(function () { return FB.save.storageBackend(); })).toBe('crazygames');
  expect(await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1.slice(0,5); })).toBe('FBG1.');
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  const result = await page.evaluate(function () {
    return { gold:FB.save.read('auto').state.player.gold,
      tier:FB.startProgression.snapshot().highestAchievedTier,
      local:localStorage.getItem('fb_auto'), manual:FB.save.hasSlot(1) };
  });
  expect(result).toEqual({ gold:4321, tier:3, local:'unrelated local save', manual:false });
});

test('CrazyGames manual UI uses Continue and preserves the previous save on SDK rejection', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const previous = await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1; });
  await page.evaluate(function () { window.__cgTest.failWrite = true; FB.state.player.gold += 10; FB.ui.showSaveLoad(true); });
  await expect(page.locator('[data-slot]')).toHaveCount(1);
  await page.locator('[data-slot="auto"]').click();
  await expect(page.locator('#toasts')).toContainText('previous save is kept');
  expect(await page.evaluate(function () { return window.__cgTest.data.fb_cg_campaign_v1; })).toBe(previous);
  await expect(page.locator('#sl-export')).toBeVisible();
  expect(await page.evaluate(function () { return FB.save.exportState().slice(0,5); })).toBe('FBS2.');
});

test('CrazyGames refuses oversized data before SDK mutation and preserves gameplay state', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var previous = window.__cgTest.data.fb_cg_campaign_v1;
    var snapshot = JSON.parse(FB.save.serialize());
    var words = [], seed = 931;
    for (var i = 0; i < 400000; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; words.push(seed.toString(16)); }
    snapshot.state.capacityProbe = words.join('');
    var beforeCalls = window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; }).length;
    var outcome = await new Promise(function (resolve) {
      FB.crazySave.write(JSON.stringify(snapshot), function (ok, error) { resolve({ ok:ok, error:error && error.message }); });
    });
    return { outcome:outcome, preserved:previous === window.__cgTest.data.fb_cg_campaign_v1,
      unchanged:!FB.state.capacityProbe,
      writes:window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; }).length - beforeCalls };
  });
  expect(result.outcome.ok).toBe(false);
  expect(result.outcome.error).toContain('space is full');
  expect(result.preserved).toBe(true);
  expect(result.unchanged).toBe(true);
  expect(result.writes).toBe(0);
});

test('CrazyGames deletion cancels in-flight saves and keeps unlocked starts', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    FB.startProgression.noteTier(3);
    var writing = new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    var removed = await new Promise(function (resolve) { FB.save.deleteSaves('all', resolve); });
    await writing;
    FB.save.flushPending();
    return { removed:removed, saved:FB.save.hasAuto(), value:window.__cgTest.data.fb_cg_campaign_v1 || null,
      tier:FB.startProgression.snapshot().highestAchievedTier };
  });
  expect(result).toEqual({ removed:true, saved:false, value:null, tier:3 });
});

test('account change cancels writes from the previous session', async function ({ page }, testInfo) {
  await boot(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var before = window.__cgTest.data.fb_cg_campaign_v1;
    var writing = new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    window.__cgTest.auth({ username:'another-player' });
    var ok = await writing;
    FB.save.flushPending();
    return { ok:ok, preserved:before === window.__cgTest.data.fb_cg_campaign_v1 };
  });
  expect(result).toEqual({ ok:false, preserved:true });
});

async function bootLocal(page, testInfo) {
  await mockCrazyGames(page);
  await page.addInitScript(function () {
    window.FB_DISTRIBUTION = 'crazygames';
    window.FB_CRAZYGAMES_STORAGE = 'localstorage';
  });
  await openGame(page, testInfo);
}

test('CrazyGames localStorage mode saves one compressed life and earned starts without SDK data', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () {
    FB.state.player.gold = 4321;
    FB.startProgression.noteTier(3);
  });
  expect(await save(page)).toBe(true);
  const before = await page.evaluate(function () {
    return { backend:FB.save.storageBackend(),
      campaign:localStorage.getItem('fb_cg_aps_campaign_v1').slice(0, 5),
      progression:JSON.parse(localStorage.getItem('fb_cg_aps_progression_v1')).highestAchievedTier,
      sdkInitialized:window.__cgTest.calls.indexOf('init') >= 0,
      sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }),
      sdkData:window.__cgTest.data };
  });
  expect(before).toEqual({
    backend:'localstorage', campaign:'FBG1.', progression:3,
    sdkInitialized:true, sdkDataCalls:[], sdkData:{}
  });
  await page.evaluate(function () { FB.ui.showSaveLoad(true); });
  await expect(page.locator('#gm-body')).toContainText('Automatic Progress Save may back it up');
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  const after = await page.evaluate(function () {
    return { gold:FB.save.read('auto').state.player.gold,
      tier:FB.startProgression.snapshot().highestAchievedTier,
      manual:FB.save.hasSlot(1), backend:FB.save.storageBackend(),
      sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }) };
  });
  expect(after).toEqual({ gold:4321, tier:3, manual:false, backend:'localstorage', sdkDataCalls:[] });
});

test('CrazyGames localStorage quota rejection retains the last accepted campaign', async function ({ page }, testInfo) {
  await bootLocal(page, testInfo);
  await startDeterministicGame(page);
  expect(await save(page)).toBe(true);
  const result = await page.evaluate(async function () {
    var previous = localStorage.getItem('fb_cg_aps_campaign_v1');
    var previousGold = FB.save.read('auto').state.player.gold;
    var original = Storage.prototype.setItem;
    FB.state.player.gold += 10;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'fb_cg_aps_campaign_v1') throw new DOMException('Full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    try {
      var ok = await new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
      return { ok:ok, preserved:localStorage.getItem('fb_cg_aps_campaign_v1') === previous,
        gold:FB.save.read('auto').state.player.gold, previousGold:previousGold,
        sdkDataCalls:window.__cgTest.calls.filter(function (call) { return /^(get|set):/.test(call); }) };
    } finally { Storage.prototype.setItem = original; }
  });
  expect(result.ok).toBe(false);
  expect(result.preserved).toBe(true);
  expect(result.gold).toBe(result.previousGold);
  expect(result.sdkDataCalls).toEqual([]);
  await expect(page.locator('#toasts')).toContainText('previous save is kept');
});

test('standard edition never initializes the SDK and retains its manual slots', async function ({ page }, testInfo) {
  await mockCrazyGames(page);
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  await page.evaluate(function () { FB.ui.showSaveLoad(true); });
  await expect(page.locator('[data-slot]')).toHaveCount(3);
  expect(await page.evaluate(function () { return window.__cgTest.calls; })).toEqual([]);
});

for (const scenario of [
  { name:'failed SDK initialization', options:{ failInit:true }, message:'SDK connection failed' },
  { name:'corrupt cloud data', options:{ data:{ fb_cg_campaign_v1:'broken' } }, message:'saved data has been kept' }
]) {
  test(scenario.name + ' blocks boot without creating local progress', async function ({ page }, testInfo) {
    await mockCrazyGames(page, scenario.options);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; });
    await page.goto(targetUrl(testInfo), { waitUntil:'domcontentloaded' });
    await expect(page.locator('#title-boot-status')).toContainText(scenario.message);
    expect(await page.evaluate(function () { return FB.game.bootReady; })).toBe(false);
    await expect(page.locator('#btn-newgame')).toBeDisabled();
    expect(await page.evaluate(function () {
      return window.__cgTest.calls.filter(function (c) { return c.indexOf('set:') === 0; });
    })).toEqual([]);
  });
}
