'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/program-local-access-harbor.json'),
  dune:require('../fixtures/authoring/program-local-access-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/political_institutions.js','data/technology.js',
  'js/expedition_programs.js','js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js',
  'js/story_expedition_program.js','js/story_expedition_preparation.js','js/home_authority.js','js/ui_mobile.js',
  'js/ui_misc.js','js/ui_modals.js','js/world.js','js/model.js','js/authority.js','js/governments.js',
  'js/government_selection.js','js/government_civic.js','js/government_lineage.js','js/bookmark_setup.js',
  'js/starts.js','js/main.js','js/stories.js','js/armies.js','js/federates.js','js/population.js',
  'js/market.js','js/treasury.js','js/logistics.js','js/save.js','js/save_v4.js','js/mods.js']);

async function start(page,info,prefix,outside,legacy) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+
    (legacy ? 'expedition-dispatch-' : 'program-local-access-')+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  if (outside) {
    await page.evaluate(function () {FB.startProgression.noteTier(7);});
    const full=page.locator('#btn-choose-beginning');
    if (await full.isVisible()) await full.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('OUTSIDE-dune_world-dune_outside_start-dune_pass-f-Kavi_Aran-standard');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.evaluate(function () {FB.game.setPaused(true);});
  } else await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function () {
    const s=FB.state,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;});
    window.localAccessCase={rid:d.id,definition:d,
      control:function (s,action) {return FB.expeditionPrograms.reviewControl(s,{realmId:this.rid,action:action,
        stepId:null,actor:{kind:'character',id:FB.mobile.row(s,this.rid).leaderId}});},
      negotiate:function (s) {
        const E=FB.expeditionPrograms,M=FB.mobile;
        // Real daily dispatch supplies the offers and separate NPC responses.
        // Never accept on behalf of an NPC from this helper.
        for (let i=0;i<8 && M.row(s,this.rid).expeditionProgram.steps[0].status==='pending';i++) {E.day(s);s.turn++;}
        return M.row(s,this.rid).expeditionProgram.steps[0].status==='complete';
      }};
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' complete ordinary import validates raw and effective worlds and selects actual holders purely',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function (prefix) {
      const s=FB.state,C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms,b=FBDATA.bookmarks[prefix+'_world'];
      const before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),q=E.review(s,C.rid,'permission');
      const errors=FB.validateBookmark(b),effective=FB.bookmarkRevisions(b.id).every(function (b) {return !FB.validateBookmark(b,true).length;});
      return {errors:errors,effective:effective,pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        allowed:q.allowed,action:q.operation.request.action,partner:q.operation.request.terms.partnerId,
        chain:q.operation.review.accessOrigin.chain.map(function (v) {return v.courtId;}),
        noAccess:!M.provisioningAccess(s,C.rid,q.operation.request.terms.countyIds[0]),
        tech:FBDATA.techImpactReviews.features.expedition_local_access.mode};
    },prefix);
    expect(r).toMatchObject({errors:[],effective:true,pure:true,allowed:true,action:'offer',noAccess:true,tech:'none'});
    expect(r.partner).toBe(prefix==='harbor' ? 'd_harbor_outer' : 'dune_gate');
    expect(r.chain).toEqual(prefix==='harbor' ? ['d_harbor_outer','harbor_upland'] : ['dune_gate']);
  });

  test(prefix+' normal daily dispatch obtains separate finite permissions with exact payment and no duplicate response',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function () {
      const C=localAccessCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,row=M.row(s,C.rid),
        money=FB.treasuryAvailable(s,C.rid),people=M.total(s,C.rid),land=JSON.stringify([s.owner,s.holder]),
        balances=Object.keys(s.realms).reduce(function (v,id) {v[id]=FB.treasuryAvailable(s,id);return v;},{});
      E.day(s);const first=row.agreements[0],offered=first && first.status==='offered' && !M.provisioningAccess(s,C.rid,first.countyIds[0]);
      const bytes=JSON.stringify(s);E.day(s);const bounded=bytes===JSON.stringify(s);s.turn++;
      const complete=C.negotiate(s),agreements=row.agreements.filter(function (a) {return a.accessOrigin;}),
        total=agreements.reduce(function (n,a) {return n+a.price;},0),credits={};
      agreements.forEach(function (a) {credits[a.partnerId]=(credits[a.partnerId] || 0)+a.price;});
      return {offered:offered,bounded:bounded,complete:complete,count:agreements.length,
        active:agreements.every(function (a) {return a.status==='active' && M.provisioningAccess(s,C.rid,a.countyIds[0]);}),
        paid:Math.abs(money-FB.treasuryAvailable(s,C.rid)-total)<1e-8,
        credited:Object.keys(credits).every(function (id) {return Math.abs(FB.treasuryAvailable(s,id)-balances[id]-credits[id])<1e-8;}),
        original:agreements.every(function (a) {return a.accessOrigin.chain[0].personId===FB.realmRulerCharacterSnapshot(s,a.partnerId).id;}),
        unchanged:people===M.total(s,C.rid) && land===JSON.stringify([s.owner,s.holder]),valid:M.validate(s),schema:row.expeditionProgram.schema};
    });
    expect(r).toEqual({offered:true,bounded:true,complete:true,count:prefix==='harbor' ? 3 : 2,active:true,
      paid:true,credited:true,original:true,unchanged:true,valid:true,schema:4});
  });

  test(prefix+' actual route preflight and movement preserve distinct camp and field locations',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function (prefix) {
      const C=localAccessCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms;
      const complete=C.negotiate(s),a=M.host(s,C.rid),origin=a.at,camp=M.migration(s,C.rid).at,
        q=E.review(s,C.rid,'approach'),issued=E.commit(s,q),target=a.goal;
      const actualPath=q.operation.review.path.every(function (pid) {return M.passage(s,C.rid,pid,prefix==='harbor');});
      let days=0;
      while (days<25 && a.at!==target) {s.turn++;days++;FB.mobileDay(s);FB.armyTick(s);FB.federateDay(s);}
      return {complete:complete,issued:issued,actualPath:actualPath,arrived:a.at===target && target!==origin,
        camp:prefix==='harbor' ? M.migration(s,C.rid).at===target : M.migration(s,C.rid).at===camp,valid:M.validate(s)};
    },prefix);
    expect(r).toEqual({complete:true,issued:true,actualPath:true,arrived:true,camp:true,valid:true});
  });

  test(prefix+' pending offered accepted in-flight and terminal saves restore repeatedly without replay',async function ({page},info) {
    await start(page,info,prefix);
    const r=await page.evaluate(function () {
      const C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms;
      function roundtrip() {
        const s=FB.state,row=M.row(s,C.rid),before=JSON.stringify([row,s.armies,s.owner,s.holder,s.treasury,s.market,s.population]),
          rng=FB.getRngState(),uid=FB.getUidCounter();
        for (let i=0;i<2;i++) FB.save.restore(JSON.parse(FB.save.serialize()));
        const now=FB.state;
        return before===JSON.stringify([M.row(now,C.rid),now.armies,now.owner,now.holder,now.treasury,now.market,now.population]) &&
          rng===FB.getRngState() && uid===FB.getUidCounter() && M.validate(now);
      }
      const pending=roundtrip();E.day(FB.state);const offered=roundtrip();FB.state.turn++;
      E.day(FB.state);const accepted=roundtrip();FB.state.turn++;
      const complete=C.negotiate(FB.state);const q=E.review(FB.state,C.rid,'approach'),issued=E.commit(FB.state,q),flight=roundtrip();
      const cancelled=M.commit(FB.state,C.control(FB.state,'cancel')),terminal=roundtrip();
      return {pending:pending,offered:offered,accepted:accepted,complete:complete,issued:issued,flight:flight,cancelled:cancelled,terminal:terminal};
    });
    expect(r).toEqual({pending:true,offered:true,accepted:true,complete:true,issued:true,flight:true,cancelled:true,terminal:true});
  });
}

