'use strict';
const {test,expect}=require('../support/fixture');
const path=require('path');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/economy.js','data/units.js','js/mods.js','js/starts.js',
  'js/world.js','js/bookmark_setup.js','js/stories.js','js/story_government_selection.js','js/story_household.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/expedition_programs.js','js/story_expedition_program.js','js/main.js','js/ui_misc.js','js/ui_modals.js']);

const fixtures=[
  {file:'dispersed-camps-dune.json',kind:'career',mod:require('../fixtures/authoring/dispersed-camps-dune.json')},
  {file:'dispersed-camps-harbor.json',kind:'career',mod:require('../fixtures/authoring/dispersed-camps-harbor.json')},
  {file:'guarded-principal-harbor.json',kind:'career',mod:require('../fixtures/authoring/guarded-principal-harbor.json')},
  {file:'guarded-principal-dune.json',kind:'career',mod:require('../fixtures/authoring/guarded-principal-dune.json')},
  {file:'expedition-dispatch-dune.json',kind:'unit',mod:require('../fixtures/authoring/expedition-dispatch-dune.json')},
  {file:'expedition-dispatch-harbor.json',kind:'unit',mod:require('../fixtures/authoring/expedition-dispatch-harbor.json')},
  {file:'seasonal-pasture-faroes.json',kind:'revision',mod:require('../fixtures/authoring/seasonal-pasture-faroes.json')},
  {file:'seasonal-pasture-upland.json',kind:'revision',mod:require('../fixtures/authoring/seasonal-pasture-upland.json')}
];

for(const fixture of fixtures){
  test(fixture.file+' admits its authored roles and rejects an invalid prerequisite purely',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(input){
      const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),
        faults=FB.mods.validate(input.mod),bad=JSON.parse(JSON.stringify(input.mod));
      if(input.kind==='career')bad.startScenarios.find(function(s){return s.sex==='f';}).profession='soldier';
      else if(input.kind==='unit')Object.values(bad.mobileProfiles)[0].supplyPolicy.replacement.unitIds[0]='missing_replacement';
      else delete Object.values(bad.bookmarks)[0].revisions.baseline;
      const rejected=FB.mods.validate(bad).length>0;
      return {faults:faults,rejected:rejected,pure:before===JSON.stringify([FB.state,FBDATA]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter()};
    },fixture);
    expect(result.faults,fixture.file).toEqual([]);expect(result.rejected).toBe(true);expect(result.pure).toBe(true);
  });
}

for(const prefix of ['harbor','dune']){
  test(prefix+' file import preserves its original female guarded person and private profession',async function({page},info){
    const fixture=fixtures.find(function(f){return f.file==='guarded-principal-'+prefix+'.json';}),scenario=fixture.mod.startScenarios[0];
    await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+fixture.file));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('GUARDFIX-'+prefix+'_world-'+scenario.id+'-'+scenario.fixedProvinceId+'-'+scenario.sex+'-'+scenario.characterName.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();await page.getByRole('button',{name:'Begin',exact:true}).click();
    const result=await page.evaluate(function(){
      FB.game.setPaused(true);const s=FB.state,b=s.start.originalPrincipal,r=FB.mobile.row(s,b.realmId);
      return {scenario:s.start.scenarioId,sex:s.chars[s.player.charId].sex,profession:s.player.profession,
        same:s.player.charId===FB.bookmarkActor(s,b.actorId).id && s.player.charId===r.leaderId,
        guarded:r.guardedParty.status==='guarded',noCommand:!FB.mobile.commandValid(s,b.realmId)};
    });
    expect(result).toEqual({scenario:scenario.id,sex:'f',profession:scenario.profession,same:true,guarded:true,noCommand:true});
  });
}
