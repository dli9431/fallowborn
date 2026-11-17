'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const imported = require('../fixtures/authoring/imperial-office-event-reviews-river.json');
dependsOnRuntime(__filename,[
  'data/events_imperial_office.js','data/political_institutions.js','data/eras.js','data/systems.js',
  'js/schema.js','js/authority.js','js/events.js','js/government_administration.js','js/government_recognition.js',
  'js/office_mandates.js','js/governments.js','js/systems.js','js/treasury.js','js/world.js','js/model.js',
  'js/lordships.js','js/settlement.js','js/fiscal.js','js/agency.js','js/logistics.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/ui_modals.js','js/ui_misc.js','js/government_revenue.js'
]);
test.describe.configure({mode:'parallel'});

async function start(page,info,json) {
  await openGame(page,info);
  if (json) {
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/imperial-office-event-reviews-river.json'));
    await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await beginBookmarkFromTitle(page,'476','mobile_household_476');
  await page.evaluate(function () {
    FB.game.setPaused(true);FB.game.uiPrefs.hideTips=true;FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

async function stage(page,json,publicCourt) {
  return page.evaluate(function (input) {
    const s=FB.state,p=s.player,c=s.chars[p.charId],pid=p.provinceId,rid=FB.settlementCountyHolder(s,pid);
    window.civilTier=function (state,tier) {FB.setPlayerTier(state,tier,{attachLiege:false,formTenure:false,stationFarewell:false});};
    FB.authoritySetGovernment(s,rid,input.publicCourt?'administrative_monarchy':'roman_civic');
    if (input.publicCourt) FB.publicAdministrationSeed(s,[{id:rid,government:'administrative_monarchy'}]);
    civilTier(s,2);c.born=s.date.year-30;delete c.unfree;p.gold=1000;p.prestige=1000;p.travel=null;p.liege=rid;
    FB.SKILLS.forEach(function (skill) {c.skills[skill]=20;});
    s.realms[rid].treasury.gold=1000;
    const friend=FB.makeCharacter(s,{name:'Civil witness',sex:'m',culture:c.culture,religion:c.religion,born:s.date.year-30,station:1,traits:[]});
    friend.homeProvinceId=pid;s.roles.friend=friend.id;
    const rival=FB.getRole(s,'rival',true);if (rival) rival.homeProvinceId=pid;
    // Remove only fixture-local incumbents; preserve every other court and claim.
    s.authority.appointments=s.authority.appointments.filter(function (r) {
      return !(r.institutionId===rid&&r.scope.kind==='county'&&r.scope.id===pid);
    });
    if (input.publicCourt) {
      const site=FB.settlementGrantSites(s,pid,rid)[0];
      if (!site) throw new Error('No real secondary source');
      const owner=FB.makeCharacter(s,{name:'Source household',sex:'m',culture:c.culture,religion:c.religion,born:s.date.year-30,station:3,traits:[]});
      owner.homeProvinceId=pid;FB.SKILLS.forEach(function (skill) {owner.skills[skill]=1;});
      if (!FB.assignSettlementLordship(s,pid,site.settlement,owner.id)) throw new Error('Source assignment failed');
      if (!(FB.publicCountyIncome(s,rid,pid)>0)) throw new Error('No collectible source');
    }
    window.CIVIL={rid:rid,pid:pid,json:input.json,publicCourt:input.publicCourt};
    window.civilDecision=function (kind) {
      const a=CIVIL,s=FB.state;
      const ids={petition:'court_application',confirm:'court_patron',repay:'honor_demand',remit:'court_levy',support:'one_voice'};
      const ev=FB.eventById(a.json?'river_civil_'+kind:'imperial_office_'+ids[kind]);
      const option=ev.options.find(function (o) {return o.review;});
      const ctx=FB.eventContextFor(s,ev,{});
      return {ev:ev,option:option,ctx:ctx};
    };
    window.civilFacts=function () {
      const e=JSON.parse(FB.save.serialize()),s=FB.save.expandedSnapshot(e.state);
      // Restore materializes these empty defaults; normalize only this detached
      // comparison, retaining every populated record and ordered array exactly.
      if (s.countySupport===undefined) s.countySupport={};
      s.rebellions=Object.assign({groups:{},warnings:{},cooldowns:{}},s.rebellions||{});
      s.greatHolyWarHistory=Object.assign({sequence:0,campaigns:[],cooldownUntil:{},firstCall:{},firstLaunched:{},
        headState:{},sacredLossSince:{},unlockChecked:{}},s.greatHolyWarHistory||{});
      Object.keys(s.realms).forEach(function (rid) {
        const t=s.realms[rid].treasury;if (t&&t.distributionCooldown===undefined) t.distributionCooldown=0;
      });
      function ordered(v) {
        if (Array.isArray(v)) return v.map(ordered);
        if (!v||typeof v!=='object') return v;
        const out={};Object.keys(v).sort().forEach(function (k) {out[k]=ordered(v[k]);});return out;
      }
      return {state:ordered(s),rng:e.rng>>>0,uid:e.uid,mods:e.mods};
    };
    window.civilSavePoint=function () {
      // Complete the ordinary owners after directly staged status/generation
      // boundaries. The exact comparison itself never repairs saved facts.
      FB.notePlayerStatus(FB.state);FB.ensureLifeHistories(FB.state);FB.ensureAgency(FB.state);FB.validateFocus(FB.state);
      return civilFacts();
    };
    return {rid:rid,pid:pid};
  },{json:json,publicCourt:publicCourt});
}

for (const json of [false,true]) test((json?'JSON':'native')+' public petition, remittance, arrears and office continuity use canonical finite transactions',async function ({page},info) {
  await start(page,info,json);await stage(page,json,true);
  const result=await page.evaluate(function () {
    const s=FB.state,a=CIVIL,E=FB.officeEventReviews,me=E.actor(s),patron={kind:'realm',id:a.rid},p=s.player;
    if (!a.json) civilTier(s,1);
    let d=civilDecision('petition'),before=JSON.stringify(s),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter();
    const q=FB.eventReviews.quote(s,d.option,d.ctx);
    for (let i=0;i<3;i++) {FB.eventReviews.quote(s,d.option,d.ctx);FB.eventReviews.details(s,q);FB.eventStateReaders.test(s,[{reader:'civil_office',args:{status:'none'}}],{});}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const fork=JSON.parse(before),canonical=FB.publicAppointmentQuote(fork,me,q.quote.input);
    const direct=FB.publicAppoint(fork,canonical);FB.setRngState(rng);FB.setUidCounter(uid);
    s.realms[a.rid].treasury.gold--;
    before=JSON.stringify(s);
    const stale=!FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:q})&&before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    s.realms[a.rid].treasury.gold++;
    const fresh=FB.eventReviews.quote(s,d.option,d.ctx),auto=JSON.parse(JSON.stringify(s)),autoCtx=FB.eventContextFor(auto,d.ev,{});
    const autoResult=FB.resolveEventOption(auto,d.ev,d.option,autoCtx,{automated:true});
    FB.setRngState(rng);FB.setUidCounter(uid);
    const cash=p.gold,publicCash=s.realms[a.rid].treasury.gold;
    const receipt=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:fresh});
    const row=s.authority.appointments.find(function (r) {return r.holder.id===p.charId&&r.institutionId===a.rid&&r.publicTerms;});
    const parity=!!direct&&!!receipt&&!!autoResult&&JSON.stringify(fork.authority)===JSON.stringify(s.authority)&&JSON.stringify(auto.authority)===JSON.stringify(s.authority);
    const paid=cash===p.gold&&publicCash-s.realms[a.rid].treasury.gold===fresh.quote.cost;
    const exact=JSON.stringify(s);
    const duplicate=!FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:fresh})&&exact===JSON.stringify(s);
    civilTier(s,2);
    // The native form continues across succession, so stage an actual contested write.
    FB.authorityAppointmentTransition(s,row.id,'contest');
    d=civilDecision('confirm');
    const confirmed=FB.eventReviews.quote(s,d.option,d.ctx);
    // A household cannot silently obtain the public court's confirmation.
    before=JSON.stringify(s);
    const denied=(!confirmed||!confirmed.quote.allowed)&&!FB.eventReviews.commit(s,d.option,d.ctx,confirmed)&&before===JSON.stringify(s);
    const court=FB.publicOfficeQuote(s,patron,row.id,'confirm');
    if (!FB.publicOfficeApply(s,court)) throw new Error('Canonical court confirmation failed '+JSON.stringify(court));
    civilTier(s,3);
    d=civilDecision('remit');
    const remit=FB.eventReviews.quote(s,d.option,d.ctx),remitFork=JSON.parse(JSON.stringify(s));
    const autoRemit=FB.resolveEventOption(remitFork,d.ev,d.option,FB.eventContextFor(remitFork,d.ev,{}),{automated:true});
    const remitReceipt=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:remit});
    const remitParity=!!autoRemit&&JSON.stringify(remitFork.authority)===JSON.stringify(s.authority);
    // Settle one fiscal boundary with a source-backed withholding through the owner.
    if (!FB.publicOfficeApply(s,FB.publicOfficeQuote(s,me,row.id,'remit',0.5))) throw new Error('Withholding review failed');
    const snapshot=FB.treasurySnapshot(s);s.turn+=90;
    FB.publicOfficeSettle(s,snapshot,Math.floor(s.turn/90),false);
    FB.armyProducerSnapshot(s);
    Object.keys(s.realms).forEach(function (rid) {
      const tree=s.realms[rid].succession;
      if (tree&&tree.openingPreferredId) FB.refreshRealmSuccession(s,rid);
    });
    if (!(row.publicTerms.arrears>0)) throw new Error('No actual conserved arrears');
    civilTier(s,2);
    d=civilDecision('repay');
    const owes=row.publicTerms.arrears,privateBefore=p.gold,treasuryBefore=s.realms[a.rid].treasury.gold;
    const repayment=FB.eventReviews.quote(s,d.option,d.ctx);
    row.publicTerms.arrears+=1;before=JSON.stringify(s);
    const staleDebt=!FB.eventReviews.commit(s,d.option,d.ctx,repayment)&&before===JSON.stringify(s);
    row.publicTerms.arrears-=1;
    const repayFork=JSON.parse(JSON.stringify(s));
    const autoRepay=FB.resolveEventOption(repayFork,d.ev,d.option,FB.eventContextFor(repayFork,d.ev,{}),{automated:true});
    const repaid=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:FB.eventReviews.quote(s,d.option,d.ctx)});
    const repayParity=!!autoRepay&&JSON.stringify(repayFork.authority)===JSON.stringify(s.authority)&&repayFork.player.gold===p.gold&&
      JSON.stringify(repayFork.realms[a.rid].treasury)===JSON.stringify(s.realms[a.rid].treasury);
    const finite=!!repaid&&row.publicTerms.arrears===0&&Math.abs(privateBefore-p.gold-owes)<1e-8&&Math.abs(s.realms[a.rid].treasury.gold-treasuryBefore-owes)<1e-8;
    const saved=FB.save.serialize(),live=FB.state,unchanged=JSON.stringify(s),storage=JSON.stringify(Object.keys(localStorage).sort().map(function (k) {return [k,localStorage.getItem(k)];}));
    const bad=JSON.parse(saved);bad.state.authority.appointments.find(function (r) {return r.id===row.id;}).publicTerms.arrears=-1;
    let rejected=false;try {FB.save.restore(bad);} catch (fault) {rejected=true;}
    const atomic=rejected&&FB.state===live&&unchanged===JSON.stringify(s)&&storage===JSON.stringify(Object.keys(localStorage).sort().map(function (k) {return [k,localStorage.getItem(k)];}));
    window.civilCheckpoint=civilSavePoint();
    return {pure:pure,stale:stale,parity:parity,paid:paid,duplicate:duplicate,denied:denied,remit:!!remitReceipt,remitParity:remitParity,repayParity:repayParity,staleDebt:staleDebt,finite:finite,atomic:atomic,
      expectedShare:row.publicTerms.share,expectedTerm:fresh.quote.endTurn-(s.turn-90),saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({pure:true,stale:true,parity:true,paid:true,duplicate:true,denied:true,remit:true,remitParity:true,repayParity:true,staleDebt:true,finite:true,atomic:true});
  expect(result.expectedShare).toBe(json?0.12:0.2);
  expect(result.expectedTerm).toBe(json?180:720);
  await restoreBookmark(page,result.saved);
  await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {return civilFacts();})).toEqual(await page.evaluate(function () {return civilCheckpoint;}));
});

