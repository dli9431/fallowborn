'use strict';
const path = require('path');
const { test, expect } = require('../support/fixture');
const { dependsOnRuntime } = require('../support/runtime-dependencies');
const { startHistoricalGame } = require('../support/game/historical-start');

dependsOnRuntime(__filename, [
  'index.html','data/mobile_confederations.js','data/actions.js','data/lexicons.js','data/technology.js',
  'data/bookmark_476.js','data/units.js','js/mobile_confederations.js','js/mobile_command.js','js/expedition_programs.js','js/mobile_columns.js','js/ui_mobile.js',
  'js/governments.js','js/government_selection.js','js/government_continuity.js','js/government_levy.js',
  'js/government_revenue.js','js/government_ai.js','js/government_diplomacy.js','js/world.js','js/population.js',
  'js/armies.js','js/fortifications.js','js/federates.js','js/logistics.js','js/market.js','js/treasury.js',
  'js/authority.js','js/wars.js','js/model.js','js/main.js','js/actions.js','js/ui_misc.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/starts.js'
]);
async function start(page,testInfo,fictional,crazygames) {
  await startHistoricalGame(page,testInfo,{bookmark:'476',
    code:'MOBILE-476-mobile_household_476-cherson-m-Review-established'},!!crazygames);
  if (fictional) await page.addScriptTag({path:path.resolve(__dirname,'../fixtures/mobile-confederation.js')});
  return page.evaluate(function (fictional) {
    const s=FB.state;
    if(!fictional) return 'pontic_following_476';
    const d=FB_MOBILE_FIXTURE, base=s.realms.pontic_following_476;
    s.realms[d.id]=Object.assign({},JSON.parse(JSON.stringify(base)),{id:d.id,name:d.name,capital:d.capital,rank:d.rank,ruler:{generation:1}});
    delete s.realms[d.id].treasury;
    const forms={};forms[d.id]=d.government;FB.authoritySeedGovernments(s,forms);
    FB.invalidateRealmCache();FB.governments.invalidate();FB.treasuryInitialize(s);
    FB.mobile.initialize(s,[d]);return d.id;
  },!!fictional);
}
/* Only test setup supplies ordinary consent from each actual principal. The
   transactions remain the shipped pure review and atomic commit APIs. */
