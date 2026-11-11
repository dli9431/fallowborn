'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,prepareGameContent} = require('../support/game/navigation');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {beginBookmarkFromTitle} = require('../support/game/bookmark-acceptance');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {installPageGuards} = require('../support/page-contract');
const fixtureRoot = path.resolve(__dirname,'../fixtures/634-scenery-revisions');
const {routeEagerDocument,manifestRuns,manifestFiles} = require('../fixtures/bookmark-manifest/eager-document');
const currentStarts = ['farmer_634','craftsman_634','ctesiphon_household_634','umar_634','heraclius_634',
  'damascus_household_634','frontier_household_634','medina_household_634'];
const scenic = {
  scenery_a:['w_sahara_w','w_sahara_c','w_sahara_e','w_sahel','w_nubia','w_arabia'],
  scenery_b:['w_nefud','w_syrian','w_kavir','w_lut','w_registan','w_hindukush'],
  scenery_c:['w_sulaiman','w_thar','w_karakum','w_kyzylkum','w_steppe_e'],
  scenery_d:['w_ural','w_taiga','w_north','w_lapland']
};
const scenicIds = Object.values(scenic).flat();

dependsOnRuntime(__filename,['data/bookmark_manifest.js','index.html','data/bookmark_634.js','data/bookmark_634_scaffold_a.js',
  'data/bookmark_634_scaffold_b.js','data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/bookmark_sources.js','js/bookmark_sources.js','js/bookmark_composition.js','js/mods.js',
  'js/main.js','js/world.js','js/actions.js','js/travel.js','js/save.js','js/save_v4.js',
  'js/starts.js','js/stories.js','js/settlement.js','js/population.js','js/market.js','js/events.js',
  'js/treasury.js','js/governments.js','js/ui_modals.js','js/crazygames.js',
  'data/bookmark_634_identities.js','data/starts_634_ordinary.js','data/starts_634_rulers.js',
  'data/starts_634_ctesiphon.js','data/starts_634_damascus.js','data/starts_634_frontier.js','data/starts_634_medina.js',
  'data/story_ruler_agendas_634.js','data/story_households_634_ctesiphon.js','data/story_households_634_damascus.js',
  'data/story_households_634_frontier.js','data/story_households_634_medina.js',
  'data/geographies.js','data/geography_expansion.js','data/travel.js','data/events_travel.js',
  'data/technology.js','data/distribution_crazygames.js'].concat(manifestFiles(manifestRuns(fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_manifest.js'),'utf8')))
  .filter(function (file) { return /634/.test(file); })));

test('current 634 catalogue preserves exact world revisions and matching saves',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const before=JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()]);
    const worlds=FB.bookmarkRevisions('634');
    return {revisions:worlds.map(function (b) { return b.revision; }),
      counts:worlds.map(function (b) { return [b.provinces.length,b.realms.length]; }),
      faults:worlds.map(function (b) { return FB.validateBookmark(b); }),fullHidden:FB.bookmark('634','core_courts_v4').hidden,
      pure:before===JSON.stringify([FBDATA,FB.getRngState(),FB.getUidCounter()])};
  })).toEqual({revisions:['baseline','scenery_protected_v1','ordinary_settlement_v2','core_identities_v3','core_courts_v4'],
    counts:Array(5).fill([527,122]),faults:Array(5).fill([]),fullHidden:true,pure:true});
  await begin634(page);
  await load(page,JSON.parse(await page.evaluate(function () { return FB.save.serialize(); })));
  await page.evaluate(function () { FB.state.player.gold-=3; });
  const saved=await page.evaluate(function () { return FB.save.serialize(); });
  await load(page,JSON.parse(saved));
  const restored=await page.evaluate(function () { return FB.save.serialize(); });
  expect(restored).toBe(saved);
  await load(page,JSON.parse(restored));
  expect(await page.evaluate(function () { return FB.save.serialize(); })).toBe(restored);
});

