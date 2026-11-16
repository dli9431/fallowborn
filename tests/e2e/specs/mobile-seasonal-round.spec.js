'use strict';
const path=require('path');
const {test,expect}=require('../support/fixture');
const {openGame,prepareGameContent}=require('../support/game/navigation');
const {startHistoricalGame}=require('../support/game/historical-start');
const {dependsOnRuntime}=require('../support/runtime-dependencies');
const examples={glassroad:require('../fixtures/authoring/mobile-seasonal-round-glassroad.json'),
  reedbank:require('../fixtures/authoring/mobile-seasonal-round-reedbank.json')};

test.describe.configure({mode:'parallel'});
dependsOnRuntime(__filename,['data/mobile_confederations.js','data/climate.js','js/climate.js','js/mobile_confederations.js',
  'js/mobile_command.js','js/mobile_camps.js','js/mobile_columns.js','js/expedition_programs.js','js/mods.js','js/schema.js',
  'js/ui_mobile.js','js/ui_misc.js','js/ui_modals.js','js/starts.js','js/main.js','js/bookmark_setup.js','js/federates.js',
  'js/governments.js','js/government_selection.js','js/authority.js','js/treasury.js','js/population.js','js/market.js',
  'js/armies.js','js/world.js','js/save.js','js/save_v4.js','js/model.js','js/ai_decisions.js','data/ai_decisions.js']);

async function start(page,info,kind,input) {
  await openGame(page,info);await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (data) {return FB.mods.validate(data);},input || examples[kind])).toEqual([]);
  await page.locator('#modfile').setInputFiles(input ? {name:'seasonal-round.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))} :
    path.resolve(__dirname,'../fixtures/authoring/mobile-seasonal-round-'+kind+'.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);await page.evaluate(function () {FB.ui.closeModal();FB.ui.showScreen('title');});
  const pref=kind==='glassroad' ? 'dune' : 'reed',name=kind==='glassroad' ? 'Sela_Vey' : 'Iri_Vale';
  if (await page.locator('#btn-choose-beginning').isVisible()) await page.locator('#btn-choose-beginning').click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();await page.locator('#ng-seed').fill('GROUNDS-'+pref+'_world-'+pref+'_leader_start-'+pref+'_well-f-'+name+'-standard');
  await page.locator('#ng-seed').press('Enter');await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.evaluate(function () {FB.game.start();FB.game.setPaused(true);FB.game.auto.hosts='manual';});
  await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,d=FB.campaignBookmark(s).realms.find(function (d) {return d.mobile;});
    window.roundCase={rid:d.id,definition:d,
      act:function (action,terms,actor) {return M.commit(FB.state,this.review(action,terms,actor));},
      review:function (action,terms,actor) {return M.review(FB.state,{realmId:this.rid,action:action,terms:terms,
        actor:actor || {kind:'character',id:M.row(FB.state,this.rid).leaderId}});},
      approve:function (terms) {
        if (!this.act('propose',{operation:'agreement',proposal:terms})) throw new Error('Ground proposal refused');
        M.members(FB.state,this.rid).forEach(function (m) {if (!roundCase.act('assent',{assent:true},m.principal)) throw new Error('Assent refused');});
        if (!this.act('offer',terms)) throw new Error('Ground offer refused');
        return M.row(FB.state,this.rid).agreements.slice(-1)[0];
      },
      checkpoint:function () {return JSON.stringify([FB.state,FB.getRngState(),FB.getUidCounter()]);},
      day:function () {
        const s=FB.state;s.turn++;s.date.day++;if (s.date.day>90) {s.date.day=1;s.date.season++;if (s.date.season>3) {s.date.season=0;s.date.year++;}}
        M.day(s);
      }};
  });
}

