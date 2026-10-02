/* =========================================================================
   Fallowborn - GEOGRAPHY BASES
   =========================================================================
   A geography base owns the physical world a bookmark is drawn on: the
   projection window and grid width, landmass, sea and river geometry,
   county seed points and terrain, straits and crossing classes, settlement
   sites, the default settlement layout, map-scale tuning and place names
   by year. Every bookmark names one base in its `geography` field; politics
   (realms, owners, hierarchy, communities) stay authored per bookmark.

   europe_regional references the long-standing tables of data/map_data.js
   and data/counties.js rather than copying them, so the legacy top-level
   mod keys keep editing the same objects, and it shares the global site
   table of data/settlements.js. Only one base is
   active at a time; activation builds its raster once per bookmark.
   See docs/MODDING.md (Geography bases).
   ========================================================================= */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';

  /* Period place names by county id. A bookmark resolves each list from
     its start year at activation: the first entry whose year window holds
     that year (and whose culture, if given, matches the county's) replaces
     the county's authored name. These late antique forms were authored for
     the 476 start; the closing year is a coarse window that later bookmarks
     on this base may refine. */
  var PROVINCE_NAMES = {
    barcelona:[{ to:600, name:'Barcino' }],
    tarragona:[{ to:600, name:'Tarraco' }],
    toledo:[{ to:600, name:'Toletum' }],
    sevilla:[{ to:600, name:'Hispalis' }],
    cordoba:[{ to:600, name:'Corduba' }],
    merida:[{ to:600, name:'Emerita Augusta' }],
    zaragoza:[{ to:600, name:'Caesaraugusta' }],
    valencia:[{ to:600, name:'Valentia' }],
    coruna:[{ to:600, name:'Brigantium' }],
    santiago:[{ to:600, name:'Iria Flavia' }],
    fes:[{ to:600, name:'Volubilis' }],
    tahert:[{ to:600, name:'Mauretanian highlands' }],
    algiers:[{ to:600, name:'Icosium' }],
    constantine:[{ to:600, name:'Cirta' }],
    nantes:[{ to:600, name:'Condevincum' }],
    rennes:[{ to:600, name:'Condate' }],
    metz:[{ to:600, name:'Divodurum' }],
    trier:[{ to:600, name:'Augusta Treverorum' }],
    reims:[{ to:600, name:'Durocortorum' }],
    lyon:[{ to:600, name:'Lugdunum' }],
    milano:[{ to:600, name:'Mediolanum' }],
    torino:[{ to:600, name:'Augusta Taurinorum' }],
    siracusa:[{ to:600, name:'Syracuse' }],
    pliska:[{ to:600, name:'Abritus' }],
    split:[{ to:600, name:'Salona' }],
    tunis:[{ to:600, name:'Carthage' }],
    kairouan:[{ to:600, name:'Byzacena' }]
  };

  FBDATA.geographies = {
    europe_regional:{
      bounds:FBDATA.bounds,
      land:FBDATA.land,
      seas:FBDATA.seas,
      rivers:FBDATA.rivers,
      gridWidth:1100,
      /* Distances in world pixels of the 1100-wide raster (about 12 px per
         degree of longitude). A base of a different scale sets its own. */
      mapScale:{
        siteSnapMax:45,          // an authored site may snap this far into its county
        raidOverlandPx:85,       // overland raid reach, about 2.4 county widths
        raidCavalryPx:35,        // added by each mounted raiding technology
        raidNavalPx:200,         // seaborne raid reach with longships
        raidNavigationPx:40,     // added by each navigation technology
        raidNavalInlandPx:55,    // an inland county this near a coast is reachable by sea
        aiSeaRaidReachSq:28000   // squared seed distance of an AI seaborne raid
      },
      provinces:FBDATA.provinces,
      straits:FBDATA.straits,
      crossingClasses:FBDATA.crossingClasses,
      /* no sites table: this base uses the shared FBDATA.settlementSites,
         which data/settlements*.js fill and runtime mods extend */
      defaultLayout:'867',
      names:{ provinces:PROVINCE_NAMES, sites:{} }
    }
  };
  FBDATA.defaultGeography = 'europe_regional';
})();
