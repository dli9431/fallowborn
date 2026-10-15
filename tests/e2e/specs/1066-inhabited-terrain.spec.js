'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {saveBudget} = require('../support/game/476-wider');

dependsOnRuntime(__filename,[
  'index.html','data/bookmarks.js','data/bookmark_1066_inhabited.js','data/government_rollout.js',
  'data/bookmark_1204.js','data/geographies.js','data/geography_expansion.js','data/settlements_real.js',
  'data/cultures.js','data/assembly_polities.js','data/political_institutions.js',
  'data/starts.js','data/climate.js','data/eras.js','data/systems.js','data/technology.js',
  'js/world.js','js/main.js','js/save.js','js/save_v4.js','js/bookmark_setup.js','js/mods.js',
  'js/authority.js','js/politics.js','js/population.js','js/settlement.js','js/lordships.js',
  'js/governments.js','js/government_selection.js','js/government_lineage.js','js/government_assembly.js',
  'js/government_support.js','js/government_continuity.js','js/government_levy.js','js/government_revenue.js',
  'js/treasury.js','js/climate.js','js/travel.js','js/armies.js','js/religion.js','js/station.js','js/model.js','js/modifiers.js',
  'js/crazygames.js','data/distribution_crazygames.js'
]);

const CURRENT = 'inhabited_v2_governments_v2';
const inhabited = ['kumbi_district','jenne_district','gao_district','ghadames_oasis','awjila_oasis',
  'qasr_ibrim','central_iran_oases','sarakhs_oasis','kath_district','gurganj_district','lower_syr_darya'];
async function startExpanded(page,info,start,flag) {
  await page.addInitScript(function (revision) {
    document.addEventListener('DOMContentLoaded',function () {
      FBDATA.bookmarks['1066'].revision = revision;
    },{once:true});
  },CURRENT);
  return startHistoricalGame(page,info,start,flag);
}
function journey(county) {
  return {bookmark:'1066',code:'TERRAIN1066-1066-farmer-' + county + '-m-Review-established'};
}
async function activate(page,id) {
  await page.evaluate(function (id) {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark(id,null,function (error) { if (error) reject(error); else resolve(); });
    });
  },id);
}

test('expanded 1066 accounts for every district while retaining both released worlds and independent 1204',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (ids) {
    const base = FB.bookmark('1066','baseline'), old = FB.bookmark('1066','governments_v2'),
      current = FB.bookmark('1066','inhabited_v2_governments_v2'), later = FB.bookmark('1204','baseline'), raw = FBDATA.bookmarks['1066'];
    const ledger = FBDATA.bookmarkTerrain1066;
    return {revision:current.revision,geography:current.geography,
      faults:FB.validateBookmark(raw),forms:FB.governments.validate(),technology:FB.validateTechnologyData(true),
      revisions:FB.bookmarkRevisions('1066').map(function (b) { return b.revision; }).sort(),
      counts:[current.provinces.length,current.provinces.filter(function (p) { return !p.wasteland; }).length],
      preserved:JSON.stringify(current.provinces.slice(0,base.provinces.length)) === JSON.stringify(base.provinces),
      released:base.provinces.length === 498 && old.geography === base.geography &&
        JSON.stringify(old.provinces) === JSON.stringify(base.provinces) && !old.opening,
      layout:base.provinces.every(function (p) {
        return JSON.stringify(FBDATA.settlementLayouts[current.settlementLayout][p.id]) ===
          JSON.stringify(FBDATA.settlementLayouts['1066'][p.id]);
      }),
      decisions:Object.keys(ledger.districts).length,scenery:Object.keys(ledger.scenery).length,
      dated:ids.every(function (id) {
        const p = current.provinces.find(function (p) { return p.id === id; });
        return !p.wasteland && p.communities.reduce(function (sum,c) { return sum + c.populationShare0; },0) === 10000;
      }),
      deferred:current.provinces.filter(function (p) {
        return Object.prototype.hasOwnProperty.call(ledger.districts,p.id) && p.wasteland;
      }).every(function (p) { return !!ledger.districts[p.id].reason; }),
      independent:later.geography === 'europe_regional' && later.provinces.length === 498 &&
        ids.every(function (id) { return !later.provinces.some(function (p) { return p.id === id; }); }) &&
        FBDATA.settlementLayouts['1204'] !== FBDATA.settlementLayouts['1066'],
      governments:current.realms.find(function (r) { return r.id === 'byzantium_1066'; }).government === 'administrative_monarchy' &&
        current.realms.find(function (r) { return r.id === 'papacy_1066'; }).government === 'ecclesiastical_principality',
      future:JSON.stringify(current.scripted) === JSON.stringify(base.scripted),
      review:FBDATA.techImpactReviews.features.period_1066_district_habitation.mode,
      mods:FB.mods.validate({name:'Retained 1066 revision proof',bookmarks:[JSON.parse(JSON.stringify(raw))]})};
  },inhabited);
  expect(result).toEqual({revision:CURRENT,geography:'europe_regional_2',faults:[],forms:[],technology:[],
    revisions:expect.arrayContaining(['baseline','governments_v2','inhabited_v2',CURRENT]),counts:[527,488],preserved:true,
    released:true,layout:true,decisions:29,scenery:21,dated:true,deferred:true,independent:true,
    governments:true,future:true,review:'none',mods:[]});
});

