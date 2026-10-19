'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-opening-campaigns-harbor.json'),
  dune:require('../fixtures/authoring/mobile-opening-campaigns-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/technology.js','data/units.js',
  'js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/expedition_programs.js','js/governments.js','js/government_selection.js','js/government_support.js',
  'js/government_continuity.js','js/government_assembly.js','js/government_civic.js','js/civic_strategies.js',
  'js/ecclesiastical_strategies.js','js/home_authority.js','js/authority.js','js/wars.js','js/armies.js','js/federates.js',
  'js/logistics.js','js/treasury.js','js/population.js','js/settlement.js','js/technology.js','js/bookmark_setup.js',
  'js/starts.js','js/world.js','js/main.js','js/model.js','js/station.js','js/util.js','js/justice.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/stories.js','js/story_household.js']);

async function start(page,info,prefix,input,scenario) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(input ? {name:'campaigns.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input))} : path.resolve(__dirname,'../fixtures/authoring/mobile-opening-campaigns-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',scenario || prefix+'_household');
  await page.evaluate(function () {
    const M=FB.mobile,s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
    window.openingCase={d:d,rid:d.id,fresh:function () {
      const fresh=JSON.parse(JSON.stringify(FB.state));
      fresh.armies=fresh.armies.filter(function (a) {return a.realm!==d.id;});
      fresh.authority.migrations=fresh.authority.migrations.filter(function (m) {return m.realmId!==d.id;});
      delete fresh.authority.governments[d.id].mobile;
      fresh.wars={};fresh.warSerial=0;
      Object.keys(fresh.realms).forEach(function (rid) {fresh.realms[rid].war=null;});fresh.player.war=null;
      return fresh;
    },row:function () {return M.row(FB.state,d.id);}};
  });
}

test('an original opponent adopted by a ruler start retains the canonical player alias and matching provenance',async function ({page},info) {
  await start(page,info,'dune',null,'dune_opponent');
  const result=await page.evaluate(function () {
    const C=window.openingCase,s=FB.state,M=FB.mobile,r=C.row(),e=r.openingCampaigns.entries[0],w=FB.ordinaryWarById(s,e.warId);
    const before=JSON.stringify([r,s.wars,s.armies,s.chars,s.player,s.start]),valid=w && w.defender==='player' &&
      e.opponent.declaredRealmId==='dune_gate' && e.opponent.characterId===s.player.charId && s.start.rulerRealmId==='dune_gate';
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state;
    return !!valid && before===JSON.stringify([M.row(restored,C.rid),restored.wars,restored.armies,
      restored.chars,restored.player,restored.start]);
  });
  expect(result).toBe(true);
});

for (const prefix of ['harbor','dune']) {
  test(prefix+' real JSON import registers only the declared wars and binds conserved columns once',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=window.openingCase,M=FB.mobile,s=FB.state,r=C.row(),t=C.d.mobile;
      FB.assignCampaignHosts(s);
      const marker=r.openingCampaigns,wars=FB.realmWars(s,C.rid),hosts=M.columnSnapshot(s,C.rid).entries;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,[C.d]);M.validate(s);
      const repeated=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const saved=JSON.stringify([r,s.armies,s.wars,s.chars,s.treasuryAccounting,s.realms,s.player]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return {count:wars.length,positions:hosts.map(function (c) {return c.host.at;}),
        matched:marker.entries.every(function (e) {
          const w=wars.find(function (v) {return v.id===e.warId;});
          return w && w.attacker===C.rid && w.defender===FB.startRealmId(s,e.opponent.declaredRealmId) && w.target===e.target &&
            w.startedTurn===0 && w.wins===0 && w.losses===0 && Object.keys(w.occupations).length===0 &&
            e.columns.every(function (c) {return hosts.some(function (h) {
              return h.id===c.columnId && h.hostId===c.hostId && h.commanderId===c.commanderId && h.host.warId===w.id;
            });});
        }),unassigned:hosts.filter(function (h) {return !marker.entries.some(function (e) {
          return e.columns.some(function (c) {return c.hostId===h.hostId;});
        });}).every(function (h) {return !h.host.warId;}),
        total:M.total(s,C.rid),initial:r.accounting.initial,men:hosts.reduce(function (n,c) {return n+c.host.men;},0),
        food:r.food+hosts.reduce(function (n,c) {return n+c.host.mobileFood;},0),
        reserve:r.members.reduce(function (n,m) {return n+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0),
        noConquest:FB.realmTerritory(s,C.rid).length===0 && M.migration(s,C.rid).at===t.origin &&
          hosts.every(function (h) {return h.host.from===h.host.at && !h.host.mobileCourt && !h.host.path.length;}),
        repeated:repeated,restored:saved===JSON.stringify([M.row(restored,C.rid),restored.armies,restored.wars,
          restored.chars,restored.treasuryAccounting,restored.realms,restored.player]),
        tech:FBDATA.techImpactReviews.features.mobile_opening_campaigns.mode};
    });
    expect(result).toEqual({count:prefix==='harbor' ? 2 : 1,
      positions:prefix==='harbor' ? ['harbor_gardens','harbor_ridge'] : ['dune_pass','dune_well'],
      matched:true,unassigned:true,total:prefix==='harbor' ? 1400 : 1600,initial:prefix==='harbor' ? 1400 : 1600,
      men:160,food:3200,reserve:prefix==='harbor' ? 100 : 200,noConquest:true,repeated:true,restored:true,tech:'none'});
  });
}

