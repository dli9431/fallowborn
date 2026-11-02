/* A fictional Cologne household considering an ordinary personal pilgrimage. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_pilgrim_1096 = [
  { id:'pilgrim_household_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    fixedProvinceId:'cologne', startCulture:'german', startReligion:'catholic', startAge:30,
    name:'Cologne Pilgrim Household',
    desc:'An established craft household weighing work, savings and a personal pilgrimage. You begin at home with no expedition membership or vow.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['pilgrim_household_track_1096','opening_pilgrim_1096'],
    trackLocations:{ pilgrim_household_track_1096:['cologne'], opening_pilgrim_1096:['cologne'] },
    intro:'You are {name}, a craft worker of {province}. Your household needs a living whether you stay or consider a pilgrimage. Open your household story in Deeds to review work, savings and a journey ahead on your own.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_pilgrim_1096);
FBDATA.bookmarks['1096'].startLocations.pilgrim_household_1096 = ['cologne'];
