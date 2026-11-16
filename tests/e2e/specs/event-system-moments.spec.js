'use strict';
const path = require('path');
const fs = require('fs');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {restoreBookmark} = require('../support/game/bookmark-acceptance');
const {mockCrazyGames} = require('../support/crazygames');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {engineSources} = require('../support/source-literals');
const {contentIdMetric,metricProblems} = require('../support/content-id-reviews');
const imported = require('../fixtures/authoring/event-system-moments-fictional.json');
const fixturePath = path.resolve(__dirname,'../fixtures/authoring/event-system-moments-fictional.json');
const sharedPacks=['imperial_office','federate_life','civic_assembly','religious_life','kingship_succession','works_technology','mobile_life','imperial_service'];
const datedPacks=['493','568','634','711','800','1096','1204','1241'];
const packFiles=sharedPacks.concat(datedPacks).map(function (id) {return 'data/events_'+id+'.js';});
dependsOnRuntime(__filename,packFiles.concat(['index.html','data/bookmark_manifest.js','tools/i18n_catalog.py',
  'data/events_common.js','data/technology.js','data/systems.js','data/industry_laws.js',
  'data/religious_cases.js','data/episcopal_claims.js','data/political_institutions.js','data/mobile_confederations.js',
  'js/schema.js','js/events.js','js/authority.js','js/model.js','js/local_office_appointments.js',
  'js/federates.js','js/religious_institutions.js','js/mobile_confederations.js','js/mobile_camps.js','js/mobile_columns.js',
  'js/industry_laws.js','js/religious_cases.js','js/episcopal_claims.js','js/governments.js',
  'js/government_selection.js','js/story_track.js','js/stories.js','js/story_household.js',
  'js/ui_modals.js','js/save.js','js/save_v4.js','js/mods.js']));

