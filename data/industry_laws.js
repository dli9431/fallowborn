/* Optional operating terms. No opening campaign starts with an enacted law. */
(function () {
  'use strict';
  FBDATA.industryLaws = {
    london_stall_license:{
      schema:1, motionId:'london_stall_license', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'license', fee:2,
      permitDays:90, durationDays:360, transitionDays:30,
      exemptions:[{kind:'home_province', id:'london', fee:0, permission:true}]
    }
  };
})();
