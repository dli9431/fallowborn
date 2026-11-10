FB.bookmarkSources.stage({source:'data/bookmark_711_identities.js',bookmarks:['711'],catalogs:['cultures','religions'],shared:[]}, function (FBDATA) {
/* Shared culture and faith identities install before engine indexing.
   The Umayyad branch reuses Sunni doctrine with its own Damascus head office.
   Community shares and unrecorded rulers are gameplay estimates. */
FBDATA.bookmarkCultures711 = {
  sindhi_711:{ name:'Sindhi', parent:'persian', dyn:'of_place',
    male:['Dahir','Jaisimha','Chandar','Durlabha','Vijaya'],
    female:['Surya','Parimal','Chandra','Devi'] }
};
FBDATA.bookmarkReligions711 = {
  "umayyad_sunni_711":{"availability":{"bookmarkIds":["711"]},"name":"Umayyad allegiance","group":"sunni","relationToParent":"in_fold","icon":"☪","properties":{"head":{"officeId":"umayyad_caliph_711","realm":"umayyad_711","title":"Caliph","holderSex":"m","holderKind":"realm","succession":"caliphal_claim","recovery":"claim","claim":{"prestige":"religiousHeadClaimPrestige","piety":"religiousHeadClaimPiety","minRealm":"religiousHeadClaimMinRealm","warPrestige":"religiousHeadClaimWarPrestige"},"claimCounties":[["damascus"],["mecca","medina"]],"sameFaithWar":"ordinary","greatHolyWar":null}}},
  "buddhist_711":{"availability":{"bookmarkIds":["711"]},"name":"Buddhist communities","icon":"☸","properties":{"legalTradition":"customary","head":null,"holyWarTradition":null,"raidingTradition":false,"religiousPaths":null,"intro":{"path":"intro_other"},"words":{"deity":"the teachings","cleric":"religious participant","temple":"place of worship","landed":"Lord","partnership":"Trade partnership"},"roles":{"monasticM":"Religious student","monasticF":"Religious student","priestM":"Religious participant","priestF":"Religious participant"},"marriage":{"spouseLimit":{"m":1,"f":1},"divorce":{"kind":"sunder","direct":true,"gold":0,"piety":0,"prestige":0,"cooldownDays":360},"acceptedRelations":["same","in_fold"]},"clergyMarriage":true}},
  "hindu_711":{"availability":{"bookmarkIds":["711"]},"name":"Hindu communities","icon":"🕉","properties":{"legalTradition":"customary","head":null,"intro":{"path":"intro_other"},"words":{"deity":"the gods","cleric":"priest","temple":"temple","landed":"Lord","partnership":"Trade partnership"},"marriage":{"spouseLimit":{"m":1,"f":1},"divorce":{"kind":"sunder","direct":true,"gold":0,"piety":0,"prestige":5,"cooldownDays":360},"acceptedRelations":["same","in_fold"]},"clergyMarriage":true}}
};
Object.assign(FBDATA.cultures, FBDATA.bookmarkCultures711);
Object.assign(FBDATA.religions, FBDATA.bookmarkReligions711);
});
