window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_crossing_711 = [
  { id:'crossing_soldier_711', bookmarkIds:['711'], alwaysUnlocked:true,
    fixedProvinceId:'tangier', startCulture:'berber', startReligion:'umayyad_sunni_711',
    startAge:24, sex:'m', tier:1, profession:'soldier', gold:20, prestige:5, piety:0,
    name:'Soldier at the Strait',
    desc:'An invented soldier household at Tangier. Consider the crossing, keep a local livelihood or make a personal journey as the courts pursue their own campaigns.',
    familyPresets:{ standard:{} },
    tracks:['crossing_soldier_track_711'], trackLocations:{ crossing_soldier_track_711:['tangier'] },
    intro:'You are {name}, a soldier of {province}. Your household needs a living while the courts weigh a campaign across the strait. Open your household story in Deeds to consider your own plans. Travel, work and the fortunes of the campaign will decide what is possible.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_crossing_711);
