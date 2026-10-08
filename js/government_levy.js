/* Government levy rules. Loaded after final army and war adapters. */
(function () {
  'use strict';
  var G = FB.governments;
  var rules = G.register('levy', 'feudal_levy', {
    settlementBase:function (state, rid, c) {
      return (state.dev[c.provinceId] || 1) * c.share * FBDATA.balance.levyPerDev *
        c.population * c.modifier + c.buildings * c.support;
    },
    service:function (state, rid, c) { return c.amount * c.share; },
    mayCall:function (state, rid) { return FB.political.consent(state, { kind:'realm', id:rid }, 'levy', {}).allowed; }
  });
  G.bind('levy', 'feudal_levy', 'composition', 'playerCompositionBreakdown', ['baseline']);
  G.bind('levy', 'feudal_levy', 'fieldHost', 'aiBaseHost', ['realmId','recruitment','countyInputs','context'], 'realmId');
  G.bind('levy', 'feudal_levy', 'countyBase', 'domainCountyLevyBase', ['provinceId'], G.countyRealm);
  G.bind('levy', 'feudal_levy', 'subjectRate', 'vassalLevyRate', ['realmId'], 'realmId');
  G.bind('levy', 'feudal_levy', 'subjectContribution', 'vassalLevyContribution', ['realmId','recruitmentRealm'], 'realmId');
  G.bind('levy', 'feudal_levy', 'rebelSize', 'rebelLevySize', ['provinceId'], G.countyRealm);
  G.bind('levy', 'feudal_levy', 'upkeep', 'hostFieldUpkeepParts', ['host','batch'], function (state, c) { return c.host.realm; });
  G.contract('levy', Object.keys(rules));
})();
