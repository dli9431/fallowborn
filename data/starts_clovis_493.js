window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_clovis_493 = [
  { id:'clovis_493', bookmarkIds:['493'], hidden:true, alwaysUnlocked:true,
    rulerRealmId:'franks_493', governmentForm:'regnum', fixedProvinceId:'laon',
    characterName:'Clovis', sex:'m', startCulture:'frankish', startReligion:'germanic_pagan',
    name:'Clovis at Soissons', desc:'Govern the existing Frankish court among Gallic communities and neighboring kingdoms. Decide which commitments your realm can sustain.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing Frankish household', diff:'age 27 · existing court family',
      desc:'Theuderic belongs to your court. Supporting relatives are generated campaign characters.' } },
    onboarding:'ruler',
    intro:'You are Clovis. Your Frankish court holds Soissons and neighboring Gallic communities. Review your household, holdings and treasury. Decide how to govern among different beliefs and neighboring courts; later campaigns and a public change of faith depend on your choices and circumstances.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_clovis_493);
