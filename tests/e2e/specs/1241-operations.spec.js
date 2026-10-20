'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');

dependsOnRuntime(__filename,['index.html','data/bookmark_1241_operations.js','data/bookmark_1241.js',
  'data/bookmark_1241_core_starts.js','data/story_koten_1241.js',
  'data/bookmark_1241_scaffold_a.js','data/bookmark_1241_scaffold_b.js','data/bookmark_1241_scaffold_c.js',
  'data/bookmark_1241_scaffold_d.js','data/bookmark_1241_frederick.js','data/bookmark_1241_alexander.js',
  'data/story_ruler_agendas_1241.js','data/starts_1241.js','data/mobile_confederations.js','data/cultures.js',
  'data/units.js','data/technology.js','data/climate.js','data/eras.js','data/map_data.js','data/geographies.js','data/geography_expansion.js',
  'js/main.js','js/world.js','js/model.js','js/starts.js','js/bookmark_setup.js','js/authority.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/mobile_guard.js','js/mobile_camps.js',
  'js/expedition_programs.js','js/governments.js','js/government_selection.js','js/treasury.js',
  'js/armies.js','js/logistics.js','js/wars.js','js/federates.js','js/population.js','js/market.js','js/technology.js',
  'js/settlement.js','js/lordships.js','js/climate.js','js/government_support.js',
  'js/story_household.js','js/justice.js','js/mods.js','js/save.js','js/save_v4.js']);

const command='mongol_western_command_1241',following='koten_following_1241';
const retained=['baseline','royal_households_v2','frederick_v2','alexander_v2'];

async function start(page,info,revision) {
  await openGame(page,info);
  await page.evaluate(function (revision) {
    if (revision) FBDATA.bookmarks['1241'].revision=revision;
    FB.startProgression.noteTier(3);
  },revision || null);
  const full=page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('OPS1241-1241-hungarian_village_household_1241-szekesfehervar-m-Review-standard');
  await page.locator('#ng-seed').press('Enter');
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {FB.game.setPaused(true);});
}

