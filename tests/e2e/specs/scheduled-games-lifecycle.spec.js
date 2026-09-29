'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/tournaments.js','data/events_tournament.js','data/technology.js',
  'js/tournaments.js','js/travel.js','js/events.js','js/main.js','js/actions.js','js/save.js',
  'js/technology.js','js/lordships.js','js/economy.js','js/world.js','js/wars.js','js/holywar.js','js/rebellions.js']);
const { test, expect } = require('../support/fixture');
const { startGames, bookGames } = require('../support/game/tournaments');

test('admission respects age, sex, serf locality, specialist training and sponsored access',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,c=s.chars[s.player.charId],e=T.get(s,args.id);
    c.sex='f';var watching=T.entry(s,e.id,c.id,'watch').ok,performing=T.entry(s,e.id,c.id,'perform').ok,wrestling=T.entry(s,e.id,c.id,'wrestling').ok;
    c.sex='m';s.player.tier=0;s.player.provinceId=e.provinceId;
    var local=T.entry(s,e.id,c.id,'archery').ok,serfPerform=T.entry(s,e.id,c.id,'perform').ok;
    var tenure=JSON.stringify(s.player.serfTenure),p=T.enter(s,T.entry(s,e.id,c.id,'archery'));
    var same=tenure===JSON.stringify(s.player.serfTenure);T.withdraw(s,e.id,c.id,true);
    e.participants=[];s.player.provinceId=args.ids.home;
    var foreign=T.entry(s,e.id,c.id,'watch').ok;
    s.player.tier=1;c.career={profession:'soldier',rank:'journeyman'};c.skills.mar=8;
    s.player.circuit.openWins=0;
    FB.adjustStanding(s,{kind:'character',id:e.hostId},-1000);
    var before=T.entry(s,e.id,c.id,'melee').ok;s.player.circuit.openWins=1;
    var after=T.entry(s,e.id,c.id,'melee');
    c.career.rank='apprentice';if(c.careerHistory)delete c.careerHistory.soldier;
    var untrained=T.entry(s,e.id,c.id,'melee').ok;
    return {watching:watching,performing:performing,wrestling:wrestling,local:local,serfPerform:serfPerform,same:same,foreign:foreign,before:before,after:after,untrained:untrained,rank:s.player.tier};
  },{id:id,ids:ids});
  expect(r.watching).toBe(true);expect(r.performing).toBe(true);expect(r.wrestling).toBe(false);
  expect(r.local).toBe(true);expect(r.serfPerform).toBe(false);expect(r.same).toBe(true);expect(r.foreign).toBe(false);
  expect(r.before).toBe(false);expect(r.after.ok).toBe(true);expect(r.after.sponsored).toBe(true);
  expect(r.untrained).toBe(false);expect(r.rank).toBe(1);
});

test('formal jousting reads venue technology and grandfathers an accepted entry',async function({page},info){
  const ids=await startGames(page,info);
  await page.evaluate(function(){
    var s=FB.state,tech=FB.realmTechRecord(s,'player');
    tech.completed.push('cavalry_lances');
    var item=FB.grantItem(s,'padded_jack',{quality:'plain'});FB.equipItem(s,s.player.charId,'body',item);
  });
  const id=await bookGames(page,ids,false,{programme:'lists'});
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),tech=FB.realmTechRecord(s,'player');
    var p=T.enter(s,T.entry(s,id,s.player.charId,'joust'));
    tech.completed=tech.completed.filter(function(t){return t!=='cavalry_lances';});
    s.turn=e.startTurn+1;var q=T.roundPreview(s,id,s.player.charId,'balanced');
    var accepted=!!p&&p.techAccepted,resolved=T.resolveRound(s,q);
    return {accepted:accepted,ready:q.ok,resolved:resolved,round:e.contests.joust.round};
  },id);
  expect(r).toEqual({accepted:true,ready:true,resolved:true,round:1});
});

test('war during a round invalidates saved contexts before any effects or RNG',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id);
    T.enter(s,T.entry(s,e.id,s.player.charId,'archery'));
    s.turn=e.startTurn+1;T.tick(s);
    var queued=s.eventQueue.filter(function(q){return q.id==='scheduled_games_round';})[0];
    var ev=FB.eventById(queued.id);
    s.wars={war_fixture:{id:'war_fixture',status:'active',attacker:'player',defender:args.ids.enemy,occupations:{}}};
    var gold=s.player.gold,rng=FB.getRngState();
    var result=FB.resolveEventOption(s,ev,ev.options[1],queued.ctx,{automated:false});
    var unchanged=gold===s.player.gold&&rng===FB.getRngState();
    T.reconcile(s);
    return {result:result,unchanged:unchanged,pending:s.eventQueue.some(function(q){return q.ctx&&q.ctx.tournamentId===e.id;}),closed:e.status,round:e.contests.archery.round};
  },{ids:ids,id:id});
  expect(r.result).toBe(false);expect(r.unchanged).toBe(true);expect(r.pending).toBe(false);expect(r.closed).toBe('cancelled');expect(r.round).toBe(0);
});

