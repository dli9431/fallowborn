'use strict';
const {test,expect} = require('../support/fixture');
const {dependsOnRuntime} = require('../support/runtime-dependencies');
const {installPageGuards} = require('../support/page-contract');
const {openGame} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {injectBrowserHarness} = require('../support/game/browser-harness');
const {advanceBookmark,restoreBookmark,facts,beginBookmark} = require('../support/game/bookmark-acceptance');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_493.js','data/bookmark_493_world.js','data/bookmark_493_history.js',
  'data/bookmark_476_outer.js','data/bookmark_476_wider_identities.js','data/geographies.js',
  'data/geography_expansion.js','data/settlements.js','data/starts.js','data/cultures.js',
  'data/political_institutions.js','data/aristocratic_courts.js','data/assembly_polities.js',
  'data/technology.js','data/eras.js','data/systems.js','data/story_instances.js',
  'js/world.js','js/main.js','js/save.js','js/save_v4.js','js/bookmark_setup.js','js/starts.js',
  'js/institutions.js','js/religion.js','js/authority.js','js/model.js','js/population.js',
  'js/governments.js','js/government_selection.js','js/government_lineage.js',
  'js/government_support.js','js/government_assembly.js','js/government_collective.js',
  'js/government_aristocracy.js','js/government_recognition.js','js/government_administration.js',
  'js/treasury.js','js/stories.js','js/story_campaign.js','js/wars.js','js/travel.js','js/armies.js'
]);

// Review-only visibility and revision selection stay local to this specification.
async function start493(page,testInfo,county,options) {
  options = options || {};
  if (options.crazygames) {
    await mockCrazyGames(page);
    await page.addInitScript(function () {
      window.FB_DISTRIBUTION = 'crazygames';
      window.FB_CRAZYGAMES_STORAGE = 'localstorage';
    });
    await openCrazyGame(page,testInfo);
  } else await openGame(page,testInfo);
  await page.evaluate(function (revision) {
    FBDATA.bookmarks['493'].hidden = false;
    FBDATA.bookmarks['493'].revision = revision;
  },options.baseline ? 'baseline' : 'world_v2');
  const beginning = page.locator('#btn-choose-beginning');
  if (await beginning.isVisible()) await beginning.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill((options.seed || 'WORLD493') + '-493-farmer_493-' + county + '-m-Review-established');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
  await page.getByRole('button',{name:'Begin',exact:true}).click();
  await page.evaluate(function () {
    FB.game.setPaused(true); FB.game.auto.all = true; FB.game.auto.style = 'first';
    FB.game.uiPrefs.hideTips = true; FB.game.uiPrefs.hideBeginnerHints = true;
    FB.ui.coachmarkReset(); delete FB.state.player.flags.tutorial;
    FBDATA.bookmarks['493'].revision = 'world_v2';
    FBDATA.bookmarks['493'].hidden = true;
  });
  await injectBrowserHarness(page);
}

async function budget(page,testInfo,label,ceiling) {
  const source = await page.evaluate(function () { return FB.save.serialize(); });
  const bytes = Buffer.byteLength(source,'utf8');
  await testInfo.attach(label + '.json',{contentType:'application/json',
    body:Buffer.from(JSON.stringify({bytes:bytes,ceiling:ceiling}))});
  expect(bytes).toBeLessThanOrEqual(ceiling);
  return source;
}

