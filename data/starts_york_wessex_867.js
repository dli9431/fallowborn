FB.bookmarkSources.stage({"source":"data/starts_york_wessex_867.js","bookmarks":["867"],"catalogs":["religiousActivities","religiousPatronage"],"shared":[]}, function (FBDATA) {
window.FBDATA = window.FBDATA || {};

FBDATA.startScenarios_york_wessex_867 = [
  { id:'aethelred_wessex_867', bookmarkIds:['867'], alwaysUnlocked:true,
    rulerRealmId:'wessex', governmentForm:'territorial', fixedProvinceId:'winchester',
    characterName:'Æthelred I', sex:'m', startCulture:'english', startReligion:'catholic',
    name:'Æthelred I of Wessex', desc:'Govern Wessex from its existing court. Balance the kingdom’s needs against the uncertain situation to the north.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 20 · existing court family', desc:'Keep the court’s generated relatives and supporting households.' } },
    onboarding:'ruler',
    intro:'You are Æthelred I, king of Wessex. Your existing court governs from Winchester. Review Rank & Realm, manage the kingdom’s resources and decide which diplomatic or military commitments it can sustain.' },
  { id:'york_household_867', bookmarkIds:['867'], alwaysUnlocked:true,
    fixedProvinceId:'york', startCulture:'english', startReligion:'catholic', startAge:24,
    name:'York Artisan Household', desc:'An invented household in occupied York. Keep your craft alive, consider a short repair order and decide whether to stay.',
    tier:1, profession:'craftsman', gold:15, prestige:5, piety:0,
    familyPresets:{
      standard:{ name:'Young artisan household', diff:'age 24 · parents and siblings' },
      established:{ name:'Established artisan household', diff:'age 24 · spouse and young children' }
    },
    tracks:['york_household_track_867'], trackLocations:{ york_household_track_867:['york'] },
    intro:'You are {name}, an artisan of {province}. Your household needs a livelihood under the current lord. Local repairs, ordinary bench work and the question of staying give you choices. Open your household story in Deeds to begin.' },
  /* The Norse leader at occupied York. His court is Norse pagan in the fresh
     norse_york revision below; retained worlds keep their inherited court
     faith for matching saves and do not offer new campaigns. */
  { id:'halfdan_york_867', bookmarkIds:['867'], alwaysUnlocked:true,
    rulerRealmId:'york', governmentForm:'territorial', fixedProvinceId:'york',
    characterName:'Halfdan Ragnarsson', sex:'m', startCulture:'norse', startReligion:'catholic',
    revisionIdentities:{ '867':{ governments_v2_islamic_v1_norse_york_v1:{ startReligion:'norse_pagan' } } },
    name:'Halfdan Ragnarsson at York', desc:'Lead the Norse court that holds York after the great army’s capture of the city. The English kingdoms around you are not yet conquered.',
    tier:6, profession:'noble', gold:120, prestige:150, piety:10,
    familyPresets:{ standard:{ name:'Existing court household', diff:'age 47 · existing court family', desc:'Keep Halfdan and the generated supporting household. His brothers and the army’s other leaders are not individually reconstructed.' } },
    onboarding:'ruler',
    intro:'You are Halfdan Ragnarsson. Your court holds York and its county, while Northumbria, Mercia, East Anglia and Wessex keep their own kings. Review Rank & Realm, then decide whether to hold York, raise forces through ordinary war controls or seek terms with your neighbors.' }
];

Array.prototype.push.apply(FBDATA.startScenarios, FBDATA.startScenarios_york_wessex_867);

/* The fresh 867 world gives the York court its Norse pagan faith. It copies
   the previous fresh world and changes only that court's declared religion,
   so county communities, other courts and retained revisions stay as they
   were. Saves of earlier revisions keep restoring their own worlds. */
(function () {
  'use strict';
  var raw = FBDATA.bookmarks['867'];
  var sourceId = 'governments_v2_islamic_v1';
  var revisionId = 'governments_v2_islamic_v1_norse_york_v1';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  if (!raw.revisions[sourceId] || raw.revisions[revisionId])
    throw new Error('Missing source or duplicate Norse York world revision.');
  var source = Object.assign({},raw,raw.revisions.baseline,raw.revisions[sourceId]);
  var revision = {};
  /* The public revision contract replaces whole fields. Preserve every
     supported effective source field. */
  ['geography','opening','openingRevision','provinces','realms','duchies','kingdoms',
    'empires','straits','crossingClasses','localInstitutions','settlementLayout',
    'climate','religiousHeads','starts','stories','storyRegions','scripted',
    'openingRevisions','openingLegacyRevision','startLocations'].forEach(function (field) {
    if (source[field] !== undefined) revision[field] = copy(source[field]);
  });
  var found = false;
  revision.realms = revision.realms.map(function (realm) {
    if (realm.id !== 'york') return realm;
    found = true;
    return Object.assign({},realm,{religion:'norse_pagan'});
  });
  if (!found) throw new Error('Missing York court in the 867 source revision.');
  /* Nonempty religious-offer scopes match exact revision ids. Carry the
     source's offers so the fresh world keeps every religious activity. */
  [FBDATA.religiousActivities,FBDATA.religiousPatronage].forEach(function (table) {
    Object.keys(table || {}).forEach(function (id) {
      var definition = table[id], openings = definition.openings;
      if (!openings || !openings.some(function (o) { return o.id === '867' && o.revision === sourceId; })) return;
      if (openings.some(function (o) { return o.id === '867' && o.revision === revisionId; })) return;
      table[id] = Object.assign({},definition,{openings:copy(openings).concat([{id:'867',revision:revisionId}])});
    });
  });
  raw.revisions[revisionId] = revision;
  raw.revision = revisionId;
})();
});
