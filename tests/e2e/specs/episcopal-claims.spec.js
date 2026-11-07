'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { startHistoricalGame } = require('../support/game/historical-start');
const { openGame, prepareGameContent } = require('../support/game/navigation');
const { beginBookmark, restoreBookmark } = require('../support/game/bookmark-acceptance');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const river = require('../fixtures/authoring/episcopal-river-rent.json');

dependsOnRuntime(__filename,[
  'index.html','data/episcopal_claims.js','data/actions.js','data/technology.js',
  'data/bookmark_1204.js','data/ecclesiastical_profiles.js','data/economy.js',
  'js/episcopal_claims.js','js/actions.js','js/lordships.js','js/justice.js',
  'js/authority.js','js/treasury.js','js/government_ecclesiastical.js','js/ecclesiastical_strategies.js',
  'js/papacy.js','js/economy.js','js/model.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/ui_religious_institutions.js','js/ui_modals.js','js/ui_misc.js'
]);

async function start(page,info) {
  await startHistoricalGame(page,info,{ bookmark:'1204',code:'RENT-1204-baron-roma-m-Rent' });
  await bind(page,'roman_temporal_rent','roma');
}
async function bind(page,id,pid) {
  return page.evaluate(function (at) {
    const s = FB.state, C = FB.episcopalClaims;
    s.player.gold = 200;
    const current = FB.directSettlements(s,{kind:'character',id:s.player.charId}).find(function (v) { return v.provinceId === at.pid && v.settlement > 0; });
    let slot = current && current.settlement;
    if (!slot) {
      // The ordinary grant owner stages a real private right; the claim owner
      // is never allowed to generate property as part of a review.
      slot = 1;
      FB.rememberSettlementSites(s,at.pid);
      if (!FB.assignSettlementLordship(s,at.pid,slot,s.player.charId)) throw new Error('Could not stage a private settlement');
    }
    const snap = C.snapshot(s,at.id,slot);
    if (!snap || snap.reason) throw new Error('Rent fixture: ' + JSON.stringify(snap));
    window.rentAt = {id:at.id,pid:at.pid,slot:slot};
    window.rentDecision = function (action,cid) {
      const q = C.quote(FB.state,at.id,slot,cid || FB.state.player.charId,action);
      if (!q || !q.allowed || !C.apply(FB.state,q)) throw new Error('Rent decision ' + action + ': ' + JSON.stringify(q));
      return q;
    };
    return window.rentAt;
  },{id:id,pid:pid});
}

test('a real rent charter supports pure review, contest and refused temporal enforcement', async function ({page},info) {
  await start(page,info);
  const result = await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt,cid=s.player.charId;
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    for (let i=0;i<4;i++) { C.list(s,cid); C.snapshot(s,a.id,a.slot); C.quote(s,a.id,a.slot,cid,'demand'); }
    const pure=before===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    const rights=JSON.stringify([s.owner,s.holder,s.settlementLordships]),funds=s.player.gold;
    rentDecision('demand'); rentDecision('contest');
    const disputed=C.snapshot(s,a.id,a.slot).record.disputed;
    const noSpiritualJurisdiction=!FB.justiceCivilRentJurisdiction(s,cid,'papacy_1204',a.pid);
    rentDecision('request_enforcement');
    const answered=C.respond(s,a.id,a.slot),snap=C.snapshot(s,a.id,a.slot);
    return {pure:pure,disputed:disputed,noSpiritualJurisdiction:noSpiritualJurisdiction,answered:answered,
      status:snap.record.status,rights:rights===JSON.stringify([s.owner,s.holder,s.settlementLordships]),
      funds:s.player.gold===funds,receipts:s.authority.receipts.filter(function (r) {return r.obligationId.indexOf('episcopal:')===0;}).length,
      tech:FBDATA.techImpactReviews.features.episcopal_rent_compositions.mode,
      declaration:C.catalogFaults(FBDATA)};
  });
  expect(result).toEqual({pure:true,disputed:true,noSpiritualJurisdiction:true,answered:true,status:'rejected',rights:true,funds:true,receipts:0,tech:'none',declaration:[]});
});

