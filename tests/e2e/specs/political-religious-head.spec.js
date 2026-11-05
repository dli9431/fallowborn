'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const southern = require('../fixtures/political-religious-head/southern.json');
const estuary = require('../fixtures/political-religious-head/estuary.json');

dependsOnRuntime(__filename, ['data/technology.js','data/political_institutions.js',
  'data/cultures.js','data/systems.js','data/eras.js','js/systems.js','js/holywar.js',
  'js/main.js','js/station.js','js/treasury.js','js/modifiers.js','js/util.js',
  'js/model.js','js/world.js','js/starts.js','js/government_selection.js',
  'js/government_recognition.js','js/government_lineage.js','js/government_elective.js',
  'js/governments.js','js/authority.js','js/politics.js','js/institutions.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/justice.js','js/events.js']);

async function start(page, info, kind, vacancy) {
  await openGame(page, info);
  await prepareGameContent(page);
  const mod = JSON.parse(JSON.stringify(kind === 'native' ? southern : estuary));
  const world = kind === 'native' ? 'southern_office_world' : 'paired_office_world';
  if (vacancy) mod.bookmarks[world].religiousHeads.southern_office_demo = null;
  if (kind === 'native') {
    await prepareGameContent(page);
    await page.evaluate(function (mod) {
      ['religions','governmentForms','geographies','bookmarks'].forEach(function (key) {
        Object.assign(FBDATA[key],mod[key]);
      });
      FBDATA.startScenarios = FBDATA.startScenarios.concat(mod.startScenarios);
      FB.invalidateReligionData(); FB.governments.invalidate();
    },mod);
  } else {
    expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); },mod)).toEqual([]);
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles(vacancy ?
      {name:'vacant-offices.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))} :
      path.resolve(__dirname,'../fixtures/political-religious-head/estuary.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}), page.locator('#mod-apply').click()]);
    await prepareGameContent(page);
  }
  await beginBookmarkFromTitle(page,world,kind === 'native' ? 'southern_household_demo' : 'estuary_household_demo');
  await page.evaluate(function () {
    window.officeTest = {
      snapshot:function () {
        return JSON.stringify([FB.state,FB.getRngState() >>> 0,FB.getUidCounter(),localStorage]);
      },
      facts:function () {
        const s=FB.state;
        return JSON.stringify([s.owner,s.holder,s.player.gold,s.player.prestige,s.player.piety,
          s.player.holdings,s.settlementLordships,s.authority.appointments,s.authority.rights,
          s.authority.contracts,Object.keys(s.chars),FB.getRngState() >>> 0,FB.getUidCounter()]);
      },
      ruler:function (rid) { const t=FB.state.realms[rid].succession; return FB.state.chars[t.members[t.rulerMemberId].charId]; },
      head:function (faith) { const c=FB.religiousHeadSnapshot(FB.state,faith); return c && c.id || null; },
      assent:function (rid) {
        const s=FB.state,S=FB.governmentSelection,t=s.realms[rid].succession;
        return S.apply(s,S.quote(s,rid,{action:'assent',actor:{kind:'realm',id:rid},
          candidateId:t.rulerMemberId,terms:S.profile(s,rid).terms}));
      },
      withdraw:function (rid) {
        const s=FB.state,S=FB.governmentSelection,m=S.constituency(s,rid)[0];
        const q=S.quote(s,rid,{action:'withdraw',actor:{kind:'constituency',realmId:rid,id:m.id},memberId:m.id});
        if (!q.allowed || !S.apply(s,q)) throw new Error('Consent withdrawal refused: '+q.reasonId+' '+JSON.stringify({
          selection:S.state(s,rid),constituency:S.constituency(s,rid),incumbent:this.ruler(rid),
          assent:S.quote(s,rid,{action:'assent',actor:{kind:'realm',id:rid},candidateId:s.realms[rid].succession.rulerMemberId,terms:S.profile(s,rid).terms})}));
      },
      successor:function (rid, cid, cause, ai) {
        const s=FB.state,S=FB.governmentSelection,t=s.realms[rid].succession;
        const actor={kind:'realm',id:rid};
        if (!S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:cause || 'abdication'}))) throw new Error('Vacancy refused');
        const member=Object.keys(t.members).find(function (id) { return t.members[id].charId === cid; });
        if (ai) { delete S.state(s,rid).lastPeriod; return S.ai(s,rid); }
        S.constituency(s,rid).forEach(function (m) {
          const q=S.quote(s,rid,{action:'support',actor:{kind:'constituency',realmId:rid,id:m.id},
            memberId:m.id,candidateId:member,terms:S.profile(s,rid).terms});
          if (!q.allowed || !S.apply(s,q)) throw new Error('Support refused: '+q.reasonId);
        });
        return S.apply(s,S.quote(s,rid,{action:'resolve',actor:actor}));
      },
      roundTrip:function () {
        const before=JSON.parse(FB.save.serialize());
        const ledger=JSON.stringify([before.state.religiousHeads,before.state.religiousHeadVacancies,
          before.state.authority,before.state.chars]);
        FB.save.restore(before);
        const after=JSON.parse(FB.save.serialize());
        const result={ledger:ledger === JSON.stringify([after.state.religiousHeads,after.state.religiousHeadVacancies,
          after.state.authority,after.state.chars]),rng:(before.rng >>> 0) === (after.rng >>> 0),
          uid:before.uid === after.uid,signature:before.mods === after.mods && !FB.save.otherWorld(before)};
        if (!result.ledger) {
          const differences=[];
          function diff(a,b,p) {
            if (JSON.stringify(a) === JSON.stringify(b) || differences.length >= 12) return;
            if (!a || !b || typeof a !== 'object' || typeof b !== 'object') { differences.push([p,a,b]);return; }
            Object.keys(Object.assign({},a,b)).forEach(function (k) { diff(a[k],b[k],p+'.'+k); });
          }
          diff(JSON.parse(ledger),[after.state.religiousHeads,after.state.religiousHeadVacancies,after.state.authority,after.state.chars],'ledger');
          result.differences=differences;
        }
        return result;
      }
    };
  });
}

