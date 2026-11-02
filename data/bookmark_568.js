FB.bookmarkSources.stage({"source":"data/bookmark_568.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Spring 568, composed from independent first-pass regional declarations.
   See docs/research/568-bookmark.md for the reconstruction boundaries. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function merge(target, source) {
    Object.keys(source || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(target, id))
        throw new Error('Duplicate 568 declaration: ' + id);
      target[id] = copy(source[id]);
    });
  }
  FBDATA.bookmarkCompositionDrafts = FBDATA.bookmarkCompositionDrafts || {};
  FBDATA.bookmarkCompositionSources = FBDATA.bookmarkCompositionSources || {};
  var previousDraft = FBDATA.bookmarkCompositionDrafts.spring_568;
  var draft = FBDATA.bookmarkCompositionDrafts.spring_568 = {starts:[],faults:[],
    previousStarts:previousDraft && previousDraft.previousStarts ? copy(previousDraft.previousStarts) : null};
  FBDATA.bookmarkCompositionSources.spring_568 = {source:'data/bookmark_568.js',bookmarkId:'568',
    faults:['Missing final 568 ownership assembly.']};
  try {
    var ordinary = FBDATA.startScenarios_568;
    if (!Array.isArray(ordinary) || !ordinary.length) throw new Error('Missing 568 ordinary start declarations.');
    var positions = FB.bookmarkCompositions.captureStarts('spring_568','ordinary',ordinary);
    draft.starts = ordinary.map(function (definition) {
      return {definition:copy(definition),source:'data/starts_568.js',after:positions[definition.id]};
    });
    draft.availability = FB.bookmarkCompositions.captureAvailability('spring_568',FBDATA.bookmarkFaithAvailability568);
    var regions = ['italy','balkans','anatolia','levant_egypt','iran_caucasus',
      'frankish_northwest','frankish_southwest','rhine_alps','central_europe',
      'iberia_north_interior','iberia_south_east','britain_south_east','britain_north',
      'britain_west','ireland','scandinavia_baltic','danube_avars','steppe_rivers',
      'central_asia_sindh','arabia','maghreb','horn_sahel'];
    FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
    FBDATA.bookmarkCandidates['568'] = {
      id:'568', name:'The Lombards Depart',
      desc:'Imperial cities, Frankish courts and Lombard households share a changing world before the departure from Pannonia. Local lives and rival courts follow their own choices.',
      date:{year:568,season:0,day:1}, era:'late_antique',
      geography:'europe_regional_2', settlementLayout:'568',
      revision:'migration_v1', revisions:{baseline:{},migration_v1:{}},
      openingRevision:'migration_v1', openingLegacyRevision:'migration_v1',
      opening:{actors:{},appointments:{},estates:[],claims:[],migrations:[]},
      openingRevisions:{}, localInstitutions:{}, religiousHeads:{},
      systems:{disable:['papacy','scutage','manorial_tenure','excommunication','abbeys',
        'feudal_service','crown_bloc','tournaments','great_holy_wars']},
      provinces:[], realms:[], duchies:{}, kingdoms:{}, empires:{},
      climate:{zone:'northern_temperate',provinces:{}},
      stories:[], scripted:[], startLocations:{}, straits:[], crossingClasses:{}
    };
    var b = FBDATA.bookmarkCandidates['568'];
    draft.bookmark = b;
    var layouts = {}, sites = {}, administration = {}, aristocracy = {};
    var countyIds = {}, realmIds = {};
    regions.forEach(function (id) {
      var block = FBDATA.bookmarkRegions568[id];
      if (!block) throw new Error('Missing 568 region: ' + id);
      ['provinces','realms'].forEach(function (field) {
        var seen = field === 'provinces' ? countyIds : realmIds;
        block[field].forEach(function (row) {
          if (seen[row.id]) throw new Error('Duplicate 568 ' + field + ': ' + row.id);
          seen[row.id] = true;
          b[field].push(copy(row));
        });
      });
      ['duchies','kingdoms','empires'].forEach(function (field) { merge(b[field], block[field]); });
      merge(layouts, block.layouts || block.settlementLayouts);
      merge(sites, block.settlementSites);
      merge(b.climate.provinces, block.climate || block.climates);
      merge(b.localInstitutions, block.institutions || block.localInstitutions);
      merge(administration, block.administrationProfiles);
      merge(aristocracy, block.aristocraticProfiles);
      var opening = block.opening || {};
      ['actors','appointments'].forEach(function (field) { merge(b.opening[field], opening[field]); });
      ['estates','claims','migrations'].forEach(function (field) {
        b.opening[field] = b.opening[field].concat(copy(opening[field] || []));
      });
      b.stories = b.stories.concat(copy(block.storyIds || []));
    });
    b.openingRevisions.migration_v1 = copy(b.opening);
    /* Physical sea crossings, independent of the courts on either shore. */
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
        var pair = row.slice(0,2);
        b.straits.push(pair);
        b.crossingClasses[pair.slice().sort().join('|')] = row[2];
      });
    /* Open roles choose a map location. No historical person or fixed story
       household is introduced by these ordinary starts. */
    var inhabited = b.provinces.filter(function (p) { return !p.wasteland; })
      .map(function (p) { return p.id; });
    ['farmer_568','craftsman_568'].forEach(function (id) { b.startLocations[id] = inhabited.slice(); });
    draft.catalogs = {settlementLayouts:{'568':layouts},settlementSites:sites,
      administrationProfiles:administration,aristocraticProfiles:aristocracy,cultures:copy(FBDATA.bookmarkCultures568)};
  } catch (error) { draft.faults.push({source:'data/bookmark_568.js',message:error.message}); }
})();
});
