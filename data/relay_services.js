/* Optional provisions services. Physical stock and movement have separate owners. */
(function () {
  'use strict';
  FBDATA.relayServiceProfiles = {};
  FBDATA.techImpactReviews.features.finite_relay_provisions = {
    mode:'none',
    rationale:'Collecting consented existing provisions at an actually reached stop adds no transport or communication technology. Ordinary routes, crossings and military supply retain their own requirements.'
  };
})();
