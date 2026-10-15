'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const audit = require('../fixtures/711-terrain.json');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_711.js','data/bookmark_711_terrain.js','data/government_rollout.js',
  'data/bookmark_476_wider_identities.js','data/geography_expansion.js','data/geographies.js',
  'data/counties.js','data/climate.js','data/political_institutions.js','data/starts.js',
  'data/cultures.js','data/technology.js','data/travel.js','data/story_campaigns_711.js','data/story_instances.js',
  'js/world.js','js/main.js','js/model.js','js/population.js','js/settlement.js','js/climate.js',
  'js/travel.js','js/armies.js','js/governments.js','js/government_administration.js',
  'js/authority.js','js/lordships.js','js/treasury.js',
  'js/stories.js','js/story_campaign.js','js/story_polity_foundation.js','js/save.js','js/save_v4.js',
  'js/starts.js','js/technology.js','js/crazygames.js','data/distribution_crazygames.js'
]);

async function start(page,info,county,flag) {
  await startHistoricalGame(page,info,{bookmark:'711',
    code:'TERRAIN711-711-farmer-' + county + '-m-Review-established'},!!flag);
}

async function observe(page,revision,seed) {
  // Observe a resumable household so save checks do not compare an observer's
  // parentless placeholder against the ordinary household restore repairs.
  await page.evaluate(function (input) {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('711',null,function (error) {
        if (error) { reject(error); return; }
        FB.startProgression.noteTier(1);
        FB.game.pending = {seed:input.seed,bookmarkId:'711',name:'Observer',sex:'m',
          familyPreset:'established',scenario:FBDATA.startScenarios.find(function (row) { return row.id === 'farmer'; })};
        FB.game.pickMode = true;
        if (!FB.game.pickProvince(FB.world.byId.london) || !FB.game.pickSettlement({pid:'london',index:0})) {
          reject(new Error('Observer household birthplace was rejected')); return;
        }
        resolve();
      },{revision:input.revision});
    });
  },{revision:revision,seed:seed || 'TERRAIN711OBSERVER'});
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.evaluate(function () { FB.game.setPaused(true); });
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () { FB.game.observe = true; FB.game.setPaused(true); });
}

async function checkpoint(page,ceiling) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  expect(Buffer.byteLength(source,'utf8')).toBeLessThanOrEqual(ceiling);
  return source;
}

test('711 dates every physical addition and keeps earlier revisions independently resolvable',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (audit) {
    const raw = FBDATA.bookmarks['711'], b = FB.bookmark('711'), old = FB.bookmark('711','baseline');
    const government = FB.bookmark('711','governments_v2'), terrain = FB.bookmark('711','terrain_v2');
    const retained = audit.retained.concat([].concat.apply([],Object.values(audit.scenery)));
    return {
      faults:FB.validateBookmark(raw),technology:FB.validateTechnologyData(),
      revision:b.revision,geography:b.geography,count:b.provinces.length,
      inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
      inventory:audit.retained.concat(audit.districts.map(function (p) { return p.id; })).sort(),
      physical:FBDATA.geographies.europe_regional_2.provinceAdditions.map(function (p) { return p.id; }).sort(),
      retained:retained.every(function (id) {
        const p = b.provinces.find(function (p) { return p.id === id; });
        return p.wasteland && !p.realm && !p.communities && !p.settlements;
      }),
      original:old.geography === 'europe_regional' && old.provinces.length === 498 &&
        JSON.stringify(old.provinces) === JSON.stringify(raw.provinces),
      government:government.geography === old.geography &&
        JSON.stringify(government.provinces) === JSON.stringify(old.provinces) &&
        government.realms.length === old.realms.length &&
        government.realms.find(function (r) { return r.id === 'umayyad_711'; }).government === 'administrative_monarchy',
      composed:JSON.stringify(terrain.provinces) === JSON.stringify(b.provinces) &&
        b.realms.find(function (r) { return r.id === 'byzantium_711'; }).government === 'administrative_monarchy' &&
        b.realms.find(function (r) { return r.id === 'visigoths_711'; }).government === 'elective_monarchy',
      unchanged:old.provinces.every(function (p) {
        return p.id === 'w_steppe_e' || JSON.stringify(p) === JSON.stringify(b.provinces.find(function (n) { return n.id === p.id; }));
      }),
      stories:JSON.stringify(b.stories) === JSON.stringify(old.stories),
      institutions:Object.keys(old.localInstitutions).every(function (id) {
        return JSON.stringify(b.localInstitutions[id]) === JSON.stringify(old.localInstitutions[id]);
      }),
      addedInstitutions:Object.keys(b.localInstitutions).filter(function (id) {
        return !Object.prototype.hasOwnProperty.call(old.localInstitutions,id);
      }).sort(),
      newCongregations:['medina_congregation_711','sanaa_congregation_711'].map(function (id) {
        const d = b.localInstitutions[id];
        return [d.kind,d.provinceId,d.religion,d.vacant,d.freshOnly];
      }),
      generated:['middle_niger_711','niger_bend_711','ghadames_711','khwarazm_711'].every(function (id) {
        const r = b.realms.find(function (r) { return r.id === id; });
        return r.ruler.generated && !r.ruler.name && !r.liege;
      }),
      mode:FBDATA.techImpactReviews.features.period_711_terrain_habitation.mode
    };
  },audit);
  expect(result).toMatchObject({faults:[],technology:[],revision:audit.revision,geography:audit.geography,
    count:527,inhabited:485,retained:true,original:true,government:true,composed:true,
    unchanged:true,stories:true,institutions:true,generated:true,mode:'none'});
  expect(result.inventory).toEqual(result.physical);
  expect(result.addedInstitutions).toEqual(['medina_congregation_711','sanaa_congregation_711']);
  expect(result.newCongregations).toEqual([
    ['congregation','medina','sunni',true,true],['congregation','sanaa','sunni',true,true]
  ]);
});

