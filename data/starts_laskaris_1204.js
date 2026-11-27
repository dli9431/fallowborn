FB.bookmarkSources.stage({"source":"data/starts_laskaris_1204.js","bookmarks":["1204"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

/* Existing 1204 courts on either side of the fall of Constantinople: the
   Nicaean refuge and the crusader emperor's Latin court in the city. */
FBDATA.startScenarios_laskaris_1204 = [
  { id:'laskaris_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    rulerRealmId:'nicaea_1204', governmentForm:'territorial', fixedProvinceId:'nicaea',
    characterName:'Theodore Laskaris', sex:'m', startCulture:'greek', startReligion:'orthodox',
    name:'Theodore Laskaris at Nicaea', desc:'Hold the Nicaean court after the loss of Constantinople. Gather support in Bithynia and weigh the Latin threat against your own ambitions.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Nicaean court household', diff:'about age 29 · existing court family', desc:'Keep Theodore and the generated supporting household. Historical relatives are not individually reconstructed.' } },
    onboarding:'ruler',
    intro:'You are Theodore Laskaris. Your court holds Nicaea after the loss of Constantinople, while other Greek courts pursue their own claims. Review your holdings and treasury in Rank & Realm. The Latin partition threatens Bithynia; choose how to face it, and whether your court can sustain a later campaign for Constantinople.' },
  { id:'baldwin_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    rulerRealmId:'latin_1204', governmentForm:'territorial', fixedProvinceId:'constantinople',
    characterName:'Baldwin of Flanders', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Baldwin of Flanders at Constantinople', desc:'Rule the new Latin Empire from Constantinople. The crusaders’ partition is unfinished, and Greek courts gather beyond the city.',
    tier:7, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Latin court household', diff:'about age 32 · existing court family', desc:'Keep Baldwin and the generated supporting household. Historical relatives are not individually reconstructed.' } },
    onboarding:'ruler',
    intro:'You are Baldwin of Flanders, crowned emperor at Constantinople. Your court holds the city, but the partition among the crusade leaders remains unfinished and Greek courts claim the empire. Review your holdings and treasury in Rank & Realm, then decide which commitments the new empire can sustain.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_laskaris_1204);
});
