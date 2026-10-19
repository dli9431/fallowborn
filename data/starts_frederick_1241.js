window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_frederick_1241 = [
  { id:'frederick_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'hre_1241', governmentForm:'territorial', fixedProvinceId:'ravenna',
    characterName:'Frederick II', sex:'m', startCulture:'german', startReligion:'catholic',
    name:'Frederick II outside Faenza',
    desc:'Review an Italian campaign, the resources of your crowns and the dispute with Gregory IX. Choose which obligations your court can sustain.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    tracks:['frederick_agenda_1241','opening_frederick_1241'],
    familyPresets:{ standard:{ name:'Existing imperial family', diff:'age 47 · married, family living apart',
      desc:'Isabella and her young children live in the southern kingdom. Conrad remains in Germany. Their separate residences and your existing marriage are preserved.' } },
    onboarding:'ruler',
    intro:'You are Frederick II, at a camp near Faenza. Frankfurt remains the administrative anchor of your court. Isabella lives apart from you with Henry and Margaret, while Conrad remains in Germany. Review the funds and lands you actually hold, the Italian opposition and the existing papal dispute. The announced council and the campaign’s eventual outcome remain unsettled.' }
];
Array.prototype.push.apply(FBDATA.startScenarios,FBDATA.startScenarios_frederick_1241);
/* The retained baseline has no camp/family reconstruction. The date-owned
   revision loaded after the start catalogue enables this ruler there. */
FBDATA.bookmarks['1241'].startLocations.frederick_1241 = [];
