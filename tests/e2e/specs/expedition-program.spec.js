'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={harbor:require('../fixtures/authoring/expedition-program-harbor.json'),
  dune:require('../fixtures/authoring/expedition-program-dune.json')};
dependsOnRuntime(__filename,['index.html','data/mobile_confederations.js','data/units.js','data/technology.js',
  'js/expedition_programs.js','js/mobile_columns.js','js/mobile_confederations.js','js/mobile_command.js',
  'js/government_selection.js','js/governments.js','js/authority.js','js/government_support.js','js/population.js',
  'js/market.js','js/treasury.js','js/logistics.js','js/armies.js','js/federates.js','js/technology.js','js/model.js',
  'js/mods.js','js/world.js','js/bookmark_setup.js','js/starts.js','js/save.js','js/save_v4.js','js/home_authority.js',
  'js/main.js','js/util.js']);

async function start(page,info,prefix,input) {
  await openGame(page,info);
  await page.evaluate(function () {FB.ui.showMods();});
  if (input) await page.locator('#modfile').setInputFiles({name:'program.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  else await page.locator('#modfile').setInputFiles(path.resolve(__dirname,'../fixtures/authoring/expedition-program-'+prefix+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await page.waitForFunction(function (prefix) {return window.FB && FB.game && FB.game.bootReady && FBDATA.bookmarks[prefix+'_world'];},prefix);
  await beginBookmark(page,info,prefix+'_world',prefix+'_household');
  await page.evaluate(function () {
    const s=FB.state,d=FB.campaignBookmark(s).realms.find(function (r) {return r.mobile;});
    window.programCase={rid:FB.startRealmId(s,d.id),definition:d,
      host:function (s,index) {const r=FB.mobile.row(s,this.rid),c=r.columns && r.columns.entries[index || 0];
        return c ? s.armies.find(function (a) {return a.id===c.hostId;}) : FB.mobile.host(s,this.rid);}};
  });
}

for (const prefix of ['harbor','dune']) {
  test(prefix+' ordinary JSON program imports, initializes once and reviews real routes without mutation',async function ({page},info) {
    await start(page,info,prefix);
    const result=await page.evaluate(function () {
      const C=programCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,r=M.row(s,C.rid),d=C.definition;
      const before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      const a=E.review(s,C.rid,'approach'),b=E.review(s,C.rid,'approach',{kind:'character',id:r.leaderId});
      const invalidActors=[false,0,{}, {kind:'realm',id:C.rid},{kind:'character',id:'missing'}].every(function (actor) {
        return !E.review(s,C.rid,'approach',actor).allowed;
      });
      const pure=before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const checkpoint=JSON.stringify(r.expeditionProgram);M.initialize(s,[d]);
      return {pure:pure,same:JSON.stringify(a)===JSON.stringify(b),invalidActors:invalidActors,allowed:a.allowed,source:a.operation && a.operation.source,
        action:a.operation && a.operation.request.action,origin:a.facts.fieldCountyId,camp:a.facts.campCountyId,
        untouched:checkpoint===JSON.stringify(r.expeditionProgram),cursor:r.expeditionProgram.steps[0].cursor,
        match:E.matchesReview(s,a),valid:M.validate(s),technology:FBDATA.techImpactReviews.features.expedition_program_reviews.mode};
    });
    expect(result).toEqual({pure:true,same:true,invalidActors:true,allowed:true,source:'mobile_columns',action:prefix==='harbor' ? 'march' : 'move',
      origin:prefix==='harbor' ? 'harbor_quay' : 'dune_well',camp:prefix==='harbor' ? 'harbor_quay' : 'dune_well',
      untouched:true,cursor:0,match:true,valid:true,technology:'none'});
  });
}

test('detached validation rejects unsupported declarations atomically without RNG or registry changes',async function ({page},info) {
  await openGame(page,info);
  const result=await page.evaluate(function (source) {
    const changes=[function (p) {p.schema=2;},function (p) {p.extra=true;},function (p) {p.id='';},
      function (p) {p.commandId='missing';},function (p) {p.steps=[];},function (p) {p.steps=Array(17).fill(p.steps[0]);},
      function (p) {p.steps[1].id=p.steps[0].id;},function (p) {p.steps[0].after=['approach'];},
      function (p) {p.steps[0].after=['hold'];},function (p) {p.steps[0].after=['missing'];},
      function (p) {p.steps[0].window.startTurn=-1;},function (p) {p.steps[0].window.endTurn=1441;},
      function (p) {p.steps[0].window.endTurn=0;},function (p) {p.steps[0].window.startTurn=0.5;},
      function (p) {p.steps[0].columnId=null;},function (p) {p.steps[0].columnId='missing';},
      function (p) {p.steps[0].adapter='teleport';},function (p) {p.steps[0].terms.mode='residence';},
      function (p) {p.steps[0].terms.waypoints=[];},function (p) {p.steps[0].terms.waypoints=['missing'];},
      function (p) {p.steps[0].requirements.minMen=0.5;},function (p) {p.steps[0].requirements.minFood=-1;},
      function (p) {p.steps[0].requirements.minTreasury=1000001;},
      function (p) {p.steps[0].requirements.memberIds=['missing'];},
      function (p) {p.steps[0].requirements.access.countyIds=['missing'];},
      function (p) {p.steps[0].requirements.access.mode='residence';},
      function (p) {p.steps[1].terms.action='mint';},function (p) {p.steps[2].terms.effect='victory';},
      function (p) {p.steps[3].terms.duration=0;},function (p) {p.steps[3].terms.partnerRealmId='missing';},
      function (p) {p.steps[4].terms.causes[0].type='forced_victory';},
      function (p) {p.steps[4].terms.causes[0].enemy='missing';},
      function (p) {p.steps[4].terms.causes.push(p.steps[4].terms.causes[0]);}];
    return changes.map(function (change) {
      const mod=JSON.parse(JSON.stringify(source)),t=mod.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile;
      change(t.expeditionProgram);
      const bytes=JSON.stringify(mod),before=JSON.stringify([FB.state,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter();
      return FB.mods.validate(mod).length>0 && bytes===JSON.stringify(mod) && before===JSON.stringify([FB.state,FBDATA]) &&
        rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  },examples.dune);
  expect(result).toHaveLength(33);expect(result.every(Boolean)).toBe(true);
});

test('finite boundaries and dependencies are observations and never advance or expire checkpoints',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=programCase,s=JSON.parse(JSON.stringify(FB.state)),E=FB.expeditionPrograms,p=FB.mobile.row(s,C.rid).expeditionProgram;
    const bytes=JSON.stringify(p),out=[];
    s.turn=9;out.push(E.review(s,C.rid,'hold').reason);
    s.turn=10;out.push(E.review(s,C.rid,'hold').reason);
    s.turn=120;out.push(E.review(s,C.rid,'approach').reason);
    s.turn=240;out.push(E.review(s,C.rid,'frontier_objective').reason);
    return {reasons:out,unchanged:bytes===JSON.stringify(p),host:s.armies.length===FB.state.armies.length};
  });
  expect(result).toEqual({reasons:['window','dependency','expired','expired'],unchanged:true,host:true});
});

test('route observations distinguish a field host, civilian camp and permanent household home',async function ({page},info) {
  await start(page,info,'harbor');
  const result=await page.evaluate(function () {
    const C=programCase,s=JSON.parse(JSON.stringify(FB.state)),E=FB.expeditionPrograms,M=FB.mobile,a=C.host(s),home=s.player.provinceId;
    const target=C.definition.mobile.expeditionProgram.steps[0].terms.waypoints[0],camp=M.migration(s,C.rid).at;
    a.at=target;a.from=target;a.path=[];a.moveLeft=0;
    const before=JSON.stringify(s),q=E.review(s,C.rid,'approach');
    return {allowed:q.allowed,reached:q.observation,operation:q.operation,field:q.facts.fieldCountyId===target,
      camp:q.facts.campCountyId===camp,home:s.player.provinceId===home,pure:before===JSON.stringify(s),
      progress:M.row(s,C.rid).expeditionProgram.steps[0].cursor};
  });
  expect(result).toEqual({allowed:true,reached:'reached',operation:null,field:true,camp:true,home:true,pure:true,progress:0});
});

test('current funds, consent, command, carriers and cancellation invalidate previous reviews',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=programCase,E=FB.expeditionPrograms,M=FB.mobile;
    const changes=[function (s,r,a) {s.turn++;},function (s,r,a) {s.chars[r.leaderId].dead=true;},
      function (s,r,a) {r.members[0].allegiance=false;},function (s,r,a) {a.path=[a.at];a.moveLeft=1;},
      function (s,r,a) {a.mobileFood++;},function (s,r,a) {r.expeditionProgram.status='cancelled';},
      function (s,r,a) {r.columns.entries[0].status='retired';},function (s,r,a) {r.command.issuer.generation++;},
      function (s,r,a) {r.expeditionProgram.steps[0].status='cancelled';},
      function (s,r,a) {a.broken=1;},function (s,r,a) {FB.treasuryCredit(s,C.rid,1);}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(FB.state)),r=M.row(s,C.rid),a=C.host(s),q=E.review(s,C.rid,'approach');
      change(s,r,a);const before=JSON.stringify(s);
      return q.allowed && !E.matchesReview(s,q) && before===JSON.stringify(s);
    });
  });
  expect(result).toEqual(Array(11).fill(true));
});

