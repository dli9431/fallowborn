FB.bookmarkSources.stage({"source":"data/starts_rulers_568.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Three existing Frankish courts in the fresh 568 revision. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_568 = [
  { id:'sigebert_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'austrasia_568', governmentForm:'regnum', fixedProvinceId:'metz',
    characterName:'Sigebert I', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Sigebert I at Metz', desc:'Govern the Austrasian court and review its living household, holdings and neighboring rulers.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Austrasian court',
      desc:'Brunhild is your existing wife. The known family is incomplete in this opening; no child or replacement relative is generated.' } },
    tracks:['sigebert_agenda_568'], trackLocations:{sigebert_agenda_568:['metz']}, onboarding:'ruler',
    intro:'You are Sigebert I at the Metz court. Brunhild is your wife in this opening. Review the living household, actual lands and neighboring courts. The later family and political outcomes remain open.' },
  { id:'chilperic_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'neustria_568', governmentForm:'regnum', fixedProvinceId:'laon',
    characterName:'Chilperic I', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Chilperic I at Soissons', desc:'Govern the Soissons court from the game map’s Laon county anchor and review its current obligations.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Soissons court',
      desc:'The opening court roster is incomplete. No historical spouse or child is generated from the later accounts.' } },
    tracks:['chilperic_agenda_568'], trackLocations:{chilperic_agenda_568:['laon']}, onboarding:'ruler',
    intro:'You are Chilperic I at the Soissons court, represented in the Laon county on this map. Review the living court and lands you actually govern. Later marriages and conflicts are unsettled.' },
  { id:'guntram_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'burgundy_568', governmentForm:'regnum', fixedProvinceId:'orleans',
    characterName:'Guntram', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Guntram at Orleans', desc:'Govern the Orleans and Burgundy court through its current lands, resources and relations.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Orleans court',
      desc:'The opening court roster is incomplete. No spouse, child or successor is inferred from later accounts.' } },
    tracks:['guntram_agenda_568'], trackLocations:{guntram_agenda_568:['orleans']}, onboarding:'ruler',
    intro:'You are Guntram at the Orleans court. Review the holdings and people who remain in this campaign. Later family and diplomatic outcomes follow ordinary decisions.' }
];
(function () {
  'use strict';
  var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
  if (!draft) return;
  try {
    var positions = FB.bookmarkCompositions.captureStarts('spring_568','frankish',FBDATA.startScenarios_rulers_568);
    FBDATA.startScenarios_rulers_568.forEach(function (definition) {
      draft.starts.push({definition:JSON.parse(JSON.stringify(definition)),source:'data/starts_rulers_568.js',after:positions[definition.id]});
    });
  } catch (error) { draft.faults.push({source:'data/starts_rulers_568.js',message:error.message}); }
})();
});
