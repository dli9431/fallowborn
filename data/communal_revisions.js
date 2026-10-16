/* Communal-minority revisions (jewish_samaritan_v3).

   Each dated bookmark declares one table in FBDATA.communalRevisions[id]:
     source        the revision the new one extends
     revision      the new revision id
     layoutId      settlement layout id for the extended layout
     minorities    {county, religion, culture}: a community added with
                   minorityShare taken from the county's largest community,
                   unless that faith is already present
     layoutDefaults optional {county:[rows]} used when the source layout has
                   no rows for a county the revision extends
     sites         {id, county, name, kind}: a shared physical site from
                   FBDATA.communalSites appended to the county's settlements
     institutions  {id, county, site, city, kind, religion, culture,
                   profileId, abbeyId?}: a vacant fresh-only institution at
                   the named site, or the county's first settlement when null

   New minority weights are simulation quantities, never historical
   percentages. This file loads after every dated bookmark builder and before
   the rollouts that derive from these revisions; each new revision is placed
   directly after its source. Retained revisions and the fresh default remain
   unchanged. */
FBDATA.communalRevisions = FBDATA.communalRevisions || {};
FBDATA.communalRevisionDefaults = { minorityShare:100 };
/* Physical sites shared by every date that seats a community there. */
FBDATA.communalSites = {
  samaria_neapolis_w15:{x:35.26,y:32.22,
    names:[{from:400,to:649,name:'Neapolis'},{from:650,name:'Nablus'}]}
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  Object.keys(FBDATA.communalRevisions).forEach(function (bookmarkId) {
    var d = FBDATA.communalRevisions[bookmarkId], b = FBDATA.bookmarks[bookmarkId];
    var source = b && b.revisions && b.revisions[d.source];
    if (!source) throw new Error('Missing communal source revision: ' + bookmarkId + '/' + d.source);
    var share = d.minorityShare === undefined ? FBDATA.communalRevisionDefaults.minorityShare : d.minorityShare;
    var world = Object.assign({},b,b.revisions.baseline,source);
    var provinces = copy(world.provinces), institutions = copy(world.localInstitutions || {});
    var layout = world.settlementLayout ? copy(FBDATA.settlementLayouts[world.settlementLayout]) : null;
    function county(pid) { return provinces.filter(function (p) { return p.id === pid; })[0]; }
    (d.minorities || []).forEach(function (m) {
      var p = county(m.county);
      if (!p || p.wasteland) throw new Error('Missing communal county: ' + m.county);
      var rows = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
      if (rows.some(function (row) { return row.religion === m.religion; })) return;
      var largest = rows.reduce(function (a,row) { return row.populationShare0 > a.populationShare0 ? row : a; },rows[0]);
      if (!(largest.populationShare0 >= share)) throw new Error('Missing communal population weight: ' + m.county);
      largest.populationShare0 -= share;
      rows.push({culture:m.culture,religion:m.religion,populationShare0:share,paired:true});
      p.communities = rows;
    });
    Object.keys(d.layoutDefaults || {}).forEach(function (pid) {
      if (layout && !layout[pid]) layout[pid] = copy(d.layoutDefaults[pid]);
    });
    (d.sites || []).forEach(function (s) {
      var p = county(s.county), rows = layout ? layout[s.county] : p.settlements;
      if (!FBDATA.communalSites[s.id]) throw new Error('Unknown communal site: ' + s.id);
      FBDATA.settlementSites[s.id] = copy(FBDATA.communalSites[s.id]);
      rows.push({site:s.id,name:s.name,kind:s.kind});
      if (p.settlements) p.settlements = copy(rows);
    });
    (d.institutions || []).forEach(function (i) {
      var p = county(i.county), rows = layout ? layout[i.county] : p.settlements;
      if (!rows || !rows.length || i.site && !rows.some(function (row) { return row.site === i.site; }))
        throw new Error('Missing communal settlement: ' + i.id);
      institutions[i.id] = {city:i.city,kind:i.kind,provinceId:i.county,site:i.site || rows[0].site,
        religion:i.religion,culture:i.culture,profileId:i.profileId,jurisdictionIds:[i.county],
        vacant:true,freshOnly:true};
      if (i.abbeyId) institutions[i.id].abbeyId = i.abbeyId;
    });
    var changes = {provinces:provinces,localInstitutions:institutions};
    if (layout) {
      FBDATA.settlementLayouts[d.layoutId] = layout;
      changes.settlementLayout = d.layoutId;
    }
    /* Keep revision order: the new revision follows its source. */
    var revisions = b.revisions, keys = Object.keys(revisions), at = keys.indexOf(d.source);
    var later = keys.slice(at + 1).map(function (key) { var value = revisions[key]; delete revisions[key]; return [key, value]; });
    revisions[d.revision] = Object.assign({},source,changes);
    later.forEach(function (row) { if (row[0] !== d.revision) revisions[row[0]] = row[1]; });
  });
})();