for (const kind of ['native','import']) {
  test(kind+' seeds only existing recognized incumbents and all office reads are pure', async function ({page},info) {
    await start(page,info,kind);
    const result=await page.evaluate(function () {
      const s=FB.state,O=officeTest,S=FB.governmentSelection,rid='southern_court_demo',fid='early_office_demo';
      const c=O.ruler(rid),before=O.snapshot(),head=s.religiousHeads.southern_office_demo;
      const valid=FB.religiousHeadOf(s,fid) === c && FB.religiousOfficeSnapshot(s,'southern_office_demo') === c;
      for (let i=0;i<3;i++) {
        FB.religiousHeadSnapshot(s,fid); FB.religiousHeadOf(s,fid); FB.religiousHeadVacancy(s,fid);
        FB.religiousOfficeHolderEligible(s,'southern_office_demo',c.id); FB.religionsHeadedBy(s,c.id);
        FB.political.offices(s,{kind:'character',id:c.id}); FB.officeRecognitionMandates(s,{kind:'character',id:c.id});
      }
      const pure=before === O.snapshot(),facts=O.snapshot();
      const refused=!FB.assignReligiousHead(s,fid,c.id) && !FB.succeedReligiousHead(s,fid,{holderId:c.id});
      return {recognized:S.recognized(s,rid),valid:valid,pure:pure,refused:refused,
        unchanged:facts === O.snapshot(),same:head === c.id,age:FB.religionOf(fid,s).head.minAge,
        seat:FB.religiousHeadSeat(s,fid),strategy:FB.religiousHeads.strategy('political_incumbent').recover || null,
        noPowers:!FB.religionOf(fid,s).head.claim && !FB.religionOf(fid,s).head.absolution && !FB.religionOf(fid,s).head.greatHolyWar,
        noBehavior:!FB.canClaimReligiousHead(s,fid,rid) && !FB.canRestoreReligiousHead(s,fid,rid) &&
          !FB.canSeekAbsolution(s) && !FB.canCallGreatHolyWar(s,fid,'england',rid,true),
        schema:FB.validateReligionData(s),technology:FB.validateTechnologyData(),impact:FBDATA.techImpactReviews.features.religious_head_political_incumbent.mode};
    });
    expect(result).toEqual({recognized:true,valid:true,pure:true,refused:true,unchanged:true,same:true,age:18,
      seat:'southern_seat_demo',strategy:null,noPowers:true,noBehavior:true,schema:[],technology:[],impact:'none'});
    for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
  });
}