for (const flag of [false,true]) test('711 district raster, residents and dry connections, distribution ' + flag,
  async function ({page},info) {
    await start(page,info,'kath_district',flag);
    const result = await page.evaluate(function (audit) {
      const s = FB.state,w = FB.world,b = FB.bookmark('711');
      const rows = audit.districts.map(function (d) {
        const p = w.byId[d.id], site = w.sitesByProv[d.id].list[0], next = d.route[0];
        let pixels = 0, bounded = true;
        for (let i = 0; i < w.grid.length; i++) if (w.grid[i] && w.provs[w.grid[i] - 1].id === d.id) {
          pixels++;
          const dx = i % w.W - p.sx,dy = Math.floor(i / w.W) - p.sy;
          if (dx * dx + dy * dy > p.radiusSq) bounded = false;
        }
        const cell = w.grid[Math.floor(site.y) * w.W + Math.floor(site.x)];
        const declared = b.provinces.find(function (p) { return p.id === d.id; });
        return {id:d.id,owner:s.owner[d.id],holder:!!s.realms[s.holder[d.id]],
          court:FB.governments.forRealm(s,d.court).id,climate:FB.climateZoneOf(d.id),
          population:s.population.counties[d.id].count > 0,
          shares:declared.communities.reduce(function (n,c) { return n + c.populationShare0; },0),
          site:site.site,authored:site.authored,snapped:site.snap <= FB.mapScale('siteSnapMax'),
          sameCounty:!!cell && w.provs[cell - 1].id === d.id,pixels:pixels,bounded:bounded,
          route:FB.landRouteUnits(d.id,next),dry:!FB.waterCrossing(d.id,next),
          connected:!!w.adj[d.id][next] && !!w.adj[next][d.id] && !w.byId[next].wasteland,
          reachable:FB.travelRoute(d.id,next).length > 0};
      });
      return {rows:rows,retained:audit.retained.every(function (id) {
        return w.byId[id].wasteland && !s.owner[id] && !s.holder[id] && !s.population.counties[id];
      }),steppe:w.byId.w_steppe_e.name,
      opening:[s.owner.malaga,s.owner.toledo,s.owner.narbonne,!!s.realms.asturias_711],
      faith:b.provinces.find(function (p) { return p.id === 'kath_district'; }).religion,
      nigerConnected:FB.travelRoute('jenne_district','kairouan').length > 0};
    },audit);
    for (let i = 0; i < audit.districts.length; i++) {
      const d = audit.districts[i],row = result.rows[i];
      expect(row).toMatchObject({id:d.id,owner:d.owner,holder:true,court:d.form,climate:d.climate,
        population:true,shares:10000,site:d.site,authored:true,snapped:true,sameCounty:true,
        bounded:true,route:d.route[1],dry:true,connected:true,reachable:true});
      expect(row.pixels).toBeGreaterThan(0);
    }
    expect(result).toMatchObject({retained:true,steppe:'Eastern steppe',faith:'zoroastrian',nigerConnected:true,
      opening:['visigoths_711','visigoths_711','achila_711',false]});
    const source = await checkpoint(page,4 * 1024 * 1024),before = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
  });

