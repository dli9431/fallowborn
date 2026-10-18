'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/mobile-hosted-harbor.json'),
  dune:require('../fixtures/authoring/mobile-hosted-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/technology.js','data/units.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/governments.js','js/government_selection.js',
  'js/government_civic.js','js/government_support.js','js/bookmark_setup.js','js/story_ruler_agenda.js',
  'js/stories.js','js/world.js','js/starts.js','js/model.js','js/station.js','js/population.js',
  'js/armies.js','js/wars.js','js/authority.js','js/federates.js','js/treasury.js','js/mods.js','js/util.js',
  'js/market.js','js/technology.js','js/government_assembly.js','js/justice.js',
  'js/save.js','js/save_v4.js','js/main.js']);

async function imported(page,info,prefix) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/mobile-hosted-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for(const prefix of ['harbor','dune']) {
  test(prefix+' imports an already hosted following without replaying payment or granting land',async function ({page},info) {
    await imported(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
      const rid=d.id,r=M.row(s,rid),a=M.householdSnapshot(s,rid).access,host=M.host(s,rid);
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,FB.campaignBookmark(s).realms);M.householdSnapshot(s,rid);M.hostedAccessPlan(s,[d]);
      return {kind:a.kind,price:a.price,duration:a.duration,capacity:a.capacity,recruit:a.allowRecruit,
        count:r.agreements.length,marker:r.openingAccess.schema,pure:before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter(),
        total:M.total(s,rid),initial:r.accounting.initial,food:r.food+host.mobileFood,treasury:FB.treasuryAvailable(s,rid),
        noLand:FB.realmTerritory(s,rid).length===0,at:M.migration(s,rid).at,valid:M.validate(s)};
    });
    expect(result).toMatchObject({kind:'access',price:0,count:1,marker:1,pure:true,food:3200,noLand:true,valid:true,
      duration:prefix==='harbor'?90:45,capacity:prefix==='harbor'?1400:1600,recruit:prefix==='harbor',
      at:prefix==='harbor'?'harbor_quay':'dune_pass'});
    expect(result.total).toBe(result.initial);
    expect(result.treasury).toBeGreaterThanOrEqual(70);
  });
}

test('detached hosted imports reject malformed terms and unresolved counterpart actors without mutation',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (d) {d.mobile.hostedAccess=null;},function (d,a) {a.extra=true;},
      function (d,a) {a.partnerRealmId=d.id;},function (d,a) {a.partnerRealmId='constructor';},
      function (d,a) {a.partnerActorId='harbor_leader';},function (d,a) {a.partnerActorId='missing';},
      function (d,a) {a.countyIds=[];},function (d,a) {a.countyIds.push(a.countyIds[0]);},
      function (d,a) {a.countyIds=['harbor_ridge'];},function (d,a) {a.capacity=1;},
      function (d,a) {a.capacity=100000001;},function (d,a) {a.allowRecruit='yes';},
      function (d,a) {a.duration=0;},function (d,a) {a.duration=1441;},
      function (d,a) {a.price=5;},function (d) {delete d.mobile.command;},function (d) {delete d.mobile.opening;}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),d=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;});
      change(d,d.mobile.hostedAccess);
      const bytes=JSON.stringify(input),state=JSON.stringify(FB.state),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && state===JSON.stringify(FB.state) &&
        data===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(17).fill(true));
});

test('fresh preflight rejects unavailable parties, foreign possession, exhausted capacity and late grants atomically',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,d=FB.campaignBookmark(original).realms.find(function (r) {return r.mobile;});
    return ['holder','owner','capacity','dead','captive','late','overlap'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),pid=d.mobile.origin;
      delete s.authority.governments[d.id].mobile;
      s.armies=s.armies.filter(function (a) {return a.realm!==d.id;});
      s.authority.migrations=s.authority.migrations.filter(function (a) {return a.realmId!==d.id;});
      if(kind==='holder')s.holder[pid]='harbor_upland';
      if(kind==='owner')s.owner[pid]='harbor_upland';
      if(kind==='capacity')s.population.counties[pid].count=100;
      if(kind==='dead'||kind==='captive')FB.bookmarkActor(s,'harbor_host_ruler')[kind]=true;
      if(kind==='late')s.turn=1;
      // Another saved concession has consumed the remaining local capacity.
      if(kind==='overlap')s.authority.governments.harbor_upland.mobile={agreements:[{id:'prior_access',kind:'access',
        status:'active',endTurn:90,countyIds:[pid],capacity:1000}]};
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      const planned=M.hostedAccessPlan(s,[d]);
      try {M.initialize(s,[d]);}catch(error){rejected=true;}
      return !planned.allowed && rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(7).fill(true));
});

