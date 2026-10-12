'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {openGame} = require('../support/game/navigation');
const {startHistoricalGame} = require('../support/game/historical-start');
const {advanceBookmark,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {injectBrowserHarness} = require('../support/game/browser-harness');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_1204.js','data/bookmark_1204_campaigns.js','data/bookmark_1204_terrain.js',
  'data/bookmarks.js','data/starts.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/bookmark_476_wider_identities.js',
  'data/bookmark_476_wider.js','data/government_rollout.js','data/assembly_polities.js',
  'data/mobile_confederations.js','data/technology.js','data/climate.js','data/eras.js',
  'js/world.js','js/main.js','js/starts.js','js/model.js','js/station.js','js/bookmark_setup.js',
  'js/governments.js','js/government_support.js','js/government_assembly.js','js/mobile_confederations.js',
  'js/federates.js','js/government_collective.js','js/government_levy.js','js/government_revenue.js','js/institutions.js',
  'js/government_selection.js','js/authority.js','js/politics.js','js/population.js','js/localfolk.js',
  'js/treasury.js','js/religion.js','js/climate.js','js/travel.js','js/armies.js',
  'js/stories.js','js/story_campaign.js','js/story_history.js','js/save.js','js/save_v4.js',
  'js/crazygames.js','data/distribution_crazygames.js'
]);

const districts = ['draa_oases','jenne_district','gao_district','kumbi_district','siwa_oasis',
  'qasr_ibrim','central_iran_oases','sarakhs_oasis','nurata_foothills','lower_syr_darya',
  'kath_district','gurganj_district','shebar_valley','palmyra_district'];
const authorityStarts = [
  {scenario:'muhammad_1204',province:'gurganj_district',realm:'khwarazm_1204',form:'regnum',tier:6},
  {scenario:'siwa_delegate_1204',province:'siwa_oasis',realm:'siwa_households_1204',form:'assembly_polity',tier:1}
];
function journey(province,scenario,family,seed) {
  const name = scenario === 'muhammad_1204' ? 'Muhammad II' : 'Review';
  return {bookmark:'1204',code:(seed || 'TERRAIN1204') + '-1204-' + (scenario || 'farmer') +
    '-' + province + '-m-' + name + '-' + (family || 'established')};
}
async function saveWithin(page,limit) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  expect(Buffer.byteLength(source,'utf8')).toBeLessThanOrEqual(limit);
  return source;
}
async function startBaseline(page,info) {
  await openGame(page,info);
  await page.evaluate(function () {
    FBDATA.bookmarks['1204'].revision = 'baseline'; FB.startProgression.noteTier(3);
  });
  const choose = page.locator('#btn-choose-beginning');
  if (await choose.isVisible()) await choose.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill(journey('london').code);
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FBDATA.bookmarks['1204'].revision = 'inhabited_v2';
  });
}

