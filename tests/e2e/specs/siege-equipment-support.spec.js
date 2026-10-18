'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={light:require('../fixtures/authoring/siege-support-light.json'),heavy:require('../fixtures/authoring/siege-support-heavy.json')};
dependsOnRuntime(__filename,['index.html','data/siege_support.js','data/production.js','data/technology.js','data/technology_civic_military.js',
  'js/siege_support.js','js/production.js','js/production_economy.js','js/building_seasons.js','js/site_resources.js',
  'js/fortifications.js','js/armies.js','js/wars.js','js/mobile_command.js','js/mobile_confederations.js',
  'js/mods.js','js/world.js','js/starts.js','js/main.js','js/save.js','js/save_v4.js','js/treasury.js',
  'js/ui_wars.js','js/ui_misc.js','js/ui_modals.js','js/technology.js','js/politics.js']);

async function boot(page,info,kind,npc) {
  await openGame(page,info);await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/siege-support-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function(){return window.FB && FB.game && FB.game.bootReady;});
  const bm='siege_support_'+kind;
  if(npc)await beginBookmark(page,info,bm,bm+'_household');
  else {
    const full=page.locator('#btn-choose-beginning');
    if(await full.isVisible())await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('SIEGEEQUIPMENT-'+bm+'-'+bm+'_ruler-'+(kind==='light'?'resource_quay-m-Ivo_Reed':'resource_hill-m-Arno_Stone')+'-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
  }
  await page.evaluate(function(){FB.game.setPaused(true);});
}
async function stage(page,kind,npc) {
  return page.evaluate(function(args){
    const kind=args.kind,s=FB.state,P=FB.production,S=FB.siegeSupport,profileId=kind+'_equipment',p=FBDATA.siegeSupportProfiles[profileId];
    const source=P.snapshot(s)[0],recipe=FBDATA.productionRecipes[p.recipeId];
    const request={recipeId:p.recipeId,disposition:'store'},reserve=P.aiQuote(s,source.site.id,'reserve',request);
    const before=FB.production.account(s,reserve.request.actor).funds.available,batch=P.commit(s,reserve);
    const afterReserve=FB.production.account(s,reserve.request.actor).funds.available;
    if(!batch)throw new Error('Expected actual funded production reserve: '+JSON.stringify(reserve));
    for(let i=0;i<recipe.workDays;i++) {
      const q=P.aiQuote(s,source.site.id,'work',{batchId:batch});
      if(args.npc) {if(!P.commit(s,q))throw new Error('Expected NPC paid work');s.turn++;s.date.day++;}
      else if(!P.perform(s,q))throw new Error('Expected protagonist paid action day');
    }
    if(!P.commit(s,P.aiQuote(s,source.site.id,'finish',{batchId:batch})))throw new Error('Expected completed paid equipment');
    const realm=source.asset.owner.id;
    const target=Object.keys(s.owner).find(function(pid){return s.owner[pid]!==realm && s.realms[s.owner[pid]] && s.realms[s.owner[pid]].alive;});
    const enemy=s.owner[target];
    const occupation={progress:0,occupied:false},occupations={};occupations[target]=occupation;
    const w=FB.registerOrdinaryWar(s,realm,{enemy:enemy,target:target,legacy:false,casus:{type:'border'},occupations:occupations});
    const host={id:'equipment_host',realm:realm,warId:w.id,at:source.site.countyId,from:null,men:1000,size:1000,
      units:{levy:1000,arch:0,cav:0,ret:0,mercs:0},supply:30,path:[],goal:null,moveLeft:0};
    s.armies=[host];
    const tech=FB.realmTechRecord(s,realm);
    p.requiresTech.forEach(function(key){if(tech.completed.indexOf(key)<0)tech.completed.push(key);});
    window.siegeTest={request:{profileId:profileId,siteId:source.site.id,hostId:host.id,warId:w.id,countyId:target},target:target,home:host.at};
    P.validate(s);
    return {paid:before-afterReserve,price:recipe.workPrice,days:recipe.workDays,
      realm:realm,target:target,batch:batch,profile:p};
  },{kind:kind,npc:!!npc});
}