test('detached malformed and incompatible declarations reject without mutating input, registries or identity streams',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (m) {m.openingCampaigns=null;},function (m) {m.openingCampaigns.schema=2;},
      function (m) {m.openingCampaigns.extra=true;},function (m) {m.openingCampaigns.entries=[];},
      function (m) {m.openingCampaigns.entries[0].extra=true;},function (m) {m.openingCampaigns.entries[0].opponent.actorId='missing';},
      function (m) {m.openingCampaigns.entries[0].opponent.realmId='constructor';},
      function (m) {m.openingCampaigns.entries[0].opponent.generation=2;},
      function (m) {m.openingCampaigns.entries[0].opponent.kind='opening_actor';},
      function (m) {m.openingCampaigns.entries[0].target='missing';},
      function (m) {m.openingCampaigns.entries[0].target='harbor_ridge';},
      function (m) {m.openingCampaigns.entries[0].columnIds=['missing'];},
      function (m) {m.openingCampaigns.entries[0].columnIds=['quay_column','quay_column'];},
      function (m) {m.openingCampaigns.entries[1].columnIds=['quay_column'];},
      function (m) {m.openingCampaigns.entries[1].id=m.openingCampaigns.entries[0].id;},
      function (m) {m.openingCampaigns.entries.push(JSON.parse(JSON.stringify(m.openingCampaigns.entries[0])));},
      function (m) {m.openingCampaigns.entries[1].opponent=JSON.parse(JSON.stringify(m.openingCampaigns.entries[0].opponent));},
      function (m) {m.command.operations=m.command.operations.filter(function (op) {return op!=='war';});},
      function (m) {delete m.columns;},function (m) {m.columns.entries=null;},
      function (m) {m.preparationId='not_formed';},function (m) {m.guardedParty={};},function (m) {m.civilianCamps={};},
      function (m,b) {b.opening.actors.harbor_enemy_ruler.ref.realmId='harbor_commune';}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),b=input.bookmarks.harbor_world,m=b.realms.find(function (r) {return r.mobile;}).mobile;
      change(m,b);
      const bytes=JSON.stringify(input),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(24).fill(true));
});

test('pure whole-opening preflight rejects stale parties, target control, hostile transit and conflicts before allocation',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile;
    return ['dead','custody','generation','target','peaceful','disconnected','collision','existing','late','forged'].map(function (kind) {
      const s=C.fresh(),d=JSON.parse(JSON.stringify(C.d)),e=d.mobile.openingCampaigns.entries[1],enemy=e.opponent.realmId;
      const actor=FB.bookmarkActor(s,e.opponent.actorId),adj=FB.world.adj;
      if (kind==='dead') actor.dead=true;
      if (kind==='custody') actor.imprisoned=true;
      if (kind==='generation') s.realms[enemy].ruler.generation=2;
      if (kind==='target') s.owner[e.target]='harbor_commune';
      if (kind==='peaceful') s.owner.harbor_gardens='player';
      if (kind==='disconnected') FB.world.adj=Object.assign({},adj,{harbor_quay:{}});
      if (kind==='collision') s.wars['opening_war_'+C.rid+'_'+e.id]={id:'reserved',status:'ended'};
      if (kind==='existing') {
        const w=JSON.parse(JSON.stringify(FB.state.wars['opening_war_'+C.rid+'_'+e.id]));
        w.id='war_17';s.wars[w.id]=w;
      }
      if (kind==='late') s.turn=1;
      if (kind==='forged') d.mobile.openingCampaigns.entries[0].columnIds=['reed_column'];
      const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false,denied=false;
      try {denied=!M.openingPlan(s,d).allowed;M.initialize(s,[d]);} catch(error) {rejected=true;}
      finally {FB.world.adj=adj;}
      return denied && rejected && before===JSON.stringify(s) && data===JSON.stringify(FBDATA) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(10).fill(true));
});