async function start(page,info,bookmark,code) {
  await openGame(page,info);
  expect(await page.evaluate(function (mod) {return FB.mods.validate(mod);},imported)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(fixturePath);
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await startHistoricalGame(page,info,{bookmark:bookmark || '476',code:code || 'MOMENTS-476-mobile_household_476-cherson-m-Clerk-established'});
}

async function readyEvent(page) {
  await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
}

async function lawSetup(page,native) {
  return page.evaluate(function (native) {
    const s=FB.state,p=s.player,me=s.chars[p.charId];
    p.tier=1;p.profession='merchant';p.provinceId='london';p.homeSettlement=0;p.gold=2000;
    FB.setCareer(s,me,'merchant','journeyman');me.skills.dip=12;me.skills.ste=12;
    const tech=FB.realmTechRecord(s,FB.techRealmId(s));
    ['urban_markets','annual_fairs'].forEach(function (id) {if (tech.completed.indexOf(id)<0) tech.completed.push(id);});
    FB.fns.local_council_elected(s);FB.enterpriseList(s);FB.enterpriseLaborRecords(s);
    const e=FB.buyEnterprise(s,'market_stall_business',0);
    if (!e) throw new Error('Ordinary stall purchase failed');
    const id=native ? 'london_stall_license' : 'quay_stall_permission';
    const chance=FB.localCouncilMotionChance(s);
    for (let i=0;i<128;i++) {const seed=FB.getRngState();if (FB.rng()<chance) {FB.setRngState(seed);break;}}
    const q=FB.industryLaws.quoteMotion(s,id),result=FB.proposeLocalCouncilMotion(s,q.terms.motionId,q);
    if (!result || !result.passed) throw new Error('Canonical law vote failed');
    // Review after the original transition without advancing the daily loop.
    s.turn=31;p.provinceId='york';
    return {uid:e.uid,id:id,issued:s.eventQueue.filter(function (e) {return e.id==='quay_law_enacted';}).length};
  },!!native);
}

test('moment and review adapters preserve the closed content-id metric',async function ({page},info) {
  await openGame(page,info);
  const tables=await page.evaluate(function () {
    const out={};
    function plain(v) {return !!v&&Object.prototype.toString.call(v)==='[object Object]';}
    function walk(name,value,depth) {
      if (Array.isArray(value)) {
        const ids=value.filter(function (v) {return plain(v)&&typeof v.id==='string';}).map(function (v) {return v.id;});
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
    if (reviews.ignoredTables.some(function (row) {return table===row.table||table.indexOf(row.table+'.')===0;})) return;
    tables[table].forEach(function (id) {if (id.length>=3) owners.set(id,[table]);});
  });
  expect(metricProblems(contentIdMetric(engineSources(),owners,reviews.hooks),
    require('../fixtures/engine-ids/content-id-metric.json'))).toEqual([]);
});

test('ordinary imported moments validate atomically and every dispatch is typed, ordered and free of effects or RNG',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function (mod) {
    const s=FB.state,defs=FB.eventMomentDefinitions(),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),sig=FB.mods.sig();
    const mutations=[function (m) {m.events[17].options[0].review.type='unknown_review';},
      function (m) {m.events[17].options[0].review.args.definitionId='missing_definition';},
      function (m) {m.events[17].options[0].review.refusalOption=0;},
      function (m) {m.events[17].options[1].require={goldMin:1};},
      function (m) {m.events[17].options[0].effects={gold:500};},
      function (m) {m.events[18].options[0].review.args.choiceId='missing_choice';},
      function (m) {m.eventSubscriptions.quay_office_appointed[0].hook='unknown_moment';}];
    const rejected=mutations.every(function (mutate) {const m=JSON.parse(JSON.stringify(mod));mutate(m);return FB.mods.validate(m).length>0;});
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&sig===FB.mods.sig();
    const rows=[];
    s.roles.notable=null;s.player.flags.allow_empty_cast=1;
    const castRng=FB.getRngState(),castUid=FB.getUidCounter();
    FB.publishEventMoment(s,'office_appointed',{officeId:'canonical_office',institutionId:'canonical_court',holderId:s.player.charId,holderKind:'character',appointmentId:null});
    rows.push(!s.roles.notable&&castRng===FB.getRngState()&&castUid===FB.getUidCounter()&&
      !s.eventQueue.some(function (e) {return e.id==='quay_empty_cast';}));
    delete s.player.flags.allow_empty_cast;
    Object.keys(defs).forEach(function (id) {
      const fields=defs[id].payload.fields,payload={};
      Object.keys(fields).forEach(function (key) {payload[key]=key==='settlement' ? 1 : fields[key].enum ? fields[key].enum[0] :
        key==='holderKind'||key==='subjectKind' ? 'character' : 'canonical_id';});
      s.eventQueue=[];const gold=s.player.gold,rng=FB.getRngState(),uid=FB.getUidCounter();
      FB.publishEventMoment(s,id,payload);FB.publishEventMoment(s,id,payload);
      const queued=s.eventQueue.map(function (e) {return e.id;});
      rows.push(queued.length===2&&queued.every(function (eid) {return eid==='quay_'+id;})&&
        s.player.gold===gold&&rng===FB.getRngState()&&uid===FB.getUidCounter()&&
        Object.keys(payload).every(function (k) {return s.eventQueue[0].ctx[k]===payload[k];}));
      const raw=FBDATA.bookmarks[s.start.id],system=Object.keys(FBDATA.systems).find(function (sid) {return FBDATA.systems[sid].eventReaderOwner===defs[id].owner;});
      const systems=raw.systems;raw.systems=Object.assign({},systems);raw.systems[system]=false;
      const old=s.eventQueue[0],count=s.eventQueue.length;
      FB.publishEventMoment(s,id,payload);
      rows.push(s.eventQueue.length===count&&!FB.eventContextStillValid(s,FB.eventById(old.id),old.ctx));
      raw.systems=systems;
    });
    return {rejected:rejected,pure:pure,ids:Object.keys(defs),rows:rows};
  },imported);
  expect(result.rejected).toBe(true);expect(result.pure).toBe(true);
  expect(result.ids.slice().sort()).toEqual(Array.from(new Set(Object.values(imported.eventSubscriptions).map(function (r) {return r[0].hook;}))).sort());
  expect(result.rows.every(Boolean)).toBe(true);
});

