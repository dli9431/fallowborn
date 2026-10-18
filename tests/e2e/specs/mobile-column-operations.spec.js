'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/expedition_programs.js','js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js','js/federates.js',
  'js/armies.js','js/wars.js','js/treasury.js','js/home_authority.js','js/population.js','js/settlement.js','js/technology.js',
  'js/governments.js','js/government_selection.js','js/government_continuity.js','js/government_support.js',
  'js/bookmark_setup.js','js/mods.js','js/world.js','js/starts.js','js/authority.js','js/model.js',
  'js/ui_mobile.js','js/ui_misc.js','js/save.js','js/save_v4.js','js/main.js','js/util.js']);

async function start(page,info,prefix,singleHost) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  const fixture=path.resolve(__dirname,'../fixtures/authoring/mobile-columns-'+prefix+'.json');
  if (singleHost) {
    const input=JSON.parse(JSON.stringify(require(fixture)));
    delete input.bookmarks[prefix+'_world'].realms.find(function (r) {return r.mobile;}).mobile.columns;
    await page.locator('#modfile').setInputFiles({name:'single-host.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  } else await page.locator('#modfile').setInputFiles(fixture);
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (prefix) {
    const M=FB.mobile,rid=prefix+'_coalition';
    window.columnTest={rid:rid,
      review:function (action,terms,actor) {return M.reviewColumns(FB.state,{realmId:rid,action:action,terms:terms,
        actor:actor || {kind:'character',id:M.row(FB.state,rid).leaderId}});},
      apply:function (action,terms,actor) {return M.commit(FB.state,this.review(action,terms,actor));},
      host:function (index) {const s=FB.state,c=M.row(s,rid).columns.entries[index];return s.armies.find(function (a) {return a.id===c.hostId;});},
      totals:function () {const s=FB.state,r=M.row(s,rid);return {people:M.total(s,rid),food:r.food+s.armies.filter(function (a) {
        return a.realm===rid && a.mobileFollowing;}).reduce(function (n,a) {return n+a.mobileFood;},0),
        money:FB.treasuryAvailable(s,rid),privateGold:s.player.gold};}
    };
  },prefix);
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imported columns merge and split exact units, people, stock and stable identities',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),[a,b]=r.columns.entries;
      const totals=C.totals(),ids=[a.hostId,b.hostId],rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
      const units=Object.assign({},C.host(0).units);
      Object.keys(C.host(1).units).forEach(function (id) {units[id]=(units[id] || 0)+C.host(1).units[id];});
      const merge=C.review('merge',{columnId:a.id,otherColumnId:b.id}),accepted=merge.review.allowed && M.commit(s,merge);
      const repeat=!M.commit(s,merge),retired=b.status==='retired' && !C.host(1),merged=JSON.stringify(C.host(0).units)===JSON.stringify(units);
      const unitId=Object.keys(units).find(function (id) {return units[id]>=40;});
      const split=C.apply('split',{columnId:a.id,otherColumnId:b.id,unitId:unitId,count:40});
      const conserved=JSON.stringify(C.totals())===JSON.stringify(totals);
      return {accepted:accepted,repeat:repeat,retired:retired,merged:merged,split:split,conserved:conserved,
        exact:C.host(1).men===40 && C.host(1).units[unitId]===40 && C.host(1).mobileRoster.reduce(function (n,c) {return n+c.count;},0)===40,
        ids:JSON.stringify(ids)===JSON.stringify(r.columns.entries.map(function (c) {return c.hostId;})),
        noIdentity:rng===(FB.getRngState()>>>0) && uid===FB.getUidCounter(),valid:M.validate(s)};
    });
    expect(result).toEqual({accepted:true,repeat:true,retired:true,merged:true,split:true,conserved:true,exact:true,ids:true,noIdentity:true,valid:true});
  });
}

