'use strict';
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');

dependsOnRuntime(__filename, [
  'index.html', 'data/geographies.js', 'data/geography_expansion.js',
  'data/geography_north_atlantic.js', 'data/map_data.js', 'data/counties.js',
  'data/bookmark_867_north_atlantic.js', 'data/bookmark_1066_north_atlantic.js',
  'data/bookmarks.js', 'data/bookmark_867_expansion.js', 'data/government_rollout.js',
  'data/islamic_profiles.js', 'data/islamic_institutions.js', 'data/settlements.js',
  'data/climate.js', 'data/eras.js', 'data/starts.js', 'data/technology.js', 'data/traits.js',
  'js/world.js', 'js/util.js', 'js/mods.js', 'js/mapview.js', 'js/armies.js',
  'js/travel.js', 'js/settlement.js', 'js/main.js', 'js/save.js', 'js/save_v4.js',
  'js/starts.js', 'js/governments.js', 'js/technology.js', 'js/climate.js'
]);

async function activate(page, id, revision, geography) {
  return page.evaluate(function (input) {
    return new Promise(function (resolve) {
      const options = {};
      if (input.revision !== undefined) options.revision = input.revision;
      if (input.geography !== undefined) options.geography = input.geography;
      FB.activateBookmark(input.id, null, function (error) {
        resolve(error ? error.message : null);
      }, options);
    });
  }, {id:id, revision:revision, geography:geography});
}

/* Import a complete fictional physical survey through the ordinary JSON store.
   None of its people, sites or habitation is a production historical claim. */
async function importSurvey(page) {
  expect(await page.evaluate(function () {
    const g = FB.geography('europe_north_atlantic_2');
    const inhabited = ['iceland_southwest','iceland_west','iceland_northwest',
      'iceland_north','iceland_east','iceland_south','faroes','orkney','shetland',
      'caithness','lewis','bergen'];
    const sites = {}, layout = {};
    const rows = g.provinces.map(function (seed) {
      const row = {id:seed.id, name:seed.name, wasteland:true};
      if (inhabited.indexOf(seed.id) < 0) return row;
      delete row.wasteland;
      Object.assign(row, {realm:'na_survey_court', duchy:'na_survey_district',
        culture:'norse', religion:'catholic', dev:2,
        communities:[{culture:'norse',religion:'catholic',populationShare0:10000}]});
      const id = 'na_probe_' + seed.id;
      sites[id] = {x:seed.x,y:seed.y};
      layout[seed.id] = [{site:id,name:'Survey farm',kind:'village'}];
      return row;
    });
    // Approximate site neighborhoods, with fixture-owned neutral identities.
    const probes = [
      ['iceland_southwest','reykjavik',-21.94,64.15],
      ['iceland_southwest','thingvellir',-21.12,64.26],
      ['faroes','kvivik',-7.07,62.12], ['faroes','toftanes',-6.76,62.21],
      ['faroes','tinganes',-6.77,62.01], ['orkney','birsay',-3.32,59.13],
      ['shetland','sumburgh',-1.30,59.87], ['shetland','tingwall',-1.24,60.18]
    ];
    probes.forEach(function (p) {
      const id = 'na_probe_' + p[1];
      sites[id] = {x:p[2],y:p[3]};
      layout[p[0]].push({site:id,name:'Survey ' + p[1],kind:'village'});
    });
    const b = {id:'na_survey',name:'Physical survey',desc:'A fictional map survey.',
      date:{year:867,season:0,day:1},era:'early_medieval',geography:'europe_north_atlantic_2',
      provinces:rows,realms:[{id:'na_survey_court',name:'Survey court',color:'#607d8b',
        capital:'bergen',rank:2,aggression:0,government:'territorial',religion:'catholic',
        ruler:{name:'Survey ruler',sex:'m',culture:'norse',born:837,mar:5,trait:'patient'}}],
      duchies:{na_survey_district:{name:'Survey district',kingdom:null}},kingdoms:{},empires:{},
      localInstitutions:{},religiousHeads:{},systems:{disable:['papacy','great_holy_wars']},
      starts:['farmer'],stories:[],scripted:[],settlementLayout:'na_survey',
      straits:g.straits,crossingClasses:g.crossingClasses};
    const text = JSON.stringify({name:'North Atlantic physical survey',bookmarks:{na_survey:b},
      settlementSites:sites,settlementLayouts:{na_survey:layout}});
    const errors = FB.mods.validate(JSON.parse(text));
    if (errors.length) throw new Error(errors.join('\n'));
    return FB.mods.store(text);
  })).not.toBe(false);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && !!FBDATA.bookmarks.na_survey;
  });
}

