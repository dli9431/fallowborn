'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {beginBookmark,advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {saveBudget} = require('../support/game/476-wider');
const geographyAudit = require('../fixtures/bookmark-geography-coverage.json');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_800.js','data/bookmark_800_history.js','data/bookmark_800_expansion.js',
  'data/government_rollout.js','data/geographies.js','data/geography_expansion.js',
  'data/bookmark_476_wider_identities.js','data/cultures.js','data/climate.js','data/starts.js',
  'data/political_institutions.js','data/story_instances.js','data/technology.js',
  'data/settlements.js','data/settlements_real.js','data/distribution_crazygames.js',
  'js/world.js','js/main.js','js/model.js','js/population.js','js/settlement.js','js/lordships.js','js/climate.js',
  'js/travel.js','js/armies.js','js/stories.js','js/story_settlements.js','js/royal_settlements.js',
  'js/governments.js','js/government_administration.js','js/government_recognition.js',
  'js/government_ecclesiastical.js','js/authority.js','js/treasury.js','js/save.js','js/save_v4.js',
  'js/starts.js','js/technology.js','js/crazygames.js','js/market.js'
]);

const CURRENT = 'inhabited_v2_governments_v2';
const DISTRICTS = [
  ['jenne_district','jenne_800','arid'],['gao_district','gao_saney_800','arid'],
  ['qasr_ibrim','makuria','arid'],['kath_district','khwarazm_800','continental'],
  ['central_iran_oases','abbasid','arid'],['palmyra_district','abbasid','arid']
];

async function start800(page,info,county,scenario,flag,seed) {
  await startHistoricalGame(page,info,{bookmark:'800',
    code:(seed || 'INHABITED800') + '-800-' + (scenario || 'farmer') + '-' + county + '-m-Review-established'},!!flag);
}

async function startRetained(page,info,revision) {
  await openGame(page,info);
  await page.evaluate(function (revision) {
    FBDATA.bookmarks['800'].revision = revision; FB.startProgression.noteTier(3);
  },revision);
  const choose = page.locator('#btn-choose-beginning');
  if (await choose.isVisible()) await choose.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('RETAIN800-800-farmer-london-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function (revision) {
    FB.game.setPaused(true); FBDATA.bookmarks['800'].revision = revision;
  },CURRENT);
}

test('800 accounts for all shared seeds without changing either retained world',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function (input) {
    const raw = FBDATA.bookmarks['800'], base = FB.bookmark('800','baseline'), current = FB.bookmark('800');
    const old = FB.bookmark('800','governments_v2'), ids = input.districts.map(function (r) { return r[0]; });
    const scenery = Object.keys(input.scenery), seeds = FBDATA.geographies.europe_regional_2.provinceAdditions;
    function retained(b) { return b.geography === 'europe_regional' && b.provinces.length === 498 &&
      b.settlementLayout === '800' && JSON.stringify(b.provinces) === JSON.stringify(raw.provinces); }
    return {faults:FB.validateBookmark(raw),technology:FB.validateTechnologyData(),
      revision:current.revision,count:current.provinces.length,
      inhabited:current.provinces.filter(function (p) { return !p.wasteland; }).length,
      retained:retained(base) && retained(old),
      oldPapacy:old.realms.find(function (r) { return r.id === 'papacy'; }).ecclesiastical.profileId,
      prefix:JSON.stringify(current.provinces.slice(0,498)) === JSON.stringify(base.provinces),
      oldSlots:Object.keys(FBDATA.settlementLayouts['800']).every(function (id) {
        return JSON.stringify(FBDATA.settlementLayouts[current.settlementLayout][id]) ===
          JSON.stringify(FBDATA.settlementLayouts['800'][id]);
      }),
      scenery:scenery.length === 21 && scenery.every(function (id) {
        return current.provinces.some(function (p) { return p.id === id && p.wasteland && !p.realm; });
      }),
      unused:seeds.filter(function (p) { return ids.indexOf(p.id) < 0; }).every(function (seed) {
        const p = current.provinces.find(function (p) { return p.id === seed.id; });
        return p.wasteland && !p.realm && !p.communities && !FBDATA.settlementLayouts[current.settlementLayout][p.id];
      }),
      stories:JSON.stringify(current.stories) === JSON.stringify(old.stories),
      eastern:current.realms.filter(function (r) { return ['abbasid','byzantium'].includes(r.id); }).every(function (r) {
        return JSON.stringify(r) === JSON.stringify(old.realms.find(function (prior) { return prior.id === r.id; }));
      })};
  },{districts:DISTRICTS,scenery:geographyAudit.scenery});
  expect(result).toEqual({faults:[],technology:[],revision:CURRENT,count:527,inhabited:483,
    retained:true,oldPapacy:'papal_temporal_800',prefix:true,oldSlots:true,scenery:true,unused:true,stories:true,eastern:true});
});

