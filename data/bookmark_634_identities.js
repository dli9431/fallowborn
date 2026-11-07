FB.bookmarkSources.stage({"source":"data/bookmark_634_identities.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Autumn 634 faith declarations. These literal tables remain inert until the
   complete bookmark composer publishes detached copies after registering 634.
   No current faith, saved identity, institution or world is changed here. */
FBDATA.bookmarkReligions634 = {
  alexandria_imperial_chalcedonian_634:{
    name:'Alexandrian imperial ecclesiastical claim',parent:'chalcedonian',relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],consumers:['character','institution']},
    properties:{head:null,holyWarTradition:null,tournamentTradition:null,raidingTradition:false}
  },
  medinan_court_634:{
    name:'Medinan caliphal court',parent:'early_islam_634',relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],consumers:['character','ruler','start','conversion']},
    properties:{head:{officeId:'medinan_caliph_634',title:'Caliph',holderKind:'character',
      realm:'rashidun_634',seat:'medina',minAge:18,holderSex:'m',succession:'political_incumbent'},
      holyWarTradition:null,tournamentTradition:null,raidingTradition:false,religiousPaths:null}
  },
  early_islam_634:{
    name:'Early Islamic community', parent:'muslim', relationToParent:'in_fold',
    availability:{yearMin:622,bookmarkIds:['634'],
      consumers:['community','character','ruler','institution','start','story','conversion','project']},
    /* Political authority does not establish a separate religious head.
       Muslim legal dispatch and family capacity are compatibility settings. */
    properties:{head:null,holyWarTradition:null,tournamentTradition:null,
      raidingTradition:false,religiousPaths:null,legalTradition:'muslim',
      marriage:{spouseLimit:{m:4,f:1},divorce:{enabled:false},
        acceptedRelations:['same','in_fold'],kinship:{siblingRite:null}}}
  },
  zoroastrian_sasanian_634:{
    name:'Sasanian Zoroastrian community', parent:'zoroastrian', relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],
      consumers:['community','character','ruler','institution','start','story','conversion','project']},
    /* Reuse the existing customary dispatcher, without claiming a recovered
       seventh-century civil code or granting priestly qualifications. */
    properties:{head:null,holyWarTradition:null,raidingTradition:false,
      religiousPaths:null,legalTradition:'sasanian_custom_476',
      marriage:{spouseLimit:{m:1,f:1},kinship:{siblingRite:null}},
      words:{cleric:'Community keeper',landed:'Ruler'},
      roles:{monasticM:'Learner',monasticF:'Learner',priestM:'Community keeper',priestF:'Community keeper'}}
  },
  chalcedonian_local_634:{
    name:'Local Chalcedonian community', parent:'chalcedonian', relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],
      consumers:['community','character','start','story','conversion','project']},
    properties:{head:null,religiousPaths:null,holyWarTradition:null,
      tournamentTradition:null,raidingTradition:false,legalTradition:'byzantine',
      marriage:{spouseLimit:{m:1,f:1},divorce:{enabled:false},
        acceptedRelations:['same','in_fold'],kinship:{siblingRite:null}},
      words:{cleric:'Community participant',landed:'Ruler'},
      roles:{monasticM:'Learner',monasticF:'Learner',priestM:'Community participant',priestF:'Community participant'}}
  },
  east_syriac_local_634:{
    name:'Local East Syriac community', parent:'east_syriac', relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],
      consumers:['community','character','start','story','conversion','project']},
    properties:{head:null,religiousPaths:null,holyWarTradition:null,
      tournamentTradition:null,raidingTradition:false,legalTradition:'sasanian_custom_476',
      marriage:{spouseLimit:{m:1,f:1},divorce:{enabled:false},
        acceptedRelations:['same','in_fold'],kinship:{siblingRite:null}},
      words:{cleric:'Community participant',landed:'Ruler'},
      roles:{monasticM:'Learner',monasticF:'Learner',priestM:'Community participant',priestF:'Community participant'}}
  },
  west_syriac_lay_634:{
    name:'West Syriac lay community', parent:'miaphysite', relationToParent:'in_fold',
    availability:{yearMin:634,bookmarkIds:['634'],
      consumers:['community','character','ruler','institution','start','story','conversion','project']},
    /* A bounded lay presentation, not a denomination or an ordained route.
       Customary law and family eligibility are explicit game simplifications. */
    properties:{head:null,religiousPaths:null,holyWarTradition:null,
      raidingTradition:false,legalTradition:'customary',
      marriage:{spouseLimit:{m:1,f:1},divorce:{enabled:false},
        acceptedRelations:['same','in_fold'],kinship:{siblingRite:null}}}
  }
};

/* Preserve the extracted literal and its detached court companion. The complete
   assembler publishes it together with the hidden world and exact starts. */
FBDATA.bookmarkCourtReligions634 = {medinan_court_634:FBDATA.bookmarkReligions634.medinan_court_634};
delete FBDATA.bookmarkReligions634.medinan_court_634;

/* A limited public-dispute policy, not a recovered code or communal family law.
   Existing faith law remains unchanged for saved and religious consumers. */
FBDATA.bookmarkRevisionContent_634_identities = {
  bookmarkId:'634',revision:'core_identities_v3',
  legalTraditions:{
    sasanian_civil_634:{name:'Sasanian civil practice',
      sentences:['release','pardon','ransom','fine','imprisonment','exile','forfeiture','execution'],
      procedures:{arrest:true,hearing:true,ransom:true,pardon:true,
        compensationMaxSeverity:3,penanceMaxSeverity:0},
      justification:{evidence:['testimony','material','redhanded']},
      ai:{minor:['fine'],serious:['imprisonment'],severe:['execution'],
        arbitrary:['imprisonment'],excessive:['execution']}}
  }
};

/* Additive selectors only. The composer must copy each availability record
   and union bookmarkIds, retaining every other selector and prior permission.
   These tables are source organization, not additional runtime JSON roots. */
FBDATA.bookmarkFaithAvailability634 = {
  insular_traditional_476:{bookmarkIds:['634']},
  finnic_traditional_476:{bookmarkIds:['634']},
  woodland_traditional_476:{bookmarkIds:['634']},
  steppe_traditional_476:{bookmarkIds:['634']},
  caucasian_traditional_476:{bookmarkIds:['634']},
  nile_traditional_476:{bookmarkIds:['634']},
  horn_traditional_476:{bookmarkIds:['634']},
  arabian_traditional_476:{bookmarkIds:['634']},
  iranian_traditional_476:{bookmarkIds:['634']},
  sogdian_traditional_476:{bookmarkIds:['634']},
  caucasian_christian_476:{bookmarkIds:['634']},
  aksumite_christian_476:{bookmarkIds:['634']},
  buddhist_476:{bookmarkIds:['634']},
  brahmanical_476:{bookmarkIds:['634']},
  sahel_traditional_476:{bookmarkIds:['634']}
};
});
