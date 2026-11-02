/* A fictional household already living in western Volhynia. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_kyiv_refugees_1241 = [
  { id:'kyiv_refugee_household_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    fixedProvinceId:'volodymyr', startCulture:'rus', startReligion:'orthodox', startAge:24,
    name:'Household from Kyiv',
    desc:'Already in Volodymyr after leaving the Kyiv region, a fictional craft household seeks customers and weighs staying or a personal visit to Lutsk.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{ diff:'age 24 · generated spouse and young children' } },
    tracks:['kyiv_refugee_track_1241','opening_kyiv_refugees_1241'],
    trackLocations:{ kyiv_refugee_track_1241:['volodymyr'], opening_kyiv_refugees_1241:['volodymyr'] },
    intro:'You are {name}, a craft worker now living in {province}. Your household has already left the Kyiv region after the city’s fall. Today you need customers and a workable home. Open your household story in Deeds to take stock, seek work or consider a visit to Lutsk.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_kyiv_refugees_1241);
FBDATA.bookmarks['1241'].startLocations.kyiv_refugee_household_1241 = ['volodymyr'];
