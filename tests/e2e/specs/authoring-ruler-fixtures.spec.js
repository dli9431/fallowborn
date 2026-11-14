'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});

dependsOnRuntime(__filename, ['index.html','data/map_data.js','data/cultures.js','data/economy.js','data/eras.js',
  'js/mods.js','js/world.js','js/starts.js','js/governments.js','js/main.js','js/bookmark_setup.js',
  'data/production.js','js/production.js','js/production_economy.js','js/site_resources.js']);

const fixtures = [
  {file:'baths-headworks-river.json',mod:require('../fixtures/authoring/baths-headworks-river.json')},
  {file:'boathouse-work-river.json',mod:require('../fixtures/authoring/boathouse-work-river.json')},
  {file:'boathouse-work-shore.json',mod:require('../fixtures/authoring/boathouse-work-shore.json')},
  {file:'building-institutions-house.json',mod:require('../fixtures/authoring/building-institutions-house.json')},
  {file:'building-institutions-see.json',mod:require('../fixtures/authoring/building-institutions-see.json')},
  {file:'building-profile-inheritance-hill.json',mod:require('../fixtures/authoring/building-profile-inheritance-hill.json')},
  {file:'building-profile-inheritance-river.json',mod:require('../fixtures/authoring/building-profile-inheritance-river.json')},
  {file:'building-seasons-dry.json',mod:require('../fixtures/authoring/building-seasons-dry.json')},
  {file:'building-seasons-pasture.json',mod:require('../fixtures/authoring/building-seasons-pasture.json')},
  {file:'early-industry-metal.json',mod:require('../fixtures/authoring/early-industry-metal.json')},
  {file:'early-industry-paper.json',mod:require('../fixtures/authoring/early-industry-paper.json')},
  {file:'early-worship-river.json',mod:require('../fixtures/authoring/early-worship-river.json')},
  {file:'early-worship-upland.json',mod:require('../fixtures/authoring/early-worship-upland.json')},
  {file:'engineered-waterworks-supplied.json',mod:require('../fixtures/authoring/engineered-waterworks-supplied.json')},
  {file:'expanded-catalogue-river.json',mod:require('../fixtures/authoring/expanded-catalogue-river.json')},
  {file:'fish-drying-cool.json',mod:require('../fixtures/authoring/fish-drying-cool.json')},
  {file:'fish-drying-wet.json',mod:require('../fixtures/authoring/fish-drying-wet.json')},
  {file:'fort-profiles-masonry.json',mod:require('../fixtures/authoring/fort-profiles-masonry.json')},
  {file:'fort-profiles-timber.json',mod:require('../fixtures/authoring/fort-profiles-timber.json')},
  {file:'maritime-work-river.json',mod:require('../fixtures/authoring/maritime-work-river.json')},
  {file:'maritime-work-shore.json',mod:require('../fixtures/authoring/maritime-work-shore.json')},
  {file:'opening-infrastructure-estuary.json',mod:require('../fixtures/authoring/opening-infrastructure-estuary.json')},
  {file:'opening-infrastructure-uplands.json',mod:require('../fixtures/authoring/opening-infrastructure-uplands.json')},
  {file:'production-construction.json',mod:require('../fixtures/authoring/production-construction.json')},
  {file:'production-fiber.json',mod:require('../fixtures/authoring/production-fiber.json')},
  {file:'production-iron.json',mod:require('../fixtures/authoring/production-iron.json')},
  {file:'production-suppliers-harbor.json',mod:require('../fixtures/authoring/production-suppliers-harbor.json')},
  {file:'production-suppliers-inland.json',mod:require('../fixtures/authoring/production-suppliers-inland.json')},
  {file:'relay-services-coast.json',mod:require('../fixtures/authoring/relay-services-coast.json')},
  {file:'relay-services-road.json',mod:require('../fixtures/authoring/relay-services-road.json')},
  {file:'siege-support-heavy.json',mod:require('../fixtures/authoring/siege-support-heavy.json')},
  {file:'siege-support-light.json',mod:require('../fixtures/authoring/siege-support-light.json')},
  {file:'site-resources-river.json',mod:require('../fixtures/authoring/site-resources-river.json')},
  {file:'site-resources-upland.json',mod:require('../fixtures/authoring/site-resources-upland.json')},
  {file:'technology-buildings-composition.json',mod:require('../fixtures/authoring/technology-buildings-composition.json')},
  {file:'water-operation-inputs-river.json',mod:require('../fixtures/authoring/water-operation-inputs-river.json')},
  {file:'water-operations-catchment.json',mod:require('../fixtures/authoring/water-operations-catchment.json')},
  {file:'water-operations-river.json',mod:require('../fixtures/authoring/water-operations-river.json')}
];

for (const fixture of fixtures) {
  test(fixture.file + ' passes detached ordinary JSON validation', async function ({page},info) {
    await openGame(page,info);
    const faults = await page.evaluate(function (mod) { return FB.mods.validate(mod); },fixture.mod);
    expect(faults,fixture.file).toEqual([]);
  });
}

const importedRulers = [
  {file:'maritime-work-shore.json',bookmark:'maritime_shore',scenario:'maritime_shore_ruler',sex:'m'},
  {file:'maritime-work-river.json',bookmark:'maritime_river',scenario:'maritime_river_ruler',sex:'m'},
  {file:'production-suppliers-inland.json',bookmark:'production_suppliers_inland',
    scenario:'production_suppliers_inland_ruler',sex:'m'},
  {file:'fish-drying-wet.json',bookmark:'fish_wet',scenario:'fish_wet_ruler',sex:'f'}
];
for (const selection of importedRulers) {
  test(selection.file + ' imports the declared ruler and rejects an omitted sex', async function ({page},info) {
    const fixture = fixtures.find(function (entry) { return entry.file === selection.file; });
    await openGame(page,info);
    const rejected = await page.evaluate(function (mod) {
      const bookmark = mod.bookmarks[Object.keys(mod.bookmarks)[0]];
      delete bookmark.realms[0].ruler.sex;
      return FB.mods.validate(mod);
    },fixture.mod);
    expect(rejected.join(' ')).toMatch(/rulerRealmId|ruler profile/);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring',selection.file));
    await Promise.all([
      page.waitForNavigation({waitUntil:'domcontentloaded'}),
      page.locator('#mod-apply').click()
    ]);
    await prepareGameContent(page);
    const identity = await page.evaluate(function (selection) {
      const bookmark = FBDATA.bookmarks[selection.bookmark];
      const scenario = FBDATA.startScenarios.find(function (row) { return row.id === selection.scenario; });
      const realm = bookmark.realms.find(function (row) { return row.id === scenario.rulerRealmId; });
      const ruler = FB.startRulerProfile(bookmark,realm,scenario.governmentForm);
      const production = FB.production.compile(bookmark);
      return {name:ruler.name,scenarioName:scenario.characterName,sex:ruler.sex,scenarioSex:scenario.sex,
        productionErrors:production.errors,productionSites:production.sites.map(function (site) { return site.id; })};
    },selection);
    expect(identity.name).toBe(identity.scenarioName);
    expect(identity.sex).toBe(selection.sex);
    expect(identity.scenarioSex).toBe(selection.sex);
    expect(identity.productionErrors).toEqual([]);
    expect(identity.productionSites.length).toBeGreaterThan(0);
  });
}
