FB.bookmarkSources.stage({"source":"data/bookmark_634.js","bookmarks":["634"],"catalogs":["geographies","settlementSites"],"shared":[]}, function (FBDATA) {
/* Independent autumn 634 input. Regional records stage one detached ownership
   unit; the shared engine composer validates and publishes it at boot.
   Reconstruction limits: docs/research/634-bookmark.md. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function own(table, id) { return Object.prototype.hasOwnProperty.call(table, id); }
  function merge(target, source) {
    Object.keys(source || {}).forEach(function (id) {
      if (own(target, id)) throw new Error('Duplicate 634 declaration: ' + id);
      target[id] = copy(source[id]);
    });
  }
  FBDATA.bookmarkCompositionSources = FBDATA.bookmarkCompositionSources || {};
  var source = {source:'data/bookmark_634.js',bookmarkId:'634'};
  try {
    var stagedStarts = FBDATA.startScenarios_634_ordinary;
    if (!Array.isArray(stagedStarts) || !stagedStarts.length)
      throw new Error('Missing 634 ordinary start declarations');
    var startOrder = FB.bookmarkCompositions.captureStarts('autumn_634','ordinary',stagedStarts);
    if (!FBDATA.bookmarkReligions634 || !FBDATA.bookmarkFaithAvailability634)
      throw new Error('Missing 634 identity declarations');
    var availability = FB.bookmarkCompositions.captureAvailability('autumn_634',FBDATA.bookmarkFaithAvailability634);
    var order = ['b01','b02','b03','b04','b05','b06','b07','b08','b09','b10',
      'b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21',
      'b22','b23','b24','b25','b26','b27','b28','b29',
      'scenery_a','scenery_b','scenery_c','scenery_d'];
    var regions = FBDATA.bookmarkRegions634;
    if (!regions || Object.keys(regions).length !== order.length)
      throw new Error('Incomplete 634 regional declarations');
    var world = {provinces:[],realms:[],duchies:{},kingdoms:{},empires:{},
      climate:{zone:'northern_temperate',provinces:{}},
      localInstitutions:{},religiousHeads:{},
      opening:{actors:{},appointments:{},estates:[],claims:[],migrations:[]},
      stories:[],scripted:[],startLocations:{},straits:[],crossingClasses:{}};
    var layouts = {}, sites = {}, forms = {}, counties = {}, courts = {};
    order.forEach(function (key) {
      var block = regions[key];
      if (!block) throw new Error('Missing 634 region: ' + key);
      ['provinces','realms'].forEach(function (field) {
        var seen = field === 'provinces' ? counties : courts;
        block[field].forEach(function (row) {
          if (own(seen, row.id)) throw new Error('Duplicate 634 ' + field + ': ' + row.id);
          seen[row.id] = row;
          world[field].push(copy(row));
        });
      });
      ['duchies','kingdoms','empires'].forEach(function (field) { merge(world[field], block[field]); });
      merge(layouts, block.layouts || block.settlementLayouts);
      merge(sites, block.settlementSites);
      merge(world.climate.provinces, block.climate || block.climates);
      merge(world.localInstitutions, block.institutions || block.localInstitutions);
      merge(forms, block.governmentForms);
      var opening = block.opening || {};
      ['actors','appointments'].forEach(function (field) { merge(world.opening[field], opening[field]); });
      ['estates','claims','migrations'].forEach(function (field) {
        world.opening[field] = world.opening[field].concat(copy(opening[field] || []));
      });
      world.stories = world.stories.concat(copy(block.storyIds || []));
    });
    /* Physical coverage and source uniqueness are assembly invariants. The
       canonical world validator owns court, capital and government contracts. */
    var physical = FBDATA.geographies.europe_regional.provinces
      .concat(FBDATA.geographies.europe_regional_2.provinceAdditions);
    if (world.provinces.length !== physical.length) throw new Error('Incomplete 634 physical coverage');
    physical.forEach(function (p) {
      if (!own(counties, p.id)) throw new Error('Missing 634 physical anchor: ' + p.id);
    });
    /* Retain the source opening's explicit physical sea crossings. Neither a
       later conquest nor an invented overland shortcut is a route declaration. */
    [['messina','reggio','narrow'],['palermo','tunis','open'],
      ['malaga','tangier','narrow'],['silves','tangier','coastal'],
      ['constantinople','nicaea','narrow'],['cagliari','pisa','open'],
      ['ajaccio','lucca','coastal'],['ajaccio','nice','coastal'],
      ['mallorca','valencia','open'],['siracusa','tunis','open'],
      ['candia','athens','open'],['nicosia','tarsos','open'],
      ['iona','glasgow','coastal'],['lewis','inverness','coastal'],
      ['man','carlisle','coastal'],['man','dublin','coastal'],
      ['ulaid','glasgow','coastal'],['wexford','cardigan','coastal'],
      ['canterbury','boulogne','narrow'],['visby','kalmar','open'],
      ['roskilde','lund','narrow'],['turku','uppsala','open']].forEach(function (row) {
        world.straits.push(row.slice(0,2));
        world.crossingClasses[row.slice(0,2).sort().join('|')] = row[2];
      });
    var inhabited = world.provinces.filter(function (p) { return !p.wasteland; })
      .map(function (p) { return p.id; });
    world.openingRevisions = {baseline:copy(world.opening)};

    /* No live catalogue receives a partial regional world. Literal metadata
       remains statically extractable under the ordinary bookmark text owners. */
    FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
    FBDATA.bookmarkCandidates['634'] = {
      id:'634',name:'The Early Conquests',
      desc:'Households keep their livelihoods while the Medinan, Eastern Roman and Sasanian courts face an uncertain autumn.',
      date:{year:634,season:2,day:1},era:'late_antique',
      geography:'europe_regional_2',settlementLayout:'634_opening',
      revision:'baseline',revisions:{baseline:{}},starts:[],
      openingRevision:'baseline',openingLegacyRevision:'baseline',
      systems:{disable:['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
        'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars']}
    };
    var b = FBDATA.bookmarkCandidates['634'];
    Object.keys(world).forEach(function (key) { b[key] = world[key]; });
    /* The source world remains the retained baseline. Only this revision owns
       the 21 scenic opt-ins; regional scaffold rows keep their original meaning. */
    var protectedRows = copy(b.provinces);
    var protectedIds = ['w_sahara_w','w_sahara_c','w_sahara_e','w_sahel','w_nubia','w_arabia',
      'w_nefud','w_syrian','w_kavir','w_lut','w_registan','w_hindukush',
      'w_sulaiman','w_thar','w_karakum','w_kyzylkum','w_steppe_e',
      'w_ural','w_taiga','w_north','w_lapland'];
    protectedIds.forEach(function (id) {
      var row = protectedRows.find(function (p) { return p.id === id; });
      if (!row || !row.wasteland) throw new Error('Missing 634 scenic anchor: ' + id);
      row.settlementPolicy = 'protected';
    });
    b.revisions.scenery_protected_v1 = {provinces:protectedRows};
    // Fresh campaigns use the ordinary settlement rules shared by other dates.
    // Keep the protected layer unchanged for campaigns that already selected it.
    b.revisions.ordinary_settlement_v2 = {};
    b.revision = 'ordinary_settlement_v2';

    // Whole-field revision copies preserve all three earlier worlds exactly.
    var identityRows = copy(b.provinces), identityCourts = copy(b.realms);
    [['damascus','chalcedonian','chalcedonian_local_634'],
      ['baghdad','east_syriac','east_syriac_local_634']].forEach(function (binding) {
      var county = identityRows.find(function (row) { return row.id === binding[0]; });
      var pair = county && county.communities.find(function (row) {
        return row.culture === 'syriac' && row.religion === binding[1] && row.populationShare0 > 0;
      });
      if (!pair) throw new Error('Missing 634 household resident pair: ' + binding[0]);
      pair.religion = binding[2];
    });
    var sasanianCourt = identityCourts.find(function (row) { return row.id === 'sasanian_634'; });
    if (!sasanianCourt) throw new Error('Missing 634 Sasanian court');
    sasanianCourt.governingIdentity = {eliteCultureId:'persian',eliteFaithId:'zoroastrian_sasanian_634',
      legalIdentityId:'sasanian_civil_634',tolerance:'tolerant',taxation:'equal',justicePolicy:'elite'};
    b.revisions.core_identities_v3 = {provinces:identityRows,realms:identityCourts};
    b.revision = 'core_identities_v3';
    /* Complete court inputs replace each scaffold owner once. Preserve the
       selectable opening while the assembled revision remains hidden. */
    var replacements = {}, administrationProfiles = {}, aristocraticProfiles = {};
    var courtSources = ['core','a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t'];
    courtSources.forEach(function (key) {
      var table = FBDATA['bookmarkRevisionContent_634_courts' + (key === 'core' ? '' : '_' + key)];
      if (!table || table.bookmarkId !== '634' || !Array.isArray(table.realms))
        throw new Error('Missing 634 court declaration: ' + key);
      table.realms.forEach(function (row) {
        if (!own(courts, row.id) || own(replacements, row.id))
          throw new Error('Invalid 634 court replacement: ' + row.id);
        replacements[row.id] = copy(row);
      });
      merge(forms, table.governmentForms);
      merge(administrationProfiles, table.administrationProfiles);
      merge(aristocraticProfiles, table.aristocraticProfiles);
    });
    if (Object.keys(replacements).length !== world.realms.length)
      throw new Error('Incomplete 634 court replacement inventory');
    if (!FBDATA.bookmarkOpeningActors634 || !FBDATA.bookmarkCourtReligions634)
      throw new Error('Missing 634 court companions');
    var assembledOpening = copy(world.opening);
    merge(assembledOpening.actors, FBDATA.bookmarkOpeningActors634);
    var assembledOpenings = copy(world.openingRevisions);
    assembledOpenings.core_courts_v4 = copy(assembledOpening);
    b.revisions.core_courts_v4 = {
      hidden:true,starts:[],provinces:copy(identityRows),
      realms:world.realms.map(function (row) { return replacements[row.id]; }),
      duchies:copy(world.duchies),kingdoms:copy(world.kingdoms),empires:copy(world.empires),
      settlementLayout:'634_opening',religiousHeads:{},
      opening:assembledOpening,openingRevision:'core_courts_v4',openingRevisions:assembledOpenings,
      localInstitutions:{
        constantinople_see:{city:'Constantinople',kind:'patriarchate',provinceId:'constantinople',
          site:'constantinople',culture:'greek',religion:'chalcedonian',officeId:'constantinople_patriarch',
          officeSystem:null,historicalName:'Sergius I',freshOnly:true,vacant:false,
          jurisdictionIds:['constantinople'],communionWith:[],
          representative:{born:570,sex:'m',role:'priest',station:3,skills:{dip:5,mar:5,ste:5,int:5,lea:5},traits:[]}},
        jerusalem_see:{city:'Jerusalem',kind:'see',provinceId:'jerusalem',site:'jerusalem_493',
          culture:'greek',religion:'chalcedonian',officeId:'jerusalem_bishop',officeSystem:null,
          historicalName:'Sophronius',freshOnly:true,vacant:false,jurisdictionIds:['jerusalem'],communionWith:[],
          representative:{born:550,sex:'m',role:'priest',station:3,skills:{dip:5,mar:5,ste:5,int:5,lea:5},traits:[]}},
        rome_see:{city:'Rome',kind:'see',provinceId:'roma',site:'roma',culture:'roman',religion:'nicene',
          officeId:'rome_bishop',officeSystem:null,historicalName:'Honorius I',freshOnly:true,vacant:false,
          jurisdictionIds:['roma'],communionWith:[],
          representative:{born:575,sex:'m',role:'priest',station:3,skills:{dip:5,mar:5,ste:5,int:5,lea:5},traits:[]}},
        ctesiphon_catholicos_634:{city:'Seleucia-Ctesiphon',kind:'patriarchate',provinceId:'baghdad',
          site:'baghdad_outer_476',culture:'syriac',religion:'east_syriac',officeId:'east_syriac_catholicos',
          officeSystem:null,historicalName:'Isho’yahb II',freshOnly:true,vacant:false,
          jurisdictionIds:['baghdad'],communionWith:[],
          representative:{born:575,sex:'m',role:'priest',station:3,skills:{dip:5,mar:5,ste:5,int:5,lea:5},traits:[]}},
        antioch_west_syriac_claim_634:{city:'Antioch',kind:'patriarchate',provinceId:'antioch',site:'antioch_493',
          culture:'syriac',religion:'miaphysite',officeId:'antioch_west_syriac_patriarch_634',officeSystem:null,
          officeProfile:{holderSex:'m',holderRole:'priest',minAge:18},freshOnly:true,vacant:false,
          jurisdictionIds:['antioch'],communionWith:[],historicalName:'John of the Sedre',
          representative:{name:'John of the Sedre',born:580,sex:'m',role:'priest',station:3,
            skills:{dip:8,mar:2,ste:5,int:5,lea:9},traits:[]}},
        alexandria_imperial_claim_634:{city:'Alexandria',kind:'patriarchate',provinceId:'alexandria',site:'alexandria_493',
          culture:'greek',religion:'alexandria_imperial_chalcedonian_634',officeId:'alexandria_imperial_patriarch_634',
          officeSystem:null,officeProfile:{holderSex:'m',holderRole:'priest',minAge:18},freshOnly:true,vacant:false,
          jurisdictionIds:['alexandria'],communionWith:[],
          representative:{name:'Cyrus',born:580,sex:'m',role:'priest',station:3,
            skills:{dip:8,mar:4,ste:6,int:6,lea:8},traits:[]}}
      }
    };
    var religions = copy(FBDATA.bookmarkReligions634);
    merge(religions, FBDATA.bookmarkCourtReligions634);
    // Shared physical declarations are inputs, independent of whether the
    // earlier world that first used them passes its own validation.
    Object.keys(layouts).forEach(function (county) {
      layouts[county].forEach(function (slot) {
        if (own(sites,slot.site) || own(FBDATA.settlementSites,slot.site)) return;
        Object.keys(FBDATA.bookmarkRegions568 || {}).forEach(function (region) {
          var declarations = FBDATA.bookmarkRegions568[region].settlementSites;
          if (!own(declarations,slot.site)) return;
          if (own(sites,slot.site) && JSON.stringify(sites[slot.site]) !== JSON.stringify(declarations[slot.site]))
            throw new Error('Conflicting shared 634 site declaration: ' + slot.site);
          sites[slot.site] = copy(declarations[slot.site]);
        });
      });
    });
    source.input = {id:'autumn_634',source:source.source,bookmark:copy(b),
      catalogs:{settlementLayouts:{'634_opening':layouts},settlementSites:sites,
        governmentForms:forms,administrationProfiles:administrationProfiles,aristocraticProfiles:aristocraticProfiles,
        religions:religions,cultures:copy(FBDATA.bookmarkCultures568),
        legalTraditions:copy(FBDATA.bookmarkRevisionContent_634_identities.legalTraditions)},
      availability:availability,
      starts:stagedStarts.map(function (definition) {
        return {definition:copy(definition),locations:inhabited.slice(),source:'data/starts_634_ordinary.js',after:startOrder[definition.id]};
      })};
  } catch (error) { source.faults = [error.message]; }
  FBDATA.bookmarkCompositionSources.autumn_634 = source;
})();
});
