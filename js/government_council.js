/* Seats are data; eligibility and vacancy choice are government rules. */
(function () {
  'use strict';
  var G = FB.governments;
  var rules = G.register('council', 'royal_council', {
    vacancy:function (state, rid, c) { return c.candidates.length ? c.candidates[0] : null; }
  });
  G.bind('council', 'royal_council', 'seats', 'councilSeats', []);
  G.bind('council', 'royal_council', 'eligible', 'councilHolderEligible', ['seat','candidateId','appointment']);
  var baselineSeats = rules.seats;
  rules.seats = function (state, rid, c) {
    var seats = baselineSeats(state, rid, c);
    var selected = G.parameters(state, rid, 'council').seats;
    return selected ? seats.filter(function (seat) { return selected.indexOf(seat.id) >= 0; }) : seats;
  };
  G.contract('council', ['seats','eligible','vacancy']);
})();
