'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/religious-river-court.json');

dependsOnRuntime(__filename,[
  'index.html','data/religious_cases.js','data/episcopal_claims.js','data/actions.js','data/technology.js','data/intrigue.js','data/events_intrigue.js',
  'data/bookmark_1204.js','data/ecclesiastical_profiles.js','js/religious_cases.js','js/episcopal_claims.js',
  'js/justice.js','js/lordships.js','js/authority.js','js/treasury.js','js/actions.js','js/events.js','js/papacy.js',
  'js/government_ecclesiastical.js','js/model.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/ui_religious_institutions.js','js/ui_modals.js','js/ui_misc.js'
]);

async function start(page,info) {
  await startHistoricalGame(page,info,{bookmark:'1204',code:'COURT-1204-baron-roma-m-Court'});
  await bind(page);
}
async function bind(page) {
  await page.evaluate(function () {
    window.courtMatter = function (s,options) {
      options = options || {};
      s.provChars=s.provChars || {};
      const pid=options.pid || 'roma', profile=options.profile || 'roman_clerical_violence';
      const court=FB.episcopalClaims.courtContext(s,FBDATA.religiousCases[profile]),bishop=s.chars[court.bishopId];
      let target=s.chars[s.player.charId];
      if (!options.player) {
        target=FB.makeCharacter(s,{name:'Existing defendant',sex:'m',culture:'italian',religion:options.faith || 'catholic',born:s.date.year-30,station:options.noble?3:0,traitsN:0});
        target.homeProvinceId=pid;
        if (!s.provChars[pid]) s.provChars[pid]=[];
        s.provChars[pid].push(target.id);
        target.wealth=options.wealth === undefined ? 100 : options.wealth;
        target.piety=100;target.prestige=100;
      } else {s.player.gold=200;s.player.piety=100;s.player.prestige=100;s.player.provinceId=pid;}
      const victim=FB.makeCharacter(s,{name:'Recorded cleric',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-40,station:1,traitsN:0});
      victim.homeProvinceId=pid;victim.role='priest';victim.career={profession:'priest'};victim.wealth=17;
      if (!s.provChars[pid]) s.provChars[pid]=[];
      s.provChars[pid].push(victim.id);
      // Trusted justice evidence stages an actual simulation occurrence. The
      // prosecution owner must select this record, never generate its own crime.
      const source=FB.justiceRecordOffense(s,court.courtId,target.id,options.killing?'assassination':'abduction',options.evidence || 'material',true,victim.id,
        'recorded-clerical-attack:' + target.id);
      if (!source) throw new Error('Could not record canonical source');
      let slot=null;
      if (options.fief) {
        FB.rememberSettlementSites(s,pid);
        slot=FB.directSettlements(s,{kind:'character',id:target.id}).filter(function (v) {return v.provinceId===pid&&v.settlement>0;}).map(function (v) {return v.settlement;})[0] || 1;
        const holder=FB.settlementHolder(s,pid,slot);
        if (!holder || holder.kind!=='character' || holder.id!==target.id)
          if (!FB.assignSettlementLordship(s,pid,slot,target.id)) throw new Error('Could not stage delegated fief');
      }
      return {profile:profile,pid:pid,oid:source.id,target:target.id,bishop:bishop.id,court:court.courtId,realm:court.realmId,victim:victim.id,slot:slot};
    };
    window.courtDecide=function(s,m,action,actor,slot) {
      const q=FB.religiousCases.quote(s,m.profile,m.oid,actor || m.bishop,action,slot);
      if (!q || !q.allowed || !FB.religiousCases.apply(s,q)) throw new Error(action + ': ' + JSON.stringify(q));
      return q;
    };
  });
}

