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

test('an eager-court save stays within the storage budget and reloads whole',
  async function ({ page }, testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served',
      'The storage budget belongs to the served origin.');

    await openGame(page, testInfo);
    await startDeterministicGame(page);

    expect(await page.evaluate(function () {
      const payload = FB.save.serialize();
      const before = JSON.parse(payload);
      const records = Object.keys(before.state.chars).length;
      let courtRecords = 0;
      for (const id in before.state.chars) {
        if (before.state.chars[id].royalLine) courtRecords++;
      }
      const stored = FB.save.toSlot(1);
      const reread = FB.save.read(1);
      return {
        stored:stored,
        rereadable:!!reread && reread.v === 3,
        records:records,
        courtRecords:courtRecords,
        megabytes:payload.length / (1024 * 1024),
        recordsSurviveRoundTrip:
          !!reread && Object.keys(reread.state.chars).length === records
      };
    }).then(function (result) {
      return {
        stored:result.stored,
        rereadable:result.rereadable,
        recordsSurviveRoundTrip:result.recordsSurviveRoundTrip,
        /* Court population is bound by the map, so this is a flat ceiling and
           not a figure that should drift upward with campaign length. */
        courtRecordsPresent:result.courtRecords > 100,
        withinBudget:result.megabytes < 4
      };
    })).toEqual({
      stored:true,
      rereadable:true,
      recordsSurviveRoundTrip:true,
      courtRecordsPresent:true,
      withinBudget:true
    });
  });
