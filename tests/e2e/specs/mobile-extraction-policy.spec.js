'use strict';
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {installRestoreFacts} = require('../support/game/restore-facts');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const example = require('../fixtures/authoring/mobile-extraction-glassroad.json');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['data/mobile_confederations.js','data/ai_decisions.js','data/political_institutions.js',
  'js/mobile_confederations.js','js/actions.js','js/ai_decisions.js','js/mods.js','js/ui_mobile.js',
  'js/schema.js','js/government_selection.js','js/governments.js','js/government_ai.js','js/government_diplomacy.js',
  'js/mobile_command.js','js/mobile_columns.js','js/mobile_camps.js','js/federates.js','js/authority.js',
  'js/wars.js','js/armies.js','js/fortifications.js','js/treasury.js','js/market.js','js/population.js',
  'js/world.js','js/events.js','data/events_common.js','data/events_world.js','js/save.js','js/save_v4.js',
  'js/government_civic.js','js/civic_transactions.js','js/government_support.js','js/modifiers.js',
  'js/main.js','js/starts.js','js/ui_misc.js','js/bookmark_setup.js','data/bookmark_manifest.js']);

async function imported(page,info,leader) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (input) {return FB.mods.validate(input);},example)).toEqual([]);
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-extraction-glassroad.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('GLASSROAD-dune_world-'+(leader ? 'dune_leader_start' : 'dune_household')+
    '-dune_well-f-'+(leader ? 'Sela_Vey' : 'Review')+'-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
  await helpers(page,'dune_coalition');
}
async function helpers(page,rid) {
  await page.evaluate(function (rid) {
    const M=FB.mobile;
    window.extractionTest={rid:rid,
      request:function (action,terms,actor) {return {realmId:rid,action:action,terms:terms,
        actor:actor || {kind:'realm',id:rid}};},
      act:function (action,terms,actor) {return M.commit(FB.state,M.review(FB.state,this.request(action,terms,actor)));},
      approve:function (terms) {
        if (!this.act('propose',{operation:'extraction',proposal:terms})) throw new Error('Proposal refused');
        M.members(FB.state,rid).forEach(function (m) {
          if (!extractionTest.act('assent',{assent:true},m.principal)) throw new Error('Assent refused');
        });
        return M.review(FB.state,this.request('extract',terms));
      },
      demand:function (kind) {return {kind:'demand',countyId:M.migration(FB.state,rid).at,
        agreementKind:kind || 'tribute',threat:'raid',price:3,duration:30,levy:kind==='protection' ? 40 : 0};},
      checkpoint:function () {return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);}
    };
  },rid);
}

test('native and ordinary JSON policies validate purely and reject malformed candidate fields atomically',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (input) {
    const before=JSON.stringify([FBDATA.mobileProfiles,FBDATA.federateContractTerms,FBDATA.aiDecisionPolicies,FB.state]),
      rng=FB.getRngState(),uid=FB.getUidCounter();
    const valid=FB.mods.validate(input),bad=[];
    [function (d) {d.mobileProfiles.dune_compact.extractionPolicy.raid.stockShare=1.01;},
      function (d) {d.mobileProfiles.dune_compact.extractionPolicy.raid.cooldownDays=0;},
      function (d) {d.mobileProfiles.dune_compact.extractionPolicy.demand.kinds=['access'];},
      function (d) {d.mobileProfiles.dune_compact.extractionPolicy.hire.templateIds=['missing_service'];},
      function (d) {d.federateContractTerms.glassroad_service.land='conquest';},
      function (d) {d.mobileProfiles.dune_compact.extractionPolicy.grant=100;},
      function (d) {d.aiDecisionPolicies.glassroad_response.demandResponse.maxPaymentShare=2;},
      function (d) {d.aiDecisionPolicies.glassroad_response.demandResponse.raiderCulture='dune_folk';},
      function (d) {d.mobileProfiles.dune_compact.extractionPolicy=JSON.parse('{"schema":1,"constructor":{}}');}
    ].forEach(function (edit) {
      const d=JSON.parse(JSON.stringify(input));edit(d);bad.push(FB.mods.validate(d).length>0);
    });
    return {valid:valid,bad:bad,pure:before===JSON.stringify([FBDATA.mobileProfiles,FBDATA.federateContractTerms,FBDATA.aiDecisionPolicies,FB.state]) &&
      rng===FB.getRngState() && uid===FB.getUidCounter(),native:FB.mobile.validateProfiles(),
      broad:Object.keys(FBDATA.mobileProfiles.pontic_following.extractionPolicy).sort(),
      service:Object.keys(FBDATA.mobileProfiles.river_following.extractionPolicy).sort()};
  },example);
  expect(result).toEqual({valid:[],bad:Array(9).fill(true),pure:true,native:[],
    broad:['demand','hire','raid','schema'],service:['hire','schema']});
});

