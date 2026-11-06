FB.bookmarkSources.stage({"source":"data/bookmark_634_routes.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Detached physical-connection and climate inputs for the autumn opening.
   No counties, active worlds or shared geography are changed here. */
(function () {
  'use strict';
  var packet = {
    geography:'europe_regional_2',
    // Reference inventory only: landRoutes remain owned by this geography.
    inheritedLandRoutes:[["draa_oases","sijilmasa",3],["garama","tripoli",7],["ghadames_oasis","kairouan",7],["ghadames_oasis","garama",5],["awjila_oasis","barqa",5],["siwa_oasis","alexandria",5],["jenne_district","gao_district",5],["gao_district","ghadames_oasis",22],["chad_lakeshore","garama",15],["qasr_ibrim","aswan",2],["qasr_ibrim","dongola",4],["najran_oasis","sanaa",3],["tayma_oasis","medina",4],["palmyra_district","homs",2],["central_iran_oases","isfahan",2],["eastern_iran_oases","nishapur",4],["shebar_valley","bamiyan",1],["gomal_valley","ghazni",3],["thar_margin","mansura",2],["sarakhs_oasis","merv",3],["nurata_foothills","bukhara",2],["lower_syr_darya","chach",5],["sarysu_corridor","lower_syr_darya",6],["upper_kama","bolghar",5],["vychegda_district","upper_kama",5],["onega_district","beloozero",2],["torne_district","norrland",3],["kath_district","bukhara",8],["kath_district","gurganj_district",3],["gurganj_district","lower_syr_darya",8],["kumbi_district","jenne_district",6],["timbuktu_district","jenne_district",5],["timbuktu_district","gao_district",4]],
    straits:[],crossingClasses:{},
    climate:{zone:'northern_temperate',provinces:{}}
  };
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
    packet.straits.push(row.slice(0,2));
    packet.crossingClasses[row.slice(0,2).sort().join('|')] = row[2];
  });
  var order = ['b01','b02','b03','b04','b05','b06','b07','b08','b09','b10',
    'b11','b12','b13','b14','b15','b16','b17','b18','b19','b20','b21',
    'b22','b23','b24','b25','b26','b27','b28','b29',
    'scenery_a','scenery_b','scenery_c','scenery_d'];
  order.forEach(function (id) {
    var block = FBDATA.bookmarkRegions634[id];
    var zones = block.climate || block.climates;
    Object.keys(zones).forEach(function (county) {
      if (Object.prototype.hasOwnProperty.call(packet.climate.provinces, county))
        throw new Error('Duplicate 634 climate assignment: ' + county);
      packet.climate.provinces[county] = zones[county];
    });
  });
  FBDATA.bookmarkRoutes634 = packet;
})();
});