test('the fresh world validates every retained revision without changing their opening catalogues or named households',async function ({page},info) {
  await openGame(page,info);
  const facts=await page.evaluate(function (retained) {
    const bytes=JSON.stringify(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter(),fresh=FB.bookmark('1241');
    const older=retained.map(function (id) {
      const b=FB.bookmark('1241',id);
      return {faults:FB.validateBookmark(b),mobile:b.realms.some(function (r) {return !!r.mobile;}),
        opening:Object.keys(b.openingRevisions),actors:Object.keys(b.opening.actors).length,
        sameProvinces:JSON.stringify(b.provinces)===JSON.stringify(fresh.provinces)};
    });
    const previous=FB.bookmark('1241','alexander_v2');
    return {faults:FB.validateBookmark(fresh),revision:fresh.revision,opening:fresh.openingRevision,
      detached:fresh.openingRevisions!==previous.openingRevisions && fresh.realms!==previous.realms,
      earlierRealms:JSON.stringify(fresh.realms.slice(0,-2))===JSON.stringify(previous.realms),
      starts:JSON.stringify(fresh.starts.filter(function (id) {return id!=='koten_1241';}))===JSON.stringify(previous.starts),
      retained:older,pure:bytes===JSON.stringify(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },retained);
  expect(facts).toMatchObject({faults:[],revision:'core_starts_v2',opening:'operations_v2',
    detached:true,earlierRealms:true,starts:true,pure:true});
  expect(facts.retained).toEqual(retained.map(function () {
    return {faults:[],mobile:false,opening:['baseline'],actors:0,sameProvinces:true};
  }));
});

test('the dated combined opening conserves both populations, exact forces, food and accounts at real distinct places',async function ({page},info) {
  await start(page,info);
  const result=await page.evaluate(function (ids) {
    const s=FB.state,M=FB.mobile,r=M.row(s,ids.command),k=M.row(s,ids.following),g=k.guardedParty;
    const cols=M.columnSnapshot(s,ids.command).entries,camps=M.campSnapshot(s,ids.following);
    const sum=function (pool) {return pool.reduce(function (n,c) {return n+c.count;},0);};
    const words=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    M.initialize(s,FB.campaignBookmark(s).realms);
    const repeat=words===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    const wars=FB.realmWars(s,ids.command);
    return {revision:s.start.revision,opening:s.bookmarkSetup.revision,
      total:M.total(s,ids.command),civilians:r.members.reduce(function (n,m) {return n+sum(m.civilians);},0),
      reserves:r.members.reduce(function (n,m) {return n+sum(m.reserve);},0),
      positions:cols.map(function (c) {return c.host.at;}),men:cols.map(function (c) {return c.host.men;}),
      units:cols.map(function (c) {return [c.host.units.horsearcher,c.host.units.cav];}),
      food:cols.map(function (c) {return c.host.mobileFood;}),campFood:r.food,cash:FB.treasuryAvailable(s,ids.command),
      commission:r.command.issuer,principals:r.members.map(function (m) {return s.chars[m.principal.id].name;}),
      originals:['Batu','Subutai','Baidar','Qadan','Shiban','Koten'].every(function (name) {
        return Object.keys(s.chars).filter(function (id) {return s.chars[id].name===name;}).length===1;
      }),
      lawful:wars.length===3 && wars.every(function (w) {return w.startedTurn===0 && !w.wins && !w.losses &&
        !Object.keys(w.occupations).length;}) && r.openingCampaigns.entries.every(function (e) {
          return e.columns.every(function (c) {return cols.find(function (h) {return h.hostId===c.hostId;}).host.warId===e.warId;});
        }),
      noTerritory:FB.realmTerritory(s,ids.command).length===0 && FB.realmTerritory(s,ids.following).length===0,
      koten:{total:M.total(s,ids.following),civilians:camps.reduce(function (n,c) {return n+c.civilians;},0),
        reserves:camps.reduce(function (n,c) {return n+c.reserve;},0),men:M.host(s,ids.following).men,
        food:camps.reduce(function (n,c) {return n+c.food;},0)+M.host(s,ids.following).mobileFood,
        cash:FB.treasuryAvailable(s,ids.following),guard:g.status,party:g.characterIds.length,
        leader:s.chars[k.leaderId].name,faith:s.chars[k.leaderId].religion,
        cohorts:k.camps.entries.every(function (c) {return c.members.every(function (m) {
          return m.civilians.concat(m.reserve).every(function (p) {return p.religion==='tengri';});
        });}),
        separate:M.migration(s,ids.following).courtIds.indexOf(k.leaderId)<0 &&
          camps.every(function (c) {return c.siteId!==g.declaration.location.siteId;}),
        effective:M.commandValid(s,ids.following),legacyEmpty:k.food===0 && k.members.every(function (m) {return !m.civilians.length && !m.reserve.length;}),
        capacity:k.agreements[0].capacity,access:camps.every(function (c) {return !!c.access;}),
        physical:camps.every(function (c) {return FB.world.sitesByProv[c.countyId].list.some(function (v) {
          return v.site===c.siteId && FB.provinceAtGrid(v.x,v.y).id===c.countyId;
        });})},repeat:repeat,valid:M.validate(s)};
  },{command:command,following:following});
  expect(result).toEqual({revision:'core_starts_v2',opening:'operations_v2',total:8000,civilians:4800,reserves:800,
    positions:['volodymyr','krakow','cluj','gyula'],men:[1200,600,400,200],units:[[900,300],[450,150],[300,100],[150,50]],
    food:[360,180,120,60],campFood:6480,cash:552,commission:{externalAuthorityId:'ogodei_superior_1241',generation:1},
    principals:['Batu','Subutai','Baidar','Qadan','Shiban'],originals:true,lawful:true,noTerritory:true,
    koten:{total:2400,civilians:1920,reserves:240,men:240,food:2160,cash:120,guard:'guarded',party:1,
      leader:'Koten',faith:'catholic',cohorts:true,separate:true,effective:false,legacyEmpty:true,capacity:2400,access:true,physical:true},
    repeat:true,valid:true});
});

for (const revision of retained) {
  test(revision+' matching saves keep absent operations after the fresh catalogue advances',async function ({page},info) {
    await start(page,info,revision);
    expect(await page.evaluate(function (ids) {
      const material=function (s) {return JSON.stringify([s.start,s.bookmarkSetup,
        Object.assign({},s.authority,{schema:undefined}),s.armies,s.chars,s.realms]);};
      const s=FB.state,before=material(s);
      const saved=JSON.parse(FB.save.serialize());FBDATA.bookmarks['1241'].revision='operations_v2';
      FB.save.restore(saved);
      const restored=FB.state;
      return !restored.realms[ids.command] && !restored.realms[ids.following] &&
        before===material(restored);
    },{command:command,following:following})).toBe(true);
  });
}

test('the guarded camps compose with current release, stale review, actual command reach and finite expiry',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,r=M.row(s,rid),g=r.guardedParty,leader=s.chars[r.leaderId],host=s.chars[g.authority.characterId];
    const req={realmId:rid,action:'release',actor:{kind:'character',id:host.id}};
    const bytes=JSON.stringify(s),q=M.reviewGuard(s,req),pure=bytes===JSON.stringify(s);
    host.captive=true;const stale=!M.commit(s,q);delete host.captive;
    const resources=JSON.stringify([r.camps,M.host(s,rid),M.migration(s,rid),FB.treasuryAvailable(s,rid),leader.homeProvinceId]);
    const released=M.commit(s,M.reviewGuard(s,req)),repeated=!M.commit(s,M.reviewGuard(s,req));
    const conserved=resources===JSON.stringify([r.camps,M.host(s,rid),M.migration(s,rid),FB.treasuryAvailable(s,rid),leader.homeProvinceId]);
    const local=M.commandValid(s,rid);leader.travel={currentId:leader.homeProvinceId};
    const travelling=!M.commandValid(s,rid);delete leader.travel;
    leader.homeProvinceId='moson';const remote=!M.commandValid(s,rid);leader.homeProvinceId='szekesfehervar';
    // Stage the independent finite-hosting boundary without simulating years.
    s.turn=r.agreements[0].endTurn;s.date=FB.dateAtTurn(s,s.turn);
    return {pure:pure,allowed:q.review.allowed,stale:stale,released:released,repeated:repeated,conserved:conserved,
      local:local,travelling:travelling,remote:remote,expired:M.campSnapshot(s,rid).every(function (c) {return !c.access;})};
  },following)).toEqual({pure:true,allowed:true,stale:true,released:true,repeated:true,conserved:true,
    local:true,travelling:true,remote:true,expired:true});
});