test('resource thresholds and exact current access fail without borrowing camp food or private gold',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.dune)),t=input.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile;
  t.expeditionProgram.steps[0].requirements.minFood=1;
  t.expeditionProgram.steps[0].requirements.minTreasury=1;
  t.expeditionProgram.steps[0].requirements.access.countyIds=['dune_flats'];
  await start(page,info,'dune',input);
  const result=await page.evaluate(function () {
    const C=programCase,s=JSON.parse(JSON.stringify(FB.state)),M=FB.mobile,E=FB.expeditionPrograms,r=M.row(s,C.rid),a=C.host(s);
    r.food=100000;s.player.gold=100000;
    const resources=E.review(s,C.rid,'approach').reason;
    a.mobileFood=2;FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));
    const funds=E.review(s,C.rid,'approach').reason;
    FB.treasuryCredit(s,C.rid,2);r.agreements=[];
    const access=E.review(s,C.rid,'approach').reason;
    return {resources:resources,funds:funds,access:access,camp:r.food,privateGold:s.player.gold};
  });
  expect(result).toEqual({resources:'resources',funds:'resources',access:'access',camp:100000,privateGold:100000});
});

test('supply, outside offers and war objectives reuse their canonical reviews without execution',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,r=M.row(s,C.rid),actor={kind:'character',id:r.leaderId};
    const before=JSON.stringify(s),supply=E.review(s,C.rid,'refit'),offer=E.review(s,C.rid,'request_passage');
    const expected=M.columnSupplyReview(s,C.rid,r.columns.entries[1].id,'trade',actor);
    const exact=JSON.stringify(supply.operation)===JSON.stringify(expected),offerExact=offer.operation &&
      JSON.stringify(offer.operation)===JSON.stringify(M.review(s,offer.operation.request));
    const pure=before===JSON.stringify(s);s.turn=30;
    const war=E.review(s,C.rid,'frontier_objective'),canonical=war.operation && M.reviewColumns(s,war.operation.request);
    return {exact:exact,offer:!!offerExact,pure:pure,war:!!canonical && JSON.stringify(canonical)===JSON.stringify(war.operation),
      noWar:!s.wars || !s.wars.length,checkpoint:r.expeditionProgram.steps.every(function (v) {return v.status==='pending' && !v.cursor;})};
  });
  expect(result).toEqual({exact:true,offer:true,pure:true,war:true,noWar:true,checkpoint:true});
});