for (const d of audit.districts) test('local household and court at ' + d.id + ' survive one natural season',
  async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','Bounded regional journeys run once.');
    await start(page,info,d.id);
    expect(await page.evaluate(function (d) {
      const s = FB.state,me = s.chars[s.player.charId],r = FB.materializeRealmRuler(s,d.court);
      return {home:s.player.provinceId,alive:!!r && r.alive !== false,
        culture:me.culture === FB.world.byId[d.id].culture,
        faith:me.religion === FB.world.byId[d.id].religion,
        form:FB.governments.forRealm(s,d.court).id};
    },d)).toEqual({home:d.id,alive:true,culture:true,faith:true,form:d.form});
    await injectBrowserHarness(page);
    await advanceBookmark(page,45);
    const source = await checkpoint(page,6 * 1024 * 1024),midpoint = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(midpoint);
    await advanceBookmark(page,45);
    const finish = await facts(page),final = await checkpoint(page,6 * 1024 * 1024);
    await restoreBookmark(page,source);
    await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(finish);
    await restoreBookmark(page,final);
    expect(await facts(page)).toEqual(finish);
  });

test('a Niger household keeps its paid journey across retained-world activation',async function ({page},info) {
  await start(page,info,'jenne_district');
  const source = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 1000;
    const destination = FB.travelDestinations(s,'expedition').find(function (d) {
      return d.destinationId === 'ghadames_oasis';
    });
    if (!destination || !FB.travelStart(s,'expedition',destination.destinationId,null))
      throw new Error('The Niger household cannot use the settled corridor');
    if (!s.player.travel || !s.player.travel.remainingRoute.length)
      throw new Error('Expected a journey still on the road');
    return FB.save.serialize();
  });
  const before = await facts(page);
  await observe(page,'governments_v2');
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
  expect(await page.evaluate(function (source) {
    const saved = JSON.parse(source),s = FB.state;
    return {travel:JSON.stringify(s.player.travel) === JSON.stringify(saved.state.player.travel),
      gold:s.player.gold === saved.state.player.gold,rng:(FB.getRngState() >>> 0) === (saved.rng >>> 0),
      uid:FB.getUidCounter() === saved.uid};
  },source)).toEqual({travel:true,gold:true,rng:true,uid:true});
});

test('Tadmor can receive a real public commission without transferring household property',async function ({page},info) {
  await start(page,info,'palmyra_district');
  expect(await page.evaluate(function () {
    const s = FB.state,c = s.chars[s.player.charId],rid = 'umayyad_711';
    c.unfree = false; c.born = 687; s.player.prestige = 1000;
    FB.SKILLS.forEach(function (k) { c.skills[k] = 20; });
    s.realms[rid].treasury.gold = 1000;
    const before = JSON.stringify([s.owner,s.holder,s.player.holdings]);
    const profile = FB.administrationProfile(s,rid);
    const q = FB.publicAppointmentQuote(s,{kind:'realm',id:rid},{institutionId:rid,
      officeId:profile.governor,holderId:c.id,provinceId:'palmyra_district',
      scope:{kind:'county',id:'palmyra_district'}});
    const appointment = FB.publicAppoint(s,q);
    if (!appointment) throw new Error(q.reason);
    const saved = FB.save.serialize(); FB.save.restore(JSON.parse(saved));
    return {appointed:!!appointment,property:before === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.player.holdings]),
      valid:FB.save.v4.validatePlatform(FB.state)};
  })).toEqual({appointed:true,property:true,valid:true});
});

