'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['js/save.js', 'js/main.js', 'js/ui_modals.js', 'js/ui_misc.js', 'css/style.css']);
const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { startDeterministicGame } = require('../support/game/start');

for (const fallback of [false, true]) {
  test('delete cancels pending writes and preserves other data: ' + (fallback ? 'localStorage' : 'IndexedDB'), async function ({ page }, testInfo) {
    if (fallback) await page.addInitScript(function () {
      Object.defineProperty(window, 'indexedDB', { configurable:true, value:undefined });
    });
    await openGame(page, testInfo); await startDeterministicGame(page);
    if (!fallback) test.skip(await page.evaluate(function () { return FB.save.storageBackend() !== 'indexeddb'; }), 'IndexedDB unavailable at this origin.');
    const result = await page.evaluate(async function () {
      function save(slot) { return new Promise(function (resolve) { FB.save.toSlot(slot, resolve); }); }
      function remove(slot) { return new Promise(function (resolve) { FB.save.deleteSaves(slot, resolve); }); }
      localStorage.setItem('fb_deletion_preference', 'keep');
      await save(2);
      // Deleting while a write or migration is pending must win over that write.
      FB.save.toSlot(1);
      const one = await remove(1);
      FB.save.flushPending();
      const isolated = !FB.save.hasSlot(1) && !!FB.save.read(2);
      FB.save.autosave();
      const auto = await remove('auto');
      FB.save.flushPending();
      const autoGone = !FB.save.hasAuto() && !FB.save.hasSlot('auto');
      const usage = await new Promise(function (resolve) { FB.save.storageUsage(resolve); });
      const all = await remove('all');
      FB.save.flushPending();
      // A lifecycle save must not recreate an explicitly deleted autosave.
      FB.save.autosave({ background:true });
      FB.save.flushPending();
      return { one:one, isolated:isolated, auto:auto, autoGone:autoGone, all:all,
        empty:!FB.save.hasAnySave(), pref:localStorage.getItem('fb_deletion_preference'), usage:usage };
    });
    expect(result.one && result.isolated && result.auto && result.autoGone && result.all && result.empty).toBe(true);
    expect(result.pref).toBe('keep');
    expect(result.usage.localStorage).toBeGreaterThan(0);
    if (!fallback) expect(result.usage.indexedDB).toBeGreaterThan(0);
    await page.reload(); await page.waitForFunction(function () { return FB.game.bootReady; });
    expect(await page.evaluate(function () { return FB.save.hasAnySave(); })).toBe(false);
  });
}

test('Autosave deletion confirms usage, keeps confirmation in the body and returns through Back on desktop and mobile', async function ({ page }, testInfo) {
  await page.setViewportSize({ width:1100, height:850 });
  await openGame(page, testInfo); await startDeterministicGame(page);
  await page.evaluate(async function () {
    await new Promise(function (resolve) { FB.save.toSlot('auto', resolve); });
    FB.ui.showSaveLoad(true);
  });
  await expect(page.locator('.save-slot-summary')).toContainText('used by Continue');
  await page.getByRole('button', { name:'Delete Autosave', exact:true }).click();
  const confirm = page.getByRole('button', { name:'Confirm delete', exact:true });
  const cancel = page.getByRole('button', { name:'Back', exact:true });
  await expect(confirm).toBeEnabled();
  await expect(page.locator('#save-storage-usage')).toContainText('localStorage:');
  await expect(page.locator('#save-storage-usage')).toContainText('IndexedDB:');
  await expect(page.locator('.gm-footer #save-delete-confirm')).toHaveCount(0);
  await expect(page.locator('.modal-body-actions #save-delete-confirm')).toBeVisible();
  await page.setViewportSize({ width:390, height:844 });
  expect((await confirm.boundingBox()).y).toBeLessThan((await cancel.boundingBox()).y);
  await cancel.click();
  await expect(page.getByRole('button', { name:'Delete Autosave', exact:true })).toBeEnabled();
  expect(await page.evaluate(function () { return FB.save.hasAuto(); })).toBe(true);
  await page.getByRole('button', { name:'Delete Autosave', exact:true }).click();
  await confirm.click();
  await expect(page.getByRole('button', { name:'Delete Autosave', exact:true })).toBeDisabled();
  expect(await page.evaluate(function () { return FB.save.hasAuto(); })).toBe(false);
  await expect(page.locator('#btn-continue')).toHaveClass(/hidden/);
});

test('Settings offers delete-all confirmation and Escape cancels without deleting', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  await page.evaluate(async function () {
    await new Promise(function (resolve) { FB.save.toSlot(1, resolve); });
    FB.ui.showSettings();
  });
  await page.locator('#set-delete-saves').click();
  await expect(page.locator('#gm-body')).toContainText('All save slots, including Autosave');
  await page.keyboard.press('Escape');
  await expect(page.locator('#set-delete-saves')).toBeVisible();
  expect(await page.evaluate(function () { return !!FB.save.read(1); })).toBe(true);
});

test('background saving resumes after play advances beyond an autosave deletion', async function ({ page }, testInfo) {
  await openGame(page, testInfo); await startDeterministicGame(page);
  const result = await page.evaluate(async function () {
    await new Promise(function (resolve) { FB.save.deleteSaves('auto', resolve); });
    FB.save.autosave({ background:true });
    FB.save.flushPending();
    const suppressed = !FB.save.hasAuto();
    FB.state.turn++;
    FB.save.autosave({ background:true });
    FB.save.flushPending();
    return { suppressed:suppressed, resumed:FB.save.hasAuto() };
  });
  expect(result).toEqual({ suppressed:true, resumed:true });
});