test('completed work remains earned during war, unworked contract funds return to the host',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),p=T.enter(s,T.entry(s,e.id,s.player.charId,'carrying'));
    for(var i=0;i<3;i++){s.turn=e.startTurn+i;T.tick(s);}
    var paid=p.paid,services=e.services,before=s.player.gold;
    s.wars={fixture:{id:'fixture',status:'active',attacker:'player',defender:args.ids.enemy,occupations:{}}};T.reconcile(s);
    var once=s.player.gold;T.reconcile(s);T.tick(s);
    return {paid:paid,contract:p.terms.contract,status:p.status,refunded:e.refunded,services:services,delta:once-before,last:s.player.gold,once:once,paidAfter:p.paid};
  },{ids:ids,id:id});
  expect(r.paid).toBeGreaterThan(0);expect(r.paid).toBeLessThan(r.contract);expect(r.paidAfter).toBe(r.paid);
  expect(r.refunded).toBeGreaterThanOrEqual(r.services);expect(r.delta).toBeCloseTo(r.refunded);expect(r.last).toBe(r.once);expect(r.status).toBe('interrupted');
});

test('late arrivals cannot join started contests and ordinary journeys retain their obligations',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id);
    s.player.cooldowns.take_road=s.turn;
    var tournament=T.travelQuote(s,id),ordinary=FB.travelEligible(s,'study',{readOnly:true});
    s.player.travel={purpose:'study',phase:'arrived',homeId:s.player.provinceId,currentId:e.provinceId,destinationId:e.provinceId,stayStartTurn:s.turn,legDays:3,remainingRoute:[],visited:[s.player.provinceId,e.provinceId],encounters:{culture:0,road:0},seenCultures:{},seenEvents:{}};
    var original=JSON.stringify(s.player.travel),local=T.enter(s,T.entry(s,id,s.player.charId,'watch'));
    var unchanged=JSON.stringify(s.player.travel)===original,returnBlocked=FB.travelReturnEligible(s)!==true;
    s.player.travel=null;T.withdraw(s,id,s.player.charId,true);e.participants=[];
    s.turn=e.startTurn+2;
    return {tournament:tournament.ok,ordinary:ordinary,local:!!local,unchanged:unchanged,returnBlocked:returnBlocked,late:T.entry(s,id,s.player.charId,'archery').ok,watch:T.entry(s,id,s.player.charId,'watch').ok};
  },id);
  expect(r.tournament).toBe(true);expect(r.ordinary).not.toBe(true);expect(r.local).toBe(true);expect(r.unchanged).toBe(true);expect(r.returnBlocked).toBe(true);expect(r.late).toBe(false);expect(r.watch).toBe(true);
});

test('closure gives three days for onward travel while preserving home and the ordinary cooldown',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),home=s.player.provinceId;
    s.player.cooldowns.take_road=-123;
    T.depart(s,T.travelQuote(s,id));
    for(var i=0;i<100&&s.player.travel.phase!=='arrived';i++)FB.travelTick(s);
    s.turn=e.closeTurn;T.tick(s);var atClose=s.player.travel.phase;
    s.turn=e.closeTurn+2;T.tick(s);var second=s.player.travel.phase;
    s.turn=e.closeTurn+3;T.tick(s);
    return {atClose:atClose,second:second,third:s.player.travel.phase,home:s.player.provinceId,savedHome:s.player.travel.homeId,cooldown:s.player.cooldowns.take_road,original:home};
  },id);
  expect(r.atClose).toBe('arrived');expect(r.second).toBe('arrived');expect(r.third).toBe('return');expect(r.home).toBe(r.original);expect(r.savedHome).toBe(r.original);expect(r.cooldown).toBe(-123);
});

test('onward booking requotes from the venue and rejects arbitrary destinations',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const localId=await bookGames(page,ids,false,{startTurn:120});
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),home=s.player.provinceId;
    T.depart(s,T.travelQuote(s,e.id));
    for(var i=0;i<100&&s.player.travel.phase!=='arrived';i++)FB.travelTick(s);
    var q=T.travelQuote(s,args.next),origin=q.originId,reserve=q.oldReserve;
    var ok=T.depart(s,q),unknown=T.travelQuote(s,'invented').ok;
    return {ok:ok,unknown:unknown,origin:origin,venue:e.provinceId,reserve:reserve,home:home,savedHome:s.player.travel.homeId,destination:s.player.travel.destinationId};
  },{id:id,next:localId});
  expect(r.ok).toBe(true);expect(r.unknown).toBe(false);expect(r.origin).toBe(r.venue);expect(r.reserve).toBeGreaterThan(0);expect(r.savedHome).toBe(r.home);expect(r.destination).toBe(r.home);
});