test('native and JSON grounds share a pure typed validator including candidate climate definitions and connected distances',async function ({page},info) {
  await openGame(page,info);await prepareGameContent(page);
  const result=await page.evaluate(function (input) {
    const before=FB.contentValues.canonical(FBDATA),rng=FB.getRngState(),uid=FB.getUidCounter();
    const edits=[function (p) {p.schema=2;},function (p) {p.travelFoodRate=0;},function (p) {p.grounds[0].capacity=-1;},
      function (p) {p.grounds[0].capacity=Infinity;},function (p) {p.grounds[1].id=p.grounds[0].id;},
      function (p) {p.grounds[1].countyId=p.grounds[0].countyId;},function (p) {p.grounds[0].climateZone='absent';},
      function (p) {p.grounds[0].seasonKinds=['winter'];},function (p) {p.grounds[0].neighbors[0].distanceDays=0;},
      function (p) {p.grounds[0].neighbors[0].groundId='absent';},function (p) {p.grounds[0].neighbors=[];},
      function (p) {p.grounds[0].access.capacity=0;},function (p) {p.grounds[0].access.duration=1441;},
      function (p) {p.grounds[0].offSeasonYield=2;},function (p) {p.grounds[0].countyId='absent';},
      function (p) {p.grounds[0].winterHerd=20;},function (p) {p.grounds[0].access=JSON.parse('{"capacity":1600,"price":3,"duration":90,"allowRecruit":false,"constructor":{}}');}];
    const bad=edits.map(function (edit) {const d=JSON.parse(JSON.stringify(input));edit(d.mobileProfiles.dune_compact.seasonalRound);return FB.mods.validate(d).length>0;});
    const candidate=JSON.parse(JSON.stringify(input));candidate.climateZones={fictional_cycle:{name:'Fictional cycle',seasons:['spring','hot_dry','autumn','cool_season']}};
    candidate.mobileProfiles.dune_compact.seasonalRound.grounds.forEach(function (g) {g.climateZone='fictional_cycle';});
    candidate.bookmarks.dune_world.climate.zone='fictional_cycle';
    return {native:FB.mobile.validateProfiles(),valid:FB.mods.validate(input),candidate:FB.mods.validate(candidate),bad:bad,
      technology:FBDATA.techImpactReviews.features.mobile_seasonal_round.mode,
      pure:before===FB.contentValues.canonical(FBDATA) && rng===FB.getRngState() && uid===FB.getUidCounter()};
  },examples.glassroad);
  expect(result).toEqual({native:[],valid:[],candidate:[],bad:Array(17).fill(true),technology:'none',pure:true});
});

for (const kind of Object.keys(examples)) test(kind+' daily grazing depletes the shared capacity once and off-season food follows its declared factor',async function ({page},info) {
  await start(page,info,kind);
  const result=await page.evaluate(function () {
    const X=roundCase,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),p=M.profile(s,rid),at=M.migration(s,rid).at;
    const first=M.roundPasture(s,rid,at),initial=X.checkpoint();M.roundSnapshot(s,rid);
    const pure=initial===X.checkpoint(),food=r.food,privateGold=s.player.gold,men=M.total(s,rid);
    X.day();const harvest=M.roundPasture(s,rid,at),once=X.checkpoint();M.day(s);
    const idempotent=once===X.checkpoint(),ration=r.members.reduce(function (n,m) {return n+m.civilians.reduce(function (n,c) {return n+c.count;},0)+m.reserve.reduce(function (n,c) {return n+c.count;},0);},0)*p.foodPerPerson;
    const foodExact=Math.abs(r.food-food-first.food+ration)<0.000001,used=s.mobilePastures.used[at];
    // Stage the nearly exhausted existing period; no extra agreement can refill it.
    const cap=harvest.capacity;s.mobilePastures.used[at]=cap-1;
    const last=M.roundPasture(s,rid,at);X.day();const exhausted=M.roundPasture(s,rid,at);
    const zeroFood=exhausted.food===0 && exhausted.remaining===0 && s.mobilePastures.used[at]===cap;
    // Keep the identical live stocks/rights while projecting another local season.
    const g=p.seasonalRound.grounds[0],zone=FBDATA.climateZones[g.climateZone];
    s.mobilePastures.used[at]=0;
    const suitedSeason=zone.seasons.indexOf(g.seasonKinds[0]),winter=zone.seasons.indexOf('winter'),
      otherSeason=winter>=0 ? winter : zone.seasons.findIndex(function (k) {return g.seasonKinds.indexOf(k)<0;});
    s.date.season=suitedSeason;const suited=M.roundPasture(s,rid,at);s.date.season=otherSeason;const off=M.roundPasture(s,rid,at);
    return {pure:pure,idempotent:idempotent,foodExact:foodExact,used:used,daily:first.usedCapacity,
      zeroFood:zeroFood,last:last.usedCapacity,climate:first.zone,kind:first.seasonKind,
      offKind:off.seasonKind,ratio:Math.abs(off.food-suited.food*g.offSeasonYield)<0.000001,lower:off.food<suited.food,
      private:s.player.gold===privateGold,people:M.total(s,rid)===men};
  });
  expect(result).toMatchObject({pure:true,idempotent:true,foodExact:true,zeroFood:true,last:1,ratio:true,lower:true,private:true,people:true});
  expect(result.used).toBe(result.daily);
  expect(result.climate).toBe(kind==='glassroad' ? 'arid' : 'southern_temperate');
  expect(result.kind).toBe(kind==='glassroad' ? 'cool_season' : 'summer');
  if (kind==='reedbank') expect(result.offKind).toBe('winter');
});