for (const flag of [false,true]) test('800 district raster, households and authority, CrazyGames ' + flag,
  async function ({page},info) {
    await start800(page,info,'jenne_district','farmer',flag);
    const result = await page.evaluate(function (rows) {
      const s = FB.state,w = FB.world,counts = {},outside = [];
      rows.forEach(function (row) { counts[row[0]] = 0; });
      for (let i = 0; i < w.grid.length; i++) {
        if (!w.grid[i]) continue;
        const p = w.provs[w.grid[i] - 1];
        if (!Object.prototype.hasOwnProperty.call(counts,p.id)) continue;
        counts[p.id]++;
        const dx = i % w.W - p.sx,dy = Math.floor(i / w.W) - p.sy;
        if (dx * dx + dy * dy > p.radiusSq) outside.push(p.id);
      }
      return {outside:outside,rows:rows.map(function (row) {
        const id = row[0],p = w.byId[id],site = w.sitesByProv[id].list[0];
        const cell = w.grid[Math.floor(site.y) * w.W + Math.floor(site.x)];
        return {id:id,owner:s.owner[id],holder:!!s.realms[s.holder[id]],climate:FB.climateZoneOf(id),
          cells:counts[id],site:site.site,authored:site.authored,
          siteCounty:cell ? w.provs[cell - 1].id : null,snap:site.snap <= FB.mapScale('siteSnapMax'),
          population:FB.countyPopulation(s,id),capacity:FB.countyPopulationCapacity(s,id),wasteland:!!p.wasteland};
      }),papacy:FB.governments.forRealm(s,'papacy').id,
        noAutomaticEmpire:!s.realms.khwarazm_800.liege && !s.realms.jenne_800.liege && !s.realms.gao_saney_800.liege};
    },DISTRICTS);
    expect(result.outside).toEqual([]);
    expect(result.papacy).toBe('ecclesiastical_principality');
    expect(result.noAutomaticEmpire).toBe(true);
    for (let i = 0; i < DISTRICTS.length; i++) {
      const row = result.rows[i],expected = DISTRICTS[i];
      expect(row).toMatchObject({id:expected[0],owner:expected[1],holder:true,climate:expected[2],
        site:expected[0] + '_800',authored:true,siteCounty:expected[0],snap:true,wasteland:false});
      expect(row.cells).toBeGreaterThan(0); expect(row.population).toBeGreaterThan(0);
      expect(row.capacity).toBeGreaterThan(0);
    }
    const saved = await saveBudget(page,info,'800-expanded-fresh',4 * 1024 * 1024);
    const before = await facts(page);
    await restoreBookmark(page,saved);
    expect(await facts(page)).toEqual(before);
    await saveBudget(page,info,'800-expanded-restored',4 * 1024 * 1024);
  });

for (const row of DISTRICTS) test('one season of ordinary household life at ' + row[0],async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','One bounded journey per district.');
  test.setTimeout(240000);
  await start800(page,info,row[0]);
  await injectBrowserHarness(page);
  await advanceBookmark(page,45);
  const saved = await saveBudget(page,info,row[0] + '-midpoint',6 * 1024 * 1024);
  const before = await facts(page);
  await restoreBookmark(page,saved); expect(await facts(page)).toEqual(before);
  await advanceBookmark(page,45); const finish = await facts(page);
  await restoreBookmark(page,saved); await advanceBookmark(page,45);
  expect(await facts(page)).toEqual(finish);
});

for (const county of ['jenne_district','kath_district','palmyra_district']) test('ordinary landed opening at ' + county,
  async function ({page},info) {
    await start800(page,info,county,'baron');
    expect(await page.evaluate(function () {
      return {scenario:FB.state.telemetry.scenario,county:FB.state.player.provinceId,
        tier:FB.state.player.tier,platform:FB.save.v4.validatePlatform(JSON.parse(FB.save.serialize()).state)};
    })).toMatchObject({scenario:'baron',county:county,tier:3,platform:true});
  });

for (const county of ['jenne_district','gao_district','qasr_ibrim','kath_district']) test('scoped local revenue delegation at ' + county,
  async function ({page},info) {
    await start800(page,info,county);
    const result = await page.evaluate(function (pid) {
      const s = FB.state,rid = FB.settlementCountyHolder(s,pid),actor = {kind:'character',id:s.player.charId};
      const before = JSON.stringify([s.owner,s.holder,s.population]);
      const appointment = FB.authorityAppoint(s,{officeId:'fiscal_agent',institutionId:rid,
        appointer:{kind:'realm',id:rid},holder:actor,scope:{kind:'county',id:pid}});
      if (!appointment) throw new Error('Local revenue delegation was rejected');
      const allowed = FB.political.permission(s,actor,'collect_render',{provinceId:pid}).allowed;
      const removed = FB.authorityAppointmentTransition(s,appointment.id,'remove');
      return {allowed:allowed,removed:!!removed,
        revoked:!FB.political.permission(s,actor,'collect_render',{provinceId:pid}).allowed,
        unchanged:before === JSON.stringify([s.owner,s.holder,s.population])};
    },county);
    expect(result).toEqual({allowed:true,removed:true,revoked:true,unchanged:true});
  });

