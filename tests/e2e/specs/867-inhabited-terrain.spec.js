'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {startDeterministicGame} = require('../support/game/start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {releasedCatalogue} = require('../support/released-catalogue');
const {loadParitySave} = require('../support/game/parity');
const {corpusEntries,readCorpusExport,parityMode,settleParityFixture} = require('../support/parity-fixtures');
const coverage = require('../fixtures/867-inhabited-terrain.json');
const physical = require('../fixtures/bookmark-geography-coverage.json');
const released = require('../fixtures/released-catalogue.json');
const CURRENT = coverage.revision;

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_867_expansion.js','data/government_rollout.js',
  'data/bookmarks.js','data/counties.js','data/map_data.js','data/geographies.js',
  'data/geography_expansion.js','data/settlements.js','data/settlements_real.js',
  'data/bookmark_476_wider_identities.js','data/assembly_polities.js','data/political_institutions.js',
  'data/climate.js','data/starts.js','data/cultures.js','data/technology.js',
  'js/world.js','js/main.js','js/model.js','js/population.js','js/settlement.js',
  'js/save.js','js/save_v4.js','js/mods.js','js/climate.js','js/travel.js',
  'js/governments.js','js/government_support.js','js/government_assembly.js',
  'js/government_administration.js','js/government_ecclesiastical.js','js/authority.js',
  'js/treasury.js','js/lordships.js','js/stories.js','js/events.js','js/systems.js',
  'js/crazygames.js','data/distribution_crazygames.js'
]);

function startDistrict(page,info,id,crazygames) {
  return startHistoricalGame(page,info,{bookmark:'867',
    code:'DISTRICT867-867-farmer-' + id + '-m-Review-established'},!!crazygames);
}

// An actual retained opening, never an expanded save with its stamp erased.
async function startRetained(page,info,revision,serf) {
  await openGame(page,info);
  await page.evaluate(function (revision) { FBDATA.bookmarks['867'].revision = revision; },revision);
  if (!serf) await startDeterministicGame(page);
  else {
    const fullStart = page.locator('#btn-choose-beginning');
    if (await fullStart.isVisible()) await fullStart.click();
    else await page.getByRole('button',{name:'New Game',exact:true}).click();
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('RETAINED867-867-serf-london-m-Review-established');
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    await page.evaluate(function () { FB.game.setPaused(true); });
  }
  await page.evaluate(function (revision) { FBDATA.bookmarks['867'].revision = revision; },CURRENT);
}

async function establishedFacts(page) {
  return {world:await facts(page),household:await page.evaluate(function () {
    const state = JSON.parse(FB.save.serialize()).state, out = {};
    ['player','chars','realms','owner','holder','dev','buildings','settlementBuildings',
      'wastelandSettlements','population','relationships','travel'].forEach(function (key) {
      if (state[key] !== undefined) out[key] = state[key];
    });
    return out;
  })};
}

async function budget(page,info,label,ceiling) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(source,'utf8');
  await info.attach(label + '.json',{contentType:'application/json',
    body:Buffer.from(JSON.stringify({bytes:bytes,ceiling:ceiling}))});
  expect(bytes,label).toBeLessThanOrEqual(ceiling);
  return source;
}

async function seasonSlice(page,info,label) {
  const started = Date.now();
  await advanceBookmark(page,45);
  const elapsedMs = Date.now() - started;
  await info.attach(label + '-timing.json',{contentType:'application/json',
    body:Buffer.from(JSON.stringify({days:45,elapsedMs:elapsedMs,ceilingMs:30000}))});
  expect(elapsedMs,label).toBeLessThanOrEqual(30000);
}