test('only actual local Christian clerical-violence evidence selects peasants and nobles; reviews are pure',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases,poor=courtMatter(s,{wealth:10}),rich=courtMatter(s,{wealth:400,noble:true,fief:true});
    const outsider=courtMatter(s,{faith:'jewish'}),unrecorded=FB.makeCharacter(s,{name:'Innocent neighbour',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-25,station:0,traitsN:0});
    unrecorded.homeProvinceId='roma';
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const list=R.list(s,poor.bishop),q=R.quote(s,rich.profile,rich.oid,rich.bishop,'charge',rich.slot);
    R.quote(s,poor.profile,poor.oid,poor.bishop,'charge');
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    courtDecide(s,poor,'charge');courtDecide(s,rich,'charge',rich.bishop,rich.slot);
    const low=R.quote(s,poor.profile,poor.oid,poor.bishop,'settlement'),high=R.quote(s,rich.profile,rich.oid,rich.bishop,'settlement');
    const a=FB.justiceArrestProjection(s,poor.bishop,poor.target,poor.oid,'religious'),b=FB.justiceArrestProjection(s,rich.bishop,rich.target,rich.oid,'religious');
    return {pure:pure,listed:list.some(function(v){return v.defendantId===poor.target;})&&list.some(function(v){return v.defendantId===rich.target;}),
      identities:!list.some(function(v){return v.defendantId===outsider.target||v.defendantId===unrecorded.id;}),
      exact:q.asset.grant.holderId===rich.target,stakes:high.terms.amount>low.terms.amount,
      resistance:FB.religiousCases.arrestAdjustment(s,rich && s.justice.offenses.find(function(o){return o.id===rich.oid;}),rich.bishop)<FB.religiousCases.arrestAdjustment(s,s.justice.offenses.find(function(o){return o.id===poor.oid;}),poor.bishop),tech:FBDATA.techImpactReviews.features.named_ecclesiastical_discipline.mode,valid:R.catalogFaults(FBDATA)};
  });
  expect(result).toEqual({pure:true,listed:true,identities:true,exact:true,stakes:true,resistance:true,tech:'none',valid:[]});
});

test('dismissal and successful defense close one matter without a penalty or repeated prosecution',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases;
    function balances(m) {return JSON.stringify([s.chars[m.target].wealth,s.chars[m.target].piety,s.chars[m.target].prestige,s.player.gold,s.settlementLordships,FB.countySupportBase(s,m.pid)]);}
    const dismissed=courtMatter(s,{fief:true});courtDecide(s,dismissed,'charge',dismissed.bishop,dismissed.slot);
    courtDecide(s,dismissed,'submit',dismissed.target);
    const before=balances(dismissed);courtDecide(s,dismissed,'refuse',dismissed.target);courtDecide(s,dismissed,'dismiss');
    const noPenalty=before===balances(dismissed)&&!FB.justiceCustodyOf(s,dismissed.target);
    const defended=courtMatter(s,{evidence:'testimony'});courtDecide(s,defended,'charge');
    const gold=balances(defended);let success=false;
    // Independent cloned proceedings use the seeded challenge owner. Each
    // defendant gets one attempt; no failed live challenge is retried.
    for(let seed=1;seed<100&&!success;seed++) {
      const t=JSON.parse(JSON.stringify(s));FB.setRngState(seed);
      courtDecide(t,defended,'challenge',defended.target);
      if(R.snapshot(t,defended.profile,defended.oid).record.status==='vindicated') {
        success=!FB.justiceCustodyOf(t,defended.target)&&t.chars[defended.target].wealth===s.chars[defended.target].wealth&&t.chars[defended.target].piety===s.chars[defended.target].piety;
      }
    }
    const noReplay=!R.quote(s,dismissed.profile,dismissed.oid,dismissed.bishop,'charge').allowed;
    return {noPenalty:noPenalty,success:success,noReplay:noReplay,unrelated:gold===balances(defended)};
  });
  expect(result).toEqual({noPenalty:true,success:true,noReplay:true,unrelated:true});
});