for (const flag of [false,true]) test('inhabited raster, sites, climate and dry routes, CrazyGames ' + flag,
  async function ({page},info) {
    await startExpanded(page,info,journey('kumbi_district'),flag);
    const result = await page.evaluate(function (ids) {
      const w = FB.world, counts = {}, outside = [];
      ids.forEach(function (id) { counts[id] = 0; });
      for (let i = 0; i < w.grid.length; i++) {
        if (!w.grid[i]) continue;
        const p = w.provs[w.grid[i] - 1];
        if (!Object.prototype.hasOwnProperty.call(counts,p.id)) continue;
        counts[p.id]++;
        const dx = i % w.W - p.sx, dy = Math.floor(i / w.W) - p.sy;
        if (dx * dx + dy * dy > p.radiusSq) outside.push(p.id);
      }
      const rng = FB.getRngState(), uid = FB.getUidCounter();
      const base = FB.bookmark('1066','baseline'), local = base.climate || {}, physical = FB.geography(base.geography).climate || {};
      const oldClimate = base.provinces.every(function (p) {
        const expected = (local.provinces || {})[p.id] || local.zone || (physical.provinces || {})[p.id] || physical.zone || FBDATA.defaultClimateZone;
        return FB.climateZoneOf(p.id) === expected;
      });
      const sites = ids.map(function (id) {
        const site = w.sitesByProv[id].list[0], cell = w.grid[Math.floor(site.y) * w.W + Math.floor(site.x)];
        return {id:id,authored:site.authored,site:site.site,county:cell && w.provs[cell - 1].id,
          bounded:site.snap <= FB.mapScale('siteSnapMax'),climate:FB.climateZoneOf(id),
          population:FB.state.population.counties[id].count};
      });
      const routes = [['kath_district','gurganj_district',3],['gurganj_district','lower_syr_darya',8],
        ['kumbi_district','jenne_district',6]].map(function (row) {
        const from = row[0], to = row[1], t = {currentId:from,remainingRoute:[to],legDays:3};
        const army = {realm:FB.state.owner[from],men:100};
        return {units:FB.landRouteUnits(from,to),expected:row[2],
          adjacent:!!w.adj[from][to] && !!w.adj[to][from],dry:!FB.waterCrossing(from,to),
          household:FB.travelNextLegDays(t),host:FB.armyLegQuote(FB.state,army,from,to).totalDays,
          cost:FB.travelCostSnapshot('service',[to],FB.state) >= FB.travelCostSnapshot('service',1,FB.state)};
      });
      const claim = FB.state.bookmarkSetup.claims.find(function (row) { return row.id === 'lower_syr_seljuk_claim_1066'; });
      return {outside:outside,counts:counts,sites:sites,routes:routes,oldClimate:oldClimate,
        claim:{status:claim.status,contract:claim.contractId,owner:FB.state.owner.lower_syr_darya,
          revenue:FB.political.power(FB.state,{kind:'realm',id:'seljuk_1066'},'revenue',{provinceId:'lower_syr_darya'}).allowed},
        pure:rng === FB.getRngState() && uid === FB.getUidCounter(),revision:FB.state.start.revision};
    },inhabited);
    expect(result.revision).toBe(CURRENT); expect(result.outside).toEqual([]); expect(result.pure).toBe(true); expect(result.oldClimate).toBe(true);
    expect(result.claim).toEqual({status:'demanded',contract:null,owner:'lower_syr_local_1066',revenue:false});
    for (const count of Object.values(result.counts)) expect(count).toBeGreaterThan(0);
    for (const site of result.sites) {
      expect(site).toMatchObject({authored:true,site:site.id + '_inhabited_1066',county:site.id,bounded:true,
        climate:['kath_district','gurganj_district','sarakhs_oasis','lower_syr_darya'].includes(site.id) ? 'continental' : 'arid'});
      expect(site.population).toBeGreaterThan(0);
    }
    for (const route of result.routes) {
      expect(route).toMatchObject({units:route.expected,adjacent:true,dry:true,household:3 * route.expected,cost:true});
      expect(route.host).toBeGreaterThan(0);
    }
    const source = await saveBudget(page,info,'1066-fresh-' + flag,4 * 1024 * 1024), before = await facts(page);
    await activate(page,'1204'); await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
    await saveBudget(page,info,'1066-restored-' + flag,4 * 1024 * 1024);
  });