test('the physical child preserves metadata and scenery while retained dates keep their maps', async function ({page}, info) {
  await openGame(page, info);
  const result = await page.evaluate(function () {
    const parent = FB.geography('europe_regional_2'), g = FB.geography('europe_north_atlantic_2');
    const raw = FBDATA.geographies.europe_north_atlantic_2;
    const keys = raw.straits.map(function (p) { return p.slice().sort().join('|'); });
    return {
      faults:FB.validateGeography('europe_north_atlantic_2'),
      count:[parent.provinces.length,g.provinces.length,raw.provinceAdditions.length],
      bounds:g.bounds,width:g.gridWidth,
      prefix:JSON.stringify(g.provinces.slice(0,parent.provinces.length)) === JSON.stringify(parent.provinces),
      land:JSON.stringify(g.land.slice(0,parent.land.length)) === JSON.stringify(parent.land),
      independent:g.land !== parent.land && g.land[0] !== parent.land[0] &&
        g.names.provinces !== parent.names.provinces && g.names.provinces.roma !== parent.names.provinces.roma &&
        g.climate.provinces !== parent.climate.provinces && g.mapScale !== parent.mapScale,
      retained:['seas','rivers','mapScale','landRoutes','defaultLayout'].every(function (key) {
        return JSON.stringify(g[key]) === JSON.stringify(parent[key]);
      }),
      sharedSites:raw.sites === undefined,
      names:Object.keys(parent.names.provinces).every(function (id) {
        return JSON.stringify(g.names.provinces[id]) === JSON.stringify(parent.names.provinces[id]);
      }) && JSON.stringify(g.names.sites) === JSON.stringify(parent.names.sites),
      climates:Object.keys(parent.climate.provinces).every(function (id) {
        return g.climate.provinces[id] === parent.climate.provinces[id];
      }),
      scenic:raw.provinceAdditions.every(function (p) {
        return p.wasteland === true && !p.realm && !p.culture && !p.religion &&
          !p.communities && !p.duchy && !p.settlements &&
          p.maxRadiusKm === (p.id === 'caithness' ? 30 : undefined) &&
          g.climate.provinces[p.id] === 'northern_temperate';
      }),
      crossings:keys.length === new Set(keys).size && keys.length === parent.straits.length + 7,
      oldPairs:parent.straits.every(function (p) { return keys.indexOf(p.slice().sort().join('|')) >= 0; }),
      defaults:[FBDATA.defaultGeography,FB.bookmark('867').geography,FB.bookmark('1066').geography],
      retainedMaps:FB.bookmarks(true).every(function (b) {
        return b.geography !== 'europe_north_atlantic_2' && FB.bookmarkRevisions(b.id).every(function (r) {
          return (['867','1066'].indexOf(b.id) >= 0 && r.revision === 'north_atlantic_v1') ||
            r.geography !== 'europe_north_atlantic_2';
        });
      })
    };
  });
  expect(result).toEqual({faults:[],count:[527,540,13],
    bounds:{lonMin:-25,lonMax:70,latMin:13,latMax:67.5},width:1290,
    prefix:true,land:true,independent:true,retained:true,sharedSites:true,names:true,climates:true,
    scenic:true,crossings:true,oldPairs:true,
    defaults:['europe_regional','europe_regional','europe_regional'],retainedMaps:true});
});

