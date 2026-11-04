FB.bookmarkSources.stage({"source":"data/starts_634_damascus.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* A fictional craft household in Damascus. */
FBDATA.startScenarios_634_damascus = [
  { id:'damascus_household_634', bookmarkIds:['634'], alwaysUnlocked:true,
    fixedProvinceId:'damascus', startCulture:'syriac', startReligion:'chalcedonian', startAge:24,
    name:'Damascus craft household',
    desc:'An established Syriac household in the city of Damascus. Practice a craft, consult household records and decide whether to remain.',
    tier:1, profession:'craftsman', gold:20, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['damascus_household_track_634','opening_damascus_634'],
    trackLocations:{ damascus_household_track_634:['damascus'], opening_damascus_634:['damascus'] },
    intro:'You are {name}, a craft worker in Damascus. Your household belongs to the local Syriac Christian community. Craft work, household stores and ordinary obligations shape your days. Open your household story in Deeds to consider the next step.' }
];
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('autumn_634','damascus',FBDATA.startScenarios_634_damascus);
    FBDATA.startScenarios_634_damascus.forEach(function (definition) {
      source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),locations:['damascus'],
        source:'data/starts_634_damascus.js',after:positions[definition.id]});
    });
  } catch (error) { source.faults = (source.faults || []).concat([error.message]); }
})();
});