test('strict optional saved records reject forged identities, cursors and lifecycle states without repair',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=programCase,M=FB.mobile;
    const changes=[function (r) {delete r.expeditionProgram;},function (r) {r.expeditionProgram.schema=2;},
      function (r) {r.expeditionProgram.id='missing';},function (r) {r.expeditionProgram.commandId='missing';},
      function (r) {r.expeditionProgram.definitionKey+=' ';},function (r) {r.expeditionProgram.extra=true;},
      function (r) {r.expeditionProgram.steps.pop();},function (r) {r.expeditionProgram.steps.reverse();},
      function (r) {r.expeditionProgram.steps[0].id='missing';},function (r) {r.expeditionProgram.steps[0].cursor=-1;},
      function (r) {r.expeditionProgram.steps[0].cursor=2;},function (r) {r.expeditionProgram.steps[0].cursor=0.5;},
      function (r) {r.expeditionProgram.steps[0].status='complete';},function (r) {r.expeditionProgram.steps[1].cursor=1;},
      function (r) {r.expeditionProgram.steps[2].status='complete';},function (r) {r.expeditionProgram.status='complete';},
      function (r) {r.expeditionProgram.status='forged';}];
    return changes.map(function (change) {
      const s=JSON.parse(JSON.stringify(FB.state));change(M.row(s,C.rid));
      const bytes=JSON.stringify(s),rng=FB.getRngState(),uid=FB.getUidCounter();let rejected=false;
      try {FB.save.v4.validateAuthority(s.authority,s);M.validate(s);} catch(error) {rejected=true;}
      return rejected && bytes===JSON.stringify(s) && rng===FB.getRngState() && uid===FB.getUidCounter();
    });
  });
  expect(result).toEqual(Array(17).fill(true));
});

