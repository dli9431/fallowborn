/* Adopt the existing Valencian court and its single authored household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_valencia_1096 = [
  { id:'rodrigo_diaz_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'valencia_1096', governmentForm:'territorial', fixedProvinceId:'valencia',
    characterName:'Rodrigo Diaz', sex:'m', startCulture:'iberian', startReligion:'catholic',
    name:'Rodrigo Diaz in Valencia',
    desc:'Govern Valencia with Jimena and their children. Weigh household affairs, local administration and paid defense in a city already held.',
    tier:4, profession:'noble', gold:80, prestige:80, piety:10,
    familyPresets:{ standard:{ name:'The Valencian household', diff:'about age 48 · named court family',
      desc:'Adopt Rodrigo, Jimena, Diego, Cristina and Maria. Their working ages and shared Valencian residence are simulation choices.' } },
    tracks:['valencia_agenda_1096','valencia_opening_profile_1096'],
    trackLocations:{ valencia_agenda_1096:['valencia'], valencia_opening_profile_1096:['valencia'] },
    onboarding:'ruler',
    intro:'You are Rodrigo Diaz, ruling from Valencia with your existing household. The map represents the city’s lordship by one county; it also covers places outside Rodrigo’s historical control, including Murviedro. Review your family, funds and government, then choose your own priorities in Deeds. Your choices and ordinary campaigns determine what follows.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_valencia_1096);
FBDATA.bookmarks['1096'].startLocations.rodrigo_diaz_1096 = ['valencia'];
