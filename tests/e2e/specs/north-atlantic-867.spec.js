'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startDeterministicGame} = require('../support/game/start');
const {mockCrazyGames} = require('../support/crazygames');
const {openCrazyGame} = require('../support/game/crazygames-title');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_867_north_atlantic.js','data/bookmarks.js',
  'data/bookmark_867_expansion.js','data/geographies.js','data/geography_expansion.js',
  'data/geography_north_atlantic.js','data/map_data.js','data/counties.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/climate.js',
  'data/government_rollout.js','data/christian_rollout.js','data/islamic_profiles.js',
  'data/islamic_rollout.js','data/islamic_institutions.js','data/african_religious_rollout.js',
  'data/religious_activities.js','data/religious_institutions.js','data/communal_revisions.js',
  'data/story_instances.js','data/start_ambitions.js','data/starts.js','data/eras.js',
  'data/political_institutions.js','data/technology.js','data/distribution_crazygames.js',
  'js/world.js','js/main.js','js/mods.js','js/starts.js','js/climate.js',
  'js/governments.js','js/authority.js','js/armies.js','js/travel.js','js/mapview.js',
  'js/save.js','js/save_v4.js','js/religious_activities.js','js/religious_institutions.js',
  'js/crazygames.js','js/stories.js','js/util.js'
]);

const SOURCE = 'inhabited_v2_governments_v2_islamic_v1';
const REVISION = 'north_atlantic_v1';
const PLACES = ['faroes','orkney','shetland','caithness'];

async function activate(page,revision,geography) {
  return page.evaluate(function (input) {
    return new Promise(function (resolve) {
      const options = {revision:input.revision};
      if (input.geography) options.geography = input.geography;
      FB.activateBookmark('867',null,function (error) { resolve(error ? error.message : null); },options);
    });
  },{revision:revision,geography:geography});
}

async function beginRevision(page,provinceId) {
  expect(await activate(page,REVISION)).toBe(null);
  await page.evaluate(function (pid) {
    FB.startProgression.noteTier(1);
    FB.game.pending = {seed:'NORTHATLANTIC867',bookmarkId:'867',name:'Review',sex:'m',
      scenario:FBDATA.startScenarios.find(function (s) { return s.id === 'farmer'; })};
    FB.game.pickMode = true;
    if (!FB.game.pickProvince(FB.world.byId[pid]) || !FB.game.pickSettlement({pid:pid,index:0}))
      throw new Error('North Atlantic birthplace unavailable: ' + pid);
  },provinceId);
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your Story Begins',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true);
    FB.game.uiPrefs.hideTips = true;
    if (FB.ui.coachmarkReset) FB.ui.coachmarkReset();
    delete FB.state.player.flags.tutorial;
  });
}

