'use strict';
const fs = require('fs');
const path = require('path');
const {test,expect} = require('../support/fixture');
const {openGame,openTitle} = require('../support/game/navigation');
const {openCrazyGame} = require('../support/game/crazygames-title');
const {mockCrazyGames} = require('../support/crazygames');
const {beginBookmark,beginBookmarkFromTitle,restoreBookmark,facts} = require('../support/game/bookmark-acceptance');
const {dependsOnRuntime} = require('../support/runtime-dependencies');

dependsOnRuntime(__filename,[
  'index.html','data/bookmark_634.js','data/starts_634_ordinary.js','data/bookmark_634_identities.js',
  'data/bookmark_634_scaffold_a.js','data/bookmark_634_scaffold_b.js',
  'data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
  'data/starts_634_ctesiphon.js','data/story_households_634_ctesiphon.js',
  'data/starts_634_rulers.js','data/story_ruler_agendas_634.js',
  'data/starts_634_damascus.js','data/story_households_634_damascus.js',
  'data/starts_634_frontier.js','data/story_households_634_frontier.js',
  'data/starts_634_medina.js','data/story_households_634_medina.js',
  'data/bookmark_sources.js','js/bookmark_sources.js',
  'data/bookmark_568.js','data/bookmark_568_identities.js','data/bookmark_493_world.js',
  'data/bookmark_476_wider.js','data/bookmark_476_wider_identities.js',
  'data/bookmarks.js','data/geographies.js','data/geography_expansion.js',
  'data/settlements.js','data/settlements_real.js','data/cultures.js','data/eras.js',
  'data/starts.js','data/climate.js','data/systems.js','data/traits.js','data/intrigue.js','data/distribution_crazygames.js',
  'data/political_institutions.js','data/assembly_polities.js','data/aristocratic_courts.js',
  'data/government_rollout.js','data/communal_revisions.js',
  'js/model.js','js/world.js','js/main.js','js/starts.js','js/bookmark_setup.js',
  'js/bookmark_composition.js','js/mods.js','js/stories.js','js/messages.js',
  'js/story_ruler_agenda.js','js/story_household_observer.js','js/story_household.js','js/story_opening_goals.js',
  'js/governments.js','js/government_recognition.js','js/government_elective.js','js/government_selection.js','js/climate.js',
  'js/government_civic.js','js/institutions.js','js/religious_institutions.js',
  'js/save.js','js/save_v4.js','js/systems.js','js/crazygames.js'
]);

const order = ['b01','b02','b03','b04','b05','b06','b07','b08','b09','b10',
  'b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21',
  'b22','b23','b24','b25','b26','b27','b28','b29','scenery_a','scenery_b','scenery_c','scenery_d'];
const disabled = ['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
  'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars'];
const source = fs.readFileSync(path.resolve(__dirname,'../../../data/bookmark_634.js'),'utf8');
const startSource = fs.readFileSync(path.resolve(__dirname,'../../../data/starts_634_ordinary.js'),'utf8');
const startIds = ['farmer_634','craftsman_634','ctesiphon_household_634','umar_634','heraclius_634',
  'damascus_household_634','frontier_household_634','medina_household_634'];

async function chooseBeginning(page) {
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
}

test('634 loads every start and story contributor before the native manifest closes',async function () {
  const html = fs.readFileSync(path.resolve(__dirname,'../../../index.html'),'utf8');
  const scripts = Array.from(html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g));
  const sources = ['data/bookmark_634_identities.js','data/bookmark_634_scaffold_a.js',
    'data/bookmark_634_scaffold_b.js','data/bookmark_634_scaffold_c.js','data/bookmark_634_scaffold_d.js',
    'data/starts_634_ordinary.js','data/bookmark_634.js','data/starts_634_ctesiphon.js',
    'data/starts_634_rulers.js','data/starts_634_damascus.js','data/starts_634_frontier.js','data/starts_634_medina.js',
    'data/story_ruler_agendas_634.js','data/story_households_634_ctesiphon.js',
    'data/story_households_634_damascus.js','data/story_households_634_frontier.js','data/story_households_634_medina.js'];
  expect(scripts.filter(function (script) { return /634/.test(script[1]); }).map(function (script) { return script[1]; }))
    .toEqual(sources);
  const paths = scripts.map(function (script) { return script[1]; });
  sources.forEach(function (source) {
    const entry = scripts.find(function (script) { return script[1] === source; });
    expect(entry[0]).toMatch(/\bdefer\b/);
    expect(entry[0]).not.toMatch(/\basync\b|type="module"/);
    expect(paths.indexOf(source)).toBeGreaterThan(paths.indexOf('js/bookmark_sources.js'));
    expect(paths.indexOf(source)).toBeLessThan(paths.indexOf('data/bookmark_sources.js'));
  });
});