for (const crazygames of [false,true]) test('native coalition shares exact player and AI reviews in '+(crazygames ? 'explicit distribution' : 'ordinary play'),async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'476',code:'MOBILE-476-mobile_household_476-cherson-m-Review-established'},crazygames);
  await helpers(page,'pontic_following_476');
  const result=await page.evaluate(function () {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),t=X.demand();
    const before=X.checkpoint(),notApproved=M.review(s,X.request('extract',t));
    const pure=before===X.checkpoint(),q=X.approve(t),leader=M.leader(s,rid);
    const personal=M.review(s,X.request('extract',t,{kind:'character',id:leader.id}));
    const same=personal.review.allowed===q.review.allowed && personal.review.cost===q.review.cost &&
      JSON.stringify(personal.review.offer)===JSON.stringify(q.review.offer);
    const recorded=M.commit(s,personal),a=r.agreements[r.agreements.length-1],balance=FB.treasuryAvailable(s,rid);
    const warCount=JSON.stringify([s.wars,s.aiWars,s.owner,s.holder]);
    const refused=X.act('decline',{agreementId:a.id},{kind:'realm',id:a.partnerId});
    const original=r.profileId;r.profileId='river_following';
    const limited=M.extractionOperations(s,rid),raidWithheld=!M.review(s,X.request('extract',{kind:'raid',countyId:'cherson'})).review.allowed;
    r.profileId=original;
    return {pure:pure,notApproved:notApproved.review.allowed,allowed:q.review.allowed,same:same,recorded:recorded,refused:refused,
      noPayment:FB.treasuryAvailable(s,rid)===balance,noWar:warCount===JSON.stringify([s.wars,s.aiWars,s.owner,s.holder]),
      ended:a.status,valid:M.validate(s),operations:M.extractionOperations(s,rid),limited:limited,raidWithheld:raidWithheld};
  });
  expect(result).toEqual({pure:true,notApproved:false,allowed:true,same:true,recorded:true,refused:true,
    noPayment:true,noWar:true,ended:'ended',valid:true,operations:['demand','raid','hire'],limited:['hire'],raidWithheld:true});
});

test('AI extraction selects the same reviewed raid and paid service from imported policy variation',async function ({page},info) {
  await imported(page,info,false);
  const result=await page.evaluate(function (input) {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,raid=input.mobileProfiles.dune_compact.extractionPolicy.raid,
      hire=input.mobileProfiles.dune_compact.extractionPolicy.hire;
    input.mobileProfiles.dune_compact.extractionPolicy={schema:1,raid:raid};FB.mods.apply(input);
    const raided=M.extractionAI(s,rid),receipt=M.row(s,rid).lastRaid;
    input.mobileProfiles.dune_compact.extractionPolicy={schema:1,hire:hire};FB.mods.apply(input);
    // Stage an already completed court/host reunion at the unraided paying
    // court. This case tests AI contracting, not the intervening journey.
    const camp=M.migration(s,rid),host=M.host(s,rid);camp.at='dune_pass';host.at='dune_pass';host.from='dune_pass';
    camp.courtIds.forEach(function (cid) {s.chars[cid].homeProvinceId='dune_pass';});
    const hired=M.extractionAI(s,rid),contract=s.authority.contracts.slice(-1)[0];
    if (contract) {s.realms[contract.patronRealmId].treasury.gold=40;s.realms[contract.patronRealmId].treasury.militaryAccrued=0;}
    if (contract) {
      const response=M.review(s,X.request('hire_answer',Object.assign(M.contractTerms(s,contract.id),{accept:true}),
        {kind:'realm',id:contract.patronRealmId}));
      if (!response.review.allowed) throw new Error('AI service review: '+JSON.stringify(response.review));
    }
    const offered=contract && contract.status==='offered';M.extractionResponses(s,rid);
    return {raided:raided,receipt:!!receipt && receipt.success && receipt.gold>=0 && receipt.food>=0,
      hired:hired,offered:offered,active:!!contract && FB.political.contract(s,contract.id).effective,valid:M.validate(s)};
  },JSON.parse(JSON.stringify(example)));
  expect(result).toEqual({raided:true,receipt:true,hired:true,offered:true,active:true,valid:true});
});

