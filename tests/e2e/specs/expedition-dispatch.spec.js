'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-dispatch-harbor.json'),
  dune:require('../fixtures/authoring/expedition-dispatch-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/expedition_programs.js','js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/government_selection.js','js/governments.js','js/government_support.js','js/authority.js','js/population.js',
  'js/market.js','js/treasury.js','js/logistics.js','js/armies.js','js/federates.js','js/technology.js','js/model.js',
  'js/mods.js','js/world.js','js/bookmark_setup.js','js/starts.js','js/save.js','js/save_v4.js','js/home_authority.js',
  'js/main.js','js/util.js']);

async function start(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  if (input) await page.locator('#modfile').setInputFiles({name:'dispatch.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expedition-dispatch-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function () {
    const s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
    window.dispatchCase={rid:FB.startRealmId(s,d.id),definition:d,
      host:function (s,index) {const r=FB.mobile.row(s,this.rid),c=r.columns && r.columns.entries[index || 0];
        return c ? s.armies.find(function (a) {return a.id===c.hostId;}) : FB.mobile.host(s,this.rid);},
      control:function (s,action,stepId) {return FB.expeditionPrograms.reviewControl(s,{realmId:this.rid,action:action,
        stepId:stepId || null,actor:{kind:'character',id:FB.mobile.row(s,this.rid).leaderId}});}};
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' JSON daily dispatch makes a real distinct field or camp trip and preserves home',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s),home=s.player.provinceId;
      const origin=a.at,camp=M.migration(s,C.rid).at,ids=s.armies.filter(function (a) {return a.realm===C.rid;}).map(function (a) {return a.id;});
      const q=E.review(s,C.rid,'approach'),accepted=E.commit(s,q),repeat=!E.commit(s,q),issued=a.goal;
      const noTeleport=a.at===origin && M.migration(s,C.rid).at===camp && r.expeditionProgram.steps[0].cursor===0;
      let days=0;
      // Movement itself is under test: use the real daily movement owners,
      // bounded to one season, and stop after the first actual waypoint.
      while (days<80 && r.expeditionProgram.steps[0].cursor===0) {
        s.turn++;days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);
      }
      const bytes=JSON.stringify(s);E.day(s);const sameDay=bytes===JSON.stringify(s);
      return {accepted:accepted,repeat:repeat,noTeleport:noTeleport,arrived:a.at===issued,days:days,
        progressed:r.expeditionProgram.steps[0].cursor===1,campMoved:M.migration(s,C.rid).at!==camp,
        home:s.player.provinceId===home,ids:JSON.stringify(ids)===JSON.stringify(s.armies.filter(function (a) {return a.realm===C.rid;}).map(function (a) {return a.id;})),
        sameDay:sameDay,valid:M.validate(s),tech:FBDATA.techImpactReviews.features.expedition_program_dispatch.mode};
    });
    expect(result).toMatchObject({accepted:true,repeat:true,noTeleport:true,arrived:true,progressed:true,
      campMoved:prefix==='dune',home:true,ids:true,sameDay:true,valid:true,tech:'none'});
    expect(result.days).toBeLessThanOrEqual(80);
  });
}

test('full stale projections reject without changing resources, progress, RNG or identities',async function ({page},info) {
  await start(page,info,'dune');
  const results=await page.evaluate(function () {
    const C=dispatchCase,E=FB.expeditionPrograms,M=FB.mobile;
    return [function (s,r,a) {s.turn++;},function (s,r,a) {r.members[0].allegiance=false;},
      function (s,r,a) {r.command.status='recalled';},function (s,r,a) {a.warId='changed';},
      function (s,r,a) {a.mobileFood++;},function (s,r,a) {FB.treasuryCredit(s,C.rid,1);},
      function (s,r,a) {r.agreements=[];},function (s,r,a) {s.chars[r.leaderId].captive=true;},
      function (s,r,a) {s.holder.dune_flats='dune_gate';},function (s,r,a) {a.path=[a.at];a.moveLeft=1;},
      function (s,r,a) {a.holdManual=1;}].map(function (change) {
        const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,C.rid),a=C.host(s),q=E.review(s,C.rid,'approach');
        change(s,r,a);const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !E.commit(s,q) && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      });
  });
  expect(results).toEqual(Array(11).fill(true));
});

