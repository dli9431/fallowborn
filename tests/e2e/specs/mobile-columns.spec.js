'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-columns-harbor.json'),
  dune:require('../fixtures/authoring/mobile-columns-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/federates.js',
  'js/governments.js','js/government_selection.js','js/government_continuity.js','js/government_support.js',
  'js/bookmark_setup.js','js/world.js','js/mods.js','js/authority.js','js/treasury.js','js/armies.js',
  'js/population.js','js/settlement.js','js/starts.js','js/util.js','js/save.js','js/save_v4.js',
  'js/ui_mobile.js','js/ui_misc.js','js/main.js','js/model.js','js/station.js','js/technology.js']);

async function start(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(input ? {name:'columns.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input))} : path.resolve(__dirname,'../fixtures/authoring/mobile-columns-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' ordinary import partitions one muster and stock without another population or account',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile,rid=prefix+'_coalition',r=M.row(s,rid),snap=M.columnSnapshot(s,rid);
      const d=FB.campaignBookmark(s).realms.find(function (v) {return v.id===rid;});
      const armyMen=snap.entries.map(function (c) {return c.host.men;});
      const rows=snap.entries.map(function (c) {return c.host.mobileRoster.reduce(function (n,v) {return n+v.count;},0);});
      const food=r.food+snap.entries.reduce(function (n,c) {return n+c.host.mobileFood;},0);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.validate(s);M.columnSnapshot(s,rid);M.initialize(s,[d]);
      const pure=JSON.stringify(s)===before && rng===FB.getRngState() && uid===FB.getUidCounter();
      const saved=JSON.stringify([r,M.migration(s,rid),s.armies,s.chars,FB.treasuryAvailable(s,rid),s.player.gold]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return {men:armyMen,rows:rows,food:food,total:M.total(restored,rid),initial:r.accounting.initial,
        camp:snap.campProvinceId,foodPartitions:snap.entries.map(function (c) {return c.host.mobileFood;}),
        oneMigration:s.authority.migrations.filter(function (m) {return m.realmId===rid;}).length===1,
        separate:snap.entries.every(function (c) {return !c.host.mobileCourt && c.host.at===snap.campProvinceId;}),
        correctUnits:snap.entries.every(function (c,i) {return d.mobile.columns.entries[i].muster.every(function (v) {
          return c.host.units[v.unitId]===d.mobile.columns.entries[i].muster.filter(function (v2) {return v2.unitId===v.unitId;})
            .reduce(function (n,v2) {return n+v2.count;},0);
        });}),pure:pure,restored:saved===JSON.stringify([M.row(restored,rid),M.migration(restored,rid),
          restored.armies,restored.chars,FB.treasuryAvailable(restored,rid),restored.player.gold]),valid:M.validate(restored)};
    },prefix);
    expect(result).toEqual({men:prefix==='harbor' ? [40,120] : [110,50],rows:prefix==='harbor' ? [40,120] : [110,50],
      food:3200,total:prefix==='harbor' ? 1400 : 1600,initial:prefix==='harbor' ? 1400 : 1600,
      camp:prefix==='harbor' ? 'harbor_quay' : 'dune_well',foodPartitions:prefix==='harbor' ? [8,24] : [22,5],
      oneMigration:true,separate:true,correctUnits:true,pure:true,restored:true,valid:true});
  });
}

