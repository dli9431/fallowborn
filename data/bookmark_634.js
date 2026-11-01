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
      date:{year:634,season:2,day:1},era:'late_antique',hidden:true,
      geography:'europe_regional_2',settlementLayout:'634_opening',
      revision:'baseline',revisions:{baseline:{}},
      openingRevision:'baseline',openingLegacyRevision:'baseline',
      systems:{disable:['episcopal_sees','civic_institutions','papacy','excommunication','abbeys',
        'feudal_service','scutage','manorial_tenure','crown_bloc','tournaments','great_holy_wars']}
    };
    var b = FBDATA.bookmarkCandidates['634'];
    Object.keys(world).forEach(function (key) { b[key] = world[key]; });
    source.input = {id:'autumn_634',source:source.source,bookmark:copy(b),
      catalogs:{settlementLayouts:{'634_opening':layouts},settlementSites:sites,
        governmentForms:forms,religions:copy(FBDATA.bookmarkReligions634)},
      availability:availability,
      starts:stagedStarts.map(function (definition) {
        return {definition:copy(definition),locations:inhabited.slice(),source:'data/starts_634_ordinary.js',after:startOrder[definition.id]};
      })};
  } catch (error) { source.faults = [error.message]; }
  FBDATA.bookmarkCompositionSources.autumn_634 = source;
})();
