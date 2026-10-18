'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-objective-harbor.json'),
  upland:require('../fixtures/authoring/expedition-objective-upland.json')};
dependsOnRuntime(__filename,[
  'js/story_expedition_program.js','index.html','data/mobile_confederations.js','data/technology.js','data/units.js',
  'js/expedition_programs.js','js/holywar.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/government_selection.js','js/governments.js','js/authority.js','js/armies.js','js/federates.js','js/population.js',
  'js/treasury.js','js/market.js','js/logistics.js','js/religion.js','js/wars.js','js/settlement.js','js/home_authority.js',
  'js/starts.js','js/bookmark_setup.js','js/model.js','js/station.js','js/world.js','js/mods.js','js/stories.js',
  'js/story_expedition_participation.js','js/story_household.js','js/travel.js','js/save.js','js/save_v4.js','js/main.js','js/util.js']);

async function begin(page,info,label) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expedition-objective-'+label+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  const prefix=label==='harbor' ? 'harbor' : 'dune';
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (label) {
    const prefix=label==='harbor' ? 'harbor' : 'dune';
    window.objectiveCase={rid:label==='harbor' ? 'harbor_following' : 'dune_coalition',
      faith:prefix+'_belief',head:label==='harbor' ? 'harbor_commune' : 'dune_oasis',target:prefix+'_country',
      prepare:function () {
        const s=FB.state,actor=s.player.charId;
        s.turn=label==='harbor' ? 0 : 2;s.date={year:901,season:0,day:1};
        s.player.charId=FB.mobile.row(s,this.rid).leaderId;
        const called=FB.callGreatHolyWar(s,this.faith,this.target,this.head);
        s.player.charId=actor;
        if (!called) throw new Error('Expected a legal call');
      },
      launch:function () {
        const s=FB.state,r=FB.mobile.row(s,this.rid);
        if (!FB.commitMobileGreatHolyWar(s,FB.mobileGreatHolyWarReview(s,this.rid,r.leaderId,'join')))
          throw new Error('Expected separate voluntary admission');
        FB.joinGreatHolyWar(s,'attackers',this.head);
        s.greatHolyWar.launchTurn=s.turn;FB.greatHolyWarTick(s);
        if (s.greatHolyWar.phase!=='active') throw new Error('Expected campaign launch');
      },
      control:function (s,action) {return FB.expeditionPrograms.reviewControl(s,{realmId:this.rid,action:action,stepId:null,
        actor:{kind:'character',id:FB.mobile.row(s,this.rid).leaderId}});}
    };
  },label);
}

for (const label of ['harbor','upland']) {
  test(label+' ordinary JSON objective needs separate admission and an active canonical campaign',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid);
      const noCall=!E.review(s,C.rid,'objective').allowed;
      C.prepare();const noAdmission=!E.review(s,C.rid,'objective').allowed;
      C.launch();
      const before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),q=E.review(s,C.rid,'objective');
      return {noCall:noCall,noAdmission:noAdmission,allowed:q.allowed,pure:before===JSON.stringify([s,FBDATA]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter(),target:q.objective.countyId===FB.greatHolyWarArmyGoal(s,C.rid,M.host(s,C.rid).at),
        source:q.operation.source,action:q.operation.request.action,call:q.objective.campaignId===s.greatHolyWar.id,
        schema:r.expeditionProgram.schema,valid:M.validate(s),tech:FBDATA.techImpactReviews.features.expedition_live_religious_objective.mode};
    });
    expect(result).toEqual({noCall:true,noAdmission:true,allowed:true,pure:true,target:true,source:'coalition_leadership',
      action:'march',call:true,schema:1,valid:true,tech:'none'});
  });

  test(label+' orders one actual host without moving its camp or granting territory and restores in flight',async function ({page},info) {
    await begin(page,info,label);
    const result=await page.evaluate(function () {
      const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
      const r=M.row(s,C.rid),host=M.host(s,C.rid),camp=M.migration(s,C.rid).at,at=host.at,
        resources=JSON.stringify([r.food,r.accounting,r.members,s.owner,s.holder,s.player.gold,s.greatHolyWar,s.armies.length]);
      const q=E.review(s,C.rid,'objective'),done=E.commit(s,q),repeat=E.commit(s,q),ticket=r.expeditionProgram.execution.orders[0];
      const unchanged=resources===JSON.stringify([r.food,r.accounting,r.members,s.owner,s.holder,s.player.gold,s.greatHolyWar,s.armies.length]);
      const snapshot=JSON.stringify([r.expeditionProgram,s.armies,s.greatHolyWar,s.owner,s.holder,r.food,r.accounting]);
      const save=FB.save.serialize();FB.save.restore(JSON.parse(save));
      const restored=FB.state,rr=M.row(restored,C.rid);
      return {done:done,repeat:repeat,unchanged:unchanged,at:host.at===at,camp:M.migration(restored,C.rid).at===camp,
        ticket:ticket.hostId===host.id && ticket.campaignId===q.objective.campaignId && ticket.countyId===q.objective.countyId,
        cursor:r.expeditionProgram.steps[0].cursor,status:r.expeditionProgram.steps[0].status,schema:rr.expeditionProgram.schema,
        restored:snapshot===JSON.stringify([rr.expeditionProgram,restored.armies,restored.greatHolyWar,restored.owner,restored.holder,rr.food,rr.accounting]),
        valid:M.validate(restored)};
    });
    expect(result).toEqual({done:true,repeat:false,unchanged:true,at:true,camp:true,ticket:true,cursor:0,status:'pending',schema:3,restored:true,valid:true});
  });
}