test('a valid live batch credits only the existing treasury allocation and preserves outside population and purses',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=C.fresh(),before=JSON.stringify([s.population,s.player,
      Object.keys(s.realms).filter(function (rid) {return rid!==C.rid;}).map(function (rid) {return s.realms[rid].treasury;})]);
    const gold=FB.treasuryAvailable(s,C.rid),rng=FB.getRngState(),uid=FB.getUidCounter(),data=JSON.stringify(FBDATA),bytes=JSON.stringify(s);
    const plan=M.openingPlan(s,C.d),pure=plan.allowed && bytes===JSON.stringify(s) && data===JSON.stringify(FBDATA) &&
      rng===FB.getRngState() && uid===FB.getUidCounter();
    M.initialize(s,[C.d]);M.validate(s);
    return {pure:pure,credit:FB.treasuryAvailable(s,C.rid)-gold,
      outside:before===JSON.stringify([s.population,s.player,Object.keys(s.realms).filter(function (rid) {return rid!==C.rid;})
        .map(function (rid) {return s.realms[rid].treasury;})]),
      fighters:s.armies.filter(function (a) {return a.realm===C.rid;}).reduce(function (n,a) {return n+a.men;},0),
      conflicts:FB.realmWars(s,C.rid).length};
  });
  expect(result).toEqual({pure:true,credit:70,outside:true,fighters:160,conflicts:2});
});

test('the actual hostile footprint permits transit but an ungranted peaceful intervening county blocks the same target',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=C.fresh(),hostile=M.openingPlan(s,C.d).allowed;
    s.owner.dune_foothills='dune_oasis';s.holder.dune_foothills='dune_oasis';
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const peaceful=!M.openingPlan(s,C.d).allowed;let rejected=false;
    try {M.initialize(s,[C.d]);} catch(error) {rejected=true;}
    return {hostile:hostile,peaceful:peaceful,rejected:rejected,
      pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({hostile:true,peaceful:true,rejected:true,pure:true});
});

test('existing-conflict inspection accepts an already reached objective without widening ordinary new declarations',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=C.fresh(),plan=M.openingPlan(s,C.d);
    const projected=M.openingCommandProjection(s,C.d,plan),target='dune_pass';
    const cause={type:'aggression',enemy:'dune_gate',target:target},before=JSON.stringify(projected),rng=FB.getRngState(),uid=FB.getUidCounter();
    const normal=FB.warDeclarationPreview(projected,C.rid,[cause],{frontier:[target]});
    const opening=FB.warDeclarationPreview(projected,C.rid,[cause],{frontier:[target],existingConflict:true});
    return {normal:normal.valid,opening:opening.valid && !opening.unlawful,
      pure:before===JSON.stringify(projected) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({normal:false,opening:true,pure:true});
});

test('a later invalid command in the same opening batch leaves the earlier valid command entirely unformed',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),b=input.bookmarks.harbor_world;
  const extra=JSON.parse(JSON.stringify(b.realms.find(function (r) {return r.mobile;})));
  extra.id+='_other';extra.name='The second reed command';extra.mobile.command.id+='_other';
  extra.mobile.expeditionProgram.id+='_other';extra.mobile.expeditionProgram.commandId=extra.mobile.command.id;
  extra.mobile.opening.principals.forEach(function (binding) {
    const id=binding.person.actorId,actor=JSON.parse(JSON.stringify(b.opening.actors[id]));
    actor.name+=' the Younger';binding.person.actorId+='_other';b.opening.actors[binding.person.actorId]=actor;
  });
  b.realms.push(extra);
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=C.fresh(),defs=FB.campaignBookmark(s).realms.filter(function (r) {return r.mobile;});
    const extra=defs[1];s.armies=s.armies.filter(function (a) {return a.realm!==extra.id;});
    s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==extra.id;});
    delete s.authority.governments[extra.id].mobile;
    FB.bookmarkActor(s,extra.mobile.opening.principals[0].person.actorId).dead=true;
    const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const first=M.openingPlan(s,defs[0]).allowed,second=M.openingPlan(s,defs[1]).allowed;let rejected=false;
    try {M.initialize(s,defs);} catch(error) {rejected=true;}
    return first && !second && rejected && before===JSON.stringify(s) && data===JSON.stringify(FBDATA) &&
      rng===FB.getRngState() && uid===FB.getUidCounter();
  });
  expect(result).toBe(true);
});