test('profiled institution adoption publishes spiritual office and recognition changes only after live commit',async function ({page},info) {
  await start(page,info,'1204','MOMENTS-1204-baron-roma-m-Clerk');
  const result=await page.evaluate(function () {
    const s=FB.state,pid=s.player.provinceId,iid='quay_institution',oid='quay_institution_office',patron=FB.settlementCountyHolder(s,pid);
    FBDATA.religiousInstitutionProfiles.quay_institution={name:'Fictional quay house',faithIds:['catholic'],period:{yearMin:1,yearMax:null},system:null,
      roles:{specialist:{name:'Specialist',minAge:18,sexes:[],unmarried:false,professions:[],skills:{},affiliationId:null}},
      selection:{strategy:'appointment',policy:'patron',roleId:'specialist',consentRoles:['specialist'],quorum:0},
      recognition:{sources:['institution_support'],roles:['specialist'],quorum:1,requiresLeader:true,protectedWorship:true},
      actions:['admit','appoint','recognize','dispute','vacate'],fees:{},affiliationIds:[]};
    const defs=Object.assign({},FB.campaignBookmark(s).localInstitutions);
    defs[iid]={city:'Fictional quay house',kind:'monastery',provinceId:pid,site:FB.world.sitesByProv[pid].list[0].site,
      religion:'catholic',culture:'italian',profileId:iid,officeId:oid,vacant:true,jurisdictionIds:[pid]};
    const raw=FBDATA.bookmarks[s.start.id];
    (raw.revisions ? raw.revisions[s.start.revision || 'baseline'] : raw).localInstitutions=defs;
    s.localInstitutions[iid]=FB.religiousInstitutionOpeningRow(iid,defs[iid]);s.religiousHeads[oid]=null;
    const c=FB.makeCharacter(s,{name:'Recorded specialist',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-30,station:1,traitsN:0});c.homeProvinceId=pid;
    const actor={kind:'character',id:c.id};
    function act(action,who,terms) {const q=FB.religiousInstitutionQuote(s,iid,who || actor,action,terms || {});if (!q.allowed || !FB.religiousInstitutionApply(s,q)) throw new Error(action+': '+JSON.stringify(q.reason));return q;}
    act('admit',actor,{roleId:'specialist'});s.eventQueue=[];
    const q=act('appoint',{kind:'realm',id:patron},{candidateId:c.id});
    const changed=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const repeat=!FB.religiousInstitutionApply(s,q)&&changed===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const terms={subject:actor,provinceId:pid,source:'institution_support'};
    act('recognize',actor,terms);
    const proof=FB.political.legitimacy(s,actor,{kind:'county',id:pid},terms.source)[0];
    act('dispute',actor,Object.assign({},terms,{recognitionId:proof.id}));act('vacate',actor);
    const counts={};s.eventQueue.forEach(function (e) {counts[e.id]=(counts[e.id] || 0)+1;});
    return {repeat:repeat,counts:counts};
  });
  expect(result).toEqual({repeat:true,counts:{quay_office_appointed:1,quay_legitimacy_band_changed:2,quay_office_lost:1}});
});