test('detached ordinary JSON validation rejects unsupported objective terms and column hosts without publication',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const edits=[function(p){p.steps[0].terms.countyId='harbor_gardens';},function(p){p.steps[0].terms.join=true;},
      function(p){p.steps[0].terms.forceBattle=true;},function(p){p.steps[0].terms.mode='camp';}];
    const before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const bad=edits.every(function(edit){const mod=JSON.parse(JSON.stringify(source));
      edit(mod.bookmarks.harbor_world.realms.find(function(r){return r.mobile;}).mobile.expeditionProgram);
      const bytes=JSON.stringify(mod);return FB.mods.validate(mod).length>0 && bytes===JSON.stringify(mod);});
    const declaration=JSON.parse(JSON.stringify(source.bookmarks.harbor_world.realms.find(function(r){return r.mobile;})));
    declaration.mobile.columns={entries:[]};
    const realms={};source.bookmarks.harbor_world.realms.forEach(function(r){realms[r.id]=r;});
    const columns=FB.expeditionPrograms.definitionFaults(declaration,source.bookmarks.harbor_world.provinces,realms,source.mobileProfiles).length>0;
    return {bad:bad,columns:columns,pure:before===JSON.stringify([FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({bad:true,columns:true,pure:true});
});

test('changed campaign, occupation, original participant and current route facts reject stale orders without effects',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    return [function(s,r,a,q){s.greatHolyWar.id='ghw_999';},function(s,r,a,q){s.greatHolyWar.phase='settlement';},
      function(s,r,a,q){s.greatHolyWar.occupations[q.objective.countyId].occupied=true;},
      function(s,r,a,q){s.greatHolyWar.objectiveCounties=[];},function(s,r,a,q){s.greatHolyWar.participants.attackers=[];},
      function(s,r,a,q){s.greatHolyWar.participants.attackers.find(function(p){return p.realm===C.rid;}).mobileVow.status='withdrawn';},
      function(s,r,a,q){r.command.revision++;},function(s,r,a,q){s.chars[r.leaderId].dead=true;},
      function(s,r,a,q){r.members[0].allegiance=false;},function(s,r,a,q){a.manual=true;},
      function(s,r,a,q){s.holder[q.objective.countyId]=C.head;}].map(function (change) {
        const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,C.rid),a=M.host(s,C.rid),q=E.review(s,C.rid,'objective');
        change(s,r,a,q);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !E.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      });
  });
  expect(result).toEqual(Array(11).fill(true));
});

test('campaign replacement stops matching intent and cannot enroll the program in another call',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const r=M.row(s,C.rid),a=M.host(s,C.rid),at=a.at,camp=M.migration(s,C.rid).at;
    E.commit(s,E.review(s,C.rid,'objective'));const id=r.expeditionProgram.execution.campaignId;
    s.greatHolyWar.id='ghw_999';s.turn++;E.reconcile(s);
    const stopped=!a.path.length && !a.moveLeft && a.goal===null && !r.expeditionProgram.execution.orders.length;
    const q=E.review(s,C.rid,'objective');
    return {stopped:stopped,blocked:!q.allowed && q.reason==='campaign',same:r.expeditionProgram.execution.campaignId===id,
      at:a.at===at,camp:M.migration(s,C.rid).at===camp,pending:r.expeditionProgram.steps[0].status==='pending',valid:M.validate(s)};
  });
  expect(result).toEqual({stopped:true,blocked:true,same:true,at:true,camp:true,pending:true,valid:true});
});

