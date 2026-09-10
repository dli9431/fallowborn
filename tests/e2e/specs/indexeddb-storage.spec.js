'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/save.js', 'js/main.js', 'js/messages.js', 'js/ui_modals.js']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

async function start(page, testInfo) {
  await openGame(page, testInfo);
  await startDeterministicGame(page);
  test.skip(await page.evaluate(function () { return FB.save.storageBackend() !== 'indexeddb'; }),
    'This origin does not support IndexedDB; localStorage fallback is covered separately.');
}
async function storedGold(page, name) {
  return page.evaluate(function (name) {
    return new Promise(function (resolve, reject) {
      const request = indexedDB.open('fallowborn-saves', 1);
      request.onerror = function () { reject(request.error); };
      request.onsuccess = function () {
        const db = request.result, transaction = db.transaction('slots', 'readonly');
        const read = transaction.objectStore('slots').get(name);
        read.onsuccess = function () { resolve(read.result ? JSON.parse(read.result).state.player.gold : null); };
        read.onerror = function () { reject(read.error); };
        transaction.oncomplete = function () { db.close(); };
      };
    });
  }, name);
}

test('manual saves confirm committed data and survive reload without a localStorage slot', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const saved = await page.evaluate(function () {
    FB.state.player.gold = 4321;
    return new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
  });
  expect(saved).toBe(true);
  expect(await storedGold(page, 'fb_slot1')).toBe(4321);
  expect(await page.evaluate(function () { return localStorage.getItem('fb_slot1'); })).toBe(null);
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  expect(await page.evaluate(function () { return FB.save.read(1).state.player.gold; })).toBe(4321);
});

test('legacy slots migrate only after commit and a local recovery copy wins on reload', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(function () {
    FB.state.player.gold = 100;
    return new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
  });
  await page.evaluate(function () {
    FB.state.player.gold = 200;
    localStorage.setItem('fb_slot1', FB.save.serialize());
  });
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  await expect.poll(function () { return storedGold(page, 'fb_slot1'); }).toBe(200);
  await expect.poll(function () { return page.evaluate(function () { return localStorage.getItem('fb_slot1'); }); }).toBe(null);
  expect(await page.evaluate(function () { return FB.save.read(1).state.player.gold; })).toBe(200);
});

test('newer autosave snapshots win and do not require localStorage capacity', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(async function () {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name) {
      if (name === 'fb_auto') throw new DOMException('Full', 'QuotaExceededError');
      return original.apply(this, arguments);
    };
    try {
      FB.state.player.gold = 111; FB.save.autosave();
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      FB.state.player.gold = 222; FB.save.autosave();
      await new Promise(function (resolve) { setTimeout(resolve, 0); });
      FB.state.player.gold = 999;
    } finally { Storage.prototype.setItem = original; }
  });
  await expect.poll(function () { return storedGold(page, 'fb_auto'); }).toBe(222);
});

test('aborted database writes fall back to verified localStorage', async function ({ page }, testInfo) {
  await start(page, testInfo);
  const result = await page.evaluate(async function () {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (store, mode) {
      const transaction = original.apply(this, arguments);
      if (mode === 'readwrite') transaction.abort();
      return transaction;
    };
    try {
      FB.state.player.gold = 5432;
      const ok = await new Promise(function (resolve) { FB.save.toSlot(2, resolve); });
      return { ok:ok, gold:FB.save.read(2).state.player.gold, local:!!localStorage.getItem('fb_slot2') };
    } finally { IDBDatabase.prototype.transaction = original; }
  });
  expect(result).toEqual({ ok:true, gold:5432, local:true });
  await page.reload();
  await page.waitForFunction(function () { return FB.game.bootReady; });
  await expect.poll(function () { return page.evaluate(function () { return localStorage.getItem('fb_slot2'); }); }).toBe(null);
  expect(await page.evaluate(function () { return FB.save.read(2).state.player.gold; })).toBe(5432);
});


test('save sheet waits for commit and leaves a replacement sheet open', async function ({ page }, testInfo) {
  await start(page, testInfo);
  await page.evaluate(function () {
    window.originalSlotWriter = FB.save.toSlot;
    FB.save.toSlot = function (slot, done) { window.finishSlotProbe = done; return true; };
    FB.ui.showSaveLoad(true);
  });
  await page.locator('[data-slot="1"]').click();
  await expect(page.locator('[data-slot="1"]')).toBeDisabled();
  await expect(page.getByRole('heading', { name:'Save Game', exact:true })).toBeVisible();
  await page.evaluate(function () {
    FB.ui.showMenu();
    window.finishSlotProbe(true);
    FB.save.toSlot = window.originalSlotWriter;
  });
  await expect(page.locator('#m-save')).toBeVisible();
});
