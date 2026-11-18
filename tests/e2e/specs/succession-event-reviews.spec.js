'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {startPreparedParityGame} = require('../support/game/parity');
const {beginBookmarkFromTitle,restoreBookmark} = require('../support/game/bookmark-acceptance');
const {installRestoreFacts} = require('../support/game/restore-facts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/succession-event-reviews-river.json');
const courts = require('../fixtures/authoring/succession-event-reviews-courts.json');
dependsOnRuntime(__filename,[
  'data/events_kingship_succession.js','data/political_institutions.js','data/aristocratic_courts.js',
  'data/bookmark_711.js','data/bookmark_800_history.js','data/starts_rulers_800.js',
  'data/story_ruler_agendas.js','data/story_ruler_agendas_800.js','data/systems.js',
  'js/schema.js','js/events.js','js/government_selection.js','js/government_lineage.js',
  'js/government_elective.js','js/government_recognition.js','js/government_aristocracy.js',
  'js/government_administration.js','js/governments.js','js/authority.js','js/treasury.js',
  'js/institutions.js','js/lordships.js','js/model.js','js/world.js','js/starts.js','js/politics.js',
  'js/stories.js','js/story_settlements.js','js/story_ruler_agenda.js','js/systems.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/ui_modals.js','js/ui_misc.js'
]);
test.describe.configure({mode:'parallel'});

async function restoreReview(page,source) {
  try {await restoreBookmark(page,source);}
  catch (error) {
    const reason=await page.evaluate(function () {return {stage:FB.game.lastLoadStage,
      error:FB.game.lastLoadError&&FB.game.lastLoadError.message};});
    throw new Error(error.message+' '+JSON.stringify(reason));
  }
}

test('shared political declarations preserve complete native catalogue preparation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function () {
    const missing=['476','711','800'].filter(function (id) {return !FBDATA.bookmarks[id];});
    const faults=FBDATA.events.filter(function (e) {return e.pack==='kingship_succession';}).reduce(function (all,e) {
      return all.concat(FB.validateEventStateConditions(e));
    },[]);
    return {missing:missing,faults:faults,withdrawn:missing.length?FB.bookmarkSources.reports():[]};
  });
  expect(result).toEqual({missing:[],faults:[],withdrawn:[]});
});

async function snapshots(page) {
  await installRestoreFacts(page);
  await page.evaluate(function () {
    window.reviewFacts=function () {
      const e=JSON.parse(FB.save.serialize()),s=FB.save.expandedSnapshot(e.state);
      // Wire defaults are compared on detached copies; array order and every
      // populated canonical record remain exact.
      if (s.countySupport===undefined) s.countySupport={};
      s.rebellions=Object.assign({groups:{},warnings:{},cooldowns:{}},s.rebellions||{});
      s.greatHolyWarHistory=Object.assign({sequence:0,campaigns:[],cooldownUntil:{},firstCall:{},firstLaunched:{},
        headState:{},sacredLossSince:{},unlockChecked:{}},s.greatHolyWarHistory||{});
      Object.keys(s.realms).forEach(function (rid) {
        const t=s.realms[rid].treasury;
        if (!t) return;
        // These two projections refresh from current commitments at repair;
        // balances, bills, payment stamps and every ledger field stay exact.
        delete t.necessary;delete t.reserveTarget;
        if (t.distributionCooldown===undefined) t.distributionCooldown=0;
        if (t.distributionNextTurn===undefined) t.distributionNextTurn=0;
      });
      function ordered(v) {
        if (Array.isArray(v)) return v.map(ordered);
        if (!v||typeof v!=='object') return v;
        const out={};Object.keys(v).sort().forEach(function (key) {out[key]=ordered(v[key]);});return out;
      }
      return JSON.stringify({state:ordered(s),rng:e.rng>>>0,uid:e.uid,mods:e.mods});
    };
    window.reviewSavePoint=function () {
      // Finish ordinary owner maintenance after directly staged boundaries.
      FB.syncHomeCountyLord(FB.state);FB.ensureStepRelations(FB.state);FB.repairPolitics(FB.state);
      FB.notePlayerStatus(FB.state);FB.ensureLifeHistories(FB.state);FB.ensureAgency(FB.state);FB.validateFocus(FB.state);
      return reviewFacts();
    };
  });
}
async function imported(page,info,file) {
  await openGame(page,info);
  const input=path.resolve(__dirname,'../fixtures/authoring/'+file),payload=require(input);
  expect(await page.evaluate(function (m) {return FB.mods.validate(m);},payload)).toEqual([]);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(input);
  await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}