for(const kind of ['light','heavy']) {
  test(kind+' ordinary JSON import produces finite paid equipment and pure shared quotes',async function({page},info){
    await boot(page,info,kind);const setup=await stage(page,kind);
    const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=S.quote(s,siegeTest.request),ai=S.aiQuote(s,siegeTest.request);
      return {allowed:q.allowed,shared:JSON.stringify(q)===JSON.stringify(ai),pure:before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter(),
        quantity:q.inputs.reduce(function(n,x){return n+x.quantity;},0),absent:s.siegeSupport===undefined};});
    expect(setup.paid).toBe(setup.price);
    expect(r).toEqual({allowed:true,shared:true,pure:true,quantity:kind==='light'?2:6,absent:true});
  });
  test(kind+' loaded batches debit once, travel with one host and affect two real siege pulses',async function({page},info){
    await boot(page,info,kind);await stage(page,kind);
    const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,q=S.quote(s,siegeTest.request),gold=s.player.gold;
      const a=s.armies[0],w=FB.ordinaryWarById(s,q.request.warId),record=w.occupations[siegeTest.target];
      const loaded=S.commit(s,q),repeat=S.commit(s,q);FB.production.validate(s);
      const before=record.progress,stock=s.production.lots.find(function(l){return l.id===q.inputs[0].lotId;}).remaining;
      // Stage actual arrival. The equipment API itself cannot move this host.
      const home=a.at;a.at=siegeTest.target;
      FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});
      s.turn+=90;s.date.season++;
      FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});
      const after=record.progress,uses=s.siegeSupport.records[0].uses.length;
      s.turn+=90;s.date.season++;
      FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});FB.production.validate(s);
      return {loaded:!!loaded,repeat:repeat,stock:stock,initial:before,after:after,exhausted:record.progress-after,
        uses:uses,status:s.siegeSupport.records[0].status,gold:s.player.gold===gold,home:home!==a.at};});
    expect(r).toEqual({loaded:true,repeat:false,stock:0,initial:0,after:kind==='light'?2.5:3.5,exhausted:1,uses:2,status:'spent',gold:true,home:true});
  });
  test(kind+' matching restore retains carried inputs and spent charges without loading or replay',async function({page},info){
    await boot(page,info,kind);await stage(page,kind);
    const r=await page.evaluate(function(){const S=FB.siegeSupport,s=FB.state,q=S.quote(s,siegeTest.request);S.commit(s,q);
      const a=s.armies[0];a.at=siegeTest.target;
      const w=FB.ordinaryWarById(s,q.request.warId);FB.advanceFortSiegePulse(s,a.at,w.occupations[a.at],{hosts:[a]});
      const before=JSON.stringify([s.production,s.siegeSupport,s.player.gold,s.armies.map(function(a){return a.id;})]),saved=JSON.parse(FB.save.serialize());
      FB.save.restore(saved);const t=FB.state;FB.production.validate(t);S.validate(t);
      return {same:before===JSON.stringify([t.production,t.siegeSupport,t.player.gold,t.armies.map(function(a){return a.id;})]),repeat:S.commit(t,q),uses:t.siegeSupport.records[0].uses.length};});
    expect(r).toEqual({same:true,repeat:false,uses:1});
  });
  test(kind+' NPC dispatcher loads through the same quote and consumes the same finite support',async function({page},info){
    await boot(page,info,kind,true);await stage(page,kind,true);
    const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,q=S.aiQuote(s,siegeTest.request);
      const expected=JSON.parse(JSON.stringify(s));S.commit(expected,S.quote(expected,siegeTest.request));
      S.runAI(s,s.armies);const same=JSON.stringify(expected.production)===JSON.stringify(s.production)&&JSON.stringify(expected.siegeSupport)===JSON.stringify(s.siegeSupport);
      const a=s.armies[0];a.at=siegeTest.target;const record=FB.ordinaryWarById(s,a.warId).occupations[a.at];
      FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});FB.production.validate(s);
      return {allowed:q.allowed,same:same,progress:record.progress,uses:s.siegeSupport.records[0].uses.length};});
    expect(r).toEqual({allowed:true,same:true,progress:kind==='light'?1.25:1.75,uses:1});
  });
}

test('missing exact equipment technology blocks loading while baseline siege and carried commitments remain available',async function({page},info){
  await boot(page,info,'heavy');await stage(page,'heavy');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,req=siegeTest.request,a=s.armies[0],tech=FB.realmTechRecord(s,a.realm);
    tech.completed=tech.completed.filter(function(k){return k!=='siege_engineering';});
    const q=S.quote(s,req),blocked=!q.allowed,missing=q.missingTech.slice();
    const at=a.at;a.at=siegeTest.target;const record=FB.ordinaryWarById(s,a.warId).occupations[a.at];
    FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});const baseline=record.progress;
    a.at=at;tech.completed.push('siege_engineering');S.commit(s,S.quote(s,req));
    tech.completed=tech.completed.filter(function(k){return k!=='siege_engineering';});a.at=siegeTest.target;
    FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],progressAmount:1});
    return {blocked:blocked,missing:missing,baseline:baseline,carried:record.progress-baseline};});
  expect(r).toEqual({blocked:true,missing:['siege_engineering'],baseline:1,carried:1.75});
});