test('a local raid conserves holder coin and market food, records real losses and reaches the household moment',async function ({page},info) {
  await imported(page,info,false);await installRestoreFacts(page);
  const result=await page.evaluate(function () {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid),pid=host.at,
      holder=s.holder[pid],at=s.market.goods.indexOf('provisions');
    s.realms[holder].treasury.gold=7.5;s.realms[holder].treasury.militaryAccrued=0;
    s.market.counties[pid][0][at]=17.5;
    const review=X.approve({kind:'raid',countyId:pid}),q=review.review.raid,before=X.checkpoint();
    const again=M.review(s,review.request),pure=before===X.checkpoint() && JSON.stringify(again)===JSON.stringify(review);
    const gold=FB.treasuryAvailable(s,rid),food=r.food,stock=FB.marketProvisionSnapshot(s,pid).stock,
      targetGold=FB.treasuryAvailable(s,holder),people=M.total(s,rid),dead=r.accounting.dead,
      geography=JSON.stringify([s.owner,s.holder,s.authority.rights,s.wars,s.aiWars]),
      privateGold=s.player.gold,committed=M.commit(s,review),receipt=r.lastRaid;
    const after=X.checkpoint(),repeat=!M.commit(s,review) && after===X.checkpoint();
    const result={allowed:review.review.allowed,pure:pure,success:q.success,committed:committed,gold:q.gold,food:q.food,
      coin:FB.treasuryAvailable(s,rid)-gold===targetGold-FB.treasuryAvailable(s,holder),
      provisions:r.food-food===stock-FB.marketProvisionSnapshot(s,pid).stock,
      exact:FB.treasuryAvailable(s,rid)-gold===receipt.gold && r.food-food===receipt.food,
      losses:people-M.total(s,rid)===q.casualties && r.accounting.dead-dead===q.casualties,
      units:Object.keys(host.units).reduce(function (n,id) {return n+host.units[id];},0)===host.men,private:s.player.gold===privateGold,
      noLand:geography===JSON.stringify([s.owner,s.holder,s.authority.rights,s.wars,s.aiWars]),repeat:repeat,
      household:(s.eventQueue || []).some(function (e) {return e.id==='devastation_raiders';}),valid:M.validate(s)};
    function facts() {return restoreFacts(FB.state,function (d) {return {mobile:M.row(d,rid),
      accounts:[d.realms[rid].treasury,d.realms[holder].treasury],market:d.market,armies:d.armies,
      player:d.player,queue:d.eventQueue,people:d.chars};},{technologySets:true});}
    const expected=facts();FB.save.restore(JSON.parse(FB.save.serialize()));const first=assertRestoreFacts(facts(),expected);
    FB.save.restore(JSON.parse(FB.save.serialize()));result.restored=first && assertRestoreFacts(facts(),expected);
    return result;
  });
  expect(result).toEqual({allowed:true,pure:true,success:true,committed:true,gold:1,food:4,coin:true,provisions:true,
    exact:true,losses:true,units:true,private:true,noLand:true,repeat:true,household:true,valid:true,restored:true});
});

