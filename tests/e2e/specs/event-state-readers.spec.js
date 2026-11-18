'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {engineSources} = require('../support/source-literals');
const {contentIdMetric,metricProblems} = require('../support/content-id-reviews');
const imported = require('../fixtures/authoring/event-state-readers-fictional.json');
dependsOnRuntime(__filename,['js/schema.js','js/events.js','js/mods.js','js/systems.js','js/governments.js',
  'js/authority.js','js/federates.js','js/mobile_confederations.js','js/religious_institutions.js',
  'js/industry_laws.js','js/episcopal_claims.js','js/religious_cases.js','js/story_track.js',
  'js/stories.js','js/save.js','js/save_v4.js','js/model.js','js/justice.js','js/world.js',
  'data/events_common.js','data/systems.js','data/technology.js','data/industry_laws.js',
  'data/episcopal_claims.js','data/religious_cases.js','data/political_institutions.js',
  'data/religious_institutions.js','data/mobile_confederations.js','data/story_households_867.js']);

async function startImported(page,info,bookmark,code) {
  await openGame(page,info);
  expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},imported)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/event-state-readers-fictional.json'));
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await startHistoricalGame(page,info,{bookmark:bookmark,code:code});
  await page.evaluate(function () {
    window.exerciseReader = function (id,change) {
      const s = FB.state, all = FBDATA.events, ev = FB.eventById(id);
      const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      const read = FB.checkTrigger(s,ev.trigger);
      const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
      FBDATA.events = [ev]; FB.invalidateEventIndex();
      function pick() {s.eventQueue=[];s.slotDays=[s.date.day];return FB.pickDailyEvents(s).map(function (e) {return e.id;});}
      const positive = pick(); change();
      const after = FB.getRngState(), negative = pick();
      FBDATA.events = all; FB.invalidateEventIndex();
      return {id:id,read:read,pure:pure,positive:positive,negative:negative,rejectionPure:after === FB.getRngState()};
    };
  });
}
function expectReaders(rows) {
  for (const row of rows) expect(row,row.id).toEqual({id:row.id,read:true,pure:true,
    positive:[row.id],negative:[],rejectionPure:true});
}

test('trusted reader registrations preserve the closed content-id metric',async function ({page},info) {
  await openGame(page,info);
  const tables=await page.evaluate(function () {
    const out={};
    function plain(v) {return !!v && Object.prototype.toString.call(v)==='[object Object]';}
    function walk(name,value,depth) {
      if (Array.isArray(value)) {
        const ids=value.filter(function (v) {return plain(v) && typeof v.id==='string';}).map(function (v) {return v.id;});
        if (ids.length) out[name]=ids;return;
      }
      if (!plain(value)) return;
      const keys=Object.keys(value);if (!keys.length) return;
      if (keys.every(function (k) {return plain(value[k]);})) {out[name]=keys;return;}
      if (depth<2) keys.forEach(function (k) {walk(name+'.'+k,value[k],depth+1);});
    }
    Object.keys(FBDATA).forEach(function (k) {walk(k,FBDATA[k],0);});return out;
  });
  const reviews=require('../fixtures/engine-ids/content-id-allowlist.json'),owners=new Map();
  Object.keys(tables).forEach(function (table) {
    if (reviews.ignoredTables.some(function (row) {return table===row.table || table.indexOf(row.table+'.')===0;})) return;
    tables[table].forEach(function (id) {if (id.length>=3) owners.set(id,[table]);});
  });
  expect(metricProblems(contentIdMetric(engineSources(),owners,reviews.hooks),
    require('../fixtures/engine-ids/content-id-metric.json'))).toEqual([]);
});

