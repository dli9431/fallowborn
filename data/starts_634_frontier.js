FB.bookmarkSources.stage({"source":"data/starts_634_frontier.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Fictional settled household; resources and generated kin are simulation settings. */
FBDATA.startScenarios_634_frontier = [
  { id:'frontier_household_634', bookmarkIds:['634'], alwaysUnlocked:true,
    fixedProvinceId:'damascus', startCulture:'arabic', startReligion:'west_syriac_lay_634', startAge:30,
    name:'Christian Arab Frontier Household',
    desc:'A fictional, settled Christian Arab craft household in Damascus, with regional connections south of the city. Earn through ordinary civilian work or conclude your opening plans here.',
    tier:1, profession:'craftsman', gold:20, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['frontier_household_track_634'],
    trackLocations:{ frontier_household_track_634:['damascus'] },
    intro:'You are {name}, a craft worker in Damascus. Your established household belongs to a local Christian Arab community. Your family and workshop are fictional; connections south of Damascus give this settled household a regional frontier perspective. Ordinary civilian work supports you. Open your household story in Deeds to consider your plans.' }
];
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('autumn_634','frontier',FBDATA.startScenarios_634_frontier);
    FBDATA.startScenarios_634_frontier.forEach(function (definition) {
      source.input.starts.push({definition:JSON.parse(JSON.stringify(definition)),locations:['damascus'],
        source:'data/starts_634_frontier.js',after:positions[definition.id]});
    });
  } catch (error) { source.faults = (source.faults || []).concat([error.message]); }
})();
});
