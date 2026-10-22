'use strict';
const {test,expect}=require('../support/fixture');
const {openGame}=require('../support/game/navigation');
const {beginBookmark}=require('../support/game/bookmark-acceptance');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const {buildCorridorMod,installCorridorCase}=require('../support/game/danube-corridor');
const cases=require('../fixtures/authoring/danube-corridor-cases.json');

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
  'js/expedition_programs.js','js/story_expedition_program.js','js/story_expedition_preparation.js',
  'js/home_authority.js','js/armies.js','js/fortifications.js','js/wars.js','js/federates.js','js/mods.js',
  'js/save.js','js/save_v4.js'
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
  await page.waitForFunction(function () {return window.FB && FB.game && FB.game.bootReady && FB.bookmark('1096').revision==='route_review_v1';});
  await beginBookmark(page,info,'1096','pilgrim_household_1096');
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

async function start(page,info,configuration) {
  await openGame(page,info);
  await importAndBegin(page,info,configuration);
  const inventory=await page.evaluate(function () {return corridorCase.inventory(FB.state);});
  await info.attach('complete-prospective-corridor-'+configuration.id,{body:Buffer.from(JSON.stringify(inventory,null,2)),contentType:'application/json'});
  return inventory;
}

async function completeImport(page,info,configuration) {
  const inventory=await start(page,info,configuration);
  const mod=await page.evaluate(buildCorridorMod,{configuration:configuration,countyIds:inventory.countyIds});
  await info.attach('complete-route-import-'+configuration.id,{body:Buffer.from(JSON.stringify(mod,null,2)),contentType:'application/json'});
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
  // These are acceptance assertions, never skip conditions or truncation rules.
  // An executed bound failure needs review of this complete attachment before
  // any new storage representation can be chosen.
  expect(inventory.requiredRecords,'Complete original county negotiation count exceeds the existing sixteen-county program').toBeLessThanOrEqual(16);
  expect(inventory.requiredRecords,'Complete original receipts exceed all available retained agreement slots').toBeLessThanOrEqual(inventory.availableRecords);
  expect(inventory.totalPrice).toBeLessThanOrEqual(configuration.treasury);
  await importAndBegin(page,info,configuration,inventory.countyIds);
  const actual=await page.evaluate(function () {return corridorCase.inventory(FB.state);});
  expect(actual.countyIds).toEqual(inventory.countyIds);
  expect(actual.legs).toEqual(inventory.legs);
  return actual;
}

