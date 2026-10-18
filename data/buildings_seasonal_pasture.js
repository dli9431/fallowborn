/* Seasonal work retains the existing farm, property and population owners. */
FBDATA.buildings_seasonal_pasture = {
  shieling:{
    name:'Seasonal Pasture Outpost', icon:'🌿', role:'industry',
    cost:20, upkeep:1, devMin:0, maxCounty:1, aiBuildOrder:34,
    settlementDraw:false, dev:0, pop:0, prestige:0, seasonProfile:'shieling_summer',
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
    rationale:'Ordinary seasonal farm work and reviewing its actual inputs need no discovery. Construction requires real allocated parent output, lawful delivery and grazing, local care and current construction and work funds. A standing outpost only prepares that conserved share. Ordinary farming remains available; no herd, people or capacity is created.'
  };
})();
