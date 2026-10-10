/* Spring 1066 district declarations. Occupation, political approximations and
   deferred candidates are documented in docs/research/1066-inhabited-terrain.md.
   Root fields and older revisions retain their complete original definitions. */
(function () {
  'use strict';
  var b = FBDATA.bookmarks['1066'];
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  var layout = copy(FBDATA.settlementLayouts['1066']);
  var realms = copy(b.realms), provinces = copy(b.provinces);
  var opening = {actors:{},appointments:{},estates:[],claims:[],migrations:[]};
  var climate = copy(b.climate || {});
  climate.provinces = copy(climate.provinces || {});

  /* Independent later-period presentation pools. Ordinary generated names,
     palettes and numerical shares are simulation inputs, not census evidence
     or reconstructed historical people. No 476 faith or culture is reused. */
  FBDATA.bookmarkCultures1066Terrain = {soninke_1066:{
    name:'Soninke', tradition:'african', dyn:'of_place',
    appearance:{tone:3.7,fair:0.01,red:0.02},
    male:['Demba','Kante','Dama','Samba'], female:['Sira','Awa','Dado','Kumba']
  },middle_niger_1066:{
    name:'Middle Niger communities', tradition:'african', dyn:'of_place',
    appearance:{tone:3.7,fair:0.01,red:0.02},
    male:['Koro','Dama','Samba','Tama'], female:['Sira','Awa','Dama','Kumba']
  },khwarazmian_1066:{
    name:'Khwarazmian',parent:'persian',dyn:'of_place',
    male:['Ahmad','Hasan','Afshin','Bahram'],female:['Maryam','Fatima','Shirin','Roxana']
  }};
  Object.assign(FBDATA.cultures,FBDATA.bookmarkCultures1066Terrain);
  /* A narrow headless local profile. It does not assert one West African
     church, priesthood or conversion timetable. Further ritual and institution
     detail needs independent research. */
  FBDATA.bookmarkReligions1066Terrain = {wagadu_traditional_1066:{
    name:'Wagadu traditional worship', group:'pagan', relationToParent:'schismatic', icon:'☀',
    properties:{head:null,words:{deity:'the spirits',cleric:'Ritual keeper',temple:'shrine',
      landed:'Ruler',partnership:'Trade partnership'},
      roles:{priestM:'Ritual keeper',priestF:'Ritual keeper'}}
  },niger_traditional_1066:{
    name:'Middle Niger traditional worship', group:'pagan', relationToParent:'schismatic', icon:'☀',
    properties:{head:null,words:{deity:'the spirits',cleric:'Ritual keeper',temple:'shrine',
      landed:'Ruler',partnership:'Trade partnership'},
      roles:{priestM:'Ritual keeper',priestF:'Ritual keeper'}}
  }};
  Object.assign(FBDATA.religions,FBDATA.bookmarkReligions1066Terrain);
  /* Existing settled succession and scoped appointments are sufficient for
     these districts. This is not a speculative Seljuk fiscal constitution. */
  FBDATA.bookmarkOffices1066Terrain = {district_delegate_1066:{
    name:'District delegate',desc:'Appointed local courts and receipts. The commission grants no private estate or hereditary county.',
    powers:['peace','revenue'],scopes:['county'],succession:'continues',
    recognitionSources:['imperial_commission'],
    appointment:{gold:5,prestige:20,skill:'ste',minimum:6}
  }};
  Object.assign(FBDATA.authorityOffices,FBDATA.bookmarkOffices1066Terrain);
  FBDATA.governmentForms.district_court_1066 = Object.assign({},FBDATA.governmentForms.regnum,{
    officeCatalogue:['district_delegate_1066'],
    systems:{enable:['roman_offices'],disable:['feudal_service','scutage','estates','manorial_tenure']}
  });
  realms = realms.map(function (r) {
    return r.id === 'seljuk_1066' || r.id === 'makuria_1066'
      ? Object.assign({},r,{government:'district_court_1066'}) : r;
  });
  /* Archaeological urban clustering supports an independent local community
     model, not a named historical assembly or Ghanaian province. */
  FBDATA.bookmarkConstituencies1066Terrain = {jenne_households_1066:{
    eligibility:{minAge:20,minServiceYears:2,skills:{ste:4},free:true},
    selection:{threshold:0.75,tie:'id',termDays:720,nominationCost:3},
    recall:{threshold:0.75,reasons:['neglect','overreach','ineligible']},
    obligations:{revenueRate:0.08,levyRate:0.3,maxDues:12,maxLevy:80,reserve:15},
    reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'],
    powers:['ban','peace','revenue'], members:[
      {id:'fields',name:'Cultivating households',weight:2,basis:'custom',continuity:'institution',support:65},
      {id:'crafts',name:'Craft households',weight:2,basis:'custom',continuity:'institution',support:60},
      {id:'river',name:'River households',weight:1,basis:'service',continuity:'institution',support:50}
    ]
  }};
  Object.assign(FBDATA.constituencyProfiles,FBDATA.bookmarkConstituencies1066Terrain);
  FBDATA.bookmarkRealms1066Terrain = [{id:'wagadu_1066',name:'Wagadu',color:'#ae8851',capital:'kumbi_district',
    government:'lineage_kingship',rank:2,aggression:0,religion:'wagadu_traditional_1066',
    ruler:{name:'Tunka Manin',sex:'m',culture:'soninke_1066',born:1030,mar:8,trait:'patient'},
    royalCourt:{founderId:'ancestor',rulerFatherId:'ancestor',members:[
      {id:'ancestor',generated:true,sex:'m',born:1000,culture:'soninke_1066',
        religion:'wagadu_traditional_1066',alive:false,died:1063},
      {id:'sister',generated:true,sex:'f',born:1032,fatherId:'ancestor',
        culture:'soninke_1066',religion:'wagadu_traditional_1066',homeProvinceId:'kumbi_district'},
      {id:'nephew',generated:true,sex:'m',born:1049,motherId:'sister',
        culture:'soninke_1066',religion:'wagadu_traditional_1066',homeProvinceId:'kumbi_district'}
    ]}},
  {id:'jenne_1066',name:'Jenne-jeno households',color:'#81916b',capital:'jenne_district',
    government:'assembly_polity',constituency:'jenne_households_1066',rank:1,aggression:0,
    religion:'niger_traditional_1066',representative:{sex:'m',born:1030,skills:{dip:5,ste:5,mar:4}}},
  {id:'gao_1066',name:'Gao',capital:'gao_district',religion:'sunni',color:'#b09b59',
    government:'district_court_1066',rank:1,aggression:0,
    ruler:{generated:true,sex:'m',culture:'middle_niger_1066',born:1030,mar:6,trait:'patient'}},
  {id:'ghadames_local_1066',name:'Ghadames oasis',capital:'ghadames_oasis',religion:'sunni',color:'#859267',
    government:'district_court_1066',rank:1,aggression:0,
    ruler:{generated:true,sex:'m',culture:'berber',born:1030,mar:6,trait:'patient'}},
  {id:'awjila_local_1066',name:'Awjila oasis',capital:'awjila_oasis',religion:'sunni',color:'#8a976b',
    government:'district_court_1066',rank:1,aggression:0,
    ruler:{generated:true,sex:'m',culture:'berber',born:1030,mar:6,trait:'patient'}},
  {id:'lower_syr_local_1066',name:'Lower Syr Darya court',capital:'lower_syr_darya',religion:'sunni',color:'#b59a69',
    government:'district_court_1066',rank:1,aggression:0,
    ruler:{generated:true,sex:'m',culture:'turkic',born:1030,mar:6,trait:'patient'}}];
  realms = realms.concat(FBDATA.bookmarkRealms1066Terrain);

  var decisions = {
    draa_oases:{scenery:'w_sahara_w',disposition:'retained',reason:'Dated local possession and oasis layout unresolved.'},
    garama:{scenery:'w_sahara_c',disposition:'retained',reason:'Medieval Fezzan evidence cannot automatically identify the earlier Garama seat.'},
    ghadames_oasis:{scenery:'w_sahara_c',disposition:'inhabited'},
    awjila_oasis:{scenery:'w_sahara_e',disposition:'inhabited'},
    siwa_oasis:{scenery:'w_sahara_e',disposition:'retained',reason:'Local authority and opening community evidence unresolved.'},
    jenne_district:{scenery:'w_sahel',disposition:'inhabited'},
    gao_district:{scenery:'w_sahel',disposition:'inhabited'},
    chad_lakeshore:{scenery:'w_sahel',disposition:'retained',reason:'Occupation does not identify a spring-1066 lakeshore court or precise seasonal group.'},
    qasr_ibrim:{scenery:'w_nubia',disposition:'inhabited'},
    najran_oasis:{scenery:'w_arabia',disposition:'retained',reason:'Regional Sulayhid influence does not establish direct possession or local rights.'},
    tayma_oasis:{scenery:'w_nefud',disposition:'retained',reason:'Ancient occupation is insufficient for this opening and its local authority.'},
    palmyra_district:{scenery:'w_syrian',disposition:'retained',reason:'Later medieval monuments and outside claims do not date the opening jurisdiction.'},
    central_iran_oases:{scenery:'w_kavir',disposition:'inhabited'},
    eastern_iran_oases:{scenery:'w_lut',disposition:'retained',reason:'The Tabas district incumbent and provincial rights require their own dated evidence.'},
    shebar_valley:{scenery:'w_hindukush',disposition:'retained',reason:'Pass evidence does not establish a new county apart from Bamiyan.'},
    gomal_valley:{scenery:'w_sulaiman',disposition:'retained',reason:'A route is insufficient evidence for local opening possession.'},
    thar_margin:{scenery:'w_thar',disposition:'retained',reason:'No located opening community beyond the retained Sindh districts is assigned.'},
    sarakhs_oasis:{scenery:'w_karakum',disposition:'inhabited'},
    nurata_foothills:{scenery:'w_kyzylkum',disposition:'retained',reason:'Earlier Nur occupation alone does not establish the spring court and district extent.'},
    lower_syr_darya:{scenery:'w_kyzylkum',disposition:'inhabited'},
    sarysu_corridor:{scenery:'w_steppe_e',disposition:'retained',reason:'Qipchaq regional chronology supplies no located membership or grazing rights here.'},
    upper_kama:{scenery:'w_ural',disposition:'retained',reason:'Dated household authority and outside tribute scopes unresolved.'},
    vychegda_district:{scenery:'w_taiga',disposition:'retained',reason:'No dated local jurisdiction or Novgorodian office inferred.'},
    onega_district:{scenery:'w_north',disposition:'retained',reason:'Northern exchange evidence does not establish direct Rus possession.'},
    torne_district:{scenery:'w_lapland',disposition:'retained',reason:'Sami inhabitation does not establish crown jurisdiction or an assembly.'},
    kath_district:{scenery:'w_karakum',disposition:'inhabited'},
    gurganj_district:{scenery:'w_karakum',disposition:'inhabited'},
    kumbi_district:{scenery:'w_sahel',disposition:'inhabited'},
    timbuktu_district:{scenery:'w_sahel',disposition:'retained',reason:'Traditional late fifth-century Hijri foundation does not establish a city by spring 1066.'}
  };
  /* Political and demographic records are literal date inputs. A geography
     seed supplies only physical coordinates and terrain. */
  FBDATA.bookmarkDistricts1066Terrain = [
    {id:'kumbi_district',name:'Kumbi district',realm:'wagadu_1066',dev:3,zone:'arid',
      communities:[['soninke_1066','wagadu_traditional_1066',7000],['soninke_1066','sunni',3000]],kind:'town'},
    {id:'jenne_district',name:'Jenne-jeno',realm:'jenne_1066',dev:3,zone:'arid',
      communities:[['middle_niger_1066','niger_traditional_1066',10000]],kind:'town'},
    {id:'gao_district',name:'Gao',realm:'gao_1066',dev:3,zone:'arid',
      communities:[['middle_niger_1066','sunni',6000],['middle_niger_1066','niger_traditional_1066',4000]],kind:'town'},
    {id:'ghadames_oasis',name:'Ghadames',realm:'ghadames_local_1066',dev:2,zone:'arid',
      communities:[['berber','sunni',10000]],kind:'town'},
    {id:'awjila_oasis',name:'Awjila',realm:'awjila_local_1066',dev:2,zone:'arid',
      communities:[['berber','sunni',10000]],kind:'town'},
    {id:'qasr_ibrim',name:'Qasr Ibrim',realm:'makuria_1066',dev:2,zone:'arid',
      communities:[['nubian','miaphysite',10000]],kind:'town'},
    {id:'central_iran_oases',name:'Kashan oasis',realm:'seljuk_1066',dev:3,zone:'arid',
      communities:[['persian','shia',7000],['persian','sunni',3000]],kind:'town'},
    {id:'sarakhs_oasis',name:'Sarakhs',realm:'seljuk_1066',dev:3,zone:'continental',
      communities:[['persian','sunni',10000]],kind:'town'},
    {id:'kath_district',name:'Kath district',realm:'seljuk_1066',dev:2,zone:'continental',
      communities:[['khwarazmian_1066','sunni',7000],['turkic','sunni',2000],['khwarazmian_1066','zoroastrian',1000]],kind:'town'},
    {id:'gurganj_district',name:'Gurganj',realm:'seljuk_1066',dev:4,zone:'continental',
      communities:[['khwarazmian_1066','sunni',8000],['turkic','sunni',2000]],kind:'city'},
    {id:'lower_syr_darya',name:'Lower Syr Darya settlements',realm:'lower_syr_local_1066',dev:2,zone:'continental',
      communities:[['turkic','sunni',8000],['turkic','tengri',2000]],kind:'town'}
  ];
  var districts = FBDATA.bookmarkDistricts1066Terrain, inhabited = {};
  districts.forEach(function (d) {
    var seed = FBDATA.geographies.europe_regional_2.provinceAdditions.filter(function (p) { return p.id === d.id; })[0];
    var site = d.id + '_inhabited_1066';
    var communities = d.communities.map(function (c) {
      return {culture:c[0],religion:c[1],populationShare0:c[2],paired:true};
    });
    inhabited[d.id] = {id:d.id,name:d.name,names:[],realm:d.realm,dev:d.dev,
      culture:communities[0].culture,religion:communities[0].religion,communities:communities,
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}]};
    FBDATA.settlementSites[site] = {x:seed.x,y:seed.y};
    layout[d.id] = [{site:site,name:d.name,kind:d.kind}];
    climate.provinces[d.id] = d.zone;
    decisions[d.id].site = site;
    decisions[d.id].realm = d.realm;
  });
  ['kath_district','gurganj_district','sarakhs_oasis','central_iran_oases','qasr_ibrim'].forEach(function (id) {
    var p = inhabited[id], actor = id + '_delegate_1066';
    opening.actors[actor] = {sex:'m',culture:p.culture,religion:p.religion,born:1030,
      station:3,role:'notable',home:id,skills:{ste:8,dip:7}};
    opening.appointments[actor] = {officeId:'district_delegate_1066',actorId:actor,realmId:p.realm,
      scope:{kind:'county',id:id}};
  });
  /* Jand's location and 1065/1066 submission chronology remain disputed.
     A recorded outside demand is distinct from possession or an active tax. */
  opening.claims.push({id:'lower_syr_seljuk_claim_1066',realmId:'seljuk_1066',
    countyIds:['lower_syr_darya'],share0:1000,evidence:'alp_arslan_eastern_campaign_1065'});
  var scenery = {};
  b.provinces.filter(function (p) { return p.id.indexOf('w_') === 0; }).forEach(function (p) {
    scenery[p.id] = {disposition:'retained',inhabited:[],reason:'Scenery retained outside the accepted dated district declarations.'};
  });
  districts.forEach(function (d) {
    var row = scenery[decisions[d.id].scenery];
    row.disposition = 'split'; row.inhabited.push(d.id);
  });
  FBDATA.bookmarkTerrain1066 = {districts:decisions,scenery:scenery};
  FBDATA.settlementLayouts['1066_inhabited_v2'] = layout;
  b.revisions = Object.assign({baseline:{}}, b.revisions);
  b.revisions.inhabited_v2 = {
    geography:'europe_regional_2',provinces:provinces.concat(
      FBDATA.geographies.europe_regional_2.provinceAdditions.map(function (seed) {
        return inhabited[seed.id] || copy(seed);
      })),realms:realms,settlementLayout:'1066_inhabited_v2',climate:climate,
    opening:opening,openingRevision:'inhabited_v2',openingRevisions:{inhabited_v2:opening},
    openingLegacyRevision:'inhabited_v2'
  };
  b.revision = 'inhabited_v2';
  FBDATA.techImpactReviews.features.period_1066_district_habitation = {mode:'none',
    rationale:'Dated habitation, commoner livelihoods and existing local authority require no technological discovery. Ordinary production, equipment and travel requirements remain in force.'};
})();
