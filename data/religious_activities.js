/* Consumers require their own accepted campaign placements. No declaration
   creates a community, premises, incumbent or property. Amounts and time are
   simulation choices; household study is separate from specialist admission. */
FBDATA.religiousActivities = {
  jewish_household_worship:{
    name:'Jewish household worship', period:{ yearMin:476, yearMax:null },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'493', revision:'world_v2' },{ id:'1204', revision:'inhabited_v2' },
      { id:'476', revision:'jewish_samaritan_v3' },{ id:'493', revision:'jewish_samaritan_v3' },
      { id:'711', revision:'jewish_samaritan_v3_governments_v2' },{ id:'800', revision:'jewish_samaritan_v3_governments_v2' },
      { id:'867', revision:'jewish_samaritan_v3_governments_v2' },{ id:'1066', revision:'jewish_samaritan_v3_governments_v2' },
      { id:'1204', revision:'jewish_samaritan_v3' }],
    faithIds:['jewish'], affiliationIds:[], roleIds:[], institutionId:null,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'jewish_household_worship_done', reward:{ piety:1, prestige:0, skills:{} }, legacy:null, service:null
  },
  jewish_household_study:{
    name:'Jewish household study', period:{ yearMin:476, yearMax:null },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'493', revision:'world_v2' },{ id:'1204', revision:'inhabited_v2' },
      { id:'476', revision:'jewish_samaritan_v3' },{ id:'493', revision:'jewish_samaritan_v3' },
      { id:'711', revision:'jewish_samaritan_v3_governments_v2' },{ id:'800', revision:'jewish_samaritan_v3_governments_v2' },
      { id:'867', revision:'jewish_samaritan_v3_governments_v2' },{ id:'1066', revision:'jewish_samaritan_v3_governments_v2' },
      { id:'1204', revision:'jewish_samaritan_v3' }],
    faithIds:['jewish'], affiliationIds:[], roleIds:[], institutionId:null,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'jewish_household_study_done', reward:{ piety:0, prestige:0, skills:{ int:1 } }, legacy:null, service:null
  },
  samaritan_household_worship:{
    name:'Samaritan household worship', period:{ yearMin:476, yearMax:null },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'493', revision:'world_v2' },
      { id:'711', revision:'baseline' },{ id:'800', revision:'baseline' },{ id:'1204', revision:'inhabited_v2' },
      { id:'476', revision:'jewish_samaritan_v3' },{ id:'493', revision:'jewish_samaritan_v3' },
      { id:'711', revision:'jewish_samaritan_v3_governments_v2' },{ id:'800', revision:'jewish_samaritan_v3_governments_v2' },
      { id:'1204', revision:'jewish_samaritan_v3' }],
    faithIds:['samaritan'], affiliationIds:[], roleIds:[], institutionId:null,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'samaritan_household_worship_done', reward:{ piety:1, prestige:0, skills:{} }, legacy:null, service:null
  },
  karaite_household_worship:{
    name:'Karaite household worship', period:{ yearMin:1066, yearMax:null },
    openings:[{ id:'1066', revision:'inhabited_v2' },{ id:'1204', revision:'inhabited_v2' },
      { id:'1066', revision:'jewish_samaritan_v3_governments_v2' },{ id:'1204', revision:'jewish_samaritan_v3' }],
    faithIds:['karaite'], affiliationIds:[], roleIds:[], institutionId:null,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:1, calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'karaite_household_worship_done', reward:{ piety:1, prestige:0, skills:{} }, legacy:null, service:null
  },
  /* The shared milestone prevents stacking household and local learning. */
  jewish_meso_study_circle_476_lesson:{
    name:'Study with the local group', period:{ yearMin:476, yearMax:493 },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'476', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:['learner','study_helper'], institutionId:'jewish_meso_study_circle_476',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'jewish_household_study_done', reward:{ piety:0, prestige:0, skills:{ int:1 } }, legacy:null, service:null
  },
  jewish_meso_study_circle_493_lesson:{
    name:'Study with the local group', period:{ yearMin:493, yearMax:493 },
    openings:[{ id:'493', revision:'world_v2' },{ id:'493', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:['learner','study_helper'], institutionId:'jewish_meso_study_circle_493',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'jewish_household_study_done', reward:{ piety:0, prestige:0, skills:{ int:1 } }, legacy:null, service:null
  },
  alexandria_communal_school_1204_lesson:{
    name:'Study with the local group', period:{ yearMin:1204, yearMax:null },
    openings:[{ id:'1204', revision:'inhabited_v2' },{ id:'1204', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:['learner','study_helper'], institutionId:'alexandria_communal_school_1204',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'jewish_household_study_done', reward:{ piety:0, prestige:0, skills:{ int:1 } }, legacy:null, service:null
  },
  jewish_sardis_congregation_476_care:{
    name:'Help care for the synagogue', period:{ yearMin:476, yearMax:493 },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'476', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:['worshipper'], institutionId:'jewish_sardis_congregation_476',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'jewish_synagogue_care_done', reward:{ piety:1, prestige:0, skills:{} }, legacy:null,
    service:{ fund:'building_care', cost:1 }
  },
  jewish_sardis_congregation_493_care:{
    name:'Help care for the synagogue', period:{ yearMin:493, yearMax:493 },
    openings:[{ id:'493', revision:'world_v2' },{ id:'493', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:['worshipper'], institutionId:'jewish_sardis_congregation_493',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0,
    duration:2, calendar:'any_day', interruption:'retain_cost', recipient:'institution',
    milestone:'jewish_synagogue_care_done', reward:{ piety:1, prestige:0, skills:{} }, legacy:null,
    service:{ fund:'building_care', cost:1 }
  }
};
FBDATA.religiousPatronage = {
  jewish_sardis_giving_476:{
    name:'Support the Sardis synagogue', period:{ yearMin:476, yearMax:493 },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'476', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:[], institutionId:'jewish_sardis_congregation_476', payer:'household', reserve:0,
    foundation:{ startup:0, capital:0, treasury:0, landRequired:true },
    funds:{ building_care:{ name:'Synagogue care', capacity:8, unitCost:1 } }, outreach:[]
  },
  jewish_sardis_giving_493:{
    name:'Support the Sardis synagogue', period:{ yearMin:493, yearMax:493 },
    openings:[{ id:'493', revision:'world_v2' },{ id:'493', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:[], institutionId:'jewish_sardis_congregation_493', payer:'household', reserve:0,
    foundation:{ startup:0, capital:0, treasury:0, landRequired:true },
    funds:{ building_care:{ name:'Synagogue care', capacity:8, unitCost:1 } }, outreach:[]
  },
  jewish_sardis_public_giving_476:{
    name:'Support the Sardis synagogue', period:{ yearMin:476, yearMax:493 },
    openings:[{ id:'476', revision:'wider_v2' },{ id:'476', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:[], institutionId:'jewish_sardis_congregation_476', payer:'public', reserve:0, ai:true,
    foundation:{ startup:0, capital:0, treasury:0, landRequired:true },
    funds:{ building_care:{ name:'Synagogue care', capacity:8, unitCost:1 } }, outreach:[]
  },
  jewish_sardis_public_giving_493:{
    name:'Support the Sardis synagogue', period:{ yearMin:493, yearMax:493 },
    openings:[{ id:'493', revision:'world_v2' },{ id:'493', revision:'jewish_samaritan_v3' }], faithIds:['jewish'], affiliationIds:[],
    roleIds:[], institutionId:'jewish_sardis_congregation_493', payer:'public', reserve:0, ai:true,
    foundation:{ startup:0, capital:0, treasury:0, landRequired:true },
    funds:{ building_care:{ name:'Synagogue care', capacity:8, unitCost:1 } }, outreach:[]
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
