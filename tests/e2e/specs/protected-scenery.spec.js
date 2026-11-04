'use strict';
const path = require('path');
const {test, expect} = require('../support/fixture');
const {openGame, prepareGameContent} = require('../support/game/navigation');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const valley = require('../fixtures/protected-scenery/valley.json');

dependsOnRuntime(__filename, ['js/world.js','js/actions.js','js/travel.js',
  'js/mods.js','js/save.js','js/save_v4.js','js/main.js','js/ui_modals.js',
  'js/population.js','js/market.js','js/settlement.js','js/treasury.js',
  'js/events.js','js/lordships.js','js/governments.js',
  'data/technology.js','data/travel.js','data/events_travel.js',
  'data/bookmark_634.js','data/bookmark_634_scaffold_a.js',
  'data/bookmark_634_scaffold_b.js','data/bookmark_634_scaffold_c.js',
  'data/bookmark_634_scaffold_d.js','data/geography_expansion.js']);

async function importValley(page, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (mod) { return FB.mods.validate(mod); }, valley)).toEqual([]);
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.resolve(__dirname,
    '../fixtures/protected-scenery/valley.json'));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),
    page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
  await beginBookmarkFromTitle(page, 'valley_world', 'valley_farmer');
  await installProbe(page);
}

async function installProbe(page) {
  await page.evaluate(function () {
    window.sceneryTest = {
      snapshot:function () {
        return {data:FBDATA, state:FB.state, world:FB.world, active:FB.activeBookmark,
          value:JSON.stringify([FBDATA,FB.state,FB.getRngState(),FB.getUidCounter(),
            FB.world && [FB.world.provs,FB.world.sites,FB.world.sitesByProv,FB.world.sitesRender],
            FB.englishMessages(),FB.stories.list(),localStorage,FB.mods.sig()])};
      },
      same:function (before) {
        const after = this.snapshot();
        return before.data === after.data && before.state === after.state &&
          before.world === after.world && before.active === after.active && before.value === after.value;
      },
      stage:function (pid) {
        const s = FB.state;
        s.player.tier = 1; s.player.gold = 5000; s.player.prestige = 500;
        if (!FB.travelStart(s, 'frontier', pid, null)) throw new Error('Missing frontier departure');
        s.player.travel.remainingRoute = []; s.player.travel.legDaysLeft = 0;
        FB.travelTick(s);
        const item = s.eventQueue.find(function (row) { return row.id === 'travel_capstone_frontier'; });
        const event = FB.eventById(item.id);
        FB.resolveEventOption(s, event, event.options[0], item.ctx, {automated:false});
        // Stage residence and genuine work counters, with no daily journey.
        s.turn += FBDATA.balance.travelSettleOfferDays;
        for (let i = 0; i < FBDATA.balance.frontierMilestonesRequired; i++) FB.fns.frontier_milestone(s);
        if (FB.frontierSettlementEligible(s) !== true) throw new Error('Homestead was not ready');
      },
      load:function (data) {
        return new Promise(function (resolve, reject) {
          if (FB.game.loadData(data, resolve) === false) reject(FB.game.lastLoadError);
        });
      }
    };
  });
}

