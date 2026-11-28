FB.bookmarkSources.stage({"source":"data/starts_laskaris_1204.js","bookmarks":["1204"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

/* Existing 1204 courts on either side of the fall of Constantinople: the
   Nicaean refuge and the crusader emperor's Latin court in the city. */
FBDATA.startScenarios_laskaris_1204 = [
  { id:'laskaris_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    rulerRealmId:'nicaea_1204', governmentForm:'territorial', fixedProvinceId:'nicaea',
    characterName:'Theodore Laskaris', sex:'m', startCulture:'greek', startReligion:'orthodox',
    name:'Theodore Laskaris at Nicaea', desc:'You rule from Nicaea after the fall of Constantinople. The Latins claim Bithynia, and other Greek courts have ambitions of their own.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Nicaean court household', diff:'about age 29 · existing court family', desc:'Theodore and a generated household; his wife Anna and other relatives are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Theodore Laskaris, holding Nicaea after the fall of Constantinople. The Latins claim Bithynia, other Greek courts follow their own ambitions, and the old capital is in enemy hands. Begin with your holdings and treasury in Rank & Realm.' },
  { id:'baldwin_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    rulerRealmId:'latin_1204', governmentForm:'territorial', fixedProvinceId:'constantinople',
    characterName:'Baldwin of Flanders', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Baldwin of Flanders at Constantinople', desc:'You rule the new Latin Empire from Constantinople. The crusade leaders are still dividing the spoils while Greek courts gather beyond the city.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Latin court household', diff:'about age 32 · existing court family', desc:'Baldwin and a generated household; his wife Marie and other relatives are not in this start.' } },
    onboarding:'ruler',
    intro:'You are Baldwin of Flanders, newly crowned Latin emperor at Constantinople. The crusade leaders have yet to settle the partition, and Greek courts gather beyond the city. Begin with your holdings and treasury in Rank & Realm.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_laskaris_1204);
});