test('independent imported woman incumbent suspends without hidden mandates or stale authority applications', async function ({page},info) {
  await start(page,info,'import');
  const result=await page.evaluate(function () {
    const O=officeTest,s=FB.state,S=FB.governmentSelection,rid='estuary_court_demo',c=O.ruler(rid);
    const actor={kind:'character',id:c.id},issuer={kind:'religious-office',id:'estuary_office_demo'};
    const subject={kind:'character',id:s.player.charId},scope={kind:'realm',id:rid};
    const proofSubject={kind:'character',id:O.ruler('southern_court_demo').id};
    const independent=O.head('early_office_demo'),binding=s.religiousHeads.estuary_office_demo;
    const born=c.born;c.born=s.date.year-20;
    const twenty=O.head('estuary_tradition_demo') === null;
    c.born=s.date.year-21;
    const twentyOne=O.head('estuary_tradition_demo') === c.id;c.born=born;
    const proof=FB.authorityRecognize(s,{source:'church_support',issuer:issuer,subject:proofSubject,scope:scope});
    const first=!!proof && proof.issuerGeneration === c.id && FB.political.legitimacy(s,proofSubject,scope).some(function (r) { return r.id === proof.id; });
    // A contested imperial claimant supplies an ordinary recognition transaction.
    const claim=FB.authorityAppoint(s,{officeId:'imperial_office',institutionId:rid,appointer:{kind:'realm',id:rid},holder:subject,scope:scope,contested:true});
    if (!claim) throw new Error('Claimant setup failed');
    const claimant=FB.officeClaimants(s).find(function (r) { return r.institutionId === rid && r.holder.id === subject.id; });
    const mandate=FB.officeRecognitionMandates(s,actor).find(function (m) { return m.issuer.id === issuer.id; });
    const quote=FB.officeClaimQuote(s,actor,claimant,mandate,'recognize');
    // Use a separate subject for the existing proof so the claimant quote is fresh.
    if (!quote.allowed) throw new Error('Recognition quote refused: '+quote.reason+' '+JSON.stringify({
      claimant:claimant,mandate:mandate,first:first,binding:s.religiousHeads.estuary_office_demo,
      selection:S.state(s,rid),constituency:S.constituency(s,rid),recognized:S.recognized(s,rid),incumbent:c}));
    O.withdraw(rid);
    const before=O.snapshot(),noHead=O.head('estuary_tradition_demo') === null;
    const noMandate=!FB.officeRecognitionMandates(s,actor).some(function (m) { return m.issuer.id === issuer.id; });
    const inactive=FB.political.legitimacy(s,proofSubject,scope).every(function (r) { return r.id !== proof.id; });
    const fresh=FB.officeClaimQuote(s,actor,claimant,mandate,'recognize');
    const rejected=!fresh.allowed && !FB.officeDeclareClaim(s,quote) && !FB.authorityRecognize(s,
      {source:'church_support',issuer:issuer,subject:{kind:'realm',id:rid},scope:scope});
    const pure=before === O.snapshot(),retained=s.religiousHeads.estuary_office_demo === binding;
    const other=O.head('early_office_demo') === independent;
    const recovery=O.assent(rid),recovered=O.head('estuary_tradition_demo') === c.id;
    const current=FB.officeClaimQuote(s,actor,claimant,mandate,'recognize');
    const applied=current.allowed && FB.officeDeclareClaim(s,current),after=O.snapshot();
    return {sex:c.sex,minimum:FB.religionOf('estuary_tradition_demo',s).head.minAge,
      noSexFilter:!FB.religionOf('estuary_tradition_demo',s).head.holderSex,first:first,
      twenty:twenty,twentyOne:twentyOne,
      noHead:noHead,noMandate:noMandate,inactive:inactive,rejected:rejected,pure:pure,retained:retained,other:other,
      recovery:recovery,recovered:recovered,same:s.religiousHeads.estuary_office_demo === binding,
      originalGeneration:s.authority.recognitions.find(function (r) { return r.id === proof.id; }).issuerGeneration === c.id,
      applied:applied,repeat:!FB.officeDeclareClaim(s,current) && after === O.snapshot()};
  });
  expect(result).toEqual({sex:'f',minimum:21,noSexFilter:true,first:true,twenty:true,twentyOne:true,noHead:true,noMandate:true,inactive:true,
    rejected:true,pure:true,retained:true,other:true,recovery:true,recovered:true,same:true,originalGeneration:true,applied:true,repeat:true});
  for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
});

