'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startRegion,saveBudget} = require('../support/game/476-wider');
const {restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const audit = require('../fixtures/bookmark-geography-coverage.json');
dependsOnRuntime(__filename,[
  'data/bookmark_493_world.js',
  'index.html','data/counties.js','data/map_data.js','data/geographies.js','data/geography_expansion.js',
  'data/bookmarks.js','data/bookmark_493.js','data/bookmark_711.js','data/bookmark_800.js',
  'data/bookmark_867_expansion.js','data/government_rollout.js',
  'data/bookmark_1204.js','data/bookmark_476_wider.js','data/settlements.js','data/settlements_real.js',
  'data/climate.js','data/starts.js','js/world.js','js/climate.js','js/travel.js','js/armies.js',
  'js/main.js','js/save.js','js/save_v4.js','js/population.js','js/title_ids.js'
]);

test('all six retained openings account for every ordinary and scenery anchor',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const result = await page.evaluate(function (audit) {
    const scenery = Object.keys(audit.scenery).sort();
    return Object.keys(audit.baselines).map(function (id) {
      const b = FB.bookmark(id,'baseline');
      return {id:id,geography:b.geography,count:b.provinces.length,
        inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
        disabled:b.provinces.filter(function (p) { return p.wasteland && scenery.indexOf(p.id) < 0; }).length,
        scenery:b.provinces.filter(function (p) { return scenery.indexOf(p.id) >= 0 && p.wasteland; })
          .map(function (p) { return p.id; }).sort()};
    });
  },audit);
  for (const row of result) expect(row).toEqual(Object.assign({id:row.id,geography:'europe_regional',
    count:audit.baselineAnchors,scenery:Object.keys(audit.scenery).sort()},audit.baselines[row.id]));
  expect(await page.evaluate(function () { return FB.bookmark('493').hidden; })).toBe(true);
});

test('the shared expansion retains seed identities, all scenery and complete physical declarations',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function (audit) {
    const base = FB.geography('europe_regional'), expanded = FB.geography('europe_regional_2');
    const original = JSON.stringify(base), rng = FB.getRngState(), uid = FB.getUidCounter();
    const additions = FBDATA.geographies.europe_regional_2.provinceAdditions;
    const inventory = [].concat.apply([],Object.keys(audit.scenery).map(function (id) { return audit.scenery[id]; }));
    const b = FB.bookmark('476');
    const result = {
      faults:FB.validateGeography('europe_regional_2'),
      originalCount:base.provinces.length,expandedCount:expanded.provinces.length,
      prefix:JSON.stringify(expanded.provinces.slice(0,base.provinces.length)) === JSON.stringify(base.provinces),
      inventory:inventory.sort(),additions:additions.map(function (p) { return p.id; }).sort(),
      bounded:additions.every(function (p) { return p.maxRadiusKm === 65 && p.wasteland &&
        p.x >= base.bounds.lonMin && p.x <= base.bounds.lonMax &&
        p.y >= base.bounds.latMin && p.y <= base.bounds.latMax &&
        !!FBDATA.climateZones[expanded.climate.provinces[p.id]]; }),
      pending:audit.newDistricts.every(function (id) {
        const p = b.provinces.find(function (p) { return p.id === id; });
        return p && p.wasteland && !p.realm && !p.communities && !p.settlements &&
          !!FBDATA.settlementSites[id + '_site'];
      }),
      inheritedScale:JSON.stringify(expanded.mapScale) === JSON.stringify(base.mapScale),
      steppe:[FB.datedPlaceName(expanded.names.provinces.w_steppe_e,1204),
        base.names.provinces.w_steppe_e || null],
      pure:original === JSON.stringify(base) && rng === FB.getRngState() && uid === FB.getUidCounter()
    };
    return result;
  },audit)).toEqual({faults:[],originalCount:498,expandedCount:527,prefix:true,
    inventory:Object.values(audit.scenery).flat().sort(),
    additions:Object.values(audit.scenery).flat().sort(),bounded:true,pending:true,
    inheritedScale:true,steppe:['Eastern steppe',null],pure:true});
});

