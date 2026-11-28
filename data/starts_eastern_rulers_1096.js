FB.bookmarkSources.stage({"source":"data/starts_eastern_rulers_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Each beginning adopts its single seeded eastern incumbent and household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_eastern_rulers_1096 = [
  { id:'alexios_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'byzantium_1096', governmentForm:'administrative_monarchy', fixedProvinceId:'constantinople',
    characterName:'Alexios I Komnenos', sex:'m', startCulture:'greek', startReligion:'orthodox',
    name:'Alexios at Constantinople', desc:'Rule the empire from Constantinople in 1096, with Kilij Arslan at Nicaea across the Bosporus and western armies on the road east.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The Komnenian household', diff:'age 39 · named court family',
      desc:'Your wife Irene Doukaina and six of your children live with you in the capital. Your daughter Theodora is not in this start.' } },
    tracks:['alexios_agenda_1096','opening_alexios_1096'],
    trackLocations:{ alexios_agenda_1096:['constantinople'], opening_alexios_1096:['constantinople'] }, onboarding:'ruler',
    intro:'You are Alexios I Komnenos, emperor at Constantinople. Kilij Arslan rules Nicaea across the Bosporus, and armies answering the pope’s call are marching toward your lands. Your governors and treasury must hold the empire together. Open your court agenda in Deeds.' },
  { id:'kilij_arslan_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'rum_1096', governmentForm:'territorial', fixedProvinceId:'nicaea',
    characterName:'Kilij Arslan I', sex:'m', startCulture:'turkic', startReligion:'sunni',
    name:'Kilij Arslan at Nicaea', desc:'Rule the Sultanate of Rum from Nicaea in 1096, between the empire across the Bosporus and rival Turkish courts to the east.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The Nicaean ruler', diff:'working age 17 · no seeded consort',
      desc:'You rule alone at seventeen. Your wife and children are not in this start.' } },
    tracks:['rum_agenda_1096','opening_rum_1096'],
    trackLocations:{ rum_agenda_1096:['nicaea'], opening_rum_1096:['nicaea'] }, onboarding:'ruler',
    intro:'You are Kilij Arslan I, the young Seljuk ruler at Nicaea. Alexios rules across the Bosporus, the Danishmendid court contests the east, and western armies are on the road toward you. Open your court agenda in Deeds.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_eastern_rulers_1096);
});