test('committed supplies conserve real public money and stock and offers never accept outside consent',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s,1);
    // Stage a halted remote column at a genuinely consented local market.
    a.at='dune_flats';a.from=a.at;
    const q=E.review(s,C.rid,'refit'),money=FB.treasuryAvailable(s,C.rid),food=a.mobileFood,
      stock=FB.marketProvisionSnapshot(s,a.at).stock,people=M.total(s,C.rid),privateGold=s.player.gold;
    const paid=q.allowed && E.commit(s,q),repeat=!E.commit(s,q),cost=q.operation.review.cost,count=q.operation.review.terms.count;
    const offer=E.review(s,C.rid,'request_passage'),accepted=E.commit(s,offer),last=r.agreements[r.agreements.length-1];
    return {paid:paid,repeat:repeat,exact:Math.abs(money-FB.treasuryAvailable(s,C.rid)-cost)<0.000001,
      stock:stock-FB.marketProvisionSnapshot(s,a.at).stock===count,food:a.mobileFood-food===count,
      people:M.total(s,C.rid)===people,privateGold:s.player.gold===privateGold,offer:accepted,offered:last.status==='offered',
      noPassage:last.startTurn===s.turn && last.price===7,valid:M.validate(s)};
  });
  expect(result).toEqual({paid:true,repeat:true,exact:true,stock:true,food:true,people:true,privateGold:true,offer:true,offered:true,noPassage:true,valid:true});
});

test('manual canonical orders pause intent, preserve their path and invalidate outstanding controls',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s);
    E.commit(s,E.review(s,C.rid,'approach'));const old=C.control(s,'cancel');
    const q=M.reviewColumns(s,{realmId:C.rid,action:'stop',terms:{columnId:r.columns.entries[0].id},actor:{kind:'character',id:r.leaderId}});
    const stopped=M.commit(s,q),bytes=JSON.stringify(a),stale=!M.commit(s,old);E.day(s);
    const paused=r.expeditionProgram.execution.paused,unchanged=bytes===JSON.stringify(a),reason=E.review(s,C.rid,'approach').reason;
    const resumed=M.commit(s,C.control(s,'resume'));s.turn++;E.day(s);
    return {stopped:stopped,stale:stale,paused:paused,unchanged:unchanged,reason:reason,resumed:resumed,
      moving:a.path.length>0,valid:M.validate(s)};
  });
  expect(result).toEqual({stopped:true,stale:true,paused:true,unchanged:true,reason:'paused',resumed:true,moving:true,valid:true});
});

test('lost access, mandate, supplies and window stop owned marches without teleporting or completing them',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=dispatchCase,E=FB.expeditionPrograms,M=FB.mobile;
    return [function (s,r,a) {r.agreements=[];},function (s,r,a) {r.command.status='recalled';},
      function (s,r,a) {s.chars[r.leaderId].dead=true;},function (s,r,a) {r.members[0].allegiance=false;},
      function (s,r,a) {s.turn=120;},function (s,r,a) {a.warId='changed';},
      function (s,r,a) {FB.disbandArmy(s,a);}].map(function (change) {
        const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,C.rid),a=C.host(s),at=a.at;
        const issued=E.commit(s,E.review(s,C.rid,'approach'));change(s,r,a);E.reconcile(s);
        return issued && a.at===at && (!s.armies.includes(a) || !a.path.length && !a.moveLeft) && !r.expeditionProgram.execution.orders.length &&
          r.expeditionProgram.steps[0].cursor===0 && r.expeditionProgram.steps[0].status!=='complete';
      });
  });
  expect(result).toEqual(Array(7).fill(true));
});

