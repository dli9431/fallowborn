/* A fictional farming household in the Spring 1241 world. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_1241 = [
  { id:'hungarian_village_household_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    fixedProvinceId:'szekesfehervar', startCulture:'magyar', startReligion:'catholic', startAge:24,
    name:'A Farm in the Royal Heartland',
    desc:'A fictional farming household in Székesfehérvár county. Tend your plot, consider current affairs and weigh a personal journey to Bratislava.',
    tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
    startEffects:{ landPlots:1 }, familyPresets:{ standard:{} },
    tracks:['hungarian_village_track_1241','opening_hungarian_village_1241'],
    trackLocations:{ hungarian_village_track_1241:['szekesfehervar'], opening_hungarian_village_1241:['szekesfehervar'] },
    intro:'You are {name}, a farmer of {province}. Your household has a small plot and its own daily needs. Open your household story in Deeds to consider work, present obligations and a journey ahead on your own.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_1241);
