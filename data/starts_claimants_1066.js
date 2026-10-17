window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_claimants_1066 = [
  { id:'harold_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'england_1066', governmentForm:'territorial', fixedProvinceId:'london',
    characterName:'Harold Godwinson', sex:'m', startCulture:'english', startReligion:'catholic',
    name:'Harold Godwinson of England', desc:'Rule England from its existing court. Manage the kingdom while rival courts pursue their own ambitions.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 44 · existing court family', desc:'Keep the court’s existing relatives and supporting households.' } },
    onboarding:'ruler',
    intro:'You are Harold Godwinson, king of England. Your court, treasury and counties are already yours to govern. Review Rank & Realm, raise forces through ordinary war controls and decide which commitments the kingdom can sustain.' },
  { id:'william_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'normandy', governmentForm:'territorial', fixedProvinceId:'rouen',
    characterName:'William the Bastard', sex:'m', startCulture:'norman', startReligion:'catholic',
    name:'William of Normandy', desc:'Govern Normandy under the French crown. Decide whether to seek power across the Channel through ordinary diplomacy and war.',
    tier:5, profession:'noble', gold:100, prestige:120, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 38 · existing court family', desc:'Keep the court’s existing relatives and supporting households.' } },
    onboarding:'ruler',
    intro:'You are William the Bastard, duke of Normandy. The French crown remains your liege, and your Norman court has its own land and obligations. England lies across the Channel. Pursuing it requires your own decisions, resources and campaigns.' },
  { id:'harald_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    rulerRealmId:'norway_1066', governmentForm:'territorial', fixedProvinceId:'trondheim',
    characterName:'Harald Hardrada', sex:'m', startCulture:'norse', startReligion:'catholic',
    name:'Harald Hardrada of Norway', desc:'Rule Norway from its existing Christian court. Weigh overseas ambitions against the needs of the kingdom.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 51 · existing court family', desc:'Keep the court’s existing relatives and supporting households.' } },
    onboarding:'ruler',
    intro:'You are Harald Hardrada, king of Norway. Your Christian court and Norwegian counties remain in your hands. An overseas ambition must compete with the cost of governing at home. Review your realm before committing its people and treasury.' },
  { id:'thegn_household_1066', bookmarkIds:['1066'], alwaysUnlocked:true,
    fixedProvinceId:'york', startCulture:'english', startReligion:'catholic', startAge:30,
    name:'York Thegn Household', desc:'An invented lesser landholding family at York. Keep a livelihood, consider voluntary civilian work and decide where to spend an uncertain autumn.',
    tier:2, profession:'noble', gold:40, prestige:20, piety:5,
    startEffects:{ landPlots:1 }, familyPresets:{ established:{} },
    tracks:['thegn_track_1066'], trackLocations:{ thegn_track_1066:['york'] },
    intro:'You are {name}, a lesser landholder of {province}. Your family has a small private plot and a household to maintain. Local work, stores and the road south offer choices as the year advances. Open your household story in Deeds to decide which commitments you can afford.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_claimants_1066);
