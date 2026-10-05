/* =========================================================================
   Fallowborn - GEOGRAPHY BASES
   =========================================================================
   A geography base owns the physical world a bookmark is drawn on: the
   projection window and grid width, landmass, sea and river geometry,
   county seed points and terrain, straits and crossing classes, settlement
   sites, the default settlement layout, map-scale tuning, place names by
   year and climate zones (data/climate.js). Every bookmark names one base
   in its `geography` field; politics (realms, owners, hierarchy,
   communities) stay authored per bookmark.

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
    siracusa:[{ to:600, name:'Syracusae' }],
    pliska:[{ to:600, name:'Abritus' }],
    split:[{ to:600, name:'Salona' }],
    tunis:[{ to:600, name:'Carthage' }],
    kairouan:[{ to:600, name:'Byzacena' }],
    aosta:[{ to:600, name:'Augusta Praetoria' }],
    genoa:[{ to:600, name:'Genua' }],
    pavia:[{ to:600, name:'Ticinum' }],
    brescia:[{ to:600, name:'Brixia' }],
    trento:[{ to:600, name:'Tridentum' }],
    padova:[{ to:600, name:'Patavium' }],
    venezia:[{ to:600, name:'Altinum' }],
    friuli:[{ to:600, name:'Forum Iulii' }],
    modena:[{ to:600, name:'Mutina' }],
    bologna:[{ to:600, name:'Bononia' }],
    firenze:[{ to:600, name:'Florentia' }],
    pisa:[{ to:600, name:'Pisae' }],
    siena:[{ to:600, name:'Saena Iulia' }],
    lucca:[{ to:600, name:'Luca' }],
    spoleto:[{ to:600, name:'Spoletium' }],
    perugia:[{ to:600, name:'Perusia' }],
    roma:[{ to:600, name:'Roma' }],
    benevento:[{ to:600, name:'Beneventum' }],
    capua:[{ to:600, name:'Capua' }],
    salerno:[{ to:600, name:'Salernum' }],
    bari:[{ to:600, name:'Barium' }],
    foggia:[{ to:600, name:'Apulian interior' }],
    taranto:[{ to:600, name:'Tarentum' }],
    brindisi:[{ to:600, name:'Brundisium' }],
    reggio:[{ to:600, name:'Rhegium' }],
    cosenza:[{ to:600, name:'Consentia' }],
    palermo:[{ to:600, name:'Panormus' }],
    messina:[{ to:600, name:'Messana' }],
    cagliari:[{ to:600, name:'Carales' }],
    sassari:[{ to:600, name:'Turris Libisonis' }],
    ajaccio:[{ to:600, name:'Corsica' }],
    salzburg:[{ to:600, name:'Iuvavum' }],
    linz:[{ to:600, name:'Lentia' }],
    wien:[{ to:600, name:'Vindobona' }],
    klagenfurt:[{ to:600, name:'Virunum' }],
    graz:[{ to:600, name:'Flavia Solva' }],
    augsburg:[{ to:600, name:'Augusta Vindelicum' }],
    konstanz:[{ to:600, name:'Constantia' }],
    zurich:[{ to:600, name:'Turicum' }],
    basel:[{ to:600, name:'Basilia' }],
    geneva:[{ to:600, name:'Genava' }],
    besancon:[{ to:600, name:'Vesontio' }],
    nice:[{ to:600, name:'Cemenelum' }],
    bordeaux:[{ to:600, name:'Burdigala' }],
    agen:[{ to:600, name:'Aginnum' }],
    perigueux:[{ to:600, name:'Vesunna' }],
    poitiers:[{ to:600, name:'Pictavi' }],
    angouleme:[{ to:600, name:'Iculisma' }],
    limoges:[{ to:600, name:'Augustoritum' }],
    toulouse:[{ to:600, name:'Tolosa' }],
    albi:[{ to:600, name:'Albiga' }],
    cahors:[{ to:600, name:'Divona' }],
    rodez:[{ to:600, name:'Segodunum' }],
    clermont:[{ to:600, name:'Arverni' }],
    bayonne:[{ to:600, name:'Lapurdum' }],
    auch:[{ to:600, name:'Augusta Auscorum' }],
    narbonne:[{ to:600, name:'Narbo' }],
    beziers:[{ to:600, name:'Baeterrae' }],
    carcassonne:[{ to:600, name:'Carcaso' }],
    macon:[{ to:600, name:'Matisco' }],
    vienne:[{ to:600, name:'Vienna' }],
    arles:[{ to:600, name:'Arelate' }],
    marseille:[{ to:600, name:'Massilia' }],
    avignon:[{ to:600, name:'Avennio' }],
    chambery:[{ to:600, name:'Lemincum' }],
    grenoble:[{ to:600, name:'Gratianopolis' }],
    dijon:[{ to:600, name:'Divio' }],
    auxerre:[{ to:600, name:'Autessiodurum' }],
    paris:[{ to:600, name:'Parisii' }],
    chartres:[{ to:600, name:'Carnutes' }],
    sens:[{ to:600, name:'Senones' }],
    orleans:[{ to:600, name:'Aurelianum' }],
    rouen:[{ to:600, name:'Rotomagus' }],
    bayeux:[{ to:600, name:'Augustodurum' }],
    evreux:[{ to:600, name:'Mediolanum Aulercorum' }],
    angers:[{ to:600, name:'Andecavi' }],
    tours:[{ to:600, name:'Turones' }],
    le_mans:[{ to:600, name:'Cenomani' }],
    bourges:[{ to:600, name:'Bituriges' }],
    troyes:[{ to:600, name:'Tricasses' }],
    chalons:[{ to:600, name:'Durocatalaunum' }],
    amiens:[{ to:600, name:'Ambiani' }],
    st_quentin:[{ to:600, name:'Augusta Viromanduorum' }],
    laon:[{ to:600, name:'Augusta Suessionum' }],
    arras:[{ to:600, name:'Atrebates' }],
    ghent:[{ to:600, name:'Tornacum area' }],
    boulogne:[{ to:600, name:'Gesoriacum' }],
    vannes:[{ to:600, name:'Darioritum' }],
    verdun:[{ to:600, name:'Virodunum' }],
    strasbourg:[{ to:600, name:'Argentoratum' }],
    aachen:[{ to:600, name:'Aquae Granni' }],
    cologne:[{ to:600, name:'Colonia Agrippina' }],
    lerida:[{ to:600, name:'Ilerda' }],
    tortosa:[{ to:600, name:'Dertosa' }],
    huesca:[{ to:600, name:'Osca' }],
    pamplona:[{ to:600, name:'Pompaelo' }],
    murcia:[{ to:600, name:'Carthago Nova' }],
    granada:[{ to:600, name:'Iliberris' }],
    malaga:[{ to:600, name:'Malaca' }],
    lisboa:[{ to:600, name:'Olisipo' }],
    coimbra:[{ to:600, name:'Conimbriga' }],
    leon:[{ to:600, name:'Legio' }],
    astorga:[{ to:600, name:'Asturica Augusta' }],
    lugo:[{ to:600, name:'Lucus Augusti' }],
    mallorca:[{ to:600, name:'Maiorica' }],
    sirmium:[{ to:600, name:'Sirmium' }],
    osijek:[{ to:600, name:'Mursa' }],
    szekesfehervar:[{ to:600, name:'Pannonian interior' }],
    moson:[{ to:600, name:'Upper Pannonia' }],
    zagreb:[{ to:600, name:'Andautonia' }],
    sisak:[{ to:600, name:'Siscia' }],
    zadar:[{ to:600, name:'Iader' }],
    knin:[{ to:600, name:'Burnum' }],
    kotor:[{ to:600, name:'Acruvium' }],
    dyrrachion:[{ to:600, name:'Dyrrachium' }],
    ohrid:[{ to:600, name:'Lychnidus' }],
    skopje:[{ to:600, name:'Scupi' }],
    thessaloniki:[{ to:600, name:'Thessalonica' }],
    serres:[{ to:600, name:'Serrhae' }],
    adrianople:[{ to:600, name:'Hadrianopolis' }],
    nicaea:[{ to:600, name:'Nicaea' }],
    dorylaion:[{ to:600, name:'Dorylaeum' }],
    ancyra:[{ to:600, name:'Ancyra' }],
    amorion:[{ to:600, name:'Amorium' }],
    attaleia:[{ to:600, name:'Attalea' }],
    ikonion:[{ to:600, name:'Iconium' }],
    sebasteia:[{ to:600, name:'Sebastea' }],
    tripoli:[{ to:600, name:'Oea' }],
    tlemcen:[{ to:600, name:'Pomaria' }],
    tangier:[{ to:600, name:'Tingis' }],
    sirte:[{ to:600, name:'Tripolitanian coast' }]
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
      names:{ provinces:PROVINCE_NAMES, sites:{} },
      /* One zone for every county keeps the long-standing single meaning of
         each season; regional climates are a per-bookmark content decision. */
      climate:{ zone:'northern_temperate', provinces:{} }
    }
  };
  FBDATA.defaultGeography = 'europe_regional';
})();
