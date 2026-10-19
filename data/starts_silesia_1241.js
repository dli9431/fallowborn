/* Adopt the existing Silesian ducal court and its declared household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_silesia_1241 = [
  { id:'henry_pious_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'silesia_1241', governmentForm:'territorial', fixedProvinceId:'wroclaw',
    characterName:'Henry II the Pious', sex:'m', startCulture:'slavic', startReligion:'catholic',
    name:'Henry the Pious: the Silesian court',
    desc:'Govern the Silesian and Krakow holdings from Wroclaw. Weigh family responsibilities, public resources and the uncertain roads beyond your lands.',
    tier:5, profession:'noble', gold:80, prestige:100, piety:20,
    familyPresets:{ standard:{ name:'The existing ducal household', diff:'Age 41 · named court family',
      desc:'Anna and the declared children belong to the existing court. Their approximate ages and Wroclaw residence are simulation choices.' } },
    tracks:['silesia_agenda_1241','opening_silesia_1241'],
    trackLocations:{ silesia_agenda_1241:['wroclaw'], opening_silesia_1241:['wroclaw'] },
    onboarding:'ruler',
    intro:'You are Henry II the Pious. Your ducal court holds Silesian and Krakow lands, with Wroclaw as its home. Review your family and public obligations in Deeds, then decide which preparations and relationships deserve attention. Your future follows actual decisions, journeys and wars.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_silesia_1241);
FBDATA.bookmarks['1241'].startLocations.henry_pious_1241 = ['wroclaw'];
