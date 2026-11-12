/* Unchanged constituency implementation and leaf helpers from
   js/government_aristocracy.js at 1d5b1591bc55db1c1287a49a27fd07d16898e807.
   Development-only oracle; loaded only by browser regression specifications. */
(function () {
  'use strict';
  var A = FB.aristocracy;
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function same(a,b) { return !!a && !!b && a.kind === b.kind && a.id === b.id; }
  function appointments(s) { return s.authority && s.authority.appointments || []; }
  function rights(s) { return s.authority && s.authority.rights || []; }
  function live(s,c) { return !!c && !c.dead && !c.unfree && !c.exiled && !c.captive && !c.imprisoned && !FB.justiceCustodyOf(s,c.id); }
  function assignment(s,m) { return appointments(s).filter(function (row) { return row.id === m.appointmentId; })[0]; }
  function jurisdiction(s,m) { return rights(s).filter(function (row) { return m.rightIds.indexOf(row.id) >= 0; }); }
  function rule(s,rid,id) { var p = A.profile(s,rid); return p && p.interests.filter(function (m) { return m.id === id; })[0]; }
  window.GOV_QUERY_REFERENCE = function (s,rid) {
    var data = A.state(s,rid), p = A.profile(s,rid);
    return data && p ? data.interests.map(function (m) {
      var row = assignment(s,m), c = row && s.chars[row.holder.id], local = jurisdiction(s,m);
      var active = !!row && row.status === 'active' && (row.endTurn === null || row.endTurn > s.turn) &&
        live(s,c) && c.dyn === m.dynasty && s.date.year - c.born >= p.minimumAge &&
        (s.holder[m.scope.id] || s.owner[m.scope.id]) === rid && local.length === 2 && local.every(function (r) {
          return r.status === 'active' && r.strength >= 50 && same(r.beneficiary,row.holder);
        });
      return Object.assign(copy(m), { principal:row ? copy(row.holder) : null, active:!!active,
        weight:rule(s,rid,m.id).weight, terms:row && row.provincialTerms ? {
          revenue:1 - row.publicTerms.share, levy:row.provincialTerms.levy, status:row.provincialTerms.status
        } : null });
    }) : [];
  };
})();
