'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/opening-column-locations-harbor.json'),
  dune:require('../fixtures/authoring/opening-column-locations-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/expedition_programs.js',
  'js/governments.js','js/government_selection.js','js/government_continuity.js','js/government_support.js',
  'js/government_civic.js','js/government_assembly.js','js/bookmark_setup.js','js/world.js','js/mods.js',
  'js/authority.js','js/treasury.js','js/armies.js','js/wars.js','js/population.js','js/settlement.js',
  'js/starts.js','js/util.js','js/save.js','js/save_v4.js','js/main.js','js/model.js','js/station.js',
  'js/technology.js','js/justice.js','js/story_household.js','js/stories.js']);

async function imported(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles(input ? {name:'locations.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(input))} : path.resolve(__dirname,'../fixtures/authoring/opening-column-locations-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' ordinary import locates the first host separately while conserving the original camp, people and stores',async function ({page},info) {
    await imported(page,info,prefix);
    const result=await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (v) {return v.mobile;}),rid=d.id;
      const r=M.row(s,rid),moving=M.migration(s,rid),snap=M.columnSnapshot(s,rid);
      const original=JSON.stringify([s.chars,s.authority,s.armies,s.treasuryAccounting]),rng=FB.getRngState(),uid=FB.getUidCounter();
      M.initialize(s,[d]);M.columnSnapshot(s,rid);M.validate(s);
      const repeat=original===JSON.stringify([s.chars,s.authority,s.armies,s.treasuryAccounting]) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const record=JSON.stringify([r,moving,s.armies,s.chars,s.treasuryAccounting,s.player]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return {positions:snap.entries.map(function (c) {return c.host.at;}),
        from:snap.entries.every(function (c) {return c.host.at===c.host.from;}),
        idle:snap.entries.every(function (c) {return !c.host.mobileCourt && !c.host.warId && !c.host.goal &&
          c.host.moveLeft===0 && c.host.path.length===0;}),
        camp:moving.at===d.mobile.origin && moving.origin===d.mobile.origin && s.realms[rid].capital===d.mobile.origin,
        total:M.total(s,rid),initial:r.accounting.initial,men:snap.entries.reduce(function (n,c) {return n+c.host.men;},0),
        food:r.food+snap.entries.reduce(function (n,c) {return n+c.host.mobileFood;},0),
        bindings:r.columns.entries.map(function (c) {return c.openingLocation || null;}),
        noLand:FB.realmTerritory(s,rid).length===0,repeat:repeat,
        same:record===JSON.stringify([M.row(restored,rid),M.migration(restored,rid),restored.armies,restored.chars,restored.treasuryAccounting,restored.player]),
        valid:M.validate(restored)};
    });
    expect(result).toEqual({positions:prefix==='harbor' ? ['harbor_gardens','harbor_quay'] : ['dune_flats','dune_well'],
      from:true,idle:true,camp:true,total:prefix==='harbor' ? 1400 : 1600,initial:prefix==='harbor' ? 1400 : 1600,
      men:160,food:3200,bindings:prefix==='harbor' ? [{countyId:'harbor_gardens',siteId:'harbor_garden_camp'},null] :
        [{countyId:'dune_flats'},{countyId:'dune_well',siteId:'dune_meeting_hall'}],noLand:true,repeat:true,same:true,valid:true});
  });
}

test('detached county and exact-site rejection preserves input, registries, campaign and identity streams',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (b,c) {c.openingLocation=null;},function (b,c) {c.openingLocation=[];},
      function (b,c) {c.openingLocation={};},function (b,c) {c.openingLocation.countyId=1;},
      function (b,c) {c.openingLocation.countyId='missing';},function (b,c) {c.openingLocation.countyId='constructor';},
      function (b,c) {c.openingLocation.extra=true;},function (b,c) {c.openingLocation.siteId=null;},
      function (b,c) {c.openingLocation.siteId='harbor_meeting_hall';},function (b,c) {c.openingLocation.siteId='missing';},
      function (b,c) {delete c.openingLocation.countyId;},
      function (b,c) {b.provinces.find(function (p) {return p.id===c.openingLocation.countyId;}).wasteland=true;},
      function (b,c) {b.provinces.find(function (p) {return p.id===c.openingLocation.countyId;}).settlements[0].fill=true;},
      function (b,c) {b.provinces[0].settlements.push({site:c.openingLocation.siteId,name:'Duplicate camp',kind:'village'});}];
    return changes.map(function (change) {
      const input=JSON.parse(JSON.stringify(source)),b=input.bookmarks.harbor_world;
      change(b,b.realms.find(function (r) {return r.mobile;}).mobile.columns.entries[0]);
      const bytes=JSON.stringify(input),data=JSON.stringify(FBDATA),state=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(input).length>0 && bytes===JSON.stringify(input) && data===JSON.stringify(FBDATA) &&
        state===JSON.stringify(FB.state) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.harbor);
  expect(result).toEqual(Array(14).fill(true));
});

