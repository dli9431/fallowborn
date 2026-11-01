/* Independent autumn 634 opening. Regional inputs remain the dated sources;
   composition never reads an earlier bookmark or its people.
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
  /* Resolve cross-block courts and seats before publishing any registry. The
     ordinary bookmark validator owns the complete schema/identity checks. */
  var physical = FBDATA.geographies.europe_regional.provinces
    .concat(FBDATA.geographies.europe_regional_2.provinceAdditions);
  if (world.provinces.length !== physical.length) throw new Error('Incomplete 634 physical coverage');
  physical.forEach(function (p) {
    if (!own(counties, p.id)) throw new Error('Missing 634 physical anchor: ' + p.id);
  });
  world.provinces.forEach(function (p) {
    if (!p.wasteland && !own(courts, p.realm)) throw new Error('Unresolved 634 court: ' + p.realm);
  });
  world.realms.forEach(function (r) {
    var capital = counties[r.capital];
    if (!capital || capital.wasteland || (capital.realm !== r.id && !r.nonTerritorial))
      throw new Error('Invalid 634 capital: ' + r.id);
    if (r.liege && !own(courts, r.liege)) throw new Error('Unresolved 634 liege: ' + r.liege);
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
      if (!counties[row[0]] || !counties[row[1]] || counties[row[0]].wasteland || counties[row[1]].wasteland)
        throw new Error('Invalid 634 crossing: ' + row[0] + '|' + row[1]);
      world.straits.push(row.slice(0,2));
      world.crossingClasses[row.slice(0,2).sort().join('|')] = row[2];
    });
  var inhabited = world.provinces.filter(function (p) { return !p.wasteland; })
    .map(function (p) { return p.id; });
  ['farmer_634','craftsman_634'].forEach(function (id) { world.startLocations[id] = inhabited.slice(); });
  world.openingRevisions = {baseline:copy(world.opening)};

  if (!FBDATA.bookmarkReligions634 || !FBDATA.bookmarkFaithAvailability634)
    throw new Error('Missing 634 identity declarations');
  var faiths = {}, availability = {};
  merge(faiths, FBDATA.bookmarkReligions634);
  Object.keys(FBDATA.bookmarkFaithAvailability634).forEach(function (id) {
    var source = FBDATA.religions[id];
    if (!source || !source.availability || !Array.isArray(source.availability.bookmarkIds))
      throw new Error('Missing 634 source-faith selector: ' + id);
    var record = copy(source.availability);
    FBDATA.bookmarkFaithAvailability634[id].bookmarkIds.forEach(function (date) {
      if (record.bookmarkIds.indexOf(date) < 0) record.bookmarkIds.push(date);
    });
    availability[id] = record;
  });
  Object.keys(sites).forEach(function (id) {
    /* A coordinate-only reference may reuse a shared site's dated names.
       Compare the declared fields, leaving extra shared metadata intact. */
    if (own(FBDATA.settlementSites, id) && Object.keys(sites[id]).some(function (field) {
      return JSON.stringify(FBDATA.settlementSites[id][field]) !== JSON.stringify(sites[id][field]);
    }))
      throw new Error('Conflicting 634 physical site: ' + id);
  });
  Object.keys(forms).forEach(function (id) {
    if (own(FBDATA.governmentForms, id) && JSON.stringify(FBDATA.governmentForms[id]) !== JSON.stringify(forms[id]))
      throw new Error('Conflicting 634 government form: ' + id);
  });
  world.realms.forEach(function (r) {
    if (!own(forms, r.government) && !own(FBDATA.governmentForms, r.government))
      throw new Error('Missing 634 government form: ' + r.government);
    if (!own(faiths, r.religion) && !own(FBDATA.religions, r.religion))
      throw new Error('Missing 634 court faith: ' + r.religion);
  });

  /* Starts remain staged until their world can be published. Re-evaluating
     an unchanged composition must not append the same starts twice. */
  var stagedStarts = FBDATA.startScenarios_634_ordinary;
  if (!Array.isArray(stagedStarts) || !stagedStarts.length)
    throw new Error('Missing 634 ordinary start declarations');
  var startIds = {}, startAdditions = [];
  stagedStarts.forEach(function (start) {
    if (!start || typeof start.id !== 'string' || !start.id || own(startIds, start.id) ||
        !Array.isArray(start.bookmarkIds) || start.bookmarkIds.length !== 1 || start.bookmarkIds[0] !== '634')
      throw new Error('Invalid 634 ordinary start declaration');
    startIds[start.id] = true;
    var existing = FBDATA.startScenarios.filter(function (row) { return row.id === start.id; });
    if (existing.length > 1 || existing.length && JSON.stringify(existing[0]) !== JSON.stringify(start))
      throw new Error('Conflicting 634 ordinary start: ' + start.id);
    if (!existing.length) startAdditions.push(copy(start));
  });

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
  FBDATA.settlementLayouts['634_opening'] = layouts;
  Object.keys(sites).forEach(function (id) {
    if (!own(FBDATA.settlementSites, id)) FBDATA.settlementSites[id] = sites[id];
  });
  Object.keys(forms).forEach(function (id) { FBDATA.governmentForms[id] = forms[id]; });
  FBDATA.bookmarks['634'] = b;
  Object.keys(faiths).forEach(function (id) { FBDATA.religions[id] = faiths[id]; });
  Object.keys(availability).forEach(function (id) {
    FBDATA.religions[id] = Object.assign({},FBDATA.religions[id],{availability:availability[id]});
  });
  Array.prototype.push.apply(FBDATA.startScenarios, startAdditions);
})();
