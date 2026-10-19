/* Fresh homes use a separate layout; retained campaigns keep their slot ids. */
FBDATA.bookmarkRevisionContent_alexander_1241 = {
  bookmarkId:'1241', revision:'alexander_v2',
  layouts:{ rostov:[
    {site:'pereslavl_zalessky_1241',name:'Pereslavl-Zalessky',kind:'town'},
    {site:'rostov_head',name:'Rostov',kind:'village',fill:true},
    {site:'geo_yaroslavl_468902',name:'Yaroslavl',kind:'village',fill:true},
    {site:'geo_tver_480060',name:'Tver',kind:'village',fill:true},
    {site:'geo_kostroma_543878',name:'Kostroma',kind:'village',fill:true},
    {site:'geo_khimki_550280',name:'Khimki',kind:'village',fill:true},
    {site:'geo_ust_sheksna_500004',name:'Ust-Sheksna',kind:'village',fill:true}
  ] }
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var b=FBDATA.bookmarks['1241'], d=FBDATA.bookmarkRevisionContent_alexander_1241;
  var source=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
  var layouts=copy(FBDATA.settlementLayouts[source.settlementLayout]);
  Object.keys(d.layouts).forEach(function (id) { layouts[id]=copy(d.layouts[id]); });
  /* Modern town coordinates locate the northern place, not a recovered house. */
  FBDATA.settlementSites.pereslavl_zalessky_1241={x:38.856153,y:56.738133};
  FBDATA.settlementLayouts['1241_alexander_v2']=layouts;
  var starts=copy(source.starts), locations=copy(source.startLocations);
  starts.push('alexander_1241');
  locations.alexander_1241=['rostov'];
  b.revisions[d.revision]={realms:copy(source.realms), starts:starts,
    startLocations:locations, settlementLayout:'1241_alexander_v2'};
  b.revision=d.revision;
})();
