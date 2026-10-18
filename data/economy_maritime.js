/* Compose requirements only; base enterprise display, costs and staffing stay owned by economy.js. */
window.FBDATA = window.FBDATA || {};

(function () {
  'use strict';
  var boat = FBDATA.enterprises.fishing_boat_business;
  boat.requiresTech = 'coastal_piloting';
  boat.upgrades[0].requiresTech = 'harbor_works';
  boat.upgrades[1].requiresTech = 'naval_levies';

  var reviews = FBDATA.techImpactReviews.features;
  reviews.commercial_fishing = {
    mode:'soft', tech:['coastal_piloting'],
    rationale:'Coastal piloting supports the optional paid commercial fishing enterprise. Ordinary household fishing remains baseline; neither a northern cargo hull nor a particular rudder is universal.'
  };
  reviews.decked_fishing_capacity = {
    mode:'hard', tech:['harbor_works'], fallback:'baseline_fishing_boat',
    rationale:'Optional decked capacity uses harbor works and ordinary paid expansion with two qualified staffing positions. The working unupgraded fishing boat remains available and completed levels remain owned.'
  };
  reviews.fishing_flotilla_organization = {
    mode:'hard', tech:['naval_levies'], fallback:'decked_fishing_boat',
    rationale:'Optional flotilla organization uses naval levies and ordinary paid expansion with three qualified staffing positions. A decked boat remains the fallback; this creates no fleet or free troops and retains completed levels.'
  };
  // The fishing levels now have distinct reviews; keep the other expansion gates.
  reviews.enterprise_upgrades.tech = reviews.enterprise_upgrades.tech.filter(function (id) {
    return id !== 'sternpost_rudder' && id !== 'dry_docks';
  });
  reviews.enterprise_upgrades.rationale = 'Other optional enterprise expansions retain their exact advanced-practice requirements, visible missing knowledge and working baseline. Completed levels remain grandfathered; the two fishing capacities have independent reviews.';
})();
