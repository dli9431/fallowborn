'use strict';
const fs=require('fs');
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {beginRuler1096}=require('../support/game/rulers-1096');
const {beginBookmarkFromTitle}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','js/mobile_confederations.js','js/mobile_guard.js','js/mobile_columns.js','js/mobile_command.js',
  'js/mobile_camps.js','js/expedition_programs.js','js/story_expedition_preparation.js','js/story_expedition_program.js',
  'js/technology.js','js/logistics.js','js/climate.js','js/armies.js','js/governments.js','js/government_selection.js',
  'js/authority.js','js/federates.js','js/bookmark_setup.js','js/home_authority.js','js/treasury.js','js/market.js',
  'js/stories.js','js/starts.js','js/main.js','js/save.js','js/save_v4.js','js/mods.js',
  'data/mobile_confederations.js','data/technology.js','data/units.js','data/climate.js',
  'data/bookmark_1096.js','data/bookmark_1096_western_expeditions.js','data/story_antioch_1096.js',
  'data/starts_antioch_1096.js','data/starts_western_rulers_1096.js','data/story_western_rulers_1096.js',
  'data/story_instances.js'
]);

// Install the original base projections in the same closure as the optimized
// functions, before the unchanged guard/column/command wrappers capture them.
// The fixture is source text only; no game script is imported into Node.
async function referenceProjection(page) {
  const reference=fs.readFileSync(path.join(__dirname,'../fixtures/expedition-planning/whole-table-reference.txt'),'utf8')
    .replace('M.preformationRations =','var referenceRations =')
    .replace('M.openingPlan =','var referencePlan =');
  const source=fs.readFileSync(path.join(__dirname,'../../../js/mobile_confederations.js'),'utf8');
  const marker='  /* Shared physical constructor.';
  expect(source.split(marker)).toHaveLength(2);
  const selector=reference+'\n  var fastPlan=M.openingPlan,fastRations=M.preformationRations;\n'+
    '  M.openingPlan=function(s,d){return window.wholeTableReference ? referencePlan(s,d) : fastPlan(s,d);};\n'+
    '  M.preformationRations=function(s,d){return window.wholeTableReference ? referenceRations(s,d) : fastRations(s,d);};\n';
  await page.route('**/js/mobile_confederations.js',function(route){
    return route.fulfill({status:200,contentType:'application/javascript',body:source.replace(marker,selector+marker)});
  });
}

