FB.bookmarkSources.stage({source:'data/start_ambitions_634.js',bookmarks:['634'],catalogs:[],shared:[]}, function (FBDATA) {
/* Attach once to the owning start units; retain each revision's existing graph.
   Damascus and Ctesiphon already own their three-goal companion profiles. */
(function () {
  'use strict';
  var source = FBDATA.bookmarkCompositionSources && FBDATA.bookmarkCompositionSources.autumn_634;
  if (!source || !source.input) return;
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  ['umar_634','heraclius_634','medina_household_634','frontier_household_634'].forEach(function (id) {
    var unit = source.input.starts.find(function (entry) { return entry.definition.id === id; });
    if (!unit) return;
    try {
      var declarations = {}, profileId = 'opening_' + id.replace('_household','');
      var profile = FBDATA.openingProfiles_634[profileId];
      if (!profile) throw new Error('Missing opening profile: ' + profileId);
      declarations[profileId] = copy(profile);
      unit.storyInstances[profileId] = copy(profile);
      unit.definition.tracks.push(profileId);
      unit.definition.trackLocations[profileId] = copy(profile.provinceIds);
      if (unit.bindings) Object.keys(unit.bindings.revisions).forEach(function (revision) {
        var override = unit.bindings.revisions[revision].trackOverride;
        if (!override) return;
        var fullId = 'opening_' + id.replace('_634','_court_634');
        var full = FBDATA.openingProfiles_634[fullId];
        if (!full) throw new Error('Missing court opening profile: ' + fullId);
        declarations[fullId] = copy(full);
        unit.storyInstances[fullId] = copy(full);
        override.tracks.push(fullId);
        override.trackLocations[fullId] = copy(full.provinceIds);
      });
      var positions = FB.bookmarkCompositions.captureStories('autumn_634','opening_' + id,declarations);
      unit.storyAfter = Object.assign({},unit.storyAfter,positions);
    } catch (error) { unit.faults = (unit.faults || []).concat(['data/start_ambitions_634.js: ' + error.message]); }
  });
})();
});
