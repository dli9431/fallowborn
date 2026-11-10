/* Optional operating terms. No opening campaign starts with an enacted law. */
(function () {
  'use strict';
  FBDATA.industryLaws = {
    constantinople_workshop_permission:{
      schema:1, motionId:'constantinople_workshop_permission', bookmarkId:'1066',
      provinceId:'constantinople', enterpriseType:'workshop_business',
      minYear:1066, maxYear:1081, mode:'license', fee:3,
      permitDays:60, durationDays:360, transitionDays:30,
      exemptions:[{kind:'guild', id:'craftsman', fee:0, permission:true}],
      relief:{days:30, chance:0.4}, offense:{id:'unlicensed_workshop', penalty:'suspension', amount:0, days:30}
    },
    london_stall_license:{
      schema:1, motionId:'london_stall_license', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'license', fee:2,
      permitDays:90, durationDays:360, transitionDays:30,
      exemptions:[{kind:'home_province', id:'london', fee:0, permission:true}],
      relief:{days:90, chance:0.5}, offense:{id:'unlicensed_stall', penalty:'fine', amount:8, closure:false}
    },
    london_market_levy:{
      schema:1, motionId:'london_market_levy', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'license', fee:3,
      permitDays:90, durationDays:360, transitionDays:30,
      exemptions:[{kind:'home_province', id:'london', fee:0, permission:true}],
      relief:{days:60, chance:0.4}, offense:{id:'unpaid_stall_levy', penalty:'fine', amount:12, closure:false},
      voting:{town:{quorum:0.5, threshold:0.5, days:30,
        members:[{id:'traders', kind:'guild', weight:2},{id:'notables', kind:'notable', weight:1}]},
        estates:{quorum:0.08, threshold:0.5, days:40}}
    },
    london_market_restriction:{
      schema:1, motionId:'london_market_restriction', bookmarkId:'1204',
      provinceId:'london', enterpriseType:'market_stall_business',
      minYear:1204, maxYear:1215, mode:'prohibition', fee:0,
      permitDays:90, durationDays:180, transitionDays:30, exemptions:[],
      relief:{days:30, chance:0.25}, offense:{id:'prohibited_stall', penalty:'fine', amount:16, closure:true},
      voting:{town:{quorum:0.5, threshold:0.5, days:30,
        members:[{id:'traders', kind:'guild', weight:2},{id:'notables', kind:'notable', weight:1}]},
        estates:{quorum:0.08, threshold:0.5, days:40}}
    }
  };
})();
