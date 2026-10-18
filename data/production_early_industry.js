/* Dimensionless conservative accounts, not historical yields or opening stocks. */
FBDATA.productionGoods_early_industry = {
  workshop_fiber:{name:'Prepared rag fiber',unit:'fiber_units',mass:1},
  bloomery_ore:{name:'Iron ore',unit:'ore_units',mass:1},
  workshop_fuel:{name:'Prepared charcoal',unit:'fuel_units',mass:1},
  bloomery_iron_lot:{name:'Workable iron',unit:'iron_units',mass:1},
  workshop_paper:{name:'Paper lot',unit:'paper_units',mass:1},
  smithy_tools:{name:'Forged tool lot',unit:'tool_units',mass:1}
};
FBDATA.productionRecipes_early_industry = {
  workshop_papermaking:{
    name:'Make a paper lot',desc:'Consumes two fiber units, one actual water allocation, two workdays and three processing gold.',
    inputs:[{goodId:'workshop_fiber',quantity:2}],outputs:[{goodId:'workshop_paper',quantity:1}],
    water:1,workDays:2,workPrice:3,requiresSale:true,requiresTech:['paper_making'],impactReviewId:'paper_batch_manufacture',
    fallback:'Ordinary household learning, manuscript copying and purchased writing materials remain available.'
  },
  bloomery_smelting:{
    name:'Smelt workable iron',desc:'Consumes two ore units, one fuel unit, one workday and two processing gold. Never supplies a mine.',
    inputs:[{goodId:'bloomery_ore',quantity:2},{goodId:'workshop_fuel',quantity:1}],outputs:[{goodId:'bloomery_iron_lot',quantity:1}],
    workDays:1,workPrice:2,requiresSale:true,requiresTech:['bloomery_iron'],impactReviewId:'bloomery_batch_smelting',
    fallback:'Ordinary hand work and purchased finished iron goods remain available.'
  },
  smithy_forging:{
    name:'Forge a tool lot',desc:'Consumes one supplied iron unit, one fuel unit, two workdays and four processing gold. Imported iron needs no local ore extraction.',
    inputs:[{goodId:'bloomery_iron_lot',quantity:1},{goodId:'workshop_fuel',quantity:1}],outputs:[{goodId:'smithy_tools',quantity:1}],
    workDays:2,workPrice:4,requiresSale:true,requiresTech:['bloomery_iron'],impactReviewId:'smithy_batch_forging',
    fallback:'Ordinary hand work and purchased finished tools remain available.'
  }
};
FBDATA.productionExchangeProfiles_early_industry = {
  paper_fiber_delivery:{goodId:'workshop_fiber',marketGoodId:'materials',basePrice:2,mode:'owned',quantityLimit:8,budget:40},
  paper_fiber_purchase:{goodId:'workshop_fiber',marketGoodId:'materials',basePrice:2,mode:'market',quantityLimit:8,budget:40},
  workshop_paper_sale:{goodId:'workshop_paper',marketGoodId:'materials',basePrice:12,mode:'market',quantityLimit:2,budget:40},
  bloomery_ore_purchase:{goodId:'bloomery_ore',marketGoodId:'materials',basePrice:2,mode:'market',quantityLimit:8,budget:40},
  workshop_fuel_purchase:{goodId:'workshop_fuel',marketGoodId:'materials',basePrice:2,mode:'market',quantityLimit:8,budget:40},
  smithy_iron_purchase:{goodId:'bloomery_iron_lot',marketGoodId:'materials',basePrice:5,mode:'market',quantityLimit:4,budget:40},
  bloomery_iron_sale:{goodId:'bloomery_iron_lot',marketGoodId:'materials',basePrice:10,mode:'market',quantityLimit:2,budget:40},
  smithy_tool_sale:{goodId:'smithy_tools',marketGoodId:'materials',basePrice:14,mode:'market',quantityLimit:2,budget:40}
};
(function () {
  'use strict';
  [['productionGoods',FBDATA.productionGoods_early_industry],['productionRecipes',FBDATA.productionRecipes_early_industry],
    ['productionExchangeProfiles',FBDATA.productionExchangeProfiles_early_industry]].forEach(function (entry) {
    Object.keys(entry[1]).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(FBDATA[entry[0]],id)) throw new Error('Duplicate industrial production declaration: ' + id);
      FBDATA[entry[0]][id] = JSON.parse(JSON.stringify(entry[1][id]));
    });
  });
  FBDATA.techImpactReviews.features.paper_batch_manufacture = {
    mode:'hard',tech:['paper_making'],
    rationale:'Optional organized paper manufacture needs papermaking knowledge as well as a physical supplied plant; learning and manuscript work remain independent.',
    fallback:'Ordinary household learning, manuscript copying and purchased writing materials remain available.'
  };
  FBDATA.techImpactReviews.features.bloomery_batch_smelting = {
    mode:'hard',tech:['bloomery_iron'],
    rationale:'Optional paid ore smelting needs bloomery knowledge; ordinary work and purchased finished material remain available.',
    fallback:'Ordinary hand work and purchased finished iron goods remain available.'
  };
  FBDATA.techImpactReviews.features.smithy_batch_forging = {
    mode:'hard',tech:['bloomery_iron'],
    rationale:'Optional paid tool forging needs ironworking knowledge independently of whether iron was imported or smelted locally.',
    fallback:'Ordinary hand work and purchased finished tools remain available.'
  };
})();
