'use strict';
const {expectModAdmission}=require('../support/game/mod-admission');
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['index.html','data/eras.js','data/economy.js','data/starts.js',
  'js/mods.js','js/world.js','js/starts.js','js/stories.js','js/bookmark_setup.js',
  'js/station.js','js/governments.js','js/government_selection.js','js/mobile_confederations.js','js/main.js']);

const fixtures=[
  {file:'harbor-contracts.json',mod:require('../fixtures/authoring/harbor-contracts.json')},
  {file:'dune-contracts.json',mod:require('../fixtures/authoring/dune-contracts.json')},
  {file:'regional-milling-river.json',mod:require('../fixtures/authoring/regional-milling-river.json')},
  {file:'regional-milling-catchment.json',mod:require('../fixtures/authoring/regional-milling-catchment.json')},
  {file:'local-following-reviews-harbor.json',mod:require('../fixtures/authoring/local-following-reviews-harbor.json')},
  {file:'local-following-reviews-dune.json',mod:require('../fixtures/authoring/local-following-reviews-dune.json')},
  {file:'mobile-vow-harbor.json',mod:require('../fixtures/authoring/mobile-vow-harbor.json')},
  {file:'mobile-vow-upland.json',mod:require('../fixtures/authoring/mobile-vow-upland.json')},
  {file:'calendar-households.json',mod:require('../fixtures/authoring/calendar-households.json')},
  {file:'local-formation-harbor.json',mod:require('../fixtures/authoring/local-formation-harbor.json')},
  {file:'local-formation-upland.json',mod:require('../fixtures/authoring/local-formation-upland.json')},
  {file:'mobile-preparation-harbor.json',mod:require('../fixtures/authoring/mobile-preparation-harbor.json')},
  {file:'mobile-preparation-upland.json',mod:require('../fixtures/authoring/mobile-preparation-upland.json')},
  {file:'local-threat-river.json',mod:require('../fixtures/authoring/local-threat-river.json')},
  {file:'local-threat-hill.json',mod:require('../fixtures/authoring/local-threat-hill.json')},
  {file:'masonry-circuit-river.json',mod:require('../fixtures/authoring/masonry-circuit-river.json')},
  {file:'masonry-circuit-upland.json',mod:require('../fixtures/authoring/masonry-circuit-upland.json')},
  {file:'mobile-column-supply-harbor.json',mod:require('../fixtures/authoring/mobile-column-supply-harbor.json')},
  {file:'mobile-column-supply-dune.json',mod:require('../fixtures/authoring/mobile-column-supply-dune.json')},
  {file:'mobile-opening-campaigns-harbor.json',mod:require('../fixtures/authoring/mobile-opening-campaigns-harbor.json')},
  {file:'mobile-opening-campaigns-dune.json',mod:require('../fixtures/authoring/mobile-opening-campaigns-dune.json')},
  {file:'mobile-opening-reserves-harbor.json',mod:require('../fixtures/authoring/mobile-opening-reserves-harbor.json')},
  {file:'mobile-opening-reserves-dune.json',mod:require('../fixtures/authoring/mobile-opening-reserves-dune.json')},
  {file:'expedition-terms-harbor.json',mod:require('../fixtures/authoring/expedition-terms-harbor.json')},
  {file:'expedition-terms-upland.json',mod:require('../fixtures/authoring/expedition-terms-upland.json')},
  {file:'mobile-expedition-harbor.json',mod:require('../fixtures/authoring/mobile-expedition-harbor.json')},
  {file:'mobile-expedition-dune.json',mod:require('../fixtures/authoring/mobile-expedition-dune.json')}
];

for(const fixture of fixtures){
  test(fixture.file+' admits its declared starts without changing the catalogue or input',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),input=JSON.stringify(mod),
        rng=FB.getRngState(),uid=FB.getUidCounter(),faults=FB.mods.validate(mod);
      return {faults:faults,inputPure:input===JSON.stringify(mod),
        livePure:before===JSON.stringify([FBDATA,FB.state]),
        rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result.faults,fixture.file).toEqual([]);
    expect(result).toMatchObject({inputPure:true,livePure:true,rng:true,uid:true});
  });
}

