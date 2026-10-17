window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_york_wessex_867 = [
  { id:'aethelred_wessex_867', bookmarkIds:['867'], alwaysUnlocked:true,
    rulerRealmId:'wessex', governmentForm:'territorial', fixedProvinceId:'winchester',
    characterName:'Æthelred I', sex:'m', startCulture:'english', startReligion:'catholic',
    name:'Æthelred I of Wessex', desc:'Govern Wessex from its existing court. Balance the kingdom’s needs against the uncertain situation to the north.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 20 · existing court family', desc:'Keep the court’s generated relatives and supporting households.' } },
    onboarding:'ruler',
    intro:'You are Æthelred I, king of Wessex. Your existing court governs from Winchester. Review Rank & Realm, manage the kingdom’s resources and decide which diplomatic or military commitments it can sustain.' },
  { id:'york_household_867', bookmarkIds:['867'], alwaysUnlocked:true,
    fixedProvinceId:'york', startCulture:'english', startReligion:'catholic', startAge:24,
    name:'York Artisan Household', desc:'An invented household in occupied York. Keep your craft alive, consider a short repair order and decide whether to stay.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{
      standard:{ name:'Young artisan household', diff:'age 24 · parents and siblings' },
      established:{ name:'Established artisan household', diff:'age 24 · spouse and young children' }
    },
    tracks:['york_household_track_867'], trackLocations:{ york_household_track_867:['york'] },
    intro:'You are {name}, an artisan of {province}. Your household needs a livelihood under the current lord. Local repairs, ordinary bench work and the question of staying give you choices. Open your household story in Deeds to begin.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_york_wessex_867);