test('493 coverage accounts for each omission once and keeps its retained world independent',async function ({page},testInfo) {
  await openGame(page,testInfo);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('493'), old = FB.bookmark('493','baseline'), c = FBDATA.bookmarkExpansion493;
    const ids = [].concat.apply([],Object.keys(c.phases).filter(function (key) { return key !== 'scenery'; })
      .map(function (key) { return c.phases[key]; }));
    const disabled = old.provinces.filter(function (p) { return p.wasteland && p.id.indexOf('w_') !== 0; });
    const source = JSON.stringify(b);
    // Same-date expansion must never borrow another date's mutable politics.
    const other = FBDATA.bookmarks['476'].realms[0], name = other.ruler.name;
    other.ruler.name = 'Different earlier court';
    const independent = source === JSON.stringify(FB.bookmark('493')); other.ruler.name = name;
    const byId = {}; b.provinces.forEach(function (p) { byId[p.id] = p; });
    return {faults:FB.validateBookmark(b),baselineFaults:FB.validateBookmark(old),hidden:b.hidden,
      offered:FB.bookmarks().some(function (x) { return x.id === '493'; }),
      baseline:[old.geography,old.provinces.length,disabled.length,old.localInstitutions.alexandria_see.site],
      current:[b.geography,b.provinces.length,b.provinces.filter(function (p) { return !p.wasteland; }).length],
      once:ids.length === 260 && new Set(ids).size === 260 && disabled.every(function (p) { return ids.includes(p.id); }),
      complete:ids.every(function (id) { return !byId[id].wasteland && !!byId[id].realm; }),
      communities:c.provinces.every(function (p) { return p.communities.reduce(function (n,x) { return n+x.populationShare0; },0) === 10000; }),
      deferred:Object.keys(c.deferred).length,scenery:Object.keys(c.scenery).length,
      retained:Object.keys(c.scenery).concat(Object.keys(c.deferred)).every(function (id) { return byId[id].wasteland; }),
      added:c.phases.scenery.length,independent:independent,
      actors:JSON.stringify(old.opening.actors) === JSON.stringify(FBDATA.bookmarks['493'].opening.actors),
      stories:JSON.stringify(b.stories) === JSON.stringify(old.stories),
      tech:FBDATA.techImpactReviews.features.period_493_world_habitation.mode,
      names:['fustat','baghdad','dublin','birka','sarkel','mansura','lalibela'].map(function (id) { return byId[id].name; }),
      kawad:c.realms.find(function (r) { return r.id === 'sasanian_493'; }).ruler.name,
      east:byId.amida.realm,marw:byId.merv.realm};
  })).toEqual({faults:[],baselineFaults:[],hidden:true,offered:false,
    baseline:['europe_regional',498,260,null],current:['europe_regional_2',527,489],
    once:true,complete:true,communities:true,deferred:17,scenery:21,retained:true,added:12,
    independent:true,actors:true,stories:true,tech:'none',
    names:['Babylon of Egypt','Ctesiphon','Liffey estuary','Maelar lake communities','Lower Don crossings','Lower Indus settlements','Southern highland communities'],
    kawad:'Kawad I',east:'east_493',marw:'hephthalite_493'});
});

for (const crazygames of [false,true]) test('expanded 493 sites, offices and actors round trip, distribution flag ' + crazygames,
  async function ({page},testInfo) {
    await start493(page,testInfo,'alexandria',{crazygames:crazygames});
    const before = await facts(page);
    const source = await budget(page,testInfo,'fresh-493',4*1024*1024);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
    expect(await page.evaluate(function () {
      const s = FB.state, b = FB.campaignBookmark(s), c = FBDATA.bookmarkExpansion493;
      const app = s.authority.appointments.find(function (a) { return a.id === s.bookmarkSetup.appointments.alexandria_delegate_493.id; });
      return {revision:s.start.revision,geography:s.start.geography,valid:FB.save.v4.validatePlatform(s),
        bound:['alexandria','antioch','jerusalem'].every(function (id) {
          const d = b.localInstitutions[id+'_see'];
          return d.provinceId === id && d.site === c.settlementLayouts[id][0].site && !!s.localInstitutions[id+'_see'];
        }),
        slots:c.provinces.every(function (p) {
          const list = FB.world.sitesByProv[p.id].list.filter(function (x) { return x.authored; });
          return list.length === 1 && list[0].site === c.settlementLayouts[p.id][0].site;
        }),
        actor:app.holder.id === s.bookmarkSetup.actors.alexandria_delegate_493 && app.scope.id === 'alexandria',
        unique:new Set(Object.values(s.bookmarkSetup.actors)).size === Object.keys(s.bookmarkSetup.actors).length,
        ctesiphon:b.settlementLayout === '493_world_v2' && FB.world.sitesByProv.baghdad.list.some(function (x) { return x.site === 'baghdad_outer_476'; }),
        noFeudal:c.provinces.every(function (p) { return s.holder[p.id] === p.realm; })};
    })).toEqual({revision:'world_v2',geography:'europe_regional_2',valid:true,bound:true,slots:true,
      actor:true,unique:true,ctesiphon:true,noFeudal:true});
    await budget(page,testInfo,'restored-493',4*1024*1024);
  });