test('the opt-in world retains complete effective source fields, slots and fresh selections',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (sourceId) {
    const source = FB.bookmark('867',sourceId), b = FB.bookmark('867','north_atlantic_v1');
    const oldLayout = FBDATA.settlementLayouts[source.settlementLayout];
    const layout = FBDATA.settlementLayouts[b.settlementLayout];
    const unchanged = ['opening','openingRevision','openingRevisions','openingLegacyRevision',
      'localInstitutions','religiousHeads','starts','stories','storyRegions','scripted','startLocations'];
    const child = FB.geography('europe_north_atlantic_2');
    const keys = b.straits.map(function (p) { return p.slice().sort().join('|'); });
    return {
      faults:FB.validateBookmark(FBDATA.bookmarks['867']),
      fresh:[FB.bookmark('867').revision,FB.bookmark('867').geography,FB.bookmark('867').provinces.length],
      laterFresh:[FB.bookmark('1066').revision,FB.bookmark('1066').geography],
      geography:b.geography,layout:b.settlementLayout,count:b.provinces.length,
      unique:new Set(b.provinces.map(function (p) { return p.id; })).size === 540,
      prefix:JSON.stringify(b.provinces.slice(0,source.provinces.length)) === JSON.stringify(source.provinces),
      courts:JSON.stringify(b.realms.slice(0,source.realms.length)) === JSON.stringify(source.realms),
      unchanged:unchanged.every(function (key) { return JSON.stringify(b[key]) === JSON.stringify(source[key]); }),
      titles:['duchies','kingdoms','empires'].every(function (key) {
        return Object.keys(source[key]).every(function (id) { return JSON.stringify(b[key][id]) === JSON.stringify(source[key][id]); });
      }),
      slots:Object.keys(oldLayout).every(function (id) { return JSON.stringify(layout[id]) === JSON.stringify(oldLayout[id]); }),
      independent:b.provinces !== source.provinces && b.provinces[0] !== source.provinces[0] &&
        b.realms[0] !== source.realms[0] && b.localInstitutions !== source.localInstitutions && layout.london !== oldLayout.london,
      climates:Object.keys(child.climate.provinces).every(function (id) {
        const overrides = source.climate && source.climate.provinces || {};
        return b.climate.provinces[id] === (overrides[id] || child.climate.provinces[id]);
      }),
      crossings:keys.length === new Set(keys).size && keys.length === source.straits.length + 6 &&
        source.straits.every(function (p) { return keys.includes(p.slice().sort().join('|')); }) &&
        Object.keys(source.crossingClasses).every(function (key) { return b.crossingClasses[key] === source.crossingClasses[key]; }),
      sourceRows:source.provinces.length,
      physicalRows:b.provinces.map(function (p) { return p.id; }).join('|') === child.provinces.map(function (p) { return p.id; }).join('|'),
      tech:FBDATA.techImpactReviews.features.period_867_north_atlantic_habitation.mode
    };
  },SOURCE);
  expect(result).toEqual({faults:[],fresh:['governments_v2_islamic_v1','europe_regional',498],
    laterFresh:['governments_v2_islamic_v1_institutions_v1','europe_regional'],
    geography:'europe_north_atlantic_2',layout:'867_north_atlantic_v1',count:540,unique:true,
    prefix:true,courts:true,unchanged:true,titles:true,slots:true,independent:true,climates:true,
    crossings:true,sourceRows:527,physicalRows:true,tech:'none'});
});

test('the dated population and authority declarations leave all Icelandic openings scenic',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (places) {
    const b = FB.bookmark('867','north_atlantic_v1');
    const scenic = b.provinces.filter(function (p) { return p.id.indexOf('iceland_') === 0; });
    const counties = places.map(function (id) { return b.provinces.find(function (p) { return p.id === id; }); });
    return {
      scenic:scenic.length === 9 && scenic.every(function (p) {
        return p.wasteland && !p.realm && !p.communities && !p.settlements &&
          !FBDATA.settlementLayouts[b.settlementLayout][p.id];
      }),
      weights:counties.map(function (p) { return p.communities.map(function (c) { return c.populationShare0; }); }),
      courts:counties.every(function (p) {
        const r = b.realms.find(function (r) { return r.id === p.realm; });
        return !p.wasteland && r && r.capital === p.id && r.rank === 1 && !r.liege &&
          r.government === 'territorial' && r.ruler.generated && !r.ruler.name && !r.royalCourt &&
          p.communities.every(function (c) { return c.paired; });
      }),
      native:FBDATA.cultures.northern_british_867.parent,
      noNewTrack:JSON.stringify(b.stories) === JSON.stringify(FB.bookmark('867','inhabited_v2_governments_v2_islamic_v1').stories),
      noGateway:b.straits.every(function (p) { return p.every(function (id) { return id.indexOf('iceland_') !== 0; }); }),
      sites:places.map(function (id) { return FBDATA.settlementLayouts[b.settlementLayout][id][0].kind; })
    };
  },PLACES)).toEqual({scenic:true,weights:[[10000],[5000,5000],[5000,5000],[10000]],courts:true,
    native:'brezhon',noNewTrack:true,noGateway:true,sites:Array(4).fill('village')});
});

test('source religious offers gain only the new exact revision scope',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (sourceId) {
    let eligible = 0, unrelated = 0;
    const faults = FB.religiousActivityCatalogFaults(FBDATA);
    const matches = [FBDATA.religiousActivities,FBDATA.religiousPatronage].every(function (table) {
      return Object.keys(table).every(function (id) {
        const scopes = table[id].openings || [];
        const source = scopes.filter(function (o) { return o.id === '867' && o.revision === sourceId; });
        const added = scopes.filter(function (o) { return o.id === '867' && o.revision === 'north_atlantic_v1'; });
        if (source.length) eligible++;
        else if (scopes.length) unrelated++;
        return added.length === (source.length ? 1 : 0) && new Set(scopes.map(function (o) { return o.id + '/' + o.revision; })).size === scopes.length;
      });
    });
    return {matches:matches,eligible:eligible,unrelated:unrelated,faults:faults};
  },SOURCE);
  expect(result.matches).toBe(true);
  expect(result.eligible).toBeGreaterThan(0);
  expect(result.unrelated).toBeGreaterThan(0);
  expect(result.faults).toEqual([]);
});

