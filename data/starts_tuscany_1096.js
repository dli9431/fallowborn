FB.bookmarkSources.stage({"source":"data/starts_tuscany_1096.js","bookmarks":["1096"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_tuscany_1096 = [
  { id:'matilda_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'canossa_1096', governmentForm:'territorial', fixedProvinceId:'modena',
    characterName:'Matilda of Canossa', sex:'f', startCulture:'italian', startReligion:'catholic',
    name:'Matilda of Canossa', desc:'Rule Tuscany from Modena to Pisa and Siena in 1096, at war with Emperor Henry IV and allied with Pope Urban II.',
    tier:5, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Separated Canossan household', diff:'about age 50 · no resident spouse or children',
      desc:'You alone. Welf V left you in 1095, and you have no children.' } },
    onboarding:'ruler', tracks:['matilda_agenda_1096','opening_matilda_1096'],
    intro:'You are Matilda of Canossa, and your lands run from Modena across the Apennines to Lucca, Pisa, Firenze and Siena. Emperor Henry IV has fought you since 1090, and your husband Welf V left you in 1095. Pope Urban II counts on you as his strongest ally in Italy. Open your court agenda in Deeds.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_tuscany_1096);
});