test('634 is offered chronologically and all eight implemented starts are selectable in development setup',async function ({page},info) {
  await openTitle(page,info);
  await chooseBeginning(page);
  await expect(page.locator('#bookmarklist [data-bookmark="634"]')).toContainText('The Early Conquests');
  expect(await page.locator('#bookmarklist [data-bookmark]').evaluateAll(function (cards) {
    return cards.map(function (card) { return card.getAttribute('data-bookmark'); });
  })).toEqual(['476','568','634','711','800','867','1066','1096','1204','1241']);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  expect(await page.locator('#scenariolist .scen-group').allTextContents())
    .toEqual(['Historical starts','Story starts','Open starts']);
  expect(await page.locator('#scenariolist [data-scenario]').evaluateAll(function (cards) {
    return cards.map(function (card) { return card.getAttribute('data-scenario'); });
  })).toEqual(['umar_634','heraclius_634','ctesiphon_household_634','damascus_household_634',
    'frontier_household_634','medina_household_634','farmer_634','craftsman_634']);
  for (const id of startIds) {
    const card = page.locator('#scenariolist [data-scenario="' + id + '"]');
    await expect(card).toBeVisible();
    await expect(card).not.toHaveAttribute('aria-disabled','true');
    await expect(card).not.toHaveClass(/locked/);
  }
  expect(await page.locator('#scenariolist [data-scenario="yazdegerd_634"]').count()).toBe(0);
  expect(await page.evaluate(function () {
    const b = FB.bookmark('634');
    if (!b) throw new Error(JSON.stringify(FB.bookmarkRuntimeDiagnostics()));
    return {review:FBDATA.reviewOpenStarts,available:FB.bookmarkAvailable('634'),
      hidden:!!b.hidden,faults:FB.validateBookmark(b),state:FB.state,
      rulers:FBDATA.startScenarios.filter(function (s) {
        return s.id === 'umar_634' || s.id === 'heraclius_634';
      }).map(function (s) { return [s.id,s.hidden]; })};
  })).toEqual({review:true,available:true,hidden:false,faults:[],state:null,
    rulers:[['umar_634',true],['heraclius_634',true]]});
  await page.locator('#scenariolist [data-scenario="heraclius_634"]').click();
  await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
  await expect(page.locator('#cg-name')).toHaveValue('Heraclius');
  await page.locator('#btn-cg-back').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  await page.locator('#btn-ng-back').click();
  await page.locator('#bookmarklist [data-bookmark="476"]').click();
  await expect(page.locator('#scenariolist [data-scenario="federate_476"]')).toBeVisible();
  await page.locator('#btn-ng-back').click();
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.locator('#scenariolist [data-scenario]')).toHaveCount(8);
});

test('634 remains selectable with review disabled while its two ruler candidates stay hidden',async function ({page},info) {
  await page.addInitScript(function () {
    window.FBDATA = window.FBDATA || {}; window.FBDATA.reviewOpenStarts = false;
  });
  await openTitle(page,info);
  await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await expect(page.locator('#newgame:not(.hidden)')).toBeVisible();
  expect(await page.locator('#scenariolist [data-scenario]').evaluateAll(function (cards) {
    return cards.map(function (card) { return card.getAttribute('data-scenario'); });
  })).toEqual(['ctesiphon_household_634','damascus_household_634','frontier_household_634',
    'medina_household_634','farmer_634','craftsman_634']);
});

test('634 Observe enters the selected opening through the ordinary picker',async function ({page},info) {
  await openTitle(page,info);
  await chooseBeginning(page);
  await page.locator('#bookmarklist [data-bookmark="634"]').click();
  await page.evaluate(function () {
    const start = FB.game.startObserve;
    FB.game.startObserve = function () {
      const result = start.apply(this,arguments);
      FB.game.setPaused(true);
      FB.game.startObserve = start;
      return result;
    };
  });
  await page.locator('#scenariolist button').filter({hasText:'Observe'}).click();
  await expect(page.locator('#game:not(.hidden)')).toBeVisible();
  expect(await page.evaluate(function () {
    FB.game.setPaused(true);
    return {observe:FB.game.observe,id:FB.state.start.id,revision:FB.activeBookmark.revision,
      geography:FB.activeBookmark.geography,date:FB.state.date};
  })).toEqual({observe:true,id:'634',revision:'baseline',geography:'europe_regional_2',
    date:{year:634,season:2,day:1}});
});