test('JSON candidates reject malformed inheritance and geometry transactionally', async function ({page}, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const before = JSON.stringify(FBDATA.geographies), rng = FB.getRngState(), uid = FB.getUidCounter();
    const bad = [
      {extends:'missing_north_atlantic'},
      {extends:'na_bad'},
      {extends:'europe_north_atlantic_2',provinceAdditions:[{id:'faroes',x:0,y:0}]},
      {extends:'europe_north_atlantic_2',retiredProvinceIds:['na_retired'],
        provinceAdditions:[{id:'na_retired',x:0,y:0}]},
      {extends:'europe_north_atlantic_2',provinceOverrides:{london:{x:0}}},
      {extends:'europe_north_atlantic_2',land:[[0,0,1,1]]},
      {extends:'europe_north_atlantic_2',landRoutes:[['faroes','missing_county',3]]}
    ];
    return bad.map(function (candidate) {
      const errors = FB.mods.validate(JSON.parse(JSON.stringify({geographies:{na_bad:candidate}})));
      return errors.length > 0 && before === JSON.stringify(FBDATA.geographies) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual(Array(7).fill(true));
});

test('simplified island rings have area and retain separate, simple outlines', async function ({page}, info) {
  await openGame(page, info);
  expect(await page.evaluate(function () {
    const parent = FB.geography('europe_regional_2');
    const rings = FB.geography('europe_north_atlantic_2').land.slice(parent.land.length).map(function (flat) {
      const p = [];
      for (let i = 0; i < flat.length; i += 2) p.push([flat[i],flat[i + 1]]);
      return p;
    });
    function side(a,b,c) { return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]); }
    function crosses(a,b,c,d) { return side(a,b,c)*side(a,b,d) < 0 && side(c,d,a)*side(c,d,b) < 0; }
    let crossings = 0;
    for (let ri = 0; ri < rings.length; ri++) for (let rj = ri; rj < rings.length; rj++) {
      const a = rings[ri], b = rings[rj];
      for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
        if (crosses(a[i],a[(i + 1) % a.length],b[j],b[(j + 1) % b.length])) crossings++;
      }
    }
    return {count:rings.length,crossings:crossings,nondegenerate:rings.every(function (p) {
      let area = 0;
      for (let i = 0; i < p.length; i++) area += p[i][0]*p[(i + 1) % p.length][1] - p[i][1]*p[(i + 1) % p.length][0];
      return p.length >= 3 && Math.abs(area) > 0.000001 &&
        new Set(p.map(function (point) { return point.join(','); })).size === p.length;
    })};
  })).toEqual({count:26,crossings:0,nondegenerate:true});
});

