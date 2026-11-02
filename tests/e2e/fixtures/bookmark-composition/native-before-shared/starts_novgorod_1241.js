/* A fictional local household, separate from the city's princely office. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_novgorod_1241 = [
  { id:'novgorod_household_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    fixedProvinceId:'novgorod', startCulture:'rus', startReligion:'orthodox', startAge:24,
    name:'Novgorod artisan household',
    desc:'Keep a craft household going in Novgorod while uncertain reports arrive from the western roads.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ standard:{} },
    tracks:['novgorod_household_track_1241','opening_novgorod_1241'],
    trackLocations:{ novgorod_household_track_1241:['novgorod'], opening_novgorod_1241:['novgorod'] },
    intro:'You are {name}, an artisan of {province}. There is work to find and a household to support. Open your household story in Deeds to weigh customers, news and your own plans while the city’s public affairs remain in other hands.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_novgorod_1241);
FBDATA.bookmarks['1241'].startLocations.novgorod_household_1241 = ['novgorod'];
