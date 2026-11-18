'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {startHistoricalGame}=require('../support/game/historical-start');
const {installRestoreFacts}=require('../support/game/restore-facts');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const example=require('../fixtures/authoring/mobile-cohesion-glassroad.json');

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['data/mobile_confederations.js','js/mobile_confederations.js','js/ui_mobile.js',
  'js/authority.js','js/armies.js','js/mods.js','js/schema.js','js/actions.js','js/governments.js',
  'js/government_selection.js','js/mobile_command.js','js/mobile_camps.js','js/mobile_columns.js',
  'js/treasury.js','js/market.js','js/population.js','js/save.js','js/save_v4.js','js/world.js',
  'js/ai_decisions.js','data/ai_decisions.js','js/ui_misc.js','js/starts.js','js/main.js',
  'js/federates.js','js/wars.js','js/model.js','js/government_civic.js','js/civic_transactions.js',
  'js/government_support.js','data/political_institutions.js','data/bookmark_manifest.js']);

async function imported(page,info,leader) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-cohesion-glassroad.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('COHESION-dune_world-'+(leader ? 'dune_leader_start' : 'dune_household')+
    '-dune_well-f-'+(leader ? 'Sela_Vey' : 'Review')+'-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);});
  await helpers(page,'dune_coalition');
}
async function helpers(page,rid) {
  await page.evaluate(function (rid) {
    window.cohesionTest={rid:rid,
      request:function (action,terms,actor) {return {realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}};},
      act:function (action,terms,actor) {return FB.mobile.commit(FB.state,FB.mobile.review(FB.state,this.request(action,terms,actor)));},
      approve:function (operation,terms) {
        if (!this.act('propose',{operation:operation,proposal:terms})) throw new Error('Proposal refused');
        FB.mobile.members(FB.state,rid).forEach(function (m) {
          if (!cohesionTest.act('assent',{assent:true},m.principal)) throw new Error('Member assent refused');
        });
      },
      payment:function () {
        const s=FB.state,M=FB.mobile,terms={kind:'demand',countyId:M.migration(s,rid).at,agreementKind:'tribute',
          threat:'raid',price:3,duration:30,levy:0};
        this.approve('extraction',terms);
        if (!this.act('extract',terms)) throw new Error('Demand refused');
        const a=M.row(s,rid).agreements.slice(-1)[0];
        if (!this.act('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId})) throw new Error('Payment refused');
        return a;
      },
      checkpoint:function () {return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);}
    };
  },rid);
}

test('native and ordinary JSON policies validate purely and reject unsafe or identity-based fields',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (input) {
    const before=JSON.stringify([FBDATA.mobileProfiles,FB.state,FB.getRngState(),FB.getUidCounter()]);
    const bad=[function (p) {p.initialSupport=101;},function (p) {p.victory=-1;},function (p) {p.defeat=1;},
      function (p) {p.receiptShare=Infinity;},function (p) {p.scarcity.days=0;},function (p) {p.idle.seasons=0;},
      function (p) {p.thresholds.depart=99;},function (p) {p.standing.factor=2;},
      function (p) {p.distribution.mode='script';},function (p) {p.distribution.favorites=0;},
      function (p) {p.rebelPeople=['dune_folk'];},function (p) {p.collapseYear=476;},
      function (p) {p.scarcity=JSON.parse('{"days":2,"support":-1,"constructor":{}}');}
    ].map(function (edit) {const d=JSON.parse(JSON.stringify(input));edit(d.mobileProfiles.dune_compact.cohesionPolicy);return FB.mods.validate(d).length>0;});
    return {valid:FB.mods.validate(input),native:FB.mobile.validateProfiles(),bad:bad,
      pure:before===JSON.stringify([FBDATA.mobileProfiles,FB.state,FB.getRngState(),FB.getUidCounter()]),
      technologies:['mobile_member_cohesion','mobile_spoils_distribution'].map(function (id) {return FBDATA.techImpactReviews.features[id].mode;})};
  },example);
  expect(result).toEqual({valid:[],native:[],bad:Array(13).fill(true),pure:true,technologies:['none','none']});
});

