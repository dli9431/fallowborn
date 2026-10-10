/* Shared additive physical base. Existing county seeds and scenery ids
   survive unchanged. Each bookmark must author its own dated politics. */
window.FBDATA = window.FBDATA || {};
FBDATA.geographies.europe_regional_2 = {
  extends:'europe_regional',
  provinceAdditions:[
    {"id":"draa_oases","name":"Draa oases","x":-6.1,"y":29.9,"terrain":"farmland","wasteland":true},
    {"id":"garama","name":"Garama","x":13.06,"y":26.54,"terrain":"farmland","wasteland":true},
    {"id":"ghadames_oasis","name":"Ghadames oasis","x":9.5,"y":30.13,"terrain":"farmland","wasteland":true},
    {"id":"awjila_oasis","name":"Awjila oasis","x":21.29,"y":29.11,"terrain":"farmland","wasteland":true},
    {"id":"siwa_oasis","name":"Siwa oasis","x":25.53,"y":29.2,"terrain":"farmland","wasteland":true},
    {"id":"jenne_district","name":"Middle Niger settlements","x":-4.55,"y":13.9,"terrain":"farmland","wasteland":true},
    {"id":"gao_district","name":"Niger bend communities","x":-0.04,"y":16.26,"terrain":"farmland","wasteland":true},
    {"id":"chad_lakeshore","name":"Lake Chad communities","x":14,"y":13.3,"terrain":"marsh","wasteland":true},
    {"id":"qasr_ibrim","name":"Primis","x":31.99,"y":22.65,"terrain":"hills","wasteland":true},
    {"id":"najran_oasis","name":"Najran","x":44.19,"y":17.49,"terrain":"farmland","wasteland":true},
    {"id":"tayma_oasis","name":"Tayma","x":38.53,"y":27.63,"terrain":"farmland","wasteland":true},
    {"id":"palmyra_district","name":"Palmyra","x":38.27,"y":34.55,"terrain":"desert","wasteland":true},
    {"id":"central_iran_oases","name":"Central Iranian oases","x":51.58,"y":33.98,"terrain":"farmland","wasteland":true},
    {"id":"eastern_iran_oases","name":"Eastern Iranian oases","x":56.92,"y":33.61,"terrain":"farmland","wasteland":true},
    {"id":"shebar_valley","name":"Hindu Kush pass communities","x":68.18,"y":35,"terrain":"mountains","wasteland":true},
    {"id":"gomal_valley","name":"Gomal valley","x":69.4,"y":32.1,"terrain":"hills","wasteland":true},
    {"id":"thar_margin","name":"Western Thar communities","x":69.19,"y":25.75,"terrain":"desert","wasteland":true},
    {"id":"sarakhs_oasis","name":"Sarakhs district","x":61.16,"y":36.54,"terrain":"farmland","wasteland":true},
    {"id":"nurata_foothills","name":"Northern Sogdian foothills","x":65.69,"y":40.56,"terrain":"hills","wasteland":true},
    {"id":"lower_syr_darya","name":"Lower Syr Darya communities","x":62.54,"y":45,"terrain":"farmland","wasteland":true},
    {"id":"sarysu_corridor","name":"Sarysu seasonal communities","x":67.95,"y":47.87,"terrain":"steppe","wasteland":true},
    {"id":"upper_kama","name":"Upper Kama communities","x":56.25,"y":58,"terrain":"forest","wasteland":true},
    {"id":"vychegda_district","name":"Vychegda communities","x":50.9,"y":61.67,"terrain":"forest","wasteland":true},
    {"id":"onega_district","name":"Onega communities","x":38.96,"y":61.5,"terrain":"forest","wasteland":true},
    {"id":"torne_district","name":"Northern Gulf river communities","x":24.14,"y":65.84,"terrain":"forest","wasteland":true},
    {"id":"kath_district","name":"Lower Amu Darya district","x":60.75,"y":41.69,"terrain":"farmland","wasteland":true},
    {"id":"gurganj_district","name":"Western Khwarazm district","x":59.08,"y":42.32,"terrain":"farmland","wasteland":true},
    {"id":"kumbi_district","name":"Western Sahel district","x":-7.97,"y":15.77,"terrain":"steppe","wasteland":true},
    {"id":"timbuktu_district","name":"Niger bend margin","x":-3.01,"y":16.77,"terrain":"steppe","wasteland":true}
  ],
  provinceOverrides:{},
  landRoutes:[["draa_oases","sijilmasa",3],["garama","tripoli",7],["ghadames_oasis","kairouan",7],["ghadames_oasis","garama",5],["awjila_oasis","barqa",5],["siwa_oasis","alexandria",5],["jenne_district","gao_district",5],["gao_district","ghadames_oasis",22],["chad_lakeshore","garama",15],["qasr_ibrim","aswan",2],["qasr_ibrim","dongola",4],["najran_oasis","sanaa",3],["tayma_oasis","medina",4],["palmyra_district","homs",2],["central_iran_oases","isfahan",2],["eastern_iran_oases","nishapur",4],["shebar_valley","bamiyan",1],["gomal_valley","ghazni",3],["thar_margin","mansura",2],["sarakhs_oasis","merv",3],["nurata_foothills","bukhara",2],["lower_syr_darya","chach",5],["sarysu_corridor","lower_syr_darya",6],["upper_kama","bolghar",5],["vychegda_district","upper_kama",5],["onega_district","beloozero",2],["torne_district","norrland",3]]
};
/* Mercator-local radius limits physical extent. Routes retain ordinary
   distance, terrain, provisions and political access checks. */
FBDATA.geographies.europe_regional_2.provinceAdditions.forEach(function (seed) {
  seed.maxRadiusKm = 65;
});
/* District coordinates identify physical areas, not dated town status or
   sovereignty. Date authors opt into habitation and supply their own sites.
   The inherited raster scale and all existing seed positions stay fixed. */
(function () {
  var base = FBDATA.geographies.europe_regional;
  var expanded = FBDATA.geographies.europe_regional_2;
  expanded.names = {
    provinces:Object.assign({}, base.names.provinces, {
      w_steppe_e:[{to:1450,name:'Eastern steppe'}]
    }),
    sites:Object.assign({}, base.names.sites)
  };
  expanded.climate = {zone:base.climate.zone,provinces:Object.assign({},base.climate.provinces)};
  expanded.provinceAdditions.forEach(function (seed) {
    expanded.climate.provinces[seed.id] = seed.y >= 45 ? 'continental' : 'arid';
  });
  ['kath_district','gurganj_district','nurata_foothills','lower_syr_darya','shebar_valley'].forEach(function (id) {
    expanded.climate.provinces[id] = 'continental';
  });
  expanded.landRoutes = expanded.landRoutes.concat([
    ['kath_district','bukhara',8], ['kath_district','gurganj_district',3],
    ['gurganj_district','lower_syr_darya',8],
    ['kumbi_district','jenne_district',6],
    ['timbuktu_district','jenne_district',5], ['timbuktu_district','gao_district',4]
  ]);
  /* Shared district anchors are optional presentations. A date may instead
     locate a more precisely evidenced site within the same bounded county. */
  ['kath_district','gurganj_district','kumbi_district','timbuktu_district'].forEach(function (id) {
    var seed = expanded.provinceAdditions.filter(function (p) { return p.id === id; })[0];
    FBDATA.settlementSites[id + '_site'] = {x:seed.x,y:seed.y};
  });
})();