test('invalid opening authority suspends access immediately and the daily boundary ends it without restoring it',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const original=FB.state,M=FB.mobile,rid='harbor_following';
    return ['holder','owner','capacity','partner_generation','leader_generation','partner_dead','partner_captive','leader_captive'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(original)),r=M.row(s,rid),a=r.agreements[0],pid=a.countyIds[0];
      const people=M.total(s,rid),gold=s.player.gold,at=M.migration(s,rid).at;
      if(kind==='holder')s.holder[pid]='harbor_upland';
      if(kind==='owner')s.owner[pid]='harbor_upland';
      if(kind==='capacity')s.population.counties[pid].count=100;
      if(kind==='partner_generation')s.realms[a.partnerId].ruler.generation=FB.realmRulerGeneration(s,a.partnerId)+1;
      if(kind==='leader_generation')s.realms[rid].ruler.generation++;
      if(kind==='partner_dead')FB.bookmarkActor(s,'harbor_host_ruler').dead=true;
      if(kind==='partner_captive')FB.bookmarkActor(s,'harbor_host_ruler').captive=true;
      if(kind==='leader_captive')s.chars[r.leaderId].captive=true;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const unavailable=M.householdSnapshot(s,rid).access===null;
      const pure=before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      s.date=FB.dateAtTurn(s,1);s.turn=1;r.lastAI=0;M.day(s);
      const ended=a.status==='ended';
      s.holder[pid]=original.holder[pid];s.owner[pid]=original.owner[pid];s.population.counties[pid].count=original.population.counties[pid].count;
      return unavailable && pure && ended && M.householdSnapshot(s,rid).access===null &&
        M.total(s,rid)===people && s.player.gold===gold && M.migration(s,rid).at===at;
    });
  });
  expect(result).toEqual(Array(8).fill(true));
});

test('restore preserves opening access and spent food without replay and rejects malformed provenance',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='harbor_following',r=M.row(s,rid);
    r.food-=9;
    const pending=JSON.parse(FB.save.serialize()),facts=JSON.stringify([r,M.migration(s,rid),M.host(s,rid),s.player.gold]);
    FB.save.restore(pending);
    const restored=facts===JSON.stringify([M.row(FB.state,rid),M.migration(FB.state,rid),M.host(FB.state,rid),FB.state.player.gold]);
    const changes=[function (r) {delete r.openingAccess;},function (r) {r.openingAccess.schema=2;},
      function (r) {r.openingAccess.extra=true;},function (r) {r.openingAccess.startTurn=1;},
      function (r) {r.openingAccess.generations[0]=0;},function (r) {r.openingAccess.generations[1]=999;},
      function (r) {r.agreements=[];},function (r) {r.agreements[0].price=1;},
      function (r) {r.agreements[0].capacity--;},function (r) {r.agreements[0].allowRecruit=false;},
      function (r) {r.agreements[0].generations[0]++;}];
    const rejected=changes.map(function (change) {
      const state=JSON.parse(JSON.stringify(FB.state));change(M.row(state,rid));
      const bytes=JSON.stringify(state),rng=FB.getRngState(),uid=FB.getUidCounter();let failed=false;
      try {M.validate(state);}catch(error){failed=true;}
      return failed && bytes===JSON.stringify(state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
    return {restored:restored,rejected:rejected};
  });
  expect(result).toEqual({restored:true,rejected:Array(11).fill(true)});
});

test('expired access stays absent through restore and repeated initialization',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),marker=JSON.stringify(r.openingAccess);
    s.date=FB.dateAtTurn(s,45);s.turn=45;r.lastAI=0;M.day(s);
    const expired=M.householdSnapshot(s,rid).access===null && !r.agreements.length;
    const saved=JSON.parse(FB.save.serialize());FB.save.restore(saved);
    const before=JSON.stringify(FB.state);M.initialize(FB.state,FB.campaignBookmark(FB.state).realms);
    return {expired:expired,marker:marker===JSON.stringify(M.row(FB.state,rid).openingAccess),
      unchanged:before===JSON.stringify(FB.state),missing:M.householdSnapshot(FB.state,rid).access===null};
  });
  expect(result).toEqual({expired:true,marker:true,unchanged:true,missing:true});
});

test('ordinary renewal still requires the current outside consent and conserves the actual public payment',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',r=M.row(s,rid),partner='dune_gate';
    const terms={kind:'access',partnerId:partner,countyIds:['dune_pass'],capacity:1600,allowRecruit:false,price:6,duration:30};
    // End the retained relationship; a new deal must use the normal consent owner.
    r.agreements[0].status='ended';
    const offered=M.commit(s,M.review(s,{realmId:rid,action:'offer',actor:{kind:'realm',id:rid},terms:terms}));
    const a=r.agreements.find(function (a) {return a.status==='offered';}),request={realmId:rid,action:'accept',
      actor:{kind:'realm',id:partner},terms:{agreementId:a.id}};
    const old=M.review(s,request);s.realms[partner].ruler.generation++;
    const bytes=JSON.stringify(s),stale=M.commit(s,old),pure=bytes===JSON.stringify(s);
    // A new offer after succession carries the actual new generation.
    a.status='ended';const reoffered=M.commit(s,M.review(s,{realmId:rid,action:'offer',actor:{kind:'realm',id:rid},terms:terms}));
    const fresh=r.agreements.find(function (a) {return a.status==='offered';});request.terms.agreementId=fresh.id;
    const before=[FB.treasuryAvailable(s,rid),FB.treasuryAvailable(s,partner),s.player.gold];
    const q=M.review(s,request),accepted=M.commit(s,q),repeated=M.commit(s,q);
    return {offered:offered,stale:stale,pure:pure,reoffered:reoffered,accepted:accepted,repeated:repeated,
      debit:before[0]-FB.treasuryAvailable(s,rid),credit:FB.treasuryAvailable(s,partner)-before[1],privateSame:s.player.gold===before[2]};
  });
  expect(result).toEqual({offered:true,stale:false,pure:true,reoffered:true,accepted:true,repeated:false,debit:6,credit:6,privateSame:true});
});

