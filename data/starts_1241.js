FB.bookmarkSources.stage({"source":"data/starts_1241.js","bookmarks":["1241"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Household and existing-court openings in the Spring 1241 world. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_1241 = [
  { id:'hungarian_village_household_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    fixedProvinceId:'szekesfehervar', startCulture:'magyar', startReligion:'catholic', startAge:24,
    name:'A Farm in the Royal Heartland',
    desc:'A fictional farming household in Székesfehérvár county. Tend your plot, consider current affairs and weigh a personal journey to Bratislava.',
    tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
    startEffects:{ landPlots:1 }, familyPresets:{ standard:{} },
    tracks:['hungarian_village_track_1241','opening_hungarian_village_1241'],
    trackLocations:{ hungarian_village_track_1241:['szekesfehervar'], opening_hungarian_village_1241:['szekesfehervar'] },
    intro:'You are {name}, a farmer of {province}. Your household has a small plot and its own daily needs. Open your household story in Deeds to consider work, present obligations and a journey ahead on your own.' },
  { id:'koten_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    originalPrincipal:{ realmId:'koten_following_1241', actorId:'koten_1241' },
    fixedProvinceId:'szekesfehervar', characterName:'Koten', sex:'m',
    startCulture:'turkic', startReligion:'catholic', startAge:61,
    name:'Koten under Guard',
    desc:'Begin as Koten, khan of the Cumans, held under guard at Obuda while your people are scattered across Hungary and the Mongols close in.',
    tier:1, profession:'soldier', gold:20, prestige:5, piety:0,
    familyPresets:{ standard:{ name:'The existing personal party', diff:'age 61 · no generated family', desc:'Only Koten himself. His wives, children and kin are not in this start.' } },
    tracks:['koten_safety_1241'], trackLocations:{ koten_safety_1241:['szekesfehervar'] },
    intro:'You are Koten, khan of the Cumans, held under guard at Obuda by King Bela’s court. Your people’s camps and fighters are spread across Hungary, out of your reach. Only the king’s court can release you. Open your personal review in Deeds.' },
  { id:'bela_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'hungary_1241', governmentForm:'territorial', fixedProvinceId:'szekesfehervar',
    characterName:'Bela IV', sex:'m', startCulture:'magyar', startReligion:'catholic',
    name:'Bela IV at Obuda', desc:'Lead the Hungarian crown from Obuda in spring 1241, as the Mongols break into Hungary and your nobles turn against the Cumans.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The royal household', diff:'age 35 · existing named family', desc:'Queen Maria Laskarina and your young son Stephen are at court. Your brother Coloman rules Slavonia.' } },
    tracks:['bela_agenda_1241','opening_bela_1241'], onboarding:'ruler',
    intro:'You are Bela IV, king of Hungary, holding court at Obuda with Queen Maria and your young son Stephen. Your nobles resent the Cumans you took in, and Batu’s Mongols are already through the Carpathian passes. Check your treasury and lands in Rank & Realm. Open your court agenda in Deeds.' },
  { id:'yaroslav_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'vladimir_1241', governmentForm:'territorial', fixedProvinceId:'suzdal',
    characterName:'Yaroslav Vsevolodovich', sex:'m', startCulture:'rus', startReligion:'orthodox',
    name:'Yaroslav at Vladimir', desc:'Rule Vladimir as grand prince three years after the Mongols burned it, while Novgorod weighs whether to take back your son Alexander.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The princely family', diff:'about age 50 · existing named family', desc:'Your wife Feodosia and your sons Alexander and Andrei. Alexander’s wife is a daughter of Bryachislav of Polotsk.' } },
    tracks:['yaroslav_agenda_1241','opening_yaroslav_1241'], onboarding:'ruler',
    intro:'You are Yaroslav Vsevolodovich, grand prince at Vladimir-on-the-Klyazma. The Mongol sack of 1238 still marks your lands, and your son Alexander has left Novgorod after quarrelling with the city. Check your treasury and lands in Rank & Realm. Open your court agenda in Deeds.' },
  /* The command's bound leader begins a private household; the command keeps
     its own public account, columns and commission from Ogodei. */
  { id:'batu_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'mongol_western_command_1241', governmentForm:'expedition_command', fixedProvinceId:'volodymyr',
    characterName:'Batu', sex:'m', startCulture:'mongol_1241', startReligion:'tengri',
    name:'Batu and the western command',
    desc:'Lead the Mongol western command from Volodymyr, with columns already deep in Poland and Hungary.',
    tier:1, profession:'soldier', gold:20, prestige:20, piety:0,
    familyPresets:{ standard:{ name:'The existing commander', diff:'about age 36 · existing commander', desc:'Batu alone. His wives and sons are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Batu, grandson of Genghis Khan, leading the western command under Ogodei’s commission. Your columns stand at Volodymyr, Krakow, Cluj and Gyula, each with its own food and fighters, and your own purse is kept apart from the command’s account. Every land you take must be won in the field. Open Mobile coalition in Deeds to review your commanders and supplies.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_1241);
});
