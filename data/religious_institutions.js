/* Optional declarations. Campaigns and mods place their own institutions. */
FBDATA.religiousAffiliations = {};
FBDATA.religiousInstitutionProfiles = {
  /* Lay support contracts, not reconstructed ordination constitutions. */
  tapa_sardar_lay_support:{
    name:'Tapa Sardar lay support', faithIds:['buddhist_711'],
    period:{yearMin:711,yearMax:799}, system:null,
    roles:{
      learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      supporter:{name:'Lay supporter',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      study_helper:{name:'Learning assistant',minAge:18,sexes:[],unmarried:false,
        professions:[],skills:{int:4},affiliationId:null}
    },
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[],
    ai:{roles:['learner','supporter'],affiliations:[],reserve:0,maxActions:2,recognize:false}
  },
  tepe_narenj_lay_support:{
    name:'Tepe Narenj lay support', faithIds:['buddhist_711'],
    period:{yearMin:711,yearMax:799}, system:null,
    roles:{
      learner:{name:'Learner',minAge:18,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      visitor:{name:'Lay visitor',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null}
    },
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[],
    ai:{roles:['learner','visitor'],affiliations:[],reserve:0,maxActions:1,recognize:false}
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