test('authority commits publish appointments, bands, signed, breached and expired contracts and changed government once',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,actor={kind:'character',id:s.player.charId},patron={kind:'realm',id:'croatia'},scope={kind:'county',id:'split'};
    s.eventQueue=[];
    const beforeRng=FB.getRngState();
    const term=FB.authorityAppoint(s,{officeId:'defensor_civitatis',institutionId:'croatia',appointer:patron,holder:actor,scope:scope});
    if (!term) throw new Error('Scoped appointment setup failed');
    const duplicate=FB.authorityAppoint(s,{officeId:'defensor_civitatis',institutionId:'croatia',appointer:patron,holder:actor,scope:scope})===null;
    FB.authorityAppointmentTransition(s,term.id,'remove');FB.authorityAppointmentTransition(s,term.id,'remove');
    const sourceIds=Object.keys(FBDATA.legitimacySources).filter(function (id) {return FBDATA.legitimacySources[id].issuerKinds.indexOf('realm')>=0;}).slice(0,2);
    const proof=sourceIds.map(function (id) {return FB.authorityRecognize(s,{source:id,issuer:patron,subject:actor,scope:scope});});
    if (proof.some(function (p) {return !p;})) throw new Error('Recognition setup failed');
    proof.forEach(function (p) {FB.authorityRecognitionTransition(s,p.id,'revoke');FB.authorityRecognitionTransition(s,p.id,'revoke');});
    const federate=Object.keys(s.realms).find(function (rid) {return rid!=='player'&&rid!=='croatia'&&s.realms[rid].alive&&!FB.mobile.active(s,rid);});
    function sign() {
      const c=FB.authorityOfferContract(s,{patronRealmId:'croatia',federateRealmId:federate,payPerSeason:0,endTurn:s.turn+10});
      if (!c || !FB.authorityConsentContract(s,c.id,'croatia') || !FB.authorityConsentContract(s,c.id,federate)) throw new Error('Contract setup failed');
      FB.authorityConsentContract(s,c.id,federate);return c;
    }
    const c=sign();FB.authorityContractTransition(s,c.id,'breach',federate);FB.authorityContractTransition(s,c.id,'breach',federate);
    const ended=sign();s.turn=10;FB.authoritySeason(s);FB.authoritySeason(s);
    const form=FB.political.government(s,patron).formId,target=form==='territorial' ? 'regnum' : 'territorial';
    const transformed=FB.authoritySetGovernment(s,'croatia',target),same=!FB.authoritySetGovernment(s,'croatia',target);
    const counts={};s.eventQueue.forEach(function (e) {counts[e.id]=(counts[e.id] || 0)+1;});
    return {duplicate:duplicate,transformed:transformed,same:same,counts:counts,rng:beforeRng===FB.getRngState(),expired:FB.political.contract(s,ended.id).status};
  });
  expect(result).toMatchObject({duplicate:true,transformed:true,same:true,rng:true,expired:'expired'});
  expect(result.counts).toMatchObject({quay_office_appointed:1,quay_office_lost:1,quay_legitimacy_band_changed:4,
    quay_federate_contract_signed:2,quay_federate_contract_breached:1,quay_federate_contract_expired:1,quay_government_transformed:1});
});

