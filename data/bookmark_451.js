FB.bookmarkSources.stage({source:'data/bookmark_451.js',bookmarks:['451'],catalogs:[],shared:[]}, function (FBDATA) {
/* Hidden authoring scaffold. Regional literals are independent of the current
   476 definition; historical corrections belong to their regional sources. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function own(table, id) { return Object.prototype.hasOwnProperty.call(table,id); }
  function merge(target, source) {
    Object.keys(source || {}).forEach(function (id) {
      if (own(target,id)) throw new Error('Duplicate 451 declaration: ' + id);
      target[id] = copy(source[id]);
    });
  }
  /* The shared catalogue supports these earlier years. The dated source opts
     the existing era into that coverage before canonical world review. */
  FBDATA.eras = copy(FBDATA.eras);
  FBDATA.eras.late_antique.technology.from = 375;
  FBDATA.bookmarkCandidates = FBDATA.bookmarkCandidates || {};
  var b = FBDATA.bookmarkCandidates['451'] = {
    id:'451',name:'The Fifth-Century World',
    desc:'An uncorrected late antique regional scaffold, reserved for historical authoring.',
    date:{year:451,season:0,day:1},era:'late_antique',hidden:true,
    geography:'europe_regional_2',settlementLayout:'451',religiousHeads:{},
    systems:{disable:['papacy','scutage','manorial_tenure','excommunication','abbeys',
      'feudal_service','crown_bloc','tournaments','great_holy_wars']},
    provinces:[],realms:[],duchies:{},kingdoms:{},empires:{},
    climate:{zone:'northern_temperate',provinces:{}},straits:[],crossingClasses:{},
    opening:{actors:{},appointments:{},estates:[],claims:[],migrations:[]},
    localInstitutions:{},stories:[],scripted:[],starts:[]
  };
  b.straits = [["messina","reggio"],["palermo","tunis"],["malaga","tangier"],["silves","tangier"],["constantinople","nicaea"],["cagliari","pisa"],["ajaccio","lucca"],["ajaccio","nice"],["mallorca","valencia"],["siracusa","tunis"],["canterbury","boulogne"],["dorset","caen"],["lewes","rouen"],["scarborough","arhus"],["tonsberg","arhus"],["hedeby","roskilde"],["roskilde","lund"],["visby","birka"],["iona","glasgow"],["lewis","inverness"],["man","whithorn"],["man","dublin"],["ulaid","dumbarton"],["cork","cornwall"],["candia","athens"],["nicosia","adana"]];
  b.crossingClasses = {"messina|reggio":"narrow","palermo|tunis":"open","malaga|tangier":"narrow","silves|tangier":"coastal","constantinople|nicaea":"narrow","cagliari|pisa":"open","ajaccio|lucca":"coastal","ajaccio|nice":"coastal","mallorca|valencia":"open","siracusa|tunis":"open","boulogne|canterbury":"narrow","caen|dorset":"coastal","lewes|rouen":"coastal","arhus|scarborough":"open","arhus|tonsberg":"open","hedeby|roskilde":"coastal","lund|roskilde":"narrow","birka|visby":"open","glasgow|iona":"coastal","inverness|lewis":"coastal","man|whithorn":"coastal","dublin|man":"coastal","dumbarton|ulaid":"coastal","cork|cornwall":"open","athens|candia":"open","adana|nicosia":"coastal"};
  var layouts = {}, sites = {}, counties = {}, realms = {};
  var regions = FBDATA.bookmarkRegions451 || {};
  var order = ['gaul_iberia_britain','italy_africa_dalmatia','danube_eastern_provinces','outer_regions'];
  if (Object.keys(regions).length !== order.length) throw new Error('Incomplete 451 regional declarations.');
  order.forEach(function (id) {
    var region = regions[id];
    if (!region) throw new Error('Missing 451 region: ' + id);
    region.provinces.forEach(function (row) {
      if (own(counties,row.id)) throw new Error('Duplicate 451 county: ' + row.id);
      counties[row.id] = true; b.provinces.push(copy(row));
    });
    region.realms.forEach(function (row) {
      if (own(realms,row.id)) throw new Error('Duplicate 451 realm: ' + row.id);
      realms[row.id] = true; b.realms.push(copy(row));
    });
    ['duchies','kingdoms','empires','localInstitutions'].forEach(function (key) { merge(b[key],region[key]); });
    merge(layouts,region.settlementLayouts); merge(sites,region.settlementSites);
    merge(b.climate.provinces,region.climate);
    merge(b.opening.actors,region.opening.actors); merge(b.opening.appointments,region.opening.appointments);
    ['estates','claims','migrations'].forEach(function (key) {
      b.opening[key] = b.opening[key].concat(copy(region.opening[key]));
    });
  });
  var geography = FBDATA.geographies.europe_regional_2;
  var physical = FBDATA.geographies.europe_regional.provinces.concat(geography.provinceAdditions);
  if (b.provinces.length !== physical.length) throw new Error('Incomplete 451 physical coverage.');
  physical.forEach(function (row) { if (!own(counties,row.id)) throw new Error('Missing 451 county: ' + row.id); });
  b.provinces.forEach(function (row) {
    if (row.realm && !own(realms,row.realm)) throw new Error('Missing 451 owner: ' + row.realm);
    if (!row.wasteland && (!layouts[row.id] || !layouts[row.id].length)) throw new Error('Missing 451 layout: ' + row.id);
  });
  b.realms.forEach(function (row) {
    if (!own(counties,row.capital)) throw new Error('Missing 451 capital: ' + row.capital);
  });
  FBDATA.bookmarkDraft451 = {bookmark:b,layouts:layouts,sites:sites};
})();

/* A copied ordinary household provides the scaffold's generic review journey.
   The separate dated start table is reserved for authored perspectives. */
FBDATA.startScenarios451Scaffold = [
  {id:'farmer_451',bookmarkIds:['451'],alwaysUnlocked:true,
    name:'Free Farming Household',desc:'A free household with a small plot in the wider late antique world.',
    tier:1,profession:'farmer',gold:20,prestige:5,piety:0,startEffects:{landPlots:1},
    intro:'You are {name}, a free farmer of {province}. Your neighbors, fields and family have their own needs while distant courts bargain and fight.'}
];
});