async function selection(page,info,json) {
  if (json) {
    await imported(page,info,'succession-event-reviews-river.json');
    await beginBookmarkFromTitle(page,'river_consultation_world','river_farmer_demo');
  } else await startHistoricalGame(page,info,{bookmark:'711',scenario:'toledo_household_711',declaredOpening:true});
  await page.evaluate(function (json) {
    const s=FB.state,p=s.player,c=s.chars[p.charId],S=FB.governmentSelection,rid=FB.settlementCountyHolder(s,p.provinceId);
    FB.game.setPaused(true);FB.ui.coachmarkReset();delete p.flags.tutorial;
    FB.setPlayerTier(s,2,{attachLiege:false,formTenure:false,stationFarewell:false});
    c.born=s.date.year-30;c.station=2;c.sex='m';c.culture=json?'norse':'gothic';c.religion=json?'norse_pagan':'catholic';
    delete c.unfree;p.gold=200;s.realms[rid].treasury.gold=200;
    FB.SKILLS.forEach(function (id) {c.skills[id]=20;});
    FB.realmHeldCounties(s,rid).forEach(function (pid) {FB.setCountySupport(s,pid,40);});
    const member=S.state(s,rid).members[0];
    s.localInstitutions[member.principal.id].representativeId=c.id;
    const nominee=FB.makeCharacter(s,{name:'Independent candidate',dyn:'Other House',sex:'m',born:s.date.year-30,
      culture:c.culture,religion:c.religion,station:2,role:'notable',traits:[]});
    nominee.homeProvinceId=p.provinceId;FB.SKILLS.forEach(function (id) {nominee.skills[id]=20;});
    if (!json && !S.apply(s,S.quote(s,rid,{action:'open',actor:{kind:'realm',id:rid},cause:'abdication'}))) throw new Error('No lawful vacancy');
    window.POLITICAL={json:json,rid:rid,nominee:nominee.id};
    window.politicalDecision=function (kind) {
      const names={nominate:'kingship_crown_canvassed_names',support:'kingship_crown_quiet_refusal',withhold:'kingship_crown_quiet_refusal',withdraw:'kingship_crown_quiet_refusal',negotiate:'kingship_crown_promise_and_vote'};
      const ev=FB.eventById(POLITICAL.json?'river_review_'+kind:names[kind]);
      const option=ev.options.find(function (o) {return o.review && (kind==='nominate'?o.review.type==='political_nomination':o.review.args.action===kind);});
      const ctx=FB.eventContextFor(FB.state,ev,{});
      return {ev:ev,option:option,ctx:ctx,q:FB.eventReviews.quote(FB.state,option,ctx)};
    };
    window.politicalFacts=function () {
      return reviewFacts();
    };
    // Complete the ordinary first-event telemetry before transaction forks.
    const d=politicalDecision('nominate');
    if (!d.ctx || !d.q || !d.q.quote.allowed) throw new Error('No admission review '+JSON.stringify(d));
    if (!FB.resolveEventOption(s,d.ev,d.ev.options[1],d.ctx,{automated:true})) throw new Error('No costless refusal');
  },json);
  await snapshots(page);
}

for (const json of [false,true]) test((json?'JSON':'native')+' admission, own assent/refusal and paid political negotiation share canonical commits',async function ({page},info) {
  await selection(page,info,json);
  const result=await page.evaluate(function () {
    const s=FB.state,a=POLITICAL,S=FB.governmentSelection,t=s.realms[a.rid].succession;
    let d=politicalDecision('nominate'),q=d.q,before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    for (let i=0;i<4;i++) {FB.eventReviews.quote(s,d.option,d.ctx);FB.eventReviews.details(s,q);FB.eventStateReaders.test(s,[{reader:'political_selection',args:{status:'active'}}],{});}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const fork=JSON.parse(before),auto=JSON.parse(before),direct=S.apply(fork,q.quote.review);
    const automated=FB.resolveEventOption(auto,d.ev,d.option,d.ctx,{automated:true});
    const owners=JSON.stringify([s.owner,s.holder]),ruler=t.rulerMemberId,gold=s.player.gold;
    const receipt=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:q});
    const admission=!!direct&&!!automated&&!!receipt&&JSON.stringify(fork.authority)===JSON.stringify(s.authority)&&
      JSON.stringify(auto.authority)===JSON.stringify(s.authority)&&s.player.gold===gold&&owners===JSON.stringify([s.owner,s.holder])&&t.rulerMemberId===ruler;
    before=JSON.stringify(s);
    const duplicate=!FB.eventReviews.commit(s,d.option,d.ctx,q)&&before===JSON.stringify(s);
    // A candidate's negotiation must be for that candidate, never another name.
    if (!S.candidates(s,a.rid).some(function (id) {return t.members[id].charId===s.player.charId;})) {
      const own=S.quote(s,a.rid,{action:'nominate',actor:{kind:'character',id:s.player.charId},
        memberId:S.constituency(s,a.rid)[0].id,characterId:s.player.charId});
      if (!S.apply(s,own)) throw new Error('Self admission refused '+JSON.stringify(own));
    }
    if (!S.state(s,a.rid).vacancy && !S.apply(s,S.quote(s,a.rid,{action:'open',actor:{kind:'realm',id:a.rid},cause:'abdication'}))) throw new Error('Vacancy refused');
    d=politicalDecision('withhold');
    const refused=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q});
    const voice=S.constituency(s,a.rid)[0],vote=S.state(s,a.rid).vacancy.support[voice.id];
    const ownRefusal=!!refused&&vote.candidateId===null&&vote.reason==='local_refusal';
    d=politicalDecision('support');
    const supported=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q});
    const ownOnly=!!supported&&S.state(s,a.rid).vacancy.support[voice.id].candidateId===d.q.quote.review.request.candidateId;
    const assent=S.quote(s,a.rid,{action:'assent',actor:{kind:'realm',id:a.rid},candidateId:t.rulerMemberId,terms:S.profile(s,a.rid).terms});
    if (!S.apply(s,assent)) throw new Error('Incumbent assent refused');
    d=politicalDecision('withdraw');
    const withdrawn=!!d.q&&!!FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q})&&S.state(s,a.rid).recognition.consents.indexOf(voice.id)<0;
    d=politicalDecision('negotiate');q=d.q;
    if (!q || !q.quote.allowed) throw new Error('No funded review '+JSON.stringify(d));
    const disclosed=FB.eventReviews.details(s,q).join(' ').indexOf('personal purse')>=0;
    const paidFork=JSON.parse(JSON.stringify(s)),paidAuto=JSON.parse(JSON.stringify(s));
    const cash=s.player.gold,cost=q.quote.review.cost;
    const canonical=S.apply(paidFork,q.quote.review);
    const autoPaid=FB.resolveEventOption(paidAuto,d.ev,d.option,d.ctx,{automated:true});
    const paid=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:q});
    const finite=cost>0&&cash-s.player.gold===cost&&!!canonical&&!!autoPaid&&!!paid&&
      paidFork.player.gold===s.player.gold&&paidAuto.player.gold===s.player.gold&&
      JSON.stringify(paidFork.authority)===JSON.stringify(s.authority)&&JSON.stringify(paidAuto.authority)===JSON.stringify(s.authority)&&
      paid.impacts.some(function (r) {return r.type==='gold'&&r.amount===-cost;});
    window.politicalCheckpoint=reviewSavePoint();
    return {pure:pure,admission:admission,duplicate:duplicate,ownRefusal:ownRefusal,ownOnly:ownOnly,withdrawn:withdrawn,disclosed:disclosed,finite:finite,saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({pure:true,admission:true,duplicate:true,ownRefusal:true,ownOnly:true,withdrawn:true,disclosed:true,finite:true});
  for (let i=0;i<2;i++) {
    await restoreBookmark(page,i?await page.evaluate(function () {return FB.save.serialize();}):result.saved);
    expect(await page.evaluate(function () {return assertRestoreFacts(politicalFacts(),politicalCheckpoint);})).toBe(true);
  }
});

