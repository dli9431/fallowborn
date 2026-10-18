/* Optional maintained works. No historical source or asset is assigned here. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildings_waterworks = {
  aqueduct:{
    name:'Maintained Aqueduct', icon:'💧', role:'civic',
    cost:90, upkeep:2, devMin:4, maxCounty:1, settlementDraw:false,
    dev:0, pop:0, prestige:0, populationCapacity:0.03,
    requiresTech:'aqueduct_maintenance', aiBuildOrder:23,
    applicability:{yearMin:476,yearMax:649,eras:['late_antique'],traditions:['latin','byzantine']},
    operationProfile:'aqueduct_delivery',
    desc:'A maintained conduit with a lawful intake, gradient and connected destination. Capacity comes only from paid finite water delivery; construction creates no water or people. The construction window does not end inherited operation or repair.'
  },
  qanat_waterworks:{
    name:'Qanat Works', icon:'💧', role:'civic',
    cost:65, upkeep:1, devMin:2, maxCounty:1, settlementDraw:false,
    dev:0, pop:0, prestige:0, populationCapacity:0.03,
    requiresTech:'qanat_construction', aiBuildOrder:24,
    applicability:{yearMin:476,yearMax:1300,traditions:['persianate','islamic']},
    operationProfile:'qanat_delivery',
    desc:'Maintained underground groundwater works with a declared aquifer, gradient, lawful route and connected destination. Paid finite delivery supplies capacity; desert terrain and national knowledge create no source.'
  },
  urban_cisterns:{
    name:'Maintained Urban Cisterns', icon:'💧', role:'civic',
    cost:65, upkeep:1, devMin:4, maxCounty:1, settlementDraw:false,
    dev:0, pop:0, prestige:0, populationFamineProtection:0.05,
    requiresTech:'cistern_engineering', aiBuildOrder:25,
    applicability:{yearMin:476,yearMax:1300}, operationProfile:'cistern_service',
    desc:'Finite engineered storage receiving real lawful inflow or catchment water. Famine protection exists only during paid stored-water service; an empty basin protects nobody. Rain-fed storage needs no aqueduct.'
  }
};
FBDATA.buildingOperationProfiles_waterworks = {
  aqueduct_delivery:{mode:'use',amount:2,periodDays:30,workCost:2,effect:'populationCapacity',
    sourceRequirements:{originKind:'flow',originSuitability:['source','gradient'],minStores:1}},
  qanat_delivery:{mode:'use',amount:2,periodDays:30,workCost:2,effect:'populationCapacity',
    sourceRequirements:{originKind:'flow',originSuitability:['source','gradient','groundwater'],minStores:1}},
  cistern_service:{mode:'use',amount:2,periodDays:30,workCost:1,effect:'populationFamineProtection',
    sourceRequirements:{originKind:'flow',originSuitability:['source'],minStores:1}}
};
(function () {
  'use strict';
  Object.keys(FBDATA.buildings_waterworks).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id))
      throw new Error('Duplicate waterworks building: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildings_waterworks[id]));
  });
  Object.keys(FBDATA.buildingOperationProfiles_waterworks).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildingOperationProfiles,id))
      throw new Error('Duplicate waterworks operation: ' + id);
    FBDATA.buildingOperationProfiles[id] = JSON.parse(JSON.stringify(FBDATA.buildingOperationProfiles_waterworks[id]));
  });
})();
