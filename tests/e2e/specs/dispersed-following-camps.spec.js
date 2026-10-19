'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/dispersed-camps-harbor.json'),
  dune:require('../fixtures/authoring/dispersed-camps-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_camps.js','js/mobile_confederations.js','js/mobile_columns.js','js/mobile_command.js',
  'js/government_selection.js','js/governments.js','js/bookmark_setup.js','js/expedition_programs.js',
  'js/population.js','js/market.js','js/treasury.js','js/federates.js','js/armies.js','js/authority.js',
  'js/world.js','js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/ui_mobile.js']);

async function imported(page,info,prefix,stem) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/'+(stem || 'dispersed-camps')+'-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports actual camp partitions with one public account and no duplicated people or stock',async function ({page},info) {
    await imported(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (v) {return v.mobile;}),r=M.row(s,d.id);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),snap=M.campSnapshot(s,d.id);
      M.initialize(s,FB.campaignBookmark(s).realms);M.campSnapshot(s,d.id);
      return {pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        valid:M.validate(s),people:M.total(s,d.id),initial:r.accounting.initial,legacyFood:r.food,
        empty:r.members.every(function (m) {return !m.civilians.length && !m.reserve.length;}),
        camps:snap.length,distinct:snap[0].countyId!==snap[1].countyId,
        food:snap.reduce(function (n,c) {return n+c.food;},0)+s.armies.filter(function (a) {return a.realm===d.id && a.mobileFollowing;}).reduce(function (n,a) {return n+a.mobileFood;},0),
        noLand:FB.realmTerritory(s,d.id).length===0,noSingleCamp:M.householdSnapshot(s,d.id)===null};
    });
    expect(result).toMatchObject({pure:true,valid:true,legacyFood:0,empty:true,camps:2,distinct:true,food:3200,noLand:true,noSingleCamp:true});
    expect(result.people).toBe(result.initial);
    expect(result.people).toBe(prefix==='harbor'?1400:1600);
  });
}

test('detached imports reject malformed, duplicate, remote and overallocated partitions purely',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (t) {t.civilianCamps=null;},function (t,c) {c.schema=2;},function (t,c) {c.extra=true;},
      function (t,c) {c.entries.pop();},function (t,c) {c.entries.push(c.entries[0]);},
      function (t,c) {c.entries[1].id=c.entries[0].id;},function (t,c) {c.entries[1].countyId=c.entries[0].countyId;},
      function (t,c) {c.entries[1].countyId='harbor_ridge';},function (t,c) {c.entries[1].siteId='missing';},
      function (t,c) {c.entries[0].members[0].civilians++;},function (t,c) {c.entries[0].members[0].reserve=-1;},
      function (t,c) {c.entries[0].members[0].memberId='missing';},function (t,c) {c.entries[0].members.push(c.entries[0].members[0]);},
      function (t,c) {c.entries[0].food++;},function (t,c) {c.fieldFood=1000;c.entries[0].food-=968;},
      function (t) {delete t.hostedAccess;},function (t) {delete t.command;}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),t=input.bookmarks.harbor_world.realms.find(function (d) {return d.mobile;}).mobile;
      change(t,t.civilianCamps);
      const bytes=JSON.stringify(input),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(17).fill(true));
});

test('the whole opening preflight rejects exhausted remote hosting capacity before creating anything',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const M=FB.mobile,original=FB.state,d=FB.campaignBookmark(original).realms.find(function (v) {return v.mobile;});
    return ['capacity','holder','late','batch'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),pid=d.mobile.civilianCamps.entries[1].countyId;
      delete s.authority.governments[d.id].mobile;
      s.armies=s.armies.filter(function (a) {return a.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==d.id;});
      if (kind==='capacity') s.population.counties[pid].count=100;
      if (kind==='holder') s.holder[pid]='harbor_upland';
      if (kind==='late') s.turn=1;
      if (kind==='batch') s.authority.governments.harbor_upland.mobile={agreements:[{id:'prior',kind:'access',status:'active',endTurn:90,countyIds:[pid],capacity:1000}]};
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
      try {M.initialize(s,[d]);}catch(error) {failed=true;}
      return failed && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(4).fill(true));
});

