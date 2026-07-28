'use strict';

const { test, expect } = require('../support/fixture');
const {
  START_CODE,
  openGame,
  startDeterministicGame
} = require('../support/game');

test('served origin provides persistent storage for save slots',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The complete storage contract belongs to the served origin.');

    await openGame(page, testInfo);
    expect(await page.evaluate(function () {
      localStorage.setItem('fallowborn_contract_probe', 'persistent');
      return {
        available: FB.save.available,
        auto: FB.save.read('auto'),
        slot: FB.save.read(1)
      };
    })).toEqual({
      available: true,
      auto: null,
      slot: null
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      const value = localStorage.getItem('fallowborn_contract_probe');
      localStorage.removeItem('fallowborn_contract_probe');
      return value;
    })).toBe('persistent');

    await startDeterministicGame(page);
    expect(await page.evaluate(function () {
      const auto = FB.save.read('auto');
      const stored = FB.save.toSlot(1);
      const slot = FB.save.read(1);
      return {
        stored: stored,
        autoVersion: auto && auto.v,
        autoSeed: auto && auto.state.seed,
        slotVersion: slot && slot.v,
        slotSeed: slot && slot.state.seed
      };
    })).toEqual({
      stored: true,
      autoVersion: 3,
      autoSeed: START_CODE,
      slotVersion: 3,
      slotSeed: START_CODE
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      return {
        autoSeed: FB.save.read('auto').state.seed,
        slotSeed: FB.save.read(1).state.seed
      };
    })).toEqual({
      autoSeed: START_CODE,
      slotSeed: START_CODE
    });
  });