test('ordinary candidate validation rejects unknown readers, malformed arguments and fields atomically',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (mod) {
    const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter(), input = JSON.stringify(mod);
    const trials = [];
    function reject(edit) {
      const bad = JSON.parse(input);edit(bad);
      const original = JSON.stringify(bad), faults = FB.mods.validate(bad);
      let threw = false;try {FB.mods.apply(bad);} catch (e) {threw=true;}
      trials.push({rejected:!!faults.length && threw,input:original === JSON.stringify(bad),live:before === JSON.stringify(FBDATA)});
    }
    reject(function (m) {m.events[0].trigger.state[0].reader='missing_reader';});
    reject(function (m) {m.events[0].trigger.state[0].args.formId=14;});
    reject(function (m) {m.events[0].trigger.state[0].args.formId='missing_form';});
    reject(function (m) {m.events[0].trigger.state[0].args.extra=true;});
    reject(function (m) {m.events[1].options[0].require.state[0].not='yes';});
    reject(function (m) {m.events[0].trigger.state=[];});
    reject(function (m) {m.eventSubscriptions.fictional_lifecycle[0].require.state[0].reader='missing_reader';});
    reject(function (m) {m.events.find(function (e) {return e.id==='fictional_story';}).trigger.state[0].args.stage='missing_stage';});
    const accepted = FB.mods.validate(mod);
    const metadata=FBDATA.systems.event_authority,owner=metadata.eventReaderOwner;
    metadata.eventReaderOwner='governments';const duplicate=FB.systems.validate().length>0;
    metadata.eventReaderOwner=12;const malformed=FB.systems.validate().length>0;
    metadata.eventReaderOwner=owner;
    let sealed=false;try {FB.eventStateReaders.register({id:'late_reader',system:'governments',args:{type:'object',fields:{}},read:function () {return true;}});} catch (e) {sealed=true;}
    return {trials:trials,accepted:accepted,ownerValidation:duplicate && malformed,sealed:sealed,input:input === JSON.stringify(mod),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  },imported);
  expect(result.trials).toEqual(Array(8).fill({rejected:true,input:true,live:true}));
  expect(result).toMatchObject({accepted:[],ownerValidation:true,sealed:true,input:true,pure:true});
});