for (const flag of [false,true]) test('dated districts, communities, rights and sites survive restore, flag ' + flag,
  async function ({page},info) {
    await startHistoricalGame(page,info,journey('gao_district'),flag);
    const result = await page.evaluate(function () {
      const b = FB.bookmark('1204'), old = FB.bookmark('1204','baseline'), s = FB.state;
      const d = FBDATA.bookmarkTerrain1204, layout = FBDATA.settlementLayouts[b.settlementLayout];
      const sources = JSON.stringify([FBDATA.bookmarks['1066'],FBDATA.bookmarks['867']]);
      const physical = FBDATA.geographies.europe_regional_2.provinceAdditions;
      const unchangedLayouts = Object.keys(FBDATA.settlementLayouts['1204']).every(function (id) {
        if (id === 'merv' || id === 'bukhara') return true;
        return JSON.stringify(layout[id]) === JSON.stringify(FBDATA.settlementLayouts['1204'][id]);
      });
      const counts = function (world) { return [world.provinces.length,
        world.provinces.filter(function (p) { return !p.wasteland; }).length,
        world.provinces.filter(function (p) { return p.wasteland; }).length]; };
      const before = JSON.stringify([s.population,s.owner,s.holder,s.localInstitutions,s.stories,s.governmentSupport]);
      const rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
      FB.save.restore(JSON.parse(FB.save.serialize()));
      return {faults:FB.validateBookmark(FBDATA.bookmarks['1204']),
        technology:FB.bookmarkTechnologyFaults(b,b.era),stamp:s.start.revision,geography:s.start.geography,
        date:b.date,counts:counts(b),baseline:counts(old),added:d.provinces.length,
        dispositions:physical.every(function (p) {
          return d.provinces.filter(function (n) { return n.id === p.id; }).length + (d.deferred[p.id] ? 1 : 0) === 1;
        }),scenery:Object.keys(d.scenery).length,
        remnants:Object.keys(d.scenery).every(function (id) { return FB.world.byId[id].wasteland; }),
        domains:d.provinces.every(function (p) { return !!s.owner[p.id] && !!s.holder[p.id] &&
          FB.topRealm(s,s.holder[p.id]) === s.owner[p.id] && FB.world.byId[p.id].customaryRights.length === 2; }),
        communities:d.provinces.every(function (p) { return FB.provinceCommunities(FB.world.byId[p.id])
          .reduce(function (n,c) { return n + c.populationShare0; },0) === 10000; }),
        institutions:d.provinces.every(function (p) { return FB.provinceCommunities(FB.world.byId[p.id]).every(function (c,index) {
          const row = FB.localInstitutionDefinitions(FB.state)[p.id + '_community_' + index + '_1204'];
          return row && row.site === layout[p.id][0].site && row.religion === c.religion;
        }); }),
        independent:sources === JSON.stringify([FBDATA.bookmarks['1066'],FBDATA.bookmarks['867']]),
        kept:before === JSON.stringify([FB.state.population,FB.state.owner,FB.state.holder,FB.state.localInstitutions,FB.state.stories,FB.state.governmentSupport]),
        pure:rng === (FB.getRngState() >>> 0) && uid === FB.getUidCounter(),unchangedLayouts:unchangedLayouts,
        promoted:layout.sarakhs_oasis[0].site === 'geo_sarakhs_1159716' &&
          layout.nurata_foothills[0].site === 'nurata_foothills_inhabited_1204' &&
          JSON.stringify(FBDATA.settlementSites.nurata_foothills_inhabited_1204) === JSON.stringify(FBDATA.settlementSites.geo_nurota_1513087) &&
          !layout.merv.some(function (p) { return /sarakhs|sarahs/.test(p.site); }) &&
          !layout.bukhara.some(function (p) { return p.site === 'geo_nurota_1513087'; }),
        starts:!b.starts && !old.starts && d.starts.every(function (p) {
          return FB.startProvinceAllowed(p,b,p.fixedProvinceId) &&
            !FB.startProvinceAllowed(p,old,p.fixedProvinceId);
        })};
    });
    expect(result).toEqual({faults:[],technology:[],stamp:'inhabited_v2',geography:'europe_regional_2',
      date:{year:1204,season:0,day:76},counts:[527,491,36],baseline:[498,477,21],added:14,
      dispositions:true,scenery:21,remnants:true,domains:true,communities:true,institutions:true,
      independent:true,kept:true,pure:true,unchangedLayouts:true,promoted:true,starts:true});
    await saveWithin(page,4 * 1024 * 1024);
  });

test('revision-only starts belong to their world while unknown or listed references still fault',async function ({page},info) {
  await openGame(page,info);
  const result = await page.evaluate(function () {
    const root = FBDATA.bookmarks['1204'], before = JSON.stringify([root,FBDATA.startScenarios]);
    const siwa = FBDATA.startScenarios.filter(function (s) { return s.id === 'siwa_delegate_1204'; })[0];
    const misspelt = Object.assign({},siwa,{id:'e2e_misspelt_birthplace_1204',fixedProvinceId:'e2e_no_such_district'});
    const listed = Object.assign({},root,{revisions:Object.assign({},root.revisions,
      {baseline:Object.assign({},root.revisions.baseline,{starts:['siwa_delegate_1204']})})});
    const full = FB.validateBookmark(root), explicit = FB.validateBookmark(listed);
    let unknown;
    FBDATA.startScenarios.push(misspelt);
    try { unknown = FB.validateBookmark(root); } finally { FBDATA.startScenarios.pop(); }
    const has = function (errors,text) { return errors.some(function (e) { return e.indexOf(text) >= 0; }); };
    return {full:full,
      unknown:has(unknown,'start e2e_misspelt_birthplace_1204: unknown inhabited province e2e_no_such_district.') &&
        unknown.every(function (e) { return e.indexOf('e2e_misspelt_birthplace_1204') >= 0; }),
      explicit:has(explicit,'start siwa_delegate_1204: unknown inhabited province siwa_oasis.'),
      pure:before === JSON.stringify([root,FBDATA.startScenarios])};
  });
  expect(result).toEqual({full:[],unknown:true,explicit:true,pure:true});
});

