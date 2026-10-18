/* Baseline preservation uses actual conserved provisions, never inferred stock. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildings_fish_drying = {
  fish_drying_station:{
    role:'food_store', aiBuildOrder:33, name:'Fish Drying Station', icon:'🐟',
    cost:30, upkeep:1, devMin:1, maxCounty:1, coastal:true, settlementDraw:false,
    populationFamineProtection:0.03, seasonProfile:'fish_drying_cool',
    applicability:{yearMin:850,yearMax:1300,traditions:['nordic']},
    desc:'Paid local work dries actual fish during a suitable cool season. Only dried provisions committed for local use provide 3% famine protection during their finite term. Sold or spoiled stock provides none.'
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.buildings_fish_drying).forEach(function(id){
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id)) throw new Error('Duplicate fish drying building: '+id);
    FBDATA.buildings[id]=JSON.parse(JSON.stringify(FBDATA.buildings_fish_drying[id]));
  });
  FBDATA.techImpactReviews.features.baseline_fish_drying={
    mode:'none',
    rationale:'Baseline fish preservation needs genuine fish, suitable local weather, paid work and finite reserved provisions. Ordinary household fishing and preservation remain available without a discovery; sold output grants no simultaneous local protection.'
  };
})();