test('867 revisions account for all scenery and retain the released catalogue',async function ({page},info) {
  await openGame(page,info);
  expect((await page.evaluate(releasedCatalogue,released.selection)).hashes).toEqual(released.hashes);
  const result = await page.evaluate(function (input) {
    const b = FB.bookmark('867'), old = FB.bookmark('867','baseline'), raw = FBDATA.bookmarks['867'];
    const ids = input.coverage.districts.map(function (p) { return p.id; });
    const pending = [].concat.apply([],Object.values(input.coverage.scenery));
    const original = JSON.stringify(raw), rng = FB.getRngState(), uid = FB.getUidCounter();
    const out = {revision:b.revision,geography:b.geography,anchors:b.provinces.length,
      inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
      faults:FB.validateBookmark(raw),
      scenery:Object.keys(input.coverage.scenery).sort(),
      inventory:ids.concat(pending).sort(),
      retained:input.coverage.retainedRevisions.map(function (revision) {
        const r = FB.bookmark('867',revision);
        return [revision,r.geography,r.provinces.length,
          JSON.stringify(r.provinces) === JSON.stringify(old.provinces),
          r.provinces.filter(function (p) { return !p.wasteland; }).length];
      }),
      unchanged:old.provinces.every(function (p) {
        return JSON.stringify(p) === JSON.stringify(b.provinces.find(function (q) { return q.id === p.id; }));
      }),
      slots:Object.keys(FBDATA.settlementLayouts['867']).every(function (pid) {
        return JSON.stringify(FBDATA.settlementLayouts['867'][pid]) ===
          JSON.stringify(FBDATA.settlementLayouts[b.settlementLayout][pid]);
      }),
      empty:Object.keys(input.coverage.scenery).concat(pending).every(function (id) {
        const p = b.provinces.find(function (p) { return p.id === id; });
        return p && p.wasteland && !p.realm && !p.communities && !p.settlements;
      }),
      governmentOnly:JSON.stringify(FB.bookmark('867','governments_v2').realms) ===
        JSON.stringify(b.realms.slice(0,old.realms.length)),
      inheritance:['stories','scripted','localInstitutions','opening','openingRevisions','religiousHeads'].every(function (key) {
        return JSON.stringify(old[key]) === JSON.stringify(b[key]);
      }),
      tech:FBDATA.techImpactReviews.features.period_867_district_habitation.mode,
      technology:FB.validateTechnologyData(true)};
    out.pure = original === JSON.stringify(raw) && rng === FB.getRngState() && uid === FB.getUidCounter();
    return out;
  },{coverage:coverage,physical:physical});
  expect(result).toEqual({revision:CURRENT,geography:coverage.geography,anchors:527,inhabited:485,
    faults:[],scenery:Object.keys(physical.scenery).sort(),
    inventory:Object.values(physical.scenery).flat().sort(),
    retained:coverage.retainedRevisions.map(function (r) { return [r,'europe_regional',498,true,477]; }),
    unchanged:true,slots:true,empty:true,governmentOnly:true,inheritance:true,tech:'none',technology:[],pure:true});
});

for (const flag of [false,true]) test('fresh expanded households and bounded district routes, distribution ' + flag,
  async function ({page},info) {
    await startDistrict(page,info,'jenne_district',flag);
    const result = await page.evaluate(function (rows) {
      const s = FB.state, w = FB.world, counts = {}, outside = [];
      rows.forEach(function (row) { counts[row.id] = 0; });
      for (let i = 0; i < w.grid.length; i++) {
        if (!w.grid[i]) continue;
        const p = w.provs[w.grid[i] - 1];
        if (!Object.prototype.hasOwnProperty.call(counts,p.id)) continue;
        counts[p.id]++;
        const dx = i % w.W - p.sx, dy = Math.floor(i / w.W) - p.sy;
        if (dx * dx + dy * dy > p.radiusSq) outside.push(p.id);
      }
      return {revision:s.start.revision,geography:s.start.geography,counts:counts,outside:outside,
        rows:rows.map(function (row) {
          const p = FB.campaignProvince(s,row.id), sites = w.sitesByProv[row.id].list;
          return {id:row.id,name:p.name,owner:s.owner[row.id],form:FB.governments.forRealm(s,s.owner[row.id]).id,
            culture:p.culture,religion:p.religion,zone:FB.climateZoneOf(row.id),
            communityTotal:p.communities.reduce(function (n,c) { return n + c.populationShare0; },0),
            populated:s.population.counties[row.id].count > 0,
            site:sites.some(function (site) { return site.authored && site.site === row.id + '_inhabited_867'; }),
            route:[FB.landRouteUnits(row.id,row.route),!!w.adj[row.id][row.route],
              !!w.adj[row.route][row.id],!!FB.waterCrossing(row.id,row.route)],
            seasons:[0,1,2,3].map(function (i) { return FB.seasonKindAt(row.id,i); })};
        }),
        local:!!FB.governments.support.delegate(s,'jenne_867'),
        direct:['gao_district','kumbi_district','kath_district'].every(function (id) { return s.holder[id] === s.owner[id]; }),
        separate:s.owner.jenne_district !== s.owner.gao_district && s.owner.gao_district !== s.owner.kumbi_district,
        kath:[s.realms.afrighids_867.liege || null,s.realms.afrighids_867.religion],
        stableClimate:FB.climateZoneOf('london') === 'northern_temperate'};
    },coverage.districts);
    expect(result).toMatchObject({revision:CURRENT,geography:coverage.geography,outside:[],
      local:true,direct:true,separate:true,kath:[null,'sunni'],stableClimate:true});
    for (const row of result.rows) {
      const expected = coverage.districts.find(function (d) { return d.id === row.id; });
      expect(row).toMatchObject({id:expected.id,name:expected.name,owner:expected.realm,
        form:expected.form,culture:expected.culture,religion:expected.religion,zone:expected.zone,
        communityTotal:10000,populated:true,site:true,route:[expected.units,true,true,false]});
      expect(row.seasons.every(Boolean)).toBe(true);
      expect(result.counts[row.id]).toBeGreaterThan(0);
    }
    const source = await budget(page,info,'867-expanded-opening',4 * 1024 * 1024);
    const before = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
  });