test('field commander scope, stale reviews and unavailable principals refuse without mutation',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),[a,b]=r.columns.entries;
    const actor={kind:'character',id:b.commanderId},own=C.review('march',{columnId:b.id,countyId:C.host(1).at},actor);
    const before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    const forbidden=[C.review('march',{columnId:a.id,countyId:C.host(0).at},actor),
      C.review('move',{columnId:b.id,countyId:C.host(1).at},actor),
      C.review('merge',{columnId:b.id,otherColumnId:a.id},actor),
      C.review('recruit',{columnId:b.id,unitId:'arch',count:1},actor),
      C.review('march',{columnId:b.id,countyId:C.host(1).at,extra:true},actor)];
    const rejected=forbidden.every(function (q) {return !q.review.allowed && !M.commit(s,q);});
    const pure=before===JSON.stringify(s) && rng===(FB.getRngState()>>>0) && uid===FB.getUidCounter();
    const changes=[function (v) {M.row(v,C.rid).revision++;},function (v) {v.chars[b.commanderId].dead=true;},
      function (v) {v.chars[b.commanderId].captive=true;},function (v) {M.row(v,C.rid).members[1].allegiance=false;},
      function (v) {M.row(v,C.rid).command.status='recalled';},function (v) {v.turn=270;}];
    const stale=changes.every(function (change) {const v=JSON.parse(JSON.stringify(s));change(v);const bytes=JSON.stringify(v);
      return !M.commit(v,own) && bytes===JSON.stringify(v);});
    return {own:own.review.allowed,rejected:rejected,pure:pure,stale:stale};
  });
  expect(result).toEqual({own:true,rejected:true,pure:true,stale:true});
});

test('one escort carries the camp through actual secondary-host arrival and restore',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),[a,b]=r.columns.entries,m=M.migration(s,C.rid);
    // Stage a lawful owned destination. The reviewed order and ordinary
    // movement own the route and arrival, with no daily years-long journey.
    s.owner.dune_flats=C.rid;s.holder.dune_flats=C.rid;FB.invalidateRealmCache();
    const route=FB.armyOrderPlan(s,C.host(1),'dune_flats');
    route.path.forEach(function (pid) {s.owner[pid]=C.rid;s.holder[pid]=C.rid;});FB.invalidateRealmCache();
    function position(a) {return JSON.stringify([a.id,a.at,a.path,a.warId,a.men]);}
    const first=position(C.host(0)),camp=m.at,totals=C.totals();
    const moved=C.apply('move',{columnId:b.id,countyId:'dune_flats'}),notTeleport=m.at===camp && C.host(1).at===camp;
    const saved=JSON.stringify([r,m,s.armies]);FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,matched=saved===JSON.stringify([M.row(restored,C.rid),M.migration(restored,C.rid),restored.armies]);
    const escort=C.host(1);escort.moveLeft=1;
    // A single real army boundary commits the adjacent checkpoint.
    restored.turn++;FB.armyTick(restored);FB.federateDay(restored);
    const arrived=escort.at!==camp && M.migration(restored,C.rid).at===escort.at;
    const other=position(C.host(0))===first;
    const one=restored.armies.filter(function (v) {return v.realm===C.rid && v.mobileCourt;}).length===1;
    const stopped=C.apply('stop',{columnId:b.id});
    return {moved:moved,notTeleport:notTeleport,matched:matched,arrived:arrived,other:other,one:one,stopped:stopped,
      people:C.totals().people===totals.people,privateGold:C.totals().privateGold===totals.privateGold,valid:M.validate(restored)};
  });
  expect(result).toEqual({moved:true,notTeleport:true,matched:true,arrived:true,other:true,one:true,stopped:true,people:true,privateGold:true,valid:true});
});