async function approve(page,rid,operation,terms) {
  return page.evaluate(function (args) {
    const s=FB.state,M=FB.mobile,rid=args.rid;
    function act(action,terms,actor) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}}));}
    if(!act('propose',{operation:args.operation,proposal:args.terms})) return false;
    M.members(s,rid).forEach(function (m) {act('assent',{assent:true},m.principal);});
    return true;
  },{rid:rid,operation:operation,terms:terms});
}
for (const fictional of [false,true]) {
  const label=fictional ? 'fictional river coalition' : 'researched fresh 476 coalition';
  test(label+' has no phantom counties, genealogy or duplicated population',async function ({page},testInfo) {
    const rid=await start(page,testInfo,fictional);
    const result=await page.evaluate(function (rid) {
      const s=FB.state,M=FB.mobile,r=M.row(s,rid),before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      for(let i=0;i<3;i++) {M.members(s,rid);M.leader(s,rid);M.review(s,{realmId:rid,action:'recruit',terms:{count:20,unitId:FB.unitRoleClass('levy_infantry')},actor:{kind:'realm',id:rid}});}
      return {pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        counties:FB.realmTerritory(s,rid).length,noDynasty:!s.realms[rid].succession,
        levy:FB.aiBaseHost(s,rid),total:M.total(s,rid),initial:r.accounting.initial,
        civilians:r.members.reduce(function (n,m) {return n+m.civilians.reduce(function (v,c) {return v+c.count;},0);},0),
        host:M.host(s,rid).men,valid:M.validate(s),errors:FB.governments.validate(),
        normalized:FB.unitClassIds().every(function (id) {
          return Number.isInteger(M.host(s,rid).units[id]) && M.host(s,rid).units[id] >= 0;
        })};
    },rid);
    expect(result).toMatchObject({pure:true,counties:0,noDynasty:true,levy:0,valid:true,errors:[],normalized:true});
    expect(result.total).toBe(result.initial);expect(result.civilians+result.host).toBe(result.total);
  });
  test(label+' conserves recruitment, casualties, defeat and recovery',async function ({page},testInfo) {
    const rid=await start(page,testInfo,fictional);
    const result=await page.evaluate(function (rid) {
      const s=FB.state,M=FB.mobile,r=M.row(s,rid),initial=M.total(s,rid),actor={kind:'realm',id:rid};
      const req={realmId:rid,action:'recruit',terms:{count:20,unitId:FB.unitRoleClass('levy_infantry')},actor:actor};
      const review=M.review(s,req),gold=FB.treasuryAvailable(s,rid),recruited=M.commit(s,review);
      const afterRecruit=M.total(s,rid),charged=gold-FB.treasuryAvailable(s,rid);
      let army=M.host(s,rid);const lost=army.men;FB.applyHostLosses(army,lost,s);FB.disbandArmy(s,army);
      const alive=s.realms[rid].alive,following=M.total(s,rid),dead=r.accounting.dead;
      FB.federatePrepareDay(s);FB.federateDay(s);FB.federatePrepareDay(s);
      const once=following===M.total(s,rid) && dead===r.accounting.dead;
      const recovered=M.commit(s,M.review(s,req));army=M.host(s,rid);
      return {recruited:recruited,conserved:initial===afterRecruit,charged:charged,expected:review.review.cost,
        alive:alive,once:once,recovered:recovered,following:following,afterRecovery:M.total(s,rid),
        fighterLoss:lost,dead:dead,host:army && army.men,valid:M.validate(s),
        normalized:!!army && FB.unitClassIds().every(function (id) {
          return Number.isInteger(army.units[id]) && army.units[id] >= 0;
        })};
    },rid);
    expect(result).toMatchObject({recruited:true,conserved:true,alive:true,once:true,recovered:true,host:20,valid:true,normalized:true});
    expect(result.charged).toBeCloseTo(result.expected,8);expect(result.dead).toBeGreaterThanOrEqual(result.fighterLoss);
    expect(result.afterRecovery).toBe(result.following);
  });
  test(label+' elects from current principals and rejects stale or dead candidates',async function ({page},testInfo) {
    const rid=await start(page,testInfo,fictional);
    const result=await page.evaluate(function (rid) {
      const s=FB.state,M=FB.mobile,r=M.row(s,rid);const old=M.leader(s,rid);FB.killChar(s,old);
      if(!r.selection) FB.advanceRealmSuccession(s,rid,{cause:'death'});
      const candidate=M.members(s,rid)[0].principal.id;
      M.members(s,rid).forEach(function (m) {M.commit(s,M.review(s,{realmId:rid,action:'support',terms:{candidateId:candidate},actor:m.principal}));});
      const req={realmId:rid,action:'select',terms:{candidateId:candidate},actor:{kind:'realm',id:rid}},review=M.review(s,req);
      r.members[r.members.length-1].weight++;const changed=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const stale=!M.commit(s,review) && changed===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      s.chars[candidate].captive=true;const capturedBlocked=!M.review(s,req).review.allowed;delete s.chars[candidate].captive;
      const generation=FB.realmRulerGeneration(s,rid),selected=M.commit(s,M.review(s,req));
      const repeated=!M.commit(s,M.review(s,req));FB.killChar(s,s.chars[candidate]);
      const deadBlocked=!M.review(s,req).review.allowed;
      return {stale:stale,selected:selected,repeated:repeated,oneGeneration:FB.realmRulerGeneration(s,rid)===generation+1,
        deadBlocked:deadBlocked,capturedBlocked:capturedBlocked,noDynasty:!s.realms[rid].succession,valid:M.validate(s)};
    },rid);
    expect(result).toEqual({stale:true,selected:true,repeated:true,oneGeneration:true,deadBlocked:true,capturedBlocked:true,noDynasty:true,valid:true});
  });
}
test('carried food survives demuster and recruitment without a free supply reset',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const result=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,r=M.row(s,rid),actor={kind:'realm',id:rid};
    function act(action,terms) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms || {},actor:actor}));}
    let army=M.host(s,rid);const food=r.food+army.mobileFood;
    const demustered=act('demuster'),recruited=act('recruit',{count:60,unitId:FB.unitRoleClass('levy_infantry')});
    army=M.host(s,rid);const conserved=food===r.food+army.mobileFood,noFreeBag=army.mobileFood===0 && army.supply===0;
    const before=r.food+army.mobileFood,used=FB.provisionArmy(s,army),after=r.food+army.mobileFood;
    const repeated=FB.provisionArmy(s,army)===0 && after===r.food+army.mobileFood;
    const hired=M.review(s,{realmId:rid,action:'recruit',terms:{count:1,unitId:FB.unitRoleClass('mercenary')},actor:actor});
    return {demustered:demustered,recruited:recruited,conserved:conserved,noFreeBag:noFreeBag,
      consumed:before-after,used:used,repeated:repeated,hiredBlocked:!hired.review.allowed,valid:M.validate(s)};
  },rid);
  expect(result).toMatchObject({demustered:true,recruited:true,conserved:true,noFreeBag:true,repeated:true,hiredBlocked:true,valid:true});
  expect(result.used).toBeGreaterThan(0);expect(result.consumed).toBeCloseTo(result.used,8);
});
test('losing the last held county preserves the canonical court and following',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const result=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,total=M.total(s,rid),court=M.migration(s,rid).at;
    FB.transferProvince(s,court,rid);FB.transferProvince(s,court,'byzantium');
    return {alive:s.realms[rid].alive,capital:s.realms[rid].capital,court:M.migration(s,rid).at,
      population:total===M.total(s,rid),counties:FB.realmTerritory(s,rid).length,saved:!!FB.save.serialize(),valid:M.validate(s)};
  },rid);
  expect(result).toEqual({alive:true,capital:'cherson',court:'cherson',population:true,counties:0,saved:true,valid:true});
});
test('professional losses cannot create county replacements or automatic following reinforcements',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const result=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,actor={kind:'realm',id:rid};
    function act(action,terms) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms || {},actor:actor}));}
    FB.transferProvince(s,'cherson',rid);
    if(!act('demuster') || !act('recruit',{count:60,unitId:FB.unitRoleClass('household')})) throw new Error('Professional following did not recruit');
    const army=M.host(s,rid),total=M.total(s,rid),losses=FB.applyHostLosses(army,10,s);FB.noteCohortLosses(s,rid,losses);
    FB.provisionArmy(s,army);
    const gold=FB.treasuryAvailable(s,rid), treasury=s.realms[rid].treasury.gold;
    const upkeep=FB.hostFieldUpkeepParts(s,army).total/90;
    s.turn++;FB.armyTick(s);FB.federateDay(s);
    return {men:army.men,people:total-M.total(s,rid),ledger:!!(s.armyCohorts && s.armyCohorts[rid]),
      gold:s.realms[rid].treasury.gold===treasury,upkeep:gold-FB.treasuryAvailable(s,rid),expectedUpkeep:upkeep,valid:M.validate(s)};
  },rid);
  expect(result).toMatchObject({men:50,people:10,ledger:false,gold:true,valid:true});
  expect(result.upkeep).toBeCloseTo(result.expectedUpkeep,8);
});
test('protected field movement leaves civilians at camp and court movement needs separate access',async function ({page},testInfo) {
  const rid=await start(page,testInfo,true);
  const route=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,army=M.host(s,rid),at=M.migration(s,rid).at;
    const countyId=Object.keys(FB.world.adj[at]).sort().find(function (pid) {
      const p=FB.armyOrderPlan(s,army,pid);
      return s.owner[pid]==='byzantium' && p.ok && p.path.length && p.path.every(function (id) {return s.owner[id]==='byzantium';});
    });
    return {countyId:countyId,origin:at};
  },rid);
  expect(route.countyId).toBeTruthy();
  const protection={kind:'protection',partnerId:'byzantium',levy:60,price:4,duration:360};
  await approve(page,rid,'agreement',protection);
  const result=await page.evaluate(function (a) {
    const s=FB.state,M=FB.mobile,rid=a.rid,actor={kind:'realm',id:rid},r=M.row(s,rid);
    function act(action,terms) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms || {},actor:actor}));}
    act('offer',a.terms);const id=r.agreements[0].id;
    M.commit(s,M.review(s,{realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'byzantium'}}));
    const army=M.host(s,rid);army.mobileCourt=true;
    const blocked=!M.review(s,{realmId:rid,action:'move',terms:{countyId:a.route.countyId},actor:actor}).review.allowed;
    const marched=act('march',{countyId:a.route.countyId});
    for(let i=0;i<90 && army.at!==a.route.countyId;i++) {s.turn++;FB.armyTick(s);FB.federateDay(s);}
    return {blocked:blocked,marched:marched,arrived:army.at===a.route.countyId,court:M.migration(s,rid).at,
      principals:M.members(s,rid).every(function (m) {return s.chars[m.principal.id].homeProvinceId===a.route.origin;}),
      carriage:army.mobileCourt,valid:M.validate(s)};
  },{rid:rid,terms:protection,route:route});
  expect(result).toEqual({blocked:true,marched:true,arrived:true,court:route.origin,principals:true,carriage:false,valid:true});
});
test('bilateral seasonal access spends once, respects capacity and never grants sovereignty',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const capacity=await page.evaluate(function () {return Math.floor(FB.state.population.counties.cherson.count*0.15);});
  const terms={kind:'access',partnerId:'byzantium',countyIds:['cherson'],capacity:capacity,allowRecruit:true,price:4,duration:2};
  expect(await approve(page,rid,'agreement',terms)).toBe(true);
  const result=await page.evaluate(function (args) {
    const s=FB.state,M=FB.mobile,rid=args.rid,r=M.row(s,rid),owner=s.owner.cherson,holder=s.holder.cherson;
    const offered=M.commit(s,M.review(s,{realmId:rid,action:'offer',terms:args.terms,actor:{kind:'realm',id:rid}}));
    const id=r.agreements[0].id,req={realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'byzantium'}};
    const gold=FB.treasuryAvailable(s,rid)+FB.treasuryAvailable(s,'byzantium'),accepted=M.commit(s,M.review(s,req));
    const repeated=!M.commit(s,M.review(s,req));
    function act(action,terms,actor) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}}));}
    function agree(terms) {act('propose',{operation:'agreement',proposal:terms});M.members(s,rid).forEach(function (m) {act('assent',{assent:true},m.principal);});}
    r.lastAI=Math.floor((s.turn+1)/90);s.turn++;M.day(s);const harvested=s.mobilePastures.used.cherson;
    s.turn++;M.day(s);agree(args.terms);const renewed=act('offer',args.terms);
    const next=r.agreements.find(function (a) {return a.status==='offered';});
    const acceptedAgain=act('accept',{agreementId:next.id},{kind:'realm',id:'byzantium'}),stock=r.food;
    const need=r.members.reduce(function (n,m) {return n+m.civilians.concat(m.reserve).reduce(function (v,c) {return v+c.count;},0);},0)*M.profile(s,rid).foodPerPerson;
    s.turn++;M.day(s);const noSecondHarvest=Math.abs(stock-r.food-need)<0.000001 && s.mobilePastures.used.cherson===harvested;
    const excessive=Object.assign({},args.terms,{capacity:100000000});agree(excessive);
    const current=M.review(s,{realmId:rid,action:'offer',terms:excessive,actor:{kind:'realm',id:rid}});
    return {offered:offered,accepted:accepted,repeated:repeated,gold:gold===FB.treasuryAvailable(s,rid)+FB.treasuryAvailable(s,'byzantium'),
      sovereignty:owner===s.owner.cherson && holder===s.holder.cherson,capacity:current.review.reason==='capacity',harvested:harvested,
      renewed:renewed,acceptedAgain:acceptedAgain,noSecondHarvest:noSecondHarvest,valid:M.validate(s)};
  },{rid:rid,terms:terms});
  expect(result).toMatchObject({offered:true,accepted:true,repeated:true,gold:true,sovereignty:true,capacity:true,
    renewed:true,acceptedAgain:true,noSecondHarvest:true,valid:true});expect(result.harvested).toBe(capacity);
});
test('consented land uses ordinary contracts and cannot bypass a conserved settlement decision',async function ({page},testInfo) {
  const rid=await start(page,testInfo),terms={countyId:'cherson'};
  expect(await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,before=JSON.stringify(s);
    return !FB.federateRequest(s,M.migration(s,rid).id,'land') && before===JSON.stringify(s);
  },rid)).toBe(true);
  await approve(page,rid,'land',terms);
  const total=await page.evaluate(function (a) {
    const s=FB.state,M=FB.mobile,rid=a.rid;
    if(!M.commit(s,M.review(s,{realmId:rid,action:'land',terms:a.terms,actor:{kind:'realm',id:rid}}))) throw new Error('Land request failed');
    const moving=M.migration(s,rid),contract=FB.political.contract(s,moving.contractId);
    if(!contract.effective || contract.settlementCountyIds[0]!=='cherson' || s.owner.cherson!=='byzantium') throw new Error('Shared award contract missing');
    const quote=FB.governments.strategy('territory','non_territorial').settlement(s,rid,{migrationId:moving.id});
    if(!quote || FB.federateResolveSettlement(s,moving.id,quote)) throw new Error('Settlement bypassed coalition review');
    return M.total(s,rid);
  },{rid:rid,terms:terms});
  const settlement={countyId:'cherson',count:total,final:true};await approve(page,rid,'settle',settlement);
  const result=await page.evaluate(function (a) {
    const s=FB.state,M=FB.mobile,rid=a.rid,people=s.population.counties.cherson.count+M.total(s,rid);
    const settled=M.commit(s,M.review(s,{realmId:rid,action:'settle',terms:a.terms,actor:{kind:'realm',id:rid}}));
    return {settled:settled,owner:s.owner.cherson,conserved:people===s.population.counties.cherson.count+M.total(s,rid),
      fulfilled:FB.political.contract(s,M.migration(s,rid).contractId).fulfilledCountyIds.indexOf('cherson')>=0,valid:M.validate(s)};
  },{rid:rid,terms:settlement});
  expect(result).toEqual({settled:true,owner:rid,conserved:true,fulfilled:true,valid:true});
});
test('member admission, household service and departure conserve local inhabitants and private pay',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const terms={kind:'access',partnerId:'byzantium',countyIds:['cherson'],capacity:1000,allowRecruit:true,price:4,duration:360};
  await approve(page,rid,'agreement',terms);
  const result=await page.evaluate(function (args) {
    const s=FB.state,M=FB.mobile,rid=args.rid,actor={kind:'character',id:s.player.charId};
    M.commit(s,M.review(s,{realmId:rid,action:'offer',terms:args.terms,actor:{kind:'realm',id:rid}}));
    const a=M.row(s,rid).agreements[0];M.commit(s,M.review(s,{realmId:rid,action:'accept',terms:{agreementId:a.id},actor:{kind:'realm',id:'byzantium'}}));
    const total=s.population.counties.cherson.count+M.total(s,rid),privateGold=s.player.gold,publicGold=FB.treasuryAvailable(s,rid);
    const work={realmId:rid,action:'work',terms:{},actor:actor},paid=M.commit(s,M.review(s,work));
    const repeated=!M.commit(s,M.review(s,work));
    const joined=M.commit(s,M.review(s,{realmId:rid,action:'join',terms:{countyId:'cherson',count:50},actor:actor}));
    const m=M.members(s,rid).find(function (m) {return m.principal.id===actor.id;});
    const left=M.commit(s,M.review(s,{realmId:rid,action:'leave',terms:{memberId:m.id,countyId:'cherson'},actor:actor}));
    return {paid:paid,repeated:repeated,pay:s.player.gold-privateGold,cost:publicGold-FB.treasuryAvailable(s,rid),joined:joined,left:left,
      conserved:total===s.population.counties.cherson.count+M.total(s,rid),membership:!M.members(s,rid).some(function (m) {return m.principal.id===actor.id;}),valid:M.validate(s)};
  },{rid:rid,terms:terms});
  expect(result).toMatchObject({paid:true,repeated:true,joined:true,left:true,conserved:true,membership:true,valid:true});
  expect(result.pay).toBeCloseTo(0.2,8);expect(result.cost).toBeCloseTo(result.pay,8);
});
test('partial and final settlement use ordinary awards and conserve people, food and the leader',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  await page.evaluate(function (rid) {
    const s=FB.state;FB.transferProvince(s,'cherson',rid);
    if(!FB.mobile.commit(s,FB.mobile.review(s,{realmId:rid,action:'join',terms:{countyId:'cherson',count:50},actor:{kind:'character',id:s.player.charId}})))
      throw new Error('Mixed local following was not admitted');
  },rid);
  const partial={countyId:'cherson',count:100,final:false};await approve(page,rid,'settle',partial);
  const before=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,source=FB.marketProvisionSnapshot(s,'cherson');
    const identities={};let cohorts=s.population.counties.cherson.communities.concat(M.host(s,rid).mobileRoster);
    M.row(s,rid).members.forEach(function (m) {cohorts=cohorts.concat(m.civilians,m.reserve);});
    cohorts.forEach(function (c) {const id=c.culture+'|'+c.religion;identities[id]=(identities[id] || 0)+c.count;});
    return {total:s.population.counties.cherson.count+M.total(s,rid),food:source.stock+M.row(s,rid).food+(M.host(s,rid).mobileFood || 0),
      leader:M.leader(s,rid).id,identities:identities};
  },rid);
  expect(await page.evaluate(function (a) {return FB.mobile.commit(FB.state,FB.mobile.review(FB.state,{realmId:a.rid,action:'settle',terms:a.terms,actor:{kind:'realm',id:a.rid}}));},{rid:rid,terms:partial})).toBe(true);
  expect(await page.evaluate(function (rid) {return FB.mobile.active(FB.state,rid);},rid)).toBe(true);
  const identities=await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,total={};let cohorts=s.population.counties.cherson.communities.concat(M.host(s,rid).mobileRoster);
    M.row(s,rid).members.forEach(function (m) {cohorts=cohorts.concat(m.civilians,m.reserve);});
    cohorts.forEach(function (c) {const id=c.culture+'|'+c.religion;total[id]=(total[id] || 0)+c.count;});return total;
  },rid);
  expect(identities).toEqual(before.identities);
  const total=await page.evaluate(function (rid) {return FB.mobile.total(FB.state,rid);},rid);
  const final={countyId:'cherson',count:total,final:true};await approve(page,rid,'settle',final);
  const result=await page.evaluate(function (a) {
    const s=FB.state,M=FB.mobile,rid=a.rid;
    const settled=M.commit(s,M.review(s,{realmId:rid,action:'settle',terms:a.terms,actor:{kind:'realm',id:rid}}));
    return {settled:settled,total:s.population.counties.cherson.count+M.total(s,rid),food:FB.marketProvisionSnapshot(s,'cherson').stock+M.row(s,rid).food,
      status:M.row(s,rid).status,form:FB.governments.forRealm(s,rid).id,leader:FB.realmRulerCharacterSnapshot(s,rid).id,
      migration:M.migration(s,rid).status,valid:M.validate(s),saved:!!FB.save.serialize()};
  },{rid:rid,terms:final});
  expect(result).toMatchObject({settled:true,status:'settled',form:'regnum',migration:'settled',valid:true,saved:true});
  expect(result.total).toBe(before.total);expect(result.food).toBeCloseTo(before.food,6);expect(result.leader).toBe(before.leader);
});
test('the final departed member leaves a valid terminal court and transfers all food',async function ({page},testInfo) {
  const rid=await start(page,testInfo);
  const terms={kind:'access',partnerId:'byzantium',countyIds:['cherson'],capacity:1000,allowRecruit:true,price:4,duration:360};
  await approve(page,rid,'agreement',terms);
  const result=await page.evaluate(function (a) {
    const s=FB.state,M=FB.mobile,rid=a.rid,r=M.row(s,rid);
    function act(action,terms,actor) {return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms || {},actor:actor || {kind:'realm',id:rid}}));}
    act('offer',a.terms);act('accept',{agreementId:r.agreements[0].id},{kind:'realm',id:'byzantium'});
    const people=s.population.counties.cherson.count+M.total(s,rid),food=FB.marketProvisionSnapshot(s,'cherson').stock+r.food+M.host(s,rid).mobileFood;
    const demustered=act('demuster'),departed=M.members(s,rid).every(function (m) {return act('leave',{memberId:m.id,countyId:'cherson'},m.principal);});
    return {demustered:demustered,departed:departed,status:r.status,alive:s.realms[rid].alive,court:M.migration(s,rid).courtIds.length,
      people:people===s.population.counties.cherson.count+M.total(s,rid),food:Math.abs(food-FB.marketProvisionSnapshot(s,'cherson').stock-r.food)<0.000001,
      saved:!!FB.save.serialize(),valid:M.validate(s)};
  },{rid:rid,terms:terms});
  expect(result).toEqual({demustered:true,departed:true,status:'dispersed',alive:false,court:1,people:true,food:true,saved:true,valid:true});
});
test('saved coalition restores exactly and malformed records fail without mutating live identity',async function ({page},testInfo) {
  const rid=await start(page,testInfo,true);
  const result=await page.evaluate(function (rid) {
    const M=FB.mobile,source=JSON.parse(FB.save.serialize()),record=JSON.stringify(M.row(FB.state,rid));
    const host=JSON.stringify(M.host(FB.state,rid)),total=M.total(FB.state,rid);
    FB.save.restore(source);
    // The peacetime following host survives restore repair with its people.
    const kept=!!M.host(FB.state,rid) && host===JSON.stringify(M.host(FB.state,rid)) && total===M.total(FB.state,rid);
    const restored=record===JSON.stringify(M.row(FB.state,rid)),identity=(FB.getRngState()>>>0)===(source.rng>>>0) && FB.getUidCounter()===source.uid;
    const mutations=[
      function (s,r) {r.profileId='missing_profile';},function (s,r) {r.members.push(r.members[0]);},
      function (s,r) {r.members[0].civilians[0].count=-1;},function (s,r) {r.accounting.initial++;},
      function (s,r) {r.members[0].principal.id='missing_person';},function (s,r) {r.migrationId='missing_migration';},
      function (s,r) {r.food=-1;},function (s,r) {r.status='settled';},function (s,r) {r.members[0].pledge=2;},
      function (s,r) {s.armies.find(function (a) {return a.realm===rid;}).mobileRoster[0].count++;},
      function (s,r) {r.serial=-1;},function (s,r) {r.schema=2;}
    ];
    const rejected=mutations.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),r=input.state.authority.governments[rid].mobile;change(input.state,r);
      const bytes=JSON.stringify(input),live=FB.state,rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
      try {FB.save.restore(input);} catch(error) {failed=true;}
      return failed && FB.state===live && rng===FB.getRngState() && uid===FB.getUidCounter() && bytes===JSON.stringify(input);
    });
    return {restored:restored,kept:kept,identity:identity,rejected:rejected,valid:M.validate(FB.state)};
  },rid);
  expect(result).toEqual({restored:true,kept:true,identity:true,rejected:Array(12).fill(true),valid:true});
});
test('mobile review preserves scroll, disclosure and focus through cancel and stale confirmation',async function ({page},testInfo) {
  await page.setViewportSize({width:390,height:844});
  const rid=await start(page,testInfo);
  await page.evaluate(function (rid) {FB.ui.showMobileConfederation(rid);},rid);
  const work=page.getByRole('button',{name:/^Work with the following/});await expect(work).toBeEnabled();
  const id=await work.getAttribute('id');await page.locator('[aria-controls="'+id+'-details"]').click();await work.focus();
  await work.scrollIntoViewIfNeeded();
  function scrollPosition() {return {list:document.getElementById('mobile-list').scrollTop,body:document.getElementById('gm-body').scrollTop};}
  const scroll=await page.evaluate(scrollPosition);
  expect(scroll.list+scroll.body).toBeGreaterThan(0);
  await work.press('Enter');await expect(page.locator('#mobile-confirm')).toBeVisible();await page.keyboard.press('Escape');
  await expect(work).toBeFocused();await expect(page.locator('[aria-controls="'+id+'-details"]')).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(scrollPosition)).toEqual(scroll);
  await work.click();const gold=await page.evaluate(function (rid) {FB.mobile.row(FB.state,rid).food--;return FB.state.player.gold;},rid);
  await page.locator('#mobile-confirm').click();await expect(page.getByRole('heading',{name:'Terms changed',exact:true})).toBeVisible();
  expect(await page.evaluate(function () {return FB.state.player.gold;})).toBe(gold);
  await page.locator('#mobile-continue').click();
  await expect(work).toBeFocused();
  await expect(page.locator('[aria-controls="'+id+'-details"]')).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(scrollPosition)).toEqual(scroll);
});
test('the same fresh coalition is available in the CrazyGames distribution',async function ({page},testInfo) {
  const rid=await start(page,testInfo,false,true);
  expect(await page.evaluate(function (rid) {return FB.mobile.validate(FB.state) && FB.mobile.active(FB.state,rid);},rid)).toBe(true);
});
