/* Existing eastern sovereigns in the fresh 568 revision. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_568_east = [
  { id:'justin_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'east_568', governmentForm:'roman_civic', fixedProvinceId:'constantinople',
    characterName:'Justin II', sex:'m', startCulture:'greek', startReligion:'chalcedonian',
    name:'Justin II at Constantinople', desc:'Govern the eastern court and review its current family, Italian commands and frontier obligations.',
    tier:7, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing imperial court',
      desc:'Adopt the campaign court as it stands. Its historical family roster is incomplete; this opening supplies no named wife or children.' } },
    tracks:['justin_agenda_568'], trackLocations:{justin_agenda_568:['constantinople']}, onboarding:'ruler',
    intro:'You are Justin II at Constantinople. Review the living court and the lands and obligations you actually govern. Later diplomacy and conflict remain open.' },
  { id:'khosrow_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'sasanian_568', governmentForm:'aristocratic_monarchy', fixedProvinceId:'baghdad',
    characterName:'Khosrow I', sex:'m', startCulture:'persian', startReligion:'zoroastrian',
    name:'Khosrow I at Ctesiphon', desc:'Govern the Sasanian court from Ctesiphon and review its current provincial and frontier obligations.',
    tier:7, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Sasanian court',
      desc:'Adopt the campaign court as it stands. Its historical roster is incomplete; any generated relatives are campaign people, not named historical heirs.' } },
    tracks:['khosrow_agenda_568'], trackLocations:{khosrow_agenda_568:['baghdad']}, onboarding:'ruler',
    intro:'You are Khosrow I at Ctesiphon, represented by the Baghdad county on this map. Review the living household, provincial service and resources. Later war and succession remain open.' }
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
