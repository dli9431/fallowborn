/* Independent spring 1241 world assembled from date-owned regional records.
   See docs/research/1241-bookmark.md for the first-pass limits. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
FBDATA.bookmarkCandidates['1241'] = {
  id:'1241', name:'The Mongol Invasion',
  desc:'Hungarian and Rus households face an uncertain spring while rival courts pursue their own priorities.',
  date:{year:1241,season:0,day:1}, era:'high_medieval',
  geography:'europe_regional_2',
  revision:'baseline', revisions:{baseline:{}}, settlementLayout:'1241',
  openingRevision:'baseline', openingLegacyRevision:'baseline',
  opening:{actors:{},appointments:{},estates:[],claims:[],migrations:[]},
  localInstitutions:{}, religiousHeads:{catholic:'papacy_1241',sunni:'abbasid_1241'},
  provinces:[], realms:[], duchies:{}, kingdoms:{}, empires:{},
  startLocations:{}, stories:[], scripted:[]
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  /* Adjacent regions repeat their shared title parents. Equal declarations
     agree; conflicting labels or parents must be reconciled at the source. */
  function merge(target, source, shared) {
    Object.keys(source || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(target,id)) {
        if (!shared || JSON.stringify(target[id]) !== JSON.stringify(source[id]))
          throw new Error('Conflicting 1241 declaration: ' + id);
      } else target[id] = copy(source[id]);
    });
  }
  var order = [
    'hungary_cumans','rus_north','rus_south','western_command_steppe',
    'britain_south','britain_north_ireland','france_north_low_countries','france_south_alps',
    'iberia_north_interior','iberia_south_east','empire_rhine_alps','bohemia_poland',
    'empire_north','italy_north','italy_south_papacy','scandinavia','baltic_finnic',
    'balkans_croatia','greek_latin_courts','anatolia_black_sea','caucasus_caspian',
    'levant_jazira','egypt','arabia','maghreb','africa_horn_sahel',
    'iraq_iran_west','iran_south_khorasan','transoxiana_khwarazm','afghan_indus'
  ];
  var regions = FBDATA.bookmarkRegions1241;
  if (!regions || Object.keys(regions).length !== order.length)
    throw new Error('Incomplete 1241 regional declarations');
  var b = FBDATA.bookmarkCandidates['1241'], layouts = {}, sites = {};
  var countyIds = {}, realmIds = {};
  b.climate = copy(FBDATA.geographies.europe_regional_2.climate);
  b.straits = copy(FBDATA.geographies.europe_regional.straits);
  b.crossingClasses = copy(FBDATA.geographies.europe_regional.crossingClasses);
  order.forEach(function (key) {
    var block = regions[key];
    if (!block) throw new Error('Missing 1241 region: ' + key);
    ['provinces','realms'].forEach(function (field) {
      var seen = field === 'provinces' ? countyIds : realmIds;
      block[field].forEach(function (row) {
        if (seen[row.id]) throw new Error('Duplicate 1241 ' + field + ': ' + row.id);
        seen[row.id] = true;
        b[field].push(copy(row));
      });
    });
    ['duchies','kingdoms','empires'].forEach(function (field) { merge(b[field],block[field],true); });
    merge(layouts,block.settlementLayouts || block.layouts);
    merge(sites,block.settlementSites);
    Object.assign(b.climate.provinces,copy(block.climates || {}));
    merge(b.localInstitutions,block.localInstitutions);
    var opening = block.opening || {};
    ['actors','appointments'].forEach(function (field) { merge(b.opening[field],opening[field]); });
    ['estates','claims','migrations'].forEach(function (field) {
      b.opening[field] = b.opening[field].concat(copy(opening[field] || []));
    });
    b.stories = b.stories.concat(copy(block.storyIds || []));
  });
  /* Ordinary map-chosen roles retain resident selection and their existing
     resources. Historical people and fixed story households are separate. */
  var inhabited = b.provinces.filter(function (p) { return !p.wasteland; })
    .map(function (p) { return p.id; });
  ['serf','farmer','apprentice','monk','soldier','knight','baron'].forEach(function (id) {
    b.startLocations[id] = inhabited.slice();
  });
  /* Publish only after all blocks have composed. These copies remain detached
     from regional inputs and from the earlier worlds used to author them. */
  Object.keys(FBDATA.bookmarkReligions1241).forEach(function (id) {
    FBDATA.religions[id] = copy(FBDATA.bookmarkReligions1241[id]);
  });
  Object.keys(sites).forEach(function (id) {
    if (!FBDATA.settlementSites[id]) FBDATA.settlementSites[id] = sites[id];
  });
  FBDATA.settlementLayouts['1241'] = layouts;
  b.openingRevisions = {baseline:b.opening};
  FBDATA.bookmarks['1241'] = b;
})();
