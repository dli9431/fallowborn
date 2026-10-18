'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-story-harbor.json'),
  upland:require('../fixtures/authoring/expedition-story-upland.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/technology.js','data/units.js',
  'js/story_expedition_program.js','js/story_expedition_preparation.js','js/expedition_programs.js','js/stories.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/government_selection.js',
  'js/governments.js','js/authority.js','js/home_authority.js','js/treasury.js','js/population.js','js/market.js',
  'js/armies.js','js/federates.js','js/logistics.js','js/holywar.js','js/religion.js','js/wars.js',
  'js/world.js','js/mods.js','js/bookmark_setup.js','js/starts.js','js/model.js','js/station.js','js/util.js',
  'js/save.js','js/save_v4.js','js/ui_misc.js','js/ui_panels.js','js/ui_mobile.js','js/main.js']);

async function begin(page,info,label,modified) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(modified ? {name:'expedition-story-'+label+'.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(modified))} : path.resolve(__dirname,'../fixtures/authoring/expedition-story-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    const prefix=label==='harbor' ? 'harbor' : 'dune';
    window.programCase={id:label+'_story_program',preparationId:label+'_preparation',
      rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',origin:prefix+(label==='harbor' ? '_quay' : '_well'),
      faith:prefix+'_belief',head:prefix+(label==='harbor' ? '_commune' : '_oasis'),target:prefix+'_country',
      record:function (s) {return s.stories[this.id];},
      prep:function (s) {return s.stories[this.preparationId];},
      actor:function (s) {return this.record(s).actorId;},
      next:function (s) {s.turn++;s.date.day=s.turn+1;},
      run:function (s,action,actorId,stepId) {return FB.expeditionStoryPrograms.commit(s,
        FB.expeditionStoryPrograms.review(s,this.id,action,actorId || this.actor(s),stepId));},
      ready:function (s) {
        const provider=this.prep(s).provider.characterId;
        if (!this.run(s,'authorize',provider)) return false;
        this.next(s);if (!this.run(s,'grant',provider)) return false;
        this.next(s);return this.run(s,'form');
      },
      assembled:function (s) {
        const d=FB.campaignBookmark(s).realms.find(function (r) {return r.id===this.rid;},this);
        const count=d.mobile.expeditionProgram.steps[0].terms.waypoints.length;
        for (let i=0;i<count;i++) {this.next(s);if (!this.run(s,'step',null,'assembly')) return false;}
        this.next(s);return true;
      },
      launch:function (s) {
        const old=s.player.charId;s.player.charId=this.actor(s);
        const called=FB.callGreatHolyWar(s,this.faith,this.target,this.head);s.player.charId=old;
        if (!called || !FB.commitMobileGreatHolyWar(s,FB.mobileGreatHolyWarReview(s,this.rid,this.actor(s),'join'))) return false;
        FB.joinGreatHolyWar(s,'attackers',this.head);s.greatHolyWar.launchTurn=s.turn;FB.greatHolyWarTick(s);
        return s.greatHolyWar.phase==='active';
      },
      owners:function (s) {return JSON.stringify([FB.mobile.row(s,this.rid),FB.mobile.host(s,this.rid),
        FB.mobile.migration(s,this.rid),s.population,s.market,s.realms,s.owner,s.holder,s.player.gold,s.greatHolyWar]);}
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' ordinary import attaches finite original references and no competing owner',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,C=programCase,t=C.record(s),before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=FB.expeditionStoryPrograms.review(s,C.id,'form',C.actor(s));
      return {status:t.status,definition:FB.validateBookmark(FB.campaignBookmark(s)).length,
        noHost:!FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid),
        noDuplicate:!('steps' in t) && !('cursor' in t) && !('receipts' in t),actor:C.actor(s)===C.prep(s).bindings.find(function (b) {
          return b.memberId===FB.campaignBookmark(s).realms.find(function (r) {return r.id===C.rid;}).mobile.opening.leaderMemberId;
        }).characterId,denied:!q.allowed,pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        tech:FBDATA.techImpactReviews.features.expedition_story_composition.mode};
    });
    expect(result).toEqual({status:'preparing',definition:0,noHost:true,noDuplicate:true,actor:true,denied:true,pure:true,tech:'none'});
  });

  test(label+' preparation and direct owner APIs share one attempted daily action and form only once',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=programCase,s=FB.state,W=FB.expeditionStoryPrograms,P=FB.expeditionPreparation,
        source=s.population.counties[C.origin].count,provider=C.prep(s).provider.characterId;
      const q=W.review(s,C.id,'authorize',provider),first=W.commit(s,q),before=JSON.stringify(s),
        repeated=W.commit(s,q),direct=P.commit(s,P.review(s,C.preparationId,'grant',provider)),same=before===JSON.stringify(s);
      C.next(s);const grant=C.run(s,'grant',provider);C.next(s);
      const oldPeople=Object.keys(s.chars).sort(),privateGold=s.player.gold,land=JSON.stringify([s.owner,s.holder]),formed=C.run(s,'form'),t=C.record(s);
      if (!formed) return {first:first,grant:grant,formed:formed};
      const owner=FB.mobile.row(s,C.rid),f=C.prep(s).formed,a=FB.mobile.host(s,C.rid),snapshot=C.owners(s);
      C.next(s);const again=C.run(s,'form');
      return {first:first,repeated:repeated,direct:direct,same:same,grant:grant,formed:formed,again:again,
        active:t.status==='active',reference:t.formation.hostId===f.hostId && t.formation.migrationId===f.migrationId &&
          t.formation.leaderGeneration===f.generation,one:s.armies.filter(function (a) {return a.realm===C.rid;}).length===1,
        actual:owner.accounting.initial===0 && owner.accounting.arrivals===FB.mobile.total(s,C.rid) &&
          Math.abs(a.mobileFood+owner.food-f.food)<1e-8,withdrawn:source-s.population.counties[C.origin].count,
        noGrant:land===JSON.stringify([s.owner,s.holder]) && privateGold===s.player.gold &&
          JSON.stringify(oldPeople)===JSON.stringify(Object.keys(s.chars).sort()),unchanged:snapshot===C.owners(s)};
    });
    expect(result).toEqual({first:true,repeated:false,direct:false,same:true,grant:true,formed:true,again:false,active:true,
      reference:true,one:true,actual:true,withdrawn:label==='harbor' ? 0 : 1600,noGrant:true,unchanged:true});
  });

  test(label+' pending and formed matching restore retain real owner state without replay',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=programCase,facts=function () {return JSON.stringify([C.record(FB.state),C.prep(FB.state),C.owners(FB.state)]);};
      const pending=facts();FB.save.restore(JSON.parse(FB.save.serialize()));const pendingSame=pending===facts();
      const formed=C.ready(FB.state);if (!formed) return {formed:formed};
      const active=facts(),rng=FB.getRngState(),uid=FB.getUidCounter(),save=FB.save.serialize();
      FB.save.restore(JSON.parse(save));FB.stories.start(FB.state);FB.mobile.initialize(FB.state,FB.campaignBookmark(FB.state).realms);
      return {formed:formed,pending:pendingSame,active:active===facts(),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
    });
    expect(result).toEqual({formed:true,pending:true,active:true,rng:true,uid:true});
  });

  test(label+' refusal or expiry before formation closes quietly without a host or withdrawal',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const C=programCase,base=JSON.parse(JSON.stringify(FB.state));
      return ['refuse','stop','expired'].map(function (action) {
        const s=JSON.parse(JSON.stringify(base)),before=C.owners(s),story=FB.stories.get(C.id);
        if (action==='expired') {s.turn=C.prep(s).endTurn;s.date.day=s.turn+1;FB.stories.get(C.preparationId).day(s,C.prep(s));story.day(s,C.record(s));}
        else C.run(s,action);
        story.validate(C.record(s),s);
        return C.record(s).status==='closed' && !FB.mobile.row(s,C.rid) && !FB.mobile.host(s,C.rid) &&
          C.owners(s)===before && C.prep(s).status==='closed' && C.prep(s).consumed.length===0;
      });
    });
    expect(result).toEqual([true,true,true]);
  });
}

