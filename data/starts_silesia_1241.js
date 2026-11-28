FB.bookmarkSources.stage({"source":"data/starts_silesia_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Adopt the existing Silesian ducal court and its declared household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_silesia_1241 = [
  { id:'henry_pious_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'silesia_1241', governmentForm:'territorial', fixedProvinceId:'wroclaw',
    characterName:'Henry II the Pious', sex:'m', startCulture:'slavic', startReligion:'catholic',
    name:'Henry the Pious: the Silesian court',
    desc:'You are Henry II the Pious, ruling Silesia and Kraków from Wrocław. Mongol columns have entered Little Poland, and your family and treasury must carry the court through the spring.',
    tier:5, profession:'noble', gold:80, prestige:100, piety:20,
    familyPresets:{ standard:{ name:'The existing ducal household', diff:'Age 41 · named court family',
      desc:'Your wife Anna of Bohemia and your children Boleslaw, Mieszko, Elisabeth, Henry, Conrad and Wladyslaw live at Wrocław. Your mother Hedwig and several of your daughters are not in this start.' } },
    tracks:['silesia_agenda_1241','opening_silesia_1241'],
    trackLocations:{ silesia_agenda_1241:['wroclaw'], opening_silesia_1241:['wroclaw'] },
    onboarding:'ruler',
    intro:'You are Henry II the Pious, ruling Silesia and Kraków from Wrocław. Mongol columns have crossed into Little Poland, and your brother-in-law Wenceslas rules Bohemia to the south. Decide what your family, your treasury and your defense need first. Open your court agenda in Deeds to begin.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_silesia_1241);
FBDATA.bookmarks['1241'].startLocations.henry_pious_1241 = ['wroclaw'];
});
