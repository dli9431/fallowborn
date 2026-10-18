/* Physical worship investments require an existing lawful foundation. */
window.FBDATA = window.FBDATA || {};

FBDATA.buildings_early_worship = {
  monastic_house:{
    role:'worship', aiBuildOrder:28, name:'Monastic House', icon:'🏠',
    cost:60, upkeep:1, devMin:2, maxCounty:1, settlementDraw:false,
    piety:1, institutionProfile:'monastic_property',
    applicability:{yearMin:476,yearMax:1300},
    desc:'Maintained premises at an existing endowed monastic house. The lawful property patron pays construction and maintenance; active permission supplies one piety without founding a house, admitting monks or granting learning.'
  }
};
FBDATA.buildingProfiles_early_worship = {
  episcopal_complex:{
    buildingId:'temple', name:'Episcopal Complex',
    desc:'Optional masonry premises for an existing see or patriarchate. The lawful settlement holder pays for this single worship foundation and its maintenance; ordinary modest premises and religious offices remain available.',
    replace:{aiBuildOrder:27,cost:100,upkeep:2,devMin:4,piety:1,tax:0,dev:0,pop:0,prestige:0,research:0,
      levy:0,retinue:0,archers:0,defense:0,siege:0,populationCapacity:0,
      populationFamineProtection:0,populationCrisisProtection:0,migrationAttraction:0,communityFaithPressure:0},
    requiresTech:['lime_mortar'], techImpactReview:'building_episcopal_complex',
    institutionProfile:'episcopal_foundation',
    applicability:{yearMin:476,yearMax:1300}
  },
  congregational_mosque:{
    buildingId:'temple', name:'Congregational Mosque',
    desc:'Optional masonry premises for an existing congregation. Construction requires its actual foundation and lawful maintenance payer, rather than the ruler\u2019s faith; modest premises and ordinary worship remain available.',
    replace:{aiBuildOrder:27,cost:90,upkeep:2,devMin:4,piety:2,tax:0,dev:0,pop:0,prestige:0,research:0,
      levy:0,retinue:0,archers:0,defense:0,siege:0,populationCapacity:0,
      populationFamineProtection:0,populationCrisisProtection:0,migrationAttraction:0,communityFaithPressure:0},
    requiresTech:['lime_mortar'], techImpactReview:'building_congregational_mosque',
    institutionProfile:'congregational_foundation',
    applicability:{yearMin:650,yearMax:1300,traditions:['islamic']}
  }
};

(function () {
  'use strict';
  var policies = {
    monastic_property:{kinds:['monastery'],property:'abbey',permission:'property_patron',incumbent:'none',exclusiveRoles:['worship'],requiresBinding:true},
    episcopal_foundation:{kinds:['see','patriarchate'],property:'seat',permission:'holder',incumbent:'required',exclusiveRoles:['worship'],requiresBinding:true},
    congregational_foundation:{kinds:['congregation'],property:'seat',permission:'holder',incumbent:'none',exclusiveRoles:['worship'],requiresBinding:true}
  };
  Object.keys(policies).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildingInstitutionProfiles,id)) throw new Error('Duplicate worship foundation policy: ' + id);
    FBDATA.buildingInstitutionProfiles[id] = policies[id];
  });
  Object.keys(FBDATA.buildings_early_worship).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildings,id)) throw new Error('Duplicate worship building: ' + id);
    FBDATA.buildings[id] = JSON.parse(JSON.stringify(FBDATA.buildings_early_worship[id]));
  });
  Object.keys(FBDATA.buildingProfiles_early_worship).forEach(function (id) {
    if (Object.prototype.hasOwnProperty.call(FBDATA.buildingProfiles,id)) throw new Error('Duplicate worship construction profile: ' + id);
    FBDATA.buildingProfiles[id] = JSON.parse(JSON.stringify(FBDATA.buildingProfiles_early_worship[id]));
  });
  FBDATA.techImpactReviews.features.building_monastic_house = {
    mode:'none', rationale:'Maintaining premises at an already endowed monastic house needs lawful property, an active institution and a real payer, rather than a discovery. It grants no institution, members or learning.'
  };
  FBDATA.techImpactReviews.features.building_episcopal_complex = {
    mode:'hard', tech:['lime_mortar'], fallback:'Ordinary worship and modest existing see premises',
    rationale:'Only optional masonry construction requires lime mortar. Existing sees, offices and ordinary worship remain available without this investment; retained assets and repairs keep their identity.'
  };
  FBDATA.techImpactReviews.features.building_congregational_mosque = {
    mode:'hard', tech:['lime_mortar'], fallback:'Ordinary worship and modest congregation premises',
    rationale:'Only optional masonry construction requires lime mortar. Existing congregations and ordinary worship remain available without this investment; retained assets and repairs keep their identity.'
  };
})();