for (const rid of ['middle_niger_711','niger_bend_711','ghadames_711','khwarazm_711','makuria_711','khurasan_711']) {
  test(rid + ' ordinary succession retains county rights and saved successor',async function ({page},info) {
    await start(page,info,'toledo');
    expect(await page.evaluate(function (rid) {
      const s = FB.state,r = s.realms[rid],old = FB.materializeRealmRuler(s,rid);
      const generation = r.succession.rulerGeneration,land = JSON.stringify([s.owner,s.holder]);
      FB.killChar(s,old);
      const successor = FB.materializeRealmRuler(s,rid),once = r.succession.rulerGeneration === generation + 1;
      const source = FB.save.serialize(); FB.save.restore(JSON.parse(source));
      const rng = FB.getRngState(),uid = FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {once:once,changed:successor.id !== old.id && successor.alive !== false,
        land:land === JSON.stringify([FB.state.owner,FB.state.holder]),
        restored:FB.realmRulerCharacterSnapshot(FB.state,rid).id === successor.id,
        pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    },rid)).toEqual({once:true,changed:true,land:true,restored:true,pure:true});
  });
}

test('expanded 711 observer advances a season and another seed does not contaminate replay',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','One bounded observer season.');
  await openGame(page,info);
  await observe(page,audit.revision,'711TERRAINFIRST');
  const first = await checkpoint(page,4 * 1024 * 1024);
  for (let batch = 0; batch < 3; batch++) await page.evaluate(function () {
    for (let day = 0; day < 30; day++) {
      const turn = FB.state.turn; FB.game.passDay({deferUi:true});
      if (FB.state.turn !== turn + 1) throw new Error('Observer failed to advance');
    }
  });
  const season = await facts(page),source = await checkpoint(page,6 * 1024 * 1024);
  expect(season.snapshot.readsArePure).toBe(true);
  await observe(page,audit.revision,'711TERRAINSECOND');
  expect(await page.evaluate(function () { return FB.state.seed; })).toBe('711TERRAINSECOND-711-farmer-london-m-Observer-established');
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(season);
  await restoreBookmark(page,first);
  expect(await page.evaluate(function () { return [FB.state.turn,FB.state.start.revision]; }))
    .toEqual([0,audit.revision]);
});

for (const revision of ['baseline','governments_v2']) test('retained ' + revision + ' frontier and stories survive expanded-world switching',
  async function ({page},info) {
    await openGame(page,info);
    await observe(page,revision);
    const prepared = await page.evaluate(function (revision) {
      const s = FB.state;
      s.player.gold = 5000; s.player.prestige = 500;
      FB.settleWaste(s,'w_karakum');
      if (FB.world.byId.w_karakum.wasteland) throw new Error('Frontier not settled');
      const data = JSON.parse(FB.save.serialize());
      if (revision === 'baseline') { data.platformSchema = 1; delete data.state.start.revision; }
      return {source:JSON.stringify(data),sites:JSON.stringify(FB.world.sitesByProv.w_karakum),
        records:JSON.stringify([s.population,s.wastelandSettlements,s.owner,s.holder,s.stories,s.localInstitutions,s.player.gold])};
    },revision);
    const before = await facts(page);
    expect(before.snapshot.readsArePure).toBe(true);
    await observe(page,audit.revision,'711EXPANDEDSWITCH');
    const expanded = await checkpoint(page,4 * 1024 * 1024),expandedFacts = await facts(page);
    await restoreBookmark(page,prepared.source);
    expect(await facts(page)).toEqual(before);
    expect(await page.evaluate(function () {
      const s = FB.state,rng = FB.getRngState(),uid = FB.getUidCounter();
      FB.restoreWastelandSettlements(s); FB.restoreWastelandSettlements(s);
      return {revision:s.start.revision,geography:s.start.geography,missing:!FB.world.byId.kath_district,
        sites:JSON.stringify(FB.world.sitesByProv.w_karakum),
        records:JSON.stringify([s.population,s.wastelandSettlements,s.owner,s.holder,s.stories,s.localInstitutions,s.player.gold]),
        pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
    })).toEqual({revision:revision,geography:'europe_regional',missing:true,
      sites:prepared.sites,records:prepared.records,pure:true});
    await restoreBookmark(page,expanded);
    expect(await facts(page)).toEqual(expandedFacts);
  });

test('mismatched and unknown expanded revisions reject before campaign adoption',async function ({page},info) {
  await start(page,info,'kath_district');
  expect(await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize()),live = FB.state,world = FB.world;
    const rng = FB.getRngState(),uid = FB.getUidCounter();
    return [function (d) { d.state.start.revision = 'missing_terrain'; },
      function (d) { d.state.start.revision = 'governments_v2'; },
      function (d) { d.state.start.geography = 'europe_regional'; }].map(function (change) {
        const d = JSON.parse(JSON.stringify(source)); change(d); const before = JSON.stringify(d);
        return FB.game.loadData(d) === false && FB.state === live && FB.world === world &&
          FB.getRngState() === rng && FB.getUidCounter() === uid && JSON.stringify(d) === before;
      });
  })).toEqual([true,true,true]);
});