test('settlements conserve real household and barony funds to the see and victim, once only',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases;
    const m=courtMatter(s,{player:true,fief:true});courtDecide(s,m,'charge',m.bishop,m.slot);
    const before=[s.player.gold,s.realms.papacy_1204.treasury.gold,s.chars[m.victim].wealth,FB.episcopalClaims.privateAccount(s,m.bishop).gold];
    courtDecide(s,m,'settlement');const review=R.quote(s,m.profile,m.oid,m.target,'accept');courtDecide(s,m,'accept',m.target);
    const after=[s.player.gold,s.realms.papacy_1204.treasury.gold,s.chars[m.victim].wealth,FB.episcopalClaims.privateAccount(s,m.bishop).gold];
    const state=JSON.stringify(s),rng=FB.getRngState(),repeated=!R.apply(s,review)&&state===JSON.stringify(s)&&rng===FB.getRngState();
    const n=courtMatter(s,{fief:true,noble:true});
    FB.settleBaronyAccounts(s,Math.floor(s.turn/90));s.settlementLordships.accounts[n.target].gold=80;
    const otherWealth=s.chars[n.target].wealth;courtDecide(s,n,'charge',n.bishop,n.slot);courtDecide(s,n,'settlement',n.target);
    const accepted=R.respond(s,n.profile,n.oid);
    const row=R.snapshot(s,n.profile,n.oid).record;
    return {debits:after[0]-before[0],see:after[1]-before[1],victim:after[2]-before[2],bishop:after[3]-before[3],
      conserved:before.slice(0,3).reduce(function(a,b){return a+b;},0)===after.slice(0,3).reduce(function(a,b){return a+b;},0),
      repeated:repeated,accepted:accepted,barony:s.settlementLordships.accounts[n.target].gold,wealth:s.chars[n.target].wealth===otherWealth,
      receipts:s.authority.receipts.filter(function(v){return v.obligationId.indexOf(row.id+':')===0;}).length};
  });
  expect(result).toEqual({debits:-32,see:2,victim:30,bishop:0,conserved:true,repeated:true,accepted:true,barony:66,wealth:true,receipts:2});
});

test('penance and prison use actual custody and canonical judgments; player hearing applies the same sentence',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases,a=courtMatter(s,{});courtDecide(s,a,'charge');
    const noCustody=!R.quote(s,a.profile,a.oid,a.bishop,'imprison').allowed;
    courtDecide(s,a,'submit',a.target);courtDecide(s,a,'penance');
    const penance=s.chars[a.target].piety===60&&s.chars[a.target].prestige===80&&!FB.justiceCustodyOf(s,a.target)&&R.snapshot(s,a.profile,a.oid).record.status==='penance';
    const b=courtMatter(s,{});courtDecide(s,b,'charge');courtDecide(s,b,'submit',b.target);courtDecide(s,b,'imprison');
    const custody=FB.justiceCustodyOf(s,b.target),prison=!!custody&&custody.sentenced&&custody.endTurn===s.turn+360;
    const p=courtMatter(s,{player:true});courtDecide(s,p,'charge');courtDecide(s,p,'arrest');
    const arrest=s.justice.pending,arrestEvent=FB.eventById('justice_arrest');
    const submitted=FB.resolveEventOption(s,arrestEvent,arrestEvent.options.find(function(o){return o.effects.custom==='justice_submit';}),{justiceId:arrest.id,studentId:p.bishop});
    const pending=s.justice.pending,queued=!!pending&&pending.kind==='sentence'&&pending.courtKind==='religious';
    const ev=FB.eventById('justice_hearing'),applied=FB.resolveEventOption(s,ev,ev.options.find(function(o){return o.effects.custom==='justice_submit';}),{justiceId:pending.id,studentId:p.bishop});
    return {noCustody:noCustody,penance:penance,prison:prison,submitted:!!submitted,queued:queued,applied:!!applied,player:R.snapshot(s,p.profile,p.oid).record.status,piety:s.player.piety};
  });
  expect(result).toEqual({noCustody:true,penance:true,prison:true,submitted:true,queued:true,applied:true,player:'penance',piety:60});
});

