'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-opening-reserves-harbor.json'),
  dune:require('../fixtures/authoring/mobile-opening-reserves-dune.json')};
dependsOnRuntime(__filename,[
  'index.html','data/mobile_confederations.js','data/units.js','data/technology.js','data/eras.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/mobile_camps.js',
  'js/mobile_guard.js','js/expedition_programs.js','js/story_expedition_preparation.js',
  'js/authority.js','js/governments.js','js/government_selection.js','js/government_support.js',
  'js/armies.js','js/federates.js','js/population.js','js/technology.js','js/treasury.js',
  'js/market.js','js/logistics.js','js/bookmark_setup.js','js/model.js','js/stories.js',
  'js/starts.js','js/world.js','js/main.js','js/mods.js','js/save.js','js/save_v4.js']);

async function load(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  if (input) await page.locator('#modfile').setInputFiles({name:'reserves.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input))});
  else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/authoring/mobile-opening-reserves-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {
    return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];
  },prefix);
}
async function start(page,info,prefix,input) {
  await load(page,info,prefix,input);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' file import partitions existing people beside real columns and program intent',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,bm=FB.campaignBookmark(s),d=bm.realms.find(function (r) {return r.mobile;}),
        rid=FB.startRealmId(s,d.id),r=M.row(s,rid),p=M.profile(s,rid),o=d.mobile.opening,
        hosts=s.armies.filter(function (a) {return a.realm===rid && a.mobileFollowing;});
      function count(list) {return list.reduce(function (n,c) {return n+c.count;},0);}
      const conserved=r.members.every(function (m) {
        const definition=p.members.find(function (v) {return v.id===m.id;}),
          reserve=o.reserves.find(function (v) {return v.memberId===m.id;}),
          deployed=hosts.reduce(function (n,a) {return n+count(a.mobileRoster.filter(function (c) {return c.memberId===m.id;}));},0);
        return count(m.reserve)===(reserve ? reserve.count : 0) &&
          count(m.civilians)+count(m.reserve)+deployed===definition.population &&
          m.civilians.concat(m.reserve).every(function (c) {return c.culture===d.culture && c.religion===d.religion;});
      });
      const units=hosts.every(function (a,i) {
        const expected={};d.mobile.columns.entries[i].muster.forEach(function (v) {expected[v.unitId]=(expected[v.unitId] || 0)+v.count;});
        return FB.unitClassIds().every(function (id) {return a.units[id]===(expected[id] || 0);});
      });
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,bm.realms);FB.mobileInitializeAuthored(s,bm.realms);
      const repeat=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const q=FB.expeditionPrograms.review(s,rid,'approach'),at=hosts[0].at,
        ordered=q.allowed && FB.expeditionPrograms.commit(s,q);
      return {conserved:conserved,units:units,repeat:repeat,hosts:hosts.length,people:M.total(s,rid),
        initial:r.accounting.initial,arrivals:r.accounting.arrivals,men:hosts.reduce(function (n,a) {return n+a.men;},0),
        reserve:r.members.reduce(function (n,m) {return n+count(m.reserve);},0),
        food:r.food+hosts.reduce(function (n,a) {return n+a.mobileFood;},0),
        gold:FB.treasuryAvailable(s,rid),camp:M.migration(s,rid).at===d.mobile.origin && !r.camps,
        provenance:JSON.stringify(r.openingReserves)===(JSON.stringify({schema:1,allocations:o.reserves})),
        ordered:ordered,noTeleport:hosts[0].at===at,valid:M.validate(s),
        tech:FBDATA.techImpactReviews.features.mobile_opening_reserves.mode};
    });
    expect(result).toMatchObject({conserved:true,units:true,repeat:true,hosts:2,arrivals:0,men:160,
      food:2000,gold:70,camp:true,provenance:true,ordered:true,noTeleport:true,valid:true,tech:'none'});
    expect(result.people).toBe(result.initial);
    expect(result.reserve).toBe(prefix==='harbor' ? 280 : 790);
  });

  test(prefix+' matching restore preserves spent resources and depleted opening reserves',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const M=FB.mobile,s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),
        rid=FB.startRealmId(s,d.id),r=M.row(s,rid),a=s.armies.find(function (a) {return a.realm===rid && a.mobileFollowing;});
      FB.applyHostLosses(a,10,s);
      const m=r.members.find(function (m) {return m.reserve.length;});
      // Stage an already-accounted camp loss, then exercise matching restore.
      m.reserve[0].count-=7;r.accounting.dead+=7;r.food-=9;FB.treasurySpend(s,rid,3);
      const marker=JSON.stringify(r.openingReserves),before=JSON.stringify([r,s.armies,s.treasury,s.bookmarkSetup]),
        people=Object.keys(s.chars).length,money=FB.treasuryAvailable(s,rid),source=JSON.parse(FB.save.serialize());
      FB.save.restore(source);FB.save.restore(JSON.parse(FB.save.serialize()));
      const t=FB.state;
      return {same:before===JSON.stringify([M.row(t,rid),t.armies,t.treasury,t.bookmarkSetup]),
        marker:marker===JSON.stringify(M.row(t,rid).openingReserves),people:people===Object.keys(t.chars).length,
        money:money===FB.treasuryAvailable(t,rid),
        rng:(source.rng>>>0)===(FB.getRngState()>>>0),uid:source.uid===FB.getUidCounter(),valid:M.validate(t)};
    });
    expect(result).toEqual({same:true,marker:true,people:true,money:true,rng:true,uid:true,valid:true});
  });
}