test('complete current 634 catalogue matches manifest and eager preparation exactly',async function ({page,browser},info) {
  const context=await browser.newContext(),eager=await context.newPage(),guard=installPageGuards(eager);
  async function projection(target) {
    await prepareGameContent(target);
    return target.evaluate(function () {
      return {roots:FB.mods.retainedCatalogueRoots(),starts:FBDATA.startScenarios.map(function (r) { return r.id; }),
        stories:Object.keys(FBDATA.storyInstances),registry:FB.stories.list().map(function (r) { return r.id; })};
    });
  }
  try {
    await routeEagerDocument(eager);
    await Promise.all([openGame(page,info),openGame(eager,info)]);
    expect(await projection(page)).toEqual(await projection(eager));
  } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
});

async function openEdition(page,info,crazy) {
  if (crazy) {
    await mockCrazyGames(page);
    await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
    });
    await openCrazyGame(page,info);
  } else await openGame(page,info);
}

async function begin634(page,revision) {
  const original = await page.evaluate(function (revision) {
    const raw = FBDATA.bookmarks['634'], original = raw.revision;
    if (revision) raw.revision = revision;
    return original;
  },revision);
  await beginBookmarkFromTitle(page,'634','farmer_634');
  // The leaf journey temporarily adds a review visibility field. Return the
  // native catalogue to its exact authored shape before compatibility proofs.
  await page.evaluate(function (original) {
    delete FBDATA.bookmarks['634'].hidden;
    FBDATA.bookmarks['634'].revision = original;
  },original);
}

async function load(page,save) {
  await page.evaluate(function (data) {
    window.__scenicLoaded = false;
    if (FB.game.loadData(data,function () { FB.game.setPaused(true); window.__scenicLoaded = true; }) === false)
      throw FB.game.lastLoadError;
  },save);
  await page.waitForFunction(function () { return window.__scenicLoaded; });
}

async function installProbe(page) {
  await page.evaluate(function () {
    window.scenicSnapshot = function () {
      return {data:FBDATA,state:FB.state,world:FB.world,active:FB.activeBookmark,registry:FB.stories.list(),
        text:JSON.stringify([FBDATA,FB.state,FB.world && [FB.world.provs,FB.world.sites,FB.world.sitesByProv],
          FB.getRngState(),FB.getUidCounter(),FB.englishMessages(),localStorage,FB.mods.sig()])};
    };
    window.scenicSame = function (before) {
      const after = scenicSnapshot();
      return before.data === after.data && before.state === after.state && before.world === after.world &&
        before.active === after.active && before.text === after.text &&
        before.registry.every(function (row,i) { return row === after.registry[i]; });
    };
  });
}