test('redirection selects an eligible declared withdrawal, cancels competing intent and uses a real route',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),p=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram;
  const back=JSON.parse(JSON.stringify(p.steps[0]));back.id='withdraw';back.terms.waypoints=['harbor_quay'];p.steps.push(back);
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s);
    // Stage a dated field position, then exercise both real canonical routes.
    a.at='harbor_gardens';a.from=a.at;r.expeditionProgram.steps[0].cursor=1;
    const initial=E.commit(s,E.review(s,C.rid,'approach')),at=a.at;
    const bytes=JSON.stringify(s),q=C.control(s,'redirect','withdraw'),pure=bytes===JSON.stringify(s);
    const redirected=M.commit(s,q),repeat=!M.commit(s,q);E.day(s);
    return {initial:initial,pure:pure,redirected:redirected,repeat:repeat,cancelled:r.expeditionProgram.steps[0].status==='cancelled',
      real:a.goal==='harbor_quay' && a.path.length>0,noTeleport:a.at===at,camp:M.migration(s,C.rid).at==='harbor_quay',valid:M.validate(s)};
  });
  expect(result).toEqual({initial:true,pure:true,redirected:true,repeat:true,cancelled:true,real:true,noTeleport:true,camp:true,valid:true});
});

test('matching saves preserve in-flight tickets without replay, malformed execution fails without repair',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid);
    E.commit(s,E.review(s,C.rid,'approach'));
    const bytes=JSON.stringify([r.expeditionProgram,s.armies,r.members,r.food]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));const restored=FB.state,rr=M.row(restored,C.rid);
    const same=bytes===JSON.stringify([rr.expeditionProgram,restored.armies,rr.members,rr.food]);
    const bad=[function (p) {p.execution.lastTurn=restored.turn+1;},function (p) {p.execution.paused=true;},
      function (p) {p.execution.orders[0].hostId='forged';},function (p) {p.execution.orders[0].countyId='missing';},
      function (p) {p.execution.orders[0].issuedTurn=restored.turn+1;},function (p) {p.execution.orders.push(p.execution.orders[0]);},
      function (p) {p.execution.extra=true;},function (p) {p.execution.orders[0].actorId='missing';}].every(function (change) {
        const v=JSON.parse(JSON.stringify(restored));change(M.row(v,C.rid).expeditionProgram);const before=JSON.stringify(v);
        let rejected=false;try {M.validate(v);} catch(error) {rejected=true;}return rejected && before===JSON.stringify(v);
      });
    const cancelled=M.commit(restored,C.control(restored,'cancel')),closed=JSON.stringify(M.row(restored,C.rid).expeditionProgram);
    FB.save.restore(JSON.parse(FB.save.serialize()));E.day(FB.state);
    return {same:same,rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter(),bad:bad,cancelled:cancelled,
      closed:closed===JSON.stringify(M.row(FB.state,C.rid).expeditionProgram),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({same:true,rng:true,uid:true,bad:true,cancelled:true,closed:true,valid:true});
});

test('a wait consumes no resources, expiry closes without rewards and war dispatch records only declaration',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),p=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram;
  p.steps.find(function (a) {return a.id==='hold';}).after=[];
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid);
    const early=E.review(s,C.rid,'hold'),bytes=JSON.stringify(s),refused=!E.commit(s,early),pure=bytes===JSON.stringify(s);
    s.turn=10;const food=r.food,money=FB.treasuryAvailable(s,C.rid),people=M.total(s,C.rid),wait=E.commit(s,E.review(s,C.rid,'hold'));
    const conserved=food===r.food && money===FB.treasuryAvailable(s,C.rid) && people===M.total(s,C.rid);
    s.turn=30;const owners=JSON.stringify(s.owner),q=E.review(s,C.rid,'frontier_objective'),war=E.commit(s,q),repeat=!E.commit(s,q);
    const army=C.host(s,1),actual=FB.ordinaryWarById(s,army.warId);
    s.turn=240;E.reconcile(s);
    return {refused:refused,pure:pure,wait:wait,conserved:conserved,war:war,repeat:repeat,registered:!!actual,
      noConquest:owners===JSON.stringify(s.owner),expired:r.expeditionProgram.steps[0].status==='expired',valid:M.validate(s)};
  });
  expect(result).toEqual({refused:true,pure:true,wait:true,conserved:true,war:true,repeat:true,registered:true,noConquest:true,expired:true,valid:true});
});

