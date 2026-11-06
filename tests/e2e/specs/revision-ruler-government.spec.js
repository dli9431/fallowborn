'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {useReleasedStartRules}=require('../support/game/released-starts');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={estuary:require('../fixtures/authoring/revision-ruler-government-estuary.json'),
  uplands:require('../fixtures/authoring/revision-ruler-government-uplands.json')};

dependsOnRuntime(__filename,['index.html','data/political_institutions.js','data/starts.js',
  'js/starts.js','js/mods.js','js/world.js','js/main.js','js/save.js','js/save_v4.js',
  'js/bookmark_setup.js','js/governments.js','js/model.js','js/treasury.js']);

async function importCourt(page,info,label,revision) {
  await useReleasedStartRules(page);
  await openGame(page,info);
  expect(await page.evaluate(function(input){return FB.mods.validate(input);},examples[label])).toEqual([]);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/revision-ruler-government-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.evaluate(function(input){
    FBDATA.bookmarks[input.id].revision=input.revision;
    FB.startProgression.noteTier(6);
  },{id:Object.keys(examples[label].bookmarks)[0],revision:revision});
}

for(const label of ['estuary','uplands']) {
  const input=examples[label],id=Object.keys(input.bookmarks)[0],start=input.startScenarios[0];
  test(label+' validates both constitutional revisions and rejects malformed or mismatched projections purely',async function({page},info){
    await openGame(page,info);
    const result=await page.evaluate(function(input){
      const id=Object.keys(input.bookmarks)[0],
        before=JSON.stringify([FBDATA,FB.state,localStorage]),rng=FB.getRngState(),uid=FB.getUidCounter(),
        valid=FB.mods.validate(input);
      const faults=['unknown form','wrong form','foreign revision','empty record','extra field','ordinary start','hidden mismatch','null record'].map(function(kind){
        const mod=JSON.parse(JSON.stringify(input)),start=mod.startScenarios[0],rows=start.revisionIdentities[id];
        if(kind==='unknown form')rows.constitution.governmentForm='absent_form';
        if(kind==='wrong form')rows.constitution.governmentForm=start.governmentForm;
        if(kind==='foreign revision')rows.absent={governmentForm:'regnum'};
        if(kind==='empty record')rows.constitution={};
        if(kind==='extra field')rows.constitution.rulerRealmId='replacement';
        if(kind==='ordinary start')delete start.rulerRealmId;
        if(kind==='hidden mismatch'){start.hidden=true;rows.constitution.governmentForm=start.governmentForm;}
        if(kind==='null record')rows.constitution=null;
        return FB.mods.validate(mod).length>0;
      });
      return {valid:valid,rejected:faults,pure:before===JSON.stringify([FBDATA,FB.state,localStorage])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
    },input);
    expect(result).toEqual({valid:[],rejected:Array(8).fill(true),pure:true});
  });

  for(const revision of ['baseline','constitution']) for(const route of ['picker','code']) {
    test(label+' '+revision+' '+route+' adopts its exact constitution and restores without accession replay',async function({page},info){
      await importCourt(page,info,label,revision);
      const projection=await page.evaluate(function(input){
        const world=FB.bookmark(input.id),sc=FBDATA.startScenarios.find(function(s){return s.id===input.start;}),
          before=JSON.stringify([sc,world]),rng=FB.getRngState(),uid=FB.getUidCounter(),effective=FB.startIdentity(sc,world);
        const original=FB.adoptStartingRealm;
        FB.adoptStartingRealm=function(s,start,options){
          window.beforeConstitutionAdoption={person:s.player.charId,rng:FB.getRngState(),uid:FB.getUidCounter()};
          FB.adoptStartingRealm=original;
          return original(s,FBDATA.startScenarios.find(function(row){return row.id===start.id;}),options);
        };
        return {form:effective.governmentForm,faith:effective.startReligion,faults:FB.validateBookmark(world),
          pure:before===JSON.stringify([sc,world])&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
      },{id:id,start:start.id});
      expect(projection).toMatchObject({faults:[],pure:true,form:revision==='baseline'?start.governmentForm:start.revisionIdentities[id].constitution.governmentForm});
      const full=page.locator('#btn-choose-beginning');
      if(await full.isVisible())await full.click();
      else await page.getByRole('button',{name:'New Game',exact:true}).click();
      if(route==='picker') {
        await page.locator('[data-bookmark="'+id+'"]').click();
        await page.locator('[data-scenario="'+start.id+'"]').click();
      } else {
        await page.locator('#btn-bm-seed').click();
        await page.locator('#ng-seed').fill('CONSTITUTION-'+id+'-'+start.id+'-'+start.fixedProvinceId+'-m-'+start.characterName.replace(/ /g,'_')+'-standard');
        await page.locator('#ng-seed').press('Enter');
      }
      await expect(page.locator('#cg-name')).toHaveValue(start.characterName);
      await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
      await page.getByRole('button',{name:'Begin',exact:true}).click();
      const result=await page.evaluate(function(){
        FB.game.setPaused(true);
        const s=FB.state,sc=FB.campaignStart(s),c=s.chars[s.player.charId],raw=JSON.parse(FB.save.serialize()),
          bytes=JSON.stringify(raw),rng=FB.getRngState(),uid=FB.getUidCounter();
        FB.save.restore(raw);FB.save.restore(JSON.parse(JSON.stringify(raw)));
        const restored=JSON.parse(FB.save.serialize());
        return {form:FB.political.government(FB.state,{kind:'realm',id:'player'}).formId,
          projected:sc.governmentForm,faith:c.religion,person:c.id===window.beforeConstitutionAdoption.person,
          revision:FB.state.start.revision,scenario:FB.state.start.scenarioId,
          stories:JSON.stringify(restored.state.stories)===JSON.stringify(raw.state.stories),
          people:JSON.stringify(restored.state.chars)===JSON.stringify(raw.state.chars),
          authority:JSON.stringify(restored.state.authority)===JSON.stringify(raw.state.authority),
          input:bytes===JSON.stringify(raw),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
      });
      expect(result).toEqual({form:projection.form,projected:projection.form,faith:projection.faith,person:true,
        revision:revision,scenario:start.id,stories:true,people:true,authority:true,input:true,rng:true,uid:true});
      const saved=await page.evaluate(function(){return JSON.parse(FB.save.serialize());});
      await page.reload({waitUntil:'domcontentloaded'});await prepareGameContent(page);
      await page.evaluate(function(raw){
        window.constitutionLoaded=false;
        if(FB.game.loadData(raw,function(){FB.game.setPaused(true);window.constitutionLoaded=true;})===false)
          throw FB.game.lastLoadError;
      },saved);
      await page.waitForFunction(function(){return window.constitutionLoaded;});
      expect(await page.evaluate(function(){return {revision:FB.state.start.revision,
        form:FB.campaignStart(FB.state).governmentForm,actual:FB.political.government(FB.state,{kind:'realm',id:'player'}).formId};}))
        .toEqual({revision:revision,form:projection.form,actual:projection.form});
      if(revision==='constitution'&&route==='code') {
        const changed=JSON.parse(JSON.stringify(input));
        changed.bookmarks[id].revisions.constitution.realms[0].government=start.governmentForm;
        changed.startScenarios[0].revisionIdentities[id].constitution.governmentForm=start.governmentForm;
        await page.evaluate(function(){FB.game.toTitle();FB.ui.showMods();});
        await page.locator('#modfile').setInputFiles({name:'revision-ruler-government-'+label+'.json',mimeType:'application/json',
          buffer:Buffer.from(JSON.stringify(changed))});
        await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
        await prepareGameContent(page);
        expect(await page.evaluate(function(raw){
          const before=JSON.stringify([FBDATA,FB.state,localStorage,raw]),rng=FB.getRngState(),uid=FB.getUidCounter();
          let rejected=false;try{FB.save.restore(raw);}catch(error){rejected=true;}
          return !FB.mods.saveCompatibility(raw).compatible&&rejected&&before===JSON.stringify([FBDATA,FB.state,localStorage,raw])&&rng===FB.getRngState()&&uid===FB.getUidCounter();
        },saved)).toBe(true);
      }
    });
  }
}