for (const seed of ['WORLD493','KAWAD493']) test('493 independently recreates the same opening for ' + seed,
  async function ({page,browser},testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served','Fresh seed coverage is bounded to one project.');
    await start493(page,testInfo,'baghdad',{seed:seed});
    const before = await facts(page);
    const context = await browser.newContext({viewport:{width:1280,height:800},locale:'en-US',timezoneId:'UTC'});
    try {
      const second = await context.newPage(), guard = installPageGuards(second);
      await start493(second,testInfo,'baghdad',{seed:seed});
      expect(await facts(second)).toEqual(before);
      expect(guard.faults).toEqual([]);
    } finally { await context.close(); }
  });

test('493 Egyptian household receives scoped imperial authority without changing land or residents',async function ({page},testInfo) {
  await start493(page,testInfo,'alexandria');
  expect(await page.evaluate(function () {
    const s = FB.state, c = s.chars[s.player.charId], actor = {kind:'character',id:c.id};
    s.player.gold = 200; s.player.prestige = 200; c.skills.dip = 20;
    const land = JSON.stringify([s.owner,s.holder,s.population]);
    const terms = {institutionId:'east_493',officeId:'defensor_civitatis',holder:actor,
      scope:{kind:'county',id:'alexandria'}};
    const q = FB.officeAppointmentQuote(s,actor,terms), gold = s.player.gold;
    const appointment = FB.officeSeekAppointment(s,q);
    const after = JSON.stringify(s), repeated = FB.officeSeekAppointment(s,q);
    return {allowed:q.allowed,created:!!appointment,repeated:repeated,unchanged:after === JSON.stringify(s),
      charged:s.player.gold === gold-q.cost,land:land === JSON.stringify([s.owner,s.holder,s.population]),
      local:FB.political.power(s,actor,'peace',{provinceId:'alexandria'}).allowed,
      distant:FB.political.power(s,actor,'peace',{provinceId:'antioch'}).allowed,
      valid:FB.save.v4.validatePlatform(s)};
  })).toEqual({allowed:true,created:true,repeated:false,unchanged:true,charged:true,land:true,
    local:true,distant:false,valid:true});
  const source = await budget(page,testInfo,'egyptian-office',4*1024*1024), before = await facts(page);
  await restoreBookmark(page,source);
  expect(await facts(page)).toEqual(before);
});

for (const county of ['alexandria','erfurt','tara','turku','kiev','dvin','axum','sanaa','baghdad','balkh','cherson','jenne_district']) {
  test('493 regional household completes a season at ' + county,async function ({page},testInfo) {
    test.skip(testInfo.project.name !== 'chromium-served','Regional natural-day coverage is bounded to one project.');
    test.setTimeout(180000);
    await start493(page,testInfo,county);
    await advanceBookmark(page,45);
    const source = await budget(page,testInfo,county+'-midpoint',6*1024*1024), before = await facts(page);
    await restoreBookmark(page,source);
    expect(await facts(page)).toEqual(before);
    await advanceBookmark(page,45);
    const after = await facts(page);
    await restoreBookmark(page,source);
    await advanceBookmark(page,45);
    expect(await facts(page)).toEqual(after);
  });
}