test('1204 opening and every saved settlement slot survive removal of the 1066 dependency',async function ({page},testInfo) {
  await openGame(page,testInfo);
  // Read source as text; execute only inside the browser after the real index boot.
  const sources = {
    previous:fs.readFileSync(path.join(__dirname,'../fixtures/bookmark-1204-inherited.js'),'utf8'),
    current:fs.readFileSync(path.join(__dirname,'../../../data/bookmark_1204.js'),'utf8')
  };
  const result = await page.evaluate(function (sources) {
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    const raw = FBDATA.bookmarks['867'];
    const inputs = {bookmarks:{'1066':FBDATA.bookmarks['1066']},
      geographies:{europe_regional:FBDATA.geographies.europe_regional},
      duchies:raw.duchies,kingdoms:raw.kingdoms,empires:raw.empires,
      settlementLayouts:{'1066':FBDATA.settlementLayouts['1066']}};
    function build(source,remove) {
      const data = clone(inputs);
      if (remove) { delete data.bookmarks['1066']; delete data.settlementLayouts['1066']; }
      // Each source receives a detached data catalogue and cannot change the live world.
      new Function('window','FBDATA',source)({FBDATA:data},data);
      return {bookmark:data.bookmarks['1204'],layout:data.settlementLayouts['1204']};
    }
    return {previous:build(sources.previous,false),current:build(sources.current,false),
      independent:build(sources.current,true)};
  },sources);
  expect(result.current).toEqual(result.previous);
  expect(result.independent).toEqual(result.previous);
});