for (const opening of [
  ['umar_634','medina','Umar','standard','umar_agenda_634'],
  ['heraclius_634','constantinople','Heraclius','standard','heraclius_agenda_634'],
  ['ctesiphon_household_634','baghdad','Review','established','ctesiphon_household_track_634'],
  ['damascus_household_634','damascus','Review','established','damascus_household_track_634'],
  ['frontier_household_634','damascus','Review','established','frontier_household_track_634'],
  ['medina_household_634','medina','Review','established','medina_household_track_634']
]) {
  test('selectable 634 start code creates and restores ' + opening[0] + ' without replay',async function ({page},info) {
    await openTitle(page,info);
    await chooseBeginning(page);
    await page.locator('#btn-bm-seed').click();
    await page.locator('#ng-seed').fill('SELECT634-634-' + opening[0] + '-' + opening[1] + '-m-' + opening[2] + '-' + opening[3]);
    await page.locator('#ng-seed').press('Enter');
    await expect(page.locator('#chargen:not(.hidden)')).toBeVisible();
    await page.getByRole('button',{name:'Begin Your Story',exact:true}).click();
    await page.getByRole('button',{name:'Begin',exact:true}).click();
    expect(await page.evaluate(function (opening) {
      FB.game.setPaused(true);
      const s = FB.state;
      s.player.gold -= 3;
      return {id:s.start.id,scenario:s.start.scenarioId,home:s.player.provinceId,
        track:!!s.stories[opening[4]],valid:FB.save.v4.validatePlatform(s)};
    },opening)).toEqual({id:'634',scenario:opening[0],home:opening[1],track:true,valid:true});
    const before = await facts(page), saved = await page.evaluate(function () { return FB.save.serialize(); });
    await page.evaluate(function () {
      FBDATA.bookmarks['634'].hidden = true;
      return new Promise(function (resolve,reject) {
        FB.activateBookmark('867',null,function (error) { if (error) reject(error); else resolve(); });
      });
    });
    await restoreBookmark(page,saved);
    expect(await facts(page)).toEqual(before);
    expect(await page.evaluate(function () {
      return {hidden:FB.bookmark('634').hidden,errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
    })).toEqual({hidden:true,errors:[],valid:true});
  });
}

for (const crazy of [false,true]) {
  test('634 composes the complete selectable opening on ' + (crazy ? 'CrazyGames' : 'standard'),
    async function ({page},info) {
      const pageErrors = [];
      page.on('pageerror',function (error) { pageErrors.push(error.message); });
      if (crazy) {
        await mockCrazyGames(page);
        await page.addInitScript(function () {
          window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
        });
        await openCrazyGame(page,info);
      } else await openGame(page,info);
      expect(await page.evaluate(function () {
        return FB.bookmarkCompositions.sourceReports().find(function (report) { return report.bookmarkId === '634'; });
      })).toMatchObject({ready:true,published:true,worldFaults:[]});
      expect(await page.evaluate(function () {
        const invalid = JSON.parse(JSON.stringify(FBDATA.traitMechanics));
        invalid.greedy.schemeOrder.ids.push('missing_plot');
        return {faults:FB.validateTraitMechanics(FBDATA.traitMechanics),
          greedy:FB.traitSchemeOrder({traits:['greedy']}),
          wrathful:FB.traitSchemeOrder({traits:['wrathful']}),
          cruel:FB.traitSchemeOrder({traits:['cruel']}),
          assassination:!!FBDATA.plots.assassination,widowVeil:!!FBDATA.plots.widow_veil,
          unknownRejected:FB.validateTraitMechanics(invalid).length > 0};
      })).toEqual({faults:[],
        greedy:['blackmail','sabotage','fabricated_charge','abduction'].concat(crazy ? [] : ['assassination']),
        wrathful:(crazy ? [] : ['assassination']).concat(['abduction','sabotage','fabricated_charge','blackmail']),
        cruel:(crazy ? [] : ['assassination']).concat(['abduction','sabotage','fabricated_charge','blackmail']),
        assassination:!crazy,widowVeil:!crazy,unknownRejected:true});
      const result = await page.evaluate(function (input) {
        const b = FB.bookmark('634'), data = JSON.stringify(FBDATA), rng = FB.getRngState(), uid = FB.getUidCounter();
        const courts = {}, counties = {}, faults = [];
        b.realms.forEach(function (r) {
          if (courts[r.id]) faults.push('duplicate court ' + r.id);
          courts[r.id] = r;
        });
        const expected = input.order.reduce(function (ids,key) {
          return ids.concat(FBDATA.bookmarkRegions634[key].provinces.map(function (p) { return p.id; }));
        },[]);
        const layout = FBDATA.settlementLayouts[b.settlementLayout];
        b.provinces.forEach(function (p) {
          if (counties[p.id]) faults.push('duplicate county ' + p.id);
          counties[p.id] = p;
          if (p.wasteland) {
            if (p.realm || p.communities || layout[p.id]) faults.push('inhabited scenery ' + p.id);
            return;
          }
          if (!courts[p.realm] || !layout[p.id] || !layout[p.id].length) faults.push('unresolved county ' + p.id);
          if (!FBDATA.climateZones[b.climate.provinces[p.id]]) faults.push('unresolved climate ' + p.id);
          layout[p.id].forEach(function (slot) {
            if (!FBDATA.settlementSites[slot.site]) faults.push('unresolved site ' + slot.site);
          });
        });
        b.realms.forEach(function (r) {
          const capital = counties[r.capital];
          if (!capital || capital.wasteland || (capital.realm !== r.id && !r.nonTerritorial) || r.liege && !courts[r.liege])
            faults.push('unresolved capital/liege ' + r.id);
          if (!FBDATA.governmentForms[r.government]) faults.push('unpublished government ' + r.id);
        });
        const validated = FB.validateBookmark(b);
        const nonTerritorial = b.realms.filter(function (r) { return r.nonTerritorial; })
          .map(function (r) { return [r.id,r.capital,counties[r.capital].realm]; });
        const otherBookmarks = ['476','867','1066'].map(function (id) {
          return {id:id,faults:FB.validateBookmark(FB.bookmark(id))};
        });
        return {metadata:[b.id,b.name,b.date,b.era,b.geography,b.settlementLayout,b.revision,b.openingRevision],
          hidden:!!b.hidden,available:FB.bookmarkAvailable('634'),listed:FB.bookmarks().some(function (v) { return v.id === '634'; }),
          count:b.provinces.length,inhabited:b.provinces.filter(function (p) { return !p.wasteland; }).length,
          complete:JSON.stringify(Object.keys(counties).sort()) === JSON.stringify(FB.geography(b.geography).provinces.map(function (p) { return p.id; }).sort()),
          ordered:JSON.stringify(b.provinces.map(function (p) { return p.id; })) === JSON.stringify(expected),
          courts:b.realms.length,named:b.realms.filter(function (r) { return r.ruler && r.ruler.name; }).map(function (r) { return r.ruler.name; }).sort(),
          climates:[b.climate.provinces.coruna,b.climate.provinces.medina],
          layouts:Object.keys(layout).length,crossings:b.straits.length,
          disabled:b.systems.disable,empty:[b.localInstitutions,b.religiousHeads,b.stories,b.scripted,b.opening],
          forms:FB.governments.problems('medinan_selection_pf_634'),faiths:FB.validateReligionData(null),
          faults:faults,validated:validated,nonTerritorial:nonTerritorial,otherBookmarks:otherBookmarks,
          pure:data === JSON.stringify(FBDATA) && rng === FB.getRngState() && uid === FB.getUidCounter()};
      },{order:order});
      expect(result).toEqual({metadata:['634','The Early Conquests',{year:634,season:2,day:1},'late_antique',
        'europe_regional_2','634_opening','baseline','baseline'],hidden:false,available:true,listed:true,
        count:527,inhabited:506,complete:true,ordered:true,courts:122,
        named:['Dagobert I','Heraclius','Oswald','Sigebert III','Umar','Yazdegerd III'],
        climates:['northern_temperate','arid'],layouts:506,crossings:22,disabled:disabled,
        empty:[{},{},['damascus_household_observer_634'],[],{actors:{},appointments:{},estates:[],claims:[],migrations:[]}],
        forms:[],faiths:[],faults:[],validated:[],
        nonTerritorial:[['aures_634','constantine','byzantium_634']],
        otherBookmarks:[{id:'476',faults:[]},{id:'867',faults:[]},{id:'1066',faults:[]}],pure:true});
      expect(pageErrors).toEqual([]);
    });
}

test('634 reuses shared site metadata and publishes detached starts once',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function (input) {
    const siteId = 'najran_oasis_wider_476', site = FBDATA.settlementSites[siteId];
    const siteSnapshot = JSON.stringify(site);
    const before = JSON.stringify(FBDATA), state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    (0,eval)(input.startSource);
    const stagingInert = before === JSON.stringify(FBDATA);
    (0,eval)(input.source);
    FB.bookmarkCompositions.publishPending();
    return {siteFields:Object.keys(FBDATA.bookmarkRegions634.b28.settlementSites[siteId]).sort(),
      named:Array.isArray(site.names) && site.names.length > 0,
      preserved:site === FBDATA.settlementSites[siteId] && JSON.stringify(site) === siteSnapshot,
      starts:FBDATA.startScenarios_634_ordinary.map(function (staged) {
        const published = FBDATA.startScenarios.filter(function (row) { return row.id === staged.id; });
        return {id:staged.id,count:published.length,detached:published[0] !== staged,
          equal:JSON.stringify(published[0]) === JSON.stringify(staged)};
      }),stagingInert:stagingInert,unchanged:before === JSON.stringify(FBDATA) && state === FB.state &&
        rng === FB.getRngState() && uid === FB.getUidCounter()};
  },{source:source,startSource:startSource})).toEqual({siteFields:['x','y'],named:true,preserved:true,
    starts:[{id:'farmer_634',count:1,detached:true,equal:true},{id:'craftsman_634',count:1,detached:true,equal:true}],
    stagingInert:true,unchanged:true});
});