for (const crazy of [false,true]) {
  test('retained protected 634 preserves every retained declaration and start on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    await openEdition(page,info,crazy);
    const result = await page.evaluate(function (input) {
      const raw = FBDATA.bookmarks['634'], baseline = FB.bookmark('634','baseline'), fresh = FB.bookmark('634','scenery_protected_v1');
      const before = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
      const retained = Object.assign({},baseline), projection = Object.assign({},fresh);
      delete retained.revision; delete projection.revision; delete retained.provinces; delete projection.provinces;
      const starts = FBDATA.startScenarios.filter(function (row) { return (row.bookmarkIds || []).indexOf('634') >= 0; });
      return {revision:fresh.revision,revisions:Object.keys(raw.revisions),baseline:raw.revisions.baseline,
        fullHidden:FB.bookmark('634','core_courts_v4').hidden,otherFields:JSON.stringify(retained) === JSON.stringify(projection),
        fields:Object.keys(raw.revisions.scenery_protected_v1),
        sourceIds:Object.keys(input.scenic).map(function (key) { return FBDATA.bookmarkRegions634[key].provinces.map(function (row) { return row.id; }); }),
        pristineSources:Object.keys(input.scenic).every(function (key) { return FBDATA.bookmarkRegions634[key].provinces.every(function (row) { return !Object.prototype.hasOwnProperty.call(row,'settlementPolicy'); }); }),
        protected:fresh.provinces.filter(function (row) { return row.settlementPolicy === 'protected'; }).map(function (row) { return row.id; }),
        inhabited:fresh.provinces.filter(function (row) { return !row.wasteland; }).length,
        exactRows:fresh.provinces.length === baseline.provinces.length && fresh.provinces.every(function (row,i) {
          const old = baseline.provinces[i];
          return JSON.stringify(row) === JSON.stringify(old.wasteland ? Object.assign({},old,{settlementPolicy:'protected'}) : old);
        }),
        starts:starts.map(function (row) {
          const a = FB.startRequirementReport(row,baseline), b = FB.startRequirementReport(row,fresh);
          return {id:row.id,valid:a.valid && b.valid,applicable:a.applicable === b.applicable,
            locations:JSON.stringify(baseline.startLocations[row.id]) === JSON.stringify(fresh.startLocations[row.id])};
        }),faults:[FB.validateBookmark(baseline),FB.validateBookmark(fresh)],
        pure:before === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },{scenic:scenic});
    expect(result).toEqual({revision:'scenery_protected_v1',revisions:['baseline','scenery_protected_v1','ordinary_settlement_v2','core_identities_v3','core_courts_v4'],baseline:{},fullHidden:true,
      otherFields:true,fields:['provinces'],sourceIds:Object.values(scenic),pristineSources:true,protected:scenicIds,
      inhabited:506,exactRows:true,starts:currentStarts.map(function (id) { return {id:id,valid:true,applicable:true,locations:true}; }),
      faults:[[],[]],pure:true});
    await begin634(page,'scenery_protected_v1');
    await installProbe(page);
    const routes = await page.evaluate(function (ids) {
      const s = FB.state;
      s.player.gold = 5000; s.player.prestige = 500;
      const matching = JSON.parse(FB.save.serialize());
      const route = FB.travelRoute('medina','mecca');
      const frontier = FB.travelDestinations(s,'frontier');
      let before = scenicSnapshot();
      const departures = ids.map(function (id) { return FB.travelStart(s,'frontier',id,null); });
      const departurePure = scenicSame(before);
      s.player.tier = 4; s.player.provs = FB.world.provs.filter(function (row) { return !row.wasteland; }).map(function (row) { return row.id; });
      const noble = FB.wastelandCandidates(s);
      before = scenicSnapshot();
      const shared = ids.map(function (id) {
        FB.settleWaste(s,id);
        return FB.materializeWasteland(s,id,{holderId:s.holder[s.player.provinceId],ownerId:s.owner[s.player.provinceId]});
      });
      const noblePure = scenicSame(before);
      FB.save.restore(matching);
      const first = FB.save.serialize();
      FB.save.restore(matching);
      return {route:route,frontier:frontier.length,departures:departures,departurePure:departurePure,noble:noble.length,
        shared:shared,noblePure:noblePure,repeat:first === FB.save.serialize(),revision:FB.state.start.revision,
        conversions:FB.state.wastelandSettlements,signature:FB.mods.sig()};
    },scenicIds);
    expect(routes).toMatchObject({frontier:0,departures:scenicIds.map(function () { return false; }),departurePure:true,noble:0,
      shared:scenicIds.map(function () { return null; }),noblePure:true,repeat:true,revision:'scenery_protected_v1',conversions:{},
      signature:crazy ? 'crazygames-content-1' : ''});
    expect(routes.route.length).toBeGreaterThan(0);
  });
}