test('detached JSON rejects unsupported composition, foreign references and excessive waypoint totals without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function(m,d,p){p.programId='missing';},function(m,d,p){p.commandId='missing';},
      function(m,d,p){p.preparationId='missing';},function(m,d,p){p.requires=[];},function(m,d,p){p.realmId='harbor_commune';},
      function(m,d,p){p.termDays=1441;},function(m,d,p){p.termDays--;},function(m,d,p){p.ai='conquer';},
      function(m,d,p){p.effects={gold:100};},function(m,d,p){m.bookmarks.harbor_world.stories.pop();},
      function(m,d,p){const a=d.mobile.expeditionProgram.steps[0];a.terms.waypoints=Array(16).fill('harbor_quay');
        for (let i=0;i<2;i++) {const b=JSON.parse(JSON.stringify(a));b.id='extra_'+i;d.mobile.expeditionProgram.steps.push(b);}},
      function(m,d,p){const b=JSON.parse(JSON.stringify(p));b.id='duplicate_program';m.storyInstances[b.id]=b;m.bookmarks.harbor_world.stories.push(b.id);}];
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const rejected=changes.map(function (change) {const m=JSON.parse(JSON.stringify(source)),d=m.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;});
      change(m,d,m.storyInstances.harbor_story_program);const input=JSON.stringify(m);return FB.mods.validate(m).length>0 && input===JSON.stringify(m);});
    const plain=JSON.parse(JSON.stringify(source));delete plain.storyInstances.harbor_story_program;plain.bookmarks.harbor_world.stories.pop();
    return {rejected:rejected,optional:FB.mods.validate(plain).length===0,pure:before===JSON.stringify([FB.state,FBDATA]) &&
      rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({rejected:Array(12).fill(true),optional:true,pure:true});
});

