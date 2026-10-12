/* Optional declarations. Campaigns and mods place their own institutions. */
FBDATA.religiousAffiliations = {};
/* Lay participation only. Local clergy, legal school, custodianship and
   endowed property need independent declarations. Age 16 and free admission
   are simulation terms; no named incumbent or office is created. */
FBDATA.religiousInstitutionProfiles = { arabian_local_congregation_711: {
  name:'Local Muslim congregation', faithIds:['sunni'], period:{yearMin:711,yearMax:711}, system:null,
  roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
    professions:[],skills:{},affiliationId:null}},
  selection:null,
  recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
  actions:['admit','withdraw'], fees:{}, affiliationIds:[]
}, arabian_local_congregation_800: {
  name:'Local Muslim congregation (800)', faithIds:['sunni'], period:{yearMin:800,yearMax:800}, system:null,
  roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
    professions:[],skills:{},affiliationId:null}},
  selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
  actions:['admit','withdraw'], fees:{}, affiliationIds:[]
}, arabian_local_congregation_867: {
  name:'Local Muslim congregation (867)', faithIds:['sunni'], period:{yearMin:867,yearMax:867}, system:null,
  roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
    professions:[],skills:{},affiliationId:null}},
  selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
  actions:['admit','withdraw'], fees:{}, affiliationIds:[]
}, arabian_local_congregation_1066: {
  name:'Local Muslim congregation (1066)', faithIds:['sunni'], period:{yearMin:1066,yearMax:1066}, system:null,
  roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
    professions:[],skills:{},affiliationId:null}},
  selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
  actions:['admit','withdraw'], fees:{}, affiliationIds:[]
}, arabian_local_congregation_1204: {
  name:'Local Muslim congregation (1204)', faithIds:['sunni'], period:{yearMin:1204,yearMax:1204}, system:null,
  roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
    professions:[],skills:{},affiliationId:null}},
  selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
  actions:['admit','withdraw'], fees:{}, affiliationIds:[]
} };
FBDATA.techImpactReviews.features.arabian_dated_congregations = {
  mode:'none', rationale:'Dated lay membership uses actual local presence and consent, independently of religious office, custody or discovery.'
};
FBDATA.techImpactReviews.features.arabian_local_congregations_711 = {
  mode:'none', rationale:'Voluntary local congregation membership depends on presence and consent, without a discovery requirement or a priestly office.'
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