test('detached full-map protection preserves 506 inhabited declarations and protects all 21 scenic remnants', async function ({page}, info) {
  await openGame(page, info);
  await installProbe(page);
  const declared = await page.evaluate(function () {
    const source = JSON.parse(JSON.stringify(FBDATA.bookmarks['634']));
    const original = JSON.stringify(source), inhabited = source.provinces.filter(function (p) { return !p.wasteland; });
    const protectedRows = source.provinces.map(function (p) {
      return p.wasteland ? Object.assign({}, p, {settlementPolicy:'protected'}) : p;
    });
    source.revisions = {baseline:{provinces:source.provinces}, scenic_review:{provinces:protectedRows}};
    source.revision = 'scenic_review';
    const before = sceneryTest.snapshot();
    const faults = FB.mods.validate({bookmarks:{'634':source}});
    const pure = sceneryTest.same(before);
    FB.mods.apply({bookmarks:{'634':source}});
    const effective = FB.bookmark('634'), baseline = FB.bookmark('634','baseline');
    return {faults:faults,pure:pure,protected:effective.provinces.filter(function (p) { return p.settlementPolicy === 'protected'; }).length,
      inhabited:inhabited.length, sameInhabited:JSON.stringify(effective.provinces.filter(function (p) { return !p.wasteland; })) === JSON.stringify(inhabited),
      baselineUnchanged:JSON.stringify(baseline.provinces) === JSON.stringify(JSON.parse(original).provinces),
      mode:FBDATA.techImpactReviews.features.scenic_settlement_protection.mode};
  });
  expect(declared).toMatchObject({faults:[],pure:true,protected:21,inhabited:506,sameInhabited:true,baselineUnchanged:true,mode:'none'});
  await beginBookmarkFromTitle(page, '634', 'farmer_634');
  const blocked = await page.evaluate(function () {
    const s = FB.state, scenic = FB.world.provs.filter(function (p) { return p.settlementPolicy === 'protected'; });
    const matching = JSON.parse(FB.save.serialize());
    s.player.gold = 5000; s.player.prestige = 500;
    s.player.tier = 1;
    const frontier = FB.travelDestinations(s, 'frontier');
    s.player.tier = 4;
    s.player.provs = FB.world.provs.filter(function (p) { return !p.wasteland; }).map(function (p) { return p.id; });
    const noble = FB.wastelandCandidates(s);
    const before = sceneryTest.snapshot();
    let direct = true;
    scenic.forEach(function (p) {
      direct = direct && !FB.materializeWasteland(s, p.id, {holderId:'player',ownerId:'player'});
      FB.settleWaste(s, p.id);
    });
    const pure = sceneryTest.same(before), converted = Object.keys(s.wastelandSettlements).length;
    FB.save.restore(matching);
    const savedFacts = JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,FB.state.market,
      FB.state.wastelandSettlements,FB.state.chars,FB.state.player.gold,FB.state.log,FB.getRngState(),FB.getUidCounter()]);
    FB.save.restore(matching);
    const repeated = savedFacts === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population,FB.state.market,
      FB.state.wastelandSettlements,FB.state.chars,FB.state.player.gold,FB.state.log,FB.getRngState(),FB.getUidCounter()]);
    const impossible = JSON.parse(JSON.stringify(matching));
    impossible.state.wastelandSettlements[scenic[0].id] = {culture:'norse',religion:'norse_pagan'};
    const preflightBefore = sceneryTest.snapshot();
    let rejected = false;
    try { FB.save.restore(impossible); } catch (error) { rejected = /protected scenic region/.test(error.message); }
    return {frontier:frontier.length,noble:noble.length,direct:direct,pure:pure,converted:converted,
      repeated:repeated,rejected:rejected,rejectionPure:sceneryTest.same(preflightBefore)};
  });
  expect(blocked).toEqual({frontier:0,noble:0,direct:true,pure:true,converted:0,repeated:true,rejected:true,rejectionPure:true});
  await page.evaluate(function () { FB.ui.showTravelDestinations('frontier'); });
  await expect(page.locator('#toasts')).toContainText('Protected scenic regions cannot become counties');
});

test('full-map retained ordinary quotes become stale before any settlement mutation', async function ({page}, info) {
  await openGame(page, info);
  await beginBookmarkFromTitle(page, '634', 'farmer_634');
  await installProbe(page);
  const result = await page.evaluate(function () {
    const s = FB.state; s.player.gold = 5000; s.player.prestige = 500;
    const empty = JSON.parse(FB.save.serialize());
    const choice = FB.travelDestinations(s, 'frontier')[0];
    sceneryTest.stage(choice.destinationId);
    const pr = FB.world.byId[choice.destinationId];
    s.player.provs = [choice.gatewayId];
    const quoted = FB.wastelandCandidates(s).indexOf(pr.id) >= 0;
    pr.settlementPolicy = 'protected';
    const before = sceneryTest.snapshot();
    const reason = FB.frontierSettlementEligible(s), commoner = FB.frontierSettle(s);
    FB.settleWaste(s, pr.id);
    const materialized = FB.materializeWasteland(s, pr.id, {holderId:s.holder[choice.gatewayId],ownerId:s.owner[choice.gatewayId]});
    const candidates = FB.wastelandCandidates(s).indexOf(pr.id), pure = sceneryTest.same(before);
    delete pr.settlementPolicy;
    const ordinaryCommoner = FB.frontierSettle(s);
    const commonerSave = JSON.parse(FB.save.serialize());
    FB.save.restore(empty);
    FB.state.player.tier = 4;
    const gold = FB.state.player.gold, prestige = FB.state.player.prestige;
    FB.settleWaste(FB.state,pr.id);
    const nobleConverted = !FB.world.byId[pr.id].wasteland;
    const nobleCosts = [gold - FB.state.player.gold,prestige - FB.state.player.prestige];
    FB.save.restore(commonerSave);
    return {quoted:quoted,reason:reason,commoner:commoner,materialized:materialized,
      candidates:candidates,pure:pure,ordinaryCommoner:ordinaryCommoner,nobleConverted:nobleConverted,nobleCosts:nobleCosts,
      matching:FB.state.player.provinceId === pr.id && !FB.world.byId[pr.id].wasteland &&
        FB.landPlots(FB.state).filter(function (p) { return p.provinceId === pr.id; }).length === 1};
  });
  expect(result).toMatchObject({quoted:true,commoner:false,materialized:null,candidates:-1,pure:true,
    ordinaryCommoner:true,nobleConverted:true,nobleCosts:[250,50],matching:true});
  expect(result.reason).toContain('protected');
});

