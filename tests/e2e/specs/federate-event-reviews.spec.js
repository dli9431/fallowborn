'use strict';
const fs=require('fs');
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,openTitle}=require('../support/game/navigation');
const {installStoredMod}=require('../support/game/stored-mod');
const {startParityGame}=require('../support/game/parity');
const {useReviewStartRules}=require('../support/game/released-starts');
const {beginBookmark,beginBookmarkFromTitle}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const example=require('../fixtures/authoring/federate-event-reviews-estuary.json');
const examplePath=path.resolve(__dirname,'../fixtures/authoring/federate-event-reviews-estuary.json');

dependsOnRuntime(__filename,['index.html','data/events_federate_life.js','data/political_institutions.js','data/systems.js',
  'data/bookmark_manifest.js','data/bookmark_476_italy.js','data/story_courts_476.js','data/starts.js',
  'data/bookmark_1096_mainz.js','data/story_households_rhineland_1096.js','data/starts_mainz_1096.js',
  'js/federates.js','js/story_track.js','js/story_agreements.js','js/story_household_refuge.js',
  'js/schema.js','js/events.js','js/stories.js','js/mods.js','js/starts.js','js/main.js','js/bookmark_sources.js',
  'js/world.js','js/model.js',
  'js/authority.js','js/treasury.js','js/settlement.js','js/governments.js','js/systems.js',
  'js/population.js','js/home_authority.js','js/story_household_party.js','js/household_party_travel.js',
  'js/institutions.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js']);

// Each case opens its own campaign and browser context, so CI can shard the cases independently.
test.describe.configure({mode:'parallel'});

/* Admission against the unmodded catalogue and the Mods file picker import
   have their own case. Every review case stores the same example file text
   and boots it once instead of preparing the unmodded catalogue first. */
