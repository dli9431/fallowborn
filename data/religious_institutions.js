/* Campaigns and mods place institutions independently of primary faith. */
FBDATA.religiousAffiliations = {
  east_syriac_nicene_reception:{
    name:'East Syriac Nicene tradition', faithIds:['east_syriac'],
    period:{yearMin:410,yearMax:null}, exclusiveWith:[]
  },
  alexandrian_church_reception:{
    name:'Alexandrian church participation', faithIds:['eastern','miaphysite'],
    period:{yearMin:711,yearMax:null}, exclusiveWith:[]
  },
  /* Learning affiliations leave the household's primary identity unchanged. */
  jewish_rabbinic_learning_early:{
    name:'Local rabbinic learning', faithIds:['jewish'],
    period:{ yearMin:476, yearMax:493 }, exclusiveWith:[]
  },
  jewish_rabbinic_learning_1204:{
    name:'Local rabbinic learning', faithIds:['jewish'],
    period:{ yearMin:1204, yearMax:null }, exclusiveWith:[]
  },
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
FBDATA.religiousInstitutionProfiles = {
  /* Lay service terms do not appoint a priest or certify ritual purity. */
  sasanian_lay_service:{
    name:'Zoroastrian lay service', faithIds:['zoroastrian_sasanian_476'],
    period:{yearMin:476,yearMax:493}, system:null,
    roles:{
      learner:{name:'Learner',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null},
      supporter:{name:'Lay service helper',minAge:16,sexes:[],unmarried:false,
        professions:[],skills:{},affiliationId:null}
    },
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[],
    ai:{roles:['learner'],affiliations:[],reserve:0,maxActions:2,recognize:false}
  },
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
  },
  /* Admission floors and support quorums are explicit simulation choices.
     A study helper is neither an ordained rabbi nor an authorized judge. */
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
  /* Later lay groups imply neither a synagogue building nor a court. */
  jewish_local_congregation_later:{
    name:'Local Jewish congregation', faithIds:['jewish'],
    period:{ yearMin:800, yearMax:1204 }, system:null,
    roles:{
      worshipper:{ name:'Congregant', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null }
    },
    selection:null,
    recognition:{ sources:[], roles:[], quorum:1, requiresLeader:false, protectedWorship:true },
    actions:['admit','withdraw'], fees:{}, affiliationIds:[],
    ai:{ roles:['worshipper'], affiliations:[], reserve:0, maxActions:2, recognize:false }
  },
  karaite_lay_congregation:{
    name:'Local Karaite congregation', faithIds:['karaite'],
    period:{ yearMin:1066, yearMax:1204 }, system:null,
    roles:{
      worshipper:{ name:'Congregant', minAge:16, sexes:[], unmarried:false,
        professions:[], skills:{}, affiliationId:null }
    },
    selection:null,
    recognition:{ sources:[], roles:[], quorum:1, requiresLeader:false, protectedWorship:true },
    actions:['admit','withdraw'], fees:{}, affiliationIds:[],
    ai:{ roles:['worshipper'], affiliations:[], reserve:0, maxActions:2, recognize:false }
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
  },
  /* Lay authoring profiles. Historical seats and specialist offices remain separate. */
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
  },
  /* Lay participation only. Local clergy, legal school, custodianship and
     endowed property need independent declarations. Age 16 and free admission
     are simulation terms; no named incumbent or office is created. */
  arabian_local_congregation_711:{
    name:'Local Muslim congregation', faithIds:['sunni'], period:{yearMin:711,yearMax:711}, system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,
    recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  arabian_local_congregation_800:{
    name:'Local Muslim congregation (800)', faithIds:['sunni'], period:{yearMin:800,yearMax:800}, system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  arabian_local_congregation_867:{
    name:'Local Muslim congregation (867)', faithIds:['sunni'], period:{yearMin:867,yearMax:867}, system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  arabian_local_congregation_1066:{
    name:'Local Muslim congregation (1066)', faithIds:['sunni'], period:{yearMin:1066,yearMax:1066}, system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  arabian_local_congregation_1204:{
    name:'Local Muslim congregation (1204)', faithIds:['sunni'], period:{yearMin:1204,yearMax:1204}, system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null, recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'], fees:{}, affiliationIds:[]
  },
  /* City-level learning reconstructions, without a named building or incumbent.
     Adult lay admission is a simulation rule, not specialist certification. */
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
  },
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
  },
  /* Lay service groups do not certify priests or ascetic admission. */
  debal_lay_service_711:{
    name:'Debal lay service community',faithIds:['hindu_711'],
    period:{yearMin:711,yearMax:711},system:null,
    roles:{participant:{name:'Lay participant',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[]
  },
  brahmanabad_lay_service_711:{
    name:'Brahmanabad lay service community',faithIds:['hindu_711'],
    period:{yearMin:711,yearMax:711},system:null,
    roles:{supporter:{name:'Lay supporter',minAge:16,sexes:[],unmarried:false,
      professions:[],skills:{},affiliationId:null}},
    selection:null,recognition:{sources:[],roles:[],quorum:1,requiresLeader:false,protectedWorship:true},
    actions:['admit','withdraw'],fees:{},affiliationIds:[]
  }
};
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
FBDATA.techImpactReviews.features.christian_local_church_service = {
  mode:'none', rationale:'Dated household church service and local clerical or community mediation depend on presence, qualification and consent. Ordinary supplies and relief require no discovery; existing career technology requirements remain independent.'
};
FBDATA.techImpactReviews.features.opening_office_communion = {
  mode:'none', rationale:'Explicit opening correspondence records personal recognition between living incumbents through existing authority records. It requires no technological discovery and grants no temporal power.'
};
FBDATA.techImpactReviews.features.jewish_samaritan_dated_communities = {
  mode:'none', rationale:'Dated lay communities and household observance require presence and voluntary participation, without a discovery requirement.'
};
FBDATA.techImpactReviews.features.african_lay_community_participation = {
  mode:'none', rationale:'Ordinary local offerings, worship and communal learning require presence and protected access, without specialist office or discovery.'
};

FBDATA.techImpactReviews.features.hindu_lay_service_711 = {
  mode:'none',rationale:'Voluntary lay participation depends on presence and consent, without granting priesthood, an ascetic vow or a researched capability.'
};