test('imported government, appointment, recognition, institution and story predicates select and reject',async function ({page},info) {
  await startImported(page,info,'867','READERS-867-farmer-london-m-Reader');
  const rows = await page.evaluate(function () {
    const s=FB.state,p=s.player,me=s.chars[p.charId],out=[],rid=FB.playerRealmId(s),pid=p.provinceId;
    FB.authoritySetGovernment(s,rid,'territorial');
    out.push(exerciseReader('fictional_sovereign',function () {FB.authoritySetGovernment(s,rid,'regnum');}));
    const holder=FB.settlementCountyHolder(s,pid);FB.authoritySetGovernment(s,holder,'territorial');
    out.push(exerciseReader('fictional_holder',function () {FB.authoritySetGovernment(s,holder,'regnum');}));
    FB.authoritySetGovernment(s,holder,'territorial');
    const appointment=FB.authorityAppoint(s,{officeId:'defensor_civitatis',institutionId:holder,
      appointer:{kind:'realm',id:holder},holder:{kind:'character',id:p.charId},scope:{kind:'county',id:pid}});
    if (!appointment) throw new Error('Appointment setup rejected');
    out.push(exerciseReader('fictional_office',function () {FB.authorityAppointmentTransition(s,appointment.id,'remove');}));
    me.career.guildRank='guildmaster';
    out.push(exerciseReader('fictional_guild_office',function () {me.career.guildRank='member';}));
    const recognition=FB.authorityRecognize(s,{source:'civic_acceptance',issuer:{kind:'county',id:pid},
      subject:{kind:'character',id:p.charId},scope:{kind:'county',id:pid}});
    if (!recognition) throw new Error('Recognition setup rejected');
    out.push(exerciseReader('fictional_recognition',function () {FB.authorityRecognitionTransition(s,recognition.id,'revoke');}));
    const profile=JSON.parse(JSON.stringify(FBDATA.religiousInstitutionProfiles.sasanian_lay_service));
    profile.faithIds=[me.religion];profile.period={yearMin:1,yearMax:null};
    FBDATA.religiousInstitutionProfiles.fictional_learning=profile;
    const bm=FB.campaignBookmark(s),defs=Object.assign({},bm.localInstitutions || {});
    defs.fictional_learning_house={city:'Fictional learning house',kind:'school',provinceId:null,site:null,
      offMap:true,religion:me.religion,culture:me.culture,profileId:'fictional_learning',vacant:true,jurisdictionIds:[]};
    const raw=FBDATA.bookmarks[s.start.id];
    (raw.revisions ? raw.revisions[s.start.revision || 'baseline'] : raw).localInstitutions=defs;
    s.localInstitutions=s.localInstitutions || {};
    s.localInstitutions.fictional_learning_house=FB.religiousInstitutionOpeningRow('fictional_learning_house',defs.fictional_learning_house);
    const q=FB.religiousInstitutionQuote(s,'fictional_learning_house',{kind:'character',id:p.charId},'admit',{roleId:'learner'});
    if (!q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error('Membership setup: '+JSON.stringify(q));
    const member=s.localInstitutions.fictional_learning_house.members[p.charId];
    out.push(exerciseReader('fictional_institution',function () {member.status='withdrawn';}));
    member.status='active';
    out.push(exerciseReader('fictional_role',function () {me.dead=true;}));me.dead=false;
    s.stories=s.stories || {};s.stories.york_household_track_867={phase:'household',result:null};
    out.push(exerciseReader('fictional_story',function () {s.stories.york_household_track_867.phase='offer';}));
    return out;
  });
  expectReaders(rows);
});

test('imported coalition membership, role, thirty-day scarcity and contract state use current bounded facts',async function ({page},info) {
  await startImported(page,info,'476','READERS-476-mobile_household_476-cherson-m-Reader-established');
  const rows = await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='pontic_following_476',r=M.row(s,rid),out=[];
    const m=r.members[0];m.principal={kind:'character',id:s.player.charId};m.allegiance=true;
    r.leaderId=s.player.charId;
    out.push(exerciseReader('fictional_member',function () {m.allegiance=false;}));m.allegiance=true;
    out.push(exerciseReader('fictional_leader',function () {r.leaderId=null;}));r.leaderId=s.player.charId;
    const target=M.total(s,rid)*M.profile(s,rid).foodPerPerson*30;r.food=target-1;
    out.push(exerciseReader('fictional_scarcity',function () {r.food=target;}));
    const patron=s.owner[s.player.provinceId],contract={id:'fictional_service',status:'active',patronRealmId:patron,
      federateRealmId:rid,hostId:null,recognitionId:null,endTurn:s.turn+30,
      succession:{patron:FB.realmRulerGeneration(s,patron),federate:FB.realmRulerGeneration(s,rid)}};
    s.authority.contracts.push(contract);
    out.push(exerciseReader('fictional_contract',function () {contract.endTurn=s.turn;}));
    return out;
  });
  expectReaders(rows);
});