test('missing pointers, explicit null and stale or ineligible holders never repair themselves', async function ({page},info) {
  await start(page,info,'import',true);
  const result=await page.evaluate(function () {
    const O=officeTest,s=FB.state,rid='southern_court_demo',fid='early_office_demo',id='southern_office_demo';
    const c=O.ruler(rid),other=O.ruler('estuary_court_demo');
    const explicit=s.religiousHeads[id] === null;
    O.assent(rid); FB.ensureReligiousHeads(s); FB.religiousHeadRecoveryTick(s);
    const nullKept=s.religiousHeads[id] === null && O.head(fid) === null;
    s.turn += 360;FB.religiousHeadRecoveryTick(s);
    const noRecovery=s.religiousHeads[id] === null;
    delete s.religiousHeads[id];
    const absentBefore=O.snapshot();
    FB.religiousHeadOf(s,fid); FB.religiousHeadSnapshot(s,fid); FB.religiousHeadVacancy(s,fid);
    const absentPure=absentBefore === O.snapshot();
    FB.ensureReligiousHeads(s);
    const absent=!Object.prototype.hasOwnProperty.call(s.religiousHeads,id);
    s.religiousHeads[id]=c.id;
    const row=s.authority.governments[rid],form=row.formId,faith=c.religion,realmFaith=s.realms[rid].religion;
    const failures=[];
    function denied() { const before=O.snapshot(); failures.push(!FB.religiousHeadOf(s,fid) && !FB.religiousOfficeSnapshot(s,id) && before === O.snapshot()); }
    c.sex='f'; denied(); c.sex='m';
    const born=c.born;c.born=s.date.year-17;denied();c.born=born;
    c.religion='catholic';denied();c.religion=faith;
    s.realms[rid].religion='catholic';denied();s.realms[rid].religion=realmFaith;
    row.formId='territorial';FB.governments.invalidate();denied();row.formId=form;FB.governments.invalidate();
    s.religiousHeads[id]=other.id;denied();
    // A remote follower who holds the seat or an inherited title is not this incumbent.
    other.religion=fid;s.holder.southern_seat_demo='estuary_court_demo';denied();
    s.religiousHeads[id]=c.id;delete s.religiousHeadVacancies[id];
    O.withdraw(rid);const suspended=JSON.stringify([s.religiousHeads,s.religiousHeadVacancies]);
    FB.ensureReligiousHeads(s);
    return {explicit:explicit,nullKept:nullKept,noRecovery:noRecovery,absentPure:absentPure,absent:absent,failures:failures,
      suspended:suspended === JSON.stringify([s.religiousHeads,s.religiousHeadVacancies])};
  });
  expect(result).toEqual({explicit:true,nullKept:true,noRecovery:true,absentPure:true,absent:true,failures:[true,true,true,true,true,true,true],suspended:true});
  for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
});

for (const ai of [false,true]) {
  test((ai ? 'AI' : 'reviewed')+' political succession alone binds the existing successor after death', async function ({page},info) {
    await start(page,info,'native');
    const result=await page.evaluate(function (ai) {
      const O=officeTest,s=FB.state,S=FB.governmentSelection,rid='southern_court_demo',id='southern_office_demo';
      const old=O.ruler(rid),t=s.realms[rid].succession;
      const m=Object.values(t.members).find(function (m) { return m.localId === 'relative'; });
      const c=s.chars[m.charId],facts=O.facts();
      // Political nomination/designation or a saved future title cannot assign the office.
      const before=s.religiousHeads[id],designation=S.quote(s,rid,{action:'designate',actor:{kind:'realm',id:rid},candidateId:m.id});
      const designated=designation.allowed && S.apply(s,designation),uninstalled=s.religiousHeads[id] === before;
      old.dead=true;FB.religiousHeadCharacterDied(s,old.id);
      const vacant=s.religiousHeads[id] === null && O.head('early_office_demo') === null;
      const counters=[Object.keys(s.chars).join(','),FB.getUidCounter(),FB.getRngState()];
      const applied=O.successor(rid,c.id,'death',ai);
      const head=O.head('early_office_demo'),after=O.snapshot();
      const duplicate=S.apply(s,S.quote(s,rid,{action:'resolve',actor:{kind:'realm',id:rid}}));
      return {designated:designated,uninstalled:uninstalled,vacant:vacant,applied:applied,same:head === c.id,
        recognized:S.recognized(s,rid),generation:t.rulerGeneration,duplicate:duplicate,pure:after === O.snapshot(),
        noNewPerson:counters[0] === Object.keys(s.chars).join(',') && counters[1] === FB.getUidCounter(),
        noAllowance:s.player.gold === JSON.parse(facts)[2],rng:counters[2] === FB.getRngState()};
    },ai);
    expect(result).toEqual({designated:true,uninstalled:true,vacant:true,applied:true,same:true,recognized:true,
      generation:2,duplicate:false,pure:true,noNewPerson:true,noAllowance:true,rng:true});
    for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
  });
}

