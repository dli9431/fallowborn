FB.bookmarkSources.stage({"source":"data/starts_frederick_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_frederick_1241 = [
  { id:'frederick_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'hre_1241', governmentForm:'territorial', fixedProvinceId:'ravenna',
    characterName:'Frederick II', sex:'m', startCulture:'german', startReligion:'catholic',
    name:'Frederick II outside Faenza',
    desc:'You are Frederick II, in camp before Faenza while the Italian cities hold out against you. Pope Gregory IX, who excommunicated you in 1239, has called a council to Rome.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    tracks:['frederick_agenda_1241','opening_frederick_1241'],
    familyPresets:{ standard:{ name:'Existing imperial family', diff:'age 47 · married, family living apart',
      desc:'Your wife Isabella of England lives at Capua with your young children Henry and Margaret. Your son Conrad IV is in Germany, and your other sons are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Frederick II, in camp near Faenza, while your court’s seat stays at Frankfurt. Isabella lives apart from you with Henry and Margaret, and Conrad is in Germany. Gregory IX has excommunicated you and called a council to meet in Rome. Open your court agenda in Deeds to begin.' }
];
Array.prototype.push.apply(FBDATA.startScenarios,FBDATA.startScenarios_frederick_1241);
/* The retained baseline has no camp/family reconstruction. The date-owned
   revision loaded after the start catalogue enables this ruler there. */
FBDATA.bookmarks['1241'].startLocations.frederick_1241 = [];
});