test('failed 634 composition leaves other bookmarks and ordinary starts playable',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Response interception requires the served origin.');
  const pageErrors = [];
  page.on('pageerror',function (error) { pageErrors.push(error.message); });
  await page.route('**/data/bookmark_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',
      body:'delete FBDATA.bookmarkRegions634.b29;\n' + source});
  });
  await openGame(page,info);
  expect(pageErrors).toEqual([]);
  expect(await page.evaluate(function () {
    return FB.bookmarkCompositions.sourceReports().find(function (report) { return report.id === 'autumn_634'; });
  })).toMatchObject({published:false,source:'data/bookmark_634.js',bookmarkId:'634',
    worldFaults:['Incomplete 634 regional declarations']});
  expect(await page.evaluate(function () {
    return {registered:!!FBDATA.bookmarks['634'],
      staged:FBDATA.startScenarios_634_ordinary.map(function (row) { return row.id; }),
      published:FBDATA.startScenarios.filter(function (row) {
        return row.bookmarkIds && row.bookmarkIds.indexOf('634') >= 0;
      }).map(function (row) { return row.id; }),
      otherBookmarks:['476','867','1066'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })};
  })).toEqual({registered:false,staged:['farmer_634','craftsman_634'],published:[],otherBookmarks:[[],[],[]]});
  await beginBookmarkFromTitle(page,'867');
  expect(await page.evaluate(function () { return FB.state.start.id; })).toBe('867');
});