test('single-host opening and observer creation use the same reserve constructor',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),d=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;});
  delete d.mobile.columns;
  d.mobile.opening.reserves=[{memberId:'reed_people',count:680}];
  d.mobile.expeditionProgram.steps.forEach(function (step) {step.columnId=null;});
  await load(page,info,'harbor',input);
  const result=await page.evaluate(async function () {
    await new Promise(function (resolve,reject) {FB.activateBookmark('harbor_world',null,function (e) {if(e) reject(e);else resolve();});});
    FB.game.pending={seed:'SINGLECAMPRESERVE'};FB.game.startObserve();FB.game.setPaused(true);
    const M=FB.mobile,s=FB.state,rid='harbor_following',r=M.row(s,rid),a=M.host(s,rid);
    return {observer:FB.game.observe,hosts:s.armies.filter(function (a) {return a.realm===rid;}).length,
      reserve:r.members[1].reserve[0].count,empty:r.members[1].civilians.length===0,
      omitted:r.members[0].reserve.length===0,men:a.men,total:M.total(s,rid),program:!!r.expeditionProgram,valid:M.validate(s)};
  });
  expect(result).toEqual({observer:true,hosts:1,reserve:680,empty:true,omitted:true,men:160,total:1400,program:true,valid:true});
});

test('a fresh player command keeps the same partition and separate private purse',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),command=require('../fixtures/authoring/expedition-command-harbor.json')
    .startScenarios.find(function (sc) {return sc.rulerRealmId;});
  input.startScenarios.push(command);input.bookmarks.harbor_world.starts.push(command.id);
  await load(page,info,'harbor',input);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('RESERVECOMMAND-harbor_world-'+command.id+'-harbor_quay-f-Lena_Reed-standard');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const result=await page.evaluate(function () {
    FB.game.setPaused(true);
    const M=FB.mobile,s=FB.state,rid='harbor_following',r=M.row(s,rid),me=s.chars[s.player.charId],
      before=JSON.stringify([r,s.armies]),money=FB.treasuryAvailable(s,rid);
    M.initialize(s,FB.campaignBookmark(s).realms);
    return {samePerson:M.leader(s,rid)===me && FB.bookmarkActor(s,'harbor_leader')===me,
      reserve:r.members.reduce(function (n,m) {return n+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0),
      repeat:before===JSON.stringify([r,s.armies]),privateGold:s.player.gold,publicGold:money,
      people:M.total(s,rid),valid:M.validate(s)};
  });
  expect(result).toEqual({samePerson:true,reserve:280,repeat:true,privateGold:7,publicGold:70,people:1400,valid:true});
});