test('a refused ground leaves a real alternative with paid access, exact travel food, real arrivals and spent-stock restore',async function ({page},info) {
  await start(page,info,'glassroad');
  const departure=await page.evaluate(function () {
    const X=roundCase,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid),at=M.migration(s,rid).at;
    const denied=M.roundAccessTerms(s,rid,'pass_ground'),offer=X.approve(denied),cash=FB.treasuryAvailable(s,rid);
    const blocked=!X.review('round',{groundId:'pass_ground'}).review.allowed;
    const refused=X.act('decline',{agreementId:offer.id},{kind:'realm',id:offer.partnerId});
    const noPayment=FB.treasuryAvailable(s,rid)===cash;
    const terms=M.roundAccessTerms(s,rid,'flats_ground'),alternate=X.approve(terms),outside=FB.treasuryAvailable(s,terms.partnerId);
    const accepted=X.act('accept',{agreementId:alternate.id},{kind:'realm',id:alternate.partnerId});
    const paid=Math.abs(cash-FB.treasuryAvailable(s,rid)-terms.price)<0.000001 &&
      Math.abs(FB.treasuryAvailable(s,terms.partnerId)-outside-terms.price)<0.000001;
    const before=X.checkpoint(),q=X.review('round',{groundId:'flats_ground'}),pure=before===X.checkpoint();
    const field=host.mobileFood,food=r.food,privateGold=s.player.gold,committed=M.commit(s,q),after=X.checkpoint();
    return {blocked:blocked,refused:refused,noPayment:noPayment,accepted:accepted,paid:paid,pure:pure,
      allowed:q.review.allowed,committed:committed,repeat:!M.commit(s,q) && after===X.checkpoint(),
      food:Math.abs(food-r.food-q.review.round.food)<0.000001,field:field===host.mobileFood,private:privateGold===s.player.gold,
      days:q.review.days,clock:host.moveLeft,normal:FB.armyOrderPlan(s,Object.assign({},host,{path:[],moveLeft:0,goal:null}),q.review.stop).totalDays,
      campStill:M.migration(s,rid).at===at,carried:host.mobileCourt,valid:M.validate(s)};
  });
  expect(departure).toMatchObject({blocked:true,refused:true,noPayment:true,accepted:true,paid:true,pure:true,allowed:true,
    committed:true,repeat:true,food:true,field:true,private:true,campStill:true,carried:true,valid:true});
  expect(departure.days).toBeGreaterThanOrEqual(12);
  const arrival=await page.evaluate(function () {
    const X=roundCase,M=FB.mobile,s=FB.state,rid=X.rid,host=M.host(s,rid),target=host.goal;
    let days=0;
    while ((host.moveLeft>0 || host.path.length) && days<60) {
      X.day();FB.federatePrepareDay(s);FB.armyTick(s);FB.federateDay(s);days++;
    }
    const before=JSON.stringify([M.row(s,rid),M.migration(s,rid),M.host(s,rid),s.player.provinceId,s.player.gold,FB.getRngState(),FB.getUidCounter()]);
    FB.save.restore(JSON.parse(FB.save.serialize()));
    return {days:days,reached:M.migration(FB.state,rid).at===target && FB.state.player.provinceId===target,
      same:before===JSON.stringify([M.row(FB.state,rid),M.migration(FB.state,rid),M.host(FB.state,rid),FB.state.player.provinceId,FB.state.player.gold,FB.getRngState(),FB.getUidCounter()]),valid:M.validate(FB.state)};
  });
  expect(arrival).toMatchObject({reached:true,same:true,valid:true});
  expect(arrival.days).toBe(departure.days);
});

