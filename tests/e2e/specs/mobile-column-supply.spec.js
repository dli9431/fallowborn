'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-column-supply-harbor.json'),
  dune:require('../fixtures/authoring/mobile-column-supply-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js','js/government_selection.js',
  'js/governments.js','js/authority.js','js/government_support.js','js/population.js','js/market.js',
  'js/treasury.js','js/logistics.js','js/armies.js','js/federates.js','js/technology.js','js/model.js',
  'js/mods.js','js/world.js','js/bookmark_setup.js','js/starts.js','js/save.js','js/save_v4.js',
  'js/ui_mobile.js','js/ui_misc.js','js/home_authority.js','js/main.js','js/util.js']);

async function start(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  if (input) await page.locator('#modfile').setInputFiles({name:'column-supply.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-column-supply-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function (prefix) {
    const s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
    window.columnSupplyCase={rid:FB.startRealmId(s,d.id),remote:prefix==='harbor' ? 'harbor_gardens' : 'dune_flats',
      host:function (s,index) {const c=FB.mobile.row(s,this.rid).columns.entries[index];return s.armies.find(function (a) {return a.id===c.hostId;});},
      stock:function (s,at,n) {s.market.counties[at][0][s.market.goods.indexOf('provisions')]=n;},
      totals:function (s) {const r=FB.mobile.row(s,this.rid);return {people:FB.mobile.total(s,this.rid),
        food:r.food+s.armies.filter(function (a) {return a.realm===this.rid && a.mobileFollowing;},this)
          .reduce(function (n,a) {return n+a.mobileFood;},0),
        gold:FB.treasuryAvailable(s,this.rid),privateGold:s.player.gold,local:s.population.counties[FB.mobile.migration(s,this.rid).at].count};}
    };
  },prefix);
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' ordinary import projects every column without allocating people, resources or identities',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const facts=M.supplySnapshot(s,C.rid),player=M.supplyReview(s,C.rid,'trade',{kind:'character',id:r.leaderId}),ai=M.supplyReview(s,C.rid,'trade');
      return {people:M.total(s,C.rid),food:C.totals(s).food,columns:facts.entries.length,days:facts.targetDays,carry:facts.carryDays,
        camp:facts.campDaily,field:facts.fieldDaily>0,local:facts.entries.every(function (e) {return e.local;}),
        allowed:player.review.allowed && ai.review.allowed && player.review.cost===ai.review.cost,
        pure:before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        review:FBDATA.techImpactReviews.features.mobile_provisioning.mode,valid:M.validate(s)};
    });
    expect(result).toEqual({people:prefix==='harbor' ? 1400 : 1600,food:10,columns:2,days:prefix==='harbor' ? 14 : 7,
      carry:prefix==='harbor' ? 21 : 5,camp:prefix==='harbor' ? 12.4 : 14.4,field:true,local:true,allowed:true,pure:true,review:'none',valid:true});
  });

  test(prefix+' camp buys only affordable finite stock and preserves the public reserve',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),at=M.migration(s,C.rid).at,p=M.profile(s,C.rid);
      C.stock(s,at,3);const price=FB.marketProvisionSnapshot(s,at).price*0.1125;
      FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));FB.treasuryCredit(s,C.rid,p.supplyPolicy.cashReserve+price*2.5);
      const before=C.totals(s),outside=FB.treasuryAvailable(s,s.owner[at]),quote=M.supplyReview(s,C.rid,'trade');
      const applied=M.commit(s,quote),repeat=!M.commit(s,quote),after=C.totals(s);
      return {applied:applied,repeat:repeat,count:quote.request.terms.count,stock:FB.marketProvisionSnapshot(s,at).stock,
        food:after.food-before.food,cost:quote.review.cost,debit:before.gold-after.gold,
        credit:FB.treasuryAvailable(s,s.owner[at])-outside,reserve:after.gold>=p.supplyPolicy.cashReserve,
        people:before.people===after.people,privateGold:before.privateGold===after.privateGold,local:before.local===after.local,valid:M.validate(s)};
    });
    expect(result).toMatchObject({applied:true,repeat:true,count:2,stock:1,food:2,reserve:true,people:true,privateGold:true,local:true,valid:true});
    expect(result.debit).toBeCloseTo(result.cost,8);expect(result.credit).toBeCloseTo(result.cost,8);
  });

  test(prefix+' remote column buys at its actual market without drawing camp or sibling stock',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),a=C.host(s,1),c=r.columns.entries[1],p=M.profile(s,C.rid);
      a.at=C.remote;a.from=a.at;C.stock(s,a.at,100);r.food=500;
      const before=C.totals(s),camp=r.food,sibling=JSON.stringify(C.host(s,0)),stock=FB.marketProvisionSnapshot(s,a.at).stock;
      const q=M.columnSupplyReview(s,C.rid,c.id,'trade',{kind:'character',id:c.commanderId});
      const applied=M.commit(s,q),again=!M.commit(s,q),after=C.totals(s);
      const remoteLoad=M.columnSupplyReview(s,C.rid,c.id,'load');
      return {applied:applied,again:again,bought:q.request.terms.count>0,
        exact:after.food-before.food===q.request.terms.count && stock-FB.marketProvisionSnapshot(s,a.at).stock===q.request.terms.count,
        debit:before.gold-after.gold,cost:q.review.cost,camp:camp===r.food,sibling:sibling===JSON.stringify(C.host(s,0)),
        capacity:a.mobileFood<=M.hostSupplySnapshot(s,a).capacity,reserve:after.gold>=p.supplyPolicy.cashReserve,
        remote:!remoteLoad.review.allowed,people:before.people===after.people,privateGold:before.privateGold===after.privateGold,valid:M.validate(s)};
    });
    expect(result).toMatchObject({applied:true,again:true,bought:true,exact:true,camp:true,sibling:true,capacity:true,reserve:true,remote:true,people:true,privateGold:true,valid:true});
    expect(result.debit).toBeCloseTo(result.cost,8);
  });
}

