/* Browser-only reference for the independent-node customary retention owner.
   Keep the graph path separate from the production partition implementation. */
(function () {
  'use strict';
  window.authorityRetentionReference = function (s) {
    var R = FB.ledgerRetention, fields = ['possession','disputed','abandoned'];
    if (!R || !R.due(s) || !s.authority || typeof s.authority !== 'object' || Array.isArray(s.authority)) return false;
    var graph = R.graph(R.cutoff(s)), rights = Array.isArray(s.authority.rights) ? s.authority.rights : [];
    rights.forEach(function (row, ri) {
      row.history.forEach(function (entry, hi) {
        var permanent = fields.indexOf(entry.event) < 0 || !!entry.evidence || entry.turn >= s.turn;
        graph.add(ri + ':' + hi, permanent, entry.turn);
      });
    });
    var keep = graph.keep();
    if (!R.folds(graph, keep)) return false;
    return R.stage(s, ['authority'], function (t) {
      t.authority.rights.forEach(function (row, ri) {
        var parts = R.split(row.history, function (entry, hi) { return ri + ':' + hi; }, keep);
        if (!parts.folded.length) return;
        if (!row.retiredHistory) row.retiredHistory = R.blank(fields);
        parts.folded.forEach(function (entry) { R.add(row.retiredHistory, entry.event, 1); });
        row.history = parts.kept;
      });
      return true;
    }, function (t) { FB.save.v4.validateAuthority(t.authority, t); });
  };
})();
