'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, [
  'js/save.js',
  'js/travel.js',
  'js/ui_modals.js',
  'data/starts.js',
  'data/events_travel.js'
]);

const { test, expect } = require('../support/fixture');
const { openGame } = require('../support/game/navigation');
const { START_CODE, startDeterministicGame } = require('../support/game/start');
const { openMenu } = require('../support/game/ui');
const { lifeSnapshot } = require('../support/game/snapshot');

test.beforeEach(async function ({ page }, testInfo) {
  await openGame(page, testInfo);
});

test('a full start code creates the expected deterministic new game',
  async function ({ page }) {
    await startDeterministicGame(page);
    const snapshot = await lifeSnapshot(page);

    expect(snapshot.seed).toBe(START_CODE);
    expect(snapshot.start).toEqual({ id: '867', year: 867, season: 0, day: 1 });
    expect(snapshot.date).toEqual({ year: 867, season: 0, day: 1 });
    expect(snapshot.turn).toBe(0);
    expect(snapshot.player).toMatchObject({
      tier: 1,
      profession: 'farmer',
      gold: 20,
      prestige: 5,
      piety: 0,
      provinceId: 'london'
    });
    expect(snapshot.character).toMatchObject({
      name: 'Ada',
      sex: 'f',
      culture: 'english',
      religion: 'catholic',
      born: 851
    });
    expect(snapshot.character.traits).toHaveLength(2);
  });

test('a player can save to a slot and load the same life',
  async function ({ page }) {
    await startDeterministicGame(page);
    const original = await lifeSnapshot(page);
    const storageAvailable = await page.evaluate(function () {
      return FB.save.available;
    });
    test.skip(!storageAvailable, 'This browser denies storage to the file origin.');

    await openMenu(page);
    await page.getByRole('button', { name: /Save game/ }).click();
    await expect(page.getByRole('heading', { name: 'Save Game', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Save to slot 1/ }).click();
    await expect(page.locator('#genmodal')).toHaveClass(/hidden/);

    await page.evaluate(function () {
      FB.state.player.gold += 777;
      FB.state.player.prestige += 333;
    });
    await openMenu(page);
    await page.getByRole('button', { name: /Load game/ }).click();
    await expect(page.getByRole('heading', { name: 'Load Game', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Load slot 1/ }).click();

    await expect.poll(function () {
      return lifeSnapshot(page);
    }).toEqual(original);
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  });

test('a player can export a life and import it from the title screen',
  async function ({ page }) {
    await startDeterministicGame(page);
    const original = await lifeSnapshot(page);

    await openMenu(page);
    await page.getByRole('button', { name: /Save game/ }).click();
    await page.getByRole('button', { name: /Download save file/ }).click();
    await expect(page.getByRole('heading', { name: 'Save File', exact: true })).toBeVisible();
    const exported = await page.locator('#sl-xtext').inputValue();
    expect(exported).toMatch(/^FBS2\./);

    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Save Game', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Menu', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Abandon to title/ }).click();
    await expect(page.locator('#title:not(.hidden)')).toBeVisible();

    await page.getByRole('button', { name: 'Load Game', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Load Game', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Load save file/ }).click();
    await expect(page.getByRole('heading', { name: 'Load Save File', exact: true })).toBeVisible();
    await page.locator('#sl-itext').fill(exported);
    await page.getByRole('button', { name: /Load pasted save/ }).click();

    await expect.poll(function () {
      return lifeSnapshot(page);
    }).toEqual(original);
    await expect(page.locator('#game:not(.hidden)')).toBeVisible();
    expect(await page.evaluate(function () {
      const auto = FB.save.available ? FB.save.read('auto') : null;
      return FB.save.available ? auto && auto.state.seed : FB.state.seed;
    })).toBe(START_CODE);
  });