test('loading and unloading conserve local inventories and require actual halted reunion',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),c=r.columns.entries[1],a=C.host(s,1);
    r.food=100;const before=C.totals(s),load=M.columnSupplyReview(s,C.rid,c.id,'load');
    const accepted=M.commit(s,load),repeat=!M.commit(s,load),loaded=a.mobileFood===load.request.terms.count;
    const unload=M.columnSupplyReview(s,C.rid,c.id,'unload'),returned=M.commit(s,unload);
    const conserved=JSON.stringify(C.totals(s))===JSON.stringify(before),empty=a.mobileFood===0;
    a.at=C.remote;a.from=a.at;const remote=!M.columnSupplyReview(s,C.rid,c.id,'load').review.allowed;
    a.at=M.migration(s,C.rid).at;a.moveLeft=1;
    const moving=!M.columnSupplyReview(s,C.rid,c.id,'load').review.allowed;
    return {accepted:accepted,repeat:repeat,loaded:loaded,returned:returned,conserved:conserved,empty:empty,remote:remote,moving:moving};
  });
  expect(result).toEqual({accepted:true,repeat:true,loaded:true,returned:true,conserved:true,empty:true,remote:true,moving:true});
});

test('exhaustion, lost access, shared market use, command changes and forged quantities reject atomically',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,M=FB.mobile,original=FB.state;
    return ['empty','reserve','access','controller','capacity','consumed','competing','stock','movement','death','custody','recall','scope','forged','borrowed','operation','flag'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,C.rid),c=r.columns.entries[0],a=C.host(s,0);
      a.at=C.remote;a.from=a.at;C.stock(s,a.at,1000);
      if (kind==='empty') C.stock(s,a.at,0);
      if (kind==='reserve') FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid)-M.profile(s,C.rid).supplyPolicy.cashReserve);
      if (kind==='access') r.agreements[0].status='ended';
      if (kind==='controller') s.holder[a.at]='harbor_upland';
      if (kind==='capacity') a.mobileFood=M.hostSupplySnapshot(s,a).capacity;
      if (kind==='competing') {C.host(s,1).at=C.remote;C.host(s,1).from=C.remote;C.stock(s,a.at,2);}
      const q=M.columnSupplyReview(s,C.rid,c.id,'trade');
      if (kind==='consumed') {const other=M.columnSupplyReview(s,C.rid,c.id,'trade');M.commit(s,other);}
      if (kind==='competing') M.commit(s,M.columnSupplyReview(s,C.rid,r.columns.entries[1].id,'trade'));
      if (kind==='stock') C.stock(s,a.at,0);
      if (kind==='movement') a.at='harbor_ridge';
      if (kind==='death') s.chars[c.commanderId].dead=true;
      if (kind==='custody') s.chars[r.leaderId].captive=true;
      if (kind==='recall') r.command.status='recalled';
      if (kind==='scope') r.members[0].allegiance=false;
      if (kind==='forged') {q.request.terms.count++;q.review.terms.count++;}
      if (kind==='borrowed') q.request.actor={kind:'character',id:s.player.charId};
      if (kind==='operation') q.request.action='constructor';
      if (kind==='flag') q.request.terms.provisioning=false;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !M.commit(s,q) && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(17).fill(true));
});