test('exact stale formation quotes reject changed original people, authority, consent, stock and money',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,W=FB.expeditionStoryPrograms,p=C.prep(s);C.run(s,'authorize',p.provider.characterId);
    C.next(s);C.run(s,'grant',p.provider.characterId);C.next(s);
    const changes=[function(s){s.chars[C.actor(s)].dead=true;},function(s){s.chars[C.prep(s).bindings[0].characterId].captive=true;},
      function(s){s.realms[C.prep(s).provider.realmId].ruler.generation++;},function(s){C.prep(s).authorizedTurn=null;},
      function(s){s.realms[C.rid].treasury.gold=0;},function(s){s.market.counties[C.origin][0][s.market.goods.indexOf('provisions')]=0;},
      function(s){s.owner[C.origin]='harbor_upland';},function(s){s.turn++;}];
    return changes.map(function (change) {const c=JSON.parse(JSON.stringify(s)),q=W.review(c,C.id,'form',C.actor(c));change(c);
      const before=JSON.stringify(c),rng=FB.getRngState(),uid=FB.getUidCounter();return q.allowed && !W.commit(c,q) && before===JSON.stringify(c) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();});
  });
  expect(result).toEqual(Array(8).fill(true));
});

test('the canonical cursor observes actual waypoints once per day and never enrolls a campaign',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,E=FB.expeditionPrograms,W=FB.expeditionStoryPrograms;
    const formed=C.ready(s);C.next(s);const owner=FB.mobile.row(s,C.rid),before=C.owners(s),a=FB.mobile.host(s,C.rid),at=a.at;
    const q=W.review(s,C.id,'step',C.actor(s),'assembly'),pure=C.owners(s)===before,first=W.commit(s,q),
      cursor=owner.expeditionProgram.steps[0].cursor,second=E.commit(s,E.review(s,C.rid,'assembly'));
    C.next(s);const last=C.run(s,'step',null,'assembly');C.next(s);const noVow=!W.review(s,C.id,'step',C.actor(s),'objective').allowed;
    return {formed:formed,pure:pure,first:first,cursor:cursor,second:second,last:last,finished:owner.expeditionProgram.steps[0].status==='complete',
      noVow:noVow,absent:!s.greatHolyWar,at:a.at===at,camp:FB.mobile.migration(s,C.rid).at===at,noShadow:!('cursor' in C.record(s))};
  });
  expect(result).toEqual({formed:true,pure:true,first:true,cursor:1,second:false,last:true,finished:true,noVow:true,absent:true,at:true,camp:true,noShadow:true});
});

