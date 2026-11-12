/* Resolver oracle retained from 9aa049dccfa2488b14a5efccfc5bab7ac2264bfb. Browser-only. */
(function () {
  'use strict';
  function ownKey(value, key) { return !!value && Object.prototype.hasOwnProperty.call(value, key); }
  function plainRecord(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function bookmarkDefinition(id) {
    var bookmarks = FBDATA.bookmarks || {};
    return bookmarks[id] || null;
  }

  function defaultBookmarkId() {
    return FBDATA.defaultBookmark === undefined
      ? '867' : String(FBDATA.defaultBookmark);
  }

  /* Whole-field world revisions preserve definitions, not just opening actors.
     Missing saved stamps select baseline, never the latest fresh campaign. */
  var REVISION_FIELDS = ['hidden','geography','opening','openingRevision','provinces','realms','balance',
    'duchies','kingdoms','empires','straits','crossingClasses','localInstitutions',
    'settlementLayout','climate','religiousHeads','starts','stories','storyRegions','scripted','homeAuthorityPolicies','localPassagePolicies',
    'openingRevisions','openingLegacyRevision','startLocations','startTrackOverrides','openingInfrastructure','siteResourceAssignments',
    'buildingInstitutionAssignments','buildingOperationAssignments','productionSites','productionExchangeAssignments','productionProducerAssignments','buildingSeasonAssignments','maritimeWorkAssignments','relayServiceAssignments'];
  function resolveBookmarkRevision(base, revision) {
    if (!base) return null;
    var selected = revision === undefined ? base.revision || 'baseline' : revision;
    if (typeof selected !== 'string' || !/^[a-z0-9_]+$/.test(selected))
      throw new Error(FB.T('Invalid world revision.'));
    var catalogue = base.revisions;
    if (!catalogue) {
      if (selected !== 'baseline') {
        // Effective worlds retain their selected stamp after dropping the
        // revision table. Rechecking that snapshot must not select it again.
        var original = bookmarkDefinition(base.id);
        if (revision !== undefined || original === base || !original || !plainRecord(original.revisions) ||
            !ownKey(original.revisions,selected) || !plainRecord(original.revisions[selected]))
          throw new Error(FB.T('Unknown world revision: {revision}', {revision:selected}));
      }
      return base;
    }
    if (!plainRecord(catalogue) || !ownKey(catalogue, 'baseline') ||
        !ownKey(catalogue, selected) || !plainRecord(catalogue.baseline) || !plainRecord(catalogue[selected]))
      throw new Error(FB.T('Unknown world revision: {revision}', {revision:selected}));
    var result = Object.assign({}, base);
    ['baseline', selected].forEach(function (key) {
      Object.keys(catalogue[key]).forEach(function (field) {
        if (REVISION_FIELDS.indexOf(field) < 0) throw new Error(FB.T('Invalid world revision field: {field}', {field:field}));
        result[field] = catalogue[key][field];
      });
    });
    result.revision = selected;
    delete result.revisions;
    if (typeof result.opening === 'string') {
      var openingId = result.opening;
      if (!ownKey(result.openingRevisions, openingId))
        throw new Error('Unknown opening revision: ' + openingId);
      result.openingRevision = openingId;
      result.opening = result.openingRevisions[openingId];
    }
    return result;
  }
  window.uncachedBookmark = function (id, revision) {
    return resolveBookmarkRevision(bookmarkDefinition(id === undefined || id === null
      ? defaultBookmarkId() : String(id)), revision);
  };
}());
