'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-supply-harbor.json'),
  upland:require('../fixtures/authoring/expedition-supply-upland.json')};

dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/government_selection.js','js/governments.js',
  'js/authority.js','js/population.js','js/market.js','js/treasury.js','js/logistics.js','js/armies.js',
  'js/world.js','js/bookmark_setup.js','js/starts.js','js/mods.js','js/save.js','js/save_v4.js',
  'js/ui_mobile.js','js/ui_misc.js','js/main.js','js/technology.js','js/model.js','js/federates.js']);

async function start(page,info,prefix) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expedition-supply-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','upland']) {
  test(prefix+' imports its own scale and policy without creating supplies or consuming state in a review',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
      const rid=d.id,r=M.row(s,rid),host=M.host(s,rid),p=M.profile(s,rid);
      const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      const snapshot=M.supplySnapshot(s,rid),player=M.supplyReview(s,rid,'trade',{kind:'character',id:r.leaderId}),ai=M.supplyReview(s,rid,'trade');
      return {people:M.total(s,rid),fighters:host.men,days:snapshot.targetDays,carry:snapshot.carryDays,
        food:r.food+host.mobileFood,local:snapshot.fieldLocal,needs:snapshot.campDaily>0 && snapshot.fieldDaily>0,
        candidate:player.review.allowed && ai.review.allowed && player.review.cost===ai.review.cost,
        sane:snapshot.fieldCapacity===host.men*p.foodPerPerson*p.supplyPolicy.carryDays,
        pure:before===JSON.stringify(s) && data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        technology:FBDATA.techImpactReviews.features.mobile_provisioning.mode,valid:M.validate(s)};
    });
    expect(result).toEqual({people:prefix==='harbor' ? 1400 : 500,fighters:prefix==='harbor' ? 160 : 40,
      days:prefix==='harbor' ? 14 : 7,carry:prefix==='harbor' ? 21 : 5,food:0,local:true,needs:true,
      candidate:true,sane:true,pure:true,technology:'none',valid:true});
  });

  test(prefix+' buys a partial local stock with the real public purse and retains its cash reserve',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),rid=d.id;
      const r=M.row(s,rid),at=M.migration(s,rid).at,p=M.profile(s,rid),host=M.host(s,rid);
      const index=s.market.goods.indexOf('provisions');s.market.counties[at][0][index]=3;
      const price=FB.marketProvisionSnapshot(s,at).price*0.1125;
      FB.treasurySpend(s,rid,FB.treasuryAvailable(s,rid));FB.treasuryCredit(s,rid,p.supplyPolicy.cashReserve+price*2.5);
      const quote=M.supplyReview(s,rid,'trade'),stock=FB.marketProvisionSnapshot(s,at).stock;
      const gold=FB.treasuryAvailable(s,rid),payee=s.owner[at],outside=FB.treasuryAvailable(s,payee),privateGold=s.player.gold;
      const applied=M.commit(s,quote),again=!M.commit(s,quote);
      return {applied:applied,again:again,count:quote.review.terms.count,food:r.food,field:host.mobileFood,
        debit:gold-FB.treasuryAvailable(s,rid),credit:FB.treasuryAvailable(s,payee)-outside,cost:quote.review.cost,
        stock:stock-FB.marketProvisionSnapshot(s,at).stock,reserve:FB.treasuryAvailable(s,rid)>=p.supplyPolicy.cashReserve,
        privateUnchanged:s.player.gold===privateGold,people:M.total(s,rid)===r.accounting.initial,valid:M.validate(s)};
    });
    expect(result).toMatchObject({applied:true,again:true,count:2,food:2,field:0,stock:2,reserve:true,privateUnchanged:true,people:true,valid:true});
    expect(result.debit).toBeCloseTo(result.cost,8);expect(result.credit).toBeCloseTo(result.cost,8);
  });

  test(prefix+' daily AI uses current food demand once and preserves matching checkpoints and replay',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),rid=d.id;
      const r=M.row(s,rid),at=M.migration(s,rid).at,host=M.host(s,rid);
      // Stage the next daily boundary and an already used pasture period.
      s.turn++;r.agreements[0].harvestPeriod=Math.floor(s.turn/90);r.lastAI=Math.floor(s.turn/90);
      s.market.counties[at][0][s.market.goods.indexOf('provisions')]=10000;
      const people=M.total(s,rid),market=FB.marketProvisionSnapshot(s,at).stock,gold=FB.treasuryAvailable(s,rid);
      const checkpoint=JSON.parse(JSON.stringify(s));
      M.day(s);const consumed=FB.provisionArmy(s,host),first=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.day(s);const repeated=FB.provisionArmy(s,host)===0 && first===JSON.stringify(s);
      const purchased=market-FB.marketProvisionSnapshot(s,at).stock;
      M.day(checkpoint);FB.provisionArmy(checkpoint,M.host(checkpoint,rid));
      const replay=first===JSON.stringify(checkpoint) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const record=JSON.stringify([r,host,s.market,s.mobilePastures || null,FB.treasuryAvailable(s,rid)]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state,restoredBefore=JSON.stringify(restored);M.day(restored);FB.provisionArmy(restored,M.host(restored,rid));
      return {purchased:purchased>0,spent:FB.treasuryAvailable(s,rid)<gold,repeated:repeated,replay:replay,
        consumed:consumed>0,conserved:people===M.total(s,rid),capacity:host.mobileFood<=M.supplySnapshot(s,rid).fieldCapacity,
        restored:record===JSON.stringify([M.row(restored,rid),M.host(restored,rid),restored.market,restored.mobilePastures || null,FB.treasuryAvailable(restored,rid)]),
        noReplay:restoredBefore===JSON.stringify(restored),valid:M.validate(restored)};
    });
    expect(result).toEqual({purchased:true,spent:true,repeated:true,replay:true,consumed:true,conserved:true,
      capacity:true,restored:true,noReplay:true,valid:true});
  });
}

