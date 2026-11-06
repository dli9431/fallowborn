FB.bookmarkSources.stage({"source":"data/bookmark_634_courts.js","bookmarks":["634"],"catalogs":[],"shared":[]}, function (FBDATA) {
/* Complete source declarations, unpublished until whole-world assembly.
   Office terms, generated households and recognition weights are simulation
   settings. No historical relative, provincial incumbent or estate is implied. */
FBDATA.bookmarkRevisionContent_634_courts = {
  bookmarkId:'634',revision:'core_courts_v4',
  realms:[
    {id:'rashidun_634',name:'Medinan Caliphate',capital:'medina',rank:4,
      aggression:0,color:'#568778',religion:'medinan_court_634',government:'medinan_selection_634',
      ruler:{name:'Umar',sex:'m',culture:'arabic',born:582,mar:7,trait:'patient'},
      royalCourt:{members:[],spouseId:null}},
    {id:'byzantium_634',name:'Eastern Roman Empire',capital:'constantinople',rank:4,
      aggression:0,color:'#a04fb0',religion:'chalcedonian',government:'administrative_monarchy',
      administrationProfileId:'byzantine_634',
      ruler:{name:'Heraclius',sex:'m',culture:'greek',born:575,mar:7,trait:'patient'},
      governingIdentity:{eliteCultureId:'greek',eliteFaithId:'chalcedonian',legalIdentityId:'late_roman',
        tolerance:'preference',taxation:'equal',justicePolicy:'personal'},
      royalCourt:{members:[],spouseId:null}},
    {id:'sasanian_634',name:'Sasanian Empire',capital:'baghdad',rank:4,
      aggression:0,color:'#977449',religion:'zoroastrian_sasanian_634',government:'aristocratic_monarchy',
      administrationProfileId:'sasanian_provinces_634',aristocraticProfileId:'sasanian_634',
      ruler:{name:'Yazdegerd III',sex:'m',culture:'persian',born:624,mar:5,trait:'patient'},
      governingIdentity:{eliteCultureId:'persian',eliteFaithId:'zoroastrian_sasanian_634',
        legalIdentityId:'sasanian_civil_634',tolerance:'tolerant',taxation:'equal',justicePolicy:'elite'},
      royalCourt:{dynasty:'Sasan',founderId:'ruler',members:[],spouseId:null}}
  ],
  governmentForms:{
    medinan_selection_634:{holders:'direct',succession:'crown_election',territory:'fixed',
      consent:'local_reserved',levy:'elective_service',revenue:'elective_receipts',
      council:'local_interests',diplomacy:'territorial_diplomacy',ai:'elective_selection',ladder:'local_standing',
      officeCatalogue:[],systems:{disable:['roman_offices','feudal_service','estates','royal_council',
        'scutage','manorial_tenure','colonate','civic_institutions','episcopal_sees','public_offices']},
      selectionProfile:{eligibility:{minAge:18,sex:'m',ancestry:false},
        candidatePool:{gentle:false,cultures:[],religions:['early_islam_634','medinan_court_634'],excludedRoles:[]},
        procedure:{designation:true,realmRecognition:true,interimRevenue:true,defensiveLevy:true,livingNomination:true},
        tieBreak:'identity',consensus:0.6,quorum:1,negotiationCost:0,terms:{levy:0.6,revenue:0.6},
        reserved:['levy','war','treaty','grant','extraordinary_tax'],
        members:[{id:'medinan_assent',name:'Medinan assent',principal:'capital_community',scope:'capital',
          basis:'community_assent',weight:1,continuity:'institution',minimumSupport:-100,
          minimumMartial:0,maximumLevy:1,maximumRevenue:1}]}}
  },
  administrationProfiles:{
    byzantine_634:{name:'Eastern Roman public administration (634)',
      offices:['public_governor','public_fiscal_officer','public_commander'],
      governor:'public_governor',fiscal:'public_fiscal_officer',commander:'public_commander',
      appointmentCost:5,termDays:720,confirmation:'reaffirm',
      finance:{kind:'salary',share:0.1,salary:4,serviceShare:0,remittance:1},
      accession:{mode:'recognition',minimumAge:16,allowMinor:false,officeCandidates:true,threshold:0.5,
        interests:[{id:'civil',role:'fiscal',weight:1},{id:'military',role:'commander',weight:1}]}},
    sasanian_provinces_634:{name:'Sasanian provincial service (634)',
      offices:['provincial_governor','provincial_receiver','provincial_commander'],
      governor:'provincial_governor',fiscal:'provincial_receiver',commander:'provincial_commander',
      appointmentCost:5,termDays:720,confirmation:'continues',
      finance:{kind:'revenue_service',share:0.1,salary:0,serviceShare:0,remittance:1},
      accession:{mode:'recognition',minimumAge:16,allowMinor:true,officeCandidates:false,threshold:0.6,interests:[]}}
  },
  aristocraticProfiles:{
    sasanian_634:{name:'Sasanian royal and magnate court (634)',administrationProfileId:'sasanian_provinces_634',
      minimumAge:16,allowMinor:true,threshold:0.6,openingStewardActorId:'sasanian_magnate_a_634',
      negotiationCost:8,defaultTerms:{revenue:0.75,levy:0.7},minimumRevenue:0.55,minimumLevy:0.4,
      refusalSupport:-20,enforcementSupportCost:8,
      interests:[
        {id:'provincial_a',name:'Generated Caspian household',dynasty:'Caspian Hearth',actorId:'sasanian_magnate_a_634',
          provinceId:'qazvin',officeId:'hereditary_interest',weight:3,minimumMartial:0,maximumRevenue:0.8,maximumLevy:0.8},
        {id:'provincial_b',name:'Generated Spahan household',dynasty:'Spahan Orchard',actorId:'sasanian_magnate_b_634',
          provinceId:'isfahan',officeId:'hereditary_interest',weight:2,minimumMartial:0,maximumRevenue:0.75,maximumLevy:0.7}]}
  }
};
/* Native companion for one copy into opening.actors. Omitted names request
   generated principals; these are fictional households, not historical houses. */
FBDATA.bookmarkOpeningActors634 = {
  sasanian_magnate_a_634:{sex:'m',culture:'persian',religion:'zoroastrian_sasanian_634',born:599,
    station:3,role:'notable',dyn:'Caspian Hearth',home:'qazvin',skills:{ste:8,mar:8}},
  sasanian_magnate_b_634:{sex:'m',culture:'persian',religion:'zoroastrian_sasanian_634',born:599,
    station:3,role:'notable',dyn:'Spahan Orchard',home:'isfahan',skills:{ste:8,mar:7}}
};
});
