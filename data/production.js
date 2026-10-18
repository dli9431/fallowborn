/* Finite batch catalogues are opt-in. No historical stock or plant is inferred. */
(function () {
  'use strict';
  FBDATA.productionGoods = {
    heating_fuel:{name:'Prepared heating fuel',unit:'fuel_bundle',mass:1,
      desc:'Finite prepared fuel from an actual declared producer or owned lot. No historical supply or automatic opening stock is inferred.'}
  };
  FBDATA.productionRecipes = {};
})();