async function compare(page) {
  return page.evaluate(function(){
    const M=FB.mobile,P=FB.expeditionPreparation,s=FB.state,bm=FB.campaignBookmark(s);
    // Serialize once before taking the purity baseline: save owns pruning.
    const saved=FB.save.serialize(),before=JSON.stringify(s),data=JSON.stringify(FBDATA),
      signature=FB.mods.sig(),rng=FB.getRngState(),uid=FB.getUidCounter();
    function freeze(value) {
      if(value && typeof value==='object' && !Object.isFrozen(value)) {
        Object.keys(value).forEach(function(k){freeze(value[k]);});Object.freeze(value);
      }
      return value;
    }
    function queries(state) {
      const result={openings:[],rations:[],reviews:[],funding:[]};
      bm.realms.filter(function(d){return d.mobile && d.mobile.opening;}).forEach(function(d){
        const fresh=JSON.parse(JSON.stringify(state));
        if(fresh.authority.governments[d.id]) delete fresh.authority.governments[d.id].mobile;
        fresh.armies=fresh.armies.filter(function(a){return a.realm!==d.id;});
        fresh.authority.migrations=(fresh.authority.migrations || []).filter(function(m){return m.realmId!==d.id;});
        const bytes=JSON.stringify(fresh),plan=M.openingPlan(fresh,d),ration=M.preformationRations(fresh,d);
        if(bytes!==JSON.stringify(fresh)) throw new Error('Planning mutated '+d.id);
        result.openings.push([d.id,plan]);
        result.rations.push([d.id,ration,[1,7,14].map(function(days){return M.rationTarget(d.mobile.profileId,ration,days);})]);
      });
      Object.keys(state.stories).forEach(function(id){
        const story=FB.stories.get(id),def=story && story.declaration,t=state.stories[id];
        if(!def || def.type!=='expedition_preparation') return;
        const leader=t.bindings[0].characterId;
        ['form','grant','contribute','wait','authorize'].forEach(function(action){
          result.reviews.push(P.review(state,id,action,action==='grant' || action==='authorize' ? t.provider.characterId : leader));
        });
        result.funding.push(P.fundingSnapshot(state,def.realmId));
      });
      return result;
    }
    const cases=[],allowed=[];
    // Long boundaries are staged, never reached through the daily loop.
    for(const season of [0,3]) {
      const state=JSON.parse(before);state.date.season=season;state.turn=season*90;
      const bytes=JSON.stringify(state);
      window.wholeTableReference=true;const old=JSON.stringify(queries(state));
      window.wholeTableReference=false;const current=queries(state);
      cases.push(old===JSON.stringify(current) && bytes===JSON.stringify(state));
      allowed.push(current.openings.filter(function(row){return row[1].allowed;}).length);
    }
    // Cold/missing and legacy records must retain lazy-normalization isolation.
    for(const mode of ['missing','cold','legacy','sovereign']) {
      const state=JSON.parse(before);
      bm.realms.filter(function(d){return d.mobile;}).forEach(function(d){
        const effective=FB.techRealmId(state,d.id);
        if(mode==='missing') delete state.realmTech[effective];
        if(mode==='cold') state.realmTech[effective]={completed:['pack_saddles','pack_saddles'],
          active:'unknown',progress:{bad:-1},priorities:{bad:'invalid'},reserve:-1};
        if(mode==='sovereign') state.realms[d.id].liege=Object.keys(state.realms).find(function(id){
          return id!==d.id && state.realms[id].alive && !state.realms[id].liege && !M.active(state,id);
        });
      });
      if(mode==='legacy') {delete state.realmTechMigration;state.tech=['pack_saddles'];state.player.research=3;}
      const bytes=JSON.stringify(state);
      window.wholeTableReference=true;const old=JSON.stringify(queries(state));
      window.wholeTableReference=false;cases.push(old===JSON.stringify(queries(state)) && bytes===JSON.stringify(state));
    }
    // Consumers get read-only plans; construction must detach its mutable fields.
    const d=bm.realms.find(function(d){return d.mobile && d.mobile.preparationId;});
    let formed=null,copyCounts=null;
    if(d) {
      const state=JSON.parse(before),plan=freeze(M.openingPlan(state,d));
      if(!plan.allowed) throw new Error('Expected an eligible unformed opening');
      const bytes=JSON.stringify(plan),p=FBDATA.mobileProfiles[d.mobile.profileId];
      const pools={};p.members.forEach(function(m){pools[m.id]=[{culture:d.culture,religion:d.religion,count:m.population}];});
      const first=JSON.parse(before),second=JSON.parse(before);
      window.wholeTableReference=true;M.formFollowing(first,d,freeze(M.openingPlan(first,d)),pools,d.mobile.food);
      const firstRng=FB.getRngState(),firstUid=FB.getUidCounter();
      if(firstRng!==rng || firstUid!==uid) throw new Error('Named formation consumed an identity or random draw');
      window.wholeTableReference=false;M.formFollowing(second,d,plan,pools,d.mobile.food);
      formed=JSON.stringify(first)===JSON.stringify(second) && firstRng===FB.getRngState() && firstUid===FB.getUidCounter() && bytes===JSON.stringify(plan);
      let count=0;
      const effective=FB.techRealmId(state,d.id),other=Object.keys(state.realmTech).find(function(id){return id!==effective;});
      Object.defineProperty(state.realmTech[other],'toJSON',{configurable:true,value:function(){count++;return this;}});
      M.openingPlan(state,d);M.preformationRations(state,d);const fast=count;
      window.wholeTableReference=true;M.openingPlan(state,d);M.preformationRations(state,d);
      window.wholeTableReference=false;copyCounts={fast:fast,reference:count-fast};
    }
    return {cases:cases,allowed:allowed,formed:formed,copyCounts:copyCounts,
      openings:bm.realms.filter(function(d){return d.mobile && d.mobile.opening;}).length,
      pure:before===JSON.stringify(s) && data===JSON.stringify(FBDATA) && signature===FB.mods.sig() &&
        saved===FB.save.serialize() && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
}

function assertParity(result) {
  expect(result.openings).toBeGreaterThan(0);
  expect(result.allowed[0]).toBeGreaterThan(0);
  expect(result.cases).toEqual(Array(6).fill(true));
  expect(result.pure).toBe(true);
  expect(result.formed).toBe(true);
  expect(result.copyCounts.fast).toBe(0);
  expect(result.copyCounts.reference).toBeGreaterThan(0);
}

for(const scenario of ['yaghi_siyan_1096','bohemond_1096']) {
  test(scenario+' plans rations reviews and construction match the whole-table reference',async function({page},info){
    await referenceProjection(page);
    await beginRuler1096(page,info,scenario);
    assertParity(await compare(page));
  });
}

for(const label of ['harbor','upland']) {
  test(label+' JSON preparation keeps exact quotes saves and identities without unrelated technology copies',async function({page},info){
    await referenceProjection(page);
    await openGame(page,info);
    await page.evaluate(function(){FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.join(__dirname,'../fixtures/authoring/ration-preparation-'+label+'.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
    const prefix=label==='harbor' ? 'harbor' : 'dune';
    await beginBookmarkFromTitle(page,prefix+'_world',prefix+'_household');
    assertParity(await compare(page));
  });
}
