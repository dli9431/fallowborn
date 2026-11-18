FB.bookmarkSources.stage({source:'data/bookmark_451_composition.js',bookmarks:['451'],
  catalogs:['settlementLayouts','settlementSites','cultures','religions','governmentForms',
    'administrationProfiles','aristocraticProfiles','mobileProfiles'],shared:[]}, function (FBDATA) {
/* Assemble the complete authoring unit before the native source barrier.
   Canonical world, start, story and import validation belongs to bootstrap. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function merge(target, source) {
    Object.keys(source || {}).forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(target,id)) throw new Error('Duplicate 451 declaration: ' + id);
      target[id] = copy(source[id]);
    });
  }
  var draft = FBDATA.bookmarkDraft451;
  if (!draft) throw new Error('Missing complete 451 scaffold.');
  var b = copy(draft.bookmark), courts = FBDATA.bookmarkRevisionContent_451_governments;
  if (!courts) throw new Error('Missing 451 government declarations.');
  var catalogs = {
    cultures:FBDATA.bookmarkCultures451,religions:FBDATA.bookmarkReligions451,
    governmentForms:courts.governmentForms,administrationProfiles:courts.administrationProfiles,
    aristocraticProfiles:courts.aristocraticProfiles,authorityOffices:FBDATA.bookmarkOffices451,
    mobileProfiles:FBDATA.bookmarkMobileProfiles451,wardrobes:FBDATA.bookmarkWardrobes451
  };
  Object.keys(catalogs).forEach(function (key) {
    if (!catalogs[key]) throw new Error('Missing 451 catalogue: ' + key);
    FBDATA[key] = FBDATA[key] || {};
    merge(FBDATA[key],catalogs[key]);
  });
  Object.keys(FBDATA.bookmarkLexicons451).forEach(function (layer) {
    if (['eras','governments','faiths','cultures'].indexOf(layer) < 0) throw new Error('Invalid 451 lexicon layer: ' + layer);
    FBDATA.lexicons[layer] = FBDATA.lexicons[layer] || {};
    merge(FBDATA.lexicons[layer],FBDATA.bookmarkLexicons451[layer]);
  });
  FBDATA.historicalAmbitions = FBDATA.historicalAmbitions.concat(copy(FBDATA.bookmarkAmbitions451));
  courts.realms.forEach(function (realm) {
    var index = b.realms.map(function (row) { return row.id; }).indexOf(realm.id);
    if (index < 0) b.realms.push(copy(realm));
    else b.realms[index] = copy(realm);
  });
  /* Copy this bounded source identity instead of weakening its existing
     476-493 availability window for any other date. */
  var harran = copy(FBDATA.religions.mesopotamian_traditional);
  harran.availability = {bookmarkIds:['451']};
  merge(FBDATA.religions,{mesopotamian_scaffold_451:harran});
  var sasanian = copy(FBDATA.religions.zoroastrian_sasanian_476);
  sasanian.availability = {yearMin:451,yearMax:468,bookmarkIds:['451'],
    consumers:copy(sasanian.availability.consumers)};
  merge(FBDATA.religions,{zoroastrian_sasanian_scaffold_451:sasanian});
  var inheritedFaiths = ['insular_traditional_476','finnic_traditional_476','woodland_traditional_476',
    'steppe_traditional_476','caucasian_traditional_476','nile_traditional_476','horn_traditional_476',
    'arabian_traditional_476','iranian_traditional_476','sogdian_traditional_476','caucasian_christian_476',
    'aksumite_christian_476','buddhist_476','brahmanical_476','sahel_traditional_476'];
  var availability = {};
  inheritedFaiths.forEach(function (id) { availability[id] = {bookmarkIds:['451']}; });
  Object.keys(FBDATA.bookmarkFaithAvailability451).forEach(function (id) {
    availability[id] = copy(FBDATA.bookmarkFaithAvailability451[id]);
  });
  Object.keys(availability).forEach(function (id) {
    var faith = FBDATA.religions[id], patch = availability[id];
    if (!faith || !faith.availability || !Array.isArray(faith.availability.bookmarkIds) ||
        !patch || Object.keys(patch).length !== 1 || !Array.isArray(patch.bookmarkIds) ||
        patch.bookmarkIds.length !== 1 || patch.bookmarkIds[0] !== '451')
      throw new Error('Invalid 451 faith availability: ' + id);
    if (faith.availability.bookmarkIds.indexOf('451') < 0) faith.availability.bookmarkIds.push('451');
  });
  FBDATA.settlementLayouts['451'] = copy(draft.layouts);
  Object.keys(draft.sites).forEach(function (id) {
    var site = draft.sites[id], prior = FBDATA.settlementSites[id];
    if (prior && Object.keys(site).some(function (key) { return JSON.stringify(prior[key]) !== JSON.stringify(site[key]); }))
      throw new Error('Conflicting 451 physical site: ' + id);
    if (!prior) FBDATA.settlementSites[id] = copy(site);
  });
  var stories = {};
  [FBDATA.householdTracks_451,FBDATA.rulerAgendas_451,FBDATA.openingProfiles_451,FBDATA.storyCampaigns451]
    .forEach(function (table) {
      if (!table) throw new Error('Missing 451 story declarations.');
      merge(stories,table);
    });
  merge(FBDATA.storyInstances,stories);
  b.stories = copy(FBDATA.bookmarkWorldStories451);
  var starts = FBDATA.startScenarios451Scaffold.concat(FBDATA.startScenarios_451);
  var seen = {};
  starts.forEach(function (definition) {
    if (!definition || !definition.id || seen[definition.id] || FBDATA.startScenarios.some(function (row) { return row.id === definition.id; }))
      throw new Error('Duplicate or missing 451 start identity.');
    seen[definition.id] = true;
  });
  b.starts = starts.map(function (definition) { return definition.id; });
  FBDATA.startScenarios = FBDATA.startScenarios.concat(copy(starts));
  FBDATA.bookmarks['451'] = b;
})();
});
