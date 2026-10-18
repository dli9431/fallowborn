/* Dimensionless farm allocations, not additional harvests or historical inventories. */
FBDATA.productionGoods_seasonal_pasture = {
  parent_farm_allocation:{
    name:'Allocated farm output', unit:'farm_allocation_units', mass:1,
    desc:'An actual staffed parent farm’s diverted share, already removed from its ordinary output and proceeds.'
  },
  pasture_provisions:{
    name:'Pasture provisions', unit:'pasture_provision_units', mass:1, provisionUnits:1,
    desc:'Prepared allocated farm output. One owned finite lot may be stored, used or sold, with no simultaneous population benefit.'
  }
};
FBDATA.productionRecipes_seasonal_pasture = {
  prepare_pasture_allocation:{
    name:'Prepare allocated pasture output',
    desc:'Prepare one existing farm allocation into at most one provision unit with paid work during the lawful local season.',
    inputs:[{goodId:'parent_farm_allocation',quantity:1}],
    outputs:[{goodId:'pasture_provisions',quantity:1}],
    workDays:1, workPrice:2, requiresTech:[], impactReviewId:'seasonal_parent_farm'
  }
};
(function () {
  'use strict';
  ['productionGoods','productionRecipes'].forEach(function (root) {
    var additions=FBDATA[root+'_seasonal_pasture'];
    Object.keys(additions).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(FBDATA[root],id))
        throw new Error('Duplicate seasonal pasture production: ' + id);
      FBDATA[root][id]=JSON.parse(JSON.stringify(additions[id]));
    });
  });
  // Only a declared actual farm can supply this typed share. No bookmark is enrolled here.
  FBDATA.enterpriseMechanics.field_strip.typedProduction = {
    parent_farm_allocation:{marketGoodId:'provisions',marketUnits:12}
  };
  FBDATA.productionProducerProfiles.shieling_parent_allocation = {
    enterpriseType:'field_strip', goodId:'parent_farm_allocation', marketGoodId:'provisions',
    marketUnits:12, share:1, maxQuantity:1
  };
  FBDATA.buildingSeasonProfiles.shieling_summer = {
    seasonKinds:['summer'], periodDays:90, maxDays:90, care:true,
    stockLives:[{goodId:'parent_farm_allocation',days:10},{goodId:'pasture_provisions',days:30}],
    benefit:null
  };
})();