test('493 baseline frontier, institutions and story commitments survive expanded and other-date loads',async function ({page},testInfo) {
  test.setTimeout(180000);
  await start493(page,testInfo,'ravenna',{baseline:true});
  const prior = await page.evaluate(function () {
    const s = FB.state;
    s.player.gold = 5000; s.player.prestige = 500; FB.settleWaste(s,'w_karakum');
    if (FB.world.byId.w_karakum.wasteland) throw new Error('Frontier setup failed');
    const data = JSON.parse(FB.save.serialize()); data.platformSchema = 1; delete data.state.start.revision;
    return {text:JSON.stringify(data),facts:JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup,s.stories,s.localInstitutions,s.wastelandSettlements]),
      sites:JSON.stringify(FB.world.sitesByProv.w_karakum)};
  });
  await start493(page,testInfo,'baghdad');
  const expanded = await budget(page,testInfo,'expanded-switch',4*1024*1024), expandedFacts = await facts(page);
  await beginBookmark(page,testInfo,'476','farmer_476');
  const earlier = await page.evaluate(function () { return FB.save.serialize(); });
  await beginBookmark(page,testInfo,'867','farmer');
  const later = await page.evaluate(function () { return FB.save.serialize(); });
  for (const other of [earlier,later,expanded]) {
    await restoreBookmark(page,other);
    await restoreBookmark(page,prior.text);
    expect(await page.evaluate(function () {
      const s = FB.state;
      return {revision:s.start.revision,geo:s.start.geography,added:!!FB.world.byId.kath_district,
        facts:JSON.stringify([s.owner,s.holder,s.population,s.bookmarkSetup,s.stories,s.localInstitutions,s.wastelandSettlements]),
        sites:JSON.stringify(FB.world.sitesByProv.w_karakum),site:FB.campaignBookmark(s).localInstitutions.alexandria_see.site,
        valid:FB.save.v4.validatePlatform(s)};
    })).toEqual({revision:'baseline',geo:'europe_regional',added:false,facts:prior.facts,sites:prior.sites,site:null,valid:true});
  }
  await restoreBookmark(page,expanded);
  expect(await facts(page)).toEqual(expandedFacts);
  expect(await page.evaluate(function () {
    const data = JSON.parse(FB.save.serialize()), live = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    return [function (d) { d.state.start.revision = 'unknown'; },
      function (d) { d.state.start.geography = 'europe_regional'; }].map(function (mutate) {
        const bad = JSON.parse(JSON.stringify(data)); mutate(bad);
        return FB.game.loadData(bad) === false && live === FB.state && rng === FB.getRngState() && uid === FB.getUidCounter();
      });
  })).toEqual([true,true]);
});

test('493 kin recognition transfers political authority once and preserves local households',async function ({page},testInfo) {
  await start493(page,testInfo,'tara');
  expect(await page.evaluate(function () {
    const s = FB.state, rid = 'midland_irish_493', S = FB.governmentSelection, actor = {kind:'realm',id:rid};
    FB.realmHeldCounties(s,rid).forEach(function (id) { FB.setCountySupport(s,id,40); });
    FB.treasuryCredit(s,rid,100);
    const communities = JSON.stringify(s.population), owners = JSON.stringify(s.owner);
    const opened = S.apply(s,S.quote(s,rid,{action:'open',actor:actor,cause:'abdication'}));
    const candidate = S.candidates(s,rid)[0];
    const negotiated = S.apply(s,S.quote(s,rid,{action:'negotiate',actor:actor,candidateId:candidate,terms:S.profile(s,rid).terms}));
    const q = S.quote(s,rid,{action:'resolve',actor:actor});
    const resolved = S.apply(s,q), repeated = S.apply(s,q);
    return {opened:opened,negotiated:negotiated,resolved:resolved,repeated:repeated,
      communities:communities === JSON.stringify(s.population),owners:owners === JSON.stringify(s.owner),
      recognized:S.recognized(s,rid),valid:FB.save.v4.validatePlatform(s)};
  })).toEqual({opened:true,negotiated:true,resolved:true,repeated:false,communities:true,owners:true,recognized:true,valid:true});
});

