/* Modest boat shelter and paid work use the existing maritime invoice owner. */
window.FBDATA = window.FBDATA || {};

FBDATA.buildings_boathouses = {
  boathouse:{
    role:'shipyard', aiBuildOrder:32, name:'Boathouse', icon:'🛶',
    cost:25, upkeep:1, devMin:0, maxCounty:1, coastal:true,
    settlementDraw:false, productionRecipeIds:['prepare_boathouse_work'], maritimeWorkProfileId:'boathouse_work',
    applicability:{yearMin:650,yearMax:1300,traditions:['nordic']},
    desc:'A modest maintained boat shelter and workspace. At an assigned lawful launching site, actual paid timber and cordage work can meet at most 10% of a fishing enterprise invoice. Remaining payment, staffing and enterprise knowledge still apply.'
  }
};

(function () {
  'use strict';
  Object.keys(FBDATA.buildings_boathouses).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Duplicate boathouse building: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildings_boathouses[id]));
  });
  FBDATA.techImpactReviews.features.building_boathouse = {
    mode:'none',
    rationale:'Basic boat shelter and maintained work need no discovery. Useful invoice contributions require a real licensed launching site, owned material and paid work; ordinary fishing-enterprise construction and optional advanced stages retain their existing knowledge, payment and staffing gates.'
  };
})();
