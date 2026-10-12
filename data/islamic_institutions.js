/* Dated 1066 urban study contexts. A city anchor is not an identified madrasa,
   mosque building, historical staff list or endowment deed. */
(function () {
  'use strict';
  var circles = {
    baghdad_shafii_circle_1066:{
      city:'Baghdad',kind:'school',provinceId:'baghdad',site:'baghdad',
      religion:'sunni',culture:'arabic',profileId:'baghdad_shafii_study_1066',
      vacant:true,jurisdictionIds:['baghdad']
    },
    nishapur_shafii_ashari_circle_1066:{
      city:'Nishapur',kind:'school',provinceId:'nishapur',site:'nishapur',
      religion:'sunni',culture:'persian',profileId:'nishapur_shafii_ashari_study_1066',
      vacant:true,jurisdictionIds:['nishapur']
    }
  };
  var bookmark = FBDATA.bookmarks['1066'], revisions = bookmark.revisions;
  bookmark.revisions = Object.assign({}, revisions);
  Object.keys(revisions).forEach(function (sourceId) {
    if (!/_islamic_v1$/.test(sourceId)) return;
    var source = Object.assign({}, revisions.baseline, revisions[sourceId]);
    bookmark.revisions[sourceId + '_institutions_v1'] = Object.assign({}, source, {
      localInstitutions:Object.assign({}, source.localInstitutions || {}, circles)
    });
  });
})();