test('ordinary JSON import consumes both policies and keeps the inhabited road and localized affordances', async function ({page}, info) {
  await importValley(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state;
    s.player.provs = ['valley_home','valley_market']; s.player.gold = 5000;
    const before = sceneryTest.snapshot();
    const frontier = FB.travelDestinations(s, 'frontier').map(function (row) { return row.destinationId; });
    const noble = FB.wastelandCandidates(s);
    const route = FB.travelRoute('valley_home','valley_market');
    const protectedStart = FB.travelStart(s,'frontier','valley_scenery',null);
    const npc = {holderId:'valley_court',ownerId:'valley_court'};
    const protectedDirect = FB.materializeWasteland(s,'valley_scenery',npc);
    FB.settleWaste(s,'valley_scenery');
    return {frontier:frontier,noble:noble,route:route,protectedStart:protectedStart,
      protectedDirect:protectedDirect,pure:sceneryTest.same(before),
      policy:FB.activeBookmark.provinces.find(function (p) { return p.id === 'valley_scenery'; }).settlementPolicy};
  });
  expect(result).toEqual({frontier:['valley_frontier'],noble:['valley_frontier'],route:['valley_market'],
    protectedStart:false,protectedDirect:null,pure:true,policy:'protected'});
  await page.evaluate(function () { FB.ui.showTravelDestinations('frontier'); });
  await expect(page.locator('#travel-picker-summary')).toContainText('Protected scenic regions');
  await expect(page.locator('#travel-picker-summary')).toContainText('does not imply that they are uninhabited');
  await page.locator('#travel-picker-cancel').click();
  await page.evaluate(function () { FB.ui.showSettleWaste(); });
  await expect(page.locator('#genmodal')).toContainText('Protected scenic regions cannot become counties');
  await expect(page.locator('[data-pid="valley_scenery"]')).toHaveCount(0);
  await expect(page.locator('[data-pid="valley_frontier"]')).toHaveCount(1);
});