test('season reviews follow the actual calendar and stale access, food or shared-capacity quotes spend nothing',async function ({page},info) {
  await start(page,info,'glassroad');
  const result=await page.evaluate(function () {
    const X=roundCase,M=FB.mobile,s=FB.state,rid=X.rid,r=M.row(s,rid);
    const due=M.roundSnapshot(s,rid).due,reviewed=X.act('round',{groundId:'well_ground'}),notDue=!M.roundSnapshot(s,rid).due;
    for (let i=0;i<4;i++) X.day();
    const boundary=M.roundSnapshot(s,rid).due && s.date.season===0 && s.turn<90;
    const changes=[function () {r.food--;},function () {s.holder.dune_well='dune_gate';},
      function () {s.mobilePastures.used.dune_well++;},function () {M.migration(s,rid).sponsorship.schema=2;}];
    const valid=FB.save.serialize();
    const stale=changes.map(function (edit) {FB.save.restore(JSON.parse(valid));
      const current=FB.state,q=X.review('round',{groundId:'well_ground'});
      // Each edit acts on the current restored owner's exact corresponding fact.
      if (edit===changes[0]) M.row(current,rid).food--;
      else if (edit===changes[1]) current.holder.dune_well='dune_gate';
      else if (edit===changes[2]) current.mobilePastures.used.dune_well++;
      else M.migration(current,rid).sponsorship.schema=2;
      const before=X.checkpoint();return q.review.allowed && !M.commit(current,q) && before===X.checkpoint();
    });
    return {due:due,reviewed:reviewed,notDue:notDue,boundary:boundary,stale:stale};
  });
  expect(result).toEqual({due:true,reviewed:true,notDue:true,boundary:true,stale:[true,true,true,true]});
});

test('the elected AI uses the same ground quote and food cost and chooses an accessible alternative after refusal',async function ({page},info) {
  await start(page,info,'glassroad');
  const result=await page.evaluate(function () {
    const X=roundCase,s=FB.state,M=FB.mobile,rid=X.rid,r=M.row(s,rid),host=M.host(s,rid);
    const terms=M.roundAccessTerms(s,rid,'flats_ground'),offered=X.approve(terms);
    if (!X.act('accept',{agreementId:offered.id},{kind:'realm',id:offered.partnerId})) throw new Error('Access refused');
    const denied=X.approve(M.roundAccessTerms(s,rid,'pass_ground'));
    if (!X.act('decline',{agreementId:denied.id},{kind:'realm',id:denied.partnerId})) throw new Error('Refusal failed');
    // Move protagonist selection to the existing nonleader through a fresh ordinary opening.
    // The AI eligibility check depends on actual leadership, so stage a normal vacancy and election instead.
    FB.advanceRealmSuccession(s,rid,{cause:'vacancy'});const other=r.members[1].principal.id;
    r.members.forEach(function (m) {X.act('support',{candidateId:other},m.principal);});
    if (!X.act('select',{candidateId:other},r.members[1].principal)) throw new Error('Selection failed');
    // Seasonal choice: existing well is exhausted, refused pass has no right, flats remain accessible.
    s.mobilePastures={schema:1,period:0,used:{dune_well:1600}};
    const q=X.review('round',{groundId:'flats_ground'}),before=r.food,privateGold=s.player.gold;
    r.lastAI=-1;M.ai(s,rid);
    return {same:q.review.allowed && host.goal===q.review.stop && r.round.lastChoice.groundId==='flats_ground',
      exact:Math.abs(before-r.food-q.review.round.food)<0.000001,private:s.player.gold===privateGold,
      refused:denied.status==='ended',at:M.migration(s,rid).at==='dune_well',valid:M.validate(s)};
  });
  expect(result).toEqual({same:true,exact:true,private:true,refused:true,at:true,valid:true});
});