test('protected conversion rejection is atomic for explicit and legacy inferred evidence',async function ({page},info) {
  await openGame(page,info); await begin634(page,'scenery_protected_v1'); await installProbe(page);
  const results = await page.evaluate(function (ids) {
    const valid = JSON.parse(FB.save.serialize());
    return ['record','legacy','explicit-empty'].map(function (kind,index) {
      const saved = JSON.parse(JSON.stringify(valid)), s = saved.state, pid = ids[index];
      if (kind === 'record') s.wastelandSettlements[pid] = {culture:s.chars[s.player.charId].culture,religion:s.chars[s.player.charId].religion};
      else {
        if (kind === 'legacy') delete s.wastelandSettlements;
        s.dev[pid] = 1; s.holder[pid] = s.holder[s.player.provinceId]; s.owner[pid] = s.owner[s.player.provinceId];
      }
      const text = JSON.stringify(saved), before = scenicSnapshot();
      let preflight = false, direct = false, repair = false;
      try { FB.save.v4.migrate(saved); } catch (error) { preflight = /protected scenic region/.test(error.message); }
      try { FB.save.restore(saved); } catch (error) { direct = /protected scenic region/.test(error.message); }
      try { FB.restoreWastelandSettlements(s); } catch (error) { repair = /protected scenic region/.test(error.message); }
      const loaded = FB.game.loadData(saved);
      return {kind:kind,preflight:preflight,direct:direct,repair:repair,loaded:loaded,pure:scenicSame(before),input:text === JSON.stringify(saved)};
    });
  },scenicIds);
  expect(results).toEqual(['record','legacy','explicit-empty'].map(function (kind) {
    return {kind:kind,preflight:true,direct:true,repair:true,loaded:false,pure:true,input:true};
  }));
});

async function importOverlay(page,name) {
  await page.evaluate(function () { FB.ui.showMods(); });
  await page.locator('#modfile').setInputFiles(path.join(fixtureRoot,name));
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
  await prepareGameContent(page);
}

async function convertBaseline(page,mode) {
  return page.evaluate(function (mode) {
    const s = FB.state;
    if (s.start.revision !== 'baseline' && s.start.revision !== 'ordinary_settlement_v2' && s.start.revision !== 'core_identities_v3') throw new Error('Expected an ordinary settlement revision');
    s.player.gold = 5000; s.player.prestige = 500;
    const choice = FB.travelDestinations(s,'frontier')[0];
    if (!choice) throw new Error('The current opening needs an ordinary frontier');
    const gold = s.player.gold, prestige = s.player.prestige;
    if (mode === 'commoner') {
      if (!FB.travelStart(s,'frontier',choice.destinationId,null)) throw new Error('Missing frontier departure');
      s.player.travel.remainingRoute = []; s.player.travel.legDaysLeft = 0;
      FB.travelTick(s);
      const item = s.eventQueue.find(function (row) { return row.id === 'travel_capstone_frontier'; });
      const event = FB.eventById(item.id);
      FB.resolveEventOption(s,event,event.options[0],item.ctx,{automated:false});
      s.turn += FBDATA.balance.travelSettleOfferDays;
      for (let i = 0; i < FBDATA.balance.frontierMilestonesRequired; i++) FB.fns.frontier_milestone(s);
      if (!FB.frontierSettle(s)) throw new Error('Missing completed homestead');
      s.player.gold -= 37; s.player.prestige -= 5;
    } else {
      s.player.provs = [choice.gatewayId];
      FB.setPlayerTier(s,4,{attachLiege:false,stationFarewell:false});
      FB.foundPlayerRealm(s);
      FB.settleWaste(s,choice.destinationId);
    }
    const save = JSON.parse(FB.save.serialize()), legacy = JSON.parse(JSON.stringify(save));
    delete legacy.state.wastelandSettlements;
    if (!save.state.wastelandSettlements[choice.destinationId]) throw new Error('Missing conversion record');
    return {save:save,legacy:legacy,scenic:choice.destinationId,spent:[gold - s.player.gold,prestige - s.player.prestige],
      configuration:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')],
      sites:JSON.stringify(FB.world.sitesByProv[choice.destinationId])};
  },mode);
}

