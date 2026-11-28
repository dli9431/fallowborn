FB.bookmarkSources.stage({"source":"data/starts_valencia_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Adopt the existing Valencian court and its single authored household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_valencia_1096 = [
  { id:'rodrigo_diaz_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'valencia_1096', governmentForm:'territorial', fixedProvinceId:'valencia',
    characterName:'Rodrigo Diaz', sex:'m', startCulture:'iberian', startReligion:'catholic',
    name:'Rodrigo Diaz in Valencia',
    desc:'Hold Valencia, the city you took in 1094, with Jimena and your children, against the Almoravids to the south.',
    tier:4, profession:'noble', gold:80, prestige:80, piety:10,
    familyPresets:{ standard:{ name:'The Valencian household', diff:'about age 48 · named court family',
      desc:'You, your wife Jimena, your son Diego and your daughters Cristina and Maria.' } },
    tracks:['valencia_agenda_1096','valencia_opening_profile_1096'],
    trackLocations:{ valencia_agenda_1096:['valencia'], valencia_opening_profile_1096:['valencia'] },
    onboarding:'ruler',
    intro:'You are Rodrigo Diaz, lord of Valencia since you took the city in June 1094. Jimena and your children live with you, most of the city’s people are Muslims, and the Almoravids hold the lands to the south. Open your court agenda in Deeds.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_valencia_1096);
FBDATA.bookmarks['1096'].startLocations.rodrigo_diaz_1096 = ['valencia'];
});