for (const county of ['central_iran_oases','palmyra_district']) test('revocable Abbasid public commission at ' + county,async function ({page},info) {
  await start800(page,info,county);
  const result = await page.evaluate(function (pid) {
    const s = FB.state,c = s.chars[s.player.charId],rid = 'abbasid';
    // Deterministic qualification fixture; the transaction itself uses production review/apply.
    c.unfree = false; c.born = 776; s.player.prestige = 1000; s.player.gold = 1000;
    FB.SKILLS.forEach(function (skill) { c.skills[skill] = 20; });
    s.realms[rid].treasury.gold = 1000;
    const before = JSON.stringify([s.owner,s.holder,s.population]);
    const actor = {kind:'realm',id:rid},q = FB.publicAppointmentQuote(s,actor,{institutionId:rid,
      officeId:FB.administrationProfile(s,rid).governor,holderId:c.id,provinceId:pid,scope:{kind:'county',id:pid}});
    if (!q.allowed) throw new Error(q.reason);
    const appointment = FB.publicAppoint(s,q);
    if (!appointment) throw new Error('No oasis commission was created');
    const removed = FB.publicOfficeApply(s,FB.publicOfficeQuote(s,actor,appointment.id,'remove'));
    return {appointed:!!appointment.id,removed:!!removed,unchanged:before === JSON.stringify([s.owner,s.holder,s.population])};
  },county);
  expect(result).toEqual({appointed:true,removed:true,unchanged:true});
});

for (const rid of ['jenne_800','gao_saney_800','khwarazm_800']) test(rid + ' succession preserves county population and saved identity',
  async function ({page},info) {
    await start800(page,info,'qasr_ibrim');
    const result = await page.evaluate(function (rid) {
      const s = FB.state,ruler = FB.materializeRealmRuler(s,rid),tree = s.realms[rid].succession;
      const generation = tree.rulerGeneration,property = JSON.stringify([s.owner,s.holder,s.population]);
      FB.killChar(s,ruler);
      const successor = FB.realmRulerCharacterSnapshot(s,rid),nextGeneration = tree.rulerGeneration;
      const saved = FB.save.serialize(); FB.save.restore(JSON.parse(saved));
      return {changed:!!successor && successor.id !== ruler.id && !successor.dead,
        once:nextGeneration === generation + 1 && FB.state.realms[rid].succession.rulerGeneration === nextGeneration,
        identity:FB.realmRulerCharacterSnapshot(FB.state,rid).id === successor.id,
        property:property === JSON.stringify([FB.state.owner,FB.state.holder,FB.state.population])};
    },rid);
    expect(result).toEqual({changed:true,once:true,identity:true,property:true});
  });

test('dated climates and inhabited dry corridors retain their movement and supply costs',async function ({page},info) {
  await start800(page,info,'jenne_district');
  expect(await page.evaluate(function () {
    const s = FB.state,route = FB.travelRoute('jenne_district','gao_district');
    const weighted = FB.travelCostSnapshot('service',['gao_district'],s);
    const short = FB.travelCostSnapshot('service',1,s);
    const t = {currentId:'jenne_district',remainingRoute:['gao_district'],legDays:3};
    const leg = FB.armyLegQuote(s,{realm:'jenne_800',men:100},'jenne_district','gao_district');
    return {units:FB.landRouteUnits('jenne_district','gao_district'),leg:FB.travelNextLegDays(t),
      weighted:FB.travelRouteUnits('jenne_district',route) >= 5,supplies:weighted > short,
      dry:!leg.water && !FB.waterCrossing('jenne_district','gao_district'),
      kath:FB.landRouteUnits('kath_district','bukhara'),
      winter:[FB.localSeason(s,'jenne_district'),FB.localSeason(s,'kath_district')],
      unusedBlocked:FB.travelRoute('kath_district','gurganj_district') === null};
  })).toEqual({units:5,leg:15,weighted:true,supplies:true,dry:true,kath:8,
    winter:['cool_season','winter'],unusedBlocked:true});
});

