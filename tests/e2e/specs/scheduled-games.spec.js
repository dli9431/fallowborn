'use strict';
const { dependsOnRuntime } = require('../support/runtime-dependencies');
dependsOnRuntime(__filename, ['index.html','data/tournaments.js','data/events_tournament.js','data/travel.js',
  'data/technology.js','js/tournaments.js','js/travel.js','js/actions.js','js/events.js','js/main.js',
  'js/lordships.js','js/treasury.js','js/holywar.js','js/wars.js','js/rebellions.js','js/save.js','js/model.js']);
const { test, expect } = require('../support/fixture');
const { startGames, bookGames } = require('../support/game/tournaments');

test('floors, multipliers, rounding and allocation conserve the frozen budget', async function ({page}, info) {
  await startGames(page,info);
  const result = await page.evaluate(function () {
    return ['local','regional','grand'].map(function (scale) {
      return [FB.tournaments.funding(scale,0),FB.tournaments.funding(scale,1301)];
    });
  });
  expect(result.map(row=>row[0].total)).toEqual([500,2500,10000]);
  expect(result.map(row=>row[1].total)).toEqual([2625,5225,10425]);
  for (const pair of result) for (const q of pair) {
    expect(q.services).toBe(Math.floor(q.total*0.3));
    expect(q.preparation + q.services + Object.values(q.prizes).reduce((a,b)=>a+b,0)).toBe(q.total);
  }
});

test('income uses four recurring samples and excludes focus, cash gifts and campaign spending', async function ({page},info) {
  const ids = await startGames(page,info);
  const r = await page.evaluate(function (ids) {
    var s=FB.state,T=FB.tournaments,first=T.income(s,ids.id);
    s.player.gold += 54321; s.player.focus='rest';
    var second=T.income(s,ids.id);
    s.tournaments.samples[ids.id]=[{season:0,net:1000},{season:1,net:2000},{season:2,net:3000},{season:3,net:4000}];
    var history=T.income(s,ids.id);
    s.player.war={enemy:ids.enemy,strength:1};
    var war=T.projection(s,ids.id);
    s.player.war=null;
    for(var i=0;i<6;i++){s.turn+=90;T.samplePlayer(s);}
    return {first:first,second:second,history:history,war:war,length:s.tournaments.samples[ids.id].length};
  },ids);
  expect(r.first.samples).toEqual([]);
  expect(r.first.reference).toBe(Math.max(0,r.first.projection));
  expect(r.second.projection).toBe(r.first.projection);
  expect(r.history.average).toBe(2500);
  expect(r.history.reference).toBe(Math.max(2500,r.history.projection));
  expect(r.war).toBe(r.first.projection);
  expect(r.length).toBe(4);
});

test('booking is atomic, freezes promises and refunds reserved funds only once', async function ({page},info) {
  const ids=await startGames(page,info);
  const r=await page.evaluate(function (ids) {
    var s=FB.state,T=FB.tournaments,spec={hostId:ids.id,provinceId:ids.home,settlement:0,scale:'local',programme:'martial',startTurn:s.turn+90};
    var q=T.quote(s,spec),before=s.player.gold;
    s.player.gold++;
    var stale=T.book(s,q),afterStale=s.player.gold;
    q=T.quote(s,spec);var e=T.book(s,q),frozen=JSON.stringify(e.funding),paid=s.player.gold;
    s.tournaments.samples[ids.id]=[{season:0,net:90000}];
    var same=frozen===JSON.stringify(e.funding),second=T.book(s,q);
    var cancelled=T.cancel(s,e.id,ids.id),after=s.player.gold,again=T.cancel(s,e.id,ids.id);
    return {stale:stale,afterStale:afterStale,before:before,total:q.funding.total,preparation:q.funding.preparation,
      paid:paid,same:same,second:second,cancelled:cancelled,after:after,again:again,last:s.player.gold,active:T.active(s).length};
  },ids);
  expect(r.stale).toBe(false); expect(r.afterStale).toBe(r.before+1);
  expect(r.paid).toBe(r.before+1-r.total); expect(r.same).toBe(true); expect(r.second).toBe(false);
  expect(r.cancelled).toBe(true); expect(r.again).toBe(false); expect(r.active).toBe(0);
  expect(r.after).toBe(r.before+1-r.preparation); expect(r.last).toBe(r.after);
});

