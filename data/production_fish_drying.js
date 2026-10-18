/* Dimensionless conservative simulation units, with no historical producer or inventory. */
FBDATA.productionGoods_fish_drying = {
  fresh_fish:{name:'Fresh fish',desc:'One typed fish lot diverted from actual staffed fishing output.',unit:'fish_units',mass:1},
  dried_provisions:{name:'Dried fish provisions',desc:'One preserved lot for one sale or finite local allocation.',unit:'provision_units',mass:1}
};
FBDATA.productionRecipes_fish_drying = {
  dry_fish:{
    name:'Dry fish',desc:'Two actual fish units become at most one preserved unit after a paid day of local work.',
    inputs:[{goodId:'fresh_fish',quantity:2}],outputs:[{goodId:'dried_provisions',quantity:1}],
    workDays:1,workPrice:2,requiresTech:[],impactReviewId:'baseline_fish_drying'
  }
};
(function () {
  'use strict';
  function append(target,source) {
    Object.keys(source).forEach(function(id){
      if (Object.prototype.hasOwnProperty.call(target,id)) throw new Error('Duplicate fish drying production id: '+id);
      target[id]=JSON.parse(JSON.stringify(source[id]));
    });
  }
  append(FBDATA.productionGoods,FBDATA.productionGoods_fish_drying);
  append(FBDATA.productionRecipes,FBDATA.productionRecipes_fish_drying);
  FBDATA.buildingSeasonProfiles.fish_drying_cool={
    seasonKinds:['cool_season'],periodDays:7,maxDays:7,care:false,
    stockLives:[{goodId:'fresh_fish',days:4},{goodId:'dried_provisions',days:30}],
    benefit:{goodId:'dried_provisions',quantity:1,effect:'populationFamineProtection',days:7}
  };
  FBDATA.enterpriseMechanics.fishing_boat_business.typedProduction =
    FBDATA.enterpriseMechanics.fishing_boat_business.typedProduction || {};
  FBDATA.enterpriseMechanics.fishing_boat_business.typedProduction.fresh_fish={marketGoodId:'provisions',marketUnits:12};
  FBDATA.productionProducerProfiles.fish_drying_catch={
    enterpriseType:'fishing_boat_business',goodId:'fresh_fish',marketGoodId:'provisions',marketUnits:12,share:0.5,maxQuantity:2
  };
})();
