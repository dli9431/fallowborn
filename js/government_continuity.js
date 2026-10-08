/* Creation, vacancies and mobile courts use the same saved form as taxes
   and armies. These policy reads leave the existing transactions in charge. */
(function () {
  'use strict';
  var G = FB.governments, Q = FB.political;
  ['feudal_vassals','direct'].forEach(function (id) {
    var rule = G.strategy('holders', id);
    rule.conquest = function (state, rid) { return rid; };
    rule.vacancy = function (state, rid, c) { return c.proposedHolderId; };
  });
  G.contract('holders', ['assign','conquest','vacancy']);

  var beginMigration = FB.federateBeginMigration;
  var settlementQuote = Q.federateSettlementQuote;
  ['fixed','non_territorial'].forEach(function (id) {
    var rule = G.strategy('territory', id), moving = rule.movingCourt;
    rule.profile = function () { return { movingCourt:moving, holdsCounties:true }; };
    rule.defeat = function (state, rid, c) { return { dissolve:!c.counties.length }; };
    rule.migration = function (state, rid, c) { return moving ? beginMigration(state, c.spec) : null; };
    rule.settlement = function (state, rid, c) { return moving ? settlementQuote(state, c.migrationId) : null; };
  });
  FB.federateBeginMigration = function (state, spec) {
    return G.call(state, spec && spec.realmId, 'territory', 'migration', { spec:spec });
  };
  Q.federateSettlementQuote = function (state, id) {
    var row = (state.authority && state.authority.migrations || []).filter(function (record) { return record.id === id; })[0];
    return row ? G.call(state, row.realmId, 'territory', 'settlement', { migrationId:id }) : null;
  };
  G.contract('territory', ['profile','defeat','migration','settlement']);

  ['dynastic','agnatic_seniority'].forEach(function (id) {
    var rule = G.strategy('succession', id);
    if (!rule.order) rule.order = function (succession, year, frontier) { return frontier; };
    rule.candidates = function (state, rid, c) { return this.order(c.succession, state.date.year, c.frontier); };
    rule.vacancy = function (state, rid, c) {
      return { allowed:true, cause:c.cause, rulerGeneration:FB.realmRulerGeneration(state, rid) };
    };
    rule.accession = function (state, rid, c) {
      return { realmId:rid, memberId:c.succession.order[0] || null,
        rulerGeneration:c.succession.rulerGeneration };
    };
    rule.refresh = function () { return !!this.annualRefresh; };
  });
  G.contract('succession', ['eligible','order','candidates','vacancy','accession','refresh']);

  var consent = Q.consent;
  ['territorial','delegated'].forEach(function (id) {
    var rule = G.strategy('consent', id), territorial = rule.territorialConsent;
    rule.local = function () { return territorial; };
    rule.decision = function (state, rid, c) {
      if (['levy','war','treaty','grant'].indexOf(c.operation) >= 0) {
        var actor = c.actor, valid = state && actor && (actor.kind === 'realm'
          ? actor.id === 'player' && !!state.player || !!(state.realms && state.realms[actor.id] && state.realms[actor.id].alive)
          : actor.kind === 'character' && !!Q.actor(state, actor));
        return { allowed:!!valid, reason:valid ? null : 'invalid_actor', required:[], approvals:{} };
      }
      return consent(state, c.actor, c.operation, c.scope);
    };
    rule.constituency = function (state, rid, c) {
      var result = c.decision || this.decision(state, rid, c);
      return { kind:'existing_consents', realmId:rid, operation:c.operation,
        members:(result.required || []).slice() };
    };
  });
  Q.consent = function (state, actor, operation, scope) {
    var rid = actor && actor.kind === 'realm' ? actor.id : actor && actor.kind === 'character'
      ? state && state.player && actor.id === state.player.charId ? 'player' : FB.realmIdForRulerCharacter(state, actor.id) : null;
    var context = { actor:actor, operation:operation, scope:scope };
    var result = G.call(state, rid, 'consent', 'decision', context);
    if (result.required) {
      context.decision = result;
      result.required = G.call(state, rid, 'consent', 'constituency', context).members;
    }
    return result;
  };
  G.contract('consent', ['local','decision','constituency']);
})();