test('stale reviews, lost assent, strong defenders and empty stocks end without invented gains',async function ({page},info) {
  await imported(page,info,false);
  const result=await page.evaluate(function () {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),pid=M.host(s,rid).at,t={kind:'raid',countyId:pid};
    let q=X.approve(t);
    const stock=s.market.counties[pid][0],at=s.market.goods.indexOf('provisions');stock[at]+=1;
    let before=X.checkpoint();const stale=!M.commit(s,q) && before===X.checkpoint();
    q=M.review(s,q.request);
    const member=r.members[1];X.act('assent',{assent:false},member.principal);
    before=X.checkpoint();const assent=!M.commit(s,q) && !M.review(s,q.request).review.allowed && before===X.checkpoint();
    q=X.approve(t);const dev=s.dev[pid];s.dev[pid]=10000;FB.invalidateRealmCache();
    const strong=M.review(s,q.request),repelled=strong.review.raid && !strong.review.raid.success &&
      strong.review.raid.gold===0 && strong.review.raid.food===0;
    const gold=FB.treasuryAvailable(s,rid),food=r.food,defended=M.commit(s,strong),noGains=gold===FB.treasuryAvailable(s,rid) && food===r.food;
    // Stage a separate current boundary directly; do not simulate a long journey.
    s.dev[pid]=dev;FB.invalidateRealmCache();
    const recovery=M.host(s,rid);
    if (!recovery) throw new Error('The bounded test host must survive this defense');
    delete r.lastRaid;delete r.lastRaidTurn;
    stock[at]=0;s.realms[s.holder[pid]].treasury.gold=0;
    const empty=X.approve(t),emptySpoils=empty.review.raid.gold===0 && empty.review.raid.food===0;
    return {stale:stale,assent:assent,repelled:repelled,defended:defended,noGains:noGains,emptySpoils:emptySpoils,valid:M.validate(s)};
  });
  expect(result).toEqual({stale:true,assent:true,repelled:true,defended:true,noGains:true,emptySpoils:true,valid:true});
});

test('outside demand policy weighs available funds, defending forces and the actual coalition for either agreement kind',async function ({page},info) {
  await imported(page,info,true);await installRestoreFacts(page);
  const result=await page.evaluate(function () {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),pid=M.host(s,rid).at,partner=s.holder[pid];
    s.realms[partner].treasury.gold=40;s.realms[partner].treasury.militaryAccrued=0;
    let q=X.approve(X.demand()),posted=M.commit(s,q),a=r.agreements[r.agreements.length-1];
    const before=X.checkpoint(),response=FB.aiDecisions.mobileDemandResponse(s,partner,rid,a),pure=before===X.checkpoint();
    const gold=FB.treasuryAvailable(s,rid),payer=FB.treasuryAvailable(s,partner),answered=M.answerDemandAI(s,rid,a.id);
    const transferred=FB.treasuryAvailable(s,rid)-gold===3 && payer-FB.treasuryAvailable(s,partner)===3;
    const saved=JSON.parse(FB.save.serialize()),checkpoint=restoreFacts(s,function (d) {
      return [M.row(d,rid),d.realms[rid].treasury,d.realms[partner].treasury];
    });
    // Inspect matching restoration on detached saves, then continue with the
    // restored live owner instead of retaining pre-load state references.
    FB.save.restore(saved);
    const restored=assertRestoreFacts(restoreFacts(FB.state,function (d) {
      return [M.row(d,rid),d.realms[rid].treasury,d.realms[partner].treasury];
    }),checkpoint);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    assertRestoreFacts(restoreFacts(FB.state,function (d) {
      return [M.row(d,rid),d.realms[rid].treasury,d.realms[partner].treasury];
    }),checkpoint);
    const current=FB.state;
    // End this commitment through its finite deadline, without a season loop.
    M.row(current,rid).agreements.slice(-1)[0].status='ended';
    q=X.approve(X.demand('protection'));M.commit(current,q);a=M.row(current,rid).agreements.slice(-1)[0];
    current.realms[partner].treasury.gold=1;
    const poor=FB.aiDecisions.mobileDemandResponse(current,partner,rid,a),money=FB.treasuryAvailable(current,rid),declined=M.answerDemandAI(current,rid,a.id);
    const noPayment=money===FB.treasuryAvailable(current,rid) && a.status==='ended';
    current.realms[partner].treasury.gold=40;
    const offer={kind:'tribute',price:3},original=current.dev[pid];current.dev[pid]=10000;FB.invalidateRealmCache();
    const strong=FB.aiDecisions.mobileDemandResponse(current,partner,rid,offer);current.dev[pid]=original;FB.invalidateRealmCache();
    const host=M.host(current,rid),men=host.men;host.men=0;
    const absent=FB.aiDecisions.mobileDemandResponse(current,partner,rid,offer);host.men=men;
    q=X.approve(X.demand());M.commit(current,q);a=M.row(current,rid).agreements.slice(-1)[0];
    FB.governments.support.row(current,partner).scopes.forEach(function (countyId) {FB.setCountySupport(current,countyId,-100);});
    const consent=M.review(current,X.request('accept',{agreementId:a.id},{kind:'realm',id:partner}));
    const constitutional=!consent.review.allowed && !consent.review.partnerConsent.allowed &&
      FB.aiDecisions.mobileDemandResponse(current,partner,rid,a).accept;
    const balance=FB.treasuryAvailable(current,rid),settledRefusal=M.answerDemandAI(current,rid,a.id) && a.status==='ended' &&
      FB.treasuryAvailable(current,rid)===balance;
    return {posted:posted,pure:pure,policy:response.policyId,accept:response.accept,answered:answered,transferred:transferred,
      poor:poor.accept,declined:declined,noPayment:noPayment,strong:strong.accept,absent:absent.accept,restored:restored,
      constitutional:constitutional,settledRefusal:settledRefusal,valid:M.validate(current)};
  });
  expect(result).toEqual({posted:true,pure:true,policy:'glassroad_response',accept:true,answered:true,transferred:true,
    poor:false,declined:true,noPayment:true,strong:false,absent:false,restored:true,constitutional:true,settledRefusal:true,valid:true});
});

