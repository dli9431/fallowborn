/* The existing Antioch court supplies its incumbent and household once. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_antioch_1096 = [
  { id:'yaghi_siyan_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'antioch_1096', governmentForm:'territorial', fixedProvinceId:'antioch',
    characterName:'Yaghi-Siyan', sex:'m', startCulture:'turkic', startReligion:'sunni',
    name:'Yaghi-Siyan at Antioch',
    desc:'Govern Antioch, maintain the city and weigh relations with neighboring courts. Your family and resources follow the living campaign.',
    tier:5, profession:'noble', gold:0, prestige:0, piety:0,
    familyPresets:{ standard:{ name:'The existing Antioch household',
      diff:'about age 56, with an authored son',
      desc:'Adopt the existing Yaghi-Siyan and Shams al-Dawla. Their working ages and shared Antioch residence are simulation choices. No unattested wife is generated.' } },
    tracks:['antioch_agenda_1096','opening_antioch_1096'],
    trackLocations:{ antioch_agenda_1096:['antioch'], opening_antioch_1096:['antioch'] },
    onboarding:'ruler',
    intro:'You are Yaghi-Siyan, governing Antioch. The city and its surrounding county use an effective local-rule abstraction. Review your actual holdings, household and funds in Rank & Realm, and your optional governing program in Deeds. Relations with Aleppo and Damascus remain choices. No later siege or change of allegiance is promised.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_antioch_1096);
FBDATA.bookmarks['1096'].startLocations.yaghi_siyan_1096 = ['antioch'];