test('ordinary operations retain scoped permits, stale/repeated reviews and current peaceful passage rules',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=FB.state,r=C.row(),c=r.columns.entries[1],a=s.armies.find(function (a) {return a.id===c.hostId;});
    const request={realmId:C.rid,action:'march',terms:{columnId:c.id,countyId:C.d.mobile.origin},actor:{kind:'character',id:r.leaderId}};
    const q=M.reviewColumns(s,request),allowed=q.review.allowed;
    a.mobileFood-=1;
    const bytes=JSON.stringify(s),stale=!M.commit(s,q) && bytes===JSON.stringify(s);
    const current=M.reviewColumns(s,request),committed=M.commit(s,current),after=JSON.stringify(s);
    const repeated=!M.commit(s,current) && after===JSON.stringify(s);
    const record=r.openingCampaigns.entries[1];
    FB.settleOrdinaryWar(s,record.warId,'white_peace');
    const noWar=FB.ordinaryWarById(s,record.warId)===null;
    const denied=!M.reviewColumns(s,{realmId:C.rid,action:'march',terms:{columnId:r.columns.entries[0].id,
      countyId:record.target},actor:request.actor}).review.allowed;
    const cause={type:'aggression',enemy:FB.startRealmId(s,record.opponent.declaredRealmId),target:record.target};
    const raw=JSON.stringify(s),blocked=FB.registerOrdinaryWar(s,C.rid,{enemy:cause.enemy,target:cause.target,
      casus:cause,objectives:[cause],legacy:false})===null && raw===JSON.stringify(s);
    return {allowed:allowed,stale:stale,committed:committed,repeated:repeated,noWar:noWar,denied:denied,blocked:blocked};
  });
  expect(result).toEqual({allowed:true,stale:true,committed:true,repeated:true,noWar:true,denied:true,blocked:true});
});