test('mobile commit moments bind current principals, field loss, arrival and finite access without replaying a daily read',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='pontic_following_476',r=M.row(s,rid),moving=M.migration(s,rid),army=M.host(s,rid);
    s.eventQueue=[];
    function act(action,terms,actor) {
      const q=M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}});
      if (!q.review.allowed || !M.commit(s,q)) throw new Error(action+': '+JSON.stringify(q.review.reason));
    }
    const terms={kind:'access',partnerId:'byzantium',countyIds:[moving.at],capacity:10,allowRecruit:true,price:0,duration:2};
    act('propose',{operation:'agreement',proposal:terms});
    M.members(s,rid).forEach(function (m) {act('assent',{assent:true},m.principal);});
    act('offer',terms);const access=r.agreements[r.agreements.length-1];
    act('accept',{agreementId:access.id},{kind:'realm',id:'byzantium'});
    const person=FB.makeCharacter(s,{name:'New principal',sex:'m',culture:s.chars[s.player.charId].culture,religion:s.chars[s.player.charId].religion,born:s.date.year-30,station:1,traitsN:0});
    person.homeProvinceId=moving.at;
    const request={realmId:rid,action:'join',actor:{kind:'character',id:person.id},terms:{countyId:moving.at,count:5}};
    const join=M.review(s,request);
    if (!join.review.allowed || !M.commit(s,join)) throw new Error('Join: '+JSON.stringify(join));
    const added=r.members[r.members.length-1];
    const leave=M.review(s,{realmId:rid,action:'leave',actor:added.principal,terms:{memberId:added.id,countyId:moving.at}});
    if (!leave.review.allowed || !M.commit(s,leave)) throw new Error('Leave: '+JSON.stringify(leave));
    const old=M.leader(s,rid);FB.killChar(s,old);
    if (!r.selection) FB.advanceRealmSuccession(s,rid,{cause:'death'});
    const candidate=M.members(s,rid)[0].principal.id;
    M.members(s,rid).forEach(function (m) {M.commit(s,M.review(s,{realmId:rid,action:'support',actor:m.principal,terms:{candidateId:candidate}}));});
    const select=M.review(s,{realmId:rid,action:'select',actor:{kind:'realm',id:rid},terms:{candidateId:candidate}});
    if (!M.commit(s,select)) throw new Error('Select: '+JSON.stringify(select));
    const arrivals=s.eventQueue.filter(function (e) {return e.id==='quay_camp_arrived';}).length;
    const from=moving.at,to=FB.world.provs.find(function (p) {return !p.wasteland&&p.id!==from;}).id;
    army.mobileCourt=true;army.at=to;army.moveLeft=0;army.path=[];
    FB.federateDay(s);FB.federateDay(s);
    const arrived=s.eventQueue.filter(function (e) {return e.id==='quay_camp_arrived';});
    s.turn=access.endTurn;M.day(s);M.day(s);
    FB.applyHostLosses(army,army.men,s);FB.disbandArmy(s,army);
    const counts={};s.eventQueue.forEach(function (e) {counts[e.id]=(counts[e.id] || 0)+1;});
    return {counts:counts,arrived:arrived.length-arrivals,from:arrived[0].ctx.fromProvinceId===from,to:arrived[0].ctx.locationId===to};
  });
  expect(result).toMatchObject({arrived:1,from:true,to:true});
  expect(result.counts).toMatchObject({quay_coalition_member_joined:1,quay_coalition_member_departed:1,
    quay_coalition_leader_selected:1,quay_camp_arrived:1,quay_access_expired:1,quay_field_host_lost:1});
});