test('an imported survey rejects unknown crossings, invalid classes and hidden site tables', async function ({page}, info) {
  await openGame(page, info);
  await importSurvey(page);
  expect(await page.evaluate(function () {
    const b = FBDATA.bookmarks.na_survey, raw = FBDATA.geographies.europe_north_atlantic_2;
    const before = JSON.stringify([FBDATA.bookmarks,FBDATA.geographies]), rng = FB.getRngState(), uid = FB.getUidCounter();
    const missing = JSON.parse(JSON.stringify(b));
    missing.straits.push(['faroes','missing_north_atlantic']);
    const duplicate = JSON.parse(JSON.stringify(b));
    duplicate.straits.push(['iceland_east','faroes']);
    const badClass = JSON.parse(JSON.stringify(b));
    badClass.crossingClasses['faroes|iceland_east'] = 'instant';
    const candidates = [
      {bookmarks:{na_survey:missing}}, {bookmarks:{na_survey:duplicate}},
      {bookmarks:{na_survey:badClass}},
      {geographies:{europe_north_atlantic_2:Object.assign({},raw,{sites:{}})}}
    ];
    return candidates.map(function (mod) {
      return FB.mods.validate(JSON.parse(JSON.stringify(mod))).length > 0 &&
        before === JSON.stringify([FBDATA.bookmarks,FBDATA.geographies]) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual(Array(4).fill(true));
});

test('the imported full survey assigns every island ring, keeps water gaps and compiles local sites', async function ({page}, info) {
  await openGame(page, info);
  await importSurvey(page);
  expect(await activate(page, 'na_survey')).toBe(null);
  const result = await page.evaluate(function () {
    const w = FB.world, parent = FB.geography('europe_regional_2');
    const rings = Array.from({length:26},function () { return {cells:0,owners:[]}; });
    let invalid = 0, mainlandIslands = 0;
    const islandIds = ['faroes','orkney','shetland'];
    for (let i = 0; i < w.land.length; i++) {
      if (!w.land[i]) { if (w.grid[i]) invalid++; continue; }
      const pr = w.provs[w.grid[i] - 1];
      if (!pr) { invalid++; continue; }
      const ring = w.landmass[i] - parent.land.length - 1;
      if (ring >= 0 && ring < rings.length) {
        rings[ring].cells++;
        if (rings[ring].owners.indexOf(pr.id) < 0) rings[ring].owners.push(pr.id);
      } else if (islandIds.indexOf(pr.id) >= 0) mainlandIslands++;
    }
    const added = FBDATA.geographies.europe_north_atlantic_2.provinceAdditions;
    const seeds = added.map(function (seed) {
      const pr = w.byId[seed.id], p = FB.provinceAtGrid(pr.sx,pr.sy);
      return {id:seed.id,owns:!!p && p.id === seed.id,area:pr.area > 0,
        intended:seed.id === 'caithness' ? pr.landmass <= parent.land.length :
          pr.landmass === parent.land.length + (seed.id.indexOf('iceland_') === 0 ? 1 :
            seed.id === 'faroes' ? 2 : seed.id === 'orkney' ? 12 : 20)};
    });
    function at(lon,lat) {
      const p = FB.provinceAtGrid(FB.lonToX(lon),FB.latToY(lat));
      return p && p.id;
    }
    const sites = w.sites.filter(function (site) { return site.site && site.site.indexOf('na_probe_') === 0; });
    // A point outside this coast is held as a site instead of silently assigning it to Iceland.
    const farPoint = {x:FB.lonToX(-30),y:FB.latToY(64)};
    return {size:[w.W,w.H],invalid:invalid,mainlandIslands:mainlandIslands,rings:rings,seeds:seeds,
      sites:sites.length,siteMembership:sites.every(function (site) {
        const pr = FB.provinceAtGrid(site.x,site.y);
        return pr && pr.id === site.pid && site.authored && site.snap <= FB.mapScale('siteSnapMax');
      }),
      seas:[at(-3.1,58.65),at(-3.0,58.9),at(-1.24,60.5)],
      coast:['iceland_southwest','iceland_south','iceland_east'].every(function (id) { return w.byId[id].coastal; }),
      mainland:[at(-3.4,58.45),at(-4.22,57.48),at(-3.32,57.65)],
      held:FB.provinceAtGrid(farPoint.x,farPoint.y) === null,
      rows:FB.activeBookmark.provinces.length};
  });
  expect(result.size).toEqual([1290,1078]);
  expect(result.invalid).toBe(0);
  expect(result.mainlandIslands).toBe(0);
  expect(result.rows).toBe(540);
  expect(result.seeds).toEqual(expect.arrayContaining([
    expect.objectContaining({id:'faroes',owns:true,area:true,intended:true}),
    expect.objectContaining({id:'orkney',owns:true,area:true,intended:true}),
    expect.objectContaining({id:'shetland',owns:true,area:true,intended:true})
  ]));
  expect(result.seeds.every(function (s) { return s.owns && s.area && s.intended; })).toBe(true);
  result.rings.forEach(function (ring, index) {
    expect(ring.cells, 'ring ' + index + ' survives').toBeGreaterThan(0);
    if (index === 0) expect(ring.owners.every(function (id) { return id.indexOf('iceland_') === 0; })).toBe(true);
    else expect(ring.owners).toEqual([index < 11 ? 'faroes' : index < 19 ? 'orkney' : index < 25 ? 'shetland' : 'lewis']);
  });
  expect(result.sites).toBe(20);
  expect(result.siteMembership).toBe(true);
  expect(result.seas).toEqual([null,null,null]);
  expect(result.coast).toBe(true);
  expect(result.mainland).toEqual(['caithness','inverness','elgin']);
  expect(result.held).toBe(true);
});

test('world switches restore projections, hit tests and cached topology without changing old worlds', async function ({page}, info) {
  await openGame(page, info);
  await importSurvey(page);
  const worlds = [['867','baseline',1100],['867','inhabited_v2',1100],['na_survey','baseline',1290]];
  for (const row of worlds.concat(worlds.slice().reverse())) {
    expect(await activate(page,row[0],row[1])).toBe(null);
    expect(await page.evaluate(function () {
      window.__naWorlds = window.__naWorlds || {};
      const key = FB.activeBookmarkId + ':' + FB.activeBookmark.revision;
      const previous = window.__naWorlds[key];
      window.__naWorlds[key] = FB.world;
      const pr = FB.world.byId.bergen;
      return {width:FB.proj.W,match:FB.proj.W === FB.world.W && FB.proj.H === FB.world.H,
        cached:!previous || previous === FB.world,
        hit:FB.provinceAtGrid(pr.sx,pr.sy).id,
        newCounty:!!FB.world.byId.faroes,
        water:FB.waterCrossing('faroes','iceland_east')};
    })).toEqual({width:row[2],match:true,cached:true,hit:'bergen',
      newCounty:row[0] === 'na_survey',water:row[0] === 'na_survey' ? 'open' : null});
  }
  const before = await page.evaluate(function () { return FB.world.W; });
  expect(await activate(page,'867','baseline','europe_north_atlantic_2')).toContain('does not match');
  expect(await page.evaluate(function () { return FB.world.W; })).toBe(before);
});

test('old and imported campaign saves retain matching maps and ordinary crossing clocks', async function ({page}, info) {
  await openGame(page, info);
  await importSurvey(page);
  await startDeterministicGame(page);
  const old = await page.evaluate(function () { FB.game.setPaused(true); return FB.save.serialize(); });
  expect(await activate(page,'na_survey')).toBe(null);
  await page.evaluate(function () {
    FB.game.pending = {seed:'NORTHSURVEY',bookmarkId:'na_survey',name:'Survey',sex:'m',
      scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; })};
    FB.game.pickMode = true;
    if (!FB.game.pickProvince(FB.world.byId.faroes) || !FB.game.pickSettlement({pid:'faroes',index:0}))
      throw new Error('Survey birthplace unavailable');
  });
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  const saved = await page.evaluate(function () {
    const s = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const pairs = [['bergen','shetland','open'],['orkney','shetland','open'],
      ['caithness','orkney','coastal'],['caithness','lewis','open'],
      ['faroes','lewis','open'],['faroes','shetland','open'],['faroes','iceland_east','open']];
    const clocks = pairs.map(function (p) {
      const q = FB.armyLegQuote(s,{realm:'na_survey_court',men:1},p[0],p[1]);
      return FB.waterCrossing(p[0],p[1]) === p[2] && FB.waterCrossing(p[1],p[0]) === p[2] &&
        !!FB.world.adj[p[0]][p[1]] && !!FB.world.adj[p[1]][p[0]] &&
        q.water && q.crossingClass === p[2] && q.totalDays === q.cycles * q.cycleDays &&
        q.cycleDays >= 1 && FB.landRouteUnits(p[0],p[1]) === 1 &&
        FB.travelNextLegDays({currentId:p[0],remainingRoute:[p[1]],legDays:3}) === 3;
    });
    return {save:FB.save.serialize(),clocks:clocks,pure:rng === FB.getRngState() && uid === FB.getUidCounter(),
      noShortcut:!FB.waterCrossing('faroes','iceland_southwest'),
      stamp:[s.start.id,s.start.revision,s.start.geography]};
  });
  expect(saved.clocks).toEqual(Array(7).fill(true));
  expect(saved.pure).toBe(true);
  expect(saved.noShortcut).toBe(true);
  expect(saved.stamp).toEqual(['na_survey','baseline','europe_north_atlantic_2']);
  for (const source of [old,saved.save,old,saved.save]) {
    const start = JSON.parse(source).state.start;
    expect(await activate(page,start.id,start.revision,start.geography)).toBe(null);
    expect(await page.evaluate(function (json) {
      const data = JSON.parse(json);
      FB.save.restore(data);
      const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
      const bad = JSON.parse(json);
      bad.state.start.geography = data.state.start.geography === 'europe_regional'
        ? 'europe_north_atlantic_2' : 'europe_regional';
      let rejected = false;
      try { FB.save.restore(bad); } catch (error) { rejected = true; }
      return {geography:FB.activeGeographyId,start:FB.state.start.geography,
        width:FB.world.W,household:FB.state.player.provinceId,
        rejected:rejected,pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },source)).toEqual({geography:start.geography,start:start.geography,
      width:start.id === 'na_survey' ? 1290 : 1100,
      household:start.id === 'na_survey' ? 'faroes' : 'london',rejected:true,pure:true});
  }
});
