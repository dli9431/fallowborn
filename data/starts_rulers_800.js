FB.bookmarkSources.stage({"source":"data/starts_rulers_800.js","bookmarks":["800"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Existing Carolingian courts, with residence distinct from public capitals. */
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_rulers_800 = [
  { id:'charlemagne_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'carolingian_800', governmentForm:'territorial', fixedProvinceId:'roma',
    characterName:'Charlemagne', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Charlemagne at Rome',
    desc:'Lead the existing Carolingian court from Rome after the coronation. Aachen remains the realm capital; Rome and its papal government remain separate.',
    tier:7, profession:'noble', gold:120, prestige:180, piety:20,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 52 · existing court family',
      desc:'Keep Charles and the existing linked family. The opening roster is incomplete; no replacement spouse is generated.' } },
    onboarding:'ruler', tracks:['charlemagne_agenda_800'],
    trackLocations:{ charlemagne_agenda_800:['roma'] },
    intro:'You are Charlemagne in Rome after the Christmas coronation. Aachen remains your public capital and the papacy keeps Rome. Your existing court family is incomplete. Review live family, provincial duties and succession through their ordinary decisions; this opening grants no new land or coronation payment.' },
  { id:'louis_800', bookmarkIds:['800'], alwaysUnlocked:true,
    rulerRealmId:'aquitaine', governmentForm:'territorial', fixedProvinceId:'bordeaux',
    characterName:'Louis', sex:'m', startCulture:'frankish', startReligion:'catholic',
    name:'Louis at Bordeaux',
    desc:'Govern the existing Aquitanian court under Charlemagne. Bordeaux is an approximate opening residence at the current capital, not a documented Christmas itinerary.',
    tier:6, profession:'noble', gold:90, prestige:120, piety:15,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 22 · existing court family',
      desc:'Keep the existing children and generated campaign consort. The historical family roster is incomplete.' } },
    onboarding:'ruler', tracks:['louis_agenda_800'],
    trackLocations:{ louis_agenda_800:['bordeaux'] },
    intro:'You are Louis at the Aquitanian court in Bordeaux, an approximate residence for this date. Charlemagne remains your overlord. Your children and campaign consort retain their existing identities; the roster is incomplete. Govern your actual lands and review family prospects through ordinary decisions.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_rulers_800);
});