for (const json of [false,true]) test((json?'JSON':'native')+' Roman civil petition acquires real scoped powers and keeps stale identity and refusal pure',async function ({page},info) {
  await start(page,info,json);await stage(page,json,false);
  const result=await page.evaluate(function () {
    const s=FB.state,a=CIVIL,p=s.player,me=FB.officeEventReviews.actor(s);
    civilTier(s,1);p.flags.imperial_office_civic_draft=1;
    const ev=FB.eventById(a.json?'river_civil_roman_petition':'imperial_office_rival_petition'),option=ev.options.find(function (o) {return o.review;}),ctx=FB.eventContextFor(s,ev,{});
    function transactions() {return JSON.stringify([s.authority,p.gold,p.prestige,s.owner,s.holder,s.chars]);}
    const q=FB.eventReviews.quote(s,option,ctx),before=transactions(),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter();
    const refused=FB.resolveEventOption(s,ev,ev.options[option.review.refusalOption],ctx,{});
    const refusal=!!refused&&before===transactions()&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    s.chars[p.charId].unfree=true;const blockedBefore=transactions();
    const blocked=FB.resolveEventOption(s,ev,option,ctx,{automated:true});
    const blockedPure=!!blocked&&blocked.optionIndex===option.review.refusalOption&&blockedBefore===transactions();
    delete s.chars[p.charId].unfree;
    const quoted=FB.eventReviews.quote(s,option,ctx),cash=p.gold,land=JSON.stringify([s.owner,s.holder,p.provs,p.holdings]);
    const fork=JSON.parse(JSON.stringify(s)),direct=FB.officeSeekAppointment(fork,FB.officeAppointmentQuote(fork,me,quoted.quote.terms));
    const auto=JSON.parse(JSON.stringify(s)),autoReceipt=FB.resolveEventOption(auto,ev,option,FB.eventContextFor(auto,ev,{}),{automated:true});
    FB.setRngState(rng);FB.setUidCounter(uid);
    const receipt=FB.resolveEventOption(s,ev,option,ctx,{reviewed:quoted}),row=s.authority.appointments.find(function (r) {return r.id===direct.id;});
    const parity=!!receipt&&!!autoReceipt&&JSON.stringify(fork.authority)===JSON.stringify(s.authority)&&JSON.stringify(auto.authority)===JSON.stringify(s.authority)&&
      p.gold===cash-quoted.quote.cost&&auto.player.gold===p.gold;
    const powers=FB.political.power(s,me,'peace',{provinceId:a.pid}).allowed&&!FB.political.power(s,me,'ban',{}).allowed;
    const pinned=Object.assign({},ctx,{appointmentId:row.id}),transition={review:{type:'office_appointment',args:{action:'confirm'},refusalOption:1}};
    FB.authorityAppointmentTransition(s,row.id,'contest');
    const confirm=FB.eventReviews.quote(s,transition,pinned);s.realms[a.rid].ruler.generation=FB.realmRulerGeneration(s,a.rid)+1;
    FB.ensureAgency(s);
    const changed=JSON.stringify(s),stale=!FB.eventReviews.commit(s,transition,pinned,confirm)&&changed===JSON.stringify(s);
    // An exact context must not substitute any other appointment after removal.
    const noSubstitute=FB.eventReviews.quote(s,transition,Object.assign({},pinned,{appointmentId:'missing'}))===null;
    const readers=FB.eventStateReaders.test(s,[{reader:'civil_office',args:{status:'contested'}}],{});
    const property=land===JSON.stringify([s.owner,s.holder,p.provs,p.holdings]);
    window.civilCheckpoint=civilSavePoint();
    return {refusal:refusal,blockedPure:blockedPure,parity:parity,powers:powers,stale:stale,noSubstitute:noSubstitute,readers:readers,property:property,saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({refusal:true,blockedPure:true,parity:true,powers:true,stale:true,noSubstitute:true,readers:true,property:true});
  await restoreBookmark(page,result.saved);await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {return civilFacts();})).toEqual(await page.evaluate(function () {return civilCheckpoint;}));
});

for (const json of [false,true]) test((json?'JSON':'native')+' public recognition and court transitions retain each living principal and restore without replay',async function ({page},info) {
  await start(page,info,json);await stage(page,json,true);
  const result=await page.evaluate(function () {
    const s=FB.state,a=CIVIL,E=FB.officeEventReviews,R=FB.governmentRecognition,me=E.actor(s),patron={kind:'realm',id:a.rid},friend=s.chars[s.roles.friend];
    const profile=FB.administrationProfile(s,a.rid);
    const own=FB.publicAppoint(s,FB.publicAppointmentQuote(s,me,{institutionId:a.rid,officeId:profile.governor,holderId:me.id,
      provinceId:a.pid,scope:{kind:'county',id:a.pid}}));
    FB.SKILLS.forEach(function (skill) {friend.skills[skill]=20;});
    const other=FB.publicAppointmentQuote(s,patron,{institutionId:a.rid,officeId:profile.fiscal,holderId:friend.id,
      provinceId:a.pid,scope:{kind:'county',id:a.pid}});
    if (!own||!FB.publicAppoint(s,other)) throw new Error('Missing real public commissions '+JSON.stringify(other));
    const nominationState=JSON.parse(JSON.stringify(s));
    nominationState.player.charId=FB.realmRulerCharacterSnapshot(nominationState,a.rid).id;
    nominationState.player.tier=3;
    const ne=FB.eventById(a.json?'river_civil_nominate':'imperial_office_court_decision');
    const no=ne.options.find(function (o) {return o.review&&o.review.args.action==='nominate';});
    const nc=FB.eventContextFor(nominationState,ne,{}),nq=FB.eventReviews.quote(nominationState,no,nc);
    const nominee=nominationState.chars[nc.participants.official],family=JSON.stringify([nominee.fatherId,nominee.motherId]);
    const nomination=!!nq&&nq.quote.allowed&&!!FB.resolveEventOption(nominationState,ne,no,nc,{reviewed:nq})&&
      R.candidates(nominationState,a.rid).some(function (c) {return c.charId===nominee.id;})&&
      family===JSON.stringify([nominee.fatherId,nominee.motherId]);
    if (!R.nominate(s,R.nominationQuote(s,patron,a.rid,friend.id))) throw new Error('Nomination setup failed');
    civilTier(s,3);
    const ev=FB.eventById(a.json?'river_civil_support':'imperial_office_court_decision');
    const option=ev.options.find(function (o) {return o.review&&o.review.type==='office_recognition'&&o.review.args.action==='recognize';});
    const ctx=FB.eventContextFor(s,ev,{}),before=JSON.stringify(s),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter();
    const q=FB.eventReviews.quote(s,option,ctx);
    for (let i=0;i<3;i++) {FB.eventReviews.quote(s,option,ctx);FB.eventReviews.details(s,q);R.members(s,a.rid);R.candidates(s,a.rid);}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const fork=JSON.parse(before),auto=JSON.parse(before);
    const direct=R.applySupport(fork,q.quote.review);
    const automated=FB.resolveEventOption(auto,ev,option,FB.eventContextFor(auto,ev,{}),{automated:true});
    const row=s.authority.appointments.find(function (r) {return r.id===own.id;});
    FB.authorityAppointmentTransition(s,row.id,'contest');
    const changed=JSON.stringify(s),stale=!FB.eventReviews.commit(s,option,ctx,q)&&changed===JSON.stringify(s);
    if (!FB.publicOfficeApply(s,FB.publicOfficeQuote(s,patron,row.id,'confirm'))) throw new Error('Confirm setup');
    const receipt=FB.resolveEventOption(s,ev,option,ctx,{reviewed:FB.eventReviews.quote(s,option,ctx)});
    const parity=!!direct&&!!automated&&!!receipt&&JSON.stringify(fork.authority.governments[a.rid].recognition)===JSON.stringify(s.authority.governments[a.rid].recognition)&&
      JSON.stringify(auto.authority.governments[a.rid].recognition)===JSON.stringify(s.authority.governments[a.rid].recognition);
    const onlyOwn=Object.keys(s.authority.governments[a.rid].recognition).length===1&&!s.realms[a.rid].succession.designatedHeirId;
    // The actual incumbent, acting as the protagonist in an isolated fork,
    // may confirm/dismiss the bound governor; an officer cannot forge this consent.
    const court=JSON.parse(JSON.stringify(s)),oldId=court.player.charId;
    const ruler=FB.realmRulerCharacterSnapshot(court,a.rid);court.player.charId=ruler.id;court.roles.friend=oldId;
    const target=court.authority.appointments.find(function (r) {return r.id===own.id;});
    FB.authorityAppointmentTransition(court,target.id,'contest');
    const ce=FB.eventById(a.json?'river_civil_confirm':'imperial_office_court_decision');
    const confirmation=ce.options.find(function (o) {return o.review&&o.review.type==='office_appointment'&&o.review.args.action==='confirm';});
    const courtOption=confirmation;
    const courtCtx=FB.eventContextFor(court,ce,{}),cq=FB.eventReviews.quote(court,courtOption,courtCtx);
    const confirmFork=JSON.parse(JSON.stringify(court)),autoConfirm=FB.resolveEventOption(confirmFork,ce,courtOption,FB.eventContextFor(confirmFork,ce,{}),{automated:true});
    const confirm=!!FB.resolveEventOption(court,ce,courtOption,courtCtx,{reviewed:cq})&&target.status==='active'&&!!autoConfirm&&JSON.stringify(confirmFork.authority)===JSON.stringify(court.authority);
    const removalEv=FB.eventById(a.json?'river_civil_remove':'imperial_office_court_decision');
    const removal=removalEv.options.find(function (o) {return o.review&&o.review.type==='office_appointment'&&o.review.args.action==='remove';});
    const removalCtx=FB.eventContextFor(court,removalEv,{}),rq=FB.eventReviews.quote(court,removal,removalCtx);
    const land=JSON.stringify([court.owner,court.holder,court.player.holdings]);
    const removeFork=JSON.parse(JSON.stringify(court)),autoRemove=FB.resolveEventOption(removeFork,removalEv,removal,FB.eventContextFor(removeFork,removalEv,{}),{automated:true});
    const removed=FB.resolveEventOption(court,removalEv,removal,removalCtx,{reviewed:rq});
    const loss=!!removed&&!!autoRemove&&JSON.stringify(removeFork.authority)===JSON.stringify(court.authority)&&target.status==='removed'&&
      !FB.political.power(court,{kind:'character',id:oldId},'peace',{provinceId:a.pid}).allowed&&land===JSON.stringify([court.owner,court.holder,court.player.holdings]);
    const queued=FB.queueEvent(s,ev.id,{});
    if (!queued||queued.ctx.participants.official!==ctx.participants.official) throw new Error('Canonical party queue failed');
    window.civilCheckpoint=civilSavePoint();
    return {nomination:nomination,pure:pure,stale:stale,parity:parity,onlyOwn:onlyOwn,confirm:confirm,loss:loss,saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({nomination:true,pure:true,stale:true,parity:true,onlyOwn:true,confirm:true,loss:true});
  await restoreBookmark(page,result.saved);await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {return civilFacts();})).toEqual(await page.evaluate(function () {return civilCheckpoint;}));
});

for (const json of [false,true]) test((json?'JSON':'native')+' recognition declares and withdraws only the household’s real civic mandate',async function ({page},info) {
  await start(page,info,json);await stage(page,json,false);
  const result=await page.evaluate(function () {
    const s=FB.state,a=CIVIL,E=FB.officeEventReviews,me=E.actor(s);
    const city=FB.officeAppointmentQuote(s,me,{institutionId:a.rid,officeId:'urban_prefect',holder:me,scope:{kind:'county',id:a.pid}});
    const appointed=FB.officeSeekAppointment(s,city);
    if (!appointed) throw new Error('No civic mandate '+JSON.stringify(city));
    const claim=FB.officeClaimants(s).find(function (r) {return r.holder.kind==='character'&&r.holder.id!==me.id;});
    if (!claim) throw new Error('No living claim in native content');
    s.roles.friend=claim.holder.id;civilTier(s,6);
    const ev=FB.eventById(a.json?'river_civil_claim':'imperial_office_changed_voices');
    const option=ev.options.find(function (o) {return o.review&&o.review.args.action==='recognize';});
    const ctx=FB.eventContextFor(s,ev,{subjectKind:'character',subjectId:me.id});
    const before=JSON.stringify(s),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter(),q=FB.eventReviews.quote(s,option,ctx);
    const pure=!!q&&before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const disclosure=FB.eventReviews.details(s,q).join(' ');
    const disclosed=disclosure.indexOf(FB.legitimacySourceName(s,q.quote.review.mandate.source))>=0&&
      disclosure.indexOf(s.realms[q.quote.review.claimant.institutionId].name)>=0&&disclosure.indexOf(FB.fullName(s.chars[q.quote.targetId]))>=0;
    const fork=JSON.parse(before),auto=JSON.parse(before);
    const direct=FB.officeDeclareClaim(fork,q.quote.review);
    const automated=FB.resolveEventOption(auto,ev,option,FB.eventContextFor(auto,ev,ctx),{automated:true});
    const standing=s.player.prestige,receipt=FB.resolveEventOption(s,ev,option,ctx,{reviewed:q});
    const parity=!!direct&&!!receipt&&!!automated&&JSON.stringify(s.authority)===JSON.stringify(fork.authority)&&JSON.stringify(s.authority)===JSON.stringify(auto.authority)&&s.player.prestige===standing-q.quote.review.prestige;
    const independent=JSON.stringify(s.authority.recognitions.filter(function (r) {return r.source!==q.quote.review.mandate.source;}));
    const ce=FB.eventById(a.json?'river_civil_contest':'imperial_office_changed_voices'),co=ce.options.find(function (o) {return o.review&&o.review.args.action==='contest';});
    const cc=FB.eventContextFor(s,ce,ctx),cq=FB.eventReviews.quote(s,co,cc);
    FB.authorityAppointmentTransition(s,appointed.id,'contest');
    const changed=JSON.stringify(s),stale=!FB.eventReviews.commit(s,co,cc,cq)&&changed===JSON.stringify(s);
    // Reaffirmation remains the existing resident-holder petition, with no new consent.
    if (!FB.officeTransition(s,FB.officeTransitionQuote(s,me,appointed.id,'confirm'))) throw new Error('Civic reaffirmation failed');
    const withdrawn=FB.resolveEventOption(s,ce,co,cc,{reviewed:FB.eventReviews.quote(s,co,cc)});
    const ownOnly=!!withdrawn&&independent===JSON.stringify(s.authority.recognitions.filter(function (r) {return r.source!==q.quote.review.mandate.source;}));
    civilTier(s,2);
    window.civilCheckpoint=civilSavePoint();
    return {pure:pure,disclosed:disclosed,parity:parity,stale:stale,ownOnly:ownOnly,saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({pure:true,disclosed:true,parity:true,stale:true,ownOnly:true});
  await restoreBookmark(page,result.saved);await restoreBookmark(page,await page.evaluate(function () {return FB.save.serialize();}));
  expect(await page.evaluate(function () {return civilFacts();})).toEqual(await page.evaluate(function () {return civilCheckpoint;}));
});

test('typed candidate rejection, unavailable observation and exact live identities remain pure',async function ({page},info) {
  await start(page,info,true);await stage(page,true,true);
  const result=await page.evaluate(function (mod) {
    // Resolve the ordinary first-event activation before probing isolated
    // transaction forks; its telemetry belongs to the active campaign.
    const initial=FB.eventById('river_civil_petition'),initialCtx=FB.eventContextFor(FB.state,initial,{});
    if (!FB.resolveEventOption(FB.state,initial,initial.options[1],initialCtx,{automated:true})) throw new Error('Initial costless refusal failed');
    const s=FB.state,before=JSON.stringify(s),data=JSON.stringify(FBDATA.events),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter();
    const accepted=FB.mods.validate(mod);
    const malformed=[];
    function reject(edit) {
      const candidate=JSON.parse(JSON.stringify(mod));edit(candidate);const source=JSON.stringify(candidate);
      const faults=FB.mods.validate(candidate);let refused=false;try {FB.mods.apply(candidate);} catch (error) {refused=true;}
      malformed.push(refused&&faults.length>0&&source===JSON.stringify(candidate)&&before===JSON.stringify(s)&&data===JSON.stringify(FBDATA.events)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter());
    }
    reject(function (m) {m.events[0].options[0].review.args.officeId='missing_office';});
    reject(function (m) {m.events[0].options[0].review.args.money=100;});
    reject(function (m) {m.events[3].options[0].review.args.remittance=0.4;});
    reject(function (m) {m.events[4].options[0].review.args.remittance=1;});
    reject(function (m) {m.events[5].options[0].review.args.sourceId='missing_source';});
    reject(function (m) {m.events[0].options[0].review.refusalOption=0;});
    reject(function (m) {m.events[0].options[0].effects={gold:100};});
    reject(function (m) {m.events[0].trigger.state=[{reader:'civil_office',args:{status:'invented'}}];});
    reject(function (m) {m.events[0].trigger.state=[{reader:'legitimacy_band',args:{band:'single_source',subject:'other_ruler'}}];});
    reject(function (m) {m.events[5].options[0].review.args.participant='missing_slot';});
    reject(function (m) {m.events[5].participants[1].required=false;});
    reject(function (m) {m.events[6].options[0].review.args.sourceId='imperial_commission';});
    reject(function (m) {m.events[0].options[0].review.args.officeId='patricius';});
    reject(function (m) {m.events[0].participantCards=['friend'];});
    reject(function (m) {m.events[0].participants[1].source='role';m.events[0].participants[1].role='friend';});
    const d=civilDecision('petition'),q=FB.eventReviews.quote(s,d.option,d.ctx),system=FBDATA.systems.event_authority,owner=system.eventReaderOwner;
    const staged=JSON.parse(JSON.stringify(s)),a=CIVIL,me=FB.officeEventReviews.actor(staged),profile=FB.administrationProfile(staged,a.rid);
    const appointment=FB.publicAppoint(staged,FB.publicAppointmentQuote(staged,me,{institutionId:a.rid,officeId:profile.governor,holderId:me.id,
      provinceId:a.pid,scope:{kind:'county',id:a.pid}}));
    if (!appointment) throw new Error('Unavailable-state fixture needs its canonical appointment');
    const witness=staged.chars[staged.roles.friend];FB.SKILLS.forEach(function (skill) {witness.skills[skill]=20;});
    if (!FB.publicAppoint(staged,FB.publicAppointmentQuote(staged,{kind:'realm',id:a.rid},{institutionId:a.rid,officeId:profile.fiscal,holderId:witness.id,provinceId:a.pid,scope:{kind:'county',id:a.pid}}))) throw new Error('Missing recognition officer');
    const row=staged.authority.appointments.find(function (r) {return r.id===appointment.id;});
    FB.authorityAppointmentTransition(staged,row.id,'contest');row.publicTerms.arrears=5;
    const declarations=[['river_civil_petition','office_petition'],['imperial_office_court_patron','office_appointment'],
      ['river_civil_repay','office_dues'],['river_civil_support','office_recognition']].map(function (pair) {
      const ev=FB.eventById(pair[0]),option=ev.options.find(function (o) {return o.review&&o.review.type===pair[1];});
      const ctx=FB.eventContextFor(staged,ev,{});return {ev:ev,option:option,ctx:ctx,quote:FB.eventReviews.quote(staged,option,ctx)};
    });
    const readBefore=JSON.stringify(staged),readRng=(FB.getRngState()>>>0),readUid=FB.getUidCounter();
    declarations.forEach(function (d) {for (let i=0;i<3;i++) {
      const reviewed=FB.eventReviews.quote(staged,d.option,d.ctx);if (reviewed) FB.eventReviews.details(staged,reviewed);
    }});
    const pureReads=declarations.every(function (d) {return !!d.quote;})&&readBefore===JSON.stringify(staged)&&readRng===(FB.getRngState()>>>0)&&readUid===FB.getUidCounter();
    const exactParties=declarations.every(function (d) {
      const fork=JSON.parse(JSON.stringify(staged)),ctx=JSON.parse(JSON.stringify(d.ctx));
      const original=JSON.stringify(ctx),bound=FB.eventContextFor(fork,d.ev,ctx,true);
      const exact=!!bound&&JSON.stringify(bound)===original&&d.quote.participants.official===ctx.participants.official;
      const missing=!FB.eventContextFor(fork,d.ev,{participants:{}})&&!FB.eventContextFor(fork,d.ev,{},true);
      fork.chars[ctx.participants.official].dead=true;
      const before=JSON.stringify(fork),rng=FB.getRngState(),uid=FB.getUidCounter();
      const dead=!FB.eventReviews.commit(fork,d.option,ctx,d.quote)&&!FB.resolveEventOption(fork,d.ev,d.option,ctx,{reviewed:d.quote});
      return exact&&missing&&dead&&before===JSON.stringify(fork)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
    const refusals=declarations.every(function (d) {
      const fork=JSON.parse(JSON.stringify(staged)),ctx=FB.eventContextFor(fork,d.ev,{});
      const before=JSON.stringify([fork.authority,fork.player.gold,fork.player.prestige,fork.chars,fork.owner,fork.holder]),rng=(FB.getRngState()>>>0),uid=FB.getUidCounter();
      const receipt=FB.resolveEventOption(fork,d.ev,d.ev.options[d.option.review.refusalOption],ctx,{});
      return !!receipt&&before===JSON.stringify([fork.authority,fork.player.gold,fork.player.prestige,fork.chars,fork.owner,fork.holder])&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    });
    delete system.eventReaderOwner;
    let disabled;
    try {
      const changed=JSON.stringify(s);
      disabled=FB.eventReviews.quote(s,d.option,d.ctx)===null&&!FB.eventReviews.commit(s,d.option,d.ctx,q)&&
        !FB.eventStateReaders.test(s,[{reader:'civil_office',args:{status:'none'},not:true}],{})&&changed===JSON.stringify(s)&&
        declarations.every(function (d) {return FB.eventReviews.quote(staged,d.option,d.ctx)===null&&!FB.eventReviews.commit(staged,d.option,d.ctx,d.quote);})&&readBefore===JSON.stringify(staged);
    } finally {system.eventReaderOwner=owner;}
    const form=FBDATA.governmentForms.administrative_monarchy,priorSystems=form.systems;
    let publicDisabled;
    try {
      form.systems={disable:['public_offices']};FB.governments.invalidate();
      publicDisabled=declarations.every(function (d) {
        return FB.eventReviews.quote(staged,d.option,d.ctx)===null&&!FB.eventReviews.commit(staged,d.option,d.ctx,d.quote);
      })&&readBefore===JSON.stringify(staged);
    } finally {form.systems=priorSystems;FB.governments.invalidate();}
    const governor=FBDATA.authorityOffices[profile.governor],priorPowers=governor.powers;
    const defaultPetition={review:{type:'office_petition',args:{},refusalOption:1}};
    let civilOnly;
    try {
      governor.powers=priorPowers.concat(['ban']);
      civilOnly=FB.eventReviews.quote(s,defaultPetition,d.ctx)===null&&before===JSON.stringify(s);
    } finally {governor.powers=priorPowers;}
    const old=JSON.stringify(s);s.player.charId=s.roles.friend;
    const swapped=JSON.stringify(s),identity=!FB.eventReviews.commit(s,d.option,d.ctx,q)&&swapped===JSON.stringify(s);
    return {accepted:accepted,malformed:malformed,disabled:disabled,publicDisabled:publicDisabled,civilOnly:civilOnly,identity:identity,reads:old===before,pureReads:pureReads,exactParties:exactParties,refusals:refusals};
  },imported);
  expect(result).toEqual({accepted:[],malformed:Array(15).fill(true),disabled:true,publicDisabled:true,civilOnly:true,identity:true,reads:true,pureReads:true,exactParties:true,refusals:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' all office reviews retain exact portraits, controls and state on cancellation',async function ({page},info) {
  await start(page,info,json);await stage(page,json,true);
  await page.setViewportSize({width:390,height:844});
  for (const kind of ['petition','repay','support','confirm']) {
    const setup=await page.evaluate(function (kind) {
      const s=FB.state,a=CIVIL,E=FB.officeEventReviews,R=FB.governmentRecognition,profile=FB.administrationProfile(s,a.rid);
      FB.game.auto.all=false;FB.game.auto.major=false;FB.game.auto.minor=false;
      FB.game.uiPrefs.autoResumeAfterEvents=false;
      if (kind==='petition') {civilTier(s,1);window.originalApplicant=s.player.charId;}
      else {
        civilTier(s,kind==='repay'?2:3);
        let row=s.authority.appointments.find(function (r) {return r.institutionId===a.rid&&r.holder.id===originalApplicant&&r.publicTerms;});
        if (!row) {
          const q=FB.publicAppointmentQuote(s,E.actor(s),{institutionId:a.rid,officeId:profile.governor,holderId:originalApplicant,provinceId:a.pid,scope:{kind:'county',id:a.pid}});
          const granted=FB.publicAppoint(s,q);if (!granted) throw new Error('Missing UI commission '+JSON.stringify(q));
          row=s.authority.appointments.find(function (r) {return r.id===granted.id;});
        }
        row.publicTerms.arrears=kind==='repay'?5:0;
        if (kind==='support') {
          const friend=s.chars[s.roles.friend];FB.SKILLS.forEach(function (skill) {friend.skills[skill]=20;});
          const granted=FB.publicAppoint(s,FB.publicAppointmentQuote(s,{kind:'realm',id:a.rid},{institutionId:a.rid,officeId:profile.fiscal,holderId:friend.id,provinceId:a.pid,scope:{kind:'county',id:a.pid}}));
          if (!granted||!R.nominate(s,R.nominationQuote(s,{kind:'realm',id:a.rid},a.rid,friend.id))) throw new Error('Missing UI nominee');
        }
        if (kind==='confirm') {
          s.player.charId=FB.realmRulerCharacterSnapshot(s,a.rid).id;
          FB.authorityAppointmentTransition(s,row.id,'contest');
        }
      }
      const nativeIds={petition:'court_application',repay:'honor_demand',support:'court_decision',confirm:'court_decision'};
      const ev=FB.eventById(a.json?'river_civil_'+kind:'imperial_office_'+nativeIds[kind]);
      const type=kind==='support'?'office_recognition':kind==='confirm'?'office_appointment':kind==='repay'?'office_dues':'office_petition';
      const option=ev.options.find(function (o) {
        return o.review&&o.review.type===type&&(kind!=='support'||o.review.args.action==='recognize');
      });
      const ctx=FB.eventContextFor(s,ev,{}),q=FB.eventReviews.quote(s,option,ctx);
      window.uiDecision={ev:ev,option:option,ctx:ctx};
      FB.ui.runEvents([{id:ev.id,ctx:ctx}]);
      return {allowed:!!q&&q.quote.allowed,index:ev.options.indexOf(option),refusal:option.review.refusalOption,person:ctx.participants.official};
    },kind);
    expect(setup.allowed,kind+' opens an allowed canonical review').toBe(true);
    const option=page.locator('#ev-options .event-choice > .evopt').nth(setup.index);
    await expect(option).toBeVisible();
    await option.evaluate(function (node) {window.cancelNode=node;});
    await page.evaluate(function () {
      window.cancelBefore=JSON.stringify(FB.state);window.cancelRng=(FB.getRngState()>>>0);window.cancelUid=FB.getUidCounter();
      window.cancelPerson=uiDecision.ctx.participants.official;
      window.cancelParty=document.querySelector('[data-event-character="'+cancelPerson+'"]').closest('.event-participant-card');cancelParty.style.minHeight='900px';
      window.cancelDetails=document.querySelector('#ev-options .event-choice-details');
      if (cancelDetails) cancelDetails.classList.remove('hidden');
    });
    for (const route of kind==='petition'?['cancel','back','escape']:['cancel']) {
      await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
      await option.evaluate(function (node) {
        node.focus({preventScroll:true});const card=document.querySelector('#eventmodal .modalcard');card.scrollTop=50;window.cancelScroll=card.scrollTop;node.click();
      });
      await expect(page.locator('#event-review-cancel')).toBeVisible();
      const portrait=page.locator('#ev-text [data-event-character="'+setup.person+'"]');
      await expect(portrait).toHaveAttribute('data-event-character',setup.person);
      await expect(portrait.locator('canvas.pface')).toBeVisible();
      expect(await page.evaluate(function () {return cancelParty===document.querySelector('[data-event-character="'+cancelPerson+'"]').closest('.event-participant-card');})).toBe(true);
      await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
      if (route==='cancel') await page.locator('#event-review-cancel').click();
      else if (route==='back') await page.locator('#event-nav-back').click();
      else await page.keyboard.press('Escape');
      await expect(option).toBeVisible();
      expect(await page.evaluate(function () {return cancelBefore===JSON.stringify(FB.state)&&cancelRng===(FB.getRngState()>>>0)&&cancelUid===FB.getUidCounter()&&
        cancelParty===document.querySelector('[data-event-character="'+cancelPerson+'"]').closest('.event-participant-card')&&document.contains(cancelNode)&&document.activeElement===cancelNode&&cancelScroll>0&&cancelScroll===document.querySelector('#eventmodal .modalcard').scrollTop&&
        (!cancelDetails||!cancelDetails.classList.contains('hidden'));})).toBe(true);
      await expect(option).toBeFocused();
    }
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    if (kind==='confirm') {
      await option.click();await expect(page.locator('#event-review-confirm')).toBeEnabled();
      await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
      await page.locator('#event-review-confirm').click();
      await expect(page.locator('#outcome-continue')).toBeVisible();
      await expect(page.locator('.decision-outcome-people [data-event-character="'+setup.person+'"]')).toBeVisible();
      expect(await page.evaluate(function () {return FB.state.authority.appointments.find(function (r) {return r.id===uiDecision.ctx.appointmentId;}).status;})).toBe('active');
      await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
      await page.locator('#outcome-continue').click();
    } else {
      await page.locator('#ev-options .event-choice > .evopt').nth(setup.refusal).click();
    }
    await expect(page.locator('#eventmodal')).toHaveClass(/hidden/);
  }
});