async function retainedFacts(page,old) {
  return page.evaluate(function (old) {
    const actual = JSON.parse(FB.save.serialize());
    const fields = ['start','player','chars','owner','holder','dev','population','buildings','market','stories','bookmarkSetup',
      'authority','localInstitutions','religiousHeads','wastelandSettlements','log'];
    return {same:fields.every(function (key) { return JSON.stringify(actual.state[key]) === JSON.stringify(old.save.state[key]); }),
      rng:(actual.rng >>> 0) === (old.save.rng >>> 0),uid:actual.uid === old.save.uid,
      revision:FB.activeBookmark.revision,current:FB.bookmark('634').revision,converted:!FB.world.byId[old.scenic].wasteland,
      omitted:!Object.prototype.hasOwnProperty.call(FB.world.byId[old.scenic],'settlementPolicy'),
      sites:JSON.stringify(FB.world.sitesByProv[old.scenic]) === old.sites,signature:actual.mods};
  },old);
}

async function seedConfiguration(page,old) {
  await page.addInitScript(function (configuration) {
    if (sessionStorage.getItem('scenic-seeded')) return;
    if (configuration[0] !== null) localStorage.setItem('fb_mods',configuration[0]);
    if (configuration[1] !== null) localStorage.setItem('fb_mods_bundled',configuration[1]);
    sessionStorage.setItem('scenic-seeded','1');
  },old.configuration);
}

for (const crazy of [false,true]) for (const mode of ['commoner','noble']) {
  test('fresh ordinary 634 supports ' + mode + ' settlement on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    await openEdition(page,info,crazy);
    expect(await page.evaluate(function () {
      const fresh = FB.bookmark('634'), baseline = FB.bookmark('634','ordinary_settlement_v2');
      return {revision:fresh.revision,rows:fresh.provinces.every(function (p,i) {
          const expected=JSON.parse(JSON.stringify(baseline.provinces[i]));
          if (expected.id==='damascus' || expected.id==='baghdad') expected.communities.forEach(function (c) {
            if (c.culture==='syriac' && c.religion===(expected.id==='damascus'?'chalcedonian':'east_syriac'))
              c.religion=expected.id==='damascus'?'chalcedonian_local_634':'east_syriac_local_634';
          });
          return JSON.stringify(p)===JSON.stringify(expected);
        }),
        protected:fresh.provinces.filter(function (row) { return row.settlementPolicy === 'protected'; }).length,
        scenery:fresh.provinces.filter(function (row) { return row.wasteland; }).length};
    })).toEqual({revision:'core_identities_v3',rows:true,protected:0,scenery:21});
    await begin634(page);
    const settled = await convertBaseline(page,mode);
    expect(settled.spent[0]).toBeGreaterThan(0);
    expect(settled.spent[1]).toBeGreaterThan(0);
    await load(page,settled.save);
    expect(await retainedFacts(page,settled)).toMatchObject({same:true,rng:true,uid:true,
      revision:'core_identities_v3',current:'core_identities_v3',converted:true,omitted:true,sites:true});
  });
}