test('the same conserved receipt kept, shared equally or favored changes support and later member assent differently',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,rid=X.rid,s=FB.state,a=X.payment(),r=M.row(s,rid);
    const pending=r.cohesion.receipts[0],sourceOnce=!X.act('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId});
    const base=FB.save.serialize();
    const outcomes=['keep','weight','favor'].map(function (mode) {
      FB.save.restore(JSON.parse(base));
      const s=FB.state,r=M.row(s,rid),before=X.checkpoint(),terms={receiptId:pending.id,mode:mode,memberIds:mode==='favor' ? [r.members[2].id] : []};
      const q=M.review(s,X.request('distribute',terms)),pure=before===X.checkpoint();
      const gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold+r.members.slice(1).reduce(function (n,m) {return n+(s.chars[m.principal.id].gold || 0);},0);
      const committed=M.commit(s,q),after=X.checkpoint(),repeat=!M.commit(s,q) && after===X.checkpoint();
      const paid=s.player.gold+r.members.slice(1).reduce(function (n,m) {return n+(s.chars[m.principal.id].gold || 0);},0)-privateGold;
      X.approve('extraction',{kind:'raid',countyId:'dune_well'});M.memberResponses(s,rid);
      const decision=r.decision && Object.keys(r.decision.approvals).length;
      return {allowed:q.review.allowed,pure:pure,committed:committed,repeat:repeat,
        conserved:Math.abs(gold-FB.treasuryAvailable(s,rid)-paid)<0.000001,paid:paid,
        support:r.members.map(function (m) {return m.support;}),pledges:r.members.slice(1).map(function (m) {return m.pledge;}),
        decision:decision,valid:M.validate(s),pending:r.cohesion.receipts.length};
    });
    return {sourceOnce:sourceOnce,outcomes:outcomes};
  });
  expect(result.sourceOnce).toBe(true);
  for (const o of result.outcomes) expect(o).toMatchObject({allowed:true,pure:true,committed:true,repeat:true,conserved:true,valid:true,pending:0});
  expect(result.outcomes.map(function (o) {return o.support;})).toEqual([[40,40,40],[70,70,70],[40,40,100]]);
  expect(result.outcomes.map(function (o) {return o.paid;})).toEqual([0,3,3]);
  expect(result.outcomes.map(function (o) {return o.pledges;})).toEqual([[0,0],[0.1,0.1],[0,0.1]]);
  expect(result.outcomes[1].decision).toBe(3);
  expect(result.outcomes[0].decision).toBeNull();
});

for (const crazygames of [false,true]) test('native AI distributes real raid receipts by the same review in '+(crazygames ? 'explicit distribution' : 'ordinary play'),async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'476',code:'MOBILE-476-mobile_household_476-cherson-m-Review-established'},crazygames);
  await helpers(page,'pontic_following_476');
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid),pid=host.at;
    const at=s.market.goods.indexOf('provisions');s.market.counties[pid][0][at]=100;
    const terms={kind:'raid',countyId:pid};X.approve('extraction',terms);
    const q=M.review(s,X.request('extract',terms)),gold=FB.treasuryAvailable(s,rid),food=r.food,
      target=FB.treasuryAvailable(s,s.holder[pid]),stock=FB.marketProvisionSnapshot(s,pid).stock,
      purses=r.members.reduce(function (n,m) {return n+(s.chars[m.principal.id].gold || 0);},0);
    const committed=M.commit(s,q),d=r.cohesion.lastDistribution;
    return {allowed:q.review.allowed,success:q.review.raid.success,committed:committed,mode:d && d.mode,
      battle:r.members.every(function (m) {return m.support>65;}),pending:r.cohesion.receipts.length,
      coin:Math.abs(target-FB.treasuryAvailable(s,s.holder[pid])-(FB.treasuryAvailable(s,rid)-gold)-
        (r.members.reduce(function (n,m) {return n+(s.chars[m.principal.id].gold || 0);},0)-purses))<0.000001,
      food:Math.abs(stock-FB.marketProvisionSnapshot(s,pid).stock-(r.food-food)-d.rows.reduce(function (n,a) {return n+a.food;},0))<0.000001,
      valid:M.validate(s)};
  });
  expect(result).toEqual({allowed:true,success:true,committed:true,mode:'weight',battle:true,pending:0,coin:true,food:true,valid:true});
});

