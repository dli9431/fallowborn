/* Campaigns and mods place institutions independently of primary faith. */
FBDATA.religiousAffiliations = {
  east_syriac_nicene_reception:{
    name:'East Syriac Nicene tradition', faithIds:['east_syriac'],
    period:{yearMin:410,yearMax:null}, exclusiveWith:[]
  },
  alexandrian_church_reception:{
    name:'Alexandrian church participation', faithIds:['eastern','miaphysite'],
    period:{yearMin:711,yearMax:null}, exclusiveWith:[]
  }
};
FBDATA.religiousInstitutionProfiles = {
  east_syriac_church_service:{
    name:'East Syriac church service', faithIds:['east_syriac'],
    period:{yearMin:493,yearMax:null}, system:null,
    roles:{
      household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null,pathId:'late_antique_lay'},
      cleric:{name:'Local priest',minAge:18,sexes:['m'],unmarried:false,
        professions:['priest'],skills:{lea:3,int:3},affiliationId:null,
        pathId:'late_antique_clerical'}
    },
    selection:null,
    recognition:{sources:['institution_support'],roles:['cleric'],quorum:1,
      requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw','assent','recognize','mediate','dispute'],
    fees:{}, affiliationIds:['east_syriac_nicene_reception'],
    ai:{roles:['cleric'],affiliations:[],reserve:0,maxActions:2,recognize:false}
  },
  east_syriac_household_service:{
    name:'East Syriac household service', faithIds:['east_syriac'],
    period:{yearMin:711,yearMax:null}, system:null,
    roles:{household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null,pathId:'late_antique_lay'}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw'],fees:{},
    affiliationIds:['east_syriac_nicene_reception']
  },
  alexandrian_household_service:{
    name:'Alexandrian household service', faithIds:['eastern','miaphysite'],
    period:{yearMin:711,yearMax:null}, system:null,
    roles:{
      household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      helper:{name:'Relief helper',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{int:3},affiliationId:null}
    },
    selection:null,
    recognition:{sources:['institution_support'],roles:['helper'],quorum:2,
      requiresLeader:false,protectedWorship:true},
    actions:['admit','affiliate','withdraw','assent','recognize','mediate','dispute'],
    fees:{},affiliationIds:['alexandrian_church_reception']
  },
  nubian_household_service:{
    name:'Nubian Christian household service', faithIds:['eastern','miaphysite'],
    period:{yearMin:711,yearMax:null}, system:null,
    roles:{household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[]
  },
  greek_local_service:{
    name:'Greek church service', faithIds:['orthodox'],
    period:{yearMin:692,yearMax:null}, system:null,
    roles:{
      household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      priest:{name:'Local presbyter',minAge:24,sexes:['m'],unmarried:false,
        professions:['priest'],skills:{int:3},affiliationId:null},
      monastic:{name:'Monastic participant',minAge:18,sexes:[],unmarried:true,
        professions:['monk'],skills:{},affiliationId:null}
    },
    selection:null,
    recognition:{sources:['institution_support'],roles:['priest'],quorum:1,
      requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw','assent','recognize','mediate','dispute'],
    fees:{},affiliationIds:[]
  },
  latin_local_service_1204:{
    name:'Latin church service', faithIds:['catholic'],
    period:{yearMin:1123,yearMax:null}, system:null,
    roles:{
      household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      priest:{name:'Local priest',minAge:24,sexes:['m'],unmarried:true,
        professions:['priest'],skills:{int:3},affiliationId:null},
      monastic:{name:'Monastic participant',minAge:18,sexes:[],unmarried:true,
        professions:['monk'],skills:{},affiliationId:null}
    },
    selection:null,
    recognition:{sources:['institution_support'],roles:['priest'],quorum:1,
      requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw','assent','recognize','mediate','dispute'],
    fees:{},affiliationIds:[]
  },
  dvin_church_service:{
    name:'Dvin church service', faithIds:['caucasian_christian_476'],
    period:{yearMin:493,yearMax:null}, system:null,
    roles:{
      household:{name:'Household participant',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      helper:{name:'Relief helper',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{int:3},affiliationId:null}
    },
    selection:null,
    recognition:{sources:['institution_support'],roles:['helper'],quorum:2,
      requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw','assent','recognize','mediate','dispute'],
    fees:{}, affiliationIds:[]
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
FBDATA.techImpactReviews.features.christian_local_church_service = {
  mode:'none', rationale:'Dated household church service and local clerical or community mediation depend on presence, qualification and consent. Ordinary supplies and relief require no discovery; existing career technology requirements remain independent.'
};
FBDATA.techImpactReviews.features.opening_office_communion = {
  mode:'none', rationale:'Explicit opening correspondence records personal recognition between living incumbents through existing authority records. It requires no technological discovery and grants no temporal power.'
};