test('matching restore retains progress and cancellation without replaying movement, resources or identities',async function ({page},info) {
  await start(page,info,'dune');
  const result=await page.evaluate(function () {
    const C=programCase,M=FB.mobile,s=FB.state,r=M.row(s,C.rid);
    r.expeditionProgram.steps[0].cursor=1;r.expeditionProgram.steps[1].status='cancelled';
    const bytes=JSON.stringify([r.expeditionProgram,s.armies,s.chars,s.owner,s.holder,r.food]),rng=FB.getRngState(),uid=FB.getUidCounter();
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const restored=FB.state,rr=M.row(restored,C.rid);
    return {same:bytes===JSON.stringify([rr.expeditionProgram,restored.armies,restored.chars,restored.owner,restored.holder,rr.food]),
      rng:rng===FB.getRngState(),uid:uid===FB.getUidCounter(),valid:M.validate(restored),
      closed:FB.expeditionPrograms.review(restored,C.rid,'refit').reason};
  });
  expect(result).toEqual({same:true,rng:true,uid:true,valid:true,closed:'closed'});
});

test('the single-host fallback supports program routes without requiring columns or inventing a carrier',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor)),t=input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile;
  delete t.columns;t.expeditionProgram.steps.forEach(function (v) {v.columnId=null;});
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function () {
    const C=programCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),before=JSON.stringify(s),q=FB.expeditionPrograms.review(s,C.rid,'approach');
    return {columns:r.columns===undefined,allowed:q.allowed,source:q.operation.source,action:q.operation.request.action,
      one:s.armies.filter(function (a) {return a.realm===C.rid;}).length===1,pure:before===JSON.stringify(s),valid:M.validate(s)};
  });
  expect(result).toEqual({columns:true,allowed:true,source:'coalition_leadership',action:'march',one:true,pure:true,valid:true});
});

test('legacy declarations remain optional while injected saved programs and changed mod content are rejected',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.harbor));delete input.bookmarks.harbor_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram;
  await start(page,info,'harbor',input);
  const result=await page.evaluate(function (changed) {
    const C=programCase,s=FB.state,M=FB.mobile,r=M.row(s,C.rid),valid=M.validate(s),noRecord=r.expeditionProgram===undefined;
    const bad=JSON.parse(JSON.stringify(s));M.row(bad,C.rid).expeditionProgram={schema:1};let rejected=false;
    try {M.validate(bad);} catch(error) {rejected=true;}
    const saved=FB.save.serialize();FB.mods.apply(changed);const before=JSON.stringify(FB.state);let mismatch=false;
    try {FB.save.restore(JSON.parse(saved));} catch(error) {mismatch=/different mod/.test(error.message);}
    return {valid:valid,noRecord:noRecord,rejected:rejected,mismatch:mismatch,pure:before===JSON.stringify(FB.state)};
  },examples.harbor);
  expect(result).toEqual({valid:true,noRecord:true,rejected:true,mismatch:true,pure:true});
});
