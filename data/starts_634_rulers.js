FB.bookmarkSources.stage({"source":"data/starts_634_rulers.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing court adoption; the complete personal graph is attached by the
   dated agenda source before native source sealing. */
FBDATA.startScenarios_634_rulers = [
  {id:'umar_634',bookmarkIds:['634'],hidden:true,alwaysUnlocked:true,
    revisionIdentities:{'634':{core_courts_v4:{startReligion:'medinan_court_634',governmentForm:'medinan_selection_634'}}},
    rulerRealmId:'rashidun_634',governmentForm:'medinan_selection_pf_634',fixedProvinceId:'medina',
    characterName:'Umar',sex:'m',startCulture:'arabic',startReligion:'early_islam_634',
    name:'Umar at Medina',
    desc:'Review the existing Medinan mandate, current resources and the Syrian and Iraqi borders independently.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing Medinan court',
      desc:'Adopt the present court and its resources. The opening supplies no named spouse or children.'}},
    tracks:['umar_agenda_634'],trackLocations:{umar_agenda_634:['medina']},onboarding:'ruler',
    intro:'You are Umar at Medina after accession. Review the political mandate already in place and the resources you actually govern. Syrian and Iraqi affairs remain separate choices, with no required conquest.'},
  {id:'heraclius_634',bookmarkIds:['634'],hidden:true,alwaysUnlocked:true,
    revisionIdentities:{'634':{core_courts_v4:{governmentForm:'administrative_monarchy'}}},
    rulerRealmId:'byzantium_634',governmentForm:'roman_civic',fixedProvinceId:'constantinople',
    characterName:'Heraclius',sex:'m',startCulture:'greek',startReligion:'chalcedonian',
    name:'Heraclius at Constantinople',
    desc:'Review the existing imperial court, actual eastern holdings and resources, and lawful defense or diplomacy.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing imperial court',
      desc:'Adopt the present court and its resources. The opening supplies no named spouse or children.'}},
    tracks:['heraclius_agenda_634'],trackLocations:{heraclius_agenda_634:['constantinople']},onboarding:'ruler',
    intro:'You are Heraclius at Constantinople. This capital-based opening is a reconstruction, not an exact itinerary. Review the court and resources you actually govern; remaining here and retaining present arrangements is a complete course.'}
];
/* Yazdegerd has no offered start or attached agenda in this opening. */
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  /* The complete literal companions are unpublished. The current assembler
     still offers only the exact predecessor starts and real revisions. */
  var published = JSON.parse(JSON.stringify(FBDATA.startScenarios_634_rulers));
  published.forEach(function (definition) { delete definition.revisionIdentities; });
  var positions = FB.bookmarkCompositions.captureStarts('autumn_634','rulers',published);
  published.forEach(function (definition) {
    source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),
      locations:[definition.fixedProvinceId],source:'data/starts_634_rulers.js',after:positions[definition.id]});
  });
})();
});
