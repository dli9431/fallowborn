FB.bookmarkSources.stage({"source":"data/starts_rulers_711.js","bookmarks":["711"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_711 = [
  { id:'roderic_711', bookmarkIds:['711'], alwaysUnlocked:true,
    rulerRealmId:'visigoths_711', governmentForm:'elective_monarchy', fixedProvinceId:'toledo',
    characterName:'Roderic', sex:'m', startCulture:'gothic', startReligion:'catholic',
    name:'Roderic at Toledo',
    desc:'Lead the existing Gothic court from its Toledo capital. The opening residence is a playable court abstraction; Roderic’s exact whereabouts are uncertain. Recognition and the southern campaign follow living choices.',
    tier:6, profession:'noble', gold:90, prestige:120, piety:15,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 36 · existing court family',
      desc:'Keep the existing court family. Unresearched relatives are generated campaign characters.' } },
    onboarding:'ruler', tracks:['roderic_agenda_711'],
    trackLocations:{ roderic_agenda_711:['toledo'] },
    intro:'You are Roderic at the Toledo court. This is a capital-based opening, not a claim about your precise location in spring 711. Your existing household and realm remain yours to govern. The northeastern Gothic court is separate, and any coastal campaign needs its own current decision and ordinary war.' },
  { id:'tariq_711', bookmarkIds:['711'], alwaysUnlocked:true,
    rulerRealmId:'tangier_711', governmentForm:'territorial', fixedProvinceId:'tangier',
    characterName:'Tariq ibn Ziyad', sex:'m', startCulture:'berber', startReligion:'umayyad_sunni_711',
    name:'Tariq at Tangier',
    desc:'Govern the existing Tangier command under Musa ibn Nusayr. The sovereign court owns the crossing opportunity; your choices here concern your local realm and household.',
    tier:5, profession:'noble', gold:65, prestige:80, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 36 · existing court family',
      desc:'Keep the existing court family. Unresearched relatives are generated campaign characters.' } },
    onboarding:'ruler', tracks:['tariq_agenda_711'],
    trackLocations:{ tariq_agenda_711:['tangier'] },
    intro:'You are Tariq ibn Ziyad at Tangier, serving under Musa ibn Nusayr in the existing realm hierarchy. Your court and family retain their ordinary obligations. The Umayyad sovereign, not your subordinate court, owns the crossing campaign. Review actual orders, travel and war through their ordinary controls.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_rulers_711);
});