for (const entry of [
  {id:'634',revision:'baseline',file:'household.json'},
  {id:'634',revision:'scenery_protected_v1',file:'court.json'},
  {id:'476',file:'court.json'},
  {id:'867',file:'court.json'}
]) {
  test.describe('current JSON ' + entry.id + ' ' + (entry.revision || 'fresh'),function () {
    let old;
    test.beforeAll(async function ({browser},info) {
      test.skip(!info.project.name.endsWith('-served'),'JSON reload requires a served origin.');
      const context = await browser.newContext(), source = await context.newPage(), guard = installPageGuards(source);
      try {
        await openGame(source,info); await importOverlay(source,entry.file);
        if (entry.id === '634') await begin634(source,entry.revision);
        else {
          const hidden = await source.evaluate(function (id) { return FBDATA.bookmarks[id].hidden; },entry.id);
          await beginBookmarkFromTitle(source,entry.id);
          await source.evaluate(function (input) {
            if (input.hidden === undefined) delete FBDATA.bookmarks[input.id].hidden;
            else FBDATA.bookmarks[input.id].hidden = input.hidden;
          },{id:entry.id,hidden:hidden});
        }
        old = await source.evaluate(function () {
          FB.state.player.gold -= 3;
          return {save:JSON.parse(FB.save.serialize()),configuration:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
        });
        await load(source,old.save);
        old.save = await source.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
    });
    test('restores the current modded world and reloads without changing saved facts',async function ({page},info) {
      await seedConfiguration(page,old); await openGame(page,info); await installProbe(page);
      expect(await page.evaluate(function (saved) {
        const before = scenicSnapshot(), decision = FB.mods.saveCompatibility(saved);
        return {decision:decision,pure:scenicSame(before),changed:FB.mods.sig() !== saved.mods};
      },old.save)).toEqual({decision:{compatible:true,path:null,transition:null},pure:true,changed:false});
      await load(page,old.save);
      const saved = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(saved.state).toEqual(old.save.state);
      expect(saved.rng).toBe(old.save.rng); expect(saved.uid).toBe(old.save.uid);
      if (entry.id === '634') expect(await page.evaluate(function () {
        return {revision:FB.activeBookmark.revision,protected:FB.world.provs.filter(function (row) { return row.settlementPolicy === 'protected'; }).length};
      })).toEqual({revision:entry.revision,protected:entry.revision === 'baseline' ? 0 : 21});
      await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page); await load(page,saved);
      expect(await page.evaluate(function () { return JSON.parse(FB.save.serialize()).state; })).toEqual(old.save.state);
    });
    test('repeated current compatibility stays pure and foreign signatures reject atomically',async function ({page},info) {
      await seedConfiguration(page,old); await openGame(page,info); await load(page,old.save); await installProbe(page);
      expect(await page.evaluate(function (saved) {
        const before=scenicSnapshot(),text=JSON.stringify(saved);
        const first=FB.mods.saveCompatibility(saved),second=FB.mods.saveCompatibility(saved);
        const bad=JSON.parse(text); bad.mods='effective-1-'+Array(65).join('0');
        const rejected=!FB.mods.saveCompatibility(bad).compatible;
        let direct=false; try { FB.save.restore(bad); } catch(error) { direct=true; }
        return {first:first,second:second,rejected:rejected,direct:direct,pure:scenicSame(before),input:text===JSON.stringify(saved)};
      },old.save)).toEqual({first:{compatible:true,path:null,transition:null},second:{compatible:true,path:null,transition:null},
        rejected:true,direct:true,pure:true,input:true});
    });
  });
}

for (const id of ['476','867']) {
  test.describe('current unrelated modded ' + id + ' across the 634 addition',function () {
  let old;
  test.beforeAll(async function ({browser},info) {
    test.skip(!info.project.name.endsWith('-served'),'JSON reload requires a served origin.');
    const context = await browser.newContext(), source = await context.newPage(), guard = installPageGuards(source);
    try {
      await openGame(source,info); await importOverlay(source,'household.json');
      const hidden = await source.evaluate(function (id) { return FBDATA.bookmarks[id].hidden; },id);
      await beginBookmarkFromTitle(source,id);
      old = await source.evaluate(function (input) {
        if (input.hidden === undefined) delete FBDATA.bookmarks[input.id].hidden;
        else FBDATA.bookmarks[input.id].hidden = input.hidden;
        FB.state.player.gold -= 3;
        return {save:JSON.parse(FB.save.serialize()),configuration:[localStorage.getItem('fb_mods'),localStorage.getItem('fb_mods_bundled')]};
      },{id:id,hidden:hidden});
      // Compare ordinary restored state on both sides, including the empty
      // runtime collections that every load initializes without advancing time.
      await load(source,old.save);
      old.save = await source.evaluate(function () { return JSON.parse(FB.save.serialize()); });
    } finally { try { expect(guard.faults).toEqual([]); } finally { await context.close(); } }
  });
  test('retains its saved revision, spent resources and strict catalogue checks',async function ({page},info) {
    await seedConfiguration(page,old); await openGame(page,info); await installProbe(page);
    expect(await page.evaluate(function (data) {
      const before = scenicSnapshot(), decision = FB.mods.saveCompatibility(data);
      return {decision:decision,pure:scenicSame(before),changed:FB.mods.sig() !== data.mods};
    },old.save)).toEqual({decision:{compatible:true,path:null,transition:null},pure:true,changed:false});
    await load(page,old.save);
    const saved = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
    expect(saved.state).toEqual(old.save.state);
    expect(saved.rng).toBe(old.save.rng); expect(saved.uid).toBe(old.save.uid);
    expect(saved.mods).toBe(old.save.mods);
    await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page); await load(page,saved);
    expect(await page.evaluate(function () { return JSON.parse(FB.save.serialize()).state; })).toEqual(old.save.state);
  });
  test('rejects a foreign saved revision and changed JSON content without mutation',async function ({page},info) {
    await seedConfiguration(page,old); await openGame(page,info); await load(page,old.save); await installProbe(page);
    expect(await page.evaluate(function (saved) {
      const wrong=JSON.parse(JSON.stringify(saved)); wrong.state.start.revision='missing_saved_revision';
      const before=scenicSnapshot(); let rejected=false;
      try { FB.save.restore(wrong); } catch(error) { rejected=true; }
      return {rejected:rejected,pure:scenicSame(before)};
    },old.save)).toEqual({rejected:true,pure:true});
    const mod=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'household.json'),'utf8')); mod.balance.startAge++;
    await page.evaluate(function () { FB.ui.showMods(); });
    await page.locator('#modfile').setInputFiles({name:'household.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
    await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
    await prepareGameContent(page); await installProbe(page);
    expect(await page.evaluate(function (saved) {
      const before=scenicSnapshot(); let rejected=false;
      try { FB.save.restore(saved); } catch(error) { rejected=true; }
      return {rejected:rejected,pure:scenicSame(before),changed:FB.mods.sig()!==saved.mods};
    },old.save)).toEqual({rejected:true,pure:true,changed:true});
  });
  });
}

