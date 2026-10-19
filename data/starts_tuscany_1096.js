window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_tuscany_1096 = [
  { id:'matilda_1096', bookmarkIds:['1096'], alwaysUnlocked:true,
    rulerRealmId:'canossa_1096', governmentForm:'territorial', fixedProvinceId:'modena',
    characterName:'Matilda of Canossa', sex:'f', startCulture:'italian', startReligion:'catholic',
    name:'Matilda of Canossa', desc:'Govern the Canossan lands after the separation from Welf. Review local obligations and choose a policy toward the imperial and papal courts.',
    tier:5, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Separated Canossan household', diff:'about age 50 · no resident spouse or children',
      desc:'Begin as Matilda with no generated consort or descendants. The spouse-free household represents separation from Welf, not an attested annulment; ordinary marriage rules remain available.' } },
    onboarding:'ruler', tracks:['matilda_agenda_1096','opening_matilda_1096'],
    intro:'You are Matilda of Canossa. Modena serves as an administrative anchor for your lands, rather than a documented opening-day residence. Your household is separated from Welf. Review your actual holdings and treasury, weigh local obligations, and decide how to respond to the living imperial and papal courts. Your opening program records priorities; ordinary government, diplomacy and war carry out your decisions.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_tuscany_1096);