test('a separately vowed live objective orders the original host, restores in flight and expires without ending its vow',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,W=FB.expeditionStoryPrograms,M=FB.mobile;
    const formed=C.ready(s),assembled=C.assembled(s),launched=C.launch(s);
    if (!formed || !assembled || !launched) return {formed:formed,assembled:assembled,launched:launched};
    const before=C.owners(s),q=W.review(s,C.id,'step',C.actor(s),'objective'),pure=before===C.owners(s),issued=W.commit(s,q),
      r=M.row(s,C.rid),host=M.host(s,C.rid),camp=M.migration(s,C.rid).at,ticket=r.expeditionProgram.execution.orders[0];
    const snapshot=JSON.stringify([C.record(s),C.owners(s)]),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
    const restored=snapshot===JSON.stringify([C.record(FB.state),C.owners(FB.state)]),x=FB.state,
      vow=JSON.stringify(x.greatHolyWar),resources=JSON.stringify([x.population,x.market,x.realms,x.owner,x.holder,M.row(x,C.rid).members]);
    x.turn=C.record(x).endTurn;x.date.day=x.turn+1;FB.stories.get(C.id).day(x,C.record(x));
    return {formed:formed,assembled:assembled,launched:launched,pure:pure,issued:issued,
      ticket:!!ticket && ticket.hostId===host.id && ticket.campaignId===s.greatHolyWar.id,
      camp:M.migration(x,C.rid).at===camp,restored:restored,expired:C.record(x).status==='closed' && C.record(x).reason==='expired',
      stopped:!(M.host(x,C.rid).path || []).length,vow:vow===JSON.stringify(x.greatHolyWar),
      resources:resources===JSON.stringify([x.population,x.market,x.realms,x.owner,x.holder,M.row(x,C.rid).members])};
  });
  expect(result).toEqual({formed:true,assembled:true,launched:true,pure:true,issued:true,ticket:true,camp:true,restored:true,expired:true,stopped:true,vow:true,resources:true});
});

test('current movement is real, bounded and distinct from the civilian camp',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,M=FB.mobile;C.ready(s);C.assembled(s);C.launch(s);
    const issued=C.run(s,'step',null,'objective'),a=M.host(s,C.rid),origin=a.at,camp=M.migration(s,C.rid).at,
      player=s.player.charId;s.player.charId=C.actor(s);let days=0;
    while (days<30 && a.at===origin && s.armies.indexOf(a)>=0) {
      C.next(s);days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);FB.stories.day(s);
    }
    s.player.charId=player;
    return {issued:issued,moved:a.at!==origin,camp:M.migration(s,C.rid).at===camp,days:days};
  });
  expect(result).toMatchObject({issued:true,moved:true,camp:true});expect(result.days).toBeLessThanOrEqual(30);
});

test('manual replacement pauses shared intent and terminal closure retains that manual route',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,M=FB.mobile;C.ready(s);C.assembled(s);C.launch(s);C.run(s,'step',null,'objective');
    const host=M.host(s,C.rid),manual=FB.orderArmy(s,host,host.goal),route=JSON.stringify([host.goal,host.path,host.moveLeft]);
    const projection=FB.stories.status(s,C.id).phase,oldActor=C.actor(s);C.next(s);
    const denied=!FB.expeditionStoryPrograms.review(s,C.id,'step',oldActor,'objective').allowed,stopped=C.run(s,'stop');
    return {manual:manual,paused:projection==='paused',denied:denied,stopped:stopped,closed:C.record(s).status==='closed',
      route:route===JSON.stringify([host.goal,host.path,host.moveLeft]),vow:s.greatHolyWar.participants.attackers.some(function(p){return p.realm===C.rid;})};
  });
  expect(result).toEqual({manual:true,paused:true,denied:true,stopped:true,closed:true,route:true,vow:true});
});

test('changed leader, issuer, host or member consent rejects the original step without transferring intent',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,E=FB.expeditionPrograms;C.ready(s);C.next(s);
    return [function(s,r){r.leaderId=C.prep(s).bindings[1].characterId;},function(s,r){r.command.leaderGeneration++;},
      function(s,r){s.chars[FB.bookmarkActor(s,'dune_authorizer').id].dead=true;},
      function(s,r){FB.mobile.migration(s,C.rid).hostId='foreign_host';},
      function(s,r){r.members[1].allegiance=false;}].map(function (change) {
        const x=JSON.parse(JSON.stringify(s)),r=FB.mobile.row(x,C.rid),q=E.review(x,C.rid,'assembly',{kind:'character',id:C.actor(x)});
        change(x,r);const before=JSON.stringify(x),rejected=!E.commit(x,q) && before===JSON.stringify(x);
        return q.allowed && rejected && C.record(x).actorId===C.actor(s);
      });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('player and NPC reviews share the bound while refuse policy takes a quiet no-departure path',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,E=FB.expeditionPrograms;C.ready(s);C.next(s);
    const old=s.player.charId;s.player.charId=C.actor(s);const before=JSON.stringify([C.record(s),C.owners(s)]);E.day(s);
    const player=before===JSON.stringify([C.record(s),C.owners(s)]);s.player.charId=old;
    E.day(s);const cursor=FB.mobile.row(s,C.rid).expeditionProgram.steps[0].cursor,stamp=JSON.stringify([C.record(s),C.owners(s)]);
    E.day(s);return {player:player,cursor:cursor,once:stamp===JSON.stringify([C.record(s),C.owners(s)]),turn:C.record(s).lastActionTurn===s.turn};
  });
  expect(result).toEqual({player:true,cursor:1,once:true,turn:true});
});