for(const [count,limits] of [[5,[1,1,1]],[15,[3,1,1]],[30,[6,3,2]],[45,[9,4,3]]]) {
  test('de jure capacity with '+count+' counties is nested and conquest-independent',async function ({page},info){
    await startGames(page,info);
    const r=await page.evaluate(function(count){
      var s=FB.state,T=FB.tournaments,world=FB.world.byId,duchies=FBDATA.duchies,kingdoms=FBDATA.kingdoms;
      FB.world.byId={};FBDATA.duchies={fixture:{kingdom:'fixture'}};FBDATA.kingdoms={fixture:{}};
      for(var i=0;i<count;i++)FB.world.byId['county'+i]={id:'county'+i,duchy:'fixture',culture:'frankish',religion:'catholic'};
      try{
        var first=T.capacity(s,'county0','grand');
        s.tournaments.events=[{id:'occupied',status:'announced',scale:'grand',provinceId:'county0',closeTurn:100}];
        var used=T.capacity(s,'county1','grand');
        s.owner.county0='conqueror';s.holder.county1='fragment';
        var after=T.capacity(s,'county1','grand');
        var county=T.capacity(s,'county0','local');
        return {first:first,used:used,after:after,county:county};
      }finally{FB.world.byId=world;FBDATA.duchies=duchies;FBDATA.kingdoms=kingdoms;s.tournaments.events=[];}
    },count);
    expect(r.first.limits).toEqual(limits);expect(r.used.used).toEqual([1,1,1]);
    expect(r.after).toEqual(r.used);expect(r.county.ok).toBe(false);
    expect(r.used.occupants[0]).toMatchObject({id:'occupied',closeTurn:100});
  });
}

test('frontier and worldwide limits include announced editions and cancel releases them',async function({page},info){
  await startGames(page,info);
  const r=await page.evaluate(function(){
    var s=FB.state,T=FB.tournaments,old=FB.world.byId;
    FB.world.byId={a:{id:'a',culture:'frankish',religion:'catholic'},b:{id:'b',culture:'frankish',religion:'catholic'},c:{id:'c',culture:'frankish',religion:'catholic'}};
    try{
      var regional=T.capacity(s,'a','regional');
      s.tournaments.events=[{id:'one',status:'announced',provinceId:'a',scale:'local'},{id:'two',status:'running',provinceId:'b',scale:'local'}];
      var full=T.capacity(s,'c','local');s.tournaments.events[0].status='cancelled';
      var released=T.capacity(s,'c','local');
      s.tournaments.events=Array.from({length:64},function(_,i){return{id:String(i),status:'announced',provinceId:'missing'+i,scale:'local'};});
      return {regional:regional.ok,full:full.ok,released:released.ok,world:T.capacity(s,'c','local').ok};
    }finally{FB.world.byId=old;s.tournaments.events=[];}
  });
  expect(r).toEqual({regional:false,full:false,released:true,world:false});
});

test('read-only quotes, calendar, admissions and tactic previews preserve state and RNG',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id);
    T.enter(s,T.entry(s,e.id,s.player.charId,'archery'));
    var state=JSON.stringify(s),rng=FB.getRngState();
    T.quote(s,{hostId:s.player.charId,provinceId:args.ids.home,settlement:0,scale:'local',programme:'martial',startTurn:s.turn+100});
    ['upcoming','local','reachable','bookings'].forEach(function(f){T.list(s,f);});
    T.entry(s,e.id,s.player.charId,'carrying');T.roundPreview(s,e.id,s.player.charId,'aggressive');T.travelQuote(s,e.id);
    return {same:state===JSON.stringify(s),rng:rng===FB.getRngState()};
  },{ids:ids,id:id});
  expect(r).toEqual({same:true,rng:true});
});