test('host replacement, leader death and guard expiry preserve the original party and camps without releasing command',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (rid) {
    const M=FB.mobile;
    return ['host','leader','expiry'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,rid),g=r.guardedParty;
      const people=JSON.stringify(g.characterIds),camps=JSON.stringify(r.camps);
      if (kind==='host') s.realms.hungary_1241.ruler.generation++;
      if (kind==='leader') s.chars[r.leaderId].dead=true;
      if (kind==='expiry') {s.turn=g.endTurn;s.date=FB.dateAtTurn(s,s.turn);}
      return M.guardSnapshot(s,rid).status===(kind==='expiry'?'expired':'interrupted') &&
        !M.commandValid(s,rid) && people===JSON.stringify(g.characterIds) && camps===JSON.stringify(r.camps);
    });
  },following)).toEqual([true,true,true]);
});

test('the whole opening batch refuses lost hosting authority or capacity before allocating either following',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (ids) {
    const M=FB.mobile,defs=FB.campaignBookmark(FB.state).realms;
    return ['capacity','holder','host'].map(function (kind) {
      const s=JSON.parse(JSON.stringify(FB.state));
      ids.forEach(function (rid) {delete s.authority.governments[rid].mobile;});
      s.armies=s.armies.filter(function (a) {return ids.indexOf(a.realm)<0;});
      s.authority.migrations=s.authority.migrations.filter(function (m) {return ids.indexOf(m.realmId)<0;});
      s.wars={};s.warSerial=0;Object.keys(s.realms).forEach(function (rid) {s.realms[rid].war=null;});
      if (kind==='capacity') s.population.counties.szekesfehervar.count=100;
      if (kind==='holder') s.holder.szekesfehervar='silesia_1241';
      if (kind==='host') s.chars[FB.bookmarkActor(s,'hungary_ruler_operations_1241').id].dead=true;
      const before=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();
      let rejected=false;try {M.initialize(s,defs);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },[command,following])).toEqual([true,true,true]);
});