test('partial reunion leaves remote columns and camp ownership unchanged',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),[a,b]=r.columns.entries,m=M.migration(s,C.rid);
    C.host(1).at='harbor_ridge';C.host(1).from='harbor_ridge';
    const remote=JSON.stringify(C.host(1)),before=C.totals(),q=C.review('merge',{columnId:a.id,otherColumnId:b.id});
    const rejected=!q.review.allowed && !M.commit(s,q);
    const demuster=C.apply('demuster',{columnId:a.id});
    const noFinal=M.review(s,{realmId:C.rid,action:'settle',terms:{countyId:m.at,count:M.total(s,C.rid),final:true},
      actor:{kind:'character',id:r.leaderId}});
    return {rejected:rejected,demuster:demuster,remote:JSON.stringify(C.host(1))===remote,camp:m.at==='harbor_quay',
      samePeople:C.totals().people===before.people,food:C.totals().food===before.food,blocked:!noFinal.review.allowed,valid:M.validate(s)};
  });
  expect(result).toEqual({rejected:true,demuster:true,remote:true,camp:true,samePeople:true,food:true,blocked:true,valid:true});
});

test('canonical casualties and remote retirement never recover dead or remote people at camp',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),a=C.host(1),count=a.men;
    a.at='dune_pass';a.from=a.at;
    const pools=JSON.stringify(r.members),food=r.food,total=M.total(s,C.rid),other=JSON.stringify(C.host(0));
    FB.applyHostLosses(a,10,s);const survivors=a.men;FB.disbandArmy(s,a);FB.disbandArmy(s,a);
    return {dead:r.accounting.dead===10,dispersed:r.accounting.dispersed===survivors,remaining:M.total(s,C.rid)===total-count,
      pools:JSON.stringify(r.members)===pools,food:r.food===food,other:JSON.stringify(C.host(0))===other,
      retired:r.columns.entries[1].status==='retired',valid:M.validate(s)};
  });
  expect(result).toEqual({dead:true,dispersed:true,remaining:true,pools:true,food:true,other:true,retired:true,valid:true});
});

test('class-specific recovery conserves pledged pools and charges the public account once',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),[a,b]=r.columns.entries;
    const before=C.totals();C.apply('demuster',{columnId:b.id});
    const denied=C.review('recruit',{columnId:b.id,unitId:'missing',count:40}),short=C.review('recruit',{columnId:b.id,unitId:'arch',count:100000000});
    const locked=C.review('recruit',{columnId:b.id,unitId:'cataphract',count:40});
    const q=C.review('recruit',{columnId:b.id,unitId:'arch',count:40}),accepted=q.review.allowed && M.commit(s,q),repeat=!M.commit(s,q);
    const after=C.totals();C.host(1).at='dune_pass';
    const remote=C.review('recruit',{columnId:b.id,unitId:'arch',count:1});
    return {denied:!denied.review.allowed,short:!short.review.allowed,locked:!locked.review.allowed && locked.review.reason==='technology',accepted:accepted,repeat:repeat,
      exact:C.host(1).men===40 && C.host(1).units.arch===40,people:after.people===before.people,
      money:Math.abs(before.money-after.money-q.review.cost)<0.000001,privateGold:after.privateGold===before.privateGold,
      remote:!remote.review.allowed,valid:M.validate(s)};
  });
  expect(result).toEqual({denied:true,short:true,locked:true,accepted:true,repeat:true,exact:true,people:true,money:true,privateGold:true,remote:true,valid:true});
});

test('partial civilian settlement retains remote field people, private property and original residents',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),m=M.migration(s,C.rid);
    s.owner[m.at]=C.rid;s.holder[m.at]=C.rid;C.host(1).at='dune_pass';C.host(1).from='dune_pass';FB.invalidateRealmCache();
    const field=JSON.stringify(C.host(1)),residents=s.population.counties[m.at].count,total=M.total(s,C.rid),
      privateState=JSON.stringify([s.player.provinceId,s.player.gold,s.player.holdings]);
    const q=M.review(s,{realmId:C.rid,action:'settle',terms:{countyId:m.at,count:20,final:false},actor:{kind:'character',id:r.leaderId}});
    const accepted=q.review.allowed && M.commit(s,q),repeat=!M.commit(s,q);
    return {accepted:accepted,repeat:repeat,field:JSON.stringify(C.host(1))===field,
      residents:s.population.counties[m.at].count===residents+20,people:M.total(s,C.rid)===total-20,
      privateState:JSON.stringify([s.player.provinceId,s.player.gold,s.player.holdings])===privateState,
      active:r.status==='active',valid:M.validate(s)};
  });
  expect(result).toEqual({accepted:true,repeat:true,field:true,residents:true,people:true,privateState:true,active:true,valid:true});
});

