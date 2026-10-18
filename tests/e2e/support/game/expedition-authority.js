'use strict';
const path=require('path');
const {expect}=require('../fixture');
const {openGame}=require('./navigation');
const {beginBookmark}=require('./bookmark-acceptance');
const examples={harbor:require('../../fixtures/authoring/expedition-authority-harbor.json'),
  dune:require('../../fixtures/authoring/expedition-authority-dune.json')};
async function startAuthority(page,info,prefix,home) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../../fixtures/authoring/expedition-authority-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  if (!home) return beginBookmark(page,info,prefix+'_world',prefix+'_household');
  const sc=examples[prefix].startScenarios.find(function (sc) {return sc.id===prefix+'_home_start';});
  const code='HOMEAUTHORITY-'+prefix+'_world-'+sc.id+'-'+sc.fixedProvinceId+'-'+sc.sex+'-'+sc.characterName.replace(/ /g,'_')+'-standard';
  const full=page.locator('#btn-choose-beginning');
  if(await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}
module.exports={startAuthority,examples};