test('matching divergent operations retain losses, depleted stores, peace and cancelled intent without reopening',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (ids) {
    const s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,r=M.row(s,ids.command),k=M.row(s,ids.following);
    const cancel=E.reviewControl(s,{realmId:ids.command,action:'cancel',stepId:null,actor:{kind:'character',id:r.leaderId}});
    if (!M.commit(s,cancel)) throw new Error('Expected current cancellation');
    r.openingCampaigns.entries.forEach(function (e) {FB.settleOrdinaryWar(s,e.warId,'white_peace');});
    const a=M.host(s,ids.command);FB.applyHostLosses(a,7,s);a.mobileFood=1;r.food=17;
    const retired=s.armies.find(function (a) {return a.id===r.columns.entries[3].hostId;});FB.disbandArmy(s,retired);
    k.camps.entries[0].food=3;k.camps.entries[1].food=5;FB.treasurySpend(s,ids.command,40);
    const original=s.chars[k.leaderId];original.dead=true;FB.royalCharDied(s,original,ids.following);
    const material=function (state) {return JSON.stringify([state.start,state.bookmarkSetup,
      Object.assign({},state.authority,{schema:undefined}),state.armies,
      state.wars,state.chars,state.realms,state.player,state.treasuryAccounting]);};
    M.validate(s);const before=material(s),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,same=before===material(restored);
    M.initialize(restored,FB.campaignBookmark(restored).realms);E.day(restored);
    return same && before===material(restored) && FB.realmWars(restored,ids.command).length===0 &&
      M.row(restored,ids.command).accounting.dead===7 && M.row(restored,ids.command).expeditionProgram.status==='cancelled' &&
      rng===FB.getRngState() && uid===FB.getUidCounter();
  },{command:command,following:following})).toBe(true);
});

test('program reviews are pure, stale resource reviews reject and current intent completes once',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,r=M.row(s,rid);
    s.turn=1;s.date=FB.dateAtTurn(s,1);
    const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter(),q=E.review(s,rid,'main_review');
    const pure=bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    M.host(s,rid).mobileFood-=1;const stale=!E.commit(s,q);
    const current=E.review(s,rid,'main_review'),done=E.commit(s,current),repeat=!E.commit(s,current);
    return {pure:pure,allowed:q.allowed,stale:stale,done:done,repeat:repeat,
      completed:r.expeditionProgram.steps[0].status,warCount:FB.realmWars(s,rid).length,total:M.total(s,rid)};
  },command)).toEqual({pure:true,allowed:true,stale:true,done:true,repeat:true,completed:'complete',warCount:3,total:8000});
});

test('a current eastern field order uses real adjacency and passage while the civilian camp stays at its origin',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,r=M.row(s,rid),c=r.columns.entries[2];
    const a=s.armies.find(function (a) {return a.id===c.hostId;}),camp=JSON.stringify(M.migration(s,rid));
    const req={realmId:rid,action:'march',terms:{columnId:c.id,countyId:'gyula'},actor:{kind:'character',id:c.commanderId}};
    const before=JSON.stringify(s),q=M.reviewColumns(s,req),pure=before===JSON.stringify(s);
    a.mobileFood-=1;const stale=!M.commit(s,q),current=M.reviewColumns(s,req);
    const committed=M.commit(s,current),after=JSON.stringify(s),repeated=!M.commit(s,current) && after===JSON.stringify(s);
    return {pure:pure,allowed:q.review.allowed,stale:stale,committed:committed,repeated:repeated,
      adjacency:!!FB.world.adj.cluj.gyula,path:current.review.path.every(function (pid) {return M.passage(s,rid,pid,false);}),
      ordered:a.goal==='gyula' && (a.path.length>0 || a.moveLeft>0),
      camp:camp===JSON.stringify(M.migration(s,rid)),total:M.total(s,rid)};
  },command)).toEqual({pure:true,allowed:true,stale:true,committed:true,repeated:true,adjacency:true,path:true,
    ordered:true,camp:true,total:8000});
});

