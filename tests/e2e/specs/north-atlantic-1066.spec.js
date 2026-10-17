'use strict';
const {test, expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');

dependsOnRuntime(__filename, [
  'index.html', 'data/bookmark_1066_north_atlantic.js', 'data/geography_north_atlantic.js',
  'data/geographies.js', 'data/geography_expansion.js', 'data/bookmarks.js',
  'data/bookmark_1066_inhabited.js', 'data/government_rollout.js', 'data/christian_rollout.js',
  'data/islamic_profiles.js', 'data/islamic_institutions.js', 'data/islamic_rollout.js',
  'data/religious_activities.js', 'data/religious_institutions.js', 'data/assembly_polities.js',
  'data/settlements.js', 'data/settlements_real.js', 'data/eras.js', 'data/climate.js',
  'data/starts.js', 'data/starts_claimants_1066.js', 'data/story_households_1066.js',
  'data/start_ambitions.js', 'data/technology.js', 'data/map_data.js', 'data/counties.js',
  'js/world.js', 'js/main.js', 'js/starts.js', 'js/mods.js', 'js/settlement.js', 'js/util.js',
  'js/governments.js', 'js/government_support.js', 'js/government_collective.js',
  'js/government_assembly.js', 'js/government_continuity.js', 'js/authority.js',
  'js/treasury.js', 'js/bookmark_setup.js', 'js/model.js', 'js/travel.js', 'js/armies.js',
  'js/mapview.js', 'js/save.js', 'js/save_v4.js', 'js/stories.js', 'js/climate.js'
]);
const SOURCE = 'inhabited_v2_governments_v2_islamic_v1_institutions_v1';
const REVISION = 'north_atlantic_v1';
const GEOGRAPHY = 'europe_north_atlantic_2';
const INHABITED = ['iceland_southwest','iceland_west','iceland_northwest','iceland_north',
  'iceland_east','iceland_south','faroes','orkney','shetland','caithness'];

async function activate(page, revision, geography) {
  return page.evaluate(function (input) {
    return new Promise(function (resolve) {
      const options = {revision:input.revision};
      if (input.geography) options.geography = input.geography;
      FB.activateBookmark('1066', null, function (error) {
        resolve(error ? error.message : null);
      }, options);
    });
  }, {revision,geography});
}

async function startIslands(page, info, county) {
  await page.addInitScript(function (revision) {
    document.addEventListener('DOMContentLoaded', function () {
      FBDATA.bookmarks['1066'].revision = revision;
    }, {once:true});
  }, REVISION);
  await startHistoricalGame(page, info, {bookmark:'1066',
    code:'ISLANDS1066-1066-farmer-' + (county || 'iceland_southwest') + '-m-Review-established'});
}

test('the opt-in revision preserves its full source and exact offers without promoting the map', async function ({page}, info) {
  await openGame(page, info);
  expect(await page.evaluate(function (input) {
    const source = FB.bookmark('1066',input.source), b = FB.bookmark('1066',input.revision);
    const layout = FBDATA.settlementLayouts[b.settlementLayout];
    const sourceLayout = FBDATA.settlementLayouts[source.settlementLayout];
    const unchanged = ['empires','localInstitutions','religiousHeads','starts','startLocations',
      'stories','storyRegions','scripted'];
    const before = JSON.stringify(FBDATA.bookmarks), rng = FB.getRngState(), uid = FB.getUidCounter();
    const faults = FB.validateBookmark(b);
    const offers = [FBDATA.religiousActivities,FBDATA.religiousPatronage].every(function (table) {
      return Object.keys(table).every(function (id) {
        const scopes = table[id].openings || [];
        function count(revision) {
          return scopes.filter(function (o) { return o.id === '1066' && o.revision === revision; }).length;
        }
        return count(input.revision) === (count(input.source) ? 1 : 0);
      });
    });
    return {faults, offers, count:b.provinces.length,
      fresh:[FBDATA.bookmarks['1066'].revision,FB.bookmark('1066').geography],
      root:[FB.bookmark('1066','baseline').provinces.length,FB.bookmark('1066','baseline').geography],
      prefix:JSON.stringify(b.provinces.slice(0,source.provinces.length)) === JSON.stringify(source.provinces),
      courts:JSON.stringify(b.realms.slice(0,source.realms.length)) === JSON.stringify(source.realms),
      unchanged:unchanged.every(function (key) { return JSON.stringify(b[key]) === JSON.stringify(source[key]); }),
      independent:b.provinces !== source.provinces && b.provinces[0] !== source.provinces[0] &&
        b.localInstitutions !== source.localInstitutions && b.climate !== source.climate &&
        b.climate.provinces !== source.climate.provinces,
      slots:Object.keys(sourceLayout).every(function (pid) {
        return JSON.stringify(layout[pid]) === JSON.stringify(sourceLayout[pid]) && layout[pid] !== sourceLayout[pid];
      }),
      opening:Object.keys(source.opening.actors).every(function (id) {
        return JSON.stringify(b.opening.actors[id]) === JSON.stringify(source.opening.actors[id]);
      }) && ['appointments','estates','migrations'].every(function (key) {
        return JSON.stringify(b.opening[key]) === JSON.stringify(source.opening[key]);
      }) && JSON.stringify(b.opening.claims.slice(0,source.opening.claims.length)) === JSON.stringify(source.opening.claims),
      climate:Object.keys(source.climate.provinces).every(function (pid) {
        return b.climate.provinces[pid] === source.climate.provinces[pid];
      }),
      communities:input.inhabited.every(function (pid) {
        const p = b.provinces.find(function (r) { return r.id === pid; });
        return !p.wasteland && !!b.duchies[p.duchy] &&
          p.communities.reduce(function (n,c) { return n + c.populationShare0; },0) === 10000;
      }),
      scenic:b.provinces.slice(source.provinces.length).filter(function (p) { return p.wasteland; }).map(function (p) { return p.id; }).sort(),
      pure:before === JSON.stringify(FBDATA.bookmarks) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  }, {source:SOURCE,revision:REVISION,inhabited:INHABITED})).toEqual({
    faults:[], offers:true, count:540,
    fresh:['governments_v2_islamic_v1_institutions_v1','europe_regional'],root:[498,'europe_regional'],
    prefix:true,courts:true,unchanged:true,independent:true,slots:true,opening:true,climate:true,communities:true,
    scenic:['iceland_central_highlands','iceland_southeast_highlands','iceland_west_highlands'],pure:true
  });
});

test('local assemblies and the single earldom court initialize their documented powers and both brothers', async function ({page}, info) {
  await startIslands(page, info);
  expect(await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support;
    const iceland = C.row(s,'iceland_commonwealth_1066'), faroes = C.row(s,'faroes_households_1066');
    const court = s.realms.orkney_earldom_1066;
    const erl = FB.authoredRoyalMemberSnapshot(s,'orkney_earldom_1066','erlend');
    const paul = court.succession.members[court.succession.rulerMemberId];
    const erlend = erl && s.chars[erl.charId];
    const claims = s.bookmarkSetup.claims.filter(function (c) {
      return ['norwegian_island_demand_1066','scottish_caithness_demand_1066'].indexOf(c.id) >= 0;
    });
    const profile = FBDATA.constituencyProfiles[iceland.profileId];
    const rng = FB.getRngState(), uid = FB.getUidCounter(), before = JSON.stringify(s);
    const denied = C.duesQuote(s,'iceland_commonwealth_1066',{amount:1,duration:90});
    return {stamp:[s.start.id,s.start.revision,s.start.geography],
      iceland:{scopes:iceland.scopes.length,mandate:!!iceland.mandate,
        term:iceland.mandate.endTurn - iceland.mandate.startTurn,
        powers:profile.powers,obligations:profile.obligations,royal:!!s.realms.iceland_commonwealth_1066.succession},
      faroes:{mandate:!!faroes.mandate,holder:s.holder.faroes,liege:s.realms.faroes_households_1066.liege || null},
      brothers:!!erlend && !erlend.dead && !s.chars[paul.charId].dead &&
        erlend.name === 'Erlend Thorfinnsson' && court.ruler.name === 'Paul Thorfinnsson' &&
        erl.siblingIds.indexOf(paul.id) >= 0 && paul.siblingIds.indexOf(erl.id) >= 0 &&
        erlend.homeProvinceId === 'orkney',
      erlendCourts:Object.values(s.realms).filter(function (r) { return r.ruler && r.ruler.name === 'Erlend Thorfinnsson'; }).length,
      noInventedSpouses:!s.chars[paul.charId].spouseId && !erlend.spouseId,
      claimed:claims.map(function (c) { return [c.realmId,c.countyIds,c.status,c.contractId]; }),
      noForcedWar:!court.war && !s.realms.faroes_households_1066.war && !s.realms.iceland_commonwealth_1066.war,
      duesDenied:denied.allowed === false,
      pure:before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({stamp:['1066',REVISION,GEOGRAPHY],
    iceland:{scopes:6,mandate:true,term:1080,powers:['peace'],
      obligations:{revenueRate:0,levyRate:0,maxDues:0,maxLevy:0,reserve:0},royal:false},
    faroes:{mandate:true,holder:'faroes_households_1066',liege:null},brothers:true,erlendCourts:0,noInventedSpouses:true,
    claimed:[['norway_1066',['faroes','orkney','shetland'],'demanded',null],
      ['scotland_1066',['caithness'],'demanded',null]],noForcedWar:true,duesDenied:true,pure:true});
});

test('the adopting raster has inhabited sites, seven water edges and independent cached projections', async function ({page}, info) {
  await openGame(page, info);
  const sequence = [['baseline',1100,false],[SOURCE,1100,false],[REVISION,1290,true],
    [SOURCE,1100,false],[REVISION,1290,true],['baseline',1100,false]];
  for (const row of sequence) {
    expect(await activate(page,row[0])).toBe(null);
    expect(await page.evaluate(function (input) {
      const w = FB.world, b = FB.activeBookmark;
      window.__island1066Worlds = window.__island1066Worlds || {};
      const previous = window.__island1066Worlds[b.revision];
      window.__island1066Worlds[b.revision] = w;
      const pairs = [['bergen','shetland','open'],['orkney','shetland','open'],
        ['caithness','orkney','coastal'],['caithness','lewis','open'],['faroes','lewis','open'],
        ['faroes','shetland','open'],['faroes','iceland_east','open']];
      const sites = w.sites.filter(function (site) { return input.ids.indexOf(site.pid) >= 0; });
      return {width:w.W,projection:FB.proj.W === w.W && FB.proj.H === w.H,
        cached:!previous || previous === w,island:!!w.byId.faroes,
        hit:FB.provinceAtGrid(w.byId.bergen.sx,w.byId.bergen.sy).id,
        rows:input.active ? input.ids.every(function (id) {
          const p = w.byId[id]; return p && !p.wasteland && p.area > 0 && FB.provinceAtGrid(p.sx,p.sy).id === id;
        }) : true,
        sites:input.active ? sites.length === 10 && sites.every(function (site) {
          const p = FB.provinceAtGrid(site.x,site.y);
          return site.authored && p && p.id === site.pid && site.snap <= FB.mapScale('siteSnapMax');
        }) : sites.length === 0,
        crossings:pairs.every(function (p) {
          return input.active ? FB.waterCrossing(p[0],p[1]) === p[2] && FB.waterCrossing(p[1],p[0]) === p[2] &&
            !!w.adj[p[0]][p[1]] && !!w.adj[p[1]][p[0]] && FB.landRouteUnits(p[0],p[1]) === 1 :
            FB.waterCrossing(p[0],p[1]) === null;
        }),noShortcut:!FB.waterCrossing('faroes','iceland_southwest')};
    }, {active:row[2],ids:INHABITED})).toEqual({width:row[1],projection:true,cached:true,island:row[2],
      hit:'bergen',rows:true,sites:true,crossings:true,noShortcut:true});
  }
  expect(await activate(page,REVISION,'europe_regional')).toContain('does not match');
  expect(await page.evaluate(function () { return FB.activeBookmark.revision; })).toBe('baseline');
});

test('matching island saves preserve people and refuse mismatched geography stamps', async function ({page}, info) {
  await startIslands(page, info, 'faroes');
  const save = await page.evaluate(function () { return FB.save.serialize(); });
  const before = await page.evaluate(function () {
    return JSON.stringify([FB.state.owner,FB.state.holder,FB.state.governmentSupport,
      FB.state.realms.orkney_earldom_1066.succession,FB.state.bookmarkSetup]);
  });
  expect(await activate(page,'baseline')).toBe(null);
  expect(await activate(page,REVISION,GEOGRAPHY)).toBe(null);
  expect(await page.evaluate(function (input) {
    FB.save.restore(JSON.parse(input.save));
    const s = FB.state;
    const matching = input.before === JSON.stringify([s.owner,s.holder,s.governmentSupport,
      s.realms.orkney_earldom_1066.succession,s.bookmarkSetup]);
    const rows = Object.keys(s.chars).length;
    const erlend = FB.authoredRoyalMemberSnapshot(s,'orkney_earldom_1066','erlend');
    const id = erlend.charId;
    FB.save.restore(JSON.parse(FB.save.serialize()));
    const stable = id === FB.authoredRoyalMemberSnapshot(FB.state,'orkney_earldom_1066','erlend').charId &&
      rows === Object.keys(FB.state.chars).length;
    const snapshot = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = [['north_atlantic_v1','europe_regional'],
      ['north_atlantic_v1','europe_regional_2'],['baseline','europe_north_atlantic_2']].every(function (pair) {
      const bad = JSON.parse(input.save);
      bad.state.start.revision = pair[0]; bad.state.start.geography = pair[1];
      try { FB.save.restore(bad); return false; } catch (error) { return true; }
    });
    return {matching,stable,rejected,pure:snapshot === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  }, {save,before})).toEqual({matching:true,stable:true,rejected:true,pure:true});
});

test('retained saves do not acquire island people, counties or optional assembly records', async function ({page}, info) {
  await page.addInitScript(function () {
    document.addEventListener('DOMContentLoaded', function () {
      FBDATA.bookmarks['1066'].revision = 'baseline';
    }, {once:true});
  });
  await startHistoricalGame(page,info,{bookmark:'1066',code:'RETAINED1066-1066-farmer-london-m-Review-established'});
  expect(await page.evaluate(function () {
    const saved = JSON.parse(FB.save.serialize());
    // Explicitly remove a saved optional record: restore must not create a new opening.
    delete saved.state.governmentSupport;
    FB.save.restore(saved);
    return {revision:FB.state.start.revision,geography:FB.state.start.geography,
      court:!!FB.state.realms.orkney_earldom_1066,delegates:!!FB.state.governmentSupport,
      county:!!FB.world.byId.faroes};
  })).toEqual({revision:'baseline',geography:'europe_regional',court:false,delegates:false,county:false});
});

test('ordinary JSON imports can vary the assembly policy and reject invalid island references without publication', async function ({page}, info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const copy = function (v) { return JSON.parse(JSON.stringify(v)); };
    const root = FBDATA.bookmarks['1066'], before = JSON.stringify(root), rng = FB.getRngState(), uid = FB.getUidCounter();
    const bad = [];
    let candidate = copy(root);
    candidate.revisions.north_atlantic_v1.realms.find(function (r) { return r.id === 'orkney_earldom_1066'; })
      .royalCourt.members.find(function (m) { return m.id === 'erlend'; }).siblingIds = [];
    bad.push(candidate);
    candidate = copy(root);
    candidate.revisions.north_atlantic_v1.realms.find(function (r) { return r.id === 'iceland_commonwealth_1066'; })
      .constituency = 'missing_island_constituency';
    bad.push(candidate);
    candidate = copy(root);
    candidate.revisions.north_atlantic_v1.straits.push(['faroes','missing_island_county']);
    bad.push(candidate);
    return bad.map(function (b) {
      return FB.mods.validate({name:'Rejected island survey',bookmarks:{'1066':b}}).length > 0 &&
        before === JSON.stringify(root) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual([true,true,true]);
  expect(await page.evaluate(function () {
    const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['1066']));
    const profile = JSON.parse(JSON.stringify(FBDATA.constituencyProfiles.iceland_commonwealth_1066));
    profile.selection.termDays = 720;
    profile.selection.threshold = 0.6;
    profile.members[0].weight = 1;
    const r = b.revisions.north_atlantic_v1.realms.find(function (r) { return r.id === 'iceland_commonwealth_1066'; });
    r.constituency = 'island_review_voice';
    b.revision = 'north_atlantic_v1';
    const text = JSON.stringify({name:'Island assembly variation',bookmarks:{'1066':b},
      constituencyProfiles:{island_review_voice:profile}});
    const errors = FB.mods.validate(JSON.parse(text));
    if (errors.length) throw new Error(errors.join('\n'));
    return FB.mods.store(text);
  })).not.toBe(false);
  await page.waitForFunction(function () {
    return window.FB && FB.game && FB.game.bootReady && !!FBDATA.constituencyProfiles.island_review_voice;
  });
  expect(await activate(page,REVISION)).toBe(null);
  expect(await page.evaluate(function () {
    const b = FB.activeBookmark, p = FBDATA.constituencyProfiles.island_review_voice;
    return {faults:FB.validateBookmark(b),profile:b.realms.find(function (r) {
      return r.id === 'iceland_commonwealth_1066';
    }).constituency,term:p.selection.termDays,threshold:p.selection.threshold,
    weight:p.members[0].weight,noNewCapability:!p.obligations.maxLevy};
  })).toEqual({faults:[],profile:'island_review_voice',term:720,threshold:0.6,weight:1,noNewCapability:true});
  await startHistoricalGame(page,info,{bookmark:'1066',
    code:'IMPORTEDISLANDS-1066-farmer-iceland_southwest-m-Review-established'});
  expect(await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support, r = C.row(s,'iceland_commonwealth_1066');
    return {profile:r.profileId,actualTerm:r.mandate.endTurn - r.mandate.startTurn,
      scopes:r.scopes.length,holder:s.holder.iceland_southwest,
      duesDenied:C.duesQuote(s,r.id,{amount:1,duration:90}).allowed === false,
      defaultProfileUnchanged:FBDATA.constituencyProfiles.iceland_commonwealth_1066.selection.termDays};
  })).toEqual({profile:'island_review_voice',actualTerm:720,scopes:6,holder:'iceland_commonwealth_1066',
    duesDenied:true,defaultProfileUnchanged:1080});
});