for (const row of coverage.districts) test('ordinary household at ' + row.id + ' saves and replays one natural season',
  async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','One bounded seasonal journey per district.');
    test.setTimeout(240000);
    await startDistrict(page,info,row.id);
    await injectBrowserHarness(page);
    const opening = await establishedFacts(page);
    await seasonSlice(page,info,row.id + '-first-half');
    const source = await budget(page,info,row.id + '-midpoint',6 * 1024 * 1024);
    const midpoint = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(midpoint);
    await seasonSlice(page,info,row.id + '-second-half');
    const finish = await facts(page);
    await restoreBookmark(page,source);
    await seasonSlice(page,info,row.id + '-replayed-half');
    expect(await facts(page)).toEqual(finish);
    if (parityMode()) await settleParityFixture(info,'fresh-867-inhabited-v2-' + row.id,
      {id:'fresh-867-inhabited-v2-' + row.id,kind:'district',bookmark:'867',revision:CURRENT,
        geography:coverage.geography},{opening:opening,midpoint:midpoint,season:finish});
  });

for (const revision of coverage.retainedRevisions) test(revision + ' retains converted frontier and established people across switches',
  async function ({page},info) {
    await startRetained(page,info,revision);
    const saved = await page.evaluate(function () {
      const s = FB.state;
      s.player.gold = 5000; s.player.prestige = 500;
      FB.settleWaste(s,'w_karakum');
      if (FB.world.byId.w_karakum.wasteland) throw new Error('Frontier conversion failed.');
      s.dev.w_karakum = 3;
      const source = FB.save.serialize();
      return {source:source,sites:JSON.stringify(FB.world.sitesByProv.w_karakum),
        home:s.player.provinceId};
    });
    const before = await establishedFacts(page);
    await openGame(page,info);
    await startDeterministicGame(page);
    const expanded = await budget(page,info,'867-switch-expanded',4 * 1024 * 1024);
    expect(JSON.parse(expanded).state.start.revision).toBe(CURRENT);
    await restoreBookmark(page,saved.source);
    expect(await establishedFacts(page)).toEqual(before);
    expect(await page.evaluate(function (saved) {
      const s = FB.state, before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
      FB.restoreWastelandSettlements(s); FB.restoreWastelandSettlements(s);
      return !FB.world.byId.kath_district && s.start.geography === 'europe_regional' &&
        saved.sites === JSON.stringify(FB.world.sitesByProv.w_karakum) && saved.home === s.player.provinceId &&
        before === JSON.stringify(s) &&
        rng === FB.getRngState() && uid === FB.getUidCounter();
    },saved)).toBe(true);
    if (revision === 'baseline') {
      const legacy = JSON.parse(saved.source); legacy.platformSchema = 1; delete legacy.state.start.revision;
      await restoreBookmark(page,JSON.stringify(legacy));
      expect(await establishedFacts(page)).toEqual(before);
      expect(JSON.parse(await page.evaluate(function () { return FB.save.serialize(); })).state.start.revision).toBe('baseline');
    }
    await restoreBookmark(page,expanded);
    expect(await page.evaluate(function () { return !FB.world.byId.kath_district.wasteland; })).toBe(true);
    await restoreBookmark(page,saved.source);
    expect(await establishedFacts(page)).toEqual(before);
  });