test('inland refusal policy leaves original residents, money and independent institutions unchanged',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,before=C.owners(s);FB.stories.day(s);
    return {closed:C.record(s).status==='closed',refused:C.record(s).reason==='refused',parent:C.prep(s).reason==='refused',
      unchanged:before===C.owners(s),noHost:!FB.mobile.host(s,C.rid)};
  });
  expect(result).toEqual({closed:true,refused:true,parent:true,unchanged:true,noHost:true});
});

test('pause, direct control-source resume and waiting share the same daily budget',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,E=FB.expeditionPrograms,S=FB.governmentSelection;C.ready(s);C.next(s);
    const paused=C.run(s,'pause'),request={realmId:C.rid,action:'resume',stepId:null,actor:{kind:'character',id:C.actor(s)}},
      q=E.reviewControl(s,request),before=JSON.stringify(s),blocked=!q.review.allowed && !S.commitSource(s,q) && before===JSON.stringify(s);
    C.next(s);const resumed=S.commitSource(s,S.reviewSource(s,'expedition_program',request));C.next(s);
    const owners=C.owners(s),wait=C.run(s,'wait'),noStep=!E.commit(s,E.review(s,C.rid,'assembly'));
    return {paused:paused,blocked:blocked,resumed:resumed,active:C.record(s).status==='active',wait:wait,noStep:noStep,owners:owners===C.owners(s)};
  });
  expect(result).toEqual({paused:true,blocked:true,resumed:true,active:true,wait:true,noStep:true,owners:true});
});

test('a fresh canonical dispatch refusal consumes its one attempt without AI fallback or partial owner changes',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,W=FB.expeditionStoryPrograms,E=FB.expeditionPrograms,M=FB.mobile;
    C.ready(s);C.assembled(s);C.launch(s);
    const q=W.review(s,C.id,'step',C.actor(s),'objective'),before=C.owners(s),commit=M.commit;let calls=0,done;
    // Model a refusing canonical transaction after its real pure review.
    M.commit=function () {calls++;return false;};
    try {done=W.commit(s,q);E.day(s);} finally {M.commit=commit;}
    return {eligible:q.allowed,done:done,calls:calls,attempt:C.record(s).lastActionTurn===s.turn,
      owners:before===C.owners(s),noRetry:!E.commit(s,E.review(s,C.rid,'objective'))};
  });
  expect(result).toEqual({eligible:true,done:false,calls:1,attempt:true,owners:true,noRetry:true});
});

test('a direct live composition boundary expires unformed preparation through its existing owner',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,before=C.owners(s);s.turn=C.prep(s).endTurn;s.date.day=s.turn+1;
    const q=FB.expeditionStoryPrograms.review(s,C.id,'stop',C.actor(s)),pure=C.owners(s)===before;
    FB.stories.get(C.id).day(s,C.record(s));FB.stories.get(C.id).validate(C.record(s),s);
    return {expired:!q.allowed,pure:pure,closed:C.record(s).status==='closed',parent:C.prep(s).reason==='expired',unchanged:before===C.owners(s)};
  });
  expect(result).toEqual({expired:true,pure:true,closed:true,parent:true,unchanged:true});
});

test('strict optional records reject erased, retargeted and downgraded saves without adopting or repairing',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase;C.ready(FB.state);const save=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state),
      rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function(x){delete x.state.stories[C.id];},function(x){delete x.state.stories;},
      function(x,t){t.version=2;},function(x,t){t.actorId=x.state.player.charId;},function(x,t){t.realmGeneration++;},
      function(x,t){t.preparationId='foreign';},function(x,t){t.commandId='foreign';},function(x,t){t.programId='foreign';},
      function(x,t){t.definitionKey+=' ';},function(x,t){t.lastActionTurn=x.state.turn+1;},function(x,t){t.endTurn++;},
      function(x,t){t.formation.hostId='foreign';},function(x,t){t.formation.migrationId='foreign';},
      function(x,t){t.formation.leaderGeneration++;},function(x,t){t.status='preparing';t.formation=null;},
      function(x,t){t.status='closed';t.closedTurn=x.state.turn;t.reason='complete';},function(x,t){t.cursor=1;}];
    const rejected=edits.map(function (edit) {const x=JSON.parse(JSON.stringify(save));edit(x,x.state.stories[C.id]);
      try {FB.save.restore(x);return false;} catch(e) {return true;}});
    return {rejected:rejected,pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({rejected:Array(17).fill(true),pure:true});
});

