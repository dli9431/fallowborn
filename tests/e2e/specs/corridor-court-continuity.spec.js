'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js',
  'js/mobile_confederations.js','js/expedition_programs.js','js/mobile_command.js','js/mobile_columns.js',
  'js/story_expedition_program.js','js/story_expedition_preparation.js','js/government_selection.js',
  'js/government_lineage.js','js/governments.js','js/starts.js','js/bookmark_setup.js','js/world.js',
  'js/model.js','js/authority.js','js/treasury.js','js/stories.js','js/population.js','js/armies.js',
  'js/market.js','js/federates.js','js/home_authority.js','js/mods.js','js/main.js','js/save.js','js/save_v4.js']);

for (const decision of ['accept','decline']) test('corridor '+decision+' preserves original people through actual court adoption and release',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/corridor-court-continuity.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function () {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks.dune_world;});
  await beginBookmark(page,info,'dune_world','dune_household');
  const result=await page.evaluate(function (decision) {
    const M=FB.mobile,E=FB.expeditionPrograms,s=FB.state,rid='dune_coalition',row=M.row(s,rid);
    const offered=E.commit(s,E.review(s,rid,'permission')),a=M.agreements(s,rid)[0],original=JSON.stringify(a.accessOrigin),
      chain=JSON.stringify(row.expeditionProgram.corridor.entries.map(function (e) {return e.chain;}));
    const scenario=FBDATA.startScenarios.find(function (sc) {return sc.id==='dune_outside_start';}),
      person=s.chars[a.accessOrigin.chain[0].personId];
    s.player.charId=person.id;s.player.tier=scenario.tier;
    const adopted=FB.adoptStartingRealm(s,scenario,{deferSetup:true});
    FB.validateStartingRealm(s);
    const alias=a.partnerId==='player' && row.expeditionProgram.corridor.entries[0].liveChain[0]==='player',
      same=original===JSON.stringify(a.accessOrigin) && chain===JSON.stringify(row.expeditionProgram.corridor.entries.map(function (e) {return e.chain;}));
    s.turn++;s.date=FB.dateAtTurn(s,s.turn);E.day(s);
    const deliberate=a.status==='offered',q=M.review(s,{realmId:rid,action:decision,
      actor:{kind:'character',id:person.id},terms:{agreementId:a.id}}),done=M.commit(s,q),repeat=!M.commit(s,q);
    const retained=JSON.stringify(row),save=JSON.parse(FB.save.serialize());FB.save.restore(save);
    const matching=retained===JSON.stringify(M.row(FB.state,rid));
    const current=FB.state,released=FB.governmentSelection.releasePlayerCourt(current,current.chars[current.player.charId],true),
      receipt=M.agreements(current,rid)[0],live=M.row(current,rid),endedOrigin=JSON.stringify(receipt.accessOrigin);
    const remapped=released==='dune_gate' && receipt.partnerId==='dune_gate' && live.expeditionProgram.corridor.entries[0].liveChain[0]==='dune_gate';
    E.reconcile(current);current.turn++;current.date=FB.dateAtTurn(current,current.turn);FB.mobileDay(current);
    const stale=!M.provisioningAccess(current,rid,receipt.countyIds[0]) && receipt.status==='ended';
    const before=JSON.stringify(live),after=JSON.parse(FB.save.serialize());FB.save.restore(after);
    return {offered:offered,adopted:adopted,alias:alias,same:same,deliberate:deliberate,done:done,repeat:repeat,
      matching:matching,remapped:remapped,stale:stale,history:endedOrigin===original &&
        before===JSON.stringify(M.row(FB.state,rid)) && FB.courtRecordRetained(FB.state,FB.state.chars[person.id],{},{}),
      technology:FBDATA.techImpactReviews.features.expedition_corridor_receipts.mode};
  },decision);
  expect(result).toEqual({offered:true,adopted:true,alias:true,same:true,deliberate:true,done:true,repeat:true,
    matching:true,remapped:true,stale:true,history:true,technology:'none'});
});
