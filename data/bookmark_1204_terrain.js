/* Spring 1204 district declarations. The retained opening stays on its
   original geometry. Evidence, approximations and gated candidates are in
   docs/research/1204-terrain.md. No other date supplies these inhabitants. */
(function () {
  'use strict';
  FBDATA.bookmarkTerrain1204 = {
    provinces:[
      {id:'draa_oases',name:'Draa oases',realm:'almohad_1204',culture:'berber',religion:'sunni',dev:3},
      {id:'jenne_district',name:'Jenne-jeno',realm:'jenne_households_1204',culture:'sahelian_476',religion:'sahel_traditional_476',dev:3,
        communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:8500},
          {culture:'sahelian_476',religion:'sunni',populationShare0:1500}]},
      {id:'gao_district',name:'Gao',realm:'gao_court_1204',culture:'sahelian_476',religion:'sahel_traditional_476',dev:4,
        communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:6000},
          {culture:'sahelian_476',religion:'sunni',populationShare0:4000}]},
      {id:'kumbi_district',name:'Kumbi trading district',realm:'wagadu_court_1204',culture:'sahelian_476',religion:'sunni',dev:3,
        communities:[{culture:'sahelian_476',religion:'sunni',populationShare0:7000},
          {culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:3000}]},
      {id:'siwa_oasis',name:'Siwa',realm:'siwa_households_1204',culture:'berber',religion:'sunni',dev:1},
      {id:'qasr_ibrim',name:'Qasr Ibrim',realm:'makuria_1204',culture:'nubian',religion:'eastern',dev:3},
      {id:'central_iran_oases',name:'Kashan',realm:'khwarazm_1204',culture:'persian',religion:'shia',dev:3,
        communities:[{culture:'persian',religion:'shia',populationShare0:7000},
          {culture:'persian',religion:'sunni',populationShare0:3000}]},
      {id:'sarakhs_oasis',name:'Sarakhs',realm:'khwarazm_1204',culture:'persian',religion:'sunni',dev:3},
      {id:'nurata_foothills',name:'Nur district',realm:'karakhanid_1204',culture:'persian',religion:'sunni',dev:2},
      {id:'lower_syr_darya',name:'Lower Syr Darya settlements',realm:'khwarazm_1204',culture:'turkic',religion:'sunni',dev:3},
      {id:'kath_district',name:'Kath',realm:'khwarazm_1204',culture:'chorasmian',religion:'sunni',dev:4},
      {id:'gurganj_district',name:'Gurganj',realm:'khwarazm_1204',culture:'chorasmian',religion:'sunni',dev:5,
        communities:[{culture:'chorasmian',religion:'sunni',populationShare0:8500},
          {culture:'turkic',religion:'sunni',populationShare0:1500}]},
      {id:'shebar_valley',name:'Shibar valley',realm:'bamiyan_court_1204',culture:'persian',religion:'sunni',dev:1},
      {id:'palmyra_district',name:'Tadmur',realm:'ayyubid_1204',culture:'arabic',religion:'sunni',dev:2}
    ],
    layouts:{
      draa_oases:[{site:'draa_oases_inhabited_1204',name:'Draa gardens',kind:'town'}],
      jenne_district:[{site:'jenne_district_inhabited_1204',name:'Jenne-jeno',kind:'town'}],
      gao_district:[{site:'gao_district_inhabited_1204',name:'Gao',kind:'city'}],
      kumbi_district:[{site:'kumbi_district_inhabited_1204',name:'Kumbi trading district',kind:'town'}],
      siwa_oasis:[{site:'siwa_oasis_inhabited_1204',name:'Shali',kind:'village'}],
      qasr_ibrim:[{site:'qasr_ibrim_inhabited_1204',name:'Qasr Ibrim',kind:'town'}],
      central_iran_oases:[{site:'central_iran_oases_inhabited_1204',name:'Kashan',kind:'town'}],
      sarakhs_oasis:[{site:'geo_sarakhs_1159716',name:'Sarakhs',kind:'town'}],
      nurata_foothills:[{site:'nurata_foothills_inhabited_1204',name:'Nur',kind:'town'}],
      lower_syr_darya:[{site:'lower_syr_darya_inhabited_1204',name:'Lower Syr households',kind:'town'}],
      kath_district:[{site:'kath_district_inhabited_1204',name:'Kath',kind:'city'}],
      gurganj_district:[{site:'gurganj_district_inhabited_1204',name:'Gurganj',kind:'city'}],
      shebar_valley:[{site:'shebar_valley_inhabited_1204',name:'Shibar valley',kind:'village'}],
      palmyra_district:[{site:'palmyra_district_inhabited_1204',name:'Tadmur',kind:'town'}]
    },
    realms:[
      {id:'jenne_households_1204',name:'Middle Niger households',capital:'jenne_district',color:'#997253',rank:1,
        government:'territorial',religion:'sahel_traditional_476',aggression:0,
        ruler:{generated:true,sex:'m',culture:'sahelian_476',born:1168,mar:3,trait:'patient'}},
      {id:'gao_court_1204',name:'Gao court',capital:'gao_district',color:'#ad8b56',rank:3,
        government:'regnum',religion:'sunni',techTraditions:['islamic'],aggression:0,
        ruler:{generated:true,sex:'m',culture:'sahelian_476',born:1165,mar:8,trait:'patient'}},
      {id:'wagadu_court_1204',name:'Wagadu remnant court',capital:'kumbi_district',color:'#826548',rank:1,
        government:'regnum',religion:'sunni',techTraditions:['islamic'],aggression:0,
        ruler:{generated:true,sex:'m',culture:'sahelian_476',born:1165,mar:7,trait:'patient'}},
      {id:'siwa_households_1204',name:'Siwa households',capital:'siwa_oasis',color:'#a8966e',rank:1,
        government:'assembly_polity',constituency:'siwa_oasis_1204',religion:'sunni',aggression:0,
        representative:{sex:'m',born:1168,skills:{dip:5,ste:4,mar:3}}},
      {id:'bamiyan_court_1204',name:'Ghurid Bamiyan',capital:'bamiyan',color:'#997e58',rank:3,
        government:'regnum',religion:'sunni',techTraditions:['persianate','islamic'],aggression:0,
        ruler:{sex:'m',culture:'persian',born:1150,mar:9,trait:'patient',name:'Baha al-Din Sam II'}},
      // Samarkand is a diplomatic anchor for the off-map superior court.
      {id:'qara_khitai_1204',name:'Qara Khitai suzerainty',capital:'samarkand',nonTerritorial:true,
        color:'#8c8966',rank:4,government:'regnum',religion:'buddhist_476',aggression:0,
        techTraditions:['steppe'],ruler:{name:'Yelu Zhilugu',sex:'m',culture:'khitan_court_1204',born:1140,mar:8,trait:'patient'}},
      {id:'qipchaq_following_1204',name:'Eastern Qipchaq following',capital:'lower_syr_darya',nonTerritorial:true,
        color:'#a18b65',rank:1,government:'mobile_confederation',culture:'turkic',religion:'tengri',aggression:0,
        mobile:{profileId:'eastern_qipchaq_1204',patronRealmId:'khwarazm_1204',origin:'lower_syr_darya',
          target:'lower_syr_darya',food:3200,fighters:80,treasury:40}}
    ],
    // Jenne-jeno's clustered settlements do not establish an assembly law.
    // Siwa's separate local evidence owns this constituency approximation.
    constituencies:{
      siwa_oasis_1204:{
        eligibility:{minAge:18,minServiceYears:0,skills:{dip:3},free:true},
        selection:{threshold:0.6,tie:'id',termDays:null,nominationCost:0},
        recall:{threshold:0.6,reasons:['neglect','overreach','ineligible']},
        obligations:{revenueRate:0.08,levyRate:0.3,maxDues:12,maxLevy:60,reserve:10},
        reserved:['war','treaty','grant','extraordinary_tax','pledge','conversion'],powers:['ban','peace','revenue'],
        members:[
          {id:'gardens',name:'Oasis cultivators',weight:3,basis:'custom',continuity:'institution',support:60},
          {id:'homes',name:'Fortified households',weight:3,basis:'custom',continuity:'institution',support:60}
        ]}
    },
    starts:[
      {id:'muhammad_1204',bookmarkIds:['1204'],alwaysUnlocked:true,rulerRealmId:'khwarazm_1204',
        governmentForm:'regnum',fixedProvinceId:'gurganj_district',startCulture:'persian',startReligion:'sunni',
        characterName:'Muhammad II',
        name:'Muhammad II at Gurganj',desc:'Hold the Khwarazmian court under Qara Khitai suzerainty. Later conquests remain opportunities.',
        sex:'m',tier:6,profession:'noble',gold:120,prestige:150,piety:10,onboarding:'ruler',
        familyPresets:{standard:{name:'Existing court household',diff:'age 35 - existing court family',desc:'Keep Muhammad II and the generated supporting household.'}},
        intro:'You are Muhammad II at Gurganj. Your court holds its districts directly, while Qara Khitai suzerainty remains above it. The towns keep their residents. Steppe followers bargain separately for access and service; later conquests supply no opening possessions.'},
      {id:'siwa_delegate_1204',bookmarkIds:['1204'],alwaysUnlocked:true,rulerRealmId:'siwa_households_1204',
        governmentForm:'assembly_polity',fixedProvinceId:'siwa_oasis',startCulture:'berber',startReligion:'sunni',
        name:'Siwa delegate',desc:'Represent oasis cultivators and fortified households through local consent.',
        sex:'m',tier:1,profession:'farmer',gold:30,prestige:40,piety:0,onboarding:'ruler',
        familyPresets:{standard:{name:'Existing representative',diff:'local public mandate',desc:'Keep the selected representative and public mandate. Begin a separate private household.'}},
        intro:'You represent the households at Siwa. Local government in Deeds shows limited dues, defensive service and reserved consent. Gardens, households and public resources remain distinct.'}
    ],
    // Every original scenery anchor retains a remnant. A split is bounded
    // habitation beside that remnant, never ownership of its entire cell.
    scenery:{
      w_sahara_w:['draa_oases'],w_sahara_c:[],w_sahara_e:['siwa_oasis'],
      w_sahel:['jenne_district','gao_district','kumbi_district'],w_nubia:['qasr_ibrim'],
      w_arabia:[],w_nefud:[],w_syrian:['palmyra_district'],
      w_kavir:['central_iran_oases'],w_lut:[],w_registan:[],w_sulaiman:[],w_thar:[],
      w_hindukush:['shebar_valley'],w_karakum:['sarakhs_oasis','kath_district','gurganj_district'],
      w_kyzylkum:['nurata_foothills','lower_syr_darya'],w_steppe_e:[],
      w_ural:[],w_taiga:[],w_north:[],w_lapland:[]
    },
    deferred:{
      garama:'Locate occupied spring-1204 communities and local authority independently of ancient Garama.',
      ghadames_oasis:'Dated oasis occupation is supported; local selection and competing superior rights require a reviewed profile.',
      awjila_oasis:'The medieval mosque supports occupation; resolve local possession and regional claims before assigning a court.',
      chad_lakeshore:'Locate the dated settlement and authority at this southern lakeshore seed; do not move Kanem’s capital here.',
      timbuktu_district:'An early camp is plausible; dated local authority and settled versus seasonal residence remain unresolved.',
      najran_oasis:'Separate local communities and actual Ayyubid jurisdiction from the wider Yemen claim.',
      tayma_oasis:'Review dated Muslim and Jewish communities and their local authority without treating traveller headcounts as census.',
      eastern_iran_oases:'Review the Tabas district’s Ismaili institutions, communities and temporal rights before rollout.',
      gomal_valley:'A Ghurid campaign route does not prove a settled county at this seed; locate dated residents and authority.',
      thar_margin:'Resolve dated Soomra/local possession and resident traditions at this seed before assigning the Sindh court.',
      sarysu_corridor:'Pastoral use is not an exclusive settled court; scenery remains until supported seasonal access can use this district.',
      upper_kama:'Dated local succession and competing collection rights require evidence and a fitting local profile.',
      vychegda_district:'Local communities and outside tribute must be independently located and dated.',
      onega_district:'Novgorodian collection rights do not establish exclusive possession; research local jurisdiction.',
      torne_district:'Research communities and selection inside latitude 66 without importing later Swedish colonial borders.'
    }
  };

  var b = FBDATA.bookmarks['1204'], d = FBDATA.bookmarkTerrain1204;
  var revision = 'inhabited_v2', layoutId = '1204_inhabited_v2';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  var layout = clone(FBDATA.settlementLayouts['1204']);
  // Promote existing fill presentations into their own bounded districts.
  // Only this new revision changes the layouts; baseline slot indices stay put.
  var promotedSites = {sarakhs_oasis:'geo_sarakhs_1159716',nurata_foothills:'geo_nurota_1513087'};
  layout.merv = layout.merv.filter(function (entry) {
    return entry.site !== 'geo_sarakhs_1159716' && entry.site !== 'geo_sarahs_1218456';
  });
  layout.bukhara = layout.bukhara.filter(function (entry) { return entry.site !== 'geo_nurota_1513087'; });
  var seeds = {}, additions = {};
  FBDATA.geographies.europe_regional_2.provinceAdditions.forEach(function (seed) { seeds[seed.id] = seed; });
  Object.assign(FBDATA.constituencyProfiles, d.constituencies);
  d.provinces.forEach(function (row) {
    if (!seeds[row.id] || additions[row.id] || d.deferred[row.id]) throw new Error('Invalid 1204 district: ' + row.id);
    var p = Object.assign({},seeds[row.id],clone(row));
    delete p.wasteland;
    // Keep the date's literal name after the opening; no 476 alias is inherited.
    p.names = [];
    p.communities = p.communities || [{culture:p.culture,religion:p.religion,populationShare0:10000}];
    p.customaryRights = [{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}];
    layout[row.id] = clone(d.layouts[row.id]);
    var site = layout[row.id][0].site;
    if (promotedSites[row.id] && site !== promotedSites[row.id])
      FBDATA.settlementSites[site] = clone(FBDATA.settlementSites[promotedSites[row.id]]);
    else if (!promotedSites[row.id]) FBDATA.settlementSites[site] = {x:seeds[row.id].x,y:seeds[row.id].y};
    // Regional anchors are not exact archaeological buildings or monuments.
    p.settlements = clone(layout[row.id]);
    additions[row.id] = p;
  });
  FBDATA.settlementLayouts[layoutId] = layout;

  // The Gur Khan's capital lies outside the map window. Samarkand is an
  // on-map diplomatic anchor only, not a new palace, resident community or
  // directly possessed county. Local courts retain their own county holders.
  FBDATA.bookmarkCultures1204Terrain = {
    khitan_court_1204:{name:'Khitan court',tradition:'steppe',dyn:'of_place',parent:'turkic',
      male:['Zhilugu','Dashi','Yilie'],female:['Pusuwan','Tapuyan']}
  };
  Object.assign(FBDATA.cultures,FBDATA.bookmarkCultures1204Terrain);
  var realms = b.realms.map(function (r) {
    if (r.id === 'khwarazm_1204') return Object.assign({},clone(r),{
      capital:'gurganj_district',government:'regnum',liege:'qara_khitai_1204'});
    if (r.id === 'karakhanid_1204') return Object.assign({},clone(r),{
      government:'regnum',liege:'qara_khitai_1204'});
    if (r.id === 'makuria_1204') return Object.assign({},clone(r),{government:'regnum'});
    return clone(r);
  }).concat(clone(d.realms));
  FBDATA.mobileProfiles.eastern_qipchaq_1204 = {
    minAge:18,threshold:0.6,maxMembers:8,maxAgreements:8,recruitShare:0.15,recruitCost:0.03,
    foodPerPerson:0.01,pasturePerPerson:1.5,accessDays:270,accessPrice:6,
    starvationShare:0.001,defeatShare:0.03,settlementForm:'regnum',
    regions:['lower_syr_darya','kath_district','gurganj_district','nurata_foothills'],
    members:[{id:'river_followers',weight:2,pledge:0.15,population:900},
      {id:'steppe_followers',weight:2,pledge:0.1,population:700}]
  };
  var provinces = b.provinces.map(function (p) {
    // The separately dated Bamiyan branch holds this existing town and its
    // nearby valley. No second Bamiyan site or population is constructed.
    var out = clone(p);
    if (p.id === 'bamiyan') out.realm = 'bamiyan_court_1204';
    if (p.id === 'merv' || p.id === 'bukhara') out.settlements = clone(layout[p.id]);
    return out;
  }).concat(FBDATA.geographies.europe_regional_2.provinceAdditions.map(function (seed) {
    if (additions[seed.id]) return additions[seed.id];
    if (!d.deferred[seed.id]) throw new Error('Missing 1204 district disposition: ' + seed.id);
    return clone(seed);
  }));
  var institutions = clone(b.localInstitutions || {});
  d.provinces.forEach(function (row) {
    row = additions[row.id];
    row.communities.forEach(function (community,index) {
      var id = row.id + '_community_' + index + '_1204';
      institutions[id] = {city:row.name,kind:'congregation',provinceId:row.id,
        site:layout[row.id][0].site,culture:community.culture,religion:community.religion,
        representative:{role:'priest'}};
    });
  });
  // Eligible mod starts remain discoverable. Fixed birthplaces and ruler
  // references already exclude expanded-only starts from retained worlds.
  b.revisions = {baseline:{},inhabited_v2:{
    geography:'europe_regional_2',provinces:provinces,realms:realms,
    settlementLayout:layoutId,localInstitutions:institutions
  }};
  b.revision = revision;
  Array.prototype.push.apply(FBDATA.startScenarios,d.starts);
  FBDATA.techImpactReviews.features.period_1204_inhabited_terrain = {mode:'none',
    rationale:'Existing households, local authority, subordinate courts and ordinary overland travel do not require a technological discovery. Existing production, equipment, supply and movement requirements remain in force.'};
  FBDATA.techImpactReviews.features.existing_delegate_start = {mode:'none',
    rationale:'Beginning as an already selected local representative is an ordinary campaign starting position. Eligibility, mandates and reserved consent use the existing constituency rules.'};
})();