test('hired service uses the existing exact paid contract and matching current-content saves reject malformed records',async function ({page},info) {
  await imported(page,info,true);await installRestoreFacts(page);
  const result=await page.evaluate(function (input) {
    const X=extractionTest,s=FB.state,M=FB.mobile,rid=X.rid,partner='dune_gate';
    s.realms[partner].treasury.gold=40;s.realms[partner].treasury.militaryAccrued=0;
    const terms={kind:'hire',partnerId:partner,templateId:'glassroad_service'},q=X.approve(terms),before=X.checkpoint();
    const fresh=M.review(s,q.request),pure=before===X.checkpoint() && JSON.stringify(fresh)===JSON.stringify(q);
    const gold=FB.treasuryAvailable(s,rid),outside=FB.treasuryAvailable(s,partner),created=M.commit(s,q),c=s.authority.contracts.slice(-1)[0];
    const held=c.status==='offered' && FB.treasuryAvailable(s,rid)===gold;
    const answer=Object.assign(M.contractTerms(s,c.id),{accept:true});
    const review=M.review(s,X.request('hire_answer',answer,{kind:'realm',id:partner}));
    const paid=M.commit(s,review),once=!M.commit(s,review),effective=FB.political.contract(s,c.id).effective;
    const noLand=c.settlementCountyIds.length===0 && c.settlementAwards.length===0;
    const conserved=FB.treasuryAvailable(s,rid)-gold===2 && outside-FB.treasuryAvailable(s,partner)===2;
    M.row(s,rid).food-=9;s.player.gold-=1;
    function facts() {return restoreFacts(FB.state,function (state) {
      return {mobile:M.row(state,rid),contracts:state.authority.contracts,armies:state.armies,
        people:state.chars,player:state.player,realms:state.realms,market:state.market,stories:state.stories};
    },{technologySets:true});}
    const expected=facts();FB.save.restore(JSON.parse(FB.save.serialize()));const first=assertRestoreFacts(facts(),expected);
    FB.save.restore(JSON.parse(FB.save.serialize()));const second=assertRestoreFacts(facts(),expected);
    const saved=JSON.parse(FB.save.serialize()),state=FB.state,storage=JSON.stringify(localStorage),checkpoint=X.checkpoint();
    const rejected=[function (d) {M.row(d,rid).lastRaidTurn=0;},
      function (d) {M.row(d,rid).decision={operation:'extraction',terms:{kind:'raid',countyId:'dune_well',grant:2},approvals:{}};}
    ].map(function (edit) {const bad=JSON.parse(JSON.stringify(saved));edit(bad.state);try {FB.save.restore(bad);return false;} catch (e) {return true;}});
    const atomic=FB.state===state && X.checkpoint()===checkpoint && storage===JSON.stringify(localStorage);
    input.mobileProfiles.dune_compact.extractionPolicy.raid.maxFood++;
    FB.mods.apply(input);let changedPolicy=false;
    try {FB.save.restore(saved);} catch (e) {changedPolicy=/different mod/.test(e.message);}
    const live=FB.state;FB.authorityContractTransition(live,c.id,'release',partner);
    const replacement=X.approve(terms),offered=M.commit(live,replacement),pending=live.authority.contracts.slice(-1)[0];
    live.realms[partner].treasury.gold=0;
    const balance=FB.treasuryAvailable(live,rid);M.extractionResponses(live,rid);
    const refused=offered && pending.status==='expired' && pending.transitionReason==='service_released' &&
      balance===FB.treasuryAvailable(live,rid);
    return {allowed:q.review.allowed,pure:pure,created:created,held:held,paid:paid,once:once,effective:effective,
      noLand:noLand,conserved:conserved,first:first,second:second,rejected:rejected,
      atomic:atomic,changedPolicy:changedPolicy,refused:refused,valid:M.validate(FB.state)};
  },JSON.parse(JSON.stringify(example)));
  expect(result).toEqual({allowed:true,pure:true,created:true,held:true,paid:true,once:true,effective:true,noLand:true,
    conserved:true,first:true,second:true,rejected:[true,true],atomic:true,changedPolicy:true,refused:true,valid:true});
});

