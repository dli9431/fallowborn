/* Realm decisions use the existing transactions in their existing order. */
(function () {
  'use strict';
  var G = FB.governments;
  var rules = G.register('ai', 'realm_decisions', {
    goals:function (state, rid) {
      var realm = state.realms[rid], params = G.parameters(state, rid, 'ai');
      return { warChance:params.warChance !== undefined ? params.warChance :
        realm && realm.ruler && realm.ruler.personality === 'bellicose' ? 0.08 : 0.025,
        allianceChance:0.08 };
    },
    canNegotiate:function () { return false; },
    consentContract:function () { return false; },
    proposeMigration:function () { return false; },
    offices:function () { return false; }
  });
  G.bind('ai', 'realm_decisions', 'campaign', 'realmCampaignAI', ['realmId'], 'realmId');
  G.bind('ai', 'realm_decisions', 'aggression', 'aiAggressionAssessment', ['realmId','provinceId','territory'], 'realmId');
  G.bind('ai', 'realm_decisions', 'expansionPriority', 'aiExpansionPriority', ['realmId','provinceId'], 'realmId');
  G.bind('ai', 'realm_decisions', 'expansionProvince', 'aiExpansionProvince', ['realmId','loserRealm','allowed'], 'realmId');
  G.bind('ai', 'realm_decisions', 'expansionTarget', 'aiExpansionTarget', ['realmId','defenderIds','defensiveStrength','allowed'], 'realmId');
  G.bind('ai', 'realm_decisions', 'raid', 'aiRaidTick', ['realmId','realm','balance','knownPeaceful'], 'realmId');
  G.bind('ai', 'realm_decisions', 'breakawayChance', 'vassalBreakawayChance', ['realmId'], 'realmId');
  G.bind('ai', 'realm_decisions', 'motionScore', 'governmentMotionScore', ['bloc','motionId','courtEconomicPowerAverage'], function (state) { var court = FB.politicalCourt(state); return court && court.polityId; });
  G.bind('ai', 'realm_decisions', 'construction', 'aiCanBuildAt', ['actor','provinceId','settlement','buildingId'], function (state,c) { return typeof c.actor === 'string' ? c.actor : c.actor && c.actor.kind === 'realm' ? c.actor.id : null; });
  ['federate_contracts','roman_offices'].forEach(function (id) {
    var specific = G.strategy('ai', id);
    specific.canNegotiate = function () { return true; };
    Object.keys(rules).forEach(function (method) {
      if (!specific[method]) specific[method] = rules[method];
    });
  });
  G.contract('ai', Object.keys(rules));
})();