for(const scope of ['personal','home','liege','host','venue','holy','rebellion']){
  test(scope+' war interrupts only the applicable commitments',async function({page},info){
    const ids=await startGames(page,info),id=await bookGames(page,ids,true);
    const r=await page.evaluate(function(args){
      var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),ids=args.ids,scope=args.scope,oldHolder=s.holder[e.provinceId];
      var p=T.enter(s,T.entry(s,e.id,ids.id,'watch'));
      if(!p)throw new Error('Visitor entry failed');
      if(scope==='personal')s.player.flags.on_campaign=true;
      else if(scope==='holy')s.greatHolyWar={id:'fixture',phase:'active',participants:{attackers:[{realm:'player',sovereign:true}],defenders:[]}};
      else if(scope==='rebellion')s.rebellions.groups.fixture={id:'fixture',target:'player',faction:'rebels',counties:{}};
      else{
        var rid=scope==='host'?ids.hostRealm:'player';
        if(scope==='liege'){s.player.liege=ids.enemy;s.realms.player.liege=ids.enemy;rid=ids.enemy;}
        if(scope==='venue'){s.holder[e.provinceId]=ids.enemy;rid=ids.enemy;}
        s.wars={fixture:{id:'fixture',status:'active',attacker:rid,defender:'unrelated',occupations:{}}};
      }
      var blocked=T.eligibility(s,ids.id,e).ok;
      T.reconcile(s);var after=e.status,participant=p.status,gold=s.player.gold;
      s.wars={};s.greatHolyWar=null;s.rebellions.groups={};s.player.flags.on_campaign=false;
      s.holder[e.provinceId]=oldHolder;
      T.reconcile(s);
      return {blocked:blocked,edition:after,participant:participant,peace:T.eligibility(s,ids.id,e).ok,still:e.status,gold:gold,afterGold:s.player.gold};
    },{ids:ids,id:id,scope:scope});
    expect(r.blocked).toBe(false);expect(r.participant).toBe('interrupted');
    expect(r.edition).toBe(scope==='host'||scope==='venue'?'cancelled':'announced');
    expect(r.still).toBe(r.edition);expect(r.peace).toBe(true);expect(r.afterGold).toBe(r.gold);
  });
}

test('holy-war preparation, threats and truces leave peacetime games available',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state;
    s.greatHolyWar={phase:'preparation',participants:{attackers:[{realm:'player',sovereign:true}],defenders:[]}};
    s.truces={fixture:s.turn+360};s.threats={fixture:true};
    return FB.tournaments.eligibility(s,s.player.charId,FB.tournaments.get(s,id));
  },id);
  expect(r.ok).toBe(true);
});

test('annual intentions have no capacity, respect ceilings and can stop without cancelling a paid edition',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false,{annual:true,ceiling:1000000});
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),a=s.tournaments.annual[0];
    T.cancel(s,id,s.player.charId);var capacity=T.active(s).length;
    a.ceiling=0;s.turn=a.nextTurn-60;var gold=s.player.gold;T.tick(s);
    var skipped=T.active(s).length,next=a.nextTurn,afterSkip=s.player.gold;
    a.ceiling=1000000;s.turn=a.nextTurn-60;s.date.season=0;s.date.day=31;T.tick(s);
    var funded=T.active(s).length;
    T.stopAnnual(s,s.player.charId);
    return {capacity:capacity,skipped:skipped,goldAtSkip:gold,afterSkip:afterSkip,next:next,funded:funded,active:T.active(s).length,annual:s.tournaments.annual.length};
  },id);
  expect(r.capacity).toBe(0);expect(r.skipped).toBe(0);expect(r.funded).toBe(1);expect(r.active).toBe(1);expect(r.annual).toBe(0);
  expect(r.afterSkip).toBe(r.goldAtSkip);
});