test('daily consumption and local starvation cannot draw on another camp or field stock',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),[a,b]=r.camps.entries;
    r.agreements[0].status='ended';a.food=0;b.food=100;FB.treasurySpend(s,rid,FB.treasuryAvailable(s,rid));
    const before=M.campSnapshot(s,rid),host=JSON.stringify(M.host(s,rid)),total=M.total(s,rid);
    s.turn=1;s.date=FB.dateAtTurn(s,1);M.day(s);
    const after=M.campSnapshot(s,rid),once=JSON.stringify(s);M.day(s);
    return {localLoss:after[0].civilians<before[0].civilians,otherSame:after[1].civilians===before[1].civilians,
      otherConsumption:before[1].food-after[1].food,daily:before[1].daily,
      fieldSame:host===JSON.stringify(M.host(s,rid)),lost:total-M.total(s,rid),dead:r.accounting.dead,
      bounded:once===JSON.stringify(s),valid:M.validate(s)};
  });
  expect(result).toMatchObject({localLoss:true,otherSame:true,fieldSame:true,bounded:true,valid:true});
  expect(result.otherConsumption).toBeCloseTo(result.daily);
  expect(result.lost).toBe(result.dead);
});

test('pasture is local, bounded by actual inhabitants and harvested once per camp and county period',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),before=M.campSnapshot(s,rid);
    FB.treasurySpend(s,rid,FB.treasuryAvailable(s,rid));
    s.turn=1;s.date=FB.dateAtTurn(s,1);M.day(s);
    const first=M.campSnapshot(s,rid),ledger=JSON.stringify(s.mobilePastures);
    s.turn=2;s.date=FB.dateAtTurn(s,2);M.day(s);
    const second=M.campSnapshot(s,rid);
    return {gains:first.map(function (c,i) {return c.food-before[i].food+before[i].daily;}),
      expected:before.map(function (c) {return (c.civilians+c.reserve)*M.profile(s,rid).pasturePerPerson;}),
      second:first.every(function (c,i) {return Math.abs(second[i].food-(c.food-c.daily))<0.00001;}),
      ledger:ledger===JSON.stringify(s.mobilePastures),valid:M.validate(s)};
  });
  result.gains.forEach(function (v,i) {expect(v).toBeCloseTo(result.expected[i]);});
  expect(result).toMatchObject({second:true,ledger:true,valid:true});
});

test('local purchases debit one treasury and stale review, lost access and remote work change nothing',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),[a,b]=r.camps.entries,leader=M.leader(s,rid);
    const request={realmId:rid,action:'trade',terms:{campId:b.id,count:1,direction:'buy'},actor:{kind:'character',id:leader.id}};
    const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=M.reviewCamp(s,request);
    const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const food=a.food,far=b.food,market=FB.marketProvisionSnapshot(s,b.countyId).stock,gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold;
    const done=M.commit(s,q),repeat=M.commit(s,q),debit=gold-FB.treasuryAvailable(s,rid);
    const stale=M.reviewCamp(s,request);s.holder[b.countyId]='harbor_upland';const bytes=JSON.stringify(s);
    const failed=!M.commit(s,stale) && bytes===JSON.stringify(s) && !M.reviewCamp(s,request).review.allowed;
    return {pure:pure,done:done,repeat:repeat,debit:debit,cost:q.review.cost,nearSame:a.food===food,farGain:b.food-far,
      stock:market-FB.marketProvisionSnapshot(s,b.countyId).stock,privateSame:s.player.gold===privateGold,failed:failed,
      remoteWork:!M.reviewCamp(s,{realmId:rid,action:'work',terms:{campId:b.id},actor:{kind:'character',id:s.player.charId}}).review.allowed};
  });
  expect(result).toMatchObject({pure:true,done:true,repeat:false,nearSame:true,farGain:1,stock:1,privateSame:true,failed:true,remoteWork:true});
  expect(result.debit).toBeCloseTo(result.cost);
});

test('actual local work pays once and consumes only the selected camp food',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),[a,b]=r.camps.entries;
    const request={realmId:rid,action:'work',terms:{campId:a.id},actor:{kind:'character',id:s.player.charId}};
    const before=[s.player.gold,FB.treasuryAvailable(s,rid),a.food,b.food],q=M.reviewCamp(s,request);
    const done=M.commit(s,q),again=M.commit(s,M.reviewCamp(s,request));
    return {done:done,again:again,paid:s.player.gold-before[0],debit:before[1]-FB.treasuryAvailable(s,rid),food:before[2]-a.food,farSame:b.food===before[3]};
  });
  expect(result).toMatchObject({done:true,again:false,food:1,farSame:true});
  expect(result.paid).toBeCloseTo(0.2);expect(result.debit).toBeCloseTo(0.2);
});