test('changed peaceful passage stops only the affected field route and does not carry the camp',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),c=r.columns.entries[0],a=C.host(0),other=C.host(1);
    const plan=FB.armyOrderPlan(s,a,'dune_flats');
    plan.path.forEach(function (pid) {s.owner[pid]=C.rid;s.holder[pid]=C.rid;});FB.invalidateRealmCache();
    const q=C.review('march',{columnId:c.id,countyId:'dune_flats'}),ordered=q.review.allowed && M.commit(s,q),camp=M.migration(s,C.rid).at;
    const checkpoint=a.at,otherPath=JSON.stringify([other.at,other.path,other.goal]);
    s.owner.dune_flats='dune_oasis';s.holder.dune_flats='dune_oasis';FB.invalidateRealmCache();M.day(s);
    return {ordered:ordered,stopped:!a.path.length && !a.moveLeft && !a.goal,checkpoint:a.at===checkpoint,
      camp:M.migration(s,C.rid).at===camp,other:JSON.stringify([other.at,other.path,other.goal])===otherPath,valid:M.validate(s)};
  });
  expect(result).toEqual({ordered:true,stopped:true,checkpoint:true,camp:true,other:true,valid:true});
});

test('column capabilities have no invented technology prerequisite',async function ({page},info) {
  await start(page,info,'harbor');
  const modes=await page.evaluate(function () {return ['mobile_column_orders','mobile_column_reorganization','mobile_column_settlement']
    .map(function (id) {return FBDATA.techImpactReviews.features[id].mode;});});
  expect(modes).toEqual(['none','none','none']);
});

test('recovery refuses insufficient public funds without spending private gold or touching pools',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,c=M.row(s,C.rid).columns.entries[0];
    const money=FB.treasuryAvailable(s,C.rid);if (!FB.treasurySpend(s,C.rid,money)) throw new Error('Could not stage exhausted public funds');
    const before=JSON.stringify(s),q=C.review('recruit',{columnId:c.id,unitId:'arch',count:1});
    return {denied:!q.review.allowed && q.review.reason==='funds',refused:!M.commit(s,q),pure:before===JSON.stringify(s)};
  });
  expect(result).toEqual({denied:true,refused:true,pure:true});
});

test('an explicit existing-member assignment replaces unavailable field authority and validates schema 2',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),c=r.columns.entries[1],old=c.commanderId;
    s.chars[old].captive=true;
    const before=C.totals(),noOrder=!C.review('march',{columnId:c.id,countyId:C.host(1).at}).review.allowed;
    const assigned=C.apply('assign',{columnId:c.id,candidateId:r.leaderId});
    const available=C.review('march',{columnId:c.id,countyId:C.host(1).at}).review.allowed;
    const bytes=JSON.stringify([r,s.armies]);FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,row=M.row(restored,C.rid),matching=bytes===JSON.stringify([row,restored.armies]);
    const bad=JSON.parse(JSON.stringify(restored));M.row(bad,C.rid).columns.entries[1].commanderId=restored.player.charId;
    const candidate=JSON.stringify(bad);let rejected=false;try {M.validate(bad);} catch(error) {rejected=true;}
    return {noOrder:noOrder,assigned:assigned,schema:row.columns.schema,available:available,matching:matching,
      same:JSON.stringify(C.totals())===JSON.stringify(before),rejected:rejected,pure:candidate===JSON.stringify(bad),valid:M.validate(restored)};
  });
  expect(result).toEqual({noOrder:true,assigned:true,schema:2,available:true,matching:true,same:true,rejected:true,pure:true,valid:true});
});