for (const county of inhabited) test(county + ' supports a commoner season with deterministic midpoint restore',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','One bounded natural journey per accepted district.');
  test.setTimeout(240000);
  await startExpanded(page,info,journey(county)); await injectBrowserHarness(page);
  expect(await page.evaluate(function () { return [FB.state.player.provinceId,FB.state.start.revision]; })).toEqual([county,CURRENT]);
  await saveBudget(page,info,county + '-opening',4 * 1024 * 1024);
  await advanceBookmark(page,45);
  const source = await saveBudget(page,info,county + '-midpoint',6 * 1024 * 1024), middle = await facts(page);
  await activate(page,'867'); await activate(page,'1204'); await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(middle);
  await advanceBookmark(page,45); const finish = await facts(page);
  await restoreBookmark(page,source); await advanceBookmark(page,45);
  expect(await facts(page)).toEqual(finish);
});

test('Wagadu recognises a maternal nephew through canonical kin selection with conserved accession costs',async function ({page},info) {
  await startExpanded(page,info,journey('kumbi_district'));
  const result = await page.evaluate(function () {
    const s = FB.state, rid = 'wagadu_1066', S = FB.governmentSelection, actor = {kind:'realm',id:rid};
    const t = s.realms[rid].succession, p = S.profile(s,rid);
    FB.realmHeldCounties(s,rid).forEach(function (id) { FB.setCountySupport(s,id,40); }); FB.treasuryCredit(s,rid,50);
    const nephew = Object.keys(t.members).find(function (id) {
      const m = t.members[id], mother = t.members[m.motherId];
      return mother && mother.sex === 'f' && m.born === 1049;
    });
    const request = {action:'open',actor:actor,cause:'abdication'}, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    S.candidates(s,rid); S.constituency(s,rid); const opening = S.quote(s,rid,request);
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    const property = JSON.stringify([s.owner,s.holder,s.player.holdings]), gold = s.player.gold, generation = t.rulerGeneration;
    const candidate = nephew, maternal = S.candidates(s,rid).includes(nephew), opened = S.apply(s,opening);
    const cash = FB.treasuryAvailable(s,rid), negotiated = S.apply(s,S.quote(s,rid,{action:'negotiate',actor:actor,candidateId:candidate,terms:p.terms}));
    const cost = cash - FB.treasuryAvailable(s,rid), review = S.quote(s,rid,{action:'resolve',actor:actor});
    const resolved = S.apply(s,review), after = JSON.stringify(s), duplicate = S.apply(s,review);
    return {maternal:!!maternal,pure:pure,opened:opened,negotiated:negotiated,resolved:resolved,cost:cost,expectedCost:p.negotiationCost,
      duplicate:duplicate,once:after === JSON.stringify(s) && t.rulerGeneration === generation + 1,
      property:property === JSON.stringify([s.owner,s.holder,s.player.holdings]),household:gold === s.player.gold};
  });
  expect(result).toMatchObject({maternal:true,pure:true,opened:true,negotiated:true,resolved:true,duplicate:false,once:true,property:true,household:true});
  expect(result.cost).toBe(result.expectedCost);
  const source = await page.evaluate(function () { return FB.save.serialize(); }), before = await facts(page);
  await restoreBookmark(page,source); expect(await facts(page)).toEqual(before);
});