test('court, community and mobile claims do not replace each other',async function ({page},info) {
  await startHistoricalGame(page,info,journey('gurganj_district'));
  expect(await page.evaluate(function () {
    const s = FB.state, b = FB.bookmark('1204'), mobile = FB.mobile.row(s,'qipchaq_following_1204');
    const original = FB.bookmark('1204','baseline');
    return {capital:s.realms.khwarazm_1204.capital,
      named:FB.realmRulerCharacterSnapshot(s,'khwarazm_1204').name,
      unchangedRuler:JSON.stringify(b.realms.find(function (r) { return r.id === 'khwarazm_1204'; }).ruler) ===
        JSON.stringify(original.realms.find(function (r) { return r.id === 'khwarazm_1204'; }).ruler),
      holders:['kath_district','gurganj_district','lower_syr_darya'].map(function (id) { return [s.owner[id],s.holder[id]]; }),
      superior:s.realms.karakhanid_1204.liege,
      split:[s.holder.bamiyan,s.holder.shebar_valley],
      faiths:[s.realms.gao_court_1204.religion,FB.world.byId.gao_district.religion,
        s.realms.khwarazm_1204.religion,FB.world.byId.central_iran_oases.religion],
      mobile:[mobile.accounting.initial,FB.mobile.total(s,'qipchaq_following_1204'),
        FB.mobile.host(s,'qipchaq_following_1204').men],
      noCounties:!Object.keys(s.holder).some(function (id) { return s.holder[id] === 'qipchaq_following_1204'; }),
      outside:FB.world.byId.sarysu_corridor.wasteland,
      ledger:FBDATA.techImpactReviews.features.period_1204_inhabited_terrain.mode,
      delegateLedger:FBDATA.techImpactReviews.features.existing_delegate_start.mode};
  })).toEqual({capital:'gurganj_district',named:'Muhammad II',unchangedRuler:true,
    holders:[['qara_khitai_1204','khwarazm_1204'],['qara_khitai_1204','khwarazm_1204'],['qara_khitai_1204','khwarazm_1204']],
    superior:'qara_khitai_1204',split:['bamiyan_court_1204','bamiyan_court_1204'],
    faiths:['sunni','sahel_traditional_476','sunni','shia'],mobile:[1600,1600,80],noCounties:true,outside:true,
    ledger:'none',delegateLedger:'none'});
});

test('delegate offering rejects mismatched identity and hereditary starting tiers without side effects',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const row = FBDATA.startScenarios.find(function (s) { return s.id === 'siwa_delegate_1204'; });
    const saved = JSON.stringify(row), rng = FB.getRngState(), uid = FB.getUidCounter();
    const result = ['tier','startCulture','startReligion','governmentForm'].map(function (field) {
      const before = row[field];
      row[field] = {tier:4,startCulture:'persian',startReligion:'catholic',governmentForm:'missing'}[field];
      const rejected = FB.validateBookmark(FB.bookmark('1204')).length > 0;
      row[field] = before; return rejected;
    });
    return {rejected:result,restored:saved === JSON.stringify(row),faults:FB.validateBookmark(FB.bookmark('1204')),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:[true,true,true,true],restored:true,faults:[],pure:true});
});