test('a visitor war during outbound travel refunds entry and returns physically without teleportation',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id);
    var entered=T.enter(s,T.entry(s,e.id,s.player.charId,'archery'));
    var quote=T.travelQuote(s,e.id);if(!T.depart(s,quote))throw new Error(quote.reasons.join(' '));
    var t=s.player.travel;
    t.currentId=t.remainingRoute.shift();t.visited.push(t.currentId);var away=t.currentId;
    s.wars={fixture:{id:'fixture',status:'active',attacker:'player',defender:args.ids.enemy,occupations:{}}};
    T.reconcile(s);var returned=t.phase,physical=t.currentId,allowance=t.returnReserve;
    for(var i=0;i<200&&s.player.travel;i++)FB.travelTick(s);
    return {away:away,physical:physical,home:args.ids.home,phase:returned,reserve:allowance,journey:s.player.travel,entry:entered.status,event:e.status};
  },{ids:ids,id:id});
  expect(r.away).not.toBe(r.home);expect(r.physical).toBe(r.away);expect(r.phase).toBe('return');expect(r.reserve).toBe(0);
  expect(r.journey).toBeNull();expect(r.entry).toBe('interrupted');expect(r.event).toBe('announced');
});

test('three scored rounds pay once, preserve save state and bound skill gains',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),c=s.chars[s.player.charId];
    c.skills.mar=50;var p=T.enter(s,T.entry(s,id,c.id,'archery')),before=FB.skillOf(c,'mar');
    FB.setRngState(72931);
    for(var i=0;i<3;i++){
      s.turn=e.startTurn+1+i*2;
      var q=T.roundPreview(s,id,c.id,'balanced');
      if(!T.resolveRound(s,q))throw new Error('Round refused');
      if(T.resolveRound(s,q)!==false)throw new Error('Duplicate round resolved');
    }
    var gold=s.player.gold,paid=e.paid['prize:archery'];
    var encoded=FB.save.serialize();FB.save.restore(JSON.parse(encoded));s=FB.state;e=T.get(s,id);p=T.participant(e,s.player.charId);
    var restoredGold=s.player.gold;s.turn=e.closeTurn;T.tick(s);var skill=FB.skillOf(s.chars[s.player.charId],'mar');
    T.tick(s);
    return {names:e.contests.archery.entrants.length,rounds:e.contests.archery.results.length,paid:paid,purse:e.funding.prizes.archery,gold:gold,restored:restoredGold,skill:skill,before:before,twice:FB.skillOf(s.chars[s.player.charId],'mar'),won:p.won};
  },id);
  expect(r.names).toBe(8);expect(r.rounds).toBe(3);expect(r.won).toBe(true);expect(r.paid).toBe(r.purse);
  expect(r.restored).toBe(r.gold);expect(r.skill-r.before).toBeLessThanOrEqual(1);expect(r.twice).toBe(r.skill);
});


