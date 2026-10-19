/* The fictional household and bounded Mainz shelter use a fresh world revision.
   Retained campaigns keep their original institutions, people and story list. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_mainz_1096 = [
  { id:'mainz_jewish_household_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    fixedProvinceId:'mainz', startCulture:'ashkenazi', startReligion:'jewish', startAge:30,
    name:'Mainz Jewish Craft Household',
    desc:'Work, family and communal life in Mainz. Consider an exact, finite shelter offer without any promise of safety or a predetermined attack.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['mainz_household_track_1096','mainz_party_1096','opening_mainz_1096'],
    trackLocations:{ mainz_household_track_1096:['mainz'], mainz_party_1096:['mainz'], opening_mainz_1096:['mainz'] },
    intro:'You are {name}, a craft worker of Mainz. Your family and community have a life beyond danger. Review ordinary work and household plans in Deeds. Any refuge needs each person’s consent, actual local permission and an explicit entry.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_mainz_1096);
