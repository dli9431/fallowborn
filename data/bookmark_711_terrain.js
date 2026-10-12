/* Spring 711 habitation. Physical seeds are shared; these dated residents,
   rights and courts are independent of every other opening. Evidence and
   explicit scenery decisions: docs/research/711-inhabited-terrain.md. */
FBDATA.bookmarkTerrain = FBDATA.bookmarkTerrain || {};
FBDATA.bookmarkTerrain['711'] = {
  provinces:[
    {id:'ghadames_oasis',name:'Ghadames',names:[],realm:'ghadames_711',
      duchy:'d_711_ghadames',culture:'berber',religion:'umayyad_sunni_711',dev:2,
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
      // Conquest chronology does not quantify conversion. Equal weights keep
      // both communities without declaring a researched Muslim majority.
      communities:[{culture:'berber',religion:'umayyad_sunni_711',populationShare0:5000},
        {culture:'berber',religion:'catholic',paired:true,populationShare0:5000}],
      settlements:[{site:'ghadames_711',name:'Ghadames',kind:'town'}]},
    {id:'jenne_district',name:'Middle Niger settlements',names:[],realm:'middle_niger_711',
      duchy:'d_711_middle_niger',culture:'sahelian_476',religion:'sahel_traditional_476',dev:2,
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
      communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:10000}],
      settlements:[{site:'jenne_jeno_711',name:'Jenne-jeno',kind:'town'}]},
    {id:'gao_district',name:'Niger bend communities',names:[],realm:'niger_bend_711',
      duchy:'d_711_niger_bend',culture:'sahelian_476',religion:'sahel_traditional_476',dev:2,
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
      communities:[{culture:'sahelian_476',religion:'sahel_traditional_476',populationShare0:10000}],
      settlements:[{site:'gao_saney_711',name:'Gao Saney',kind:'town'}]},
    {id:'qasr_ibrim',name:'Ibrim',names:[],realm:'makuria_711',duchy:'d_711_makuria',
      culture:'nubian',religion:'eastern',dev:2,
      communities:[{culture:'nubian',religion:'eastern',populationShare0:10000}],
      settlements:[{site:'ibrim_711',name:'Ibrim',kind:'town'}]},
    {id:'palmyra_district',name:'Tadmor',names:[],realm:'umayyad_711',duchy:'d_711_damascus',
      culture:'arabic',religion:'eastern',dev:2,
      communities:[{culture:'arabic',religion:'eastern',populationShare0:7000},
        {culture:'arabic',religion:'umayyad_sunni_711',paired:true,populationShare0:3000}],
      settlements:[{site:'tadmor_711',name:'Tadmor',kind:'town'}]},
    {id:'eastern_iran_oases',name:'Tabas oasis',names:[],realm:'khurasan_711',duchy:'d_711_nishapur',
      culture:'persian',religion:'zoroastrian',dev:2,
      communities:[{culture:'persian',religion:'zoroastrian',populationShare0:8000},
        {culture:'arabic',religion:'umayyad_sunni_711',paired:true,populationShare0:2000}],
      settlements:[{site:'tabas_711',name:'Tabas',kind:'town'}]},
    {id:'sarakhs_oasis',name:'Sarakhs',names:[],realm:'khurasan_711',duchy:'d_711_merv',
      culture:'persian',religion:'zoroastrian',dev:2,
      communities:[{culture:'persian',religion:'zoroastrian',populationShare0:8000},
        {culture:'arabic',religion:'umayyad_sunni_711',paired:true,populationShare0:2000}],
      settlements:[{site:'sarakhs_711',name:'Sarakhs',kind:'town'}]},
    {id:'kath_district',name:'Kath',names:[],realm:'khwarazm_711',duchy:'d_711_khwarazm',
      culture:'chorasmian',religion:'zoroastrian',dev:3,
      customaryRights:[{power:'peace',basis:'possession'},{power:'revenue',basis:'possession'}],
      communities:[{culture:'chorasmian',religion:'zoroastrian',populationShare0:10000}],
      settlements:[{site:'kath_711',name:'Kath',kind:'town'}]},
    {id:'w_steppe_e',name:'Eastern steppe',names:[],wasteland:true}
  ],
  realms:[
    {id:'ghadames_711',name:'Ghadames oasis community',color:'#b09162',capital:'ghadames_oasis',
      government:'territorial',rank:1,aggression:0,religion:'umayyad_sunni_711',
      ruler:{generated:true,sex:'m',culture:'berber',born:677,mar:5,trait:'patient'}},
    {id:'middle_niger_711',name:'Middle Niger communities',color:'#9a7952',capital:'jenne_district',
      government:'territorial',rank:1,aggression:0,religion:'sahel_traditional_476',
      ruler:{generated:true,sex:'m',culture:'sahelian_476',born:675,mar:5,trait:'patient'}},
    {id:'niger_bend_711',name:'Niger bend communities',color:'#98704c',capital:'gao_district',
      government:'territorial',rank:1,aggression:0,religion:'sahel_traditional_476',
      ruler:{generated:true,sex:'m',culture:'sahelian_476',born:673,mar:5,trait:'patient'}},
    {id:'khwarazm_711',name:'Khwarazm',color:'#9b9867',capital:'kath_district',
      government:'regnum',rank:2,aggression:0,religion:'zoroastrian',techTraditions:['persianate'],
      ruler:{generated:true,sex:'m',culture:'chorasmian',born:674,mar:7,trait:'patient'}}
  ],
  duchies:{
    d_711_ghadames:{name:'Ghadames oasis',kingdom:'k_711_ghadames'},
    d_711_middle_niger:{name:'Middle Niger',kingdom:'k_711_middle_niger'},
    d_711_niger_bend:{name:'Niger bend',kingdom:'k_711_middle_niger'},
    d_711_khwarazm:{name:'Khwarazm',kingdom:'k_711_khwarazm'}
  },
  kingdoms:{
    k_711_ghadames:{name:'Saharan oases',empire:'e_711_africa'},
    k_711_middle_niger:{name:'Middle Niger',empire:'e_711_africa'},
    k_711_khwarazm:{name:'Khwarazm',empire:'e_711_eastern_frontier'}
  }
};
(function () {
  'use strict';
  var b = FBDATA.bookmarks['711'], region = FBDATA.bookmarkTerrain['711'], accepted = {};
  var sites = {
    ghadames_711:{x:9.5,y:30.13}, gao_saney_711:{x:0.02,y:16.3},
    jenne_jeno_711:{x:-4.55,y:13.9}, ibrim_711:{x:31.99,y:22.65},
    tadmor_711:{x:38.27,y:34.55}, tabas_711:{x:56.92,y:33.61},
    sarakhs_711:{x:61.16,y:36.54}, kath_711:{x:60.75,y:41.69}
  };
  Object.assign(FBDATA.settlementSites,sites);
  region.provinces.forEach(function (p) { accepted[p.id] = p; });
  var climate = Object.assign({},b.climate.provinces,{
    ghadames_oasis:'arid',gao_district:'arid',
    jenne_district:'arid',qasr_ibrim:'arid',palmyra_district:'arid',
    eastern_iran_oases:'arid',sarakhs_oasis:'continental',kath_district:'continental'
  });
  /* No root field or supported revision changes. Unselected additions retain
     scenery with no owner, settlement or residents. The original 21 scenery
     ids survive; only the period-inappropriate steppe label changes here. */
  b.revisions = Object.assign({baseline:{}},b.revisions);
  b.revisions.terrain_v2 = {
    geography:'europe_regional_2',settlementLayout:null,
    provinces:b.provinces.map(function (p) {
      return accepted[p.id] || p;
    }).concat(FBDATA.geographies.europe_regional_2.provinceAdditions.map(function (seed) {
      return accepted[seed.id] || Object.assign({},seed);
    })),
    realms:b.realms.concat(region.realms),
    duchies:Object.assign({},b.duchies,region.duchies),
    kingdoms:Object.assign({},b.kingdoms,region.kingdoms),
    climate:{zone:b.climate.zone,provinces:climate},
    /* Community presence at the existing towns, without identifying an imam,
       building footprint, ownership or a compulsory political allegiance.
       Munt (2022), Medina renovations in 706/707-709/710; UNESCO, Old City
       of Sana'a, Brief synthesis, seventh-century Great Mosque remains. */
    localInstitutions:Object.assign({},b.localInstitutions,{
      medina_congregation_711:{city:'Medina',kind:'congregation',provinceId:'medina',site:'medina_711',
        religion:'sunni',culture:'arabic',profileId:'arabian_local_congregation_711',
        jurisdictionIds:['medina'],vacant:true,freshOnly:true},
      sanaa_congregation_711:{city:'Sanaa',kind:'congregation',provinceId:'sanaa',site:'sanaa_711',
        religion:'sunni',culture:'arabic',profileId:'arabian_local_congregation_711',
        jurisdictionIds:['sanaa'],vacant:true,freshOnly:true}
    })
  };
  b.revision = 'terrain_v2';
  FBDATA.techImpactReviews.features.period_711_terrain_habitation = {mode:'none',
    rationale:'Established households and local authority require no discovery. Existing production, military and travel requirements still apply.'};
})();