test('ordinary objective resolution uses paid support twice and counts the existing capped technology bonus once',async function({page},info){
  await boot(page,info,'heavy');await stage(page,'heavy');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,a=s.armies[0];S.commit(s,S.quote(s,siegeTest.request));
    s.buildings[siegeTest.target]=[{s:0,id:'walls',level:4}];FB.invalidateFortIndex();a.at=siegeTest.target;
    const w=FB.ordinaryWarById(s,a.warId),base=1+FB.techBonus(s,'siege',a.realm)*3;
    FB.advanceOrdinaryObjectives(s,w.id);const first=w.occupations[siegeTest.target].progress;
    s.turn+=90;s.date.season++;
    FB.advanceOrdinaryObjectives(s,w.id);const second=w.occupations[siegeTest.target].progress;
    FB.production.validate(s);
    return {base:base,first:first,second:second,uses:s.siegeSupport.records[0].uses.length,men:a.men};});
  expect(r.first).toBeCloseTo(r.base+0.75);expect(r.second).toBeCloseTo(2*(r.base+0.75));
  expect(r.uses).toBe(2);expect(r.men).toBe(934);
});

test('equipment configuration content changes reject an earlier matching save before state adoption',async function({page},info){
  await boot(page,info,'light');await stage(page,'light');
  const r=await page.evaluate(function(source){const s=FB.state,S=FB.siegeSupport;S.commit(s,S.quote(s,siegeTest.request));
    const saved=JSON.parse(FB.save.serialize()),sig=FB.mods.sig(),changed=JSON.parse(JSON.stringify(source));
    changed.siegeSupportProfiles.light_equipment.termDays++;
    FB.mods.apply(changed);const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try{FB.save.restore(saved);}catch(e){rejected=true;}
    return {changed:sig!==FB.mods.sig(),mismatch:FB.save.otherWorld(saved),rejected:rejected,
      pure:before===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};},examples.light);
  expect(r).toEqual({changed:true,mismatch:true,rejected:true,pure:true});
});

test('stale quotes, foreign stock, changed command, moving or absent hosts and wrong campaigns do not debit stock',async function({page},info){
  await boot(page,info,'light');await stage(page,'light');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,base=JSON.stringify(s),q=S.quote(s,siegeTest.request);
    const changes=[function(t){t.armies[0].men=0;},function(t){t.armies[0].at=siegeTest.target;},function(t){t.armies[0].path=[siegeTest.target];},
      function(t){t.armies[0].warId='absent';},function(t){t.realms.player.alive=false;},function(t){t.chars[t.player.charId].imprisoned=true;},
      function(t){t.realms.player.ruler.generation=FB.realmRulerGeneration(t,'player')+1;},function(t){t.wars[q.request.warId].status='ended';},
      function(t){t.buildings[siegeTest.home][0].ruined=true;}];
    return changes.map(function(change){const t=JSON.parse(base);change(t);const before=JSON.stringify(t);return !S.commit(t,q)&&before===JSON.stringify(t);});});
  expect(r).toEqual(Array(9).fill(true));
});

test('support waits for real arrival, never pays contested or insufficient pulses, and contributes once per turn',async function({page},info){
  await boot(page,info,'light');await stage(page,'light');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport,a=s.armies[0];S.commit(s,S.quote(s,siegeTest.request));
    const record=FB.ordinaryWarById(s,a.warId).occupations[siegeTest.target];
    const absent=S.pulse(s,siegeTest.target,record,[a]);a.at=siegeTest.target;
    FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a],contested:true});
    const contested=s.siegeSupport.records[0].uses.length;
    s.buildings[a.at]=[{s:0,id:'walls',level:4}];FB.invalidateFortIndex();delete record.fortLevel;
    const men=a.men;a.men=1;FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a]});const short=s.siegeSupport.records[0].uses.length;
    a.men=men;FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a]});const first=record.progress;
    FB.advanceFortSiegePulse(s,a.at,record,{hosts:[a]});
    return {absent:absent,contested:contested,short:short,uses:s.siegeSupport.records[0].uses.length,second:record.progress-first};});
  expect(r).toEqual({absent:0,contested:0,short:0,uses:1,second:1});
});

test('expired, reassigned, captured, replaced and destroyed carriers lose unused support without refund or transfer',async function({page},info){
  await boot(page,info,'light');await stage(page,'light');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport;S.commit(s,S.quote(s,siegeTest.request));const base=JSON.stringify(s);
    const changes=[function(t){t.turn=t.siegeSupport.records[0].endTurn;},function(t){t.armies[0].warId='other';},
      function(t){t.chars[t.player.charId].dead=true;},function(t){t.armies[0].id='replacement';},function(t){t.armies=[];},
      function(t){t.wars[siegeTest.request.warId].occupations[siegeTest.target].occupied=true;}];
    return changes.map(function(change){const t=JSON.parse(base);change(t);const gold=t.player.gold,stock=JSON.stringify(t.production);S.tick(t);
      return t.siegeSupport.records[0].status==='interrupted'&&t.player.gold===gold&&stock===JSON.stringify(t.production);});});
  expect(r).toEqual(Array(6).fill(true));
});