test('secular referral transfers only the named delegated fief and refuses broad property forfeiture',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases,m=courtMatter(s,{killing:true,fief:true,noble:true});
    const p=s.chars[m.target];p.wealth=900;
    // A second real grant and unrelated household property must survive.
    FB.assignSettlementLordship(s,'roma',2,m.target);
    const other=JSON.stringify(s.settlementLordships.counties.roma.lordships[2]),holdings=JSON.stringify(s.player.holdings),owners=JSON.stringify([s.owner,s.holder]);
    courtDecide(s,m,'charge',m.bishop,m.slot);
    const trial=JSON.parse(JSON.stringify(s));courtDecide(trial,m,'submit',m.target);
    const trialBefore=JSON.stringify(trial),trialRng=FB.getRngState();
    const penanceLimit=!FB.justicePunishmentProjection(trial,m.bishop,m.target,'penance',m.oid,'religious').ready&&
      !FB.justiceApplyPunishment(trial,m.bishop,m.target,'penance',m.oid,null,'religious').ok&&trialBefore===JSON.stringify(trial)&&trialRng===FB.getRngState();
    const aiReferral=R.bishopDecision(trial,m.profile,m.oid)&&R.snapshot(trial,m.profile,m.oid).record.status==='referred';
    courtDecide(s,m,'refer');courtDecide(s,m,'accept_referral',m.court);
    const absent=!R.quote(s,m.profile,m.oid,m.court,'confiscate').allowed;
    courtDecide(s,m,'submit',m.target);
    const wrongCourt=!FB.justicePunishmentProjection(s,m.court,m.target,'imprisonment',m.oid,'religious').ready;
    const broad=!FB.justicePunishmentProjection(s,m.court,m.target,'forfeiture',m.oid,'secular').ready;
    const reviewed=R.quote(s,m.profile,m.oid,m.court,'confiscate'),grant=s.settlementLordships.counties.roma.lordships[m.slot];
    grant.grantedTurn++;
    const staleBefore=JSON.stringify(s),stale=!R.apply(s,reviewed)&&!FB.justiceConfiscateSettlement(s,m.court,m.target,m.oid,reviewed.stamp.record.asset)&&staleBefore===JSON.stringify(s);
    grant.grantedTurn--;
    courtDecide(s,m,'confiscate',m.court);
    const holder=FB.settlementHolder(s,'roma',m.slot);
    return {penanceLimit:penanceLimit,aiReferral:aiReferral,wrongCourt:wrongCourt,absent:absent,broad:broad,stale:stale,recipient:holder.kind==='realm'&&holder.id==='papacy_1204',
      exact:other===JSON.stringify(s.settlementLordships.counties.roma.lordships[2])&&holdings===JSON.stringify(s.player.holdings)&&owners===JSON.stringify([s.owner,s.holder]),
      wealth:p.wealth,status:R.snapshot(s,m.profile,m.oid).record.status,released:!FB.justiceCustodyOf(s,m.target)};
  });
  expect(result).toEqual({penanceLimit:true,aiReferral:true,wrongCourt:true,absent:true,broad:true,stale:true,recipient:true,exact:true,wealth:900,status:'confiscated',released:true});
});

test('stale reviews reject atomically for death, vacancy, departure, changed funds and jurisdiction',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const original=FB.state,R=FB.religiousCases,m=courtMatter(original,{fief:true});courtDecide(original,m,'charge',m.bishop,m.slot);
    const mutations=[function(s){s.chars[m.target].dead=true;},function(s){s.chars[m.bishop].dead=true;},
      function(s){s.papacy.obediences[s.papacy.romanObedience].claimantId=null;},
      function(s){s.chars[m.target].homeProvinceId='spoleto';},function(s){s.owner.roma='france_1204';},
      function(s){s.chars[m.target].wealth=0;},function(s){s.realms.papacy_1204.ruler.generation++;s.realms.papacy_1204.succession.rulerGeneration++;}];
    const rejected=mutations.map(function(mutate) {
      const s=JSON.parse(JSON.stringify(original)),q=R.quote(s,m.profile,m.oid,m.bishop,'settlement');mutate(s);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !R.apply(s,q)&&before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
    const t=JSON.parse(JSON.stringify(original));t.owner.roma='france_1204';
    const property=JSON.stringify(t.settlementLordships),gold=t.chars[m.target].wealth;
    courtDecide(t,m,'close_stale',m.target);
    return {rejected:rejected,closed:R.snapshot(t,m.profile,m.oid).record.status==='interrupted',
      noPenalty:property===JSON.stringify(t.settlementLordships)&&gold===t.chars[m.target].wealth};
  });
  expect(result).toEqual({rejected:Array(7).fill(true),closed:true,noPenalty:true});
});

test('shared adapters preserve ordinary rent and justice behavior and never erase a negative private balance',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,R=FB.religiousCases,m=courtMatter(s,{player:true,fief:true});
    const due=C.dues(s,m.pid,m.slot,100,20),q=C.quote(s,'roman_temporal_rent',m.slot,m.target,'demand');
    const rent=q.allowed&&C.apply(s,q)&&C.dues(s,m.pid,m.slot,100,20)===due;
    // A source without contemporaneous clergy facts never becomes a religious
    // accusation. Its ordinary fine and imprisonment remain available.
    const n=courtMatter(s,{}),o=s.justice.offenses.find(function(v){return v.id===n.oid;});delete o.clericalVictim;
    const absent=!R.list(s,n.bishop).some(function(v){return v.offenseId===n.oid;});
    const submitted=FB.justiceSubmitToCourt(s,n.bishop,n.target,n.oid,'secular');
    const fine=FB.justicePunishmentProjection(s,n.bishop,n.target,'fine',n.oid,'secular');
    const prison=FB.justicePunishmentProjection(s,n.bishop,n.target,'imprisonment',n.oid,'secular');
    s.chars[n.target].wealth=-7;
    const zero=C.payReceipts(s,n.target,m.pid,[{id:'zero-private-check',amount:0,recipient:{kind:'realm',id:'papacy_1204'}}]);
    const negative=s.chars[n.target].wealth===-7;
    return {rent:rent,absent:absent,submitted:submitted.ok,fine:fine.ready,prison:prison.ready,zero:zero,negative:negative};
  });
  expect(result).toEqual({rent:true,absent:true,submitted:true,fine:true,prison:true,zero:true,negative:true});
});