test('pasture access needs the lawful direct holder, survives restore and ends under foreign occupation',async function ({page},info) {
  await startHistoricalGame(page,info,journey('lower_syr_darya'));
  expect(await page.evaluate(function () {
    let s = FB.state;
    const M = FB.mobile, rid = 'qipchaq_following_1204', county = 'lower_syr_darya';
    const terms = {kind:'access',partnerId:'khwarazm_1204',countyIds:[county],capacity:100,
      allowRecruit:true,price:4,duration:270};
    function act(action,terms,actor) {
      return M.commit(s,M.review(s,{realmId:rid,action:action,terms:terms,actor:actor || {kind:'realm',id:rid}}));
    }
    function agree(terms) {
      act('propose',{operation:'agreement',proposal:terms});
      M.members(s,rid).forEach(function (m) { act('assent',{assent:true},m.principal); });
    }
    const superior = Object.assign({},terms,{partnerId:'qara_khitai_1204'});
    agree(superior); const superiorBlocked = !act('offer',superior);
    agree(terms); const offered = !!act('offer',terms);
    const id = M.row(s,rid).agreements[0].id;
    const request = {realmId:rid,action:'accept',terms:{agreementId:id},actor:{kind:'realm',id:'khwarazm_1204'}};
    const rng = FB.getRngState(), uid = FB.getUidCounter(), reviewed = M.review(s,request);
    const pure = rng === FB.getRngState() && uid === FB.getUidCounter();
    const gold = FB.treasuryAvailable(s,rid), holderGold = FB.treasuryAvailable(s,'khwarazm_1204');
    const owner = s.owner[county], holder = s.holder[county];
    s.owner[county] = 'ayyubid_1204'; const stale = !M.commit(s,reviewed);
    const uncharged = gold === FB.treasuryAvailable(s,rid) && holderGold === FB.treasuryAvailable(s,'khwarazm_1204');
    s.owner[county] = owner;
    const accepted = !!M.commit(s,M.review(s,request)), repeated = !M.commit(s,M.review(s,request));
    const payment = Math.abs(FB.treasuryAvailable(s,rid) - (gold - 4)) < 0.000001 &&
      Math.abs(FB.treasuryAvailable(s,'khwarazm_1204') - (holderGold + 4)) < 0.000001;
    const kept = JSON.stringify(M.row(s,rid).agreements);
    FB.save.restore(JSON.parse(FB.save.serialize())); s = FB.state;
    const restored = kept === JSON.stringify(M.row(s,rid).agreements), access = M.passage(s,rid,county,true);
    s.owner[county] = 'ayyubid_1204'; const occupied = !M.passage(s,rid,county,true); s.owner[county] = owner;
    s.holder[county] = 'karakhanid_1204'; const replaced = !M.passage(s,rid,county,true); s.holder[county] = holder;
    return {superiorBlocked:superiorBlocked,offered:offered,pure:pure,stale:stale,uncharged:uncharged,
      accepted:accepted,repeated:repeated,payment:payment,restored:restored,access:access,occupied:occupied,replaced:replaced,
      control:s.owner[county] === owner && s.holder[county] === holder,valid:M.validate(s)};
  })).toEqual({superiorBlocked:true,offered:true,pure:true,stale:true,uncharged:true,accepted:true,repeated:true,
    payment:true,restored:true,access:true,occupied:true,replaced:true,control:true,valid:true});
});

for (const province of districts) test('a household can begin at ' + province,async function ({page},info) {
  await startHistoricalGame(page,info,journey(province));
  await injectBrowserHarness(page);
  expect(await page.evaluate(function (id) {
    return [FB.state.player.provinceId,FB.world.byId[id].wasteland || false,FBTEST.checkInvariants()];
  },province)).toEqual([province,false,[]]);
});

for (const seed of ['TERRAIN1204A','TERRAIN1204B']) test(seed + ' retains authored declarations and replays its own world',
  async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','Two independent seeded contexts.');
    await startHistoricalGame(page,info,journey('kath_district',null,null,seed));
    await injectBrowserHarness(page);
    const declaration = await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarks['1204']); });
    const source = await saveWithin(page,4 * 1024 * 1024);
    await advanceBookmark(page,10); const finish = await facts(page);
    await restoreBookmark(page,source); await advanceBookmark(page,10);
    expect(await facts(page)).toEqual(finish);
    expect(await page.evaluate(function () { return JSON.stringify(FBDATA.bookmarks['1204']); })).toBe(declaration);
  });

