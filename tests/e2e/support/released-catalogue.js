'use strict';

// This function runs in the real browser, before any intentional mod override.
async function releasedCatalogue(selection) {
  function json(value) { return JSON.parse(JSON.stringify(value)); }
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + canonical(value[key]);
    }).join(',') + '}';
    return JSON.stringify(value);
  }
  var items = {}, legacy = {};
  selection.bookmarks.forEach(function (id) {
    var b = json(FB.bookmark(id, 'baseline'));
    b.revision = 'baseline';
    var geography = FB.geography(FB.bookmarkGeography(b));
    var layout = b.settlementLayout === undefined ? geography.defaultLayout : b.settlementLayout;
    items['bookmark/' + id + '/baseline'] = {
      definition:b,
      settlementLayout:FBDATA.settlementLayouts[layout] || null,
      localInstitutions:b.localInstitutions === undefined ? FBDATA.localInstitutions || {} : b.localInstitutions
    };
  });
  selection.geographies.forEach(function (id) {
    // A base's own sites are part of that base. Shared sites belong to the
    // dated layouts; do not freeze unrelated, unreleased bookmark sites here.
    items['geography/' + id] = FB.geography(id);
  });
  selection.faiths.forEach(function (id) {
    if (!FBDATA.religions[id]) throw new Error('Missing released faith ' + id);
    var faith = json(FB.religionOf(id, null));
    delete faith.legacy; delete faith.supersededBy;
    items['faith/' + id] = faith;
    var raw = FBDATA.religions[id];
    if (raw.legacy) legacy[id] = raw.supersededBy;
  });
  items.faithDefaults = FBDATA.faithDefaults;
  selection.governments.forEach(function (id) {
    if (!FBDATA.governmentForms[id]) throw new Error('Missing released government ' + id);
    items['government/' + id] = FBDATA.governmentForms[id];
  });
  selection.eras.forEach(function (id) {
    items['eraDefault/' + id] = FBDATA.eras[id].defaultGovernment;
  });
  var hashes = {};
  for (var key of Object.keys(items).sort()) {
    var bytes = new TextEncoder().encode(canonical(json(items[key])));
    var digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    hashes[key] = Array.from(digest).map(function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  return {hashes:hashes, legacyFaiths:legacy};
}

module.exports = {releasedCatalogue};
