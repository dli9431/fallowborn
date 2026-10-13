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
  },
  /* Dated household service uses the same purse and reviewed membership. */
  samarkand_service_800:{
    name:'Serve the local East Syriac community at Samarkand',period:{yearMin:800,yearMax:null},
    openings:[{id:'800',revision:'inhabited_v2_governments_v2'}],faithIds:['east_syriac'],
    affiliationIds:[],roleIds:['household'],institutionId:'samarkand_service_800',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'samarkand_service_800',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  dongola_service_867:{
    name:'Serve the local Christian community at Dongola',period:{yearMin:867,yearMax:null},
    openings:[{id:'867',revision:'governments_v2'},{id:'867',revision:'inhabited_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household'],institutionId:'dongola_service_867',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'dongola_service_867',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  alexandrian_relief_711:{
    name:'Provide local church relief at Alexandria',period:{yearMin:711,yearMax:null},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household','helper'],institutionId:'alexandrian_service_711',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'alexandrian_relief_711',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  ibrim_service_711:{
    name:'Serve the local Christian community at Ibrim',period:{yearMin:711,yearMax:null},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household'],institutionId:'ibrim_service_711',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'ibrim_service_711',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  alexandrian_relief_800:{
    name:'Provide local church relief at Alexandria',period:{yearMin:800,yearMax:null},
    openings:[{id:'800',revision:'inhabited_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household','helper'],institutionId:'alexandrian_service_800',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'alexandrian_relief_800',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  ibrim_service_800:{
    name:'Serve the local Christian community at Ibrim',period:{yearMin:800,yearMax:null},
    openings:[{id:'800',revision:'inhabited_v2_governments_v2'}],faithIds:['miaphysite'],
    affiliationIds:[],roleIds:['household'],institutionId:'ibrim_service_800',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'ibrim_service_800',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  baghdad_service_800:{
    name:'Serve the local East Syriac church at Baghdad',period:{yearMin:800,yearMax:null},
    openings:[{id:'800',revision:'inhabited_v2_governments_v2'}],faithIds:['east_syriac'],
    affiliationIds:[],roleIds:['household'],institutionId:'baghdad_service_800',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'baghdad_service_800',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  alexandrian_relief_867:{
    name:'Provide local church relief at Alexandria',period:{yearMin:867,yearMax:null},
    openings:[{id:'867',revision:'governments_v2'},{id:'867',revision:'inhabited_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household','helper'],institutionId:'alexandrian_service_867',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'alexandrian_relief_867',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  ibrim_service_867:{
    name:'Serve the local Christian community at Ibrim',period:{yearMin:867,yearMax:null},
    openings:[{id:'867',revision:'inhabited_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household'],institutionId:'ibrim_service_867',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'ibrim_service_867',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  baghdad_service_867:{
    name:'Serve the local East Syriac church at Baghdad',period:{yearMin:867,yearMax:null},
    openings:[{id:'867',revision:'governments_v2'},{id:'867',revision:'inhabited_v2_governments_v2'}],faithIds:['east_syriac'],
    affiliationIds:[],roleIds:['household'],institutionId:'baghdad_service_867',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'baghdad_service_867',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  alexandrian_relief_1066:{
    name:'Provide local church relief at Alexandria',period:{yearMin:1066,yearMax:null},
    openings:[{id:'1066',revision:'governments_v2'},{id:'1066',revision:'inhabited_v2_governments_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household','helper'],institutionId:'alexandrian_service_1066',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'alexandrian_relief_1066',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  ibrim_service_1066:{
    name:'Serve the local Christian community at Ibrim',period:{yearMin:1066,yearMax:null},
    openings:[{id:'1066',revision:'inhabited_v2_governments_v2'}],faithIds:['miaphysite'],
    affiliationIds:[],roleIds:['household'],institutionId:'ibrim_service_1066',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'ibrim_service_1066',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  alexandrian_relief_1204:{
    name:'Provide local church relief at Alexandria',period:{yearMin:1204,yearMax:null},
    openings:[{id:'1204',revision:'inhabited_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household','helper'],institutionId:'alexandrian_service_1204',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'alexandrian_relief_1204',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  dongola_service_1204:{
    name:'Serve the local Christian community at Dongola',period:{yearMin:1204,yearMax:null},
    openings:[{id:'1204',revision:'inhabited_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household'],institutionId:'dongola_service_1204',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'dongola_service_1204',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  soba_service_1204:{
    name:'Serve the local Christian community at Soba',period:{yearMin:1204,yearMax:null},
    openings:[{id:'1204',revision:'inhabited_v2'}],faithIds:['eastern'],
    affiliationIds:[],roleIds:['household'],institutionId:'soba_service_1204',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'soba_service_1204',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  constantinople_greek_service_1066:{
    name:'Serve the local Greek church at Constantinople',period:{yearMin:1066,yearMax:null},
    openings:[{id:'1066',revision:'governments_v2'},{id:'1066',revision:'inhabited_v2_governments_v2'}],faithIds:['orthodox'],
    affiliationIds:[],roleIds:['household','priest','monastic'],institutionId:'constantinople_greek_service_1066',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'constantinople_greek_service_1066',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  constantinople_greek_service_1204:{
    name:'Serve the local Greek church at Constantinople',period:{yearMin:1204,yearMax:null},
    openings:[{id:'1204',revision:'inhabited_v2'}],faithIds:['orthodox'],
    affiliationIds:[],roleIds:['household','priest','monastic'],institutionId:'constantinople_greek_service_1204',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'constantinople_greek_service_1204',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
  },
  constantinople_latin_service_1204:{
    name:'Serve the local Latin church at Constantinople',period:{yearMin:1204,yearMax:null},
    openings:[{id:'1204',revision:'inhabited_v2'}],faithIds:['catholic'],
    affiliationIds:[],roleIds:['household','priest','monastic'],institutionId:'constantinople_latin_service_1204',
    mode:'local',purpose:null,siteId:null,payer:'household',cost:2,reserve:2,
    duration:1,calendar:'any_day',interruption:'retain_cost',recipient:'institution',
    milestone:'constantinople_latin_service_1204',reward:{piety:1,prestige:0,skills:{}},legacy:null,service:null
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