test('an explicitly rehidden 634 rejects picker, codes, direct creation and Observe',async function ({page},info) {
  await openGame(page,info);
  await page.evaluate(function () { FBDATA.bookmarks['634'].hidden = true; });
  const full = page.locator('#btn-choose-beginning');
  if (await full.isVisible()) await full.click();
  else await page.getByRole('button',{name:'New Game',exact:true}).click();
  await expect(page.locator('#bookmarklist [data-bookmark="634"]')).toHaveCount(0);
  await page.locator('#btn-bm-seed').click();
  await page.locator('#ng-seed').fill('REVIEW634-634-farmer_634-coruna-m-Review');
  await page.locator('#ng-seed').press('Enter');
  await expect(page.locator('#ng-seed-err')).toContainText('hidden for new campaigns');
  await expect(page.locator('#chargen:not(.hidden)')).toHaveCount(0);
  expect(await page.evaluate(function () { return FB.state; })).toBeNull();
  await page.locator('#ng-cancel').click();
  expect(await page.evaluate(function () {
    return new Promise(function (resolve) {
      FB.activateBookmark('634',null,function (error) { resolve(error && error.message || null); });
    });
  })).toBeNull();
  expect(await page.evaluate(function () {
    FB.game.pending = {bookmarkId:'634',seed:'REVIEW634',provinceId:'coruna',
      scenario:FBDATA.startScenarios.filter(function (s) { return s.id === 'farmer_634'; })[0]};
    const state = FB.state, rng = FB.getRngState(), uid = FB.getUidCounter();
    const start = FB.game.start(), observe = FB.game.startObserve();
    return {start:start,observe:observe,preserved:state === FB.state &&
      rng === FB.getRngState() && uid === FB.getUidCounter() && !FB.game.observe};
  })).toEqual({start:false,observe:false,preserved:true});
});