test('strict saved equipment rejects forged identities, chronology, stock and duplicate uses before adoption',async function({page},info){
  await boot(page,info,'heavy');await stage(page,'heavy');
  const r=await page.evaluate(function(){const s=FB.state,S=FB.siegeSupport;S.commit(s,S.quote(s,siegeTest.request));const base=JSON.stringify(s);
    const changes=[function(t){t.siegeSupport.version=2;},function(t){t.siegeSupport.definition='wrong';},function(t){t.siegeSupport.records[0].assetId=-1;},
      function(t){t.siegeSupport.records[0].inputs[0].quantity++;},function(t){t.siegeSupport.records[0].endTurn++;},
      function(t){t.siegeSupport.records[0].characterId='missing';},function(t){t.siegeSupport.records[0].uses=[{turn:t.turn},{turn:t.turn}];},
      function(t){delete t.siegeSupport;},function(t){t.production.lots.find(function(l){return l.goodId==='heavy_frame';}).remaining++;}];
    return changes.map(function(change){const t=JSON.parse(base);change(t);const active=JSON.stringify(FB.state),rng=FB.getRngState();
      let rejected=false;try{FB.production.validate(t);S.validate(t);}catch(e){rejected=true;}
      return rejected&&JSON.stringify(FB.state)===active&&rng===FB.getRngState();});});
  expect(r).toEqual(Array(9).fill(true));
});

test('ordinary candidate compilation rejects malformed profiles without campaign, registry, RNG or id mutation',async function({page},info){
  await boot(page,info,'light');
  const r=await page.evaluate(function(mod){const before=JSON.stringify(FBDATA.siegeSupportProfiles),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
    const changes=[function(p){p.progress=2;},function(p){p.pulses=9;},function(p){p.termDays=0;},function(p){p.recipeId='missing';},
      function(p){p.requiresTech=['missing'];},function(p){p.goodId='cordage';},function(p){p.arbitraryEffect=5;},function(p){p.impactReviewId='finite_siege_carriage';p.requiresTech=['siege_engineering'];}];
    const rejected=changes.map(function(change){const m=JSON.parse(JSON.stringify(mod));change(m.siegeSupportProfiles.light_equipment);
      return FB.mods.validate(m).length>0;});
    return {rejected:rejected,pure:before===JSON.stringify(FBDATA.siegeSupportProfiles)&&state===JSON.stringify(FB.state)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },examples.light);
  expect(r).toEqual({rejected:Array(8).fill(true),pure:true});
});

test('same-seed support commits and siege results agree without consuming RNG or allocating global identities',async function({page},info){
  await boot(page,info,'light');await stage(page,'light');
  const r=await page.evaluate(function(){const S=FB.siegeSupport,base=JSON.stringify(FB.state),a=JSON.parse(base),b=JSON.parse(base),rng=FB.getRngState(),uid=FB.getUidCounter();
    [a,b].forEach(function(s){S.commit(s,S.quote(s,siegeTest.request));s.armies[0].at=siegeTest.target;
      FB.advanceFortSiegePulse(s,siegeTest.target,s.wars[siegeTest.request.warId].occupations[siegeTest.target],{hosts:s.armies});});
    return {same:JSON.stringify(a)===JSON.stringify(b),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};});
  expect(r).toEqual({same:true,rng:true,uid:true});
});

test('phone equipment review preserves list scroll and focus through Back, Escape and a successful load',async function({page},info){
  await page.setViewportSize({width:390,height:844});await boot(page,info,'light');await stage(page,'light');
  await page.evaluate(function(){FB.ui.showCampaign(siegeTest.request.warId);});
  await page.locator('#siege-equipment-host-0').click();
  const card=page.locator('#siege-equipment-0');await expect(card).toBeEnabled();
  await page.locator('[aria-controls="siege-equipment-details-0"]').click();
  await card.focus();
  const scroll=await page.locator('#gm-body').evaluate(function(el){return el.scrollTop;});
  await card.click();await expect(page.locator('#siege-equipment-confirm')).toBeVisible();
  await page.keyboard.press('Escape');await expect(card).toBeFocused();
  await expect(page.locator('#siege-equipment-details-0')).toBeVisible();
  await expect.poll(function(){return page.locator('#gm-body').evaluate(function(el){return el.scrollTop;});}).toBe(scroll);
  await card.click();await page.locator('#siege-equipment-cancel').click();await expect(card).toBeFocused();
  await card.click();await page.locator('#siege-equipment-confirm').click();
  await expect(card).toBeDisabled();await expect(page.locator('#gm-body')).toContainText('2 charges');
});