for (const width of [390,1280]) test('seasonal review keeps costs visible and restores input, disclosure, focus and scroll at width '+width,async function ({page},info) {
  await page.setViewportSize({width:width,height:820});await start(page,info,'glassroad');
  await page.evaluate(function () {FB.ui.showMobileConfederation(roundCase.rid);});
  await expect(page.locator('#gm-body')).toContainText('Review this season’s ground');
  const button=page.getByRole('button',{name:/^Review ground: Well grounds/});
  await expect(button).toBeEnabled();
  await page.locator('#mobile-count').fill('37');await page.locator('#mobile-count').dispatchEvent('change');
  const card=button.locator('xpath=ancestor::div[contains(@class,"review-action-card")]');
  const detail=card.locator('.settcard-info');
  if (width<1100) {await detail.click();await expect(detail).toHaveAttribute('aria-expanded','true');}
  else {
    await expect(detail).toBeHidden();await button.focus();
    await expect(page.locator('#tooltip')).toBeVisible();await expect(page.locator('#tooltip')).toContainText('Travel food surcharge');
  }
  await button.scrollIntoViewIfNeeded();
  const scroll=await page.locator('#gm-body').evaluate(function (node) {return node.scrollTop;});expect(scroll).toBeGreaterThan(0);
  const checkpoint=await page.evaluate(function () {return roundCase.checkpoint();});
  await button.click();await expect(page.locator('#gm-body')).toContainText('Travel food surcharge');
  await expect(page.locator('#gm-body')).toContainText('Daily pasture food at present');
  await page.keyboard.press('Escape');await expect(button).toBeFocused();
  await expect(page.locator('#mobile-count')).toHaveValue('37');
  if (width<1100) await expect(detail).toHaveAttribute('aria-expanded','true');
  else {await expect(page.locator('#tooltip')).toBeVisible();await expect(page.locator('#tooltip')).toContainText('Travel food surcharge');}
  expect(await page.locator('#gm-body').evaluate(function (node) {return node.scrollTop;})).toBeCloseTo(scroll,0);
  expect(await page.evaluate(function () {return roundCase.checkpoint();})).toBe(checkpoint);
  const before=await page.evaluate(function () {return [FB.mobile.row(FB.state,roundCase.rid).food,FB.state.player.gold];});
  await button.click();await page.locator('#mobile-confirm').click();await page.locator('#mobile-continue').click();
  await expect(button).toBeFocused();await expect(page.locator('#mobile-count')).toHaveValue('37');
  if (width<1100) await expect(detail).toHaveAttribute('aria-expanded','true');
  else {await expect(page.locator('#tooltip')).toBeVisible();await expect(page.locator('#tooltip')).toContainText('Travel food surcharge');}
  expect(await page.locator('#gm-body').evaluate(function (node) {return node.scrollTop;})).toBeCloseTo(scroll,0);
  expect(await page.evaluate(function () {return [FB.mobile.row(FB.state,roundCase.rid).food,FB.state.player.gold];})).toEqual(before);
  await expect(page.locator('#gm-body')).toContainText('Choice recorded this season');
});

for (const crazygames of [false,true]) test('native ground projections retain both explicit distribution paths: '+crazygames,async function ({page},info) {
  await startHistoricalGame(page,info,{bookmark:'476',code:'SEASONAL-476-mobile_household_476-cherson-m-Review-established'},crazygames);
  const result=await page.evaluate(function () {
    const s=FB.state,M=FB.mobile,rid='pontic_following_476',before=JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]),snapshot=M.roundSnapshot(s,rid);
    const pure=before===JSON.stringify([s,FB.getRngState(),FB.getUidCounter()]);
    FB.ui.showMobileConfederation(rid);
    return {grounds:snapshot.grounds.length,due:snapshot.due,pure:pure,
      zones:M.profile(s,rid).seasonalRound.grounds.map(function (g) {return g.climateZone;}),valid:M.validate(s)};
  });
  expect(result).toEqual({grounds:2,due:true,pure:true,zones:['northern_temperate','mediterranean'],valid:true});
  await expect(page.locator('#gm-body')).toContainText('Seasonal round');
});