test('detached reserve declarations reject malformed, excess and conflicting allocations without side effects',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[
      function (o) {o.reserves=null;},function (o) {o.reserves={};},function (o) {o.reserves=[];},
      function (o) {o.reserves[0]=null;},function (o) {o.reserves[0].count=-1;},
      function (o) {o.reserves[0].count=0.5;},function (o) {o.reserves[0].count='80';},
      function (o) {o.reserves[0].count=Number.MAX_SAFE_INTEGER+1;},
      function (o) {o.reserves[0].count=561;},function (o) {delete o.reserves[0].count;},
      function (o) {o.reserves[0].memberId='missing';},function (o) {o.reserves[0].memberId='constructor';},
      function (o) {o.reserves[1]=o.reserves[0];},function (o) {o.reserves.push(o.reserves[0]);},
      function (o) {o.reserves[0].unitId='inf';},function (o) {o.reserves[0].food=1;},
      function (o,t) {t.civilianCamps={schema:1,entries:[],fieldFood:0};},
      function (o,t) {t.preparationId='unformed_source';}
    ];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),t=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile;
      change(t.opening,t);
      const bytes=JSON.stringify(input),state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && state===JSON.stringify(FB.state) &&
        data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(18).fill(true));
});

test('whole-batch live preflight rejects before creating a person, host, camp or account',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),mobile=input.bookmarks.harbor_world.realms
    .find(function (r) {return r.mobile;}).mobile;
  delete mobile.columns;delete mobile.expeditionProgram;
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const source=FB.state,M=FB.mobile,d=FB.campaignBookmark(source).realms.find(function (r) {return r.mobile;});
    function fresh() {
      const s=JSON.parse(JSON.stringify(source));delete s.authority.governments[d.id].mobile;
      s.armies=s.armies.filter(function (a) {return a.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==d.id;});
      return s;
    }
    const ready=fresh(),bytes=JSON.stringify(ready),rng=FB.getRngState(),uid=FB.getUidCounter(),plan=M.openingPlan(ready,d),
      pure=plan.allowed && bytes===JSON.stringify(ready) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const rejected=['overflow','duplicate','preparation','camps','late','batch','changed','omitted'].map(function (kind) {
      const s=fresh(),bad=JSON.parse(JSON.stringify(d));
      if (kind==='overflow') bad.mobile.opening.reserves[0].count=561;
      if (kind==='duplicate') bad.mobile.opening.reserves[1]=bad.mobile.opening.reserves[0];
      if (kind==='preparation') bad.mobile.preparationId='future_preparation';
      if (kind==='camps') bad.mobile.civilianCamps={schema:1,entries:[],fieldFood:0};
      if (kind==='late') s.turn=1;
      if (kind==='changed') bad.mobile.opening.reserves[0].count++;
      if (kind==='omitted') delete bad.mobile.opening.reserves;
      const defs=kind==='batch' ? [d,Object.assign({},bad,{id:'absent_following'})] : [bad],
        bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {M.initialize(s,defs);} catch(e) {rejected=true;}
      return rejected && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    return {pure:pure,rejected:rejected};
  });
  expect(result).toEqual({pure:true,rejected:Array(8).fill(true)});
});