test('malformed supply policies reject detached, including unknown classes and same-import references',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (p) {p.schema=2;},function (p) {delete p.schema;},function (p) {p.extra=true;},
      function (p) {p.targetDays=0;},function (p) {p.targetDays=31;},function (p) {p.targetDays=1.5;},
      function (p) {p.carryDays=0;},function (p) {p.carryDays=31;},function (p) {p.cashReserve=-1;},
      function (p) {p.cashReserve='12';},function (p) {p.replacement.targetMen=-1;},
      function (p) {p.replacement.maxPerReview=0;},function (p) {p.replacement.maxPerReview=10001;},
      function (p) {p.replacement.unitIds=[];},function (p) {p.replacement.unitIds=['missing_supply_class'];},
      function (p) {p.replacement.unitIds=['arch','arch'];},function (p) {p.replacement.unitIds=['merc'];},
      function (p) {p.replacement.extra=true;},function (p) {p.replacement=null;}];
    const rejected=changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),p=input.mobileProfiles.harbor_compact.supplyPolicy;change(p);
      const before=JSON.stringify([input,FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && before===JSON.stringify([input,FB.state,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    const added=JSON.parse(JSON.stringify(source));added.unitClasses={supply_arch:JSON.parse(JSON.stringify(FBDATA.unitClasses.arch))};
    added.mobileProfiles.harbor_compact.supplyPolicy.replacement.unitIds=['supply_arch'];
    const omitted=JSON.parse(JSON.stringify(source));delete omitted.mobileProfiles.harbor_compact.supplyPolicy;
    return {rejected:rejected,sameImport:FB.mods.validate(added),omitted:FB.mods.validate(omitted)};
  },examples.harbor);
  expect(result).toEqual({rejected:Array(19).fill(true),sameImport:[],omitted:[]});
});

test('empty markets, reserved cash, refused access and obsolete quotes transfer nothing',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='harbor_following';
    return ['empty','funds','access','price','need','authority','forged'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,rid),at=M.migration(s,rid).at;
      s.market.counties[at][0][s.market.goods.indexOf('provisions')]=10000;
      if (kind==='empty') s.market.counties[at][0][s.market.goods.indexOf('provisions')]=0;
      if (kind==='funds') FB.treasurySpend(s,rid,FB.treasuryAvailable(s,rid)-M.profile(s,rid).supplyPolicy.cashReserve);
      if (kind==='access') r.agreements[0].status='ended';
      const quote=M.supplyReview(s,rid,'trade');
      if (kind==='price') s.market.counties[at][0][s.market.goods.indexOf('provisions')]=3;
      if (kind==='need') r.food=10000;
      if (kind==='authority') s.chars[r.leaderId].captive=true;
      if (kind==='forged') {quote.request.terms.count++;quote.review.terms.count++;}
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      return !M.commit(s,quote) && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(7).fill(true));
});