test('recurring composition replaces both sides of one actual due and expires without double settlement', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt,cid=s.player.charId;
    rentDecision('demand'); rentDecision('recurring');
    const accepted=C.respond(s,a.id,a.slot),r=C.snapshot(s,a.id,a.slot).record, funds=s.player.gold;
    const current=C.dues(s,a.pid,a.slot,100,20);
    s.turn=90; FB.invalidateSettlementLordships(s,a.pid);
    const f=FB.settlementFiscalProjection(s,a.pid,a.slot),h=FB.settlementActorFiscal(s,{kind:'character',id:cid});
    const publicFiscal=FB.settlementActorFiscal(s,{kind:'realm',id:'papacy_1204'});
    const exact=f.amounts.dues===h.duesOut && Math.abs(f.amounts.dues-publicFiscal.duesIn)<0.000001;
    const recurring=C.dues(s,a.pid,a.slot,100,20),first=FB.treasurySeason(s);
    const settled=JSON.stringify([s.realms.papacy_1204.treasury,s.settlementLordships.accounts,s.authority.receipts]);
    const second=FB.treasurySeason(s),once=settled===JSON.stringify([s.realms.papacy_1204.treasury,s.settlementLordships.accounts,s.authority.receipts]);
    const repeated=!C.apply(s,C.quote(s,a.id,a.slot,r.principals.bishopId,'accept'));
    s.turn=r.terms.endSeason*90;
    return {accepted:accepted,current:current,recurring:recurring,exact:exact,first:first,second:second,once:once,
      repeated:repeated,expired:C.dues(s,a.pid,a.slot,100,20),privateFunds:s.player.gold===funds};
  });
  expect(result).toEqual({accepted:true,current:20,recurring:10,exact:true,first:true,second:false,once:true,repeated:true,expired:20,privateFunds:true});
});

test('compensation conserves private and institutional money and rejects stale or unaffordable acceptance atomically', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt;
    rentDecision('demand'); const bishop=C.snapshot(s,a.id,a.slot).bishopId;
    rentDecision('compensation',bishop);
    const q=C.quote(s,a.id,a.slot,s.player.charId,'accept');
    s.player.gold=0;
    const empty=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const poor=!C.apply(s,q)&&empty===JSON.stringify(s)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    s.player.gold=200;
    const fresh=C.quote(s,a.id,a.slot,s.player.charId,'accept');
    const r=s.settlementLordships.counties[a.pid].lordships[a.slot],charter=r.obligations.charterId;
    r.obligations.charterId='light_service';
    const changed=JSON.stringify(s), stale=!C.apply(s,fresh)&&changed===JSON.stringify(s);
    r.obligations.charterId=charter;
    const privateBefore=s.player.gold, publicBefore=s.realms.papacy_1204.treasury.gold;
    const secularBefore=s.realms.france_1204.treasury.gold;
    const accepted=C.apply(s,C.quote(s,a.id,a.slot,s.player.charId,'accept'));
    const paid=s.authority.receipts.filter(function (r) {return r.obligationId.indexOf('episcopal:')===0;});
    const again=!C.apply(s,fresh),privateAfter=s.player.gold;
    s.turn=90;
    return {poor:poor,stale:stale,accepted:accepted,privateDelta:privateBefore-privateAfter,
      publicDelta:s.realms.papacy_1204.treasury.gold-publicBefore,again:again,receipts:paid.length,
      payer:paid[0].payerCharacterId===s.player.charId,payee:paid[0].beneficiaryRealmId,
      waived:C.dues(s,a.pid,a.slot,100,20),secular:s.realms.france_1204.treasury.gold===secularBefore};
  });
  expect(result).toEqual({poor:true,stale:true,accepted:true,privateDelta:12,publicDelta:12,again:true,receipts:1,payer:true,payee:'papacy_1204',waived:0,secular:true});
});