test('player proposals receive NPC member responses and mobile review returns preserve inputs, scroll and focus',async function ({page},info) {
  await imported(page,info,true);
  await page.evaluate(function () {
    const X=extractionTest,s=FB.state,r=FB.mobile.row(s,X.rid),t={kind:'raid',countyId:'dune_well'};
    X.act('propose',{operation:'extraction',proposal:t});
    X.act('assent',{assent:true},{kind:'character',id:s.player.charId});
    FB.mobile.extractionResponses(s,X.rid);
    if (!r.decision.approvals[r.members[1].id]) throw new Error('NPC assent missing');
    FB.ui.showMobileConfederation(X.rid);
  });
  const raid=page.getByRole('button',{name:/^Raid the selected county/});
  await expect(raid).toBeEnabled();
  await page.locator('#mobile-price').fill('3');await page.locator('#mobile-price').dispatchEvent('change');
  await page.locator('#mobile-days').fill('30');await page.locator('#mobile-days').dispatchEvent('change');
  await raid.scrollIntoViewIfNeeded();
  const position=await page.evaluate(function () {return document.getElementById('gm-body').scrollTop;});
  expect(position).toBeGreaterThan(0);
  const checkpoint=await page.evaluate(function () {return extractionTest.checkpoint();});
  await raid.click();
  await expect(page.locator('#gm-body')).toContainText('Coin transferred');
  await expect(page.locator('#gm-body')).toContainText('No claim, occupation or settlement');
  await page.keyboard.press('Escape');
  await expect(raid).toBeVisible();
  expect(await page.locator('#mobile-price').inputValue()).toBe('3');
  expect(await page.evaluate(function () {return document.getElementById('gm-body').scrollTop;})).toBeCloseTo(position,0);
  await expect(raid).toBeFocused();
  expect(await page.evaluate(function () {return extractionTest.checkpoint();})).toBe(checkpoint);
  await raid.click();await page.locator('#mobile-confirm').click();
  await page.locator('#mobile-continue').click();
  await expect(page.locator('#mobile-price')).toHaveValue('3');
  await expect(raid).toBeDisabled();
});