for (const json of [false,true]) test((json?'JSON':'native')+' stale mandate, dead target, changed funds and disabled observations reject without mutation',async function ({page},info) {
  await selection(page,info,json);
  const result=await page.evaluate(function () {
    const s=FB.state,a=POLITICAL,d=politicalDecision('nominate'),q=d.q,rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    const outcomes=[];
    function rejects(edit) {
      const f=JSON.parse(JSON.stringify(s));edit(f);const before=JSON.stringify(f);
      outcomes.push(!FB.eventReviews.commit(f,d.option,d.ctx,q)&&before===JSON.stringify(f)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter());
    }
    const seat=FB.governmentSelection.state(s,a.rid).members[0];
    rejects(function (f) {f.localInstitutions[seat.principal.id].representativeId=a.nominee;});
    rejects(function (f) {f.chars[q.quote.targetId].dead=true;});
    rejects(function (f) {f.realms[a.rid].ruler.generation=FB.realmRulerGeneration(f,a.rid)+1;f.realms[a.rid].succession.rulerGeneration++;});
    rejects(function (f) {f.player.gold--;});
    rejects(function (f) {f.holder[f.player.provinceId]=null;f.owner[f.player.provinceId]=null;});
    const f=JSON.parse(JSON.stringify(s)),before=JSON.stringify(f),system=FBDATA.systems.event_governments;
    FBDATA.systems.event_governments=Object.assign({},system,{defaultEnabled:false});
    const disabled=!FB.eventReviews.quote(f,d.option,d.ctx)&&!FB.eventStateReaders.test(f,[{reader:'political_selection',args:{status:'active'},not:true}],{})&&before===JSON.stringify(f);
    FBDATA.systems.event_governments=system;
    const supplied=FB.eventContextFor(s,d.ev,{participants:{}})===false;
    const denied=JSON.parse(JSON.stringify(s)),S=FB.governmentSelection;
    if (!S.apply(denied,q.quote.review)) throw new Error('Detached nomination refused');
    if (!S.state(denied,a.rid).vacancy) S.apply(denied,S.quote(denied,a.rid,{action:'open',actor:{kind:'realm',id:a.rid},cause:'abdication'}));
    const ev=FB.eventById(a.json?'river_review_withhold':'kingship_crown_quiet_refusal'),option=ev.options[0],ctx=FB.eventContextFor(denied,ev,{});
    denied.localInstitutions[seat.principal.id].representativeId=a.nominee;
    const stores=JSON.stringify([denied.authority,denied.player.gold,denied.chars,denied.owner,denied.holder]);
    const fallback=!!FB.resolveEventOption(denied,ev,option,ctx,{automated:true})&&stores===JSON.stringify([denied.authority,denied.player.gold,denied.chars,denied.owner,denied.holder])&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    return {outcomes:outcomes,disabled:disabled,supplied:supplied,fallback:fallback};
  });
  expect(result).toEqual({outcomes:[true,true,true,true,true],disabled:true,supplied:true,fallback:true});
});