test('seasonal NPC bishops open actual matters and use the configured religious judgment and player response',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,R=FB.religiousCases,m=courtMatter(s,{player:true}),people=Object.keys(s.chars).length;
    FB.justiceSeason(s);
    const opened=R.snapshot(s,m.profile,m.oid).record;
    if (!opened) throw new Error('Seasonal bishop did not open the recorded matter');
    const exact=opened.accusation.accusedId===m.target&&Object.keys(s.chars).length===people;
    courtDecide(s,m,'submit',m.target);
    s.justice.lastSeason=-1;FB.justiceSeason(s);
    const pending=s.justice.pending;
    if (!pending) throw new Error('Seasonal bishop did not queue the configured hearing');
    const ev=FB.eventById('justice_hearing'),applied=FB.resolveEventOption(s,ev,ev.options.find(function(o){return o.effects.custom==='justice_submit';}),{justiceId:pending.id,studentId:m.bishop});
    return {exact:exact,court:pending.courtKind,sentence:pending.sentence,applied:!!applied,status:R.snapshot(s,m.profile,m.oid).record.status};
  });
  expect(result).toEqual({exact:true,court:'religious',sentence:'penance',applied:true,status:'penance'});
});

test('current-content proceedings and payments survive two restores; malformed records reject atomically',async function ({page},info) {
  await start(page,info);
  const saved=await page.evaluate(function () {
    const s=FB.state,m=courtMatter(s,{player:true,fief:true});courtDecide(s,m,'charge',m.bishop,m.slot);courtDecide(s,m,'settlement');courtDecide(s,m,'accept',m.target);
    window.savedCaseId=m.oid;
    return FB.save.serialize();
  });
  const before=await page.evaluate(function () {return {cases:FB.state.authority.religiousCases,receipts:FB.state.authority.receipts,gold:FB.state.player.gold,
    see:FB.state.realms.papacy_1204.treasury.gold,grants:FB.state.settlementLordships,rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};});
  await restoreBookmark(page,saved);await restoreBookmark(page,await page.evaluate(function(){return FB.save.serialize();}));
  const after=await page.evaluate(function () {return {cases:FB.state.authority.religiousCases,receipts:FB.state.authority.receipts,gold:FB.state.player.gold,
    see:FB.state.realms.papacy_1204.treasury.gold,grants:FB.state.settlementLordships,rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};});
  expect(after).toEqual(before);
  const rejected=await page.evaluate(function () {
    const mutations=[function(v){delete v.state.authority.religiousCases;},function(v){v.state.authority.religiousCases[0].paid.amount++;},
      function(v){v.state.authority.religiousCases[0].definitionFingerprint='changed';},
      function(v){v.state.authority.religiousCases.push(v.state.authority.religiousCases[0]);},
      function(v){v.state.authority.receipts=v.state.authority.receipts.filter(function(r){return r.obligationId.indexOf('religious:')!==0;});},
      function(v){v.state.authority.religiousCases[0].accusation.victimId=v.state.player.charId;}];
    return mutations.map(function(mutate){const v=JSON.parse(FB.save.serialize());mutate(v);
      const before=JSON.stringify(FB.state),storage=JSON.stringify(localStorage),rng=FB.getRngState(),uid=FB.getUidCounter();let error=false;
      try{FB.save.restore(v);}catch(e){error=true;}
      return error&&before===JSON.stringify(FB.state)&&storage===JSON.stringify(localStorage)&&rng===FB.getRngState()&&uid===FB.getUidCounter();});
  });
  expect(rejected).toEqual(Array(6).fill(true));
});

