/* Local costs consume supplies; they create no endowed property or purse. */
FBDATA.religiousActivities = {
  ctesiphon_church_service_493:{
    name:'Serve the local church at Ctesiphon', period:{yearMin:493,yearMax:null},
    openings:[{id:'493',revision:'world_v2'}], faithIds:['east_syriac'],
    affiliationIds:[], roleIds:['household','cleric'], institutionId:'ctesiphon_church_service_493',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:2, reserve:2,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'ctesiphon_local_service', reward:{piety:1,prestige:0,skills:{int:1}},
    legacy:null, service:null
  },
  dvin_church_relief_493:{
    name:'Provide local church relief at Dvin', period:{yearMin:493,yearMax:null},
    openings:[{id:'493',revision:'world_v2'}], faithIds:['caucasian_christian_476'],
    affiliationIds:[], roleIds:['household','helper'], institutionId:'dvin_church_service_493',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:2, reserve:2,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'dvin_local_relief', reward:{piety:1,prestige:0,skills:{}},
    legacy:null, service:null
  }
};
FBDATA.religiousPatronage = {};
FBDATA.balance.religiousOutreachPressure = 0.10;
FBDATA.techImpactReviews.features.religious_activity_household = {
  mode:'none', rationale:'Managed household participation uses actual presence, qualification and the household budget without a research gate.'
};
FBDATA.techImpactReviews.features.religious_activity_ai = {
  mode:'none', rationale:'Declared autonomous participation and patronage use the same qualifications and the acting ruler\u2019s own public budget.'
};
FBDATA.techImpactReviews.features.religious_activity_participation = {
  mode:'none', rationale:'Local observance, ancient learning and pilgrimage depend on presence, ability and declared admission, not research.'
};
FBDATA.techImpactReviews.features.religious_activity_patronage = {
  mode:'none', rationale:'Foundation and giving transfer authorized property to a restricted institution fund without a discovery requirement.'
};
FBDATA.techImpactReviews.features.religious_activity_outreach = {
  mode:'none', rationale:'Funding an existing permitted community project uses its existing policy and population limits, not a new conversion capability.'
};