for (const config of [{file:'household.json',mode:'commoner'},{file:'court.json',mode:'noble'},
  {file:null,mode:'noble'},{file:null,mode:'commoner',crazy:true}]) {
  test.describe('retained 634 ' + (config.file || (config.crazy ? 'CrazyGames' : 'unmodded')),function () {
    let old, context, source, guard;
    test.beforeAll(async function ({browser},info) {
      test.skip(!info.project.name.endsWith('-served'),'JSON reload requires a served origin.');
      context = await browser.newContext(); source = await context.newPage(); guard = installPageGuards(source);
      await openEdition(source,info,!!config.crazy);
    });
    test.beforeAll(async function () {
      try {
        if (config.file) await importOverlay(source,config.file);
        await begin634(source,'baseline'); old = await convertBaseline(source,config.mode);
        expect(old.spent[0]).toBeGreaterThan(0); expect(old.spent[1]).toBeGreaterThan(0);
        if (config.file) expect(old.save.mods).toMatch(/^effective-1-[a-f0-9]{64}$/);
        if (config.file === 'court.json') expect(old.spent).toEqual([310,65]);
      } finally {
        try { expect(guard.faults).toEqual([]); } finally { await context.close(); context = null; }
      }
    });
    test.afterAll(async function () { if (context) await context.close(); });

    test('current-content explicit and inferred conversions retain spent resources through repeated restore',async function ({page},info) {
      await seedConfiguration(page,old); await openEdition(page,info,!!config.crazy); await installProbe(page);
      const decision = await page.evaluate(function (data) {
        const before = scenicSnapshot(), text = JSON.stringify(data), result = FB.mods.saveCompatibility(data);
        return {result:result,pure:scenicSame(before),input:text === JSON.stringify(data),signature:FB.mods.sig()};
      },old.save);
      expect(decision).toMatchObject({result:{compatible:true,path:null,transition:null},pure:true,input:true});
      expect(decision.signature).toBe(old.save.mods);
      for (const form of ['save','legacy']) await test.step(form + ' repeated restore',async function () {
        for (const envelope of [old[form],old[form]]) {
          await load(page,envelope);
          expect(await retainedFacts(page,old)).toMatchObject({same:true,rng:true,uid:true,revision:'baseline',current:'core_identities_v3',converted:true,omitted:true,sites:true});
        }
      });
    });

    test('a current-content conversion survives ordinary re-save and fresh-page reload',async function ({page},info) {
      await seedConfiguration(page,old); await openEdition(page,info,!!config.crazy);
      await load(page,old.save);
      const signature = await page.evaluate(function () { return FB.mods.sig(); });
      const saved = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      expect(saved.mods).toBe(signature);
      await page.reload({waitUntil:'domcontentloaded'}); await prepareGameContent(page);
      await load(page,saved);
      expect(await retainedFacts(page,old)).toMatchObject({same:true,rng:true,uid:true,revision:'baseline',converted:true,sites:true});
      expect(await page.evaluate(function (data) { return FB.mods.saveCompatibility(data); },saved)).toEqual({compatible:true,path:null,transition:null});
    });

    test('switching protected and both retained conversion forms preserves policies, conversions and identities',async function ({page},info) {
      await seedConfiguration(page,old); await openEdition(page,info,!!config.crazy); await begin634(page,'scenery_protected_v1');
      const fresh = await page.evaluate(function () { return JSON.parse(FB.save.serialize()); });
      for (const form of ['save','legacy']) await test.step(form + ' round trip',async function () {
        await load(page,old[form]);
        expect(await retainedFacts(page,old)).toMatchObject({same:true,revision:'baseline',converted:true,omitted:true});
        await load(page,fresh);
        expect(await page.evaluate(function (ids) {
          return {revision:FB.state.start.revision,conversions:FB.state.wastelandSettlements,
            protected:ids.every(function (id) { return FB.world.byId[id].wasteland && FB.world.byId[id].settlementPolicy === 'protected' && !FB.world.sitesByProv[id]; })};
        },scenicIds)).toEqual({revision:'scenery_protected_v1',conversions:{},protected:true});
      });
    });

    if (config.file) test('changed JSON definitions reject exactly without changing state or storage',async function ({page},info) {
      await seedConfiguration(page,old); await openGame(page,info);
      const mod=JSON.parse(fs.readFileSync(path.join(fixtureRoot,config.file),'utf8')); mod.balance.startAge++;
      await page.evaluate(function () { FB.ui.showMods(); });
      await page.locator('#modfile').setInputFiles({name:config.file,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(mod),'utf8')});
      await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.locator('#mod-apply').click()]);
      await prepareGameContent(page); await installProbe(page);
      expect(await page.evaluate(function (saved) {
        const before=scenicSnapshot(),text=JSON.stringify(saved),decision=FB.mods.saveCompatibility(saved);
        let preflight=false,direct=false;
        try { FB.save.v4.migrate(saved); } catch(error) { preflight=true; }
        try { FB.save.restore(saved); } catch(error) { direct=true; }
        const loaded=FB.game.loadData(saved);
        return {compatible:decision.compatible,preflight:preflight,direct:direct,loaded:loaded,pure:scenicSame(before),input:text===JSON.stringify(saved)};
      },old.save)).toEqual({compatible:false,preflight:true,direct:true,loaded:false,pure:true,input:true});
    });
  });
}
