/* Optional declarations. Campaigns and mods place their own institutions. */
FBDATA.religiousAffiliations = {};
/* Lay authoring profiles. Historical seats and specialist offices remain separate. */
FBDATA.religiousInstitutionProfiles = {
  kairouan_lay_711:{
    name:'Kairouan Muslim congregation', faithIds:['umayyad_sunni_711'], period:{yearMin:711,yearMax:711}, system:null,
    roles:{participant:{name:'Participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}}, selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  kairouan_lay_800:{
    name:'Kairouan Muslim congregation', faithIds:['sunni'], period:{yearMin:800,yearMax:800}, system:null,
    roles:{participant:{name:'Participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}}, selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  kairouan_lay_867:{
    name:'Kairouan Muslim congregation', faithIds:['sunni'], period:{yearMin:867,yearMax:867}, system:null,
    roles:{participant:{name:'Participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}}, selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  gao_lay_1204:{
    name:'Gao Muslim congregation', faithIds:['sunni'], period:{yearMin:1204,yearMax:1204}, system:null,
    roles:{participant:{name:'Participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}}, selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  garama_offering_community:{
    name:'Garama offering community', faithIds:['berber_traditional'],
    period:{yearMin:476,yearMax:493}, system:null,
    roles:{participant:{name:'Participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  ghana_muslim_learning_1066:{
    name:'Ghana Muslim learning community', faithIds:['sunni'],
    period:{yearMin:1066,yearMax:1066}, system:null,
    roles:{learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
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
FBDATA.techImpactReviews.features.african_lay_community_participation = {
  mode:'none', rationale:'Ordinary local offerings, worship and communal learning require presence and protected access, without specialist office or discovery.'
};