test('refusal and abandonment conserve owners; missing grants and changed living principals prevent agreement', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const original=FB.state,C=FB.episcopalClaims,a=rentAt;
    function fresh() {return JSON.parse(JSON.stringify(original));}
    function apply(s,action,cid) {return C.apply(s,C.quote(s,a.id,a.slot,cid||s.player.charId,action));}
    function conserved(s,before) {return JSON.stringify([s.player.gold,s.realms.papacy_1204.treasury.gold,s.settlementLordships,s.owner,s.holder])===before;}
    const outcomes=['decline','abandon'].map(function (action) {
      const s=fresh();apply(s,'demand');
      const bishop=C.snapshot(s,a.id,a.slot).bishopId;
      apply(s,'compensation',bishop);
      const before=JSON.stringify([s.player.gold,s.realms.papacy_1204.treasury.gold,s.settlementLordships,s.owner,s.holder]);
      return apply(s,action,action==='abandon'?bishop:s.player.charId)&&conserved(s,before)&&C.dues(s,a.pid,a.slot,100,20)===20;
    });
    const missing=fresh();delete missing.settlementLordships.counties[a.pid].lordships[a.slot];
    const absent=!C.quote(missing,a.id,a.slot,missing.player.charId,'demand').allowed&&C.list(missing,missing.player.charId).length===0;
    const s=fresh();apply(s,'demand');const bishop=C.snapshot(s,a.id,a.slot).bishopId;apply(s,'compensation',bishop);
    const quote=C.quote(s,a.id,a.slot,s.player.charId,'accept');
    s.chars[bishop].dead=true;
    const before=JSON.stringify(s),dead=!C.apply(s,quote)&&before===JSON.stringify(s);
    const t=fresh();apply(t,'demand');const old=t.player.charId;
    apply(t,'compensation',C.snapshot(t,a.id,a.slot).bishopId);
    const next=FB.makeCharacter(t,{name:'New holder',sex:'m',culture:'italian',religion:'catholic',born:t.date.year-40,station:3,traitsN:0});
    const review=C.quote(t,a.id,a.slot,old,'accept');
    FB.settlementLordshipsPlayerSuccession(t,old,next.id); t.chars[old].dead=true;
    const state=JSON.stringify(t),replaced=!C.apply(t,review)&&state===JSON.stringify(t)&&C.snapshot(t,a.id,a.slot).stale;
    const expired=fresh();apply(expired,'demand');
    apply(expired,'compensation',C.snapshot(expired,a.id,a.slot).bishopId);expired.turn+=31;
    const expiryBefore=JSON.stringify(expired),expiry=!apply(expired,'accept')&&expiryBefore===JSON.stringify(expired);
    return {outcomes:outcomes,absent:absent,dead:dead,replaced:replaced,expiry:expiry};
  });
  expect(result).toEqual({outcomes:[true,true],absent:true,dead:true,replaced:true,expiry:true});
});

test('agreements survive bishop and possessor succession but suspend on lost jurisdiction or replaced rights', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt,E=FB.ecclesiasticalGovernment;
    rentDecision('demand'); rentDecision('compensation'); C.respond(s,a.id,a.slot);
    const record=JSON.stringify(s.authority.episcopalClaims),purse=s.realms.papacy_1204.treasury.gold;
    const bishop=E.incumbent(s,'papacy_1204');
    FB.killChar(s,bishop); s.turn=90;
    const vacancy=C.dues(s,a.pid,a.slot,100,20)===0 && record===JSON.stringify(s.authority.episcopalClaims);
    const next=FB.makeCharacter(s,{name:'Replacement possessor',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-35,station:3,traitsN:0});
    const property=s.settlementLordships.counties[a.pid].lordships[a.slot];
    const old=property.holderId; property.successorId=next.id;
    FB.settlementLordshipsPlayerSuccession(s,old,next.id);
    const inherited=property.holderId===next.id && C.dues(s,a.pid,a.slot,100,20)===0;
    const owner=s.owner[a.pid]; s.owner[a.pid]='france_1204';
    const suspended=C.dues(s,a.pid,a.slot,100,20)===20;
    const denied=!C.quote(s,a.id,a.slot,next.id,'demand').allowed;
    s.owner[a.pid]=owner;
    property.grantedTurn++;
    return {vacancy:vacancy,inherited:inherited,suspended:suspended,denied:denied,
      replaced:C.dues(s,a.pid,a.slot,100,20)===20,publicFunds:s.realms.papacy_1204.treasury.gold===purse,
      noPrivateInheritance:!s.player.flags.pope};
  });
  expect(result).toEqual({vacancy:true,inherited:true,suspended:true,denied:true,replaced:true,publicFunds:true,noPrivateInheritance:true});
});

