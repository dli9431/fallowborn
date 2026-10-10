'use strict';
const { expect } = require('../fixture');
const { openGame } = require('./navigation');
const { startHistoricalGame } = require('./historical-start');

async function startRegion(page, testInfo, county, crazygames) {
  return startHistoricalGame(page,testInfo,{bookmark:'476',
    code:'WIDER476-476-farmer_476-' + county + '-m-Review-established'},!!crazygames);
}

// Build a legacy fixture from the retained declaration, never by deleting
// the marker on an expanded world and pretending it is an older campaign.
async function startBaseline476(page, testInfo, code) {
  await openGame(page,testInfo);
  await page.evaluate(function () {
    FBDATA.bookmarks['476'].revision = 'baseline';
    FB.startProgression.noteTier(3);
  });
  await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code || 'BASE476-476-farmer_476-ravenna-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FBDATA.bookmarks['476'].revision = 'wider_v2';
  });
}

async function saveBudget(page,testInfo,label,ceiling) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(source,'utf8');
  await testInfo.attach(label + '.json',{contentType:'application/json',
    body:Buffer.from(JSON.stringify({bytes:bytes,ceiling:ceiling}))});
  expect(bytes,label).toBeLessThanOrEqual(ceiling);
  return source;
}
module.exports = {startRegion,startBaseline476,saveBudget};
