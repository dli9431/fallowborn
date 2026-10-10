'use strict';
const fs = require('fs');
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {releasedCatalogue} = require('../support/released-catalogue');

// Intentional catalogue canary: any data declaration can alter inherited data.
dependsOnRuntime(__filename, ['data/', 'js/model.js', 'js/world.js', 'js/mods.js']);
const fixturePath = path.join(__dirname, '../fixtures/released-catalogue.json');
const selection = {
  bookmarks:['867','1066'], geographies:['europe_regional'], eras:['early_medieval','high_medieval'],
  governments:['territorial'],
  faiths:['christian','catholic','orthodox','eastern','muslim','sunni','ashari','maturidi',
    'shia','pagan','norse_pagan','slavic_pagan','baltic_pagan','tengri','zoroastrian','jewish']
};

test('capture initial released catalogue fixture', async function ({page}, testInfo) {
  test.skip(process.env.FB_CAPTURE_RELEASED_CATALOGUE !== '1', 'Explicit owner capture only.');
  const output = process.env.FB_RELEASED_CAPTURE_PATH || fixturePath;
  if (fs.existsSync(output)) throw new Error('Never overwrite a released catalogue fixture. Review compatibility first.');
  await openGame(page, testInfo);
  const snapshot = await page.evaluate(releasedCatalogue, selection);
  fs.writeFileSync(output, JSON.stringify(Object.assign({schema:1, algorithm:'sha256-canonical-json',
    baselineCommit:'17aa60d5', selection:selection}, snapshot), null, 2) + '\n');
});

test('released worlds, geography, faiths, defaults and forms retain their resolved definitions',
  async function ({page}, testInfo) {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    await openGame(page, testInfo);
    expect(await page.evaluate(releasedCatalogue, fixture.selection)).toEqual({
      hashes:fixture.hashes, legacyFaiths:fixture.legacyFaiths
    });
  });

test('ratchet detects inherited and baseline edits but permits additive catalogues', async function ({page}, testInfo) {
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  await openGame(page, testInfo);
  await page.evaluate(function () {
    FBDATA.religions.e2e_added = {name:'New tradition', parent:'christian'};
    FB.invalidateReligionData();
  });
  expect((await page.evaluate(releasedCatalogue, fixture.selection)).hashes).toEqual(fixture.hashes);
  await page.evaluate(function () {
    FBDATA.religions.christian.properties.clergyMarriage = true;
    FBDATA.faithDefaults.legalTradition = 'customary';
    FBDATA.governmentForms.territorial.transformationOptions = ['e2e_changed'];
    FB.bookmark('867', 'baseline').provinces[0].name = 'Changed baseline';
    FB.geography('europe_regional').provinces[0].x += 0.5;
    FB.invalidateReligionData();
  });
  const changed = (await page.evaluate(releasedCatalogue, fixture.selection)).hashes;
  for (const key of ['faith/catholic','faithDefaults','government/territorial','bookmark/867/baseline','geography/europe_regional']) {
    expect(changed[key], key).not.toBe(fixture.hashes[key]);
  }
});