test('frozen fields and bounded contacts survive serialization; old saves initialize additively',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id);
    T.enter(s,T.entry(s,id,s.player.charId,'archery'));
    var field=JSON.stringify(e.contests),funding=JSON.stringify(e.funding),rng=FB.getRngState();
    var packed=JSON.parse(FB.save.serialize());FB.save.restore(packed);s=FB.state;e=T.get(s,id);
    var equal=field===JSON.stringify(e.contests)&&funding===JSON.stringify(e.funding),contacts=s.player.circuit.contacts.length;
    delete s.tournaments;delete s.player.circuit;T.ensure(s);
    return {equal:equal,contacts:contacts,empty:T.active(s).length,samples:s.tournaments.samples,version:s.tournaments.version,rng:FB.getRngState()===rng};
  },id);
  expect(r.equal).toBe(true);expect(r.contacts).toBeLessThanOrEqual(8);expect(r.empty).toBe(0);expect(r.samples).toEqual({});expect(r.version).toBe(1);expect(r.rng).toBe(true);
});


test('missed opening refunds unused fees and forfeits without injury; later company remains available',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),c=s.chars[s.player.charId];
    var item=FB.grantItem(s,'padded_jack',{quality:'plain'});FB.equipItem(s,c.id,'body',item);
    var before=s.player.gold,p=T.enter(s,T.entry(s,id,c.id,'melee')),health=c.health;
    if(!p)throw new Error('Equipped entrant must be accepted.');
    s.turn=e.startTurn+1;T.tick(s);
    var refunded=s.player.gold,unhurt=c.health===health;
    s.player.provinceId=e.provinceId;
    var social=T.social(s,id,'introductions'),round=T.roundPreview(s,id,c.id,'balanced');
    T.tick(s);
    return {before:before,refunded:refunded,last:s.player.gold,unhurt:unhurt,missed:p.missed,round:round.ok,social:social,escrow:p.feeUnused+p.forfeit};
  },id);
  expect(r.refunded).toBe(r.before);expect(r.last).toBe(r.refunded);expect(r.unhurt).toBe(true);
  expect(r.missed).toBe(true);expect(r.round).toBe(false);expect(r.social).toBe(true);expect(r.escrow).toBe(0);
});

test('a qualified successor retains funded hosting, but cannot inherit a predecessor round',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false,{annual:true,ceiling:1000000});
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),old=s.player.charId;
    var p=T.enter(s,T.entry(s,id,old,'archery')),funding=JSON.stringify(e.funding),gold=s.player.gold;
    var heir=JSON.parse(JSON.stringify(s.chars[old]));heir.id='games_fixture_heir';heir.name='Heir';heir.dead=false;
    s.chars[heir.id]=heir;s.chars[old].dead=true;s.player.dead=true;
    var heirsOf=FB.heirsOf;FB.heirsOf=function(){return[heir];};
    try{T.reconcile(s);}finally{FB.heirsOf=heirsOf;}
    var waiting=e.awaitingSuccessor&&e.status==='announced';
    s.player.charId=heir.id;s.player.dead=false;
    T.reconcile(s);
    var retained=e.status,owner=e.hostId,annual=s.tournaments.annual[0].hostId;
    var oldEntry=T.roundPreview(s,id,old,'balanced');
    T.cancel(s,id,heir.id);
    return {waiting:waiting,retained:retained,owner:owner,heir:heir.id,annual:annual,entry:p.status,oldReady:!!(oldEntry&&oldEntry.ok),frozen:funding===JSON.stringify(e.funding),before:gold,after:s.player.gold,refund:e.refunded,circuit:s.player.circuit.charId};
  },id);
  expect(r.waiting).toBe(true);expect(r.retained).toBe('announced');expect(r.owner).toBe(r.heir);expect(r.annual).toBe(r.heir);
  expect(r.entry).toBe('interrupted');expect(r.oldReady).toBe(false);expect(r.frozen).toBe(true);
  expect(r.after-r.before).toBeCloseTo(r.refund);expect(r.circuit).toBe(r.heir);
});

test('losing ownership cancels immediately and releases all reserved capacity',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),gold=s.player.gold;
    s.holder[e.provinceId]=args.ids.enemy;s.owner[e.provinceId]=args.ids.enemy;FB.invalidateRealmCache();
    T.reconcile(s);
    return {status:e.status,refund:s.player.gold-gold,expected:e.refunded,occupied:T.capacity(s,e.provinceId,'local').county};
  },{id:id,ids:ids});
  expect(r.status).toBe('cancelled');expect(r.refund).toBeCloseTo(r.expected);expect(r.occupied).toEqual([]);
});

