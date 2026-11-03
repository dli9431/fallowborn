FB.bookmarkSources.stage({"source":"data/starts_634_ctesiphon.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* A fictional farming household in the Ctesiphon district. */
FBDATA.startScenarios_634_ctesiphon = [
  { id:'ctesiphon_household_634', bookmarkIds:['634'], alwaysUnlocked:true,
    fixedProvinceId:'baghdad', startCulture:'syriac', startReligion:'east_syriac', startAge:24,
    name:'Ctesiphon Farming Household',
    desc:'An established Syriac household in the agricultural district around Ctesiphon. Tend a livelihood, consult household records and decide whether to remain.',
    tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
    familyPresets:{ established:{} }, startEffects:{ landPlots:1 },
    tracks:['ctesiphon_household_track_634','opening_ctesiphon_634'],
    trackLocations:{ ctesiphon_household_track_634:['baghdad'], opening_ctesiphon_634:['baghdad'] },
    intro:'You are {name}, a farmer in the Ctesiphon district. Your household belongs to the local Syriac Christian community. Fields, household stores and ordinary obligations shape your days. Open your household story in Deeds to consider the next step.' }
];
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('autumn_634','ctesiphon',FBDATA.startScenarios_634_ctesiphon);
    FBDATA.startScenarios_634_ctesiphon.forEach(function (definition) {
      source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),locations:['baghdad'],
        source:'data/starts_634_ctesiphon.js',after:positions[definition.id]});
    });
  } catch (error) { source.faults = (source.faults || []).concat([error.message]); }
})();
});
