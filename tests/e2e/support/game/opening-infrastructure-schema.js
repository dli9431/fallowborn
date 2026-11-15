'use strict';
const { expectModAdmission } = require('./mod-admission');
const { openGame, prepareGameContent } = require('./navigation');
const { beginBookmarkFromTitle } = require('./bookmark-acceptance');
const { expect } = require('../fixture');
const path = require('path');
const fs = require('fs');

const fixtureDirectory = path.resolve(__dirname, '../../fixtures/authoring');
const examples = {};
for (const name of ['estuary', 'uplands']) {
  examples[name] = JSON.parse(fs.readFileSync(path.join(fixtureDirectory,
    'opening-infrastructure-' + name + '.json'), 'utf8'));
}

async function importExample(page, info, name) {
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
  await beginBookmarkFromTitle(page, 'inventory_' + name, 'inventory_' + name + '_household');
}

// Each fault traverses both built-in validation and ordinary detached import.
// No game module is imported into Node and no executable strategy is registered.
async function checkFaults(page, example, changes) {
  const rows = await page.evaluate(function (input) {
    const bm = FBDATA.bookmarks.inventory_estuary;
    const before = { data:JSON.stringify(FBDATA), state:JSON.stringify(FB.state),
      world:FB.world, active:FB.activeBookmark, rng:FB.getRngState(), uid:FB.getUidCounter(),
      signature:FB.mods.sig(), storage:JSON.stringify(localStorage) };
    const rows = input.changes.map(function (change) {
      const mod = JSON.parse(JSON.stringify(input.example));
      const candidate = mod.bookmarks.inventory_estuary;
      const policy = candidate.revisions.inherited.openingInfrastructure;
      if (change.policy !== undefined) candidate.revisions.inherited.openingInfrastructure = change.policy;
      if (change.placement !== undefined) policy.placements = [change.placement];
      if (change.append) policy.placements.push(change.append);
      if (change.placements) policy.placements = change.placements;
      if (change.tooMany) policy.placements = Array(2049).fill(policy.placements[0]);
      const builtIn = FB.validateBookmark(candidate).join('; ');
      const imported = FB.mods.validate(mod).join('; ');
      const compiled = FB.compileOpeningInfrastructure(candidate);
      return { builtIn:builtIn, imported:imported, compiled:compiled };
    });
    return { rows:rows, pure:before.data === JSON.stringify(FBDATA) &&
      before.state === JSON.stringify(FB.state) && before.world === FB.world &&
      before.active === FB.activeBookmark && bm === FBDATA.bookmarks.inventory_estuary &&
      before.rng === FB.getRngState() && before.uid === FB.getUidCounter() &&
      before.signature === FB.mods.sig() && before.storage === JSON.stringify(localStorage) };
  }, { example:example, changes:changes });
  expect(rows.pure).toBe(true);
  for (const row of rows.rows) {
    expect(row.builtIn).toContain('openingInfrastructure');
    expect(row.imported).toContain('openingInfrastructure');
    expect(row.compiled.errors.length).toBeGreaterThan(0);
    expect(row.compiled.placements).toEqual([]);
  }
  return rows.rows;
}

module.exports = { examples, importExample, checkFaults };