test('invalid typed declarations reject purely, including attempts to require a positive optional purchase',async function ({page},info) {
  await openGame(page,info);
  const r=await page.evaluate(function (source) {
    const changes=[function (m) {m.expeditionProgram.steps[0].terms.partnerRealmId='dune_gate';},
      function (m) {m.expeditionProgram.steps[0].terms.countyIds=[];},
      function (m) {m.expeditionProgram.steps[0].terms.countyIds=['missing'];},
      function (m) {m.expeditionProgram.steps[0].terms.countyIds=['dune_flats','dune_flats'];},
      function (m) {m.expeditionProgram.steps[0].terms.capacity=0;},
      function (m) {m.expeditionProgram.steps[0].terms.price=-1;},
      function (m) {m.expeditionProgram.steps[0].terms.duration=1441;},
      function (m) {m.expeditionProgram.steps[0].terms.allowRecruit='yes';},
      function (m) {m.expeditionProgram.steps[1].after=['stock'];},
      function (m) {m.expeditionProgram.steps[1].adapter='holy_objective';m.expeditionProgram.steps[1].terms={};},
      function (m) {const a=JSON.parse(JSON.stringify(m.expeditionProgram.steps[0]));a.id='repeat';m.expeditionProgram.steps.push(a);}];
    return changes.map(function (change) {
      const mod=JSON.parse(JSON.stringify(source));change(mod.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile);
      const bytes=JSON.stringify([mod,FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(mod).length>0 && bytes===JSON.stringify([mod,FBDATA,FB.state]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(r).toEqual(Array(11).fill(true));
});

test('outside NPC policy can refuse without acceptance payment or retargeting',async function ({page},info) {
  await start(page,info,'dune');
  const r=await page.evaluate(function () {
    const s=JSON.parse(JSON.stringify(FB.state)),C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms;
    // The imported oasis is an actual civic court whose ordinary AI withholds
    // negotiations. Move control before the request, never impersonate it.
    s.owner.dune_flats='dune_oasis';s.holder.dune_flats='dune_oasis';
    const money=FB.treasuryAvailable(s,C.rid);E.day(s);s.turn++;E.day(s);
    const a=M.row(s,C.rid).agreements[0],before=JSON.stringify(a);s.turn++;E.day(s);
    return {ended:a.status==='ended',one:M.row(s,C.rid).agreements.length===1,history:before===JSON.stringify(a),
      paid:money===FB.treasuryAvailable(s,C.rid),denied:!M.provisioningAccess(s,C.rid,'dune_flats'),
      pending:M.row(s,C.rid).expeditionProgram.steps[0].status==='pending',valid:M.validate(s)};
  });
  expect(r).toEqual({ended:true,one:true,history:true,paid:true,denied:true,pending:true,valid:true});
});

for (const decision of ['accept','decline']) {
  test('actual outside player explicitly chooses '+decision+' and NPC dispatch leaves that decision open',async function ({page},info) {
    await start(page,info,'dune',true);
    const r=await page.evaluate(function (decision) {
      const C=localAccessCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,row=M.row(s,C.rid);
      E.day(s);s.turn++;E.day(s);const a=row.agreements[0],pending=a.status==='offered',money=FB.treasuryAvailable(s,C.rid);
      const outsider=a.partnerId==='player' && a.accessOrigin.chain[0].personId===s.player.charId;
      const q=M.review(s,{realmId:C.rid,action:decision,terms:{agreementId:a.id},actor:{kind:'character',id:s.player.charId}}),
        done=M.commit(s,q),repeat=!M.commit(s,q);
      return {pending:pending,outsider:outsider,done:done,repeat:repeat,status:a.status,
        payment:Math.abs(money-FB.treasuryAvailable(s,C.rid)-(decision==='accept' ? a.price : 0))<1e-8,
        access:M.provisioningAccess(s,C.rid,a.countyIds[0]),valid:M.validate(s)};
    },decision);
    expect(r).toEqual({pending:true,outsider:true,done:true,repeat:true,status:decision==='accept' ? 'active' : 'ended',
      payment:true,access:decision==='accept',valid:true});
  });
}

test('stale control authority capacity funds and original-person facts reject atomically',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms,base=JSON.parse(JSON.stringify(FB.state));E.day(base);base.turn++;
    const changes=[function (s,a) {s.holder[a.countyIds[0]]='harbor_upland';},
      function (s,a) {s.owner[a.countyIds[0]]='harbor_commune';},
      function (s,a) {s.realms[a.partnerId].liege='harbor_commune';},
      function (s,a) {s.chars[a.accessOrigin.chain[0].personId].dead=true;},
      function (s,a) {s.chars[a.accessOrigin.chain[1].personId].captive=true;},
      function (s,a) {s.realms[a.partnerId].succession.rulerGeneration++;},
      function (s,a) {s.population.counties[a.countyIds[0]].count=1;},
      function (s) {FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));},
      function (s) {M.host(s,C.rid).holdManual=1;},function (s) {s.turn++;}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(base)),a=M.row(s,C.rid).agreements[0],q=E.review(s,C.rid,'permission');
      change(s,a);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return q.allowed && !E.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(r).toEqual(Array(10).fill(true));
});

test('expired and dead original counterparties retain history and never acquire successors or renewed permission',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms,base=JSON.parse(JSON.stringify(FB.state));C.negotiate(base);
    return ['death','expiry','holder'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(base)),row=M.row(s,C.rid),a=row.agreements[0],o=JSON.stringify(a.accessOrigin),original=s.chars[a.accessOrigin.chain[0].personId];
      if (kind==='death') {
        const succession=s.realms[a.partnerId].succession;
        FB.courtMemberDied(s,succession.members[succession.rulerMemberId],original);
      }
      else if (kind==='expiry') s.turn=a.endTurn;
      else s.holder[a.countyIds[0]]='harbor_upland';
      const count=row.agreements.length,money=FB.treasuryAvailable(s,C.rid);s.turn++;FB.mobileDay(s);
      return !M.provisioningAccess(s,C.rid,a.countyIds[0]) && a.status==='ended' && count===row.agreements.length &&
        o===JSON.stringify(a.accessOrigin) && FB.courtRecordRetained(s,original,{},{} ) &&
        money===FB.treasuryAvailable(s,C.rid) && M.validate(s);
    });
  });
  expect(r).toEqual([true,true,true]);
});

