/* Activity consumers are declared by accepted campaigns and mods. */
/* These declarations require an explicitly placed, accessible local institution. */
FBDATA.religiousActivities = {
  kairouan_household_worship_711:{
    name:'Join local Muslim worship', period:{yearMin:711,yearMax:711},
    openings:[{id:'711',revision:'terrain_v2_african_v1'},{id:'711',revision:'terrain_v2_governments_v2_african_v1'}],
    faithIds:['umayyad_sunni_711'], affiliationIds:[], roleIds:[],
    institutionId:'kairouan_muslim_congregation_711', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:1, calendar:'any_day',
    interruption:'retain_cost', recipient:'participant', milestone:'african_muslim_household_worship',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  kairouan_household_worship_800:{
    name:'Join local Muslim worship', period:{yearMin:800,yearMax:800},
    openings:[{id:'800',revision:'inhabited_v2_african_v1'},{id:'800',revision:'inhabited_v2_governments_v2_african_v1'}],
    faithIds:['sunni'], affiliationIds:[], roleIds:[],
    institutionId:'kairouan_muslim_congregation_800', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:1, calendar:'any_day',
    interruption:'retain_cost', recipient:'participant', milestone:'african_muslim_household_worship',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  kairouan_household_worship_867:{
    name:'Join local Muslim worship', period:{yearMin:867,yearMax:867},
    openings:[{id:'867',revision:'inhabited_v2_african_v1'},{id:'867',revision:'inhabited_v2_governments_v2_african_v1'}],
    faithIds:['sunni'], affiliationIds:[], roleIds:[],
    institutionId:'kairouan_muslim_congregation_867', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:1, calendar:'any_day',
    interruption:'retain_cost', recipient:'participant', milestone:'african_muslim_household_worship',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  gao_household_worship_1204:{
    name:'Join local Muslim worship', period:{yearMin:1204,yearMax:1204},
    openings:[{id:'1204',revision:'inhabited_v2_african_v1'}],
    faithIds:['sunni'], affiliationIds:[], roleIds:[],
    institutionId:'gao_muslim_congregation_1204', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:1, calendar:'any_day',
    interruption:'retain_cost', recipient:'participant', milestone:'african_muslim_household_worship',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  garama_funeral_offerings_476:{
    name:'Make a local funerary offering', period:{yearMin:476,yearMax:476},
    openings:[{id:'476',revision:'wider_v2'}], faithIds:['berber_traditional'],
    affiliationIds:[], roleIds:[], institutionId:'garama_offering_community_476',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:1, reserve:0,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'garama_funeral_offering', reward:{piety:1,prestige:0,skills:{}},
    legacy:null, service:null
  },
  garama_funeral_offerings_493:{
    name:'Make a local funerary offering', period:{yearMin:493,yearMax:493},
    openings:[{id:'493',revision:'world_v2'}], faithIds:['berber_traditional'],
    affiliationIds:[], roleIds:[], institutionId:'garama_offering_community_493',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:1, reserve:0,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'garama_funeral_offering', reward:{piety:1,prestige:0,skills:{}},
    legacy:null, service:null
  },
  ghana_muslim_household_learning_1066:{
    name:'Join local Muslim learning', period:{yearMin:1066,yearMax:1066},
    openings:[{id:'1066',revision:'inhabited_v2'},
      {id:'1066',revision:'inhabited_v2_governments_v2'}],
    faithIds:['sunni'], affiliationIds:[], roleIds:[],
    institutionId:'ghana_muslim_congregation_1066', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:1, calendar:'any_day',
    interruption:'retain_cost', recipient:'participant', milestone:'ghana_local_learning_1066',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  ghana_mosque_learning_service_1066:{
    name:'Attend a funded local lesson', period:{yearMin:1066,yearMax:1066},
    openings:[{id:'1066',revision:'inhabited_v2'},
      {id:'1066',revision:'inhabited_v2_governments_v2'}],
    faithIds:['sunni'], affiliationIds:[], roleIds:['learner'],
    institutionId:'ghana_muslim_congregation_1066', mode:'local', purpose:null, siteId:null,
    payer:'household', cost:0, reserve:0, duration:2, calendar:'any_day',
    interruption:'retain_cost', recipient:'institution', milestone:'ghana_funded_learning_1066',
    reward:{piety:0,prestige:0,skills:{int:1}}, legacy:null,
    service:{fund:'learning',cost:3}
  }
};
FBDATA.religiousPatronage = {
  ghana_muslim_learning_support_1066:{
    name:'Support local Muslim learning', period:{yearMin:1066,yearMax:1066},
    openings:[{id:'1066',revision:'inhabited_v2'},
      {id:'1066',revision:'inhabited_v2_governments_v2'}],
    faithIds:[], affiliationIds:[], roleIds:[], institutionId:'ghana_muslim_congregation_1066',
    payer:'household', reserve:0,
    foundation:{startup:2,capital:6,treasury:2,landRequired:true},
    funds:{learning:{name:'Local learning',capacity:8,unitCost:3}}, outreach:['voluntary']
  },
  ghana_public_learning_support_1066:{
    name:'Fund local Muslim learning from the public treasury',
    period:{yearMin:1066,yearMax:1066},
    openings:[{id:'1066',revision:'inhabited_v2'},
      {id:'1066',revision:'inhabited_v2_governments_v2'}],
    faithIds:[], affiliationIds:[], roleIds:[], institutionId:'ghana_muslim_congregation_1066',
    payer:'public', reserve:10, ai:true,
    foundation:{startup:2,capital:6,treasury:2,landRequired:true},
    funds:{learning:{name:'Local learning',capacity:8,unitCost:3}}, outreach:['voluntary']
  }
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
FBDATA.techImpactReviews.features.ghana_local_learning_service = {
  mode:'none', rationale:'A local lesson depends on protected access and an actually prepaid service unit, without ordination or manuscript technology.'
};
FBDATA.techImpactReviews.features.ghana_local_learning_support = {
  mode:'none', rationale:'Giving and bounded outreach depend on lawful property, the donor’s actual resources and existing community projects rather than discovery.'
};
