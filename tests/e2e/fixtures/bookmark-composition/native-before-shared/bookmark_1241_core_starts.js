/* New offerings and rural slots belong only to this fresh world. */
FBDATA.bookmarkRevisionContent_core_starts_1241 = {
  bookmarkId:'1241', revision:'core_starts_v2',
  layouts:{ szekesfehervar:[
    {site:'royal_heartland_farm_1241',name:'Heartland farmstead',kind:'village'}
  ] }
};
(function () {
  'use strict';
  function copy(value) {return JSON.parse(JSON.stringify(value));}
  var b=FBDATA.bookmarks['1241'],d=FBDATA.bookmarkRevisionContent_core_starts_1241;
  var source=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
  var layouts=copy(FBDATA.settlementLayouts[source.settlementLayout]);
  /* Make room within eight slots; earlier layouts keep this modern fill. */
  layouts.szekesfehervar=layouts.szekesfehervar.filter(function (entry) {
    return entry.site!=='geo_kaposvar_3050616';
  });
  /* A fictional rural point near the existing camps, not a historical estate.
     Obuda stays the first slot for Bela and the original guarded party. */
  FBDATA.settlementSites.royal_heartland_farm_1241={x:18.70,y:47.17};
  layouts.szekesfehervar.splice(1,0,copy(d.layouts.szekesfehervar[0]));
  var layoutId='1241_core_starts_v2',starts=copy(source.starts),locations=copy(source.startLocations);
  FBDATA.settlementLayouts[layoutId]=layouts;
  starts.push('koten_1241');
  locations.koten_1241=['szekesfehervar'];
  b.revisions[d.revision]={realms:copy(source.realms),starts:starts,startLocations:locations,
    settlementLayout:layoutId,opening:copy(source.opening),openingRevision:source.openingRevision,
    openingRevisions:copy(source.openingRevisions)};
  b.revision=d.revision;
})();