test('law issuance and repeal, civil settlement and imposed case judgment publish only committed outcomes',async function ({page},info) {
  await start(page,info,'1204','MOMENTS-1204-baron-roma-m-Clerk');
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,R=FB.religiousCases,pid='roma',profile='roman_clerical_violence';
    s.player.gold=200;
    FB.rememberSettlementSites(s,pid);
    let slot=FB.directSettlements(s,{kind:'character',id:s.player.charId}).find(function (v) {return v.provinceId===pid&&v.settlement>0;});
    if (!slot) {if (!FB.assignSettlementLordship(s,pid,1,s.player.charId)) throw new Error('Missing actual grant');slot={settlement:1};}
    s.eventQueue=[];
    function rent(action,actor) {const q=C.quote(s,'roman_temporal_rent',slot.settlement,actor || s.player.charId,action);if (!q.allowed || !C.apply(s,q)) throw new Error('Rent '+action);}
    rent('demand');rent('recurring');
    if (!C.respond(s,'roman_temporal_rent',slot.settlement)) throw new Error('Canonical bishop response failed');
    const record=C.snapshot(s,'roman_temporal_rent',slot.settlement).record;
    const repeat=!C.apply(s,C.quote(s,'roman_temporal_rent',slot.settlement,record.principals.bishopId,'accept'));
    const court=C.courtContext(s,FBDATA.religiousCases[profile]);
    const defendant=FB.makeCharacter(s,{name:'Recorded defendant',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-30,station:0,traitsN:0});
    const victim=FB.makeCharacter(s,{name:'Recorded cleric',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-40,station:1,traitsN:0});
    defendant.homeProvinceId=pid;defendant.wealth=100;defendant.piety=100;defendant.prestige=100;
    victim.homeProvinceId=pid;victim.role='priest';victim.career={profession:'priest'};victim.wealth=17;
    s.provChars=s.provChars || {};s.provChars[pid]=(s.provChars[pid] || []).concat([defendant.id,victim.id]);
    const offense=FB.justiceRecordOffense(s,court.courtId,defendant.id,'abduction','material',true,victim.id,'recorded-clerical-attack:'+defendant.id);
    function decide(action,actor) {const q=R.quote(s,profile,offense.id,actor || court.bishopId,action);if (!q.allowed || !R.apply(s,q)) throw new Error('Case '+action+': '+JSON.stringify(q));}
    decide('charge');decide('submit',defendant.id);decide('penance');
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();R.judged(s,offense,'penance');
    const duplicate=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const caseEvents=s.eventQueue.filter(function (e) {return e.id==='quay_case_judged';}),claims=s.eventQueue.filter(function (e) {return e.id==='quay_claim_settled';});
    return {repeat:repeat,duplicate:duplicate,cases:caseEvents.length,claims:claims.length,
      caseId:caseEvents[0].ctx.offenseId===offense.id,claimId:claims[0].ctx.claimId===record.id};
  });
  expect(result).toEqual({repeat:true,duplicate:true,cases:1,claims:1,caseId:true,claimId:true});
  // Independent law commits use their ordinary council vote, including repeal.
  await lawSetup(page,false);
  const law=await page.evaluate(function () {
    const s=FB.state,L=FB.industryLaws,row=s.industryLaws.laws.find(function (r) {return r.definitionId==='quay_stall_permission';});
    s.eventQueue=[];s.player.provinceId='london';FB.fns.local_council_elected(s);s.player.localCouncil.nextMotionTurn=s.turn;
    const chance=FB.localCouncilMotionChance(s);
    for (let i=0;i<128;i++) {const seed=FB.getRngState();if (FB.rng()<chance) {FB.setRngState(seed);break;}}
    const q=L.quoteMotion(s,row.definitionId,row.id),answer=FB.proposeLocalCouncilMotion(s,q.terms.motionId,q);
    const again=L.validMotion(s,q);
    return {passed:answer.passed,again:again,count:s.eventQueue.filter(function (e) {return e.id==='quay_law_repealed';}).length};
  });
  expect(law).toEqual({passed:true,again:false,count:1});
});

