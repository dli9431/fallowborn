/* Independent dated institutions. Numerical eligibility and service costs are
   simulation rules; see docs/research/christian-institutions.md for sources. */
(function () {
  'use strict';
  // A city anchor for this revised world is not an identified church building.
  var samarkandLayout = FBDATA.settlementLayouts['800_inhabited_v2'];
  samarkandLayout.samarkand = (samarkandLayout.samarkand || []).concat([
    {site:'samarkand',name:'Samarkand',kind:'city'}
  ]);
  var openings = [
    {id:'476',revisions:['wider_v2'],institutions:{
      ctesiphon_catholicos_476:{city:'Ctesiphon',kind:'patriarchate',
        provinceId:'baghdad',site:'baghdad_outer_476',culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',historicalName:'Babowai',
        jurisdictionIds:['baghdad'],freshOnly:true}
    }},
    {id:'711',revisions:['terrain_v2_governments_v2'],institutions:{
      ctesiphon_catholicos_711:{city:'Seleucia-Ctesiphon',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',officeSystem:null,vacant:true,freshOnly:true},
      alexandrian_patriarch_711:{city:'Alexandria',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'coptic',religion:'eastern',
        officeId:'alexandrian_coptic_patriarch',officeSystem:null,
        historicalName:'Alexander II',freshOnly:true},
      alexandrian_service_711:{city:'Alexandria',kind:'congregation',
        profileId:'alexandrian_household_service',provinceId:'alexandria',site:'alexandria_711',
        culture:'coptic',religion:'eastern',jurisdictionIds:['alexandria'],vacant:true,freshOnly:true},
      ibrim_service_711:{city:'Ibrim',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'qasr_ibrim',site:'ibrim_711',culture:'nubian',religion:'eastern',
        jurisdictionIds:['qasr_ibrim'],vacant:true,freshOnly:true}
    }},
    {id:'800',revisions:['inhabited_v2_governments_v2'],institutions:{
      baghdad_catholicos_800:{city:'Baghdad',kind:'patriarchate',
        provinceId:'baghdad',site:'baghdad',culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',officeSystem:null,historicalName:'Timothy I',
        jurisdictionIds:['baghdad'],freshOnly:true},
      baghdad_service_800:{city:'Baghdad',kind:'congregation',profileId:'east_syriac_household_service',
        provinceId:'baghdad',site:'baghdad',culture:'syriac',religion:'east_syriac',
        jurisdictionIds:['baghdad'],vacant:true,freshOnly:true},
      samarkand_service_800:{city:'Samarkand',kind:'congregation',profileId:'east_syriac_household_service',
        provinceId:'samarkand',site:'samarkand',culture:'persian',religion:'east_syriac',
        jurisdictionIds:['samarkand'],vacant:true,freshOnly:true},
      alexandrian_patriarch_800:{city:'Alexandria',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'coptic',religion:'eastern',
        officeId:'alexandrian_coptic_patriarch',officeSystem:null,historicalName:'Mark II',
        communionWith:['west_syriac_patriarch_800'],freshOnly:true},
      west_syriac_patriarch_800:{city:'Antioch',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'eastern',
        officeId:'west_syriac_patriarch',officeSystem:null,historicalName:'Cyriacus',
        communionWith:['alexandrian_patriarch_800'],freshOnly:true},
      alexandrian_service_800:{city:'Alexandria',kind:'congregation',
        profileId:'alexandrian_household_service',provinceId:'alexandria',site:'alexandria',
        culture:'coptic',religion:'eastern',jurisdictionIds:['alexandria'],vacant:true,freshOnly:true},
      ibrim_service_800:{city:'Ibrim',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'qasr_ibrim',site:'qasr_ibrim_800',culture:'nubian',religion:'miaphysite',
        jurisdictionIds:['qasr_ibrim'],vacant:true,freshOnly:true}
    }},
    {id:'867',revisions:['governments_v2','inhabited_v2_governments_v2'],institutions:{
      baghdad_catholicos_867:{city:'Baghdad',kind:'patriarchate',
        provinceId:'baghdad',site:'baghdad',culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',officeSystem:null,historicalName:'Sergius',
        jurisdictionIds:['baghdad'],freshOnly:true},
      baghdad_service_867:{city:'Baghdad',kind:'congregation',profileId:'east_syriac_household_service',
        provinceId:'baghdad',site:'baghdad',culture:'syriac',religion:'east_syriac',
        jurisdictionIds:['baghdad'],vacant:true,freshOnly:true},
      alexandrian_patriarch_867:{city:'Alexandria',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'coptic',religion:'eastern',
        officeId:'alexandrian_coptic_patriarch',officeSystem:null,
        historicalName:'Shenute I',freshOnly:true},
      armenian_catholicos_867:{city:'Armenian church',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'armenian',religion:'eastern',
        officeId:'armenian_catholicos',officeSystem:null,historicalName:'Zacharias',freshOnly:true},
      alexandrian_service_867:{city:'Alexandria',kind:'congregation',
        profileId:'alexandrian_household_service',provinceId:'alexandria',site:'alexandria',
        culture:'coptic',religion:'eastern',jurisdictionIds:['alexandria'],vacant:true,freshOnly:true},
      dongola_service_867:{city:'Dongola',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'dongola',site:'dongola',culture:'nubian',religion:'eastern',
        jurisdictionIds:['dongola'],vacant:true,freshOnly:true}
    },expanded:{
      ibrim_service_867:{city:'Ibrim',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'qasr_ibrim',site:'qasr_ibrim_inhabited_867',culture:'nubian',religion:'eastern',
        jurisdictionIds:['qasr_ibrim'],vacant:true,freshOnly:true}
    }},
    {id:'1066',revisions:['governments_v2','inhabited_v2_governments_v2'],institutions:{
      east_syriac_catholicos_1066:{city:'Church of the East',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',officeSystem:null,historicalName:'Sabrisho III',freshOnly:true},
      alexandrian_patriarch_1066:{city:'Alexandria',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'coptic',religion:'eastern',
        officeId:'alexandrian_coptic_patriarch',officeSystem:null,
        historicalName:'Christodoulos',freshOnly:true},
      west_syriac_patriarch_1066:{city:'Antioch',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'eastern',
        officeId:'west_syriac_patriarch',officeSystem:null,historicalName:'John bar Shushan',freshOnly:true},
      alexandrian_service_1066:{city:'Alexandria',kind:'congregation',
        profileId:'alexandrian_household_service',provinceId:'alexandria',site:'alexandria',
        culture:'coptic',religion:'eastern',jurisdictionIds:['alexandria'],vacant:true,freshOnly:true},
      constantinople_greek_service_1066:{city:'Constantinople',kind:'congregation',
        profileId:'greek_local_service',provinceId:'constantinople',site:'constantinople',
        culture:'greek',religion:'orthodox',jurisdictionIds:['constantinople'],vacant:true,freshOnly:true}
    },expanded:{
      ibrim_service_1066:{city:'Ibrim',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'qasr_ibrim',site:'qasr_ibrim_inhabited_1066',culture:'nubian',religion:'miaphysite',
        jurisdictionIds:['qasr_ibrim'],vacant:true,freshOnly:true}
    }},
    {id:'1204',revisions:['inhabited_v2'],institutions:{
      east_syriac_catholicos_1204:{city:'Church of the East',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'east_syriac',
        officeId:'east_syriac_catholicos',officeSystem:null,historicalName:'Yahballaha II',freshOnly:true},
      alexandrian_patriarch_1204:{city:'Alexandria',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'coptic',religion:'eastern',
        officeId:'alexandrian_coptic_patriarch',officeSystem:null,historicalName:'John VI',freshOnly:true},
      west_syriac_patriarch_1204:{city:'Antioch',kind:'patriarchate',
        provinceId:null,site:null,jurisdictionIds:[],culture:'syriac',religion:'eastern',
        officeId:'west_syriac_patriarch',officeSystem:null,vacant:true,freshOnly:true},
      alexandrian_service_1204:{city:'Alexandria',kind:'congregation',
        profileId:'alexandrian_household_service',provinceId:'alexandria',site:'alexandria',
        culture:'coptic',religion:'eastern',jurisdictionIds:['alexandria'],vacant:true,freshOnly:true},
      dongola_service_1204:{city:'Dongola',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'dongola',site:'dongola',culture:'nubian',religion:'eastern',
        jurisdictionIds:['dongola'],vacant:true,freshOnly:true},
      soba_service_1204:{city:'Soba',kind:'congregation',profileId:'nubian_household_service',
        provinceId:'soba',site:'soba_head',culture:'nubian',religion:'eastern',
        jurisdictionIds:['soba'],vacant:true,freshOnly:true},
      constantinople_greek_service_1204:{city:'Constantinople',kind:'congregation',
        profileId:'greek_local_service',provinceId:'constantinople',site:'constantinople',
        culture:'greek',religion:'orthodox',jurisdictionIds:['constantinople'],vacant:true,freshOnly:true},
      constantinople_latin_service_1204:{city:'Constantinople',kind:'congregation',
        profileId:'latin_local_service_1204',provinceId:'constantinople',site:'constantinople',
        culture:'frankish',religion:'catholic',jurisdictionIds:['constantinople'],vacant:true,freshOnly:true}
    }}
  ];
  openings.forEach(function (opening) {
    var base = FBDATA.bookmarks[opening.id];
    opening.revisions.forEach(function (rid) {
      var revision = base.revisions[rid];
      revision.localInstitutions = Object.assign({},base.localInstitutions || {},revision.localInstitutions || {},
        JSON.parse(JSON.stringify(opening.institutions)),
        rid === 'inhabited_v2_governments_v2' ? JSON.parse(JSON.stringify(opening.expanded || {})) : {});
    });
  });
})();
