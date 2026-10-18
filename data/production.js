/* Finite batch catalogues are opt-in. No historical stock or plant is inferred. */
(function () {
  'use strict';
  FBDATA.productionGoods = {
    heating_fuel:{name:'Prepared heating fuel',unit:'fuel_bundle',mass:1,
      desc:'Finite prepared fuel from an actual declared producer or owned lot. No historical supply or automatic opening stock is inferred.'},
    boathouse_timber:{name:'Boat-work timber',desc:'Finite owned timber for maintained boat work.',unit:'timber_units',mass:1},
    boathouse_cordage:{name:'Boat-work cordage',desc:'Finite owned cordage for maintained boat work.',unit:'cordage_units',mass:1},
    boathouse_work:{name:'Prepared boat work',desc:'Actual completed paid work, reserved only once toward an ordinary enterprise invoice.',unit:'boat_work_units',mass:1}
  };
  FBDATA.productionRecipes = {
    prepare_boathouse_work:{
      name:'Prepare boat timber and cordage',
      desc:'Spend owned timber and cordage plus one paid action day to prepare a finite boat-work contribution. This creates no enterprise or boat.',
      inputs:[{goodId:'boathouse_timber',quantity:2},{goodId:'boathouse_cordage',quantity:1}],
      outputs:[{goodId:'boathouse_work',quantity:1}],
      workDays:1,workPrice:6,requiresTech:[],impactReviewId:'conserved_production_batches'
    }
  };
})();
