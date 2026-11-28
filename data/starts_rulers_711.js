FB.bookmarkSources.stage({"source":"data/starts_rulers_711.js","bookmarks":["711"],"catalogs":[],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_711 = [
  { id:'roderic_711', bookmarkIds:['711'], alwaysUnlocked:true,
    rulerRealmId:'visigoths_711', governmentForm:'elective_monarchy', fixedProvinceId:'toledo',
    characterName:'Roderic', sex:'m', startCulture:'gothic', startReligion:'catholic',
    name:'Roderic at Toledo',
    desc:'You are the Gothic king at Toledo in spring 711. Achila’s party in the northeast refuses you, and the Umayyads can strike your southern coast from across the strait.',
    tier:6, profession:'noble', gold:90, prestige:120, piety:15,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 36 · existing court family',
      desc:'Any spouse or children with you at Toledo are generated for this campaign, not known historical people.' } },
    onboarding:'ruler', tracks:['roderic_agenda_711'],
    trackLocations:{ roderic_agenda_711:['toledo'] },
    intro:'You are Roderic, the Gothic king, keeping your court at Toledo. Achila’s party holds the northeast against you, and the Umayyads at Tangier can cross the strait toward Malaga. Open your court agenda in Deeds.' },
  { id:'tariq_711', bookmarkIds:['711'], alwaysUnlocked:true,
    rulerRealmId:'tangier_711', governmentForm:'territorial', fixedProvinceId:'tangier',
    characterName:'Tariq ibn Ziyad', sex:'m', startCulture:'berber', startReligion:'umayyad_sunni_711',
    name:'Tariq at Tangier',
    desc:'You hold Tangier for Musa ibn Nusayr, governor at Qayrawan, in spring 711. Gothic Spain lies across the strait, and any crossing is the caliph’s war to order.',
    tier:5, profession:'noble', gold:65, prestige:80, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 36 · existing court family',
      desc:'Any spouse or children with you at Tangier are generated for this campaign, not known historical people.' } },
    onboarding:'ruler', tracks:['tariq_agenda_711'],
    trackLocations:{ tariq_agenda_711:['tangier'] },
    intro:'You are Tariq ibn Ziyad at Tangier, serving Musa ibn Nusayr, who answers to the caliph at Damascus. The war across the strait is the caliph’s to order, while your court and family are yours to run. Open your court agenda in Deeds.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_rulers_711);
});