test('ordinary fictional JSON import varies recipients and refusal policy, with pure validation and exact saved content',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  const valid=await page.evaluate(function(mod){
    const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),good=FB.mods.validate(mod);
    const bad=[function(v){v.religiousCases.river_clerical_peace.cause='identity';},function(v){v.religiousCases.river_clerical_peace.faiths=['jewish'];},
      function(v){v.religiousCases.river_clerical_peace.fee=-1;},function(v){v.religiousCases.river_clerical_peace.privatePlots=true;}].map(function(mutate){const v=JSON.parse(JSON.stringify(mod));mutate(v);return FB.mods.validate(v).length>0;});
    const containers=[null,[],false,7].map(function(v){return FB.mods.validate({name:'Malformed discipline',religiousCases:v}).length>0;});
    return {good:good,bad:bad,containers:containers,pure:before===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },river);
  expect(valid).toEqual({good:[],bad:Array(4).fill(true),containers:Array(4).fill(true),pure:true});
  await page.evaluate(function(){FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/religious-river-court.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);await beginBookmark(page,info,'1204','baron');await bind(page);
  const result=await page.evaluate(function(){
    const s=FB.state,R=FB.religiousCases;
    // Stage an actual superior court, preserving the bishop's local holdings.
    // This tests independent institutional and secular public accounts.
    s.realms.papacy_1204.liege='france_1204';
    FB.ecclesiasticalGovernment.row(s,'papacy_1204').scope.forEach(function(pid){s.owner[pid]='france_1204';});
    FB.invalidateRealmCache();FB.materializeRealmRuler(s,'france_1204');
    if (!FB.authorityEstablishRight(s,{issuer:{kind:'realm',id:'papacy_1204'},beneficiary:{kind:'realm',id:'france_1204'},
        scope:{kind:'county',id:'spoleto'},power:'peace',basis:'judgment',basisRef:'river-shared-court'}))
      throw new Error('Could not establish the fictional shared court mandate');
    const secularJudge=FB.realmRulerCharacterSnapshot(s,'france_1204');
    if (!FB.authorityEstablishRight(s,{issuer:{kind:'realm',id:'papacy_1204'},beneficiary:{kind:'character',id:secularJudge.id},
        scope:{kind:'county',id:'spoleto'},power:'peace',basis:'judgment',basisRef:'river-named-judge'}))
      throw new Error('Could not establish the named judge mandate');
    const m=courtMatter(s,{pid:'spoleto',profile:'river_clerical_peace',wealth:100});
    const branch=JSON.parse(JSON.stringify(s));courtDecide(branch,m,'charge');courtDecide(branch,m,'refer');
    courtDecide(branch,m,'accept_referral',m.court);courtDecide(branch,m,'submit',m.target);courtDecide(branch,m,'enforce',m.court);
    const accepted=R.snapshot(branch,m.profile,m.oid).record.status==='enforced'&&FB.justiceCustodyOf(branch,m.target).captorId===m.court;
    courtDecide(s,m,'charge');courtDecide(s,m,'refer');const support=FB.countySupportBase(s,m.pid),refused=R.respond(s,m.profile,m.oid);
    const refusal=R.snapshot(s,m.profile,m.oid).record.status==='charged'&&FB.countySupportBase(s,m.pid)===support-1;
    const publicBefore=s.realms.france_1204.treasury.gold,seeBefore=s.realms.papacy_1204.treasury.gold,victim=s.chars[m.victim].wealth,privateBefore=s.player.gold;
    courtDecide(s,m,'settlement',m.target);const paid=R.respond(s,m.profile,m.oid);
    const sig=FB.mods.sig(),saved=FB.save.serialize();
    return {accepted:accepted,distinct:m.court!==m.bishop,refused:refused,refusal:refusal,paid:paid,public:s.realms.france_1204.treasury.gold-publicBefore,see:s.realms.papacy_1204.treasury.gold===seeBefore,
      private:s.player.gold===privateBefore,victim:s.chars[m.victim].wealth===victim,defendant:s.chars[m.target].wealth,
      sig:sig,saved:saved};
  });
  expect({...result,sig:!!result.sig,saved:!!result.saved}).toEqual({accepted:true,distinct:true,refused:true,refusal:true,paid:true,public:25,see:true,private:true,victim:true,defendant:75,sig:true,saved:true});
  await restoreBookmark(page,result.saved);await restoreBookmark(page,await page.evaluate(function(){return FB.save.serialize();}));
  expect(await page.evaluate(function(){return FB.mods.sig();})).toBe(result.sig);
  const changed=await page.evaluate(function(){const p=JSON.parse(JSON.stringify(FBDATA.religiousCases.river_clerical_peace)),saved=FB.save.serialize();p.fee=1;
    FB.mods.apply({name:'Changed river court',religiousCases:{river_clerical_peace:p}});const before=JSON.stringify(FB.state);let error=false;
    try{FB.save.restore(JSON.parse(saved));}catch(e){error=true;}return error&&before===JSON.stringify(FB.state);});
  expect(changed).toBe(true);
});