test('scarcity causes lawful member departure without combat and daily dispatch is once only',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid),at=M.migration(s,rid).at;
    const access={kind:'access',partnerId:s.holder[at],countyIds:[at],capacity:Math.floor(s.population.counties[at].count*0.15),allowRecruit:true,price:0,duration:270};
    X.approve('agreement',access);
    if (!X.act('offer',access)) throw new Error('Access offer refused');
    const a=r.agreements.slice(-1)[0];
    if (!X.act('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId})) throw new Error('Access refused');
    a.harvestPeriod=0;r.lastAI=0;
    const wars=JSON.stringify([s.wars,s.aiWars]),initial=r.members.length,local=s.population.counties[at].count;
    for (let day=1;day<=26;day++) {s.turn=day;r.food=0;M.day(s);}
    const after=X.checkpoint();M.day(s);
    return {initial:initial,remaining:r.members.length,scarcity:r.cohesion.scarcityDays,
      settled:r.accounting.settled>0,local:s.population.counties[at].count>local,
      withheld:r.members.some(function (m) {return m.principal.id!==r.leaderId && m.pledge===0;}),
      noBattle:wars===JSON.stringify([s.wars,s.aiWars]),once:after===X.checkpoint(),valid:M.validate(s)};
  });
  expect(result).toEqual({initial:3,remaining:2,scarcity:26,settled:true,local:true,withheld:true,noBattle:true,once:true,valid:true});
});

test('idle seasons and current leader Standing drive support, and death can yield smooth or contested live selection',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,rid=X.rid,base=FB.save.serialize();
    const idle=[0,-60].map(function (standing) {
      FB.save.restore(JSON.parse(base));const s=FB.state,r=M.row(s,rid),leader=M.leader(s,rid);
      leader.opinion=standing;leader.realmStanding=standing;
      s.player.liegeOp=standing;s.player.liegeOps=s.player.liegeOps || {};s.player.liegeOps[rid]=standing;
      const current=FB.realmRulerStandingSnapshot(s,rid),initial=r.members[1].support;
      s.turn=90;r.lastAI=1;r.food=10000;M.day(s);
      const after=X.checkpoint();M.day(s);
      return {delta:r.members[1].support-initial,expected:-11+(current-10)*0.1,once:after===X.checkpoint()};
    });
    const elections=[70,30].map(function (support) {
      FB.save.restore(JSON.parse(base));const s=FB.state,r=M.row(s,rid);
      r.members.forEach(function (m) {m.support=support;});
      s.chars[r.leaderId].dead=true;r.selection={votes:{}};r.leaderId=null;
      const gold=FB.treasuryAvailable(s,rid),food=r.food,total=M.total(s,rid);
      M.ai(s,rid);
      return {selected:!!M.leader(s,rid),open:!!r.selection,
        votes:r.selection ? Object.keys(r.selection.votes).map(function (id) {return r.selection.votes[id];}) : [],
        conserved:gold===FB.treasuryAvailable(s,rid) && food===r.food && total===M.total(s,rid),valid:M.validate(s)};
    });
    return {idle:idle,elections:elections};
  });
  for (const a of result.idle) {expect(a.delta).toBeCloseTo(a.expected,8);expect(a.once).toBe(true);}
  expect(result.idle[1].delta).toBeLessThan(result.idle[0].delta);
  expect(result.elections[0]).toMatchObject({selected:true,open:false,conserved:true,valid:true});
  expect(result.elections[1]).toMatchObject({selected:false,open:true,conserved:true,valid:true});
  expect(new Set(result.elections[1].votes).size).toBe(2);
});

