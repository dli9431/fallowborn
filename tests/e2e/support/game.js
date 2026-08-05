'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const { expect } = require('./fixture');

const gameRoot = path.resolve(__dirname, '..', '..', '..');
const indexPath = path.join(gameRoot, 'index.html');
const browserHarnessPath = path.join(__dirname, 'browser-harness.js');
const holyWarHarnessPath = path.join(__dirname, 'holywar-harness.js');
const servedOrigin = 'http://127.0.0.1:4173';

const START_CODE = 'CADENCE-867-farmer-london-f-Ada';

function targetUrl(testInfo) {
  return testInfo.project.name.endsWith('-served')
    ? servedOrigin + '/'
    : pathToFileURL(indexPath).href;
}

async function openGame(page, testInfo) {
  await page.goto(targetUrl(testInfo), { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#title:not(.hidden)'))
    .toBeVisible({ timeout:30 * 1000 });
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible();
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FB && FB.game && FB.ui && FB.save && FB.activeBookmark);
    });
  }).toBe(true);
}

async function startDeterministicGame(page) {
  await page.getByRole('button', { name: 'New Game', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New Game', exact: true })).toBeVisible();
  const seedInput = page.locator('#ng-seed');
  await seedInput.fill(START_CODE);
  if (await seedInput.inputValue() !== START_CODE) {
    await seedInput.fill(START_CODE);
  }
  await expect(seedInput).toHaveValue(START_CODE);
  await page.getByRole('button', { name: /Use this seed/ })
    .click({ timeout:30 * 1000 });

  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue('Ada');
  await page.getByRole('button', { name: 'Begin Your Story', exact: true })
    .click({ timeout:30 * 1000 });

  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your Story Begins', exact: true }))
    .toBeVisible();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  // The CADENCE seed starts the Free Farmer scenario, tier 1: a focused
  // Freeholder orientation sheet opens — never the whole Guide.
  await expect(page.getByRole('heading', { name: 'Freeholder', exact: true }))
    .toBeVisible();
  await expect(page.locator('#gm-body')).toContainText('Good first actions');
  await expect(page.locator('#guide-controls')).toHaveCount(0);
  await page.locator('#orientation-continue').click();
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(FB.state && FB.state.seed === 'CADENCE-867-farmer-london-f-Ada' &&
        FB.state.player && FB.state.chars[FB.state.player.charId]);
    });
  }).toBe(true);
}

async function waitForUiRefresh(page) {
  await page.evaluate(function () {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () {
        requestAnimationFrame(resolve);
      });
    });
  });
}

async function injectBrowserHarness(page) {
  await page.addScriptTag({ path: browserHarnessPath });
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FBTEST && FBTEST.checkInvariants && FBTEST.advanceDays);
    });
  }).toBe(true);
}

async function injectHolyWarHarness(page) {
  await page.addScriptTag({ path: holyWarHarnessPath });
  await expect.poll(function () {
    return page.evaluate(function () {
      return !!(window.FBTEST && FBTEST.makeGreatHolyWar &&
        FBTEST.resolveGreatHolyWar);
    });
  }).toBe(true);
}

async function lifeSnapshot(page) {
  return page.evaluate(function () {
    const state = FB.state;
    const player = state.player;
    const character = state.chars[player.charId];
    return {
      seed: state.seed,
      start: JSON.parse(JSON.stringify(state.start)),
      date: JSON.parse(JSON.stringify(state.date)),
      turn: state.turn,
      rng: FB.getRngState(),
      uid: FB.getUidCounter(),
      player: {
        charId: player.charId,
        tier: player.tier,
        profession: player.profession,
        gold: player.gold,
        prestige: player.prestige,
        piety: player.piety,
        provinceId: player.provinceId,
        focus: player.focus
      },
      character: {
        id: character.id,
        name: character.name,
        sex: character.sex,
        culture: character.culture,
        religion: character.religion,
        born: character.born,
        dyn: character.dyn,
        traits: character.traits.slice()
      }
    };
  });
}

async function openMenu(page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Menu', exact: true })).toBeVisible();
}

module.exports = {
  START_CODE,
  injectBrowserHarness,
  injectHolyWarHarness,
  lifeSnapshot,
  openGame,
  openMenu,
  startDeterministicGame,
  targetUrl,
  waitForUiRefresh
};
