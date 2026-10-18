/* The paid outfitting yard uses ordinary coastal construction and manpower. */
window.FBDATA = window.FBDATA || {};

FBDATA.buildingCorrections_maritime = {
  arsenal:{
    role:'shipyard', aiBuildOrder:4, name:'Naval Outfitting Yard', icon:'⚓',
    cost:140, upkeep:3, coastal:true, devMin:5, maxCounty:1,
    tax:5, dev:1, retinue:20, requiresTech:'harbor_works',
    desc:'Maintained slips, stores, and workshops support paid naval outfitting. No drainable basin or fleet is created. (+20 men-at-arms)'
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.buildingCorrections_maritime).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Missing maritime building correction target: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildingCorrections_maritime[id]));
  });
  FBDATA.techImpactReviews.features.building_arsenal = {
    mode:'hard', tech:['harbor_works'], fallback:'ordinary_boat_work_and_travel',
    rationale:'An optional organized naval outfitting yard needs harbor works, lawful construction funding and upkeep. Ordinary boat maintenance and travel remain available; graving docks and an automatically created fleet are separate.'
  };
})();