test('native and imported enterprise-law and open case observations delegate to the canonical projections',async function ({page},info) {
  await startImported(page,info,'1204','READERS-1204-baron-roma-m-Reader');
  const rows=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,R=FB.religiousCases,out=[],p=s.player;
    const slot=FB.directSettlements(s,{kind:'character',id:p.charId}).filter(function (v) {return v.provinceId==='roma'&&v.settlement>0;})[0];
    const index=slot ? slot.settlement : 1;FB.rememberSettlementSites(s,'roma');
    if (!slot && !FB.assignSettlementLordship(s,'roma',index,p.charId)) throw new Error('Property setup');
    const q=C.quote(s,'roman_temporal_rent',index,p.charId,'demand');
    if (!q.allowed || !C.apply(s,q)) throw new Error('Claim setup: '+JSON.stringify(q));
    out.push(exerciseReader('fictional_claim',function () {s.authority.episcopalClaims[0].status='abandoned';}));
    const court=C.courtContext(s,FBDATA.religiousCases.roman_clerical_violence);
    const victim=FB.makeCharacter(s,{name:'Fictional cleric',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-40,station:1,traitsN:0});
    victim.homeProvinceId='roma';victim.role='priest';victim.career={profession:'priest'};
    const offense=FB.justiceRecordOffense(s,court.courtId,p.charId,'abduction','material',true,victim.id,'fictional_recorded_attack');
    const charge=R.quote(s,'roman_clerical_violence',offense.id,court.bishopId,'charge');
    if (!charge.allowed || !R.apply(s,charge)) throw new Error('Case setup: '+JSON.stringify(charge));
    out.push(exerciseReader('fictional_case',function () {s.authority.religiousCases[0].status='dismissed';}));
    const d=FBDATA.industryLaws.london_stall_license,rid=FB.settlementCountyHolder(s,'london');
    p.provinceId='london';p.enterprises=[{uid:'fictional_stall',type:d.enterpriseType,provinceId:'london',settlement:0}];
    const law={id:'fictional_law_record',definitionId:'london_stall_license',issuer:{realmId:rid},terms:JSON.parse(JSON.stringify(d)),
      payeeRealmId:rid,endTurn:s.turn+360,transitionEndTurn:s.turn+30,existingEnterpriseUids:['fictional_stall'],repealedTurn:null};
    s.industryLaws={schema:1,laws:[law],permits:[],choices:[]};
    out.push(exerciseReader('fictional_law',function () {law.repealedTurn=s.turn;}));law.repealedTurn=null;
    out.push(exerciseReader('operating_terms_notice',function () {p.enterprises=[];}));
    return out;
  });
  expectReaders(rows);
});

test('option and lifecycle context guards reject stale or disabled owners without effects or RNG; restore recomputes eligibility',async function ({page},info) {
  await startImported(page,info,'867','READERS-867-farmer-london-m-Reader');
  const result=await page.evaluate(function () {
    let s=FB.state;const pid=s.player.provinceId,rid=FB.settlementCountyHolder(s,pid);
    FB.authoritySetGovernment(s,rid,'territorial');
    const ev=FB.eventById('fictional_holder'),ctx=FB.eventContextFor(s,ev,{});
    const optionEv=FB.eventById('fictional_option'),optionCtx=FB.eventContextFor(s,optionEv,{});
    const optionReady=FB.eventOptionStatus(s,optionEv,optionEv.options[0],optionCtx).ready;
    const queued=FB.queueLifecycleEvents(s,'travel_arrival',{locationId:pid}).filter(function (q) {return q.id==='fictional_lifecycle';})[0];
    const initial=FB.eventContextStillValid(s,ev,ctx) && !!queued;
    const funds=s.player.gold,rngBefore=FB.getRngState()>>>0,uidBefore=FB.getUidCounter();
    const saved=FB.save.parseExport(FB.save.exportState());FB.save.restore(saved);s=FB.state;
    const resumed=s.player.gold===funds && rngBefore===(FB.getRngState()>>>0) && uidBefore===FB.getUidCounter();
    const again=FB.save.parseExport(FB.save.exportState());FB.save.restore(again);s=FB.state;
    const twice=s.player.gold===funds && rngBefore===(FB.getRngState()>>>0) && uidBefore===FB.getUidCounter();
    const restored=FB.eventContextStillValid(s,ev,ctx),sameQueue=s.eventQueue.some(function (q) {return q.id==='fictional_lifecycle';});
    FB.authoritySetGovernment(s,rid,'regnum');
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const stale=!FB.eventContextStillValid(s,ev,ctx) &&
      !FB.eventContextStillValid(s,FB.eventById('fictional_lifecycle'),queued.ctx) &&
      FB.resolveEventOption(s,ev,ev.options[0],ctx)===false &&
      FB.eventContextStillValid(s,optionEv,optionCtx) &&
      !FB.eventOptionStatus(s,optionEv,optionEv.options[0],optionCtx).ready &&
      FB.resolveEventOption(s,optionEv,optionEv.options[0],optionCtx)===false &&
      FB.resolveEventOption(s,optionEv,optionEv.options[0],optionCtx,{automated:true})===false;
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    s.eventQueue=[queued];s.slotDays=[];
    const dropped=FB.pickDailyEvents(s).length===0 && s.eventQueue.length===0;
    FB.authoritySetGovernment(s,rid,'territorial');
    const raw=FBDATA.bookmarks[s.start.id];raw.systems=Object.assign({},raw.systems,{event_governments:false});
    const calls=ev.trigger.state,availability=FB.eventStateReaders.faults(calls,'event.state',{state:s});
    let invoked=0;const native=FB.governments.forRealm;
    FB.governments.forRealm=function () {invoked++;return native.apply(this,arguments);};
    const disabled=!FB.checkTrigger(s,{state:[Object.assign({},calls[0],{not:true})]});
    FB.governments.forRealm=native;
    return {initial:initial,optionReady:optionReady,resumed:resumed,twice:twice,restored:restored,sameQueue:sameQueue,stale:stale,pure:pure,dropped:dropped,
      availability:availability.length>0,disabled:disabled,invoked:invoked,review:FBDATA.techImpactReviews.features.state_aware_events.mode};
  });
  expect(result).toEqual({initial:true,optionReady:true,resumed:true,twice:true,restored:true,sameQueue:true,stale:true,pure:true,dropped:true,availability:true,disabled:true,invoked:0,review:'none'});
});