for (const revision of ['baseline','governments_v2']) test(revision + ' 1066 households and converted frontier survive new-date switching',async function ({page},info) {
  await page.addInitScript(function (revision) {
    document.addEventListener('DOMContentLoaded',function () { FBDATA.bookmarks['1066'].revision = revision; },{once:true});
  },revision);
  await startHistoricalGame(page,info,journey('london')); await injectBrowserHarness(page);
  const source = await page.evaluate(function (revision) {
    const s = FB.state; s.player.gold = 5000; s.player.prestige = 500;
    FB.settleWaste(s,'w_karakum'); s.dev.w_karakum = 3;
    const data = JSON.parse(FB.save.serialize());
    if (revision === 'baseline') { data.platformSchema = 1; delete data.state.start.revision; }
    FBDATA.bookmarks['1066'].revision = 'inhabited_v2_governments_v2';
    return JSON.stringify(data);
  },revision);
  const before = await facts(page), property = await page.evaluate(function () {
    const s = FB.state;
    return JSON.stringify([s.chars,s.player,s.owner,s.holder,s.population,s.wastelandSettlements,s.settlements]);
  });
  expect(before.snapshot.readsArePure).toBe(true);
  await activate(page,'1066'); await activate(page,'867'); await activate(page,'1204'); await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
  expect(await page.evaluate(function (ids) {
    const s = FB.state;
    return {property:JSON.stringify([s.chars,s.player,s.owner,s.holder,s.population,s.wastelandSettlements,s.settlements]),
      retained:ids.every(function (id) { return !FB.world.byId[id]; }),revision:s.start.revision};
  },inhabited)).toEqual({property:property,retained:true,revision:revision});
  const saved = await page.evaluate(function () { return FB.save.serialize(); });
  await restoreBookmark(page,saved); expect(await facts(page)).toEqual(before);
});

test('1066 observer advances bounded seasons without scripted conquests or speculative commissions',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','One measured observer slice.');
  await startExpanded(page,info,journey('london')); await injectBrowserHarness(page);
  await page.evaluate(function () {
    // Keep a resumable household while the daily loop advances only the world.
    FB.game.observe = true;
  });
  for (let batch = 0; batch < 2; batch++) {
    const start = Date.now(); await advanceBookmark(page,45); const elapsed = Date.now() - start;
    await info.attach('1066-observer-batch-' + batch + '.json',{contentType:'application/json',body:Buffer.from(JSON.stringify({days:45,elapsed:elapsed,ceiling:30000}))});
    expect(elapsed).toBeLessThan(30000);
  }
  expect(await page.evaluate(function () {
    const s = FB.state;
    return !s.authority.appointments.some(function (row) {
      return row.officeId === 'district_delegate_1066';
    }) && s.owner.kumbi_district === 'wagadu_1066';
  })).toBe(true);
  const source = await saveBudget(page,info,'1066-observer-midpoint',6 * 1024 * 1024), before = await facts(page);
  await restoreBookmark(page,source); expect(await facts(page)).toEqual(before);
});