for (const native of [false,true]) test((native?'native':'imported fictional')+' business review uses the ordinary payment, rejects stale quotes and restores current content twice',async function ({page},info) {
  await start(page,info,'1204','MOMENTS-1204-baron-london-m-Trader');
  const at=await lawSetup(page,native);
  expect(at.issued).toBe(1);
  const result=await page.evaluate(function (input) {
    const s=FB.state,L=FB.industryLaws,ev=FB.eventById(input.native?'operating_terms_notice':'quay_permission_review');
    const opt=ev.options[input.native?2:0],ctx=FB.eventContextFor(s,ev,{enterpriseUid:input.at.uid,locationId:'london'}),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=FB.eventReviews.quote(s,opt,ctx),e=s.player.enterprises.find(function (v) {return v.uid===input.at.uid;});
    const canonical=L.quoteOperation(s,e,'pay',0);
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    s.player.gold--;
    const changed=JSON.stringify(s),stale=!FB.resolveEventOption(s,ev,opt,ctx,{reviewed:q})&&changed===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const state=JSON.parse(JSON.stringify(s)),review=FB.eventReviews.quote(s,opt,ctx),fresh=L.quoteOperation(state,state.player.enterprises.find(function (v) {return v.uid===input.at.uid;}),'pay',0);
    const paid=s.player.gold,payee=canonical.status.charges[0].payeeRealmId,publicBefore=FB.treasuryAvailable(s,payee);
    const forkRng=FB.getRngState(),forkUid=FB.getUidCounter();
    if (!L.commitOperation(state,fresh)) throw new Error('Canonical deed payment failed');
    FB.setRngState(forkRng);FB.setUidCounter(forkUid);
    const receipt=FB.resolveEventOption(s,ev,opt,ctx,{reviewed:review});
    const parity=!!receipt&&state.player.gold===s.player.gold&&JSON.stringify(state.industryLaws)===JSON.stringify(s.industryLaws)&&
      JSON.stringify(state.realms[payee].treasury)===JSON.stringify(s.realms[payee].treasury);
    const count=s.industryLaws.permits.length,noDuplicate=!FB.resolveEventOption(s,ev,opt,ctx,{reviewed:review})&&s.industryLaws.permits.length===count;
    window.reviewCheckpoint={gold:s.player.gold,permits:JSON.stringify(s.industryLaws.permits),queue:JSON.stringify(s.eventQueue),rng:FB.getRngState()>>>0,uid:FB.getUidCounter(),sig:FB.mods.sig()};
    return {pure:pure,stale:stale,parity:parity,noDuplicate:noDuplicate,receiptCharge:receipt.impacts.some(function (r) {return r.type==='gold'&&r.amount===s.player.gold-paid;}),cost:paid-s.player.gold,income:FB.treasuryAvailable(s,payee)-publicBefore,saved:FB.save.serialize()};
  },{native:native,at:at});
  expect(result).toMatchObject({pure:true,stale:true,parity:true,noDuplicate:true,receiptCharge:true});
  expect(result.cost).toBeGreaterThan(0);expect(result.income).toBeCloseTo(result.cost,8);
  await restoreBookmark(page,result.saved);
  await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {
    const s=FB.state,c=reviewCheckpoint;
    return c.gold===s.player.gold&&c.permits===JSON.stringify(s.industryLaws.permits)&&c.queue===JSON.stringify(s.eventQueue)&&
      c.rng===(FB.getRngState()>>>0)&&c.uid===FB.getUidCounter()&&c.sig===FB.mods.sig();
  })).toBe(true);
});

test('registered story reviews use the offered choice and original quote, and automation takes its declared refusal on a blocker',async function ({page},info) {
  await start(page,info,'1204','MOMENTS-1204-baron-london-m-Clerk');
  const result=await page.evaluate(function () {
    const s=FB.state;FB.stories.start(s,{tracks:['quay_review_story']});
    const ev=FB.eventById('quay_story_review'),opt=ev.options[0],ctx=FB.eventContextFor(s,ev,{});
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),review=FB.eventReviews.quote(s,opt,ctx);
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const fork=JSON.parse(before),canonical=FB.stories.quote(fork,'quay_review_story','acknowledge');
    const deed=FB.stories.apply(fork,'quay_review_story','acknowledge',canonical);
    const auto=JSON.parse(before),autoReceipt=FB.resolveEventOption(auto,ev,opt,FB.eventContextFor(auto,ev,{}),{automated:true});
    const automated=!!autoReceipt&&JSON.stringify(auto.stories.quay_review_story)===JSON.stringify(fork.stories.quay_review_story);
    const receipt=FB.resolveEventOption(s,ev,opt,ctx,{reviewed:review});
    const parity=!!receipt&&deed&&JSON.stringify(fork.stories.quay_review_story)===JSON.stringify(s.stories.quay_review_story);
    const state=JSON.stringify([s.player.gold,s.stories]),refused=FB.resolveEventOption(s,ev,opt,ctx,{automated:true});
    return {pure:pure,parity:parity,automated:automated,refused:refused.optionIndex===1,unchanged:state===JSON.stringify([s.player.gold,s.stories])};
  });
  expect(result).toEqual({pure:true,parity:true,automated:true,refused:true,unchanged:true});
});

