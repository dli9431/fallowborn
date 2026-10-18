/* A construction window does not remove inherited milling assets. */
window.FBDATA = window.FBDATA || {};

FBDATA.buildingCorrections_wind = {
  windmill:{
    role:'milling', aiBuildOrder:9, name:'Post Windmill', icon:'🌬',
    cost:45, maxCounty:2, tax:2, dev:1, populationCapacity:0.05,
    requiresTech:'windmill', applicability:{ yearMin:1150 },
    desc:'A timber mill turns its body and sails toward the wind to grind grain. New construction is available from 1150 with Wind-Powered Milling; inherited mills retain their effects and repairs.'
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.buildingCorrections_wind).forEach(function (id) {
    if (!Object.prototype.hasOwnProperty.call(FBDATA.buildings, id))
      throw new Error('Missing wind building correction target: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildingCorrections_wind[id]));
  });
  FBDATA.techImpactReviews.features.building_windmill = {
    mode:'soft', tech:['windmill'],
    rationale:'Wind-Powered Milling supports optional post mills while ordinary grinding and watermills remain available. The inclusive 1150 construction boundary is historical applicability, with no separate discovery requirement; inherited assets and repairs retain their existing rules.'
  };
})();
