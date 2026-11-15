'use strict';
const {prepareGameContent} = require('./navigation');
const path = require('path');
const {openGame} = require('./navigation');
const {beginBookmarkFromTitle} = require('./bookmark-acceptance');
const {expectModAdmission} = require('./mod-admission');
const {installRestoreFacts} = require('./restore-facts');
async function bootInputs(page,info,kind,prefix,custom) {
  await openGame(page,info);
  const candidate=custom || require('../../fixtures/authoring/'+prefix+'-'+kind+'.json');
  await expectModAdmission(page,candidate);
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(custom ? {name:'service.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(custom))} :
    path.resolve(__dirname,'../../fixtures/authoring/'+prefix+'-'+kind+'.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  const key=kind==='river'?'river':'upland';
  await prepareGameContent(page);
  await page.waitForFunction(function(key){return window.FB&&FB.game&&FB.game.bootReady&&FBDATA.bookmarks['resource_'+key];},key);
  await beginBookmarkFromTitle(page,'resource_'+key,'resource_'+key+'_household');
  await installRestoreFacts(page);
}
async function prepareInputs(page,count) {
  return page.evaluate(function(count){
    const s=FB.state,P=FB.production,row=P.snapshot(s)[0],who=FB.settlementHolder(s,row.site.countyId,row.site.slot);
    s.realms[who.id].treasury.gold=10000;
    // A reigning worker lives at the realm capital, not an arbitrary home field.
    // Stage that ordinary residence boundary without changing production eligibility.
    s.realms[who.id].capital=row.site.countyId;
    const actor=FB.political.actor(s,who);
    if(FB.characterLocation(s,s.chars[actor.characterId])!==row.site.countyId)throw new Error('Fuel worker must be local');
    const recipeId=row.site.recipeIds[0],recipe=FBDATA.productionRecipes[recipeId];
    for(let i=0;i<count;i++){
      let q=P.aiQuote(s,row.site.id,'reserve',{recipeId:recipeId,disposition:'store'});
      const id=P.commit(s,q);if(!id)throw new Error('Reserve fuel: '+JSON.stringify(q));
      for(let j=0;j<recipe.workDays;j++){
        s.turn++;q=P.aiQuote(s,row.site.id,'work',{batchId:id});
        if(!P.commit(s,q))throw new Error('Work fuel: '+JSON.stringify(q));
      }
      q=P.aiQuote(s,row.site.id,'finish',{batchId:id});
      if(!P.commit(s,q))throw new Error('Finish fuel: '+JSON.stringify(q));
      // The next batch or service starts after this worker's paid action day.
      s.turn++;
    }
    return P.validate(s);
  },count||1);
}
module.exports={bootInputs,prepareInputs};
