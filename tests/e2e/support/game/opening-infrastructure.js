'use strict';
const { expectModAdmission } = require('./mod-admission');
const { openGame, prepareGameContent } = require('./navigation');
const { expect } = require('../fixture');
const path = require('path');

const examples={estuary:require('../../fixtures/authoring/opening-infrastructure-estuary.json'),
  uplands:require('../../fixtures/authoring/opening-infrastructure-uplands.json')};
const fixtureDirectory = path.resolve(__dirname, '../../fixtures/authoring');

async function importWorld(page, info, name, revision) {
  await openGame(page, info);
  await expectModAdmission(page,examples[name]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(fixtureDirectory,
    'opening-infrastructure-' + name + '.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function (name) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks['inventory_' + name];
  }, name);
  await page.evaluate(function (input) {
    if (input.revision) FBDATA.bookmarks['inventory_' + input.name].revision = input.revision;
    window.__inventoryBoot = { applies:[], projections:[] };
    const initialize = FB.initializeOpeningInfrastructure;
    FB.initializeOpeningInfrastructure = function (s) {
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const result = initialize(s);
      const after = JSON.parse(JSON.stringify(s));
      delete after.openingInfrastructureState;
      after.buildings = JSON.parse(before).buildings;
      window.__inventoryBoot.applies.push({ applied:result,
        onlyLedger:JSON.stringify(after) === before,
        rng:rng === FB.getRngState(), uid:uid === FB.getUidCounter(),
        adopted:!!s.realms.player, owner:s.holder.inventory_quay,
        records:Object.values(s.buildings).reduce(function (n, rows) { return n + rows.length; }, 0) });
      return result;
    };
    ['ensurePopulationState', 'ensureMarket', 'treasuryInitialize'].forEach(function (key) {
      const original = FB[key];
      FB[key] = function (s, options) {
        if (!window.__inventoryBoot.projections.some(function (row) { return row.key === key; })) {
          window.__inventoryBoot.projections.push({ key:key, marker:!!s.openingInfrastructureState,
            records:Object.values(s.buildings).reduce(function (n, rows) { return n + rows.length; }, 0) });
        }
        return original(s, options);
      };
    });
  }, { name:name, revision:revision });
}

async function startRuler(page) {
  await page.evaluate(function () { FB.startProgression.noteTier(7); });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('[data-bookmark="inventory_estuary"]').click();
  await page.locator('[data-scenario="inventory_estuary_ruler"]').click();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

// Keep this imported page alive so the boot observations precede the real start.
// The shared beginBookmark journey intentionally reloads the page.
async function startHousehold(page, name) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', { name:'New Game', exact:true }).click();
  await page.locator('#btn-bm-seed').click();
  const home = name === 'estuary' ? 'inventory_quay' : 'inventory_vale';
  await page.locator('#ng-seed').fill('INVENTORY-inventory_' + name + '-inventory_' + name + '_household-' + home + '-m-Review-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', { name:'Begin Your Story', exact:true }).click();
  await page.getByRole('button', { name:'Begin', exact:true }).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
}

async function startObserver(page, name) {
  await page.evaluate(function (id) {
    return new Promise(function (resolve, reject) {
      FB.activateBookmark(id, null, function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = { seed:'INVENTORY-OBSERVER', bookmarkId:id };
        if (FB.game.startObserve() === false) { reject(new Error('Observer start rejected.')); return; }
        FB.game.setPaused(true); resolve();
      });
    });
  }, 'inventory_' + name);
}

module.exports = { importWorld, startRuler, startHousehold, startObserver };
