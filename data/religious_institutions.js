/* Optional declarations. Campaigns and mods place their own institutions. */
FBDATA.religiousAffiliations = {
  hanafi_learning_800:{
    name:'Hanafi legal learning',faithIds:['sunni'],
    period:{yearMin:800,yearMax:800},exclusiveWith:[]
  },
  shafii_learning_1066:{
    name:"Shafi'i legal learning",faithIds:['sunni'],
    period:{yearMin:1066,yearMax:1066},exclusiveWith:[]
  },
  ashari_learning_1066:{
    name:"Ash'ari theological learning",faithIds:['sunni'],
    period:{yearMin:1066,yearMax:1066},exclusiveWith:[]
  }
};
/* City-level learning reconstructions, without a named building or incumbent.
   Adult lay admission is a simulation rule, not specialist certification. */
FBDATA.religiousInstitutionProfiles = {
  kufa_hanafi_study_800:{
    name:'Kufa Hanafi study circle',faithIds:['sunni'],
    period:{yearMin:800,yearMax:800},system:null,
    roles:{learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw'],fees:{},affiliationIds:['hanafi_learning_800']
  },
  baghdad_shafii_study_1066:{
    name:"Baghdad Shafi'i study circle",faithIds:['sunni'],
    period:{yearMin:1066,yearMax:1066},system:null,
    roles:{learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw'],fees:{},affiliationIds:['shafii_learning_1066']
  },
  nishapur_shafii_ashari_study_1066:{
    name:"Nishapur Shafi'i and Ash'ari study circle",faithIds:['sunni'],
    period:{yearMin:1066,yearMax:1066},system:null,
    roles:{learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw'],fees:{},
    affiliationIds:['shafii_learning_1066','ashari_learning_1066']
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