test('an imported majority profile produces a real losing vote on the household home holder',async function ({page},info) {
  await selection(page,info,true);
  const result=await page.evaluate(function () {
    const s=FB.state,S=FB.governmentSelection,rid=POLITICAL.rid,t=s.realms[rid].succession,pid=s.player.provinceId;
    for (let i=0;i<2;i++) {
      const d=politicalDecision('nominate');
      if (!d.q || !FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q})) throw new Error('Actual admission failed');
    }
    const voices=S.constituency(s,rid),lord=s.chars[voices[1].currentPrincipal.id];
    lord.homeProvinceId=pid;
    if (!S.apply(s,S.quote(s,rid,{action:'assent',actor:{kind:'realm',id:rid},candidateId:t.rulerMemberId,terms:S.profile(s,rid).terms}))) throw new Error('Court assent failed');
    if (!FB.assignSettlementLordship(s,pid,1,lord.id)) throw new Error('No actual secondary estate');
    s.player.homeSettlement=1;s.roles.friend=lord.id;
    if (!S.apply(s,S.quote(s,rid,{action:'open',actor:{kind:'realm',id:rid},cause:'abdication'}))) throw new Error('Lawful vacancy failed');
    const ids=S.candidates(s,rid),winner=ids.find(function (id) {return t.members[id].charId!==s.player.charId;}),loser=ids.find(function (id) {return id!==winner;});
    if (!winner || !loser) throw new Error('Two actual candidates are required');
    [winner,loser].forEach(function (id,i) {
      if (!S.apply(s,S.quote(s,rid,{action:'support',actor:{kind:'character',id:voices[i].currentPrincipal.id},
        memberId:voices[i].id,candidateId:id,terms:S.profile(s,rid).terms}))) throw new Error('Independent support failed');
    });
    const resolved=S.apply(s,S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}));
    const ev=FB.eventById('kingship_crown_losing_household'),ctx=FB.eventContextFor(s,ev,{}),before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    const eligible=!!ctx&&FB.eventContextStillValid(s,ev,ctx)&&ctx.participants.friend===lord.id;
    const preview=FB.namedChance(s,ev.options[0].chance,ctx);
    for (let i=0;i<3;i++) {
      FB.eventStateReaders.test(s,[{reader:'political_selection',args:{status:'losing_lord'}}],{});
      if (FB.namedChance(s,ev.options[0].chance,ctx)!==preview) throw new Error('Unstable household chance');
    }
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const fork=JSON.parse(before);fork.roles.friend=s.player.charId;
    const wrongContact=!FB.checkTrigger(fork,ev.trigger,{});
    const votes=S.state(s,rid).vacancy;
    const actual=!!resolved&&votes.status==='resolved'&&votes.accessionId===winner&&votes.support[voices[1].id].candidateId===loser;
    const canonical=JSON.stringify([s.authority,s.player.gold,s.owner,s.holder]);
    const heard=FB.resolveEventOption(s,ev,ev.options[0],ctx,{automated:true});
    const household=preview>=0.1&&preview<=0.85&&!!heard&&canonical===JSON.stringify([s.authority,s.player.gold,s.owner,s.holder]);
    if (!FB.resolveEventOption(s,ev,ev.options[1],ctx,{automated:true})) throw new Error('Household refusal failed');
    window.politicalCheckpoint=reviewSavePoint();
    return {actual:actual,eligible:eligible,pure:pure,wrongContact:wrongContact,household:household,saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({actual:true,eligible:true,pure:true,wrongContact:true,household:true});
  for (let i=0;i<2;i++) {await restoreBookmark(page,i?await page.evaluate(function () {return FB.save.serialize();}):result.saved);expect(await page.evaluate(function () {return assertRestoreFacts(politicalFacts(),politicalCheckpoint);})).toBe(true);}
});

async function royal(page,info,json,partition) {
  if (json) await imported(page,info,'succession-event-reviews-courts.json');
  else await openGame(page,info);
  await startPreparedParityGame(page,{unhide:true,bookmark:partition?(json?'review_partition_world':'800'):'476',
    scenario:partition?(json?'review_partition_ruler':'charlemagne_800'):'peroz_sasanian_476',declaredOpening:true});
  await page.evaluate(function (input) {
    const s=FB.state;FB.game.setPaused(true);FB.ui.coachmarkReset();delete s.player.flags.tutorial;
    s.player.gold=400;if (s.realms.player.treasury) s.realms.player.treasury.gold=400;
    FB.realmHeldCounties(s,'player').forEach(function (pid) {FB.setCountySupport(s,pid,40);});
    if (input.partition) s.date={year:806,season:0,day:1};
    if (input.json&&!input.partition) FB.stories.start(s,{tracks:['review_royal_agenda']});
    window.ROYAL={json:input.json,partition:input.partition};
    window.royalDecision=function (kind) {
      const names={negotiate:'kingship_magnate_provincial_share',minor:'kingship_magnate_minor_terms',designate:'kingship_magnate_royal_cousins',support:'kingship_magnate_royal_cousins',withhold:'kingship_magnate_royal_cousins',agenda:'kingship_magnate_agenda_objection',partition:'kingship_regnum_partition_paper',decline:'kingship_regnum_partition_road'};
      const ev=FB.eventById(ROYAL.json?'court_review_'+kind:names[kind]);
      const option=ev.options.find(function (o) {return o.review&&(kind==='support'||kind==='withhold'?o.review.args.action===kind:true);});
      const ctx=FB.eventContextFor(FB.state,ev,{});
      return {ev:ev,option:option,ctx:ctx,q:FB.eventReviews.quote(FB.state,option,ctx)};
    };
    window.royalFacts=function () {
      return reviewFacts();
    };
    const d=royalDecision(input.partition?'partition':'negotiate');
    if (!d.ctx || !d.q) throw new Error('No royal review '+JSON.stringify(d));
    if (!FB.resolveEventOption(s,d.ev,d.ev.options[1],d.ctx,{automated:true})) throw new Error('Royal refusal failed');
  },{json:json,partition:!!partition});
  await snapshots(page);
}

