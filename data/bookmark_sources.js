/* Carry the completed household identities into the assembled world after
   their owning start and story sources have supplied the complete records. */
FB.bookmarkSources.stage({source:'data/bookmark_sources.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  ['damascus_household_634','ctesiphon_household_634'].forEach(function (id) {
    var unit = source.input.starts.find(function (entry) { return entry.definition.id === id; });
    var identities = unit && unit.definition.revisionIdentities && unit.definition.revisionIdentities['634'];
    if (!identities || !identities.core_identities_v3) {
      source.faults = (source.faults || []).concat(['Missing 634 household identity: ' + id]);
      return;
    }
    identities.core_courts_v4 = JSON.parse(JSON.stringify(identities.core_identities_v3));
  });
});
/* Every native date is declared explicitly. Reference-only source ids allow
   canonical shared selectors to be checked before independent publication. */
FB.bookmarkSources.finish(['476','493','568','634','711','800','867','1066','1096','1204','1241']);