test('AI ruler scales use realm rank and share atomic world capacity with the player',async function({page},info){
  const ids=await startGames(page,info);
  const r=await page.evaluate(function(ids){
    var s=FB.state,T=FB.tournaments,old=FB.settlementsOf,r=s.realms[ids.hostRealm];
    r.rank=3;r.treasury.gold=1000000;
    FB.settlementsOf=function(state,pid){var rows=old(state,pid);if(pid===ids.venue){rows=rows.map(function(row){return Object.assign({},row,{kind:'city'});});}return rows;};
    try{
      var spec={hostId:ids.host,provinceId:ids.venue,settlement:0,scale:'grand',programme:'martial',startTurn:s.turn+90};
      var q=T.quote(s,spec),before=r.treasury.gold,playerGold=s.player.gold;
      if(!q.ok)throw new Error(q.reasons.join(' '));
      for(var i=0;i<64;i++)s.tournaments.events.push({id:'fixture'+i,status:'announced',provinceId:'outside'+i,scale:'local',closeTurn:s.turn+100});
      var blocked=T.book(s,q),untouched=r.treasury.gold;
      s.tournaments.events=[];q=T.quote(s,spec);var e=T.book(s,q);
      return {blocked:blocked,before:before,untouched:untouched,total:q.funding.total,after:r.treasury.gold,scale:e.scale,used:T.capacity(s,ids.venue,'local').used,playerGold:playerGold,playerAfter:s.player.gold};
    }finally{FB.settlementsOf=old;}
  },ids);
  expect(r.blocked).toBe(false);expect(r.untouched).toBe(r.before);expect(r.after).toBe(r.before-r.total);
  expect(r.scale).toBe('grand');expect(r.used).toEqual([1,1,1]);expect(r.playerAfter).toBe(r.playerGold);
});

test('war at annual renewal skips without payment or resurrection at peace',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false,{annual:true,ceiling:1000000});
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),a=s.tournaments.annual[0];
    T.cancel(s,e.id,s.player.charId);
    s.turn=a.nextTurn-60;s.date.season=0;s.date.day=31;
    s.wars={fixture:{id:'fixture',status:'active',attacker:'player',defender:args.ids.enemy,occupations:{}}};
    var gold=s.player.gold,next=a.nextTurn;T.tick(s);var skipped=a.nextTurn;
    s.wars={};T.tick(s);
    return {gold:gold,after:s.player.gold,next:next,skipped:skipped,active:T.active(s).length,annual:s.tournaments.annual.length};
  },{id:id,ids:ids});
  expect(r.after).toBe(r.gold);expect(r.skipped).toBe(r.next+360);expect(r.active).toBe(0);expect(r.annual).toBe(1);
});

test('siege occupancy blocks all attendance tracks and removes pending jobs',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,true);
  const r=await page.evaluate(function(args){
    var s=FB.state,T=FB.tournaments,e=T.get(s,args.id),p=T.enter(s,T.entry(s,e.id,s.player.charId,'carrying'));
    var occupations={};occupations[e.provinceId]={occupied:false,progress:1};
    s.wars={fixture:{id:'fixture',status:'active',attacker:'unrelated_a',defender:'unrelated_b',occupations:occupations}};
    var tracks=['watch','perform','trade','carrying'].map(function(track){return T.entry(s,e.id,s.player.charId,track).reasons;});
    T.reconcile(s);
    return {tracks:tracks,status:e.status,entry:p.status,committed:e.serviceCommitted,paid:p.paid};
  },{id:id,ids:ids});
  expect(r.tracks.every(reasons=>reasons.some(reason=>reason.includes('besieged')))).toBe(true);
  expect(r.status).toBe('cancelled');expect(r.entry).toBe('interrupted');expect(r.committed).toBe(0);expect(r.paid).toBe(0);
});

test('actual world definition changes recalculate capacity while funded editions remain grandfathered',async function({page},info){
  const ids=await startGames(page,info),id=await bookGames(page,ids,false);
  const r=await page.evaluate(function(id){
    var s=FB.state,T=FB.tournaments,e=T.get(s,id),world=FB.world.byId,kept={};kept[e.provinceId]=world[e.provinceId];
    FB.world.byId=kept;
    try{
      var cap=T.capacity(s,e.provinceId,'local'),status=e.status;
      return {count:cap.counties,limits:cap.limits,used:cap.used,status:status,booking:cap.ok};
    }finally{FB.world.byId=world;}
  },id);
  expect(r.count).toBe(1);expect(r.limits).toEqual([1,1,1]);expect(r.used).toEqual([1,0,0]);expect(r.status).toBe('announced');expect(r.booking).toBe(false);
});