for(const prefix of ['harbor','dune']) {
  test(prefix+' leader uses the existing costless agenda without renewing access or granting protection',async function ({page},info) {
    await imported(page,info,prefix);
    const result=await page.evaluate(function (prefix) {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),rid=d.id;
      const sc=FBDATA.startScenarios.find(function (row) {return row.id===prefix+'_hosted_leader';}),leader=M.leader(s,rid);
      s.player.charId=leader.id;s.player.tier=1;
      const adopted=FB.adoptStartingRealm(s,sc,{deferSetup:true}),id=prefix+'_hosted_agenda';
      FB.stories.start(s,{tracks:[id]});
      const before=JSON.stringify([M.row(s,rid),M.migration(s,rid),M.host(s,rid),s.owner,s.holder,s.player.gold]);
      const choice=prefix+'_keep_hosting',snapshot=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      const q=FB.stories.quote(s,id,choice);FB.stories.choices(s,id);
      const pure=snapshot===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const applied=FB.stories.apply(s,id,choice,q),repeated=FB.stories.apply(s,id,choice,q);
      return {adopted:adopted,pure:pure,allowed:q.allowed,applied:applied,repeated:repeated,status:s.stories[id].status,
        unchanged:before===JSON.stringify([M.row(s,rid),M.migration(s,rid),M.host(s,rid),s.owner,s.holder,s.player.gold])};
    },prefix);
    expect(result).toEqual({adopted:true,pure:true,allowed:true,applied:true,repeated:false,status:'agenda_complete',unchanged:true});
  });
}

test('a stale or recalled leader cannot confirm its old agenda review',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',leader=M.leader(s,rid);
    const sc=FBDATA.startScenarios.find(function (row) {return row.id==='dune_hosted_leader';});
    s.player.charId=leader.id;s.player.tier=1;FB.adoptStartingRealm(s,sc,{deferSetup:true});
    FB.stories.start(s,{tracks:['dune_hosted_agenda']});
    const q=FB.stories.quote(s,'dune_hosted_agenda','dune_keep_hosting'),r=M.row(s,rid);
    const recall=M.reviewCommand(s,{realmId:rid,commandId:r.command.id,action:'recall',
      actor:{kind:'character',id:FB.bookmarkActor(s,'dune_authorizer').id}});
    const recalled=M.commit(s,recall),before=JSON.stringify(s);
    const applied=FB.stories.apply(s,'dune_hosted_agenda','dune_keep_hosting',q),unchanged=before===JSON.stringify(s);
    FB.stories.get('dune_hosted_agenda').day(s,s.stories.dune_hosted_agenda);
    return {recalled:recalled,applied:applied,unchanged:unchanged,status:s.stories.dune_hosted_agenda.status};
  });
  expect(result).toEqual({recalled:true,applied:false,unchanged:true,status:'agenda_interrupted'});
});

test('adopting the host court remaps its existing agreement counterparty',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='dune_coalition',person=FB.bookmarkActor(s,'dune_host_ruler');
    const sc=FBDATA.startScenarios.find(function (row) {return row.id==='dune_host_court';});
    s.player.charId=person.id;s.player.tier=sc.tier;
    const adopted=FB.adoptStartingRealm(s,sc,{deferSetup:true});
    const access=M.householdSnapshot(s,rid).access;
    return {adopted:adopted,partner:access && access.partnerId,owner:s.owner.dune_pass,
      noOldRealm:!s.realms.dune_gate,valid:M.validate(s)};
  });
  expect(result).toEqual({adopted:true,partner:'player',owner:'player',noOldRealm:true,valid:true});
});

test('a changed imported hosting policy cannot restore an older matching-name campaign',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function (source) {
    const saved=FB.save.serialize();
    source.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.hostedAccess.duration--;
    FB.mods.apply(source);
    const before=JSON.stringify(FB.state);let mismatch=false;
    try {FB.save.restore(JSON.parse(saved));}catch(error){mismatch=/different mod/.test(error.message);}
    return {mismatch:mismatch,unchanged:before===JSON.stringify(FB.state)};
  },JSON.parse(JSON.stringify(examples.dune)));
  expect(result).toEqual({mismatch:true,unchanged:true});
});
