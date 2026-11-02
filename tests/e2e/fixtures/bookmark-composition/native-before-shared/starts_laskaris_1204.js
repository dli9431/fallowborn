window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_laskaris_1204 = [
  { id:'laskaris_1204', bookmarkIds:['1204'], alwaysUnlocked:true,
    rulerRealmId:'nicaea_1204', governmentForm:'territorial', fixedProvinceId:'nicaea',
    characterName:'Theodore Laskaris', sex:'m', startCulture:'greek', startReligion:'orthodox',
    name:'Theodore Laskaris at Nicaea', desc:'Hold the Nicaean court after the loss of Constantinople. Gather support in Bithynia and weigh the Latin threat against your own ambitions.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Nicaean court household', diff:'about age 29 · existing court family', desc:'Keep Theodore and the generated supporting household. Historical relatives are not individually reconstructed.' } },
    onboarding:'ruler',
    intro:'You are Theodore Laskaris. Your court holds Nicaea after the loss of Constantinople, while other Greek courts pursue their own claims. Review your holdings and treasury in Rank & Realm. The Latin partition threatens Bithynia; choose how to face it, and whether your court can sustain a later campaign for Constantinople.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_laskaris_1204);