test('event review Cancel, Back and Escape preserve state, choice nodes, disclosure, scroll and focus; stale confirmation spends nothing',async function ({page},info) {
  await start(page,info,'1204','MOMENTS-1204-baron-london-m-Trader');
  const at=await lawSetup(page,false);
  await page.evaluate(function (at) {
    const ev=FB.eventById('quay_permission_review');
    FB.game.auto.all=false;FB.game.auto.major=false;FB.game.auto.minor=false;
    FB.ui.runEvents([{id:ev.id,ctx:FB.eventContextFor(FB.state,ev,{enterpriseUid:at.uid})}]);
  },at);
  const option=page.locator('#ev-options .evopt').first();
  await expect(option).toBeVisible();
  await page.evaluate(function () {
    window.reviewUiBefore=JSON.stringify(FB.state);window.reviewUiRng=FB.getRngState();window.reviewUiUid=FB.getUidCounter();
    window.reviewUiNode=document.querySelector('#ev-options .evopt');
    window.reviewUiDetails=document.querySelector('#ev-options .event-choice-details');
    if (reviewUiDetails) reviewUiDetails.classList.remove('hidden');
    window.reviewUiScroll=document.querySelector('#eventmodal .modalcard').scrollTop;
  });
  for (const route of ['cancel','back','escape']) {
    await readyEvent(page);await option.click();await expect(page.locator('#event-review-cancel')).toBeVisible();
    await readyEvent(page);
    if (route==='cancel') await page.locator('#event-review-cancel').click();
    else if (route==='back') await page.locator('#event-nav-back').click();
    else await page.keyboard.press('Escape');
    await expect(option).toBeVisible();
    expect(await page.evaluate(function () {return reviewUiBefore===JSON.stringify(FB.state)&&reviewUiRng===FB.getRngState()&&reviewUiUid===FB.getUidCounter()&&reviewUiNode===document.querySelector('#ev-options .evopt')&&document.activeElement===reviewUiNode&&document.querySelector('#eventmodal .modalcard').scrollTop===reviewUiScroll&&
      (!reviewUiDetails||!reviewUiDetails.classList.contains('hidden'));})).toBe(true);
  }
  await readyEvent(page);await option.click();
  await readyEvent(page);
  await page.evaluate(function () {FB.state.player.gold--;window.reviewUiChanged=JSON.stringify(FB.state);});
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#ev-text')).toContainText('Nothing was spent');
  expect(await page.evaluate(function () {return reviewUiChanged===JSON.stringify(FB.state);})).toBe(true);
});

for (const file of [false,true]) for (const crazy of [false,true]) test('empty pack slots boot '+(file?'from file':'served')+' with distribution flag '+crazy,async function ({page},info) {
  if (crazy) {
    await mockCrazyGames(page);
    await page.addInitScript(function () {window.FB_DISTRIBUTION='crazygames';window.FB_CRAZYGAMES_STORAGE='localstorage';});
  }
  const context=file ? {project:{name:'chromium-file'}} : info;
  if (crazy) await openCrazyGame(page,context);
  else await openGame(page,context);
  const result=await page.evaluate(function (input) {
    return {crazy:FB.platform.isCrazyGames,ready:FB.game.bootReady&&FB.game.contentReady,
      packs:input.shared.map(function (id) {return !!FBDATA.eventPacks[id];}).concat(input.dates.map(function (id) {return !!FBDATA.eventPacks['dated_'+id];})),
      events:FBDATA.events.filter(function (e) {return input.shared.indexOf(e.pack)>=0||input.dates.some(function (id) {return e.pack==='dated_'+id;});}).length,
      registered:input.files.every(function (file) {return Array.from(document.scripts).some(function (s) {return s.src.indexOf(file)>=0;});})};
  },{shared:sharedPacks,dates:datedPacks,files:packFiles});
  expect(result).toEqual({crazy:crazy,ready:true,packs:Array(16).fill(true),events:0,registered:true});
  const extractor=fs.readFileSync(path.resolve(__dirname,'../../../tools/i18n_catalog.py'),'utf8');
  expect(extractor).toContain('EVENT_FILES = sorted(DATA.glob("events_*.js"))');
  for (const file of packFiles) expect(fs.existsSync(path.resolve(__dirname,'../../..',file))).toBe(true);
});
