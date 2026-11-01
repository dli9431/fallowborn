/* A fictional craft household in the Spring 568 world. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_568_ravenna = [
  { id:'ravenna_household_568', bookmarkIds:['568'], alwaysUnlocked:true,
    fixedProvinceId:'ravenna', startCulture:'roman', startReligion:'nicene', startAge:30,
    name:'Ravenna Artisan Household',
    desc:'An established craft household in imperial Ravenna. Find customers, tend the household and consider a personal visit to Bononia.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['ravenna_household_track_568','opening_ravenna_568'],
    trackLocations:{ ravenna_household_track_568:['ravenna'], opening_ravenna_568:['ravenna'] },
    intro:'You are {name}, an artisan of {province}. Your family needs customers and enough money for the next purchase. Open your household story in Deeds to weigh work, household supplies and a journey ahead on your own.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_568_ravenna);
FBDATA.bookmarks['568'].startLocations.ravenna_household_568 = ['ravenna'];
