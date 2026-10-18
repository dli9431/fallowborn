/* Maintained plants produce only through finite paid recipes. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildings_early_industry = {
  paper_workshop:{
    name:'Paper Workshop', icon:'??', role:'industry', aiBuildOrder:30,
    cost:65, upkeep:1, devMin:4, maxCounty:1, settlementDraw:false,
    requiresTech:'paper_making', applicability:{yearMin:800,countyIds:['baghdad']},
    productionRecipeIds:['workshop_papermaking'],
    desc:'A maintained workshop turns actual fiber and water into paper through paid batches. Needs a declared supplied site, available work and a funded buyer; grants no passive income or research.'
  },
  bloomery_smithy:{
    name:'Bloomery and Smithy', icon:'?', role:'industry', aiBuildOrder:31,
    cost:35, upkeep:1, devMin:1, maxCounty:1, settlementDraw:false,
    requiresTech:'bloomery_iron', applicability:{yearMin:650,yearMax:1300},
    productionRecipeIds:['bloomery_smelting','smithy_forging'],
    desc:'Paid smelting consumes actual ore and fuel; separate forging can use supplied iron and fuel. Finite output may be sold once to a funded buyer. Imports imply no local mine, soldiers or equipment grant.'
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.buildings_early_industry).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id)) throw new Error('Duplicate industrial building: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildings_early_industry[id]));
  });
})();