test('634 missing, duplicate and unresolved regional inputs reject in detached source review without changing catalogues',async function ({page},info) {
  await openGame(page,info);
  const problems = await page.evaluate(function (code) {
    const original = FBDATA.bookmarkRegions634, copy = function (v) { return JSON.parse(JSON.stringify(v)); };
    const rng = FB.getRngState(), uid = FB.getUidCounter(), data = JSON.stringify(FBDATA), failures = [];
    const originalStarts = FBDATA.startScenarios_634_ordinary;
    // A sealed source reload is deliberately inert. Capture its assembler and
    // exercise detached drafts through the canonical native candidate gate.
    let assemble;
    const stage = FB.bookmarkSources.stage;
    try {
      FB.bookmarkSources.stage = function (spec,fn) { assemble = fn; };
      (0,eval)(code);
    } finally { FB.bookmarkSources.stage = stage; }
    function draft() {
      return Object.assign({},FBDATA,{bookmarkRegions634:copy(original),
        startScenarios_634_ordinary:copy(originalStarts),bookmarkCompositionSources:{},bookmarkCandidates:{}});
    }
    // Review a new world against the surrounding catalogue, retaining the
    // published starts so a changed definition still exercises conflict checks.
    const base = Object.assign({},FBDATA,{bookmarks:Object.assign({},FBDATA.bookmarks)});
    delete base.bookmarks['634'];
    const valid = draft(); assemble(valid);
    valid.bookmarkCompositionSources.autumn_634.input.id = 'e2e_634_valid';
    const control = FB.bookmarkCompositions.prepareSource(valid.bookmarkCompositionSources.autumn_634.input,base).report();
    ['missing','missing_county','duplicate_county','duplicate_court','unknown_court','unknown_liege','wrong_capital',
      'territorial_foreign_capital','nonterritorial_missing_capital','nonterritorial_scenery_capital',
      'site_coordinates','site_names','missing_starts','duplicate_start','conflicting_start'].forEach(function (kind) {
      const candidate = draft(), regions = candidate.bookmarkRegions634;
      if (kind === 'missing') { delete regions.b29; regions.e2e_extra = {}; }
      if (kind === 'missing_county') regions.b01.provinces.pop();
      if (kind === 'duplicate_county') regions.b02.provinces.push(copy(regions.b01.provinces[0]));
      if (kind === 'duplicate_court') regions.b02.realms.push(copy(regions.b01.realms[0]));
      if (kind === 'unknown_court') regions.b01.provinces[0].realm = 'e2e_absent';
      if (kind === 'unknown_liege') regions.b01.realms[0].liege = 'e2e_absent';
      if (kind === 'wrong_capital') regions.b01.realms[0].capital = 'medina';
      const aures = regions.b22.realms.filter(function (r) { return r.id === 'aures_634'; })[0];
      if (kind === 'territorial_foreign_capital') aures.nonTerritorial = false;
      if (kind === 'nonterritorial_missing_capital') aures.capital = 'e2e_absent';
      if (kind === 'nonterritorial_scenery_capital') aures.capital = 'w_sahara_w';
      if (kind === 'site_coordinates') regions.b28.settlementSites.najran_oasis_wider_476.x += 1;
      if (kind === 'site_names') regions.b28.settlementSites.najran_oasis_wider_476.names = [{name:'Conflicting name'}];
      if (kind === 'missing_starts') delete candidate.startScenarios_634_ordinary;
      if (kind === 'duplicate_start') candidate.startScenarios_634_ordinary.push(copy(originalStarts[0]));
      if (kind === 'conflicting_start') candidate.startScenarios_634_ordinary[0].gold += 1;
      assemble(candidate);
      const source = candidate.bookmarkCompositionSources.autumn_634;
      let report, rejected = !!(source.faults && source.faults.length);
      if (!rejected) {
        source.input.id = 'e2e_634_' + kind;
        report = FB.bookmarkCompositions.prepareSource(source.input,base).report();
        rejected = kind === 'conflicting_start'
          ? report.ready && report.starts.some(function (start) { return start.id === 'farmer_634' && !start.ready; })
          : !report.ready && report.worldFaults.length > 0;
      }
      failures.push({kind:kind,rejected:!!rejected,pure:data === JSON.stringify(FBDATA) &&
        rng === FB.getRngState() && uid === FB.getUidCounter(),faults:rejected ? [] : report});
    });
    return {control:control.ready && control.starts.length === 2 && control.starts.every(function (start) { return start.ready; }),
      failures:failures};
  },source);
  expect(problems).toEqual({control:true,failures:['missing','missing_county','duplicate_county','duplicate_court',
    'unknown_court','unknown_liege','wrong_capital','territorial_foreign_capital','nonterritorial_missing_capital',
    'nonterritorial_scenery_capital','site_coordinates','site_names','missing_starts','duplicate_start','conflicting_start']
    .map(function (kind) { return {kind:kind,rejected:true,pure:true,faults:[]}; })});
});

