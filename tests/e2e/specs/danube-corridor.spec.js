'use strict';
const {prepareGameContent} = require('../support/game/navigation');
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmarkFromTitle}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const {buildCorridorMod,installCorridorCase}=require('../support/game/danube-corridor');
const cases=require('../fixtures/authoring/danube-corridor-cases.json');
const counties=require('../fixtures/authoring/danube-corridor-counties.json');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1096.js','data/bookmark_1096_scaffold_a.js','data/bookmark_1096_scaffold_b.js',
  'data/bookmark_1096_scaffold_c.js','data/bookmark_1096_scaffold_d.js','data/bookmark_1096_mainz.js',
  'data/bookmark_1096_western_expeditions.js','data/bookmark_1096_campaigns.js',
  'data/starts_pilgrim_1096.js','data/story_pilgrim_1096.js','data/mobile_confederations.js',
  'data/geographies.js','data/geography_expansion.js','data/map_data.js','data/counties.js','data/units.js','data/technology.js',
  'data/political_institutions.js','data/government_rollout.js','data/communal_revisions.js',
  'js/world.js','js/util.js','js/main.js','js/bookmark_setup.js','js/model.js','js/starts.js','js/stories.js',
  'js/governments.js','js/government_selection.js','js/government_lineage.js','js/government_administration.js',
  'js/authority.js','js/treasury.js','js/market.js','js/population.js','js/logistics.js','js/climate.js',
  'js/mobile_confederations.js','js/mobile_command.js','js/mobile_columns.js','js/mobile_camps.js',
  'js/expedition_programs.js','js/story_expedition_program.js','js/story_expedition_preparation.js','js/story_expedition_agreements.js',
  'js/home_authority.js','js/armies.js','js/fortifications.js','js/wars.js','js/federates.js','js/mods.js',
  'js/save.js','js/save_v4.js','js/holywar.js','js/story_ruler_agenda.js','js/ui_mobile.js'
]);