test('current claims round trip twice and malformed terms or receipts reject before live state or storage changes', async function ({page},info) {
  await start(page,info);
  const saved=await page.evaluate(function () {
    rentDecision('demand'); rentDecision('compensation'); FB.episcopalClaims.respond(FB.state,rentAt.id,rentAt.slot);
    return FB.save.serialize();
  });
  const original=await page.evaluate(function () {
    return {claims:JSON.stringify(FB.state.authority.episcopalClaims),receipts:JSON.stringify(FB.state.authority.receipts),gold:FB.state.player.gold,
      public:FB.state.realms.papacy_1204.treasury.gold,rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
  });
  await restoreBookmark(page,saved);
  const savedAgain=await page.evaluate(function () {return FB.save.serialize();});
  await restoreBookmark(page,savedAgain);
  const result=await page.evaluate(function () {
    const s=FB.state;
    const facts={claims:JSON.stringify(s.authority.episcopalClaims),receipts:JSON.stringify(s.authority.receipts),gold:s.player.gold,
      public:s.realms.papacy_1204.treasury.gold,rng:FB.getRngState()>>>0,uid:FB.getUidCounter()};
    const cases=[function (v) {v.state.authority.episcopalClaims[0].terms.share=0.7;},
      function (v) {v.state.authority.episcopalClaims[0].definitionFingerprint='changed';},
      function (v) {v.state.authority.episcopalClaims.push(v.state.authority.episcopalClaims[0]);},
      function (v) {v.state.authority.receipts=v.state.authority.receipts.filter(function (r) {return r.obligationId.indexOf('episcopal:')!==0;});},
      function (v) {v.state.authority.episcopalClaims[0].terms.endSeason++;},
      function (v) {delete v.state.authority.episcopalClaims;}];
    const rejected=cases.map(function (mutate) {
      const v=JSON.parse(FB.save.serialize());mutate(v);
      const before=JSON.stringify(FB.state),storage=JSON.stringify(localStorage),rng=FB.getRngState(),uid=FB.getUidCounter();
      let error=false;try {FB.save.restore(v);} catch(e) {error=true;}
      return error&&before===JSON.stringify(FB.state)&&storage===JSON.stringify(localStorage)&&rng===FB.getRngState()&&uid===FB.getUidCounter();
    });
    return {facts:facts,rejected:rejected};
  });
  expect(result.facts).toEqual(original);
  expect(result.rejected).toEqual(Array(6).fill(true));
});

test('an ordinary fictional JSON import changes terms, uses shared NPC decisions and preserves exact fingerprints', async function ({page},info) {
  await openGame(page,info);
  await prepareGameContent(page);
  const validation=await page.evaluate(function (mod) {
    const before=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const valid=FB.mods.validate(mod),broken=JSON.parse(JSON.stringify(mod));broken.episcopalClaims.river_rent.unpaidDebt=100;
    const invalid=FB.mods.validate(broken);
    const malformed=[null,[],false,7].every(function (value) {return FB.mods.validate({name:'Invalid claim table',episcopalClaims:value}).length>0;});
    return {valid:valid,invalid:invalid.length>0,malformed:malformed,pure:before===JSON.stringify(FBDATA)&&rng===FB.getRngState()&&uid===FB.getUidCounter()};
  },river);
  expect(validation).toEqual({valid:[],invalid:true,malformed:true,pure:true});
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/episcopal-river-rent.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmark(page,info,'1204','baron');
  await bind(page,'river_rent','spoleto');
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt,cid=s.player.charId;
    const npcState=JSON.parse(JSON.stringify(s));
    const tenant=FB.makeCharacter(npcState,{name:'River tenant',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-35,station:3,traitsN:0});
    FB.assignSettlementLordship(npcState,a.pid,a.slot,tenant.id);
    FB.settleBaronyAccounts(npcState,Math.floor(s.turn/90));
    npcState.settlementLordships.accounts[tenant.id].gold=30;
    const bishop=C.snapshot(npcState,a.id,a.slot).bishopId,publicBefore=npcState.realms.papacy_1204.treasury.gold,privateBefore=npcState.player.gold;
    C.apply(npcState,C.quote(npcState,a.id,a.slot,bishop,'demand'));
    C.apply(npcState,C.quote(npcState,a.id,a.slot,bishop,'compensation'));
    const npcPaid=C.respond(npcState,a.id,a.slot)&&npcState.settlementLordships.accounts[tenant.id].gold===23&&
      npcState.realms.papacy_1204.treasury.gold===publicBefore+7&&npcState.player.gold===privateBefore;
    rentDecision('demand'); rentDecision('contest'); rentDecision('request_enforcement');
    const judged=C.respond(s,a.id,a.slot),r=C.snapshot(s,a.id,a.slot).record;
    const sig=FB.mods.sig(),saved=FB.save.serialize();
    const changed=JSON.parse(JSON.stringify(FBDATA.episcopalClaims.river_rent));
    changed.compensation++;
    FB.mods.apply({name:'Changed river terms',episcopalClaims:{river_rent:changed}});
    const before=JSON.stringify(FB.state);let rejected=false;
    try {FB.save.restore(JSON.parse(saved));}catch(e) {rejected=true;}
    return {npcPaid:npcPaid,judged:judged,adjudicated:r.adjudicated,share:r.terms.share,seasons:r.terms.endSeason-r.terms.startSeason,
      signature:sig!==FB.mods.sig(),rejected:rejected&&before===JSON.stringify(FB.state)};
  });
  expect(result).toEqual({npcPaid:true,judged:true,adjudicated:true,share:0.05,seasons:2,signature:true,rejected:true});
});

