FB.bookmarkSources.stage({source:'data/starts_mobile_principal.js',bookmarks:['1204'],catalogs:[],shared:[]}, function (FBDATA) {
/* A regional following retains its existing generated member principals. */
FBDATA.startScenarios_mobile_principal = [
  {id:'qipchaq_principal_1204',bookmarkIds:['1204'],alwaysUnlocked:true,
    name:'Leader of the eastern Qipchaq following',
    desc:'Lead the existing following near the lower Syr Darya as its generated river principal. Members retain their voices; public stores and your private purse remain separate. This is a regional simulation role, not a named historical biography.',
    mobilePrincipal:{realmId:'qipchaq_following_1204',memberId:'river_followers'},
    fixedProvinceId:'lower_syr_darya',sex:'m',startCulture:'turkic',startReligion:'tengri',startAge:30,
    tier:1,profession:'farmer',gold:12,prestige:5,piety:0,
    familyPresets:{standard:{name:'The existing principal',diff:'No invented relatives'}},
    tracks:['qipchaq_principal_agenda_1204','opening_qipchaq_principal_1204'],
    trackLocations:{qipchaq_principal_agenda_1204:['lower_syr_darya'],opening_qipchaq_principal_1204:['lower_syr_darya']},
    intro:'You are {name}, the river principal selected to lead this eastern following. Its existing households, fighters and finite stock remain together. Open Mobile coalition in Deeds for current member decisions, supplies and outside negotiations. No county, tribute or passage is granted by this beginning.'}
];
Array.prototype.push.apply(FBDATA.startScenarios,FBDATA.startScenarios_mobile_principal);
});