test('paid service receipts persist without replay and malformed saves, stale reviews and changed policy reject atomically',async function ({page},info) {
  await imported(page,info,true);await installRestoreFacts(page);
  const result=await page.evaluate(function (input) {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,partner='dune_gate';
    s.realms[partner].treasury.gold=100;s.realms[partner].treasury.militaryAccrued=0;
    const terms={kind:'hire',partnerId:partner,templateId:'glassroad_service'};X.approve('extraction',terms);
    const created=X.act('extract',terms),c=s.authority.contracts.slice(-1)[0],answer=Object.assign(M.contractTerms(s,c.id),{accept:true});
    const accepted=X.act('hire_answer',answer,{kind:'realm',id:partner}),r=M.row(s,rid);
    const initial=r.cohesion.receipts.map(function (a) {return a.source;});
    s.turn=90;FB.authoritySeason(s);
    const sources=r.cohesion.receipts.map(function (a) {return a.source;}),before=X.checkpoint();FB.authoritySeason(s);
    const once=before===X.checkpoint(),pending=r.cohesion.receipts[0],t={receiptId:pending.id,mode:'weight',memberIds:[]},q=M.review(s,X.request('distribute',t));
    r.members[1].support--;const staleBefore=X.checkpoint(),stale=!M.commit(s,q) && staleBefore===X.checkpoint();
    const shared=X.act('distribute',t);r.food-=3;s.player.gold-=1;
    function facts() {return restoreFacts(FB.state,function (state) {
      return {mobile:M.row(state,rid),player:state.player,people:state.chars,realms:state.realms,
        contracts:state.authority.contracts,armies:state.armies,market:state.market};
    },{technologySets:true});}
    const expected=facts();FB.save.restore(JSON.parse(FB.save.serialize()));const first=assertRestoreFacts(facts(),expected);
    FB.save.restore(JSON.parse(FB.save.serialize()));const second=assertRestoreFacts(facts(),expected);
    const saved=JSON.parse(FB.save.serialize()),live=FB.state,checkpoint=X.checkpoint(),storage=JSON.stringify(localStorage);
    const bad=[function (r) {delete r.cohesion;},function (r) {r.members[0].support=101;},
      function (r) {r.members[0].lastGainTurn=99999;},function (r) {r.cohesion.receipts.push(r.cohesion.receipts[0]);},
      function (r) {r.cohesion.lastDistribution.rows[0].gold+=1;},function (r) {r.cohesion.scarcityDays=-1;}
    ].map(function (edit) {const d=JSON.parse(JSON.stringify(saved));edit(M.row(d.state,rid));try {FB.save.restore(d);return false;} catch (e) {return true;}});
    const atomic=FB.state===live && checkpoint===X.checkpoint() && storage===JSON.stringify(localStorage);
    input.mobileProfiles.dune_compact.cohesionPolicy.receiptShare++;
    FB.mods.apply(input);let fingerprint=false;try {FB.save.restore(saved);} catch (e) {fingerprint=/different mod/.test(e.message);}
    return {created:created,accepted:accepted,initial:initial,sources:sources,once:once,stale:stale,shared:shared,
      first:first,second:second,bad:bad,atomic:atomic,fingerprint:fingerprint};
  },JSON.parse(JSON.stringify(example)));
  expect(result).toEqual({created:true,accepted:true,initial:['service_initial'],sources:['service_initial','service_season'],
    once:true,stale:true,shared:true,first:true,second:true,bad:Array(6).fill(true),atomic:true,fingerprint:true});
});

test('resolved field combat drives defeat support, and repeated hosts in one side do not multiply victory support',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid),partner='dune_gate';
    const initial=r.members[0].support;
    M.cohesionBattle(s,[host,host],true);
    const victory=r.members[0].support-initial;
    s.realms[rid].war={enemy:partner};s.realms[partner].war={enemy:rid};
    const enemy=JSON.parse(JSON.stringify(host));
    delete enemy.mobileFollowing;delete enemy.mobileRoster;delete enemy.mobileFood;delete enemy.mobileCourt;
    enemy.id='cohesion_opponent';enemy.realm=partner;enemy.men=10000;enemy.size=10000;enemy.units={};
    enemy.units[FB.unitRoleClass('levy_infantry')]=10000;
    enemy.path=[];enemy.goal=null;enemy.moveLeft=0;enemy.supply=100;enemy.scenarioStanding=true;enemy.scenarioEndTurn=s.turn+30;
    host.path=[];host.goal=null;host.moveLeft=0;s.armies=[host,enemy];
    Object.keys(s.realms).forEach(function (id) {s.armyDown[id]=s.turn;});
    const before=r.members[0].support;
    FB.armyTick(s);
    return {victory:victory,defeat:r.members[0].support-before,dead:r.accounting.dead>0};
  });
  expect(result).toEqual({victory:9,defeat:-14,dead:true});
});