test('opening reserves retain paid recruitment, pledge and equipment gates',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),p=M.profile(s,rid),
      a=s.armies.find(function (a) {return a.id===r.columns.entries[0].hostId;});
    function reserves(row) {return row.members.reduce(function (n,m) {return n+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0);}
    const initial=M.total(s,rid),resting=reserves(r),money=FB.treasuryAvailable(s,rid),men=a.men,
      q=M.supplyReview(s,rid,'recruit'),paid=M.commit(s,q),count=q.request.terms.count;
    const charged=Math.abs(money-FB.treasuryAvailable(s,rid)-count*p.recruitCost)<0.000001;
    const blocked=['pledge','cash','custody'].map(function (kind) {
      const t=JSON.parse(JSON.stringify(s)),row=M.row(t,rid);
      if (kind==='pledge') row.members.forEach(function (m) {m.pledge=0;});
      if (kind==='cash') FB.treasurySpend(t,rid,FB.treasuryAvailable(t,rid));
      if (kind==='custody') t.chars[row.leaderId].captive=true;
      const before=JSON.stringify(t),review=M.supplyReview(t,rid,'recruit');
      return !review.review.allowed && !M.commit(t,review) && before===JSON.stringify(t);
    });
    // An explicitly requested unavailable advanced class still uses the ordinary unit gate.
    const t=JSON.parse(JSON.stringify(s));t.realmTech[rid].completed=[];t.realmTechMigration=2;
    const gate=M.reviewColumns(t,{realmId:rid,action:'recruit',terms:{columnId:r.columns.entries[0].id,
      count:1,unitId:'cataphract'},actor:{kind:'character',id:r.leaderId}});
    return {paid:paid,count:count,charged:charged,men:a.men-men===count,reserves:resting-reserves(r)===count,
      total:M.total(s,rid)===initial,repeat:!M.commit(s,q),blocked:blocked,unit:!gate.review.allowed,valid:M.validate(s)};
  });
  expect(result).toEqual({paid:true,count:45,charged:true,men:true,reserves:true,total:true,repeat:true,
    blocked:[true,true,true],unit:true,valid:true});
});

test('demuster, field loss and camp starvation keep their existing conserving owners',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const M=FB.mobile,s=FB.state,rid='harbor_following',r=M.row(s,rid),initial=M.total(s,rid),
      a=s.armies.find(function (a) {return a.id===r.columns.entries[0].hostId;}),
      before=r.members.reduce(function (n,m) {return n+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0),
      men=a.men,marker=JSON.stringify(r.openingReserves);
    const demustered=M.commit(s,M.reviewColumns(s,{realmId:rid,action:'demuster',terms:{columnId:r.columns.entries[0].id},
      actor:{kind:'character',id:r.leaderId}}));
    const resting=r.members.reduce(function (n,m) {return n+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0),
      b=s.armies.find(function (a) {return a.id===r.columns.entries[1].hostId;});
    FB.applyHostLosses(b,10,s);const fieldLoss=M.total(s,rid)===initial-10;
    // Empty camp food and remove pasture rights to exercise one real daily starvation boundary.
    r.food=0;r.agreements.forEach(function (a) {a.status='ended';});r.lastAI=0;s.turn=1;M.day(s);
    const dead=r.accounting.dead,total=M.total(s,rid),bytes=JSON.stringify(r);M.day(s);
    const source=JSON.parse(FB.save.serialize());FB.save.restore(source);
    return {demustered:demustered,returned:resting-before===men,fieldLoss:fieldLoss,starved:dead>10,
      conserved:total+dead===initial,once:bytes===JSON.stringify(r),marker:marker===JSON.stringify(r.openingReserves),
      restored:bytes===JSON.stringify(M.row(FB.state,rid)),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({demustered:true,returned:true,fieldLoss:true,starved:true,conserved:true,once:true,
    marker:true,restored:true,valid:true});
});

test('column provisioning transfers real camp food without altering reserves or treasury',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),c=r.columns.entries[0],
      a=s.armies.find(function (a) {return a.id===c.hostId;}),camp=r.food,bag=a.mobileFood,
      money=FB.treasuryAvailable(s,rid),pools=JSON.stringify(r.members),
      marker=JSON.stringify(r.openingReserves),q=M.columnSupplyReview(s,rid,c.id,'load'),
      loaded=M.commit(s,q),count=q.request.terms.count;
    const exact=count>0 && Math.abs(camp-r.food-count)<0.000001 && Math.abs(a.mobileFood-bag-count)<0.000001,
      repeated=!M.commit(s,q),back=M.columnSupplyReview(s,rid,c.id,'unload'),returned=M.commit(s,back);
    return {loaded:loaded,exact:exact,repeated:repeated,returned:returned,
      food:Math.abs(camp+bag-r.food-a.mobileFood)<0.000001,money:money===FB.treasuryAvailable(s,rid),
      pools:pools===JSON.stringify(r.members),marker:marker===JSON.stringify(r.openingReserves),valid:M.validate(s)};
  });
  expect(result).toEqual({loaded:true,exact:true,repeated:true,returned:true,food:true,money:true,pools:true,marker:true,valid:true});
});

