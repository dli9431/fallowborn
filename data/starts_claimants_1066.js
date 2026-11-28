FB.bookmarkSources.stage({"source":"data/starts_claimants_1066.js","bookmarks":["1066"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_claimants_1066 = [
  { id:'harold_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'england_1066', governmentForm:'territorial', fixedProvinceId:'london',
    characterName:'Harold Godwinson', sex:'m', startCulture:'english', startReligion:'catholic',
    name:'Harold Godwinson of England', desc:'You wear England’s crown at London in 1066. William of Normandy and Harald of Norway both claim it.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 44 · existing court family', desc:'Your court’s relatives and households, generated for this start. Your brothers Gyrth and Leofwine are not among them.' } },
    onboarding:'ruler',
    intro:'You were crowned king in January. William of Normandy and Harald of Norway both claim your crown. Review Rank & Realm, then decide where to meet them.' },
  { id:'william_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'normandy', governmentForm:'territorial', fixedProvinceId:'rouen',
    characterName:'William the Bastard', sex:'m', startCulture:'norman', startReligion:'catholic',
    name:'William of Normandy', desc:'You rule Normandy under the French crown. You and Harald of Norway both claim the crown that Harold Godwinson wears in England.',
    tier:5, profession:'noble', gold:100, prestige:120, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 38 · existing court family', desc:'Your court’s relatives and households, generated for this start. Matilda of Flanders and your son Robert are not among them.' } },
    onboarding:'ruler',
    intro:'You are William the Bastard, duke of Normandy under the French crown. Harold Godwinson was crowned king of England in January, and you and Harald of Norway both claim his crown. Taking it means paying for a war across the Channel. Review Rank & Realm, then decide whether and when to cross.' },
  { id:'harald_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'norway_1066', governmentForm:'territorial', fixedProvinceId:'trondheim',
    characterName:'Harald Hardrada', sex:'m', startCulture:'norse', startReligion:'catholic',
    name:'Harald Hardrada of Norway', desc:'You rule Norway from Trondheim. You and William of Normandy both claim the crown that Harold Godwinson wears in England.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 51 · existing court family', desc:'Your court’s relatives and households, generated for this start. Your wife Elisiv and your sons Magnus and Olaf are not among them.' } },
    onboarding:'ruler',
    intro:'You are Harald Hardrada, king of Norway. Harold Godwinson was crowned king of England in January, and you and William of Normandy both claim his crown. An invasion across the North Sea must be paid for while Norway still needs governing. Review Rank & Realm, then decide whether and when to sail.' },
  { id:'thegn_household_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    fixedProvinceId:'york', startCulture:'english', startReligion:'catholic', startAge:30,
    name:'York Thegn Household', desc:'An invented lesser landholding family at York. Keep a livelihood, consider voluntary civilian work and decide where to spend an uncertain autumn.',
    tier:2, profession:'noble', gold:40, prestige:20, piety:5,
    startEffects:{ landPlots:1 }, familyPresets:{ established:{} },
    tracks:['thegn_track_1066'], trackLocations:{ thegn_track_1066:['york'] },
    intro:'You are {name}, a lesser landholder of {province}. Your family has a small private plot and a household to maintain. Local work, stores and the road south offer choices as the year advances. Open your household story in Deeds to decide which commitments you can afford.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_claimants_1066);
});