test('actual halted field arrival completes only one observation per day and leaves the civilian camp behind',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const r=M.row(s,C.rid),a=M.host(s,C.rid),q=E.review(s,C.rid,'objective'),camp=M.migration(s,C.rid).at;
    E.commit(s,q);
    // Stage the existing movement owner's completed field position, without
    // moving its civilian camp, to exercise the exact arrival boundary.
    a.at=q.objective.countyId;a.from=a.at;a.path=[];a.goal=null;a.moveLeft=0;
    const sameDay=!E.review(s,C.rid,'objective').allowed;s.turn++;
    const arrived=E.review(s,C.rid,'objective'),observed=E.commit(s,arrived),next=!E.review(s,C.rid,'hold').allowed;
    const completed=r.expeditionProgram.steps[0].status==='complete';
    s.turn++;const held=E.commit(s,E.review(s,C.rid,'hold'));
    return {sameDay:sameDay,observed:observed,arrived:arrived.observation,operation:arrived.operation,next:next,completed:completed,
      held:held,terminal:r.expeditionProgram.status,camp:M.migration(s,C.rid).at===camp && camp!==a.at,valid:M.validate(s)};
  });
  expect(result).toEqual({sameDay:true,observed:true,arrived:'reached',operation:null,next:true,completed:true,held:true,terminal:'complete',camp:true,valid:true});
});

test('ordinary movement advances the ordered field host while the camp stays at its real county',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const a=M.host(s,C.rid),origin=a.at,camp=M.migration(s,C.rid).at;
    const issued=E.commit(s,E.review(s,C.rid,'objective'));let days=0;
    while (days<30 && a.at===origin && (s.armies || []).indexOf(a)>=0) {
      s.turn++;days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);
    }
    return {issued:issued,moved:a.at!==origin,camp:M.migration(s,C.rid).at===camp,days:days};
  });
  expect(result).toMatchObject({issued:true,moved:true,camp:true});expect(result.days).toBeLessThanOrEqual(30);
});

test('manual replacement, pause and expiry preserve the new order and all independent obligations',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const r=M.row(s,C.rid),a=M.host(s,C.rid);E.commit(s,E.review(s,C.rid,'objective'));
    const manual=FB.orderArmy(s,a,a.goal),path=JSON.stringify([a.goal,a.path,a.moveLeft]),vow=JSON.stringify(s.greatHolyWar),
      resources=JSON.stringify([r.members,r.accounting,r.food,s.owner,s.holder]);
    const paused=r.expeditionProgram.execution.paused;
    s.turn=75;E.reconcile(s);
    return {manual:manual,paused:paused,terminal:r.expeditionProgram.status,tickets:r.expeditionProgram.execution.orders.length,
      manualRoute:path===JSON.stringify([a.goal,a.path,a.moveLeft]),vow:vow===JSON.stringify(s.greatHolyWar),
      resources:resources===JSON.stringify([r.members,r.accounting,r.food,s.owner,s.holder]),valid:M.validate(s)};
  });
  expect(result).toEqual({manual:true,paused:true,terminal:'complete',tickets:0,manualRoute:true,vow:true,resources:true,valid:true});
});

test('absent campaign expires with no departure, vow or manufactured following',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=M.host(s,C.rid);
    const before=JSON.stringify([s.armies,r.food,r.accounting,r.members,M.migration(s,C.rid),s.owner,s.holder]);
    s.turn=45;E.reconcile(s);
    return {same:before===JSON.stringify([s.armies,r.food,r.accounting,r.members,M.migration(s,C.rid),s.owner,s.holder]),
      terminal:r.expeditionProgram.status,statuses:r.expeditionProgram.steps.map(function(v){return v.status;}),
      vow:s.greatHolyWar || null,goal:a.goal || null,valid:M.validate(s)};
  });
  expect(result).toEqual({same:true,terminal:'complete',statuses:['expired','expired'],vow:null,goal:null,valid:true});
});

