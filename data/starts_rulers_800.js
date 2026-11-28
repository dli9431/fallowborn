FB.bookmarkSources.stage({"source":"data/starts_rulers_800.js","bookmarks":["800"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing Carolingian courts, with residence distinct from public capitals. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_800 = [
  { id:'charlemagne_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'carolingian_800', governmentForm:'territorial', fixedProvinceId:'roma',
    characterName:'Charlemagne', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Charlemagne at Rome',
    desc:'You are Charlemagne, newly crowned emperor, in Pope Leo III’s city of Rome. Your capital is Aachen, and the inheritance among your sons is still to be settled.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 52 · existing court family',
      desc:'Your son Charles is in your household. Your daughters are not in this start.' } },
    onboarding:'ruler', tracks:['charlemagne_agenda_800'],
    trackLocations:{ charlemagne_agenda_800:['roma'] },
    intro:'You are Charlemagne in Rome, crowned emperor on Christmas Day. Your capital is Aachen, and Pope Leo III keeps Rome. Your son Charles is with you, while your sons Louis and Pippin rule Aquitaine and Italy. Open your court agenda in Deeds.' },
  { id:'louis_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'aquitaine', governmentForm:'territorial', fixedProvinceId:'bordeaux',
    characterName:'Louis', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Louis at Bordeaux',
    desc:'You are Louis, ruling Aquitaine from Bordeaux under your father Charlemagne. Your southern frontier faces the Emirate of Córdoba.',
    tier:6, profession:'noble', gold:90, prestige:120, piety:15,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 22 · existing court family',
      desc:'Your household holds your sons Lothair and Pippin and a wife invented for this campaign.' } },
    onboarding:'ruler', tracks:['louis_agenda_800'],
    trackLocations:{ louis_agenda_800:['bordeaux'] },
    intro:'You are Louis, ruling Aquitaine from Bordeaux. Your father Charlemagne, newly crowned emperor, is your overlord. Your sons Lothair and Pippin live with you, and Barcelona lies across your southern frontier. Open your court agenda in Deeds.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_rulers_800);
});
