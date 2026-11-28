FB.bookmarkSources.stage({"source":"data/starts_antioch_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* The existing Antioch court supplies its incumbent and household once. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_antioch_1096 = [
  { id:'yaghi_siyan_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'antioch_1096', governmentForm:'territorial', fixedProvinceId:'antioch',
    characterName:'Yaghi-Siyan', sex:'m', startCulture:'turkic', startReligion:'sunni',
    name:'Yaghi-Siyan at Antioch',
    desc:'Govern Antioch for the Seljuk sultan in 1096, caught between the rival courts of Aleppo and Damascus.',
    tier:5, profession:'noble', gold:0, prestige:0, piety:0,
    familyPresets:{ standard:{ name:'The existing Antioch household',
      diff:'about age 56, with an authored son',
      desc:'Your son Shams al-Dawla lives with you at Antioch. Your wife is not in this start.' } },
    tracks:['antioch_agenda_1096','opening_antioch_1096'],
    trackLocations:{ antioch_agenda_1096:['antioch'], opening_antioch_1096:['antioch'] },
    onboarding:'ruler',
    intro:'You are Yaghi-Siyan, governing Antioch for the Seljuk sultan, who is far away at Isfahan. Aleppo and Damascus each want your city on their side. Your son Shams al-Dawla lives with you. Open your court agenda in Deeds.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_antioch_1096);
FBDATA.bookmarks['1096'].startLocations.yaghi_siyan_1096 = ['antioch'];
});
