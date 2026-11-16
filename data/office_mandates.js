FB.bookmarkSources.stage({source:'data/office_mandates.js',bookmarks:['476'],catalogs:['governmentForms'],shared:['governmentForms']}, function (FBDATA) {
  /* A service warrant is a simulation of delegated court business, not an
     additional historical dignity or an estate. */
  FBDATA.officeMandateOffices = {
    court_service_command:{name:'Comes rei militaris: court service',
      desc:'Command the commissioned host, negotiate paid service from the court account and propose qualified officers. Favor and reaffirmation remain necessary; the court may dismiss you.',
      powers:['ban'],scopes:['host'],succession:'reaffirm',
      recognitionSources:['imperial_commission','army_acclamation'],
      appointment:{gold:15,prestige:20,skill:'mar',minimum:6},
      mandate:{schema:1,powers:['command','negotiate','pay','propose'],tenureDays:720,
        favor:{source:'court_standing',minimum:-20},dismissal:'court',responseDays:90,
        contractTemplates:['court_paid_service'],
        acclamation:{officeId:'imperial_office',sourceId:'army_acclamation',minimumSources:2,
          requiredMandates:['command'],dispute:true,afterDismissal:true}}}
  };
  Object.assign(FBDATA.authorityOffices,FBDATA.officeMandateOffices);
  FBDATA.federateContractTerms.court_paid_service = {payPerSeason:8,initialPay:12,durationDays:360,
    renewWindowDays:90,service:'host',land:'none',recognition:'none',autoRenew:false};
  FBDATA.governmentForms.roman_civic.officeCatalogue.push('court_service_command');
});