test('malformed optional access provenance and execution records fail detached restore without repair',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms,base=JSON.parse(JSON.stringify(FB.state));E.day(base);
    const changes=[function (r) {delete r.agreements[0].accessOrigin;},function (r) {delete r.agreements[0].programStepId;},
      function (r) {r.agreements[0].accessOrigin.extra=true;},function (r) {r.agreements[0].accessOrigin.chain=[];},
      function (r) {r.agreements[0].accessOrigin.chain[0].personId='missing';},
      function (r) {r.agreements[0].accessOrigin.chain[0].generation++;},
      function (r) {r.agreements[0].countyIds.push('harbor_ridge');},function (r) {r.agreements[0].price++;},
      function (r) {r.agreements[0].accessOrigin.offeredTurn=1;},function (r) {r.expeditionProgram.schema=2;},
      function (r) {r.expeditionProgram.execution.lastCommitTurn=1;},
      function (r) {delete r.expeditionProgram.steps[0].agreementIds;},
      function (r) {r.agreements=[];},function (r) {r.expeditionProgram.steps[0].agreementIds=[];},
      function (r) {r.agreements.push(JSON.parse(JSON.stringify(r.agreements[0])));r.agreements[1].id='forged';}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(base));change(M.row(s,C.rid));const before=JSON.stringify(s);
      let denied=false;try {M.validate(s);} catch(error) {denied=true;}return denied && before===JSON.stringify(s);
    });
  });
  expect(r).toEqual(Array(15).fill(true));
});