for(const prefix of ['harbor','dune']){
  test(prefix+' home ruler rejects missing sex and mismatched rank without changing either input',async function({page},info){
    await openGame(page,info);
    const fixture=fixtures.find(function(f){return f.file==='local-following-reviews-'+prefix+'.json';});
    const result=await page.evaluate(function(mod){
      const before=JSON.stringify([FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      function rejected(change){
        const bad=JSON.parse(JSON.stringify(mod)),start=bad.startScenarios.find(function(row){return !!row.rulerRealmId;});
        change(bad,start);
        const input=JSON.stringify(bad),faults=FB.mods.validate(bad);
        return {rejected:faults.some(function(fault){return fault.indexOf('rulerRealmId')>=0;}),inputPure:input===JSON.stringify(bad)};
      }
      const sex=rejected(function(bad,start){
        const bookmark=bad.bookmarks[start.bookmarkIds[0]];
        delete bookmark.realms.find(function(row){return row.id===start.rulerRealmId;}).ruler.sex;
      });
      const rank=rejected(function(bad,start){start.tier=4;});
      return {sex:sex,rank:rank,pure:before===JSON.stringify([FBDATA,FB.state]),
        rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
    },fixture.mod);
    expect(result).toEqual({sex:{rejected:true,inputPure:true},rank:{rejected:true,inputPure:true},pure:true,rng:true,uid:true});
  });

  test(prefix+' file import adopts the same female home ruler and public rank',async function({page},info){
    const fixture=fixtures.find(function(f){return f.file==='local-following-reviews-'+prefix+'.json';}),
      start=fixture.mod.startScenarios.find(function(row){return !!row.rulerRealmId;});
    await openGame(page,info);
    await expectModAdmission(page,fixture.mod);
    await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+fixture.file));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('IMPORTCHECK-'+start.bookmarkIds[0]+'-'+start.id+'-'+start.fixedProvinceId+'-'+start.sex+'-'+start.characterName.replace(/ /g,'_')+'-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    const identity=await page.evaluate(function(){
      FB.game.setPaused(true);const s=FB.state;
      return {scenario:s.start.scenarioId,county:s.player.provinceId,name:s.chars[s.player.charId].name,
        sex:s.chars[s.player.charId].sex,tier:s.player.tier,rank:s.realms.player.rank,original:s.start.rulerRealmId};
    });
    expect(identity).toEqual({scenario:start.id,county:start.fixedProvinceId,name:start.characterName,
      sex:'f',tier:5,rank:2,original:start.rulerRealmId});
  });
}

const invalidControls=[
  {file:'regional-milling-river.json',kind:'sex'},
  {file:'regional-milling-catchment.json',kind:'sex'},
  {file:'masonry-circuit-river.json',kind:'sex'},
  {file:'masonry-circuit-upland.json',kind:'sex'},
  {file:'mobile-column-supply-harbor.json',kind:'unit'},
  {file:'mobile-column-supply-dune.json',kind:'unit'},
  {file:'mobile-opening-reserves-harbor.json',kind:'unit'},
  {file:'mobile-opening-reserves-dune.json',kind:'unit'},
  {file:'calendar-households.json',kind:'identity'},
  {file:'harbor-contracts.json',kind:'story'},
  {file:'local-threat-hill.json',kind:'date'}
];
for(const control of invalidControls){
  test(control.file+' rejects the unsupported '+control.kind+' declaration without mutation',async function({page},info){
    await openGame(page,info);
    const fixture=fixtures.find(function(f){return f.file===control.file;});
    const result=await page.evaluate(function(input){
      const mod=input.mod,bad=JSON.parse(JSON.stringify(mod));
      if(input.kind==='sex')delete Object.values(bad.bookmarks)[0].realms[0].ruler.sex;
      else if(input.kind==='unit')Object.values(bad.mobileProfiles)[0].supplyPolicy.replacement.unitIds[0]='inf';
      else if(input.kind==='identity')delete bad.startScenarios[0].startCulture;
      else if(input.kind==='story'){
        const start=bad.startScenarios.find(function(row){return row.id==='harbor_civic_household';});
        start.fixedProvinceId=start.birthplaces.counties[0];delete start.birthplaces;
      }
      else {
        bad.storyInstances.hill_incident.firstDate={year:900,season:0,day:1};
        bad.storyInstances.hill_incident.lastDate={year:900,season:0,day:8};
      }
      const before=JSON.stringify([mod,bad,FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter(),
        faults=FB.mods.validate(bad);
      return {faults:faults,pure:before===JSON.stringify([mod,bad,FBDATA,FB.state]),
        rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
    },{mod:fixture.mod,kind:control.kind});
    const messages={sex:/rulerRealmId|ruler profile/,unit:/Invalid mobile profile/,
      identity:/fixedProvinceId/,story:/fixed-place household/,date:/cannot apply/};
    expect(result.faults.join(' ')).toMatch(messages[control.kind]);
    expect(result).toMatchObject({pure:true,rng:true,uid:true});
  });
}