test('local loading conserves camp and field stock while hostile remote positions cannot buy through military passage',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (rid) {
    const s=FB.state,M=FB.mobile,r=M.row(s,rid),a=M.host(s,rid),cash=FB.treasuryAvailable(s,rid);
    a.mobileFood=0;
    const target=M.hostSupplySnapshot(s,a).target,camp=r.food;
    const before=r.food+a.mobileFood,quote=M.columnSupplyReview(s,rid,'main','load');
    const allowed=quote.review.allowed;r.food-=1;const stale=!M.commit(s,quote);r.food+=1;
    const current=M.columnSupplyReview(s,rid,'main','load'),done=M.commit(s,current),repeated=!M.commit(s,current);
    const remote=r.columns.entries[1],b=s.armies.find(function (v) {return v.id===remote.hostId;});b.mobileFood-=10;
    const supplies=M.columnSupplyPlan(s,rid),plan=supplies.entries.find(function (v) {return v.columnId===remote.id;});
    return {allowed:allowed,stale:stale,done:done,repeated:repeated,
      carried:a.mobileFood===target && target>0 && target<=360,withdrawn:Math.abs(camp-r.food-target)<0.00001,
      conserved:Math.abs(before-r.food-a.mobileFood)<0.00001,cash:cash===FB.treasuryAvailable(s,rid),
      remote:!plan.local && plan.load.count===0 && plan.trade.count===0,
      noRight:!M.columnSupplyReview(s,rid,remote.id,'trade').review.allowed};
  },command)).toEqual({allowed:true,stale:true,done:true,repeated:true,carried:true,withdrawn:true,
    conserved:true,cash:true,remote:true,noRight:true});
});

test('forged combined save provenance rejects without replacing the active campaign',async function ({page},info) {
  await start(page,info);
  expect(await page.evaluate(function (ids) {
    const saved=JSON.parse(FB.save.serialize()),before=JSON.stringify(FB.state);
    return ['guard','camp','reserve','campaign'].map(function (kind) {
      const candidate=JSON.parse(JSON.stringify(saved)),s=candidate.state || candidate;
      const r=FB.mobile.row(s,ids.command),k=FB.mobile.row(s,ids.following);
      if (kind==='guard') k.guardedParty.characterIds=[];
      if (kind==='camp') k.camps.entries[0].siteId='cuman_east_camp_1241';
      if (kind==='reserve') r.openingReserves.allocations[0].count++;
      if (kind==='campaign') r.openingCampaigns.entries[0].target='krakow';
      let rejected=false;try {FB.save.restore(candidate);} catch(error) {rejected=true;}
      return rejected && before===JSON.stringify(FB.state);
    });
  },{command:command,following:following})).toEqual([true,true,true,true]);
});

for (const prefix of ['harbor','dune']) {
  test(prefix+' imports a complete independent guarded-party and dispersed-camps configuration through Mods',async function ({page},info) {
    await openGame(page,info);
    await page.evaluate(function () {FB.ui.showMods();});
    await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/guarded-camps-'+prefix+'.json'));
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await page.waitForFunction(function (p) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[p+'_world'];},prefix);
    await beginBookmark(page,info,prefix+'_world',prefix+'_household');
    expect(await page.evaluate(function () {
      const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (r) {return !!r.mobile;}),r=M.row(s,d.id);
      const initial=JSON.stringify([r,s.armies,s.chars,s.realms,s.authority.migrations]);
      FB.save.restore(JSON.parse(FB.save.serialize()));
      const restored=FB.state;
      return r.guardedParty.status==='guarded' && r.camps.entries.length===2 && !M.commandValid(s,d.id) &&
        M.total(s,d.id)===r.accounting.initial && M.migration(s,d.id).courtIds.indexOf(r.leaderId)<0 &&
        initial===JSON.stringify([M.row(restored,d.id),restored.armies,restored.chars,restored.realms,restored.authority.migrations]) && M.validate(restored);
    })).toBe(true);
  });
}
