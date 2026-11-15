'use strict';
const {expect} = require('../fixture');
const {openGame,prepareGameContent} = require('./navigation');
const {expectModAdmission} = require('./mod-admission');

async function installRuler1096Dates(page) {
  await page.evaluate(function () {
    // Stage a boundary without dispatching days or changing its original epoch.
    window.stageRulerDate = function (s, date) {
      s.turn += FB.dateOrdinal(date) - FB.dateOrdinal(s.date);
      s.date = {year:date.year,season:date.season,day:date.day};
    };
  });
}

async function importRuler1096WithoutTracks(page, scenarioId) {
  const candidate = await page.evaluate(function (id) {
    const sc=JSON.parse(JSON.stringify(FBDATA.startScenarios.find(function (s) {return s.id===id;})));
    sc.tracks=[];
    delete sc.trackLocations;
    return {name:'Ruler without personal reviews',startScenarios:[sc]};
  },scenarioId);
  await expectModAdmission(page,candidate);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'ruler-without-reviews.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(candidate))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}

// These authored rulers keep their court identity even where the local
// principal community differs. Use the canonical code, including that suffix.
async function beginRuler1096(page, info, scenarioId, options) {
  await openGame(page, info);
  if (options && options.withoutTracks) await importRuler1096WithoutTracks(page,scenarioId);
  const code = await page.evaluate(function (id) {
    const b = FB.bookmark('1096');
    const source = FBDATA.startScenarios.find(function (s) { return s.id === id; });
    const sc = FB.startIdentity(source, b);
    if (!sc || !sc.rulerRealmId) throw new Error('Missing 1096 ruler ' + id);
    const p = b.provinces.find(function (p) { return FB.startProvinceAllowed(sc, b, p.id); });
    if (!p) throw new Error('Missing ruler birthplace ' + id);
    FBDATA.bookmarks['1096'].hidden = false;
    FB.startProgression.noteTier(3);
    const base = 'PARITY-1096-' + sc.id + '-' + p.id + '-' + sc.sex + '-' +
      sc.characterName.replace(/-/g, '').replace(/\s+/g, '_');
    return sc.startCulture !== p.culture || sc.startReligion !== p.religion
      ? base + '-standard-0-' + sc.startCulture + '.' + sc.startReligion : base;
  }, scenarioId);
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button', {name:'New Game', exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button', {name:'Begin Your Story', exact:true}).click();
  await expect(page.getByRole('button', {name:'Begin', exact:true})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#genmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    FB.game.uiPrefs.hideBeginnerHints = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
    return {seed:FB.state.seed, scenario:FB.state.start.scenarioId};
  })).toEqual({seed:code, scenario:scenarioId});
  await installRuler1096Dates(page);
}

module.exports = {beginRuler1096,installRuler1096Dates,importRuler1096WithoutTracks};