test('a remote field host cannot draw camp food and each real loss removes its share once',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid),host=M.host(s,rid),p=M.profile(s,rid);
    r.food=500;host.mobileFood=30;host.at='harbor_ridge';s.turn++;
    const before=JSON.stringify(s),snapshot=M.supplySnapshot(s,rid),pure=before===JSON.stringify(s),camp=r.food;
    const use=FB.provisionArmy(s,host),remote=r.food===camp,afterUse=host.mobileFood;
    const total=M.total(s,rid),men=host.men;FB.applyHostLosses(host,10,s);
    const proportional=Math.abs(host.mobileFood-afterUse*(men-10)/men)<0.000001;
    const after=JSON.stringify(s),repeat=FB.provisionArmy(s,host)===0 && after===JSON.stringify(s);
    return {pure:pure,remote:remote,local:snapshot.fieldLocal,noFieldTarget:snapshot.campTarget===snapshot.campDaily*p.supplyPolicy.targetDays,
      noRecruit:snapshot.replacement===null,used:use>0,proportional:proportional,repeat:repeat,
      lost:M.total(s,rid)===total-10 && r.accounting.dead===10,valid:M.validate(s)};
  });
  expect(result).toEqual({pure:true,remote:true,local:false,noFieldTarget:true,noRecruit:true,used:true,proportional:true,repeat:true,lost:true,valid:true});
});

test('replacement reviews conserve pledged people, public money and ordinary class eligibility',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='upland_coalition',r=M.row(s,rid),host=M.host(s,rid),p=M.profile(s,rid);
    r.food=100;const people=M.total(s,rid),men=host.men,gold=FB.treasuryAvailable(s,rid),privateGold=s.player.gold;
    const review=M.supplyReview(s,rid,'recruit',{kind:'character',id:r.leaderId}),ai=M.supplyReview(s,rid,'recruit');
    const same=review.review.allowed && ai.review.allowed && review.review.cost===ai.review.cost;
    const applied=M.commit(s,review),repeat=!M.commit(s,review),actual=host.men-men;
    const locked=JSON.parse(JSON.stringify(s));M.row(locked,rid).members.forEach(function (m) {m.allegiance=false;});
    const noPledge=!M.supplyReview(locked,rid,'recruit').review.allowed;
    const hungry=JSON.parse(JSON.stringify(s));M.row(hungry,rid).food=0;M.host(hungry,rid).mobileFood=0;
    const noFood=!M.supplyReview(hungry,rid,'recruit').review.allowed;
    const broke=JSON.parse(JSON.stringify(s));FB.treasurySpend(broke,rid,FB.treasuryAvailable(broke,rid)-p.supplyPolicy.cashReserve);
    const noCash=!M.supplyReview(broke,rid,'recruit').review.allowed;
    return {same:same,applied:applied,repeat:repeat,actual:actual,cost:gold-FB.treasuryAvailable(s,rid),
      expected:review.review.cost,conserved:M.total(s,rid)===people,privateUnchanged:s.player.gold===privateGold,
      noPledge:noPledge,noFood:noFood,noCash:noCash,valid:M.validate(s)};
  });
  expect(result).toMatchObject({same:true,applied:true,repeat:true,actual:5,conserved:true,privateUnchanged:true,
    noPledge:true,noFood:true,noCash:true,valid:true});expect(result.cost).toBeCloseTo(result.expected,8);
});

test('used pasture capacity and inaccessible pasture cannot become new policy food',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='harbor_following';
    return ['used','refused'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,rid),at=M.migration(s,rid).at;
      // Spendable money and market are deliberately empty, leaving only pasture.
      FB.treasurySpend(s,rid,FB.treasuryAvailable(s,rid));s.market.counties[at][0][s.market.goods.indexOf('provisions')]=0;
      s.turn++;r.lastAI=Math.floor(s.turn/90);r.food=0;
      if (kind==='used') s.mobilePastures={schema:1,period:Math.floor(s.turn/90),used:{[at]:Math.floor(s.population.counties[at].count*0.15)}};
      else r.agreements[0].status='ended';
      const field=M.host(s,rid).mobileFood,people=M.total(s,rid);M.day(s);
      const after=JSON.stringify(s);M.day(s);
      return r.food===0 && M.host(s,rid).mobileFood===field && M.total(s,rid)<=people && after===JSON.stringify(s) && M.validate(s);
    });
  });
  expect(result).toEqual([true,true]);
});

