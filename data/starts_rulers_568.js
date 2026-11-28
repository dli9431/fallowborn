FB.bookmarkSources.stage({"source":"data/starts_rulers_568.js","bookmarks":["568"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Three existing Frankish courts in the fresh 568 revision. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_568 = [
  { id:'sigebert_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'austrasia_568', governmentForm:'regnum', fixedProvinceId:'metz',
    characterName:'Sigebert I', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Sigebert I at Metz', desc:'You rule Austrasia from Metz, newly married to Brunhild and newly enriched by Charibert’s share of the Frankish lands.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Austrasian court',
      desc:'Brunhild, your Visigothic wife, lives with you at Metz. No child of yours is in this start.' } },
    tracks:['sigebert_agenda_568'], trackLocations:{sigebert_agenda_568:['metz']}, onboarding:'ruler',
    intro:'You are Sigebert I, ruling Austrasia from Metz, which the map calls Divodurum. Brunhild, your Visigothic bride, keeps court with you. Your brothers Chilperic and Guntram rule the other Frankish shares. Open your court agenda in Deeds to begin.' },
  { id:'chilperic_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'neustria_568', governmentForm:'regnum', fixedProvinceId:'laon',
    characterName:'Chilperic I', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Chilperic I at Soissons', desc:'You rule Neustria from Soissons, the youngest of Chlothar’s sons, with Paris in your hands and an eye on more of Charibert’s lands.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Soissons court',
      desc:'Your household at Soissons has no queen, and your sons by Audovera are not in this start.' } },
    tracks:['chilperic_agenda_568'], trackLocations:{chilperic_agenda_568:['laon']}, onboarding:'ruler',
    intro:'You are Chilperic I, ruling Neustria from Soissons. Your brother Sigebert’s marriage to Brunhild has outshone your court. Paris is yours for now, and your brothers watch it closely. Open your court agenda in Deeds to begin.' },
  { id:'guntram_568', bookmarkIds:['568'], alwaysUnlocked:true,
    rulerRealmId:'burgundy_568', governmentForm:'regnum', fixedProvinceId:'orleans',
    characterName:'Guntram', sex:'m', startCulture:'frankish', startReligion:'nicene',
    name:'Guntram at Orleans', desc:'You rule Orleans and Burgundy, from the Loire to the Rhône, as the eldest of Chlothar’s surviving sons.',
    tier:6, profession:'noble', gold:100, prestige:120, piety:20,
    familyPresets:{ standard:{ name:'Existing Orleans court',
      desc:'Your wife and children are not in this start; you keep court at Orleans alone.' } },
    tracks:['guntram_agenda_568'], trackLocations:{guntram_agenda_568:['orleans']}, onboarding:'ruler',
    intro:'You are Guntram, ruling Orleans and Burgundy as the eldest of Chlothar’s surviving sons. Sigebert and Chilperic eye each other across your borders, and the Lombards in Pannonia look toward Italy. Open your court agenda in Deeds to begin.' }
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