test('fresh position preflight rejects disconnected, inaccessible, stale and missing live locations before any allocation',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const M=FB.mobile,d=FB.campaignBookmark(FB.state).realms.find(function (r) {return r.mobile;}),rid=d.id;
    return ['owner','holder','capacity','late','disconnected','site','changed'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(FB.state)),candidate=JSON.parse(JSON.stringify(d)),pid='harbor_gardens';
      s.armies=s.armies.filter(function (a) {return a.realm!==rid;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return m.realmId!==rid;});
      delete s.authority.governments[rid].mobile;
      if (kind==='owner') s.owner[pid]='harbor_upland';
      if (kind==='holder') s.holder[pid]='harbor_upland';
      if (kind==='capacity') s.population.counties[pid].count=1;
      if (kind==='late') s.turn=1;
      if (kind==='changed') candidate.mobile.columns.entries[0].openingLocation={countyId:'harbor_quay'};
      const adjacency=FB.world.adj,sites=FB.world.sitesByProv;
      if (kind==='disconnected') FB.world.adj=Object.assign({},adjacency,{harbor_quay:{}});
      if (kind==='site') FB.world.sitesByProv=Object.assign({},sites,{harbor_gardens:{list:[]}});
      const before=JSON.stringify(s),data=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {M.initialize(s,[candidate]);} catch(error) {rejected=true;}
      finally {FB.world.adj=adjacency;FB.world.sitesByProv=sites;}
      return rejected && before===JSON.stringify(s) && data===JSON.stringify(FBDATA) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(7).fill(true));
});

test('an existing ordinary war permits a hostile opening footprint while peace and an inaccessible intervening county do not',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const M=FB.mobile,s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),rid=d.id,r=M.row(s,rid);
    const q=M.reviewColumns(s,{realmId:rid,action:'war',terms:{columnId:r.columns.entries[0].id,
      causes:[{type:'aggression',enemy:'dune_gate',target:'dune_pass'}]},actor:{kind:'character',id:r.leaderId}});
    if (!q.review.allowed || !M.commit(s,q)) throw new Error('Ordinary column war did not begin');
    const candidate=JSON.parse(JSON.stringify(d));candidate.mobile.columns.entries[0].openingLocation={countyId:'dune_pass'};
    const fresh=JSON.parse(JSON.stringify(s));
    fresh.armies=fresh.armies.filter(function (a) {return a.realm!==rid;});
    fresh.authority.migrations=fresh.authority.migrations.filter(function (m) {return m.realmId!==rid;});
    delete fresh.authority.governments[rid].mobile;
    const before=JSON.stringify(fresh),rng=FB.getRngState(),uid=FB.getUidCounter();
    const hostile=M.openingPlan(fresh,candidate).allowed;
    const pure=before===JSON.stringify(fresh) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const peace=JSON.parse(JSON.stringify(fresh));
    Object.keys(peace.realms).forEach(function (id) {peace.realms[id].war=null;});peace.player.war=null;
    const noPeace=!M.openingPlan(peace,candidate).allowed;
    const transit=JSON.parse(JSON.stringify(candidate));transit.mobile.hostedAccess.countyIds=['dune_well'];
    return {hostile:hostile,pure:pure,noPeace:noPeace,noTransit:!M.openingPlan(fresh,transit).allowed};
  });
  expect(result).toEqual({hostile:true,pure:true,noPeace:true,noTransit:true});
});

test('matching restore preserves moved and retired columns after access expires without replaying their opening positions',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (v) {return v.mobile;}),rid=d.id,r=M.row(s,rid);
    const first=r.columns.entries[0],second=r.columns.entries[1],a=s.armies.find(function (v) {return v.id===first.hostId;});
    const q=M.reviewColumns(s,{realmId:rid,action:'march',terms:{columnId:first.id,countyId:d.mobile.origin},
      actor:{kind:'character',id:r.leaderId}});
    if (!q.review.allowed || !M.commit(s,q)) throw new Error('Return order did not begin');
    // Stage the completion of this already reviewed short leg, without a daily simulation loop.
    a.at=d.mobile.origin;a.from='harbor_gardens';a.path=[];a.goal=null;a.moveLeft=0;
    FB.disbandArmy(s,s.armies.find(function (v) {return v.id===second.hostId;}));
    s.date=FB.dateAtTurn(s,91);s.turn=91;
    const grant=r.agreements.find(function (v) {return v.kind==='access';});grant.status='ended';
    M.validate(s);
    const before=JSON.stringify([r,s.armies,s.chars,s.treasuryAccounting]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,row=M.row(restored,rid);
    return {same:before===JSON.stringify([row,restored.armies,restored.chars,restored.treasuryAccounting]),
      moved:restored.armies.find(function (v) {return v.id===first.hostId;}).at===d.mobile.origin,
      retired:row.columns.entries[1].status==='retired' && !restored.armies.some(function (v) {return v.id===second.hostId;}),
      original:row.columns.entries[0].openingLocation.countyId==='harbor_gardens',
      streams:rng===FB.getRngState() && uid===FB.getUidCounter(),valid:M.validate(restored)};
  });
  expect(result).toEqual({same:true,moved:true,retired:true,original:true,streams:true,valid:true});
});