test('493 Kawad has living royal alternatives, magnate assent and separate Armenian rights',async function ({page},testInfo) {
  await start493(page,testInfo,'baghdad');
  expect(await page.evaluate(function () {
    const s = FB.state, rid = 'sasanian_493', A = FB.aristocracy, R = FB.governmentRecognition;
    FB.realmHeldCounties(s,rid).forEach(function (id) { FB.setCountySupport(s,id,40); });
    const candidate = R.candidates(s,rid).find(function (c) { return R.candidateMember(s,rid,c.id).name === 'Jamasp'; });
    if (!candidate) throw new Error('Missing current royal alternative');
    const owner = JSON.stringify(s.owner), population = JSON.stringify(s.population);
    const nonRoyal = !A.royalEligibility(s,rid,s.bookmarkSetup.actors.mihran_principal_493).allowed;
    const voices = A.constituency(s,rid);
    const backed = R.members(s,rid).every(function (m) {
      return R.applySupport(s,R.supportQuote(s,m.principal,rid,m.id,candidate.id,A.profile(s,rid).defaultTerms));
    });
    const q = FB.publicAccessionQuote(s,{kind:'realm',id:rid},rid,'abdication');
    const changed = !!FB.publicAccede(s,q);
    return {backed:backed,changed:changed,nonRoyal:nonRoyal,
      armenian:voices.some(function (m) { return m.scope.id === 'dvin' && m.rightIds.length === 2; }),
      unchanged:owner === JSON.stringify(s.owner) && population === JSON.stringify(s.population),
      ruler:FB.realmRulerCharacterSnapshot(s,rid).name,valid:FB.save.v4.validatePlatform(s)};
  })).toEqual({backed:true,changed:true,nonRoyal:true,armenian:true,unchanged:true,ruler:'Jamasp',valid:true});
});

test('493 conquest distinguishes a community holder from an ordinary royal holder',async function ({page},testInfo) {
  await start493(page,testInfo,'turku');
  expect(await page.evaluate(function () {
    const s = FB.state, original = s.holder.turku;
    const population = JSON.stringify([s.population.counties.turku,s.population.counties.axum]);
    FB.transferProvince(s,'turku','svear_493');
    FB.transferProvince(s,'axum','upper_nile_493');
    return {community:s.owner.turku === 'svear_493' && s.holder.turku === original,
      royal:s.owner.axum === 'upper_nile_493' && s.holder.axum === 'upper_nile_493',
      preserved:population === JSON.stringify([s.population.counties.turku,s.population.counties.axum])};
  })).toEqual({community:true,royal:true,preserved:true});
});

test('493 observer season keeps the declared time and storage budgets',async function ({page},testInfo) {
  test.skip(testInfo.project.name !== 'chromium-served','Owner-run observer measurement.');
  await start493(page,testInfo,'alexandria');
  await page.evaluate(function () { FB.game.observe = true; });
  for (let slice=0;slice<2;slice++) {
    const start = Date.now(); await advanceBookmark(page,45); const elapsed = Date.now()-start;
    await testInfo.attach('493-observer-'+slice+'.json',{contentType:'application/json',
      body:Buffer.from(JSON.stringify({days:45,elapsedMs:elapsed,ceilingMs:30000}))});
    expect(elapsed).toBeLessThanOrEqual(30000);
    const source = await budget(page,testInfo,'493-observer-'+slice,8*1024*1024), before = await facts(page);
    await restoreBookmark(page,source); expect(await facts(page)).toEqual(before);
  }
});
