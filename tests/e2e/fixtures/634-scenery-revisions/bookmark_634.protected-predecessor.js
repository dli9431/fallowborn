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
      revision:'baseline',revisions:{baseline:{}},
      openingRevision:'baseline',openingLegacyRevision:'baseline',
      systems:{disable:['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
        'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars']}
    };
    var b = FBDATA.bookmarkCandidates['634'];
    Object.keys(world).forEach(function (key) { b[key] = world[key]; });
    /* The source world remains the retained baseline. Only this revision owns
       the 21 scenic opt-ins; regional scaffold rows keep their original meaning. */
    var predecessor = copy(b);
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
    b.revision = 'scenery_protected_v1';

    /* Bookmark source at 51c5f5751e8e29a1136aa1518e1e7c2f858728ea, with shared
       root evidence after candidate-story publication repair.
       Later contributors still own their starts and stories. These retained
       bindings are evidence only, never published in place of those owners.
       The shared proof rejects withheld or changed contributions. */
    predecessor.startLocations = {
      farmer_634:inhabited.slice(),craftsman_634:inhabited.slice(),
      ctesiphon_household_634:['baghdad'],umar_634:['medina'],heraclius_634:['constantinople'],
      damascus_household_634:['damascus'],frontier_household_634:['damascus'],medina_household_634:['medina']
    };
    predecessor.stories = ['damascus_household_observer_634'];
    var current = copy(predecessor);
    current.revisions.scenery_protected_v1 = copy(b.revisions.scenery_protected_v1);
    current.revision = b.revision;
    FB.bookmarkSources.retainCatalogueTransition({
      schema:1,id:'autumn_634_scenery_protected_v1',bookmarkId:'634',retainedRevision:'baseline',
      predecessor:predecessor,current:current,addedRevisions:['scenery_protected_v1'],bundled:[],
      predecessorRoots:{
        "storyPlacements": "efaf53fb34356efd2bee79f73ee412913980b9e4f5a8ba77c1c4f38c2608d043",
        "fortProfiles": "f28c8f17fd196cbf03a4388fe0c759a0d319163f043e30aa6459221cd475eece",
        "siegeSupportProfiles": "c89a148be40e6752261e3038609a4b68de22fa3bfdaf32f884edffb8480b9bbe",
        "buildingProfiles": "0d12ad5eee9886aafdff27e68416b7f432fa99840e09a6e0d7d78979a9d9e9bf",
        "positionRules": "b25a89a5dd5b73ded99e2a7bb8aadd9fdceda8c90e53d9b693f60c17a782e356",
        "policyGovernance": "b87012499af17df271d85e168a02b18911298fb518f3dc88aad137cb4b34a4cb",
        "marketRaidYields": "d3a43b0d6a03e7b06240e0042b8be7ecec97173370f80a99e9da5de6ff28cac3",
        "authoringDefaults": "d056d13cb25c5da1c674982b1ee3bdb9ca4886b996815e46935608a7af46cc82",
        "actionPolicies": "da19722ec331ca5e7544d29dfa3337cb43f57cf26b790bca0fa49dd0a69e3a0f",
        "rulerFaithTargets": "dda5358fce0941cc73c2a3d350ec1e16d6371db969a99f1cc50a2a7801bde4c6",
        "federateServiceStarts": "6cd5b796d4185e64124baf66309d153f1eaf72abe2d3dc94f7230ae24fa04dae",
        "federateMigrations": "e3e910c4a14228b0dd7b45702a204aa023d8018db70f9cc0249534b4c35f309f",
        "rankPrestigeYearly": "a00600d7289d21a8b067bd5b262e3ba0126776c72e1d2cdff20444eca7ce0c47",
        "historicalAmbitions": "dd49c9401aed5be36ee98f25b838c73ddfd1e5b41edfe99893d7504d6cf9b915",
        "federateContractTerms": "5549be05a364b8d4443f7051f4d74a89c8baee2d945c4ea5d45317ad031d005b",
        "tenureArchetypes": "d46b581b0ff08dda005bf9f6da855676eb3315329ce0f4618b92300422ea83b1",
        "tenureDuties": "a8e14b4399ffd2973f7085907c42b580287ec4583776180cec84e77542b61b91",
        "tenureRights": "47c3ce86d193a5d7053e935a473bffaec984abc048c2ba2995d28475cb305a09",
        "freedomBargaining": "4ea2920a7128f0d4d7c729077fdd9102a1e71221d4a9eaa541943d39a5136e52",
        "freedomTerms": "12583a67bf7a7414c41ddffe2e8867b74e70a4e46da75100d0ee84aa5d012ce1",
        "storyInstances": "f14391a505eec79178b1900bdfabd713baa1559dc0ada92e7137c6b8c9af131b",
        "focusRoutines": "b14ec9d5f9cbd79fa32661cbecd6b896cd7481faf77582a1364fe1315a58e38b",
        "deedRoutines": "0c331de0c9946ab9b64d3046653c8e2ade303356336df058dee9b89a67da6396",
        "deedEvents": "c6838f55da3b0dc57f8432a15e2ba2d4a91f19e2a2c965fd319cb6a9d5fbf95f",
        "eventChances": "46b9634beec1d8b02564b1147e867c692adc73ce49f8ad6c40954efc8471f1c5",
        "eventSubscriptions": "ceaab6853f09e22b876034ef70b8b2cd0103e9f578fcad0252997565f0658d60",
        "tournamentRules": "3ea9a1638282459930bb42f0f3243a3c968d47aa7d0a34812fad184c7e24a7b5",
        "councilSeatRoles": "93b452374c95af22f94e28973f8ca94508a6b39587d277edf22c829a08c9bf2a",
        "enterpriseMechanics": "19645e0f505f8f5282c8d45f3f15f1c7d077455b4930752939e131303ef18828",
        "specializationMarketEffects": "3b883c88dbef3278970eafd0f2e91c9b31cf3b592f7fe64d9aa997e128548bfa",
        "householdStandardDemand": "9ddcb4cc11d0dc36d20067a1e9acc7182a2e94c41f390d160e7aad5862447df1",
        "abbeys": "c521afb04d0e3729f631f3b825da0732ffcba6b281593e9e1dc388dfa35d3ce3",
        "householdServiceRoles": "a25e8af1faeb5c05d0714aaefcf983912f8a361e1e254450f0466205556be85a",
        "religiousOfficeRanks": "1efb2a8826476084d68c7a1ab0ba093a6c960eb3abf364262084b180858d4d4f",
        "papacyRules": "57bf5886faad51a2f82036e4d7e7a1b9ab1846636b8e839cbe00ebf03a16f293",
        "travelRules": "de794a3190b245e90f3a685212f3b2d09916560daae9b669e2a7d1274e6875e4",
        "travelDefaults": "04e34a22b05af1d916a181d196ab5c303405717cf1a10e2b232ffa1aac664923",
        "parliamentAgendas": "40fca869c1bc742e7b873246da1ac4e292a42bcaf54bda4ca60d567cf7b52235",
        "agencyRules": "22be7f5ccd5cf26cc1e31f034f48815ba0b8bec2b34a971090c622a6cce762be",
        "quickStarts": "19ed4c9e0a8acfab710c9b976b2080a9cd61950ac98f6c72176fc53e16a68f01",
        "traitMechanics": "b9475a6f5c0da5ad4c0f04442de1f15108e90ef8e148f495d2ce4125a9dc22a4",
        "authorityOffices": "0da454af90518096c318f9791b80970434c9eacbf17c06b6109bfb44377d93f4",
        "legitimacySources": "dfb246becb0c263d162a26d7a9f521e530b549803716e2f1e7f09f36b6561962",
        "customaryBases": "9cfd545edf0600b390470181bd5424fa2cdf01b48ada2a6aea2d324562340647",
        "aiDecisionPolicies": "04eaff3ee79338f5ed6f95c1f8b4a1f52b8da8fc239fcf7cf7b0b873144f516f"
      }
    });
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
        governmentForms:forms,religions:copy(FBDATA.bookmarkReligions634),cultures:copy(FBDATA.bookmarkCultures568)},
      availability:availability,
      starts:stagedStarts.map(function (definition) {
        return {definition:copy(definition),locations:inhabited.slice(),source:'data/starts_634_ordinary.js',after:startOrder[definition.id]};
      })};
  } catch (error) { source.faults = [error.message]; }
  FBDATA.bookmarkCompositionSources.autumn_634 = source;
})();
});