test('the ordinary deed is free and narrow-screen review cancellation and results retain focus and scroll',async function ({page},info) {
  await page.setViewportSize({width:390,height:740});await start(page,info);
  await page.evaluate(function(){
    const s=FB.state,m=courtMatter(s,{player:true,fief:true});courtDecide(s,m,'charge',m.bishop,m.slot);
    window.mobileMatter=m;window.mobileBefore=JSON.stringify([s.turn,s.player.gold,s.player.cooldowns]);
    FB.runInstant(s,'ecclesiastical_court');
  });
  await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');
  expect(await page.evaluate(function(){return window.mobileBefore===JSON.stringify([FB.state.turn,FB.state.player.gold,FB.state.player.cooldowns]);})).toBe(true);
  const offer=page.getByRole('button',{name:/^Offer a financial settlement/});await offer.scrollIntoViewIfNeeded();
  const scroll=await page.locator('#gm-body').evaluate(function(n){return n.scrollTop;});expect(scroll).toBeGreaterThan(0);
  await offer.click();await expect(page.locator('#religious-confirm')).toBeVisible();await page.keyboard.press('Escape');
  await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');await expect(offer).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function(n){return n.scrollTop;})).toBe(scroll);
  await offer.click();await page.locator('#religious-confirm').click();await expect(page.locator('#gm-title')).toHaveText('Court decision recorded');
  await page.locator('#religious-continue').click();await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');
  const overflow=await page.locator('#gm-body').evaluate(function(n){return n.scrollWidth>n.clientWidth;});expect(overflow).toBe(false);
  expect(await page.evaluate(function(){return FB.religiousCases.snapshot(FB.state,mobileMatter.profile,mobileMatter.oid).record.status;})).toBe('settled');
});

test('a canonically elected player bishop selects an actual defendant through the ordinary court deed',async function ({page},info) {
  await start(page,info);
  await page.evaluate(function () {
    const s=FB.state,p=s.papacy,c=s.chars[s.player.charId],bishop=FB.ecclesiasticalGovernment.incumbent(s,'papacy_1204');
    FB.appointCardinal(s,c,p.romanObedience,bishop.id);FB.startPapalElection(s,p.romanObedience,'death');
    const election=p.elections[p.romanObedience];election.phase='name';election.winnerId=c.id;
    if(!FB.choosePapalName(s,p.romanObedience,FB.papalRegnalChoices(s,c.id)[0].name)) throw new Error('Canonical election failed');
    const m=courtMatter(s,{});window.playerBishopMatter=m;
    window.beforeCourt=JSON.stringify([s.turn,s.player.gold,s.realms[m.realm].treasury.gold,s.settlementLordships]);
    FB.runInstant(s,'ecclesiastical_court');
  });
  await expect(page.locator('#gm-title')).toHaveText('Named ecclesiastical cases');
  await page.getByRole('button',{name:/^Open a named prosecution/}).click();
  await expect(page.locator('#religious-confirm')).toBeVisible();await page.keyboard.press('Escape');
  expect(await page.evaluate(function(){return !FB.state.authority.religiousCases;})).toBe(true);
  await page.getByRole('button',{name:/^Open a named prosecution/}).click();await page.locator('#religious-confirm').click();
  const result=await page.evaluate(function(){const s=FB.state,m=playerBishopMatter,r=FB.religiousCases.snapshot(s,m.profile,m.oid).record;
    return {actor:r.principals.bishopId===s.player.charId,target:r.accusation.accusedId===m.target,
      conserved:beforeCourt===JSON.stringify([s.turn,s.player.gold,s.realms[m.realm].treasury.gold,s.settlementLordships])};});
  expect(result).toEqual({actor:true,target:true,conserved:true});
});
