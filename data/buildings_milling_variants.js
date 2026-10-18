/* Optional horizontal machinery. World authors supply actual compatible water sites. */
window.FBDATA = window.FBDATA || {};
FBDATA.siteResourceProfiles_milling_variants = {
  horizontal_mill_head:{
    name:'Horizontal mill water head',
    desc:'Finite local flow at a declared source with a usable gradient. No source or opening machine is inferred.',
    kind:'flow', unit:'water', capacity:4, periodDays:7
  }
};
FBDATA.buildingProfiles_milling_variants = {
  horizontal_mill:{
    buildingId:'mill', name:'Horizontal Watermill',
    desc:'A horizontal waterwheel grinds grain at a compatible water head. Paid water service supplies +1 tax and +3% population capacity for its funded term, replacing the ordinary mill benefits. Hand and animal grinding remain available.',
    replace:{cost:30,upkeep:0,devMin:1,tax:1,populationCapacity:0.03,dev:0,pop:0,prestige:0,aiBuildOrder:18},
    requiresTech:['water_power'], requiresTechMode:'replace',
    techImpactReview:'horizontal_milling',
    applicability:{yearMin:476,yearMax:1300},
    siteResourceProfile:'horizontal_mill_head', siteResourceSuitability:['source','gradient'],
    operationProfile:'horizontal_mill_service', inheritance:'retain'
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.siteResourceProfiles_milling_variants).forEach(function (id) {
    FBDATA.siteResourceProfiles[id] = FBDATA.siteResourceProfiles_milling_variants[id];
  });
  Object.keys(FBDATA.buildingProfiles_milling_variants).forEach(function (id) {
    FBDATA.buildingProfiles[id] = FBDATA.buildingProfiles_milling_variants[id];
  });
  FBDATA.buildingOperationProfiles.horizontal_mill_service = {
    mode:'use',amount:1,periodDays:7,workCost:1,effect:['tax','populationCapacity']
  };
  FBDATA.techImpactReviews.features.horizontal_milling = {
    mode:'hard',tech:['water_power'],
    fallback:'Ordinary hand and animal grinding remain available without a powered mill.',
    rationale:'Optional organized horizontal milling machinery requires Water Power. Current real water, compatible head, permission and funded work determine operation; inherited property and repair do not require new-construction knowledge.'
  };
})();