test('a saved death vacancy resumes pending support without an election or religious rebinding', async function ({page},info) {
  await start(page,info,'native');
  const result=await page.evaluate(function () {
    const O=officeTest,s=FB.state,S=FB.governmentSelection,rid='southern_court_demo',t=s.realms[rid].succession;
    const old=O.ruler(rid),current=t.members[t.rulerMemberId];
    const next=Object.values(t.members).find(function (m) { return m.localId === 'relative'; });
    old.dead=true;old.died=s.date.year;current.alive=false;current.died=s.date.year;
    FB.religiousHeadCharacterDied(s,old.id);
    const actor={kind:'realm',id:rid};
    if (!S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'death'}))) throw new Error('Death vacancy refused');
    const interest=S.constituency(s,rid)[0];
    if (!S.apply(s,S.quote(s,rid,{action:'support',actor:{kind:'constituency',realmId:rid,id:interest.id},
      memberId:interest.id,candidateId:next.id,terms:S.profile(s,rid).terms}))) throw new Error('Support refused');
    const treeBefore=JSON.parse(FB.save.serialize()).state.realms[rid].succession;
    const person=next.charId,ledger=JSON.stringify(s.religiousHeads);
    const rounds=[O.roundTrip(),O.roundTrip()],live=FB.state;
    const treeAfter=JSON.parse(FB.save.serialize()).state.realms[rid].succession;
    const restored=live.realms[rid].succession;
    const pending=S.state(live,rid).vacancy.status === 'selecting' && S.winner(live,rid) === next.id &&
      restored.rulerMemberId === current.id && restored.rulerGeneration === 1 &&
      restored.members[current.id].charId === old.id && live.chars[old.id].dead === true;
    const unchanged=JSON.stringify(live.religiousHeads) === ledger && O.head('early_office_demo') === null;
    const before=[Object.keys(live.chars).length,FB.getUidCounter(),FB.getRngState() >>> 0,live.player.gold];
    const resolved=S.apply(live,S.quote(live,rid,{action:'resolve',actor:actor}));
    return {treeBefore:treeBefore,treeAfter:treeAfter,rounds:rounds,pending:pending,unchanged:unchanged,resolved:resolved,
      existing:O.head('early_office_demo') === person,
      counters:JSON.stringify(before) === JSON.stringify([Object.keys(live.chars).length,FB.getUidCounter(),FB.getRngState() >>> 0,live.player.gold])};
  });
  expect(result.treeAfter).toEqual(result.treeBefore);
  delete result.treeBefore;delete result.treeAfter;
  const round={ledger:true,rng:true,uid:true,signature:true};
  expect(result).toEqual({rounds:[round,round],pending:true,unchanged:true,resolved:true,existing:true,counters:true});
});