for (const crazy of [false,true]) {
  test('a bad 634 start leaves its sibling playable on ' + (crazy ? 'CrazyGames' : 'standard'),async function ({page},info) {
    test.skip(!info.project.name.endsWith('-served'),'Response interception requires the served origin.');
    await page.route('**/data/bookmark_634.js',function (route) {
      return route.fulfill({contentType:'application/javascript',body:'FBDATA.startScenarios_634_ordinary[0].gold = -1;\n' + source});
    });
    if (crazy) {
      await mockCrazyGames(page);
      await page.addInitScript(function () {
        window.FB_DISTRIBUTION = 'crazygames'; window.FB_CRAZYGAMES_STORAGE = 'localstorage';
      });
      await openCrazyGame(page,info);
    } else await openGame(page,info);
    expect(await page.evaluate(function () {
      return FB.bookmarkCompositions.sourceReports().find(function (report) { return report.bookmarkId === '634'; });
    })).toMatchObject({ready:true,published:true,worldFaults:[]});
    const result = await page.evaluate(function () {
      const report = FB.bookmarkCompositions.sourceReports().find(function (report) { return report.id === 'autumn_634'; });
      return {report:report,starts:FBDATA.startScenarios.filter(function (row) {
        return row.bookmarkIds && row.bookmarkIds.indexOf('634') >= 0;
      }).map(function (row) { return row.id; }),locations:Object.keys(FB.bookmark('634').startLocations),
      faults:['634','476','867','1066'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); }),
      diagnostics:FB.bookmarkRuntimeDiagnostics().filter(function (row) { return row.startId === 'farmer_634'; })};
    });
    expect(result.report).toMatchObject({published:true,starts:startIds.map(function (id) {
      return {id:id,ready:id !== 'farmer_634',revision:id === 'farmer_634' ? 'baseline' : null};
    })});
    expect(result.report.starts[0].faults.join(' ')).toContain('gold');
    expect(result.starts).toEqual(startIds.slice(1));
    expect(result.locations).toEqual(startIds.slice(1));
    expect(result.faults).toEqual([[],[],[],[]]);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({source:'data/starts_634_ordinary.js',bookmarkId:'634',startId:'farmer_634'});
    await beginBookmarkFromTitle(page,'634','craftsman_634');
    expect(await page.evaluate(function () { return FB.state.start.scenarioId; })).toBe('craftsman_634');
  });
}

test('canonical 634 world rejection withholds its owned catalogues and keeps other worlds available',async function ({page},info) {
  test.skip(!info.project.name.endsWith('-served'),'Response interception requires the served origin.');
  await page.route('**/data/bookmark_634.js',function (route) {
    return route.fulfill({contentType:'application/javascript',body:
      "FBDATA.bookmarkRegions634.b22.realms.find(function (r) { return r.id === 'aures_634'; }).capital = 'composition_unknown_capital';\n" + source});
  });
  await openGame(page,info);
  const result = await page.evaluate(function () {
    return {report:FB.bookmarkCompositions.sourceReports().find(function (report) { return report.id === 'autumn_634'; }),
      absent:!FBDATA.bookmarks['634'] && !FBDATA.settlementLayouts['634_opening'] &&
        !FBDATA.governmentForms.medinan_selection_pf_634 && !FBDATA.religions.early_islam_634 &&
        !FBDATA.startScenarios.some(function (s) { return s.id === 'farmer_634' || s.id === 'craftsman_634'; }),
      edgesPreserved:Object.keys(FBDATA.bookmarkFaithAvailability634).every(function (id) {
        return FBDATA.religions[id].availability.bookmarkIds.indexOf('634') < 0;
      }),faults:['476','867','1066'].map(function (id) { return FB.validateBookmark(FB.bookmark(id)); })};
  });
  expect(result).toMatchObject({report:{published:false},absent:true,edgesPreserved:true,faults:[[],[],[]]});
  expect(result.report.worldFaults.join(' ')).toContain('composition_unknown_capital');
  await beginBookmarkFromTitle(page,'867');
});

test('634 complete candidate validation rejects bad sites, faiths and capitals without changing state',async function ({page},info) {
  await openGame(page,info);
  expect(await page.evaluate(function () {
    const data = JSON.stringify(FBDATA), state = JSON.stringify(FB.state), rng = FB.getRngState(), uid = FB.getUidCounter();
    const rejected = ['site','faith','capital','scenery_start'].map(function (kind) {
      const b = JSON.parse(JSON.stringify(FB.bookmark('634')));
      if (kind === 'site') b.provinces[0].settlements = [{site:'e2e_absent',name:'Unknown',kind:'town'}];
      if (kind === 'faith') b.realms[0].religion = 'zoroastrian_sasanian_476';
      if (kind === 'capital') b.realms[0].capital = 'e2e_absent';
      if (kind === 'scenery_start') b.startLocations.farmer_634 = ['w_sahara_w'];
      return FB.validateBookmark(b).length > 0;
    });
    return {rejected:rejected,pure:data === JSON.stringify(FBDATA) && state === JSON.stringify(FB.state) &&
      rng === FB.getRngState() && uid === FB.getUidCounter()};
  })).toEqual({rejected:Array(4).fill(true),pure:true});
});

