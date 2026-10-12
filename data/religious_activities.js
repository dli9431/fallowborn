/* Activity consumers are declared by accepted campaigns and mods. */
/* Local worship is separate from pilgrimage, political allegiance and work.
   The year/opening windows are bounded research scopes, not closure dates.
   One day, no fee and one piety once per participant are simulation terms. */
FBDATA.religiousActivities = { medina_local_worship_711: {
  name:'Join local worship in Medina', period:{yearMin:711,yearMax:711},
  openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
  faithIds:['sunni','umayyad_sunni_711'], affiliationIds:[], roleIds:[], institutionId:'medina_congregation_711',
  mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
  calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'medina_local_worship_711',
  reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
}, sanaa_local_worship_711: {
  name:'Join local worship in Sanaa', period:{yearMin:711,yearMax:711},
  openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
  faithIds:['sunni','umayyad_sunni_711'], affiliationIds:[], roleIds:[], institutionId:'sanaa_congregation_711',
  mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
  calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'sanaa_local_worship_711',
  reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
} };
FBDATA.religiousPatronage = {};
FBDATA.techImpactReviews.features.arabian_local_worship_711 = {
  mode:'none', rationale:'Local household worship depends on actual access and presence, without granting an office, travel award or researched capability.'
};
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
