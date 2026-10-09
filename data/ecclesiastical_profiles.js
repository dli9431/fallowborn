/* Temporal constitutions, not doctrine or a second religious election. */
(function () {
  'use strict';
  FBDATA.ecclesiasticalProfiles = {
    papal_temporal_1204:{ name:'Papal temporal government (1204)', source:'papal_election',
      chapter:false, layRecognition:false, appointmentCost:0, recognitionCost:0,
      reserve:10, revenueRate:1, levyRate:1,
      interim:['revenue','peace','defence','levy'], reserved:['grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] },
    durham_temporal:{ name:'Durham episcopal lordship', source:'local_office',
      chapter:true, layRecognition:true, appointmentCost:0, recognitionCost:0,
      reserve:10, revenueRate:1, levyRate:0.8,
      interim:['revenue','peace','defence'], reserved:['war','treaty','grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] },
    sanctuary_temporal:{ name:'Sanctuary community government', source:'local_office',
      chapter:true, layRecognition:false, appointmentCost:2, recognitionCost:1,
      reserve:5, revenueRate:0.8, levyRate:0.6,
      interim:['revenue','peace','defence','levy'], reserved:['war','treaty','grant','extraordinary_tax','pledge'],
      powers:['ban','peace','revenue'] }
  };
  FBDATA.governmentForms.ecclesiastical_principality = {
    holders:'institutional_holders', succession:'religious_office_bound', territory:'institutional_territory',
    consent:'ecclesiastical_consent', levy:'ecclesiastical_service', revenue:'ecclesiastical_receipts',
    council:'ecclesiastical_council', diplomacy:'ecclesiastical_diplomacy', ai:'ecclesiastical_decisions', ladder:'ecclesiastical_careers',
    officeCatalogue:[],
    systems:{ disable:['roman_offices','public_offices','feudal_service','scutage','estates','royal_council','crown_bloc','manorial_tenure','colonate'] }
  };
  FBDATA.techImpactReviews.features.ecclesiastical_office_binding = { mode:'none', rationale:'Temporal office binding follows a canonical religious result and current lawful recognition, without a discovery requirement.' };
  FBDATA.techImpactReviews.features.ecclesiastical_vacancy = { mode:'none', rationale:'Declared interim administration preserves existing institutional property and ordinary obligations.' };
  FBDATA.techImpactReviews.features.ecclesiastical_local_appointment = { mode:'none', rationale:'Local clerical appointment depends on office qualification and community assent, not technology or purchased Standing.' };
  FBDATA.techImpactReviews.features.ecclesiastical_conversion = { mode:'none', rationale:'Explicit institutional adoption validates existing office, jurisdiction and property without creating a religious election.' };
  FBDATA.techImpactReviews.features.ecclesiastical_household_careers = { mode:'none', rationale:'Clerical, administrative, household and lay service develop personal Standing independently of spiritual appointment.' };
})();