test('missing, forged and unknown saved reserve provenance rejects without restore repair',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const source=JSON.parse(FB.save.serialize()),rid='harbor_following',changes=[
      function (r) {delete r.openingReserves;},function (r) {r.openingReserves=null;},
      function (r) {r.openingReserves.schema=2;},function (r) {r.openingReserves.extra=1;},
      function (r) {r.openingReserves.allocations.pop();},function (r) {r.openingReserves.allocations.reverse();},
      function (r) {r.openingReserves.allocations[0].count++;},function (r) {r.openingReserves.allocations[0].count='80';},
      function (r) {r.openingReserves.allocations[0].memberId='missing';},
      function (r) {r.openingReserves.allocations[0].unitId='inf';},function (r) {r.schema=1;}
    ];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source));change(input.state.authority.governments[rid].mobile);
      const live=FB.state,bytes=JSON.stringify(live),data=JSON.stringify(input),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try {FB.save.restore(input);} catch(e) {rejected=true;}
      return rejected && live===FB.state && bytes===JSON.stringify(FB.state) && data===JSON.stringify(input) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(11).fill(true));
});

test('losing a complete column leaves the camp reserves and other field force intact',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),entry=r.columns.entries[1],
      a=s.armies.find(function (a) {return a.id===entry.hostId;}),total=M.total(s,rid),men=a.men,
      camp=JSON.stringify(r.members),other=JSON.stringify(M.host(s,rid)),
      location=M.migration(s,rid).at,marker=JSON.stringify(r.openingReserves);
    FB.applyHostLosses(a,men,s);FB.disbandArmy(s,a);
    const before=JSON.stringify([r,s.armies]);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {loss:M.total(FB.state,rid)===total-men,dead:r.accounting.dead===men,
      camp:camp===JSON.stringify(r.members) && location===M.migration(s,rid).at,
      other:other===JSON.stringify(M.host(s,rid)),retired:entry.status==='retired',
      marker:marker===JSON.stringify(r.openingReserves),
      restored:before===JSON.stringify([M.row(FB.state,rid),FB.state.armies]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({loss:true,dead:true,camp:true,other:true,retired:true,marker:true,restored:true,valid:true});
});

test('omitted option preserves earlier pools and saves and forbids unsolicited provenance',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  delete input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.opening.reserves;
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='harbor_following',r=M.row(FB.state,rid),before=JSON.stringify(r),source=JSON.parse(FB.save.serialize());
    FB.save.restore(source);
    const retained=before===JSON.stringify(M.row(FB.state,rid)),bad=JSON.parse(JSON.stringify(source));
    bad.state.authority.governments[rid].mobile.openingReserves={schema:1,allocations:[]};
    let rejected=false;try {FB.save.restore(bad);} catch(e) {rejected=true;}
    return {retained:retained,absent:r.openingReserves===undefined,empty:r.members.every(function (m) {return !m.reserve.length;}),
      people:M.total(FB.state,rid),rejected:rejected,valid:M.validate(FB.state)};
  });
  expect(result).toEqual({retained:true,absent:true,empty:true,people:1400,rejected:true,valid:true});
});

test('changing the authored reserve allocation invalidates matching mod fingerprints',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function (source) {
    const saved=JSON.parse(FB.save.serialize()),changed=JSON.parse(JSON.stringify(source));
    changed.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.opening.reserves[0].count++;
    FB.mods.apply(changed);
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
    try {FB.save.restore(saved);} catch(e) {rejected=/different mod/.test(e.message);}
    return {mismatch:FB.save.otherWorld(saved),rejected:rejected,pure:before===JSON.stringify(FB.state) &&
      rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({mismatch:true,rejected:true,pure:true});
});