test('every cached route stops on expired overall authority before the next army movement',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),camp=M.migration(s,C.rid).at;
    const hosts=r.columns.entries.map(function (c,i) {const a=C.host(i);a.path=['dune_pass'];a.goal='dune_pass';a.moveLeft=2;return a;});
    const people=M.total(s,C.rid);s.turn=270;M.day(s);
    return {stopped:hosts.every(function (a) {return !a.goal && !a.moveLeft && !a.path.length;}),
      camp:M.migration(s,C.rid).at===camp,people:M.total(s,C.rid)===people,noHeir:r.leaderId===r.columns.entries[0].commanderId,valid:M.validate(s)};
  });
  expect(result).toEqual({stopped:true,camp:true,people:true,noHeir:true,valid:true});
});

test('raw map, split and merge entry points cannot bypass reviewed demographic transactions',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,before=JSON.stringify(s),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    const a=C.host(0),b=C.host(1),denied=!FB.orderArmy(s,a,'dune_pass') && !FB.splitHost(s,a) && !FB.mergeHosts(s,a,b);
    return {denied:denied,pure:before===JSON.stringify(s) && rng===(FB.getRngState()>>>0) && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({denied:true,pure:true});
});

test('final settlement waits for all surviving columns and transfers people once after reunion',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),m=M.migration(s,C.rid),actor={kind:'character',id:r.leaderId};
    s.owner[m.at]=C.rid;s.holder[m.at]=C.rid;FB.invalidateRealmCache();
    const count=M.total(s,C.rid),local=s.population.counties[m.at].count,leader=r.leaderId,
      command=JSON.stringify(r.command),identities=Object.keys(s.chars).sort();
    function review() {return M.review(s,{realmId:C.rid,action:'settle',terms:{countyId:m.at,count:count,final:true},actor:actor});}
    const blocked=!review().review.allowed;
    const returned=r.columns.entries.every(function (c) {return C.apply('demuster',{columnId:c.id});});
    const q=review(),settled=q.review.allowed && M.commit(s,q),repeat=!M.commit(s,q);
    const population=s.population.counties[m.at].count;
    return {blocked:blocked,returned:returned,settled:settled,repeat:repeat,people:M.total(s,C.rid)===0,
      local:population===local+count,account:r.accounting.settled===count,status:r.status,
      leader:FB.realmRulerCharacterSnapshot(s,C.rid).id===leader,
      mandate:JSON.stringify(r.command)===command && !M.commandValid(s,C.rid),
      identities:JSON.stringify(identities)===JSON.stringify(Object.keys(s.chars).sort()),valid:M.validate(s)};
  });
  expect(result).toEqual({blocked:true,returned:true,settled:true,repeat:true,people:true,local:true,account:true,status:'settled',leader:true,mandate:true,identities:true,valid:true});
});

test('independent column campaigns preserve other host war references and truthful permissions',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),a=C.host(0),b=C.host(1),column=r.columns.entries[0];
    // The fictional gate already controls this adjacent physical county.
    const target=Object.keys(FB.world.adj[a.at] || {}).find(function (pid) {return s.owner[pid]==='dune_gate';});
    if (!target) throw new Error('The fictional command has no adjacent gate objective');
    const existing=FB.registerOrdinaryWar(s,'dune_oasis',{enemy:C.rid,target:'dune_well',
      objectives:[{type:'aggression',target:'dune_well'}],legacy:false});
    if (!existing) throw new Error('The separate defensive war did not register');
    b.warId=existing.id;const before=b.warId;
    const q=C.review('war',{columnId:column.id,causes:[{type:'aggression',enemy:'dune_gate',target:target}]}),
      accepted=q.review.allowed && M.commit(s,q),repeat=!M.commit(s,q);
    const war=FB.ordinaryWarById(s,a.warId),same=b.warId===before;
    const denied=C.review('merge',{columnId:r.columns.entries[0].id,otherColumnId:r.columns.entries[1].id});
    return {accepted:accepted,repeat:repeat,war:!!war && war.attacker===C.rid,same:same,
      merge:!denied.review.allowed,route:!a.path.length,camp:M.migration(s,C.rid).at===a.at,valid:M.validate(s)};
  });
  expect(result).toEqual({accepted:true,repeat:true,war:true,same:true,merge:true,route:true,camp:true,valid:true});
});

