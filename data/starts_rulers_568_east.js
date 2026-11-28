FB.bookmarkSources.stage({"source":"data/starts_rulers_568_east.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing eastern sovereigns in the fresh 568 revision. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_568_east = [
  { id:'justin_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'east_568', governmentForm:'roman_civic', fixedProvinceId:'constantinople',
    characterName:'Justin II', sex:'m', startCulture:'greek', startReligion:'chalcedonian',
    name:'Justin II at Constantinople', desc:'You rule the Roman East from Constantinople, three years into your reign, with Narses commanding in Italy and peace with Persia to uphold.',
    tier:7, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing imperial court',
      desc:'Your wife Sophia and your kin are not in this start.' } },
    tracks:['justin_agenda_568'], trackLocations:{justin_agenda_568:['constantinople']}, onboarding:'ruler',
    intro:'You are Justin II, ruling from Constantinople since 565. Narses still commands in Italy, Alboin’s Lombards stir in Pannonia, and the peace with Persia rests on Roman payments. Open your court agenda in Deeds to begin.' },
  { id:'khosrow_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'sasanian_568', governmentForm:'aristocratic_monarchy', fixedProvinceId:'baghdad',
    characterName:'Khosrow I', sex:'m', startCulture:'persian', startReligion:'zoroastrian',
    name:'Khosrow I at Ctesiphon', desc:'You rule the Sasanian realm from Ctesiphon after nearly forty years on the throne, at peace with Rome while Armenia grows restless.',
    tier:7, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Sasanian court',
      desc:'Your sons, among them your heir Hormizd, are not in this start.' } },
    tracks:['khosrow_agenda_568'], trackLocations:{khosrow_agenda_568:['baghdad']}, onboarding:'ruler',
    intro:'You are Khosrow I, King of Kings at Ctesiphon since 531. Your reforms built a paid cavalry and a fixed land tax, the peace with Rome holds, and Armenia grows restless. Open your court agenda in Deeds to begin.' }
];
(function () {
  'use strict';
  var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
  if (!draft) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('spring_568','eastern',FBDATA.startScenarios_rulers_568_east);
    FBDATA.startScenarios_rulers_568_east.forEach(function (definition) {
      draft.starts.push({definition:JSON.parse(JSON.stringify(definition)),source:'data/starts_rulers_568_east.js',after:positions[definition.id]});
    });
  } catch (error) { draft.faults.push({source:'data/starts_rulers_568_east.js',message:error.message}); }
})();
});