for (const row of authorityStarts) test(row.scenario + ' adopts the existing authority, saves and plays a season',
  async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','Bounded authority journeys run once.');
    test.setTimeout(240000);
    await startHistoricalGame(page,info,journey(row.province,row.scenario,'standard'));
    await injectBrowserHarness(page);
    expect(await page.evaluate(function (row) {
      const s = FB.state, c = s.chars[s.player.charId], support = FB.governments.support;
      const local = row.form === 'assembly_polity';
      const publicRealm = local ? row.realm : 'player';
      return {scenario:s.start.scenarioId,adopted:s.start.rulerRealmId,old:!!s.realms[row.realm],
        form:FB.governments.forRealm(s,publicRealm).id,tier:s.player.tier,
        holder:s.holder[row.province],identity:FB.realmRulerCharacterSnapshot(s,publicRealm).id === c.id,
        mandate:!local || support.delegate(s,row.realm).id === c.id &&
          support.row(s,row.realm).id === row.realm && !support.row(s,'player') && !s.realms.player &&
          support.row(s,row.realm).selection.resolvedId === support.row(s,row.realm).mandate.id,
        separate:!local || s.player.gold === 30 && !!s.realms[row.realm].treasury &&
          FB.startRealmId(s,row.realm) === row.realm && s.player.provs.length === 0,
        named:local || c.name === 'Muhammad II',errors:FBTEST.checkInvariants()};
    },row)).toEqual({scenario:row.scenario,adopted:row.realm,old:row.form === 'assembly_polity',form:row.form,tier:row.tier,
      holder:row.form === 'assembly_polity' ? row.realm : 'player',identity:true,mandate:true,separate:true,named:true,errors:[]});
    const initial = await facts(page);
    await restoreBookmark(page,await saveWithin(page,4 * 1024 * 1024));
    expect(await facts(page)).toEqual(initial);
    await advanceBookmark(page,45);
    const source = await saveWithin(page,6 * 1024 * 1024), midpoint = await facts(page);
    await restoreBookmark(page,source); expect(await facts(page)).toEqual(midpoint);
    await advanceBookmark(page,45); const finish = await facts(page);
    await restoreBookmark(page,source); await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(finish);
  });

for (const province of ['gao_district','kath_district','palmyra_district']) {
  test('one natural household season at ' + province + ' replays from its midpoint',async function ({page},info) {
    test.skip(info.project.name !== 'chromium-served','One bounded journey per regional slice.');
    test.setTimeout(240000);
    await startHistoricalGame(page,info,journey(province)); await injectBrowserHarness(page);
    await advanceBookmark(page,45);
    const source = await saveWithin(page,6 * 1024 * 1024), midpoint = await facts(page);
    await restoreBookmark(page,source); expect(await facts(page)).toEqual(midpoint);
    await advanceBookmark(page,45); const finish = await facts(page);
    await restoreBookmark(page,source); await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(finish);
    expect(await page.evaluate(function () {
      const r = FB.mobile.row(FB.state,'qipchaq_following_1204'), a = r.accounting;
      return a.initial + a.arrivals - a.dead - a.settled - a.dispersed === FB.mobile.total(FB.state,'qipchaq_following_1204');
    })).toBe(true);
  });
}

test('baseline frontier conversions and resolved campaigns survive expanded-world switching',async function ({page},info) {
  await startBaseline(page,info);
  const source = await page.evaluate(function () {
    const s = FB.state;
    FB.materializeWasteland(s,'w_sahara_c',{culture:'berber',religion:'sunni',holderId:'almohad_1204',ownerId:'almohad_1204'});
    const story = FB.stories.get('latin_thessalonica_1204'), rec = s.stories.latin_thessalonica_1204;
    story.day(s,rec); FB.transferProvince(s,'thessaloniki','latin_1204');
    FB.settleOrdinaryWar(s,rec.warId,'victory'); story.day(s,rec);
    const data = JSON.parse(FB.save.serialize()); data.platformSchema = 1; delete data.state.start.revision;
    return JSON.stringify(data);
  });
  const before = await facts(page);
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1204',null,function (error) { if (error) reject(error); else resolve(); });
    });
  });
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
  expect(await page.evaluate(function () {
    const s = FB.state, ids = Object.keys(s.chars), rng = FB.getRngState() >>> 0, uid = FB.getUidCounter();
    const award = JSON.stringify(s.stories.latin_thessalonica_1204);
    FB.stories.get('latin_thessalonica_1204').day(s,s.stories.latin_thessalonica_1204);
    return [s.start.revision,FB.activeGeographyId,!!FB.world.byId.gurganj_district,
      !!s.realms.qara_khitai_1204,FB.world.byId.w_sahara_c.wasteland || false,
      s.owner.thessaloniki,award === JSON.stringify(s.stories.latin_thessalonica_1204),
      ids.length === Object.keys(s.chars).length,rng === (FB.getRngState() >>> 0),uid === FB.getUidCounter()];
  })).toEqual(['baseline','europe_regional',false,false,false,'latin_1204',true,true,true,true]);
  expect(await page.evaluate(function () {
    const data = JSON.parse(FB.save.serialize()), live = FB.state, world = FB.world;
    const rng = FB.getRngState(), uid = FB.getUidCounter();
    return [function (d) { d.state.start.revision = 'missing'; },
      function (d) { d.state.start.geography = 'europe_regional_2'; },
      function (d) { d.state.owner.gurganj_district = 'khwarazm_1204'; },
      function (d) { d.state.start.scenarioId = 'muhammad_1204'; d.state.start.rulerRealmId = 'khwarazm_1204'; }]
      .map(function (mutate) {
        const candidate = JSON.parse(JSON.stringify(data)); mutate(candidate);
        const text = JSON.stringify(candidate);
        return FB.game.loadData(candidate) === false && live === FB.state && world === FB.world &&
          rng === FB.getRngState() && uid === FB.getUidCounter() && text === JSON.stringify(candidate);
      });
  })).toEqual([true,true,true,true]);
});

