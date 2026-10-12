/* Optional declarations. Campaigns and mods place their own institutions. */
/* Learning affiliations leave the household's primary identity unchanged. */
FBDATA.religiousAffiliations = {
  jewish_rabbinic_learning_early:{
    name:'Local rabbinic learning', faithIds:['jewish'],
    period:{ yearMin:476, yearMax:493 }, exclusiveWith:[]
  },
  jewish_rabbinic_learning_1204:{
    name:'Local rabbinic learning', faithIds:['jewish'],
    period:{ yearMin:1204, yearMax:null }, exclusiveWith:[]
  }
};
/* Admission floors and support quorums are explicit simulation choices.
   A study helper is neither an ordained rabbi nor an authorized judge. */
FBDATA.religiousInstitutionProfiles = {
  jewish_study_circle_early:{
    name:'Local Jewish study circle', faithIds:['jewish'],
    period:{ yearMin:476, yearMax:493 }, system:null,
    roles:{
      learner:{ name:'Learner', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null },
      study_helper:{ name:'Study helper', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{ int:4 }, affiliationId:'jewish_rabbinic_learning_early' }
    },
    selection:null,
    recognition:{ sources:['institution_support'], roles:['learner','study_helper'],
      quorum:2, requiresLeader:false, protectedWorship:true },
    actions:['admit','affiliate','recognize','dispute','withdraw','assent'],
    fees:{}, affiliationIds:['jewish_rabbinic_learning_early'],
    ai:{ roles:['learner'], affiliations:[], reserve:0, maxActions:2, recognize:false }
  },
  jewish_sardis_congregation:{
    name:'Sardis Jewish congregation', faithIds:['jewish'],
    period:{ yearMin:476, yearMax:493 }, system:null,
    roles:{
      worshipper:{ name:'Congregant', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null }
    },
    selection:null,
    recognition:{ sources:['institution_support'], roles:['worshipper'],
      quorum:2, requiresLeader:false, protectedWorship:true },
    actions:['admit','recognize','dispute','withdraw','assent'], fees:{}, affiliationIds:[],
    ai:{ roles:['worshipper'], affiliations:[], reserve:0, maxActions:2, recognize:false }
  },
  jewish_study_group_1204:{
    name:'Local Jewish study group', faithIds:['jewish'],
    period:{ yearMin:1204, yearMax:null }, system:null,
    roles:{
      learner:{ name:'Learner', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null },
      study_helper:{ name:'Study helper', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{ int:4 }, affiliationId:'jewish_rabbinic_learning_1204' }
    },
    selection:null,
    recognition:{ sources:['institution_support'], roles:['learner','study_helper'],
      quorum:2, requiresLeader:false, protectedWorship:true },
    actions:['admit','affiliate','recognize','dispute','withdraw','assent'],
    fees:{}, affiliationIds:['jewish_rabbinic_learning_1204'],
    ai:{ roles:['learner'], affiliations:[], reserve:0, maxActions:2, recognize:false }
  },
  /* Lay membership grants no Samaritan priesthood or sanctuary access. */
  samaritan_lay_congregation:{
    name:'Local Samaritan congregation', faithIds:['samaritan'],
    period:{ yearMin:476, yearMax:null }, system:null,
    roles:{
      worshipper:{ name:'Congregant', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null }
    },
    selection:null,
    recognition:{ sources:[], roles:[], quorum:1, requiresLeader:false, protectedWorship:true },
    actions:['admit','withdraw'], fees:{}, affiliationIds:[],
    ai:{ roles:['worshipper'], affiliations:[], reserve:0, maxActions:2, recognize:false }
  }
};
FBDATA.legitimacySources.institution_support = {
  name:'Institutional recognition', succession:'reaffirm', institutional:true
};
FBDATA.techImpactReviews.features.religious_institution_membership = {
  mode:'none', rationale:'Membership and school affiliation depend on declared qualification and consent, without a discovery requirement.'
};
FBDATA.techImpactReviews.features.religious_institution_selection = {
  mode:'none', rationale:'Local selection and vacancy use existing spiritual offices and current community or patron consent.'
};
FBDATA.techImpactReviews.features.religious_institution_recognition = {
  mode:'none', rationale:'Scoped recognition and mediation depend on living constituents and protected worship rather than research.'
};
FBDATA.techImpactReviews.features.religious_institution_household_paths = {
  mode:'none', rationale:'Local lay and specialist qualification and household promises depend on membership. Existing career technology requirements remain separate.'
};
FBDATA.techImpactReviews.features.religious_institution_ai = {
  mode:'none', rationale:'Institutional decisions use declared consent and the payer’s existing budget and reserve, without a discovery requirement.'
};
FBDATA.techImpactReviews.features.religious_institution_constitutional_binding = {
  mode:'none', rationale:'Explicit temporal binding reads a canonical qualified incumbent and existing public rights, independently of spiritual membership or research.'
};