test('detached declaration rejection is pure for duplicate, excessive, unbound and impossible partitions',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (input) {
    const changes=[
      function (t) {t.columns=null;},function (t) {t.columns.schema=2;},
      function (t) {delete t.columns.schema;},function (t) {t.columns.extra=true;},
      function (t) {t.columns.entries=[];},function (t) {t.columns.entries.pop();},
      function (t) {t.columns.entries=Array(5).fill(t.columns.entries[0]);},
      function (t) {t.columns.entries[1].id=t.columns.entries[0].id;},
      function (t) {t.columns.entries[1].commanderMemberId=t.columns.entries[0].commanderMemberId;},
      function (t) {t.columns.entries[0].commanderMemberId='missing';},
      function (t) {t.columns.entries[0].muster[0].count++;},
      function (t) {t.columns.entries[0].muster[0].count--;},
      function (t) {t.columns.entries[0].muster[0].count=0;},
      function (t) {t.columns.entries[0].muster[0].count=0.5;},
      function (t) {t.columns.entries[0].muster.push(t.columns.entries[0].muster[0]);},
      function (t) {t.columns.entries[0].muster[0].unitId='missing';},
      function (t) {t.columns.entries[0].muster[0].memberId='missing';},
      function (t) {t.columns.entries[0].food=-1;},function (t) {t.columns.entries[0].food=100000;},
      function (t) {t.food=1;},function (t) {delete t.command;},function (t) {delete t.opening;},
      function (t) {t.columns.entries[0].hostId='foreign';},function (t) {t.columns.entries[0].at='dune_pass';}
    ];
    return changes.map(function (change) {
      const source=JSON.parse(JSON.stringify(input));change(source.bookmarks.dune_world.realms.find(function (v) {return v.mobile;}).mobile);
      const bytes=JSON.stringify(source),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(source).length>0 && bytes===JSON.stringify(source) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toEqual(Array(24).fill(true));
});

test('the four-column bound accepts four independently bound commanders and exact class partitions',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),b=input.bookmarks.dune_world;
  const t=b.realms.find(function (r) {return r.mobile;}).mobile,p=input.mobileProfiles.dune_compact;
  for (const [id,name] of [['rear_following','Neri Vale'],['scout_following','Toma Reed']]) {
    p.members.push({id:id,weight:1,pledge:0.1,population:700});
    b.opening.actors[id]=Object.assign({},b.opening.actors.dune_deputy,{name:name});
    t.opening.principals.push({memberId:id,person:{kind:'opening_actor',actorId:id}});
  }
  const members=['well_following','ridge_following','rear_following','scout_following'],units=['cav','ret','arch','arch'];
  t.opening.muster=members.map(function (id,i) {return {memberId:id,unitId:units[i],count:40};});
  t.columns.entries=members.map(function (id,i) {return {id:'column_'+i,commanderMemberId:id,muster:[t.opening.muster[i]],food:4};});
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,snap=M.columnSnapshot(s,'dune_coalition');
    return {men:snap.entries.map(function (c) {return c.host.men;}),total:M.total(s,'dune_coalition'),
      distinct:new Set(snap.entries.map(function (c) {return c.commanderId;})).size,valid:M.validate(s)};
  });
  expect(result).toEqual({men:[40,40,40,40],total:3000,distinct:4,valid:true});
});

test('fresh preflight rejects late, captive and colliding hosts before allocating any identity or stock',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='dune_coalition';
    return ['late','collision','captive','changed','missing'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),d=JSON.parse(JSON.stringify(FB.campaignBookmark(s).realms.find(function (v) {return v.id===rid;})));
      const target=M.row(s,rid).columns.entries[1].hostId;
      s.armies=s.armies.filter(function (a) {return a.realm!==rid;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==rid;});
      delete s.authority.governments[rid].mobile;
      if (kind==='late') s.turn=1;
      if (kind==='collision') s.armies.push({id:target,realm:'dune_gate',men:40});
      if (kind==='captive') FB.bookmarkActor(s,'dune_deputy').captive=true;
      if (kind==='changed') d.mobile.food++;
      if (kind==='missing') {delete d.mobile.command;delete d.mobile.opening;}
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {M.initialize(s,[d]);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual([true,true,true,true,true]);
});

test('column command scope is exact, costless and suspended by death or issuer expiry',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),[first,second]=r.columns.entries;
    const actor={kind:'character',id:second.commanderId},before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const scoped=M.columnAuthority(s,rid,second.id,actor) && !M.columnAuthority(s,rid,first.id,actor);
    const leader=r.columns.entries.every(function (c) {return M.columnAuthority(s,rid,c.id,{kind:'character',id:r.leaderId});});
    const noRealm=!M.columnAuthority(s,rid,second.id,{kind:'realm',id:rid});
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const dead=JSON.parse(JSON.stringify(s));dead.chars[second.commanderId].dead=true;
    const expired=JSON.parse(JSON.stringify(s));expired.turn=270;
    return {scoped:scoped,leader:leader,noRealm:noRealm,pure:pure,
      dead:!M.columnAuthority(dead,rid,second.id,actor),
      expired:!M.columnAuthority(expired,rid,second.id,actor),unchanged:before===JSON.stringify(s)};
  });
  expect(result).toEqual({scoped:true,leader:true,noRealm:true,pure:true,dead:true,expired:true,unchanged:true});
});