for (const json of [false,true]) test((json?'JSON':'native')+' royal preferences, minority bargains and current principal refusal retain the canonical court',async function ({page},info) {
  await royal(page,info,json,false);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.governmentRecognition,A=FB.aristocracy,owner=JSON.stringify([s.owner,s.holder]);
    let d=royalDecision('negotiate'),q=d.q;
    const before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    for (let i=0;i<3;i++) {FB.eventReviews.quote(s,d.option,d.ctx);FB.eventReviews.details(s,q);FB.eventStateReaders.test(s,[{reader:'royal_recognition',args:{status:'active'}}],{});}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const form=FBDATA.governmentForms.aristocratic_monarchy,systems=form.systems;
    form.systems={disable:['public_offices']};FB.governments.invalidate();
    const disabled=FB.eventReviews.quote(s,d.option,d.ctx)===null&&!FB.eventReviews.commit(s,d.option,d.ctx,q)&&
      !FB.eventStateReaders.test(s,[{reader:'royal_recognition',args:{status:'active'}}],{});
    form.systems=systems;FB.governments.invalidate();
    const f=JSON.parse(before),auto=JSON.parse(before),cash=FB.treasuryAvailable(s,'player');
    const canonical=R.applySupport(f,q.quote.review),automated=FB.resolveEventOption(auto,d.ev,d.option,d.ctx,{automated:true});
    const committed=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:q});
    const finite=q.quote.review.cost>0&&cash-FB.treasuryAvailable(s,'player')===q.quote.review.cost&&!!canonical&&!!automated&&!!committed&&JSON.stringify(f.authority)===JSON.stringify(s.authority)&&JSON.stringify(auto.authority)===JSON.stringify(s.authority);
    // A simulated royal birth supplies a genuine minor without rewriting a
    // historical relative's saved birth or reconstructing another genealogy.
    const king=s.chars[s.player.charId],c=FB.makeCharacter(s,{name:'Young royal',sex:'m',born:s.date.year-10,
      culture:king.culture,religion:king.religion,dyn:king.dyn,fatherId:king.id,station:1});
    king.childrenIds.push(c.id);FB.registerRoyalBirth(s,c,king,null);
    d=royalDecision('designate');
    const preference=!!FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q})&&s.realms.player.succession.designatedHeirId!==undefined;
    d=royalDecision('minor');
    const minority=!!d.q&&d.q.quote.allowed&&d.q.quote.review.candidateId===c.id&&!!FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q})&&owner===JSON.stringify([s.owner,s.holder]);
    // A real magnate's changed authority invalidates the retained negotiation.
    d=royalDecision('negotiate');const voice=A.constituency(s,'player')[0],appointment=s.authority.appointments.find(function (r) {return r.id===voice.appointmentId;});
    const detached=JSON.parse(JSON.stringify(s));detached.chars[appointment.holder.id].dead=true;
    const changed=JSON.stringify(detached),stale=!FB.eventReviews.commit(detached,d.option,d.ctx,d.q)&&changed===JSON.stringify(detached);
    const replaced=JSON.parse(JSON.stringify(s)),old=voice.principal.id,newPrincipal=A.constituency(s,'player')[1].principal.id;
    replaced.authority.appointments.find(function (r) {return r.id===voice.appointmentId;}).holder.id=newPrincipal;
    const exactParty=FB.eventReviews.quote(replaced,d.option,d.ctx)===null&&d.ctx.participants.principal===old;
    window.royalCheckpoint=reviewSavePoint();
    const saved=FB.save.serialize(),wire=JSON.parse(saved),wireBefore=JSON.stringify(wire);
    const compact=FB.aristocracy.validateState(wire.state)===null&&wireBefore===JSON.stringify(wire);
    const bad=JSON.parse(saved),cid=bad.state.authority.governments.player.recognition.court.candidateId;
    bad.state.chars[cid].royalLine.memberId='missing_member';const invalidBefore=JSON.stringify(bad),liveBefore=JSON.stringify(s);
    let rejected=false;try {FB.save.v4.migrate(bad);} catch (error) {rejected=true;}
    const malformed=rejected&&invalidBefore===JSON.stringify(bad)&&liveBefore===JSON.stringify(s);
    return {pure:pure,disabled:disabled,finite:finite,preference:preference,minority:minority,stale:stale,exactParty:exactParty,compact:compact,malformed:malformed,saved:saved};
  });
  expect(result).toMatchObject({pure:true,disabled:true,finite:true,preference:true,minority:true,stale:true,exactParty:true,compact:true,malformed:true});
  for (let i=0;i<2;i++) {await restoreReview(page,i?await page.evaluate(function () {return FB.save.serialize();}):result.saved);expect(await page.evaluate(function () {return assertRestoreFacts(royalFacts(),royalCheckpoint);})).toBe(true);}
});

