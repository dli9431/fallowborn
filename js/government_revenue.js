/* Government receipts retain one canonical calculation per source. */
(function () {
  'use strict';
  var G = FB.governments;
  var rules = G.register('revenue', 'demesne_revenue', {
    realmIncome:function (state, rid, c) {
      return (c.tax + c.buildings) * Math.max(0, 1 + c.technology);
    },
    remittance:function (state, rid, c) { return c.amount * c.share; },
    loanAssignment:function (state, rid, c) { return c.amount * c.share; }
  });
  G.bind('revenue', 'demesne_revenue', 'playerLines', 'playerTaxParts', []);
  G.bind('revenue', 'demesne_revenue', 'countyBase', 'countyTaxBase', ['provinceId','rate','localTaxBonus'], G.countyRealm);
  G.bind('revenue', 'demesne_revenue', 'settlementBase', 'settlementTaxBase', ['provinceId','settlement','rate','shares'], G.countyRealm);
  G.bind('revenue', 'demesne_revenue', 'subjectContribution', 'vassalTaxContribution', ['realmId'], 'realmId');
  G.bind('revenue', 'demesne_revenue', 'fiscalAssignment', 'fiscalAssignedIncome', ['surplus']);
  G.contract('revenue', Object.keys(rules));
})();
