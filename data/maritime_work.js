/* Maintained boat work is opt-in; worlds declare their actual licensed facilities. */
(function () {
  'use strict';
  FBDATA.maritimeWorkProfiles = {
    boathouse_work:{
      name:'Maintained boathouse work',
      desc:'Consume actual paid timber and cordage work at a licensed launching place toward the exact ordinary fishing invoice. Pay the remainder normally.',
      enterpriseType:'fishing_boat_business',recipeId:'prepare_boathouse_work',goodId:'boathouse_work',
      quantity:1,unitValue:6,invoiceShare:0.1,termDays:7
    }
  };
  FBDATA.techImpactReviews.features.maintained_maritime_work = {
    mode:'none',
    rationale:'Ordinary maintained boat work needs no discovery. A finite owned contribution uses actual paid production and launching permission; enterprise construction and advanced stages retain their existing technology gates.'
  };
})();
