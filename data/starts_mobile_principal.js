FB.bookmarkSources.stage({source:'data/starts_mobile_principal.js',bookmarks:['1204'],catalogs:[],shared:[]}, function (FBDATA) {
/* A regional following retains its existing generated member principals. */
FBDATA.startScenarios_mobile_principal = [
  {id:'qipchaq_principal_1204',bookmarkIds:['1204'],alwaysUnlocked:true,
    name:'Leader of the eastern Qipchaq following',
    desc:'You lead the eastern Qipchaq following on the lower Syr Darya as its generated river principal. Its members keep their own voice, and Khwarazm holds the land around you.',
    mobilePrincipal:{realmId:'qipchaq_following_1204',memberId:'river_followers'},
    fixedProvinceId:'lower_syr_darya',sex:'m',startCulture:'turkic',startReligion:'tengri',startAge:30,
    tier:1,profession:'farmer',gold:12,prestige:5,piety:0,
    familyPresets:{standard:{name:'The river principal',diff:'No relatives are in this start'}},
    tracks:['qipchaq_principal_agenda_1204','opening_qipchaq_principal_1204'],
    trackLocations:{qipchaq_principal_agenda_1204:['lower_syr_darya'],opening_qipchaq_principal_1204:['lower_syr_darya']},
    intro:'You are {name}, the river principal your members chose to lead the eastern Qipchaq. Your households, fighters and food stores travel with you on Khwarazmian land. Mobile coalition in Deeds is where members decide and outsiders negotiate. In Deeds, open Guiding the eastern Qipchaq to begin.'}
];
Array.prototype.push.apply(FBDATA.startScenarios,FBDATA.startScenarios_mobile_principal);
});
