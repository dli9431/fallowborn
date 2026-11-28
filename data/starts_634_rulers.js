FB.bookmarkSources.stage({"source":"data/starts_634_rulers.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing court adoption; the complete personal graph is attached by the
   dated agenda source before native source sealing. */
FBDATA.startScenarios_634_rulers = [
  {id:'umar_634',bookmarkIds:['634'],hidden:false,alwaysUnlocked:true,
    revisionIdentities:{'634':{core_courts_v4:{startReligion:'medinan_court_634',governmentForm:'medinan_selection_634'}}},
    rulerRealmId:'rashidun_634',governmentForm:'medinan_selection_pf_634',fixedProvinceId:'medina',
    characterName:'Umar',sex:'m',startCulture:'arabic',startReligion:'early_islam_634',
    name:'Umar at Medina',
    desc:'You lead the Medinan court as Abu Bakr’s chosen successor. To the north Heraclius holds Damascus, and to the northeast the Persians hold the Hira district.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing Medinan court',
      desc:'You and your court at Medina. Your wives and children, among them your son Abdullah and your daughter Hafsa, are not in this start.'}},
    tracks:['umar_agenda_634'],trackLocations:{umar_agenda_634:['medina']},onboarding:'ruler',
    intro:'You are Umar, sworn in at Medina this summer as Abu Bakr’s successor. Heraclius holds Damascus and the Persian court holds the Hira district, and each front is a separate choice. Open your court agenda in Deeds.'},
  {id:'heraclius_634',bookmarkIds:['634'],hidden:false,alwaysUnlocked:true,
    revisionIdentities:{'634':{core_courts_v4:{governmentForm:'administrative_monarchy'}}},
    rulerRealmId:'byzantium_634',governmentForm:'roman_civic',fixedProvinceId:'constantinople',
    characterName:'Heraclius',sex:'m',startCulture:'greek',startReligion:'chalcedonian',
    name:'Heraclius at Constantinople',
    desc:'You rule the Romans from Constantinople, a few years after winning the east back from Persia. Now Medina’s armies look to Damascus.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing imperial court',
      desc:'You and your court at Constantinople. Your wife Martina and your sons Constantine and Heraklonas are not in this start.'}},
    tracks:['heraclius_agenda_634'],trackLocations:{heraclius_agenda_634:['constantinople']},onboarding:'ruler',
    intro:'You are Heraclius, emperor since 610. You won Syria, Palestine and Egypt back from Persia, and Medina’s armies now threaten Damascus. Open your court agenda in Deeds.'},
  {id:'yazdegerd_634',bookmarkIds:['634'],hidden:false,alwaysUnlocked:true,
    rulerRealmId:'sasanian_634',governmentForm:'aristocratic_monarchy',fixedProvinceId:'baghdad',
    characterName:'Yazdegerd III',sex:'m',startCulture:'persian',startReligion:'zoroastrian_sasanian_634',
    name:'Yazdegerd at Ctesiphon',
    desc:'You are the ten-year-old king of kings at Ctesiphon. An adult steward governs for you, and Medina may march on the Hira district.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing Sasanian court',
      desc:'You are ten and unmarried, with no close family at court. An adult steward from the great provincial houses governs for you.'}},
    tracks:['yazdegerd_agenda_634'],trackLocations:{yazdegerd_agenda_634:['baghdad']},onboarding:'ruler',
    intro:'You are Yazdegerd III, ten years old and crowned two years ago after a long civil war. An adult steward from the great provincial houses governs in your name until you come of age, and those houses must agree to public decisions. Medina may march on the Hira district. Open your court agenda in Deeds.'}
];
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  /* Publish the literal projections with their complete personal graphs. */
  var published = JSON.parse(JSON.stringify(FBDATA.startScenarios_634_rulers));
  var positions = FB.bookmarkCompositions.captureStarts('autumn_634','rulers',published);
  published.forEach(function (definition) {
    source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),
      locations:[definition.fixedProvinceId],source:'data/starts_634_rulers.js',after:positions[definition.id]});
  });
})();
});
