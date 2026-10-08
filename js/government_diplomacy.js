/* Public war quotes and AI declarations share the same government rules. */
(function () {
  'use strict';
  var G = FB.governments;
  var rules = G.register('diplomacy', 'territorial_diplomacy', {
    goalAllowed:function () { return true; },
    subjectRelation:function (state, rid) {
      var liege = rid === 'player' ? state.player.liege : state.realms[rid] && state.realms[rid].liege;
      return { kind:liege ? 'vassal' : 'sovereign', liegeId:liege || null };
    }
  });
  G.bind('diplomacy', 'territorial_diplomacy', 'warGoals', 'warCauses', ['includeBlocked','readOnly']);
  G.bind('diplomacy', 'territorial_diplomacy', 'territorialRights', 'territorialWarRights', ['realmId','provinceId'], 'realmId');
  G.bind('diplomacy', 'territorial_diplomacy', 'customaryRights', 'customaryWarRights', ['realmId','provinceId'], 'realmId');
  G.bind('diplomacy', 'territorial_diplomacy', 'declaration', 'warDeclarationPreview', ['realmId','causes','inspection'], 'realmId');
  G.bind('diplomacy', 'territorial_diplomacy', 'peaceTerms', 'warPeaceOptions', ['warId']);
  G.bind('diplomacy', 'territorial_diplomacy', 'negotiatedTerms', 'warPeaceTerms', ['custom']);
  G.bind('diplomacy', 'territorial_diplomacy', 'termsCost', 'warTermsCost', ['war']);
  var sourceGoals = rules.warGoals;
  rules.warGoals = function (state, rid, c) {
    return sourceGoals(state, rid, c).filter(function (cause) {
      return G.call(state, rid, 'diplomacy', 'goalAllowed', { cause:cause });
    });
  };
  var sourceTerms = rules.negotiatedTerms;
  function treatyAllowed(state, custom) {
    return FB.political.consent(state, { kind:'realm', id:'player' }, 'treaty', { custom:custom }).allowed;
  }
  rules.negotiatedTerms = function (state, rid, c) {
    return treatyAllowed(state, c.custom) ? sourceTerms(state, rid, c) : null;
  };
  ['war_negotiated_withdrawal','war_accept_tribute','war_terms','war_submit',
    'war_submission_tribute','war_terms_affordable','war_submission_valid',
    'war_submission_tribute_affordable','war_negotiation_possible'].forEach(function (name) {
      var original = FB.fns[name];
      FB.fns[name] = function (state) {
        if (!treatyAllowed(state, name)) return false;
        return original.apply(FB.fns, arguments);
      };
    });
  G.contract('diplomacy', Object.keys(rules));
})();