test('optional supply never gates a full-stock route and successful purchases conserve finite money and stock',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms;C.negotiate(s);
    const row=M.row(s,C.rid),full=!E.review(s,C.rid,'stock').allowed,route=E.review(s,C.rid,'approach').allowed;
    row.food=0;const q=E.review(s,C.rid,'stock'),money=FB.treasuryAvailable(s,C.rid),
      stock=FB.marketProvisionSnapshot(s,M.migration(s,C.rid).at).stock,
      quantity=q.operation.request.terms.count,paid=q.operation.review.cost,done=E.commit(s,q);
    return {full:full,route:route,done:done,finite:quantity>0 && quantity<=stock,
      cash:Math.abs(money-FB.treasuryAvailable(s,C.rid)-paid)<1e-8,
      stock:Math.abs(stock-FB.marketProvisionSnapshot(s,M.migration(s,C.rid).at).stock-quantity)<1e-8,
      food:row.food===quantity,replay:!E.commit(s,q),valid:M.validate(s)};
  });
  expect(r).toEqual({full:true,route:true,done:true,finite:true,cash:true,stock:true,food:true,replay:true,valid:true});
});

test('player command still receives a separate NPC response but never dispatches its own next step automatically',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,s=JSON.parse(JSON.stringify(FB.state)),E=FB.expeditionPrograms,M=FB.mobile,row=M.row(s,C.rid);
    E.day(s);s.player.charId=row.leaderId;s.turn++;E.day(s);
    const responded=row.agreements[0].status==='active',count=row.agreements.length; s.turn++;E.day(s);
    return {responded:responded,notOffered:row.agreements.length===count,
      pending:row.expeditionProgram.steps[0].status==='pending',noOrder:!M.host(s,C.rid).goal,valid:M.validate(s)};
  });
  expect(r).toEqual({responded:true,notOffered:true,pending:true,noOrder:true,valid:true});
});

