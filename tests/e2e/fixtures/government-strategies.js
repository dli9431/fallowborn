/* Test-only alternate rules. Never included by the shipped entry point. */
(function () {
  'use strict';
  var G = FB.governments;
  function register(slot, base, changes) {
    G.register(slot, 'fixture_alternative', Object.assign({}, G.strategy(slot, base), changes));
  }
  register('levy', 'feudal_levy', {
    fieldHost:function () { return 19; },
    settlementBase:function () { return 77; },
    composition:function () { return { units:{ levy:17 }, entries:[], total:17 }; },
    mayCall:function () { return false; }
  });
  register('revenue', 'demesne_revenue', {
    realmIncome:function () { return 31; },
    remittance:function () { return 0; },
    loanAssignment:function () { return 3; }
  });
  register('council', 'royal_council', { seats:function () { return []; } });
  register('diplomacy', 'territorial_diplomacy', {
    warGoals:function () { return []; },
    declaration:function () { return { valid:false, reason:'fixture refusal', unlawful:false, law:null, key:null }; },
    subjectRelation:function () { return { kind:'independent', liegeId:null }; }
  });
  register('ai', 'realm_decisions', {
    goals:function () { return { warChance:0, allianceChance:0 }; },
    breakawayChance:function () { return 0; },
    campaign:function () { return false; }
  });
  register('territory', 'fixed', { profile:function () { return { movingCourt:false, holdsCounties:false }; } });
  register('succession', 'dynastic', { vacancy:function () { return { allowed:false }; } });
  register('holders', 'direct', { conquest:function (state, rid) {
    return Object.keys(state.realms).sort().filter(function (id) { return state.realms[id].alive && state.realms[id].liege === rid; })[0] || rid;
  } });
  register('consent', 'territorial', {
    decision:function () { return { allowed:false, reason:'fixture_consent', required:['fixture'], approvals:{} }; }
  });
  G.register('ladder', 'fixture_alternative', { bands:{ 6:{ mayHoldCouncil:false } } });
})();