test('matching restore replays the same reviewed reorganization without identity or random draws',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=columnTest,M=FB.mobile,r=M.row(FB.state,C.rid),[a,b]=r.columns.entries;
    const saved=FB.save.serialize(),rng=FB.getRngState()>>>0,uid=FB.getUidCounter();
    function operation() {if (!C.apply('merge',{columnId:a.id,otherColumnId:b.id}) ||
        !C.apply('split',{columnId:a.id,otherColumnId:b.id,unitId:'arch',count:40})) throw new Error('Reorganization failed');
      return JSON.stringify([M.row(FB.state,C.rid),FB.state.armies]);}
    const first=operation();FB.save.restore(JSON.parse(saved));const second=operation();
    return {same:first===second,rng:rng===(FB.getRngState()>>>0),uid:uid===FB.getUidCounter(),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({same:true,rng:true,uid:true,valid:true});
});

test('single-host command settlement retains its living principal and archived mandate across restore',async function ({page},info) {
  await start(page,info,'dune',true);
  const result=await page.evaluate(function () {
    const C=columnTest,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),m=M.migration(s,C.rid),leader=r.leaderId;
    s.owner[m.at]=C.rid;s.holder[m.at]=C.rid;FB.invalidateRealmCache();
    const mandate=JSON.stringify(r.command),count=M.total(s,C.rid),ids=JSON.stringify(Object.keys(s.chars).sort());
    const q=M.review(s,{realmId:C.rid,action:'settle',terms:{countyId:m.at,count:count,final:true},actor:{kind:'character',id:leader}});
    const accepted=q.review.allowed && M.commit(s,q);
    if (!accepted) return {accepted:false};
    const saved=FB.save.serialize();FB.save.restore(JSON.parse(saved));const v=FB.state;
    return {accepted:accepted,leader:FB.realmRulerCharacterSnapshot(v,C.rid).id===leader,
      sameMandate:JSON.stringify(M.row(v,C.rid).command)===mandate,inactive:!M.commandValid(v,C.rid),
      noPeople:M.total(v,C.rid)===0,identities:JSON.stringify(Object.keys(v.chars).sort())===ids,valid:M.validate(v)};
  });
  expect(result).toEqual({accepted:true,leader:true,sameMandate:true,inactive:true,noPeople:true,identities:true,valid:true});
});

for (const viewport of [{width:1280,height:900},{width:390,height:844}]) {
  test('column review controls retain selections and focus at '+viewport.width+' pixels',async function ({page},info) {
    await page.setViewportSize(viewport);await start(page,info,'dune');
    await page.evaluate(function () {
      const r=FB.mobile.row(FB.state,columnTest.rid);FB.state.player.charId=r.leaderId;FB.ui.showMobileConfederation(columnTest.rid);
    });
    const second=await page.locator('#mobile-column option').nth(1).getAttribute('value');
    const first=await page.locator('#mobile-column option').first().getAttribute('value');
    await page.locator('#mobile-column').selectOption(second);
    await page.locator('#mobile-other-column').selectOption(first);
    await expect(page.locator('#mobile-column')).toHaveValue(second);
    const label=page.getByRole('button',{name:'Reunite into selected column',exact:true});
    await label.click();await expect(page.locator('#mobile-confirm')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobile-column')).toHaveValue(second);
    await expect(label).toBeFocused();
  });
}
