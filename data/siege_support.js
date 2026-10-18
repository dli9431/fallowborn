/* Optional equipment configurations. Ordinary sieges require no equipment profile. */
(function () {
  'use strict';
  FBDATA.siegeSupportProfiles = {};
  FBDATA.techImpactReviews.features.finite_siege_carriage = {
    mode:'none',
    rationale:'Carrying and consuming already paid equipment is ordinary provisioning. Optional equipment configurations declare their own technology and ordinary siege fallback.'
  };
})();