test('lost route access stops only the owned order and a successful manual order survives pause and cancel',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,M=FB.mobile,E=FB.expeditionPrograms,base=JSON.parse(JSON.stringify(FB.state));C.negotiate(base);
    const s=JSON.parse(JSON.stringify(base)),a=M.host(s,C.rid),q=E.review(s,C.rid,'approach'),issued=E.commit(s,q),at=a.at;
    const access=M.row(s,C.rid).agreements.find(function (v) {return v.countyIds.indexOf(a.goal)>=0;});
    access.status='ended';E.reconcile(s);
    const stopped=a.at===at && !a.path.length && !a.moveLeft && !a.goal;
    const manualState=JSON.parse(JSON.stringify(base)),host=M.host(manualState,C.rid),go=E.commit(manualState,E.review(manualState,C.rid,'approach')),
      manual=FB.orderArmy(manualState,host,host.goal),path=JSON.stringify([host.path,host.goal,host.moveLeft]),
      paused=M.row(manualState,C.rid).expeditionProgram.execution.paused,
      cancelled=M.commit(manualState,C.control(manualState,'cancel'));E.day(manualState);
    return {issued:issued,stopped:stopped,go:go,manual:manual,paused:paused,cancelled:cancelled,
      kept:path===JSON.stringify([host.path,host.goal,host.moveLeft]),valid:M.validate(s) && M.validate(manualState)};
  });
  expect(r).toEqual({issued:true,stopped:true,go:true,manual:true,paused:true,cancelled:true,kept:true,valid:true});
});

test('original commander death invalidates permission and retains the original account and people without succession enrollment',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,s=FB.state,M=FB.mobile;C.negotiate(s);
    const row=M.row(s,C.rid),commander=s.chars[row.leaderId],origins=JSON.stringify(row.agreements.map(function (a) {return a.accessOrigin;})),
      money=FB.treasuryAvailable(s,C.rid),at=M.migration(s,C.rid).at,parties=row.agreements.reduce(function (ids,a) {
        return ids.concat(a.accessOrigin.chain.map(function (v) {return v.personId;}));
      },[]);
    FB.killChar(s,commander);FB.royalCharDied(s,commander,C.rid);s.turn++;FB.mobileDay(s);
    return {noLeader:!M.leader(s,C.rid),denied:row.agreements.every(function (a) {return !M.provisioningAccess(s,C.rid,a.countyIds[0]);}),
      original:origins===JSON.stringify(row.agreements.map(function (a) {return a.accessOrigin;})),
      retained:parties.every(function (id) {return !!s.chars[id];}) && !!s.chars[commander.id],
      noTransfer:money===FB.treasuryAvailable(s,C.rid) && at===M.migration(s,C.rid).at,valid:M.validate(s)};
  });
  expect(r).toEqual({noLeader:true,denied:true,original:true,retained:true,noTransfer:true,valid:true});
});

