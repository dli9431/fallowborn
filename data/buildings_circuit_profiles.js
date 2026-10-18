/* One selected county fort, with canonical level values and no opening inventory. */
window.FBDATA = window.FBDATA || {};
FBDATA.buildingProfiles_circuit_profiles = {
  urban_circuit:{
    buildingId:'walls', name:'Masonry Circuit',
    desc:'Masonry circuit works occupy one county fort position. Sequential level-one and level-two projects use the ordinary fort prices, work, duration and strategic values. Existing circuits remain repairable after the construction window ends.',
    replace:{}, requiresTech:['masonry_circuits'],
    techImpactReview:'masonry_circuit_construction',
    applicability:{yearMin:476,yearMax:649,eras:['late_antique']},
    inheritance:'retain'
  }
};
(function () {
  'use strict';
  Object.keys(FBDATA.buildingProfiles_circuit_profiles).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildingProfiles,id) ||
        Object.prototype.hasOwnProperty.call(FBDATA.fortProfiles,id))
      throw new Error('Duplicate circuit profile: ' + id);
    FBDATA.buildingProfiles[id] = FBDATA.buildingProfiles_circuit_profiles[id];
    FBDATA.fortProfiles[id] = {
      material:'masonry', levels:{'1':[],'2':[]},
      techImpactReview:'masonry_circuit_construction'
    };
  });
})();