for (const json of [false,true]) test((json?'JSON':'native')+' partition authorization and refusal preserve territory and exact story state',async function ({page},info) {
  await royal(page,info,json,true);
  const result=await page.evaluate(function () {
    const s=FB.state,id=ROYAL.json?'review_partition':'divisio_800',d=royalDecision('partition'),before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    for (let i=0;i<3;i++) {FB.eventReviews.quote(s,d.option,d.ctx);FB.eventStateReaders.test(s,[{reader:'political_story',args:{storyId:id,choiceId:'approve',status:'pending_partition'}}],{});}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const system=FBDATA.systems.event_story_tracks,enabled=system.defaultEnabled;system.defaultEnabled=false;
    const disabled=FB.eventReviews.quote(s,d.option,d.ctx)===null&&!FB.eventReviews.commit(s,d.option,d.ctx,d.q)&&before===JSON.stringify(s);
    system.defaultEnabled=enabled;
    const fork=JSON.parse(before),auto=JSON.parse(before),owners=JSON.stringify([s.owner,s.holder]),ruler=s.realms.player.succession.rulerMemberId;
    const direct=FB.stories.apply(fork,id,'approve',d.q.quote.review),automated=FB.resolveEventOption(auto,d.ev,d.option,d.ctx,{automated:true});
    const recorded=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:d.q});
    const authorization=!!direct&&!!automated&&!!recorded&&JSON.stringify(fork.stories)===JSON.stringify(s.stories)&&JSON.stringify(auto.stories)===JSON.stringify(s.stories)&&s.stories[id].phase==='pending'&&Object.keys(s.stories[id].approvals).length>0;
    const retained=owners===JSON.stringify([s.owner,s.holder])&&ruler===s.realms.player.succession.rulerMemberId;
    const decline=royalDecision('decline'),refused=FB.resolveEventOption(s,decline.ev,decline.option,decline.ctx,{reviewed:decline.q});
    window.royalCheckpoint=reviewSavePoint();
    return {pure:pure,disabled:disabled,authorization:authorization,retained:retained,refused:!!refused&&s.stories[id].result==='declined',saved:FB.save.serialize()};
  });
  expect(result).toMatchObject({pure:true,disabled:true,authorization:true,retained:true,refused:true});
  for (let i=0;i<2;i++) {await restoreReview(page,i?await page.evaluate(function () {return FB.save.serialize();}):result.saved);expect(await page.evaluate(function () {return assertRestoreFacts(royalFacts(),royalCheckpoint);})).toBe(true);}
});