test('the actual outside ruler can decline through the ordinary deed and stale confirmation spends nothing',async function ({page},info) {
  await start(page,info,'dune',true);
  await page.evaluate(function () {
    const s=FB.state,C=localAccessCase;FB.expeditionPrograms.day(s);
    // Stage a local UI review after the ordinary offer, not consent or a trip.
    const m=FB.mobile.migration(s,C.rid),a=FB.mobile.host(s,C.rid);m.at=s.player.provinceId;a.at=m.at;a.from=m.at;
    FB.ui._shared.markActionsDirty();FB.ui._shared.renderActions();
  });
  await page.locator('[data-action-id="mobile_coalition"]').click();
  await page.locator('#mobile-list').getByRole('button',{name:'Decline as the outside court',exact:true}).click();
  await page.evaluate(function () {FB.mobile.row(FB.state,localAccessCase.rid).agreements[0].price++;});
  const before=await page.evaluate(function () {return JSON.stringify(FB.state);});
  await page.locator('#mobile-confirm').click();
  await expect(page.locator('#gm-title')).toHaveText('Terms changed');
  expect(await page.evaluate(function () {return JSON.stringify(FB.state);})).toBe(before);
  await page.evaluate(function () {FB.mobile.row(FB.state,localAccessCase.rid).agreements[0].price--;});
  await page.locator('#mobile-continue').click();
  await page.locator('#mobile-list').getByRole('button',{name:'Decline as the outside court',exact:true}).click();
  await page.locator('#mobile-confirm').click();
  expect(await page.evaluate(function () {return FB.mobile.row(FB.state,localAccessCase.rid).agreements[0].status;})).toBe('ended');
});

test('ordinary unopted program saves keep their original schema and acquire no access provenance',async function ({page},info) {
  await start(page,info,'harbor',false,true);
  const r=await page.evaluate(function () {
    const C=localAccessCase,s=FB.state,M=FB.mobile,row=M.row(s,C.rid),before=JSON.stringify([row.expeditionProgram,row.agreements]);
    FB.save.restore(JSON.parse(FB.save.serialize()));const now=M.row(FB.state,C.rid);
    return {schema:now.expeditionProgram.schema,same:before===JSON.stringify([now.expeditionProgram,now.agreements]),
      absent:now.agreements.every(function (a) {return a.accessOrigin===undefined && a.programStepId===undefined;}),valid:M.validate(FB.state)};
  });
  expect(r).toEqual({schema:1,same:true,absent:true,valid:true});
});

test('local dispatch replay preserves seeded state and a canonical marker cannot be recorded outside program commit',async function ({page},info) {
  await start(page,info,'harbor');
  const r=await page.evaluate(function () {
    const C=localAccessCase,E=FB.expeditionPrograms,M=FB.mobile,base=JSON.parse(JSON.stringify(FB.state)),
      rng=FB.getRngState(),uid=FB.getUidCounter();
    const q=E.review(base,C.rid,'permission'),before=JSON.stringify(base),direct=!M.commit(base,q.operation),pure=before===JSON.stringify(base);
    function replay() {const s=JSON.parse(JSON.stringify(base));C.negotiate(s);return JSON.stringify(s);}
    return {direct:direct,pure:pure,same:replay()===replay(),rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter()};
  });
  expect(r).toEqual({direct:true,pure:true,same:true,rng:true,uid:true});
});