test('legacy one-host shortcuts cannot partially settle, reorganize or move a column set',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    const requests=[['recruit',{count:10,unitId:'arch'}],['demuster',{}],['move',{countyId:'dune_pass'}],
      ['march',{countyId:'dune_pass'}],['settle',{countyId:'dune_well',count:100,final:true}],
      ['leave',{memberId:r.members[1].id,countyId:'dune_well'}]];
    const rejected=requests.every(function ([action,terms]) {
      const q=M.review(s,{realmId:rid,action:action,terms:terms,actor:{kind:'realm',id:rid}});
      return !q.review.allowed && q.review.reason==='column_operation' && !M.commit(s,q);
    });
    const hosts=s.armies.filter(function (a) {return M.columnHostOwned(s,rid,a);});
    return {rejected:rejected,orders:hosts.every(function (a) {return !FB.orderArmy(s,a,'dune_pass') && !FB.splitHost(s,a);}),
      rawWar:FB.registerOrdinaryWar(s,rid,{enemy:'dune_gate',target:'dune_pass'})===null,
      migration:FB.federateRequest(s,M.migration(s,rid).id,'land')===false,
      standing:hosts.every(function (a) {return FB.federateHostStanding(s,a);}),
      pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(s)};
  });
  expect(result).toEqual({rejected:true,orders:true,rawWar:true,migration:true,standing:true,pure:true,valid:true});
});

test('saved column validation rejects broken identities and sums without repairing the candidate',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='dune_coalition';
    const changes=[function (s,r) {delete r.columns;},function (s,r) {r.columns.schema=2;},
      function (s,r) {r.schema=2;},function (s,r) {r.columns.extra=true;},
      function (s,r) {r.columns.entries.pop();},function (s,r) {r.columns.entries.push(r.columns.entries[0]);},
      function (s,r) {r.columns.entries[1].hostId=r.columns.entries[0].hostId;},
      function (s,r) {r.columns.entries[1].commanderId=r.leaderId;},
      function (s,r) {r.columns.entries[0].status='retired';},
      function (s,r,a) {s.armies.push(JSON.parse(JSON.stringify(a)));},
      function (s,r,a) {a.men++;},function (s,r,a) {a.units.arch++;},
      function (s,r,a) {a.mobileRoster[0].count++;},function (s,r,a) {a.mobileFood=100000;},
      function (s,r,a) {a.mobileCourt=true;},function (s,r,a) {a.migrationId='missing';},
      function (s,r,a) {a.realm='dune_gate';},function (s,r,a) {a.units.unknown=0;},
      function (s,r,a) {s.armies=s.armies.filter(function (v) {return v.id!==a.id;});},
      function (s,r) {r.accounting.initial++;}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,rid),a=s.armies.find(function (v) {return v.id===r.columns.entries[1].hostId;});
      change(s,r,a);const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {M.validate(s);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(20).fill(true));
});

test('camp and host food are separate and each existing daily provisioning debit occurs once',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_coalition',r=M.row(s,rid),snap=M.columnSnapshot(s,rid);
    const a=s.armies.find(function (v) {return v.id===snap.entries[1].hostId;});
    a.at='harbor_ridge';a.from=a.at;s.turn++;
    const camp=r.food,food=a.mobileFood,men=a.men;
    const paid=FB.provisionArmy(s,a),repeat=FB.provisionArmy(s,a);
    return {paid:paid>0,repeat:repeat===0,camp:r.food===camp,carried:Math.abs(a.mobileFood-(food-paid))<0.000001,
      people:a.men===men && M.total(s,rid)===1400,campPlace:M.migration(s,rid).at==='harbor_quay',valid:M.validate(s)};
  });
  expect(result).toEqual({paid:true,repeat:true,camp:true,carried:true,people:true,campPlace:true,valid:true});
});

test('matching mod identity includes the column partition and incompatible restore leaves live state intact',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize(),t=input.bookmarks.dune_world.realms.find(function (v) {return v.mobile;}).mobile;
    t.columns.entries[1].food--;
    FB.mods.apply(input);const before=JSON.stringify(FB.state);let rejected=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {rejected=/different mod/.test(error.message);}
    return {rejected:rejected,pure:before===JSON.stringify(FB.state)};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({rejected:true,pure:true});
});

test('retired host identity survives matching restore without recreating a force or its food',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),entry=r.columns.entries[1];
    const a=s.armies.find(function (v) {return v.id===entry.hostId;});
    const people=M.total(s,rid),food=r.food+s.armies.filter(function (v) {return v.realm===rid && v.mobileFollowing;})
      .reduce(function (n,v) {return n+v.mobileFood;},0);
    FB.disbandArmy(s,a);M.validate(s);
    const record=JSON.stringify([r,s.armies]),retired=entry.status==='retired';
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,row=M.row(restored,rid);
    return {retired:retired,people:M.total(restored,rid)===people,
      food:row.food+restored.armies.filter(function (v) {return v.realm===rid && v.mobileFollowing;})
        .reduce(function (n,v) {return n+v.mobileFood;},0)===food,
      same:record===JSON.stringify([row,restored.armies]),
      absent:!restored.armies.some(function (v) {return v.id===entry.hostId;}),valid:M.validate(restored)};
  });
  expect(result).toEqual({retired:true,people:true,food:true,same:true,absent:true,valid:true});
});