test('a replacement player bishop renews stale claims and uses actual temporal jurisdiction against a contesting NPC', async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function () {
    const s=FB.state,C=FB.episcopalClaims,a=rentAt,E=FB.ecclesiasticalGovernment,p=s.papacy;
    const holder=FB.makeCharacter(s,{name:'Existing private tenant',sex:'m',culture:'italian',religion:'catholic',born:s.date.year-35,station:3,traitsN:0});
    FB.assignSettlementLordship(s,a.pid,a.slot,holder.id);
    FB.settleBaronyAccounts(s,Math.floor(s.turn/90));
    FB.creditBaronyAccount(s,holder.id,50);
    const bishop=E.incumbent(s,'papacy_1204').id,c=s.chars[s.player.charId];
    rentDecision('demand',bishop);rentDecision('compensation',bishop);
    const offered=C.quote(s,a.id,a.slot,holder.id,'accept');
    FB.appointCardinal(s,c,p.romanObedience,bishop);
    FB.startPapalElection(s,p.romanObedience,'death');
    const election=p.elections[p.romanObedience];election.phase='name';election.winnerId=c.id;
    if (!FB.choosePapalName(s,p.romanObedience,FB.papalRegnalChoices(s,c.id)[0].name)) throw new Error('Papal replacement failed');
    const before=JSON.stringify(s),stale=!C.apply(s,offered)&&before===JSON.stringify(s);
    const funds=s.player.gold,treasury=s.realms.papacy_1204.treasury.gold;
    rentDecision('demand');rentDecision('recurring');
    const contested=C.respond(s,a.id,a.slot)&&C.snapshot(s,a.id,a.slot).record.disputed;
    rentDecision('request_enforcement');
    const jurisdiction=FB.justiceCivilRentJurisdiction(s,c.id,'papacy_1204',a.pid);
    rentDecision('adjudicate');
    const settled=C.snapshot(s,a.id,a.slot).record;
    const previewBefore=JSON.stringify(s);FB.ui.showBishopric();
    const pureSheet=previewBefore===JSON.stringify(s);FB.ui.closeModal();
    s.turn=settled.terms.startSeason*90;
    return {stale:stale,contested:contested,jurisdiction:jurisdiction,adjudicated:settled.adjudicated,
      realDue:C.dues(s,a.pid,a.slot,100,20),private:s.player.gold===funds,public:s.realms.papacy_1204.treasury.gold===treasury,
      entry:C.entry(s,'bishopric'),pureSheet:pureSheet};
  });
  expect(result).toEqual({stale:true,contested:true,jurisdiction:true,adjudicated:true,realDue:10,private:true,public:true,entry:true,pureSheet:true});
});