for (const scenario of ['farmer_634','craftsman_634']) {
  test('634 seeded ' + scenario + ' restores its hidden world and spent resources after another date is activated',
    async function ({page},info) {
      await beginBookmark(page,info,'634',scenario);
      expect(await page.evaluate(function (disabled) {
        const s = FB.state, b = FB.campaignBookmark(s);
        return {scenario:s.start.scenarioId,revision:s.start.revision,date:s.date,provinces:FB.world.provs.length,
          opening:s.bookmarkSetup.revision,actors:Object.keys(s.bookmarkSetup.actors),
          local:Object.keys(s.localInstitutions || {}),heads:Object.keys(s.religiousHeads || {}).filter(function (id) { return !!s.religiousHeads[id]; }),
          disabled:disabled.every(function (id) { return !FB.systemEnabled(s,id); }),
          courts:['byzantium_634','rashidun_634','sasanian_634'].map(function (id) { return s.realms[id].ruler.name; }),
          oldCourts:['east_568','sasanian_568','francia_568','yathrib_568','federates_476'].some(function (id) { return !!s.realms[id]; }),
          namedFamilies:b.realms.filter(function (r) { return r.ruler && r.ruler.name; }).reduce(function (faults,r) {
            const court = s.realms[r.id].succession, ruler = court.members[court.rulerMemberId];
            const unrelated = Object.keys(court.members).filter(function (id) { return id !== court.rulerMemberId; });
            // The ordinary succession fallback can supply generated people,
            // but an empty authored family must never acquire invented kin.
            const parentless = unrelated.every(function (id) {
              const member = court.members[id];
              return member.generated === true && member.parentId === null && !member.fatherId &&
                !member.motherId && !member.spouseMemberId && member.childIds.length === 0;
            });
            if (r.royalCourt.members.length !== 0 || r.royalCourt.spouseId !== null || !parentless || !ruler.spouseDeclared ||
                ruler.spouseMemberId !== null || ruler.childIds.length !== 0) faults.push({id:r.id,members:court.members});
            return faults;
          },[]),
          childAge:s.date.year - s.realms.sasanian_634.ruler.born,
          errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(s)};
      },disabled)).toEqual({scenario:scenario,revision:'baseline',date:{year:634,season:2,day:1},provinces:527,
        opening:'baseline',actors:[],local:[],heads:[],disabled:true,
        courts:['Heraclius','Umar','Yazdegerd III'],oldCourts:false,namedFamilies:[],childAge:10,errors:[],valid:true});
      await page.evaluate(function () { FB.state.player.gold -= 3; });
      const before = await facts(page);
      const saved = await page.evaluate(function () { return FB.save.serialize(); });
      expect(JSON.parse(saved).v).toBe(4);
      expect(await page.evaluate(function () {
        FBDATA.bookmarks['634'].hidden = true;
        return new Promise(function (resolve) {
          FB.activateBookmark('867',null,function (error) { resolve(error && error.message || null); });
        });
      })).toBeNull();
      await restoreBookmark(page,saved);
      expect(await facts(page)).toEqual(before);
      expect(await page.evaluate(function () {
        return {hidden:FB.bookmark('634').hidden,errors:FBTEST.checkInvariants(),valid:FB.save.v4.validatePlatform(FB.state)};
      })).toEqual({hidden:true,errors:[],valid:true});
    });
}

test('634 repeats a seeded opening while its composed world stays detached from staged inputs',async function ({page},info) {
  await beginBookmark(page,info,'634','farmer_634');
  const before = await facts(page);
  expect(await page.evaluate(function () {
    const world = JSON.stringify(FBDATA.bookmarks['634']), layout = JSON.stringify(FBDATA.settlementLayouts['634_opening']);
    const form = JSON.stringify(FBDATA.governmentForms.medinan_selection_pf_634);
    const faith = JSON.stringify(FBDATA.religions.early_islam_634);
    const a = FBDATA.bookmarkRegions634.b01, d = FBDATA.bookmarkRegions634.b24;
    const originals = [a.provinces[0].realm,a.layouts.coruna[0].name,d.governmentForms.medinan_selection_pf_634.name,
      FBDATA.bookmarkReligions634.early_islam_634.name];
    try {
      a.provinces[0].realm = 'e2e_unpublished'; a.layouts.coruna[0].name = 'Changed';
      d.governmentForms.medinan_selection_pf_634.name = 'Changed';
      FBDATA.bookmarkReligions634.early_islam_634.name = 'Changed';
      return world === JSON.stringify(FBDATA.bookmarks['634']) && layout === JSON.stringify(FBDATA.settlementLayouts['634_opening']) &&
        form === JSON.stringify(FBDATA.governmentForms.medinan_selection_pf_634) && faith === JSON.stringify(FBDATA.religions.early_islam_634);
    } finally {
      a.provinces[0].realm = originals[0]; a.layouts.coruna[0].name = originals[1];
      d.governmentForms.medinan_selection_pf_634.name = originals[2];
      FBDATA.bookmarkReligions634.early_islam_634.name = originals[3];
    }
  })).toBe(true);
  await beginBookmark(page,info,'634','farmer_634');
  expect(await facts(page)).toEqual(before);
});