// The picker case proves admission and that the reload stores exactly this
// example; every review case boots that stored text and proves it publishes.
async function pickerImport(page,info) {
  await openGame(page,info);
  expect(await page.evaluate(function(m) {return FB.mods.validate(m);},example)).toEqual([]);
  await page.evaluate(function() {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(examplePath);
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function() {return !!(window.FB && FB.game && FB.game.bootReady);});
}
async function imported(page,info,ruler) {
  await openTitle(page,info);
  await installStoredMod(page,fs.readFileSync(examplePath,'utf8'));
  if (!ruler) {await beginBookmarkFromTitle(page,'inventory_estuary','inventory_estuary_household');return;}
  await page.evaluate(function() {FB.startProgression.noteTier(3);});
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  const scenario=ruler==='following'?'inventory_following_leader':'inventory_estuary_ruler';
  const name=ruler==='following'?'Neri Ford':'Ivo Reed';
  await page.locator('#ng-seed').fill('SERVICE-inventory_estuary-'+scenario+'-inventory_quay-m-'+name+'-standard-0-frankish.catholic');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function() {FB.game.setPaused(true);});
}
async function nativeRuler(page,info) {
  // Odoacer is a review candidate on an available date. Install review access before boot.
  await useReviewStartRules(page);
  await startParityGame(page,info,{bookmark:'476',code:'SERVICE-476-odoacer_476-pavia-m-Odoacer-standard-0-gothic.homoian'});
}
async function helpers(page) {
  await page.evaluate(function() {
    window.reviewEvent=function(id,index) {
      const ev=FB.eventById(id),opt=ev.options[index === undefined ? 0 : index],s=FB.state;
      const ctx=FB.eventContextFor(s,ev,{});
      if (!ctx) throw new Error('No review context: '+id);
      const q=FB.eventReviews.quote(s,opt,ctx);
      if (!q) throw new Error('No canonical quote: '+id);
      return {ev:ev,opt:opt,ctx:ctx,q:q};
    };
    window.reviewPure=function(r,reader) {
      const s=FB.state,before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      const calls=[{reader:reader,args:r.opt.review.args}];
      const repeated=Array(4).fill(0).every(function() {
        return JSON.stringify(FB.eventReviews.quote(s,r.opt,r.ctx))===JSON.stringify(r.q) &&
          FB.eventStateReaders.test(s,calls,r.ctx) && FB.eventReviews.details(s,r.q).length>0;
      });
      return repeated && before===JSON.stringify(s) && data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
    };
    window.reviewDisabled=function(r,reader,system) {
      const s=FB.state,b=FBDATA.bookmarks[s.start.id],original=b.systems;
      b.systems=Object.assign({},original);b.systems[system]=false;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const calls=[{reader:reader,args:r.opt.review.args}];
      const disabled=!FB.eventReviews.quote(s,r.opt,r.ctx) && !FB.eventStateReaders.test(s,calls,r.ctx) &&
        !FB.eventStateReaders.test(s,[Object.assign({},calls[0],{not:true})],r.ctx) &&
        !FB.eventReviews.commit(s,r.opt,r.ctx,r.q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      b.systems=original;return disabled;
    };
    window.reviewReject=function(r,change) {
      const fork=JSON.parse(JSON.stringify(FB.state));change(fork);
      const before=JSON.stringify(fork),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !FB.eventReviews.commit(fork,r.opt,r.ctx,r.q) && before===JSON.stringify(fork) && rng===FB.getRngState() && uid===FB.getUidCounter();
    };
    window.reviewRestore=function() {
      // Use the ordinary boundary to retire peace-time test hosts before the
      // checkpoint; restore must not be asked to retain a demobilized banner.
      FB.repairWars(FB.state);
      function facts(s) {return {contracts:s.authority.contracts,migrations:s.authority.migrations,
        stories:s.stories,population:s.population,owner:s.owner,holder:s.holder,armies:s.armies,
        gold:s.player.gold,holdings:s.holdings,buildings:s.buildings,queue:s.eventQueue,
        home:[s.player.charId,s.player.provinceId,s.player.homeSettlement,s.player.travel,s.player.provs],
        people:Object.keys(s.chars).sort().map(function(id) {const c=s.chars[id];return [id,c.name,c.born,c.sex,c.culture,c.religion,c.homeProvinceId,c.fatherId,c.motherId,c.spouseId];}),
        accounts:Object.keys(s.realms).sort().map(function(id) {const t=s.realms[id].treasury;return [id,t && t.gold,t && t.militaryAccrued];})};}
      function canonical(v) {if (!v || typeof v!=='object') return JSON.stringify(v);
        if (Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
        return '{'+Object.keys(v).sort().map(function(k) {return JSON.stringify(k)+':'+canonical(v[k]);}).join(',')+'}';}
      const original=facts(FB.state),before=canonical(original),rng=FB.getRngState()>>>0,uid=FB.getUidCounter(),sig=FB.mods.sig();
      for (let i=0;i<2;i++) {
        FB.save.restore(JSON.parse(FB.save.serialize()));
        const after=facts(FB.state);
        if (before!==canonical(after)) throw new Error('Restore changed '+Object.keys(after).filter(function(k) {return canonical(original[k])!==canonical(after[k]);}).join(', '));
        if (rng!==(FB.getRngState()>>>0) || uid!==FB.getUidCounter() || sig!==FB.mods.sig())
          throw new Error('Restore counters '+JSON.stringify({rng:rng,afterRng:FB.getRngState()>>>0,uid:uid,afterUid:FB.getUidCounter(),signature:sig===FB.mods.sig()}));
      }return true;
    };
  });
}

test('the estuary review example is admitted against the unmodded catalogue and imports through the Mods file picker',async function({page},info) {
  await pickerImport(page,info);
  expect(await page.evaluate(function() {
    return {count:FB.mods.count(),stored:JSON.parse(localStorage.getItem(FB.storageKey('fb_mods')) || '[]').map(function(text) {return JSON.parse(text);})};
  })).toEqual({count:1,stored:[example]});
});

test('ordinary JSON review candidates validate atomically in their actual dated composition and preserve legacy choices',async function({page},info) {
  await imported(page,info,false);
  const result=await page.evaluate(function(mod) {
    const before=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),input=JSON.stringify(mod),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const rejected=[];
    function reject(change) {
      const m=JSON.parse(input);change(m);const original=JSON.stringify(m),faults=FB.mods.validate(m);
      let failed=false;try {FB.mods.apply(m);} catch(error) {failed=true;}
      rejected.push(faults.length>0 && failed && original===JSON.stringify(m));
    }
    reject(function(m) {m.events[0].options[0].review.args.action='pay_everyone';});
    reject(function(m) {m.events[0].options[0].review.args.payPerSeason=10;});
    reject(function(m) {m.events[1].options[0].review.args.extensionDays=0;});
    reject(function(m) {m.events[3].options[0].review.args.settleDirectly=true;});
    reject(function(m) {m.events[4].options[0].review.args.storyId='absent_route';});
    reject(function(m) {m.events[6].options[0].review.args.storyId='estuary_civilians';});
    reject(function(m) {m.events[6].options[0].review.args.personId='unbound_person';});
    reject(function(m) {m.events[6].participantCards=[];});
    reject(function(m) {m.events[6].bookmarkIds=['476'];});
    reject(function(m) {m.events[6].options[0].review.args.requestId='another_request';});
    reject(function(m) {m.events[9].trigger.state[0].args.status='lost';});
    [0,361,'30'].forEach(function(days) {reject(function(m) {
      m.events[9].trigger.state=[{reader:'federate_contract',args:{realmId:'player',status:'active',endsWithinDays:days}}];
    });});
    const legacy=JSON.parse(JSON.stringify(FB.eventById('hosted_refuge_question')));
    legacy.options[2].review={type:'story_choice',args:{storyId:'mainz_household_track_1096',choiceId:'plans'},refusalOption:1};
    const candidate=JSON.parse(data);candidate.storyInstances.unrelated_broken_story={id:'unrelated_broken_story',type:'unknown'};
    const isolated=FB.validateEventReviews(legacy,{data:candidate}).length===0;
    legacy.options[2].review.args.choiceId='absent_choice';
    const badLegacy=FB.validateEventReviews(legacy,{data:candidate}).length>0;
    return {rejected:rejected,isolated:isolated,badLegacy:badLegacy,pure:before===JSON.stringify(FB.state) && data===JSON.stringify(FBDATA) &&
      input===JSON.stringify(mod) && rng===FB.getRngState() && uid===FB.getUidCounter() && sig===FB.mods.sig()};
  },example);
  expect(result).toEqual({rejected:Array(14).fill(true),isolated:true,badLegacy:true,pure:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' contract reviews preserve consent, finite pay, renewal, refusal and exact restore',async function({page},info) {
  if (json) await imported(page,info,true);else await nativeRuler(page,info);
  await helpers(page);
  const result=await page.evaluate(function(json) {
    const s=FB.state,Q=FB.political,patron=json?'inventory_ridge_court':'italy';
    const at=s.player.provinceId,army={id:'review_service_host',realm:'player',at:at,from:at,men:80,size:80,units:{levy:80},path:[],goal:null,moveLeft:0,supply:100};
    s.armies.push(army);s.realms[patron].treasury.gold=200;
    const offer=FB.authorityOfferContractTemplate(s,json?'estuary_service':'paid_service',{
      patronRealmId:patron,federateRealmId:'player',hostId:army.id,initialPay:json?13:11});
    if (!offer || !FB.authorityConsentContract(s,offer.id,patron)) throw new Error('Other court consent failed');
    const r=reviewEvent(json?'estuary_federate_contract_consent':'federate_pay_table',json?0:2);
    if (!FB.queueEvent(s,r.ev.id,r.ctx)) throw new Error('Contract context was not queued');
    const pure=reviewPure(r,'federate_contract_review'),disabled=reviewDisabled(r,'federate_contract_review','event_federates');
    const missing=!FB.eventReviews.quote(s,r.opt,{participants:r.ctx.participants});
    const stale=reviewReject(r,function(t) {t.realms[patron].ruler.generation=FB.realmRulerGeneration(t,patron)+1;});
    const dead=reviewReject(r,function(t) {t.chars[r.ctx.participants.patron].dead=true;});
    const poor=reviewReject(r,function(t) {t.realms[patron].treasury.gold=0;});
    const noAuthority=reviewReject(r,function(t) {t.player.charId=r.ctx.participants.patron;});
    const noQuote=!FB.resolveEventOption(s,r.ev,r.opt,r.ctx,{});
    const fork=JSON.parse(JSON.stringify(s)),direct=FB.authorityConsentContract(fork,offer.id,'player');
    const auto=JSON.parse(JSON.stringify(s)),automatic=FB.resolveEventOption(auto,r.ev,r.opt,r.ctx,{automated:true});
    const land=JSON.stringify([s.owner,s.holder,s.population]),paidBefore=FB.treasuryAvailable(s,patron);
    const committed=!!FB.resolveEventOption(s,r.ev,r.opt,r.ctx,{reviewed:r.q});
    const localEvent=FB.eventById(json?'estuary_service_household':'federate_shared_well');
    const localBefore=JSON.stringify(s),localRng=FB.getRngState(),localUid=FB.getUidCounter();
    const local=Array(4).fill(0).every(function() {return FB.checkTrigger(s,localEvent.trigger,{});}) && localBefore===JSON.stringify(s) &&
      localRng===FB.getRngState() && localUid===FB.getUidCounter();
    const raw=FBDATA.bookmarks[s.start.id],systems=raw.systems;
    raw.systems=Object.assign({},systems,{event_federates:false});
    const localDisabled=!FB.checkTrigger(s,localEvent.trigger,{}) &&
      !FB.eventStateReaders.test(s,[{reader:'federate_host_household',args:{status:'active'},not:true}],{});
    raw.systems=systems;
    const distant=JSON.parse(JSON.stringify(s));distant.armies.find(function(a) {return a.id===army.id;}).moveLeft=1;
    const noMoving= !FB.checkTrigger(distant,localEvent.trigger,{});
    const parity=direct && automatic && JSON.stringify(s.authority.contracts)===JSON.stringify(fork.authority.contracts) &&
      JSON.stringify(s.authority.contracts)===JSON.stringify(auto.authority.contracts) && FB.treasuryAvailable(s,patron)===FB.treasuryAvailable(fork,patron);
    const duplicate=!FB.eventReviews.commit(s,r.opt,r.ctx,r.q),cost=paidBefore-FB.treasuryAvailable(s,patron);
    if (!json) {s.turn=offer.endTurn-15;s.date=FB.dateAtTurn(s,s.turn);}
    const renew=reviewEvent(json?'estuary_federate_contract_renew':'federate_term_calendar',json?0:2);
    const renewed=FB.eventReviews.commit(s,renew.opt,renew.ctx,renew.q),row=Q.contract(s,offer.id);
    const reset=renewed && row.status==='offered' && Object.keys(row.approvals).length===0 && !row.effective;
    const release=reviewEvent(json?'estuary_federate_contract_release':'federate_season_call',json?0:2);
    const refused=JSON.parse(JSON.stringify(s)),refusal=!!FB.resolveEventOption(refused,release.ev,release.ev.options[1],release.ctx,{automated:true}) &&
      JSON.stringify(refused.authority)===JSON.stringify(s.authority) && refused.player.gold===s.player.gold;
    const denied=JSON.parse(JSON.stringify(s));denied.chars[release.ctx.participants.patron].captive=true;
    const oldAuthority=JSON.stringify(denied.authority),fallback=!!FB.resolveEventOption(denied,release.ev,release.opt,release.ctx,{automated:true}) &&
      oldAuthority===JSON.stringify(denied.authority);
    const released=FB.eventReviews.commit(s,release.opt,release.ctx,release.q) && Q.contract(s,offer.id).transitionReason==='service_released';
    return {pure:pure,disabled:disabled,missing:missing,stale:stale,dead:dead,poor:poor,noAuthority:noAuthority,noQuote:noQuote,
      committed:committed,local:local,localDisabled:localDisabled,noMoving:noMoving,parity:!!parity,duplicate:duplicate,cost:cost,reset:reset,refusal:refusal,fallback:fallback,released:released,
      land:land===JSON.stringify([s.owner,s.holder,s.population]),restored:reviewRestore()};
  },json);
  expect(result).toEqual({pure:true,disabled:true,missing:true,stale:true,dead:true,poor:true,noAuthority:true,noQuote:true,
    committed:true,local:true,localDisabled:true,noMoving:true,parity:true,duplicate:true,cost:json?13:11,reset:true,refusal:true,fallback:true,released:true,land:true,restored:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' existing moving-court claim settles only after arrival and consent',async function({page},info) {
  if (json) await imported(page,info,'following');else await nativeRuler(page,info);
  await helpers(page);
  const result=await page.evaluate(function(json) {
    const s=FB.state,patron=json?'inventory_estuary_court':'italy',target=json?'inventory_marsh':'ravenna';
    const army={id:'review_settlement_host',realm:'player',at:target,from:target,men:80,size:80,units:{levy:80},path:[],goal:null,moveLeft:0,supply:100};
    s.armies.push(army);s.realms[patron].treasury.gold=200;
    const moving=FB.federateBeginMigration(s,{realmId:'player',patronRealmId:patron,origin:target,target:target,
      hostId:army.id,endTurn:s.turn+360,settlementForm:'regnum'});
    if (!moving || !FB.federateRequest(s,moving.id,'land',json?'estuary_service':'paid_service')) throw new Error('Existing claim setup failed');
    const deal=FB.political.movingPolity(s,moving.id).contractId;
    FB.authorityConsentContract(s,deal,patron);FB.authorityConsentContract(s,deal,'player');
    army.at=target;army.moveLeft=0;s.player.provinceId=json?'inventory_quay':'pavia';
    const r=reviewEvent(json?'estuary_federate_settlement_settle':'federate_settlement_copy',json?0:2);
    if (!FB.queueEvent(s,r.ev.id,r.ctx)) throw new Error('Settlement context was not queued');
    const pure=reviewPure(r,'federate_settlement_review'),disabled=reviewDisabled(r,'federate_settlement_review','event_federates');
    const denied=[function(t) {t.armies.find(function(a) {return a.id===army.id;}).moveLeft=1;},
      function(t) {t.holder[target]='player';},function(t) {t.chars[r.ctx.participants.patron].dead=true;},
      function(t) {t.authority.contracts.find(function(c) {return c.id===deal;}).approvals={};}].map(function(change) {return reviewReject(r,change);});
    const before=JSON.stringify([s.population,s.player.holdings,s.player.gold]);
    const fork=JSON.parse(JSON.stringify(s)),direct=FB.federateResolveSettlement(fork,moving.id,r.q.quote.canonical);
    const auto=JSON.parse(JSON.stringify(s)),automated=!!FB.resolveEventOption(auto,r.ev,r.opt,r.ctx,{automated:true});
    const committed=!!FB.resolveEventOption(s,r.ev,r.opt,r.ctx,{reviewed:r.q});
    return {pure:pure,disabled:disabled,denied:denied,committed:committed,parity:direct && automated &&
      s.owner[target]===fork.owner[target] && s.owner[target]===auto.owner[target] &&
      JSON.stringify(s.authority.migrations)===JSON.stringify(fork.authority.migrations),
      duplicate:!FB.eventReviews.commit(s,r.opt,r.ctx,r.q),owner:s.owner[target],
      settled:FB.political.movingPolity(s,moving.id).status,form:FB.political.government(s,{kind:'realm',id:'player'}).formId,
      conserved:before===JSON.stringify([s.population,s.player.holdings,s.player.gold]),restored:reviewRestore()};
  },json);
  expect(result).toEqual({pure:true,disabled:true,denied:Array(4).fill(true),committed:true,parity:true,duplicate:true,
    owner:'player',settled:'settled',form:'regnum',conserved:true,restored:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' civilian review conserves the live community and rechecks its ruler and route',async function({page},info) {
  if (json) await imported(page,info,true);else await nativeRuler(page,info);
  await helpers(page);
  const result=await page.evaluate(function(json) {
    let s=FB.state;const id=json?'estuary_civilians':'norican_evacuation_476',from=json?'inventory_quay':'wien',to=json?'inventory_marsh':'ravenna';
    if (!json) {
      s.date.year=488;s.turn=12*360;
      FB.transferProvince(s,to,'player');FB.transferProvince(s,from,'player');
      Object.assign(s.stories.rugian_frontier_476,{phase:'resolved',result:'won',reason:'objective_secured',outcomeTurn:s.turn});
      // Normalize the directly staged future court before its first review.
      const population=JSON.stringify(s.population),record=JSON.stringify(s.stories[id]);
      FB.save.restore(JSON.parse(FB.save.serialize()));s=FB.state;
      if (population!==JSON.stringify(s.population) || record!==JSON.stringify(s.stories[id])) throw new Error('Staging replayed the civilian route');
    }
    const r=reviewEvent(json?'estuary_civilian_migration_authorize':'federate_departure_bundle',json?0:2);
    if (!FB.queueEvent(s,r.ev.id,r.ctx)) throw new Error('Civilian context was not queued');
    const pure=reviewPure(r,'civilian_migration_review'),disabled=reviewDisabled(r,'civilian_migration_review','event_story_tracks');
    const stale=reviewReject(r,function(t) {t.realms.player.ruler.generation=FB.realmRulerGeneration(t,'player')+1;});
    const denied=reviewReject(r,function(t) {t.owner[to]=json?'inventory_ridge_court':'italy';});
    const dead=reviewReject(r,function(t) {t.chars[t.player.charId].dead=true;});
    const absent=JSON.parse(JSON.stringify(s));delete absent.stories[id];
    const absentBefore=JSON.stringify(absent),missing=!FB.eventReviews.quote(absent,r.opt,r.ctx) && absentBefore===JSON.stringify(absent);
    const fork=JSON.parse(JSON.stringify(s)),direct=FB.stories.apply(fork,id,'authorize',r.q.quote.review);
    const auto=JSON.parse(JSON.stringify(s)),automated=!!FB.resolveEventOption(auto,r.ev,r.opt,r.ctx,{automated:true});
    const total=FB.countyPopulation(s,from)+FB.countyPopulation(s,to),source=FB.countyPopulation(s,from),land=JSON.stringify([s.owner,s.holder,s.armies]);
    const committed=!!FB.resolveEventOption(s,r.ev,r.opt,r.ctx,{reviewed:r.q});
    const once=JSON.stringify(s.population);FB.stories.get(id).day(s,s.stories[id]);
    return {pure:pure,disabled:disabled,stale:stale,denied:denied,dead:dead,missing:missing,committed:committed,
      parity:direct && automated && JSON.stringify(s.population)===JSON.stringify(fork.population) && JSON.stringify(s.population)===JSON.stringify(auto.population),
      moved:source-FB.countyPopulation(s,from),conserved:total===FB.countyPopulation(s,from)+FB.countyPopulation(s,to),
      once:once===JSON.stringify(s.population),land:land===JSON.stringify([s.owner,s.holder,s.armies]),restored:reviewRestore()};
  },json);
  expect(result).toEqual({pure:true,disabled:true,stale:true,denied:true,dead:true,missing:true,committed:true,parity:true,
    moved:json?17:1000,conserved:true,once:true,land:true,restored:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' refuge reviews retain exact people, separate consent and finite public funding',async function({page},info) {
  if (json) await imported(page,info,false);else await beginBookmark(page,info,'1096','mainz_jewish_household_1096');
  await helpers(page);
  const result=await page.evaluate(function(json) {
    const s=FB.state,id=json?'river_refuge':'mainz_refuge_1096',party=json?'river_party':'mainz_party_1096',actor=s.player.charId;
    const P=FB.householdParties;
    ['invite','accept'].forEach(function(action) {if (!P.commit(s,P.review(s,party,action,actor,actor))) throw new Error('Named party setup failed');});
    const r=reviewEvent(json?'estuary_household_refuge_request':'hosted_refuge_question',json?0:2);
    if (!FB.queueEvent(s,r.ev.id,r.ctx)) throw new Error('Refuge context was not queued');
    const pure=reviewPure(r,'household_refuge_review'),disabled=reviewDisabled(r,'household_refuge_review','event_story_tracks');
    const denied=reviewReject(r,function(t) {t.chars[r.ctx.participants.refuge_host].dead=true;});
    const stale=reviewReject(r,function(t) {t.stories[party].members[0].status='declined';});
    const fork=JSON.parse(JSON.stringify(s)),direct=FB.stories.apply(fork,id,r.q.quote.source.choiceId,r.q.quote.review);
    const auto=JSON.parse(JSON.stringify(s)),automated=!!FB.resolveEventOption(auto,r.ev,r.opt,r.ctx,{automated:true});
    const land=JSON.stringify([s.owner,s.holder,s.population,s.player.gold]);
    const committed=!!FB.resolveEventOption(s,r.ev,r.opt,r.ctx,{reviewed:r.q}),request=s.stories[id].requests[0];
    const parity=direct && automated && JSON.stringify(s.stories[id])===JSON.stringify(fork.stories[id]) && JSON.stringify(s.stories[id])===JSON.stringify(auto.stories[id]);
    const noAutoConsent=request.members[0].consentBy===null;
    const R=FB.householdRefuges;
    if (!R.commit(s,R.review(s,id,'consent',actor,{requestId:request.id,personId:actor}))) throw new Error('Explicit shelter consent failed');
    const saved=JSON.parse(JSON.stringify(s)),gold=FB.treasuryAvailable(s,request.provider.realmId);
    if (!R.commit(s,R.review(s,id,'authorize',request.provider.rulerId,{requestId:request.id})) ||
        !R.commit(s,R.review(s,id,'offer',request.provider.incumbentId,{requestId:request.id}))) throw new Error('Provider offer failed');
    FB.stories.get(id).day(saved,saved.stories[id]);
    const providerParity=JSON.stringify(saved.stories[id])===JSON.stringify(s.stories[id]);
    const charge=gold-FB.treasuryAvailable(s,request.provider.realmId);
    let entered;
    if (json) {const enter=reviewEvent('estuary_household_refuge_enter');entered=FB.eventReviews.commit(s,enter.opt,enter.ctx,enter.q);}
    else entered=R.commit(s,R.review(s,id,'enter',actor,{requestId:request.id,personIds:[actor]}));
    const present=!!R.presence(s,actor),people=request.members.map(function(m) {return m.personId;});
    const restored=reviewRestore();
    return {pure:pure,disabled:disabled,denied:denied,stale:stale,committed:committed,parity:!!parity,noAutoConsent:noAutoConsent,
      providerParity:providerParity,charge:charge,entered:entered,present:present,people:people.length,
      land:land===JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,FB.state.player.gold]),restored:restored};
  },json);
  expect(result).toEqual({pure:true,disabled:true,denied:true,stale:true,committed:true,parity:true,noAutoConsent:true,
    providerParity:true,charge:json?1.75:0,entered:true,present:true,people:1,land:true,restored:true});
});

for (const kind of ['household_refuge','federate_contract','federate_settlement','civilian_migration'])
for (const phone of (kind==='household_refuge'?[false,true]:[false])) test((phone?'compact':'desktop')+' '+kind+' cancellation, stale confirmation and refusal preserve the household',async function({page},info) {
  await page.setViewportSize(phone?{width:390,height:700}:{width:1280,height:720});
  await imported(page,info,kind==='federate_settlement'?'following':kind!=='household_refuge');await helpers(page);
  await page.evaluate(function(kind) {
    const s=FB.state,P=FB.householdParties,actor=s.player.charId;
    if (kind==='household_refuge') ['invite','accept'].forEach(function(action) {P.commit(s,P.review(s,'river_party',action,actor,actor));});
    const patron=kind==='federate_settlement'?'inventory_estuary_court':'inventory_ridge_court';
    const target=kind==='federate_settlement'?'inventory_marsh':'inventory_ridge';
    if (kind==='federate_contract' || kind==='federate_settlement') {
      const army={id:'review_ui_host',realm:'player',at:target,from:target,men:80,size:80,units:{levy:80},path:[],goal:null,moveLeft:0,supply:100};
      s.armies.push(army);s.realms[patron].treasury.gold=200;
      if (kind==='federate_contract') {
        const offer=FB.authorityOfferContractTemplate(s,'estuary_service',{patronRealmId:patron,federateRealmId:'player',hostId:army.id});
        FB.authorityConsentContract(s,offer.id,patron);
      } else {
        const moving=FB.federateBeginMigration(s,{realmId:'player',patronRealmId:patron,origin:target,target:target,
          hostId:army.id,endTurn:s.turn+360,settlementForm:'regnum'});
        if (!moving || !FB.federateRequest(s,moving.id,'land','estuary_service')) throw new Error('UI settlement setup failed');
        const deal=FB.political.movingPolity(s,moving.id).contractId;
        FB.authorityConsentContract(s,deal,patron);FB.authorityConsentContract(s,deal,'player');army.at=target;army.moveLeft=0;
      }
    }
    Object.assign(FB.game.auto,{all:false,major:false,minor:false});
    const action={household_refuge:'request',federate_contract:'consent',federate_settlement:'settle',civilian_migration:'authorize'}[kind];
    const r=reviewEvent('estuary_'+kind+'_'+action);
    FB.ui.runEvents([{id:r.ev.id,ctx:r.ctx}]);
    window.cancelBefore=JSON.stringify(s);window.cancelRng=FB.getRngState();window.cancelUid=FB.getUidCounter();
    window.cancelNode=document.querySelector('#ev-options .evopt');
    window.cancelFacts=JSON.stringify([s.authority.contracts,s.authority.migrations,s.stories,s.population,s.player.gold,s.owner,s.holder]);
  },kind);
  const option=page.locator('#ev-options .evopt').first();
  for (const exit of ['cancel','escape','back']) {
    await expect.poll(function() {return page.evaluate(function() {return !FB.ui.eventInputGuarded();});}).toBe(true);
    await option.click();await expect(page.locator('#event-review-cancel')).toBeVisible();
    await expect.poll(function() {return page.evaluate(function() {return !FB.ui.eventInputGuarded();});}).toBe(true);
    if (exit==='cancel') await page.locator('#event-review-cancel').click();
    else if (exit==='escape') await page.keyboard.press('Escape');else await page.locator('#event-nav-back').click();
    await expect(option).toBeVisible();
    expect(await page.evaluate(function() {return cancelBefore===JSON.stringify(FB.state) && cancelRng===FB.getRngState() && cancelUid===FB.getUidCounter() &&
      cancelNode===document.querySelector('#ev-options .evopt') && document.activeElement===cancelNode;})).toBe(true);
  }
  await expect.poll(function() {return page.evaluate(function() {return !FB.ui.eventInputGuarded();});}).toBe(true);
  await option.click();
  await page.evaluate(function(kind) {
    if (kind==='federate_settlement') FB.state.armies.find(function(a) {return a.id==='review_ui_host';}).supply--;
    else FB.state.turn++;
    window.staleBefore=JSON.stringify(FB.state);
  },kind);
  await expect.poll(function() {return page.evaluate(function() {return !FB.ui.eventInputGuarded();});}).toBe(true);
  await page.locator('#event-review-confirm').click();await expect(page.locator('#ev-text')).toContainText('Nothing was spent');
  expect(await page.evaluate(function() {return staleBefore===JSON.stringify(FB.state);})).toBe(true);
  await expect.poll(function() {return page.evaluate(function() {return !FB.ui.eventInputGuarded();});}).toBe(true);
  await page.locator('#ev-options .evopt').nth(1).click();
  await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
  expect(await page.evaluate(function() {
    const s=FB.state;return cancelFacts===JSON.stringify([s.authority.contracts,s.authority.migrations,s.stories,s.population,s.player.gold,s.owner,s.holder]);
  })).toBe(true);
});
