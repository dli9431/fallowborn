FB.bookmarkSources.stage({"source":"data/starts_courts_800.js","bookmarks":["800"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_courts_800 = [
  { id:'baghdad_copyist_800', bookmarkIds:['800'], alwaysUnlocked:true,
    fixedProvinceId:'baghdad', startCulture:'arabic', startReligion:'sunni', startAge:24,
    name:'Baghdad Copyist Household',
    desc:'An invented household making a modest living among Baghdad’s books. Compare copies, consider funded orders and choose between patronage and independent work.',
    tier:1, profession:'scholar', gold:12, prestige:0, piety:0,
    startEffects:{ careerRank:'apprentice', focus:'scholarly_work' },
    familyPresets:{ standard:{ name:'Copyist household', diff:'age 24 · young household',
      desc:'Begin with a generated family and an apprentice’s scholarly career.' } },
    tracks:['baghdad_copyist_track_800'], trackLocations:{ baghdad_copyist_track_800:['baghdad'] },
    intro:'You are {name} of {province}. Copying and checking Arabic texts can support a household, but orders need a willing payer and time at the desk. Open your household story in Deeds to review a small commission or choose your own work and study.' },
  { id:'harun_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'abbasid', governmentForm:'administrative_monarchy', fixedProvinceId:'raqqa',
    characterName:'Harun al-Rashid', sex:'m', startCulture:'arabic', startReligion:'sunni',
    name:'Harun al-Rashid at Raqqa',
    desc:'You are Harun al-Rashid, ruling the Abbasid Caliphate from Raqqa while Baghdad is its capital. An exchange of gifts with Charlemagne and a war in Anatolia may come within a few years.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 34 · existing court family',
      desc:'Your household at Raqqa is a family invented for this campaign. Your sons al-Amin and al-Ma’mun are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Harun al-Rashid, ruling from Raqqa, where your household lives. Baghdad remains the capital of your government. Your treasury and provincial officers are yours to direct. Begin in Rank & Realm to decide how to govern the Caliphate.' },
  { id:'irene_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'byzantium', governmentForm:'administrative_monarchy', fixedProvinceId:'constantinople',
    characterName:'Irene', sex:'f', startCulture:'greek', startReligion:'orthodox',
    name:'Irene at Constantinople',
    desc:'You are Irene, ruling Byzantium alone from Constantinople. Charlemagne has just been crowned emperor in Rome, a rival to your imperial title.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 48 · existing court family',
      desc:'Your household at Constantinople is a family invented for this campaign. Your historical relatives are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Irene, ruling Byzantium alone from Constantinople. Charlemagne’s coronation in Rome has raised a rival imperial title in the west. Your court and provincial officers answer to you. Begin in Rank & Realm to decide how to govern.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_courts_800);
});
