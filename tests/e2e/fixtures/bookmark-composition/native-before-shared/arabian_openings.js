/* Independently dated city-level worship reconstructions. Exact mosque
   footprints, custodians, staff, endowed property and journey access are not
   declared here. Sources and simulation terms: docs/designs/religions.md. */
(function () {
  'use strict';
  var openings = {
    '800':{sources:['inhabited_v2_governments_v2','inhabited_v2_governments_v2_islamic_v1'],
      counties:['mecca','medina']},
    '867':{sources:['inhabited_v2_governments_v2','inhabited_v2_governments_v2_islamic_v1'],
      counties:['mecca','medina']},
    '1066':{sources:['inhabited_v2_governments_v2','inhabited_v2_governments_v2_islamic_v1'],
      counties:['mecca']},
    '1204':{sources:['inhabited_v2'],counties:['mecca']}
  };
  Object.keys(openings).forEach(function (id) {
    var base = FBDATA.bookmarks[id], declaration = openings[id], revisions = base.revisions;
    base.revisions = Object.assign({}, revisions);
    declaration.sources.forEach(function (sourceId) {
      if (!revisions[sourceId]) throw new Error('Missing Arabian source revision: ' + id + '/' + sourceId);
      var source = Object.assign({}, revisions.baseline, revisions[sourceId]);
      var layoutId = source.settlementLayout || base.settlementLayout;
      var layout = FBDATA.settlementLayouts[layoutId];
      /* The retained 800 layout generates these counties. Only this explicit
         review world binds the attested cities to their existing city anchors,
         without importing the later settlement fill list or a mosque plan. */
      if (id === '800') {
        layout = JSON.parse(JSON.stringify(layout));
        declaration.counties.forEach(function (pid) {
          if (layout[pid]) return;
          var town = (source.provinces || base.provinces).filter(function (p) { return p.id === pid; })[0];
          if (!town || !FBDATA.settlementSites[pid]) throw new Error('Missing Arabian city anchor: ' + pid);
          layout[pid] = [{site:pid,name:town.name,kind:'city'}];
        });
        layoutId += '_arabian_v1';
        FBDATA.settlementLayouts[layoutId] = layout;
      }
      var institutions = JSON.parse(JSON.stringify(source.localInstitutions || base.localInstitutions || {}));
      var revisionId = sourceId + '_arabian_v1';
      declaration.counties.forEach(function (pid) {
        var province = (source.provinces || base.provinces).filter(function (p) { return p.id === pid; })[0];
        var seat = layout && layout[pid] && layout[pid].filter(function (s) {
          return s.kind === 'town' || s.kind === 'city';
        })[0];
        if (!province || province.wasteland || !seat) throw new Error('Missing Arabian town: ' + id + '/' + pid);
        institutions[pid + '_congregation_' + id] = {
          city:province.name, kind:'congregation', provinceId:pid, site:seat.site,
          religion:'sunni', culture:'arabic', profileId:'arabian_local_congregation_' + id,
          jurisdictionIds:[pid], vacant:true, freshOnly:true
        };
        FBDATA.religiousActivities[pid + '_local_worship_' + id].openings.push({id:id,revision:revisionId});
      });
      base.revisions[revisionId] = Object.assign({}, source, {localInstitutions:institutions,settlementLayout:layoutId});
    });
  });
})();
