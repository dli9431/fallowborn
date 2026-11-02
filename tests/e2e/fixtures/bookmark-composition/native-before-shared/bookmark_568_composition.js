/* Final trusted ownership assembly. All 568 contributors remain detached until
   main publishes this complete unit through the shared canonical composer. */
(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function own(value, key) { return !!value && Object.prototype.hasOwnProperty.call(value,key); }
  FBDATA.bookmarkCompositionSources = FBDATA.bookmarkCompositionSources || {};
  var source = {source:'data/bookmark_568.js',bookmarkId:'568'};
  try {
    var draft = FBDATA.bookmarkCompositionDrafts && FBDATA.bookmarkCompositionDrafts.spring_568;
    if (!draft) throw new Error('Missing 568 composition draft.');
    if (draft.faults.length) {
      source.source = draft.faults[0].source;
      throw new Error(draft.faults.map(function (fault) { return fault.message; }).join('\n'));
    }
    if (!draft.bookmark || !draft.catalogs || draft.bookmark.revision !== 'eastern_courts_v3')
      throw new Error('Missing complete 568 revision chain.');
    var bookmark = copy(draft.bookmark), units = copy(draft.starts);
    if (units.length !== 8) throw new Error('Missing complete 568 start groups.');
    units.forEach(function (unit) {
      var id = unit.definition.id;
      function binding(layer, authored) {
        var result = {};
        if (Array.isArray(authored.starts)) {
          var index = authored.starts.indexOf(id); result.offered = index >= 0;
          if (index >= 0) result.after = authored.starts.slice(0,index);
          layer.starts = layer.starts.filter(function (ref) { return ref !== id; });
        }
        if (own(authored.startLocations,id)) { result.locations = copy(authored.startLocations[id]); delete layer.startLocations[id]; }
        return result;
      }
      unit.bindings = {root:binding(bookmark,draft.bookmark),revisions:{}};
      Object.keys(bookmark.revisions).forEach(function (revision) {
        unit.bindings.revisions[revision] = binding(bookmark.revisions[revision],draft.bookmark.revisions[revision]);
      });
    });
    // Each personal graph is indivisible with its own start. Missing graphs
    // remain canonical start faults; they are never installed separately.
    source.input = {id:'spring_568',source:source.source,bookmark:bookmark,catalogs:copy(draft.catalogs),
      availability:copy(draft.availability),starts:units};
  } catch (error) { source.faults = [error.message]; }
  FBDATA.bookmarkCompositionSources.spring_568 = source;
})();