test('class-aware recovery uses one command-wide shortfall and only pledged camp pools',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),p=M.profile(s,C.rid),a=C.host(s,0),b=C.host(s,1);
    r.food=500;b.at=C.remote;b.from=b.at;
    const before=C.totals(s),remote=JSON.stringify(b),q=M.supplyReview(s,C.rid,'recruit'),units=a.units.arch || 0;
    const applied=M.commit(s,q),repeat=!M.commit(s,q),after=C.totals(s);
    const next=M.supplySnapshot(s,C.rid).replacement;
    const lost=JSON.parse(JSON.stringify(s)),dead=M.row(lost,C.rid);dead.members.forEach(function (m) {m.pledge=0;});
    const refused=!M.supplyReview(lost,C.rid,'recruit').review.allowed;
    return {applied:applied,repeat:repeat,class:q.request.terms.unitId,column:q.request.terms.columnId===r.columns.entries[0].id,
      count:q.request.terms.count,exact:a.units.arch-units===q.request.terms.count,
      next:next && next.count,people:after.people===before.people,food:after.food===before.food,local:after.local===before.local,
      privateGold:after.privateGold===before.privateGold,remote:remote===JSON.stringify(b),refused:refused,
      cost:before.gold-after.gold,expected:q.request.terms.count*p.recruitCost,valid:M.validate(s)};
  });
  expect(result).toMatchObject({applied:true,repeat:true,class:'arch',column:true,count:45,exact:true,next:25,
    people:true,food:true,local:true,privateGold:true,remote:true,refused:true,valid:true});
  expect(result.cost).toBeCloseTo(result.expected,8);
});

test('daily dispatch uses shared reviews once and matching saves preserve exact supply checkpoints and replay',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),camp=M.migration(s,C.rid).at;
    C.host(s,1).at=C.remote;C.host(s,1).from=C.remote;s.turn++;
    r.lastAI=Math.floor(s.turn/90);r.agreements[0].harvestPeriod=Math.floor(s.turn/90);
    C.stock(s,camp,10000);C.stock(s,C.remote,10000);
    const checkpoint=JSON.parse(JSON.stringify(s)),manual=JSON.parse(JSON.stringify(s));
    const old=M.row(manual,C.rid);old.lastDay=manual.turn;old.worked={};
    M.commit(manual,M.supplyReview(manual,C.rid,'trade'));
    old.columns.entries.forEach(function (c,index) {M.commit(manual,M.columnSupplyReview(manual,C.rid,c.id,index ? 'trade' : 'load'));});
    M.commit(manual,M.supplyReview(manual,C.rid,'recruit'));
    const campUse=old.members.reduce(function (n,m) {return n+m.civilians.concat(m.reserve).reduce(function (v,c) {return v+c.count;},0);},0)*M.profile(manual,C.rid).foodPerPerson;
    old.food=Math.max(0,old.food-campUse);
    M.day(s);const equivalent=JSON.stringify(manual)===JSON.stringify(s),first=JSON.stringify(s);
    M.day(s);const once=first===JSON.stringify(s);
    M.day(checkpoint);const replay=first===JSON.stringify(checkpoint);
    const rng=FB.getRngState()>>>0,uid=FB.getUidCounter(),record=JSON.stringify([M.row(s,C.rid),s.armies,s.market]);
    const saved=FB.save.serialize();FB.save.restore(JSON.parse(saved));const restored=FB.state;
    const same=record===JSON.stringify([M.row(restored,C.rid),restored.armies,restored.market]),bytes=JSON.stringify(restored);
    M.day(restored);
    return {equivalent:equivalent,once:once,replay:replay,same:same,noReplay:bytes===JSON.stringify(restored),
      identities:rng===(FB.getRngState()>>>0) && uid===FB.getUidCounter(),valid:M.validate(restored)};
  });
  expect(result).toEqual({equivalent:true,once:true,replay:true,same:true,noReplay:true,identities:true,valid:true});
});

test('exhausted shared pasture and markets never create camp or remote food',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),at=M.migration(s,C.rid).at;
    C.host(s,1).at=C.remote;C.host(s,1).from=C.remote;r.food=0;s.turn++;
    r.lastAI=Math.floor(s.turn/90);const cap=Math.floor(s.population.counties[at].count*0.15);
    s.mobilePastures={schema:1,period:Math.floor(s.turn/90),used:{}};s.mobilePastures.used[at]=cap;
    delete r.agreements[0].harvestPeriod;C.stock(s,at,0);C.stock(s,C.remote,0);
    const before=C.totals(s);M.day(s);s.armies.filter(function (a) {return a.realm===C.rid;}).forEach(function (a) {FB.provisionArmy(s,a);});
    const after=C.totals(s),bytes=JSON.stringify(s);M.day(s);
    return {food:after.food,used:s.mobilePastures.used[at]===cap,money:after.gold===before.gold,
      people:after.people<=before.people,local:after.local===before.local,privateGold:after.privateGold===before.privateGold,
      repeated:bytes===JSON.stringify(s),valid:M.validate(s)};
  });
  expect(result).toEqual({food:0,used:true,money:true,people:true,local:true,privateGold:true,repeated:true,valid:true});
});