test('canonical starting adoption and electoral release preserve polity and suspended binding', async function ({page},info) {
  await start(page,info,'import');
  const result=await page.evaluate(function () {
    const O=officeTest,s=FB.state,S=FB.governmentSelection,rid='estuary_court_demo',c=O.ruler(rid),id='estuary_office_demo';
    const other=s.religiousHeads.southern_office_demo,head=s.religiousHeads[id];
    // Stage the already existing ruler as protagonist; this exercises the same
    // adoption owner that a declared ruler start calls after person selection.
    s.player.charId=c.id;s.player.provinceId=s.realms[rid].capital;
    const tier=FB.realmRank.tier({rank:s.realms[rid].rank,formId:'estuary_election_demo'},s);
    FB.setPlayerTier(s,tier,{attachLiege:false});
    const scenario={id:'office_adoption_demo',rulerRealmId:rid,governmentForm:'estuary_election_demo',tier:tier,gold:63,onboarding:'standard'};
    const adopted=FB.adoptStartingRealm(s,scenario,{deferSetup:true});
    const recognized=S.recognized(s,'player'),same=O.head('estuary_tradition_demo') === c.id && s.religiousHeads[id] === head;
    O.withdraw('player');const suspended=O.head('estuary_tradition_demo') === null && s.religiousHeads[id] === head;
    const recovered=O.assent('player') && O.head('estuary_tradition_demo') === c.id;
    // Starting metadata has its own scenario validation; finish that synthetic
    // stage before testing the ordinary release boundary and detached restore.
    delete s.start.rulerRealmId;delete s.start.scenarioId;delete s.start.onboarding;
    const released=S.releasePlayerCourt(s,c,true);
    FB.notePlayerStatus(s);
    return {adopted:adopted,recognized:recognized,same:same,suspended:suspended,recovered:recovered,released:released,
      origin:S.state(s,rid).originRealmId,other:other === s.religiousHeads.southern_office_demo,
      effective:O.head('estuary_tradition_demo') === S.officeIncumbent(s,rid).id,
      binding:s.religiousHeads[id] === O.ruler(rid).id};
  });
  expect(result).toEqual({adopted:true,recognized:true,same:true,suspended:true,recovered:true,released:'estuary_court_demo',
    origin:'estuary_court_demo',other:true,effective:true,binding:true});
  for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
});

test('a nominated player gains the office only on recognized accession and keeps the same polity on release', async function ({page},info) {
  await start(page,info,'native',true);
  const result=await page.evaluate(function () {
    const O=officeTest,s=FB.state,S=FB.governmentSelection,rid='southern_court_demo',c=s.chars[s.player.charId];
    const m=S.constituency(s,rid)[0],before=O.snapshot();
    const nomination=S.quote(s,rid,{action:'nominate',actor:{kind:'constituency',realmId:rid,id:m.id},
      memberId:m.id,characterId:c.id});
    const pure=before === O.snapshot(),admitted=S.apply(s,nomination);
    const unbound=s.religiousHeads.southern_office_demo === null;
    const counts=[Object.keys(s.chars).length,FB.getUidCounter(),s.player.gold];
    const applied=O.successor(rid,c.id,'abdication',false);
    const adopted=!!s.realms.player && !s.realms[rid].alive && S.officeRealmId(s,rid) === 'player';
    const recognized=S.recognized(s,'player'),same=O.head('early_office_demo') === c.id;
    const noNew=counts[0] === Object.keys(s.chars).length && counts[1] === FB.getUidCounter();
    const noAllowance=counts[2] === s.player.gold;
    const round=O.roundTrip(),live=FB.state;
    O.withdraw('player');
    const pointer=live.religiousHeads.southern_office_demo;
    const suspended=O.head('early_office_demo') === null;
    const released=S.releasePlayerCourt(live,live.chars[live.player.charId],true);
    FB.notePlayerStatus(live);
    return {pure:pure,admitted:admitted,unbound:unbound,applied:applied,adopted:adopted,recognized:recognized,same:same,
      noNew:noNew,noAllowance:noAllowance,round:round,suspended:suspended,released:released,
      recovered:S.recognized(live,rid) && O.head('early_office_demo') === O.ruler(rid).id,
      replaced:live.religiousHeads.southern_office_demo !== pointer};
  });
  expect(result).toEqual({pure:true,admitted:true,unbound:true,applied:true,adopted:true,recognized:true,same:true,
    noNew:true,noAllowance:true,round:{ledger:true,rng:true,uid:true,signature:true},suspended:true,
    released:'southern_court_demo',recovered:true,replaced:true});
  for (let i=0;i<2;i++) expect(await page.evaluate(function () { return officeTest.roundTrip(); })).toEqual({ledger:true,rng:true,uid:true,signature:true});
});

