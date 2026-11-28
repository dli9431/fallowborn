FB.bookmarkSources.stage({"source":"data/starts_alexander_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Select the original princely son without adopting his father's realm. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_alexander_1241 = [
  { id:'alexander_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    name:'Alexander at Pereslavl',
    desc:'You are Alexander Yaroslavich, back at Pereslavl with your mother and wife after a quarrel with Novgorod. The city may yet ask you to return.',
    fixedProvinceId:'rostov', characterName:'Alexander Yaroslavich', sex:'m',
    startCulture:'rus', startReligion:'orthodox', startAge:20,
    existingPerson:{ realmId:'vladimir_1241', memberId:'alexander',
      householdMemberIds:['alexander','feodosia','alexander_wife'] },
    tier:2, profession:'soldier', gold:25, prestige:10, piety:0,
    familyPresets:{ standard:{} },
    tracks:['alexander_household_1241','opening_alexander_1241'],
    trackLocations:{ alexander_household_1241:['rostov'], opening_alexander_1241:['rostov'] },
    intro:'You are Alexander Yaroslavich, at Pereslavl-Zalessky with your mother and wife after a quarrel drove you from Novgorod. Your father Yaroslav rules as grand prince from Vladimir. Open your story in Deeds to settle the household and answer Novgorod if it sends for you.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_alexander_1241);
});
