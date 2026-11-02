/* Local meeting scopes use existing settlement anchors. These declarations
   locate lay participation, not an excavated shrine or a historical building. */
(function () {
  'use strict';
  var rows = [
    {bookmark:'476',sources:['wider_v2'],province:'garama',city:'Garama',
      institution:'garama_offering_community_476',profile:'garama_offering_community',faith:'berber_traditional',
      activities:['garama_funeral_offerings_476'],patronage:[]},
    {bookmark:'493',sources:['world_v2'],province:'garama',city:'Garama',
      institution:'garama_offering_community_493',profile:'garama_offering_community',faith:'berber_traditional',
      activities:['garama_funeral_offerings_493'],patronage:[]},
    {bookmark:'711',sources:['terrain_v2'],province:'kairouan',city:'Kairouan',
      institution:'kairouan_muslim_congregation_711',profile:'kairouan_lay_711',faith:'umayyad_sunni_711',
      activities:['kairouan_household_worship_711'],patronage:[]},
    {bookmark:'800',sources:['inhabited_v2'],province:'kairouan',city:'Kairouan',
      institution:'kairouan_muslim_congregation_800',profile:'kairouan_lay_800',faith:'sunni',
      activities:['kairouan_household_worship_800'],patronage:[]},
    {bookmark:'867',sources:['inhabited_v2'],province:'kairouan',city:'Kairouan',
      institution:'kairouan_muslim_congregation_867',profile:'kairouan_lay_867',faith:'sunni',
      activities:['kairouan_household_worship_867'],patronage:[]},
    {bookmark:'1066',sources:['inhabited_v2'],province:'kumbi_district',city:'Kumbi district',
      institution:'ghana_muslim_congregation_1066',profile:'ghana_muslim_learning_1066',faith:'sunni',
      activities:['ghana_muslim_household_learning_1066','ghana_mosque_learning_service_1066'],
      patronage:['ghana_muslim_learning_support_1066','ghana_public_learning_support_1066'],
      property:'ghana_muslim_learning_property_1066'},
    {bookmark:'1204',sources:['inhabited_v2'],province:'gao_district',city:'Gao',
      institution:'gao_muslim_congregation_1204',profile:'gao_lay_1204',faith:'sunni',
      activities:['gao_household_worship_1204'],patronage:[]}
  ];
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function opening(table, ids, bookmark, revision) {
    ids.forEach(function (id) {
      var d = table[id];
      if (!d) throw new Error('Missing African activity declaration: ' + id);
      if (!d.openings.some(function (v) { return v.id === bookmark && v.revision === revision; }))
        d.openings.push({id:bookmark,revision:revision});
    });
  }
  rows.forEach(function (row) {
    var base = FBDATA.bookmarks[row.bookmark], revisions = base.revisions, found = false;
    base.revisions = Object.assign({},revisions);
    Object.keys(revisions).forEach(function (sourceId) {
      if (/_african_v1$/.test(sourceId) || !row.sources.some(function (id) {
        return sourceId === id || sourceId.indexOf(id + '_') === 0;
      })) return;
      var source = Object.assign({},revisions.baseline,revisions[sourceId]);
      var p = (source.provinces || base.provinces).filter(function (v) { return v.id === row.province; })[0];
      var geography = FBDATA.geographies[source.geography || base.geography];
      var layoutId = source.settlementLayout === undefined ? base.settlementLayout : source.settlementLayout;
      if (layoutId === undefined) layoutId = geography.defaultLayout;
      var slots = p && (p.settlements || (FBDATA.settlementLayouts[layoutId] || {})[row.province]);
      var site = slots && slots[0] && slots[0].site;
      var point = site && (geography.sites || FBDATA.settlementSites)[site];
      if (!p || p.wasteland || !site || !point || point.x < -11 || point.x > 70 || point.y < 13 || point.y > 66)
        throw new Error('Missing in-bounds African meeting scope: ' + row.bookmark + '/' + sourceId);
      // A world without its own table starts empty; the legacy 476 catalogue
      // has no seats in other bookmarks' geographies.
      var defs = copy(source.localInstitutions || base.localInstitutions || {});
      if (defs[row.institution]) throw new Error('Duplicate African local institution: ' + row.institution);
      defs[row.institution] = {city:row.city,kind:row.bookmark === '476' || row.bookmark === '493'
          ? 'ritual_community' : 'congregation',
        profileId:row.profile,provinceId:row.province,site:site,religion:row.faith,culture:p.culture,
        vacant:true,freshOnly:true,jurisdictionIds:[row.province]};
      if (row.property) defs[row.institution].abbeyId = row.property;
      var revision = sourceId + '_african_v1';
      base.revisions[revision] = Object.assign({},source,{localInstitutions:defs});
      opening(FBDATA.religiousActivities,row.activities,row.bookmark,revision);
      opening(FBDATA.religiousPatronage,row.patronage,row.bookmark,revision);
      found = true;
    });
    if (!found) throw new Error('Missing African dated review world: ' + row.bookmark);
  });
})();