for (const configuration of cases) {
  test(configuration.id+' complete actual corridor obtains original receipts, finite payments and strict retained saves',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
    const result=await page.evaluate(function (inventory) {
      const C=corridorCase,M=FB.mobile,E=FB.expeditionPrograms;
      const pending=C.restore(),money=FB.treasuryAvailable(FB.state,C.rid);
      const initial=JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population]),people=M.total(FB.state,C.rid),balances={};
      Object.keys(FB.state.realms).forEach(function (rid) {balances[rid]=FB.treasuryAvailable(FB.state,rid);});
      const q=E.review(FB.state,C.rid,'permission_0'),offered=E.commit(FB.state,q),offeredRestore=C.restore();C.next(FB.state);
      const response=E.review(FB.state,C.rid,'permission_0'),accepted=E.commit(FB.state,response),
        repeated=!E.commit(FB.state,response),acceptedRestore=C.restore();C.next(FB.state);
      const negotiated=C.negotiate(FB.state,true),s=FB.state,agreements=C.row(s).agreements,
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
      const omittedRow=C.row(missing),omitted=omittedRow.agreements.find(function (a) {return a.countyIds[0]===interior;});
      if (!omitted) throw new Error('The complete first leg must expose an intervening county for omission coverage');
      omittedRow.agreements=omittedRow.agreements.filter(function (a) {return a.id!==omitted.id;});
      omittedRow.expeditionProgram.steps[0].agreementIds=omittedRow.expeditionProgram.steps[0].agreementIds.filter(function (id) {return id!==omitted.id;});
      const missingBytes=JSON.stringify(missing),missingReview=E.review(missing,C.rid,'field_route'),
        omission=!C.covered(missing,inventory) && !missingReview.allowed && !E.commit(missing,missingReview) && missingBytes===JSON.stringify(missing);
      const broken=[function (r) {r.agreements.splice(0,1);},function (r) {r.agreements[0].accessOrigin.chain[0].personId='missing';},
        function (r) {r.agreements[0].accessOrigin.passagePolicy.response='decline';},
        function (r) {r.agreements[0].price++;},function (r) {r.expeditionProgram.schema=3;},
        function (r) {r.expeditionProgram.steps[0].agreementIds=[];},function (r) {r.agreements.push(C.copy(r.agreements[0]));}]
        .map(function (change) {const candidate=C.copy(FB.state);change(C.row(candidate));const before=JSON.stringify(candidate);
          let denied=false;try {M.validate(candidate);} catch (error) {denied=true;}return denied && before===JSON.stringify(candidate);});
      const cancelled=M.commit(FB.state,C.control(FB.state,'cancel')),cancelledRestore=C.restore();
      const row=C.row(FB.state),origins=JSON.stringify(row.agreements.map(function (a) {return a.accessOrigin;}));
      C.atTurn(FB.state,Math.max.apply(null,row.agreements.map(function (a) {return a.endTurn;})));FB.mobileDay(FB.state);
      const ended=C.row(FB.state).agreements,endedRestore=C.restore();
      const compaction=C.row(FB.state).agreements.every(function (a) {return a.accessOrigin.chain.every(function (p) {
        return FB.courtRecordRetained(FB.state,FB.state.chars[p.personId],{},{});
      });});
      return {pending:pending,offered:offered,offeredRestore:offeredRestore,accepted:accepted,repeated:repeated,
        acceptedRestore:acceptedRestore,complete:negotiated.complete,receipts:agreements.length,original:original,covered:covered,
        payment:Math.abs(money-FB.treasuryAvailable(FB.state,C.rid)-cost)<1e-8,
        credits:Object.keys(credits).every(function (rid) {return Math.abs(FB.treasuryAvailable(FB.state,rid)-balances[rid]-credits[rid])<1e-8;}),
        trace:negotiated.trace.filter(function (v) {return v.action==='accept';}).every(function (v) {
          return Math.abs(v.balances.debit-v.balances.price)<1e-8 && Math.abs(v.balances.credit-v.balances.price)<1e-8;}),
        conserved:initial===JSON.stringify([s.owner,s.holder,s.population]) && people===M.total(s,C.rid),retained:retained,
        supply:finiteSupply,controls:paused && pauseDenies && pauseRepeats && resumed,omission:omission,broken:broken,
        cancelled:cancelled,cancelledRestore:cancelledRestore,ended:ended.length===inventory.requiredRecords &&
          ended.every(function (a) {return a.status==='ended' && !M.provisioningAccess(FB.state,C.rid,a.countyIds[0]);}),
        origins:origins===JSON.stringify(ended.map(function (a) {return a.accessOrigin;})),compaction:compaction,endedRestore:endedRestore};
    },inventory);
    expect(result).toEqual({pending:true,offered:true,offeredRestore:true,accepted:true,repeated:true,acceptedRestore:true,
      complete:true,receipts:inventory.requiredRecords,original:true,covered:true,payment:true,credits:true,trace:true,
      conserved:true,retained:true,supply:true,controls:true,omission:true,broken:Array(7).fill(true),cancelled:true,cancelledRestore:true,
      ended:true,origins:true,compaction:true,endedRestore:true});
  });

  test(configuration.id+' every intended camp and field leg checks all permissions and actual bounded arrival',async function ({page},info) {
    const inventory=await completeImport(page,info,configuration);
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
        const plan=FB.armyOrderPlan(s,a,leg.target),whole=C.complete(plan,leg.origin,leg.target) &&
          [leg.origin].concat(plan.path).every(function (pid) {return M.passage(s,C.rid,pid,mode) && M.provisioningAccess(s,C.rid,pid);});
        const q=E.review(s,C.rid,stepId),issued=E.commit(s,q);
        FB.state=s;const inFlight=C.restore();const live=FB.state,host=M.host(live,C.rid),camp=M.migration(live,C.rid);
        const manual=C.copy(live),ma=M.host(manual,C.rid);ma.manual=true;ma.goal=leg.origin;ma.path=[];ma.moveLeft=0;
        E.reconcile(manual);const manualPreserved=ma.manual && ma.goal===leg.origin && C.row(manual).expeditionProgram.execution.paused;
        const stale=C.copy(live),first=plan.path[0],receipt=C.row(stale).agreements.find(function (a) {return a.countyIds[0]===first;});
        stale.chars[receipt.accessOrigin.chain[0].personId].captive=true;E.reconcile(stale);
        const stopped=M.host(stale,C.rid).path.length===0;
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
          arrived:arrived,completed:completed,cursor:cursor===leg.index+1,restored:C.restore()});
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