test('bounded geography, local seasons and dry travel use the shared route weights',async function ({page},info) {
  await startHistoricalGame(page,info,journey('kath_district'));
  expect(await page.evaluate(function () {
    const s = FB.state, w = FB.world, rng = FB.getRngState(), uid = FB.getUidCounter();
    let bounded = true;
    for (let i = 0; i < w.grid.length; i++) {
      if (!w.grid[i]) continue;
      const p = w.provs[w.grid[i] - 1], dx = i % w.W - p.sx, dy = Math.floor(i / w.W) - p.sy;
      if (dx * dx + dy * dy > p.radiusSq) bounded = false;
    }
    const route = FB.travelRoute('kath_district','gurganj_district');
    const host = FB.armyLegQuote(s,{realm:'khwarazm_1204',men:100},'kath_district','gurganj_district');
    return {bounded:bounded,units:FB.landRouteUnits('kath_district','gurganj_district'),
      route:route.includes('gurganj_district'),next:FB.travelNextLegDays({currentId:'kath_district',remainingRoute:['gurganj_district'],legDays:3}),
      dry:!FB.waterCrossing('kath_district','gurganj_district') && !host.water,
      supply:FB.travelCostSnapshot('service',['gurganj_district'],s) > FB.travelCostSnapshot('service',1,s),
      seasons:['gao_district','kath_district','palmyra_district'].every(function (id) { return !!FB.localSeason(s,id); }),
      pure:rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({bounded:true,units:3,route:true,next:9,dry:true,supply:true,seasons:true,pure:true});
});

test('an expanded save restores its own geography after selecting other dates and the retained baseline',async function ({page},info) {
  await startHistoricalGame(page,info,journey('gurganj_district'));
  const source = await saveWithin(page,4 * 1024 * 1024), before = await facts(page);
  for (const id of ['867','1066','1204']) {
    await page.evaluate(function (id) {
      if (id === '1204') FBDATA.bookmarks[id].revision = 'baseline';
      return new Promise(function (resolve,reject) {
        FB.activateBookmark(id,null,function (error) {
          if (id === '1204') FBDATA.bookmarks[id].revision = 'inhabited_v2';
          if (error) reject(error); else resolve();
        });
      });
    },id);
    await restoreBookmark(page,source); expect(await facts(page)).toEqual(before);
    expect(await page.evaluate(function () {
      return [FB.state.start.revision,FB.activeGeographyId,FB.mobile.total(FB.state,'qipchaq_following_1204')];
    })).toEqual(['inhabited_v2','europe_regional_2',1600]);
  }
  await page.addScriptTag({path:require('path').join(__dirname,'../support/fixtures/platform-schema-1-reader.js')});
  expect(await page.evaluate(function () {
    return window.legacyPlatformReader.envelopeIssue(JSON.parse(FB.save.serialize()));
  })).toBe('platformSchema');
});

test('observer AI advances the expanded world and preserves its save budget',async function ({page},info) {
  test.skip(info.project.name !== 'chromium-served','Bounded observer review runs once.');
  test.setTimeout(240000); await openGame(page,info);
  await page.evaluate(function () {
    return new Promise(function (resolve,reject) {
      FB.activateBookmark('1204',null,function (error) {
        if (error) { reject(error); return; }
        FB.game.pending = {seed:'TERRAIN1204-OBSERVER'}; FB.game.startObserve(); FB.game.setPaused(true); resolve();
      });
    });
  });
  await injectBrowserHarness(page); await advanceBookmark(page,90);
  const source = await saveWithin(page,8 * 1024 * 1024), before = await facts(page);
  await restoreBookmark(page,source); expect(await facts(page)).toEqual(before);
});