test('exhausted resources suspend a ticket, player command withholds AI and exact replay yields the same facts',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),p=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram;
  p.steps[0].requirements.minFood=1;p.steps[0].requirements.minTreasury=1;
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=dispatchCase,E=FB.expeditionPrograms,M=FB.mobile,base=JSON.parse(JSON.stringify(FB.state));
    const stopped=['food','money'].every(function (kind) {
      const s=JSON.parse(JSON.stringify(base)),a=C.host(s);a.mobileFood=2;
      const ok=E.commit(s,E.review(s,C.rid,'approach'));
      if (kind==='food') a.mobileFood=0;else FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));
      const at=a.at;E.reconcile(s);return ok && a.at===at && !a.path.length && !a.moveLeft;
    });
    const player=JSON.parse(JSON.stringify(base)),r=M.row(player,C.rid);player.player.charId=r.leaderId;
    const bytes=JSON.stringify(player);E.day(player);const manual=bytes===JSON.stringify(player);
    function replay() {const s=JSON.parse(JSON.stringify(base));C.host(s).mobileFood=2;E.day(s);return JSON.stringify(s);}
    const rng=FB.getRngState(),uid=FB.getUidCounter(),a=replay(),b=replay();
    return {stopped:stopped,manual:manual,replay:a===b,rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
  });
  expect(result).toEqual({stopped:true,manual:true,replay:true,rng:true,uid:true});
});

test('single-host raw orders pause intent and matching legacy records upgrade only through a live commit',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),t=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile;
  delete t.columns;t.expeditionProgram.steps.forEach(function (a) {a.columnId=null;});
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s);
    const legacy=r.expeditionProgram.schema===1;FB.save.restore(JSON.parse(FB.save.serialize()));
    const current=FB.state,rr=M.row(current,C.rid),old=rr.expeditionProgram.schema===1;
    const q=E.review(current,C.rid,'approach'),issued=E.commit(current,q),host=C.host(current);
    const manual=FB.orderArmy(current,host,host.at),before=JSON.stringify(host);E.day(current);
    return {legacy:legacy,old:old,issued:issued,manual:manual,paused:rr.expeditionProgram.execution.paused,
      same:before===JSON.stringify(host),schema:rr.expeditionProgram.schema,valid:M.validate(current)};
  });
  expect(result).toEqual({legacy:true,old:true,issued:true,manual:true,paused:true,same:true,schema:2,valid:true});
});

test('malformed or unauthorized controls refuse purely and manual replacement routes survive cancellation',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=dispatchCase,s=FB.state,E=FB.expeditionPrograms,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s);
    const bad=[{realmId:C.rid,action:'cancel',stepId:null,actor:{kind:'character',id:s.player.charId}},
      {realmId:C.rid,action:'cancel',stepId:null,actor:{kind:'realm',id:C.rid}},
      {realmId:C.rid,action:'redirect',stepId:'missing',actor:{kind:'character',id:r.leaderId}},
      {realmId:C.rid,action:'teleport',stepId:null,actor:{kind:'character',id:r.leaderId}},
      {realmId:C.rid,action:'cancel',stepId:null,actor:{kind:'character',id:r.leaderId},extra:true}];
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const refused=bad.every(function (request) {const q=E.reviewControl(s,request);return !q.review.allowed && !M.commit(s,q);});
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    E.commit(s,E.review(s,C.rid,'approach'));
    // Explicitly reissue the same destination through the manual transaction.
    // Its route remains manual even though the old program chose that place.
    const q=M.reviewColumns(s,{realmId:C.rid,action:'march',terms:{columnId:r.columns.entries[0].id,countyId:a.goal},
      actor:{kind:'character',id:r.leaderId}}),manual=M.commit(s,q),path=JSON.stringify([a.goal,a.path,a.moveLeft]);
    const cancelled=M.commit(s,C.control(s,'cancel'));E.day(s);
    return {refused:refused,pure:pure,manual:manual,cancelled:cancelled,preserved:path===JSON.stringify([a.goal,a.path,a.moveLeft]),valid:M.validate(s)};
  });
  expect(result).toEqual({refused:true,pure:true,manual:true,cancelled:true,preserved:true,valid:true});
});
