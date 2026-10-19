/* Household and existing-court openings in the Spring 1241 world. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_1241 = [
  { id:'hungarian_village_household_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    fixedProvinceId:'szekesfehervar', startCulture:'magyar', startReligion:'catholic', startAge:24,
    name:'A Farm in the Royal Heartland',
    desc:'A fictional farming household in Székesfehérvár county. Tend your plot, consider current affairs and weigh a personal journey to Bratislava.',
    tier:1, profession:'farmer', gold:20, prestige:5, piety:0,
    startEffects:{ landPlots:1 }, familyPresets:{ standard:{} },
    tracks:['hungarian_village_track_1241','opening_hungarian_village_1241'],
    trackLocations:{ hungarian_village_track_1241:['szekesfehervar'], opening_hungarian_village_1241:['szekesfehervar'] },
    intro:'You are {name}, a farmer of {province}. Your household has a small plot and its own daily needs. Open your household story in Deeds to consider work, present obligations and a journey ahead on your own.' },
  { id:'bela_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'hungary_1241', governmentForm:'territorial', fixedProvinceId:'szekesfehervar',
    characterName:'Bela IV', sex:'m', startCulture:'magyar', startReligion:'catholic',
    name:'Bela IV at Obuda', desc:'Lead the Hungarian crown from its royal gathering place at Obuda. Review the court, present obligations and preparations through ordinary government.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The royal household', diff:'age 35 · existing named family', desc:'Maria Laskarina and young Stephen share the court. Coloman is external kin in Slavonia. Supporting birth years and household placement are approximate.' } },
    tracks:['bela_agenda_1241','opening_bela_1241'], onboarding:'ruler',
    intro:'You are Bela IV. Obuda is your chosen opening court within the broad Székesfehérvár county. Maria and Stephen belong to your existing household. Review your actual treasury, lands and obligations, then open your court agenda in Deeds. The year supplies no army, protected refuge or guaranteed battle.' },
  { id:'yaroslav_1241', bookmarkIds:['1241'], alwaysUnlocked:true,
    rulerRealmId:'vladimir_1241', governmentForm:'territorial', fixedProvinceId:'suzdal',
    characterName:'Yaroslav Vsevolodovich', sex:'m', startCulture:'rus', startReligion:'orthodox',
    name:'Yaroslav at Vladimir', desc:'Govern the Vladimir principality after the earlier invasion. Consider recovery, northern relationships and your family’s separate positions.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'The princely family', diff:'about age 50 · existing named family', desc:'Keep one Feodosia, Alexander and Andrei. Alexander’s wife is identified by her attested parentage. Supporting ages and county homes are approximate; no Novgorod office is granted.' } },
    tracks:['yaroslav_agenda_1241','opening_yaroslav_1241'], onboarding:'ruler',
    intro:'You are Yaroslav Vsevolodovich at Vladimir-on-the-Klyazma, within the broad Suzdal county. Your family retains its own people and homes. Novgorod is a separate court; later recognition and tribute are not opening obligations. Review current resources and choose your priorities through the court agenda in Deeds.' }
];
Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_1241);