test('ordinary detached JSON validation accepts the revision and rejects broken references without mutation',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    function candidate() { return JSON.parse(JSON.stringify({bookmarks:{'867':FBDATA.bookmarks['867']}})); }
    const before = JSON.stringify(FBDATA.bookmarks), rng = FB.getRngState(), uid = FB.getUidCounter();
    const good = FB.mods.validate(candidate());
    const bad = [];
    let mod = candidate();
    mod.bookmarks['867'].revisions.north_atlantic_v1.provinces.find(function (p) { return p.id === 'orkney'; }).realm = 'missing_island_court';
    bad.push(FB.mods.validate(mod).length > 0);
    mod = candidate();
    mod.bookmarks['867'].revisions.north_atlantic_v1.straits.push(['faroes','missing_island']);
    bad.push(FB.mods.validate(mod).length > 0);
    mod = candidate();
    mod.bookmarks['867'].revisions.north_atlantic_v1.localInstitutions.invalid_island_see = {
      city:'Island see',kind:'see',provinceId:'iceland_east',site:'kvivik_farm_site',religion:'catholic',culture:'norse',vacant:true
    };
    bad.push(FB.mods.validate(mod).length > 0);
    return {good:good,bad:bad,pure:before === JSON.stringify(FBDATA.bookmarks) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({good:[],bad:[true,true,true],pure:true});
});