for (const revision of coverage.retainedRevisions) test(revision + ' retains an actual serf household and tenure',
  async function ({page},info) {
    await startRetained(page,info,revision,true);
    expect(await page.evaluate(function () {
      const t = FB.activeSerfTenure(FB.state);
      return !!t && t.provinceId === FB.state.player.provinceId && !!t.archetypeId;
    })).toBe(true);
    const source = await budget(page,info,'867-retained-serf-' + revision,4 * 1024 * 1024);
    const before = await establishedFacts(page);
    await startDistrict(page,info,'jenne_district');
    await restoreBookmark(page,source);
    expect(await establishedFacts(page)).toEqual(before);
    expect(await page.evaluate(function () {
      return [FB.state.start.revision,FB.state.start.geography,!!FB.world.byId.kath_district];
    })).toEqual([revision,'europe_regional',false]);
  });

test('new local courts inherit through existing people without remaking land or households',async function ({page},info) {
  await startDistrict(page,info,'kath_district');
  const result = await page.evaluate(function () {
    const s = FB.state, ownership = JSON.stringify([s.owner,s.holder]);
    const household = JSON.stringify(s.player);
    const rows = ['gao_867','wagadu_867','afrighids_867'].map(function (id) {
      const r = s.realms[id], heir = FB.authoredRoyalMemberSnapshot(s,id,'offspring');
      const ruler = FB.realmRulerCharacterSnapshot(s,id), generation = r.succession.rulerGeneration;
      FB.killChar(s,ruler);
      const next = FB.realmRulerCharacterSnapshot(s,id);
      return {id:id,heir:next.id === heir.charId,once:r.succession.rulerGeneration === generation + 1,
        dynasty:next.dyn === ruler.dyn,form:FB.governments.forRealm(s,id).id};
    });
    const source = JSON.parse(FB.save.serialize()), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    FB.save.restore(source);
    return {rows:rows,land:ownership === JSON.stringify([FB.state.owner,FB.state.holder]),
      household:household === JSON.stringify(FB.state.player),
      random:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter()};
  });
  expect(result).toEqual({rows:['gao_867','wagadu_867','afrighids_867'].map(function (id) {
    return {id:id,heir:true,once:true,dynasty:true,form:'regnum'};
  }),land:true,household:true,random:true});
});

test('Jenne-jeno delegates local power without transferring household inheritance',async function ({page},info) {
  await startDistrict(page,info,'jenne_district');
  expect(await page.evaluate(function () {
    const s = FB.state, C = FB.governments.support, id = 'jenne_867', c = s.chars[s.player.charId];
    c.born = s.date.year - 30; c.skills.dip = 8; delete c.unfree;
    const property = JSON.stringify([s.player.landPlots,c.dyn,c.childrenIds,c.spouseId]);
    const before = JSON.stringify(s), rng = FB.getRngState(), uid = FB.getUidCounter();
    C.candidates(s,id); C.members(s,id); C.quote(s,id,'nominate',{candidateId:c.id});
    const pure = before === JSON.stringify(s) && rng === FB.getRngState() && uid === FB.getUidCounter();
    C.openVacancy(s,id,'resign');
    if (!C.apply(s,C.quote(s,id,'nominate',{candidateId:c.id}))) throw new Error('Local nomination failed.');
    C.members(s,id).forEach(function (m) {
      if (!C.apply(s,C.quote(s,id,'recognize',{memberId:m.id,candidateId:c.id}))) throw new Error('Local assent failed.');
    });
    const quote = C.quote(s,id,'select',{}), selected = C.apply(s,quote), repeated = C.apply(s,quote);
    const delegate = C.delegate(s,id), selectedId = delegate.id;
    const source = JSON.parse(FB.save.serialize());
    FB.save.restore(source);
    return {pure:pure,selected:!!selected,repeated:!!repeated,delegate:selectedId === c.id,
      retained:C.delegate(FB.state,id).id === selectedId,
      property:property === JSON.stringify([FB.state.player.landPlots,FB.state.chars[c.id].dyn,
        FB.state.chars[c.id].childrenIds,FB.state.chars[c.id].spouseId]),
      notRoyal:!FB.state.realms[id].succession && !FB.state.chars[c.id].royalLine};
  })).toEqual({pure:true,selected:true,repeated:false,delegate:true,retained:true,property:true,notRoyal:true});
});