for (const publicPayer of [false,true]) test('spent stock and full receipts preserve ' + (publicPayer ? 'public' : 'ordinary') + ' service payments until collection is available',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function (publicPayer) {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid);
    X.payment();const receipt=r.cohesion.receipts[0],saved=JSON.parse(JSON.stringify(receipt));
    s.realms[rid].treasury.gold=0;
    const before=X.checkpoint(),share=M.review(s,X.request('distribute',{receiptId:receipt.id,mode:'weight',memberIds:[]}));
    const refused=!M.commit(s,share) && before===X.checkpoint();
    const kept=X.act('distribute',{receiptId:receipt.id,mode:'keep',memberIds:[]});
    r.agreements[0].status='ended';
    const hire={kind:'hire',partnerId:'dune_gate',templateId:'glassroad_service'};
    s.realms.dune_gate.treasury.gold=100;s.realms.dune_gate.treasury.militaryAccrued=0;
    X.approve('extraction',hire);
    if (!X.act('extract',hire)) throw new Error('Service offer refused');
    const c=s.authority.contracts.slice(-1)[0],answer=Object.assign(M.contractTerms(s,c.id),{accept:true});
    for (let i=0;i<32;i++) {const a=JSON.parse(JSON.stringify(saved));r.serial++;a.id='spoils_'+r.serial;r.cohesion.receipts.push(a);}
    const terms={kind:'demand',countyId:'dune_well',agreementKind:'tribute',threat:'raid',price:3,duration:30,levy:0};
    // End the first exact agreement before staging a new offer to the same court.
    r.agreements[0].status='ended';X.approve('extraction',terms);
    const posted=X.act('extract',terms),a=r.agreements.slice(-1)[0],checkpoint=X.checkpoint();
    const q=M.review(s,X.request('accept',{agreementId:a.id},{kind:'realm',id:a.partnerId}));
    const noPayment=!M.commit(s,q) && checkpoint===X.checkpoint();
    const service=M.review(s,X.request('hire_answer',answer,{kind:'realm',id:'dune_gate'})),beforeService=X.checkpoint();
    const initialBlocked=service.review.reason==='capacity' && !M.commit(s,service) && beforeService===X.checkpoint();
    const directBlocked=!FB.authorityConsentContract(s,c.id,'dune_gate',publicPayer) && beforeService===X.checkpoint();
    X.act('distribute',{receiptId:r.cohesion.receipts[0].id,mode:'keep',memberIds:[]});
    const accepted=publicPayer ? FB.authorityConsentContract(s,c.id,'dune_gate',true) :
      X.act('hire_answer',answer,{kind:'realm',id:'dune_gate'});
    const funding=!!c.publicPayer===publicPayer;
    s.turn=90;const period=c.paidThroughPeriod,gold=FB.treasuryAvailable(s,rid);FB.authoritySeason(s);
    const seasonalBlocked=c.paidThroughPeriod===period && gold===FB.treasuryAvailable(s,rid);
    X.act('distribute',{receiptId:r.cohesion.receipts[0].id,mode:'keep',memberIds:[]});
    FB.authoritySeason(s);
    const resumed=c.paidThroughPeriod===1 && Math.abs(FB.treasuryAvailable(s,rid)-gold-c.payPerSeason)<0.000001;
    return {refused:refused,reason:share.review.reason,kept:kept,posted:posted,capacity:q.review.reason,
      noPayment:noPayment,initialBlocked:initialBlocked,directBlocked:directBlocked,accepted:accepted,funding:funding,
      seasonalBlocked:seasonalBlocked,resumed:resumed,valid:M.validate(s)};
  },publicPayer);
  expect(result).toEqual({refused:true,reason:'funds',kept:true,posted:true,capacity:'capacity',noPayment:true,
    initialBlocked:true,directBlocked:true,accepted:true,funding:true,seasonalBlocked:true,resumed:true,valid:true});
});

test('the imported AI favors named current members through the canonical distribution review',async function ({page},info) {
  await imported(page,info,false);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,s=FB.state,r=M.row(s,X.rid);
    s.turn=20;X.payment();
    const d=r.cohesion.lastDistribution;
    return {mode:d.mode,source:d.receipt.source,pending:r.cohesion.receipts.length,
      support:r.members.map(function (m) {return m.support;}),gains:r.members.map(function (m) {return m.lastGainTurn;}),
      recipients:d.rows.filter(function (a) {return a.gold>0;}).map(function (a) {return a.memberId;}),valid:M.validate(s)};
  });
  expect(result).toEqual({mode:'favor',source:'agreement',pending:0,support:[40,40,100],gains:[0,0,20],recipients:['caravan_following'],valid:true});
});