test('a retired slot recovers its original host identity without replacing missing people',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),c=r.columns.entries[0],id=c.hostId;
    r.food=500;const before=C.totals(s),uid=FB.getUidCounter(),rng=FB.getRngState();
    const retired=M.commit(s,M.reviewColumns(s,{realmId:C.rid,action:'demuster',terms:{columnId:c.id},actor:{kind:'character',id:r.leaderId}}));
    const q=M.supplyReview(s,C.rid,'recruit'),recovered=M.commit(s,q),a=C.host(s,0);
    const saved=JSON.stringify([r,s.armies]);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {retired:retired,recovered:recovered,id:a && a.id===id,count:a && a.men,people:C.totals(FB.state).people===before.people,
      identities:uid===FB.getUidCounter() && (rng>>>0)===(FB.getRngState()>>>0),
      restored:saved===JSON.stringify([M.row(FB.state,C.rid),FB.state.armies]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({retired:true,recovered:true,id:true,count:45,people:true,identities:true,restored:true,valid:true});
});

test('recovery cannot reach remote columns, underfunded pools, missing rations or a below-minimum retired slot',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=columnSupplyCase,original=FB.state,M=FB.mobile;
    return ['remote','funds','food','pledges','minimum'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,C.rid);r.food=500;
      if (kind==='remote' || kind==='minimum') r.columns.entries.forEach(function (c) {const a=s.armies.find(function (v) {return v.id===c.hostId;});a.at=C.remote;a.from=a.at;});
      if (kind==='funds') FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid)-M.profile(s,C.rid).supplyPolicy.cashReserve);
      if (kind==='food') r.food=0;
      if (kind==='pledges') r.members.forEach(function (m) {m.pledge=0;});
      if (kind==='minimum') {
        const a=C.host(s,0);a.at=M.migration(s,C.rid).at;a.from=a.at;
        M.commit(s,M.reviewColumns(s,{realmId:C.rid,action:'demuster',terms:{columnId:r.columns.entries[0].id},actor:{kind:'character',id:r.leaderId}}));
      }
      const before=JSON.stringify(s),q=M.supplyReview(s,C.rid,'recruit');
      return !q.review.allowed && !M.commit(s,q) && before===JSON.stringify(s);
    });
  });
  expect(result).toEqual(Array(5).fill(true));
});

test('changing a policy under the same mod name cannot restore an old supply checkpoint',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize();input.mobileProfiles.dune_compact.supplyPolicy.targetDays++;
    FB.mods.apply(input);const bytes=JSON.stringify(FB.state);let rejected=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {rejected=/different mod/.test(error.message);}
    return {rejected:rejected,pure:bytes===JSON.stringify(FB.state)};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({rejected:true,pure:true});
});

test('malformed policies and excessive opening carriage reject through detached ordinary JSON validation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (input) {
    const changes=[function (v) {v.mobileProfiles.dune_compact.supplyPolicy.carryDays=0;},
      function (v) {v.mobileProfiles.dune_compact.supplyPolicy.replacement.unitIds=['missing_class'];},
      function (v) {v.mobileProfiles.dune_compact.supplyPolicy.replacement.maxPerReview=10001;},
      function (v) {v.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.columns.entries[0].food=100;},
      function (v) {v.mobileProfiles.dune_compact.supplyPolicy.extra=1;}];
    return changes.map(function (change) {const v=JSON.parse(JSON.stringify(input));change(v);
      const bytes=JSON.stringify([v,FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(v).length>0 && bytes===JSON.stringify([v,FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();});
  },examples.dune);
  expect(result).toEqual(Array(5).fill(true));
});

for (const width of [1280,390]) {
  test('supply reviews retain column selection and focus at '+width+' pixels',async function ({page},info) {
    await page.setViewportSize({width:width,height:900});await start(page,info,'dune');
    await page.evaluate(function () {
      const C=columnSupplyCase,s=FB.state,r=FB.mobile.row(s,C.rid);s.player.charId=r.leaderId;r.food=500;FB.ui.showMobileConfederation(C.rid);
    });
    const second=await page.locator('#mobile-column option').nth(1).getAttribute('value');
    await page.locator('#mobile-column').selectOption(second);
    const load=page.getByRole('button',{name:'Load selected column from camp',exact:true});
    await load.click();await expect(page.locator('#mobile-confirm')).toBeVisible();
    await page.keyboard.press('Escape');await expect(page.locator('#mobile-column')).toHaveValue(second);await expect(load).toBeFocused();
  });
}