for (const revision of ['baseline','governments_v2','inhabited_v2']) test(revision + ' campaigns switch both ways without adopting fresh geography',
  async function ({page},info) {
    await startRetained(page,info,revision);
    const oldSave = await page.evaluate(function () { return FB.save.serialize(); });
    const oldFacts = await facts(page);
    await start800(page,info,'gao_district');
    const expandedSave = await page.evaluate(function () { return FB.save.serialize(); });
    const expandedFacts = await facts(page);
    await beginBookmark(page,info,'867','farmer');
    const otherSave = await page.evaluate(function () { return FB.save.serialize(); });
    const otherFacts = await facts(page);
    await restoreBookmark(page,oldSave); expect(await facts(page)).toEqual(oldFacts);
    expect(await page.evaluate(function () { return FB.activeGeographyId; }))
      .toBe(revision === 'inhabited_v2' ? 'europe_regional_2' : 'europe_regional');
    await restoreBookmark(page,expandedSave); expect(await facts(page)).toEqual(expandedFacts);
    await restoreBookmark(page,otherSave); expect(await facts(page)).toEqual(otherFacts);
    await restoreBookmark(page,expandedSave); expect(await facts(page)).toEqual(expandedFacts);
  });

test('unstamped baseline frontier and bundled completed stories survive expansion without replay',async function ({page},info) {
  await startRetained(page,info,'baseline');
  const legacy = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 5000; s.player.prestige = 500; FB.settleWaste(s,'w_karakum');
    if (!s.wastelandSettlements.w_karakum) throw new Error('Legacy frontier was not founded');
    // Real story apply creates both a pending inheritance and a completed gift ledger.
    s.date.year = 806; s.realms.carolingian_800.treasury.gold = 100; s.realms.abbasid.treasury.gold = 100;
    s.realms.abbasid.treasury.distributionNextTurn = s.turn + 90;
    ['divisio','gifts'].forEach(function (key) {
      const id = key + '_800'; FB.stories.apply(s,id,'approve',FB.stories.quote(s,id,'approve'));
    });
    const data = JSON.parse(FB.save.serialize()),opportunities = {};
    const cast = data.state.stories.divisio_800.cast,pressure = data.state.stories.verdun_800.pressure;
    ['divisio','ordinatio','gifts','recognition','verdun'].forEach(function (key) {
      const id = key + '_800',rec = data.state.stories[id];
      delete rec.approvals; delete rec.cast; delete rec.pressure;
      opportunities[key] = rec; delete data.state.stories[id];
    });
    data.state.stories.carolingian_settlements_800 = {cast:cast,pressure:pressure,opportunities:opportunities};
    data.platformSchema = 1; delete data.state.start.revision;
    return JSON.stringify(data);
  });
  const before = await facts(page);
  expect(before.snapshot.readsArePure).toBe(true);
  await start800(page,info,'kath_district');
  await restoreBookmark(page,legacy);
  expect(await facts(page)).toEqual(before);
  expect(await page.evaluate(function () {
    const s = FB.state,before = JSON.stringify([s.owner,s.holder,s.realms,s.stories,s.wastelandSettlements]);
    const rng = FB.getRngState(),uid = FB.getUidCounter();
    FB.stories.get('gifts_800').day(s,s.stories.gifts_800);
    return {revision:s.start.revision,geography:FB.activeGeographyId,absent:!FB.world.byId.kath_district,
      frontier:!FB.world.byId.w_karakum.wasteland,result:s.stories.gifts_800.result,
      once:before === JSON.stringify([s.owner,s.holder,s.realms,s.stories,s.wastelandSettlements]),
      random:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({revision:'baseline',geography:'europe_regional',absent:true,frontier:true,result:'agreed',once:true,random:true});
});

test('two independent 800 observer campaigns exercise expanded AI across the year boundary',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','Bounded observer workload runs once.');
  test.setTimeout(240000);
  await openGame(page,info);
  const starts = [];
  for (const seed of ['OASIS800A','OASIS800B']) {
    await page.evaluate(function (seed) {
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('800',null,function (error) {
          if (error) { reject(error); return; }
          FB.game.pending = {seed:seed}; FB.game.startObserve(); FB.game.setPaused(true); resolve();
        });
      });
    },seed);
    await injectBrowserHarness(page);
    starts.push(await page.evaluate(function () { return FB.getRngState(); }));
    const result = await page.evaluate(function () {
      const start = performance.now(),turn = FB.state.turn;
      for (let day = 0; day < 45; day++) FB.game.passDay({deferUi:true});
      return {elapsed:performance.now() - start,days:FB.state.turn - turn,
        errors:FBTEST.checkInvariants(),year:FB.state.date.year};
    });
    expect(result).toMatchObject({days:45,errors:[],year:801});
    expect(result.elapsed).toBeLessThan(30000);
    await info.attach(seed + '-timing.json',{contentType:'application/json',body:Buffer.from(JSON.stringify(result))});
  }
  expect(starts[0]).not.toBe(starts[1]);
});
