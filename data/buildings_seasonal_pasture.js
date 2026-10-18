/* Seasonal work retains the existing farm, property and population owners. */
FBDATA.buildings_seasonal_pasture = {
  shieling:{
    name:'Seasonal Pasture Outpost', icon:'🌿', role:'industry',
    cost:20, upkeep:1, devMin:0, maxCounty:1, aiBuildOrder:34,
    settlementDraw:false, dev:0, pop:0, prestige:0,
    applicability:{yearMin:850,yearMax:1300,countyIds:['faroes']},
    desc:'Summer work prepares only an existing parent farm’s allocated output. Actual local grazing rights, finite capacity, available care and paid work are required. The outpost creates no herd, people or population capacity; ordinary farming remains available.'
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.buildings_seasonal_pasture).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Duplicate seasonal pasture building: ' + id);
    FBDATA.buildings[id]=JSON.parse(JSON.stringify(FBDATA.buildings_seasonal_pasture[id]));
  });
  FBDATA.techImpactReviews.features.seasonal_parent_farm = {
    mode:'none',
    rationale:'Ordinary seasonal farm work needs no discovery. A standing outpost only prepares a conserved share of an existing staffed farm’s output with lawful finite grazing, local care and funded work. Ordinary farming remains available; no herd, people or capacity is created.'
  };
})();
