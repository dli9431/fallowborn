/* Independent spring 1096 world assembled from date-owned regional records.
   See docs/research/1096-bookmark.md for the first-pass limits. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
FBDATA.bookmarkCandidates['1096'] = {
  id:'1096', name:'The First Crusade',
  desc:'Western households consider the journey east while imperial and local courts pursue their own priorities.',
  date:{year:1096,season:0,day:1}, era:'high_medieval',
  geography:'europe_regional_2',
  revision:'baseline', revisions:{baseline:{}},
  settlementLayout:'1096', localInstitutions:{},
  religiousHeads:{catholic:'papacy_1096',sunni:'abbasid_1096'},
  startLocations:{}, stories:[], scripted:[]
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }

  /* Source title groups are a coarse presentation scaffold. Regional title
     declarations replace them; no earlier counties, courts or people enter
     this world through the title fallback. */
  var titles = FBDATA.bookmarks['1066'];
  var geography = FBDATA.geographies.europe_regional_2;
  var bookmark = FBDATA.bookmarkCandidates['1096'];
  var layout = {}, provinces = [], realms = [], countyIds = {}, realmIds = {};
  var duchies = copy(titles.duchies), kingdoms = copy(titles.kingdoms);
  var empires = copy(titles.empires), climate = copy(geography.climate);
  var sites = {}, opening = {actors:{},appointments:{},estates:[],claims:[],migrations:[]};
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
      countyIds[province.id] = true;
      provinces.push(copy(province));
    });
    block.realms.forEach(function (realm) {
      if (realmIds[realm.id]) throw new Error('Duplicate 1096 realm ' + realm.id);
      realmIds[realm.id] = true;
      realms.push(copy(realm));
    });
    Object.assign(duchies,copy(block.duchies || {}));
    Object.assign(kingdoms,copy(block.kingdoms || {}));
    Object.assign(empires,copy(block.empires || {}));
    Object.assign(layout,copy(block.settlementLayouts || block.layouts || {}));
    Object.assign(sites,copy(block.settlementSites || {}));
    Object.assign(climate.provinces,copy(block.climate || {}));
    var declaredOpening = block.opening || {};
    Object.assign(opening.actors,copy(declaredOpening.actors || {}));
    Object.assign(opening.appointments,copy(declaredOpening.appointments || {}));
    ['estates','claims','migrations'].forEach(function (field) {
      opening[field] = opening[field].concat(copy(declaredOpening[field] || []));
    });
    Object.assign(bookmark.localInstitutions,copy(block.localInstitutions || {}));
    bookmark.stories = bookmark.stories.concat(copy(block.storyIds || []));
  });
  Object.assign(bookmark.localInstitutions,copy(FBDATA.bookmarkInstitutions1096));

  /* Publish detached local faiths only alongside the complete dated world.
     Loading or restoring a campaign never runs a regional initializer. */
  Object.keys(FBDATA.bookmarkReligions1096).forEach(function (id) {
    FBDATA.religions[id] = copy(FBDATA.bookmarkReligions1096[id]);
  });
  Object.assign(FBDATA.settlementSites,sites);
  FBDATA.settlementLayouts['1096'] = layout;
  Object.assign(bookmark,{
    provinces:provinces, realms:realms, duchies:duchies, kingdoms:kingdoms, empires:empires,
    climate:climate, straits:copy(FBDATA.geographies.europe_regional.straits),
    crossingClasses:copy(FBDATA.geographies.europe_regional.crossingClasses),
    opening:opening, openingRevision:'baseline', openingLegacyRevision:'baseline'
  });
  FBDATA.bookmarks['1096'] = bookmark;
  Object.keys(FBDATA.bookmarkFaithAvailability1096).forEach(function (id) {
    var faith = FBDATA.religions[id], availability = copy(faith.availability);
    FBDATA.bookmarkFaithAvailability1096[id].bookmarkIds.forEach(function (bookmarkId) {
      if (availability.bookmarkIds.indexOf(bookmarkId) < 0) availability.bookmarkIds.push(bookmarkId);
    });
    FBDATA.religions[id] = Object.assign({}, faith, {availability:availability});
  });
})();