test('county-selector state conditions filter candidate contexts before chance and selection',async function ({page},info) {
  await startImported(page,info,'867','READERS-867-farmer-london-m-Reader');
  const result=await page.evaluate(function () {
    const s=FB.state,home=s.player.provinceId,away='paris',homeRealm=FB.settlementCountyHolder(s,home),awayRealm=FB.settlementCountyHolder(s,away);
    FB.authoritySetGovernment(s,homeRealm,'regnum');FB.authoritySetGovernment(s,awayRealm,'territorial');
    const ev=Object.assign({},FB.eventById('fictional_holder'),{contextSelector:'fixture_counties'});
    const original=FB.eventContextOptions;
    FB.eventContextOptions=function () {return [{locationId:home},{locationId:away}];};
    FBDATA.events=[ev];FB.invalidateEventIndex();s.eventQueue=[];s.slotDays=[s.date.day];
    const selected=FB.pickDailyEvents(s);
    FB.authoritySetGovernment(s,awayRealm,'regnum');s.slotDays=[s.date.day];
    const rng=FB.getRngState(),blocked=FB.pickDailyEvents(s);
    FB.eventContextOptions=original;
    return {selected:selected.map(function (e) {return {id:e.id,county:e.ctx.locationId};}),blocked:blocked,pure:rng===FB.getRngState()};
  });
  expect(result).toEqual({selected:[{id:'fictional_holder',county:'paris'}],blocked:[],pure:true});
});

test('one selection pass evaluates each distinct call once, caching false answers before chance and weighted RNG',async function ({page},info) {
  await startImported(page,info,'867','READERS-867-farmer-london-m-Reader');
  const result=await page.evaluate(function () {
    const s=FB.state,base=FB.eventById('fictional_contract'),native=FB.political.contracts;
    let reads=0;FB.political.contracts=function () {reads++;return native.apply(this,arguments);};
    const condition=base.trigger.state[0];
    FBDATA.events=[0,1,2].map(function (i) {return Object.assign({},base,{id:'duplicate_'+i,trigger:{chance:1,state:[condition]}});});
    FB.invalidateEventIndex();s.eventQueue=[];s.slotDays=[s.date.day];
    const rng=FB.getRngState(),blocked=FB.pickDailyEvents(s),first=reads,pure=rng===FB.getRngState();
    s.slotDays=[s.date.day];FB.pickDailyEvents(s);const second=reads;
    FBDATA.events.forEach(function (e) {e.trigger.state[0]=Object.assign({},condition,{not:true});});
    FB.invalidateEventIndex();s.slotDays=[s.date.day];const accepted=FB.pickDailyEvents(s);
    FB.political.contracts=native;
    return {blocked:blocked,first:first,second:second,pure:pure,positiveReads:reads-second,accepted:accepted.length};
  });
  expect(result).toEqual({blocked:[],first:1,second:2,pure:true,positiveReads:1,accepted:1});
});
