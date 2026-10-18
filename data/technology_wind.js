/* Wind-powered milling knowledge is distinct from post-mill construction. */
window.FBDATA = window.FBDATA || {};

FBDATA.techCorrections_wind = {
  windmill:{
    name:'Wind-Powered Milling', icon:'🌬', domain:'crafts', cost:100,
    req:['water_power'],
    history:{ attested:[900,1200], adoption:{
      default:[1030,1240],
      latin:[980,1190],
      byzantine:[1030,1240],
      islamic:[960,1170],
      persianate:[970,1180],
      slavic:[1065,1275],
      nordic:[1070,1280],
      steppe:[1060,1270],
      baltic_finnic:[1085,1295],
      caucasian:[1055,1265],
      northeast_african:[1065,1275]
    } },
    desc:'Wind drives grain milling: eastern vertical-axis mills and later western rotating post mills use distinct mechanisms. Knowledge alone does not permit every physical mill.',
    confidence:'medium', sources:['GIES','HILL','HARVERSON'],
    unlocks:['rule:wind_power','building:windmill'], capabilities:[],
    fx:{ costs:{ enterprise:-0.015 } }
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.techCorrections_wind).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.tech, id))
      throw new Error('Missing wind technology correction target: ' + id);
    FBDATA.tech[id] = JSON.parse(JSON.stringify(FBDATA.techCorrections_wind[id]));
  });
})();
