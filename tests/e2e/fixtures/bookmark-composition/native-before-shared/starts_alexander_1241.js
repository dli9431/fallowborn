/* Select the original princely son without adopting his father's realm. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_alexander_1241 = [
  { id:'alexander_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    name:'Alexander at Pereslavl',
    desc:'Begin as Alexander Yaroslavich with his mother and wife at northern Pereslavl. Weigh a later request from Novgorod or keep your present home.',
    fixedProvinceId:'rostov', characterName:'Alexander Yaroslavich', sex:'m',
    startCulture:'rus', startReligion:'orthodox', startAge:20,
    existingPerson:{ realmId:'vladimir_1241', memberId:'alexander',
      householdMemberIds:['alexander','feodosia','alexander_wife'] },
    tier:2, profession:'soldier', gold:25, prestige:10, piety:0,
    familyPresets:{ standard:{} },
    tracks:['alexander_household_1241','opening_alexander_1241'],
    trackLocations:{ alexander_household_1241:['rostov'], opening_alexander_1241:['rostov'] },
    intro:'You are Alexander Yaroslavich, at Pereslavl-Zalessky with your mother and wife after leaving Novgorod. Your father retains his principality. Open your story in Deeds to consider the household and a possible northern return.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_alexander_1241);
