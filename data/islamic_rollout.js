/* Dated fresh selections retain every predecessor as a resumable revision.
   Kufa is a city-level learning reconstruction, without named staff/property. */
(function () {
  'use strict';
  var bookmark = FBDATA.bookmarks['800'], revisions = bookmark.revisions;
  bookmark.revisions = Object.assign({}, revisions);
  Object.keys(revisions).forEach(function (sourceId) {
    if (!/_islamic_v1$/.test(sourceId)) return;
    var source = Object.assign({}, revisions.baseline, revisions[sourceId]), found = false;
    var provinces = (source.provinces || bookmark.provinces).map(function (province) {
      if (province.id !== 'kufa') return province;
      found = true;
      return Object.assign({}, province, {
        settlements:[{site:'kufa',name:'Kufa',kind:'town'}]
      });
    });
    if (!found) throw new Error('Missing Kufa learning county in 800 revision: ' + sourceId);
    bookmark.revisions[sourceId + '_learning_v1'] = Object.assign({}, source, {
      provinces:provinces,
      localInstitutions:Object.assign({}, source.localInstitutions || {}, {
        kufa_hanafi_circle_800:{
          city:'Kufa',kind:'school',provinceId:'kufa',site:'kufa',
          religion:'sunni',culture:'arabic',profileId:'kufa_hanafi_study_800',
          vacant:true,jurisdictionIds:['kufa']
        }
      })
    });
  });
  var selected = {
    '800':'inhabited_v2_governments_v2_islamic_v1_learning_v1',
    '867':'governments_v2_islamic_v1',
    '1066':'governments_v2_islamic_v1_institutions_v1'
  };
  Object.keys(selected).forEach(function (id) {
    var raw = FBDATA.bookmarks[id], revision = selected[id];
    if (!Object.prototype.hasOwnProperty.call(raw.revisions, revision))
      throw new Error('Missing Islamic rollout revision: ' + id + '/' + revision);
    raw.revision = revision;
  });
})();
