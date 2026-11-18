FB.bookmarkSources.stage({source:'data/bookmark_451_governments.js',bookmarks:['451'],catalogs:[],shared:[]}, function (FBDATA) {
/* Dated policy catalogues use the ordinary government, mandate and mobile
   validators. Numerical terms are simulation choices, not recovered treaties. */
FBDATA.bookmarkRevisionContent_451_governments = {
  bookmarkId:'451',revision:'scaffold',realms:[
    {id:'hunnic_coalition_451',name:'Hunnic Coalition',color:'#a58258',capital:'sirmium',
      nonTerritorial:true,government:'mobile_confederation',culture:'hunnic_451',
      religion:'hunnic_court_practices_451',rank:3,aggression:0,
      ruler:{name:'Attila',sex:'m',culture:'hunnic_451',born:401,mar:8,trait:'patient'},
      royalCourt:{founderId:'ruler',spouseId:null,members:[]},
      mobile:{profileId:'danubian_coalition_451',patronRealmId:null,
        sponsorship:{schema:1,kind:'independent'},origin:'sirmium',target:'sirmium',
        food:1170,fighters:240,treasury:60,
        opening:{leaderMemberId:'central_following',principals:[
          {memberId:'central_following',person:{kind:'realm_ruler',actorId:'attila_451',
            realmId:'hunnic_coalition_451',generation:1}},
          {memberId:'gothic_contingent',person:{kind:'opening_actor',actorId:'valamir_451'}}
        ],muster:[
          {memberId:'central_following',unitId:'arch',count:90},
          {memberId:'central_following',unitId:'cav',count:60},
          {memberId:'gepid_contingent',unitId:'levy',count:60},
          {memberId:'gothic_contingent',unitId:'levy',count:30}
        ],reserves:[{memberId:'central_following',count:0},
          {memberId:'gepid_contingent',count:0},{memberId:'gothic_contingent',count:0}]},
        hostedAccess:{id:'sirmium_concession',partnerRealmId:'sirmium_local_451',
          partnerActorId:'sirmium_custodian_451',countyIds:['sirmium'],capacity:1300,
          allowRecruit:false,duration:90}}}
  ],governmentForms:{},
  administrationProfiles:{
    sasanian_provinces_451:{name:'Sasanian provincial service (451)',
      offices:['sasanian_shahrab','sasanian_receiver','sasanian_host_commander'],
      governor:'sasanian_shahrab',fiscal:'sasanian_receiver',commander:'sasanian_host_commander',
      appointmentCost:5,termDays:720,confirmation:'continues',
      finance:{kind:'revenue_service',share:0.1,salary:0,serviceShare:0,remittance:1},
      accession:{mode:'recognition',minimumAge:16,allowMinor:true,officeCandidates:false,threshold:0.6,interests:[]}}
  },aristocraticProfiles:{
    sasanian_court_451:{name:'Sasanian royal and magnate court (451)',administrationProfileId:'sasanian_provinces_451',
      openingGovernor:{actorId:'ctesiphon_governor',provinceId:'baghdad'},
      minimumAge:16,allowMinor:true,threshold:0.6,negotiationCost:8,
      defaultTerms:{revenue:0.75,levy:0.7},minimumRevenue:0.55,minimumLevy:0.4,
      refusalSupport:-20,enforcementSupportCost:8,interests:[
        {id:'mihran',name:'Mihran family interest',dynasty:'Mihran',actorId:'mihran_elder',
          provinceId:'rayy',officeId:'sasanian_wuzurg',weight:3,minimumMartial:0,maximumRevenue:0.8,maximumLevy:0.8},
        {id:'karen',name:'Karen family interest',dynasty:'Karen',actorId:'karen_elder',
          provinceId:'hamadan',officeId:'sasanian_wuzurg',weight:3,minimumMartial:0,maximumRevenue:0.75,maximumLevy:0.7},
        {id:'van_interest',name:'Tushpa district interest',dynasty:'Tushpa district',actorId:'van_magnate',
          provinceId:'van',officeId:'hereditary_interest',weight:2,minimumMartial:0,maximumRevenue:0.75,maximumLevy:0.7},
        {id:'dvin_interest',name:'Dvin district interest',dynasty:'Dvin',actorId:'dvin_magnate',
          provinceId:'dvin',officeId:'hereditary_interest',weight:2,minimumMartial:0,maximumRevenue:0.75,maximumLevy:0.7}
      ]}
  }
};
FBDATA.bookmarkOffices451 = {
  senior_command_451:{name:'Magister utriusque militiae',
    desc:'Senior field service under the appointing court. Only commissioned forces and declared court business fall within the mandate; household property remains separate.',
    powers:['ban'],scopes:['host'],succession:'reaffirm',
    recognitionSources:['imperial_commission','army_acclamation'],
    appointment:{gold:15,prestige:20,skill:'mar',minimum:6},
    mandate:{schema:1,powers:['command','negotiate','pay','propose'],tenureDays:360,
      favor:{source:'court_standing',minimum:-20},dismissal:'court',responseDays:90,
      contractTemplates:['court_paid_service'],hostIds:[],
      acclamation:{officeId:'imperial_office',sourceId:'army_acclamation',minimumSources:2,
        requiredMandates:['command'],dispute:true,afterDismissal:true}}},
  senior_service_451:{name:'Senior command: court business',
    desc:'Negotiate funded service and propose officers for the western court. This warrant grants no field army, civil jurisdiction or private estate. Command requires a separate commission over an actual host.',
    powers:[],scopes:['realm'],succession:'reaffirm',recognitionSources:['imperial_commission'],
    appointment:{gold:15,prestige:20,skill:'mar',minimum:6},
    mandate:{schema:1,powers:['negotiate','pay','propose'],tenureDays:360,
      favor:{source:'court_standing',minimum:-20},dismissal:'court',responseDays:90,
      contractTemplates:['court_paid_service'],hostIds:[]}}
};
FBDATA.bookmarkMobileProfiles451 = {
  danubian_coalition_451:{minAge:18,threshold:0.6,maxMembers:12,maxAgreements:12,
    recruitShare:0.25,recruitCost:0.02,foodPerPerson:0.01,pasturePerPerson:1.8,
    accessDays:90,accessPrice:4,starvationShare:0.001,defeatShare:0.02,
    settlementForm:'regnum',regions:['sirmium','osijek'],
    members:[
      {id:'central_following',weight:4,pledge:0.25,population:600},
      {id:'gepid_contingent',weight:3,pledge:0.2,population:400},
      {id:'gothic_contingent',weight:2,pledge:0.15,population:300}
    ],
    supplyPolicy:{schema:1,targetDays:30,carryDays:30,cashReserve:20,
      replacement:{targetMen:240,maxPerReview:30,unitIds:['levy','arch','cav']}},
    extractionPolicy:{schema:1,
      demand:{kinds:['tribute','protection'],maxPayment:8,maxDays:90},
      raid:{maxGold:12,maxFood:120,stockShare:0.1,cooldownDays:90},
      hire:{templateIds:['court_paid_service']}},
    cohesionPolicy:{schema:1,initialSupport:65,victory:6,defeat:-12,receiptShare:24,
      scarcity:{days:7,support:-1},idle:{seasons:2,support:-8},standing:{target:0,factor:0.05},
      thresholds:{depart:15,withhold:35,rival:50},distribution:{mode:'weight',favorites:1}},
    seasonalRound:{schema:1,automate:true,travelFoodRate:0.25,grounds:[
      {id:'sirmium_grounds',name:'Sirmium',countyId:'sirmium',
        climateZone:'northern_temperate',seasonKinds:['spring','summer'],capacity:2600,offSeasonYield:0.15,
        access:{capacity:1300,allowRecruit:false,price:4,duration:90},
        neighbors:[{groundId:'mursa_grounds',distanceDays:8}]},
      {id:'mursa_grounds',name:'Mursa',countyId:'osijek',
        climateZone:'northern_temperate',seasonKinds:['autumn','winter'],capacity:2600,offSeasonYield:0.15,
        access:{capacity:1300,allowRecruit:false,price:6,duration:90},
        neighbors:[{groundId:'sirmium_grounds',distanceDays:8}]}
    ]}}
};
/* Preserve all named people, saved realm ids and existing county ownership.
   These local courts use settled resources rather than a mobile following. */
(function () {
  var b = FBDATA.bookmarkDraft451.bookmark;
  Object.assign(b.opening.actors,{
    attila_451:{name:'Attila',sex:'m',culture:'hunnic_451',religion:'hunnic_court_practices_451',
      born:401,station:1,role:'commander',home:'sirmium'},
    valamir_451:{name:'Valamir',sex:'m',culture:'gothic',religion:'homoian',
      born:421,station:1,role:'commander',home:'sirmium'},
    sirmium_custodian_451:{ref:{kind:'realm_ruler',realmId:'sirmium_local_451'}},
    aetius_451:{ref:{kind:'royal_court_person',realmId:'italy',memberId:'aetius'}},
    western_receiver_451:{sex:'m',culture:'roman',religion:'nicene',born:416,
      station:2,role:'notable',home:'ravenna',skills:{ste:10,dip:8,mar:6}}
  });
  b.opening.appointments.aetius_service_451 = {officeId:'senior_service_451',actorId:'aetius_451',
    realmId:'italy',scope:{kind:'realm',id:'italy'},endTurn:360};
  b.opening.appointments.aetius_honor_451 = {officeId:'patricius',actorId:'aetius_451',
    realmId:'italy',scope:{kind:'realm',id:'italy'}};
  var assignments = {franks_476:'regnum',basques_476:'regnum',cantabri_476:'regnum',armorica_476:'regnum',
    rhein_franks_476:'regnum',alamanni_476:'regnum'};
  b.realms.forEach(function (realm) {
    if (Object.prototype.hasOwnProperty.call(assignments,realm.id)) realm.government = assignments[realm.id];
    if (realm.id === 'sasanian_476') {
      realm.administrationProfileId = 'sasanian_provinces_451';
      realm.aristocraticProfileId = 'sasanian_court_451';
    }
  });
  b.localInstitutions.rome_see.historicalName = 'Leo I';
  b.localInstitutions.constantinople_see.religion = 'nicene';
  b.localInstitutions.constantinople_see.officeId = 'constantinople_nicene_451';
})();
});
