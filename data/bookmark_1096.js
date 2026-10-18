/* Independent spring 1096 world assembled from date-owned regional records.
   See docs/research/1096-bookmark.md for corrections and simulation limits. */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function own(table, id) { return Object.prototype.hasOwnProperty.call(table,id); }
  /* Shared title parents may repeat only when their declarations agree.
     Every other identity has one regional owner. */
  function merge(target, source, shared) {
    Object.keys(source || {}).forEach(function (id) {
      if (own(target,id)) {
        if (!shared || JSON.stringify(target[id]) !== JSON.stringify(source[id]))
          throw new Error('Conflicting 1096 declaration ' + id);
      } else target[id] = copy(source[id]);
    });
  }

  var base = FBDATA.geographies.europe_regional;
  var geography = FBDATA.geographies.europe_regional_2;
  var layout = {}, provinces = [], realms = [], countyIds = {}, realmIds = {};
  var duchies = {}, kingdoms = {}, empires = {}, climate = copy(geography.climate);
  var sites = {}, opening = {actors:{},appointments:{},estates:[],claims:[],migrations:[]};
  var institutions = {}, stories = [], faiths = {};
  var regions = FBDATA.bookmarkRegions1096;
  var order = [
    'west_north','west_south','iberia_north','iberia_south',
    'empire_rhine','empire_alps','italy_north','italy_south',
    'britain_south','britain_north_ireland','nordic_baltic',
    'central_danube','rus_steppe','balkans','anatolia_caucasus',
    'syria_palestine','jazira','egypt','arabia','iran_iraq',
    'eastern_edge','maghreb','horn_sahel'
  ];
  if (!regions || Object.keys(regions).length !== order.length) {
    throw new Error('Incomplete 1096 regional declarations');
  }
  order.forEach(function (key) {
    var block = regions[key];
    if (!block) throw new Error('Missing 1096 region ' + key);
    block.provinces.forEach(function (province) {
      if (countyIds[province.id]) throw new Error('Duplicate 1096 county ' + province.id);
      countyIds[province.id] = province;
      provinces.push(copy(province));
    });
    block.realms.forEach(function (realm) {
      if (realmIds[realm.id]) throw new Error('Duplicate 1096 realm ' + realm.id);
      realmIds[realm.id] = realm;
      realms.push(copy(realm));
    });
    merge(duchies,block.duchies,true);
    merge(kingdoms,block.kingdoms,true);
    merge(empires,block.empires,true);
    merge(layout,block.settlementLayouts || block.layouts);
    merge(sites,block.settlementSites);
    Object.assign(climate.provinces,copy(block.climate || {}));
    var declaredOpening = block.opening || {};
    merge(opening.actors,declaredOpening.actors);
    merge(opening.appointments,declaredOpening.appointments);
    ['estates','claims','migrations'].forEach(function (field) {
      opening[field] = opening[field].concat(copy(declaredOpening[field] || []));
    });
    merge(institutions,block.localInstitutions);
    stories = stories.concat(copy(block.storyIds || []));
  });
  if (!FBDATA.bookmarkInstitutions1096 || !FBDATA.bookmarkReligions1096 ||
      !FBDATA.bookmarkFaithAvailability1096)
    throw new Error('Missing 1096 identity or institution declarations');
  merge(institutions,FBDATA.bookmarkInstitutions1096);

  /* Every physical cell keeps its regional disposition. Missing rows and
     layouts cannot silently inherit another date or become empty scenery. */
  var physical = base.provinces.concat(geography.provinceAdditions);
  if (provinces.length !== physical.length)
    throw new Error('Incomplete 1096 physical coverage');
  physical.forEach(function (seed) {
    if (!own(countyIds,seed.id)) throw new Error('Missing 1096 county ' + seed.id);
  });
  provinces.forEach(function (province) {
    if (province.realm && !own(realmIds,province.realm))
      throw new Error('Missing 1096 owner ' + province.realm);
    if (!province.wasteland && (!layout[province.id] || !layout[province.id].length))
      throw new Error('Missing 1096 layout ' + province.id);
    if (province.duchy && !own(duchies,province.duchy))
      throw new Error('Missing 1096 duchy ' + province.duchy);
  });
  Object.keys(duchies).forEach(function (id) {
    var parent = duchies[id].kingdom;
    if (parent && !own(kingdoms,parent)) throw new Error('Missing 1096 kingdom ' + parent);
  });
  Object.keys(kingdoms).forEach(function (id) {
    var parent = kingdoms[id].empire;
    if (parent && !own(empires,parent)) throw new Error('Missing 1096 empire ' + parent);
  });
  realms.forEach(function (realm) {
    if (!own(countyIds,realm.capital) || countyIds[realm.capital].wasteland)
      throw new Error('Missing 1096 capital ' + realm.capital);
    if (realm.liege && !own(realmIds,realm.liege))
      throw new Error('Missing 1096 liege ' + realm.liege);
  });
  Object.keys(sites).forEach(function (id) {
    if (own(FBDATA.settlementSites,id) &&
        JSON.stringify(FBDATA.settlementSites[id]) !== JSON.stringify(sites[id]))
      throw new Error('Conflicting 1096 physical site ' + id);
  });

  /* Stage all catalogue changes before publishing any effective definition.
     Normal bookmark validation still owns the full gameplay schema. */
  Object.keys(FBDATA.bookmarkReligions1096).forEach(function (id) {
    faiths[id] = copy(FBDATA.bookmarkReligions1096[id]);
  });
  Object.keys(FBDATA.bookmarkFaithAvailability1096).forEach(function (id) {
    var faith = faiths[id] || FBDATA.religions[id], availability = copy(faith.availability);
    FBDATA.bookmarkFaithAvailability1096[id].bookmarkIds.forEach(function (bookmarkId) {
      if (availability.bookmarkIds.indexOf(bookmarkId) < 0) availability.bookmarkIds.push(bookmarkId);
    });
    faiths[id] = Object.assign({}, faith, {availability:availability});
  });

  /* This selectable opening retains its existing baseline identity. Fresh
     boot alone initializes people and resources; restore uses saved facts. */
  FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
  var bookmark = FBDATA.bookmarkCandidates['1096'] = {
    id:'1096', name:'The First Crusade',
    desc:'Western households consider the journey east while imperial and local courts pursue their own priorities.',
    date:{year:1096,season:0,day:1}, era:'high_medieval',
    geography:'europe_regional_2',
    revision:'baseline', revisions:{baseline:{}},
    settlementLayout:'1096', localInstitutions:institutions,
    religiousHeads:{catholic:'papacy_1096',sunni:'abbasid_1096'},
    startLocations:{}, stories:stories, scripted:[],
    provinces:provinces, realms:realms, duchies:duchies, kingdoms:kingdoms, empires:empires,
    climate:climate, straits:copy(base.straits), crossingClasses:copy(base.crossingClasses),
    opening:opening, openingRevision:'baseline', openingLegacyRevision:'baseline'
  };
  Object.assign(FBDATA.religions,faiths);
  Object.assign(FBDATA.settlementSites,sites);
  FBDATA.settlementLayouts['1096'] = layout;
  FBDATA.bookmarks['1096'] = bookmark;
})();