test('an independent fictional opening compiles the shared district sites and climates',async function ({page},testInfo) {
  await openGame(page,testInfo);
  const prepared = await page.evaluate(function (ids) {
    const base = JSON.parse(JSON.stringify(FB.bookmark('867','baseline')));
    const prototype = base.provinces.find(function (p) { return p.id === 'bukhara'; });
    base.id = 'e2e_shared_districts'; base.name = 'Physical district survey';
    base.geography = 'europe_regional_2'; base.settlementLayout = null;
    base.starts = []; base.stories = []; base.scripted = [];
    base.provinces = base.provinces.concat(FBDATA.geographies.europe_regional_2.provinceAdditions.map(function (p) {
      if (ids.indexOf(p.id) < 0) return Object.assign({},p);
      // Fictional residents exercise public geography inputs, not dated history.
      return {id:p.id,name:p.name,realm:prototype.realm,culture:prototype.culture,
        religion:prototype.religion,dev:1,
        settlements:[{site:p.id + '_site',name:'Survey settlement',kind:'village'}]};
    }));
    FBDATA.bookmarks[base.id] = base;
    return FB.validateBookmark(base);
  },audit.newDistricts);
  expect(prepared).toEqual([]);
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('e2e_shared_districts',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  const sites = await page.evaluate(function (ids) {
    return ids.map(function (id) {
      const w = FB.world, site = w.sitesByProv[id].list[0];
      const cell = w.grid[Math.floor(site.y) * w.W + Math.floor(site.x)];
      return {id:id,site:site.site,authored:site.authored,county:cell ? w.provs[cell - 1].id : null,
        snap:site.snap,limit:FB.mapScale('siteSnapMax'),climate:FB.climateZoneOf(id)};
    });
  },audit.newDistricts);
  for (const site of sites) {
    expect(site).toMatchObject({id:site.id,site:site.id + '_site',authored:true,county:site.id,
      climate:site.id === 'kath_district' || site.id === 'gurganj_district' ? 'continental' : 'arid'});
    expect(site.snap).toBeLessThanOrEqual(site.limit);
  }
});

for (const flag of [false,true]) test('shared district raster, dry routes and restore remain bounded, flag ' + flag,
  async function ({page},testInfo) {
    await startRegion(page,testInfo,'garama',flag);
    const before = await page.evaluate(function (ids) {
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
      return {counts:counts,outside:outside,declared:FB.validateBookmark(FBDATA.bookmarks['476']),
        routes:FB.activeGeography.landRoutes.slice(-6).map(function (r) {
          return [r[0],r[1],FB.landRouteUnits(r[0],r[1]),!!w.adj[r[0]][r[1]],
            !!w.adj[r[1]][r[0]],!!FB.waterCrossing(r[0],r[1])];
        }),
        scenery:Object.keys(counts).every(function (id) { return w.byId[id].wasteland && !FB.state.owner[id]; })};
    },audit.newDistricts);
    expect(before.outside).toEqual([]);
    expect(before.declared).toEqual([]);
    expect(before.scenery).toBe(true);
    for (const count of Object.values(before.counts)) expect(count).toBeGreaterThan(0);
    expect(before.routes).toEqual([
      ['kath_district','bukhara',8,true,true,false],['kath_district','gurganj_district',3,true,true,false],
      ['gurganj_district','lower_syr_darya',8,true,true,false],['kumbi_district','jenne_district',6,true,true,false],
      ['timbuktu_district','jenne_district',5,true,true,false],['timbuktu_district','gao_district',4,true,true,false]
    ]);
    const source = await saveBudget(page,testInfo,'shared-geography-fresh',4 * 1024 * 1024);
    const state = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(state);
    await saveBudget(page,testInfo,'shared-geography-restored',4 * 1024 * 1024);
  });

for (const bookmark of ['867','1066']) test('a converted ' + bookmark + ' frontier keeps its original raster across expansion switches',
  async function ({page},testInfo) {
    await openGame(page,testInfo);
    await page.evaluate(function (id) {
      FBDATA.bookmarks[id].revision = 'baseline'; FB.startProgression.noteTier(1);
    },bookmark);
    const fullStart = page.locator('#btn-choose-beginning');
    if (await fullStart.isVisible()) await fullStart.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('COVERAGEBASE-' + bookmark + '-farmer-london-m-Review-established');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await injectBrowserHarness(page);
    await page.evaluate(function () { FB.game.setPaused(true); });
    const prepared = await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 5000; s.player.prestige = 500;
      FB.settleWaste(s,'w_karakum');
      if (FB.world.byId.w_karakum.wasteland) throw new Error('Frontier setup did not settle.');
      s.dev.w_karakum = 3;
      function fingerprint() {
        let hash = 2166136261;
        for (let i = 0; i < FB.world.grid.length; i++) hash = Math.imul(hash ^ FB.world.grid[i],16777619);
        return hash >>> 0;
      }
      window.__coverageRaster = fingerprint;
      const data = JSON.parse(FB.save.serialize());
      // This is an actual retained baseline, before revisions existed.
      data.platformSchema = 1; delete data.state.start.revision;
      return {source:JSON.stringify(data),raster:fingerprint(),
        sites:JSON.stringify(FB.world.sitesByProv.w_karakum),
        population:s.population.counties.w_karakum.count,gold:s.player.gold,
        owner:s.owner.w_karakum,holder:s.holder.w_karakum};
    });
    await page.evaluate(function () {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('476',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    expect(await page.evaluate(function () { return !!FB.world.byId.kath_district; })).toBe(true);
    await restoreBookmark(page,prepared.source);
    const restored = await page.evaluate(function (ids) {
      const s = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
      const before = JSON.stringify([s.wastelandSettlements,s.population,s.owner,s.holder,s.player.gold]);
      FB.restoreWastelandSettlements(s); FB.restoreWastelandSettlements(s);
      return {raster:window.__coverageRaster(),sites:JSON.stringify(FB.world.sitesByProv.w_karakum),
        population:s.population.counties.w_karakum.count,gold:s.player.gold,
        owner:s.owner.w_karakum,holder:s.holder.w_karakum,
        original:ids.every(function (id) { return !FB.world.byId[id]; }),
        revision:s.start.revision,geography:s.start.geography,
        idempotent:before === JSON.stringify([s.wastelandSettlements,s.population,s.owner,s.holder,s.player.gold]) &&
          rng === FB.getRngState() && uid === FB.getUidCounter()};
    },audit.newDistricts);
    expect(restored).toEqual({raster:prepared.raster,sites:prepared.sites,population:prepared.population,
      gold:prepared.gold,owner:prepared.owner,holder:prepared.holder,original:true,
      revision:'baseline',geography:'europe_regional',idempotent:true});
    const reexport = await page.evaluate(function () { return FB.save.serialize(); });
    expect(JSON.parse(reexport).platformSchema).toBe(2);
    await restoreBookmark(page,reexport);
    expect(await page.evaluate(function () { return window.__coverageRaster(); })).toBe(prepared.raster);
  });