test('shared receipts restore declared NPC service after withholding without changing deployed fighters',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function () {
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid);
    X.payment();X.act('distribute',{receiptId:r.cohesion.receipts[0].id,mode:'keep',memberIds:[]});
    M.memberResponses(s,rid);
    const withheld=r.members.slice(1).map(function (m) {return m.pledge;});
    const men=host.men,roster=JSON.stringify(host.mobileRoster),total=M.total(s,rid);
    r.agreements[0].status='ended';X.payment();
    const shared=X.act('distribute',{receiptId:r.cohesion.receipts[0].id,mode:'weight',memberIds:[]});
    M.memberResponses(s,rid);
    return {withheld:withheld,shared:shared,pledges:r.members.slice(1).map(function (m) {return m.pledge;}),
      support:r.members.map(function (m) {return m.support;}),
      conserved:host.men===men && JSON.stringify(host.mobileRoster)===roster && M.total(s,rid)===total,valid:M.validate(s)};
  });
  expect(result).toEqual({withheld:[0,0],shared:true,pledges:[0.1,0.1],support:[55,55,55],conserved:true,valid:true});
});

test('omitting cohesion preserves existing assent checkpoints and single-preference election confirmation',async function ({page},info) {
  await imported(page,info,true);
  const result=await page.evaluate(function (input) {
    delete input.mobileProfiles.dune_compact.cohesionPolicy;FB.mods.apply(input);
    const X=cohesionTest,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid);
    // Stage the unchanged member representation of an unopted opening.
    delete r.cohesion;r.members.forEach(function (m) {delete m.support;delete m.lastGainTurn;});
    X.approve('extraction',{kind:'raid',countyId:'dune_well'});
    const checkpoint=X.checkpoint();M.extractionResponses(s,rid);M.extractionResponses(s,rid);
    const once=checkpoint===X.checkpoint();
    r.members.forEach(function (m,i) {
      m.weight=i===0 ? 10 : 1;
      s.chars[m.principal.id].skills.dip=i===0 ? 0 : 25;
      s.chars[m.principal.id].skills.mar=i===0 ? 0 : 25;
    });
    const playerMember=r.members[0];r.leaderId=null;r.selection={votes:{}};r.decision=null;
    X.act('support',{candidateId:s.player.charId},playerMember.principal);
    M.ai(s,rid);
    return {once:once,unled:!M.leader(s,rid),playerVote:r.selection.votes[playerMember.id]===s.player.charId,
      noSupport:r.members.every(function (m) {return m.support===undefined;}),valid:M.validate(s)};
  },JSON.parse(JSON.stringify(example)));
  expect(result).toEqual({once:true,unled:true,playerVote:true,noSupport:true,valid:true});
});

test('distribution controls retain favorites, inputs, scroll and focus through Cancel, Escape and outcome return',async function ({page},info) {
  await imported(page,info,true);
  await page.evaluate(function () {cohesionTest.payment();FB.ui.showMobileConfederation(cohesionTest.rid);});
  await page.locator('#mobile-favorites').selectOption(['ridge_following','caravan_following']);
  const share=page.getByRole('button',{name:/^Give receipt 1 to favored members/});
  await expect(share).toBeEnabled();await share.scrollIntoViewIfNeeded();
  const position=await page.evaluate(function () {return document.getElementById('gm-body').scrollTop;});
  expect(position).toBeGreaterThan(0);
  const before=await page.evaluate(function () {return cohesionTest.checkpoint();});
  await share.click();
  await expect(page.locator('#gm-body')).toContainText('Support after distribution');
  await expect(page.locator('#gm-body')).toContainText('Shared food is consumed');
  await page.keyboard.press('Escape');
  await expect(share).toBeFocused();
  expect(await page.locator('#mobile-favorites').evaluate(function (n) {return Array.from(n.selectedOptions).map(function (o) {return o.value;});})).toEqual(['ridge_following','caravan_following']);
  expect(await page.evaluate(function () {return document.getElementById('gm-body').scrollTop;})).toBeCloseTo(position,0);
  expect(await page.evaluate(function () {return cohesionTest.checkpoint();})).toBe(before);
  await share.click();await page.locator('#mobile-confirm').click();await page.locator('#mobile-continue').click();
  await expect(page.locator('#gm-body')).toContainText('Last distribution');
  await expect(page.locator('#mobile-favorites')).toBeVisible();
  expect(await page.evaluate(function () {return FB.mobile.row(FB.state,cohesionTest.rid).cohesion.receipts.length;})).toBe(0);
});