for (const mode of ['noble','commoner','shared']) {
  test('imported ordinary anchor supports ' + mode + ' settlement and matching repeat restore', async function ({page}, info) {
    await importValley(page, info);
    const result = await page.evaluate(function (mode) {
      const s = FB.state, pid = 'valley_frontier';
      s.player.gold = 5000; s.player.prestige = 500;
      if (mode === 'noble') {
        // Stage the actual realm, not only a higher household station.
        s.player.provs = ['valley_home'];
        FB.setPlayerTier(s,4,{attachLiege:false,stationFarewell:false});
        FB.foundPlayerRealm(s);
      }
      const empty = JSON.parse(FB.save.serialize());
      const gold = s.player.gold, prestige = s.player.prestige;
      const holder = s.holder.valley_home, owner = s.owner.valley_home;
      if (mode === 'commoner') { sceneryTest.stage(pid); if (!FB.frontierSettle(s)) throw new Error('Failed homestead'); }
      else if (mode === 'noble') FB.settleWaste(s,pid);
      else if (!FB.materializeWasteland(s,pid,{holderId:holder,ownerId:owner})) throw new Error('Failed shared conversion');
      const saved = JSON.parse(FB.save.serialize());
      function facts() {
        const state = FB.state;
        return JSON.stringify([state.wastelandSettlements,state.owner,state.holder,state.dev,state.population,
          state.market,state.player.gold,state.player.prestige,state.player.land,state.player.provinceId,
          state.log,FB.world.sitesByProv[pid],FB.getRngState(),FB.getUidCounter()]);
      }
      const before = facts();
      let stable = true;
      for (let i = 0; i < 3; i++) {
        FB.save.restore(empty);
        stable = stable && FB.world.byId[pid].wasteland && !FB.world.sitesByProv[pid];
        FB.save.restore(saved);
        FB.restoreWastelandSettlements(FB.state);
        stable = stable && before === facts() && FB.world.byId.valley_scenery.wasteland;
      }
      return {stable:stable,converted:!FB.world.byId[pid].wasteland,
        holder:FB.state.holder[pid],expectedHolder:mode === 'noble' ? 'player' : holder,
        owner:FB.state.owner[pid],expectedOwner:mode === 'noble' ? FB.playerRealmId(FB.state) : owner,
        plots:FB.landPlots(FB.state).filter(function (p) { return p.provinceId === pid; }).length,
        home:FB.state.player.provinceId,goldSpent:gold - FB.state.player.gold,prestigeSpent:prestige - FB.state.player.prestige,
        signature:saved.mods === FB.mods.sig()};
    }, mode);
    expect(result).toMatchObject({stable:true,converted:true,signature:true});
    expect(result.holder).toBe(result.expectedHolder);
    expect(result.owner).toBe(result.expectedOwner);
    expect(result.plots).toBe(mode === 'commoner' ? 1 : 0);
    expect(result.home).toBe(mode === 'commoner' ? 'valley_frontier' : 'valley_home');
    if (mode !== 'commoner') expect([result.goldSpent,result.prestigeSpent]).toEqual(mode === 'noble' ? [250,50] : [0,0]);
  });
}

test('stale imported frontier departure and arrived confirmation consume no resources', async function ({page}, info) {
  await importValley(page, info);
  const result = await page.evaluate(function () {
    const s = FB.state, pr = FB.world.byId.valley_frontier;
    s.player.gold = 5000;
    const quote = FB.travelDestinations(s,'frontier')[0];
    pr.settlementPolicy = 'protected';
    let before = sceneryTest.snapshot();
    const start = FB.travelStart(s,'frontier',quote.destinationId,null), startPure = sceneryTest.same(before);
    pr.settlementPolicy = 'ordinary'; sceneryTest.stage(pr.id);
    pr.settlementPolicy = 'protected';
    before = sceneryTest.snapshot();
    const settled = FB.frontierSettle(s);
    FB.settleWaste(s,pr.id);
    const direct = FB.materializeWasteland(s,pr.id,{holderId:'valley_court',ownerId:'valley_court'});
    return {start:start,startPure:startPure,settled:settled,direct:direct,pure:sceneryTest.same(before)};
  });
  expect(result).toEqual({start:false,startPure:true,settled:false,direct:null,pure:true});
});

for (const invalid of [null,true,0,'forbidden','PROTECTED','inhabited']) {
  test('detached import rejects settlement policy ' + String(invalid) + ' without publication', async function ({page}, info) {
    await openGame(page, info);
    await installProbe(page);
    const result = await page.evaluate(function (args) {
      const candidate = args.mod.bookmarks.valley_world;
      const row = candidate.revisions.protected_v1.provinces[args.invalid === 'inhabited' ? 0 : 2];
      row.settlementPolicy = args.invalid === 'inhabited' ? 'protected' : args.invalid;
      const input = JSON.stringify(args.mod), before = sceneryTest.snapshot();
      const faults = FB.mods.validate(args.mod);
      let rejected = false;
      try { FB.mods.apply(args.mod); } catch (error) { rejected = /settlementPolicy/.test(error.message); }
      return {faults:faults,rejected:rejected,pure:sceneryTest.same(before),input:input === JSON.stringify(args.mod)};
    }, {mod:valley,invalid:invalid});
    expect(result.faults.join(' ')).toContain('settlementPolicy');
    expect(result).toMatchObject({rejected:true,pure:true,input:true});
  });
}

