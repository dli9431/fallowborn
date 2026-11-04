FB.bookmarkSources.stage({"source":"data/starts_634_rulers.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing court adoption; the complete personal graph is attached by the
   dated agenda source before native source sealing. */
FBDATA.startScenarios_634_rulers = [
  {id:'umar_634',bookmarkIds:['634'],hidden:true,alwaysUnlocked:true,
    rulerRealmId:'rashidun_634',governmentForm:'medinan_selection_pf_634',fixedProvinceId:'medina',
    characterName:'Umar',sex:'m',startCulture:'arabic',startReligion:'early_islam_634',
    name:'Umar at Medina',
    desc:'Review the existing Medinan mandate, current resources and the Syrian and Iraqi borders independently.',
    tier:7,profession:'noble',gold:100,prestige:120,piety:20,
    familyPresets:{standard:{name:'Existing Medinan court',
      desc:'Adopt the present court and its resources. The opening supplies no named spouse or children.'}},
    tracks:['umar_agenda_634'],trackLocations:{umar_agenda_634:['medina']},onboarding:'ruler',
    intro:'You are Umar at Medina after accession. Review the political mandate already in place and the resources you actually govern. Syrian and Iraqi affairs remain separate choices, with no required conquest.'}
];
/* Yazdegerd has no offered start or attached agenda in this opening. */
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  var positions = FB.bookmarkCompositions.captureStarts('autumn_634','rulers',FBDATA.startScenarios_634_rulers);
  FBDATA.startScenarios_634_rulers.forEach(function (definition) {
    source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),
      locations:[definition.fixedProvinceId],source:'data/starts_634_rulers.js',after:positions[definition.id]});
  });
})();
});