async function importAndBegin(page,info,configuration,countyIds) {
  const mod=await page.evaluate(buildCorridorMod,{configuration:configuration,countyIds:countyIds});
  const validation=await page.evaluate(function (mod) {
    const before=JSON.stringify([FBDATA,FB.state,mod]),rng=FB.getRngState(),uid=FB.getUidCounter();
    const errors=FB.mods.validate(mod);
    return {errors:errors,pure:before===JSON.stringify([FBDATA,FB.state,mod]) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },mod);
  expect(validation).toEqual({errors:[],pure:true});
  await page.evaluate(function () {FB.ui.showMods();});
  await page.locator('#modfile').setInputFiles({name:'danube-route.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await page.waitForFunction(function () {return window.FB && FB.game && FB.game.bootReady && FB.bookmark('1096').revision==='route_review_v1';});
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  await page.evaluate(installCorridorCase,configuration);
  expect(await page.evaluate(function () {
    const C=corridorCase,s=FB.state,M=FB.mobile,c=C.configuration;
    return {men:M.host(s,C.rid).men,people:M.total(s,C.rid),camp:M.migration(s,C.rid).at,
      field:M.host(s,C.rid).at,agreements:C.row(s).agreements.length,
      cologne:M.provisioningAccess(s,C.rid,'cologne'),valid:M.validate(s),
      // The declared credit is added to the ordinary rank opening account.
      treasury:FB.treasuryAvailable(s,C.rid)-((FBDATA.balance.aiTreasuryOpeningFloor || [0,10,20,30,40])[Math.min(4,s.realms[C.rid].rank)] || 0),
      profileLimit:M.profile(s,C.rid).maxAgreements};
  })).toEqual({men:configuration.fighters,people:configuration.fighters+configuration.civilians,camp:'cologne',field:'cologne',
    agreements:0,cologne:false,valid:true,treasury:configuration.treasury,profileLimit:12});
  return mod;
}

async function start(page,info,configuration,countyIds) {
  // Build persisted JSON only after the deferred catalogue is ready, then
  // reload through ordinary stored-mod boot in this test's browser context.
  // Dedicated import coverage still uses the ordinary Mods file picker.
  await openGame(page,info);
  const mod=await page.evaluate(buildCorridorMod,{configuration:configuration,countyIds:countyIds});
  await page.evaluate(function (mod) {
    localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
  },mod);
  await page.reload({waitUntil:'domcontentloaded'});
  await prepareGameContent(page);
  await page.evaluate(function () {FB.mods.assertReady();});
  await beginBookmarkFromTitle(page,'1096','pilgrim_household_1096');
  await page.evaluate(installCorridorCase,configuration);
  const inventory=await page.evaluate(function () {return corridorCase.inventory(FB.state);});
  await info.attach('complete-prospective-corridor-'+configuration.id,{body:Buffer.from(JSON.stringify(inventory,null,2)),contentType:'application/json'});
  // A changed real raster must fail here, rather than silently dropping a
  // county from the declared permissions to fit this fixture.
  expect(inventory.countyIds).toEqual(counties.route);
  return inventory;
}

async function completeImport(page,info,configuration) {
  const composition=Object.assign({},configuration,{composition:true});
  const inventory=await start(page,info,composition,counties.route);
  // Collect both modes and every leg before any assertion about feasibility.
  // The attachment remains available even if the existing representation fails.
  expect(inventory.pure).toBe(true);
  expect(inventory.legs).toHaveLength(configuration.waypoints.length*2);
  expect(inventory.legs.filter(function (leg) {return !leg.complete;}),'Incomplete or fort-truncated intended endpoints').toEqual([]);
  expect(inventory.counties.filter(function (county) {return !county.chain || county.chain.length>16 || county.blocked ||
    county.chain.some(function (p) {return !p.alive;});}),'Unavailable original direct authority or superior chain').toEqual([]);
  expect(inventory.countyIds).toContain('cologne');
  expect(inventory.counties.some(function (v) {return v.holder!==v.owner;}),'Generated direct holders must remain in the world').toBe(true);
  expect(inventory.counties.some(function (v) {return v.chain[0].formId==='administrative_monarchy';}),
    'The actual eastern public court must be covered').toBe(true);
  expect(inventory.counties.filter(function (v) {return v.capacity-v.allocated<configuration.capacity;}),
    'Every actual county must have unallocated capacity for the whole following').toEqual([]);
  expect(inventory.waypointOccurrences).toBeLessThanOrEqual(32);
  expect(inventory.steps).toBeLessThanOrEqual(16);
  // Each fixed envelope holds sixteen independent original decisions.
  // The legacy county and top-level agreement caps remain unchanged.
  expect(inventory.requiredRecords,'Complete original county negotiation count exceeds the existing sixteen-county program').toBeLessThanOrEqual(16);
  expect(Math.ceil(inventory.requiredRecords/16),'Complete fixed envelopes exceed available retained agreement slots').toBeLessThanOrEqual(inventory.availableRecords);
  expect(inventory.totalPrice).toBeLessThanOrEqual(configuration.treasury);
  return inventory;
}

for (const configuration of cases) {
  test(configuration.id+' ordinary JSON import retains the complete real corridor',async function ({page},info) {
    await openGame(page,info);
    await importAndBegin(page,info,Object.assign({},configuration,{composition:true}),counties.route);
    expect(await page.evaluate(function () {return corridorCase.inventory(FB.state).countyIds;})).toEqual(counties.route);
  });

  test(configuration.id+' corridor rejects the entire unaffordable, stale or over-capacity batch before its first offer',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    const result=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,base=C.copy(FB.state);
      const last=inventory.countyIds[inventory.countyIds.length-1];
      const rejected=[function (s) {s.population.counties[last].count=1;},
        function (s) {s.chars[C.chain(s,last)[0].personId].dead=true;},
        function (s) {FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid)-inventory.totalPrice+1);},
        function (s) {M.host(s,C.rid).manual=true;}].map(function (change) {
        const s=C.copy(base),old=E.review(s,C.rid,'permission_0');change(s);
        const before=JSON.stringify([s,FBDATA]),rng=FB.getRngState(),uid=FB.getUidCounter(),q=E.review(s,C.rid,'permission_0');
        return old.allowed && !q.allowed && !E.commit(s,old) && !E.commit(s,q) &&
          before===JSON.stringify([s,FBDATA]) && rng===FB.getRngState() && uid===FB.getUidCounter() && !C.row(s).agreements.length;
      });
      const occupied=C.copy(base),row=C.row(occupied),actor={kind:'character',id:row.leaderId};
      let ordinary=true;
      for (let i=0;i<12;i++) {
        ordinary=ordinary && M.commit(occupied,M.review(occupied,{realmId:C.rid,action:'offer',actor:actor,
          terms:{kind:'access',partnerId:occupied.holder.cologne,countyIds:['cologne'],capacity:1,allowRecruit:false,price:1,duration:1440,levy:0}}));
      }
      const before=JSON.stringify(occupied),batch=E.corridorReview(occupied,C.rid);
      // A fresh quote may bind the current generation before allocation,
      // but no stale quote may commit and allocated originals never retarget.
      const changed=C.copy(base),old=E.review(changed,C.rid,'permission_0'),holder=changed.holder[last];
      changed.realms[holder].ruler.generation=FB.realmRulerGeneration(changed,holder)+1;
      const changedBytes=JSON.stringify(changed),stale=!E.commit(changed,old) && changedBytes===JSON.stringify(changed);
      const bound=C.copy(base),offered=E.commit(bound,E.review(bound,C.rid,'permission_0'));C.next(bound);
      bound.realms[holder].ruler.generation=FB.realmRulerGeneration(bound,holder)+1;
      const boundBytes=JSON.stringify(bound),q=E.review(bound,C.rid,'permission_0');
      return {rejected:rejected,ordinary:ordinary,slots:row.agreements.length===12 && !batch.allowed &&
        before===JSON.stringify(occupied) && row.expeditionProgram.schema===5 && row.expeditionProgram.corridor===null,
        generation:stale && offered && !q.allowed && !E.commit(bound,q) && boundBytes===JSON.stringify(bound)};
    },inventory);
    expect(result).toEqual({rejected:Array(4).fill(true),ordinary:true,slots:true,generation:true});
  });

  test(configuration.id+' corridor rejects a declaration missing a required route county before offering',async function ({page},info) {
    const missing=counties.route.filter(function (pid) {return pid!=='frankfurt';});
    await start(page,info,Object.assign({},configuration,{composition:true}),missing);
    expect(await page.evaluate(function () {
      const s=FB.state,C=corridorCase,E=FB.expeditionPrograms,before=JSON.stringify(s),q=E.review(s,C.rid,'permission_0');
      return !q.allowed && !E.commit(s,q) && before===JSON.stringify(s) && !C.row(s).agreements.length;
    })).toBe(true);
  });

  test(configuration.id+' corridor retains fixed child slots and strict partial refused history',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    const result=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,s=FB.state;
      const first=E.review(s,C.rid,'permission_0'),offer=E.commit(s,first),row=C.row(s),a=M.agreements(s,C.rid)[0];
      const fixed=row.agreements.length===Math.ceil(inventory.requiredRecords/16) && row.agreements[0].receipts.length===16 &&
        row.agreements[0].receipts.slice(1).every(function (v) {return v===null;}) && !M.provisioningAccess(s,C.rid,'cologne');
      const changes=[function (r) {r.agreements[0].receipts.pop();},function (r) {r.agreements[0].receipts.reverse();},
        function (r) {r.agreements[0].receipts[1]=C.copy(r.agreements[0].receipts[0]);},
        function (r) {r.expeditionProgram.corridor.entries.reverse();},function (r) {r.expeditionProgram.corridor.routes[0].legs[0].path=['regensburg'];},
        function (r) {delete r.expeditionProgram.corridor;},function (r) {r.agreements[0].status='active';},
        function (r) {r.agreements[0].receipts[0].id='foreign_receipt';}];
      const malformed=changes.map(function (change) {
        const candidate=C.copy(s);change(C.row(candidate));const before=JSON.stringify(candidate);let denied=false;
        try {M.validate(candidate);} catch (error) {denied=true;}return denied && before===JSON.stringify(candidate);
      });
      C.next(s);
      const before=JSON.stringify(s),refuse=M.review(s,{realmId:C.rid,action:'decline',
        actor:{kind:'character',id:a.accessOrigin.chain[0].personId},terms:{agreementId:a.id}}),pure=before===JSON.stringify(s),
        money=FB.treasuryAvailable(s,C.rid),declined=M.commit(s,refuse),history=JSON.stringify(row.agreements);
      C.next(s);E.day(s);const noRefill=history===JSON.stringify(row.agreements) && a.status==='ended' &&
        FB.treasuryAvailable(s,C.rid)===money && !E.review(s,C.rid,'permission_0').allowed;
      return {offer:offer,fixed:fixed,malformed:malformed,declined:declined,noRefill:noRefill,pure:pure};
    },inventory);
    expect(result).toEqual({offer:true,fixed:true,malformed:Array(8).fill(true),declined:true,noRefill:true,pure:true});
  });

  test(configuration.id+' corridor rejects mixed or oversized declarations without changing live state',async function ({page},info) {
    const ids=counties.route.concat(counties.additional);
    const composition=Object.assign({},configuration,{composition:true,treasury:1000});
    await start(page,info,composition,ids.slice(0,33));
    const oversized=await page.evaluate(buildCorridorMod,{configuration:composition,countyIds:ids});
    const mixed=JSON.parse(JSON.stringify(oversized));
    const revision=mixed.bookmarks['1096'].revisions.route_review_v1;
    const program=revision.realms.find(function (d) {return d.id==='route_review_'+configuration.id;}).mobile.expeditionProgram;
    program.steps=program.steps.filter(function (step) {return step.id!=='permission_4';});
    program.steps.forEach(function (step) {step.after=step.after.filter(function (id) {return id!=='permission_4';});});
    program.steps[0].adapter='local_access';
    for (const candidate of [oversized,mixed]) expect(await page.evaluate(function (mod) {
      const before=JSON.stringify([mod,FBDATA,FB.state]),errors=FB.mods.validate(mod);
      return errors.length>0 && before===JSON.stringify([mod,FBDATA,FB.state]);
    },candidate)).toBe(true);
  });

  test(configuration.id+' corridor allocates all envelopes once and retains partial cancellation',async function ({page},info) {
    const ids=counties.route.concat(counties.additional).slice(0,33);
    await start(page,info,Object.assign({},configuration,{composition:true,treasury:1000}),ids);
    expect(await page.evaluate(function (ids) {
      const C=corridorCase,s=FB.state;
      return ids.every(function (pid) {
        const chain=C.chain(s,pid);
        return chain && chain.every(function (p) {return p.alive;}) &&
          Math.floor(s.population.counties[pid].count*0.15)>=C.configuration.capacity &&
          FB.expeditionPrograms.resolvePassagePolicy(FB.campaignBookmark(s),chain[0].formId)==='accept';
      });
    },ids)).toBe(true);
    expect(await page.evaluate(function () {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,s=FB.state,q=E.review(s,C.rid,'permission_0'),done=E.commit(s,q),r=C.row(s);
      const sizes=r.agreements.map(function (a) {return a.receipts.length;}),ids=r.agreements.map(function (a) {return a.id;});
      const partial=C.restore(),current=C.row(FB.state),before=JSON.stringify(current.agreements);
      C.next(FB.state);const stop=M.commit(FB.state,C.control(FB.state,'cancel')),cancelled=C.restore();
      return {done:done,sizes:sizes,partial:partial,stop:stop,cancelled:cancelled,
        unchanged:before===JSON.stringify(C.row(FB.state).agreements) && ids.join('|')===C.row(FB.state).agreements.map(function (a) {return a.id;}).join('|')};
    })).toEqual({done:true,sizes:[16,16,1],partial:true,stop:true,cancelled:true,unchanged:true});
  });

  test(configuration.id+' compact, pending, offered and accepted corridor saves restore repeatedly',async function ({page},info) {
    await completeImport(page,info,configuration);
    const result=await page.evaluate(function () {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms;
      const compact=JSON.parse(FB.save.serialize()),compactBytes=JSON.stringify(compact);
      const compactCommand=compact.state.realms[C.rid].alive===undefined && M.validate(compact.state) &&
        compactBytes===JSON.stringify(compact);
      const rng=FB.getRngState(),uid=FB.getUidCounter(),undertakings=Object.keys(compact.state.stories).filter(function (id) {
        const story=FB.stories.get(id);return story && story.declaration && story.declaration.type==='expedition_undertaking';
      });
      const compactAgreements=undertakings.length>0 && FB.save.v4.validatePlatform(compact.state) &&
        undertakings.every(function (id) {
          const original=compact.state.stories[id],
            other=Object.keys(compact.state.chars).find(function (cid) {return original.partyIds.indexOf(cid)<0;});
          if (!other) return false;
          return [function (x) {x.state.stories[id].partyIds[1]=other;},
            function (x) {x.state.chars[original.partyIds[1]].id=other;}].every(function (edit) {
            const candidate=C.copy(compact);edit(candidate);const before=JSON.stringify(candidate);
            try {FB.stories.get(id).validate(candidate.state.stories[id],candidate.state);return false;}
            catch (error) {return before===JSON.stringify(candidate);}
          });
        }) && compactBytes===JSON.stringify(compact) && rng===FB.getRngState() && uid===FB.getUidCounter();
      const pending=C.restore(2);
      const q=E.review(FB.state,C.rid,'permission_0'),offered=E.commit(FB.state,q),offeredRestore=C.restore(2);C.next(FB.state);
      const response=E.review(FB.state,C.rid,'permission_0'),accepted=E.commit(FB.state,response),
        repeated=!E.commit(FB.state,response),acceptedRestore=C.restore(2);
      return {compactCommand:compactCommand,compactAgreements:compactAgreements,pending:pending,offered:offered,
        offeredRestore:offeredRestore,accepted:accepted,repeated:repeated,acceptedRestore:acceptedRestore};
    });
    expect(result).toEqual({compactCommand:true,compactAgreements:true,pending:true,offered:true,
      offeredRestore:true,accepted:true,repeated:true,acceptedRestore:true});
  });

  test(configuration.id+' complete actual corridor obtains original receipts and replays finite payments',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    const result=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,money=FB.treasuryAvailable(FB.state,C.rid),balances={};
      const initial=JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population]),people=M.total(FB.state,C.rid);
      Object.keys(FB.state.realms).forEach(function (rid) {balances[rid]=FB.treasuryAvailable(FB.state,rid);});
      // Allocate the original identities before forking the replay. Both
      // continuations must refer to these receipts, not mint different ids.
      for (let i=0;i<2;i++) {
        if (!E.commit(FB.state,E.review(FB.state,C.rid,'permission_0'))) throw new Error('Initial corridor decision failed');
        C.next(FB.state);
      }
      const replay=C.copy(FB.state),negotiated=C.negotiate(FB.state,true),replayed=C.negotiate(replay,true),s=FB.state,agreements=M.agreements(s,C.rid),
        credits={},cost=agreements.reduce(function (n,a) {credits[a.partnerId]=(credits[a.partnerId] || 0)+a.price;return n+a.price;},0);
      const original=agreements.every(function (a) {
        const county=inventory.counties.find(function (v) {return v.countyId===a.countyIds[0];});
        return a.status==='active' && a.countyIds.length===1 && a.partnerId===county.holder &&
          a.accessOrigin.schema===2 && a.accessOrigin.commanderId===C.row(s).leaderId &&
          JSON.stringify(a.accessOrigin.chain)===JSON.stringify(county.chain.map(function (p) {
            return {courtId:p.courtId,personId:p.personId,generation:p.generation};})) &&
          a.price===C.configuration.price && a.capacity===C.configuration.capacity && a.duration===C.configuration.duration &&
          a.accessOrigin.passagePolicy.response===county.policy;
      });
      const covered=C.covered(s,inventory),retained=C.restore();
      return {complete:negotiated.complete,receipts:agreements.length,original:original,covered:covered,
        payment:Math.abs(money-FB.treasuryAvailable(FB.state,C.rid)-cost)<1e-8,
        credits:Object.keys(credits).every(function (rid) {return Math.abs(FB.treasuryAvailable(FB.state,rid)-balances[rid]-credits[rid])<1e-8;}),
        trace:negotiated.trace.filter(function (v) {return v.action==='accept';}).every(function (v) {
          return Math.abs(v.balances.debit-v.balances.price)<1e-8 && Math.abs(v.balances.credit-v.balances.price)<1e-8;}),
        conserved:initial===JSON.stringify([s.owner,s.holder,s.population]) && people===M.total(s,C.rid),retained:retained,
        replay:replayed.complete && C.accounts(replay)===C.accounts(s)};
    },inventory);
    expect(result).toEqual({complete:true,receipts:inventory.requiredRecords,original:true,covered:true,
      payment:true,credits:true,trace:true,conserved:true,retained:true,replay:true});
  });

  test(configuration.id+' negotiated corridor retains supply, controls, cancellation and expired originals',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    expect(await page.evaluate(function () {return corridorCase.negotiate(FB.state,false).complete;})).toBe(true);
    const result=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms;
      const supply=C.copy(FB.state);C.row(supply).food=0;
      const purchase=E.review(supply,C.rid,'provisions'),cash=FB.treasuryAvailable(supply,C.rid),
        stock=FB.marketProvisionSnapshot(supply,'cologne').stock;
      const bought=E.commit(supply,purchase),quantity=purchase.operation && purchase.operation.request.terms.count,
        finiteSupply=bought && quantity>0 && quantity<=stock &&
          Math.abs(cash-FB.treasuryAvailable(supply,C.rid)-purchase.operation.review.cost)<1e-8 &&
          Math.abs(stock-FB.marketProvisionSnapshot(supply,'cologne').stock-quantity)<1e-8 && C.row(supply).food===quantity && !E.commit(supply,purchase);
      const controls=C.copy(FB.state),paused=M.commit(controls,C.control(controls,'pause')),
        pauseDenies=!E.review(controls,C.rid,'field_route').allowed,
        pauseRepeats=!M.commit(controls,C.control(controls,'pause')),resumed=M.commit(controls,C.control(controls,'resume'));
      const missing=C.copy(FB.state),leg=inventory.legs[0],interior=leg.plan.path.find(function (pid) {
        return C.configuration.waypoints.indexOf(pid)<0;
      });
      const omittedRow=C.row(missing),omitted=M.agreements(missing,C.rid).find(function (a) {return a.countyIds[0]===interior;});
      if (!omitted) throw new Error('The complete first leg must expose an intervening county for omission coverage');
      omitted.status='ended';
      omittedRow.expeditionProgram.steps[0].agreementIds=omittedRow.expeditionProgram.steps[0].agreementIds.filter(function (id) {return id!==omitted.id;});
      const missingBytes=JSON.stringify(missing),missingReview=E.review(missing,C.rid,'field_route'),
        omission=!C.covered(missing,inventory) && !missingReview.allowed && !E.commit(missing,missingReview) && missingBytes===JSON.stringify(missing);
      const broken=[function (r) {r.agreements.splice(0,1);},function (r) {r.agreements[0].receipts[0].accessOrigin.chain[0].personId='missing';},
        function (r) {r.agreements[0].receipts[0].accessOrigin.passagePolicy.response='decline';},
        function (r) {r.agreements[0].receipts[0].price++;},function (r) {r.expeditionProgram.schema=3;},
        function (r) {r.expeditionProgram.steps[0].agreementIds=[];},function (r) {r.agreements.push(C.copy(r.agreements[0]));}]
        .map(function (change) {
          // Each corruption edits only the program row, so give the candidate
          // its own row and share the unchanged remainder of the live world.
          const live=FB.state,liveRow=JSON.stringify(C.row(live)),governments=Object.assign({},live.authority.governments);
          governments[C.rid]=Object.assign({},governments[C.rid],{mobile:C.copy(C.row(live))});
          const candidate=Object.assign({},live,{authority:Object.assign({},live.authority,{governments:governments})});
          change(C.row(candidate));const before=JSON.stringify(C.row(candidate));
          let denied=false;try {M.validate(candidate);} catch (error) {denied=true;}
          return denied && before===JSON.stringify(C.row(candidate)) && liveRow===JSON.stringify(C.row(live));});
      const cancelled=M.commit(FB.state,C.control(FB.state,'cancel')),cancelledRestore=C.restore();
      const row=C.row(FB.state),origins=JSON.stringify(M.agreements(FB.state,C.rid).map(function (a) {return a.accessOrigin;}));
      const year=FB.state.date.year;
      C.atTurn(FB.state,Math.max.apply(null,M.agreements(FB.state,C.rid).map(function (a) {return a.endTurn;})));
      // The direct jump skips the year boundary's court pass, where a court
      // whose minor ruler comes of age materializes its consort.
      if (FB.state.date.year!==year) FB.ensureDynasticState(FB.state,{yearly:true});
      FB.mobileDay(FB.state);
      const ended=M.agreements(FB.state,C.rid),endedRestore=C.restore();
      const compaction=M.agreements(FB.state,C.rid).every(function (a) {return a.accessOrigin.chain.every(function (p) {
        return FB.courtRecordRetained(FB.state,FB.state.chars[p.personId],{},{});
      });});
      return {supply:finiteSupply,controls:paused && pauseDenies && pauseRepeats && resumed,omission:omission,broken:broken,
        cancelled:cancelled,cancelledRestore:cancelledRestore,ended:ended.length===inventory.requiredRecords &&
          ended.every(function (a) {return a.status==='ended' && !M.provisioningAccess(FB.state,C.rid,a.countyIds[0]);}),
        origins:origins===JSON.stringify(ended.map(function (a) {return a.accessOrigin;})),compaction:compaction,endedRestore:endedRestore};
    },inventory);
    expect(result).toEqual({supply:true,controls:true,omission:true,broken:Array(7).fill(true),cancelled:true,cancelledRestore:true,
      ended:true,origins:true,compaction:true,endedRestore:true});
  });

  for (const mode of ['camp','field']) test(configuration.id+' every intended '+mode+' leg checks all permissions and actual bounded arrival',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    inventory.legs=inventory.legs.filter(function (leg) {return leg.mode===mode;});
    const negotiated=await page.evaluate(function () {return corridorCase.negotiate(FB.state,false);});
    expect(negotiated.complete).toBe(true);
    // Each case stages a prospective later boundary independently. It checks
    // the whole leg, then moves its final real edge with the canonical hooks.
    // This deliberately makes no multi-year natural-travel claim.
    const results=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,baseline=C.copy(FB.state),out=[];
      inventory.legs.forEach(function (leg) {
        const s=C.copy(baseline),a=M.host(s,C.rid),moving=M.migration(s,C.rid),row=C.row(s),mode=leg.mode==='camp',
          stepId=leg.mode+'_route',checkpoint=row.expeditionProgram.steps.find(function (v) {return v.id===stepId;});
        a.at=leg.origin;a.path=[];a.goal=null;a.moveLeft=0;a.from=null;a.mobileCourt=mode;
        moving.at=mode ? leg.origin : C.configuration.campOrigin;checkpoint.cursor=leg.index;
        row.expeditionProgram.steps.find(function (v) {return v.id===(mode ? 'field_route' : 'camp_route');}).status='cancelled';
        const plan=FB.armyOrderPlan(s,a,leg.target),whole=C.complete(plan,leg.origin,leg.target) &&
          [leg.origin].concat(plan.path).every(function (pid) {return M.passage(s,C.rid,pid,mode) && M.provisioningAccess(s,C.rid,pid);});
        const q=E.review(s,C.rid,stepId),issued=E.commit(s,q);
        // Whole-world restore and reconcile lifecycle checks do not depend on
        // the leg, so the first leg of each mode carries them. Every leg still
        // checks its permissions, issued order, arrival and cursor.
        const lifecycle=leg.index===0;
        FB.state=s;const inFlight=lifecycle ? C.restore() : true;const live=FB.state,host=M.host(live,C.rid),camp=M.migration(live,C.rid);
        let manualPreserved=true,stopped=true;
        if (lifecycle) {
          const manual=C.copy(live),ma=M.host(manual,C.rid);ma.manual=true;ma.goal=leg.origin;ma.path=[];ma.moveLeft=0;
          E.reconcile(manual);manualPreserved=ma.manual && ma.goal===leg.origin && C.row(manual).expeditionProgram.execution.paused;
          const stale=C.copy(live),first=plan.path[0],receipt=M.agreements(stale,C.rid).find(function (a) {return a.countyIds[0]===first;});
          stale.chars[receipt.accessOrigin.chain[0].personId].captive=true;E.reconcile(stale);
          stopped=M.host(stale,C.rid).path.length===0;
        }
        // A dated near-arrival fixture, not simulated travel through the
        // preceding counties. Only the final edge advances through armyTick.
        const previous=plan.path.length>1 ? plan.path[plan.path.length-2] : leg.origin;
        host.at=previous;host.from=null;host.path=[leg.target];host.moveLeft=1;host.goal=leg.target;
        if (mode) camp.at=previous;
        C.next(live);FB.armyTick(live);FB.federateDay(live);E.reconcile(live);
        C.next(live);const observed=E.review(live,C.rid,stepId),completed=E.commit(live,observed);
        const arrived=host.at===leg.target && (mode ? camp.at===leg.target : camp.at===C.configuration.campOrigin);
        const cursor=C.row(live).expeditionProgram.steps.find(function (v) {return v.id===stepId;}).cursor;
        out.push({mode:leg.mode,target:leg.target,whole:whole,issued:issued,inFlight:inFlight,manual:manualPreserved,stopped:stopped,
          arrived:arrived,completed:completed,cursor:cursor===leg.index+1,restored:lifecycle ? C.restore() : true});
      });return out;
    },inventory);
    expect(results).toEqual(inventory.legs.map(function (leg) {return {mode:leg.mode,target:leg.target,whole:true,issued:true,
      inFlight:true,manual:true,stopped:true,arrived:true,completed:true,cursor:true,restored:true};}));
  });

  test(configuration.id+' actual-world negative boundaries retain complete evidence without granting corridor permission',async function ({page},info) {
    const inventory=await start(page,info,configuration);
    const result=await page.evaluate(function () {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms,base=C.copy(FB.state),s=C.copy(base),
        first=E.review(s,C.rid,'permission_0'),offered=E.commit(s,first);C.next(s);
      const controlled=C.copy(base);controlled.player.charId=C.row(controlled).leaderId;
      E.day(controlled);const noAutomaticOffer=C.row(controlled).agreements.length===0,
        playerOffer=E.commit(controlled,E.review(controlled,C.rid,'permission_0'));C.next(controlled);E.day(controlled);
      const outsideResponse=C.row(controlled).agreements[0].status==='active';
      const changes=[function (s,a) {s.holder[a.countyIds[0]]=s.owner[a.countyIds[0]];},
        function (s,a) {s.owner[a.countyIds[0]]=C.rid;},
        function (s,a) {s.realms[a.partnerId].liege=C.rid;},
        function (s,a) {s.chars[a.accessOrigin.chain[0].personId].dead=true;},
        function (s,a) {s.realms[a.partnerId].ruler.generation=FB.realmRulerGeneration(s,a.partnerId)+1;},
        function (s,a) {s.population.counties[a.countyIds[0]].count=1;},
        function (s) {FB.treasurySpend(s,C.rid,FB.treasuryAvailable(s,C.rid));},
        function (s) {M.host(s,C.rid).holdManual=1;},function (s) {C.next(s);}];
      const stale=changes.map(function (change) {
        const candidate=C.copy(s),a=C.row(candidate).agreements[0],q=E.review(candidate,C.rid,'permission_0');
        change(candidate,a);const before=JSON.stringify(candidate),rng=FB.getRngState(),uid=FB.getUidCounter();
        return q.allowed && !E.commit(candidate,q) && before===JSON.stringify(candidate) && rng===FB.getRngState() && uid===FB.getUidCounter();
      });
      const declined=C.copy(s),agreement=C.row(declined).agreements[0],refusal=M.review(declined,{realmId:C.rid,action:'decline',
        actor:{kind:'character',id:agreement.accessOrigin.chain[0].personId},terms:{agreementId:agreement.id}}),
        refused=M.commit(declined,refusal),money=FB.treasuryAvailable(declined,C.rid),history=JSON.stringify(agreement);
      C.next(declined);E.day(declined);
      const noRenewal=history===JSON.stringify(agreement) && C.row(declined).agreements.length===1 &&
        money===FB.treasuryAvailable(declined,C.rid) && !M.provisioningAccess(declined,C.rid,'cologne');
      // Fill the existing ordinary slots through canonical offers. They
      // remain separate from the ended original and must all be counted.
      const occupied=C.copy(declined),row=C.row(occupied),pid='cologne',actor={kind:'character',id:row.leaderId};
      let filled=true;
      for (let i=row.agreements.length;i<M.profile(occupied,C.rid).maxAgreements;i++) {
        const q=M.review(occupied,{realmId:C.rid,action:'offer',actor:actor,terms:{kind:'access',partnerId:occupied.holder[pid],
          countyIds:[pid],capacity:1,allowRecruit:false,price:1,duration:1440,levy:0}});
        if (!M.commit(occupied,q)) {filled=false;break;}
      }
      const capacity=C.inventory(occupied),before=JSON.stringify(occupied),extra=M.review(occupied,{realmId:C.rid,action:'offer',actor:actor,
        terms:{kind:'access',partnerId:occupied.holder[pid],countyIds:[pid],capacity:1,allowRecruit:false,price:1,duration:1440,levy:0}});
      const denied=!extra.allowed && !M.commit(occupied,extra) && before===JSON.stringify(occupied);
      const separate=C.inventory(base,{field:C.configuration.waypoints[0],camp:'cologne'});
      return {offered:offered,playerControl:noAutomaticOffer && playerOffer && outsideResponse,
        stale:stale,refused:refused,noRenewal:noRenewal,filled:filled,denied:denied,
        allSlots:capacity.availableRecords===0 && capacity.occupied.length===12 && capacity.occupied[0].original && capacity.occupied[0].status==='ended',
        separate:separate.legs[0].origin===C.configuration.waypoints[0] && separate.legs[C.configuration.waypoints.length].origin==='cologne' &&
          separate.countyIds.indexOf('cologne')>=0 && separate.pure};
    });
    expect(result).toEqual({offered:true,playerControl:true,stale:Array(9).fill(true),refused:true,noRenewal:true,filled:true,denied:true,allSlots:true,separate:true});
    const invalid=await page.evaluate(function (input) {
      const c=input.configuration,ids=FB.campaignBookmark(FB.state).provinces.filter(function (p) {return !p.wasteland;}).slice(0,17).map(function (p) {return p.id;});
      return ids;
    },{configuration:configuration});
    const over=await page.evaluate(buildCorridorMod,{configuration:configuration,countyIds:invalid});
    expect(await page.evaluate(function (mod) {
      const before=JSON.stringify([mod,FBDATA,FB.state]),rng=FB.getRngState(),uid=FB.getUidCounter(),errors=FB.mods.validate(mod);
      return errors.length>0 && before===JSON.stringify([mod,FBDATA,FB.state]) && rng===FB.getRngState() && uid===FB.getUidCounter();
    },over)).toBe(true);
    // Inspect the same real raster with an actual hostile fortified ring,
    // leaving the planner and every graph edge intact.
    const fort=await page.evaluate(function () {
      const C=corridorCase,s=C.copy(FB.state),a=FB.mobile.host(s,C.rid),target=C.configuration.waypoints[0],neighbors=Object.keys(FB.world.adj[a.at]),wars={};
      neighbors.forEach(function (pid) {
        const enemy=s.owner[pid];
        if (!wars[enemy]) {
          wars[enemy]=FB.registerOrdinaryWar(s,C.rid,{enemy:enemy,defending:true,target:pid,fortSieges:{},legacy:true});
          if (!wars[enemy]) throw new Error('The hostile fort fixture must register a real defensive war');
        }
        s.buildings[pid]=[{id:FB.fortificationBuildingId(),level:2}];
      });
      FB.invalidateRealmCache();FB.invalidateFortIndex();
      const plan=FB.armyOrderPlan(s,a,target);
      return {ok:plan.ok,truncated:plan.stop!==target,refusedComplete:!C.complete(plan,a.at,target),blocker:!!plan.blockedByFort};
    });
    expect(fort).toEqual({ok:true,truncated:true,refusedComplete:true,blocker:true});
    expect(inventory.legs).toHaveLength(configuration.waypoints.length*2);
  });
}