test('severe contest wounds use health effects and prevent further rounds',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),c=s.chars[s.player.charId];
    T.enter(s,T.entry(s,id,c.id,'archery'));
    var rng=FB.rng,ri=FB.ri;
    // Force the disclosed severe subset, without replacing the resolution engine.
    FB.rng=function(){return 0;};FB.ri=function(a){return a;};
    try{
      s.turn=e.startTurn+1;T.resolveRound(s,T.roundPreview(s,id,c.id,'balanced'));var first=c.health;
      s.turn=e.startTurn+3;T.resolveRound(s,T.roundPreview(s,id,c.id,'balanced'));
      var next=T.roundPreview(s,id,c.id,'balanced');
      return {first:first,last:c.health,ready:!!(next&&next.ok)};
    }finally{FB.rng=rng;FB.ri=ri;}
  },id);
  expect(r.first).toBe(4);expect(r.last).toBe(0);expect(r.ready).toBe(false);
});

test('melee assistance uses shared team powers and a winning share pays once',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),c=s.chars[s.player.charId];c.skills.mar=50;
    var item=FB.grantItem(s,'padded_jack',{quality:'plain'});FB.equipItem(s,c.id,'body',item);
    T.enter(s,T.entry(s,id,c.id,'melee'));
    var rng=FB.rng,ri=FB.ri;FB.rng=function(){return 0.4;};FB.ri=function(a){return a;};
    try{
      var delta;
      for(var i=0;i<3;i++){
        s.turn=e.startTurn+1+i*2;
        var balanced=T.roundPreview(s,id,c.id,'balanced'),assist=T.roundPreview(s,id,c.id,'assist');
        delta=assist.power-balanced.power;
        if(!T.resolveRound(s,assist))throw new Error('Assisted round refused.');
      }
      return {delta:delta,rounds:e.contests.melee.round,winner:e.contests.melee.winner,player:c.id,paid:e.paid['prize:melee'],share:Math.floor(e.funding.prizes.headline/4),remaining:e.remaining.headline};
    }finally{FB.rng=rng;FB.ri=ri;}
  },id);
  expect(r.delta).toBeCloseTo(0.25);expect(r.rounds).toBe(3);expect(r.winner).toBe(r.player);expect(r.paid).toBe(r.share);expect(r.remaining).toBe(0);
});


test('a reachable onward registration preserves the return reserve until withdrawn',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const next=await bookGames(page,ids,false,{startTurn:179});
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id);
    T.depart(s,T.travelQuote(s,e.id));
    for(var i=0;i<100&&s.player.travel.phase!=='arrived';i++)FB.travelTick(s);
    var p=T.enter(s,T.entry(s,args.next,s.player.charId,'watch'));
    if(!p)throw new Error('Onward registration failed.');
    s.turn=e.closeTurn+3;T.tick(s);var waiting=s.player.travel.phase,reserve=s.player.travel.returnReserve;
    T.withdraw(s,args.next,s.player.charId,true);T.tick(s);
    return {waiting:waiting,reserve:reserve,after:s.player.travel.phase};
  },{id:id,next:next});
  expect(r.waiting).toBe('arrived');expect(r.reserve).toBeGreaterThan(0);expect(r.after).toBe('return');
});

test('closed summaries, detached contacts and obsolete full editions remain bounded',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id);
    s.tournaments.summaries=Array.from({length:40},function(_,i){return{id:'old'+i};});
    s.player.circuit.contacts=Array.from({length:20},function(_,i){return{id:'contact'+i,name:'Contact '+i};});
    T.ensure(s);T.cancel(s,id,s.player.charId);
    var summaries=s.tournaments.summaries.length,contacts=s.player.circuit.contacts.length,retained=T.referencesCharacter(s,s.player.charId);
    s.turn=e.closeTurn+4;T.tick(s);
    return {summaries:summaries,contacts:contacts,retained:retained,full:T.get(s,id)};
  },id);
  expect(r.summaries).toBe(32);expect(r.contacts).toBe(8);expect(r.retained).toBe(false);expect(r.full).toBeNull();
});


test('death and succession cancellation override a wartime funded return',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments;
    T.depart(s,T.travelQuote(s,args.id));
    s.player.travel.currentId=s.player.travel.remainingRoute.shift();
    s.wars={fixture:{id:'fixture',status:'active',attacker:'player',defender:args.ids.enemy,occupations:{}}};
    T.reconcile(s);var forced=s.player.travel.phase;
    // Both lifecycle paths use this exact silent cancellation before changing the head.
    FB.travelCancel(s,'',true);
    return {forced:forced,travel:s.player.travel};
  },{id:id,ids:ids});
  expect(r.forced).toBe('return');expect(r.travel).toBeNull();
});