for (const crazy of [false,true]) test('the island world creates ordinary local authority and six water edges, distribution ' + crazy,async function ({page},info) {
  if (crazy) {
    await mockCrazyGames(page);
    await page.addInitScript(function () { window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage'; });
    await openCrazyGame(page,info);
  } else await openGame(page,info);
  await beginRevision(page,'faroes');
  expect(await page.evaluate(function (places) {
    const s = FB.state, b = FB.campaignBookmark(s), w = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const pairs = [['bergen','shetland','open'],['orkney','shetland','open'],['caithness','orkney','coastal'],
      ['caithness','lewis','open'],['faroes','lewis','open'],['faroes','shetland','open']];
    const clocks = pairs.every(function (p) {
      const q = FB.armyLegQuote(s,{realm:'faroes_local_867',men:1},p[0],p[1]);
      return !!w.adj[p[0]][p[1]] && !!w.adj[p[1]][p[0]] && FB.waterCrossing(p[0],p[1]) === p[2] &&
        FB.waterCrossing(p[1],p[0]) === p[2] && q.water && q.crossingClass === p[2] &&
        FB.landRouteUnits(p[0],p[1]) === 1 &&
        FB.travelNextLegDays({currentId:p[0],remainingRoute:[p[1]],legDays:3}) === 3;
    });
    const courts = places.every(function (id) {
      const r = b.realms.find(function (r) { return r.capital === id; });
      const c = FB.realmRulerCharacterSnapshot(s,r.id);
      return s.owner[id] === r.id && s.holder[id] === r.id && c && c.generated && !c.dead &&
        FB.governments.forRealm(s,r.id).id === 'territorial';
    });
    const sites = places.every(function (id) {
      const slot = FBDATA.settlementLayouts[b.settlementLayout][id][0];
      const site = w.sites.find(function (s) { return s.site === slot.site; });
      const at = site && FB.provinceAtGrid(site.x,site.y);
      return site && site.pid === id && site.authored && at && at.id === id && site.snap <= FB.mapScale('siteSnapMax');
    });
    const beforePick = JSON.stringify(FB.game.pending);
    const rejectsIceland = b.provinces.filter(function (p) { return p.id.indexOf('iceland_') === 0; }).every(function (p) {
      return FB.game.pickProvince(w.byId[p.id]) === false;
    }) && beforePick === JSON.stringify(FB.game.pending);
    return {stamp:[s.start.id,s.start.revision,s.start.geography],width:w.W,height:w.H,
      home:s.player.provinceId,courts:courts,sites:sites,clocks:clocks,
      scenic:b.provinces.filter(function (p) { return p.id.indexOf('iceland_') === 0; }).every(function (p) {
        return w.byId[p.id].wasteland && !s.owner[p.id] && !s.holder[p.id];
      }),
      noGateway:!FB.waterCrossing('faroes','iceland_east') && !FB.waterCrossing('faroes','iceland_southwest'),
      routes:JSON.stringify(FB.travelRoute('faroes','shetland')) === JSON.stringify(['shetland']) &&
        FB.travelRoute('faroes','iceland_east') === null,
      rejectsIceland:rejectsIceland,
      fresh:FB.bookmark('867').revision,distribution:FB.platform.isCrazyGames,
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  },PLACES)).toEqual({stamp:['867',REVISION,'europe_north_atlantic_2'],width:1290,height:1078,home:'faroes',
    courts:true,sites:true,clocks:true,scenic:true,noGateway:true,routes:true,rejectsIceland:true,
    fresh:'governments_v2_islamic_v1',distribution:crazy,pure:true});
});

test('the retained Ibrim congregation and its actual activity remain usable',async function ({page},info) {
  await openGame(page,info);
  await beginRevision(page,'qasr_ibrim');
  expect(await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 20;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    const q = FB.religiousActivityQuote(s,'ibrim_service_867',s.player.charId);
    const institution = FB.religiousInstitutionSnapshot(s,'ibrim_service_867');
    return {allowed:q && q.allowed,cost:q && q.cost,institution:institution && institution.available,
      home:s.player.provinceId,faith:s.chars[s.player.charId].religion,
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({allowed:true,cost:2,institution:true,home:'qasr_ibrim',faith:'eastern',pure:true});
});

test('retained, expanded and island maps switch and restore with matching revision stamps',async function ({page},info) {
  await openGame(page,info);
  await startDeterministicGame(page);
  const old = await page.evaluate(function () { FB.game.setPaused(true); return FB.save.serialize(); });
  await beginRevision(page,'faroes');
  const fresh = await page.evaluate(function () { return FB.save.serialize(); });
  for (const revision of ['baseline',SOURCE,REVISION,SOURCE,'baseline',REVISION]) {
    expect(await activate(page,revision)).toBe(null);
    expect(await page.evaluate(function () {
      window.__north867Worlds = window.__north867Worlds || {};
      const key = FB.activeBookmark.revision, previous = window.__north867Worlds[key];
      window.__north867Worlds[key] = FB.world;
      const p = FB.world.byId.bergen;
      return {width:FB.world.W,projection:FB.proj.W === FB.world.W && FB.proj.H === FB.world.H,
        cached:!previous || previous === FB.world,hit:FB.provinceAtGrid(p.sx,p.sy).id,
        added:!!FB.world.byId.faroes,gateway:FB.waterCrossing('faroes','iceland_east')};
    })).toEqual({width:revision === REVISION ? 1290 : 1100,projection:true,cached:true,
      hit:'bergen',added:revision === REVISION,gateway:null});
  }
  for (const source of [old,fresh,old,fresh]) {
    const start = JSON.parse(source).state.start;
    expect(await activate(page,start.revision,start.geography)).toBe(null);
    expect(await page.evaluate(function (json) {
      const data = JSON.parse(json);
      FB.save.restore(data);
      const before = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
      const wrong = JSON.parse(json);
      wrong.state.start.geography = data.state.start.geography === 'europe_regional' ? 'europe_north_atlantic_2' : 'europe_regional';
      let rejected = false;
      try { FB.save.restore(wrong); } catch (error) { rejected = true; }
      return {revision:FB.state.start.revision,geography:FB.activeGeographyId,
        home:FB.state.player.provinceId,width:FB.world.W,rejected:rejected,
        pure:before === JSON.stringify(FB.state) && rng === FB.getRngState() && uid === FB.getUidCounter()};
    },source)).toEqual({revision:start.revision,geography:start.geography,
      home:start.revision === REVISION ? 'faroes' : 'london',width:start.revision === REVISION ? 1290 : 1100,rejected:true,pure:true});
  }
});