test('protected conversion saves reject before direct or ordinary load adoption, including legacy inference', async function ({page}, info) {
  await importValley(page, info);
  const result = await page.evaluate(function () {
    const valid = JSON.parse(FB.save.serialize()), out = [];
    ['record','legacy','explicit-empty'].forEach(function (kind) {
      const saved = JSON.parse(JSON.stringify(valid)), s = saved.state, pid = 'valley_scenery';
      if (kind === 'record') s.wastelandSettlements[pid] = {culture:'norse',religion:'valley_custom'};
      else {
        if (kind === 'legacy') delete s.wastelandSettlements;
        s.dev[pid] = 1; s.holder[pid] = 'valley_court'; s.owner[pid] = 'valley_court';
      }
      const input = JSON.stringify(saved), before = sceneryTest.snapshot();
      let preflight = false, direct = false, repair = false;
      try { FB.save.v4.migrate(saved); } catch (error) { preflight = /protected scenic region/.test(error.message); }
      try { FB.save.restore(saved); } catch (error) { direct = /protected scenic region/.test(error.message); }
      try { FB.restoreWastelandSettlements(s); } catch (error) { repair = /protected scenic region/.test(error.message); }
      const loaded = FB.game.loadData(saved);
      out.push({kind:kind,preflight:preflight,direct:direct,repair:repair,loaded:loaded,
        pure:sceneryTest.same(before),input:input === JSON.stringify(saved)});
    });
    return out;
  });
  expect(result).toEqual(['record','legacy','explicit-empty'].map(function (kind) {
    return {kind:kind,preflight:true,direct:true,repair:true,loaded:false,pure:true,input:true};
  }));
});

test('policy and no-policy revisions repeatedly restore their own maps, conversions and exact fingerprints', async function ({page}, info) {
  await importValley(page, info);
  const result = await page.evaluate(async function (mod) {
    const protectedSave = JSON.parse(FB.save.serialize());
    await new Promise(function (resolve, reject) {
      FB.activateBookmark('valley_world',null,function (error) { if (error) reject(error); else resolve(); },{revision:'baseline'});
    });
    const ordinarySave = JSON.parse(JSON.stringify(protectedSave));
    ordinarySave.state.start.revision = 'baseline';
    FB.save.restore(ordinarySave);
    FB.settleWaste(FB.state,'valley_scenery');
    const converted = JSON.parse(FB.save.serialize()), legacy = JSON.parse(JSON.stringify(converted));
    delete legacy.state.wastelandSettlements;
    const baselineRows = JSON.stringify(FB.bookmark('valley_world','baseline').provinces);
    let stable = true;
    for (let i = 0; i < 3; i++) {
      await sceneryTest.load(protectedSave);
      stable = stable && FB.world.byId.valley_scenery.wasteland &&
        FB.world.byId.valley_scenery.settlementPolicy === 'protected' &&
        !FB.world.sitesByProv.valley_scenery && FB.travelRoute('valley_home','valley_market').length === 1;
      await sceneryTest.load(i % 2 ? legacy : converted);
      stable = stable && !FB.world.byId.valley_scenery.wasteland &&
        !Object.prototype.hasOwnProperty.call(FB.world.byId.valley_scenery,'settlementPolicy') &&
        !!FB.world.sitesByProv.valley_scenery && !!FB.state.wastelandSettlements.valley_scenery;
    }
    const before = sceneryTest.snapshot(), baselineIdentity = FB.mods.fingerprint(FB.bookmark('valley_world','baseline'));
    FB.validateWastelandSettlements(legacy.state,FB.bookmark('valley_world','baseline'));
    const pure = sceneryTest.same(before);
    const originalSig = FB.mods.sig();
    mod.bookmarks.valley_world.revisions.protected_v1.provinces[2].settlementPolicy = 'ordinary';
    FB.mods.apply(mod);
    const changed = FB.mods.sig() !== originalSig;
    let incompatible = false;
    try { FB.save.v4.migrate(protectedSave); } catch (error) { incompatible = /different mod set/.test(error.message); }
    return {stable:stable,pure:pure,changed:changed,incompatible:incompatible,
      baselineUnchanged:baselineRows === JSON.stringify(FB.bookmark('valley_world','baseline').provinces) &&
        baselineIdentity === FB.mods.fingerprint(FB.bookmark('valley_world','baseline'))};
  }, valley);
  expect(result).toEqual({stable:true,pure:true,changed:true,incompatible:true,baselineUnchanged:true});
});