test('an opted-in command program pays for a ground route once and completes only on actual arrival',async function ({page},info) {
  const input=JSON.parse(JSON.stringify(examples.glassroad)),b=input.bookmarks.dune_world,d=b.realms.find(function (d) {return d.mobile;}),t=d.mobile;
  input.governmentForms.dune_assembly.succession='retained_principal';
  input.governmentForms.dune_assembly.consent='command_consent';input.governmentForms.dune_assembly.revenue='command_receipts';
  t.command={id:'seasonal_mandate',superior:null,operations:['move','offer','accept','trade']};
  t.hostedAccess.countyIds=['dune_well','dune_flats'];
  t.expeditionProgram={schema:1,id:'seasonal_journey',commandId:'seasonal_mandate',steps:[{
    id:'spring_ground',after:[],window:{startTurn:0,endTurn:90},columnId:null,adapter:'seasonal_round',
    terms:{groundId:'flats_ground',countyId:'dune_flats'},requirements:{minMen:1,minFood:0,minTreasury:0,memberIds:[],access:{mode:'camp',countyIds:['dune_flats']}}}]};
  // This independent command uses the ordinary household start; protagonist-only coalition selectors remain elected.
  input.startScenarios=input.startScenarios.filter(function (s) {return !s.mobilePrincipal;});b.starts=['dune_household'];
  await openGame(page,info);await page.evaluate(function () {FB.ui.showMods();});
  expect(await page.evaluate(function (data) {return FB.mods.validate(data);},input)).toEqual([]);
  expect(await page.evaluate(function (data) {
    const before=JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()]);
    const invalid=[function (d) {d.mobileProfiles.dune_compact.seasonalRound.automate=false;},
      function (d) {d.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram.steps[0]=null;},
      function (d) {d.bookmarks.dune_world.realms.find(function (r) {return r.mobile;}).mobile.expeditionProgram.steps[0].terms.countyId='dune_pass';}
    ].map(function (edit) {const candidate=JSON.parse(JSON.stringify(data));edit(candidate);
      const b=candidate.bookmarks.dune_world,realm=b.realms.find(function (r) {return r.mobile;}),realms={};
      b.realms.forEach(function (r) {realms[r.id]=r;});
      return FB.mods.validate(candidate).length>0 && FB.expeditionPrograms.definitionFaults(realm,b.provinces,realms,candidate.mobileProfiles).length>0;
    });
    return {invalid:invalid,pure:before===JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter()])};
  },input)).toEqual({invalid:[true,true,true],pure:true});
  await page.locator('#modfile').setInputFiles({name:'seasonal-command.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);await prepareGameContent(page);
  expect(await page.evaluate(function () {return new Promise(function (resolve) {
    FB.activateBookmark('dune_world',null,function (error) {resolve(error ? error.message : null);});
  });})).toBe(null);
  const result=await page.evaluate(function () {
    FB.game.pending={seed:'SEASONALPROGRAM'};FB.game.startObserve();FB.game.setPaused(true);
    const s=FB.state,M=FB.mobile,E=FB.expeditionPrograms,rid='dune_coalition',r=M.row(s,rid),host=M.host(s,rid);
    const q=E.review(s,rid,'spring_ground'),before=r.food,committed=E.commit(s,q),paid=before-r.food;
    const pending=r.expeditionProgram.steps[0].status==='pending',ticket=r.expeditionProgram.execution.orders.length===1;
    const saved=FB.save.serialize();FB.save.restore(JSON.parse(saved));
    const v=FB.state,restored=M.row(v,rid),h=M.host(v,rid);E.reconcile(v);
    const inFlight=restored.expeditionProgram.execution.orders.length===1 && restored.food===before-paid;
    let days=0;
    while ((h.moveLeft || h.path.length) && days<60) {
      v.turn++;v.date.day++;if (v.date.day>90) {v.date.day=1;v.date.season++;if (v.date.season>3) {v.date.season=0;v.date.year++;}}
      M.day(v);FB.federatePrepareDay(v);FB.armyTick(v);FB.federateDay(v);days++;
    }
    // Programs dispatch before army movement. Arrival is observed at the next ordinary daily boundary.
    v.turn++;v.date.day++;if (v.date.day>90) {v.date.day=1;v.date.season++;if (v.date.season>3) {v.date.season=0;v.date.year++;}}
    M.day(v);
    return {allowed:q.allowed,committed:committed,paid:paid===q.operation.review.round.food && paid>0,pending:pending,ticket:ticket,
      inFlight:inFlight,reached:M.migration(v,rid).at==='dune_flats',status:restored.expeditionProgram.status,valid:M.validate(v),days:days};
  });
  expect(result).toMatchObject({allowed:true,committed:true,paid:true,pending:true,ticket:true,inFlight:true,reached:true,status:'complete',valid:true});
  expect(result.days).toBeGreaterThanOrEqual(12);
});