test('a locked preferred class falls back to the next ordinarily eligible replacement',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid);r.food=100;
    const tech=FB.realmTechRecord(s,rid);tech.completed=tech.completed.filter(function (id) {return id!=='crossbows';});
    const before=JSON.stringify(s),snapshot=M.supplySnapshot(s,rid),review=M.supplyReview(s,rid,'recruit');
    const locked=M.review(s,{realmId:rid,action:'recruit',terms:{count:1,unitId:'crossbow'},actor:{kind:'realm',id:rid}});
    return {preferred:M.profile(s,rid).supplyPolicy.replacement.unitIds[0],chosen:snapshot.replacement.unitId,
      allowed:review.review.allowed,locked:!locked.review.allowed && locked.review.reason==='technology',pure:before===JSON.stringify(s)};
  });
  expect(result).toEqual({preferred:'crossbow',chosen:'arch',allowed:true,locked:true,pure:true});
});

test('lower host carrying limits preserve excess stock and use food once without grants',async function ({page},info) {
  await start(page,info,'upland');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='upland_coalition',r=M.row(s,rid),host=M.host(s,rid);
    r.food=100;s.turn++;
    const before=r.food+host.mobileFood,paid=FB.provisionArmy(s,host),capacity=M.supplySnapshot(s,rid).fieldCapacity;
    const bounded=host.mobileFood<=capacity,conserved=Math.abs(before-r.food-host.mobileFood-paid)<0.000001;
    const fullness=Math.abs(host.supply-host.mobileFood/capacity*100)<0.000001;
    // Stage conserved excess carried stock, as retained after a lowered policy.
    r.food-=10;host.mobileFood+=10;s.turn++;
    const camp=r.food,carried=host.mobileFood,use=FB.provisionArmy(s,host);
    const after=JSON.stringify(s);
    return {bounded:bounded,conserved:conserved,fullness:fullness,retained:host.mobileFood>capacity && Math.abs(carried-host.mobileFood-use)<0.000001,
      noRefill:r.food===camp,repeated:FB.provisionArmy(s,host)===0 && after===JSON.stringify(s),valid:M.validate(s)};
  });
  expect(result).toEqual({bounded:true,conserved:true,fullness:true,retained:true,noRefill:true,repeated:true,valid:true});
});

test('changed policy fingerprints and forged saved policy cursors reject without restore effects',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function (source) {
    const saved=JSON.parse(FB.save.serialize()),bad=JSON.parse(JSON.stringify(FB.state));
    FB.mobile.row(bad,'harbor_following').supplyPolicy={schema:1,policyId:'harbor_compact',lastTurn:0,revision:0};
    const original=JSON.stringify(bad);let malformed=false;
    try {FB.mobile.validate(bad);} catch (error) {malformed=true;}
    const changed=JSON.parse(JSON.stringify(source));changed.mobileProfiles.harbor_compact.supplyPolicy.targetDays=13;FB.mods.apply(changed);
    const before=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let mismatch=false;
    try {FB.save.restore(saved);} catch(error) {mismatch=/different mod/.test(error.message);}
    return {malformed:malformed,detached:original===JSON.stringify(bad),mismatch:mismatch,
      pure:before===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.harbor);
  expect(result).toEqual({malformed:true,detached:true,mismatch:true,pure:true});
});

test('supply review retains mobile inputs, disclosure and focus through Escape and stale confirmation',async function ({page},info) {
  await page.setViewportSize({width:390,height:844});await start(page,info,'harbor');
  await page.evaluate(function () {
    const s=FB.state,rid='harbor_following';s.player.charId=FB.mobile.row(s,rid).leaderId;
    FB.ui.showMobileConfederation(rid,{'mobile-count':37});
  });
  const button=page.getByRole('button',{name:/^Replenish supplies/});await expect(button).toBeEnabled();
  const id=await button.getAttribute('id');await page.locator('[aria-controls="'+id+'-details"]').click();
  await button.scrollIntoViewIfNeeded();await button.focus();
  await button.press('Enter');await expect(page.locator('#mobile-confirm')).toBeVisible();await page.keyboard.press('Escape');
  await expect(button).toBeFocused();await expect(page.locator('#mobile-count')).toHaveValue('37');
  await expect(page.locator('[aria-controls="'+id+'-details"]')).toHaveAttribute('aria-expanded','true');
  await button.click();
  const before=await page.evaluate(function () {FB.mobile.row(FB.state,'harbor_following').food=10000;return JSON.stringify(FB.state);});
  await page.locator('#mobile-confirm').click();await expect(page.getByRole('heading',{name:'Terms changed',exact:true})).toBeVisible();
  expect(await page.evaluate(function () {return JSON.stringify(FB.state);})).toBe(before);
  await page.locator('#mobile-continue').click();await expect(button).toBeFocused();await expect(page.locator('#mobile-count')).toHaveValue('37');
});
