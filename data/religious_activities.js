/* Local early-opening reconstructions. Costs, duration and social rewards are
   simulation choices; district scope does not place an exact sanctuary. */
FBDATA.religiousActivities = {
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
  }
};
FBDATA.religiousPatronage = {};
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