test('strict optional objective tickets and daily budgets reject malformed saves without repair',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();E.commit(FB.state,E.review(FB.state,C.rid,'objective'));
    const changes=[function(p){delete p.execution.campaignId;},function(p){p.execution.campaignId='invented';},
      function(p){p.execution.campaignId='ghw_999';},function(p){p.execution.lastCommitTurn=1;},
      function(p){p.execution.lastCommitTurn=-1;},function(p){p.execution.orders[0].campaignId='ghw_999';},
      function(p){delete p.execution.orders[0].campaignId;},function(p){p.execution.orders[0].countyId='missing';},
      function(p){p.execution.orders[0].mode='camp';},function(p){p.execution.orders[0].actorId='invented';},
      function(p){p.schema=2;},function(p){delete p.execution;}];
    return changes.map(function(change){const s=JSON.parse(JSON.stringify(FB.state)),p=M.row(s,C.rid).expeditionProgram;
      change(p);const before=JSON.stringify(s);let bad=false;try{M.validate(s);}catch(error){bad=true;}
      return bad && before===JSON.stringify(s);});
  });
  expect(result).toEqual(Array(12).fill(true));
});

test('player intent withholds AI dispatch and AI uses the same one-step daily budget',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const r=M.row(s,C.rid),a=M.host(s,C.rid),player=s.player.charId;
    s.player.charId=r.leaderId;const before=JSON.stringify([r.expeditionProgram,s.armies]);E.day(s);
    const withheld=before===JSON.stringify([r.expeditionProgram,s.armies]);
    s.player.charId=player;E.day(s);
    const ticket=r.expeditionProgram.execution.orders[0],snapshot=JSON.stringify([r.expeditionProgram,s.armies]);E.day(s);
    return {withheld:withheld,issued:!!ticket && ticket.hostId===a.id,turn:r.expeditionProgram.execution.lastCommitTurn===s.turn,
      once:snapshot===JSON.stringify([r.expeditionProgram,s.armies]),valid:M.validate(s)};
  });
  expect(result).toEqual({withheld:true,issued:true,turn:true,once:true,valid:true});
});

test('quiet expiry of a vowed program suppresses competing strategic orders but retains forced retreat',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const r=M.row(s,C.rid),a=M.host(s,C.rid),at=a.at;
    E.commit(s,E.review(s,C.rid,'objective'));s.turn=75;E.reconcile(s);
    const binding=JSON.stringify(s.greatHolyWar.participants.attackers.find(function(p){return p.realm===C.rid;}).mobileVow);
    FB.armyTick(s);
    const quiet=a.at===at && a.goal===null && !a.path.length && !a.moveLeft && E.ownsOrders(s,a);
    a.broken=s.turn;const retreat=!E.ownsOrders(s,a);
    return {quiet:quiet,retreat:retreat,terminal:r.expeditionProgram.status,
      vow:binding===JSON.stringify(s.greatHolyWar.participants.attackers.find(function(p){return p.realm===C.rid;}).mobileVow)};
  });
  expect(result).toEqual({quiet:true,retreat:true,terminal:'complete',vow:true});
});

test('a neutral county requires actual passage and revocation stops only the owned route',async function ({page},info) {
  await begin(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,C=objectiveCase,E=FB.expeditionPrograms,M=FB.mobile;C.prepare();C.launch();
    const a=M.host(s,C.rid),q=E.review(s,C.rid,'objective'),r=M.row(s,C.rid);
    const issued=E.commit(s,q),at=a.at;
    // Current control is now a neutral home office, with no access agreement
    // for the separate expedition institution. No historical transfer is implied.
    s.owner[q.objective.countyId]='harbor_upland';s.holder[q.objective.countyId]='harbor_upland';s.turn++;
    E.reconcile(s);const refused=E.review(s,C.rid,'objective');
    return {issued:issued,blocked:!refused.allowed,passage:!M.passage(s,C.rid,q.objective.countyId,false),
      stopped:!a.path.length && a.goal===null && !a.moveLeft,at:a.at===at,tickets:r.expeditionProgram.execution.orders.length};
  });
  expect(result).toEqual({issued:true,blocked:true,passage:true,stopped:true,at:true,tickets:0});
});

test('saved opening replays canonical movement, campaign and conserved accounts deterministically',async function ({page},info) {
  await begin(page,info,'upland');
  const result=await page.evaluate(function () {
    const opening=FB.save.serialize(),C=objectiveCase;
    function run() {
      C.prepare();C.launch();const s=FB.state;
      FB.expeditionPrograms.commit(s,FB.expeditionPrograms.review(s,C.rid,'objective'));
      s.turn++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);
      return JSON.stringify([s.greatHolyWar,s.armies,FB.mobile.row(s,C.rid),s.owner,s.holder,FB.getRngState(),FB.getUidCounter()]);
    }
    const first=run();FB.save.restore(JSON.parse(opening));return first===run();
  });
  expect(result).toBe(true);
});