test('truthful stale command saves restore exactly and reconcile only at a live boundary',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state;C.ready(s);s.chars[FB.bookmarkActor(s,'dune_authorizer').id].dead=true;
    const before=JSON.stringify([C.record(s),C.owners(s)]),save=FB.save.serialize();FB.save.restore(JSON.parse(save));
    const restored=before===JSON.stringify([C.record(FB.state),C.owners(FB.state)]),owner=C.owners(FB.state);
    // Call only the composition boundary, withholding the independently declared refuse policy's action day.
    C.record(FB.state).lastActionTurn=FB.state.turn;FB.stories.get(C.id).day(FB.state,C.record(FB.state));
    return {restored:restored,paused:C.record(FB.state).status==='paused',actor:C.record(FB.state).actorId===C.actor(s),
      unchanged:owner===C.owners(FB.state)};
  });
  expect(result).toEqual({restored:true,paused:true,actor:true,unchanged:true});
});

test('matching checkpoints replay real formation, depleted accounts, canonical cursors and current orders deterministically',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,save=FB.save.serialize();
    function run() {const s=FB.state,formed=C.ready(s),assembled=C.assembled(s),launched=C.launch(s),issued=C.run(s,'step',null,'objective');
      return JSON.stringify({formed:formed,assembled:assembled,launched:launched,issued:issued,story:C.record(s),preparation:C.prep(s),owners:C.owners(s),
        rng:FB.getRngState()>>>0,uid:FB.getUidCounter()});}
    const first=run();FB.save.restore(JSON.parse(save));const second=run();
    return {real:JSON.parse(first).formed && JSON.parse(first).issued,replay:first===second};
  });
  expect(result).toEqual({real:true,replay:true});
});

test('a changed same-name ordinary imported policy rejects the old exact saved fingerprint',async function ({page},info) {
  await begin(page,info,'harbor');
  const saved=await page.evaluate(function () {return JSON.parse(FB.save.serialize());});
  const changed=JSON.parse(JSON.stringify(examples.harbor));changed.storyInstances.harbor_story_program.ai='hold';
  await begin(page,info,'harbor',changed);
  expect(await page.evaluate(function (saved) {
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try {FB.save.restore(saved);} catch(e) {rejected=true;}
    return rejected && before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
  },saved)).toBe(true);
});

test('hold policy suppresses automatic consent and dispatch while retaining explicit current reviews',async function ({page},info) {
  const changed=JSON.parse(JSON.stringify(examples.harbor));changed.storyInstances.harbor_story_program.ai='hold';
  await begin(page,info,'harbor',changed);
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,before=JSON.stringify([C.record(s),C.prep(s),C.owners(s)]);
    FB.stories.day(s);const held=before===JSON.stringify([C.record(s),C.prep(s),C.owners(s)]);
    const formed=C.ready(s);C.next(s);const active=JSON.stringify([C.record(s),C.owners(s)]);FB.expeditionPrograms.day(s);
    const explicit=FB.expeditionStoryPrograms.review(s,C.id,'step',C.actor(s),'assembly').allowed;
    return {held:held,formed:formed,noDispatch:active===JSON.stringify([C.record(s),C.owners(s)]),explicit:explicit};
  });
  expect(result).toEqual({held:true,formed:true,noDispatch:true,explicit:true});
});

for (const width of [390,1280]) {
  test('shared story review retains Back, Escape and originating choice at width '+width,async function ({page},info) {
    await page.setViewportSize({width:width,height:844});await begin(page,info,'harbor');
    await page.evaluate(function () {const s=FB.state,C=programCase;C.ready(s);C.next(s);s.player.charId=C.actor(s);FB.ui.showStorySheet(C.id);});
    const choice=page.locator('[data-story-choice="step:assembly"]');await choice.click();
    await expect(page.locator('#genmodal')).toContainText('Current public operation cost:');
    await page.locator('#genmodal').getByRole('button',{name:'Back',exact:true}).click();
    await expect(choice).toBeVisible();await expect(choice).toBeFocused();await choice.click();await page.keyboard.press('Escape');
    await expect(choice).toBeVisible();
    expect(await page.evaluate(function () {return FB.mobile.row(FB.state,programCase.rid).expeditionProgram.steps[0].cursor;})).toBe(0);
  });
}
