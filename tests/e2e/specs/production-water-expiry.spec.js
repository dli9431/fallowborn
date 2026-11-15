'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename, ['js/production.js','js/site_resources.js','js/building_seasons.js',
  'js/save.js','js/save_v4.js','js/treasury.js','js/mods.js','js/world.js','js/bookmark_sources.js',
  'data/production.js','data/bookmarks.js']);

test.beforeEach(async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/production-fiber.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page,'production_fiber','production_fiber_household');
  await page.evaluate(function () {
    const s=FB.state,owner=s.production.assets[0].owner;
    s.realms[owner.id].treasury.gold=10000;
  });
});

for (const turn of [6,7,14]) {
  test('water-backed cancellation at turn '+turn+' preserves property and exact matching saves',async function ({page}) {
    const r=await page.evaluate(function (turn) {
      const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site;
      const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:'rag_paper',disposition:'store'}));
      if (typeof id!=='number') throw new Error('The regression requires a real paid batch and water reservation.');
      const funds=FB.treasuryAvailable(s,'production_fiber_court');
      s.turn=turn;s.date.day=turn+1;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      P.validate(s);FB.siteResources.validate(s);
      const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
      const expired=turn>=7;
      let blocked=true;
      if (expired) {
        for (const operation of ['work','finish']) {
          const unchanged=JSON.stringify(s);
          blocked=blocked&&!P.commit(s,P.aiQuote(s,site.id,operation,{batchId:id}))&&unchanged===JSON.stringify(s);
        }
      }
      const waterBefore=JSON.stringify(s.siteResources);
      const cancelled=P.commit(s,P.aiQuote(s,site.id,'cancel',{batchId:id}));
      P.validate(s);FB.siteResources.validate(s);
      const batch=s.production.batches.find(function (b) {return b.id===id;});
      const facts=JSON.stringify([s.production,s.siteResources]);
      const noRefund=funds===FB.treasuryAvailable(s,'production_fiber_court');
      const waterUnchanged=waterBefore===JSON.stringify(s.siteResources);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const t=FB.state;
      const restored=facts===JSON.stringify([t.production,t.siteResources]);
      const second=JSON.stringify(t),repeat=P.commit(t,P.aiQuote(t,site.id,'cancel',{batchId:id}));
      return {pure:pure,blocked:blocked,cancelled:cancelled,status:batch.status,closedTurn:batch.closedTurn,
        waterPeriod:batch.waterPeriod,remaining:t.production.lots[0].remaining,
        available:P.snapshot(t)[0].lots[0].available,outputs:t.production.lots.filter(function (lot) {return lot.origin.kind==='batch';}).length,
        noRefund:noRefund,waterUnchanged:waterUnchanged,storedClaims:t.siteResources.sources[site.sourceId].reservations.length,
        activeClaims:FB.siteResources.snapshot(t).find(function (row) {return row.id===site.sourceId;}).reserved,
        restored:restored,repeat:repeat,repeatPure:second===JSON.stringify(t)};
    },turn);
    expect(r).toEqual({pure:true,blocked:true,cancelled:true,status:'cancelled',closedTurn:turn,waterPeriod:0,
      remaining:6,available:6,outputs:0,noRefund:true,waterUnchanged:turn>=7,storedClaims:turn>=7?1:0,
      activeClaims:0,restored:true,repeat:false,repeatPure:true});
  });
}

test('live and expired water claims retain exact quantity and original identity checks',async function ({page}) {
  const r=await page.evaluate(function () {
    const s=FB.state,P=FB.production,site=P.snapshot(s)[0].site;
    const id=P.commit(s,P.aiQuote(s,site.id,'reserve',{recipeId:'rag_paper',disposition:'store'}));
    if (typeof id!=='number') throw new Error('The regression requires a real paid batch and water reservation.');
    const changes=[function (t,claim) {claim.amount++;},
      function (t,claim) {claim.actor={kind:'character',id:t.player.charId};claim.characterId=t.player.charId;claim.generation=null;},
      function (t,claim) {claim.characterId=t.player.charId;},
      function (t,claim) {claim.generation++;},
      function (t) {const b=t.production.batches[0];b.status='cancelled';b.closedTurn=t.turn;t.production.revision++;}];
    const rejected=changes.map(function (change) {
      const t=JSON.parse(JSON.stringify(s));change(t,t.siteResources.sources[site.sourceId].reservations[0]);
      const before=JSON.stringify(t);let invalid=false;
      try {P.validate(t);} catch (error) {invalid=/production/.test(error.message);}
      return invalid&&before===JSON.stringify(t);
    });
    s.turn=7;s.date.day=8;
    P.commit(s,P.aiQuote(s,site.id,'cancel',{batchId:id}));P.validate(s);
    const historic=changes.slice(0,4).map(function (change) {
      const t=JSON.parse(JSON.stringify(s));change(t,t.siteResources.sources[site.sourceId].reservations[0]);
      const before=JSON.stringify(t);let invalid=false;
      try {P.validate(t);} catch (error) {invalid=/production/.test(error.message);}
      return invalid&&before===JSON.stringify(t);
    });
    return {rejected:rejected,historic:historic};
  });
  expect(r).toEqual({rejected:Array(5).fill(true),historic:Array(4).fill(true)});
});