test('detached JSON validation rejects unsupported sources, references and eligibility without publication', async function ({page},info) {
  await start(page,info,'import');
  const result=await page.evaluate(function (fixture) {
    const s=FB.state,data=FBDATA,world=FB.world,active=FB.activeBookmark;
    function all() { return JSON.stringify([s,FBDATA,FB.stories.list(),FB.englishMessages(),FB.mods.sig(),localStorage,
      FB.getRngState() >>> 0,FB.getUidCounter(),FB.world.provs]); }
    const baseline=all(),cases=[];
    function check(edit) { const mod=JSON.parse(JSON.stringify(fixture));edit(mod);cases.push(FB.mods.validate(mod).length > 0 &&
      baseline === all() && FB.state === s && FBDATA === data && FB.world === world && FB.activeBookmark === active); }
    function head(m) { return m.religions.estuary_tradition_demo.properties.head; }
    check(function (m) { head(m).succession='unreviewed'; });
    check(function (m) { head(m).holderKind='realm'; });
    check(function (m) { head(m).realm='missing_polity'; });
    check(function (m) { head(m).seat={site:'missing_seat'}; });
    check(function (m) { head(m).minAge='21'; });
    check(function (m) { head(m).holderSex='m'; });
    check(function (m) { head(m).minAge=55; });
    check(function (m) { head(m).claim={piety:'religiousHeadClaimPiety'}; });
    check(function (m) { head(m).absolution={gold:'religiousHeadAbsolutionGold'}; });
    check(function (m) { head(m).greatHolyWar={name:'Unsupported call'}; });
    check(function (m) { head(m).character=s.player.charId; });
    check(function (m) { head(m).holderRole='priest'; });
    check(function (m) { head(m).recognitionSource='authority.somePath'; });
    check(function (m) { head(m).seat={site:'river_hall_demo',province:'estuary_seat_demo'}; });
    check(function (m) { m.bookmarks.paired_office_world.religiousHeads={estuary_office_demo:null,estuary_tradition_demo:'estuary_court_demo'}; });
    check(function (m) { m.governmentForms.estuary_election_demo.succession='kin_acclamation'; });
    check(function (m) { m.bookmarks.paired_office_world.religiousHeads.estuary_office_demo='southern_court_demo'; });
    check(function (m) { m.bookmarks.paired_office_world.realms[0].religion='catholic'; });
    return {cases:cases,valid:FB.mods.validate(fixture),pure:baseline === all()};
  },estuary);
  expect(result).toEqual({cases:Array(18).fill(true),valid:[],pure:true});
});

test('matching signatures and repeated restore retain null, missing and suspended political pointers', async function ({page},info) {
  await start(page,info,'import');
  const result=await page.evaluate(function () {
    const s=FB.state,O=officeTest,id='estuary_office_demo',saved=JSON.parse(FB.save.serialize());
    O.withdraw('estuary_court_demo');
    const suspended=O.roundTrip(),inactive=O.head('estuary_tradition_demo') === null;
    let current=FB.state;current.religiousHeads[id]=null;
    const vacant=O.roundTrip(),nullKept=FB.state.religiousHeads[id] === null;
    current=FB.state;delete current.religiousHeads[id];
    const absent=O.roundTrip(),missing=!Object.prototype.hasOwnProperty.call(FB.state.religiousHeads,id);
    const bad=JSON.parse(JSON.stringify(saved));bad.state.religiousHeads[id]='missing_person';
    const before=O.snapshot();let rejected=false;
    try { FB.save.v4.validatePlatform(bad.state); } catch (_) { rejected=true; }
    const pure=before === O.snapshot();
    return {suspended:suspended,inactive:inactive,vacant:vacant,nullKept:nullKept,absent:absent,missing:missing,
      rejected:rejected,pure:pure,match:!FB.save.otherWorld(saved)};
  });
  const round={ledger:true,rng:true,uid:true,signature:true};
  expect(result).toEqual({suspended:round,inactive:true,vacant:round,nullKept:true,absent:round,missing:true,
    rejected:true,pure:true,match:true});
  const saved=await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
  const changed=JSON.parse(JSON.stringify(estuary));
  changed.religions.estuary_tradition_demo.properties.head.minAge=22;
  await page.evaluate(function () { FB.ui.closeModal();FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles({name:'estuary.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(changed))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  expect(await page.evaluate(function (saved) {
    const before=JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage,FB.mods.sig()]);
    const mismatch=FB.save.otherWorld(saved),loaded=FB.game.loadData(saved);
    return {mismatch:mismatch,loaded:loaded,pure:before === JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter(),localStorage,FB.mods.sig()])};
  },saved)).toEqual({mismatch:true,loaded:false,pure:true});
});
