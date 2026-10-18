'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/production.js','data/building_seasons.js','js/production.js','js/production_economy.js',
  'js/building_seasons.js','js/building_operations.js','js/actions.js','js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/treasury.js']);
function example() {
  const m=JSON.parse(JSON.stringify(require('../fixtures/authoring/building-seasons-dry.json')));
  const rev=m.bookmarks.season_dry.revisions.supplied;
  m.buildings.fiber_works.seasonProfile='dry_window';
  rev.openingInfrastructure.placements=rev.openingInfrastructure.placements.filter(function(p){return p.buildingId!=='fiber_works';});
  rev.productionSites[0].openingLots=[];
  // An empty receiving plant still declares actual incoming fish for its lifetime.
  m.buildingSeasonProfiles.dry_window.stockLives=m.buildingSeasonProfiles.dry_window.stockLives.filter(function(l){return l.goodId!=='fresh_fish';});
  return m;
}
async function boot(page,info) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'construction.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(example()))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  await beginBookmark(page,info,'season_dry','season_dry_household');
}
test('canonical funded construction enrolls empty seasonal production and matching restore never replays opening lots',async function({page},info){
  await boot(page,info);
  const r=await page.evaluate(function(){
    const s=FB.state,P=FB.production,S=FB.buildingSeasons,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;s.turn=1;s.date.day++;
    const before=s.production.lots.length,built=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId),asset=s.production.assets.find(function(x){return x.siteId===a.productionSiteId;});
    const again=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId),opened=S.commit(s,S.quote(s,{operation:'open',assignmentId:a.id,actor:who,lotId:null}));
    P.validate(s);S.validate(s);
    const saved=JSON.stringify([s.production,s.buildingSeasons,s.buildings]);FB.save.restore(JSON.parse(FB.save.serialize()));P.initialize(FB.state);
    const bad=[function(t){t.production.assets.find(function(x){return x.constructed;}).openedTurn=t.turn+1;},
      function(t){delete t.production.assets.find(function(x){return x.constructed;}).constructed;},function(t){t.production.revision--;},
      function(t){t.buildingSeasons.terms[0].turn=0;}].map(function(change){
        const t=JSON.parse(JSON.stringify(FB.state));change(t);try{P.validate(t);S.validate(t);return false;}catch(error){return true;}
      });
    return {built:built,again:again,opened:opened,empty:s.production.lots.length===before,constructed:asset.constructed,turn:asset.openedTurn,
      restore:saved===JSON.stringify([FB.state.production,FB.state.buildingSeasons,FB.state.buildings]),bad:bad};
  });
  expect(r).toEqual({built:true,again:false,opened:true,empty:true,constructed:true,turn:1,restore:true,bad:[true,true,true,true]});
});
test('unbound required seasonal assets are idle and warm local construction is refused',async function({page},info){
  await boot(page,info);
  const r=await page.evaluate(function(){
    const s=FB.state,S=FB.buildingSeasons,a=S.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;
    const cold=FB.aiCanBuildAt(s,who.id,a.countyId,a.slot,a.buildingId);s.date.season=2;
    const before=JSON.stringify(s),warm=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId);
    const idle=S.effects(s,'unbound',{id:a.buildingId,s:0},FBDATA.buildings[a.buildingId]).populationFamineProtection;
    return {cold:cold,warm:warm,pure:before===JSON.stringify(s),idle:idle};
  });
  expect(r).toEqual({cold:true,warm:false,pure:true,idle:0});
});
test('a full production revision journal refuses seasonal construction before charging',async function({page},info){
  await boot(page,info);
  const r=await page.evaluate(function(){
    const s=FB.state,a=FB.buildingSeasons.compile(FB.campaignBookmark(s)).assignments[0],who=FB.settlementHolder(s,a.countyId,a.slot);
    s.realms[who.id].treasury.gold=10000;s.production.revision=1000000;
    const before=JSON.stringify(s),built=FB.buildRealm(s,who.id,a.countyId,a.slot,a.buildingId);
    return {built:built,pure:before===JSON.stringify(s)};
  });
  expect(r).toEqual({built:false,pure:true});
});
