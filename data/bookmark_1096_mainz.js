/* A fresh dated shelter revision; retained worlds acquire no new people. */
window.FBDATA = window.FBDATA || {};
FBDATA.bookmarkRevisionContent_1096_mainz={
  bookmarkId:'1096',revision:'mainz_household_v1',
  realms:[{id:'mainz_custody_1096',name:'Mainz',capital:'mainz',color:'#897368',aggression:0,
    rank:1,religion:'catholic',government:'territorial',liege:'hre_1096',
    ruler:{sex:'m',culture:'german',born:1060,mar:5,trait:'patient',generated:true}}],
  layouts:{mainz:[{site:'mainz_refuge_1096',name:'Archbishop’s residence',kind:'town'}]},
  localInstitutions:{mainz_see_1096:{city:'Mainz',kind:'see',provinceId:'mainz',site:'mainz_refuge_1096',
    culture:'german',religion:'catholic',officeId:'mainz_archbishop_1096',officeSystem:null,
    jurisdictionIds:['mainz'],freshOnly:true,
    representative:{name:'Ruthard',born:1050,sex:'m',role:'priest'}}}
};
(function () {
  'use strict';
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  var b=FBDATA.bookmarks['1096'],prior=Object.assign({},b,b.revisions.baseline,b.revisions[b.revision]);
  var content=FBDATA.bookmarkRevisionContent_1096_mainz;
  var places=copy(prior.startLocations),provinces=copy(prior.provinces),realms=copy(prior.realms);
  var institutions=copy(prior.localInstitutions),layouts=copy(FBDATA.settlementLayouts[prior.settlementLayout]);
  /* This generated custodian is a civil-permission abstraction, distinct
     from the single named archbishop. Neither office claims every estate. */
  provinces.filter(function(p) { return p.id === 'mainz'; })[0].realm='mainz_custody_1096';
  realms=realms.concat(copy(content.realms));
  FBDATA.settlementSites.mainz_refuge_1096={x:8.272,y:50.001};
  layouts.mainz.filter(function(site) { return site.site === 'mainz_head'; }).forEach(function(site) {
    site.kind='town';delete site.fill;
  });
  layouts.mainz=layouts.mainz.concat(copy(content.layouts.mainz));
  Object.assign(institutions,copy(content.localInstitutions));
  /* Empty locations disable the new start in every retained revision. */
  b.startLocations.mainz_jewish_household_1096=[];
  Object.keys(b.revisions).forEach(function(id) {
    if (b.revisions[id].startLocations) b.revisions[id].startLocations.mainz_jewish_household_1096=[];
  });
  places.mainz_jewish_household_1096=['mainz'];
  FBDATA.settlementLayouts.mainz_household_1096=layouts;
  b.revisions.mainz_household_v1={provinces:provinces,realms:realms,localInstitutions:institutions,
    settlementLayout:'mainz_household_1096',startLocations:places,
    stories:prior.stories.concat(['mainz_refuge_1096'])};
  b.revision='mainz_household_v1';
})();