test('all three ordinary deeds open a free review and mobile Back, Escape and outcomes retain list position', async function ({page},info) {
  await page.setViewportSize({width:390,height:740});
  await start(page,info);
  for (const id of ['visit_diocese','ecclesiastical_court','bishopric']) {
    const before=await page.evaluate(function () {return [FB.state.turn,FB.state.player.gold,JSON.stringify(FB.state.player.cooldowns)];});
    await page.evaluate(function (id) {FB.runInstant(FB.state,id);},id);
    await expect(page.locator('#gm-title')).toHaveText('Episcopal rent claims');
    expect(await page.evaluate(function () {return [FB.state.turn,FB.state.player.gold,JSON.stringify(FB.state.player.cooldowns)];})).toEqual(before);
    if (id!=='bishopric') await page.evaluate(function () {FB.ui.closeModal();});
  }
  const demand=page.locator('[data-rent-review]').filter({hasText:'Request a fresh rent review'});
  await demand.scrollIntoViewIfNeeded();
  const pos=await page.locator('#gm-body').evaluate(function (n) {return n.scrollTop;});
  expect(pos).toBeGreaterThan(0);
  await demand.click();await expect(page.locator('#rent-confirm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#gm-title')).toHaveText('Episcopal rent claims');
  await expect(demand).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (n) {return n.scrollTop;})).toBe(pos);
  await demand.click();await page.locator('#rent-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Rent decision recorded');
  await page.locator('#rent-continue').click();
  await expect(page.locator('#gm-title')).toHaveText('Episcopal rent claims');
  await expect(page.getByRole('button',{name:/^Contest the evidence/})).toBeVisible();
  await expect(page.getByRole('button',{name:/^Contest the evidence/})).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (n) {return n.scrollTop;})).toBeGreaterThan(0);
  const width=await page.locator('#gm-body').evaluate(function (n) {return [n.scrollWidth,n.clientWidth];});
  expect(width[0]).toBeLessThanOrEqual(width[1]);
  // A personal bishop may also possess a private holding in another see.
  // Its existing office sheet remains the parent of the civil claim review.
  await page.evaluate(function () {
    const s=FB.state,c=s.chars[s.player.charId];
    c.bishopric={seeProvinceId:'london',appointedTurn:s.turn,previousTier:3,appointerKind:'canonical',appointerId:null,investiturePolicy:'canonical'};
    FB.ui.showBishopric();
  });
  await expect(page.locator('#gm-title')).toHaveText('The Bishopric');
  await page.locator('#bishop-rent-claims').scrollIntoViewIfNeeded();
  const parentPos=await page.locator('#gm-body').evaluate(function (n) {return n.scrollTop;});
  await page.locator('#bishop-rent-claims').click();
  await expect(page.locator('#gm-title')).toHaveText('Episcopal rent claims');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.locator('#gm-title')).toHaveText('The Bishopric');
  await expect(page.locator('#bishop-rent-claims')).toBeFocused();
  expect(await page.locator('#gm-body').evaluate(function (n) {return n.scrollTop;})).toBe(parentPos);
});
