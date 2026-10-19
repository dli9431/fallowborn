/* A new fresh-campaign revision preserves the original Ravenna site indices
   and generated imperial household for already matching baseline saves. */
FBDATA.bookmarkRevisionContent_frederick_1241 = {
  bookmarkId:'1241', revision:'frederick_v2',
  realms:[
    { id:'hre_1241', royalCourt:{ dynasty:'Hohenstaufen', spouseId:'isabella',
      members:[
        {id:'isabella',name:'Isabella of England',sex:'f',born:1214,culture:'english',religion:'catholic',spouseId:'ruler',homeProvinceId:'capua'},
        {id:'conrad',name:'Conrad IV',sex:'m',born:1228,culture:'german',religion:'catholic',fatherId:'ruler',homeProvinceId:'frankfurt'},
        {id:'henry',name:'Henry',sex:'m',born:1238,culture:'german',religion:'catholic',fatherId:'ruler',motherId:'isabella',homeProvinceId:'capua'},
        {id:'margaret',name:'Margaret',sex:'f',born:1237,culture:'german',religion:'catholic',fatherId:'ruler',motherId:'isabella',homeProvinceId:'capua'}
      ] } },
    { id:'papacy_1241', ecclesiastical:{profileId:'papal_temporal_1241',officeId:'catholic',institutionId:null} }
  ],
  layouts:{ ravenna:[
    {site:'faenza_camp_1241',name:'Faenza-area encampment',kind:'village',fill:true},
    {site:'geo_rimini_3169361',name:'Rimini',kind:'village',fill:true},
    {site:'geo_forli_3176746',name:'Forlì',kind:'village',fill:true},
    {site:'geo_cesena_3178957',name:'Cesena',kind:'village',fill:true},
    {site:'geo_san_marino_3168070',name:'San Marino',kind:'village',fill:true},
    {site:'geo_faenza_3177300',name:'Faenza',kind:'village',fill:true},
    {site:'ravenna_head',name:'Ravenna',kind:'village',fill:true}
  ] }
};

(function () {
  'use strict';
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var b=FBDATA.bookmarks['1241'], d=FBDATA.bookmarkRevisionContent_frederick_1241;
  var source=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
  var realms=copy(source.realms), locations=copy(source.startLocations);
  d.realms.forEach(function (delta) {
    var r=realms.find(function (r) { return r.id===delta.id; });
    if (!r) throw new Error('Missing revised 1241 court: '+delta.id);
    Object.assign(r,copy(delta));
  });
  var layoutId='1241_frederick_v2', layouts=copy(FBDATA.settlementLayouts[source.settlementLayout]);
  Object.keys(d.layouts).forEach(function (id) { layouts[id]=copy(d.layouts[id]); });
  /* One kilometre north of the physical Faenza marker is a simulation anchor
     for the surrounding camp, not a recovered medieval camp coordinate. */
  FBDATA.settlementSites.faenza_camp_1241={x:11.87948,y:44.30007};
  FBDATA.settlementLayouts[layoutId]=layouts;
  locations.frederick_1241=['ravenna'];
  b.revisions[d.revision]={realms:realms,startLocations:locations,settlementLayout:layoutId};
  b.revision=d.revision;
})();
