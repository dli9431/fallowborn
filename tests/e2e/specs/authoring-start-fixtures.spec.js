'use strict';
const {test,expect}=require('../support/fixture');
const path=require('path');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/eras.js','js/station.js','js/starts.js',
  'js/governments.js','js/mods.js','js/world.js','js/bookmark_setup.js','js/main.js','js/ui_misc.js','js/ui_modals.js']);

const fixtures=[
  {file:'adopted-public-treasury-dune.json',mod:require('../fixtures/authoring/adopted-public-treasury-dune.json')},
  {file:'adopted-public-treasury-harbor.json',mod:require('../fixtures/authoring/adopted-public-treasury-harbor.json')},
  {file:'dated-home-authority-dune.json',mod:require('../fixtures/authoring/dated-home-authority-dune.json')},
  {file:'dated-home-authority-harbor.json',mod:require('../fixtures/authoring/dated-home-authority-harbor.json')},
  {file:'expedition-authority-dune.json',mod:require('../fixtures/authoring/expedition-authority-dune.json')},
  {file:'expedition-authority-harbor.json',mod:require('../fixtures/authoring/expedition-authority-harbor.json')},
  {file:'expedition-objective-harbor.json',mod:require('../fixtures/authoring/expedition-objective-harbor.json')},
  {file:'sovereign-preparation-dune.json',mod:require('../fixtures/authoring/sovereign-preparation-dune.json')},
  {file:'sovereign-preparation-harbor.json',mod:require('../fixtures/authoring/sovereign-preparation-harbor.json')},
  {file:'subordinate-formation-dune.json',mod:require('../fixtures/authoring/subordinate-formation-dune.json')}
];
for(const fixture of fixtures){
  test(fixture.file+' admits its authored ruler and rejects a mismatched station',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const faults=FB.mods.validate(mod),bad=JSON.parse(JSON.stringify(mod));
      const start=bad.startScenarios.find(function(s){return !!s.rulerRealmId;});
      start.tier=start.tier===5?4:5;
      return {faults:faults,rejected:FB.mods.validate(bad).some(function(e){return e.indexOf('rulerRealmId')>=0;}),
        pure:before===JSON.stringify([FBDATA,FB.state])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);expect(result.rejected).toBe(true);expect(result.pure).toBe(true);
  });
}

test('the feudal formation example admits its ordinary household without a civic office',async function({page},info){
  await openGame(page,info);
  const mod=require('../fixtures/authoring/subordinate-formation-harbor.json');
  expect(await page.evaluate(function(mod){return FB.mods.validate(mod);},mod)).toEqual([]);
});

for(const prefix of ['harbor','dune']){
  test(prefix+' ruler file import adopts the original female court at its authored rank',async function({page},info){
    const fixture=fixtures.find(function(f){return f.file==='adopted-public-treasury-'+prefix+'.json';});
    const scenario=fixture.mod.startScenarios.find(function(s){return !!s.rulerRealmId;});
    await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+fixture.file));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('ADMISSION-'+prefix+'_world-'+scenario.id+'-'+scenario.fixedProvinceId+'-'+scenario.sex+'-'+scenario.characterName.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function(){
      FB.game.setPaused(true);const s=FB.state;
      return {scenario:s.start.scenarioId,tier:s.player.tier,rank:s.realms.player.rank,sex:s.chars[s.player.charId].sex};
    })).toEqual({scenario:scenario.id,tier:5,rank:2,sex:'f'});
  });
}