test('one local civilian settlement preserves the other camp and all field fighters',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),[a,b]=r.camps.entries;
    r.agreements[0].status='ended';FB.transferProvince(s,a.countyId,rid);s.holder[a.countyId]=rid;
    const far=JSON.stringify(b),field=JSON.stringify(M.host(s,rid)),total=M.total(s,rid),local=s.population.counties[a.countyId].count;
    const q=M.reviewCamp(s,{realmId:rid,action:'settle',terms:{campId:a.id,count:10},actor:{kind:'character',id:M.leader(s,rid).id}});
    const done=M.commit(s,q);
    return {done:done,farSame:far===JSON.stringify(b),fieldSame:field===JSON.stringify(M.host(s,rid)),
      withdrawn:total-M.total(s,rid),added:s.population.counties[a.countyId].count-local,settled:r.accounting.settled,
      active:r.status,valid:M.validate(s)};
  });
  expect(result).toEqual({done:true,farSame:true,fieldSame:true,withdrawn:10,added:10,settled:10,active:'active',valid:true});
});

test('single-camp shortcuts and unsupported camp movement, reunion and recruitment reject without mutation',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',actor={kind:'character',id:M.leader(s,rid).id};
    const bytes=JSON.stringify(s),actions=['recruit','demuster','move','join','leave','settle','work','trade'];
    const reasons=actions.map(function (action) {const q=M.review(s,{realmId:rid,action:action,terms:{},actor:actor});
      return q.review.reason==='camp_operation' && !M.commit(s,q);});
    const other=['move','reunite','recruit'].map(function (action) {return !M.reviewCamp(s,{realmId:rid,action:action,terms:{campId:'harbor_near'},actor:actor}).review.allowed;});
    return {reasons:reasons,other:other,pure:bytes===JSON.stringify(s)};
  });
  expect(result).toEqual({reasons:Array(8).fill(true),other:Array(3).fill(true),pure:true});
});

test('field loss at a remote camp returns only real survivors and food at that actual county',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),[a,b]=r.camps.entries,army=M.host(s,rid);
    army.at=b.countyId;army.from=b.countyId;
    const total=M.total(s,rid),near=JSON.stringify(a),far=M.campSnapshot(s,rid)[1],men=army.men,food=army.mobileFood;
    FB.disbandArmy(s,army);
    const after=M.campSnapshot(s,rid)[1];
    return {sameTotal:M.total(s,rid)===total,nearSame:near===JSON.stringify(a),returned:after.reserve-far.reserve,
      food:after.food-far.food,men:men,expectedFood:food,hostAbsent:!M.host(s,rid),valid:M.validate(s)};
  });
  expect(result).toMatchObject({sameTotal:true,nearSame:true,hostAbsent:true,valid:true});
  expect(result.returned).toBe(result.men);expect(result.food).toBe(result.expectedFood);
});

test('matching restore preserves divergent camps and rejects missing or forged provenance purely',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid);r.camps.entries[1].food-=19;
    const facts=JSON.stringify(r),saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const restored=facts===JSON.stringify(M.row(FB.state,rid));
    const changes=[function (r) {delete r.camps;},function (r) {r.camps.schema=2;},function (r) {r.food=1;},
      function (r) {r.camps.entries.reverse();},function (r) {r.camps.entries[1].countyId='dune_well';},
      function (r) {delete r.camps.entries[1].siteId;},function (r) {r.camps.entries[0].food=-1;},
      function (r) {r.camps.entries[0].accounting.initial++;},function (r) {r.camps.entries[0].members[0].civilians[0].count++;},
      function (r) {r.camps.entries[0].members[0].memberId='unknown';},function (r) {r.camps.entries[0].harvestPeriod=99;}];
    const rejected=changes.map(function (change) {
      const state=JSON.parse(JSON.stringify(FB.state));change(M.row(state,rid));const bytes=JSON.stringify(state);let failed=false;
      const rng=FB.getRngState(),uid=FB.getUidCounter();try {M.validate(state);}catch(error) {failed=true;}
      return failed && bytes===JSON.stringify(state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    return {restored:restored,rejected:rejected};
  });
  expect(result).toEqual({restored:true,rejected:Array(11).fill(true)});
});

