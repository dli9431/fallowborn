/* Each beginning adopts its single seeded eastern incumbent and household. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_eastern_rulers_1096 = [
  { id:'alexios_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'byzantium_1096', governmentForm:'administrative_monarchy', fixedProvinceId:'constantinople',
    characterName:'Alexios I Komnenos', sex:'m', startCulture:'greek', startReligion:'orthodox',
    name:'Alexios at Constantinople', desc:'Govern the imperial court, review provincial service and decide how to meet approaching western contingents.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The Komnenian household', diff:'age 39 · named court family',
      desc:'Irene Doukaina and six named children share the capital household. Eudokia uses an approximate birth year; Theodora is absent at this opening.' } },
    tracks:['alexios_agenda_1096','opening_alexios_1096'],
    trackLocations:{ alexios_agenda_1096:['constantinople'], opening_alexios_1096:['constantinople'] }, onboarding:'ruler',
    intro:'You are Alexios I Komnenos at Constantinople. Your household and the imperial administration have different responsibilities. Review appointments, public resources and the actual frontier. Approaching travellers may seek passage, but an imperial priority alone makes no agreement and gives you no command over their contingents.' },
  { id:'kilij_arslan_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'rum_1096', governmentForm:'territorial', fixedProvinceId:'nicaea',
    characterName:'Kilij Arslan I', sex:'m', startCulture:'turkic', startReligion:'sunni',
    name:'Kilij Arslan at Nicaea', desc:'Rule from Nicaea, weigh defense against eastern policy and respond to the frontier as it develops.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The Nicaean ruler', diff:'working age 17 · no seeded consort',
      desc:'A working birth year of 1079 supplies the age. No wife or children are reconstructed for the opening.' } },
    tracks:['rum_agenda_1096','opening_rum_1096'],
    trackLocations:{ rum_agenda_1096:['nicaea'], opening_rum_1096:['nicaea'] }, onboarding:'ruler',
    intro:'You are Kilij Arslan I at Nicaea. The county represents a broader jurisdiction than the city itself. Review your resources and choose between local defense, eastern interests or continued rule. Ordinary diplomacy and war remain available; no siege, family captivity or move to Konya is predetermined.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_eastern_rulers_1096);
