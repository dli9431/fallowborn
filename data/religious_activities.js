/* Activity consumers are declared by accepted campaigns and mods. */
FBDATA.religiousActivities = {
  buddhist_household_practice_early:{
    name:'Household Buddhist practice',period:{yearMin:476,yearMax:493},
    openings:[{id:'476',revision:'wider_v2'},{id:'493',revision:'world_v2'}],
    faithIds:['buddhist_476'],affiliationIds:[],roleIds:[],institutionId:null,
    mode:'local',purpose:null,siteId:null,payer:'household',cost:0,reserve:0,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'participant',
    milestone:'buddhist_household_practice_done',reward:{piety:1,prestige:0,skills:{}},
    legacy:null,service:null
  },
  buddhist_household_study_early:{
    name:'Household Buddhist study',period:{yearMin:476,yearMax:493},
    openings:[{id:'476',revision:'wider_v2'},{id:'493',revision:'world_v2'}],
    faithIds:['buddhist_476'],affiliationIds:[],roleIds:[],institutionId:null,
    mode:'local',purpose:null,siteId:null,payer:'household',cost:0,reserve:0,
    duration:2,calendar:'any_day',interruption:'retain_cost',recipient:'participant',
    milestone:'buddhist_household_study_done',reward:{piety:0,prestige:0,skills:{int:1}},
    legacy:null,service:null
  },
  buddhist_household_practice_711:{
    name:'Household Buddhist practice',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['buddhist_711'],affiliationIds:[],roleIds:[],institutionId:null,
    mode:'local',purpose:null,siteId:null,payer:'household',cost:0,reserve:0,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'participant',
    milestone:'buddhist_household_practice_done',reward:{piety:1,prestige:0,skills:{}},
    legacy:null,service:null
  },
  buddhist_household_study_711:{
    name:'Household Buddhist study',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['buddhist_711'],affiliationIds:[],roleIds:[],institutionId:null,
    mode:'local',purpose:null,siteId:null,payer:'household',cost:0,reserve:0,
    duration:2,calendar:'any_day',interruption:'retain_cost',recipient:'participant',
    milestone:'buddhist_household_study_done',reward:{piety:0,prestige:0,skills:{int:1}},
    legacy:null,service:null
  },
  tapa_sardar_learning_711:{
    name:'Study with Tapa Sardar supporters',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['buddhist_711'],affiliationIds:[],roleIds:['learner','study_helper'],
    institutionId:'tapa_sardar_house_711',mode:'local',purpose:null,siteId:null,
    payer:'household',cost:0,reserve:0,duration:2,calendar:'any_day',
    interruption:'retain_cost',recipient:'institution',milestone:'buddhist_household_study_done',
    reward:{piety:0,prestige:0,skills:{int:1}},legacy:null,service:{fund:'learning',cost:1}
  },
  tepe_narenj_learning_711:{
    name:'Study with Tepe Narenj visitors',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['buddhist_711'],affiliationIds:[],roleIds:['learner'],
    institutionId:'tepe_narenj_house_711',mode:'local',purpose:null,siteId:null,
    payer:'household',cost:0,reserve:0,duration:3,calendar:'any_day',
    interruption:'retain_cost',recipient:'institution',milestone:'buddhist_household_study_done',
    reward:{piety:0,prestige:0,skills:{int:1}},legacy:null,service:{fund:'learning',cost:2}
  }
};
FBDATA.religiousPatronage = {
  tapa_sardar_giving_711:{
    name:'Support Tapa Sardar learning',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:[],affiliationIds:[],roleIds:[],institutionId:'tapa_sardar_house_711',
    payer:'household',reserve:0,foundation:{startup:0,capital:0,treasury:0,landRequired:true},
    funds:{learning:{name:'Learning supplies',capacity:6,unitCost:1}},outreach:['voluntary']
  },
  tepe_narenj_giving_711:{
    name:'Support Tepe Narenj learning',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:[],affiliationIds:[],roleIds:[],institutionId:'tepe_narenj_house_711',
    payer:'household',reserve:0,foundation:{startup:1,capital:0,treasury:0,landRequired:true},
    funds:{learning:{name:'Learning supplies',capacity:4,unitCost:2}},outreach:[]
  },
  tapa_sardar_public_giving_711:{
    name:'Public support for Tapa Sardar learning',period:{yearMin:711,yearMax:799},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:[],affiliationIds:[],roleIds:[],institutionId:'tapa_sardar_house_711',
    payer:'public',ai:true,reserve:1,foundation:{startup:0,capital:0,treasury:0,landRequired:true},
    funds:{learning:{name:'Learning supplies',capacity:6,unitCost:1}},outreach:['voluntary']
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