test('forged or missing opening provenance fails detached save validation without repairing a campaign',async function ({page},info) {
  await imported(page,info,'harbor');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid=FB.campaignBookmark(FB.state).realms.find(function (v) {return v.mobile;}).id;
    const changes=[function (r) {delete r.columns.entries[0].openingLocation;},
      function (r) {r.columns.entries[0].openingLocation={countyId:'harbor_quay'};},
      function (r) {r.columns.entries[0].openingLocation.siteId='harbor_meeting_hall';},
      function (r) {r.columns.entries[0].openingLocation.extra=true;},
      function (r) {r.columns.entries[0].openingLocation=null;},
      function (r) {r.columns.entries[1].openingLocation={countyId:'harbor_quay'};}];
    return changes.map(function (change) {
      const saved=JSON.parse(FB.save.serialize()),s=saved.state;change(M.row(s,rid));
      const before=JSON.stringify(s),live=JSON.stringify(FB.state),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false,restoreRejected=false;
      try {M.validate(s);} catch(error) {rejected=true;}
      try {FB.save.restore(saved);} catch(error) {restoreRejected=true;}
      return rejected && restoreRejected && before===JSON.stringify(s) && live===JSON.stringify(FB.state) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(6).fill(true));
});

test('mod fingerprints include opening positions and incompatible restore preserves the current campaign',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function (input) {
    const saved=FB.save.serialize(),d=input.bookmarks.dune_world.realms.find(function (v) {return v.mobile;});
    d.mobile.columns.entries[0].openingLocation.countyId='dune_well';
    FB.mods.apply(input);const before=JSON.stringify(FB.state);let rejected=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {rejected=/different mod/.test(error.message);}
    return rejected && before===JSON.stringify(FB.state);
  },examples.dune);
  expect(result).toBe(true);
});

test('explicit assignment retains opening provenance in saved schema 2 and replays the same reviewed action',async function ({page},info) {
  await imported(page,info,'dune');
  const result=await page.evaluate(function () {
    const M=FB.mobile,rid='dune_coalition',checkpoint=FB.save.serialize();
    function apply() {
      const s=FB.state,r=M.row(s,rid),first=r.columns.entries[0],other=r.columns.entries[1];
      const request={realmId:rid,action:'assign',terms:{columnId:first.id,candidateId:other.commanderId},
        actor:{kind:'character',id:r.leaderId}};
      const q=M.reviewColumns(s,request),accepted=q.review.allowed && M.commit(s,q),repeat=!M.commit(s,q);
      M.validate(s);
      return {accepted:accepted,repeat:repeat,schema:r.columns.schema,record:JSON.stringify([r,s.armies]),
        original:first.openingLocation.countyId==='dune_flats'};
    }
    const rng=FB.getRngState(),uid=FB.getUidCounter(),first=apply();
    FB.save.restore(JSON.parse(checkpoint));const second=apply();
    const saved=JSON.stringify(M.row(FB.state,rid));FB.save.restore(JSON.parse(FB.save.serialize()));
    return {accepted:first.accepted,repeat:first.repeat,schema:first.schema,original:first.original,
      replay:JSON.stringify(first)===JSON.stringify(second),restored:saved===JSON.stringify(M.row(FB.state,rid)),
      streams:rng===FB.getRngState() && uid===FB.getUidCounter()};
  });
  expect(result).toEqual({accepted:true,repeat:true,schema:2,original:true,replay:true,restored:true,streams:true});
});

test('omitting every opening location retains the legacy colocated record and accepts its matching save',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));
  input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.columns.entries.forEach(function (c) {delete c.openingLocation;});
  await imported(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;}),rid=d.id,r=M.row(s,rid);
    const defaults=r.columns.entries.every(function (c) {return Object.keys(c).length===4 && !c.openingLocation;}) &&
      M.columnSnapshot(s,rid).entries.every(function (c) {return c.host.at===d.mobile.origin;});
    const saved=JSON.stringify([r,s.armies]);FB.save.restore(JSON.parse(FB.save.serialize()));
    return {defaults:defaults,same:saved===JSON.stringify([M.row(FB.state,rid),FB.state.armies]),valid:M.validate(FB.state)};
  });
  expect(result).toEqual({defaults:true,same:true,valid:true});
});
