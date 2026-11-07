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
    },
    london_market_levy:{
      schema:1, motionId:'london_market_levy', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'license', fee:3,
      permitDays:90, durationDays:360, transitionDays:30,
      exemptions:[{kind:'home_province', id:'london', fee:0, permission:true}],
      voting:{town:{quorum:0.5, threshold:0.5, days:30,
        members:[{id:'traders', kind:'guild', weight:2},{id:'notables', kind:'notable', weight:1}]},
        estates:{quorum:0.08, threshold:0.5, days:40}}
    },
    london_market_restriction:{
      schema:1, motionId:'london_market_restriction', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'prohibition', fee:0,
      permitDays:90, durationDays:180, transitionDays:30, exemptions:[],
      voting:{town:{quorum:0.5, threshold:0.5, days:30,
        members:[{id:'traders', kind:'guild', weight:2},{id:'notables', kind:'notable', weight:1}]},
        estates:{quorum:0.08, threshold:0.5, days:40}}
    }
  };
})();