test('peace, cancelled intent, actual losses, dead original people and moved or retired hosts survive matching restore',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,E=FB.expeditionPrograms,s=FB.state,r=C.row(),a=s.armies.find(function (a) {return a.id===r.columns.entries[0].hostId;});
    const cancel=E.reviewControl(s,{realmId:C.rid,action:'cancel',stepId:null,actor:{kind:'character',id:r.leaderId}});
    if (!cancel.review.allowed || !M.commit(s,cancel)) throw new Error('Intent cancellation failed');
    r.openingCampaigns.entries.forEach(function (e) {FB.settleOrdinaryWar(s,e.warId,'white_peace');});
    // Stage an ordinary casualty boundary and a completed field return, without a simulation loop.
    FB.applyHostLosses(a,3,s);a.mobileFood=1;
    a.at=C.d.mobile.origin;a.from='harbor_gardens';a.path=[];a.goal=null;a.moveLeft=0;
    FB.disbandArmy(s,s.armies.find(function (a) {return a.id===r.columns.entries[1].hostId;}));
    const opponent=s.chars[r.openingCampaigns.entries[1].opponent.characterId];opponent.dead=true;
    FB.royalCharDied(s,opponent,FB.startRealmId(s,r.openingCampaigns.entries[1].opponent.declaredRealmId));
    const commander=s.chars[r.columns.entries[1].commanderId];commander.dead=true;FB.royalCharDied(s,commander,C.rid);
    // Ordinary ended-war history can be pruned; provenance must not recreate it.
    delete s.wars[r.openingCampaigns.entries[0].warId];
    M.validate(s);
    const before=JSON.stringify([r,s.armies,s.wars,s.chars,s.realms,s.player,s.treasuryAccounting]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,row=M.row(restored,C.rid),same=before===JSON.stringify([row,restored.armies,restored.wars,
      restored.chars,restored.realms,restored.player,restored.treasuryAccounting]);
    M.initialize(restored,[C.d]);E.day(restored);
    return {same:same,noReplay:before===JSON.stringify([row,restored.armies,restored.wars,restored.chars,
      restored.realms,restored.player,restored.treasuryAccounting]),wars:FB.realmWars(restored,C.rid).length,
      cancelled:row.expeditionProgram.status,losses:row.accounting.dead,moved:restored.armies.find(function (v) {return v.id===a.id;}).at,
      retired:row.columns.entries[1].status,streams:rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({same:true,noReplay:true,wars:0,cancelled:'cancelled',losses:3,moved:'harbor_quay',retired:'retired',streams:true});
});

test('missing or forged opted-in provenance rejects detached save adoption without reconstructing wars or hosts',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,changes=[function (r) {delete r.openingCampaigns;},
      function (r) {r.openingCampaigns.schema=2;},function (r) {r.openingCampaigns.extra=true;},
      function (r) {r.openingCampaigns.leaderId='missing';},function (r) {r.openingCampaigns.commandId='other';},
      function (r) {r.openingCampaigns.entries=[];},function (r) {r.openingCampaigns.entries[0].warId='war_123';},
      function (r) {r.openingCampaigns.entries[0].opponent.characterId='missing';},
      function (r) {r.openingCampaigns.entries[0].opponent.declaredRealmId='dune_oasis';},
      function (r) {r.openingCampaigns.entries[0].opponent.generation++;},
      function (r) {r.openingCampaigns.entries[0].target='dune_well';},
      function (r) {r.openingCampaigns.entries[0].columns[0].hostId='foreign';},
      function (r) {r.openingCampaigns.entries[0].columns[0].commanderId=r.leaderId+'forged';},
      function (r,s) {s.wars[r.openingCampaigns.entries[0].warId].startedTurn=1;}];
    return changes.map(function (change) {
      const saved=JSON.parse(FB.save.serialize()),s=saved.state;change(M.row(s,C.rid),s);
      const before=JSON.stringify(s),live=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false,restoreRejected=false;
      try {M.validate(s);} catch(error) {rejected=true;}
      try {FB.save.restore(saved);} catch(error) {restoreRejected=true;}
      return rejected && restoreRejected && before===JSON.stringify(s) && live===JSON.stringify(FB.state) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(14).fill(true));
});

test('later canonical reassignment changes the current commander without rewriting opening campaign provenance',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=FB.state,r=C.row(),first=r.columns.entries[0],other=r.columns.entries[1];
    const marker=JSON.stringify(r.openingCampaigns),request={realmId:C.rid,action:'assign',
      terms:{columnId:first.id,candidateId:other.commanderId},actor:{kind:'character',id:r.leaderId}};
    const q=M.reviewColumns(s,request),assigned=q.review.allowed && M.commit(s,q),repeated=!M.commit(s,q);
    M.validate(s);
    const before=JSON.stringify([r,s.armies,s.wars]),kept=marker===JSON.stringify(r.openingCampaigns);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,row=M.row(restored,C.rid);
    return {assigned:assigned,repeated:repeated,schema:row.columns.schema,kept:kept && marker===JSON.stringify(row.openingCampaigns),
      commander:row.columns.entries[0].commanderId===other.commanderId,
      restored:before===JSON.stringify([row,restored.armies,restored.wars])};
  });
  expect(result).toEqual({assigned:true,repeated:true,schema:2,kept:true,commander:true,restored:true});
});

test('omitting opening campaigns retains the existing war-free record and save contract',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),m=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile;
  delete m.openingCampaigns;m.columns.entries[0].openingLocation={countyId:'dune_flats'};
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const C=window.openingCase,M=FB.mobile,s=FB.state,before=JSON.stringify([C.row(),s.wars,s.armies]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,valid=M.row(restored,C.rid).openingCampaigns===undefined && FB.realmWars(restored,C.rid).length===0 &&
      before===JSON.stringify([M.row(restored,C.rid),restored.wars,restored.armies]);
    const saved=JSON.parse(FB.save.serialize());M.row(saved.state,C.rid).openingCampaigns={schema:1,entries:[]};
    let rejected=false;try {M.validate(saved.state);} catch(error) {rejected=true;}
    return {valid:valid,rejected:rejected};
  });
  expect(result).toEqual({valid:true,rejected:true});
});

test('mod fingerprints retain exact campaign assignments and reject a mismatched saved declaration',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize(),d=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;});
    d.mobile.openingCampaigns.entries[0].columnIds.push('ridge_column');
    FB.mods.apply(input);const before=JSON.stringify(FB.state);let rejected=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {rejected=/different mod/.test(error.message);}
    return rejected && before===JSON.stringify(FB.state);
  },examples.dune);
  expect(result).toBe(true);
});
