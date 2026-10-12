/* Activity consumers are declared by accepted campaigns and mods. */
/* Seven-day lessons and one skill point are bounded simulation choices.
   They award no vocation, judicial jurisdiction, prayer office or pilgrimage. */
FBDATA.religiousActivities = {
  kufa_hanafi_learning_800:{
    name:'Study Hanafi jurisprudence',period:{yearMin:800,yearMax:800},openings:[],
    faithIds:['sunni'],affiliationIds:['hanafi_learning_800'],roleIds:['learner'],
    institutionId:'kufa_hanafi_circle_800',mode:'local',purpose:null,siteId:null,
    payer:'household',cost:0,reserve:0,duration:7,calendar:'any_day',
    interruption:'retain_cost',recipient:'participant',milestone:'kufa_hanafi_learning_800',
    reward:{piety:0,prestige:0,skills:{int:1}},legacy:null,service:null
  },
  baghdad_shafii_learning_1066:{
    name:"Study Shafi'i jurisprudence",period:{yearMin:1066,yearMax:1066},openings:[],
    faithIds:['sunni'],affiliationIds:['shafii_learning_1066'],roleIds:['learner'],
    institutionId:'baghdad_shafii_circle_1066',mode:'local',purpose:null,siteId:null,
    payer:'household',cost:0,reserve:0,duration:7,calendar:'any_day',
    interruption:'retain_cost',recipient:'participant',milestone:'baghdad_shafii_learning_1066',
    reward:{piety:0,prestige:0,skills:{int:1}},legacy:null,service:null
  },
  nishapur_shafii_ashari_learning_1066:{
    name:"Study Shafi'i law and Ash'ari theology",period:{yearMin:1066,yearMax:1066},openings:[],
    faithIds:['sunni'],affiliationIds:['shafii_learning_1066','ashari_learning_1066'],roleIds:['learner'],
    institutionId:'nishapur_shafii_ashari_circle_1066',mode:'local',purpose:null,siteId:null,
    payer:'household',cost:0,reserve:0,duration:7,calendar:'any_day',
    interruption:'retain_cost',recipient:'participant',milestone:'nishapur_shafii_ashari_learning_1066',
    reward:{piety:0,prestige:0,skills:{int:1}},legacy:null,service:null
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
FBDATA.techImpactReviews.features.islamic_scholarly_learning = {
  mode:'none',rationale:'Local study depends on presence, voluntary membership and scholarly affiliation, without a discovery requirement or grant of public office.'
};