test('camp selector and review Back preserve the selected locality and input',async function ({page},info) {
  await imported(page,info,'harbor');
  await page.evaluate(function () {FB.ui.showMobileConfederation('harbor_following');});
  await page.locator('#mobile-camp').selectOption('harbor_far');
  await page.locator('#mobile-count').fill('1');
  await page.locator('#mobile-count').dispatchEvent('change');
  await page.getByRole('button',{name:'Work at selected camp',exact:true}).waitFor();
  // The local household may review work at its own camp; changing input remains retained.
  await page.locator('#mobile-camp').selectOption('harbor_near');
  await page.getByRole('button',{name:'Work at selected camp',exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-camp')).toHaveValue('harbor_near');
  await expect(page.locator('#mobile-count')).toHaveValue('1');
});

test('separate columns cannot load, unload, recruit or carry the dispersed civilian camps',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),column=r.columns.entries[0];
    const before=JSON.stringify(s),actor={kind:'character',id:M.leader(s,rid).id};
    const reasons=['move','recruit','demuster','load','unload','trade'].map(function (action) {
      const fields=action==='move' ? {columnId:column.id,countyId:'dune_flats'} :
        action==='demuster' ? {columnId:column.id} : action==='recruit' ? {columnId:column.id,count:1,unitId:'arch'} :
        {columnId:column.id,count:1,provisioning:true};
      const q=M.reviewColumns(s,{realmId:rid,action:action,terms:fields,actor:actor});
      return q.review.reason==='camp_operation' && !M.commit(s,q);
    });
    const pure=before===JSON.stringify(s),camps=JSON.stringify(r.camps),a=M.host(s,rid),food=a.mobileFood;
    FB.provisionArmy(s,a);
    return {reasons:reasons,pure:pure,campsSame:camps===JSON.stringify(r.camps),fieldConsumes:a.mobileFood<food,valid:M.validate(s)};
  });
  expect(result).toEqual({reasons:Array(6).fill(true),pure:true,campsSame:true,fieldConsumes:true,valid:true});
});

test('AI purchases at each actual camp market through the same once-per-day reviews',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),gold=FB.treasuryAvailable(s,rid);
    r.camps.entries.forEach(function (c) {c.food=0;c.harvestPeriod=0;});
    const market=r.camps.entries.map(function (c) {return FB.marketProvisionSnapshot(s,c.countyId).stock;}),host=JSON.stringify(M.host(s,rid));
    s.turn=1;s.date=FB.dateAtTurn(s,1);M.day(s);const once=JSON.stringify(s);M.day(s);
    return {local:r.camps.entries.every(function (c,i) {return c.food>0 && FB.marketProvisionSnapshot(s,c.countyId).stock<market[i];}),
      paid:FB.treasuryAvailable(s,rid)<gold,privateGold:s.player.gold,fieldSame:host===JSON.stringify(M.host(s,rid)),
      bounded:once===JSON.stringify(s),valid:M.validate(s)};
  });
  expect(result).toMatchObject({local:true,paid:true,fieldSame:true,bounded:true,valid:true});
});

test('expired hosting retains actual camps through restore and cannot regenerate their access',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),places=JSON.stringify(r.camps.entries.map(function (c) {return [c.countyId,c.siteId];}));
    s.turn=45;s.date=FB.dateAtTurn(s,45);M.day(s);
    const noAccess=M.campSnapshot(s,rid).every(function (c) {return !c.access;}),saved=JSON.parse(FB.save.serialize());
    FB.save.restore(saved);const bytes=JSON.stringify(FB.state);M.initialize(FB.state,FB.campaignBookmark(FB.state).realms);
    return {noAccess:noAccess,noReplay:bytes===JSON.stringify(FB.state),
      places:places===JSON.stringify(M.row(FB.state,rid).camps.entries.map(function (c) {return [c.countyId,c.siteId];})),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({noAccess:true,noReplay:true,places:true,valid:true});
});

test('omitted camp declarations retain the ordinary single-camp stock and matching legacy save',async function ({page},info) {
  await imported(page,info,'harbor','mobile-hosted');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='harbor_following',s=FB.state,r=M.row(s,rid),food=r.food;
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    return {absent:r.camps===undefined,snapshot:M.campSnapshot(FB.state,rid)===null,positive:food>0,
      retained:M.row(FB.state,rid).food===food,single:!!M.householdSnapshot(FB.state,rid),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({absent:true,snapshot:true,positive:true,retained:true,single:true,valid:true});
});