test('loss of one column retains the civilian camp and the other canonical host',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),entry=r.columns.entries[1];
    const a=s.armies.find(function (v) {return v.id===entry.hostId;}),camp=M.migration(s,rid).at;
    const civilians=r.members.reduce(function (n,m) {return n+m.civilians.reduce(function (v,c) {return v+c.count;},0);},0);
    const count=a.men,total=M.total(s,rid);
    FB.applyHostLosses(a,count,s);FB.disbandArmy(s,a);
    return {people:M.total(s,rid)===total-count,dead:r.accounting.dead===count,
      camp:M.migration(s,rid).at===camp && r.status==='active',
      civilians:r.members.reduce(function (n,m) {return n+m.civilians.reduce(function (v,c) {return v+c.count;},0);},0)===civilians,
      other:!!M.host(s,rid),retired:entry.status==='retired',valid:M.validate(s)};
  });
  expect(result).toEqual({people:true,dead:true,camp:true,civilians:true,other:true,retired:true,valid:true});
});

test('the ordinary army phase cannot invent an unpartitioned detachment after a column retires',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid);
    FB.disbandArmy(s,s.armies.find(function (a) {return a.id===r.columns.entries[1].hostId;}));
    s.owner.dune_flats=rid;s.holder.dune_flats=rid;FB.invalidateRealmCache();
    FB.treasuryCredit(s,rid,10000);
    const war=FB.registerOrdinaryWar(s,'dune_gate',{enemy:rid,target:'dune_flats',
      objectives:[{type:'aggression',target:'dune_flats'}]});
    if (!war) throw new Error('Defensive campaign did not register');
    FBDATA.balance.aiMultiHostStrength=0;FBDATA.balance.aiDetachmentFrac=0.5;
    const total=M.total(s,rid),hostId=M.host(s,rid).id;
    s.turn++;FB.armyTick(s);
    return {one:s.armies.filter(function (a) {return a.realm===rid;}).length===1,
      same:M.host(s,rid).id===hostId,conserved:M.total(s,rid)===total,valid:M.validate(s)};
  });
  expect(result).toEqual({one:true,same:true,conserved:true,valid:true});
});

test('omitting columns retains schema-3 single-host defaults and rejects a forged column marker',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune));
  delete input.bookmarks.dune_world.realms.find(function (v) {return v.mobile;}).mobile.columns;
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid);
    const single=r.schema===3 && r.columns===undefined && M.columnSnapshot(s,rid)===null &&
      s.armies.filter(function (a) {return a.realm===rid && a.mobileFollowing;}).length===1;
    const candidate=JSON.parse(JSON.stringify(s));M.row(candidate,rid).columns={schema:1,entries:[]};
    let rejected=false;try {M.validate(candidate);} catch(error) {rejected=true;}
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {single:single,rejected:rejected,restored:M.row(FB.state,rid).columns===undefined,valid:M.validate(FB.state)};
  });
  expect(result).toEqual({single:true,rejected:true,restored:true,valid:true});
});

test('the shared command sheet distinguishes each column from the civilian camp',async function ({page},info) {
  await start(page,info,'dune');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(function () {FB.ui.showMobileConfederation('dune_coalition');});
  await expect(page.locator('#gm-body')).toContainText('Camp food stock');
  await expect(page.locator('#gm-body')).toContainText('Column 1');
  await expect(page.locator('#gm-body')).toContainText('Column 2');
  await expect(page.locator('#gm-body')).toContainText('Sela Vey');
  await expect(page.locator('#gm-body')).toContainText('Ravi Sen');
  await expect(page.locator('#gm-body')).toContainText('110 fighters');
  await expect(page.locator('#gm-body')).toContainText('50 fighters');
  await expect(page.locator('#gm-body')).toContainText('This action is unavailable for a following with separate columns.');
  const fits=await page.locator('#gm-body').evaluate(function (node) {return node.scrollWidth<=node.clientWidth+1;});
  expect(fits).toBe(true);
});