test('unknown or mismatched expanded revisions fail before adopting saved facts',async function ({page},info) {
  await startDistrict(page,info,'qasr_ibrim');
  expect(await page.evaluate(function () {
    const source = JSON.parse(FB.save.serialize());
    return ['revision','geography'].map(function (kind) {
      const bad = JSON.parse(JSON.stringify(source));
      if (kind === 'revision') bad.state.start.revision = 'missing_867_revision';
      else bad.state.start.geography = 'europe_regional';
      const live = FB.state, world = FB.world, before = JSON.stringify(live), rng = FB.getRngState(), uid = FB.getUidCounter();
      return FB.game.loadData(bad) === false && live === FB.state && world === FB.world &&
        before === JSON.stringify(live) && rng === FB.getRngState() && uid === FB.getUidCounter();
    });
  })).toEqual([true,true]);
});

test('a normal JSON bookmark mod pins the expanded revision and rejects a changed catalogue',async function ({page},info) {
  await openGame(page,info);
  const text = await page.evaluate(function () {
    const b = JSON.parse(JSON.stringify(FBDATA.bookmarks['867']));
    b.revisions[b.revision].provinces = b.revisions[b.revision].provinces.map(function (p) {
      return p.id === 'kath_district' ? Object.assign({},p,{dev:4}) : p;
    });
    const mod = {name:'867 district authoring proof',bookmarks:{'867':b}};
    const faults = FB.mods.validate(mod);
    if (faults.length) throw new Error(faults.join('\n'));
    const text = JSON.stringify(mod);
    localStorage.setItem('fb_mods',JSON.stringify([text]));
    return text;
  });
  await openGame(page,info);
  await startDeterministicGame(page);
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  expect(JSON.parse(source).mods).toMatch(/^effective-1-/);
  await openGame(page,info);
  await restoreBookmark(page,source);
  expect(await page.evaluate(function () {
    return [FB.state.start.revision,FB.campaignProvince(FB.state,'kath_district').dev];
  })).toEqual([CURRENT,4]);
  await page.evaluate(function (text) {
    const mod = JSON.parse(text), b = mod.bookmarks['867'];
    b.revisions[b.revision].provinces.find(function (p) { return p.id === 'kath_district'; }).dev = 5;
    localStorage.setItem('fb_mods',JSON.stringify([JSON.stringify(mod)]));
  },text);
  await openGame(page,info);
  expect(await page.evaluate(function (source) { return FB.game.loadData(JSON.parse(source)); },source)).toBe(false);
});

test('expanded observer AI saves and replays a bounded season',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','One bounded observer journey.');
  test.setTimeout(240000);
  await openGame(page,info);
  await injectBrowserHarness(page);
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('867',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = {seed:'OBSERVER867-DISTRICTS'};
        FB.game.startObserve(); FB.game.setPaused(true);
        FB.game.auto.all = true; FB.game.auto.style = 'first'; resolve();
      });
    });
  });
  await seasonSlice(page,info,'867-observer-first-half');
  const source = await budget(page,info,'867-observer-midpoint',6 * 1024 * 1024);
  await seasonSlice(page,info,'867-observer-second-half');
  const finish = await facts(page);
  await restoreBookmark(page,source);
  await seasonSlice(page,info,'867-observer-replayed-half');
  expect(await facts(page)).toEqual(finish);
});

for (const entry of corpusEntries().filter(function (entry) { return entry.bookmark === '867'; })) {
  test('retained owner corpus ' + entry.id + ' selects its original world',async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','Corpus review runs in one project.');
    const source = readCorpusExport(entry);
    test.skip(!!source.missing,'Set FB_PARITY_CORPUS to the checkout containing ' + entry.path + '.');
    expect(source.sha256).toBe(entry.sha256);
    await loadParitySave(page,info,source.text);
    expect(await page.evaluate(function () {
      return [FB.state.start.revision,FB.state.start.geography,!!FB.world.byId.kath_district];
    })).toEqual(['baseline','europe_regional',false]);
    const reexport = await page.evaluate(function () { return FB.save.serialize(); });
    const before = await establishedFacts(page);
    await startDistrict(page,info,'gao_district');
    await restoreBookmark(page,reexport);
    expect(await establishedFacts(page)).toEqual(before);
  });
}
