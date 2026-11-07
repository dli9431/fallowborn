FB.bookmarkSources.stage({"source":"data/starts_634_medina.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Fictional free farming household; resources and family are simulation settings. */
FBDATA.startScenarios_634_medina = [
  {id:'medina_household_634',bookmarkIds:['634'],alwaysUnlocked:true,
    fixedProvinceId:'medina',startCulture:'arabic',startReligion:'early_islam_634',startAge:24,
    name:'Medinan Farming Household',
    desc:'A fictional free farming household in Medina, with an established family and a small holding. Weigh ordinary farming, provisions and devotion, and review the current court and local community while keeping household and public authority separate.',
    tier:1,profession:'farmer',gold:20,prestige:5,piety:0,
    familyPresets:{established:{}},startEffects:{landPlots:1},
    tracks:['medina_household_track_634'],
    trackLocations:{medina_household_track_634:['medina']},
    intro:'You are {name}, a free farmer of {province}. Your generated family, small plot and starting resources are simulation choices, not a documented historical household. Open the household story in Deeds to consider work and life at home.'}
];
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('autumn_634','medina',FBDATA.startScenarios_634_medina);
    FBDATA.startScenarios_634_medina.forEach(function (definition) {
      source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),locations:['medina'],
        source:'data/starts_634_medina.js',after:positions[definition.id]});
    });
  } catch (error) { source.faults = (source.faults || []).concat([error.message]); }
})();
});
