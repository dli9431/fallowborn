/* Dated court identities for explicit review. County populations, historical
   incumbents and the selected fresh revisions remain independently authored. */
(function () {
  var assignments = {
    '800':{ rustamids:'ibadi' },
    '867':{ rustamids:'ibadi', tabaristan:'zaydi' },
    '1066':{ fatimid_1066:'ismaili_fatimid' }
  };
  Object.keys(assignments).forEach(function (id) {
    var base = FBDATA.bookmarks[id], revisions = base.revisions, changes = assignments[id];
    base.revisions = Object.assign({}, revisions);
    Object.keys(revisions).forEach(function (sourceId) {
      if (sourceId !== 'governments_v2' && !/_governments_v2$/.test(sourceId)) return;
      var source = Object.assign({}, revisions.baseline, revisions[sourceId]), found = {};
      var realms = (source.realms || base.realms).map(function (realm) {
        if (!Object.prototype.hasOwnProperty.call(changes, realm.id)) return realm;
        found[realm.id] = true;
        return Object.assign({}, realm, {religion:changes[realm.id]});
      });
      Object.keys(changes).forEach(function (rid) {
        if (!found[rid]) throw new Error('Missing Islamic profile court: ' + id + '/' + rid);
      });
      base.revisions[sourceId + '_islamic_v1'] = Object.assign({}, source, {realms:realms});
    });
  });
})();