for (const json of [false,true]) test((json?'JSON':'native')+' queued partition reviews retain the original prospective heir across restore',async function ({page},info) {
  await royal(page,info,json,true);
  const saved=await page.evaluate(function () {
    const s=FB.state,d=royalDecision('partition'),queued=FB.queueEvent(s,d.ev.id,{});
    if (!queued || !queued.ctx.participants.heir) throw new Error('The actual prospective heir must be bound');
    window.queuedPolitical={id:d.ev.id,context:JSON.stringify(queued.ctx),heir:queued.ctx.participants.heir};
    window.royalCheckpoint=reviewSavePoint();return FB.save.serialize();
  });
  for (let i=0;i<2;i++) {
    await restoreReview(page,i?await page.evaluate(function () {return FB.save.serialize();}):saved);
    expect(await page.evaluate(function () {
      const s=FB.state,item=s.eventQueue.find(function (q) {return q.id===queuedPolitical.id;});
      return !!item&&JSON.stringify(item.ctx)===queuedPolitical.context&&item.ctx.participants.heir===queuedPolitical.heir&&assertRestoreFacts(royalFacts(),royalCheckpoint);
    })).toBe(true);
  }
  const result=await page.evaluate(function () {
    const s=FB.state,item=s.eventQueue.find(function (q) {return q.id===queuedPolitical.id;}),ev=FB.eventById(item.id),option=ev.options[0];
    const q=FB.eventReviews.quote(s,option,item.ctx),fork=JSON.parse(JSON.stringify(s));fork.chars[queuedPolitical.heir].dead=true;
    const before=JSON.stringify(fork),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    const rejected=FB.eventReviews.quote(fork,option,item.ctx)===null&&!FB.eventReviews.commit(fork,option,item.ctx,q);
    return {rejected:rejected,pure:before===JSON.stringify(fork)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter(),
      unchanged:item.ctx.participants.heir===queuedPolitical.heir};
  });
  expect(result).toEqual({rejected:true,pure:true,unchanged:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' an existing magnate gives only its own recognition and can withhold it',async function ({page},info) {
  if (json) await imported(page,info,'succession-event-reviews-courts.json');
  else await openGame(page,info);
  await startPreparedParityGame(page,{unhide:true,bookmark:'476',code:'ASSENT-476-farmer_476-rayy-m-Principal-established'});
  const result=await page.evaluate(function (json) {
    const s=FB.state,A=FB.aristocracy,R=FB.governmentRecognition,rid=FB.settlementCountyHolder(s,s.player.provinceId);
    const voice=A.constituency(s,rid).find(function (m) {return m.active&&m.scope.id===s.player.provinceId;});
    if (!voice) throw new Error('No canonical provincial principal');
    // Focus the test actor on the already existing principal. The public court
    // remains the actual NPC incumbent, with its own tree and treasury.
    s.player.charId=voice.principal.id;s.player.tier=2;s.player.provinceId=voice.scope.id;
    const king=FB.realmRulerCharacterSnapshot(s,rid),child=FB.makeCharacter(s,{name:'Young royal',sex:'m',born:s.date.year-10,
      culture:king.culture,religion:king.religion,dyn:king.dyn,fatherId:king.id,station:1});
    king.childrenIds.push(child.id);FB.registerRoyalBirth(s,child,king,null);
    FB.realmHeldCounties(s,rid).forEach(function (pid) {FB.setCountySupport(s,pid,40);});
    const ev=FB.eventById(json?'court_review_support':'kingship_magnate_royal_cousins');
    const option=ev.options.find(function (o) {return o.review&&o.review.args.action==='support';});
    const ctx=FB.eventContextFor(s,ev,{}),q=FB.eventReviews.quote(s,option,ctx);
    if (!q || !q.quote.allowed) throw new Error('Independent recognition unavailable '+JSON.stringify(q));
    const before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    for (let i=0;i<3;i++) {FB.eventReviews.quote(s,option,ctx);FB.eventReviews.details(s,q);}
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    function others(state) {return JSON.stringify(Object.keys(state.authority.governments[rid].recognition||{}).filter(function (id) {return id!==voice.id;}).map(function (id) {return state.authority.governments[rid].recognition[id];}));}
    const independent=others(s),cash=s.player.gold,ruler=s.realms[rid].succession.rulerMemberId,owners=JSON.stringify([s.owner,s.holder]);
    const f=JSON.parse(before),auto=JSON.parse(before),direct=R.applySupport(f,q.quote.review);
    const automated=FB.resolveEventOption(auto,ev,option,ctx,{automated:true});
    const supported=FB.resolveEventOption(s,ev,option,ctx,{reviewed:q});
    const parity=!!direct&&!!automated&&!!supported&&JSON.stringify(f.authority)===JSON.stringify(s.authority)&&JSON.stringify(auto.authority)===JSON.stringify(s.authority);
    const we=json?FB.eventById('court_review_withhold'):ev;
    const wo=we.options.find(function (o) {return o.review&&o.review.args.action==='withhold';});
    const wc=FB.eventContextFor(s,we,{}),wq=FB.eventReviews.quote(s,wo,wc);
    const refused=FB.resolveEventOption(s,we,wo,wc,{reviewed:wq});
    const onlyOwn=!!refused&&s.authority.governments[rid].recognition[voice.id].candidateId===null&&others(s)===independent;
    const detached=JSON.parse(JSON.stringify(s)),appointment=detached.authority.appointments.find(function (r) {return r.id===voice.appointmentId;});
    appointment.status='removed';const changed=JSON.stringify(detached);
    const denied=!FB.eventReviews.commit(detached,we,wo,wc,wq)&&changed===JSON.stringify(detached);
    return {pure:pure,parity:parity,onlyOwn:onlyOwn,denied:denied,purse:s.player.gold===cash,
      ruler:s.realms[rid].succession.rulerMemberId===ruler,territory:owners===JSON.stringify([s.owner,s.holder])};
  },json);
  expect(result).toEqual({pure:true,parity:true,onlyOwn:true,denied:true,purse:true,ruler:true,territory:true});
});

for (const json of [false,true]) test((json?'JSON':'native')+' blocked agenda remains an actual source decision and can retain current terms',async function ({page},info) {
  await royal(page,info,json,false);
  const result=await page.evaluate(function () {
    const s=FB.state,id=ROYAL.json?'review_royal_agenda':'peroz_agenda_476',choice=ROYAL.json?'proof_negotiate':'peroz_review_terms';
    s.player.gold=0;if (s.realms.player.treasury) s.realms.player.treasury.gold=0;
    const before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter(),calls=[{reader:'political_story',args:{storyId:id,choiceId:choice,status:'blocked_agenda'}}];
    const blocked=FB.eventStateReaders.test(s,calls,{});
    const d=royalDecision('agenda');
    const pure=before===JSON.stringify(s)&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter();
    const dormant=JSON.parse(before);dormant.authority.governments.player.formId='regnum';
    const dormantBefore=JSON.stringify(dormant);
    const retained=FB.eventStateReaders.test(dormant,calls,{})&&dormantBefore===JSON.stringify(dormant);
    const q=d.q,detached=JSON.parse(before);detached.stories[id].subjectId='missing_incumbent';
    const changed=JSON.stringify(detached),stale=!FB.eventReviews.commit(detached,d.option,d.ctx,q)&&changed===JSON.stringify(detached);
    const recorded=FB.resolveEventOption(s,d.ev,d.option,d.ctx,{reviewed:q});
    return {blocked:blocked,pure:pure,retained:retained,stale:stale,recorded:!!recorded,free:s.player.gold===0&&(!s.realms.player.treasury||s.realms.player.treasury.gold===0)};
  });
  expect(result).toEqual({blocked:true,pure:true,retained:true,stale:true,recorded:true,free:true});
});

test('ordinary JSON validation is atomic and preserves legacy declarations',async function ({page},info) {
  await selection(page,info,true);
  const result=await page.evaluate(function (mods) {
    const before=JSON.stringify([FB.state,FBDATA,localStorage,FB.mods.sig()]),rng=FB.getRngState()>>>0,uid=FB.getUidCounter(),out=[];
    function reject(input,edit) {
      const m=JSON.parse(JSON.stringify(input));edit(m);const bytes=JSON.stringify(m);
      const faults=FB.mods.validate(m);let refused=false;try {FB.mods.apply(m);} catch (error) {refused=true;}
      out.push(faults.length>0&&refused&&bytes===JSON.stringify(m)&&before===JSON.stringify([FB.state,FBDATA,localStorage,FB.mods.sig()])&&rng===(FB.getRngState()>>>0)&&uid===FB.getUidCounter());
    }
    const accepted=mods.every(function (m) {return FB.mods.validate(m).length===0;});
    reject(mods[0],function (m) {m.events[0].options[0].review.args.actor={kind:'realm',id:'player'};});
    reject(mods[0],function (m) {m.events[0].participantCards=[];});
    reject(mods[0],function (m) {m.events[0].participants[0].source='role';});
    reject(mods[0],function (m) {m.events[1].options[0].review.args.terms.levy=1.1;});
    reject(mods[0],function (m) {m.events[1].options[0].review.args.action='resolve';});
    reject(mods[1],function (m) {m.events[5].options[0].review.args.choiceId='proof_never_offered';});
    reject(mods[1],function (m) {m.events[6].options[0].review.args.storyId='missing_story';});
    reject(mods[1],function (m) {m.storyInstances.review_partition.type='designated_succession';});
    reject(mods[1],function (m) {m.storyInstances.review_royal_agenda.stages[0]=null;});
    reject(mods[1],function (m) {m.events[6].participantCards.pop();});
    reject(mods[1],function (m) {m.events[5].options[0].review.args.choiceId='proof_negotiate';});
    const legacy=FB.validateEventReviews({id:'legacy_event',options:[{label:'Leave',effects:{}}]}).length===0;
    return {accepted:accepted,rejections:out,legacy:legacy};
  },[river,courts]);
  expect(result).toEqual({accepted:true,rejections:Array(11).fill(true),legacy:true});
});

for (const json of [false,true]) test((json?'compact JSON':'desktop native')+' political confirmation cancellation retains the exact event and participant',async function ({page},info) {
  await page.setViewportSize(json?{width:390,height:700}:{width:1280,height:720});
  await selection(page,info,json);
  await page.evaluate(function () {
    const d=politicalDecision('nominate');Object.assign(FB.game.auto,{all:false,minor:false,major:false});
    FB.ui.runEvents([{id:d.ev.id,ctx:d.ctx}]);
  });
  const option=page.locator('#ev-options .evopt').first();await expect(option).toBeVisible();
  await page.evaluate(function () {
    window.politicalCard=document.querySelector('#eventmodal .event-participant-card');window.politicalOption=document.querySelector('#ev-options .evopt');
    window.politicalPerson=politicalCard.querySelector('[data-event-character]').dataset.eventCharacter;
    window.cancelSnapshot=JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);
  });
  for (const exit of ['cancel','escape','back']) {
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    await option.evaluate(function (button) {button.focus({preventScroll:true});button.click();});
    await expect(page.locator('#event-review-cancel')).toBeVisible();
    await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
    if (exit==='cancel') await page.locator('#event-review-cancel').click();
    else if (exit==='escape') await page.keyboard.press('Escape');else await page.locator('#event-nav-back').click();
    await expect(option).toBeVisible();
    expect(await page.evaluate(function () {return {
      card:politicalCard===document.querySelector('#eventmodal .event-participant-card'),
      control:politicalOption===document.querySelector('#ev-options .evopt'),focus:politicalOption===document.activeElement,
      pure:cancelSnapshot===JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()])};})).toEqual({card:true,control:true,focus:true,pure:true});
  }
  await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
  await option.click();await expect(page.locator('#event-review-confirm')).toBeVisible();
  await expect.poll(function () {return page.evaluate(function () {return !FB.ui.eventInputGuarded();});}).toBe(true);
  await page.locator('#event-review-confirm').click();
  await expect(page.locator('#outcome-continue')).toBeVisible();
  expect(await page.evaluate(function () {
    const person=document.querySelector('#eventmodal .decision-outcome-people [data-event-character="'+politicalPerson+'"]');
    return !!person&&politicalCard===person.closest('.event-participant-card');
  })).toBe(true);
});
