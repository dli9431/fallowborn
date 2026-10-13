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
  },
  /* Consumers require their own accepted campaign placements. No declaration
     creates a community, premises, incumbent or property. Amounts and time are
     simulation choices; household study is separate from specialist admission. */
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
  },
  /* Dated local reconstructions. Costs, duration and social rewards are
     simulation choices; district scope does not place an exact sanctuary. */
  uppakra_local_observance:{
    name:'Join local observance in the Uppakra district',
    period:{ yearMin:400, yearMax:599 },
    openings:[{ id:'476', revision:'wider_v2' }, { id:'493', revision:'world_v2' }],
    faithIds:['germanic_pagan'], affiliationIds:[], roleIds:[], institutionId:null,
    provinceIds:['lund'], protectedWorship:true,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:1, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'uppakra_local_observance', reward:{ piety:1, prestige:1, skills:{} }, legacy:null, service:null
  },
  samogitian_mortuary_observance:{
    name:'Keep a household remembrance in Samogitia',
    period:{ yearMin:400, yearMax:599 },
    openings:[{ id:'476', revision:'wider_v2' }, { id:'493', revision:'world_v2' }],
    faithIds:['baltic_pagan'], affiliationIds:[], roleIds:[], institutionId:null,
    provinceIds:['samogitia'], protectedWorship:true,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:2,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'samogitian_mortuary_observance', reward:{ piety:1, prestige:0, skills:{} }, legacy:null, service:null
  },
  samogitian_mortuary_support:{
    name:'Provide materials for a household remembrance in Samogitia',
    period:{ yearMin:400, yearMax:599 },
    openings:[{ id:'476', revision:'wider_v2' }, { id:'493', revision:'world_v2' }],
    faithIds:['baltic_pagan'], affiliationIds:[], roleIds:[], institutionId:null,
    provinceIds:['samogitia'], protectedWorship:true,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:1, reserve:0, duration:2,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'samogitian_mortuary_observance', reward:{ piety:1, prestige:0, skills:{} }, legacy:null, service:null
  },
  uppsala_local_gathering:{
    name:'Support a local gathering in the Uppsala district',
    period:{ yearMin:1066, yearMax:1066 },
    openings:[{ id:'1066', revision:'baseline' }, { id:'1066', revision:'inhabited_v2' }],
    faithIds:['norse_pagan'], affiliationIds:[], roleIds:[], institutionId:null,
    provinceIds:['uppsala'], protectedWorship:true,
    mode:'local', purpose:null, siteId:null, payer:'household', cost:1, reserve:0, duration:2,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant',
    milestone:'uppsala_local_gathering', reward:{ piety:1, prestige:1, skills:{} }, legacy:null, service:null
  },
  /* These declarations require an explicitly placed, accessible local institution. */
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
  },
  /* Local worship is separate from pilgrimage, political allegiance and work.
     The year/opening windows are bounded research scopes, not closure dates.
     One day, no fee and one piety once per participant are simulation terms. */
  medina_local_worship_711:{
    name:'Join local worship in Medina', period:{yearMin:711,yearMax:711},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['sunni','umayyad_sunni_711'], affiliationIds:[], roleIds:[], institutionId:'medina_congregation_711',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'medina_local_worship_711',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  sanaa_local_worship_711:{
    name:'Join local worship in Sanaa', period:{yearMin:711,yearMax:711},
    openings:[{id:'711',revision:'terrain_v2_governments_v2'}],
    faithIds:['sunni','umayyad_sunni_711'], affiliationIds:[], roleIds:[], institutionId:'sanaa_congregation_711',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'sanaa_local_worship_711',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  mecca_local_worship_800:{
    name:'Join local worship in Mecca (800)', period:{yearMin:800,yearMax:800}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','ibadi','imami_pre_occultation'],
    affiliationIds:[], roleIds:[], institutionId:'mecca_congregation_800',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'mecca_local_worship_800',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  medina_local_worship_800:{
    name:'Join local worship in Medina (800)', period:{yearMin:800,yearMax:800}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','ibadi','imami_pre_occultation'],
    affiliationIds:[], roleIds:[], institutionId:'medina_congregation_800',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'medina_local_worship_800',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  mecca_local_worship_867:{
    name:'Join local worship in Mecca (867)', period:{yearMin:867,yearMax:867}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','ibadi','zaydi','imami_pre_occultation'],
    affiliationIds:[], roleIds:[], institutionId:'mecca_congregation_867',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'mecca_local_worship_867',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  medina_local_worship_867:{
    name:'Join local worship in Medina (867)', period:{yearMin:867,yearMax:867}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','ibadi','zaydi','imami_pre_occultation'],
    affiliationIds:[], roleIds:[], institutionId:'medina_congregation_867',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'medina_local_worship_867',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  mecca_local_worship_1066:{
    name:'Join local worship in Mecca (1066)', period:{yearMin:1066,yearMax:1066}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','zaydi','imami_twelver','ismaili_fatimid'],
    affiliationIds:[], roleIds:[], institutionId:'mecca_congregation_1066',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'mecca_local_worship_1066',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
  },
  mecca_local_worship_1204:{
    name:'Join local worship in Mecca (1204)', period:{yearMin:1204,yearMax:1204}, openings:[],
    faithIds:['sunni','shia','ashari','maturidi','zaydi','ismaili_nizari_1204','ismaili_tayyibi_1204'],
    affiliationIds:[], roleIds:[], institutionId:'mecca_congregation_1204',
    mode:'local', purpose:null, siteId:null, payer:'household', cost:0, reserve:0, duration:1,
    calendar:'any_day', interruption:'retain_cost', recipient:'participant', milestone:'mecca_local_worship_1204',
    reward:{piety:1,prestige:0,skills:{}}, legacy:null, service:null
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
  },
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
FBDATA.techImpactReviews.features.arabian_dated_local_worship = {
  mode:'none', rationale:'Ordinary household worship uses actual protected presence, without a technology requirement or a pilgrimage performance claim.'
};
FBDATA.techImpactReviews.features.arabian_local_worship_711 = {
  mode:'none', rationale:'Local household worship depends on actual access and presence, without granting an office, travel award or researched capability.'
};
FBDATA.balance.religiousOutreachPressure = 0.10;
FBDATA.techImpactReviews.features.northern_local_observance = {
  mode:'none', rationale:'District household observance and remembrance use actual presence, local worship access and the household budget without a discovery requirement.'
};
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
