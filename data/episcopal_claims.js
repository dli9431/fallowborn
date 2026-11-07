/* Optional compositions of an existing institutional settlement rent. */
(function () {
  'use strict';
  FBDATA.episcopalClaims = {
    roman_temporal_rent:{ name:'Episcopal rent claims',
      desc:'This review concerns an existing temporal settlement rent, not every church building or a private estate claim.',
      bookmarkId:'1204', provinceId:'roma', realmId:'papacy_1204',
      yearMin:1198, yearMax:1216, recurringShare:0.10, compensation:12,
      termSeasons:4, offerDays:30, possessorPolicy:'contest', enforcementPolicy:'reject' }
  };
})();
