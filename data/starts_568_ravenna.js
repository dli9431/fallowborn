/* A fictional craft household in the Spring 568 world. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_568_ravenna = [
  { id:'ravenna_household_568', bookmarkIds:['568'], alwaysUnlocked:true,
    fixedProvinceId:'ravenna', startCulture:'roman', startReligion:'nicene', startAge:30,
    name:'Ravenna Artisan Household',
    desc:'An established craft household in imperial Ravenna. Find customers, tend the household and consider a personal visit to Bononia.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{ established:{} },
    tracks:['ravenna_household_track_568','opening_ravenna_568'],
    trackLocations:{ ravenna_household_track_568:['ravenna'], opening_ravenna_568:['ravenna'] },
    intro:'You are {name}, an artisan of {province}. Your family needs customers and enough money for the next purchase. Open your household story in Deeds to weigh work, household supplies and a journey ahead on your own.' }
];
(function () {
  'use strict';
  var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
  if (!draft) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('spring_568','ravenna',FBDATA.startScenarios_568_ravenna);
    FBDATA.startScenarios_568_ravenna.forEach(function (definition) {
      draft.starts.push({definition:JSON.parse(JSON.stringify(definition)),source:'data/starts_568_ravenna.js',after:positions[definition.id]});
    });
    if (draft.bookmark) draft.bookmark.startLocations.ravenna_household_568 = ['ravenna'];
  } catch (error) { draft.faults.push({source:'data/starts_568_ravenna.js',message:error.message}); }
})();
