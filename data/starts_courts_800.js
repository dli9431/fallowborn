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
    desc:'Lead the Abbasid court from Raqqa. Govern the existing realm, whose public capital remains Baghdad, and weigh its commitments at home and abroad.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 34 · existing court family',
      desc:'Keep the existing court family. Unattested relatives are generated campaign characters.' } },
    onboarding:'ruler',
    intro:'You are Harun al-Rashid, ruling from Raqqa. Your household resides here while Baghdad remains the realm’s administrative capital. Your treasury, provincial officers and existing family are yours to manage. Foreign gifts and campaigns depend on living courts, funds and your own decisions.' },
  { id:'irene_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'byzantium', governmentForm:'administrative_monarchy', fixedProvinceId:'constantinople',
    characterName:'Irene', sex:'f', startCulture:'greek', startReligion:'orthodox',
    name:'Irene at Constantinople',
    desc:'Govern the eastern empire as its reigning sovereign. Manage the court and provinces while a rival imperial title emerges in the west.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 48 · existing court family',
      desc:'Keep the existing court family. Unattested relatives are generated campaign characters.' } },
    onboarding:'ruler',
    intro:'You are Irene, sovereign at Constantinople. Your court, provincial government and existing household remain in your hands. News and foreign approaches take their own course. Review Rank & Realm and decide how to govern the empire.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_courts_800);
